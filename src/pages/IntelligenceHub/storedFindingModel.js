import { getHubPayload } from './intelligenceHubModel.js'
import { isRecordedContradictionReview } from './contradictionHistoryModel.js'
import { hasQualityControlCharacters } from './intelligenceQualityModel.js'

export const FINDING_TYPES = { All: 'CONTRADICTION', Contradiction: 'CONTRADICTION', 'Missing coverage': 'MISSING_COVERAGE', 'Weak confidence': 'WEAK_CONFIDENCE', 'Duplicate source': 'DUPLICATE_SOURCE' }
export const FINDING_POPULATIONS = { 'Open decisions': 'OPEN', 'Detected candidates': 'DETECTED', 'Recorded dispositions': 'RECORDED' }
const text = (value, max = 240, empty = false) => typeof value === 'string' && value === value.trim()
  && (empty || value.length > 0) && value.length <= max && !hasQualityControlCharacters(value)
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 8
const reasons = ['CANONICAL_FINDING_TYPE_UNAVAILABLE', 'DETECTIONS_NOT_RECORDED', 'STORED_DETECTIONS_INVALID',
  'UNVERIFIED_VISIBILITY_CONTRACT', 'REVIEW_EPOCH_UNAVAILABLE', 'HISTORY_NOT_RECORDED', 'HISTORY_INVALID_OR_OVER_LIMIT',
  'HISTORY_RECORD_INVALID', 'HISTORY_REQUEST_PROOF_INVALID', 'EVIDENCE_BASIS_UNAVAILABLE', 'EVIDENCE_PAIR_UNAVAILABLE']

export function readStoredFindings({ response, scope, selection, loading, error }) {
  const value = getHubPayload(response), r = value?.readReceipt, f = value?.findings, c = value?.control
  if (loading || error || !selection || !text(selection.search, 240, true) || !Object.values(FINDING_TYPES).includes(selection.type)
    || !Object.values(FINDING_POPULATIONS).includes(selection.population) || !['ID_ASC', 'ID_DESC'].includes(selection.sort)
    || !Number.isSafeInteger(selection.page) || selection.page < 1 || selection.page > 1000 || selection.pageSize !== 4
    || !text(scope?.stateVersion) || value?.contractVersion !== 'intelligence-finding-read.v1'
    || value.source !== 'runtime_state_v2.stored_findings' || value.currency !== 'AS_READ'
    || typeof value.readAt !== 'string' || !Number.isFinite(Date.parse(value.readAt)) || new Date(value.readAt).toISOString() !== value.readAt
    || c?.customerId !== scope.customerId || c?.tenantId !== scope.tenantId || ![c?.id, c?.runtimeInstanceKey].includes(scope.runtimeInstanceId)
    || c.stateVersion !== scope.stateVersion || r?.source !== value.source || r.bounded !== true || r.fullLegacyFrameworkStateFetched !== false
    || r.maxTimeMS !== 2000 || r.requestTimeoutMS !== 6000 || r.workTimeoutMS !== 5500 || r.cleanupReserveMS !== 500
    || r.maxSerializedPayloadBytes !== 524288 || !Number.isSafeInteger(r.serializedPayloadBytes) || r.serializedPayloadBytes < 0 || r.serializedPayloadBytes > 524288
    || !f || ['search', 'type', 'population', 'sort', 'page', 'pageSize'].some(key => f[key] !== selection[key])
    || f.allTypesCompleteness !== 'UNAVAILABLE' || f.detectionPolicy?.coverage !== 'LIMITED_BY_PRODUCER_POLICY'
    || f.detectionPolicy.maxStoredCandidates !== 8 || f.detectionPolicy.detectorVersion !== null || !Array.isArray(f.records)) return null
  if (f.available === false) return f.completeness === 'UNAVAILABLE' && reasons.includes(f.reason) && f.total === null
    && f.totalPages === null && f.populations === null && !f.records.length ? { available: false, reason: f.reason } : null
  if (f.available !== true || f.completeness !== 'COMPLETE_STORED_DETECTIONS' || f.reason !== null || f.type !== 'CONTRADICTION'
    || !count(f.total) || f.totalPages !== Math.max(1, Math.ceil(f.total / selection.pageSize))
    || f.records.length !== Math.min(selection.pageSize, Math.max(0, f.total - (selection.page - 1) * selection.pageSize))
    || !['detected', 'open', 'recorded'].every(key => count(f.populations?.[key]))
    || f.populations.counting !== 'OVERLAPPING_INSPECTION_POPULATIONS' || f.populations.open > f.populations.detected
    || f.populations.recorded > f.populations.detected || f.total > f.populations[{ DETECTED: 'detected', OPEN: 'open', RECORDED: 'recorded' }[f.population]]
    || new Set(f.records.map(row => row?.findingId)).size !== f.records.length
    || f.records.some((row, i) => !text(row?.findingId) || row.type !== 'CONTRADICTION' || !text(row.domain)
      || !text(row.severity, 100) || !text(row.basis, 2000) || !/^sha256:[a-f0-9]{64}$/.test(row.evidencePairHash || '')
      || !['UNREVIEWED', 'NOT_CONTRADICTORY', 'CONFIRMED', 'REOPENED', 'STALE'].includes(row.reviewStatus)
      || row.priority?.available !== false || row.priority.reason !== 'GOVERNED_PRIORITY_NOT_RECORDED' || row.consequences !== 'UNAVAILABLE'
      || !Array.isArray(row.evidence) || row.evidence.length !== 2 || new Set(row.evidence.map(e => e?.evidenceObjectId)).size !== 2
      || row.evidence.some(e => !text(e?.evidenceObjectId) || !text(e.sourceId) || !text(e.extractedFact, 8000)
        || !text(e.sourceType, 100, true) || !text(e.lineageRef, 1000, true) || !text(e.validationStatus, 80, true)
        || !['PENDING', 'ACCEPTED'].includes(e.reviewStatus))
      || row.latestReview !== null && !isRecordedContradictionReview(row.latestReview, c.id, row.findingId)
      || row.reviewStatus === 'UNREVIEWED' && row.latestReview !== null
      || ['NOT_CONTRADICTORY', 'CONFIRMED', 'REOPENED'].includes(row.reviewStatus)
        && (row.latestReview?.disposition !== row.reviewStatus || row.latestReview.evidencePairHash !== row.evidencePairHash)
      || f.population === 'OPEN' && ['NOT_CONTRADICTORY', 'CONFIRMED'].includes(row.reviewStatus)
      || f.population === 'RECORDED' && row.latestReview === null
      || i > 0 && (f.sort === 'ID_ASC' ? f.records[i - 1].findingId >= row.findingId : f.records[i - 1].findingId <= row.findingId))) return null
  return { available: true, total: f.total, totalPages: f.totalPages, populations: f.populations, readAt: value.readAt,
    candidates: f.records.map(row => ({ id: row.findingId, type: 'Contradiction', domain: row.domain, severity: row.severity,
      basis: row.basis, evidencePairHash: row.evidencePairHash, status: row.reviewStatus, evidence: row.evidence, latestReview: row.latestReview })) }
}
