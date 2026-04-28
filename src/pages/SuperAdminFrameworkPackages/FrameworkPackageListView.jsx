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
  formatFrameworkPackageStatus,
  FRAMEWORK_PACKAGES_HELP_TEXT,
  FRAMEWORK_PACKAGE_STATUSES,
  FRAMEWORK_PACKAGE_STATUS_OPTIONS,
  getFrameworkPackageStatusVariant,
} from './superAdminFrameworkPackages.constants.js'
import './FrameworkPackageListView.css'

function FrameworkPackageRowActionsMenu({ row, onAction }) {
  const actionOptions = [
    { value: 'Edit', label: 'Edit' },
    ...(row.status === FRAMEWORK_PACKAGE_STATUSES.VALIDATED
      ? [{ value: 'Activate', label: 'Activate' }]
      : []),
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

function renderCompatibilitySummary(value) {
  const items = Array.isArray(value) ? value : []

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
  return (
    <div className="super-admin-framework-packages__bundle-summary">
      <span>{row.defaultAgentIds.length} agent{row.defaultAgentIds.length === 1 ? '' : 's'}</span>
      <span>{row.requiredSkillIds.length} skill{row.requiredSkillIds.length === 1 ? '' : 's'}</span>
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
  listAppError,
  onBackClick,
  onCreatePackage,
  onEditPackage,
  activatePackage,
}) {
  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'Edit') {
        onEditPackage(row)
      }

      if (label === 'Activate') {
        activatePackage(row)
      }
    },
    [activatePackage, onEditPackage],
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
        key: 'compatibleWorkflowKeys',
        label: 'Workflows',
        mobileLabel: 'Workflows',
        render: renderCompatibilitySummary,
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
    <Fieldset className="super-admin-framework-packages__fieldset">
        <Fieldset.Legend className="sr-only">Framework package catalogue</Fieldset.Legend>
        <Card variant="elevated" className="super-admin-framework-packages__card">
          <Card.Body className="super-admin-framework-packages__card-body super-admin-framework-packages__card-body--compact">
            <div className="super-admin-framework-packages__catalogue-actions">
              <Button type="button" variant="outline" size="sm" onClick={onBackClick}>
                Back
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={onCreatePackage}>
                Create
              </Button>
            </div>

          <div className="super-admin-framework-packages__toolbar">
            <Input
              id="framework-package-search"
              label="Search"
              size="sm"
              value={search}
              placeholder="Search by framework, version, workflow, agent, or skill"
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
          </div>

          {listAppError ? (
            <p className="super-admin-framework-packages__error" role="alert">
              {listAppError.message}
            </p>
          ) : null}

          <p className="super-admin-framework-packages__table-note">
            {FRAMEWORK_PACKAGES_HELP_TEXT}
          </p>

          <HorizontalScroll
            className="super-admin-framework-packages__table-wrap"
            ariaLabel="Framework packages table"
            gap="sm"
          >
            <Table
              className="super-admin-framework-packages__table"
              columns={columns}
              data={rows}
              loading={isListLoading}
              variant="striped"
              hoverable
              emptyMessage="No framework packages found."
              ariaLabel="Framework packages"
            />
          </HorizontalScroll>

          {isListFetching && !isListLoading ? (
            <p className="super-admin-framework-packages__muted">Refreshing list...</p>
          ) : null}

          {totalPages > 1 ? (
            <div
              className="super-admin-framework-packages__pagination"
              role="navigation"
              aria-label="Framework packages pagination"
            >
              <div className="super-admin-framework-packages__pagination-controls">
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

              <p className="super-admin-framework-packages__pagination-info">
                Page {currentPage} of {totalPages}
              </p>

              <div className="super-admin-framework-packages__pagination-controls">
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
