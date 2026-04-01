import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockUseCreateRoleMutation,
  mockUseDeleteRoleMutation,
  mockUseGetRoleQuery,
  mockUseUpdateRoleMutation,
  addToastMock,
} = vi.hoisted(() => ({
  mockUseCreateRoleMutation: vi.fn(),
  mockUseDeleteRoleMutation: vi.fn(),
  mockUseGetRoleQuery: vi.fn(),
  mockUseUpdateRoleMutation: vi.fn(),
  addToastMock: vi.fn(),
}))

vi.mock('../../store/api/roleApi.js', () => ({
  useCreateRoleMutation: (...args) => mockUseCreateRoleMutation(...args),
  useDeleteRoleMutation: (...args) => mockUseDeleteRoleMutation(...args),
  useGetRoleQuery: (...args) => mockUseGetRoleQuery(...args),
  useUpdateRoleMutation: (...args) => mockUseUpdateRoleMutation(...args),
}))

vi.mock('../../components/Toaster', () => ({
  useToaster: () => ({
    addToast: addToastMock,
  }),
}))

import { useRoleManagement } from './useRoleManagement.js'

describe('useRoleManagement', () => {
  beforeEach(() => {
    const emptyRoleResponse = {
      data: null,
      isFetching: false,
      error: null,
    }
    const selectedRoleResponse = {
      data: {
        data: {
          id: 'role-custom',
          key: 'VMF_CREATOR',
          name: 'VMF Creator',
          description: 'Custom role description',
          scope: 'CUSTOMER',
          permissions: ['CUSTOMER_VIEW', 'USER_VIEW'],
          isSystem: false,
          isActive: true,
        },
      },
      isFetching: false,
      error: null,
    }

    mockUseCreateRoleMutation.mockReset()
    mockUseDeleteRoleMutation.mockReset()
    mockUseGetRoleQuery.mockReset()
    mockUseUpdateRoleMutation.mockReset()
    addToastMock.mockReset()

    mockUseGetRoleQuery.mockImplementation((roleId, options = {}) => {
      if (options?.skip || !roleId) {
        return emptyRoleResponse
      }

      return selectedRoleResponse
    })

    mockUseDeleteRoleMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('creates roles with an empty permissions array', async () => {
    const createRoleMock = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    mockUseCreateRoleMutation.mockReturnValue([createRoleMock, { isLoading: false }])
    mockUseUpdateRoleMutation.mockReturnValue([vi.fn(), { isLoading: false }])

    const { result } = renderHook(() => useRoleManagement())

    act(() => {
      result.current.setCreateForm((current) => ({
        ...current,
        key: 'vmf creator',
        name: 'VMF Creator',
      }))
    })

    await act(async () => {
      await result.current.handleCreateSubmit({
        preventDefault: () => {},
      })
    })

    expect(createRoleMock).toHaveBeenCalledWith({
      key: 'VMF_CREATOR',
      name: 'VMF Creator',
      scope: 'CUSTOMER',
      permissions: [],
      isActive: true,
    })
  })

  it('removes permissions from edit state and does not patch them on update', async () => {
    const updateRoleMock = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    mockUseCreateRoleMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    mockUseUpdateRoleMutation.mockReturnValue([updateRoleMock, { isLoading: false }])

    const { result } = renderHook(() => useRoleManagement())

    act(() => {
      result.current.openEditDialog({
        id: 'role-custom',
        isSystem: false,
      })
    })

    await waitFor(() => {
      expect(result.current.editForm.name).toBe('VMF Creator')
    })

    expect(result.current.editForm.permissions).toBeUndefined()

    act(() => {
      result.current.setEditForm((current) => ({
        ...current,
        name: 'Updated Creator',
      }))
    })

    await act(async () => {
      await result.current.handleEditSubmit()
    })

    expect(updateRoleMock).toHaveBeenCalledWith({
      roleId: 'role-custom',
      name: 'Updated Creator',
    })
  })
})
