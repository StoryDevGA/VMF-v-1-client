import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { RESOURCE_TYPE_OPTIONS } from './superAdminAuditLogs.constants.js'
import './AuditLogToolsView.css'

export function AuditLogToolsView({
  requestLookupId,
  setRequestLookupId,
  lookupByRequest,
  requestLookupResult,
  requestRows,
  resourceLookup,
  setResourceLookup,
  lookupByResource,
  resourceLookupResult,
  resourceRows,
  stats,
  isStatsFetching,
  verifyForm,
  setVerifyForm,
  verifyError,
  verifyResultData,
  verifyIntegrityResult,
  handleVerifyIntegrity,
}) {
  return (
    <>
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
            {verifyResultData ? (
              <p className="super-admin-audit-logs__stat-line">Verified {verifyResultData.total} logs. Valid: {verifyResultData.valid}. Invalid: {verifyResultData.invalid}.</p>
            ) : null}
            <Button
              variant="primary"
              loading={verifyIntegrityResult.isLoading}
              disabled={verifyIntegrityResult.isLoading}
              onClick={handleVerifyIntegrity}
            >
              Verify Integrity
            </Button>
          </Card.Body>
        </Card>
      </Fieldset>
    </>
  )
}
