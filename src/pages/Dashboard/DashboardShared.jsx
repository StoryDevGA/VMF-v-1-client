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
import { Link } from '../../components/Link'
import { Status } from '../../components/Status'
import { CUSTOMER_WORKSPACE_STATES } from '../../utils/customerExperience.js'
import { getWorkspaceCardKey, projectAction } from './dashboardModel.js'

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const formatDate = (value) => {
  const parsed = Date.parse(String(value ?? ''))
  if (!Number.isFinite(parsed)) return 'Time unavailable'
  return DATE_TIME_FORMATTER.format(parsed)
}

const formatDateTimeAttribute = (value) => {
  const parsed = Date.parse(String(value ?? ''))
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined
}

export function Advisor({ card, activeWorkspaceCount }) {
  const [whyOpen, setWhyOpen] = useState(false)
  const action = card ? projectAction(card) : { to: '/app/workspaces/vmf' }
  const recommendationTitle = card ? `Continue ${card.title}` : 'Continue work'
  const recommendationCopy = card
    ? card.understandingState === CUSTOMER_WORKSPACE_STATES.UNDERSTANDING_REVIEW
      ? 'This workspace has review items waiting. Continue from the current project revision.'
      : card.evidenceStatus === CUSTOMER_WORKSPACE_STATES.EVIDENCE_VERIFY
        || card.evidenceStatus === CUSTOMER_WORKSPACE_STATES.EVIDENCE_ATTENTION
        ? 'This workspace has things to verify before you continue.'
        : 'Continue from the current project revision.'
    : 'Choose a Project Workspace to begin your next useful step.'

  return (
    <section className="customer-home__advisor" aria-labelledby="customer-home-advisor-title">
      <div className="customer-home__advisor-heading">
        <div className="customer-home__advisor-label">
          <span className="customer-home__advisor-icon" aria-hidden="true" />
          <p className="customer-home__card-kicker">Advisor recommendation</p>
        </div>
        <span>Across {activeWorkspaceCount} active workspaces</span>
      </div>
      <div className="customer-home__advisor-content">
        <div>
          <h2 id="customer-home-advisor-title">{recommendationTitle}</h2>
          <p>{recommendationCopy}</p>
        </div>
        <div className="customer-home__advisor-actions">
          <Link to={action.to} underline="none" className="customer-home__button">Continue work →</Link>
          {card ? <Link to={action.to} underline="none" className="customer-home__button customer-home__button--secondary">View review item</Link> : null}
          <button
            type="button"
            className="customer-home__text-button customer-home__why-button"
            aria-expanded={whyOpen}
            aria-controls="customer-home-advisor-explanation"
            onClick={() => setWhyOpen((previous) => !previous)}
          >
            Why this recommendation
          </button>
        </div>
      </div>
      {whyOpen ? (
        <p id="customer-home-advisor-explanation" className="customer-home__advisor-explanation">
          This recommendation is based on the current workspace stage, review items, and latest summary update.
        </p>
      ) : null}
      <dl className="customer-home__advisor-details">
        <div><dt>Current stage</dt><dd>{card?.currentStage ?? 'Not yet recorded'}</dd></div>
        <div><dt>Attention</dt><dd>{card ? card.nextAction : 'No review items'}</dd></div>
        <div><dt>Last updated</dt><dd>{formatDate(card?.updatedAt)}</dd></div>
      </dl>
    </section>
  )
}

export function WorkspaceCard({ card, recommended = false }) {
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const action = projectAction(card)
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
          <small>Updated: {formatDate(card.updatedAt)}</small>
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
          <span>{card.evidence}</span>
          {evidenceAvailable ? (
            <Link to={action.to} underline="none" className="customer-home__assurance-link">View assurance details →</Link>
          ) : null}
        </div>
      </div>
      <div className="customer-home__workspace-state">
        <Status variant="neutral" size="sm" announce={false}>{card.currentStage}</Status>
        <Status variant={card.nextAction === 'Open workspace' ? 'success' : 'warning'} size="sm" announce={false}>{card.nextAction}</Status>
        {card.statusSignal ? (
          <Status variant="neutral" size="sm" announce={false} className="customer-home__workspace-status-signal">
            {card.statusSignal}
          </Status>
        ) : null}
      </div>
      <div className="customer-home__workspace-actions">
        <Link to={action.to} underline="none" className="customer-home__button customer-home__button--secondary">Open</Link>
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
            <Link to={action.to} underline="none">Open workspace</Link>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export function AttentionSummary({ label, cards, detail, icon = MdPriorityHigh, warning = true }) {
  if (!cards.length) return null
  const firstCard = cards[0]
  const IconComponent = icon

  return (
    <div className="customer-home__attention-summary">
      <span
        className={`customer-home__attention-icon${warning ? ' customer-home__attention-icon--warning' : ''}`}
        aria-hidden="true"
      >
        <IconComponent aria-hidden="true" focusable="false" />
      </span>
      <div>
        <strong>{cards.length} {cards.length === 1 ? 'item needs' : 'items need'} attention</strong>
        <span>{firstCard.title} · {detail || label}</span>
      </div>
    </div>
  )
}

export function RecentActivity({ cards }) {
  return (
    <section className="customer-home__section customer-home__rail-section" aria-labelledby="customer-home-activity-title">
      <div className="customer-home__section-heading">
        <div>
          <h2 id="customer-home-activity-title">Recent activity</h2>
        </div>
      </div>
      {cards.length === 0 ? (
        <div className="customer-home__state">
          <Status variant="neutral" size="sm">No recent activity</Status>
          <p>Activity will appear here as workspace review and source work progresses.</p>
        </div>
      ) : (
        <ul className="customer-home__activity-list">
          {cards.map((card, index) => (
            <li key={`activity-${getWorkspaceCardKey(card, index)}`} className="customer-home__activity-item">
              <span className="customer-home__activity-icon" aria-hidden="true">
                {card.nextAction === 'Open workspace' ? (
                  <MdSubdirectoryArrowRight aria-hidden="true" focusable="false" />
                ) : card.understandingState === CUSTOMER_WORKSPACE_STATES.UNDERSTANDING_ACCEPTED ? (
                  <MdCheck aria-hidden="true" focusable="false" />
                ) : (
                  <MdDescription aria-hidden="true" focusable="false" />
                )}
              </span>
              <div>
                <strong>{card.title}</strong>
                <p>{card.nextAction} · {card.attentionGroup}</p>
              </div>
              <time dateTime={formatDateTimeAttribute(card.updatedAt)}>{formatDate(card.updatedAt)}</time>
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
