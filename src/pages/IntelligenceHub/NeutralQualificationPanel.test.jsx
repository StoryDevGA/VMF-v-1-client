import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import NeutralQualificationPanel from './NeutralQualificationPanel.jsx'
import { NEUTRAL_FIELDS, neutralQualificationHash as hash } from './neutralQualificationModel.js'

const state = vi.hoisted(() => ({ query: {}, history: {}, save: vi.fn(), exact: vi.fn(), request: vi.fn(), refresh: vi.fn(), historyRefresh: vi.fn(), session: 1 }))
vi.mock('../../utils/tokenStorage.js', () => ({ getSessionRevision: () => state.session, subscribeToSession: () => () => {} }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetEvidenceNeutralQualificationQuery: () => ({ ...state.query, refetch: state.refresh }),
  useGetEvidenceNeutralQualificationHistoryQuery: () => ({ ...state.history, refetch: state.historyRefresh }),
  useSaveEvidenceNeutralQualificationMutation: () => [state.save],
  useLazyGetEvidenceNeutralQualificationReceiptQuery: () => [state.exact],
  useLazyGetEvidenceNeutralQualificationRequestQuery: () => [state.request],
}))
const scope = { runtimeInstanceId: '333333333333333333333333', customerId: '111111111111111111111111', tenantId: '222222222222222222222222' }
const selectedScope = { ...scope, runtimeInstanceKey: 'revision-key', revisionNumber: 1, evidenceObjectId: 'item', sourceId: 'source' }
const fingerprint = `sha256:${'a'.repeat(64)}`
const initialControl = { stateVersion: 'rsv2:00000000-0000-4000-8000-000000000001', updatedAt: '2026-11-19T12:00:00.000Z', evidenceFingerprint: fingerprint, sourceFingerprint: fingerprint }
const props = () => ({ scope, evidenceObjectId: 'item', sourceId: 'source', stateVersion: 'rsv2:00000000-0000-4000-8000-000000000001', onRecorded: vi.fn().mockResolvedValue(true) })
let receipts
async function responseFor(command, id = '10000000-0000-4000-8000-000000000001') {
  const qualification = { contractVersion: 'evidence-neutral-qualification.v1', receiptId: id, authoredBy: 'a'.repeat(24),
    authoredAt: '2026-11-19T12:01:00.000Z', binding: { evidenceObjectId: 'item', sourceId: 'source', evidenceFingerprint: fingerprint, sourceFingerprint: fingerprint }, facts: command.facts }
  const qualificationHash = await hash(qualification)
  const body = { operation: 'RECORD_NEUTRAL_QUALIFICATION', scope: selectedScope, inputStateVersion: command.expectedStateVersion,
    outputStateVersion: 'rsv2:00000000-0000-4000-8000-000000000002', qualificationHash, previousQualificationHash: command.expectedQualificationHash,
    previousReceiptId: null, qualification, rationale: command.rationale }
  const receipt = { contractVersion: 'evidence-neutral-qualification-receipt.v1', receiptId: id, requestKey: command.requestKey,
    payloadHash: await hash({ actorUserId: qualification.authoredBy, payload: command }), bodyHash: await hash(body), auditId: 'b'.repeat(24), auditVerified: true, body }
  return { scope: selectedScope, control: { ...initialControl, stateVersion: 'rsv2:00000000-0000-4000-8000-000000000002', updatedAt: qualification.authoredAt },
    qualification, qualificationHash, bindingCurrency: 'MATCHES_CURRENT_MATERIAL', receipt, receiptCurrency: 'CURRENT', replay: false }
}
function remember(response) {
  receipts.set(response.receipt.receiptId, response)
  state.query = { currentData: { scope: selectedScope, control: response.control, qualification: response.qualification,
    qualificationHash: response.qualificationHash, bindingCurrency: response.bindingCurrency, latestReceipt: response.receipt, canWrite: true } }
  state.history = { currentData: { scope: selectedScope, items: [response.receipt], nextCursor: null } }
}
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal('crypto', webcrypto); state.session = 1; receipts = new Map()
  state.query = { currentData: { scope: selectedScope, control: initialControl, canWrite: true, qualification: null,
    qualificationHash: null, bindingCurrency: 'ABSENT', latestReceipt: null } }
  state.history = { currentData: { scope: selectedScope, items: [], nextCursor: null } }
  state.refresh.mockImplementation(async () => ({ data: state.query.currentData }))
  state.historyRefresh.mockImplementation(async () => ({ data: state.history.currentData }))
  state.exact.mockImplementation(args => ({ unwrap: async () => receipts.get(args.receiptId) }))
  state.request.mockImplementation(() => ({ unwrap: async () => { throw { status: 404 } } }))
  state.save.mockImplementation(args => ({ unwrap: async () => {
    const response = await responseFor(args.body); remember(response); return response
  } }))
})
async function edit() {
  fireEvent.click(await screen.findByRole('button', { name: 'Edit qualification' }))
  return screen.getByRole('form', { name: 'Record neutral evidence qualification' })
}
it('records explicit unknowns and historical text with a null optional note, then reads receipt/current/history before refresh', async () => {
  const options = props(); render(<NeutralQualificationPanel {...options} />)
  await edit()
  fireEvent.change(screen.getByLabelText('Currentness as recorded'), { target: { value: 'Unknown' } })
  fireEvent.change(screen.getByLabelText('Historical context'), { target: { value: 'HISTORICAL' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save qualifications' }))
  await waitFor(() => expect(options.onRecorded).toHaveBeenCalledOnce())
  expect(state.save).toHaveBeenCalledOnce()
  const command = state.save.mock.calls[0][0]
  expect(command).toMatchObject({ ...scope, evidenceObjectId: 'item', sourceId: 'source', body: { rationale: null,
    expectedStateVersion: 'rsv2:00000000-0000-4000-8000-000000000001', expectedQualificationHash: null, facts: { currentness: 'Unknown', historicalContext: 'HISTORICAL', attribution: null } } })
  expect(Object.keys(command.body.facts)).toHaveLength(9)
  expect(command.body).not.toHaveProperty('authenticity')
  expect(command.body).not.toHaveProperty('reviewStatus')
  expect(state.exact).toHaveBeenCalledWith(expect.objectContaining({ receiptId: '10000000-0000-4000-8000-000000000001' }), false)
  expect(state.refresh).toHaveBeenCalled(); expect(state.historyRefresh).toHaveBeenCalled()
  expect(await screen.findByText(/Qualification saved and reopened/)).toBeVisible()
})
it('cancels a pre-save draft without any mutation and does not carry it into the next edit', async () => {
  render(<NeutralQualificationPanel {...props()} />)
  await edit(); fireEvent.change(screen.getByLabelText('Attribution'), { target: { value: 'A local draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cancel qualification edit' }))
  expect(state.save).not.toHaveBeenCalled()
  await edit(); expect(screen.getByLabelText('Attribution')).toHaveValue('')
})
it.each([{ canWrite: false }, { locked: true }])('keeps known qualifications inspectable without update permission or while locked %j', async change => {
  if ('canWrite' in change) state.query.currentData.canWrite = change.canWrite
  render(<NeutralQualificationPanel {...props()} {...change} />)
  expect(await screen.findByRole('button', { name: 'Edit qualification' })).toBeDisabled()
  expect(screen.getByText(/inspection is read-only/)).toBeVisible()
  expect(state.save).not.toHaveBeenCalled()
})
it('shows current-read and history failures as unavailable instead of an empty qualification or history', async () => {
  state.query = { error: { status: 503 } }; state.history = { error: { status: 503 } }
  render(<NeutralQualificationPanel {...props()} />)
  expect(screen.getByText(/Current qualification is unavailable/)).toBeVisible()
  expect(screen.getByText(/history is unavailable; no empty history/)).toBeVisible()
  expect(screen.queryByText(/No neutral qualification has been recorded/)).not.toBeInTheDocument()
  expect(state.save).not.toHaveBeenCalled()
})
it('retains an uncertain original key, performs GET recovery only and can verify it after locking', async () => {
  const options = props(); const page = render(<NeutralQualificationPanel {...options} />)
  state.save.mockImplementation(args => ({ unwrap: async () => {
    const response = await responseFor(args.body); remember(response); throw { status: 503 }
  } }))
  await edit(); fireEvent.click(screen.getByRole('button', { name: 'Save qualifications' }))
  await screen.findByText(/Further saves are blocked until/)
  const command = state.save.mock.calls[0][0].body
  // A later authored qualification, not locking by itself, makes the recovered receipt historical.
  const original = receipts.get('10000000-0000-4000-8000-000000000001')
  const nextCommand = { ...command, requestKey: '00000000-0000-4000-8000-000000000002',
    expectedStateVersion: original.control.stateVersion, expectedUpdatedAt: original.control.updatedAt,
    expectedQualificationHash: original.qualificationHash, facts: { ...command.facts, currentness: 'Unknown' } }
  const current = await responseFor(nextCommand, '10000000-0000-4000-8000-000000000002')
  current.qualification.authoredAt = '2026-11-19T12:02:00.000Z'
  current.qualificationHash = await hash(current.qualification)
  current.receipt.body.qualificationHash = current.qualificationHash
  current.receipt.body.previousReceiptId = original.receipt.receiptId
  current.receipt.body.outputStateVersion = 'rsv2:00000000-0000-4000-8000-000000000003'
  current.receipt.bodyHash = await hash(current.receipt.body)
  current.control = { ...current.control, stateVersion: current.receipt.body.outputStateVersion,
    updatedAt: current.qualification.authoredAt }
  remember(current)
  state.query.currentData.canWrite = false
  const historical = { ...original, control: current.control, receiptCurrency: 'HISTORICAL', replay: true }
  receipts.set(original.receipt.receiptId, historical)
  state.history.currentData.items = [current.receipt, original.receipt]
  state.request.mockImplementation(() => ({ unwrap: async () => historical }))
  page.rerender(<NeutralQualificationPanel {...options} locked stateVersion={current.control.stateVersion} />)
  const recover = await screen.findByRole('button', { name: 'Recover original qualification request' })
  await waitFor(() => expect(recover).toBeEnabled()); fireEvent.click(recover)
  await waitFor(() => expect(options.onRecorded).toHaveBeenCalledOnce())
  expect(state.request).toHaveBeenCalledWith(expect.objectContaining({ requestKey: command.requestKey }), false)
  expect(state.save).toHaveBeenCalledOnce()
  expect(await screen.findByText(/This is an earlier record/)).toBeVisible()
})
it('keeps a missing original-request read unresolved without sending a second PATCH', async () => {
  state.save.mockImplementation(() => ({ unwrap: async () => { throw { status: 503 } } }))
  render(<NeutralQualificationPanel {...props()} />)
  await edit(); fireEvent.click(screen.getByRole('button', { name: 'Save qualifications' }))
  const recover = await screen.findByRole('button', { name: 'Recover original qualification request' })
  await waitFor(() => expect(recover).toBeEnabled()); fireEvent.click(recover)
  await waitFor(() => expect(state.request).toHaveBeenCalledOnce())
  expect(state.save).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: 'Save qualifications' })).toBeDisabled()
})
it('refuses a mismatched readback, never claims success and retains the original recovery identity', async () => {
  state.exact.mockImplementation(() => ({ unwrap: async () => ({}) }))
  const options = props(); render(<NeutralQualificationPanel {...options} />)
  await edit(); fireEvent.click(screen.getByRole('button', { name: 'Save qualifications' }))
  await screen.findByText(/could not be reopened exactly/)
  expect(options.onRecorded).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Save qualifications' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Recover original qualification request' })).toBeEnabled()
})
it('ignores a late save after a session change and never refreshes the departed account', async () => {
  let complete
  state.save.mockImplementation(args => ({ unwrap: () => new Promise(resolve => { complete = async () => resolve(await responseFor(args.body)) }) }))
  const options = props(); const page = render(<NeutralQualificationPanel {...options} />)
  await edit(); fireEvent.click(screen.getByRole('button', { name: 'Save qualifications' }))
  state.session = 2; page.rerender(<NeutralQualificationPanel {...options} />)
  await act(async () => { await complete() })
  expect(state.exact).not.toHaveBeenCalled(); expect(options.onRecorded).not.toHaveBeenCalled()
})
it('ignores a late response after the same account changes selected tenant', async () => {
  let complete
  state.save.mockImplementation(args => ({ unwrap: () => new Promise(resolve => { complete = async () => resolve(await responseFor(args.body)) }) }))
  const options = props(); const page = render(<NeutralQualificationPanel {...options} />)
  await edit(); fireEvent.click(screen.getByRole('button', { name: 'Save qualifications' }))
  page.rerender(<NeutralQualificationPanel {...options} scope={{ ...scope, tenantId: '444444444444444444444444' }} />)
  await act(async () => { await complete() })
  expect(state.exact).not.toHaveBeenCalled(); expect(options.onRecorded).not.toHaveBeenCalled()
})
it('blocks stale drafts after a material/read basis change until the user cancels and inspects again', async () => {
  const options = props(); const page = render(<NeutralQualificationPanel {...options} />)
  await edit(); fireEvent.change(screen.getByLabelText('Attribution'), { target: { value: 'An earlier local draft' } })
  state.query = { currentData: { ...state.query.currentData, control: { ...initialControl, stateVersion: 'rsv2:00000000-0000-4000-8000-000000000002' } } }
  page.rerender(<NeutralQualificationPanel {...options} stateVersion="rsv2:00000000-0000-4000-8000-000000000002" />)
  await screen.findByText(/qualification basis changed/)
  expect(screen.getByRole('button', { name: 'Save qualifications' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel qualification edit' }))
  await edit(); expect(screen.getByLabelText('Attribution')).toHaveValue('')
  expect(state.save).not.toHaveBeenCalled()
})
it('keeps a committed receipt blocked when history readback is unavailable instead of inventing an empty history', async () => {
  state.historyRefresh.mockResolvedValue({ error: { status: 503 } })
  const options = props(); render(<NeutralQualificationPanel {...options} />)
  await edit(); fireEvent.click(screen.getByRole('button', { name: 'Save qualifications' }))
  await screen.findByText(/receipt is verified, but current qualification or history reads/)
  expect(options.onRecorded).not.toHaveBeenCalled()
  expect(screen.queryByText(/Qualification saved and reopened/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save qualifications' })).toBeDisabled()
})
it('does not send a second PATCH for a duplicate submit while the first is in flight', async () => {
  let complete
  state.save.mockImplementation(args => ({ unwrap: () => new Promise(resolve => { complete = async () => { const response = await responseFor(args.body); remember(response); resolve(response) } }) }))
  render(<NeutralQualificationPanel {...props()} />)
  const form = await edit(); fireEvent.submit(form); fireEvent.submit(form)
  expect(state.save).toHaveBeenCalledOnce()
  await act(async () => { await complete() })
  await screen.findByText(/Qualification saved and reopened/)
})
it('completes readback across its own parent state-version advance without leaving busy controls', async () => {
  function Parent() {
    const [version, setVersion] = useState('rsv2:00000000-0000-4000-8000-000000000001')
    return <NeutralQualificationPanel {...props()} stateVersion={version} onRecorded={async () => { setVersion('rsv2:00000000-0000-4000-8000-000000000002'); return true }} />
  }
  render(<Parent />); await edit(); fireEvent.click(screen.getByRole('button', { name: 'Save qualifications' }))
  await screen.findByText(/Qualification saved and reopened/)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Edit qualification' })).toBeEnabled())
})
it('reopens an exact history record and keeps historical authored fields separate from binding currency', async () => {
  const command = { requestKey: '00000000-0000-4000-8000-000000000001', expectedStateVersion: 'rsv2:00000000-0000-4000-8000-000000000001',
    expectedUpdatedAt: initialControl.updatedAt, expectedEvidenceFingerprint: fingerprint, expectedSourceFingerprint: fingerprint,
    expectedQualificationHash: null, facts: Object.fromEntries(NEUTRAL_FIELDS.map(([key]) => [key, key === 'currentness' ? 'Unknown' : null])), rationale: null }
  const response = await responseFor(command); remember(response)
  state.exact.mockImplementation(() => ({ unwrap: async () => ({ ...response, receiptCurrency: 'HISTORICAL' }) }))
  render(<NeutralQualificationPanel {...props()} stateVersion="rsv2:00000000-0000-4000-8000-000000000002" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Reopen qualification 10000000-0000-4000-8000-000000000001' }))
  expect(await screen.findByText(/Earlier recorded receipt/)).toBeVisible()
  expect(within(screen.getAllByRole('region', { name: 'Recorded neutral qualification' }).at(-1)).getByText('Unknown')).toBeVisible()
  expect(state.save).not.toHaveBeenCalled()
})
