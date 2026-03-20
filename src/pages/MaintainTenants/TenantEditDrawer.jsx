/**
 * Tenant Edit Drawer
 *
 * Dialog for editing an existing tenant's details.
 * Opens as a side-sheet style dialog when a tenant row's Edit action is triggered.
 *
 * @param {Object}  props
 * @param {boolean} props.open       - controls dialog visibility
 * @param {Function} props.onClose   - called when drawer should close
 * @param {Object}  props.tenant     - the tenant object being edited
 * @param {string}  props.customerId - customer scope for tenant mutation
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Status } from '../../components/Status'
import { useToaster } from '../../components/Toaster'
import { useTenants } from '../../hooks/useTenants.js'
import { normalizeError } from '../../utils/errors.js'
import {
  STATUS_VARIANT_MAP,
  getTenantStatus,
  getTenantId,
  mapTenantValidationErrors,
} from './tenantUtils.js'

const getTenantLifecycleGuidance = (tenant) => {
  const tenantStatus = getTenantStatus(tenant)

  if (tenantStatus === 'ARCHIVED') {
    return {
      tone: 'warning',
      title: 'Archived tenant',
      message:
        'Archived tenants are read-only in this workspace. Update lifecycle elsewhere before editing tenant details.',
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

function TenantEditDrawer({ open, onClose, tenant, customerId }) {
  const { addToast } = useToaster()
  const { updateTenant, updateTenantResult } = useTenants(customerId, { skipListQuery: true })
  const isLoading = Boolean(updateTenantResult?.isLoading)
  const tenantStatus = getTenantStatus(tenant)
  const isArchivedTenant = tenantStatus === 'ARCHIVED'
  const lifecycleGuidance = useMemo(
    () => getTenantLifecycleGuidance(tenant),
    [tenant],
  )

  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const tenantIdForSync = getTenantId(tenant)

  useEffect(() => {
    if (open && tenant) {
      setName(tenant.name ?? '')
      setWebsite(tenant.website ?? '')
      setFieldErrors({})
    }
    // Keyed on identity + open state, not full object reference,
    // so background refetches do not wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tenantIdForSync])

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

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [name, website])

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

    const tenantId = getTenantId(tenant)
    if (!tenantId) {
      addToast({
        title: 'Missing tenant identifier',
        description: 'This tenant record is missing an identifier and cannot be saved.',
        variant: 'error',
      })
      return
    }

    try {
      const body = {}

      if (name.trim() !== (tenant?.name ?? '')) {
        body.name = name.trim()
      }

      if (website.trim() !== (tenant?.website ?? '')) {
        body.website = website.trim()
      }

      if (Object.keys(body).length === 0) {
        addToast({
          title: 'No changes',
          description: 'No fields were modified.',
          variant: 'info',
        })
        return
      }

      await updateTenant(tenantId, body)

      addToast({
        title: 'Tenant updated',
        description: `${name.trim()} has been updated.`,
        variant: 'success',
      })
      onClose()
    } catch (err) {
      const appError = normalizeError(err)

      if (appError.status === 422 && appError.details) {
        const mapped = mapTenantValidationErrors(appError.details)
        const detailsFieldErrors = {}

        if (mapped.name) detailsFieldErrors.name = mapped.name
        if (mapped.website) detailsFieldErrors.website = mapped.website

        if (Object.keys(detailsFieldErrors).length > 0) {
          setFieldErrors(detailsFieldErrors)
          return
        }
      }

      addToast({
        title: 'Failed to update tenant',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [tenant, name, website, updateTenant, addToast, onClose, validate, isArchivedTenant])

  if (!tenant) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <Dialog.Header>
        <h2 className="maintain-tenants__dialog-title tenant-edit-drawer__title">Edit Tenant</h2>
        <p className="maintain-tenants__dialog-subtitle tenant-edit-drawer__subtitle">
          Update tenant details in this workspace. Use Assign Admin from the table actions to change tenant admin.
        </p>
      </Dialog.Header>

      <Dialog.Body className="maintain-tenants__dialog-body tenant-edit-drawer__body">
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

        <Fieldset className="tenant-edit-drawer__section">
          <Fieldset.Legend className="tenant-edit-drawer__legend">Tenant Details</Fieldset.Legend>
          <Card variant="elevated" className="tenant-edit-drawer__details-card">
            <Card.Body className="tenant-edit-drawer__details-card-body">
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

              <div className="tenant-edit-drawer__details-grid">
                <Input
                  id="edit-tenant-name"
                  label="Tenant Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
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
                  onChange={(event) => setWebsite(event.target.value)}
                  error={fieldErrors.website}
                  fullWidth
                  disabled={isLoading || isArchivedTenant}
                />
              </div>
            </Card.Body>
          </Card>
        </Fieldset>
      </Dialog.Body>

      <Dialog.Footer className="maintain-tenants__dialog-footer tenant-edit-drawer__footer">
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

export { TenantEditDrawer }
export default TenantEditDrawer
