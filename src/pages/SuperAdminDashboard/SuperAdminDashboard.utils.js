const HEALTH_STATUS_VARIANTS = {
  healthy: 'success',
  degraded: 'warning',
  unhealthy: 'error',
}

const COUNT_INSIGHT_CONFIG = {
  customers: { label: 'customers', countKey: 'customers' },
  'license-levels': { label: 'levels', countKey: 'licenseLevels' },
  roles: { label: 'roles', countKey: 'roles' },
  'framework-registry': { label: 'frameworks', countKey: 'frameworkRegistries' },
  'runtime-paths': { label: 'paths', countKey: 'runtimePaths' },
  'skill-roles': { label: 'roles', countKey: 'skillRoles' },
  skills: { label: 'skills', countKey: 'runtimeSkills' },
  'validation-registry': { label: 'checks', countKey: 'validationRegistry' },
  agents: { label: 'agents', countKey: 'runtimeAgents' },
  'workflow-policies': { label: 'policies', countKey: 'workflowPolicies' },
  'framework-packages': { label: 'packages', countKey: 'frameworkPackages' },
  'ui-contracts': { label: 'contracts', countKey: 'uiContracts' },
  'knowledge-packs': { label: 'packs', countKey: 'knowledgePacks' },
  'audit-logs': { label: 'logs', countKey: 'auditLogs' },
  'denied-access-logs': { label: 'denied', countKey: 'deniedAccessLogs' },
}

const numberFormatter = new Intl.NumberFormat('en-GB')

export const DASHBOARD_COUNT_QUERY = Object.freeze({ page: 1, pageSize: 1 })
export const DASHBOARD_COUNT_QUERY_OPTIONS = Object.freeze({ refetchOnMountOrArgChange: 300 })

export function formatTokenLabel(value, fallback = 'Unknown') {
  const normalizedValue = String(value ?? '').trim()

  if (!normalizedValue) {
    return fallback
  }

  return normalizedValue
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

export function formatNumber(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return '0'
  }

  return numberFormatter.format(numericValue)
}

export function getResponseTotal(response) {
  const candidateValues = [
    response?.meta?.total,
    response?.meta?.totalCount,
    response?.data?.meta?.total,
    response?.data?.meta?.totalCount,
    response?.data?.total,
    response?.total,
  ]
  const total = candidateValues.find((value) => Number.isFinite(Number(value)))

  if (total !== undefined) {
    return Number(total)
  }

  if (Array.isArray(response?.data)) {
    return response.data.length
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data.length
  }

  return null
}

export function formatUptime(value) {
  const totalSeconds = Math.floor(Number(value))

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return 'Not available'
  }

  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h`
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  return `${Math.max(minutes, 1)}m`
}

export function getStatusVariant(value) {
  const normalizedStatus = String(value ?? '').trim().toLowerCase()

  return HEALTH_STATUS_VARIANTS[normalizedStatus] ?? 'neutral'
}

export function getLaunchInsight({
  link,
  counts,
  healthData,
  healthError,
  isRuntimeControlEnabled,
}) {
  if (link.key === 'runtime-control') {
    return {
      type: 'count',
      value: isRuntimeControlEnabled ? 'Live' : 'Pending',
      variant: isRuntimeControlEnabled ? 'info' : 'warning',
      meta: isRuntimeControlEnabled ? 'Runtime modules' : 'Version bridge',
    }
  }

  if (link.key === 'system-versioning') {
    return {
      type: 'label',
      value: 'Bridge',
      variant: 'neutral',
      meta: 'Version policy',
    }
  }

  if (link.key === 'system-monitoring') {
    const healthStatus = healthError ? 'Unavailable' : formatTokenLabel(healthData?.status, 'Unknown')

    return {
      type: 'status',
      value: healthStatus,
      variant: healthError ? 'error' : getStatusVariant(healthData?.status),
      meta: 'Health endpoint',
    }
  }

  const config = COUNT_INSIGHT_CONFIG[link.key]

  if (!config) {
    return null
  }

  const value = counts[config.countKey]

  return {
    type: 'count',
    value: value === null ? '--' : formatNumber(value),
    variant: value === null ? 'neutral' : 'info',
    meta: config.label,
  }
}
