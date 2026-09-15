import { useCallback, useMemo } from 'react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { RegistryListView } from '../../components/RegistryListView'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { TableDateTime } from '../../components/TableDateTime'
import {
  formatRuntimeControlVersionStatus,
  getRuntimeControlVersionStatusVariant,
} from '../SuperAdminRuntimePathRegistry/superAdminRuntimePathRegistry.constants.js'
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
  const isLocked = Boolean(row.isLocked)
  const actionOptions = [
    ...(!isLocked ? [{ value: 'Edit', label: 'Edit' }] : []),
    { value: 'Clone', label: 'Clone' },
    ...(!isLocked
      ? (row.status === WORKFLOW_POLICY_STATUSES.ACTIVE
          ? [{ value: 'Set Inactive', label: 'Set Inactive' }]
          : [{ value: 'Set Active', label: 'Set Active' }])
      : []),
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

function renderVersionSummary(_value, row) {
  const componentVersion = Number(row.componentVersion ?? 1)
  const versionStatus = row.versionStatus ?? row.status

  return (
    <div className="super-admin-workflow-policies__version-summary">
      <span className="super-admin-workflow-policies__version-text">v{componentVersion}</span>
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
  onCloneClick,
  setWorkflowPolicyStatus,
}) {
  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'Edit') {
        onEditClick(row)
      }

      if (label === 'Clone') {
        onCloneClick(row)
      }

      if (label === 'Set Active') {
        setWorkflowPolicyStatus(row, WORKFLOW_POLICY_STATUSES.ACTIVE)
      }

      if (label === 'Set Inactive') {
        setWorkflowPolicyStatus(row, WORKFLOW_POLICY_STATUSES.INACTIVE)
      }
    },
    [onCloneClick, onEditClick, setWorkflowPolicyStatus],
  )

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Policy',
        mobileLabel: 'Policy',
        width: '260px',
        render: renderPolicySummary,
      },
      {
        key: 'policyType',
        label: 'Type',
        mobileLabel: 'Type',
        width: '156px',
        render: renderType,
      },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        width: '112px',
        render: (value) => (
          <Status size="sm" showIcon variant={getWorkflowPolicyStatusVariant(value)}>
            {formatWorkflowPolicyStatus(value)}
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
        key: 'frameworkKeys',
        label: 'Frameworks',
        mobileLabel: 'Frameworks',
        width: '160px',
        render: renderFrameworkList,
      },
      {
        key: 'triggerSummary',
        label: 'Trigger',
        mobileLabel: 'Trigger',
        width: '180px',
        render: renderTriggerSummary,
      },
      {
        key: 'actionSummary',
        label: 'Action Governance',
        mobileLabel: 'Action',
        width: '180px',
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
  return (
    <RegistryListView
      block="super-admin-workflow-policies"
      legend="Workflow policy catalogue"
      actions={(
        <>
          <Button type="button" variant="outline" size="sm" onClick={onBackClick}>
            Back
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onCreateClick}>
            Create
          </Button>
        </>
      )}
      filters={(
        <>
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
        </>
      )}
      error={listAppError}
      tableNote={WORKFLOW_POLICIES_HELP_TEXT}
      table={{
        columns,
        data: rows,
        emptyMessage: 'No workflow policies found.',
        ariaLabel: 'Workflow Policies',
        scrollAriaLabel: 'Workflow policies table',
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
        ariaLabel: 'Workflow Policies pagination',
      }}
    />
  )
}
