// Mirrors the existing post-lock-evidence-submission.v1 material contract.
// The server owns permission, current binding, storage and audit verification.
export const POST_LOCK_SUBMISSION_VERSION = 'post-lock-evidence-submission.v1'
export const POST_LOCK_CANDIDATE_MAX_BYTES = 65536
const fail = () => { throw new Error('The evidence file does not match the supported source and evidence format.') }
const objectId = /^[a-f0-9]{24}$/
const digest = /^[a-f0-9]{64}$/
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const state = /^rsv2:[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const snapshot = /^evidence_snapshot_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const bytes = value => new TextEncoder().encode(value).length
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const exact = (value, required, optional = []) => {
  if (!record(value) || required.some(key => !Object.hasOwn(value, key))
    || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) fail()
  return value
}
const text = (value, max) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail()
  return value.trim()
}
const matches = (value, pattern) => { if (typeof value !== 'string' || !pattern.test(value)) fail(); return value }
const integer = (value, min, max = Number.MAX_SAFE_INTEGER) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail()
  return value
}
const time = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail()
  return value
}
const list = (value, max, itemMax) => {
  if (!Array.isArray(value) || value.length > max) fail()
  const result = value.map(item => text(item, itemMax))
  if (new Set(result).size !== result.length) fail()
  return result
}

// Reject accessors, foreign prototypes, cycles and oversized/deep material before
// reading it. JSON from RTK Query is ordinary data; tests protect that boundary.
const copy = (input, maxBytes = 131072) => {
  let nodes = 0
  const visit = (value, depth) => {
    if (++nodes > 8192 || depth > 12) fail()
    if (value === null || typeof value === 'boolean') return value
    if (typeof value === 'string') { if (value.length > 8000) fail(); return value }
    if (typeof value === 'number') { if (!Number.isFinite(value)) fail(); return value }
    if (typeof value !== 'object') fail()
    const array = Array.isArray(value)
    const prototype = Object.getPrototypeOf(value)
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) fail()
    const descriptors = Object.getOwnPropertyDescriptors(value)
    if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string')) fail()
    const entries = Object.entries(descriptors).filter(([key]) => !(array && key === 'length'))
    if (entries.some(([, field]) => field.enumerable !== true || !Object.hasOwn(field, 'value'))) fail()
    if (array && (entries.length !== value.length || entries.some(([key], index) => key !== String(index)))) fail()
    const result = entries.map(([key, field]) => [key, visit(field.value, depth + 1)])
    return array ? result.map(([, item]) => item) : Object.fromEntries(result)
  }
  const result = visit(input, 0)
  if (bytes(JSON.stringify(result)) > maxBytes) fail()
  return result
}

const sourceMaterial = value => {
  exact(value, ['sourceId', 'sourceType', 'title', 'locator', 'contentHash', 'retrievedAt', 'currentness',
    'qualifications', 'licensing', 'provenance'], ['asOfAt'])
  exact(value.locator, [], ['url', 'passage', 'page'])
  if (!Object.keys(value.locator).length) fail()
  const locator = {}
  if (Object.hasOwn(value.locator, 'url')) {
    const url = text(value.locator.url, 2000)
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) fail()
    locator.url = url
  }
  if (Object.hasOwn(value.locator, 'passage')) locator.passage = text(value.locator.passage, 4000)
  if (Object.hasOwn(value.locator, 'page')) locator.page = integer(value.locator.page, 1, 100000)
  exact(value.licensing, ['licenceRef', 'retentionPermitted', 'retainUntil'])
  if (typeof value.licensing.retentionPermitted !== 'boolean') fail()
  exact(value.provenance, ['producerKey', 'producerVersion', 'receiptRef', 'acquiredAt'])
  if (!['AS_OF', 'UNCONFIRMED', 'STALE'].includes(value.currentness)
    || (value.currentness === 'AS_OF') !== Object.hasOwn(value, 'asOfAt')) fail()
  return {
    sourceId: text(value.sourceId, 240), sourceType: matches(value.sourceType, /^[A-Z][A-Z0-9_]{0,99}$/),
    title: text(value.title, 1000), locator, contentHash: matches(value.contentHash, /^sha256:[a-f0-9]{64}$/),
    retrievedAt: time(value.retrievedAt), currentness: value.currentness,
    ...(Object.hasOwn(value, 'asOfAt') ? { asOfAt: time(value.asOfAt) } : {}),
    qualifications: list(value.qualifications, 20, 500),
    licensing: { licenceRef: text(value.licensing.licenceRef, 2000), retentionPermitted: value.licensing.retentionPermitted,
      retainUntil: value.licensing.retainUntil === null ? null : time(value.licensing.retainUntil) },
    provenance: { producerKey: text(value.provenance.producerKey, 180), producerVersion: text(value.provenance.producerVersion, 180),
      receiptRef: text(value.provenance.receiptRef, 1000), acquiredAt: time(value.provenance.acquiredAt) },
  }
}
const evidenceMaterial = value => {
  exact(value, ['title', 'statement', 'sectionKeys'])
  return { title: text(value.title, 1000), statement: text(value.statement, 8000), sectionKeys: list(value.sectionKeys, 100, 180) }
}
const bindingMaterial = value => {
  const fields = ['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey', 'revisionNumber', 'basisStateVersion',
    'evidenceSnapshotId', 'membershipHash', 'lockSnapshotId', 'lockSnapshotHash', 'packageId', 'packageVersion',
    'dependencySnapshotId', 'dependencySnapshotHash', 'policyHash']
  exact(value, fields)
  return { customerId: matches(value.customerId, objectId), tenantId: matches(value.tenantId, objectId),
    runtimeInstanceId: matches(value.runtimeInstanceId, objectId), runtimeInstanceKey: text(value.runtimeInstanceKey, 160),
    revisionNumber: integer(value.revisionNumber, 1), basisStateVersion: matches(value.basisStateVersion, state),
    evidenceSnapshotId: matches(value.evidenceSnapshotId, snapshot), membershipHash: matches(value.membershipHash, digest),
    lockSnapshotId: text(value.lockSnapshotId, 240), lockSnapshotHash: matches(value.lockSnapshotHash, digest),
    packageId: matches(value.packageId, objectId), packageVersion: text(value.packageVersion, 180),
    dependencySnapshotId: text(value.dependencySnapshotId, 240), dependencySnapshotHash: matches(value.dependencySnapshotHash, digest),
    policyHash: matches(value.policyHash, digest) }
}
const canonical = value => JSON.stringify((function sort(item) {
  if (Array.isArray(item)) return item.map(sort)
  return record(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, sort(item[key])])) : item
})(value))
const checksum = async value => {
  if (!globalThis.crypto?.subtle) throw new Error('Secure submission verification is unavailable in this browser.')
  const result = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)))
  return [...new Uint8Array(result)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export const parsePostLockCandidate = input => {
  try {
    if (typeof input !== 'string' || bytes(input) > POST_LOCK_CANDIDATE_MAX_BYTES) fail()
    const value = copy(JSON.parse(input), POST_LOCK_CANDIDATE_MAX_BYTES)
    exact(value, ['source', 'evidence'])
    return { source: sourceMaterial(value.source), evidence: evidenceMaterial(value.evidence) }
  } catch { fail() }
}
export const buildPostLockSubmission = ({ candidate, reason, binding, requestKey }) => {
  const material = copy(candidate)
  exact(material, ['source', 'evidence'])
  const body = { contractVersion: POST_LOCK_SUBMISSION_VERSION, requestKey: matches(requestKey, uuid),
    binding: bindingMaterial(copy(binding)), source: sourceMaterial(material.source),
    evidence: evidenceMaterial(material.evidence), reason: text(reason, 2000) }
  if (bytes(canonical(body)) > 65536) fail()
  return body
}
export const getPostLockSubmissionIdentity = async (body, actorId) => {
  matches(actorId, objectId)
  const normalized = buildPostLockSubmission({ candidate: { source: body.source, evidence: body.evidence },
    reason: body.reason, binding: body.binding, requestKey: body.requestKey })
  if (canonical(normalized) !== canonical(copy(body))) fail()
  return { submissionId: await checksum({ contractVersion: POST_LOCK_SUBMISSION_VERSION,
    customerId: normalized.binding.customerId, tenantId: normalized.binding.tenantId,
    runtimeInstanceId: normalized.binding.runtimeInstanceId, requestKey: normalized.requestKey }),
  requestDigest: await checksum({ ...normalized, submittedBy: actorId }) }
}

/** Correlates server-reported verification; does not verify an audit signature in the browser. */
export const verifyPostLockSubmissionReceipt = async (response, body, actorId, { readback = false } = {}) => {
  try {
    const envelope = copy(response)
    exact(envelope, ['data', 'meta'])
    exact(envelope.meta, ['requestId', 'version'])
    text(envelope.meta.requestId, 1000)
    if (envelope.meta.version !== 'v1') fail()
    const value = envelope.data
    exact(value, ['contractVersion', 'submissionId', 'status', 'requestDigest', 'outsideFrozenMembership', 'binding',
      'source', 'evidence', 'reason', 'submittedBy', 'submittedAt', 'receipt', ...(readback ? ['readState'] : ['replayed'])])
    if (value.contractVersion !== POST_LOCK_SUBMISSION_VERSION || value.status !== 'PENDING_REVIEW'
      || value.outsideFrozenMembership !== true || value.submittedBy !== actorId) fail()
    if (!readback && typeof value.replayed !== 'boolean') fail()
    const identity = await getPostLockSubmissionIdentity(body, actorId)
    if (value.submissionId !== identity.submissionId || value.requestDigest !== identity.requestDigest) fail()
    const returnedBody = buildPostLockSubmission({ candidate: { source: value.source, evidence: value.evidence },
      reason: value.reason, binding: value.binding, requestKey: body.requestKey })
    if (canonical(returnedBody) !== canonical(body)
      || canonical({ source: value.source, evidence: value.evidence, reason: value.reason, binding: value.binding })
      !== canonical({ source: returnedBody.source, evidence: returnedBody.evidence, reason: returnedBody.reason, binding: returnedBody.binding })) fail()
    time(value.submittedAt)
    exact(value.receipt, ['id', 'signatureVersion', 'verified'])
    matches(value.receipt.id, objectId); integer(value.receipt.signatureVersion, 1)
    if (value.receipt.verified !== true) fail()
    if (readback) {
      exact(value.readState, ['contractVersion', 'readAt', 'currency', 'impact', 'admission', 'actions'])
      if (value.readState.contractVersion !== 'post-lock-evidence-read-state.v1' || value.readState.currency !== 'AS_READ') fail()
      time(value.readState.readAt)
      // These states remain server-owned and deliberately are not returned as UI authority.
      if (![value.readState.impact, value.readState.admission, value.readState.actions].every(record)) fail()
    }
    return { ...returnedBody, submissionId: identity.submissionId, requestDigest: identity.requestDigest,
      status: value.status, outsideFrozenMembership: true, submittedBy: value.submittedBy, submittedAt: value.submittedAt,
      receipt: value.receipt, replayed: !readback && value.replayed, readback }
  } catch { return null }
}

// Read-only history uses server-verified receipts, not the current actor's submission command.
const readEnvelope = response => {
  const envelope = copy(response)
  exact(envelope, ['data', 'meta']); exact(envelope.meta, ['requestId', 'version'])
  text(envelope.meta.requestId, 1000)
  if (envelope.meta.version !== 'v1') fail()
  return envelope.data
}
const receiptMaterial = value => {
  exact(value, ['id', 'signatureVersion', 'verified'])
  matches(value.id, objectId); integer(value.signatureVersion, 1)
  if (value.verified !== true) fail()
}
const selectedFrame = ({ scope, renderer, lockBasis }) => {
  const runtime = renderer?.runtimeInstance, frozen = lockBasis?.frozenInventory
  if (!lockBasis?.available || !frozen?.available || !runtime
    || ![runtime.id, runtime.runtimeInstanceKey].includes(scope.runtimeInstanceId)
    || runtime.customerId !== scope.customerId || runtime.tenantId !== scope.tenantId
    || frozen.basisStateVersion !== runtime.stateVersion) fail()
  return { runtime, frozen }
}
const checkBasis = (value, frozen) => {
  const expected = { basisStateVersion: frozen.basisStateVersion, evidenceSnapshotId: frozen.snapshotId,
    membershipHash: frozen.membershipHash, lockSnapshotId: frozen.lockSnapshotId, lockSnapshotHash: frozen.lockSnapshotHash }
  if (Object.entries(expected).some(([key, item]) => value[key] !== item)) fail()
}

export const readPostLockEvidenceList = (response, frame) => {
  try {
    const { runtime, frozen } = selectedFrame(frame), value = readEnvelope(response)
    exact(value, ['contractVersion', 'readAt', 'currency', 'population', 'scope', 'basis', 'items', 'pagination'])
    if (value.contractVersion !== 'post-lock-evidence-list.v1' || value.currency !== 'AS_READ'
      || value.population !== 'ORIGINAL_POST_LOCK_SUBMISSION_RECEIPTS') fail()
    time(value.readAt)
    exact(value.scope, ['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey', 'revisionNumber'])
    if (value.scope.customerId !== runtime.customerId || value.scope.tenantId !== runtime.tenantId
      || value.scope.runtimeInstanceId !== runtime.id || value.scope.runtimeInstanceKey !== runtime.runtimeInstanceKey
      || value.scope.revisionNumber !== frozen.revisionNumber) fail()
    exact(value.basis, ['basisHash', 'basisStateVersion', 'evidenceSnapshotId', 'membershipHash', 'lockSnapshotId', 'lockSnapshotHash'])
    matches(value.basis.basisHash, digest); checkBasis(value.basis, frozen)
    exact(value.pagination, ['pageSize', 'hasMore', 'nextCursor'])
    integer(value.pagination.pageSize, 1, 10)
    if (typeof value.pagination.hasMore !== 'boolean' || (value.pagination.hasMore
      ? typeof value.pagination.nextCursor !== 'string' || !/^post-lock-evidence-list\.v1\.[A-Za-z0-9_-]+$/.test(value.pagination.nextCursor)
        || value.pagination.nextCursor.length > 1024
      : value.pagination.nextCursor !== null)) fail()
    if (!Array.isArray(value.items) || value.items.length > value.pagination.pageSize
      || value.pagination.hasMore && value.items.length !== value.pagination.pageSize) fail()
    value.items.forEach((row, index) => {
      exact(row, ['submissionId', 'submittedAt', 'submittedBy', 'evidenceTitle', 'source', 'originalIntake', 'detail'])
      matches(row.submissionId, digest); time(row.submittedAt); matches(row.submittedBy, objectId); text(row.evidenceTitle, 1000)
      exact(row.source, ['sourceId', 'sourceType', 'title'])
      text(row.source.sourceId, 240); matches(row.source.sourceType, /^[A-Z][A-Z0-9_]{0,99}$/); text(row.source.title, 1000)
      exact(row.originalIntake, ['recordedStatus', 'outsideFrozenMembership', 'receipt'])
      if (row.originalIntake.recordedStatus !== 'PENDING_REVIEW' || row.originalIntake.outsideFrozenMembership !== true) fail()
      receiptMaterial(row.originalIntake.receipt)
      exact(row.detail, ['contractVersion', 'impact', 'admission'])
      if (row.detail.contractVersion !== 'post-lock-evidence-read-state.v1' || row.detail.impact !== 'NOT_LOADED'
        || row.detail.admission !== 'NOT_LOADED' || index && row.submissionId <= value.items[index - 1].submissionId) fail()
    })
    return value
  } catch { return null }
}

export const readSavedPostLockEvidence = (response, frame, submissionId) => {
  try {
    const { runtime, frozen } = selectedFrame(frame), value = readEnvelope(response)
    matches(submissionId, digest)
    exact(value, ['contractVersion', 'submissionId', 'status', 'requestDigest', 'outsideFrozenMembership', 'binding',
      'source', 'evidence', 'reason', 'submittedBy', 'submittedAt', 'receipt', 'readState'])
    if (value.contractVersion !== POST_LOCK_SUBMISSION_VERSION || value.submissionId !== submissionId
      || value.status !== 'PENDING_REVIEW' || value.outsideFrozenMembership !== true) fail()
    matches(value.requestDigest, digest); matches(value.submittedBy, objectId); time(value.submittedAt); text(value.reason, 2000)
    const binding = bindingMaterial(value.binding)
    if (canonical(binding) !== canonical(value.binding) || binding.customerId !== runtime.customerId
      || binding.tenantId !== runtime.tenantId || binding.runtimeInstanceId !== runtime.id
      || binding.runtimeInstanceKey !== runtime.runtimeInstanceKey || binding.revisionNumber !== frozen.revisionNumber
      || binding.packageId !== runtime.packageId || binding.packageVersion !== runtime.packageVersion
      || binding.dependencySnapshotId !== runtime.dependencyLockId
      || binding.dependencySnapshotHash !== runtime.evidence?.dependencySnapshotHash) fail()
    checkBasis(binding, frozen); receiptMaterial(value.receipt)
    if (canonical(sourceMaterial(value.source)) !== canonical(value.source)
      || canonical(evidenceMaterial(value.evidence)) !== canonical(value.evidence)) fail()
    exact(value.readState, ['contractVersion', 'readAt', 'currency', 'impact', 'admission', 'actions'])
    if (value.readState.contractVersion !== 'post-lock-evidence-read-state.v1' || value.readState.currency !== 'AS_READ'
      || ![value.readState.impact, value.readState.admission, value.readState.actions].every(record)) fail()
    time(value.readState.readAt)
    return value
  } catch { return null }
}

export const POST_LOCK_IMPACT_OPTIONS = [
  { value: 'NO_REVISION_IMPACT', label: 'No revision impact' },
  { value: 'CORROBORATIVE', label: 'Corroborative' },
  { value: 'SUCCESSOR_REVISION_REQUIRED', label: 'Successor revision required' },
  { value: 'CURRENTNESS_REVIEW_REQUIRED', label: 'Currentness review required' },
]
const impactEntry = value => {
  exact(value, ['decisionId', 'sequence', 'disposition', 'rationale', 'reviewerUserId', 'authority', 'decidedAt',
    'previousDecisionHash', 'decisionHash', 'audit', 'verified', 'isCurrent'])
  matches(value.decisionId, /^post_lock_impact_[a-f0-9]{64}$/); integer(value.sequence, 1, 1000)
  if (!POST_LOCK_IMPACT_OPTIONS.some(option => option.value === value.disposition) || value.authority !== 'VMF_UPDATE'
    || value.verified !== true || typeof value.isCurrent !== 'boolean') fail()
  if (text(value.rationale, 2000) !== value.rationale) fail()
  matches(value.reviewerUserId, objectId); time(value.decidedAt); matches(value.decisionHash, digest)
  if (value.previousDecisionHash !== null) matches(value.previousDecisionHash, digest)
  if ((value.sequence === 1) !== (value.previousDecisionHash === null)) fail()
  exact(value.audit, ['id', 'signatureVersion']); matches(value.audit.id, objectId); integer(value.audit.signatureVersion, 1)
}
export const readPostLockImpactHistory = (response, submissionId, afterSequence = 0) => {
  try {
    matches(submissionId, digest); integer(afterSequence, 0, 1000)
    const value = readEnvelope(response)
    exact(value, ['contractVersion', 'submissionId', 'intakeStatus', 'verification', 'impact', 'entries', 'pagination', 'canRecord', 'blockedBy', 'admissionAvailable'])
    if (value.contractVersion !== 'post-lock-impact-history.v1' || value.submissionId !== submissionId
      || value.intakeStatus !== 'PENDING_REVIEW' || value.admissionAvailable !== false) fail()
    exact(value.verification, ['status', 'reason'])
    if (value.verification.status !== 'VERIFIED' || value.verification.reason !== null) fail()
    exact(value.impact, ['state', 'headHash', 'latestDecision'])
    exact(value.pagination, ['afterSequence', 'limit', 'nextAfterSequence', 'total'])
    const p = value.pagination
    if (p.afterSequence !== afterSequence || p.limit !== 20 || typeof value.canRecord !== 'boolean') fail()
    integer(p.total, 0, 1000)
    const blockers = ['VMF_UPDATE_REQUIRED', 'CONTROLLED_REPLAY_ISOLATED', 'POST_LOCK_IMPACT_POLICY_UNAVAILABLE',
      'POST_LOCK_IMPACT_AUDIT_NOT_RECORDED', 'POST_LOCK_IMPACT_AUDIT_UNVERIFIED', 'POST_LOCK_IMPACT_CAPACITY']
    if (!Array.isArray(value.blockedBy) || new Set(value.blockedBy).size !== value.blockedBy.length
      || value.blockedBy.some(reason => !blockers.includes(reason)) || value.canRecord !== (value.blockedBy.length === 0)) fail()
    if (!Array.isArray(value.entries) || value.entries.length !== Math.min(20, Math.max(0, p.total - afterSequence))) fail()
    value.entries.forEach((entry, index) => {
      impactEntry(entry)
      if (entry.sequence !== afterSequence + index + 1 || entry.isCurrent !== (entry.decisionHash === value.impact.headHash)
        || index && entry.previousDecisionHash !== value.entries[index - 1].decisionHash) fail()
    })
    const next = value.entries.length && value.entries.at(-1).sequence < p.total ? value.entries.at(-1).sequence : null
    if (p.nextAfterSequence !== next) fail()
    if (p.total === 0) {
      if (value.impact.state !== 'NOT_RECORDED' || value.impact.headHash !== null || value.impact.latestDecision !== null) fail()
    } else {
      const latest = value.impact.latestDecision; impactEntry(latest)
      if (value.impact.state !== 'RECORDED' || latest.sequence !== p.total || latest.isCurrent !== true
        || latest.decisionHash !== value.impact.headHash) fail()
      const included = value.entries.find(entry => entry.sequence === p.total)
      if (included && canonical(included) !== canonical(latest)) fail()
    }
    return value
  } catch { return null }
}
export const buildPostLockImpactRequest = ({ receipt, history, requestKey, disposition, rationale, confirm }) => {
  if (!history?.canRecord || history.submissionId !== receipt?.submissionId || confirm !== true
    || !POST_LOCK_IMPACT_OPTIONS.some(option => option.value === disposition)) fail()
  const body = { contractVersion: 'post-lock-impact-decision.v1', requestKey: matches(requestKey, uuid),
    expectedBinding: bindingMaterial(copy(receipt.binding)), expectedSubmissionDigest: matches(receipt.requestDigest, digest),
    expectedHeadHash: history.impact.headHash, disposition, rationale: text(rationale, 2000), confirm: true }
  if (body.expectedHeadHash !== null) matches(body.expectedHeadHash, digest)
  if (bytes(canonical(body)) > 8192) fail()
  return body
}
export const postLockImpactDecisionIdentity = async (submissionId, requestKey) =>
  `post_lock_impact_${await checksum({ submissionId: matches(submissionId, digest), requestKey: matches(requestKey, uuid) })}`

export const readPostLockAdmission = receipt => {
  try {
    const value = copy(receipt.readState), { impact, admission, actions } = value
    if (value.contractVersion !== 'post-lock-evidence-read-state.v1' || value.currency !== 'AS_READ') fail()
    time(value.readAt)
    exact(actions, ['recordImpact', 'admission'])
    const action = actions.admission
    exact(action, ['eligibility', 'blockedBy', 'operationalChecks'])
    exact(action.operationalChecks, ['indexes', 'execution'])
    if (action.operationalChecks.indexes !== 'NOT_CHECKED' || action.operationalChecks.execution !== 'RECHECKED_ON_SUBMIT') fail()
    const known = ['VMF_UPDATE_REQUIRED', 'CONTROLLED_REPLAY_ISOLATED', 'POST_LOCK_ADMISSION_POLICY_UNAVAILABLE',
      'POST_LOCK_IMPACT_AUDIT_NOT_RECORDED', 'POST_LOCK_IMPACT_AUDIT_UNVERIFIED', 'POST_LOCK_ADMISSION_DECISION_REQUIRED',
      'POST_LOCK_ADMISSION_DISPOSITION_BLOCKED', 'POST_LOCK_ADMISSION_RETENTION_BLOCKED', 'POST_LOCK_ADMISSION_CHILD_EXISTS',
      'POST_LOCK_ADMISSION_ALREADY_RECORDED', 'POST_LOCK_ADMISSION_RECEIPT_UNVERIFIED']
    if (!['ELIGIBLE_AS_READ', 'BLOCKED'].includes(action.eligibility) || !Array.isArray(action.blockedBy)
      || new Set(action.blockedBy).size !== action.blockedBy.length || action.blockedBy.some(reason => !known.includes(reason))
      || (action.eligibility === 'ELIGIBLE_AS_READ') !== (action.blockedBy.length === 0)) fail()
    if (admission.state === 'UNVERIFIED') return { eligible: false, state: 'UNVERIFIED', blockedBy: action.blockedBy }
    exact(impact, ['state', 'verification', 'headHash', 'latestDecision', 'decisionCount'])
    exact(impact.verification, ['status', 'reason'])
    if (impact.verification.status !== 'VERIFIED' || impact.verification.reason !== null) fail()
    integer(impact.decisionCount, 0, 1000)
    if (impact.state === 'RECORDED') {
      impactEntry(impact.latestDecision)
      if (!impact.latestDecision.isCurrent || impact.latestDecision.sequence !== impact.decisionCount
        || impact.latestDecision.decisionHash !== impact.headHash) fail()
    } else if (impact.state !== 'NOT_RECORDED' || impact.decisionCount !== 0 || impact.headHash !== null || impact.latestDecision !== null) fail()
    if (admission.state === 'NOT_RECORDED') {
      exact(admission, ['state', 'verification', 'initialBasis'])
      exact(admission.verification, ['status', 'reason'])
      if (admission.verification.status !== 'NOT_APPLICABLE' || admission.verification.reason !== null || admission.initialBasis !== null) fail()
      if (action.eligibility === 'ELIGIBLE_AS_READ' && (impact.latestDecision?.disposition !== 'SUCCESSOR_REVISION_REQUIRED'
        || receipt.source.licensing.retentionPermitted !== true)) fail()
      return { eligible: action.eligibility === 'ELIGIBLE_AS_READ', state: admission.state, blockedBy: action.blockedBy, impact }
    }
    exact(admission, ['state', 'verification', 'admissionId', 'admittedAt', 'actorUserId', 'rationale', 'selectedDecision', 'child', 'receipt', 'initialBasis'])
    exact(admission.verification, ['status', 'reason'])
    if (admission.state !== 'RECORDED' || admission.verification.status !== 'VERIFIED' || admission.verification.reason !== null
      || !action.blockedBy.includes('POST_LOCK_ADMISSION_ALREADY_RECORDED') || action.eligibility !== 'BLOCKED') fail()
    matches(admission.admissionId, /^post_lock_admission_[a-f0-9]{64}$/); time(admission.admittedAt)
    matches(admission.actorUserId, objectId); text(admission.rationale, 2000)
    exact(admission.selectedDecision, ['decisionId', 'decisionHash', 'sequence', 'disposition'])
    matches(admission.selectedDecision.decisionId, /^post_lock_impact_[a-f0-9]{64}$/); matches(admission.selectedDecision.decisionHash, digest)
    integer(admission.selectedDecision.sequence, 1, impact.decisionCount)
    if (admission.selectedDecision.disposition !== 'SUCCESSOR_REVISION_REQUIRED') fail()
    exact(admission.child, ['runtimeInstanceId', 'runtimeInstanceKey', 'revisionNumber'])
    matches(admission.child.runtimeInstanceId, objectId); text(admission.child.runtimeInstanceKey, 160)
    if (admission.child.runtimeInstanceId === receipt.binding.runtimeInstanceId || admission.child.runtimeInstanceKey === receipt.binding.runtimeInstanceKey
      || admission.child.revisionNumber !== receipt.binding.revisionNumber + 1) fail()
    exact(admission.receipt, ['auditId', 'signatureVersion']); matches(admission.receipt.auditId, objectId); integer(admission.receipt.signatureVersion, 1)
    exact(admission.initialBasis, ['status', 'basisStateVersion', 'membershipHash'])
    if (admission.initialBasis.status !== 'NOT_REVALIDATED' || admission.initialBasis.basisStateVersion === receipt.binding.basisStateVersion) fail()
    matches(admission.initialBasis.basisStateVersion, state); matches(admission.initialBasis.membershipHash, digest)
    return { eligible: false, state: 'RECORDED', blockedBy: action.blockedBy, impact, admission }
  } catch { return null }
}
export const buildPostLockAdmission = ({ receipt, expectedUpdatedAt, requestKey, rationale, confirm }) => {
  const model = readPostLockAdmission(receipt)
  if (!model?.eligible || confirm !== true) fail()
  const reason = text(rationale, 1000)
  return { expectedUpdatedAt: time(expectedUpdatedAt), reason, postLockAdmission: {
    contractVersion: 'post-lock-successor-admission.v1', requestKey: matches(requestKey, uuid), submissionId: matches(receipt.submissionId, digest),
    expectedSubmissionDigest: matches(receipt.requestDigest, digest), expectedBinding: bindingMaterial(copy(receipt.binding)),
    expectedImpactHeadHash: matches(model.impact.headHash, digest), rationale: reason, confirm: true } }
}
export const postLockAdmissionIdentity = async request => `post_lock_admission_${await checksum({
  customerId: request.expectedBinding.customerId, tenantId: request.expectedBinding.tenantId,
  runtimeInstanceId: request.expectedBinding.runtimeInstanceId, requestKey: request.requestKey })}`

// Project only the needed fields from the potentially large ordinary Runtime response.
const field = (object, name) => {
  const descriptor = object && Object.getOwnPropertyDescriptor(object, name)
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) fail()
  return descriptor.value
}
export const readAdmittedSuccessor = (response, receipt, admission) => {
  try {
    const data = field(response, 'data'), revision = field(data, 'revision'), framework = field(data, 'framework_state')
    const saved = field(revision, 'postLockAdmission'), basis = copy(field(saved, 'basis'))
    const child = { id: field(data, 'id'), runtimeInstanceKey: field(data, 'runtimeInstanceKey'), stateVersion: field(data, 'stateVersion'),
      revisionNumber: field(revision, 'revisionNumber'), status: field(data, 'status'), stage: field(field(framework, 'lifecycle'), 'stage'),
      ready: field(field(framework, 'readiness'), 'ready'), locked: field(field(framework, 'lock'), 'locked'),
      published: field(field(framework, 'publish'), 'published'), accepted: field(field(framework, 'evidence_pack'), 'accepted'),
      evidenceReady: field(field(framework, 'evidence_pack'), 'evidenceReady'), basis }
    if (child.id !== admission.child.runtimeInstanceId || child.runtimeInstanceKey !== admission.child.runtimeInstanceKey
      || field(data, 'customerId') !== receipt.binding.customerId || field(data, 'tenantId') !== receipt.binding.tenantId
      || field(revision, 'parentRuntimeId') !== receipt.binding.runtimeInstanceId || child.revisionNumber !== admission.child.revisionNumber
      || field(saved, 'admissionId') !== admission.admissionId || child.stateVersion !== admission.initialBasis.basisStateVersion
      || basis.basisStateVersion !== child.stateVersion || basis.membershipHash !== admission.initialBasis.membershipHash
      || basis.scope.runtimeInstanceId !== child.id || basis.scope.runtimeInstanceKey !== child.runtimeInstanceKey
      || basis.scope.customerId !== receipt.binding.customerId || basis.scope.tenantId !== receipt.binding.tenantId) fail()
    for (const key of ['ready', 'locked', 'published', 'accepted', 'evidenceReady']) if (typeof child[key] !== 'boolean') fail()
    for (const key of ['sources', 'evidence', 'sections']) integer(basis.counts[key], 0, 5000)
    const evidence = field(field(framework, 'evidence_pack'), 'evidenceObjects')
    if (!Array.isArray(evidence) || evidence.length > 5000) fail()
    const selected = evidence.find(item => item.evidenceObjectId === `post-lock:${receipt.submissionId}`)
    if (!selected || selected.sourceId !== `post-lock-source:${receipt.submissionId}` || selected.extractedFact !== receipt.evidence.statement) fail()
    return { ...child, evidenceTitle: selected.title, reviewStatus: selected.reviewStatus }
  } catch { return null }
}
