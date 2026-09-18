import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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
}))

vi.mock('../../store/api/customerApi.js', () => ({
  useGetCustomerCreditsQuery: vi.fn(),
}))

import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useListRuntimeInstanceActivityQuery } from '../../store/api/runtimeInstanceApi.js'
import { useListRuntimeInstancesQuery } from '../../store/api/runtimeInstanceApi.js'
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
    expect(useListRuntimeInstancesQuery).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycleStage: 'PUBLISHED', page: 1, pageSize: 6 }),
      expect.objectContaining({ skip: false }),
    )

    secondRender.unmount()
    mockContext({ tenantId: 'tenant-2' })
    renderDashboard()
    expect(screen.getByRole('button', { name: 'Draft' })).toHaveAttribute('aria-pressed', 'true')
  })
})
