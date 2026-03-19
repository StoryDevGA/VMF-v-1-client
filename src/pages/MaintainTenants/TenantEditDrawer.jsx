/**
 * Tenant Edit Drawer
 *
 * Dialog for editing an existing tenant's details and tenant-admin assignment.
 * Opens as a side-sheet style dialog when a tenant row's Edit action is triggered.
 *
 * Features:
 * - Tenant details are grouped at the top of the drawer
 * - One tenant admin is assigned through a searchable workspace below
 * - Exactly 1 admin is enforced in v1
 * - Diff-based update (only sends changed fields)
 *
 * @param {Object}  props
 * @param {boolean} props.open       - controls dialog visibility
 * @param {Function} props.onClose   - called when drawer should close
 * @param {Object}  props.tenant     - the tenant object being edited
 * @param {string}  props.customerId - customer scope for user lookup
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Status } from '../../components/Status'
import { useToaster } from '../../components/Toaster'
import { UserSearchSelect } from '../../components/UserSearchSelect'
import { useTenants } from '../../hooks/useTenants.js'
import { useListUsersQuery } from '../../store/api/userApi.js'
import {
  normalizeError,
  isTenantAdminAssignmentsValidationError,
  getTenantAdminAssignmentsValidationMessage,
} from '../../utils/errors.js'
import {
  STATUS_VARIANT_MAP,
  getTenantStatus,
  getTenantId,
  mapTenantValidationErrors,
} from './tenantUtils.js'

const getUserId = (user) => String(user?._id ?? user?.id ?? '').trim()
const getFallbackTenantAdmin = (userId, name = '') => ({
  id: userId,
  name: name || `${String(userId).slice(0, 8)}...`,
  email: '',
})

const getInitialTenantAdminIds = (tenant) => {
  const tenantAdminUserIds = Array.isArray(tenant?.tenantAdminUserIds)
    ? tenant.tenantAdminUserIds
        .map((userId) => String(userId ?? '').trim())
        .filter(Boolean)
    : []

  if (tenantAdminUserIds.length > 0) return tenantAdminUserIds.slice(0, 1)

  const tenantAdminId = getUserId(tenant?.tenantAdmin)
  return tenantAdminId ? [tenantAdminId] : []
}

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

/**
 * TenantEditDrawer Component
 */
function TenantEditDrawer({ open, onClose, tenant, customerId }) {
  const { addToast } = useToaster()
  const { updateTenant, updateTenantResult } = useTenants(customerId, { skipListQuery: true })
  const isLoading = Boolean(updateTenantResult?.isLoading)
  const {
    data: customerUsersResponse,
    error: customerUsersError,
  } = useListUsersQuery(
    {
      customerId,
      page: 1,
      pageSize: 100,
    },
    { skip: !open || !customerId },
  )
  const tenantStatus = getTenantStatus(tenant)
  const isArchivedTenant = tenantStatus === 'ARCHIVED'
  const lifecycleGuidance = useMemo(
    () => getTenantLifecycleGuidance(tenant),
    [tenant],
  )
  const customerUsersAppError = useMemo(
    () => (customerUsersError ? normalizeError(customerUsersError) : null),
    [customerUsersError],
  )

  /* ---- Local edit state ---- */
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [tenantAdminUserIds, setTenantAdminUserIds] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})

  /* ---- Original admin IDs for recovery detection ---- */
  const originalAdminIds = useMemo(
    () => getInitialTenantAdminIds(tenant),
    [tenant],
  )

  const customerUsers = customerUsersResponse?.data?.users ?? []
  const customerUserLookup = useMemo(() => {
    const lookup = {}

    for (const user of customerUsers) {
      const userId = getUserId(user)
      if (!userId) continue

      lookup[userId] = {
        id: userId,
        name: String(user?.name ?? '').trim() || String(user?.email ?? '').trim() || userId,
        email: String(user?.email ?? '').trim(),
      }
    }

    return lookup
  }, [customerUsers])

  /* ---- Sync from tenant prop ---- */
  const tenantIdForSync = getTenantId(tenant)

  useEffect(() => {
    if (open && tenant) {
      setName(tenant.name ?? '')
      setWebsite(tenant.website ?? '')
      setTenantAdminUserIds(getInitialTenantAdminIds(tenant))
      setFieldErrors({})
    }
    // Keyed on identity + open state, not full object reference,
    // so background refetches do not wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tenantIdForSync])

  const clearTenantAdminFieldError = useCallback(() => {
    setFieldErrors((currentErrors) => {
      if (!currentErrors.tenantAdminUserIds) return currentErrors
      const nextErrors = { ...currentErrors }
      delete nextErrors.tenantAdminUserIds
      return nextErrors
    })
  }, [])

  /* ---- Admin selection handler ---- */
  const handleAdminChange = useCallback((newIds) => {
    setTenantAdminUserIds(newIds.slice(0, 1))
    clearTenantAdminFieldError()
  }, [clearTenantAdminFieldError])

  const selectedTenantAdminUsers = useMemo(
    () => tenantAdminUserIds.reduce((accumulator, userId) => {
      const tenantAdminSummary = getUserId(tenant?.tenantAdmin) === userId
        ? getFallbackTenantAdmin(userId, String(tenant?.tenantAdmin?.name ?? '').trim())
        : null
      accumulator[userId] = customerUserLookup[userId] ?? tenantAdminSummary ?? getFallbackTenantAdmin(userId)
      return accumulator
    }, {}),
    [customerUserLookup, tenant, tenantAdminUserIds],
  )
  const currentTenantAdmin = useMemo(() => {
    const currentTenantAdminId = tenantAdminUserIds[0]
    if (!currentTenantAdminId) return null
    return selectedTenantAdminUsers[currentTenantAdminId] ?? getFallbackTenantAdmin(currentTenantAdminId)
  }, [selectedTenantAdminUsers, tenantAdminUserIds])

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
    if (tenantAdminUserIds.length !== 1) {
      errors.tenantAdminUserIds = 'Exactly one tenant admin is required for this tenant.'
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
      // Always send tenantAdminUserIds if changed
      const originalSorted = [...getInitialTenantAdminIds(tenant)].sort().join(',')
      const currentSorted = [...tenantAdminUserIds.slice(0, 1)].sort().join(',')
      if (currentSorted !== originalSorted) {
        body.tenantAdminUserIds = tenantAdminUserIds.slice(0, 1)
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

      await updateTenant(tenantId, body)

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
  }, [tenant, name, website, tenantAdminUserIds, updateTenant, addToast, onClose, validate, isArchivedTenant])

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
          Update tenant details and assign exactly one tenant admin in this workspace.
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

        <Fieldset className="tenant-edit-drawer__section">
          <Fieldset.Legend className="tenant-edit-drawer__legend">Tenant Admin</Fieldset.Legend>
          <Card variant="elevated" className="tenant-edit-drawer__linked-card">
            <Card.Body className="tenant-edit-drawer__linked-card-body">
              <div className="tenant-edit-drawer__linked-header">
                <div className="tenant-edit-drawer__linked-copy">
                  <p className="tenant-edit-drawer__linked-title">Tenant admin assignment</p>
                  <p className="tenant-edit-drawer__linked-text">
                    Assign exactly one tenant admin for this tenant. Selecting a different user
                    replaces the current tenant admin before you save.
                  </p>
                </div>
                <p className="tenant-edit-drawer__linked-summary">
                  {currentTenantAdmin ? 'Assigned' : 'Not assigned'}
                </p>
              </div>

              {currentTenantAdmin ? (
                <div className="tenant-edit-drawer__assigned-admin">
                  <strong className="tenant-edit-drawer__assigned-admin-name">
                    {currentTenantAdmin.name}
                  </strong>
                  <span className="tenant-edit-drawer__assigned-admin-email">
                    {currentTenantAdmin.email || currentTenantAdmin.id}
                  </span>
                </div>
              ) : (
                <p className="tenant-edit-drawer__assignment-empty">
                  No tenant admin is currently assigned.
                </p>
              )}

              <UserSearchSelect
                customerId={customerId}
                selectedIds={tenantAdminUserIds}
                selectedUsers={selectedTenantAdminUsers}
                onChange={handleAdminChange}
                label="Assign tenant admin"
                error={fieldErrors.tenantAdminUserIds}
                minRequired={1}
                maxSelections={1}
                disabled={isLoading || isArchivedTenant}
                originalIds={originalAdminIds}
                showSelectedUsers={false}
              />

              {customerUsersAppError ? (
                <ErrorSupportPanel
                  error={customerUsersAppError}
                  context="tenant-edit-tenant-admin"
                />
              ) : null}
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

