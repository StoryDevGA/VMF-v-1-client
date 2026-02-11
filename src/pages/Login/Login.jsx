/**
 * Login Page
 *
 * Customer user login page at `/app/login`.
 * Uses the design system's Input, Button, Card, and Logo components.
 */

import { useState, useCallback, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Logo } from '../../components/Logo'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { useToaster } from '../../components/Toaster'
import { useAuth } from '../../hooks/useAuth.js'
import { isRateLimitError, normalizeError } from '../../utils/errors.js'
import './Login.css'

function Login() {
  const { isAuthenticated, login, loginResult } = useAuth()
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

  /** Basic client-side validation before submit */
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
      await login({ email: email.trim(), password })
      addToast({ title: 'Welcome back!', variant: 'success' })
    } catch (err) {
      const appError = normalizeError(err)

      // Map field-level 422 errors
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

  // Already authenticated — redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />
  }

  return (
    <section className="login container" aria-label="Login">
      <Card variant="elevated" className="login__card">
        <Card.Header>
          <div className="login__brand">
            <Logo size="medium" />
          </div>
          <h1 className="login__title">Sign In</h1>
          <p className="login__subtitle">
            Enter your credentials to access your account.
          </p>
        </Card.Header>

        <Card.Body>
          <form className="login__form" onSubmit={handleSubmit} noValidate>
            <Input
              id="login-email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              required
              fullWidth
              autoComplete="email"
              disabled={loginResult.isLoading}
            />

            <Input
              id="login-password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              required
              fullWidth
              autoComplete="current-password"
              disabled={loginResult.isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loginResult.isLoading}
              disabled={loginResult.isLoading || retryLockActive}
            >
              {retryLockActive
                ? `Try again in ${retryRemainingSeconds}s`
                : 'Sign In'}
            </Button>
          </form>

          <ErrorSupportPanel
            error={authError}
            context="customer-login"
            retryRemainingSeconds={retryRemainingSeconds}
          />
        </Card.Body>

        <Card.Footer>
          <p className="login__footer-text">
            Platform administrator?{' '}
            <Link to="/super-admin/login" className="login__link">
              Super Admin Login
            </Link>
          </p>
        </Card.Footer>
      </Card>
    </section>
  )
}

export default Login
