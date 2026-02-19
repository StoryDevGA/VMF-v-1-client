/**
 * Auth API Slice (RTK Query)
 *
 * Injects authentication endpoints into the base API.
 * Handles login, super-admin login, refresh, logout, and getMe.
 *
 * On successful login, tokens are stored via tokenStorage and
 * the user profile is dispatched to the auth slice.
 */

import { baseApi } from './baseApi.js'
import { setTokens, clearTokens } from '../../utils/tokenStorage.js'

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * POST /auth/login
     * Customer user login — returns token pair + user profile.
     */
    login: build.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          const { user, accessToken, refreshToken } = data.data
          setTokens({ accessToken, refreshToken })
          dispatch({ type: 'auth/setCredentials', payload: { user } })
        } catch {
          // Error is handled by the component via the mutation result
        }
      },
    }),

    /**
     * POST /auth/super-admin/login
     * Super Admin login — same shape, stricter role gate.
     */
    superAdminLogin: build.mutation({
      query: (credentials) => ({
        url: '/auth/super-admin/login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          const { user, accessToken, refreshToken } = data.data
          setTokens({ accessToken, refreshToken })
          dispatch({ type: 'auth/setCredentials', payload: { user } })
        } catch {
          // handled by component
        }
      },
    }),

    /**
     * POST /auth/logout
     * Blacklist current access token + revoke refresh.
     */
    logout: build.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        clearTokens()
        dispatch({ type: 'auth/clearCredentials' })
        try {
          await queryFulfilled
        } catch {
          // Already cleared locally — server failure is acceptable
        }
      },
    }),

    /**
     * GET /auth/me
     * Fetch the current authenticated user profile.
     * Used on app boot to restore session from a surviving refresh token.
     */
    getMe: build.query({
      query: () => '/auth/me',
      providesTags: ['User'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch({
            type: 'auth/setCredentials',
            payload: { user: data.data.user },
          })
        } catch {
          dispatch({ type: 'auth/clearCredentials' })
        }
      },
    }),

    /**
     * POST /auth/step-up
     * Re-verify the current user password and issue a short-lived
     * step-up token used for sensitive actions.
     */
    requestStepUp: build.mutation({
      query: (body) => ({
        url: '/auth/step-up',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: false,
})

export const {
  useLoginMutation,
  useSuperAdminLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useRequestStepUpMutation,
} = authApi
