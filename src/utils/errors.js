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

  // Server / generic
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  NETWORK_ERROR: 'Unable to reach the server. Check your connection.',
  NOT_FOUND: 'The requested resource was not found.',
  TIMEOUT: 'The request timed out. Please try again.',
}

/**
 * Resolve an error code to a user-friendly message.
 * Falls back to the raw code if no mapping exists.
 * @param {string} code
 * @returns {string}
 */
export const getErrorMessage = (code) =>
  ERROR_MESSAGES[code] ?? code ?? ERROR_MESSAGES.SERVER_ERROR

/* ------------------------------------------------------------------ */
/*  Standard AppError shape                                           */
/* ------------------------------------------------------------------ */

/**
 * @typedef {Object} AppError
 * @property {string}  code      - Machine-readable error code
 * @property {string}  message   - User-friendly error message
 * @property {number}  [status]  - HTTP status code
 * @property {string}  [requestId] - X-Request-ID for support correlation
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
    const data = error.data ?? {}
    return {
      code: data.code ?? `HTTP_${error.status}`,
      message: data.message ?? getErrorMessage(data.code) ?? ERROR_MESSAGES.SERVER_ERROR,
      status: typeof error.status === 'number' ? error.status : undefined,
      requestId: data.requestId ?? undefined,
      details: data.details ?? undefined,
    }
  }

  // Network / fetch failure
  if (error && typeof error === 'object' && 'error' in error) {
    return {
      code: 'NETWORK_ERROR',
      message: ERROR_MESSAGES.NETWORK_ERROR,
      status: undefined,
      requestId: undefined,
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
      details: undefined,
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: ERROR_MESSAGES.SERVER_ERROR,
    status: undefined,
    requestId: undefined,
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
  err?.status === 429 || err?.code === 'RATE_LIMIT_EXCEEDED'
