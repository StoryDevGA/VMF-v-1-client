import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash, webcrypto } from 'node:crypto'
import useHubReviewActions, { readHubReviewAuthority } from './useHubReviewActions.js'
import { verifyFindingDecisionReceipt } from './findingDecisionReceipt.js'

const mutations = vi.hoisted(() => ({ evidence: vi.fn(), finding: vi.fn() }))
const session = vi.hoisted(() => ({ revision: 0 }))
vi.mock('../../utils/tokenStorage.js', () => ({ getSessionRevision: () => session.revision }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useReviewRuntimeDiscoveryEvidenceMutation: () => [mutations.evidence],
  useReviewRuntimeDiscoveryContradictionMutation: () => [mutations.finding],
}))
const stamp = '2026-10-04T10:00:00.000Z'
const authority = { contractVersion: 'intelligence-review-actions.v1', control: {
  id: 'revision', runtimeInstanceKey: 'revision-key', customerId: 'customer', tenantId: 'tenant', stateVersion: 'rsv2:5b4d1f42-d7e2-4a3f-af5c-000000000003',
}, runtimeUpdatedAt: stamp, canReview: true, canReviewEvidence: true }
const read = overrides => readHubReviewAuthority({ response: { data: authority },
  scope: { runtimeInstanceId: 'revision-key', customerId: 'customer', tenantId: 'tenant' },
  renderer: { runtimeInstance: { updatedAt: stamp } }, ...overrides })
const hash = 'sha256:' + 'a'.repeat(64)
const props = () => ({ authority, runtimeInstanceId: 'revision-key', contextKey: 'context', viewKey: 'context:Review', refresh: vi.fn().mockResolvedValue(true) })
const receipt = (command, patch = {}) => {
  const body = command.body, actor = '64b000000000000000000001'
  const requestPayloadHash = createHash('sha256').update(JSON.stringify({ contractVersion: 'discovery-contradiction-review-v1',
    actorUserId: actor, runtimeInstanceId: 'revision', contradictionId: command.contradictionId,
    expectedUpdatedAt: new Date(body.expectedUpdatedAt).toISOString(), expectedEvidencePairHash: body.expectedEvidencePairHash,
    disposition: body.disposition, rationale: body.rationale, confirm: true })).digest('hex')
  return { review: { contractVersion: 'discovery-contradiction-review-v1', reviewId: '5b4d1f42-d7e2-4a3f-af5c-000000000004', runtimeInstanceId: 'revision',
    contradictionId: command.contradictionId, reviewedBy: actor, reviewedAt: stamp, reviewedStateVersion: authority.control.stateVersion,
    requestExpectedUpdatedAt: body.expectedUpdatedAt, requestKey: body.requestKey, requestPayloadHash,
    evidencePairHash: body.expectedEvidencePairHash, disposition: body.disposition, rationale: body.rationale }, ...patch }
}
beforeEach(() => {
  session.revision = 0
  vi.stubGlobal('crypto', webcrypto)
  mutations.evidence.mockReset().mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
  mutations.finding.mockReset().mockImplementation(command => ({ unwrap: () => Promise.resolve(receipt(command)) }))
})
describe('scoped Review authority', () => {
  it('accepts a matching fresh server contract only', () => { expect(read()).toBe(authority) })
  it.each([{ response: { data: { ...authority, control: { ...authority.control, stateVersion: 3 } } } }, { response: { data: { ...authority, control: { ...authority.control, stateVersion: '  ' } } } }, { response: { data: { ...authority, control: { ...authority.control, stateVersion: undefined } } } }, { locked: true }, { loading: true }, { error: { status: 403 } },
    { response: { data: { ...authority, control: { ...authority.control, tenantId: 'other' } } } },
    { response: { data: { ...authority, control: { ...authority.control, id: 'other', runtimeInstanceKey: 'other' } } } },
    { response: { data: { ...authority, contractVersion: 'other' } } },
    { renderer: { runtimeInstance: { updatedAt: '2026-10-04T11:00:00Z' } } },
  ])('denies unavailable, locked or mismatched basis %j', change => { expect(read(change)).toBeNull() })
})
describe('governed decision wiring', () => {
  it.each(['requestKey', 'requestPayloadHash', 'runtimeInstanceId', 'contradictionId', 'evidencePairHash', 'disposition', 'rationale', 'requestExpectedUpdatedAt', 'reviewedBy', 'contractVersion'])('rejects receipt mismatch in %s', async field => {
    const command = { contradictionId: 'finding', body: { expectedUpdatedAt: stamp, expectedEvidencePairHash: hash,
      disposition: 'CONFIRMED', rationale: 'A recorded human rationale.', confirm: true, requestKey: webcrypto.randomUUID() } }
    const response = receipt(command)
    response.review[field] = 'wrong'
    expect(await verifyFindingDecisionReceipt(response, { id: 'finding', stateVersion: authority.control.stateVersion, body: command.body }, 'revision')).toBeNull()
  })
  it.each([
    ['reviewId', 'saved-decision'], ['reviewId', '5b4d1f42-d7e2-1a3f-af5c-000000000004'],
    ['reviewedAt', '2026-10-04'], ['reviewedAt', '2026-10-04T10:00:00Z'], ['reviewedAt', 0],
    ['reviewedStateVersion', undefined], ['reviewedStateVersion', ' '], ['reviewedStateVersion', 3],
    ['reviewedStateVersion', 'rsv2:different'],
  ])('rejects malformed receipt metadata %s=%s', async (field, value) => {
    const command = { contradictionId: 'finding', body: { expectedUpdatedAt: stamp, expectedEvidencePairHash: hash,
      disposition: 'CONFIRMED', rationale: 'A recorded human rationale.', confirm: true, requestKey: webcrypto.randomUUID() } }
    const response = receipt(command)
    response.review[field] = value
    expect(await verifyFindingDecisionReceipt(response, { id: 'finding', stateVersion: authority.control.stateVersion, body: command.body }, 'revision')).toBeNull()
  })
  it('sends the existing evidence schema, then refreshes authoritative reads', async () => {
    const config = props()
    const { result } = renderHook(() => useHubReviewActions(config))
    await act(async () => { expect(await result.current.decideEvidence('exact-item', 'REJECTED')).toBe(true) })
    expect(mutations.evidence).toHaveBeenCalledWith({ runtimeInstanceId: 'revision-key', evidenceObjectId: 'exact-item', body: { expectedUpdatedAt: stamp, reviewStatus: 'REJECTED' } })
    expect(config.refresh).toHaveBeenCalledOnce()
    expect(result.current.feedback.message).toContain('Current reads refreshed')
  })
  it('requires exact hash and rationale before sending a confirmed human disposition', async () => {
    const { result } = renderHook(() => useHubReviewActions(props()))
    await act(async () => { await result.current.decideFinding({ id: 'finding', evidencePairHash: 'bad' }, 'CONFIRMED', 'A recorded human rationale.') })
    expect(mutations.finding).not.toHaveBeenCalled()
    await act(async () => { await result.current.decideFinding({ id: 'finding', evidencePairHash: hash }, 'CONFIRMED', 'short') })
    expect(mutations.finding).not.toHaveBeenCalled()
    await act(async () => { await result.current.decideFinding({ id: 'finding', evidencePairHash: hash }, 'CONFIRMED', '  A recorded human rationale.  ') })
    expect(mutations.finding).toHaveBeenCalledWith({ runtimeInstanceId: 'revision-key', contradictionId: 'finding', body: { expectedUpdatedAt: stamp, expectedEvidencePairHash: hash, disposition: 'CONFIRMED', rationale: 'A recorded human rationale.', confirm: true, requestKey: expect.stringMatching(/^[a-f0-9-]{36}$/) } })
  })
  it('retains the exact original uncertain command after explicit refresh despite a new timestamp', async () => {
    mutations.finding.mockImplementationOnce(() => ({ unwrap: () => Promise.reject({ status: 'FETCH_ERROR' }) }))
    mutations.finding.mockImplementation(command => ({ unwrap: () => Promise.resolve(receipt(command, { replay: true, requiresRefresh: true, receiptCurrentness: 'HISTORICAL' })) }))
    const initial = props(), { result, rerender } = renderHook(config => useHubReviewActions(config), { initialProps: initial })
    await act(async () => { await result.current.decideFinding({ id: 'finding', evidencePairHash: hash }, 'CONFIRMED', 'A recorded human rationale.') })
    const original = mutations.finding.mock.calls[0][0]
    expect(mutations.finding).toHaveBeenCalledOnce()
    rerender({ ...initial, authority: { ...authority, control: { ...authority.control, stateVersion: 'rsv2:changed-current-basis' }, runtimeUpdatedAt: '2026-10-04T11:00:00.000Z' } })
    act(() => result.current.resetAfterRefresh())
    await act(async () => { await result.current.decideFinding({ id: 'finding', evidencePairHash: hash }, 'CONFIRMED', 'A recorded human rationale.') })
    expect(mutations.finding.mock.calls[1][0]).toEqual(original)
    expect(result.current.feedback.message).toContain('Original decision receipt recovered as historical')
  })
  it.each([{ replay: true }, { review: {} }])('blocks a malformed decision response without refresh or success %j', patch => {
    mutations.finding.mockImplementation(command => ({ unwrap: () => Promise.resolve(receipt(command, patch)) }))
    const initial = props(), { result } = renderHook(() => useHubReviewActions(initial))
    return act(async () => {
      expect(await result.current.decideFinding({ id: 'finding', evidencePairHash: hash }, 'CONFIRMED', 'A recorded human rationale.')).toBe(false)
      expect(initial.refresh).not.toHaveBeenCalled()
    })
  })
  it('uses a fresh identity for a deliberate new command after confirmed receipt and refresh', async () => {
    const { result } = renderHook(() => useHubReviewActions(props()))
    for (let i = 0; i < 2; i++) await act(async () => { await result.current.decideFinding({ id: 'finding', evidencePairHash: hash }, 'CONFIRMED', 'A recorded human rationale.') })
    expect(mutations.finding.mock.calls[1][0].body.requestKey).not.toBe(mutations.finding.mock.calls[0][0].body.requestKey)
  })
  it('does not reuse an uncertain attempt in a new login session', async () => {
    mutations.finding.mockImplementationOnce(() => ({ unwrap: () => Promise.reject({ status: 'FETCH_ERROR' }) }))
    const initial = { ...props(), sessionRevision: 0 }, { result, rerender } = renderHook(config => useHubReviewActions(config), { initialProps: initial })
    await act(async () => { await result.current.decideFinding({ id: 'finding', evidencePairHash: hash }, 'CONFIRMED', 'A recorded human rationale.') })
    const oldKey = mutations.finding.mock.calls[0][0].body.requestKey
    session.revision = 1
    rerender({ ...initial, sessionRevision: 1 })
    await act(async () => { await result.current.decideFinding({ id: 'finding', evidencePairHash: hash }, 'CONFIRMED', 'A recorded human rationale.') })
    expect(mutations.finding.mock.calls[1][0].body.requestKey).not.toBe(oldKey)
  })
  it('rejects an old asynchronous completion after leaving and returning to the same view', async () => {
    let finish
    mutations.finding.mockImplementation(command => ({ unwrap: () => new Promise(resolve => { finish = () => resolve(receipt(command)) }) }))
    const initial = props(), { result, rerender } = renderHook(config => useHubReviewActions(config), { initialProps: initial })
    let pending
    act(() => { pending = result.current.decideFinding({ id: 'finding', evidencePairHash: hash }, 'CONFIRMED', 'A recorded human rationale.') })
    rerender({ ...initial, viewKey: 'context:Sources' }); rerender(initial)
    await act(async () => { finish(); await pending })
    expect(initial.refresh).not.toHaveBeenCalled()
    expect(result.current.feedback).toBeNull()
  })
  it.each([{ authority: null }, { locked: true }, { contextKey: 'other' }, { viewKey: 'context:Quality' }])('rejects a retained callback after current ownership/authority changes %j', patch => {
    const initial = props(), { result, rerender } = renderHook(config => useHubReviewActions(config), { initialProps: initial })
    const retained = result.current.decideEvidence
    rerender({ ...initial, ...patch })
    return act(async () => { await retained('item', 'ACCEPTED'); expect(mutations.evidence).not.toHaveBeenCalled() })
  })
  it('rejects retained callbacks after unmount or a session change before rerender', async () => {
    const { result, unmount } = renderHook(() => useHubReviewActions({ ...props(), sessionRevision: 0 }))
    const retained = result.current.decideFinding
    session.revision = 1
    await act(async () => { await retained({ id: 'finding', evidencePairHash: hash }, 'CONFIRMED', 'A recorded human rationale.') })
    session.revision = 0; unmount()
    await retained({ id: 'finding', evidencePairHash: hash }, 'CONFIRMED', 'A recorded human rationale.')
    expect(mutations.finding).not.toHaveBeenCalled()
  })
  it.each([null, { ...authority, canReview: false, canReviewEvidence: false }])('never sends without eligible server authority', async eligibility => {
    const { result } = renderHook(() => useHubReviewActions({ ...props(), authority: eligibility }))
    await act(async () => { await result.current.decideEvidence('exact-item', 'ACCEPTED'); await result.current.decideFinding({ id: 'finding', evidencePairHash: hash }, 'NOT_CONTRADICTORY', 'A recorded human rationale.') })
    expect(mutations.evidence).not.toHaveBeenCalled()
    expect(mutations.finding).not.toHaveBeenCalled()
  })
  it('prevents concurrent clicks and blocks an ambiguous failure until explicit refresh', async () => {
    let fail
    mutations.evidence.mockImplementation(() => ({ unwrap: () => new Promise((_resolve, reject) => { fail = reject }) }))
    const { result } = renderHook(() => useHubReviewActions(props()))
    let pending
    act(() => { pending = result.current.decideEvidence('exact-item', 'ACCEPTED'); result.current.decideEvidence('exact-item', 'ACCEPTED') })
    expect(mutations.evidence).toHaveBeenCalledOnce()
    await act(async () => { fail({ status: 'FETCH_ERROR' }); await pending })
    expect(result.current.feedback.error).toBe(true)
    expect(result.current.canReviewEvidence).toBe(false)
    await act(async () => { await result.current.decideEvidence('exact-item', 'ACCEPTED') })
    expect(mutations.evidence).toHaveBeenCalledOnce()
    act(() => result.current.resetAfterRefresh())
    expect(result.current.canReviewEvidence).toBe(true)
  })
  it.each([403, 409, 500])('shows %s failure without success or another write', async status => {
    mutations.evidence.mockImplementation(() => ({ unwrap: () => Promise.reject({ status, data: { error: { message: 'Server denied this decision.' } } }) }))
    const { result } = renderHook(() => useHubReviewActions(props()))
    await act(async () => { await result.current.decideEvidence('item', 'ACCEPTED') })
    expect(result.current.feedback.message).toContain('Server denied')
    expect(result.current.canReviewEvidence).toBe(false)
    expect(mutations.evidence).toHaveBeenCalledOnce()
  })
  it('keeps recomputation/read refresh failure visible and blocks subsequent decisions', async () => {
    const { result } = renderHook(() => useHubReviewActions({ ...props(), refresh: vi.fn().mockResolvedValue(false) }))
    await act(async () => { await result.current.decideEvidence('item', 'ACCEPTED') })
    expect(result.current.feedback.message).toContain('Decision recorded, but current reads could not be refreshed')
    expect(result.current.feedback.error).toBe(true)
    expect(result.current.canReviewEvidence).toBe(false)
  })
  it('does not show old-view success or refresh old scope after navigating during a mutation', async () => {
    let finish
    mutations.evidence.mockImplementation(() => ({ unwrap: () => new Promise(resolve => { finish = resolve }) }))
    const initial = props()
    const { result, rerender } = renderHook(config => useHubReviewActions(config), { initialProps: initial })
    let pending
    act(() => { pending = result.current.decideEvidence('item', 'ACCEPTED') })
    rerender({ ...initial, runtimeInstanceId: 'other-revision', contextKey: 'other', viewKey: 'other:Review' })
    await act(async () => { finish({}); await pending })
    expect(result.current.feedback).toBeNull()
    expect(initial.refresh).not.toHaveBeenCalled()
    expect(mutations.evidence).toHaveBeenCalledOnce()
  })
})
