import { baseApi } from './baseApi.js'

const OUTCOME_KNOWLEDGE_PACKS_BASE_PATH = '/super-admin/outcome-studio/knowledge-packs'

export const outcomeKnowledgePackListTag = { type: 'OutcomeKnowledgePack', id: 'LIST' }
export const outcomeKnowledgePackResolutionTag = {
  type: 'OutcomeKnowledgePackResolution',
  id: 'CURRENT',
}

const normalizeText = (value) => String(value ?? '').trim()
const normalizeToken = (value) => normalizeText(value).toUpperCase()

const appendParam = (params, key, value) => {
  const trimmed = normalizeText(value)
  if (trimmed) params[key] = trimmed
}

const encodePathSegment = (value) => encodeURIComponent(normalizeText(value))

export const buildOutcomeKnowledgePackListQuery = ({
  page = 1,
  pageSize = 20,
  q = '',
  packType = '',
  packKey = '',
  status = '',
  sortBy = '',
  sortOrder = '',
} = {}) => {
  const params = {
    page,
    pageSize,
  }

  appendParam(params, 'q', q)
  appendParam(params, 'packType', packType)
  appendParam(params, 'packKey', packKey)
  appendParam(params, 'status', status)
  appendParam(params, 'sortBy', sortBy)
  appendParam(params, 'sortOrder', sortOrder)

  return {
    url: OUTCOME_KNOWLEDGE_PACKS_BASE_PATH,
    params,
  }
}

export const buildOutcomeKnowledgePackDetailQuery = ({ packId }) =>
  `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/${encodePathSegment(packId)}`

export const buildOutcomeKnowledgePackVersionQuery = ({ packId, versionId }) =>
  `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/${encodePathSegment(packId)}/versions/${encodePathSegment(versionId)}`

export const buildPreviewOutcomeKnowledgePackVersionContentQuery = ({ packId, versionId }) =>
  `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/${encodePathSegment(packId)}/versions/${
    encodePathSegment(versionId)
  }/content-preview`

export const buildCreateOutcomeKnowledgePackVersionQuery = ({
  packId,
  semanticVersion,
  schemaVersion = '1.0.0',
  sourceFilename = '',
  content = '',
}) => ({
  url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/${encodePathSegment(packId)}/versions`,
  method: 'POST',
  body: {
    semanticVersion: normalizeText(semanticVersion),
    schemaVersion: normalizeText(schemaVersion) || '1.0.0',
    contentFormat: 'YAML',
    ...(normalizeText(sourceFilename) ? { sourceFilename: normalizeText(sourceFilename) } : {}),
    content,
  },
})

export const buildImportOutcomeKnowledgePackStarterVersionQuery = ({ packId }) => ({
  url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/${encodePathSegment(packId)}/starter-import`,
  method: 'POST',
  body: {},
})

export const buildValidateOutcomeKnowledgePackVersionQuery = ({ packId, versionId }) => ({
  url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/${encodePathSegment(packId)}/versions/${
    encodePathSegment(versionId)
  }/validate`,
  method: 'POST',
  body: {},
})

export const buildActivateOutcomeKnowledgePackVersionQuery = ({
  packId,
  versionId,
  scopeType = 'GLOBAL',
  frameworkKey = '',
  runtimeType = '',
  packageKey = '',
  packageVersion = '',
  environmentKey = '',
}) => {
  const body = {
    scopeType: normalizeToken(scopeType) || 'GLOBAL',
  }

  appendParam(body, 'frameworkKey', frameworkKey)
  appendParam(body, 'runtimeType', runtimeType)
  appendParam(body, 'packageKey', packageKey)
  appendParam(body, 'packageVersion', packageVersion)
  appendParam(body, 'environmentKey', environmentKey)

  return {
    url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/${encodePathSegment(packId)}/versions/${
      encodePathSegment(versionId)
    }/activate`,
    method: 'POST',
    body,
  }
}

export const buildDeprecateOutcomeKnowledgePackVersionQuery = ({ packId, versionId }) => ({
  url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/${encodePathSegment(packId)}/versions/${
    encodePathSegment(versionId)
  }/deprecate`,
  method: 'POST',
  body: {},
})

export const buildDisableOutcomeKnowledgePackVersionQuery = ({ packId, versionId }) => ({
  url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/${encodePathSegment(packId)}/versions/${
    encodePathSegment(versionId)
  }/disable`,
  method: 'POST',
  body: {},
})

export const buildRollbackOutcomeKnowledgePackQuery = ({
  packId,
  versionId,
  rollbackReason = '',
  scopeType = 'GLOBAL',
  frameworkKey = '',
  runtimeType = '',
  packageKey = '',
  packageVersion = '',
  environmentKey = '',
}) => {
  const body = {
    versionId: normalizeText(versionId),
    scopeType: normalizeToken(scopeType) || 'GLOBAL',
  }

  appendParam(body, 'rollbackReason', rollbackReason)
  appendParam(body, 'frameworkKey', frameworkKey)
  appendParam(body, 'runtimeType', runtimeType)
  appendParam(body, 'packageKey', packageKey)
  appendParam(body, 'packageVersion', packageVersion)
  appendParam(body, 'environmentKey', environmentKey)

  return {
    url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/${encodePathSegment(packId)}/rollback`,
    method: 'POST',
    body,
  }
}

export const buildPreviewOutcomeKnowledgePackResolutionQuery = ({
  frameworkKey = '',
  runtimeType = '',
  packageKey = '',
  packageVersion = '',
  environmentKey = '',
} = {}) => {
  const params = {}

  appendParam(params, 'frameworkKey', frameworkKey)
  appendParam(params, 'runtimeType', runtimeType)
  appendParam(params, 'packageKey', packageKey)
  appendParam(params, 'packageVersion', packageVersion)
  appendParam(params, 'environmentKey', environmentKey)

  return {
    url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/resolution-preview`,
    params,
  }
}

const getPackCacheIds = (pack) => [
  pack?.id,
  pack?.packId,
  pack?.packKey,
]
  .map(normalizeText)
  .filter(Boolean)
  .filter((id, index, ids) => ids.indexOf(id) === index)

const getListTags = (result) =>
  result?.data
    ? [
        ...result.data
          .flatMap(getPackCacheIds)
          .map((id) => ({ type: 'OutcomeKnowledgePack', id })),
        outcomeKnowledgePackListTag,
      ]
    : [outcomeKnowledgePackListTag]

const getPackTags = (_result, _error, { packId }) => [
  outcomeKnowledgePackListTag,
  { type: 'OutcomeKnowledgePack', id: normalizeText(packId) },
]

const getMutationInvalidationTags = (_result, _error, { packId }) => [
  outcomeKnowledgePackListTag,
  outcomeKnowledgePackResolutionTag,
  { type: 'OutcomeKnowledgePack', id: normalizeText(packId) },
]

export const outcomeKnowledgePacksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listOutcomeKnowledgePacks: build.query({
      query: buildOutcomeKnowledgePackListQuery,
      providesTags: getListTags,
    }),

    getOutcomeKnowledgePack: build.query({
      query: buildOutcomeKnowledgePackDetailQuery,
      providesTags: getPackTags,
    }),

    getOutcomeKnowledgePackVersion: build.query({
      query: buildOutcomeKnowledgePackVersionQuery,
      providesTags: getPackTags,
    }),

    previewOutcomeKnowledgePackVersionContent: build.query({
      query: buildPreviewOutcomeKnowledgePackVersionContentQuery,
      providesTags: getPackTags,
    }),

    createOutcomeKnowledgePackVersion: build.mutation({
      query: buildCreateOutcomeKnowledgePackVersionQuery,
      invalidatesTags: getMutationInvalidationTags,
    }),

    importOutcomeKnowledgePackStarterVersion: build.mutation({
      query: buildImportOutcomeKnowledgePackStarterVersionQuery,
      invalidatesTags: getMutationInvalidationTags,
    }),

    validateOutcomeKnowledgePackVersion: build.mutation({
      query: buildValidateOutcomeKnowledgePackVersionQuery,
      invalidatesTags: getMutationInvalidationTags,
    }),

    activateOutcomeKnowledgePackVersion: build.mutation({
      query: buildActivateOutcomeKnowledgePackVersionQuery,
      invalidatesTags: getMutationInvalidationTags,
    }),

    deprecateOutcomeKnowledgePackVersion: build.mutation({
      query: buildDeprecateOutcomeKnowledgePackVersionQuery,
      invalidatesTags: getMutationInvalidationTags,
    }),

    disableOutcomeKnowledgePackVersion: build.mutation({
      query: buildDisableOutcomeKnowledgePackVersionQuery,
      invalidatesTags: getMutationInvalidationTags,
    }),

    rollbackOutcomeKnowledgePack: build.mutation({
      query: buildRollbackOutcomeKnowledgePackQuery,
      invalidatesTags: getMutationInvalidationTags,
    }),

    previewOutcomeKnowledgePackResolution: build.query({
      query: buildPreviewOutcomeKnowledgePackResolutionQuery,
      providesTags: [outcomeKnowledgePackResolutionTag],
    }),
  }),
  overrideExisting: false,
})

export const {
  useListOutcomeKnowledgePacksQuery,
  useGetOutcomeKnowledgePackQuery,
  useGetOutcomeKnowledgePackVersionQuery,
  useLazyPreviewOutcomeKnowledgePackVersionContentQuery,
  useCreateOutcomeKnowledgePackVersionMutation,
  useImportOutcomeKnowledgePackStarterVersionMutation,
  useDeprecateOutcomeKnowledgePackVersionMutation,
  useDisableOutcomeKnowledgePackVersionMutation,
  useValidateOutcomeKnowledgePackVersionMutation,
  useActivateOutcomeKnowledgePackVersionMutation,
  useRollbackOutcomeKnowledgePackMutation,
  usePreviewOutcomeKnowledgePackResolutionQuery,
} = outcomeKnowledgePacksApi
