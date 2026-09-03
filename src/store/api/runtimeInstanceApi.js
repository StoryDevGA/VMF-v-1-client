/**
 * Runtime Instance API Slice
 *
 * RTK Query endpoints for customer runtime work objects.
 */

import { baseApi } from './baseApi.js'

export const DEFAULT_RUNTIME_INSTANCE_TYPE = 'VALUE_NARRATIVE'
export const RUNTIME_HEAVY_READ_OPTIONS = Object.freeze({ maxRetries: 0 })

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

export const buildCreateRuntimeRevisionQuery = ({ runtimeInstanceId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/revisions`,
  method: 'POST',
  body,
})

export const getCreateRuntimeInstanceInvalidationTags = (_result, _error, { body } = {}) => [
  runtimeInstanceListTag(body?.runtimeType || DEFAULT_RUNTIME_INSTANCE_TYPE),
]

export const buildRuntimeInstanceDetailQuery = ({ runtimeInstanceId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}`

const buildRuntimeStateScopeParams = ({ customerId, tenantId } = {}) => {
  const params = new URLSearchParams()
  appendParam(params, 'customerId', customerId)
  appendParam(params, 'tenantId', tenantId)
  return params
}

const appendRuntimeStateScope = (url, scope) => {
  const query = buildRuntimeStateScopeParams(scope).toString()
  return `${url}${query ? `?${query}` : ''}`
}

export const buildRuntimeStateBootstrapQuery = ({ runtimeInstanceId, customerId, tenantId }) => {
  const params = buildRuntimeStateScopeParams({ customerId, tenantId })
  const query = params.toString()
  return `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/state/bootstrap${query ? `?${query}` : ''}`
}

export const buildRuntimeStateSectionSummaryQuery = ({
  runtimeInstanceId,
  sectionKey,
  customerId,
  tenantId,
}) => {
  const params = buildRuntimeStateScopeParams({ customerId, tenantId })
  const query = params.toString()
  return `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/state/sections/${encodeURIComponent(String(sectionKey ?? '').trim())}${query ? `?${query}` : ''}`
}

export const buildRuntimeStateEvidenceQuery = ({
  runtimeInstanceId,
  page = 1,
  pageSize = 25,
  reviewStatus = '',
  acceptanceState = '',
  customerId,
  tenantId,
}) => {
  const params = buildRuntimeStateScopeParams({ customerId, tenantId })
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  appendParam(params, 'reviewStatus', reviewStatus)
  appendParam(params, 'acceptanceState', acceptanceState)

  return `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/state/evidence?${params.toString()}`
}

export const buildRuntimeStateGraphManifestQuery = ({ runtimeInstanceId, customerId, tenantId }) => {
  const params = buildRuntimeStateScopeParams({ customerId, tenantId })
  const query = params.toString()
  return `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/state/graph-manifest${query ? `?${query}` : ''}`
}

export const buildRuntimeStateGraphProjectionQuery = ({ runtimeInstanceId, customerId, tenantId }) => {
  const params = buildRuntimeStateScopeParams({ customerId, tenantId })
  const query = params.toString()
  return `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/state/graph-projection${query ? `?${query}` : ''}`
}

export const buildRuntimeStateOutcomeHandoffReadinessQuery = ({ runtimeInstanceId, customerId, tenantId }) => {
  const params = buildRuntimeStateScopeParams({ customerId, tenantId })
  const query = params.toString()
  return `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/state/outcome-handoff/readiness${query ? `?${query}` : ''}`
}

export const buildRuntimeRendererQuery = ({ runtimeInstanceId, customerId, tenantId }) =>
  appendRuntimeStateScope(
    `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/renderer`,
    { customerId, tenantId },
  )

export const buildRuntimeTruthQualityQuery = ({ runtimeInstanceId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/truth-quality`

export const buildRuntimeOutputLabQuery = ({ runtimeInstanceId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/output-lab`

export const buildRuntimeOutputLabReadinessQuery = ({ runtimeInstanceId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/output-lab/readiness`

export const buildRuntimeOutputLabDefinitionsQuery = ({ runtimeInstanceId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/output-lab/definitions`

export const buildRuntimeOutcomeStudioQuery = ({ runtimeInstanceId, customerId, tenantId }) =>
  appendRuntimeStateScope(
    `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio`,
    { customerId, tenantId },
  )

export const buildRuntimeOutcomeStudioReadinessQuery = ({ runtimeInstanceId, customerId, tenantId }) =>
  appendRuntimeStateScope(
    `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/readiness`,
    { customerId, tenantId },
  )

export const buildCreateRuntimeOutcomeSessionQuery = ({ runtimeInstanceId, customerId, tenantId, body = {} }) => ({
  url: appendRuntimeStateScope(
    `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/sessions`,
    { customerId, tenantId },
  ),
  method: 'POST',
  body,
})

export const buildRuntimeOutcomeSessionQuery = ({ runtimeInstanceId, sessionId, customerId, tenantId }) =>
  appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/sessions/${
    encodeURIComponent(String(sessionId ?? '').trim())
  }`, { customerId, tenantId })

export const buildUpdateRuntimeOutcomeSessionFromLatestTruthQuery = ({
  runtimeInstanceId,
  sessionId,
  customerId,
  tenantId,
  body = {},
}) => ({
  url: appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/sessions/${
    encodeURIComponent(String(sessionId ?? '').trim())
  }/update-from-latest-truth`, { customerId, tenantId }),
  method: 'POST',
  body,
})

export const buildRuntimeOutcomeSessionAssetsQuery = ({ runtimeInstanceId, sessionId, customerId, tenantId }) =>
  appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/sessions/${
    encodeURIComponent(String(sessionId ?? '').trim())
  }/assets`, { customerId, tenantId })

export const buildRuntimeOutcomeAssetQuery = ({ runtimeInstanceId, outcomeAssetId, customerId, tenantId }) =>
  appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/assets/${
    encodeURIComponent(String(outcomeAssetId ?? '').trim())
  }`, { customerId, tenantId })

export const buildRuntimeOutcomeAssetPreviewQuery = ({ runtimeInstanceId, outcomeAssetId, customerId, tenantId }) =>
  appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/assets/${
    encodeURIComponent(String(outcomeAssetId ?? '').trim())
  }/preview`, { customerId, tenantId })

export const buildRuntimeOutcomeDraftPreviewQuery = ({ runtimeInstanceId, sessionId, draftId, customerId, tenantId }) =>
  appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/sessions/${
    encodeURIComponent(String(sessionId ?? '').trim())
  }/drafts/${encodeURIComponent(String(draftId ?? '').trim())}/preview`, { customerId, tenantId })

export const buildRuntimeOutcomeDraftCompareQuery = ({ runtimeInstanceId, sessionId, draftId, customerId, tenantId }) =>
  appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/sessions/${
    encodeURIComponent(String(sessionId ?? '').trim())
  }/drafts/${encodeURIComponent(String(draftId ?? '').trim())}/compare`, { customerId, tenantId })

export const buildRuntimeOutcomeAssetVersionQuery = ({
  runtimeInstanceId,
  outcomeAssetId,
  outcomeAssetVersionId,
  customerId,
  tenantId,
}) =>
  appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/assets/${
    encodeURIComponent(String(outcomeAssetId ?? '').trim())
  }/versions/${encodeURIComponent(String(outcomeAssetVersionId ?? '').trim())}`, { customerId, tenantId })

export const buildApproveRuntimeOutcomeDraftQuery = ({
  runtimeInstanceId,
  sessionId,
  draftId,
  customerId,
  tenantId,
  body = {},
}) => ({
  url: appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/sessions/${
    encodeURIComponent(String(sessionId ?? '').trim())
  }/drafts/${encodeURIComponent(String(draftId ?? '').trim())}/approve`, { customerId, tenantId }),
  method: 'POST',
  body,
})

export const buildReviseRuntimeOutcomeAssetQuery = ({
  runtimeInstanceId,
  sessionId,
  outcomeAssetId,
  customerId,
  tenantId,
  body = {},
}) => ({
  url: appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/sessions/${
    encodeURIComponent(String(sessionId ?? '').trim())
  }/assets/${encodeURIComponent(String(outcomeAssetId ?? '').trim())}/revise`, { customerId, tenantId }),
  method: 'POST',
  body,
})

export const buildDiscardRuntimeOutcomeDraftQuery = ({
  runtimeInstanceId,
  sessionId,
  draftId,
  customerId,
  tenantId,
  expectedUpdatedAt,
}) => ({
  url: appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/sessions/${
    encodeURIComponent(String(sessionId ?? '').trim())
  }/drafts/${encodeURIComponent(String(draftId ?? '').trim())}/discard`, { customerId, tenantId }),
  method: 'POST',
  body: { expectedUpdatedAt },
})

export const buildPublishRuntimeOutcomeAssetQuery = ({ runtimeInstanceId, outcomeAssetId, customerId, tenantId, body = {} }) => ({
  url: appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/assets/${
    encodeURIComponent(String(outcomeAssetId ?? '').trim())
  }/publish`, { customerId, tenantId }),
  method: 'POST',
  body,
})

export const buildExportRuntimeOutcomeAssetQuery = ({ runtimeInstanceId, outcomeAssetId, format, customerId, tenantId }) =>
  appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/assets/${
    encodeURIComponent(String(outcomeAssetId ?? '').trim())
  }/export/${encodeURIComponent(String(format ?? '').trim().toUpperCase())}`, { customerId, tenantId })

export const buildSubmitRuntimeOutcomeMessageQuery = ({ runtimeInstanceId, sessionId, customerId, tenantId, body = {} }) => ({
  url: appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/sessions/${
    encodeURIComponent(String(sessionId ?? '').trim())
  }/messages`, { customerId, tenantId }),
  method: 'POST',
  body,
})

export const buildGenerateRuntimeOutcomeResponseQuery = ({
  runtimeInstanceId,
  sessionId,
  messageId,
  customerId,
  tenantId,
  body = {},
}) => ({
  url: appendRuntimeStateScope(`/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/outcome-studio/sessions/${
    encodeURIComponent(String(sessionId ?? '').trim())
  }/messages/${encodeURIComponent(String(messageId ?? '').trim())}/generate-response`, { customerId, tenantId }),
  method: 'POST',
  body,
})

export const buildCreateRuntimeOutputRequestQuery = ({ runtimeInstanceId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/output-lab/requests`,
  method: 'POST',
  body,
})

export const buildGenerateRuntimeOutputRequestQuery = ({ runtimeInstanceId, outputRequestId, body = {} }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/output-lab/requests/${
    encodeURIComponent(String(outputRequestId ?? '').trim())
  }/generate`,
  method: 'POST',
  body,
})

export const buildRuntimeOutputAssetsQuery = ({ runtimeInstanceId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/output-lab/assets`

export const buildRuntimeOutputAssetQuery = ({ runtimeInstanceId, outputAssetId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/output-lab/assets/${
    encodeURIComponent(String(outputAssetId ?? '').trim())
  }`

export const buildPublishRuntimeOutputAssetQuery = ({ runtimeInstanceId, outputAssetId, body = {} }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/output-lab/assets/${
    encodeURIComponent(String(outputAssetId ?? '').trim())
  }/publish`,
  method: 'POST',
  body,
})

export const buildExportRuntimeOutputAssetQuery = ({ runtimeInstanceId, outputAssetId, format }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/output-lab/assets/${
    encodeURIComponent(String(outputAssetId ?? '').trim())
  }/export/${encodeURIComponent(String(format ?? '').trim().toUpperCase())}`

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

export const buildRuntimeDiscoveryContradictionsQuery = ({ runtimeInstanceId }) =>
  `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/discovery-contradictions`

export const buildReviewRuntimeDiscoveryContradictionQuery = ({ runtimeInstanceId, contradictionId, body }) => ({
  url: `${buildRuntimeDiscoveryContradictionsQuery({ runtimeInstanceId })}/${encodeURIComponent(String(contradictionId ?? '').trim())}/review`,
  method: 'PATCH',
  body,
})

export const buildUpdateRuntimeSectionEvidenceQuery = ({ runtimeInstanceId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/section-evidence`,
  method: 'PATCH',
  body,
})

export const buildClearRuntimeSectionEvidenceQuery = ({ runtimeInstanceId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/section-evidence/clear`,
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

export const buildReviewAllRuntimeSectionEvidenceQuery = ({ runtimeInstanceId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/section-evidence/review-all`,
  method: 'PATCH',
  body,
})

export const buildAcceptRuntimeSectionQuery = ({ runtimeInstanceId, body }) => ({
  url: `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/section-acceptance`,
  method: 'PATCH',
  body,
})

export const buildExecuteRuntimeActionQuery = ({ runtimeInstanceId, actionKey, customerId, tenantId, body }) => ({
  url: appendRuntimeStateScope(
    `/runtime-instances/${encodeURIComponent(String(runtimeInstanceId ?? '').trim())}/actions/${
      encodeURIComponent(String(actionKey ?? '').trim())
    }`,
    { customerId, tenantId },
  ),
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

export const getCreateRuntimeRevisionInvalidationTags = (result, _error, { runtimeInstanceId } = {}) => {
  const runtimeInstance = result?.data
    ?? result?.runtimeInstance
    ?? null
  const runtimeType = runtimeInstance?.runtimeType ?? DEFAULT_RUNTIME_INSTANCE_TYPE

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
export const getClearRuntimeSectionEvidenceInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getReviewRuntimeSectionEvidenceInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getReviewAllRuntimeSectionEvidenceInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getRebuildRuntimeIntelligenceGraphInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getCreateRuntimeOutcomeSessionInvalidationTags = getRuntimeInstanceDetailTags
export const getSubmitRuntimeOutcomeMessageInvalidationTags = getRuntimeInstanceDetailTags
export const getGenerateRuntimeOutcomeResponseInvalidationTags = getRuntimeInstanceDetailTags
export const getUpdateRuntimeOutcomeSessionFromLatestTruthInvalidationTags = getRuntimeInstanceDetailTags
export const getApproveRuntimeOutcomeDraftInvalidationTags = getRuntimeInstanceDetailTags
export const getReviseRuntimeOutcomeAssetInvalidationTags = getRuntimeInstanceDetailTags
export const getDiscardRuntimeOutcomeDraftInvalidationTags = getRuntimeInstanceDetailTags
export const getPublishRuntimeOutcomeAssetInvalidationTags = getRuntimeInstanceDetailTags
export const getCreateRuntimeOutputRequestInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getGenerateRuntimeOutputRequestInvalidationTags = getMutateRuntimeStateInvalidationTags
export const getPublishRuntimeOutputAssetInvalidationTags = getMutateRuntimeStateInvalidationTags

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

    createRuntimeRevision: build.mutation({
      query: buildCreateRuntimeRevisionQuery,
      invalidatesTags: getCreateRuntimeRevisionInvalidationTags,
    }),

    getRuntimeInstance: build.query({
      query: buildRuntimeInstanceDetailQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    getRuntimeStateBootstrap: build.query({
      query: buildRuntimeStateBootstrapQuery,
      providesTags: getRuntimeInstanceDetailTags,
      extraOptions: RUNTIME_HEAVY_READ_OPTIONS,
    }),

    getRuntimeStateSectionSummary: build.query({
      query: buildRuntimeStateSectionSummaryQuery,
      providesTags: getRuntimeInstanceDetailTags,
      extraOptions: RUNTIME_HEAVY_READ_OPTIONS,
    }),

    getRuntimeStateEvidence: build.query({
      query: buildRuntimeStateEvidenceQuery,
      providesTags: getRuntimeInstanceDetailTags,
      extraOptions: RUNTIME_HEAVY_READ_OPTIONS,
    }),

    getRuntimeStateGraphManifest: build.query({
      query: buildRuntimeStateGraphManifestQuery,
      providesTags: getRuntimeInstanceDetailTags,
      extraOptions: RUNTIME_HEAVY_READ_OPTIONS,
    }),

    getRuntimeStateGraphProjection: build.query({
      query: buildRuntimeStateGraphProjectionQuery,
      providesTags: getRuntimeInstanceDetailTags,
      extraOptions: RUNTIME_HEAVY_READ_OPTIONS,
    }),

    getRuntimeStateOutcomeHandoffReadiness: build.query({
      query: buildRuntimeStateOutcomeHandoffReadinessQuery,
      providesTags: getRuntimeInstanceDetailTags,
      extraOptions: RUNTIME_HEAVY_READ_OPTIONS,
    }),

    getRuntimeRenderer: build.query({
      query: buildRuntimeRendererQuery,
      providesTags: getRuntimeRendererTags,
      extraOptions: RUNTIME_HEAVY_READ_OPTIONS,
    }),

    getRuntimeTruthQuality: build.query({
      query: buildRuntimeTruthQualityQuery,
      providesTags: getRuntimeRendererTags,
      extraOptions: RUNTIME_HEAVY_READ_OPTIONS,
    }),

    getRuntimeOutputLab: build.query({
      query: buildRuntimeOutputLabQuery,
      providesTags: getRuntimeInstanceDetailTags,
      extraOptions: RUNTIME_HEAVY_READ_OPTIONS,
    }),

    getRuntimeOutputLabReadiness: build.query({
      query: buildRuntimeOutputLabReadinessQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    getRuntimeOutputLabDefinitions: build.query({
      query: buildRuntimeOutputLabDefinitionsQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    getRuntimeOutcomeStudio: build.query({
      query: buildRuntimeOutcomeStudioQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    getRuntimeOutcomeStudioReadiness: build.query({
      query: buildRuntimeOutcomeStudioReadinessQuery,
      providesTags: getRuntimeInstanceDetailTags,
      extraOptions: RUNTIME_HEAVY_READ_OPTIONS,
    }),

    createRuntimeOutcomeSession: build.mutation({
      query: buildCreateRuntimeOutcomeSessionQuery,
      invalidatesTags: getCreateRuntimeOutcomeSessionInvalidationTags,
    }),

    getRuntimeOutcomeSession: build.query({
      query: buildRuntimeOutcomeSessionQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    getRuntimeOutcomeSessionAssets: build.query({
      query: buildRuntimeOutcomeSessionAssetsQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    getRuntimeOutcomeAsset: build.query({
      query: buildRuntimeOutcomeAssetQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    getRuntimeOutcomeAssetPreview: build.query({
      query: buildRuntimeOutcomeAssetPreviewQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    getRuntimeOutcomeDraftPreview: build.query({
      query: buildRuntimeOutcomeDraftPreviewQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    getRuntimeOutcomeDraftCompare: build.query({
      query: buildRuntimeOutcomeDraftCompareQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    getRuntimeOutcomeAssetVersion: build.query({
      query: buildRuntimeOutcomeAssetVersionQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    approveRuntimeOutcomeDraft: build.mutation({
      query: buildApproveRuntimeOutcomeDraftQuery,
      invalidatesTags: getApproveRuntimeOutcomeDraftInvalidationTags,
    }),

    reviseRuntimeOutcomeAsset: build.mutation({
      query: buildReviseRuntimeOutcomeAssetQuery,
      invalidatesTags: getReviseRuntimeOutcomeAssetInvalidationTags,
    }),

    discardRuntimeOutcomeDraft: build.mutation({
      query: buildDiscardRuntimeOutcomeDraftQuery,
      invalidatesTags: getDiscardRuntimeOutcomeDraftInvalidationTags,
    }),

    publishRuntimeOutcomeAsset: build.mutation({
      query: buildPublishRuntimeOutcomeAssetQuery,
      invalidatesTags: getPublishRuntimeOutcomeAssetInvalidationTags,
    }),

    exportRuntimeOutcomeAsset: build.query({
      query: buildExportRuntimeOutcomeAssetQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    submitRuntimeOutcomeMessage: build.mutation({
      query: buildSubmitRuntimeOutcomeMessageQuery,
      invalidatesTags: getSubmitRuntimeOutcomeMessageInvalidationTags,
    }),

    generateRuntimeOutcomeResponse: build.mutation({
      query: buildGenerateRuntimeOutcomeResponseQuery,
      invalidatesTags: getGenerateRuntimeOutcomeResponseInvalidationTags,
    }),

    updateRuntimeOutcomeSessionFromLatestTruth: build.mutation({
      query: buildUpdateRuntimeOutcomeSessionFromLatestTruthQuery,
      invalidatesTags: getUpdateRuntimeOutcomeSessionFromLatestTruthInvalidationTags,
    }),

    createRuntimeOutputRequest: build.mutation({
      query: buildCreateRuntimeOutputRequestQuery,
      invalidatesTags: getCreateRuntimeOutputRequestInvalidationTags,
    }),

    generateRuntimeOutputRequest: build.mutation({
      query: buildGenerateRuntimeOutputRequestQuery,
      invalidatesTags: getGenerateRuntimeOutputRequestInvalidationTags,
    }),

    getRuntimeOutputAssets: build.query({
      query: buildRuntimeOutputAssetsQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    getRuntimeOutputAsset: build.query({
      query: buildRuntimeOutputAssetQuery,
      providesTags: getRuntimeInstanceDetailTags,
    }),

    publishRuntimeOutputAsset: build.mutation({
      query: buildPublishRuntimeOutputAssetQuery,
      invalidatesTags: getPublishRuntimeOutputAssetInvalidationTags,
    }),

    exportRuntimeOutputAsset: build.query({
      query: buildExportRuntimeOutputAssetQuery,
      providesTags: getRuntimeInstanceDetailTags,
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

    getRuntimeDiscoveryContradictions: build.query({
      query: buildRuntimeDiscoveryContradictionsQuery,
      extraOptions: RUNTIME_HEAVY_READ_OPTIONS,
      providesTags: getRuntimeRendererTags,
    }),

    reviewRuntimeDiscoveryContradiction: build.mutation({
      query: buildReviewRuntimeDiscoveryContradictionQuery,
      extraOptions: RUNTIME_HEAVY_READ_OPTIONS,
      invalidatesTags: getMutateRuntimeStateInvalidationTags,
    }),

    updateRuntimeSectionEvidence: build.mutation({
      query: buildUpdateRuntimeSectionEvidenceQuery,
      invalidatesTags: getUpdateRuntimeSectionEvidenceInvalidationTags,
    }),

    clearRuntimeSectionEvidence: build.mutation({
      query: buildClearRuntimeSectionEvidenceQuery,
      invalidatesTags: getClearRuntimeSectionEvidenceInvalidationTags,
    }),

    reviewRuntimeSectionEvidence: build.mutation({
      query: buildReviewRuntimeSectionEvidenceQuery,
      invalidatesTags: getReviewRuntimeSectionEvidenceInvalidationTags,
    }),

    reviewAllRuntimeSectionEvidence: build.mutation({
      query: buildReviewAllRuntimeSectionEvidenceQuery,
      invalidatesTags: getReviewAllRuntimeSectionEvidenceInvalidationTags,
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
  useCreateRuntimeRevisionMutation,
  useGetRuntimeInstanceQuery,
  useGetRuntimeStateBootstrapQuery,
  useGetRuntimeStateSectionSummaryQuery,
  useGetRuntimeStateEvidenceQuery,
  useGetRuntimeStateGraphManifestQuery,
  useGetRuntimeStateGraphProjectionQuery,
  useGetRuntimeStateOutcomeHandoffReadinessQuery,
  useGetRuntimeEvidenceQuery,
  useGetRuntimeOutputAssetQuery,
  useGetRuntimeOutputAssetsQuery,
  useGetRuntimeOutputLabQuery,
  useGetRuntimeOutputLabDefinitionsQuery,
  useGetRuntimeOutputLabReadinessQuery,
  useGetRuntimeOutcomeStudioQuery,
  useGetRuntimeOutcomeStudioReadinessQuery,
  useGetRuntimeOutcomeSessionQuery,
  useLazyGetRuntimeOutcomeSessionQuery,
  useGetRuntimeOutcomeSessionAssetsQuery,
  useGetRuntimeOutcomeAssetQuery,
  useLazyGetRuntimeOutcomeAssetQuery,
  useLazyGetRuntimeOutcomeAssetPreviewQuery,
  useLazyGetRuntimeOutcomeDraftPreviewQuery,
  useLazyGetRuntimeOutcomeDraftCompareQuery,
  useGetRuntimeOutcomeAssetVersionQuery,
  useApproveRuntimeOutcomeDraftMutation,
  useReviseRuntimeOutcomeAssetMutation,
  useDiscardRuntimeOutcomeDraftMutation,
  usePublishRuntimeOutcomeAssetMutation,
  useLazyExportRuntimeOutcomeAssetQuery,
  useCreateRuntimeOutcomeSessionMutation,
  useSubmitRuntimeOutcomeMessageMutation,
  useGenerateRuntimeOutcomeResponseMutation,
  useUpdateRuntimeOutcomeSessionFromLatestTruthMutation,
  useGetRuntimeTruthQualityQuery,
  useGetRuntimeIntelligenceGraphQuery,
  useGetRuntimeIntelligenceGraphCoverageQuery,
  useGetRuntimeIntelligenceGraphHealthQuery,
  useGetRuntimeIntelligenceGraphNodeLineageQuery,
  useGetRuntimeIntelligenceGraphSectionDependenciesQuery,
  useGetRuntimeRendererQuery,
  useCreateRuntimeOutputRequestMutation,
  useGenerateRuntimeOutputRequestMutation,
  useLazyExportRuntimeOutputAssetQuery,
  usePublishRuntimeOutputAssetMutation,
  useMutateRuntimeStateMutation,
  useRebuildRuntimeIntelligenceGraphMutation,
  useAcceptRuntimeDiscoveryMutation,
  useAcceptRuntimeSectionMutation,
  useClearRuntimeSectionEvidenceMutation,
  useResetRuntimeDiscoveryMutation,
  useReviewRuntimeDiscoveryEvidenceMutation,
  useGetRuntimeDiscoveryContradictionsQuery,
  useReviewRuntimeDiscoveryContradictionMutation,
  useReviewRuntimeSectionEvidenceMutation,
  useReviewAllRuntimeSectionEvidenceMutation,
  useUpdateRuntimeSectionEvidenceMutation,
  useUpdateRuntimeDiscoveryInputsMutation,
  useExecuteRuntimeActionMutation,
} = runtimeInstanceApi
