import { useMemo } from 'react'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Select } from '../../components/Select'
import { Table } from '../../components/Table'
import { TableDateTime } from '../../components/TableDateTime'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import {
  ACTION_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
  actorLabel,
} from './superAdminAuditLogs.constants.js'
import './AuditLogListView.css'

export function AuditLogListView({
  filters,
  setFilters,
  setPage,
  rows,
  currentPage,
  totalPages,
  isAuditListLoading,
  isAuditListFetching,
  listAppError,
}) {
  const columns = useMemo(
    () => [
      { key: 'ts', label: 'Timestamp', width: '156px', render: (value) => <TableDateTime value={value} /> },
      { key: 'action', label: 'Action' },
      {
        key: 'resourceType',
        label: 'Resource',
        render: (_value, row) =>
          `${row?.resourceType ?? '--'}${row?.resourceId ? `:${row.resourceId}` : ''}`,
      },
      { key: 'actor', label: 'Actor', render: (_value, row) => actorLabel(row) },
      { key: 'requestId', label: 'Request ID' },
    ],
    [],
  )

  return (
    <Fieldset className="super-admin-audit-logs__fieldset">
      <Fieldset.Legend className="super-admin-audit-logs__legend">
        <h2 className="super-admin-audit-logs__section-title">Query Audit Logs</h2>
      </Fieldset.Legend>
      <Card variant="elevated" className="super-admin-audit-logs__card">
        <Card.Body>
          <div className="super-admin-audit-logs__filters">
            <Input id="audit-filter-request-id" label="Request ID" value={filters.requestId} onChange={(event) => { setFilters((current) => ({ ...current, requestId: event.target.value })); setPage(1) }} fullWidth />
            <Select id="audit-filter-action" label="Action" value={filters.action} options={ACTION_OPTIONS} onChange={(event) => { setFilters((current) => ({ ...current, action: event.target.value })); setPage(1) }} />
            <Select id="audit-filter-resource-type" label="Resource Type" value={filters.resourceType} options={RESOURCE_TYPE_OPTIONS} onChange={(event) => { setFilters((current) => ({ ...current, resourceType: event.target.value })); setPage(1) }} />
            <Input id="audit-filter-resource-id" label="Resource ID" value={filters.resourceId} onChange={(event) => { setFilters((current) => ({ ...current, resourceId: event.target.value })); setPage(1) }} fullWidth />
            <Input id="audit-filter-actor-user-id" label="Actor User ID" value={filters.actorUserId} onChange={(event) => { setFilters((current) => ({ ...current, actorUserId: event.target.value })); setPage(1) }} fullWidth />
            <Input id="audit-filter-customer-id" label="Customer ID" value={filters.customerId} onChange={(event) => { setFilters((current) => ({ ...current, customerId: event.target.value })); setPage(1) }} fullWidth />
            <Input id="audit-filter-start-date" type="date" label="Start Date" value={filters.startDate} onChange={(event) => { setFilters((current) => ({ ...current, startDate: event.target.value })); setPage(1) }} fullWidth />
            <Input id="audit-filter-end-date" type="date" label="End Date" value={filters.endDate} onChange={(event) => { setFilters((current) => ({ ...current, endDate: event.target.value })); setPage(1) }} fullWidth />
          </div>
          {listAppError ? <p className="super-admin-audit-logs__error" role="alert">{listAppError.message}</p> : null}
          <HorizontalScroll className="super-admin-audit-logs__table-wrap" ariaLabel="Audit logs table" gap="sm">
            <Table className="super-admin-audit-logs__table" columns={columns} data={rows} loading={isAuditListLoading} variant="striped" hoverable emptyMessage="No audit logs found." ariaLabel="Audit logs" />
          </HorizontalScroll>
          {isAuditListFetching && !isAuditListLoading ? <p className="super-admin-audit-logs__muted">Refreshing query...</p> : null}
          {totalPages > 1 ? (
            <div className="super-admin-audit-logs__pagination" role="navigation" aria-label="Audit logs pagination">
              <div className="super-admin-audit-logs__pagination-controls">
                <Button variant="outline" size="sm" disabled={currentPage <= 1 || isAuditListFetching} onClick={() => setPage(1)}>First</Button>
                <Button variant="outline" size="sm" disabled={currentPage <= 1 || isAuditListFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
              </div>
              <p className="super-admin-audit-logs__pagination-info">Page {currentPage} of {totalPages}</p>
              <div className="super-admin-audit-logs__pagination-controls">
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages || isAuditListFetching} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages || isAuditListFetching} onClick={() => setPage(totalPages)}>Last</Button>
              </div>
            </div>
          ) : null}
        </Card.Body>
      </Card>
    </Fieldset>
  )
}
