/**
 * Dashboard Page
 *
 * Customer runtime operating surface with tenant, role, and work context.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  MdAddCircleOutline,
  MdBusiness,
  MdChevronRight,
  MdFilterList,
  MdOutlineEventNote,
  MdOutlineDashboardCustomize,
  MdOutlineDescription,
  MdOutlineDomain,
  MdOutlineInsights,
  MdOutlinePeopleAlt,
  MdOutlinePlayCircle,
  MdOutlineTaskAlt,
  MdOutlineWarningAmber,
} from 'react-icons/md'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { CustomerSelector } from '../../components/CustomerSelector'
import { CustomSelect } from '../../components/CustomSelect'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Link } from '../../components/Link'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { TableDateTime } from '../../components/TableDateTime'
import { TenantSwitcher } from '../../components/TenantSwitcher'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useGetCustomerQuery } from '../../store/api/customerApi.js'
import { useListRuntimeInstancesQuery } from '../../store/api/runtimeInstanceApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  formatRuntimeTokenLabel,
  getRuntimeExecutionState,
  getRuntimeInstanceDisplayId,
  getRuntimeInstanceRouteId,
  getRuntimeLifecycleStatus,
  getRuntimeReadinessLabel,
  getRuntimeReadinessVariant,
  getRuntimeStatusVariant,
  getRuntimeWorkspaceRoute,
} from '../../utils/runtimeWorkspace.js'
import { getSingleTenantDisplayName, getTenantId } from '../MaintainTenants/tenantUtils.js'
import './Dashboard.css'

const WORK_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Work' },
  { value: 'VALUE_NARRATIVE', label: 'Value Narratives' },
]

const ACTIVE_WORK_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Work Types' },
  { value: 'VALUE_NARRATIVE', label: 'Value Narratives' },
]

const ACTIVE_WORK_STATE_OPTIONS = [
  { value: 'ALL', label: 'All States' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'LOCKED', label: 'Locked' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
]

const ACTIVE_WORK_HEALTH_OPTIONS = [
  { value: 'ALL', label: 'All Health' },
  { value: 'GOOD', label: 'Good' },
  { value: 'NEEDS_REVIEW', label: 'Needs Review' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'UNKNOWN', label: 'Unknown' },
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

const getRuntimeHealthFilterKey = (readiness) => {
  const variant = getRuntimeReadinessVariant(readiness)
  if (variant === 'success') return 'GOOD'
  if (variant === 'warning') return 'NEEDS_REVIEW'
  if (variant === 'error') return 'BLOCKED'
  return 'UNKNOWN'
}

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

const getVmfId = (vmf) => String(vmf?.id ?? vmf?._id ?? vmf?.runtimeInstanceKey ?? '').trim()

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
    vmf?.packageKey,
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
    vmf?.packageVersion,
    vmf?.frameworkVersion,
  ]

  for (const candidate of candidates) {
    const trimmed = String(candidate ?? '').trim()
    if (trimmed) return trimmed
  }

  return '--'
}

const normalizeDashboardToken = (value) =>
  String(value ?? '').trim().toUpperCase()

const getFrameworkState = (runtimeRecord) =>
  runtimeRecord?.framework_state ?? runtimeRecord?.frameworkState ?? {}

const getRuntimeFrameworkLifecycleStage = (runtimeRecord, fallback = 'DRAFT') => {
  const frameworkState = getFrameworkState(runtimeRecord)
  const lifecycle = frameworkState?.lifecycle ?? {}
  const candidates = [
    typeof lifecycle === 'string' ? lifecycle : lifecycle?.stage,
    lifecycle?.status,
    runtimeRecord?.frameworkLifecycleStage,
    runtimeRecord?.frameworkLifecycleStatus,
    runtimeRecord?.lifecycleStatus,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeDashboardToken(candidate)
    if (normalized) return normalized
  }

  return fallback
}

const getRuntimeValidationState = (runtimeRecord) => {
  const frameworkState = getFrameworkState(runtimeRecord)
  const validation = frameworkState?.validation ?? {}
  const readiness = frameworkState?.readiness ?? {}

  return normalizeDashboardToken(
    runtimeRecord?.validationStatus
      ?? runtimeRecord?.runtimeValidationStatus
      ?? readiness?.validationState
      ?? validation?.state
      ?? validation?.status
      ?? validation?.result,
  )
}

const getRuntimeReadinessState = (runtimeRecord) => {
  const frameworkState = getFrameworkState(runtimeRecord)
  const readiness = frameworkState?.readiness ?? {}
  const explicitState = normalizeDashboardToken(
    runtimeRecord?.readinessState
      ?? runtimeRecord?.runtimeReadinessState
      ?? readiness?.state,
  )

  if (explicitState) return explicitState

  const lifecycleStage = getRuntimeFrameworkLifecycleStage(runtimeRecord, '')
  if (['LOCKED', 'PUBLISHED', 'APPROVED', 'IN_REVIEW', 'READY'].includes(lifecycleStage)) {
    return lifecycleStage
  }

  const validationState = getRuntimeValidationState(runtimeRecord)
  if (['PASSED', 'VALIDATED'].includes(validationState)) return 'VALIDATED'
  if (['FAILED', 'ERROR', 'BLOCKED'].includes(validationState)) return 'BLOCKED'

  return 'DRAFT'
}

const getRuntimeReviewBadge = (runtimeRecord) => {
  const frameworkState = getFrameworkState(runtimeRecord)
  const readiness = frameworkState?.readiness ?? {}
  const readinessState = getRuntimeReadinessState(runtimeRecord)
  const validationState = getRuntimeValidationState(runtimeRecord)
  const lifecycleStage = getRuntimeFrameworkLifecycleStage(runtimeRecord, '')
  const executionState = getRuntimeExecutionState(runtimeRecord)

  if (
    readiness?.submittedForReview === true
    || readinessState === 'IN_REVIEW'
    || lifecycleStage === 'IN_REVIEW'
    || executionState === 'WAITING_APPROVAL'
  ) {
    return { label: 'Needs Review', variant: 'info' }
  }

  if (
    ['BLOCKED', 'FAILED', 'ERROR'].includes(readinessState)
    || ['BLOCKED', 'FAILED', 'ERROR'].includes(validationState)
    || ['BLOCKED', 'FAILED', 'ERROR'].includes(executionState)
  ) {
    return { label: 'Needs Review', variant: 'warning' }
  }

  if (['READY', 'VALIDATED', 'APPROVED', 'PUBLISHED', 'LOCKED'].includes(readinessState)) {
    return {
      label: formatRuntimeTokenLabel(readinessState),
      variant: getRuntimeStatusVariant(readinessState, getRuntimeReadinessVariant(getRuntimeReadinessLabel(runtimeRecord))),
    }
  }

  return null
}

const formatRuntimeActionUpdatedLabel = (value) => {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return 'Updated recently'

  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return 'Updated recently'

  const dateLabel = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const timeLabel = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return `Updated ${dateLabel} ${timeLabel}`
}

function DashboardHeroMetric({ label, value, children, control = false, icon = null }) {
  const metricClassName = [
    'dashboard__hero-metric',
    control ? 'dashboard__hero-metric--control' : '',
  ].filter(Boolean).join(' ')
  const Icon = icon

  return (
    <div className={metricClassName}>
      {Icon ? (
        <span className="dashboard__hero-metric-icon" aria-hidden="true">
          <Icon />
        </span>
      ) : null}
      <div className="dashboard__hero-metric-copy">
        <dt>{label}</dt>
        <dd>{children ?? value}</dd>
      </div>
    </div>
  )
}

function DashboardSectionCard({
  actions,
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
          <div className="dashboard__section-copy">
            <h2 className="dashboard__section-title">{title}</h2>
            <p className="dashboard__section-description">{description}</p>
          </div>
          {actions ? (
            <div className="dashboard__section-actions">
              {actions}
            </div>
          ) : (
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
          )}
        </div>
        <PanelElement className="dashboard__section-panel" {...panelProps}>
          {children}
        </PanelElement>
      </Card.Body>
    </Card>
  )
}

function RuntimeActionCard({ action, primary = false }) {
  const Icon = action.icon
  const displayTitle = String(action.title ?? '').replace(/^Continue\s+/i, '')
  const linkLabel = [action.title, action.label].filter(Boolean).join(' ')
  const commandLabel = primary ? 'Continue' : action.label
  const cardClassName = [
    'dashboard__launch-item',
    'dashboard__launch-item--action',
    primary ? 'dashboard__launch-item--primary-action' : '',
    'dashboard__continue-item',
    action.priority === 'HIGH' ? 'dashboard__action-card--priority' : '',
    action.disabled ? 'dashboard__action-card--disabled' : '',
  ].filter(Boolean).join(' ')

  if (primary) {
    return (
      <li className={cardClassName}>
        <Link
          to={action.to}
          disabled={action.disabled}
          className="dashboard__continue-card dashboard__continue-card--primary dashboard__continue-card--link"
          variant="subtle"
          underline="none"
          aria-label={linkLabel}
        >
          <span className="dashboard__continue-icon" aria-hidden="true">
            <Icon />
          </span>
          <div className="dashboard__continue-copy">
            <h3 className="dashboard__continue-title">{displayTitle}</h3>
            {Array.isArray(action.badges) && action.badges.length > 0 ? (
              <div className="dashboard__continue-status" aria-label="Runtime state">
                {action.badges.map((badge) => (
                  <Badge
                    key={`${badge.label}-${badge.variant}`}
                    variant={badge.variant}
                    size="sm"
                    pill
                    outline
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
            ) : null}
            <p>{action.meta}</p>
            {action.description ? (
              <p>{action.description}</p>
            ) : null}
          </div>
          <span className="dashboard__continue-actions">
            <span className="dashboard__continue-cta">{commandLabel}</span>
            <MdChevronRight className="dashboard__continue-arrow" aria-hidden="true" />
          </span>
        </Link>
      </li>
    )
  }

  return (
    <li className={cardClassName}>
      <Link
        to={action.to}
        disabled={action.disabled}
        className="dashboard__continue-card dashboard__continue-card--link"
        variant="subtle"
        underline="none"
        aria-label={linkLabel}
      >
        <span className="dashboard__continue-icon" aria-hidden="true">
          <Icon />
        </span>
        <div className="dashboard__continue-copy">
          <h3 className="dashboard__continue-title">{displayTitle}</h3>
          {Array.isArray(action.badges) && action.badges.length > 0 ? (
            <div className="dashboard__continue-status" aria-label="Runtime state">
              {action.badges.map((badge) => (
                <Badge
                  key={`${badge.label}-${badge.variant}`}
                  variant={badge.variant}
                  size="sm"
                  pill
                  outline
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
          ) : null}
          <p>{action.meta}</p>
          {action.description ? (
            <p>{action.description}</p>
          ) : null}
          {action.disabled ? (
            <span className="dashboard__continue-command">{commandLabel}</span>
          ) : null}
        </div>
        <MdChevronRight className="dashboard__continue-arrow" aria-hidden="true" />
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
        className="dashboard__launch-link dashboard__launch-link--secondary"
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
          <span className="dashboard__launch-meta">{item.meta}</span>
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

function DashboardEmptyCard({ description, icon, spacious = false, title, variant = 'neutral' }) {
  const Icon = icon

  return (
    <li
      className={[
        'dashboard__empty-item',
        'dashboard__empty-item--composed',
        spacious ? 'dashboard__empty-item--spacious' : '',
        `dashboard__empty-item--${variant}`,
      ].filter(Boolean).join(' ')}
    >
      <span className="dashboard__empty-icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="dashboard__empty-copy">
        <span className="dashboard__empty-title">{title}</span>
        <span className="dashboard__empty-description">{description}</span>
      </span>
    </li>
  )
}

function Dashboard() {
  const [workTypeFilter, setWorkTypeFilter] = useState('ALL')
  const [activeWorkStateFilter, setActiveWorkStateFilter] = useState('ALL')
  const [activeWorkHealthFilter, setActiveWorkHealthFilter] = useState('ALL')
  const [activeWorkSearch, setActiveWorkSearch] = useState('')
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

  const featureEntitlements = useMemo(
    () =>
      customerId && typeof getFeatureEntitlements === 'function'
        ? normalizeFeatureKeys(getFeatureEntitlements(customerId))
        : [],
    [customerId, getFeatureEntitlements],
  )

  const hasVmfFeature = featureEntitlements.includes('VMF')

  const contextReady = Boolean(customerId && (!supportsTenantManagement || tenantId))
  const debouncedActiveWorkSearch = useDebounce(activeWorkSearch, 350)
  const activeWorkSearchQuery = debouncedActiveWorkSearch.trim()
  const activeWorkStatusQuery = activeWorkStateFilter === 'ALL' ? '' : activeWorkStateFilter

  const {
    data: runtimeInstanceListResponse,
    isLoading: isLoadingRuntimeInstances,
    isFetching: isFetchingRuntimeInstances,
    error: runtimeInstanceError,
  } = useListRuntimeInstancesQuery(
    {
      customerId,
      tenantId,
      runtimeType: 'VALUE_NARRATIVE',
      q: activeWorkSearchQuery,
      status: activeWorkStatusQuery,
      page: 1,
      pageSize: 25,
    },
    { skip: !contextReady || !canOpenVmfWorkspace || !hasVmfFeature },
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

  const canCreateVmfRuntime = useMemo(() => {
    if (!customerId) return false
    if (typeof hasCustomerPermission === 'function' && hasCustomerPermission(customerId, 'VMF_CREATE')) return true
    if (tenantId && typeof hasTenantPermission === 'function') {
      return hasTenantPermission(customerId, tenantId, 'VMF_CREATE')
    }
    return false
  }, [customerId, hasCustomerPermission, hasTenantPermission, tenantId])
  const canCreateValueNarrative = Boolean(contextReady && hasVmfFeature && canCreateVmfRuntime)
  const runtimeInstanceAppError = runtimeInstanceError ? normalizeError(runtimeInstanceError) : null
  const runtimeInstanceRows = !runtimeInstanceAppError && Array.isArray(runtimeInstanceListResponse?.data)
    ? runtimeInstanceListResponse.data
    : EMPTY_RUNTIME_ROWS
  const isLoadingRuntimeVmfs = Boolean(isLoadingRuntimeInstances || isFetchingRuntimeInstances)

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

    if (runtimeInstanceAppError) {
      return [
        {
          actionKey: 'RUNTIME_INSTANCE_LOAD_FAILED',
          description: runtimeInstanceAppError.message,
          disabled: true,
          icon: MdOutlineWarningAmber,
          label: 'Unavailable',
          meta: `${tenantScopeValue} / Runtime instances unavailable`,
          priority: 'HIGH',
          runtimeInstanceId: 'load-failed',
          title: 'Runtime work unavailable',
          to: '/app/dashboard',
        },
      ]
    }

    return runtimeInstanceRows.map((runtimeInstance) => {
      const runtimeName = getVmfName(runtimeInstance)
      const packageVersion = getFrameworkPackageVersion(runtimeInstance)
      const runtimeTypeLabel = formatRuntimeTokenLabel(runtimeInstance?.runtimeType ?? 'VALUE_NARRATIVE')
      const runtimeStatus = getRuntimeLifecycleStatus(runtimeInstance)
      const frameworkLifecycle = getRuntimeFrameworkLifecycleStage(runtimeInstance)
      const reviewBadge = getRuntimeReviewBadge(runtimeInstance)
      const runtimeInstanceId = getRuntimeInstanceRouteId(runtimeInstance) || runtimeName
      const runtimeWorkspaceTo = getRuntimeWorkspaceRoute(runtimeInstanceId)
      const packageSummary = [
        runtimeTypeLabel,
        packageVersion && packageVersion !== '--' ? packageVersion : '',
      ].filter(Boolean).join(' ')

      return {
        actionKey: 'OPEN_RUNTIME_INSTANCE',
        badges: [
          {
            label: formatRuntimeTokenLabel(runtimeStatus),
            variant: getRuntimeStatusVariant(runtimeStatus),
          },
          {
            label: formatRuntimeTokenLabel(frameworkLifecycle),
            variant: getRuntimeStatusVariant(frameworkLifecycle),
          },
          reviewBadge,
        ].filter(Boolean),
        disabled: !canOpenVmfWorkspace,
        icon: MdOutlineDescription,
        label: canOpenVmfWorkspace ? 'Open workspace' : 'Unavailable',
        meta: `${packageSummary} - ${formatRuntimeActionUpdatedLabel(runtimeInstance?.updatedAt)}`,
        priority: 'MEDIUM',
        runtimeInstanceId,
        title: `Continue ${runtimeName}`,
        to: canOpenVmfWorkspace ? runtimeWorkspaceTo : '/app/dashboard',
      }
    })
  }, [
    canOpenVmfWorkspace,
    customerId,
    customerScopeValue,
    runtimeInstanceAppError,
    runtimeInstanceRows,
    supportsTenantManagement,
    tenantId,
    tenantScopeValue,
  ])

  const runtimeInstances = useMemo(() => {
    if (!contextReady) return []
    return runtimeInstanceRows.map((runtimeInstance) => {
      const runtimeName = getVmfName(runtimeInstance)
      const packageLabel = getFrameworkPackageLabel(runtimeInstance)
      const packageVersion = getFrameworkPackageVersion(runtimeInstance)
      const workType = String(runtimeInstance?.runtimeType ?? 'VALUE_NARRATIVE').trim() || 'VALUE_NARRATIVE'
      const runtimeStatus = getRuntimeLifecycleStatus(runtimeInstance)
      const executionState = getRuntimeExecutionState(runtimeInstance)
      const lifecycle = getRuntimeFrameworkLifecycleStage(runtimeInstance)
      const readiness = getRuntimeReadinessLabel(runtimeInstance)
      const runtimeInstanceId = getRuntimeInstanceRouteId(runtimeInstance) || runtimeName

      return {
        id: runtimeInstanceId,
        runtimeDisplayId: getRuntimeInstanceDisplayId(runtimeInstance, workType),
        work: runtimeName,
        workType,
        workTypeLabel: formatRuntimeTokenLabel(workType),
        tenant: tenantScopeValue,
        packageSummary: `Package: ${packageLabel}`,
        status: runtimeStatus,
        executionState,
        lifecycle,
        readiness,
        healthFilterKey: getRuntimeHealthFilterKey(readiness),
        updatedAt: runtimeInstance?.updatedAt,
        nextAction: `Open ${packageVersion}`,
        to: getRuntimeWorkspaceRoute(runtimeInstanceId),
      }
    })
  }, [contextReady, runtimeInstanceRows, tenantScopeValue])

  const filteredRuntimeInstances = useMemo(() => {
    return runtimeInstances.filter((instance) => {
      const matchesWorkType = workTypeFilter === 'ALL' || instance.workType === workTypeFilter
      const matchesHealth = activeWorkHealthFilter === 'ALL' || instance.healthFilterKey === activeWorkHealthFilter
      return matchesWorkType && matchesHealth
    })
  }, [activeWorkHealthFilter, runtimeInstances, workTypeFilter])

  const createWorkItems = useMemo(() => [
    {
      disabled: !canCreateValueNarrative,
      icon: MdOutlineDashboardCustomize,
      label: canCreateValueNarrative ? 'Available' : 'Locked',
      meta: canCreateValueNarrative
        ? 'Create a new Value Narrative from an active VMF package.'
        : 'VMF_CREATE permission and VMF entitlement required',
      title: 'Create Value Narrative',
      to: canCreateValueNarrative ? '/app/workspaces/vmf' : '/app/dashboard',
    },
  ], [canCreateValueNarrative])

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

  const secondaryNavigationItems = useMemo(() => {
    const items = [
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
    ]

    if (supportsTenantManagement && (hasSelectedCustomerAdminAccess || hasSelectedCustomerTenantAdminAccess)) {
      items.push({
        badge: { label: 'Admin', variant: 'info' },
        disabled: false,
        icon: MdOutlinePeopleAlt,
        meta: 'Tenant and user administration',
        title: 'Tenant Administration',
        to: '/app/administration/maintain-tenants',
      })
    }

    return items
  }, [
    canOpenVmfWorkspace,
    hasSelectedCustomerAdminAccess,
    hasSelectedCustomerTenantAdminAccess,
    supportsTenantManagement,
  ])

  const runtimeActionGridClassName = [
    'dashboard__launch-grid',
    'dashboard__launch-grid--actions',
    runtimeActions.length === 1 ? 'dashboard__launch-grid--single' : '',
  ].filter(Boolean).join(' ')
  const runtimeActionAvailableCount = runtimeActions.filter((action) => !action.disabled).length
  const hasActiveWorkFilters = Boolean(
    activeWorkSearchQuery
      || activeWorkStatusQuery
      || workTypeFilter !== 'ALL'
      || activeWorkHealthFilter !== 'ALL',
  )

  const runtimeInstanceEmptyMessage = !contextReady
    ? 'Select a tenant to show runtime work.'
    : runtimeInstanceAppError
      ? `Unable to load runtime instances. ${runtimeInstanceAppError.message}`
    : isLoadingRuntimeVmfs
      ? 'Loading runtime work...'
    : hasActiveWorkFilters
      ? 'No runtime instances match the selected filters.'
      : 'No runtime instances are available for this tenant yet.'
  const runtimeActionEmptyLabel = isLoadingRuntimeVmfs ? 'Loading runtime actions' : 'No runtime actions'
  const runtimeActionEmptyMessage = isLoadingRuntimeVmfs
    ? 'Checking for active VMF runtime work in this tenant.'
    : 'Runtime actions will appear here once runtime instances exist for this tenant.'
  const runtimeActivityItems = EMPTY_RUNTIME_ACTIVITY

  const tableColumns = useMemo(() => [
    {
      key: 'runtimeDisplayId',
      label: 'Instance',
      width: '20%',
      render: (value, row) => (
        <div className="dashboard__work-cell">
          <span className="dashboard__work-instance">
            <span className="dashboard__work-icon" aria-hidden="true">
              <MdOutlineDescription />
            </span>
            <span className="dashboard__work-copy">
              <span className="dashboard__work-heading">
                <span className="dashboard__work-title">{row.work}</span>
              </span>
              <span className="dashboard__work-id">{value}</span>
            </span>
          </span>
        </div>
      ),
    },
    {
      key: 'workTypeLabel',
      label: 'Work Type',
      width: '14%',
      render: (value) => (
        <Badge variant="neutral" size="sm" pill outline>{value}</Badge>
      ),
    },
    {
      key: 'packageSummary',
      label: 'Package',
      width: '18%',
      render: (value, row) => (
        <div className="dashboard__stacked-cell">
          <span>{value.replace(/^Package:\s*/, '')}</span>
          <span>{row.tenant}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'State',
      width: '11%',
      render: (value, row) => (
        <div className="dashboard__stacked-cell">
          <Status variant={getRuntimeStatusVariant(value)} size="sm" showIcon>
            {formatRuntimeTokenLabel(value)}
          </Status>
          <span>{formatRuntimeTokenLabel(row.executionState)}</span>
        </div>
      ),
    },
    {
      key: 'lifecycle',
      label: 'Lifecycle',
      width: '11%',
      render: (value) => (
        <Status variant={getRuntimeStatusVariant(value)} size="sm">
          {formatRuntimeTokenLabel(value)}
        </Status>
      ),
    },
    {
      key: 'readiness',
      label: 'Health',
      width: '14%',
      render: (value) => (
        <Status variant={getRuntimeReadinessVariant(value)} size="sm">
          {value}
        </Status>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      width: '10%',
      render: (value) => <TableDateTime value={value} fallback="No activity yet" />,
    },
    {
      key: 'nextAction',
      label: 'Next Action',
      width: '10%',
      render: (value, row) => (
        <div className="dashboard__next-cell">
          <Link to={row.to ?? '/app/workspaces/vmf'} variant="primary" underline="none">
            {value}
          </Link>
        </div>
      ),
    },
  ], [])

  const activeWorkToolbar = (
    <div className="dashboard__work-toolbar" role="group" aria-label="Active work filters">
      <Input
        id="dashboard-active-work-search"
        label="Search"
        className="dashboard__work-search"
        value={activeWorkSearch}
        onChange={(event) => setActiveWorkSearch(event.target.value)}
        placeholder="Search instances..."
        size="sm"
        fullWidth
      />
      <Select
        id="dashboard-active-work-state"
        label="State"
        size="sm"
        value={activeWorkStateFilter}
        onChange={(event) => setActiveWorkStateFilter(event.target.value)}
        options={ACTIVE_WORK_STATE_OPTIONS}
        className="dashboard__work-filter"
      />
      <Select
        id="dashboard-active-work-type"
        label="Work Type"
        size="sm"
        value={workTypeFilter}
        onChange={(event) => setWorkTypeFilter(event.target.value)}
        options={ACTIVE_WORK_TYPE_OPTIONS}
        className="dashboard__work-filter"
      />
      <Select
        id="dashboard-active-work-health"
        label="Health"
        size="sm"
        value={activeWorkHealthFilter}
        onChange={(event) => setActiveWorkHealthFilter(event.target.value)}
        options={ACTIVE_WORK_HEALTH_OPTIONS}
        className="dashboard__work-filter"
      />
    </div>
  )

  return (
    <section className="dashboard container" aria-label="Customer runtime home">
      <header className="dashboard__page-header">
        <h1 className="dashboard__hero-title">Customer Workspace</h1>
        <p className="dashboard__hero-description">
          Your operating hub for governed runtime work and customer value intelligence.
        </p>
      </header>

      <Card variant="default" className="dashboard__context-card">
        <Card.Body className="dashboard__context-body">
          <div className="dashboard__scope-feedback" role="status">
            {tenantScopeSummary}
          </div>

          <dl className="dashboard__hero-metrics" aria-label="Runtime context summary">
            <DashboardHeroMetric label="Customer" control={showCustomerSelector} icon={MdOutlineDomain}>
              {showCustomerSelector ? (
                <CustomerSelector className="dashboard__context-selector" />
              ) : (
                <span className="dashboard__context-value">{customerScopeValue}</span>
              )}
            </DashboardHeroMetric>
            <DashboardHeroMetric label="Tenant" control={showAccessibleTenantSwitcher} icon={MdBusiness}>
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
            <DashboardHeroMetric label="Role" icon={MdOutlinePeopleAlt}>
              <span className="dashboard__context-value">{primaryRole}</span>
            </DashboardHeroMetric>
            <DashboardHeroMetric label="Work Type" control icon={MdFilterList}>
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
          </dl>
        </Card.Body>
      </Card>

      <div className="dashboard__sections" role="list" aria-label="Customer runtime workspace groups">
        <DashboardSectionCard
          badge={{ label: `${runtimeActionAvailableCount} available`, variant: 'info' }}
          description="Action items resolve to runtime instances and governed action keys."
          icon={MdOutlinePlayCircle}
          modifier="actions"
          panelAs="nav"
          panelLabel="Runtime action queue panel"
          status={{ label: contextReady ? 'Context ready' : 'Tenant required', variant: contextReady ? 'success' : 'warning' }}
          title="Continue Work"
        >
          <ul className={runtimeActionGridClassName} aria-label="Runtime action queue">
            {runtimeActions.length > 0 ? (
              runtimeActions.map((action, index) => (
                <RuntimeActionCard
                  key={`${action.runtimeInstanceId ?? 'context'}-${action.actionKey}`}
                  action={action}
                  primary={index === 0 && !action.disabled}
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
          title="Active Work"
          actions={activeWorkToolbar}
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
          status={{ label: canCreateValueNarrative ? 'Available now' : 'Limited', variant: canCreateValueNarrative ? 'success' : 'warning' }}
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
          title="Signals & Recommendations"
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
                <DashboardEmptyCard
                  description="Validation, output, and review signals will appear here when runtime work exists."
                  icon={MdOutlineTaskAlt}
                  title="No runtime signals"
                  variant="success"
                />
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

        <DashboardSectionCard
          badge={{ label: `${runtimeActivityItems.length} events`, variant: 'neutral' }}
          description="Latest runtime events across your workspace."
          icon={MdOutlineInsights}
          modifier="activity"
          panelLabel="Recent runtime activity panel"
          status={{ label: 'No activity yet', variant: 'neutral' }}
          title="Recent Activity"
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
              <DashboardEmptyCard
                description="Activity will appear here when runtime instances emit execution, review, or validation events."
                icon={MdOutlineEventNote}
                spacious
                title="No runtime activity yet"
                variant="info"
              />
            )}
          </ul>
        </DashboardSectionCard>
      </div>
    </section>
  )
}

export default Dashboard
