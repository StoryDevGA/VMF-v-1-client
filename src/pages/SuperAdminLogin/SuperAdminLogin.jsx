/**
 * Super Admin Login Page
 *
 * Platform-level login at `/super-admin/login`.
 * Visually distinct from the customer login to avoid confusion.
 */

import { useState, useCallback, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Badge } from '../../components/Badge'
import { Link } from '../../components/Link'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { useToaster } from '../../components/Toaster'
import { useAuth } from '../../hooks/useAuth.js'
import { isRateLimitError, normalizeError } from '../../utils/errors.js'
import './SuperAdminLogin.css'

function SuperAdminLogin() {
  const { isAuthenticated, superAdminLogin, superAdminLoginResult } = useAuth()
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

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />
  }

  return (
    <section
      className="super-admin-login container"
      aria-label="Super Admin Login"
    >
      <Fieldset className="super-admin-login__fieldset">
        <Fieldset.Legend className="super-admin-login__legend">
          <h1 className="super-admin-login__title">Super Admin Sign In</h1>
        </Fieldset.Legend>
        <Card variant="elevated" className="super-admin-login__card">
          <Card.Header>
            <Badge
              variant="warning"
              size="sm"
              pill
              className="super-admin-login__badge"
            >
              Platform Administration
            </Badge>
            <p className="super-admin-login__subtitle">
              This login is restricted to platform-level administrators.
            </p>
          </Card.Header>

          <Card.Body>
            <form
              className="super-admin-login__form"
              onSubmit={handleSubmit}
              noValidate
            >
              <Input
                id="sa-login-email"
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
                required
                fullWidth
                autoComplete="email"
                disabled={superAdminLoginResult.isLoading}
              />

              <Input
                id="sa-login-password"
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                required
                fullWidth
                autoComplete="current-password"
                disabled={superAdminLoginResult.isLoading}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={superAdminLoginResult.isLoading}
                disabled={superAdminLoginResult.isLoading || retryLockActive}
              >
                {retryLockActive
                  ? `Try again in ${retryRemainingSeconds}s`
                  : 'Sign In'}
              </Button>
            </form>

            <ErrorSupportPanel
              error={authError}
              context="super-admin-login"
              retryRemainingSeconds={retryRemainingSeconds}
            />
          </Card.Body>

          <Card.Footer>
            <p className="super-admin-login__footer-text">
              Not a platform admin?{' '}
              <Link to="/app/login" className="super-admin-login__link" underline="none">
                Customer Login
              </Link>
            </p>
          </Card.Footer>
        </Card>
      </Fieldset>
    </section>
  )
}

export default SuperAdminLogin
