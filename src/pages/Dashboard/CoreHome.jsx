import { useMemo, useState } from 'react'
import { MdChangeHistory, MdPriorityHigh, MdSearch } from 'react-icons/md'
import { Link } from '../../components/Link'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import {
  useListRuntimeInstanceActivityQuery,
  useListRuntimeInstancesQuery,
} from '../../store/api/runtimeInstanceApi.js'
import {
  buildCustomerHomeWorkspaceCard,
} from '../../utils/customerExperience.js'
import {
  AttentionSummary,
  Advisor,
  RecentActivity,
  WorkspaceCard,
} from './DashboardShared.jsx'
import { getWorkspaceCardKey } from './dashboardModel.js'
import {
  buildWorkspaceFilterPreferenceKey,
  DEFAULT_WORKSPACE_FILTER,
  isWorkspaceFilter,
  readWorkspaceFilterPreference,
  WORKSPACE_FILTERS,
  writeWorkspaceFilterPreference,
} from './workspaceFilterPreference.js'

const WORKSPACE_PAGE_SIZE = 6
const WORKSPACE_SUMMARY_PAGE_SIZE = 100

const WORKSPACE_FILTER_CONFIG = Object.freeze({
  [WORKSPACE_FILTERS.DRAFT]: { label: 'Draft', lifecycleStage: 'DRAFT' },
  [WORKSPACE_FILTERS.PUBLISHED]: { label: 'Published', lifecycleStage: 'PUBLISHED' },
  [WORKSPACE_FILTERS.ALL]: { label: 'All' },
})

export function CoreHome({ copy, customerId, tenantId, userId, hasVmfViewPermission, greeting }) {
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const [workspacePage, setWorkspacePage] = useState(1)
  const preferenceKey = useMemo(
    () => buildWorkspaceFilterPreferenceKey({ userId, customerId, tenantId }),
    [customerId, tenantId, userId],
  )
  const [workspacePreference, setWorkspacePreference] = useState(() => ({
    key: preferenceKey,
    value: readWorkspaceFilterPreference(preferenceKey),
  }))
  const workspaceFilter = workspacePreference.key === preferenceKey
    ? workspacePreference.value
    : readWorkspaceFilterPreference(preferenceKey)
  const currentWorkspacePage = workspacePreference.key === preferenceKey ? workspacePage : 1

  const selectedWorkspaceFilter = WORKSPACE_FILTER_CONFIG[workspaceFilter]
    ?? WORKSPACE_FILTER_CONFIG[DEFAULT_WORKSPACE_FILTER]
  const changeWorkspaceFilter = (value) => {
    if (!isWorkspaceFilter(value)) return
    setWorkspacePreference({ key: preferenceKey, value })
    setWorkspacePage(1)
    writeWorkspaceFilterPreference(preferenceKey, value)
  }

  const runtimeListQuery = useListRuntimeInstancesQuery(
    {
      customerId,
      tenantId,
      runtimeType: 'VALUE_NARRATIVE',
      q: workspaceSearch.trim() || undefined,
      lifecycleStage: selectedWorkspaceFilter.lifecycleStage,
      page: currentWorkspacePage,
      pageSize: WORKSPACE_PAGE_SIZE,
    },
    {
      skip: !customerId || !tenantId || !hasVmfViewPermission,
    },
  )
  const workspaceSummaryQuery = useListRuntimeInstancesQuery(
    {
      customerId,
      tenantId,
      runtimeType: 'VALUE_NARRATIVE',
      page: 1,
      pageSize: WORKSPACE_SUMMARY_PAGE_SIZE,
    },
    {
      skip: !customerId || !tenantId || !hasVmfViewPermission,
    },
  )
  const activityQuery = useListRuntimeInstanceActivityQuery(
    {
      customerId,
      tenantId,
      runtimeType: 'VALUE_NARRATIVE',
      limit: 5,
    },
    {
      skip: !customerId || !tenantId || !hasVmfViewPermission,
    },
  )
  const workspaceCards = useMemo(
    () => (runtimeListQuery.data?.data ?? [])
      .map(buildCustomerHomeWorkspaceCard)
      .sort((left, right) => {
        const leftTime = Date.parse(String(left.updatedAt ?? ''))
        const rightTime = Date.parse(String(right.updatedAt ?? ''))
        if (!Number.isFinite(leftTime)) return Number.isFinite(rightTime) ? 1 : 0
        if (!Number.isFinite(rightTime)) return -1
        return rightTime - leftTime
      }),
    [runtimeListQuery.data],
  )
  const allWorkspaceCards = useMemo(
    () => (workspaceSummaryQuery.data?.data ?? [])
      .map(buildCustomerHomeWorkspaceCard)
      .sort((left, right) => {
        const leftTime = Date.parse(String(left.updatedAt ?? ''))
        const rightTime = Date.parse(String(right.updatedAt ?? ''))
        if (!Number.isFinite(leftTime)) return Number.isFinite(rightTime) ? 1 : 0
        if (!Number.isFinite(rightTime)) return -1
        return rightTime - leftTime
      }),
    [workspaceSummaryQuery.data],
  )
  const attentionGroups = useMemo(() => ({
    'Needs your input': allWorkspaceCards.filter((card) => card.attentionGroup === 'Needs your input'),
    'StoryLineOS is working on': allWorkspaceCards.filter((card) => card.attentionGroup === 'StoryLineOS is working on'),
    'Things to verify': allWorkspaceCards.filter((card) => card.attentionGroup === 'Things to verify'),
  }), [allWorkspaceCards])
  const advisorCard = useMemo(
    () => allWorkspaceCards.find((card) => card.attentionGroup === 'Needs your input')
      ?? allWorkspaceCards.find((card) => card.attentionGroup === 'Things to verify')
      ?? allWorkspaceCards[0]
      ?? null,
    [allWorkspaceCards],
  )
  const totalWorkspaceCount = Number(workspaceSummaryQuery.data?.meta?.total ?? allWorkspaceCards.length)
  const totalWorkspacePages = Math.max(
    1,
    Number(runtimeListQuery.data?.meta?.totalPages)
      || Math.ceil(totalWorkspaceCount / WORKSPACE_PAGE_SIZE),
  )
  const recentActivities = activityQuery.data?.data ?? []
  const isFilteredWorkspaceView = Boolean(workspaceSearch.trim()) || workspaceFilter !== DEFAULT_WORKSPACE_FILTER

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
          <Advisor card={advisorCard} activeWorkspaceCount={totalWorkspaceCount} />

          <section className="customer-home__section" aria-labelledby="customer-home-workspaces-title">
            <div className="customer-home__section-heading">
              <div>
                <h2 id="customer-home-workspaces-title">Project Workspaces</h2>
                <p className="customer-home__section-description">One workspace for each customer outcome you are working towards.</p>
              </div>
              <div className="customer-home__workspace-tools">
                <label className="customer-home__search">
                  <span className="sr-only">Search Project Workspaces</span>
                  <span className="customer-home__search-icon" aria-hidden="true">
                    <MdSearch aria-hidden="true" focusable="false" />
                  </span>
                  <input
                    type="search"
                    value={workspaceSearch}
                    onChange={(event) => {
                      setWorkspaceSearch(event.target.value)
                      setWorkspacePage(1)
                    }}
                    placeholder="Search workspaces"
                  />
                </label>
                <div className="customer-home__workspace-filter" role="group" aria-labelledby="customer-home-workspace-filter-label">
                  <span id="customer-home-workspace-filter-label" className="sr-only">Workspace status filter</span>
                  {Object.entries(WORKSPACE_FILTER_CONFIG).map(([value, config]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={workspaceFilter === value}
                      className={workspaceFilter === value ? 'is-active' : ''}
                      onClick={() => changeWorkspaceFilter(value)}
                    >
                      {config.label}
                    </button>
                  ))}
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
            ) : workspaceCards.length === 0 && isFilteredWorkspaceView ? (
              <div className="customer-home__state"><Status variant="neutral" size="sm">No workspaces match this view</Status><p>Try another search or choose All to review every workspace.</p></div>
            ) : workspaceCards.length === 0 ? (
              <div className="customer-home__state"><Status variant="neutral" size="sm">No Project Workspaces yet</Status><p>Create or select a workspace to begin.</p></div>
            ) : (
              <div className="customer-home__workspace-grid">
                {workspaceCards.map((card, index) => (
                  <WorkspaceCard key={getWorkspaceCardKey(card, index)} card={card} recommended={getWorkspaceCardKey(card, index) === getWorkspaceCardKey(advisorCard, -1)} />
                ))}
              </div>
            )}
            {totalWorkspacePages > 1 ? (
              <div className="customer-home__pagination" aria-label="Project Workspace pages">
                <button type="button" disabled={currentWorkspacePage <= 1} onClick={() => setWorkspacePage((page) => Math.max(1, page - 1))}>Previous</button>
                <span>Page {currentWorkspacePage} of {totalWorkspacePages}</span>
                <button type="button" disabled={currentWorkspacePage >= totalWorkspacePages} onClick={() => setWorkspacePage((page) => Math.min(totalWorkspacePages, page + 1))}>Next</button>
              </div>
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
                {attentionGroups['Needs your input'].length + attentionGroups['Things to verify'].length}
              </strong>
            </div>
            <div className="customer-home__attention-grid">
              <AttentionSummary label="Needs your input" cards={attentionGroups['Needs your input']} icon={MdPriorityHigh} />
              <AttentionSummary
                label="Things to verify"
                cards={attentionGroups['Things to verify']}
                detail="Across your workspaces"
                icon={MdChangeHistory}
                warning={false}
              />
            </div>
            <Link to="/app/attention" underline="none" className="customer-home__action customer-home__rail-action">View all →</Link>
          </section>

          <RecentActivity activities={recentActivities} isLoading={activityQuery.isLoading} />
        </aside>
      </div>
    </>
  )
}
