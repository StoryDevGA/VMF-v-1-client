import { describe, expect, it, vi } from 'vitest'
import { readLockBasis, clonePostLockOperationalResponse, readPostLockOperationalCapability, postLockOperationalExplanations } from './lockBasisModel.js'
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

const operationalFixture = (changes = {}) => {
  const scope = { runtimeInstanceId: '1'.repeat(24), customerId: '2'.repeat(24), tenantId: '3'.repeat(24) }
  const raw = verifiedFixture()
  Object.assign(raw.control, { id: scope.runtimeInstanceId, runtimeInstanceKey: 'revision-key', customerId: scope.customerId, tenantId: scope.tenantId })
  Object.assign(raw.lockBasis.replay.anchor, { runtimeInstanceId: scope.runtimeInstanceId, runtimeInstanceKey: 'revision-key' })
  const lockBasis = readLockBasis({ response: { data: raw }, scope, stateVersion: verifiedStateVersion })
  const binding = { ...scope, runtimeInstanceKey: 'revision-key', revisionNumber: 2, basisStateVersion: verifiedStateVersion,
    evidenceSnapshotId: raw.lockBasis.frozenInventory.snapshotId, membershipHash: 'c'.repeat(64), lockSnapshotId: 'lock-receipt-2',
    lockSnapshotHash: 'a'.repeat(64), packageId: '4'.repeat(24), packageVersion: 'v1', dependencySnapshotId: 'dependency-1',
    dependencySnapshotHash: 'd'.repeat(64), policyHash: 'e'.repeat(64) }
  const checks = { authority: 'VMF_UPDATE_VERIFIED', isolation: 'CLEAR', frozenBasis: 'VERIFIED', policy: 'VERIFIED', storageIndexes: 'VERIFIED_AS_WRITER', ...changes }
  const reasons = [checks.authority === 'VMF_UPDATE_REQUIRED' && 'VMF_UPDATE_REQUIRED', checks.isolation === 'BLOCKED' && 'CONTROLLED_REPLAY_ISOLATED',
    checks.frozenBasis === 'LOCK_BASIS_UNAVAILABLE' && 'LOCK_BASIS_UNAVAILABLE', checks.frozenBasis === 'NOT_RECORDED' && 'FROZEN_MEMBERSHIP_NOT_RECORDED',
    checks.policy === 'NOT_RECORDED' && 'POST_LOCK_POLICY_NOT_RECORDED', checks.policy === 'UNAVAILABLE' && 'POST_LOCK_POLICY_UNAVAILABLE',
    checks.storageIndexes === 'MISMATCH' && 'POST_LOCK_INDEX_REQUIRED'].filter(Boolean)
  return { owned: true, scope, stateVersion: verifiedStateVersion, lockBasis,
    renderer: { runtimeInstance: { id: scope.runtimeInstanceId, runtimeInstanceKey: 'revision-key', customerId: scope.customerId, tenantId: scope.tenantId, stateVersion: verifiedStateVersion, packageId: binding.packageId },
      revision: { revisionNumber: 2 }, package: { packageId: binding.packageId, frameworkVersion: binding.packageVersion, snapshotId: binding.dependencySnapshotId } },
    response: { data: { contractVersion: 'post-lock-evidence-operational-capability.v1', readAt: '2026-11-06T22:00:00.000Z', currency: 'AS_READ',
      recording: { eligibility: reasons.length ? 'BLOCKED' : 'ELIGIBLE_AS_READ', blockedBy: reasons,
        binding: checks.frozenBasis === 'VERIFIED' && checks.policy === 'VERIFIED' ? binding : null, checks },
      impact: { eligibility: 'ITEM_REQUIRED' }, admission: { eligibility: 'ITEM_REQUIRED' },
      execution: { mode: 'EXPLICIT_SUBMIT_REQUIRED', recheck: 'SERVER_RECHECKS_ON_SUBMIT', indexRead: 'OUTSIDE_TRANSACTION_NOT_ATOMIC', submissionMaterial: 'NOT_CHECKED' } },
    meta: { version: 'v1' } } }
}

describe('separate post-lock operational availability read', () => {
  it('accepts the producer package-key alias while retaining canonical runtime package authority', () => {
    const args = operationalFixture(), packageKey = 'ss056-task03-fixture'
    Object.assign(args.renderer.package, { packageId: packageKey, packageKey })
    const model = readPostLockOperationalCapability(args)
    expect(model.state).toBe('VERIFIED')
    expect(model.data.recording.binding.packageId).toBe(args.renderer.runtimeInstance.packageId)
    expect(model.data.recording.binding.packageId).not.toBe(packageKey)
  })
  it.each([undefined, null, 'f'.repeat(24), 'ss056-task03-fixture'])('rejects a package-key alias without the matching canonical runtime package %s', packageId => {
    const args = operationalFixture(), packageKey = 'ss056-task03-fixture'
    Object.assign(args.renderer.package, { packageId: packageKey, packageKey })
    args.renderer.runtimeInstance.packageId = packageId
    expect(readPostLockOperationalCapability(args)).toEqual({ state: 'STALE' })
  })
  it.each([
    ['inconsistent', 'other-key', 'ss056-task03-fixture'],
    ['missing', 'ss056-task03-fixture', undefined],
    ['empty', '', ''],
    ['untrimmed', ' ss056-task03-fixture ', ' ss056-task03-fixture '],
    ['overbound', 'x'.repeat(181), 'x'.repeat(181)],
  ])('rejects a %s renderer package-key alias', (_name, packageId, packageKey) => {
    const args = operationalFixture()
    Object.assign(args.renderer.package, { packageId, packageKey })
    expect(readPostLockOperationalCapability(args)).toEqual({ state: 'STALE' })
  })
  it('accepts a matching alias at the consumer text bound', () => {
    const args = operationalFixture(), packageKey = 'x'.repeat(180)
    Object.assign(args.renderer.package, { packageId: packageKey, packageKey })
    expect(readPostLockOperationalCapability(args).state).toBe('VERIFIED')
  })
  it('accepts a complete bound read without introducing operation flags or retaining mutable input', () => {
    const args = operationalFixture(), before = JSON.stringify(args.response), model = readPostLockOperationalCapability(args)
    expect(model.state).toBe('VERIFIED')
    expect(model.data).toEqual(args.response.data)
    expect(model).not.toHaveProperty('canSubmit'); expect(model).not.toHaveProperty('canAdmit')
    model.data.recording.binding.policyHash = 'f'.repeat(64)
    expect(JSON.stringify(args.response)).toBe(before)
    expect(postLockOperationalExplanations(readPostLockOperationalCapability(args)).join(' ')).toMatch(/recording prerequisites.*fresh server checks/)
  })
  it.each([
    ['VMF_UPDATE_REQUIRED', { authority: 'VMF_UPDATE_REQUIRED' }],
    ['CONTROLLED_REPLAY_ISOLATED', { isolation: 'BLOCKED', frozenBasis: 'NOT_CHECKED', policy: 'NOT_CHECKED', storageIndexes: 'NOT_CHECKED' }],
    ['LOCK_BASIS_UNAVAILABLE', { frozenBasis: 'LOCK_BASIS_UNAVAILABLE', policy: 'NOT_CHECKED', storageIndexes: 'NOT_CHECKED' }],
    ['FROZEN_MEMBERSHIP_NOT_RECORDED', { frozenBasis: 'NOT_RECORDED', policy: 'NOT_CHECKED', storageIndexes: 'NOT_CHECKED' }],
    ['POST_LOCK_POLICY_NOT_RECORDED', { policy: 'NOT_RECORDED', storageIndexes: 'NOT_CHECKED' }],
    ['POST_LOCK_POLICY_UNAVAILABLE', { policy: 'UNAVAILABLE', storageIndexes: 'NOT_CHECKED' }],
    ['POST_LOCK_INDEX_REQUIRED', { storageIndexes: 'MISMATCH' }],
  ])('preserves the exact server %s blocker and whether binding is present', (reason, checks) => {
    const args = operationalFixture(checks), model = readPostLockOperationalCapability(args)
    expect(model.state).toBe('VERIFIED'); expect(model.data.recording.blockedBy).toEqual([reason])
    expect(model.data.recording.binding).toEqual(args.response.data.recording.binding)
    expect(postLockOperationalExplanations(model).every(text => typeof text === 'string')).toBe(true)
    if (checks.storageIndexes === 'NOT_CHECKED') {
      expect(postLockOperationalExplanations(model).join(' ')).not.toContain('Storage checks were observed')
      expect(postLockOperationalExplanations(model).join(' ')).toContain('Storage checks have not been assessed')
    }
  })
  it('preserves ordered independent blockers and does not require invented scope fields for an owned null-binding result', () => {
    const args = operationalFixture({ authority: 'VMF_UPDATE_REQUIRED', policy: 'NOT_RECORDED', storageIndexes: 'NOT_CHECKED' })
    expect(readPostLockOperationalCapability(args).data.recording.blockedBy).toEqual(['VMF_UPDATE_REQUIRED', 'POST_LOCK_POLICY_NOT_RECORDED'])
    expect(readPostLockOperationalCapability({ ...args, owned: false })).toEqual({ state: 'UNAVAILABLE' })
  })
  it.each(['123e4567-e89b-12d3-a456-426614174000', '123E4567-E89B-82D3-A456-426614174000', '00000000-0000-0000-0000-000000000000', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF'])('accepts middleware-valid optional requestId %s', requestId => {
    const args = operationalFixture(); args.response.meta.requestId = requestId
    expect(readPostLockOperationalCapability(args).state).toBe('VERIFIED')
  })
  it('accepts the largest permitted UTF-8 binding text below the response cap', () => {
    const args = operationalFixture(), b = args.response.data.recording.binding
    b.runtimeInstanceKey = '漢'.repeat(160); args.renderer.runtimeInstance.runtimeInstanceKey = b.runtimeInstanceKey
    b.lockSnapshotId = '漢'.repeat(240); args.lockBasis.snapshot.snapshotId = b.lockSnapshotId; args.lockBasis.frozenInventory.lockSnapshotId = b.lockSnapshotId
    b.dependencySnapshotId = '漢'.repeat(240); args.renderer.package.snapshotId = b.dependencySnapshotId
    b.packageVersion = '漢'.repeat(180); args.renderer.package.frameworkVersion = b.packageVersion
    args.response.meta.requestId = 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF'
    const bytes = new TextEncoder().encode(JSON.stringify(args.response)).length
    expect(bytes).toBeLessThan(16384); expect(readPostLockOperationalCapability(args).state).toBe('VERIFIED')
  })
  it('characterizes the actual safe-clone helper byte edge with non-DTO fixtures, separately from valid DTO acceptance', () => {
    const safeJson = [...Array.from({ length: 5 }, () => '漢'.repeat(1024)), 'x'.repeat(1005)]
    expect(new TextEncoder().encode(JSON.stringify(safeJson)).length).toBe(16384)
    expect(clonePostLockOperationalResponse(safeJson)).toEqual(safeJson)
    safeJson[5] += 'x'
    expect(new TextEncoder().encode(JSON.stringify(safeJson)).length).toBe(16385)
    expect(() => clonePostLockOperationalResponse(safeJson)).toThrow()
  })
  it('bounds depth, node count and individual string length before serialization', () => {
    const nested = depth => depth ? [nested(depth - 1)] : null
    expect(clonePostLockOperationalResponse(nested(8))).toEqual(nested(8))
    for (const value of [nested(9), Array(256).fill(null), 'x'.repeat(1025)]) expect(() => clonePostLockOperationalResponse(value)).toThrow()
    expect(clonePostLockOperationalResponse(Array(255).fill(null))).toHaveLength(255)
  })
  it.each(['top', 'data', 'meta', 'nested', 'toJSON'])('does not invoke a %s getter or toJSON', kind => {
    const args = operationalFixture(), getter = vi.fn(() => { throw new Error('private'); })
    if (kind === 'top') Object.defineProperty(args.response, 'data', { enumerable: true, get: getter })
    if (kind === 'data') Object.defineProperty(args.response.data, 'recording', { enumerable: true, get: getter })
    if (kind === 'meta') Object.defineProperty(args.response.meta, 'requestId', { enumerable: true, get: getter })
    if (kind === 'nested') Object.defineProperty(args.response.data.recording.binding, 'policyHash', { enumerable: true, get: getter })
    if (kind === 'toJSON') args.response.data.toJSON = getter
    expect(readPostLockOperationalCapability(args)).toEqual({ state: 'UNAVAILABLE' }); expect(getter).not.toHaveBeenCalled()
  })
  it.each(['symbol', 'sparse', 'array-extra', 'nonplain', 'undefined', 'nan', 'nonenumerable'])('rejects %s input', kind => {
    const args = operationalFixture(), value = args.response.data.recording
    if (kind === 'symbol') value[Symbol('private')] = true
    if (kind === 'sparse') value.blockedBy = Array(1)
    if (kind === 'array-extra') value.blockedBy.extra = 'private'
    if (kind === 'nonplain') Object.setPrototypeOf(value, { inherited: true })
    if (kind === 'undefined') value.binding.packageVersion = undefined
    if (kind === 'nan') value.binding.revisionNumber = NaN
    if (kind === 'nonenumerable') Object.defineProperty(value, 'hidden', { value: true })
    expect(readPostLockOperationalCapability(args)).toEqual({ state: 'UNAVAILABLE' })
  })
  it.each([
    ['contractVersion', 'future'], ['readAt', '2026-11-06T22:00:00Z'], ['readAt', '2026-02-30T22:00:00.000Z'], ['currency', 'CURRENT'],
    ['recording.eligibility', 'ALLOWED'], ['recording.checks.authority', 'ADMIN'], ['recording.checks.isolation', 'UNKNOWN'],
    ['recording.checks.frozenBasis', 'CURRENT'], ['recording.checks.policy', 'ACTIVE'], ['recording.checks.storageIndexes', 'VERIFIED'],
    ['impact.eligibility', 'ELIGIBLE'], ['admission.eligibility', 'ELIGIBLE'], ['execution.mode', 'AUTO'],
    ['execution.recheck', 'NONE'], ['execution.indexRead', 'ATOMIC'], ['execution.submissionMaterial', 'VERIFIED'],
    ['recording.binding.customerId', 'A'.repeat(24)], ['recording.binding.tenantId', 'wrong'], ['recording.binding.runtimeInstanceId', 'wrong'],
    ['recording.binding.runtimeInstanceKey', ' x'], ['recording.binding.revisionNumber', 0], ['recording.binding.basisStateVersion', 'rsv2:wrong'],
    ['recording.binding.evidenceSnapshotId', 'wrong'], ['recording.binding.membershipHash', 'A'.repeat(64)], ['recording.binding.lockSnapshotId', ''],
    ['recording.binding.lockSnapshotHash', 'wrong'], ['recording.binding.packageId', 'wrong'], ['recording.binding.packageVersion', 'v'.repeat(181)],
    ['recording.binding.dependencySnapshotId', 'x'.repeat(241)], ['recording.binding.dependencySnapshotHash', 'wrong'], ['recording.binding.policyHash', 'wrong'],
  ])('rejects invalid %s without displaying raw material', (field, invalid) => {
    const args = operationalFixture(), parts = field.split('.'), leaf = parts.pop()
    parts.reduce((object, key) => object[key], args.response.data)[leaf] = invalid
    expect(readPostLockOperationalCapability(args)).toEqual({ state: 'UNAVAILABLE' })
  })
  it.each(['extra-root', 'extra-data', 'extra-binding', 'missing-binding', 'meta', 'nested-envelope', 'requestId', 'duplicates', 'order', 'missing-blocker', 'false-eligible', 'null-binding', 'isolation', 'policy', 'indexes'])('fails closed for %s contradictions', kind => {
    const args = operationalFixture({ authority: 'VMF_UPDATE_REQUIRED', storageIndexes: 'MISMATCH' }), d = args.response.data
    if (kind === 'extra-root') args.response.extra = true
    if (kind === 'extra-data') d.extra = true
    if (kind === 'extra-binding') d.recording.binding.extra = true
    if (kind === 'missing-binding') delete d.recording.binding.policyHash
    if (kind === 'meta') args.response.meta.version = 'v2'
    if (kind === 'nested-envelope') args.response = { data: args.response }
    if (kind === 'requestId') args.response.meta.requestId = 'private padding'
    if (kind === 'duplicates') d.recording.blockedBy.push('VMF_UPDATE_REQUIRED')
    if (kind === 'order') d.recording.blockedBy.reverse()
    if (kind === 'missing-blocker') d.recording.blockedBy.pop()
    if (kind === 'false-eligible') d.recording.eligibility = 'ELIGIBLE_AS_READ'
    if (kind === 'null-binding') d.recording.binding = null
    if (kind === 'isolation') d.recording.checks.isolation = 'BLOCKED'
    if (kind === 'policy') d.recording.checks.policy = 'NOT_CHECKED'
    if (kind === 'indexes') d.recording.checks.storageIndexes = 'NOT_CHECKED'
    expect(readPostLockOperationalCapability(args)).toEqual({ state: 'UNAVAILABLE' })
  })
  it.each(['customer', 'tenant', 'revision', 'key', 'state', 'revision-number', 'membership-id', 'membership-hash', 'membership-state', 'membership-revision', 'lock-id', 'lock-hash', 'package', 'version', 'dependency', 'missing', 'missing-scope'])('withholds a bound result after %s comparison changes', kind => {
    const args = operationalFixture()
    if (kind === 'customer') args.scope.customerId = 'f'.repeat(24)
    if (kind === 'tenant') args.scope.tenantId = 'f'.repeat(24)
    if (kind === 'revision') args.renderer.runtimeInstance.id = 'f'.repeat(24)
    if (kind === 'key') args.renderer.runtimeInstance.runtimeInstanceKey = 'other'
    if (kind === 'state') args.stateVersion = 'other'
    if (kind === 'revision-number') args.renderer.revision.revisionNumber = 3
    if (kind === 'membership-id') args.lockBasis.frozenInventory.snapshotId = 'other'
    if (kind === 'membership-hash') args.lockBasis.frozenInventory.membershipHash = 'f'.repeat(64)
    if (kind === 'membership-state') args.lockBasis.frozenInventory.basisStateVersion = 'other'
    if (kind === 'membership-revision') args.lockBasis.frozenInventory.revisionNumber = 3
    if (kind === 'lock-id') args.lockBasis.snapshot.snapshotId = 'other'
    if (kind === 'lock-hash') args.lockBasis.frozenInventory.lockSnapshotHash = 'f'.repeat(64)
    if (kind === 'package') args.renderer.package.packageId = 'f'.repeat(24)
    if (kind === 'version') args.renderer.package.frameworkVersion = 'other'
    if (kind === 'dependency') args.renderer.package.snapshotId = 'other'
    if (kind === 'missing') args.lockBasis = null
    if (kind === 'missing-scope') args.scope = undefined
    expect(readPostLockOperationalCapability(args)).toEqual({ state: 'STALE' })
  })
  it.each([[{ loading: true }, 'CHECKING'], [{ error: { status: 403 } }, 'DENIED'], [{ error: { status: 503, data: { message: 'private' } } }, 'UNAVAILABLE'], [{ owned: false }, 'UNAVAILABLE'], [{ response: undefined }, 'UNAVAILABLE']])('hides retained data for %j', (patch, state) => {
    const result = readPostLockOperationalCapability({ ...operationalFixture(), ...patch })
    expect(result).toEqual({ state }); expect(postLockOperationalExplanations(result).join(' ')).not.toMatch(/private|no recorded post-lock policy/)
  })
})
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

const capabilityFixture = (reason = 'POST_LOCK_IMPLEMENTATION_MAPPING_UNVERIFIED') => {
  const value = verifiedFixture(), frozen = value.lockBasis.frozenInventory
  const status = { POST_LOCK_POLICY_NOT_RECORDED: 'NOT_RECORDED', POST_LOCK_POLICY_INVALID: 'INVALID',
    POST_LOCK_POLICY_DISABLED: 'DISABLED', POST_LOCK_POLICY_BINDING_UNVERIFIED: 'DECLARED_UNVERIFIED',
    POST_LOCK_IMPLEMENTATION_MAPPING_UNVERIFIED: 'DECLARED_UNVERIFIED' }[reason]
  value.lockBasis.outsideSnapshotIntake = {
    contractVersion: 'post-lock-evidence-intake-capability.v1', available: false, reason,
    blockedBy: reason === 'POST_LOCK_POLICY_BINDING_UNVERIFIED'
      ? [reason, 'POST_LOCK_IMPLEMENTATION_MAPPING_UNVERIFIED'] : [reason],
    policy: { status, ...(['POST_LOCK_POLICY_DISABLED', 'POST_LOCK_IMPLEMENTATION_MAPPING_UNVERIFIED'].includes(reason)
      ? { policyKey: 'test-policy', policyVersion: '1.0', policyHash: 'd'.repeat(64) } : {}) },
    frozenBasis: { available: true, snapshotId: frozen.snapshotId, membershipHash: frozen.membershipHash,
      basisStateVersion: frozen.basisStateVersion },
    registrationAvailable: false, dispositionAvailable: false, impactApplicationAvailable: false,
  }
  return value
}

describe('server-owned unavailable post-lock capability', () => {
  it.each([80, 81, 180, 181])('matches the server policy-version boundary at %i characters', length => {
    const value = capabilityFixture(); value.lockBasis.outsideSnapshotIntake.policy.policyVersion = 'v'.repeat(length)
    expect(Boolean(readVerified(value).outsideSnapshotIntake)).toBe(length <= 180)
  })
  it.each([180, 181])('matches the server policy-key boundary at %i characters', length => {
    const value = capabilityFixture(); value.lockBasis.outsideSnapshotIntake.policy.policyKey = 'k'.repeat(length)
    expect(Boolean(readVerified(value).outsideSnapshotIntake)).toBe(length <= 180)
  })
  it.each(['POST_LOCK_POLICY_NOT_RECORDED', 'POST_LOCK_POLICY_INVALID', 'POST_LOCK_POLICY_DISABLED',
    'POST_LOCK_POLICY_BINDING_UNVERIFIED', 'POST_LOCK_IMPLEMENTATION_MAPPING_UNVERIFIED'])('retains only safe current %s presentation', reason => {
    const value = capabilityFixture(reason), before = JSON.stringify(value)
    const model = readVerified(value)
    expect(model.outsideSnapshotIntake).toEqual({ contractVersion: 'post-lock-evidence-intake-capability.v1',
      available: false, reason, blockedBy: value.lockBasis.outsideSnapshotIntake.blockedBy })
    model.outsideSnapshotIntake.blockedBy.push('local-only')
    expect(JSON.stringify(value)).toBe(before)
    expect(JSON.stringify(model.outsideSnapshotIntake)).not.toMatch(/policyKey|policyHash|frozenBasis|registrationAvailable/)
  })
  it('accepts the exact legacy unrecorded-membership reason without manufacturing a basis', () => {
    const value = lockBasisFixture()
    value.lockBasis.outsideSnapshotIntake = { ...capabilityFixture().lockBasis.outsideSnapshotIntake,
      reason: 'FROZEN_MEMBERSHIP_NOT_RECORDED', blockedBy: ['FROZEN_MEMBERSHIP_NOT_RECORDED'],
      policy: { status: 'NOT_CHECKED' }, frozenBasis: { available: false } }
    expect(read(value).outsideSnapshotIntake.reason).toBe('FROZEN_MEMBERSHIP_NOT_RECORDED')
    expect(read(value)).not.toHaveProperty('frozenInventory')
    value.lockBasis.outsideSnapshotIntake.reason = 'FROZEN_MEMBERSHIP_UNAVAILABLE'
    value.lockBasis.outsideSnapshotIntake.blockedBy = ['FROZEN_MEMBERSHIP_UNAVAILABLE']
    expect(read(value)).not.toHaveProperty('outsideSnapshotIntake')
  })
  it('accepts the uncaptured disabled-policy pair without inventing policy identity', () => {
    const value = capabilityFixture('POST_LOCK_POLICY_DISABLED')
    value.lockBasis.outsideSnapshotIntake.policy = { status: 'DISABLED' }
    value.lockBasis.outsideSnapshotIntake.blockedBy.push('POST_LOCK_POLICY_BINDING_UNVERIFIED')
    expect(readVerified(value).outsideSnapshotIntake.blockedBy).toHaveLength(2)
  })
  it.each(['contractVersion', 'available', 'reason', 'blockedBy', 'policy', 'frozenBasis',
    'registrationAvailable', 'dispositionAvailable', 'impactApplicationAvailable'])('omits an incomplete descriptor missing %s without losing the lock', key => {
    const value = capabilityFixture(); delete value.lockBasis.outsideSnapshotIntake[key]
    expect(readVerified(value)).toMatchObject({ available: true, snapshot: { snapshotId: 'lock-receipt-2' } })
    expect(readVerified(value)).not.toHaveProperty('outsideSnapshotIntake')
  })
  it.each(['available', 'registrationAvailable', 'dispositionAvailable', 'impactApplicationAvailable'])('cannot enable a future %s flag', key => {
    const value = capabilityFixture(); value.lockBasis.outsideSnapshotIntake[key] = true
    expect(readVerified(value)).not.toHaveProperty('outsideSnapshotIntake')
  })
  it.each(['version', 'unknown', 'prototype-name', 'extra', 'policy', 'policy-extra', 'identity', 'unbound-identity',
    'snapshot', 'hash', 'state', 'unavailable-basis', 'lock-unavailable', 'duplicate', 'unknown-blocker', 'sparse', 'blocker-extra', 'nonplain'])('omits incompatible %s metadata', kind => {
    const value = capabilityFixture(), cap = value.lockBasis.outsideSnapshotIntake
    if (kind === 'version') cap.contractVersion = 'future'
    if (kind === 'unknown') cap.reason = 'SERVER_PRIVATE_TEXT'
    if (kind === 'prototype-name') cap.reason = 'constructor'
    if (kind === 'extra') cap.secret = 'private'
    if (kind === 'policy') cap.policy.status = 'DISABLED'
    if (kind === 'policy-extra') cap.policy.secret = 'private'
    if (kind === 'identity') cap.policy.policyHash = 'invalid'
    if (kind === 'unbound-identity') delete cap.policy.policyKey
    if (kind === 'snapshot') cap.frozenBasis.snapshotId = 'different'
    if (kind === 'hash') cap.frozenBasis.membershipHash = 'e'.repeat(64)
    if (kind === 'state') cap.frozenBasis.basisStateVersion = 'older'
    if (kind === 'unavailable-basis') cap.frozenBasis = { available: false }
    if (kind === 'lock-unavailable') cap.reason = 'LOCK_BASIS_UNAVAILABLE'
    if (kind === 'duplicate') cap.blockedBy.push(cap.reason)
    if (kind === 'unknown-blocker') cap.blockedBy = ['SERVER_PRIVATE_TEXT']
    if (kind === 'sparse') cap.blockedBy = Array(1)
    if (kind === 'blocker-extra') cap.blockedBy.secret = true
    if (kind === 'nonplain') Object.setPrototypeOf(cap, { inherited: true })
    expect(readVerified(value)).not.toHaveProperty('outsideSnapshotIntake')
    expect(readVerified(value).available).toBe(true)
  })
  it.each(['optional', 'reason', 'policy', 'blocker'])('does not invoke a %s getter', kind => {
    const value = capabilityFixture(), cap = value.lockBasis.outsideSnapshotIntake
    const getter = () => { throw new Error('must not execute') }
    if (kind === 'optional') Object.defineProperty(value.lockBasis, 'outsideSnapshotIntake', { get: getter, enumerable: true })
    if (kind === 'reason') Object.defineProperty(cap, 'reason', { get: getter, enumerable: true })
    if (kind === 'policy') Object.defineProperty(cap.policy, 'status', { get: getter, enumerable: true })
    if (kind === 'blocker') Object.defineProperty(cap.blockedBy, '0', { get: getter, enumerable: true })
    expect(() => readVerified(value)).not.toThrow()
    expect(readVerified(value)).not.toHaveProperty('outsideSnapshotIntake')
  })
  it.each([{ loading: true }, { error: {} }, { stateVersion: 'older' },
    { scope: { runtimeInstanceId: 'other', customerId: 'customer-1', tenantId: 'tenant-1' } },
    { scope: { runtimeInstanceId: 'revision-2', customerId: 'other', tenantId: 'tenant-1' } },
    { scope: { runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'other' } }])('hides capability on current scope departure %j', options => {
    expect(readVerified(capabilityFixture(), options)).toBeNull()
  })
})
