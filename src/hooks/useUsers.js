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
  useListAssignableRolesQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDisableUserMutation,
  useEnableUserMutation,
  useDeleteUserMutation,
  useResendInvitationMutation,
} from '../store/api/userApi.js'

const createMissingCustomerScopeError = () => ({
  status: 400,
  data: {
    error: {
      code: 'CUSTOMER_CONTEXT_REQUIRED',
      message: 'No customer context is available for this action. Refresh and try again.',
    },
  },
})

/**
 * @param {string} customerId - The customer to manage users for
 * @param {Object}  [options]
 * @param {number}  [options.pageSize=20] - Page size for list queries
 * @param {boolean} [options.skipListQuery=false] - Skip the list query and expose only mutation facades
 * @returns {{
 *   users: Array,
 *   pagination: { page: number, pageSize: number, total: number, totalPages: number },
 *   assignableRoleCatalogue: Array,
 *   isLoadingAssignableRoles: boolean,
 *   assignableRolesError: object|null,
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
 *   enableUser: Function,
 *   enableUserResult: object,
 *   deleteUser: Function,
 *   deleteUserResult: object,
 *   resendInvitation: Function,
 *   resendInvitationResult: object,
 * }}
 */
export function useUsers(customerId, options = {}) {
  const { pageSize = 20, skipListQuery = false } = options

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
    { skip: !customerId || skipListQuery },
  )

  const {
    data: assignableRolesData,
    isLoading: isLoadingAssignableRoles,
    error: assignableRolesError,
  } = useListAssignableRolesQuery(
    { customerId },
    { skip: !customerId || skipListQuery },
  )

  const users = useMemo(
    () => listData?.data?.users ?? [],
    [listData],
  )

  const pagination = useMemo(
    () => ({
      page: listData?.data?.page ?? page,
      pageSize: listData?.data?.pageSize ?? pageSize,
      total: listData?.data?.total ?? 0,
      totalPages: listData?.data?.totalPages ?? 0,
    }),
    [listData, page, pageSize],
  )

  const assignableRoleCatalogue = useMemo(
    () => assignableRolesData?.data ?? [],
    [assignableRolesData],
  )

  /* ---- Mutations ---- */
  const [createUserMutation, createUserResult] = useCreateUserMutation()
  const [updateUserMutation, updateUserResult] = useUpdateUserMutation()
  const [disableUserMutation, disableUserResult] = useDisableUserMutation()
  const [enableUserMutation, enableUserResult] = useEnableUserMutation()
  const [deleteUserMutation, deleteUserResult] = useDeleteUserMutation()
  const [resendInvitationMutation, resendInvitationResult] =
    useResendInvitationMutation()

  /** Create a user within the current customer */
  const createUser = useCallback(
    (body) => {
      if (!customerId) return Promise.reject(createMissingCustomerScopeError())
      return createUserMutation({ customerId, body }).unwrap()
    },
    [createUserMutation, customerId],
  )

  /** Update user by ID */
  const updateUser = useCallback(
    (userId, body) => {
      if (!customerId) return Promise.reject(createMissingCustomerScopeError())
      return updateUserMutation({ customerId, userId, body }).unwrap()
    },
    [customerId, updateUserMutation],
  )

  /** Disable user by ID */
  const disableUser = useCallback(
    (userId) => {
      if (!customerId) return Promise.reject(createMissingCustomerScopeError())
      return disableUserMutation({ customerId, userId }).unwrap()
    },
    [customerId, disableUserMutation],
  )

  /** Reactivate user by ID */
  const enableUser = useCallback(
    (userId) => {
      if (!customerId) return Promise.reject(createMissingCustomerScopeError())
      return enableUserMutation({ customerId, userId }).unwrap()
    },
    [customerId, enableUserMutation],
  )

  /** Delete user by ID (must be disabled first) */
  const deleteUser = useCallback(
    (userId) => {
      if (!customerId) return Promise.reject(createMissingCustomerScopeError())
      return deleteUserMutation({ customerId, userId }).unwrap()
    },
    [customerId, deleteUserMutation],
  )

  /** Resend Identity Plus invitation for untrusted user */
  const resendInvitation = useCallback(
    (userId) => {
      if (!customerId) return Promise.reject(createMissingCustomerScopeError())
      return resendInvitationMutation({ customerId, userId }).unwrap()
    },
    [customerId, resendInvitationMutation],
  )

  return {
    // List data
    users,
    pagination,
    assignableRoleCatalogue,
    isLoadingAssignableRoles,
    assignableRolesError: assignableRolesError ?? null,
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
    enableUser,
    enableUserResult,
    deleteUser,
    deleteUserResult,
    resendInvitation,
    resendInvitationResult,
  }
}

export default useUsers
