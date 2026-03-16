import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { MdInfoOutline } from 'react-icons/md'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { Tooltip } from '../../components/Tooltip'
import { UserTrustStatus } from '../../components/UserTrustStatus'

const CANONICAL_ADMIN_TOOLTIP_TEXT =
  'Canonical Admin identifies the governed owner for this customer. Ownership changes use the dedicated transfer workflow.'

const getUserTrustStatus = (user) =>
  String(user?.trustStatus ?? user?.identityPlus?.trustStatus ?? 'UNTRUSTED')
    .trim()
    .toUpperCase()

const getUserInvitedAt = (user) => user?.identityPlus?.invitedAt ?? user?.invitedAt ?? null
const getUserTrustedAt = (user) => user?.identityPlus?.trustedAt ?? user?.trustedAt ?? null

const getUserRoles = (user) =>
  [...new Set(user?.memberships?.flatMap((membership) => membership?.roles ?? [])?.filter(Boolean) ?? [])]

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

function UserRolesCell({ row }) {
  const roles = getUserRoles(row)
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

  if (roles.length === 0) return '--'

  return (
    <div className="edit-users__roles-summary" ref={containerRef}>
      <Tooltip
        id={tooltipId}
        content={(
          <span className="edit-users__roles-tooltip-list">
            {roles.map((role) => (
              <span key={role} className="edit-users__roles-tooltip-item">
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
        className="edit-users__roles-tooltip"
      >
        <button
          type="button"
          className="edit-users__roles-trigger"
          aria-label={`Show roles for ${userName}`}
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
          <MdInfoOutline
            aria-hidden="true"
            focusable="false"
            className="edit-users__roles-trigger-icon"
          />
          <span>all</span>
        </button>
      </Tooltip>
    </div>
  )
}

function UserTrustCell({ user }) {
  const lifecycleCopy = getUserLifecycleCopy(user)
  const userName = user?.name || user?.email || 'user'

  return (
    <div className="edit-users__trust-summary">
      <UserTrustStatus
        trustStatus={getUserTrustStatus(user)}
        size="sm"
      />
      <Tooltip
        content={(
          <span className="edit-users__trust-tooltip-content">
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
          </span>
        )}
        position="top"
        align="start"
        openDelay={0}
        closeDelay={0}
        className="edit-users__trust-tooltip"
      >
        <button
          type="button"
          className="edit-users__trust-help-trigger"
          aria-label={`Explain trust status for ${userName}`}
        >
          <MdInfoOutline aria-hidden="true" focusable="false" />
          <span className="sr-only">Explain trust status</span>
        </button>
      </Tooltip>
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

function UserRowActionsMenu({ row, actions, onAction }) {
  const rowName = row?.name || row?.email || row?.id || 'user'

  const options = actions
    .filter((action) => {
      const isDisabled = typeof action.disabled === 'function'
        ? action.disabled(row)
        : Boolean(action.disabled)

      return !isDisabled
    })
    .map((action) => ({ value: action.label, label: action.label }))

  return (
    <div className="edit-users__row-actions">
      <Select
        size="sm"
        value=""
        placeholder={options.length > 0 ? 'Actions' : 'No actions'}
        options={options}
        disabled={options.length === 0}
        onChange={(event) => {
          const label = event.target.value
          if (label) onAction(label, row)
        }}
        aria-label={`Actions for ${rowName}`}
      />
    </div>
  )
}

export function EditUsersListView({
  tenantScopeMessage,
  tenantContextAppError,
  listUsersAppError,
  governanceNote,
  lifecycleNote,
  searchInput,
  onSearchInputChange,
  statusFilter,
  statusOptions,
  onStatusFilterChange,
  rows,
  isListLoading,
  isListFetching,
  selectedRows,
  onSelectedRowsChange,
  totalPages,
  currentPage,
  totalCount,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
  onBulkCreateClick,
  onBulkUpdateSelectedClick,
  onBulkDisableSelectedClick,
  onClearSelection,
  onCreateUserClick,
  onEditUserClick,
  onTransferOwnershipClick,
  onDisableUserClick,
  onEnableUserClick,
  onDeleteUserClick,
  onResendInvitationClick,
  hasCanonicalAdmin,
  isRowActionMutationLoading,
}) {
  const rowActions = useMemo(
    () => [
      {
        label: 'Edit',
        disabled: isRowActionMutationLoading,
      },
      {
        label: 'Transfer Ownership',
        disabled: (row) =>
          isRowActionMutationLoading
          || !hasCanonicalAdmin
          || !row?.isActive
          || Boolean(row?.isCanonicalAdmin),
      },
      {
        label: 'Disable',
        disabled: (row) => isRowActionMutationLoading || !row?.isActive,
      },
      {
        label: 'Reactivate',
        disabled: (row) => isRowActionMutationLoading || Boolean(row?.isActive),
      },
      {
        label: 'Delete',
        disabled: (row) => isRowActionMutationLoading || Boolean(row?.isActive),
      },
      {
        label: 'Resend Invitation',
        disabled: (row) =>
          isRowActionMutationLoading
          || !row?.isActive
          || getUserTrustStatus(row) !== 'UNTRUSTED',
      },
    ],
    [hasCanonicalAdmin, isRowActionMutationLoading],
  )

  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'Edit') onEditUserClick(row)
      if (label === 'Transfer Ownership') onTransferOwnershipClick(row)
      if (label === 'Disable') onDisableUserClick(row)
      if (label === 'Reactivate') onEnableUserClick(row)
      if (label === 'Delete') onDeleteUserClick(row)
      if (label === 'Resend Invitation') onResendInvitationClick(row)
    },
    [
      onDeleteUserClick,
      onDisableUserClick,
      onEditUserClick,
      onEnableUserClick,
      onResendInvitationClick,
      onTransferOwnershipClick,
    ],
  )

  const columns = useMemo(
    () => [
      {
        key: 'userIdentity',
        label: 'User',
        width: '260px',
        render: (_value, row) => (
          <div className="edit-users__user-identity">
            <button
              type="button"
              className="edit-users__name-button"
              onClick={() => onEditUserClick(row)}
            >
              {row?.name || '--'}
            </button>
            <span className="edit-users__user-email">{row?.email || '--'}</span>
          </div>
        ),
      },
      {
        key: 'roles',
        label: 'Roles',
        render: (_value, row) => <UserRolesCell row={row} />,
      },
      {
        key: 'status',
        label: 'Status',
        render: (_value, row) => (
          <Status
            variant={row?.isActive ? 'success' : 'error'}
            size="sm"
            showIcon
          >
            {row?.isActive ? 'Active' : 'Disabled'}
          </Status>
        ),
      },
      {
        key: 'trustStatus',
        label: 'Trust',
        render: (_value, row) => <UserTrustCell user={row} />,
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
      {
        key: 'rowActions',
        label: 'Actions',
        align: 'center',
        width: '168px',
        render: (_value, row) => (
          <UserRowActionsMenu row={row} actions={rowActions} onAction={handleRowAction} />
        ),
      },
    ],
    [handleRowAction, onEditUserClick, rowActions],
  )
  const selectedCount = selectedRows?.size ?? 0

  return (
    <>
      <header className="edit-users__header">
        <h1 className="edit-users__title">Edit Users</h1>
        <p className="edit-users__subtitle">
          Manage lifecycle, invitation recovery, governed ownership, and customer-scoped access for the selected customer.
        </p>
      </header>

      <Fieldset className="edit-users__fieldset">
        <Fieldset.Legend className="sr-only">Customer users</Fieldset.Legend>
        <Card variant="elevated" className="edit-users__card">
          <Card.Body className="edit-users__card-body edit-users__card-body--compact">
            <div className="edit-users__catalogue-actions">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBulkCreateClick}
                disabled={isListFetching}
              >
                Bulk Create
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onCreateUserClick}
                disabled={isListFetching}
              >
                Create User
              </Button>
            </div>

            {tenantScopeMessage ? (
              <p className="edit-users__scope-indicator" role="status">
                {tenantScopeMessage}
              </p>
            ) : null}

            <div className="edit-users__note-grid">
              <div
                className="edit-users__governance-note"
                role="note"
                aria-label="Customer Admin governance guidance"
              >
                <p className="edit-users__governance-title">Customer Admin governance</p>
                <p className="edit-users__governance-text">{governanceNote}</p>
              </div>

              <div
                className="edit-users__lifecycle-note"
                role="note"
                aria-label="User lifecycle and invitation guidance"
              >
                <p className="edit-users__lifecycle-title">User lifecycle and invitations</p>
                <p className="edit-users__lifecycle-text">{lifecycleNote}</p>
              </div>
            </div>

            <div className="edit-users__toolbar">
              <div className="edit-users__search">
                <Input
                  id="user-search"
                  type="search"
                  label="Search"
                  size="sm"
                  placeholder="Search by name or email..."
                  value={searchInput}
                  onChange={(event) => onSearchInputChange(event.target.value)}
                  fullWidth
                />
              </div>
              <div className="edit-users__filter">
                <Select
                  id="user-status-filter"
                  label="Status"
                  size="sm"
                  value={statusFilter}
                  onChange={(event) => onStatusFilterChange(event.target.value)}
                  options={statusOptions}
                />
              </div>
            </div>

            {selectedCount === 0 ? (
              <p className="edit-users__selection-hint" role="status">
                Use row checkboxes to select users for bulk update or bulk disable.
              </p>
            ) : null}

            {tenantContextAppError ? (
              <ErrorSupportPanel
                error={tenantContextAppError}
                context="edit-users-tenant-context"
              />
            ) : null}

            {listUsersAppError ? (
              <ErrorSupportPanel
                error={listUsersAppError}
                context="edit-users-list"
              />
            ) : null}

            <HorizontalScroll className="edit-users__table-wrap" ariaLabel="Customer users scroll region" gap="sm">
              <Table
                className="edit-users__table"
                columns={columns}
                data={rows}
                variant="striped"
                hoverable
                selectable
                selectedRows={selectedRows}
                onSelectChange={onSelectedRowsChange}
                loading={isListLoading}
                loadingRows={5}
                emptyMessage="No users found."
                ariaLabel="Users table"
              />
            </HorizontalScroll>

            {selectedCount > 0 ? (
              <>
                <div className="edit-users__selection-bar-spacer" aria-hidden="true" />
                <div
                  className="edit-users__selection-bar edit-users__selection-bar--floating"
                  role="region"
                  aria-label="Bulk actions for selected users"
                >
                  <div className="edit-users__selection-summary" aria-live="polite">
                    <strong className="edit-users__selection-count">
                      {selectedCount} selected
                    </strong>
                    <span className="edit-users__selection-text">
                      Bulk update and bulk disable will apply only to the selected users on this page.
                    </span>
                  </div>
                  <div className="edit-users__selection-actions">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onClearSelection}
                      disabled={isListFetching}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={onBulkUpdateSelectedClick}
                      disabled={isListFetching}
                    >
                      Bulk Update Selected
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={onBulkDisableSelectedClick}
                      disabled={isListFetching}
                    >
                      Bulk Disable Selected
                    </Button>
                  </div>
                </div>
              </>
            ) : null}

            {isListFetching && !isListLoading ? (
              <p className="edit-users__muted">Refreshing users...</p>
            ) : null}

            {totalPages > 1 ? (
              <div className="edit-users__pagination" role="navigation" aria-label="Users pagination">
                <div className="edit-users__pagination-controls">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onFirstPage}
                    disabled={currentPage <= 1 || isListFetching}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPreviousPage}
                    disabled={currentPage <= 1 || isListFetching}
                  >
                    Previous
                  </Button>
                </div>
                <p className="edit-users__pagination-info">
                  Page {currentPage} of {totalPages}
                  {totalCount > 0 ? ` (${totalCount} users)` : ''}
                </p>
                <div className="edit-users__pagination-controls">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNextPage}
                    disabled={currentPage >= totalPages || isListFetching}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLastPage}
                    disabled={currentPage >= totalPages || isListFetching}
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

export default EditUsersListView
