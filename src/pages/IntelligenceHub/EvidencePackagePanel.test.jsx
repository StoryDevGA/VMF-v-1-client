import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import EvidencePackagePanel from './EvidencePackagePanel.jsx'
import { scope, version, preview, wrapReceipt, frozenFixture, packageFixture } from '../../test/evidencePackageFixture.js'

const state = vi.hoisted(() => ({ query: {}, refetch: vi.fn(), read: vi.fn(), batch: vi.fn(), freeze: vi.fn(), save: vi.fn(), session: 1 }))
vi.mock('../../utils/tokenStorage.js', () => ({ getSessionRevision: () => state.session, subscribeToSession: () => () => {} }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetEvidencePackageQuery: () => ({ ...state.query, refetch: state.refetch }),
  useLazyGetEvidencePackageReceiptQuery: () => [state.read],
  useBatchReviewEvidenceMutation: () => [state.batch], useFreezeEvidencePackageMutation: () => [state.freeze], useSaveEvidencePackageMutation: () => [state.save],
}))
const props = () => ({ scope, stateVersion: version, canInspect: true, onRecorded: vi.fn().mockResolvedValue(true), onOpenSource: vi.fn() })
let receipts
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal('crypto', webcrypto); state.session = 1
  receipts = new Map(); state.query = { currentData: preview() }
  state.refetch.mockImplementation(async () => ({ data: state.query.currentData }))
  state.read.mockImplementation(command => ({ unwrap: async () => receipts.get(command.receiptId) }))
  state.batch.mockImplementation(command => {
    const response = wrapReceipt('BATCH', { inputPopulationHash: command.body.expectedPopulationHash,
      inputStateVersion: version, outputStateVersion: 'next-state', acceptedIds: ['evidence-one'], decisionAuditIds: ['c'.repeat(24)] }, command.body)
    receipts.set(response.receipt.receiptId, response)
    return { unwrap: async () => response }
  })
})

it('shows loading and mismatched reads truthfully without mutation controls', () => {
  state.query = { isLoading: true }
  const page = render(<EvidencePackagePanel {...props()} />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading complete package basis')
  expect(screen.queryByRole('button', { name: 'Accept all eligible' })).not.toBeInTheDocument()
  state.query = { currentData: { ...preview(), scope: { ...preview().scope, tenantId: 'other' } } }
  page.rerender(<EvidencePackagePanel {...props()} />)
  expect(screen.getByText(/Current package basis unavailable/)).toBeInTheDocument()
})

it('confirms the complete server eligible set once, omits empty optional rationale and reopens the receipt', async () => {
  const options = props(); render(<EvidencePackagePanel {...options} />)
  fireEvent.click(screen.getByRole('button', { name: 'Accept all eligible' }))
  const dialog = screen.getByRole('dialog', { name: 'Confirm batch evidence acceptance' })
  expect(dialog).toHaveTextContent('already-rejected')
  expect(dialog).toHaveTextContent('evidence-one')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(state.batch).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Accept all eligible' }))
  const confirm = screen.getByRole('button', { name: 'Confirm batch acceptance' })
  fireEvent.click(confirm); fireEvent.click(confirm)
  await waitFor(() => expect(options.onRecorded).toHaveBeenCalledOnce())
  expect(state.batch).toHaveBeenCalledOnce()
  const command = state.batch.mock.calls[0][0]
  expect(command.body).toMatchObject({ expectedStateVersion: version, expectedPopulationHash: 'a'.repeat(64), confirm: true })
  expect(command.body).not.toHaveProperty('rationale')
  expect(command.body).not.toHaveProperty('evidenceObjectIds')
  expect(state.read).toHaveBeenCalledWith(expect.objectContaining({ receiptId: 'batch' }), false)
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Batch decisions saved and reopened'))
})

it('requires valid supplied acceptance notes and retains exclusions instead of accepting rejected evidence', () => {
  render(<EvidencePackagePanel {...props()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Accept all eligible' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Optional shared acceptance note' }), { target: { value: 'short' } })
  expect(screen.getByRole('button', { name: 'Confirm batch acceptance' })).toBeDisabled()
  expect(screen.getByRole('dialog')).toHaveTextContent('Rejected')
})

it('blocks an ambiguous command until explicit refresh and recovers the original identity after lock', async () => {
  state.batch.mockReturnValueOnce({ unwrap: async () => { throw new Error('Connection lost') } })
  const options = props(), page = render(<EvidencePackagePanel {...options} />)
  fireEvent.click(screen.getByRole('button', { name: 'Accept all eligible' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm batch acceptance' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Connection lost'))
  expect(screen.getByRole('button', { name: 'Recover original command' })).toBeDisabled()
  state.query = { currentData: { ...preview(), canWrite: false } }
  page.rerender(<EvidencePackagePanel {...options} locked />)
  fireEvent.click(screen.getByRole('button', { name: 'Refresh package reads' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Recover original command' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Recover original command' }))
  await waitFor(() => expect(options.onRecorded).toHaveBeenCalledOnce())
  expect(state.batch.mock.calls[1][0].body).toEqual(state.batch.mock.calls[0][0].body)
  expect(screen.getByRole('button', { name: 'Accept all eligible' })).toBeDisabled()
})

it('discards late writes after session departure and never refreshes the departed scope', async () => {
  let complete
  state.batch.mockImplementation(() => ({ unwrap: () => new Promise(resolve => { complete = resolve }) }))
  const options = props(); render(<EvidencePackagePanel {...options} />)
  fireEvent.click(screen.getByRole('button', { name: 'Accept all eligible' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm batch acceptance' }))
  state.session = 2
  await act(async () => complete({}))
  expect(state.read).not.toHaveBeenCalled(); expect(state.refetch).not.toHaveBeenCalled(); expect(options.onRecorded).not.toHaveBeenCalled()
})

it('releases busy ownership when the successful batch refresh advances the parent state version', async () => {
  const options = props()
  let page
  options.onRecorded.mockImplementation(async () => {
    state.query = { currentData: { ...preview(), control: { ...preview().control, stateVersion: 'next-state' } } }
    page.rerender(<EvidencePackagePanel {...options} stateVersion="next-state" />)
    return true
  })
  page = render(<EvidencePackagePanel {...options} />)
  fireEvent.click(screen.getByRole('button', { name: 'Accept all eligible' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm batch acceptance' }))
  await waitFor(() => expect(options.onRecorded).toHaveBeenCalledOnce())
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh package reads' })).toBeEnabled())
  expect(screen.queryByRole('button', { name: 'Recover original command' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Accept all eligible' })).toBeEnabled()
})

it('verifies its batch response across invalidation before the response and refreshes the advanced basis', async () => {
  let complete
  const options = props()
  state.batch.mockImplementation(command => {
    const response = wrapReceipt('BATCH', { inputPopulationHash: command.body.expectedPopulationHash,
      inputStateVersion: version, outputStateVersion: 'next-state', acceptedIds: ['evidence-one'], decisionAuditIds: ['c'.repeat(24)] }, command.body)
    receipts.set(response.receipt.receiptId, response)
    return { unwrap: () => new Promise(resolve => { complete = () => resolve(response) }) }
  })
  const page = render(<EvidencePackagePanel {...options} />)
  fireEvent.click(screen.getByRole('button', { name: 'Accept all eligible' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm batch acceptance' }))
  state.query = { ...state.query, isFetching: true }
  page.rerender(<EvidencePackagePanel {...options} canInspect={false} />)
  state.refetch.mockImplementation(async () => {
    const next = { ...preview(), control: { ...preview().control, stateVersion: 'next-state' } }
    state.query = { currentData: next }
    page.rerender(<EvidencePackagePanel {...options} stateVersion="next-state" />)
    return { data: next }
  })
  await act(async () => complete())
  await waitFor(() => expect(options.onRecorded).toHaveBeenCalledOnce())
  expect(state.batch).toHaveBeenCalledOnce()
  expect(state.read).toHaveBeenCalledWith(expect.objectContaining({ receiptId: 'batch' }), false)
  expect(screen.queryByRole('button', { name: 'Recover original command' })).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Batch decisions saved and reopened')
  expect(screen.getByRole('button', { name: 'Refresh package reads' })).toBeEnabled()
})

it('finishes explicit original-key recovery across its own invalidation and keeps the historical result truthful', async () => {
  state.batch.mockReturnValueOnce({ unwrap: async () => { throw new Error('Response lost after commit') } })
  const options = props(), page = render(<EvidencePackagePanel {...options} />)
  fireEvent.click(screen.getByRole('button', { name: 'Accept all eligible' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm batch acceptance' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Response lost after commit'))
  const original = state.batch.mock.calls[0][0]
  const response = wrapReceipt('BATCH', { inputPopulationHash: original.body.expectedPopulationHash,
    inputStateVersion: version, outputStateVersion: 'next-state', acceptedIds: ['evidence-one'], decisionAuditIds: ['c'.repeat(24)] }, original.body)
  response.receipt.currency = 'STALE'; response.replay = true
  receipts.set('batch', response)
  const next = { ...preview(), control: { ...preview().control, stateVersion: 'next-state' } }
  state.query = { currentData: next }
  page.rerender(<EvidencePackagePanel {...options} stateVersion="next-state" />)
  fireEvent.click(screen.getByRole('button', { name: 'Refresh package reads' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Recover original command' })).toBeEnabled())
  let complete
  state.batch.mockImplementationOnce(() => ({ unwrap: () => new Promise(resolve => { complete = () => resolve(response) }) }))
  fireEvent.click(screen.getByRole('button', { name: 'Recover original command' }))
  state.query = { currentData: next, isFetching: true }
  page.rerender(<EvidencePackagePanel {...options} stateVersion="next-state" canInspect={false} />)
  state.refetch.mockImplementation(async () => {
    state.query = { currentData: next }; page.rerender(<EvidencePackagePanel {...options} stateVersion="next-state" />)
    return { data: next }
  })
  await act(async () => complete())
  await waitFor(() => expect(options.onRecorded).toHaveBeenCalledOnce())
  expect(state.batch).toHaveBeenCalledTimes(2)
  expect(state.batch.mock.calls[1][0].body).toEqual(original.body)
  expect(screen.getByRole('status')).toHaveTextContent('historical')
  expect(screen.queryByRole('button', { name: 'Recover original command' })).not.toBeInTheDocument()
})

it('opens the saved package only after verifying its freeze, membership and output links', async () => {
  const frozen = frozenFixture(), packaged = packageFixture(frozen)
  receipts.set('freeze', frozen); receipts.set('package', packaged)
  state.query = { currentData: { ...preview(), latestFreeze: frozen.receipt, latestPackage: packaged.receipt } }
  const options = props(); render(<EvidencePackagePanel {...options} readOnly />)
  expect(screen.queryByRole('button', { name: 'Accept all eligible' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Reopen saved package' }))
  const dialog = await screen.findByRole('dialog', { name: 'Evidence package inspection' })
  expect(dialog).toHaveTextContent('Recorded evidence package')
  expect(dialog).toHaveTextContent('A qualified source statement.')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Open exact source and evidence' }))
  expect(options.onOpenSource).toHaveBeenCalledWith('source-one', 'evidence-one')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Reopen saved package' }))
  const reopened = await screen.findByRole('dialog', { name: 'Evidence package inspection' })
  fireEvent.click(within(reopened).getByRole('button', { name: 'Return to evidence' }))
  expect(screen.getByRole('button', { name: 'Reopen saved package' })).toHaveFocus()
})

it('rejects a wrong saved receipt and retains unavailable feedback instead of showing package content', async () => {
  const packaged = packageFixture()
  state.query = { currentData: { ...preview(), latestPackage: packaged.receipt } }
  receipts.set('package', { ...packaged, receipt: { ...packaged.receipt, receiptId: 'other' } })
  render(<EvidencePackagePanel {...props()} readOnly />)
  fireEvent.click(screen.getByRole('button', { name: 'Reopen saved package' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('did not match'))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

async function openFocusInspection(kind, options = props()) {
  state.query = { currentData: { ...preview(), packagePreview: packageFixture().receipt.body } }
  if (kind === 'recorded') {
    const frozen = frozenFixture(), packaged = packageFixture(frozen)
    receipts.set('freeze', frozen); receipts.set('package', packaged)
    state.query = { currentData: { ...preview(), latestFreeze: frozen.receipt, latestPackage: packaged.receipt } }
  }
  const page = render(<EvidencePackagePanel {...options} />)
  const opener = screen.getByRole('button', { name: kind === 'recorded' ? 'Reopen saved package' : 'Preview evidence package' })
  opener.focus()
  fireEvent.click(opener)
  const dialog = await screen.findByRole('dialog', { name: 'Evidence package inspection' })
  const focusCalls = []
  const originalFocus = opener.focus.bind(opener)
  const focus = vi.spyOn(opener, 'focus').mockImplementation(() => {
    focusCalls.push({ dialogConnected: dialog.isConnected, connected: opener.isConnected })
    originalFocus()
  })
  return { page, options, opener, dialog, focus, focusCalls }
}

it.each(['preview', 'recorded'].flatMap(kind => ['return', 'escape', 'close button'].map(action => [kind, action])))(
  'restores the %s opener after inspection unmounts through %s', async (kind, action) => {
    const { opener, dialog, focus, focusCalls } = await openFocusInspection(kind)
    if (action === 'escape') fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }))
    else fireEvent.click(within(dialog).getByRole('button', { name: action === 'return' ? 'Return to evidence' : 'Close dialog' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(focus).toHaveBeenCalledOnce()
    expect(focusCalls).toEqual([{ dialogConnected: false, connected: true }])
    expect(opener).toHaveFocus()
    expect(state.batch).not.toHaveBeenCalled(); expect(state.freeze).not.toHaveBeenCalled(); expect(state.save).not.toHaveBeenCalled()
  })

it('restores the batch confirmation opener after cancellation without accepting evidence', () => {
  render(<EvidencePackagePanel {...props()} />)
  const opener = screen.getByRole('button', { name: 'Accept all eligible' })
  fireEvent.click(opener)
  const dialog = screen.getByRole('dialog', { name: 'Confirm batch evidence acceptance' })
  const focusCalls = []
  const focus = vi.spyOn(opener, 'focus').mockImplementation(() => focusCalls.push(dialog.isConnected))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(focus).toHaveBeenCalledOnce()
  expect(focusCalls).toEqual([false])
  expect(state.batch).not.toHaveBeenCalled()
})

it.each(['basis', 'loading', 'error', 'inspection permission', 'scope', 'read only', 'session'])(
  'does not restore departed inspection focus after %s changes', async departure => {
    const { page, options, focus } = await openFocusInspection('preview')
    let changed = options
    if (departure === 'basis') changed = { ...options, stateVersion: 'departed-state' }
    if (departure === 'loading') state.query = { ...state.query, isFetching: true }
    if (departure === 'error') state.query = { ...state.query, error: { status: 503 } }
    if (departure === 'inspection permission') changed = { ...options, canInspect: false }
    if (departure === 'scope') changed = { ...options, scope: { ...scope, tenantId: 'departed-tenant' } }
    if (departure === 'read only') changed = { ...options, readOnly: true }
    if (departure === 'session') state.session += 1
    page.rerender(<EvidencePackagePanel {...changed} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(focus).not.toHaveBeenCalled()
  })

it('does not focus a disconnected inspection opener on explicit close', async () => {
  const { opener, dialog, focus } = await openFocusInspection('preview')
  const parent = opener.parentNode, next = opener.nextSibling
  opener.remove()
  try {
    fireEvent.click(within(dialog).getByRole('button', { name: 'Return to evidence' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(focus).not.toHaveBeenCalled()
  } finally { parent.insertBefore(opener, next) }
})

it('preserves exact source handoff without restoring the inspection opener', async () => {
  const { options, dialog, focus } = await openFocusInspection('recorded')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Open exact source and evidence' }))
  expect(options.onOpenSource).toHaveBeenCalledOnce()
  expect(options.onOpenSource).toHaveBeenCalledWith('source-one', 'evidence-one')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(focus).not.toHaveBeenCalled()
})


const completedPreview = frozen => ({ ...preview(), completion: { receiptId: 'completion', currency: 'CURRENT', populationComplete: true },
  freezePreview: { ...preview().freezePreview, basisHash: frozen.receipt.body.basisHash },
  availability: { canFreeze: true, canSave: false, reason: null } })

it('confirms exact membership, reopens its receipt and saves only against the verified freeze', async () => {
  const template = frozenFixture()
  state.query = { currentData: completedPreview(template) }
  let frozen
  state.freeze.mockImplementation(command => {
    frozen = wrapReceipt('FREEZE', template.receipt.body, command.body)
    receipts.set('freeze', frozen)
    state.query = { currentData: { ...completedPreview(template), latestFreeze: frozen.receipt,
      availability: { canFreeze: true, canSave: true, reason: null } } }
    return { unwrap: async () => frozen }
  })
  state.save.mockImplementation(command => {
    const response = wrapReceipt('PACKAGE', packageFixture(frozen).receipt.body, command.body)
    receipts.set('package', response)
    return { unwrap: async () => response }
  })
  const options = props(); render(<EvidencePackagePanel {...options} />)
  expect(screen.getByRole('button', { name: 'Save evidence package' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Freeze package membership' }))
  expect(state.freeze).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirm membership freeze' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Package membership saved and reopened'))
  expect(state.freeze).toHaveBeenCalledOnce()
  const command = state.freeze.mock.calls[0][0]
  expect(command).toEqual({ ...scope, body: { requestKey: expect.any(String), confirm: true,
    expectedUpdatedAt: preview().control.runtimeUpdatedAt, expectedStateVersion: version,
    completionReceiptId: 'completion', expectedBasisHash: template.receipt.body.basisHash } })
  expect(state.read).toHaveBeenCalledWith({ ...scope, receiptId: 'freeze' }, false)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save evidence package' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Save evidence package' }))
  expect(state.save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirm package save' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Evidence package saved and reopened'))
  expect(state.save).toHaveBeenCalledOnce()
  expect(state.save.mock.calls[0][0]).toEqual({ ...scope, body: { requestKey: expect.any(String), confirm: true,
    freezeReceiptId: frozen.receipt.receiptId, expectedMembershipHash: frozen.receipt.body.membershipHash } })
  expect(state.read.mock.calls.slice(-2).map(call => call[0].receiptId)).toEqual(['package', 'freeze'])
  expect(options.onRecorded).toHaveBeenCalledTimes(2)
  expect(state.batch).not.toHaveBeenCalled()
})

it('does not confirm a freeze when independent receipt read-back is unavailable', async () => {
  const template = frozenFixture()
  state.query = { currentData: completedPreview(template) }
  state.freeze.mockImplementation(command => ({ unwrap: async () => wrapReceipt('FREEZE', template.receipt.body, command.body) }))
  const options = props(); render(<EvidencePackagePanel {...options} />)
  fireEvent.click(screen.getByRole('button', { name: 'Freeze package membership' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm membership freeze' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('could not be reopened exactly'))
  expect(options.onRecorded).not.toHaveBeenCalled()
  expect(state.refetch).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Save evidence package' })).toBeDisabled()
  expect(state.save).not.toHaveBeenCalled()
})

it('does not confirm package save when the independently reopened freeze has another identity', async () => {
  const frozen = frozenFixture()
  state.query = { currentData: { ...completedPreview(frozen), latestFreeze: frozen.receipt,
    availability: { canFreeze: true, canSave: true, reason: null } } }
  receipts.set('freeze', { ...frozen, receipt: { ...frozen.receipt, receiptId: 'another-freeze' } })
  state.save.mockImplementation(command => {
    const response = wrapReceipt('PACKAGE', packageFixture(frozen).receipt.body, command.body)
    receipts.set('package', response)
    return { unwrap: async () => response }
  })
  const options = props(); render(<EvidencePackagePanel {...options} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save evidence package' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Save evidence package' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm package save' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('does not match its exact frozen membership'))
  expect(state.save).toHaveBeenCalledOnce()
  expect(options.onRecorded).not.toHaveBeenCalled()
  expect(state.refetch).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Save evidence package' })).toBeDisabled()
})
