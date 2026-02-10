/**
 * Super Admin Login Page
 *
 * Platform-level login at `/super-admin/login`.
 * Visually distinct from the customer login to avoid confusion.
 */

import { useState, useCallback } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Logo } from '../../components/Logo'
import { useToaster } from '../../components/Toaster'
import { useAuth } from '../../hooks/useAuth.js'
import { normalizeError } from '../../utils/errors.js'
import './SuperAdminLogin.css'

function SuperAdminLogin() {
  const { isAuthenticated, superAdminLogin, superAdminLoginResult } = useAuth()
  const { addToast } = useToaster()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const validate = useCallback(() => {
    const errors = {}
    if (!email.trim()) errors.email = 'Email is required.'
    if (!password) errors.password = 'Password is required.'
    return errors
  }, [email, password])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFieldErrors({})

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

      addToast({
        title: 'Login failed',
        description: appError.message,
        variant: 'error',
      })
    }
  }

  if (isAuthenticated) {
    return <Navigate to="/super-admin/customers" replace />
  }

  return (
    <section
      className="super-admin-login container"
      aria-label="Super Admin Login"
    >
      <Card variant="elevated" className="super-admin-login__card">
        <Card.Header>
          <div className="super-admin-login__brand">
            <Logo size="medium" />
          </div>
          <div className="super-admin-login__badge">Platform Administration</div>
          <h1 className="super-admin-login__title">Super Admin Sign In</h1>
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
              disabled={superAdminLoginResult.isLoading}
            >
              Sign In
            </Button>
          </form>
        </Card.Body>

        <Card.Footer>
          <p className="super-admin-login__footer-text">
            Not a platform admin?{' '}
            <Link to="/app/login" className="super-admin-login__link">
              Customer Login
            </Link>
          </p>
        </Card.Footer>
      </Card>
    </section>
  )
}

export default SuperAdminLogin
