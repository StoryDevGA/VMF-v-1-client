import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useToaster } from '../../components/Toaster'
import { isRateLimitError, normalizeError } from '../../utils/errors.js'

export function useSuperAdminLoginManagement() {
  const { isAuthenticated, superAdminLogin, superAdminLoginResult } = useAuth()
  const { isSuperAdmin } = useAuthorization()
  const { addToast } = useToaster()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [authError, setAuthError] = useState(null)
  const [retryRemainingSeconds, setRetryRemainingSeconds] = useState(0)
  const retryLockActive = retryRemainingSeconds > 0

  useEffect(() => {
    if (retryRemainingSeconds <= 0) return undefined
    const timer = window.setInterval(() => {
      setRetryRemainingSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [retryRemainingSeconds])

  const validate = useCallback(() => {
    const errors = {}
    if (!email.trim()) errors.email = 'Email is required.'
    if (!password) errors.password = 'Password is required.'
    return errors
  }, [email, password])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (retryLockActive) return

    setFieldErrors({})
    setAuthError(null)

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    try {
      await superAdminLogin({ email: email.trim(), password })
      addToast({ title: 'Welcome, Administrator', variant: 'success' })
    } catch (err) {
      const appError = normalizeError(err)

      if (appError.status === 422 && appError.details) {
        const mapped = {}
        for (const detail of appError.details) {
          if (detail.field) mapped[detail.field] = detail.message
        }
        setFieldErrors(mapped)
      }

      if (isRateLimitError(appError) && appError.retryAfterSeconds) {
        setRetryRemainingSeconds(appError.retryAfterSeconds)
      } else {
        setRetryRemainingSeconds(0)
      }
      setAuthError(appError)

      addToast({
        title: 'Login failed',
        description: appError.message,
        variant: 'error',
      })
    }
  }

  return {
    isAuthenticated,
    isSuperAdmin,
    email,
    setEmail,
    password,
    setPassword,
    fieldErrors,
    authError,
    retryLockActive,
    retryRemainingSeconds,
    isLoading: superAdminLoginResult.isLoading,
    handleSubmit,
  }
}
