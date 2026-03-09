import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { formatPercent, formatTimestamp, formatDurationMs } from './systemMonitoring.constants.js'
import './MonitoringTrendsView.css'

export function MonitoringTrendsView({
  isSuperAdmin,
  recentTrendPoints,
  trendWindowMs,
  trendBucketMs,
  trendGeneratedAt,
}) {
  return (
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
  )
}
