import { useCallback, useMemo } from 'react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { TableDateTime } from '../../components/TableDateTime'
import {
  ROLE_SCOPE_OPTIONS,
  ROLE_STATUS_OPTIONS,
  ROLE_SYSTEM_OPTIONS,
  SUPER_ADMIN_ROLES_HELP_TEXT,
  getRoleStatusVariant,
  getRoleTypeVariant,
} from './superAdminRoles.constants.js'
import './RoleListView.css'

const getRoleId = (row, index) => row?.id ?? row?._id ?? `role-${index}`
const getRoleName = (row) => row?.name || row?.key || row?.id || 'role'
const getPermissionPreview = (permissions) => {
  if (permissions.length === 0) return '--'
  if (permissions.length <= 2) return permissions.join(', ')
  return `${permissions.slice(0, 2).join(', ')} +${permissions.length - 2}`
}

function RolePermissionsPreview({ row, onViewPermissions }) {
  const permissions = Array.isArray(row?.permissions) ? row.permissions : []

  if (permissions.length === 0) {
    return <span className="super-admin-roles__permissions-empty">No permissions</span>
  }

  return (
    <div className="super-admin-roles__permissions-preview">
      <span className="super-admin-roles__permissions-summary">
        {getPermissionPreview(permissions)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="super-admin-roles__permissions-trigger"
        onClick={() => onViewPermissions(row)}
      >
        View all ({permissions.length})
        <span className="sr-only">{` permissions for ${getRoleName(row)}`}</span>
      </Button>
    </div>
  )
}

function RoleRowActionsMenu({ row, actions, onAction }) {
  const rowName = getRoleName(row)

  const options = actions
    .filter((action) => {
      const isDisabled = typeof action.disabled === 'function'
        ? action.disabled(row)
        : Boolean(action.disabled)

      return !isDisabled
    })
    .map((action) => ({ value: action.label, label: action.label }))

  if (options.length === 0) {
    return <span className="super-admin-roles__row-actions-empty">Protected</span>
  }

  return (
    <div className="super-admin-roles__row-actions">
      <Select
        size="sm"
        value=""
        placeholder="Actions"
        options={options}
        onChange={(event) => {
          const label = event.target.value
          if (label) onAction(label, row)
        }}
        aria-label={`Actions for ${rowName}`}
      />
    </div>
  )
}

export function RoleListView({
  search,
  setSearch,
  scopeFilter,
  setScopeFilter,
  statusFilter,
  setStatusFilter,
  systemFilter,
  setSystemFilter,
  setPage,
  rows,
  currentPage,
  totalPages,
  isListLoading,
  isListFetching,
  listAppError,
  openCreateDialog,
  createIsLoading,
  openEditDialog,
  openPermissionsDialog,
  onDeleteRole,
  deleteIsLoading,
}) {
  const rowActions = useMemo(
    () => [
      {
        label: 'Edit',
        disabled: (row) => Boolean(row?.isSystem),
      },
      {
        label: 'Delete',
        disabled: (row) => Boolean(row?.isSystem) || deleteIsLoading,
      },
    ],
    [deleteIsLoading],
  )

  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'Edit') openEditDialog(row)
      if (label === 'Delete') onDeleteRole(row)
    },
    [onDeleteRole, openEditDialog],
  )

  const columns = useMemo(
    () => [
      { key: 'key', label: 'Key' },
      { key: 'name', label: 'Name' },
      {
        key: 'scope',
        label: 'Scope',
        render: (value) => String(value ?? '--').trim() || '--',
      },
      {
        key: 'isSystem',
        label: 'Type',
        render: (value) => (
          <Badge size="sm" variant={getRoleTypeVariant(Boolean(value))} pill>
            {value ? 'System' : 'Custom'}
          </Badge>
        ),
      },
      {
        key: 'isActive',
        label: 'Status',
        render: (value) => (
          <Status size="sm" showIcon variant={getRoleStatusVariant(Boolean(value))}>
            {value ? 'active' : 'inactive'}
          </Status>
        ),
      },
      {
        key: 'permissions',
        label: 'Permissions',
        render: (_value, row) => (
          <RolePermissionsPreview row={row} onViewPermissions={openPermissionsDialog} />
        ),
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        width: '156px',
        render: (value) => <TableDateTime value={value} />,
      },
      {
        key: 'rowActions',
        label: 'Actions',
        align: 'center',
        width: '168px',
        render: (_value, row) => (
          <RoleRowActionsMenu row={row} actions={rowActions} onAction={handleRowAction} />
        ),
      },
    ],
    [handleRowAction, openPermissionsDialog, rowActions],
  )

  const tableRows = useMemo(
    () =>
      rows.map((row, index) => ({
        ...row,
        id: getRoleId(row, index),
      })),
    [rows],
  )

  return (
    <Fieldset className="super-admin-roles__fieldset">
      <Fieldset.Legend className="sr-only">Role catalogue</Fieldset.Legend>
      <Card variant="elevated" className="super-admin-roles__card">
        <Card.Body className="super-admin-roles__card-body--compact">
          <div className="super-admin-roles__catalogue-actions">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={openCreateDialog}
              disabled={createIsLoading}
            >
              Create
            </Button>
          </div>

          <div className="super-admin-roles__toolbar">
            <Input
              id="role-search"
              label="Search"
              size="sm"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search by key, name, or description"
              fullWidth
            />
            <Select
              id="role-scope-filter"
              label="Scope"
              size="sm"
              value={scopeFilter}
              options={ROLE_SCOPE_OPTIONS}
              onChange={(event) => {
                setScopeFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="role-system-filter"
              label="Type"
              size="sm"
              value={systemFilter}
              options={ROLE_SYSTEM_OPTIONS}
              onChange={(event) => {
                setSystemFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="role-status-filter"
              label="Status"
              size="sm"
              value={statusFilter}
              options={ROLE_STATUS_OPTIONS}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            />
          </div>

          {listAppError ? (
            <p className="super-admin-roles__error" role="alert">
              {listAppError.message}
            </p>
          ) : null}

          <p className="super-admin-roles__table-note">{SUPER_ADMIN_ROLES_HELP_TEXT}</p>

          <HorizontalScroll
            className="super-admin-roles__table-wrap"
            ariaLabel="Role catalogue table"
            gap="sm"
          >
            <Table
              className="super-admin-roles__table"
              columns={columns}
              data={tableRows}
              loading={isListLoading}
              hoverable
              variant="striped"
              emptyMessage="No roles found."
              ariaLabel="Role catalogue"
            />
          </HorizontalScroll>

          {isListFetching && !isListLoading ? (
            <p className="super-admin-roles__muted">Refreshing list...</p>
          ) : null}

          {totalPages > 1 ? (
            <div className="super-admin-roles__pagination" role="navigation" aria-label="Role catalogue pagination">
              <div className="super-admin-roles__pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isListFetching}
                  onClick={() => setPage(1)}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isListFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
              </div>
              <p className="super-admin-roles__pagination-info">
                Page {currentPage} of {totalPages}
              </p>
              <div className="super-admin-roles__pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isListFetching}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isListFetching}
                  onClick={() => setPage(totalPages)}
                >
                  Last
                </Button>
              </div>
            </div>
          ) : null}
        </Card.Body>
      </Card>
    </Fieldset>
  )
}
