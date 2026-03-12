/**
 * TenantEditDrawer Tests
 *
 * Covers:
 * - Renders heading and fields when tenant is provided
 * - Shows status badge
 * - Shows default badge for default tenants
 * - Pre-fills name and website from tenant prop
 * - Validates empty name on save
 * - Renders UserSearchSelect for tenant admin management
 * - Shows selected admin as chip (truncated ID fallback)
 * - Calls onClose when Cancel is clicked
 * - Returns null when tenant is null
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

const mockUseUpdateTenantMutation = vi.hoisted(() => vi.fn())

vi.mock('../../store/api/tenantApi.js', async () => {
  const actual = await vi.importActual('../../store/api/tenantApi.js')

  return {
    ...actual,
    useUpdateTenantMutation: (...args) => mockUseUpdateTenantMutation(...args),
  }
})

// Mock HTMLDialogElement methods (JSDOM does not support <dialog>)
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.open = false
  })
})

/** Sample tenant shapes */
const sampleTenant = {
  _id: 'tenant-1',
  name: 'Acme Tenant',
  website: 'https://acme.com',
  status: 'ENABLED',
  isDefault: false,
  tenantAdminUserIds: ['507f1f77bcf86cd799439011'],
}

const defaultTenant = {
  _id: 'tenant-2',
  name: 'Default Tenant',
  website: 'https://default.com',
  status: 'ENABLED',
  isDefault: true,
  tenantAdminUserIds: [],
}

const archivedTenant = {
  _id: 'tenant-3',
  name: 'Archived Tenant',
  website: 'https://archived.com',
  status: 'ARCHIVED',
  isDefault: false,
  tenantAdminUserIds: ['507f1f77bcf86cd799439011'],
}

/** Create a fresh store */
function createTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
  })
}

/** Render wrapper */
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
    mockUseUpdateTenantMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('renders the Edit Tenant heading', () => {
    renderDrawer()
    expect(
      screen.getByRole('heading', { name: /edit tenant/i }),
    ).toBeInTheDocument()
  })

  it('renders nothing when tenant is null', () => {
    renderDrawer({ tenant: null })
    expect(
      screen.queryByRole('heading', { name: /edit tenant/i }),
    ).not.toBeInTheDocument()
  })

  it('shows the tenant status badge', () => {
    renderDrawer()
    expect(screen.getByText('ENABLED')).toBeInTheDocument()
  })

  it('shows Default badge for default tenants', () => {
    renderDrawer({ tenant: defaultTenant })
    expect(screen.getByText('Default')).toBeInTheDocument()
  })

  it('pre-fills name input from tenant prop', () => {
    renderDrawer()
    const nameInput = screen.getByLabelText(/tenant name/i)
    expect(nameInput).toHaveValue('Acme Tenant')
  })

  it('pre-fills website input from tenant prop', () => {
    renderDrawer()
    const websiteInput = screen.getByLabelText(/website url/i)
    expect(websiteInput).toHaveValue('https://acme.com')
  })

  it('renders UserSearchSelect with combobox for admin assignment', () => {
    renderDrawer()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search by name or email/i)).toBeInTheDocument()
  })

  it('shows selected admin as a chip with truncated ID fallback', () => {
    renderDrawer()
    // Without cached user details, UserSearchSelect falls back to first 8 chars + ellipsis
    expect(screen.getByText('507f1f77…')).toBeInTheDocument()
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

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDrawer()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders Save Changes and Cancel buttons', () => {
    renderDrawer()
    expect(
      screen.getByRole('button', { name: /save changes/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /cancel/i }),
    ).toBeInTheDocument()
  })

  it('renders Tenant Admins fieldset legend', () => {
    renderDrawer()
    expect(screen.getByText('Tenant Admins')).toBeInTheDocument()
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

  it('surfaces contract-based tenant-admin guidance when save fails with invalid assignments', async () => {
    const user = userEvent.setup()
    const updateTenantMutationMock = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
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
      }),
    })
    mockUseUpdateTenantMutation.mockReturnValue([updateTenantMutationMock, { isLoading: false }])

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
})
