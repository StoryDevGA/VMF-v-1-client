/**
 * Super Admin Dashboard Page
 *
 * Dedicated platform-level control surface for SUPER_ADMIN users.
 */

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { DashboardActions } from './DashboardActions.jsx'
import { DashboardQuickLinks } from './DashboardQuickLinks.jsx'
import './SuperAdminDashboard.css'

function SuperAdminDashboard() {
  const navigate = useNavigate()
  const { logout, logoutResult } = useAuth()
  const { user } = useAuthorization()

  const handleLogout = async () => {
    if (logoutResult.isLoading) return
    await logout()
    navigate('/super-admin/login', { replace: true })
  }

  return (
    <section
      className="super-admin-dashboard container"
      aria-label="Super admin dashboard"
    >
      <header className="super-admin-dashboard__header">
        <h1 className="super-admin-dashboard__title">Super Admin Dashboard</h1>
        <p className="super-admin-dashboard__subtitle">
          Platform-level controls for customer governance, monitoring, and
          cross-tenant operations.
        </p>
        {user?.name && (
          <p className="super-admin-dashboard__signed-in">
            Signed in as <strong>{user.name}</strong>
          </p>
        )}
      </header>

      <div className="super-admin-dashboard__grid">
        <DashboardActions />
        <DashboardQuickLinks
          onLogout={handleLogout}
          isLoggingOut={logoutResult.isLoading}
        />
      </div>
    </section>
  )
}

export default SuperAdminDashboard
