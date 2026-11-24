import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { useGetAcquisitionRunsQuery, useGetAcquisitionRunQuery, useCancelAcquisitionRunMutation } from '../../store/api/runtimeInstanceApi.js'
import { isAcquisitionRunId, isControlledAcquisitionRun, isProviderFreeSearchRun, isPublicResearchRun, readAcquisitionRun, acquisitionRunLabel, isTerminalAcquisitionRun, ORIGINAL_EXTRACTION_UNCONFIRMED } from './acquisitionRunContract.js'

export default function AcquisitionRunHistory(props) {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  return <ScopedRunHistory key={JSON.stringify([props.scope, sessionRevision])} {...props} sessionRevision={sessionRevision} />
}
function ScopedRunHistory({ scope, active, locked, canAcquire, busy, onRetry, canRetryResearch, sessionRevision, requestedRunId }) {
  const [cursor, setCursor] = useState(null)
  const [params, setParams] = useSearchParams()
  const selected = params.get('acquisitionRunId') || (isAcquisitionRunId(requestedRunId) ? requestedRunId : null)
  const history = useGetAcquisitionRunsQuery({ ...scope, cursor, sessionRevision }, { skip: !active })
  const detail = useGetAcquisitionRunQuery({ ...scope, runId: selected, sessionRevision }, { skip: !active || !isAcquisitionRunId(selected) })
  const page = history.currentData?.data
  const items = page?.contractVersion === 'acquisition-run.v1' && Array.isArray(page.items) && page.items.length <= 25
    && page.scope?.runtimeInstanceKey === scope.runtimeInstanceId && page.scope?.customerId === scope.customerId
    && page.scope?.tenantId === scope.tenantId && typeof page.hasMore === 'boolean'
    && (!page.hasMore || typeof page.nextCursor === 'string' && page.nextCursor.length > 0 && page.nextCursor.length <= 256)
    && new Set(page.items.map(row => row?.runId)).size === page.items.length
    && page.items.every(row => readAcquisitionRun(row, scope)) ? page.items : null
  const candidate = readAcquisitionRun(detail.currentData?.data, scope)
  const run = !detail.error && !detail.isFetching && (params.getAll('acquisitionRunId').length === 1 || params.getAll('acquisitionRunId').length === 0 && selected === requestedRunId) && candidate?.runId === selected ? candidate : null
  const closed = Boolean(run && isTerminalAcquisitionRun(run)
    && params.get('closedAcquisitionRunId') === selected && params.getAll('closedAcquisitionRunId').length === 1)
  const open = runId => { const next = new URLSearchParams(params); next.set('acquisitionRunId', runId); next.delete('closedAcquisitionRunId'); setParams(next) }
  const close = () => {
    if (!run || !isTerminalAcquisitionRun(run)) return
    const next = new URLSearchParams(params); next.set('acquisitionRunId', run.runId); next.set('closedAcquisitionRunId', run.runId); setParams(next)
  }
  const [cancelRun] = useCancelAcquisitionRunMutation()
  const cancellationOwner = JSON.stringify([selected, active, locked, canAcquire])
  const [cancelState, setCancelState] = useState({ owner: cancellationOwner, cancelling: false, feedback: '' })
  if (cancelState.owner !== cancellationOwner) setCancelState({ owner: cancellationOwner, cancelling: false, feedback: '' })
  const cancelling = cancelState.cancelling, cancelFeedback = cancelState.feedback
  const setCancelling = value => setCancelState(previous => ({ ...previous, cancelling: value }))
  const setCancelFeedback = value => setCancelState(previous => ({ ...previous, feedback: value }))
  const mounted = useRef(true), generation = useRef(0), inFlight = useRef(false), current = useRef('')
  const owner = JSON.stringify([scope, sessionRevision, selected, active, locked, canAcquire])
  current.current = owner
  const commandFrame = useRef(null)
  const commandToken = Symbol('cancel-command-frame')
  useLayoutEffect(() => {
    commandFrame.current = commandToken
    return () => { if (commandFrame.current === commandToken) commandFrame.current = null }
  })
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current += 1 } }, [])
  useEffect(() => { if (!active || locked || !canAcquire) generation.current += 1 }, [active, locked, canAcquire])
  useEffect(() => { generation.current += 1 }, [selected])
  const prepareRetry = () => {
    if (!mounted.current || commandFrame.current !== commandToken || current.current !== owner || getSessionRevision() !== sessionRevision
      || !active || locked || !canAcquire || busy || !run) return
    if ((isControlledAcquisitionRun(run) || isProviderFreeSearchRun(run) || isPublicResearchRun(run)) && !canRetryResearch?.(run)) return
    onRetry(run)
  }
  const cancel = async () => {
    if (!mounted.current || commandFrame.current !== commandToken || current.current !== owner || getSessionRevision() !== sessionRevision
      || !active || locked || !canAcquire || busy || !run?.cancellation?.eligible || inFlight.current) return
    const epoch = generation.current, attemptId = run.cancellation.executionAttemptId
    const isCurrent = () => mounted.current && current.current === owner && generation.current === epoch && getSessionRevision() === sessionRevision
    inFlight.current = true; setCancelling(true); setCancelFeedback('')
    try {
      const response = await cancelRun({ ...scope, sessionRevision, runId: selected, body: { executionAttemptId: attemptId } }).unwrap()
      if (!isCurrent()) return
      const cancelled = readAcquisitionRun(response?.data, scope)
      if (cancelled?.status !== 'CANCELLED' || cancelled.runId !== selected || cancelled.cancellation.executionAttemptId !== attemptId)
        throw new Error('Cancellation response could not be verified. Refresh the Run receipt.')
      const readback = await detail.refetch().unwrap()
      if (!isCurrent()) return
      const verified = readAcquisitionRun(readback?.data, scope)
      if (verified?.status !== 'CANCELLED' || verified.runId !== selected || verified.cancellation.executionAttemptId !== attemptId)
        throw new Error('Cancellation may have saved, but read-back was not verified. Refresh the Run receipt.')
      setCancelFeedback('Cancellation recorded. No evidence was saved by this Run. Previously saved material is unchanged.')
      history.refetch()
    } catch (error) {
      if (isCurrent()) setCancelFeedback(error?.data?.error?.message || error.message || 'Cancellation could not be verified. Refresh the Run receipt before trying again.')
    } finally { inFlight.current = false; if (isCurrent()) setCancelling(false) }
  }
  return <section aria-label="Acquisition Run history" className="intelligence-hub__run-history">
    <h3>Acquisition Run history</h3>
    <p>Progress comes from saved Run receipts. Refresh to check its recorded state; closing this view does not stop the Run.</p>
    {cancelFeedback ? <p role="status">{cancelFeedback}</p> : null}
    <p>Each Run records an explicit acquisition operation. Batch is a display grouping; legacy attempts have no inferred Run.</p>
    {history.isFetching ? <p role="status">Loading acquisition Runs…</p> : history.error || !items ? <p>Run history unavailable. Refresh to verify recorded executions.</p>
      : items.length ? <ul>{items.map(row => <li key={row.runId}><Button type="button" variant="ghost" onClick={() => open(row.runId)}>{(isControlledAcquisitionRun(row) || isPublicResearchRun(row)) ? 'View research run' : 'Inspect Run'} {row.runId}</Button> {acquisitionRunLabel(row)}{isControlledAcquisitionRun(row) ? ' · controlled provider-free fixture' : ''}</li>)}</ul>
        : <p>No acquisition Runs recorded in this revision.</p>}
    {items ? <p>{page.hasMore ? 'More recorded Runs are available.' : 'End of this history page.'} History entries are previews; open a Run to verify its receipt.</p> : null}
    <Button type="button" variant="outline" disabled={history.isFetching || !active} onClick={() => { setCursor(null); history.refetch() }}>Refresh Run history</Button>
    {items && page.hasMore && typeof page.nextCursor === 'string' ? <Button type="button" variant="outline" disabled={history.isFetching} onClick={() => setCursor(page.nextCursor)}>Next Runs</Button> : null}
    {selected && closed ? <p>Run {selected} is closed in this view, not deleted. <Button type="button" variant="outline" onClick={() => open(selected)}>{(isControlledAcquisitionRun(run) || isPublicResearchRun(run)) ? 'View research run' : 'View Run'}</Button></p> : null}
    {selected && !closed ? <section aria-label="Selected acquisition Run">
      <h4>Run {selected}</h4>
      <Button type="button" variant="outline" disabled={!active || !isAcquisitionRunId(selected) || detail.isFetching}
        onClick={() => detail.refetch()}>Refresh selected Run receipt</Button>
      {detail.isFetching ? <p role="status">Verifying Run receipt…</p> : !isAcquisitionRunId(selected) || detail.error || !run ? <p>Exact Run receipt unavailable in this revision. Refresh or inspect another recorded Run.</p>
        : <><p>{acquisitionRunLabel(run)}</p><p>Original basis: {run.basisStateVersion} · {run.currency?.replaceAll('_', ' ') || 'Currency unavailable'}</p>
          {isControlledAcquisitionRun(run) ? <p>Controlled provider-free fixture. This is not a native research run, provider result or evidence acceptance.</p> : null}
          {isPublicResearchRun(run) ? <>
            <p>{run.publicResearch.mode === 'OFFLINE'
              ? 'Offline Public Research uses controlled synthetic search, registry and captured source material. Its request identity is not a native release.'
              : 'Native Public Research is bound to this exact server-issued release.'} Search discoveries and registry matches are not accepted evidence. Evidence decisions are recorded separately in Review.</p>
            {!run.canonicalSaved ? <p>No original evidence has been saved by this Run.</p> : null}
            <dl className="intelligence-hub__inspection-facts">
              <div><dt>Mode</dt><dd>{run.publicResearch.mode}</dd></div>
              <div><dt>Recorded operations</dt><dd>{run.publicResearch.completedOperationCount} of {run.publicResearch.operationCount}</dd></div>
              <div><dt>Bytes read</dt><dd>{run.publicResearch.bytesRead}</dd></div>
              <div><dt>Recorded elapsed time</dt><dd>{run.publicResearch.elapsedMsRecorded} ms</dd></div>
              <div><dt>Reserved cost</dt><dd>{run.publicResearch.reservedCostMicros} micros</dd></div>
              <div><dt>{run.publicResearch.mode === 'OFFLINE' ? 'Synthetic request identity' : 'Release identity'}</dt><dd>{run.publicResearch.releaseId}</dd></div>
              <div><dt>Plan hash</dt><dd>{run.publicResearch.planHash}</dd></div>
              <div><dt>Policy hash</dt><dd>{run.publicResearch.policyHash}</dd></div>
              <div><dt>Ledger receipt hash</dt><dd>{run.publicResearch.receiptHash}</dd></div>
            </dl>
            <ul aria-label="Recorded research categories">{run.publicResearch.categories.map(category => <li key={category.key}>
              {category.key}{category.key === 'WEBSITE' && run.publicResearch.mode === 'OFFLINE' ? ' · controlled synthetic capture' : ''}: {category.status.replaceAll('_', ' ')}
              {' · '}{category.completedCount} completed · {category.failedCount} failed · {category.unknownCount} unknown · {category.evidenceObjectCount} saved evidence objects
            </li>)}</ul>
            <ul aria-label="Recorded research operations">{run.publicResearch.receipts.map(receipt => <li key={receipt.ordinal}>
              {receipt.category} {receipt.inputIndex + 1}: {receipt.phase} · {receipt.bytesRead} bytes · {receipt.elapsedMs} ms
              <dl className="intelligence-hub__inspection-facts"><div><dt>Request hash</dt><dd>{receipt.requestHash}</dd></div>
                <div><dt>Response hash</dt><dd>{receipt.responseTextHash ?? 'No response hash recorded'}</dd></div>
                <div><dt>HTTP status</dt><dd>{receipt.httpStatus ?? 'No HTTP status recorded'}</dd></div>
                {receipt.providerMessage ? <div><dt>Provider response</dt><dd>{receipt.providerMessage}</dd></div> : null}
                <div><dt>Provider request ID</dt><dd>{receipt.providerRequestId ?? 'Not recorded'}</dd></div>
                <div><dt>Saved source ID</dt><dd>{receipt.sourceId ?? 'No original source saved'}</dd></div></dl>
            </li>)}</ul>
            <p>A recorded response-text hash may identify an available prefix. A withheld or missing response has no recorded hash. These records do not establish complete retrieval or native source authority.</p>
            {run.publicResearch.qualifications.length ? <>
              <p>These qualifications were recorded during acquisition. See Review for current evidence decisions.</p>
              <ul aria-label="Research qualifications">{run.publicResearch.qualifications.map((qualification, index) => <li key={index}>{qualification}</li>)}</ul>
            </> : null}
          </> : null}
          {isProviderFreeSearchRun(run) ? <><p>Provider-free search fixture receipt. No live provider ran, no sources or evidence were saved, and no evidence was accepted.</p>
            <dl className="intelligence-hub__inspection-facts"><div><dt>Provider shape</dt><dd>{run.providerFreeSearch.provider}</dd></div>
              <div><dt>Discovery results in fixture</dt><dd>{run.providerFreeSearch.discoveryItemCount}</dd></div>
              <div><dt>Adaptation</dt><dd>{run.providerFreeSearch.adaptationStatus}</dd></div>
              <div><dt>Receipt hash</dt><dd>{run.providerFreeSearch.recordHash}</dd></div>
              <div><dt>Response hash</dt><dd>{run.providerFreeSearch.rawResponseHash}</dd></div>
              <div><dt>Request descriptor hash</dt><dd>{run.providerFreeSearch.descriptorHash}</dd></div></dl></> : null}
          {isTerminalAcquisitionRun(run) ? <Button type="button" variant="outline" onClick={close}>{(isControlledAcquisitionRun(run) || isPublicResearchRun(run)) ? 'Close research run' : 'Close Run'}</Button>
            : <p>The persisted Run is {run.status.toLowerCase()}. Closing an inspection does not cancel it. {isPublicResearchRun(run) ? 'Cancellation requires an eligible recorded research attempt.' : 'Cancellation requires an eligible controlled research attempt.'}</p>}
          {!locked && canAcquire && active && run.cancellation?.eligible ? <Button type="button" variant="outline" disabled={busy || cancelling} loading={cancelling} onClick={cancel}>Cancel research run</Button> : null}
          {run.status === 'CANCELLED' ? <p>Run cancelled before evidence was saved. Work already in progress may finish; it cannot save results for this Run. This is not confirmation of worker or provider abort.</p> : null}
          {run.predecessorRunId ? <Button type="button" variant="ghost" onClick={() => open(run.predecessorRunId)}>Inspect predecessor Run</Button> : null}
          {run.predecessorExecutionAttemptId ? <p>Predecessor Attempt: {run.predecessorExecutionAttemptId}. This Run has a separate execution identity.</p> : null}
          {run.executionAttemptId ? <p>Execution Attempt: {run.executionAttemptId}</p> : null}
          {run.outcomes ? <ul>{run.outcomes.map(item => <li key={`${item.kind}-${item.inputIndex}`}>{item.kind} {item.inputIndex + 1}: {item.reason === ORIGINAL_EXTRACTION_UNCONFIRMED
            ? 'Original extraction outcome unconfirmed. No evidence was saved by this Run.'
            : item.status === 'CANCELLED' ? 'Cancelled before evidence was saved. No result from this Run was admitted.'
            : <>{item.status.replaceAll('_', ' ')} · {item.evidenceObjectCount} evidence objects</>}</li>)}</ul> : <p>{run.recovery}</p>}
          {!locked && canAcquire && active && ((isControlledAcquisitionRun(run) || isProviderFreeSearchRun(run) || isPublicResearchRun(run)) ? canRetryResearch?.(run) : ['FAILED', 'PARTIALLY_SUCCEEDED'].includes(run.status)) ? <Button type="button" variant="outline" disabled={busy} onClick={prepareRetry}>Prepare explicit retry of this Run</Button> : null}
        </>}
    </section> : null}
  </section>
}
