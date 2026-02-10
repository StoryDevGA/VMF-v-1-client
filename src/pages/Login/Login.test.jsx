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
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
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

  it('renders the brand logo', () => {
    renderLogin()
    expect(screen.getByRole('img', { name: /storylineos logo/i })).toBeInTheDocument()
  })
})
