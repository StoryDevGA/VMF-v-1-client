/**
 * AppInit Component
 *
 * Runs once on mount to restore the auth session when the page loads.
 * If a refresh token exists in sessionStorage the component fires a
 * getMe query — on success the user is marked authenticated, on
 * failure tokens are cleared and the user stays unauthenticated.
 *
 * Renders a full-screen spinner while the bootstrap is in progress
 * so that ProtectedRoute never flickers to the login page.
 */

import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setLoading, selectAuthStatus } from '../../store/slices/authSlice.js'
import { useLazyGetMeQuery } from '../../store/api/authApi.js'
import { hasRefreshToken } from '../../utils/tokenStorage.js'
import { Spinner } from '../../components/Spinner'
import './AppInit.css'

export function AppInit({ children }) {
  const dispatch = useDispatch()
  const status = useSelector(selectAuthStatus)
  const [triggerGetMe] = useLazyGetMeQuery()
  const bootstrapped = useRef(false)

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

    if (hasRefreshToken()) {
      dispatch(setLoading())
      triggerGetMe()
      // onQueryStarted in authApi handles setCredentials / clearCredentials
    }
    // If no refresh token, status stays 'idle' → ProtectedRoute will redirect
  }, [dispatch, triggerGetMe])

  // Show a global spinner while we're still checking the session
  if (status === 'loading') {
    return (
      <div className="app-init__loading" role="status">
        <Spinner size="lg" />
        <p className="app-init__loading-text">Restoring session…</p>
      </div>
    )
  }

  return children
}

export default AppInit
