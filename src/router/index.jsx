/**
 * Router Configuration
 *
 * Centralized routing configuration with lazy-loaded pages.
 * All routes use React.lazy() for code splitting and better performance.
 *
 * Route groups:
 *  - Public  — landing, help, login pages
 *  - App     — customer-level protected routes  (/app/*)
 *  - Admin   — super-admin protected routes     (/super-admin/*)
 */

import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { Spinner } from '../components/Spinner'
import { Logo } from '../components/Logo'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { selectCurrentUser } from '../store/slices/authSlice.js'
import { isSuperAdmin as checkIsSuperAdmin } from '../utils/authorization.js'
import './router.css'

/* ------------------------------------------------------------------ */
/*  Lazy-loaded page components                                       */
/* ------------------------------------------------------------------ */

const Home = lazy(() => import('../pages/Home'))
const Help = lazy(() => import('../pages/Help'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const Login = lazy(() => import('../pages/Login/Login'))
const SuperAdminLogin = lazy(
  () => import('../pages/SuperAdminLogin/SuperAdminLogin'),
)
const SuperAdminDashboard = lazy(() => import('../pages/SuperAdminDashboard'))
const SuperAdminCustomers = lazy(() => import('../pages/SuperAdminCustomers'))
const EditUsers = lazy(() => import('../pages/EditUsers/EditUsers'))
const MaintainTenants = lazy(
  () => import('../pages/MaintainTenants/MaintainTenants'),
)
const SystemMonitoring = lazy(
  () => import('../pages/SystemMonitoring/SystemMonitoring'),
)
const NotFound = lazy(() => import('../pages/NotFound'))

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
      <Header logo={<Logo size="large" />} />
      <main className="root-layout__main">
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

/**
 * Customer App Guard
 * Blocks SUPER_ADMIN users from customer-admin route space (`/app/*`).
 */
function CustomerAppGuard() {
  const user = useSelector(selectCurrentUser)
  if (checkIsSuperAdmin(user)) {
    return <SuperAdminDashboard />
  }
  return <Outlet />
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
        path: 'help',
        element: <Help />,
      },
      {
        path: 'about',
        element: <Help />,
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
            element: <CustomerAppGuard />,
            children: [
              {
                path: 'dashboard',
                element: <Dashboard />,
              },
              {
                path: 'administration/edit-users',
                element: <EditUsers />,
              },
              {
                path: 'administration/maintain-tenants',
                element: <MaintainTenants />,
              },
              {
                path: 'administration/system-monitoring',
                element: <SystemMonitoring />,
              },
            ],
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
            index: true,
            element: <SuperAdminDashboard />,
          },
          {
            path: 'dashboard',
            element: <SuperAdminDashboard />,
          },
          {
            path: 'customers',
            element: <SuperAdminCustomers />,
          },
          {
            path: 'system-monitoring',
            element: <SystemMonitoring />,
          },
        ],
      },

      /* ---------- Catch-all: 404 page ---------- */
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])

