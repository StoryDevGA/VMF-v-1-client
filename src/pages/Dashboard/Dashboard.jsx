/**
 * Dashboard Page
 *
 * Minimal holding page for customer-app users.
 */

import { useMemo } from 'react'
import {
  MdOutlineAssessment,
  MdOutlineInsights,
  MdOutlineNotificationsActive,
} from 'react-icons/md'
import { AdminHoldingPage } from '../../components/AdminHoldingPage'
import { CustomerSelector } from '../../components/CustomerSelector'
import { TenantSwitcher } from '../../components/TenantSwitcher'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'

function Dashboard() {
  const { user, accessibleCustomerIds, isSuperAdmin, hasCustomerRole } = useAuthorization()
  const {
    customerId,
    tenantId,
    resolvedTenantName,
    supportsTenantManagement,
    selectedCustomerTopology,
  } = useTenantContext()

  const isCustomerAdmin = useMemo(
    () => accessibleCustomerIds.some((id) => hasCustomerRole(id, 'CUSTOMER_ADMIN')),
    [accessibleCustomerIds, hasCustomerRole],
  )

  const primaryRole = useMemo(() => {
    if (isSuperAdmin) return 'Super Administrator'
    if (isCustomerAdmin) return 'Customer Administrator'
    const tenantAdmin = user?.tenantMemberships?.find((membership) =>
      membership?.roles?.includes('TENANT_ADMIN'))
    if (tenantAdmin) return 'Tenant Administrator'
    return 'User'
  }, [isCustomerAdmin, isSuperAdmin, user])

  const dashboardTitle = useMemo(() => {
    if (isCustomerAdmin) return 'Customer Admin Workspace'
    if (primaryRole === 'Tenant Administrator') return 'Tenant Workspace'
    return 'Workspace'
  }, [isCustomerAdmin, primaryRole])

  const subtitle = isCustomerAdmin
    ? 'This landing page stays intentionally light while customer-admin overview modules are prepared.'
    : 'This landing page stays intentionally light while role-aware overview modules are prepared.'

  const guidance = isCustomerAdmin
    ? 'Use the main navigation for Manage Users, Manage Tenants, Monitoring, and Help. Scope controls remain below only where they still add value.'
    : 'Use the main navigation for the tools available to your role. This page is reserved for future overview content.'

  const topologyLabel = useMemo(() => {
    if (selectedCustomerTopology === 'MULTI_TENANT') return 'Multi-tenant'
    if (selectedCustomerTopology === 'SINGLE_TENANT') return 'Single-tenant'
    return 'Not available'
  }, [selectedCustomerTopology])

  const tenantScopeValue = useMemo(() => {
    if (selectedCustomerTopology === 'SINGLE_TENANT') return 'Single-tenant customer'
    if (resolvedTenantName) return resolvedTenantName
    if (tenantId) return tenantId
    if (customerId && supportsTenantManagement) return 'All tenants'
    return 'Not selected'
  }, [customerId, resolvedTenantName, selectedCustomerTopology, supportsTenantManagement, tenantId])

  const showCustomerSelector = isCustomerAdmin && accessibleCustomerIds.length > 1
  const showTenantSwitcher = isCustomerAdmin && supportsTenantManagement && Boolean(customerId)
  const controls = showCustomerSelector || showTenantSwitcher
    ? (
      <>
        {showCustomerSelector ? (
          <CustomerSelector className="admin-holding-page__control" />
        ) : null}
        {showTenantSwitcher ? (
          <TenantSwitcher className="admin-holding-page__control" />
        ) : null}
      </>
      )
    : null

  const summaryTitle = isCustomerAdmin ? 'Current scope' : 'Current session'
  const summarySubtitle = isCustomerAdmin
    ? 'The selected customer and tenant scope will carry into customer-admin tools from the main navigation.'
    : 'This page is currently acting as a lightweight landing surface for your role.'

  const summaryItems = useMemo(
    () => [
      { label: 'Access level', value: primaryRole },
      { label: 'Customer scope', value: customerId ?? 'Not selected' },
      { label: 'Tenant scope', value: tenantScopeValue },
      { label: 'Topology', value: topologyLabel },
    ],
    [customerId, primaryRole, tenantScopeValue, topologyLabel],
  )

  const futureItems = useMemo(
    () => [
      {
        title: 'Overview metrics',
        description: 'Reserved for role-aware counts, trust signals, and high-level access summaries.',
        icon: <MdOutlineAssessment aria-hidden="true" />,
      },
      {
        title: 'Operational highlights',
        description: 'Reserved for activity rollups, lifecycle changes, and notable governance events.',
        icon: <MdOutlineInsights aria-hidden="true" />,
      },
      {
        title: 'Attention queue',
        description: 'Reserved for alerts, pending actions, and context-specific follow-up items.',
        icon: <MdOutlineNotificationsActive aria-hidden="true" />,
      },
    ],
    [],
  )

  return (
    <AdminHoldingPage
      ariaLabel="Dashboard landing page"
      title={dashboardTitle}
      subtitle={subtitle}
      roleLabel={primaryRole}
      guidance={guidance}
      userName={user?.name ?? ''}
      summaryTitle={summaryTitle}
      summarySubtitle={summarySubtitle}
      summaryItems={summaryItems}
      controls={controls}
      futureItems={futureItems}
    />
  )
}

export default Dashboard
