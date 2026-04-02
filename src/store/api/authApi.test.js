/**
 * authApi Tests
 *
 * Covers:
 * - Endpoint definitions are injected correctly
 * - Hook exports exist
 */

import { describe, it, expect } from 'vitest'
import {
  authApi,
  useLoginMutation,
  useSuperAdminLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useRequestStepUpMutation,
} from './authApi.js'

describe('authApi', () => {
  it('should expose injected endpoints', () => {
    const endpoints = authApi.endpoints
    expect(endpoints).toHaveProperty('login')
    expect(endpoints).toHaveProperty('superAdminLogin')
    expect(endpoints).toHaveProperty('logout')
    expect(endpoints).toHaveProperty('getMe')
    expect(endpoints).toHaveProperty('requestStepUp')
  })

  it('should export mutation hooks', () => {
    expect(typeof useLoginMutation).toBe('function')
    expect(typeof useSuperAdminLoginMutation).toBe('function')
    expect(typeof useLogoutMutation).toBe('function')
    expect(typeof useRequestStepUpMutation).toBe('function')
  })

  it('should export query hooks', () => {
    expect(typeof useGetMeQuery).toBe('function')
    expect(typeof useLazyGetMeQuery).toBe('function')
  })

  it('login endpoint should be a mutation', () => {
    expect(authApi.endpoints.login).toBeDefined()
    expect(typeof authApi.endpoints.login.initiate).toBe('function')
    // Mutations don't have a `useQuery` hook
    expect(useLoginMutation).toBeDefined()
  })

  it('superAdminLogin endpoint should be a mutation', () => {
    expect(authApi.endpoints.superAdminLogin).toBeDefined()
    expect(typeof authApi.endpoints.superAdminLogin.initiate).toBe('function')
  })

  it('logout endpoint should be a mutation', () => {
    expect(authApi.endpoints.logout).toBeDefined()
    expect(typeof authApi.endpoints.logout.initiate).toBe('function')
  })

  it('getMe endpoint should be a query', () => {
    expect(authApi.endpoints.getMe).toBeDefined()
    expect(typeof authApi.endpoints.getMe.initiate).toBe('function')
    expect(useGetMeQuery).toBeDefined()
  })

  it('requestStepUp endpoint should be a mutation', () => {
    expect(authApi.endpoints.requestStepUp).toBeDefined()
    expect(typeof authApi.endpoints.requestStepUp.initiate).toBe('function')
  })
})

// FE-05: Permission refresh behavior contract
// Resolved permissions are propagated at three deterministic boundaries:
//   1. Login (login / superAdminLogin onQueryStarted → setCredentials)
//   2. App bootstrap (AppInit → useLazyGetMeQuery → getMe onQueryStarted → setCredentials)
//   3. Token refresh (baseApi attemptRefresh → POST /auth/refresh → GET /auth/me → setCredentials)
// Route changes alone are NOT a propagation boundary.
// These contracts are verified structurally here; behavioural coverage lives in AppInit.test.jsx.
describe('authApi FE-05 refresh propagation contract', () => {
  it('exposes useLazyGetMeQuery for on-demand session refresh', () => {
    expect(typeof useLazyGetMeQuery).toBe('function')
  })

  it('getMe endpoint is a query (not a mutation) so RTK Query can cache and re-run it', () => {
    expect(authApi.endpoints.getMe).toBeDefined()
    // Query endpoints expose `select` for cache reads; mutations do not
    expect(typeof authApi.endpoints.getMe.select).toBe('function')
  })
})
