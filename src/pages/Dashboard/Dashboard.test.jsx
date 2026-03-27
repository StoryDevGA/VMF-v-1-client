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

  const hasVmfWorkspaceAccess = vi.fn((customerId, tenantId, options = {}) => {
    const supportsTenantManagement = options?.supportsTenantManagement ?? true
    if (!customerId) return false
    if (isSuperAdmin) return true
    if (hasCustomerRole(customerId, 'CUSTOMER_ADMIN')) return true
    if (hasCustomerRole(customerId, 'TENANT_ADMIN')) {
      return supportsTenantManagement ? Boolean(tenantId) : true
    }

    const hasCustomerMembership = memberships.some((membership) =>
      String(membership?.customerId ?? '') === String(customerId ?? ''))

    if (!supportsTenantManagement) {
      return hasCustomerMembership
    }

    if (!tenantId) return false

    return tenantMemberships.some((membership) =>
      String(membership?.customerId ?? '') === String(customerId ?? '')
      && String(membership?.tenantId ?? '') === String(tenantId ?? ''))
  })

  useAuthorization.mockReturnValue({
    user: { id: 'u-1', name: userName, memberships, tenantMemberships },
    isSuperAdmin,
    accessibleCustomerIds: customerIds,
    hasCustomerRole,
    hasVmfWorkspaceAccess,
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

  it('renders live VMF tile for USER with single-tenant customer context', () => {
    mockRole({
      isSuperAdmin: false,
      isCustomerAdmin: false,
      accessibleCustomerIds: ['cust-1'],
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
    })
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: 'ten-1',
      tenants: [],
      selectableTenants: [],
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

  it('auto-selects the only selectable tenant on the dashboard', async () => {
    const setTenantId = vi.fn()
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: null,
      tenants: [{ id: 'ten-1', name: 'Only Tenant', status: 'ENABLED', isSelectable: true }],
      selectableTenants: [{ id: 'ten-1', name: 'Only Tenant', status: 'ENABLED', isSelectable: true }],
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
      resolvedTenantName: null,
      supportsTenantManagement: true,
      selectedCustomerTopology: 'MULTI_TENANT',
      isLoadingTenants: false,
      hasInvalidTenantContext: true,
      setTenantId,
    })

    renderDashboard()

    expect(screen.getByTestId('tenant-switcher')).toBeInTheDocument()

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
