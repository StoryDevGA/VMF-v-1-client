/**
 * Dashboard Page
 *
 * Customer runtime operating surface with tenant, role, and work context.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  MdAddCircleOutline,
  MdFilterList,
  MdOutlineAssessment,
  MdOutlineDashboardCustomize,
  MdOutlineInsights,
  MdOutlinePeopleAlt,
  MdOutlinePlayCircle,
  MdOutlineWarningAmber,
} from 'react-icons/md'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { CustomerSelector } from '../../components/CustomerSelector'
import { CustomSelect } from '../../components/CustomSelect'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Link } from '../../components/Link'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { TenantSwitcher } from '../../components/TenantSwitcher'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useGetCustomerQuery } from '../../store/api/customerApi.js'
import { useListVmfsQuery } from '../../store/api/vmfApi.js'
import {
  formatRuntimeTokenLabel,
  getExecutionStateVariant,
  getRuntimeExecutionState,
  getRuntimeInstanceDisplayId,
  getRuntimeLifecycleStatus,
  getRuntimeReadinessLabel,
  getRuntimeStatusVariant,
} from '../../utils/runtimeWorkspace.js'
import { getSingleTenantDisplayName, getTenantId } from '../MaintainTenants/tenantUtils.js'
import './Dashboard.css'

const WORK_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Work' },
  { value: 'VALUE_NARRATIVE', label: 'Value Narratives' },
  { value: 'DEAL_ANALYSIS', label: 'Deal Analysis' },
  { value: 'BUSINESS_CASE', label: 'Business Cases' },
  { value: 'ACCOUNT_PLAN', label: 'Account Plans' },
]

const EMPTY_RUNTIME_ROWS = Object.freeze([])

// TODO: replace with runtime activity events once the Runtime Execution Engine emits them.
const EMPTY_RUNTIME_ACTIVITY = Object.freeze([])

const normalizeFeatureKeys = (features) =>
  Array.isArray(features)
    ? features
      .map((feature) => String(feature ?? '').trim().toUpperCase())
      .filter(Boolean)
    : []

const normalizeRoleKeys = (roles) =>
  Array.isArray(roles)
    ? roles.map((role) => String(role ?? '').trim().toUpperCase()).filter(Boolean)
    : []

const hasRole = (roles, role) => normalizeRoleKeys(roles).includes(role)

const getMembershipCustomerId = (membership) =>
  membership?.customerId
  ?? membership?.customer?.id
  ?? membership?.customer?._id

const findCustomerMembership = (user, customerId, role) => {
  if (!customerId || !Array.isArray(user?.memberships)) return null
  const normalizedCustomerId = String(customerId)

  return user.memberships.find((membership) => {
    const membershipCustomerId = getMembershipCustomerId(membership)
    return membershipCustomerId !== null
      && membershipCustomerId !== undefined
      && String(membershipCustomerId) === normalizedCustomerId
      && (!role || hasRole(membership?.roles, role))
  }) ?? null
}

const findTenantMembership = (user, customerId, tenantId, role) => {
  if (!customerId || !tenantId || !Array.isArray(user?.tenantMemberships)) return null
  const normalizedCustomerId = String(customerId)
  const normalizedTenantId = String(tenantId)

  return user.tenantMemberships.find((membership) =>
    String(getMembershipCustomerId(membership) ?? '') === normalizedCustomerId
    && String(membership?.tenantId ?? '') === normalizedTenantId
    && (!role || hasRole(membership?.roles, role))) ?? null
}

const findTenantMembershipByCustomer = (user, customerId, role) => {
  if (!customerId || !Array.isArray(user?.tenantMemberships)) return null
  const normalizedCustomerId = String(customerId)

  return user.tenantMemberships.find((membership) =>
    String(getMembershipCustomerId(membership) ?? '') === normalizedCustomerId
    && (!role || hasRole(membership?.roles, role))) ?? null
}

const getVmfId = (vmf) => String(vmf?.id ?? vmf?._id ?? '').trim()

const getVmfName = (vmf) => {
  const candidate = vmf?.name ?? vmf?.title ?? vmf?.label ?? getVmfId(vmf)
  return String(candidate || 'Value Narrative').trim()
}

const getFrameworkPackageLabel = (vmf) => {
  const frameworkPackage = vmf?.frameworkPackage

  if (typeof frameworkPackage === 'string') {
    const trimmed = frameworkPackage.trim()
    if (trimmed) return trimmed
  } else if (frameworkPackage && typeof frameworkPackage === 'object') {
    const candidates = [
      frameworkPackage.packageName,
      frameworkPackage.frameworkPackageName,
      frameworkPackage.name,
      frameworkPackage.label,
      frameworkPackage.packageKey,
      frameworkPackage.key,
      frameworkPackage.code,
      frameworkPackage.id,
    ]

    for (const candidate of candidates) {
      const trimmed = String(candidate ?? '').trim()
      if (trimmed) return trimmed
    }
  }

  const fallbackCandidates = [
    vmf?.frameworkPackageName,
    vmf?.packageName,
    vmf?.packageLabel,
    vmf?.frameworkPackageId,
  ]

  for (const candidate of fallbackCandidates) {
    const trimmed = String(candidate ?? '').trim()
    if (trimmed) return trimmed
  }

  return '--'
}

const getFrameworkPackageVersion = (vmf) => {
  const frameworkPackage = vmf?.frameworkPackage
  const candidates = [
    frameworkPackage && typeof frameworkPackage === 'object' ? frameworkPackage.version : '',
    frameworkPackage && typeof frameworkPackage === 'object' ? frameworkPackage.frameworkVersion : '',
    vmf?.frameworkVersion,
  ]

  for (const candidate of candidates) {
    const trimmed = String(candidate ?? '').trim()
    if (trimmed) return trimmed
  }

  return '--'
}

const formatUpdatedLabel = (value) => {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return 'Open workspace'
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return 'Recently updated'
  return `Updated ${date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`
}

function DashboardHeroMetric({ label, value, children, control = false }) {
  const metricClassName = [
    'dashboard__hero-metric',
    control ? 'dashboard__hero-metric--control' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={metricClassName}>
      <dt>{label}</dt>
      <dd>{children ?? value}</dd>
    </div>
  )
}

function DashboardSectionCard({
  badge,
  children,
  description,
  icon,
  modifier,
  panelAs = 'div',
  panelLabel,
  status,
  title,
}) {
  const SectionIcon = icon
  const PanelElement = panelAs
  const cardClassName = [
    'dashboard__section-card',
    modifier ? `dashboard__section-card--${modifier}` : '',
  ].filter(Boolean).join(' ')
  const panelProps = panelAs === 'nav'
    ? { 'aria-label': panelLabel }
    : { 'aria-label': panelLabel, role: 'region' }

  return (
    <Card variant="default" className={cardClassName} role="listitem">
      <Card.Body className="dashboard__section-body">
        <div className="dashboard__section-summary">
          <div className="dashboard__section-meta">
            <span className="dashboard__section-icon" aria-hidden="true">
              <SectionIcon />
            </span>
            {badge ? (
              <Badge variant={badge.variant ?? 'info'} size="sm" pill outline>
                {badge.label}
              </Badge>
            ) : null}
            {status ? (
              <Status variant={status.variant ?? 'neutral'} size="sm" showIcon>
                {status.label}
              </Status>
            ) : null}
          </div>
          <div className="dashboard__section-copy">
            <h2 className="dashboard__section-title">{title}</h2>
            <p className="dashboard__section-description">{description}</p>
          </div>
        </div>
        <PanelElement className="dashboard__section-panel" {...panelProps}>
          {children}
        </PanelElement>
      </Card.Body>
    </Card>
  )
}

function RuntimeActionCard({ action }) {
  const Icon = action.icon

  return (
    <li
      className={[
        'dashboard__launch-item',
        'dashboard__launch-item--action',
        action.priority === 'HIGH' ? 'dashboard__action-card--priority' : '',
        action.disabled ? 'dashboard__action-card--disabled' : '',
      ].filter(Boolean).join(' ')}
    >
      <Link
        to={action.to}
        disabled={action.disabled}
        className="dashboard__launch-link dashboard__launch-link--action"
        variant="subtle"
        underline="none"
      >
        <span className="dashboard__launch-topline">
          <span className="dashboard__launch-icon" aria-hidden="true">
            <Icon />
          </span>
          <Badge
            variant={action.priority === 'HIGH' ? 'warning' : 'neutral'}
            size="sm"
            pill
            outline
          >
            {action.priority}
          </Badge>
        </span>
        <span className="dashboard__launch-copy">
          <span className="dashboard__launch-label">{action.title}</span>
          <span className="dashboard__launch-meta">{action.meta}</span>
          <span className="dashboard__launch-description">{action.description}</span>
          <span className="dashboard__launch-command">{action.label}</span>
        </span>
      </Link>
    </li>
  )
}

function CreateWorkCard({ item }) {
  const Icon = item.icon

  return (
    <li
      className={[
        'dashboard__launch-item',
        'dashboard__launch-item--create',
        item.disabled ? 'dashboard__create-card--disabled' : '',
      ].filter(Boolean).join(' ')}
    >
      <Link
        to={item.to}
        disabled={item.disabled}
        className="dashboard__launch-link dashboard__launch-link--create"
        variant="subtle"
        underline="none"
      >
        <span className="dashboard__launch-topline">
          <span className="dashboard__launch-icon" aria-hidden="true">
            <Icon />
          </span>
          <Badge variant={item.disabled ? 'neutral' : 'success'} size="sm" pill outline>
            {item.label}
          </Badge>
        </span>
        <span className="dashboard__launch-copy">
          <span className="dashboard__launch-label">{item.title}</span>
          <span className="dashboard__launch-meta">{item.description}</span>
          <span className="dashboard__launch-description">{item.reason}</span>
        </span>
      </Link>
    </li>
  )
}

function SecondaryNavigationLink({ item }) {
  const Icon = item.icon
  const badge = item.badge

  return (
    <li
      className={[
        'dashboard__launch-item',
        'dashboard__launch-item--secondary',
        item.disabled ? 'dashboard__secondary-card--disabled' : '',
      ].filter(Boolean).join(' ')}
    >
      <Link
        to={item.to}
        disabled={item.disabled}
        className="dashboard__launch-link dashboard__launch-link--secondary"
        variant="subtle"
        underline="none"
      >
        <span className="dashboard__launch-topline">
          <span className="dashboard__launch-icon" aria-hidden="true">
            <Icon />
          </span>
          {badge ? (
            <Badge variant={badge.variant ?? 'neutral'} size="sm" pill outline>
              {badge.label}
            </Badge>
          ) : null}
        </span>
        <span className="dashboard__launch-copy">
          <span className="dashboard__launch-label">{item.title}</span>
          <span className="dashboard__launch-meta">{item.meta}</span>
        </span>
      </Link>
    </li>
  )
}

function Dashboard() {
  const [workTypeFilter, setWorkTypeFilter] = useState('ALL')
  const authorization = useAuthorization()
  const {
    user,
    accessibleCustomerIds,
    isSuperAdmin,
    hasCustomerRole,
    hasCustomerPermission,
    hasTenantPermission,
  } = authorization
  const { getFeatureEntitlements } = authorization
  const {
    customerId,
    tenantId,
    tenants,
    selectableTenants,
    canViewTenants,
    customerName,
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

    const customerMembership = findCustomerMembership(user, customerId)
    const tenantMembership = findTenantMembershipByCustomer(user, customerId)

    const customerNameCandidates = [
      customerName,
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

    return resolvedCustomerName || 'Current customer'
  }, [customerDetails, customerId, customerName, tenants, user])

  const hasAnyCustomerAdminAccess = useMemo(
    () => accessibleCustomerIds.some((id) => hasCustomerRole(id, 'CUSTOMER_ADMIN')),
    [accessibleCustomerIds, hasCustomerRole],
  )

  const hasAnyTenantAdminAccess = useMemo(() => {
    const hasCustomerScopedTenantAdmin = accessibleCustomerIds.some(
      (id) => hasCustomerRole(id, 'TENANT_ADMIN'),
    )

    const hasTenantMembershipAdmin = Array.isArray(user?.tenantMemberships)
      && user.tenantMemberships.some((membership) => hasRole(membership?.roles, 'TENANT_ADMIN'))

    return hasCustomerScopedTenantAdmin || hasTenantMembershipAdmin
  }, [accessibleCustomerIds, hasCustomerRole, user])

  const hasSelectedCustomerAdminAccess = useMemo(
    () => Boolean(customerId && hasCustomerRole(customerId, 'CUSTOMER_ADMIN')),
    [customerId, hasCustomerRole],
  )

  const hasCustomerScopedTenantAdmin = useMemo(
    () => Boolean(customerId && hasCustomerRole(customerId, 'TENANT_ADMIN')),
    [customerId, hasCustomerRole],
  )

  const hasSelectedCustomerTenantMembershipAdmin = useMemo(
    () =>
      Boolean(
        customerId
          && findTenantMembershipByCustomer(user, customerId, 'TENANT_ADMIN'),
      ),
    [customerId, user],
  )

  const hasSelectedCustomerTenantAdminAccess = useMemo(
    () => hasCustomerScopedTenantAdmin || hasSelectedCustomerTenantMembershipAdmin,
    [hasCustomerScopedTenantAdmin, hasSelectedCustomerTenantMembershipAdmin],
  )

  const hasSelectedSalesManagerRole = useMemo(
    () =>
      Boolean(
        findCustomerMembership(user, customerId, 'SALES_MANAGER')
        || findTenantMembership(user, customerId, tenantId, 'SALES_MANAGER'),
      ),
    [customerId, tenantId, user],
  )

  const hasSelectedSalesExecutionRole = useMemo(
    () =>
      Boolean(
        findCustomerMembership(user, customerId, 'SALES')
        || findCustomerMembership(user, customerId, 'SALES_USER')
        || findTenantMembership(user, customerId, tenantId, 'SALES')
        || findTenantMembership(user, customerId, tenantId, 'SALES_USER'),
      ),
    [customerId, tenantId, user],
  )

  const canOpenVmfWorkspace = useMemo(() => {
    if (!customerId) return false
    if (typeof hasCustomerPermission === 'function' && hasCustomerPermission(customerId, 'VMF_VIEW')) return true
    if (tenantId && typeof hasTenantPermission === 'function') {
      return hasTenantPermission(customerId, tenantId, 'VMF_VIEW')
    }
    return false
  }, [customerId, hasCustomerPermission, hasTenantPermission, tenantId])

  const contextReady = Boolean(customerId && (!supportsTenantManagement || tenantId))

  const {
    data: vmfListResponse,
    isLoading: isLoadingVmfs,
    isFetching: isFetchingVmfs,
  } = useListVmfsQuery(
    {
      customerId,
      tenantId,
      status: 'ACTIVE',
      page: 1,
      pageSize: 5,
    },
    { skip: !contextReady || !canOpenVmfWorkspace },
  )

  const tenantRowsForSwitcher = useMemo(
    () => selectableTenantRows,
    [selectableTenantRows],
  )

  const hasTenantSelectionAccess = useMemo(
    () => Boolean(customerId && supportsTenantManagement && canViewTenants),
    [canViewTenants, customerId, supportsTenantManagement],
  )

  const primaryRole = useMemo(() => {
    if (isSuperAdmin) return 'Super Administrator'
    if (hasSelectedSalesManagerRole) return 'Sales Manager'
    if (hasSelectedSalesExecutionRole) return 'Sales User'
    if (customerId) {
      if (hasSelectedCustomerAdminAccess) return 'Customer Administrator'
      if (hasSelectedCustomerTenantAdminAccess) return 'Tenant Administrator'
      return 'User'
    }
    if (hasAnyCustomerAdminAccess) return 'Customer Administrator'
    if (hasAnyTenantAdminAccess) return 'Tenant Administrator'
    return 'User'
  }, [
    customerId,
    hasAnyCustomerAdminAccess,
    hasAnyTenantAdminAccess,
    hasSelectedCustomerAdminAccess,
    hasSelectedCustomerTenantAdminAccess,
    hasSelectedSalesExecutionRole,
    hasSelectedSalesManagerRole,
    isSuperAdmin,
  ])

  const tenantScopeValue = useMemo(() => {
    if (selectedCustomerTopology === 'SINGLE_TENANT') {
      return getSingleTenantDisplayName(
        resolvedTenantName,
        customerScopeValue,
        'Single-tenant customer',
      )
    }
    if (supportsTenantManagement && !hasTenantSelectionAccess) {
      return 'Not selected'
    }
    if (resolvedTenantName) return resolvedTenantName
    if (tenantId) return tenantId
    if (customerId && supportsTenantManagement) return 'Not selected'
    return 'Not selected'
  }, [
    customerId,
    customerScopeValue,
    hasTenantSelectionAccess,
    resolvedTenantName,
    selectedCustomerTopology,
    supportsTenantManagement,
    tenantId,
  ])

  const featureEntitlements = useMemo(
    () =>
      customerId && typeof getFeatureEntitlements === 'function'
        ? normalizeFeatureKeys(getFeatureEntitlements(customerId))
        : [],
    [customerId, getFeatureEntitlements],
  )

  const showCustomerSelector = hasAnyCustomerAdminAccess && accessibleCustomerIds.length > 1
  const showAccessibleTenantSwitcher = Boolean(
    supportsTenantManagement
      && customerId
      && hasTenantSelectionAccess
      && tenantRowsForSwitcher.length > 1,
  )

  const tenantScopeSummary = useMemo(() => {
    if (!customerId) return 'Select a customer to view runtime context.'
    if (!supportsTenantManagement) {
      return `${customerScopeValue} uses a single tenant. Runtime work opens in that tenant context.`
    }

    const tenantNames = tenantRowsForSwitcher
      .map((tenant) => String(tenant?.name ?? '').trim())
      .filter(Boolean)
    const tenantCount = tenantRowsForSwitcher.length
    const tenantLabel = tenantCount === 1 ? 'tenant' : 'tenants'

    if (tenantId) {
      return `Viewing runtime workspace for ${tenantScopeValue} under ${customerScopeValue}.`
    }

    if (tenantCount > 0) {
      const tenantList = tenantNames.length > 0 ? `: ${tenantNames.join(', ')}` : ''
      return `${customerScopeValue} has ${tenantCount} ${tenantLabel}${tenantList}. Select a tenant to view runtime work and VMF availability.`
    }

    return `${customerScopeValue} has no tenants available for this account.`
  }, [
    customerId,
    customerScopeValue,
    supportsTenantManagement,
    tenantId,
    tenantRowsForSwitcher,
    tenantScopeValue,
  ])

  useEffect(() => {
    if (!supportsTenantManagement || !customerId || isLoadingTenants || !hasTenantSelectionAccess) return
    if (tenantRowsForSwitcher.length !== 1) return
    if (tenantId && !hasInvalidTenantContext) return

    const onlyTenant = tenantRowsForSwitcher[0]
    const onlyTenantId = getTenantId(onlyTenant)
    if (!onlyTenantId) return

    setTenantId(onlyTenantId, onlyTenant?.name ?? null)
  }, [
    customerId,
    hasTenantSelectionAccess,
    hasInvalidTenantContext,
    isLoadingTenants,
    setTenantId,
    supportsTenantManagement,
    tenantId,
    tenantRowsForSwitcher,
  ])

  const hasVmfFeature = featureEntitlements.includes('VMF')
  const hasDealFeature =
    featureEntitlements.includes('DEALS')
    || featureEntitlements.includes('DEAL_ANALYSIS')
  const hasActiveVmfAnchor = Boolean(contextReady && hasVmfFeature && canOpenVmfWorkspace)
  const canCreateValueNarrative = hasActiveVmfAnchor
  const canCreateDealAnalysis = Boolean(
    hasActiveVmfAnchor && hasDealFeature && hasSelectedSalesExecutionRole,
  )
  const activeVmfRows = Array.isArray(vmfListResponse?.data) ? vmfListResponse.data : EMPTY_RUNTIME_ROWS
  const isLoadingRuntimeVmfs = Boolean(isLoadingVmfs || isFetchingVmfs)

  const runtimeActions = useMemo(() => {
    if (!customerId) {
      return [
        {
          actionKey: 'SELECT_CUSTOMER',
          description: 'Select a customer before opening runtime work.',
          disabled: true,
          icon: MdOutlineWarningAmber,
          label: 'Customer required',
          meta: 'Runtime context is incomplete',
          priority: 'HIGH',
          runtimeInstanceId: null,
          title: 'Select a customer to continue',
          to: '/app/dashboard',
        },
      ]
    }

    if (supportsTenantManagement && !tenantId) {
      return [
        {
          actionKey: 'SELECT_TENANT',
          description: 'Tenant context is required before runtime actions can run.',
          disabled: true,
          icon: MdOutlineWarningAmber,
          label: 'Tenant required',
          meta: `${customerScopeValue} / No tenant selected`,
          priority: 'HIGH',
          runtimeInstanceId: null,
          title: 'Select a tenant to continue your work',
          to: '/app/dashboard',
        },
      ]
    }

    return activeVmfRows.map((vmf) => {
      const vmfName = getVmfName(vmf)
      const packageLabel = getFrameworkPackageLabel(vmf)
      const packageVersion = getFrameworkPackageVersion(vmf)

      return {
        actionKey: 'OPEN_VMF_WORKSPACE',
        description: `Open the active VMF workspace backed by ${packageLabel}.`,
        disabled: !canOpenVmfWorkspace,
        icon: MdOutlinePlayCircle,
        label: canOpenVmfWorkspace ? 'Open workspace' : 'Unavailable',
        meta: `${tenantScopeValue} / ${packageLabel} / ${packageVersion}`,
        priority: 'MEDIUM',
        runtimeInstanceId: getVmfId(vmf) || vmfName,
        title: `Continue ${vmfName}`,
        to: canOpenVmfWorkspace ? '/app/workspaces/vmf' : '/app/dashboard',
      }
    })
  }, [
    activeVmfRows,
    canOpenVmfWorkspace,
    customerId,
    customerScopeValue,
    supportsTenantManagement,
    tenantId,
    tenantScopeValue,
  ])

  const runtimeInstances = useMemo(() => {
    if (!contextReady) return []
    return activeVmfRows.map((vmf) => {
      const vmfName = getVmfName(vmf)
      const packageLabel = getFrameworkPackageLabel(vmf)
      const packageVersion = getFrameworkPackageVersion(vmf)
      const workType = 'VALUE_NARRATIVE'
      const runtimeStatus = getRuntimeLifecycleStatus(vmf)
      const executionState = getRuntimeExecutionState(vmf)

      return {
        id: getVmfId(vmf) || vmfName,
        runtimeDisplayId: getRuntimeInstanceDisplayId(vmf, workType),
        work: vmfName,
        // TODO: replace with vmf.workType once the API returns it.
        workType,
        workTypeLabel: 'Value Narrative',
        tenant: tenantScopeValue,
        packageSummary: `Package: ${packageLabel}`,
        status: runtimeStatus,
        executionState,
        readiness: getRuntimeReadinessLabel(vmf),
        lastActivity: formatUpdatedLabel(vmf?.updatedAt),
        nextAction: `Open ${packageVersion}`,
      }
    })
  }, [activeVmfRows, contextReady, tenantScopeValue])

  const filteredRuntimeInstances = useMemo(() => {
    if (workTypeFilter === 'ALL') return runtimeInstances
    return runtimeInstances.filter((instance) => instance.workType === workTypeFilter)
  }, [runtimeInstances, workTypeFilter])

  const createWorkItems = useMemo(() => [
    {
      description: 'Create a governed Value Narrative from the active VMF deployment.',
      disabled: !canCreateValueNarrative,
      icon: MdOutlineDashboardCustomize,
      label: canCreateValueNarrative ? 'Create' : 'Unavailable',
      reason: canCreateValueNarrative
        ? 'Active VMF runtime context is available.'
        : 'Value Narrative unavailable - no active VMF framework is available for this tenant.',
      title: 'Create Value Narrative',
      to: canCreateValueNarrative ? '/app/workspaces/vmf' : '/app/dashboard',
    },
    {
      description: 'Create Deal Analysis anchored to a locked VMF runtime instance.',
      disabled: !canCreateDealAnalysis,
      icon: MdOutlineAssessment,
      label: canCreateDealAnalysis ? 'Create' : 'Unavailable',
      reason: canCreateDealAnalysis
        ? 'Deal Analysis will inherit the current VMF runtime anchor.'
        : 'Deal Analysis unavailable - no active VMF framework is available for this tenant.',
      title: 'Create Deal Analysis',
      to: canCreateDealAnalysis ? '/app/workspaces/vmf' : '/app/dashboard',
    },
    {
      description: 'Prepare governed outputs from completed runtime work.',
      disabled: true,
      icon: MdOutlineInsights,
      label: 'Planned',
      reason: 'Output generation will be enabled after Runtime Execution integration.',
      title: 'Generate Output',
      to: '/app/dashboard',
    },
  ], [canCreateDealAnalysis, canCreateValueNarrative])

  const alerts = useMemo(() => {
    if (!contextReady) {
      return [
        {
          id: 'context-required',
          label: 'Runtime context required',
          description: 'Select a tenant before runtime work and governed actions are enabled.',
          variant: 'warning',
        },
      ]
    }

    return []
  }, [contextReady])

  const secondaryNavigationItems = useMemo(() => [
    {
      badge: {
        label: canOpenVmfWorkspace ? 'Current' : 'Unavailable',
        variant: canOpenVmfWorkspace ? 'success' : 'neutral',
      },
      disabled: !canOpenVmfWorkspace,
      icon: MdOutlineDashboardCustomize,
      meta: canOpenVmfWorkspace ? 'Current VMF runtime workspace' : 'VMF workspace unavailable',
      title: 'Value Narrative Workspace',
      to: canOpenVmfWorkspace ? '/app/workspaces/vmf' : '/app/dashboard',
    },
    {
      badge: { label: 'Planned', variant: 'neutral' },
      disabled: true,
      icon: MdOutlineAssessment,
      meta: 'Output workspace is planned',
      title: 'Outputs',
      to: '/app/dashboard',
    },
    {
      badge: { label: 'Planned', variant: 'neutral' },
      disabled: true,
      icon: MdOutlineInsights,
      meta: 'Insights workspace is planned',
      title: 'Insights',
      to: '/app/dashboard',
    },
    {
      badge: {
        label: hasSelectedCustomerAdminAccess || hasSelectedCustomerTenantAdminAccess ? 'Admin' : 'Unavailable',
        variant: hasSelectedCustomerAdminAccess || hasSelectedCustomerTenantAdminAccess ? 'info' : 'neutral',
      },
      disabled: !hasSelectedCustomerAdminAccess && !hasSelectedCustomerTenantAdminAccess,
      icon: MdOutlinePeopleAlt,
      meta: 'Tenant and user administration',
      title: 'Tenant Administration',
      to: '/app/administration/maintain-tenants',
    },
  ], [
    canOpenVmfWorkspace,
    hasSelectedCustomerAdminAccess,
    hasSelectedCustomerTenantAdminAccess,
  ])

  const runtimeActionGridClassName = [
    'dashboard__launch-grid',
    'dashboard__launch-grid--actions',
    runtimeActions.length === 1 ? 'dashboard__launch-grid--single' : '',
  ].filter(Boolean).join(' ')

  const runtimeInstanceEmptyMessage = !contextReady
    ? 'Select a tenant to show runtime work.'
    : isLoadingRuntimeVmfs
      ? 'Loading runtime work...'
    : workTypeFilter === 'ALL'
      ? 'No runtime instances are available for this tenant yet.'
      : 'No runtime instances match the selected work type.'
  const runtimeActionEmptyLabel = isLoadingRuntimeVmfs ? 'Loading runtime actions' : 'No runtime actions'
  const runtimeActionEmptyMessage = isLoadingRuntimeVmfs
    ? 'Checking for active VMF runtime work in this tenant.'
    : 'Runtime actions will appear here once runtime instances exist for this tenant.'
  const runtimeActivityItems = EMPTY_RUNTIME_ACTIVITY

  const tableColumns = useMemo(() => [
    {
      key: 'runtimeDisplayId',
      label: 'Runtime ID',
      render: (value, row) => (
        <div className="dashboard__work-cell">
          <span className="dashboard__work-heading">
            <span className="dashboard__work-title">{value}</span>
          </span>
          <span className="dashboard__work-id">{row.work}</span>
        </div>
      ),
    },
    {
      key: 'workTypeLabel',
      label: 'Work Type',
      render: (value) => (
        <Badge variant="neutral" size="sm" pill outline>{value}</Badge>
      ),
    },
    {
      key: 'tenant',
      label: 'Tenant Scope',
      render: (value, row) => (
        <div className="dashboard__stacked-cell">
          <span>{value}</span>
          <span>{row.packageSummary}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Runtime Status',
      render: (value, row) => (
        <div className="dashboard__stacked-cell">
          <Status variant={getRuntimeStatusVariant(value)} size="sm" showIcon>
            {formatRuntimeTokenLabel(value)}
          </Status>
          <span>{row.readiness}</span>
        </div>
      ),
    },
    {
      key: 'executionState',
      label: 'Execution State',
      render: (value) => (
        <Status variant={getExecutionStateVariant(value)} size="sm">
          {formatRuntimeTokenLabel(value)}
        </Status>
      ),
    },
    {
      key: 'lastActivity',
      label: 'Updated',
    },
    {
      key: 'nextAction',
      label: 'Next Action',
      render: (value) => (
        <div className="dashboard__next-cell">
          <Link to="/app/workspaces/vmf" variant="primary" underline="none">
            {value}
          </Link>
        </div>
      ),
    },
  ], [])

  return (
    <section className="dashboard container" aria-label="Customer runtime home">
      <Card variant="default" className="dashboard__hero">
        <Card.Body className="dashboard__hero-body">
          <div className="dashboard__hero-copy">
            <div className="dashboard__hero-heading">
              <Badge
                variant="info"
                size="sm"
                pill
                outline
                icon={<MdOutlineDashboardCustomize aria-hidden="true" />}
              >
                Runtime Home
              </Badge>
              <h1 className="dashboard__hero-title">Customer Workspace</h1>
              <p className="dashboard__hero-description">
                Continue governed runtime work inside the selected customer, tenant, and role context.
              </p>
              <p className="dashboard__scope-feedback">{tenantScopeSummary}</p>
            </div>
          </div>

          <dl className="dashboard__hero-metrics" aria-label="Runtime context summary">
            <DashboardHeroMetric label="Customer" control={showCustomerSelector}>
              {showCustomerSelector ? (
                <CustomerSelector className="dashboard__context-selector" />
              ) : (
                <span className="dashboard__context-value">{customerScopeValue}</span>
              )}
            </DashboardHeroMetric>
            <DashboardHeroMetric label="Tenant" control={showAccessibleTenantSwitcher}>
              {showAccessibleTenantSwitcher ? (
                <TenantSwitcher
                  className="dashboard__context-selector"
                  includeAllTenants={false}
                  placeholder="Select tenant"
                />
              ) : (
                <span className="dashboard__context-value">{tenantScopeValue}</span>
              )}
            </DashboardHeroMetric>
            <DashboardHeroMetric label="Work Type" control>
              <CustomSelect
                value={workTypeFilter}
                onChange={setWorkTypeFilter}
                options={WORK_TYPE_OPTIONS}
                placeholder="All Work"
                icon={<MdFilterList size={18} />}
                ariaLabel="Work Type"
                className="dashboard__context-selector"
              />
            </DashboardHeroMetric>
            <DashboardHeroMetric label="Role">
              <span className="dashboard__context-value">{primaryRole}</span>
            </DashboardHeroMetric>
          </dl>
        </Card.Body>
      </Card>

      <div className="dashboard__sections" role="list" aria-label="Customer runtime workspace groups">
        <DashboardSectionCard
          badge={{ label: `${runtimeActions.length} available`, variant: 'info' }}
          description="Action items resolve to runtime instances and governed action keys."
          icon={MdOutlinePlayCircle}
          modifier="actions"
          panelAs="nav"
          panelLabel="Runtime action queue panel"
          status={{ label: contextReady ? 'Context ready' : 'Tenant required', variant: contextReady ? 'success' : 'warning' }}
          title="What should I do now?"
        >
          <ul className={runtimeActionGridClassName} aria-label="Runtime action queue">
            {runtimeActions.length > 0 ? (
              runtimeActions.map((action) => (
                <RuntimeActionCard
                  key={`${action.runtimeInstanceId ?? 'context'}-${action.actionKey}`}
                  action={action}
                />
              ))
            ) : (
              <li className="dashboard__empty-item">
                <Status variant="info" size="sm" showIcon>
                  {runtimeActionEmptyLabel}
                </Status>
                <p>{runtimeActionEmptyMessage}</p>
              </li>
            )}
          </ul>
        </DashboardSectionCard>

        <DashboardSectionCard
          badge={{ label: `${filteredRuntimeInstances.length} visible`, variant: 'neutral' }}
          description="Runtime instances are first-class work objects. The selected work type filters this list."
          icon={MdFilterList}
          modifier="work"
          panelLabel="Work in progress runtime instances panel"
          status={{ label: workTypeFilter === 'ALL' ? 'All work' : formatRuntimeTokenLabel(workTypeFilter), variant: 'info' }}
          title="Work In Progress"
        >
          <HorizontalScroll
            className="dashboard__table-wrap"
            ariaLabel="Work in progress runtime instances table"
            gap="sm"
          >
            <Table
              columns={tableColumns}
              data={filteredRuntimeInstances}
              variant="striped"
              hoverable
              ariaLabel="Work in progress runtime instances"
              emptyMessage={runtimeInstanceEmptyMessage}
              className="dashboard__work-table"
            />
          </HorizontalScroll>
        </DashboardSectionCard>

        <DashboardSectionCard
          badge={{ label: `${runtimeActivityItems.length} events`, variant: 'neutral' }}
          description="Runtime activity will show execution, review, validation, and state-transition events when the Runtime Execution Engine emits them."
          icon={MdOutlineInsights}
          modifier="activity"
          panelLabel="Recent runtime activity panel"
          status={{ label: 'No activity yet', variant: 'neutral' }}
          title="Recent Runtime Activity"
        >
          <ul className="dashboard__activity-list" aria-label="Recent runtime activity">
            {runtimeActivityItems.length > 0 ? (
              runtimeActivityItems.map((activity) => (
                <li key={activity.id} className="dashboard__activity-item">
                  <Status variant={activity.variant} size="sm" showIcon>
                    {activity.label}
                  </Status>
                  <p>{activity.description}</p>
                </li>
              ))
            ) : (
              <li className="dashboard__empty-item">
                <Status variant="info" size="sm" showIcon>
                  No runtime activity yet
                </Status>
                <p>Activity will appear here when runtime instances emit execution, review, or validation events.</p>
              </li>
            )}
          </ul>
        </DashboardSectionCard>

        <DashboardSectionCard
          badge={{ label: `${createWorkItems.length} options`, variant: 'info' }}
          description="Create options are driven by active deployments, tenant entitlement, role, and runtime anchors."
          icon={MdAddCircleOutline}
          modifier="create"
          panelAs="nav"
          panelLabel="Create new work panel"
          status={{ label: canCreateValueNarrative || canCreateDealAnalysis ? 'Available now' : 'Limited', variant: canCreateValueNarrative || canCreateDealAnalysis ? 'success' : 'warning' }}
          title="Create New Work"
        >
          <ul className="dashboard__launch-grid dashboard__launch-grid--create" aria-label="Create new work">
            {createWorkItems.map((item) => (
              <CreateWorkCard key={item.title} item={item} />
            ))}
          </ul>
        </DashboardSectionCard>

        <DashboardSectionCard
          badge={{ label: `${alerts.length} signals`, variant: 'info' }}
          description="Runtime signals stay tied to actions, validation, output state, and supporting workspace areas."
          icon={MdOutlineInsights}
          modifier="signals"
          panelLabel="Runtime alerts and navigation"
          status={{ label: 'Current', variant: 'success' }}
          title="Alerts & Recommendations"
        >
          <div className="dashboard__signals-grid">
            <ul className="dashboard__alert-list" aria-label="Runtime alerts">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <li key={alert.id} className="dashboard__alert-item">
                    <Status variant={alert.variant} size="sm" showIcon>
                      {alert.label}
                    </Status>
                    <p>{alert.description}</p>
                  </li>
                ))
              ) : (
                <li className="dashboard__empty-item">
                  <Status variant="success" size="sm" showIcon>
                    No runtime signals
                  </Status>
                  <p>Validation, output, and review signals will appear here when runtime work exists.</p>
                </li>
              )}
            </ul>
            <nav className="dashboard__secondary-nav" aria-label="Customer workspace secondary navigation">
              <ul className="dashboard__launch-grid dashboard__launch-grid--secondary">
                {secondaryNavigationItems.map((item) => (
                  <SecondaryNavigationLink key={item.title} item={item} />
                ))}
              </ul>
            </nav>
          </div>
        </DashboardSectionCard>
      </div>
    </section>
  )
}

export default Dashboard
