/**
 * Edit Users Page
 *
 * Central user management page at `/app/administration/edit-users`.
 * Displays a data table of users for the current customer with
 * search, status filter, pagination, and row-level actions.
 *
 * Requires CUSTOMER_ADMIN role.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Table } from '../../components/Table'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Button } from '../../components/Button'
import { Status } from '../../components/Status'
import { Dialog } from '../../components/Dialog'
import { Spinner } from '../../components/Spinner'
import { UserTrustStatus } from '../../components/UserTrustStatus'
import { useToaster } from '../../components/Toaster'
import { useUsers } from '../../hooks/useUsers.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { normalizeError } from '../../utils/errors.js'
import CreateUserWizard from './CreateUserWizard'
import UserEditDrawer from './UserEditDrawer'
import BulkUserOperations from './BulkUserOperations'
import './EditUsers.css'

/** Debounce delay for search input (ms) */
const SEARCH_DEBOUNCE = 300

/** Status filter options */
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

/**
 * EditUsers Page Component
 */
function EditUsers() {
  const { addToast } = useToaster()
  const { isSuperAdmin } = useAuthorization()

  /* ---- Resolve customer / tenant context from shared store ---- */
  const { customerId, tenantId, tenantName } = useTenantContext()

  /* ---- User list hook ---- */
  const {
    users,
    pagination,
    isLoading,
    isFetching,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    disableUser,
    deleteUser,
    resendInvitation,
  } = useUsers(customerId, { tenantId })

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
  const [confirmAction, setConfirmAction] = useState(null)
  const [selectedRows, setSelectedRows] = useState(new Set())

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
        addToast({
          title: 'Failed to disable user',
          description: appError.message,
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
        addToast({
          title: 'Failed to delete user',
          description: appError.message,
          variant: 'error',
        })
      }
      setConfirmAction(null)
    },
    [deleteUser, addToast],
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
          description: appError.message,
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
    } else if (confirmAction.type === 'delete') {
      handleDelete(confirmAction.user)
    }
  }, [confirmAction, handleDisable, handleDelete])

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
          <UserTrustStatus
            trustStatus={row.identityPlus?.trustStatus ?? 'UNTRUSTED'}
            invitedAt={row.identityPlus?.invitedAt}
            trustedAt={row.identityPlus?.trustedAt}
            size="sm"
          />
        ),
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

  const selectedRowsSafe = useMemo(
    () => new Set([...selectedRows].filter((id) => visibleUserIds.has(id))),
    [selectedRows, visibleUserIds],
  )

  /* ---- Row actions ---- */
  const actions = useMemo(
    () => [
      { label: 'Edit', variant: 'ghost' },
      { label: 'Disable', variant: 'ghost' },
      { label: 'Delete', variant: 'ghost' },
      { label: 'Resend Invitation', variant: 'ghost' },
    ],
    [],
  )

  const handleRowAction = useCallback(
    (label, row) => {
      switch (label) {
        case 'Edit':
          setEditingUser(row)
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
          if (row.identityPlus?.trustStatus !== 'UNTRUSTED') {
            addToast({
              title: 'Invitation not applicable',
              description: 'Invitations can only be resent for untrusted users.',
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

  /* ---- No customer ID guard ---- */
  if (!customerId && !isSuperAdmin) {
    return (
      <section className="edit-users container" aria-label="Edit Users">
        <p className="edit-users__empty">
          No customer context available. Please contact your administrator.
        </p>
      </section>
    )
  }

  if (!customerId && isSuperAdmin) {
    return (
      <section className="edit-users container" aria-label="Edit Users">
        <h1 className="edit-users__title">Edit Users</h1>
        <p className="edit-users__empty">
          Please select a customer from the header dropdown to manage users.
        </p>
      </section>
    )
  }

  return (
    <section className="edit-users container" aria-label="Edit Users">
      {/* Page header */}
      <div className="edit-users__header">
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
      </div>

      {/* Tenant scope indicator */}
      {tenantId && tenantName && (
        <p className="edit-users__scope-indicator" role="status">
          Showing users for tenant: <strong>{tenantName}</strong>
        </p>
      )}

      {/* Toolbar: search + filter */}
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

      {/* Data table */}
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

      {/* Pagination */}
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

      {/* Fetching indicator */}
      {isFetching && !isLoading && (
        <div className="edit-users__fetching" role="status" aria-label="Updating">
          <Spinner size="sm" />
        </div>
      )}

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
              : 'Delete User'}
          </h2>
        </Dialog.Header>
        <Dialog.Body>
          <p>
            {confirmAction?.type === 'disable'
              ? `Are you sure you want to disable ${confirmAction?.user?.name}? This will immediately revoke their access.`
              : `Are you sure you want to permanently delete ${confirmAction?.user?.name}? This action cannot be undone.`}
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            variant="outline"
            onClick={() => setConfirmAction(null)}
          >
            Cancel
          </Button>
          <Button
            variant={confirmAction?.type === 'delete' ? 'danger' : 'primary'}
            onClick={handleConfirmAction}
          >
            {confirmAction?.type === 'disable' ? 'Disable' : 'Delete'}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default EditUsers
