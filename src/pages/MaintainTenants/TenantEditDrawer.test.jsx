/**
 * TenantEditDrawer Tests
 *
 * Covers the redesigned tenant-edit workspace:
 * - Tenant details remain at the top of the drawer
 * - Linked users render in a searchable, filterable table
 * - Bulk remove updates pending tenant-admin assignments
 * - Save and contract-error handling still work
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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
  tenantAdminUserIds: ['admin-user-1', 'admin-user-2'],
}

const defaultTenant = {
  _id: 'tenant-2',
  name: 'Default Tenant',
  website: 'https://default.com',
  status: 'ENABLED',
  isDefault: true,
  tenantAdminUserIds: ['admin-user-1'],
}

const archivedTenant = {
  _id: 'tenant-3',
  name: 'Archived Tenant',
  website: 'https://archived.com',
  status: 'ARCHIVED',
  isDefault: false,
  tenantAdminUserIds: ['admin-user-1'],
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

  it('renders the redesigned tenant details and linked users workspace', async () => {
    renderDrawer()

    expect(screen.getByRole('heading', { name: /edit tenant/i })).toBeInTheDocument()
    expect(screen.getByText('Tenant Details')).toBeInTheDocument()
    expect(screen.getByText('Linked Users')).toBeInTheDocument()
    expect(screen.getByText('Linked tenant admins')).toBeInTheDocument()
    expect(screen.getByText('2 linked users | 1 active')).toBeInTheDocument()
    expect(screen.getByLabelText(/add users to this tenant/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/search linked users/i)).toBeInTheDocument()

    const selectedAdmins = screen.getByLabelText(/selected admins/i)
    expect(within(selectedAdmins).getByText('Jordan Manager')).toBeInTheDocument()
    expect(within(selectedAdmins).getByText('Taylor Viewer')).toBeInTheDocument()

    const table = screen.getByRole('table', { name: /linked users/i })

    expect(within(table).getByText('Jordan Manager')).toBeInTheDocument()
    expect(within(table).getByText('Taylor Viewer')).toBeInTheDocument()
    expect(within(table).getByText('TENANT_ADMIN')).toBeInTheDocument()
    expect(within(table).getByText('USER')).toBeInTheDocument()
  })

  it('renders nothing when tenant is null', () => {
    renderDrawer({ tenant: null })
    expect(screen.queryByRole('heading', { name: /edit tenant/i })).not.toBeInTheDocument()
  })

  it('filters linked users inside the table by search term', async () => {
    const user = userEvent.setup()
    renderDrawer()

    const table = screen.getByRole('table', { name: /linked users/i })
    await user.type(screen.getByLabelText(/search linked users/i), 'Taylor')

    expect(within(table).queryByText('Jordan Manager')).not.toBeInTheDocument()
    expect(within(table).getByText('Taylor Viewer')).toBeInTheDocument()
  })

  it('filters linked users inside the table by status', async () => {
    const user = userEvent.setup()
    renderDrawer()

    const table = screen.getByRole('table', { name: /linked users/i })
    await user.selectOptions(screen.getByLabelText(/^status$/i), 'ACTIVE')

    expect(within(table).getByText('Jordan Manager')).toBeInTheDocument()
    expect(within(table).queryByText('Taylor Viewer')).not.toBeInTheDocument()
  })

  it('removes selected linked users and submits the updated tenant-admin assignments', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const updateTenantMutationMock = vi.fn().mockResolvedValue({ data: { _id: 'tenant-1' } })
    mockUseTenants.mockReturnValue({
      updateTenant: updateTenantMutationMock,
      updateTenantResult: { isLoading: false },
    })

    renderDrawer({ onClose })

    await user.click(screen.getByLabelText(/select row admin-user-2/i))
    await user.click(screen.getByRole('button', { name: /remove selected/i }))

    const table = screen.getByRole('table', { name: /linked users/i })
    expect(within(table).queryByText('Taylor Viewer')).not.toBeInTheDocument()
    expect(screen.getByText('1 linked user | 1 active')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateTenantMutationMock).toHaveBeenCalledWith('tenant-1', {
        tenantAdminUserIds: ['admin-user-1'],
      })
    })

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/acme tenant has been updated/i)).toBeInTheDocument()
    })
  })

  it('prevents removing the final linked tenant admin', async () => {
    const user = userEvent.setup()
    renderDrawer({ tenant: defaultTenant })

    const table = screen.getByRole('table', { name: /linked users/i })
    expect(within(table).getByRole('button', { name: /^remove jordan manager$/i })).toBeDisabled()

    await user.click(screen.getByLabelText(/select row admin-user-1/i))

    expect(screen.getByRole('button', { name: /remove selected/i })).toBeDisabled()
  })

  it('shows archived tenants as read-only in the edit drawer', () => {
    renderDrawer({ tenant: archivedTenant })

    expect(screen.getByText(/archived tenants are read-only in this workspace/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tenant name/i)).toBeDisabled()
    expect(screen.getByLabelText(/website url/i)).toBeDisabled()
    expect(screen.getByLabelText(/add users to this tenant/i)).toBeDisabled()
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

  it('surfaces contract-based tenant-admin guidance when save fails with invalid assignments', async () => {
    const user = userEvent.setup()
    const updateTenantMutationMock = vi.fn().mockRejectedValue({
      status: 422,
      data: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Please check the form for errors.',
          requestId: 'tenant-admin-edit-1',
          details: {
            reason: 'TENANT_ADMIN_ASSIGNMENTS_INVALID',
            invalidTenantAdminUserIds: ['outside-admin-3'],
            outOfCustomerTenantAdminUserIds: ['outside-admin-3'],
          },
        },
      },
    })
    mockUseTenants.mockReturnValue({
      updateTenant: updateTenantMutationMock,
      updateTenantResult: { isLoading: false },
    })

    renderDrawer()

    const nameInput = screen.getByLabelText(/tenant name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Acme Tenant Updated')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateTenantMutationMock).toHaveBeenCalledTimes(1)
      expect(
        screen.getAllByText(/replace users outside this customer context: outside-admin-3/i).length,
      ).toBeGreaterThan(0)
      expect(screen.getAllByText(/\(Ref: tenant-admin-edit-1\)/i).length).toBeGreaterThan(0)
    })
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
