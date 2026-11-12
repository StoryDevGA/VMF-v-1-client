import { clearTokens, getSessionRevision } from '../../utils/tokenStorage.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import AcquisitionRunHistory from './AcquisitionRunHistory.jsx'
import { readAcquisitionRun } from './acquisitionRunContract.js'
const reads = vi.hoisted(() => ({ history: {}, detail: {}, historyArgs: vi.fn(), detailArgs: vi.fn(), refresh: vi.fn(), refreshDetail: vi.fn(), cancel: vi.fn() }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useCancelAcquisitionRunMutation: () => [reads.cancel],
  useGetAcquisitionRunsQuery: (...args) => { reads.historyArgs(...args); return { ...reads.history, refetch: reads.refresh } },
  useGetAcquisitionRunQuery: (...args) => { reads.detailArgs(...args); return { ...reads.detail, refetch: reads.refreshDetail } },
}))
const scope = { runtimeInstanceId: 'revision-key', customerId: 'customer-id', tenantId: 'tenant-id' }
const runId = '12345678-1234-4123-8123-123456789abc'
const run = { contractVersion: 'acquisition-run.v1', runId, requestKey: '12345678-1234-4123-8123-123456789abd',
  scope: { ...scope, runtimeInstanceKey: scope.runtimeInstanceId }, status: 'FAILED', canonicalSaved: false, basisStateVersion: 'rsv2:basis',
  outcomes: [{ kind: 'BRIEF', inputIndex: 0, status: 'FAILED', evidenceObjectCount: 0 }],
  audit: { admissionId: 'a', startId: 'b', terminalId: 'c' }, currency: 'HISTORICAL_OUTPUT' }
const Location = () => <p data-testid="location">{useLocation().search}</p>
const mount = (props = {}, route = '/app/intelligence?view=context&revisionId=revision-key') => render(<MemoryRouter initialEntries={[route]}>
  <AcquisitionRunHistory scope={scope} active canAcquire onRetry={vi.fn()} {...props} /><Location />
</MemoryRouter>)
beforeEach(() => {
  reads.cancel.mockReset(); reads.refresh.mockReset(); reads.refreshDetail.mockReset();
  reads.historyArgs.mockClear(); reads.detailArgs.mockClear(); reads.refresh.mockClear(); reads.refreshDetail.mockClear()
  reads.history = { currentData: { data: { contractVersion: 'acquisition-run.v1', scope: run.scope, items: [structuredClone(run)], hasMore: false } } }
  reads.detail = { currentData: { data: structuredClone(run) } }
})
describe('recorded acquisition Runs', () => {
  it('renders recovered unknown extraction without claiming zero extracted evidence', () => {
    reads.detail.currentData.data.reason = 'STOPPED_WORKER_RECOVERY'
    reads.detail.currentData.data.outcomes[0].reason = 'ORIGINAL_EXTRACTION_OUTCOME_UNCONFIRMED'
    mount({}, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.getByText(/Original extraction outcome unconfirmed. No evidence was saved/)).toBeVisible()
    expect(screen.queryByText(/0 evidence objects/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Prepare explicit retry of this Run' })).toBeEnabled()
  })
  it.each(['missing reason', 'mixed', 'count', 'saved'])('rejects malformed recovery %s', kind => {
    const value = reads.detail.currentData.data
    value.reason = 'STOPPED_WORKER_RECOVERY'; value.outcomes[0].reason = 'ORIGINAL_EXTRACTION_OUTCOME_UNCONFIRMED'
    if (kind === 'missing reason') delete value.reason
    if (kind === 'mixed') delete value.outcomes[0].reason
    if (kind === 'count') value.outcomes[0].evidenceObjectCount = 1
    if (kind === 'saved') { value.canonicalSaved = true; value.outputStateVersion = 'rsv2:fake'; value.audit.saveId = 'fake' }
    mount({}, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.getByText('Exact Run receipt unavailable in this revision. Refresh or inspect another recorded Run.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Prepare explicit retry of this Run' })).not.toBeInTheDocument()
  })
  it('refreshes the unavailable exact selected receipt while preserving scope and selected Run', async () => {
    reads.detail = { error: { status: 503 } }
    mount({}, `/app/intelligence?view=context&acquisitionRunId=${runId}`)
    await userEvent.click(screen.getByRole('button', { name: 'Refresh selected Run receipt' }))
    expect(reads.refreshDetail).toHaveBeenCalledOnce()
    expect(reads.refresh).not.toHaveBeenCalled()
    expect(screen.getByTestId('location')).toHaveTextContent(`acquisitionRunId=${runId}`)
    expect(reads.detailArgs).toHaveBeenLastCalledWith({ ...scope, runId, sessionRevision: getSessionRevision() }, { skip: false })
  })
  it.each([42, 'UNRECOGNISED'])('rejects unsafe or unrecognised currency %s without rendering it', currency => {
    reads.detail.currentData.data.currency = currency
    mount({}, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.getByText('Exact Run receipt unavailable in this revision. Refresh or inspect another recorded Run.')).toBeVisible()
    expect(screen.queryByRole('button', { name: /Prepare explicit retry/ })).not.toBeInTheDocument()
  })
  it('opens an exact Run preserving revision/tab scope in the shareable route', async () => {
    mount(); await userEvent.click(screen.getByRole('button', { name: `Inspect Run ${runId}` }))
    expect(screen.getByTestId('location')).toHaveTextContent(`view=context&revisionId=revision-key&acquisitionRunId=${runId}`)
    expect(reads.detailArgs).toHaveBeenLastCalledWith({ ...scope, runId, sessionRevision: getSessionRevision() }, { skip: false })
    expect(screen.getByRole('region', { name: 'Selected acquisition Run' })).toHaveTextContent('FAILED · Revision not saved')
  })
  it('prepares retry only from an exact read, while locked inspection stays available', async () => {
    const retry = vi.fn(); mount({ onRetry: retry }, `/app/intelligence?view=context&acquisitionRunId=${runId}`)
    await userEvent.click(screen.getByRole('button', { name: 'Prepare explicit retry of this Run' }))
    expect(retry).toHaveBeenCalledWith(run)
  })
  it('locked detail inspection offers no retry', () => {
    mount({ locked: true }, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.getByText('BRIEF 1: FAILED · 0 evidence objects')).toBeVisible()
    expect(screen.queryByRole('button', { name: /Prepare explicit retry/ })).not.toBeInTheDocument()
  })
  it.each(['other-scope', 'other-run', 'missing-contract', 'invalid-outcome'])('does not display a %s detail as the exact selected receipt', kind => {
    const invalid = structuredClone(run)
    if (kind === 'other-scope') invalid.scope.tenantId = 'other-tenant'
    if (kind === 'other-run') invalid.runId = run.requestKey
    if (kind === 'missing-contract') delete invalid.contractVersion
    if (kind === 'invalid-outcome') invalid.outcomes[0].evidenceObjectCount = 999
    reads.detail.currentData.data = invalid
    mount({}, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.getByText('Exact Run receipt unavailable in this revision. Refresh or inspect another recorded Run.')).toBeVisible()
    expect(screen.queryByRole('button', { name: /Prepare explicit retry/ })).not.toBeInTheDocument()
  })
  it('pages server history explicitly without presenting first-page counts as complete history', async () => {
    reads.history.currentData.data.hasMore = true; reads.history.currentData.data.nextCursor = 'safe-next-cursor'
    mount(); expect(screen.getByText('More recorded Runs are available. History entries are previews; open a Run to verify its receipt.')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Next Runs' }))
    expect(reads.historyArgs).toHaveBeenLastCalledWith({ ...scope, cursor: 'safe-next-cursor', sessionRevision: getSessionRevision() }, { skip: false })
  })
  it('does not render cached history from another scope or use cached data as current', () => {
    reads.history = { data: reads.history.currentData }
    mount(); expect(screen.getByText('Run history unavailable. Refresh to verify recorded executions.')).toBeVisible()
    expect(screen.queryByRole('button', { name: `Inspect Run ${runId}` })).not.toBeInTheDocument()
  })
})

const controlledScope = { runtimeInstanceId: 'controlled-fixture-revision', customerId: '1'.repeat(24), tenantId: '2'.repeat(24) }
const controlledRun = () => {
  const binding = { contractVersion: 'controlled-replay-binding.v1', bindingId: 'fixture.1', bindingVersion: 1,
    classification: 'CONTROLLED_SYNTHETIC_REPLAY', environment: 'DEVELOPMENT_TEST',
    scope: { customerId: controlledScope.customerId, tenantId: controlledScope.tenantId, runtimeInstanceId: '3'.repeat(24) },
    revisionId: controlledScope.runtimeInstanceId, actorUserId: '4'.repeat(24), basisStateVersion: 'rsv2:basis',
    fixture: { fixtureId: 'fixture-html', fixtureVersion: 1, fixtureFileSha256: 'a'.repeat(64), htmlSha256: 'b'.repeat(64), sourceUrl: 'https://fixture.example' } }
  return { ...structuredClone(run), contractVersion: 'controlled-acquisition-run.v1',
    actorUserId: binding.actorUserId, actionKey: 'BUILD_EVIDENCE_PACK',
    scope: { ...binding.scope, runtimeInstanceKey: controlledScope.runtimeInstanceId },
    status: 'SUCCEEDED', canonicalSaved: true, outputStateVersion: 'rsv2:recorded', currency: 'CURRENT_OUTPUT',
    outcomes: [{ kind: 'CONTROLLED', inputIndex: 0, status: 'SUCCEEDED', sourceId: 'controlled_original', evidenceObjectCount: 4 }],
    audit: { ...run.audit, saveId: 'save-audit' },
    controlledReplayProvenance: { binding, provenance: { contractVersion: 'controlled-replay-provenance.v1',
      classification: 'CONTROLLED_SYNTHETIC_REPLAY', operation: 'CONTROLLED_HTML_REPLAY_CAPTURE', adapter: 'controlled-html-replay-v1',
      bindingId: binding.bindingId, bindingVersion: binding.bindingVersion, bindingDigest: `sha256:${'c'.repeat(64)}`, ...binding.fixture } } }
}
const loadControlled = value => {
  reads.history.currentData.data = { contractVersion: 'acquisition-run.v1', scope: value.scope, items: [value], hasMore: false }
  reads.detail.currentData.data = value
}
describe('controlled provider-free Run continuity', () => {
  it('closes and reopens the same persisted identity, including after route reload, without retry', async () => {
    const value = controlledRun(), user = userEvent.setup(), retry = vi.fn()
    loadControlled(value)
    const view = mount({ scope: controlledScope, onRetry: retry }, `/app/intelligence?view=context&acquisitionRunId=${runId}`)
    expect(screen.getByText(/not a native research run/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Close research run', exact: true }))
    expect(screen.queryByRole('region', { name: 'Selected acquisition Run' })).not.toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent(`acquisitionRunId=${runId}`)
    expect(screen.getByTestId('location')).toHaveTextContent(`closedAcquisitionRunId=${runId}`)
    view.unmount()
    mount({ scope: controlledScope, onRetry: retry }, `/app/intelligence?view=context&acquisitionRunId=${runId}&closedAcquisitionRunId=${runId}`)
    expect(screen.queryByRole('region', { name: 'Selected acquisition Run' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'View research run', exact: true }))
    expect(screen.getByRole('region', { name: 'Selected acquisition Run' })).toHaveTextContent('SUCCEEDED · Revision saved')
    expect(reads.detailArgs).toHaveBeenLastCalledWith({ ...controlledScope, runId, sessionRevision: getSessionRevision() }, { skip: false })
    expect(retry).not.toHaveBeenCalled()
  })
  it('does not turn fixture permission into a controlled retry allowance', () => {
    const value = controlledRun()
    Object.assign(value, { status: 'FAILED', canonicalSaved: false, currency: 'HISTORICAL_OUTPUT' })
    delete value.outputStateVersion; delete value.audit.saveId
    value.outcomes = [{ kind: 'CONTROLLED', inputIndex: 0, status: 'FAILED', evidenceObjectCount: 0 }]
    loadControlled(value)
    mount({ scope: controlledScope }, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.getByText(/Controlled provider-free fixture/)).toBeVisible()
    expect(screen.queryByRole('button', { name: /Prepare explicit retry/ })).not.toBeInTheDocument()
  })
  it.each(['scope', 'actor', 'basis', 'classification', 'digest', 'fixture', 'outcome', 'legacy disguise'])('rejects inconsistent controlled %s', kind => {
    const value = controlledRun(), descriptor = value.controlledReplayProvenance
    if (kind === 'scope') descriptor.binding.scope.tenantId = '9'.repeat(24)
    if (kind === 'actor') descriptor.binding.actorUserId = '9'.repeat(24)
    if (kind === 'basis') descriptor.binding.basisStateVersion = 'rsv2:other'
    if (kind === 'classification') descriptor.provenance.classification = 'NATIVE'
    if (kind === 'digest') delete descriptor.provenance.bindingDigest
    if (kind === 'fixture') descriptor.binding.fixture.htmlSha256 = '9'.repeat(64)
    if (kind === 'outcome') value.outcomes[0].kind = 'WEBSITE'
    if (kind === 'legacy disguise') value.contractVersion = 'acquisition-run.v1'
    expect(readAcquisitionRun(value, controlledScope)).toBeNull()
  })
  it('shows active persisted progress without claiming closing cancels a Run', () => {
    const value = controlledRun()
    Object.assign(value, { status: 'RUNNING', currency: 'ACTIVE', recovery: 'Execution outcome is unconfirmed.' })
    delete value.outcomes; delete value.canonicalSaved; delete value.outputStateVersion; delete value.audit
    loadControlled(value)
    mount({ scope: controlledScope }, `/app/intelligence?acquisitionRunId=${runId}&closedAcquisitionRunId=${runId}`)
    expect(screen.getByRole('region', { name: 'Selected acquisition Run' })).toHaveTextContent('Cancellation requires an eligible controlled research attempt.')
    expect(screen.queryByRole('button', { name: 'Close research run' })).not.toBeInTheDocument()
  })
  it('does not let a closed-route flag hide an unavailable exact receipt', () => {
    loadControlled(controlledRun())
    reads.detail.error = { status: 503 }
    mount({ scope: controlledScope }, `/app/intelligence?acquisitionRunId=${runId}&closedAcquisitionRunId=${runId}`)
    expect(screen.getByText('Exact Run receipt unavailable in this revision. Refresh or inspect another recorded Run.')).toBeVisible()
    expect(screen.queryByText(/is closed in this view/)).not.toBeInTheDocument()
  })
})

const activeResearchRun = () => {
 const value = controlledRun(), stamp = '2026-11-12T12:00:00.000Z'
 value.status = 'RUNNING'; value.currency = 'ACTIVE'; value.startedAt = stamp; value.basisUpdatedAt = stamp
 delete value.outcomes; delete value.canonicalSaved; delete value.outputStateVersion; delete value.audit
 value.recovery = 'Outcome unconfirmed. Inspect this Run.'
 value.researchConfiguration = { configurationVersion: runId, configurationHash: 'sha256:' + 'd'.repeat(64), saveAuditId: '5'.repeat(24),
   scope: value.scope, basisStateVersion: value.basisStateVersion, basisUpdatedAt: stamp }
 value.cancellation = { eligible: true, executionAttemptId: '12345678-1234-4123-8123-123456789abe' }
 return value
}
const cancelledResearchRun = (stage = 'RUNNING') => {
 const value = activeResearchRun()
 value.status = 'CANCELLED'; value.currency = 'HISTORICAL_OUTPUT'; value.canonicalSaved = false; value.reason = 'CANCELLED_BEFORE_SAVE'
 value.outcomes = [{ kind: 'CONTROLLED', inputIndex: 0, status: 'CANCELLED', evidenceObjectCount: 0, reason: 'CANCELLED_BEFORE_SAVE' }]
 value.audit = { admissionId: 'a', terminalId: 'c', ...(stage === 'RUNNING' ? { startId: 'b' } : {}) }
 value.cancellation = { ...value.cancellation, eligible: false, stage, workerStopConfirmed: false }
 if (stage === 'QUEUED') delete value.startedAt
 return value
}
describe('durable controlled cancellation', () => {
 it.each(['read-only', 'locked', 'busy', 'selection', 'ineligible', 'failed read', 'loading', 'departure and return', 'session', 'unmount'])(
  'never dispatches a retained cancellation after %s', kind => {
   loadControlled(activeResearchRun())
   const props = { scope: controlledScope, active: true, canAcquire: true, requestedRunId: runId }
   const tree = changes => <MemoryRouter><AcquisitionRunHistory {...props} {...changes} /><Location /></MemoryRouter>
   const view = render(tree({}))
   const button = screen.getByRole('button', { name: 'Cancel research run' })
   const retained = button[Object.keys(button).find(key => key.startsWith('__reactProps'))].onClick
   if (kind === 'unmount') view.unmount()
   else if (kind === 'session') act(() => clearTokens())
   else {
    if (kind === 'failed read') reads.detail.error = { status: 503 }
    if (kind === 'loading') reads.detail.isFetching = true
    if (kind === 'ineligible') {
     const value = activeResearchRun(); value.cancellation.eligible = false
     reads.detail.currentData = { data: value }
    }
    view.rerender(tree(kind === 'read-only' ? {canAcquire: false} : kind === 'locked' ? {locked: true}
     : kind === 'busy' ? {busy: true} : kind === 'selection' ? {requestedRunId: '12345678-1234-4123-8123-123456789abb'}
     : kind === 'departure and return' ? {active: false} : {}))
   }
   act(() => retained())
   expect(reads.cancel).not.toHaveBeenCalled()
   if (!['session', 'unmount'].includes(kind)) {
    reads.detail.error = undefined; reads.detail.isFetching = false; loadControlled(activeResearchRun())
    view.rerender(tree({}))
    act(() => retained())
    expect(reads.cancel).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Cancel research run' })).toBeEnabled()
   }
  })
 it('cancels only explicitly and verifies the saved receipt before reporting success', async () => {
  loadControlled(activeResearchRun()); const cancelled = cancelledResearchRun(), retry = vi.fn()
  reads.cancel.mockReturnValue({ unwrap: () => Promise.resolve({ data: cancelled }) })
  reads.refreshDetail.mockImplementation(() => { reads.detail.currentData = { data: cancelled }; return { unwrap: () => Promise.resolve({ data: cancelled }) } })
  mount({ scope: controlledScope, onRetry: retry }, '/app/intelligence?acquisitionRunId=' + runId)
  expect(reads.cancel).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Cancel research run' }))
  await screen.findByText(/Cancellation recorded/)
  expect(reads.cancel).toHaveBeenCalledWith({ ...controlledScope, sessionRevision: getSessionRevision(), runId, body: { executionAttemptId: cancelled.cancellation.executionAttemptId } })
  expect(reads.refreshDetail).toHaveBeenCalledOnce(); expect(reads.refresh).toHaveBeenCalledOnce(); expect(retry).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Cancel research run' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Close research run' }))
  await userEvent.click(screen.getAllByRole('button', { name: 'View research run' }).at(-1))
  expect(screen.getByText(/This is not confirmation of worker or provider abort/)).toBeVisible()
 })
 it.each(['read-only', 'locked', 'failed read', 'ineligible'])('does not offer cancellation for %s', kind => {
  loadControlled(activeResearchRun())
  if (kind === 'failed read') reads.detail.error = { status: 503 }
  if (kind === 'ineligible') reads.detail.currentData.data.cancellation.eligible = false
  mount({ scope: controlledScope, canAcquire: kind !== 'read-only', locked: kind === 'locked' }, '/app/intelligence?acquisitionRunId=' + runId)
  expect(screen.queryByRole('button', { name: 'Cancel research run' })).not.toBeInTheDocument(); expect(reads.cancel).not.toHaveBeenCalled()
 })
 it.each(['command failure', 'readback mismatch'])('does not falsely report cancellation after %s', async kind => {
  loadControlled(activeResearchRun())
  reads.cancel.mockReturnValue({ unwrap: () => kind === 'command failure' ? Promise.reject({ data: { error: { message: 'Cancellation audit unavailable.' } } }) : Promise.resolve({ data: cancelledResearchRun() }) })
  reads.refreshDetail.mockReturnValue({ unwrap: () => Promise.resolve({ data: activeResearchRun() }) })
  mount({ scope: controlledScope }, '/app/intelligence?acquisitionRunId=' + runId)
  await userEvent.click(screen.getByRole('button', { name: 'Cancel research run' }))
  await screen.findByText(kind === 'command failure' ? /Cancellation audit unavailable/ : /Cancellation may have saved/)
  expect(screen.queryByText(/Cancellation recorded/)).not.toBeInTheDocument(); expect(reads.cancel).toHaveBeenCalledOnce()
 })
 it.each(['scope', 'session', 'departure and return'])('ignores a late cancellation response after %s', async kind => {
  let finish; loadControlled(activeResearchRun())
  reads.cancel.mockReturnValue({ unwrap: () => new Promise(resolve => { finish = resolve }) })
  const route = '/app/intelligence?acquisitionRunId=' + runId
  const view = mount({ scope: controlledScope }, route)
  await userEvent.click(screen.getByRole('button', { name: 'Cancel research run' }))
  if (kind === 'session') act(() => clearTokens())
  if (kind === 'scope') view.rerender(<MemoryRouter><AcquisitionRunHistory scope={{ ...controlledScope, tenantId: '9'.repeat(24) }} active canAcquire /><Location /></MemoryRouter>)
  if (kind === 'departure and return') {
   view.rerender(<MemoryRouter><AcquisitionRunHistory scope={controlledScope} active={false} canAcquire /><Location /></MemoryRouter>)
   view.rerender(<MemoryRouter><AcquisitionRunHistory scope={controlledScope} active canAcquire /><Location /></MemoryRouter>)
  }
  await act(async () => finish({ data: cancelledResearchRun() }))
  await waitFor(() => expect(reads.refreshDetail).not.toHaveBeenCalled())
  expect(reads.refresh).not.toHaveBeenCalled(); expect(screen.queryByText(/Cancellation recorded/)).not.toBeInTheDocument()
 })
 it.each(['QUEUED', 'RUNNING'])('reloads a saved %s cancellation with close/view and no retry', stage => {
  const value = cancelledResearchRun(stage); expect(readAcquisitionRun(value, controlledScope)).not.toBeNull(); loadControlled(value)
  mount({ scope: controlledScope }, '/app/intelligence?acquisitionRunId=' + runId)
  expect(screen.getAllByText(/CANCELLED · Revision not saved/)[0]).toBeVisible()
  expect(screen.getByRole('button', { name: 'Close research run' })).toBeEnabled()
  expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
 })
 it.each(['worker stop', 'queued start', 'saved evidence', 'native disguise', 'missing metadata'])('refuses malformed cancellation: %s', kind => {
  const value = cancelledResearchRun('QUEUED')
  if (kind === 'worker stop') value.cancellation.workerStopConfirmed = true
  if (kind === 'queued start') value.audit.startId = 'invented'
  if (kind === 'saved evidence') value.outcomes[0].evidenceObjectCount = 1
  if (kind === 'native disguise') { value.contractVersion = 'acquisition-run.v1'; delete value.controlledReplayProvenance }
  if (kind === 'missing metadata') delete value.cancellation
  expect(readAcquisitionRun(value, controlledScope)).toBeNull()
 })
})

it('offers fixture retry only from the current parent eligibility and preserves signed predecessor presentation', async () => {
 const value = controlledRun(), retry = vi.fn()
 value.status = 'FAILED'; value.canonicalSaved = false; value.currency = 'HISTORICAL_OUTPUT'; delete value.outputStateVersion; delete value.audit.saveId
 value.outcomes = [{ kind: 'CONTROLLED', inputIndex: 0, status: 'FAILED', evidenceObjectCount: 0 }]
 value.executionAttemptId = '12345678-1234-4123-8123-123456789acf'
 value.researchConfiguration = { configurationVersion: '12345678-1234-4123-8123-123456789acc' }
 value.predecessorRunId = '12345678-1234-4123-8123-123456789ace'; value.predecessorExecutionAttemptId = '12345678-1234-4123-8123-123456789acd'
 loadControlled(value)
 mount({ scope: controlledScope, canRetryResearch: row => row === value, onRetry: retry }, '/app/intelligence?acquisitionRunId=' + runId)
 await userEvent.click(screen.getByRole('button', { name: 'Prepare explicit retry of this Run' }))
 expect(retry).toHaveBeenCalledWith(value); expect(reads.cancel).not.toHaveBeenCalled()
 expect(screen.getByText(/Predecessor Attempt:/)).toHaveTextContent(value.predecessorExecutionAttemptId)
 const malformed = structuredClone(value); delete malformed.predecessorExecutionAttemptId
 expect(readAcquisitionRun(malformed, controlledScope)).toBeNull()
})

it('selects only the Run resolved from an owned request and preserves Close/View identity', async () => {
 const value = controlledRun(); loadControlled(value)
 mount({ scope: controlledScope, requestedRunId: value.runId }, '/app/intelligence?researchRequestKey=' + value.requestKey)
 expect(screen.getByRole('region', { name: 'Selected acquisition Run' })).toBeVisible()
 await userEvent.click(screen.getByRole('button', { name: 'Close research run' }))
 expect(screen.getByTestId('location')).toHaveTextContent('acquisitionRunId=' + value.runId)
 expect(screen.getByTestId('location')).toHaveTextContent('closedAcquisitionRunId=' + value.runId)
})
