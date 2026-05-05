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
import { Tooltip } from '../../components/Tooltip'
import {
  formatRuntimeControlVersionStatus,
  getRuntimeControlVersionStatusVariant,
} from '../SuperAdminRuntimePathRegistry/superAdminRuntimePathRegistry.constants.js'
import {
  formatValidationRegistryStatus,
  getValidationRegistryStatusVariant,
  VALIDATION_REGISTRY_CATEGORY_OPTIONS,
  VALIDATION_REGISTRY_HELP_TEXT,
  VALIDATION_REGISTRY_SEVERITY_OPTIONS,
  VALIDATION_REGISTRY_STATUS_OPTIONS,
  VALIDATION_REGISTRY_STATUSES,
} from './superAdminValidationRegistry.constants.js'
import './ValidationRegistryListView.css'

function TruncatedText({ value, className = '', mono = false }) {
  const text = String(value || '--')
  const classes = [
    'super-admin-validation-registry__truncated-text',
    mono ? 'super-admin-validation-registry__truncated-text--mono' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <Tooltip content={text} position="top" align="start" className="super-admin-validation-registry__truncated-tooltip">
      <span className={classes} title={text}>
        {text}
      </span>
    </Tooltip>
  )
}

function ValidationRowActionsMenu({ row, onAction, disabled = false }) {
  const isLocked = Boolean(row.isLocked)
  const actionOptions = [
    ...(!isLocked ? [{ value: 'Edit', label: 'Edit' }] : []),
    { value: 'Clone', label: 'Clone' },
    ...(!isLocked && row.status !== VALIDATION_REGISTRY_STATUSES.ACTIVE
      ? [{ value: 'Set Active', label: 'Set Active' }]
      : []),
    ...(!isLocked && row.status !== VALIDATION_REGISTRY_STATUSES.INACTIVE
      ? [{ value: 'Set Inactive', label: 'Set Inactive' }]
      : []),
    ...(!isLocked && row.status !== VALIDATION_REGISTRY_STATUSES.DEPRECATED
      ? [{ value: 'Set Deprecated', label: 'Set Deprecated' }]
      : []),
  ]

  return (
    <div className="super-admin-validation-registry__row-actions">
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
        aria-label={`Actions for ${row.key}`}
      />
    </div>
  )
}

function renderValidationSummary(_value, row) {
  return (
    <div className="super-admin-validation-registry__validation-summary">
      <TruncatedText value={row.label || '--'} className="super-admin-validation-registry__validation-label" />
      <TruncatedText value={row.key || '--'} className="super-admin-validation-registry__validation-key" mono />
    </div>
  )
}

function renderVersionSummary(_value, row) {
  const componentVersion = Number(row.componentVersion ?? row.version ?? 1) || 1
  const versionStatus = row.versionStatus ?? row.status

  return (
    <div className="super-admin-validation-registry__version-summary">
      <span className="super-admin-validation-registry__version-text">v{componentVersion}</span>
      <Status
        size="sm"
        showIcon
        variant={getRuntimeControlVersionStatusVariant(versionStatus)}
      >
        {formatRuntimeControlVersionStatus(versionStatus)}
      </Status>
      {row.isLocked ? (
        <Badge variant="warning" size="sm" pill outline>
          Locked
        </Badge>
      ) : null}
    </div>
  )
}

export function ValidationRegistryListView({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  frameworkFilter,
  setFrameworkFilter,
  categoryFilter,
  setCategoryFilter,
  severityFilter,
  setSeverityFilter,
  setPage,
  rows,
  currentPage,
  totalPages,
  isListLoading,
  isListFetching,
  showPostSaveRefresh = false,
  listAppError,
  frameworks = [],
  onBackClick,
  onCreateClick,
  onEditClick,
  onCloneClick,
  setValidationStatus,
  isMutating,
}) {
  const handleRowAction = useCallback((label, row) => {
    if (label === 'Edit') {
      onEditClick(row)
    }

    if (label === 'Clone') {
      onCloneClick(row)
    }

    if (label === 'Set Active') {
      setValidationStatus(row, VALIDATION_REGISTRY_STATUSES.ACTIVE)
    }

    if (label === 'Set Inactive') {
      setValidationStatus(row, VALIDATION_REGISTRY_STATUSES.INACTIVE)
    }

    if (label === 'Set Deprecated') {
      setValidationStatus(row, VALIDATION_REGISTRY_STATUSES.DEPRECATED)
    }
  }, [onCloneClick, onEditClick, setValidationStatus])

  const columns = useMemo(() => [
    {
      key: 'key',
      label: 'Validation',
      mobileLabel: 'Validation',
      width: '300px',
      render: renderValidationSummary,
    },
    {
      key: 'supportedFrameworkKeys',
      label: 'Frameworks',
      mobileLabel: 'Frameworks',
      align: 'center',
      width: '200px',
      render: (value) => (
        <div className="super-admin-validation-registry__framework-badges">
          {(Array.isArray(value) ? value : []).slice(0, 3).map((frameworkKey) => (
            <Badge key={frameworkKey} variant="neutral" size="sm" pill>
              {frameworkKey}
            </Badge>
          ))}
          {(Array.isArray(value) ? value.length : 0) > 3 ? (
            <Badge variant="info" size="sm" pill>
              +{value.length - 3}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      mobileLabel: 'Category',
      width: '160px',
      render: (value) => <TruncatedText value={value || '--'} className="super-admin-validation-registry__table-token" />,
    },
    {
      key: 'severity',
      label: 'Severity',
      mobileLabel: 'Severity',
      width: '160px',
      render: (value) => <TruncatedText value={value || '--'} className="super-admin-validation-registry__table-token" />,
    },
    {
      key: 'status',
      label: 'Status',
      mobileLabel: 'Status',
      align: 'center',
      width: '140px',
      render: (value) => (
        <Status size="sm" showIcon variant={getValidationRegistryStatusVariant(value)}>
          {formatValidationRegistryStatus(value)}
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
      key: 'updatedAt',
      label: 'Updated',
      mobileLabel: 'Updated',
      width: '156px',
      render: (value) => <TableDateTime value={value} />,
    },
    {
      key: 'rowActions',
      label: 'Actions',
      mobileLabel: 'Actions',
      align: 'center',
      width: '164px',
      render: (_value, row) => (
        <ValidationRowActionsMenu row={row} onAction={handleRowAction} disabled={isMutating} />
      ),
    },
  ], [handleRowAction, isMutating])
  const showPostSaveRefreshState = Boolean(showPostSaveRefresh)
  const showInitialSkeleton = isListLoading && !showPostSaveRefreshState

  return (
    <Fieldset className="super-admin-validation-registry__fieldset">
      <Fieldset.Legend className="sr-only">Validation registry catalogue</Fieldset.Legend>
      <Card variant="elevated" className="super-admin-validation-registry__card">
        <Card.Body className="super-admin-validation-registry__card-body super-admin-validation-registry__card-body--compact">
          <div className="super-admin-validation-registry__catalogue-actions">
            <Button type="button" variant="outline" size="sm" onClick={onBackClick}>
              Back
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={onCreateClick}>
              Create
            </Button>
          </div>

          <div className="super-admin-validation-registry__toolbar">
            <Input
              id="validation-registry-search"
              label="Search"
              size="sm"
              value={search}
              placeholder="Search by key, label, or description"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              fullWidth
            />
            <Select
              id="validation-registry-status-filter"
              label="Status"
              size="sm"
              value={statusFilter}
              options={VALIDATION_REGISTRY_STATUS_OPTIONS}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="validation-registry-framework-filter"
              label="Framework"
              size="sm"
              value={frameworkFilter}
              options={frameworks}
              onChange={(event) => {
                setFrameworkFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="validation-registry-category-filter"
              label="Category"
              size="sm"
              value={categoryFilter}
              options={VALIDATION_REGISTRY_CATEGORY_OPTIONS}
              onChange={(event) => {
                setCategoryFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="validation-registry-severity-filter"
              label="Severity"
              size="sm"
              value={severityFilter}
              options={VALIDATION_REGISTRY_SEVERITY_OPTIONS}
              onChange={(event) => {
                setSeverityFilter(event.target.value)
                setPage(1)
              }}
            />
          </div>

          {listAppError ? (
            <p className="super-admin-validation-registry__error" role="alert">
              {listAppError.message}
            </p>
          ) : null}

          <p className="super-admin-validation-registry__table-note">{VALIDATION_REGISTRY_HELP_TEXT}</p>

          <HorizontalScroll
            className="super-admin-validation-registry__table-wrap"
            ariaLabel="Validation registry table"
            gap="sm"
          >
            <Table
              className="super-admin-validation-registry__table"
              columns={columns}
              data={rows}
              loading={showInitialSkeleton}
              variant="striped"
              hoverable
              emptyMessage="No validations found."
              emptyComponent={
                showPostSaveRefreshState ? (
                  <p className="super-admin-validation-registry__muted" role="status">
                    Refreshing Validation Registry...
                  </p>
                ) : undefined
              }
              ariaLabel="Validation Registry"
            />
          </HorizontalScroll>

          {isListFetching && !isListLoading ? (
            <p className="super-admin-validation-registry__muted">Refreshing list...</p>
          ) : null}

          {totalPages > 1 ? (
            <div className="super-admin-validation-registry__pagination" role="navigation" aria-label="Validation registry pagination">
              <div className="super-admin-validation-registry__pagination-controls">
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
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isListFetching}
                  onClick={() => setPage(currentPage + 1)}
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

              <div className="super-admin-validation-registry__pagination-info">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          ) : null}
        </Card.Body>
      </Card>
    </Fieldset>
  )
}

