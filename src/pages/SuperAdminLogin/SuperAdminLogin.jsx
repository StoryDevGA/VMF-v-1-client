/**
 * Super Admin Login Page
 *
 * Platform-level login at `/super-admin/login`.
 * Visually distinct from the customer login to avoid confusion.
 */

import { Navigate } from 'react-router-dom'
import { useSuperAdminLoginManagement } from './useSuperAdminLoginManagement.js'
import { SuperAdminLoginForm } from './SuperAdminLoginForm.jsx'
import './SuperAdminLogin.css'

function SuperAdminLogin() {
  const mgmt = useSuperAdminLoginManagement()

  if (mgmt.isAuthenticated) {
    return (
      <Navigate
        to={mgmt.isSuperAdmin ? '/super-admin/dashboard' : '/app/dashboard'}
        replace
      />
    )
  }

  return (
    <section
      className="super-admin-login container"
      aria-label="Super Admin Login"
    >
      <SuperAdminLoginForm
        email={mgmt.email}
        setEmail={mgmt.setEmail}
        password={mgmt.password}
        setPassword={mgmt.setPassword}
        fieldErrors={mgmt.fieldErrors}
        authError={mgmt.authError}
        retryLockActive={mgmt.retryLockActive}
        retryRemainingSeconds={mgmt.retryRemainingSeconds}
        isLoading={mgmt.isLoading}
        handleSubmit={mgmt.handleSubmit}
      />
    </section>
  )
}

export default SuperAdminLogin
