/**
 * Router Configuration
 *
 * Centralized routing configuration with lazy-loaded pages
 * All routes use React.lazy() for code splitting and better performance
 */

import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { Spinner } from '../components/Spinner' // Import the new Spinner component

// Lazy-loaded page components
const Home = lazy(() => import('../pages/Home'))
const Components = lazy(() => import('../pages/Components'))
const About = lazy(() => import('../pages/About'))

/**
 * Loading Fallback Component
 * Shown while lazy-loaded routes are loading
 */
function LoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: 'var(--color-text-secondary)'
      }}
    >
      <Spinner size="lg" /> {/* Use the new Spinner component */}
      <p style={{ marginTop: 'var(--spacing-md)' }}>Loading...</p>
    </div>
  )
}

/**
 * Root Layout
 * Wraps all routes with navigation and suspense boundary
 */
function RootLayout() {
  const footerSections = [
    {
      title: 'Product',
      links: [
        { label: 'Features', to: '/components' },
        { label: 'Documentation', to: '/about' }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About', to: '/about' },
        { label: 'Contact', to: '/about' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { label: 'Components', to: '/components' },
        { label: 'GitHub', href: 'https://github.com', external: true, openInNewTab: true }
      ]
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header logo="StoryLineOS" />
      <main style={{ flex: 1 }}>
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer sections={footerSections} copyright="StoryLineOS" />
    </div>
  )
}

/**
 * Router Configuration
 * Uses createBrowserRouter for better type safety and future features
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'components',
        element: <Components />,
      },
      {
        path: 'about',
        element: <About />,
      },
    ],
  },
])


