import { useMemo, useState } from 'react'
import { MdCheck, MdDescription, MdPriorityHigh, MdSubdirectoryArrowRight } from 'react-icons/md'
import { Link } from '../../components/Link'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { TableDateTime } from '../../components/TableDateTime/TableDateTime.jsx'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useListRuntimeInstanceActivityQuery } from '../../store/api/runtimeInstanceApi.js'
import '../CustomerCentre/CustomerCentre.css'

const ACTIVITY_FILTERS = Object.freeze([
  { value: 'ALL', label: 'All' },
  { value: 'OUTPUT', label: 'Output' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'SOURCE', label: 'Source' },
])
const EMPTY_ACTIVITY_LIST = Object.freeze([])

const normalizeAction = (activity = {}) => `${activity.action ?? ''} ${activity.summary ?? ''}`.toUpperCase()

const getActivityCategory = (activity) => {
  const action = normalizeAction(activity)
  if (action.includes('OUTPUT') || action.includes('ASSET')) return 'OUTPUT'
  if (action.includes('CERTIFICATE') || action.includes('SNAPSHOT')) return 'CERTIFICATE'
  if (action.includes('REVIEW') || action.includes('QUALITY') || action.includes('TRUTH')) return 'REVIEW'
  if (action.includes('SOURCE') || action.includes('EVIDENCE')) return 'SOURCE'
  return 'WORKSPACE'
}

const formatActivityTitle = (activity) => {
  const summary = String(activity.summary ?? '').trim()
  const shortened = summary.replace(/\s+for\s+value-narrative-.+$/i, '').trim()
  return shortened || 'Workspace activity'
}

const getActivityDescription = (category) => ({
  OUTPUT: 'A customer-facing output changed in the selected workspace context.',
  CERTIFICATE: 'Evidence-backed workspace assurance activity was refreshed.',
  REVIEW: 'Review or truth-quality activity was recorded for human follow-up.',
  SOURCE: 'Customer evidence or source material changed in the workspace.',
  WORKSPACE: 'Workspace activity was recorded in the selected customer context.',
}[category])

const getActivityIcon = (category) => {
  if (category === 'OUTPUT') return MdDescription
  if (category === 'CERTIFICATE') return MdCheck
  if (category === 'REVIEW') return MdPriorityHigh
  if (category === 'SOURCE') return MdSubdirectoryArrowRight
  return MdDescription
}

const isToday = (value) => {
  const date = new Date(value)
  const now = new Date()
  return Number.isFinite(date.getTime()) && date.toDateString() === now.toDateString()
}

export function CustomerActivity() {
  const { customerId, tenantId } = useTenantContext()
  const [activeFilter, setActiveFilter] = useState('ALL')
  const { data: response, isLoading, error } = useListRuntimeInstanceActivityQuery(
    { customerId, tenantId, runtimeType: 'VALUE_NARRATIVE', limit: 50 },
    { skip: !customerId || !tenantId },
  )
  const activities = response?.data ?? EMPTY_ACTIVITY_LIST
  const visibleActivities = useMemo(
    () => activeFilter === 'ALL'
      ? activities
      : activities.filter((activity) => getActivityCategory(activity) === activeFilter),
    [activeFilter, activities],
  )
  const workspacesTouched = new Set(activities.map((activity) => activity.runtimeInstanceId || activity.runtimeInstanceKey).filter(Boolean)).size
  const customerOutputs = activities.filter((activity) => getActivityCategory(activity) === 'OUTPUT').length
  const todayCount = activities.filter((activity) => isToday(activity.occurredAt)).length

  return (
    <main className="customer-centre" aria-labelledby="customer-activity-title">
      <div className="customer-centre__container">
        <section className="customer-centre__hero">
          <div>
            <p className="customer-centre__eyebrow">Customer Home</p>
            <h1 id="customer-activity-title">Activity Centre</h1>
            <p>A readable history of recent customer workspace activity, so the team can see what changed, where it happened and what can be opened next.</p>
          </div>
          <Link to="/app/attention" underline="none" className="customer-centre__hero-action">View attention items →</Link>
        </section>

        <section className="customer-centre__metric-grid" aria-label="Activity summary">
          <div className="customer-centre__metric"><strong>{activities.length}</strong><span>Recent events</span></div>
          <div className="customer-centre__metric"><strong>{todayCount}</strong><span>Today</span></div>
          <div className="customer-centre__metric"><strong>{workspacesTouched}</strong><span>Workspaces touched</span></div>
          <div className="customer-centre__metric"><strong>{customerOutputs}</strong><span>Customer outputs</span></div>
        </section>

        <section className="customer-centre__panel" aria-labelledby="customer-activity-list-title">
          <div className="customer-centre__panel-header">
            <div>
              <p className="customer-centre__eyebrow">Recent activity</p>
              <h2 id="customer-activity-list-title">{visibleActivities.length} events shown</h2>
            </div>
            <div className="customer-centre__filters" role="group" aria-label="Filter recent activity">
              {ACTIVITY_FILTERS.map((filter) => (
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
            <div className="customer-centre__empty" role="alert"><Status variant="warning" showIcon>Activity summaries are unavailable</Status></div>
          ) : visibleActivities.length === 0 ? (
            <div className="customer-centre__empty"><Status variant="neutral" size="sm">No activity in this view</Status></div>
          ) : (
            <ol className="customer-centre__activity-list">
              {visibleActivities.map((activity, index) => {
                const category = getActivityCategory(activity)
                const Icon = getActivityIcon(category)
                const openTo = activity.runtimeInstanceId
                  ? `/app/runtime/${encodeURIComponent(String(activity.runtimeInstanceId))}`
                  : '/app/dashboard'
                return (
                  <li className="customer-centre__activity-item" key={activity.id || `${activity.runtimeInstanceId}-${index}`}>
                    <span className="customer-centre__activity-icon" aria-hidden="true"><Icon /></span>
                    <div>
                      <span className="customer-centre__activity-type">{category[0] + category.slice(1).toLowerCase()}</span>
                      <h3>{formatActivityTitle(activity)}</h3>
                      <p>{getActivityDescription(category)}</p>
                      <small>{activity.runtimeName || 'Selected workspace'}</small>
                    </div>
                    <div className="customer-centre__activity-action">
                      <TableDateTime value={activity.occurredAt} fallback="Time unavailable" className="customer-home__date-time" />
                      <Link to={openTo} underline="none">Open →</Link>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <Link to="/app/dashboard" underline="none" className="customer-centre__back">← Customer Home</Link>
      </div>
    </main>
  )
}

export default CustomerActivity
