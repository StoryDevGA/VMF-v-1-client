import { baseApi } from './baseApi.js'

const BASE_PATH = '/super-admin/runtime-control/outcome-studio-readiness'
const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 25

export const outcomeStudioReadinessCurrentTag = {
  type: 'OutcomeStudioReadiness',
  id: 'CURRENT',
}
export const outcomeStudioReadinessHistoryTag = {
  type: 'OutcomeStudioReadiness',
  id: 'HISTORY',
}
export const outcomeStudioReferenceListTag = {
  type: 'OutcomeStudioReadiness',
  id: 'REFERENCES',
}
export const outcomeStudioReadinessInvalidationTags = [
  outcomeStudioReadinessCurrentTag,
  outcomeStudioReadinessHistoryTag,
]

const encodeKey = (referenceKey) => encodeURIComponent(String(referenceKey ?? ''))
const referenceDetailTag = (referenceKey) => ({
  type: 'OutcomeStudioReadiness',
  id: `REFERENCE:${referenceKey}`,
})
const referenceHistoryTag = (referenceKey) => ({
  type: 'OutcomeStudioReadiness',
  id: `REFERENCE_HISTORY:${referenceKey}`,
})

export const buildGetOutcomeStudioReadinessQuery = () => BASE_PATH
export const buildGetOutcomeStudioReadinessHistoryQuery = () => `${BASE_PATH}/history`
export const buildUpdateOutcomeStudioDevelopmentTestReadinessQuery = (body) => ({
  url: `${BASE_PATH}/development-test`,
  method: 'PUT',
  body,
})
export const buildListOutcomeStudioTestReferencesQuery = ({ page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE } = {}) => (
  `${BASE_PATH}/references?page=${page}&pageSize=${pageSize}`
)
export const buildUploadOutcomeStudioTestReferenceQuery = (body) => ({
  url: `${BASE_PATH}/references`,
  method: 'POST',
  body,
})
export const buildGetOutcomeStudioTestReferenceQuery = (referenceKey) => `${BASE_PATH}/references/${encodeKey(referenceKey)}`
export const buildGetOutcomeStudioTestReferenceHistoryQuery = ({ referenceKey, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE }) => (
  `${BASE_PATH}/references/${encodeKey(referenceKey)}/history?page=${page}&pageSize=${pageSize}`
)

export function parseOutcomeStudioAttachmentFilename(contentDisposition = '') {
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded)
    } catch {
      return encoded
    }
  }
  return /filename="?([^";]+)"?/i.exec(contentDisposition)?.[1] || 'outcome-studio-reference.pdf'
}

export const handleOutcomeStudioTestReferenceContent = async (response) => ({
  blob: await response.blob(),
  filename: parseOutcomeStudioAttachmentFilename(response.headers.get('content-disposition') || ''),
  mimeType: response.headers.get('content-type') || 'application/pdf',
})

export const buildDownloadOutcomeStudioTestReferenceQuery = (referenceKey) => ({
  url: `${BASE_PATH}/references/${encodeKey(referenceKey)}/content`,
  method: 'GET',
  responseHandler: handleOutcomeStudioTestReferenceContent,
})
export const buildApproveOutcomeStudioTestReferenceQuery = ({ referenceKey, ...body }) => ({
  url: `${BASE_PATH}/references/${encodeKey(referenceKey)}/approve`,
  method: 'POST',
  body,
})
export const buildSupersedeOutcomeStudioTestReferenceQuery = ({ referenceKey, ...body }) => ({
  url: `${BASE_PATH}/references/${encodeKey(referenceKey)}/supersede`,
  method: 'POST',
  body,
})

const referenceMutationTags = (referenceKey, replacementReferenceKey) => [
  outcomeStudioReferenceListTag,
  referenceDetailTag(referenceKey),
  referenceHistoryTag(referenceKey),
  ...(replacementReferenceKey ? [referenceDetailTag(replacementReferenceKey)] : []),
]

export const outcomeStudioReadinessApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOutcomeStudioReadiness: builder.query({
      query: buildGetOutcomeStudioReadinessQuery,
      providesTags: [outcomeStudioReadinessCurrentTag],
    }),
    getOutcomeStudioReadinessHistory: builder.query({
      query: buildGetOutcomeStudioReadinessHistoryQuery,
      providesTags: [outcomeStudioReadinessHistoryTag],
    }),
    updateOutcomeStudioDevelopmentTestReadiness: builder.mutation({
      query: buildUpdateOutcomeStudioDevelopmentTestReadinessQuery,
      invalidatesTags: outcomeStudioReadinessInvalidationTags,
    }),
    listOutcomeStudioTestReferences: builder.query({
      query: buildListOutcomeStudioTestReferencesQuery,
      providesTags: (result) => [
        outcomeStudioReferenceListTag,
        ...((result?.data ?? []).map((reference) => referenceDetailTag(reference.referenceKey))),
      ],
    }),
    uploadOutcomeStudioTestReference: builder.mutation({
      query: buildUploadOutcomeStudioTestReferenceQuery,
      invalidatesTags: [outcomeStudioReferenceListTag],
    }),
    getOutcomeStudioTestReference: builder.query({
      query: buildGetOutcomeStudioTestReferenceQuery,
      providesTags: (_result, _error, referenceKey) => [referenceDetailTag(referenceKey)],
    }),
    getOutcomeStudioTestReferenceHistory: builder.query({
      query: buildGetOutcomeStudioTestReferenceHistoryQuery,
      providesTags: (_result, _error, { referenceKey }) => [referenceHistoryTag(referenceKey)],
    }),
    downloadOutcomeStudioTestReference: builder.mutation({
      query: buildDownloadOutcomeStudioTestReferenceQuery,
    }),
    approveOutcomeStudioTestReference: builder.mutation({
      query: buildApproveOutcomeStudioTestReferenceQuery,
      invalidatesTags: (_result, _error, { referenceKey }) => referenceMutationTags(referenceKey),
    }),
    supersedeOutcomeStudioTestReference: builder.mutation({
      query: buildSupersedeOutcomeStudioTestReferenceQuery,
      invalidatesTags: (_result, _error, { referenceKey, replacementReferenceKey }) => referenceMutationTags(referenceKey, replacementReferenceKey),
    }),
  }),
})

export const {
  useGetOutcomeStudioReadinessQuery,
  useGetOutcomeStudioReadinessHistoryQuery,
  useUpdateOutcomeStudioDevelopmentTestReadinessMutation,
  useListOutcomeStudioTestReferencesQuery,
  useUploadOutcomeStudioTestReferenceMutation,
  useGetOutcomeStudioTestReferenceQuery,
  useGetOutcomeStudioTestReferenceHistoryQuery,
  useDownloadOutcomeStudioTestReferenceMutation,
  useApproveOutcomeStudioTestReferenceMutation,
  useSupersedeOutcomeStudioTestReferenceMutation,
} = outcomeStudioReadinessApi
