import { describe, expect, it } from 'vitest'
import { readQualityGraphPair } from './intelligenceQualityModel.js'

const args = () => ({ scope: { runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1' },
  stateVersion: 'opaque-state-2', findingId: 'finding:one', evidenceObjectId: 'canonical:a',
  response: { data: { contractVersion: 'intelligence-review-actions.v1',
    control: { id: 'internal-id', runtimeInstanceKey: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', stateVersion: 'opaque-state-2' },
    canReview: false, canAcquire: false, candidates: [{ contradictionId: 'finding:one', evidenceObjectIds: ['canonical:a', 'canonical:b'],
      evidence: [{ evidenceObjectId: 'canonical:a' }, { evidenceObjectId: 'canonical:b' }] }] } } })

describe('current scoped raw Quality pair Graph handoff', () => {
  it.each(['canonical:a', 'canonical:b'])('permits exact %s inspection independently from write authority', evidenceObjectId => {
    const input = args(); input.evidenceObjectId = evidenceObjectId
    expect(readQualityGraphPair(input)).toEqual({ findingId: 'finding:one', evidenceObjectId })
  })
  it.each(['contract', 'customer', 'tenant', 'revision', 'version', 'loading', 'error', 'missing-response',
    'missing-finding', 'duplicate-finding', 'missing-pair', 'duplicate-pair', 'oversized-pair', 'missing-member',
    'duplicate-member', 'foreign-member', 'missing-evidence', 'physical', 'control', 'oversized', 'whitespace'])('withholds %s raw pair basis', condition => {
    const input = args(), body = input.response.data, row = body.candidates[0]
    if (condition === 'contract') body.contractVersion = 'future'
    if (condition === 'customer') body.control.customerId = 'other'
    if (condition === 'tenant') body.control.tenantId = 'other'
    if (condition === 'revision') body.control.runtimeInstanceKey = 'other'
    if (condition === 'version') body.control.stateVersion = 'old'
    if (condition === 'loading') input.loading = true
    if (condition === 'error') input.error = { status: 403 }
    if (condition === 'missing-response') input.response = undefined
    if (condition === 'missing-finding') input.findingId = 'other'
    if (condition === 'duplicate-finding') body.candidates.push(row)
    if (condition === 'missing-pair') delete row.evidenceObjectIds
    if (condition === 'duplicate-pair') row.evidenceObjectIds[1] = row.evidenceObjectIds[0]
    if (condition === 'oversized-pair') row.evidenceObjectIds.push('canonical:c')
    if (condition === 'missing-member') { row.evidence.pop(); input.evidenceObjectId = 'canonical:b' }
    if (condition === 'duplicate-member') row.evidence[1] = row.evidence[0]
    if (condition === 'foreign-member') row.evidence[1].evidenceObjectId = 'other'
    if (condition === 'missing-evidence') delete row.evidence
    if (condition === 'physical') input.evidenceObjectId = row.evidence[0].evidenceObjectId = row.evidenceObjectIds[0] = 'runtime_evidence_objects'
    if (condition === 'control') input.evidenceObjectId = 'bad\u0001id'
    if (condition === 'oversized') input.evidenceObjectId = 'x'.repeat(241)
    if (condition === 'whitespace') input.evidenceObjectId = ' canonical:a '
    expect(readQualityGraphPair(input)).toBeNull()
  })
})
