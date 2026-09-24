import { useState } from 'react'
import {
  MdCheck,
  MdDescription,
  MdExpandMore,
  MdGridView,
  MdPriorityHigh,
  MdSubdirectoryArrowRight,
} from 'react-icons/md'
import { RiCheckboxBlankCircleLine, RiHexagonLine } from 'react-icons/ri'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Link } from '../../components/Link'
import { Status } from '../../components/Status'
import { TableDateTime } from '../../components/TableDateTime/TableDateTime.jsx'
import { CUSTOMER_WORKSPACE_STATES } from '../../utils/customerExperience.js'
import { projectAction } from './dashboardModel.js'

const formatRecentActivityTitle = (activity = {}) => {
  const summary = String(activity.summary ?? '').trim()
  const shortened = summary.replace(/\s+for\s+value-narrative-.+$/i, '').trim()
  return shortened || 'Workspace activity'
}

const getRecentActivityCategory = (activity = {}) => {
  const value = `${activity.action ?? ''} ${activity.summary ?? ''}`.toUpperCase()
  if (value.includes('OUTPUT') || value.includes('ASSET')) return 'Customer output'
  if (value.includes('CERTIFICATE') || value.includes('SNAPSHOT')) return 'Certificate'
  if (value.includes('REVIEW') || value.includes('QUALITY') || value.includes('TRUTH')) return 'Review'
  if (value.includes('SOURCE') || value.includes('EVIDENCE')) return 'Source'
  return 'Workspace activity'
}

export function Advisor({ card, activeWorkspaceCount, reviewItemCount = 0 }) {
  const [whyOpen, setWhyOpen] = useState(false)
  const action = card ? projectAction(card) : { to: '/app/workspaces/vmf' }
  const reviewItemTo = card && card.nextAction !== 'Open workspace'
    ? '/app/intelligence?view=quality'
    : action.to
  const recommendationTitle = card ? `Continue ${card.title}` : 'Continue work'
  const recommendationCopy = card
    ? card.isLocked
      ? 'This workspace is locked and available in read-only form.'
      : 'This is your most relevant activity across all workspace instances. It is not affected by the Project Workspaces filter below.'
    : 'Choose a Project Workspace to begin your next useful step.'
  const prioritySignal = card?.isLocked
    ? 'Read-only workspace'
    : reviewItemCount > 0
      ? `${reviewItemCount} review ${reviewItemCount === 1 ? 'item' : 'items'} waiting`
      : 'No review items waiting'

  return (
    <section className="customer-home__advisor" aria-labelledby="customer-home-advisor-title">
      <div className="customer-home__advisor-heading">
        <div className="customer-home__advisor-label">
          <span className="customer-home__advisor-icon" aria-hidden="true" />
          <p className="customer-home__card-kicker">Advisor recommendation</p>
        </div>
        <span>Across all {activeWorkspaceCount} {activeWorkspaceCount === 1 ? 'workspace' : 'workspaces'}</span>
      </div>
      <div className="customer-home__advisor-content">
        <div>
          <h2 id="customer-home-advisor-title">{recommendationTitle}</h2>
          <p>{recommendationCopy}</p>
        </div>
        <div className="customer-home__advisor-actions">
          <Link to={action.to} state={{ from: '/app/dashboard' }} underline="none" className="customer-home__button">Continue work →</Link>
          {card && !card.isLocked && card.reviewItemCount > 0 ? <Link to={reviewItemTo} underline="none" className="customer-home__button customer-home__button--secondary">View review item</Link> : null}
          <button
            type="button"
            className="customer-home__text-button customer-home__why-button"
            aria-expanded={whyOpen}
            aria-haspopup="dialog"
            onClick={() => setWhyOpen((previous) => !previous)}
          >
            Why this recommendation
          </button>
        </div>
      </div>
      <Dialog
        open={whyOpen}
        onClose={() => setWhyOpen(false)}
        size="xl"
        className="customer-home__recommendation-dialog"
        aria-labelledby="customer-home-recommendation-title"
      >
        <Dialog.Header className="customer-home__recommendation-header">
          <span className="customer-home__recommendation-kicker">Why Advisor recommends this</span>
          <h2 id="customer-home-recommendation-title">Highest-priority resumable work across this customer</h2>
          <p>Advisor evaluates the whole workspace list, independent of the Project Workspaces filter.</p>
        </Dialog.Header>
        <Dialog.Body className="customer-home__recommendation-body">
          <div className="customer-home__recommendation-signal">
            <span>State considered</span>
            <strong>{activeWorkspaceCount} workspace {activeWorkspaceCount === 1 ? 'instance' : 'instances'}</strong>
            <p>Active, draft, published and locked workspaces remain part of the recommendation scan.</p>
          </div>
          <div className="customer-home__recommendation-signal">
            <span>Priority signal</span>
            <strong>{prioritySignal}</strong>
            <p>{card?.isLocked
              ? 'This workspace is locked and can only be inspected in read-only form.'
              : reviewItemCount > 0
                ? `The open ${reviewItemCount === 1 ? 'item can' : 'items can'} constrain accepted understanding and later customer outputs.`
                : 'Advisor selects the next available customer action across workspaces.'}</p>
          </div>
          <div className="customer-home__recommendation-signal">
            <span>Recommended action</span>
            <strong>{card?.isLocked ? 'Inspect read-only' : 'Continue or inspect'}</strong>
            <p>{card?.isLocked
              ? 'Advisor can route you to the locked workspace in read-only mode.'
              : 'Advisor can route you to the workspace or review; it cannot complete the review.'}</p>
          </div>
        </Dialog.Body>
        <Dialog.Footer className="customer-home__recommendation-footer">
          <div className="customer-home__recommendation-note">
            <span aria-hidden="true">A</span>
            <p><strong>Recommendation only</strong><br />{card?.isLocked
              ? 'Advisor cannot change a locked workspace or publish outcomes.'
              : 'Advisor never accepts evidence, resolves findings, approves understanding or publishes outcomes.'}</p>
          </div>
          <Button variant="primary" className="customer-home__recommendation-close" onClick={() => setWhyOpen(false)}>Close</Button>
        </Dialog.Footer>
      </Dialog>
      <dl className="customer-home__advisor-details">
        <div><dt>Current stage</dt><dd className="customer-home__current-stage">{card?.currentStage ?? 'Not yet recorded'}</dd></div>
        <div><dt>Attention</dt><dd className="customer-home__attention-value">{reviewItemCount === 0 ? 'No items' : `${reviewItemCount} ${reviewItemCount === 1 ? 'review item' : 'review items'}`}</dd></div>
        <div><dt>Last updated</dt><dd><TableDateTime value={card?.updatedAt} fallback="Time unavailable" className="customer-home__date-time" /></dd></div>
      </dl>
    </section>
  )
}

export function WorkspaceCard({ card, recommended = false }) {
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const action = projectAction(card)
  const hasRuntimeId = Boolean(card.id)
  const assuranceTo = hasRuntimeId
    ? `/app/runtime/${encodeURIComponent(String(card.id))}/assurance`
    : '/app/workspaces/vmf'
  const activityTo = hasRuntimeId
    ? `/app/activity?runtimeInstanceId=${encodeURIComponent(String(card.id))}`
    : '/app/activity'
  const understandingAccepted = card.understandingState === CUSTOMER_WORKSPACE_STATES.UNDERSTANDING_ACCEPTED
  const evidenceAvailable = card.evidenceStatus !== CUSTOMER_WORKSPACE_STATES.EVIDENCE_UNRECORDED

  return (
    <article className={`customer-home__workspace-row${recommended ? ' customer-home__workspace-row--recommended' : ''}`}>
      <div className="customer-home__workspace-identity">
        <span
          className={`customer-home__workspace-mark${recommended ? ' customer-home__workspace-mark--certificate' : ' customer-home__workspace-mark--icon'}`}
          aria-hidden="true"
        >
          {recommended ? 'L3' : <MdGridView aria-hidden="true" focusable="false" />}
        </span>
        <div>
          <h3>{card.title}</h3>
          {recommended ? <span className="customer-home__recommended-badge">Recommended</span> : null}
          <p>{card.workspaceType}</p>
          <small>Updated: <TableDateTime value={card.updatedAt} fallback="Time unavailable" className="customer-home__date-time" /></small>
        </div>
      </div>
      <div className="customer-home__workspace-understanding">
        <span className="customer-home__workspace-understanding-icon" aria-hidden="true">
          {understandingAccepted
            ? <RiHexagonLine aria-hidden="true" focusable="false" />
            : <RiCheckboxBlankCircleLine aria-hidden="true" focusable="false" />}
        </span>
        <div className="customer-home__workspace-understanding-copy">
          <strong>{card.understanding}</strong>
          {!card.isLocked ? <span>{card.evidence}</span> : null}
          {evidenceAvailable || card.isLocked ? (
            <Link to={assuranceTo} state={{ from: '/app/dashboard' }} underline="none" className="customer-home__assurance-link">View assurance details →</Link>
          ) : null}
        </div>
      </div>
      <div className="customer-home__workspace-state">
        <Status variant="neutral" size="sm" announce={false}>{card.currentStage}</Status>
        {card.isLocked ? null : <Status variant={card.nextAction === 'Open workspace' ? 'success' : 'warning'} size="sm" announce={false}>{card.nextAction}</Status>}
        {!card.isLocked && card.statusSignal ? (
          <Status variant="neutral" size="sm" announce={false} className="customer-home__workspace-status-signal">
            {card.statusSignal}
          </Status>
        ) : null}
      </div>
      <div className="customer-home__workspace-actions">
        {!card.isLocked ? <span className="customer-home__review-count">{card.reviewItemCount ? `${card.reviewItemCount} ${card.reviewItemCount === 1 ? 'review item' : 'review items'}` : 'No items'}</span> : null}
        <Link to={action.to} state={{ from: '/app/dashboard' }} underline="none" className="customer-home__button customer-home__button--secondary">Open</Link>
        <button
          type="button"
          className="customer-home__workspace-menu-toggle"
          aria-label={`Show actions for ${card.title}`}
          aria-expanded={isActionsOpen}
          onClick={() => setIsActionsOpen((previous) => !previous)}
        >
          <MdExpandMore aria-hidden="true" focusable="false" />
        </button>
        {isActionsOpen ? (
          <div className="customer-home__workspace-menu">
            <Link to={action.to} state={{ from: '/app/dashboard' }} underline="none">Open workspace</Link>
            <Link to={activityTo} underline="none">View activity</Link>
            <Link to={assuranceTo} state={{ from: '/app/dashboard' }} underline="none">View assurance details</Link>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export function AttentionSummary({ label, cards, detail, icon = MdPriorityHigh }) {
  const IconComponent = icon

  if (!cards.length) {
    return (
      <div className="customer-home__attention-summary customer-home__attention-summary--empty">
        <span className="customer-home__attention-icon" aria-hidden="true">
          <IconComponent aria-hidden="true" focusable="false" />
        </span>
        <div>
          <strong>{label}</strong>
          <span>No items</span>
        </div>
      </div>
    )
  }
  const firstCard = cards[0]

  return (
    <div className="customer-home__attention-summary">
      <span className="customer-home__attention-icon" aria-hidden="true">
        <IconComponent aria-hidden="true" focusable="false" />
      </span>
      <div>
        <strong className="customer-home__attention-count">{cards.length} {cards.length === 1 ? 'item needs' : 'items need'} attention</strong>
        <span>{firstCard.title} · {detail || label}</span>
      </div>
    </div>
  )
}

export function RecentActivity({ activities = [], isLoading = false }) {
  return (
    <section className="customer-home__section customer-home__rail-section" aria-labelledby="customer-home-activity-title">
      <div className="customer-home__section-heading">
        <div>
          <h2 id="customer-home-activity-title">Recent activity</h2>
        </div>
      </div>
      {isLoading ? (
        <div className="customer-home__state" role="status"><Status variant="neutral" size="sm">Loading recent activity…</Status></div>
      ) : activities.length === 0 ? (
        <div className="customer-home__state">
          <Status variant="neutral" size="sm">No recent activity</Status>
          <p>Activity will appear here as workspace review and source work progresses.</p>
        </div>
      ) : (
        <ul className="customer-home__activity-list">
          {activities.slice(0, 5).map((activity, index) => (
            <li key={`activity-${activity.id || activity.runtimeInstanceId || index}`} className="customer-home__activity-item">
              <span className="customer-home__activity-icon" aria-hidden="true">
                {activity.action === 'RUNTIME_INSTANCE_CREATED' ? (
                  <MdSubdirectoryArrowRight aria-hidden="true" focusable="false" />
                ) : activity.action === 'RUNTIME_STATE_MUTATED' ? (
                  <MdCheck aria-hidden="true" focusable="false" />
                ) : (
                  <MdDescription aria-hidden="true" focusable="false" />
                )}
              </span>
              <div>
                <strong>{formatRecentActivityTitle(activity)}</strong>
                <p>{activity.runtimeName || getRecentActivityCategory(activity)}</p>
              </div>
              <TableDateTime value={activity.occurredAt} fallback="Time unavailable" className="customer-home__date-time" />
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/app/activity"
        underline="none"
        className="customer-home__action customer-home__rail-action"
        aria-label="View all activity"
      >
        View all activity →
      </Link>
    </section>
  )
}
