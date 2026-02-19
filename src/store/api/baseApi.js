/**
 * Base API Slice (RTK Query)
 *
 * Central API configuration for all backend communication.
 * Every feature-specific API slice (auth, users, tenants, …) should
 * inject endpoints into this base using `baseApi.injectEndpoints()`.
 *
 * Features:
 * - Versioned base URL (`/api/v1`)
 * - Automatic JWT header injection
 * - Request-ID correlation via `X-Request-ID`
 * - Automatic token refresh on 401 responses
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpired,
} from '../../utils/tokenStorage.js'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Generate a short correlation ID for X-Request-ID header.
 * @returns {string}
 */
const generateRequestId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])
const DEFAULT_MAX_RETRIES = 2
const BASE_RETRY_DELAY_MS = 400

/* ------------------------------------------------------------------ */
/*  Base query with JWT + request-id headers                          */
/* ------------------------------------------------------------------ */

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL ?? '/api/v1',
  prepareHeaders: (headers) => {
    // Attach JWT access token if available
    const token = getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    // Attach a correlation ID for every request
    headers.set('X-Request-ID', generateRequestId())

    // Request versioned responses
    headers.set('API-Version', '1')

    return headers
  },
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const getRequestMethod = (args) => {
  if (typeof args === 'string') return 'GET'
  return String(args?.method ?? 'GET').toUpperCase()
}

const parseRetryAfterHeader = (headers) => {
  if (!headers) return 0
  const retryAfter = headers.get('retry-after')
  if (!retryAfter) return 0

  const numeric = Number(retryAfter)
  if (Number.isFinite(numeric) && numeric > 0) return Math.ceil(numeric)

  const dateMillis = Date.parse(retryAfter)
  if (Number.isFinite(dateMillis)) {
    const diff = Math.ceil((dateMillis - Date.now()) / 1000)
    return Math.max(0, diff)
  }

  return 0
}

const isRetriableError = (error) => {
  if (!error) return false
  if (error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR') return true
  if (typeof error.status === 'number' && RETRYABLE_STATUSES.has(error.status)) return true
  return false
}

const calculateRetryDelayMs = ({ attempt, retryAfterSeconds }) => {
  if (retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000
  }
  const jitter = Math.floor(Math.random() * 120)
  return BASE_RETRY_DELAY_MS * 2 ** attempt + jitter
}

const shouldRetryRequest = ({ args, result, attempt, maxRetries }) => {
  if (attempt >= maxRetries) return false
  if (!isRetriableError(result?.error)) return false

  const method = getRequestMethod(args)
  // Only auto-retry idempotent operations.
  return method === 'GET' || method === 'HEAD'
}

const enrichErrorWithMeta = (result) => {
  if (!result?.error) return result

  const responseHeaders = result.meta?.response?.headers
  const requestId = responseHeaders?.get('x-request-id')
  const retryAfterSeconds = parseRetryAfterHeader(responseHeaders)
  const existingData =
    result.error.data && typeof result.error.data === 'object'
      ? result.error.data
      : {}

  const mergedData = {
    ...existingData,
    ...(requestId ? { requestId } : {}),
    ...(retryAfterSeconds > 0 ? { retryAfterSeconds } : {}),
  }

  return {
    ...result,
    error: {
      ...result.error,
      data: mergedData,
    },
  }
}

const executeWithBackoffRetry = async ({ args, api, extraOptions, maxRetries }) => {
  let result = await rawBaseQuery(args, api, extraOptions)

  for (let attempt = 0; shouldRetryRequest({ args, result, attempt, maxRetries }); attempt += 1) {
    const retryAfterSeconds = parseRetryAfterHeader(result.meta?.response?.headers)
    await sleep(calculateRetryDelayMs({ attempt, retryAfterSeconds }))
    result = await rawBaseQuery(args, api, extraOptions)
  }

  return enrichErrorWithMeta(result)
}

/* ------------------------------------------------------------------ */
/*  Wrapper: auto-refresh on 401                                      */
/* ------------------------------------------------------------------ */

/**
 * Enhanced base query that intercepts 401 responses and attempts a
 * silent token refresh before retrying the original request once.
 */
const baseQueryWithReauth = async (args, api, extraOptions) => {
  // Offline guard: fail fast with a normalized shape.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      error: {
        status: 'CUSTOM_ERROR',
        error: 'Client offline',
        data: {
          code: 'CLIENT_OFFLINE',
          message: 'You appear to be offline. Reconnect and try again.',
        },
      },
    }
  }

  // If the access token is about to expire, try refreshing proactively
  const currentToken = getAccessToken()
  if (currentToken && isTokenExpired(currentToken)) {
    await attemptRefresh(api)
  }

  let result = await executeWithBackoffRetry({
    args,
    api,
    extraOptions,
    maxRetries: DEFAULT_MAX_RETRIES,
  })

  if (result.error && result.error.status === 401) {
    const refreshed = await attemptRefresh(api)
    if (refreshed) {
      // Retry the original request with the new token
      result = await executeWithBackoffRetry({
        args,
        api,
        extraOptions,
        maxRetries: 1,
      })
    }
  }

  return result
}

/**
 * Attempt to exchange the refresh token for a new token pair.
 * On failure, clear credentials and force logout.
 * @returns {boolean} true if refresh succeeded
 */
async function attemptRefresh(api) {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    api.dispatch({ type: 'auth/clearCredentials' })
    return false
  }

  try {
    const refreshResult = await rawBaseQuery(
      {
        url: '/auth/refresh',
        method: 'POST',
        body: { refreshToken },
      },
      api,
      {},
    )

    if (refreshResult.data) {
      // Backend wraps response as { data: { accessToken, refreshToken }, meta }
      const tokens = refreshResult.data.data ?? refreshResult.data
      const { accessToken, refreshToken: newRefresh } = tokens
      setTokens({ accessToken, refreshToken: newRefresh })
      api.dispatch({
        type: 'auth/tokenRefreshed',
        payload: { accessToken },
      })
      return true
    }
  } catch {
    // refresh failed
  }

  // Refresh failed — clear everything
  clearTokens()
  api.dispatch({ type: 'auth/clearCredentials' })
  return false
}

/* ------------------------------------------------------------------ */
/*  API slice                                                         */
/* ------------------------------------------------------------------ */

/**
 * Base API slice — feature slices inject their endpoints here.
 *
 * @example
 * // In src/store/api/authApi.js
 * import { baseApi } from './baseApi'
 * export const authApi = baseApi.injectEndpoints({
 *   endpoints: (build) => ({
 *     login: build.mutation({ … }),
 *   }),
 * })
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Tenant',
    'Customer',
    'VMF',
    'Deal',
    'Role',
    'System',
    'Invitation',
    'SystemVersioningPolicy',
    'AuditLog',
  ],
  endpoints: () => ({}), // feature slices inject their own
})
