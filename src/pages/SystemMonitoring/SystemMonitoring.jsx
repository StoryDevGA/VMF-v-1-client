/**
 * SystemMonitoring Page (Phase 5.2)
 *
 * Full-screen admin dashboard at `/app/administration/system-monitoring`.
 * Displays:
 *   - Overall system health status badge
 *   - Dependency status list (Database, Redis, Identity Plus)
 *   - Performance metrics (avg/p95 response, error rate, RPM, uptime)
 *   - Active alerts derived from threshold analysis
 *
 * Non-admin users see a guard message. Data is polled every 30 s
 * via `useSystemMonitoring` with a manual Refresh button.
 */

import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { useSystemMonitoring } from '../../hooks/useSystemMonitoring.js'
import './SystemMonitoring.css'

function statusToVariant(status) {
  if (status === 'HEALTHY' || status === 'OK') return 'success'
  if (status === 'DEGRADED') return 'warning'
  if (status === 'DOWN' || status === 'ERROR' || status === 'UNHEALTHY') return 'error'
  return 'info'
}

function formatPercent(decimal) {
  return `${(Number(decimal || 0) * 100).toFixed(1)}%`
}

function SystemMonitoring() {
  const {
    isAdmin,
    overallStatus,
    dependencies,
    metrics,
    activeAlerts,
    isLoading,
    isFetching,
    error,
    refetchAll,
  } = useSystemMonitoring({ enableAlerts: false, pollingInterval: 30000 })

  if (!isAdmin) {
    return (
      <section className="system-monitoring container" aria-label="System Monitoring">
        <p className="system-monitoring__empty">
          Monitoring is available to admin users only.
        </p>
      </section>
    )
  }

  return (
    <section className="system-monitoring container" aria-label="System Monitoring">
      <header className="system-monitoring__header">
        <h1 className="system-monitoring__title">System Monitoring</h1>
        <Button
          variant="outline"
          onClick={refetchAll}
          disabled={isFetching}
        >
          Refresh
        </Button>
      </header>

      <div className="system-monitoring__topline">
        <Status variant={statusToVariant(overallStatus)} showIcon>
          Overall: {overallStatus}
        </Status>
        {isFetching && <Spinner size="sm" />}
      </div>

      {error && (
        <p className="system-monitoring__error" role="alert">
          Unable to load full monitoring data. Showing available results.
        </p>
      )}

      <div className="system-monitoring__grid">
        <Card className="system-monitoring__card">
          <h2 className="system-monitoring__card-title">Dependency Status</h2>
          {isLoading && dependencies.length === 0 ? (
            <Spinner size="md" />
          ) : dependencies.length > 0 ? (
            <ul className="system-monitoring__dependency-list">
              {dependencies.map((dep) => (
                <li key={dep.id} className="system-monitoring__dependency-row">
                  <span className="system-monitoring__dependency-name">{dep.name}</span>
                  <Status variant={statusToVariant(dep.status)} size="sm" showIcon>
                    {dep.status}
                  </Status>
                </li>
              ))}
            </ul>
          ) : (
            <p className="system-monitoring__empty">No dependency data available.</p>
          )}
        </Card>

        <Card className="system-monitoring__card">
          <h2 className="system-monitoring__card-title">Performance Metrics</h2>
          <dl className="system-monitoring__metrics">
            <div>
              <dt>Average response</dt>
              <dd>{Math.round(metrics.avgResponseMs)} ms</dd>
            </div>
            <div>
              <dt>P95 response</dt>
              <dd>{Math.round(metrics.p95ResponseMs)} ms</dd>
            </div>
            <div>
              <dt>Error rate</dt>
              <dd>{formatPercent(metrics.errorRate)}</dd>
            </div>
            <div>
              <dt>Requests/min</dt>
              <dd>{Math.round(metrics.requestsPerMinute)}</dd>
            </div>
            <div>
              <dt>Uptime</dt>
              <dd>{metrics.uptimePercent.toFixed(2)}%</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="system-monitoring__card">
        <h2 className="system-monitoring__card-title">Active Alerts</h2>
        {activeAlerts.length === 0 ? (
          <p className="system-monitoring__empty">No active alerts.</p>
        ) : (
          <ul className="system-monitoring__alert-list">
            {activeAlerts.map((alert) => (
              <li key={alert.id} className="system-monitoring__alert-row">
                <Status
                  variant={alert.level === 'error' ? 'error' : 'warning'}
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
      </Card>
    </section>
  )
}

export default SystemMonitoring
