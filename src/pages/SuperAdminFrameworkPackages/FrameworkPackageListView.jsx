import { useCallback, useMemo } from 'react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { RegistryListView } from '../../components/RegistryListView'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { TableDateTime } from '../../components/TableDateTime'
import {
  formatFrameworkPackageStatus,
  FRAMEWORK_PACKAGES_HELP_TEXT,
  FRAMEWORK_PACKAGE_STATUSES,
  FRAMEWORK_PACKAGE_STATUS_OPTIONS,
  getFrameworkPackageStatusVariant,
} from './superAdminFrameworkPackages.constants.js'
import './FrameworkPackageListView.css'

function FrameworkPackageRowActionsMenu({ row, onAction }) {
  const status = String(row.status ?? '').toUpperCase()
  const actionOptions =
    status === FRAMEWORK_PACKAGE_STATUSES.ACTIVE
      ? [
          { value: 'View', label: 'View' },
          { value: 'Clone', label: 'Clone' },
          ...(row.isDefault === false ? [{ value: 'Activate', label: 'Activate' }] : []),
          { value: 'Dependency Snapshot', label: 'Dependency Snapshot' },
          { value: 'Checkpoint History', label: 'Checkpoint History' },
        ]
      : status === FRAMEWORK_PACKAGE_STATUSES.VALIDATED
        ? [
            { value: 'View', label: 'View' },
            { value: 'Clone', label: 'Clone' },
            { value: 'Activate', label: 'Activate' },
          ]
        : status === FRAMEWORK_PACKAGE_STATUSES.DEPRECATED
          ? [
              { value: 'View', label: 'View' },
            ]
        : [
            { value: 'Edit', label: 'Edit' },
          ]

  return (
    <div className="super-admin-framework-packages__row-actions">
      <Select
        size="sm"
        value=""
        placeholder="Actions"
        options={actionOptions}
        onChange={(event) => {
          const label = event.target.value
          if (label) {
            onAction(label, row)
          }
        }}
        aria-label={`Actions for ${row.frameworkKey} ${row.version}`}
      />
    </div>
  )
}

function renderFrameworkSummary(_value, row) {
  return (
    <div className="super-admin-framework-packages__framework-summary">
      <span className="super-admin-framework-packages__framework-name">{row.frameworkName}</span>
      <span className="super-admin-framework-packages__framework-key">{row.frameworkKey}</span>
    </div>
  )
}

function renderWorkflowBindingSummary(value) {
  const items = Array.isArray(value)
    ? value.map((binding) => binding?.policyKey).filter(Boolean)
    : []

  if (items.length === 0) {
    return '--'
  }

  return (
    <div className="super-admin-framework-packages__token-list">
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

function renderBundleSummary(_value, row) {
  const sectionCount = Array.isArray(row.sections) ? row.sections.length : 0
  const validationCount = Array.isArray(row.validationBindings) ? row.validationBindings.length : 0
  const hasUiContract = Boolean(row.uiContractKey)

  return (
    <div className="super-admin-framework-packages__bundle-summary">
      <span>{sectionCount} section{sectionCount === 1 ? '' : 's'}</span>
      <span>{validationCount} validation{validationCount === 1 ? '' : 's'}</span>
      <span>{hasUiContract ? 'UI Contract' : 'No UI Contract'}</span>
    </div>
  )
}

export function FrameworkPackageListView({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  frameworkFilter,
  setFrameworkFilter,
  frameworkOptions,
  setPage,
  rows,
  currentPage,
  totalPages,
  isListLoading,
  isListFetching,
  showPostSaveRefresh = false,
  listAppError,
  onBackClick,
  onCreatePackage,
  onEditPackage,
  onClonePackage,
  activatePackage,
}) {
  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'Edit' || label === 'View') {
        onEditPackage(row)
      }

      if (label === 'Clone') {
        onClonePackage(row)
      }

      if (label === 'Activate') {
        activatePackage(row)
      }

      if (label === 'Dependency Snapshot') {
        onEditPackage(row, 'dependency-snapshot')
      }

      if (label === 'Checkpoint History') {
        onEditPackage(row, 'checkpoint-history')
      }
    },
    [activatePackage, onClonePackage, onEditPackage],
  )

  const columns = useMemo(
    () => [
      {
        key: 'frameworkName',
        label: 'Framework',
        mobileLabel: 'Framework',
        render: renderFrameworkSummary,
      },
      {
        key: 'version',
        label: 'Version',
        mobileLabel: 'Version',
      },
      {
        key: 'status',
        label: 'Lifecycle',
        mobileLabel: 'Lifecycle',
        render: (value) => (
          <Status size="sm" showIcon variant={getFrameworkPackageStatusVariant(value)}>
            {formatFrameworkPackageStatus(value)}
          </Status>
        ),
      },
      {
        key: 'isDefault',
        label: 'Default',
        mobileLabel: 'Default',
        align: 'center',
        render: (value) =>
          value ? (
            <Badge variant="success" size="sm" pill outline>
              Default
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm" pill outline>
              Not default
            </Badge>
          ),
      },
      {
        key: 'workflowBindings',
        label: 'Policies',
        mobileLabel: 'Policies',
        render: renderWorkflowBindingSummary,
      },
      {
        key: 'runtimeBundle',
        label: 'Bundle',
        mobileLabel: 'Bundle',
        render: renderBundleSummary,
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
          <FrameworkPackageRowActionsMenu row={row} onAction={handleRowAction} />
        ),
      },
    ],
    [handleRowAction],
  )
  return (
    <RegistryListView
      block="super-admin-framework-packages"
      legend="Framework package catalogue"
      actions={(
        <>
          <Button type="button" variant="outline" size="sm" onClick={onBackClick}>
            Back
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onCreatePackage}>
            Create
          </Button>
        </>
      )}
      filters={(
        <>
            <Input
              id="framework-package-search"
              label="Search"
              size="sm"
              value={search}
              placeholder="Search by framework, package, section, validation, workflow, or UI contract"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              fullWidth
            />
            <Select
              id="framework-package-status-filter"
              label="Lifecycle"
              size="sm"
              value={statusFilter}
              options={FRAMEWORK_PACKAGE_STATUS_OPTIONS}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="framework-package-framework-filter"
              label="Framework"
              size="sm"
              value={frameworkFilter}
              options={frameworkOptions}
              onChange={(event) => {
                setFrameworkFilter(event.target.value)
                setPage(1)
              }}
            />
        </>
      )}
      error={listAppError}
      tableNote={FRAMEWORK_PACKAGES_HELP_TEXT}
      table={{
        columns,
        data: rows,
        emptyMessage: 'No framework packages found.',
        emptyRefreshMessage: 'Refreshing Framework Packages...',
        ariaLabel: 'Framework packages',
        scrollAriaLabel: 'Framework packages table',
      }}
      status={{
        isLoading: isListLoading,
        isFetching: isListFetching,
        showPostSaveRefresh,
        refreshMessage: 'Refreshing list...',
      }}
      pagination={{
        currentPage,
        totalPages,
        setPage,
        ariaLabel: 'Framework packages pagination',
      }}
    />
  )
}
