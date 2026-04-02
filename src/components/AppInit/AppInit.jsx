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

import { useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setLoading, selectAuthStatus } from '../../store/slices/authSlice.js'
import { useLazyGetMeQuery } from '../../store/api/authApi.js'
import { hasRefreshToken } from '../../utils/tokenStorage.js'
import { Spinner } from '../../components/Spinner'
import './AppInit.css'

const SESSION_REVALIDATION_COOLDOWN_MS = 30_000

export function AppInit({ children }) {
  const dispatch = useDispatch()
  const status = useSelector(selectAuthStatus)
  const [triggerGetMe] = useLazyGetMeQuery()
  const bootstrapped = useRef(false)
  const lastSessionSyncAt = useRef(0)

  const revalidateSession = useCallback(() => {
    if (!hasRefreshToken()) return

    const now = Date.now()
    if (now - lastSessionSyncAt.current < SESSION_REVALIDATION_COOLDOWN_MS) return

    lastSessionSyncAt.current = now
    triggerGetMe()
  }, [triggerGetMe])

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

    if (status === 'idle' && hasRefreshToken()) {
      lastSessionSyncAt.current = Date.now()
      dispatch(setLoading())
      triggerGetMe()
      // onQueryStarted in authApi handles setCredentials / clearCredentials
    }
    // If no refresh token, status stays 'idle' → ProtectedRoute will redirect
  }, [dispatch, status, triggerGetMe])

  useEffect(() => {
    if (status === 'loading') return undefined

    const handleWindowFocus = () => {
      revalidateSession()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      revalidateSession()
    }

    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [revalidateSession, status])

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
