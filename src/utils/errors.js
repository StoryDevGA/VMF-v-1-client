/**
 * Error Handling Utilities
 *
 * Standardized error objects, API error code mapping, and request
 * correlation helpers for the frontend.
 */

/* ------------------------------------------------------------------ */
/*  Error code → human-readable messages                              */
/* ------------------------------------------------------------------ */

/** @type {Record<string, string>} */
const ERROR_MESSAGES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password.',
  AUTH_TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  AUTH_TOKEN_INVALID: 'Your session is invalid. Please sign in again.',
  AUTH_REFRESH_FAILED: 'Unable to refresh session. Please sign in again.',
  AUTH_ACCOUNT_DISABLED: 'Your account has been disabled. Contact your administrator.',
  AUTH_CUSTOMER_INACTIVE:
    'Your customer is inactive. Contact your Super Admin to restore access.',
  STEP_UP_REQUIRED: 'Please re-authenticate to continue with this sensitive action.',
  STEP_UP_INVALID: 'Step-up token expired or invalid. Re-authenticate and try again.',
  STEP_UP_UNAVAILABLE: 'Step-up verification is unavailable right now. Try again shortly.',

  // Authorization
  AUTHZ_FORBIDDEN: 'You do not have permission to perform this action.',
  AUTHZ_ROLE_REQUIRED: 'This action requires a higher role.',
  AUTHZ_TENANT_DISABLED: 'This tenant has been disabled.',
  LICENSE_FEATURE_NOT_ENABLED: 'Your current licence does not include this feature.',
  CUSTOMER_CONTEXT_REQUIRED:
    'No customer context is available for this action. Refresh and try again.',
  CUSTOMER_INACTIVE:
    'This customer is inactive. Reactivate the customer to continue.',

  // Validation
  VALIDATION_FAILED: 'Please check the form for errors.',
  VALIDATION_EMAIL_EXISTS: 'A user with this email already exists.',
  VALIDATION_REQUIRED_FIELD: 'This field is required.',
  INVITATION_ALREADY_ACTIVE: 'An active invitation already exists for this email address.',
  INVITATION_NOT_RESENDABLE: 'This invitation can no longer be resent.',
  INVITATION_ALREADY_TERMINAL: 'This invitation can no longer be changed.',
  RULES_UPDATE_NOT_ALLOWED:
    'Policy rules cannot be edited in place. Create a new policy version instead.',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',
  AUTH_RATE_LIMITED: 'Too many authentication attempts. Please wait before trying again.',

  // Server / generic
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  NETWORK_ERROR: 'Unable to reach the server. Check your connection.',
  CLIENT_OFFLINE: 'You appear to be offline. Reconnect and try again.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again shortly.',
  NOT_FOUND: 'The requested resource was not found.',
  TIMEOUT: 'The request timed out. Please try again.',
  HTTP_400: 'The request is invalid. Please check your input.',
  HTTP_401: 'Your session has expired. Please sign in again.',
  HTTP_403: 'You do not have permission to perform this action.',
  HTTP_404: 'The requested resource was not found.',
  HTTP_409: 'This action conflicts with the current state of the resource.',
  HTTP_422: 'Please check the form for errors.',
  HTTP_423: 'This tenant is currently disabled.',
  HTTP_429: 'Too many requests. Please wait a moment and try again.',
  HTTP_500: 'Something went wrong. Please try again later.',
  HTTP_502: 'The service gateway returned an invalid response. Please try again.',
  HTTP_503: 'The service is temporarily unavailable. Please try again shortly.',
  HTTP_504: 'The service timed out. Please try again.',
}

const RATE_LIMIT_CODES = new Set([
  'RATE_LIMIT_EXCEEDED',
  'AUTH_RATE_LIMITED',
  'HTTP_429',
])

const CANONICAL_ADMIN_CONFLICT_FALLBACKS = {
  assign:
    'This customer already has a Canonical Admin. Use Transfer Ownership to move ownership to an existing active user.',
  update_roles:
    'Customer Admin ownership is governed separately. Use Transfer Ownership instead of changing this role here.',
  disable:
    'This user is the Canonical Admin for an active customer. Transfer ownership before disabling access.',
  delete:
    'This user is the Canonical Admin for an active customer. Transfer ownership before deleting this account.',
}

const CANONICAL_ADMIN_CONFLICT_REASONS = new Set([
  'CANONICAL_ADMIN_EXISTS',
  'SECOND_CUSTOMER_ADMIN_BLOCKED',
  'CANONICAL_ADMIN_ROLE_REMOVAL_BLOCKED',
  'CANONICAL_ADMIN_PROTECTED',
])

const CANONICAL_ADMIN_CONFLICT_REASON_MESSAGES = {
  assign: {
    CANONICAL_ADMIN_EXISTS:
      'This customer already has a Canonical Admin. Use Transfer Ownership to move ownership to an existing active user.',
    SECOND_CUSTOMER_ADMIN_BLOCKED:
      'A second Customer Admin cannot be assigned while canonical ownership is active. Use Transfer Ownership instead.',
  },
  update_roles: {
    CANONICAL_ADMIN_EXISTS:
      'Customer Admin ownership is governed separately. Use Transfer Ownership instead of changing this role here.',
    SECOND_CUSTOMER_ADMIN_BLOCKED:
      'Customer Admin ownership is governed separately. Use Transfer Ownership instead of changing this role here.',
    CANONICAL_ADMIN_ROLE_REMOVAL_BLOCKED:
      'You cannot remove the governed Customer Admin role here. Transfer ownership first.',
    CANONICAL_ADMIN_PROTECTED:
      'This user is protected by canonical ownership governance. Transfer ownership first.',
  },
  disable: {
    CANONICAL_ADMIN_PROTECTED:
      'This user is the Canonical Admin for an active customer. Transfer ownership before disabling access.',
  },
  delete: {
    CANONICAL_ADMIN_PROTECTED:
      'This user is the Canonical Admin for an active customer. Transfer ownership before deleting this account.',
  },
}

const GENERIC_CONFLICT_MESSAGE_PATTERN =
  /conflicts with the current state of the resource/i

const GOVERNANCE_LIMIT_REASONS = new Set([
  'TENANT_LIMIT_REACHED',
  'VMF_LIMIT_REACHED',
])

const TENANT_ADMIN_ASSIGNMENT_REASONS = new Set([
  'TENANT_ADMIN_ASSIGNMENTS_INVALID',
  'TENANT_ADMIN_LIMIT_EXCEEDED',
])

const ROLE_CONFLICT_REASONS = new Set([
  'ROLE_IN_USE',
])

const GOVERNANCE_LIMIT_FALLBACKS = {
  TENANT_LIMIT_REACHED: 'Tenant limit reached for this customer.',
  VMF_LIMIT_REACHED: 'VMF limit reached for this tenant.',
  default: 'A governance limit was reached. Update customer limits and retry.',
}

const USER_EMAIL_CONFLICT_REASON_MESSAGES = {
  'already-in-customer': (existingUserSuffix) =>
    `A user with this email already exists in this customer${existingUserSuffix}.`,
  'other-customer': () =>
    'This email belongs to a user in another customer and cannot be used here.',
  'existing-identity': (existingUserSuffix) =>
    `An existing identity already uses this email${existingUserSuffix}.`,
}

const USER_LIFECYCLE_REASON_MESSAGES = {
  USER_INVALID_CUSTOMER_MEMBERSHIP:
    'This user is no longer valid for the current customer context. Refresh and retry.',
  USER_ALREADY_ACTIVE: 'This user is already active.',
  USER_ALREADY_DISABLED: 'This user is already disabled.',
  USER_DELETE_REQUIRES_DISABLED:
    'Disable the user before deleting this account.',
  INVITATION_RESEND_REQUIRES_ACTIVE_USER:
    'Invitation resend is only available for active users. Reactivate the user first.',
  INVITATION_RESEND_REQUIRES_UNTRUSTED:
    'Invitation resend is only available when trust is UNTRUSTED.',
}

/**
 * Format seconds into short retry text.
 * @param {number} seconds
 * @returns {string}
 */
export const formatRetryAfter = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0))
  if (safeSeconds <= 0) return 'a moment'

  const minutes = Math.floor(safeSeconds / 60)
  const remaining = safeSeconds % 60
  if (minutes === 0) return `${remaining}s`
  if (remaining === 0) return `${minutes}m`
  return `${minutes}m ${remaining}s`
}

/**
 * Resolve an error code to a user-friendly message.
 * Falls back to the raw code if no mapping exists.
 * @param {string} code
 * @returns {string}
 */
export const getErrorMessage = (code) =>
  ERROR_MESSAGES[code] ?? code ?? ERROR_MESSAGES.SERVER_ERROR

/**
 * Append request reference to a message when available.
 *
 * @param {string} message
 * @param {string | undefined} requestId
 * @returns {string}
 */
export const appendRequestReference = (message, requestId) => {
  const normalizedMessage = String(message ?? '').trim()
  if (!requestId) return normalizedMessage
  if (normalizedMessage.includes(`(Ref: ${requestId})`)) return normalizedMessage
  return `${normalizedMessage} (Ref: ${requestId})`
}

/**
 * Derive normalized step-up error signal from code/message.
 *
 * @param {{ code?: string, message?: string } | undefined} err
 * @returns {'required' | 'invalid' | 'unavailable' | null}
 */
export const getStepUpErrorSignal = (err) => {
  const code = String(err?.code ?? '').trim().toUpperCase()
  const message = String(err?.message ?? '').toUpperCase()
  const hasStepUpMarker = /STEP[\s-]?UP/.test(message)

  if (code === 'STEP_UP_REQUIRED') return 'required'
  if (
    code === 'STEP_UP_INVALID' ||
    (hasStepUpMarker && (message.includes('EXPIRED') || message.includes('INVALID')))
  ) {
    return 'invalid'
  }
  if (code === 'STEP_UP_UNAVAILABLE' || (hasStepUpMarker && message.includes('UNAVAILABLE'))) {
    return 'unavailable'
  }

  return null
}

/**
 * Best-effort parser for API error payloads that may arrive as a string
 * (e.g. RTK Query PARSING_ERROR with JSON body text).
 *
 * @param {unknown} data
 * @returns {Object}
 */
const toErrorDataObject = (data) => {
  if (data && typeof data === 'object') return data

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // Ignore invalid JSON and fall through to empty object.
    }
  }

  return {}
}

const getFirstDetailMessage = (details) => {
  if (!details || typeof details !== 'object') return ''

  const stack = [details]
  while (stack.length > 0) {
    const current = stack.shift()

    if (typeof current === 'string' && current.trim()) {
      return current.trim()
    }

    if (Array.isArray(current)) {
      stack.push(...current)
      continue
    }

    if (current && typeof current === 'object') {
      if (typeof current.message === 'string' && current.message.trim()) {
        return current.message.trim()
      }
      stack.push(...Object.values(current))
    }
  }

  return ''
}

/* ------------------------------------------------------------------ */
/*  Standard AppError shape                                           */
/* ------------------------------------------------------------------ */

/**
 * @typedef {Object} AppError
 * @property {string}  code      - Machine-readable error code
 * @property {string}  message   - User-friendly error message
 * @property {number}  [status]  - HTTP status code
 * @property {string}  [requestId] - X-Request-ID for support correlation
 * @property {number}  [retryAfterSeconds] - Retry wait hint for rate-limited requests
 * @property {Object}  [details]   - Field-level validation errors, etc.
 */

/**
 * Normalise an RTK Query error (or any thrown object) into a
 * predictable AppError shape.
 *
 * @param {unknown} error
 * @returns {AppError}
 */
export const normalizeError = (error) => {
  // RTK Query fetchBaseQuery error
  if (error && typeof error === 'object' && 'status' in error) {
    const data = toErrorDataObject(error.data)

    // Backend wraps errors as { error: { code, message, … } } — unwrap it.
    const nested =
      data.error && typeof data.error === 'object' ? data.error : {}

    const status =
      typeof error.status === 'number'
        ? error.status
        : typeof error.originalStatus === 'number'
          ? error.originalStatus
        : undefined
    const code =
      nested.code ?? data.code ?? (status ? `HTTP_${status}` : 'SERVER_ERROR')
    const requestId =
      nested.requestId ?? data.requestId ?? data.requestID ?? undefined
    const retryAfterSeconds = Number(
      nested.retryAfterSeconds ?? data.retryAfterSeconds ?? data.retryAfter ?? 0,
    ) || undefined

    let message =
      nested.message ?? data.message ?? getErrorMessage(code) ?? ERROR_MESSAGES.SERVER_ERROR
    if (RATE_LIMIT_CODES.has(code) && retryAfterSeconds) {
      message = `${message} Try again in ${formatRetryAfter(retryAfterSeconds)}.`
    }
    if (requestId) {
      message = `${message} (Ref: ${requestId})`
    }

    return {
      code,
      message,
      status,
      requestId,
      retryAfterSeconds,
      details: nested.details ?? data.details ?? undefined,
    }
  }

  // Network / fetch failure
  if (error && typeof error === 'object' && 'error' in error) {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
    return {
      code: isOffline ? 'CLIENT_OFFLINE' : 'NETWORK_ERROR',
      message: isOffline ? ERROR_MESSAGES.CLIENT_OFFLINE : ERROR_MESSAGES.NETWORK_ERROR,
      status: undefined,
      requestId: undefined,
      retryAfterSeconds: undefined,
      details: undefined,
    }
  }

  // Plain Error or string
  if (error instanceof Error) {
    return {
      code: 'CLIENT_ERROR',
      message: error.message,
      status: undefined,
      requestId: undefined,
      retryAfterSeconds: undefined,
      details: undefined,
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: ERROR_MESSAGES.SERVER_ERROR,
    status: undefined,
    requestId: undefined,
    retryAfterSeconds: undefined,
    details: undefined,
  }
}

/**
 * Check if an error represents an authentication failure that should
 * trigger a logout.
 * @param {AppError} err
 * @returns {boolean}
 */
export const isAuthError = (err) =>
  [401].includes(err?.status) ||
  ['AUTH_TOKEN_EXPIRED', 'AUTH_TOKEN_INVALID', 'AUTH_REFRESH_FAILED'].includes(err?.code)

/**
 * Check if an error is an authorization (forbidden) response.
 * @param {AppError} err
 * @returns {boolean}
 */
export const isAuthzError = (err) =>
  err?.status === 403 ||
  ['FORBIDDEN', 'AUTHZ_FORBIDDEN', 'AUTHZ_ROLE_REQUIRED'].includes(err?.code)

/**
 * Check if an error is specifically a tenant-disabled response.
 * @param {AppError} err
 * @returns {boolean}
 */
export const isTenantDisabledError = (err) =>
  err?.code === 'TENANT_DISABLED' || err?.code === 'AUTHZ_TENANT_DISABLED'

/**
 * Check if an error is an inactive-customer response.
 * Covers both scoped-route and login variants.
 *
 * @param {AppError} err
 * @returns {boolean}
 */
export const isCustomerInactiveError = (err) =>
  ['CUSTOMER_INACTIVE', 'AUTH_CUSTOMER_INACTIVE'].includes(
    String(err?.code ?? '').trim().toUpperCase(),
  ) ||
  String(err?.details?.reason ?? '').trim().toUpperCase() === 'CUSTOMER_INACTIVE'

/**
 * Check if an error indicates selected-customer licence entitlement denial.
 *
 * @param {AppError} err
 * @returns {boolean}
 */
export const isLicenseFeatureNotEnabledError = (err) =>
  String(err?.code ?? '').trim().toUpperCase() === 'LICENSE_FEATURE_NOT_ENABLED' ||
  String(err?.details?.reason ?? '').trim().toUpperCase() === 'LICENSE_FEATURE_NOT_ENABLED'

/**
 * Resolve inactive-customer errors to stable operator guidance.
 *
 * @param {AppError | null | undefined} err
 * @param {string} [fallbackMessage]
 * @returns {string}
 */
export const getCustomerInactiveMessage = (
  err,
  fallbackMessage = getErrorMessage('CUSTOMER_INACTIVE'),
) => appendRequestReference(fallbackMessage, err?.requestId)

/**
 * Resolve licence-feature denial errors to stable operator guidance.
 *
 * @param {AppError | null | undefined} err
 * @param {string} [fallbackMessage]
 * @returns {string}
 */
export const getLicenseFeatureNotEnabledMessage = (
  err,
  fallbackMessage = getErrorMessage('LICENSE_FEATURE_NOT_ENABLED'),
) => {
  const feature = String(err?.details?.feature ?? '').trim().toUpperCase()
  const message = feature
    ? `Your current licence does not include ${feature}.`
    : fallbackMessage

  return appendRequestReference(message, err?.requestId)
}

/**
 * Check if an error indicates canonical Customer Admin governance conflict.
 * Uses status + known detail keys + backend conflict message patterns.
 *
 * @param {AppError} err
 * @returns {boolean}
 */
export const isCanonicalAdminConflictError = (err) => {
  if (err?.status !== 409) return false

  const reason = String(err?.details?.reason ?? '').trim().toUpperCase()
  if (reason && CANONICAL_ADMIN_CONFLICT_REASONS.has(reason)) {
    return true
  }

  const details = err?.details
  if (
    details &&
    typeof details === 'object' &&
    (details.canonicalAdminUserId || details.conflictingAdminUserId)
  ) {
    return true
  }

  return false
}

/**
 * Resolve canonical Customer Admin conflict to contextual UI guidance.
 *
 * @param {AppError} err
 * @param {'assign'|'update_roles'|'disable'|'delete'} [operation='update_roles']
 * @returns {string}
 */
export const getCanonicalAdminConflictMessage = (err, operation = 'update_roles') => {
  const reason = String(err?.details?.reason ?? '').trim().toUpperCase()
  const fallback =
    CANONICAL_ADMIN_CONFLICT_FALLBACKS[operation] ??
    CANONICAL_ADMIN_CONFLICT_FALLBACKS.update_roles
  const reasonMessage = CANONICAL_ADMIN_CONFLICT_REASON_MESSAGES[operation]?.[reason]

  return appendRequestReference(reasonMessage ?? fallback, err?.requestId)
}

/**
 * Resolve stable email-conflict payloads to field guidance.
 *
 * @param {AppError} err
 * @returns {string}
 */
export const getUserEmailConflictMessage = (err) => {
  const reason = String(err?.details?.reason ?? '')
    .trim()
    .toLowerCase()
  const existingUserId = String(err?.details?.existingUserId ?? '').trim()
  const existingUserSuffix = existingUserId ? ` (User ID: ${existingUserId})` : ''

  if (err?.code === 'USER_ALREADY_EXISTS' && USER_EMAIL_CONFLICT_REASON_MESSAGES[reason]) {
    return appendRequestReference(
      USER_EMAIL_CONFLICT_REASON_MESSAGES[reason](existingUserSuffix),
      err?.requestId,
    )
  }

  if (err?.code === 'USER_CUSTOMER_CONFLICT' && reason === 'other-customer') {
    return appendRequestReference(
      'This user belongs to another customer and cannot be assigned to this customer.',
      err?.requestId,
    )
  }

  const detailMessage = getFirstDetailMessage(err?.details)
  if (detailMessage && detailMessage.trim().toLowerCase() !== reason) {
    return appendRequestReference(detailMessage, err?.requestId)
  }

  return err?.message || getErrorMessage(err?.code)
}

/**
 * Resolve stable lifecycle reasons to actionable UI guidance.
 *
 * @param {AppError} err
 * @param {string} [fallbackMessage]
 * @returns {string}
 */
export const getUserLifecycleMessage = (err, fallbackMessage) => {
  const reason = String(err?.details?.reason ?? '').trim().toUpperCase()

  if (reason && USER_LIFECYCLE_REASON_MESSAGES[reason]) {
    return appendRequestReference(USER_LIFECYCLE_REASON_MESSAGES[reason], err?.requestId)
  }

  const detailMessage = getFirstDetailMessage(err?.details)
  if (detailMessage && detailMessage.trim().toUpperCase() !== reason) {
    return appendRequestReference(detailMessage, err?.requestId)
  }

  return err?.message || fallbackMessage || getErrorMessage(err?.code)
}

/**
 * Check if an error represents governance limit enforcement conflict.
 *
 * @param {AppError} err
 * @param {'TENANT_LIMIT_REACHED'|'VMF_LIMIT_REACHED'} [expectedReason]
 * @returns {boolean}
 */
export const isGovernanceLimitConflictError = (err, expectedReason) => {
  if (err?.status !== 409 || err?.code !== 'CONFLICT') return false

  const reason = err?.details?.reason
  if (!reason || !GOVERNANCE_LIMIT_REASONS.has(reason)) return false
  if (expectedReason) return reason === expectedReason

  return true
}

/**
 * Build contextual message for governance limit conflicts.
 *
 * @param {AppError} err
 * @returns {string}
 */
export const getGovernanceLimitConflictMessage = (err) => {
  const reason = err?.details?.reason
  const fallback =
    GOVERNANCE_LIMIT_FALLBACKS[reason] ?? GOVERNANCE_LIMIT_FALLBACKS.default

  const baseMessage = String(err?.message ?? '').trim()
  if (baseMessage && !GENERIC_CONFLICT_MESSAGE_PATTERN.test(baseMessage)) {
    return baseMessage
  }

  const limit = Number(err?.details?.limit)
  const currentCount = Number(err?.details?.currentCount)
  if (Number.isFinite(limit) && Number.isFinite(currentCount)) {
    return `${fallback} (${currentCount}/${limit} in use).`
  }

  return fallback
}

/**
 * Check if an error indicates a role delete conflict caused by assigned users.
 *
 * @param {AppError} err
 * @returns {boolean}
 */
export const isRoleInUseConflictError = (err) =>
  err?.status === 409 &&
  String(err?.code ?? '').trim().toUpperCase() === 'CONFLICT' &&
  ROLE_CONFLICT_REASONS.has(String(err?.details?.reason ?? '').trim().toUpperCase())

/**
 * Resolve role-in-use delete conflicts to stable operator guidance.
 *
 * @param {AppError} err
 * @returns {string}
 */
export const getRoleInUseConflictMessage = (err) => {
  const assignedUserCount = Number(err?.details?.assignedUserCount)
  const roleKey = String(err?.details?.roleKey ?? '').trim()

  const base =
    Number.isFinite(assignedUserCount) && assignedUserCount > 0
      ? `Role cannot be deleted while assigned to ${assignedUserCount} user${assignedUserCount === 1 ? '' : 's'}.`
      : 'Role cannot be deleted while assigned to users.'

  const withRoleKey = roleKey ? `${base} Remove role ${roleKey} assignments and retry.` : base
  return appendRequestReference(withRoleKey, err?.requestId)
}

const normalizeIdList = (value) =>
  Array.isArray(value)
    ? value
      .map((entry) => String(entry ?? '').trim())
      .filter(Boolean)
    : []

/**
 * Check if an error represents invalid tenant-admin assignments.
 *
 * @param {AppError} err
 * @returns {boolean}
 */
export const isTenantAdminAssignmentsValidationError = (err) =>
  err?.status === 422
  && TENANT_ADMIN_ASSIGNMENT_REASONS.has(
    String(err?.details?.reason ?? '').trim().toUpperCase(),
  )

/**
 * Resolve tenant-admin assignment validation failures to stable operator guidance.
 *
 * @param {AppError} err
 * @returns {string}
 */
export const getTenantAdminAssignmentsValidationMessage = (err) => {
  const invalidTenantAdminUserIds = normalizeIdList(err?.details?.invalidTenantAdminUserIds)
  const missingTenantAdminUserIds = normalizeIdList(err?.details?.missingTenantAdminUserIds)
  const inactiveTenantAdminUserIds = normalizeIdList(err?.details?.inactiveTenantAdminUserIds)
  const outOfCustomerTenantAdminUserIds = normalizeIdList(
    err?.details?.outOfCustomerTenantAdminUserIds,
  )

  const classifiedIds = new Set([
    ...missingTenantAdminUserIds,
    ...inactiveTenantAdminUserIds,
    ...outOfCustomerTenantAdminUserIds,
  ])
  const uncategorizedInvalidIds = invalidTenantAdminUserIds.filter((userId) => !classifiedIds.has(userId))

  const guidance = []

  if (missingTenantAdminUserIds.length > 0) {
    guidance.push(
      `Remove stale tenant-admin selections and search again: ${missingTenantAdminUserIds.join(', ')}.`,
    )
  }

  if (inactiveTenantAdminUserIds.length > 0) {
    guidance.push(
      `Replace inactive tenant admins before continuing: ${inactiveTenantAdminUserIds.join(', ')}.`,
    )
  }

  if (outOfCustomerTenantAdminUserIds.length > 0) {
    guidance.push(
      `Replace users outside this customer context: ${outOfCustomerTenantAdminUserIds.join(', ')}.`,
    )
  }

  if (uncategorizedInvalidIds.length > 0) {
    guidance.push(`Review invalid tenant-admin selections: ${uncategorizedInvalidIds.join(', ')}.`)
  }

  const reason = String(err?.details?.reason ?? '').trim().toUpperCase()
  if (reason === 'TENANT_ADMIN_LIMIT_EXCEEDED' && guidance.length === 0) {
    guidance.push('Only one tenant admin is allowed per tenant.')
  }

  const baseMessage = guidance.length > 0
    ? `Tenant admin assignments need attention. ${guidance.join(' ')}`
    : 'Tenant admin assignments need attention. Re-search and select active users from this customer before retrying.'

  return appendRequestReference(baseMessage, err?.requestId)
}

/**
 * Check if an error is a rate-limit response.
 * @param {AppError} err
 * @returns {boolean}
 */
export const isRateLimitError = (err) =>
  err?.status === 429 ||
  err?.code === 'RATE_LIMIT_EXCEEDED' ||
  err?.code === 'AUTH_RATE_LIMITED' ||
  err?.code === 'HTTP_429'
