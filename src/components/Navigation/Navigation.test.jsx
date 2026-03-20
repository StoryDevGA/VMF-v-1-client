/**
 * Navigation component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'

import Navigation from './Navigation.jsx'
import authReducer from '../../store/slices/authSlice.js'
import tenantContextReducer from '../../store/slices/tenantContextSlice.js'
import { baseApi } from '../../store/api/baseApi.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useListTenantsQuery } from '../../store/api/tenantApi.js'

vi.mock('../../hooks/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../store/api/tenantApi.js', () => ({
  useListTenantsQuery: vi.fn(),
}))

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () { this.open = true })
  HTMLDialogElement.prototype.close = vi.fn(function () { this.open = false })
  useAuth.mockReturnValue({
    logout: mockLogout,
    logoutResult: { isLoading: false },
  })
  useListTenantsQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
  })
  mockLogout.mockClear()
})

const anonymousUser = null

const customerAdminUser = {
  id: 'user-1',
  email: 'admin@acme.com',
  name: 'Admin',
  isActive: true,
  memberships: [{ customerId: 'cust-1', roles: ['CUSTOMER_ADMIN'] }],
  tenantMemberships: [],
  vmfGrants: [],
}

const multiTenantCustomerAdminUser = {
  ...customerAdminUser,
  memberships: [
    {
      customerId: 'cust-1',
      roles: ['CUSTOMER_ADMIN'],
      customer: { topology: 'MULTI_TENANT' },
    },
  ],
}

const singleTenantCustomerAdminUser = {
  ...customerAdminUser,
  memberships: [
    {
      customerId: 'cust-1',
      roles: ['CUSTOMER_ADMIN'],
      customer: { topology: 'SINGLE_TENANT' },
    },
  ],
}

const nestedCustomerAdminUser = {
  ...customerAdminUser,
  memberships: [
    {
      customer: { id: 'cust-1', topology: 'SINGLE_TENANT' },
      roles: ['CUSTOMER_ADMIN'],
    },
  ],
}

const superAdminUser = {
  id: 'user-2',
  email: 'super@vmf.io',
  name: 'Super Admin',
  isActive: true,
  memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
  tenantMemberships: [],
  vmfGrants: [],
}

const basicUser = {
  id: 'user-3',
  email: 'basic@acme.com',
  name: 'Basic',
  isActive: true,
  memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
  tenantMemberships: [],
  vmfGrants: [],
}

const tenantAdminOnlyUser = {
  id: 'user-4',
  email: 'tenant.admin@acme.com',
  name: 'Tenant Admin',
  isActive: true,
  memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
  tenantMemberships: [{ customerId: 'cust-1', tenantId: 'tenant-1', roles: ['TENANT_ADMIN'] }],
  vmfGrants: [],
}

const mockLogout = vi.fn().mockResolvedValue(undefined)

function createTestStore(user, status = 'authenticated', tenantContextState = {}) {
  return configureStore({
    reducer: {
      auth: authReducer,
      tenantContext: tenantContextReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
    preloadedState: {
      auth: { user, status },
      tenantContext: {
        customerId: null,
        tenantId: null,
        tenantName: null,
        ...tenantContextState,
      },
    },
  })
}

function renderNavigation(store, onLinkClick, initialEntries = ['/']) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <Navigation onLinkClick={onLinkClick} />
      </MemoryRouter>
    </Provider>,
  )
}

describe('Navigation', () => {
  it('does not render admin menus for unauthenticated users', () => {
    const store = createTestStore(anonymousUser, 'idle')
    renderNavigation(store)

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('renders help and sign-out navigation for basic users', () => {
    const store = createTestStore(basicUser)
    renderNavigation(store)

    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^help$/i })).toHaveAttribute('href', '/help')
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /system admin/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /system health/i })).not.toBeInTheDocument()
  })

  it('shows Admin and System Health menus for CUSTOMER_ADMIN', async () => {
    const user = userEvent.setup()
    const store = createTestStore(multiTenantCustomerAdminUser, 'authenticated', {
      customerId: 'cust-1',
    })
    renderNavigation(store)

    expect(screen.getByRole('button', { name: /^admin$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /system health/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /system admin/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^customer admin$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^help$/i })).toHaveAttribute('href', '/help')
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^admin$/i }))
    expect(screen.getByRole('link', { name: /manage users/i })).toHaveAttribute(
      'href',
      '/app/administration/edit-users',
    )
    expect(screen.getByRole('link', { name: /manage tenants/i })).toHaveAttribute(
      'href',
      '/app/administration/maintain-tenants',
    )

    await user.click(screen.getByRole('button', { name: /system health/i }))
    expect(screen.getByRole('link', { name: /monitoring/i })).toHaveAttribute(
      'href',
      '/app/administration/system-monitoring',
    )
    expect(screen.queryByRole('link', { name: /audit logs/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /denied access/i })).not.toBeInTheDocument()
  })

  it('hides Manage Tenants from the Admin menu for a selected single-tenant customer', async () => {
    const user = userEvent.setup()
    const store = createTestStore(singleTenantCustomerAdminUser, 'authenticated', {
      customerId: 'cust-1',
    })
    renderNavigation(store)

    await user.click(screen.getByRole('button', { name: /^admin$/i }))

    expect(screen.getByRole('link', { name: /manage users/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /manage tenants/i })).not.toBeInTheDocument()
  })

  it('hides Manage Tenants while selected customer topology is unresolved', async () => {
    const user = userEvent.setup()
    const store = createTestStore(customerAdminUser, 'authenticated', {
      customerId: 'cust-1',
    })
    renderNavigation(store)

    await user.click(screen.getByRole('button', { name: /^admin$/i }))

    expect(screen.getByRole('link', { name: /manage users/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /manage tenants/i })).not.toBeInTheDocument()
  })

  it('keeps the Admin menu available when customer-admin membership uses a nested customer id', async () => {
    const user = userEvent.setup()
    const store = createTestStore(nestedCustomerAdminUser, 'authenticated', {
      customerId: 'cust-1',
    })
    renderNavigation(store)

    await user.click(screen.getByRole('button', { name: /^admin$/i }))

    expect(screen.getByRole('link', { name: /manage users/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /manage tenants/i })).not.toBeInTheDocument()
  })

  it('shows Manage Tenants when tenant metadata resolves the selected customer as multi-tenant', async () => {
    const user = userEvent.setup()
    useListTenantsQuery.mockReturnValue({
      data: {
        data: [],
        meta: {
          tenantVisibility: {
            mode: 'GUIDED',
            allowed: true,
            topology: 'MULTI_TENANT',
            isServiceProvider: true,
            selectableStatuses: ['ENABLED'],
          },
        },
      },
      isLoading: false,
      error: null,
    })
    const store = createTestStore(customerAdminUser, 'authenticated', {
      customerId: 'cust-1',
    })
    renderNavigation(store)

    await user.click(screen.getByRole('button', { name: /^admin$/i }))

    expect(screen.getByRole('link', { name: /manage users/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /manage tenants/i })).toHaveAttribute(
      'href',
      '/app/administration/maintain-tenants',
    )
  })

  it('hides Manage Tenants before customer context initializes for a single-tenant customer admin', async () => {
    const user = userEvent.setup()
    const store = createTestStore(singleTenantCustomerAdminUser)
    renderNavigation(store)

    await user.click(screen.getByRole('button', { name: /^admin$/i }))

    expect(screen.getByRole('link', { name: /manage users/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /manage tenants/i })).not.toBeInTheDocument()
  })

  it('hides Manage Tenants before customer context initializes when membership has no topology data', async () => {
    const user = userEvent.setup()
    const store = createTestStore(customerAdminUser)
    renderNavigation(store)

    await user.click(screen.getByRole('button', { name: /^admin$/i }))

    expect(screen.getByRole('link', { name: /manage users/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /manage tenants/i })).not.toBeInTheDocument()
  })

  it('shows Manage Tenants for tenant-admin users and hides Manage Users', async () => {
    const user = userEvent.setup()
    const store = createTestStore(tenantAdminOnlyUser)
    renderNavigation(store)

    await user.click(screen.getByRole('button', { name: /^admin$/i }))

    expect(screen.queryByRole('link', { name: /manage users/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /manage tenants/i })).toHaveAttribute(
      'href',
      '/app/administration/maintain-tenants',
    )
  })

  it('keeps Manage Tenants available before customer context initializes for a multi-tenant customer admin', async () => {
    const user = userEvent.setup()
    const store = createTestStore({
      ...customerAdminUser,
      memberships: [
        {
          customerId: 'cust-1',
          roles: ['CUSTOMER_ADMIN'],
          customer: { topology: 'MULTI_TENANT' },
        },
      ],
    })
    renderNavigation(store)

    await user.click(screen.getByRole('button', { name: /^admin$/i }))

    expect(screen.getByRole('link', { name: /manage users/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /manage tenants/i })).toHaveAttribute(
      'href',
      '/app/administration/maintain-tenants',
    )
  })

  it('shows system admin submenu links for SUPER_ADMIN', async () => {
    const user = userEvent.setup()
    const store = createTestStore(superAdminUser)
    renderNavigation(store)

    expect(screen.getByRole('button', { name: /system admin/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^customer admin$/i })).toHaveAttribute(
      'href',
      '/super-admin/customers',
    )
    expect(screen.getByRole('link', { name: /^help$/i })).toHaveAttribute('href', '/help')
    await user.click(screen.getByRole('button', { name: /system admin/i }))

    expect(screen.getByRole('link', { name: /versioning/i })).toHaveAttribute(
      'href',
      '/super-admin/system-versioning',
    )
    expect(screen.getByRole('link', { name: /licence maintenance/i })).toHaveAttribute(
      'href',
      '/super-admin/license-levels',
    )
  })

  it('renders the super-admin top-level menu in locked order', () => {
    const store = createTestStore(superAdminUser)
    renderNavigation(store)

    const primaryMenu = screen.getByRole('list', { name: /primary menu/i })
    const topLevelItems = Array.from(primaryMenu.children)

    expect(within(topLevelItems[0]).getByRole('button', { name: /^system admin$/i })).toBeInTheDocument()
    expect(within(topLevelItems[1]).getByRole('link', { name: /^customer admin$/i })).toHaveAttribute(
      'href',
      '/super-admin/customers',
    )
    expect(within(topLevelItems[2]).getByRole('button', { name: /^system health$/i })).toBeInTheDocument()
    expect(within(topLevelItems[3]).getByRole('link', { name: /^help$/i })).toHaveAttribute(
      'href',
      '/help',
    )
    expect(within(topLevelItems[4]).getByRole('button', { name: /^sign out$/i })).toBeInTheDocument()
  })

  it('does not render a Dashboard top-level menu item for SUPER_ADMIN', () => {
    const store = createTestStore(superAdminUser)
    renderNavigation(store)

    expect(screen.queryByRole('link', { name: /^dashboard$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^dashboard$/i })).not.toBeInTheDocument()
  })

  it('shows system health submenu links for SUPER_ADMIN', async () => {
    const user = userEvent.setup()
    const store = createTestStore(superAdminUser)
    renderNavigation(store)

    await user.click(screen.getByRole('button', { name: /system health/i }))
    expect(screen.getByRole('link', { name: /monitoring/i })).toHaveAttribute(
      'href',
      '/super-admin/system-monitoring',
    )
    expect(screen.getByRole('link', { name: /audit logs/i })).toHaveAttribute(
      'href',
      '/super-admin/audit-logs',
    )
    expect(screen.getByRole('link', { name: /denied access/i })).toHaveAttribute(
      'href',
      '/super-admin/denied-access-logs',
    )
  })

  it('calls onLinkClick when submenu link is clicked', async () => {
    const user = userEvent.setup()
    const onLinkClick = vi.fn()
    const store = createTestStore(superAdminUser)
    renderNavigation(store, onLinkClick)

    await user.click(screen.getByRole('button', { name: /system admin/i }))
    await user.click(screen.getByRole('link', { name: /versioning/i }))
    expect(onLinkClick).toHaveBeenCalled()
  })

  it('marks active submenu link with correct class', async () => {
    const user = userEvent.setup()
    const store = createTestStore(superAdminUser)
    renderNavigation(store, undefined, ['/super-admin/system-versioning'])

    await user.click(screen.getByRole('button', { name: /system admin/i }))
    const versioningLink = screen.getByRole('link', { name: /versioning/i })
    expect(versioningLink.className).toMatch(/active/i)
  })

  it('closes an open submenu when Escape is pressed', async () => {
    const user = userEvent.setup()
    const store = createTestStore(superAdminUser)
    renderNavigation(store)

    await user.click(screen.getByRole('button', { name: /system admin/i }))
    expect(screen.getByRole('link', { name: /versioning/i })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('link', { name: /versioning/i })).not.toBeInTheDocument()
  })

  it('renders navigation with expected accessibility attributes', () => {
    const store = createTestStore(superAdminUser)
    renderNavigation(store)

    const navigation = screen.getByRole('navigation', { name: /main navigation/i })
    expect(navigation).toHaveAttribute('id', 'mobile-navigation')
    expect(screen.getByRole('button', { name: /system admin/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('renders Sign Out as the last top-level navigation item for admin users', () => {
    const store = createTestStore(superAdminUser)
    renderNavigation(store)

    const primaryMenu = screen.getByRole('list', { name: /primary menu/i })
    const topLevelItems = Array.from(primaryMenu.children)
    const lastItem = topLevelItems[topLevelItems.length - 1]

    expect(within(lastItem).getByRole('button', { name: /^sign out$/i })).toBeInTheDocument()
  })

  it('calls logout when Sign Out is clicked', async () => {
    const user = userEvent.setup()
    const store = createTestStore(customerAdminUser, 'authenticated', { customerId: 'cust-1' })
    renderNavigation(store)

    await user.click(screen.getByRole('button', { name: /^sign out$/i }))

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })
})
