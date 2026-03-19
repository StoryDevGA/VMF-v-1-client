import { useState, useMemo, useEffect, useCallback } from 'react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Fieldset } from '../../components/Fieldset'
import { useToaster } from '../../components/Toaster'
import { UserSearchSelect } from '../../components/UserSearchSelect'
import { useTenants } from '../../hooks/useTenants.js'
import { useListUsersQuery } from '../../store/api/userApi.js'
import {
  normalizeError,
  isTenantAdminAssignmentsValidationError,
  getTenantAdminAssignmentsValidationMessage,
} from '../../utils/errors.js'

const getTenantId = (tenant) => String(tenant?._id ?? tenant?.id ?? '').trim()
const getUserId = (user) => String(user?._id ?? user?.id ?? '').trim()

const getFallbackUserSummary = (userId, name = '') => ({
  id: userId,
  name: name || `${String(userId).slice(0, 8)}...`,
  email: '',
})

function TenantAdminAssignmentDialog({ open, onClose, tenant, customerId }) {
  const { addToast } = useToaster()
  const { updateTenant, updateTenantResult } = useTenants(customerId, { skipListQuery: true })
  const isLoading = Boolean(updateTenantResult?.isLoading)
  const [tenantAdminUserIds, setTenantAdminUserIds] = useState([])
  const [fieldError, setFieldError] = useState('')

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

  const customerUsersAppError = useMemo(
    () => (customerUsersError ? normalizeError(customerUsersError) : null),
    [customerUsersError],
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

  const currentTenantAdmin = useMemo(() => {
    const currentTenantAdminId =
      getUserId(tenant?.tenantAdmin)
      || String(tenant?.tenantAdminUserIds?.[0] ?? '').trim()

    if (!currentTenantAdminId) return null

    const tenantAdminSummary = tenant?.tenantAdmin
      ? getFallbackUserSummary(
        currentTenantAdminId,
        String(tenant?.tenantAdmin?.name ?? '').trim(),
      )
      : null

    return customerUserLookup[currentTenantAdminId] ?? tenantAdminSummary ?? getFallbackUserSummary(currentTenantAdminId)
  }, [customerUserLookup, tenant])

  const selectedTenantAdminUsers = useMemo(
    () => tenantAdminUserIds.reduce((accumulator, userId) => {
      accumulator[userId] = customerUserLookup[userId] ?? getFallbackUserSummary(userId)
      return accumulator
    }, {}),
    [customerUserLookup, tenantAdminUserIds],
  )

  const replacementTenantAdmin = useMemo(() => {
    const replacementId = tenantAdminUserIds[0]
    if (!replacementId) return null
    return selectedTenantAdminUsers[replacementId] ?? getFallbackUserSummary(replacementId)
  }, [selectedTenantAdminUsers, tenantAdminUserIds])

  useEffect(() => {
    if (!open) return
    setTenantAdminUserIds([])
    setFieldError('')
  }, [open, tenant])

  const handleDialogClose = useCallback(() => {
    setTenantAdminUserIds([])
    setFieldError('')
    onClose()
  }, [onClose])

  const handleTenantAdminChange = useCallback((newIds) => {
    setTenantAdminUserIds(newIds.slice(0, 1))
    setFieldError('')
  }, [])

  const handleAssignAdmin = useCallback(async () => {
    const tenantId = getTenantId(tenant)

    if (!tenantId) {
      addToast({
        title: 'Missing tenant identifier',
        description: 'This tenant record is missing an identifier, so tenant admin assignment could not be completed.',
        variant: 'error',
      })
      return
    }

    if (tenantAdminUserIds.length !== 1) {
      setFieldError('Select one tenant admin before continuing.')
      return
    }

    if (currentTenantAdmin?.id && tenantAdminUserIds[0] === currentTenantAdmin.id) {
      setFieldError('Choose a different user to replace the current tenant admin.')
      return
    }

    try {
      await updateTenant(tenantId, {
        tenantAdminUserIds: tenantAdminUserIds.slice(0, 1),
      })

      addToast({
        title: currentTenantAdmin ? 'Tenant admin replaced' : 'Tenant admin assigned',
        description: currentTenantAdmin
          ? `${tenant?.name ?? 'This tenant'} now has ${replacementTenantAdmin?.name ?? 'the selected user'} as tenant admin.`
          : `${replacementTenantAdmin?.name ?? 'The selected user'} is now assigned as tenant admin for ${tenant?.name ?? 'this tenant'}.`,
        variant: 'success',
      })

      handleDialogClose()
    } catch (err) {
      const appError = normalizeError(err)
      const singleAdminMessage =
        typeof appError?.details?.tenantAdminUserIds === 'string'
          ? appError.details.tenantAdminUserIds
          : null

      if (singleAdminMessage) {
        setFieldError(singleAdminMessage)
        addToast({
          title: 'Tenant admin selection needs attention',
          description: singleAdminMessage,
          variant: 'warning',
        })
        return
      }

      if (isTenantAdminAssignmentsValidationError(appError)) {
        const assignmentMessage = getTenantAdminAssignmentsValidationMessage(appError)
        setFieldError(assignmentMessage)
        addToast({
          title: 'Tenant admin selection needs attention',
          description: assignmentMessage,
          variant: 'warning',
        })
        return
      }

      addToast({
        title: 'Failed to update tenant admin',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [
    addToast,
    currentTenantAdmin,
    handleDialogClose,
    replacementTenantAdmin,
    tenant,
    tenantAdminUserIds,
    updateTenant,
  ])

  if (!tenant) return null

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      size="md"
      className="tenant-admin-dialog"
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <Dialog.Header>
        <h2 className="maintain-tenants__dialog-title tenant-admin-dialog__title">Assign Tenant Admin</h2>
        <p className="maintain-tenants__dialog-subtitle tenant-admin-dialog__subtitle">
          {currentTenantAdmin
            ? `Replace the current tenant admin for ${tenant?.name ?? 'this tenant'}.`
            : `Assign the first tenant admin for ${tenant?.name ?? 'this tenant'}.`}
        </p>
      </Dialog.Header>

      <Dialog.Body className="maintain-tenants__dialog-body tenant-admin-dialog__body">
        <Fieldset className="tenant-admin-dialog__section">
          <Fieldset.Legend className="tenant-admin-dialog__legend">Replacement Tenant Admin</Fieldset.Legend>
          <Card variant="elevated" className="tenant-admin-dialog__replacement-card">
            <Card.Body className="tenant-admin-dialog__replacement-card-body">
              <UserSearchSelect
                customerId={customerId}
                selectedIds={tenantAdminUserIds}
                selectedUsers={selectedTenantAdminUsers}
                onChange={handleTenantAdminChange}
                label="Search for replacement admin"
                error={fieldError}
                minRequired={1}
                maxSelections={1}
                allowTemporaryEmptySelection
                expandDropdown
                disabled={isLoading}
              />
              <p className="tenant-admin-dialog__hint">
                Search for an active user from this customer and select them as the replacement tenant admin.
              </p>
              {customerUsersAppError ? (
                <ErrorSupportPanel
                  error={customerUsersAppError}
                  context="tenant-admin-assignment"
                />
              ) : null}
            </Card.Body>
          </Card>
        </Fieldset>

        <Fieldset className="tenant-admin-dialog__section">
          <Fieldset.Legend className="tenant-admin-dialog__legend">Current Tenant Admin</Fieldset.Legend>
          <Card variant="elevated" className="tenant-admin-dialog__summary-card">
            <Card.Body className="tenant-admin-dialog__summary-card-body">
              <p className="tenant-admin-dialog__summary-label">Assigned now</p>
              <p className="tenant-admin-dialog__summary-value">
                {currentTenantAdmin?.name ?? 'Not assigned'}
              </p>
              <p className="tenant-admin-dialog__summary-meta">
                {currentTenantAdmin?.email || currentTenantAdmin?.id || 'Choose a replacement user above.'}
              </p>
            </Card.Body>
          </Card>
        </Fieldset>
      </Dialog.Body>

      <Dialog.Footer className="maintain-tenants__dialog-footer tenant-admin-dialog__footer">
        <Button variant="outline" onClick={handleDialogClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleAssignAdmin}
          loading={isLoading}
          disabled={isLoading}
        >
          {currentTenantAdmin ? 'Replace Admin' : 'Assign Admin'}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export default TenantAdminAssignmentDialog
