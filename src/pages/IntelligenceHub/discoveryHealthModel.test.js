import { describe, it, expect } from 'vitest'
import { discoveryHealthFixture } from '../../test/discoveryHealthFixture.js'
import { readDiscoveryHealth, discoveryHealthLabel } from './discoveryHealthModel.js'
const scope = { runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1' }
const parse = (response, options) => readDiscoveryHealth({ response: { data: response }, scope, stateVersion: 'version-2', ...options })
describe('recorded scoped Discovery Health consumer', () => {
  it.each(['READY', 'PARTIALLY_READY', 'NOT_READY'])('retains %s with unknown assessment basis', state => {
    const value = parse(discoveryHealthFixture({ state }))
    expect(value.assessment.state).toBe(state); expect(value.assessmentBasis).toBe('UNKNOWN')
    expect(discoveryHealthLabel(value)).toContain('Recorded')
  })
  it.each(['STALE', 'UNKNOWN', 'NOT_MARKED_STALE'])('does not promote %s marker to verified current inputs', freshness => {
    const value = parse(discoveryHealthFixture({ freshness }))
    expect(value.freshness).toBe(freshness); expect(value).not.toHaveProperty('current')
  })
  it.each(['ASSESSMENT_MISSING', 'ASSESSMENT_INVALID', 'REFRESH_MARKER_INVALID'])('preserves unavailable reason %s', reason => {
    const value = discoveryHealthFixture(); value.discoveryHealth = { available: false, reason, assessment: null, assessmentBasis: 'UNKNOWN', freshness: 'UNKNOWN' }
    expect(parse(value)).toMatchObject({ available: false, reason, assessment: null })
  })
  it.each([
    value => { value.control.customerId = 'other' }, value => { value.control.tenantId = 'other' },
    value => { value.control.id = 'other' }, value => { value.control.stateVersion = 'old' },
    value => { value.contractVersion = 'future' }, value => { value.source = 'other' },
    value => { value.currency = 'CURRENT' }, value => { value.readAt = '2026' },
    value => { value.discoveryHealth.assessmentBasis = 'CURRENT' }, value => { value.discoveryHealth.freshness = 'CURRENT' },
    value => { value.discoveryHealth.assessment.state = 'APPROVED' }, value => { value.discoveryHealth.reason = 'invented' },
    value => { value.discoveryHealth.assessment.warningReasons = [' SAME '] },
    value => { value.discoveryHealth.assessment.warningReasons = ['SAME', 'SAME'] },
    value => { value.discoveryHealth.assessment.warningReasons = ['REASON\n'] },
    value => { value.discoveryHealth.assessment.warningReasons = Array.from({ length: 33 }, (_, index) => 'REASON_' + index) },
    value => { value.discoveryHealth.assessment.assessedAt = '2026' },
    value => { value.readReceipt.source = 'other' }, value => { value.readReceipt.bounded = false },
    value => { value.readReceipt.fullLegacyFrameworkStateFetched = true }, value => { value.readReceipt.maxTimeMS = 2001 },
    value => { value.readReceipt.requestTimeoutMS = 6001 }, value => { value.readReceipt.workTimeoutMS = 6000 },
    value => { value.readReceipt.cleanupReserveMS = 0 }, value => { value.readReceipt.maxSerializedPayloadBytes = 600000 },
    value => { value.readReceipt.serializedPayloadBytes = 524289 }, value => { value.readReceipt.serializedPayloadBytes = -1 },
  ])('rejects invalid identity/schema/state/reason/budget rather than using stale or legacy values %#', change => {
    const value = discoveryHealthFixture(); change(value); expect(parse(value)).toBeNull()
  })
  it.each([{ loading: true }, { error: { status: 503 } }])('hides a retained successful read while unavailable %#', options => {
    expect(parse(discoveryHealthFixture(), options)).toBeNull()
  })
  it('copies permitted fields and accepts missing recorded assessment time without inventing one', () => {
    const value = discoveryHealthFixture(); value.discoveryHealth.assessment.assessedAt = null
    value.discoveryHealth.assessment.privateMetadata = 'not shown'
    const model = parse(value)
    expect(model.assessment.assessedAt).toBeNull(); expect(model.assessment).not.toHaveProperty('privateMetadata')
    model.assessment.warningReasons.push('COPY_ONLY'); expect(value.discoveryHealth.assessment.warningReasons).toHaveLength(1)
  })
})
