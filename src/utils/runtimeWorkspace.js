export const RUNTIME_WORK_TYPE_PREFIXES = Object.freeze({
  VALUE_NARRATIVE: 'VN',
  DEAL_ANALYSIS: 'DA',
  BUSINESS_CASE: 'BC',
  ACCOUNT_PLAN: 'AP',
})

export const RUNTIME_STATUS_VARIANTS = Object.freeze({
  DRAFT: 'neutral',
  READY: 'info',
  ACTIVE: 'success',
  WAITING: 'warning',
  REVIEW: 'info',
  BLOCKED: 'error',
  COMPLETED: 'success',
  ARCHIVED: 'neutral',
})

export const EXECUTION_STATE_VARIANTS = Object.freeze({
  IDLE: 'neutral',
  NOT_STARTED: 'neutral',
  QUEUED: 'info',
  RUNNING: 'success',
  VALIDATING: 'info',
  EXECUTING: 'success',
  WAITING_APPROVAL: 'warning',
  BLOCKED: 'error',
  PAUSED: 'warning',
  ERROR: 'error',
  FAILED: 'error',
  COMPLETE: 'success',
  FINISHED: 'success',
})

const normalizeRuntimeToken = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()

export const formatRuntimeTokenLabel = (value, fallback = '--') => {
  const normalized = normalizeRuntimeToken(value)
  if (!normalized) return fallback

  return normalized
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export const getRuntimeWorkTypePrefix = (workType) =>
  RUNTIME_WORK_TYPE_PREFIXES[normalizeRuntimeToken(workType)] ?? 'RT'

export const getRuntimeStatusVariant = (status, fallback = 'neutral') =>
  RUNTIME_STATUS_VARIANTS[normalizeRuntimeToken(status)] ?? fallback

export const getExecutionStateVariant = (executionState, fallback = 'neutral') =>
  EXECUTION_STATE_VARIANTS[normalizeRuntimeToken(executionState)] ?? fallback

export const getRuntimeReadinessVariant = (readinessLabel) => {
  if (readinessLabel === 'Execution ready') return 'success'
  if (readinessLabel === 'Execution blocked') return 'error'
  if (readinessLabel === 'Readiness pending') return 'warning'
  return 'info'
}

export const getRuntimeInstanceDisplayId = (
  runtimeRecord,
  workType = 'VALUE_NARRATIVE',
  fallback = 'Pending runtime ID',
) => {
  const candidates = [
    runtimeRecord?.runtimeInstanceId,
    runtimeRecord?.runtimeInstanceKey,
    runtimeRecord?.runtimeId,
    runtimeRecord?.instanceId,
  ]

  for (const candidate of candidates) {
    const trimmed = String(candidate ?? '').trim()
    if (trimmed) return trimmed
  }

  const prefix = getRuntimeWorkTypePrefix(workType)
  return `${prefix} - ${fallback}`
}

export const getRuntimeInstanceRouteId = (runtimeRecord) =>
  String(
    runtimeRecord?.runtimeInstanceKey
      ?? runtimeRecord?.runtimeInstanceId
      ?? runtimeRecord?.runtimeId
      ?? runtimeRecord?.id
      ?? runtimeRecord?._id
      ?? '',
  ).trim()

export const getRuntimeWorkspaceRoute = (runtimeRecordOrId) => {
  const runtimeInstanceId = typeof runtimeRecordOrId === 'object' && runtimeRecordOrId !== null
    ? getRuntimeInstanceRouteId(runtimeRecordOrId)
    : String(runtimeRecordOrId ?? '').trim()

  if (!runtimeInstanceId) return '/app/workspaces/vmf'

  return `/app/runtime/${encodeURIComponent(runtimeInstanceId)}`
}

export const getRuntimeLifecycleStatus = (runtimeRecord, fallback = 'DRAFT') => {
  const status = normalizeRuntimeToken(
    runtimeRecord?.runtimeStatus
      ?? runtimeRecord?.runtimeLifecycleStatus
      ?? runtimeRecord?.lifecycleStatus
      ?? runtimeRecord?.status
      ?? fallback,
  )

  return status || fallback
}

export const getRuntimeExecutionState = (runtimeRecord, fallback = 'NOT_STARTED') => {
  const state = normalizeRuntimeToken(
    runtimeRecord?.executionState
      ?? runtimeRecord?.executionStatus
      ?? runtimeRecord?.runtimeExecutionState
      ?? fallback,
  )

  return state || fallback
}

export const getRuntimeReadinessLabel = (runtimeRecord) => {
  const completion = normalizeRuntimeToken(runtimeRecord?.completionState)
  const validation = normalizeRuntimeToken(runtimeRecord?.validationStatus)
  const lockStatus = normalizeRuntimeToken(runtimeRecord?.lockStatus)
  const snapshotStatus = normalizeRuntimeToken(runtimeRecord?.snapshotStatus)

  if (['FAILED', 'ERROR', 'BLOCKED'].includes(validation)) {
    return 'Execution blocked'
  }

  if (
    ['COMPLETE', 'COMPLETED'].includes(completion)
    && ['READY', 'VALIDATED'].includes(validation)
    && lockStatus === 'LOCKED'
    && ['BOUND', 'PACKAGE_BOUND'].includes(snapshotStatus)
  ) {
    return 'Execution ready'
  }

  if (!completion && !validation && !lockStatus && !snapshotStatus) {
    return 'Pending runtime engine'
  }

  return 'Readiness pending'
}
