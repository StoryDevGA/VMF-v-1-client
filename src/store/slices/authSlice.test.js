/**
 * Auth Slice Tests
 *
 * Covers:
 * - Initial state shape
 * - setCredentials
 * - clearCredentials
 * - tokenRefreshed (no-op)
 * - setLoading
 * - Selectors
 */

import { describe, it, expect } from 'vitest'
import authReducer, {
  setCredentials,
  clearCredentials,
  tokenRefreshed,
  setLoading,
  selectCurrentUser,
  selectCustomerScopes,
  selectAuthStatus,
  selectIsAuthenticated,
  selectResolvedPermissions,
} from './authSlice.js'

const mockUser = {
  id: 'u-1',
  email: 'admin@example.com',
  name: 'Admin',
  roles: ['SUPER_ADMIN'],
}

const mockCustomerScopes = [
  {
    customerId: 'cust-1',
    featureEntitlements: ['VMF', 'DEALS'],
    entitlementSource: 'LICENSE_LEVEL',
  },
]

const mockResolvedPermissions = {
  platform: { roleKeys: ['SUPER_ADMIN'], permissions: ['PLATFORM_MANAGE'] },
  customers: [
    { customerId: 'cust-1', roleKeys: ['CUSTOMER_ADMIN'], permissions: ['CUSTOMER_VIEW', 'VMF_VIEW', 'VMF_CREATE'] },
  ],
  tenants: [
    { customerId: 'cust-1', tenantId: 'tenant-1', roleKeys: ['TENANT_ADMIN'], permissions: ['TENANT_VIEW', 'VMF_VIEW', 'VMF_CREATE'] },
  ],
}

describe('authSlice', () => {
  /* ---------- Reducer ---------- */

  describe('reducer', () => {
    it('should return the initial state', () => {
      const state = authReducer(undefined, { type: '@@INIT' })
      expect(state).toEqual({ user: null, customerScopes: [], resolvedPermissions: null, status: 'idle' })
    })

    it('should handle setCredentials', () => {
      const state = authReducer(
        undefined,
        setCredentials({ user: mockUser, customerScopes: mockCustomerScopes }),
      )
      expect(state.user).toEqual(mockUser)
      expect(state.customerScopes).toEqual(mockCustomerScopes)
      expect(state.status).toBe('authenticated')
    })

    it('should store resolvedPermissions from setCredentials', () => {
      const state = authReducer(
        undefined,
        setCredentials({ user: mockUser, customerScopes: mockCustomerScopes, resolvedPermissions: mockResolvedPermissions }),
      )
      expect(state.resolvedPermissions).toEqual(mockResolvedPermissions)
    })

    it('should default resolvedPermissions to null when omitted from setCredentials', () => {
      const state = authReducer(
        undefined,
        setCredentials({ user: mockUser, customerScopes: mockCustomerScopes }),
      )
      expect(state.resolvedPermissions).toBeNull()
    })

    it('should default customerScopes to an empty array when omitted', () => {
      const state = authReducer(undefined, setCredentials({ user: mockUser }))
      expect(state.customerScopes).toEqual([])
    })

    it('should handle clearCredentials', () => {
      const authed = authReducer(
        undefined,
        setCredentials({ user: mockUser, resolvedPermissions: mockResolvedPermissions }),
      )
      const state = authReducer(authed, clearCredentials())
      expect(state.user).toBeNull()
      expect(state.customerScopes).toEqual([])
      expect(state.resolvedPermissions).toBeNull()
      expect(state.status).toBe('unauthenticated')
    })

    it('should handle tokenRefreshed without changing state', () => {
      const authed = authReducer(undefined, setCredentials({ user: mockUser }))
      const state = authReducer(authed, tokenRefreshed())
      expect(state.user).toEqual(mockUser)
      expect(state.status).toBe('authenticated')
    })

    it('should handle setLoading', () => {
      const state = authReducer(undefined, setLoading())
      expect(state.status).toBe('loading')
    })
  })

  /* ---------- Selectors ---------- */

  describe('selectors', () => {
    const rootAuthenticated = {
      auth: { user: mockUser, customerScopes: mockCustomerScopes, resolvedPermissions: mockResolvedPermissions, status: 'authenticated' },
    }
    const rootIdle = {
      auth: { user: null, customerScopes: [], resolvedPermissions: null, status: 'idle' },
    }

    it('selectCurrentUser returns the user', () => {
      expect(selectCurrentUser(rootAuthenticated)).toEqual(mockUser)
    })

    it('selectCurrentUser returns null when not authenticated', () => {
      expect(selectCurrentUser(rootIdle)).toBeNull()
    })

    it('selectCustomerScopes returns customer scopes', () => {
      expect(selectCustomerScopes(rootAuthenticated)).toEqual(mockCustomerScopes)
    })

    it('selectCustomerScopes returns empty array when missing', () => {
      expect(selectCustomerScopes({ auth: {} })).toEqual([])
    })

    it('selectCustomerScopes returns a stable empty-array reference when missing', () => {
      const state = { auth: {} }
      const first = selectCustomerScopes(state)
      const second = selectCustomerScopes(state)

      expect(first).toBe(second)
    })

    it('selectAuthStatus returns the status', () => {
      expect(selectAuthStatus(rootAuthenticated)).toBe('authenticated')
    })

    it('selectIsAuthenticated returns true when authenticated', () => {
      expect(selectIsAuthenticated(rootAuthenticated)).toBe(true)
    })

    it('selectIsAuthenticated returns false when idle', () => {
      expect(selectIsAuthenticated(rootIdle)).toBe(false)
    })

    it('selectResolvedPermissions returns the resolved permissions', () => {
      expect(selectResolvedPermissions(rootAuthenticated)).toEqual(mockResolvedPermissions)
    })

    it('selectResolvedPermissions returns null when not set', () => {
      expect(selectResolvedPermissions(rootIdle)).toBeNull()
    })
  })
})
