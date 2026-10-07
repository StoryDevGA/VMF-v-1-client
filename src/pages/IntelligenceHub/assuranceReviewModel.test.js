import { describe, expect, it } from 'vitest'
import { readAssuranceReview } from './assuranceReviewModel.js'
import { assuranceReviewFixture, assuranceReviewScope, assuranceReceiptFixture } from '../../test/assuranceReviewFixture.js'
const read = (response, options = {}) => readAssuranceReview({ response: { data: response }, scope: assuranceReviewScope, stateVersion: 'version-2', ...options })
describe('existing scoped Review Completion report facts', () => {
  it('keeps semantic current receipt despite older observed state and independent confirmed readiness blocker', () => {
    const review = read(assuranceReviewFixture())
    expect(review.latestReceipt.currency).toBe('CURRENT')
    expect(review.latestReceipt.observedStateVersion).toBe('version-1')
    expect(review.population.confirmedReadinessBlockers).toBe(1)
  })
  it('keeps stale receipt history inspectable even when observed state equals current state', () => {
    const value = assuranceReviewFixture(assuranceReceiptFixture({ populationHash: 'b'.repeat(64), currency: 'STALE', observedStateVersion: 'version-2' }))
    expect(read(value).latestReceipt.currency).toBe('STALE')
  })
  it('zero disposed decisions without a human receipt do not invent approval', () => {
    const value = assuranceReviewFixture(null)
    Object.assign(value.population, { evidenceCount: 0, sourceCount: 0, decisionCount: 0, confirmedReadinessBlockers: 0 })
    expect(read(value).latestReceipt).toBeNull()
  })
  it('retains explicit bounded partial history and does not invent complete audit history', () => {
    const value = assuranceReviewFixture()
    value.history = { completeness: 'PARTIAL', hasMore: true, records: Array.from({ length: 25 }, (_, i) => assuranceReceiptFixture({ receiptId: `12345678-1234-4123-8123-${String(i).padStart(12, '0')}` })) }
    value.latestReceipt = value.history.records[0]
    expect(read(value).history.hasMore).toBe(true)
  })
  it.each([
    v => { v.scope.tenantId = 'other' }, v => { v.stateVersion = 'old' }, v => { v.currency = 'CURRENT' },
    v => { v.readAt = 'invalid' }, v => { v.population.policy = 'invented' }, v => { v.population.target = 'assumed' },
    v => { v.population.pendingEvidence = 3 }, v => { v.population.confirmedReadinessBlockers = 2 },
    v => { v.population.reason = 'OUTSTANDING_DECISIONS' }, v => { v.population.complete = false },
    v => { v.latestReceipt.currency = 'STALE' }, v => { v.latestReceipt.rationale = '' },
    v => { v.latestReceipt.actorUserId = 'invented' }, v => { v.latestReceipt.authority = 'ADVISOR' },
    v => { v.latestReceipt.auditSignatureVersion = 0 }, v => { v.latestReceipt.completedAt = '2027-01-01' },
    v => { v.latestReceipt.observedStateVersion = '' }, v => { v.history.records.push(v.history.records[0]) },
    v => { v.history.records = [] }, v => { v.history.hasMore = true }, v => { v.history.completeness = 'PARTIAL' },
    v => { v.readReceipt.historyLimit = 26 }, v => { v.readReceipt.maxTimeMS = 3000 },
    v => { v.history.records[0] = assuranceReceiptFixture({ auditId: '507f1f77bcf86cd799439013' }) },
    v => { v.population.pendingFindings = 1 },
  ])('rejects unavailable, malformed, inconsistent or unsupported facts %#', change => {
    const value = assuranceReviewFixture(); change(value)
    expect(read(value)).toBeNull()
  })
  it.each(['loading', 'error'])('withholds retained facts during %s', state => {
    expect(read(assuranceReviewFixture(), { [state]: true })).toBeNull()
  })
})
