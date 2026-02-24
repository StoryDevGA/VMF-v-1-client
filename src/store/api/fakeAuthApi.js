/**
 * Fake Auth API Slice
 *
 * Dev/testing endpoints for the fake Identity Plus auth flow.
 */

import { baseApi } from './baseApi.js'

export const fakeAuthApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    fakeAuthInvitation: build.query({
      query: (invitationId) => `/fake-auth/invitations/${invitationId}/public`,
      providesTags: (_result, _error, invitationId) => [
        { type: 'Invitation', id: invitationId },
      ],
    }),

    completeFakeAuth: build.mutation({
      query: (invitationId) => ({
        url: `/fake-auth/invitations/${invitationId}/complete`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, invitationId) => [
        { type: 'Invitation', id: 'LIST' },
        { type: 'Invitation', id: invitationId },
      ],
    }),
  }),
  overrideExisting: false,
})

export const { useFakeAuthInvitationQuery, useCompleteFakeAuthMutation } = fakeAuthApi
