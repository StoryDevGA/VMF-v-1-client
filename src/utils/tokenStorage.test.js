/**
 * Token Storage Tests
 *
 * Covers:
 * - Access token in-memory get / set / clear
 * - Refresh token sessionStorage get / set / clear
 * - setTokens / clearTokens convenience helpers
 * - hasAccessToken / hasRefreshToken
 * - decodeToken (valid, malformed)
 * - isTokenExpired (expired, future, missing exp)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  setTokens,
  clearTokens,
  hasAccessToken,
  hasRefreshToken,
  decodeToken,
  isTokenExpired,
} from './tokenStorage.js'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Build a minimal JWT with the given payload (no signature verification).
 */
const buildJwt = (payload) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-sig`
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('tokenStorage', () => {
  beforeEach(() => {
    clearTokens()
    sessionStorage.clear()
  })

  /* ---------- Access token (in-memory) ---------- */

  describe('access token', () => {
    it('should return null when no token is set', () => {
      expect(getAccessToken()).toBeNull()
    })

    it('should store and retrieve an access token', () => {
      setAccessToken('at-123')
      expect(getAccessToken()).toBe('at-123')
    })

    it('should overwrite an existing access token', () => {
      setAccessToken('at-old')
      setAccessToken('at-new')
      expect(getAccessToken()).toBe('at-new')
    })

    it('should report hasAccessToken correctly', () => {
      expect(hasAccessToken()).toBe(false)
      setAccessToken('at-abc')
      expect(hasAccessToken()).toBe(true)
    })
  })

  /* ---------- Refresh token (sessionStorage) ---------- */

  describe('refresh token', () => {
    it('should return null when no token is set', () => {
      expect(getRefreshToken()).toBeNull()
    })

    it('should store and retrieve a refresh token', () => {
      setRefreshToken('rt-456')
      expect(getRefreshToken()).toBe('rt-456')
    })

    it('should report hasRefreshToken correctly', () => {
      expect(hasRefreshToken()).toBe(false)
      setRefreshToken('rt-xyz')
      expect(hasRefreshToken()).toBe(true)
    })
  })

  /* ---------- Convenience helpers ---------- */

  describe('setTokens / clearTokens', () => {
    it('should store both tokens at once', () => {
      setTokens({ accessToken: 'at', refreshToken: 'rt' })
      expect(getAccessToken()).toBe('at')
      expect(getRefreshToken()).toBe('rt')
    })

    it('should clear both tokens', () => {
      setTokens({ accessToken: 'at', refreshToken: 'rt' })
      clearTokens()
      expect(getAccessToken()).toBeNull()
      expect(getRefreshToken()).toBeNull()
    })
  })

  /* ---------- decodeToken ---------- */

  describe('decodeToken', () => {
    it('should decode a valid JWT payload', () => {
      const token = buildJwt({ sub: 'u1', exp: 9999999999 })
      const decoded = decodeToken(token)
      expect(decoded).toEqual({ sub: 'u1', exp: 9999999999 })
    })

    it('should return null for a malformed token', () => {
      expect(decodeToken('not.a.jwt')).toBeNull()
    })

    it('should return null for an empty string', () => {
      expect(decodeToken('')).toBeNull()
    })
  })

  /* ---------- isTokenExpired ---------- */

  describe('isTokenExpired', () => {
    it('should return false for a future expiry', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const token = buildJwt({ exp: futureExp })
      expect(isTokenExpired(token)).toBe(false)
    })

    it('should return true for a past expiry', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60
      const token = buildJwt({ exp: pastExp })
      expect(isTokenExpired(token)).toBe(true)
    })

    it('should return true when expiry is within the buffer', () => {
      const nearExp = Math.floor(Date.now() / 1000) + 10 // 10s from now
      const token = buildJwt({ exp: nearExp })
      expect(isTokenExpired(token, 30)).toBe(true) // 30s buffer
    })

    it('should return true when token has no exp claim', () => {
      const token = buildJwt({ sub: 'u1' })
      expect(isTokenExpired(token)).toBe(true)
    })

    it('should return true for a malformed token', () => {
      expect(isTokenExpired('garbage')).toBe(true)
    })
  })
})
