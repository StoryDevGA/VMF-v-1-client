import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import TenantAdminAssignmentDialog from './TenantAdminAssignmentDialog'

const {
  mockUseTenants,
  mockUseListUsersQuery,
} = vi.hoisted(() => ({
  mockUseTenants: vi.fn(),
  mockUseListUsersQuery: vi.fn(),
}))

vi.mock('../../hooks/useTenants.js', () => ({
  useTenants: (...args) => mockUseTenants(...args),
}))

vi.mock('../../store/api/userApi.js', () => ({
  useListUsersQuery: (...args) => mockUseListUsersQuery(...args),
}))

vi.mock('../../components/UserSearchSelect', () => {
  function MockUserSearchSelect({
    label,
    onChange,
    error,
    disabled,
    selectedIds = [],
    selectedUsers = {},
  }) {
    const selectedId = selectedIds[0]
    const selectedUser = selectedId ? selectedUsers[selectedId] : null

    return (
      <div>
        <label htmlFor="mock-tenant-admin-search">{label}</label>
        {selectedId ? (
          <div aria-label="Selected admins">
            <span>{selectedUser?.name ?? selectedId}</span>
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={disabled}
            >
              Remove Selected Admin
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onChange(['user-20'])}
          disabled={disabled}
        >
          Select Replacement
        </button>
        <button
          type="button"
          onClick={() => onChange(['user-10'])}
          disabled={disabled}
        >
          Select Current Admin
        </button>
        {error ? <span role="alert">{error}</span> : null}
      </div>
    )
  }

  return {
    UserSearchSelect: MockUserSearchSelect,
    default: MockUserSearchSelect,
  }
})

function createTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
  })
}

function renderDialog(props = {}) {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    customerId: 'cust-1',
    tenant: {
      _id: 'tenant-1',
      name: 'Enabled Tenant',
      tenantAdminUserIds: ['user-10'],
      tenantAdmin: {
        id: 'user-10',
        name: 'Jordan Manager',
      },
    },
    ...props,
  }

  const store = createTestStore()

  return {
    ...render(
      <Provider store={store}>
        <ToasterProvider>
          <MemoryRouter>
            <TenantAdminAssignmentDialog {...defaultProps} />
          </MemoryRouter>
        </ToasterProvider>
      </Provider>,
    ),
    onClose: defaultProps.onClose,
  }
}

describe('TenantAdminAssignmentDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUseTenants.mockReturnValue({
      updateTenant: vi.fn().mockResolvedValue({
        data: {
          tenantAdminUser: {
            id: 'user-20',
            name: 'Morgan Backup',
            customerRoles: ['TENANT_ADMIN', 'USER'],
          },
        },
      }),
      updateTenantResult: { isLoading: false },
    })
    mockUseListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              _id: 'user-10',
              name: 'Jordan Manager',
              email: 'jordan.manager@acme.test',
            },
            {
              _id: 'user-20',
              name: 'Morgan Backup',
              email: 'morgan.backup@acme.test',
            },
          ],
        },
      },
      error: null,
    })

    HTMLDialogElement.prototype.showModal = vi.fn(function showModalMock() {
      this.open = true
    })
    HTMLDialogElement.prototype.close = vi.fn(function closeMock() {
      this.open = false
    })
  })

  it('renders the current tenant admin summary and replacement action', () => {
    renderDialog()

    expect(screen.getByRole('heading', { name: /assign tenant admin/i })).toBeInTheDocument()
    expect(screen.getByText(/replace the current tenant admin for enabled tenant/i)).toBeInTheDocument()
    expect(screen.getByText('Jordan Manager')).toBeInTheDocument()
    expect(screen.getByText('jordan.manager@acme.test')).toBeInTheDocument()
    expect(screen.getByText(/search for replacement admin/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /replace admin/i })).toBeInTheDocument()
  })

  it('submits the selected replacement tenant admin and closes', async () => {
    const user = userEvent.setup()
    const updateTenant = vi.fn().mockResolvedValue({
      data: {
        tenantAdminUser: {
          id: 'user-20',
          name: 'Morgan Backup',
          customerRoles: ['TENANT_ADMIN', 'USER'],
        },
      },
    })
    const onClose = vi.fn()

    mockUseTenants.mockReturnValue({
      updateTenant,
      updateTenantResult: { isLoading: false },
    })

    renderDialog({ onClose })

    await user.click(screen.getByRole('button', { name: /select replacement/i }))
    await user.click(screen.getByRole('button', { name: /replace admin/i }))

    await waitFor(() => {
      expect(updateTenant).toHaveBeenCalledWith('tenant-1', {
        tenantAdminUserIds: ['user-20'],
      })
    })

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('warns when tenant-admin role is not confirmed in update response', async () => {
    const user = userEvent.setup()
    mockUseTenants.mockReturnValue({
      updateTenant: vi.fn().mockResolvedValue({
        data: {
          tenantAdminUser: {
            id: 'user-20',
            name: 'Morgan Backup',
            customerRoles: ['USER'],
          },
        },
      }),
      updateTenantResult: { isLoading: false },
    })

    renderDialog()

    await user.click(screen.getByRole('button', { name: /select replacement/i }))
    await user.click(screen.getByRole('button', { name: /replace admin/i }))

    await waitFor(() => {
      expect(screen.getByText(/tenant admin updated, role grant needs review/i)).toBeInTheDocument()
    })
  })

  it('shows validation error when no user is selected before submitting', async () => {
    const user = userEvent.setup()
    const updateTenant = vi.fn()

    mockUseTenants.mockReturnValue({
      updateTenant,
      updateTenantResult: { isLoading: false },
    })

    renderDialog()

    await user.click(screen.getByRole('button', { name: /replace admin/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/select one tenant admin before continuing/i)
    })
    expect(updateTenant).not.toHaveBeenCalled()
  })

  it('shows validation error when selecting the same user as the current tenant admin', async () => {
    const user = userEvent.setup()
    const updateTenant = vi.fn()

    mockUseTenants.mockReturnValue({
      updateTenant,
      updateTenantResult: { isLoading: false },
    })

    renderDialog()

    await user.click(screen.getByRole('button', { name: /select current admin/i }))
    await user.click(screen.getByRole('button', { name: /replace admin/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/choose a different user to replace the current tenant admin/i)
    })
    expect(updateTenant).not.toHaveBeenCalled()
  })

  it('surfaces tenant-admin assignment validation errors from 422 responses', async () => {
    const user = userEvent.setup()
    mockUseTenants.mockReturnValue({
      updateTenant: vi.fn().mockRejectedValue({
        status: 422,
        data: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Please check the form for errors.',
            requestId: 'tenant-admin-reassign-1',
            details: {
              reason: 'TENANT_ADMIN_ASSIGNMENTS_INVALID',
              invalidTenantAdminUserIds: ['user-20'],
              inactiveTenantAdminUserIds: ['user-20'],
            },
          },
        },
      }),
      updateTenantResult: { isLoading: false },
    })

    renderDialog()

    await user.click(screen.getByRole('button', { name: /select replacement/i }))
    await user.click(screen.getByRole('button', { name: /replace admin/i }))

    await waitFor(() => {
      expect(
        screen.getAllByText(/replace inactive tenant admins before continuing: user-20/i).length,
      ).toBeGreaterThan(0)
    })
  })

  it('renders ErrorSupportPanel when customer users fail to load', () => {
    mockUseListUsersQuery.mockReturnValue({
      data: null,
      error: {
        status: 500,
        data: {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to load customer users.',
          },
        },
      },
    })

    renderDialog()

    expect(screen.getByText(/failed to load customer users/i)).toBeInTheDocument()
  })
})
