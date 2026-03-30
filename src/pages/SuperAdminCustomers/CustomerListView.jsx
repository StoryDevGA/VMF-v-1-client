import { useCallback, useMemo } from 'react'
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
  STATUS_FILTER_OPTIONS,
  TOPOLOGY_FILTER_OPTIONS,
} from './superAdminCustomers.constants.js'
import {
  getCustomerId,
  displayStatus,
} from './superAdminCustomers.utils.js'
import './CustomerListView.css'

export function CustomerRowActionsMenu({ row, actions, onAction, className = '' }) {
  const rowName = row?.name || row?.id || 'customer'

  const options = actions
    .filter((action) => {
      const isDisabled = typeof action.disabled === 'function'
        ? action.disabled(row)
        : Boolean(action.disabled)
      return !isDisabled
    })
    .map((action) => ({ value: action.label, label: action.label }))

  return (
    <div className={['super-admin-customers__row-actions', className].filter(Boolean).join(' ')}>
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

export function CustomerListView({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  topologyFilter,
  onTopologyFilterChange,
  rows,
  isListLoading,
  isListFetching,
  listAppError,
  totalPages,
  currentPage,
  onPageChange,
  createButtonDisabled,
  onCreateClick,
  onEditClick,
  onViewUsers,
  onUpdateStatus,
  updateStatusLoading,
}) {
  const rowActions = useMemo(
    () => [
      { label: 'Edit' },
      { label: 'View Users' },
      {
        label: 'Set Active',
        disabled: (row) => displayStatus(row?.status) === 'ACTIVE',
      },
      {
        label: 'Set Inactive',
        disabled: (row) => displayStatus(row?.status) === 'INACTIVE',
      },
    ],
    [],
  )

  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'Edit') onEditClick(row)
      if (label === 'View Users') onViewUsers(row)
      if (label === 'Set Active') onUpdateStatus(row, 'ACTIVE')
      if (label === 'Set Inactive') onUpdateStatus(row, 'INACTIVE')
    },
    [onEditClick, onUpdateStatus, onViewUsers],
  )

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        render: (value, row) => {
          const customerId = getCustomerId(row)
          if (!customerId) return value || '--'

          return (
            <button
              type="button"
              className="super-admin-customers__name-button"
              onClick={() => onEditClick(row)}
            >
              {value || '--'}
            </button>
          )
        },
      },
      {
        key: 'status',
        label: 'Status',
        render: (value) => (
          <Status size="sm" showIcon variant={displayStatus(value) === 'ACTIVE' ? 'success' : 'warning'}>
            {displayStatus(value)}
          </Status>
        ),
      },
      {
        key: 'topology',
        label: 'Topology',
        render: (value) => (value === 'MULTI_TENANT' ? 'Multi Tenant' : 'Single Tenant'),
      },
      {
        key: 'governance',
        label: 'Limits',
        render: (_value, row) =>
          `${row?.governance?.maxTenants ?? '--'} / ${row?.governance?.maxVmfsPerTenant ?? '--'}`,
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
          <CustomerRowActionsMenu row={row} actions={rowActions} onAction={handleRowAction} />
        ),
      },
    ],
    [handleRowAction, onEditClick, rowActions],
  )

  return (
    <>
      <header className="super-admin-customers__header">
        <h2 className="super-admin-customers__title">Customers</h2>
        <p className="super-admin-customers__subtitle">
          Customers - Manage customer lifecycle, governance limits, and canonical customer admin flows.
        </p>
      </header>

      <Fieldset className="super-admin-customers__fieldset">
        <Fieldset.Legend className="sr-only">Customer catalogue</Fieldset.Legend>
        <Card variant="elevated" className="super-admin-customers__card">
          <Card.Body className="super-admin-customers__card-body super-admin-customers__card-body--compact">
            <div className="super-admin-customers__catalogue-actions">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onCreateClick}
                disabled={createButtonDisabled}
              >
                Create
              </Button>
            </div>
            <div className="super-admin-customers__toolbar">
              <Input
                id="sa-customer-search"
                label="Search"
                size="sm"
                value={search}
                onChange={(event) => {
                  onSearchChange(event.target.value)
                  onPageChange(1)
                }}
                fullWidth
              />
              <Select
                id="sa-customer-status-filter"
                label="Status"
                size="sm"
                value={statusFilter}
                options={STATUS_FILTER_OPTIONS}
                onChange={(event) => {
                  onStatusFilterChange(event.target.value)
                  onPageChange(1)
                }}
              />
              <Select
                id="sa-customer-topology-filter"
                label="Topology"
                size="sm"
                value={topologyFilter}
                options={TOPOLOGY_FILTER_OPTIONS}
                onChange={(event) => {
                  onTopologyFilterChange(event.target.value)
                  onPageChange(1)
                }}
              />
            </div>
            {listAppError ? (
              <p className="super-admin-customers__error" role="alert">
                {listAppError.message}
              </p>
            ) : null}
            <HorizontalScroll className="super-admin-customers__table-wrap" ariaLabel="Customers table" gap="sm">
              <Table
                className="super-admin-customers__table"
                columns={columns}
                data={rows}
                loading={isListLoading}
                variant="striped"
                hoverable
                emptyMessage="No customers found."
                ariaLabel="Customers"
              />
            </HorizontalScroll>
            {isListFetching && !isListLoading ? (
              <p className="super-admin-customers__muted">Refreshing list...</p>
            ) : null}
            {totalPages > 1 ? (
              <div className="super-admin-customers__pagination" role="navigation" aria-label="Customers pagination">
                <div className="super-admin-customers__pagination-controls">
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
                <p className="super-admin-customers__pagination-info">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="super-admin-customers__pagination-controls">
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

      {updateStatusLoading ? (
        <p className="super-admin-customers__muted">Updating customer status...</p>
      ) : null}
    </>
  )
}
