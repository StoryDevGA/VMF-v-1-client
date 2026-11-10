import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { getSessionRevision } from '../../utils/tokenStorage.js'
import PostLockAdmissionPanel from './PostLockAdmissionPanel.jsx'
import { postLockAdmissionIdentity } from './postLockSubmissionModel.js'

const calls = vi.hoisted(() => ({ send: vi.fn(), inspect: vi.fn(), saved: null }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useAdmitRuntimePostLockEvidenceMutation: () => [calls.send],
  useLazyGetRuntimePostLockEvidenceQuery: () => [calls.inspect],
  useGetRuntimeInstanceQuery: (_args, options) => ({ isFetching: !options.skip }),
}))
vi.mock('./postLockSubmissionModel.js', async original => ({ ...await original(), readSavedPostLockEvidence: () => calls.saved }))
const actor = '9'.repeat(24), at = '2026-11-09T18:00:00.000Z', submissionId = 'a'.repeat(64)
const scope = { runtimeInstanceId: 'parent-r1', customerId: '2'.repeat(24), tenantId: '3'.repeat(24) }
const fixture = () => ({ submissionId, requestDigest: 'b'.repeat(64), source: { licensing: { retentionPermitted: true } }, evidence: { statement: 'New fact.' },
  binding: { ...scope, runtimeInstanceId: '1'.repeat(24), runtimeInstanceKey: 'parent-r1', revisionNumber: 1,
    basisStateVersion: 'rsv2:123e4567-e89b-42d3-a456-426614174000', evidenceSnapshotId: 'evidence_snapshot_123e4567-e89b-42d3-a456-426614174001',
    membershipHash: 'c'.repeat(64), lockSnapshotId: 'lock-1', lockSnapshotHash: 'd'.repeat(64), packageId: '4'.repeat(24), packageVersion: '1.0',
    dependencySnapshotId: 'dep-1', dependencySnapshotHash: 'e'.repeat(64), policyHash: 'f'.repeat(64) },
  readState: { contractVersion: 'post-lock-evidence-read-state.v1', readAt: at, currency: 'AS_READ',
    impact: { state: 'RECORDED', verification: { status: 'VERIFIED', reason: null }, headHash: 'd'.repeat(64), decisionCount: 1,
      latestDecision: { decisionId: `post_lock_impact_${'e'.repeat(64)}`, sequence: 1, disposition: 'SUCCESSOR_REVISION_REQUIRED', rationale: 'Requires a revision.',
        reviewerUserId: actor, authority: 'VMF_UPDATE', decidedAt: at, previousDecisionHash: null, decisionHash: 'd'.repeat(64), audit: { id: '8'.repeat(24), signatureVersion: 3 }, verified: true, isCurrent: true } },
    admission: { state: 'NOT_RECORDED', verification: { status: 'NOT_APPLICABLE', reason: null }, initialBasis: null },
    actions: { recordImpact: { eligibility: 'ELIGIBLE_AS_READ', blockedBy: [] }, admission: { eligibility: 'ELIGIBLE_AS_READ', blockedBy: [],
      operationalChecks: { indexes: 'NOT_CHECKED', execution: 'RECHECKED_ON_SUBMIT' } } } } })
const mount = (receipt = fixture()) => render(<MemoryRouter><PostLockAdmissionPanel receipt={receipt} scope={scope}
  renderer={{ runtimeInstance: { updatedAt: at } }} lockBasis={{}} frameKey="owned" actorId={actor} sessionRevision={getSessionRevision()} /></MemoryRouter>)
const prepare = async () => {
  await userEvent.type(screen.getByLabelText('Reason for successor admission'), 'Carry this evidence into the next revision for review.')
  await userEvent.click(screen.getByLabelText('Confirm admission to a new successor revision'))
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal('crypto', webcrypto)
  calls.send.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
  calls.inspect.mockImplementation(() => ({ unwrap: async () => {
    const body = calls.send.mock.calls.at(-1)[0].body, value = fixture()
    value.readState.admission = { state: 'RECORDED', verification: { status: 'VERIFIED', reason: null },
      admissionId: await postLockAdmissionIdentity(body.postLockAdmission), admittedAt: at, actorUserId: actor, rationale: body.postLockAdmission.rationale,
      selectedDecision: { decisionId: value.readState.impact.latestDecision.decisionId, decisionHash: 'd'.repeat(64), sequence: 1, disposition: 'SUCCESSOR_REVISION_REQUIRED' },
      child: { runtimeInstanceId: '7'.repeat(24), runtimeInstanceKey: 'child-r2', revisionNumber: 2 }, receipt: { auditId: '8'.repeat(24), signatureVersion: 3 },
      initialBasis: { status: 'NOT_REVALIDATED', basisStateVersion: 'rsv2:123e4567-e89b-42d3-a456-426614174009', membershipHash: 'f'.repeat(64) } }
    value.readState.actions.admission.eligibility = 'BLOCKED'; value.readState.actions.admission.blockedBy = ['POST_LOCK_ADMISSION_ALREADY_RECORDED']
    calls.saved = value; return {}
  } }))
})
afterEach(() => vi.unstubAllGlobals())
describe('one explicit successor admission', () => {
  it.each([403, 409, 503])('withdraws eligibility after refresh %s and requires a verified read plus renewed confirmation', async status => {
    calls.inspect.mockImplementationOnce(() => ({ unwrap: () => Promise.reject({ status }) }))
    mount(); await prepare()
    await userEvent.click(screen.getByRole('button', { name: 'Refresh admission state' }))
    expect(await screen.findByText('The saved admission could not be verified. No new successor request was sent.')).toHaveAttribute('role', 'alert')
    expect(screen.queryByRole('form', { name: 'Admit reviewed evidence to successor' })).not.toBeInTheDocument()
    expect(calls.send).not.toHaveBeenCalled()
    calls.saved = fixture()
    calls.inspect.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
    await userEvent.click(screen.getByRole('button', { name: 'Refresh admission state' }))
    expect(await screen.findByRole('form', { name: 'Admit reviewed evidence to successor' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Admit evidence and create successor' })).toBeDisabled()
    expect(screen.getByLabelText('Confirm admission to a new successor revision')).not.toBeChecked()
  })
  it('withholds the previous eligibility while its refresh is pending', async () => {
    let finish
    calls.inspect.mockImplementation(() => ({ unwrap: () => new Promise(resolve => { finish = resolve }) }))
    mount(); await prepare()
    await userEvent.click(screen.getByRole('button', { name: 'Refresh admission state' }))
    expect(screen.queryByRole('form', { name: 'Admit reviewed evidence to successor' })).not.toBeInTheDocument()
    expect(calls.send).not.toHaveBeenCalled()
    calls.saved = fixture()
    await act(async () => finish({}))
    expect(await screen.findByRole('form', { name: 'Admit reviewed evidence to successor' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Admit evidence and create successor' })).toBeDisabled()
  })
  it('does not clear an uncertain admission intent when a later read fails or returns no recorded admission', async () => {
    calls.send.mockImplementation(() => ({ unwrap: () => Promise.reject({ status: 'FETCH_ERROR' }) }))
    mount(); await prepare()
    await userEvent.click(screen.getByRole('button', { name: 'Admit evidence and create successor' }))
    calls.inspect.mockImplementationOnce(() => ({ unwrap: () => Promise.reject({ status: 503 }) }))
    await userEvent.click(screen.getByRole('button', { name: 'Check original admission' }))
    expect(await screen.findByText('The saved admission could not be verified. No new successor request was sent.')).toHaveAttribute('role', 'alert')
    calls.saved = fixture()
    calls.inspect.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
    await userEvent.click(screen.getByRole('button', { name: 'Check original admission' }))
    expect(screen.queryByRole('form', { name: 'Admit reviewed evidence to successor' })).not.toBeInTheDocument()
    expect(calls.send).toHaveBeenCalledOnce()
  })
  it('requires its own reason and confirmation, sends once and reads the exact saved admission', async () => {
    mount(); expect(screen.getByRole('button', { name: 'Admit evidence and create successor' })).toBeDisabled()
    await prepare(); await userEvent.click(screen.getByRole('button', { name: 'Admit evidence and create successor' }))
    expect(await screen.findByRole('region', { name: 'Verified successor admission' })).toHaveTextContent('Evidence admitted to a successor')
    expect(calls.send).toHaveBeenCalledOnce(); expect(calls.inspect).toHaveBeenCalledOnce()
    expect(calls.inspect.mock.calls[0][0]).toMatchObject({ admissionRead: true })
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.getByText('Reading the successor’s own evidence basis and readiness…')).toBeVisible()
  })
  it.each(['CORROBORATIVE', 'CURRENTNESS_REVIEW_REQUIRED'])('does not offer admission for %s', disposition => {
    const value = fixture(); value.readState.impact.latestDecision.disposition = disposition
    value.readState.actions.admission = { ...value.readState.actions.admission, eligibility: 'BLOCKED', blockedBy: ['POST_LOCK_ADMISSION_DISPOSITION_BLOCKED'] }
    mount(value); expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.getByText(/latest verified decision must be Successor/)).toBeVisible(); expect(calls.send).not.toHaveBeenCalled()
  })
  it('blocks a stale request without automatically creating another successor', async () => {
    calls.send.mockImplementation(() => ({ unwrap: () => Promise.reject({ status: 409 }) }))
    mount(); await prepare(); await userEvent.click(screen.getByRole('button', { name: 'Admit evidence and create successor' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('blocked or its basis changed')
    expect(screen.queryByRole('form')).not.toBeInTheDocument(); expect(calls.send).toHaveBeenCalledOnce()
  })
  it('does not consume a late admission after leaving the selected evidence', async () => {
    let finish
    calls.send.mockImplementation(() => ({ unwrap: () => new Promise(resolve => { finish = resolve }) }))
    const view = mount(); await prepare(); await userEvent.click(screen.getByRole('button', { name: 'Admit evidence and create successor' }))
    await waitFor(() => expect(calls.send).toHaveBeenCalledOnce()); view.unmount()
    await act(async () => finish({})); expect(calls.inspect).not.toHaveBeenCalled()
  })
})
