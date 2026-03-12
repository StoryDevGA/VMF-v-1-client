/**
 * Tenant Edit Drawer
 *
 * Dialog for editing an existing tenant's name, website, and admin assignments.
 * Opens as a side-sheet style dialog when a tenant row's Edit action is triggered.
 *
 * Features:
 * - Searchable user selection for tenant admins (replaces raw ObjectId input)
 * - Minimum 1 admin enforcement with removal protection
 * - Recovery hint when all current admins are inactive
 * - Diff-based update (only sends changed fields)
 *
 * @param {Object}  props
 * @param {boolean} props.open       — controls dialog visibility
 * @param {Function} props.onClose   — called when drawer should close
 * @param {Object}  props.tenant     — the tenant object being edited
 * @param {string}  props.customerId — customer scope for user lookup
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Status } from '../../components/Status'
import { useToaster } from '../../components/Toaster'
import { UserSearchSelect } from '../../components/UserSearchSelect'
import { useUpdateTenantMutation } from '../../store/api/tenantApi.js'
import {
  normalizeError,
  isTenantAdminAssignmentsValidationError,
  getTenantAdminAssignmentsValidationMessage,
} from '../../utils/errors.js'

/** Status variant mapping */
const STATUS_VARIANT_MAP = {
  ENABLED: 'success',
  DISABLED: 'error',
  ARCHIVED: 'neutral',
}

const getTenantStatus = (tenant) => String(tenant?.status ?? 'UNKNOWN').trim().toUpperCase()

const getTenantLifecycleGuidance = (tenant) => {
  const tenantStatus = getTenantStatus(tenant)

  if (tenantStatus === 'ARCHIVED') {
    return {
      tone: 'warning',
      title: 'Archived tenant',
      message:
        'Archived tenants are read-only in this workspace. Update lifecycle elsewhere before editing tenant details or assignments.',
    }
  }

  if (tenant?.isDefault) {
    return {
      tone: 'info',
      title: 'Default tenant',
      message:
        'The default tenant must remain enabled for this customer. You can update details here, but disable remains unavailable from the table.',
    }
  }

  if (tenantStatus === 'DISABLED') {
    return {
      tone: 'warning',
      title: 'Tenant disabled',
      message:
        'Users assigned to this tenant currently cannot access it. Re-enabling restores access immediately.',
    }
  }

  return null
}

const getFieldErrorMessage = (value) => {
  if (typeof value === 'string' && value.trim()) return value.trim()

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) return entry.trim()
      if (
        entry
        && typeof entry === 'object'
        && typeof entry.message === 'string'
        && entry.message.trim()
      ) {
        return entry.message.trim()
      }
    }
  }

  if (value && typeof value === 'object' && typeof value.message === 'string') {
    return value.message.trim()
  }

  return ''
}

const normalizeTenantFieldName = (field) => {
  const compact = String(field ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '')

  if (!compact) return ''
  if (compact.includes('tenantadminuserids') || compact.includes('tenantadmins')) {
    return 'tenantAdminUserIds'
  }
  if (compact.includes('website')) return 'website'
  if (compact.endsWith('name')) return 'name'

  return ''
}

const mapTenantValidationErrors = (details) => {
  const mapped = {}

  if (Array.isArray(details)) {
    for (const detail of details) {
      if (!detail || typeof detail !== 'object') continue
      const field = normalizeTenantFieldName(detail.field)
      const message = getFieldErrorMessage(detail.message)
      if (!field || !message) continue
      mapped[field] = message
    }
    return mapped
  }

  if (!details || typeof details !== 'object') return mapped

  for (const [field, value] of Object.entries(details)) {
    const normalizedField = normalizeTenantFieldName(field)
    const message = getFieldErrorMessage(value)
    if (!normalizedField || !message) continue
    mapped[normalizedField] = message
  }

  return mapped
}

/**
 * TenantEditDrawer Component
 */
function TenantEditDrawer({ open, onClose, tenant, customerId }) {
  const { addToast } = useToaster()
  const [updateTenantMutation, { isLoading }] = useUpdateTenantMutation()
  const tenantStatus = getTenantStatus(tenant)
  const isArchivedTenant = tenantStatus === 'ARCHIVED'
  const lifecycleGuidance = useMemo(
    () => getTenantLifecycleGuidance(tenant),
    [tenant],
  )

  /* ---- Local edit state ---- */
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [tenantAdminUserIds, setTenantAdminUserIds] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})

  /* ---- Original admin IDs for recovery detection ---- */
  const originalAdminIds = useMemo(
    () => tenant?.tenantAdminUserIds ?? [],
    [tenant],
  )

  /* ---- Sync from tenant prop ---- */
  useEffect(() => {
    if (tenant) {
      setName(tenant.name ?? '')
      setWebsite(tenant.website ?? '')
      setTenantAdminUserIds(tenant.tenantAdminUserIds ?? [])
      setFieldErrors({})
    }
  }, [tenant])

  /* ---- Admin selection handler ---- */
  const handleAdminChange = useCallback((newIds) => {
    setTenantAdminUserIds(newIds)
    setFieldErrors((prev) => {
      const { tenantAdminUserIds: _, ...rest } = prev
      return rest
    })
  }, [])

  /* ---- Validate ---- */
  const validate = useCallback(() => {
    const errors = {}
    if (!name.trim()) {
      errors.name = 'Name must not be empty.'
    }
    if (website.trim()) {
      try {
        new URL(website.trim())
      } catch {
        errors.website = 'Enter a valid URL.'
      }
    }
    if (tenantAdminUserIds.length === 0) {
      errors.tenantAdminUserIds = 'At least one tenant admin is required.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [name, website, tenantAdminUserIds])

  /* ---- Save ---- */
  const handleSave = useCallback(async () => {
    if (isArchivedTenant) {
      addToast({
        title: 'Archived tenant is read-only',
        description: 'Archived tenants cannot be edited from this workspace.',
        variant: 'info',
      })
      return
    }

    if (!validate()) return

    try {
      const body = {}
      if (name.trim() !== (tenant?.name ?? '')) {
        body.name = name.trim()
      }
      if (website.trim() !== (tenant?.website ?? '')) {
        body.website = website.trim()
      }
      // Always send tenantAdminUserIds if changed
      const originalSorted = [...(tenant?.tenantAdminUserIds ?? [])].sort().join(',')
      const currentSorted = [...tenantAdminUserIds].sort().join(',')
      if (currentSorted !== originalSorted) {
        body.tenantAdminUserIds = tenantAdminUserIds
      }

      // Don't send if nothing changed
      if (Object.keys(body).length === 0) {
        addToast({
          title: 'No changes',
          description: 'No fields were modified.',
          variant: 'info',
        })
        return
      }

      await updateTenantMutation({
        tenantId: tenant._id,
        body,
      }).unwrap()

      addToast({
        title: 'Tenant updated',
        description: `${name.trim()} has been updated.`,
        variant: 'success',
      })
      onClose()
    } catch (err) {
      const appError = normalizeError(err)

      if (isTenantAdminAssignmentsValidationError(appError)) {
        const assignmentMessage = getTenantAdminAssignmentsValidationMessage(appError)
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          tenantAdminUserIds: assignmentMessage,
        }))
        addToast({
          title: 'Tenant admin selection needs attention',
          description: assignmentMessage,
          variant: 'warning',
        })
        return
      }

      if (appError.status === 422 && appError.details) {
        const mapped = mapTenantValidationErrors(appError.details)
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped)
          return
        }
      }

      addToast({
        title: 'Failed to update tenant',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [tenant, name, website, tenantAdminUserIds, updateTenantMutation, addToast, onClose, validate, isArchivedTenant])

  if (!tenant) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <Dialog.Header>
        <h2 className="tenant-edit-drawer__title">Edit Tenant</h2>
      </Dialog.Header>

      <Dialog.Body>
        {lifecycleGuidance ? (
          <div
            className={[
              'tenant-edit-drawer__lifecycle-note',
              lifecycleGuidance.tone === 'warning'
                ? 'tenant-edit-drawer__lifecycle-note--warning'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            role={lifecycleGuidance.tone === 'warning' ? 'alert' : 'note'}
          >
            <p className="tenant-edit-drawer__lifecycle-title">{lifecycleGuidance.title}</p>
            <p className="tenant-edit-drawer__lifecycle-text">{lifecycleGuidance.message}</p>
          </div>
        ) : null}

        {/* Status display */}
        <div className="tenant-edit-drawer__status">
          <span className="tenant-edit-drawer__label">Status</span>
          <Status
            variant={STATUS_VARIANT_MAP[tenant.status] ?? 'neutral'}
            size="sm"
            showIcon
          >
            {tenant.status ?? 'UNKNOWN'}
          </Status>
          {tenant.isDefault && (
            <span className="tenant-edit-drawer__badge">Default</span>
          )}
        </div>

        {/* Editable fields */}
        <Input
          id="edit-tenant-name"
          label="Tenant Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          required
          fullWidth
          disabled={isLoading || isArchivedTenant}
        />

        <Input
          id="edit-tenant-website"
          type="url"
          label="Website URL"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          error={fieldErrors.website}
          fullWidth
          disabled={isLoading || isArchivedTenant}
        />

        {/* Tenant admin assignment */}
        <fieldset className="tenant-edit-drawer__fieldset">
          <legend className="tenant-edit-drawer__legend">Tenant Admins</legend>
          <p className="tenant-edit-drawer__hint">
            Keep at least one active tenant admin from this customer assigned. Stale, inactive,
            or out-of-customer selections will be rejected on save.
          </p>

          <UserSearchSelect
            customerId={customerId}
            selectedIds={tenantAdminUserIds}
            onChange={handleAdminChange}
            label="Search users by name or email"
            error={fieldErrors.tenantAdminUserIds}
            minRequired={1}
            disabled={isLoading || isArchivedTenant}
            originalIds={originalAdminIds}
          />
        </fieldset>
      </Dialog.Body>

      <Dialog.Footer className="tenant-edit-drawer__footer">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isLoading}
          disabled={isLoading || isArchivedTenant}
        >
          Save Changes
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export default TenantEditDrawer
