/**
 * Edit Users Page
 *
 * Central user management page at `/app/administration/edit-users`.
 * Displays a data table of users for the current customer with
 * search, status filter, pagination, and row-level actions.
 *
 * Requires CUSTOMER_ADMIN role.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Table } from '../../components/Table'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Button } from '../../components/Button'
import { Status } from '../../components/Status'
import { Dialog } from '../../components/Dialog'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Spinner } from '../../components/Spinner'
import { Tooltip } from '../../components/Tooltip'
import { UserTrustStatus } from '../../components/UserTrustStatus'
import { useToaster } from '../../components/Toaster'
import { MdInfoOutline } from 'react-icons/md'
import { useUsers } from '../../hooks/useUsers.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import {
  normalizeError,
  isCanonicalAdminConflictError,
  getCanonicalAdminConflictMessage,
  getUserLifecycleMessage,
} from '../../utils/errors.js'
import CreateUserWizard from './CreateUserWizard'
import UserEditDrawer from './UserEditDrawer'
import BulkUserOperations from './BulkUserOperations'
import OwnershipTransferDialog from './OwnershipTransferDialog'
import './EditUsers.css'

/** Debounce delay for search input (ms) */
const SEARCH_DEBOUNCE = 300

/** Status filter options */
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

const CANONICAL_ADMIN_TOOLTIP_TEXT =
  'Canonical Admin identifies the governed owner for this customer. Ownership changes use the dedicated transfer workflow.'

const CUSTOMER_ADMIN_GOVERNANCE_NOTE =
  'Canonical Admin marks the governed owner for this customer. Create or update the replacement user first, then use Transfer Ownership from that user\'s row. Generic role edits do not transfer ownership.'

const USER_LIFECYCLE_NOTE =
  'Active users with UNTRUSTED trust can receive Resend Invitation. Disabled users must be reactivated before invitation recovery is available again.'

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

const getUserInvitedAt = (user) => user?.identityPlus?.invitedAt ?? user?.invitedAt ?? null

const getUserTrustedAt = (user) => user?.identityPlus?.trustedAt ?? user?.trustedAt ?? null

const getUserLifecycleCopy = (user) => {
  const trustStatus = getUserTrustStatus(user)
  const invitedAt = getUserInvitedAt(user)

  if (!user?.isActive) {
    return {
      title: 'Disabled',
      detail: 'Reactivate first to make invitation recovery available again.',
      variant: 'muted',
    }
  }

  if (trustStatus === 'TRUSTED') {
    return {
      title: 'Access ready',
      detail: 'User has completed sign-in and currently has active access.',
      variant: 'success',
    }
  }

  if (trustStatus === 'UNTRUSTED' && invitedAt) {
    return {
      title: 'Invitation pending',
      detail: 'Invitation was sent. Resend is available if the user still needs it.',
      variant: 'warning',
    }
  }

  if (trustStatus === 'UNTRUSTED') {
    return {
      title: 'Invitation required',
      detail: 'User is active but not trusted yet. Resend Invitation is available now.',
      variant: 'warning',
    }
  }

  return {
    title: 'Needs attention',
    detail: 'This lifecycle and trust combination is outside the expected contract.',
    variant: 'error',
  }
}

function UserLifecycleState({ user }) {
  const lifecycleCopy = getUserLifecycleCopy(user)

  return (
    <div className="edit-users__trust-cell">
      <UserTrustStatus
        trustStatus={getUserTrustStatus(user)}
        invitedAt={getUserInvitedAt(user)}
        trustedAt={getUserTrustedAt(user)}
        size="sm"
        showDates
      />
      <span className={`edit-users__trust-title edit-users__trust-title--${lifecycleCopy.variant}`}>
        {lifecycleCopy.title}
      </span>
      <span className="edit-users__trust-detail">
        {lifecycleCopy.detail}
      </span>
    </div>
  )
}

function CanonicalAdminHeaderLabel() {
  return (
    <span className="edit-users__canonical-header">
      <span>Canonical Admin</span>
      <Tooltip
        content={CANONICAL_ADMIN_TOOLTIP_TEXT}
        position="bottom"
        align="end"
        openDelay={0}
        closeDelay={0}
        className="edit-users__canonical-tooltip"
      >
        <button
          type="button"
          className="edit-users__canonical-help-trigger"
          aria-label="Explain Canonical Admin"
        >
          <MdInfoOutline aria-hidden="true" focusable="false" />
          <span className="sr-only">Explain Canonical Admin</span>
        </button>
      </Tooltip>
    </span>
  )
}

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

/**
 * EditUsers Page Component
 */
function EditUsers() {
  const { addToast } = useToaster()
  const { isSuperAdmin, accessibleCustomerIds } = useAuthorization()

  /* ---- Resolve customer / tenant context from shared store ---- */
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

  /* ---- User list hook ---- */
  const {
    users,
    pagination,
    isLoading,
    isFetching,
    error: usersError,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
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

  /* ---- Debounced search ---- */
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, SEARCH_DEBOUNCE)
    return () => clearTimeout(timer)
  }, [searchInput, setSearch, setPage])

  /* ---- Dialog state ---- */
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [showBulkOperations, setShowBulkOperations] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [ownershipTransferTarget, setOwnershipTransferTarget] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [selectedRows, setSelectedRows] = useState(new Set())
  const previousContextKeyRef = useRef(`${customerId ?? ''}::${tenantId ?? ''}`)

  const listUsersAppError = useMemo(
    () => (usersError ? normalizeError(usersError) : null),
    [usersError],
  )

  const tenantContextAppError = useMemo(
    () => (tenantsError ? normalizeError(tenantsError) : null),
    [tenantsError],
  )

  useEffect(() => {
    const nextContextKey = `${customerId ?? ''}::${tenantId ?? ''}`
    if (previousContextKeyRef.current === nextContextKey) return

    previousContextKeyRef.current = nextContextKey
    setShowCreateWizard(false)
    setShowBulkOperations(false)
    setEditingUser(null)
    setOwnershipTransferTarget(null)
    setConfirmAction(null)
    setSelectedRows(new Set())
    setSearchInput('')
    setSearch('')
    setStatusFilter('')
    setPage(1)
  }, [customerId, tenantId, setPage, setSearch, setStatusFilter])

  /* ---- Action handlers ---- */

  const handleDisable = useCallback(
    async (user) => {
      try {
        await disableUser(user._id)
        addToast({
          title: 'User disabled',
          description: `${user.name} has been disabled.`,
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
    [disableUser, addToast],
  )

  const handleDelete = useCallback(
    async (user) => {
      try {
        await deleteUser(user._id)
        addToast({
          title: 'User deleted',
          description: `${user.name} has been permanently deleted.`,
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
    [deleteUser, addToast],
  )

  const handleEnable = useCallback(
    async (user) => {
      try {
        const result = await enableUser(user._id)
        const enabledUser = getMutationPayload(result)
        const enabledUserName = String(enabledUser?.name ?? user?.name ?? 'User').trim() || 'User'
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
    [enableUser, addToast],
  )

  const handleResendInvitation = useCallback(
    async (user) => {
      try {
        await resendInvitation(user._id)
        addToast({
          title: 'Invitation sent',
          description: `Invitation resent to ${user.email}.`,
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
    [resendInvitation, addToast],
  )

  const handleConfirmAction = useCallback(() => {
    if (!confirmAction) return
    if (confirmAction.type === 'disable') {
      handleDisable(confirmAction.user)
    } else if (confirmAction.type === 'enable') {
      handleEnable(confirmAction.user)
    } else if (confirmAction.type === 'delete') {
      handleDelete(confirmAction.user)
    }
  }, [confirmAction, handleDisable, handleDelete, handleEnable])

  /* ---- Table columns ---- */
  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
      },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
      },
      {
        key: 'roles',
        label: 'Roles',
        render: (value, row) => {
          const roles = row.memberships
            ?.flatMap((m) => m.roles)
            ?.filter(Boolean) ?? []
          return roles.length > 0
            ? roles.join(', ')
            : '—'
        },
      },
      {
        key: 'status',
        label: 'Status',
        render: (_value, row) => (
          <Status
            variant={row.isActive ? 'success' : 'error'}
            size="sm"
            showIcon
          >
            {row.isActive ? 'Active' : 'Disabled'}
          </Status>
        ),
      },
      {
        key: 'trustStatus',
        label: 'Trust',
        render: (_value, row) => (
          <UserLifecycleState user={row} />
        ),
      },
      {
        key: 'isCanonicalAdmin',
        label: <CanonicalAdminHeaderLabel />,
        mobileLabel: 'Canonical Admin',
        width: '220px',
        render: (_value, row) =>
          row?.isCanonicalAdmin
            ? (
              <Status size="sm" variant="info" className="edit-users__canonical-status">
                Canonical
              </Status>
            )
            : <span className="edit-users__canonical-empty">--</span>,
      },
    ],
    [],
  )

  const tableData = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        id: user._id,
      })),
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

  /* ---- Row actions ---- */
  const actions = useMemo(
    () => [
      {
        label: 'Edit',
        variant: 'ghost',
        disabled: isRowActionMutationLoading,
      },
      {
        label: 'Transfer Ownership',
        variant: 'ghost',
        disabled: (row) =>
          isRowActionMutationLoading ||
          !canonicalAdminUser ||
          !row?.isActive ||
          Boolean(row?.isCanonicalAdmin),
      },
      {
        label: 'Disable',
        variant: 'ghost',
        disabled: (row) => isRowActionMutationLoading || !row?.isActive,
      },
      {
        label: 'Reactivate',
        variant: 'ghost',
        disabled: (row) => isRowActionMutationLoading || Boolean(row?.isActive),
      },
      {
        label: 'Delete',
        variant: 'ghost',
        disabled: (row) => isRowActionMutationLoading || Boolean(row?.isActive),
      },
      {
        label: 'Resend Invitation',
        variant: 'ghost',
        disabled: (row) =>
          isRowActionMutationLoading
          || !row?.isActive
          || getUserTrustStatus(row) !== 'UNTRUSTED',
      },
    ],
    [canonicalAdminUser, isRowActionMutationLoading],
  )

  const handleRowAction = useCallback(
    (label, row) => {
      switch (label) {
        case 'Edit':
          setEditingUser(row)
          break
        case 'Transfer Ownership':
          setEditingUser(null)
          setOwnershipTransferTarget(row)
          break
        case 'Disable':
          if (!row.isActive) {
            addToast({
              title: 'Already disabled',
              description: `${row.name} is already disabled.`,
              variant: 'info',
            })
            return
          }
          setConfirmAction({ type: 'disable', user: row })
          break
        case 'Reactivate':
          if (row.isActive) {
            addToast({
              title: 'Already active',
              description: `${row.name} is already active.`,
              variant: 'info',
            })
            return
          }
          setConfirmAction({ type: 'enable', user: row })
          break
        case 'Delete':
          if (row.isActive) {
            addToast({
              title: 'Cannot delete active user',
              description: 'Disable the user before deleting.',
              variant: 'warning',
            })
            return
          }
          setConfirmAction({ type: 'delete', user: row })
          break
        case 'Resend Invitation':
          if (!row.isActive) {
            addToast({
              title: 'Invitation not applicable',
              description: 'Invitations can only be resent for active users. Reactivate the user first.',
              variant: 'info',
            })
            return
          }
          if (getUserTrustStatus(row) !== 'UNTRUSTED') {
            addToast({
              title: 'Invitation not applicable',
              description: 'Invitations can only be resent when trust is UNTRUSTED.',
              variant: 'info',
            })
            return
          }
          handleResendInvitation(row)
          break
        default:
          break
      }
    },
    [addToast, handleResendInvitation],
  )

  /* ---- Pagination handlers ---- */
  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1))
  }, [setPage])

  const handleNextPage = useCallback(() => {
    setPage((p) => Math.min(pagination.totalPages, p + 1))
  }, [setPage, pagination.totalPages])

  /* ---- Context guards ---- */
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
        message="Resolving your customer context…"
        isLoading
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
      {/* Page header */}
      <header className="edit-users__header">
        <h1 className="edit-users__title">Edit Users</h1>
        <div className="edit-users__header-actions">
          <Button
            variant="outline"
            onClick={() => setShowBulkOperations(true)}
            disabled={isFetching}
          >
            Bulk Operations
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowCreateWizard(true)}
            disabled={isFetching}
          >
            Create User
          </Button>
        </div>
      </header>

      <Fieldset className="edit-users__fieldset">
        <Fieldset.Legend className="sr-only">Customer users</Fieldset.Legend>
        <Card variant="elevated" className="edit-users__card">
          <Card.Body className="edit-users__card-body">
            {tenantId && (
              <p className="edit-users__scope-indicator" role="status">
                {isResolvingSelectedTenantContext
                  ? 'Checking selected tenant context…'
                  : (
                    <>
                      Selected tenant context:{' '}
                      <strong>{resolvedTenantName ?? tenantName ?? tenantId}</strong>. The
                      current user list remains scoped to the active customer.
                    </>
                  )}
              </p>
            )}

            {tenantContextAppError && (
              <ErrorSupportPanel
                error={tenantContextAppError}
                context="edit-users-tenant-context"
              />
            )}

            <div
              className="edit-users__governance-note"
              role="note"
              aria-label="Customer Admin governance guidance"
            >
              <p className="edit-users__governance-title">Customer Admin governance</p>
              <p className="edit-users__governance-text">{CUSTOMER_ADMIN_GOVERNANCE_NOTE}</p>
            </div>

            <div
              className="edit-users__lifecycle-note"
              role="note"
              aria-label="User lifecycle and invitation guidance"
            >
              <p className="edit-users__lifecycle-title">User lifecycle and invitations</p>
              <p className="edit-users__lifecycle-text">{USER_LIFECYCLE_NOTE}</p>
            </div>

            {listUsersAppError && (
              <ErrorSupportPanel
                error={listUsersAppError}
                context="edit-users-list"
              />
            )}

            <div className="edit-users__toolbar">
              <div className="edit-users__search">
                <Input
                  id="user-search"
                  type="search"
                  label="Search"
                  placeholder="Search by name or email…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  fullWidth
                />
              </div>
              <div className="edit-users__filter">
                <Select
                  id="user-status-filter"
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>

            <div className="edit-users__table">
              <Table
                columns={columns}
                data={tableData}
                variant="striped"
                hoverable
                selectable
                selectedRows={selectedRowsSafe}
                onSelectChange={setSelectedRows}
                loading={isLoading}
                loadingRows={5}
                actions={actions}
                onRowAction={handleRowAction}
                emptyMessage="No users found."
                ariaLabel="Users table"
              />
            </div>

            {pagination.totalPages > 1 && (
              <div className="edit-users__pagination">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={page <= 1 || isFetching}
                >
                  Previous
                </Button>
                <span className="edit-users__pagination-info">
                  Page {pagination.page} of {pagination.totalPages}
                  {pagination.total > 0 && ` (${pagination.total} users)`}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page >= pagination.totalPages || isFetching}
                >
                  Next
                </Button>
              </div>
            )}

            {isFetching && !isLoading && (
              <div className="edit-users__fetching" role="status" aria-label="Updating">
                <Spinner size="sm" />
              </div>
            )}
          </Card.Body>
        </Card>
      </Fieldset>

      {/* Create User Wizard */}
      <CreateUserWizard
        open={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        customerId={customerId}
      />

      <BulkUserOperations
        open={showBulkOperations}
        onClose={() => setShowBulkOperations(false)}
        customerId={customerId}
        selectedUserIds={Array.from(selectedRowsSafe)}
      />

      {/* User Edit Drawer */}
      <UserEditDrawer
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        customerId={customerId}
        onStartOwnershipTransfer={(user) => {
          setEditingUser(null)
          setOwnershipTransferTarget(user)
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

      {/* Confirm action dialog */}
      <Dialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        size="sm"
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
        <Dialog.Footer>
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
