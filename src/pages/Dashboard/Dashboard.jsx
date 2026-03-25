/**
 * Dashboard Page
 *
 * Customer-app home surface with role-aware workflow tiles.
 */

import { useEffect, useMemo } from 'react'
import {
  MdOutlineDashboardCustomize,
  MdOutlineAssessment,
  MdOutlineInsights,
} from 'react-icons/md'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { CustomerSelector } from '../../components/CustomerSelector'
import { Link } from '../../components/Link'
import { TenantSwitcher } from '../../components/TenantSwitcher'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useGetCustomerQuery } from '../../store/api/customerApi.js'
import { getTenantId } from '../MaintainTenants/tenantUtils.js'
import './Dashboard.css'

const normalizeFeatureKeys = (features) =>
  Array.isArray(features)
    ? features
      .map((feature) => String(feature ?? '').trim().toUpperCase())
      .filter(Boolean)
    : []

function Dashboard() {
  const authorization = useAuthorization()
  const {
    user,
    accessibleCustomerIds,
    isSuperAdmin,
    hasCustomerRole,
    getAccessibleTenants,
  } = authorization
  const { getFeatureEntitlements, getEntitlementSource } = authorization
  const {
    customerId,
    tenantId,
    tenants,
    selectableTenants,
    resolvedTenantName,
    supportsTenantManagement,
    selectedCustomerTopology,
    isLoadingTenants,
    hasInvalidTenantContext,
    setTenantId,
  } = useTenantContext()
  const { data: customerDetails } = useGetCustomerQuery(customerId, { skip: !customerId })
  const selectableTenantRows = useMemo(
    () => (Array.isArray(selectableTenants) ? selectableTenants : []),
    [selectableTenants],
  )

  const customerScopeValue = useMemo(() => {
    if (!customerId) return 'Not selected'

    const normalizedCustomerId = String(customerId)
    const isMatchingCustomerScope = (membershipCustomerId) =>
      membershipCustomerId !== null
      && membershipCustomerId !== undefined
      && String(membershipCustomerId) === normalizedCustomerId

    const customerMembership = Array.isArray(user?.memberships)
      ? user.memberships.find((membership) => {
        const membershipCustomerId =
          membership?.customerId
          ?? membership?.customer?.id
          ?? membership?.customer?._id
        return isMatchingCustomerScope(membershipCustomerId)
      })
      : null

    const tenantMembership = Array.isArray(user?.tenantMemberships)
      ? user.tenantMemberships.find((membership) => {
        const membershipCustomerId =
          membership?.customerId
          ?? membership?.customer?.id
          ?? membership?.customer?._id
        return isMatchingCustomerScope(membershipCustomerId)
      })
      : null

    const customerNameCandidates = [
      customerDetails?.data?.name,
      customerDetails?.data?.companyName,
      customerDetails?.name,
      customerDetails?.companyName,
      customerMembership?.customer?.name,
      customerMembership?.customer?.companyName,
      customerMembership?.customerName,
      customerMembership?.companyName,
      tenantMembership?.customer?.name,
      tenantMembership?.customer?.companyName,
      tenantMembership?.customerName,
      tenantMembership?.companyName,
      ...tenants
        .map((tenant) => tenant?.customer?.name ?? tenant?.customerName ?? tenant?.customer?.companyName)
        .filter(Boolean),
    ]

    const resolvedCustomerName = customerNameCandidates
      .map((candidate) => String(candidate ?? '').trim())
      .find(Boolean)

    return resolvedCustomerName || resolvedTenantName || 'Current customer'
  }, [customerDetails, customerId, resolvedTenantName, tenants, user])

  const isCustomerAdmin = useMemo(
    () => accessibleCustomerIds.some((id) => hasCustomerRole(id, 'CUSTOMER_ADMIN')),
    [accessibleCustomerIds, hasCustomerRole],
  )

  const hasAnyTenantAdminAccess = useMemo(() => {
    const hasCustomerScopedTenantAdmin = accessibleCustomerIds.some(
      (id) => hasCustomerRole(id, 'TENANT_ADMIN'),
    )

    const hasTenantMembershipAdmin = Array.isArray(user?.tenantMemberships)
      && user.tenantMemberships.some((membership) => membership?.roles?.includes('TENANT_ADMIN'))

    return hasCustomerScopedTenantAdmin || hasTenantMembershipAdmin
  }, [accessibleCustomerIds, hasCustomerRole, user])

  const hasCustomerScopedTenantAdmin = useMemo(
    () => Boolean(customerId && hasCustomerRole(customerId, 'TENANT_ADMIN')),
    [customerId, hasCustomerRole],
  )

  const accessibleTenantIds = useMemo(
    () =>
      customerId && typeof getAccessibleTenants === 'function'
        ? getAccessibleTenants(customerId)
        : [],
    [customerId, getAccessibleTenants],
  )

  const hasTenantSelectionAccess = useMemo(
    () => isCustomerAdmin || hasCustomerScopedTenantAdmin || accessibleTenantIds.length > 0,
    [accessibleTenantIds.length, hasCustomerScopedTenantAdmin, isCustomerAdmin],
  )

  const primaryRole = useMemo(() => {
    if (isSuperAdmin) return 'Super Administrator'
    if (isCustomerAdmin) return 'Customer Administrator'
    const tenantAdmin = user?.tenantMemberships?.find((membership) =>
      membership?.roles?.includes('TENANT_ADMIN'))
    if (tenantAdmin) return 'Tenant Administrator'
    return 'User'
  }, [isCustomerAdmin, isSuperAdmin, user])

  const topologyLabel = useMemo(() => {
    if (selectedCustomerTopology === 'MULTI_TENANT') return 'Multi-tenant'
    if (selectedCustomerTopology === 'SINGLE_TENANT') return 'Single-tenant'
    return 'Not available'
  }, [selectedCustomerTopology])

  const tenantScopeValue = useMemo(() => {
    if (selectedCustomerTopology === 'SINGLE_TENANT') {
      return resolvedTenantName || 'Single-tenant customer'
    }
    if (resolvedTenantName) return resolvedTenantName
    if (tenantId) return tenantId
    if (customerId && supportsTenantManagement) return 'All tenants'
    return 'Not selected'
  }, [customerId, resolvedTenantName, selectedCustomerTopology, supportsTenantManagement, tenantId])

  const featureEntitlements = useMemo(
    () =>
      customerId && typeof getFeatureEntitlements === 'function'
        ? normalizeFeatureKeys(getFeatureEntitlements(customerId))
        : [],
    [customerId, getFeatureEntitlements],
  )

  const licensedFeaturesValue = useMemo(() => {
    if (!customerId) return 'Not selected'

    if (featureEntitlements.length === 0) {
      return 'Not available'
    }

    const source = String(
      typeof getEntitlementSource === 'function'
        ? getEntitlementSource(customerId)
        : '',
    ).trim().toUpperCase()
    const sourceLabel = {
      LICENSE_LEVEL: 'Licence level',
      CUSTOMER_OVERRIDE: 'Customer override',
      LEGACY_UNRESTRICTED: 'Legacy unrestricted',
    }[source]

    const featureListLabel = featureEntitlements.join(', ')
    return sourceLabel ? `${featureListLabel} (${sourceLabel})` : featureListLabel
  }, [customerId, featureEntitlements, getEntitlementSource])

  const showCustomerSelector = isCustomerAdmin && accessibleCustomerIds.length > 1
  const showTenantSwitcher = Boolean(
    supportsTenantManagement
      && customerId
      && hasTenantSelectionAccess
      && (isLoadingTenants || selectableTenantRows.length > 1),
  )

  useEffect(() => {
    if (!supportsTenantManagement || !customerId || tenantId || isLoadingTenants) return
    if (selectableTenantRows.length !== 1) return

    const onlyTenant = selectableTenantRows[0]
    const onlyTenantId = getTenantId(onlyTenant)
    if (!onlyTenantId) return

    setTenantId(onlyTenantId, onlyTenant?.name ?? null)
  }, [
    customerId,
    isLoadingTenants,
    selectableTenantRows,
    setTenantId,
    supportsTenantManagement,
    tenantId,
  ])

  const summaryItems = useMemo(
    () => [
      { label: 'Access level', value: primaryRole },
      { label: 'Customer scope', value: customerScopeValue },
      { label: 'Tenant scope', value: tenantScopeValue },
      { label: 'Topology', value: topologyLabel },
      { label: 'Licensed features', value: licensedFeaturesValue },
    ],
    [customerScopeValue, licensedFeaturesValue, primaryRole, tenantScopeValue, topologyLabel],
  )

  const vmfTile = useMemo(() => {
    if (!customerId) {
      return {
        badgeLabel: 'Needs scope',
        badgeVariant: 'warning',
        description: 'Open the Value Message Framework workspace for the selected customer and tenant.',
        disabled: true,
        icon: <MdOutlineDashboardCustomize aria-hidden="true" />,
        key: 'vmf',
        linkLabel: 'Value Message Framework unavailable',
        reason: 'Select a customer before opening the Value Message Framework workspace.',
        title: 'Value Message Framework',
        to: '/app/dashboard',
      }
    }

    if (!featureEntitlements.includes('VMF')) {
      return {
        badgeLabel: 'Not licensed',
        badgeVariant: 'warning',
        description: 'Open the Value Message Framework workspace for the selected customer and tenant.',
        disabled: true,
        icon: <MdOutlineDashboardCustomize aria-hidden="true" />,
        key: 'vmf',
        linkLabel: 'Value Message Framework unavailable',
        reason: 'VMF is not enabled for the selected customer.',
        title: 'Value Message Framework',
        to: '/app/dashboard',
      }
    }

    if (!isCustomerAdmin && !hasAnyTenantAdminAccess) {
      return {
        badgeLabel: 'Role gated',
        badgeVariant: 'warning',
        description: 'Open the Value Message Framework workspace for the selected customer and tenant.',
        disabled: true,
        icon: <MdOutlineDashboardCustomize aria-hidden="true" />,
        key: 'vmf',
        linkLabel: 'Value Message Framework unavailable',
        reason: 'Available for customer admins and tenant admins in the current phase.',
        title: 'Value Message Framework',
        to: '/app/dashboard',
      }
    }

    if (supportsTenantManagement && !tenantId) {
      return {
        badgeLabel: 'Select tenant',
        badgeVariant: 'warning',
        description: 'Open the Value Message Framework workspace for the selected customer and tenant.',
        disabled: true,
        icon: <MdOutlineDashboardCustomize aria-hidden="true" />,
        key: 'vmf',
        linkLabel: 'Value Message Framework unavailable',
        reason: 'Select a tenant to open the VMF workspace for a multi-tenant customer.',
        title: 'Value Message Framework',
        to: '/app/dashboard',
      }
    }

    return {
      badgeLabel: 'Live',
      badgeVariant: 'success',
      description: 'Create, maintain, and review Value Message Framework content for the current scope.',
      disabled: false,
      icon: <MdOutlineDashboardCustomize aria-hidden="true" />,
      key: 'vmf',
      linkLabel: 'Open Value Message Framework',
      reason: supportsTenantManagement
        ? 'Uses the currently selected tenant and customer context.'
        : 'Uses the current customer scope and default tenant context.',
      title: 'Value Message Framework',
      to: '/app/administration/manage-vmfs',
    }
  }, [
    customerId,
    featureEntitlements,
    hasAnyTenantAdminAccess,
    isCustomerAdmin,
    supportsTenantManagement,
    tenantId,
  ])

  const workflowTiles = useMemo(
    () => [
      vmfTile,
      {
        badgeLabel: 'Planned',
        badgeVariant: 'info',
        description: 'Analyse pipeline quality, progress, and decision quality from the home surface.',
        disabled: true,
        icon: <MdOutlineAssessment aria-hidden="true" />,
        key: 'deal-making',
        linkLabel: 'Deal Making coming soon',
        reason: 'Customer-app route is not yet available in the current frontend build.',
        title: 'Deal Making',
        to: '/app/dashboard',
      },
      {
        badgeLabel: 'Planned',
        badgeVariant: 'info',
        description: 'Review data, outcomes, and future reporting signals from the same landing surface.',
        disabled: true,
        icon: <MdOutlineInsights aria-hidden="true" />,
        key: 'views',
        linkLabel: 'Views coming soon',
        reason: 'Customer-app route is not yet available in the current frontend build.',
        title: 'Views',
        to: '/app/dashboard',
      },
    ],
    [vmfTile],
  )

  const tenantSelectionState = useMemo(() => {
    if (!supportsTenantManagement || !customerId || !hasTenantSelectionAccess) return null

    if (hasInvalidTenantContext) {
      return {
        description: 'The previously selected tenant is no longer available in the current scope.',
        label: 'Selection needs review',
        tone: 'warning',
        value: 'Choose another tenant',
      }
    }

    if (resolvedTenantName) {
      return {
        description: 'This tenant will be reused when you open tenant-scoped workflows from the dashboard.',
        label: 'Selected tenant',
        tone: 'success',
        value: resolvedTenantName,
      }
    }

    if (isLoadingTenants) {
      return {
        description: 'Tenant options are loading for the current customer scope.',
        label: 'Tenant context',
        tone: 'info',
        value: 'Loading available tenants',
      }
    }

    if (selectableTenantRows.length === 0) {
      return {
        description: 'No selectable tenant is currently available for this customer context.',
        label: 'Tenant context',
        tone: 'warning',
        value: 'No tenant available',
      }
    }

    return {
      description: 'Choose a tenant before opening tenant-scoped workflows from the dashboard.',
      label: 'Tenant context',
      tone: 'warning',
      value: 'No tenant selected',
    }
  }, [
    customerId,
    hasInvalidTenantContext,
    hasTenantSelectionAccess,
    isLoadingTenants,
    resolvedTenantName,
    selectableTenantRows.length,
    supportsTenantManagement,
  ])

  return (
    <section className="dashboard container" aria-label="Dashboard landing page">
      <Card variant="elevated" className="dashboard__hero">
        <Card.Body className="dashboard__hero-body">
          <div className="dashboard__hero-copy">
            <div className="dashboard__eyebrow">
              <Badge
                variant="info"
                size="sm"
                pill
                outline
                icon={<MdOutlineDashboardCustomize aria-hidden="true" />}
              >
                Home Page
              </Badge>
              <Badge variant="neutral" size="sm" pill outline>
                {primaryRole}
              </Badge>
            </div>
            <h1 className="dashboard__title">Dashboard</h1>
            <p className="dashboard__subtitle">
              Move from customer context into the right StoryLineOS workflow. The dashboard keeps
              the active scope visible so operators know exactly where they are working before they
              open a tool.
            </p>
            {user?.name ? (
              <p className="dashboard__signed-in">
                Signed in as <strong>{user.name}</strong>
              </p>
            ) : null}
          </div>

          <div className="dashboard__hero-note" role="note" aria-label="Current dashboard scope">
            <h2 className="dashboard__panel-title">Current scope</h2>
            <p className="dashboard__panel-subtitle">
              The selected customer and tenant carry into workflow tools opened from this page.
            </p>
            <dl className="dashboard__context-list">
              {summaryItems.map((item) => (
                <div key={item.label} className="dashboard__context-item">
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card.Body>
      </Card>

      <Card
        variant="filled"
        className="dashboard__section dashboard__section--workflow"
      >
        <Card.Header className="dashboard__section-header">
          <h2 className="dashboard__section-title">Workflow Tiles</h2>
          <p className="dashboard__section-subtitle">
            Entry points stay visible across roles. Unavailable workflows remain explicit instead
            of disappearing from the home surface.
          </p>
        </Card.Header>
        <Card.Body className="dashboard__section-body">
          {showCustomerSelector || showTenantSwitcher || tenantSelectionState ? (
            <div className="dashboard__context-controls">
              {tenantSelectionState ? (
                <div
                  className={[
                    'dashboard__tenant-summary',
                    `dashboard__tenant-summary--${tenantSelectionState.tone}`,
                  ].join(' ')}
                  role="status"
                  aria-label="Tenant context summary"
                >
                  <p className="dashboard__tenant-label">{tenantSelectionState.label}</p>
                  <p className="dashboard__tenant-value">{tenantSelectionState.value}</p>
                  <p className="dashboard__tenant-description">{tenantSelectionState.description}</p>
                </div>
              ) : null}
              {showCustomerSelector ? (
                <CustomerSelector className="dashboard__control" />
              ) : null}
              {showTenantSwitcher ? (
                <TenantSwitcher className="dashboard__control" />
              ) : null}
            </div>
          ) : null}

          <p className="dashboard__hint">
            Use the current scope summary above before opening a workflow. Tiles that are not yet
            live or not available in the current role remain visible with an explicit reason.
          </p>

          <div className="dashboard__tiles" role="list" aria-label="Dashboard workflows">
            {workflowTiles.map((tile) => (
              <article
                key={tile.key}
                className={[
                  'dashboard__tile',
                  tile.disabled ? 'dashboard__tile--disabled' : '',
                ].filter(Boolean).join(' ')}
                role="listitem"
              >
                <div className="dashboard__tile-header">
                  <div className="dashboard__tile-title-row">
                    <span className="dashboard__tile-icon">{tile.icon}</span>
                    <div className="dashboard__tile-copy">
                      <h3 className="dashboard__tile-title">{tile.title}</h3>
                      <p className="dashboard__tile-description">{tile.description}</p>
                    </div>
                  </div>
                  <Badge
                    variant={tile.badgeVariant}
                    size="sm"
                    pill
                    outline
                    className="dashboard__tile-badge"
                  >
                    {tile.badgeLabel}
                  </Badge>
                </div>

                <p className="dashboard__tile-reason">{tile.reason}</p>

                <Link
                  to={tile.to}
                  disabled={tile.disabled}
                  className="dashboard__tile-link"
                  variant="primary"
                  underline="none"
                >
                  {tile.linkLabel}
                </Link>
              </article>
            ))}
          </div>
        </Card.Body>
      </Card>
    </section>
  )
}

export default Dashboard
