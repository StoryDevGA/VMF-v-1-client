import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Badge } from '../../components/Badge'
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
  const topActionRows = (stats.byAction ?? []).slice(0, 3)
  const topResourceRows = (stats.byResourceType ?? []).slice(0, 3)
  const topActivityRows = [
    ...topActionRows.map((item) => ({ ...item, category: 'Action' })),
    ...topResourceRows.map((item) => ({ ...item, category: 'Resource' })),
  ]
  const maxActivityCount = Math.max(1, ...topActivityRows.map((item) => Number(item.count) || 0))

  return (
    <>
      <div className="super-admin-audit-logs__split">
        <Fieldset className="super-admin-audit-logs__fieldset">
          <Fieldset.Legend className="super-admin-audit-logs__legend"><h2 className="super-admin-audit-logs__section-title">Request / Resource Lookup</h2></Fieldset.Legend>
          <Card variant="elevated" className="super-admin-audit-logs__card">
            <Card.Body className="super-admin-audit-logs__card-body super-admin-audit-logs__card-body--compact">
              <div className="super-admin-audit-logs__lookup-panel">
                <div className="super-admin-audit-logs__lookup-content">
                  <div className="super-admin-audit-logs__lookup-section">
                    <div className="super-admin-audit-logs__lookup-row">
                      <Input
                        id="audit-request-lookup"
                        label="Request ID"
                        size="sm"
                        value={requestLookupId}
                        onChange={(event) => setRequestLookupId(event.target.value)}
                        fullWidth
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => lookupByRequest(requestLookupId.trim())}
                        disabled={!requestLookupId.trim() || requestLookupResult.isFetching}
                      >
                        Lookup Request
                      </Button>
                    </div>
                  </div>
                  <div className="super-admin-audit-logs__lookup-section">
                    <div className="super-admin-audit-logs__lookup-row super-admin-audit-logs__lookup-row--resource">
                      <Select
                        id="audit-resource-type-lookup"
                        label="Resource Type"
                        size="sm"
                        value={resourceLookup.resourceType}
                        options={RESOURCE_TYPE_OPTIONS.filter((option) => option.value)}
                        onChange={(event) => setResourceLookup((current) => ({ ...current, resourceType: event.target.value }))}
                      />
                      <Input
                        id="audit-resource-id-lookup"
                        label="Resource ID"
                        size="sm"
                        value={resourceLookup.resourceId}
                        onChange={(event) => setResourceLookup((current) => ({ ...current, resourceId: event.target.value }))}
                        fullWidth
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => lookupByResource({
                          resourceType: resourceLookup.resourceType,
                          resourceId: resourceLookup.resourceId.trim(),
                          page: 1,
                          pageSize: 50,
                        })}
                        disabled={!resourceLookup.resourceType || !resourceLookup.resourceId.trim() || resourceLookupResult.isFetching}
                      >
                        Lookup Resource
                      </Button>
                    </div>
                  </div>
                  <div className="super-admin-audit-logs__match-list" aria-label="Lookup match counts">
                    <Badge variant="neutral" size="sm" pill outline>Request matches {requestRows.length}</Badge>
                    <Badge variant="neutral" size="sm" pill outline>Resource matches {resourceRows.length}</Badge>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Fieldset>
        <Fieldset className="super-admin-audit-logs__fieldset">
          <Fieldset.Legend className="super-admin-audit-logs__legend"><h2 className="super-admin-audit-logs__section-title">Stats</h2></Fieldset.Legend>
          <Card variant="elevated" className="super-admin-audit-logs__card">
            <Card.Body className="super-admin-audit-logs__card-body super-admin-audit-logs__card-body--compact">
              <div className="super-admin-audit-logs__stats-panel">
                <div className="super-admin-audit-logs__stat-total-card">
                  <p className="super-admin-audit-logs__stat-label">Total logs</p>
                  <p className="super-admin-audit-logs__stat-total">{stats.total ?? 0}</p>
                  <Status size="sm" showIcon variant={isStatsFetching ? 'warning' : 'success'}>{isStatsFetching ? 'Refreshing' : 'Current'}</Status>
                </div>
                <div className="super-admin-audit-logs__stat-activity">
                  <p className="super-admin-audit-logs__stat-label">Top activity</p>
                  {topActivityRows.length ? (
                    <div className="super-admin-audit-logs__stat-bars">
                      {topActivityRows.map((item) => {
                        const count = Number(item.count) || 0
                        const label = String(item._id || 'Unknown')
                        return (
                          <div className="super-admin-audit-logs__stat-bar-row" key={`${item.category}-${label}`}>
                            <div className="super-admin-audit-logs__stat-bar-heading">
                              <span>{label}</span>
                              <strong>{count}</strong>
                            </div>
                            <meter
                              className="super-admin-audit-logs__stat-meter"
                              min="0"
                              max={maxActivityCount}
                              value={count}
                              aria-label={`${label} ${count}`}
                            />
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="super-admin-audit-logs__muted">No activity counts available.</p>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Fieldset>
      </div>

      <Fieldset className="super-admin-audit-logs__fieldset">
        <Fieldset.Legend className="super-admin-audit-logs__legend"><h2 className="super-admin-audit-logs__section-title">Verify Integrity</h2></Fieldset.Legend>
        <Card variant="elevated" className="super-admin-audit-logs__card">
          <Card.Body className="super-admin-audit-logs__card-body super-admin-audit-logs__card-body--compact super-admin-audit-logs__verify-body">
            <div className="super-admin-audit-logs__verify-row">
              <Input id="audit-verify-ids" label="Audit IDs (comma/newline)" size="sm" value={verifyForm.ids} onChange={(event) => setVerifyForm((current) => ({ ...current, ids: event.target.value }))} fullWidth />
              <Input id="audit-verify-customer-id" label="Customer ID" size="sm" value={verifyForm.customerId} onChange={(event) => setVerifyForm((current) => ({ ...current, customerId: event.target.value }))} fullWidth />
              <Input
                id="audit-verify-start-date"
                type="date"
                label="Start Date"
                size="sm"
                value={verifyForm.startDate}
                onChange={(event) => setVerifyForm((current) => ({ ...current, startDate: event.target.value }))}
                max={verifyForm.endDate || undefined}
                fullWidth
              />
              <Input
                id="audit-verify-end-date"
                type="date"
                label="End Date"
                size="sm"
                value={verifyForm.endDate}
                onChange={(event) => setVerifyForm((current) => ({ ...current, endDate: event.target.value }))}
                min={verifyForm.startDate || undefined}
                fullWidth
              />
              <Input id="audit-verify-limit" type="number" min={1} max={10000} label="Limit" size="sm" value={verifyForm.limit} onChange={(event) => setVerifyForm((current) => ({ ...current, limit: event.target.value }))} fullWidth />
              <Button
                variant="primary"
                size="sm"
                loading={verifyIntegrityResult.isLoading}
                disabled={verifyIntegrityResult.isLoading}
                onClick={handleVerifyIntegrity}
                className="super-admin-audit-logs__verify-action"
              >
                Verify Integrity
              </Button>
            </div>
            {verifyError ? <p className="super-admin-audit-logs__error" role="alert">{verifyError}</p> : null}
            {verifyResultData ? (
              <p className="super-admin-audit-logs__stat-line">Verified {verifyResultData.total} logs. Valid: {verifyResultData.valid}. Invalid: {verifyResultData.invalid}.</p>
            ) : null}
          </Card.Body>
        </Card>
      </Fieldset>
    </>
  )
}
