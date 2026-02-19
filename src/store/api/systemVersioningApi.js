/**
 * System Versioning Policy API Slice
 *
 * Super Admin governance policy endpoints.
 */

import { baseApi } from './baseApi.js'

const policyListTag = { type: 'SystemVersioningPolicy', id: 'LIST' }
const activePolicyTag = { type: 'SystemVersioningPolicy', id: 'ACTIVE' }

const getPolicyId = (policy) => policy?.id ?? policy?._id

export const systemVersioningApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getActivePolicy: build.query({
      query: () => '/super-admin/system-versioning-policy',
      providesTags: (result) => {
        const policyId = getPolicyId(result?.data)
        return policyId
          ? [activePolicyTag, { type: 'SystemVersioningPolicy', id: policyId }]
          : [activePolicyTag]
      },
    }),

    getPolicyHistory: build.query({
      query: ({ page = 1, pageSize = 20 } = {}) => ({
        url: '/super-admin/system-versioning-policy/history',
        params: { page, pageSize },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data
                .map((policy) => getPolicyId(policy))
                .filter(Boolean)
                .map((id) => ({ type: 'SystemVersioningPolicy', id })),
              policyListTag,
            ]
          : [policyListTag],
    }),

    createPolicy: build.mutation({
      query: ({ body, stepUpToken }) => ({
        url: '/super-admin/system-versioning-policy',
        method: 'POST',
        body,
        headers: { 'X-Step-Up-Token': stepUpToken },
      }),
      invalidatesTags: [activePolicyTag, policyListTag],
    }),

    updatePolicyMetadata: build.mutation({
      query: ({ policyId, body, stepUpToken }) => ({
        url: `/super-admin/system-versioning-policy/${policyId}`,
        method: 'PATCH',
        body,
        headers: { 'X-Step-Up-Token': stepUpToken },
      }),
      invalidatesTags: (_result, _error, { policyId }) => [
        activePolicyTag,
        policyListTag,
        { type: 'SystemVersioningPolicy', id: policyId },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetActivePolicyQuery,
  useGetPolicyHistoryQuery,
  useCreatePolicyMutation,
  useUpdatePolicyMetadataMutation,
} = systemVersioningApi
