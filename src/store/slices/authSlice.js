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
 * @typedef {Object} Membership
 * @property {string|null} customerId  - null for platform-level memberships
 * @property {string[]}    roles       - e.g. ['SUPER_ADMIN'] or ['CUSTOMER_ADMIN']
 */

/**
 * @typedef {Object} TenantMembership
 * @property {string}   customerId
 * @property {string}   tenantId
 * @property {string[]} roles       - e.g. ['TENANT_ADMIN']
 */

/**
 * @typedef {Object} VmfGrant
 * @property {string}   customerId
 * @property {string}   tenantId
 * @property {string}   vmfId
 * @property {string[]} permissions - e.g. ['READ', 'WRITE']
 */

/**
 * @typedef {Object} AuthUser
 * @property {string}              id
 * @property {string}              email
 * @property {string}              name
 * @property {boolean}             isActive
 * @property {Object}              identityPlus
 * @property {Membership[]}        memberships         - customer & platform roles
 * @property {TenantMembership[]}  tenantMemberships   - tenant-level roles
 * @property {VmfGrant[]}          vmfGrants           - VMF-level permissions
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

/** @param {import('../index').RootState} state */
export const selectUserMemberships = (state) => state.auth.user?.memberships ?? []

/** @param {import('../index').RootState} state */
export const selectUserTenantMemberships = (state) => state.auth.user?.tenantMemberships ?? []

/** @param {import('../index').RootState} state */
export const selectUserVmfGrants = (state) => state.auth.user?.vmfGrants ?? []

export default authSlice.reducer
