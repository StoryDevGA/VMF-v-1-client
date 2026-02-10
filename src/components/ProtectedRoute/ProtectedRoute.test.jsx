/**
 * ProtectedRoute Tests
 *
 * Covers:
 * - Shows spinner while auth status is loading/idle
 * - Redirects to login when unauthenticated
 * - Renders outlet when authenticated
 * - Enforces requiredRole (legacy, backward-compat)
 * - Enforces requiredPlatformRole
 * - Enforces requiredCustomerRole
 * - Enforces requiredTenantRole
 * - Custom unauthorizedRedirect
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import { ProtectedRoute } from './ProtectedRoute'

/* ------------------------------------------------------------------ */
/*  Test data (real hierarchical user shapes)                         */
/* ------------------------------------------------------------------ */

const CUSTOMER_ID = '607f1f77bcf86cd799439022'
const TENANT_ID = '707f1f77bcf86cd799439044'

const regularUser = {
  id: '1',
  email: 'user@b.com',
  name: 'User',
  isActive: true,
  memberships: [{ customerId: CUSTOMER_ID, roles: ['USER'] }],
  tenantMemberships: [
    { customerId: CUSTOMER_ID, tenantId: TENANT_ID, roles: ['USER'] },
  ],
  vmfGrants: [],
}

const superAdminUser = {
  id: '2',
  email: 'sa@b.com',
  name: 'Super Admin',
  isActive: true,
  memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
  tenantMemberships: [],
  vmfGrants: [],
}

const customerAdminUser = {
  id: '3',
  email: 'ca@b.com',
  name: 'Customer Admin',
  isActive: true,
  memberships: [{ customerId: CUSTOMER_ID, roles: ['CUSTOMER_ADMIN'] }],
  tenantMemberships: [],
  vmfGrants: [],
}

const tenantAdminUser = {
  id: '4',
  email: 'ta@b.com',
  name: 'Tenant Admin',
  isActive: true,
  memberships: [{ customerId: CUSTOMER_ID, roles: ['USER'] }],
  tenantMemberships: [
    { customerId: CUSTOMER_ID, tenantId: TENANT_ID, roles: ['TENANT_ADMIN'] },
  ],
  vmfGrants: [],
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

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

function renderProtected({
  authState,
  requiredRole,
  requiredPlatformRole,
  requiredCustomerRole,
  requiredTenantRole,
  unauthorizedRedirect,
} = {}) {
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
                requiredPlatformRole={requiredPlatformRole}
                requiredCustomerRole={requiredCustomerRole}
                requiredTenantRole={requiredTenantRole}
                unauthorizedRedirect={unauthorizedRedirect}
              />
            }
          >
            <Route index element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/app/dashboard" element={<div>Dashboard</div>} />
          <Route path="/forbidden" element={<div>Forbidden Page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

/* ================================================================== */
/*  Tests                                                             */
/* ================================================================== */

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
      authState: { user: regularUser, status: 'authenticated' },
    })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  // --- requiredRole (legacy backward-compat) ---

  it('redirects when requiredRole is not met', () => {
    renderProtected({
      authState: { user: regularUser, status: 'authenticated' },
      requiredRole: 'SUPER_ADMIN',
    })
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders child route when requiredRole is satisfied', () => {
    renderProtected({
      authState: { user: superAdminUser, status: 'authenticated' },
      requiredRole: 'SUPER_ADMIN',
    })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  // --- requiredPlatformRole ---

  it('redirects when requiredPlatformRole is not met', () => {
    renderProtected({
      authState: { user: regularUser, status: 'authenticated' },
      requiredPlatformRole: 'SUPER_ADMIN',
    })
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders when requiredPlatformRole is satisfied', () => {
    renderProtected({
      authState: { user: superAdminUser, status: 'authenticated' },
      requiredPlatformRole: 'SUPER_ADMIN',
    })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  // --- requiredCustomerRole ---

  it('redirects when requiredCustomerRole is not met', () => {
    renderProtected({
      authState: { user: regularUser, status: 'authenticated' },
      requiredCustomerRole: { customerId: CUSTOMER_ID, role: 'CUSTOMER_ADMIN' },
    })
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders when requiredCustomerRole is satisfied', () => {
    renderProtected({
      authState: { user: customerAdminUser, status: 'authenticated' },
      requiredCustomerRole: { customerId: CUSTOMER_ID, role: 'CUSTOMER_ADMIN' },
    })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  // --- requiredTenantRole ---

  it('redirects when requiredTenantRole is not met', () => {
    renderProtected({
      authState: { user: regularUser, status: 'authenticated' },
      requiredTenantRole: {
        customerId: CUSTOMER_ID,
        tenantId: TENANT_ID,
        role: 'TENANT_ADMIN',
      },
    })
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders when requiredTenantRole is satisfied', () => {
    renderProtected({
      authState: { user: tenantAdminUser, status: 'authenticated' },
      requiredTenantRole: {
        customerId: CUSTOMER_ID,
        tenantId: TENANT_ID,
        role: 'TENANT_ADMIN',
      },
    })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  // --- custom unauthorizedRedirect ---

  it('redirects to custom unauthorizedRedirect path', () => {
    renderProtected({
      authState: { user: regularUser, status: 'authenticated' },
      requiredPlatformRole: 'SUPER_ADMIN',
      unauthorizedRedirect: '/forbidden',
    })
    expect(screen.getByText('Forbidden Page')).toBeInTheDocument()
  })
})
