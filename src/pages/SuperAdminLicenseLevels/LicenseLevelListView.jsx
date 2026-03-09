import { useMemo } from 'react'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Button } from '../../components/Button'
import { Table } from '../../components/Table'
import { TableDateTime } from '../../components/TableDateTime'
import { Status } from '../../components/Status'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import {
  STATUS_OPTIONS,
  LICENSE_LEVELS_HELP_TEXT,
  getStatusVariant,
} from './superAdminLicenseLevels.constants.js'
import './LicenseLevelListView.css'

export function LicenseLevelListView({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
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
}) {
  const columns = useMemo(
    () => [
      { key: 'name', label: 'Name' },
      {
        key: 'isActive',
        label: 'Status',
        render: (value) => (
          <Status size="sm" showIcon variant={getStatusVariant(Boolean(value))}>
            {value ? 'active' : 'inactive'}
          </Status>
        ),
      },
      {
        key: 'customerCount',
        label: 'Customers',
        render: (value) => value ?? 0,
      },
      {
        key: 'featureEntitlements',
        label: 'Entitlements',
        render: (value) => {
          const items = Array.isArray(value) ? value : []
          if (items.length === 0) return '--'
          if (items.length <= 3) return items.join(', ')
          return `${items.slice(0, 3).join(', ')} +${items.length - 3}`
        },
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        width: '156px',
        render: (value) => <TableDateTime value={value} />,
      },
    ],
    [],
  )

  return (
    <Fieldset className="super-admin-license-levels__fieldset">
      <Fieldset.Legend className="sr-only">Licence level catalogue</Fieldset.Legend>
      <Card variant="elevated" className="super-admin-license-levels__card">
        <Card.Body className="super-admin-license-levels__card-body--compact">
          <div className="super-admin-license-levels__catalogue-actions">
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

          <div className="super-admin-license-levels__toolbar">
            <Input
              id="license-level-search"
              label="Search"
              size="sm"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search by name or description"
              fullWidth
            />
            <Select
              id="license-level-status"
              label="Status"
              size="sm"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            />
          </div>

          {listAppError ? (
            <p className="super-admin-license-levels__error" role="alert">
              {listAppError.message}
            </p>
          ) : null}
          <p className="super-admin-license-levels__table-note">{LICENSE_LEVELS_HELP_TEXT}</p>

          <HorizontalScroll
            className="super-admin-license-levels__table-wrap"
            ariaLabel="Licence levels table"
            gap="sm"
          >
            <Table
              className="super-admin-license-levels__table"
              columns={columns}
              data={rows}
              actions={[{ label: 'Edit', variant: 'ghost' }]}
              onRowAction={(label, row) => {
                if (label === 'Edit') {
                  openEditDialog(row)
                }
              }}
              loading={isListLoading}
              hoverable
              variant="striped"
              emptyMessage="No licence levels found."
              ariaLabel="Licence levels"
            />
          </HorizontalScroll>

          {isListFetching && !isListLoading ? (
            <p className="super-admin-license-levels__muted">Refreshing list...</p>
          ) : null}

          {totalPages > 1 ? (
            <div className="super-admin-license-levels__pagination" role="navigation" aria-label="Licence levels pagination">
              <div className="super-admin-license-levels__pagination-controls">
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
              <p className="super-admin-license-levels__pagination-info">
                Page {currentPage} of {totalPages}
              </p>
              <div className="super-admin-license-levels__pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isListFetching}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
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
