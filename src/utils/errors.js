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

  // Authorization
  AUTHZ_FORBIDDEN: 'You do not have permission to perform this action.',
  AUTHZ_ROLE_REQUIRED: 'This action requires a higher role.',
  AUTHZ_TENANT_DISABLED: 'This tenant has been disabled.',

  // Validation
  VALIDATION_FAILED: 'Please check the form for errors.',
  VALIDATION_EMAIL_EXISTS: 'A user with this email already exists.',
  VALIDATION_REQUIRED_FIELD: 'This field is required.',

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
 * Check if an error is a rate-limit response.
 * @param {AppError} err
 * @returns {boolean}
 */
export const isRateLimitError = (err) =>
  err?.status === 429 ||
  err?.code === 'RATE_LIMIT_EXCEEDED' ||
  err?.code === 'AUTH_RATE_LIMITED' ||
  err?.code === 'HTTP_429'
