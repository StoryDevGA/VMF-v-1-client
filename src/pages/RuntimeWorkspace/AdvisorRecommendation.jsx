import { useState } from 'react'
import { MdArrowForward } from 'react-icons/md'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Link } from '../../components/Link'
import './AdvisorRecommendation.css'

export function AdvisorRecommendation({
  recommendation = null,
  revisionLabel = '',
  selectedRevisionId = '',
  workspaceName = '',
  workspaceRuntimeInstanceId = '',
}) {
  const [whyOpen, setWhyOpen] = useState(false)
  const selectedContext = [workspaceName, revisionLabel].filter(Boolean).join(' · ')
  const explanationContext = [workspaceName, revisionLabel.replace(/\s+only$/i, '')].filter(Boolean).join(' · ')
  const rawActionHref = recommendation?.actionHref || '/app/intelligence'
  const actionLabel = recommendation?.actionLabel || 'Review Intelligence'
  const [actionPathAndQuery, actionHash = ''] = rawActionHref.split('#', 2)
  const [actionPath, actionSearch = ''] = actionPathAndQuery.split('?', 2)
  const actionQuery = new URLSearchParams(actionSearch)
  const hasNavigationContext = Boolean(workspaceRuntimeInstanceId && selectedRevisionId)
  if (hasNavigationContext) {
    actionQuery.set('runtimeInstanceId', workspaceRuntimeInstanceId)
    actionQuery.set('revisionId', selectedRevisionId)
  }
  const actionHref = hasNavigationContext
    ? `${actionPath}?${actionQuery.toString()}${actionHash ? `#${actionHash}` : ''}`
    : ''

  return (
    <section className="runtime-workspace__advisor" aria-label="Advisor recommended next action">
      <span className="runtime-workspace__advisor-mark" aria-hidden="true">A</span>
      <div className="runtime-workspace__advisor-copy">
        <div className="runtime-workspace__advisor-kicker">
          <span>Advisor · Recommended next action</span>
          {selectedContext ? <small>{selectedContext}</small> : null}
        </div>
        <h2>
          {recommendation?.title || 'No recommended next action is projected for this workspace revision.'}
        </h2>
        <p>
          {recommendation?.summary
            || 'Advisor recommendations appear when this workspace summary includes a review finding, evidence gap, or incomplete required section.'}
        </p>
        <div className="runtime-workspace__advisor-actions">
          {actionHref ? (
            <Link to={actionHref} className="runtime-workspace__advisor-cta">
              {actionLabel}
              <MdArrowForward aria-hidden="true" />
            </Link>
          ) : (
            <span className="runtime-workspace__advisor-cta runtime-workspace__advisor-cta--disabled" aria-disabled="true">
              {actionLabel}
              <MdArrowForward aria-hidden="true" />
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="runtime-workspace__advisor-why"
            aria-haspopup="dialog"
            aria-expanded={whyOpen}
            onClick={() => setWhyOpen(true)}
          >
            Why this recommendation
          </Button>
        </div>
      </div>
      <aside className="runtime-workspace__advisor-impact" aria-label="Recommendation impact">
        <small>Affected</small>
        <strong>{recommendation?.affectedLabel || 'No affected areas projected'}</strong>
        {recommendation?.affectedItems?.length > 0 ? (
          <ul aria-label="Affected domains or sections">
            {recommendation.affectedItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        ) : null}
      </aside>
      <Dialog
        open={whyOpen}
        onClose={() => setWhyOpen(false)}
        size="lg"
        className="runtime-workspace__advisor-dialog"
        aria-labelledby="runtime-workspace-advisor-dialog-title"
      >
        <Dialog.Header>
          <div className="runtime-workspace__advisor-dialog-heading">
            <small>Why Advisor recommends this</small>
            <h2 id="runtime-workspace-advisor-dialog-title">Highest-priority action in the selected workspace</h2>
            <p>Advisor evaluated the available governed summary for {explanationContext || 'this workspace revision'}.</p>
          </div>
        </Dialog.Header>
        <Dialog.Body>
          <div className={'runtime-workspace__advisor-dialog-grid' + (recommendation ? ' runtime-workspace__advisor-dialog-grid--recommended' : '')}>
            <article>
              <span>State considered</span>
              <strong>{recommendation?.stateSummary || 'No recommendation state is projected'}</strong>
              <p>{recommendation?.stateDetail || 'The bounded workspace summary contains no current finding to prioritize.'}</p>
            </article>
            <article>
              <span>Downstream impact</span>
              <strong>{recommendation?.impactSummary || 'No impact is projected'}</strong>
              <p>{recommendation?.impactDetail || 'Review the workspace areas when their governed summaries become available.'}</p>
            </article>
            <article>
              <span>Recommended action</span>
              <strong>{recommendation?.destinationLabel || 'No destination recommended'}</strong>
              <p>{recommendation ? 'Advisor routes to the relevant workspace area. An authorised user completes the review.' : 'No action is inferred from missing data.'}</p>
            </article>
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <div className="runtime-workspace__advisor-boundary">
            <span aria-hidden="true">A</span>
            <div>
              <strong>Recommendation only</strong>
              <p>Advisor does not adjudicate contradictions, accept evidence, approve understanding, or publish outcomes.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setWhyOpen(false)}>
            Close
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default AdvisorRecommendation
