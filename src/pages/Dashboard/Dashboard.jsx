/**
 * Dashboard Page
 *
 * Customer runtime operating surface with tenant, role, and work context.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  MdAddCircleOutline,
  MdAssignmentTurnedIn,
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
import { getTenantId } from '../MaintainTenants/tenantUtils.js'
import './Dashboard.css'

const WORK_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Work' },
  { value: 'VALUE_NARRATIVE', label: 'Value Narratives' },
  { value: 'DEAL_ANALYSIS', label: 'Deal Analysis' },
  { value: 'BUSINESS_CASE', label: 'Business Cases' },
  { value: 'ACCOUNT_PLAN', label: 'Account Plans' },
]

const ENABLE_RUNTIME_WORKSPACE_SCAFFOLD =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_RUNTIME_WORKSPACE_SCAFFOLD === 'true'

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

const formatTokenLabel = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

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
      return resolvedTenantName || 'Single-tenant customer'
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

  const contextReady = Boolean(customerId && (!supportsTenantManagement || tenantId))
  const hasVmfFeature = featureEntitlements.includes('VMF')
  const hasDealFeature =
    featureEntitlements.includes('DEALS')
    || featureEntitlements.includes('DEAL_ANALYSIS')
  const hasActiveVmfAnchor = Boolean(contextReady && hasVmfFeature && canOpenVmfWorkspace)
  const canCreateValueNarrative = hasActiveVmfAnchor
  const canCreateDealAnalysis = Boolean(
    hasActiveVmfAnchor && hasDealFeature && hasSelectedSalesExecutionRole,
  )

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

    if (!ENABLE_RUNTIME_WORKSPACE_SCAFFOLD) return []

    // SCAFFOLD DATA — context is ready but no Runtime Execution Engine API exists yet.
    // These items represent what the Runtime Action Queue API will return once the
    // Runtime Execution Engine (Phase 2) is integrated. Each action resolves to a
    // runtimeInstanceId and an actionKey that will be sent to the runtime action endpoint.
    //
    // Replace this entire block with a real RTK Query call when the endpoint exists.
    // Expected endpoint: GET /api/v1/runtime/actions?customerId=&tenantId=
    // Expected response shape: { data: RuntimeAction[] }
    // where RuntimeAction has: { runtimeInstanceId, actionKey, title, description, meta,
    //   label, priority, disabled, to }
    //
    // The priority field drives badge colour and sort order. 'HIGH' = warning badge,
    // any other value = neutral badge. The runtimeInstanceId links the action to the
    // matching row in the Work In Progress table.
    const tenantLabel = tenantScopeValue || 'Current tenant'
    const scaffoldActions = [
      {
        actionKey: 'CONTINUE',
        description: 'Resume the current draft and complete the next required VMF section.',
        disabled: !canOpenVmfWorkspace,
        icon: MdOutlinePlayCircle,
        label: canOpenVmfWorkspace ? 'Continue' : 'Unavailable',
        meta: `${tenantLabel} / Draft`,
        priority: 'HIGH',
        runtimeInstanceId: 'rt-acme-value-narrative',
        title: 'Continue Acme Value Narrative',
        to: '/app/workspaces/vmf',
      },
      {
        actionKey: 'RUN_VALIDATION',
        description: 'Resolve validation blockers before the business case can move forward.',
        disabled: !hasActiveVmfAnchor,
        icon: MdAssignmentTurnedIn,
        label: hasActiveVmfAnchor ? 'Review issues' : 'VMF anchor required',
        meta: `${tenantLabel} / 2 blocking issues`,
        priority: 'HIGH',
        runtimeInstanceId: 'rt-globex-business-case',
        title: 'Fix validation issues in Globex Business Case',
        to: '/app/workspaces/vmf',
      },
    ]

    if (hasSelectedSalesManagerRole) {
      // SCAFFOLD DATA — Sales Manager gets an additional review action for team-owned work.
      // This will be driven by the manager-scoped runtime visibility contract once the
      // Runtime Execution Engine supplies team instance data.
      scaffoldActions.push({
        actionKey: 'REVIEW',
        description: 'Review the deal analysis submitted by a reporting sales user.',
        disabled: !hasActiveVmfAnchor,
        icon: MdOutlinePeopleAlt,
        label: hasActiveVmfAnchor ? 'Review deal' : 'VMF anchor required',
        meta: `${tenantLabel} / Manager review`,
        priority: 'MEDIUM',
        runtimeInstanceId: 'rt-beta-deal-analysis',
        title: 'Review Beta Deal Analysis',
        to: '/app/workspaces/vmf',
      })
    }

    return scaffoldActions
  }, [
    canOpenVmfWorkspace,
    customerId,
    customerScopeValue,
    hasActiveVmfAnchor,
    hasSelectedSalesManagerRole,
    supportsTenantManagement,
    tenantId,
    tenantScopeValue,
  ])

  const runtimeInstances = useMemo(() => {
    if (!contextReady) return []
    if (!ENABLE_RUNTIME_WORKSPACE_SCAFFOLD) return []

    // SCAFFOLD DATA — these rows represent what the Work In Progress API will return
    // once the Runtime Execution Engine (Phase 2) is integrated. The data shape here
    // documents the expected runtime instance contract so the table and filter logic
    // can be tested end-to-end before the backend endpoint exists.
    //
    // Replace this entire block with a real RTK Query call when the endpoint exists.
    // Expected endpoint: GET /api/v1/runtime/instances?customerId=&tenantId=
    // Expected response shape: { data: RuntimeInstance[] }
    // where RuntimeInstance has: { id, work, workType, workTypeLabel, tenant, owner,
    //   stage, status, lastActivity, nextAction }
    //
    // The workType field must match one of the WORK_TYPE_OPTIONS values so the filter
    // works correctly. status drives the formatted label in the Progress column.
    const tenantLabel = tenantScopeValue || 'Current tenant'
    const rows = [
      {
        id: 'rt-acme-value-narrative',
        work: 'Acme Value Narrative',
        workType: 'VALUE_NARRATIVE',
        workTypeLabel: 'Value Narrative',
        tenant: tenantLabel,
        owner: 'You',
        stage: 'Draft',
        status: 'NEEDS_INPUT',
        lastActivity: 'Today',
        nextAction: 'Continue',
      },
      {
        id: 'rt-globex-business-case',
        work: 'Globex Business Case',
        workType: 'BUSINESS_CASE',
        workTypeLabel: 'Business Case',
        tenant: tenantLabel,
        // SCAFFOLD DATA — manager sees team member's name; Sales User sees 'You'.
        // This distinction will be driven by the manager-scoped visibility contract.
        owner: hasSelectedSalesManagerRole ? 'Jordan Lee' : 'You',
        stage: 'Validation',
        status: 'BLOCKED',
        lastActivity: 'Yesterday',
        nextAction: 'Fix issues',
      },
    ]

    if (hasSelectedSalesExecutionRole || hasSelectedSalesManagerRole) {
      // SCAFFOLD DATA — Deal Analysis row is only visible to Sales and Manager roles.
      // The real endpoint will apply this filtering server-side based on the role
      // scope contract. The owner and stage differ by role to reflect the manager
      // review vs. user draft distinction.
      rows.push({
        id: 'rt-beta-deal-analysis',
        work: 'Beta Deal Analysis',
        workType: 'DEAL_ANALYSIS',
        workTypeLabel: 'Deal Analysis',
        tenant: tenantLabel,
        owner: hasSelectedSalesManagerRole ? 'Amelia Hart' : 'You',
        stage: hasSelectedSalesManagerRole ? 'Review' : 'Draft',
        status: hasSelectedSalesManagerRole ? 'REVIEW_READY' : 'DRAFT',
        lastActivity: hasSelectedSalesManagerRole ? '2h ago' : 'Today',
        nextAction: hasSelectedSalesManagerRole ? 'Review' : 'Continue',
      })
    }

    return rows
  }, [contextReady, hasSelectedSalesExecutionRole, hasSelectedSalesManagerRole, tenantScopeValue])

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

    if (!ENABLE_RUNTIME_WORKSPACE_SCAFFOLD) return []

    // SCAFFOLD DATA — these signals represent what the Runtime Observability Layer
    // (Phase 2+) will surface once validation events, output state, and review-ready
    // state are tracked in the backend. Until then these fixed items demonstrate the
    // alert card shape and role-based visibility logic to QA testers.
    //
    // Replace this entire block with a real RTK Query call when the endpoint exists.
    // Expected endpoint: GET /api/v1/runtime/signals?customerId=&tenantId=
    // Expected response shape: { data: RuntimeSignal[] }
    // where RuntimeSignal has: { id, label, description, variant }
    //
    // variant maps to the Status component variants: 'success', 'warning', 'info', 'error'.
    const scaffoldAlerts = [
      {
        id: 'validation-blocked',
        label: '2 runtime validations need attention',
        description: 'Validation blockers are preventing one business case from moving forward.',
        variant: 'warning',
      },
      {
        id: 'outputs-stale',
        label: '2 outputs require regeneration',
        description: 'Generated outputs will need refresh after the related runtime work changes.',
        variant: 'info',
      },
    ]

    if (hasSelectedSalesManagerRole) {
      // SCAFFOLD DATA — manager-scoped signal surfaces when a team member's work
      // reaches REVIEW_READY state. The real signal will be emitted by the runtime
      // governance event system when the review-ready transition fires.
      scaffoldAlerts.unshift({
        id: 'manager-review',
        label: '1 team deal analysis is ready for review',
        description: 'Review is scoped to reporting users in the selected tenant.',
        variant: 'success',
      })
    }

    return scaffoldAlerts
  }, [contextReady, hasSelectedSalesManagerRole])

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
    : workTypeFilter === 'ALL'
      ? 'No runtime instances are available for this tenant yet.'
      : 'No runtime instances match the selected work type.'

  const tableColumns = useMemo(() => [
    {
      key: 'work',
      label: 'Work',
      render: (value, row) => (
        <div className="dashboard__work-cell">
          <span className="dashboard__work-heading">
            <span className="dashboard__work-title">{value}</span>
            <Badge variant="neutral" size="sm" pill outline>{row.workTypeLabel}</Badge>
          </span>
          <span className="dashboard__work-id">{row.id}</span>
        </div>
      ),
    },
    {
      key: 'tenant',
      label: 'Scope',
      render: (value, row) => (
        <div className="dashboard__stacked-cell">
          <span>{value}</span>
          <span>{row.owner}</span>
        </div>
      ),
    },
    {
      key: 'stage',
      label: 'Progress',
      render: (value, row) => (
        <div className="dashboard__stacked-cell">
          <span>{value}</span>
          <span>{formatTokenLabel(row.status)}</span>
        </div>
      ),
    },
    {
      key: 'lastActivity',
      label: 'Next',
      render: (value, row) => (
        <div className="dashboard__next-cell">
          <span>{value}</span>
          <Link to="/app/workspaces/vmf" variant="primary" underline="none">
            {row.nextAction}
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
                <TenantSwitcher className="dashboard__context-selector" />
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
                  No runtime actions
                </Status>
                <p>Runtime actions will appear here once runtime instances exist for this tenant.</p>
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
          status={{ label: workTypeFilter === 'ALL' ? 'All work' : formatTokenLabel(workTypeFilter), variant: 'info' }}
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
