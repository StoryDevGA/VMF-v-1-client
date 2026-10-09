import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import SourceVerificationForm from './SourceVerificationForm.jsx'

const mocks = vi.hoisted(() => ({ record: vi.fn(), refresh: vi.fn(), session: 1 }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({ useRecordRuntimeSourceVerificationMutation: () => [mocks.record] }))
vi.mock('../../utils/tokenStorage.js', () => ({ getSessionRevision: () => mocks.session }))
const hash = `sha256:${'a'.repeat(64)}`
const facts = { authenticity: 'AUTHENTIC', sourceOrigin: 'Original publisher', organizationRelationship: 'External',
  independenceGroup: 'publisher-1', supportingReference: 'review:fixture', rationale: 'Checked original source.' }
const scope = { runtimeInstanceId: 'runtime-1', customerId: 'customer-1', tenantId: 'tenant-1', stateVersion: 'version-1', sessionRevision: 1 }
const props = () => ({ source: { sourceId: 'source-1', materialFingerprint: hash, verificationContext: facts }, scope,
  authority: { canReviewEvidence: true, control: { id: scope.runtimeInstanceId, ...scope }, runtimeUpdatedAt: '2026-10-09T10:00:00Z' },
  locked: false, refresh: mocks.refresh })
const receipt = () => ({ data: { sourceId: 'source-1', stateVersion: 'version-2', verificationContext: { ...facts,
  contractVersion: 'source-recorded-review.v1', status: 'RECORDED_REVIEW', sourceFingerprint: hash,
  reviewedBy: '64b000000000000000000001', reviewedAt: '2026-10-09T10:01:00Z' } } })
beforeEach(() => { vi.clearAllMocks(); mocks.session = 1; mocks.refresh.mockResolvedValue(true);
  mocks.record.mockReturnValue({ unwrap: async () => receipt() }) })

it('records exact source/timestamp facts and waits for verified refresh', async () => {
  render(<SourceVerificationForm {...props()} />)
  expect(screen.getByRole('textbox', { name: /Source origin/ })).toHaveValue(facts.sourceOrigin)
  await userEvent.click(screen.getByRole('button', { name: 'Record source review' }))
  expect(mocks.record).toHaveBeenCalledWith({ runtimeInstanceId: scope.runtimeInstanceId, sourceId: 'source-1',
    body: { expectedUpdatedAt: '2026-10-09T10:00:00Z', expectedSourceFingerprint: hash, facts } })
  expect(mocks.refresh).toHaveBeenCalledWith(receipt().data)
  expect(await screen.findByRole('status')).toHaveTextContent('Review recorded')
})
it.each(['locked', 'stale', 'unknown'])('disables %s source review', kind => {
  const value = props()
  if (kind === 'locked') value.locked = true
  if (kind === 'stale') value.authority.control.stateVersion = 'old'
  if (kind === 'unknown') value.authority.canReviewEvidence = false
  render(<SourceVerificationForm {...value} />)
  expect(screen.getByRole('button', { name: 'Record source review' })).toBeDisabled()
})
it('rejects a mismatching receipt without refreshing or claiming success', async () => {
  mocks.record.mockReturnValue({ unwrap: async () => ({ data: { ...receipt().data, sourceId: 'different' } }) })
  render(<SourceVerificationForm {...props()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Record source review' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('did not match')
  expect(mocks.refresh).not.toHaveBeenCalled()
})
it('does not send through an expired session', async () => {
  render(<SourceVerificationForm {...props()} />)
  mocks.session = 2
  await userEvent.click(screen.getByRole('button', { name: 'Record source review' }))
  expect(mocks.record).not.toHaveBeenCalled()
})

it.each([false, true])('pending response survives equivalent props but rejects changed scope (%s)', async changed => {
  let finish
  mocks.record.mockReturnValue({ unwrap: () => new Promise(resolve => { finish = resolve }) })
  const view = render(<SourceVerificationForm {...props()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Record source review' }))
  const next = props()
  next.scope = { ...scope, ...(changed ? { tenantId: 'other-tenant' } : {}) }
  next.authority = { ...next.authority, control: { ...next.authority.control } }
  view.rerender(<SourceVerificationForm {...next} />)
  finish(receipt())
  if (changed) {
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mocks.refresh).not.toHaveBeenCalled()
  } else {
    expect(await screen.findByRole('status')).toHaveTextContent('Review recorded')
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  }
})
