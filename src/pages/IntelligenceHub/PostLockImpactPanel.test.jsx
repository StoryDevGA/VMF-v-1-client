import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash, webcrypto } from 'node:crypto'
import { getSessionRevision } from '../../utils/tokenStorage.js'
import PostLockImpactPanel from './PostLockImpactPanel.jsx'

const calls = vi.hoisted(() => ({ read: vi.fn(), send: vi.fn(), inspect: vi.fn(), refresh: vi.fn() }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetRuntimePostLockImpactHistoryQuery: (...args) => calls.read(...args),
  useLazyGetRuntimePostLockImpactHistoryQuery: () => [calls.inspect],
  useRecordRuntimePostLockImpactMutation: () => [calls.send],
}))
const actor = '9'.repeat(24), submissionId = 'a'.repeat(64), at = '2026-11-09T17:00:00.000Z'
const scope = { runtimeInstanceId: 'locked-r1', customerId: '2'.repeat(24), tenantId: '3'.repeat(24) }
const receipt = { submissionId, requestDigest: 'b'.repeat(64), binding: { ...scope, runtimeInstanceId: '1'.repeat(24), runtimeInstanceKey: 'locked-r1',
  revisionNumber: 1, basisStateVersion: 'rsv2:123e4567-e89b-42d3-a456-426614174000',
  evidenceSnapshotId: 'evidence_snapshot_123e4567-e89b-42d3-a456-426614174001', membershipHash: 'c'.repeat(64),
  lockSnapshotId: 'lock-1', lockSnapshotHash: 'd'.repeat(64), packageId: '4'.repeat(24), packageVersion: '1.0',
  dependencySnapshotId: 'dependency-1', dependencySnapshotHash: 'e'.repeat(64), policyHash: 'f'.repeat(64) } }
const history = entry => ({ meta: { requestId: 'impact-read', version: 'v1' }, data: { contractVersion: 'post-lock-impact-history.v1', submissionId,
  intakeStatus: 'PENDING_REVIEW', verification: { status: 'VERIFIED', reason: null },
  impact: { state: entry ? 'RECORDED' : 'NOT_RECORDED', headHash: entry?.decisionHash ?? null, latestDecision: entry ?? null },
  entries: entry ? [entry] : [], pagination: { afterSequence: 0, limit: 20, nextAfterSequence: null, total: entry ? 1 : 0 },
  canRecord: true, blockedBy: [], admissionAvailable: false } })
const mount = () => render(<PostLockImpactPanel scope={scope} receipt={receipt} actorId={actor} frameKey="current"
  sessionRevision={getSessionRevision()} />)
const prepare = async () => {
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Impact outcome' }), 'CORROBORATIVE')
  await userEvent.type(screen.getByLabelText('Reason for this decision'), 'Supports the existing understanding.')
  await userEvent.click(screen.getByLabelText('Confirm this impact decision'))
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal('crypto', webcrypto)
  calls.read.mockImplementation(args => ({ isSuccess: true, currentData: history(), originalArgs: args, refetch: calls.refresh }))
  calls.send.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
  calls.inspect.mockImplementation(() => ({ unwrap: () => {
    const body = calls.send.mock.calls.at(-1)[0].body
    const decisionId = 'post_lock_impact_' + createHash('sha256').update(JSON.stringify({ requestKey: body.requestKey, submissionId })).digest('hex')
    return Promise.resolve(history({ decisionId, sequence: 1, disposition: body.disposition, rationale: body.rationale,
      reviewerUserId: actor, authority: 'VMF_UPDATE', decidedAt: at, previousDecisionHash: null, decisionHash: 'd'.repeat(64),
      audit: { id: '8'.repeat(24), signatureVersion: 3 }, verified: true, isCurrent: true }))
  } }))
})
afterEach(() => vi.unstubAllGlobals())
describe('one authorised impact review', () => {
  it('requires outcome, rationale and confirmation, then records once and reopens the exact audited decision', async () => {
    mount(); expect(screen.getByRole('button', { name: 'Record impact decision' })).toBeDisabled()
    await prepare(); await userEvent.click(screen.getByRole('button', { name: 'Record impact decision' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('recorded and read back'))
    expect(screen.getByRole('region', { name: 'Impact decision history' })).toHaveTextContent('Supports the existing understanding.')
    expect(screen.getByRole('region', { name: 'Impact decision history' })).toHaveTextContent('Audit receipt')
    expect(calls.send).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Record impact decision' })).not.toBeInTheDocument()
  })
  it('withholds recording when the server denies reviewer permission', () => {
    const value = history(); value.data.canRecord = false; value.data.blockedBy = ['VMF_UPDATE_REQUIRED']
    calls.read.mockImplementation(args => ({ isSuccess: true, currentData: value, originalArgs: args }))
    mount(); expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.getByText('Recording a decision requires an authorised workspace reviewer.')).toBeVisible()
    expect(calls.send).not.toHaveBeenCalled()
  })
  it('shows loading without enabling a decision', () => {
    calls.read.mockReturnValue({ isFetching: true }); mount()
    expect(screen.getByRole('status')).toHaveTextContent('Loading impact decisions')
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })
  it('rejects foreign cached history and unverified audits', () => {
    calls.read.mockImplementation(args => ({ isSuccess: true, currentData: history(), originalArgs: { ...args, submissionId: 'b'.repeat(64) } }))
    mount(); expect(screen.getByRole('alert')).toHaveTextContent('could not be verified')
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })
  it('keeps an outdated decision blocked without automatically retrying it', async () => {
    calls.send.mockImplementation(() => ({ unwrap: () => Promise.reject({ status: 409 }) }))
    mount(); await prepare(); await userEvent.click(screen.getByRole('button', { name: 'Record impact decision' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('changed')
    expect(screen.queryByRole('form')).not.toBeInTheDocument(); expect(calls.send).toHaveBeenCalledOnce()
  })
  it('does not read or display a late decision after leaving the selected item', async () => {
    let finish
    calls.send.mockImplementation(() => ({ unwrap: () => new Promise(resolve => { finish = resolve }) }))
    const view = mount(); await prepare(); await userEvent.click(screen.getByRole('button', { name: 'Record impact decision' }))
    await waitFor(() => expect(calls.send).toHaveBeenCalledOnce()); view.unmount()
    await act(async () => finish({})); expect(calls.inspect).not.toHaveBeenCalled()
  })
})
