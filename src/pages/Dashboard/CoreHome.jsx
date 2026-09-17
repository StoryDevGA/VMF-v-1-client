import { useMemo, useState } from 'react'
import { MdChangeHistory, MdPriorityHigh, MdSearch } from 'react-icons/md'
import { Link } from '../../components/Link'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { useListRuntimeInstancesQuery } from '../../store/api/runtimeInstanceApi.js'
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

const WORKSPACE_PAGE_SIZE = 6

export function CoreHome({ copy, customerId, tenantId, hasVmfViewPermission, greeting }) {
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const [workspaceFilter, setWorkspaceFilter] = useState('active')
  const [workspacePage, setWorkspacePage] = useState(1)
  const runtimeListQuery = useListRuntimeInstancesQuery(
    {
      customerId,
      tenantId,
      runtimeType: 'VALUE_NARRATIVE',
      q: workspaceSearch.trim() || undefined,
      status: workspaceFilter === 'active' ? 'ACTIVE' : undefined,
      page: workspacePage,
      pageSize: WORKSPACE_PAGE_SIZE,
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
  const totalWorkspaceCount = Number(runtimeListQuery.data?.meta?.total ?? workspaceCards.length)
  const totalWorkspacePages = Math.max(
    1,
    Number(runtimeListQuery.data?.meta?.totalPages)
      || Math.ceil(totalWorkspaceCount / WORKSPACE_PAGE_SIZE),
  )
  const isFilteredWorkspaceView = Boolean(workspaceSearch.trim()) || workspaceFilter !== 'active'

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
                  <button type="button" aria-pressed={workspaceFilter === 'active'} className={workspaceFilter === 'active' ? 'is-active' : ''} onClick={() => { setWorkspaceFilter('active'); setWorkspacePage(1) }}>Active</button>
                  <button type="button" aria-pressed={workspaceFilter === 'all'} className={workspaceFilter === 'all' ? 'is-active' : ''} onClick={() => { setWorkspaceFilter('all'); setWorkspacePage(1) }}>All</button>
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
                <button type="button" disabled={workspacePage <= 1} onClick={() => setWorkspacePage((page) => Math.max(1, page - 1))}>Previous</button>
                <span>Page {workspacePage} of {totalWorkspacePages}</span>
                <button type="button" disabled={workspacePage >= totalWorkspacePages} onClick={() => setWorkspacePage((page) => Math.min(totalWorkspacePages, page + 1))}>Next</button>
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

          <RecentActivity cards={workspaceCards} />
        </aside>
      </div>
    </>
  )
}
