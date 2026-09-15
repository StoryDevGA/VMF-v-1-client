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
  formatSkillRoleRegistryStatus,
  getSkillRoleRegistryStatusVariant,
  SKILL_ROLE_REGISTRY_HELP_TEXT,
  SKILL_ROLE_REGISTRY_SORT_OPTIONS,
  SKILL_ROLE_REGISTRY_STATUS_OPTIONS,
  SKILL_ROLE_REGISTRY_STATUSES,
} from './superAdminSkillRoleRegistry.constants.js'
import './SkillRoleRegistryListView.css'

function SkillRoleRowActionsMenu({ row, onAction, disabled = false }) {
  const isLocked = Boolean(row.isLocked)
  const actionOptions = [
    ...(!isLocked ? [{ value: 'Edit', label: 'Edit' }] : []),
    { value: 'Clone', label: 'Clone' },
    ...(!isLocked && row.status !== SKILL_ROLE_REGISTRY_STATUSES.ACTIVE
      ? [{ value: 'Set Active', label: 'Set Active' }]
      : []),
    ...(!isLocked && row.status !== SKILL_ROLE_REGISTRY_STATUSES.INACTIVE
      ? [{ value: 'Set Inactive', label: 'Set Inactive' }]
      : []),
    ...(!isLocked && row.status !== SKILL_ROLE_REGISTRY_STATUSES.DEPRECATED
      ? [{ value: 'Set Deprecated', label: 'Set Deprecated' }]
      : []),
  ]

  return (
    <div className="super-admin-skill-role-registry__row-actions">
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
        aria-label={`Actions for ${row.roleKey}`}
      />
    </div>
  )
}

function TruncatedText({ children, className = '' }) {
  const text = String(children ?? '').trim()
  if (!text) {
    return <span className={className}>--</span>
  }

  return (
    <Tooltip
      content={text}
      position="top"
      align="start"
      className="super-admin-skill-role-registry__truncated-tooltip"
    >
      <span className={`super-admin-skill-role-registry__truncated-text ${className}`} title={text}>
        {text}
      </span>
    </Tooltip>
  )
}

function renderRoleSummary(_value, row) {
  return (
    <div className="super-admin-skill-role-registry__role-summary">
      <div className="super-admin-skill-role-registry__role-heading">
        <TruncatedText className="super-admin-skill-role-registry__role-label">{row.label}</TruncatedText>
        {row.isSystem ? (
          <Badge variant="info" size="sm" pill>
            SYSTEM
          </Badge>
        ) : null}
      </div>
      <TruncatedText className="super-admin-skill-role-registry__role-key">{row.roleKey}</TruncatedText>
    </div>
  )
}

function renderVersionSummary(_value, row) {
  const componentVersion = Number(row.componentVersion) || 1
  const versionStatus = row.versionStatus || row.status || 'DRAFT'

  return (
    <div className="super-admin-skill-role-registry__version-summary">
      <span className="super-admin-skill-role-registry__version-text">v{componentVersion}</span>
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

export function SkillRoleRegistryListView({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  sortValue,
  setSortValue,
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
  onCloneClick = () => {},
  setRoleStatus,
  isMutating,
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
        setRoleStatus(row, SKILL_ROLE_REGISTRY_STATUSES.ACTIVE)
      }

      if (label === 'Set Inactive') {
        setRoleStatus(row, SKILL_ROLE_REGISTRY_STATUSES.INACTIVE)
      }

      if (label === 'Set Deprecated') {
        setRoleStatus(row, SKILL_ROLE_REGISTRY_STATUSES.DEPRECATED)
      }
    },
    [onCloneClick, onEditClick, setRoleStatus],
  )

  const columns = useMemo(
    () => [
      {
        key: 'roleKey',
        label: 'Skill Role',
        mobileLabel: 'Skill Role',
        width: '280px',
        render: renderRoleSummary,
      },
      {
        key: 'description',
        label: 'Description',
        mobileLabel: 'Description',
        render: (value) => <TruncatedText className="super-admin-skill-role-registry__description">{value}</TruncatedText>,
      },
      {
        key: 'category',
        label: 'Category',
        mobileLabel: 'Category',
        width: '156px',
        render: (value) => <TruncatedText>{value || '--'}</TruncatedText>,
      },
      {
        key: 'allowedOperations',
        label: 'Ops',
        mobileLabel: 'Ops',
        width: '132px',
        render: (value) => <TruncatedText>{Array.isArray(value) ? value.join(', ') : '--'}</TruncatedText>,
      },
      {
        key: 'usageCount',
        label: 'Skills Using',
        mobileLabel: 'Skills Using',
        align: 'center',
        width: '132px',
        render: (value) => Number(value) || 0,
      },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        align: 'center',
        width: '140px',
        render: (value) => (
          <Status size="sm" showIcon variant={getSkillRoleRegistryStatusVariant(value)}>
            {formatSkillRoleRegistryStatus(value)}
          </Status>
        ),
      },
      {
        key: 'version',
        label: 'Version',
        mobileLabel: 'Version',
        width: '140px',
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
        render: (_value, row) => <SkillRoleRowActionsMenu row={row} onAction={handleRowAction} disabled={isMutating} />,
      },
    ],
    [handleRowAction, isMutating],
  )
  return (
    <RegistryListView
      block="super-admin-skill-role-registry"
      legend="Skill role registry catalogue"
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
              id="skill-role-registry-search"
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
              id="skill-role-registry-status-filter"
              label="Status"
              size="sm"
              value={statusFilter}
              options={SKILL_ROLE_REGISTRY_STATUS_OPTIONS}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="skill-role-registry-sort"
              label="Sort"
              size="sm"
              value={sortValue}
              options={SKILL_ROLE_REGISTRY_SORT_OPTIONS}
              onChange={(event) => {
                setSortValue(event.target.value)
                setPage(1)
              }}
            />
        </>
      )}
      error={listAppError}
      tableNote={SKILL_ROLE_REGISTRY_HELP_TEXT}
      table={{
        columns,
        data: rows,
        emptyMessage: 'No skill roles found.',
        ariaLabel: 'Skill Roles',
        scrollAriaLabel: 'Skill roles table',
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
        ariaLabel: 'Skill roles pagination',
      }}
    />
  )
}
