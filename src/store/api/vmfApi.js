/**
 * VMF API Slice
 *
 * RTK Query endpoints for VMF catalogue management.
 *
 * Tenant-scoped routes:
 *   GET  /customers/:customerId/tenants/:tenantId/vmfs
 *   POST /customers/:customerId/tenants/:tenantId/vmfs
 *
 * VMF-scoped routes:
 *   GET    /vmfs/:vmfId
 *   PATCH  /vmfs/:vmfId
 *   DELETE /vmfs/:vmfId
 */

import { baseApi } from './baseApi.js'

const vmfListTag = { type: 'VMF', id: 'LIST' }

const getVmfId = (vmf) => vmf?.id ?? vmf?._id

export const vmfApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listVmfs: build.query({
      query: ({
        customerId,
        tenantId,
        q = '',
        status = '',
        lifecycleStatus = '',
        includeDeleted = false,
        page = 1,
        pageSize = 20,
      }) => {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('pageSize', String(pageSize))
        if (q) params.set('q', q)
        if (status) params.set('status', status)
        if (lifecycleStatus) params.set('lifecycleStatus', lifecycleStatus)
        if (includeDeleted) params.set('includeDeleted', 'true')

        return `/customers/${customerId}/tenants/${tenantId}/vmfs?${params.toString()}`
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data
                .map((vmf) => getVmfId(vmf))
                .filter(Boolean)
                .map((id) => ({ type: 'VMF', id })),
              vmfListTag,
            ]
          : [vmfListTag],
    }),

    createVmf: build.mutation({
      query: ({ customerId, tenantId, body }) => ({
        url: `/customers/${customerId}/tenants/${tenantId}/vmfs`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [vmfListTag],
    }),

    getVmf: build.query({
      query: ({ vmfId }) => `/vmfs/${vmfId}`,
      providesTags: (_result, _error, { vmfId }) => [{ type: 'VMF', id: vmfId }],
    }),

    updateVmf: build.mutation({
      query: ({ vmfId, body }) => ({
        url: `/vmfs/${vmfId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { vmfId }) => [
        vmfListTag,
        { type: 'VMF', id: vmfId },
      ],
    }),

    deleteVmf: build.mutation({
      query: ({ vmfId }) => ({
        url: `/vmfs/${vmfId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { vmfId }) => [
        vmfListTag,
        { type: 'VMF', id: vmfId },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useListVmfsQuery,
  useCreateVmfMutation,
  useGetVmfQuery,
  useUpdateVmfMutation,
  useDeleteVmfMutation,
} = vmfApi

