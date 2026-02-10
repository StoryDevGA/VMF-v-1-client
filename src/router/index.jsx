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
import { Spinner } from '../components/Spinner'
import { Logo } from '../components/Logo'
import './router.css'

// Lazy-loaded page components
const Home = lazy(() => import('../pages/Home'))
const About = lazy(() => import('../pages/About'))

/**
 * Loading Fallback Component
 * Shown while lazy-loaded routes are loading
 */
function LoadingFallback() {
  return (
    <div className="loading-fallback">
      <Spinner size="lg" />
      <p className="loading-fallback__text">Loading...</p>
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
        { label: 'Features', to: '/about' },
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
        { label: 'Guides', to: '/about' },
        { label: 'GitHub', href: 'https://github.com', external: true, openInNewTab: true }
      ]
    }
  ]

  return (
    <div className="root-layout">
      <Header logo={<Logo size="medium" />} />
      <main className="root-layout__main">
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
      // Main Pages
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'about',
        element: <About />,
      },
    ],
  },
])
