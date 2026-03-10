import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { Tooltip } from '../../components/Tooltip'
import { UserTrustStatus } from '../../components/UserTrustStatus'
import { MdInfoOutline } from 'react-icons/md'
import {
  USER_ROLE_FILTER_OPTIONS,
  USER_STATUS_FILTER_OPTIONS,
  CANONICAL_ADMIN_USERS_HELP_TEXT,
} from './superAdminCustomers.constants.js'
import {
  getCustomerUserRoles,
  normalizeUserStatus,
  getUserTrustStatus,
} from './superAdminCustomers.utils.js'
import { CustomerRowActionsMenu, CanonicalAdminHeaderLabel } from './CustomerListView.jsx'
import './CustomerUsersWorkspace.css'

function CustomerUserRolesCell({ row, customerId }) {
  const roles = getCustomerUserRoles(row, customerId)
  const userName = row?.name || row?.email || 'user'
  const tooltipId = useId()
  const containerRef = useRef(null)
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)

  useEffect(() => {
    if (!isTooltipOpen) return undefined

    const handleDocumentPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsTooltipOpen(false)
      }
    }

    const handleDocumentKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsTooltipOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentPointerDown)
    document.addEventListener('touchstart', handleDocumentPointerDown)
    document.addEventListener('keydown', handleDocumentKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleDocumentPointerDown)
      document.removeEventListener('touchstart', handleDocumentPointerDown)
      document.removeEventListener('keydown', handleDocumentKeyDown)
    }
  }, [isTooltipOpen])

  if (roles.length === 0) {
    return '--'
  }

  if (roles.length === 1) {
    return roles[0]
  }

  return (
    <div className="super-admin-customers__roles-summary" ref={containerRef}>
      <span className="super-admin-customers__roles-preview">{roles[0]}</span>
      <Tooltip
        id={tooltipId}
        content={(
          <span className="super-admin-customers__roles-tooltip-list">
            {roles.map((role) => (
              <span key={role} className="super-admin-customers__roles-tooltip-item">
                {role}
              </span>
            ))}
          </span>
        )}
        position="top"
        align="start"
        open={isTooltipOpen}
        openDelay={0}
        closeDelay={0}
        className="super-admin-customers__roles-tooltip"
      >
        <button
          type="button"
          className="super-admin-customers__roles-trigger"
          aria-label={`See all roles for ${userName}`}
          aria-controls={tooltipId}
          aria-expanded={isTooltipOpen}
          onClick={() => setIsTooltipOpen(true)}
          onFocus={() => setIsTooltipOpen(true)}
          onBlur={(event) => {
            if (containerRef.current?.contains(event.relatedTarget)) return
            setIsTooltipOpen(false)
          }}
          onMouseEnter={() => setIsTooltipOpen(true)}
          onMouseLeave={() => setIsTooltipOpen(false)}
        >
          <MdInfoOutline aria-hidden="true" focusable="false" />
          <span>see all</span>
        </button>
      </Tooltip>
    </div>
  )
}

export function CustomerUsersWorkspace({
  customer,
  customerId,
  userSearch,
  onUserSearchChange,
  userRoleFilter,
  onUserRoleFilterChange,
  userStatusFilter,
  onUserStatusFilterChange,
  userPage,
  onUserPageChange,
  userRows,
  isListUsersLoading,
  isListUsersFetching,
  listUsersAppError,
  listUsersErrorMessage,
  userTotalPages,
  userCurrentPage,
  userTotalCount,
  hasCanonicalAdmin,
  adminMutationLoading,
  createUserLoading,
  userLifecycleActions,
  onUserLifecycleAction,
  onBackClick,
  onCreateUserClick,
  onOpenAdminDialog,
  usersWorkspaceAdminMode,
}) {
  const showUsersAssignAdminAction = usersWorkspaceAdminMode === 'assign' && userRows.length === 0
  const showUsersReplaceAdminAction = usersWorkspaceAdminMode === 'replace'

  const userColumns = useMemo(
    () => [
      {
        key: 'userIdentity',
        label: 'User',
        width: '260px',
        render: (_value, row) => (
          <div className="super-admin-customers__user-identity">
            <strong className="super-admin-customers__user-name">{row?.name || '--'}</strong>
            <span className="super-admin-customers__user-email">{row?.email || '--'}</span>
          </div>
        ),
      },
      {
        key: 'customerRoles',
        label: 'Roles',
        render: (_value, row) => <CustomerUserRolesCell row={row} customerId={customerId} />,
      },
      {
        key: 'status',
        label: 'Status',
        render: (_value, row) => {
          const status = normalizeUserStatus(row)
          return (
            <Status size="sm" showIcon variant={status === 'ACTIVE' ? 'success' : 'neutral'}>
              {status}
            </Status>
          )
        },
      },
      {
        key: 'trustStatus',
        label: 'Trust',
        render: (_value, row) => (
          <UserTrustStatus trustStatus={getUserTrustStatus(row)} size="sm" />
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
              <Status size="sm" variant="info" className="super-admin-customers__canonical-status">
                Canonical
              </Status>
            )
            : <span className="super-admin-customers__canonical-admin-empty">--</span>,
      },
    ],
    [customerId],
  )

  const userColumnsWithActions = useMemo(
    () => [
      ...userColumns,
      {
        key: 'rowActions',
        label: <span className="super-admin-customers__users-actions-header">Actions</span>,
        width: '168px',
        render: (_value, row) => (
          <CustomerRowActionsMenu
            row={row}
            actions={userLifecycleActions}
            onAction={onUserLifecycleAction}
            className="super-admin-customers__row-actions--leading"
          />
        ),
      },
    ],
    [onUserLifecycleAction, userColumns, userLifecycleActions],
  )

  return (
    <>
      <header className="super-admin-customers__header">
        <h2 className="super-admin-customers__title">Customer Users</h2>
        <p className="super-admin-customers__subtitle">
          View users, trust state, and customer-role assignments for{' '}
          <strong>{customer?.name ?? '--'}</strong>.
        </p>
      </header>

      <Fieldset className="super-admin-customers__fieldset">
        <Fieldset.Legend className="sr-only">Customer users</Fieldset.Legend>
        <Card variant="elevated" className="super-admin-customers__card">
          <Card.Body className="super-admin-customers__card-body super-admin-customers__card-body--compact">
            <div className="super-admin-customers__catalogue-actions super-admin-customers__users-actions">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBackClick}
              >
                Back to Customers
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onCreateUserClick}
                disabled={createUserLoading}
              >
                Create User
              </Button>
              {showUsersAssignAdminAction || showUsersReplaceAdminAction ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenAdminDialog(usersWorkspaceAdminMode, customer)}
                  disabled={adminMutationLoading}
                >
                  {usersWorkspaceAdminMode === 'assign'
                    ? 'Assign Customer Admin'
                    : 'Replace Customer Admin'}
                </Button>
              ) : null}
            </div>
            <div className="super-admin-customers__toolbar super-admin-customers__users-toolbar">
              <Input
                id="sa-customer-user-search"
                label="Search"
                size="sm"
                value={userSearch}
                onChange={(event) => {
                  onUserSearchChange(event.target.value)
                  onUserPageChange(1)
                }}
                fullWidth
              />
              <Select
                id="sa-customer-user-role-filter"
                label="Role"
                size="sm"
                value={userRoleFilter}
                options={USER_ROLE_FILTER_OPTIONS}
                onChange={(event) => {
                  onUserRoleFilterChange(event.target.value)
                  onUserPageChange(1)
                }}
              />
              <Select
                id="sa-customer-user-status-filter"
                label="Status"
                size="sm"
                value={userStatusFilter}
                options={USER_STATUS_FILTER_OPTIONS}
                onChange={(event) => {
                  onUserStatusFilterChange(event.target.value)
                  onUserPageChange(1)
                }}
              />
            </div>
            {listUsersAppError ? (
              <p className="super-admin-customers__error" role="alert">
                {listUsersErrorMessage}
              </p>
            ) : null}
            <p className="super-admin-customers__users-note">{CANONICAL_ADMIN_USERS_HELP_TEXT}</p>
            <HorizontalScroll className="super-admin-customers__table-wrap" ariaLabel="Customer users table" gap="sm">
              <Table
                className="super-admin-customers__table super-admin-customers__users-table"
                columns={userColumnsWithActions}
                data={userRows}
                loading={isListUsersLoading}
                variant="striped"
                hoverable
                emptyMessage="No users found for this customer."
                ariaLabel={`Users for ${customer?.name ?? 'customer'}`}
              />
            </HorizontalScroll>
            {isListUsersFetching && !isListUsersLoading ? (
              <p className="super-admin-customers__muted">Refreshing users...</p>
            ) : null}
            {userTotalPages > 1 ? (
              <div className="super-admin-customers__pagination" role="navigation" aria-label="Customer users pagination">
                <div className="super-admin-customers__pagination-controls">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={userCurrentPage <= 1 || isListUsersFetching}
                    onClick={() => onUserPageChange(1)}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={userCurrentPage <= 1 || isListUsersFetching}
                    onClick={() => onUserPageChange(Math.max(1, userCurrentPage - 1))}
                  >
                    Previous
                  </Button>
                </div>
                <p className="super-admin-customers__pagination-info">
                  Page {userCurrentPage} of {userTotalPages}
                  {userTotalCount > 0 ? ` (${userTotalCount} users)` : ''}
                </p>
                <div className="super-admin-customers__pagination-controls">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={userCurrentPage >= userTotalPages || isListUsersFetching}
                    onClick={() => onUserPageChange(Math.min(userTotalPages, userCurrentPage + 1))}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={userCurrentPage >= userTotalPages || isListUsersFetching}
                    onClick={() => onUserPageChange(userTotalPages)}
                  >
                    Last
                  </Button>
                </div>
              </div>
            ) : null}
          </Card.Body>
        </Card>
      </Fieldset>
    </>
  )
}
