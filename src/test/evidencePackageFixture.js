import { createHash } from 'node:crypto'
import { EVIDENCE_PACKAGE_VERSION } from '../pages/IntelligenceHub/evidencePackageModel.js'

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
export const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
const contentHash = value => `sha256:${createHash('sha256').update(value).digest('hex')}`
export const scope = { customerId: 'customer', tenantId: 'tenant', runtimeInstanceId: 'revision', workspaceId: 'root' }
export const publicScope = { ...scope, runtimeInstanceKey: 'revision-key', rootRuntimeInstanceKey: 'root', revisionNumber: 1 }
export const version = 'rsv2:fixture', stamp = '2026-11-18T11:00:00.000Z'
export const preview = () => ({ contractVersion: EVIDENCE_PACKAGE_VERSION, scope: publicScope,
  control: { stateVersion: version, runtimeUpdatedAt: stamp, populationHash: 'a'.repeat(64) }, canWrite: true,
  batch: { eligibleIds: ['evidence-one'], excluded: [{ id: 'already-rejected', reason: 'REJECTED' }] }, completion: null,
  availability: { canFreeze: false, canSave: false, reason: 'REVIEW_COMPLETION_REQUIRED' },
  freezePreview: { basisHash: 'b'.repeat(64), acceptedIds: [], sectionMappings: [], unassignedEvidenceIds: [] },
  packagePreview: null, latestFreeze: null, latestPackage: null, history: { records: [], hasMore: false } })
export const wrapReceipt = (kind, body, commandBody = {}, id = kind.toLowerCase()) => ({ contractVersion: EVIDENCE_PACKAGE_VERSION,
  scope: publicScope, replay: false, receipt: { contractVersion: EVIDENCE_PACKAGE_VERSION, receiptId: id, kind,
    requestKey: commandBody.requestKey || 'key', payloadHash: hash({ ...commandBody, actorUserId: 'a'.repeat(24) }),
    basisStateVersion: version, auditId: 'b'.repeat(24), auditSignatureVersion: 1, auditVerified: true,
    actorUserId: 'a'.repeat(24), createdAt: stamp, currency: 'CURRENT', body, bodyHash: hash(body) } })
export const frozenFixture = () => {
  const member = { evidenceObjectId: 'evidence-one', sourceId: 'source-one', materialHash: 'c'.repeat(64), sourceHash: `sha256:${'d'.repeat(64)}` }
  const membership = { contractVersion: 'published-evidence-membership.v1', scope: publicScope, basisStateVersion: version,
    evidence: [member], sources: [{ sourceId: 'source-one' }], sections: [] }
  const body = { completionReceiptId: 'completion', completionPopulationHash: 'a'.repeat(64), membershipHash: hash(membership),
    membership, sectionMappings: [], unassignedEvidenceIds: ['evidence-one'] }
  body.basisHash = hash({ completionReceiptId: body.completionReceiptId, completionPopulationHash: body.completionPopulationHash, membershipHash: body.membershipHash })
  return wrapReceipt('FREEZE', body)
}
export const packageFixture = (freeze = frozenFixture()) => {
  const row = { evidenceObjectId: 'evidence-one', sourceId: 'source-one', locator: 'https://example.test/',
    exactExcerpt: 'A qualified source statement.', start: 3, end: 32, coordinateSystem: 'UTF16_CODE_UNIT',
    excerptHash: contentHash('A qualified source statement.'), sourceHash: `sha256:${'d'.repeat(64)}`,
    captureTextHash: `sha256:${'e'.repeat(64)}`, retrievedAt: stamp, qualifications: ['Source assertion only'], unknowns: [] }
  const statement = { evidenceObjectId: row.evidenceObjectId, sourceId: row.sourceId, statement: row.exactExcerpt, evidenceIds: [row.evidenceObjectId] }
  const output = { qualificationLedger: [row], evidenceRegister: [{ evidenceObjectId: row.evidenceObjectId, sourceId: row.sourceId,
    locator: row.locator, excerptHash: row.excerptHash, qualificationEvidenceId: row.evidenceObjectId }],
    baseline: { classification: 'QUALIFIED_SOURCE_ASSERTIONS_NOT_CUSTOMER_CONFIRMED_TRUTH', statements: [statement] },
    analysis: { observations: [statement], patterns: [], hypotheses: [], contradictions: [], unknowns: [] }, warnings: [] }
  return wrapReceipt('PACKAGE', { freezeReceiptId: freeze.receipt.receiptId, completionReceiptId: freeze.receipt.body.completionReceiptId,
    membershipHash: freeze.receipt.body.membershipHash, ...output, ledgerHash: hash(output.qualificationLedger), outputHash: hash(output) })
}
