import { Card } from '../../components/Card'
import { Link } from '../../components/Link'
import { PRIMARY_ACTIONS } from './superAdminDashboard.constants.jsx'
import './DashboardActions.css'

export function DashboardActions() {
  return (
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
          {PRIMARY_ACTIONS.map((action) => (
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
  )
}
