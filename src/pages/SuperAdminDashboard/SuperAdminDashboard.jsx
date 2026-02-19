/**
 * Super Admin Dashboard Page
 *
 * Dedicated platform-level control surface for SUPER_ADMIN users.
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MdHelpOutline,
  MdLogout,
  MdMarkEmailUnread,
  MdMonitorHeart,
  MdSettings,
} from 'react-icons/md'
import { Card } from '../../components/Card'
import { Link } from '../../components/Link'
import { Button } from '../../components/Button'
import { useAuth } from '../../hooks/useAuth.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import './SuperAdminDashboard.css'

function SuperAdminDashboard() {
  const navigate = useNavigate()
  const { logout, logoutResult } = useAuth()
  const { user } = useAuthorization()

  const primaryActions = useMemo(
    () => [
      {
        key: 'monitoring',
        title: 'Platform Monitoring',
        description:
          'Review platform health and operational telemetry across environments.',
        to: '/super-admin/system-monitoring',
        icon: <MdMonitorHeart aria-hidden="true" />,
      },
      {
        key: 'invitations',
        title: 'Invitation Management',
        description:
          'Create, resend, and revoke onboarding invitations for customer administrators.',
        to: '/super-admin/invitations',
        icon: <MdMarkEmailUnread aria-hidden="true" />,
      },
      {
        key: 'versioning',
        title: 'System Versioning',
        description:
          'Review and update platform governance policy versions with step-up controls.',
        to: '/super-admin/system-versioning',
        icon: <MdSettings aria-hidden="true" />,
      },
      {
        key: 'denied-access',
        title: 'Denied Access Logs',
        description:
          'Review authorization denials across platform workflows for audit visibility.',
        to: '/super-admin/denied-access-logs',
        icon: <MdMonitorHeart aria-hidden="true" />,
      },
    ],
    [],
  )

  const supportActions = useMemo(
    () => [
      {
        key: 'monitoring',
        label: 'Monitoring',
        to: '/super-admin/system-monitoring',
        icon: <MdMonitorHeart aria-hidden="true" />,
      },
      {
        key: 'invitations',
        label: 'Invitations',
        to: '/super-admin/invitations',
        icon: <MdMarkEmailUnread aria-hidden="true" />,
      },
      {
        key: 'versioning',
        label: 'Versioning',
        to: '/super-admin/system-versioning',
        icon: <MdSettings aria-hidden="true" />,
      },
      {
        key: 'denied-access',
        label: 'Denied Access',
        to: '/super-admin/denied-access-logs',
        icon: <MdMonitorHeart aria-hidden="true" />,
      },
      {
        key: 'help',
        label: 'Help Center',
        to: '/help',
        icon: <MdHelpOutline aria-hidden="true" />,
      },
    ],
    [],
  )

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
        <Card
          variant="elevated"
          className="super-admin-dashboard__section super-admin-dashboard__section--actions"
        >
          <Card.Header>
            <h2 className="super-admin-dashboard__section-title">
              Platform Actions
            </h2>
            <p className="super-admin-dashboard__section-subtitle">
              Entry points for super-admin operational workflows.
            </p>
          </Card.Header>
          <Card.Body>
            <div className="super-admin-dashboard__tiles" role="list">
              {primaryActions.map((action) => (
                <article
                  key={action.key}
                  className="super-admin-dashboard__tile"
                  role="listitem"
                >
                  <div className="super-admin-dashboard__tile-title-row">
                    <span className="super-admin-dashboard__tile-icon">
                      {action.icon}
                    </span>
                    <h3 className="super-admin-dashboard__tile-title">
                      {action.title}
                    </h3>
                  </div>
                  <p className="super-admin-dashboard__tile-description">
                    {action.description}
                  </p>
                  <Link
                    to={action.to}
                    className="super-admin-dashboard__tile-link"
                    variant="primary"
                    underline="none"
                  >
                    Open {action.title}
                  </Link>
                </article>
              ))}
            </div>
          </Card.Body>
        </Card>

        <Card
          variant="elevated"
          className="super-admin-dashboard__section super-admin-dashboard__section--support"
        >
          <Card.Header>
            <h2 className="super-admin-dashboard__section-title">Quick Links</h2>
            <p className="super-admin-dashboard__section-subtitle">
              Navigation shortcuts and session controls.
            </p>
          </Card.Header>
          <Card.Body>
            <div className="super-admin-dashboard__quick-actions">
              {supportActions.map((action) => (
                <Link
                  key={action.key}
                  to={action.to}
                  className="super-admin-dashboard__quick-link"
                  variant="subtle"
                  underline="none"
                >
                  <span
                    className="super-admin-dashboard__quick-icon"
                    aria-hidden="true"
                  >
                    {action.icon}
                  </span>
                  {action.label}
                </Link>
              ))}
              <Button
                variant="outline"
                className="super-admin-dashboard__logout"
                onClick={handleLogout}
                loading={logoutResult.isLoading}
                leftIcon={<MdLogout aria-hidden="true" />}
              >
                Sign Out
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </section>
  )
}

export default SuperAdminDashboard
