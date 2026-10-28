import { useSyncExternalStore } from 'react'
import { Card } from '../../components/Card'
import { Status } from '../../components/Status'
import { Button } from '../../components/Button'
import { useGetRuntimeSyntheticOutcomeRunQuery } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { controlledOutcomeRuntimeId, readControlledOutcome } from './controlledOutcomeModel.js'
import './ControlledOutcomePanel.css'

const stages = [
  ['FRAMEWORK_GUIDANCE', 'Framework Guidance'], ['WORKING_DRAFT', 'Working Draft'], ['ARL_MEANING_REVIEW', 'ARL'],
  ['OUTCOME_NARRATIVE_PLAN', 'Narrative Plan'], ['OUTPUT_SHAPING', 'Output Shaping'], ['RENDERED_EXPRESSION_RL', 'Rendered-expression / RL'],
]
export default function ControlledOutcomePanel({ runtimeInstanceId, customerId, tenantId, stateVersion }) {
  const nativeId = controlledOutcomeRuntimeId(runtimeInstanceId)
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const query = useGetRuntimeSyntheticOutcomeRunQuery({ runtimeInstanceId: nativeId, customerId, tenantId, sessionRevision },
    { skip: !nativeId || !customerId || !tenantId, refetchOnMountOrArgChange: true })
  if (!nativeId) return null
  const result = readControlledOutcome({ response: query.currentData, runtimeInstanceId: nativeId, customerId, tenantId, stateVersion,
    loading: query.isLoading || query.isFetching, error: query.error })
  const data = result.data
  return <section className="controlled-outcome" aria-label="Controlled synthetic Outcome Studio run">
    <Card><Card.Body>
      <h2>Controlled synthetic Outcome Studio</h2>
      <p>Development/Test only · non-authoritative. These receipts cannot become customer Approved Outputs or official VMF approval.</p>
      <Status variant={result.variant}>{result.status}</Status>
      {data ? <>
        {data.priorRuns?.length ? <section aria-label="Preserved earlier run">
          <h3>Preserved earlier run</h3>
          {data.priorRuns.map(run => <p key={run.resultEventId}>
            Earlier result: {run.status} · {run.failure?.failureCode || 'No failure recorded'}
            {run.failure?.details?.field ? ` · ${run.failure.details.field}` : ''}
            <br />Claim: <code>{run.claimEventId}</code> · Result: <code>{run.resultEventId}</code>
          </p>)}
          <p>The current continuation is a separate signed attempt. Earlier results remain unchanged.</p>
        </section> : null}
        {data.persistenceReadiness?.status !== 'READY' ? <p>Persistence prerequisite: {data.persistenceReadiness?.reason || 'Not verified'}. No stage result is implied.</p> : null}
        <p>{data.run.status === 'NOT_STARTED' ? 'Working Draft and ARL have not run.'
          : data.run.status === 'UNKNOWN' ? 'The native run status is UNKNOWN. Refresh reads the existing run without retrying it; no stage success is inferred.'
          : 'Stage outcomes below come from the native run receipts.'}</p>
        {data.run.failure ? <p role="status">Failure: {data.run.failure.failureCode || data.run.failure.code || 'Recorded failure'}{(data.run.failure.message || data.run.failure.safeReason) ? ` — ${data.run.failure.message || data.run.failure.safeReason}` : ''}</p> : null}
        {data.run.failure?.details?.field ? <p>Binding: <code>{data.run.failure.details.field}</code>
          {data.run.failure.details.activationId ? <span> · <code>{data.run.failure.details.activationId}</code></span> : null}</p> : null}
        <ol>{stages.map(([key, label]) => {
          const stage = data.stages?.find(row => row.stageKey === key)
          return <li key={key}><strong>{label}</strong>: {stage?.status || (['NOT_STARTED', 'FAILED'].includes(data.run.status) ? 'Not run' : data.run.resultEventId ? 'Not recorded' : 'Unconfirmed')}
            {stage?.stageExecutionId ? <span> · <code>{stage.stageExecutionId}</code></span> : null}
            {stage?.failure ? <p>{stage.failure.failureCode || stage.failure.code || 'Failed'}{(stage.failure.message || stage.failure.safeReason) ? ` — ${stage.failure.message || stage.failure.safeReason}` : ''}</p> : null}
          </li>
        })}</ol>
        {data.grr?.length ? <section aria-label="Persisted provider receipts">
          <h3>Persisted provider receipts</h3>
          <p>A provider receipt does not prove that its governed stage was saved or that ARL passed.</p>
          <ul>{data.grr.map(receipt => <li key={receipt.executionId}>
            {receipt.reusedProviderResult ? 'Reused saved provider result · ' : ''}
            {receipt.stageKey} · {receipt.stageLinkage === 'LINKED' ? 'Linked to stage' : 'Not linked to a saved stage'}
            <br />Execution: <code>{receipt.executionId}</code> · Artifact: <code>{receipt.runtimeArtifactId}</code>
          </li>)}</ul>
        </section> : null}
        <p>{data.completionSource ? 'This isolated continuation records Narrative Plan, Output Shaping and RL separately. Final asset persistence and delivery remain separate, held gates.' : 'Narrative Plan, Output Shaping, RL and final asset persistence are separate gates. They have not been executed by this run.'}</p>
        <details><summary>Native lineage receipts</summary><dl>
          {Object.entries({ Runtime: data.scope.runtimeInstanceId, State: data.basis.basisStateVersion,
            Snapshot: data.basis.snapshotId, 'Membership hash': data.basis.membershipHash,
            'Lock snapshot': data.basis.lockSnapshotId, 'Lock hash': data.basis.lockSnapshotHash,
            'Claim receipt': data.run.claimEventId, 'Result receipt': data.run.resultEventId }).map(([label, value]) =>
            <div key={label}><dt>{label}</dt><dd><code>{value || 'Not recorded'}</code></dd></div>)}
        </dl></details>
      </> : <p>Current scoped run receipts are unavailable; no draft, ARL or asset success is inferred.</p>}
      <Button variant="outline" disabled={query.isFetching || !customerId || !tenantId} onClick={() => query.refetch()}>Refresh run status</Button>
    </Card.Body></Card>
  </section>
}
