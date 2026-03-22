/**
 * Dashboard Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
} = {}) {
  const customerIds = accessibleCustomerIds ?? (isCustomerAdmin ? ['cust-1'] : [])
  const hasCustomerRole = vi.fn((customerId, role) => {
    if (!isCustomerAdmin) return false
    return customerIds.includes(customerId) && role === 'CUSTOMER_ADMIN'
  })

  useAuthorization.mockReturnValue({
    user: { id: 'u-1', name: userName, memberships, tenantMemberships },
    isSuperAdmin,
    accessibleCustomerIds: customerIds,
    hasCustomerRole,
  })
}

beforeEach(() => {
  vi.clearAllMocks()

  useTenantContext.mockReturnValue({
    customerId: 'cust-1',
    tenantId: null,
    tenants: [],
    resolvedTenantName: null,
    supportsTenantManagement: true,
    selectedCustomerTopology: 'MULTI_TENANT',
  })
  useGetCustomerQuery.mockReturnValue({ data: undefined })

  mockRole({ isCustomerAdmin: true })
})

describe('Dashboard page', () => {
  it('renders a minimal holding page for customer admins', () => {
    renderDashboard()

    expect(screen.getByRole('heading', { name: /customer admin workspace/i })).toBeInTheDocument()
    expect(screen.getByText(/future modules in progress/i)).toBeInTheDocument()
    expect(screen.getByText(/use the main navigation for manage users, manage tenants, monitoring, and help/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^workflow$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^quick links$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
  })

  it('shows the signed-in user name and current role', () => {
    mockRole({ userName: 'Alice Wonderland', isCustomerAdmin: true })
    renderDashboard()

    expect(screen.getByText('Alice Wonderland')).toBeInTheDocument()
    expect(screen.getAllByText('Customer Administrator')).toHaveLength(2)
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
      resolvedTenantName: null,
      supportsTenantManagement: false,
      selectedCustomerTopology: 'SINGLE_TENANT',
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
      resolvedTenantName: 'My Tenant',
      supportsTenantManagement: false,
      selectedCustomerTopology: 'SINGLE_TENANT',
    })

    renderDashboard()

    expect(screen.getAllByText('My Tenant').length).toBeGreaterThanOrEqual(1)
  })

  it('renders a generic workspace for non-admin users', () => {
    mockRole({ isSuperAdmin: false, isCustomerAdmin: false })
    renderDashboard()

    expect(screen.getByRole('heading', { name: /^workspace$/i })).toBeInTheDocument()
    expect(screen.getAllByText(/^user$/i)).toHaveLength(2)
    expect(screen.queryByTestId('customer-selector')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tenant-switcher')).not.toBeInTheDocument()
  })

  it('shows tenant administrator role when tenant membership is present', () => {
    mockRole({
      isCustomerAdmin: false,
      tenantMemberships: [{ customerId: 'cust-1', tenantId: 'ten-1', roles: ['TENANT_ADMIN'] }],
    })

    renderDashboard()

    expect(screen.getByRole('heading', { name: /tenant workspace/i })).toBeInTheDocument()
    expect(screen.getAllByText('Tenant Administrator')).toHaveLength(2)
  })
})
