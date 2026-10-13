import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DiscoveryAcceptancePanel from './DiscoveryAcceptancePanel.jsx'
import { readDiscoveryAcceptanceBasis, readDiscoveryAcceptanceRefresh, readDiscoveryAcceptanceRoute } from './discoveryAcceptanceModel.js'
import { clearTokens } from '../../utils/tokenStorage.js'

const calls = vi.hoisted(() => ({ accept: vi.fn(), execute: vi.fn() }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useAcceptRuntimeDiscoveryMutation: () => [calls.accept], useExecuteRuntimeActionMutation: () => [calls.execute],
  useReviewRuntimeDiscoveryEvidenceMutation: () => [vi.fn()], useReviewRuntimeDiscoveryContradictionMutation: () => [vi.fn()],
}))
const scope = { runtimeInstanceId: 'revision-1', customerId: 'customer-1', tenantId: 'tenant-1' }
const stamp = '2026-10-10T16:20:40.807Z'
const control = { id: scope.runtimeInstanceId, ...scope, stateVersion: 'version-1', updatedAt: stamp }
const page = total => ({ response: { data: { control, evidenceObjects: [], total, totalCapped: false } } })
const base = () => ({ scope, renderer: { runtimeInstance: control, lock: { locked: false }, actions: [],
  discovery: { inputComplete: true, evidenceReady: true, accepted: false, needsRefresh: false } },
  authority: { control, runtimeUpdatedAt: stamp, canReviewEvidence: true }, evidenceReads: [47, 34, 0, 13].map(page),
  refresh: vi.fn().mockResolvedValue({ packAccepted: true, total: 47, accepted: 34, pending: 0, rejected: 13 }) })
const button = () => screen.getByRole('button', { name: 'Accept reviewed evidence pack' })
const confirm = () => userEvent.click(screen.getByRole('checkbox'))
beforeEach(() => {
  vi.clearAllMocks()
  calls.accept.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
  calls.execute.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
})

describe('Modern evidence-pack acceptance', () => {
  it('requires a deliberate current-basis choice and uses the authentic dedicated route', async () => {
    const props = base(); render(<DiscoveryAcceptancePanel {...props} />)
    expect(button()).toBeDisabled()
    expect(screen.getByText(/starts a new Quality review basis/)).toBeVisible()
    await confirm(); await userEvent.click(button())
    expect(calls.accept).toHaveBeenCalledTimes(1)
    expect(calls.accept).toHaveBeenCalledWith({ runtimeInstanceId: scope.runtimeInstanceId, body: { expectedUpdatedAt: stamp } })
    expect(calls.execute).not.toHaveBeenCalled()
    await screen.findByText(/Evidence pack accepted and current reads verified/)
  })
  it('uses the enabled renderer-declared command with exact scope and never the fallback', async () => {
    const props = base(); props.renderer.actions = [{ actionKey: 'ACCEPT_EVIDENCE', governedAction: 'ACCEPT_EVIDENCE', enabled: true }]
    render(<DiscoveryAcceptancePanel {...props} />)
    expect(screen.queryByText(/starts a new Quality review basis/)).not.toBeInTheDocument()
    await confirm(); await userEvent.click(button())
    expect(calls.execute).toHaveBeenCalledTimes(1)
    expect(calls.execute).toHaveBeenCalledWith({ ...scope, actionKey: 'ACCEPT_EVIDENCE', body: { expectedUpdatedAt: stamp } })
    expect(calls.accept).not.toHaveBeenCalled()
  })
  it.each(['locked', 'loading', 'pending', 'capped', 'conflict', 'scope', 'version', 'stamp', 'denied', 'not-ready', 'refresh-required', 'actions-missing', 'action-disabled', 'action-conflicting', 'action-duplicate'])('blocks %s without sending any command', async state => {
    const props = base()
    if (state === 'locked') props.locked = true
    if (state === 'loading') props.loading = true
    if (state === 'pending') props.evidenceReads = [48, 34, 1, 13].map(page)
    if (state === 'capped') props.evidenceReads[0].response.data.totalCapped = true
    if (state === 'conflict') props.evidenceReads[0].response.data.total = 48
    if (state === 'scope' || state === 'version') props.evidenceReads[1].response.data.control = { ...control, [state === 'scope' ? 'tenantId' : 'stateVersion']: 'wrong' }
    if (state === 'stamp') props.authority.runtimeUpdatedAt = '2026-10-10T16:21:00Z'
    if (state === 'denied') props.authority.canReviewEvidence = false
    if (state === 'not-ready') props.renderer.discovery.evidenceReady = false
    if (state === 'refresh-required') props.renderer.discovery.needsRefresh = true
    if (state === 'actions-missing') delete props.renderer.actions
    if (state === 'action-disabled') props.renderer.actions = [{ actionKey: 'ACCEPT_EVIDENCE', governedAction: 'ACCEPT_EVIDENCE', enabled: false }]
    if (state === 'action-conflicting') props.renderer.actions = [{ actionKey: 'ACCEPT_EVIDENCE', governedAction: 'OTHER', enabled: true }]
    if (state === 'action-duplicate') props.renderer.actions = Array(2).fill({ actionKey: 'ACCEPT_EVIDENCE', governedAction: 'ACCEPT_EVIDENCE', enabled: true })
    render(<DiscoveryAcceptancePanel {...props} />)
    expect(button()).toBeDisabled(); expect(screen.getByRole('checkbox')).toBeDisabled()
    fireEvent.submit(button().closest('form'))
    expect(calls.accept).not.toHaveBeenCalled(); expect(calls.execute).not.toHaveBeenCalled()
  })
  it('invalidates confirmation when the revision changes before submission', async () => {
    const props = base(), view = render(<DiscoveryAcceptancePanel {...props} />)
    await confirm()
    view.rerender(<DiscoveryAcceptancePanel {...props} renderer={{ ...props.renderer, runtimeInstance: { ...control, updatedAt: '2026-10-10T17:00:00Z' } }} />)
    expect(button()).toBeDisabled(); fireEvent.submit(button().closest('form'))
    expect(calls.accept).not.toHaveBeenCalled()
  })
  it.each([null, { packAccepted: false }, { packAccepted: true, total: 48, accepted: 35, pending: 0, rejected: 13 }])('never promotes unverified or changed post-reads to success', async result => {
    const props = base(); props.refresh.mockResolvedValue(result)
    render(<DiscoveryAcceptancePanel {...props} />); await confirm(); await userEvent.click(button())
    await screen.findByText(/current state could not be verified/)
    expect(button()).toBeDisabled()
  })
  it('blocks uncertain failure until explicit inspection and does not retry automatically', async () => {
    calls.accept.mockImplementation(() => ({ unwrap: () => Promise.reject(new Error('Network unavailable')) }))
    const props = base(); render(<DiscoveryAcceptancePanel {...props} />)
    await confirm(); await userEvent.click(button()); await screen.findByText(/Network unavailable/)
    expect(button()).toBeDisabled(); expect(props.refresh).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Refresh evidence-pack basis' }))
    await screen.findByText(/basis refreshed/)
    expect(calls.accept).toHaveBeenCalledTimes(1)
  })
  it.each(['unmount', 'session', 'lock'])('suppresses a late response after %s and double submission', async state => {
    let resolve
    calls.accept.mockImplementation(() => ({ unwrap: () => new Promise(done => { resolve = done }) }))
    const props = base(), view = render(<DiscoveryAcceptancePanel {...props} />)
    await confirm(); fireEvent.submit(button().closest('form')); fireEvent.submit(button().closest('form'))
    expect(calls.accept).toHaveBeenCalledTimes(1)
    if (state === 'unmount') view.unmount()
    if (state === 'session') act(() => clearTokens())
    if (state === 'lock') view.rerender(<DiscoveryAcceptancePanel {...props} locked />)
    await act(async () => resolve({}))
    expect(props.refresh).not.toHaveBeenCalled()
    expect(screen.queryByText(/Evidence pack accepted and current reads verified/)).not.toBeInTheDocument()
  })
})

describe('Fresh acceptance basis contract', () => {
  const results = () => {
    const props = base(); props.renderer.discovery.accepted = true
    return [props.renderer, { contractVersion: 'intelligence-review-actions.v1', ...props.authority }, ...props.evidenceReads.map(read => read.response.data)]
      .map(data => ({ status: 'fulfilled', value: { data: { data } } }))
  }
  it('verifies the fresh renderer, Quality timestamp and all native count controls together', () => {
    expect(readDiscoveryAcceptanceRefresh(results(), scope)).toMatchObject({ packAccepted: true, total: 47, accepted: 34, pending: 0, rejected: 13 })
    const stale = results(); stale[1].value.data.data.runtimeUpdatedAt = '2026-10-10T12:00:00Z'
    expect(readDiscoveryAcceptanceRefresh(stale, scope)).toBeNull()
    const foreign = results(); foreign[3].value.data.data.control = { ...control, tenantId: 'foreign' }
    expect(readDiscoveryAcceptanceRefresh(foreign, scope)).toBeNull()
    const failure = results(); failure[2] = { status: 'rejected' }
    expect(readDiscoveryAcceptanceRefresh(failure, scope)).toBeNull()
  })
  it('rejects fractional totals and unknown/malformed declarations', () => {
    const props = base(); props.evidenceReads[0].response.data.total = 47.5
    expect(readDiscoveryAcceptanceBasis(props)).toBeNull()
    expect(readDiscoveryAcceptanceRoute({ actions: [null] })).toBeNull()
    expect(readDiscoveryAcceptanceRoute({ actions: [{ actionKey: 'accept_evidence', governedAction: 'ACCEPT_EVIDENCE', enabled: true }] })).toBeNull()
  })
  it('recognises the live UNLOCKED state projection and rejects contradictory or unknown lock metadata', () => {
    const props = base(); props.renderer.lock = { state: 'UNLOCKED' }
    expect(readDiscoveryAcceptanceBasis(props)).toMatchObject({ ready: true })
    props.renderer.lock.locked = true
    expect(readDiscoveryAcceptanceBasis(props)).toBeNull()
    props.renderer.lock = {}
    expect(readDiscoveryAcceptanceBasis(props)).toBeNull()
  })
  it.each([{ locked: false, state: 'UNKNOWN' }, { locked: 'invalid', state: 'UNLOCKED' }, { locked: false, state: 'LOCKED' }])('rejects malformed lock combinations %j', lock => {
    const props = base(); props.renderer.lock = lock
    expect(readDiscoveryAcceptanceBasis(props)).toBeNull()
  })
  it.each([undefined, null, 'false', true])('requires explicit uncapped count metadata on every native read (%s)', cap => {
    for (let index = 0; index < 4; index++) {
      const props = base(); props.evidenceReads[index].response.data.totalCapped = cap
      expect(readDiscoveryAcceptanceBasis(props)).toBeNull()
    }
  })
})
