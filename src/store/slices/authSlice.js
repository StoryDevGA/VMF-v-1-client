/**
 * Auth Slice
 *
 * Manages the authentication state for the application:
 * - Current user profile
 * - Authentication status
 * - Login / logout lifecycle
 *
 * Token storage is handled by `utils/tokenStorage.js` (not in Redux)
 * because the access token lives in a module-scoped variable and should
 * never be serialised into the Redux store.
 */

import { createSlice } from '@reduxjs/toolkit'

/**
 * @typedef {Object} AuthUser
 * @property {string}  id
 * @property {string}  email
 * @property {string}  name
 * @property {string[]} roles          - e.g. ['SUPER_ADMIN']
 * @property {Object}  [membership]    - Active customer/tenant context
 */

/**
 * @typedef {Object} AuthState
 * @property {AuthUser|null} user
 * @property {'idle'|'loading'|'authenticated'|'unauthenticated'} status
 */

/** @type {AuthState} */
const initialState = {
  user: null,
  status: 'idle', // idle → loading → authenticated | unauthenticated
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Called after a successful login or /api/me fetch.
     * Stores the user profile in Redux (tokens are in tokenStorage).
     */
    setCredentials: (state, action) => {
      state.user = action.payload.user
      state.status = 'authenticated'
    },

    /**
     * Called on logout, token expiry, or 401 refresh failure.
     * Clears all auth state — token cleanup happens in tokenStorage.
     */
    clearCredentials: (state) => {
      state.user = null
      state.status = 'unauthenticated'
    },

    /**
     * Dispatched by baseApi after a silent token refresh succeeds.
     * The user profile remains unchanged; this is an internal signal.
     */
    tokenRefreshed: () => {
      // No-op in the slice — the new access token is already stored
      // in the in-memory tokenStorage. This action exists so middleware
      // or devtools can observe refresh events.
    },

    /**
     * Transition to loading while verifying an existing session.
     */
    setLoading: (state) => {
      state.status = 'loading'
    },
  },
})

export const { setCredentials, clearCredentials, tokenRefreshed, setLoading } =
  authSlice.actions

/* ------------------------------------------------------------------ */
/*  Selectors                                                         */
/* ------------------------------------------------------------------ */

/** @param {import('../index').RootState} state */
export const selectCurrentUser = (state) => state.auth.user

/** @param {import('../index').RootState} state */
export const selectAuthStatus = (state) => state.auth.status

/** @param {import('../index').RootState} state */
export const selectIsAuthenticated = (state) => state.auth.status === 'authenticated'

export default authSlice.reducer
