import { beforeEach, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { NEUTRAL_FIELDS, neutralFactsValid, neutralQualificationHash as hash, readNeutralQualification,
  readNeutralReceiptResponse, readNeutralHistory } from './neutralQualificationModel.js'
const scope = { customerId: '111111111111111111111111', tenantId: '222222222222222222222222', runtimeInstanceId: '333333333333333333333333', evidenceObjectId: 'item', sourceId: 'source' }
const wireScope = { ...scope, runtimeInstanceKey: 'revision-key', revisionNumber: 1 }
const fingerprint = `sha256:${'a'.repeat(64)}`
const control = { stateVersion: 'rsv2:00000000-0000-4000-8000-000000000002', updatedAt: '2026-11-19T12:00:00.000Z', evidenceFingerprint: fingerprint, sourceFingerprint: fingerprint }
beforeEach(() => vi.stubGlobal('crypto', webcrypto))
async function fixture() {
  const facts = Object.fromEntries(NEUTRAL_FIELDS.map(([key]) => [key, null]))
  facts.currentness = 'Unknown'; facts.historicalContext = 'HISTORICAL'
  const command = { requestKey: '00000000-0000-4000-8000-000000000001', expectedStateVersion: 'rsv2:00000000-0000-4000-8000-000000000001', expectedUpdatedAt: control.updatedAt,
    expectedEvidenceFingerprint: fingerprint, expectedSourceFingerprint: fingerprint, expectedQualificationHash: null, facts, rationale: null }
  const qualification = { contractVersion: 'evidence-neutral-qualification.v1', receiptId: '10000000-0000-4000-8000-000000000001', authoredBy: 'a'.repeat(24),
    authoredAt: control.updatedAt, binding: { evidenceObjectId: 'item', sourceId: 'source', evidenceFingerprint: fingerprint, sourceFingerprint: fingerprint }, facts }
  const qualificationHash = await hash(qualification)
  const body = { operation: 'RECORD_NEUTRAL_QUALIFICATION', scope: wireScope, inputStateVersion: 'rsv2:00000000-0000-4000-8000-000000000001', outputStateVersion: 'rsv2:00000000-0000-4000-8000-000000000002',
    qualificationHash, previousQualificationHash: null, previousReceiptId: null, qualification, rationale: null }
  const receipt = { contractVersion: 'evidence-neutral-qualification-receipt.v1', receiptId: qualification.receiptId,
    requestKey: command.requestKey, payloadHash: await hash({ actorUserId: qualification.authoredBy, payload: command }),
    bodyHash: await hash(body), auditId: 'b'.repeat(24), auditVerified: true, body }
  const response = { scope: wireScope, control, qualification, qualificationHash, bindingCurrency: 'MATCHES_CURRENT_MATERIAL', receipt,
    receiptCurrency: 'CURRENT', replay: false }
  return { command, response, selected: { scope: wireScope, control, canWrite: true, qualification, qualificationHash,
    bindingCurrency: response.bindingCurrency, latestReceipt: receipt } }
}
it('preserves explicit nulls and authored unknown/historical text without declaring currentness', async () => {
  const value = await fixture()
  expect((await readNeutralQualification(value.selected, scope, 'rsv2:00000000-0000-4000-8000-000000000002')).qualification.facts).toEqual(value.command.facts)
  expect(await readNeutralReceiptResponse(value.response, scope, { command: value.command })).toEqual(value.response)
  expect(await readNeutralQualification({ scope: wireScope, control, canWrite: false, qualification: null,
    qualificationHash: null, bindingCurrency: 'ABSENT', latestReceipt: null }, scope)).not.toBeNull()
})
it('refuses blank, missing, extra, oversized and nontext qualification facts', async () => {
  const { command } = await fixture()
  for (const facts of [{ ...command.facts, scope: '' }, { ...command.facts, scope: ' padded ' },
    { ...command.facts, confidence: 90 }, { ...command.facts, attribution: true }, { ...command.facts, attribution: 'x'.repeat(1001) },
    { ...command.facts, permittedStatement: '😀'.repeat(4000), historicalContext: '😀'.repeat(2000), limitations: '😀'.repeat(2000), permittedInterpretation: '😀'.repeat(2000) }]) {
    expect(neutralFactsValid(facts)).toBe(false)
  }
})
it('requires matching customer, tenant, exact item/source and current read version', async () => {
  const { selected } = await fixture()
  for (const change of [{ customerId: 'other' }, { tenantId: 'other' }, { evidenceObjectId: 'other' }, { sourceId: 'other' }]) {
    expect(await readNeutralQualification(selected, { ...scope, ...change })).toBeNull()
  }
  expect(await readNeutralQualification(selected, scope, 'older-state')).toBeNull()
})
it('rejects a mismatched receipt, actor-bound payload, operation, qualification and server audit verification', async () => {
  const { response, command } = await fixture()
  for (const transform of [value => { value.receipt.auditVerified = false }, value => { value.receipt.body.operation = 'ACCEPT' },
    value => { value.receipt.payloadHash = fingerprint }, value => { value.receipt.body.qualification.facts.attribution = 'Changed' },
    value => { value.receipt.body.scope.customerId = 'other' }, value => { value.receipt.bodyHash = fingerprint }]) {
    const changed = structuredClone(response); transform(changed)
    expect(await readNeutralReceiptResponse(changed, scope, { command })).toBeNull()
  }
  expect(await readNeutralReceiptResponse(response, scope, { receiptId: 'wrong' })).toBeNull()
  expect(await readNeutralReceiptResponse(response, scope, { requestKey: 'wrong' })).toBeNull()
})
it('separates historical receipt currency from unchanged source/evidence material and authored currentness', async () => {
  const { response } = await fixture()
  const older = { ...response, receiptCurrency: 'HISTORICAL', control: { ...control, stateVersion: 'rsv2:00000000-0000-4000-8000-000000000003' } }
  expect((await readNeutralReceiptResponse(older, scope)).bindingCurrency).toBe('MATCHES_CURRENT_MATERIAL')
  const stale = { ...older, bindingCurrency: 'STALE_MATERIAL', control: { ...control, sourceFingerprint: `sha256:${'c'.repeat(64)}` } }
  expect((await readNeutralReceiptResponse(stale, scope)).qualification.facts.currentness).toBe('Unknown')
  expect(await readNeutralReceiptResponse({ ...stale, bindingCurrency: 'MATCHES_CURRENT_MATERIAL' }, scope)).toBeNull()
})
it('validates each bounded history receipt and refuses unavailable, duplicate or cross-scope histories', async () => {
  const { response } = await fixture()
  const history = { scope: wireScope, items: [response.receipt], nextCursor: null }
  expect(await readNeutralHistory(history, scope)).toEqual(history)
  expect(await readNeutralHistory(null, scope)).toBeNull()
  expect(await readNeutralHistory({ ...history, items: [response.receipt, response.receipt] }, scope)).toBeNull()
  expect(await readNeutralHistory(history, { ...scope, tenantId: 'other' })).toBeNull()
  expect(await readNeutralHistory({ ...history, items: [{ ...response.receipt, auditVerified: false }] }, scope)).toBeNull()
})
