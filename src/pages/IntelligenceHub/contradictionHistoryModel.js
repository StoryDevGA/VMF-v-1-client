import { getHubPayload } from './intelligenceHubModel.js'

const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)
const text = value => typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= 240
  && !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
const time = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value
const reasons = ['HISTORY_NOT_RECORDED', 'HISTORY_INVALID_OR_OVER_LIMIT', 'HISTORY_RECORD_INVALID', 'HISTORY_REQUEST_PROOF_INVALID']
export function isRecordedContradictionReview(row, runtimeId, findingId) {
  return Boolean(row && row.contractVersion === 'discovery-contradiction-review-v1'
    && uuid(row.reviewId) && row.runtimeInstanceId === runtimeId && row.contradictionId === findingId
    && /^sha256:[a-f0-9]{64}$/.test(row.evidencePairHash || '')
    && ['NOT_CONTRADICTORY', 'CONFIRMED', 'REOPENED'].includes(row.disposition)
    && typeof row.rationale === 'string' && row.rationale === row.rationale.trim() && row.rationale.length >= 10 && row.rationale.length <= 2000
    && typeof row.reviewedBy === 'string' && /^[a-f0-9]{24}$/.test(row.reviewedBy) && time(row.reviewedAt) && text(row.reviewedStateVersion)
    && typeof row.reviewEpoch === 'string' && (row.reviewEpoch === '' || uuid(row.reviewEpoch))
    && (!['requestKey', 'requestPayloadHash', 'requestExpectedUpdatedAt'].some(field => row[field] !== undefined)
      || uuid(row.requestKey) && /^[a-f0-9]{64}$/.test(row.requestPayloadHash || '') && time(row.requestExpectedUpdatedAt)))
}
export function readContradictionHistory({ response, scope, findingId, page, loading, error }) {
  const value = getHubPayload(response), receipt = value?.readReceipt, history = value?.history, control = value?.control
  if (loading || error || !text(scope?.stateVersion) || value?.contractVersion !== 'intelligence-contradiction-history.v1'
    || value.source !== 'runtime_state_v2.contradiction_history' || value.currency !== 'AS_READ' || !time(value.readAt)
    || control?.customerId !== scope.customerId || control?.tenantId !== scope.tenantId
    || ![control?.id, control?.runtimeInstanceKey].includes(scope.runtimeInstanceId) || control.stateVersion !== scope.stateVersion
    || receipt?.source !== value.source || receipt.bounded !== true || receipt.fullLegacyFrameworkStateFetched !== false
    || receipt.maxTimeMS !== 2000 || receipt.requestTimeoutMS !== 6000 || receipt.workTimeoutMS !== 5500 || receipt.cleanupReserveMS !== 500
    || receipt.maxSerializedPayloadBytes !== 524288 || !Number.isSafeInteger(receipt.serializedPayloadBytes)
    || receipt.serializedPayloadBytes < 0 || receipt.serializedPayloadBytes > 524288
    || history?.findingId !== findingId || history.page !== page || history.pageSize !== 10
    || history.basis !== 'RECORDED_DECISIONS' || history.currentness !== 'NOT_ASSESSED'
    || history.auditReferences !== 'UNAVAILABLE' || history.recalculation !== 'UNAVAILABLE'
    || !Array.isArray(history.records)) return null
  if (history.available === false) return history.completeness === 'UNAVAILABLE' && reasons.includes(history.reason)
    && history.records.length === 0 && history.total === null && history.totalPages === null ? { available: false, reason: history.reason } : null
  if (history.available !== true || history.reason !== null || history.completeness !== 'COMPLETE_STORED_HISTORY'
    || !Number.isSafeInteger(history.total) || history.total < 0 || history.total > 1000
    || history.totalPages !== Math.max(1, Math.ceil(history.total / 10))
    || history.records.length !== Math.min(10, Math.max(0, history.total - (page - 1) * 10))
    || new Set(history.records.map(row => row?.reviewId)).size !== history.records.length
    || history.records.some(row => !isRecordedContradictionReview(row, control.id, findingId))) return null
  return { available: true, total: history.total, totalPages: history.totalPages, records: history.records, readAt: value.readAt }
}
