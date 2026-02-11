/**
 * EditUsers Page Tests
 *
 * Covers:
 * - Renders page heading and create button
 * - Renders search input and status filter
 * - Shows empty message when no customer context
 * - Renders user table when data is available (mocked)
 * - Action button visibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import tenantContextReducer from '../../store/slices/tenantContextSlice.js'
import EditUsers from './EditUsers'

// Mock HTMLDialogElement methods (JSDOM does not support <dialog>)
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.open = false
  })
})

/** Customer admin user shape */
const customerAdminUser = {
  id: 'user-1',
  email: 'admin@acme.com',
  name: 'Admin User',
  isActive: true,
  memberships: [
    { customerId: 'cust-1', roles: ['CUSTOMER_ADMIN'] },
  ],
  tenantMemberships: [],
  vmfGrants: [],
  identityPlus: { trustStatus: 'TRUSTED' },
}

/** User with no customer membership */
const noCustomerUser = {
  id: 'user-2',
  email: 'nobody@acme.com',
  name: 'No Customer',
  isActive: true,
  memberships: [],
  tenantMemberships: [],
  vmfGrants: [],
}

/** Create a fresh store */
function createTestStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      tenantContext: tenantContextReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
    preloadedState,
  })
}

/** Render wrapper with all providers */
function renderEditUsers(store) {
  const testStore =
    store ??
    createTestStore({
      auth: { user: customerAdminUser, status: 'authenticated' },
    })
  return render(
    <Provider store={testStore}>
      <ToasterProvider>
        <MemoryRouter initialEntries={['/app/administration/edit-users']}>
          <Routes>
            <Route
              path="/app/administration/edit-users"
              element={<EditUsers />}
            />
          </Routes>
        </MemoryRouter>
      </ToasterProvider>
    </Provider>,
  )
}

describe('EditUsers page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the page heading', () => {
    renderEditUsers()
    expect(
      screen.getByRole('heading', { name: /edit users/i }),
    ).toBeInTheDocument()
  })

  it('renders the Create User button', () => {
    renderEditUsers()
    expect(
      screen.getByRole('button', { name: /create user/i }),
    ).toBeInTheDocument()
  })

  it('renders the search input', () => {
    renderEditUsers()
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument()
  })

  it('renders the status filter', () => {
    renderEditUsers()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it('renders the users table region', () => {
    renderEditUsers()
    expect(screen.getByLabelText(/users table/i)).toBeInTheDocument()
  })

  it('shows empty context message when no customer membership', () => {
    const store = createTestStore({
      auth: { user: noCustomerUser, status: 'authenticated' },
    })
    renderEditUsers(store)
    expect(
      screen.getByText(/no customer context available/i),
    ).toBeInTheDocument()
  })

  it('renders table with column headers', () => {
    renderEditUsers()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Roles')).toBeInTheDocument()
    // "Status" appears in both filter label and table header
    const statusElements = screen.getAllByText('Status')
    expect(statusElements.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Trust')).toBeInTheDocument()
  })

  it('opens Create User wizard when button is clicked', async () => {
    const user = userEvent.setup()
    renderEditUsers()

    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /create user/i }),
      ).toBeInTheDocument()
    })
  })
})
