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

export const getRuntimeInstanceCacheIds = (runtimeInstance) => [
  runtimeInstance?.id,
  runtimeInstance?._id,
  runtimeInstance?.runtimeInstanceKey,
]
  .map((value) => String(value ?? '').trim())
  .filter(Boolean)
  .filter((value, index, values) => values.indexOf(value) === index)

const buildRuntimeInstanceTags = (ids) =>
  ids.map((id) => ({ type: 'RuntimeInstance', id }))

const appendParam = (params, key, value) => {
  const trimmed = String(value ?? '').trim()
  if (trimmed) params.set(key, trimmed)
}

export const buildRuntimeInstanceListQuery = ({
  customerId,
  tenantId,
  runtimeType,
  q = '',
  status = '',
  page = 1,
  pageSize = 20,
}) => {
  const params = new URLSearchParams()
  appendParam(params, 'customerId', customerId)
  appendParam(params, 'tenantId', tenantId)
  appendParam(params, 'runtimeType', runtimeType)
  appendParam(params, 'q', q)
  appendParam(params, 'status', status)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))

  return `/runtime-instances?${params.toString()}`
}

export const getRuntimeInstanceListTags = (result, _error, { runtimeType }) =>
  result?.data
    ? [
        ...result.data
          .flatMap(getRuntimeInstanceCacheIds)
          .filter((id, index, ids) => ids.indexOf(id) === index)
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

export const buildRuntimeRendererQuery = ({ runtimeInstanceId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/renderer`

export const buildRuntimeEvidenceQuery = ({ runtimeInstanceId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/evidence`

export const buildRuntimeIntelligenceGraphQuery = ({ runtimeInstanceId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/intelligence-graph`

export const buildRuntimeIntelligenceGraphHealthQuery = ({ runtimeInstanceId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/intelligence-graph/health`

export const buildRuntimeIntelligenceGraphCoverageQuery = ({ runtimeInstanceId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/intelligence-graph/coverage`

export const buildRuntimeIntelligenceGraphNodeLineageQuery = ({ runtimeInstanceId, nodeId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/intelligence-graph/nodes/${
    encodeURIComponent(String(nodeId ?? '').trim())
  }/lineage`

export const buildRuntimeIntelligenceGraphSectionDependenciesQuery = ({ runtimeInstanceId, sectionKey }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/intelligence-graph/sections/${
    encodeURIComponent(String(sectionKey ?? '').trim())
  }/dependencies`

export const buildRebuildRuntimeIntelligenceGraphQuery = ({ runtimeInstanceId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/intelligence-graph/rebuild`,
  method: 'POST',
  body,
})

export const buildMutateRuntimeStateQuery = ({ runtimeInstanceId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/data`,
  method: 'PATCH',
  body,
})

export const buildUpdateRuntimeDiscoveryInputsQuery = ({ runtimeInstanceId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/discovery-inputs`,
  method: 'PATCH',
  body,
})

export const buildAcceptRuntimeDiscoveryQuery = ({ runtimeInstanceId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/discovery-acceptance`,
  method: 'PATCH',
  body,
})

export const buildResetRuntimeDiscoveryQuery = ({ runtimeInstanceId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/discovery-reset`,
  method: 'PATCH',
  body,
})

export const buildReviewRuntimeDiscoveryEvidenceQuery = ({ runtimeInstanceId, evidenceObjectId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/discovery-evidence/${
    encodeURIComponent(String(evidenceObjectId ?? '').trim())
  }/review`,
  method: 'PATCH',
  body,
})

export const buildUpdateRuntimeSectionEvidenceQuery = ({ runtimeInstanceId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/section-evidence`,
  method: 'PATCH',
  body,
})

export const buildReviewRuntimeSectionEvidenceQuery = ({ runtimeInstanceId, evidenceObjectId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/section-evidence/${
    encodeURIComponent(String(evidenceObjectId ?? '').trim())
  }/review`,
  method: 'PATCH',
  body,
})

export const buildAcceptRuntimeSectionQuery = ({ runtimeInstanceId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/section-acceptance`,
  method: 'PATCH',
  body,
})

export const buildExecuteRuntimeActionQuery = ({ runtimeInstanceId, actionKey, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/actions/${
    encodeURIComponent(String(actionKey ?? '').trim())
  }`,
  method: 'POST',
  body,
})

export const getRuntimeInstanceDetailTags = (result, _error, { runtimeInstanceId }) =>
  buildRuntimeInstanceTags([
    String(runtimeInstanceId ?? '').trim(),
    ...getRuntimeInstanceCacheIds(result?.data ?? result),
  ].filter(Boolean).filter((id, index, ids) => ids.indexOf(id) === index))

export const getRuntimeRendererTags = (result, _error, { runtimeInstanceId }) => {
  const runtimeInstance = result?.data?.runtimeInstance
    ?? result?.runtimeInstance
    ?? null

  return buildRuntimeInstanceTags([
    String(runtimeInstanceId ?? '').trim(),
    ...getRuntimeInstanceCacheIds(runtimeInstance),
  ].filter(Boolean).filter((id, index, ids) => ids.indexOf(id) === index))
}

export const getMutateRuntimeStateInvalidationTags = (result, _error, { runtimeInstanceId, body } = {}) => {
  const runtimeInstance = result?.data?.runtimeInstance
    ?? result?.runtimeInstance
    ?? null
  const runtimeType = runtimeInstance?.runtimeType
    ?? body?.runtimeType
    ?? DEFAULT_RUNTIME_INSTANCE_TYPE

  return [
    ...buildRuntimeInstanceTags([
      String(runtimeInstanceId ?? '').trim(),
      ...getRuntimeInstanceCacheIds(runtimeInstance),
    ].filter(Boolean).filter((id, index, ids) => ids.indexOf(id) === index)),
    runtimeInstanceListTag(runtimeType),
  ]
}

export const getExecuteRuntimeActionInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getUpdateRuntimeDiscoveryInputsInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getAcceptRuntimeDiscoveryInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getResetRuntimeDiscoveryInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getReviewRuntimeDiscoveryEvidenceInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getAcceptRuntimeSectionInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getUpdateRuntimeSectionEvidenceInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getReviewRuntimeSectionEvidenceInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getRebuildRuntimeIntelligenceGraphInvalidationTags = getMutateRuntimeStateInvalidationTags

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

    getRuntimeRenderer: build.query({
      query: buildRuntimeRendererQuery,
      providesTags: getRuntimeRendererTags,
    }),

    getRuntimeEvidence: build.query({
      query: buildRuntimeEvidenceQuery,
      providesTags: getRuntimeRendererTags,
    }),

    getRuntimeIntelligenceGraph: build.query({
      query: buildRuntimeIntelligenceGraphQuery,
      providesTags: getRuntimeRendererTags,
    }),

    getRuntimeIntelligenceGraphHealth: build.query({
      query: buildRuntimeIntelligenceGraphHealthQuery,
      providesTags: getRuntimeRendererTags,
    }),

    getRuntimeIntelligenceGraphCoverage: build.query({
      query: buildRuntimeIntelligenceGraphCoverageQuery,
      providesTags: getRuntimeRendererTags,
    }),

    getRuntimeIntelligenceGraphNodeLineage: build.query({
      query: buildRuntimeIntelligenceGraphNodeLineageQuery,
      providesTags: getRuntimeRendererTags,
    }),

    getRuntimeIntelligenceGraphSectionDependencies: build.query({
      query: buildRuntimeIntelligenceGraphSectionDependenciesQuery,
      providesTags: getRuntimeRendererTags,
    }),

    mutateRuntimeState: build.mutation({
      query: buildMutateRuntimeStateQuery,
      invalidatesTags: getMutateRuntimeStateInvalidationTags,
    }),

    rebuildRuntimeIntelligenceGraph: build.mutation({
      query: buildRebuildRuntimeIntelligenceGraphQuery,
      invalidatesTags: getRebuildRuntimeIntelligenceGraphInvalidationTags,
    }),

    updateRuntimeDiscoveryInputs: build.mutation({
      query: buildUpdateRuntimeDiscoveryInputsQuery,
      invalidatesTags: getUpdateRuntimeDiscoveryInputsInvalidationTags,
    }),

    acceptRuntimeDiscovery: build.mutation({
      query: buildAcceptRuntimeDiscoveryQuery,
      invalidatesTags: getAcceptRuntimeDiscoveryInvalidationTags,
    }),

    resetRuntimeDiscovery: build.mutation({
      query: buildResetRuntimeDiscoveryQuery,
      invalidatesTags: getResetRuntimeDiscoveryInvalidationTags,
    }),

    reviewRuntimeDiscoveryEvidence: build.mutation({
      query: buildReviewRuntimeDiscoveryEvidenceQuery,
      invalidatesTags: getReviewRuntimeDiscoveryEvidenceInvalidationTags,
    }),

    updateRuntimeSectionEvidence: build.mutation({
      query: buildUpdateRuntimeSectionEvidenceQuery,
      invalidatesTags: getUpdateRuntimeSectionEvidenceInvalidationTags,
    }),

    reviewRuntimeSectionEvidence: build.mutation({
      query: buildReviewRuntimeSectionEvidenceQuery,
      invalidatesTags: getReviewRuntimeSectionEvidenceInvalidationTags,
    }),

    acceptRuntimeSection: build.mutation({
      query: buildAcceptRuntimeSectionQuery,
      invalidatesTags: getAcceptRuntimeSectionInvalidationTags,
    }),

    executeRuntimeAction: build.mutation({
      query: buildExecuteRuntimeActionQuery,
      invalidatesTags: getExecuteRuntimeActionInvalidationTags,
    }),
  }),
  overrideExisting: false,
})

export const {
  useListRuntimeInstancesQuery,
  useCreateRuntimeInstanceMutation,
  useGetRuntimeInstanceQuery,
  useGetRuntimeEvidenceQuery,
  useGetRuntimeIntelligenceGraphQuery,
  useGetRuntimeIntelligenceGraphCoverageQuery,
  useGetRuntimeIntelligenceGraphHealthQuery,
  useGetRuntimeIntelligenceGraphNodeLineageQuery,
  useGetRuntimeIntelligenceGraphSectionDependenciesQuery,
  useGetRuntimeRendererQuery,
  useMutateRuntimeStateMutation,
  useRebuildRuntimeIntelligenceGraphMutation,
  useAcceptRuntimeDiscoveryMutation,
  useAcceptRuntimeSectionMutation,
  useResetRuntimeDiscoveryMutation,
  useReviewRuntimeDiscoveryEvidenceMutation,
  useReviewRuntimeSectionEvidenceMutation,
  useUpdateRuntimeSectionEvidenceMutation,
  useUpdateRuntimeDiscoveryInputsMutation,
  useExecuteRuntimeActionMutation,
} = runtimeInstanceApi
