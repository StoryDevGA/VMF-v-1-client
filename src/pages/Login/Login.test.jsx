/**
 * Login Page Tests
 *
 * Covers:
 * - Renders login form with email, password, submit button
 * - Shows validation errors for empty fields
 * - Redirects when already authenticated
 * - Displays link to super-admin login
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
import Login from './Login'

/** Create a fresh store for each test */
function createTestStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
    preloadedState,
  })
}

/** Render wrapper with providers */
function renderLogin(store) {
  const testStore = store ?? createTestStore()
  return render(
    <Provider store={testStore}>
      <ToasterProvider>
        <MemoryRouter initialEntries={['/app/login']}>
          <Routes>
            <Route path="/app/login" element={<Login />} />
            <Route path="/app/dashboard" element={<div>Dashboard</div>} />
            <Route
              path="/super-admin/dashboard"
              element={<div>Super Admin Dashboard</div>}
            />
            <Route path="/super-admin/login" element={<div>SA Login</div>} />
          </Routes>
        </MemoryRouter>
      </ToasterProvider>
    </Provider>,
  )
}

describe('Login page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the sign-in heading', () => {
    renderLogin()
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders email and password inputs', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i, { selector: 'input' })).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderLogin()

    const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' })
    const toggle = screen.getByRole('button', { name: /show password/i })

    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(toggle)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(toggle).toHaveAttribute('aria-label', 'Hide password')
  })

  it('renders the sign-in button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('renders the super admin login link', () => {
    renderLogin()
    const link = screen.getByRole('link', { name: /super admin login/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/super-admin/login')
  })

  it('redirects to dashboard when already authenticated', async () => {
    const store = createTestStore({
      auth: {
        user: { id: '1', email: 'a@b.com', name: 'A', roles: [] },
        status: 'authenticated',
      },
    })

    renderLogin(store)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  it('redirects super admins to the super-admin dashboard', async () => {
    const store = createTestStore({
      auth: {
        user: {
          id: 'sa-1',
          email: 'sa@example.com',
          name: 'Super Admin',
          memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
        },
        status: 'authenticated',
      },
    })

    renderLogin(store)

    await waitFor(() => {
      expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument()
    })
  })

  it('does not render the brand logo', () => {
    renderLogin()
    expect(screen.queryByRole('img', { name: /storylineos logo/i })).not.toBeInTheDocument()
  })
})
