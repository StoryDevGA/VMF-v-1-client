/**
 * Super Admin Denied Access Logs Page
 *
 * Displays audited access-denied events across the platform.
 */

import { useMemo, useState } from 'react'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Table } from '../../components/Table'
import { Status } from '../../components/Status'
import { useListDeniedAccessLogsQuery } from '../../store/api/superAdminAuditApi.js'
import { normalizeError } from '../../utils/errors.js'
import './SuperAdminDeniedAccessLogs.css'

const INITIAL_FILTERS = {
  actorUserId: '',
  startDate: '',
  endDate: '',
}

const toStartOfDayIso = (dateValue) => {
  if (!dateValue) return ''
  const date = new Date(`${dateValue}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

const toEndOfDayIso = (dateValue) => {
  if (!dateValue) return ''
  const date = new Date(`${dateValue}T23:59:59.999Z`)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

const formatDateTime = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleString()
}

const getActorDisplay = (row) => {
  if (row?.actor?.name) return row.actor.name
  if (row?.actor?.email) return row.actor.email
  if (typeof row?.actorUserId === 'string' && row.actorUserId) return row.actorUserId
  if (row?.actorUserId?._id) return row.actorUserId._id
  return '--'
}

function SuperAdminDeniedAccessLogs() {
  const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [page, setPage] = useState(1)

  const {
    data: logsResponse,
    isLoading,
    isFetching,
    error,
  } = useListDeniedAccessLogsQuery({
    page,
    pageSize: 20,
    actorUserId: filters.actorUserId.trim(),
    startDate: toStartOfDayIso(filters.startDate),
    endDate: toEndOfDayIso(filters.endDate),
  })

  const rows = logsResponse?.data ?? []
  const pagination = logsResponse?.meta ?? {}
  const totalPages = Number(pagination.totalPages) || 1
  const total = Number(pagination.total) || 0
  const appError = error ? normalizeError(error) : null

  const columns = useMemo(
    () => [
      {
        key: 'createdAt',
        label: 'Timestamp',
        render: (value) => formatDateTime(value),
      },
      {
        key: 'actor',
        label: 'Actor',
        render: (_value, row) => getActorDisplay(row),
      },
      {
        key: 'action',
        label: 'Action',
        render: (value) => (
          <Status size="sm" variant="warning" showIcon>
            {value ?? 'ACCESS_DENIED'}
          </Status>
        ),
      },
      {
        key: 'resourceType',
        label: 'Resource',
        render: (value, row) =>
          value ? `${value}${row?.resourceId ? `:${row.resourceId}` : ''}` : '--',
      },
      {
        key: 'requestId',
        label: 'Request ID',
        render: (value) => value ?? '--',
      },
    ],
    [],
  )

  return (
    <section
      className="super-admin-denied-logs container"
      aria-label="Super admin denied access logs"
    >
      <header className="super-admin-denied-logs__header">
        <h1 className="super-admin-denied-logs__title">Denied Access Logs</h1>
        <p className="super-admin-denied-logs__subtitle">
          Review platform-wide authorization denials for audit and troubleshooting.
        </p>
      </header>

      <Card variant="elevated">
        <Card.Header>
          <h2 className="super-admin-denied-logs__section-title">Filters</h2>
          <p className="super-admin-denied-logs__section-subtitle">
            Narrow logs by actor and date range.
          </p>
        </Card.Header>
        <Card.Body>
          <form
            className="super-admin-denied-logs__filters"
            onSubmit={(event) => {
              event.preventDefault()
              setFilters(draftFilters)
              setPage(1)
            }}
            noValidate
          >
            <Input
              id="denied-actor-user-id"
              label="Actor User ID"
              value={draftFilters.actorUserId}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  actorUserId: event.target.value,
                }))
              }
              fullWidth
            />
            <Input
              id="denied-start-date"
              type="date"
              label="Start Date"
              value={draftFilters.startDate}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              fullWidth
            />
            <Input
              id="denied-end-date"
              type="date"
              label="End Date"
              value={draftFilters.endDate}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              fullWidth
            />
            <div className="super-admin-denied-logs__filter-actions">
              <Button type="submit" disabled={isFetching}>
                Apply
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isFetching}
                onClick={() => {
                  setDraftFilters(INITIAL_FILTERS)
                  setFilters(INITIAL_FILTERS)
                  setPage(1)
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>

      <Card variant="elevated">
        <Card.Header>
          <h2 className="super-admin-denied-logs__section-title">
            Results ({total})
          </h2>
        </Card.Header>
        <Card.Body>
          {appError ? (
            <p className="super-admin-denied-logs__error" role="alert">
              {appError.message}
            </p>
          ) : null}

          <Table
            columns={columns}
            data={rows}
            loading={isLoading}
            hoverable
            variant="striped"
            emptyMessage="No denied-access logs found."
            ariaLabel="Denied access logs table"
          />

          <div className="super-admin-denied-logs__pagination">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <p className="super-admin-denied-logs__pagination-info">
              Page {Number(pagination.page) || page} of {totalPages}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Next
            </Button>
          </div>
        </Card.Body>
      </Card>
    </section>
  )
}

export default SuperAdminDeniedAccessLogs
