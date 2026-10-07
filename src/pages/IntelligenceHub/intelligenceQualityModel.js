import { getHubPayload } from './intelligenceHubModel.js'

export const QUALITY_TYPES = Object.freeze(['All', 'Contradiction', 'Missing coverage', 'Weak confidence', 'Duplicate source'])
export const QUALITY_POPULATIONS = Object.freeze(['Open decisions', 'Detected candidates', 'Recorded dispositions'])
export const QUALITY_INSPECTION_KEYS = Object.freeze(['qualityInspectionContext', 'qualityPopulation', 'qualityType', 'qualityQuery', 'qualityPage', 'qualitySort'])
export const hasQualityControlCharacters = value => Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)

export function readQualityInspection(params, contextKey) {
  const defaults = { population: null, type: 'All', search: '', page: 1, sort: 'ID_ASC', invalid: false }
  if (params.get('qualityInspectionContext') !== contextKey) return defaults
  const population = params.get('qualityPopulation')
  const type = params.get('qualityType')
  const search = params.get('qualityQuery') || ''
  const page = params.get('qualityPage') || '1', sort = params.get('qualitySort') || 'ID_ASC'
  if (QUALITY_INSPECTION_KEYS.some(key => params.getAll(key).length > 1)
    || (population !== null && !QUALITY_POPULATIONS.includes(population))
    || (type !== null && !QUALITY_TYPES.includes(type)) || search.length > 240 || hasQualityControlCharacters(search)
    || !/^[1-9][0-9]{0,3}$/.test(page) || Number(page) > 1000 || !['ID_ASC', 'ID_DESC'].includes(sort)) return { ...defaults, invalid: true }
  return { population, type: type || 'All', search, page: Number(page), sort, invalid: false }
}
export const text = value => typeof value === 'string' && value.trim() ? value.trim() : ''
const REVIEW_STATES = new Set(['UNREVIEWED', 'NOT_CONTRADICTORY', 'CONFIRMED', 'REOPENED', 'STALE'])

const exactId = value => typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= 240
  && !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
const canonicalId = value => exactId(value)
  && !/runtime_(?:instances|section_states|evidence_sources|evidence_objects|graph_snapshots|graph_elements)|mongodb|mongo(?:db)?|collection/i.test(value)

export function readQualityGraphPair({ response, scope, stateVersion, findingId, evidenceObjectId, loading, error }) {
  const body = getHubPayload(response), control = body?.control
  if (loading || error || !exactId(stateVersion) || !exactId(findingId) || !canonicalId(evidenceObjectId)
    || body?.contractVersion !== 'intelligence-review-actions.v1' || control?.customerId !== scope.customerId
    || control?.tenantId !== scope.tenantId || ![control?.id, control?.runtimeInstanceKey].includes(scope.runtimeInstanceId)
    || control.stateVersion !== stateVersion || !Array.isArray(body.candidates) || body.candidates.length > 8) return null
  const matches = body.candidates.filter(row => row?.contradictionId === findingId)
  if (matches.length !== 1) return null
  const candidate = matches[0], ids = candidate.evidenceObjectIds, evidence = candidate.evidence
  if (!Array.isArray(ids) || ids.length !== 2 || new Set(ids).size !== 2 || !ids.every(canonicalId)
    || !ids.includes(evidenceObjectId) || !Array.isArray(evidence) || evidence.length > 2
    || evidence.some(row => !canonicalId(row?.evidenceObjectId) || !ids.includes(row.evidenceObjectId))
    || new Set(evidence.map(row => row.evidenceObjectId)).size !== evidence.length
    || evidence.filter(row => row.evidenceObjectId === evidenceObjectId).length !== 1) return null
  return { findingId, evidenceObjectId }
}

// This is the capped contradiction set, not a complete quality findings registry.
export function readQualityCandidates({ response, error, isLoading, discovery }) {
  if (isLoading) return { candidates: null, message: 'Loading quality candidates…', preview: false }
  const preview = error?.status === 403
  if (error && !preview) return { candidates: null, message: 'Quality candidates could not be loaded. Refresh to retry.', preview: false }
  const payload = getHubPayload(response)
  const rows = preview ? discovery?.discoveryHealth?.contradictionCandidates : payload?.candidates
  if (!Array.isArray(rows)) return { candidates: null, message: preview
    ? 'Evidence detail requires update permission. No contradiction preview is available for this revision.'
    : 'No contradiction read is available for this revision.', preview }
  if (rows.some(row => !text(row?.contradictionId))) return { candidates: null, message: 'The contradiction read is incomplete. Refresh to retry.', preview }
  const seen = new Set()
  const candidates = rows.slice(0, 8).filter(row => {
    const id = text(row?.contradictionId)
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  }).map(row => ({
    id: text(row.contradictionId), domain: text(row.domain), basis: text(row.basis),
    evidencePairHash: !preview ? text(row.evidencePairHash) : '',
    severity: text(row.severity), type: 'Contradiction',
    status: !preview && REVIEW_STATES.has(row.reviewStatus) ? row.reviewStatus : '',
    evidence: !preview && Array.isArray(row.evidence) ? row.evidence.slice(0, 2).filter(item =>
      text(item?.evidenceObjectId) && Array.isArray(row.evidenceObjectIds) && row.evidenceObjectIds.includes(item.evidenceObjectId)) : [],
    latestReview: !preview && row.latestReview?.contradictionId === row.contradictionId ? row.latestReview : null,
  }))
  return { candidates, preview, message: preview ? 'Contradiction preview only. Evidence detail requires update permission.' : '' }
}

export function qualityDefaultPopulation(candidate, preview = false) {
  if (preview || (candidate && !candidate.status)) return 'Detected candidates'
  return ['NOT_CONTRADICTORY', 'CONFIRMED'].includes(candidate?.status) ? 'Recorded dispositions' : 'Open decisions'
}

export function filterQualityCandidates(candidates, type, search, population = 'Detected candidates') {
  const query = search.trim().toLowerCase()
  return (candidates || []).filter(item => (type === 'All' || item.type === type)
    && (population === 'Detected candidates'
      || (population === 'Open decisions' && ['UNREVIEWED', 'REOPENED', 'STALE'].includes(item.status))
      || (population === 'Recorded dispositions' && (['NOT_CONTRADICTORY', 'CONFIRMED'].includes(item.status)
        || (item.status === 'STALE' && item.latestReview))))
    && [item.id, item.domain, item.basis].some(value => value.toLowerCase().includes(query)))
}
