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
  formatRuntimeControlVersionStatus,
  getRuntimeControlVersionStatusVariant,
} from '../SuperAdminRuntimePathRegistry/superAdminRuntimePathRegistry.constants.js'
import {
  formatRuntimeSkillStatus,
  getRuntimeSkillStatusVariant,
  RUNTIME_SKILLS_HELP_TEXT,
  RUNTIME_SKILL_STATUSES,
  RUNTIME_SKILL_STATUS_OPTIONS,
} from './superAdminSkills.constants.js'
import './RuntimeSkillListView.css'

function TruncatedText({ value, className = '', mono = false }) {
  const text = String(value || '--')
  const classes = [
    'super-admin-skills__truncated-text',
    mono ? 'super-admin-skills__truncated-text--mono' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <Tooltip content={text} position="top" align="start" className="super-admin-skills__truncated-tooltip">
      <span className={classes} title={text}>
        {text}
      </span>
    </Tooltip>
  )
}

function RuntimeSkillRowActionsMenu({ row, onAction }) {
  const isLocked = Boolean(row.isLocked)
  const actionOptions = [
    ...(!isLocked ? [{ value: 'Edit', label: 'Edit' }] : []),
    { value: 'Clone', label: 'Clone' },
    ...(!isLocked && row.status !== RUNTIME_SKILL_STATUSES.ACTIVE
      ? [{ value: 'Set Active', label: 'Set Active' }]
      : []),
    ...(!isLocked && row.status !== RUNTIME_SKILL_STATUSES.INACTIVE
      ? [{ value: 'Set Inactive', label: 'Set Inactive' }]
      : []),
    ...(!isLocked && row.status !== RUNTIME_SKILL_STATUSES.DEPRECATED
      ? [{ value: 'Set Deprecated', label: 'Set Deprecated' }]
      : []),
  ]

  return (
    <div className="super-admin-skills__row-actions">
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

function renderSkillSummary(_value, row) {
  return (
    <div className="super-admin-skills__skill-summary">
      <TruncatedText value={row.name || '--'} className="super-admin-skills__skill-name" />
      <TruncatedText value={row.key || '--'} className="super-admin-skills__skill-key" mono />
    </div>
  )
}

function renderVersionSummary(_value, row) {
  const componentVersion = Number(row.componentVersion ?? 1) || 1
  const versionStatus = row.versionStatus ?? row.status

  return (
    <div className="super-admin-skills__version-summary">
      <span className="super-admin-skills__version-text">v{componentVersion}</span>
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

function renderFrameworkTokens(value) {
  const items = Array.isArray(value) ? value : []

  if (items.length === 0) {
    return '--'
  }

  return (
    <div className="super-admin-skills__token-list">
      {items.map((item) => (
        <Badge key={item} variant="info" size="sm" pill outline>
          {item}
        </Badge>
      ))}
    </div>
  )
}

export function RuntimeSkillListView({
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
  setSkillStatus,
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
        setSkillStatus(row, RUNTIME_SKILL_STATUSES.ACTIVE)
      }

      if (label === 'Set Inactive') {
        setSkillStatus(row, RUNTIME_SKILL_STATUSES.INACTIVE)
      }

      if (label === 'Set Deprecated') {
        setSkillStatus(row, RUNTIME_SKILL_STATUSES.DEPRECATED)
      }
    },
    [onCloneClick, onEditClick, setSkillStatus],
  )

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Skill',
        mobileLabel: 'Skill',
        width: '300px',
        render: renderSkillSummary,
      },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        width: '112px',
        render: (value) => (
          <Status size="sm" showIcon variant={getRuntimeSkillStatusVariant(value)}>
            {formatRuntimeSkillStatus(value)}
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
        render: renderFrameworkTokens,
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
        render: (_value, row) => <RuntimeSkillRowActionsMenu row={row} onAction={handleRowAction} />,
      },
    ],
    [handleRowAction],
  )
  return (
    <RegistryListView
      block="super-admin-skills"
      legend="Runtime skill catalogue"
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
              id="runtime-skill-search"
              label="Search"
              size="sm"
              value={search}
              placeholder="Search by key, name, or framework"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              fullWidth
            />
            <Select
              id="runtime-skill-status-filter"
              label="Status"
              size="sm"
              value={statusFilter}
              options={RUNTIME_SKILL_STATUS_OPTIONS}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="runtime-skill-framework-filter"
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
      tableNote={RUNTIME_SKILLS_HELP_TEXT}
      table={{
        columns,
        data: rows,
        emptyMessage: 'No runtime skills found.',
        ariaLabel: 'Skills',
        scrollAriaLabel: 'Runtime skills table',
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
        ariaLabel: 'Skills pagination',
      }}
    />
  )
}
