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
import CreateUserWizard from './CreateUserWizard'
import { useCreateUserMutation } from '../../store/api/userApi.js'

vi.mock('../../store/api/userApi.js', () => ({
  useCreateUserMutation: vi.fn(),
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

  await user.type(screen.getByLabelText(/full name/i), name)
  await user.type(screen.getByLabelText(/email address/i), email)
  await user.click(screen.getByRole('button', { name: /next/i }))

  await waitFor(() => screen.getByText(/step 2 of 4/i))
  await user.click(screen.getByLabelText(roleLabel))
  await user.click(screen.getByRole('button', { name: /next/i }))

  await waitFor(() => screen.getByText(/step 3 of 4/i))
  await user.click(screen.getByRole('button', { name: /next/i }))

  await waitFor(() => screen.getByText(/step 4 of 4/i))
}

describe('CreateUserWizard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    const createUser = vi.fn(() => ({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          outcome: 'invited_new',
          invitationDispatched: true,
          invitationOutcome: 'sent',
        },
      }),
    }))
    useCreateUserMutation.mockReturnValue([createUser, { isLoading: false }])
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

  it('does not render when open is false', () => {
    renderWizard({ open: false })
    expect(
      screen.queryByRole('heading', { name: /create user/i }),
    ).not.toBeInTheDocument()
  })
})
