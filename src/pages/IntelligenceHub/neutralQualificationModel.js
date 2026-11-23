import { getHubPayload } from './intelligenceHubModel.js'

export const NEUTRAL_FIELDS = [
  ['scope', 'Scope', 2000], ['currentness', 'Currentness as recorded', 2000], ['time', 'Time or period', 2000],
  ['historicalContext', 'Historical context', 4000], ['attribution', 'Attribution', 1000],
  ['permittedStatement', 'Permitted statement', 8000], ['permittedInterpretation', 'Permitted interpretation', 4000],
  ['prohibitedInterpretation', 'Prohibited interpretation', 4000], ['limitations', 'Limitations', 4000],
]
const text = value => typeof value === 'string' && value.length > 0 && value === value.trim()
const hash = value => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value)
const nullableHash = value => value === null || hash(value)
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value)
const objectId = value => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value)
const state = value => typeof value === 'string' && /^rsv2:[a-f0-9-]{36}$/.test(value)
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
export async function neutralQualificationHash(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(canonical(value))))
  return `sha256:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`
}
export const neutralFactsValid = facts => Boolean(facts && Object.keys(facts).length === NEUTRAL_FIELDS.length
  && NEUTRAL_FIELDS.every(([key, , max]) => Object.hasOwn(facts, key)
    && (facts[key] === null || text(facts[key]) && facts[key].length <= max))
  && new TextEncoder().encode(JSON.stringify(facts)).length <= 32768)
const scopeMatches = (value, scope) => value && value.customerId === scope.customerId && value.tenantId === scope.tenantId
  && objectId(value.customerId) && objectId(value.tenantId) && objectId(value.runtimeInstanceId)
  && [value.runtimeInstanceId, value.runtimeInstanceKey].includes(scope.runtimeInstanceId)
  && value.evidenceObjectId === scope.evidenceObjectId && value.sourceId === scope.sourceId
  && text(value.runtimeInstanceKey) && Number.isInteger(value.revisionNumber) && value.revisionNumber > 0
const controlValid = control => control && state(control.stateVersion) && date(control.updatedAt)
  && hash(control.evidenceFingerprint) && hash(control.sourceFingerprint)
const envelopeValid = (value, scope) => value?.contractVersion === 'evidence-neutral-qualification.v1'
  && uuid(value.receiptId) && objectId(value.authoredBy) && date(value.authoredAt)
  && value.binding?.evidenceObjectId === scope.evidenceObjectId && value.binding.sourceId === scope.sourceId
  && hash(value.binding.evidenceFingerprint) && hash(value.binding.sourceFingerprint) && neutralFactsValid(value.facts)
const currencyMatches = value => value.qualification === null ? value.bindingCurrency === 'ABSENT'
  : value.bindingCurrency === (value.qualification.binding.evidenceFingerprint === value.control.evidenceFingerprint
    && value.qualification.binding.sourceFingerprint === value.control.sourceFingerprint ? 'MATCHES_CURRENT_MATERIAL' : 'STALE_MATERIAL')
export async function verifyNeutralReceipt(receipt, scope, command) {
  const body = receipt?.body
  if (receipt?.contractVersion !== 'evidence-neutral-qualification-receipt.v1' || !uuid(receipt.receiptId)
    || !uuid(receipt.requestKey) || !hash(receipt.payloadHash) || !hash(receipt.bodyHash)
    || !text(receipt.auditId) || receipt.auditVerified !== true || body?.operation !== 'RECORD_NEUTRAL_QUALIFICATION'
    || !scopeMatches(body.scope, scope) || !state(body.inputStateVersion) || !state(body.outputStateVersion)
    || !nullableHash(body.previousQualificationHash) || !(body.previousReceiptId === null || uuid(body.previousReceiptId))
    || (body.previousQualificationHash === null) !== (body.previousReceiptId === null)
    || !envelopeValid(body.qualification, scope) || body.qualification.receiptId !== receipt.receiptId
    || !(body.rationale === null || text(body.rationale) && body.rationale.length <= 2000)
    || !hash(body.qualificationHash) || await neutralQualificationHash(body.qualification) !== body.qualificationHash
    || await neutralQualificationHash(body) !== receipt.bodyHash) return null
  if (command && (receipt.requestKey !== command.requestKey || body.inputStateVersion !== command.expectedStateVersion
    || body.previousQualificationHash !== command.expectedQualificationHash || !equal(body.qualification.facts, command.facts)
    || body.rationale !== command.rationale || body.qualification.binding.evidenceFingerprint !== command.expectedEvidenceFingerprint
    || body.qualification.binding.sourceFingerprint !== command.expectedSourceFingerprint
    || await neutralQualificationHash({ actorUserId: body.qualification.authoredBy, payload: command }) !== receipt.payloadHash)) return null
  return receipt
}
export async function readNeutralQualification(response, scope, stateVersion) {
  const value = getHubPayload(response)
  if (!scopeMatches(value?.scope, scope) || !controlValid(value.control) || typeof value.canWrite !== 'boolean'
    || stateVersion !== undefined && value.control.stateVersion !== stateVersion
    || !nullableHash(value.qualificationHash) || !(value.qualification === null || envelopeValid(value.qualification, scope))
    || !currencyMatches(value)) return null
  if (value.qualification === null) return value.qualificationHash === null && value.latestReceipt === null ? value : null
  const receipt = await verifyNeutralReceipt(value.latestReceipt, scope)
  return receipt && equal(receipt.body.scope, value.scope) && equal(receipt.body.qualification, value.qualification)
    && receipt.body.qualificationHash === value.qualificationHash ? value : null
}
export async function readNeutralReceiptResponse(response, scope, { command, receiptId, requestKey } = {}) {
  const value = getHubPayload(response)
  if (!scopeMatches(value?.scope, scope) || !controlValid(value.control) || !envelopeValid(value.qualification, scope)
    || !currencyMatches(value) || !['CURRENT', 'HISTORICAL'].includes(value.receiptCurrency) || typeof value.replay !== 'boolean') return null
  const receipt = await verifyNeutralReceipt(value.receipt, scope, command)
  if (!receipt || !equal(receipt.body.scope, value.scope) || !equal(receipt.body.qualification, value.qualification)
    || receipt.body.qualificationHash !== value.qualificationHash || receiptId && receipt.receiptId !== receiptId
    || requestKey && receipt.requestKey !== requestKey) return null
  return value
}
export async function readNeutralHistory(response, scope) {
  const value = getHubPayload(response)
  if (!scopeMatches(value?.scope, scope) || !Array.isArray(value.items) || value.items.length > 20
    || !(value.nextCursor === null || text(value.nextCursor))
    || new Set(value.items.map(item => item?.receiptId)).size !== value.items.length) return null
  for (const receipt of value.items) if (!await verifyNeutralReceipt(receipt, scope) || !equal(receipt.body.scope, value.scope)) return null
  return value
}
