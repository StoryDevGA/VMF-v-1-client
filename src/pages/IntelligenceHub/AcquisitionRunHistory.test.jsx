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

const searchReceiptRun = (status = 'SUCCEEDED') => {
  const value = controlledRun(), failed = status === 'FAILED', configuration = {
    configurationVersion: '12345678-1234-4123-8123-123456789abe', configurationHash: 'sha256:' + 'a'.repeat(64), saveAuditId: 'a'.repeat(24) }
  delete value.controlledReplayProvenance; delete value.outputStateVersion; delete value.audit.saveId
  Object.assign(value, { contractVersion: 'provider-free-search-run.v1', status, canonicalSaved: false, receiptRecorded: true,
    currency: 'HISTORICAL_OUTPUT', executionAttemptId: '12345678-1234-4123-8123-123456789abf', authority: 'VMF_UPDATE', acquisitionProfile: 'STANDARD',
    basisUpdatedAt: '2026-11-13T09:00:00.000Z', researchConfiguration: configuration,
    outcomes: [{ kind: 'SEARCH', inputIndex: 0, status: failed ? 'FAILED' : 'SUCCEEDED', evidenceObjectCount: 0 }],
    providerFreeSearch: { classification: 'LOCAL_SYNTHETIC_RECEIPT_ONLY', purpose: 'TAVILY_DISCOVERY_RECEIPT',
      authorityRef: 'ss049-provider-free-search-receipt.2026-11-13.v1', provider: 'TAVILY_SEARCH',
      recordHash: 'sha256:' + 'b'.repeat(64), rawResponseHash: 'sha256:' + 'c'.repeat(64),
      descriptorHash: 'sha256:' + 'd'.repeat(64), mappedResponseHash: 'sha256:' + 'e'.repeat(64), adaptationStatus: 'VALID',
      providerRequestId: failed ? null : 'synthetic-tavily-request', transportOutcome: status === 'PARTIALLY_SUCCEEDED' ? 'PARTIAL' : 'COMPLETE',
      httpStatus: failed ? 429 : 200, configuration: { configurationVersion: configuration.configurationVersion,
        configurationHash: configuration.configurationHash, basisStateVersion: value.basisStateVersion },
      discoveryItemCount: failed ? 0 : 1, liveExecutionEnabled: false, evidenceObjectCount: 0 } })
  return value
}
const showSearchReceipt = value => {
  reads.history = { currentData: { data: { contractVersion: 'acquisition-run.v1', scope: value.scope, items: [value], hasMore: false } } }
  reads.detail = { currentData: { data: value } }
}
describe('provider-free search receipt history', () => {
  it.each(['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED'])('shows %s as a saved receipt without sources, evidence acceptance or cancellation', status => {
    const value = searchReceiptRun(status); showSearchReceipt(value)
    mount({ scope: controlledScope }, `/app/intelligence?view=context&acquisitionRunId=${runId}`)
    expect(screen.getByRole('region', { name: 'Selected acquisition Run' })).toHaveTextContent(`${status.replaceAll('_', ' ')} · Search receipt recorded; no evidence saved`)
    expect(screen.getByText(/No live provider ran, no sources or evidence were saved/)).toBeVisible()
    expect(screen.getByText(value.providerFreeSearch.recordHash)).toBeVisible()
    expect(screen.getByText('Discovery results in fixture')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Cancel research run' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Prepare explicit retry/ })).not.toBeInTheDocument()
    expect(reads.cancel).not.toHaveBeenCalled()
  })
  it.each(['raw body', 'private config', 'live', 'evidence', 'source', 'output', 'save audit', 'cancel', 'active',
    'hash', 'configuration', 'mixed contract', 'retry pair', 'wrong actor', 'provider', 'count', 'partial empty', 'timeout status'])(
    'refuses malformed SEARCH receipt %s without borrowing legacy save rules', kind => {
      const value = searchReceiptRun()
      if (kind === 'raw body') value.providerFreeSearch.input = { responseText: 'PRIVATE_BODY_SENTINEL' }
      if (kind === 'private config') value.researchConfiguration.settings = { instructions: 'PRIVATE_BODY_SENTINEL' }
      if (kind === 'live') value.providerFreeSearch.liveExecutionEnabled = true
      if (kind === 'evidence') value.providerFreeSearch.evidenceObjectCount = 1
      if (kind === 'source') value.outcomes[0].sourceId = 'borrowed_source'
      if (kind === 'output') value.outputStateVersion = 'rsv2:invented'
      if (kind === 'save audit') value.audit.saveId = 'invented'
      if (kind === 'cancel') value.cancellation = { eligible: true }
      if (kind === 'active') value.status = 'RUNNING'
      if (kind === 'hash') value.providerFreeSearch.recordHash = 'invalid'
      if (kind === 'configuration') value.providerFreeSearch.configuration.configurationHash = 'sha256:' + 'f'.repeat(64)
      if (kind === 'mixed contract') value.contractVersion = 'acquisition-run.v1'
      if (kind === 'retry pair') value.predecessorRunId = value.requestKey
      if (kind === 'wrong actor') value.actorUserId = 'not-an-actor'
      if (kind === 'provider') value.providerFreeSearch.provider = 'OTHER_PROVIDER'
      if (kind === 'count') value.providerFreeSearch.discoveryItemCount = 5
      if (kind === 'partial empty') { value.status = 'PARTIALLY_SUCCEEDED'; value.providerFreeSearch.transportOutcome = 'PARTIAL'; value.providerFreeSearch.discoveryItemCount = 0 }
      if (kind === 'timeout status') { value.providerFreeSearch.transportOutcome = 'TIMEOUT'; value.providerFreeSearch.httpStatus = null }
      expect(readAcquisitionRun(value, controlledScope)).toBeNull()
    })
  it('keeps legacy and search receipts on the same ordinary page without presenting a receipt as accepted evidence', () => {
    const value = searchReceiptRun(), legacy = controlledRun()
    legacy.runId = '12345678-1234-4123-8123-123456789ac0'
    showSearchReceipt(value); reads.history.currentData.data.items.push(legacy)
    mount({ scope: controlledScope }, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.getByRole('button', { name: `Inspect Run ${value.runId}` })).toBeVisible()
    expect(screen.getByRole('button', { name: `View research run ${legacy.runId}` })).toBeVisible()
    expect(screen.queryByText('Run history unavailable. Refresh to verify recorded executions.')).not.toBeInTheDocument()
  })
  it('offers retry only through the current eligible research callback and preserves both predecessor IDs', async () => {
    const value = searchReceiptRun('FAILED'), retry = vi.fn(); showSearchReceipt(value)
    mount({ scope: controlledScope, onRetry: retry, canRetryResearch: () => true }, `/app/intelligence?acquisitionRunId=${runId}`)
    await userEvent.click(screen.getByRole('button', { name: 'Prepare explicit retry of this Run' }))
    expect(retry).toHaveBeenCalledOnce(); expect(retry).toHaveBeenCalledWith(value); expect(reads.cancel).not.toHaveBeenCalled()
  })
  it.each(['departure', 'permission', 'lock', 'session', 'unmount'])('refuses a retained search retry callback after %s', departure => {
    const value = searchReceiptRun('FAILED'), retry = vi.fn(); showSearchReceipt(value)
    const tree = overrides => <MemoryRouter initialEntries={[`/app/intelligence?acquisitionRunId=${runId}`]}>
      <AcquisitionRunHistory scope={controlledScope} active canAcquire onRetry={retry} canRetryResearch={() => true} {...overrides} />
    </MemoryRouter>
    const view = render(tree({})), button = screen.getByRole('button', { name: 'Prepare explicit retry of this Run' })
    const retained = button[Object.keys(button).find(key => key.startsWith('__reactProps'))].onClick
    if (departure === 'unmount') view.unmount()
    else if (departure === 'session') act(() => clearTokens())
    else view.rerender(tree(departure === 'departure' ? { active: false } : departure === 'lock' ? { locked: true } : { canAcquire: false }))
    act(() => retained()); expect(retry).not.toHaveBeenCalled()
    if (!['unmount', 'session'].includes(departure)) { view.rerender(tree({})); act(() => retained()); expect(retry).not.toHaveBeenCalled() }
  })
  it('only refreshes the selected saved receipt; reopening does not dispatch or cancel', async () => {
    const value = searchReceiptRun(); showSearchReceipt(value)
    mount({ scope: controlledScope }, `/app/intelligence?acquisitionRunId=${runId}`)
    await userEvent.click(screen.getByRole('button', { name: 'Refresh selected Run receipt' }))
    expect(reads.refreshDetail).toHaveBeenCalledOnce(); expect(reads.cancel).not.toHaveBeenCalled()
  })
})

const publicResearchRun = (status = 'SUCCEEDED', mode = 'OFFLINE') => {
  const value = searchReceiptRun(), stamp = '2026-11-16T10:00:00.000Z'
  delete value.providerFreeSearch; delete value.receiptRecorded
  Object.assign(value, { contractVersion: 'public-research-run.v1', plannerVersion: 'public-research-planner.v1', status,
    createdAt: stamp, startedAt: stamp, completedAt: stamp, canonicalSaved: true, outputStateVersion: 'rsv2:public-output', currency: 'CURRENT_OUTPUT',
    cancellation: { eligible: false, executionAttemptId: value.executionAttemptId },
    outcomes: [{ kind: 'SEARCH', inputIndex: 0, status: 'SUCCEEDED', evidenceObjectCount: 0 },
      { kind: 'REGISTRY', inputIndex: 0, status: 'SUCCEEDED', evidenceObjectCount: 0 },
      { kind: mode === 'OFFLINE' ? 'CONTROLLED' : 'WEBSITE', inputIndex: 0, status: 'SUCCEEDED', sourceId: 'controlled_original', evidenceObjectCount: 3 }],
    publicResearch: { mode, classification: mode === 'OFFLINE' ? 'CONTROLLED_PROVIDER_FREE_RESEARCH' : 'NATIVE_PUBLIC_RESEARCH',
      liveExecutionEnabled: mode === 'LIVE', planHash: 'sha256:' + 'a'.repeat(64), policyHash: 'sha256:' + 'b'.repeat(64),
      receiptHash: 'sha256:' + 'c'.repeat(64), releaseId: value.requestKey,
      operationCount: 3, completedOperationCount: 3, bytesRead: 100, reservedCostMicros: 0, elapsedMsRecorded: 50, modelTokens: 0,
      limits: { maxSearchRequests: 1, maxRegistryRequests: 1, maxPages: 1, maxPageBytes: 320000, maxJsonBytes: 16384,
        maxTotalBytes: 350000, maxElapsedMs: 10000, maxRequestMs: 1000, maxCostMicros: 0, searchRequestCostMicros: 0,
        registryRequestCostMicros: 0, concurrency: 1, retries: 0, redirects: 0, modelTokens: 0 },
      categories: ['SEARCH', 'WEBSITE', 'REGISTRY'].map(key => ({ key, status: 'SUCCEEDED', completedCount: 1,
        failedCount: 0, unknownCount: 0, evidenceObjectCount: key === 'WEBSITE' ? 3 : 0 })),
      receipts: ['SEARCH', 'REGISTRY', 'WEBSITE'].map((category, ordinal) => ({ ordinal, category, phase: 'RECORDED', inputIndex: 0,
        requestHash: 'sha256:' + 'd'.repeat(64), responseTextHash: 'sha256:' + 'e'.repeat(64), httpStatus: 200,
        bytesRead: category === 'WEBSITE' ? 80 : 10, elapsedMs: 10, providerRequestId: category === 'SEARCH' ? 'synthetic-request' : null,
        sourceId: category === 'WEBSITE' ? 'controlled_original' : null, evidenceObjectCount: category === 'WEBSITE' ? 3 : 0 })),
      qualifications: ['Synthetic offline material does not establish customer truth.'] } })
  value.audit.saveId = 'public-save'
  if (status !== 'SUCCEEDED') {
    value.currency = 'HISTORICAL_OUTPUT'; value.canonicalSaved = false; delete value.outputStateVersion; delete value.audit.saveId
    for (const item of value.outcomes) { item.evidenceObjectCount = 0; delete item.sourceId }
    for (const category of value.publicResearch.categories) { category.evidenceObjectCount = 0; category.status = status === 'PARTIALLY_SUCCEEDED' ? 'PARTIAL' : 'UNKNOWN' }
    for (const receipt of value.publicResearch.receipts) { receipt.evidenceObjectCount = 0; receipt.sourceId = null }
  }
  if (status === 'FAILED') {
    value.outcomes[2].status = 'FAILED'; value.publicResearch.categories[1].status = 'FAILED'
    Object.assign(value.publicResearch.receipts[2], { responseTextHash: null, httpStatus: null, bytesRead: 0, elapsedMs: 0 })
  }
  if (['QUEUED', 'RUNNING'].includes(status)) {
    delete value.canonicalSaved; delete value.outcomes; delete value.completedAt; delete value.audit
    if (status === 'QUEUED') delete value.startedAt
    value.currency = 'ACTIVE'; value.recovery = 'Read the recorded research Run before another action.'
    value.cancellation.eligible = true; value.publicResearch.completedOperationCount = 0
    value.publicResearch.bytesRead = 0; value.publicResearch.elapsedMsRecorded = 0
    for (const category of value.publicResearch.categories) { category.status = 'PENDING'; category.completedCount = 0 }
    value.publicResearch.receipts = status === 'QUEUED' ? [] : [{ ...value.publicResearch.receipts[0], phase: 'DISPATCHING',
      responseTextHash: null, httpStatus: null, bytesRead: 0, elapsedMs: 0, providerRequestId: null, sourceId: null, evidenceObjectCount: 0 }]
    value.publicResearch.operationCount = value.publicResearch.receipts.length
  }
  return value
}
describe('combined Public Research Run contract and existing history', () => {
  it.each(['PUBLIC null', 'PUBLIC array', 'PUBLIC string', 'SEARCH null', 'SEARCH array', 'SEARCH string'])(
    'refuses a malformed %s outcome without crashing history', kind => {
      const value = kind.startsWith('PUBLIC') ? publicResearchRun() : searchReceiptRun()
      value.outcomes[0] = kind.endsWith('null') ? null : kind.endsWith('array') ? [] : 'not an outcome'
      expect(readAcquisitionRun(value, controlledScope)).toBeNull()
      showSearchReceipt(value)
      mount({ scope: controlledScope }, `/app/intelligence?acquisitionRunId=${runId}`)
      expect(screen.getByText('Run history unavailable. Refresh to verify recorded executions.')).toBeVisible()
      expect(screen.getByText('Exact Run receipt unavailable in this revision. Refresh or inspect another recorded Run.')).toBeVisible()
      expect(reads.cancel).not.toHaveBeenCalled()
    })
  it.each(['OFFLINE', 'LIVE'])('keeps %s original capture separate from search/registry matches and acceptance', mode => {
    const value = publicResearchRun('SUCCEEDED', mode)
    value.publicResearch.qualifications.push('PENDING_HUMAN_REVIEW')
    showSearchReceipt(value)
    expect(readAcquisitionRun(value, controlledScope)).toEqual(value)
    mount({ scope: controlledScope }, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.getByRole('region', { name: 'Selected acquisition Run' })).toHaveTextContent('Original evidence saved; see Review for decisions')
    expect(screen.queryByText(/review pending|remain pending separate review/i)).not.toBeInTheDocument()
    expect(screen.getByText('These qualifications were recorded during acquisition. See Review for current evidence decisions.')).toBeVisible()
    expect(screen.getByRole('list', { name: 'Research qualifications' })).toHaveTextContent('PENDING_HUMAN_REVIEW')
    expect(screen.getByText(/Search discoveries and registry matches are not accepted evidence/)).toBeVisible()
    expect(screen.getByRole('list', { name: 'Recorded research categories' })).toHaveTextContent('3 saved evidence objects')
    expect(screen.getByRole('list', { name: 'Recorded research operations' })).toHaveTextContent('controlled_original')
    expect(reads.cancel).not.toHaveBeenCalled()
  })
  it.each(['QUEUED', 'RUNNING', 'PARTIALLY_SUCCEEDED', 'FAILED'])('shows only saved %s progress/outcomes without inventing original evidence', status => {
    const value = publicResearchRun(status); showSearchReceipt(value)
    expect(readAcquisitionRun(value, controlledScope)).toEqual(value)
    mount({ scope: controlledScope }, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.getByText('No original evidence has been saved by this Run.')).toBeVisible()
    expect(screen.queryByText(/Original evidence saved; see Review for decisions/)).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Recorded research categories' })).toHaveTextContent('0 saved evidence objects')
  })
  it('permits a receipt-only success only when original WEBSITE evidence was not selected', () => {
    const value = publicResearchRun('PARTIALLY_SUCCEEDED')
    value.status = 'SUCCEEDED'; value.publicResearch.categories.forEach(category => { category.status = 'SUCCEEDED' }); value.publicResearch.categories[1].status = 'NOT_SELECTED'; value.publicResearch.categories[1].completedCount = 0; value.outcomes.pop()
    value.publicResearch.receipts.pop(); value.publicResearch.operationCount = 2; value.publicResearch.completedOperationCount = 2
    expect(readAcquisitionRun(value, controlledScope)).toEqual(value)
    value.publicResearch.categories[1].status = 'EMPTY'
    expect(readAcquisitionRun(value, controlledScope)).toBeNull()
  })
  it('accepts a final partial pending-original save only with coherent saved anchors and counts', () => {
    const value = publicResearchRun(); value.status = 'PARTIALLY_SUCCEEDED'; value.publicResearch.categories[1].status = 'PARTIAL'
    expect(readAcquisitionRun(value, controlledScope)).toEqual(value)
    value.publicResearch.categories[1].evidenceObjectCount = 2
    expect(readAcquisitionRun(value, controlledScope)).toBeNull()
  })
  it.each(['raw body', 'headers', 'private config', 'classification', 'live flag', 'release', 'hash', 'provider evidence', 'provider source',
    'capture kind', 'capture receipt binding', 'success category failure', 'saved anchor', 'false save', 'duplicate category', 'category state', 'receipts overflow', 'duplicate ordinal',
    'dispatch response', 'provider ID', 'source ID', 'qualification length', 'qualification count', 'negative metric', 'unsafe integer', 'retry pair', 'model tokens'])(
    'fails closed on PUBLIC metadata contradiction %s', kind => {
      const value = publicResearchRun(), summary = value.publicResearch
      if (kind === 'raw body') summary.responseText = 'PRIVATE_SENTINEL'
      if (kind === 'headers') summary.receipts[0].headers = { Authorization: 'PRIVATE_SENTINEL' }
      if (kind === 'private config') value.researchConfiguration.settings = { instructions: 'PRIVATE_SENTINEL' }
      if (kind === 'classification') summary.classification = 'NATIVE_PUBLIC_RESEARCH'
      if (kind === 'live flag') summary.liveExecutionEnabled = true
      if (kind === 'release') summary.releaseId = value.runId
      if (kind === 'hash') summary.receiptHash = 'invented'
      if (kind === 'provider evidence') summary.categories[0].evidenceObjectCount = 1
      if (kind === 'provider source') value.outcomes[0].sourceId = 'invented'
      if (kind === 'capture kind') value.outcomes[2].kind = 'WEBSITE'
      if (kind === 'capture receipt binding') summary.receipts[2].sourceId = 'unrelated_source'
      if (kind === 'success category failure') summary.categories[0].status = 'FAILED'
      if (kind === 'saved anchor') delete value.audit.saveId
      if (kind === 'false save') value.canonicalSaved = false
      if (kind === 'duplicate category') summary.categories[2].key = 'SEARCH'
      if (kind === 'category state') summary.categories[0].status = 'ACCEPTED'
      if (kind === 'receipts overflow') summary.receipts = Array.from({length: 6}, (_, ordinal) => ({...summary.receipts[0], ordinal}))
      if (kind === 'duplicate ordinal') summary.receipts[1].ordinal = summary.receipts[0].ordinal
      if (kind === 'dispatch response') summary.receipts[0].phase = 'DISPATCHING'
      if (kind === 'provider ID') summary.receipts[0].providerRequestId = 'x'.repeat(121)
      if (kind === 'source ID') summary.receipts[2].sourceId = 'not/a/source'
      if (kind === 'qualification length') summary.qualifications = ['x'.repeat(181)]
      if (kind === 'qualification count') summary.qualifications = Array(9).fill('Unverified')
      if (kind === 'negative metric') summary.bytesRead = -1
      if (kind === 'unsafe integer') summary.elapsedMsRecorded = Number.MAX_SAFE_INTEGER + 1
      if (kind === 'retry pair') value.predecessorRunId = value.requestKey
      if (kind === 'model tokens') summary.modelTokens = 1
      expect(readAcquisitionRun(value, controlledScope)).toBeNull()
    })
  it('preserves a failed received-byte/timer overrun without presenting it as compliant success', () => {
    const value = publicResearchRun('FAILED')
    value.publicResearch.bytesRead = value.publicResearch.limits.maxTotalBytes + 100
    value.publicResearch.elapsedMsRecorded = value.publicResearch.limits.maxElapsedMs + 10
    value.publicResearch.receipts[2].bytesRead = value.publicResearch.limits.maxPageBytes + 100
    value.publicResearch.receipts[2].elapsedMs = value.publicResearch.limits.maxRequestMs + 10
    expect(readAcquisitionRun(value, controlledScope)).toEqual(value)
    const success = publicResearchRun(); success.publicResearch.bytesRead = success.publicResearch.limits.maxTotalBytes + 1
    expect(readAcquisitionRun(success, controlledScope)).toBeNull()
  })
  it('shows an absent response honestly rather than inventing HTTP status or bytes', () => {
    const value = publicResearchRun('FAILED'); showSearchReceipt(value)
    mount({ scope: controlledScope }, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.getByText('No HTTP status recorded')).toBeVisible()
    expect(screen.getByText('No response hash recorded')).toBeVisible()
  })
  it.each(['QUEUED', 'RUNNING'])('keeps PUBLIC %s cancellation immutable with zero saved evidence and no abort claim', stage => {
    const value = publicResearchRun(stage)
    value.status = 'CANCELLED'; value.completedAt = value.createdAt; value.canonicalSaved = false; value.currency = 'HISTORICAL_OUTPUT'
    value.audit = {admissionId: 'admission', terminalId: 'terminal', ...(stage === 'RUNNING' ? {startId: 'start'} : {})}
    value.cancellation = {eligible: false, executionAttemptId: value.executionAttemptId, stage, workerStopConfirmed: false}
    value.outcomes = ['SEARCH', 'REGISTRY', 'CONTROLLED'].map(kind => ({kind, inputIndex: 0, status: 'CANCELLED', evidenceObjectCount: 0}))
    value.publicResearch.categories.forEach(category => { category.status = 'CANCELLED' })
    expect(readAcquisitionRun(value, controlledScope)).toEqual(value)
    value.cancellation.workerStopConfirmed = true
    expect(readAcquisitionRun(value, controlledScope)).toBeNull()
  })
  it('uses the existing eligible cancellation command then exact read-back for an active PUBLIC Run', async () => {
    const value = publicResearchRun('RUNNING'); showSearchReceipt(value)
    const cancelled = structuredClone(value)
    cancelled.status = 'CANCELLED'; cancelled.completedAt = value.createdAt; cancelled.canonicalSaved = false; cancelled.currency = 'HISTORICAL_OUTPUT'
    cancelled.audit = {admissionId: 'admission', startId: 'start', terminalId: 'terminal'}
    cancelled.cancellation = {eligible: false, executionAttemptId: value.executionAttemptId, stage: 'RUNNING', workerStopConfirmed: false}
    cancelled.outcomes = ['SEARCH', 'REGISTRY', 'CONTROLLED'].map(kind => ({kind, inputIndex: 0, status: 'CANCELLED', evidenceObjectCount: 0}))
    cancelled.publicResearch.categories.forEach(category => { category.status = 'CANCELLED' })
    reads.cancel.mockReturnValue({unwrap: async () => ({data: cancelled})})
    reads.refreshDetail.mockReturnValue({unwrap: async () => ({data: cancelled})})
    mount({scope: controlledScope}, `/app/intelligence?acquisitionRunId=${runId}`)
    await userEvent.click(screen.getByRole('button', {name: 'Cancel research run'}))
    await screen.findByText(/Cancellation recorded. No evidence was saved by this Run/)
    expect(reads.cancel).toHaveBeenCalledWith(expect.objectContaining({runId, body: {executionAttemptId: value.executionAttemptId}}))
    expect(reads.refreshDetail).toHaveBeenCalledOnce()
  })
  it('keeps PUBLIC failed retry behind its eligible research callback rather than generic legacy retry', () => {
    const value = publicResearchRun('FAILED'); showSearchReceipt(value)
    mount({scope: controlledScope}, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.queryByRole('button', {name: 'Prepare explicit retry of this Run'})).not.toBeInTheDocument()
  })
})

it('refuses a retained PUBLIC cancellation handler after its permission is withdrawn', () => {
 const value = publicResearchRun('RUNNING'); showSearchReceipt(value)
 const tree = canAcquire => <MemoryRouter initialEntries={[`/app/intelligence?acquisitionRunId=${runId}`]}>
  <AcquisitionRunHistory scope={controlledScope} active canAcquire={canAcquire} />
 </MemoryRouter>
 const view = render(tree(true)), button = screen.getByRole('button', {name: 'Cancel research run'})
 const retained = button[Object.keys(button).find(key => key.startsWith('__reactProps'))].onClick
 view.rerender(tree(false)); act(() => retained())
 expect(reads.cancel).not.toHaveBeenCalled()
 view.rerender(tree(true)); act(() => retained())
 expect(reads.cancel).not.toHaveBeenCalled()
})

it.each(['NOT_SELECTED', 'NOT_APPLICABLE'].flatMap(status => ['completedCount', 'failedCount', 'unknownCount'].map(counter => [status, counter])))(
 'refuses inactive PUBLIC category %s with a positive %s', (status, counter) => {
  const value = publicResearchRun('FAILED'), category = value.publicResearch.categories[0]
  Object.assign(category, {status, completedCount: 0, failedCount: 0, unknownCount: 0}); category[counter] = 1
  expect(readAcquisitionRun(value, controlledScope)).toBeNull()
 })

it.each(['operation count', 'completed count', 'ordinal five'])('rejects PUBLIC receipt-ledger mismatch %s', kind => {
 const value = publicResearchRun('FAILED')
 if (kind === 'operation count') value.publicResearch.operationCount = 4
 if (kind === 'completed count') value.publicResearch.completedOperationCount = 2
 if (kind === 'ordinal five') value.publicResearch.receipts[0].ordinal = 5
 expect(readAcquisitionRun(value, controlledScope)).toBeNull()
})
