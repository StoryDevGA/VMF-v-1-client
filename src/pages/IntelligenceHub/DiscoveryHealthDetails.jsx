import { displayHubToken } from './intelligenceHubModel.js'
import { discoveryHealthLabel } from './discoveryHealthModel.js'

export default function DiscoveryHealthDetails({ model, loading }) {
  const assessment = !loading && model?.available ? model.assessment : null
  const unavailable = { ASSESSMENT_MISSING: 'No recorded Discovery Health assessment is supplied.',
    ASSESSMENT_INVALID: 'The recorded assessment cannot be verified.', REFRESH_MARKER_INVALID: 'The recorded refresh markers conflict or cannot be verified.' }
  return <section aria-label="Recorded Discovery Health assessment">
    <p><strong>{discoveryHealthLabel(model, loading)}</strong></p>
    {!assessment ? <p role="status">{loading ? 'Loading the scoped Discovery Health read…' : `${unavailable[model?.reason] || 'The current scoped Discovery Health read is unavailable.'} Refresh this view to retry.`}</p> : <>
      <p>{model.freshness === 'STALE' ? 'Evidence refresh is recorded as required; this assessment is stale.'
        : model.freshness === 'UNKNOWN' ? 'Evidence refresh status is not recorded.' : 'No evidence refresh marker is recorded as required. This does not verify the assessment’s input currency.'}</p>
      {assessment.blockerReasons.length ? <div><strong>Recorded blockers</strong><ul>{assessment.blockerReasons.map(reason => <li key={reason}>{displayHubToken(reason)}</li>)}</ul></div> : <p>No blockers are listed in the recorded assessment.</p>}
      {assessment.warningReasons.length ? <div><strong>Recorded qualifications</strong><ul>{assessment.warningReasons.map(reason => <li key={reason}>{displayHubToken(reason)}</li>)}</ul></div> : null}
      <p>Assessment time: {assessment.assessedAt || 'Unavailable'} · Read time: {model.readAt}</p>
      <p>Assessment input basis is unavailable. This Discovery diagnostic does not establish Review Completion, certification, human approval or readiness for every output.</p>
    </>}
  </section>
}
