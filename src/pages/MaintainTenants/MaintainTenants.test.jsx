/**
 * MaintainTenants Page Tests
 *
 * Covers the standard-aligned tenant catalogue surface:
 * - action bar and helper copy inside the card
 * - compact row-action menus
 * - lifecycle dialogs triggered from row actions
 * - boundary and capacity states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import tenantContextReducer, { setCustomer } from '../../store/slices/tenantContextSlice.js'
import MaintainTenants from './MaintainTenants'

const {
  mockUseListTenantsQuery,
  mockUseCreateTenantMutation,
  mockUseUpdateTenantMutation,
  mockUseEnableTenantMutation,
  mockUseDisableTenantMutation,
  mockUseListUsersQuery,
  mockUseLazyListUsersQuery,
} = vi.hoisted(() => ({
  mockUseListTenantsQuery: vi.fn(),
  mockUseCreateTenantMutation: vi.fn(),
  mockUseUpdateTenantMutation: vi.fn(),
  mockUseEnableTenantMutation: vi.fn(),
  mockUseDisableTenantMutation: vi.fn(),
  mockUseListUsersQuery: vi.fn(),
  mockUseLazyListUsersQuery: vi.fn(),
}))

vi.mock('../../store/api/tenantApi.js', () => ({
  useListTenantsQuery: (...args) => mockUseListTenantsQuery(...args),
  useCreateTenantMutation: (...args) => mockUseCreateTenantMutation(...args),
  useUpdateTenantMutation: (...args) => mockUseUpdateTenantMutation(...args),
  useEnableTenantMutation: (...args) => mockUseEnableTenantMutation(...args),
  useDisableTenantMutation: (...args) => mockUseDisableTenantMutation(...args),
}))

vi.mock('../../store/api/userApi.js', () => ({
  useListUsersQuery: (...args) => mockUseListUsersQuery(...args),
  useLazyListUsersQuery: (...args) => mockUseLazyListUsersQuery(...args),
}))

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModalMock() {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function closeMock() {
    this.open = false
  })
})

const customerAdminUser = {
  id: 'user-1',
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

const enabledTenant = {
  _id: 'tenant-enabled',
  name: 'Enabled Tenant',
  website: 'https://enabled.example.com',
  status: 'ENABLED',
  isDefault: false,
  tenantAdmin: { id: 'user-10', name: 'Jordan Manager' },
}

const enabledTenantWithIdOnly = {
  id: 'tenant-enabled-id-only',
  name: 'Enabled Tenant Id Only',
  website: 'https://enabled-id-only.example.com',
  status: 'ENABLED',
  isDefault: false,
  tenantAdmin: { id: 'user-11', name: 'Morgan Lead' },
}

const defaultTenant = {
  _id: 'tenant-default',
  name: 'Default Tenant',
  website: 'https://default.example.com',
  status: 'ENABLED',
  isDefault: true,
  tenantAdmin: { id: 'user-12', name: 'Default Admin' },
}

const disabledTenant = {
  _id: 'tenant-disabled',
  name: 'Disabled Tenant',
  website: 'https://disabled.example.com',
  status: 'DISABLED',
  isDefault: false,
  tenantAdmin: null,
}

const archivedTenant = {
  _id: 'tenant-archived',
  name: 'Archived Tenant',
  website: 'https://archived.example.com',
  status: 'ARCHIVED',
  isDefault: false,
  tenantAdmin: { id: 'user-13', name: 'Archived Admin' },
}

const noCustomerUser = {
  id: 'user-2',
  email: 'nobody@acme.com',
  name: 'No Customer',
  isActive: true,
  memberships: [],
  tenantMemberships: [],
  vmfGrants: [],
}

const tenantAdminUser = {
  id: 'user-3',
  email: 'tenant.admin@acme.com',
  name: 'Tenant Admin',
  isActive: true,
  memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
  tenantMemberships: [
    { customerId: 'cust-1', tenantId: 'tenant-enabled', roles: ['TENANT_ADMIN'] },
  ],
  vmfGrants: [],
}

const customerScopedTenantAdminUser = {
  ...tenantAdminUser,
  memberships: [{ customerId: 'cust-1', roles: ['TENANT_ADMIN', 'USER'] }],
  tenantMemberships: [
    { customerId: 'cust-1', tenantId: 'tenant-enabled', roles: ['USER'] },
  ],
}

const multiCustomerAdminUser = {
  ...customerAdminUser,
  memberships: [
    { customerId: 'cust-1', roles: ['CUSTOMER_ADMIN'] },
    { customerId: 'cust-2', roles: ['CUSTOMER_ADMIN'] },
  ],
}

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

function renderMaintainTenants(store) {
  const testStore =
    store ??
    createTestStore({
      auth: { user: customerAdminUser, status: 'authenticated' },
    })

  return render(
    <Provider store={testStore}>
      <ToasterProvider>
        <MemoryRouter initialEntries={['/app/administration/maintain-tenants']}>
          <Routes>
            <Route
              path="/app/administration/maintain-tenants"
              element={<MaintainTenants />}
            />
          </Routes>
        </MemoryRouter>
      </ToasterProvider>
    </Provider>,
  )
}

function selectTenantAction(rowName, actionLabel) {
  fireEvent.change(
    screen.getByRole('combobox', { name: new RegExp(`actions for ${rowName}`, 'i') }),
    { target: { value: actionLabel } },
  )
}

describe('MaintainTenants page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })
    mockUseCreateTenantMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    mockUseUpdateTenantMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    mockUseEnableTenantMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    mockUseDisableTenantMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    mockUseListUsersQuery.mockReturnValue({
      data: { data: { users: [] } },
      isFetching: false,
      error: null,
    })
    mockUseLazyListUsersQuery.mockReturnValue([
      vi.fn(),
      {
        data: { data: { users: [] } },
        isFetching: false,
      },
    ])
  })

  it('renders the page heading, subtitle, and create action bar', () => {
    renderMaintainTenants()

    expect(screen.getByRole('heading', { name: /maintain tenants/i })).toBeInTheDocument()
    expect(
      screen.getByText(/manage tenant lifecycle, capacity, and linked tenant-admin assignments/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create tenant/i })).toHaveClass('btn--sm')
  })

  it('renders the search input, status filter, and tenants table region', () => {
    renderMaintainTenants()

    expect(screen.getByLabelText(/search/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tenants table/i)).toBeInTheDocument()
  })

  it('shows empty context message when no customer membership', () => {
    const store = createTestStore({
      auth: { user: noCustomerUser, status: 'authenticated' },
    })

    renderMaintainTenants(store)

    expect(screen.getByText(/no customer context available/i)).toBeInTheDocument()
  })

  it('renders an inactive-customer blocked state when the selected customer is inactive', () => {
    const store = createTestStore({
      auth: { user: inactiveCustomerAdminUser, status: 'authenticated' },
      tenantContext: { customerId: 'cust-1', tenantId: null, tenantName: null },
    })

    renderMaintainTenants(store)

    expect(
      screen.getByText(/tenant-management actions are unavailable until a super admin reactivates the customer/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create tenant/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/tenants table/i)).not.toBeInTheDocument()
  })

  it('renders a blocked state for single-tenant customer context', () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [],
        meta: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
          tenantVisibility: {
            mode: 'NONE',
            allowed: false,
            topology: 'SINGLE_TENANT',
            isServiceProvider: false,
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    const store = createTestStore({
      auth: { user: customerAdminUser, status: 'authenticated' },
      tenantContext: { customerId: 'cust-1', tenantId: null, tenantName: null },
    })

    renderMaintainTenants(store)

    expect(
      screen.getByText(/tenant management is only available for multi-tenant customers/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create tenant/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/tenants table/i)).not.toBeInTheDocument()
  })

  it('shows tenant-capacity guidance and disables create when the customer is at capacity', () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [],
        meta: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
          tenantCapacity: {
            maxTenants: 3,
            currentCount: 3,
            remainingCount: 0,
            isAtCapacity: true,
            countMode: 'NON_ARCHIVED',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    renderMaintainTenants()

    expect(
      screen.getAllByText(/this customer is already using 3 of 3 non-archived tenant slots/i).length,
    ).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /create tenant/i })).toBeDisabled()
  })

  it('shows explicit tenant usage guidance when capacity metadata is available and capacity remains', () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [],
        meta: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
          tenantCapacity: {
            maxTenants: 4,
            currentCount: 2,
            remainingCount: 2,
            isAtCapacity: false,
            countMode: 'NON_ARCHIVED',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    renderMaintainTenants()

    expect(
      screen.getByText(/2 of 4 non-archived tenant slots are in use\. 2 slots remaining\./i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create tenant/i })).toBeEnabled()
  })

  it('clears the visible tenant search input when Redux customer context changes', async () => {
    const user = userEvent.setup()
    const store = createTestStore({
      auth: { user: multiCustomerAdminUser, status: 'authenticated' },
      tenantContext: { customerId: 'cust-1', tenantId: null, tenantName: null },
    })

    renderMaintainTenants(store)

    const searchInput = screen.getByLabelText(/search/i)
    await user.type(searchInput, 'Alpha')

    expect(searchInput).toHaveValue('Alpha')

    await act(async () => {
      store.dispatch(setCustomer({ customerId: 'cust-2' }))
    })

    await waitFor(() => {
      expect(screen.getByLabelText(/search/i)).toHaveValue('')
    })
  })

  it('shows final-slot tenant guidance when only one tenant slot remains', () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [],
        meta: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
          tenantCapacity: {
            maxTenants: 3,
            currentCount: 2,
            remainingCount: 1,
            isAtCapacity: false,
            countMode: 'NON_ARCHIVED',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    renderMaintainTenants()

    const capacityGuidance = screen.getByRole('alert', { name: /tenant capacity guidance/i })

    expect(within(capacityGuidance).getByText(/final tenant slot/i)).toBeInTheDocument()
    expect(
      within(capacityGuidance).getByText(
        /this customer has 1 non-archived tenant slot remaining \(2 of 3 in use\)\./i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create tenant/i })).toBeEnabled()
  })

  it('renders lifecycle helper copy and compact row-action menus with allowed actions only', () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [enabledTenant, defaultTenant, disabledTenant, archivedTenant],
        meta: { page: 1, pageSize: 20, total: 4, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    renderMaintainTenants()

    expect(
      screen.getByText(/use the actions menu to edit tenant details or change lifecycle state/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /^default$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /tenant admin/i })).toBeInTheDocument()
    expect(screen.getByText('Jordan Manager')).toBeInTheDocument()
    expect(screen.getByText('Default Admin')).toBeInTheDocument()
    expect(screen.getByText('Archived Admin')).toBeInTheDocument()
    expect(screen.getByText('Not assigned')).toBeInTheDocument()

    const enabledActions = screen.getByRole('combobox', { name: /actions for enabled tenant/i })
    expect(within(enabledActions).getByRole('option', { name: /edit/i })).toBeInTheDocument()
    expect(within(enabledActions).getByRole('option', { name: /linked users/i })).toBeInTheDocument()
    expect(within(enabledActions).getByRole('option', { name: /assign admin/i })).toBeInTheDocument()
    expect(within(enabledActions).getByRole('option', { name: /disable/i })).toBeInTheDocument()
    expect(within(enabledActions).queryByRole('option', { name: /enable/i })).not.toBeInTheDocument()

    const defaultActions = screen.getByRole('combobox', { name: /actions for default tenant/i })
    expect(within(defaultActions).getByRole('option', { name: /edit/i })).toBeInTheDocument()
    expect(within(defaultActions).getByRole('option', { name: /linked users/i })).toBeInTheDocument()
    expect(within(defaultActions).getByRole('option', { name: /assign admin/i })).toBeInTheDocument()
    expect(within(defaultActions).queryByRole('option', { name: /disable/i })).not.toBeInTheDocument()

    const disabledActions = screen.getByRole('combobox', { name: /actions for disabled tenant/i })
    expect(within(disabledActions).getByRole('option', { name: /edit/i })).toBeInTheDocument()
    expect(within(disabledActions).getByRole('option', { name: /linked users/i })).toBeInTheDocument()
    expect(within(disabledActions).getByRole('option', { name: /assign admin/i })).toBeInTheDocument()
    expect(within(disabledActions).getByRole('option', { name: /enable/i })).toBeInTheDocument()
    expect(within(disabledActions).queryByRole('option', { name: /disable/i })).not.toBeInTheDocument()

    const archivedActions = screen.getByRole('combobox', { name: /actions for archived tenant/i })
    expect(within(archivedActions).queryByRole('option', { name: /edit/i })).not.toBeInTheDocument()
    expect(within(archivedActions).getByRole('option', { name: /linked users/i })).toBeInTheDocument()
    expect(within(archivedActions).queryByRole('option', { name: /assign admin/i })).not.toBeInTheDocument()
    expect(within(archivedActions).queryByRole('option', { name: /enable/i })).not.toBeInTheDocument()
    expect(within(archivedActions).queryByRole('option', { name: /disable/i })).not.toBeInTheDocument()
  })

  it('renders compact status labels and exposes lifecycle detail on demand', async () => {
    const user = userEvent.setup()

    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [enabledTenant, defaultTenant, disabledTenant, archivedTenant],
        meta: { page: 1, pageSize: 20, total: 4, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    renderMaintainTenants()

    expect(screen.getAllByText('Enabled').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Disabled').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Archived').length).toBeGreaterThanOrEqual(1)

    const enabledStatusHelp = screen.getByRole('button', { name: /explain status for enabled tenant/i })
    const enabledDetail = screen.getByText(/users assigned here retain access/i)

    expect(enabledDetail).not.toBeVisible()

    await user.hover(enabledStatusHelp)

    expect(enabledDetail).toBeVisible()

    await user.unhover(enabledStatusHelp)
    await user.hover(screen.getByRole('button', { name: /explain status for archived tenant/i }))

    expect(screen.getByText(/archived tenants are read-only in this workspace/i)).toBeVisible()
  })

  it('renders tenant-admin scoped table with only tenant-admin-owned rows and allowed non-admin actions', () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [
          enabledTenant,
          {
            _id: 'tenant-other',
            name: 'Other Tenant',
            website: 'https://other.example.com',
            status: 'ENABLED',
            isDefault: false,
            tenantAdmin: { id: 'user-99', name: 'Other Admin' },
          },
        ],
        meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    const store = createTestStore({
      auth: { user: tenantAdminUser, status: 'authenticated' },
      tenantContext: { customerId: 'cust-1', tenantId: null, tenantName: null },
    })

    renderMaintainTenants(store)

    expect(
      screen.getByText(/showing only tenants within your tenant-admin scope/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create tenant/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /tenant admin/i })).not.toBeInTheDocument()
    expect(screen.getByText('Enabled Tenant')).toBeInTheDocument()
    expect(screen.queryByText('Other Tenant')).not.toBeInTheDocument()

    const actions = screen.getByRole('combobox', { name: /actions for enabled tenant/i })
    expect(within(actions).getByRole('option', { name: /edit/i })).toBeInTheDocument()
    expect(within(actions).getByRole('option', { name: /linked users/i })).toBeInTheDocument()
    expect(within(actions).queryByRole('option', { name: /assign admin/i })).not.toBeInTheDocument()
    expect(within(actions).queryByRole('option', { name: /enable/i })).not.toBeInTheDocument()
    expect(within(actions).getByRole('option', { name: /disable/i })).toBeInTheDocument()
  })

  it('allows customer-scoped tenant-admin users into maintain-tenants and scopes rows by associated tenant memberships', () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [
          {
            _id: 'tenant-enabled',
            name: 'Associated Tenant',
            website: 'https://associated.example.com',
            status: 'ENABLED',
            isDefault: false,
            tenantAdmin: { id: 'user-99', name: 'Other Admin' },
          },
          {
            _id: 'tenant-secondary',
            name: 'Second Associated Tenant',
            website: 'https://second.example.com',
            status: 'DISABLED',
            isDefault: false,
            tenantAdmin: { id: 'user-88', name: 'Another Admin' },
          },
          {
            _id: 'tenant-other',
            name: 'Unscoped Tenant',
            website: 'https://other.example.com',
            status: 'ENABLED',
            isDefault: false,
            tenantAdmin: { id: 'user-99', name: 'Other Admin' },
          },
        ],
        meta: { page: 1, pageSize: 20, total: 3, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    const store = createTestStore({
      auth: {
        user: {
          ...customerScopedTenantAdminUser,
          tenantMemberships: [
            { customerId: 'cust-1', tenantId: 'tenant-enabled', roles: ['USER'] },
            { customerId: 'cust-1', tenantId: 'tenant-secondary', roles: ['USER'] },
          ],
        },
        status: 'authenticated',
      },
      tenantContext: { customerId: 'cust-1', tenantId: null, tenantName: null },
    })

    renderMaintainTenants(store)

    expect(
      screen.getByText(/showing only tenants within your tenant-admin scope/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create tenant/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /tenant admin/i })).not.toBeInTheDocument()
    expect(screen.getByText('Associated Tenant')).toBeInTheDocument()
    expect(screen.getByText('Second Associated Tenant')).toBeInTheDocument()
    expect(screen.queryByText('Unscoped Tenant')).not.toBeInTheDocument()

    const actions = screen.getByRole('combobox', { name: /actions for associated tenant/i })
    expect(within(actions).getByRole('option', { name: /edit/i })).toBeInTheDocument()
    expect(within(actions).getByRole('option', { name: /linked users/i })).toBeInTheDocument()
    expect(within(actions).queryByRole('option', { name: /assign admin/i })).not.toBeInTheDocument()
    expect(within(actions).getByRole('option', { name: /disable/i })).toBeInTheDocument()
  })

  it('opens the edit drawer from the tenant name button', async () => {
    const user = userEvent.setup()
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [enabledTenant],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    renderMaintainTenants()

    await user.click(screen.getByRole('button', { name: /^enabled tenant$/i }))

    expect(await screen.findByRole('heading', { name: /edit tenant/i })).toBeInTheDocument()
  })

  it('opens the dedicated assign-admin dialog from the row actions menu', async () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [enabledTenant],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    renderMaintainTenants()

    selectTenantAction('Enabled Tenant', 'Assign Admin')

    const dialogHeading = await screen.findByRole('heading', { name: /assign tenant admin/i })
    const dialog = dialogHeading.closest('dialog')

    expect(dialog).not.toBeNull()
    expect(within(dialog).getByText(/replace the current tenant admin for enabled tenant/i)).toBeInTheDocument()
    expect(within(dialog).getByText('Jordan Manager')).toBeInTheDocument()
  })

  it('uses first/previous/next/last pagination controls inside the card', () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [enabledTenant],
        meta: { page: 2, pageSize: 20, total: 41, totalPages: 3 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    renderMaintainTenants()

    expect(screen.getByRole('button', { name: /^first$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^previous$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^next$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^last$/i })).toBeInTheDocument()
    expect(screen.getByText(/page 2 of 3 \(41 tenants\)/i)).toBeInTheDocument()
  })

  it('uses immediate-impact lifecycle copy in disable confirmations and success toasts', async () => {
    const user = userEvent.setup()
    const disableTenantMutationMock = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    mockUseDisableTenantMutation.mockReturnValue([disableTenantMutationMock, { isLoading: false }])
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [enabledTenant],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    renderMaintainTenants()

    selectTenantAction('Enabled Tenant', 'Disable')

    const dialogHeading = screen.getByRole('heading', { name: /disable tenant/i })
    const dialog = dialogHeading.closest('dialog')
    expect(dialog).not.toBeNull()
    expect(
      within(dialog).getByText(/users assigned to this tenant will lose access immediately/i),
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /^disable$/i }))

    await waitFor(() => {
      expect(disableTenantMutationMock).toHaveBeenCalledWith({
        customerId: 'cust-1',
        tenantId: 'tenant-enabled',
      })
    })
    expect(
      await screen.findByText(/enabled tenant is disabled\. users assigned to this tenant lost access immediately\./i),
    ).toBeInTheDocument()
  })

  it('disables tenants when the row exposes id without _id', async () => {
    const user = userEvent.setup()
    const disableTenantMutationMock = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    mockUseDisableTenantMutation.mockReturnValue([disableTenantMutationMock, { isLoading: false }])
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [enabledTenantWithIdOnly],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    renderMaintainTenants()

    selectTenantAction('Enabled Tenant Id Only', 'Disable')

    const dialogHeading = screen.getByRole('heading', { name: /disable tenant/i })
    const dialog = dialogHeading.closest('dialog')
    expect(dialog).not.toBeNull()

    await user.click(within(dialog).getByRole('button', { name: /^disable$/i }))

    await waitFor(() => {
      expect(disableTenantMutationMock).toHaveBeenCalledWith({
        customerId: 'cust-1',
        tenantId: 'tenant-enabled-id-only',
      })
    })
    expect(
      await screen.findByText(/enabled tenant id only is disabled\. users assigned to this tenant lost access immediately\./i),
    ).toBeInTheDocument()
  })

  it('uses immediate-impact lifecycle copy in enable confirmations and success toasts', async () => {
    const user = userEvent.setup()
    const enableTenantMutationMock = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    mockUseEnableTenantMutation.mockReturnValue([enableTenantMutationMock, { isLoading: false }])
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [disabledTenant],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    renderMaintainTenants()

    selectTenantAction('Disabled Tenant', 'Enable')

    const dialogHeading = screen.getByRole('heading', { name: /enable tenant/i })
    const dialog = dialogHeading.closest('dialog')
    expect(dialog).not.toBeNull()
    expect(
      within(dialog).getByText(/users assigned to this tenant will regain access immediately/i),
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /^enable$/i }))

    await waitFor(() => {
      expect(enableTenantMutationMock).toHaveBeenCalledWith({
        customerId: 'cust-1',
        tenantId: 'tenant-disabled',
      })
    })
    expect(
      await screen.findByText(/disabled tenant is enabled\. users assigned to this tenant can access it immediately\./i),
    ).toBeInTheDocument()
  })

  it('renders table with column headers', () => {
    renderMaintainTenants()

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Website')).toBeInTheDocument()
    const statusElements = screen.getAllByText('Status')
    expect(statusElements.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Tenant Admin')).toBeInTheDocument()
    expect(screen.queryByText('Default')).not.toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  it('opens Create Tenant wizard when button is clicked', async () => {
    const user = userEvent.setup()
    renderMaintainTenants()

    await user.click(screen.getByRole('button', { name: /create tenant/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create tenant/i })).toBeInTheDocument()
    })
  })

  it('shows error toast when enable fails', async () => {
    const user = userEvent.setup()
    const enableTenantMutationMock = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 500,
        data: { error: { message: 'Internal server error during enable' } },
      }),
    })
    mockUseEnableTenantMutation.mockReturnValue([enableTenantMutationMock, { isLoading: false }])
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [disabledTenant],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    renderMaintainTenants()

    selectTenantAction('Disabled Tenant', 'Enable')

    const dialogHeading = screen.getByRole('heading', { name: /enable tenant/i })
    const dialog = dialogHeading.closest('dialog')

    await user.click(within(dialog).getByRole('button', { name: /^enable$/i }))

    await waitFor(() => {
      expect(screen.getByText(/failed to enable tenant/i)).toBeInTheDocument()
    })
  })

  it('shows error toast when disable fails', async () => {
    const user = userEvent.setup()
    const disableTenantMutationMock = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 500,
        data: { error: { message: 'Internal server error during disable' } },
      }),
    })
    mockUseDisableTenantMutation.mockReturnValue([disableTenantMutationMock, { isLoading: false }])
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [enabledTenant],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    })

    renderMaintainTenants()

    selectTenantAction('Enabled Tenant', 'Disable')

    const dialogHeading = screen.getByRole('heading', { name: /disable tenant/i })
    const dialog = dialogHeading.closest('dialog')

    await user.click(within(dialog).getByRole('button', { name: /^disable$/i }))

    await waitFor(() => {
      expect(screen.getByText(/failed to disable tenant/i)).toBeInTheDocument()
    })
  })
})
