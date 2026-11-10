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

const readOutsideSnapshotIntake = (lock, frozen) => {
  const property = Object.getOwnPropertyDescriptor(lock, 'outsideSnapshotIntake')
  if (!property || !Object.hasOwn(property, 'value')) return null
  const value = property.value
  if (!exactRecord(value, ['contractVersion', 'available', 'reason', 'blockedBy', 'policy', 'frozenBasis',
    'registrationAvailable', 'dispositionAvailable', 'impactApplicationAvailable'])
    || value.contractVersion !== 'post-lock-evidence-intake-capability.v1' || typeof value.reason !== 'string'
    || ['available', 'registrationAvailable', 'dispositionAvailable', 'impactApplicationAvailable'].some(key => value[key] !== false)) return null
  const policy = value.policy, basis = value.frozenBasis, blockers = value.blockedBy
  if (!Array.isArray(blockers) || Object.getPrototypeOf(blockers) !== Array.prototype
    || blockers.length < 1 || blockers.length > 2 || Object.getOwnPropertySymbols(blockers).length
    || Object.getOwnPropertyNames(blockers).length !== blockers.length + 1
    || !Array.from({ length: blockers.length }, (_, index) => Object.getOwnPropertyDescriptor(blockers, String(index)))
      .every(entry => entry?.enumerable === true && Object.hasOwn(entry, 'value'))) return null
  const hasIdentity = exactRecord(policy, ['status', 'policyKey', 'policyVersion', 'policyHash'])
  if (!hasIdentity && !exactRecord(policy, ['status'])) return null
  if (hasIdentity && (!identity(policy.policyKey, 180) || !identity(policy.policyVersion, 180) || !hash(policy.policyHash))) return null
  let expectedBlockers
  if (!frozen) {
    if (value.reason !== lock.frozenInventory?.reason || value.reason !== 'FROZEN_MEMBERSHIP_NOT_RECORDED'
      || policy.status !== 'NOT_CHECKED' || hasIdentity || !exactRecord(basis, ['available']) || basis.available !== false) return null
    expectedBlockers = [value.reason]
  } else {
    if (!exactRecord(basis, ['available', 'snapshotId', 'membershipHash', 'basisStateVersion']) || basis.available !== true
      || basis.snapshotId !== frozen.snapshotId || basis.membershipHash !== frozen.membershipHash
      || basis.basisStateVersion !== frozen.basisStateVersion) return null
    const statuses = {
      POST_LOCK_POLICY_NOT_RECORDED: 'NOT_RECORDED', POST_LOCK_POLICY_INVALID: 'INVALID',
      POST_LOCK_POLICY_DISABLED: 'DISABLED', POST_LOCK_IMPLEMENTATION_MAPPING_UNVERIFIED: 'DECLARED_UNVERIFIED',
      POST_LOCK_POLICY_BINDING_UNVERIFIED: 'DECLARED_UNVERIFIED',
    }
    if (!Object.hasOwn(statuses, value.reason) || policy.status !== statuses[value.reason]
      || (hasIdentity && !['POST_LOCK_POLICY_DISABLED', 'POST_LOCK_IMPLEMENTATION_MAPPING_UNVERIFIED'].includes(value.reason))
      || (value.reason === 'POST_LOCK_IMPLEMENTATION_MAPPING_UNVERIFIED' && !hasIdentity)) return null
    expectedBlockers = value.reason === 'POST_LOCK_POLICY_BINDING_UNVERIFIED'
      ? [value.reason, 'POST_LOCK_IMPLEMENTATION_MAPPING_UNVERIFIED']
      : value.reason === 'POST_LOCK_POLICY_DISABLED' && !hasIdentity
        ? [value.reason, 'POST_LOCK_POLICY_BINDING_UNVERIFIED'] : [value.reason]
  }
  if (blockers.length !== expectedBlockers.length || blockers.some((reason, index) => reason !== expectedBlockers[index])) return null
  return { contractVersion: value.contractVersion, available: false, reason: value.reason, blockedBy: [...blockers] }
}

const capabilityExplanations = {
  FROZEN_MEMBERSHIP_NOT_RECORDED: 'Post-lock intake is unavailable because exact frozen evidence membership was not recorded.',
  FROZEN_MEMBERSHIP_UNAVAILABLE: 'Post-lock intake is unavailable because the frozen evidence basis could not be verified.',
  POST_LOCK_POLICY_NOT_RECORDED: 'Post-lock intake is unavailable because this revision has no recorded post-lock policy.',
  POST_LOCK_POLICY_INVALID: 'Post-lock intake is unavailable because its recorded policy could not be validated.',
  POST_LOCK_POLICY_DISABLED: 'Post-lock intake is disabled by this revision’s recorded policy.',
  POST_LOCK_IMPLEMENTATION_MAPPING_UNVERIFIED: 'Post-lock intake is unavailable because no implemented intake method has been verified.',
  POST_LOCK_POLICY_BINDING_UNVERIFIED: 'Post-lock intake is unavailable because the policy binding for this revision could not be verified.',
}

export const postLockCapabilityExplanation = model => typeof model?.outsideSnapshotIntake?.reason === 'string'
  && Object.hasOwn(capabilityExplanations, model.outsideSnapshotIntake.reason)
  ? capabilityExplanations[model.outsideSnapshotIntake.reason] : null

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
  const outsideSnapshotIntake = readOutsideSnapshotIntake(lock, frozen)
  return { available: true, locked: true, lockedAt: lock.lockedAt, lockedBy: lock.lockedBy, lockVersion: lock.lockVersion,
    snapshot: { snapshotId: s.snapshotId, snapshotHash: s.snapshotHash, snapshotAt: s.snapshotAt, contractVersion: s.contractVersion },
    replay: { available: r.available, reason: r.reason, anchor: a ? { replayAnchorId: a.replayAnchorId, replayAnchorHash: a.replayAnchorHash } : null },
    ...(frozen ? { frozenInventory: frozen } : {}), ...(outsideSnapshotIntake ? { outsideSnapshotIntake } : {}), stateVersion, readAt: value.readAt }
}

export const lockBasisLabel = (model, loading) => loading ? 'Loading…' : model?.available ? 'Recorded locked snapshot'
  : model?.reason === 'LOCK_NOT_RECORDED' ? 'No recorded lock basis' : 'Unavailable'

/** Clone bounded JSON data without invoking DTO accessors or toJSON. */
export function clonePostLockOperationalResponse(value) {
  let nodes = 0
  const encoder = new TextEncoder()
  const boundedString = text => {
    if (text.length > 1024 || encoder.encode(text).length > 4096) throw new TypeError('Unbounded operational read.')
    return text
  }
  const clone = (input, depth) => {
    if (depth > 8 || ++nodes > 256) throw new TypeError('Unbounded operational read.')
    if (input === null || typeof input === 'boolean') return input
    if (typeof input === 'string') return boundedString(input)
    if (typeof input === 'number' && Number.isFinite(input)) return input
    if (!input || typeof input !== 'object' || Object.getOwnPropertySymbols(input).length) throw new TypeError('Unsafe operational read.')
    const array = Array.isArray(input), prototype = Object.getPrototypeOf(input)
    if (array ? prototype !== Array.prototype : ![Object.prototype, null].includes(prototype)) throw new TypeError('Unsafe operational read.')
    const descriptors = Object.getOwnPropertyDescriptors(input), keys = Object.keys(descriptors)
    if (array && (!Number.isSafeInteger(descriptors.length?.value) || descriptors.length.value < 0
      || keys.length !== descriptors.length.value + 1 || descriptors.length.value > 255)) throw new TypeError('Unsafe operational read.')
    const output = array ? [] : Object.create(null)
    const entries = array ? Array.from({ length: descriptors.length.value }, (_, index) => String(index)) : keys
    for (const key of entries) {
      boundedString(key)
      const descriptor = descriptors[key]
      if (descriptor?.enumerable !== true || !Object.hasOwn(descriptor, 'value')) throw new TypeError('Unsafe operational read.')
      Object.defineProperty(output, key, { value: clone(descriptor.value, depth + 1), enumerable: true, configurable: true, writable: true })
    }
    return output
  }
  const result = clone(value, 0)
  if (encoder.encode(JSON.stringify(result)).length > 16384) throw new TypeError('Unbounded operational read.')
  return result
}

const operationalBlockers = ['VMF_UPDATE_REQUIRED', 'CONTROLLED_REPLAY_ISOLATED', 'LOCK_BASIS_UNAVAILABLE',
  'FROZEN_MEMBERSHIP_NOT_RECORDED', 'POST_LOCK_POLICY_NOT_RECORDED', 'POST_LOCK_POLICY_UNAVAILABLE', 'POST_LOCK_INDEX_REQUIRED']
const operationalBindingKeys = ['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey', 'revisionNumber',
  'basisStateVersion', 'evidenceSnapshotId', 'membershipHash', 'lockSnapshotId', 'lockSnapshotHash', 'packageId',
  'packageVersion', 'dependencySnapshotId', 'dependencySnapshotHash', 'policyHash']
const canonicalText = (value, maximum) => typeof value === 'string' && value.length > 0 && value.length <= maximum && value === value.trim()
const requestUuid = value => typeof value === 'string' && (/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)
  || /^(?:00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i.test(value))
const operationalBindingValid = binding => exactRecord(binding, operationalBindingKeys)
  && ['customerId', 'tenantId', 'runtimeInstanceId', 'packageId'].every(key => typeof binding[key] === 'string' && /^[a-f0-9]{24}$/.test(binding[key]))
  && canonicalText(binding.runtimeInstanceKey, 160) && Number.isSafeInteger(binding.revisionNumber) && binding.revisionNumber > 0
  && typeof binding.basisStateVersion === 'string' && canonicalStateVersion.test(binding.basisStateVersion)
  && typeof binding.evidenceSnapshotId === 'string' && membershipSnapshotId.test(binding.evidenceSnapshotId)
  && ['membershipHash', 'lockSnapshotHash', 'dependencySnapshotHash', 'policyHash'].every(key => hash(binding[key]))
  && canonicalText(binding.lockSnapshotId, 240) && canonicalText(binding.dependencySnapshotId, 240) && canonicalText(binding.packageVersion, 180)

const operationalDto = response => {
  const body = clonePostLockOperationalResponse(response)
  if (!exactRecord(body, ['data', 'meta']) || !(exactRecord(body.meta, ['version']) || exactRecord(body.meta, ['version', 'requestId']))
    || body.meta.version !== 'v1' || Object.hasOwn(body.meta, 'requestId') && !requestUuid(body.meta.requestId)) return null
  const value = body.data
  if (!exactRecord(value, ['contractVersion', 'readAt', 'currency', 'recording', 'impact', 'admission', 'execution'])
    || value.contractVersion !== 'post-lock-evidence-operational-capability.v1' || !time(value.readAt) || value.currency !== 'AS_READ'
    || !exactRecord(value.recording, ['eligibility', 'blockedBy', 'binding', 'checks'])
    || !['ELIGIBLE_AS_READ', 'BLOCKED'].includes(value.recording.eligibility)
    || !exactRecord(value.impact, ['eligibility']) || value.impact.eligibility !== 'ITEM_REQUIRED'
    || !exactRecord(value.admission, ['eligibility']) || value.admission.eligibility !== 'ITEM_REQUIRED'
    || !exactRecord(value.execution, ['mode', 'recheck', 'indexRead', 'submissionMaterial'])
    || value.execution.mode !== 'EXPLICIT_SUBMIT_REQUIRED' || value.execution.recheck !== 'SERVER_RECHECKS_ON_SUBMIT'
    || value.execution.indexRead !== 'OUTSIDE_TRANSACTION_NOT_ATOMIC' || value.execution.submissionMaterial !== 'NOT_CHECKED') return null
  const { checks, blockedBy, binding, eligibility } = value.recording
  if (!exactRecord(checks, ['authority', 'isolation', 'frozenBasis', 'policy', 'storageIndexes'])
    || !['VMF_UPDATE_VERIFIED', 'VMF_UPDATE_REQUIRED'].includes(checks.authority) || !['CLEAR', 'BLOCKED'].includes(checks.isolation)
    || !['VERIFIED', 'LOCK_BASIS_UNAVAILABLE', 'NOT_RECORDED', 'NOT_CHECKED'].includes(checks.frozenBasis)
    || !['VERIFIED', 'NOT_RECORDED', 'UNAVAILABLE', 'NOT_CHECKED'].includes(checks.policy)
    || !['VERIFIED_AS_WRITER', 'MISMATCH', 'NOT_CHECKED'].includes(checks.storageIndexes) || !Array.isArray(blockedBy)) return null
  const conditions = [checks.authority === 'VMF_UPDATE_REQUIRED', checks.isolation === 'BLOCKED', checks.frozenBasis === 'LOCK_BASIS_UNAVAILABLE',
    checks.frozenBasis === 'NOT_RECORDED', checks.policy === 'NOT_RECORDED', checks.policy === 'UNAVAILABLE', checks.storageIndexes === 'MISMATCH']
  const expected = operationalBlockers.filter((_, index) => conditions[index])
  if (blockedBy.length !== expected.length || blockedBy.some((reason, index) => reason !== expected[index])
    || (eligibility === 'ELIGIBLE_AS_READ') !== (blockedBy.length === 0)
    || (binding !== null) !== (checks.frozenBasis === 'VERIFIED' && checks.policy === 'VERIFIED')
    || (checks.isolation === 'BLOCKED') !== (checks.frozenBasis === 'NOT_CHECKED')
    || (checks.frozenBasis !== 'VERIFIED') !== (checks.policy === 'NOT_CHECKED')
    || (checks.policy !== 'VERIFIED') !== (checks.storageIndexes === 'NOT_CHECKED')
    || binding !== null && !operationalBindingValid(binding)) return null
  return value
}

const operationalBindingMatches = (binding, scope, renderer, lockBasis, stateVersion) => {
  const runtime = renderer?.runtimeInstance, frozen = lockBasis?.frozenInventory
  if (!scope || !runtime || !frozen || !lockBasis.available || !lockBasis.locked || lockBasis.stateVersion !== stateVersion
    || binding.customerId !== scope.customerId || binding.tenantId !== scope.tenantId
    || binding.runtimeInstanceId !== runtime.id || binding.runtimeInstanceKey !== runtime.runtimeInstanceKey
    || ![binding.runtimeInstanceId, binding.runtimeInstanceKey].includes(scope.runtimeInstanceId)
    || runtime.customerId !== binding.customerId || runtime.tenantId !== binding.tenantId
    || runtime.packageId !== binding.packageId
    || binding.revisionNumber !== renderer.revision?.revisionNumber || binding.basisStateVersion !== stateVersion || runtime.stateVersion !== stateVersion
    || binding.evidenceSnapshotId !== frozen.snapshotId || binding.membershipHash !== frozen.membershipHash
    || binding.basisStateVersion !== frozen.basisStateVersion || binding.revisionNumber !== frozen.revisionNumber
    || binding.lockSnapshotId !== frozen.lockSnapshotId || binding.lockSnapshotHash !== frozen.lockSnapshotHash
    || binding.lockSnapshotId !== lockBasis.snapshot?.snapshotId || binding.lockSnapshotHash !== lockBasis.snapshot?.snapshotHash) return false
  const projectedPackageId = renderer.package?.packageId
  if (projectedPackageId !== undefined && projectedPackageId !== null && projectedPackageId !== binding.packageId
    && (!canonicalText(renderer.package?.packageKey, 180) || projectedPackageId !== renderer.package.packageKey)) return false
  const supplied = [[renderer.package?.frameworkVersion, binding.packageVersion], [runtime.packageVersion, binding.packageVersion],
    [renderer.package?.snapshotId, binding.dependencySnapshotId], [runtime.dependencyLockId, binding.dependencySnapshotId],
    [runtime.evidence?.dependencySnapshotId, binding.dependencySnapshotId], [runtime.evidence?.dependencySnapshotHash, binding.dependencySnapshotHash]]
  return supplied.every(([actual, expected]) => actual === undefined || actual === null || actual === expected)
}

/** A separate current read state; legacy unavailable-only capability is never a fallback. */
export function readPostLockOperationalCapability({ response, scope, renderer, lockBasis, stateVersion, loading, error, owned = false }) {
  if (loading) return { state: 'CHECKING' }
  if (error) return { state: error.status === 403 ? 'DENIED' : 'UNAVAILABLE' }
  if (!owned) return { state: 'UNAVAILABLE' }
  let value
  try { value = operationalDto(response) } catch { return { state: 'UNAVAILABLE' } }
  if (!value) return { state: 'UNAVAILABLE' }
  if (value.recording.binding && !operationalBindingMatches(value.recording.binding, scope, renderer, lockBasis, stateVersion)) return { state: 'STALE' }
  return { state: 'VERIFIED', data: value }
}

const operationalExplanations = {
  VMF_UPDATE_REQUIRED: 'Recording post-lock evidence requires update permission for this workspace.',
  CONTROLLED_REPLAY_ISOLATED: 'Post-lock recording is unavailable because this runtime is isolated for controlled replay.',
  LOCK_BASIS_UNAVAILABLE: 'Post-lock recording is unavailable because the selected locked basis could not be verified.',
  FROZEN_MEMBERSHIP_NOT_RECORDED: 'Post-lock recording is unavailable because exact frozen evidence membership was not recorded.',
  POST_LOCK_POLICY_NOT_RECORDED: 'Post-lock recording is unavailable because this revision has no recorded post-lock policy.',
  POST_LOCK_POLICY_UNAVAILABLE: 'Post-lock recording is unavailable because its recorded policy could not be verified.',
  POST_LOCK_INDEX_REQUIRED: 'Post-lock recording is unavailable because required storage checks are incomplete. Retry later or contact an administrator.',
}
export const postLockOperationalExplanations = model => model?.state === 'CHECKING' ? ['Checking post-lock recording availability…']
  : model?.state === 'DENIED' ? ['Post-lock recording availability could not be read with your current access.']
    : model?.state === 'STALE' ? ['Post-lock recording availability no longer matches the selected basis. Refresh the selected reads.']
      : model?.state !== 'VERIFIED' ? ['Post-lock recording availability could not be verified. Refresh the selected reads to retry.']
        : [...(model.data.recording.eligibility === 'ELIGIBLE_AS_READ'
          ? [`The server verified recording prerequisites at ${model.data.readAt}.`]
          : model.data.recording.blockedBy.map(reason => operationalExplanations[reason])),
        'An explicit evidence submission requires fresh server checks. This screen does not submit evidence.',
        model.data.recording.checks.storageIndexes === 'NOT_CHECKED'
          ? 'Storage checks have not been assessed; submitted evidence has not been checked.'
          : 'Storage checks were observed separately from the revision read; submitted evidence has not been checked.',
        'Impact review and successor admission require a selected evidence item and are unavailable here.']
