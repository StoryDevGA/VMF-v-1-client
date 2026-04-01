import { describe, it, expect } from 'vitest'
import { baseApi } from './baseApi.js'
import {
  roleApi,
  getRoleRows,
  getCachedListRoleArgs,
  applyOptimisticRolePermissionsUpdate,
  useListRolesQuery,
  useLazyListRolesQuery,
  useGetPermissionCatalogueQuery,
  useCreateRoleMutation,
  useGetRoleQuery,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from './roleApi.js'

describe('roleApi', () => {
  it('exposes role endpoints', () => {
    expect(roleApi.endpoints).toHaveProperty('listRoles')
    expect(roleApi.endpoints).toHaveProperty('getPermissionCatalogue')
    expect(roleApi.endpoints).toHaveProperty('createRole')
    expect(roleApi.endpoints).toHaveProperty('getRole')
    expect(roleApi.endpoints).toHaveProperty('updateRole')
    expect(roleApi.endpoints).toHaveProperty('deleteRole')
  })

  it('exports query hooks', () => {
    expect(typeof useListRolesQuery).toBe('function')
    expect(typeof useLazyListRolesQuery).toBe('function')
    expect(typeof useGetPermissionCatalogueQuery).toBe('function')
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

  it('getPermissionCatalogue endpoint should be a query', () => {
    expect(roleApi.endpoints.getPermissionCatalogue).toBeDefined()
    expect(typeof roleApi.endpoints.getPermissionCatalogue.initiate).toBe('function')
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

  it('collects cached listRoles args from the RTK Query state', () => {
    const state = {
      [baseApi.reducerPath]: {
        queries: {
          'listRoles({"page":1,"pageSize":20})': {
            endpointName: 'listRoles',
            originalArgs: { page: 1, pageSize: 20 },
          },
          'listRoles({"page":2,"pageSize":20})': {
            endpointName: 'listRoles',
            originalArgs: { page: 2, pageSize: 20 },
          },
          'getRole("role-1")': {
            endpointName: 'getRole',
            originalArgs: 'role-1',
          },
        },
      },
    }

    expect(getCachedListRoleArgs(state)).toEqual([
      { page: 1, pageSize: 20 },
      { page: 2, pageSize: 20 },
    ])
  })

  it('returns role rows from list responses', () => {
    expect(
      getRoleRows({
        data: [
          { id: 'role-1' },
          { id: 'role-2' },
        ],
      }),
    ).toHaveLength(2)

    expect(
      getRoleRows({
        data: {
          data: [{ id: 'role-1' }],
        },
      }),
    ).toHaveLength(1)
  })

  it('applies optimistic permission updates to matching cached roles', () => {
    const cachedResult = {
      data: [
        {
          id: 'role-1',
          permissions: ['CUSTOMER_VIEW'],
        },
        {
          id: 'role-2',
          permissions: ['TENANT_VIEW'],
        },
      ],
    }

    applyOptimisticRolePermissionsUpdate(cachedResult, 'role-1', [
      'CUSTOMER_VIEW',
      'CUSTOMER_UPDATE',
    ])

    expect(cachedResult.data[0].permissions).toEqual([
      'CUSTOMER_VIEW',
      'CUSTOMER_UPDATE',
    ])
    expect(cachedResult.data[1].permissions).toEqual(['TENANT_VIEW'])
  })
})
