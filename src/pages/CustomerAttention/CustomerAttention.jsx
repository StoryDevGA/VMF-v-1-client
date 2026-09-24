import { useMemo, useState } from 'react'
import { Link } from '../../components/Link'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useListRuntimeInstancesQuery } from '../../store/api/runtimeInstanceApi.js'
import { CUSTOMER_WORKSPACE_STATES, buildCustomerHomeWorkspaceCard } from '../../utils/customerExperience.js'
import '../CustomerCentre/CustomerCentre.css'

const ATTENTION_FILTERS = Object.freeze([
  { value: 'ALL', label: 'All' },
  { value: 'REVIEW', label: 'Review item' },
  { value: 'QUALITY', label: 'Quality finding' },
  { value: 'MATERIAL_GAP', label: 'Material gap' },
  { value: 'WORKSPACE_CHECK', label: 'Workspace check' },
])

const getAttentionType = (card) => {
  if (card.understandingState === CUSTOMER_WORKSPACE_STATES.UNDERSTANDING_REVIEW) return 'REVIEW'
  if (card.evidenceStatus === CUSTOMER_WORKSPACE_STATES.EVIDENCE_ATTENTION) return 'MATERIAL_GAP'
  if (card.evidenceStatus === CUSTOMER_WORKSPACE_STATES.EVIDENCE_VERIFY) return 'QUALITY'
  return 'WORKSPACE_CHECK'
}

const getAttentionDescription = (card, type) => {
  if (type === 'REVIEW') return `${card.title} has review items waiting before the next customer-ready step.`
  if (type === 'MATERIAL_GAP') return `${card.title} needs stronger evidence or a resolved limitation before work can progress.`
  if (type === 'QUALITY') return `${card.title} has a verification item that should remain visible before publication.`
  return `${card.title} has a workspace check available for the next human decision.`
}

const getAttentionDestination = (card, type) => {
  if (type === 'REVIEW' || type === 'QUALITY') return '/app/intelligence?view=quality'
  return card?.id ? `/app/runtime/${encodeURIComponent(String(card.id))}` : '/app/dashboard'
}

export function CustomerAttention() {
  const { customerId, tenantId } = useTenantContext()
  const [activeFilter, setActiveFilter] = useState('ALL')
  const { data: response, isLoading, error } = useListRuntimeInstancesQuery(
    { customerId, tenantId, runtimeType: 'VALUE_NARRATIVE', page: 1, pageSize: 100 },
    { skip: !customerId || !tenantId },
  )
  const cards = (response?.data ?? []).map(buildCustomerHomeWorkspaceCard)
  const items = useMemo(
    () => cards
      .filter((card) => !card.isLocked && card.nextAction !== 'Open workspace')
      .map((card) => ({
        card,
        type: getAttentionType(card),
        priority: card.attentionGroup === 'Needs your input' ? 'High' : 'Medium',
      })),
    [cards],
  )
  const visibleItems = activeFilter === 'ALL' ? items : items.filter((item) => item.type === activeFilter)
  const recommendedItem = items.find((item) => item.card.attentionGroup === 'Needs your input') ?? items[0]
  const groupCounts = {
    REVIEW: items.filter((item) => item.type === 'REVIEW').length,
    QUALITY: items.filter((item) => item.type === 'QUALITY').length,
    MATERIAL_GAP: items.filter((item) => item.type === 'MATERIAL_GAP').length,
    WORKSPACE_CHECK: items.filter((item) => item.type === 'WORKSPACE_CHECK').length,
  }
  const attentionCount = items.length
  const reviewCount = groupCounts.REVIEW
  const needAttentionCount = Math.max(attentionCount - reviewCount, 0)
  const activeWorkspaceCount = cards.filter((card) => card.currentStage !== 'Not yet recorded').length

  return (
    <main className="customer-centre" aria-labelledby="customer-attention-title">
      <div className="customer-centre__container">
        <Link to="/app/dashboard" underline="none" className="customer-centre__back customer-centre__back--top">← Back to Customer Home</Link>
        <section className="customer-centre__hero">
          <div>
            <p className="customer-centre__eyebrow">Customer Home</p>
            <h1 id="customer-attention-title">Attention Centre</h1>
            <p>Everything that needs a human look before work moves on. Items stay grouped by workspace so the next action is clear.</p>
          </div>
          <Link to={recommendedItem?.card.id ? `/app/runtime/${encodeURIComponent(String(recommendedItem.card.id))}` : '/app/dashboard'} state={{ from: '/app/dashboard' }} underline="none" className="customer-centre__hero-action">Continue recommended work →</Link>
        </section>

        {recommendedItem ? (
          <section className="customer-centre__priority" aria-labelledby="customer-attention-priority-title">
            <div>
              <p className="customer-centre__label">Highest priority</p>
              <h2 id="customer-attention-priority-title">{recommendedItem.card.title} needs a human decision before customer outputs progress.</h2>
              <p>{getAttentionDescription(recommendedItem.card, recommendedItem.type)}</p>
            </div>
            <Link to={getAttentionDestination(recommendedItem.card, recommendedItem.type)} underline="none" className="customer-centre__priority-action">Open review item →</Link>
          </section>
        ) : null}

        <section className="customer-centre__metric-grid" aria-label="Attention summary">
          <div className="customer-centre__metric"><strong>{attentionCount}</strong><span>Open items</span></div>
          <div className="customer-centre__metric"><strong>{reviewCount}</strong><span>Review item</span></div>
          <div className="customer-centre__metric"><strong>{needAttentionCount}</strong><span>Need attention</span></div>
          <div className="customer-centre__metric"><strong>{activeWorkspaceCount}</strong><span>Active workspaces</span></div>
        </section>

        <div className="customer-centre__attention-grid">
          <section className="customer-centre__panel" aria-labelledby="customer-attention-list-title">
            <div className="customer-centre__panel-header">
              <div>
                <p className="customer-centre__eyebrow">All attention</p>
                <h2 id="customer-attention-list-title">{visibleItems.length} items shown</h2>
              </div>
              <div className="customer-centre__filters" role="group" aria-label="Filter attention items">
                {ATTENTION_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={`customer-centre__filter${activeFilter === filter.value ? ' is-active' : ''}`}
                    aria-pressed={activeFilter === filter.value}
                    onClick={() => setActiveFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="customer-centre__empty" role="status"><Spinner size="lg" /></div>
            ) : error ? (
              <div className="customer-centre__empty" role="alert"><Status variant="warning" showIcon>Attention summaries are unavailable</Status></div>
            ) : visibleItems.length === 0 ? (
              <div className="customer-centre__empty"><Status variant="success" size="sm">No items</Status></div>
            ) : (
              <ul className="customer-centre__attention-list">
                {visibleItems.map(({ card, type, priority }) => (
                  <li className="customer-centre__attention-item" key={card.identityKey || card.title}>
                    <div>
                      <span className="customer-centre__activity-type">{ATTENTION_FILTERS.find((filter) => filter.value === type)?.label || 'Workspace check'}</span>
                      <h3>{card.title} needs attention</h3>
                      <p>{getAttentionDescription(card, type)}</p>
                      <small>{card.title}</small>
                    </div>
                    <div>
                      <span className="customer-centre__severity">{priority}</span>
                      <Link to={getAttentionDestination(card, type)} state={{ from: '/app/dashboard' }} underline="none">Open review →</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="customer-centre__side-stack" aria-label="Attention context">
            <section className="customer-centre__panel customer-centre__side-panel">
              <p className="customer-centre__eyebrow">Why these are here</p>
              <p>Attention items are not errors. They are the decisions, limitations and checks that should remain visible before customer-ready work progresses.</p>
            </section>
            <section className="customer-centre__panel customer-centre__side-panel">
              <p className="customer-centre__eyebrow">Groups</p>
              <dl className="customer-centre__group-counts">
                <div><dt>Review item</dt><dd>{groupCounts.REVIEW}</dd></div>
                <div><dt>Quality finding</dt><dd>{groupCounts.QUALITY}</dd></div>
                <div><dt>Material gap</dt><dd>{groupCounts.MATERIAL_GAP}</dd></div>
                <div><dt>Workspace check</dt><dd>{groupCounts.WORKSPACE_CHECK}</dd></div>
              </dl>
            </section>
            <section className="customer-centre__panel customer-centre__side-panel">
              <p className="customer-centre__eyebrow">Recommended next step</p>
              <p>Start with the highest-priority review item. Resolving it reduces downstream limits on customer outputs.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default CustomerAttention
