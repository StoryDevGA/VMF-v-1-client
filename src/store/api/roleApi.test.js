import { describe, it, expect } from 'vitest'
import {
  roleApi,
  useListRolesQuery,
  useLazyListRolesQuery,
  useCreateRoleMutation,
  useGetRoleQuery,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from './roleApi.js'

describe('roleApi', () => {
  it('exposes role endpoints', () => {
    expect(roleApi.endpoints).toHaveProperty('listRoles')
    expect(roleApi.endpoints).toHaveProperty('createRole')
    expect(roleApi.endpoints).toHaveProperty('getRole')
    expect(roleApi.endpoints).toHaveProperty('updateRole')
    expect(roleApi.endpoints).toHaveProperty('deleteRole')
  })

  it('exports query hooks', () => {
    expect(typeof useListRolesQuery).toBe('function')
    expect(typeof useLazyListRolesQuery).toBe('function')
    expect(typeof useGetRoleQuery).toBe('function')
  })

  it('exports mutation hooks', () => {
    expect(typeof useCreateRoleMutation).toBe('function')
    expect(typeof useUpdateRoleMutation).toBe('function')
    expect(typeof useDeleteRoleMutation).toBe('function')
  })

  it('listRoles endpoint should be a query', () => {
    expect(roleApi.endpoints.listRoles).toBeDefined()
    expect(typeof roleApi.endpoints.listRoles.initiate).toBe('function')
  })

  it('createRole endpoint should be a mutation', () => {
    expect(roleApi.endpoints.createRole).toBeDefined()
    expect(typeof roleApi.endpoints.createRole.initiate).toBe('function')
  })

  it('getRole endpoint should be a query', () => {
    expect(roleApi.endpoints.getRole).toBeDefined()
    expect(typeof roleApi.endpoints.getRole.initiate).toBe('function')
  })

  it('updateRole endpoint should be a mutation', () => {
    expect(roleApi.endpoints.updateRole).toBeDefined()
    expect(typeof roleApi.endpoints.updateRole.initiate).toBe('function')
  })

  it('deleteRole endpoint should be a mutation', () => {
    expect(roleApi.endpoints.deleteRole).toBeDefined()
    expect(typeof roleApi.endpoints.deleteRole.initiate).toBe('function')
  })
})

