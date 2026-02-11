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
import { normalizeError } from '../../utils/errors.js'

/** Status variant mapping */
const STATUS_VARIANT_MAP = {
  ENABLED: 'success',
  DISABLED: 'error',
  ARCHIVED: 'neutral',
}

/**
 * TenantEditDrawer Component
 */
function TenantEditDrawer({ open, onClose, tenant, customerId }) {
  const { addToast } = useToaster()
  const [updateTenantMutation, { isLoading }] = useUpdateTenantMutation()

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
      const originalSorted = (tenant?.tenantAdminUserIds ?? []).sort().join(',')
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

      if (appError.status === 422 && appError.details) {
        const mapped = {}
        for (const detail of appError.details) {
          if (detail.field) mapped[detail.field] = detail.message
        }
        setFieldErrors(mapped)
      }

      addToast({
        title: 'Failed to update tenant',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [tenant, name, website, tenantAdminUserIds, updateTenantMutation, addToast, onClose, validate])

  if (!tenant) return null

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <Dialog.Header>
        <h2 className="tenant-edit-drawer__title">Edit Tenant</h2>
      </Dialog.Header>

      <Dialog.Body>
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
          disabled={isLoading}
        />

        <Input
          id="edit-tenant-website"
          type="url"
          label="Website URL"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          error={fieldErrors.website}
          fullWidth
          disabled={isLoading}
        />

        {/* Tenant admin assignment */}
        <fieldset className="tenant-edit-drawer__fieldset">
          <legend className="tenant-edit-drawer__legend">Tenant Admins</legend>

          <UserSearchSelect
            customerId={customerId}
            selectedIds={tenantAdminUserIds}
            onChange={handleAdminChange}
            label="Search users by name or email"
            error={fieldErrors.tenantAdminUserIds}
            minRequired={1}
            disabled={isLoading}
            originalIds={originalAdminIds}
          />
        </fieldset>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isLoading}
          disabled={isLoading}
        >
          Save Changes
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export default TenantEditDrawer
