import { baseApi } from './baseApi.js'

const id = value => encodeURIComponent(String(value || ''))
export const buildPrivateDocxCandidatesQuery = ({ runtimeInstanceId, customerId, tenantId }) =>
  `/runtime-instances/${id(runtimeInstanceId)}/outcome-studio/docx-candidates?${new URLSearchParams({ customerId, tenantId })}`
export const buildPrivateDocxPreviewBundleQuery = args => {
  const [path, query] = buildPrivateDocxCandidatesQuery(args).split('?')
  return `${path}/${id(args.candidateId)}/page-preview-bundle?${query}`
}
export const docxPreviewApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getPrivateDocxCandidates: build.query({ query: buildPrivateDocxCandidatesQuery,
      keepUnusedDataFor: 0, extraOptions: { maxRetries: 0 } }),
    getPrivateDocxPreviewBundle: build.query({ query: buildPrivateDocxPreviewBundleQuery,
      keepUnusedDataFor: 0, extraOptions: { maxRetries: 0 } }),
  }),
})
export const { useGetPrivateDocxCandidatesQuery, useGetPrivateDocxPreviewBundleQuery } = docxPreviewApi
