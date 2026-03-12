/**
 * MaintainTenants Page Tests
 *
 * Covers:
 * - Renders page heading and create button
 * - Renders search input and status filter
 * - Shows empty message when no customer context
 * - Renders tenant table with column headers
 * - Opens Create Tenant wizard on button click
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import tenantContextReducer from '../../store/slices/tenantContextSlice.js'
import MaintainTenants from './MaintainTenants'

const {
  mockUseListTenantsQuery,
  mockUseCreateTenantMutation,
  mockUseUpdateTenantMutation,
  mockUseEnableTenantMutation,
  mockUseDisableTenantMutation,
} = vi.hoisted(() => ({
  mockUseListTenantsQuery: vi.fn(),
  mockUseCreateTenantMutation: vi.fn(),
  mockUseUpdateTenantMutation: vi.fn(),
  mockUseEnableTenantMutation: vi.fn(),
  mockUseDisableTenantMutation: vi.fn(),
}))

vi.mock('../../store/api/tenantApi.js', () => ({
  useListTenantsQuery: (...args) => mockUseListTenantsQuery(...args),
  useCreateTenantMutation: (...args) => mockUseCreateTenantMutation(...args),
  useUpdateTenantMutation: (...args) => mockUseUpdateTenantMutation(...args),
  useEnableTenantMutation: (...args) => mockUseEnableTenantMutation(...args),
  useDisableTenantMutation: (...args) => mockUseDisableTenantMutation(...args),
}))

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
}

const defaultTenant = {
  _id: 'tenant-default',
  name: 'Default Tenant',
  website: 'https://default.example.com',
  status: 'ENABLED',
  isDefault: true,
}

const disabledTenant = {
  _id: 'tenant-disabled',
  name: 'Disabled Tenant',
  website: 'https://disabled.example.com',
  status: 'DISABLED',
  isDefault: false,
}

const archivedTenant = {
  _id: 'tenant-archived',
  name: 'Archived Tenant',
  website: 'https://archived.example.com',
  status: 'ARCHIVED',
  isDefault: false,
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

/** Render wrapper with all providers */
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
  })

  it('renders the page heading', () => {
    renderMaintainTenants()
    expect(
      screen.getByRole('heading', { name: /maintain tenants/i }),
    ).toBeInTheDocument()
  })

  it('renders the Create Tenant button', () => {
    renderMaintainTenants()
    expect(
      screen.getByRole('button', { name: /create tenant/i }),
    ).toBeInTheDocument()
  })

  it('renders the search input', () => {
    renderMaintainTenants()
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument()
  })

  it('renders the status filter', () => {
    renderMaintainTenants()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it('renders the tenants table region', () => {
    renderMaintainTenants()
    expect(screen.getByLabelText(/tenants table/i)).toBeInTheDocument()
  })

  it('shows empty context message when no customer membership', () => {
    const store = createTestStore({
      auth: { user: noCustomerUser, status: 'authenticated' },
    })
    renderMaintainTenants(store)
    expect(
      screen.getByText(/no customer context available/i),
    ).toBeInTheDocument()
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

  it('status-gates tenant row actions and surfaces lifecycle guidance', () => {
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

    expect(screen.getByText(/disable removes tenant access immediately/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit enabled tenant/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /enable enabled tenant/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /disable enabled tenant/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /enable disabled tenant/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /disable disabled tenant/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /edit archived tenant/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /enable archived tenant/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /disable archived tenant/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /disable default tenant/i })).toBeDisabled()
    expect(screen.getByText(/archived tenants are read-only in this workspace/i)).toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: /disable enabled tenant/i }))

    const dialogHeading = screen.getByRole('heading', { name: /disable tenant/i })
    const dialog = dialogHeading.closest('dialog')
    expect(dialog).not.toBeNull()
    expect(
      within(dialog).getByText(/users assigned to this tenant will lose access immediately/i),
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /^disable$/i }))

    await waitFor(() => {
      expect(disableTenantMutationMock).toHaveBeenCalledWith({ tenantId: 'tenant-enabled' })
    })
    expect(
      await screen.findByText(/enabled tenant is disabled\. users assigned to this tenant lost access immediately\./i),
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

    await user.click(screen.getByRole('button', { name: /enable disabled tenant/i }))

    const dialogHeading = screen.getByRole('heading', { name: /enable tenant/i })
    const dialog = dialogHeading.closest('dialog')
    expect(dialog).not.toBeNull()
    expect(
      within(dialog).getByText(/users assigned to this tenant will regain access immediately/i),
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /^enable$/i }))

    await waitFor(() => {
      expect(enableTenantMutationMock).toHaveBeenCalledWith({ tenantId: 'tenant-disabled' })
    })
    expect(
      await screen.findByText(/disabled tenant is enabled\. users assigned to this tenant can access it immediately\./i),
    ).toBeInTheDocument()
  })

  it('renders table with column headers', () => {
    renderMaintainTenants()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Website')).toBeInTheDocument()
    // "Status" appears in both filter label and table header
    const statusElements = screen.getAllByText('Status')
    expect(statusElements.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Default')).toBeInTheDocument()
  })

  it('opens Create Tenant wizard when button is clicked', async () => {
    const user = userEvent.setup()
    renderMaintainTenants()

    await user.click(screen.getByRole('button', { name: /create tenant/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /create tenant/i }),
      ).toBeInTheDocument()
    })
  })
})
