import { useCallback, useMemo } from 'react'
import { Badge } from '../../components/Badge'
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
  EVENT_CATEGORY_OPTIONS,
  EVENT_SEVERITY_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
  SYSTEM_EVENT_OPTIONS,
  SYSTEM_EVENT_TYPE_OPTIONS,
  actorLabel,
  auditSummaryLabel,
  humanizeAuditAction,
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
  const handleFilterChange = useCallback((key) => (event) => {
    setFilters((current) => ({ ...current, [key]: event.target.value }))
    setPage(1)
  }, [setFilters, setPage])

  const columns = useMemo(
    () => [
      {
        key: 'ts',
        label: 'Timestamp',
        mobileLabel: 'Timestamp',
        width: '156px',
        render: (value) => <TableDateTime value={value} />,
      },
      {
        key: 'action',
        label: 'Action',
        mobileLabel: 'Action',
        render: (value) => humanizeAuditAction(value),
      },
      {
        key: 'governance',
        label: 'Governance',
        mobileLabel: 'Governance',
        width: '248px',
        render: (_value, row) => (
          <div className="super-admin-audit-logs__governance">
            <Badge
              variant={row.isSystemEvent ? 'success' : 'neutral'}
              size="sm"
              pill
              outline
              className="super-admin-audit-logs__governance-badge"
            >
              {row.isSystemEvent ? (row.systemEventType || 'System event') : 'User activity'}
            </Badge>
            {row.frameworkKey || row.packageKey ? (
              <span className="super-admin-audit-logs__governance-text">
                {[row.frameworkKey, row.frameworkVersion, row.packageKey].filter(Boolean).join(' / ')}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'summary',
        label: 'Event',
        mobileLabel: 'Event',
        render: (_value, row) => (
          <div className="super-admin-audit-logs__summary">
            <span className="super-admin-audit-logs__summary-text">{auditSummaryLabel(row)}</span>
          </div>
        ),
      },
      {
        key: 'actor',
        label: 'Actor',
        mobileLabel: 'Actor',
        width: '168px',
        render: (_value, row) => actorLabel(row),
      },
      {
        key: 'requestId',
        label: 'Request ID',
        mobileLabel: 'Request ID',
        width: '208px',
      },
    ],
    [],
  )

  return (
    <Fieldset className="super-admin-audit-logs__fieldset">
      <Fieldset.Legend className="super-admin-audit-logs__legend">
        <h2 className="super-admin-audit-logs__section-title">Query Audit Logs</h2>
      </Fieldset.Legend>
      <Card variant="elevated" className="super-admin-audit-logs__card">
        <Card.Body className="super-admin-audit-logs__card-body super-admin-audit-logs__card-body--compact">
          <div className="super-admin-audit-logs__filter-groups">
            <Fieldset className="super-admin-audit-logs__filter-group" gap="sm">
              <Fieldset.Legend className="super-admin-audit-logs__filter-group-title">Query</Fieldset.Legend>
              <Fieldset.Content className="super-admin-audit-logs__filter-group-content super-admin-audit-logs__filter-group-content--single">
                <Input id="audit-filter-request-id" label="Request ID" size="sm" value={filters.requestId} onChange={handleFilterChange('requestId')} fullWidth />
                <Select id="audit-filter-system-event-type" label="System Event Type" size="sm" value={filters.systemEventType} options={SYSTEM_EVENT_TYPE_OPTIONS} onChange={handleFilterChange('systemEventType')} />
                <Select id="audit-filter-action" label="Action" size="sm" value={filters.action} options={ACTION_OPTIONS} onChange={handleFilterChange('action')} />
              </Fieldset.Content>
            </Fieldset>

            <Fieldset className="super-admin-audit-logs__filter-group" gap="sm">
              <Fieldset.Legend className="super-admin-audit-logs__filter-group-title">Governance</Fieldset.Legend>
              <Fieldset.Content className="super-admin-audit-logs__filter-group-content">
                <Select id="audit-filter-resource-type" label="Resource Type" size="sm" value={filters.resourceType} options={RESOURCE_TYPE_OPTIONS} onChange={handleFilterChange('resourceType')} />
                <Select id="audit-filter-system-event" label="Audit Layer" size="sm" value={filters.isSystemEvent} options={SYSTEM_EVENT_OPTIONS} onChange={handleFilterChange('isSystemEvent')} />
                <Select id="audit-filter-event-category" label="Event Category" size="sm" value={filters.eventCategory} options={EVENT_CATEGORY_OPTIONS} onChange={handleFilterChange('eventCategory')} />
                <Select id="audit-filter-event-severity" label="Severity" size="sm" value={filters.eventSeverity} options={EVENT_SEVERITY_OPTIONS} onChange={handleFilterChange('eventSeverity')} />
              </Fieldset.Content>
            </Fieldset>

            <Fieldset className="super-admin-audit-logs__filter-group" gap="sm">
              <Fieldset.Legend className="super-admin-audit-logs__filter-group-title">Runtime Package</Fieldset.Legend>
              <Fieldset.Content className="super-admin-audit-logs__filter-group-content">
                <Input id="audit-filter-framework-key" label="Framework Key" size="sm" value={filters.frameworkKey} onChange={handleFilterChange('frameworkKey')} fullWidth />
                <Input id="audit-filter-framework-version" label="Framework Version" size="sm" value={filters.frameworkVersion} onChange={handleFilterChange('frameworkVersion')} fullWidth />
                <Input id="audit-filter-package-key" label="Package Key" size="sm" value={filters.packageKey} onChange={handleFilterChange('packageKey')} fullWidth />
                <Input id="audit-filter-checksum" label="Checksum" size="sm" value={filters.checksum} onChange={handleFilterChange('checksum')} fullWidth />
              </Fieldset.Content>
            </Fieldset>

            <Fieldset className="super-admin-audit-logs__filter-group" gap="sm">
              <Fieldset.Legend className="super-admin-audit-logs__filter-group-title">Component and Actor</Fieldset.Legend>
              <Fieldset.Content className="super-admin-audit-logs__filter-group-content">
                <Input id="audit-filter-component-type" label="Component Type" size="sm" value={filters.componentType} onChange={handleFilterChange('componentType')} fullWidth />
                <Input id="audit-filter-component-stable-id" label="Stable ID" aria-label="Component Stable ID" size="sm" value={filters.componentStableId} onChange={handleFilterChange('componentStableId')} fullWidth />
                <Input id="audit-filter-component-version" label="Version" aria-label="Component Version" size="sm" value={filters.componentVersion} onChange={handleFilterChange('componentVersion')} fullWidth />
                <Input id="audit-filter-resource-id" label="Resource ID" size="sm" value={filters.resourceId} onChange={handleFilterChange('resourceId')} fullWidth />
                <Input id="audit-filter-actor-user-id" label="Actor User ID" size="sm" value={filters.actorUserId} onChange={handleFilterChange('actorUserId')} fullWidth />
                <Input id="audit-filter-customer-id" label="Customer ID" size="sm" value={filters.customerId} onChange={handleFilterChange('customerId')} fullWidth />
                <Input
                  id="audit-filter-start-date"
                  type="date"
                  label="Start Date"
                  size="sm"
                  value={filters.startDate}
                  onChange={handleFilterChange('startDate')}
                  max={filters.endDate || undefined}
                  fullWidth
                />
                <Input
                  id="audit-filter-end-date"
                  type="date"
                  label="End Date"
                  size="sm"
                  value={filters.endDate}
                  onChange={handleFilterChange('endDate')}
                  min={filters.startDate || undefined}
                  fullWidth
                />
              </Fieldset.Content>
            </Fieldset>
          </div>
          {listAppError ? <p className="super-admin-audit-logs__error" role="alert">{listAppError.message}</p> : null}
          <p className="super-admin-audit-logs__table-note">
            Showing audit rows that match the selected query, governance, runtime package, and component filters.
          </p>
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
