import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Status } from '../../components/Status'
import { formatTimestamp } from './systemMonitoring.constants.js'
import './MonitoringAlertsView.css'

export function MonitoringAlertsView({
  isSuperAdmin,
  activeAlerts,
  resolvedAlerts,
  alertSummary,
}) {
  return (
    <>
      <Fieldset className="system-monitoring__fieldset">
        <Fieldset.Legend className="system-monitoring__legend">
          <h2 className="system-monitoring__section-title">Active Alerts</h2>
        </Fieldset.Legend>
        <Card variant="elevated" className="system-monitoring__card">
          <Card.Body>
            {isSuperAdmin && (
              <p className="system-monitoring__summary">
                Active: {alertSummary.activeCount} | Resolved: {alertSummary.resolvedCount} | Total: {alertSummary.total}
              </p>
            )}
            {!isSuperAdmin ? (
              <p className="system-monitoring__empty">
                Alert lifecycle is available to super admins only.
              </p>
            ) : activeAlerts.length === 0 ? (
              <p className="system-monitoring__empty">No active alerts.</p>
            ) : (
              <ul className="system-monitoring__alert-list">
                {activeAlerts.map((alert) => (
                  <li key={alert.id} className="system-monitoring__alert-row">
                    <Status
                      variant={
                        alert.level === 'error'
                          ? 'error'
                          : alert.level === 'warning'
                            ? 'warning'
                            : 'info'
                      }
                      size="sm"
                      showIcon
                    >
                      {alert.title}
                    </Status>
                    <span>{alert.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card>
      </Fieldset>

      <Fieldset className="system-monitoring__fieldset">
        <Fieldset.Legend className="system-monitoring__legend">
          <h2 className="system-monitoring__section-title">Resolved Alerts</h2>
        </Fieldset.Legend>
        <Card variant="elevated" className="system-monitoring__card">
          <Card.Body>
            {!isSuperAdmin ? (
              <p className="system-monitoring__empty">
                Alert lifecycle is available to super admins only.
              </p>
            ) : resolvedAlerts.length === 0 ? (
              <p className="system-monitoring__empty">No resolved alerts.</p>
            ) : (
              <ul className="system-monitoring__alert-list">
                {resolvedAlerts.map((alert) => (
                  <li key={alert.id} className="system-monitoring__alert-row">
                    <Status variant="info" size="sm" showIcon>
                      {alert.title}
                    </Status>
                    <span>{alert.description}</span>
                    <span className="system-monitoring__alert-meta">
                      Resolved {formatTimestamp(alert.resolvedAt || alert.lastSeenAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card>
      </Fieldset>
    </>
  )
}
