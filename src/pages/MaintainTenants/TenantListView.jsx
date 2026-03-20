import { useCallback, useMemo } from 'react'
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
import {
  STATUS_VARIANT_MAP,
  getTenantStatus,
  getTenantId,
} from './tenantUtils.js'
import './MaintainTenants.css'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ENABLED', label: 'Enabled' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const STATUS_LABEL_MAP = {
  ENABLED: 'Enabled',
  DISABLED: 'Disabled',
  ARCHIVED: 'Archived',
}

const getTenantAdminName = (tenant) => String(tenant?.tenantAdmin?.name ?? '').trim()

const canEditTenant = (tenant) =>
  Boolean(getTenantId(tenant)) && getTenantStatus(tenant) !== 'ARCHIVED'

const canAssignTenantAdmin = (tenant) =>
  Boolean(getTenantId(tenant)) && getTenantStatus(tenant) !== 'ARCHIVED'

const canEnableTenant = (tenant) =>
  Boolean(getTenantId(tenant)) && getTenantStatus(tenant) === 'DISABLED'

const canDisableTenant = (tenant) =>
  Boolean(getTenantId(tenant))
  && getTenantStatus(tenant) === 'ENABLED'
  && tenant?.isDefault !== true

const canViewLinkedUsers = (tenant) => Boolean(getTenantId(tenant))

const getTenantLifecycleDetail = (tenant) => {
  const tenantStatus = getTenantStatus(tenant)

  if (tenantStatus === 'ENABLED') {
    return tenant?.isDefault
      ? 'Default tenant remains available and cannot be disabled here.'
      : 'Users assigned here retain access.'
  }

  if (tenantStatus === 'DISABLED') {
    return 'Users assigned here cannot access this tenant until it is re-enabled.'
  }

  if (tenantStatus === 'ARCHIVED') {
    return 'Archived tenants are read-only in this workspace.'
  }

  return 'Lifecycle state requires review before making access changes.'
}

function TenantStatusCell({ tenant }) {
  const tenantStatus = getTenantStatus(tenant)
  const tenantName = tenant?.name || tenant?.id || 'tenant'

  return (
    <div className="maintain-tenants__status-summary">
      <Status
        variant={STATUS_VARIANT_MAP[tenantStatus] ?? 'neutral'}
        size="sm"
        showIcon
      >
        {STATUS_LABEL_MAP[tenantStatus] ?? tenantStatus ?? 'Unknown'}
      </Status>
      <Tooltip
        content={getTenantLifecycleDetail(tenant)}
        position="top"
        align="start"
        openDelay={0}
        closeDelay={0}
        className="maintain-tenants__status-tooltip"
      >
        <button
          type="button"
          className="maintain-tenants__status-help-trigger"
          aria-label={`Explain status for ${tenantName}`}
        >
          <MdInfoOutline aria-hidden="true" focusable="false" />
          <span className="sr-only">Explain tenant status</span>
        </button>
      </Tooltip>
    </div>
  )
}

function TenantAdminCell({ tenant }) {
  const tenantAdminName = getTenantAdminName(tenant)

  if (!tenantAdminName) {
    return <span className="maintain-tenants__tenant-admin-empty">Not assigned</span>
  }

  return <span className="maintain-tenants__tenant-admin-name">{tenantAdminName}</span>
}

function TenantRowActionsMenu({ row, actions, onAction }) {
  const rowName = row?.name || row?.id || 'tenant'

  const options = actions
    .filter((action) => {
      const isDisabled = typeof action.disabled === 'function'
        ? action.disabled(row)
        : Boolean(action.disabled)
      return !isDisabled
    })
    .map((action) => ({ value: action.label, label: action.label }))

  return (
    <div className="maintain-tenants__row-actions">
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

export function TenantListView({
  searchInput,
  onSearchInputChange,
  statusFilter,
  onStatusFilterChange,
  rows,
  isListLoading,
  isListFetching,
  listAppError,
  totalPages,
  currentPage,
  totalCount,
  onPageChange,
  createButtonDisabled,
  showCreateAction = true,
  showTenantAdminColumn = true,
  allowAssignAdmin = true,
  allowLifecycleActions = true,
  allowLinkedUsers = true,
  tenantAdminScopeNote = null,
  onCreateClick,
  onEditClick,
  onLinkedUsersClick,
  onAssignAdminClick,
  onEnableClick,
  onDisableClick,
  tenantCapacityGuidance,
  lifecycleNote,
  isLifecycleMutationLoading,
}) {
  const rowActions = useMemo(() => {
    const actions = [
      {
        label: 'Edit',
        disabled: (row) => isLifecycleMutationLoading || !canEditTenant(row),
      },
    ]

    if (allowLinkedUsers) {
      actions.push({
        label: 'Linked Users',
        disabled: (row) => isLifecycleMutationLoading || !canViewLinkedUsers(row),
      })
    }

    if (allowAssignAdmin) {
      actions.push({
        label: 'Assign Admin',
        disabled: (row) => isLifecycleMutationLoading || !canAssignTenantAdmin(row),
      })
    }

    if (allowLifecycleActions) {
      actions.push(
        {
          label: 'Enable',
          disabled: (row) => isLifecycleMutationLoading || !canEnableTenant(row),
        },
        {
          label: 'Disable',
          disabled: (row) => isLifecycleMutationLoading || !canDisableTenant(row),
        },
      )
    }

    return actions
  }, [allowAssignAdmin, allowLifecycleActions, allowLinkedUsers, isLifecycleMutationLoading])

  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'Edit') onEditClick?.(row)
      if (label === 'Linked Users') onLinkedUsersClick?.(row)
      if (label === 'Assign Admin') onAssignAdminClick?.(row)
      if (label === 'Enable') onEnableClick?.(row)
      if (label === 'Disable') onDisableClick?.(row)
    },
    [onAssignAdminClick, onDisableClick, onEditClick, onEnableClick, onLinkedUsersClick],
  )

  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: 'name',
        label: 'Name',
        render: (value, row) => {
          if (!canEditTenant(row)) return value || '--'

          return (
            <button
              type="button"
              className="maintain-tenants__name-button"
              onClick={() => onEditClick(row)}
            >
              {value || '--'}
            </button>
          )
        },
      },
      {
        key: 'website',
        label: 'Website',
        render: (value) => {
          if (!value) return '--'

          let isSafeUrl = false
          try {
            const parsed = new URL(value)
            isSafeUrl = parsed.protocol === 'https:' || parsed.protocol === 'http:'
          } catch {
            // not a parseable URL - render as plain text
          }

          return isSafeUrl ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="maintain-tenants__link"
            >
              {value}
            </a>
          ) : (
            <span>{value}</span>
          )
        },
      },
      {
        key: 'status',
        label: 'Status',
        render: (_value, row) => <TenantStatusCell tenant={row} />,
      },
    ]

    if (showTenantAdminColumn) {
      baseColumns.push({
        key: 'tenantAdmin',
        label: 'Tenant Admin',
        render: (_value, row) => <TenantAdminCell tenant={row} />,
      })
    }

    baseColumns.push({
      key: 'rowActions',
      label: 'Actions',
      align: 'center',
      width: '168px',
      render: (_value, row) => (
        <TenantRowActionsMenu row={row} actions={rowActions} onAction={handleRowAction} />
      ),
    })

    return baseColumns
  }, [handleRowAction, onEditClick, rowActions, showTenantAdminColumn])

  return (
    <>
      <header className="maintain-tenants__header">
        <h1 className="maintain-tenants__title">Maintain Tenants</h1>
        <p className="maintain-tenants__subtitle">
          {showTenantAdminColumn
            ? 'Manage tenant lifecycle, capacity, and linked tenant-admin assignments for the selected customer.'
            : 'View and edit tenant details for the tenants you administer.'}
        </p>
      </header>

      <Fieldset className="maintain-tenants__fieldset">
        <Fieldset.Legend className="sr-only">Tenant catalogue</Fieldset.Legend>
        <Card variant="elevated" className="maintain-tenants__card">
          <Card.Body className="maintain-tenants__card-body maintain-tenants__card-body--compact">
            {showCreateAction ? (
              <div className="maintain-tenants__catalogue-actions">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onCreateClick}
                  disabled={createButtonDisabled}
                >
                  Create Tenant
                </Button>
              </div>
            ) : null}

            {showCreateAction && tenantCapacityGuidance ? (
              <div
                className={[
                  'maintain-tenants__note',
                  tenantCapacityGuidance.tone === 'warning'
                    ? 'maintain-tenants__note--warning'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role={tenantCapacityGuidance.tone === 'warning' ? 'alert' : 'status'}
                aria-label="Tenant capacity guidance"
              >
                <p className="maintain-tenants__note-title">{tenantCapacityGuidance.title}</p>
                <p className="maintain-tenants__note-text">{tenantCapacityGuidance.message}</p>
              </div>
            ) : null}

            {tenantAdminScopeNote ? (
              <p className="maintain-tenants__table-note">{tenantAdminScopeNote}</p>
            ) : null}

            <div className="maintain-tenants__toolbar">
              <Input
                id="tenant-search"
                type="search"
                label="Search"
                size="sm"
                value={searchInput}
                onChange={(event) => onSearchInputChange(event.target.value)}
                fullWidth
              />
              <Select
                id="tenant-status-filter"
                label="Status"
                size="sm"
                value={statusFilter}
                onChange={(event) => onStatusFilterChange(event.target.value)}
                options={STATUS_OPTIONS}
              />
            </div>

            {listAppError ? (
              <ErrorSupportPanel
                error={listAppError}
                context="maintain-tenants-list"
              />
            ) : null}

            <p className="maintain-tenants__table-note">{lifecycleNote}</p>

            <HorizontalScroll className="maintain-tenants__table-wrap" ariaLabel="Tenants table" gap="sm">
              <Table
                className="maintain-tenants__table"
                columns={columns}
                data={rows}
                loading={isListLoading}
                loadingRows={5}
                variant="striped"
                hoverable
                emptyMessage="No tenants found."
                ariaLabel="Tenants"
              />
            </HorizontalScroll>

            {isListFetching && !isListLoading ? (
              <p className="maintain-tenants__muted">Refreshing tenants...</p>
            ) : null}

            {totalPages > 1 ? (
              <div className="maintain-tenants__pagination" role="navigation" aria-label="Tenants pagination">
                <div className="maintain-tenants__pagination-controls">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1 || isListFetching}
                    onClick={() => onPageChange(1)}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1 || isListFetching}
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  >
                    Previous
                  </Button>
                </div>
                <p className="maintain-tenants__pagination-info">
                  Page {currentPage} of {totalPages}
                  {totalCount > 0 ? ` (${totalCount} tenants)` : ''}
                </p>
                <div className="maintain-tenants__pagination-controls">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages || isListFetching}
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages || isListFetching}
                    onClick={() => onPageChange(totalPages)}
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

export default TenantListView
