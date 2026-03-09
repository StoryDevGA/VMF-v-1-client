import { MdLogout } from 'react-icons/md'
import { Card } from '../../components/Card'
import { Link } from '../../components/Link'
import { Button } from '../../components/Button'
import { SUPPORT_ACTIONS } from './superAdminDashboard.constants.jsx'
import './DashboardQuickLinks.css'

export function DashboardQuickLinks({ onLogout, isLoggingOut }) {
  return (
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
          {SUPPORT_ACTIONS.map((action) => (
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
            onClick={onLogout}
            loading={isLoggingOut}
            leftIcon={<MdLogout aria-hidden="true" />}
          >
            Sign Out
          </Button>
        </div>
      </Card.Body>
    </Card>
  )
}
