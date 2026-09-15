import { useMemo, useState } from 'react'
import { Card } from '../../components/Card'
import { Link } from '../../components/Link'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useListRuntimeInstancesQuery } from '../../store/api/runtimeInstanceApi.js'
import {
  buildCustomerHomeWorkspaceCard,
  CUSTOMER_EXPERIENCE,
  resolveCustomerExperience,
} from '../../utils/customerExperience.js'
import './Dashboard.css'

const EXPERIENCE_COPY = {
  [CUSTOMER_EXPERIENCE.SIGNAL]: {
    title: 'Signal Home',
    eyebrow: 'Signal StoryLineOS',
    description: 'Choose a focused Signal product: analyse a website or improve a document-backed outcome.',
    assuranceTitle: 'Evidence assurance',
    assuranceCopy: 'Evidence status is shown as review items and things to verify so you can see what still needs attention.',
  },
  [CUSTOMER_EXPERIENCE.CORE]: {
    title: 'Customer Workspace',
    eyebrow: 'Customer Home',
    description: 'Pick up where you left off or open a workspace.',
    assuranceTitle: 'Intelligence assurance',
    assuranceCopy: 'Intelligence assurance keeps the current workspace view connected to its source basis and review items.',
  },
}

const formatCount = (value) => `${value} ${value === 1 ? 'workspace' : 'workspaces'}`

const projectAction = (card) => ({
  label: card.nextAction,
  to: card.id ? `/app/runtime/${encodeURIComponent(String(card.id))}` : '/app/workspaces/vmf',
})

const formatActivityTime = (value) => {
  const parsed = Date.parse(String(value ?? ''))
  if (!Number.isFinite(parsed)) return 'Time unavailable'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function AccessResolutionState() {
  return (
    <main className="customer-home customer-home--state" aria-labelledby="customer-home-access-title">
      <section className="customer-home__state" role="status">
        <Status variant="warning" size="lg" showIcon>Workspace access needs confirmation</Status>
        <h1 id="customer-home-access-title">We could not confirm this customer workspace</h1>
        <p>Select an accessible customer again or sign in again before opening customer work.</p>
      </section>
    </main>
  )
}

function SignalHome({ copy }) {
  return (
    <>
      <section className="customer-home__hero" aria-labelledby="customer-home-title">
        <div>
          <p className="customer-home__eyebrow">{copy.eyebrow}</p>
          <h1 id="customer-home-title">{copy.title}</h1>
          <p className="customer-home__description">{copy.description}</p>
        </div>
      </section>

      <section className="customer-home__signal-workspace" aria-labelledby="signal-start-title">
        <div className="customer-home__signal-intro">
          <p className="customer-home__eyebrow">Signal workspace</p>
          <h2 id="signal-start-title">What would you like to improve today?</h2>
          <p>Start with a website or a document. Each route is deliberately bounded, credit-aware, and designed to show the value of StoryLineOS without exposing the full workspace.</p>
        </div>
        <aside className="customer-home__credit-panel" aria-label="Available Signal credits">
          <p className="customer-home__card-kicker">Available credits</p>
          <div className="customer-home__credit-balance">
            <div><strong>—</strong><span>Document improvement</span></div>
            <div><strong>—</strong><span>Website analysis</span></div>
          </div>
          <p className="customer-home__credit-panel-copy">Credits are separate for each Signal product. No credit is consumed until approval or final report creation.</p>
          <Link to="/app/credits" underline="none" className="customer-home__button">Request credits</Link>
        </aside>
        <div className="customer-home__journeys">
          <Card className="customer-home__journey" variant="outlined">
            <Card.Body>
              <p className="customer-home__card-kicker">WA Website analysis</p>
              <h3>Analyse a customer website</h3>
              <p>Enter one public URL, usually the homepage. StoryLineOS reviews what the site appears to say, where the message is weak, and what should improve first.</p>
              <ul className="customer-home__journey-list">
                <li>One URL as the source basis</li>
                <li>Framework-led analysis preview</li>
                <li>Final website recommendation report</li>
              </ul>
              <Link to="/app/website-analysis" underline="none" className="customer-home__button">Start Website Analysis →</Link>
            </Card.Body>
          </Card>
          <Card className="customer-home__journey" variant="outlined">
            <Card.Body>
              <p className="customer-home__card-kicker">DI Document improvement</p>
              <h3>Improve one source document</h3>
              <p>Upload or select one document, lock it as the evidence basis, then use Conversation to create a governed customer-ready outcome.</p>
              <ul className="customer-home__journey-list">
                <li>One uploaded document as the source basis</li>
                <li>Limitations accepted before generation</li>
                <li>Outcome saved into the same Assets library</li>
              </ul>
              <Link to="/app/document-improvement" underline="none" className="customer-home__button">Start Document Improvement →</Link>
            </Card.Body>
          </Card>
        </div>
      </section>
    </>
  )
}

const formatWorkspaceDate = (value) => {
  const parsed = Date.parse(String(value ?? ''))
  if (!Number.isFinite(parsed)) return 'Time unavailable'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function Advisor({ card, activeWorkspaceCount }) {
  const [whyOpen, setWhyOpen] = useState(false)
  const action = card ? projectAction(card) : { to: '/app/workspaces/vmf' }

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
          <h2 id="customer-home-advisor-title">{card?.title ?? 'Continue work'}</h2>
          <p>
            {card
              ? `The next useful step is in ${card.title}.`
              : 'Choose a Project Workspace to begin your next useful step.'}
          </p>
        </div>
        <div className="customer-home__advisor-actions">
          <Link to={action.to} underline="none" className="customer-home__button">Continue work →</Link>
          {card ? <Link to={action.to} underline="none" className="customer-home__button customer-home__button--secondary">View review item</Link> : null}
          <button
            type="button"
            className="customer-home__text-button customer-home__why-button"
            aria-expanded={whyOpen}
            onClick={() => setWhyOpen((previous) => !previous)}
          >
            Why this recommendation
          </button>
        </div>
      </div>
      {whyOpen ? (
        <p className="customer-home__advisor-explanation">
          This recommendation is based on the current workspace stage, review items, and latest summary update.
        </p>
      ) : null}
      <dl className="customer-home__advisor-details">
        <div><dt>Current stage</dt><dd>{card?.currentStage ?? 'Not yet recorded'}</dd></div>
        <div><dt>Attention</dt><dd>{card ? card.nextAction : 'No review items'}</dd></div>
        <div><dt>Last updated</dt><dd>{formatWorkspaceDate(card?.updatedAt)}</dd></div>
      </dl>
    </section>
  )
}

function WorkspaceCard({ card, recommended = false }) {
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const action = projectAction(card)
  return (
    <article className={`customer-home__workspace-row${recommended ? ' customer-home__workspace-row--recommended' : ''}`}>
      <div className="customer-home__workspace-identity">
        <span className="customer-home__workspace-mark" aria-hidden="true">{card.currentStage.slice(0, 2)}</span>
        <div>
          <h3>{card.title}</h3>
          {recommended ? <span className="customer-home__recommended-badge">Recommended</span> : null}
          <p>Value Narrative workspace</p>
          <small>Updated: {formatWorkspaceDate(card.updatedAt)}</small>
        </div>
      </div>
      <div className="customer-home__workspace-understanding">
        <strong>{card.understanding}</strong>
        <span>{card.evidence || 'Assurance not yet available'}</span>
        {card.evidence && !/not yet available/i.test(card.evidence) && !/not yet recorded/i.test(card.evidence) ? (
          <Link to={action.to} underline="none" className="customer-home__assurance-link">View assurance details →</Link>
        ) : null}
      </div>
      <div className="customer-home__workspace-state">
        <Status variant={card.attentionGroup === 'Needs your input' ? 'warning' : 'info'} size="sm">{card.currentStage}</Status>
        <Status variant={card.nextAction === 'Open workspace' ? 'success' : 'warning'} size="sm">{card.nextAction}</Status>
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
          <span aria-hidden="true">⌄</span>
        </button>
        {isActionsOpen ? (
          <div className="customer-home__workspace-menu" role="menu">
            <Link to={action.to} underline="none" role="menuitem">Open workspace</Link>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function AttentionSummary({ label, cards, detail, icon = '!' }) {
  if (!cards.length) return null
  const firstCard = cards[0]

  return (
    <div className="customer-home__attention-summary">
      <span
        className={`customer-home__attention-icon${icon === '!' ? ' customer-home__attention-icon--warning' : ''}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div>
        <strong>{cards.length === 1 ? '1 review item' : `${cards.length} items need attention`}</strong>
        <span>{firstCard.title} · {detail || label}</span>
      </div>
    </div>
  )
}

function RecentActivity({ cards }) {
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
          {cards.map((card) => (
            <li key={`activity-${card.id}`} className="customer-home__activity-item">
              <span className="customer-home__activity-icon" aria-hidden="true">
                {card.nextAction === 'Open workspace' ? '↪' : card.understanding === 'Understanding accepted' ? '✓' : '▧'}
              </span>
              <div>
                <strong>{card.title}</strong>
                <p>{card.nextAction} · {card.attentionGroup}</p>
              </div>
              <time dateTime={card.updatedAt || undefined}>{formatActivityTime(card.updatedAt)}</time>
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

function CoreHome({ copy, customerId, tenantId, hasVmfViewPermission, greeting }) {
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const [workspaceFilter, setWorkspaceFilter] = useState('active')
  const runtimeListQuery = useListRuntimeInstancesQuery(
    {
      customerId,
      tenantId,
      runtimeType: 'VALUE_NARRATIVE',
      page: 1,
      pageSize: 6,
    },
    {
      skip: !customerId || !tenantId || !hasVmfViewPermission,
    },
  )
  const workspaceCards = useMemo(
    () => (runtimeListQuery.data?.data ?? []).map(buildCustomerHomeWorkspaceCard),
    [runtimeListQuery.data],
  )
  const attentionGroups = useMemo(() => ({
    'Needs your input': workspaceCards.filter((card) => card.attentionGroup === 'Needs your input'),
    'StoryLineOS is working on': workspaceCards.filter((card) => card.attentionGroup === 'StoryLineOS is working on'),
    'Things to verify': workspaceCards.filter((card) => card.attentionGroup === 'Things to verify'),
  }), [workspaceCards])
  const advisorCard = useMemo(
    () => workspaceCards.find((card) => card.attentionGroup === 'Needs your input')
      ?? workspaceCards.find((card) => card.attentionGroup === 'Things to verify')
      ?? workspaceCards[0]
      ?? null,
    [workspaceCards],
  )
  const filteredWorkspaceCards = useMemo(() => {
    const query = workspaceSearch.trim().toLowerCase()
    return workspaceCards.filter((card) => {
      const matchesSearch = !query || `${card.title} ${card.businessObjective}`.toLowerCase().includes(query)
      const matchesFilter = workspaceFilter === 'all' || card.status.toUpperCase() !== 'ARCHIVED'
      return matchesSearch && matchesFilter
    })
  }, [workspaceCards, workspaceFilter, workspaceSearch])

  return (
    <>
      <section className="customer-home__hero" aria-labelledby="customer-home-title">
        <div>
          <p className="customer-home__eyebrow">{copy.eyebrow}</p>
          <h1 id="customer-home-title">{copy.title}</h1>
          <p className="customer-home__description">
            {greeting ? `${greeting} ${copy.description}` : copy.description}
          </p>
        </div>
        <div className="customer-home__hero-actions">
          <Link to="/app/workspaces/vmf" underline="none" className="customer-home__button">＋ Start new workspace</Link>
        </div>
      </section>

      <div className="customer-home__core-layout">
        <div className="customer-home__core-primary">
          <Advisor card={advisorCard} activeWorkspaceCount={workspaceCards.length} />

          <section className="customer-home__section" aria-labelledby="customer-home-workspaces-title">
            <div className="customer-home__section-heading">
              <div>
                <h2 id="customer-home-workspaces-title">Project Workspaces</h2>
                <p className="customer-home__section-description">One workspace for each customer outcome you are working towards.</p>
              </div>
              <div className="customer-home__workspace-tools">
                <label className="customer-home__search">
                  <span className="sr-only">Search Project Workspaces</span>
                  <span className="customer-home__search-icon" aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    value={workspaceSearch}
                    onChange={(event) => setWorkspaceSearch(event.target.value)}
                    placeholder="Search workspaces"
                    aria-label="Search Project Workspaces"
                  />
                </label>
                <div className="customer-home__workspace-filter" aria-label="Workspace status filter">
                  <button type="button" aria-pressed={workspaceFilter === 'active'} className={workspaceFilter === 'active' ? 'is-active' : ''} onClick={() => setWorkspaceFilter('active')}>Active</button>
                  <button type="button" aria-pressed={workspaceFilter === 'all'} className={workspaceFilter === 'all' ? 'is-active' : ''} onClick={() => setWorkspaceFilter('all')}>All</button>
                </div>
              </div>
            </div>

            {runtimeListQuery.isLoading ? (
              <div className="customer-home__state" role="status"><Spinner size="lg" /><p>Loading workspace summaries…</p></div>
            ) : runtimeListQuery.error ? (
              <div className="customer-home__state" role="alert"><Status variant="warning" showIcon>Workspace summaries are temporarily unavailable</Status><p>Open Project Workspaces to review the current status.</p></div>
            ) : !tenantId ? (
              <div className="customer-home__state"><Status variant="neutral" size="sm">Choose a workspace</Status><p>Select a workspace before reviewing its summaries.</p></div>
            ) : !hasVmfViewPermission ? (
              <div className="customer-home__state"><Status variant="neutral" size="sm">Workspace summaries are permission-scoped</Status><p>Your selected customer scope does not currently include the permission needed to list workspace summaries.</p></div>
            ) : workspaceCards.length === 0 ? (
              <div className="customer-home__state"><Status variant="neutral" size="sm">No Project Workspaces yet</Status><p>Create or select a workspace to begin.</p></div>
            ) : (
              <div className="customer-home__workspace-grid">
                {filteredWorkspaceCards.map((card) => (
                  <WorkspaceCard key={card.id} card={card} recommended={card.id === advisorCard?.id} />
                ))}
                {filteredWorkspaceCards.length === 0 ? <p className="customer-home__empty-filter">No workspaces match this view.</p> : null}
              </div>
            )}
            {runtimeListQuery.data?.meta?.total > workspaceCards.length ? (
              <p className="customer-home__muted">Showing {formatCount(workspaceCards.length)} from the current summary page.</p>
            ) : null}
          </section>
        </div>

        <aside className="customer-home__core-rail" aria-label="Workspace attention and activity">
          <section className="customer-home__section customer-home__rail-section" aria-labelledby="customer-home-attention-title">
            <div className="customer-home__section-heading">
              <div>
                <h2 id="customer-home-attention-title">Attention required</h2>
              </div>
              <strong className="customer-home__attention-total">
                {Object.values(attentionGroups).reduce((total, group) => total + group.length, 0)}
              </strong>
            </div>
            <div className="customer-home__attention-grid">
              <AttentionSummary label="Needs your input" cards={attentionGroups['Needs your input']} />
              <AttentionSummary label="Things to verify" cards={attentionGroups['Things to verify']} detail="Across your workspaces" icon="△" />
            </div>
            <Link to="/app/attention" underline="none" className="customer-home__action customer-home__rail-action">View all →</Link>
          </section>

          <RecentActivity cards={workspaceCards} />
        </aside>
      </div>

    </>
  )
}

export function Dashboard() {
  const { customerId, tenantId, isResolvingSelectedTenantContext } = useTenantContext()
  const { getCustomerScope, hasCustomerPermission, hasTenantPermission, user } = useAuthorization()
  const scope = customerId ? getCustomerScope(customerId) : null
  const experience = resolveCustomerExperience(scope)
  const hasVmfViewPermission = Boolean(
    customerId && (
      hasCustomerPermission(customerId, 'VMF_VIEW')
      || (tenantId && hasTenantPermission(customerId, tenantId, 'VMF_VIEW'))
    ),
  )
  const copy = EXPERIENCE_COPY[experience]
  const firstName = String(user?.name ?? '').trim().split(/\s+/)[0]
  const greeting = firstName ? `Good morning, ${firstName}.` : null

  if (isResolvingSelectedTenantContext || !customerId) {
    return (
      <main className="customer-home customer-home--state" aria-labelledby="customer-home-loading-title">
        <section className="customer-home__state" role="status">
          <Spinner size="lg" />
          <h1 id="customer-home-loading-title">Resolving workspace access…</h1>
        </section>
      </main>
    )
  }

  if (!copy) return <AccessResolutionState />

  return (
    <main className="customer-home" aria-labelledby="customer-home-title">
      <div className="customer-home__container">
        {experience === CUSTOMER_EXPERIENCE.SIGNAL ? (
          <SignalHome copy={copy} />
        ) : (
          <CoreHome
            copy={copy}
            customerId={customerId}
            tenantId={tenantId}
            hasVmfViewPermission={hasVmfViewPermission}
            greeting={greeting}
          />
        )}
      </div>
    </main>
  )
}

export default Dashboard
