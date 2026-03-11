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
import { render, screen, waitFor, act } from '@testing-library/react'
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
} = vi.hoisted(() => ({
  mockUseUsers: vi.fn(),
  mockUseListTenantsQuery: vi.fn(),
}))

vi.mock('../../hooks/useUsers.js', () => ({
  useUsers: (...args) => mockUseUsers(...args),
}))

vi.mock('../../store/api/tenantApi.js', () => ({
  useListTenantsQuery: (...args) => mockUseListTenantsQuery(...args),
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

describe('EditUsers page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
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

  it('renders the Bulk Operations button', () => {
    renderEditUsers()
    expect(
      screen.getByRole('button', { name: /bulk operations/i }),
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
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Roles')).toBeInTheDocument()
    // "Status" appears in both filter label and table header
    const statusElements = screen.getAllByText('Status')
    expect(statusElements.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Trust')).toBeInTheDocument()
  })

  it('shows governance guidance and canonical-admin visibility before mutating actions', () => {
    renderEditUsers()

    expect(
      screen.getAllByLabelText(/customer admin governance guidance/i).length,
    ).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByText(/generic role edits do not transfer ownership/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Canonical Admin')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /explain canonical admin/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Canonical')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /transfer ownership member user/i }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /transfer ownership owner user/i }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /resend invitation member user/i }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /resend invitation owner user/i }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /reactivate member user/i }),
    ).toBeDisabled()
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

  it('renders row-level lifecycle summaries for trusted, invited, invitation-required, and disabled users', () => {
    mockUseUsers.mockReturnValue(
      buildUseUsersResult({
        users: [canonicalManagedUser, standardManagedUser, invitationRequiredUser, disabledManagedUser],
        pagination: { page: 1, pageSize: 20, total: 4, totalPages: 1 },
      }),
    )

    renderEditUsers()

    expect(screen.getByText(/access ready/i)).toBeInTheDocument()
    expect(screen.getByText(/invitation pending/i)).toBeInTheDocument()
    expect(screen.getByText(/invitation required/i)).toBeInTheDocument()
    expect(screen.getByText(/reactivate first to make invitation recovery available again/i)).toBeInTheDocument()
    expect(screen.getByText(/resend invitation is available now/i)).toBeInTheDocument()
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

  it('opens Bulk Operations dialog when button is clicked', async () => {
    const user = userEvent.setup()
    renderEditUsers()

    await user.click(screen.getByRole('button', { name: /bulk operations/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /bulk operations/i }),
      ).toBeInTheDocument()
    })
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

    expect(
      screen.getByRole('button', { name: /disable disabled user/i }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /reactivate disabled user/i }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /delete disabled user/i }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /resend invitation disabled user/i }),
    ).toBeDisabled()
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

    await user.click(screen.getByRole('button', { name: /disable member user/i }))

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

    await user.click(screen.getByRole('button', { name: /delete disabled user/i }))

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
        users: [canonicalManagedUser, standardManagedUser],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
        resendInvitation,
      }),
    )

    renderEditUsers()

    await user.click(screen.getByRole('button', { name: /resend invitation member user/i }))

    await waitFor(() => {
      expect(resendInvitation).toHaveBeenCalledWith('user-2')
      expect(screen.getByText(/invitation resent to member@acme.com/i)).toBeInTheDocument()
    })
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

    await user.click(screen.getByRole('button', { name: /reactivate disabled user/i }))

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
