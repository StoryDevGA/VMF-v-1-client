/**
 * Dashboard Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

vi.mock('../../hooks/useAuthorization.js', () => ({
  useAuthorization: vi.fn(),
}))

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: vi.fn(),
}))

vi.mock('../../hooks/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../components/CustomerSelector', () => ({
  CustomerSelector: () => (
    <div data-testid="customer-selector">Customer Selector</div>
  ),
}))

vi.mock('../../components/TenantSwitcher', () => ({
  TenantSwitcher: () => <div data-testid="tenant-switcher">Tenant Switcher</div>,
}))

vi.mock('../../components/SystemHealthIndicator', () => ({
  SystemHealthIndicator: () => (
    <div data-testid="system-health-indicator">System Health Indicator</div>
  ),
}))

import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useAuth } from '../../hooks/useAuth.js'

const mockLogout = vi.fn().mockResolvedValue(undefined)

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
  userName = 'Test User',
} = {}) {
  const accessibleCustomerIds = isCustomerAdmin ? ['cust-1'] : []
  const hasCustomerRole = vi.fn((customerId, role) => {
    if (!isCustomerAdmin) return false
    return customerId === 'cust-1' && role === 'CUSTOMER_ADMIN'
  })

  useAuthorization.mockReturnValue({
    user: { id: 'u-1', name: userName },
    isSuperAdmin,
    accessibleCustomerIds,
    hasCustomerRole,
  })
}

beforeEach(() => {
  vi.clearAllMocks()

  useAuth.mockReturnValue({
    logout: mockLogout,
    logoutResult: { isLoading: false },
  })

  useTenantContext.mockReturnValue({
    customerId: 'cust-1',
    tenantId: null,
    tenantName: null,
    tenants: [{ _id: 'ten-1', name: 'Alpha', status: 'ENABLED' }],
    isLoadingTenants: false,
  })

  mockRole({ isCustomerAdmin: true })
})

describe('Dashboard page', () => {
  it('renders the four dashboard sections', () => {
    renderDashboard()

    expect(
      screen.getByRole('heading', { name: /^workflow$/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /^context$/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /^health$/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /^quick actions$/i }),
    ).toBeInTheDocument()
  })

  it('renders context controls on the dashboard', () => {
    renderDashboard()

    expect(screen.getByTestId('customer-selector')).toBeInTheDocument()
    expect(screen.getByTestId('tenant-switcher')).toBeInTheDocument()
    expect(screen.getByTestId('system-health-indicator')).toBeInTheDocument()
  })

  it('shows super-admin customer console tile for super admins', () => {
    mockRole({ isSuperAdmin: true, isCustomerAdmin: false })
    renderDashboard()

    expect(
      screen.getByRole('link', { name: /open customer console/i }),
    ).toBeInTheDocument()
  })

  it('hides super-admin customer console tile for customer admins', () => {
    mockRole({ isSuperAdmin: false, isCustomerAdmin: true })
    renderDashboard()

    expect(
      screen.queryByRole('link', { name: /open customer console/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /open manage users/i }),
    ).toBeInTheDocument()
  })

  it('shows non-admin workflow tile and hides admin-only tiles', () => {
    mockRole({ isSuperAdmin: false, isCustomerAdmin: false })
    renderDashboard()

    expect(
      screen.getByRole('link', { name: /open product overview/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /open manage users/i }),
    ).not.toBeInTheDocument()
  })

  it('disables customer-scoped workflow tiles when no customer is selected', () => {
    useTenantContext.mockReturnValue({
      customerId: null,
      tenantId: null,
      tenantName: null,
      tenants: [],
      isLoadingTenants: false,
    })

    renderDashboard()

    const usersLink = screen.getByRole('link', { name: /open manage users/i })
    expect(usersLink).toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getAllByText(/select a customer in the context panel/i).length,
    ).toBeGreaterThanOrEqual(1)
  })

  it('calls logout from quick actions', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await user.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('displays the signed-in user name', () => {
    mockRole({ userName: 'Alice Wonderland', isCustomerAdmin: true })
    renderDashboard()

    expect(screen.getByText('Alice Wonderland')).toBeInTheDocument()
    expect(screen.getByText(/signed in as/i)).toBeInTheDocument()
  })

  it('shows "Super Administrator" role for super admins', () => {
    mockRole({ isSuperAdmin: true })
    renderDashboard()

    expect(screen.getByText('Super Administrator')).toBeInTheDocument()
  })

  it('shows "Customer Administrator" role for customer admins', () => {
    mockRole({ isCustomerAdmin: true })
    renderDashboard()

    expect(screen.getByText('Customer Administrator')).toBeInTheDocument()
  })

  it('shows "User" role for non-admin users', () => {
    mockRole({ isSuperAdmin: false, isCustomerAdmin: false })
    renderDashboard()

    expect(screen.getByText('User')).toBeInTheDocument()
  })

  it('hides tenant switcher when no customer context is set', () => {
    useTenantContext.mockReturnValue({
      customerId: null,
      tenantId: null,
      tenantName: null,
      tenants: [],
      isLoadingTenants: false,
    })
    renderDashboard()

    expect(
      screen.getByText(/select a customer to unlock/i),
    ).toBeInTheDocument()
  })
})
