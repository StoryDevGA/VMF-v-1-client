import { formatDateTime } from '../../utils/dateTime.js'

export function statusToVariant(status) {
  if (status === 'HEALTHY' || status === 'OK') return 'success'
  if (status === 'DEGRADED') return 'warning'
  if (status === 'DOWN' || status === 'ERROR' || status === 'UNHEALTHY') return 'error'
  return 'info'
}

export function formatPercent(decimal) {
  return `${(Number(decimal || 0) * 100).toFixed(1)}%`
}

export function formatTimestamp(isoValue) {
  return formatDateTime(isoValue, 'Unknown')
}

export function formatDurationMs(durationMs) {
  const ms = Number(durationMs)
  if (!Number.isFinite(ms) || ms <= 0) return '--'
  if (ms % 3_600_000 === 0) return `${ms / 3_600_000}h`
  if (ms % 60_000 === 0) return `${ms / 60_000}m`
  if (ms % 1_000 === 0) return `${ms / 1_000}s`
  return `${Math.round(ms)}ms`
}

export function formatUptime(metrics) {
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
