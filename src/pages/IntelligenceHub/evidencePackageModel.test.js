import { webcrypto, randomUUID } from 'node:crypto'
import { beforeEach, expect, it, vi } from 'vitest'
import { readEvidencePackage, verifyEvidencePackageReceipt, verifyEvidencePackageLinks } from './evidencePackageModel.js'

import { scope, publicScope, version, preview, wrapReceipt, frozenFixture, packageFixture, hash } from '../../test/evidencePackageFixture.js'

beforeEach(() => vi.stubGlobal('crypto', webcrypto))

it('accepts only the exact scoped current preparation and preserves server eligibility', () => {
  const value = preview()
  expect(readEvidencePackage(value, scope, version)).toBe(value)
  for (const changed of [{ ...value, scope: { ...publicScope, tenantId: 'other' } },
    { ...value, scope: { ...publicScope, rootRuntimeInstanceKey: 'other' } },
    { ...value, control: { ...value.control, stateVersion: 'other' } },
    { ...value, batch: { eligibleIds: ['same', 'same'], excluded: [] } }]) expect(readEvidencePackage(changed, scope, version)).toBeNull()
})

it('verifies actor-bound command payload and separate freeze basis and membership hashes', async () => {
  const frozen = frozenFixture(), body = frozen.receipt.body
  const command = { kind: 'FREEZE', body: { requestKey: 'command', expectedStateVersion: version,
    expectedBasisHash: body.basisHash, completionReceiptId: 'completion', confirm: true } }
  const response = wrapReceipt('FREEZE', body, command.body)
  expect(await verifyEvidencePackageReceipt(response, scope, command)).toEqual(response.receipt)
  expect(await verifyEvidencePackageReceipt(response, scope, { ...command, body: { ...command.body, expectedBasisHash: body.membershipHash } })).toBeNull()
  expect(await verifyEvidencePackageReceipt(response, scope, { ...command, body: { ...command.body, requestKey: 'other' } })).toBeNull()
})

it.each(['auditVerified', 'bodyHash', 'auditId', 'contractVersion'])('rejects invalid receipt %s', async key => {
  const response = frozenFixture(); response.receipt[key] = key === 'auditVerified' ? false : 'wrong'
  expect(await verifyEvidencePackageReceipt(response, scope)).toBeNull()
})

it('rejects rehashed freeze content with wrong membership hash or cross-scope membership', async () => {
  const response = frozenFixture(); response.receipt.body.membership.scope = { ...publicScope, customerId: 'other' }
  response.receipt.bodyHash = hash(response.receipt.body)
  expect(await verifyEvidencePackageReceipt(response, scope)).toBeNull()
})

it('recomputes output and ledger hashes and requires exact package membership/source links', async () => {
  const frozen = frozenFixture(), packaged = packageFixture(frozen)
  const verifiedFreeze = await verifyEvidencePackageReceipt(frozen, scope)
  const verified = await verifyEvidencePackageReceipt(packaged, scope)
  expect(verified).toEqual(packaged.receipt)
  expect(await verifyEvidencePackageLinks(verified, verifiedFreeze)).toBe(true)
  packaged.receipt.body.baseline.statements[0].statement = 'Unsupported changed wording'
  packaged.receipt.bodyHash = hash(packaged.receipt.body)
  expect(await verifyEvidencePackageReceipt(packaged, scope)).toBeNull()
})

it('rejects missing/extra/duplicate ledger entries, wrong sources and unsupported analytical evidence links', async () => {
  const frozen = frozenFixture().receipt
  for (const change of [body => body.qualificationLedger.push({ ...body.qualificationLedger[0] }),
    body => body.qualificationLedger[0].sourceId = 'other', body => body.evidenceRegister.pop(),
    body => body.analysis.observations[0].evidenceIds = ['not-a-member'], body => body.qualificationLedger[0].exactExcerpt = 'Changed']) {
    const packaged = packageFixture().receipt; change(packaged.body)
    expect(await verifyEvidencePackageLinks(packaged, frozen)).toBe(false)
  }
})

it('keeps verified stale receipts readable without representing current membership', async () => {
  const response = packageFixture(); response.receipt.currency = 'STALE'
  expect((await verifyEvidencePackageReceipt(response, scope)).currency).toBe('STALE')
})

const qualifiedFixture = () => {
  const frozen = frozenFixture(), response = packageFixture(frozen), body = response.receipt.body
  const row = body.qualificationLedger[0], member = frozen.receipt.body.membership.evidence[0]
  const source = frozen.receipt.body.membership.sources[0]
  source.materialHash = 'f'.repeat(64)
  frozen.receipt.body.membershipHash = hash(frozen.receipt.body.membership)
  frozen.receipt.body.basisHash = hash({ completionReceiptId: frozen.receipt.body.completionReceiptId,
    completionPopulationHash: frozen.receipt.body.completionPopulationHash, membershipHash: frozen.receipt.body.membershipHash })
  frozen.receipt.bodyHash = hash(frozen.receipt.body)
  body.membershipHash = frozen.receipt.body.membershipHash
  Object.assign(row, { certainty: null, recordedNeutralQualification: null, neutralQualificationReceipt: null,
    recordedQualification: null, qualificationProjection: 'NOT_RECORDED',
    materialFingerprints: { evidenceFingerprint: `sha256:${'a'.repeat(64)}`, sourceFingerprint: `sha256:${'b'.repeat(64)}` },
    scope: null, currentness: null, time: null, historicalContext: null, attribution: null, permittedStatement: null,
    permittedInterpretation: null, limitations: null, prohibitedInterpretations: [],
    bindingCurrency: 'ABSENT', memberMaterialHash: member.materialHash, sourceMaterialHash: source.materialHash,
    sectionKeys: [], mappingStatus: 'UNASSIGNED / MAPPING_NOT_ESTABLISHED' })
  Object.assign(body.evidenceRegister[0], { qualificationReceiptId: null, mappingStatus: row.mappingStatus, sectionKeys: [] })
  for (const statement of [...body.baseline.statements, ...body.analysis.observations]) Object.assign(statement, {
    classification: 'SOURCE_PRESENTED', qualificationEvidenceId: row.evidenceObjectId, qualificationReceiptId: null,
    mappingStatus: row.mappingStatus, sectionKeys: [], qualifications: row.qualifications, unknowns: row.unknowns,
    permittedInterpretation: null, prohibitedInterpretations: [] })
  body.contentVersion = 'qualified-evidence-package-content.v2'
  body.membershipReference = { membershipHash: body.membershipHash, basisStateVersion: version, scope: publicScope }
  const { contentVersion, membershipReference, qualificationLedger, evidenceRegister, baseline, analysis, warnings } = body
  body.ledgerHash = hash(qualificationLedger)
  body.outputHash = hash({ contentVersion, membershipReference, qualificationLedger, evidenceRegister, baseline, analysis, warnings })
  response.receipt.bodyHash = hash(body)
  return { response, frozen }
}

it('verifies new qualified content with explicit unassigned membership while legacy receipts still pass', async () => {
  const { response, frozen } = qualifiedFixture()
  expect(await verifyEvidencePackageReceipt(response, scope)).toEqual(response.receipt)
  expect(await verifyEvidencePackageReceipt(frozen, scope)).toEqual(frozen.receipt)
  expect(await verifyEvidencePackageLinks(response.receipt, frozen.receipt)).toBe(true)
  expect(await verifyEvidencePackageReceipt(packageFixture(), scope)).not.toBeNull()
})

it.each(['unknown-version', 'certainty', 'membership', 'section', 'unsigned-qualification'])('rejects new qualified content mismatch: %s', async kind => {
  const { response, frozen } = qualifiedFixture(), body = response.receipt.body, row = body.qualificationLedger[0]
  if (kind === 'unknown-version') body.contentVersion = 'unsupported'
  if (kind === 'certainty') row.certainty = 'HIGH'
  if (kind === 'membership') body.membershipReference.membershipHash = '0'.repeat(64)
  if (kind === 'section') row.sectionKeys = ['invented-section']
  if (kind === 'unsigned-qualification') row.recordedNeutralQualification = { receiptId: 'unverified' }
  if (kind === 'unknown-version') expect(await verifyEvidencePackageReceipt(response, scope)).toBeNull()
  else expect(await verifyEvidencePackageLinks(response.receipt, frozen.receipt)).toBe(false)
})

it.each(['projection', 'currency', 'origin', 'baseline', 'observation', 'unknowns'])('rejects rehashed qualified joins: %s', async kind => {
  const { response, frozen } = qualifiedFixture(), body = response.receipt.body, row = body.qualificationLedger[0]
  if (kind === 'projection') row.currentness = 'CURRENT'
  if (kind === 'currency') row.bindingCurrency = 'MATCHES_CURRENT_MATERIAL'
  if (kind === 'origin') row.qualificationProjection = 'AUTHORED_DRAFT_FACTS.v1'
  if (kind === 'baseline') body.baseline.statements[0].statement = 'Invented customer truth'
  if (kind === 'observation') body.analysis.observations[0].qualificationReceiptId = 'foreign'
  if (kind === 'unknowns') body.analysis.unknowns.push({ field: 'invented', reason: 'invented', evidenceIds: [row.evidenceObjectId] })
  body.ledgerHash = hash(body.qualificationLedger)
  const { contentVersion, membershipReference, qualificationLedger, evidenceRegister, baseline, analysis, warnings } = body
  body.outputHash = hash({ contentVersion, membershipReference, qualificationLedger, evidenceRegister, baseline, analysis, warnings })
  response.receipt.bodyHash = hash(body)
  expect(await verifyEvidencePackageReceipt(response, scope)).not.toBeNull()
  expect(await verifyEvidencePackageLinks(response.receipt, frozen.receipt)).toBe(false)
})

it.each([false, true])('preserves neutral receipt facts with exact current/stale projection (stale=%s)', async stale => {
  const { response, frozen } = qualifiedFixture(), body = response.receipt.body, row = body.qualificationLedger[0]
  const nativeScope = { ...publicScope, customerId: '1'.repeat(24), tenantId: '2'.repeat(24), runtimeInstanceId: '3'.repeat(24) }
  const readScope = { ...scope, customerId: nativeScope.customerId, tenantId: nativeScope.tenantId, runtimeInstanceId: nativeScope.runtimeInstanceId }
  response.scope = nativeScope; frozen.scope = nativeScope; frozen.receipt.body.membership.scope = nativeScope
  const state = `rsv2:${randomUUID()}`
  response.receipt.basisStateVersion = state; frozen.receipt.basisStateVersion = state
  frozen.receipt.body.membership.basisStateVersion = state
  const facts = { scope: 'Recorded assertion only.', currentness: 'Historical', time: null, historicalContext: null,
    attribution: null, permittedStatement: null, permittedInterpretation: null, prohibitedInterpretation: null, limitations: null }
  const qualification = { contractVersion: 'evidence-neutral-qualification.v1', receiptId: randomUUID(), authoredBy: '4'.repeat(24),
    authoredAt: '2026-11-20T12:00:00.000Z', binding: { evidenceObjectId: row.evidenceObjectId, sourceId: row.sourceId,
      ...row.materialFingerprints }, facts }
  const receiptBody = { operation: 'RECORD_NEUTRAL_QUALIFICATION', scope: { customerId: nativeScope.customerId, tenantId: nativeScope.tenantId,
    runtimeInstanceId: nativeScope.runtimeInstanceId, runtimeInstanceKey: nativeScope.runtimeInstanceKey, revisionNumber: 1,
    evidenceObjectId: row.evidenceObjectId, sourceId: row.sourceId }, inputStateVersion: `rsv2:${randomUUID()}`, outputStateVersion: state,
  qualificationHash: `sha256:${hash(qualification)}`, previousQualificationHash: null, previousReceiptId: null, qualification, rationale: null }
  row.recordedNeutralQualification = qualification
  row.neutralQualificationReceipt = { contractVersion: 'evidence-neutral-qualification-receipt.v1', receiptId: qualification.receiptId,
    requestKey: randomUUID(), payloadHash: `sha256:${'c'.repeat(64)}`, bodyHash: `sha256:${hash(receiptBody)}`,
    auditId: '5'.repeat(24), auditVerified: true, body: receiptBody }
  row.qualificationProjection = 'NEUTRAL_RECORDED_FACTS_NO_DRAFT_FALLBACK.v1'
  if (stale) row.materialFingerprints = { ...row.materialFingerprints, evidenceFingerprint: `sha256:${'0'.repeat(64)}` }
  row.bindingCurrency = stale ? 'STALE_MATERIAL' : 'MATCHES_CURRENT_MATERIAL'
  row.scope = stale ? null : facts.scope; row.currentness = stale ? null : facts.currentness
  body.evidenceRegister[0].qualificationReceiptId = qualification.receiptId
  for (const statement of [...body.baseline.statements, ...body.analysis.observations]) statement.qualificationReceiptId = qualification.receiptId
  frozen.receipt.body.membershipHash = hash(frozen.receipt.body.membership)
  frozen.receipt.body.basisHash = hash({ completionReceiptId: frozen.receipt.body.completionReceiptId,
    completionPopulationHash: frozen.receipt.body.completionPopulationHash, membershipHash: frozen.receipt.body.membershipHash })
  frozen.receipt.bodyHash = hash(frozen.receipt.body)
  body.membershipHash = frozen.receipt.body.membershipHash
  body.membershipReference = { membershipHash: body.membershipHash, basisStateVersion: state, scope: nativeScope }
  const { contentVersion, membershipReference, qualificationLedger, evidenceRegister, baseline, analysis, warnings } = body
  body.ledgerHash = hash(qualificationLedger)
  body.outputHash = hash({ contentVersion, membershipReference, qualificationLedger, evidenceRegister, baseline, analysis, warnings })
  response.receipt.bodyHash = hash(body)
  expect(await verifyEvidencePackageReceipt(response, readScope)).not.toBeNull()
  expect(await verifyEvidencePackageReceipt(frozen, readScope)).toEqual(frozen.receipt)
  expect(await verifyEvidencePackageLinks(response.receipt, frozen.receipt)).toBe(true)
  row.currentness = 'Unsupported currentness'
  expect(await verifyEvidencePackageLinks(response.receipt, frozen.receipt)).toBe(false)
})
