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

/* ------------------------------------------------------------------ */
/*  Wrapper: auto-refresh on 401                                      */
/* ------------------------------------------------------------------ */

/**
 * Enhanced base query that intercepts 401 responses and attempts a
 * silent token refresh before retrying the original request once.
 */
const baseQueryWithReauth = async (args, api, extraOptions) => {
  // If the access token is about to expire, try refreshing proactively
  const currentToken = getAccessToken()
  if (currentToken && isTokenExpired(currentToken)) {
    await attemptRefresh(api)
  }

  let result = await rawBaseQuery(args, api, extraOptions)

  if (result.error && result.error.status === 401) {
    const refreshed = await attemptRefresh(api)
    if (refreshed) {
      // Retry the original request with the new token
      result = await rawBaseQuery(args, api, extraOptions)
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
      const { accessToken, refreshToken: newRefresh } = refreshResult.data
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
  tagTypes: ['User', 'Tenant', 'Customer', 'VMF', 'Deal', 'Role'],
  endpoints: () => ({}), // feature slices inject their own
})
