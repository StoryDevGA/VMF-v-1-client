/**
 * useAuth Hook
 *
 * Unified authentication facade that wraps Redux selectors and
 * RTK Query mutations into a convenient API for components.
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth()
 */

import { useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  selectCurrentUser,
  selectAuthStatus,
  selectIsAuthenticated,
  clearCredentials,
} from '../store/slices/authSlice.js'
import {
  useLoginMutation,
  useSuperAdminLoginMutation,
  useLogoutMutation,
} from '../store/api/authApi.js'
import { clearTokens } from '../utils/tokenStorage.js'

/**
 * Primary auth hook — provides user state and login/logout actions.
 *
 * @returns {{
 *   user: object|null,
 *   status: string,
 *   isAuthenticated: boolean,
 *   login: Function,
 *   superAdminLogin: Function,
 *   logout: Function,
 *   loginResult: object,
 *   superAdminLoginResult: object,
 *   logoutResult: object,
 * }}
 */
export function useAuth() {
  const dispatch = useDispatch()
  const user = useSelector(selectCurrentUser)
  const status = useSelector(selectAuthStatus)
  const isAuthenticated = useSelector(selectIsAuthenticated)

  const [loginMutation, loginResult] = useLoginMutation()
  const [superAdminLoginMutation, superAdminLoginResult] =
    useSuperAdminLoginMutation()
  const [logoutMutation, logoutResult] = useLogoutMutation()

  /** Standard customer login */
  const login = useCallback(
    (credentials) => loginMutation(credentials).unwrap(),
    [loginMutation],
  )

  /** Super-admin login */
  const superAdminLogin = useCallback(
    (credentials) => superAdminLoginMutation(credentials).unwrap(),
    [superAdminLoginMutation],
  )

  /** Logout — clears tokens locally then fires server logout */
  const logout = useCallback(
    async () => {
      try {
        await logoutMutation().unwrap()
      } catch {
        // Server failure is non-blocking — we already clear locally
      } finally {
        clearTokens()
        dispatch(clearCredentials())
      }
    },
    [logoutMutation, dispatch],
  )

  return {
    user,
    status,
    isAuthenticated,
    login,
    superAdminLogin,
    logout,
    loginResult,
    superAdminLoginResult,
    logoutResult,
  }
}

/**
 * Redirect hook — sends the user to the login page when
 * they are not authenticated. Intended for use inside
 * page-level components that require auth.
 *
 * @param {string} [redirectTo='/app/login'] — path to redirect to
 */
export function useRequireAuth(redirectTo = '/app/login') {
  const { isAuthenticated, status } = useAuth()
  const navigate = useNavigate()

  if (status !== 'loading' && !isAuthenticated) {
    // Schedule navigation after render
    Promise.resolve().then(() => navigate(redirectTo, { replace: true }))
  }

  return { isAuthenticated, status }
}

export default useAuth
