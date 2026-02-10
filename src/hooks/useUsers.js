/**
 * useUsers Hook
 *
 * Facade hook wrapping the RTK Query user endpoints from `userApi.js`.
 * Provides a convenient API for user management components.
 *
 * @example
 * const { users, pagination, isLoading, createUser, disableUser } = useUsers(customerId)
 */

import { useState, useCallback, useMemo } from 'react'
import {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDisableUserMutation,
  useDeleteUserMutation,
  useResendInvitationMutation,
} from '../store/api/userApi.js'

/**
 * @param {string} customerId - The customer to manage users for
 * @param {Object}  [options]
 * @param {number}  [options.pageSize=20] - Page size for list queries
 * @returns {{
 *   users: Array,
 *   pagination: { page: number, pageSize: number, total: number, totalPages: number },
 *   isLoading: boolean,
 *   isFetching: boolean,
 *   error: object|null,
 *   search: string,
 *   setSearch: Function,
 *   statusFilter: string,
 *   setStatusFilter: Function,
 *   page: number,
 *   setPage: Function,
 *   createUser: Function,
 *   createUserResult: object,
 *   updateUser: Function,
 *   updateUserResult: object,
 *   disableUser: Function,
 *   disableUserResult: object,
 *   deleteUser: Function,
 *   deleteUserResult: object,
 *   resendInvitation: Function,
 *   resendInvitationResult: object,
 * }}
 */
export function useUsers(customerId, options = {}) {
  const { pageSize = 20 } = options

  /* ---- Local filter / pagination state ---- */
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  /* ---- RTK Query: list users ---- */
  const {
    data: listData,
    isLoading,
    isFetching,
    error: listError,
  } = useListUsersQuery(
    {
      customerId,
      q: search || undefined,
      status: statusFilter || undefined,
      page,
      pageSize,
    },
    { skip: !customerId },
  )

  const users = useMemo(() => listData?.data?.users ?? [], [listData])

  const pagination = useMemo(
    () => ({
      page: listData?.data?.page ?? page,
      pageSize: listData?.data?.pageSize ?? pageSize,
      total: listData?.data?.total ?? 0,
      totalPages: listData?.data?.totalPages ?? 0,
    }),
    [listData, page, pageSize],
  )

  /* ---- Mutations ---- */
  const [createUserMutation, createUserResult] = useCreateUserMutation()
  const [updateUserMutation, updateUserResult] = useUpdateUserMutation()
  const [disableUserMutation, disableUserResult] = useDisableUserMutation()
  const [deleteUserMutation, deleteUserResult] = useDeleteUserMutation()
  const [resendInvitationMutation, resendInvitationResult] =
    useResendInvitationMutation()

  /** Create a user within the current customer */
  const createUser = useCallback(
    (body) => createUserMutation({ customerId, body }).unwrap(),
    [createUserMutation, customerId],
  )

  /** Update user by ID */
  const updateUser = useCallback(
    (userId, body) => updateUserMutation({ userId, body }).unwrap(),
    [updateUserMutation],
  )

  /** Disable user by ID */
  const disableUser = useCallback(
    (userId) => disableUserMutation({ userId }).unwrap(),
    [disableUserMutation],
  )

  /** Delete user by ID (must be disabled first) */
  const deleteUser = useCallback(
    (userId) => deleteUserMutation({ userId }).unwrap(),
    [deleteUserMutation],
  )

  /** Resend Identity Plus invitation for untrusted user */
  const resendInvitation = useCallback(
    (userId) => resendInvitationMutation({ userId }).unwrap(),
    [resendInvitationMutation],
  )

  return {
    // List data
    users,
    pagination,
    isLoading,
    isFetching,
    error: listError ?? null,

    // Search & filter state
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,

    // Mutations
    createUser,
    createUserResult,
    updateUser,
    updateUserResult,
    disableUser,
    disableUserResult,
    deleteUser,
    deleteUserResult,
    resendInvitation,
    resendInvitationResult,
  }
}

export default useUsers
