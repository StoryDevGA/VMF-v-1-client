/**
 * CreateTenantWizard Tests
 *
 * Covers:
 * - Wizard renders step 1 (name/website) when open
 * - Validation errors on empty fields
 * - Step navigation (next/back)
 * - Admin user ID management (add/remove)
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
import CreateTenantWizard from './CreateTenantWizard'

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
            <CreateTenantWizard {...defaultProps} />
          </MemoryRouter>
        </ToasterProvider>
      </Provider>,
    ),
    onClose: defaultProps.onClose,
  }
}

describe('CreateTenantWizard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

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
      expect(screen.getByText(/tenant admin user ids/i)).toBeInTheDocument()
    })
  })

  it('validates admin user ID format before adding', async () => {
    const user = userEvent.setup()
    renderWizard()

    // Navigate to step 2
    await user.type(screen.getByLabelText(/tenant name/i), 'Test Tenant')
    await user.type(screen.getByLabelText(/website url/i), 'https://test.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument()
    })

    // Type invalid ID and click Add
    await user.type(screen.getByLabelText(/user id/i), 'bad-id')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(screen.getByText(/valid user id/i)).toBeInTheDocument()
    })
  })

  it('adds a valid admin user ID to the list', async () => {
    const user = userEvent.setup()
    renderWizard()

    // Navigate to step 2
    await user.type(screen.getByLabelText(/tenant name/i), 'Test Tenant')
    await user.type(screen.getByLabelText(/website url/i), 'https://test.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument()
    })

    // Add a valid ObjectId
    const validId = '507f1f77bcf86cd799439011'
    await user.type(screen.getByLabelText(/user id/i), validId)
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(screen.getByText(validId)).toBeInTheDocument()
    })
  })

  it('navigates back from step 2 to step 1', async () => {
    const user = userEvent.setup()
    renderWizard()

    // Navigate to step 2
    await user.type(screen.getByLabelText(/tenant name/i), 'Test Tenant')
    await user.type(screen.getByLabelText(/website url/i), 'https://test.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument()
    })

    // Go back
    await user.click(screen.getByRole('button', { name: /back/i }))

    await waitFor(() => {
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument()
    })
  })

  it('shows review step with entered data', async () => {
    const user = userEvent.setup()
    renderWizard()

    // Step 1
    await user.type(screen.getByLabelText(/tenant name/i), 'Review Tenant')
    await user.type(screen.getByLabelText(/website url/i), 'https://review.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 2 — add an admin
    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument()
    })

    const validId = '507f1f77bcf86cd799439011'
    await user.type(screen.getByLabelText(/user id/i), validId)
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(screen.getByText(validId)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 3 — review
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
})
