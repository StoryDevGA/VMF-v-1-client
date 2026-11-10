import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash, webcrypto } from 'node:crypto'
import { parsePostLockCandidate, buildPostLockSubmission, getPostLockSubmissionIdentity,
  verifyPostLockSubmissionReceipt, readPostLockEvidenceList, readSavedPostLockEvidence,
  readPostLockImpactHistory, buildPostLockImpactRequest, postLockImpactDecisionIdentity,
  readPostLockAdmission, buildPostLockAdmission, postLockAdmissionIdentity, readAdmittedSuccessor } from './postLockSubmissionModel.js'

const at = '2026-11-09T12:00:00.000Z'
const actor = '000000000000000000000009'
const candidate = () => ({ source: { sourceId: 'supplied-research-1', sourceType: 'PUBLIC_RESEARCH', title: 'Synthetic supplied source',
  locator: { url: 'https://example.org/fixture', passage: 'A synthetic passage.', page: 1 }, contentHash: `sha256:${'a'.repeat(64)}`,
  retrievedAt: at, currentness: 'UNCONFIRMED', qualifications: ['Synthetic; no provider called.'],
  licensing: { licenceRef: 'Fixture authored for local checking', retentionPermitted: true, retainUntil: null },
  provenance: { producerKey: 'synthetic-research', producerVersion: '1', receiptRef: 'fixture:original-1', acquiredAt: at } },
evidence: { title: 'Later synthetic evidence', statement: 'The synthetic company will review the candidate.', sectionKeys: [] } })
const binding = () => ({ customerId: '000000000000000000000002', tenantId: '000000000000000000000003',
  runtimeInstanceId: '000000000000000000000001', runtimeInstanceKey: 'owned-locked-fixture', revisionNumber: 1,
  basisStateVersion: 'rsv2:123e4567-e89b-42d3-a456-426614174000',
  evidenceSnapshotId: 'evidence_snapshot_123e4567-e89b-42d3-a456-426614174002', membershipHash: 'b'.repeat(64),
  lockSnapshotId: 'fixture-truth-lock', lockSnapshotHash: 'c'.repeat(64), packageId: '000000000000000000000004',
  packageVersion: '1.0', dependencySnapshotId: 'fixture-dependency', dependencySnapshotHash: 'd'.repeat(64), policyHash: 'e'.repeat(64) })
const body = () => buildPostLockSubmission({ candidate: candidate(), reason: 'Keep new evidence separate.', binding: binding(),
  requestKey: '123e4567-e89b-42d3-a456-426614174001' })
// Independent Node implementation of the server checksum contract, not the browser helper.
const serverHash = value => {
  const sort = item => Array.isArray(item) ? item.map(sort) : item && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, sort(item[key])])) : item
  return createHash('sha256').update(JSON.stringify(sort(value))).digest('hex')
}
const receipt = (command = body(), readback = false) => ({ data: {
  contractVersion: command.contractVersion, submissionId: serverHash({ contractVersion: command.contractVersion,
    customerId: command.binding.customerId, tenantId: command.binding.tenantId,
    runtimeInstanceId: command.binding.runtimeInstanceId, requestKey: command.requestKey }),
  requestDigest: serverHash({ ...command, submittedBy: actor }), status: 'PENDING_REVIEW', outsideFrozenMembership: true,
  binding: command.binding, source: command.source, evidence: command.evidence, reason: command.reason,
  submittedBy: actor, submittedAt: at, receipt: { id: '000000000000000000000012', signatureVersion: 2, verified: true },
  ...(readback ? { readState: { contractVersion: 'post-lock-evidence-read-state.v1', readAt: at, currency: 'AS_READ',
    impact: { state: 'NOT_RECORDED' }, admission: { state: 'NOT_RECORDED' }, actions: {} } } : { replayed: false }),
}, meta: { requestId: '123e4567-e89b-42d3-a456-426614174010', version: 'v1' } })

afterEach(() => vi.unstubAllGlobals())

const admissionFixture = () => {
  const result = receipt(body(), true).data
  result.readState.impact = { state: 'RECORDED', verification: { status: 'VERIFIED', reason: null }, headHash: 'd'.repeat(64), decisionCount: 1,
    latestDecision: { decisionId: `post_lock_impact_${'e'.repeat(64)}`, sequence: 1, disposition: 'SUCCESSOR_REVISION_REQUIRED',
      rationale: 'A new revision is needed.', reviewerUserId: actor, authority: 'VMF_UPDATE', decidedAt: at,
      previousDecisionHash: null, decisionHash: 'd'.repeat(64), audit: { id: '8'.repeat(24), signatureVersion: 3 }, verified: true, isCurrent: true } }
  result.readState.admission = { state: 'NOT_RECORDED', verification: { status: 'NOT_APPLICABLE', reason: null }, initialBasis: null }
  result.readState.actions = { recordImpact: { eligibility: 'ELIGIBLE_AS_READ', blockedBy: [] },
    admission: { eligibility: 'ELIGIBLE_AS_READ', blockedBy: [], operationalChecks: { indexes: 'NOT_CHECKED', execution: 'RECHECKED_ON_SUBMIT' } } }
  return result
}
describe('explicit successor admission', () => {
  it('requires an eligible verified successor-required decision plus separate rationale and confirmation', () => {
    const r = admissionFixture(), input = { receipt: r, expectedUpdatedAt: at, requestKey: body().requestKey, rationale: 'Admit for renewed review.', confirm: true }
    expect(buildPostLockAdmission(input)).toMatchObject({ expectedUpdatedAt: at, reason: input.rationale,
      postLockAdmission: { expectedBinding: binding(), expectedSubmissionDigest: r.requestDigest, expectedImpactHeadHash: 'd'.repeat(64), confirm: true } })
    for (const change of [{ confirm: false }, { rationale: ' ' }, { expectedUpdatedAt: 'invalid' }]) expect(() => buildPostLockAdmission({ ...input, ...change })).toThrow()
  })
  it.each(['CORROBORATIVE', 'NO_REVISION_IMPACT', 'CURRENTNESS_REVIEW_REQUIRED'])('cannot admit %s even if a malformed server action claims eligibility', disposition => {
    const r = admissionFixture(); r.readState.impact.latestDecision.disposition = disposition
    expect(readPostLockAdmission(r)).toBeNull()
  })
  it.each(['permission', 'policy', 'retention', 'unverified'])('withholds admission for %s', kind => {
    const r = admissionFixture()
    if (kind === 'unverified') r.readState.impact.verification.status = 'UNVERIFIED'
    else {
      r.readState.actions.admission.eligibility = 'BLOCKED'
      r.readState.actions.admission.blockedBy = [kind === 'permission' ? 'VMF_UPDATE_REQUIRED' : kind === 'policy'
        ? 'POST_LOCK_ADMISSION_POLICY_UNAVAILABLE' : 'POST_LOCK_ADMISSION_RETENTION_BLOCKED']
    }
    expect(readPostLockAdmission(r)?.eligible).not.toBe(true)
  })
  it('matches the server admission identity and never includes rationale in its request-key identity', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const request = buildPostLockAdmission({ receipt: admissionFixture(), expectedUpdatedAt: at, requestKey: body().requestKey, rationale: 'Explicit reason.', confirm: true }).postLockAdmission
    expect(await postLockAdmissionIdentity(request)).toBe(`post_lock_admission_${serverHash({ customerId: binding().customerId,
      tenantId: binding().tenantId, runtimeInstanceId: binding().runtimeInstanceId, requestKey: body().requestKey })}`)
  })
  it('checks the successor’s distinct scope, initial evidence basis, selected evidence and own readiness', () => {
    const r = admissionFixture(), version = 'rsv2:123e4567-e89b-42d3-a456-426614174009', memberHash = 'f'.repeat(64)
    const admission = { admissionId: `post_lock_admission_${'c'.repeat(64)}`, child: { runtimeInstanceId: '7'.repeat(24), runtimeInstanceKey: 'successor-r2', revisionNumber: 2 },
      initialBasis: { basisStateVersion: version, membershipHash: memberHash } }
    const basis = { basisStateVersion: version, membershipHash: memberHash, counts: { sources: 2, evidence: 2, sections: 0 },
      scope: { runtimeInstanceId: admission.child.runtimeInstanceId, runtimeInstanceKey: admission.child.runtimeInstanceKey,
        customerId: r.binding.customerId, tenantId: r.binding.tenantId } }
    const response = { data: { id: admission.child.runtimeInstanceId, runtimeInstanceKey: admission.child.runtimeInstanceKey, customerId: r.binding.customerId,
      tenantId: r.binding.tenantId, stateVersion: version, status: 'ACTIVE', revision: { revisionNumber: 2, parentRuntimeId: r.binding.runtimeInstanceId,
        postLockAdmission: { admissionId: admission.admissionId, basis } }, framework_state: { lifecycle: { stage: 'DRAFT' }, readiness: { ready: false },
        lock: { locked: false }, publish: { published: false }, evidence_pack: { accepted: false, evidenceReady: false,
          evidenceObjects: [{ evidenceObjectId: `post-lock:${r.submissionId}`, sourceId: `post-lock-source:${r.submissionId}`, extractedFact: r.evidence.statement, title: r.evidence.title, reviewStatus: 'PENDING' }] } } } }
    expect(readAdmittedSuccessor(response, r, admission)).toMatchObject({ stage: 'DRAFT', ready: false, locked: false, reviewStatus: 'PENDING' })
    const foreign = structuredClone(response); foreign.data.customerId = 'other'
    expect(readAdmittedSuccessor(foreign, r, admission)).toBeNull()
    const changed = structuredClone(response); changed.data.stateVersion = r.binding.basisStateVersion
    expect(readAdmittedSuccessor(changed, r, admission)).toBeNull()
  })
})

describe('impact decision read and write contract', () => {
  const history = () => ({ data: { contractVersion: 'post-lock-impact-history.v1', submissionId: 'a'.repeat(64), intakeStatus: 'PENDING_REVIEW',
    verification: { status: 'VERIFIED', reason: null }, impact: { state: 'NOT_RECORDED', headHash: null, latestDecision: null },
    entries: [], pagination: { afterSequence: 0, limit: 20, nextAfterSequence: null, total: 0 },
    canRecord: true, blockedBy: [], admissionAvailable: false }, meta: { requestId: 'test-read', version: 'v1' } })
  it('requires verified matching history and a supported policy/authority outcome', () => {
    expect(readPostLockImpactHistory(history(), 'a'.repeat(64))?.canRecord).toBe(true)
    const blocked = history(); blocked.data.canRecord = false; blocked.data.blockedBy = ['VMF_UPDATE_REQUIRED']
    expect(readPostLockImpactHistory(blocked, 'a'.repeat(64))?.canRecord).toBe(false)
  })
  it.each(['submission', 'verification', 'capability', 'pagination', 'version'])('rejects malformed or foreign %s history', kind => {
    const value = history()
    if (kind === 'submission') value.data.submissionId = 'b'.repeat(64)
    if (kind === 'verification') value.data.verification.status = 'UNVERIFIED'
    if (kind === 'capability') value.data.blockedBy = ['VMF_UPDATE_REQUIRED']
    if (kind === 'pagination') value.data.pagination.total = 1
    if (kind === 'version') value.meta.version = 'v2'
    expect(readPostLockImpactHistory(value, 'a'.repeat(64))).toBeNull()
  })
  it('freezes exact submitted binding/digest/head and requires confirmation and rationale', () => {
    const r = { ...receipt(body(), true).data, submissionId: 'a'.repeat(64) }, h = history().data
    const input = { receipt: r, history: h, requestKey: body().requestKey, disposition: 'CORROBORATIVE', rationale: 'Supports current understanding.', confirm: true }
    expect(buildPostLockImpactRequest(input)).toMatchObject({ expectedBinding: binding(), expectedSubmissionDigest: r.requestDigest, expectedHeadHash: null })
    for (const override of [{ confirm: false }, { rationale: ' ' }, { disposition: 'ACCEPTED' }, { history: { ...h, canRecord: false } }]) {
      expect(() => buildPostLockImpactRequest({ ...input, ...override })).toThrow()
    }
  })
  it('uses the server decision identity algorithm without generating a different request', async () => {
    vi.stubGlobal('crypto', webcrypto)
    expect(await postLockImpactDecisionIdentity('a'.repeat(64), body().requestKey))
      .toBe(`post_lock_impact_${serverHash({ submissionId: 'a'.repeat(64), requestKey: body().requestKey })}`)
  })
})

const savedFrame = () => {
  const b = binding()
  return { scope: { customerId: b.customerId, tenantId: b.tenantId, runtimeInstanceId: b.runtimeInstanceKey },
    renderer: { runtimeInstance: { id: b.runtimeInstanceId, runtimeInstanceKey: b.runtimeInstanceKey,
      customerId: b.customerId, tenantId: b.tenantId, stateVersion: b.basisStateVersion, packageId: b.packageId,
      packageVersion: b.packageVersion, dependencyLockId: b.dependencySnapshotId, evidence: { dependencySnapshotHash: b.dependencySnapshotHash } } },
    lockBasis: { available: true, frozenInventory: { available: true, revisionNumber: b.revisionNumber,
      basisStateVersion: b.basisStateVersion, snapshotId: b.evidenceSnapshotId, membershipHash: b.membershipHash,
      lockSnapshotId: b.lockSnapshotId, lockSnapshotHash: b.lockSnapshotHash } } }
}
const savedList = () => {
  const r = receipt(body(), true), b = binding()
  return { meta: r.meta, data: { contractVersion: 'post-lock-evidence-list.v1', readAt: at, currency: 'AS_READ',
    population: 'ORIGINAL_POST_LOCK_SUBMISSION_RECEIPTS', scope: { customerId: b.customerId, tenantId: b.tenantId,
      runtimeInstanceId: b.runtimeInstanceId, runtimeInstanceKey: b.runtimeInstanceKey, revisionNumber: b.revisionNumber },
    basis: { basisHash: 'f'.repeat(64), basisStateVersion: b.basisStateVersion, evidenceSnapshotId: b.evidenceSnapshotId,
      membershipHash: b.membershipHash, lockSnapshotId: b.lockSnapshotId, lockSnapshotHash: b.lockSnapshotHash },
    items: [{ submissionId: r.data.submissionId, submittedAt: at, submittedBy: actor, evidenceTitle: r.data.evidence.title,
      source: { sourceId: r.data.source.sourceId, sourceType: r.data.source.sourceType, title: r.data.source.title },
      originalIntake: { recordedStatus: 'PENDING_REVIEW', outsideFrozenMembership: true, receipt: r.data.receipt },
      detail: { contractVersion: 'post-lock-evidence-read-state.v1', impact: 'NOT_LOADED', admission: 'NOT_LOADED' } }],
    pagination: { pageSize: 5, hasMore: false, nextCursor: null } } }
}

describe('reopening saved post-lock evidence', () => {
  it('reads a saved list and complete source details without the original submission command', () => {
    expect(readPostLockEvidenceList(savedList(), savedFrame())?.items).toHaveLength(1)
    const response = receipt(body(), true)
    expect(readSavedPostLockEvidence(response, savedFrame(), response.data.submissionId)).toEqual(response.data)
  })
  it('accepts a verified empty page', () => {
    const list = savedList(); list.data.items = []
    expect(readPostLockEvidenceList(list, savedFrame())?.items).toEqual([])
  })
  it.each(['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey', 'revisionNumber'])('rejects list from another %s', key => {
    const list = savedList(); list.data.scope[key] = key === 'revisionNumber' ? 99 : 'wrong'
    expect(readPostLockEvidenceList(list, savedFrame())).toBeNull()
  })
  it.each(['basisStateVersion', 'evidenceSnapshotId', 'membershipHash', 'lockSnapshotId', 'lockSnapshotHash'])('rejects stale %s in list and detail', key => {
    const list = savedList(), detail = receipt(body(), true)
    list.data.basis[key] = 'wrong'; detail.data.binding[key] = 'wrong'
    expect(readPostLockEvidenceList(list, savedFrame())).toBeNull()
    expect(readSavedPostLockEvidence(detail, savedFrame(), detail.data.submissionId)).toBeNull()
  })
  it.each(['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey', 'packageId', 'dependencySnapshotHash'])('rejects detail bound to another %s', key => {
    const detail = receipt(body(), true); detail.data.binding[key] = 'wrong'
    expect(readSavedPostLockEvidence(detail, savedFrame(), detail.data.submissionId)).toBeNull()
  })
  it.each(['unverified', 'duplicate', 'cursor', 'version'])('rejects invalid list %s', kind => {
    const list = savedList()
    if (kind === 'unverified') list.data.items[0].originalIntake.receipt.verified = false
    if (kind === 'duplicate') list.data.items.push(list.data.items[0])
    if (kind === 'cursor') list.data.pagination.nextCursor = 'unbound'
    if (kind === 'version') list.meta.version = 'v2'
    expect(readPostLockEvidenceList(list, savedFrame())).toBeNull()
  })
  it('rejects a different selected receipt, unsafe locator and unverified signature flag', () => {
    const detail = receipt(body(), true)
    expect(readSavedPostLockEvidence(detail, savedFrame(), 'a'.repeat(64))).toBeNull()
    detail.data.source.locator.url = 'javascript:alert(1)'
    expect(readSavedPostLockEvidence(detail, savedFrame(), detail.data.submissionId)).toBeNull()
    const unsigned = receipt(body(), true); unsigned.data.receipt.verified = false
    expect(readSavedPostLockEvidence(unsigned, savedFrame(), unsigned.data.submissionId)).toBeNull()
  })
})

describe('supplied post-lock candidate', () => {
  it('preserves full supplied provenance, qualifications, licensing and locator without acquiring it', () => {
    expect(parsePostLockCandidate(JSON.stringify(candidate()))).toEqual(candidate())
  })
  it('trims all server-trimmed material before freezing the command', () => {
    const input = candidate(); input.source.title = '  Supplied title  '; input.evidence.statement = '  Statement  '
    const parsed = parsePostLockCandidate(JSON.stringify(input))
    expect(parsed.source.title).toBe('Supplied title'); expect(parsed.evidence.statement).toBe('Statement')
  })
  it('accepts maximum valid statement/passage/qualification/section lengths and AS_OF time', () => {
    const input = candidate(); input.evidence.statement = 'x'.repeat(8000); input.source.locator.passage = 'y'.repeat(4000)
    input.source.qualifications = Array.from({ length: 20 }, (_, i) => `${i}`.padEnd(500, 'q'))
    input.evidence.sectionKeys = Array.from({ length: 100 }, (_, i) => `${i}`.padEnd(180, 's'))
    input.source.currentness = 'AS_OF'; input.source.asOfAt = at
    expect(parsePostLockCandidate(JSON.stringify(input))).toEqual(input)
  })
  it.each(['binding', 'requestKey', 'actor', 'receipt', 'state', 'instructions'])('rejects imported authority field %s', key => {
    expect(() => parsePostLockCandidate(JSON.stringify({ ...candidate(), [key]: 'untrusted' }))).toThrow()
  })
  it.each([
    ['unsafe URL', c => { c.source.locator.url = 'javascript:alert(1)' }],
    ['credential URL', c => { c.source.locator.url = 'https://name:secret@example.org/' }],
    ['missing locator', c => { c.source.locator = {} }],
    ['unknown source field', c => { c.source.verified = true }],
    ['unknown evidence field', c => { c.evidence.accepted = true }],
    ['noncanonical time', c => { c.source.retrievedAt = '2026-11-09T12:00:00Z' }],
    ['oversize statement', c => { c.evidence.statement = 'x'.repeat(8001) }],
    ['duplicate normalized sections', c => { c.evidence.sectionKeys = ['one', ' one '] }],
    ['duplicate qualifications', c => { c.source.qualifications = ['one', ' one '] }],
    ['missing AS_OF date', c => { c.source.currentness = 'AS_OF' }],
    ['unexpected AS_OF date', c => { c.source.asOfAt = at }],
    ['wrong retention flag', c => { c.source.licensing.retentionPermitted = 'true' }],
  ])('rejects %s', (_name, change) => { const input = candidate(); change(input); expect(() => parsePostLockCandidate(JSON.stringify(input))).toThrow() })
  it.each(['{', 'null', '[]', ' '.repeat(65537), JSON.stringify({ source: {}, evidence: {}, __proto__: null })])('rejects malformed or oversized input', input => {
    expect(() => parsePostLockCandidate(input)).toThrow()
  })
  it('does not invoke accessors or accept foreign prototypes when constructing a command', () => {
    const input = candidate(), getter = vi.fn(() => input.source)
    Object.defineProperty(input, 'source', { enumerable: true, get: getter })
    expect(() => buildPostLockSubmission({ candidate: input, binding: binding(), requestKey: body().requestKey, reason: 'Reason' })).toThrow()
    expect(getter).not.toHaveBeenCalled()
    expect(() => buildPostLockSubmission({ candidate: Object.assign(Object.create({ inherited: true }), candidate()),
      binding: binding(), requestKey: body().requestKey, reason: 'Reason' })).toThrow()
  })
  it('accepts the null-prototype dictionaries returned by the existing validated availability reader', () => {
    const nullRecords = value => Array.isArray(value) ? value.map(nullRecords) : value && typeof value === 'object'
      ? Object.assign(Object.create(null), Object.fromEntries(Object.entries(value).map(([key, item]) => [key, nullRecords(item)]))) : value
    expect(buildPostLockSubmission({ candidate: nullRecords(candidate()), binding: nullRecords(binding()),
      reason: 'Keep new evidence separate.', requestKey: body().requestKey })).toEqual(body())
  })
  it.each(['retrievedAt', 'asOfAt', 'acquiredAt', 'retainUntil'])('rejects extended-year %s as the server does', field => {
    const input = candidate(), extended = '+010000-01-01T00:00:00.000Z'
    if (field === 'asOfAt') { input.source.currentness = 'AS_OF'; input.source.asOfAt = extended }
    else if (field === 'acquiredAt') input.source.provenance.acquiredAt = extended
    else if (field === 'retainUntil') input.source.licensing.retainUntil = extended
    else input.source.retrievedAt = extended
    expect(() => parsePostLockCandidate(JSON.stringify(input))).toThrow()
  })
  it('rejects an empty or oversized human reason and unknown/missing binding fields', () => {
    for (const reason of ['', ' '.repeat(3), 'x'.repeat(2001)]) expect(() => buildPostLockSubmission({ candidate: candidate(), binding: binding(), requestKey: body().requestKey, reason })).toThrow()
    for (const key of Object.keys(binding())) {
      const changed = binding(); delete changed[key]
      expect(() => buildPostLockSubmission({ candidate: candidate(), binding: changed, requestKey: body().requestKey, reason: 'Reason' })).toThrow()
    }
    expect(() => buildPostLockSubmission({ candidate: candidate(), binding: { ...binding(), authority: true }, requestKey: body().requestKey, reason: 'Reason' })).toThrow()
  })
  it('enforces the canonical request UTF8 limit, not only the uploaded file size', () => {
    const input = candidate(); input.evidence.statement = '界'.repeat(8000)
    input.source.locator.passage = '界'.repeat(4000)
    input.source.qualifications = Array.from({ length: 20 }, (_, i) => `${i}`.padEnd(500, '界'))
    expect(() => buildPostLockSubmission({ candidate: input, binding: binding(), requestKey: body().requestKey, reason: 'Reason' })).toThrow()
  })
})

describe('original submission receipt correlation', () => {
  it('matches the server canonical ID/digest, including supplied reason and actor', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const command = body(), response = receipt(command)
    expect(await getPostLockSubmissionIdentity(command, actor)).toEqual({ submissionId: response.data.submissionId, requestDigest: response.data.requestDigest })
    expect(await verifyPostLockSubmissionReceipt(response, command, actor)).toMatchObject({ status: 'PENDING_REVIEW', readback: false, source: command.source, reason: command.reason })
  })
  it('accepts a correlated replay and an exact GET as original recording, without exposing read-state action authority', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const response = receipt(); response.data.replayed = true
    expect(await verifyPostLockSubmissionReceipt(response, body(), actor)).toMatchObject({ replayed: true })
    const read = await verifyPostLockSubmissionReceipt(receipt(body(), true), body(), actor, { readback: true })
    expect(read).toMatchObject({ readback: true, outsideFrozenMembership: true })
    expect(read).not.toHaveProperty('readState')
  })
  it.each(['submissionId', 'requestDigest', 'submittedBy', 'reason', 'status', 'outsideFrozenMembership', 'contractVersion'])('rejects a changed receipt %s', async key => {
    vi.stubGlobal('crypto', webcrypto)
    const response = receipt(); response.data[key] = key === 'outsideFrozenMembership' ? false : 'changed'
    expect(await verifyPostLockSubmissionReceipt(response, body(), actor)).toBeNull()
  })
  it.each(['source', 'evidence', 'binding'])('rejects substituted %s even when the claimed digest matches', async key => {
    vi.stubGlobal('crypto', webcrypto)
    const response = receipt(); response.data[key] = { ...response.data[key], title: 'Substituted' }
    expect(await verifyPostLockSubmissionReceipt(response, body(), actor)).toBeNull()
  })
  it('rejects unverified/malformed audit metadata, missing replay, unexpected keys and wrong read-state version', async () => {
    vi.stubGlobal('crypto', webcrypto)
    for (const change of [r => { r.data.receipt.verified = false }, r => { r.data.receipt.signatureVersion = 0 },
      r => { r.data.receipt.id = 'wrong' }, r => { delete r.data.replayed }, r => { r.data.accepted = true }]) {
      const response = receipt(); change(response); expect(await verifyPostLockSubmissionReceipt(response, body(), actor)).toBeNull()
    }
    const response = receipt(body(), true); response.data.readState.contractVersion = 'future.v2'
    expect(await verifyPostLockSubmissionReceipt(response, body(), actor, { readback: true })).toBeNull()
  })
  it('rejects a response to another command or actor and blocks unavailable secure crypto', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const changed = body(); changed.reason = 'Another intent'
    expect(await verifyPostLockSubmissionReceipt(receipt(), changed, actor)).toBeNull()
    expect(await verifyPostLockSubmissionReceipt(receipt(), body(), '000000000000000000000099')).toBeNull()
    vi.stubGlobal('crypto', {})
    await expect(getPostLockSubmissionIdentity(body(), actor)).rejects.toThrow('Secure submission verification')
    expect(await verifyPostLockSubmissionReceipt(receipt(), body(), actor)).toBeNull()
  })
  it('rejects extended-year original submission and readback timestamps', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const post = receipt(); post.data.submittedAt = '+010000-01-01T00:00:00.000Z'
    expect(await verifyPostLockSubmissionReceipt(post, body(), actor)).toBeNull()
    const read = receipt(body(), true); read.data.readState.readAt = '+010000-01-01T00:00:00.000Z'
    expect(await verifyPostLockSubmissionReceipt(read, body(), actor, { readback: true })).toBeNull()
  })
})
