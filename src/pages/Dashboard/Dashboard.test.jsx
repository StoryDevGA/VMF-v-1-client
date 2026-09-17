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
  useListRuntimeInstancesQuery: vi.fn(),
}))

import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useListRuntimeInstancesQuery } from '../../store/api/runtimeInstanceApi.js'

const signalScope = { customerId: 'cust-1', featureEntitlements: ['DEALS', 'VIEWS'] }
const coreScope = { customerId: 'cust-1', featureEntitlements: ['VMF', 'DEALS'] }

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

function mockAuthorization({ scope = signalScope, canView = true } = {}) {
  useAuthorization.mockReturnValue({
    getCustomerScope: vi.fn(() => scope),
    hasCustomerPermission: vi.fn(() => canView),
    hasTenantPermission: vi.fn(() => canView),
    isCustomerScopeReady: true,
  })
}

describe('Dashboard customer home', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContext()
    mockAuthorization()
    useListRuntimeInstancesQuery.mockReturnValue({ data: undefined, isLoading: false, error: null })
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
        status: 'ACTIVE',
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

    expect(useListRuntimeInstancesQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'parlon', status: 'ACTIVE', page: 1, pageSize: 6 }),
      expect.objectContaining({ skip: false }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(useListRuntimeInstancesQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'parlon', status: undefined, page: 1, pageSize: 6 }),
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
})
