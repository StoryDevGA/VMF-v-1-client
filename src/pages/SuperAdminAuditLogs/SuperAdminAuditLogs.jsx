import { useMemo, useState } from 'react'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Table } from '../../components/Table'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { useToaster } from '../../components/Toaster'
import {
  useQueryAuditLogsQuery,
  useGetAuditStatsQuery,
  useLazyGetAuditLogsByRequestQuery,
  useLazyGetAuditLogsByResourceQuery,
  useVerifyAuditIntegrityMutation,
} from '../../store/api/auditLogApi.js'
import { normalizeError } from '../../utils/errors.js'
import './SuperAdminAuditLogs.css'

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'LICENSE_LEVEL_CREATED', label: 'LICENSE_LEVEL_CREATED' },
  { value: 'LICENSE_LEVEL_UPDATED', label: 'LICENSE_LEVEL_UPDATED' },
  { value: 'CUSTOMER_CREATED', label: 'CUSTOMER_CREATED' },
  { value: 'CUSTOMER_UPDATED', label: 'CUSTOMER_UPDATED' },
  { value: 'CUSTOMER_STATUS_CHANGED', label: 'CUSTOMER_STATUS_CHANGED' },
  { value: 'CUSTOMER_ADMIN_ASSIGNED', label: 'CUSTOMER_ADMIN_ASSIGNED' },
  { value: 'CUSTOMER_ADMIN_REPLACED', label: 'CUSTOMER_ADMIN_REPLACED' },
  { value: 'ACCESS_DENIED', label: 'ACCESS_DENIED' },
]

const RESOURCE_TYPE_OPTIONS = [
  { value: '', label: 'All resource types' },
  { value: 'Customer', label: 'Customer' },
  { value: 'LicenseLevel', label: 'LicenseLevel' },
  { value: 'Tenant', label: 'Tenant' },
  { value: 'User', label: 'User' },
  { value: 'VMF', label: 'VMF' },
  { value: 'Deal', label: 'Deal' },
  { value: 'Invitation', label: 'Invitation' },
  { value: 'AuditLog', label: 'AuditLog' },
]

const formatDate = (value) => {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '--'
  return parsed.toLocaleString()
}

const actorLabel = (row) => {
  if (row?.actorUserId?.name) return row.actorUserId.name
  if (row?.actorUserId?.email) return row.actorUserId.email
  if (typeof row?.actorUserId === 'string') return row.actorUserId
  return '--'
}

const parseIds = (value) =>
  String(value ?? '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)

function SuperAdminAuditLogs() {
  const { addToast } = useToaster()

  const [filters, setFilters] = useState({
    requestId: '',
    action: '',
    resourceType: '',
    actorUserId: '',
    resourceId: '',
    customerId: '',
    startDate: '',
    endDate: '',
  })
  const [page, setPage] = useState(1)

  const [requestLookupId, setRequestLookupId] = useState('')
  const [resourceLookup, setResourceLookup] = useState({
    resourceType: 'Customer',
    resourceId: '',
  })

  const [verifyForm, setVerifyForm] = useState({
    ids: '',
    customerId: '',
    startDate: '',
    endDate: '',
    limit: '1000',
  })
  const [verifyError, setVerifyError] = useState('')
  const [verifyResult, setVerifyResult] = useState(null)

  const {
    data: auditListResponse,
    isLoading: isAuditListLoading,
    isFetching: isAuditListFetching,
    error: auditListError,
  } = useQueryAuditLogsQuery({
    page,
    pageSize: 20,
    requestId: filters.requestId.trim(),
    action: filters.action,
    resourceType: filters.resourceType,
    actorUserId: filters.actorUserId.trim(),
    resourceId: filters.resourceId.trim(),
    customerId: filters.customerId.trim(),
    startDate: filters.startDate ? `${filters.startDate}T00:00:00.000Z` : '',
    endDate: filters.endDate ? `${filters.endDate}T23:59:59.999Z` : '',
  })

  const { data: statsResponse, isFetching: isStatsFetching } = useGetAuditStatsQuery({
    customerId: filters.customerId.trim(),
    startDate: filters.startDate ? `${filters.startDate}T00:00:00.000Z` : '',
    endDate: filters.endDate ? `${filters.endDate}T23:59:59.999Z` : '',
  })

  const [lookupByRequest, requestLookupResult] = useLazyGetAuditLogsByRequestQuery()
  const [lookupByResource, resourceLookupResult] = useLazyGetAuditLogsByResourceQuery()
  const [verifyIntegrity, verifyIntegrityResult] = useVerifyAuditIntegrityMutation()

  const rows = auditListResponse?.data ?? []
  const meta = auditListResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1

  const columns = useMemo(
    () => [
      { key: 'ts', label: 'Timestamp', render: (value) => formatDate(value) },
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

  const listAppError = auditListError ? normalizeError(auditListError) : null
  const requestRows = requestLookupResult.data?.data ?? []
  const resourceRows = resourceLookupResult.data?.data ?? []
  const stats = statsResponse?.data ?? {}

  return (
    <section className="super-admin-audit-logs container" aria-label="Super admin audit logs">
      <header className="super-admin-audit-logs__header">
        <h1 className="super-admin-audit-logs__title">Audit Logs Explorer</h1>
        <p className="super-admin-audit-logs__subtitle">
          Query audit trails, correlate by request/resource, and verify integrity.
        </p>
      </header>

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
              <div className="super-admin-audit-logs__pagination">
                <Button variant="outline" size="sm" disabled={page <= 1 || isAuditListFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
                <p className="super-admin-audit-logs__pagination-info">Page {Number(meta.page) || page} of {totalPages}</p>
                <Button variant="outline" size="sm" disabled={page >= totalPages || isAuditListFetching} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</Button>
              </div>
            ) : null}
          </Card.Body>
        </Card>
      </Fieldset>

      <div className="super-admin-audit-logs__split">
        <Fieldset className="super-admin-audit-logs__fieldset">
          <Fieldset.Legend className="super-admin-audit-logs__legend"><h2 className="super-admin-audit-logs__section-title">Request / Resource Lookup</h2></Fieldset.Legend>
          <Card variant="elevated" className="super-admin-audit-logs__card">
            <Card.Body>
              <div className="super-admin-audit-logs__lookup-row">
                <Input id="audit-request-lookup" label="Request ID" value={requestLookupId} onChange={(event) => setRequestLookupId(event.target.value)} fullWidth />
                <Button variant="outline" onClick={() => lookupByRequest(requestLookupId.trim())} disabled={!requestLookupId.trim() || requestLookupResult.isFetching}>Lookup Request</Button>
              </div>
              <div className="super-admin-audit-logs__lookup-row">
                <Select id="audit-resource-type-lookup" label="Resource Type" value={resourceLookup.resourceType} options={RESOURCE_TYPE_OPTIONS.filter((option) => option.value)} onChange={(event) => setResourceLookup((current) => ({ ...current, resourceType: event.target.value }))} />
                <Input id="audit-resource-id-lookup" label="Resource ID" value={resourceLookup.resourceId} onChange={(event) => setResourceLookup((current) => ({ ...current, resourceId: event.target.value }))} fullWidth />
                <Button variant="outline" onClick={() => lookupByResource({ resourceType: resourceLookup.resourceType, resourceId: resourceLookup.resourceId.trim(), page: 1, pageSize: 50 })} disabled={!resourceLookup.resourceType || !resourceLookup.resourceId.trim() || resourceLookupResult.isFetching}>Lookup Resource</Button>
              </div>
              <p className="super-admin-audit-logs__muted">Request matches: {requestRows.length} | Resource matches: {resourceRows.length}</p>
            </Card.Body>
          </Card>
        </Fieldset>
        <Fieldset className="super-admin-audit-logs__fieldset">
          <Fieldset.Legend className="super-admin-audit-logs__legend"><h2 className="super-admin-audit-logs__section-title">Stats</h2></Fieldset.Legend>
          <Card variant="elevated" className="super-admin-audit-logs__card">
            <Card.Body>
              <p className="super-admin-audit-logs__stat-line">Total logs: <strong>{stats.total ?? 0}</strong></p>
              <p className="super-admin-audit-logs__stat-line">Top actions: <strong>{(stats.byAction ?? []).slice(0, 3).map((item) => `${item._id} (${item.count})`).join(', ') || '--'}</strong></p>
              <p className="super-admin-audit-logs__stat-line">Top resources: <strong>{(stats.byResourceType ?? []).slice(0, 3).map((item) => `${item._id} (${item.count})`).join(', ') || '--'}</strong></p>
              <Status size="sm" showIcon variant={isStatsFetching ? 'warning' : 'success'}>{isStatsFetching ? 'Refreshing' : 'Current'}</Status>
            </Card.Body>
          </Card>
        </Fieldset>
      </div>

      <Fieldset className="super-admin-audit-logs__fieldset">
        <Fieldset.Legend className="super-admin-audit-logs__legend"><h2 className="super-admin-audit-logs__section-title">Verify Integrity</h2></Fieldset.Legend>
        <Card variant="elevated" className="super-admin-audit-logs__card">
          <Card.Body>
            <div className="super-admin-audit-logs__filters">
              <Input id="audit-verify-ids" label="Audit IDs (comma/newline)" value={verifyForm.ids} onChange={(event) => setVerifyForm((current) => ({ ...current, ids: event.target.value }))} fullWidth />
              <Input id="audit-verify-customer-id" label="Customer ID" value={verifyForm.customerId} onChange={(event) => setVerifyForm((current) => ({ ...current, customerId: event.target.value }))} fullWidth />
              <Input id="audit-verify-start-date" type="date" label="Start Date" value={verifyForm.startDate} onChange={(event) => setVerifyForm((current) => ({ ...current, startDate: event.target.value }))} fullWidth />
              <Input id="audit-verify-end-date" type="date" label="End Date" value={verifyForm.endDate} onChange={(event) => setVerifyForm((current) => ({ ...current, endDate: event.target.value }))} fullWidth />
              <Input id="audit-verify-limit" type="number" min={1} max={10000} label="Limit" value={verifyForm.limit} onChange={(event) => setVerifyForm((current) => ({ ...current, limit: event.target.value }))} fullWidth />
            </div>
            {verifyError ? <p className="super-admin-audit-logs__error" role="alert">{verifyError}</p> : null}
            {verifyResult ? (
              <p className="super-admin-audit-logs__stat-line">Verified {verifyResult.total} logs. Valid: {verifyResult.valid}. Invalid: {verifyResult.invalid}.</p>
            ) : null}
            <Button
              variant="primary"
              loading={verifyIntegrityResult.isLoading}
              disabled={verifyIntegrityResult.isLoading}
              onClick={async () => {
                setVerifyError('')
                const ids = parseIds(verifyForm.ids)
                const payload = {
                  ...(ids.length > 0 ? { ids } : {}),
                  ...(verifyForm.customerId.trim() ? { customerId: verifyForm.customerId.trim() } : {}),
                  ...(verifyForm.startDate ? { startDate: `${verifyForm.startDate}T00:00:00.000Z` } : {}),
                  ...(verifyForm.endDate ? { endDate: `${verifyForm.endDate}T23:59:59.999Z` } : {}),
                  limit: Number.parseInt(verifyForm.limit, 10) || 1000,
                }
                if (!payload.ids && !payload.customerId && !payload.startDate && !payload.endDate) {
                  setVerifyError('Provide at least one filter before verification.')
                  return
                }
                try {
                  const response = await verifyIntegrity(payload).unwrap()
                  setVerifyResult(response?.data ?? response)
                  addToast({
                    title: 'Integrity verification complete',
                    description: 'Audit log signatures have been verified.',
                    variant: 'success',
                  })
                } catch (err) {
                  const appError = normalizeError(err)
                  setVerifyError(appError.message)
                }
              }}
            >
              Verify Integrity
            </Button>
          </Card.Body>
        </Card>
      </Fieldset>
    </section>
  )
}

export default SuperAdminAuditLogs

