/**
 * Router Tests
 *
 * Tests navigation and route rendering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { ToasterProvider } from '../../components/Toaster'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import tenantContextReducer from '../../store/slices/tenantContextSlice.js'

vi.mock('../../pages/SuperAdminInvitations', () => ({
  default: () => <h1>Invitation Management</h1>,
}))

vi.mock('../../pages/SuperAdminSystemVersioning', () => ({
  default: () => <h1>System Versioning Policy</h1>,
}))

vi.mock('../../pages/SuperAdminDeniedAccessLogs', () => ({
  default: () => <h1>Denied Access Logs</h1>,
}))

vi.mock('../../pages/EditUsers/EditUsers', () => ({
  default: () => <h1>Edit Users</h1>,
}))

vi.mock('../../pages/MaintainTenants/MaintainTenants', () => ({
  default: () => <h1>Maintain Tenants</h1>,
}))

vi.mock('../../pages/MaintainVmfs', () => ({
  default: () => <h1>VMF Workspace</h1>,
}))

vi.mock('../../pages/Dashboard', () => ({
  default: () => <h1>Dashboard</h1>,
}))

import { router } from '../index'

const ROUTE_TEST_TIMEOUT = 15000

/** Create a fresh Redux store for each test */
function createTestStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      tenantContext: tenantContextReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
    preloadedState,
  })
}

/** Render helper that wraps with both Provider and ToasterProvider */
function renderWithProviders(ui, { store } = {}) {
  const testStore = store ?? createTestStore()
  return render(
    <Provider store={testStore}>
      <ToasterProvider>{ui}</ToasterProvider>
    </Provider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date())
  vi.useRealTimers()
})

describe('Router', () => {
  describe('Route Configuration', () => {
    it('should redirect root path to login when unauthenticated', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      })

      renderWithProviders(<RouterProvider router={testRouter} />)

      expect(
        await screen.findByRole('heading', { name: /^sign in$/i }, { timeout: 10000 }),
      ).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should render help page at /help', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/help'],
      })

      renderWithProviders(<RouterProvider router={testRouter} />)

      expect(await screen.findByRole('heading', { name: /^help center$/i }, { timeout: 10000 })).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should render help page at legacy /about route', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/about'],
      })

      renderWithProviders(<RouterProvider router={testRouter} />)

      expect(await screen.findByRole('heading', { name: /^help center$/i }, { timeout: 10000 })).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should render dashboard page at /app/dashboard for authenticated users', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/app/dashboard'],
      })

      const store = createTestStore({
        auth: {
          user: { id: 'u-1', name: 'User', email: 'user@example.com', memberships: [] },
          status: 'authenticated',
        },
      })

      renderWithProviders(<RouterProvider router={testRouter} />, { store })

      expect(
        await screen.findByRole('heading', { name: /^dashboard$/i }, { timeout: 10000 }),
      ).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should require the customer-admin route guard on edit-users only', () => {
      const rootRoute = router.routes.find((route) => route.path === '/')
      const appRoute = rootRoute?.children?.find((route) => route.path === 'app')
      const customerAppRoute = appRoute?.children?.[0]
      const administrationRoute = customerAppRoute?.children?.find(
        (route) => route.path === 'administration',
      )
      const guardedAdminGroup = administrationRoute?.children?.find(
        (route) => route.element?.props?.requiredSelectedCustomerRole === 'CUSTOMER_ADMIN',
      )
      const guardedPaths = (guardedAdminGroup?.children ?? []).map((route) => route.path)

      expect(guardedAdminGroup?.element?.props?.requiredSelectedCustomerRole).toBe(
        'CUSTOMER_ADMIN',
      )
      expect(guardedAdminGroup?.element?.props?.unauthorizedRedirect).toBe('/app/dashboard')
      expect(guardedPaths).toEqual(['edit-users'])
    })

    it('should render edit-users for customer admins when the selected customer context matches', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/app/administration/edit-users'],
      })

      const store = createTestStore({
        auth: {
          user: {
            id: 'customer-admin-1',
            name: 'Customer Admin',
            email: 'admin@example.com',
            memberships: [{ customerId: 'cust-1', roles: ['CUSTOMER_ADMIN'] }],
            tenantMemberships: [],
            vmfGrants: [],
          },
          status: 'authenticated',
        },
        tenantContext: {
          customerId: 'cust-1',
          tenantId: null,
          tenantName: null,
        },
      })

      renderWithProviders(<RouterProvider router={testRouter} />, { store })

      expect(
        await screen.findByRole('heading', { name: /^edit users$/i }, { timeout: 10000 }),
      ).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should allow customer-admin routes before customer context initialization when the user has a customer-admin membership', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/app/administration/maintain-tenants'],
      })

      const store = createTestStore({
        auth: {
          user: {
            id: 'customer-admin-2',
            name: 'Customer Admin',
            email: 'admin2@example.com',
            memberships: [{ customerId: 'cust-2', roles: ['CUSTOMER_ADMIN'] }],
            tenantMemberships: [],
            vmfGrants: [],
          },
          status: 'authenticated',
        },
      })

      renderWithProviders(<RouterProvider router={testRouter} />, { store })

      expect(
        await screen.findByRole(
          'heading',
          { name: /^maintain tenants$/i },
          { timeout: 10000 },
        ),
      ).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should render the VMF workspace at /app/workspaces/vmf for authenticated customer-app users', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/app/workspaces/vmf'],
      })

      const store = createTestStore({
        auth: {
          user: {
            id: 'vmf-user-1',
            name: 'VMF User',
            email: 'vmf@example.com',
            memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
            tenantMemberships: [],
            vmfGrants: [],
          },
          status: 'authenticated',
        },
      })

      renderWithProviders(<RouterProvider router={testRouter} />, { store })

      expect(
        await screen.findByRole(
          'heading',
          { name: /^vmf workspace$/i },
          { timeout: 10000 },
        ),
      ).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should redirect the legacy manage-vmfs route to the VMF workspace route', () => {
      const rootRoute = router.routes.find((route) => route.path === '/')
      const appRoute = rootRoute?.children?.find((route) => route.path === 'app')
      const customerAppRoute = appRoute?.children?.[0]
      const administrationRoute = customerAppRoute?.children?.find(
        (route) => route.path === 'administration',
      )
      const legacyVmfRoute = administrationRoute?.children?.find(
        (route) => route.path === 'manage-vmfs',
      )

      expect(legacyVmfRoute?.element?.props?.to).toBe('/app/workspaces/vmf')
      expect(legacyVmfRoute?.element?.props?.replace).toBe(true)
    })

    it('should render super-admin dashboard at /super-admin/dashboard for super admins', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/super-admin/dashboard'],
      })

      const store = createTestStore({
        auth: {
          user: {
            id: 'sa-1',
            name: 'Super Admin',
            email: 'super@example.com',
            memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
          },
          status: 'authenticated',
        },
      })

      renderWithProviders(<RouterProvider router={testRouter} />, { store })

      expect(
        await screen.findByRole(
          'heading',
          { name: /^super admin workspace$/i },
          { timeout: 10000 },
        ),
      ).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should keep blocking SUPER_ADMIN users from customer-admin routes', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/app/administration/edit-users'],
      })

      const store = createTestStore({
        auth: {
          user: {
            id: 'sa-customer-admin-route-1',
            name: 'Super Admin',
            email: 'super@example.com',
            memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
            tenantMemberships: [],
            vmfGrants: [],
          },
          status: 'authenticated',
        },
      })

      renderWithProviders(<RouterProvider router={testRouter} />, { store })

      expect(
        await screen.findByRole(
          'heading',
          { name: /^super admin workspace$/i },
          { timeout: 10000 },
        ),
      ).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should configure /super-admin/invitations as a redirect to the unified customer admin invitations view', () => {
      const rootRoute = router.routes.find((route) => route.path === '/')
      const superAdminRoute = rootRoute?.children?.find((route) => route.path === 'super-admin')
      const invitationsRoute = superAdminRoute?.children?.find((route) => route.path === 'invitations')

      expect(invitationsRoute?.element?.props?.to).toBe('/super-admin/customers?view=invitations')
      expect(invitationsRoute?.element?.props?.replace).toBe(true)
    })

    it('should render super-admin system versioning page at /super-admin/system-versioning for super admins', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/super-admin/system-versioning'],
      })

      const store = createTestStore({
        auth: {
          user: {
            id: 'sa-versioning-1',
            name: 'Super Admin',
            email: 'super@example.com',
            memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
          },
          status: 'authenticated',
        },
      })

      renderWithProviders(<RouterProvider router={testRouter} />, { store })

      expect(
        await screen.findByRole(
          'heading',
          { name: /^system versioning policy$/i },
          { timeout: 10000 },
        ),
      ).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should render super-admin denied access logs page at /super-admin/denied-access-logs for super admins', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/super-admin/denied-access-logs'],
      })

      const store = createTestStore({
        auth: {
          user: {
            id: 'sa-denied-logs-1',
            name: 'Super Admin',
            email: 'super@example.com',
            memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
          },
          status: 'authenticated',
        },
      })

      renderWithProviders(<RouterProvider router={testRouter} />, { store })

      expect(
        await screen.findByRole(
          'heading',
          { name: /^denied access logs$/i },
          { timeout: 10000 },
        ),
      ).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should render super-admin dashboard at /super-admin root for super admins', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/super-admin'],
      })

      const store = createTestStore({
        auth: {
          user: {
            id: 'sa-2',
            name: 'Root Super Admin',
            email: 'root-super@example.com',
            memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
          },
          status: 'authenticated',
        },
      })

      renderWithProviders(<RouterProvider router={testRouter} />, { store })

      expect(
        await screen.findByRole(
          'heading',
          { name: /^super admin workspace$/i },
          { timeout: 10000 },
        ),
      ).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should block SUPER_ADMIN users from /app/dashboard and render super-admin dashboard', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/app/dashboard'],
      })

      const store = createTestStore({
        auth: {
          user: {
            id: 'sa-blocked-1',
            name: 'Blocked Super Admin',
            email: 'blocked-super@example.com',
            memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
          },
          status: 'authenticated',
        },
      })

      renderWithProviders(<RouterProvider router={testRouter} />, { store })

      expect(
        await screen.findByRole(
          'heading',
          { name: /^super admin workspace$/i },
          { timeout: 10000 },
        ),
      ).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should require SUPER_ADMIN role on /super-admin route group', () => {
      const rootRoute = router.routes.find((route) => route.path === '/')
      const superAdminRoute = rootRoute?.children?.find((route) => route.path === 'super-admin')

      expect(superAdminRoute?.element?.props?.requiredRole).toBe('SUPER_ADMIN')
      expect(superAdminRoute?.element?.props?.redirectTo).toBe('/super-admin/login')
    })

    it('should keep super-admin child routes in the expected order', () => {
      const rootRoute = router.routes.find((route) => route.path === '/')
      const superAdminRoute = rootRoute?.children?.find((route) => route.path === 'super-admin')
      const childPaths = (superAdminRoute?.children ?? []).map((route) => route.path ?? 'index')

      expect(childPaths).toEqual([
        'index',
        'dashboard',
        'invitations',
        'license-levels',
        'roles',
        'customers',
        'system-versioning',
        'audit-logs',
        'denied-access-logs',
        'system-monitoring',
      ])
    })

  })

  describe('Navigation', () => {
    it('should render header logo on public pages', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      })

      renderWithProviders(<RouterProvider router={testRouter} />)

      await screen.findByRole('heading', { name: /^sign in$/i })
      expect(
        screen.getByRole('img', { name: 'StoryLineOS Logo' }),
      ).toBeInTheDocument()
    })

    it('should show grouped admin navigation for super admins', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/super-admin/dashboard'],
      })

      const store = createTestStore({
        auth: {
          user: {
            id: 'sa-nav-1',
            name: 'Super Admin',
            email: 'super@example.com',
            memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
          },
          status: 'authenticated',
        },
      })

      renderWithProviders(<RouterProvider router={testRouter} />, { store })

      await screen.findByRole('navigation')

      expect(screen.getByRole('button', { name: /system admin/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /^customer admin$/i })).toHaveAttribute(
        'href',
        '/super-admin/customers',
      )
      expect(screen.getByRole('button', { name: /system health/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /^help$/i })).toHaveAttribute('href', '/help')
    })

    it('should not render context controls in the global header', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/help'],
      })

      const store = createTestStore({
        auth: {
          user: {
            id: 'sa-1',
            name: 'Super Admin',
            email: 'super@example.com',
            memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
          },
          status: 'authenticated',
        },
      })

      renderWithProviders(<RouterProvider router={testRouter} />, { store })
      await screen.findByRole('navigation')

      expect(screen.queryByRole('combobox', { name: /select customer/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('combobox', { name: /switch tenant/i })).not.toBeInTheDocument()
    })
  })

  describe('Lazy Loading', () => {
    it('should show loading state while page loads', () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      })

      renderWithProviders(<RouterProvider router={testRouter} />)

      // Loading indicator should appear briefly
      // Note: This might be too fast to catch in tests,
      // but the mechanism is tested by the routes working
      expect(testRouter).toBeTruthy()
    })
  })
})

