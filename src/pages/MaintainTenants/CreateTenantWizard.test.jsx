/**
 * CreateTenantWizard Tests
 *
 * Covers:
 * - Wizard renders step 1 (name/website) when open
 * - Validation errors on empty fields
 * - Step navigation (next/back)
 * - UserSearchSelect renders on step 2
 * - Validation: at least one admin required on step 2
 * - Review step displays entered data
 * - Governance limit conflict warning on create
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
import CreateTenantWizard from './CreateTenantWizard'

const createTenantMutationMock = vi.fn()

vi.mock('../../store/api/tenantApi.js', () => ({
  useCreateTenantMutation: () => [createTenantMutationMock, { isLoading: false }],
}))

vi.mock('../../components/UserSearchSelect', () => {
  function MockUserSearchSelect({ label, onChange, error, disabled }) {
    return (
      <div>
        <label htmlFor="mock-user-search">{label}</label>
        <input
          id="mock-user-search"
          role="combobox"
          placeholder="Search by name or email..."
          disabled={disabled}
          onChange={() => {}}
        />
        <button
          type="button"
          onClick={() => onChange(['admin-user-1'])}
          disabled={disabled}
        >
          Add Mock Admin
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

// Mock HTMLDialogElement methods (JSDOM does not support <dialog>)
beforeEach(() => {
  createTenantMutationMock.mockReset()
  createTenantMutationMock.mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({ data: { _id: 'tenant-1' } }),
  })

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
    tenantCapacity: null,
    ...props,
  }
  const store = createTestStore()

  return {
    ...render(
      <Provider store={store}>
        <ToasterProvider>
          <MemoryRouter>
            <CreateTenantWizard {...defaultProps} />
          </MemoryRouter>
        </ToasterProvider>
      </Provider>,
    ),
    onClose: defaultProps.onClose,
  }
}

/** Helper: navigate to step 2 with valid step 1 data */
async function goToStep2(user) {
  await user.type(screen.getByLabelText(/tenant name/i), 'Test Tenant')
  await user.type(screen.getByLabelText(/website url/i), 'https://test.com')
  await user.click(screen.getByRole('button', { name: /next/i }))
  await waitFor(() => {
    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument()
  })
}

/** Helper: navigate to review step */
async function goToStep3(user) {
  await goToStep2(user)
  await user.click(screen.getByRole('button', { name: /add mock admin/i }))
  await user.click(screen.getByRole('button', { name: /next/i }))
  await waitFor(() => {
    expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument()
  })
}

describe('CreateTenantWizard', () => {
  it('renders step 1 heading when open', () => {
    renderWizard()
    expect(
      screen.getByRole('heading', { name: /create tenant/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument()
  })

  it('renders name and website inputs on step 1', () => {
    renderWizard()
    expect(screen.getByLabelText(/tenant name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/website url/i)).toBeInTheDocument()
  })

  it('shows validation errors when Next is clicked with empty fields', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/website is required/i)).toBeInTheDocument()
    })
  })

  it('shows URL validation error for invalid format', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(screen.getByLabelText(/tenant name/i), 'Acme Tenant')
    await user.type(screen.getByLabelText(/website url/i), 'not-a-url')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/enter a valid url/i)).toBeInTheDocument()
    })
  })

  it('navigates to step 2 with valid inputs', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(screen.getByLabelText(/tenant name/i), 'Acme Tenant')
    await user.type(screen.getByLabelText(/website url/i), 'https://acme.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument()
      expect(screen.getByText(/assign tenant admins/i)).toBeInTheDocument()
    })
  })

  it('renders UserSearchSelect with combobox on step 2', async () => {
    const user = userEvent.setup()
    renderWizard()
    await goToStep2(user)

    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search by name or email/i)).toBeInTheDocument()
    expect(screen.getByText(/search users by name or email/i)).toBeInTheDocument()
  })

  it('shows validation error when no admins selected on Next', async () => {
    const user = userEvent.setup()
    renderWizard()
    await goToStep2(user)

    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/at least one tenant admin/i)).toBeInTheDocument()
    })
  })

  it('navigates back from step 2 to step 1', async () => {
    const user = userEvent.setup()
    renderWizard()
    await goToStep2(user)

    await user.click(screen.getByRole('button', { name: /back/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument()
    })
  })

  it('shows review step heading and step indicator', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(screen.getByLabelText(/tenant name/i), 'Review Tenant')
    await user.type(screen.getByLabelText(/website url/i), 'https://review.com')
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /add mock admin/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument()
      expect(screen.getByText(/review details/i)).toBeInTheDocument()
      expect(screen.getByText('Review Tenant')).toBeInTheDocument()
      expect(screen.getByText('https://review.com')).toBeInTheDocument()
    })
  })

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderWizard()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows governance warning toast when tenant limit is reached', async () => {
    const user = userEvent.setup()
    createTenantMutationMock.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'CONFLICT',
            message: 'This action conflicts with the current state of the resource.',
            details: {
              reason: 'TENANT_LIMIT_REACHED',
              limit: 3,
              currentCount: 3,
            },
          },
        },
      }),
    })

    renderWizard()
    await goToStep3(user)
    await user.click(screen.getByRole('button', { name: /create tenant/i }))

    await waitFor(() => {
      expect(createTenantMutationMock).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/^Tenant limit reached$/i)).toBeInTheDocument()
      expect(
        screen.getByText(/tenant limit reached for this customer\. \(3\/3 in use\)\./i),
      ).toBeInTheDocument()
    })

    expect(screen.queryByText(/failed to create tenant/i)).not.toBeInTheDocument()
  })

  it('shows tenant-capacity guidance and blocks progression when the customer is at capacity', () => {
    renderWizard({
      tenantCapacity: {
        maxTenants: 3,
        currentCount: 3,
        remainingCount: 0,
        isAtCapacity: true,
        countMode: 'NON_ARCHIVED',
      },
    })

    expect(
      screen.getByText(/this customer is already using 3 of 3 non-archived tenant slots/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('returns to tenant-admin selection with contract-based guidance when admin assignments are invalid', async () => {
    const user = userEvent.setup()
    createTenantMutationMock.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 422,
        data: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Please check the form for errors.',
            requestId: 'tenant-admin-create-1',
            details: {
              reason: 'TENANT_ADMIN_ASSIGNMENTS_INVALID',
              invalidTenantAdminUserIds: ['missing-admin-1', 'inactive-admin-2'],
              missingTenantAdminUserIds: ['missing-admin-1'],
              inactiveTenantAdminUserIds: ['inactive-admin-2'],
            },
          },
        },
      }),
    })

    renderWizard()
    await goToStep3(user)
    await user.click(screen.getByRole('button', { name: /create tenant/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument()
      expect(
        screen.getAllByText(/remove stale tenant-admin selections and search again: missing-admin-1/i).length,
      ).toBeGreaterThan(0)
      expect(
        screen.getAllByText(/replace inactive tenant admins before continuing: inactive-admin-2/i).length,
      ).toBeGreaterThan(0)
      expect(screen.getAllByText(/\(Ref: tenant-admin-create-1\)/i).length).toBeGreaterThan(0)
    })
  })
})
