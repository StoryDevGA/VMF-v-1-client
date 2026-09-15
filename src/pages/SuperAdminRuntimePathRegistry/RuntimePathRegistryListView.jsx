import { useCallback, useMemo } from 'react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Accordion } from '../../components/Accordion'
import { Input } from '../../components/Input'
import { RegistryListView } from '../../components/RegistryListView'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { TableDateTime } from '../../components/TableDateTime'
import {
  RUNTIME_PATH_REGISTRY_HELP_TEXT,
  RUNTIME_PATH_REGISTRY_OPERATION_OPTIONS,
  RUNTIME_PATH_REGISTRY_PROTECTED_OPTIONS,
  RUNTIME_PATH_REGISTRY_STATUS_OPTIONS,
  formatRuntimePathRegistryStatus,
  formatRuntimeControlVersionStatus,
  getRuntimeControlVersionStatusVariant,
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

function renderVersionSummary(_value, row) {
  const componentVersion = Number(row?.componentVersion) || 1
  const versionStatus = row?.versionStatus || ''
  const isLocked = Boolean(row?.isLocked)

  return (
    <div className="super-admin-runtime-path-registry__version-summary">
      <span className="super-admin-runtime-path-registry__version-number">
        v{componentVersion}
      </span>
      {versionStatus ? (
        <Status size="sm" showIcon variant={getRuntimeControlVersionStatusVariant(versionStatus)}>
          {formatRuntimeControlVersionStatus(versionStatus)}
        </Status>
      ) : null}
      {isLocked ? (
        <Badge variant="warning" size="sm" pill outline>
          Locked
        </Badge>
      ) : null}
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
    { value: 'Clone', label: 'Clone' },
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
  showPostSaveRefresh = false,
  listAppError,
  onBackClick,
  onCreatePath,
  onEditPath,
  onClonePath,
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

      if (label === 'Clone') {
        onClonePath(row)
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
      onClonePath,
      onEditPath,
    ],
  )

  const columns = useMemo(
    () => [
      {
        key: 'pathKey',
        label: 'Runtime Path',
        mobileLabel: 'Runtime Path',
        width: '300px',
        render: renderPathSummary,
      },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        width: '112px',
        render: (value) => (
          <Status size="sm" showIcon variant={getRuntimePathRegistryStatusVariant(value)}>
            {formatRuntimePathRegistryStatus(value)}
          </Status>
        ),
      },
      {
        key: 'version',
        label: 'Version',
        mobileLabel: 'Version',
        width: '136px',
        render: renderVersionSummary,
      },
      {
        key: 'flags',
        label: 'Flags',
        mobileLabel: 'Flags',
        width: '128px',
        render: renderFlagBadges,
      },
      {
        key: 'compatibility',
        label: 'Compatibility',
        mobileLabel: 'Compatibility',
        width: '208px',
        render: renderCompatibilitySummary,
      },
      {
        key: 'scope',
        label: 'Scope',
        mobileLabel: 'Scope',
        width: '164px',
        render: (value) => (
          <span className="super-admin-runtime-path-registry__scope-cell">{value}</span>
        ),
      },
      {
        key: 'schema',
        label: 'Schema',
        mobileLabel: 'Schema',
        width: '220px',
        render: (_value, row) => <SchemaAccordionCell row={row} />,
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        mobileLabel: 'Updated',
        width: '132px',
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
    <RegistryListView
      block="super-admin-runtime-path-registry"
      legend="Runtime path registry catalogue"
      actions={(
        <>
          <Button type="button" variant="outline" size="sm" onClick={onBackClick}>
            Back
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onCreatePath}>
            Create
          </Button>
        </>
      )}
      filters={(
        <>
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
        </>
      )}
      error={listAppError}
      tableNote={RUNTIME_PATH_REGISTRY_HELP_TEXT}
      table={{
        columns,
        data: rows,
        emptyMessage: 'No runtime paths found.',
        ariaLabel: 'Runtime Paths',
        scrollAriaLabel: 'Runtime paths table',
      }}
      status={{
        isLoading: isListLoading,
        isFetching: isListFetching,
        showPostSaveRefresh,
      }}
      pagination={{
        currentPage,
        totalPages,
        setPage,
        ariaLabel: 'Runtime paths pagination',
      }}
    />
  )
}
