import { baseApi } from './baseApi.js'

const OUTCOME_KNOWLEDGE_PACKS_BASE_PATH = '/super-admin/outcome-studio/knowledge-packs'

export const outcomeKnowledgePackListTag = { type: 'OutcomeKnowledgePack', id: 'LIST' }
export const outcomeKnowledgePackResolutionTag = {
  type: 'OutcomeKnowledgePackResolution',
  id: 'CURRENT',
}
export const outcomeKnowledgePackManifestListTag = {
  type: 'OutcomeKnowledgePackManifest',
  id: 'LIST',
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

export const buildImportOutcomeKnowledgePackSourceDocumentDraftQuery = ({
  packType,
  packKey,
  label,
  description = '',
  purposeCategory = '',
  semanticVersion,
  schemaVersion = '1.0.0',
  sourceAuthority = '',
  executionMode = 'PROVIDER_CONTEXT',
  visibility = 'PLATFORM',
  customerId = '',
  tenantId = '',
  contentFormat = '',
  sourceDocument = {},
  extractedText = '',
} = {}) => {
  const body = {
    packType: normalizeToken(packType),
    packKey: normalizeText(packKey),
    label: normalizeText(label),
    semanticVersion: normalizeText(semanticVersion),
    schemaVersion: normalizeText(schemaVersion) || '1.0.0',
    executionMode: normalizeToken(executionMode) || 'PROVIDER_CONTEXT',
    visibility: normalizeToken(visibility) || 'PLATFORM',
    sourceDocument: {
      filename: normalizeText(sourceDocument.filename),
    },
  }

  appendParam(body, 'description', description)
  appendParam(body, 'purposeCategory', purposeCategory)
  appendParam(body, 'sourceAuthority', sourceAuthority)
  appendParam(body, 'customerId', customerId)
  appendParam(body, 'tenantId', tenantId)
  appendParam(body, 'contentFormat', contentFormat)
  appendParam(body, 'extractedText', extractedText)
  appendParam(body.sourceDocument, 'contentType', sourceDocument.contentType)
  appendParam(body.sourceDocument, 'fileExtension', sourceDocument.fileExtension)
  appendParam(body.sourceDocument, 'contentBase64', sourceDocument.contentBase64)
  if (Number.isFinite(Number(sourceDocument.sizeBytes))) {
    body.sourceDocument.sizeBytes = Number(sourceDocument.sizeBytes)
  }

  return {
    url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/source-document-import`,
    method: 'POST',
    body,
  }
}

export const buildDeleteOutcomeKnowledgePackQuery = ({ packId }) => ({
  url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/${encodePathSegment(packId)}`,
  method: 'DELETE',
})

export const buildValidateOutcomeKnowledgePackVersionQuery = ({ packId, versionId }) => ({
  url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/${encodePathSegment(packId)}/versions/${
    encodePathSegment(versionId)
  }/validate`,
  method: 'POST',
  body: {},
})

export const buildUpdateOutcomeKnowledgePackReviewQuery = ({
  packId,
  versionId,
  reviewStatus,
}) => ({
  url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/${encodePathSegment(packId)}/versions/${
    encodePathSegment(versionId)
  }/review`,
  method: 'POST',
  body: {
    reviewStatus: normalizeToken(reviewStatus),
  },
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

export const buildOutcomeKnowledgePackManifestListQuery = ({
  page = 1,
  pageSize = 100,
  q = '',
  manifestKey = '',
  status = '',
  workspaceType = '',
  frameworkKey = '',
  runtimeType = '',
  packageKey = '',
  outputKey = '',
  sortBy = '',
  sortOrder = '',
} = {}) => {
  const params = { page, pageSize }

  appendParam(params, 'q', q)
  appendParam(params, 'manifestKey', manifestKey)
  appendParam(params, 'status', status)
  appendParam(params, 'workspaceType', workspaceType)
  appendParam(params, 'frameworkKey', frameworkKey)
  appendParam(params, 'runtimeType', runtimeType)
  appendParam(params, 'packageKey', packageKey)
  appendParam(params, 'outputKey', outputKey)
  appendParam(params, 'sortBy', sortBy)
  appendParam(params, 'sortOrder', sortOrder)

  return {
    url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/manifests`,
    params,
  }
}

export const buildOutcomeKnowledgePackManifestDetailQuery = ({ manifestId }) =>
  `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/manifests/${encodePathSegment(manifestId)}`

export const buildPreviewOutcomeKnowledgePackManifestResolutionQuery = ({
  manifestId,
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
    url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/manifests/${
      encodePathSegment(manifestId)
    }/resolution-preview`,
    params,
  }
}

export const buildPreviewOutcomeKnowledgePackReasoningContextQuery = ({
  manifestId,
  outputKey = '',
  contextCategories = [],
  frameworkKey = '',
  runtimeType = '',
  packageKey = '',
  packageVersion = '',
  environmentKey = '',
  customerId = '',
  tenantId = '',
} = {}) => {
  const params = {}
  const normalizedContextCategories = Array.isArray(contextCategories)
    ? contextCategories.map(normalizeToken).filter(Boolean).join(',')
    : normalizeText(contextCategories)

  appendParam(params, 'outputKey', outputKey)
  appendParam(params, 'contextCategories', normalizedContextCategories)
  appendParam(params, 'frameworkKey', frameworkKey)
  appendParam(params, 'runtimeType', runtimeType)
  appendParam(params, 'packageKey', packageKey)
  appendParam(params, 'packageVersion', packageVersion)
  appendParam(params, 'environmentKey', environmentKey)
  appendParam(params, 'customerId', customerId)
  appendParam(params, 'tenantId', tenantId)

  return {
    url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/manifests/${
      encodePathSegment(manifestId)
    }/reasoning-context-preview`,
    params,
  }
}

export const buildCompareOutcomeKnowledgePackManifestsQuery = ({
  manifestId,
  targetManifestId,
} = {}) =>
  `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/manifests/${
    encodePathSegment(manifestId)
  }/compare/${encodePathSegment(targetManifestId)}`

const normalizeManifestPack = (pack = {}) => ({
  packCategory: normalizeToken(pack.packCategory),
  purposeCategory: normalizeToken(pack.purposeCategory),
  packType: normalizeToken(pack.packType),
  packKey: normalizeText(pack.packKey),
  label: normalizeText(pack.label),
  executionMode: normalizeToken(pack.executionMode) || 'PROVIDER_CONTEXT',
  ...(typeof pack.required === 'boolean' ? { required: pack.required } : {}),
  dependencyKeys: Array.isArray(pack.dependencyKeys) ? pack.dependencyKeys.map(normalizeText).filter(Boolean) : [],
  sourceAuthority: normalizeText(pack.sourceAuthority),
  metadata: pack.metadata && typeof pack.metadata === 'object' ? pack.metadata : {},
})

const normalizeManifestBody = (
  body = {},
  {
    includeIdentity = true,
    partial = false,
  } = {},
) => {
  const normalized = {}
  const assignIfPresent = (key, value) => {
    if (!partial || Object.prototype.hasOwnProperty.call(body, key)) {
      normalized[key] = value
    }
  }

  assignIfPresent('manifestName', normalizeText(body.manifestName))
  assignIfPresent('manifestType', normalizeToken(body.manifestType) || 'FRAMEWORK_RUNTIME')
  assignIfPresent('description', normalizeText(body.description))
  assignIfPresent('workspaceType', normalizeToken(body.workspaceType) || 'OUTCOME')
  assignIfPresent('frameworkKey', normalizeToken(body.frameworkKey))
  assignIfPresent('runtimeType', normalizeToken(body.runtimeType))
  assignIfPresent('packageKey', normalizeText(body.packageKey))
  assignIfPresent('outputKey', normalizeText(body.outputKey))

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'mandatoryPacks')) {
    normalized.mandatoryPacks = Array.isArray(body.mandatoryPacks)
      ? body.mandatoryPacks.map(normalizeManifestPack)
      : []
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'optionalPacks')) {
    normalized.optionalPacks = Array.isArray(body.optionalPacks)
      ? body.optionalPacks.map(normalizeManifestPack)
      : []
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'validationPacks')) {
    normalized.validationPacks = Array.isArray(body.validationPacks)
      ? body.validationPacks.map(normalizeManifestPack)
      : []
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'blockedPacks')) {
    normalized.blockedPacks = Array.isArray(body.blockedPacks)
      ? body.blockedPacks.map(normalizeManifestPack)
      : []
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'resolutionPolicy')) {
    normalized.resolutionPolicy =
      body.resolutionPolicy && typeof body.resolutionPolicy === 'object'
        ? body.resolutionPolicy
        : {}
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'validationPolicy')) {
    normalized.validationPolicy =
      body.validationPolicy && typeof body.validationPolicy === 'object'
        ? body.validationPolicy
        : {}
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'sourceMetadata')) {
    normalized.sourceMetadata =
      body.sourceMetadata && typeof body.sourceMetadata === 'object' ? body.sourceMetadata : {}
  }

  if (includeIdentity) {
    normalized.manifestKey = normalizeText(body.manifestKey)
    normalized.semanticVersion = normalizeText(body.semanticVersion)
    normalized.scopeType = normalizeToken(body.scopeType) || 'GLOBAL'
    appendParam(normalized, 'scopeKey', body.scopeKey)
  }

  return normalized
}

export const buildCreateOutcomeKnowledgePackManifestQuery = (body = {}) => ({
  url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/manifests`,
  method: 'POST',
  body: normalizeManifestBody(body),
})

export const buildUpdateOutcomeKnowledgePackManifestQuery = ({
  manifestId,
  ...body
} = {}) => ({
  url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/manifests/${encodePathSegment(manifestId)}`,
  method: 'PUT',
  body: normalizeManifestBody(body, { includeIdentity: false, partial: true }),
})

export const buildCloneOutcomeKnowledgePackManifestQuery = ({
  manifestId,
  ...body
} = {}) => ({
  url: `${OUTCOME_KNOWLEDGE_PACKS_BASE_PATH}/manifests/${encodePathSegment(manifestId)}/clone`,
  method: 'POST',
  body: normalizeManifestBody(body, { partial: true }),
})

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

const getManifestCacheIds = (manifest) => [
  manifest?.id,
  manifest?.manifestId,
  manifest?.manifestKey,
]
  .map(normalizeText)
  .filter(Boolean)
  .filter((id, index, ids) => ids.indexOf(id) === index)

const getManifestListTags = (result) =>
  result?.data
    ? [
        ...result.data
          .flatMap(getManifestCacheIds)
          .map((id) => ({ type: 'OutcomeKnowledgePackManifest', id })),
        outcomeKnowledgePackManifestListTag,
      ]
    : [outcomeKnowledgePackManifestListTag]

const getManifestTags = (_result, _error, { manifestId }) => [
  outcomeKnowledgePackManifestListTag,
  { type: 'OutcomeKnowledgePackManifest', id: normalizeText(manifestId) },
]

const getManifestMutationTags = (_result, _error, { manifestId, manifestKey } = {}) => [
  outcomeKnowledgePackManifestListTag,
  outcomeKnowledgePackResolutionTag,
  ...(normalizeText(manifestId)
    ? [{ type: 'OutcomeKnowledgePackManifest', id: normalizeText(manifestId) }]
    : []),
  ...(normalizeText(manifestKey)
    ? [{ type: 'OutcomeKnowledgePackManifest', id: normalizeText(manifestKey) }]
    : []),
]

const getMutationInvalidationTags = (_result, _error, { packId }) => [
  outcomeKnowledgePackListTag,
  outcomeKnowledgePackResolutionTag,
  { type: 'OutcomeKnowledgePack', id: normalizeText(packId) },
]

const getSourceDocumentImportInvalidationTags = (_result, _error, { packKey }) => [
  outcomeKnowledgePackListTag,
  outcomeKnowledgePackResolutionTag,
  { type: 'OutcomeKnowledgePack', id: normalizeText(packKey) },
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

    importOutcomeKnowledgePackSourceDocumentDraft: build.mutation({
      query: buildImportOutcomeKnowledgePackSourceDocumentDraftQuery,
      invalidatesTags: getSourceDocumentImportInvalidationTags,
    }),

    deleteOutcomeKnowledgePack: build.mutation({
      query: buildDeleteOutcomeKnowledgePackQuery,
      invalidatesTags: getMutationInvalidationTags,
    }),

    validateOutcomeKnowledgePackVersion: build.mutation({
      query: buildValidateOutcomeKnowledgePackVersionQuery,
      invalidatesTags: getMutationInvalidationTags,
    }),

    updateOutcomeKnowledgePackReview: build.mutation({
      query: buildUpdateOutcomeKnowledgePackReviewQuery,
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

    listOutcomeKnowledgePackManifests: build.query({
      query: buildOutcomeKnowledgePackManifestListQuery,
      providesTags: getManifestListTags,
    }),

    getOutcomeKnowledgePackManifest: build.query({
      query: buildOutcomeKnowledgePackManifestDetailQuery,
      providesTags: getManifestTags,
    }),

    previewOutcomeKnowledgePackManifestResolution: build.query({
      query: buildPreviewOutcomeKnowledgePackManifestResolutionQuery,
      providesTags: getManifestTags,
    }),

    previewOutcomeKnowledgePackReasoningContext: build.query({
      query: buildPreviewOutcomeKnowledgePackReasoningContextQuery,
      providesTags: getManifestTags,
    }),

    compareOutcomeKnowledgePackManifests: build.query({
      query: buildCompareOutcomeKnowledgePackManifestsQuery,
      providesTags: getManifestTags,
    }),

    createOutcomeKnowledgePackManifest: build.mutation({
      query: buildCreateOutcomeKnowledgePackManifestQuery,
      invalidatesTags: getManifestMutationTags,
    }),

    updateOutcomeKnowledgePackManifest: build.mutation({
      query: buildUpdateOutcomeKnowledgePackManifestQuery,
      invalidatesTags: getManifestMutationTags,
    }),

    cloneOutcomeKnowledgePackManifest: build.mutation({
      query: buildCloneOutcomeKnowledgePackManifestQuery,
      invalidatesTags: getManifestMutationTags,
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
  useImportOutcomeKnowledgePackSourceDocumentDraftMutation,
  useDeleteOutcomeKnowledgePackMutation,
  useDeprecateOutcomeKnowledgePackVersionMutation,
  useDisableOutcomeKnowledgePackVersionMutation,
  useValidateOutcomeKnowledgePackVersionMutation,
  useUpdateOutcomeKnowledgePackReviewMutation,
  useActivateOutcomeKnowledgePackVersionMutation,
  useRollbackOutcomeKnowledgePackMutation,
  usePreviewOutcomeKnowledgePackResolutionQuery,
  useListOutcomeKnowledgePackManifestsQuery,
  useGetOutcomeKnowledgePackManifestQuery,
  usePreviewOutcomeKnowledgePackManifestResolutionQuery,
  usePreviewOutcomeKnowledgePackReasoningContextQuery,
  useCompareOutcomeKnowledgePackManifestsQuery,
  useCreateOutcomeKnowledgePackManifestMutation,
  useUpdateOutcomeKnowledgePackManifestMutation,
  useCloneOutcomeKnowledgePackManifestMutation,
} = outcomeKnowledgePacksApi
