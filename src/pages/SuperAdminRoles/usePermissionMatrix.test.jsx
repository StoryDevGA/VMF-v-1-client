import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PERMISSION_GROUPS } from './permissionCatalogue.constants.js'

const {
  mockUseListRolesQuery,
  mockUseGetPermissionCatalogueQuery,
  mockUseUpdateRoleMutation,
  addToastMock,
} = vi.hoisted(() => ({
  mockUseListRolesQuery: vi.fn(),
  mockUseGetPermissionCatalogueQuery: vi.fn(),
  mockUseUpdateRoleMutation: vi.fn(),
  addToastMock: vi.fn(),
}))

vi.mock('../../store/api/roleApi.js', () => ({
  getRoleRows: (result) => result?.data?.data ?? result?.data ?? [],
  useListRolesQuery: (...args) => mockUseListRolesQuery(...args),
  useGetPermissionCatalogueQuery: (...args) => mockUseGetPermissionCatalogueQuery(...args),
  useUpdateRoleMutation: (...args) => mockUseUpdateRoleMutation(...args),
}))

vi.mock('../../components/Toaster', () => ({
  useToaster: () => ({
    addToast: addToastMock,
  }),
}))

import { usePermissionMatrix } from './usePermissionMatrix.js'

const createDeferred = () => {
  let resolve
  let reject

  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

describe('usePermissionMatrix', () => {
  beforeEach(() => {
    mockUseListRolesQuery.mockReset()
    mockUseGetPermissionCatalogueQuery.mockReset()
    mockUseUpdateRoleMutation.mockReset()
    addToastMock.mockReset()

    mockUseListRolesQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'role-custom',
            key: 'VMF_CREATOR',
            name: 'VMF Creator',
            permissions: ['VMF_VIEW'],
            isSystem: false,
          },
          {
            id: 'role-user',
            key: 'USER',
            name: 'User',
            permissions: ['DEAL_VIEW'],
            isSystem: true,
          },
          {
            id: 'role-tenant-admin',
            key: 'TENANT_ADMIN',
            name: 'Tenant Admin',
            permissions: ['TENANT_VIEW'],
            isSystem: true,
          },
          {
            id: 'role-customer-admin',
            key: 'CUSTOMER_ADMIN',
            name: 'Customer Admin',
            permissions: ['CUSTOMER_VIEW'],
            isSystem: true,
          },
          {
            id: 'role-super-admin',
            key: 'SUPER_ADMIN',
            name: 'Super Admin',
            permissions: ['PLATFORM_MANAGE', 'CUSTOMER_VIEW'],
            isSystem: true,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    mockUseGetPermissionCatalogueQuery.mockReturnValue({
      data: null,
    })

    mockUseUpdateRoleMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('returns sorted roles and falls back to local permission groups', () => {
    const { result } = renderHook(() => usePermissionMatrix())

    expect(mockUseListRolesQuery).toHaveBeenCalledWith({
      page: 1,
      pageSize: 100,
    })
    expect(result.current.roles.map((role) => role.key)).toEqual([
      'USER',
      'TENANT_ADMIN',
      'CUSTOMER_ADMIN',
      'SUPER_ADMIN',
      'VMF_CREATOR',
    ])
    expect(result.current.permissionGroups).toEqual(PERMISSION_GROUPS)
    expect(result.current.error).toBeNull()
  })

  it('uses the remote permission catalogue when available', () => {
    const remoteGroups = [
      {
        groupKey: 'REMOTE',
        groupLabel: 'Remote Group',
        permissions: [
          {
            key: 'REMOTE_VIEW',
            label: 'View Remote',
            description: 'Remote description.',
          },
        ],
      },
    ]

    mockUseGetPermissionCatalogueQuery.mockReturnValue({
      data: {
        data: remoteGroups,
      },
    })

    const { result } = renderHook(() => usePermissionMatrix())

    expect(result.current.permissionGroups).toEqual(remoteGroups)
  })

  it('updates the local search state', () => {
    const { result } = renderHook(() => usePermissionMatrix())

    act(() => {
      result.current.setSearch('platform')
    })

    expect(result.current.search).toBe('platform')
  })

  it('builds and sends the next permissions array when toggling on', async () => {
    const updateRoleMock = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    mockUseUpdateRoleMutation.mockReturnValue([updateRoleMock, { isLoading: false }])

    const { result } = renderHook(() => usePermissionMatrix())

    await act(async () => {
      await result.current.handleToggle('role-user', 'USER_VIEW', true)
    })

    expect(updateRoleMock).toHaveBeenCalledWith({
      roleId: 'role-user',
      permissions: ['USER_VIEW', 'DEAL_VIEW'],
    })
  })

  it('tracks pending toggles and shows an error toast when the update fails', async () => {
    const deferred = createDeferred()
    const updateRoleMock = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockReturnValue(deferred.promise),
    })
    mockUseUpdateRoleMutation.mockReturnValue([updateRoleMock, { isLoading: false }])

    const { result } = renderHook(() => usePermissionMatrix())

    act(() => {
      void result.current.handleToggle('role-user', 'USER_VIEW', true)
    })

    await waitFor(() => {
      expect(result.current.pendingToggles.has('role-user-USER_VIEW')).toBe(true)
    })

    await act(async () => {
      deferred.reject({
        status: 500,
        data: {
          error: {
            code: 'SERVER_ERROR',
            message: 'Unable to update role permissions.',
          },
        },
      })

      try {
        await deferred.promise
      } catch {
        // Swallow expected rejection driven by the mocked mutation.
      }
    })

    await waitFor(() => {
      expect(result.current.pendingToggles.has('role-user-USER_VIEW')).toBe(false)
    })

    expect(addToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Failed to update permissions',
        variant: 'error',
      }),
    )
  })
})
