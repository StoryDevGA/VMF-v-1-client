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
import { hasPlatformRole, hasCustomerRole, hasTenantRole } from '../../utils/authorization.js'
import { Spinner } from '../Spinner'
import './ProtectedRoute.css'

/**
 * @param {Object}  props
 * @param {string}  [props.redirectTo='/app/login']   – unauthenticated redirect target
 * @param {string}  [props.requiredRole]              – DEPRECATED: flat role check (backward compat)
 * @param {string}  [props.requiredPlatformRole]      – platform role gate (e.g. 'SUPER_ADMIN')
 * @param {Object}  [props.requiredCustomerRole]      – { customerId, role } gate
 * @param {Object}  [props.requiredTenantRole]        – { customerId, tenantId, role } gate
 * @param {string}  [props.unauthorizedRedirect='/app/dashboard'] – unauthorized redirect target
 */
export function ProtectedRoute({
  redirectTo = '/app/login',
  requiredRole,
  requiredPlatformRole,
  requiredCustomerRole,
  requiredTenantRole,
  unauthorizedRedirect = '/app/dashboard',
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

  // --- Authorization gates (checked in order of specificity) ---

  // Legacy flat role check (backward compatible with router config)
  if (requiredRole && !hasPlatformRole(user, requiredRole)) {
    return <Navigate to={unauthorizedRedirect} replace />
  }

  // Platform role gate
  if (requiredPlatformRole && !hasPlatformRole(user, requiredPlatformRole)) {
    return <Navigate to={unauthorizedRedirect} replace />
  }

  // Customer role gate
  if (
    requiredCustomerRole &&
    !hasCustomerRole(user, requiredCustomerRole.customerId, requiredCustomerRole.role)
  ) {
    return <Navigate to={unauthorizedRedirect} replace />
  }

  // Tenant role gate
  if (
    requiredTenantRole &&
    !hasTenantRole(
      user,
      requiredTenantRole.customerId,
      requiredTenantRole.tenantId,
      requiredTenantRole.role,
    )
  ) {
    return <Navigate to={unauthorizedRedirect} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
