import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { statusToVariant, formatPercent, formatUptime } from './systemMonitoring.constants.js'
import './MonitoringStatusView.css'

export function MonitoringStatusView({
  isSuperAdmin,
  overallStatus,
  dependencies,
  metricSnapshot,
  isLoading,
  isFetching,
}) {
  return (
    <>
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

      {isSuperAdmin ? (
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
              </Card.Body>
            </Card>
          </Fieldset>
        </div>
      ) : null}
    </>
  )
}
