import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockUseListUsersQuery,
  mockUseEnableUserMutation,
} = vi.hoisted(() => ({
  mockUseListUsersQuery: vi.fn(),
  mockUseEnableUserMutation: vi.fn(),
}))

vi.mock('../store/api/userApi.js', () => ({
  useListUsersQuery: (...args) => mockUseListUsersQuery(...args),
  useCreateUserMutation: () => [vi.fn(), {}],
  useUpdateUserMutation: () => [vi.fn(), {}],
  useDisableUserMutation: () => [vi.fn(), {}],
  useEnableUserMutation: (...args) => mockUseEnableUserMutation(...args),
  useDeleteUserMutation: () => [vi.fn(), {}],
  useResendInvitationMutation: () => [vi.fn(), {}],
}))

import { useUsers } from './useUsers.js'

describe('useUsers', () => {
  beforeEach(() => {
    mockUseListUsersQuery.mockReset()
    mockUseEnableUserMutation.mockReset()
    mockUseListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            { _id: 'user-1', name: 'Alpha' },
            { _id: 'user-2', name: 'Beta' },
          ],
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    mockUseEnableUserMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('returns the full customer-scoped user list without client-side tenant filtering', () => {
    const { result } = renderHook(() =>
      useUsers('cust-1', { pageSize: 20, tenantId: 'ten-1' }),
    )

    expect(result.current.users).toHaveLength(2)
    expect(result.current.users.map((user) => user._id)).toEqual(['user-1', 'user-2'])
    expect(mockUseListUsersQuery).toHaveBeenCalledWith(
      {
        customerId: 'cust-1',
        q: undefined,
        status: undefined,
        page: 1,
        pageSize: 20,
      },
      { skip: false },
    )
  })

  it('exposes the enableUser mutation facade', async () => {
    const enableUserMutation = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { _id: 'user-2', isActive: true } }),
    })
    mockUseEnableUserMutation.mockReturnValue([enableUserMutation, { isLoading: false }])

    const { result } = renderHook(() => useUsers('cust-1'))

    await act(async () => {
      await result.current.enableUser('user-2')
    })

    expect(enableUserMutation).toHaveBeenCalledWith({ userId: 'user-2' })
    expect(result.current.enableUserResult.isLoading).toBe(false)
  })
})
