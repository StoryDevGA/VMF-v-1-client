import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { useGetAcquisitionRunsQuery, useGetAcquisitionRunQuery } from '../../store/api/runtimeInstanceApi.js'
import { isAcquisitionRunId, readAcquisitionRun, acquisitionRunLabel } from './acquisitionRunContract.js'

export default function AcquisitionRunHistory({ scope, active, locked, canAcquire, busy, onRetry }) {
  const [cursor, setCursor] = useState(null)
  const [params, setParams] = useSearchParams()
  const selected = params.get('acquisitionRunId')
  const history = useGetAcquisitionRunsQuery({ ...scope, cursor }, { skip: !active })
  const detail = useGetAcquisitionRunQuery({ ...scope, runId: selected }, { skip: !active || !isAcquisitionRunId(selected) })
  const page = history.currentData?.data
  const items = page?.contractVersion === 'acquisition-run.v1' && Array.isArray(page.items) && page.items.length <= 25
    && page.scope?.runtimeInstanceKey === scope.runtimeInstanceId && page.scope?.customerId === scope.customerId
    && page.scope?.tenantId === scope.tenantId && typeof page.hasMore === 'boolean'
    && (!page.hasMore || typeof page.nextCursor === 'string' && page.nextCursor.length > 0 && page.nextCursor.length <= 256)
    && new Set(page.items.map(row => row?.runId)).size === page.items.length
    && page.items.every(row => readAcquisitionRun(row, scope)) ? page.items : null
  const candidate = readAcquisitionRun(detail.currentData?.data, scope)
  const run = candidate?.runId === selected ? candidate : null
  const open = runId => { const next = new URLSearchParams(params); next.set('acquisitionRunId', runId); setParams(next) }
  return <section aria-label="Acquisition Run history" className="intelligence-hub__run-history">
    <h3>Acquisition Run history</h3>
    <p>Each Run records an explicit acquisition operation. Batch is a display grouping; legacy attempts have no inferred Run.</p>
    {history.isFetching ? <p role="status">Loading acquisition Runs…</p> : history.error || !items ? <p>Run history unavailable. Refresh to verify recorded executions.</p>
      : items.length ? <ul>{items.map(row => <li key={row.runId}><Button type="button" variant="ghost" onClick={() => open(row.runId)}>Inspect Run {row.runId}</Button> {acquisitionRunLabel(row)}</li>)}</ul>
        : <p>No acquisition Runs recorded in this revision.</p>}
    {items ? <p>{page.hasMore ? 'More recorded Runs are available.' : 'End of this history page.'} History entries are previews; open a Run to verify its receipt.</p> : null}
    <Button type="button" variant="outline" disabled={history.isFetching || !active} onClick={() => { setCursor(null); history.refetch() }}>Refresh Run history</Button>
    {items && page.hasMore && typeof page.nextCursor === 'string' ? <Button type="button" variant="outline" disabled={history.isFetching} onClick={() => setCursor(page.nextCursor)}>Next Runs</Button> : null}
    {selected ? <section aria-label="Selected acquisition Run">
      <h4>Run {selected}</h4>
      <Button type="button" variant="outline" disabled={!active || !isAcquisitionRunId(selected) || detail.isFetching}
        onClick={() => detail.refetch()}>Refresh selected Run receipt</Button>
      {detail.isFetching ? <p role="status">Verifying Run receipt…</p> : !isAcquisitionRunId(selected) || detail.error || !run ? <p>Exact Run receipt unavailable in this revision. Refresh or inspect another recorded Run.</p>
        : <><p>{acquisitionRunLabel(run)}</p><p>Original basis: {run.basisStateVersion} · {run.currency?.replaceAll('_', ' ') || 'Currency unavailable'}</p>
          {run.predecessorRunId ? <Button type="button" variant="ghost" onClick={() => open(run.predecessorRunId)}>Inspect predecessor Run</Button> : null}
          {run.outcomes ? <ul>{run.outcomes.map(item => <li key={`${item.kind}-${item.inputIndex}`}>{item.kind} {item.inputIndex + 1}: {item.status.replaceAll('_', ' ')} · {item.evidenceObjectCount} evidence objects</li>)}</ul> : <p>{run.recovery}</p>}
          {!locked && canAcquire && ['FAILED', 'PARTIALLY_SUCCEEDED'].includes(run.status) ? <Button type="button" variant="outline" disabled={busy} onClick={() => onRetry(run)}>Prepare explicit retry of this Run</Button> : null}
        </>}
    </section> : null}
  </section>
}
