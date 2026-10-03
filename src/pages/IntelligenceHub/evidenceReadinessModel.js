import { getHubCount, getHubDiscovery, getHubEvidencePage, displayHubToken, reconcileHubDiscovery } from './intelligenceHubModel.js'
import { readQualityCandidates } from './intelligenceQualityModel.js'

// Evidence admission, ingestion completeness and interpretation are separate contracts.
export function readEvidenceReadiness({ renderer, evidenceResponse, evidenceError, evidenceLoading, candidateResponse, candidateError, candidateLoading }) {
  const recorded = getHubDiscovery(renderer)
  const page = evidenceError || evidenceLoading ? null : getHubEvidencePage(evidenceResponse)
  const total = page && !page.totalCapped ? getHubCount(page, 'total') : null
  const discovery = total === null ? null : reconcileHubDiscovery(recorded, page)
  const sourceCount = getHubCount(discovery?.sourceRegistrySummary, 'count')
  const readiness = recorded?.discoveryHealth?.readiness
  const state = ['READY', 'PARTIALLY_READY', 'NOT_READY'].includes(readiness?.state) ? readiness.state : ''
  const candidates = readQualityCandidates({ response: candidateResponse, error: candidateError, isLoading: candidateLoading, discovery: recorded })
  const unresolvedCandidates = candidates.candidates?.filter(row => row.status !== 'NOT_CONTRADICTORY')
  const needsRefresh = recorded?.needsRefresh === true
  const empty = total === 0
  const attention = !empty && (needsRefresh || state === 'NOT_READY' || state === 'PARTIALLY_READY' || unresolvedCandidates?.length > 0)
  return {
    total, sourceCount, candidates,
    status: displayHubToken(recorded?.state?.status),
    interpretation: state ? displayHubToken(state) : 'Unavailable',
    tone: empty ? 'empty' : attention ? 'attention' : state === 'READY' ? 'ready' : 'unknown',
    label: empty ? 'No evidence returned' : needsRefresh ? 'Evidence refresh required' : attention ? 'Evidence needs review' : state === 'READY' ? 'Recorded discovery readiness' : 'Evidence readiness unavailable',
    title: empty ? 'Connect evidence before building a current view' : attention ? 'Evidence is available, but some meaning still needs a decision' : state === 'READY' ? 'Inspect the recorded readiness before progressing' : 'The current evidence readiness is not fully available',
    description: empty ? 'The selected revision read returned no evidence objects. Evidence and interpretation must be reviewed before accepted understanding changes.' : 'Evidence availability and interpretation decisions are shown separately. Snapshot completeness and ingestion progress are not supplied by these reads.',
    next: empty ? 'Add evidence' : 'Review open issues',
    hasOpenCandidates: Boolean(unresolvedCandidates?.length),
    needsRefresh,
    evidenceMessage: evidenceLoading ? 'Loading evidence summary…' : evidenceError ? 'Evidence summary could not be loaded. Refresh to retry.' : total === null ? 'Evidence object total is unavailable.' : '',
  }
}
