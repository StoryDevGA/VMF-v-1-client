/**
 * Runtime Instance API Slice
 *
 * RTK Query endpoints for customer runtime work objects.
 */

import { baseApi } from './baseApi.js'

export const DEFAULT_RUNTIME_INSTANCE_TYPE = 'VALUE_NARRATIVE'

export const runtimeInstanceListTag = (runtimeType = 'ALL') => ({
  type: 'RuntimeInstance',
  id: `LIST-${String(runtimeType || 'ALL').trim().toUpperCase() || 'ALL'}`,
})

export const getRuntimeInstanceId = (runtimeInstance) =>
  runtimeInstance?.id ?? runtimeInstance?._id ?? runtimeInstance?.runtimeInstanceKey

const appendParam = (params, key, value) => {
  const trimmed = String(value ?? '').trim()
  if (trimmed) params.set(key, trimmed)
}

export const buildRuntimeInstanceListQuery = ({
  customerId,
  tenantId,
  runtimeType,
  status = '',
  page = 1,
  pageSize = 20,
}) => {
  const params = new URLSearchParams()
  appendParam(params, 'customerId', customerId)
  appendParam(params, 'tenantId', tenantId)
  appendParam(params, 'runtimeType', runtimeType)
  appendParam(params, 'status', status)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))

  return `/runtime-instances?${params.toString()}`
}

export const getRuntimeInstanceListTags = (result, _error, { runtimeType }) =>
  result?.data
    ? [
        ...result.data
          .map((runtimeInstance) => getRuntimeInstanceId(runtimeInstance))
          .filter(Boolean)
          .map((id) => ({ type: 'RuntimeInstance', id })),
        runtimeInstanceListTag(runtimeType),
      ]
    : [runtimeInstanceListTag(runtimeType)]

export const buildCreateRuntimeInstanceQuery = ({ body }) => ({
  url: '/runtime-instances',
  method: 'POST',
  body,
})

export const getCreateRuntimeInstanceInvalidationTags = (_result, _error, { body } = {}) => [
  runtimeInstanceListTag(body?.runtimeType || DEFAULT_RUNTIME_INSTANCE_TYPE),
]

export const buildRuntimeInstanceDetailQuery = ({ runtimeInstanceId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}`

export const getRuntimeInstanceDetailTags = (_result, _error, { runtimeInstanceId }) => [
  { type: 'RuntimeInstance', id: runtimeInstanceId },
]

export const runtimeInstanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listRuntimeInstances: build.query({
      query: buildRuntimeInstanceListQuery,
      providesTags: getRuntimeInstanceListTags,
    }),

    createRuntimeInstance: build.mutation({
      query: buildCreateRuntimeInstanceQuery,
      invalidatesTags: getCreateRuntimeInstanceInvalidationTags,
    }),

    getRuntimeInstance: build.query({
      query: buildRuntimeInstanceDetailQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),
  }),
  overrideExisting: false,
})

export const {
  useListRuntimeInstancesQuery,
  useCreateRuntimeInstanceMutation,
  useGetRuntimeInstanceQuery,
} = runtimeInstanceApi
