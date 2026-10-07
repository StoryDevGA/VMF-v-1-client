import { readCompletion } from './reviewCompletionModel.js'

const POLICY = 'revision-evidence-contradiction-decisions.v1'
const count = value => Number.isSafeInteger(value) && value >= 0
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const identity = value => typeof value === 'string' && value.length > 0 && value.length <= 240
  && value === value.trim() && !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
const time = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
const objectId = value => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value)
const receiptFields = ['receiptId', 'completedAt', 'actorUserId', 'authority', 'rationale', 'populationHash',
  'populationPolicy', 'observedStateVersion', 'auditId', 'auditSignatureVersion', 'currency']
const receiptValid = (receipt, population, readAt) => receipt && typeof receipt.receiptId === 'string'
  && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(receipt.receiptId)
  && time(receipt.completedAt) && Date.parse(receipt.completedAt) <= Date.parse(readAt)
  && objectId(receipt.actorUserId) && objectId(receipt.auditId) && receipt.authority === 'VMF_UPDATE'
  && typeof receipt.rationale === 'string' && receipt.rationale.trim().length >= 10 && receipt.rationale.length <= 2000
  && hash(receipt.populationHash) && receipt.populationPolicy === POLICY && identity(receipt.observedStateVersion)
  && count(receipt.auditSignatureVersion) && receipt.auditSignatureVersion > 0
  && receipt.currency === (receipt.populationHash === population.hash ? 'CURRENT' : 'STALE')
  && (receipt.currency !== 'CURRENT' || population.complete === true)
const projectReceipt = receipt => Object.fromEntries(receiptFields.map(field => [field, receipt[field]]))

// Inspect existing signed-receipt anchors; this read does not verify signatures or grant authority.
export function readAssuranceReview({ response, scope, stateVersion, loading, error }) {
  const value = !loading && !error ? readCompletion(response, scope) : null
  if (!value || !identity(stateVersion) || value.stateVersion !== stateVersion
    || value.currency !== 'AS_READ' || !time(value.readAt)) return null
  const { population: p, readReceipt: budget, history, latestReceipt } = value
  if (p.policy !== POLICY || p.target !== null
    || ![p.evidenceCount, p.sourceCount, p.confirmedReadinessBlockers].every(count)
    || p.pendingEvidence > p.evidenceCount || p.evidenceCount > p.decisionCount
    || p.pendingFindings + p.confirmedReadinessBlockers > p.decisionCount - p.evidenceCount
    || typeof p.complete !== 'boolean'
    || !['ALL_MANDATORY_DECISIONS_DISPOSED', 'OUTSTANDING_DECISIONS', 'EVIDENCE_REFRESH_REQUIRED'].includes(p.reason)
    || p.complete !== (p.reason === 'ALL_MANDATORY_DECISIONS_DISPOSED')
    || (p.complete && p.pendingEvidence + p.pendingFindings !== 0)
    || (p.reason === 'OUTSTANDING_DECISIONS' && p.pendingEvidence + p.pendingFindings === 0)
    || budget?.bounded !== true || budget.fullLegacyFrameworkStateFetched !== false
    || budget.maxTimeMS !== 2000 || budget.requestTimeoutMS !== 6000 || budget.workTimeoutMS !== 5500
    || budget.cleanupReserveMS !== 500 || budget.inventoryPageSize !== 150
    || budget.historyLimit !== 25 || budget.maxManifestBytes !== 512 * 1024
    || !Array.isArray(history?.records) || history.records.length > 25 || typeof history.hasMore !== 'boolean'
    || history.completeness !== (history.hasMore ? 'PARTIAL' : 'COMPLETE')
    || (history.hasMore && history.records.length !== 25)) return null
  const ids = new Set()
  let lastTime = Infinity
  for (const receipt of history.records) {
    if (!receiptValid(receipt, p, value.readAt) || ids.has(receipt.receiptId) || Date.parse(receipt.completedAt) > lastTime) return null
    ids.add(receipt.receiptId); lastTime = Date.parse(receipt.completedAt)
  }
  if (history.records.length ? !receiptValid(latestReceipt, p, value.readAt)
    || receiptFields.some(field => latestReceipt[field] !== history.records[0][field]) : latestReceipt !== null) return null
  return { stateVersion: value.stateVersion, readAt: value.readAt,
    population: { hash: p.hash, policy: p.policy, evidenceCount: p.evidenceCount, sourceCount: p.sourceCount,
      pendingEvidence: p.pendingEvidence, pendingFindings: p.pendingFindings, decisionCount: p.decisionCount,
      confirmedReadinessBlockers: p.confirmedReadinessBlockers, complete: p.complete, reason: p.reason },
    latestReceipt: latestReceipt ? projectReceipt(latestReceipt) : null,
    history: { records: history.records.map(projectReceipt), hasMore: history.hasMore, completeness: history.completeness } }
}
