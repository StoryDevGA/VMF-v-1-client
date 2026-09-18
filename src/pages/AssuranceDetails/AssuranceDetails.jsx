import { MdCheck } from 'react-icons/md'
import { useParams } from 'react-router-dom'
import { Link } from '../../components/Link'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { TableDateTime } from '../../components/TableDateTime/TableDateTime.jsx'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useGetRuntimeInstanceSummaryQuery } from '../../store/api/runtimeInstanceApi.js'
import { formatRuntimeTokenLabel } from '../../utils/runtimeWorkspace.js'
import '../CustomerCentre/CustomerCentre.css'

const getSummary = (response) => response?.data ?? response ?? null

export function AssuranceDetails() {
  const { runtimeInstanceId = '' } = useParams()
  const { customerId, tenantId } = useTenantContext()
  const {
    data: response,
    isLoading,
    error,
  } = useGetRuntimeInstanceSummaryQuery(
    { runtimeInstanceId, customerId, tenantId },
    { skip: !runtimeInstanceId || !customerId || !tenantId },
  )
  const summary = getSummary(response)
  const assuranceAvailable = summary?.lockStatus === 'LOCKED'
    || ['CURRENT', 'READY', 'COMPLETE', 'COMPLETED'].includes(String(summary?.readinessState ?? '').toUpperCase())
  const assuranceState = assuranceAvailable ? 'Validated baseline' : 'Assurance not yet available'
  const reviewStatus = summary?.submittedForReview ? 'Review item' : 'No open review item'
  const evidenceStatus = formatRuntimeTokenLabel(summary?.validationStatus, 'Not yet recorded')
  const runtimeId = encodeURIComponent(String(runtimeInstanceId))

  if (isLoading) {
    return (
      <main className="customer-centre" aria-labelledby="assurance-details-title">
        <div className="customer-centre__container customer-centre__empty" role="status"><Spinner size="lg" /></div>
      </main>
    )
  }

  if (error || !summary) {
    return (
      <main className="customer-centre" aria-labelledby="assurance-details-title">
        <div className="customer-centre__container">
          <section className="customer-centre__hero">
            <div>
              <p className="customer-centre__eyebrow">Assurance Details</p>
              <h1 id="assurance-details-title">Workspace assurance</h1>
              <p>Bounded assurance details are unavailable for this customer and tenant context.</p>
            </div>
          </section>
          <Status variant="warning" showIcon>Assurance details are unavailable</Status>
          <Link to={`/app/runtime/${runtimeId}`} underline="none" className="customer-centre__back">← Back to workspace</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="customer-centre" aria-labelledby="assurance-details-title">
      <div className="customer-centre__container">
        <section className="customer-centre__hero">
          <div>
            <p className="customer-centre__eyebrow">Assurance Details</p>
            <h1 id="assurance-details-title">{summary.name || 'Workspace assurance'}</h1>
            <p>Customer outputs can use the bounded workspace summary while stronger claims remain qualified until outstanding review items are resolved.</p>
          </div>
          <Link to={`/app/runtime/${runtimeId}`} underline="none" className="customer-centre__hero-action">View details →</Link>
        </section>

        <section className="customer-centre__panel customer-centre__assurance-summary" aria-label="Assurance summary">
          <div className="customer-centre__metric"><span>Assurance state</span><strong>{assuranceState}</strong><small>Current workspace context</small></div>
          <div className="customer-centre__metric"><span>Current stage</span><strong>{formatRuntimeTokenLabel(summary.frameworkLifecycleStage, 'Not yet recorded')}</strong><small>Lifecycle stage</small></div>
          <div className="customer-centre__metric"><span>Evidence status</span><strong>{evidenceStatus}</strong><small>{summary.frameworkKey || 'Value Narrative'}</small></div>
          <div className="customer-centre__metric"><span>Review status</span><strong>{reviewStatus}</strong><small>{summary.submittedForReview ? 'Human review required' : 'No current submission'}</small></div>
        </section>

        <div className="customer-centre__assurance-grid">
          <section className="customer-centre__panel" aria-labelledby="assurance-preserved-title">
            <div className="customer-centre__panel-header">
              <div>
                <p className="customer-centre__eyebrow">What is preserved</p>
                <h2 id="assurance-preserved-title">Customer-ready boundary</h2>
              </div>
            </div>
            <ul className="customer-centre__preserved-list">
              {[
                'Evidence, interpretation and recommended action remain separated.',
                `The current ${formatRuntimeTokenLabel(summary.frameworkLifecycleStage, 'workspace')} lifecycle state remains visible.`,
                'Advisor can recommend the next action; an authorised user must complete governed review.',
              ].map((item) => (
                <li className="customer-centre__preserved-item" key={item}>
                  <span className="customer-centre__check" aria-hidden="true"><MdCheck /></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <aside className="customer-centre__side-stack" aria-label="Assurance actions">
            <section className="customer-centre__panel customer-centre__side-panel">
              <p className="customer-centre__eyebrow">Connected actions</p>
              <div className="customer-centre__side-links">
                <Link to="/app/intelligence?view=quality" underline="none" className="customer-centre__side-link">Open review item →</Link>
                <Link to="/app/outcome-studio" underline="none" className="customer-centre__side-link">Create final asset →</Link>
                <Link to={`/app/activity?runtimeInstanceId=${runtimeId}`} underline="none" className="customer-centre__side-link">View activity →</Link>
              </div>
            </section>
            <section className="customer-centre__panel customer-centre__side-panel">
              <p className="customer-centre__eyebrow">Human authority</p>
              <h2>Workspace owner</h2>
              <p>StoryLineOS can recommend and preserve context. An authorised person approves review, acceptance and publication.</p>
            </section>
          </aside>
        </div>

        <p className="customer-centre__back">Last updated: <TableDateTime value={summary.updatedAt} fallback="Time unavailable" className="customer-home__date-time" /></p>
        <Link to={`/app/runtime/${runtimeId}`} underline="none" className="customer-centre__back">← Customer Home</Link>
      </div>
    </main>
  )
}

export default AssuranceDetails
