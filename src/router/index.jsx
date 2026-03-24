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
import { Navigate, createBrowserRouter, Outlet } from 'react-router-dom'
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

const Help = lazy(() => import('../pages/Help'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const Login = lazy(() => import('../pages/Login/Login'))
const SuperAdminLogin = lazy(
  () => import('../pages/SuperAdminLogin/SuperAdminLogin'),
)
const SuperAdminDashboard = lazy(() => import('../pages/SuperAdminDashboard'))
const SuperAdminLicenseLevels = lazy(
  () => import('../pages/SuperAdminLicenseLevels'),
)
const SuperAdminRoles = lazy(
  () => import('../pages/SuperAdminRoles'),
)
const SuperAdminCustomers = lazy(
  () => import('../pages/SuperAdminCustomers'),
)
const SuperAdminSystemVersioning = lazy(
  () => import('../pages/SuperAdminSystemVersioning'),
)
const SuperAdminAuditLogs = lazy(
  () => import('../pages/SuperAdminAuditLogs'),
)
const SuperAdminDeniedAccessLogs = lazy(
  () => import('../pages/SuperAdminDeniedAccessLogs'),
)
const EditUsers = lazy(() => import('../pages/EditUsers/EditUsers'))
const MaintainTenants = lazy(
  () => import('../pages/MaintainTenants/MaintainTenants'),
)
const MaintainVmfs = lazy(
  () => import('../pages/MaintainVmfs'),
)
const TenantLinkedUsersWorkspace = lazy(
  () => import('../pages/MaintainTenants/TenantLinkedUsersWorkspace'),
)
const SystemMonitoring = lazy(
  () => import('../pages/SystemMonitoring/SystemMonitoring'),
)
const InvitationAuth = lazy(() => import('../pages/InvitationAuth'))
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
        element: <Login />,
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

      /* ---------- Fake auth (dev/testing) ---------- */
      {
        path: 'invitation-auth',
        element: <InvitationAuth />,
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
                path: 'administration',
                children: [
                  {
                    element: (
                      <ProtectedRoute
                        redirectTo="/app/login"
                        requiredSelectedCustomerRole="CUSTOMER_ADMIN"
                        unauthorizedRedirect="/app/dashboard"
                      />
                    ),
                    children: [
                      {
                        path: 'edit-users',
                        element: <EditUsers />,
                      },
                    ],
                  },
                  {
                    path: 'manage-vmfs',
                    element: <MaintainVmfs />,
                  },
                  {
                    path: 'maintain-tenants',
                    element: <MaintainTenants />,
                  },
                  {
                    path: 'maintain-tenants/:tenantId/linked-users',
                    element: <TenantLinkedUsersWorkspace />,
                  },
                  {
                    path: 'system-monitoring',
                    element: <SystemMonitoring />,
                  },
                ],
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
            path: 'invitations',
            element: <Navigate to="/super-admin/customers?view=invitations" replace />,
          },
          {
            path: 'license-levels',
            element: <SuperAdminLicenseLevels />,
          },
          {
            path: 'roles',
            element: <SuperAdminRoles />,
          },
          {
            path: 'customers',
            element: <SuperAdminCustomers />,
          },
          {
            path: 'system-versioning',
            element: <SuperAdminSystemVersioning />,
          },
          {
            path: 'audit-logs',
            element: <SuperAdminAuditLogs />,
          },
          {
            path: 'denied-access-logs',
            element: <SuperAdminDeniedAccessLogs />,
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

