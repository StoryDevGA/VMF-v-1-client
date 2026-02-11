/**
 * useSystemMonitoring Hook (Phase 5.2)
 *
 * Facade hook that aggregates three RTK Query endpoints:
 *   - `GET /health`          — public liveness
 *   - `GET /health/detailed`  — dependency-level status (SUPER_ADMIN)
 *   - `GET /metrics`          — performance snapshot (SUPER_ADMIN)
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
 * @param {Object}  [options]
 * @param {boolean} [options.enabled=true]          — master toggle
 * @param {boolean} [options.enableAlerts=false]     — show toasts on degradation
 * @param {number}  [options.pollingInterval=30000]  — poll cadence in ms
 * @returns {{isAdmin, isSuperAdmin, overallStatus, dependencies, metrics, activeAlerts, isLoading, isFetching, error, refetchAll}}
 */

import { useEffect, useMemo, useRef } from 'react'
import { useToaster } from '../components/Toaster'
import { useAuthorization } from './useAuthorization.js'
import {
  useGetSystemHealthQuery,
  useGetDetailedHealthQuery,
  useGetSystemMetricsQuery,
} from '../store/api/systemApi.js'

const DEGRADED_STATES = new Set(['DEGRADED', 'DOWN', 'UNHEALTHY', 'ERROR'])

function normalizeStatus(value) {
  const status = String(value ?? '').toUpperCase()
  if (!status) return 'UNKNOWN'
  return status
}

function normalizeDependencyEntries(detailedHealth) {
  const source = detailedHealth?.data ?? detailedHealth ?? {}

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
      message: value?.message ?? value?.error ?? '',
      latencyMs: value?.latencyMs ?? value?.responseTimeMs ?? null,
    }))
  }

  if (source.services && typeof source.services === 'object') {
    return Object.entries(source.services).map(([name, value], index) => ({
      id: value?.id ?? name ?? `svc-${index}`,
      name,
      status: normalizeStatus(value?.status ?? value),
      message: value?.message ?? value?.error ?? '',
      latencyMs: value?.latencyMs ?? value?.responseTimeMs ?? null,
    }))
  }

  return []
}

function normalizeMetrics(metrics) {
  const source = metrics?.data ?? metrics ?? {}
  const performance = source.performance ?? source.metrics ?? {}

  return {
    avgResponseMs: Number(
      performance.avgResponseMs ??
        performance.averageResponseMs ??
        performance.avgMs ??
        0,
    ),
    p95ResponseMs: Number(
      performance.p95ResponseMs ?? performance.p95Ms ?? performance.p95 ?? 0,
    ),
    errorRate: Number(performance.errorRate ?? 0),
    requestsPerMinute: Number(
      performance.requestsPerMinute ?? performance.rpm ?? 0,
    ),
    uptimePercent: Number(source.uptimePercent ?? performance.uptimePercent ?? 0),
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
    dependencyKeys: new Set(),
  })

  const isCustomerAdmin = useMemo(
    () =>
      accessibleCustomerIds.some((customerId) =>
        hasCustomerRole(customerId, 'CUSTOMER_ADMIN'),
      ),
    [accessibleCustomerIds, hasCustomerRole],
  )

  const isAdmin = isSuperAdmin || isCustomerAdmin
  const queryEnabled = enabled && isAdmin

  const healthQuery = useGetSystemHealthQuery(undefined, {
    skip: !queryEnabled,
    pollingInterval,
  })

  const detailedQuery = useGetDetailedHealthQuery(undefined, {
    skip: !queryEnabled,
    pollingInterval,
  })

  const metricsQuery = useGetSystemMetricsQuery(undefined, {
    skip: !queryEnabled,
    pollingInterval,
  })

  const overallStatus = useMemo(() => {
    const health = healthQuery.data?.data ?? healthQuery.data ?? {}
    return normalizeStatus(health.status)
  }, [healthQuery.data])

  const dependencies = useMemo(
    () => normalizeDependencyEntries(detailedQuery.data),
    [detailedQuery.data],
  )

  const metrics = useMemo(
    () => normalizeMetrics(metricsQuery.data),
    [metricsQuery.data],
  )

  const dependencyAlerts = useMemo(
    () =>
      dependencies.filter((dep) => DEGRADED_STATES.has(dep.status)).map((dep) => ({
        id: `dependency-${dep.id}`,
        level: dep.status === 'DOWN' ? 'error' : 'warning',
        title: `${dep.name} is ${dep.status}`,
        description: dep.message || 'Dependency health requires attention.',
      })),
    [dependencies],
  )

  const metricAlerts = useMemo(() => {
    const alerts = []
    if (metrics.errorRate >= 0.05) {
      alerts.push({
        id: 'metric-error-rate',
        level: 'warning',
        title: 'Error rate elevated',
        description: `Current error rate is ${(metrics.errorRate * 100).toFixed(1)}%.`,
      })
    }
    if (metrics.p95ResponseMs >= 200) {
      alerts.push({
        id: 'metric-latency',
        level: 'warning',
        title: 'P95 latency elevated',
        description: `Current P95 response time is ${Math.round(metrics.p95ResponseMs)}ms.`,
      })
    }
    return alerts
  }, [metrics.errorRate, metrics.p95ResponseMs])

  const activeAlerts = useMemo(
    () => [...dependencyAlerts, ...metricAlerts],
    [dependencyAlerts, metricAlerts],
  )

  useEffect(() => {
    if (!enableAlerts || !queryEnabled) return

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
      metrics.errorRate >= 0.05 ? 'er' : '',
      metrics.p95ResponseMs >= 200 ? 'p95' : '',
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

    const currentDependencyKeys = new Set(dependencyAlerts.map((a) => a.id))
    dependencyAlerts.forEach((alert) => {
      if (!alertRef.current.dependencyKeys.has(alert.id)) {
        addToast({
          title: alert.title,
          description: alert.description,
          variant: alert.level === 'error' ? 'error' : 'warning',
        })
      }
    })
    alertRef.current.dependencyKeys = currentDependencyKeys
  }, [
    addToast,
    dependencyAlerts,
    enableAlerts,
    metrics.errorRate,
    metrics.p95ResponseMs,
    overallStatus,
    queryEnabled,
  ])

  const isLoading =
    healthQuery.isLoading || detailedQuery.isLoading || metricsQuery.isLoading
  const isFetching =
    healthQuery.isFetching || detailedQuery.isFetching || metricsQuery.isFetching

  const error = healthQuery.error ?? detailedQuery.error ?? metricsQuery.error ?? null

  return {
    isAdmin,
    isSuperAdmin,
    overallStatus,
    dependencies,
    metrics,
    activeAlerts,
    isLoading,
    isFetching,
    error,
    refetchAll: () => {
      healthQuery.refetch()
      detailedQuery.refetch()
      metricsQuery.refetch()
    },
  }
}

export default useSystemMonitoring
