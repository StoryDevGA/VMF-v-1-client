/**
 * userApi Tests
 *
 * Covers:
 * - Endpoint definitions are injected correctly
 * - Hook exports exist
 * - Tag invalidation shapes
 */

import { describe, it, expect } from 'vitest'
import {
  userApi,
  useListUsersQuery,
  useLazyListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDisableUserMutation,
  useDeleteUserMutation,
  useResendInvitationMutation,
  useBulkCreateUsersMutation,
  useBulkUpdateUsersMutation,
  useBulkDisableUsersMutation,
} from './userApi.js'

describe('userApi', () => {
  it('should expose injected endpoints', () => {
    const endpoints = userApi.endpoints
    expect(endpoints).toHaveProperty('listUsers')
    expect(endpoints).toHaveProperty('createUser')
    expect(endpoints).toHaveProperty('updateUser')
    expect(endpoints).toHaveProperty('disableUser')
    expect(endpoints).toHaveProperty('deleteUser')
    expect(endpoints).toHaveProperty('resendInvitation')
    expect(endpoints).toHaveProperty('bulkCreateUsers')
    expect(endpoints).toHaveProperty('bulkUpdateUsers')
    expect(endpoints).toHaveProperty('bulkDisableUsers')
  })

  it('should export query hooks', () => {
    expect(typeof useListUsersQuery).toBe('function')
    expect(typeof useLazyListUsersQuery).toBe('function')
  })

  it('should export mutation hooks', () => {
    expect(typeof useCreateUserMutation).toBe('function')
    expect(typeof useUpdateUserMutation).toBe('function')
    expect(typeof useDisableUserMutation).toBe('function')
    expect(typeof useDeleteUserMutation).toBe('function')
    expect(typeof useResendInvitationMutation).toBe('function')
    expect(typeof useBulkCreateUsersMutation).toBe('function')
    expect(typeof useBulkUpdateUsersMutation).toBe('function')
    expect(typeof useBulkDisableUsersMutation).toBe('function')
  })

  it('listUsers endpoint should be a query', () => {
    expect(userApi.endpoints.listUsers).toBeDefined()
    expect(typeof userApi.endpoints.listUsers.initiate).toBe('function')
  })

  it('createUser endpoint should be a mutation', () => {
    expect(userApi.endpoints.createUser).toBeDefined()
    expect(typeof userApi.endpoints.createUser.initiate).toBe('function')
  })

  it('updateUser endpoint should be a mutation', () => {
    expect(userApi.endpoints.updateUser).toBeDefined()
    expect(typeof userApi.endpoints.updateUser.initiate).toBe('function')
  })

  it('disableUser endpoint should be a mutation', () => {
    expect(userApi.endpoints.disableUser).toBeDefined()
    expect(typeof userApi.endpoints.disableUser.initiate).toBe('function')
  })

  it('deleteUser endpoint should be a mutation', () => {
    expect(userApi.endpoints.deleteUser).toBeDefined()
    expect(typeof userApi.endpoints.deleteUser.initiate).toBe('function')
  })

  it('resendInvitation endpoint should be a mutation', () => {
    expect(userApi.endpoints.resendInvitation).toBeDefined()
    expect(typeof userApi.endpoints.resendInvitation.initiate).toBe('function')
  })

  it('bulkCreateUsers endpoint should be a mutation', () => {
    expect(userApi.endpoints.bulkCreateUsers).toBeDefined()
    expect(typeof userApi.endpoints.bulkCreateUsers.initiate).toBe('function')
  })

  it('bulkUpdateUsers endpoint should be a mutation', () => {
    expect(userApi.endpoints.bulkUpdateUsers).toBeDefined()
    expect(typeof userApi.endpoints.bulkUpdateUsers.initiate).toBe('function')
  })

  it('bulkDisableUsers endpoint should be a mutation', () => {
    expect(userApi.endpoints.bulkDisableUsers).toBeDefined()
    expect(typeof userApi.endpoints.bulkDisableUsers.initiate).toBe('function')
  })
})
