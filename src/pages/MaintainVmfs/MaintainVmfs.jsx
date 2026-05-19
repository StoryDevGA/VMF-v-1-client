/**
 * VMF Workspace Page
 *
 * Customer-scoped VMF catalogue management for the selected tenant.
 * Aligns create/update/delete flows with lifecycle/versioning contracts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Accordion } from '../../components/Accordion'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
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
  useCreateVmfMutation,
  useDeleteVmfMutation,
  useListVmfFrameworkPackagesQuery,
  useListVmfsQuery,
  useUpdateVmfMutation,
} from '../../store/api/vmfApi.js'
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
  getRuntimeReadinessLabel,
  getRuntimeReadinessVariant,
} from '../../utils/runtimeWorkspace.js'
import { getSingleTenantDisplayName, getTenantId } from '../MaintainTenants/tenantUtils.js'
import './MaintainVmfs.css'

const VMF_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const VMF_LIFECYCLE_OPTIONS = [
  { value: '', label: 'All lifecycle states' },
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
  'Use the Actions menu to view details, edit VMFs, or schedule a soft-delete. Active VMFs must be disabled before deletion.'

const VMF_READ_ONLY_NOTE =
  "This workspace is read-only for your current access level. Use the Actions menu to view details; standard users and linked tenant members can review published VMFs only, while customer administrators and the selected tenant's assigned tenant admin can create, edit, or delete VMFs."

const READ_ONLY_VMF_LIFECYCLE = 'PUBLISHED'

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
  return version && label !== '--' ? `${label} / ${version}` : label
}

const getVmfId = (vmf) => String(vmf?.id ?? vmf?._id ?? '').trim()

const normalizeAccordionId = (value) =>
  String(value ?? 'vmf')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'vmf'

const getVmfCapacityCountLabel = (countMode) => {
  const normalizedCountMode = String(countMode ?? '').trim().toUpperCase()
  if (normalizedCountMode === 'NON_ARCHIVED') return 'non-archived'
  return 'active'
}

const parsePositiveInteger = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return null
  return parsed
}

const normalizeVmfCapacity = (rawCapacity, fallbackMaxVmfsPerTenant = null) => {
  const maxVmfs = parsePositiveInteger(
    rawCapacity?.maxVmfs
    ?? rawCapacity?.maxVmfsPerTenant
    ?? rawCapacity?.limit
    ?? fallbackMaxVmfsPerTenant,
  )
  const currentCountValue = Number(rawCapacity?.currentCount)
  const remainingCountValue = Number(rawCapacity?.remainingCount)
  const currentCount = Number.isFinite(currentCountValue) ? currentCountValue : null
  const remainingCount = Number.isFinite(remainingCountValue)
    ? remainingCountValue
    : Number.isFinite(maxVmfs) && Number.isFinite(currentCount)
      ? Math.max(maxVmfs - currentCount, 0)
      : null

  return {
    maxVmfs,
    currentCount,
    remainingCount,
    isAtCapacity:
      rawCapacity?.isAtCapacity === true
      || (Number.isFinite(maxVmfs) && Number.isFinite(currentCount) && currentCount >= maxVmfs),
    countMode: String(rawCapacity?.countMode ?? '').trim().toUpperCase() || 'ACTIVE',
  }
}

const getVmfCapacityGuidance = (vmfCapacity, { isLoading = false } = {}) => {
  if (!vmfCapacity && !isLoading) return null

  if (!vmfCapacity && isLoading) {
    return {
      tone: 'info',
      ariaLabel: 'Checking VMF capacity',
      displayValue: 'Checking...',
    }
  }

  const currentCount = vmfCapacity?.currentCount
  const remainingCount = vmfCapacity?.remainingCount
  const maxVmfs = vmfCapacity?.maxVmfs
  const countLabel = getVmfCapacityCountLabel(vmfCapacity?.countMode)
  const displayCount = Number.isFinite(remainingCount) ? Math.max(remainingCount, 0) : null
  const capacityNoun = `${countLabel} VMF slot${maxVmfs === 1 ? '' : 's'}`
  const visibleValue = displayCount !== null && maxVmfs !== null
    ? `${displayCount} of ${maxVmfs} left`
    : null

  const buildGuidance = (tone, label) => ({
    tone,
    ariaLabel: `${label}: ${visibleValue} in ${capacityNoun}`.trim(),
    displayValue: visibleValue,
  })

  if (vmfCapacity?.isAtCapacity && currentCount !== null && maxVmfs !== null) {
    return buildGuidance('warning', 'VMF capacity reached')
  }

  if (remainingCount === 1 && currentCount !== null && maxVmfs !== null) {
    return buildGuidance('warning', 'Final VMF slot')
  }

  if (currentCount !== null && remainingCount !== null && maxVmfs !== null) {
    return buildGuidance('info', 'VMF capacity')
  }

  return null
}

const getLifecycleOptionsForCurrentState = (value) => {
  const current = String(value ?? 'DRAFT').trim().toUpperCase()
  const allowed = VMF_LIFECYCLE_TRANSITIONS[current] ?? [current]

  return VMF_MUTATION_LIFECYCLE_OPTIONS.filter((option) => allowed.includes(option.value))
}

function renderVmfSummary(_value, row) {
  const name = String(row?.name ?? '').trim() || '--'

  return (
    <div className="maintain-vmfs__vmf-summary">
      <div className="maintain-vmfs__vmf-summary-header">
        <span className="maintain-vmfs__vmf-name">{name}</span>
      </div>
    </div>
  )
}

function renderDescriptionSummary(value) {
  const description = String(value ?? '').trim()
  if (!description) return '--'
  return <span className="maintain-vmfs__vmf-description">{description}</span>
}

function renderFrameworkSummary(_value, row) {
  const version = String(row?.frameworkVersion ?? '').trim() || '--'
  const packageLabel = getFrameworkPackageLabel(row)

  return (
    <div className="maintain-vmfs__framework-summary">
      <div className="maintain-vmfs__summary-pair">
        <span className="maintain-vmfs__summary-label">Version</span>
        <span className="maintain-vmfs__summary-value">{version}</span>
      </div>
      <div className="maintain-vmfs__summary-pair">
        <span className="maintain-vmfs__summary-label">Package</span>
        <span className="maintain-vmfs__summary-value">{packageLabel}</span>
      </div>
    </div>
  )
}

function renderRuntimeSummary(_value, row) {
  const completion = String(row?.completionState ?? '').trim().toUpperCase() || 'NOT_TRACKED'
  const validation = String(row?.validationStatus ?? '').trim().toUpperCase() || 'NOT_RUN'
  const lockStatus = String(row?.lockStatus ?? '').trim().toUpperCase() || 'UNLOCKED'
  const snapshotStatus = String(row?.snapshotStatus ?? '').trim().toUpperCase() || 'UNBOUND'
  const migration = formatBooleanLabel(row?.migrationAvailable)
  const executionState = getRuntimeExecutionState(row)
  const readiness = getRuntimeReadinessLabel(row)
  const runtimeItems = [
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
  const baseId = `runtime-${normalizeAccordionId(getVmfId(row) || row?.name || 'vmf')}`
  const rowLabel = String(row?.name ?? getVmfId(row) ?? 'VMF').trim() || 'VMF'

  return (
    <Accordion
      variant="default"
      rounded={false}
      className="maintain-vmfs__runtime-accordion"
    >
      {runtimeItems.map((item) => {
        const itemId = `${baseId}-${normalizeAccordionId(item.label)}`

        return (
          <Accordion.Item id={itemId} key={item.label}>
            <Accordion.Header
              itemId={itemId}
              className="maintain-vmfs__runtime-accordion-header"
              aria-label={`${item.label} runtime evidence for ${rowLabel}`}
            >
              {item.label}
            </Accordion.Header>
            <Accordion.Content
              itemId={itemId}
              className="maintain-vmfs__runtime-accordion-content"
            >
              <Badge size="sm" variant={item.variant} pill>
                {item.value}
              </Badge>
            </Accordion.Content>
          </Accordion.Item>
        )
      })}
    </Accordion>
  )
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

  const [createVmf, createResult] = useCreateVmfMutation()
  const [updateVmf, updateResult] = useUpdateVmfMutation()
  const [deleteVmf, deleteResult] = useDeleteVmfMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const currentPage = Number(meta.page) || page
  const totalPages = Number(meta.totalPages) || 1
  const totalCount = Number(meta.total) || 0

  const listAppError = listError ? normalizeError(listError) : null
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

  const vmfCapacity = useMemo(() => {
    if (!canCreateVmfs) return null

    const metaCapacity = meta?.vmfCapacity
    if (metaCapacity && typeof metaCapacity === 'object') {
      return normalizeVmfCapacity(metaCapacity, maxVmfsPerTenant)
    }

    return null
  }, [canCreateVmfs, maxVmfsPerTenant, meta?.vmfCapacity])

  const vmfCapacityGuidance = useMemo(
    () => getVmfCapacityGuidance(vmfCapacity, { isLoading: isFetching && canCreateVmfs }),
    [canCreateVmfs, isFetching, vmfCapacity],
  )
  const isCreateBlockedByCapacity = vmfCapacity?.isAtCapacity === true
  const workspaceTableNote = canMutateVmfs ? VMF_LIFECYCLE_NOTE : VMF_READ_ONLY_NOTE

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
    if (!canCreateVmfs) return
    setCreateErrors({})
    setCreateForm((current) => ({
      ...current,
      frameworkPackageId:
        defaultFrameworkPackageOption?.value
        || (frameworkPackageOptions.length === 1 ? frameworkPackageOptions[0].value : ''),
    }))
    setCreateOpen(true)
  }, [canCreateVmfs, defaultFrameworkPackageOption, frameworkPackageOptions])

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

  const columns = useMemo(
    () => [
      {
        key: 'vmfSummary',
        label: 'VMF',
        mobileLabel: 'VMF',
        width: '15%',
        render: renderVmfSummary,
      },
      {
        key: 'description',
        label: 'Description',
        mobileLabel: 'Description',
        width: '20%',
        render: renderDescriptionSummary,
      },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        width: '9%',
        render: (value) => {
          const status = String(value ?? '').trim().toUpperCase() || 'UNKNOWN'
          return (
            <Status size="sm" showIcon variant={getOperationalStatusVariant(status)}>
              {status.toLowerCase()}
            </Status>
          )
        },
      },
      {
        key: 'lifecycleStatus',
        label: 'Lifecycle',
        mobileLabel: 'Lifecycle',
        width: '10%',
        render: (value) => {
          const lifecycle = String(value ?? '').trim().toUpperCase() || 'DRAFT'
          return (
            <Badge size="sm" variant={getLifecycleVariant(lifecycle)} pill>
              {lifecycle}
            </Badge>
          )
        },
      },
      {
        key: 'frameworkSummary',
        label: 'Framework',
        mobileLabel: 'Framework',
        width: '15%',
        render: renderFrameworkSummary,
      },
      {
        key: 'runtimeSummary',
        label: 'Runtime State',
        mobileLabel: 'Runtime State',
        width: '14%',
        render: renderRuntimeSummary,
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        mobileLabel: 'Updated',
        width: '9%',
        render: (value) => <TableDateTime value={value} />,
      },
      ...(showRowActionsColumn
        ? [
          {
            key: 'rowActions',
            label: 'Actions',
            mobileLabel: 'Actions',
            align: 'center',
            width: '10%',
            render: (_value, row) => (
              <VmfRowActionsMenu row={row} actions={rowActions} onAction={handleRowAction} />
            ),
          },
        ]
        : []),
    ],
    [handleRowAction, rowActions, showRowActionsColumn],
  )
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
      if (!frameworkPackageId) {
        nextErrors.frameworkPackageId = 'Framework package is required.'
      } else if (!frameworkPackageOptions.some((option) => option.value === frameworkPackageId)) {
        nextErrors.frameworkPackageId = 'Select an available framework package.'
      }

      if (Object.keys(nextErrors).length > 0) {
        setCreateErrors(nextErrors)
        return
      }

      try {
        const response = await createVmf({
          customerId,
          tenantId,
          body: {
            name,
            frameworkPackageId,
            ...(description ? { description } : {}),
          },
        }).unwrap()

        const createdVmf = response?.data ?? {}
        const createdName = String(createdVmf?.name ?? name)
        const frameworkVersion = String(createdVmf?.frameworkVersion ?? '').trim()

        addToast({
          title: 'VMF created',
          description: frameworkVersion
            ? `${createdName} started in Draft on framework ${frameworkVersion}.`
            : `${createdName} started in Draft lifecycle.`,
          variant: 'success',
        })

        closeCreateDialog()
        setPage(1)
      } catch (error) {
        const appError = normalizeError(error)

        if (isGovernanceLimitConflictError(appError, 'VMF_LIMIT_REACHED')) {
          addToast({
            title: 'VMF capacity reached',
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
          title: 'Failed to create VMF',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [
      addToast,
      closeCreateDialog,
      createForm.description,
      createForm.frameworkPackageId,
      createForm.name,
      createVmf,
      customerId,
      frameworkPackageOptions,
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
    <section className="maintain-vmfs container" aria-label="VMF workspace">
      <header className="maintain-vmfs__header">
        <h1 className="maintain-vmfs__title">VMF Workspace</h1>
        <p className="maintain-vmfs__subtitle">
          {canMutateVmfs ? 'Manage' : 'Review'} VMF lifecycle, version snapshot metadata, and
          workspace scope for{` ${workspaceScopeName}.`}
        </p>
      </header>

      <Fieldset className="maintain-vmfs__fieldset">
        <Fieldset.Legend className="sr-only">VMF catalogue</Fieldset.Legend>
        <Card variant="elevated" className="maintain-vmfs__card">
          <Card.Body className="maintain-vmfs__card-body maintain-vmfs__card-body--compact">
            <div
              className="maintain-vmfs__catalogue-actions"
              role="group"
              aria-label="VMF catalogue actions"
            >
              <div className="maintain-vmfs__catalogue-buttons">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBackToHome}
                >
                  Back
                </Button>
                {canCreateVmfs ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={openCreateDialog}
                    disabled={isMutationLoading || isCreateBlockedByCapacity}
                  >
                    Create
                  </Button>
                ) : null}
              </div>
              {canCreateVmfs && vmfCapacityGuidance ? (
                <Status
                  variant={vmfCapacityGuidance.tone === 'warning' ? 'warning' : 'info'}
                  size="sm"
                  showIcon
                  className="maintain-vmfs__capacity-status"
                  aria-label={vmfCapacityGuidance.ariaLabel}
                >
                  {vmfCapacityGuidance.displayValue}
                </Status>
              ) : null}
            </div>

            <div className="maintain-vmfs__toolbar">
              <Input
                id="vmf-search"
                label="Search"
                size="sm"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search by name or description"
                fullWidth
              />
              <Select
                id="vmf-status-filter"
                label="Status"
                size="sm"
                value={statusFilter}
                options={VMF_STATUS_OPTIONS}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setPage(1)
                }}
              />
              <Select
                id="vmf-lifecycle-filter"
                label="Lifecycle"
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

            {listAppError && !inactiveCustomerAppError && !licenceAppError ? (
              <ErrorSupportPanel error={listAppError} context="maintain-vmfs-list" />
            ) : null}

            <p className="maintain-vmfs__table-note">{workspaceTableNote}</p>

            <HorizontalScroll
              className="maintain-vmfs__table-wrap"
              ariaLabel="VMF table"
              gap="sm"
            >
              <Table
                className="maintain-vmfs__table"
                columns={columns}
                data={rows}
                loading={isLoading}
                hoverable
                variant="striped"
                emptyMessage="No VMFs found."
                ariaLabel="VMF catalogue"
              />
            </HorizontalScroll>

            {isFetching && !isLoading ? (
              <p className="maintain-vmfs__muted">Refreshing list...</p>
            ) : null}

            {totalPages > 1 ? (
              <div className="maintain-vmfs__pagination" role="navigation" aria-label="VMF pagination">
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
                  Page {currentPage} of {totalPages}
                  {totalCount > 0 ? ` (${totalCount} VMFs)` : ''}
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
          </Card.Body>
        </Card>
      </Fieldset>

      <Dialog open={createOpen} onClose={closeCreateDialog} size="md">
        <Dialog.Header>
          <h2 className="maintain-vmfs__dialog-title">Create VMF</h2>
        </Dialog.Header>
        <Dialog.Body className="maintain-vmfs__dialog-body">
          <form className="maintain-vmfs__form" onSubmit={handleCreateSubmit} noValidate>
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
              label="Framework Package"
              value={createForm.frameworkPackageId}
              placeholder={
                isFrameworkPackageSelectionLoading
                  ? 'Loading framework packages...'
                  : 'Select a framework package'
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
                  ? 'Select the active package this VMF workspace will snapshot at creation.'
                  : 'No active VMF framework packages are available for this customer.'
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
              New VMFs start as <strong>DRAFT</strong>. Framework package and version are
              snapshotted from the selected active package at creation.
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
            <VmfDetailField label="Framework Package">
              {getFrameworkPackageLabel(detailsTarget)}
            </VmfDetailField>
            <VmfDetailField label="Framework Package Id">
              {String(detailsTarget?.frameworkPackageId ?? '--').trim() || '--'}
            </VmfDetailField>
            <VmfDetailField label="Framework Package Status">
              <Badge
                size="sm"
                variant={getRuntimeStateVariant(getFrameworkPackageDetail(detailsTarget, 'status') || '')}
                pill
              >
                {getFrameworkPackageDetail(detailsTarget, 'status') || '--'}
              </Badge>
            </VmfDetailField>
            <VmfDetailField label="Framework Package Version">
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
