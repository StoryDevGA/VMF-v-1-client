/**
 * TenantEditDrawer Tests
 *
 * Covers the single-admin tenant-edit workspace:
 * - Tenant details remain at the top of the drawer
 * - Tenant admin assignment is singular
 * - Reassigning the tenant admin replaces the current assignment
 * - Save and contract-error handling still work
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import TenantEditDrawer from './TenantEditDrawer'

const mockUseTenants = vi.hoisted(() => vi.fn())
const mockUseListUsersQuery = vi.hoisted(() => vi.fn())
const mockUseLazyListUsersQuery = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useTenants.js', () => ({
  useTenants: (...args) => mockUseTenants(...args),
}))

vi.mock('../../store/api/userApi.js', async () => {
  const actual = await vi.importActual('../../store/api/userApi.js')

  return {
    ...actual,
    useListUsersQuery: (...args) => mockUseListUsersQuery(...args),
    useLazyListUsersQuery: (...args) => mockUseLazyListUsersQuery(...args),
  }
})

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModalMock() {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function closeMock() {
    this.open = false
  })
})

const customerUsers = [
  {
    _id: 'admin-user-1',
    name: 'Jordan Manager',
    email: 'jordan.manager@acme.test',
    isActive: true,
    memberships: [{ customerId: 'cust-1', roles: ['TENANT_ADMIN'] }],
  },
  {
    _id: 'admin-user-2',
    name: 'Taylor Viewer',
    email: 'taylor.viewer@acme.test',
    isActive: false,
    memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
  },
  {
    _id: 'admin-user-3',
    name: 'Morgan Backup',
    email: 'morgan.backup@acme.test',
    isActive: true,
    memberships: [{ customerId: 'cust-1', roles: ['TENANT_ADMIN', 'USER'] }],
  },
]

const sampleTenant = {
  _id: 'tenant-1',
  name: 'Acme Tenant',
  website: 'https://acme.com',
  status: 'ENABLED',
  isDefault: false,
  tenantAdminUserIds: ['admin-user-1'],
  tenantAdmin: {
    id: 'admin-user-1',
    name: 'Jordan Manager',
  },
}

const unassignedTenant = {
  _id: 'tenant-4',
  name: 'Unassigned Tenant',
  website: 'https://unassigned.com',
  status: 'ENABLED',
  isDefault: false,
  tenantAdminUserIds: [],
  tenantAdmin: null,
}

const defaultTenant = {
  _id: 'tenant-2',
  name: 'Default Tenant',
  website: 'https://default.com',
  status: 'ENABLED',
  isDefault: true,
  tenantAdminUserIds: ['admin-user-1'],
  tenantAdmin: {
    id: 'admin-user-1',
    name: 'Jordan Manager',
  },
}

const archivedTenant = {
  _id: 'tenant-3',
  name: 'Archived Tenant',
  website: 'https://archived.com',
  status: 'ARCHIVED',
  isDefault: false,
  tenantAdminUserIds: ['admin-user-1'],
  tenantAdmin: {
    id: 'admin-user-1',
    name: 'Jordan Manager',
  },
}

function createTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
  })
}

function renderDrawer(props = {}) {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    tenant: sampleTenant,
    customerId: 'cust-1',
    ...props,
  }
  const store = createTestStore()

  return {
    ...render(
      <Provider store={store}>
        <ToasterProvider>
          <MemoryRouter>
            <TenantEditDrawer {...defaultProps} />
          </MemoryRouter>
        </ToasterProvider>
      </Provider>,
    ),
    onClose: defaultProps.onClose,
  }
}

describe('TenantEditDrawer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUseTenants.mockReturnValue({
      updateTenant: vi.fn(),
      updateTenantResult: { isLoading: false },
    })
    mockUseListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: customerUsers,
        },
      },
      isFetching: false,
      error: null,
    })
    mockUseLazyListUsersQuery.mockReturnValue([
      vi.fn(),
      {
        data: {
          data: {
            users: customerUsers,
          },
        },
        isFetching: false,
      },
    ])
  })

  it('renders the single-admin tenant workspace', async () => {
    renderDrawer()

    expect(screen.getByRole('heading', { name: /edit tenant/i })).toBeInTheDocument()
    expect(
      screen.getByText(/update tenant details and assign exactly one tenant admin/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Tenant Details')).toBeInTheDocument()
    expect(screen.getByText('Tenant Admin')).toBeInTheDocument()
    expect(screen.getByText('Tenant admin assignment')).toBeInTheDocument()
    expect(screen.getByText('Assigned')).toBeInTheDocument()
    expect(screen.getByText('Jordan Manager')).toBeInTheDocument()
    expect(screen.getByText('jordan.manager@acme.test')).toBeInTheDocument()
    expect(screen.getByLabelText(/assign tenant admin/i)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: /linked users/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove selected/i })).not.toBeInTheDocument()
  })

  it('shows an empty-state message when no tenant admin is currently assigned', () => {
    renderDrawer({ tenant: unassignedTenant })

    expect(screen.getByText(/not assigned/i)).toBeInTheDocument()
    expect(screen.getByText(/no tenant admin is currently assigned/i)).toBeInTheDocument()
  })

  it('replaces the current tenant admin and saves a single tenantAdminUserIds entry', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const updateTenantMutationMock = vi.fn().mockResolvedValue({ data: { _id: 'tenant-1' } })
    mockUseTenants.mockReturnValue({
      updateTenant: updateTenantMutationMock,
      updateTenantResult: { isLoading: false },
    })

    renderDrawer({ onClose })

    await user.type(screen.getByRole('combobox'), 'Morgan')
    await user.click(await screen.findByText('Morgan Backup'))

    await waitFor(() => {
      expect(screen.getByText('Morgan Backup')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateTenantMutationMock).toHaveBeenCalledWith('tenant-1', {
        tenantAdminUserIds: ['admin-user-3'],
      })
    })

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/acme tenant has been updated/i)).toBeInTheDocument()
    })
  })

  it('shows archived tenants as read-only in the edit drawer', () => {
    renderDrawer({ tenant: archivedTenant })

    expect(screen.getByText(/archived tenants are read-only in this workspace/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tenant name/i)).toBeDisabled()
    expect(screen.getByLabelText(/website url/i)).toBeDisabled()
    expect(screen.getByLabelText(/assign tenant admin/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('shows default-tenant lifecycle guidance in the edit drawer', () => {
    renderDrawer({ tenant: defaultTenant })

    expect(
      screen.getByText(/the default tenant must remain enabled for this customer/i),
    ).toBeInTheDocument()
  })

  it('shows validation error when name is cleared and Save is clicked', async () => {
    const user = userEvent.setup()
    renderDrawer()

    const nameInput = screen.getByLabelText(/tenant name/i)
    await user.clear(nameInput)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText(/name must not be empty/i)).toBeInTheDocument()
    })
  })

  it('surfaces the single-admin contract validation message from the API', async () => {
    const user = userEvent.setup()
    const updateTenantMutationMock = vi.fn().mockRejectedValue({
      status: 422,
      data: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Please check the form for errors.',
          details: {
            tenantAdminUserIds: 'Only one tenant admin is allowed',
          },
        },
      },
    })
    mockUseTenants.mockReturnValue({
      updateTenant: updateTenantMutationMock,
      updateTenantResult: { isLoading: false },
    })

    renderDrawer()

    await user.clear(screen.getByLabelText(/tenant name/i))
    await user.type(screen.getByLabelText(/tenant name/i), 'Acme Tenant Updated')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateTenantMutationMock).toHaveBeenCalledTimes(1)
      expect(screen.getAllByText(/only one tenant admin is allowed/i).length).toBeGreaterThan(0)
    })
  })

  it('shows informational toast when saving without any changes', async () => {
    const user = userEvent.setup()
    const updateTenantMutationMock = vi.fn()
    mockUseTenants.mockReturnValue({
      updateTenant: updateTenantMutationMock,
      updateTenantResult: { isLoading: false },
    })

    renderDrawer()

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText(/no changes/i)).toBeInTheDocument()
      expect(screen.getByText(/no fields were modified/i)).toBeInTheDocument()
    })
    expect(updateTenantMutationMock).not.toHaveBeenCalled()
  })

  it('surfaces customer-context guidance instead of falling back to a platform-only tenant update route', async () => {
    const user = userEvent.setup()
    const updateTenantMutationMock = vi.fn().mockRejectedValue({
      status: 400,
      data: {
        error: {
          code: 'CUSTOMER_CONTEXT_REQUIRED',
          message: 'No customer context is available for this action. Refresh and try again.',
        },
      },
    })
    mockUseTenants.mockReturnValue({
      updateTenant: updateTenantMutationMock,
      updateTenantResult: { isLoading: false },
    })

    renderDrawer({ customerId: null })

    await user.clear(screen.getByLabelText(/tenant name/i))
    await user.type(screen.getByLabelText(/tenant name/i), 'Acme Tenant Updated')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateTenantMutationMock).toHaveBeenCalledWith('tenant-1', {
        name: 'Acme Tenant Updated',
      })
      expect(
        screen.getAllByText(/no customer context is available for this action/i).length,
      ).toBeGreaterThanOrEqual(1)
    })
  })
})
