import { describe, it, expect } from 'vitest'
import { readSourceSummary, sourceProcessingLabel, refreshSourceSummarySafely } from './sourceSummaryModel.js'
import { vi } from 'vitest'
export const fixture = (overrides = {}) => ({ contractVersion: 'intelligence-source-summary.v1',
  scope: { customerId: 'customer-1', tenantId: 'tenant-1', runtimeInstanceId: 'revision-2' },
  stateVersion: 'version-2', currency: 'AS_READ', readAt: '2026-10-06T10:00:00.000Z', countLimit: 1000,
  basis: 'DOCUMENT_SOURCE_CURRENT_CONTENT_SUCCESS_RECEIPT', readReceipt: { bounded: true,
    fullLegacyFrameworkStateFetched: false, maxSerializedPayloadBytes: 524288, maxTimeMS: 2000, requestTimeoutMS: 6000 },
  sourceCompleteness: 'COMPLETE', uniqueSourceCount: 2, documentSourceCount: 1,
  sourceCountsByType: { UPLOADED_DOCUMENT: 1, WEBSITE: 1 }, processingCompleteness: 'COMPLETE',
  documentsProcessed: 1, knownProcessedCount: 1, unknownCount: 0, staleCount: 0, ...overrides })
const input = { scope: fixture().scope, stateVersion: 'version-2' }
describe('current canonical source summary', () => {
  it('shows document sources counted once independently of latest attempt evidence objects', () => {
    expect(readSourceSummary({ ...input, response: { data: fixture() } }).documentsProcessed).toBe(1)
  })
  it.each([{ stateVersion: 'old' }, { scope: { ...input.scope, tenantId: 'other' } }, { currency: 'STALE' },
    { uniqueSourceCount: -1 }, { documentsProcessed: 99 }, { knownProcessedCount: 2 }, { unknownCount: 1 },
    { sourceCountsByType: { WEBSITE: 2 } }, { sourceCompleteness: 'UNKNOWN' }, { readReceipt: { bounded: false } },
    { readReceipt: { ...fixture().readReceipt, maxTimeMS: 3000 } },
    { readReceipt: { ...fixture().readReceipt, requestTimeoutMS: 10000 } }])('rejects inconsistent receipt %j', change => expect(readSourceSummary({ ...input, response: fixture(change) })).toBeNull())
  it.each([{ loading: true }, { error: {} }, { stateVersion: undefined }])('hides retained totals %j', state => {
    expect(readSourceSummary({ ...input, response: fixture(), ...state })).toBeNull()
  })
  it('qualifies unknown processing while preserving complete source population', () => {
    const summary = readSourceSummary({ ...input, response: fixture({ processingCompleteness: 'PARTIAL',
      documentsProcessed: null, knownProcessedCount: 0, unknownCount: 1 }) })
    expect(summary.uniqueSourceCount).toBe(2)
    expect(sourceProcessingLabel(summary)).toBe('Unavailable · 0 verified, 1 unknown')
  })
  it('complete empty and stale processing counts are explicit', () => {
    const empty = fixture({ uniqueSourceCount: 0, documentSourceCount: 0, sourceCountsByType: {}, documentsProcessed: 0, knownProcessedCount: 0 })
    expect(sourceProcessingLabel(readSourceSummary({ ...input, response: empty }))).toBe('0')
    const stale = fixture({ documentsProcessed: 0, knownProcessedCount: 0, staleCount: 1 })
    expect(readSourceSummary({ ...input, response: stale }).staleCount).toBe(1)
  })
  it.each(['throw', 'reject'])('optional summary %s cannot become acquisition failure', async mode => {
    const refetch = vi.fn(() => { if (mode === 'throw') throw new Error('Unsubscribed summary'); return Promise.reject(new Error('Summary unavailable')) })
    await expect(refreshSourceSummarySafely({ refetch, isCurrent: () => true })).resolves.toBeNull()
  })
  it('does not launch a hidden optional summary read after tab departure', async () => {
    const refetch = vi.fn(); let active = true
    const pending = refreshSourceSummarySafely({ refetch, isCurrent: () => active })
    active = false
    await pending
    expect(refetch).not.toHaveBeenCalled()
  })
})
