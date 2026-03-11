/**
 * UserEditDrawer Tests
 *
 * Covers:
 * - Renders user info (name, email) as read-only
 * - Displays user status and trust status
 * - Shows role checkboxes with current roles checked
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
  })

  it('renders the Edit User heading', () => {
    renderDrawer()
    expect(
      screen.getByRole('heading', { name: /edit user/i }),
    ).toBeInTheDocument()
  })

  it('displays user name as disabled input', () => {
    renderDrawer()
    const nameInput = screen.getByLabelText(/name/i)
    expect(nameInput).toBeInTheDocument()
    expect(nameInput).toBeDisabled()
    expect(nameInput).toHaveValue('Jane Doe')
  })

  it('displays user email as disabled input', () => {
    renderDrawer()
    const emailInput = screen.getByLabelText(/email/i)
    expect(emailInput).toBeInTheDocument()
    expect(emailInput).toBeDisabled()
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
    expect(screen.queryByLabelText(/customer admin/i)).not.toBeInTheDocument()
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

  it('does not render when user is null', () => {
    renderDrawer({ user: null })
    expect(
      screen.queryByRole('heading', { name: /edit user/i }),
    ).not.toBeInTheDocument()
  })
})
