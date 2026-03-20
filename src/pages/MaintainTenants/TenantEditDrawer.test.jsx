/**
 * TenantEditDrawer Tests
 *
 * Covers tenant-details-only edit behavior:
 * - Edit Tenant focuses on tenant name and website updates
 * - Tenant-admin assignment is not rendered in this dialog
 * - Save, validation, read-only, and error handling remain intact
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

vi.mock('../../hooks/useTenants.js', () => ({
  useTenants: (...args) => mockUseTenants(...args),
}))

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModalMock() {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function closeMock() {
    this.open = false
  })
})

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

const defaultTenant = {
  _id: 'tenant-2',
  name: 'Default Tenant',
  website: 'https://default.com',
  status: 'ENABLED',
  isDefault: true,
}

const archivedTenant = {
  _id: 'tenant-3',
  name: 'Archived Tenant',
  website: 'https://archived.com',
  status: 'ARCHIVED',
  isDefault: false,
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
  })

  it('renders the tenant-details-only workspace', () => {
    renderDrawer()

    expect(screen.getByRole('heading', { name: /edit tenant/i })).toBeInTheDocument()
    expect(
      screen.getByText(/update tenant details in this workspace/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Tenant Details')).toBeInTheDocument()
    expect(screen.queryByText('Tenant Admin')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/assign tenant admin/i)).not.toBeInTheDocument()
  })

  it('saves updated tenant details only', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const updateTenantMutationMock = vi.fn().mockResolvedValue({ data: { _id: 'tenant-1' } })

    mockUseTenants.mockReturnValue({
      updateTenant: updateTenantMutationMock,
      updateTenantResult: { isLoading: false },
    })

    renderDrawer({ onClose })

    await user.clear(screen.getByLabelText(/tenant name/i))
    await user.type(screen.getByLabelText(/tenant name/i), 'Acme Tenant Updated')
    await user.clear(screen.getByLabelText(/website url/i))
    await user.type(screen.getByLabelText(/website url/i), 'https://acme-updated.com')

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateTenantMutationMock).toHaveBeenCalledWith('tenant-1', {
        name: 'Acme Tenant Updated',
        website: 'https://acme-updated.com',
      })
    })

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/acme tenant updated has been updated/i)).toBeInTheDocument()
    })
  })

  it('shows archived tenants as read-only in the edit drawer', () => {
    renderDrawer({ tenant: archivedTenant })

    expect(screen.getByText(/archived tenants are read-only in this workspace/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tenant name/i)).toBeDisabled()
    expect(screen.getByLabelText(/website url/i)).toBeDisabled()
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

  it('maps 422 tenant validation errors to tenant detail fields', async () => {
    const user = userEvent.setup()
    const updateTenantMutationMock = vi.fn().mockRejectedValue({
      status: 422,
      data: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Please check the form for errors.',
          details: {
            name: 'Tenant name is required.',
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
      expect(screen.getByText(/tenant name is required/i)).toBeInTheDocument()
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

  it('surfaces customer-context guidance instead of a platform-only mutation route', async () => {
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
