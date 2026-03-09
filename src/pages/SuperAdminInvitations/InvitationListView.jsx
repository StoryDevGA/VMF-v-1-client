import { useMemo } from 'react'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Fieldset } from '../../components/Fieldset'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { TableDateTime } from '../../components/TableDateTime'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import {
  STATUS_OPTIONS,
  STATUS_VARIANTS,
} from './superAdminInvitations.constants.js'
import './InvitationListView.css'

export function InvitationListView({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  setPage,
  invitations,
  currentPage,
  totalPages,
  isListLoading,
  isListFetching,
  normalizedListError,
  handleRowAction,
}) {
  const columns = useMemo(
    () => [
      {
        key: 'recipient',
        label: 'Recipient',
        render: (_value, row) => (
          <div className="super-admin-invitations__recipient">
            <strong>{row.recipientName ?? '--'}</strong>
            <span>{row.recipientEmail ?? '--'}</span>
          </div>
        ),
      },
      {
        key: 'company',
        label: 'Company',
        render: (_value, row) => row.company?.name ?? '--',
      },
      {
        key: 'provisionedCustomerId',
        label: 'Customer',
        render: (_value, row) => {
          const status = row.provisionedCustomerId?.status
          if (!status) return '--'
          const variantMap = { ACTIVE: 'success', DISABLED: 'warning', ARCHIVED: 'neutral' }
          return (
            <Status size="sm" showIcon variant={variantMap[status] ?? 'neutral'}>
              {status}
            </Status>
          )
        },
      },
      {
        key: 'provisionedUserId',
        label: 'User Trust',
        render: (_value, row) => {
          const trust = row.provisionedUserId?.identityPlus?.trustStatus
          if (!trust) return '--'
          const variant = trust === 'TRUSTED' ? 'success' : 'warning'
          return (
            <Status size="sm" showIcon variant={variant}>
              {trust}
            </Status>
          )
        },
      },
      {
        key: 'status',
        label: 'Status',
        render: (value) => (
          <Status
            size="sm"
            showIcon
            variant={STATUS_VARIANTS[value] ?? 'neutral'}
          >
            {value ?? 'unknown'}
          </Status>
        ),
      },
      {
        key: 'expiresAt',
        label: 'Expires',
        width: '156px',
        render: (value) => <TableDateTime value={value} />,
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        width: '156px',
        render: (value) => <TableDateTime value={value} />,
      },
    ],
    [],
  )

  const actions = useMemo(
    () => [
      { label: 'Resend', variant: 'ghost' },
      {
        label: 'Revoke',
        variant: 'danger',
        disabled: (row) => row?.status === 'revoked',
      },
    ],
    [],
  )

  return (
    <div className="super-admin-invitations__grid">
      <Fieldset className="super-admin-invitations__fieldset super-admin-invitations__fieldset--list">
        <Fieldset.Legend className="super-admin-invitations__legend">
          <h2 className="super-admin-invitations__section-title">
            Invitation History
          </h2>
        </Fieldset.Legend>
        <Card
          variant="elevated"
          className="super-admin-invitations__card super-admin-invitations__card--list"
        >
          <Card.Body>
            <div className="super-admin-invitations__toolbar">
              {/* Extra browser hints reduce sticky search autofill in Safari/iOS beyond autocomplete=off. */}
              <Input
                id="invitation-search"
                name="invitation-search"
                type="search"
                label="Search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                fullWidth
              />
              <Select
                id="invitation-status"
                label="Status"
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setPage(1)
                }}
              />
            </div>

            {normalizedListError ? (
              <p className="super-admin-invitations__error" role="alert">
                {normalizedListError.message}
              </p>
            ) : null}

            <HorizontalScroll
              className="super-admin-invitations__table-wrap"
              ariaLabel="Invitation history table"
              gap="sm"
            >
              <Table
                className="super-admin-invitations__history-table"
                columns={columns}
                data={invitations}
                actions={actions}
                onRowAction={handleRowAction}
                loading={isListLoading}
                hoverable
                variant="striped"
                emptyMessage="No invitations found."
                ariaLabel="Invitation table"
              />
            </HorizontalScroll>

            <div className="super-admin-invitations__pagination" role="navigation" aria-label="Invitation history pagination">
              <div className="super-admin-invitations__pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={currentPage <= 1 || isListFetching}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage <= 1 || isListFetching}
                >
                  Previous
                </Button>
              </div>
              <p className="super-admin-invitations__pagination-info">
                Page {currentPage} of {totalPages}
              </p>
              <div className="super-admin-invitations__pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={currentPage >= totalPages || isListFetching}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={currentPage >= totalPages || isListFetching}
                >
                  Last
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Fieldset>
    </div>
  )
}
