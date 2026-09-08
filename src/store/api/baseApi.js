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
  getSessionRevision,
  getTokenRevision,
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

const RETRYABLE_STATUSES = new Set([500, 502, 503, 504])
const DEFAULT_MAX_RETRIES = 2
const BASE_RETRY_DELAY_MS = 400
const MAX_RETRY_DELAY_MS = 30_000

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

const abortedResult = () => ({ error: { status: 'FETCH_ERROR', error: 'AbortError' } })
const sessionChangedResult = () => ({ error: { status: 'CUSTOM_ERROR', error: 'Session changed', data: { code: 'SESSION_CHANGED', message: 'The session changed. Reload this view.' } } })
const waitForCaller = (promise, signal) => new Promise((resolve) => {
  if (signal?.aborted) return resolve(false)
  const abort = () => { signal?.removeEventListener('abort', abort); resolve(false) }
  signal?.addEventListener('abort', abort, { once: true })
  promise.then((value) => { signal?.removeEventListener('abort', abort); resolve(value) }, abort)
})
const sleep = (ms, signal) => new Promise((resolve) => {
  if (signal?.aborted) return resolve(false)
  const finish = (completed) => { clearTimeout(timer); signal?.removeEventListener('abort', abort); resolve(completed) }
  const abort = () => finish(false)
  const timer = setTimeout(() => finish(true), ms)
  signal?.addEventListener('abort', abort, { once: true })
})

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
    return Math.min(retryAfterSeconds * 1000, MAX_RETRY_DELAY_MS)
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
  const session = getSessionRevision()
  if (api.signal?.aborted) return abortedResult()
  let result = await rawBaseQuery(args, api, extraOptions)

  for (let attempt = 0; shouldRetryRequest({ args, result, attempt, maxRetries }); attempt += 1) {
    const retryAfterSeconds = parseRetryAfterHeader(result.meta?.response?.headers)
    if (!await sleep(calculateRetryDelayMs({ attempt, retryAfterSeconds }), api.signal)) return abortedResult()
    if (session !== getSessionRevision()) return sessionChangedResult()
    result = await rawBaseQuery(args, api, extraOptions)
  }

  return enrichErrorWithMeta(result)
}

export const getConfiguredMaxRetries = (extraOptions = {}) => {
  const configured = extraOptions?.maxRetries
  return Number.isInteger(configured) && configured >= 0
    ? Math.min(configured, DEFAULT_MAX_RETRIES)
    : DEFAULT_MAX_RETRIES
}

/* ------------------------------------------------------------------ */
/*  Wrapper: auto-refresh on 401                                      */
/* ------------------------------------------------------------------ */

/**
 * Enhanced base query that intercepts 401 responses and attempts a
 * silent token refresh before retrying the original request once.
 */
export const baseQueryWithReauth = async (args, api, extraOptions) => {
  if (api.signal?.aborted) return abortedResult()
  const session = getSessionRevision()
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
    const refreshed = await attemptRefresh(api)
    if (api.signal?.aborted) return abortedResult()
    if (session !== getSessionRevision()) return sessionChangedResult()
    if (!refreshed) return { error: { status: 401, data: { code: 'SESSION_EXPIRED' } } }
  }

  const requestTokenRevision = getTokenRevision()
  let result = await executeWithBackoffRetry({
    args,
    api,
    extraOptions,
    maxRetries: getConfiguredMaxRetries(extraOptions),
  })

  if (result.error && result.error.status === 401) {
    if (api.signal?.aborted) return abortedResult()
    if (session !== getSessionRevision()) return sessionChangedResult()
    // A delayed 401 may belong to the token another request already rotated.
    const refreshed = requestTokenRevision !== getTokenRevision() || await attemptRefresh(api)
    if (api.signal?.aborted) return abortedResult()
    if (session !== getSessionRevision()) return sessionChangedResult()
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

  return session === getSessionRevision() ? result : sessionChangedResult()
}

/**
 * Attempt to exchange the refresh token for a new token pair.
 * On failure, clear credentials and force logout.
 * @returns {boolean} true if refresh succeeded
 */
let refreshFlight = null

async function attemptRefresh(api) {
  const session = getSessionRevision()
  if (!refreshFlight || refreshFlight.session !== session) {
    const flight = { session }
    // One caller unmounting must not cancel token rotation for other callers.
    const sharedApi = { ...api, signal: new AbortController().signal }
    flight.promise = performRefresh(sharedApi, session).finally(() => {
      if (refreshFlight === flight) refreshFlight = null
    })
    refreshFlight = flight
  }
  return waitForCaller(refreshFlight.promise, api.signal)
}

async function performRefresh(api, session) {
  const revision = getTokenRevision()
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    clearTokens()
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
      if (session !== getSessionRevision() || revision !== getTokenRevision()) return false
      if (typeof accessToken !== 'string' || !accessToken || typeof newRefresh !== 'string' || !newRefresh) throw new Error('Invalid refresh response')
      setTokens({ accessToken, refreshToken: newRefresh }, { preserveSession: true })
      const refreshedRevision = getTokenRevision()
      api.dispatch({
        type: 'auth/tokenRefreshed',
        payload: { accessToken },
      })

      // Fetch fresh resolved permissions so the renewed session reflects any
      // role changes that occurred since the previous login or /auth/me call.
      // Failure is non-blocking — the new access token is still valid.
      try {
        const meResult = await rawBaseQuery({ url: '/auth/me', method: 'GET' }, api, {})
        if (meResult.data && session === getSessionRevision() && refreshedRevision === getTokenRevision()) {
          const meData = meResult.data.data ?? meResult.data
          api.dispatch({
            type: 'auth/setCredentials',
            payload: {
              user: meData.user,
              customerScopes: meData.customerScopes ?? [],
              resolvedPermissions: meData.resolvedPermissions ?? null,
            },
          })
        }
      } catch {
        // /auth/me failure is non-blocking — the refreshed token is still usable
      }

      return session === getSessionRevision()
    }
  } catch {
    // refresh failed
  }

  // Refresh failed — clear everything
  if (session === getSessionRevision() && revision === getTokenRevision()) {
    clearTokens()
    api.dispatch({ type: 'auth/clearCredentials' })
  }
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
    'LicenseLevel',
    'SystemVersioningPolicy',
    'AuditLog',
    'RuntimeFrameworkPackage',
    'RuntimeFrameworkRegistry',
    'RuntimeAgent',
    'RuntimeAgentDependencies',
    'RuntimeSkill',
    'RuntimePath',
    'RuntimeWorkflowPolicy',
    'RuntimeWorkflowPolicyDependencies',
    'RuntimeUIContract',
    'RuntimeValidationAudit',
    'RuntimeActivation',
    'RuntimeDeployment',
    'RuntimeInstance',
    'OutcomeKnowledgePack',
    'OutcomeKnowledgePackResolution',
    'OutcomeStudioReadiness',
    'SkillRole',
    'SkillRoleDependencies',
    'ValidationRegistry',
    'ValidationRegistryDependencies',
  ],
  endpoints: () => ({}), // feature slices inject their own
})
