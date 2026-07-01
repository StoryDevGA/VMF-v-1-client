/**
 * VMF Workspace Page
 *
 * Customer-scoped VMF catalogue management for the selected tenant.
 * Aligns create/update/delete flows with lifecycle/versioning contracts.
 */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MdAdd,
  MdChevronRight,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdOutlineDescription,
  MdLockOutline,
  MdOutlineWarningAmber,
  MdShield,
} from 'react-icons/md'
import { useLocation, useNavigate } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Link } from '../../components/Link'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { DEFAULT_TABLE_PAGE_SIZE, Table } from '../../components/Table'
import { TableDateTime } from '../../components/TableDateTime'
import { Textarea } from '../../components/Textarea'
import { useToaster } from '../../components/Toaster'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useGetCustomerQuery } from '../../store/api/customerApi.js'
import {
  useDeleteVmfMutation,
  useListVmfFrameworkPackagesQuery,
  useListVmfsQuery,
  useUpdateVmfMutation,
} from '../../store/api/vmfApi.js'
import {
  useCreateRuntimeInstanceMutation,
  useListRuntimeInstancesQuery,
} from '../../store/api/runtimeInstanceApi.js'
import {
  getCustomerInactiveMessage,
  getGovernanceLimitConflictMessage,
  getLicenseFeatureNotEnabledMessage,
  isCustomerInactiveError,
  isGovernanceLimitConflictError,
  isLicenseFeatureNotEnabledError,
  normalizeError,
} from '../../utils/errors.js'
import {
  formatRuntimeTokenLabel,
  getExecutionStateVariant,
  getRuntimeExecutionState,
  getRuntimeInstanceDisplayId,
  getRuntimeLifecycleStatus,
  getRuntimeReadinessLabel,
  getRuntimeReadinessVariant,
  getRuntimeStatusVariant,
  getRuntimeWorkspaceRoute,
} from '../../utils/runtimeWorkspace.js'
import { getSingleTenantDisplayName, getTenantId } from '../MaintainTenants/tenantUtils.js'
import './MaintainVmfs.css'

const VMF_STATUS_OPTIONS = [
  { value: '', label: 'All States' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const RUNTIME_INSTANCE_STATUS_FILTER_VALUES = new Set([
  'DRAFT',
  'ACTIVE',
  'LOCKED',
  'COMPLETED',
  'ARCHIVED',
  'FAILED',
])

const VMF_LIFECYCLE_OPTIONS = [
  { value: '', label: 'All Lifecycles' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CANONISED', label: 'Canonised' },
  { value: 'PUBLISHED', label: 'Published' },
]

const VMF_MUTATION_STATUS_OPTIONS = VMF_STATUS_OPTIONS.slice(1)
const VMF_MUTATION_LIFECYCLE_OPTIONS = VMF_LIFECYCLE_OPTIONS.slice(1)

const VMF_LIFECYCLE_TRANSITIONS = {
  DRAFT: ['DRAFT', 'CANONISED'],
  CANONISED: ['CANONISED', 'PUBLISHED'],
  PUBLISHED: ['PUBLISHED'],
}

const VMF_UNAUTHORIZED_MESSAGE =
  'You do not have permission to manage VMFs for this tenant.'

const VMF_INACTIVE_CUSTOMER_MESSAGE =
  'This customer is inactive. VMF management is unavailable until the customer is reactivated.'

const VMF_LICENCE_MESSAGE =
  'This customer licence does not include VMF. Contact your Super Admin to update entitlements.'

const VMF_LIFECYCLE_NOTE =
  'Runtime objects are shown alongside transitional VMF bridge records. Open row details for runtime state and package lineage fields; use Actions for bridge-record details, edits, or soft-delete where permitted. Active VMFs must be disabled before deletion.'

const VMF_READ_ONLY_NOTE =
  "This workspace is read-only for your current access level. Open row details for package lineage and use Actions to view details; standard users and linked tenant members can review published VMF bridge records and published runtime lifecycle rows only, while customer administrators and the selected tenant's assigned tenant admin can create, edit, or delete VMFs."

const VMF_REGISTER_GUIDE_ITEMS = [
  ['Scope', 'Runtime objects + bridge records'],
  ['Details', 'State + package lineage'],
  ['Actions', 'Lifecycle-gated bridge edits'],
]

const VMF_READ_ONLY_REGISTER_GUIDE_ITEMS = [
  ['Scope', 'Published VMF bridge records'],
  ['Details', 'Package lineage + runtime state'],
  ['Access', 'Review only'],
]

const READ_ONLY_VMF_LIFECYCLE = 'PUBLISHED'

const VMF_RUNTIME_PACKAGE_UNAVAILABLE_HELPER =
  'No eligible VMF version is assigned or published for this customer.'

const VMF_RUNTIME_PACKAGE_UNAVAILABLE_MESSAGE =
  'The capacity badge shows tenant Value Narrative runtime slots. Creation also requires a VMF version that is both available to this customer and runtime-ready. Ask a Super Admin to assign or publish a version with active deployment evidence, or complete the version evidence chain: certified dependency lock, active activation, active deployment, and matching snapshot/hash evidence.'

const getLifecycleVariant = (value) => {
  if (value === 'PUBLISHED') return 'success'
  if (value === 'CANONISED') return 'info'
  return 'neutral'
}

const getOperationalStatusVariant = (status) => {
  if (status === 'ACTIVE') return 'success'
  if (status === 'DISABLED') return 'warning'
  return 'neutral'
}

const getRuntimeStateVariant = (value, fallback = 'neutral') => {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (!normalized) return fallback

  if (['COMPLETE', 'COMPLETED', 'READY', 'VALIDATED', 'BOUND', 'PACKAGE_BOUND'].includes(normalized)) {
    return 'success'
  }

  if (['IN_PROGRESS', 'PROCESSING', 'PENDING', 'NOT_RUN', 'NOT_TRACKED', 'UNLOCKED', 'UNBOUND'].includes(normalized)) {
    return 'info'
  }

  if (['NOT_REQUIRED', 'PACKAGE_INFERRED_FROM_VERSION', 'LEGACY_POLICY_ONLY'].includes(normalized)) {
    return 'warning'
  }

  if (['FAILED', 'ERROR', 'LOCKED'].includes(normalized)) {
    return 'danger'
  }

  return fallback
}

const formatBooleanLabel = (value) => {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return '--'
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

const getFrameworkPackageDetail = (vmf, key) => {
  const frameworkPackage = vmf?.frameworkPackage
  if (!frameworkPackage || typeof frameworkPackage !== 'object') return ''
  return String(frameworkPackage?.[key] ?? '').trim()
}

const getFrameworkPackageId = (frameworkPackage) =>
  String(frameworkPackage?.id ?? frameworkPackage?._id ?? '').trim()

const getFrameworkPackageOptionLabel = (frameworkPackage) => {
  const label = getFrameworkPackageLabel({ frameworkPackage })
  const version = String(frameworkPackage?.version ?? '').trim()
  const versionLabel = version && !version.toLowerCase().startsWith('v') ? `v${version}` : version
  return versionLabel && label !== '--' ? `${label} / ${versionLabel}` : label
}

const getVmfId = (vmf) => String(vmf?.id ?? vmf?._id ?? '').trim()

const getRuntimeCapacityCountLabel = (countMode) => {
  const normalizedCountMode = String(countMode ?? '').trim().toUpperCase()
  if (normalizedCountMode === 'ACTIVE_RUNTIME_INSTANCES') return 'active Value Narrative'
  if (normalizedCountMode === 'NON_ARCHIVED') return 'non-archived'
  return 'active'
}

const parsePositiveInteger = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return null
  return parsed
}

const normalizeRuntimeCapacity = (rawCapacity, fallbackMaxVmfsPerTenant = null) => {
  const maxRuntimeInstances = parsePositiveInteger(
    rawCapacity?.maxRuntimeInstances
    ?? rawCapacity?.maxVmfs
    ?? rawCapacity?.maxVmfsPerTenant
    ?? rawCapacity?.limit
    ?? fallbackMaxVmfsPerTenant,
  )
  const currentCountValue = Number(rawCapacity?.currentCount)
  const remainingCountValue = Number(rawCapacity?.remainingCount)
  const currentCount = Number.isFinite(currentCountValue) ? currentCountValue : null
  const remainingCount = Number.isFinite(remainingCountValue)
    ? remainingCountValue
    : Number.isFinite(maxRuntimeInstances) && Number.isFinite(currentCount)
      ? Math.max(maxRuntimeInstances - currentCount, 0)
      : null

  return {
    maxRuntimeInstances,
    currentCount,
    remainingCount,
    isAtCapacity:
      rawCapacity?.isAtCapacity === true
      || (
        Number.isFinite(maxRuntimeInstances)
        && Number.isFinite(currentCount)
        && currentCount >= maxRuntimeInstances
      ),
    countMode: String(rawCapacity?.countMode ?? '').trim().toUpperCase() || 'ACTIVE',
  }
}

const getRuntimeCapacityGuidance = (
  runtimeCapacity,
  { isLoading = false, isUnavailable = false } = {},
) => {
  if (!runtimeCapacity && !isLoading && !isUnavailable) return null

  if (!runtimeCapacity && isLoading) {
    return {
      tone: 'info',
      ariaLabel: 'Checking Value Narrative capacity',
      displayValue: 'Checking...',
    }
  }

  if (!runtimeCapacity && isUnavailable) {
    return {
      tone: 'warning',
      ariaLabel: 'Value Narrative capacity unavailable',
      displayValue: 'Capacity unavailable',
    }
  }

  const currentCount = runtimeCapacity?.currentCount
  const remainingCount = runtimeCapacity?.remainingCount
  const maxRuntimeInstances = runtimeCapacity?.maxRuntimeInstances
  const countLabel = getRuntimeCapacityCountLabel(runtimeCapacity?.countMode)
  const displayCount = Number.isFinite(remainingCount) ? Math.max(remainingCount, 0) : null
  const capacityNoun = `${countLabel} runtime slot${maxRuntimeInstances === 1 ? '' : 's'}`
  const visibleValue = displayCount !== null && maxRuntimeInstances !== null
    ? `${displayCount} of ${maxRuntimeInstances} left`
    : null

  const buildGuidance = (tone, label) => ({
    tone,
    ariaLabel: `${label}: ${visibleValue} in ${capacityNoun}`.trim(),
    displayValue: visibleValue,
  })

  if (runtimeCapacity?.isAtCapacity && currentCount !== null && maxRuntimeInstances !== null) {
    return buildGuidance('warning', 'Value Narrative capacity reached')
  }

  if (remainingCount === 1 && currentCount !== null && maxRuntimeInstances !== null) {
    return buildGuidance('warning', 'Final Value Narrative slot')
  }

  if (currentCount !== null && remainingCount !== null && maxRuntimeInstances !== null) {
    return buildGuidance('info', 'Value Narrative capacity')
  }

  return null
}

const getRuntimeCapacityBlockMessage = ({
  isReached = false,
  isLoading = false,
  isRefreshing = false,
  isUnavailable = false,
} = {}) => {
  if (isReached) {
    return 'No Value Narrative runtime slots are available for this tenant.'
  }

  if (isUnavailable) {
    return 'Value Narrative capacity is unavailable. Creation is blocked until runtime capacity can be loaded.'
  }

  if (isLoading || isRefreshing) {
    return 'Value Narrative capacity is still being checked. Creation is blocked until capacity is confirmed.'
  }

  return ''
}

const getLifecycleOptionsForCurrentState = (value) => {
  const current = String(value ?? 'DRAFT').trim().toUpperCase()
  const allowed = VMF_LIFECYCLE_TRANSITIONS[current] ?? [current]

  return VMF_MUTATION_LIFECYCLE_OPTIONS.filter((option) => allowed.includes(option.value))
}

const getRuntimeEvidenceItems = (row) => {
  const completion = String(row?.completionState ?? '').trim().toUpperCase() || 'NOT_TRACKED'
  const validation = String(row?.validationStatus ?? '').trim().toUpperCase() || 'NOT_RUN'
  const lockStatus = String(row?.lockStatus ?? '').trim().toUpperCase() || 'UNLOCKED'
  const snapshotStatus = String(row?.snapshotStatus ?? '').trim().toUpperCase() || 'UNBOUND'
  const migration = formatBooleanLabel(row?.migrationAvailable)
  const executionState = getRuntimeExecutionState(row)
  const readiness = getRuntimeReadinessLabel(row)

  return [
    {
      label: 'Readiness',
      value: readiness,
      variant: getRuntimeReadinessVariant(readiness),
    },
    {
      label: 'Execution',
      value: formatRuntimeTokenLabel(executionState),
      variant: getExecutionStateVariant(executionState),
    },
    {
      label: 'Completion',
      value: completion,
      variant: getRuntimeStateVariant(completion),
    },
    {
      label: 'Validation',
      value: validation,
      variant: getRuntimeStateVariant(validation),
    },
    {
      label: 'Lock',
      value: lockStatus,
      variant: lockStatus === 'LOCKED' ? 'warning' : getRuntimeStateVariant(lockStatus),
    },
    {
      label: 'Snapshot',
      value: snapshotStatus,
      variant: getRuntimeStateVariant(snapshotStatus),
    },
    {
      label: 'Migration',
      value: migration,
      variant: row?.migrationAvailable === true ? 'success' : row?.migrationAvailable === false ? 'neutral' : 'info',
    },
  ]
}

const getPackageVersion = (row) =>
  String(
    row?.packageVersion
      ?? row?.frameworkVersion
      ?? getFrameworkPackageDetail(row, 'version')
      ?? getFrameworkPackageDetail(row, 'frameworkVersion')
      ?? '',
  ).trim() || '--'

const getFrameworkLabel = (row, fallback = 'Value Narrative') => {
  const candidates = [
    row?.frameworkName,
    row?.frameworkLabel,
    row?.frameworkKey,
    row?.runtimeType,
  ]

  for (const candidate of candidates) {
    const trimmed = String(candidate ?? '').trim()
    if (trimmed) return trimmed === 'VMF' ? 'Value Narrative' : formatRuntimeTokenLabel(trimmed)
  }

  return fallback
}

const getRuntimeFrameworkLifecycleStage = (row, fallback = 'DRAFT') => {
  const frameworkState = row?.framework_state ?? row?.frameworkState ?? {}
  const lifecycle = frameworkState?.lifecycle ?? {}
  const candidates = [
    typeof lifecycle === 'string' ? lifecycle : lifecycle?.stage,
    lifecycle?.status,
    row?.frameworkLifecycleStage,
    row?.frameworkLifecycleStatus,
    row?.lifecycleStatus,
  ]

  for (const candidate of candidates) {
    const normalized = String(candidate ?? '').trim().toUpperCase()
    if (normalized) return normalized
  }

  return fallback
}

const getUpdatedTimestamp = (row) => {
  const updatedAt = row?.updatedAt ?? row?.updated_at ?? row?.modifiedAt ?? row?.createdAt
  const parsed = Date.parse(String(updatedAt ?? ''))
  return Number.isNaN(parsed) ? 0 : parsed
}

const formatContinueUpdatedLabel = (value) => {
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

const buildSearchText = (values) =>
  values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const buildRuntimeInstanceRegisterRow = (row) => {
  const runtimeType = String(row?.runtimeType ?? 'VALUE_NARRATIVE').trim() || 'VALUE_NARRATIVE'
  const displayId = getRuntimeInstanceDisplayId(row, runtimeType)
  const status = getRuntimeLifecycleStatus(row)
  const frameworkLifecycle = getRuntimeFrameworkLifecycleStage(row)
  const executionState = getRuntimeExecutionState(row)
  const readiness = getRuntimeReadinessLabel(row)
  const packageLabel = getFrameworkPackageLabel(row)
  const packageVersion = getPackageVersion(row)
  const name = String(row?.name ?? '').trim() || 'Value Narrative'
  const description = String(row?.description ?? row?.summary ?? '').trim()
  const key = `runtime:${displayId || row?.id || row?._id || name}`

  return {
    key,
    source: 'runtime',
    sourceLabel: 'Runtime object',
    original: row,
    name,
    description,
    displayId,
    frameworkLabel: getFrameworkLabel(row),
    packageLabel,
    packageVersion,
    status,
    statusLabel: formatRuntimeTokenLabel(status),
    statusVariant: getRuntimeStatusVariant(status),
    lifecycle: frameworkLifecycle,
    lifecycleLabel: formatRuntimeTokenLabel(frameworkLifecycle),
    lifecycleVariant: getLifecycleVariant(frameworkLifecycle),
    executionState,
    executionLabel: formatRuntimeTokenLabel(executionState),
    executionVariant: getExecutionStateVariant(executionState),
    stageLabel: formatRuntimeTokenLabel(executionState),
    stageHelper: 'Execution state',
    stageVariant: getExecutionStateVariant(executionState),
    healthLabel: readiness,
    healthVariant: getRuntimeReadinessVariant(readiness),
    updatedAt: row?.updatedAt ?? row?.updated_at ?? row?.modifiedAt ?? row?.createdAt,
    updatedTime: getUpdatedTimestamp(row),
    route: getRuntimeWorkspaceRoute(row),
    evidenceItems: getRuntimeEvidenceItems(row),
    lineageItems: [
      ['Framework', getFrameworkLabel(row)],
      ['Package', packageLabel],
      ['Version', packageVersion],
      ['Framework Lifecycle', frameworkLifecycle],
      ['Work Type', formatRuntimeTokenLabel(runtimeType)],
      ['Runtime ID', displayId],
    ],
    searchText: buildSearchText([
      name,
      description,
      displayId,
      packageLabel,
      packageVersion,
      runtimeType,
      status,
      frameworkLifecycle,
      executionState,
    ]),
  }
}

const buildVmfRegisterRow = (row) => {
  const vmfId = getVmfId(row)
  const name = String(row?.name ?? '').trim() || '--'
  const description = String(row?.description ?? '').trim()
  const status = String(row?.status ?? '').trim().toUpperCase() || 'UNKNOWN'
  const lifecycle = String(row?.lifecycleStatus ?? '').trim().toUpperCase() || 'DRAFT'
  const readiness = getRuntimeReadinessLabel(row)
  const executionState = getRuntimeExecutionState(row)
  const packageLabel = getFrameworkPackageLabel(row)
  const packageVersion = getPackageVersion(row)
  const key = `vmf:${vmfId || name}`

  return {
    key,
    source: 'vmf',
    sourceLabel: 'VMF bridge',
    original: row,
    name,
    description,
    displayId: vmfId || '--',
    frameworkLabel: getFrameworkLabel(row),
    packageLabel,
    packageVersion,
    status,
    statusLabel: formatRuntimeTokenLabel(status),
    statusVariant: getOperationalStatusVariant(status),
    lifecycle,
    lifecycleLabel: lifecycle,
    lifecycleVariant: getLifecycleVariant(lifecycle),
    executionState,
    executionLabel: formatRuntimeTokenLabel(executionState),
    executionVariant: getExecutionStateVariant(executionState),
    stageLabel: readiness,
    stageHelper: `Validation ${String(row?.validationStatus ?? 'NOT_RUN').trim().toUpperCase() || 'NOT_RUN'}`,
    stageVariant: getRuntimeReadinessVariant(readiness),
    healthLabel: readiness,
    healthVariant: getRuntimeReadinessVariant(readiness),
    updatedAt: row?.updatedAt ?? row?.updated_at ?? row?.modifiedAt ?? row?.createdAt,
    updatedTime: getUpdatedTimestamp(row),
    evidenceItems: getRuntimeEvidenceItems(row),
    lineageItems: [
      ['Framework', getFrameworkLabel(row)],
      ['Package', packageLabel],
      ['Version', packageVersion],
      ['Lifecycle', lifecycle],
      ['Package Status', getFrameworkPackageDetail(row, 'status') || '--'],
      ['VMF ID', vmfId || '--'],
    ],
    searchText: buildSearchText([
      name,
      description,
      vmfId,
      packageLabel,
      packageVersion,
      status,
      lifecycle,
      readiness,
      executionState,
    ]),
  }
}

const formatSoftDeleteMessage = (payload) => {
  const retentionDays = Number(payload?.retentionDays)
  const purgeAfter = payload?.purgeAfter ? new Date(payload.purgeAfter) : null
  const purgeLabel =
    purgeAfter instanceof Date && !Number.isNaN(purgeAfter.valueOf())
      ? purgeAfter.toLocaleString()
      : ''

  if (Number.isFinite(retentionDays) && retentionDays > 0 && purgeLabel) {
    return `Soft-delete scheduled. Purge in ${retentionDays} day(s) on ${purgeLabel}.`
  }

  if (Number.isFinite(retentionDays) && retentionDays > 0) {
    return `Soft-delete scheduled. Purge in ${retentionDays} day(s).`
  }

  return String(payload?.message ?? 'VMF soft-delete was scheduled.')
}

function VmfRowActionsMenu({ row, actions, onAction }) {
  const rowName = row?.name || row?.id || 'vmf'

  const options = actions
    .filter((action) => {
      const isDisabled = typeof action.disabled === 'function'
        ? action.disabled(row)
        : Boolean(action.disabled)

      return !isDisabled
    })
    .map((action) => ({ value: action.label, label: action.label }))

  return (
    <div className="maintain-vmfs__row-actions">
      <Select
        size="sm"
        value=""
        placeholder={options.length > 0 ? 'Actions' : 'No actions'}
        options={options}
        disabled={options.length === 0}
        onChange={(event) => {
          const label = event.target.value
          if (label) onAction(label, row)
        }}
        aria-label={`Actions for ${rowName}`}
      />
    </div>
  )
}

const getEvidenceItem = (row, label) =>
  row?.evidenceItems?.find((item) => item.label === label) ?? null

const getEvidenceItemValue = (row, label) => getEvidenceItem(row, label)?.value ?? ''

const getBadgeSafeVariant = (variant, fallback = 'neutral') => {
  const normalized = String(variant ?? '').trim()
  if (normalized === 'error') return 'danger'
  return normalized || fallback
}

function ContinueWorkCard({
  row,
  primary = false,
  title,
  description,
  insight = '',
  summaryBadge = null,
  icon,
  tone = 'primary',
  onOpen,
}) {
  const className = [
    'maintain-vmfs__continue-card',
    primary ? 'maintain-vmfs__continue-card--primary' : '',
    !primary ? 'maintain-vmfs__continue-card--summary' : '',
    !primary ? 'maintain-vmfs__continue-card--secondary' : '',
    tone !== 'primary' ? `maintain-vmfs__continue-card--${tone}` : '',
  ].filter(Boolean).join(' ')
  const canOpen = Boolean(row?.route)
  const CardIcon = icon
  const primaryTitle = primary && row ? row.name : title
  const packageSummary = primary && row
    ? [row.packageLabel, row.packageVersion]
      .map((value) => String(value ?? '').trim())
      .filter((value) => value && value !== '--')
      .join(' ')
    : ''
  const updatedLabel = primary && row ? formatContinueUpdatedLabel(row.updatedAt) : ''

  return (
    <li className={className}>
      <div className="maintain-vmfs__continue-head">
        <span className="maintain-vmfs__continue-icon" aria-hidden="true">
          <CardIcon />
        </span>
        <div className="maintain-vmfs__continue-heading">
          <h3 className="maintain-vmfs__continue-title">{primaryTitle}</h3>
          {primary && row ? (
            <div className="maintain-vmfs__continue-status" aria-label="Runtime state">
              <Status
                size="sm"
                variant={row.statusVariant === 'danger' ? 'error' : row.statusVariant}
                showIcon
              >
                {row.statusLabel}
              </Status>
              <Badge size="sm" variant={row.lifecycleVariant} pill>
                {row.lifecycleLabel}
              </Badge>
              <Badge size="sm" variant={row.stageVariant} pill>
                {row.stageLabel}
              </Badge>
            </div>
          ) : null}
        </div>
      </div>
      <div className="maintain-vmfs__continue-copy">
        {primary && row ? (
          <>
            <p>{packageSummary ? `Bound to ${packageSummary}` : 'Bound framework unavailable'}</p>
            <p>{updatedLabel}</p>
          </>
        ) : (
          <>
            <p>{description}</p>
            {insight || summaryBadge?.label ? (
              <div className="maintain-vmfs__continue-insight">
                {insight ? (
                  <p className="maintain-vmfs__continue-detail">{insight}</p>
                ) : null}
                {summaryBadge?.label ? (
                  <Badge
                    size="sm"
                    variant={getBadgeSafeVariant(summaryBadge.variant)}
                    pill
                    className="maintain-vmfs__continue-pill"
                  >
                    {summaryBadge.label}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
      {primary ? (
        <span className="maintain-vmfs__continue-actions">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!canOpen}
            onClick={() => onOpen(row)}
          >
            Continue
          </Button>
          <MdChevronRight className="maintain-vmfs__continue-arrow" aria-hidden="true" />
        </span>
      ) : null}
    </li>
  )
}

function DetailPair({ label, children }) {
  return (
    <div className="maintain-vmfs__detail-pair">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function CompactBadgeText({ value, compact = false }) {
  const label = String(value ?? '').trim()
  const parts = label.split(/\s+/).filter(Boolean)

  if (!compact || parts.length < 2) return label

  return (
    <span className="maintain-vmfs__badge-lines">
      {parts.map((part, index) => (
        <span key={`${label}-${part}-${index}`}>
          {part}
          {index < parts.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}

function RegisterExpansionPanel({ row, onOpen, runtimeWorkspaceBackState }) {
  const runtimeRoute = String(row?.route ?? '').trim()

  return (
    <div className="maintain-vmfs__expansion" aria-label={`${row.name} expanded runtime details`}>
      <div className="maintain-vmfs__expansion-header">
        <div className="maintain-vmfs__section-pills" aria-label={`${row.name} detail sections available in this panel`}>
          {['Overview', 'Runtime', 'Framework', 'Lineage', 'Dependencies', 'Notes', 'Change Log'].map((tab) => (
            <span
              key={tab}
              className="maintain-vmfs__section-pill"
            >
              {tab}
            </span>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="maintain-vmfs__table-action-button"
          disabled={!runtimeRoute}
          onClick={() => onOpen(row)}
        >
          View full details
        </Button>
      </div>
      <div className="maintain-vmfs__expansion-grid">
        <section className="maintain-vmfs__detail-panel" aria-label={`${row.name} overview`}>
          <h3>Overview</h3>
          <dl>
            <DetailPair label="Instance ID">{row.displayId}</DetailPair>
            <DetailPair label="Work Type">{row.frameworkLabel}</DetailPair>
            <DetailPair label="Source">{row.sourceLabel}</DetailPair>
            <DetailPair label="Description">
              {row.description || 'No description recorded'}
            </DetailPair>
          </dl>
        </section>
        <section className="maintain-vmfs__detail-panel" aria-label={`${row.name} runtime health`}>
          <h3>Runtime Health</h3>
          <dl>
            {row.evidenceItems.map((item) => (
              <DetailPair key={item.label} label={item.label}>
                <Badge size="sm" variant={item.variant} pill className="maintain-vmfs__detail-badge">
                  <CompactBadgeText value={item.value} compact={item.variant === 'warning'} />
                </Badge>
              </DetailPair>
            ))}
          </dl>
        </section>
        <section className="maintain-vmfs__detail-panel" aria-label={`${row.name} framework link`}>
          <h3>Framework Link</h3>
          <dl>
            <DetailPair label="Framework">{row.frameworkLabel}</DetailPair>
            <DetailPair label="Package">{row.packageLabel}</DetailPair>
            <DetailPair label="Version">{row.packageVersion}</DetailPair>
            <DetailPair label="Lifecycle">{row.lifecycleLabel}</DetailPair>
          </dl>
          {runtimeRoute ? (
            <Link
              to={runtimeRoute}
              state={runtimeWorkspaceBackState}
              variant="primary"
              underline="hover"
            >
              Open runtime workspace
            </Link>
          ) : null}
        </section>
        <section className="maintain-vmfs__detail-panel" aria-label={`${row.name} source lineage`}>
          <h3>Source Lineage</h3>
          <dl>
            {row.lineageItems.map(([label, value]) => (
              <DetailPair key={`${row.key}-${label}`} label={label}>{value}</DetailPair>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}

function VmfDetailField({ label, children }) {
  return (
    <div className="maintain-vmfs__detail-item">
      <dt className="maintain-vmfs__detail-label">{label}</dt>
      <dd className="maintain-vmfs__detail-value">{children}</dd>
    </div>
  )
}

function MaintainVmfsBoundaryState({ message, onBack }) {
  return (
    <section className="maintain-vmfs container" aria-label="VMF workspace">
      <header className="maintain-vmfs__header">
        <h1 className="maintain-vmfs__title">VMF Workspace</h1>
      </header>
      <Fieldset className="maintain-vmfs__fieldset">
        <Fieldset.Legend className="sr-only">VMF workspace state</Fieldset.Legend>
        <Card variant="elevated" className="maintain-vmfs__card">
          <Card.Body className="maintain-vmfs__card-body maintain-vmfs__card-body--state">
            <div
              className="maintain-vmfs__catalogue-actions"
              role="group"
              aria-label="VMF workspace actions"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBack}
              >
                Back
              </Button>
            </div>
            <p className="maintain-vmfs__state-message">{message}</p>
          </Card.Body>
        </Card>
      </Fieldset>
    </section>
  )
}

function MaintainVmfs() {
  const navigate = useNavigate()
  const location = useLocation()
  const { addToast } = useToaster()
  const {
    customerId,
    tenantId,
    customerName,
    resolvedTenantName,
    supportsTenantManagement,
    selectableTenants,
    isLoadingTenants,
    setTenantId,
  } = useTenantContext()
  const {
    hasFeatureEntitlement,
    hasCustomerPermission,
    hasTenantPermission,
  } = useAuthorization()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [lifecycleFilter, setLifecycleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [runtimePage, setRuntimePage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', frameworkPackageId: '' })
  const [createErrors, setCreateErrors] = useState({})

  const [editOpen, setEditOpen] = useState(false)
  const [selectedVmf, setSelectedVmf] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: 'ACTIVE',
    lifecycleStatus: 'DRAFT',
  })
  const [editErrors, setEditErrors] = useState({})

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsTarget, setDetailsTarget] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const previousContextKeyRef = useRef(`${customerId ?? ''}::${tenantId ?? ''}`)

  const debouncedSearch = useDebounce(search, 300)
  const querySearch = search.trim() ? debouncedSearch.trim() : ''
  const runtimeWorkspaceBackState = useMemo(
    () => ({
      from: `${location.pathname}${location.search}${location.hash}`,
    }),
    [location.hash, location.pathname, location.search],
  )

  useEffect(() => {
    if (tenantId || !customerId) return
    if (supportsTenantManagement) return
    if (!Array.isArray(selectableTenants) || selectableTenants.length !== 1) return

    const onlyTenant = selectableTenants[0]
    const onlyTenantId = getTenantId(onlyTenant)
    if (!onlyTenantId) return
    setTenantId(onlyTenantId, onlyTenant?.name ?? null)
  }, [customerId, selectableTenants, setTenantId, supportsTenantManagement, tenantId])

  const canViewVmfs = useMemo(() => {
    if (!customerId) return false
    if (typeof hasCustomerPermission === 'function' && hasCustomerPermission(customerId, 'VMF_VIEW')) return true
    if (tenantId && typeof hasTenantPermission === 'function') return hasTenantPermission(customerId, tenantId, 'VMF_VIEW')
    return false
  }, [customerId, hasCustomerPermission, hasTenantPermission, tenantId])
  const canCreateVmfs = useMemo(() => {
    if (!customerId) return false
    if (typeof hasCustomerPermission === 'function' && hasCustomerPermission(customerId, 'VMF_CREATE')) return true
    if (tenantId && typeof hasTenantPermission === 'function') return hasTenantPermission(customerId, tenantId, 'VMF_CREATE')
    return false
  }, [customerId, hasCustomerPermission, hasTenantPermission, tenantId])
  const canUpdateVmfs = useMemo(() => {
    if (!customerId) return false
    if (typeof hasCustomerPermission === 'function' && hasCustomerPermission(customerId, 'VMF_UPDATE')) return true
    if (tenantId && typeof hasTenantPermission === 'function') return hasTenantPermission(customerId, tenantId, 'VMF_UPDATE')
    return false
  }, [customerId, hasCustomerPermission, hasTenantPermission, tenantId])
  const canMutateVmfs = canCreateVmfs || canUpdateVmfs
  const isReadOnlyVmfViewer = canViewVmfs && !canMutateVmfs
  const hasVmfEntitlement = Boolean(
    customerId && hasFeatureEntitlement(customerId, 'VMF'),
  )

  const { data: customerDetails } = useGetCustomerQuery(customerId, {
    skip: !customerId || !canCreateVmfs,
  })

  const canQueryVmfs = Boolean(customerId && tenantId && canViewVmfs && hasVmfEntitlement)
  const effectiveLifecycleFilter = isReadOnlyVmfViewer
    ? READ_ONLY_VMF_LIFECYCLE
    : lifecycleFilter || ''
  const runtimeStatusFilter = RUNTIME_INSTANCE_STATUS_FILTER_VALUES.has(statusFilter)
    ? statusFilter
    : ''

  const {
    data: listResponse,
    isLoading,
    isFetching,
    error: listError,
  } = useListVmfsQuery(
    {
      customerId,
      tenantId,
      q: querySearch,
      status: statusFilter || '',
      lifecycleStatus: effectiveLifecycleFilter,
      page,
      pageSize: DEFAULT_TABLE_PAGE_SIZE,
    },
    { skip: !canQueryVmfs },
  )

  const {
    data: runtimeInstanceResponse,
    isLoading: isLoadingRuntimeInstances,
    isFetching: isFetchingRuntimeInstances,
    error: runtimeInstanceError,
  } = useListRuntimeInstancesQuery(
    {
      customerId,
      tenantId,
      runtimeType: 'VALUE_NARRATIVE',
      q: querySearch,
      status: runtimeStatusFilter,
      page: runtimePage,
      pageSize: DEFAULT_TABLE_PAGE_SIZE,
    },
    { skip: !canQueryVmfs },
  )

  const {
    data: frameworkPackageResponse,
    isLoading: isLoadingFrameworkPackages,
    isFetching: isFetchingFrameworkPackages,
    error: frameworkPackageError,
  } = useListVmfFrameworkPackagesQuery(
    {
      customerId,
      tenantId,
      page: 1,
      pageSize: 100,
    },
    { skip: !customerId || !tenantId || !canCreateVmfs || !hasVmfEntitlement },
  )

  const [createRuntimeInstance, createResult] = useCreateRuntimeInstanceMutation()
  const [updateVmf, updateResult] = useUpdateVmfMutation()
  const [deleteVmf, deleteResult] = useDeleteVmfMutation()

  const rows = useMemo(
    () => (Array.isArray(listResponse?.data) ? listResponse.data : []),
    [listResponse?.data],
  )
  const runtimeInstanceRows = useMemo(
    () => (Array.isArray(runtimeInstanceResponse?.data) ? runtimeInstanceResponse.data : []),
    [runtimeInstanceResponse?.data],
  )
  const meta = listResponse?.meta ?? {}
  const currentPage = Number(meta.page) || page
  const totalPages = Number(meta.totalPages) || 1
  const totalCount = Number(meta.total) || rows.length
  const runtimeInstanceMeta = runtimeInstanceResponse?.meta ?? {}
  const runtimeCurrentPage = Number(runtimeInstanceMeta.page) || runtimePage
  const runtimeTotalPages = Number(runtimeInstanceMeta.totalPages) || 1
  const runtimeTotalCount = Number(runtimeInstanceMeta.total) || runtimeInstanceRows.length

  const listAppError = listError ? normalizeError(listError) : null
  const runtimeInstanceAppError = runtimeInstanceError ? normalizeError(runtimeInstanceError) : null
  const frameworkPackageAppError = frameworkPackageError ? normalizeError(frameworkPackageError) : null
  const inactiveCustomerAppError = isCustomerInactiveError(listAppError) ? listAppError : null
  const licenceAppError = isLicenseFeatureNotEnabledError(listAppError) ? listAppError : null

  const inactiveCustomerMessage = getCustomerInactiveMessage(
    inactiveCustomerAppError,
    VMF_INACTIVE_CUSTOMER_MESSAGE,
  )
  const licenceMessage = getLicenseFeatureNotEnabledMessage(
    licenceAppError,
    VMF_LICENCE_MESSAGE,
  )

  const isMutationLoading =
    createResult.isLoading || updateResult.isLoading || deleteResult.isLoading

  const availableFrameworkPackages = useMemo(
    () => (Array.isArray(frameworkPackageResponse?.data) ? frameworkPackageResponse.data : []),
    [frameworkPackageResponse],
  )

  const frameworkPackageOptions = useMemo(
    () =>
      availableFrameworkPackages
        .map((frameworkPackage) => ({
          value: getFrameworkPackageId(frameworkPackage),
          label: getFrameworkPackageOptionLabel(frameworkPackage),
          isDefault: frameworkPackage?.isDefault === true,
        }))
        .filter((option) => option.value),
    [availableFrameworkPackages],
  )

  const defaultFrameworkPackageOption = useMemo(
    () => frameworkPackageOptions.find((option) => option.isDefault) ?? null,
    [frameworkPackageOptions],
  )

  const isFrameworkPackageSelectionLoading =
    isLoadingFrameworkPackages || isFetchingFrameworkPackages
  const hasNoRuntimeReadyFrameworkPackages =
    !isFrameworkPackageSelectionLoading
    && !frameworkPackageAppError
    && frameworkPackageOptions.length === 0

  const maxVmfsPerTenant = useMemo(() => {
    const candidateValues = [
      customerDetails?.data?.governance?.maxVmfsPerTenant,
      customerDetails?.governance?.maxVmfsPerTenant,
    ]

    for (const candidate of candidateValues) {
      const parsed = parsePositiveInteger(candidate)
      if (parsed !== null) return parsed
    }

    return null
  }, [customerDetails])

  const workspaceScopeName = useMemo(() => {
    const customerNameCandidates = [
      customerName,
      customerDetails?.data?.name,
      customerDetails?.data?.companyName,
      customerDetails?.name,
      customerDetails?.companyName,
    ]

    const resolvedCustomerName = customerNameCandidates
      .map((candidate) => String(candidate ?? '').trim())
      .find(Boolean)

    if (!supportsTenantManagement) {
      return getSingleTenantDisplayName(
        resolvedTenantName,
        resolvedCustomerName,
        'the selected tenant',
      )
    }

    return String(resolvedTenantName ?? '').trim() || 'the selected tenant'
  }, [customerDetails, customerName, resolvedTenantName, supportsTenantManagement])

  const hasRuntimeCapacityMeta = Boolean(
    runtimeInstanceMeta?.runtimeCapacity
    && typeof runtimeInstanceMeta.runtimeCapacity === 'object',
  )
  const isRuntimeCapacityUnavailable = Boolean(
    canCreateVmfs
    && canQueryVmfs
    && !isLoadingRuntimeInstances
    && (
      runtimeInstanceError
      || !hasRuntimeCapacityMeta
    ),
  )

  const runtimeCapacity = useMemo(() => {
    if (!canCreateVmfs) return null

    const metaCapacity = runtimeInstanceMeta?.runtimeCapacity
    if (metaCapacity && typeof metaCapacity === 'object') {
      return normalizeRuntimeCapacity(metaCapacity, maxVmfsPerTenant)
    }

    return null
  }, [canCreateVmfs, maxVmfsPerTenant, runtimeInstanceMeta?.runtimeCapacity])

  const runtimeCapacityGuidance = useMemo(
    () => getRuntimeCapacityGuidance(runtimeCapacity, {
      isLoading: isLoadingRuntimeInstances && canCreateVmfs,
      isUnavailable: isRuntimeCapacityUnavailable,
    }),
    [canCreateVmfs, isLoadingRuntimeInstances, isRuntimeCapacityUnavailable, runtimeCapacity],
  )
  const isRuntimeCapacityReached = Boolean(runtimeCapacity?.isAtCapacity)
  const isRuntimeCapacityLoading = Boolean(canCreateVmfs && isLoadingRuntimeInstances && !runtimeCapacity)
  const isRuntimeCapacityRefreshing = Boolean(canCreateVmfs && isFetchingRuntimeInstances)
  const runtimeCapacityBlockMessage = getRuntimeCapacityBlockMessage({
    isReached: isRuntimeCapacityReached,
    isLoading: isRuntimeCapacityLoading,
    isRefreshing: isRuntimeCapacityRefreshing,
    isUnavailable: isRuntimeCapacityUnavailable,
  })
  const isCreateRuntimeCapacityBlocked = Boolean(runtimeCapacityBlockMessage)
  const workspaceTableNote = canMutateVmfs ? VMF_LIFECYCLE_NOTE : VMF_READ_ONLY_NOTE
  const registerGuideItems = canMutateVmfs ? VMF_REGISTER_GUIDE_ITEMS : VMF_READ_ONLY_REGISTER_GUIDE_ITEMS

  const canManageVmfRow = useCallback(
    () => Boolean(canUpdateVmfs && customerId && tenantId),
    [canUpdateVmfs, customerId, tenantId],
  )

  const showRowActionsColumn = useMemo(
    () => rows.length > 0,
    [rows.length],
  )

  const openDetailsDialog = useCallback((vmf) => {
    setDetailsTarget(vmf)
    setDetailsOpen(true)
  }, [])

  const closeDetailsDialog = useCallback(() => {
    setDetailsOpen(false)
    setDetailsTarget(null)
  }, [])

  const openCreateDialog = useCallback(() => {
    if (
      !canCreateVmfs
      || isCreateRuntimeCapacityBlocked
    ) return
    setCreateErrors({})
    setCreateForm((current) => ({
      ...current,
      frameworkPackageId:
        defaultFrameworkPackageOption?.value
        || (frameworkPackageOptions.length === 1 ? frameworkPackageOptions[0].value : ''),
    }))
    setCreateOpen(true)
  }, [
    canCreateVmfs,
    defaultFrameworkPackageOption,
    frameworkPackageOptions,
    isCreateRuntimeCapacityBlocked,
  ])

  const closeCreateDialog = useCallback(() => {
    setCreateOpen(false)
    setCreateForm({ name: '', description: '', frameworkPackageId: '' })
    setCreateErrors({})
  }, [])

  const openEditDialog = useCallback((vmf) => {
    if (!canManageVmfRow(vmf)) return
    setSelectedVmf(vmf)
    setEditErrors({})
    setEditForm({
      name: String(vmf?.name ?? ''),
      description: String(vmf?.description ?? ''),
      status: String(vmf?.status ?? 'ACTIVE').trim().toUpperCase(),
      lifecycleStatus: String(vmf?.lifecycleStatus ?? 'DRAFT').trim().toUpperCase(),
    })
    setEditOpen(true)
  }, [canManageVmfRow])

  const closeEditDialog = useCallback(() => {
    setEditOpen(false)
    setSelectedVmf(null)
    setEditErrors({})
    setEditForm({
      name: '',
      description: '',
      status: 'ACTIVE',
      lifecycleStatus: 'DRAFT',
    })
  }, [])

  useEffect(() => {
    const nextContextKey = `${customerId ?? ''}::${tenantId ?? ''}`
    if (previousContextKeyRef.current === nextContextKey) return

    previousContextKeyRef.current = nextContextKey
    setSearch('')
    setStatusFilter('')
    setLifecycleFilter('')
    setPage(1)
    setRuntimePage(1)
    closeCreateDialog()
    closeEditDialog()
    closeDetailsDialog()
    setDeleteTarget(null)
  }, [closeCreateDialog, closeDetailsDialog, closeEditDialog, customerId, tenantId])

  useEffect(() => {
    if (canMutateVmfs) return

    closeCreateDialog()
    closeEditDialog()
    closeDetailsDialog()
    setDeleteTarget(null)
  }, [canMutateVmfs, closeCreateDialog, closeDetailsDialog, closeEditDialog])

  useEffect(() => {
    if (!createOpen || createForm.frameworkPackageId) return

    const nextFrameworkPackageId =
      defaultFrameworkPackageOption?.value
      || (frameworkPackageOptions.length === 1 ? frameworkPackageOptions[0].value : '')

    if (!nextFrameworkPackageId) return

    setCreateForm((current) => ({
      ...current,
      frameworkPackageId: nextFrameworkPackageId,
    }))
  }, [createForm.frameworkPackageId, createOpen, defaultFrameworkPackageOption, frameworkPackageOptions])

  const rowActions = useMemo(
    () =>
      showRowActionsColumn
        ? [
          {
            label: 'View details',
          },
          ...(canUpdateVmfs
            ? [
                {
                  label: 'Edit',
                  disabled: isMutationLoading,
                },
                {
                  label: 'Delete',
                  disabled: (row) =>
                    isMutationLoading || String(row?.status ?? '').trim().toUpperCase() === 'ACTIVE',
                },
              ]
            : []),
        ]
        : [],
    [canUpdateVmfs, isMutationLoading, showRowActionsColumn],
  )

  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'View details') openDetailsDialog(row)
      if (!canManageVmfRow(row)) return
      if (label === 'Edit') openEditDialog(row)
      if (label === 'Delete') setDeleteTarget(row)
    },
    [canManageVmfRow, openDetailsDialog, openEditDialog],
  )

  const handleRuntimeRowOpen = useCallback(
    (row) => {
      const route = String(row?.route ?? '').trim()
      if (route) navigate(route, { state: runtimeWorkspaceBackState })
    },
    [navigate, runtimeWorkspaceBackState],
  )

  const runtimeRegisterRows = useMemo(() => {
    const normalizedSearch = querySearch.toLowerCase()

    return runtimeInstanceRows
      .map(buildRuntimeInstanceRegisterRow)
      .filter((row) => {
        const matchesSearch = !normalizedSearch || row.searchText.includes(normalizedSearch)
        const matchesStatus = !statusFilter || row.status === statusFilter
        const matchesLifecycle = !effectiveLifecycleFilter || row.lifecycle === effectiveLifecycleFilter
        return matchesSearch && matchesStatus && matchesLifecycle
      })
  }, [effectiveLifecycleFilter, querySearch, runtimeInstanceRows, statusFilter])

  const vmfRegisterRows = useMemo(
    () => rows.map(buildVmfRegisterRow),
    [rows],
  )

  const registerRows = useMemo(
    () =>
      [...runtimeRegisterRows, ...vmfRegisterRows]
        .sort((left, right) => right.updatedTime - left.updatedTime),
    [runtimeRegisterRows, vmfRegisterRows],
  )

  const registerShownCount = registerRows.length
  const registerCountLabel = `${registerShownCount} shown`
  const registerSourceCountLabel = `${runtimeTotalCount} ${
    runtimeTotalCount === 1 ? 'runtime object' : 'runtime objects'
  } | ${totalCount} ${totalCount === 1 ? 'VMF bridge record' : 'VMF bridge records'}`
  const isRegisterLoading = isLoading || isLoadingRuntimeInstances
  const isRegisterRefreshing = Boolean(
    (isFetching && !isLoading) || (isFetchingRuntimeInstances && !isLoadingRuntimeInstances),
  )
  const [expandedRegisterRowKey, setExpandedRegisterRowKey] = useState('')

  useEffect(() => {
    if (registerRows.length === 0) {
      setExpandedRegisterRowKey('')
      return
    }

    if (expandedRegisterRowKey && !registerRows.some((row) => row.key === expandedRegisterRowKey)) {
      setExpandedRegisterRowKey('')
    }
  }, [expandedRegisterRowKey, registerRows])

  const featuredRegisterRow = registerRows[0] ?? null
  const lockedInstanceRows = registerRows.filter(
    (row) => String(getEvidenceItemValue(row, 'Lock')).trim().toUpperCase() === 'LOCKED',
  )
  const pendingValidationRows = registerRows.filter((row) => {
    const validation = String(getEvidenceItemValue(row, 'Validation')).trim().toUpperCase()
    return ['FAILED', 'ERROR', 'BLOCKED', 'NOT_RUN', 'PENDING'].includes(validation)
  })
  const atRiskInstanceRows = registerRows.filter((row) =>
    ['warning', 'error', 'danger'].includes(row.stageVariant)
    || ['FAILED', 'ERROR', 'BLOCKED', 'WAITING'].includes(String(row.status).trim().toUpperCase()),
  )
  const lockedInstanceCount = lockedInstanceRows.length
  const pendingValidationCount = pendingValidationRows.length
  const atRiskInstanceCount = atRiskInstanceRows.length
  const lockedInstanceFocus = lockedInstanceRows[0] ?? null
  const pendingValidationFocus = pendingValidationRows[0] ?? null
  const atRiskInstanceFocus = atRiskInstanceRows[0] ?? null
  const lockedInstanceEvidence = getEvidenceItem(lockedInstanceFocus, 'Lock')
  const pendingValidationEvidence = getEvidenceItem(pendingValidationFocus, 'Validation')
  const lockedInstanceInsight = lockedInstanceFocus
    ? `Latest: ${lockedInstanceFocus.name}`
    : 'No locked instances'
  const pendingValidationInsight = pendingValidationFocus
    ? `Latest: ${pendingValidationFocus.name}`
    : 'No pending validation'
  const atRiskInstanceInsight = atRiskInstanceFocus
    ? `Latest: ${atRiskInstanceFocus.name}`
    : 'No at-risk instances'
  const lockedInstanceBadge = lockedInstanceFocus
    ? {
        label: formatRuntimeTokenLabel(lockedInstanceEvidence?.value ?? 'LOCKED'),
        variant: lockedInstanceEvidence?.variant ?? 'warning',
      }
    : { label: 'Clear', variant: 'success' }
  const pendingValidationBadge = pendingValidationFocus
    ? {
        label: formatRuntimeTokenLabel(pendingValidationEvidence?.value ?? 'PENDING'),
        variant: pendingValidationEvidence?.variant ?? 'warning',
      }
    : { label: 'Clear', variant: 'success' }
  const atRiskInstanceBadge = atRiskInstanceFocus
    ? {
        label: atRiskInstanceFocus.stageLabel,
        variant: atRiskInstanceFocus.stageVariant,
      }
    : { label: 'Clear', variant: 'success' }
  const handleCreateSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      const name = String(createForm.name ?? '').trim()
      const description = String(createForm.description ?? '').trim()
      const frameworkPackageId = String(createForm.frameworkPackageId ?? '').trim()
      const nextErrors = {}

      if (!name) nextErrors.name = 'Name is required.'
      if (name.length > 255) nextErrors.name = 'Name must be 255 characters or fewer.'
      if (description.length > 1000) {
        nextErrors.description = 'Description must be 1000 characters or fewer.'
      }
      if (runtimeCapacityBlockMessage) {
        nextErrors.form = runtimeCapacityBlockMessage
      }
      if (!frameworkPackageId) {
        nextErrors.frameworkPackageId = 'VMF version is required.'
      } else if (!frameworkPackageOptions.some((option) => option.value === frameworkPackageId)) {
        nextErrors.frameworkPackageId = 'Select an available VMF version.'
      }

      if (Object.keys(nextErrors).length > 0) {
        setCreateErrors(nextErrors)
        return
      }

      try {
        const response = await createRuntimeInstance({
          body: {
            customerId,
            tenantId,
            frameworkKey: 'VMF',
            runtimeType: 'VALUE_NARRATIVE',
            name,
            frameworkPackageId,
            ...(description ? { description } : {}),
          },
        }).unwrap()

        const createdRuntimeInstance = response?.data ?? {}
        const createdName = String(createdRuntimeInstance?.name ?? name)
        const packageVersion = String(createdRuntimeInstance?.packageVersion ?? '').trim()

        addToast({
          title: 'Value Narrative created',
          description: packageVersion
            ? `${createdName} started as runtime work on package ${packageVersion}.`
            : `${createdName} started as runtime work.`,
          variant: 'success',
        })

        closeCreateDialog()
        setRuntimePage(1)
        setPage(1)
      } catch (error) {
        const appError = normalizeError(error)

        if (isGovernanceLimitConflictError(appError, 'VMF_LIMIT_REACHED')) {
          addToast({
            title: 'Value Narrative capacity reached',
            description: getGovernanceLimitConflictMessage(appError),
            variant: 'warning',
          })
          return
        }

        const details = appError?.details

        if (details && typeof details === 'object') {
          const fieldErrors = {}
          if (typeof details.name === 'string' && details.name.trim()) {
            fieldErrors.name = details.name
          }
          if (typeof details.description === 'string' && details.description.trim()) {
            fieldErrors.description = details.description
          }
          if (typeof details.frameworkPackageId === 'string' && details.frameworkPackageId.trim()) {
            fieldErrors.frameworkPackageId = details.frameworkPackageId
          }
          if (Object.keys(fieldErrors).length > 0) {
            setCreateErrors(fieldErrors)
            return
          }
        }

        addToast({
          title: 'Failed to create Value Narrative',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [
      addToast,
      closeCreateDialog,
      createRuntimeInstance,
      createForm.description,
      createForm.frameworkPackageId,
      createForm.name,
      customerId,
      frameworkPackageOptions,
      runtimeCapacityBlockMessage,
      tenantId,
    ],
  )

  const handleEditSubmit = useCallback(async () => {
    const vmfId = getVmfId(selectedVmf)
    if (!vmfId) return

    const name = String(editForm.name ?? '').trim()
    const description = String(editForm.description ?? '').trim()
    const status = String(editForm.status ?? '').trim().toUpperCase()
    const lifecycleStatus = String(editForm.lifecycleStatus ?? '').trim().toUpperCase()
    const nextErrors = {}

    if (!name) nextErrors.name = 'Name is required.'
    if (name.length > 255) nextErrors.name = 'Name must be 255 characters or fewer.'
    if (description.length > 1000) {
      nextErrors.description = 'Description must be 1000 characters or fewer.'
    }
    if (!VMF_MUTATION_STATUS_OPTIONS.some((option) => option.value === status)) {
      nextErrors.status = 'Select a valid status.'
    }
    if (!getLifecycleOptionsForCurrentState(selectedVmf?.lifecycleStatus).some(
      (option) => option.value === lifecycleStatus,
    )) {
      nextErrors.lifecycleStatus = 'Select a valid lifecycle transition.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setEditErrors(nextErrors)
      return
    }

    const patch = {}
    if (name !== String(selectedVmf?.name ?? '').trim()) patch.name = name
    if (description !== String(selectedVmf?.description ?? '').trim()) patch.description = description
    if (status !== String(selectedVmf?.status ?? '').trim().toUpperCase()) patch.status = status
    if (
      lifecycleStatus
      !== String(selectedVmf?.lifecycleStatus ?? 'DRAFT').trim().toUpperCase()
    ) {
      patch.lifecycleStatus = lifecycleStatus
    }

    if (Object.keys(patch).length === 0) {
      setEditErrors({ form: 'Make at least one change before saving.' })
      return
    }

    try {
      await updateVmf({
        vmfId,
        body: patch,
      }).unwrap()

      addToast({
        title: 'VMF updated',
        description: 'VMF changes were saved successfully.',
        variant: 'success',
      })
      closeEditDialog()
    } catch (error) {
      const appError = normalizeError(error)
      const reason = String(appError?.details?.reason ?? '').trim().toUpperCase()

      if (reason === 'INVALID_LIFECYCLE_TRANSITION') {
        setEditErrors({ lifecycleStatus: appError.message })
        return
      }

      const details = appError?.details
      if (details && typeof details === 'object') {
        const fieldErrors = {}
        if (typeof details.name === 'string' && details.name.trim()) {
          fieldErrors.name = details.name
        }
        if (typeof details.description === 'string' && details.description.trim()) {
          fieldErrors.description = details.description
        }
        if (typeof details.status === 'string' && details.status.trim()) {
          fieldErrors.status = details.status
        }
        if (typeof details.lifecycleStatus === 'string' && details.lifecycleStatus.trim()) {
          fieldErrors.lifecycleStatus = details.lifecycleStatus
        }
        if (Object.keys(fieldErrors).length > 0) {
          setEditErrors(fieldErrors)
          return
        }
      }

      setEditErrors({ form: appError.message })
    }
  }, [addToast, closeEditDialog, editForm.description, editForm.lifecycleStatus, editForm.name, editForm.status, selectedVmf, updateVmf])

  const handleConfirmDelete = useCallback(async () => {
    const vmfId = getVmfId(deleteTarget)
    if (!vmfId) {
      setDeleteTarget(null)
      return
    }

    try {
      const response = await deleteVmf({ vmfId }).unwrap()
      addToast({
        title: 'VMF soft-deleted',
        description: formatSoftDeleteMessage(response?.data),
        variant: 'success',
      })
    } catch (error) {
      const appError = normalizeError(error)
      addToast({
        title: 'Failed to delete VMF',
        description: appError.message,
        variant: appError.status === 422 ? 'warning' : 'error',
      })
    } finally {
      setDeleteTarget(null)
    }
  }, [addToast, deleteTarget, deleteVmf])

  const handleBackToHome = useCallback(() => {
    navigate('/app/dashboard')
  }, [navigate])

  const detailsRuntimeReadiness = getRuntimeReadinessLabel(detailsTarget)
  const detailsExecutionState = getRuntimeExecutionState(detailsTarget)

  if (!customerId) {
    return (
      <MaintainVmfsBoundaryState
        message="No customer context available. Select a customer to manage VMFs."
        onBack={handleBackToHome}
      />
    )
  }

  if (!tenantId) {
    return (
      <MaintainVmfsBoundaryState
        message={
          supportsTenantManagement
            ? 'Select a tenant from the tenant switcher before opening the VMF workspace.'
            : isLoadingTenants
              ? 'Loading tenant context for this workspace.'
              : 'VMF access is available, but the workspace could not resolve its tenant context. Refresh or re-open this page.'
        }
        onBack={handleBackToHome}
      />
    )
  }

  if (!canViewVmfs) {
    return <MaintainVmfsBoundaryState message={VMF_UNAUTHORIZED_MESSAGE} onBack={handleBackToHome} />
  }

  if (!hasVmfEntitlement) {
    return <MaintainVmfsBoundaryState message={VMF_LICENCE_MESSAGE} onBack={handleBackToHome} />
  }

  if (inactiveCustomerAppError) {
    return <MaintainVmfsBoundaryState message={inactiveCustomerMessage} onBack={handleBackToHome} />
  }

  if (licenceAppError) {
    return <MaintainVmfsBoundaryState message={licenceMessage} onBack={handleBackToHome} />
  }

  return (
    <section className="maintain-vmfs container" aria-label="Value Narrative workspace">
      <header className="maintain-vmfs__header">
        <div>
          <h1 className="maintain-vmfs__title">Value Narrative Workspace</h1>
          <p className="maintain-vmfs__subtitle">
            Continue your work or take the next recommended action for{` ${workspaceScopeName}.`}
            <span className="sr-only"> Workspace scope for {workspaceScopeName}.</span>
          </p>
        </div>
        <div
          className="maintain-vmfs__catalogue-actions"
          role="group"
          aria-label="Value Narrative quick create"
        >
          {canCreateVmfs ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<MdAdd aria-hidden="true" />}
              onClick={openCreateDialog}
              disabled={
                isMutationLoading
                || isCreateRuntimeCapacityBlocked
              }
            >
              Create New Instance
            </Button>
          ) : null}
        </div>
      </header>

      <section className="maintain-vmfs__continue-section" aria-labelledby="value-narrative-continue-heading">
        <h2 id="value-narrative-continue-heading" className="maintain-vmfs__section-title">
          Continue Work
        </h2>
        {featuredRegisterRow ? (
          <ul className="maintain-vmfs__continue-grid">
            <ContinueWorkCard
              row={featuredRegisterRow}
              primary
              title="Continue latest instance"
              icon={MdOutlineDescription}
              onOpen={handleRuntimeRowOpen}
            />
            <ContinueWorkCard
              title="Review Locked Instances"
              description={`${lockedInstanceCount} ${lockedInstanceCount === 1 ? 'instance' : 'instances'} locked`}
              insight={lockedInstanceInsight}
              summaryBadge={lockedInstanceBadge}
              icon={MdLockOutline}
            />
            <ContinueWorkCard
              title="Resolve Pending Validation"
              description={`${pendingValidationCount} ${pendingValidationCount === 1 ? 'instance needs' : 'instances need'} attention`}
              insight={pendingValidationInsight}
              summaryBadge={pendingValidationBadge}
              icon={MdShield}
            />
            <ContinueWorkCard
              title="Review At-Risk Instances"
              description={`${atRiskInstanceCount} ${atRiskInstanceCount === 1 ? 'instance needs' : 'instances need'} attention`}
              insight={atRiskInstanceInsight}
              summaryBadge={atRiskInstanceBadge}
              icon={MdOutlineWarningAmber}
              tone="warning"
            />
          </ul>
        ) : (
          <div className="maintain-vmfs__empty-panel">
            <p>No Value Narrative runtime work is available for this tenant yet.</p>
          </div>
        )}
      </section>

      <Fieldset className="maintain-vmfs__fieldset maintain-vmfs__register-section">
        <Fieldset.Legend className="sr-only">Value Narrative work register</Fieldset.Legend>
        <Card variant="elevated" className="maintain-vmfs__card maintain-vmfs__register-card">
          <Card.Body className="maintain-vmfs__card-body maintain-vmfs__card-body--compact">
            <div className="maintain-vmfs__register-header">
              <div className="maintain-vmfs__register-copy-wrapper">
                <div className="maintain-vmfs__section-copy">
                  <h2 className="maintain-vmfs__section-title">
                    Instances <span className="sr-only">Value Narratives</span>
                  </h2>
                  <p className="maintain-vmfs__section-description">
                    Runtime objects are shown with transitional VMF bridge records for this tenant.
                  </p>
                </div>
              </div>

              <div className="maintain-vmfs__register-controls">
                <div
                  className="maintain-vmfs__catalogue-actions"
                  role="group"
                  aria-label="Value Narrative workspace actions"
                >
                  {canCreateVmfs && hasNoRuntimeReadyFrameworkPackages ? (
                    <Status
                      variant="warning"
                      size="sm"
                      showIcon
                      className="maintain-vmfs__package-status"
                      aria-label="Eligible VMF version required"
                    >
                      No eligible version
                    </Status>
                  ) : null}
                  <div className="maintain-vmfs__catalogue-buttons">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleBackToHome}
                    >
                      Back
                    </Button>
                  </div>
                  {canCreateVmfs && runtimeCapacityGuidance ? (
                    <Status
                      variant={runtimeCapacityGuidance.tone === 'warning' ? 'warning' : 'info'}
                      size="sm"
                      showIcon
                      className="maintain-vmfs__capacity-status"
                      aria-label={runtimeCapacityGuidance.ariaLabel}
                    >
                      {runtimeCapacityGuidance.displayValue}
                    </Status>
                  ) : null}
                </div>

                <div className="maintain-vmfs__toolbar" role="group" aria-label="Instance filters">
                  <Input
                    id="vmf-search"
                    aria-label="Search"
                    className="maintain-vmfs__search-control"
                    size="sm"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPage(1)
                      setRuntimePage(1)
                    }}
                    placeholder="Search"
                    fullWidth
                  />
                  <Select
                    id="vmf-status-filter"
                    label="State"
                    className="maintain-vmfs__filter-control"
                    size="sm"
                    value={statusFilter}
                    options={VMF_STATUS_OPTIONS}
                    onChange={(event) => {
                      setStatusFilter(event.target.value)
                      setPage(1)
                      setRuntimePage(1)
                    }}
                  />
                  <Select
                    id="vmf-lifecycle-filter"
                    label="Lifecycle"
                    className="maintain-vmfs__filter-control"
                    size="sm"
                    value={effectiveLifecycleFilter}
                    options={
                      isReadOnlyVmfViewer
                        ? VMF_LIFECYCLE_OPTIONS.filter(
                          (option) => option.value === READ_ONLY_VMF_LIFECYCLE,
                        )
                        : VMF_LIFECYCLE_OPTIONS
                    }
                    disabled={isReadOnlyVmfViewer}
                    onChange={(event) => {
                      setLifecycleFilter(event.target.value)
                      setPage(1)
                    }}
                  />
                </div>
              </div>
            </div>

            {runtimeInstanceAppError ? (
              <ErrorSupportPanel error={runtimeInstanceAppError} context="maintain-vmfs-runtime-instances" />
            ) : null}

            {listAppError && !inactiveCustomerAppError && !licenceAppError ? (
              <ErrorSupportPanel error={listAppError} context="maintain-vmfs-list" />
            ) : null}

            <div className="maintain-vmfs__register-meta">
              <div className="maintain-vmfs__register-guide" aria-label={workspaceTableNote}>
                <div className="maintain-vmfs__register-guide-copy">
                  <p className="maintain-vmfs__register-guide-title">Register guide</p>
                  <ul className="maintain-vmfs__register-guide-list">
                    {registerGuideItems.map(([label, value]) => (
                      <li key={label} className="maintain-vmfs__register-guide-item">
                        <span className="maintain-vmfs__register-guide-label">{label}</span>
                        <span className="maintain-vmfs__register-guide-value">{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="maintain-vmfs__register-counts" aria-label="Value Narrative register counts">
                <Badge size="sm" variant="neutral" pill>{registerCountLabel}</Badge>
                <Badge size="sm" variant="info" pill>{registerSourceCountLabel}</Badge>
              </div>
            </div>

            <HorizontalScroll
              className="maintain-vmfs__table-wrap"
              ariaLabel="Value Narrative work register table"
              gap="sm"
            >
              <Table
                className="maintain-vmfs__table maintain-vmfs__register-table"
                hoverable
                variant="striped"
                ariaLabel="Value Narrative work register"
              >
                <Table.Head>
                    <Table.Row>
                    <Table.Header width="300px">Instance</Table.Header>
                    <Table.Header width="220px">Package</Table.Header>
                    <Table.Header width="130px">Version</Table.Header>
                    <Table.Header width="140px">State</Table.Header>
                    <Table.Header width="130px">Lifecycle</Table.Header>
                    <Table.Header width="150px">Health</Table.Header>
                    <Table.Header width="140px">Updated</Table.Header>
                    <Table.Header width="170px" align="center">Action</Table.Header>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {isRegisterLoading ? (
                    <Table.Row className="table__row--loading">
                      <Table.Cell colSpan={8} className="table__cell--empty">
                        <p className="table__empty-message">Loading Value Narrative work...</p>
                      </Table.Cell>
                    </Table.Row>
                  ) : registerRows.length === 0 ? (
                    <Table.Row className="table__row--empty">
                      <Table.Cell colSpan={8} className="table__cell--empty">
                        <p className="table__empty-message">No Value Narratives found.</p>
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    registerRows.map((registerRow) => {
                      const isExpanded = expandedRegisterRowKey === registerRow.key
                      return (
                        <Fragment key={registerRow.key}>
                          <Table.Row
                            rowId={registerRow.key}
                            className={[
                              'maintain-vmfs__register-row',
                              isExpanded ? 'maintain-vmfs__register-row--expanded' : '',
                            ].filter(Boolean).join(' ')}
                          >
                            <Table.Cell
                              dataLabel="Instance"
                              className="maintain-vmfs__register-identity-cell"
                            >
                              <div className="maintain-vmfs__instance-summary">
                                <span className="maintain-vmfs__instance-icon" aria-hidden="true">
                                  <MdOutlineDescription />
                                </span>
                                <div className="maintain-vmfs__vmf-summary-header">
                                  {registerRow.route ? (
                                    <Link
                                      to={registerRow.route}
                                      state={runtimeWorkspaceBackState}
                                      className="maintain-vmfs__vmf-name"
                                      variant="primary"
                                      underline="hover"
                                    >
                                      {registerRow.name}
                                    </Link>
                                  ) : (
                                    <span className="maintain-vmfs__vmf-name">
                                      {registerRow.name}
                                    </span>
                                  )}
                                  <span className="maintain-vmfs__vmf-description">
                                    {registerRow.displayId}
                                  </span>
                                  <Badge size="sm" variant="neutral" pill>
                                    {registerRow.sourceLabel}
                                  </Badge>
                                </div>
                              </div>
                            </Table.Cell>
                            <Table.Cell dataLabel="Package">
                              <span className="maintain-vmfs__summary-value">
                                {registerRow.packageLabel}
                              </span>
                            </Table.Cell>
                            <Table.Cell dataLabel="Version">
                              <span className="maintain-vmfs__summary-value">
                                {registerRow.packageVersion}
                              </span>
                            </Table.Cell>
                            <Table.Cell dataLabel="State">
                              <Status
                                size="sm"
                                showIcon
                                variant={registerRow.statusVariant === 'danger' ? 'error' : registerRow.statusVariant}
                              >
                                {registerRow.statusLabel}
                              </Status>
                            </Table.Cell>
                            <Table.Cell dataLabel="Lifecycle">
                              <Badge
                                size="sm"
                                variant={registerRow.lifecycleVariant}
                                pill
                              >
                                {registerRow.lifecycleLabel}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell dataLabel="Health">
                              <Badge
                                size="sm"
                                variant={registerRow.healthVariant}
                                pill
                                className="maintain-vmfs__health-badge"
                              >
                                <CompactBadgeText
                                  value={registerRow.healthLabel}
                                  compact={registerRow.healthVariant === 'warning'}
                                />
                              </Badge>
                            </Table.Cell>
                            <Table.Cell dataLabel="Updated">
                              <TableDateTime value={registerRow.updatedAt} />
                            </Table.Cell>
                            <Table.Cell
                              dataLabel="Actions"
                              align="center"
                              className="maintain-vmfs__register-actions-cell"
                            >
                              <div className="maintain-vmfs__row-action-cluster">
                                {registerRow.source === 'runtime' ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="maintain-vmfs__table-action-button"
                                    disabled={!registerRow.route}
                                    onClick={() => handleRuntimeRowOpen(registerRow)}
                                  >
                                    Continue
                                  </Button>
                                ) : (
                                  <VmfRowActionsMenu
                                    row={registerRow.original}
                                    actions={rowActions}
                                    onAction={handleRowAction}
                                  />
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  iconOnly
                                  className="maintain-vmfs__details-toggle"
                                  aria-expanded={isExpanded}
                                  aria-label={`${isExpanded ? 'Hide information for' : 'Show more information for'} ${registerRow.name}`}
                                  onClick={() =>
                                    setExpandedRegisterRowKey((current) =>
                                      current === registerRow.key ? '' : registerRow.key)}
                                >
                                  {isExpanded ? (
                                    <MdKeyboardArrowUp aria-hidden="true" />
                                  ) : (
                                    <MdKeyboardArrowDown aria-hidden="true" />
                                  )}
                                </Button>
                              </div>
                            </Table.Cell>
                          </Table.Row>
                          {isExpanded ? (
                            <Table.Row className="maintain-vmfs__register-detail-row">
                              <Table.Cell colSpan={8} className="maintain-vmfs__register-detail-cell">
                                <RegisterExpansionPanel
                                  row={registerRow}
                                  onOpen={handleRuntimeRowOpen}
                                  runtimeWorkspaceBackState={runtimeWorkspaceBackState}
                                />
                              </Table.Cell>
                            </Table.Row>
                          ) : null}
                        </Fragment>
                      )
                    })
                  )}
                </Table.Body>
              </Table>
            </HorizontalScroll>

            {isRegisterRefreshing ? (
              <p className="maintain-vmfs__muted">Refreshing Value Narrative work...</p>
            ) : null}

            {runtimeTotalPages > 1 || totalPages > 1 ? (
              <div className="maintain-vmfs__pagination-stack">
                {runtimeTotalPages > 1 ? (
                  <div
                    className="maintain-vmfs__pagination"
                    role="navigation"
                    aria-label="Value Narrative runtime pagination"
                  >
                    <div className="maintain-vmfs__pagination-controls">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={runtimeCurrentPage <= 1 || isFetchingRuntimeInstances}
                        onClick={() => setRuntimePage(1)}
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={runtimeCurrentPage <= 1 || isFetchingRuntimeInstances}
                        onClick={() => setRuntimePage((value) => Math.max(1, value - 1))}
                      >
                        Previous
                      </Button>
                    </div>
                    <p className="maintain-vmfs__pagination-info">
                      Runtime objects page {runtimeCurrentPage} of {runtimeTotalPages}
                      {runtimeTotalCount > 0 ? ` (${runtimeTotalCount} runtime objects)` : ''}
                    </p>
                    <div className="maintain-vmfs__pagination-controls">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={runtimeCurrentPage >= runtimeTotalPages || isFetchingRuntimeInstances}
                        onClick={() => setRuntimePage((value) => Math.min(runtimeTotalPages, value + 1))}
                      >
                        Next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={runtimeCurrentPage >= runtimeTotalPages || isFetchingRuntimeInstances}
                        onClick={() => setRuntimePage(runtimeTotalPages)}
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                ) : null}

                {totalPages > 1 ? (
                  <div className="maintain-vmfs__pagination" role="navigation" aria-label="VMF bridge record pagination">
                    <div className="maintain-vmfs__pagination-controls">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1 || isFetching}
                        onClick={() => setPage(1)}
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1 || isFetching}
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                      >
                        Previous
                      </Button>
                    </div>
                    <p className="maintain-vmfs__pagination-info">
                      VMF bridge records page {currentPage} of {totalPages}
                      {totalCount > 0 ? ` (${totalCount} VMF bridge records)` : ''}
                    </p>
                    <div className="maintain-vmfs__pagination-controls">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages || isFetching}
                        onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                      >
                        Next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages || isFetching}
                        onClick={() => setPage(totalPages)}
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card.Body>
        </Card>
      </Fieldset>

      <Dialog open={createOpen} onClose={closeCreateDialog} size="md">
        <Dialog.Header>
          <h2 className="maintain-vmfs__dialog-title">Create Value Narrative</h2>
        </Dialog.Header>
        <Dialog.Body className="maintain-vmfs__dialog-body">
          <form className="maintain-vmfs__form" onSubmit={handleCreateSubmit} noValidate>
            {createErrors.form ? (
              <p className="maintain-vmfs__error" role="alert">
                {createErrors.form}
              </p>
            ) : null}
            {!createErrors.form && runtimeCapacityBlockMessage ? (
              <p className="maintain-vmfs__error" role="alert">
                {runtimeCapacityBlockMessage}
              </p>
            ) : null}
            <Input
              id="vmf-create-name"
              label="Name"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, name: event.target.value }))
              }
              error={createErrors.name}
              required
              fullWidth
            />
            <Select
              id="vmf-create-framework-package"
              label="VMF Version"
              value={createForm.frameworkPackageId}
              placeholder={
                isFrameworkPackageSelectionLoading
                  ? 'Loading VMF versions...'
                  : 'Select a VMF version'
              }
              options={frameworkPackageOptions}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  frameworkPackageId: event.target.value,
                }))
              }
              error={createErrors.frameworkPackageId}
              helperText={
                frameworkPackageOptions.length > 0
                  ? 'Select the active runtime-ready VMF version this instance will snapshot at creation.'
                  : VMF_RUNTIME_PACKAGE_UNAVAILABLE_HELPER
              }
              disabled={
                isFrameworkPackageSelectionLoading
                || Boolean(frameworkPackageAppError)
                || frameworkPackageOptions.length === 0
              }
              required
            />
            {frameworkPackageAppError ? (
              <p className="maintain-vmfs__error" role="alert">
                {frameworkPackageAppError.message}
              </p>
            ) : null}
            {hasNoRuntimeReadyFrameworkPackages ? (
              <p className="maintain-vmfs__runtime-package-note">
                {VMF_RUNTIME_PACKAGE_UNAVAILABLE_MESSAGE}
              </p>
            ) : null}
            <Textarea
              id="vmf-create-description"
              label="Description (Optional)"
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              error={createErrors.description}
              rows={4}
              fullWidth
            />
            <p className="maintain-vmfs__muted">
              New Value Narratives start as <strong>ACTIVE</strong> runtime work with a
              <strong> DRAFT</strong> framework state. Package evidence is snapshotted from
              the selected active package at creation.
            </p>
            <div className="maintain-vmfs__form-actions">
              <Button
                type="button"
                variant="outline"
                onClick={closeCreateDialog}
                disabled={createResult.isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={createResult.isLoading}
                disabled={
                  isFrameworkPackageSelectionLoading
                  || Boolean(frameworkPackageAppError)
                  || frameworkPackageOptions.length === 0
                  || isCreateRuntimeCapacityBlocked
                }
              >
                Create
              </Button>
            </div>
          </form>
        </Dialog.Body>
      </Dialog>

      <Dialog open={editOpen} onClose={closeEditDialog} size="md">
        <Dialog.Header>
          <h2 className="maintain-vmfs__dialog-title">Edit VMF</h2>
        </Dialog.Header>
        <Dialog.Body className="maintain-vmfs__dialog-body">
          <div className="maintain-vmfs__form">
            {editErrors.form ? (
              <p className="maintain-vmfs__error" role="alert">
                {editErrors.form}
              </p>
            ) : null}
            <Input
              id="vmf-edit-name"
              label="Name"
              value={editForm.name}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, name: event.target.value }))
              }
              error={editErrors.name}
              required
              fullWidth
            />
            <Textarea
              id="vmf-edit-description"
              label="Description"
              value={editForm.description}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, description: event.target.value }))
              }
              error={editErrors.description}
              rows={4}
              fullWidth
            />
            <Select
              id="vmf-edit-status"
              label="Operational Status"
              value={editForm.status}
              options={VMF_MUTATION_STATUS_OPTIONS}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, status: event.target.value }))
              }
              error={editErrors.status}
            />
            <Select
              id="vmf-edit-lifecycle-status"
              label="Lifecycle Status"
              value={editForm.lifecycleStatus}
              options={getLifecycleOptionsForCurrentState(selectedVmf?.lifecycleStatus)}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  lifecycleStatus: event.target.value,
                }))
              }
              error={editErrors.lifecycleStatus}
            />
            <div className="maintain-vmfs__form-actions">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditDialog}
                disabled={updateResult.isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleEditSubmit}
                loading={updateResult.isLoading}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Dialog.Body>
      </Dialog>

      <Dialog
        open={detailsOpen}
        onClose={closeDetailsDialog}
        size="lg"
        aria-label={detailsTarget?.name ? `${detailsTarget.name} details` : 'VMF details'}
      >
        <Dialog.Header>
          <h2 className="maintain-vmfs__dialog-title">
            {detailsTarget?.name ? `${detailsTarget.name} Details` : 'VMF Details'}
          </h2>
        </Dialog.Header>
        <Dialog.Body className="maintain-vmfs__dialog-body">
          <p className="maintain-vmfs__dialog-text">
            Read-only VMF metadata returned by the backend. Runtime-control fields are displayed
            here but are not sent back on normal edits.
          </p>
          <dl className="maintain-vmfs__details-grid">
            <VmfDetailField label="Name">
              {String(detailsTarget?.name ?? '--')}
            </VmfDetailField>
            <VmfDetailField label="Description">
              {String(detailsTarget?.description ?? '--')}
            </VmfDetailField>
            <VmfDetailField label="Operational Status">
              <Status
                size="sm"
                showIcon
                variant={getOperationalStatusVariant(String(detailsTarget?.status ?? '').trim().toUpperCase() || 'UNKNOWN')}
              >
                {String(detailsTarget?.status ?? 'UNKNOWN').trim().toUpperCase() || 'UNKNOWN'}
              </Status>
            </VmfDetailField>
            <VmfDetailField label="Lifecycle Status">
              <Badge
                size="sm"
                variant={getLifecycleVariant(String(detailsTarget?.lifecycleStatus ?? '').trim().toUpperCase() || 'DRAFT')}
                pill
              >
                {String(detailsTarget?.lifecycleStatus ?? 'DRAFT').trim().toUpperCase() || 'DRAFT'}
              </Badge>
            </VmfDetailField>
            <VmfDetailField label="Framework Version">
              {String(detailsTarget?.frameworkVersion ?? '--').trim() || '--'}
            </VmfDetailField>
            <VmfDetailField label="VMF Version">
              {getFrameworkPackageLabel(detailsTarget)}
            </VmfDetailField>
            <VmfDetailField label="VMF Version Id">
              {String(detailsTarget?.frameworkPackageId ?? '--').trim() || '--'}
            </VmfDetailField>
            <VmfDetailField label="VMF Version Status">
              <Badge
                size="sm"
                variant={getRuntimeStateVariant(getFrameworkPackageDetail(detailsTarget, 'status') || '')}
                pill
              >
                {getFrameworkPackageDetail(detailsTarget, 'status') || '--'}
              </Badge>
            </VmfDetailField>
            <VmfDetailField label="VMF Version Number">
              {getFrameworkPackageDetail(detailsTarget, 'version')
                || getFrameworkPackageDetail(detailsTarget, 'frameworkVersion')
                || '--'}
            </VmfDetailField>
            <VmfDetailField label="Runtime Readiness">
              <Badge
                size="sm"
                variant={getRuntimeReadinessVariant(detailsRuntimeReadiness)}
                pill
              >
                {detailsRuntimeReadiness}
              </Badge>
            </VmfDetailField>
            <VmfDetailField label="Execution State">
              <Badge
                size="sm"
                variant={getExecutionStateVariant(detailsExecutionState)}
                pill
              >
                {formatRuntimeTokenLabel(detailsExecutionState)}
              </Badge>
            </VmfDetailField>
            <VmfDetailField label="Completion State">
              <Badge
                size="sm"
                variant={getRuntimeStateVariant(detailsTarget?.completionState ?? 'NOT_TRACKED')}
                pill
              >
                {String(detailsTarget?.completionState ?? 'NOT_TRACKED').trim().toUpperCase() || 'NOT_TRACKED'}
              </Badge>
            </VmfDetailField>
            <VmfDetailField label="Validation Status">
              <Badge
                size="sm"
                variant={getRuntimeStateVariant(detailsTarget?.validationStatus ?? 'NOT_RUN')}
                pill
              >
                {String(detailsTarget?.validationStatus ?? 'NOT_RUN').trim().toUpperCase() || 'NOT_RUN'}
              </Badge>
            </VmfDetailField>
            <VmfDetailField label="Lock Status">
              <Badge
                size="sm"
                variant={String(detailsTarget?.lockStatus ?? '').trim().toUpperCase() === 'LOCKED' ? 'warning' : getRuntimeStateVariant(detailsTarget?.lockStatus ?? 'UNLOCKED')}
                pill
              >
                {String(detailsTarget?.lockStatus ?? 'UNLOCKED').trim().toUpperCase() || 'UNLOCKED'}
              </Badge>
            </VmfDetailField>
            <VmfDetailField label="Snapshot Status">
              <Badge
                size="sm"
                variant={getRuntimeStateVariant(detailsTarget?.snapshotStatus ?? 'UNBOUND')}
                pill
              >
                {String(detailsTarget?.snapshotStatus ?? 'UNBOUND').trim().toUpperCase() || 'UNBOUND'}
              </Badge>
            </VmfDetailField>
            <VmfDetailField label="Migration Available">
              <Badge
                size="sm"
                variant={detailsTarget?.migrationAvailable === true ? 'success' : detailsTarget?.migrationAvailable === false ? 'neutral' : 'info'}
                pill
              >
                {formatBooleanLabel(detailsTarget?.migrationAvailable)}
              </Badge>
            </VmfDetailField>
          </dl>
        </Dialog.Body>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} size="sm">
        <Dialog.Header>
          <h2 className="maintain-vmfs__dialog-title">Delete VMF</h2>
        </Dialog.Header>
        <Dialog.Body className="maintain-vmfs__dialog-body">
          <p className="maintain-vmfs__dialog-text">
            Delete {deleteTarget?.name ?? 'this VMF'}? This action is a soft-delete and the row
            will be hidden until retention purge runs.
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            variant="outline"
            onClick={() => setDeleteTarget(null)}
            disabled={deleteResult.isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            loading={deleteResult.isLoading}
          >
            Delete VMF
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default MaintainVmfs
