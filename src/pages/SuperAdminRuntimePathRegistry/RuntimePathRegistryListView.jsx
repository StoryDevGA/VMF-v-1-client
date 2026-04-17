import { useMemo } from 'react'
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
  RUNTIME_PATH_REGISTRY_HELP_TEXT,
  RUNTIME_PATH_REGISTRY_OPERATION_OPTIONS,
  RUNTIME_PATH_REGISTRY_PROTECTED_OPTIONS,
  RUNTIME_PATH_REGISTRY_STATUS_OPTIONS,
  formatRuntimePathRegistryStatus,
  getRuntimePathRegistryStatusVariant,
} from './superAdminRuntimePathRegistry.constants.js'
import './RuntimePathRegistryListView.css'

function renderPathSummary(_value, row) {
  return (
    <div className="super-admin-runtime-path-registry__path-summary">
      <span className="super-admin-runtime-path-registry__path-label">{row.label}</span>
      <code className="super-admin-runtime-path-registry__path-key">{row.pathKey}</code>
    </div>
  )
}

function renderTokenList(value) {
  const items = Array.isArray(value) ? value : []

  if (items.length === 0) {
    return '--'
  }

  return (
    <div className="super-admin-runtime-path-registry__token-list">
      {items.slice(0, 2).map((item) => (
        <Badge key={item} variant="info" size="sm" pill outline>
          {item}
        </Badge>
      ))}
      {items.length > 2 ? (
        <Badge variant="neutral" size="sm" pill outline>
          +{items.length - 2}
        </Badge>
      ) : null}
    </div>
  )
}

function renderProtectedState(value) {
  return value ? (
    <Badge variant="warning" size="sm" pill outline>
      Protected
    </Badge>
  ) : (
    <Badge variant="neutral" size="sm" pill outline>
      Standard
    </Badge>
  )
}

export function RuntimePathRegistryListView({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  operationFilter,
  setOperationFilter,
  protectedFilter,
  setProtectedFilter,
  setPage,
  rows,
  currentPage,
  totalPages,
  isListLoading,
  isListFetching,
  listAppError,
  onBackClick,
}) {
  const columns = useMemo(
    () => [
      {
        key: 'pathKey',
        label: 'Runtime Path',
        mobileLabel: 'Runtime Path',
        width: '22%',
        render: renderPathSummary,
      },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        width: '10%',
        render: (value) => (
          <Status size="sm" showIcon variant={getRuntimePathRegistryStatusVariant(value)}>
            {formatRuntimePathRegistryStatus(value)}
          </Status>
        ),
      },
      {
        key: 'isProtected',
        label: 'Protection',
        mobileLabel: 'Protection',
        width: '11%',
        render: renderProtectedState,
      },
      {
        key: 'frameworkKeys',
        label: 'Frameworks',
        mobileLabel: 'Frameworks',
        width: '13%',
        render: renderTokenList,
      },
      {
        key: 'allowedOperations',
        label: 'Operations',
        mobileLabel: 'Operations',
        width: '13%',
        render: renderTokenList,
      },
      {
        key: 'scope',
        label: 'Scope',
        mobileLabel: 'Scope',
        width: '11%',
        render: (value) => (
          <span className="super-admin-runtime-path-registry__scope-cell">{value}</span>
        ),
      },
      {
        key: 'category',
        label: 'Category',
        mobileLabel: 'Category',
        width: '10%',
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        mobileLabel: 'Updated',
        width: '10%',
        render: (value) => <TableDateTime value={value} />,
      },
    ],
    [],
  )

  return (
    <Fieldset className="super-admin-runtime-path-registry__fieldset">
      <Fieldset.Legend className="sr-only">Runtime path registry catalogue</Fieldset.Legend>
      <Card variant="elevated" className="super-admin-runtime-path-registry__card">
        <Card.Body className="super-admin-runtime-path-registry__card-body super-admin-runtime-path-registry__card-body--compact">
          <div className="super-admin-runtime-path-registry__catalogue-actions">
            <Button type="button" variant="outline" size="sm" onClick={onBackClick}>
              Back
            </Button>
          </div>

          <div className="super-admin-runtime-path-registry__toolbar">
            <Input
              id="runtime-path-registry-search"
              label="Search"
              size="sm"
              value={search}
              placeholder="Search by path key, label, description, scope, or category"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              fullWidth
            />
            <Select
              id="runtime-path-registry-status-filter"
              label="Status"
              size="sm"
              value={statusFilter}
              options={RUNTIME_PATH_REGISTRY_STATUS_OPTIONS}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="runtime-path-registry-operation-filter"
              label="Operation"
              size="sm"
              value={operationFilter}
              options={RUNTIME_PATH_REGISTRY_OPERATION_OPTIONS}
              onChange={(event) => {
                setOperationFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="runtime-path-registry-protected-filter"
              label="Protection"
              size="sm"
              value={protectedFilter}
              options={RUNTIME_PATH_REGISTRY_PROTECTED_OPTIONS}
              onChange={(event) => {
                setProtectedFilter(event.target.value)
                setPage(1)
              }}
            />
          </div>

          {listAppError ? (
            <p className="super-admin-runtime-path-registry__error" role="alert">
              {listAppError.message}
            </p>
          ) : null}

          <p className="super-admin-runtime-path-registry__table-note">
            {RUNTIME_PATH_REGISTRY_HELP_TEXT}
          </p>

          <HorizontalScroll
            className="super-admin-runtime-path-registry__table-wrap"
            ariaLabel="Runtime paths table"
            gap="sm"
          >
            <Table
              className="super-admin-runtime-path-registry__table"
              columns={columns}
              data={rows}
              loading={isListLoading}
              variant="striped"
              hoverable
              emptyMessage="No runtime paths found."
              ariaLabel="Runtime Paths"
            />
          </HorizontalScroll>

          {isListFetching && !isListLoading ? (
            <p className="super-admin-runtime-path-registry__muted">Refreshing list...</p>
          ) : null}

          {totalPages > 1 ? (
            <div
              className="super-admin-runtime-path-registry__pagination"
              role="navigation"
              aria-label="Runtime paths pagination"
            >
              <div className="super-admin-runtime-path-registry__pagination-controls">
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

              <p className="super-admin-runtime-path-registry__pagination-info">
                Page {currentPage} of {totalPages}
              </p>

              <div className="super-admin-runtime-path-registry__pagination-controls">
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
