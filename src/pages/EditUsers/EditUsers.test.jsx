/**
 * EditUsers Page Tests
 *
 * Covers:
 * - Renders page heading and create button
 * - Renders search input and status filter
 * - Shows empty message when no customer context
 * - Renders user table when data is available (mocked)
 * - Action button visibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import tenantContextReducer, { setTenant } from '../../store/slices/tenantContextSlice.js'

const {
  mockUseUsers,
  mockUseListTenantsQuery,
  mockUseReplaceCustomerAdminMutation,
} = vi.hoisted(() => ({
  mockUseUsers: vi.fn(),
  mockUseListTenantsQuery: vi.fn(),
  mockUseReplaceCustomerAdminMutation: vi.fn(),
}))

vi.mock('../../hooks/useUsers.js', () => ({
  useUsers: (...args) => mockUseUsers(...args),
}))

vi.mock('../../store/api/tenantApi.js', () => ({
  useListTenantsQuery: (...args) => mockUseListTenantsQuery(...args),
}))

vi.mock('../../store/api/customerApi.js', () => ({
  useReplaceCustomerAdminMutation: (...args) => mockUseReplaceCustomerAdminMutation(...args),
}))

vi.mock('../../components/StepUpAuthForm', () => ({
  StepUpAuthForm: ({ onStepUpComplete }) => (
    <div>
      <p>Mock Step-up Form</p>
      <button type="button" onClick={() => onStepUpComplete?.('mock-step-up-token')}>
        Mock Step-Up Complete
      </button>
    </div>
  ),
}))

import EditUsers from './EditUsers'

// Mock HTMLDialogElement methods (JSDOM does not support <dialog>)
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.open = false
  })
})

/** Customer admin user shape */
const customerAdminUser = {
  id: 'user-1',
  _id: 'user-1',
  email: 'admin@acme.com',
  name: 'Admin User',
  isActive: true,
  memberships: [
    { customerId: 'cust-1', roles: ['CUSTOMER_ADMIN'] },
  ],
  tenantMemberships: [],
  vmfGrants: [],
  identityPlus: { trustStatus: 'TRUSTED' },
}

/** User with no customer membership */
const noCustomerUser = {
  id: 'user-2',
  email: 'nobody@acme.com',
  name: 'No Customer',
  isActive: true,
  memberships: [],
  tenantMemberships: [],
  vmfGrants: [],
}

const canonicalManagedUser = {
  _id: 'user-1',
  email: 'owner@acme.com',
  name: 'Owner User',
  isActive: true,
  isCanonicalAdmin: true,
  memberships: [
    { customerId: 'cust-1', roles: ['CUSTOMER_ADMIN'] },
  ],
  tenantMemberships: [],
  vmfGrants: [],
  identityPlus: { trustStatus: 'TRUSTED', trustedAt: '2026-01-15T14:00:00Z' },
}

const standardManagedUser = {
  _id: 'user-2',
  email: 'member@acme.com',
  name: 'Member User',
  isActive: true,
  isCanonicalAdmin: false,
  memberships: [
    { customerId: 'cust-1', roles: ['USER'] },
  ],
  tenantMemberships: [],
  vmfGrants: [],
  identityPlus: { trustStatus: 'UNTRUSTED', invitedAt: '2026-01-16T09:30:00Z' },
}

const idOnlyManagedUser = {
  id: 'user-6',
  email: 'id-only@acme.com',
  name: 'ID Only User',
  isActive: true,
  isCanonicalAdmin: false,
  memberships: [
    { customerId: 'cust-1', roles: ['USER'] },
  ],
  tenantMemberships: [],
  vmfGrants: [],
  identityPlus: { trustStatus: 'UNTRUSTED', invitedAt: '2026-01-18T08:00:00Z' },
}

const invitationRequiredUser = {
  _id: 'user-4',
  email: 'reset@acme.com',
  name: 'Reset User',
  isActive: true,
  isCanonicalAdmin: false,
  memberships: [
    { customerId: 'cust-1', roles: ['USER'] },
  ],
  tenantMemberships: [],
  vmfGrants: [],
  identityPlus: { trustStatus: 'UNTRUSTED' },
}

const disabledManagedUser = {
  _id: 'user-3',
  email: 'disabled@acme.com',
  name: 'Disabled User',
  isActive: false,
  isCanonicalAdmin: false,
  memberships: [
    { customerId: 'cust-1', roles: ['USER'] },
  ],
  tenantMemberships: [],
  vmfGrants: [],
  identityPlus: { trustStatus: 'REVOKED' },
}

const multiRoleManagedUser = {
  _id: 'user-5',
  email: 'multi@acme.com',
  name: 'Multi Role User',
  isActive: true,
  isCanonicalAdmin: false,
  memberships: [
    { customerId: 'cust-1', roles: ['USER', 'TENANT_ADMIN'] },
  ],
  tenantMemberships: [],
  vmfGrants: [],
  identityPlus: { trustStatus: 'TRUSTED', trustedAt: '2026-01-17T11:15:00Z' },
}

const customRoleManagedUser = {
  _id: 'user-7',
  email: 'analyst@acme.com',
  name: 'Analyst User',
  isActive: true,
  isCanonicalAdmin: false,
  memberships: [
    { customerId: 'cust-1', roles: ['ANALYST'] },
  ],
  tenantMemberships: [],
  vmfGrants: [],
  identityPlus: { trustStatus: 'TRUSTED', trustedAt: '2026-01-19T10:30:00Z' },
}

const inactiveCustomerAdminUser = {
  ...customerAdminUser,
  memberships: [
    {
      customerId: 'cust-1',
      roles: ['CUSTOMER_ADMIN'],
      customerStatus: 'INACTIVE',
    },
  ],
}

/** Create a fresh store */
function createTestStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      tenantContext: tenantContextReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
    preloadedState,
  })
}

function buildUseUsersResult(overrides = {}) {
  return {
    users: [],
    pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    assignableRoleCatalogue: [],
    isLoadingAssignableRoles: false,
    assignableRolesError: null,
    isLoading: false,
    isFetching: false,
    error: null,
    setSearch: vi.fn(),
    statusFilter: '',
    setStatusFilter: vi.fn(),
    page: 1,
    setPage: vi.fn(),
    disableUser: vi.fn(),
    enableUser: vi.fn(),
    deleteUser: vi.fn(),
    resendInvitation: vi.fn(),
    disableUserResult: { isLoading: false },
    enableUserResult: { isLoading: false },
    deleteUserResult: { isLoading: false },
    resendInvitationResult: { isLoading: false },
    ...overrides,
  }
}

/** Render wrapper with all providers */
function renderEditUsers(store) {
  const testStore =
    store ??
    createTestStore({
      auth: { user: customerAdminUser, status: 'authenticated' },
    })
  return render(
    <Provider store={testStore}>
      <ToasterProvider>
        <MemoryRouter initialEntries={['/app/administration/edit-users']}>
          <Routes>
            <Route
              path="/app/administration/edit-users"
              element={<EditUsers />}
            />
          </Routes>
        </MemoryRouter>
      </ToasterProvider>
    </Provider>,
  )
}

async function chooseRowAction(user, rowName, actionLabel) {
  const actionSelect = screen.getByRole('combobox', {
    name: new RegExp(`actions for ${rowName}`, 'i'),
  })

  await user.selectOptions(actionSelect, actionLabel)
}

describe('EditUsers page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUseReplaceCustomerAdminMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        users: [canonicalManagedUser, standardManagedUser, invitationRequiredUser],
        pagination: { page: 1, pageSize: 20, total: 3, totalPages: 1 },
      }),
    )
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [{ _id: 'ten-1', name: 'Alpha Tenant' }],
      },
      isLoading: false,
      error: undefined,
    })
  })

  it('renders the page heading', () => {
    renderEditUsers()
    expect(
      screen.getByRole('heading', { name: /edit users/i }),
    ).toBeInTheDocument()
  })

  it('renders the Create User button', () => {
    renderEditUsers()
    expect(
      screen.getByRole('button', { name: /create user/i }),
    ).toBeInTheDocument()
  })

  it('renders the Bulk Create button', () => {
    renderEditUsers()
    expect(
      screen.getByRole('button', { name: /bulk create/i }),
    ).toBeInTheDocument()
  })

  it('renders the search input', () => {
    renderEditUsers()
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument()
  })

  it('renders the status filter', () => {
    renderEditUsers()
    expect(
      screen.getByRole('combobox', { name: /status/i }),
    ).toBeInTheDocument()
  })

  it('renders the users table region', () => {
    renderEditUsers()
    expect(screen.getByLabelText(/users table/i)).toBeInTheDocument()
  })

  it('shows empty context message when no customer membership', () => {
    const store = createTestStore({
      auth: { user: noCustomerUser, status: 'authenticated' },
    })
    renderEditUsers(store)
    expect(
      screen.getByText(/no customer context available/i),
    ).toBeInTheDocument()
  })

  it('renders an inactive-customer blocked state when the selected customer is inactive', () => {
    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        error: {
          status: 403,
          data: {
            error: {
              code: 'CUSTOMER_INACTIVE',
              requestId: 'req-inactive-users-1',
              details: { reason: 'CUSTOMER_INACTIVE' },
            },
          },
        },
      }),
    )

    const store = createTestStore({
      auth: { user: inactiveCustomerAdminUser, status: 'authenticated' },
      tenantContext: { customerId: 'cust-1', tenantId: null, tenantName: null },
    })

    renderEditUsers(store)

    expect(
      screen.getByText(/user-management actions are unavailable until a super admin reactivates the customer/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/\(Ref: req-inactive-users-1\)/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create user/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/users table/i)).not.toBeInTheDocument()
  })

  it('shows tenant context guidance without pretending the list is tenant-filtered', () => {
    const store = createTestStore({
      auth: { user: customerAdminUser, status: 'authenticated' },
      tenantContext: { customerId: 'cust-1', tenantId: 'ten-1', tenantName: 'Alpha Tenant' },
    })

    renderEditUsers(store)

    expect(
      screen.getByText(/selected tenant context:/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/current user list remains scoped to the active customer/i),
    ).toBeInTheDocument()
  })

  it('shows a wrong-context state when the selected tenant is not valid for the active customer', () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [{ _id: 'ten-1', name: 'Alpha Tenant' }],
      },
      isLoading: false,
      error: undefined,
    })

    const store = createTestStore({
      auth: { user: customerAdminUser, status: 'authenticated' },
      tenantContext: { customerId: 'cust-1', tenantId: 'ten-404', tenantName: 'Ghost Tenant' },
    })

    renderEditUsers(store)

    expect(
      screen.getByText(/selected tenant context "ghost tenant" is no longer available/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /clear tenant scope/i }),
    ).toBeInTheDocument()
  })

  it('renders table with column headers', () => {
    renderEditUsers()
    expect(screen.getByText('User')).toBeInTheDocument()
    expect(screen.getByText('Roles')).toBeInTheDocument()
    // "Status" appears in both filter label and table header
    const statusElements = screen.getAllByText('Status')
    expect(statusElements.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Trust')).toBeInTheDocument()
    expect(screen.getAllByText('Actions').length).toBeGreaterThanOrEqual(1)
  })

  it('shows governance guidance and canonical-admin visibility before mutating actions', () => {
    renderEditUsers()

    expect(
      screen.getAllByLabelText(/customer admin governance guidance/i).length,
    ).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByText(/generic role edits do not transfer ownership/i),
    ).toBeInTheDocument()
    const memberActions = screen.getByRole('combobox', { name: /actions for member user/i })
    const ownerActions = screen.getByRole('combobox', { name: /actions for owner user/i })

    expect(within(memberActions).getByRole('option', { name: /transfer ownership/i })).toBeInTheDocument()
    expect(within(memberActions).getByRole('option', { name: /resend invitation/i })).toBeInTheDocument()
    expect(within(ownerActions).queryByRole('option', { name: /transfer ownership/i })).not.toBeInTheDocument()
    expect(within(ownerActions).queryByRole('option', { name: /resend invitation/i })).not.toBeInTheDocument()
    expect(within(memberActions).queryByRole('option', { name: /reactivate/i })).not.toBeInTheDocument()
  })

  it('shows lifecycle and invitation guidance before the table actions', () => {
    renderEditUsers()

    expect(
      screen.getByLabelText(/user lifecycle and invitation guidance/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/active users with untrusted trust can receive resend invitation/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/disabled users must be reactivated before invitation recovery is available again/i),
    ).toBeInTheDocument()
  })

  it('shows selection guidance before any rows are selected', () => {
    renderEditUsers()

    expect(
      screen.getByText(/use row checkboxes to select users for bulk update or bulk disable/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: /bulk actions for selected users/i }),
    ).not.toBeInTheDocument()
  })

  it('renders compact trust labels and exposes lifecycle detail on demand', async () => {
    const user = userEvent.setup()

    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        users: [canonicalManagedUser, standardManagedUser, invitationRequiredUser, disabledManagedUser],
        pagination: { page: 1, pageSize: 20, total: 4, totalPages: 1 },
      }),
    )

    renderEditUsers()

    expect(screen.getAllByText('Trusted').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Untrusted').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Revoked').length).toBeGreaterThanOrEqual(1)

    const trustHelpButton = screen.getByRole('button', {
      name: /explain trust status for owner user/i,
    })
    const accessReadyText = screen.getByText(/access ready/i)

    expect(accessReadyText).not.toBeVisible()

    await user.hover(trustHelpButton)

    expect(accessReadyText).toBeVisible()
    expect(
      screen.getByText(/user has completed sign-in and currently has active access/i),
    ).toBeVisible()
  })

  it('renders compact role summaries for both single-role and multi-role rows', async () => {
    const user = userEvent.setup()

    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        users: [canonicalManagedUser, multiRoleManagedUser],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
      }),
    )

    renderEditUsers()

    expect(
      screen.getByRole('button', { name: /show roles for owner user/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /show roles for multi role user/i }),
    ).toBeInTheDocument()

    await user.hover(screen.getByRole('button', { name: /show roles for owner user/i }))

    expect(screen.getByText('CUSTOMER_ADMIN')).toBeVisible()

    await user.unhover(screen.getByRole('button', { name: /show roles for owner user/i }))
    await user.hover(screen.getByRole('button', { name: /show roles for multi role user/i }))

    expect(screen.getByText('TENANT_ADMIN')).toBeVisible()
    expect(screen.getByText('USER')).toBeVisible()
  })

  it('opens Create User wizard when button is clicked', async () => {
    const user = userEvent.setup()
    renderEditUsers()

    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /create user/i }),
      ).toBeInTheDocument()
    })
  })

  it('passes discovered custom customer roles into the create-user role step', async () => {
    const user = userEvent.setup()
    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        users: [canonicalManagedUser, customRoleManagedUser],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
      }),
    )

    renderEditUsers()

    await user.click(screen.getByRole('button', { name: /create user/i }))
    await user.type(screen.getByLabelText(/full name/i), 'New Analyst')
    await user.type(screen.getByLabelText(/email address/i), 'new.analyst@example.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /analyst/i })).toBeInTheDocument()
      expect(screen.queryByRole('checkbox', { name: /customer admin/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('checkbox', { name: /super admin/i })).not.toBeInTheDocument()
    })
  })

  it('prefers the BE assignable-role catalogue when a new custom role has no current user assignment', async () => {
    const user = userEvent.setup()
    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        users: [canonicalManagedUser],
        assignableRoleCatalogue: [
          { key: 'USER', name: 'Standard User', isActive: true, isSystem: true },
          { key: 'TENANT_ADMIN', name: 'Tenant Administrator', isActive: true, isSystem: true },
          { key: 'VMF_CREATOR', name: 'VMF Creator', isActive: true, isSystem: false },
        ],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      }),
    )

    renderEditUsers()

    await user.click(screen.getByRole('button', { name: /create user/i }))
    await user.type(screen.getByLabelText(/full name/i), 'Creator User')
    await user.type(screen.getByLabelText(/email address/i), 'creator.user@example.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /vmf creator/i })).toBeInTheDocument()
    })
  })

  it('passes catalogue-only custom roles into the edit-user workspace while keeping reserved roles hidden', async () => {
    const user = userEvent.setup()
    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        users: [canonicalManagedUser, standardManagedUser],
        assignableRoleCatalogue: [
          { key: 'USER', name: 'Standard User', isActive: true, isSystem: true },
          { key: 'TENANT_ADMIN', name: 'Tenant Administrator', isActive: true, isSystem: true },
          { key: 'VMF_CREATOR', name: 'VMF Creator', isActive: true, isSystem: false },
          { key: 'CUSTOMER_ADMIN', name: 'Customer Administrator', isActive: true, isSystem: true },
          { key: 'SUPER_ADMIN', name: 'Super Administrator', isActive: true, isSystem: true },
        ],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
      }),
    )

    renderEditUsers()

    await user.click(screen.getByRole('button', { name: /^member user$/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^edit user$/i })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /vmf creator/i })).toBeInTheDocument()
      expect(screen.queryByRole('checkbox', { name: /customer admin/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('checkbox', { name: /super admin/i })).not.toBeInTheDocument()
    })
  })

  it('opens the bulk-create dialog from the action bar', async () => {
    const user = userEvent.setup()
    renderEditUsers()

    await user.click(screen.getByRole('button', { name: /bulk create/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /^bulk create users$/i }),
      ).toBeInTheDocument()
    })

    expect(screen.queryByLabelText(/operation/i)).not.toBeInTheDocument()
  })

  it('shows contextual bulk actions when rows are selected', async () => {
    const user = userEvent.setup()
    renderEditUsers()

    await user.click(screen.getByRole('checkbox', { name: /select row user-2/i }))

    const selectionBar = screen.getByRole('region', { name: /bulk actions for selected users/i })

    expect(selectionBar).toBeInTheDocument()
    expect(selectionBar).toHaveClass('edit-users__selection-bar--floating')
    expect(screen.getByText(/bulk update and bulk disable will apply only to the selected users on this page/i)).toBeInTheDocument()
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /bulk update selected/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /bulk disable selected/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/clear selection/i)).toBeInTheDocument()
  })

  it('opens the bulk-update dialog from the selected-users action bar', async () => {
    const user = userEvent.setup()
    renderEditUsers()

    await user.click(screen.getByRole('checkbox', { name: /select row user-2/i }))
    await user.click(screen.getByRole('button', { name: /bulk update selected/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /^bulk update users$/i }),
      ).toBeInTheDocument()
    })

    expect(screen.queryByLabelText(/operation/i)).not.toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === 'Selected users: 1'),
    ).toBeInTheDocument()
  })

  it('opens the inline edit-user workspace from the user name workspace entry', async () => {
    const user = userEvent.setup()
    renderEditUsers()

    await user.click(screen.getByRole('button', { name: /^member user$/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /^edit user$/i }),
      ).toBeInTheDocument()
    })

    expect(
      screen.getByLabelText(/edit user workspace for member user/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the ownership-transfer dialog from the governed row action', async () => {
    const user = userEvent.setup()
    renderEditUsers()

    await chooseRowAction(user, 'member user', 'Transfer Ownership')

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /transfer customer admin ownership/i }),
      ).toBeInTheDocument()
    })

    expect(screen.getAllByText(/owner user/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/member user/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/mock step-up form/i)).toBeInTheDocument()
  })

  it('resets transient UI state when tenant context changes at runtime', async () => {
    const user = userEvent.setup()
    const setSearch = vi.fn()
    const setStatusFilter = vi.fn()
    const setPage = vi.fn()

    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        setSearch,
        setStatusFilter,
        setPage,
      }),
    )

    const store = createTestStore({
      auth: { user: customerAdminUser, status: 'authenticated' },
      tenantContext: { customerId: 'cust-1', tenantId: null, tenantName: null },
    })

    renderEditUsers(store)

    await user.type(screen.getByLabelText(/search/i), 'alice')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /create user/i }),
      ).toBeInTheDocument()
    })

    act(() => {
      store.dispatch(setTenant({ tenantId: 'ten-1', tenantName: 'Alpha Tenant' }))
    })

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /create user/i }),
      ).not.toBeInTheDocument()
    })

    expect(screen.getByLabelText(/search/i)).toHaveValue('')
    expect(setSearch).toHaveBeenCalledWith('')
    expect(setStatusFilter).toHaveBeenCalledWith('')
    expect(setPage).toHaveBeenCalledWith(1)
  })

  it('enables the disabled-user lifecycle actions coherently', () => {
    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        users: [canonicalManagedUser, disabledManagedUser],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
      }),
    )

    renderEditUsers()

    const disabledActions = screen.getByRole('combobox', { name: /actions for disabled user/i })

    expect(within(disabledActions).queryByRole('option', { name: /^disable$/i })).not.toBeInTheDocument()
    expect(within(disabledActions).getByRole('option', { name: /reactivate/i })).toBeInTheDocument()
    expect(within(disabledActions).getByRole('option', { name: /^delete$/i })).toBeInTheDocument()
    expect(within(disabledActions).queryByRole('option', { name: /resend invitation/i })).not.toBeInTheDocument()
  })

  it('disables an active user through the confirm dialog', async () => {
    const user = userEvent.setup()
    const disableUser = vi.fn().mockResolvedValue({})

    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        users: [canonicalManagedUser, standardManagedUser],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
        disableUser,
      }),
    )

    renderEditUsers()

    await chooseRowAction(user, 'member user', 'Disable')

    expect(
      screen.getByRole('heading', { name: /disable user/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^disable$/i }))

    await waitFor(() => {
      expect(disableUser).toHaveBeenCalledWith('user-2')
      expect(screen.getByText(/member user has been disabled/i)).toBeInTheDocument()
    })
  })

  it('deletes a disabled user through the confirm dialog', async () => {
    const user = userEvent.setup()
    const deleteUser = vi.fn().mockResolvedValue({})

    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        users: [canonicalManagedUser, disabledManagedUser],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
        deleteUser,
      }),
    )

    renderEditUsers()

    await chooseRowAction(user, 'disabled user', 'Delete')

    expect(
      screen.getByRole('heading', { name: /delete user/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(deleteUser).toHaveBeenCalledWith('user-3')
      expect(screen.getByText(/disabled user has been permanently deleted/i)).toBeInTheDocument()
    })
  })

  it('resends invitation for an active untrusted user', async () => {
    const user = userEvent.setup()
    const resendInvitation = vi.fn().mockResolvedValue({})

    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        users: [canonicalManagedUser, idOnlyManagedUser],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
        resendInvitation,
      }),
    )

    renderEditUsers()

    await chooseRowAction(user, 'id only user', 'Resend Invitation')

    await waitFor(() => {
      expect(resendInvitation).toHaveBeenCalledWith('user-6')
      expect(screen.getByText(/invitation resent to id-only@acme.com/i)).toBeInTheDocument()
    })
  })

  it('shows dev auth-link dialog when resend returns authLink', async () => {
    const user = userEvent.setup()
    const authLink = 'http://localhost:5173/invitation-auth?invitationId=inv-resend-1'
    const resendInvitation = vi.fn().mockResolvedValue({
      data: {
        message: 'Invitation resent successfully.',
        authLink,
      },
    })

    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        users: [canonicalManagedUser, standardManagedUser],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
        resendInvitation,
      }),
    )

    renderEditUsers()

    await chooseRowAction(user, 'member user', 'Resend Invitation')

    const authLinkHeading = await screen.findByRole('heading', { name: /auth link \(dev mode\)/i })
    const authLinkDialog = authLinkHeading.closest('dialog')
    expect(authLinkDialog).not.toBeNull()
    expect(within(authLinkDialog).getByText(authLink)).toBeInTheDocument()
  })

  it('reactivates a disabled user and surfaces untrusted trust guidance', async () => {
    const user = userEvent.setup()
    const enableUser = vi.fn().mockResolvedValue({
      data: {
        _id: 'user-3',
        name: 'Disabled User',
        isActive: true,
        trustStatus: 'UNTRUSTED',
      },
    })

    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        users: [canonicalManagedUser, disabledManagedUser],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
        enableUser,
      }),
    )

    renderEditUsers()

    await chooseRowAction(user, 'disabled user', 'Reactivate')

    expect(
      screen.getByRole('heading', { name: /reactivate user/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/if trust returns as untrusted, resend invitation becomes available again/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^reactivate$/i }))

    await waitFor(() => {
      expect(enableUser).toHaveBeenCalledWith('user-3')
      expect(screen.getByText(/trust is untrusted/i)).toBeInTheDocument()
      expect(screen.getByText(/resend invitation is available/i)).toBeInTheDocument()
    })
  })
})
