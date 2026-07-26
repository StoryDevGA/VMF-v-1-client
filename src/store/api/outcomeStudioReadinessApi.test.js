import { describe, expect, it, vi } from 'vitest'
import {
  buildApproveOutcomeStudioTestReferenceQuery,
  buildDownloadOutcomeStudioTestReferenceQuery,
  buildGetOutcomeStudioReadinessHistoryQuery,
  buildGetOutcomeStudioReadinessQuery,
  buildGetOutcomeStudioTestReferenceHistoryQuery,
  buildGetOutcomeStudioTestReferenceQuery,
  buildListOutcomeStudioTestReferencesQuery,
  buildSupersedeOutcomeStudioTestReferenceQuery,
  buildUpdateOutcomeStudioDevelopmentTestReadinessQuery,
  buildUploadOutcomeStudioTestReferenceQuery,
  handleOutcomeStudioTestReferenceContent,
  outcomeStudioReadinessApi,
  outcomeStudioReadinessInvalidationTags,
  outcomeStudioReferenceListTag,
  parseOutcomeStudioAttachmentFilename,
  useApproveOutcomeStudioTestReferenceMutation,
  useDownloadOutcomeStudioTestReferenceMutation,
  useGetOutcomeStudioReadinessHistoryQuery,
  useGetOutcomeStudioReadinessQuery,
  useGetOutcomeStudioTestReferenceHistoryQuery,
  useGetOutcomeStudioTestReferenceQuery,
  useListOutcomeStudioTestReferencesQuery,
  useSupersedeOutcomeStudioTestReferenceMutation,
  useUpdateOutcomeStudioDevelopmentTestReadinessMutation,
  useUploadOutcomeStudioTestReferenceMutation,
} from './outcomeStudioReadinessApi.js'

describe('outcomeStudioReadinessApi', () => {
  it('registers the readiness and governed reference hooks', () => {
    for (const endpoint of ['getOutcomeStudioReadiness', 'getOutcomeStudioReadinessHistory', 'updateOutcomeStudioDevelopmentTestReadiness', 'listOutcomeStudioTestReferences', 'uploadOutcomeStudioTestReference', 'getOutcomeStudioTestReference', 'getOutcomeStudioTestReferenceHistory', 'downloadOutcomeStudioTestReference', 'approveOutcomeStudioTestReference', 'supersedeOutcomeStudioTestReference']) {
      expect(outcomeStudioReadinessApi.endpoints).toHaveProperty(endpoint)
    }
    for (const hook of [useGetOutcomeStudioReadinessQuery, useGetOutcomeStudioReadinessHistoryQuery, useUpdateOutcomeStudioDevelopmentTestReadinessMutation, useListOutcomeStudioTestReferencesQuery, useUploadOutcomeStudioTestReferenceMutation, useGetOutcomeStudioTestReferenceQuery, useGetOutcomeStudioTestReferenceHistoryQuery, useDownloadOutcomeStudioTestReferenceMutation, useApproveOutcomeStudioTestReferenceMutation, useSupersedeOutcomeStudioTestReferenceMutation]) {
      expect(hook).toBeTypeOf('function')
    }
  })

  it('builds the exact Development/Test readiness request', () => {
    const body = { expectedRevision: 4, rubric: {}, providerPolicy: {}, testingApproval: {} }
    expect(buildGetOutcomeStudioReadinessQuery()).toBe('/super-admin/runtime-control/outcome-studio-readiness')
    expect(buildGetOutcomeStudioReadinessHistoryQuery()).toBe('/super-admin/runtime-control/outcome-studio-readiness/history')
    expect(buildUpdateOutcomeStudioDevelopmentTestReadinessQuery(body)).toEqual({ url: '/super-admin/runtime-control/outcome-studio-readiness/development-test', method: 'PUT', body })
    expect(outcomeStudioReadinessInvalidationTags).toEqual([{ type: 'OutcomeStudioReadiness', id: 'CURRENT' }, { type: 'OutcomeStudioReadiness', id: 'HISTORY' }])
  })

  it('builds paginated and URL-encoded reference reads', () => {
    expect(buildListOutcomeStudioTestReferencesQuery()).toBe('/super-admin/runtime-control/outcome-studio-readiness/references?page=1&pageSize=25')
    expect(buildListOutcomeStudioTestReferencesQuery({ page: 3, pageSize: 10 })).toContain('?page=3&pageSize=10')
    expect(buildGetOutcomeStudioTestReferenceQuery('ref / one').endsWith('/references/ref%20%2F%20one')).toBe(true)
    expect(buildGetOutcomeStudioTestReferenceHistoryQuery({ referenceKey: 'ref / one' }).endsWith('/references/ref%20%2F%20one/history?page=1&pageSize=25')).toBe(true)
  })

  it('builds exact upload, approval, supersession, and download requests', () => {
    const upload = { family: 'INFOGRAPHIC', title: 'Example', purpose: '', originalFileName: 'example.pdf', mimeType: 'application/pdf', contentBase64: 'JVBERg==' }
    expect(buildUploadOutcomeStudioTestReferenceQuery(upload)).toEqual({ url: '/super-admin/runtime-control/outcome-studio-readiness/references', method: 'POST', body: upload })
    expect(buildApproveOutcomeStudioTestReferenceQuery({ referenceKey: 'abc', expectedRevision: 2, approverName: 'A', approverRole: 'PO', rationale: 'Approved' })).toEqual({ url: '/super-admin/runtime-control/outcome-studio-readiness/references/abc/approve', method: 'POST', body: { expectedRevision: 2, approverName: 'A', approverRole: 'PO', rationale: 'Approved' } })
    expect(buildSupersedeOutcomeStudioTestReferenceQuery({ referenceKey: 'abc', expectedRevision: 2, replacementReferenceKey: 'def', reason: 'Improved' })).toEqual({ url: '/super-admin/runtime-control/outcome-studio-readiness/references/abc/supersede', method: 'POST', body: { expectedRevision: 2, replacementReferenceKey: 'def', reason: 'Improved' } })
    expect(buildDownloadOutcomeStudioTestReferenceQuery('abc')).toEqual(expect.objectContaining({ url: '/super-admin/runtime-control/outcome-studio-readiness/references/abc/content', method: 'GET', responseHandler: handleOutcomeStudioTestReferenceContent }))
    expect(outcomeStudioReferenceListTag).toEqual({ type: 'OutcomeStudioReadiness', id: 'REFERENCES' })
  })

  it('parses attachment filenames and preserves binary content', async () => {
    expect(parseOutcomeStudioAttachmentFilename("attachment; filename=example.pdf; filename*=UTF-8''Board%20Review.pdf")).toBe('Board Review.pdf')
    expect(parseOutcomeStudioAttachmentFilename('attachment; filename="fallback.pdf"')).toBe('fallback.pdf')
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    const response = { blob: vi.fn().mockResolvedValue(blob), headers: new Headers({ 'content-disposition': "attachment; filename*=UTF-8''Example.pdf", 'content-type': 'application/pdf' }) }
    await expect(handleOutcomeStudioTestReferenceContent(response)).resolves.toEqual({ blob, filename: 'Example.pdf', mimeType: 'application/pdf' })
  })
})
