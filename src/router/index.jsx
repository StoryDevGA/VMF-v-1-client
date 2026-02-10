/**
 * Router Configuration
 *
 * Centralized routing configuration with lazy-loaded pages.
 * All routes use React.lazy() for code splitting and better performance.
 *
 * Route groups:
 *  - Public  — landing, about, login pages
 *  - App     — customer-level protected routes  (/app/*)
 *  - Admin   — super-admin protected routes     (/super-admin/*)
 */

import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { Spinner } from '../components/Spinner'
import { Logo } from '../components/Logo'
import { ProtectedRoute } from '../components/ProtectedRoute'
import './router.css'

/* ------------------------------------------------------------------ */
/*  Lazy-loaded page components                                       */
/* ------------------------------------------------------------------ */

const Home = lazy(() => import('../pages/Home'))
const About = lazy(() => import('../pages/About'))
const Login = lazy(() => import('../pages/Login/Login'))
const SuperAdminLogin = lazy(
  () => import('../pages/SuperAdminLogin/SuperAdminLogin'),
)
const EditUsers = lazy(() => import('../pages/EditUsers/EditUsers'))

/* ------------------------------------------------------------------ */
/*  Shared layouts & fallbacks                                        */
/* ------------------------------------------------------------------ */

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
  return (
    <div className="root-layout">
      <Header logo={<Logo size="medium" />} />
      <main className="root-layout__main">
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Router definition                                                 */
/* ------------------------------------------------------------------ */

/**
 * Router Configuration
 * Uses createBrowserRouter for better type safety and future features
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      /* ---------- Public routes ---------- */
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'about',
        element: <About />,
      },

      /* ---------- Auth routes (public) ---------- */
      {
        path: 'app/login',
        element: <Login />,
      },
      {
        path: 'super-admin/login',
        element: <SuperAdminLogin />,
      },

      /* ---------- Protected: customer app ---------- */
      {
        path: 'app',
        element: <ProtectedRoute redirectTo="/app/login" />,
        children: [
          {
            path: 'dashboard',
            element: <Home />, // placeholder until Dashboard page is built
          },
          {
            path: 'administration/edit-users',
            element: <EditUsers />,
          },
        ],
      },

      /* ---------- Protected: super-admin console ---------- */
      {
        path: 'super-admin',
        element: (
          <ProtectedRoute
            redirectTo="/super-admin/login"
            requiredRole="SUPER_ADMIN"
          />
        ),
        children: [
          {
            path: 'customers',
            element: <Home />, // placeholder until Customers page is built
          },
        ],
      },
    ],
  },
])

