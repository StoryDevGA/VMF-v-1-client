import { describe, it, expect } from 'vitest'
import { readContradictionHistory } from './contradictionHistoryModel.js'

export const historyScope = { runtimeInstanceId: 'revision', customerId: 'customer', tenantId: 'tenant', stateVersion: 'rsv2:current', sessionRevision: 0 }
export const historyRecord = change => ({ contractVersion: 'discovery-contradiction-review-v1', reviewId: '5b4d1f42-d7e2-4a3f-af5c-000000000004',
  runtimeInstanceId: 'revision-id', contradictionId: 'finding', evidencePairHash: 'sha256:' + 'a'.repeat(64), disposition: 'NOT_CONTRADICTORY',
  rationale: 'Recorded human rationale.', reviewEpoch: '', reviewedBy: '64b000000000000000000001',
  reviewedAt: '2026-10-06T10:00:00.000Z', reviewedStateVersion: 'rsv2:original-historical', ...change })
export const historyResponse = change => ({ data: { contractVersion: 'intelligence-contradiction-history.v1', source: 'runtime_state_v2.contradiction_history',
  currency: 'AS_READ', readAt: '2026-10-06T11:00:00.000Z', control: { id: 'revision-id', runtimeInstanceKey: 'revision',
    customerId: 'customer', tenantId: 'tenant', stateVersion: 'rsv2:current' },
  readReceipt: { source: 'runtime_state_v2.contradiction_history', bounded: true, fullLegacyFrameworkStateFetched: false,
    maxTimeMS: 2000, requestTimeoutMS: 6000, workTimeoutMS: 5500, cleanupReserveMS: 500, maxSerializedPayloadBytes: 524288, serializedPayloadBytes: 1000 },
  history: { available: true, completeness: 'COMPLETE_STORED_HISTORY', reason: null, findingId: 'finding', page: 1, pageSize: 10,
    total: 1, totalPages: 1, basis: 'RECORDED_DECISIONS', currentness: 'NOT_ASSESSED', auditReferences: 'UNAVAILABLE', recalculation: 'UNAVAILABLE',
    records: [historyRecord()], ...change } } })
const read = (response = historyResponse(), patch = {}) => readContradictionHistory({ response, scope: historyScope, findingId: 'finding', page: 1, ...patch })
describe('bounded exact recorded-decision history', () => {
  it('permits historical original version distinct from current control and complete empty', () => {
    expect(read()).toMatchObject({ available: true, total: 1, records: [{ reviewedStateVersion: 'rsv2:original-historical' }] })
    expect(read(historyResponse({ records: [], total: 0 }))).toMatchObject({ available: true, total: 0 })
  })
  it.each([{ loading: true }, { error: { status: 503 } }, { page: 2 }, { findingId: 'other' },
    { scope: { ...historyScope, tenantId: 'other' } }, { scope: { ...historyScope, stateVersion: 'new' } }])('rejects stale/cache/error/scope %j', patch => { expect(read(undefined, patch)).toBeNull() })
  it.each([{ currentness: 'CURRENT' }, { completeness: 'COMPLETE' }, { total: 1001 }, { total: 3 }, { totalPages: 3 },
    { pageSize: 20 }, { auditReferences: 'COMPLETE' }, { recalculation: 'SUCCESS' }, { findingId: 'other' }, { reason: 'bad' }])('rejects unsupported qualifications/totals %j', patch => {
    expect(read(historyResponse(patch))).toBeNull()
  })
  it.each([{ reviewId: 'bad' }, { reviewedAt: '2026-10-06' }, { reviewedStateVersion: 3 }, { reviewedStateVersion: 'rsv2:bad\u0000basis' }, { reviewedBy: 'actor' },
    { contradictionId: 'other' }, { runtimeInstanceId: 'other' }, { rationale: 'short' }, { disposition: 'DISMISSED' },
    { reviewEpoch: 'bad' }, { requestKey: '5b4d1f42-d7e2-4a3f-af5c-000000000005' }])('rejects malformed recorded field/triple %j', patch => {
    expect(read(historyResponse({ records: [historyRecord(patch)] }))).toBeNull()
  })
  it('rejects incomplete read budget/scope envelopes and ambiguous IDs', () => {
    const response = historyResponse(); response.data.readReceipt.bounded = false; expect(read(response)).toBeNull()
    const wrong = historyResponse(); wrong.data.control.customerId = 'other'; expect(read(wrong)).toBeNull()
    expect(read(historyResponse({ records: [historyRecord(), historyRecord()], total: 2 }))).toBeNull()
  })
  it('unavailable absence is not complete zero and cannot expose retained rows', () => {
    const absent = { available: false, completeness: 'UNAVAILABLE', reason: 'HISTORY_NOT_RECORDED', total: null, totalPages: null, records: [] }
    expect(read(historyResponse(absent))).toEqual({ available: false, reason: 'HISTORY_NOT_RECORDED' })
    expect(read(historyResponse({ ...absent, total: 0 }))).toBeNull()
  })
})
