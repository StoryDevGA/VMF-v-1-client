import { useCallback, useMemo } from 'react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { RegistryListView } from '../../components/RegistryListView'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { TableDateTime } from '../../components/TableDateTime'
import { Tooltip } from '../../components/Tooltip'
import {
  formatRuntimeAgentStatus,
  getRuntimeAgentStatusVariant,
  RUNTIME_AGENTS_HELP_TEXT,
  RUNTIME_AGENT_STATUSES,
  RUNTIME_AGENT_STATUS_OPTIONS,
} from './superAdminAgents.constants.js'
import {
  formatRuntimeControlVersionStatus,
  getRuntimeControlVersionStatusVariant,
} from '../SuperAdminRuntimePathRegistry/superAdminRuntimePathRegistry.constants.js'
import './RuntimeAgentListView.css'

function TruncatedText({ value, className = '', mono = false }) {
  const text = String(value || '--')
  const classes = [
    'super-admin-agents__truncated-text',
    mono ? 'super-admin-agents__truncated-text--mono' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <Tooltip content={text} position="top" align="start" className="super-admin-agents__truncated-tooltip">
      <span className={classes} title={text}>
        {text}
      </span>
    </Tooltip>
  )
}

function RuntimeAgentRowActionsMenu({ row, onAction }) {
  const isLocked = Boolean(row.isLocked)
  const actionOptions = [
    ...(!isLocked ? [{ value: 'Edit', label: 'Edit' }] : []),
    { value: 'Clone', label: 'Clone' },
    ...(!isLocked ? [{ value: 'Validate', label: 'Validate' }] : []),
    ...(!isLocked ? [{ value: 'Test', label: 'Test' }] : []),
    ...(!isLocked && row.status !== RUNTIME_AGENT_STATUSES.DEPRECATED
      ? [{ value: 'Deprecate', label: 'Deprecate' }]
      : []),
    ...(!isLocked
      ? (row.status === RUNTIME_AGENT_STATUSES.ACTIVE
        ? [{ value: 'Set Inactive', label: 'Set Inactive' }]
        : [{ value: 'Set Active', label: 'Set Active' }])
      : []),
  ]

  return (
    <div className="super-admin-agents__row-actions">
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

function renderVersionSummary(_value, row) {
  const componentVersion = Number(row.componentVersion ?? 1) || 1
  const versionStatus = row.versionStatus ?? row.status

  return (
    <div className="super-admin-agents__version-summary">
      <span className="super-admin-agents__version-text">v{componentVersion}</span>
      <Status size="sm" showIcon variant={getRuntimeControlVersionStatusVariant(versionStatus)}>
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

function renderAgentSummary(_value, row) {
  return (
    <div className="super-admin-agents__agent-summary">
      <TruncatedText value={row.name || '--'} className="super-admin-agents__agent-name" />
      <TruncatedText value={row.key || '--'} className="super-admin-agents__agent-key" mono />
    </div>
  )
}

function renderTokenList(value, emptyMessage = '--') {
  const items = Array.isArray(value) ? value : []

  if (items.length === 0) {
    return emptyMessage
  }

  return (
    <div className="super-admin-agents__token-list">
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

export function RuntimeAgentListView({
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
  onCreateClick,
  onEditClick,
  onCloneClick,
  setAgentStatus,
  validateAgent,
  openTestDialog,
}) {
  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'Edit') {
        onEditClick(row)
      }

      if (label === 'Clone') {
        onCloneClick(row)
      }

      if (label === 'Validate') {
        validateAgent(row)
      }

      if (label === 'Test') {
        openTestDialog(row)
      }

      if (label === 'Set Active') {
        setAgentStatus(row, RUNTIME_AGENT_STATUSES.ACTIVE)
      }

      if (label === 'Set Inactive') {
        setAgentStatus(row, RUNTIME_AGENT_STATUSES.INACTIVE)
      }

      if (label === 'Deprecate') {
        setAgentStatus(row, RUNTIME_AGENT_STATUSES.DEPRECATED)
      }
    },
    [onCloneClick, onEditClick, openTestDialog, setAgentStatus, validateAgent],
  )

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Agent',
        mobileLabel: 'Agent',
        width: '300px',
        render: renderAgentSummary,
      },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        width: '112px',
        render: (value) => (
          <Status size="sm" showIcon variant={getRuntimeAgentStatusVariant(value)}>
            {formatRuntimeAgentStatus(value)}
          </Status>
        ),
      },
      {
        key: 'componentVersion',
        label: 'Version',
        mobileLabel: 'Version',
        width: '136px',
        render: renderVersionSummary,
      },
      {
        key: 'supportedFrameworkKeys',
        label: 'Frameworks',
        mobileLabel: 'Frameworks',
        width: '160px',
        render: (value) => renderTokenList(value),
      },
      {
        key: 'defaultSkillIds',
        label: 'Default Skills',
        mobileLabel: 'Default Skills',
        width: '240px',
        render: (value) => renderTokenList(value),
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
        render: (_value, row) => <RuntimeAgentRowActionsMenu row={row} onAction={handleRowAction} />,
      },
    ],
    [handleRowAction],
  )
  return (
    <RegistryListView
      block="super-admin-agents"
      legend="Runtime agent catalogue"
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
              id="runtime-agent-search"
              label="Search"
              size="sm"
              value={search}
              placeholder="Search by key, name, framework, or skill"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              fullWidth
            />
            <Select
              id="runtime-agent-status-filter"
              label="Status"
              size="sm"
              value={statusFilter}
              options={RUNTIME_AGENT_STATUS_OPTIONS}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="runtime-agent-framework-filter"
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
      tableNote={RUNTIME_AGENTS_HELP_TEXT}
      table={{
        columns,
        data: rows,
        emptyMessage: 'No runtime agents found.',
        ariaLabel: 'Agents',
        scrollAriaLabel: 'Runtime agents table',
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
        ariaLabel: 'Agents pagination',
      }}
    />
  )
}
