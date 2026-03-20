/**
 * Tenant Linked Users Workspace
 *
 * Dedicated workspace for viewing and managing users linked to one tenant.
 * Linkage is managed through user-side `tenantVisibility`.
 */

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
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
import { UserSearchSelect } from '../../components/UserSearchSelect'
import { useToaster } from '../../components/Toaster'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useUsers } from '../../hooks/useUsers.js'
import { useListTenantsQuery, useLazyListTenantsQuery } from '../../store/api/tenantApi.js'
import { useLazyListUsersQuery } from '../../store/api/userApi.js'
import { normalizeError } from '../../utils/errors.js'
import { getTenantId, getTenantStatus } from './tenantUtils.js'
import './MaintainTenants.css'

const USER_FETCH_PAGE_SIZE = 100
const LINKED_USERS_PAGE_SIZE = 20

const LINKED_USERS_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
]

const normalizeIdList = (ids) =>
  [...new Set((ids ?? []).map((id) => String(id ?? '').trim()).filter(Boolean))]

const getUserId = (user) => String(user?._id ?? user?.id ?? '').trim()

const getUserRoles = (user) =>
  [...new Set(
    (Array.isArray(user?.memberships) ? user.memberships : [])
      .flatMap((membership) => membership?.roles ?? [])
      .map((role) => String(role ?? '').trim())
      .filter(Boolean),
  )]

const getUserTenantVisibility = (user) => {
  const explicitVisibility = normalizeIdList(user?.tenantVisibility)
  const tenantMembershipVisibility = normalizeIdList(
    (Array.isArray(user?.tenantMemberships) ? user.tenantMemberships : [])
      .map((tenantMembership) => tenantMembership?.tenantId),
  )

  return [...new Set([...explicitVisibility, ...tenantMembershipVisibility])]
}

const isUserLinkedToTenant = (user, tenantId) => {
  if (!tenantId) return false
  return getUserTenantVisibility(user).includes(String(tenantId))
}

const getUserStatusLabel = (user) => (user?.isActive ? 'Active' : 'Disabled')
const getUserStatusVariant = (user) => (user?.isActive ? 'success' : 'error')

function LinkedUsersBoundaryState({ message }) {
  return (
    <section className="maintain-tenants container" aria-label="Tenant linked users">
      <header className="maintain-tenants__header">
        <h1 className="maintain-tenants__title">Linked Users</h1>
      </header>
      <Fieldset className="maintain-tenants__fieldset">
        <Fieldset.Legend className="sr-only">Linked users state</Fieldset.Legend>
        <Card variant="elevated" className="maintain-tenants__card">
          <Card.Body className="maintain-tenants__card-body maintain-tenants__card-body--state">
            <p className="maintain-tenants__state-message">{message}</p>
          </Card.Body>
        </Card>
      </Fieldset>
    </section>
  )
}

function LinkedUsersRowActions({ row, onRemoveClick, disabled }) {
  const rowName = row?.name || row?.email || row?.id || 'user'

  return (
    <div className="tenant-linked-users__row-actions">
      <Select
        size="sm"
        value=""
        placeholder={disabled ? 'No actions' : 'Actions'}
        options={disabled ? [] : [{ value: 'Remove', label: 'Remove' }]}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value === 'Remove') onRemoveClick(row)
        }}
        aria-label={`Actions for ${rowName}`}
      />
    </div>
  )
}

function TenantLinkedUsersWorkspace() {
  const { tenantId: rawTenantId } = useParams()
  const tenantId = String(rawTenantId ?? '').trim()
  const location = useLocation()
  const navigate = useNavigate()
  const { addToast } = useToaster()
  const { customerId } = useTenantContext()
  const {
    isSuperAdmin,
    hasCustomerRole,
    hasTenantRole,
  } = useAuthorization()
  const { updateUser, updateUserResult } = useUsers(customerId, { skipListQuery: true })

  const isLoadingMutation = Boolean(updateUserResult?.isLoading)
  const isCustomerAdmin = Boolean(customerId && hasCustomerRole(customerId, 'CUSTOMER_ADMIN'))
  const isTenantAdminForTenant = Boolean(
    customerId
      && tenantId
      && hasTenantRole(customerId, tenantId, 'TENANT_ADMIN'),
  )
  const hasWorkspaceAccess = isSuperAdmin || isCustomerAdmin || isTenantAdminForTenant

  const routeTenant = location.state?.tenant
  const routeTenantId = getTenantId(routeTenant)

  const {
    data: tenantListResponse,
    error: tenantListError,
  } = useListTenantsQuery(
    { customerId, page: 1, pageSize: 200 },
    { skip: !customerId || !hasWorkspaceAccess },
  )

  const [triggerListTenants] = useLazyListTenantsQuery()

  const tenantFromList = useMemo(() => {
    const rows = tenantListResponse?.data ?? []
    return rows.find((tenantRow) => getTenantId(tenantRow) === tenantId) ?? null
  }, [tenantId, tenantListResponse])

  const [resolvedTenant, setResolvedTenant] = useState(null)

  useEffect(() => {
    if (!customerId || !tenantId || !hasWorkspaceAccess) return
    if (routeTenant && routeTenantId === tenantId) {
      setResolvedTenant(routeTenant)
      return
    }
    if (tenantFromList) {
      setResolvedTenant(tenantFromList)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const result = await triggerListTenants({
          customerId,
          q: tenantId,
          page: 1,
          pageSize: 50,
        })
        if (cancelled || result?.error) return
        const matchedTenant = (result?.data?.data ?? []).find(
          (tenantRow) => getTenantId(tenantRow) === tenantId,
        )
        if (matchedTenant) {
          setResolvedTenant(matchedTenant)
        }
      } catch {
        // best-effort tenant lookup only
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    customerId,
    hasWorkspaceAccess,
    routeTenant,
    routeTenantId,
    tenantFromList,
    tenantId,
    triggerListTenants,
  ])

  const [triggerListUsers] = useLazyListUsersQuery()
  const [allCustomerUsers, setAllCustomerUsers] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [usersAppError, setUsersAppError] = useState(null)
  const [reloadIndex, setReloadIndex] = useState(0)

  useEffect(() => {
    if (!customerId || !hasWorkspaceAccess) return

    let cancelled = false
    ;(async () => {
      setIsLoadingUsers(true)
      setUsersAppError(null)

      try {
        const collectedUsers = []
        let page = 1
        let totalPages = 1

        while (page <= totalPages) {
          const result = await triggerListUsers({
            customerId,
            page,
            pageSize: USER_FETCH_PAGE_SIZE,
          })

          if (result?.error) {
            throw result.error
          }

          const payload = result?.data?.data ?? {}
          const pageRows = Array.isArray(payload.users) ? payload.users : []
          collectedUsers.push(...pageRows)

          const parsedTotalPages = Number(payload.totalPages)
          totalPages =
            Number.isInteger(parsedTotalPages) && parsedTotalPages > 0
              ? parsedTotalPages
              : 1
          page += 1
        }

        if (cancelled) return
        setAllCustomerUsers(collectedUsers)
      } catch (error) {
        if (cancelled) return
        setUsersAppError(normalizeError(error))
      } finally {
        if (!cancelled) setIsLoadingUsers(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [customerId, hasWorkspaceAccess, reloadIndex, triggerListUsers])

  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState(new Set())

  useEffect(() => {
    setCurrentPage(1)
  }, [searchInput, statusFilter])

  const [pendingLinkIds, setPendingLinkIds] = useState([])
  const [pendingLinkUsers, setPendingLinkUsers] = useState({})
  const [confirmRemoveUserIds, setConfirmRemoveUserIds] = useState([])

  const userLookup = useMemo(
    () =>
      allCustomerUsers.reduce((lookup, user) => {
        const userId = getUserId(user)
        if (!userId) return lookup
        lookup[userId] = user
        return lookup
      }, {}),
    [allCustomerUsers],
  )

  const linkedUsers = useMemo(
    () =>
      allCustomerUsers.filter((user) => isUserLinkedToTenant(user, tenantId)),
    [allCustomerUsers, tenantId],
  )

  const filteredLinkedUsers = useMemo(() => {
    const normalizedQuery = String(searchInput ?? '').trim().toLowerCase()
    const normalizedStatusFilter = String(statusFilter ?? '').trim().toUpperCase()

    return linkedUsers
      .filter((user) => {
        if (normalizedStatusFilter === 'ACTIVE' && !user?.isActive) return false
        if (normalizedStatusFilter === 'DISABLED' && user?.isActive) return false
        return true
      })
      .filter((user) => {
        if (!normalizedQuery) return true

        const haystack = [
          user?.name,
          user?.email,
          getUserId(user),
          ...getUserRoles(user),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(normalizedQuery)
      })
  }, [linkedUsers, searchInput, statusFilter])

  const totalLinkedUsers = filteredLinkedUsers.length
  const totalPages = Math.max(1, Math.ceil(totalLinkedUsers / LINKED_USERS_PAGE_SIZE))
  const effectiveCurrentPage = Math.min(currentPage, totalPages)
  const pagedLinkedUsers = useMemo(() => {
    const start = (effectiveCurrentPage - 1) * LINKED_USERS_PAGE_SIZE
    return filteredLinkedUsers.slice(start, start + LINKED_USERS_PAGE_SIZE)
  }, [effectiveCurrentPage, filteredLinkedUsers])

  const tableRows = useMemo(
    () =>
      pagedLinkedUsers.map((user) => ({
        ...user,
        id: getUserId(user),
      })),
    [pagedLinkedUsers],
  )

  const visibleRowIds = useMemo(
    () => new Set(tableRows.map((row) => row.id).filter(Boolean)),
    [tableRows],
  )

  const selectedRowsSafe = useMemo(
    () => new Set([...selectedRows].filter((rowId) => visibleRowIds.has(rowId))),
    [selectedRows, visibleRowIds],
  )

  const selectedPendingLinkUsers = useMemo(
    () =>
      pendingLinkIds.reduce((lookup, userId) => {
        const user = userLookup[userId]
        if (user) {
          lookup[userId] = {
            name: String(user?.name ?? '').trim() || String(user?.email ?? '').trim() || userId,
            email: String(user?.email ?? '').trim(),
            roles: getUserRoles(user),
            isActive: Boolean(user?.isActive),
          }
          return lookup
        }

        lookup[userId] = pendingLinkUsers[userId] ?? {
          name: userId,
          email: '',
          roles: [],
          isActive: true,
        }
        return lookup
      }, {}),
    [pendingLinkIds, pendingLinkUsers, userLookup],
  )

  const isTenantReadOnly = String(getTenantStatus(resolvedTenant)).toUpperCase() === 'ARCHIVED'

  const workspaceAppError = useMemo(
    () =>
      usersAppError
      || (tenantListError ? normalizeError(tenantListError) : null),
    [tenantListError, usersAppError],
  )

  const handlePendingLinkChange = useCallback((nextIds, nextUsers = {}) => {
    setPendingLinkIds(nextIds)
    setPendingLinkUsers((previous) => ({ ...previous, ...nextUsers }))
  }, [])

  const applyTenantVisibilityMutation = useCallback(
    async (targetUserIds, operationType) => {
      let successCount = 0
      let skippedCount = 0
      let failedCount = 0
      let firstErrorMessage = ''

      for (const userId of targetUserIds) {
        const user = userLookup[userId]
        if (!user) {
          failedCount += 1
          if (!firstErrorMessage) firstErrorMessage = `User ${userId} is no longer available.`
          continue
        }

        const currentTenantVisibility = getUserTenantVisibility(user)
        const isCurrentlyLinked = currentTenantVisibility.includes(tenantId)

        if (operationType === 'link' && isCurrentlyLinked) {
          skippedCount += 1
          continue
        }

        if (operationType === 'unlink' && !isCurrentlyLinked) {
          skippedCount += 1
          continue
        }

        const nextTenantVisibility =
          operationType === 'link'
            ? normalizeIdList([...currentTenantVisibility, tenantId])
            : normalizeIdList(currentTenantVisibility.filter((id) => id !== tenantId))

        try {
          await updateUser(userId, { tenantVisibility: nextTenantVisibility })
          successCount += 1
        } catch (error) {
          failedCount += 1
          if (!firstErrorMessage) {
            firstErrorMessage = normalizeError(error).message
          }
        }
      }

      return {
        successCount,
        skippedCount,
        failedCount,
        firstErrorMessage,
      }
    },
    [tenantId, updateUser, userLookup],
  )

  const handleLinkSelectedUsers = useCallback(async () => {
    if (pendingLinkIds.length === 0) return
    if (isTenantReadOnly) {
      addToast({
        title: 'Tenant is read-only',
        description: 'Archived tenants cannot be changed in this workspace.',
        variant: 'warning',
      })
      return
    }

    const summary = await applyTenantVisibilityMutation(pendingLinkIds, 'link')

    if (summary.failedCount === 0) {
      addToast({
        title: 'Users linked',
        description:
          summary.skippedCount > 0
            ? `${summary.successCount} users linked. ${summary.skippedCount} already linked.`
            : `${summary.successCount} users linked to this tenant.`,
        variant: 'success',
      })
    } else {
      addToast({
        title: 'Some users were not linked',
        description: summary.firstErrorMessage
          || `${summary.successCount} linked, ${summary.failedCount} failed.`,
        variant: 'warning',
      })
    }

    setPendingLinkIds([])
    setPendingLinkUsers({})
    setReloadIndex((previous) => previous + 1)
  }, [addToast, applyTenantVisibilityMutation, isTenantReadOnly, pendingLinkIds])

  const handleConfirmRemove = useCallback(async () => {
    if (confirmRemoveUserIds.length === 0) return
    if (isTenantReadOnly) {
      addToast({
        title: 'Tenant is read-only',
        description: 'Archived tenants cannot be changed in this workspace.',
        variant: 'warning',
      })
      setConfirmRemoveUserIds([])
      return
    }

    const summary = await applyTenantVisibilityMutation(confirmRemoveUserIds, 'unlink')

    if (summary.failedCount === 0) {
      addToast({
        title: 'Users removed',
        description:
          summary.skippedCount > 0
            ? `${summary.successCount} users removed. ${summary.skippedCount} were not linked.`
            : `${summary.successCount} users removed from this tenant.`,
        variant: 'success',
      })
    } else {
      addToast({
        title: 'Some users were not removed',
        description: summary.firstErrorMessage
          || `${summary.successCount} removed, ${summary.failedCount} failed.`,
        variant: 'warning',
      })
    }

    setSelectedRows(new Set())
    setConfirmRemoveUserIds([])
    setReloadIndex((previous) => previous + 1)
  }, [addToast, applyTenantVisibilityMutation, confirmRemoveUserIds, isTenantReadOnly])

  const columns = useMemo(
    () => [
      {
        key: 'userIdentity',
        label: 'User',
        width: '280px',
        render: (_value, row) => (
          <div className="tenant-linked-users__user-identity">
            <span className="tenant-linked-users__user-name">{row?.name || '--'}</span>
            <span className="tenant-linked-users__user-email">{row?.email || '--'}</span>
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (_value, row) => (
          <Status
            variant={getUserStatusVariant(row)}
            size="sm"
            showIcon
          >
            {getUserStatusLabel(row)}
          </Status>
        ),
      },
      {
        key: 'roles',
        label: 'Roles',
        render: (_value, row) => {
          const roles = getUserRoles(row)
          return roles.length > 0 ? roles.join(', ') : '--'
        },
      },
      {
        key: 'rowActions',
        label: 'Actions',
        align: 'center',
        width: '168px',
        render: (_value, row) => (
          <LinkedUsersRowActions
            row={row}
            disabled={isLoadingMutation || isTenantReadOnly}
            onRemoveClick={(targetRow) => setConfirmRemoveUserIds([targetRow.id])}
          />
        ),
      },
    ],
    [isLoadingMutation, isTenantReadOnly],
  )

  if (!tenantId) {
    return (
      <LinkedUsersBoundaryState message="No tenant context is available for linked-user management." />
    )
  }

  if (!customerId) {
    return (
      <LinkedUsersBoundaryState message="No customer context is available. Please contact your administrator." />
    )
  }

  if (!hasWorkspaceAccess) {
    return (
      <LinkedUsersBoundaryState message="You do not have permission to manage linked users for this tenant." />
    )
  }

  const tenantName = resolvedTenant?.name || routeTenant?.name || tenantId
  const linkedUsersActionDisabled = isLoadingMutation || isTenantReadOnly

  return (
    <section className="maintain-tenants tenant-linked-users container" aria-label="Tenant linked users">
      <header className="maintain-tenants__header tenant-linked-users__header">
        <h1 className="maintain-tenants__title">Linked Users</h1>
        <p className="maintain-tenants__subtitle">
          Manage users linked to <strong>{tenantName}</strong>. Tenant linkage is managed through user visibility assignments.
        </p>
      </header>

      <Fieldset className="maintain-tenants__fieldset">
        <Fieldset.Legend className="sr-only">Tenant linked users workspace</Fieldset.Legend>
        <Card variant="elevated" className="maintain-tenants__card">
          <Card.Body className="maintain-tenants__card-body maintain-tenants__card-body--compact">
            <div className="tenant-linked-users__actions">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/administration/maintain-tenants')}
                disabled={isLoadingMutation}
              >
                Back to Maintain Tenants
              </Button>
            </div>

            {isTenantReadOnly ? (
              <p className="maintain-tenants__table-note" role="status">
                This tenant is archived and read-only. You can review linked users, but add/remove actions are unavailable.
              </p>
            ) : null}

            <Fieldset className="tenant-linked-users__add-fieldset">
              <Fieldset.Legend className="tenant-linked-users__legend">Add users to this tenant</Fieldset.Legend>
              <div className="tenant-linked-users__add-panel">
                <UserSearchSelect
                  customerId={customerId}
                  selectedIds={pendingLinkIds}
                  selectedUsers={selectedPendingLinkUsers}
                  onChange={handlePendingLinkChange}
                  label="Search users by name or email"
                  minRequired={0}
                  allowTemporaryEmptySelection
                  disabled={linkedUsersActionDisabled}
                />
                <div className="tenant-linked-users__add-actions">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleLinkSelectedUsers}
                    disabled={linkedUsersActionDisabled || pendingLinkIds.length === 0}
                    loading={isLoadingMutation}
                  >
                    Link Selected Users
                  </Button>
                </div>
              </div>
            </Fieldset>

            <div className="tenant-linked-users__toolbar">
              <Input
                id="tenant-linked-user-search"
                type="search"
                label="Search linked users"
                size="sm"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                fullWidth
              />
              <Select
                id="tenant-linked-user-status"
                label="Status"
                size="sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                options={LINKED_USERS_STATUS_OPTIONS}
              />
            </div>

            {workspaceAppError ? (
              <ErrorSupportPanel
                error={workspaceAppError}
                context="tenant-linked-users-workspace"
              />
            ) : null}

            <div className="tenant-linked-users__bulk-actions">
              <p className="tenant-linked-users__selection-summary" role="status">
                {selectedRowsSafe.size > 0
                  ? `${selectedRowsSafe.size} selected`
                  : `${totalLinkedUsers} linked users`}
              </p>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setConfirmRemoveUserIds(Array.from(selectedRowsSafe))}
                disabled={linkedUsersActionDisabled || selectedRowsSafe.size === 0}
              >
                Remove Selected
              </Button>
            </div>

            <HorizontalScroll className="maintain-tenants__table-wrap" ariaLabel="Linked users table" gap="sm">
              <Table
                className="tenant-linked-users__table"
                columns={columns}
                data={tableRows}
                variant="striped"
                hoverable
                selectable
                selectedRows={selectedRowsSafe}
                onSelectChange={setSelectedRows}
                loading={isLoadingUsers}
                loadingRows={5}
                emptyMessage="No linked users found."
                ariaLabel="Linked users"
              />
            </HorizontalScroll>

            {totalPages > 1 ? (
              <div className="maintain-tenants__pagination" role="navigation" aria-label="Linked users pagination">
                <div className="maintain-tenants__pagination-controls">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={effectiveCurrentPage <= 1 || isLoadingUsers}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={effectiveCurrentPage <= 1 || isLoadingUsers}
                  >
                    Previous
                  </Button>
                </div>
                <p className="maintain-tenants__pagination-info">
                  Page {effectiveCurrentPage} of {totalPages}
                  {totalLinkedUsers > 0 ? ` (${totalLinkedUsers} users)` : ''}
                </p>
                <div className="maintain-tenants__pagination-controls">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={effectiveCurrentPage >= totalPages || isLoadingUsers}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={effectiveCurrentPage >= totalPages || isLoadingUsers}
                  >
                    Last
                  </Button>
                </div>
              </div>
            ) : null}
          </Card.Body>
        </Card>
      </Fieldset>

      <Dialog
        open={confirmRemoveUserIds.length > 0}
        onClose={() => setConfirmRemoveUserIds([])}
        size="sm"
        closeOnBackdropClick={!isLoadingMutation}
        closeOnEscape={!isLoadingMutation}
      >
        <Dialog.Header>
          <h2 className="maintain-tenants__dialog-title">Remove Linked Users</h2>
        </Dialog.Header>
        <Dialog.Body className="maintain-tenants__confirm-body">
          <p className="maintain-tenants__confirm-message">
            {confirmRemoveUserIds.length === 1
              ? 'Remove this user from tenant visibility?'
              : `Remove ${confirmRemoveUserIds.length} selected users from tenant visibility?`}
          </p>
        </Dialog.Body>
        <Dialog.Footer className="maintain-tenants__dialog-footer maintain-tenants__confirm-footer">
          <Button
            variant="outline"
            onClick={() => setConfirmRemoveUserIds([])}
            disabled={isLoadingMutation}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmRemove}
            loading={isLoadingMutation}
            disabled={isLoadingMutation}
          >
            Remove
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default TenantLinkedUsersWorkspace
