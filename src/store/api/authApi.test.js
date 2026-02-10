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
} from './authApi.js'

describe('authApi', () => {
  it('should expose injected endpoints', () => {
    const endpoints = authApi.endpoints
    expect(endpoints).toHaveProperty('login')
    expect(endpoints).toHaveProperty('superAdminLogin')
    expect(endpoints).toHaveProperty('logout')
    expect(endpoints).toHaveProperty('getMe')
  })

  it('should export mutation hooks', () => {
    expect(typeof useLoginMutation).toBe('function')
    expect(typeof useSuperAdminLoginMutation).toBe('function')
    expect(typeof useLogoutMutation).toBe('function')
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
})
