import { describe, expect, it } from 'vitest'
import { readLockBasis } from './lockBasisModel.js'
import { lockBasisFixture } from '../../test/lockBasisFixture.js'

const read = (response, options = {}) => readLockBasis({ response: { data: response }, scope: { runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1' }, stateVersion: 'version-2', ...options })
describe('current recorded lock basis', () => {
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
