/**
 * Invitation API Slice
 *
 * Super Admin invitation lifecycle endpoints.
 */

import { baseApi } from './baseApi.js'

const listTag = { type: 'Invitation', id: 'LIST' }

const getInvitationId = (invitation) => invitation?.id ?? invitation?._id

export const invitationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listInvitations: build.query({
      query: ({ page = 1, pageSize = 20, q = '', status = '' } = {}) => ({
        url: '/super-admin/invitations',
        params: {
          page,
          pageSize,
          ...(q ? { q } : {}),
          ...(status ? { status } : {}),
        },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data
                .map((invitation) => getInvitationId(invitation))
                .filter(Boolean)
                .map((id) => ({ type: 'Invitation', id })),
              listTag,
            ]
          : [listTag],
    }),

    createInvitation: build.mutation({
      query: (body) => ({
        url: '/super-admin/invitations',
        method: 'POST',
        body,
      }),
      invalidatesTags: [listTag],
    }),

    getInvitation: build.query({
      query: (invitationId) => `/super-admin/invitations/${invitationId}`,
      providesTags: (_result, _error, invitationId) => [
        { type: 'Invitation', id: invitationId },
      ],
    }),

    resendInvitation: build.mutation({
      query: (invitationId) => ({
        url: `/super-admin/invitations/${invitationId}/resend`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, invitationId) => [
        { type: 'Invitation', id: invitationId },
        listTag,
      ],
    }),

    revokeInvitation: build.mutation({
      query: ({ invitationId, reason, stepUpToken }) => ({
        url: `/super-admin/invitations/${invitationId}/revoke`,
        method: 'POST',
        body: { reason },
        headers: { 'X-Step-Up-Token': stepUpToken },
      }),
      invalidatesTags: (_result, _error, { invitationId }) => [
        { type: 'Invitation', id: invitationId },
        listTag,
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useListInvitationsQuery,
  useLazyListInvitationsQuery,
  useCreateInvitationMutation,
  useGetInvitationQuery,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
} = invitationApi
