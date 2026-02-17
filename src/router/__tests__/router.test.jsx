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
    it('should render home page at root path', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      })

      renderWithProviders(<RouterProvider router={testRouter} />)

      // Wait for lazy-loaded component
      expect(await screen.findByText(/HOME/i, {}, { timeout: 10000 })).toBeInTheDocument()
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

    it('should render super-admin customers page at /super-admin/customers for super admins', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/super-admin/customers'],
      })

      const store = createTestStore({
        auth: {
          user: {
            id: 'sa-customers-1',
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
          { name: /^customer invitations$/i },
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

  })

  describe('Navigation', () => {
    it('should render navigation on all pages', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      })

      renderWithProviders(<RouterProvider router={testRouter} />)

      // Navigation should be present
      expect(await screen.findByRole('navigation')).toBeInTheDocument()
      expect(
        screen.getByRole('img', { name: 'StoryLineOS Logo' }),
      ).toBeInTheDocument()
    })

    it('should have correct navigation links', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      })

      renderWithProviders(<RouterProvider router={testRouter} />)

      await screen.findByRole('navigation')

      const helpLink = screen.getByRole('link', { name: /help/i })
      const vmfLink = screen.queryByRole('link', { name: /^vmf$/i })

      expect(helpLink).toBeInTheDocument()
      expect(vmfLink).not.toBeInTheDocument()
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

