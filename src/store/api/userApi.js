/**
 * User API Slice (RTK Query)
 *
 * Injects user-management endpoints into the base API.
 * Handles listing, creating, updating, disabling, deleting users,
 * and resending Identity Plus invitations.
 *
 * All user endpoints align with BACKEND-SPEC §9.3.
 */

import { baseApi } from './baseApi.js'

export const userApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * GET /customers/:customerId/users
     * Paginated user list with optional search and status filter.
     *
     * @param {{ customerId: string, q?: string, status?: string, page?: number, pageSize?: number }} params
     */
    listUsers: build.query({
      query: ({ customerId, q, status, page = 1, pageSize = 20 }) => {
        const params = new URLSearchParams()
        if (q) params.set('q', q)
        if (status) params.set('status', status)
        params.set('page', String(page))
        params.set('pageSize', String(pageSize))
        return `/customers/${customerId}/users?${params.toString()}`
      },
      providesTags: (result) =>
        result?.data?.users
          ? [
              ...result.data.users.map((u) => ({ type: 'User', id: u._id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    /**
     * POST /customers/:customerId/users
     * Creates a new user and triggers an Identity Plus invitation.
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
     * PATCH /users/:userId
     * Updates user roles, tenant memberships, or VMF grants.
     *
     * @param {{ userId: string, body: { roles?: string[], tenantMemberships?: Array, vmfGrants?: Array } }} params
     */
    updateUser: build.mutation({
      query: ({ userId, body }) => ({
        url: `/users/${userId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'User', id: userId },
        { type: 'User', id: 'LIST' },
      ],
    }),

    /**
     * POST /users/:userId/disable
     * Disables a user and revokes Identity Plus trust.
     *
     * @param {{ userId: string }} params
     */
    disableUser: build.mutation({
      query: ({ userId }) => ({
        url: `/users/${userId}/disable`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'User', id: userId },
        { type: 'User', id: 'LIST' },
      ],
    }),

    /**
     * DELETE /users/:userId
     * Permanently deletes a disabled user.
     *
     * @param {{ userId: string }} params
     */
    deleteUser: build.mutation({
      query: ({ userId }) => ({
        url: `/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    /**
     * POST /users/:userId/resend-invitation
     * Resends the Identity Plus invitation for an untrusted user.
     *
     * @param {{ userId: string }} params
     */
    resendInvitation: build.mutation({
      query: ({ userId }) => ({
        url: `/users/${userId}/resend-invitation`,
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
  useCreateUserMutation,
  useUpdateUserMutation,
  useDisableUserMutation,
  useDeleteUserMutation,
  useResendInvitationMutation,
  useBulkCreateUsersMutation,
  useBulkUpdateUsersMutation,
  useBulkDisableUsersMutation,
} = userApi
