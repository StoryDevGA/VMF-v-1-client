/**
 * Dashboard Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

vi.mock('../../components/CustomerSelector', () => ({
  CustomerSelector: () => <div data-testid="customer-selector">Customer Selector</div>,
}))

vi.mock('../../components/TenantSwitcher', () => ({
  TenantSwitcher: () => <div data-testid="tenant-switcher">Tenant Switcher</div>,
}))

import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useGetCustomerQuery } from '../../store/api/customerApi.js'

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/app/dashboard']}>
      <Dashboard />
    </MemoryRouter>,
  )
}

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
  const getAccessibleTenants = vi.fn((customerId) =>
    (tenantMemberships ?? [])
      .filter((membership) => String(membership?.customerId ?? '') === String(customerId ?? ''))
      .map((membership) => String(membership?.tenantId ?? ''))
      .filter(Boolean))
  const hasCustomerRole = vi.fn((customerId, role) => {
    if (!isCustomerAdmin) return false
    return customerIds.includes(customerId) && role === 'CUSTOMER_ADMIN'
  })

  if (!isCustomerAdmin) {
    hasCustomerRole.mockImplementation((customerId, role) =>
      customerIds.includes(customerId) && memberships.some((membership) =>
        String(membership?.customerId ?? '') === String(customerId ?? '')
        && (membership?.roles ?? []).includes(role)))
  }

  const hasCustomerPermission = vi.fn((customerId, _permission) => {
    if (!customerId) return false
    if (isSuperAdmin) return true
    return isCustomerAdmin && customerIds.includes(customerId)
  })

  const hasTenantPermission = vi.fn((customerId, tenantId, _permission) => {
    if (!customerId || !tenantId) return false
    if (isSuperAdmin) return true
    return (tenantMemberships ?? []).some(
      (membership) =>
        String(membership?.customerId ?? '') === String(customerId ?? '')
        && String(membership?.tenantId ?? '') === String(tenantId ?? ''),
    )
  })

  useAuthorization.mockReturnValue({
    user: { id: 'u-1', name: userName, memberships, tenantMemberships },
    isSuperAdmin,
    accessibleCustomerIds: customerIds,
    hasCustomerRole,
    hasCustomerPermission,
    hasTenantPermission,
    getAccessibleTenants,
    getFeatureEntitlements: vi.fn(() => featureEntitlements),
    getEntitlementSource: vi.fn(() => entitlementSource),
  })
}

beforeEach(() => {
  vi.clearAllMocks()

  useTenantContext.mockReturnValue({
    customerId: 'cust-1',
    tenantId: null,
    tenants: [
      { id: 'ten-1', name: 'Alpha Tenant', status: 'ENABLED', isSelectable: true },
      { id: 'ten-2', name: 'Beta Tenant', status: 'ENABLED', isSelectable: true },
    ],
    selectableTenants: [
      { id: 'ten-1', name: 'Alpha Tenant', status: 'ENABLED', isSelectable: true },
      { id: 'ten-2', name: 'Beta Tenant', status: 'ENABLED', isSelectable: true },
    ],
    canViewTenants: true,
    resolvedTenantName: null,
    supportsTenantManagement: true,
    selectedCustomerTopology: 'MULTI_TENANT',
    isLoadingTenants: false,
    hasInvalidTenantContext: false,
    setTenantId: vi.fn(),
  })
  useGetCustomerQuery.mockReturnValue({ data: undefined })

  mockRole({ isCustomerAdmin: true })
})

describe('Dashboard page', () => {
  it('renders workflow tiles instead of the holding page for customer admins', () => {
    renderDashboard()

    expect(screen.getByRole('heading', { name: /^dashboard$/i })).toBeInTheDocument()
    expect(screen.getByText(/home page/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /workflow tiles/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /value message framework/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /deal making/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^views$/i })).toBeInTheDocument()
    expect(screen.queryByText(/future modules in progress/i)).not.toBeInTheDocument()
  })

  it('shows the signed-in user name and current role', () => {
    mockRole({ userName: 'Alice Wonderland', isCustomerAdmin: true })
    renderDashboard()

    expect(screen.getByText('Alice Wonderland')).toBeInTheDocument()
    expect(screen.getAllByText('Customer Administrator').length).toBeGreaterThanOrEqual(1)
  })

  it('renders licensed feature summary from customerScopes metadata', () => {
    renderDashboard()

    expect(screen.getByText('VMF, DEALS (Licence level)')).toBeInTheDocument()
  })

  it('renders customer scope using customer display name when available', () => {
    mockRole({
      isCustomerAdmin: true,
      memberships: [
        {
          customerId: 'cust-1',
          roles: ['CUSTOMER_ADMIN'],
          customer: { name: 'Orbit Services' },
        },
      ],
    })

    renderDashboard()

    expect(screen.getByText('Orbit Services')).toBeInTheDocument()
  })

  it('falls back to a readable label when no customer display name is available', () => {
    mockRole({
      isCustomerAdmin: true,
      memberships: [{ customerId: 'cust-1', roles: ['CUSTOMER_ADMIN'] }],
    })

    renderDashboard()

    expect(screen.getByText('Current customer')).toBeInTheDocument()
  })

  it('does not reuse the tenant label as the customer scope fallback', () => {
    mockRole({
      isSuperAdmin: false,
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
    })
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: null,
      tenants: [],
      selectableTenants: [],
      canViewTenants: false,
      resolvedTenantName: 'Aldi',
      supportsTenantManagement: true,
      selectedCustomerTopology: 'MULTI_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: false,
      setTenantId: vi.fn(),
    })

    renderDashboard()

    expect(screen.getByText('Current customer')).toBeInTheDocument()
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

    expect(screen.getByText('Northwind Logistics')).toBeInTheDocument()
  })

  it('shows only the tenant switcher for a single-customer multi-tenant admin', () => {
    renderDashboard()

    expect(screen.queryByTestId('customer-selector')).not.toBeInTheDocument()
    expect(screen.getByTestId('tenant-switcher')).toBeInTheDocument()
  })

  it('hides the tenant switcher and auto-selects the only accessible tenant for a standard user', async () => {
    const setTenantId = vi.fn()
    mockRole({
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
      tenantMemberships: [{ customerId: 'cust-1', tenantId: 'ten-1', roles: ['USER'] }],
    })
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: null,
      tenants: [
        { id: 'ten-1', name: 'Only Tenant', status: 'ENABLED', isSelectable: true },
        { id: 'ten-2', name: 'Secondary Tenant', status: 'ENABLED', isSelectable: true },
      ],
      selectableTenants: [
        { id: 'ten-1', name: 'Only Tenant', status: 'ENABLED', isSelectable: true },
      ],
      canViewTenants: true,
      resolvedTenantName: null,
      supportsTenantManagement: true,
      selectedCustomerTopology: 'MULTI_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: false,
      setTenantId,
    })

    renderDashboard()

    expect(screen.queryByTestId('tenant-switcher')).not.toBeInTheDocument()
    expect(screen.getByText('Single-tenant')).toBeInTheDocument()

    await waitFor(() => {
      expect(setTenantId).toHaveBeenCalledWith('ten-1', 'Only Tenant')
    })
  })

  it('shows customer and tenant scope controls when the admin can switch customers', () => {
    mockRole({ isCustomerAdmin: true, accessibleCustomerIds: ['cust-1', 'cust-2'] })
    renderDashboard()

    expect(screen.getByTestId('customer-selector')).toBeInTheDocument()
    expect(screen.getByTestId('tenant-switcher')).toBeInTheDocument()
  })

  it('suppresses the tenant switcher for single-tenant context', () => {
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: null,
      tenants: [],
      selectableTenants: [],
      canViewTenants: false,
      resolvedTenantName: null,
      supportsTenantManagement: false,
      selectedCustomerTopology: 'SINGLE_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: false,
      setTenantId: vi.fn(),
    })

    renderDashboard()

    expect(screen.queryByTestId('tenant-switcher')).not.toBeInTheDocument()
    expect(screen.getByText('Single-tenant customer')).toBeInTheDocument()
  })

  it('renders the selected tenant name for single-tenant scope when available', () => {
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: 'ten-1',
      tenants: [],
      selectableTenants: [],
      canViewTenants: false,
      resolvedTenantName: 'My Tenant',
      supportsTenantManagement: false,
      selectedCustomerTopology: 'SINGLE_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: false,
      setTenantId: vi.fn(),
    })

    renderDashboard()

    expect(screen.getAllByText('My Tenant').length).toBeGreaterThanOrEqual(1)
  })

  it('keeps the VMF tile disabled for a multi-tenant USER without tenant scope', () => {
    mockRole({
      isSuperAdmin: false,
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
    })
    renderDashboard()

    expect(screen.getByRole('heading', { name: /^dashboard$/i })).toBeInTheDocument()
    expect(screen.getAllByText(/^user$/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByTestId('customer-selector')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /value message framework unavailable/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(
      screen.getByText(/available when the selected tenant is within your vmf workspace scope/i),
    ).toBeInTheDocument()
  })

  it('renders live VMF tile for USER with single-tenant customer context and VMF_VIEW permission', () => {
    mockRole({
      isSuperAdmin: false,
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
      tenantMemberships: [{ customerId: 'cust-1', tenantId: 'ten-1', roles: ['USER'] }],
    })
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: 'ten-1',
      tenants: [],
      selectableTenants: [],
      canViewTenants: false,
      resolvedTenantName: 'Default Tenant',
      supportsTenantManagement: false,
      selectedCustomerTopology: 'SINGLE_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: false,
      setTenantId: vi.fn(),
    })

    renderDashboard()

    expect(screen.getByRole('link', { name: /open value message framework/i })).toHaveAttribute(
      'href',
      '/app/workspaces/vmf',
    )
  })

  it('renders role-gated VMF tile for USER with no customer membership', () => {
    mockRole({
      isSuperAdmin: false,
      isCustomerAdmin: false,
      accessibleCustomerIds: [],
      memberships: [],
      tenantMemberships: [],
    })
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: null,
      tenants: [],
      selectableTenants: [],
      canViewTenants: false,
      resolvedTenantName: null,
      supportsTenantManagement: false,
      selectedCustomerTopology: null,
      isLoadingTenants: false,
      hasInvalidTenantContext: false,
      setTenantId: vi.fn(),
    })

    renderDashboard()

    expect(screen.getByRole('link', { name: /value message framework unavailable/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(
      screen.getByText(/available when the selected customer scope includes vmf workspace access/i),
    ).toBeInTheDocument()
  })

  it('shows Tenant Administrator label for customer-scoped TENANT_ADMIN', () => {
    mockRole({
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['TENANT_ADMIN'] }],
    })

    renderDashboard()

    expect(screen.getAllByText('Tenant Administrator').length).toBeGreaterThanOrEqual(1)
  })

  it('keeps the current-scope role at User when tenant-admin access exists only in another customer', () => {
    mockRole({
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1', 'cust-2'],
      memberships: [
        { customerId: 'cust-1', roles: ['USER'] },
        { customerId: 'cust-2', roles: ['TENANT_ADMIN'] },
      ],
    })
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: null,
      tenants: [],
      selectableTenants: [],
      canViewTenants: false,
      resolvedTenantName: null,
      supportsTenantManagement: true,
      selectedCustomerTopology: 'MULTI_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: false,
      setTenantId: vi.fn(),
    })

    renderDashboard()

    expect(screen.getAllByText(/^user$/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Tenant Administrator')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tenant-switcher')).not.toBeInTheDocument()
  })

  it('keeps the current-scope role at User when customer-admin access exists only in another customer', () => {
    mockRole({
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1', 'cust-2'],
      memberships: [
        { customerId: 'cust-1', roles: ['USER'] },
        { customerId: 'cust-2', roles: ['CUSTOMER_ADMIN'] },
      ],
    })
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: null,
      tenants: [],
      selectableTenants: [],
      canViewTenants: false,
      resolvedTenantName: null,
      supportsTenantManagement: true,
      selectedCustomerTopology: 'MULTI_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: false,
      setTenantId: vi.fn(),
    })

    renderDashboard()

    expect(screen.getAllByText(/^user$/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Customer Administrator')).not.toBeInTheDocument()
    expect(screen.getByTestId('customer-selector')).toBeInTheDocument()
    expect(screen.queryByTestId('tenant-switcher')).not.toBeInTheDocument()
  })

  it('does not auto-select tenant context for a multi-tenant USER without tenant access', () => {
    const setTenantId = vi.fn()
    mockRole({
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
    })
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: null,
      tenants: [{ id: 'ten-1', name: 'Only Tenant', status: 'ENABLED', isSelectable: true }],
      selectableTenants: [{ id: 'ten-1', name: 'Only Tenant', status: 'ENABLED', isSelectable: true }],
      canViewTenants: false,
      resolvedTenantName: null,
      supportsTenantManagement: true,
      selectedCustomerTopology: 'MULTI_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: false,
      setTenantId,
    })

    renderDashboard()

    expect(setTenantId).not.toHaveBeenCalled()
    expect(screen.queryByTestId('tenant-switcher')).not.toBeInTheDocument()
    expect(screen.getByText('Not selected')).toBeInTheDocument()
  })

  it('shows tenant administrator role when tenant membership is present', () => {
    mockRole({
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      tenantMemberships: [{ customerId: 'cust-1', tenantId: 'ten-1', roles: ['TENANT_ADMIN'] }],
    })
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: 'ten-1',
      tenants: [{ id: 'ten-1', name: 'North Tenant', status: 'ENABLED', isSelectable: true }],
      selectableTenants: [{ id: 'ten-1', name: 'North Tenant', status: 'ENABLED', isSelectable: true }],
      canViewTenants: true,
      resolvedTenantName: 'North Tenant',
      supportsTenantManagement: true,
      selectedCustomerTopology: 'MULTI_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: false,
      setTenantId: vi.fn(),
    })

    renderDashboard()

    expect(screen.getAllByText('Tenant Administrator').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('link', { name: /open value message framework/i })).toHaveAttribute(
      'href',
      '/app/workspaces/vmf',
    )
  })

  it('shows the tenant switcher for multi-tenant users with tenant memberships', () => {
    mockRole({
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      tenantMemberships: [
        { customerId: 'cust-1', tenantId: 'ten-1', roles: ['USER'] },
        { customerId: 'cust-1', tenantId: 'ten-2', roles: ['USER'] },
      ],
    })

    renderDashboard()

    expect(screen.getByTestId('tenant-switcher')).toBeInTheDocument()
    expect(screen.getByText(/no tenant selected/i)).toBeInTheDocument()
  })

  it('hides tenant selection for a tenant admin when TENANT_VIEW is removed', () => {
    mockRole({
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['TENANT_ADMIN', 'USER'] }],
      tenantMemberships: [{ customerId: 'cust-1', tenantId: 'ten-1', roles: ['TENANT_ADMIN'] }],
    })
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: null,
      tenants: [{ id: 'ten-1', name: 'North Tenant', status: 'ENABLED', isSelectable: true }],
      selectableTenants: [],
      canViewTenants: false,
      resolvedTenantName: null,
      supportsTenantManagement: true,
      selectedCustomerTopology: 'MULTI_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: false,
      setTenantId: vi.fn(),
    })

    renderDashboard()

    expect(screen.queryByTestId('tenant-switcher')).not.toBeInTheDocument()
    expect(screen.getByText('Not selected')).toBeInTheDocument()
  })

  it('does not ask a user to select a tenant when VMF view exists but tenant selection is unavailable', () => {
    useAuthorization.mockReturnValue({
      user: {
        id: 'u-1',
        name: 'Gus G',
        memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
        tenantMemberships: [],
      },
      isSuperAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      hasCustomerRole: vi.fn(() => false),
      hasCustomerPermission: vi.fn((_customerId, permission) => permission === 'VMF_VIEW'),
      hasTenantPermission: vi.fn(() => false),
      getFeatureEntitlements: vi.fn(() => ['VMF', 'DEALS', 'VIEWS']),
      getEntitlementSource: vi.fn(() => 'LICENSE_LEVEL'),
    })
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: null,
      tenants: [],
      selectableTenants: [],
      canViewTenants: false,
      resolvedTenantName: null,
      supportsTenantManagement: true,
      selectedCustomerTopology: 'MULTI_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: false,
      setTenantId: vi.fn(),
    })

    renderDashboard()

    expect(screen.getByRole('link', { name: /value message framework unavailable/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.queryByText(/select a tenant to open the vmf workspace/i)).not.toBeInTheDocument()
    expect(
      screen.getByText(/available when the current scope includes tenant visibility and a selected tenant/i),
    ).toBeInTheDocument()
  })

  it('auto-selects the only selectable tenant on the dashboard', async () => {
    const setTenantId = vi.fn()
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: null,
      tenants: [{ id: 'ten-1', name: 'Only Tenant', status: 'ENABLED', isSelectable: true }],
      selectableTenants: [{ id: 'ten-1', name: 'Only Tenant', status: 'ENABLED', isSelectable: true }],
      canViewTenants: true,
      resolvedTenantName: null,
      supportsTenantManagement: true,
      selectedCustomerTopology: 'MULTI_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: false,
      setTenantId,
    })

    renderDashboard()

    await waitFor(() => {
      expect(setTenantId).toHaveBeenCalledWith('ten-1', 'Only Tenant')
    })
  })

  it('recovers invalid persisted tenant context when only one selectable tenant remains', async () => {
    const setTenantId = vi.fn()
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: 'ghost-tenant',
      tenants: [{ id: 'ten-1', name: 'Only Tenant', status: 'ENABLED', isSelectable: true }],
      selectableTenants: [{ id: 'ten-1', name: 'Only Tenant', status: 'ENABLED', isSelectable: true }],
      canViewTenants: true,
      resolvedTenantName: null,
      supportsTenantManagement: true,
      selectedCustomerTopology: 'MULTI_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: true,
      setTenantId,
    })

    renderDashboard()

    expect(screen.queryByTestId('tenant-switcher')).not.toBeInTheDocument()
    expect(screen.getByText('Selection needs review')).toBeInTheDocument()
    expect(screen.getByText('Choose another tenant')).toBeInTheDocument()

    await waitFor(() => {
      expect(setTenantId).toHaveBeenCalledWith('ten-1', 'Only Tenant')
    })
  })

  it('keeps the VMF tile disabled for customer admins until a tenant is selected in multi-tenant mode', () => {
    renderDashboard()

    expect(screen.getByRole('link', { name: /value message framework unavailable/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByText(/select a tenant to open the vmf workspace/i)).toBeInTheDocument()
  })

  it('marks deal making and views as planned while routes are unavailable', () => {
    renderDashboard()

    expect(screen.getByRole('link', { name: /deal making coming soon/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('link', { name: /views coming soon/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(
      screen.getAllByText(/customer-app route is not yet available in the current frontend build/i),
    ).toHaveLength(2)
  })

  it('surfaces invalid tenant context in the dashboard summary', () => {
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: 'ghost-tenant',
      tenants: [{ id: 'ten-1', name: 'Alpha Tenant', status: 'ENABLED', isSelectable: true }],
      selectableTenants: [{ id: 'ten-1', name: 'Alpha Tenant', status: 'ENABLED', isSelectable: true }],
      canViewTenants: true,
      resolvedTenantName: null,
      supportsTenantManagement: true,
      selectedCustomerTopology: 'MULTI_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: true,
      setTenantId: vi.fn(),
    })

    renderDashboard()

    expect(screen.getByText(/selection needs review/i)).toBeInTheDocument()
    expect(screen.getByText(/choose another tenant/i)).toBeInTheDocument()
  })
})
