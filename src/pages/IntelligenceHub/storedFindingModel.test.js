import { describe, it, expect } from 'vitest'
import { readStoredFindings } from './storedFindingModel.js'
import { storedFindingFixture, storedFindingRow } from '../../test/storedFindingFixture.js'
const scope = { runtimeInstanceId: 'revision', customerId: 'customer', tenantId: 'tenant', stateVersion: 'rsv2:current' }
const selection = { search: '', type: 'CONTRADICTION', population: 'DETECTED', sort: 'ID_ASC', page: 1, pageSize: 4 }
const read = (response = storedFindingFixture(), extra = {}) => readStoredFindings({ response, scope, selection, ...extra })
const review = { contractVersion: 'discovery-contradiction-review-v1', reviewId: '5b4d1f42-d7e2-4a3f-af5c-000000000004', runtimeInstanceId: 'revision-id',
  contradictionId: 'finding-a', evidencePairHash: 'sha256:' + 'a'.repeat(64), disposition: 'REOPENED', rationale: 'Recorded human rationale.', reviewedBy: '64b000000000000000000001',
  reviewedAt: '2026-10-06T10:00:00.000Z', reviewedStateVersion: 'historical-version', reviewEpoch: '' }
describe('stored finding read boundaries', () => {
  it('projects exact canonical pairs without granting mutation authority', () => {
    expect(read()).toMatchObject({ available: true, total: 1, candidates: [{ id: 'finding-a', evidence: [{ sourceId: 'source-1' }, { sourceId: 'source-2' }] }] })
    expect(read()).not.toHaveProperty('canReview')
  })
  it('keeps reopened and stale reviews in overlapping recorded population', () => {
    for (const status of ['REOPENED', 'STALE']) {
      const response = storedFindingFixture({ population: 'RECORDED' }, { populations: { detected: 1, open: 1, recorded: 1, counting: 'OVERLAPPING_INSPECTION_POPULATIONS' },
        records: [storedFindingRow('finding-a', { reviewStatus: status, latestReview: review })] })
      expect(read(response, { selection: { ...selection, population: 'RECORDED' } })?.available).toBe(true)
    }
  })
  it('accepts evidence-only server search and off-page stable selection without local re-filtering', () => {
    const selected = { ...selection, search: 'Second selected fact', page: 2 }
    const response = storedFindingFixture(selected, { total: 5, totalPages: 2, populations: { detected: 5, open: 5, recorded: 0, counting: 'OVERLAPPING_INSPECTION_POPULATIONS' } })
    expect(read(response, { selection: selected })?.candidates[0].id).toBe('finding-a')
  })
  it.each([{ loading: true }, { error: { status: 503 } }, { scope: { ...scope, tenantId: 'other' } },
    { scope: { ...scope, stateVersion: 'old' } }, { selection: { ...selection, page: 2 } }])('rejects departed/cache/error frame %j', patch => expect(read(undefined, patch)).toBeNull())
  it.each([{ completeness: 'COMPLETE' }, { total: 9 }, { total: 2 }, { totalPages: 2 }, { pageSize: 20 }, { allTypesCompleteness: 'COMPLETE' },
    { detectionPolicy: { coverage: 'COMPLETE', maxStoredCandidates: 8, detectorVersion: null } }, { populations: { detected: 1, open: 2, recorded: 0, counting: 'OVERLAPPING_INSPECTION_POPULATIONS' } }])('rejects invented totals or completeness %j', patch => expect(read(storedFindingFixture({}, patch))).toBeNull())
  it.each([{ findingId: 'bad\u0000id' }, { evidencePairHash: 'bad' }, { priority: { available: true } }, { consequences: 'NONE' },
    { latestReview: { ...review, reviewedStateVersion: 2 } }, { reviewStatus: 'CONFIRMED', latestReview: review },
    { evidence: [storedFindingRow().evidence[0], storedFindingRow().evidence[0]] },
    { evidence: [{ ...storedFindingRow().evidence[0], sourceType: 2 }, storedFindingRow().evidence[1]] },
    { evidence: [{ ...storedFindingRow().evidence[0], reviewStatus: 'REJECTED' }, storedFindingRow().evidence[1]] }])('rejects malformed pair or disposition %j', patch => expect(read(storedFindingFixture({}, { records: [storedFindingRow('finding-a', patch)] }))).toBeNull())
  it('unknown type remains unavailable, not complete zero', () => {
    const selected = { ...selection, type: 'WEAK_CONFIDENCE' }
    const response = storedFindingFixture(selected, { available: false, completeness: 'UNAVAILABLE', reason: 'CANONICAL_FINDING_TYPE_UNAVAILABLE', records: [], populations: null, total: null, totalPages: null })
    expect(read(response, { selection: selected })).toEqual({ available: false, reason: 'CANONICAL_FINDING_TYPE_UNAVAILABLE' })
    response.findings.total = 0; expect(read(response, { selection: selected })).toBeNull()
  })
  it('rejects wrong read budget, duplicate rows and wrong sort', () => {
    const response = storedFindingFixture(); response.readReceipt.maxTimeMS = 0; expect(read(response)).toBeNull()
    const rows = [storedFindingRow('finding-b'), storedFindingRow('finding-a')]
    const f = { records: rows, total: 2, populations: { detected: 2, open: 2, recorded: 0, counting: 'OVERLAPPING_INSPECTION_POPULATIONS' } }
    expect(read(storedFindingFixture({}, f))).toBeNull()
    f.records = [rows[0], rows[0]]; expect(read(storedFindingFixture({}, f))).toBeNull()
  })
})
