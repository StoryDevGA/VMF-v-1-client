import { baseApi } from './baseApi.js'
import { buildRuntimeOutcomeAssetVersionQuery, getRuntimeInstanceDetailTags } from './runtimeInstanceApi.js'

const identity = (value) => encodeURIComponent(String(value ?? '').trim())
const suffixQuery = (query, suffix, values = {}) => {
  const [pathname, existing = ''] = query.split('?')
  const search = new URLSearchParams(existing)
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  }
  return `${pathname}${suffix}${search.size ? `?${search}` : ''}`
}
const versionQuery = (args, suffix, values) => suffixQuery(buildRuntimeOutcomeAssetVersionQuery(args), suffix, values)
const operationQuery = (args, suffix = '') => {
  const [versionPath, scope = ''] = buildRuntimeOutcomeAssetVersionQuery(args).split('?')
  const root = versionPath.split('/outcome-studio/')[0]
  return `${root}/outcome-studio/successor-operations/${identity(args.operationId)}${suffix}${scope ? `?${scope}` : ''}`
}

export const buildOutcomeSuccessorPreflightQuery = (args) => versionQuery(args, '/successor/preflight', {
  targetRuntimeInstanceId: args.targetRuntimeInstanceId,
})
export const buildOutcomeSuccessorConfirmationQuery = (args) => ({
  url: versionQuery(args, '/successor/confirmation'), method: 'POST', body: args.body,
})
export const buildCreateOutcomeSuccessorQuery = (args) => ({
  url: versionQuery(args, '/successor'), method: 'POST', body: args.body,
})
export const buildOutcomeSuccessorByKeyQuery = (args) => versionQuery(args, '/successor/operation-by-key', {
  idempotencyKey: args.idempotencyKey, targetRuntimeInstanceId: args.targetRuntimeInstanceId,
})
export const buildOutcomeSuccessorOperationQuery = (args) => operationQuery(args)
export const buildOutcomeSuccessorCompareQuery = (args) => operationQuery(args, '/compare')
export const buildReconcileOutcomeSuccessorQuery = (args) => ({
  url: operationQuery(args, '/reconcile'), method: 'POST', body: {},
})
export const getOutcomeSuccessorInvalidationTags = (result, error, args) => {
  const data = result?.data ?? result
  const target = data?.target?.runtimeInstanceId ?? args.body?.targetRuntimeInstanceId ?? args.targetRuntimeInstanceId
  return [...getRuntimeInstanceDetailTags(result, error, args),
    ...(target ? getRuntimeInstanceDetailTags(undefined, error, { runtimeInstanceId: target }) : [])]
    .filter((tag, index, tags) => tags.findIndex((item) => item.type === tag.type && item.id === tag.id) === index)
}
export const refreshSavedSuccessor = async (args, { dispatch, queryFulfilled }) => {
  try {
    const { data } = await queryFulfilled
    const operation = data?.data ?? data
    if (operation?.status === 'SUCCEEDED' && operation.result?.draftId && operation.result?.draftIterationId) {
      dispatch(baseApi.util.invalidateTags(getOutcomeSuccessorInvalidationTags(data, undefined, args)))
    }
  } catch { /* Unknown readback leaves the existing state untouched. */ }
}

export const outcomeSuccessorApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOutcomeSuccessorPreflight: build.query({ query: buildOutcomeSuccessorPreflightQuery }),
    confirmOutcomeSuccessor: build.mutation({ query: buildOutcomeSuccessorConfirmationQuery, extraOptions: { maxRetries: 0 } }),
    createOutcomeSuccessor: build.mutation({ query: buildCreateOutcomeSuccessorQuery, extraOptions: { maxRetries: 0 }, invalidatesTags: getOutcomeSuccessorInvalidationTags }),
    getOutcomeSuccessorByKey: build.query({ query: buildOutcomeSuccessorByKeyQuery, extraOptions: { maxRetries: 0 }, onQueryStarted: refreshSavedSuccessor }),
    getOutcomeSuccessorOperation: build.query({ query: buildOutcomeSuccessorOperationQuery, extraOptions: { maxRetries: 0 }, onQueryStarted: refreshSavedSuccessor }),
    getOutcomeSuccessorCompare: build.query({ query: buildOutcomeSuccessorCompareQuery, extraOptions: { maxRetries: 0 } }),
    reconcileOutcomeSuccessor: build.mutation({ query: buildReconcileOutcomeSuccessorQuery, extraOptions: { maxRetries: 0 }, invalidatesTags: getOutcomeSuccessorInvalidationTags }),
  }),
})

export const {
  useLazyGetOutcomeSuccessorPreflightQuery,
  useConfirmOutcomeSuccessorMutation,
  useCreateOutcomeSuccessorMutation,
  useLazyGetOutcomeSuccessorByKeyQuery,
  useLazyGetOutcomeSuccessorOperationQuery,
  useLazyGetOutcomeSuccessorCompareQuery,
  useReconcileOutcomeSuccessorMutation,
} = outcomeSuccessorApi
