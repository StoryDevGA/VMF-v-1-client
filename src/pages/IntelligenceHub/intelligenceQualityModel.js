import { getHubPayload } from './intelligenceHubModel.js'

export const QUALITY_TYPES = Object.freeze(['All', 'Contradiction', 'Missing coverage', 'Weak confidence', 'Duplicate source'])
export const text = value => typeof value === 'string' && value.trim() ? value.trim() : ''
const REVIEW_STATES = new Set(['UNREVIEWED', 'NOT_CONTRADICTORY', 'CONFIRMED', 'REOPENED', 'STALE'])

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
    severity: text(row.severity), type: 'Contradiction',
    status: REVIEW_STATES.has(row.reviewStatus) ? row.reviewStatus : '',
    evidence: !preview && Array.isArray(row.evidence) ? row.evidence.slice(0, 2).filter(item =>
      text(item?.evidenceObjectId) && Array.isArray(row.evidenceObjectIds) && row.evidenceObjectIds.includes(item.evidenceObjectId)) : [],
    latestReview: !preview && row.latestReview?.contradictionId === row.contradictionId ? row.latestReview : null,
  }))
  return { candidates, preview, message: preview ? 'Contradiction preview only. Evidence detail requires update permission.' : '' }
}

export function filterQualityCandidates(candidates, type, search) {
  const query = search.trim().toLowerCase()
  return (candidates || []).filter(item => (type === 'All' || item.type === type)
    && [item.id, item.domain, item.basis].some(value => value.toLowerCase().includes(query)))
}
