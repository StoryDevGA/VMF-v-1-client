/**
 * Token Storage Utilities
 *
 * Manages JWT access/refresh tokens with a secure dual-layer strategy:
 * - Access token is held **in-memory only** (never persisted to disk)
 * - Refresh token is stored in **sessionStorage** so it survives soft
 *   reloads but is cleared when the browser tab is closed
 *
 * Why not localStorage?
 *   localStorage is accessible to any script on the same origin and
 *   persists indefinitely — sessionStorage limits exposure to the
 *   current tab lifetime, which is a better fit for short-lived sessions.
 */

const REFRESH_TOKEN_KEY = 'vmf_refresh_token'

/** In-memory access token — never written to storage */
let accessToken = null

/* ------------------------------------------------------------------ */
/*  Access Token (in-memory)                                          */
/* ------------------------------------------------------------------ */

/**
 * Get the current access token
 * @returns {string|null}
 */
export const getAccessToken = () => accessToken

/**
 * Store a new access token (in memory only)
 * @param {string} token
 */
export const setAccessToken = (token) => {
  accessToken = token
}

/* ------------------------------------------------------------------ */
/*  Refresh Token (sessionStorage)                                    */
/* ------------------------------------------------------------------ */

/**
 * Get the stored refresh token
 * @returns {string|null}
 */
export const getRefreshToken = () => {
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Persist a refresh token
 * @param {string} token
 */
export const setRefreshToken = (token) => {
  try {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token)
  } catch {
    // Private/incognito mode may throw — silently ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Store both tokens at once (convenience for login / refresh responses)
 * @param {{ accessToken: string, refreshToken: string }} tokens
 */
export const setTokens = ({ accessToken: at, refreshToken: rt }) => {
  setAccessToken(at)
  setRefreshToken(rt)
}

/**
 * Clear all stored tokens (logout)
 */
export const clearTokens = () => {
  accessToken = null
  try {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // ignore
  }
}

/**
 * Check whether we have an access token available
 * @returns {boolean}
 */
export const hasAccessToken = () => Boolean(accessToken)

/**
 * Check whether we have a refresh token available
 * @returns {boolean}
 */
export const hasRefreshToken = () => Boolean(getRefreshToken())

/**
 * Decode a JWT payload without verification (for reading expiry, etc.)
 * Returns null if the token is malformed.
 * @param {string} token
 * @returns {object|null}
 */
export const decodeToken = (token) => {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

/**
 * Check whether a JWT is expired (with an optional clock-skew buffer)
 * @param {string} token
 * @param {number} [bufferSeconds=30] - consider expired this many seconds early
 * @returns {boolean}
 */
export const isTokenExpired = (token, bufferSeconds = 30) => {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return true
  return Date.now() >= (decoded.exp - bufferSeconds) * 1000
}
