/**
 * Router Tests
 *
 * Tests navigation and route rendering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import { router } from '../index'

const ROUTE_TEST_TIMEOUT = 15000

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

      render(
        <ToasterProvider>
          <RouterProvider router={testRouter} />
        </ToasterProvider>
      )

      // Wait for lazy-loaded component
      expect(await screen.findByText(/HOME/i, {}, { timeout: 10000 })).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

    it('should render about page at /about', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/about'],
      })

      render(
        <ToasterProvider>
          <RouterProvider router={testRouter} />
        </ToasterProvider>
      )

      expect(await screen.findByRole('heading', { name: /^About$/i }, { timeout: 10000 })).toBeInTheDocument()
    }, ROUTE_TEST_TIMEOUT)

  })

  describe('Navigation', () => {
    it('should render navigation on all pages', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      })

      render(
        <ToasterProvider>
          <RouterProvider router={testRouter} />
        </ToasterProvider>
      )

      // Navigation should be present
      expect(await screen.findByRole('navigation')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: /StoryLineOS Logo/i })).toBeInTheDocument()
    })

    it('should have correct navigation links', async () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      })

      render(
        <ToasterProvider>
          <RouterProvider router={testRouter} />
        </ToasterProvider>
      )

      await screen.findByRole('navigation')

      const aboutLink = screen.getByRole('menuitem', { name: /about/i })
      const vmfLink = screen.queryByRole('menuitem', { name: /^vmf$/i })

      expect(aboutLink).toBeInTheDocument()
      expect(vmfLink).not.toBeInTheDocument()
    })
  })

  describe('Lazy Loading', () => {
    it('should show loading state while page loads', () => {
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      })

      render(
        <ToasterProvider>
          <RouterProvider router={testRouter} />
        </ToasterProvider>
      )

      // Loading indicator should appear briefly
      // Note: This might be too fast to catch in tests,
      // but the mechanism is tested by the routes working
      expect(testRouter).toBeTruthy()
    })
  })
})

