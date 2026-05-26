/**
 * Dashboard Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

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
    expect(screen.getByText(/no runtime activity yet/i)).toBeInTheDocument()
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
    const workTypeControl = screen.getByRole('combobox', { name: /work type/i })

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
        pageSize: 5,
      }),
      { skip: false },
    )
    expect(screen.getByRole('link', { name: /continue new package/i }))
      .toHaveAttribute('href', '/app/runtime/value-narrative-859907')
    expect(screen.getByRole('link', { name: /open 2\.3\.569357/i }))
      .toHaveAttribute('href', '/app/runtime/value-narrative-859907')
    expect(screen.getByText('New Package')).toBeInTheDocument()
    expect(screen.getByText('value-narrative-859907')).toBeInTheDocument()
    expect(screen.getByText('latest-package')).toBeInTheDocument()
    expect(screen.getByText('Idle')).toBeInTheDocument()
    expect(screen.getByText('Pending runtime engine')).toBeInTheDocument()
    expect(screen.getByText('1 available')).toBeInTheDocument()
    expect(screen.getByText('1 visible')).toBeInTheDocument()
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
    expect(within(workTable).getByRole('columnheader', { name: /health/i })).toBeInTheDocument()
    expect(within(workTable).getByRole('columnheader', { name: /updated/i })).toBeInTheDocument()
    expect(within(workTable).getByRole('columnheader', { name: /next action/i })).toBeInTheDocument()
    expect(screen.queryByText('Acme Value Narrative')).not.toBeInTheDocument()
    expect(screen.queryByText('Globex Business Case')).not.toBeInTheDocument()
    expect(screen.getByText(/no runtime instances are available for this tenant yet/i)).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: /work type/i }))
    expect(screen.getAllByRole('option')).toHaveLength(2)
    await user.click(screen.getByRole('option', { name: 'Value Narratives' }))

    expect(screen.queryByText('Acme Value Narrative')).not.toBeInTheDocument()
    expect(screen.queryByText('Globex Business Case')).not.toBeInTheDocument()
    expect(screen.getByText(/no runtime instances match the selected work type/i)).toBeInTheDocument()
    expect(screen.getByText('0 visible')).toBeInTheDocument()
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
})
