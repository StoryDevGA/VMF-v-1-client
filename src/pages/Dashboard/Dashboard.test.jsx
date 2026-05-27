/**
 * Dashboard Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'node:path'
import process from 'node:process'
import { readFileSync } from 'node:fs'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

const dashboardCss = readFileSync(
  path.resolve(process.cwd(), 'src/pages/Dashboard/Dashboard.css'),
  'utf8',
)

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getCssRuleBody(selector, { after } = {}) {
  const startIndex = after ? dashboardCss.indexOf(after) : 0

  if (startIndex === -1) {
    throw new Error(`Missing CSS anchor ${after}`)
  }

  const source = dashboardCss.slice(startIndex)
  const match = new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\}`).exec(source)

  if (!match) {
    throw new Error(`Missing CSS rule for ${selector}`)
  }

  return match[1]
}

function getCssDeclarations(selector, options) {
  return getCssRuleBody(selector, options)
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .reduce((declarations, declaration) => {
      const separatorIndex = declaration.indexOf(':')

      if (separatorIndex === -1) return declarations

      const property = declaration.slice(0, separatorIndex).trim()
      const value = declaration.slice(separatorIndex + 1).replace(/\s+/g, ' ').trim()

      return {
        ...declarations,
        [property]: value,
      }
    }, {})
}

vi.mock('../../hooks/useAuthorization.js', () => ({
  useAuthorization: vi.fn(),
}))

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: vi.fn(),
}))

vi.mock('../../store/api/customerApi.js', () => ({
  useGetCustomerQuery: vi.fn(),
}))

vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useListRuntimeInstancesQuery: vi.fn(),
}))

vi.mock('../../components/CustomerSelector', () => ({
  CustomerSelector: () => <div data-testid="customer-selector">Customer Selector</div>,
}))

vi.mock('../../components/TenantSwitcher', () => ({
  TenantSwitcher: ({ placeholder = 'Tenant Switcher' }) => (
    <div data-testid="tenant-switcher">{placeholder}</div>
  ),
}))

import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useGetCustomerQuery } from '../../store/api/customerApi.js'
import { useListRuntimeInstancesQuery } from '../../store/api/runtimeInstanceApi.js'

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/app/dashboard']}>
      <Dashboard />
    </MemoryRouter>,
  )
}

const getMockMembershipCustomerId = (membership) =>
  membership?.customerId
  ?? membership?.customer?.id
  ?? membership?.customer?._id

function mockRole({
  isSuperAdmin = false,
  isCustomerAdmin = false,
  accessibleCustomerIds,
  userName = 'Test User',
  memberships = [],
  tenantMemberships = [],
  featureEntitlements = ['VMF', 'DEALS'],
  entitlementSource = 'LICENSE_LEVEL',
} = {}) {
  const customerIds = accessibleCustomerIds ?? (isCustomerAdmin ? ['cust-1'] : [])
  const hasCustomerRole = vi.fn((customerId, role) => {
    if (isCustomerAdmin && customerIds.includes(customerId) && role === 'CUSTOMER_ADMIN') {
      return true
    }

    return customerIds.includes(customerId) && memberships.some((membership) =>
      String(getMockMembershipCustomerId(membership) ?? '') === String(customerId ?? '')
      && (membership?.roles ?? []).includes(role))
  })

  const hasCustomerPermission = vi.fn((customerId, permission) => {
    if (!customerId) return false
    if (isSuperAdmin) return true
    if (isCustomerAdmin && customerIds.includes(customerId)) return true
    return memberships.some((membership) =>
      String(getMockMembershipCustomerId(membership) ?? '') === String(customerId)
      && (membership?.permissions ?? []).includes(permission))
  })

  const hasTenantPermission = vi.fn((customerId, tenantId, permission) => {
    if (!customerId || !tenantId) return false
    if (isSuperAdmin) return true
    if (isCustomerAdmin && customerIds.includes(customerId)) return true
    return (tenantMemberships ?? []).some(
      (membership) =>
        String(getMockMembershipCustomerId(membership) ?? '') === String(customerId ?? '')
        && String(membership?.tenantId ?? '') === String(tenantId ?? '')
        && (membership?.permissions ?? []).includes(permission),
    )
  })

  useAuthorization.mockReturnValue({
    user: { id: 'u-1', name: userName, memberships, tenantMemberships },
    isSuperAdmin,
    accessibleCustomerIds: customerIds,
    hasCustomerRole,
    hasCustomerPermission,
    hasTenantPermission,
    getFeatureEntitlements: vi.fn(() => featureEntitlements),
    getEntitlementSource: vi.fn(() => entitlementSource),
  })
}

function mockTenantContext(overrides = {}) {
  useTenantContext.mockReturnValue({
    customerId: 'cust-1',
    tenantId: 'ten-1',
    tenants: [
      { id: 'ten-1', name: 'Alpha Tenant', status: 'ENABLED', isSelectable: true },
      { id: 'ten-2', name: 'Beta Tenant', status: 'ENABLED', isSelectable: true },
    ],
    selectableTenants: [
      { id: 'ten-1', name: 'Alpha Tenant', status: 'ENABLED', isSelectable: true },
      { id: 'ten-2', name: 'Beta Tenant', status: 'ENABLED', isSelectable: true },
    ],
    canViewTenants: true,
    customerName: null,
    resolvedTenantName: 'Alpha Tenant',
    supportsTenantManagement: true,
    selectedCustomerTopology: 'MULTI_TENANT',
    isLoadingTenants: false,
    hasInvalidTenantContext: false,
    setTenantId: vi.fn(),
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTenantContext()
  useGetCustomerQuery.mockReturnValue({ data: undefined })
  useListRuntimeInstancesQuery.mockReturnValue({
    data: { data: [], meta: { page: 1, totalPages: 1, total: 0 } },
    isLoading: false,
    isFetching: false,
    error: null,
  })
  mockRole({ isCustomerAdmin: true })
})

describe('Dashboard page', () => {
  it('renders the customer runtime workspace surface instead of workflow tiles', () => {
    renderDashboard()

    expect(screen.getByRole('heading', { name: /^customer workspace$/i })).toBeInTheDocument()
    expect(screen.getByText(/operating hub for governed runtime work/i)).toBeInTheDocument()
    expect(screen.getByText(/viewing runtime workspace for alpha tenant under current customer/i))
      .toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /continue work/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /active work/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent activity/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /create new work/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /runtime action queue panel/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /create new work panel/i })).toBeInTheDocument()
    const signalsPanel = screen.getByRole('region', { name: /runtime alerts and navigation/i })
    const alertsList = within(signalsPanel).getByRole('list', { name: /^runtime alerts$/i })
    const secondaryNavigation = within(signalsPanel).getByRole(
      'navigation',
      { name: /customer workspace secondary navigation/i },
    )

    expect(alertsList.querySelectorAll('.dashboard__alert-item')).toHaveLength(0)
    expect(within(alertsList).getByText(/no runtime signals/i)).toBeInTheDocument()
    expect(within(alertsList).getByText(/no runtime signals/i).closest('.dashboard__empty-item'))
      .toHaveClass('dashboard__empty-item--composed')
    const activityEmptyTitle = screen.getByText(/no runtime activity yet/i)
    expect(activityEmptyTitle.closest('.dashboard__empty-item'))
      .toHaveClass('dashboard__empty-item--composed', 'dashboard__empty-item--spacious')
    expect(screen.getByText(/activity will appear here when runtime instances emit execution/i))
      .toBeInTheDocument()
    expect(secondaryNavigation.querySelectorAll('.dashboard__launch-item--secondary')).toHaveLength(2)
    const valueNarrativeLink = within(secondaryNavigation).getByRole(
      'link',
      { name: /value narrative workspace/i },
    )

    expect(valueNarrativeLink).toHaveClass('dashboard__launch-link--secondary')
    expect(within(valueNarrativeLink).getByText('Current')).toBeInTheDocument()
    expect(valueNarrativeLink.querySelector('.dashboard__launch-topline .dashboard__launch-icon'))
      .toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /workflow tiles/i })).not.toBeInTheDocument()
  })

  it('keeps customer, tenant, work type, and role context visible', () => {
    renderDashboard()

    const context = screen.getByLabelText(/runtime context summary/i)
    expect(within(context).getByText('Customer')).toBeInTheDocument()
    expect(within(context).getByText('Current customer')).toBeInTheDocument()
    expect(within(context).getByText('Tenant')).toBeInTheDocument()
    expect(screen.getByTestId('tenant-switcher')).toBeInTheDocument()
    expect(screen.getByTestId('tenant-switcher')).toHaveTextContent('Select tenant')
    const workTypeControl = within(context).getByRole('combobox', { name: /^work type$/i })

    expect(workTypeControl).toHaveTextContent('All Work')
    expect(workTypeControl.closest('.dashboard__hero-metric'))
      .toHaveClass('dashboard__hero-metric--control')
    expect(workTypeControl.closest('.custom-select')).toHaveClass('dashboard__context-selector')
    expect(within(context).getAllByText(/^Work Type$/i)).toHaveLength(1)
    const roleMetric = within(context).getByText('Role').closest('.dashboard__hero-metric')
    expect(within(roleMetric).getByText('Customer Administrator')).toHaveClass('dashboard__context-value')
    expect(roleMetric.querySelector('.status__indicator')).not.toBeInTheDocument()
  })

  it('uses customer details API name when membership has no embedded customer name', () => {
    mockRole({
      isCustomerAdmin: true,
      memberships: [{ customerId: 'cust-1', roles: ['CUSTOMER_ADMIN'] }],
    })
    useGetCustomerQuery.mockReturnValue({
      data: {
        data: {
          _id: 'cust-1',
          name: 'Northwind Logistics',
        },
      },
    })

    renderDashboard()

    expect(screen.getAllByText('Northwind Logistics').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/viewing runtime workspace for alpha tenant under northwind logistics/i))
      .toBeInTheDocument()
  })

  it('shows customer and tenant context controls when the admin can switch customers and tenants', () => {
    mockRole({ isCustomerAdmin: true, accessibleCustomerIds: ['cust-1', 'cust-2'] })

    renderDashboard()

    expect(screen.getByTestId('customer-selector')).toBeInTheDocument()
    expect(screen.getByTestId('tenant-switcher')).toBeInTheDocument()
  })

  it('explains multi-tenant customer scope before a tenant is selected', () => {
    mockTenantContext({
      tenantId: null,
      resolvedTenantName: null,
    })

    renderDashboard()

    expect(screen.getByTestId('tenant-switcher')).toHaveTextContent('Select tenant')
    expect(
      screen.getByText(/current customer has 2 tenants: alpha tenant, beta tenant/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/select a tenant to continue your work/i)).toBeInTheDocument()
  })

  it('auto-selects the only selectable tenant for a multi-tenant user', async () => {
    const setTenantId = vi.fn()
    mockRole({
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
      tenantMemberships: [{ customerId: 'cust-1', tenantId: 'ten-1', roles: ['USER'] }],
    })
    mockTenantContext({
      tenantId: null,
      resolvedTenantName: null,
      selectableTenants: [{ id: 'ten-1', name: 'Only Tenant', status: 'ENABLED', isSelectable: true }],
      setTenantId,
    })

    renderDashboard()

    await waitFor(() => {
      expect(setTenantId).toHaveBeenCalledWith('ten-1', 'Only Tenant')
    })
  })

  it('does not auto-select a tenant when the user cannot access tenant selection', () => {
    const setTenantId = vi.fn()
    mockRole({
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
      tenantMemberships: [{ customerId: 'cust-1', tenantId: 'ten-1', roles: ['USER'] }],
    })
    mockTenantContext({
      canViewTenants: false,
      tenantId: null,
      resolvedTenantName: null,
      selectableTenants: [{ id: 'ten-1', name: 'Only Tenant', status: 'ENABLED', isSelectable: true }],
      setTenantId,
    })

    renderDashboard()

    expect(setTenantId).not.toHaveBeenCalled()
    expect(screen.getByText(/select a tenant to continue your work/i)).toBeInTheDocument()
  })

  it('blocks runtime actions until a tenant is selected for multi-tenant customers', () => {
    mockTenantContext({
      tenantId: null,
      resolvedTenantName: null,
    })

    renderDashboard()

    expect(screen.getByText(/select a tenant to continue your work/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /tenant required/i })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(/select a tenant to show runtime work/i)).toBeInTheDocument()
    const actionPanel = screen.getByRole('navigation', { name: /runtime action queue panel/i })
    const actionQueue = within(actionPanel).getByRole('list', { name: /^runtime action queue$/i })

    expect(actionQueue).toHaveClass('dashboard__launch-grid--single')
    expect(actionQueue.querySelectorAll('.dashboard__launch-item--action')).toHaveLength(1)
  })

  it('does not render placeholder runtime action items when no runtime data is loaded', () => {
    renderDashboard()

    const actionPanel = screen.getByRole('navigation', { name: /runtime action queue panel/i })
    const actionQueue = within(actionPanel).getByRole('list', { name: /^runtime action queue$/i })

    expect(screen.queryByText(/continue acme value narrative/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/fix validation issues in globex business case/i)).not.toBeInTheDocument()
    expect(within(actionQueue).getByText(/no runtime actions/i)).toBeInTheDocument()
    expect(within(actionQueue).getByText(/runtime actions will appear here once runtime instances exist/i))
      .toBeInTheDocument()
    expect(actionQueue).toHaveClass('dashboard__launch-grid--actions')
    expect(actionQueue.querySelectorAll('.dashboard__launch-item--action')).toHaveLength(0)
    expect(screen.getByText('0 available')).toBeInTheDocument()
  })

  it('links runtime instance work to the runtime renderer workspace', () => {
    useListRuntimeInstancesQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'runtime-new-package',
            runtimeInstanceKey: 'value-narrative-859907',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'New Package',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            packageKey: 'latest-package',
            packageVersion: '2.3.569357',
            updatedAt: '2026-05-18T11:13:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderDashboard()

    expect(useListRuntimeInstancesQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        tenantId: 'ten-1',
        runtimeType: 'VALUE_NARRATIVE',
        q: '',
        status: '',
        pageSize: 25,
      }),
      { skip: false },
    )
    const actionPanel = screen.getByRole('navigation', { name: /runtime action queue panel/i })
    const actionQueue = within(actionPanel).getByRole('list', { name: /^runtime action queue$/i })
    const primaryActionCard = actionQueue.querySelector('.dashboard__launch-item--primary-action')

    expect(primaryActionCard).not.toBeNull()
    expect(within(primaryActionCard).getByText('New Package')).toBeInTheDocument()
    expect(within(primaryActionCard).getByText('Active')).toBeInTheDocument()
    expect(within(primaryActionCard).getByText('Draft')).toBeInTheDocument()
    expect(within(primaryActionCard).getByText(/value narrative 2\.3\.569357 - updated 18 may 2026/i))
      .toBeInTheDocument()
    expect(within(primaryActionCard).queryByText('Open the Value Narrative workspace to continue.'))
      .not.toBeInTheDocument()
    expect(primaryActionCard).not.toHaveClass('dashboard__launch-item--featured')
    const primaryActionLink = within(primaryActionCard).getByRole('link', {
      name: /continue new package open workspace/i,
    })
    const primaryHead = primaryActionLink.querySelector('.dashboard__continue-head')
    const primaryCopy = primaryActionLink.querySelector('.dashboard__continue-copy')
    const primaryActions = primaryActionLink.querySelector('.dashboard__continue-actions')

    expect(primaryActionLink)
      .toHaveClass('dashboard__continue-card', 'dashboard__continue-card--primary', 'dashboard__continue-card--link')
    expect(primaryActionLink).toHaveAttribute('href', '/app/runtime/value-narrative-859907')
    expect(primaryHead).not.toBeNull()
    expect(primaryHead).toContainElement(within(primaryActionLink).getByRole('heading', { name: 'New Package' }))
    expect(primaryHead).toContainElement(within(primaryActionLink).getByLabelText('Runtime state'))
    expect(primaryCopy).not.toBeNull()
    expect(primaryCopy.querySelector('.dashboard__continue-title')).not.toBeInTheDocument()
    expect(primaryCopy.querySelector('.dashboard__continue-status')).not.toBeInTheDocument()
    expect(primaryActions).not.toBeNull()
    expect(primaryActions).toContainElement(within(primaryActionLink).getByText('Continue'))
    expect(within(primaryActionCard).queryByRole('button', { name: /^continue$/i }))
      .not.toBeInTheDocument()
    expect(primaryActionCard.querySelector('.dashboard__continue-arrow')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open 2\.3\.569357/i }))
      .toHaveAttribute('href', '/app/runtime/value-narrative-859907')
    const workTable = screen.getByRole('table', { name: /work in progress runtime instances/i })
    const updatedDate = within(workTable).getByText('2026-05-18')
    const updatedTimestamp = updatedDate.closest('time')
    expect(updatedTimestamp).not.toBeNull()
    expect(updatedTimestamp).toHaveClass('table-date-time')
    expect(updatedTimestamp).toHaveAttribute('datetime', '2026-05-18T11:13:00.000Z')
    expect(updatedDate).toHaveClass('table-date-time__date')
    expect(within(updatedTimestamp).getByText(/^\d{2}:\d{2}$/))
      .toHaveClass('table-date-time__time')
    expect(screen.getAllByText('New Package').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('value-narrative-859907')).toBeInTheDocument()
    expect(screen.getByText('latest-package')).toBeInTheDocument()
    expect(screen.getByText('Idle')).toBeInTheDocument()
    expect(screen.getByText('Pending runtime engine')).toBeInTheDocument()
    expect(screen.getByText('1 available')).toBeInTheDocument()
  })

  it('applies the featured Continue Work treatment only to the first runtime action', () => {
    useListRuntimeInstancesQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'runtime-first',
            runtimeInstanceKey: 'value-narrative-first',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'First Runtime',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            packageVersion: '2.3.569357',
            updatedAt: '2026-05-27T09:21:00.000Z',
          },
          {
            id: 'runtime-second',
            runtimeInstanceKey: 'value-narrative-second',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Second Runtime',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            packageVersion: '2.3.569357',
            updatedAt: '2026-05-25T11:48:00.000Z',
          },
          {
            id: 'runtime-third',
            runtimeInstanceKey: 'value-narrative-third',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Third Runtime',
            status: 'ARCHIVED',
            executionStatus: 'IDLE',
            packageVersion: '2.3.569357',
            updatedAt: '2026-05-20T15:11:00.000Z',
          },
          {
            id: 'runtime-fourth',
            runtimeInstanceKey: 'value-narrative-fourth',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Fourth Runtime',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            packageVersion: '2.3.569357',
            updatedAt: '2026-05-20T14:46:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 4 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderDashboard()

    const actionPanel = screen.getByRole('navigation', { name: /runtime action queue panel/i })
    const actionQueue = within(actionPanel).getByRole('list', { name: /^runtime action queue$/i })
    const actionCards = Array.from(actionQueue.querySelectorAll('.dashboard__launch-item--action'))
    const [primaryActionCard, ...secondaryActionCards] = actionCards
    const primaryActionLink = within(primaryActionCard).getByRole('link', {
      name: /continue first runtime open workspace/i,
    })

    expect(actionQueue).toHaveClass('dashboard__launch-grid--actions')
    expect(actionCards).toHaveLength(4)
    expect(primaryActionCard).toHaveClass('dashboard__launch-item--primary-action')
    expect(primaryActionLink)
      .toHaveClass('dashboard__continue-card', 'dashboard__continue-card--primary', 'dashboard__continue-card--link')
    expect(primaryActionLink.querySelector('.dashboard__continue-cta'))
      .toHaveTextContent('Continue')

    secondaryActionCards.forEach((card) => {
      const compactActionLink = card.querySelector('.dashboard__continue-card')

      expect(card).not.toHaveClass('dashboard__launch-item--primary-action')
      expect(compactActionLink)
        .toHaveClass('dashboard__continue-card--secondary', 'dashboard__continue-card--link')
      expect(compactActionLink).not.toHaveClass('dashboard__continue-card--primary')
      expect(compactActionLink.querySelector('.dashboard__continue-cta')).not.toBeInTheDocument()
      expect(compactActionLink.querySelector('.dashboard__continue-command')).not.toBeInTheDocument()
    })
  })

  it('styles runtime health from readiness instead of execution state', () => {
    useListRuntimeInstancesQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'runtime-blocked-health',
            runtimeInstanceKey: 'value-narrative-blocked',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Blocked Runtime Health',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            validationStatus: 'BLOCKED',
            packageKey: 'blocked-package',
            updatedAt: '2026-05-18T11:13:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderDashboard()

    const actionPanel = screen.getByRole('navigation', { name: /runtime action queue panel/i })
    const primaryActionCard = within(actionPanel)
      .getByText('Blocked Runtime Health')
      .closest('.dashboard__launch-item')

    expect(primaryActionCard).toHaveClass('dashboard__launch-item--primary-action')
    expect(within(primaryActionCard).getByText('Needs Review')).toBeInTheDocument()

    const table = screen.getByRole('table', { name: /work in progress runtime instances/i })
    const health = within(table).getByText('Execution blocked').closest('.status')

    expect(health).toHaveClass('status--error')
    expect(health).not.toHaveClass('status--neutral')
  })

  it('surfaces runtime instance API failures instead of showing an empty runtime state', () => {
    useListRuntimeInstancesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: {
        status: 503,
        data: {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Runtime instance service unavailable.',
            requestId: 'rt-load-1',
          },
        },
      },
    })

    renderDashboard()

    const actionPanel = screen.getByRole('navigation', { name: /runtime action queue panel/i })
    const actionQueue = within(actionPanel).getByRole('list', { name: /^runtime action queue$/i })

    expect(within(actionQueue).getByRole('link', { name: /runtime work unavailable/i }))
      .toHaveAttribute('aria-disabled', 'true')
    expect(screen.getAllByText(/runtime instance service unavailable/i).length)
      .toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/unable to load runtime instances/i)).toBeInTheDocument()
    expect(within(actionQueue).queryByText(/no runtime actions/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/no runtime instances are available for this tenant yet/i))
      .not.toBeInTheDocument()
    expect(screen.getByText('0 available')).toBeInTheDocument()
  })

  it('renders an honest empty work-in-progress table until runtime instances are API-backed', async () => {
    const user = userEvent.setup()
    renderDashboard()

    const tableRegion = screen.getByRole('region', { name: /work in progress runtime instances table/i })
    const workTable = within(tableRegion).getByRole('table', { name: /work in progress runtime instances/i })

    expect(workTable).toBeInTheDocument()
    expect(workTable).toHaveClass('table--striped')
    expect(workTable).toHaveClass('table--hoverable')
    expect(workTable).not.toHaveClass('table--bordered')
    expect(workTable).not.toHaveClass('table--compact')
    expect(within(workTable).getByRole('columnheader', { name: /instance/i })).toBeInTheDocument()
    expect(within(workTable).getByRole('columnheader', { name: /work type/i })).toBeInTheDocument()
    expect(within(workTable).getByRole('columnheader', { name: /package/i })).toBeInTheDocument()
    expect(within(workTable).getByRole('columnheader', { name: /state/i })).toBeInTheDocument()
    expect(within(workTable).getByRole('columnheader', { name: /lifecycle/i })).toBeInTheDocument()
    expect(within(workTable).getByRole('columnheader', { name: /health/i })).toBeInTheDocument()
    expect(within(workTable).getByRole('columnheader', { name: /updated/i })).toBeInTheDocument()
    expect(within(workTable).getByRole('columnheader', { name: /next action/i })).toBeInTheDocument()
    expect(screen.queryByText('Acme Value Narrative')).not.toBeInTheDocument()
    expect(screen.queryByText('Globex Business Case')).not.toBeInTheDocument()
    expect(screen.getByText(/no runtime instances are available for this tenant yet/i)).toBeInTheDocument()

    const activeWorkFilters = screen.getByRole('group', { name: /active work filters/i })
    expect(within(activeWorkFilters).getByRole('combobox', { name: /^state$/i })).toBeInTheDocument()
    expect(within(activeWorkFilters).getByRole('combobox', { name: /^work type$/i })).toBeInTheDocument()
    expect(within(activeWorkFilters).getByRole('combobox', { name: /^health$/i })).toBeInTheDocument()
    expect(within(activeWorkFilters).getByRole('textbox', { name: /^search$/i })).toBeInTheDocument()

    await user.selectOptions(
      within(activeWorkFilters).getByRole('combobox', { name: /^work type$/i }),
      'VALUE_NARRATIVE',
    )

    expect(screen.queryByText('Acme Value Narrative')).not.toBeInTheDocument()
    expect(screen.queryByText('Globex Business Case')).not.toBeInTheDocument()
    expect(screen.getByText(/no runtime instances match the selected filters/i)).toBeInTheDocument()
  })

  it('passes active work search and state filters to the runtime instance API', async () => {
    const user = userEvent.setup()
    renderDashboard()
    const activeWorkFilters = screen.getByRole('group', { name: /active work filters/i })

    await user.selectOptions(
      within(activeWorkFilters).getByRole('combobox', { name: /^state$/i }),
      'LOCKED',
    )
    await user.type(within(activeWorkFilters).getByRole('textbox', { name: /^search$/i }), 'capacity')

    await waitFor(() => {
      expect(useListRuntimeInstancesQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          tenantId: 'ten-1',
          runtimeType: 'VALUE_NARRATIVE',
          q: 'capacity',
          status: 'LOCKED',
          pageSize: 25,
        }),
        { skip: false },
      )
    })
  })

  it('filters active work health from runtime readiness data without adding API-only filters', async () => {
    const user = userEvent.setup()
    useListRuntimeInstancesQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'runtime-good-health',
            runtimeInstanceKey: 'value-narrative-good',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Healthy Runtime',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            completionState: 'COMPLETE',
            validationStatus: 'READY',
            lockStatus: 'LOCKED',
            snapshotStatus: 'BOUND',
            packageKey: 'ready-package',
            updatedAt: '2026-05-18T11:13:00.000Z',
          },
          {
            id: 'runtime-blocked-health',
            runtimeInstanceKey: 'value-narrative-blocked',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Blocked Runtime',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            validationStatus: 'BLOCKED',
            packageKey: 'blocked-package',
            updatedAt: '2026-05-18T11:13:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 2 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderDashboard()
    const activeWorkFilters = screen.getByRole('group', { name: /active work filters/i })

    await user.selectOptions(
      within(activeWorkFilters).getByRole('combobox', { name: /^health$/i }),
      'BLOCKED',
    )

    const table = screen.getByRole('table', { name: /work in progress runtime instances/i })
    expect(within(table).getByText('Blocked Runtime')).toBeInTheDocument()
    expect(within(table).queryByText('Healthy Runtime')).not.toBeInTheDocument()
    expect(useListRuntimeInstancesQuery).toHaveBeenLastCalledWith(
      expect.not.objectContaining({
        health: 'BLOCKED',
      }),
      { skip: false },
    )
  })

  it('shows Sales Manager scoped role without placeholder team work', () => {
    mockRole({
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['SALES_MANAGER'] }],
      tenantMemberships: [
        { customerId: 'cust-1', tenantId: 'ten-1', roles: ['SALES_MANAGER'], permissions: ['VMF_VIEW'] },
      ],
    })

    renderDashboard()

    expect(screen.getAllByText('Sales Manager').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/review beta deal analysis/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Amelia Hart')).not.toBeInTheDocument()
    expect(screen.getByText(/no runtime actions/i)).toBeInTheDocument()
    const actionPanel = screen.getByRole('navigation', { name: /runtime action queue panel/i })
    const actionQueue = within(actionPanel).getByRole('list', { name: /^runtime action queue$/i })
    expect(actionQueue.querySelectorAll('.dashboard__launch-item--action')).toHaveLength(0)
    expect(screen.getByText('0 available')).toBeInTheDocument()
  })

  it('keeps unsupported future framework and output placeholders out of the dashboard', () => {
    mockRole({
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['SALES'] }],
      tenantMemberships: [
        { customerId: 'cust-1', tenantId: 'ten-1', roles: ['SALES'], permissions: ['VMF_VIEW'] },
      ],
    })

    renderDashboard()

    expect(screen.getAllByText('Sales User').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Beta Deal Analysis')).not.toBeInTheDocument()
    expect(screen.queryByText('Deal Analysis')).not.toBeInTheDocument()
    expect(screen.queryByText('Business Cases')).not.toBeInTheDocument()
    expect(screen.queryByText('Account Plans')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /create deal analysis/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /generate output/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /outputs/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /insights/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create value narrative/i })).toBeInTheDocument()
    const createPanel = screen.getByRole('navigation', { name: /create new work panel/i })
    const createGrid = within(createPanel).getByRole('list', { name: /^create new work$/i })

    expect(createGrid).toHaveClass('dashboard__launch-grid--create')
    expect(createGrid.querySelectorAll('.dashboard__launch-item--create')).toHaveLength(1)
    const createLink = within(createGrid).getByRole('link', { name: /create value narrative/i })
    expect(createLink).toHaveAttribute('aria-disabled', 'true')
    expect(within(createLink).getByText('Locked')).toBeInTheDocument()
    expect(createLink.querySelector('.dashboard__create-command')).toBeNull()
    expect(within(createLink).getByText(/vmf_create permission/i)).toBeInTheDocument()
    expect(createLink.querySelector('.dashboard__create-reason')).toBeNull()
  })

  it('resolves tenant memberships that use nested customer references', () => {
    mockRole({
      accessibleCustomerIds: ['cust-1'],
      memberships: [],
      tenantMemberships: [
        {
          customer: { id: 'cust-1', name: 'Nested Customer' },
          tenantId: 'ten-1',
          roles: ['SALES'],
          permissions: ['VMF_VIEW'],
        },
      ],
    })

    renderDashboard()

    expect(screen.getAllByText('Sales User').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Nested Customer').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('link', { name: /create deal analysis/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create value narrative/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('preserves single-tenant context without rendering tenant switcher', () => {
    mockTenantContext({
      tenantId: 'ten-default',
      customerName: 'Person 2 Person',
      resolvedTenantName: 'Default Tenant',
      supportsTenantManagement: false,
      selectedCustomerTopology: 'SINGLE_TENANT',
      canViewTenants: false,
      selectableTenants: [],
    })

    renderDashboard()

    expect(screen.queryByTestId('tenant-switcher')).not.toBeInTheDocument()
    expect(screen.getAllByText('Person 2 Person').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Default Tenant')).not.toBeInTheDocument()
    expect(screen.getByText(/person 2 person uses a single tenant/i)).toBeInTheDocument()
    expect(screen.getByText(/context ready/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /tenant administration/i })).not.toBeInTheDocument()
  })

  it('shows tenant administration only for multi-tenant customer or tenant admins', () => {
    mockRole({
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
      tenantMemberships: [
        {
          customerId: 'cust-1',
          tenantId: 'ten-1',
          roles: ['TENANT_ADMIN'],
          permissions: ['VMF_VIEW'],
        },
      ],
    })

    renderDashboard()

    expect(screen.getByRole('link', { name: /tenant administration/i })).toBeInTheDocument()
  })

  it('hides tenant administration for multi-tenant users without admin scope', () => {
    mockRole({
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
      tenantMemberships: [
        {
          customerId: 'cust-1',
          tenantId: 'ten-1',
          roles: ['USER'],
          permissions: ['VMF_VIEW'],
        },
      ],
    })

    renderDashboard()

    expect(screen.queryByRole('link', { name: /tenant administration/i })).not.toBeInTheDocument()
  })

  it('locks the primary Continue Work card visual hierarchy contract', () => {
    const baseCard = getCssDeclarations('.dashboard__continue-card')
    const primaryCard = getCssDeclarations('.dashboard__continue-card--primary')
    const primaryIcon = getCssDeclarations('.dashboard__continue-card--primary .dashboard__continue-icon')
    const primaryHead = getCssDeclarations('.dashboard__continue-card--primary .dashboard__continue-head')
    const primaryCopy = getCssDeclarations('.dashboard__continue-card--primary .dashboard__continue-copy')
    const primaryTitle = getCssDeclarations('.dashboard__continue-card--primary .dashboard__continue-title')
    const primaryBadge = getCssDeclarations('.dashboard__continue-card--primary .dashboard__continue-status .badge')
    const primaryActions = getCssDeclarations('.dashboard__continue-card--primary .dashboard__continue-actions')
    const primaryCta = getCssDeclarations('.dashboard__continue-card--primary .dashboard__continue-cta')

    expect(baseCard).toEqual(expect.objectContaining({
      '--dashboard-continue-icon-size': 'var(--spacing-xl)',
      'grid-template-columns': 'minmax(0, 1fr) auto',
      'grid-template-rows': 'auto minmax(0, 1fr)',
      'min-height': '8.25rem',
      padding: 'var(--spacing-md)',
      border: 'var(--border-width-thin) solid var(--color-card-border)',
    }))
    expect(primaryCard).toEqual(expect.objectContaining({
      '--dashboard-continue-icon-size': 'var(--spacing-2xl)',
      'grid-template-columns': 'minmax(0, 1fr) auto',
      'grid-template-rows': 'auto auto',
      'align-items': 'center',
      'min-height': '8.25rem',
      padding: 'var(--spacing-lg)',
      'border-color': 'color-mix(in srgb, var(--color-action-primary) 58%, var(--color-card-border))',
      background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-action-primary) 9%, transparent), transparent 48%), var(--color-background)',
    }))
    expect(primaryIcon).toEqual(expect.objectContaining({
      'border-radius': 'var(--border-radius-md)',
      'background-color': 'color-mix(in srgb, var(--color-action-primary) 14%, transparent)',
      'font-size': 'var(--font-size-lg)',
    }))
    expect(primaryHead).toEqual(expect.objectContaining({
      'align-items': 'center',
      gap: 'var(--spacing-md)',
    }))
    expect(primaryCopy).toEqual(expect.objectContaining({
      'grid-column': '1',
      'grid-row': '2',
      'padding-inline-start': 'calc(var(--dashboard-continue-icon-size) + var(--spacing-md))',
      'padding-inline-end': 'var(--spacing-md)',
      'border-inline-start': '0',
    }))
    expect(primaryTitle).toEqual(expect.objectContaining({
      'font-size': 'var(--font-size-lg)',
      'font-weight': 'var(--font-weight-bold)',
      'line-height': '1.05',
      'text-wrap': 'balance',
    }))
    expect(primaryBadge).toEqual(expect.objectContaining({
      'font-size': '0.6875rem',
      'line-height': '1.05',
    }))
    expect(primaryActions).toEqual(expect.objectContaining({
      'grid-column': '2',
      'grid-row': '1 / span 2',
      gap: 'var(--spacing-md)',
    }))
    expect(primaryCta).toEqual(expect.objectContaining({
      'min-width': '6.25rem',
      'min-height': 'calc(var(--spacing-md) * 2.15)',
      'padding-inline': 'var(--spacing-md)',
      'font-size': 'var(--font-size-sm)',
    }))
  })

  it('locks the secondary Continue Work card compact hierarchy contract', () => {
    const secondaryCard = getCssDeclarations('.dashboard__continue-card--secondary')
    const secondaryIcon = getCssDeclarations('.dashboard__continue-card--secondary .dashboard__continue-icon')
    const secondaryHead = getCssDeclarations('.dashboard__continue-card--secondary .dashboard__continue-head')
    const secondaryHeading = getCssDeclarations('.dashboard__continue-card--secondary .dashboard__continue-heading')
    const secondaryCopy = getCssDeclarations('.dashboard__continue-card--secondary .dashboard__continue-copy')
    const secondaryTitle = getCssDeclarations('.dashboard__continue-card--secondary .dashboard__continue-title')
    const secondaryStatus = getCssDeclarations('.dashboard__continue-card--secondary .dashboard__continue-status')
    const secondaryBadge = getCssDeclarations('.dashboard__continue-card--secondary .dashboard__continue-status .badge')
    const secondaryCopyText = getCssDeclarations('.dashboard__continue-card--secondary .dashboard__continue-copy p')
    const secondaryActions = getCssDeclarations('.dashboard__continue-card--secondary .dashboard__continue-actions')
    const secondaryArrow = getCssDeclarations('.dashboard__continue-card--secondary .dashboard__continue-arrow')

    expect(secondaryCard).toEqual(expect.objectContaining({
      '--dashboard-continue-icon-size': 'var(--spacing-xl)',
      'grid-template-rows': 'auto auto',
      'align-content': 'start',
      gap: 'var(--spacing-sm) var(--spacing-sm)',
      'min-height': '8.25rem',
      padding: 'var(--spacing-md) var(--spacing-sm)',
    }))
    expect(secondaryIcon).toEqual(expect.objectContaining({
      'margin-block-start': 'var(--spacing-2xs)',
      'border-radius': 'var(--border-radius-sm)',
      'background-color': 'color-mix(in srgb, var(--color-action-primary) 7%, transparent)',
      'font-size': 'var(--font-size-sm)',
    }))
    expect(secondaryHead).toEqual(expect.objectContaining({
      'align-items': 'start',
      gap: 'var(--spacing-xs)',
    }))
    expect(secondaryHeading).toEqual(expect.objectContaining({
      gap: 'var(--spacing-sm)',
    }))
    expect(secondaryCopy).toEqual(expect.objectContaining({
      gap: 'var(--spacing-sm)',
      'margin-block-start': 'var(--spacing-2xs)',
      'padding-inline-start': 'calc(var(--dashboard-continue-icon-size) + var(--spacing-xs))',
      'padding-inline-end': 'var(--spacing-xs)',
    }))
    expect(secondaryTitle).toEqual(expect.objectContaining({
      'font-size': '0.9375rem',
      'line-height': '1.1',
      'text-wrap': 'balance',
    }))
    expect(secondaryStatus).toEqual(expect.objectContaining({
      gap: 'var(--spacing-2xs)',
    }))
    expect(secondaryBadge).toEqual(expect.objectContaining({
      'min-height': '1.0625rem',
      'padding-inline': 'var(--spacing-2xs)',
      'font-size': 'var(--font-size-xs)',
      'line-height': '1',
    }))
    expect(secondaryCopyText).toEqual(expect.objectContaining({
      'font-size': 'var(--font-size-xs)',
      'line-height': '1.18',
      'text-wrap': 'pretty',
    }))
    expect(secondaryActions).toEqual(expect.objectContaining({
      'grid-column': '2',
      'grid-row': '1 / span 2',
      gap: 'var(--spacing-xs)',
    }))
    expect(secondaryArrow).toEqual(expect.objectContaining({
      'font-size': 'var(--font-size-sm)',
    }))
  })

  it('locks the Continue Work responsive grid contract for a wide primary card', () => {
    const desktopActionsGrid = getCssDeclarations('.dashboard__launch-grid--actions', {
      after: '@media (min-width: 1280px)',
    })
    const mobilePrimaryCard = getCssDeclarations('.dashboard__continue-card--primary', {
      after: '@media (max-width: 768px)',
    })
    const mobilePrimaryActions = getCssDeclarations('.dashboard__continue-actions', {
      after: '@media (max-width: 768px)',
    })

    expect(desktopActionsGrid).toEqual(expect.objectContaining({
      'grid-template-columns': 'minmax(0, 2fr) repeat(3, minmax(12rem, 1fr))',
    }))
    expect(mobilePrimaryCard).toEqual(expect.objectContaining({
      'grid-template-columns': 'minmax(0, 1fr)',
      'grid-template-rows': 'auto auto auto',
    }))
    expect(mobilePrimaryActions).toEqual(expect.objectContaining({
      'grid-column': '1 / -1',
      'grid-row': '3',
      'justify-content': 'space-between',
      width: '100%',
    }))
  })
})
