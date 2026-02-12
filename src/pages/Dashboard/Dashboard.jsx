/**
 * Dashboard Page
 *
 * Central workflow control page for authenticated users at `/app/dashboard`.
 * Replaces header-level context controls with a dedicated page surface.
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MdAdminPanelSettings,
  MdBusiness,
  MdGroups,
  MdHelpOutline,
  MdLogout,
  MdMonitorHeart,
  MdTune,
} from 'react-icons/md'
import { Card } from '../../components/Card'
import { Link } from '../../components/Link'
import { Button } from '../../components/Button'
import { CustomerSelector } from '../../components/CustomerSelector'
import { TenantSwitcher } from '../../components/TenantSwitcher'
import { SystemHealthIndicator } from '../../components/SystemHealthIndicator'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useAuth } from '../../hooks/useAuth.js'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const { logout, logoutResult } = useAuth()
  const { user, isSuperAdmin, accessibleCustomerIds, hasCustomerRole } =
    useAuthorization()
  const { customerId, tenantId, tenantName, tenants, isLoadingTenants } =
    useTenantContext()

  const isCustomerAdmin = useMemo(
    () =>
      accessibleCustomerIds.some((id) =>
        hasCustomerRole(id, 'CUSTOMER_ADMIN'),
      ),
    [accessibleCustomerIds, hasCustomerRole],
  )

  const hasAdminAccess = isSuperAdmin || isCustomerAdmin
  const hasCustomerContext = Boolean(customerId)

  /** Derive a human-friendly primary role label. */
  const primaryRole = useMemo(() => {
    if (isSuperAdmin) return 'Super Administrator'
    if (isCustomerAdmin) return 'Customer Administrator'
    const tenantAdmin = user?.tenantMemberships?.find((m) =>
      m.roles?.includes('TENANT_ADMIN'),
    )
    if (tenantAdmin) return 'Tenant Administrator'
    return 'User'
  }, [isSuperAdmin, isCustomerAdmin, user])

  const workflowTiles = useMemo(() => {
    const tiles = [
      {
        key: 'edit-users',
        title: 'Manage Users',
        description:
          'Create, edit, disable, and review user access within customer scope.',
        to: '/app/administration/edit-users',
        icon: <MdGroups aria-hidden="true" />,
        visible: hasAdminAccess,
        enabled: hasCustomerContext,
        disabledReason:
          'Select a customer in the Context panel to unlock user management.',
      },
      {
        key: 'maintain-tenants',
        title: 'Manage Tenants',
        description:
          'Create and maintain tenant records and tenant admin assignments.',
        to: '/app/administration/maintain-tenants',
        icon: <MdBusiness aria-hidden="true" />,
        visible: hasAdminAccess,
        enabled: hasCustomerContext,
        disabledReason:
          'Select a customer in the Context panel to unlock tenant management.',
      },
      {
        key: 'system-monitoring',
        title: 'System Monitoring',
        description:
          'Review platform health, performance signals, and active alerts.',
        to: '/app/administration/system-monitoring',
        icon: <MdMonitorHeart aria-hidden="true" />,
        visible: hasAdminAccess,
        enabled: true,
        disabledReason: '',
      },
      {
        key: 'super-admin-customers',
        title: 'Customer Console',
        description:
          'Open the super-admin customer workspace for platform-level changes.',
        to: '/super-admin/customers',
        icon: <MdAdminPanelSettings aria-hidden="true" />,
        visible: isSuperAdmin,
        enabled: true,
        disabledReason: '',
      },
      {
        key: 'help-center',
        title: 'Help Center',
        description:
          'Access onboarding guidance, troubleshooting steps, and support escalation paths.',
        to: '/help',
        icon: <MdHelpOutline aria-hidden="true" />,
        visible: !hasAdminAccess,
        enabled: true,
        disabledReason: '',
      },
    ]

    return tiles.filter((tile) => tile.visible)
  }, [hasAdminAccess, hasCustomerContext, isSuperAdmin])

  const quickActions = useMemo(() => {
    const actions = [{ key: 'help', label: 'Help', to: '/help', visible: true }]

    if (hasAdminAccess) {
      actions.push(
        {
          key: 'users',
          label: 'Edit Users',
          to: '/app/administration/edit-users',
          visible: hasCustomerContext,
        },
        {
          key: 'monitoring',
          label: 'Monitoring',
          to: '/app/administration/system-monitoring',
          visible: true,
        },
      )
    }

    if (isSuperAdmin) {
      actions.push({
        key: 'customers',
        label: 'Customers',
        to: '/super-admin/customers',
        visible: true,
      })
    }

    return actions.filter((action) => action.visible)
  }, [hasAdminAccess, hasCustomerContext, isSuperAdmin])

  const handleLogout = async () => {
    if (logoutResult.isLoading) return
    await logout()
    navigate(isSuperAdmin ? '/super-admin/login' : '/app/login', {
      replace: true,
    })
  }

  return (
    <section className="dashboard container" aria-label="Workflow dashboard">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Dashboard</h1>
        <p className="dashboard__subtitle">
          Centralize workflow control, scope context, and health visibility in
          one page.
        </p>
        {user?.name && (
          <p className="dashboard__signed-in">
            Signed in as <strong>{user.name}</strong>
          </p>
        )}
        <p className="dashboard__role">{primaryRole}</p>
      </header>

      <div className="dashboard__grid">
        <Card
          variant="elevated"
          className="dashboard__section dashboard__section--workflow"
        >
          <Card.Header>
            <h2 className="dashboard__section-title">Workflow</h2>
            <p className="dashboard__section-subtitle">
              Role-aware shortcuts to core operational flows.
            </p>
          </Card.Header>
          <Card.Body>
            <div className="dashboard__tiles" role="list">
              {workflowTiles.map((tile) => (
                <article
                  key={tile.key}
                  className={[
                    'dashboard__tile',
                    !tile.enabled && 'dashboard__tile--disabled',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="listitem"
                >
                  <div className="dashboard__tile-title-row">
                    <span className="dashboard__tile-icon">{tile.icon}</span>
                    <h3 className="dashboard__tile-title">{tile.title}</h3>
                  </div>
                  <p className="dashboard__tile-description">{tile.description}</p>
                  <Link
                    to={tile.to}
                    disabled={!tile.enabled}
                    className="dashboard__tile-link"
                    variant="primary"
                    underline="none"
                  >
                    Open {tile.title}
                  </Link>
                  {!tile.enabled && tile.disabledReason && (
                    <p className="dashboard__tile-reason">{tile.disabledReason}</p>
                  )}
                </article>
              ))}
            </div>
          </Card.Body>
        </Card>

        <Card
          variant="elevated"
          className="dashboard__section dashboard__section--context"
        >
          <Card.Header>
            <h2 className="dashboard__section-title">Context</h2>
            <p className="dashboard__section-subtitle">
              Set customer and tenant scope for downstream administration pages.
            </p>
          </Card.Header>
          <Card.Body>
            <div className="dashboard__context-controls">
              <CustomerSelector className="dashboard__control" />
              <TenantSwitcher className="dashboard__control" />
            </div>

            {!hasCustomerContext && (
              <p className="dashboard__hint" role="status">
                Select a customer to unlock customer-scoped workflows.
              </p>
            )}

            <dl className="dashboard__context-list">
              <div className="dashboard__context-item">
                <dt>Customer ID</dt>
                <dd>{customerId ?? 'Not selected'}</dd>
              </div>
              <div className="dashboard__context-item">
                <dt>Tenant scope</dt>
                <dd>
                  {tenantName ??
                    (tenantId ? tenantId : 'All tenants (or not selected)')}
                </dd>
              </div>
              <div className="dashboard__context-item">
                <dt>Tenant records</dt>
                <dd>{isLoadingTenants ? 'Loading...' : tenants.length}</dd>
              </div>
            </dl>
          </Card.Body>
        </Card>

        <Card
          variant="elevated"
          className="dashboard__section dashboard__section--health"
        >
          <Card.Header>
            <h2 className="dashboard__section-title">Health</h2>
            <p className="dashboard__section-subtitle">
              Inline operational signal for admin users.
            </p>
          </Card.Header>
          <Card.Body>
            <div className="dashboard__health-row">
              <SystemHealthIndicator />
              {!hasAdminAccess && (
                <p className="dashboard__hint">
                  Health telemetry is visible for admin users only.
                </p>
              )}
            </div>
          </Card.Body>
        </Card>

        <Card
          variant="elevated"
          className="dashboard__section dashboard__section--quick-actions"
        >
          <Card.Header>
            <h2 className="dashboard__section-title">Quick Actions</h2>
            <p className="dashboard__section-subtitle">
              Fast navigation and session controls.
            </p>
          </Card.Header>
          <Card.Body>
            <div className="dashboard__quick-actions">
              {quickActions.map((action) => (
                <Link
                  key={action.key}
                  to={action.to}
                  className="dashboard__quick-link"
                  variant="subtle"
                  underline="none"
                >
                  <span className="dashboard__quick-icon" aria-hidden="true">
                    <MdTune />
                  </span>
                  {action.label}
                </Link>
              ))}
              <Button
                variant="outline"
                className="dashboard__logout"
                onClick={handleLogout}
                loading={logoutResult.isLoading}
                leftIcon={<MdLogout aria-hidden="true" />}
              >
                Sign Out
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </section>
  )
}

export default Dashboard
