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
      <span className="super-admin-agents__agent-name">{row.name}</span>
      <span className="super-admin-agents__agent-key">{row.key}</span>
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
        render: renderAgentSummary,
      },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
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
        render: (value) => renderTokenList(value),
      },
      {
        key: 'defaultSkillIds',
        label: 'Default Skills',
        mobileLabel: 'Default Skills',
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
  const showPostSaveRefreshState = Boolean(showPostSaveRefresh)
  const showInitialSkeleton = isListLoading && !showPostSaveRefreshState

  return (
    <Fieldset className="super-admin-agents__fieldset">
        <Fieldset.Legend className="sr-only">Runtime agent catalogue</Fieldset.Legend>
        <Card variant="elevated" className="super-admin-agents__card">
          <Card.Body className="super-admin-agents__card-body super-admin-agents__card-body--compact">
            <div className="super-admin-agents__catalogue-actions">
              <Button type="button" variant="outline" size="sm" onClick={onBackClick}>
                Back
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={onCreateClick}>
                Create
              </Button>
            </div>

          <div className="super-admin-agents__toolbar">
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
          </div>

          {listAppError ? (
            <p className="super-admin-agents__error" role="alert">
              {listAppError.message}
            </p>
          ) : null}

          <p className="super-admin-agents__table-note">{RUNTIME_AGENTS_HELP_TEXT}</p>

          <HorizontalScroll
            className="super-admin-agents__table-wrap"
            ariaLabel="Runtime agents table"
            gap="sm"
          >
            <Table
              className="super-admin-agents__table"
              columns={columns}
              data={rows}
              loading={showInitialSkeleton}
              variant="striped"
              hoverable
              emptyMessage="No runtime agents found."
              emptyComponent={
                showPostSaveRefreshState ? (
                  <p className="super-admin-agents__muted" role="status">
                    Refreshing Agents...
                  </p>
                ) : undefined
              }
              ariaLabel="Agents"
            />
          </HorizontalScroll>

          {isListFetching && !isListLoading ? (
            <p className="super-admin-agents__muted">Refreshing list...</p>
          ) : null}

          {totalPages > 1 ? (
            <div className="super-admin-agents__pagination" role="navigation" aria-label="Agents pagination">
              <div className="super-admin-agents__pagination-controls">
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

              <p className="super-admin-agents__pagination-info">
                Page {currentPage} of {totalPages}
              </p>

              <div className="super-admin-agents__pagination-controls">
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
