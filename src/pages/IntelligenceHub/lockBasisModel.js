import { getHubPayload } from './intelligenceHubModel.js'

const identity = (value, limit = 240) => typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= limit
  && !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const time = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value
const missing = ['LOCK_NOT_RECORDED', 'LOCK_METADATA_MISSING', 'LOCK_STATE_INVALID', 'LOCK_STATE_CONFLICT', 'LOCK_TIME_CONFLICT', 'LOCK_SNAPSHOT_MISSING', 'LOCK_SNAPSHOT_INVALID', 'LOCK_METADATA_INVALID']
const exactRecord = (value, keys) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Object.getOwnPropertySymbols(value).length) return false
  const descriptors = Object.getOwnPropertyDescriptors(value)
  return Object.keys(descriptors).length === keys.length && keys.every(key => descriptors[key]?.enumerable === true
    && Object.hasOwn(descriptors[key], 'value'))
}
const count = (value, maximum) => Number.isSafeInteger(value) && value >= 0 && value <= maximum
const canonicalStateVersion = /^rsv2:[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const membershipSnapshotId = /^evidence_snapshot_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const readFrozenInventory = (frozen, control, snapshot, stateVersion) => {
  if (!exactRecord(frozen, ['available', 'completeness', 'reason', 'contractVersion', 'snapshotId', 'membershipHash',
    'basisStateVersion', 'lockSnapshotId', 'lockSnapshotHash', 'revisionNumber', 'counts', 'verification'])
    || frozen.available !== true || frozen.completeness !== 'VERIFIED' || frozen.reason !== null
    || frozen.contractVersion !== 'runtime-evidence-membership.v1' || !identity(frozen.snapshotId)
    || !membershipSnapshotId.test(frozen.snapshotId) || typeof frozen.basisStateVersion !== 'string'
    || !canonicalStateVersion.test(frozen.basisStateVersion)
    || !hash(frozen.membershipHash) || frozen.basisStateVersion !== stateVersion
    || frozen.lockSnapshotId !== snapshot?.snapshotId || frozen.lockSnapshotHash !== snapshot?.snapshotHash
    || !hash(frozen.lockSnapshotHash) || !Number.isSafeInteger(frozen.revisionNumber) || frozen.revisionNumber < 1
    || !Number.isSafeInteger(control?.revision?.revisionNumber) || control.revision.revisionNumber < 1
    || frozen.revisionNumber !== control.revision.revisionNumber
    || !exactRecord(frozen.counts, ['sources', 'evidence', 'sections'])
    || !count(frozen.counts.sources, 1000) || !count(frozen.counts.evidence, 5000) || !count(frozen.counts.sections, 100)
    || !exactRecord(frozen.verification, ['basis', 'materialHashAlgorithm', 'auditLinkVerified'])
    || frozen.verification.basis !== 'EXACT_PERSISTED_MEMBERSHIP'
    || frozen.verification.materialHashAlgorithm !== 'sha256-canonical-json-housekeeping-excluded.v1'
    || frozen.verification.auditLinkVerified !== true) return null
  return JSON.parse(JSON.stringify(frozen))
}

export function readLockBasis({ response, scope, stateVersion, loading, error }) {
  const value = getHubPayload(response), b = value?.readReceipt, lock = value?.lockBasis
  const frozen = readFrozenInventory(lock?.frozenInventory, value?.control, lock?.snapshot, stateVersion)
  const legacyFrozen = lock?.frozenInventory?.available === false && lock.frozenInventory.completeness === 'UNAVAILABLE'
    && lock.frozenInventory.reason === 'FROZEN_MEMBERSHIP_NOT_RECORDED'
  if (loading || error || !identity(stateVersion) || value?.contractVersion !== 'intelligence-lock-basis.v1'
    || value.source !== 'runtime_state_v2.lock_basis' || value.currency !== 'AS_READ' || !time(value.readAt)
    || value.control?.customerId !== scope.customerId || value.control?.tenantId !== scope.tenantId
    || ![value.control?.id, value.control?.runtimeInstanceKey].includes(scope.runtimeInstanceId) || value.control?.stateVersion !== stateVersion
    || b?.source !== value.source || b.bounded !== true || b.fullLegacyFrameworkStateFetched !== false
    || b.maxTimeMS !== 2000 || b.requestTimeoutMS !== 6000 || b.workTimeoutMS !== 5500 || b.cleanupReserveMS !== 500
    || b.maxSerializedPayloadBytes !== 524288 || !Number.isSafeInteger(b.serializedPayloadBytes) || b.serializedPayloadBytes < 0 || b.serializedPayloadBytes > 524288
    || (!legacyFrozen && !frozen)) return null
  if (lock.available === false) {
    if (frozen || !missing.includes(lock.reason) || lock.snapshot !== null || lock.replay?.available !== false
      || lock.replay.reason !== 'LOCK_BASIS_UNAVAILABLE' || lock.replay.anchor !== null
      || (lock.reason === 'LOCK_NOT_RECORDED' ? lock.locked !== false : ![null, true].includes(lock.locked))) return null
    if (lock.reason === 'LOCK_NOT_RECORDED' && (value.control.status === 'LOCKED' || value.control.lockedAt !== null)) return null
    return { available: false, reason: lock.reason, locked: lock.locked, stateVersion, readAt: value.readAt }
  }
  const s = lock.snapshot, r = lock.replay, a = r?.anchor
  if (lock.available !== true || lock.reason !== null || lock.locked !== true || !time(lock.lockedAt)
    || !time(value.control.lockedAt) || value.control.lockedAt !== lock.lockedAt
    || (lock.lockedBy !== null && !identity(lock.lockedBy, 220))
    || (lock.lockVersion !== null && (!Number.isSafeInteger(lock.lockVersion) || lock.lockVersion < 1))
    || !identity(s?.snapshotId) || !hash(s.snapshotHash) || !time(s.snapshotAt) || s.snapshotAt !== lock.lockedAt
    || s.contractVersion !== 'runtime-truth-snapshot-v1' || s.actionKey !== 'LOCK_RECORD') return null
  if (r?.available === true) {
    if (r.reason !== null || !identity(a?.replayAnchorId) || !hash(a.replayAnchorHash)
      || a.relationship !== 'LOCKED_VALUE_NARRATIVE' || a.runtimeInstanceId !== value.control.id
      || a.runtimeInstanceKey !== value.control.runtimeInstanceKey || a.lockSnapshotId !== s.snapshotId || a.lockSnapshotHash !== s.snapshotHash) return null
  } else if (r?.available !== false || !['REPLAY_ANCHOR_MISSING', 'REPLAY_ANCHOR_INVALID'].includes(r.reason) || a !== null) return null
  return { available: true, locked: true, lockedAt: lock.lockedAt, lockedBy: lock.lockedBy, lockVersion: lock.lockVersion,
    snapshot: { snapshotId: s.snapshotId, snapshotHash: s.snapshotHash, snapshotAt: s.snapshotAt, contractVersion: s.contractVersion },
    replay: { available: r.available, reason: r.reason, anchor: a ? { replayAnchorId: a.replayAnchorId, replayAnchorHash: a.replayAnchorHash } : null },
    ...(frozen ? { frozenInventory: frozen } : {}), stateVersion, readAt: value.readAt }
}

export const lockBasisLabel = (model, loading) => loading ? 'Loading…' : model?.available ? 'Recorded locked snapshot'
  : model?.reason === 'LOCK_NOT_RECORDED' ? 'No recorded lock basis' : 'Unavailable'
