import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Badge } from '../../components/Badge'
import { Link } from '../../components/Link'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import './SuperAdminLoginForm.css'

export function SuperAdminLoginForm({
  email,
  setEmail,
  password,
  setPassword,
  fieldErrors,
  authError,
  retryLockActive,
  retryRemainingSeconds,
  isLoading,
  handleSubmit,
}) {
  return (
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
              name="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              required
              fullWidth
              autoComplete="username"
              disabled={isLoading}
            />

            <Input
              id="sa-login-password"
              name="password"
              type="password"
              showPasswordToggle
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              required
              fullWidth
              autoComplete="current-password"
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={isLoading || retryLockActive}
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
  )
}
