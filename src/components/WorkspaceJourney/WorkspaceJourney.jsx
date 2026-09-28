import { useId, useState } from 'react'
import { MdCheck } from 'react-icons/md'
import { Button } from '../Button'
import { Dialog } from '../Dialog'
import { Link } from '../Link'
import './WorkspaceJourney.css'

const DEFAULT_STAGES = Object.freeze([
  {
    key: 'acquire',
    label: 'Acquire',
    status: 'Unavailable',
    state: 'unknown',
    description: 'Gather and process customer context and source material.',
    to: '',
  },
  {
    key: 'review',
    label: 'Review',
    status: 'Unavailable',
    state: 'unknown',
    description: 'Inspect provenance and resolve evidence or quality findings.',
    to: '',
  },
  {
    key: 'understand',
    label: 'Understand',
    status: 'Unavailable',
    state: 'unknown',
    description: 'Generate, review and accept framework-defined business understanding.',
    to: '',
  },
  {
    key: 'create',
    label: 'Create',
    status: 'Unavailable',
    state: 'unknown',
    description: 'Produce customer outcomes using the governed workspace context.',
    to: '',
  },
  {
    key: 'publish',
    label: 'Publish',
    status: 'Unavailable',
    state: 'unknown',
    description: 'Approve and publish controlled customer-ready assets.',
    to: '',
  },
])

const JOURNEY_STATES = new Set(['complete', 'attention', 'active', 'available', 'unknown'])

export function WorkspaceJourney({
  items = DEFAULT_STAGES,
  title = 'Workspace journey',
  description = 'A guide to current progress—not a fixed sequence.',
}) {
  const [helpOpen, setHelpOpen] = useState(false)
  const id = useId().replace(/:/g, '')
  const titleId = 'workspace-journey-title-' + id
  const dialogTitleId = 'workspace-journey-help-title-' + id
  const stages = Array.isArray(items) ? items : DEFAULT_STAGES

  return (
    <section className="workspace-journey" aria-labelledby={titleId}>
      <header className="workspace-journey__header">
        <div>
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="workspace-journey__help-trigger"
          aria-haspopup="dialog"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen(true)}
        >
          How progress works
        </Button>
      </header>

      <ol className="workspace-journey__steps" aria-label="Workspace progress stages">
        {stages.map((item, index) => {
          const state = JOURNEY_STATES.has(item.state) ? item.state : 'unknown'
          const status = item.status || 'Unavailable'
          const marker = state === 'complete'
            ? <MdCheck aria-hidden="true" />
            : index + 1
          const accessibleLabel = [item.label, status, item.detail].filter(Boolean).join(': ')
          return (
            <li className={'workspace-journey__step workspace-journey__step--' + state} key={item.key || item.label}>
              {item.to ? (
                <Link
                  to={item.to}
                  className="workspace-journey__step-link"
                  aria-label={accessibleLabel}
                >
                  <span className="workspace-journey__marker" aria-hidden="true">{marker}</span>
                  <span className="workspace-journey__step-label">{item.label}</span>
                  <span className="workspace-journey__step-status">{status}</span>
                  {item.detail ? <span className="workspace-journey__step-detail">{item.detail}</span> : null}
                </Link>
              ) : (
                <span
                  className="workspace-journey__step-link"
                  aria-label={accessibleLabel}
                  aria-disabled="true"
                >
                <span className="workspace-journey__marker" aria-hidden="true">{marker}</span>
                <span className="workspace-journey__step-label">{item.label}</span>
                <span className="workspace-journey__step-status">{status}</span>
                {item.detail ? <span className="workspace-journey__step-detail">{item.detail}</span> : null}
                </span>
              )}
            </li>
          )
        })}
      </ol>

      <Dialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        size="lg"
        className="workspace-journey__dialog"
        aria-labelledby={dialogTitleId}
      >
        <Dialog.Header>
          <div className="workspace-journey__dialog-heading">
            <small>Workspace journey</small>
            <h2 id={dialogTitleId}>How progress works</h2>
          </div>
        </Dialog.Header>
        <Dialog.Body>
          <p className="workspace-journey__dialog-intro">
            The journey summarises the selected revision’s governed state. It is guidance, not a rigid wizard:
            users may move between available workspace areas while review items and gaps remain visible.
          </p>
          <ol className="workspace-journey__dialog-stages">
            {stages.map((item, index) => {
              const state = JOURNEY_STATES.has(item.state) ? item.state : 'unknown'
              return (
                <li className={'workspace-journey__dialog-stage workspace-journey__dialog-stage--' + state} key={item.key || item.label}>
                  <span className="workspace-journey__dialog-marker" aria-hidden="true">
                    {state === 'complete' ? <MdCheck /> : index + 1}
                  </span>
                  <div className="workspace-journey__dialog-stage-copy">
                    <strong>{item.label}</strong>
                    <p>{item.description}</p>
                    {item.detail ? <p>{item.detail}</p> : null}
                  </div>
                  <span className="workspace-journey__dialog-stage-status">{item.status || 'Unavailable'}</span>
                </li>
              )
            })}
          </ol>
          <aside className="workspace-journey__legend">
            <strong>How to read the states</strong>
            <p>Green shows completed or accepted work, amber identifies attention required, and neutral stages are available but not yet complete. Progress recalculates as governed actions occur.</p>
            {stages.some((item) => item.state === 'unknown') ? (
              <p>Unavailable means this workspace summary does not provide the stage status.</p>
            ) : null}
          </aside>
        </Dialog.Body>
        <Dialog.Footer>
          <Link to="/help" target="_blank" rel="noopener noreferrer" className="workspace-journey__dialog-help">
            Open Help Center ↗
          </Link>
          <Button type="button" variant="ghost" size="sm" className="workspace-journey__dialog-close" onClick={() => setHelpOpen(false)}>
            Close
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default WorkspaceJourney
