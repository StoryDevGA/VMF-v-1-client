/**
 * CreateUserWizard Tests
 *
 * Covers:
 * - Wizard renders step 1 (name/email) when open
 * - Validation errors on empty fields
 * - Step navigation (next/back)
 * - Role selection on step 2
 * - Review step displays entered data
 * - Closes wizard on cancel
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
import { useTenantContext } from '../../hooks/useTenantContext.js'
import CreateUserWizard from './CreateUserWizard'
import { useCreateUserMutation } from '../../store/api/userApi.js'

vi.mock('../../store/api/userApi.js', () => ({
  useCreateUserMutation: vi.fn(),
}))

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: vi.fn(),
}))

const getTenantContextMockValue = (overrides = {}) => ({
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
})

let createUserMock

// Mock HTMLDialogElement methods (JSDOM does not support <dialog>)
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.open = false
  })
})

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
function renderWizard(props = {}) {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    customerId: 'cust-1',
    ...props,
  }
  const store = createTestStore()

  return {
    ...render(
      <Provider store={store}>
        <ToasterProvider>
          <MemoryRouter>
            <CreateUserWizard {...defaultProps} />
          </MemoryRouter>
        </ToasterProvider>
      </Provider>,
    ),
    onClose: defaultProps.onClose,
  }
}

async function completeWizardToReview(user, values = {}) {
  const name = values.name ?? 'Jane Doe'
  const email = values.email ?? 'jane@acme.com'
  const roleLabel = values.roleLabel ?? /^user$/i
  const tenantLabel = values.tenantLabel ?? null

  await user.type(screen.getByLabelText(/full name/i), name)
  await user.type(screen.getByLabelText(/email address/i), email)
  await user.click(screen.getByRole('button', { name: /next/i }))

  await waitFor(() => screen.getByText(/step 2 of 4/i))
  await user.click(screen.getByLabelText(roleLabel))
  await user.click(screen.getByRole('button', { name: /next/i }))

  await waitFor(() => screen.getByText(/step 3 of 4/i))
  if (tenantLabel) {
    await user.click(screen.getByLabelText(tenantLabel))
  }
  await user.click(screen.getByRole('button', { name: /next/i }))

  await waitFor(() => screen.getByText(/step 4 of 4/i))
}

describe('CreateUserWizard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    createUserMock = vi.fn(() => ({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          outcome: 'invited_new',
          invitationDispatched: true,
          invitationOutcome: 'sent',
        },
      }),
    }))
    useCreateUserMutation.mockReturnValue([createUserMock, { isLoading: false }])
    useTenantContext.mockReturnValue(getTenantContextMockValue())
  })

  it('renders step 1 heading when open', () => {
    renderWizard()
    expect(
      screen.getByRole('heading', { name: /create user/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
  })

  it('renders name and email inputs on step 1', () => {
    renderWizard()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  })

  it('shows validation errors when Next is clicked with empty fields', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('shows email validation error for invalid format', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/enter a valid email address/i),
      ).toBeInTheDocument()
    })
  })

  it('navigates to step 2 when valid data is entered', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email address/i), 'jane@acme.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument()
      expect(screen.getByText(/select roles/i)).toBeInTheDocument()
    })
  })

  it('shows role checkboxes on step 2', async () => {
    const user = userEvent.setup()
    renderWizard()

    // Fill step 1 and advance
    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email address/i), 'jane@acme.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/tenant admin/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^user$/i)).toBeInTheDocument()
      expect(screen.queryByLabelText(/customer admin/i)).not.toBeInTheDocument()
      expect(
        screen.getByText(/customer admin ownership is transferred separately/i),
      ).toBeInTheDocument()
    })
  })

  it('shows validation error when no role is selected on step 2', async () => {
    const user = userEvent.setup()
    renderWizard()

    // Fill step 1 and advance
    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email address/i), 'jane@acme.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Try to advance without selecting a role
    await waitFor(() => screen.getByText(/step 2 of 4/i))
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/select at least one role/i),
      ).toBeInTheDocument()
    })
  })

  it('navigates back from step 2 to step 1', async () => {
    const user = userEvent.setup()
    renderWizard()

    // Fill step 1 and advance
    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email address/i), 'jane@acme.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => screen.getByText(/step 2 of 4/i))
    await user.click(screen.getByRole('button', { name: /back/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
    })
  })

  it('reaches review step and shows summary', async () => {
    const user = userEvent.setup()
    renderWizard()

    // Step 1
    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email address/i), 'jane@acme.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 2 — select USER role
    await waitFor(() => screen.getByText(/step 2 of 4/i))
    await user.click(screen.getByLabelText(/^user$/i))
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 3 — tenant visibility (skip)
    await waitFor(() => screen.getByText(/step 3 of 4/i))
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 4 — review
    await waitFor(() => {
      expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument()
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      expect(screen.getByText('jane@acme.com')).toBeInTheDocument()
      expect(screen.getByText(/USER/)).toBeInTheDocument()
      expect(
        screen.getByText(/no explicit tenant visibility selected/i),
      ).toBeInTheDocument()
    })
  })

  it('renders guided tenant selection instead of placeholder copy', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email address/i), 'jane@acme.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => screen.getByText(/step 2 of 4/i))
    await user.click(screen.getByLabelText(/^user$/i))
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument()
      expect(
        screen.getByText(/select the tenants this user should be able to access/i),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /select all available/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/north hub/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/south hub/i)).toBeInTheDocument()
      expect(
        screen.queryByText(/tenant selection will be available when the customer has multiple tenants/i),
      ).not.toBeInTheDocument()
    })
  })

  it('submits selected tenant visibility ids and shows tenant names in review', async () => {
    const user = userEvent.setup()
    renderWizard()

    await completeWizardToReview(user, { tenantLabel: /north hub/i })

    await waitFor(() => {
      expect(screen.getByText(/north hub/i)).toBeInTheDocument()
      expect(screen.queryByText(/no explicit tenant visibility selected/i)).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => {
      expect(createUserMock).toHaveBeenCalledWith({
        customerId: 'cust-1',
        body: {
          name: 'Jane Doe',
          email: 'jane@acme.com',
          roles: ['USER'],
          tenantVisibility: ['ten-1'],
        },
      })
    })
  })

  it('selects all available tenant-visibility entries from the guided toolbar', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email address/i), 'jane@acme.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => screen.getByText(/step 2 of 4/i))
    await user.click(screen.getByLabelText(/^user$/i))
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => screen.getByText(/step 3 of 4/i))
    await user.click(screen.getByRole('button', { name: /select all available/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument()
      expect(screen.getByText(/north hub, south hub/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => {
      expect(createUserMock).toHaveBeenCalledWith({
        customerId: 'cust-1',
        body: {
          name: 'Jane Doe',
          email: 'jane@acme.com',
          roles: ['USER'],
          tenantVisibility: ['ten-1', 'ten-2'],
        },
      })
    })
  })

  it('hides the tenant-visibility step when the topology does not allow it', async () => {
    const user = userEvent.setup()
    useTenantContext.mockReturnValue(
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
    renderWizard()

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email address/i), 'jane@acme.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument()
      expect(screen.queryByLabelText(/tenant admin/i)).not.toBeInTheDocument()
      expect(screen.getByLabelText(/^user$/i)).toBeInTheDocument()
      expect(
        screen.getByText(/tenant admin is only available for multi-tenant customers/i),
      ).toBeInTheDocument()
    })
    await user.click(screen.getByLabelText(/^user$/i))
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument()
      expect(screen.queryByText(/^tenant visibility$/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/not required for this customer topology/i)).not.toBeInTheDocument()
    })
  })

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderWizard()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('branches success UX using data.outcome=assigned_existing', async () => {
    const user = userEvent.setup()
    const createUser = vi.fn(() => ({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          outcome: 'assigned_existing',
          invitationDispatched: false,
          invitationOutcome: 'none',
        },
      }),
    }))
    useCreateUserMutation.mockReturnValue([createUser, { isLoading: false }])
    const { onClose } = renderWizard()

    await completeWizardToReview(user)
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(
        screen.getByText(/existing user assigned to this customer/i),
      ).toBeInTheDocument()
    })
  })

  it('shows warning messaging for invited_new with invitationOutcome=send_failed', async () => {
    const user = userEvent.setup()
    const createUser = vi.fn(() => ({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          outcome: 'invited_new',
          invitationDispatched: true,
          invitationOutcome: 'send_failed',
        },
      }),
    }))
    useCreateUserMutation.mockReturnValue([createUser, { isLoading: false }])
    const { onClose } = renderWizard()

    await completeWizardToReview(user)
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(
        screen.getByText(/invitation email delivery failed/i),
      ).toBeInTheDocument()
    })
  })

  it('maps USER_ALREADY_EXISTS using error.details.reason and existingUserId', async () => {
    const user = userEvent.setup()
    const createUser = vi.fn(() => ({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'USER_ALREADY_EXISTS',
            message: 'Generic conflict message from server',
            requestId: 'req-user-exists-1',
            details: {
              reason: 'already-in-customer',
              existingUserId: 'usr-123',
            },
          },
        },
      }),
    }))
    useCreateUserMutation.mockReturnValue([createUser, { isLoading: false }])
    const { onClose } = renderWizard()

    await completeWizardToReview(user)
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => {
      expect(onClose).not.toHaveBeenCalled()
      expect(
        screen.getByText(
          /already exists in this customer \(user id: usr-123\)/i,
          { selector: '#create-user-email-error' },
        ),
      ).toBeInTheDocument()
    })
  })

  it('maps USER_CUSTOMER_CONFLICT using error.details.reason=other-customer', async () => {
    const user = userEvent.setup()
    const createUser = vi.fn(() => ({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'USER_CUSTOMER_CONFLICT',
            message: 'Generic conflict message from server',
            requestId: 'req-user-conflict-1',
            details: {
              reason: 'other-customer',
            },
          },
        },
      }),
    }))
    useCreateUserMutation.mockReturnValue([createUser, { isLoading: false }])
    const { onClose } = renderWizard()

    await completeWizardToReview(user)
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => {
      expect(onClose).not.toHaveBeenCalled()
      expect(
        screen.getByText(
          /belongs to another customer and cannot be assigned to this customer/i,
          { selector: '#create-user-email-error' },
        ),
      ).toBeInTheDocument()
    })
  })

  it('routes tenant-visibility validation failures back to the tenant step', async () => {
    const user = userEvent.setup()
    const createUser = vi.fn(() => ({
      unwrap: vi.fn().mockRejectedValue({
        status: 422,
        data: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Generic validation failure',
            requestId: 'req-tenant-visibility-1',
            details: {
              reason: 'TENANT_VISIBILITY_INVALID_TENANT_IDS',
              invalidTenantIds: ['ten-1'],
            },
          },
        },
      }),
    }))
    useCreateUserMutation.mockReturnValue([createUser, { isLoading: false }])

    renderWizard()

    await completeWizardToReview(user, { tenantLabel: /north hub/i })
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument()
      expect(
        screen.getByText(/one or more tenant selections are no longer valid/i, {
          selector: '.create-wizard__error',
        }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/remove invalid tenant selections: ten-1/i, {
          selector: '.create-wizard__error',
        }),
      ).toBeInTheDocument()
    })
  })

  it('does not render when open is false', () => {
    renderWizard({ open: false })
    expect(
      screen.queryByRole('heading', { name: /create user/i }),
    ).not.toBeInTheDocument()
  })
})
