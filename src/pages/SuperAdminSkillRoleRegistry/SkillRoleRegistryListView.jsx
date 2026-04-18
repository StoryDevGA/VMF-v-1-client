import { useCallback, useMemo } from 'react'
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
  formatSkillRoleRegistryStatus,
  getSkillRoleRegistryStatusVariant,
  SKILL_ROLE_REGISTRY_HELP_TEXT,
  SKILL_ROLE_REGISTRY_STATUS_OPTIONS,
  SKILL_ROLE_REGISTRY_STATUSES,
} from './superAdminSkillRoleRegistry.constants.js'
import './SkillRoleRegistryListView.css'

function SkillRoleRowActionsMenu({ row, onAction, disabled = false }) {
  const actionOptions = [
    { value: 'Edit', label: 'Edit' },
    ...(row.status !== SKILL_ROLE_REGISTRY_STATUSES.ACTIVE
      ? [{ value: 'Set Active', label: 'Set Active' }]
      : []),
    ...(row.status !== SKILL_ROLE_REGISTRY_STATUSES.INACTIVE
      ? [{ value: 'Set Inactive', label: 'Set Inactive' }]
      : []),
    ...(row.status !== SKILL_ROLE_REGISTRY_STATUSES.DEPRECATED
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

function renderRoleSummary(_value, row) {
  return (
    <div className="super-admin-skill-role-registry__role-summary">
      <span className="super-admin-skill-role-registry__role-label">{row.label}</span>
      <code className="super-admin-skill-role-registry__role-key">{row.roleKey}</code>
    </div>
  )
}

export function SkillRoleRegistryListView({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  setPage,
  rows,
  currentPage,
  totalPages,
  isListLoading,
  isListFetching,
  listAppError,
  onBackClick,
  onCreateClick,
  onEditClick,
  setRoleStatus,
  isMutating,
}) {
  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'Edit') {
        onEditClick(row)
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
    [onEditClick, setRoleStatus],
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
        render: (value) => <span className="super-admin-skill-role-registry__description">{value || '--'}</span>,
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
    <Fieldset className="super-admin-skill-role-registry__fieldset">
      <Fieldset.Legend className="sr-only">Skill role registry catalogue</Fieldset.Legend>
      <Card variant="elevated" className="super-admin-skill-role-registry__card">
        <Card.Body className="super-admin-skill-role-registry__card-body super-admin-skill-role-registry__card-body--compact">
          <div className="super-admin-skill-role-registry__catalogue-actions">
            <Button type="button" variant="outline" size="sm" onClick={onBackClick}>
              Back
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={onCreateClick}>
              Create
            </Button>
          </div>

          <div className="super-admin-skill-role-registry__toolbar">
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
          </div>

          {listAppError ? (
            <p className="super-admin-skill-role-registry__error" role="alert">
              {listAppError.message}
            </p>
          ) : null}

          <p className="super-admin-skill-role-registry__table-note">{SKILL_ROLE_REGISTRY_HELP_TEXT}</p>

          <HorizontalScroll
            className="super-admin-skill-role-registry__table-wrap"
            ariaLabel="Skill roles table"
            gap="sm"
          >
            <Table
              className="super-admin-skill-role-registry__table"
              columns={columns}
              data={rows}
              loading={isListLoading}
              variant="striped"
              hoverable
              emptyMessage="No skill roles found."
              ariaLabel="Skill Roles"
            />
          </HorizontalScroll>

          {isListFetching && !isListLoading ? (
            <p className="super-admin-skill-role-registry__muted">Refreshing list...</p>
          ) : null}

          {totalPages > 1 ? (
            <div
              className="super-admin-skill-role-registry__pagination"
              role="navigation"
              aria-label="Skill roles pagination"
            >
              <div className="super-admin-skill-role-registry__pagination-controls">
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

              <p className="super-admin-skill-role-registry__pagination-info">
                Page {currentPage} of {totalPages}
              </p>

              <div className="super-admin-skill-role-registry__pagination-controls">
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
