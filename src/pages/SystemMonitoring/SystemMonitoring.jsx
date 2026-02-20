/**
 * SystemMonitoring Page (Phase 5.2)
 *
 * Full-screen admin dashboard at:
 *   - `/app/administration/system-monitoring` (customer admin)
 *   - `/super-admin/system-monitoring` (super admin)
 * Displays:
 *   - Overall system health status badge
 *   - Dependency status list (Database, Redis, Identity Plus)
 *   - Performance metrics (avg/p95 response, error rate, RPM, runtime)
 *   - Active/resolved alert lifecycle
 *   - Health trends (windowed request buckets)
 *
 * Non-admin users see a guard message. Data is polled every 30 s
 * via `useSystemMonitoring` with a manual Refresh button.
 */

import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
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

function formatTimestamp(isoValue) {
  if (!isoValue) return 'Unknown'
  const parsed = new Date(isoValue)
  if (Number.isNaN(parsed.getTime())) return 'Unknown'
  return parsed.toLocaleString()
}

function formatDurationMs(durationMs) {
  const ms = Number(durationMs)
  if (!Number.isFinite(ms) || ms <= 0) return '--'
  if (ms % 3_600_000 === 0) return `${ms / 3_600_000}h`
  if (ms % 60_000 === 0) return `${ms / 60_000}m`
  if (ms % 1_000 === 0) return `${ms / 1_000}s`
  return `${Math.round(ms)}ms`
}

function formatUptime(metrics) {
  const uptimeSeconds = Number(metrics?.uptimeSeconds ?? 0)
  if (Number.isFinite(uptimeSeconds) && uptimeSeconds > 0) {
    const totalSeconds = Math.round(uptimeSeconds)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  return `${Number(metrics?.uptimePercent ?? 0).toFixed(2)}%`
}

function SystemMonitoring() {
  const {
    isAdmin,
    isSuperAdmin = false,
    overallStatus,
    dependencies = [],
    metrics = {},
    activeAlerts = [],
    resolvedAlerts = [],
    alertSummary = { activeCount: 0, resolvedCount: 0, total: 0 },
    trendPoints = [],
    trendWindowMs = 0,
    trendBucketMs = 0,
    trendGeneratedAt = '',
    isLoading,
    isFetching,
    error,
    refetchAll,
  } = useSystemMonitoring({ enableAlerts: false, pollingInterval: 30000 })
  const metricSnapshot = {
    avgResponseMs: 0,
    p95ResponseMs: 0,
    errorRate: 0,
    requestsPerMinute: 0,
    eventLoopLagMs: 0,
    heapUsagePercent: 0,
    uptimePercent: 0,
    uptimeSeconds: 0,
    ...metrics,
  }
  const recentTrendPoints = [...trendPoints].slice(-8).reverse()

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

      {error && (
        <p className="system-monitoring__error" role="alert">
          Unable to load full monitoring data. Showing available results.
        </p>
      )}

      <Fieldset className="system-monitoring__fieldset">
        <Fieldset.Legend className="system-monitoring__legend">
          <h2 className="system-monitoring__section-title">Overall Status</h2>
        </Fieldset.Legend>
        <Card variant="elevated" className="system-monitoring__card">
          <Card.Body>
            <div className="system-monitoring__topline">
              <Status variant={statusToVariant(overallStatus)} showIcon>
                Overall: {overallStatus}
              </Status>
              {isFetching && <Spinner size="sm" />}
            </div>
          </Card.Body>
        </Card>
      </Fieldset>

      <div className="system-monitoring__grid">
        <Fieldset className="system-monitoring__fieldset">
          <Fieldset.Legend className="system-monitoring__legend">
            <h2 className="system-monitoring__section-title">Dependency Status</h2>
          </Fieldset.Legend>
          <Card variant="elevated" className="system-monitoring__card">
            <Card.Body>
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
              ) : !isSuperAdmin ? (
                <p className="system-monitoring__empty">
                  Detailed dependency status is available to super admins only.
                </p>
              ) : (
                <p className="system-monitoring__empty">No dependency data available.</p>
              )}
            </Card.Body>
          </Card>
        </Fieldset>

        <Fieldset className="system-monitoring__fieldset">
          <Fieldset.Legend className="system-monitoring__legend">
            <h2 className="system-monitoring__section-title">Performance Metrics</h2>
          </Fieldset.Legend>
          <Card variant="elevated" className="system-monitoring__card">
            <Card.Body>
              {!isSuperAdmin ? (
                <p className="system-monitoring__empty">
                  Detailed performance metrics are available to super admins only.
                </p>
              ) : (
                <dl className="system-monitoring__metrics">
                  <div className="system-monitoring__metric-row">
                    <dt>Average response</dt>
                    <dd>{Math.round(metricSnapshot.avgResponseMs)} ms</dd>
                  </div>
                  <div className="system-monitoring__metric-row">
                    <dt>P95 response</dt>
                    <dd>{Math.round(metricSnapshot.p95ResponseMs)} ms</dd>
                  </div>
                  <div className="system-monitoring__metric-row">
                    <dt>Error rate</dt>
                    <dd>{formatPercent(metricSnapshot.errorRate)}</dd>
                  </div>
                  <div className="system-monitoring__metric-row">
                    <dt>Requests/min</dt>
                    <dd>{Math.round(metricSnapshot.requestsPerMinute)}</dd>
                  </div>
                  <div className="system-monitoring__metric-row">
                    <dt>Event loop lag</dt>
                    <dd>{Math.round(metricSnapshot.eventLoopLagMs)} ms</dd>
                  </div>
                  <div className="system-monitoring__metric-row">
                    <dt>Heap usage</dt>
                    <dd>{metricSnapshot.heapUsagePercent.toFixed(1)}%</dd>
                  </div>
                  <div className="system-monitoring__metric-row">
                    <dt>Uptime</dt>
                    <dd>{formatUptime(metricSnapshot)}</dd>
                  </div>
                </dl>
              )}
            </Card.Body>
          </Card>
        </Fieldset>
      </div>

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

      <Fieldset className="system-monitoring__fieldset">
        <Fieldset.Legend className="system-monitoring__legend">
          <h2 className="system-monitoring__section-title">Health Trends</h2>
        </Fieldset.Legend>
        <Card variant="elevated" className="system-monitoring__card">
          <Card.Body>
            {!isSuperAdmin ? (
              <p className="system-monitoring__empty">
                Trends are available to super admins only.
              </p>
            ) : recentTrendPoints.length === 0 ? (
              <p className="system-monitoring__empty">No trend data available.</p>
            ) : (
              <>
                <p className="system-monitoring__summary">
                  Window: {formatDurationMs(trendWindowMs)} | Bucket: {formatDurationMs(trendBucketMs)} | Updated: {formatTimestamp(trendGeneratedAt)}
                </p>
                <ul className="system-monitoring__trend-list">
                  {recentTrendPoints.map((point) => (
                    <li key={point.id} className="system-monitoring__trend-row">
                      <span className="system-monitoring__trend-time">
                        {formatTimestamp(point.timestamp)}
                      </span>
                      <span>{point.requestCount} req</span>
                      <span>{formatPercent(point.errorRate)} errors</span>
                      <span>{Math.round(point.p95ResponseMs)} ms p95</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="system-monitoring__note">
              Trends and alert lifecycle are in-memory per API instance and are not yet persisted/shared across nodes.
            </p>
          </Card.Body>
        </Card>
      </Fieldset>
    </section>
  )
}

export default SystemMonitoring
