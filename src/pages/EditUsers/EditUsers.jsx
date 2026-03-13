/**
 * Edit Users Page
 *
 * Central user management page at `/app/administration/edit-users`.
 * Displays a customer-scoped user catalogue with search, lifecycle actions,
 * governed ownership transfer, and supporting dialogs.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Fieldset } from '../../components/Fieldset'
import { Spinner } from '../../components/Spinner'
import { useToaster } from '../../components/Toaster'
import { useUsers } from '../../hooks/useUsers.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { getCustomerLifecycleStatus } from '../../utils/authorization.js'
import {
  normalizeError,
  isCustomerInactiveError,
  getCustomerInactiveMessage,
  isCanonicalAdminConflictError,
  getCanonicalAdminConflictMessage,
  getUserLifecycleMessage,
} from '../../utils/errors.js'
import CreateUserWizard from './CreateUserWizard'
import UserEditDrawer from './UserEditDrawer'
import BulkUserOperations from './BulkUserOperations'
import OwnershipTransferDialog from './OwnershipTransferDialog'
import EditUsersListView from './EditUsersListView'
import './EditUsers.css'

const SEARCH_DEBOUNCE = 300

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

const CUSTOMER_ADMIN_GOVERNANCE_NOTE =
  'Canonical Admin marks the governed owner for this customer. Create or update the replacement user first, then use Transfer Ownership from that user\'s row. Generic role edits do not transfer ownership.'

const USER_LIFECYCLE_NOTE =
  'Active users with UNTRUSTED trust can receive Resend Invitation. Disabled users must be reactivated before invitation recovery is available again.'

const EDIT_USERS_INACTIVE_CUSTOMER_MESSAGE =
  'This customer is inactive. User-management actions are unavailable until a Super Admin reactivates the customer.'

const BULK_CREATE_DIALOG_CONFIG = {
  initialOperation: 'create',
  availableOperations: ['create'],
}

const BULK_UPDATE_DIALOG_CONFIG = {
  initialOperation: 'update',
  availableOperations: ['update'],
}

const BULK_DISABLE_DIALOG_CONFIG = {
  initialOperation: 'disable',
  availableOperations: ['disable'],
}

const getMutationPayload = (result) => {
  if (result?.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
    return result.data
  }

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result
  }

  return {}
}

const getUserTrustStatus = (user) =>
  String(user?.trustStatus ?? user?.identityPlus?.trustStatus ?? 'UNTRUSTED')
    .trim()
    .toUpperCase()

function EditUsersBoundaryState({
  title = 'Edit Users',
  message,
  actions = null,
  isLoading = false,
}) {
  return (
    <section className="edit-users container" aria-label="Edit Users">
      <header className="edit-users__header">
        <h1 className="edit-users__title">{title}</h1>
      </header>

      <Fieldset className="edit-users__fieldset">
        <Fieldset.Legend className="sr-only">Edit users context state</Fieldset.Legend>
        <Card variant="elevated" className="edit-users__card edit-users__card--state">
          <Card.Body className="edit-users__card-body edit-users__card-body--state">
            {isLoading ? (
              <div className="edit-users__state-loading" role="status" aria-live="polite">
                <Spinner size="sm" />
                <span>{message}</span>
              </div>
            ) : (
              <p className="edit-users__state-message">{message}</p>
            )}
            {actions}
          </Card.Body>
        </Card>
      </Fieldset>
    </section>
  )
}

function EditUsers() {
  const { addToast } = useToaster()
  const { user, isSuperAdmin, accessibleCustomerIds } = useAuthorization()
  const {
    customerId,
    tenantId,
    tenantName,
    resolvedTenantName,
    isResolvingSelectedTenantContext,
    hasInvalidTenantContext,
    tenantsError,
    setTenantId,
  } = useTenantContext()

  const {
    users,
    pagination,
    isLoading,
    isFetching,
    error: usersError,
    setSearch,
    statusFilter,
    setStatusFilter,
    setPage,
    disableUser,
    enableUser,
    deleteUser,
    resendInvitation,
    disableUserResult,
    enableUserResult,
    deleteUserResult,
    resendInvitationResult,
  } = useUsers(customerId)

  const [searchInput, setSearchInput] = useState('')
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [showBulkOperations, setShowBulkOperations] = useState(false)
  const [bulkDialogConfig, setBulkDialogConfig] = useState(BULK_CREATE_DIALOG_CONFIG)
  const [editingUser, setEditingUser] = useState(null)
  const [ownershipTransferTarget, setOwnershipTransferTarget] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [selectedRows, setSelectedRows] = useState(new Set())
  const previousContextKeyRef = useRef(`${customerId ?? ''}::${tenantId ?? ''}`)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, SEARCH_DEBOUNCE)

    return () => clearTimeout(timer)
  }, [searchInput, setPage, setSearch])

  const listUsersAppError = useMemo(
    () => (usersError ? normalizeError(usersError) : null),
    [usersError],
  )

  const tenantContextAppError = useMemo(
    () => (tenantsError ? normalizeError(tenantsError) : null),
    [tenantsError],
  )

  const selectedCustomerLifecycleStatus = useMemo(
    () => getCustomerLifecycleStatus(user, customerId),
    [customerId, user],
  )

  const inactiveCustomerAppError = useMemo(() => {
    if (isCustomerInactiveError(listUsersAppError)) return listUsersAppError
    if (isCustomerInactiveError(tenantContextAppError)) return tenantContextAppError
    return null
  }, [listUsersAppError, tenantContextAppError])

  const isInactiveCustomerLocked =
    selectedCustomerLifecycleStatus === 'INACTIVE' || Boolean(inactiveCustomerAppError)

  const inactiveCustomerMessage = useMemo(
    () =>
      getCustomerInactiveMessage(
        inactiveCustomerAppError,
        EDIT_USERS_INACTIVE_CUSTOMER_MESSAGE,
      ),
    [inactiveCustomerAppError],
  )

  useEffect(() => {
    const nextContextKey = `${customerId ?? ''}::${tenantId ?? ''}`
    if (previousContextKeyRef.current === nextContextKey) return

    previousContextKeyRef.current = nextContextKey
    setShowCreateWizard(false)
    setShowBulkOperations(false)
    setBulkDialogConfig(BULK_CREATE_DIALOG_CONFIG)
    setEditingUser(null)
    setOwnershipTransferTarget(null)
    setConfirmAction(null)
    setSelectedRows(new Set())
    setSearchInput('')
    setSearch('')
    setStatusFilter('')
    setPage(1)
  }, [customerId, tenantId, setPage, setSearch, setStatusFilter])

  useEffect(() => {
    if (!isInactiveCustomerLocked) return

    setShowCreateWizard(false)
    setShowBulkOperations(false)
    setBulkDialogConfig(BULK_CREATE_DIALOG_CONFIG)
    setEditingUser(null)
    setOwnershipTransferTarget(null)
    setConfirmAction(null)
    setSelectedRows(new Set())
  }, [isInactiveCustomerLocked])

  const handleDisable = useCallback(
    async (targetUser) => {
      try {
        await disableUser(targetUser._id)
        addToast({
          title: 'User disabled',
          description: `${targetUser.name} has been disabled.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)

        if (isCanonicalAdminConflictError(appError)) {
          addToast({
            title: 'Cannot disable user',
            description: getCanonicalAdminConflictMessage(appError, 'disable'),
            variant: 'warning',
          })
          return
        }

        addToast({
          title: 'Failed to disable user',
          description: getUserLifecycleMessage(appError, 'Failed to disable user.'),
          variant: 'error',
        })
      }

      setConfirmAction(null)
    },
    [addToast, disableUser],
  )

  const handleDelete = useCallback(
    async (targetUser) => {
      try {
        await deleteUser(targetUser._id)
        addToast({
          title: 'User deleted',
          description: `${targetUser.name} has been permanently deleted.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)

        if (isCanonicalAdminConflictError(appError)) {
          addToast({
            title: 'Cannot delete user',
            description: getCanonicalAdminConflictMessage(appError, 'delete'),
            variant: 'warning',
          })
          return
        }

        addToast({
          title: 'Failed to delete user',
          description: getUserLifecycleMessage(appError, 'Failed to delete user.'),
          variant: 'error',
        })
      }

      setConfirmAction(null)
    },
    [addToast, deleteUser],
  )

  const handleEnable = useCallback(
    async (targetUser) => {
      try {
        const result = await enableUser(targetUser._id)
        const enabledUser = getMutationPayload(result)
        const enabledUserName = String(enabledUser?.name ?? targetUser?.name ?? 'User').trim() || 'User'
        const enabledTrustStatus = getUserTrustStatus(enabledUser)

        if (enabledTrustStatus === 'UNTRUSTED') {
          addToast({
            title: 'User reactivated',
            description: `${enabledUserName} is active again. Trust is UNTRUSTED, so Resend Invitation is available if the user still needs a new invite.`,
            variant: 'warning',
          })
        } else {
          addToast({
            title: 'User reactivated',
            description: `${enabledUserName} is active again.`,
            variant: 'success',
          })
        }
      } catch (err) {
        const appError = normalizeError(err)
        addToast({
          title: 'Failed to reactivate user',
          description: getUserLifecycleMessage(appError, 'Failed to reactivate user.'),
          variant: 'error',
        })
      }

      setConfirmAction(null)
    },
    [addToast, enableUser],
  )

  const handleResendInvitation = useCallback(
    async (targetUser) => {
      try {
        await resendInvitation(targetUser._id)
        addToast({
          title: 'Invitation sent',
          description: `Invitation resent to ${targetUser.email}.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        addToast({
          title: 'Failed to resend invitation',
          description: getUserLifecycleMessage(appError, 'Failed to resend invitation.'),
          variant: 'error',
        })
      }
    },
    [addToast, resendInvitation],
  )

  const handleConfirmAction = useCallback(() => {
    if (!confirmAction) return

    if (confirmAction.type === 'disable') {
      handleDisable(confirmAction.user)
      return
    }

    if (confirmAction.type === 'enable') {
      handleEnable(confirmAction.user)
      return
    }

    if (confirmAction.type === 'delete') {
      handleDelete(confirmAction.user)
    }
  }, [confirmAction, handleDelete, handleDisable, handleEnable])

  const tableData = useMemo(
    () => users.map((entry) => ({ ...entry, id: entry._id })),
    [users],
  )

  const visibleUserIds = useMemo(
    () => new Set(tableData.map((row) => row.id)),
    [tableData],
  )

  const canonicalAdminUser = useMemo(
    () => tableData.find((row) => row?.isCanonicalAdmin) ?? null,
    [tableData],
  )

  const selectedRowsSafe = useMemo(
    () => new Set([...selectedRows].filter((id) => visibleUserIds.has(id))),
    [selectedRows, visibleUserIds],
  )

  const isLifecycleMutationLoading =
    Boolean(disableUserResult?.isLoading)
    || Boolean(enableUserResult?.isLoading)
    || Boolean(deleteUserResult?.isLoading)

  const isRowActionMutationLoading =
    isLifecycleMutationLoading || Boolean(resendInvitationResult?.isLoading)

  const handleOpenBulkCreate = useCallback(() => {
    setBulkDialogConfig(BULK_CREATE_DIALOG_CONFIG)
    setShowBulkOperations(true)
  }, [])

  const handleOpenBulkUpdateSelected = useCallback(() => {
    setBulkDialogConfig(BULK_UPDATE_DIALOG_CONFIG)
    setShowBulkOperations(true)
  }, [])

  const handleOpenBulkDisableSelected = useCallback(() => {
    setBulkDialogConfig(BULK_DISABLE_DIALOG_CONFIG)
    setShowBulkOperations(true)
  }, [])

  const handleCloseBulkOperations = useCallback(() => {
    setShowBulkOperations(false)
    setBulkDialogConfig(BULK_CREATE_DIALOG_CONFIG)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedRows(new Set())
  }, [])

  const handleFirstPage = useCallback(() => {
    setPage(1)
  }, [setPage])

  const handlePrevPage = useCallback(() => {
    setPage((currentPage) => Math.max(1, currentPage - 1))
  }, [setPage])

  const handleNextPage = useCallback(() => {
    setPage((currentPage) => Math.min(pagination.totalPages, currentPage + 1))
  }, [pagination.totalPages, setPage])

  const handleLastPage = useCallback(() => {
    setPage(pagination.totalPages)
  }, [pagination.totalPages, setPage])

  if (!customerId && isSuperAdmin) {
    return (
      <EditUsersBoundaryState
        message="Please select a customer from the dashboard context panel to manage users."
      />
    )
  }

  if (!customerId && accessibleCustomerIds.length > 0) {
    return (
      <EditUsersBoundaryState
        message="Resolving your customer context..."
        isLoading={isLoading}
      />
    )
  }

  if (!customerId) {
    return (
      <EditUsersBoundaryState
        message="No customer context available. Please contact your administrator."
      />
    )
  }

  if (isInactiveCustomerLocked) {
    return <EditUsersBoundaryState message={inactiveCustomerMessage} />
  }

  if (hasInvalidTenantContext) {
    return (
      <EditUsersBoundaryState
        message={
          tenantName
            ? `The selected tenant context "${tenantName}" is no longer available for this customer.`
            : 'The selected tenant context is no longer available for this customer.'
        }
        actions={(
          <div className="edit-users__state-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTenantId(null, null)}
            >
              Clear Tenant Scope
            </Button>
          </div>
        )}
      />
    )
  }

  return (
    <section className="edit-users container" aria-label="Edit Users">
      <EditUsersListView
        tenantScopeMessage={
          tenantId
            ? (
                isResolvingSelectedTenantContext
                  ? 'Checking selected tenant context...'
                  : `Selected tenant context: ${resolvedTenantName ?? tenantName ?? tenantId}. The current user list remains scoped to the active customer.`
              )
            : ''
        }
        tenantContextAppError={tenantContextAppError}
        listUsersAppError={listUsersAppError}
        governanceNote={CUSTOMER_ADMIN_GOVERNANCE_NOTE}
        lifecycleNote={USER_LIFECYCLE_NOTE}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        statusFilter={statusFilter}
        statusOptions={STATUS_OPTIONS}
        onStatusFilterChange={(value) => {
          setStatusFilter(value)
          setPage(1)
        }}
        rows={tableData}
        isListLoading={isLoading}
        isListFetching={isFetching}
        selectedRows={selectedRowsSafe}
        onSelectedRowsChange={setSelectedRows}
        totalPages={pagination.totalPages}
        currentPage={pagination.page}
        totalCount={pagination.total}
        onFirstPage={handleFirstPage}
        onPreviousPage={handlePrevPage}
        onNextPage={handleNextPage}
        onLastPage={handleLastPage}
        onBulkCreateClick={handleOpenBulkCreate}
        onBulkUpdateSelectedClick={handleOpenBulkUpdateSelected}
        onBulkDisableSelectedClick={handleOpenBulkDisableSelected}
        onClearSelection={handleClearSelection}
        onCreateUserClick={() => setShowCreateWizard(true)}
        onEditUserClick={setEditingUser}
        onTransferOwnershipClick={(targetUser) => {
          setEditingUser(null)
          setOwnershipTransferTarget(targetUser)
        }}
        onDisableUserClick={(targetUser) => setConfirmAction({ type: 'disable', user: targetUser })}
        onEnableUserClick={(targetUser) => setConfirmAction({ type: 'enable', user: targetUser })}
        onDeleteUserClick={(targetUser) => setConfirmAction({ type: 'delete', user: targetUser })}
        onResendInvitationClick={handleResendInvitation}
        hasCanonicalAdmin={Boolean(canonicalAdminUser)}
        isRowActionMutationLoading={isRowActionMutationLoading}
      />

      <CreateUserWizard
        open={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        customerId={customerId}
      />

      <BulkUserOperations
        open={showBulkOperations}
        onClose={handleCloseBulkOperations}
        customerId={customerId}
        selectedUserIds={Array.from(selectedRowsSafe)}
        initialOperation={bulkDialogConfig.initialOperation}
        availableOperations={bulkDialogConfig.availableOperations}
      />

      <UserEditDrawer
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        customerId={customerId}
        onStartOwnershipTransfer={(targetUser) => {
          setEditingUser(null)
          setOwnershipTransferTarget(targetUser)
        }}
        hasCanonicalAdmin={Boolean(canonicalAdminUser)}
      />

      <OwnershipTransferDialog
        open={!!ownershipTransferTarget}
        onClose={() => setOwnershipTransferTarget(null)}
        customerId={customerId}
        currentCanonicalUser={canonicalAdminUser}
        targetUser={ownershipTransferTarget}
      />

      <Dialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        size="sm"
        closeOnBackdropClick={!isLifecycleMutationLoading}
        closeOnEscape={!isLifecycleMutationLoading}
      >
        <Dialog.Header>
          <h2 className="edit-users__confirm-title">
            {confirmAction?.type === 'disable'
              ? 'Disable User'
              : confirmAction?.type === 'enable'
                ? 'Reactivate User'
                : 'Delete User'}
          </h2>
        </Dialog.Header>
        <Dialog.Body>
          <p>
            {confirmAction?.type === 'disable'
              ? `Are you sure you want to disable ${confirmAction?.user?.name}? This will immediately revoke their access.`
              : confirmAction?.type === 'enable'
                ? `Are you sure you want to reactivate ${confirmAction?.user?.name}? They will regain access immediately. If trust returns as UNTRUSTED, Resend Invitation becomes available again.`
                : `Are you sure you want to permanently delete ${confirmAction?.user?.name}? This action cannot be undone.`}
          </p>
        </Dialog.Body>
        <Dialog.Footer className="edit-users__confirm-footer">
          <Button
            variant="outline"
            onClick={() => setConfirmAction(null)}
            disabled={isLifecycleMutationLoading}
          >
            Cancel
          </Button>
          <Button
            variant={confirmAction?.type === 'delete' ? 'danger' : 'primary'}
            onClick={handleConfirmAction}
            loading={isLifecycleMutationLoading}
            disabled={isLifecycleMutationLoading}
          >
            {confirmAction?.type === 'disable'
              ? 'Disable'
              : confirmAction?.type === 'enable'
                ? 'Reactivate'
                : 'Delete'}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default EditUsers
