import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockUseListUsersQuery,
  mockUseDisableUserMutation,
  mockUseEnableUserMutation,
} = vi.hoisted(() => ({
  mockUseListUsersQuery: vi.fn(),
  mockUseDisableUserMutation: vi.fn(),
  mockUseEnableUserMutation: vi.fn(),
}))

vi.mock('../store/api/userApi.js', () => ({
  useListUsersQuery: (...args) => mockUseListUsersQuery(...args),
  useCreateUserMutation: () => [vi.fn(), {}],
  useUpdateUserMutation: () => [vi.fn(), {}],
  useDisableUserMutation: (...args) => mockUseDisableUserMutation(...args),
  useEnableUserMutation: (...args) => mockUseEnableUserMutation(...args),
  useDeleteUserMutation: () => [vi.fn(), {}],
  useResendInvitationMutation: () => [vi.fn(), {}],
}))

import { useUsers } from './useUsers.js'

describe('useUsers', () => {
  beforeEach(() => {
    mockUseListUsersQuery.mockReset()
    mockUseDisableUserMutation.mockReset()
    mockUseEnableUserMutation.mockReset()
    mockUseListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            { _id: 'user-1', name: 'Alpha', isCanonicalAdmin: true },
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
    mockUseDisableUserMutation.mockReturnValue([vi.fn(), { isLoading: false }])
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

  it('preserves the canonical-admin marker from the list-users contract', () => {
    const { result } = renderHook(() => useUsers('cust-1'))

    expect(result.current.users[0]).toEqual(
      expect.objectContaining({
        _id: 'user-1',
        isCanonicalAdmin: true,
      }),
    )
  })

  it('skips the list query when only mutation facades are needed', () => {
    renderHook(() => useUsers('cust-1', { skipListQuery: true }))

    expect(mockUseListUsersQuery).toHaveBeenCalledWith(
      {
        customerId: 'cust-1',
        q: undefined,
        status: undefined,
        page: 1,
        pageSize: 20,
      },
      { skip: true },
    )
  })

  it('passes customer scope through the disableUser mutation facade', async () => {
    const disableUserMutation = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { _id: 'user-1', isActive: false } }),
    })
    mockUseDisableUserMutation.mockReturnValue([disableUserMutation, { isLoading: false }])

    const { result } = renderHook(() => useUsers('cust-1'))

    await act(async () => {
      await result.current.disableUser('user-1')
    })

    expect(disableUserMutation).toHaveBeenCalledWith({
      customerId: 'cust-1',
      userId: 'user-1',
    })
    expect(result.current.disableUserResult.isLoading).toBe(false)
  })

  it('rejects customer-admin user lifecycle actions when customer scope is missing', async () => {
    const disableUserMutation = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { _id: 'user-1', isActive: false } }),
    })
    mockUseDisableUserMutation.mockReturnValue([disableUserMutation, { isLoading: false }])

    const { result } = renderHook(() => useUsers())

    await act(async () => {
      await expect(result.current.disableUser('user-1')).rejects.toMatchObject({
        status: 400,
        data: {
          error: {
            code: 'CUSTOMER_CONTEXT_REQUIRED',
          },
        },
      })
    })

    expect(disableUserMutation).not.toHaveBeenCalled()
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

    expect(enableUserMutation).toHaveBeenCalledWith({
      customerId: 'cust-1',
      userId: 'user-2',
    })
    expect(result.current.enableUserResult.isLoading).toBe(false)
  })
})
