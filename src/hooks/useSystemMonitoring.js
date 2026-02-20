/**
 * useSystemMonitoring Hook (Phase 5.2)
 *
 * Facade hook that aggregates system monitoring endpoints:
 *   - `GET /health`                 - public liveness
 *   - `GET /health/detailed`        - dependency and metrics snapshot (SUPER_ADMIN)
 *   - `GET /metrics`                - Prometheus text scrape (SUPER_ADMIN)
 *   - `GET /health/trends`          - bucketed request trends (SUPER_ADMIN)
 *   - `GET /health/alerts`          - alert lifecycle feed (SUPER_ADMIN)
 *
 * Normalises heterogeneous backend payloads into a stable shape
 * consumed by `SystemHealthIndicator` and `SystemMonitoring`.
 *
 * Features:
 *   - Polling at configurable interval (default 30 s)
 *   - Admin-only query gating (queries skipped for regular users)
 *   - Optional toast-based alerting for degraded / threshold breaches
 *   - Combined `refetchAll()` for manual refresh
 *
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] - master toggle
 * @param {boolean} [options.enableAlerts=false] - show toasts on degradation
 * @param {number} [options.pollingInterval=30000] - poll cadence in ms
 * @returns {{
 *   isAdmin: boolean,
 *   isSuperAdmin: boolean,
 *   overallStatus: string,
 *   dependencies: Array,
 *   metrics: {
 *     avgResponseMs: number,
 *     p95ResponseMs: number,
 *     errorRate: number,
 *     requestsPerMinute: number,
 *     eventLoopLagMs: number,
 *     heapUsagePercent: number,
 *     uptimePercent: number,
 *     uptimeSeconds: number
 *   },
 *   activeAlerts: Array,
 *   resolvedAlerts: Array,
 *   alertSummary: { activeCount: number, resolvedCount: number, total: number },
 *   trendPoints: Array,
 *   trendWindowMs: number,
 *   trendBucketMs: number,
 *   trendGeneratedAt: string,
 *   isLoading: boolean,
 *   isFetching: boolean,
 *   error: unknown,
 *   refetchAll: Function
 * }}
 */

import { useEffect, useMemo, useRef } from 'react'
import { useToaster } from '../components/Toaster'
import { useAuthorization } from './useAuthorization.js'
import {
  useGetSystemHealthQuery,
  useGetDetailedHealthQuery,
  useGetSystemMetricsQuery,
  useGetHealthTrendsQuery,
  useGetHealthAlertsQuery,
} from '../store/api/systemApi.js'

const DEGRADED_STATES = new Set(['DEGRADED', 'DOWN', 'UNHEALTHY', 'ERROR'])
const DEFAULT_TREND_WINDOW = '1h'
const DEFAULT_TREND_BUCKET = '1m'
const DEFAULT_ALERT_LIMIT = 100
const DEFAULT_METRIC_THRESHOLDS = {
  errorRate: 0.05,
  p95ResponseTimeMs: 200,
}

function normalizeStatus(value) {
  const status = String(value ?? '').toUpperCase()
  if (!status) return 'UNKNOWN'
  return status
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toTitleCaseWord(word) {
  if (!word) return ''
  const upper = word.toUpperCase()
  if (/\d/.test(word) && upper === word) return upper
  const lower = word.toLowerCase()
  return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`
}

function humanizeIdentifier(value) {
  const raw = String(value ?? '')
  if (!raw) return 'Unknown'

  const withSpaces = raw
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()

  return withSpaces
    .split(/\s+/)
    .map((word) => toTitleCaseWord(word))
    .join(' ')
}

function normalizeDependencyEntries(detailedHealth) {
  const source = detailedHealth?.data ?? detailedHealth ?? {}

  if (source.services && typeof source.services === 'object') {
    return Object.entries(source.services).map(([name, value], index) => ({
      id: value?.id ?? name ?? `svc-${index}`,
      name: value?.name ?? humanizeIdentifier(name),
      status: normalizeStatus(value?.status ?? value),
      message: value?.message ?? value?.details ?? value?.error ?? '',
      latencyMs:
        value?.latencyMs ??
        value?.responseTimeMs ??
        value?.responseTime ??
        null,
    }))
  }

  if (Array.isArray(source.dependencies)) {
    return source.dependencies.map((dep, index) => ({
      id: dep.id ?? dep.name ?? `dep-${index}`,
      name: dep.name ?? dep.service ?? `Dependency ${index + 1}`,
      status: normalizeStatus(dep.status),
      message: dep.message ?? dep.error ?? '',
      latencyMs: dep.latencyMs ?? dep.responseTimeMs ?? null,
    }))
  }

  if (source.dependencies && typeof source.dependencies === 'object') {
    return Object.entries(source.dependencies).map(([name, value], index) => ({
      id: value?.id ?? name ?? `dep-${index}`,
      name,
      status: normalizeStatus(value?.status ?? value),
      message: value?.message ?? value?.details ?? value?.error ?? '',
      latencyMs:
        value?.latencyMs ??
        value?.responseTimeMs ??
        value?.responseTime ??
        null,
    }))
  }

  return []
}

function parsePrometheusMetrics(prometheusText) {
  if (typeof prometheusText !== 'string' || !prometheusText.trim()) return []

  const entries = []
  const lines = prometheusText.split('\n')
  const linePattern =
    /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)$/

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(linePattern)
    if (!match) continue

    const [, metricName, labelsRaw = '', valueRaw] = match
    const value = Number(valueRaw)
    if (!Number.isFinite(value)) continue

    const labels = {}
    const labelPattern = /([a-zA-Z_][a-zA-Z0-9_]*)="([^"]*)"/g
    let labelMatch = labelPattern.exec(labelsRaw)
    while (labelMatch) {
      labels[labelMatch[1]] = labelMatch[2]
      labelMatch = labelPattern.exec(labelsRaw)
    }

    entries.push({ name: metricName, labels, value })
  }

  return entries
}

function getPrometheusValueBySuffix(entries, suffix) {
  const entry = entries.find((metric) => metric.name.endsWith(suffix))
  return entry ? entry.value : null
}

function normalizeMetricThresholds(detailedHealth) {
  const source = detailedHealth?.data ?? detailedHealth ?? {}
  const thresholds = source.thresholds ?? {}

  return {
    errorRate: toNumber(
      thresholds.errorRate,
      DEFAULT_METRIC_THRESHOLDS.errorRate,
    ),
    p95ResponseTimeMs: toNumber(
      thresholds.p95ResponseTimeMs ?? thresholds.p95ResponseMs,
      DEFAULT_METRIC_THRESHOLDS.p95ResponseTimeMs,
    ),
  }
}

function normalizeMetrics({ detailedHealth, metricsPayload }) {
  const detailedSource = detailedHealth?.data ?? detailedHealth ?? {}
  const detailedMetrics = detailedSource.metrics ?? {}
  const legacySource = metricsPayload?.data ?? metricsPayload ?? {}
  const performance = legacySource.performance ?? legacySource.metrics ?? {}
  const prometheusEntries = parsePrometheusMetrics(metricsPayload)
  const prometheusActiveAlerts = getPrometheusValueBySuffix(
    prometheusEntries,
    'health_active_alerts',
  )

  return {
    avgResponseMs: toNumber(
      detailedMetrics.avgResponseTimeMs ??
        detailedMetrics.avgResponseMs ??
        performance.avgResponseTimeMs ??
        performance.avgResponseMs ??
        performance.averageResponseMs ??
        performance.avgMs ??
        0,
    ),
    p95ResponseMs: toNumber(
      detailedMetrics.p95ResponseTimeMs ??
        detailedMetrics.p95ResponseMs ??
        performance.p95ResponseTimeMs ??
        performance.p95ResponseMs ??
        performance.p95Ms ??
        performance.p95 ??
        0,
    ),
    errorRate: toNumber(detailedMetrics.errorRate ?? performance.errorRate ?? 0),
    requestsPerMinute: toNumber(
      detailedMetrics.requestsPerMinute ??
        performance.requestsPerMinute ??
        performance.rpm ??
        0,
    ),
    eventLoopLagMs: toNumber(
      detailedMetrics.eventLoopLagMs ?? performance.eventLoopLagMs ?? 0,
    ),
    heapUsagePercent: toNumber(
      detailedMetrics.heapUsagePercent ?? performance.heapUsagePercent ?? 0,
    ),
    uptimePercent: toNumber(
      detailedSource.uptimePercent ?? performance.uptimePercent ?? 0,
    ),
    uptimeSeconds: toNumber(
      detailedSource.uptime ?? performance.uptime ?? 0,
    ),
    activeAlertCount: toNumber(
      detailedSource.alertSummary?.activeCount ?? prometheusActiveAlerts ?? 0,
    ),
  }
}

function normalizeTrends(trendsPayload) {
  const source = trendsPayload?.data ?? trendsPayload ?? {}
  const pointsSource = Array.isArray(source.points)
    ? source.points
    : Array.isArray(source.items)
      ? source.items
      : []

  const points = pointsSource
    .map((point, index) => ({
      id: point.id ?? point.timestamp ?? `trend-${index}`,
      timestamp: point.timestamp ?? '',
      requestCount: toNumber(point.requestCount, 0),
      errorRate: toNumber(point.errorRate, 0),
      avgResponseMs: toNumber(
        point.avgResponseTimeMs ?? point.avgResponseMs ?? 0,
      ),
      p95ResponseMs: toNumber(
        point.p95ResponseTimeMs ?? point.p95ResponseMs ?? 0,
      ),
    }))
    .sort(
      (a, b) =>
        toNumber(Date.parse(a.timestamp), 0) - toNumber(Date.parse(b.timestamp), 0),
    )

  return {
    generatedAt: source.generatedAt ?? '',
    windowMs: toNumber(source.windowMs, 0),
    bucketMs: toNumber(source.bucketMs, 0),
    points,
  }
}

function normalizeAlertLevel(severity) {
  const value = String(severity ?? '').toLowerCase()
  if (value === 'critical' || value === 'error') return 'error'
  if (value === 'warning' || value === 'warn') return 'warning'
  return 'info'
}

function normalizeLifecycleAlerts(alertsPayload, fallbackStatus = 'active') {
  const source = alertsPayload?.data ?? alertsPayload ?? {}
  const itemsSource = Array.isArray(source.items)
    ? source.items
    : Array.isArray(source.alerts)
      ? source.alerts
      : []

  const items = itemsSource
    .map((alert, index) => {
      const code = String(alert.code ?? alert.id ?? `ALERT_${index}`)
      const status = String(alert.status ?? fallbackStatus ?? 'active').toLowerCase()
      const value = Number(alert.value)
      const threshold = Number(alert.threshold)
      const descriptionParts = []

      if (alert.message) descriptionParts.push(alert.message)
      if (Number.isFinite(value) && Number.isFinite(threshold)) {
        descriptionParts.push(`Value ${value}, threshold ${threshold}.`)
      }

      return {
        id: `${status}-${code}`,
        code,
        status,
        level: normalizeAlertLevel(alert.severity ?? alert.level),
        title: humanizeIdentifier(code),
        description:
          descriptionParts.join(' ').trim() ||
          'Monitoring threshold requires attention.',
        message: alert.message ?? '',
        firstSeenAt: alert.firstSeenAt ?? '',
        lastSeenAt: alert.lastSeenAt ?? '',
        resolvedAt: alert.resolvedAt ?? null,
        timesTriggered: toNumber(alert.timesTriggered, 0),
        metric: alert.metric ?? '',
        threshold: Number.isFinite(threshold) ? threshold : null,
        value: Number.isFinite(value) ? value : null,
      }
    })
    .sort((a, b) => {
      const aDate = Date.parse(a.lastSeenAt || a.firstSeenAt || '')
      const bDate = Date.parse(b.lastSeenAt || b.firstSeenAt || '')
      return toNumber(bDate, 0) - toNumber(aDate, 0)
    })

  const summarySource = source.summary ?? {}
  const activeCount = items.filter((alert) => alert.status === 'active').length
  const resolvedCount = items.filter((alert) => alert.status === 'resolved').length

  return {
    generatedAt: source.generatedAt ?? '',
    summary: {
      activeCount: toNumber(summarySource.activeCount, activeCount),
      resolvedCount: toNumber(summarySource.resolvedCount, resolvedCount),
      total: toNumber(summarySource.total, activeCount + resolvedCount),
    },
    items,
  }
}

export function useSystemMonitoring({
  enabled = true,
  enableAlerts = false,
  pollingInterval = 30000,
} = {}) {
  const { addToast } = useToaster()
  const { isSuperAdmin, hasCustomerRole, accessibleCustomerIds } = useAuthorization()
  const alertRef = useRef({
    healthKey: '',
    metricsKey: '',
    alertKeys: new Set(),
  })

  const isCustomerAdmin = useMemo(
    () =>
      accessibleCustomerIds.some((customerId) =>
        hasCustomerRole(customerId, 'CUSTOMER_ADMIN'),
      ),
    [accessibleCustomerIds, hasCustomerRole],
  )

  const isAdmin = isSuperAdmin || isCustomerAdmin
  const isMonitoringEnabled = enabled && isAdmin
  const isAdvancedMonitoringEnabled = isMonitoringEnabled && isSuperAdmin

  const healthQuery = useGetSystemHealthQuery(undefined, {
    skip: !isMonitoringEnabled,
    pollingInterval,
  })

  const detailedQuery = useGetDetailedHealthQuery(undefined, {
    skip: !isAdvancedMonitoringEnabled,
    pollingInterval,
  })

  const metricsQuery = useGetSystemMetricsQuery(undefined, {
    skip: !isAdvancedMonitoringEnabled,
    pollingInterval,
  })

  const trendsQuery = useGetHealthTrendsQuery(
    { window: DEFAULT_TREND_WINDOW, bucket: DEFAULT_TREND_BUCKET },
    {
      skip: !isAdvancedMonitoringEnabled,
      pollingInterval,
    },
  )

  const activeAlertsQuery = useGetHealthAlertsQuery(
    { status: 'active', limit: DEFAULT_ALERT_LIMIT },
    {
      skip: !isAdvancedMonitoringEnabled,
      pollingInterval,
    },
  )

  const resolvedAlertsQuery = useGetHealthAlertsQuery(
    { status: 'resolved', limit: DEFAULT_ALERT_LIMIT },
    {
      skip: !isAdvancedMonitoringEnabled,
      pollingInterval,
    },
  )

  const overallStatus = useMemo(() => {
    const health = healthQuery.data?.data ?? healthQuery.data ?? {}
    return normalizeStatus(health.status)
  }, [healthQuery.data])

  const dependencies = useMemo(
    () => normalizeDependencyEntries(detailedQuery.data),
    [detailedQuery.data],
  )

  const metrics = useMemo(
    () =>
      normalizeMetrics({
        detailedHealth: detailedQuery.data,
        metricsPayload: metricsQuery.data,
      }),
    [detailedQuery.data, metricsQuery.data],
  )

  const thresholds = useMemo(
    () => normalizeMetricThresholds(detailedQuery.data),
    [detailedQuery.data],
  )

  const trendData = useMemo(
    () => normalizeTrends(trendsQuery.data),
    [trendsQuery.data],
  )

  const activeLifecycleData = useMemo(
    () => normalizeLifecycleAlerts(activeAlertsQuery.data, 'active'),
    [activeAlertsQuery.data],
  )

  const resolvedLifecycleData = useMemo(
    () => normalizeLifecycleAlerts(resolvedAlertsQuery.data, 'resolved'),
    [resolvedAlertsQuery.data],
  )

  const dependencyAlerts = useMemo(
    () =>
      dependencies.filter((dep) => DEGRADED_STATES.has(dep.status)).map((dep) => ({
        id: `dependency-${dep.id}`,
        level:
          dep.status === 'DOWN' ||
          dep.status === 'UNHEALTHY' ||
          dep.status === 'ERROR'
            ? 'error'
            : 'warning',
        title: `${dep.name} is ${dep.status}`,
        description: dep.message || 'Dependency health requires attention.',
      })),
    [dependencies],
  )

  const metricAlerts = useMemo(() => {
    const alerts = []
    if (metrics.errorRate >= thresholds.errorRate) {
      alerts.push({
        id: 'metric-error-rate',
        level: 'warning',
        title: 'Error rate elevated',
        description: `Current error rate is ${(metrics.errorRate * 100).toFixed(1)}%.`,
      })
    }
    if (metrics.p95ResponseMs >= thresholds.p95ResponseTimeMs) {
      alerts.push({
        id: 'metric-latency',
        level: 'warning',
        title: 'P95 latency elevated',
        description: `Current P95 response time is ${Math.round(metrics.p95ResponseMs)}ms.`,
      })
    }
    return alerts
  }, [
    metrics.errorRate,
    metrics.p95ResponseMs,
    thresholds.errorRate,
    thresholds.p95ResponseTimeMs,
  ])

  const fallbackActiveAlerts = useMemo(
    () => [...dependencyAlerts, ...metricAlerts],
    [dependencyAlerts, metricAlerts],
  )

  const activeAlerts = useMemo(
    () => (isSuperAdmin ? activeLifecycleData.items : fallbackActiveAlerts),
    [activeLifecycleData.items, fallbackActiveAlerts, isSuperAdmin],
  )

  const resolvedAlerts = useMemo(
    () => (isSuperAdmin ? resolvedLifecycleData.items : []),
    [isSuperAdmin, resolvedLifecycleData.items],
  )

  const alertSummary = useMemo(
    () =>
      isSuperAdmin
        ? activeLifecycleData.summary
        : {
            activeCount: activeAlerts.length,
            resolvedCount: 0,
            total: activeAlerts.length,
          },
    [activeAlerts.length, activeLifecycleData.summary, isSuperAdmin],
  )

  useEffect(() => {
    if (!enableAlerts || !isMonitoringEnabled) return

    if (DEGRADED_STATES.has(overallStatus)) {
      const healthKey = `health-${overallStatus}`
      if (alertRef.current.healthKey !== healthKey) {
        addToast({
          title: `System health: ${overallStatus}`,
          description: 'The platform health status requires attention.',
          variant: overallStatus === 'DOWN' ? 'error' : 'warning',
        })
        alertRef.current.healthKey = healthKey
      }
    } else {
      alertRef.current.healthKey = ''
    }

    const metricsKey = [
      metrics.errorRate >= thresholds.errorRate ? 'er' : '',
      metrics.p95ResponseMs >= thresholds.p95ResponseTimeMs ? 'p95' : '',
    ]
      .filter(Boolean)
      .join('-')

    if (metricsKey && alertRef.current.metricsKey !== metricsKey) {
      addToast({
        title: 'Performance alert',
        description: 'System metrics exceeded monitoring thresholds.',
        variant: 'warning',
      })
      alertRef.current.metricsKey = metricsKey
    }
    if (!metricsKey) {
      alertRef.current.metricsKey = ''
    }

    const currentAlertKeys = new Set(activeAlerts.map((a) => a.id))
    activeAlerts.forEach((alert) => {
      if (!alertRef.current.alertKeys.has(alert.id)) {
        addToast({
          title: alert.title,
          description: alert.description,
          variant:
            alert.level === 'error'
              ? 'error'
              : alert.level === 'warning'
                ? 'warning'
                : 'info',
        })
      }
    })
    alertRef.current.alertKeys = currentAlertKeys
  }, [
    activeAlerts,
    addToast,
    enableAlerts,
    isMonitoringEnabled,
    metrics.errorRate,
    metrics.p95ResponseMs,
    overallStatus,
    thresholds.errorRate,
    thresholds.p95ResponseTimeMs,
  ])

  const isLoading =
    healthQuery.isLoading ||
    (isAdvancedMonitoringEnabled &&
      (detailedQuery.isLoading ||
        metricsQuery.isLoading ||
        trendsQuery.isLoading ||
        activeAlertsQuery.isLoading ||
        resolvedAlertsQuery.isLoading))

  const isFetching =
    healthQuery.isFetching ||
    (isAdvancedMonitoringEnabled &&
      (detailedQuery.isFetching ||
        metricsQuery.isFetching ||
        trendsQuery.isFetching ||
        activeAlertsQuery.isFetching ||
        resolvedAlertsQuery.isFetching))

  const error =
    healthQuery.error ??
    (isAdvancedMonitoringEnabled
      ? detailedQuery.error ??
        metricsQuery.error ??
        trendsQuery.error ??
        activeAlertsQuery.error ??
        resolvedAlertsQuery.error ??
        null
      : null)

  return {
    isAdmin,
    isSuperAdmin,
    overallStatus,
    dependencies,
    metrics,
    activeAlerts,
    resolvedAlerts,
    alertSummary,
    trendPoints: trendData.points,
    trendWindowMs: trendData.windowMs,
    trendBucketMs: trendData.bucketMs,
    trendGeneratedAt: trendData.generatedAt,
    isLoading,
    isFetching,
    error,
    refetchAll: () => {
      if (isMonitoringEnabled) {
        healthQuery.refetch()
      }
      if (isAdvancedMonitoringEnabled) {
        detailedQuery.refetch()
        metricsQuery.refetch()
        trendsQuery.refetch()
        activeAlertsQuery.refetch()
        resolvedAlertsQuery.refetch()
      }
    },
  }
}

export default useSystemMonitoring

