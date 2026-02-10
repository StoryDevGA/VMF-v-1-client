/**
 * Error Utilities Tests
 *
 * Covers:
 * - getErrorMessage mapping & fallback
 * - normalizeError for RTK Query errors, network errors, plain Errors, unknown
 * - isAuthError detection
 * - isRateLimitError detection
 */

import { describe, it, expect } from 'vitest'
import {
  getErrorMessage,
  normalizeError,
  isAuthError,
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

    it('should return the server error fallback for null/undefined', () => {
      expect(getErrorMessage(null)).toBe(
        'Something went wrong. Please try again later.',
      )
      expect(getErrorMessage(undefined)).toBe(
        'Something went wrong. Please try again later.',
      )
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
        message: 'Validation error',
        status: 422,
        requestId: 'req-123',
        details: { email: 'invalid' },
      })
    })

    it('should normalize an RTK Query error without data', () => {
      const rtkError = { status: 500 }
      const result = normalizeError(rtkError)
      expect(result.code).toBe('HTTP_500')
      expect(result.status).toBe(500)
    })

    it('should normalize a network / fetch error', () => {
      const fetchError = { error: 'TypeError: Failed to fetch' }
      const result = normalizeError(fetchError)
      expect(result.code).toBe('NETWORK_ERROR')
      expect(result.message).toContain('Unable to reach the server')
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

    it('should return false for a non-rate-limit error', () => {
      expect(isRateLimitError({ status: 400, code: 'VALIDATION_FAILED' })).toBe(false)
    })
  })
})
