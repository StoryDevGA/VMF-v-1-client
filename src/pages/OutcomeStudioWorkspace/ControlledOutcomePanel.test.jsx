import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGetRuntimeSyntheticOutcomeRunQuery } from '../../store/api/runtimeInstanceApi.js'
import ControlledOutcomePanel from './ControlledOutcomePanel.jsx'
import { readControlledOutcome, controlledOutcomeRuntimeId } from './controlledOutcomeModel.js'
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({ useGetRuntimeSyntheticOutcomeRunQuery: vi.fn() }))
const scope = { runtimeInstanceId: '6ad715c91f39fea112115875', customerId: 'customer', tenantId: 'tenant' }
const fixture = () => ({ data: {
  classification: 'NON_AUTHORITATIVE_SYNTHETIC_DEV_TEST', authoritative: false, normalOutputAvailable: false, authorisesApproval: false,
  scope, basis: { basisStateVersion: 'state', snapshotId: 'snapshot', membershipHash: 'hash' },
  persistenceReadiness: { status: 'READY' }, run: { status: 'NOT_STARTED' }, stages: [],
} })
const arlFixture = () => {
  const response = fixture(), data = response.data
  data.run = { status: 'ARL_PASSED', claimEventId: 'native-claim', resultEventId: 'native-result' }
  data.stages = ['FRAMEWORK_GUIDANCE', 'WORKING_DRAFT', 'ARL_MEANING_REVIEW'].map((stageKey, index) => ({
    stageKey, status: 'SUCCEEDED', stageExecutionId: `native-stage-${index + 1}`, ...scope,
    requestId: '11111111-1111-4111-8111-111111111111', planId: 'outcome_kcp_22222222-2222-4222-8222-222222222222',
    draftId: 'outcome_draft_33333333-3333-4333-8333-333333333333',
    draftIterationId: 'outcome_draft_iteration_44444444-4444-4444-8444-444444444444', planFingerprint: 'a'.repeat(64),
    inputFingerprint: String(index + 1).repeat(64), outputFingerprint: String(index + 4).repeat(64), attemptFingerprint: String(index + 7).repeat(64),
  }))
  // These are the fields returned by the native run reader, not inferred from a readiness label.
  data.run.stageRefs = data.stages.map(stage => ({ stageKey: stage.stageKey, stageExecutionId: stage.stageExecutionId,
    status: stage.status, inputFingerprint: stage.inputFingerprint, outputFingerprint: stage.outputFingerprint,
    attemptFingerprint: stage.attemptFingerprint, materialHash: 'b'.repeat(64) }))
  return response
}
describe('native controlled outcome view', () => {
  beforeEach(() => useGetRuntimeSyntheticOutcomeRunQuery.mockReturnValue({ currentData: fixture(), refetch: vi.fn() }))
  it('shows not-run separately from ready infrastructure and prohibits customer outputs', () => {
    render(<ControlledOutcomePanel {...scope} />)
    expect(screen.getByText('Run not started')).toBeInTheDocument()
    expect(screen.getByText('Working Draft and ARL have not run.')).toBeInTheDocument()
    expect(screen.getByText(/cannot become customer Approved Outputs/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /execute|approve|publish|generate/i })).not.toBeInTheDocument()
  })
  it.each(['customer', 'tenant', 'runtime', 'state', 'classification', 'loading', 'error'])('does not expose late or incompatible %s receipts', kind => {
    const response = fixture(), input = { response, ...scope, stateVersion: 'state' }
    response.data.scope = { ...scope }
    if (kind === 'customer') response.data.scope.customerId = 'other'
    if (kind === 'tenant') response.data.scope.tenantId = 'other'
    if (kind === 'runtime') response.data.scope.runtimeInstanceId = 'other'
    if (kind === 'state') input.stateVersion = 'new'
    if (kind === 'classification') response.data.authoritative = true
    if (kind === 'loading') input.loading = true
    if (kind === 'error') input.error = { status: 500 }
    expect(readControlledOutcome(input).data).toBeNull()
  })
  it('shows infrastructure failure without claiming an ARL failure', () => {
    const response = fixture(); response.data.persistenceReadiness = { status: 'UNAVAILABLE', reason: 'INDEX_NOT_READY' }
    useGetRuntimeSyntheticOutcomeRunQuery.mockReturnValue({ currentData: response })
    render(<ControlledOutcomePanel {...scope} />)
    expect(screen.getByText('Execution unavailable')).toBeInTheDocument()
    expect(screen.getByText(/INDEX_NOT_READY/)).toBeInTheDocument()
    expect(screen.getByText('Working Draft and ARL have not run.')).toBeInTheDocument()
  })
  it('requires the actual successful three-stage chain for a synthetic ARL pass', () => {
    const response = fixture(); response.data.run.status = 'ARL_PASSED'
    expect(readControlledOutcome({ response, ...scope }).status).toBe('Run outcome unconfirmed')
    response.data.stages = ['FRAMEWORK_GUIDANCE', 'WORKING_DRAFT', 'ARL_MEANING_REVIEW'].map(stageKey => ({ stageKey, status: 'SUCCEEDED' }))
    expect(readControlledOutcome({ response, ...scope }).status).toBe('Run outcome unconfirmed')
    const native = arlFixture()
    expect(readControlledOutcome({ response: native, ...scope }).status).toBe('Synthetic ARL passed')
    native.data.stages[2].status = 'FAILED'
    expect(readControlledOutcome({ response: native, ...scope }).status).toBe('Run outcome unconfirmed')
  })
  it.each([
    ['missing stage ID', data => { delete data.stages[1].stageExecutionId }],
    ['duplicate stage ID', data => { data.stages[1].stageExecutionId = data.stages[0].stageExecutionId; data.run.stageRefs[1].stageExecutionId = data.stages[0].stageExecutionId }],
    ['duplicate stage', data => { data.stages.push({ ...data.stages[2] }) }],
    ['missing references', data => { delete data.run.stageRefs }],
    ['duplicate reference', data => { data.run.stageRefs[1] = { ...data.run.stageRefs[0] } }],
    ['different recorded ID', data => { data.run.stageRefs[1].stageExecutionId = 'other-native-stage' }],
    ['reordered stages', data => { data.stages.reverse() }],
    ['reordered references', data => { data.run.stageRefs.reverse() }],
    ['foreign runtime', data => { data.stages[1].runtimeInstanceId = 'other-runtime' }],
    ['foreign customer', data => { data.stages[1].customerId = 'other-customer' }],
    ['foreign tenant', data => { data.stages[1].tenantId = 'other-tenant' }],
    ['different request', data => { data.stages[1].requestId = 'another-request' }],
    ['different plan', data => { data.stages[2].planId = 'another-plan' }],
    ['different draft', data => { data.stages[1].draftId = 'another-draft' }],
    ['different iteration', data => { data.stages[1].draftIterationId = 'another-iteration' }],
    ['changed plan fingerprint', data => { data.stages[1].planFingerprint = 'c'.repeat(64) }],
    ['changed input fingerprint', data => { data.run.stageRefs[1].inputFingerprint = 'c'.repeat(64) }],
    ['changed output fingerprint', data => { data.run.stageRefs[1].outputFingerprint = 'c'.repeat(64) }],
    ['changed attempt fingerprint', data => { data.run.stageRefs[1].attemptFingerprint = 'c'.repeat(64) }],
    ['missing material hash', data => { delete data.run.stageRefs[1].materialHash }],
    ['missing claim', data => { delete data.run.claimEventId }],
    ['missing result', data => { delete data.run.resultEventId }],
    ['non-array stages', data => { data.stages = {} }],
  ])('keeps %s unconfirmed instead of promoting an ARL pass', (_label, alter) => {
    const response = arlFixture(); alter(response.data)
    expect(readControlledOutcome({ response, ...scope }).status).toBe('Run outcome unconfirmed')
  })
  it('renders a verified native chain without adding approval or generation actions', () => {
    useGetRuntimeSyntheticOutcomeRunQuery.mockReturnValue({ currentData: arlFixture() })
    render(<ControlledOutcomePanel {...scope} />)
    expect(screen.getByText('Synthetic ARL passed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /execute|approve|publish|generate/i })).not.toBeInTheDocument()
  })
  it('keeps failed and uncertain runs explicit', () => {
    const response = fixture(); response.data.run.status = 'FAILED'
    expect(readControlledOutcome({ response, ...scope }).status).toBe('Controlled run failed')
    response.data.run.status = 'UNKNOWN'
    expect(readControlledOutcome({ response, ...scope }).status).toBe('Run outcome unconfirmed')
  })
  it('shows the native safe failure reason as text when no message exists', () => {
    const response = fixture()
    response.data.run = { status: 'FAILED', failure: { failureCode: 'WORKING_DRAFT_PROVIDER_OUTPUT_INVALID', safeReason: 'Rejected claimReferences.sections[0].claimKeys <script>test</script>' } }
    response.data.stages = [{ stageKey: 'WORKING_DRAFT', status: 'FAILED', failure: { failureCode: 'WORKING_DRAFT_PROVIDER_OUTPUT_INVALID', safeReason: 'The native draft was rejected.' } }]
    useGetRuntimeSyntheticOutcomeRunQuery.mockReturnValue({ currentData: response })
    render(<ControlledOutcomePanel {...scope} />)
    expect(screen.getByText(/Rejected claimReferences.sections/)).toHaveTextContent('<script>test</script>')
    expect(document.querySelector('script')).toBeNull()
    expect(screen.getByText(/The native draft was rejected/)).toBeInTheDocument()
  })
  it('keeps a recorded message ahead of safeReason', () => {
    const response = fixture(); response.data.run = { status: 'FAILED', failure: { message: 'Exact native message', safeReason: 'Fallback reason' } }
    useGetRuntimeSyntheticOutcomeRunQuery.mockReturnValue({ currentData: response })
    render(<ControlledOutcomePanel {...scope} />)
    expect(screen.getByText(/Exact native message/)).toBeInTheDocument()
    expect(screen.queryByText(/Fallback reason/)).not.toBeInTheDocument()
  })
  it('shows the persisted binding failure and absent stage receipts without claiming an ARL failure', () => {
    const response = fixture()
    response.data.run = { status: 'UNKNOWN', resultEventId: 'result', failure: {
      failureCode: 'OUTCOME_FRAMEWORK_GUIDANCE_BINDING_INVALID', message: 'Plan binding invalid.',
      details: { field: 'assignedPack', activationId: 'exact-audience-activation' },
    } }
    useGetRuntimeSyntheticOutcomeRunQuery.mockReturnValue({ currentData: response })
    render(<ControlledOutcomePanel {...scope} />)
    expect(screen.getByText(/OUTCOME_FRAMEWORK_GUIDANCE_BINDING_INVALID/)).toBeInTheDocument()
    expect(screen.getByText('assignedPack')).toBeInTheDocument()
    expect(screen.getByText('exact-audience-activation')).toBeInTheDocument()
    expect(screen.getAllByText(/Not recorded/).length).toBeGreaterThanOrEqual(3)
    expect(screen.queryByText('Synthetic ARL passed')).not.toBeInTheDocument()
  })
  it('maps only the exact controlled fixture routes; labels confer no authority', () => {
    expect(controlledOutcomeRuntimeId('ss044-disposable-synthetic-20261013-r1-rev-2-0f316453-rev-3-12115875')).toBe(scope.runtimeInstanceId)
    expect(controlledOutcomeRuntimeId('Parlon')).toBe('')
    expect(controlledOutcomeRuntimeId('synthetic-unknown')).toBe('')
  })
  it('shows the preserved binding failure separately from the current continuation', () => {
    const response = fixture()
    response.data.priorRuns = [{ status: 'UNKNOWN', claimEventId: 'original-claim', resultEventId: 'original-result',
      failure: { failureCode: 'OUTCOME_FRAMEWORK_GUIDANCE_BINDING_INVALID', details: { field: 'assignedPack' } } }]
    response.data.run = { status: 'FAILED', resultEventId: 'continuation-result', failure: { failureCode: 'ARL_REVIEW_FAILED' } }
    response.data.stages = [{ stageKey: 'ARL_MEANING_REVIEW', status: 'FAILED' }]
    useGetRuntimeSyntheticOutcomeRunQuery.mockReturnValue({ currentData: response })
    render(<ControlledOutcomePanel {...scope} />)
    expect(screen.getByRole('region', { name: 'Preserved earlier run' })).toHaveTextContent('OUTCOME_FRAMEWORK_GUIDANCE_BINDING_INVALID')
    expect(screen.getByText('original-result')).toBeInTheDocument()
    expect(screen.getByText('Controlled run failed')).toBeInTheDocument()
    expect(screen.getByText(/Failure: ARL_REVIEW_FAILED/)).toBeInTheDocument()
    expect(screen.queryByText('Synthetic ARL passed')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /execute|approve|publish|retry/i })).not.toBeInTheDocument()
  })
  it('shows an unlinked persisted provider receipt without claiming a saved stage or ARL pass', () => {
    const response = fixture()
    response.data.run = { status: 'UNKNOWN', resultEventId: 'result', failure: { failureCode: 'OUTCOME_QUALITY_STAGE_PERSISTENCE_FAILED' } }
    response.data.grr = [{ stageKey: 'FRAMEWORK_GUIDANCE', stageLinkage: 'UNRESOLVED', executionId: 'provider-execution', runtimeArtifactId: 'provider-artifact', reusedProviderResult: true }]
    useGetRuntimeSyntheticOutcomeRunQuery.mockReturnValue({ currentData: response })
    render(<ControlledOutcomePanel {...scope} />)
    expect(screen.getByRole('region', { name: 'Persisted provider receipts' })).toHaveTextContent('Not linked to a saved stage')
    expect(screen.getByText('provider-artifact')).toBeInTheDocument()
    expect(screen.getByText(/Reused saved provider result/)).toBeInTheDocument()
    expect(screen.getByText(/does not prove that its governed stage/)).toBeInTheDocument()
    expect(screen.queryByText('Synthetic ARL passed')).not.toBeInTheDocument()
  })
})

const completionFixture = () => {
  const response = fixture()
  const data = response.data
  data.sourceRun = { status: 'ARL_PASSED', claimEventId: 'source-claim', resultEventId: 'source-result' }
  data.completionSource = { claimEventId: 'source-claim', resultEventId: 'source-result', workingDraftStageExecutionId: 'draft12', arlStageExecutionId: 'arl12' }
  data.run = { status: 'BLOCKED', claimEventId: 'completion-claim', resultEventId: 'completion-result', failure: { failureCode: 'SYNTHETIC_TEST_DELIVERY_HELD' } }
  data.stages = ['FRAMEWORK_GUIDANCE', 'WORKING_DRAFT', 'ARL_MEANING_REVIEW', 'OUTCOME_NARRATIVE_PLAN', 'OUTPUT_SHAPING', 'RENDERED_EXPRESSION_RL'].map(stageKey => ({
    stageKey, status: 'SUCCEEDED', stageExecutionId: stageKey === 'WORKING_DRAFT' ? 'draft12' : stageKey === 'ARL_MEANING_REVIEW' ? 'arl12' : stageKey,
  }))
  return response
}
describe('isolated downstream receipt display', () => {
  it('shows six saved stages without implying final asset delivery', () => {
    useGetRuntimeSyntheticOutcomeRunQuery.mockReturnValue({ currentData: completionFixture() })
    render(<ControlledOutcomePanel {...scope} />)
    expect(screen.getByText('Synthetic quality passed; delivery held')).toBeInTheDocument()
    for (const name of ['Narrative Plan', 'Output Shaping', 'Rendered-expression / RL']) expect(screen.getByText(name)).toBeInTheDocument()
    expect(screen.getByText(/Final asset persistence and delivery remain separate, held gates/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /execute|publish|approve|retry/i })).not.toBeInTheDocument()
  })
  it.each(['partial', 'failed-stage', 'duplicate', 'wrong-source', 'wrong-draft', 'no-result', 'other-gate'])('cannot promote an incompatible %s receipt', kind => {
    const response = completionFixture(), data = response.data
    if (kind === 'partial') data.stages.pop()
    if (kind === 'failed-stage') data.stages[5].status = 'FAILED'
    if (kind === 'duplicate') data.stages.push({ ...data.stages[5] })
    if (kind === 'wrong-source') data.sourceRun.resultEventId = 'other'
    if (kind === 'wrong-draft') data.completionSource.workingDraftStageExecutionId = 'other'
    if (kind === 'no-result') delete data.run.resultEventId
    if (kind === 'other-gate') data.run.failure.failureCode = 'UNKNOWN_GATE'
    expect(readControlledOutcome({ response, ...scope }).status).toBe('Run outcome unconfirmed')
  })
  it('shows preserved ARL PASS as a result rather than inventing a failure', () => {
    const response = completionFixture(); response.data.priorRuns = [response.data.sourceRun]
    useGetRuntimeSyntheticOutcomeRunQuery.mockReturnValue({ currentData: response })
    render(<ControlledOutcomePanel {...scope} />)
    expect(screen.getByRole('region', { name: 'Preserved earlier run' })).toHaveTextContent('ARL_PASSED · No failure recorded')
    expect(screen.queryByText(/Recorded failure/)).not.toBeInTheDocument()
  })
})

describe('completion receipt identity requirements', () => {
  it('rejects absent source identifiers even when both sides are absent', () => {
    const response = completionFixture(), data = response.data
    data.completionSource = {}; data.sourceRun = { status: 'ARL_PASSED' }
    data.stages.forEach(stage => delete stage.stageExecutionId)
    expect(readControlledOutcome({ response, ...scope }).status).toBe('Run outcome unconfirmed')
  })
  it.each(['claimEventId', 'resultEventId'])('requires completion %s', key => {
    const response = completionFixture(); delete response.data.run[key]
    expect(readControlledOutcome({ response, ...scope }).status).toBe('Run outcome unconfirmed')
  })
})
