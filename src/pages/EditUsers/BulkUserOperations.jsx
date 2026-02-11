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

import { useCallback, useMemo, useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { Button } from '../../components/Button'
import { Select } from '../../components/Select'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Status } from '../../components/Status'
import { useToaster } from '../../components/Toaster'
import {
  useBulkCreateUsersMutation,
  useBulkDisableUsersMutation,
  useBulkUpdateUsersMutation,
} from '../../store/api/userApi.js'
import { normalizeError } from '../../utils/errors.js'
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

const AVAILABLE_ROLES = ['CUSTOMER_ADMIN', 'TENANT_ADMIN', 'USER']

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

function BulkUserOperations({
  open,
  onClose,
  customerId,
  selectedUserIds = [],
}) {
  const { addToast } = useToaster()
  const [bulkCreateUsers, bulkCreateResult] = useBulkCreateUsersMutation()
  const [bulkUpdateUsers, bulkUpdateResult] = useBulkUpdateUsersMutation()
  const [bulkDisableUsers, bulkDisableResult] = useBulkDisableUsersMutation()

  const [operation, setOperation] = useState('create')
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
  const [bulkTenantVisibility, setBulkTenantVisibility] = useState('')

  const isProcessing =
    bulkCreateResult.isLoading ||
    bulkUpdateResult.isLoading ||
    bulkDisableResult.isLoading

  const isSelectionRequiredOperation =
    operation === 'update' || operation === 'disable'

  const selectedCount = selectedUserIds.length

  const resetState = useCallback(() => {
    setOperation('create')
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
    setBulkTenantVisibility('')
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [onClose, resetState])

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
    setFieldError('')
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

    setPreviewUsers(users)
  }, [sourceMode, manualText, csvText, mapping])

  const canRunCreate = useMemo(() => {
    return operation === 'create' && previewUsers.length > 0 && !fieldError
  }, [operation, previewUsers.length, fieldError])

  const canRunUpdate = useMemo(() => {
    if (operation !== 'update') return false
    const hasRoles = bulkRoles.trim().length > 0
    const hasTenants = bulkTenantVisibility.trim().length > 0
    return selectedCount > 0 && (hasRoles || hasTenants)
  }, [operation, bulkRoles, bulkTenantVisibility, selectedCount])

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
    startProgress('Updating selected users...')
    setResultSummary(null)

    try {
      const roles = parseRoles(bulkRoles)
      const tenantVisibility = parseTenantVisibility(bulkTenantVisibility)

      const users = selectedUserIds.map((userId) => ({
        userId,
        ...(roles.length > 0 ? { roles } : {}),
        ...(tenantVisibility.length > 0 ? { tenantVisibility } : {}),
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
      addToast({
        title: 'Bulk update failed',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [
    addToast,
    bulkRoles,
    bulkTenantVisibility,
    bulkUpdateUsers,
    canRunUpdate,
    customerId,
    finishProgress,
    selectedUserIds,
    startProgress,
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

  return (
    <Dialog open={open} onClose={handleClose} size="lg">
      <Dialog.Header>
        <h2 className="bulk-users__title">Bulk Operations</h2>
        <p className="bulk-users__subtitle">
          Run batched user actions (maximum {BULK_LIMIT} users per request).
        </p>
      </Dialog.Header>

      <Dialog.Body>
        <div className="bulk-users__controls">
          <Select
            id="bulk-operation"
            label="Operation"
            value={operation}
            onChange={(event) => {
              setOperation(event.target.value)
              setFieldError('')
              setResultSummary(null)
            }}
            options={OPERATION_OPTIONS}
            disabled={isProcessing}
          />

          {isSelectionRequiredOperation && (
            <p className="bulk-users__selection-info" role="status">
              Selected users: <strong>{selectedCount}</strong>
            </p>
          )}
        </div>

        {operation === 'create' && (
          <div className="bulk-users__panel">
            <Select
              id="bulk-source-mode"
              label="Input mode"
              value={sourceMode}
              onChange={(event) => {
                setSourceMode(event.target.value)
                setPreviewUsers([])
                setFieldError('')
              }}
              options={SOURCE_OPTIONS}
              disabled={isProcessing}
            />

            {sourceMode === 'csv' ? (
              <>
                <Input
                  id="bulk-csv-file"
                  type="file"
                  label="CSV file"
                  accept=".csv,text/csv"
                  onChange={handleCsvUpload}
                  disabled={isProcessing}
                  fullWidth
                />
                <Textarea
                  id="bulk-csv-text"
                  label="CSV content"
                  value={csvText}
                  onChange={(event) => setCsvText(event.target.value)}
                  rows={7}
                  fullWidth
                  disabled={isProcessing}
                  helperText="Include headers for name, email, roles, and optional tenantVisibility."
                />
                {headers.length > 0 && (
                  <div className="bulk-users__mapping">
                    <Select
                      id="map-name"
                      label="Name column"
                      value={mapping.name}
                      onChange={(event) =>
                        setMapping((prev) => ({ ...prev, name: event.target.value }))
                      }
                      options={[
                        { value: '', label: 'Select column' },
                        ...headers.map((header) => ({ value: header, label: header })),
                      ]}
                      disabled={isProcessing}
                    />
                    <Select
                      id="map-email"
                      label="Email column"
                      value={mapping.email}
                      onChange={(event) =>
                        setMapping((prev) => ({ ...prev, email: event.target.value }))
                      }
                      options={[
                        { value: '', label: 'Select column' },
                        ...headers.map((header) => ({ value: header, label: header })),
                      ]}
                      disabled={isProcessing}
                    />
                    <Select
                      id="map-roles"
                      label="Roles column"
                      value={mapping.roles}
                      onChange={(event) =>
                        setMapping((prev) => ({ ...prev, roles: event.target.value }))
                      }
                      options={[
                        { value: '', label: 'Select column' },
                        ...headers.map((header) => ({ value: header, label: header })),
                      ]}
                      disabled={isProcessing}
                    />
                    <Select
                      id="map-tenant-visibility"
                      label="Tenant visibility column (optional)"
                      value={mapping.tenantVisibility}
                      onChange={(event) =>
                        setMapping((prev) => ({
                          ...prev,
                          tenantVisibility: event.target.value,
                        }))
                      }
                      options={[
                        { value: '', label: 'None' },
                        ...headers.map((header) => ({ value: header, label: header })),
                      ]}
                      disabled={isProcessing}
                    />
                  </div>
                )}
              </>
            ) : (
              <Textarea
                id="bulk-manual"
                label="Manual rows"
                value={manualText}
                onChange={(event) => setManualText(event.target.value)}
                rows={7}
                fullWidth
                disabled={isProcessing}
                helperText="One row per line: name,email,roles,tenantVisibility (roles/tenants separated by |)."
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
            <Input
              id="bulk-update-roles"
              label="Roles (comma, pipe, or semicolon separated)"
              value={bulkRoles}
              onChange={(event) => setBulkRoles(event.target.value)}
              placeholder={AVAILABLE_ROLES.join(', ')}
              disabled={isProcessing}
              fullWidth
            />
            <Input
              id="bulk-update-tenants"
              label="Tenant visibility IDs (optional)"
              value={bulkTenantVisibility}
              onChange={(event) => setBulkTenantVisibility(event.target.value)}
              placeholder="tenantA|tenantB"
              disabled={isProcessing}
              fullWidth
            />
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
