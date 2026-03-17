/**
 * Tenant Edit Drawer
 *
 * Dialog for editing an existing tenant's details and linked tenant admins.
 * Opens as a side-sheet style dialog when a tenant row's Edit action is triggered.
 *
 * Features:
 * - Tenant details are grouped at the top of the drawer
 * - Linked tenant admins are managed in a searchable workspace below
 * - Minimum 1 admin enforcement with removal protection
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
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { useToaster } from '../../components/Toaster'
import { UserSearchSelect } from '../../components/UserSearchSelect'
import { useListUsersQuery } from '../../store/api/userApi.js'
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

const LINKED_USER_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'UNKNOWN', label: 'Unavailable' },
]

const LINKED_USER_STATUS_VARIANT_MAP = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  UNKNOWN: 'neutral',
}

const getTenantStatus = (tenant) => String(tenant?.status ?? 'UNKNOWN').trim().toUpperCase()
const getTenantId = (tenant) => String(tenant?._id ?? tenant?.id ?? '').trim()
const getUserId = (user) => String(user?._id ?? user?.id ?? '').trim()

const getUserRoles = (user, customerId) => {
  if (Array.isArray(user?.customerRoles) && user.customerRoles.length > 0) {
    return user.customerRoles
  }

  if (!Array.isArray(user?.memberships)) return []

  const membership = user.memberships.find(
    (entry) => String(entry?.customerId ?? '') === String(customerId ?? ''),
  )

  return Array.isArray(membership?.roles) ? membership.roles : []
}

const getLinkedUserStatus = (user) => {
  const explicitStatus = String(user?.status ?? '').trim().toUpperCase()
  if (explicitStatus === 'ENABLED' || explicitStatus === 'ACTIVE') return 'ACTIVE'
  if (explicitStatus === 'DISABLED' || explicitStatus === 'INACTIVE' || explicitStatus === 'REVOKED') {
    return 'INACTIVE'
  }
  if (explicitStatus) return explicitStatus

  if (typeof user?.isActive === 'boolean') {
    return user.isActive ? 'ACTIVE' : 'INACTIVE'
  }

  return 'UNKNOWN'
}

const getFallbackLinkedUserRow = (userId) => ({
  id: userId,
  name: `${String(userId).slice(0, 8)}...`,
  email: '',
  status: 'UNKNOWN',
  roles: [],
})

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
  const {
    data: customerUsersResponse,
    isFetching: isFetchingCustomerUsers,
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
  const [linkedUserSearch, setLinkedUserSearch] = useState('')
  const [linkedUserStatusFilter, setLinkedUserStatusFilter] = useState('')
  const [selectedLinkedUserIds, setSelectedLinkedUserIds] = useState(new Set())

  /* ---- Original admin IDs for recovery detection ---- */
  const originalAdminIds = useMemo(
    () => tenant?.tenantAdminUserIds ?? [],
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
        status: getLinkedUserStatus(user),
        roles: getUserRoles(user, customerId),
      }
    }

    return lookup
  }, [customerUsers, customerId])

  /* ---- Sync from tenant prop ---- */
  useEffect(() => {
    if (tenant) {
      setName(tenant.name ?? '')
      setWebsite(tenant.website ?? '')
      setTenantAdminUserIds(tenant.tenantAdminUserIds ?? [])
      setFieldErrors({})
      setLinkedUserSearch('')
      setLinkedUserStatusFilter('')
      setSelectedLinkedUserIds(new Set())
    }
  }, [tenant])

  useEffect(() => {
    setSelectedLinkedUserIds((currentSelection) => {
      if (currentSelection.size === 0) return currentSelection

      const nextSelection = new Set(
        [...currentSelection].filter((userId) => tenantAdminUserIds.includes(userId)),
      )

      return nextSelection.size === currentSelection.size ? currentSelection : nextSelection
    })
  }, [tenantAdminUserIds])

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
    setTenantAdminUserIds(newIds)
    clearTenantAdminFieldError()
  }, [clearTenantAdminFieldError])

  const allLinkedUserRows = useMemo(
    () => tenantAdminUserIds.map((userId) => (
      customerUserLookup[userId] ?? getFallbackLinkedUserRow(userId)
    )),
    [customerUserLookup, tenantAdminUserIds],
  )

  const selectedTenantAdminUsers = useMemo(
    () => tenantAdminUserIds.reduce((accumulator, userId) => {
      if (customerUserLookup[userId]) {
        accumulator[userId] = customerUserLookup[userId]
      }
      return accumulator
    }, {}),
    [customerUserLookup, tenantAdminUserIds],
  )

  const filteredLinkedUserRows = useMemo(() => {
    const normalizedSearch = linkedUserSearch.trim().toLowerCase()

    return allLinkedUserRows.filter((row) => {
      const matchesStatus = !linkedUserStatusFilter || row.status === linkedUserStatusFilter
      if (!matchesStatus) return false

      if (!normalizedSearch) return true

      const haystack = [
        row.name,
        row.email,
        row.id,
        ...(Array.isArray(row.roles) ? row.roles : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [allLinkedUserRows, linkedUserSearch, linkedUserStatusFilter])

  const linkedUserSummary = useMemo(() => {
    const activeCount = allLinkedUserRows.filter((row) => row.status === 'ACTIVE').length
    return `${allLinkedUserRows.length} linked user${allLinkedUserRows.length === 1 ? '' : 's'} | ${activeCount} active`
  }, [allLinkedUserRows])

  const removeTenantAdmins = useCallback((userIdsToRemove) => {
    if (!Array.isArray(userIdsToRemove) || userIdsToRemove.length === 0) return

    const uniqueUserIdsToRemove = [...new Set(userIdsToRemove)]
    const remainingCount = tenantAdminUserIds.filter(
      (userId) => !uniqueUserIdsToRemove.includes(userId),
    ).length

    if (remainingCount < 1) {
      const removalMessage = 'At least one tenant admin must remain linked to this tenant.'
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        tenantAdminUserIds: removalMessage,
      }))
      addToast({
        title: 'Cannot remove all linked users',
        description: `${removalMessage} Add a replacement first.`,
        variant: 'warning',
      })
      return
    }

    setTenantAdminUserIds((currentIds) => (
      currentIds.filter((userId) => !uniqueUserIdsToRemove.includes(userId))
    ))
    setSelectedLinkedUserIds(new Set())
    clearTenantAdminFieldError()
  }, [addToast, clearTenantAdminFieldError, tenantAdminUserIds])

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

  const linkedUserColumns = useMemo(
    () => [
      {
        key: 'identity',
        label: 'User',
        width: '240px',
        render: (_value, row) => (
          <div className="tenant-edit-drawer__linked-user">
            <strong className="tenant-edit-drawer__linked-user-name">{row.name}</strong>
            <span className="tenant-edit-drawer__linked-user-email">
              {row.email || row.id}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: '148px',
        render: (_value, row) => (
          <Status
            size="sm"
            showIcon
            variant={LINKED_USER_STATUS_VARIANT_MAP[row.status] ?? 'neutral'}
          >
            {row.status}
          </Status>
        ),
      },
      {
        key: 'roles',
        label: 'Roles',
        render: (_value, row) => (
          row.roles.length > 0 ? row.roles.join(', ') : '--'
        ),
      },
    ],
    [],
  )

  const linkedUserActions = useMemo(
    () => [
      {
        label: 'Remove',
        variant: 'ghost',
        disabled: () => isLoading || isArchivedTenant || tenantAdminUserIds.length <= 1,
      },
    ],
    [isArchivedTenant, isLoading, tenantAdminUserIds.length],
  )

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
        customerId,
        tenantId,
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
      size="lg"
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
          <Fieldset.Legend className="tenant-edit-drawer__legend">Linked Users</Fieldset.Legend>
          <Card variant="elevated" className="tenant-edit-drawer__linked-card">
            <Card.Body className="tenant-edit-drawer__linked-card-body">
              <div className="tenant-edit-drawer__linked-header">
                <div className="tenant-edit-drawer__linked-copy">
                  <p className="tenant-edit-drawer__linked-title">Linked tenant admins</p>
                  <p className="tenant-edit-drawer__linked-text">
                    Add, search, filter, and remove the users who administer this tenant. At least
                    one tenant admin must remain linked before you save.
                  </p>
                </div>
                <p className="tenant-edit-drawer__linked-summary">{linkedUserSummary}</p>
              </div>

              <UserSearchSelect
                customerId={customerId}
                selectedIds={tenantAdminUserIds}
                selectedUsers={selectedTenantAdminUsers}
                onChange={handleAdminChange}
                label="Add users to this tenant"
                error={fieldErrors.tenantAdminUserIds}
                minRequired={1}
                disabled={isLoading || isArchivedTenant}
                originalIds={originalAdminIds}
              />

              <div className="tenant-edit-drawer__linked-toolbar">
                <Input
                  id="edit-tenant-linked-user-search"
                  label="Search linked users"
                  size="sm"
                  value={linkedUserSearch}
                  onChange={(event) => setLinkedUserSearch(event.target.value)}
                  placeholder="Search by name, email, role, or ID"
                  fullWidth
                  disabled={isLoading}
                />
                <Select
                  id="edit-tenant-linked-user-status"
                  label="Status"
                  size="sm"
                  value={linkedUserStatusFilter}
                  onChange={(event) => setLinkedUserStatusFilter(event.target.value)}
                  options={LINKED_USER_STATUS_OPTIONS}
                  disabled={isLoading}
                />
              </div>

              <div className="tenant-edit-drawer__linked-actions">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeTenantAdmins([...selectedLinkedUserIds])}
                  disabled={
                    isLoading
                    || isArchivedTenant
                    || selectedLinkedUserIds.size === 0
                    || tenantAdminUserIds.length - selectedLinkedUserIds.size < 1
                  }
                >
                  Remove Selected
                </Button>
              </div>

              {customerUsersAppError ? (
                <ErrorSupportPanel
                  error={customerUsersAppError}
                  context="tenant-edit-linked-users"
                />
              ) : null}

              <HorizontalScroll
                ariaLabel="Linked users table"
                className="tenant-edit-drawer__table-wrap"
                gap="sm"
              >
                <Table
                  className="tenant-edit-drawer__table"
                  columns={linkedUserColumns}
                  data={filteredLinkedUserRows}
                  selectable
                  selectedRows={selectedLinkedUserIds}
                  onSelectChange={setSelectedLinkedUserIds}
                  actions={linkedUserActions}
                  onRowAction={(_label, row) => removeTenantAdmins([row.id])}
                  loading={isFetchingCustomerUsers}
                  variant="striped"
                  hoverable
                  emptyMessage={
                    linkedUserSearch.trim() || linkedUserStatusFilter
                      ? 'No linked users match the current filters.'
                      : 'No linked users are assigned to this tenant.'
                  }
                  ariaLabel="Linked users"
                />
              </HorizontalScroll>
            </Card.Body>
          </Card>
        </Fieldset>
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

