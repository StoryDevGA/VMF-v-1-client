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
const Components = lazy(() => import('../pages/Components'))
const About = lazy(() => import('../pages/About'))
const VMF = lazy(() => import('../pages/VMF'))
const VMFA = lazy(() => import('../pages/VMF/VMF-A'))
const VMFB = lazy(() => import('../pages/VMF/VMF-B'))
const VMFC = lazy(() => import('../pages/VMF/VMF-C'))
const VMFD = lazy(() => import('../pages/VMF/VMF-D'))
const VMFE = lazy(() => import('../pages/VMF/VMF-E'))
const VMFF = lazy(() => import('../pages/VMF/VMF-F'))
const VMFG = lazy(() => import('../pages/VMF/VMF-G'))

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
    <div className="root-layout">
      <Header logo={<Logo size="full" />} />
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
        path: 'components',
        element: <Components />,
      },
      {
        path: 'about',
        element: <About />,
      },

      // VMF Section
      {
        path: 'vmf',
        children: [
          {
            index: true,
            element: <VMF />,
          },
          {
            path: 'a',
            element: <VMFA />,
          },
          {
            path: 'b',
            element: <VMFB />,
          },
          {
            path: 'c',
            element: <VMFC />,
          },
          {
            path: 'd',
            element: <VMFD />,
          },
          {
            path: 'e',
            element: <VMFE />,
          },
          {
            path: 'f',
            element: <VMFF />,
          },
          {
            path: 'g',
            element: <VMFG />,
          },
        ],
      },
    ],
  },
])
