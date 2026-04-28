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
import {
  selectCurrentUser,
  selectAuthStatus,
  selectIsAuthenticated,
  selectResolvedPermissions,
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
 *   resolvedPermissions: import('../store/slices/authSlice.js').ResolvedPermissions|null,
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
  const resolvedPermissions = useSelector(selectResolvedPermissions)

  const [loginMutation, loginResult] = useLoginMutation()
  const [superAdminLoginMutation, superAdminLoginResult] =
    useSuperAdminLoginMutation()
  const [logoutMutation, logoutResult] = useLogoutMutation()

  const login = useCallback(
    (credentials) => loginMutation(credentials).unwrap(),
    [loginMutation],
  )

  const superAdminLogin = useCallback(
    (credentials) => superAdminLoginMutation(credentials).unwrap(),
    [superAdminLoginMutation],
  )

  const logout = useCallback(
    async () => {
      try {
        await logoutMutation().unwrap()
      } catch {
        // Server failure is non-blocking because credentials are cleared locally.
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
    resolvedPermissions,
    login,
    superAdminLogin,
    logout,
    loginResult,
    superAdminLoginResult,
    logoutResult,
  }
}

