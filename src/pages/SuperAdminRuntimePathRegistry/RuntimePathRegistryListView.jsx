import { useCallback, useMemo } from 'react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Accordion } from '../../components/Accordion'
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

function normalizeAccordionId(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function renderPathSummary(_value, row) {
  return (
    <div className="super-admin-runtime-path-registry__path-summary">
      <span className="super-admin-runtime-path-registry__path-label">{row.label}</span>
      <code className="super-admin-runtime-path-registry__path-key">{row.pathKey}</code>
    </div>
  )
}

function renderFlagBadges(_value, row) {
  const isProtected = Boolean(row?.isProtected)
  const isSystem = row?.isSystem !== undefined ? Boolean(row.isSystem) : true

  return (
    <div className="super-admin-runtime-path-registry__flag-list">
      {isProtected ? (
        <Badge variant="warning" size="sm" pill outline>
          Protected
        </Badge>
      ) : (
        <Badge variant="neutral" size="sm" pill outline>
          Standard
        </Badge>
      )}
      {isSystem ? (
        <Badge variant="info" size="sm" pill outline>
          System
        </Badge>
      ) : (
        <Badge variant="neutral" size="sm" pill outline>
          Extension
        </Badge>
      )}
    </div>
  )
}

function SchemaAccordionCell({ row }) {
  const category = row?.category ? String(row.category) : null
  const dataType = row?.dataType ? String(row.dataType) : null
  const sourceType = row?.sourceType ? String(row.sourceType) : null
  const uiControl = row?.uiControl ? String(row.uiControl) : null

  if (!category && !dataType && !sourceType && !uiControl) return <span>--</span>

  const baseId = `schema-${normalizeAccordionId(row?.id ?? row?.pathKey ?? row?.label ?? 'runtime-path')}`
  const categoryItemId = `${baseId}-category`
  const sourceTypeItemId = `${baseId}-source-type`
  const dataTypeItemId = `${baseId}-data-type`
  const uiControlItemId = `${baseId}-ui-control`

  return (
    <Accordion
      variant="default"
      rounded={false}
      className="super-admin-runtime-path-registry__schema-accordion"
    >
      {category ? (
        <Accordion.Item id={categoryItemId}>
          <Accordion.Header
            itemId={categoryItemId}
            className="super-admin-runtime-path-registry__schema-accordion-header"
            aria-label={`Category for ${row.label ?? row.pathKey ?? 'runtime path'}`}
          >
            Category
          </Accordion.Header>
          <Accordion.Content
            itemId={categoryItemId}
            className="super-admin-runtime-path-registry__schema-accordion-content"
          >
            <code className="super-admin-runtime-path-registry__schema-value">{category}</code>
          </Accordion.Content>
        </Accordion.Item>
      ) : null}

      {sourceType ? (
        <Accordion.Item id={sourceTypeItemId}>
          <Accordion.Header
            itemId={sourceTypeItemId}
            className="super-admin-runtime-path-registry__schema-accordion-header"
            aria-label={`Source type for ${row.label ?? row.pathKey ?? 'runtime path'}`}
          >
            Source type
          </Accordion.Header>
          <Accordion.Content
            itemId={sourceTypeItemId}
            className="super-admin-runtime-path-registry__schema-accordion-content"
          >
            <code className="super-admin-runtime-path-registry__schema-value">{sourceType}</code>
          </Accordion.Content>
        </Accordion.Item>
      ) : null}

      {dataType ? (
        <Accordion.Item id={dataTypeItemId}>
          <Accordion.Header
            itemId={dataTypeItemId}
            className="super-admin-runtime-path-registry__schema-accordion-header"
            aria-label={`Data type for ${row.label ?? row.pathKey ?? 'runtime path'}`}
          >
            Data type
          </Accordion.Header>
          <Accordion.Content
            itemId={dataTypeItemId}
            className="super-admin-runtime-path-registry__schema-accordion-content"
          >
            <code className="super-admin-runtime-path-registry__schema-value">{dataType}</code>
          </Accordion.Content>
        </Accordion.Item>
      ) : null}

      {uiControl ? (
        <Accordion.Item id={uiControlItemId}>
          <Accordion.Header
            itemId={uiControlItemId}
            className="super-admin-runtime-path-registry__schema-accordion-header"
            aria-label={`UI control for ${row.label ?? row.pathKey ?? 'runtime path'}`}
          >
            UI control
          </Accordion.Header>
          <Accordion.Content
            itemId={uiControlItemId}
            className="super-admin-runtime-path-registry__schema-accordion-content"
          >
            <code className="super-admin-runtime-path-registry__schema-value">{uiControl}</code>
          </Accordion.Content>
        </Accordion.Item>
      ) : null}
    </Accordion>
  )
}

function renderCodeTokens(items) {
  const list = Array.isArray(items) ? items : []
  if (list.length === 0) return '--'

  return (
    <div className="super-admin-runtime-path-registry__code-tokens">
      {list.map((item) => (
        <code key={item} className="super-admin-runtime-path-registry__code-token">
          {String(item)}
        </code>
      ))}
    </div>
  )
}

function renderCompatibilitySummary(_value, row) {
  const frameworkKeys = Array.isArray(row?.frameworkKeys) ? row.frameworkKeys : []
  const allowedOperations = Array.isArray(row?.allowedOperations) ? row.allowedOperations : []

  if (frameworkKeys.length === 0 && allowedOperations.length === 0) return '--'

  return (
    <div className="super-admin-runtime-path-registry__compat-summary" aria-label="Compatibility">
      {frameworkKeys.length > 0 ? (
        <div className="super-admin-runtime-path-registry__meta-item">
          <span className="super-admin-runtime-path-registry__meta-label">Frameworks</span>
          {renderCodeTokens(frameworkKeys)}
        </div>
      ) : null}
      {allowedOperations.length > 0 ? (
        <div className="super-admin-runtime-path-registry__meta-item">
          <span className="super-admin-runtime-path-registry__meta-label">Operations</span>
          {renderCodeTokens(allowedOperations)}
        </div>
      ) : null}
    </div>
  )
}

function RuntimePathRowActionsMenu({ row, onAction, disabled = false }) {
  const status = String(row?.status ?? '').toUpperCase()
  const actionOptions = [
    { value: 'Edit', label: 'Edit' },
    { value: 'Duplicate', label: 'Duplicate' },
    ...(status !== 'ACTIVE' ? [{ value: 'Activate', label: 'Activate' }] : []),
    ...(status !== 'INACTIVE' ? [{ value: 'Disable', label: 'Disable' }] : []),
    ...(status !== 'DEPRECATED' ? [{ value: 'Deprecate', label: 'Deprecate' }] : []),
  ]

  return (
    <div className="super-admin-runtime-path-registry__row-actions">
      <Select
        size="sm"
        value=""
        placeholder="Actions"
        options={actionOptions}
        disabled={disabled}
        onChange={(event) => {
          const label = event.target.value
          if (label) {
            onAction(label, row)
          }
        }}
        aria-label={`Actions for ${row?.label ?? row?.pathKey ?? 'runtime path'}`}
      />
    </div>
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
  onCreatePath,
  onEditPath,
  onDuplicatePath,
  onActivatePath,
  onDisablePath,
  onDeprecatePath,
  isActionLoading = false,
}) {
  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'Edit') {
        onEditPath(row)
      }

      if (label === 'Duplicate') {
        onDuplicatePath(row)
      }

      if (label === 'Activate') {
        onActivatePath(row)
      }

      if (label === 'Disable') {
        onDisablePath(row)
      }

      if (label === 'Deprecate') {
        onDeprecatePath(row)
      }
    },
    [
      onActivatePath,
      onDeprecatePath,
      onDisablePath,
      onDuplicatePath,
      onEditPath,
    ],
  )

  const columns = useMemo(
    () => [
      {
        key: 'pathKey',
        label: 'Runtime Path',
        mobileLabel: 'Runtime Path',
        width: '26%',
        render: renderPathSummary,
      },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        width: '8%',
        render: (value) => (
          <Status size="sm" showIcon variant={getRuntimePathRegistryStatusVariant(value)}>
            {formatRuntimePathRegistryStatus(value)}
          </Status>
        ),
      },
      {
        key: 'flags',
        label: 'Flags',
        mobileLabel: 'Flags',
        width: '10%',
        render: renderFlagBadges,
      },
      {
        key: 'compatibility',
        label: 'Compatibility',
        mobileLabel: 'Compatibility',
        width: '18%',
        render: renderCompatibilitySummary,
      },
      {
        key: 'scope',
        label: 'Scope',
        mobileLabel: 'Scope',
        width: '10%',
        render: (value) => (
          <span className="super-admin-runtime-path-registry__scope-cell">{value}</span>
        ),
      },
      {
        key: 'schema',
        label: 'Schema',
        mobileLabel: 'Schema',
        width: '18%',
        render: (_value, row) => <SchemaAccordionCell row={row} />,
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        mobileLabel: 'Updated',
        width: '10%',
        render: (value) => <TableDateTime value={value} />,
      },
      {
        key: 'rowActions',
        label: 'Actions',
        mobileLabel: 'Actions',
        align: 'center',
        width: '164px',
        render: (_value, row) => (
          <RuntimePathRowActionsMenu
            row={row}
            onAction={handleRowAction}
            disabled={isActionLoading}
          />
        ),
      },
    ],
    [handleRowAction, isActionLoading],
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
            <Button type="button" variant="primary" size="sm" onClick={onCreatePath}>
              Create
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
