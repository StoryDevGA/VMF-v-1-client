/**
 * Bulk User Operations
 *
 * Covers FRONTEND-SPEC bulk requirements:
 * - Bulk create (CSV upload or manual rows, max 100)
 * - Field mapping and preview
 * - Bulk update (roles / tenant visibility)
 * - Bulk disable for selected users
 * - Progress indicator + detailed batch results
 *
 * @param {Object}   props
 * @param {boolean}  props.open              — controls dialog visibility
 * @param {Function} props.onClose           — called when the dialog closes
 * @param {string}   props.customerId        — customer scope for bulk endpoints
 * @param {string[]} [props.selectedUserIds]  — pre-selected user IDs for update/disable
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { Button } from '../../components/Button'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Select } from '../../components/Select'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { Status } from '../../components/Status'
import { useToaster } from '../../components/Toaster'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import {
  useBulkCreateUsersMutation,
  useBulkDisableUsersMutation,
  useBulkUpdateUsersMutation,
} from '../../store/api/userApi.js'
import {
  normalizeError,
  isCanonicalAdminConflictError,
  getCanonicalAdminConflictMessage,
} from '../../utils/errors.js'
import './BulkUserOperations.css'

const OPERATION_OPTIONS = [
  { value: 'create', label: 'Bulk Create' },
  { value: 'update', label: 'Bulk Update' },
  { value: 'disable', label: 'Bulk Disable' },
]

const SOURCE_OPTIONS = [
  { value: 'csv', label: 'CSV Upload' },
  { value: 'manual', label: 'Manual Entry' },
]

const BULK_LIMIT = 100

const BULK_EDITABLE_ROLES = ['TENANT_ADMIN', 'USER']
const GOVERNED_CUSTOMER_ADMIN_ROLE = 'CUSTOMER_ADMIN'

const BULK_CUSTOMER_ADMIN_GOVERNANCE_MESSAGE =
  'Bulk operations cannot assign or remove Customer Admin ownership. Use Transfer Ownership from Edit Users after the replacement user is active.'

const BULK_CREATE_TENANT_VISIBILITY_GUIDANCE =
  'Use current tenant IDs or exact tenant names separated by |. Preview resolves valid values to canonical tenant IDs before submit.'

const BULK_CREATE_TENANT_REFERENCE_EMPTY_MESSAGE =
  'No selectable tenants are currently available for this customer.'

const BULK_CREATE_TENANT_REFERENCE_LOADING_MESSAGE =
  'Loading current tenant references...'

const BULK_CREATE_TENANT_REFERENCE_ERROR_MESSAGE =
  'Tenant references could not be loaded. Leave tenantVisibility blank until that error is resolved.'

const BULK_TENANT_VISIBILITY_GUIDANCE =
  'Apply the same tenant visibility set to every selected user. Choose Replace to set explicit tenant visibility, or Clear to remove stored explicit tenant visibility.'

const BULK_TENANT_VISIBILITY_SERVICE_PROVIDER_HINT =
  'This customer uses guided tenant visibility for multi-tenant access.'

const BULK_TENANT_VISIBILITY_EMPTY_OPTIONS_MESSAGE =
  'No selectable tenants are currently available for this customer.'

const BULK_TENANT_VISIBILITY_PRESERVED_MESSAGE =
  'Selected tenants that are no longer selectable stay preserved until you remove them.'

const BULK_UPDATE_ROLE_GUIDANCE =
  'Select the roles to apply to every selected user. Leave all roles cleared if you only want to change tenant visibility.'

const BULK_TENANT_VISIBILITY_MODE_OPTIONS = [
  { value: 'unchanged', label: 'Leave tenant visibility unchanged' },
  { value: 'replace', label: 'Replace with selected tenants' },
  { value: 'clear', label: 'Clear explicit tenant visibility' },
]

const getTopologyAwareRoles = (roles, topology) => {
  const normalizedTopology = String(topology ?? '')
    .trim()
    .toUpperCase()

  if (normalizedTopology === 'MULTI_TENANT') {
    return roles
  }

  return roles.filter((role) => role !== 'TENANT_ADMIN')
}

const getSupportedBulkRolesMessage = (roles) =>
  `Supported bulk roles: ${roles.join(', ')}.`

const getBulkCreateCsvHelperText = (supportsTenantVisibility, supportedRolesMessage) =>
  supportsTenantVisibility
    ? `Include headers for name, email, roles, and optional tenantVisibility. ${BULK_CREATE_TENANT_VISIBILITY_GUIDANCE} ${supportedRolesMessage}`
    : `Include headers for name, email, and roles. ${supportedRolesMessage}`

const getBulkCreateManualHelperText = (supportsTenantVisibility, supportedRolesMessage) =>
  supportsTenantVisibility
    ? `One row per line: name,email,roles,tenantVisibility (roles/tenants separated by |). ${BULK_CREATE_TENANT_VISIBILITY_GUIDANCE} ${supportedRolesMessage}`
    : `One row per line: name,email,roles. ${supportedRolesMessage}`

const getBulkCreateExampleTenantValues = (selectableTenants) => {
  const firstTenantId = selectableTenants[0]?.id ?? 'tenant-id-1'
  const secondTenantId = selectableTenants[1]?.id ?? null

  return {
    singleTenantValue: firstTenantId,
    multiTenantValue: secondTenantId ? `${firstTenantId}|${secondTenantId}` : firstTenantId,
  }
}

const getBulkCreateExampleRows = (supportsTenantVisibility, selectableTenants) => {
  if (!supportsTenantVisibility) {
    return [
      'Avery North,avery.north@example.com,USER',
      'Taylor Reed,taylor.reed@example.com,USER',
    ].join('\n')
  }

  const { singleTenantValue, multiTenantValue } =
    getBulkCreateExampleTenantValues(selectableTenants)

  return [
    `Avery North,avery.north@example.com,USER,${multiTenantValue}`,
    `Taylor Tenant,taylor.tenant@example.com,TENANT_ADMIN,${singleTenantValue}`,
  ].join('\n')
}

const getBulkCreateExampleCsvContent = (supportsTenantVisibility, selectableTenants) => {
  if (!supportsTenantVisibility) {
    return [
      'name,email,roles',
      'Avery North,avery.north@example.com,USER',
      'Taylor Reed,taylor.reed@example.com,USER',
    ].join('\n')
  }

  const { singleTenantValue, multiTenantValue } =
    getBulkCreateExampleTenantValues(selectableTenants)

  return [
    'name,email,roles,tenantVisibility',
    `Avery North,avery.north@example.com,USER,${multiTenantValue}`,
    `Taylor Tenant,taylor.tenant@example.com,TENANT_ADMIN,${singleTenantValue}`,
  ].join('\n')
}

const getBulkCreateExampleFilename = (supportsTenantVisibility) =>
  supportsTenantVisibility
    ? 'bulk-create-users-multi-tenant-example.csv'
    : 'bulk-create-users-single-tenant-example.csv'

function getBulkCompletionToast(actionLabel, resultSummary) {
  if (resultSummary.failed === 0) {
    return {
      title: `${actionLabel} completed`,
      description: `${resultSummary.success} succeeded. Review batch results below if you need the row-level detail.`,
      variant: 'success',
    }
  }

  if (resultSummary.success === 0) {
    return {
      title: `${actionLabel} failed`,
      description: `No rows succeeded. Review batch results below and correct the failing rows before retrying.`,
      variant: 'error',
    }
  }

  return {
    title: `${actionLabel} completed with issues`,
    description: `${resultSummary.success} succeeded and ${resultSummary.failed} failed. Review batch results below before retrying the failed rows.`,
    variant: 'warning',
  }
}

function getBulkResultSummaryMessage(operation, resultSummary) {
  if (!resultSummary) return ''

  const actionLabel =
    operation === 'update'
      ? 'updated'
      : operation === 'disable'
      ? 'disabled'
      : 'created'

  if (resultSummary.failed === 0) {
    return `All ${resultSummary.success} rows were ${actionLabel} successfully.`
  }

  if (resultSummary.success === 0) {
    return `No rows were ${actionLabel}. Review the failures below before retrying.`
  }

  return `${resultSummary.success} rows were ${actionLabel}, and ${resultSummary.failed} need attention before retrying.`
}

const BULK_CREATE_AUTOFILL_PROPS = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'none',
  spellCheck: false,
}

function resolveAvailableOperationOptions(availableOperations = []) {
  const allowedOperations = new Set(
    availableOperations
      .map((operation) => String(operation ?? '').trim().toLowerCase())
      .filter(Boolean),
  )

  if (allowedOperations.size === 0) {
    return OPERATION_OPTIONS
  }

  return OPERATION_OPTIONS.filter((option) => allowedOperations.has(option.value))
}

function getDefaultOperation(initialOperation, availableOperationOptions) {
  const normalizedInitialOperation = String(initialOperation ?? '').trim().toLowerCase()
  const matchingInitialOperation = availableOperationOptions.find(
    (option) => option.value === normalizedInitialOperation,
  )

  return matchingInitialOperation?.value ?? availableOperationOptions[0]?.value ?? 'create'
}

function getLockedDialogTitle(operation) {
  if (operation === 'update') return 'Bulk Update Users'
  if (operation === 'disable') return 'Bulk Disable Users'
  return 'Bulk Create Users'
}

function getDialogSubtitle({ isOperationLocked, operation, selectedCount }) {
  if (!isOperationLocked) {
    return `Run batched user actions (maximum ${BULK_LIMIT} users per request).`
  }

  if (operation === 'update') {
    return `Apply the same contract-approved changes to ${selectedCount} selected ${selectedCount === 1 ? 'user' : 'users'}.`
  }

  if (operation === 'disable') {
    return `Disable ${selectedCount} selected ${selectedCount === 1 ? 'user' : 'users'} from this customer workspace.`
  }

  return `Import or type up to ${BULK_LIMIT} users in this batch.`
}

function BulkGovernanceNote({ supportedRolesMessage }) {
  return (
    <div
      className="bulk-users__governance"
      role="note"
      aria-label="Customer Admin governance guidance"
    >
      <p className="bulk-users__governance-title">Customer Admin governance</p>
      <p className="bulk-users__governance-text">{BULK_CUSTOMER_ADMIN_GOVERNANCE_MESSAGE}</p>
      <p className="bulk-users__governance-text">{supportedRolesMessage}</p>
    </div>
  )
}

function getRestrictedBulkRoleRows(users, rowOffset = 1) {
  return users.flatMap((user, index) =>
    user.roles.includes(GOVERNED_CUSTOMER_ADMIN_ROLE) ? [index + rowOffset] : [],
  )
}

function getBulkGovernanceErrorMessage(rowNumbers = []) {
  if (rowNumbers.length === 0) {
    return BULK_CUSTOMER_ADMIN_GOVERNANCE_MESSAGE
  }

  const rowLabel =
    rowNumbers.length === 1
      ? `row ${rowNumbers[0]}`
      : `rows ${rowNumbers.join(', ')}`

  return `Bulk operations cannot assign or remove Customer Admin ownership. Remove CUSTOMER_ADMIN from ${rowLabel} and retry. Use Transfer Ownership from Edit Users after the replacement user is active.`
}

function getUnsupportedBulkRoles(roles, supportedRoles) {
  return roles.filter(
    (role) => role !== GOVERNED_CUSTOMER_ADMIN_ROLE && !supportedRoles.includes(role),
  )
}

function getUnsupportedBulkRoleRows(users, supportedRoles, rowOffset = 1) {
  return users.flatMap((user, index) =>
    getUnsupportedBulkRoles(user.roles, supportedRoles).length > 0 ? [index + rowOffset] : [],
  )
}

function getUnsupportedBulkRolesMessage(supportedRoles, rowNumbers = []) {
  const rowLabel =
    rowNumbers.length === 0
      ? 'this customer'
      : rowNumbers.length === 1
      ? `row ${rowNumbers[0]}`
      : `rows ${rowNumbers.join(', ')}`

  return `Bulk role updates for ${rowLabel} only support ${supportedRoles.join(', ')}. Remove unsupported roles and retry.`
}

function formatRoleLabel(role) {
  return String(role ?? '')
    .trim()
    .replace(/_/g, ' ')
}

function getBulkUpdateReadinessMessage({
  selectedCount,
  selectedRoles,
  shouldShowTenantVisibilityUpdate,
  bulkTenantVisibilityMode,
  normalizedSelectedBulkTenantVisibility,
  isLoadingTenants,
  normalizedTenantsError,
}) {
  if (selectedCount === 0) {
    return 'Select at least one user before applying a bulk update.'
  }

  if (isLoadingTenants && bulkTenantVisibilityMode === 'replace') {
    return 'Tenant options are still loading before this replace change can be applied.'
  }

  if (normalizedTenantsError && bulkTenantVisibilityMode === 'replace') {
    return 'Tenant options could not be loaded. Resolve that error before applying a replace change.'
  }

  if (
    shouldShowTenantVisibilityUpdate
    && bulkTenantVisibilityMode === 'replace'
    && normalizedSelectedBulkTenantVisibility.length === 0
  ) {
    return 'Select at least one tenant before replacing tenant visibility.'
  }

  if (
    selectedRoles.length === 0
    && (!shouldShowTenantVisibilityUpdate || bulkTenantVisibilityMode === 'unchanged')
  ) {
    return shouldShowTenantVisibilityUpdate
      ? 'Choose at least one role or tenant visibility change before updating selected users.'
      : 'Choose at least one role before updating selected users.'
  }

  return 'Ready to apply the selected changes to every selected user.'
}

function parseCsvLine(line) {
  const out = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      out.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  out.push(current.trim())
  return out
}

function normalizeBulkResponse(payload) {
  const data = payload?.data ?? payload ?? {}
  const summary = data.summary ?? {}
  const results = data.results ?? data.items ?? []

  const summarySuccess = summary.success ?? summary.successCount
  const summaryFailed = summary.failed ?? summary.failureCount
  const summaryTotal = summary.total

  const success = summarySuccess != null
    ? Number(summarySuccess)
    : results.filter((item) => item.success).length
  const failed = summaryFailed != null
    ? Number(summaryFailed)
    : results.filter((item) => !item.success).length
  const total = summaryTotal != null
    ? Number(summaryTotal)
    : success + failed

  return {
    total,
    success,
    failed,
    results,
  }
}

function parseRoles(value) {
  return value
    .split(/[|,;]+/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean)
}

function parseTenantVisibility(value) {
  return value
    .split(/[|,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function normalizeTenantLookupValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeTenantVisibilityIds(tenantIds) {
  return [...new Set((tenantIds ?? []).map((tenantId) => String(tenantId ?? '').trim()).filter(Boolean))]
}

function getTenantId(tenant) {
  return String(tenant?.id ?? tenant?._id ?? '').trim()
}

function normalizeTenantOption(tenant) {
  const id = getTenantId(tenant)

  return {
    id,
    name: String(tenant?.name ?? id ?? '--').trim() || '--',
    status: String(tenant?.status ?? 'UNKNOWN').trim().toUpperCase(),
    isSelectable: tenant?.isSelectable === true,
    isDefault: tenant?.isDefault === true,
    selectionState: String(tenant?.selectionState ?? '').trim().toUpperCase(),
  }
}

function buildTenantResolutionIndex(selectableTenants) {
  const byId = new Map()
  const byName = new Map()

  for (const tenant of selectableTenants) {
    const id = String(tenant?.id ?? '').trim()
    const name = String(tenant?.name ?? '').trim()
    const normalizedId = normalizeTenantLookupValue(id)
    const normalizedName = normalizeTenantLookupValue(name)

    if (normalizedId) {
      byId.set(normalizedId, id)
    }

    if (normalizedName) {
      const currentIds = byName.get(normalizedName) ?? []
      if (!currentIds.includes(id)) {
        byName.set(normalizedName, [...currentIds, id])
      }
    }
  }

  return { byId, byName }
}

function resolveTenantVisibilityValues(values, tenantResolutionIndex) {
  const resolvedIds = []
  const invalidValues = []
  const ambiguousValues = []

  for (const value of values) {
    const normalizedValue = normalizeTenantLookupValue(value)
    if (!normalizedValue) continue

    if (tenantResolutionIndex.byId.has(normalizedValue)) {
      resolvedIds.push(tenantResolutionIndex.byId.get(normalizedValue))
      continue
    }

    const matchingNames = tenantResolutionIndex.byName.get(normalizedValue) ?? []
    if (matchingNames.length === 1) {
      resolvedIds.push(matchingNames[0])
      continue
    }

    if (matchingNames.length > 1) {
      ambiguousValues.push(String(value).trim())
      continue
    }

    invalidValues.push(String(value).trim())
  }

  return {
    resolvedIds: normalizeTenantVisibilityIds(resolvedIds),
    invalidValues: [...new Set(invalidValues)],
    ambiguousValues: [...new Set(ambiguousValues)],
  }
}

function formatTenantRowIssues(rowIssues) {
  return rowIssues
    .map(({ row, values }) => `row ${row}: ${values.join(', ')}`)
    .join('; ')
}

function getBulkCreateTenantVisibilityError({
  invalidRows,
  ambiguousRows,
  selectableTenants,
  needsTenantCatalog,
}) {
  if (needsTenantCatalog) {
    return 'Tenant visibility values require the current tenant catalog. Wait for tenant references to load or remove tenantVisibility values and retry.'
  }

  if (selectableTenants.length === 0) {
    return 'No selectable tenants are currently available for this customer. Remove tenantVisibility values and retry.'
  }

  const errorParts = []

  if (invalidRows.length > 0) {
    errorParts.push(
      `Tenant visibility values must use current tenant IDs or exact tenant names from this customer. Invalid values in ${formatTenantRowIssues(invalidRows)}.`,
    )
  }

  if (ambiguousRows.length > 0) {
    errorParts.push(
      `Ambiguous tenant names were found in ${formatTenantRowIssues(ambiguousRows)}. Use the tenant ID instead.`,
    )
  }

  return errorParts.join(' ')
}

function resolveBulkCreateTenantVisibility({
  users,
  rowOffset,
  shouldShowTenantVisibilityUpdate,
  selectableTenants,
  tenantResolutionIndex,
  canResolveTenantVisibility,
}) {
  if (!shouldShowTenantVisibilityUpdate) {
    return { users }
  }

  const hasTenantVisibilityValues = users.some((user) => (user.tenantVisibility?.length ?? 0) > 0)
  if (!hasTenantVisibilityValues) {
    return { users }
  }

  if (!canResolveTenantVisibility) {
    return {
      users: [],
      errorMessage: getBulkCreateTenantVisibilityError({
        invalidRows: [],
        ambiguousRows: [],
        selectableTenants,
        needsTenantCatalog: true,
      }),
    }
  }

  const invalidRows = []
  const ambiguousRows = []
  const normalizedUsers = users.map((user, index) => {
    const resolved = resolveTenantVisibilityValues(user.tenantVisibility ?? [], tenantResolutionIndex)

    if (resolved.invalidValues.length > 0) {
      invalidRows.push({
        row: index + rowOffset,
        values: resolved.invalidValues,
      })
    }

    if (resolved.ambiguousValues.length > 0) {
      ambiguousRows.push({
        row: index + rowOffset,
        values: resolved.ambiguousValues,
      })
    }

    return {
      ...user,
      tenantVisibility: resolved.resolvedIds,
    }
  })

  if (invalidRows.length > 0 || ambiguousRows.length > 0) {
    return {
      users: [],
      errorMessage: getBulkCreateTenantVisibilityError({
        invalidRows,
        ambiguousRows,
        selectableTenants,
        needsTenantCatalog: false,
      }),
    }
  }

  return { users: normalizedUsers }
}

function BulkUserOperations({
  open,
  onClose,
  customerId,
  selectedUserIds = [],
  initialOperation = 'create',
  availableOperations = OPERATION_OPTIONS.map((option) => option.value),
}) {
  const { addToast } = useToaster()
  const {
    customerId: activeCustomerId,
    tenants: tenantRows,
    tenantVisibilityMeta,
    selectedCustomerTopology,
    isLoadingTenants: rawIsLoadingTenants,
    tenantsError,
  } = useTenantContext()
  const [bulkCreateUsers, bulkCreateResult] = useBulkCreateUsersMutation()
  const [bulkUpdateUsers, bulkUpdateResult] = useBulkUpdateUsersMutation()
  const [bulkDisableUsers, bulkDisableResult] = useBulkDisableUsersMutation()
  const availableOperationOptions = useMemo(
    () => resolveAvailableOperationOptions(availableOperations),
    [availableOperations],
  )
  const defaultOperation = useMemo(
    () => getDefaultOperation(initialOperation, availableOperationOptions),
    [availableOperationOptions, initialOperation],
  )

  const [operation, setOperation] = useState(defaultOperation)
  const [sourceMode, setSourceMode] = useState('csv')
  const [csvText, setCsvText] = useState('')
  const [manualText, setManualText] = useState('')
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({
    name: '',
    email: '',
    roles: '',
    tenantVisibility: '',
  })
  const [previewUsers, setPreviewUsers] = useState([])
  const [fieldError, setFieldError] = useState('')
  const [progressLabel, setProgressLabel] = useState('')
  const [progressValue, setProgressValue] = useState(0)
  const [resultSummary, setResultSummary] = useState(null)
  const [selectedBulkRoles, setSelectedBulkRoles] = useState([])
  const [bulkTenantVisibilityMode, setBulkTenantVisibilityMode] = useState('unchanged')
  const [selectedBulkTenantVisibility, setSelectedBulkTenantVisibility] = useState([])
  const previewSectionRef = useRef(null)
  const resultsSectionRef = useRef(null)

  const isProcessing =
    bulkCreateResult.isLoading ||
    bulkUpdateResult.isLoading ||
    bulkDisableResult.isLoading

  const isSelectionRequiredOperation =
    operation === 'update' || operation === 'disable'
  const isOperationLocked = availableOperationOptions.length === 1

  const selectedCount = selectedUserIds.length

  const isCustomerContextAligned =
    !customerId
    || !activeCustomerId
    || String(customerId) === String(activeCustomerId)

  const tenants = useMemo(
    () => (isCustomerContextAligned ? tenantRows.map(normalizeTenantOption).filter((tenant) => tenant.id) : []),
    [isCustomerContextAligned, tenantRows],
  )

  const normalizedTenantsError = useMemo(
    () => (tenantsError ? normalizeError(tenantsError) : null),
    [tenantsError],
  )

  const effectiveTenantVisibilityMeta = isCustomerContextAligned ? tenantVisibilityMeta : null
  const effectiveCustomerTopology = isCustomerContextAligned ? selectedCustomerTopology : ''
  const isLoadingTenants = isCustomerContextAligned ? rawIsLoadingTenants : false
  const shouldShowTenantVisibilityUpdate =
    effectiveTenantVisibilityMeta?.allowed === true
    && effectiveTenantVisibilityMeta?.topology === 'MULTI_TENANT'
  const shouldSuppressTenantVisibilityHint =
    effectiveTenantVisibilityMeta?.topology === 'SINGLE_TENANT'
  const supportedBulkRoles = useMemo(
    () => getTopologyAwareRoles(BULK_EDITABLE_ROLES, effectiveCustomerTopology),
    [effectiveCustomerTopology],
  )
  const supportedBulkRolesMessage = useMemo(
    () => getSupportedBulkRolesMessage(supportedBulkRoles),
    [supportedBulkRoles],
  )
  const normalizedSelectedBulkTenantVisibility = useMemo(
    () => normalizeTenantVisibilityIds(selectedBulkTenantVisibility),
    [selectedBulkTenantVisibility],
  )

  const tenantLookup = useMemo(
    () => new Map(tenants.map((tenant) => [tenant.id, tenant])),
    [tenants],
  )

  const selectableTenantOptions = useMemo(
    () => tenants.filter((tenant) => tenant.isSelectable),
    [tenants],
  )

  const tenantResolutionIndex = useMemo(
    () => buildTenantResolutionIndex(selectableTenantOptions),
    [selectableTenantOptions],
  )

  const canResolveBulkCreateTenantVisibility =
    shouldShowTenantVisibilityUpdate
      ? !isLoadingTenants && !normalizedTenantsError
      : true

  const bulkCreateExampleRows = useMemo(
    () => getBulkCreateExampleRows(shouldShowTenantVisibilityUpdate, selectableTenantOptions),
    [selectableTenantOptions, shouldShowTenantVisibilityUpdate],
  )
  const bulkCreateExampleCsvContent = useMemo(
    () => getBulkCreateExampleCsvContent(shouldShowTenantVisibilityUpdate, selectableTenantOptions),
    [selectableTenantOptions, shouldShowTenantVisibilityUpdate],
  )
  const bulkCreateExampleFilename = useMemo(
    () => getBulkCreateExampleFilename(shouldShowTenantVisibilityUpdate),
    [shouldShowTenantVisibilityUpdate],
  )

  const resolvedSelectedTenants = useMemo(
    () => normalizedSelectedBulkTenantVisibility.map((tenantId) => {
      const matchedTenant = tenantLookup.get(tenantId)
      if (matchedTenant) return matchedTenant

      return {
        id: tenantId,
        name: tenantId,
        status: 'UNKNOWN',
        isSelectable: false,
        isDefault: false,
        selectionState: 'MISSING',
      }
    }),
    [normalizedSelectedBulkTenantVisibility, tenantLookup],
  )

  const preservedSelectedTenants = useMemo(
    () => resolvedSelectedTenants.filter((tenant) => !tenant.isSelectable),
    [resolvedSelectedTenants],
  )

  const resetState = useCallback(() => {
    setOperation(defaultOperation)
    setSourceMode('csv')
    setCsvText('')
    setManualText('')
    setHeaders([])
    setMapping({ name: '', email: '', roles: '', tenantVisibility: '' })
    setPreviewUsers([])
    setFieldError('')
    setProgressLabel('')
    setProgressValue(0)
    setResultSummary(null)
    setSelectedBulkRoles([])
    setBulkTenantVisibilityMode('unchanged')
    setSelectedBulkTenantVisibility([])
  }, [defaultOperation])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [onClose, resetState])

  useEffect(() => {
    if (shouldShowTenantVisibilityUpdate) return

    setBulkTenantVisibilityMode('unchanged')
    setSelectedBulkTenantVisibility([])
  }, [shouldShowTenantVisibilityUpdate])

  useEffect(() => {
    setSelectedBulkRoles((prev) => {
      const next = prev.filter((role) => supportedBulkRoles.includes(role))
      return next.length === prev.length ? prev : next
    })
  }, [supportedBulkRoles])

  useEffect(() => {
    if (!open) return

    setOperation(defaultOperation)
  }, [defaultOperation, open])

  const startProgress = useCallback((label) => {
    setProgressLabel(label)
    setProgressValue(15)
  }, [])

  const finishProgress = useCallback(() => {
    setProgressValue(100)
  }, [])

  const revealSection = useCallback((sectionRef) => {
    if (!sectionRef?.current) return

    const prefersReducedMotion =
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (typeof sectionRef.current.scrollIntoView === 'function') {
      sectionRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    }

    if (typeof sectionRef.current.focus === 'function') {
      sectionRef.current.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    if (!open || operation !== 'create' || previewUsers.length === 0 || resultSummary) return

    revealSection(previewSectionRef)
  }, [open, operation, previewUsers.length, resultSummary, revealSection])

  useEffect(() => {
    if (!open || !resultSummary) return

    revealSection(resultsSectionRef)
  }, [open, resultSummary, revealSection])

  const handleCsvUpload = useCallback(async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const content = await file.text()
    setCsvText(content)
    setPreviewUsers([])
    setFieldError('')
    setResultSummary(null)
  }, [])

  const handleUseExampleRows = useCallback(() => {
    setSourceMode('manual')
    setManualText(bulkCreateExampleRows)
    setCsvText('')
    setHeaders([])
    setPreviewUsers([])
    setFieldError('')
    setResultSummary(null)
  }, [bulkCreateExampleRows])

  const handleDownloadExampleCsv = useCallback(() => {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return

    const csvBlob = new Blob([bulkCreateExampleCsvContent], {
      type: 'text/csv;charset=utf-8',
    })
    const downloadUrl = URL.createObjectURL(csvBlob)
    const link = document.createElement('a')

    link.href = downloadUrl
    link.download = bulkCreateExampleFilename
    link.click()
    URL.revokeObjectURL(downloadUrl)
  }, [bulkCreateExampleCsvContent, bulkCreateExampleFilename])

  const parsePreview = useCallback(() => {
    setFieldError('')
    setResultSummary(null)

    if (sourceMode === 'manual') {
      const lines = manualText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

      if (lines.length === 0) {
        setFieldError('Add at least one user row.')
        setPreviewUsers([])
        return
      }

      if (lines.length > BULK_LIMIT) {
        setFieldError(`A maximum of ${BULK_LIMIT} users is allowed per batch.`)
        setPreviewUsers([])
        return
      }

      const users = lines.map((line, index) => {
        const [name = '', email = '', roles = '', tenantVisibility = ''] =
          line.split(',').map((value) => value.trim())
        return {
          key: `manual-${index}`,
          name,
          email,
          roles: parseRoles(roles),
          tenantVisibility: shouldShowTenantVisibilityUpdate
            ? parseTenantVisibility(tenantVisibility)
            : [],
        }
      })

      const resolvedCreateUsers = resolveBulkCreateTenantVisibility({
        users,
        rowOffset: 1,
        shouldShowTenantVisibilityUpdate,
        selectableTenants: selectableTenantOptions,
        tenantResolutionIndex,
        canResolveTenantVisibility: canResolveBulkCreateTenantVisibility,
      })

      if (resolvedCreateUsers.errorMessage) {
        setFieldError(resolvedCreateUsers.errorMessage)
        setPreviewUsers([])
        return
      }

      const restrictedRoleRows = getRestrictedBulkRoleRows(resolvedCreateUsers.users, 1)
      if (restrictedRoleRows.length > 0) {
        setFieldError(getBulkGovernanceErrorMessage(restrictedRoleRows))
        setPreviewUsers([])
        return
      }

      const unsupportedRoleRows = getUnsupportedBulkRoleRows(
        resolvedCreateUsers.users,
        supportedBulkRoles,
        1,
      )
      if (unsupportedRoleRows.length > 0) {
        setFieldError(getUnsupportedBulkRolesMessage(supportedBulkRoles, unsupportedRoleRows))
        setPreviewUsers([])
        return
      }

      setPreviewUsers(resolvedCreateUsers.users)
      return
    }

    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length < 2) {
      setFieldError('CSV must include a header row and at least one data row.')
      setPreviewUsers([])
      setHeaders([])
      return
    }

    const parsedHeaders = parseCsvLine(lines[0])
    setHeaders(parsedHeaders)

    const nextMapping = {
      name: mapping.name || parsedHeaders.find((h) => h.toLowerCase() === 'name') || '',
      email:
        mapping.email || parsedHeaders.find((h) => h.toLowerCase() === 'email') || '',
      roles: mapping.roles || parsedHeaders.find((h) => h.toLowerCase() === 'roles') || '',
      tenantVisibility: shouldShowTenantVisibilityUpdate
        ? (
          mapping.tenantVisibility ||
          parsedHeaders.find((h) => h.toLowerCase() === 'tenantvisibility') ||
          parsedHeaders.find((h) => h.toLowerCase() === 'tenant_visibility') ||
          ''
        )
        : '',
    }
    setMapping(nextMapping)

    if (!nextMapping.name || !nextMapping.email || !nextMapping.roles) {
      setFieldError('Map Name, Email, and Roles before processing.')
      setPreviewUsers([])
      return
    }

    const rows = lines.slice(1)
    if (rows.length > BULK_LIMIT) {
      setFieldError(`A maximum of ${BULK_LIMIT} users is allowed per batch.`)
      setPreviewUsers([])
      return
    }

    const users = rows.map((line, index) => {
      const cells = parseCsvLine(line)
      const rowObj = Object.fromEntries(parsedHeaders.map((h, i) => [h, cells[i] ?? '']))
      return {
        key: `csv-${index}`,
        name: rowObj[nextMapping.name]?.trim() ?? '',
        email: rowObj[nextMapping.email]?.trim() ?? '',
        roles: parseRoles(rowObj[nextMapping.roles] ?? ''),
        tenantVisibility: shouldShowTenantVisibilityUpdate
          ? parseTenantVisibility(
            nextMapping.tenantVisibility ? rowObj[nextMapping.tenantVisibility] ?? '' : '',
          )
          : [],
      }
    })

    const resolvedCreateUsers = resolveBulkCreateTenantVisibility({
      users,
      rowOffset: 2,
      shouldShowTenantVisibilityUpdate,
      selectableTenants: selectableTenantOptions,
      tenantResolutionIndex,
      canResolveTenantVisibility: canResolveBulkCreateTenantVisibility,
    })

    if (resolvedCreateUsers.errorMessage) {
      setFieldError(resolvedCreateUsers.errorMessage)
      setPreviewUsers([])
      return
    }

    const restrictedRoleRows = getRestrictedBulkRoleRows(resolvedCreateUsers.users, 2)
    if (restrictedRoleRows.length > 0) {
      setFieldError(getBulkGovernanceErrorMessage(restrictedRoleRows))
      setPreviewUsers([])
      return
    }

    const unsupportedRoleRows = getUnsupportedBulkRoleRows(
      resolvedCreateUsers.users,
      supportedBulkRoles,
      2,
    )
    if (unsupportedRoleRows.length > 0) {
      setFieldError(getUnsupportedBulkRolesMessage(supportedBulkRoles, unsupportedRoleRows))
      setPreviewUsers([])
      return
    }

    setPreviewUsers(resolvedCreateUsers.users)
  }, [
    canResolveBulkCreateTenantVisibility,
    csvText,
    manualText,
    mapping,
    selectableTenantOptions,
    shouldShowTenantVisibilityUpdate,
    sourceMode,
    supportedBulkRoles,
    tenantResolutionIndex,
  ])

  const canRunCreate = useMemo(() => {
    return operation === 'create' && previewUsers.length > 0 && !fieldError
  }, [operation, previewUsers.length, fieldError])

  const canRunUpdate = useMemo(() => {
    if (operation !== 'update') return false
    const hasRoles = selectedBulkRoles.length > 0
    const hasTenantReplaceSelection =
      bulkTenantVisibilityMode === 'replace'
      && normalizedSelectedBulkTenantVisibility.length > 0
      && !isLoadingTenants
      && !normalizedTenantsError
    const hasTenantClearSelection = bulkTenantVisibilityMode === 'clear'
    const hasTenants = shouldShowTenantVisibilityUpdate
      && (hasTenantReplaceSelection || hasTenantClearSelection)
    return selectedCount > 0 && (hasRoles || hasTenants)
  }, [
    bulkTenantVisibilityMode,
    isLoadingTenants,
    normalizedSelectedBulkTenantVisibility.length,
    normalizedTenantsError,
    operation,
    selectedBulkRoles.length,
    selectedCount,
    shouldShowTenantVisibilityUpdate,
  ])

  const bulkUpdateReadinessMessage = useMemo(
    () =>
      getBulkUpdateReadinessMessage({
        selectedCount,
        selectedRoles: selectedBulkRoles,
        shouldShowTenantVisibilityUpdate,
        bulkTenantVisibilityMode,
        normalizedSelectedBulkTenantVisibility,
        isLoadingTenants,
        normalizedTenantsError,
      }),
    [
      bulkTenantVisibilityMode,
      isLoadingTenants,
      normalizedSelectedBulkTenantVisibility,
      normalizedTenantsError,
      selectedBulkRoles,
      selectedCount,
      shouldShowTenantVisibilityUpdate,
    ],
  )

  const toggleBulkTenantSelection = useCallback((tenantId) => {
    setSelectedBulkTenantVisibility((prev) =>
      prev.includes(tenantId)
        ? prev.filter((candidate) => candidate !== tenantId)
        : [...prev, tenantId],
    )
    setFieldError('')
    setResultSummary(null)
  }, [])

  const handleSelectAllBulkTenants = useCallback(() => {
    setSelectedBulkTenantVisibility((prev) => {
      const preservedIds = normalizeTenantVisibilityIds(prev).filter((tenantId) => {
        const tenant = tenantLookup.get(tenantId)
        return !tenant || !tenant.isSelectable
      })

      return [...new Set([...preservedIds, ...selectableTenantOptions.map((tenant) => tenant.id)])]
    })
    setFieldError('')
    setResultSummary(null)
  }, [selectableTenantOptions, tenantLookup])

  const handleClearBulkTenantSelection = useCallback(() => {
    setSelectedBulkTenantVisibility([])
    setFieldError('')
    setResultSummary(null)
  }, [])

  const toggleBulkRole = useCallback((role) => {
    setSelectedBulkRoles((prev) =>
      prev.includes(role) ? prev.filter((candidate) => candidate !== role) : [...prev, role],
    )
    setFieldError('')
    setResultSummary(null)
  }, [])

  const handleClearBulkRoles = useCallback(() => {
    setSelectedBulkRoles([])
    setFieldError('')
    setResultSummary(null)
  }, [])

  const runBulkCreate = useCallback(async () => {
    if (!canRunCreate) return
    startProgress('Creating users...')
    setResultSummary(null)

    try {
      const body = {
        users: previewUsers.map((user) => ({
          name: user.name,
          email: user.email,
          roles: user.roles,
          ...(user.tenantVisibility.length > 0
            ? { tenantVisibility: user.tenantVisibility }
            : {}),
        })),
        sendInvitations: true,
      }

      setProgressValue(55)
      const response = await bulkCreateUsers({ customerId, body }).unwrap()
      finishProgress()

      const normalized = normalizeBulkResponse(response)
      setResultSummary(normalized)
      addToast(getBulkCompletionToast('Bulk create', normalized))
    } catch (error) {
      const appError = normalizeError(error)
      setProgressValue(0)

      if (isCanonicalAdminConflictError(appError)) {
        addToast({
          title: 'Bulk create blocked',
          description: getCanonicalAdminConflictMessage(appError, 'assign'),
          variant: 'warning',
        })
        return
      }

      addToast({
        title: 'Bulk create failed',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [
    addToast,
    bulkCreateUsers,
    canRunCreate,
    customerId,
    finishProgress,
    previewUsers,
    startProgress,
  ])

  const runBulkUpdate = useCallback(async () => {
    if (!canRunUpdate) return
    const roles = selectedBulkRoles

    if (roles.includes(GOVERNED_CUSTOMER_ADMIN_ROLE)) {
      setFieldError(getBulkGovernanceErrorMessage())
      setResultSummary(null)
      return
    }

    const unsupportedRoles = getUnsupportedBulkRoles(roles, supportedBulkRoles)
    if (unsupportedRoles.length > 0) {
      setFieldError(getUnsupportedBulkRolesMessage(supportedBulkRoles))
      setResultSummary(null)
      return
    }

    startProgress('Updating selected users...')
    setResultSummary(null)
    setFieldError('')

    try {
      const users = selectedUserIds.map((userId) => ({
        userId,
        ...(roles.length > 0 ? { roles } : {}),
        ...(shouldShowTenantVisibilityUpdate && bulkTenantVisibilityMode === 'replace'
          ? { tenantVisibility: normalizedSelectedBulkTenantVisibility }
          : {}),
        ...(shouldShowTenantVisibilityUpdate && bulkTenantVisibilityMode === 'clear'
          ? { tenantVisibility: [] }
          : {}),
      }))

      setProgressValue(55)
      const response = await bulkUpdateUsers({
        customerId,
        body: { users },
      }).unwrap()
      finishProgress()

      const normalized = normalizeBulkResponse(response)
      setResultSummary(normalized)
      addToast(getBulkCompletionToast('Bulk update', normalized))
    } catch (error) {
      const appError = normalizeError(error)
      setProgressValue(0)

      if (isCanonicalAdminConflictError(appError)) {
        addToast({
          title: 'Bulk update blocked',
          description: getCanonicalAdminConflictMessage(appError, 'update_roles'),
          variant: 'warning',
        })
        return
      }

      addToast({
        title: 'Bulk update failed',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [
    addToast,
    bulkTenantVisibilityMode,
    bulkUpdateUsers,
    canRunUpdate,
    customerId,
    finishProgress,
    normalizedSelectedBulkTenantVisibility,
    selectedBulkRoles,
    selectedUserIds,
    startProgress,
    supportedBulkRoles,
    shouldShowTenantVisibilityUpdate,
  ])

  const runBulkDisable = useCallback(async () => {
    if (selectedCount === 0) {
      setFieldError('Select at least one user before running bulk disable.')
      return
    }

    startProgress('Disabling selected users...')
    setResultSummary(null)

    try {
      setProgressValue(55)
      const response = await bulkDisableUsers({
        customerId,
        body: { userIds: selectedUserIds },
      }).unwrap()
      finishProgress()

      const normalized = normalizeBulkResponse(response)
      setResultSummary(normalized)
      addToast({
        title: 'Bulk disable completed',
        description: `${normalized.success} succeeded, ${normalized.failed} failed.`,
        variant: normalized.failed > 0 ? 'warning' : 'success',
      })
    } catch (error) {
      const appError = normalizeError(error)
      setProgressValue(0)

      if (isCanonicalAdminConflictError(appError)) {
        addToast({
          title: 'Bulk disable blocked',
          description: getCanonicalAdminConflictMessage(appError, 'disable'),
          variant: 'warning',
        })
        return
      }

      addToast({
        title: 'Bulk disable failed',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [
    addToast,
    bulkDisableUsers,
    customerId,
    finishProgress,
    selectedCount,
    selectedUserIds,
    startProgress,
  ])

  const dialogTitle = isOperationLocked ? getLockedDialogTitle(operation) : 'Bulk Operations'
  const dialogSubtitle = getDialogSubtitle({ isOperationLocked, operation, selectedCount })

  return (
    <Dialog open={open} onClose={handleClose} size="lg">
      <Dialog.Header>
        <h2 className="bulk-users__title">{dialogTitle}</h2>
        <p className="bulk-users__subtitle">
          {dialogSubtitle}
        </p>
      </Dialog.Header>

      <Dialog.Body>
        <div className="bulk-users__controls">
          {isOperationLocked ? (
            <p className="bulk-users__mode" role="status">
              Mode: <strong>{availableOperationOptions[0]?.label ?? 'Bulk Operation'}</strong>
            </p>
          ) : (
            <Select
              id="bulk-operation"
              label="Operation"
              value={operation}
              onChange={(event) => {
                setOperation(event.target.value)
                setFieldError('')
                setResultSummary(null)
              }}
              options={availableOperationOptions}
              disabled={isProcessing}
            />
          )}

          {isSelectionRequiredOperation && (
            <p className="bulk-users__selection-info" role="status">
              Selected users: <strong>{selectedCount}</strong>
            </p>
          )}
        </div>

        {operation === 'create' && (
          <div className="bulk-users__panel">
            <BulkGovernanceNote supportedRolesMessage={supportedBulkRolesMessage} />
            <Select
              id="bulk-source-mode"
              name="bulk-create-source-mode"
              label="Input mode"
              value={sourceMode}
              onChange={(event) => {
                setSourceMode(event.target.value)
                setPreviewUsers([])
                setFieldError('')
                setResultSummary(null)
              }}
              options={SOURCE_OPTIONS}
              disabled={isProcessing}
              autoComplete="off"
            />

            {sourceMode === 'csv' ? (
              <>
                <Input
                  id="bulk-csv-file"
                  name="bulk-create-csv-file"
                  type="file"
                  aria-label="CSV file"
                  accept=".csv,text/csv"
                  onChange={handleCsvUpload}
                  disabled={isProcessing}
                  fullWidth
                  {...BULK_CREATE_AUTOFILL_PROPS}
                />
                <Textarea
                  id="bulk-csv-text"
                  name="bulk-create-csv-content"
                  label="CSV content"
                  value={csvText}
                  onChange={(event) => {
                    setCsvText(event.target.value)
                    setPreviewUsers([])
                    setFieldError('')
                    setResultSummary(null)
                  }}
                  rows={7}
                  fullWidth
                  disabled={isProcessing}
                  helperText={getBulkCreateCsvHelperText(
                    shouldShowTenantVisibilityUpdate,
                    supportedBulkRolesMessage,
                  )}
                  {...BULK_CREATE_AUTOFILL_PROPS}
                />
                {headers.length > 0 && (
                  <div className="bulk-users__mapping">
                    <Select
                      id="map-name"
                      name="bulk-create-map-name-column"
                      label="Name column"
                      value={mapping.name}
                      onChange={(event) => {
                        setMapping((prev) => ({ ...prev, name: event.target.value }))
                        setPreviewUsers([])
                        setFieldError('')
                        setResultSummary(null)
                      }}
                      options={[
                        { value: '', label: 'Select column' },
                        ...headers.map((header) => ({ value: header, label: header })),
                      ]}
                      disabled={isProcessing}
                      autoComplete="off"
                    />
                    <Select
                      id="map-email"
                      name="bulk-create-map-email-column"
                      label="Email column"
                      value={mapping.email}
                      onChange={(event) => {
                        setMapping((prev) => ({ ...prev, email: event.target.value }))
                        setPreviewUsers([])
                        setFieldError('')
                        setResultSummary(null)
                      }}
                      options={[
                        { value: '', label: 'Select column' },
                        ...headers.map((header) => ({ value: header, label: header })),
                      ]}
                      disabled={isProcessing}
                      autoComplete="off"
                    />
                    <Select
                      id="map-roles"
                      name="bulk-create-map-roles-column"
                      label="Roles column"
                      value={mapping.roles}
                      onChange={(event) => {
                        setMapping((prev) => ({ ...prev, roles: event.target.value }))
                        setPreviewUsers([])
                        setFieldError('')
                        setResultSummary(null)
                      }}
                      options={[
                        { value: '', label: 'Select column' },
                        ...headers.map((header) => ({ value: header, label: header })),
                      ]}
                      disabled={isProcessing}
                      autoComplete="off"
                    />
                    {shouldShowTenantVisibilityUpdate ? (
                      <Select
                        id="map-tenant-visibility"
                        name="bulk-create-map-tenant-visibility-column"
                        label="Tenant visibility column (optional)"
                        value={mapping.tenantVisibility}
                        onChange={(event) => {
                          setMapping((prev) => ({
                            ...prev,
                            tenantVisibility: event.target.value,
                          }))
                          setPreviewUsers([])
                          setFieldError('')
                          setResultSummary(null)
                        }}
                        options={[
                          { value: '', label: 'None' },
                          ...headers.map((header) => ({ value: header, label: header })),
                        ]}
                        disabled={isProcessing}
                        autoComplete="off"
                      />
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <>
                <Textarea
                  id="bulk-manual"
                  name="bulk-create-manual-rows"
                  label="Manual rows"
                  value={manualText}
                  onChange={(event) => {
                    setManualText(event.target.value)
                    setPreviewUsers([])
                    setFieldError('')
                    setResultSummary(null)
                  }}
                  rows={7}
                  fullWidth
                  disabled={isProcessing}
                  helperText={getBulkCreateManualHelperText(
                    shouldShowTenantVisibilityUpdate,
                    supportedBulkRolesMessage,
                  )}
                  {...BULK_CREATE_AUTOFILL_PROPS}
                />
              </>
            )}

            <div className="bulk-users__examples" aria-label="Bulk create examples">
              <div className="bulk-users__examples-copy">
                <p className="bulk-users__examples-title">Examples</p>
                <p className="bulk-users__examples-text">
                  Use a sample that matches the current customer topology. After validation,
                  preview and batch results will jump into view below.
                </p>
              </div>
              {shouldShowTenantVisibilityUpdate ? (
                <div className="bulk-users__examples-reference" aria-label="Current tenant references">
                  <p className="bulk-users__examples-title">Current tenant references</p>
                  {isLoadingTenants ? (
                    <p className="bulk-users__examples-text" role="status">
                      {BULK_CREATE_TENANT_REFERENCE_LOADING_MESSAGE}
                    </p>
                  ) : normalizedTenantsError ? (
                    <p className="bulk-users__examples-text">
                      {BULK_CREATE_TENANT_REFERENCE_ERROR_MESSAGE}
                    </p>
                  ) : selectableTenantOptions.length > 0 ? (
                    <ul className="bulk-users__examples-reference-list">
                      {selectableTenantOptions.map((tenant) => (
                        <li key={tenant.id} className="bulk-users__examples-reference-item">
                          <span className="bulk-users__examples-reference-name">{tenant.name}</span>
                          <span className="bulk-users__examples-reference-id">{tenant.id}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="bulk-users__examples-text">
                      {BULK_CREATE_TENANT_REFERENCE_EMPTY_MESSAGE}
                    </p>
                  )}
                </div>
              ) : null}
              <div className="bulk-users__example-actions">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleUseExampleRows}
                  disabled={isProcessing}
                >
                  Use Example Rows
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadExampleCsv}
                  disabled={isProcessing}
                >
                  Download Example CSV
                </Button>
              </div>
            </div>

            <div className="bulk-users__actions">
              <Button
                variant="outline"
                onClick={parsePreview}
                disabled={isProcessing}
              >
                Validate & Preview
              </Button>
              <Button
                variant="primary"
                onClick={runBulkCreate}
                disabled={!canRunCreate || isProcessing}
                loading={bulkCreateResult.isLoading}
              >
                Process Batch
              </Button>
            </div>
          </div>
        )}

        {operation === 'update' && (
          <div className="bulk-users__panel">
            <BulkGovernanceNote supportedRolesMessage={supportedBulkRolesMessage} />
            <div className="bulk-users__update-section">
              <p className="bulk-users__section-title">Role Access</p>
              <p className="bulk-users__section-intro">
                {BULK_UPDATE_ROLE_GUIDANCE}
              </p>
              <div className="bulk-users__role-list" role="group" aria-label="Bulk update roles">
                {supportedBulkRoles.map((role) => (
                  <Tickbox
                    key={role}
                    id={`bulk-update-role-${role}`}
                    label={formatRoleLabel(role)}
                    checked={selectedBulkRoles.includes(role)}
                    onChange={() => toggleBulkRole(role)}
                    disabled={isProcessing}
                  />
                ))}
              </div>
              <div className="bulk-users__role-actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearBulkRoles}
                  disabled={selectedBulkRoles.length === 0 || isProcessing}
                >
                  Clear Role Selection
                </Button>
              </div>
            </div>
            {shouldShowTenantVisibilityUpdate ? (
              <div className="bulk-users__tenant-visibility">
                <p className="bulk-users__tenant-visibility-text">
                  {BULK_TENANT_VISIBILITY_GUIDANCE}
                </p>
                {effectiveTenantVisibilityMeta?.isServiceProvider ? (
                  <p className="bulk-users__tenant-visibility-hint">
                    {BULK_TENANT_VISIBILITY_SERVICE_PROVIDER_HINT}
                  </p>
                ) : null}
                {effectiveTenantVisibilityMeta?.selectableStatuses?.length > 0 ? (
                  <p className="bulk-users__tenant-visibility-hint">
                    Selectable statuses: {effectiveTenantVisibilityMeta.selectableStatuses.join(', ')}.
                  </p>
                ) : null}

                <Select
                  id="bulk-update-tenant-mode"
                  label="Tenant visibility change"
                  value={bulkTenantVisibilityMode}
                  onChange={(event) => {
                    setBulkTenantVisibilityMode(event.target.value)
                    if (event.target.value !== 'replace') {
                      setSelectedBulkTenantVisibility([])
                    }
                    setFieldError('')
                    setResultSummary(null)
                  }}
                  options={BULK_TENANT_VISIBILITY_MODE_OPTIONS}
                  disabled={isProcessing}
                />

                {bulkTenantVisibilityMode === 'replace' ? (
                  <>
                    {isLoadingTenants ? (
                      <p className="bulk-users__tenant-visibility-text" role="status">
                        Loading tenant options...
                      </p>
                    ) : null}

                    {normalizedTenantsError ? (
                      <ErrorSupportPanel
                        error={normalizedTenantsError}
                        context="bulk-users-tenant-visibility"
                      />
                    ) : null}

                    {!isLoadingTenants && !normalizedTenantsError ? (
                      <>
                        <div className="bulk-users__tenant-actions">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleSelectAllBulkTenants}
                            disabled={selectableTenantOptions.length === 0 || isProcessing}
                          >
                            Select All Available
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearBulkTenantSelection}
                            disabled={normalizedSelectedBulkTenantVisibility.length === 0 || isProcessing}
                          >
                            Clear Selection
                          </Button>
                        </div>

                        {selectableTenantOptions.length > 0 ? (
                          <div className="bulk-users__tenant-list" role="group" aria-label="Bulk update tenant visibility">
                            {selectableTenantOptions.map((tenant) => (
                              <div key={tenant.id} className="bulk-users__tenant-option">
                                <Tickbox
                                  id={`bulk-tenant-${tenant.id}`}
                                  label={tenant.name}
                                  checked={normalizedSelectedBulkTenantVisibility.includes(tenant.id)}
                                  onChange={() => toggleBulkTenantSelection(tenant.id)}
                                  disabled={isProcessing}
                                />
                                <p className="bulk-users__tenant-meta">
                                  Status: {tenant.status}
                                  {tenant.isDefault ? ' | Default tenant' : ''}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="bulk-users__tenant-visibility-hint">
                            {BULK_TENANT_VISIBILITY_EMPTY_OPTIONS_MESSAGE}
                          </p>
                        )}

                        {preservedSelectedTenants.length > 0 ? (
                          <div className="bulk-users__tenant-preserved">
                            <p className="bulk-users__tenant-visibility-hint">
                              {BULK_TENANT_VISIBILITY_PRESERVED_MESSAGE}
                            </p>
                            <ul className="bulk-users__tenant-preserved-list">
                              {preservedSelectedTenants.map((tenant) => (
                                <li key={tenant.id} className="bulk-users__tenant-preserved-item">
                                  <div className="bulk-users__tenant-preserved-details">
                                    <span className="bulk-users__tenant-preserved-name">{tenant.name}</span>
                                    <span className="bulk-users__tenant-preserved-meta">
                                      Status: {tenant.status}
                                      {tenant.selectionState ? ` | State: ${tenant.selectionState}` : ''}
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleBulkTenantSelection(tenant.id)}
                                    disabled={isProcessing}
                                  >
                                    Remove
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : !shouldSuppressTenantVisibilityHint ? (
              <p className="bulk-users__tenant-visibility-hint">
                Tenant visibility is not required for this customer topology.
              </p>
            ) : null}
            <div className="bulk-users__update-summary" aria-live="polite">
              <p className="bulk-users__update-summary-title">Changes to apply</p>
              <p className="bulk-users__update-summary-text">
                {selectedBulkRoles.length > 0
                  ? `Roles: ${selectedBulkRoles.map(formatRoleLabel).join(', ')}`
                  : 'Roles: leave unchanged'}
              </p>
              {shouldShowTenantVisibilityUpdate ? (
                <p className="bulk-users__update-summary-text">
                  {bulkTenantVisibilityMode === 'replace'
                    ? `Tenant visibility: replace with ${normalizedSelectedBulkTenantVisibility.length === 0 ? 'no tenants selected yet' : `${normalizedSelectedBulkTenantVisibility.length} selected ${normalizedSelectedBulkTenantVisibility.length === 1 ? 'tenant' : 'tenants'}`}`
                    : bulkTenantVisibilityMode === 'clear'
                    ? 'Tenant visibility: clear explicit tenant visibility'
                    : 'Tenant visibility: leave unchanged'}
                </p>
              ) : null}
              <p className="bulk-users__update-summary-text">
                {bulkUpdateReadinessMessage}
              </p>
            </div>
            <div className="bulk-users__actions">
              <Button
                variant="primary"
                onClick={runBulkUpdate}
                disabled={!canRunUpdate || isProcessing}
                loading={bulkUpdateResult.isLoading}
              >
                Update Selected Users
              </Button>
            </div>
          </div>
        )}

        {operation === 'disable' && (
          <div className="bulk-users__panel">
            <p className="bulk-users__warning">
              Disabling users immediately revokes access and trust.
            </p>
            <div className="bulk-users__actions">
              <Button
                variant="danger"
                onClick={runBulkDisable}
                disabled={selectedCount === 0 || isProcessing}
                loading={bulkDisableResult.isLoading}
              >
                Disable Selected Users
              </Button>
            </div>
          </div>
        )}

        {fieldError && (
          <p className="bulk-users__error" role="alert">
            {fieldError}
          </p>
        )}

        {isProcessing && (
          <div className="bulk-users__progress" aria-live="polite">
            <p className="bulk-users__progress-label">{progressLabel}</p>
            <progress max="100" value={progressValue} />
          </div>
        )}

        {previewUsers.length > 0 && operation === 'create' && (
          <div
            ref={previewSectionRef}
            className="bulk-users__preview"
            tabIndex={-1}
            aria-live="polite"
          >
            <h3 className="bulk-users__section-title">Preview ({previewUsers.length})</h3>
            <p className="bulk-users__section-intro">
              Preview is ready. Review the first {Math.min(previewUsers.length, 10)} row{previewUsers.length === 1 ? '' : 's'} below, then process the batch.
            </p>
            <div className="bulk-users__preview-list">
              {previewUsers.slice(0, 10).map((user) => (
                <div className="bulk-users__preview-row" key={user.key}>
                  <span>{user.name || '—'}</span>
                  <span>{user.email || '—'}</span>
                  <span>{user.roles.join(', ') || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {resultSummary && (
          <div
            ref={resultsSectionRef}
            className="bulk-users__results"
            tabIndex={-1}
            aria-live="polite"
          >
            <h3 className="bulk-users__section-title">Batch Results</h3>
            <p className="bulk-users__section-intro">
              {getBulkResultSummaryMessage(operation, resultSummary)}
            </p>
            <div className="bulk-users__result-stats">
              <Status variant="info" size="sm" showIcon>Total: {resultSummary.total}</Status>
              <Status variant="success" size="sm" showIcon>Success: {resultSummary.success}</Status>
              <Status variant="error" size="sm" showIcon>Failed: {resultSummary.failed}</Status>
            </div>
            {resultSummary.results.length > 0 && (
              <div className="bulk-users__result-list">
                {resultSummary.results.map((item, index) => (
                  <div className="bulk-users__result-row" key={`${index}-${item.userId ?? item.email ?? 'row'}`}>
                    <span className="bulk-users__result-target">
                      {item.email ?? item.userId ?? `Row ${index + 1}`}
                    </span>
                    <span>
                      {item.success === false ? (item.error || 'Failed') : 'Success'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
          Close
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export default BulkUserOperations
