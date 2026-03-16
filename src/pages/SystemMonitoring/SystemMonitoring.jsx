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
import { useSystemMonitoring } from '../../hooks/useSystemMonitoring.js'
import { MonitoringStatusView } from './MonitoringStatusView.jsx'
import { MonitoringAlertsView } from './MonitoringAlertsView.jsx'
import { MonitoringTrendsView } from './MonitoringTrendsView.jsx'
import './SystemMonitoring.css'

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

      <MonitoringStatusView
        isSuperAdmin={isSuperAdmin}
        overallStatus={overallStatus}
        dependencies={dependencies}
        metricSnapshot={metricSnapshot}
        isLoading={isLoading}
        isFetching={isFetching}
      />

      {isSuperAdmin ? (
        <>
          <MonitoringAlertsView
            isSuperAdmin={isSuperAdmin}
            activeAlerts={activeAlerts}
            resolvedAlerts={resolvedAlerts}
            alertSummary={alertSummary}
          />

          <MonitoringTrendsView
            isSuperAdmin={isSuperAdmin}
            recentTrendPoints={recentTrendPoints}
            trendWindowMs={trendWindowMs}
            trendBucketMs={trendBucketMs}
            trendGeneratedAt={trendGeneratedAt}
          />
        </>
      ) : null}
    </section>
  )
}

export default SystemMonitoring
