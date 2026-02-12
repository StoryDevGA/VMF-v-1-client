/**
 * SystemHealthIndicator Component (Phase 5.2)
 *
 * Compact health status pill rendered in admin context surfaces.
 * Polls `/health` via `useSystemMonitoring` and displays a colour-coded
 * badge (ok / warn / error / unknown) with the current overall status.
 *
 * Returns `null` for non-admin users so the indicator is invisible.
 *
 * @example
 * <Dashboard>
 *   <SystemHealthIndicator />
 * </Dashboard>
 */

import { MdMonitorHeart } from 'react-icons/md'
import { Spinner } from '../Spinner'
import { useSystemMonitoring } from '../../hooks/useSystemMonitoring.js'
import './SystemHealthIndicator.css'

function mapVariant(status) {
  if (status === 'HEALTHY' || status === 'OK') return 'ok'
  if (status === 'DEGRADED') return 'warn'
  if (status === 'DOWN' || status === 'ERROR' || status === 'UNHEALTHY') return 'error'
  return 'unknown'
}

export function SystemHealthIndicator() {
  const { isAdmin, overallStatus, isFetching } = useSystemMonitoring({
    enableAlerts: true,
    pollingInterval: 30000,
  })

  if (!isAdmin) return null

  const variant = mapVariant(overallStatus)

  return (
    <div
      className={`system-health-indicator system-health-indicator--${variant}`}
      role="status"
      aria-label={`System health ${overallStatus}`}
      title={`System health: ${overallStatus}`}
    >
      <MdMonitorHeart aria-hidden="true" focusable="false" />
      <span className="system-health-indicator__label">
        {overallStatus}
      </span>
      {isFetching && <Spinner size="sm" />}
    </div>
  )
}

export default SystemHealthIndicator
