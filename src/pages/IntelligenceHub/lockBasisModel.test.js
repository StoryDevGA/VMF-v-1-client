import { describe, expect, it } from 'vitest'
import { readLockBasis } from './lockBasisModel.js'
import { lockBasisFixture } from '../../test/lockBasisFixture.js'

const read = (response, options = {}) => readLockBasis({ response: { data: response }, scope: { runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1' }, stateVersion: 'version-2', ...options })
const verifiedStateVersion = 'rsv2:123e4567-e89b-42d3-a456-426614174000'
const readVerified = (response, options = {}) => read(response, { stateVersion: verifiedStateVersion, ...options })
const verifiedFixture = () => {
  const value = lockBasisFixture()
  value.control.revision = { revisionNumber: 2 }
  value.control.stateVersion = verifiedStateVersion
  value.lockBasis.frozenInventory = { available: true, completeness: 'VERIFIED', reason: null,
    contractVersion: 'runtime-evidence-membership.v1', snapshotId: 'evidence_snapshot_123e4567-e89b-42d3-a456-426614174000',
    membershipHash: 'c'.repeat(64), basisStateVersion: verifiedStateVersion, lockSnapshotId: 'lock-receipt-2',
    lockSnapshotHash: 'a'.repeat(64), revisionNumber: 2, counts: { sources: 19, evidence: 853, sections: 5 },
    verification: { basis: 'EXACT_PERSISTED_MEMBERSHIP', materialHashAlgorithm: 'sha256-canonical-json-housekeeping-excluded.v1', auditLinkVerified: true } }
  return value
}
describe('current recorded lock basis', () => {
  it('admits only the exact verified persisted membership receipt and preserves immutable input', () => {
    const value = verifiedFixture(), before = JSON.stringify(value), model = readVerified(value)
    expect(model.frozenInventory).toEqual(value.lockBasis.frozenInventory)
    expect(model.frozenInventory).not.toBe(value.lockBasis.frozenInventory)
    model.frozenInventory.counts.sources = 0
    expect(JSON.stringify(value)).toBe(before)
    expect(readVerified(value).frozenInventory.counts.sources).toBe(19)
  })
  it('preserves the exact legacy model without inserting unavailable membership defaults', () => {
    const model = read(lockBasisFixture())
    expect(Object.hasOwn(model, 'frozenInventory')).toBe(false)
    expect(model).toEqual({ available: true, locked: true, lockedAt: '2026-09-17T18:14:00.000Z', lockedBy: 'reviewer-1', lockVersion: 1,
      snapshot: { snapshotId: 'lock-receipt-2', snapshotHash: 'a'.repeat(64), snapshotAt: '2026-09-17T18:14:00.000Z', contractVersion: 'runtime-truth-snapshot-v1' },
      replay: { available: true, reason: null, anchor: { replayAnchorId: 'replay-2', replayAnchorHash: 'b'.repeat(64) } },
      stateVersion: 'version-2', readAt: '2026-10-06T12:30:00.000Z' })
  })
  it('retains genuine zero counts and exact maximums without current inventory substitution', () => {
    const value = verifiedFixture()
    value.lockBasis.frozenInventory.counts = { sources: 0, evidence: 0, sections: 0 }
    expect(readVerified(value).frozenInventory.counts).toEqual({ sources: 0, evidence: 0, sections: 0 })
    value.lockBasis.frozenInventory.counts = { sources: 1000, evidence: 5000, sections: 100 }
    expect(readVerified(value).frozenInventory.counts).toEqual(value.lockBasis.frozenInventory.counts)
  })
  it.each(['version-2', 'rsv2:123e4567-e89b-32d3-a456-426614174000',
    'rsv2:123e4567-e89b-42d3-7456-426614174000', 'rsv2:123E4567-e89b-42d3-a456-426614174000',
    'rsv2:123e4567e89b42d3a456426614174000', 'rsv2:123e4567-e89b-42d3-a456-426614174000-extra'])('rejects malformed echoed verified state version %s', malformed => {
    const value = verifiedFixture()
    value.control.stateVersion = malformed
    value.lockBasis.frozenInventory.basisStateVersion = malformed
    expect(readVerified(value, { stateVersion: malformed })).toBeNull()
  })
  it.each(['frozen-fixture', 'snapshot_123e4567-e89b-42d3-a456-426614174000',
    'evidence_snapshot_123e4567-e89b-32d3-a456-426614174000', 'evidence_snapshot_123e4567-e89b-42d3-7456-426614174000',
    'evidence_snapshot_123E4567-e89b-42d3-a456-426614174000', 'evidence_snapshot_123e4567e89b42d3a456426614174000'])('rejects a malformed verified membership UUIDv4 identifier %s', malformed => {
    const value = verifiedFixture(); value.lockBasis.frozenInventory.snapshotId = malformed
    expect(readVerified(value)).toBeNull()
  })
  it.each(['available', 'completeness', 'reason', 'contractVersion', 'snapshotId', 'membershipHash', 'basisStateVersion',
    'lockSnapshotId', 'lockSnapshotHash', 'revisionNumber', 'counts', 'verification'])('rejects an incomplete verified receipt missing %s', key => {
    const value = verifiedFixture(); delete value.lockBasis.frozenInventory[key]; expect(readVerified(value)).toBeNull()
  })
  it.each([
    ['contractVersion', 'future'], ['membershipHash', 'sha256:' + 'c'.repeat(64)], ['membershipHash', 'C'.repeat(64)],
    ['lockSnapshotId', 'other'], ['lockSnapshotHash', 'b'.repeat(64)], ['basisStateVersion', 'older'],
    ['revisionNumber', 3], ['revisionNumber', '2'], ['revisionNumber', 0], ['reason', 'unknown'], ['completeness', 'COMPLETE'],
  ])('rejects conflicting verified %s', (key, invalid) => {
    const value = verifiedFixture(); value.lockBasis.frozenInventory[key] = invalid; expect(readVerified(value)).toBeNull()
  })
  it.each([null, '2', 0, 3, 2.5, undefined])('requires exact actual nested control revision %j', revision => {
    const value = verifiedFixture(); value.control.revision.revisionNumber = revision; value.control.revisionNumber = 2
    expect(readVerified(value)).toBeNull()
  })
  it.each([['sources', -1], ['sources', 1001], ['evidence', 5001], ['sections', 101], ['evidence', '853'],
    ['sources', 1.5], ['sections', null], ['evidence', undefined]])('rejects invalid frozen %s count %j', (key, invalid) => {
    const value = verifiedFixture(); value.lockBasis.frozenInventory.counts[key] = invalid; expect(readVerified(value)).toBeNull()
  })
  it.each(['descriptor', 'counts', 'verification'])('rejects extra/private %s fields', domain => {
    const value = verifiedFixture(), frozen = value.lockBasis.frozenInventory
    ;(domain === 'descriptor' ? frozen : frozen[domain]).lockedEvidenceSnapshot = { secret: 'private' }
    expect(readVerified(value)).toBeNull()
  })
  it.each([['basis', 'CURRENT_INVENTORY'], ['materialHashAlgorithm', 'other'], ['auditLinkVerified', false]])('rejects unverified %s', (key, invalid) => {
    const value = verifiedFixture(); value.lockBasis.frozenInventory.verification[key] = invalid; expect(readVerified(value)).toBeNull()
  })
  it.each([{ loading: true }, { error: {} }, { stateVersion: 'other' },
    { scope: { runtimeInstanceId: 'other', customerId: 'customer-1', tenantId: 'tenant-1' } }])('hides retained verified membership on departure %j', options => {
    expect(readVerified(verifiedFixture(), options)).toBeNull()
  })
  it('projects recorded metadata independently from membership/integrity', () => {
    expect(read(lockBasisFixture())).toMatchObject({ available: true, snapshot: { snapshotId: 'lock-receipt-2' }, replay: { available: true } })
  })
  it('retains explicit no-record basis without granting authority', () => {
    expect(read(lockBasisFixture({ locked: false }))).toMatchObject({ available: false, locked: false, reason: 'LOCK_NOT_RECORDED' })
  })
  it.each([{ loading: true }, { error: {} }, { stateVersion: 'other' }])('hides retained metadata %j', options => expect(read(lockBasisFixture(), options)).toBeNull())
  it.each([
    ['control', 'customerId', 'other'], ['control', 'tenantId', 'other'], ['control', 'id', 'other'], ['control', 'stateVersion', 'other'],
    ['readReceipt', 'bounded', false], ['readReceipt', 'maxTimeMS', 3000], ['readReceipt', 'serializedPayloadBytes', 524289],
    ['lockBasis', 'lockedAt', '2026-02-30T00:00:00.000Z'], ['lockBasis', 'lockedBy', 'bad\nactor'], ['lockBasis', 'lockVersion', -1],
  ])('rejects incompatible %s.%s', (field, key, invalid) => {
    const f = lockBasisFixture(); f[field][key] = invalid
    if (field === 'control' && key === 'id') f.control.runtimeInstanceKey = invalid
    expect(read(f)).toBeNull()
  })
  it.each(['snapshotHash', 'snapshotAt', 'contractVersion', 'actionKey'])('rejects invalid snapshot %s', key => {
    const f = lockBasisFixture(); f.lockBasis.snapshot[key] = 'invalid'; expect(read(f)).toBeNull()
  })
  it('rejects mismatched replay, preserves valid metadata with explicit missing replay', () => {
    const f = lockBasisFixture(); f.lockBasis.replay.anchor.lockSnapshotId = 'other'; expect(read(f)).toBeNull()
    f.lockBasis.replay = { available: false, reason: 'REPLAY_ANCHOR_MISSING', anchor: null }
    expect(read(f)).toMatchObject({ available: true, replay: { available: false } })
  })
  it('rejects invented frozen membership and malformed no-lock signals', () => {
    const f = lockBasisFixture(); f.lockBasis.frozenInventory.available = true; expect(read(f)).toBeNull()
    const u = lockBasisFixture({ locked: false }); u.lockBasis.locked = null; expect(read(u)).toBeNull()
  })
  it.each(['LOCKED', 'DRAFT'])('rejects an unlocked receipt with inconsistent root %s signals', status => {
    const f = lockBasisFixture({ locked: false }); f.control.status = status
    if (status === 'DRAFT') f.control.lockedAt = '2026-09-17T18:14:00.000Z'
    expect(read(f)).toBeNull()
  })
  it.each([undefined, null, false, 0, '', '2026-09-18T18:14:00.000Z'])('rejects locked metadata mismatching root time %j', stamp => {
    const f = lockBasisFixture(); f.control.lockedAt = stamp; expect(read(f)).toBeNull()
  })
})
