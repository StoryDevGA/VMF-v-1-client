/**
 * UserEditDrawer Tests
 *
 * Covers:
 * - Renders editable name/email fields and scoped role controls
 * - Displays user status and trust status
 * - Submits partial update payloads for changed fields only
 * - Surfaces contract-aligned post-save and error guidance
 * - Cancel closes the drawer
 * - Does not render when user is null
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
import UserEditDrawer from './UserEditDrawer'

const { mockUseUpdateUserMutation, mockUseTenantContext } = vi.hoisted(() => ({
  mockUseUpdateUserMutation: vi.fn(),
  mockUseTenantContext: vi.fn(),
}))

vi.mock('../../store/api/userApi.js', () => ({
  useUpdateUserMutation: (...args) => mockUseUpdateUserMutation(...args),
}))

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: (...args) => mockUseTenantContext(...args),
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

/** Mock user to edit */
const mockUser = {
  _id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@acme.com',
  isActive: true,
  memberships: [
    { customerId: 'cust-1', roles: ['USER'] },
  ],
  tenantMemberships: [],
  vmfGrants: [],
  identityPlus: {
    trustStatus: 'TRUSTED',
    invitedAt: '2026-01-10T08:00:00Z',
    trustedAt: '2026-01-15T14:00:00Z',
  },
}

/** Disabled user */
const disabledUser = {
  ...mockUser,
  _id: 'user-2',
  isActive: false,
  identityPlus: { trustStatus: 'REVOKED' },
}

const canonicalAdminUser = {
  ...mockUser,
  _id: 'user-3',
  name: 'Owner User',
  email: 'owner@acme.com',
  isCanonicalAdmin: true,
  memberships: [
    { customerId: 'cust-1', roles: ['CUSTOMER_ADMIN'] },
  ],
}

const tenantVisibleUser = {
  ...mockUser,
  _id: 'user-4',
  tenantVisibility: ['ten-1', 'ten-legacy'],
}

const singleTenantAdminUser = {
  ...mockUser,
  _id: 'user-5',
  memberships: [
    { customerId: 'cust-1', roles: ['TENANT_ADMIN'] },
  ],
}

function getTenantContextMockValue(overrides = {}) {
  return {
    customerId: 'cust-1',
    tenantId: null,
    tenantName: null,
    resolvedTenantName: null,
    tenants: [
      {
        id: 'ten-1',
        name: 'North Hub',
        status: 'ENABLED',
        isDefault: true,
        isSelectable: true,
        selectionState: 'AVAILABLE',
      },
      {
        id: 'ten-2',
        name: 'South Hub',
        status: 'ENABLED',
        isDefault: false,
        isSelectable: true,
        selectionState: 'AVAILABLE',
      },
      {
        id: 'ten-legacy',
        name: 'Legacy Hub',
        status: 'DISABLED',
        isDefault: false,
        isSelectable: false,
        selectionState: 'PRESERVED',
      },
    ],
    selectableTenants: [
      {
        id: 'ten-1',
        name: 'North Hub',
        status: 'ENABLED',
        isDefault: true,
        isSelectable: true,
        selectionState: 'AVAILABLE',
      },
      {
        id: 'ten-2',
        name: 'South Hub',
        status: 'ENABLED',
        isDefault: false,
        isSelectable: true,
        selectionState: 'AVAILABLE',
      },
    ],
    tenantVisibilityMeta: {
      mode: 'GUIDED',
      allowed: true,
      topology: 'MULTI_TENANT',
      isServiceProvider: true,
      selectableStatuses: ['ENABLED'],
    },
    isLoadingTenants: false,
    tenantsError: null,
    isSuperAdmin: false,
    accessibleCustomerIds: ['cust-1'],
    hasSelectedCustomerAccess: true,
    selectedTenant: null,
    isResolvingSelectedTenantContext: false,
    hasInvalidTenantContext: false,
    setCustomerId: vi.fn(),
    setTenantId: vi.fn(),
    clearContext: vi.fn(),
    ...overrides,
  }
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
    user: mockUser,
    customerId: 'cust-1',
    ...props,
  }
  const store = createTestStore()

  return {
    ...render(
      <Provider store={store}>
        <ToasterProvider>
          <MemoryRouter>
            <UserEditDrawer {...defaultProps} />
          </MemoryRouter>
        </ToasterProvider>
      </Provider>,
    ),
    onClose: defaultProps.onClose,
  }
}

describe('UserEditDrawer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    const updateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          _id: 'user-1',
          name: 'Jane Doe',
          email: 'jane@acme.com',
          isActive: true,
          trustStatus: 'TRUSTED',
        },
      }),
    })
    mockUseUpdateUserMutation.mockReturnValue([updateUser, { isLoading: false }])
    mockUseTenantContext.mockReturnValue(getTenantContextMockValue())
  })

  it('renders the Edit User heading', () => {
    renderDrawer()
    expect(
      screen.getByRole('heading', { name: /edit user/i }),
    ).toBeInTheDocument()
  })

  it('displays user name as editable input', () => {
    renderDrawer()
    const nameInput = screen.getByLabelText(/name/i)
    expect(nameInput).toBeInTheDocument()
    expect(nameInput).toBeEnabled()
    expect(nameInput).toHaveValue('Jane Doe')
  })

  it('displays user email as editable input', () => {
    renderDrawer()
    const emailInput = screen.getByLabelText(/email/i)
    expect(emailInput).toBeInTheDocument()
    expect(emailInput).toBeEnabled()
    expect(emailInput).toHaveValue('jane@acme.com')
  })

  it('shows Active status for active user', () => {
    renderDrawer()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows Disabled status for disabled user', () => {
    renderDrawer({ user: disabledUser })
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('shows trust status', () => {
    renderDrawer()
    expect(screen.getByText('Trusted')).toBeInTheDocument()
  })

  it('renders role checkboxes', () => {
    renderDrawer()
    expect(screen.getByLabelText(/tenant admin/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^user$/i)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /customer admin/i })).not.toBeInTheDocument()
  })

  it('hides TENANT_ADMIN for single-tenant customers and shows topology guidance', () => {
    mockUseTenantContext.mockReturnValue(
      getTenantContextMockValue({
        tenants: [],
        selectableTenants: [],
        tenantVisibilityMeta: {
          mode: 'NONE',
          allowed: false,
          topology: 'SINGLE_TENANT',
          isServiceProvider: false,
          selectableStatuses: [],
        },
      }),
    )

    renderDrawer()

    expect(screen.queryByLabelText(/tenant admin/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^user$/i)).toBeInTheDocument()
    expect(
      screen.getByText(/tenant admin is only available for multi-tenant customers/i),
    ).toBeInTheDocument()
  })

  it('renders guided tenant-visibility controls with preserved selections', () => {
    renderDrawer({ user: tenantVisibleUser })

    expect(screen.getByText(/select the tenants this user should be able to access/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/north hub/i)).toBeChecked()
    expect(screen.getByLabelText(/south hub/i)).not.toBeChecked()
    expect(screen.getByText(/legacy hub/i)).toBeInTheDocument()
    expect(screen.getByText(/previously selected tenants that are no longer selectable/i)).toBeInTheDocument()
  })

  it('pre-checks the USER role from user memberships', () => {
    renderDrawer()
    expect(screen.getByLabelText(/^user$/i)).toBeChecked()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDrawer()

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders Save Changes button', () => {
    renderDrawer()
    expect(
      screen.getByRole('button', { name: /save changes/i }),
    ).toBeInTheDocument()
  })

  it('disables save until an editable field changes', () => {
    renderDrawer()
    expect(
      screen.getByRole('button', { name: /save changes/i }),
    ).toBeDisabled()
  })

  it('shows governed customer-admin guidance and transfer action for eligible users', () => {
    const onStartOwnershipTransfer = vi.fn()
    renderDrawer({ hasCanonicalAdmin: true, onStartOwnershipTransfer })

    expect(
      screen.getByText(/customer admin ownership is managed through transfer ownership/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /transfer ownership to this user/i }),
    ).toBeInTheDocument()
  })

  it('hands off to the ownership-transfer workflow from the drawer action', async () => {
    const user = userEvent.setup()
    const onStartOwnershipTransfer = vi.fn()
    renderDrawer({ hasCanonicalAdmin: true, onStartOwnershipTransfer })

    await user.click(screen.getByRole('button', { name: /transfer ownership to this user/i }))

    expect(onStartOwnershipTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'user-1', email: 'jane@acme.com' }),
    )
  })

  it('shows canonical-admin protection guidance for the current owner', () => {
    renderDrawer({ user: canonicalAdminUser, hasCanonicalAdmin: true })

    expect(
      screen.getByText(/generic role edits here do not add or remove the governed customer admin assignment/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/this user is the current canonical admin/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /transfer ownership to this user/i }),
    ).not.toBeInTheDocument()
  })

  it('submits only the changed email field and shows resend guidance when trust resets', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const updateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          _id: 'user-1',
          name: 'Jane Doe',
          email: 'jane.updated@acme.com',
          isActive: true,
          trustStatus: 'UNTRUSTED',
        },
      }),
    })
    mockUseUpdateUserMutation.mockReturnValue([updateUser, { isLoading: false }])

    renderDrawer({ onClose })

    await user.clear(screen.getByLabelText(/email/i))
    await user.type(screen.getByLabelText(/email/i), 'jane.updated@acme.com')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith({
        userId: 'user-1',
        body: { email: 'jane.updated@acme.com' },
      })
    })

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/trust reset to untrusted/i)).toBeInTheDocument()
    })
  })

  it('shows reactivation guidance after updating a disabled user email', async () => {
    const user = userEvent.setup()
    const updateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          _id: 'user-2',
          name: 'Jane Doe',
          email: 'disabled.updated@acme.com',
          isActive: false,
          trustStatus: 'REVOKED',
        },
      }),
    })
    mockUseUpdateUserMutation.mockReturnValue([updateUser, { isLoading: false }])

    renderDrawer({ user: disabledUser })

    await user.clear(screen.getByLabelText(/email/i))
    await user.type(screen.getByLabelText(/email/i), 'disabled.updated@acme.com')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(
      await screen.findByText(/resend invitation stays unavailable until reactivation succeeds/i),
    ).toBeInTheDocument()
  })

  it('submits tenant-visibility changes using selected tenant ids', async () => {
    const user = userEvent.setup()
    const updateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          _id: 'user-4',
          name: 'Jane Doe',
          email: 'jane@acme.com',
          isActive: true,
          trustStatus: 'TRUSTED',
          tenantVisibility: ['ten-2'],
        },
      }),
    })
    mockUseUpdateUserMutation.mockReturnValue([updateUser, { isLoading: false }])

    renderDrawer({ user: tenantVisibleUser })

    await user.click(screen.getByLabelText(/north hub/i))
    await user.click(screen.getByLabelText(/south hub/i))
    await user.click(screen.getByRole('button', { name: /remove/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith({
        userId: 'user-4',
        body: {
          tenantVisibility: ['ten-2'],
        },
      })
    })
  })

  it('filters hidden tenant-admin assignments out of submitted role changes for single-tenant customers', async () => {
    const user = userEvent.setup()
    const updateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          _id: 'user-5',
          name: 'Jane Doe',
          email: 'jane@acme.com',
          isActive: true,
          trustStatus: 'TRUSTED',
          memberships: [
            { customerId: 'cust-1', roles: ['USER'] },
          ],
        },
      }),
    })
    mockUseUpdateUserMutation.mockReturnValue([updateUser, { isLoading: false }])
    mockUseTenantContext.mockReturnValue(
      getTenantContextMockValue({
        tenants: [],
        selectableTenants: [],
        tenantVisibilityMeta: {
          mode: 'NONE',
          allowed: false,
          topology: 'SINGLE_TENANT',
          isServiceProvider: false,
          selectableStatuses: [],
        },
      }),
    )

    renderDrawer({ user: singleTenantAdminUser })

    expect(
      screen.getByText(/saving role changes will remove that assignment/i),
    ).toBeInTheDocument()

    await user.click(screen.getByLabelText(/^user$/i))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith({
        userId: 'user-5',
        body: {
          roles: ['USER'],
        },
      })
    })
  })

  it('maps reason-based email conflicts to the email field', async () => {
    const user = userEvent.setup()
    const updateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'USER_ALREADY_EXISTS',
            requestId: 'req-email-conflict-1',
            details: {
              reason: 'already-in-customer',
              existingUserId: 'user-99',
            },
          },
        },
      }),
    })
    mockUseUpdateUserMutation.mockReturnValue([updateUser, { isLoading: false }])

    renderDrawer()

    await user.clear(screen.getByLabelText(/email/i))
    await user.type(screen.getByLabelText(/email/i), 'duplicate@acme.com')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const conflictMessages = await screen.findAllByText(/already exists in this customer/i)
    expect(conflictMessages.length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(/\(Ref: req-email-conflict-1\)/i).length).toBeGreaterThanOrEqual(2)
  })

  it('shows not-required guidance when tenant visibility is not allowed for the topology', () => {
    mockUseTenantContext.mockReturnValue(
      getTenantContextMockValue({
        tenants: [],
        selectableTenants: [],
        tenantVisibilityMeta: {
          mode: 'NONE',
          allowed: false,
          topology: 'SINGLE_TENANT',
          isServiceProvider: false,
          selectableStatuses: [],
        },
      }),
    )

    renderDrawer()

    expect(screen.getByText(/tenant visibility is not required for this customer topology/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/north hub/i)).not.toBeInTheDocument()
  })

  it('maps tenant-visibility validation reasons to the tenant field', async () => {
    const user = userEvent.setup()
    const updateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 422,
        data: {
          error: {
            code: 'VALIDATION_FAILED',
            requestId: 'req-tenant-visibility-1',
            details: {
              reason: 'TENANT_VISIBILITY_INVALID_TENANT_IDS',
              invalidTenantIds: ['ten-legacy'],
            },
          },
        },
      }),
    })
    mockUseUpdateUserMutation.mockReturnValue([updateUser, { isLoading: false }])

    renderDrawer({ user: tenantVisibleUser })

    await user.click(screen.getByLabelText(/north hub/i))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      const tenantVisibilityError = screen.getByText(
        /one or more tenant selections are no longer valid/i,
        {
          selector: '.user-edit-drawer__error',
        },
      )

      expect(tenantVisibilityError).toBeInTheDocument()
      expect(tenantVisibilityError).toHaveTextContent(/remove invalid tenant selections: ten-legacy/i)
    })
  })

  it('does not render when user is null', () => {
    renderDrawer({ user: null })
    expect(
      screen.queryByRole('heading', { name: /edit user/i }),
    ).not.toBeInTheDocument()
  })
})
