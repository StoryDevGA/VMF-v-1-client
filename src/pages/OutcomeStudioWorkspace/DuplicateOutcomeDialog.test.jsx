import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DuplicateOutcomeDialog from './DuplicateOutcomeDialog.jsx'

const mocks = vi.hoisted(() => ({ actor: 'actor-1', revision: 0, asset: vi.fn(), preflight: vi.fn(), confirm: vi.fn(), create: vi.fn(), byKey: vi.fn(), operation: vi.fn(), compare: vi.fn(), reconcile: vi.fn() }))
vi.mock('react-redux', () => ({ useSelector: () => ({ id: mocks.actor }) }))
vi.mock('../../utils/tokenStorage.js', () => ({ getSessionRevision: () => mocks.revision, subscribeToSession: () => () => {} }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({ useLazyGetRuntimeOutcomeAssetQuery: () => [mocks.asset] }))
vi.mock('../../store/api/outcomeSuccessorApi.js', () => ({
  useLazyGetOutcomeSuccessorPreflightQuery: () => [mocks.preflight], useConfirmOutcomeSuccessorMutation: () => [mocks.confirm],
  useCreateOutcomeSuccessorMutation: () => [mocks.create], useLazyGetOutcomeSuccessorByKeyQuery: () => [mocks.byKey],
  useLazyGetOutcomeSuccessorOperationQuery: () => [mocks.operation], useLazyGetOutcomeSuccessorCompareQuery: () => [mocks.compare],
  useReconcileOutcomeSuccessorMutation: () => [mocks.reconcile],
}))
const sourceId = '6aaaaaaaaaaaaaaaaaaaaaaa'
const targetId = '6bbbbbbbbbbbbbbbbbbbbbbb'
const asset = { outcomeAssetId: 'asset-1', runtimeInstanceId: sourceId, currentVersionId: 'version-2', status: 'PUBLISHED' }
const scope = { runtimeInstanceId: 'display-source-key', customerId: 'customer-1', tenantId: 'tenant-1' }
const source = { runtimeInstanceId: sourceId, outcomeAssetId: 'asset-1', outcomeAssetVersionId: 'version-2', versionNumber: 2, revisionNumber: 1, frameworkKey: 'framework', packageKey: 'package', packageVersion: '3.2.0' }
const preflight = (args) => ({ status: 'READY_FOR_CONFIRMATION', source: { ...source, outcomeAssetVersionId: args.outcomeAssetVersionId }, target: { ...source, runtimeInstanceId: args.targetRuntimeInstanceId, revisionNumber: args.targetRuntimeInstanceId === sourceId ? 1 : 2 }, targets: [{ ...source, runtimeInstanceId: targetId, revisionNumber: 2, eligible: true }], readiness: { canExecute: true }, carryForward: { originalRequest: 'Preserve evidence boundaries.', outputType: { label: 'Board summary' }, outputSchema: { label: 'Board structure' }, style: { label: 'Advisory' } } })
const resolved = (value) => ({ unwrap: () => Promise.resolve(value) })
const rejected = (message) => ({ unwrap: () => Promise.reject(new Error(message)) })
const saved = (target = sourceId, status = 'SUCCEEDED') => ({ operationId: 'operation-1', status, source, target: { runtimeInstanceId: target, revisionNumber: target === sourceId ? 1 : 2 }, request: { sessionId: 'session-1' }, result: status === 'SUCCEEDED' ? { draftId: 'draft-1', draftIterationId: 'iteration-1' } : null })
const comparison = (target = sourceId) => ({ compareAvailable: true, from: { identity: { runtimeInstanceId: sourceId, outcomeAssetVersionId: 'version-2' }, markdown: 'Preserved content' }, to: { identity: { runtimeInstanceId: target, draftId: 'draft-1', draftIterationId: 'iteration-1' }, markdown: 'Recomputed content' }, governance: { changes: [{ field: 'revisionNumber', from: 1, to: 2 }] } })
const mount = (onSaved = vi.fn()) => render(<MemoryRouter><DuplicateOutcomeDialog asset={asset} scope={scope} onClose={vi.fn()} onSaved={onSaved} /></MemoryRouter>)
const prepare = async () => { await screen.findByRole('button', { name: 'Review duplicate' }); await waitFor(() => expect(screen.getByRole('button', { name: 'Review duplicate' })).toBeEnabled()); fireEvent.click(screen.getByRole('button', { name: 'Review duplicate' })); await screen.findByRole('button', { name: 'Confirm duplicate' }) }
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear(); mocks.actor = 'actor-1'; mocks.revision = 0
  mocks.asset.mockImplementation(() => resolved({ currentVersionId: 'version-2', versions: [{ id: 'version-1', versionNumber: 1 }, { id: 'version-2', versionNumber: 2 }] }))
  mocks.preflight.mockImplementation((args) => resolved(preflight(args)))
  mocks.confirm.mockImplementation((args) => resolved({ ...preflight({ ...args, targetRuntimeInstanceId: args.body.targetRuntimeInstanceId }), idempotencyKey: args.body.idempotencyKey, confirmation: { receipt: 'sealed' } }))
  mocks.create.mockImplementation((args) => resolved(saved(args.body.targetRuntimeInstanceId)))
  mocks.byKey.mockImplementation(() => resolved(saved())); mocks.operation.mockImplementation(() => resolved(saved()))
  mocks.compare.mockImplementation(() => resolved(comparison()))
})
describe('governed duplicate confirmation and recovery', () => {
  it('defaults to the canonical source revision and requires two explicit clicks', async () => {
    const onSaved = vi.fn(); mount(onSaved); await prepare()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Target Runtime revision')).toHaveValue(sourceId)
    expect(mocks.confirm.mock.calls[0][0].runtimeInstanceId).toBe(sourceId)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm duplicate' }))
    await screen.findByText('Recomputed content'); expect(onSaved).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Preserved source version')).toBeDisabled()
    expect(mocks.create.mock.calls[0][0].body).toMatchObject({ confirm: true, targetRuntimeInstanceId: sourceId, confirmationReceipt: 'sealed' })
  })
  it('shows an explicitly selected newer target before confirmation', async () => {
    mount(); await waitFor(() => expect(screen.getByLabelText('Target Runtime revision')).toBeEnabled())
    fireEvent.change(screen.getByLabelText('Target Runtime revision'), { target: { value: targetId } })
    await waitFor(() => expect(mocks.preflight).toHaveBeenLastCalledWith(expect.objectContaining({ targetRuntimeInstanceId: targetId })))
    await prepare(); expect(mocks.confirm.mock.calls[0][0].body.targetRuntimeInstanceId).toBe(targetId)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('shows exact source and selected target evidence anchors before confirming', async () => {
    const snapshot = (prefix) => ({ status: 'AVAILABLE', publishSnapshotId: `${prefix}-publish`, publishSnapshotHash: `${prefix}-publish-hash`, lockSnapshotId: `${prefix}-lock`, lockSnapshotHash: `${prefix}-lock-hash`, replayAnchorId: `${prefix}-anchor`, replayAnchorHash: `${prefix}-anchor-hash` })
    mocks.preflight.mockImplementation((args) => { const data = preflight(args); return resolved({ ...data, source: { ...data.source, evidenceSnapshot: snapshot('historical') }, target: { ...data.target, evidenceSnapshot: snapshot('target') } }) })
    mount(); await waitFor(() => expect(screen.getByRole('button', { name: 'Review duplicate' })).toBeEnabled())
    for (const identity of ['historical-publish', 'historical-lock-hash', 'historical-anchor-hash', 'target-publish', 'target-lock-hash', 'target-anchor-hash']) expect(screen.getByText(identity)).toBeInTheDocument()
    expect(mocks.confirm).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled()
  })
  it('recovers a lost POST response through GET without redispatching creation', async () => {
    mocks.create.mockImplementation(() => rejected('Response lost')); mount(); await prepare()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm duplicate' })); await screen.findByText('Response lost')
    fireEvent.click(screen.getByRole('button', { name: 'Check saved result' })); await screen.findByText('Recomputed content')
    expect(mocks.create).toHaveBeenCalledTimes(1); expect(mocks.byKey).toHaveBeenCalledTimes(1)
    expect(mocks.byKey.mock.calls[0][0].idempotencyKey).toBe(mocks.create.mock.calls[0][0].body.idempotencyKey)
  })
  it('restores the same submitted action after reopening and never creates on readback', async () => {
    mocks.create.mockImplementation(() => rejected('Response lost'))
    const first = mount(); await prepare(); fireEvent.click(screen.getByRole('button', { name: 'Confirm duplicate' }))
    await screen.findByText('Response lost'); const submittedKey = mocks.create.mock.calls[0][0].body.idempotencyKey
    first.unmount(); mount(); await screen.findByText('Saved action restored. Check its recorded result before starting another action.')
    expect(screen.queryByRole('button', { name: 'Review duplicate' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Check saved result' })); await screen.findByText('Recomputed content')
    expect(mocks.byKey.mock.calls[0][0].idempotencyKey).toBe(submittedKey); expect(mocks.create).toHaveBeenCalledTimes(1)
  })
  it('allows only one dispatch during repeated confirmation clicks', async () => {
    let finish; mocks.create.mockImplementation(() => ({ unwrap: () => new Promise((resolve) => { finish = resolve }) }))
    mount(); await prepare(); const button = screen.getByRole('button', { name: 'Confirm duplicate' })
    fireEvent.click(button); fireEvent.click(button); expect(mocks.create).toHaveBeenCalledTimes(1)
    await act(async () => finish(saved())); await screen.findByText('Recomputed content')
  })
  it('keeps an unknown GET result frozen and only reoffers confirmation after verified absence', async () => {
    mocks.create.mockImplementation(() => rejected('Response lost')); mocks.byKey.mockImplementation(() => rejected('Read unavailable'))
    mount(); await prepare(); fireEvent.click(screen.getByRole('button', { name: 'Confirm duplicate' })); await screen.findByText('Response lost')
    fireEvent.click(screen.getByRole('button', { name: 'Check saved result' })); await screen.findByText('Read unavailable')
    expect(screen.queryByRole('button', { name: 'Review duplicate' })).not.toBeInTheDocument()
    mocks.byKey.mockImplementation(() => resolved({ status: 'NOT_RECORDED', result: null }))
    fireEvent.click(screen.getByRole('button', { name: 'Check saved result' })); await screen.findByRole('button', { name: 'Review duplicate' })
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })
  it('rejects mismatched comparison identities without announcing saved completion', async () => {
    mocks.compare.mockImplementation(() => resolved(comparison(targetId))); const onSaved = vi.fn(); mount(onSaved); await prepare()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm duplicate' })); await screen.findByText('The saved content comparison could not be verified.')
    expect(onSaved).not.toHaveBeenCalled(); expect(screen.queryByText('Recomputed content')).not.toBeInTheDocument()
  })
  it('ignores late replies after unmount', async () => {
    let finish; mocks.confirm.mockImplementation(() => ({ unwrap: () => new Promise((resolve) => { finish = resolve }) }))
    const view = mount(); await waitFor(() => expect(screen.getByRole('button', { name: 'Review duplicate' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Review duplicate' })); view.unmount()
    await act(async () => finish({ ...preflight({ outcomeAssetVersionId: 'version-2', targetRuntimeInstanceId: sourceId }), confirmation: { receipt: 'sealed' } }))
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('selects a historical source version without silently selecting a newer runtime', async () => {
    mount(); await waitFor(() => expect(screen.getByLabelText('Preserved source version')).toBeEnabled())
    fireEvent.change(screen.getByLabelText('Preserved source version'), { target: { value: 'version-1' } })
    await prepare()
    expect(mocks.confirm.mock.calls[0][0]).toMatchObject({ outcomeAssetVersionId: 'version-1', body: { targetRuntimeInstanceId: sourceId } })
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('exposes metadata recovery only through the actual server capability', async () => {
    const recovery = { ...saved(sourceId, 'RECOVERY_REQUIRED'), recovery: { canCheckSavedWork: true }, links: { reconcile: '/reconcile' } }
    mocks.create.mockImplementation(() => resolved(recovery)); mocks.reconcile.mockImplementation(() => resolved(saved()))
    mount(); await prepare(); fireEvent.click(screen.getByRole('button', { name: 'Confirm duplicate' }))
    await screen.findByRole('button', { name: 'Recover saved result' }); fireEvent.click(screen.getByRole('button', { name: 'Recover saved result' }))
    await screen.findByText('Recomputed content'); expect(mocks.reconcile).toHaveBeenCalledTimes(1); expect(mocks.create).toHaveBeenCalledTimes(1)
  })
  it('does not dispatch when browser recovery identity cannot be stored', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Unavailable') })
    mount(); await screen.findByText('This browser could not save the action for recovery. Check the saved result before proceeding.')
    expect(mocks.confirm).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled(); storage.mockRestore()
  })
  it('does not allocate or overwrite an action when saved recovery storage cannot be read', async () => {
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    const reads = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Unavailable') })
    mount(); await screen.findByText('This browser could not read the saved action for recovery. Check the saved result before proceeding.')
    expect(writes).not.toHaveBeenCalled(); expect(mocks.confirm).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled()
    reads.mockRestore(); writes.mockRestore()
  })
  it('rejects mismatched preflight identities before confirmation', async () => {
    mocks.preflight.mockImplementation((args) => resolved({ ...preflight(args), source: { ...source, runtimeInstanceId: targetId } }))
    mount(); await screen.findByText('The returned source or target does not match this saved action. Refresh its result before proceeding.')
    expect(screen.getByRole('button', { name: 'Review duplicate' })).toBeDisabled(); expect(mocks.confirm).not.toHaveBeenCalled()
  })
  it('ignores a late confirmation across an actor change', async () => {
    let finish; mocks.confirm.mockImplementation(() => ({ unwrap: () => new Promise((resolve) => { finish = resolve }) }))
    const view = mount(); await waitFor(() => expect(screen.getByRole('button', { name: 'Review duplicate' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Review duplicate' })); mocks.actor = 'actor-2'
    view.rerender(<MemoryRouter><DuplicateOutcomeDialog asset={asset} scope={scope} onClose={vi.fn()} /></MemoryRouter>)
    await act(async () => finish({ ...preflight({ outcomeAssetVersionId: 'version-2', targetRuntimeInstanceId: sourceId }), idempotencyKey: 'irrelevant', confirmation: { receipt: 'sealed' } }))
    expect(screen.queryByRole('button', { name: 'Confirm duplicate' })).not.toBeInTheDocument(); expect(mocks.create).not.toHaveBeenCalled()
  })
})
