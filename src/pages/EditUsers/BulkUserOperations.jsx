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

import { useCallback, useEffect, useMemo, useState } from 'react'
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

const BULK_SUPPORTED_ROLES_MESSAGE =
  `Supported bulk roles: ${BULK_EDITABLE_ROLES.join(', ')}.`

const BULK_TENANT_VISIBILITY_GUIDANCE =
  'Apply the same tenant visibility set to every selected user. Choose Replace to set explicit tenant visibility, or Clear to remove stored explicit tenant visibility.'

const BULK_TENANT_VISIBILITY_SERVICE_PROVIDER_HINT =
  'This customer uses guided tenant visibility for multi-tenant access.'

const BULK_TENANT_VISIBILITY_EMPTY_OPTIONS_MESSAGE =
  'No selectable tenants are currently available for this customer.'

const BULK_TENANT_VISIBILITY_PRESERVED_MESSAGE =
  'Selected tenants that are no longer selectable stay preserved until you remove them.'

const BULK_TENANT_VISIBILITY_MODE_OPTIONS = [
  { value: 'unchanged', label: 'Leave tenant visibility unchanged' },
  { value: 'replace', label: 'Replace with selected tenants' },
  { value: 'clear', label: 'Clear explicit tenant visibility' },
]

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

function BulkGovernanceNote() {
  return (
    <div
      className="bulk-users__governance"
      role="note"
      aria-label="Customer Admin governance guidance"
    >
      <p className="bulk-users__governance-title">Customer Admin governance</p>
      <p className="bulk-users__governance-text">{BULK_CUSTOMER_ADMIN_GOVERNANCE_MESSAGE}</p>
      <p className="bulk-users__governance-text">{BULK_SUPPORTED_ROLES_MESSAGE}</p>
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

  const success =
    Number(summary.success ?? summary.successCount ?? 0) ||
    results.filter((item) => item.success).length
  const failed =
    Number(summary.failed ?? summary.failureCount ?? 0) ||
    results.filter((item) => !item.success).length
  const total = Number(summary.total ?? 0) || success + failed

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
  const [bulkRoles, setBulkRoles] = useState('')
  const [bulkTenantVisibilityMode, setBulkTenantVisibilityMode] = useState('unchanged')
  const [selectedBulkTenantVisibility, setSelectedBulkTenantVisibility] = useState([])

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
  const isLoadingTenants = isCustomerContextAligned ? rawIsLoadingTenants : false
  const shouldShowTenantVisibilityUpdate =
    effectiveTenantVisibilityMeta?.allowed === true
    && effectiveTenantVisibilityMeta?.topology === 'MULTI_TENANT'
  const shouldSuppressTenantVisibilityHint =
    effectiveTenantVisibilityMeta?.topology === 'SINGLE_TENANT'

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
    setBulkRoles('')
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

  const handleCsvUpload = useCallback(async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const content = await file.text()
    setCsvText(content)
    setPreviewUsers([])
    setFieldError('')
    setResultSummary(null)
  }, [])

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
          tenantVisibility: parseTenantVisibility(tenantVisibility),
        }
      })

      const restrictedRoleRows = getRestrictedBulkRoleRows(users, 1)
      if (restrictedRoleRows.length > 0) {
        setFieldError(getBulkGovernanceErrorMessage(restrictedRoleRows))
        setPreviewUsers([])
        return
      }

      setPreviewUsers(users)
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
      tenantVisibility:
        mapping.tenantVisibility ||
        parsedHeaders.find((h) => h.toLowerCase() === 'tenantvisibility') ||
        parsedHeaders.find((h) => h.toLowerCase() === 'tenant_visibility') ||
        '',
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
        tenantVisibility: parseTenantVisibility(
          nextMapping.tenantVisibility ? rowObj[nextMapping.tenantVisibility] ?? '' : '',
        ),
      }
    })

    const restrictedRoleRows = getRestrictedBulkRoleRows(users, 2)
    if (restrictedRoleRows.length > 0) {
      setFieldError(getBulkGovernanceErrorMessage(restrictedRoleRows))
      setPreviewUsers([])
      return
    }

    setPreviewUsers(users)
  }, [sourceMode, manualText, csvText, mapping])

  const canRunCreate = useMemo(() => {
    return operation === 'create' && previewUsers.length > 0 && !fieldError
  }, [operation, previewUsers.length, fieldError])

  const canRunUpdate = useMemo(() => {
    if (operation !== 'update') return false
    const hasRoles = bulkRoles.trim().length > 0
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
    bulkRoles,
    bulkTenantVisibilityMode,
    isLoadingTenants,
    normalizedSelectedBulkTenantVisibility.length,
    normalizedTenantsError,
    operation,
    selectedCount,
    shouldShowTenantVisibilityUpdate,
  ])

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
      addToast({
        title: 'Bulk create completed',
        description: `${normalized.success} succeeded, ${normalized.failed} failed.`,
        variant: normalized.failed > 0 ? 'warning' : 'success',
      })
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
    const roles = parseRoles(bulkRoles)

    if (roles.includes(GOVERNED_CUSTOMER_ADMIN_ROLE)) {
      setFieldError(getBulkGovernanceErrorMessage())
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
      addToast({
        title: 'Bulk update completed',
        description: `${normalized.success} succeeded, ${normalized.failed} failed.`,
        variant: normalized.failed > 0 ? 'warning' : 'success',
      })
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
    bulkRoles,
    bulkTenantVisibilityMode,
    bulkUpdateUsers,
    canRunUpdate,
    customerId,
    finishProgress,
    normalizedSelectedBulkTenantVisibility,
    selectedUserIds,
    startProgress,
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
            <BulkGovernanceNote />
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
                  helperText={`Include headers for name, email, roles, and optional tenantVisibility. ${BULK_SUPPORTED_ROLES_MESSAGE}`}
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
                  </div>
                )}
              </>
            ) : (
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
                helperText={`One row per line: name,email,roles,tenantVisibility (roles/tenants separated by |). ${BULK_SUPPORTED_ROLES_MESSAGE}`}
                {...BULK_CREATE_AUTOFILL_PROPS}
              />
            )}

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
            <BulkGovernanceNote />
            <Input
              id="bulk-update-roles"
              label="Roles (comma, pipe, or semicolon separated)"
              value={bulkRoles}
              onChange={(event) => {
                setBulkRoles(event.target.value)
                setFieldError('')
                setResultSummary(null)
              }}
              placeholder={BULK_EDITABLE_ROLES.join(', ')}
              disabled={isProcessing}
              fullWidth
            />
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
          <div className="bulk-users__preview">
            <h3 className="bulk-users__section-title">Preview ({previewUsers.length})</h3>
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
          <div className="bulk-users__results">
            <h3 className="bulk-users__section-title">Batch Results</h3>
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
                      {item.success ? 'Success' : item.error || 'Failed'}
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
