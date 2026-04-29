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
  formatWorkflowPolicyEnumLabel,
  formatWorkflowPolicyStatus,
  formatWorkflowPolicyType,
  getWorkflowPolicyStatusVariant,
  WORKFLOW_POLICIES_HELP_TEXT,
  WORKFLOW_POLICY_STATUSES,
  WORKFLOW_POLICY_STATUS_OPTIONS,
  WORKFLOW_POLICY_TYPE_OPTIONS,
} from './superAdminWorkflowPolicies.constants.js'
import './WorkflowPolicyListView.css'

function WorkflowPolicyRowActionsMenu({ row, onAction }) {
  const actionOptions = [
    { value: 'Edit', label: 'Edit' },
    ...(row.status === WORKFLOW_POLICY_STATUSES.ACTIVE
      ? [{ value: 'Set Inactive', label: 'Set Inactive' }]
      : [{ value: 'Set Active', label: 'Set Active' }]),
  ]

  return (
    <div className="super-admin-workflow-policies__row-actions">
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
        aria-label={`Actions for ${row.name}`}
      />
    </div>
  )
}

function renderPolicySummary(_value, row) {
  return (
    <div className="super-admin-workflow-policies__policy-summary">
      <span className="super-admin-workflow-policies__policy-name">{row.name}</span>
      <span className="super-admin-workflow-policies__policy-key">{row.key}</span>
    </div>
  )
}

function renderFrameworkList(value) {
  const items = Array.isArray(value) ? value : []

  if (items.length === 0) {
    return '--'
  }

  return (
    <div className="super-admin-workflow-policies__token-list">
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

function renderType(value) {
  if (!value) return '--'

  return (
    <Badge variant="primary" size="sm" pill outline>
      {formatWorkflowPolicyType(value)}
    </Badge>
  )
}

function renderTriggerSummary(_value, row) {
  const pieces = [row.triggerEvent, row.triggerMode]
    .filter(Boolean)
    .map((item) => formatWorkflowPolicyEnumLabel(item))

  if (pieces.length === 0) {
    return '--'
  }

  return (
    <div className="super-admin-workflow-policies__dependency-summary">
      {pieces.map((piece) => (
        <span key={piece}>{piece}</span>
      ))}
    </div>
  )
}

function renderActionSummary(_value, row) {
  return (
    <div className="super-admin-workflow-policies__dependency-summary">
      <span>{formatWorkflowPolicyEnumLabel(row.governedAction) || '--'}</span>
      <span>{formatWorkflowPolicyEnumLabel(row.decisionMode) || '--'}</span>
    </div>
  )
}

export function WorkflowPolicyListView({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  frameworkFilter,
  setFrameworkFilter,
  typeFilter,
  setTypeFilter,
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
  onCreateClick,
  onEditClick,
  setWorkflowPolicyStatus,
}) {
  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'Edit') {
        onEditClick(row)
      }

      if (label === 'Set Active') {
        setWorkflowPolicyStatus(row, WORKFLOW_POLICY_STATUSES.ACTIVE)
      }

      if (label === 'Set Inactive') {
        setWorkflowPolicyStatus(row, WORKFLOW_POLICY_STATUSES.INACTIVE)
      }
    },
    [onEditClick, setWorkflowPolicyStatus],
  )

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Policy',
        mobileLabel: 'Policy',
        render: renderPolicySummary,
      },
      {
        key: 'policyType',
        label: 'Type',
        mobileLabel: 'Type',
        render: renderType,
      },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        render: (value) => (
          <Status size="sm" showIcon variant={getWorkflowPolicyStatusVariant(value)}>
            {formatWorkflowPolicyStatus(value)}
          </Status>
        ),
      },
      {
        key: 'frameworkKeys',
        label: 'Frameworks',
        mobileLabel: 'Frameworks',
        render: renderFrameworkList,
      },
      {
        key: 'triggerSummary',
        label: 'Trigger',
        mobileLabel: 'Trigger',
        render: renderTriggerSummary,
      },
      {
        key: 'actionSummary',
        label: 'Action Governance',
        mobileLabel: 'Action',
        render: renderActionSummary,
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
          <WorkflowPolicyRowActionsMenu row={row} onAction={handleRowAction} />
        ),
      },
    ],
    [handleRowAction],
  )
  const showPostSaveRefreshState = Boolean(showPostSaveRefresh)
  const showInitialSkeleton = isListLoading && !showPostSaveRefreshState

  return (
    <Fieldset className="super-admin-workflow-policies__fieldset">
      <Fieldset.Legend className="sr-only">Workflow policy catalogue</Fieldset.Legend>
      <Card variant="elevated" className="super-admin-workflow-policies__card">
        <Card.Body className="super-admin-workflow-policies__card-body super-admin-workflow-policies__card-body--compact">
          <div className="super-admin-workflow-policies__catalogue-actions">
            <Button type="button" variant="outline" size="sm" onClick={onBackClick}>
              Back
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={onCreateClick}>
              Create
            </Button>
          </div>

          <div className="super-admin-workflow-policies__toolbar">
            <Input
              id="workflow-policy-search"
              label="Search"
              size="sm"
              value={search}
              placeholder="Search by policy, trigger, or action"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              fullWidth
            />
            <Select
              id="workflow-policy-status-filter"
              label="Status"
              size="sm"
              value={statusFilter}
              options={WORKFLOW_POLICY_STATUS_OPTIONS}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="workflow-policy-type-filter"
              label="Policy Type"
              size="sm"
              value={typeFilter}
              options={WORKFLOW_POLICY_TYPE_OPTIONS}
              onChange={(event) => {
                setTypeFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="workflow-policy-framework-filter"
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
            <p className="super-admin-workflow-policies__error" role="alert">
              {listAppError.message}
            </p>
          ) : null}

          <p className="super-admin-workflow-policies__table-note">{WORKFLOW_POLICIES_HELP_TEXT}</p>

          <HorizontalScroll
            className="super-admin-workflow-policies__table-wrap"
            ariaLabel="Workflow policies table"
            gap="sm"
          >
            <Table
              className="super-admin-workflow-policies__table"
              columns={columns}
              data={rows}
              loading={showInitialSkeleton}
              variant="striped"
              hoverable
              emptyMessage="No workflow policies found."
              emptyComponent={
                showPostSaveRefreshState ? (
                  <p className="super-admin-workflow-policies__muted" role="status">
                    Refreshing Workflow Policies...
                  </p>
                ) : undefined
              }
              ariaLabel="Workflow Policies"
            />
          </HorizontalScroll>

          {isListFetching && !isListLoading ? (
            <p className="super-admin-workflow-policies__muted">Refreshing list...</p>
          ) : null}

          {totalPages > 1 ? (
            <div
              className="super-admin-workflow-policies__pagination"
              role="navigation"
              aria-label="Workflow Policies pagination"
            >
              <div className="super-admin-workflow-policies__pagination-controls">
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

              <p className="super-admin-workflow-policies__pagination-info">
                Page {currentPage} of {totalPages}
              </p>

              <div className="super-admin-workflow-policies__pagination-controls">
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
