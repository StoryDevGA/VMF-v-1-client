/**
 * User API Slice (RTK Query)
 *
 * Injects user-management endpoints into the base API.
 * Handles listing, creating, updating, disabling, enabling, deleting users,
 * and resending Identity Plus invitations.
 *
 * All user endpoints align with BACKEND-SPEC §9.3.
 */

import { baseApi } from './baseApi.js'

const getListUsersRows = (result) => {
  if (!result || typeof result !== 'object') return []

  const payload = result.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.users)) return payload.users

  return []
}

const getAssignableRoleRows = (result) => {
  if (!result || typeof result !== 'object') return []

  const payload = result.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data

  return []
}

const getListUsersMeta = (result) => {
  if (!result || typeof result !== 'object') {
    return {}
  }

  if (result.meta && typeof result.meta === 'object') {
    return result.meta
  }

  const payload = result.data
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }

  const meta = { ...payload }
  delete meta.users
  delete meta.data
  return meta
}

const parsePositiveInt = (value, fallback) => {
  const parsedValue = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

const normalizeListUsersResponse = (
  response,
  { defaultPage = 1, defaultPageSize = 20 } = {},
) => {
  const users = getListUsersRows(response)
  const rawMeta = getListUsersMeta(response)
  const page = parsePositiveInt(rawMeta.page, defaultPage)
  const pageSize = parsePositiveInt(rawMeta.pageSize, defaultPageSize)
  const total = Number.isFinite(Number(rawMeta.total))
    ? Number(rawMeta.total)
    : users.length
  const totalPages = parsePositiveInt(
    rawMeta.totalPages,
    Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize))),
  )
  const filters = rawMeta.filters && typeof rawMeta.filters === 'object'
    ? rawMeta.filters
    : {}

  return {
    data: {
      users,
      page,
      pageSize,
      total,
      totalPages,
      filters,
    },
    meta: {
      page,
      pageSize,
      total,
      totalPages,
      filters,
    },
  }
}

const getUserRowId = (row) => row?._id ?? row?.id ?? null
const getScopedUserMutationUrl = (customerId, userId, suffix = '') =>
  customerId
    ? `/customers/${customerId}/users/${userId}${suffix}`
    : `/users/${userId}${suffix}`

export const userApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * GET /customers/:customerId/users
     * Paginated user list with optional search, role, and status filters.
     *
     * @param {{ customerId: string, q?: string, role?: string, status?: string, page?: number, pageSize?: number }} params
     */
    listUsers: build.query({
      query: ({ customerId, q, role, status, page = 1, pageSize = 20 }) => {
        const params = new URLSearchParams()
        if (q) params.set('q', q)
        if (role) params.set('role', role)
        if (status) params.set('status', status)
        params.set('page', String(page))
        params.set('pageSize', String(pageSize))
        return `/customers/${customerId}/users?${params.toString()}`
      },
      transformResponse: (response, _meta, arg) =>
        normalizeListUsersResponse(response, {
          defaultPage: parsePositiveInt(arg?.page, 1),
          defaultPageSize: parsePositiveInt(arg?.pageSize, 20),
        }),
      providesTags: (result) =>
        (result?.data?.users?.length ?? 0) > 0
          ? [
              ...result.data.users
                .map((row) => getUserRowId(row))
                .filter(Boolean)
                .map((id) => ({ type: 'User', id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    /**
     * GET /customers/:customerId/users/assignable-roles
     * Customer-scoped assignable role catalogue for create/edit/bulk user flows.
     *
     * @param {{ customerId: string }} params
     */
    listAssignableRoles: build.query({
      query: ({ customerId }) => `/customers/${customerId}/users/assignable-roles`,
      transformResponse: (response) => ({
        data: getAssignableRoleRows(response),
        meta: response?.meta ?? {},
      }),
      providesTags: (result) =>
        (result?.data?.length ?? 0) > 0
          ? [
              ...result.data
                .map((row) => row?.key)
                .filter(Boolean)
                .map((key) => ({ type: 'Role', id: key })),
              { type: 'Role', id: 'LIST' },
            ]
          : [{ type: 'Role', id: 'LIST' }],
    }),

    /**
     * POST /customers/:customerId/users
     * Creates a new user and triggers an Identity Plus invitation.
     * Returns 409 when roles include CUSTOMER_ADMIN and an active
     * canonical admin already exists.
     *
     * @param {{ customerId: string, body: { name: string, email: string, roles: string[], tenantVisibility?: string[] } }} params
     */
    createUser: build.mutation({
      query: ({ customerId, body }) => ({
        url: `/customers/${customerId}/users`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    /**
     * PATCH /customers/:customerId/users/:userId
     * PATCH /users/:userId
     * Updates user profile and authorization grants.
     * Customer-admin flows use the customer-scoped route; super-admin flows
     * keep the legacy entity-scoped fallback.
     *
     * @param {{ customerId?: string, userId: string, body: { name?: string, email?: string, roles?: string[], tenantVisibility?: string[], tenantMemberships?: Array, vmfGrants?: Array } }} params
     */
    updateUser: build.mutation({
      query: ({ customerId, userId, body }) => ({
        url: getScopedUserMutationUrl(customerId, userId),
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'User', id: userId },
        { type: 'User', id: 'LIST' },
      ],
    }),

    /**
     * POST /customers/:customerId/users/:userId/disable
     * POST /users/:userId/disable
     * Disables a user and revokes Identity Plus trust.
     * Customer-admin flows use the customer-scoped route; super-admin flows
     * keep the legacy entity-scoped fallback.
     *
     * @param {{ customerId?: string, userId: string }} params
     */
    disableUser: build.mutation({
      query: ({ customerId, userId }) => ({
        url: getScopedUserMutationUrl(customerId, userId, '/disable'),
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'User', id: userId },
        { type: 'User', id: 'LIST' },
      ],
    }),

    /**
     * POST /customers/:customerId/users/:userId/enable
     * POST /users/:userId/enable
     * Re-enables an inactive user.
     * Customer-admin flows use the customer-scoped route; super-admin flows
     * keep the legacy entity-scoped fallback.
     *
     * @param {{ customerId?: string, userId: string }} params
     */
    enableUser: build.mutation({
      query: ({ customerId, userId }) => ({
        url: getScopedUserMutationUrl(customerId, userId, '/enable'),
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'User', id: userId },
        { type: 'User', id: 'LIST' },
      ],
    }),

    /**
     * DELETE /customers/:customerId/users/:userId
     * DELETE /users/:userId
     * Permanently deletes a disabled user.
     * Customer-admin flows use the customer-scoped route; super-admin flows
     * keep the legacy entity-scoped fallback.
     *
     * @param {{ customerId?: string, userId: string }} params
     */
    deleteUser: build.mutation({
      query: ({ customerId, userId }) => ({
        url: getScopedUserMutationUrl(customerId, userId),
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    /**
     * POST /customers/:customerId/users/:userId/resend-invitation
     * POST /users/:userId/resend-invitation
     * Resends the Identity Plus invitation for an untrusted user.
     * Customer-admin flows use the customer-scoped route; super-admin flows
     * keep the legacy entity-scoped fallback.
     *
     * @param {{ customerId?: string, userId: string }} params
     */
    resendInvitation: build.mutation({
      query: ({ customerId, userId }) => ({
        url: getScopedUserMutationUrl(customerId, userId, '/resend-invitation'),
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'User', id: userId },
      ],
    }),

    /**
     * POST /customers/:customerId/users/bulk
     * Bulk-create users (max 100) with per-item result reporting.
     *
     * @param {{ customerId: string, body: { users: Array, sendInvitations?: boolean } }} params
     */
    bulkCreateUsers: build.mutation({
      query: ({ customerId, body }) => ({
        url: `/customers/${customerId}/users/bulk`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    /**
     * PATCH /customers/:customerId/users/bulk
     * Bulk-update users (roles / tenant visibility) with per-item results.
     *
     * @param {{ customerId: string, body: { users: Array } }} params
     */
    bulkUpdateUsers: build.mutation({
      query: ({ customerId, body }) => ({
        url: `/customers/${customerId}/users/bulk`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    /**
     * POST /customers/:customerId/users/bulk-disable
     * Bulk-disable users with immediate trust/session revocation.
     *
     * @param {{ customerId: string, body: { userIds: string[] } }} params
     */
    bulkDisableUsers: build.mutation({
      query: ({ customerId, body }) => ({
        url: `/customers/${customerId}/users/bulk-disable`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
})

export const {
  useListUsersQuery,
  useLazyListUsersQuery,
  useListAssignableRolesQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDisableUserMutation,
  useEnableUserMutation,
  useDeleteUserMutation,
  useResendInvitationMutation,
  useBulkCreateUsersMutation,
  useBulkUpdateUsersMutation,
  useBulkDisableUsersMutation,
} = userApi
