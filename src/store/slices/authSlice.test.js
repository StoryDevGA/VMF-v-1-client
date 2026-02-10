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
  selectAuthStatus,
  selectIsAuthenticated,
} from './authSlice.js'

const mockUser = {
  id: 'u-1',
  email: 'admin@example.com',
  name: 'Admin',
  roles: ['SUPER_ADMIN'],
}

describe('authSlice', () => {
  /* ---------- Reducer ---------- */

  describe('reducer', () => {
    it('should return the initial state', () => {
      const state = authReducer(undefined, { type: '@@INIT' })
      expect(state).toEqual({ user: null, status: 'idle' })
    })

    it('should handle setCredentials', () => {
      const state = authReducer(undefined, setCredentials({ user: mockUser }))
      expect(state.user).toEqual(mockUser)
      expect(state.status).toBe('authenticated')
    })

    it('should handle clearCredentials', () => {
      const authed = authReducer(undefined, setCredentials({ user: mockUser }))
      const state = authReducer(authed, clearCredentials())
      expect(state.user).toBeNull()
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
      auth: { user: mockUser, status: 'authenticated' },
    }
    const rootIdle = {
      auth: { user: null, status: 'idle' },
    }

    it('selectCurrentUser returns the user', () => {
      expect(selectCurrentUser(rootAuthenticated)).toEqual(mockUser)
    })

    it('selectCurrentUser returns null when not authenticated', () => {
      expect(selectCurrentUser(rootIdle)).toBeNull()
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
  })
})
