/**
 * SuperAdminLogin Page Tests
 *
 * Covers:
 * - Renders the super-admin sign-in form
 * - Shows the "Platform Administration" badge
 * - Validation errors for empty fields
 * - Redirects when already authenticated
 * - Link back to customer login
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
import SuperAdminLogin from './SuperAdminLogin'

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

function renderSALogin(store) {
  const testStore = store ?? createTestStore()
  return render(
    <Provider store={testStore}>
      <ToasterProvider>
        <MemoryRouter initialEntries={['/super-admin/login']}>
          <Routes>
            <Route path="/super-admin/login" element={<SuperAdminLogin />} />
            <Route
              path="/app/dashboard"
              element={<div>Dashboard</div>}
            />
            <Route path="/app/login" element={<div>Customer Login</div>} />
          </Routes>
        </MemoryRouter>
      </ToasterProvider>
    </Provider>,
  )
}

describe('SuperAdminLogin page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the heading', () => {
    renderSALogin()
    expect(
      screen.getByRole('heading', { name: /super admin sign in/i }),
    ).toBeInTheDocument()
  })

  it('shows the platform administration badge', () => {
    renderSALogin()
    expect(screen.getByText(/platform administration/i)).toBeInTheDocument()
  })

  it('renders email and password inputs', () => {
    renderSALogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders the sign-in button', () => {
    renderSALogin()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup()
    renderSALogin()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('has a link to customer login', () => {
    renderSALogin()
    const link = screen.getByRole('link', { name: /customer login/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/app/login')
  })

  it('redirects to dashboard when already authenticated', async () => {
    const store = createTestStore({
      auth: {
        user: {
          id: '1',
          email: 'sa@example.com',
          name: 'SA',
          roles: ['SUPER_ADMIN'],
        },
        status: 'authenticated',
      },
    })

    renderSALogin(store)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })
})
