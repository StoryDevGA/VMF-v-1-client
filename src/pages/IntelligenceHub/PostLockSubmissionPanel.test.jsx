import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash, webcrypto } from 'node:crypto'
import { lockBasisFixture } from '../../test/lockBasisFixture.js'
import { clearTokens, setTokens } from '../../utils/tokenStorage.js'
import PostLockSubmissionPanel from './PostLockSubmissionPanel.jsx'
vi.mock('./PostLockEvidenceHistory.jsx', () => ({ default: () => null }))

const calls = vi.hoisted(() => ({ lock: vi.fn(), availability: vi.fn(), submit: vi.fn(), inspect: vi.fn() }))
let actor, lock, capability, lockFlags, availabilityFlags
vi.mock('react-redux', () => ({ useSelector: selector => selector({ auth: { user: actor } }) }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetRuntimeStateLockBasisQuery: (...args) => calls.lock(...args),
  useGetRuntimePostLockOperationalCapabilityQuery: (...args) => calls.availability(...args),
  useSubmitRuntimePostLockEvidenceMutation: () => [calls.submit],
  useLazyGetRuntimePostLockEvidenceQuery: () => [calls.inspect],
}))

const stamp = '2026-11-09T12:00:00.000Z'
const actorId = '9'.repeat(24)
const scope = { runtimeInstanceId: '1'.repeat(24), customerId: '2'.repeat(24), tenantId: '3'.repeat(24) }
const version = 'rsv2:123e4567-e89b-42d3-a456-426614174000'
const runtime = { id: scope.runtimeInstanceId, runtimeInstanceKey: 'locked-revision', customerId: scope.customerId,
  tenantId: scope.tenantId, stateVersion: version, packageId: '4'.repeat(24), packageVersion: '1.0' }
const candidate = () => ({ source: { sourceId: 'supplied-research-1', sourceType: 'PUBLIC_RESEARCH', title: 'Synthetic supplied source',
  locator: { url: 'https://example.org/supplied', passage: 'Retain  exact internal spacing.', page: 2 },
  contentHash: `sha256:${'a'.repeat(64)}`, retrievedAt: stamp, currentness: 'UNCONFIRMED',
  qualifications: ['Synthetic supplied material; no provider was called.'],
  licensing: { licenceRef: 'Fixture owner permission', retentionPermitted: true, retainUntil: null },
  provenance: { producerKey: 'synthetic-producer', producerVersion: '1', receiptRef: 'fixture:source-receipt', acquiredAt: stamp } },
evidence: { title: 'Later supplied evidence', statement: 'A later window needs  separate consideration.', sectionKeys: [] } })
const props = () => ({ scope, renderer: { runtimeInstance: runtime, revision: { revisionNumber: 2 } },
  contextKey: 'root:locked-revision', route: 'view=context', canRead: true, locked: true, active: true })
const tree = overrides => <PostLockSubmissionPanel {...props()} {...overrides} />
const serverHash = value => {
  const canonical = item => Array.isArray(item) ? item.map(canonical) : item && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, canonical(item[key])])) : item
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
}
const response = (body, readback = false) => ({ data: { contractVersion: body.contractVersion,
  submissionId: serverHash({ contractVersion: body.contractVersion, customerId: body.binding.customerId,
    tenantId: body.binding.tenantId, runtimeInstanceId: body.binding.runtimeInstanceId, requestKey: body.requestKey }),
  requestDigest: serverHash({ ...body, submittedBy: actorId }), status: 'PENDING_REVIEW', outsideFrozenMembership: true,
  binding: body.binding, source: body.source, evidence: body.evidence, reason: body.reason,
  submittedBy: actorId, submittedAt: stamp, receipt: { id: '8'.repeat(24), signatureVersion: 2, verified: true },
  ...(readback ? { readState: { contractVersion: 'post-lock-evidence-read-state.v1', readAt: stamp, currency: 'AS_READ',
    impact: { state: 'NOT_RECORDED', verification: { status: 'VERIFIED', reason: null }, headHash: null, latestDecision: null, decisionCount: 0 },
    admission: { state: 'NOT_RECORDED' }, actions: { recordImpact: { eligibility: 'ELIGIBLE_AS_READ', blockedBy: [] } } } }
    : { replayed: false }),
}, meta: { version: 'v1', requestId: 'controlled-receipt-request' } })
const lastBody = () => calls.submit.mock.calls.at(-1)[0].body
function file(text = JSON.stringify(candidate()), bytes) {
  const encoded = bytes || new TextEncoder().encode(text)
  const value = new File([encoded], 'candidate.json', { type: 'application/json' })
  Object.defineProperty(value, 'arrayBuffer', { configurable: true, value: () => Promise.resolve(encoded.buffer) })
  return value
}
const upload = async value => {
  await userEvent.upload(screen.getByLabelText('Candidate JSON file'), value || file())
  await screen.findByText('Candidate staged locally. Inspect the supplied material and enter the reason for review.')
}
const prepare = async () => {
  await upload()
  await userEvent.type(screen.getByLabelText('Why should this evidence be reviewed?'), 'Keep later evidence separate.')
}
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Submit for impact review' }))
const receipt = () => screen.queryByRole('region', { name: 'Verified original submission receipt' })

beforeEach(() => {
  vi.resetAllMocks(); clearTokens(); actor = { id: actorId }; lockFlags = {}; availabilityFlags = {}
  vi.stubGlobal('crypto', { subtle: webcrypto.subtle, randomUUID: () => '123e4567-e89b-42d3-a456-426614174001' })
  const raw = lockBasisFixture()
  Object.assign(raw.control, runtime, { revision: { revisionNumber: 2 } })
  Object.assign(raw.lockBasis.replay.anchor, { runtimeInstanceId: runtime.id, runtimeInstanceKey: runtime.runtimeInstanceKey })
  raw.lockBasis.frozenInventory = { available: true, completeness: 'VERIFIED', reason: null,
    contractVersion: 'runtime-evidence-membership.v1', snapshotId: 'evidence_snapshot_123e4567-e89b-42d3-a456-426614174002',
    membershipHash: 'c'.repeat(64), basisStateVersion: version, lockSnapshotId: raw.lockBasis.snapshot.snapshotId,
    lockSnapshotHash: 'a'.repeat(64), revisionNumber: 2, counts: { sources: 8, evidence: 47, sections: 6 },
    verification: { basis: 'EXACT_PERSISTED_MEMBERSHIP', materialHashAlgorithm: 'sha256-canonical-json-housekeeping-excluded.v1', auditLinkVerified: true } }
  const binding = { ...scope, runtimeInstanceKey: runtime.runtimeInstanceKey, revisionNumber: 2,
    basisStateVersion: version, evidenceSnapshotId: raw.lockBasis.frozenInventory.snapshotId,
    membershipHash: 'c'.repeat(64), lockSnapshotId: raw.lockBasis.snapshot.snapshotId, lockSnapshotHash: 'a'.repeat(64),
    packageId: runtime.packageId, packageVersion: runtime.packageVersion, dependencySnapshotId: 'dependency-1',
    dependencySnapshotHash: 'd'.repeat(64), policyHash: 'e'.repeat(64) }
  lock = { data: raw }
  capability = { data: { contractVersion: 'post-lock-evidence-operational-capability.v1', readAt: stamp, currency: 'AS_READ',
    recording: { eligibility: 'ELIGIBLE_AS_READ', blockedBy: [], binding, checks: { authority: 'VMF_UPDATE_VERIFIED',
      isolation: 'CLEAR', frozenBasis: 'VERIFIED', policy: 'VERIFIED', storageIndexes: 'VERIFIED_AS_WRITER' } },
    impact: { eligibility: 'ITEM_REQUIRED' }, admission: { eligibility: 'ITEM_REQUIRED' },
    execution: { mode: 'EXPLICIT_SUBMIT_REQUIRED', recheck: 'SERVER_RECHECKS_ON_SUBMIT',
      indexRead: 'OUTSIDE_TRANSACTION_NOT_ATOMIC', submissionMaterial: 'NOT_CHECKED' } }, meta: { version: 'v1' } }
  calls.lock.mockImplementation((args, options) => ({ currentData: options.skip ? undefined : lock,
    originalArgs: args, isSuccess: !options.skip, isUninitialized: options.skip, ...lockFlags }))
  calls.availability.mockImplementation((args, options) => ({ currentData: options.skip ? undefined : capability,
    originalArgs: args, isSuccess: !options.skip, isUninitialized: options.skip, ...availabilityFlags }))
  calls.submit.mockImplementation(({ body }) => ({ unwrap: () => Promise.resolve(response(body)) }))
  calls.inspect.mockImplementation(() => ({ unwrap: () => Promise.resolve(response(lastBody(), true)) }))
})
afterEach(() => vi.unstubAllGlobals())

describe('one supplied post-lock submission', () => {
  it('stages a producer-neutral candidate, then submits once and verifies its exact saved receipt', async () => {
    render(tree())
    expect(screen.getByRole('button', { name: 'Submit for impact review' })).toBeDisabled()
    await upload()
    expect(calls.submit).not.toHaveBeenCalled()
    expect(screen.getByText(/A later window needs/).textContent).toBe('A later window needs  separate consideration.')
    await userEvent.type(screen.getByLabelText('Why should this evidence be reviewed?'), 'Keep later evidence separate.')
    await submit()
    await waitFor(() => expect(receipt()).toBeInTheDocument())
    expect(calls.submit).toHaveBeenCalledOnce()
    expect(calls.submit.mock.calls[0][0]).toEqual({ ...scope, body: expect.objectContaining({
      source: candidate().source, evidence: candidate().evidence, reason: 'Keep later evidence separate.', binding: capability.data.recording.binding,
    }) })
    expect(calls.inspect).toHaveBeenCalledWith(expect.objectContaining({ ...scope,
      submissionId: response(lastBody()).data.submissionId }), false)
    expect(receipt()).toHaveTextContent('Original recording: pending review')
    expect(receipt()).toHaveTextContent('does not change the locked evidence basis')
    expect(within(receipt()).getByText('fixture:source-receipt')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Review impact|Create Revision|Open detail/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Submit separate post-lock evidence' })).not.toBeInTheDocument()
  })

  it.each(['invalid JSON', 'extra binding', 'invalid UTF-8', 'empty', 'oversized'])('does not submit an %s file', async kind => {
    render(tree())
    const values = {
      'invalid JSON': file('{'), 'extra binding': file(JSON.stringify({ ...candidate(), binding: {} })),
      'invalid UTF-8': file('', new Uint8Array([0xc3, 0x28])), empty: file(''), oversized: file('x'.repeat(65537)),
    }
    await userEvent.upload(screen.getByLabelText('Candidate JSON file'), values[kind])
    await screen.findByRole('alert')
    expect(calls.submit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Submit for impact review' })).toBeDisabled()
  })

  it.each(['blocked', 'loading', 'denied', 'unowned', 'unlocked', 'inactive', 'missing actor', 'missing crypto'])('withholds preparation for %s', kind => {
    if (kind === 'blocked') Object.assign(capability.data.recording, { eligibility: 'BLOCKED', blockedBy: ['POST_LOCK_POLICY_NOT_RECORDED'],
      binding: null, checks: { ...capability.data.recording.checks, policy: 'NOT_RECORDED', storageIndexes: 'NOT_CHECKED' } })
    if (kind === 'loading') availabilityFlags.isFetching = true
    if (kind === 'denied') availabilityFlags.error = { status: 403 }
    if (kind === 'unowned') availabilityFlags.originalArgs = undefined
    if (kind === 'missing actor') actor = null
    if (kind === 'missing crypto') vi.stubGlobal('crypto', { randomUUID: () => 'unused' })
    render(tree({ locked: kind !== 'unlocked', active: kind !== 'inactive' }))
    expect(screen.queryByRole('form', { name: 'Submit separate post-lock evidence' })).not.toBeInTheDocument()
    expect(calls.submit).not.toHaveBeenCalled()
    if (['unlocked', 'inactive'].includes(kind)) expect(calls.availability.mock.calls.at(-1)[1].skip).toBe(true)
  })

  it('blocks double clicks while the original POST is unresolved', async () => {
    let finish
    calls.submit.mockImplementation(() => ({ unwrap: () => new Promise(resolve => { finish = resolve }) }))
    render(tree()); await prepare(); await submit()
    await waitFor(() => expect(calls.submit).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'Check saved submission' })).toBeDisabled()
    await act(async () => finish(response(lastBody())))
    await waitFor(() => expect(receipt()).toBeInTheDocument())
    expect(calls.submit).toHaveBeenCalledOnce()
  })

  it.each(['source', 'actor', 'receipt'])('keeps an uncorrelated %s POST receipt unconfirmed without an automatic GET', async kind => {
    calls.submit.mockImplementation(({ body }) => ({ unwrap: () => {
      const result = response(body)
      if (kind === 'source') result.data.source = { ...result.data.source, title: 'Unrelated source' }
      if (kind === 'actor') result.data.submittedBy = '7'.repeat(24)
      if (kind === 'receipt') result.data.receipt.verified = false
      return Promise.resolve(result)
    } }))
    render(tree()); await prepare(); await submit()
    await screen.findByRole('alert')
    expect(receipt()).not.toBeInTheDocument()
    expect(calls.inspect).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Submit for impact review' })).not.toBeInTheDocument()
  })

  it.each([404, 503])('retains the exact command after GET %s without permitting another POST', async status => {
    calls.inspect.mockImplementation(() => ({ unwrap: () => Promise.reject({ status }) }))
    render(tree()); await prepare(); await submit()
    await screen.findByRole('alert')
    expect(receipt()).not.toBeInTheDocument()
    const original = lastBody()
    await userEvent.click(screen.getByRole('button', { name: 'Check saved submission' }))
    expect(calls.submit).toHaveBeenCalledOnce()
    expect(lastBody()).toBe(original)
    expect(calls.inspect.mock.calls[0][0].submissionId).toBe(calls.inspect.mock.calls[1][0].submissionId)
  })

  it('keeps an uncertain command through availability refetch and resolves it by GET only', async () => {
    calls.submit.mockImplementation(() => ({ unwrap: () => Promise.reject({ status: 'FETCH_ERROR' }) }))
    const view = render(tree()); await prepare(); await submit(); await screen.findByRole('alert')
    const original = lastBody()
    availabilityFlags.isFetching = true; view.rerender(tree())
    expect(screen.queryByRole('button', { name: 'Check saved submission' })).not.toBeInTheDocument()
    availabilityFlags.isFetching = false; view.rerender(tree())
    await userEvent.click(screen.getByRole('button', { name: 'Check saved submission' }))
    await waitFor(() => expect(receipt()).toBeInTheDocument())
    expect(calls.submit).toHaveBeenCalledOnce(); expect(lastBody()).toBe(original)
  })

  it('never rewrites an uncertain command when the fresh frozen binding changes', async () => {
    calls.submit.mockImplementation(() => ({ unwrap: () => Promise.reject({ status: 'FETCH_ERROR' }) }))
    const view = render(tree()); await prepare(); await submit(); await screen.findByRole('alert')
    const original = structuredClone(lastBody())
    lock.data.lockBasis.frozenInventory.membershipHash = 'f'.repeat(64)
    capability.data.recording.binding.membershipHash = 'f'.repeat(64)
    view.rerender(tree())
    expect(screen.getByText(/selected basis differs/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Check saved submission' })).toBeDisabled()
    expect(lastBody()).toEqual(original); expect(calls.submit).toHaveBeenCalledOnce()
  })
})

describe('submission refusals and explicit unchanged retries', () => {
  const notFound = { status: 404, data: { error: { details: { reason: 'POST_LOCK_SUBMISSION_NOT_FOUND' } } } }
  const stale = { status: 409, data: { error: { details: { reason: 'POST_LOCK_BINDING_STALE' } } } }
  const reject = failure => () => ({ unwrap: () => Promise.reject(failure) })

  it('allows a new candidate only after definitive stale rejection, a fresh verified read and explicit preparation', async () => {
    vi.stubGlobal('crypto', { subtle: webcrypto.subtle, randomUUID: vi.fn()
      .mockReturnValueOnce('123e4567-e89b-42d3-a456-426614174001')
      .mockReturnValue('123e4567-e89b-42d3-a456-426614174002') })
    calls.submit.mockImplementationOnce(reject(stale))
    const view = render(tree()); await prepare(); await submit()
    await screen.findByText('Outdated submission rejected')
    const original = lastBody()
    expect(screen.queryByRole('button', { name: 'Prepare another submission' })).not.toBeInTheDocument()
    availabilityFlags.isFetching = true; view.rerender(tree())
    lock.data.lockBasis.frozenInventory.membershipHash = 'f'.repeat(64)
    capability.data.recording.binding.membershipHash = 'f'.repeat(64)
    availabilityFlags.isFetching = false; view.rerender(tree())
    await userEvent.click(await screen.findByRole('button', { name: 'Prepare another submission' }))
    expect(screen.getByRole('form', { name: 'Submit separate post-lock evidence' })).toBeVisible()
    expect(screen.getByLabelText('Why should this evidence be reviewed?')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Submit for impact review' })).toBeDisabled()
    expect(calls.submit).toHaveBeenCalledOnce()
    await prepare(); await submit()
    await waitFor(() => expect(receipt()).toBeInTheDocument())
    expect(calls.submit).toHaveBeenCalledTimes(2)
    expect(lastBody().requestKey).not.toBe(original.requestKey)
    expect(lastBody().binding.membershipHash).toBe('f'.repeat(64))
  })
  it.each([409, 'FETCH_ERROR'])('does not abandon an uncertain %s intent after fresh reads', async status => {
    calls.submit.mockImplementation(reject({ status }))
    const view = render(tree()); await prepare(); await submit(); await screen.findByRole('alert')
    const original = lastBody()
    availabilityFlags.isFetching = true; view.rerender(tree())
    availabilityFlags.isFetching = false; view.rerender(tree())
    expect(screen.queryByRole('button', { name: 'Prepare another submission' })).not.toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Submit separate post-lock evidence' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check saved submission' })).toBeEnabled()
    expect(lastBody()).toBe(original); expect(calls.submit).toHaveBeenCalledOnce()
  })

  it('explains a confirmed stale rejection without claiming an uncertain save or allowing retry', async () => {
    calls.submit.mockImplementation(reject(stale))
    render(tree()); await prepare(); await submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('No evidence was saved')
    expect(screen.getByText('Outdated submission rejected')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Check saved submission' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry original submission' })).not.toBeInTheDocument()
    expect(calls.inspect).not.toHaveBeenCalled()
    expect(calls.submit).toHaveBeenCalledOnce()
  })
  it('never interprets a generic conflict as proof nothing was saved', async () => {
    calls.submit.mockImplementation(reject({ status: 409 }))
    render(tree()); await prepare(); await submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('outcome is unconfirmed')
    expect(screen.queryByText('Outdated submission rejected')).not.toBeInTheDocument()
  })
  it('allows an explicit retry only after exact not-found readback, preserving the entire original request', async () => {
    calls.submit.mockImplementationOnce(reject({ status: 500 }))
    calls.inspect.mockImplementationOnce(reject(notFound))
    render(tree()); await prepare(); await submit(); await screen.findByRole('alert')
    const original = lastBody()
    expect(screen.queryByRole('button', { name: 'Retry original submission' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Check saved submission' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Retry original submission' }))
    await waitFor(() => expect(receipt()).toBeInTheDocument())
    expect(calls.submit).toHaveBeenCalledTimes(2)
    expect(lastBody()).toBe(original)
    expect(calls.inspect.mock.calls[0][0].submissionId).toBe(calls.inspect.mock.calls[1][0].submissionId)
  })
  it.each([404, 503])('does not offer retry after an unverified GET %s', async status => {
    calls.submit.mockImplementation(reject({ status: 'FETCH_ERROR' }))
    calls.inspect.mockImplementation(reject({ status }))
    render(tree()); await prepare(); await submit(); await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Check saved submission' }))
    expect(screen.queryByRole('button', { name: 'Retry original submission' })).not.toBeInTheDocument()
    expect(calls.submit).toHaveBeenCalledOnce()
  })
  it('recovers a lost retry response through GET without a third POST', async () => {
    calls.submit.mockImplementationOnce(reject({ status: 500 })).mockImplementationOnce(reject({ status: 'FETCH_ERROR' }))
    calls.inspect.mockImplementationOnce(reject(notFound))
    render(tree()); await prepare(); await submit(); await screen.findByRole('alert')
    const original = lastBody()
    await userEvent.click(screen.getByRole('button', { name: 'Check saved submission' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Retry original submission' }))
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Check saved submission' }))
    await waitFor(() => expect(receipt()).toBeInTheDocument())
    expect(calls.submit).toHaveBeenCalledTimes(2); expect(lastBody()).toBe(original)
  })
  it('withdraws retry permission when the frozen basis changes', async () => {
    calls.submit.mockImplementation(reject({ status: 500 })); calls.inspect.mockImplementation(reject(notFound))
    const view = render(tree()); await prepare(); await submit(); await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Check saved submission' }))
    expect(await screen.findByRole('button', { name: 'Retry original submission' })).toBeVisible()
    lock.data.lockBasis.frozenInventory.membershipHash = 'f'.repeat(64)
    capability.data.recording.binding.membershipHash = 'f'.repeat(64); view.rerender(tree())
    expect(screen.queryByRole('button', { name: 'Retry original submission' })).not.toBeInTheDocument()
    expect(calls.submit).toHaveBeenCalledOnce()
  })
})

describe('late submission ownership', () => {
  it.each(['route', 'state', 'basis', 'departure'])('requires reimport and a new reason after a fresh current %s frame', async kind => {
    const view = render(tree()); await prepare()
    let next = {}
    if (kind === 'route') next = { route: 'view=context&reference=other' }
    if (kind === 'state') {
      const stateVersion = 'rsv2:123e4567-e89b-42d3-a456-426614174003'
      lock.data.control.stateVersion = stateVersion
      lock.data.lockBasis.frozenInventory.basisStateVersion = stateVersion
      capability.data.recording.binding.basisStateVersion = stateVersion
      next = { renderer: { ...props().renderer, runtimeInstance: { ...runtime, stateVersion } } }
    }
    if (kind === 'basis') {
      lock.data.lockBasis.frozenInventory.membershipHash = 'f'.repeat(64)
      capability.data.recording.binding.membershipHash = 'f'.repeat(64)
    }
    if (kind === 'departure') view.rerender(tree({ active: false }))
    view.rerender(tree(next))
    expect(screen.getByRole('status', { name: 'Post-lock evidence availability' })).toHaveTextContent('Recording prerequisites verified')
    expect(screen.queryByText('Synthetic supplied source')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Why should this evidence be reviewed?')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Submit for impact review' })).toBeDisabled()
    await prepare()
    expect(screen.getByRole('button', { name: 'Submit for impact review' })).toBeEnabled()
    expect(calls.submit).not.toHaveBeenCalled()
  })

  it('drops a late file read after departing and returning', async () => {
    let finish
    const selected = file(), bytes = new TextEncoder().encode(JSON.stringify(candidate()))
    Object.defineProperty(selected, 'arrayBuffer', { configurable: true, value: () => new Promise(resolve => { finish = resolve }) })
    const view = render(tree())
    await userEvent.upload(screen.getByLabelText('Candidate JSON file'), selected)
    view.rerender(tree({ active: false })); view.rerender(tree())
    await act(async () => finish(bytes.buffer))
    expect(screen.queryByText('Synthetic supplied source')).not.toBeInTheDocument()
    expect(calls.submit).not.toHaveBeenCalled()
  })

  it.each(['departure', 'route', 'logout', 'session', 'actor', 'state', 'customer', 'tenant', 'revision'])('does not consume a late POST after %s', async kind => {
    let finish
    calls.submit.mockImplementation(() => ({ unwrap: () => new Promise(resolve => { finish = resolve }) }))
    const view = render(tree()); await prepare(); await submit()
    await waitFor(() => expect(calls.submit).toHaveBeenCalledOnce())
    const raw = response(lastBody())
    if (kind === 'departure') { view.rerender(tree({ active: false })); view.rerender(tree()) }
    if (kind === 'route') view.rerender(tree({ route: 'view=context&inspection=other' }))
    if (kind === 'logout') act(() => clearTokens())
    if (kind === 'session') act(() => setTokens({ accessToken: 'synthetic-new-session', refreshToken: 'synthetic-refresh' }))
    if (kind === 'actor') { actor = { id: '6'.repeat(24) }; view.rerender(tree()) }
    if (kind === 'state') view.rerender(tree({ renderer: { ...props().renderer, runtimeInstance: { ...runtime,
      stateVersion: 'rsv2:123e4567-e89b-42d3-a456-426614174003' } } }))
    if (['customer', 'tenant', 'revision'].includes(kind)) {
      const key = { customer: 'customerId', tenant: 'tenantId', revision: 'runtimeInstanceId' }[kind]
      const nextScope = { ...scope, [key]: '5'.repeat(24) }
      const nextRuntime = { ...runtime, customerId: nextScope.customerId, tenantId: nextScope.tenantId, id: nextScope.runtimeInstanceId }
      Object.assign(lock.data.control, nextRuntime)
      Object.assign(lock.data.lockBasis.replay.anchor, { runtimeInstanceId: nextRuntime.id })
      Object.assign(capability.data.recording.binding, nextScope)
      view.rerender(tree({ scope: nextScope, renderer: { ...props().renderer, runtimeInstance: nextRuntime } }))
    }
    await act(async () => finish(raw))
    expect(calls.inspect).not.toHaveBeenCalled(); expect(receipt()).not.toBeInTheDocument()
  })

  it('drops a late GET result after leaving and returning without sending another POST', async () => {
    let finish
    calls.inspect.mockImplementationOnce(() => ({ unwrap: () => new Promise(resolve => { finish = resolve }) }))
    const view = render(tree()); await prepare(); await submit()
    await waitFor(() => expect(calls.inspect).toHaveBeenCalledOnce())
    const raw = response(lastBody(), true)
    view.rerender(tree({ active: false })); view.rerender(tree())
    await act(async () => finish(raw))
    expect(receipt()).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Check saved submission' }))
    await waitFor(() => expect(receipt()).toBeInTheDocument())
    expect(calls.submit).toHaveBeenCalledOnce()
  })

  it.each([1, 3, 5])('rechecks the committed owner after awaited digest stage %s', async stage => {
    let finish, count = 0
    const digest = vi.fn((...args) => {
      count += 1
      return count === stage ? new Promise(resolve => { finish = async () => resolve(await webcrypto.subtle.digest(...args)) }) : webcrypto.subtle.digest(...args)
    })
    vi.stubGlobal('crypto', { subtle: { digest }, randomUUID: () => '123e4567-e89b-42d3-a456-426614174001' })
    const view = render(tree()); await prepare(); await submit()
    await waitFor(() => expect(digest).toHaveBeenCalledTimes(stage))
    view.rerender(tree({ route: 'view=context&changed=true' }))
    await act(async () => finish())
    if (stage === 1) {
      await waitFor(() => expect(screen.getByRole('button', { name: 'Submit for impact review' })).toHaveAttribute('aria-busy', 'false'))
      expect(screen.getByRole('button', { name: 'Submit for impact review' })).toBeDisabled()
    } else await waitFor(() => expect(screen.getByRole('button', { name: 'Check saved submission' })).toBeEnabled())
    expect(receipt()).not.toBeInTheDocument()
    expect(calls.submit).toHaveBeenCalledTimes(stage === 1 ? 0 : 1)
    expect(calls.inspect).toHaveBeenCalledTimes(stage === 5 ? 1 : 0)
  })
})
