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

  useAuthorization.mockReturnValue({
    user: { id: 'u-1', name: userName, memberships, tenantMemberships },
    isSuperAdmin,
    accessibleCustomerIds: customerIds,
    hasCustomerRole,
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

  it('renders a generic workspace for non-admin users', () => {
    mockRole({ isSuperAdmin: false, isCustomerAdmin: false })
    renderDashboard()

    expect(screen.getByRole('heading', { name: /^dashboard$/i })).toBeInTheDocument()
    expect(screen.getAllByText(/^user$/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByTestId('customer-selector')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tenant-switcher')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /value message framework unavailable/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByText(/available for customer admins and tenant admins/i)).toBeInTheDocument()
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
      '/app/administration/manage-vmfs',
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
