import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import ReviewCompletionPanel from './ReviewCompletionPanel.jsx'
import { readCompletion } from './reviewCompletionModel.js'
import { clearTokens, getSessionRevision, setTokens } from '../../utils/tokenStorage.js'

const state = vi.hoisted(() => ({ query: {}, mutate: vi.fn(), refetch: vi.fn(), buttons: new Map(), queryArgs: null }))
vi.mock('../../components/Button', async original => {
  const actual = await original()
  return { ...actual, Button: props => { state.buttons.set(props.children, props); return <actual.Button {...props} /> } }
})
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetReviewCompletionQuery: args => { state.queryArgs = args; return { ...state.query, refetch: state.refetch } },
  useCompleteReviewMutation: () => [state.mutate],
}))
const scope = { runtimeInstanceId: 'revision-one', workspaceId: 'workspace-one', customerId: 'customer-one', tenantId: 'tenant-one' }
const make = (changes = {}) => ({ data: { contractVersion: 'intelligence-review-completion.v1',
  scope: { ...scope, runtimeInstanceKey: scope.runtimeInstanceId, rootRuntimeInstanceKey: scope.workspaceId },
  population: { completeness: 'COMPLETE', hash: 'a'.repeat(64), pendingEvidence: 0, pendingFindings: 0,
    evidenceCount: 2, sourceCount: 1, decisionCount: 2, complete: true, confirmedReadinessBlockers: 1 }, canComplete: true, ...changes } })
const receipt = { receiptId: 'record-one', currency: 'CURRENT', completedAt: '2026-10-05T09:00:00Z',
  rationale: 'Recorded human rationale.', actorUserId: 'reviewer-one', auditId: 'audit-one' }
beforeEach(() => { vi.clearAllMocks(); state.buttons.clear(); state.query = { currentData: make() }; state.refetch.mockResolvedValue({ data: make() }) })
const confirm = async () => {
  const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: /Review Completion rationale/ }), 'Explicit review of every mandatory decision.')
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Record Review Completion' }))
}
it('shows compact completion truth and inspects its receipt without exposing attestation inputs', async () => {
  const user=userEvent.setup();render(<ReviewCompletionPanel scope={scope} compact />)
  expect(screen.getByRole('heading',{name:'Review completion'})).toBeInTheDocument()
  expect(screen.getByText('Not complete')).toBeInTheDocument()
  expect(screen.queryByRole('textbox',{name:'Review Completion rationale'})).not.toBeInTheDocument()
  await user.click(screen.getByRole('button',{name:'Receipt and completion basis'}))
  expect(screen.getByRole('dialog',{name:'Completion basis and receipt'})).toHaveTextContent('No Review Completion receipt is recorded')
  expect(screen.queryByRole('textbox',{name:'Review Completion rationale'})).not.toBeInTheDocument()
  const trigger=screen.getByRole('button',{name:'Receipt and completion basis'})
  await user.click(screen.getByRole('button',{name:'Return to Review'}))
  expect(document.activeElement).toBe(trigger)
})
it('retains existing rationale, confirmation and command guards inside compact confirmation', async () => {
  const user=userEvent.setup();render(<ReviewCompletionPanel scope={scope} compact />)
  await user.click(screen.getByRole('button',{name:'Confirm review completion'}))
  expect(screen.getByRole('textbox',{name:'Review Completion rationale'})).toBeEnabled()
  expect(screen.getByRole('button',{name:'Record Review Completion'})).toBeDisabled()
  expect(state.mutate).not.toHaveBeenCalled()
})
it('keeps locked compact review inspection available while its confirmation stays disabled', async () => {
  const user=userEvent.setup();render(<ReviewCompletionPanel scope={scope} compact locked />)
  expect(screen.getByRole('button',{name:'Confirm review completion'})).toBeDisabled()
  await user.click(screen.getByRole('button',{name:'Receipt and completion basis'}))
  expect(screen.getByRole('dialog')).toHaveTextContent('locked revision permits inspection only')
})
it('clears a compact receipt on population departure so returning cannot reopen it', () => {
  const view=render(<ReviewCompletionPanel scope={scope} compact />)
  fireEvent.click(screen.getByRole('button',{name:'Receipt and completion basis'}))
  state.query={currentData:make({population:{completeness:'COMPLETE',hash:'b'.repeat(64),pendingEvidence:0,pendingFindings:0,decisionCount:2,complete:true,confirmedReadinessBlockers:0}})}
  view.rerender(<ReviewCompletionPanel scope={scope} compact />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  state.query={currentData:make()};view.rerender(<ReviewCompletionPanel scope={scope} compact />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('requires explicit rationale and confirmation even with zero outstanding decisions', async () => {
  render(<ReviewCompletionPanel scope={scope} />)
  expect(screen.getByRole('button', { name: 'Record Review Completion' })).toBeDisabled()
  expect(screen.getByText(/confirmed contradiction.*independent readiness blockers/)).toBeInTheDocument()
  expect(state.mutate).not.toHaveBeenCalled()
})
it.each(['pending', 'locked', 'error', 'wrong-scope', 'loading'])('fails closed for %s', kind => {
  if (kind === 'pending') state.query.currentData = make({ canComplete: false, population: { ...make().data.population, pendingEvidence: 1, complete: false } })
  if (kind === 'error') state.query.error = { status: 503 }
  if (kind === 'loading') state.query.isFetching = true
  if (kind === 'wrong-scope') state.query.currentData = make({ scope: { ...make().data.scope, tenantId: 'other' } })
  render(<ReviewCompletionPanel scope={scope} locked={kind === 'locked'} />)
  expect(screen.getByRole('button', { name: 'Record Review Completion' })).toBeDisabled()
  expect(state.mutate).not.toHaveBeenCalled()
})
it('records exact scope/basis with a stable request identity, then verifies reads without granting readiness', async () => {
  const result = make({ receipt, latestReceipt: receipt })
  state.mutate.mockReturnValue({ unwrap: () => Promise.resolve(result) })
  state.refetch.mockResolvedValue({ data: result })
  const refreshed = vi.fn().mockResolvedValue(true)
  render(<ReviewCompletionPanel scope={scope} onRecorded={refreshed} />)
  await confirm()
  await waitFor(() => expect(screen.getByText(/Review Completion recorded and current reads refreshed/)).toBeInTheDocument())
  expect(state.mutate).toHaveBeenCalledWith(expect.objectContaining({ ...scope,
    body: expect.objectContaining({ expectedPopulationHash: 'a'.repeat(64), confirm: true,
      requestKey: expect.stringMatching(/^[a-f0-9-]{36}$/) }) }))
  expect(refreshed).toHaveBeenCalledOnce()
})
it('ambiguous failure blocks retries until refresh and retains same request identity', async () => {
  state.mutate.mockReturnValue({ unwrap: () => Promise.reject({ data: { error: { message: 'Transport failed' } } }) })
  render(<ReviewCompletionPanel scope={scope} />)
  await confirm()
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Transport failed'))
  const first = state.mutate.mock.calls[0][0].body.requestKey
  expect(screen.getByRole('button', { name: 'Record Review Completion' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Refresh Review Completion' }))
  await userEvent.click(screen.getByRole('button', { name: 'Record Review Completion' }))
  expect(state.mutate.mock.calls[1][0].body.requestKey).toBe(first)
})
it('ignores a response after scope changes or unmount', async () => {
  let resolve
  state.mutate.mockReturnValue({ unwrap: () => new Promise(done => { resolve = done }) })
  const refreshed = vi.fn()
  const view = render(<ReviewCompletionPanel scope={scope} onRecorded={refreshed} />)
  await confirm()
  view.unmount()
  resolve(make({ receipt, latestReceipt: receipt }))
  await Promise.resolve()
  expect(refreshed).not.toHaveBeenCalled()
  expect(state.refetch).not.toHaveBeenCalled()
})
it('read-only readiness displays recorded currency without exposing a mutation', () => {
  state.query.currentData = make({ latestReceipt: { ...receipt, currency: 'STALE' } })
  render(<ReviewCompletionPanel scope={scope} readOnly />)
  expect(screen.getByText('Stale — reassessment required')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Record Review Completion' })).not.toBeInTheDocument()
})
it('leaving during post-write refresh does not run stale-view callback', async () => {
  let resolve
  state.mutate.mockReturnValue({ unwrap: () => Promise.resolve(make({ receipt, latestReceipt: receipt })) })
  state.refetch.mockImplementation(() => new Promise(done => { resolve = done }))
  const refreshed = vi.fn()
  const view = render(<ReviewCompletionPanel scope={scope} onRecorded={refreshed} />)
  await confirm()
  await waitFor(() => expect(state.refetch).toHaveBeenCalledOnce())
  view.unmount()
  resolve({ data: make({ receipt, latestReceipt: receipt }) })
  await Promise.resolve()
  expect(refreshed).not.toHaveBeenCalled()
})
it('stale receipt on post-write refresh retains blocker and focuses recovery', async () => {
  state.mutate.mockReturnValue({ unwrap: () => Promise.resolve(make({ receipt, latestReceipt: receipt })) })
  state.refetch.mockResolvedValue({ data: make({ latestReceipt: { ...receipt, currency: 'STALE' } }) })
  render(<ReviewCompletionPanel scope={scope} />)
  await confirm()
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('current reads could not be verified'))
  expect(screen.getByRole('alert')).toHaveFocus()
  expect(screen.getByRole('button', { name: 'Record Review Completion' })).toBeDisabled()
})
it('rejects missing completeness and wrong root context', () => {
  expect(readCompletion(make({ population: { ...make().data.population, completeness: 'PARTIAL' } }), scope)).toBeNull()
  expect(readCompletion(make(), { ...scope, workspaceId: 'wrong-root' })).toBeNull()
})

it.each(['logout', 'replacement login'])('discards prior confirmation and rejects retained refresh after %s', async change => {
  state.mutate.mockReturnValue({ unwrap: () => Promise.resolve(make({ receipt, latestReceipt: receipt })) })
  render(<ReviewCompletionPanel scope={scope} />)
  await userEvent.type(screen.getByRole('textbox', { name: /Review Completion rationale/ }), 'Explicit review of the current decision population.')
  await userEvent.click(screen.getByRole('checkbox'))
  const originalForm = screen.getByRole('checkbox').closest('form')
  const retainedRefresh = state.buttons.get('Refresh Review Completion').onClick
  act(() => { if (change === 'logout') clearTokens(); else setTokens({ accessToken: 'replacement', refreshToken: 'replacement' }) })
  await retainedRefresh()
  fireEvent.submit(originalForm)
  expect(state.mutate).not.toHaveBeenCalled()
  expect(state.refetch).not.toHaveBeenCalled()
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  expect(state.queryArgs.sessionRevision).toBe(getSessionRevision())
})

it('ignores a mutation completion after logout without running refresh or success callbacks', async () => {
  let resolve
  state.mutate.mockReturnValue({ unwrap: () => new Promise(done => { resolve = done }) })
  const refreshed = vi.fn()
  render(<ReviewCompletionPanel scope={scope} onRecorded={refreshed} />)
  await confirm()
  act(() => clearTokens())
  await act(async () => resolve(make({ receipt, latestReceipt: receipt })))
  expect(state.refetch).not.toHaveBeenCalled()
  expect(refreshed).not.toHaveBeenCalled()
  expect(screen.queryByText(/Review Completion recorded and current reads refreshed/)).not.toBeInTheDocument()
})

it('ignores post-write refresh after a replacement login and preserves only current session feedback', async () => {
  let resolve
  state.mutate.mockReturnValue({ unwrap: () => Promise.resolve(make({ receipt, latestReceipt: receipt })) })
  state.refetch.mockImplementation(() => new Promise(done => { resolve = done }))
  const refreshed = vi.fn()
  render(<ReviewCompletionPanel scope={scope} onRecorded={refreshed} />)
  await confirm()
  await waitFor(() => expect(state.refetch).toHaveBeenCalledOnce())
  act(() => setTokens({ accessToken: 'replacement', refreshToken: 'replacement' }))
  await act(async () => resolve({ data: make({ receipt, latestReceipt: receipt }) }))
  expect(refreshed).not.toHaveBeenCalled()
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  expect(screen.queryByText(/Review Completion recorded and current reads refreshed/)).not.toBeInTheDocument()
})

it('preserves local confirmation through ordinary token rotation in the same session', async () => {
  render(<ReviewCompletionPanel scope={scope} />)
  await userEvent.type(screen.getByRole('textbox', { name: /Review Completion rationale/ }), 'Explicit current-session review rationale.')
  await userEvent.click(screen.getByRole('checkbox'))
  const session = getSessionRevision()
  act(() => setTokens({ accessToken: 'rotated', refreshToken: 'rotated' }, { preserveSession: true }))
  expect(getSessionRevision()).toBe(session)
  expect(screen.getByRole('checkbox')).toBeChecked()
  expect(screen.getByRole('textbox', { name: /Review Completion rationale/ })).toHaveValue('Explicit current-session review rationale.')
})

const verifiedReceipt = () => ({ ...receipt, populationHash: 'a'.repeat(64),
  populationPolicy: 'revision-evidence-contradiction-decisions.v1', observedStateVersion: 'saved-state-one',
  membershipStatus: 'VERIFIED', membership: {
    contractVersion: 'review-population-membership.v1', ...make().data.scope,
    policy: 'revision-evidence-contradiction-decisions.v1', revisionNumber: 1,
    membershipHash: 'a'.repeat(64), observedStateVersion: 'saved-state-one', auditVerified: true, lockFrozen: false,
    evidence: [{ id: 'original-object', sourceId: 'original-source', basisHash: 'b'.repeat(64), status: 'ACCEPTED',
      decision: { status: 'ACCEPTED', reviewerId: 'a'.repeat(24), reviewedAt: '2026-11-17T17:00:00.000Z',
        rationale: 'Accepted as a recorded first-party source assertion.' },
      support: { sourceId: 'original-source', originalContentHash: 'sha256:' + 'c'.repeat(64),
        captureTextHash: 'sha256:' + 'd'.repeat(64), excerptHash: 'sha256:' + 'e'.repeat(64),
        coordinateSystem: 'UTF16_CODE_UNIT', start: 10, end: 30 } }],
    sources: [{ id: 'original-source', basisHash: 'f'.repeat(64), sourceRef: 'https://example.com/',
      contentHash: 'sha256:' + 'c'.repeat(64), capture: { sourceId: 'original-source',
        originalContentHash: 'sha256:' + 'c'.repeat(64), captureTextHash: 'sha256:' + 'd'.repeat(64),
        capturedAt: '2026-11-17T12:00:00.000Z' } }], contradictions: [],
  } })

it('reads stored signed membership and decision details without implying a workspace lock', async () => {
  state.query.currentData = make({ latestReceipt: verifiedReceipt() })
  render(<ReviewCompletionPanel scope={scope} compact />)
  await userEvent.click(screen.getByRole('button', { name: 'Receipt and completion basis' }))
  await userEvent.click(screen.getByText('Inspect recorded completion'))
  expect(screen.getByText('Signed Review population verified. This immutable receipt does not lock or publish the workspace.')).toBeInTheDocument()
  expect(screen.getByText('a'.repeat(64))).toBeInTheDocument()
  await userEvent.click(screen.getByText('original-object · ACCEPTED'))
  expect(screen.getByText('Accepted as a recorded first-party source assertion.')).toBeInTheDocument()
  expect(screen.getByText('UTF-16 [10, 30)')).toBeInTheDocument()
  expect(screen.getByText('sha256:' + 'e'.repeat(64))).toBeInTheDocument()
  expect(state.mutate).not.toHaveBeenCalled()
})

it.each(['signature', 'hash', 'scope', 'duplicate', 'rationale', 'source-locator', 'span'])(
  'refuses malformed recorded membership: %s', kind => {
  const value = verifiedReceipt()
  if (kind === 'signature') value.membership.auditVerified = false
  if (kind === 'hash') value.membership.membershipHash = 'c'.repeat(64)
  if (kind === 'scope') value.membership.tenantId = 'another-tenant'
  if (kind === 'duplicate') value.membership.evidence.push(value.membership.evidence[0])
  if (kind === 'rationale') value.membership.evidence[0].decision.rationale = {}
  if (kind === 'source-locator') value.membership.sources[0].sourceRef = {}
  if (kind === 'span') value.membership.evidence[0].support.end = 0
  expect(readCompletion(make({ latestReceipt: value }), scope)).toBeNull()
  state.query.currentData = make({ latestReceipt: value })
  render(<ReviewCompletionPanel scope={scope} compact />)
  expect(screen.getByText('Unavailable')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Confirm review completion' })).toBeDisabled()
})

it('keeps older receipt metadata readable without inventing recorded membership', async () => {
  state.query.currentData = make({ latestReceipt: { ...receipt, membershipStatus: 'LEGACY_NOT_RECORDED' } })
  render(<ReviewCompletionPanel scope={scope} compact readOnly />)
  await userEvent.click(screen.getByRole('button', { name: 'Receipt and completion basis' }))
  await userEvent.click(screen.getByText('Inspect recorded completion'))
  expect(screen.getByText('Detailed membership was not recorded in this older receipt.')).toBeInTheDocument()
  expect(screen.queryByText(/Signed Review population verified/)).not.toBeInTheDocument()
})
