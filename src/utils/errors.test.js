/**
 * Error Utilities Tests
 *
 * Covers:
 * - getErrorMessage mapping & fallback
 * - normalizeError for RTK Query errors, network errors, plain Errors, unknown
 * - isAuthError detection
 * - isAuthzError detection
 * - isTenantDisabledError detection
 * - isRateLimitError detection
 */

import { describe, it, expect } from 'vitest'
import {
  getErrorMessage,
  formatRetryAfter,
  normalizeError,
  isAuthError,
  isAuthzError,
  isTenantDisabledError,
  isCustomerInactiveError,
  isCanonicalAdminConflictError,
  getCanonicalAdminConflictMessage,
  isGovernanceLimitConflictError,
  getGovernanceLimitConflictMessage,
  isRateLimitError,
} from './errors.js'

describe('errors', () => {
  /* ---------- getErrorMessage ---------- */

  describe('getErrorMessage', () => {
    it('should return a mapped message for a known code', () => {
      expect(getErrorMessage('AUTH_INVALID_CREDENTIALS')).toBe(
        'Invalid email or password.',
      )
    })

    it('should return the raw code when no mapping exists', () => {
      expect(getErrorMessage('SOME_UNKNOWN_CODE')).toBe('SOME_UNKNOWN_CODE')
    })

    it('should resolve mapped HTTP status fallback codes', () => {
      expect(getErrorMessage('HTTP_429')).toContain('Too many requests')
      expect(getErrorMessage('HTTP_503')).toContain('temporarily unavailable')
    })

    it('should resolve customer inactive error codes', () => {
      expect(getErrorMessage('AUTH_CUSTOMER_INACTIVE')).toContain('customer is inactive')
      expect(getErrorMessage('CUSTOMER_INACTIVE')).toContain('customer is inactive')
    })

    it('should return the server error fallback for null/undefined', () => {
      expect(getErrorMessage(null)).toBe(
        'Something went wrong. Please try again later.',
      )
      expect(getErrorMessage(undefined)).toBe(
        'Something went wrong. Please try again later.',
      )
    })
  })

  describe('formatRetryAfter', () => {
    it('formats seconds values', () => {
      expect(formatRetryAfter(12)).toBe('12s')
      expect(formatRetryAfter(60)).toBe('1m')
      expect(formatRetryAfter(75)).toBe('1m 15s')
    })

    it('returns "a moment" for zero or negative values', () => {
      expect(formatRetryAfter(0)).toBe('a moment')
      expect(formatRetryAfter(-5)).toBe('a moment')
    })

    it('handles non-numeric input gracefully', () => {
      expect(formatRetryAfter(null)).toBe('a moment')
      expect(formatRetryAfter(undefined)).toBe('a moment')
      expect(formatRetryAfter('abc')).toBe('a moment')
    })

    it('floors fractional seconds', () => {
      expect(formatRetryAfter(12.9)).toBe('12s')
    })
  })

  /* ---------- normalizeError ---------- */

  describe('normalizeError', () => {
    it('should normalize an RTK Query error with data', () => {
      const rtkError = {
        status: 422,
        data: {
          code: 'VALIDATION_FAILED',
          message: 'Validation error',
          requestId: 'req-123',
          details: { email: 'invalid' },
        },
      }
      const result = normalizeError(rtkError)
      expect(result).toEqual({
        code: 'VALIDATION_FAILED',
        message: 'Validation error (Ref: req-123)',
        status: 422,
        requestId: 'req-123',
        retryAfterSeconds: undefined,
        details: { email: 'invalid' },
      })
    })

    it('should normalize an RTK Query error without data', () => {
      const rtkError = { status: 500 }
      const result = normalizeError(rtkError)
      expect(result.code).toBe('HTTP_500')
      expect(result.status).toBe(500)
      expect(result.retryAfterSeconds).toBeUndefined()
    })

    it('should include retry hint on rate-limit errors', () => {
      const rtkError = {
        status: 429,
        data: {
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: 90,
        },
      }
      const result = normalizeError(rtkError)
      expect(result.retryAfterSeconds).toBe(90)
      expect(result.message).toContain('Try again in')
      expect(result.message).toContain('1m 30s')
    })

    it('should normalize a network / fetch error', () => {
      const fetchError = { error: 'TypeError: Failed to fetch' }
      const result = normalizeError(fetchError)
      expect(result.code).toBe('NETWORK_ERROR')
      expect(result.message).toContain('Unable to reach the server')
      expect(result.retryAfterSeconds).toBeUndefined()
    })

    it('should use CLIENT_OFFLINE code when navigator.onLine is false', () => {
      const original = navigator.onLine
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
      const result = normalizeError({ error: 'fetch failed' })
      expect(result.code).toBe('CLIENT_OFFLINE')
      expect(result.message).toContain('offline')
      Object.defineProperty(navigator, 'onLine', { value: original, configurable: true })
    })

    it('should unwrap nested backend error envelope { error: { code, message } }', () => {
      const rtkError = {
        status: 401,
        data: {
          error: {
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
            requestId: 'req-456',
          },
        },
      }
      const result = normalizeError(rtkError)
      expect(result.code).toBe('AUTH_INVALID_CREDENTIALS')
      expect(result.message).toBe('Invalid email or password. (Ref: req-456)')
      expect(result.requestId).toBe('req-456')
      expect(result.status).toBe(401)
    })

    it('should prefer nested error fields over top-level data fields', () => {
      const rtkError = {
        status: 403,
        data: {
          code: 'WRONG_TOP',
          message: 'Wrong top message',
          error: {
            code: 'AUTHZ_FORBIDDEN',
            message: 'You do not have permission.',
          },
        },
      }
      const result = normalizeError(rtkError)
      expect(result.code).toBe('AUTHZ_FORBIDDEN')
      expect(result.message).toBe('You do not have permission.')
    })

    it('should fallback to HTTP_<status> code when data has no code', () => {
      const result = normalizeError({ status: 503, data: { message: 'Down' } })
      expect(result.code).toBe('HTTP_503')
      expect(result.message).toBe('Down')
      expect(result.status).toBe(503)
    })

    it('should recover nested error payload from PARSING_ERROR JSON string data', () => {
      const rtkError = {
        status: 'PARSING_ERROR',
        originalStatus: 409,
        data: JSON.stringify({
          error: {
            code: 'CONFLICT',
            message: 'A customer with this name already exists.',
            requestId: 'req-789',
          },
        }),
      }
      const result = normalizeError(rtkError)
      expect(result.code).toBe('CONFLICT')
      expect(result.status).toBe(409)
      expect(result.requestId).toBe('req-789')
      expect(result.message).toBe('A customer with this name already exists. (Ref: req-789)')
    })

    it('should normalize a plain Error instance', () => {
      const err = new Error('Something broke')
      const result = normalizeError(err)
      expect(result.code).toBe('CLIENT_ERROR')
      expect(result.message).toBe('Something broke')
    })

    it('should return UNKNOWN_ERROR for unrecognised input', () => {
      const result = normalizeError('random string')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })

    it('should return UNKNOWN_ERROR for null', () => {
      const result = normalizeError(null)
      expect(result.code).toBe('UNKNOWN_ERROR')
    })
  })

  /* ---------- isAuthError ---------- */

  describe('isAuthError', () => {
    it('should detect a 401 status', () => {
      expect(isAuthError({ status: 401, code: 'SOMETHING' })).toBe(true)
    })

    it('should detect AUTH_TOKEN_EXPIRED code', () => {
      expect(isAuthError({ status: 403, code: 'AUTH_TOKEN_EXPIRED' })).toBe(true)
    })

    it('should detect AUTH_REFRESH_FAILED code', () => {
      expect(isAuthError({ status: undefined, code: 'AUTH_REFRESH_FAILED' })).toBe(true)
    })

    it('should return false for a non-auth error', () => {
      expect(isAuthError({ status: 500, code: 'SERVER_ERROR' })).toBe(false)
    })

    it('should handle null/undefined safely', () => {
      expect(isAuthError(null)).toBe(false)
      expect(isAuthError(undefined)).toBe(false)
    })
  })

  /* ---------- isAuthzError ---------- */

  describe('isAuthzError', () => {
    it('should detect a 403 status', () => {
      expect(isAuthzError({ status: 403, code: 'SOMETHING' })).toBe(true)
    })

    it('should detect FORBIDDEN code', () => {
      expect(isAuthzError({ status: 200, code: 'FORBIDDEN' })).toBe(true)
    })

    it('should detect AUTHZ_FORBIDDEN code', () => {
      expect(isAuthzError({ status: undefined, code: 'AUTHZ_FORBIDDEN' })).toBe(true)
    })

    it('should detect AUTHZ_ROLE_REQUIRED code', () => {
      expect(isAuthzError({ status: undefined, code: 'AUTHZ_ROLE_REQUIRED' })).toBe(true)
    })

    it('should return false for a non-authz error', () => {
      expect(isAuthzError({ status: 401, code: 'AUTH_TOKEN_EXPIRED' })).toBe(false)
    })

    it('should handle null/undefined safely', () => {
      expect(isAuthzError(null)).toBe(false)
      expect(isAuthzError(undefined)).toBe(false)
    })
  })

  /* ---------- isTenantDisabledError ---------- */

  describe('isTenantDisabledError', () => {
    it('should detect TENANT_DISABLED code', () => {
      expect(isTenantDisabledError({ status: 403, code: 'TENANT_DISABLED' })).toBe(true)
    })

    it('should detect AUTHZ_TENANT_DISABLED code', () => {
      expect(isTenantDisabledError({ status: 403, code: 'AUTHZ_TENANT_DISABLED' })).toBe(
        true,
      )
    })

    it('should return false for a non-tenant error', () => {
      expect(isTenantDisabledError({ status: 403, code: 'FORBIDDEN' })).toBe(false)
    })

    it('should handle null/undefined safely', () => {
      expect(isTenantDisabledError(null)).toBe(false)
      expect(isTenantDisabledError(undefined)).toBe(false)
    })
  })

  /* ---------- isCustomerInactiveError ---------- */

  describe('isCustomerInactiveError', () => {
    it('detects CUSTOMER_INACTIVE with 403', () => {
      expect(
        isCustomerInactiveError({ status: 403, code: 'CUSTOMER_INACTIVE' }),
      ).toBe(true)
    })

    it('detects AUTH_CUSTOMER_INACTIVE with 403', () => {
      expect(
        isCustomerInactiveError({ status: 403, code: 'AUTH_CUSTOMER_INACTIVE' }),
      ).toBe(true)
    })

    it('returns false for non-403 or unrelated codes', () => {
      expect(
        isCustomerInactiveError({ status: 401, code: 'AUTH_CUSTOMER_INACTIVE' }),
      ).toBe(false)
      expect(isCustomerInactiveError({ status: 403, code: 'FORBIDDEN' })).toBe(false)
    })

    it('handles null/undefined safely', () => {
      expect(isCustomerInactiveError(null)).toBe(false)
      expect(isCustomerInactiveError(undefined)).toBe(false)
    })
  })

  /* ---------- canonical Customer Admin conflict helpers ---------- */

  describe('isCanonicalAdminConflictError', () => {
    it('detects canonical conflict from detail keys', () => {
      expect(
        isCanonicalAdminConflictError({
          status: 409,
          code: 'CONFLICT',
          message: 'Conflict',
          details: { canonicalAdminUserId: '507f1f77bcf86cd799439011' },
        }),
      ).toBe(true)
    })

    it('detects canonical conflict from backend message patterns', () => {
      expect(
        isCanonicalAdminConflictError({
          status: 409,
          code: 'CONFLICT',
          message:
            'Cannot assign a second CUSTOMER_ADMIN while an active canonical admin exists. Use replace admin endpoint.',
        }),
      ).toBe(true)
    })

    it('returns false for generic 409 conflict', () => {
      expect(
        isCanonicalAdminConflictError({
          status: 409,
          code: 'CONFLICT',
          message: 'This action conflicts with the current state of the resource.',
        }),
      ).toBe(false)
    })
  })

  describe('getCanonicalAdminConflictMessage', () => {
    it('uses backend-specific message when available', () => {
      const err = {
        status: 409,
        code: 'CONFLICT',
        message:
          'Cannot remove CUSTOMER_ADMIN role from the canonical active customer admin. Replace admin first.',
      }
      expect(getCanonicalAdminConflictMessage(err, 'update_roles')).toBe(err.message)
    })

    it('falls back to contextual guidance when message is generic', () => {
      expect(
        getCanonicalAdminConflictMessage(
          {
            status: 409,
            code: 'CONFLICT',
            message: 'This action conflicts with the current state of the resource.',
          },
          'disable',
        ),
      ).toBe(
        'This user is the canonical Customer Admin of an active customer. Replace admin first.',
      )
    })
  })

  /* ---------- governance limit conflict helpers ---------- */

  describe('isGovernanceLimitConflictError', () => {
    it('detects tenant limit conflicts', () => {
      expect(
        isGovernanceLimitConflictError({
          status: 409,
          code: 'CONFLICT',
          details: { reason: 'TENANT_LIMIT_REACHED' },
        }),
      ).toBe(true)
    })

    it('detects vmf limit conflicts', () => {
      expect(
        isGovernanceLimitConflictError({
          status: 409,
          code: 'CONFLICT',
          details: { reason: 'VMF_LIMIT_REACHED' },
        }),
      ).toBe(true)
    })

    it('supports expected reason filtering', () => {
      const err = {
        status: 409,
        code: 'CONFLICT',
        details: { reason: 'TENANT_LIMIT_REACHED' },
      }
      expect(isGovernanceLimitConflictError(err, 'TENANT_LIMIT_REACHED')).toBe(true)
      expect(isGovernanceLimitConflictError(err, 'VMF_LIMIT_REACHED')).toBe(false)
    })

    it('returns false for non-governance conflicts', () => {
      expect(
        isGovernanceLimitConflictError({
          status: 409,
          code: 'CONFLICT',
          details: { reason: 'SOME_OTHER_REASON' },
        }),
      ).toBe(false)
    })
  })

  describe('getGovernanceLimitConflictMessage', () => {
    it('uses specific backend message when provided', () => {
      const err = {
        status: 409,
        code: 'CONFLICT',
        message: 'Tenant limit reached for this customer.',
        details: {
          reason: 'TENANT_LIMIT_REACHED',
          limit: 5,
          currentCount: 5,
        },
      }
      expect(getGovernanceLimitConflictMessage(err)).toBe(
        'Tenant limit reached for this customer.',
      )
    })

    it('falls back to reason-aware message with counts', () => {
      const err = {
        status: 409,
        code: 'CONFLICT',
        message: 'This action conflicts with the current state of the resource.',
        details: {
          reason: 'TENANT_LIMIT_REACHED',
          limit: 3,
          currentCount: 3,
        },
      }
      expect(getGovernanceLimitConflictMessage(err)).toBe(
        'Tenant limit reached for this customer. (3/3 in use).',
      )
    })

    it('falls back to generic governance-limit message without details', () => {
      expect(
        getGovernanceLimitConflictMessage({
          status: 409,
          code: 'CONFLICT',
          message: 'This action conflicts with the current state of the resource.',
          details: {},
        }),
      ).toBe('A governance limit was reached. Update customer limits and retry.')
    })
  })

  /* ---------- isRateLimitError ---------- */

  describe('isRateLimitError', () => {
    it('should detect a 429 status', () => {
      expect(isRateLimitError({ status: 429, code: 'SOMETHING' })).toBe(true)
    })

    it('should detect RATE_LIMIT_EXCEEDED code', () => {
      expect(isRateLimitError({ status: undefined, code: 'RATE_LIMIT_EXCEEDED' })).toBe(
        true,
      )
    })

    it('should detect HTTP_429 code', () => {
      expect(isRateLimitError({ status: undefined, code: 'HTTP_429' })).toBe(true)
    })

    it('should return false for a non-rate-limit error', () => {
      expect(isRateLimitError({ status: 400, code: 'VALIDATION_FAILED' })).toBe(false)
    })
  })
})
