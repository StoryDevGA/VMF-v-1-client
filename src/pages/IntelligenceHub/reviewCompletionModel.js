import { getHubPayload } from './intelligenceHubModel.js'

const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const sourceHash = value => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value)
const identity = value => typeof value === 'string' && value.length > 0 && value.length <= 240
const validMembership = (receipt, scope) => {
  if (receipt.membershipStatus === undefined && receipt.membership === undefined
    || receipt.membershipStatus === 'LEGACY_NOT_RECORDED' && receipt.membership === undefined) return true
  const member = receipt.membership
  if (receipt.membershipStatus !== 'VERIFIED' || !member || member.contractVersion !== 'review-population-membership.v1'
    || member.auditVerified !== true || member.lockFrozen !== false
    || member.policy !== receipt.populationPolicy
    || !hash(member.membershipHash) || member.membershipHash !== receipt.populationHash
    || member.observedStateVersion !== receipt.observedStateVersion
    || ['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey', 'rootRuntimeInstanceKey']
      .some(key => member[key] !== scope[key])
    || member.revisionNumber !== null && (!Number.isSafeInteger(member.revisionNumber) || member.revisionNumber < 1)
    || !Array.isArray(member.evidence) || !Array.isArray(member.sources) || !Array.isArray(member.contradictions)) return false
  const sourceIds = new Set(member.sources.map(item => item?.id))
  if (sourceIds.size !== member.sources.length || member.sources.some(item => !identity(item?.id) || !hash(item.basisHash)
    || item.sourceRef !== null && (typeof item.sourceRef !== 'string' || item.sourceRef.length > 2400)
    || item.contentHash !== null && !sourceHash(item.contentHash))) return false
  if (new Set(member.evidence.map(item => item?.id)).size !== member.evidence.length) return false
  return member.evidence.every(item => identity(item?.id) && sourceIds.has(item.sourceId) && hash(item.basisHash)
    && ['ACCEPTED', 'REJECTED'].includes(item.status) && item.decision?.status === item.status
    && typeof item.decision.reviewerId === 'string' && /^[a-f0-9]{24}$/i.test(item.decision.reviewerId)
    && typeof item.decision.reviewedAt === 'string' && Number.isFinite(Date.parse(item.decision.reviewedAt))
    && (item.decision.rationale === null || typeof item.decision.rationale === 'string'
      && item.decision.rationale.trim().length >= 10 && item.decision.rationale.length <= 2000)
    && (item.support === undefined || item.support?.sourceId === item.sourceId
      && sourceHash(item.support.originalContentHash) && sourceHash(item.support.captureTextHash)
      && sourceHash(item.support.excerptHash) && item.support.coordinateSystem === 'UTF16_CODE_UNIT'
      && Number.isSafeInteger(item.support.start) && item.support.start >= 0
      && Number.isSafeInteger(item.support.end) && item.support.end > item.support.start))
    && member.sources.every(item => item.capture === undefined || item.capture?.sourceId === item.id
      && sourceHash(item.capture.originalContentHash) && sourceHash(item.capture.captureTextHash)
      && typeof item.capture.capturedAt === 'string' && Number.isFinite(Date.parse(item.capture.capturedAt)))
    && member.contradictions.every(item => identity(item?.id) && ['CONFIRMED', 'NOT_CONTRADICTORY'].includes(item.status))
}

export function readCompletion(response, scope) {
  const value = getHubPayload(response)
  if (value?.contractVersion !== 'intelligence-review-completion.v1'
    || value.scope?.customerId !== scope.customerId || value.scope?.tenantId !== scope.tenantId
    || ![value.scope?.runtimeInstanceKey, value.scope?.runtimeInstanceId].includes(scope.runtimeInstanceId)
    || value.scope?.rootRuntimeInstanceKey !== scope.workspaceId
    || value.population?.completeness !== 'COMPLETE' || !/^[a-f0-9]{64}$/.test(value.population?.hash || '')
    || ![value.population.pendingEvidence, value.population.pendingFindings, value.population.decisionCount]
      .every(number => Number.isSafeInteger(number) && number >= 0)
    || [value.receipt, value.latestReceipt].some(receipt => receipt && !validMembership(receipt, value.scope))) return null
  return value
}

