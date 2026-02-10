/**
 * ProtectedRoute Component
 *
 * Auth gate that wraps an <Outlet />.
 * - Shows a loading spinner while auth status is resolving.
 * - Redirects to the login page when the user is unauthenticated.
 * - Optionally enforces a required role (e.g. 'SUPER_ADMIN').
 *
 * @example
 * // In router config
 * {
 *   element: <ProtectedRoute />,
 *   children: [
 *     { path: 'dashboard', element: <Dashboard /> },
 *   ],
 * }
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  selectAuthStatus,
  selectIsAuthenticated,
  selectCurrentUser,
} from '../../store/slices/authSlice.js'
import { Spinner } from '../Spinner'
import './ProtectedRoute.css'

export function ProtectedRoute({
  redirectTo = '/app/login',
  requiredRole,
}) {
  const status = useSelector(selectAuthStatus)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const location = useLocation()

  // Still resolving session — show a full-screen spinner
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="protected-route__loading" role="status">
        <Spinner size="lg" />
        <p className="protected-route__loading-text">Verifying session…</p>
      </div>
    )
  }

  // Not authenticated — redirect, preserving the intended destination
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Optional role gate
  if (requiredRole && !user?.roles?.includes(requiredRole)) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
