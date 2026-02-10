/**
 * ProtectedRoute Tests
 *
 * Covers:
 * - Shows spinner while auth status is loading/idle
 * - Redirects to login when unauthenticated
 * - Renders outlet when authenticated
 * - Enforces optional requiredRole
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import { ProtectedRoute } from './ProtectedRoute'

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

function renderProtected({ authState, requiredRole } = {}) {
  const store = createTestStore({
    auth: authState ?? { user: null, status: 'idle' },
  })

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute
                redirectTo="/login"
                requiredRole={requiredRole}
              />
            }
          >
            <Route index element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/app/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('shows spinner when status is idle', () => {
    renderProtected({ authState: { user: null, status: 'idle' } })
    expect(screen.getByText(/verifying session/i)).toBeInTheDocument()
  })

  it('shows spinner when status is loading', () => {
    renderProtected({ authState: { user: null, status: 'loading' } })
    expect(screen.getByText(/verifying session/i)).toBeInTheDocument()
  })

  it('redirects to login when unauthenticated', () => {
    renderProtected({
      authState: { user: null, status: 'unauthenticated' },
    })
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('renders child route when authenticated', () => {
    renderProtected({
      authState: {
        user: { id: '1', email: 'a@b.com', name: 'A', roles: ['USER'] },
        status: 'authenticated',
      },
    })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects when requiredRole is not met', () => {
    renderProtected({
      authState: {
        user: { id: '1', email: 'a@b.com', name: 'A', roles: ['USER'] },
        status: 'authenticated',
      },
      requiredRole: 'SUPER_ADMIN',
    })
    // Falls back to /app/dashboard when role not met
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders child route when requiredRole is satisfied', () => {
    renderProtected({
      authState: {
        user: {
          id: '1',
          email: 'sa@b.com',
          name: 'SA',
          roles: ['SUPER_ADMIN'],
        },
        status: 'authenticated',
      },
      requiredRole: 'SUPER_ADMIN',
    })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
