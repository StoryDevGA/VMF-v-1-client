import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

vi.mock('../../hooks/useAuthorization.js', () => ({
  useAuthorization: vi.fn(),
}))

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: vi.fn(),
}))

vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useListRuntimeInstanceActivityQuery: vi.fn(),
  useListRuntimeInstancesQuery: vi.fn(),
  useLazyListRuntimeInstancesQuery: vi.fn(),
}))

vi.mock('../../store/api/customerApi.js', () => ({
  useGetCustomerCreditsQuery: vi.fn(),
}))

import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useListRuntimeInstanceActivityQuery } from '../../store/api/runtimeInstanceApi.js'
import { useListRuntimeInstancesQuery } from '../../store/api/runtimeInstanceApi.js'
import { useLazyListRuntimeInstancesQuery } from '../../store/api/runtimeInstanceApi.js'
import { useGetCustomerCreditsQuery } from '../../store/api/customerApi.js'

const signalScope = {
  customerId: 'cust-1',
  homeExperience: 'SIGNAL',
  entitlementSource: 'LICENSE_LEVEL',
  featureEntitlements: ['WEBSITE', 'DOCUMENTS'],
}
const coreScope = {
  customerId: 'cust-1',
  homeExperience: 'CORE',
  entitlementSource: 'LICENSE_LEVEL',
  featureEntitlements: ['VMF', 'DEALS'],
}
const lazyTrigger = vi.fn(() => ({ unwrap: async () => ({ data: [], meta: { totalPages: 1 } }) }))

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/app/dashboard']}>
      <Dashboard />
    </MemoryRouter>,
  )
}

function mockContext(overrides = {}) {
  useTenantContext.mockReturnValue({
    customerId: 'cust-1',
    tenantId: 'tenant-1',
    resolvedTenantName: 'Alpha workspace',
    isResolvingSelectedTenantContext: false,
    ...overrides,
  })
}

function mockAuthorization({ scope = signalScope, canView = true, user = { id: 'user-1', name: 'Olivia' } } = {}) {
  useAuthorization.mockReturnValue({
    getCustomerScope: vi.fn(() => scope),
    hasCustomerPermission: vi.fn(() => canView),
    hasTenantPermission: vi.fn(() => canView),
    hasFeatureEntitlement: vi.fn((_customerId, feature) => scope.featureEntitlements?.includes(feature)),
    isCustomerScopeReady: true,
    user,
  })
}

describe('Dashboard customer home', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mockContext()
    mockAuthorization()
    useListRuntimeInstancesQuery.mockReturnValue({ data: undefined, isLoading: false, error: null })
    lazyTrigger.mockClear()
    useLazyListRuntimeInstancesQuery.mockReturnValue([lazyTrigger])
    useListRuntimeInstanceActivityQuery.mockReturnValue({ data: { data: [] }, isLoading: false, error: null })
    useGetCustomerCreditsQuery.mockReturnValue({
      data: { data: { balances: { websiteAnalysis: 7, documentImprovement: 4 } } },
      isLoading: false,
      isFetching: false,
      error: null,
    })
  })

  it('renders Signal Home and skips runtime summary reads for Signal customers', () => {
    renderDashboard()

    expect(screen.getByRole('heading', { name: 'Signal Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start Website Analysis →' })).toHaveAttribute(
      'href',
      '/app/website-analysis',
    )
    expect(screen.getByRole('link', { name: 'Start Document Improvement →' })).toHaveAttribute(
      'href',
      '/app/document-improvement',
    )
    expect(screen.queryByText('Project Workspaces')).not.toBeInTheDocument()
    expect(useListRuntimeInstancesQuery).not.toHaveBeenCalled()
  })

  it('renders Core Workspace Home from summary fields only', () => {
    mockAuthorization({ scope: coreScope })
    useListRuntimeInstancesQuery.mockReturnValue({
      data: {
        data: [{
          id: 'workspace-1',
          name: 'Launch a stronger operating model',
          description: 'Business objective from summary',
          runtimeType: 'VALUE_NARRATIVE',
          frameworkKey: 'VMF',
          frameworkLifecycleStage: 'REVIEW',
          validationStatus: 'ACCEPTED',
          readinessState: 'READY',
          executionStatus: 'COMPLETED',
          submittedForReview: false,
        }],
        meta: { total: 1 },
      },
      isLoading: false,
      error: null,
    })

    renderDashboard()

    expect(screen.getByRole('heading', { name: 'Customer Workspace' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Continue Launch a stronger operating model', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Attention required' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recent activity' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View all activity' })).toHaveAttribute(
      'href',
      '/app/activity',
    )
    expect(screen.getByText('Understanding accepted')).toBeInTheDocument()
    expect(screen.getByText('Source basis available')).toBeInTheDocument()
    expect(screen.getAllByText('No items').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Value Narrative workspace').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      '/app/runtime/workspace-1',
    )
    expect(useListRuntimeInstancesQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        runtimeType: 'VALUE_NARRATIVE',
        lifecycleStage: 'DRAFT',
        page: 1,
        pageSize: 6,
      }),
      expect.objectContaining({ skip: false }),
    )
  })

  it('keeps recommendation copy and attention scoped to the recommended workspace', () => {
    mockAuthorization({ scope: coreScope })
    useListRuntimeInstancesQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'needs-input',
            name: 'Needs input workspace',
            runtimeType: 'VALUE_NARRATIVE',
            frameworkKey: 'VMF',
            frameworkLifecycleStage: 'DRAFT',
            validationStatus: 'PENDING',
            submittedForReview: false,
            updatedAt: '2026-09-20T12:00:00.000Z',
          },
          {
            id: 'submitted-review',
            name: 'Submitted review workspace',
            runtimeType: 'VALUE_NARRATIVE',
            frameworkKey: 'VMF',
            frameworkLifecycleStage: 'REVIEW',
            validationStatus: 'ACCEPTED',
            readinessState: 'IN_REVIEW',
            submittedForReview: true,
            updatedAt: '2026-09-19T12:00:00.000Z',
          },
        ],
        meta: { total: 2 },
      },
      isLoading: false,
      error: null,
    })

    renderDashboard()

    const recommendation = screen.getByRole('region', { name: 'Continue Needs input workspace' })
    expect(screen.getByText('Across all 2 workspaces')).toBeInTheDocument()
    expect(recommendation).toHaveTextContent('This is your most relevant activity across all workspace instances. It is not affected by the Project Workspaces filter below.')
    expect(recommendation).toHaveTextContent('No items')
    expect(recommendation).not.toHaveTextContent('1 review item')
    expect(screen.queryByRole('link', { name: 'View review item' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Submitted review workspace', level: 3 }).closest('article'))
      .toHaveTextContent('1 review item')

    const attentionCounts = screen.getAllByText('1 item needs attention')
    expect(attentionCounts).toHaveLength(2)
    attentionCounts.forEach((count) => {
      expect(count).toHaveClass('customer-home__attention-count')
      expect(count.closest('.customer-home__attention-summary')
        .querySelector('.customer-home__attention-icon')).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'Attention required' }).closest('section')
      .querySelector('.customer-home__attention-total')).toHaveTextContent('2')
  })

  it('fails closed when the selected customer scope is missing or unknown', () => {
    mockAuthorization({ scope: { customerId: 'cust-1', featureEntitlements: [] } })

    renderDashboard()

    expect(screen.getByRole('heading', { name: 'We could not confirm this customer workspace' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Website Analysis/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Project Workspaces/i })).not.toBeInTheDocument()
    expect(useListRuntimeInstancesQuery).not.toHaveBeenCalled()
  })

  it('holds the home while customer scopes are still resolving', () => {
    mockAuthorization()
    useAuthorization.mockReturnValue({
      getCustomerScope: vi.fn(() => signalScope),
      hasCustomerPermission: vi.fn(() => true),
      hasTenantPermission: vi.fn(() => true),
      isCustomerScopeReady: false,
    })

    renderDashboard()

    expect(screen.getByRole('heading', { name: 'Resolving workspace access…' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Signal Home' })).not.toBeInTheDocument()
  })

  it('sends search and filter changes to the paginated summary query', () => {
    mockAuthorization({ scope: coreScope })
    useListRuntimeInstancesQuery.mockReturnValue({
      data: { data: [], meta: { total: 0, totalPages: 1 } },
      isLoading: false,
      error: null,
    })

    renderDashboard()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search Project Workspaces' }), {
      target: { value: 'parlon' },
    })

    expect(useListRuntimeInstancesQuery).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'parlon', lifecycleStage: 'DRAFT', page: 1, pageSize: 6 }),
      expect.objectContaining({ skip: false }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(useListRuntimeInstancesQuery).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'parlon', lifecycleStage: undefined, page: 1, pageSize: 6 }),
      expect.objectContaining({ skip: false }),
    )
    expect(lazyTrigger).not.toHaveBeenCalled()
  })

  it('uses the bounded workspace route when a summary has no route id', () => {
    mockAuthorization({ scope: coreScope })
    useListRuntimeInstancesQuery.mockReturnValue({
      data: {
        data: [{ name: 'Unidentified workspace', runtimeType: 'VALUE_NARRATIVE' }],
        meta: { total: 1 },
      },
      isLoading: false,
      error: null,
    })

    renderDashboard()

    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/app/workspaces/vmf')
    fireEvent.click(screen.getByRole('button', { name: 'Show actions for Unidentified workspace' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open workspace' })).toHaveAttribute('href', '/app/workspaces/vmf')
  })

  it('restores the last valid filter only for the same user and tenant context', () => {
    mockAuthorization({ scope: coreScope, user: { id: 'user-1', name: 'Olivia' } })
    useListRuntimeInstancesQuery.mockReturnValue({
      data: { data: [], meta: { total: 0, totalPages: 1 } },
      isLoading: false,
      error: null,
    })

    const firstRender = renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'Published' }))
    expect(screen.getByRole('button', { name: 'Published' })).toHaveAttribute('aria-pressed', 'true')
    firstRender.unmount()

    const secondRender = renderDashboard()
    expect(screen.getByRole('button', { name: 'Published' })).toHaveAttribute('aria-pressed', 'true')
    expect(lazyTrigger).toHaveBeenCalledWith(expect.objectContaining({ lifecycleStage: 'PUBLISHED', page: 1, pageSize: 100 }))

    secondRender.unmount()
    mockContext({ tenantId: 'tenant-2' })
    renderDashboard()
    expect(screen.getByRole('button', { name: 'Draft' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens recommendation context in a dialog and returns without losing the selected filter', async () => {
    mockAuthorization({ scope: coreScope })
    window.localStorage.setItem('storylineos:customer-home:workspace-filter:user-1:cust-1:tenant-1', 'published')
    useListRuntimeInstancesQuery.mockReturnValue({
      data: {
        data: [{
          id: 'workspace-1',
          name: 'Latest Markdown Framework',
          runtimeType: 'VALUE_NARRATIVE',
          frameworkLifecycleStage: 'DRAFT',
        }],
        meta: { total: 1 },
      },
      isLoading: false,
      error: null,
    })

    renderDashboard()
    expect(await screen.findByText('No workspaces match this view')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Why this recommendation' }))

    const recommendationDialog = screen.getByRole('dialog')
    expect(recommendationDialog).toBeInTheDocument()
    expect(within(recommendationDialog).getByRole('heading', { name: 'Highest-priority resumable work across this customer' })).toBeInTheDocument()
    expect(within(recommendationDialog).getByText('Why Advisor recommends this')).toBeInTheDocument()
    expect(within(recommendationDialog).getByText('State considered')).toBeInTheDocument()
    expect(within(recommendationDialog).getByText('Priority signal')).toBeInTheDocument()
    expect(within(recommendationDialog).getByText('Recommended action')).toBeInTheDocument()
    expect(within(recommendationDialog).getByText('No review items waiting')).toBeInTheDocument()
    expect(within(recommendationDialog).getByText('Recommendation only')).toBeInTheDocument()
    fireEvent.click(within(recommendationDialog).getByRole('button', { name: 'Close', exact: true }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Published' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('includes Locked instances in Published and suppresses their review and evidence details', async () => {
    mockAuthorization({ scope: coreScope })
    useListRuntimeInstancesQuery.mockReturnValue({ data: { data: [], meta: { total: 0 } }, isLoading: false, error: null })
    lazyTrigger.mockImplementation((args) => ({
      unwrap: async () => args.status === 'LOCKED'
        ? { data: [{ id: args.page === 1 ? 'locked-1' : 'locked-2', name: args.page === 1 ? 'Locked instance' : 'Second locked instance', status: 'LOCKED', lockStatus: 'LOCKED', frameworkLifecycleStage: 'PUBLISHED', submittedForReview: true }], meta: { totalPages: 2 } }
        : { data: [{ id: args.page === 1 ? 'published-1' : 'published-2', name: args.page === 1 ? 'Published instance' : 'Second published instance', status: 'PUBLISHED', frameworkLifecycleStage: 'PUBLISHED', validationStatus: 'ACCEPTED' }], meta: { totalPages: 2 } },
    }))

    renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'Published' }))

    expect(await screen.findByRole('heading', { name: 'Published instance', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Second published instance', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Locked instance', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Second locked instance', level: 3 })).toBeInTheDocument()
    expect(screen.getAllByText('Locked · read-only').length).toBeGreaterThan(0)
    expect(screen.queryByText('1 review item')).not.toBeInTheDocument()
    expect(screen.queryByText('Review & evidence')).not.toBeInTheDocument()
    expect(lazyTrigger).toHaveBeenCalledWith(expect.objectContaining({ lifecycleStage: 'PUBLISHED', page: 1, pageSize: 100 }))
    expect(lazyTrigger).toHaveBeenCalledWith(expect.objectContaining({ status: 'LOCKED', page: 1, pageSize: 100 }))
    expect(lazyTrigger).toHaveBeenCalledWith(expect.objectContaining({ lifecycleStage: 'PUBLISHED', page: 2, pageSize: 100 }))
    expect(lazyTrigger).toHaveBeenCalledWith(expect.objectContaining({ status: 'LOCKED', page: 2, pageSize: 100 }))
  })
})
