import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUseListUsersQuery } = vi.hoisted(() => ({
  mockUseListUsersQuery: vi.fn(),
}))

vi.mock('../store/api/userApi.js', () => ({
  useListUsersQuery: (...args) => mockUseListUsersQuery(...args),
  useCreateUserMutation: () => [vi.fn(), {}],
  useUpdateUserMutation: () => [vi.fn(), {}],
  useDisableUserMutation: () => [vi.fn(), {}],
  useDeleteUserMutation: () => [vi.fn(), {}],
  useResendInvitationMutation: () => [vi.fn(), {}],
}))

import { useUsers } from './useUsers.js'

describe('useUsers', () => {
  beforeEach(() => {
    mockUseListUsersQuery.mockReset()
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
})
