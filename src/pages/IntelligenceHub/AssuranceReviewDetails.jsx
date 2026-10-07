import { displayHubToken } from './intelligenceHubModel.js'

function Receipt({ receipt }) {
  return <dl className="intelligence-hub__report-basis">{[['Receipt', receipt.receiptId], ['Status', receipt.currency === 'CURRENT' ? 'Current' : 'Stale — reassessment required'], ['Completed at', receipt.completedAt], ['Reviewer', receipt.actorUserId], ['Recorded authority', receipt.authority], ['Rationale', receipt.rationale], ['Decision population hash', receipt.populationHash], ['Decision policy', receipt.populationPolicy], ['Observed state at completion', receipt.observedStateVersion], ['Recorded audit anchor', receipt.auditId], ['Audit signature version', receipt.auditSignatureVersion]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}
export default function AssuranceReviewDetails({ review, loading }) {
  return <section aria-label="Report Review Completion"><header><h4>Review Completion receipt</h4><small>{loading ? 'Loading…' : review ? 'Recorded current read' : 'Unavailable'}</small></header>{review ? <>
    <p>{review.population.pendingEvidence} evidence decisions and {review.population.pendingFindings} finding decisions outstanding across {review.population.decisionCount} decisions. Reason: {displayHubToken(review.population.reason)}.</p>
    <p>{review.population.confirmedReadinessBlockers} confirmed contradiction decisions remain independent readiness blockers. A disposed decision does not approve publication or resolve independent impact.</p>
    <dl className="intelligence-hub__report-basis">{[['Current population hash', review.population.hash], ['Current review state version', review.stateVersion], ['Review read time', review.readAt]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {review.latestReceipt ? <Receipt receipt={review.latestReceipt} /> : <p>No Review Completion receipt is recorded for this revision.</p>}
    <details><summary>Inspect Review Completion history · {review.history.records.length} recorded receipts · {review.history.completeness === 'PARTIAL' ? 'Partial — more history exists' : 'Complete returned receipt history'}</summary>{review.history.records.map(receipt => <article key={receipt.receiptId}><Receipt receipt={receipt} /></article>)}</details>
  </> : <p>{loading ? 'Checking the current scoped review population and receipts…' : 'A current matching Review Completion read is unavailable. Refresh this report to retry.'}</p>}<p>This evidence/contradiction completion is separate from named publication authorisation, exception disclosure, Truth Quality certification and complete four-type Quality delivery. Audit identifiers are recorded anchors; this report does not verify audit signatures.</p></section>
}
