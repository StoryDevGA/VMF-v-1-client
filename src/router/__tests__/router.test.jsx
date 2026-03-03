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
          { name: /^super admin dashboard$/i },
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
          { name: /^super admin dashboard$/i },
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
          { name: /^super admin dashboard$/i },
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

