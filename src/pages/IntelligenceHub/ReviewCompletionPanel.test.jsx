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
    decisionCount: 2, complete: true, confirmedReadinessBlockers: 1 }, canComplete: true, ...changes } })
const receipt = { receiptId: 'record-one', currency: 'CURRENT', completedAt: '2026-10-05T09:00:00Z',
  rationale: 'Recorded human rationale.', actorUserId: 'reviewer-one', auditId: 'audit-one' }
beforeEach(() => { vi.clearAllMocks(); state.buttons.clear(); state.query = { currentData: make() }; state.refetch.mockResolvedValue({ data: make() }) })
const confirm = async () => {
  const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: /Review Completion rationale/ }), 'Explicit review of every mandatory decision.')
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Record Review Completion' }))
}
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
