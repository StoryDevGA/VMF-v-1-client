import { readResearchAvailability, readFixtureStart, buildFixtureStartPayload } from './publicResearchConfiguration.js'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearTokens, setTokens, getSessionRevision } from '../../utils/tokenStorage.js'
import ContextAcquisitionView from './ContextAcquisitionView.jsx'
import { emptyCustomerResearchFields, readCustomerResearchDeclaration } from '../../utils/customerSuppliedResearch.js'
const calls = vi.hoisted(() => ({ execute: vi.fn(), update: vi.fn(), availability: vi.fn(), history: vi.fn(), saveConfig: vi.fn(), configRead: {}, configRefetch: vi.fn(), lookupRead: {}, lookupRefetch: vi.fn(), lookupArgs: vi.fn() }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({ useGetAcquisitionRunsQuery: (...args) => { calls.lookupArgs(...args); return calls.lookupRead }, useGetRuntimeStateSourcesQuery: () => ({ error: { status: 503 } }), useGetAcquisitionRunQuery: () => ({}), useGetResearchConfigurationQuery: () => calls.configRead, useSaveResearchConfigurationMutation: () => [calls.saveConfig], useExecuteRuntimeActionMutation: () => [calls.execute], useUpdateRuntimeDiscoveryInputsMutation: () => [calls.update] }))
vi.mock('./PostLockSubmissionPanel.jsx', () => ({ default: props => {
  calls.availability(props)
  return props.active && props.locked ? <form aria-label="Post-lock submission test boundary"><p>Availability read boundary</p></form> : null
} }))
vi.mock('./AcquisitionRunHistory.jsx', () => ({ default: props => { calls.history(props); return <p>Run history test boundary</p> } }))
const stamp = '2026-10-04T10:00:00.000Z'
const inputValues = { companyName: 'Controlled fixture', marketRegion: 'Test market', targetOffer: 'Synthetic service', companyWebsite: 'https://example.org', websiteSources: ['https://example.org'], notes: '' }
const base = () => ({ discovery: { inputValues, acquisitionProfile: 'STANDARD', evidenceReady: false }, renderer: { runtimeInstance: { updatedAt: stamp, stateVersion: 'rsv2:basis' }, actions: [] }, authority: { canAcquire: true, runtimeUpdatedAt: stamp }, runtimeInstanceId: 'revision-1', customerId: 'customer-1', tenantId: 'tenant-1', contextKey: 'scope-1', workbenchHref: '/app/runtime', refresh: vi.fn().mockResolvedValue(true), onSelectView: vi.fn(), evidenceStatusCounts: {} })
const mount = props => {
  const result = render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
  const edit = screen.queryByRole('button', {name:'Edit evidence gathering brief'})
  if (edit && !edit.disabled) fireEvent.click(edit)
  for (const name of ['Connected websites','File limits']) {
    const disclosure = screen.queryByText(name, { exact: true })
    if (disclosure) fireEvent.click(disclosure)
  }
  return result
}
const receiptFor = (requestKey, overrides = {}) => ({ contractVersion: 'acquisition-run.v1', runId: '12345678-1234-4123-8123-123456789abc', requestKey,
  scope: { runtimeInstanceKey: 'revision-1', customerId: 'customer-1', tenantId: 'tenant-1' }, status: 'SUCCEEDED', canonicalSaved: true,
  basisStateVersion: 'rsv2:basis', outputStateVersion: 'rsv2:recorded', outcomes: [{ kind: 'BRIEF', inputIndex: 0, status: 'SUCCEEDED', evidenceObjectCount: 0 }],
  audit: { admissionId: 'audit-a', startId: 'audit-b', terminalId: 'audit-c',
    ...(overrides.canonicalSaved !== false ? { saveId: 'audit-save' } : {}) }, ...overrides })

describe('document-only Context acquisition', () => {
  it('submits a prepared DOCX without a website fetch and clears staged files after saving', async () => {
    const user = userEvent.setup(), props = base()
    render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    await user.click(screen.getByText('Connected websites', { exact: true }))
    await user.clear(screen.getByLabelText('Website URL 1'))
    const acquire = screen.getByRole('button', { name: 'Acquire new evidence' })
    expect(acquire).toBeDisabled()
    await user.upload(screen.getByLabelText(/Select documents/), new File(['synthetic'], 'controlled.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))
    await screen.findByText(/controlled.docx.*Staged locally/)
    expect(acquire).toBeEnabled()
    await user.click(acquire)
    await waitFor(() => expect(calls.update).toHaveBeenCalledTimes(1))
    const request = calls.update.mock.calls[0][0]
    expect(request.body.inputs.companyWebsite).toBe(inputValues.companyWebsite)
    expect(request.body.inputs).not.toHaveProperty('websiteSources')
    expect(request.body.acquisitionProfile).toBe('STANDARD')
    expect(request.body.expectedUpdatedAt).toBe(stamp)
    expect(request.body.documentSources).toHaveLength(1)
    expect(request.body.documentSources[0].fileName).toBe('controlled.docx')
    await waitFor(() => expect(screen.getByText(/0 of 5 files staged/)).toBeVisible())
    expect(calls.execute).not.toHaveBeenCalled()
  })
  it('restores the website requirement after removing the final prepared file', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><ContextAcquisitionView {...base()} /></MemoryRouter>)
    await user.click(screen.getByText('Connected websites', { exact: true }))
    await user.clear(screen.getByLabelText('Website URL 1'))
    await user.upload(screen.getByLabelText(/Select documents/), new File(['synthetic'], 'controlled.docx'))
    await screen.findByText(/controlled.docx.*Staged locally/)
    await user.click(screen.getByRole('button', { name: 'Remove staged document 1: controlled.docx' }))
    expect(screen.getByRole('button', { name: 'Acquire new evidence' })).toBeDisabled()
    expect(calls.update).not.toHaveBeenCalled()
  })
  it.each(['locked', 'authority', 'stale', 'missing company'])('keeps prepared DOCX acquisition blocked for %s', async kind => {
    const user = userEvent.setup(), props = base()
    if (kind === 'missing company') props.discovery.inputValues = { ...inputValues, companyName: '' }
    const view = render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    await user.click(screen.getByText('Connected websites', { exact: true }))
    await user.clear(screen.getByLabelText('Website URL 1'))
    await user.upload(screen.getByLabelText(/Select documents/), new File(['synthetic'], 'controlled.docx'))
    await screen.findByText(/controlled.docx.*Staged locally/)
    if (kind === 'locked') props.locked = true
    if (kind === 'authority') props.authority = { ...props.authority, canAcquire: false }
    if (kind === 'stale') props.renderer = { ...props.renderer, runtimeInstance: { updatedAt: '2026-10-04T11:00:00.000Z' } }
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Acquire new evidence' })).toBeDisabled()
    expect(calls.update).not.toHaveBeenCalled()
    expect(calls.execute).not.toHaveBeenCalled()
  })
})
beforeEach(() => { calls.lookupRead = { refetch: calls.lookupRefetch }; calls.lookupRefetch.mockReset(); calls.lookupArgs.mockReset(); calls.configRead = { currentData: configurationFixture(), refetch: calls.configRefetch }; calls.saveConfig.mockReset(); calls.configRefetch.mockReset(); vi.restoreAllMocks(); calls.execute.mockReset(); calls.update.mockReset(); calls.availability.mockReset();
  const respond = args => ({ unwrap: () => Promise.resolve({ acquisitionRun: receiptFor(args.body.requestKey) }) })
  calls.execute.mockImplementation(respond); calls.update.mockImplementation(respond)
})
describe('Context governed acquisition', () => {
  it.each(['eligible', 'locked', 'loading', 'read-only', 'missing brief'])('gates research preparation and explains execution availability without acquisition for %s', async kind => {
    const user = userEvent.setup(), props = base()
    if (kind === 'locked') props.locked = true
    if (kind === 'loading') props.loading = true
    if (kind === 'read-only') props.authority = { canAcquire: false }
    if (kind === 'missing brief') props.discovery = {}
    render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    if (kind === 'locked') {
      expect(screen.queryByRole('checkbox', { name: 'Research public information' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Acquire new evidence' })).toBeDisabled()
      expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled()
      return
    }
    const checkbox = screen.getByRole('checkbox', { name: 'Research public information' })
    if (kind === 'eligible') expect(checkbox).toBeEnabled()
    else expect(checkbox).toBeDisabled()
    expect(checkbox).not.toBeChecked()
    expect(checkbox).toHaveAccessibleDescription('Prepare source choices from this brief. Live research remains unavailable; selecting or configuring settings does not start a run.')
    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: 'Research availability' }))
    const dialog = screen.getByRole('dialog', { name: 'Research availability' })
    expect(within(dialog).getByText(/Research settings can be saved separately/)).toBeVisible()
    expect(within(dialog).getByText(/licensing, retention, regional and operating limits/)).toBeVisible()
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Run history test boundary')).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /start|save|apply/i })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Back to Context' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Research availability' })).toHaveFocus()
    expect(calls.execute).not.toHaveBeenCalled()
    expect(calls.update).not.toHaveBeenCalled()
  })
  it('returns Research availability focus on native Escape and closes on departure, scope and session replacement', async () => {
    const user = userEvent.setup(), props = base()
    const view = render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    const open = () => user.click(screen.getByRole('button', { name: 'Research availability' }))
    await open()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Research availability' })).toHaveFocus()
    await open()
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active={false} /></MemoryRouter>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active /></MemoryRouter>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await open()
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} contextKey="scope-2" /></MemoryRouter>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await open()
    act(() => clearTokens())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls.execute).not.toHaveBeenCalled()
    expect(calls.update).not.toHaveBeenCalled()
  })
  it('keeps the default brief compact and preserves edits through disclosure without submitting acquisition', async () => {
    const user = userEvent.setup()
    const { container } = render(<MemoryRouter><ContextAcquisitionView {...base()} /></MemoryRouter>)
    expect(container.querySelector('.intelligence-hub__context-brief-values')).toHaveTextContent('Controlled fixture')
    expect(screen.queryByLabelText('Company name')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button',{name:'Edit evidence gathering brief'}))
    await user.clear(screen.getByLabelText('Company name'))
    await user.type(screen.getByLabelText('Company name'), 'Edited local brief')
    await user.click(screen.getByRole('button',{name:'Apply brief'}))
    expect(screen.getByText('Brief edits are staged locally. Acquisition has not been submitted.')).toBeVisible()
    expect(container.querySelector('.intelligence-hub__context-brief-values')).toHaveTextContent('Edited local brief')
    await user.click(screen.getByRole('button',{name:'Edit evidence gathering brief'}))
    expect(screen.getByLabelText('Company name')).toHaveValue('Edited local brief')
    expect(calls.execute).not.toHaveBeenCalled()
    expect(calls.update).not.toHaveBeenCalled()
    await user.click(screen.getByText('Runs and processing history'))
    expect(screen.getByText('Run history test boundary')).toBeVisible()
  })
  it.each(['Why separate?', 'Runs and processing history'])('returns focus to %s after Back and native Escape cancellation', async name => {
    const user=userEvent.setup()
    render(<MemoryRouter><ContextAcquisitionView {...base()} /></MemoryRouter>)
    const opener=screen.getByRole('button',{name,exact:true})
    await user.click(opener)
    await user.click(screen.getByRole('button',{name:'Back to Context'}))
    expect(opener).toHaveFocus()
    await user.click(opener)
    fireEvent(screen.getByRole('dialog'),new Event('cancel',{cancelable:true}))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })
  it('closes Context inspection on departure without restoring its hidden opener', async () => {
    const user=userEvent.setup(),props=base()
    const view=render(<><button>Outside Context</button><MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter></>)
    await user.click(screen.getByRole('button',{name:'Why separate?',exact:true}))
    const outside=screen.getByRole('button',{name:'Outside Context'})
    outside.focus()
    view.rerender(<><button>Outside Context</button><MemoryRouter><ContextAcquisitionView {...props} active={false} /></MemoryRouter></>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(outside).toHaveFocus()
    view.rerender(<><button>Outside Context</button><MemoryRouter><ContextAcquisitionView {...props} active /></MemoryRouter></>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('Enter stages the new website locally instead of acquiring the ready old brief', async () => {
    const user=userEvent.setup()
    render(<MemoryRouter><ContextAcquisitionView {...base()} /></MemoryRouter>)
    const address=screen.getByRole('textbox',{name:'Website address'})
    await user.type(address,'https://new.example.com')
    expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Stage or clear')
    await user.type(address,'{Enter}')
    expect(address).toHaveValue('')
    fireEvent.click(screen.getByText('Connected websites',{exact:true}))
    expect(screen.getByLabelText('Website URL 1')).toHaveValue('https://example.org')
    expect(screen.getByLabelText('Website URL 2')).toHaveValue('https://new.example.com')
    expect(calls.execute).not.toHaveBeenCalled();expect(calls.update).not.toHaveBeenCalled()
  })
  it.each(['invalid','full','locked'])('prevents website Enter submission when %s',async kind=>{
    const user=userEvent.setup(),props=base()
    if(kind==='full') props.discovery.inputValues={...inputValues,websiteSources:Array.from({length:10},(_,i)=>`https://source${i}.example.com`)}
    if(kind==='locked') props.locked=true
    render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    const address=screen.getByRole('textbox',{name:'Website address'})
    if(kind==='locked') fireEvent.keyDown(address,{key:'Enter'})
    else {
      await user.type(address,kind==='invalid'?'invalid address{Enter}':'https://extra.example.com{Enter}')
      expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled()
      expect(screen.getByRole('button',{name:'Stage website'})).toBeDisabled()
      await user.clear(address)
      expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeEnabled()
    }
    expect(calls.execute).not.toHaveBeenCalled();expect(calls.update).not.toHaveBeenCalled()
  })
  it('Cancel restores the editor-entry brief while preserving staged websites and files', async () => {
    const user=userEvent.setup()
    render(<MemoryRouter><ContextAcquisitionView {...base()} /></MemoryRouter>)
    await user.click(screen.getByRole('button',{name:'Edit evidence gathering brief'}))
    await user.clear(screen.getByLabelText('Company name')); await user.type(screen.getByLabelText('Company name'),'Applied name')
    await user.click(screen.getByRole('button',{name:'Apply brief'}))
    await user.click(screen.getByRole('button',{name:'Edit evidence gathering brief'}))
    await user.clear(screen.getByLabelText('Company name'));await user.type(screen.getByLabelText('Company name'),'Cancelled name')
    await user.type(screen.getByRole('textbox',{name:'Website address'}),'https://staged.example.com')
    await user.click(screen.getByRole('button',{name:'Stage website'}))
    await user.upload(screen.getByLabelText(/Select documents/),new File(['local evidence'],'local.txt',{type:'text/plain'}))
    await screen.findByText(/local.txt.*Staged locally/)
    await user.click(screen.getByRole('button',{name:'Cancel'}))
    expect(screen.getByText('Applied name',{exact:true})).toBeVisible()
    fireEvent.click(screen.getByText('Connected websites',{exact:true}))
    expect(screen.getByLabelText('Website URL 2')).toHaveValue('https://staged.example.com')
    expect(screen.getByText(/local.txt.*Staged locally/)).toBeVisible()
    expect(calls.update).not.toHaveBeenCalled();expect(calls.execute).not.toHaveBeenCalled()
  })
  it('puts separate evidence first and keeps locked acquisition disabled with keyboard-accessible explanation', async () => {
    const props = base()
    props.locked = true
    props.discovery.inputValues = { ...inputValues, companyName: '' }
    render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    expect(screen.getByText('Availability read boundary').compareDocumentPosition(screen.getByRole('heading', { name: 'Context acquisition' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Acquire new evidence' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Select evidence files' })).toBeDisabled()
    const why = screen.getByRole('button', { name: 'Why separate?' })
    why.focus(); await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toHaveTextContent('Neither action changes the locked understanding.')
    await userEvent.click(screen.getByRole('button', { name: 'Back to Context' }))
    await waitFor(() => expect(why).toHaveFocus())
    expect(calls.update).not.toHaveBeenCalled()
  })
  it('adds further batches, suppresses exact duplicates and submits only individually retained files', async () => {
    mount(base())
    const first = new File(['first evidence'], 'first.txt', { type: 'text/plain' })
    const second = new File(['second evidence'], 'second.txt', { type: 'text/plain' })
    const picker = screen.getByLabelText(/Select documents/)
    await userEvent.upload(picker, first)
    await screen.findByText(/first.txt.*Staged locally/)
    await userEvent.upload(picker, [first, second, second])
    await screen.findByText(/second.txt.*Staged locally/)
    expect(within(screen.getByRole('list', { name: 'Selected acquisition documents' })).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText(/2 of 5 files staged/)).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Remove staged document 1: first.txt' }))
    expect(picker).toHaveFocus()
    expect(screen.queryByText(/first.txt.*Staged locally/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Acquire new evidence' }))
    expect(calls.update.mock.calls[0][0].body.documentSources).toEqual([expect.objectContaining({ fileName: 'second.txt' })])
  })
  it('retains changed content under the same filename and counts duplicates before applying the batch limit', async () => {
    mount(base())
    const first = new File(['aaa'], 'same.txt', { type: 'text/plain' })
    const changed = new File(['bbb'], 'same.txt', { type: 'text/plain' })
    await userEvent.upload(screen.getByLabelText(/Select documents/), [first, first, first, first, first, first, changed])
    await screen.findByText(/2 of 5 files staged/)
    expect(screen.getAllByText(/same.txt.*Staged locally/)).toHaveLength(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Acquire new evidence' }))
    const prepared = calls.update.mock.calls[0][0].body.documentSources
    expect(prepared).toHaveLength(2)
    expect(prepared[0].contentBase64).not.toBe(prepared[1].contentBase64)
  })
  it.each(['too many', 'unsupported', 'oversized', 'unreadable'])('keeps the prior valid batch after a %s addition', async kind => {
    mount(base())
    const picker = screen.getByLabelText(/Select documents/)
    await userEvent.upload(picker, new File(['keep'], 'kept.txt', { type: 'text/plain' }))
    await screen.findByText(/kept.txt.*Staged locally/)
    let files = [new File(['new'], 'new.txt', { type: 'text/plain' })]
    if (kind === 'too many') files = Array.from({ length: 5 }, (_, index) => new File([`new ${index}`], `${index}.txt`, { type: 'text/plain' }))
    if (kind === 'unsupported') files.push(new File(['bad'], 'bad.exe', { type: 'application/octet-stream' }))
    if (kind === 'oversized') Object.defineProperty(files[0], 'size', { value: 2500001 })
    if (kind === 'unreadable') vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function () { this.onerror() })
    fireEvent.change(picker, { target: { files } })
    await screen.findByRole('alert')
    expect(within(screen.getByRole('list', { name: 'Selected acquisition documents' })).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText(/kept.txt.*Staged locally/)).toBeVisible()
    expect(screen.queryByText(/new.txt.*Staged locally/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acquire new evidence' })).toBeDisabled()
    expect(calls.update).not.toHaveBeenCalled()
    expect(calls.execute).not.toHaveBeenCalled()
  })
  it('preserves staged files on picker cancellation and allows removing the final input', async () => {
    mount(base())
    const picker = screen.getByLabelText(/Select documents/)
    await userEvent.upload(picker, new File(['keep'], 'kept.txt', { type: 'text/plain' }))
    await screen.findByText(/kept.txt.*Staged locally/)
    fireEvent.change(picker, { target: { files: [] } })
    expect(screen.getByText(/kept.txt.*Staged locally/)).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Remove staged document 1: kept.txt' }))
    expect(screen.getByText(/0 of 5 files staged/)).toBeVisible()
    expect(screen.queryByRole('list', { name: 'Selected acquisition documents' })).not.toBeInTheDocument()
    expect(picker).toHaveFocus()
  })
  it.each(['locked', 'denied', 'stale'])('prevents direct file preparation and individual removal when %s', async state => {
    const props = base()
    const view = mount(props)
    const picker = screen.getByLabelText(/Select documents/)
    await userEvent.upload(picker, new File(['keep'], 'kept.txt', { type: 'text/plain' }))
    await screen.findByText(/kept.txt.*Staged locally/)
    const blockedProps = state === 'locked' ? { locked: true }
      : state === 'denied' ? { authority: { canAcquire: false } }
        : { renderer: { ...props.renderer, runtimeInstance: { updatedAt: '2026-10-05T10:00:00.000Z' } } }
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} {...blockedProps} /></MemoryRouter>)
    if (state === 'locked') expect(screen.queryByRole('button', { name: 'Remove staged document 1: kept.txt' })).not.toBeInTheDocument()
    else expect(screen.getByRole('button', { name: 'Remove staged document 1: kept.txt' })).toBeDisabled()
    fireEvent.change(picker, { target: { files: [new File(['new'], 'blocked.txt', { type: 'text/plain' })] } })
    expect(screen.queryByText(/blocked.txt.*Staged locally/)).not.toBeInTheDocument()
    if (state === 'locked') expect(screen.queryByText(/kept.txt.*Staged locally/)).not.toBeInTheDocument()
    else expect(screen.getByText(/kept.txt.*Staged locally/)).toBeVisible()
    expect(calls.update).not.toHaveBeenCalled()
  })
  it('ignores overlapping file selections while the first preparation is in flight', async () => {
    let finish
    const read = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function () {
      finish = () => { Object.defineProperty(this, 'result', { value: 'data:text/plain;base64,Zmlyc3Q=' }); this.onload() }
    })
    mount(base())
    const picker = screen.getByLabelText(/Select documents/)
    fireEvent.change(picker, { target: { files: [new File(['first'], 'first.txt', { type: 'text/plain' })] } })
    fireEvent.change(picker, { target: { files: [new File(['second'], 'second.txt', { type: 'text/plain' })] } })
    expect(read).toHaveBeenCalledTimes(1)
    await act(async () => finish())
    expect(screen.getByText(/first.txt.*Staged locally/)).toBeVisible()
    expect(screen.queryByText(/second.txt.*Staged locally/)).not.toBeInTheDocument()
  })
  it.each(['missing save audit', 'numeric output version', 'missing basis', 'numeric currency', 'bad predecessor'])('retains staged files and uncertainty for %s', async kind => {
      const props = base()
      calls.update.mockImplementationOnce(args => ({ unwrap: async () => {
        const receipt = receiptFor(args.body.requestKey)
        if (kind === 'missing save audit') delete receipt.audit.saveId
        if (kind === 'numeric output version') receipt.outputStateVersion = 123
        if (kind === 'missing basis') delete receipt.basisStateVersion
        if (kind === 'numeric currency') receipt.currency = 123
        if (kind === 'bad predecessor') receipt.predecessorRunId = 'not-a-run'
        return { acquisitionRun: receipt }
      } }))
      mount(props)
      await userEvent.upload(screen.getByLabelText(/Select documents/), new File(['test'], 'retained.txt', { type: 'text/plain' }))
      await userEvent.click(screen.getByRole('button', { name: 'Acquire new evidence' }))
      expect(await screen.findByText(/no verified scoped terminal receipt/)).toBeVisible()
      expect(screen.getByText(/retained.txt.*Staged locally/)).toBeVisible()
      expect(props.refresh).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Check original acquisition request' })).toBeEnabled()
  })
  it.each(['success', 'error'])('ignores old-session %s while preserving new-session staged files', async result => {
    let finish, reject
    calls.update.mockReturnValueOnce({ unwrap: () => new Promise((resolve, fail) => { finish = resolve; reject = fail }) })
    const props = base(); mount(props)
    await userEvent.upload(screen.getByLabelText(/Select documents/), new File(['old'], 'old-session.txt', { type: 'text/plain' }))
    await userEvent.click(screen.getByRole('button', { name: 'Acquire new evidence' }))
    const original = calls.update.mock.calls[0][0]
    act(() => clearTokens())
    expect(screen.queryByText(/old-session.txt.*Staged locally/)).not.toBeInTheDocument()
    await userEvent.upload(screen.getByLabelText(/Select documents/), new File(['new'], 'new-session.txt', { type: 'text/plain' }))
    await act(async () => result === 'success' ? finish({ acquisitionRun: receiptFor(original.body.requestKey) }) : reject({ data: { message: 'SESSION_CHANGED' } }))
    expect(screen.getByText(/new-session.txt.*Staged locally/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Check original acquisition request' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acquire new evidence' })).toBeEnabled()
    expect(props.refresh).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).not.toHaveTextContent('SESSION_CHANGED')
    expect(screen.getByRole('status')).not.toHaveTextContent('Revision saved')
  })
  it('keeps uncertain request identity during ordinary token renewal and allows locked original checks', async () => {
    const props = base()
    calls.update.mockReturnValueOnce({ unwrap: () => Promise.reject({ status: 'FETCH_ERROR' }) })
    const view = mount(props)
    await userEvent.click(screen.getByRole('button', { name: 'Acquire new evidence' }))
    const original = calls.update.mock.calls[0][0]
    act(() => setTokens({ accessToken: null, refreshToken: null }, { preserveSession: true }))
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} locked authority={{ canAcquire: false }} /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Acquire new evidence' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Check original acquisition request' }))
    expect(calls.update.mock.calls[1][0]).toEqual(original)
    expect(props.refresh).toHaveBeenCalledOnce()
  })
  it('ignores late document preparation from the replaced login session', async () => {
    let finish
    const read = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function () {
      finish = () => { Object.defineProperty(this, 'result', { value: 'data:text/plain;base64,b2xk' }); this.onload() }
    })
    mount(base())
    await userEvent.upload(screen.getByLabelText(/Select documents/), new File(['old'], 'old-preparation.txt', { type: 'text/plain' }))
    act(() => clearTokens())
    read.mockRestore()
    await userEvent.upload(screen.getByLabelText(/Select documents/), new File(['new'], 'new-preparation.txt', { type: 'text/plain' }))
    await act(async () => finish())
    expect(screen.getByText(/new-preparation.txt.*Staged locally/)).toBeVisible()
    expect(screen.queryByText(/old-preparation.txt.*Staged locally/)).not.toBeInTheDocument()
    expect(calls.update).not.toHaveBeenCalled()
  })
  it('links an explicit new retry to a verified unsuccessful original Run using a fresh request key', async () => {
    calls.update.mockImplementationOnce(args => ({ unwrap: () => Promise.reject({ data: { error: { message: 'Controlled extraction failure',
      details: { acquisitionRun: receiptFor(args.body.requestKey, { status: 'FAILED', canonicalSaved: false, outputStateVersion: undefined }) } } } }) }))
    mount(base()); await userEvent.click(screen.getByRole('button', { name: 'Acquire new evidence' }))
    await screen.findByText(/Next acquisition explicitly retries Run/)
    const first = calls.update.mock.calls[0][0]
    await userEvent.click(screen.getByRole('button', { name: 'Refresh acquisition data' }))
    await userEvent.click(screen.getByRole('button', { name: 'Acquire new evidence' }))
    expect(calls.update.mock.calls[1][0].body).toMatchObject({ predecessorRunId: '12345678-1234-4123-8123-123456789abc' })
    expect(calls.update.mock.calls[1][0].body.requestKey).not.toBe(first.body.requestKey)
  })
  it.each(['wrong-request', 'wrong-scope', 'missing-receipt'])('keeps acquisition blocked on a %s response without claiming a saved revision', async kind => {
    calls.update.mockImplementationOnce(args => ({ unwrap: () => Promise.resolve(kind === 'missing-receipt' ? {} : { acquisitionRun:
      receiptFor(kind === 'wrong-request' ? '12345678-1234-4123-8123-123456789abd' : args.body.requestKey,
        kind === 'wrong-scope' ? { scope: { runtimeInstanceKey: 'revision-other', customerId: 'customer-1', tenantId: 'tenant-1' } } : {}) }) }))
    const props = base(); mount(props); await userEvent.click(screen.getByRole('button', { name: 'Acquire new evidence' }))
    await screen.findByText(/no verified scoped terminal receipt/)
    expect(screen.getByRole('button', { name: 'Acquire new evidence' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Check original acquisition request' })).toBeEnabled()
    expect(props.refresh).not.toHaveBeenCalled()
  })
  it('reports actual extraction success without treating a continuity rejection as saved', async () => {
    const props = base()
    calls.update.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { error: {
      message: 'Website source continuity could not be verified.', requestId: 'continuity-request',
      details: { reason: 'ACQUISITION_CONTINUITY_BLOCKED', acquisitionOutcomes: {
        contractVersion: 'acquisition-error-outcomes.v1', canonicalSaved: false,
        websiteItems: [{ inputIndex: 0, sourceId: 'website_actual', status: 'SUCCEEDED', evidenceObjectCount: 2 }], documentItems: [],
      } },
    } } }) })
    mount(props)
    await userEvent.click(screen.getByRole('button', { name: 'Acquire new evidence' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Website extraction: 1 succeeded · 0 failed.'))
    expect(screen.getByRole('status')).toHaveTextContent('These extraction results were not saved to this revision.')
    expect(screen.getByRole('status')).toHaveTextContent('continuity-request')
    expect(screen.getByRole('button', { name: 'Acquire new evidence' })).toBeDisabled()
    expect(props.refresh).not.toHaveBeenCalled()
  })
  it('shows failed website attempts separately from retained prior evidence', () => {
    const props = base()
    props.discovery.acquisition = { websiteAcquisition: { status: 'PARTIAL', sourceCount: 2, acquiredSourceCount: 1, failedSourceCount: 1,
      latestAttempt: { contractVersion: 'website-acquisition-outcomes.v1', items: [
        { inputIndex: 0, sourceId: 'website-prior', status: 'FAILED', evidenceObjectCount: 0, retainedPrior: true, retainedEvidenceObjectCount: 4, reason: 'WEBSITE_ACQUISITION_FAILED' },
        { inputIndex: 1, sourceId: 'website-new', status: 'SUCCEEDED', evidenceObjectCount: 3, retainedPrior: false },
      ] } } }
    mount(props)
    expect(screen.getByText('Website 1: Failed · Prior source retained with 4 previous evidence objects.')).toBeVisible()
    expect(screen.getByText('Website 2: Succeeded · 3 eligible evidence objects')).toBeVisible()
    expect(screen.getByText('1 succeeded · 1 failed across 2 submitted websites.')).toBeVisible()
  })
  it.each(['missing-source', 'bad-index', 'duplicate-source', 'wrong-status-total', 'fresh-failure-count', 'missing-retained-count'])('does not fabricate individual website outcomes when %s', scenario => {
    const props = base()
    const items = [
      { inputIndex: 0, sourceId: 'prior', status: 'FAILED', evidenceObjectCount: 0, retainedPrior: true, retainedEvidenceObjectCount: 4, reason: 'WEBSITE_ACQUISITION_FAILED' },
      { inputIndex: 1, sourceId: 'new', status: 'SUCCEEDED', evidenceObjectCount: 3, retainedPrior: false },
    ]
    if (scenario === 'missing-source') delete items[0].sourceId
    if (scenario === 'bad-index') items[1].inputIndex = 0
    if (scenario === 'duplicate-source') items[1].sourceId = items[0].sourceId
    if (scenario === 'wrong-status-total') items[1] = { ...items[0], inputIndex: 1, sourceId: 'other' }
    if (scenario === 'fresh-failure-count') items[0].evidenceObjectCount = 4
    if (scenario === 'missing-retained-count') delete items[0].retainedEvidenceObjectCount
    props.discovery.acquisition = { websiteAcquisition: { status: 'PARTIAL', sourceCount: 2, acquiredSourceCount: 1, failedSourceCount: 1,
      latestAttempt: { contractVersion: 'website-acquisition-outcomes.v1', items } } }
    mount(props)
    expect(screen.getByText('Individual website outcomes unavailable.')).toBeVisible()
    expect(screen.queryByText(/Website 1:/)).not.toBeInTheDocument()
  })
  it('shows every failed document when website acquisition succeeds with no document source', () => {
    const props = base()
    props.discovery.acquisition = { websiteAcquisition: { status: 'ACQUIRED', sourceCount: 1, acquiredSourceCount: 1, failedSourceCount: 0 },
      documentAcquisition: { status: 'FAILED', sourceCount: 0, latestAttempt: { contractVersion: 'document-extraction-outcomes.v1',
        items: [{ inputIndex: 0, status: 'FAILED' }] } } }
    mount(props)
    expect(screen.getByText('1 succeeded · 0 failed across 1 submitted websites.')).toBeVisible()
    expect(screen.getByText('Input 1: Failed · Choose a supported readable file and retry.')).toBeVisible()
  })
  it('shows website failure beside zero-fact document success without implying Enhanced readiness', () => {
    const props = base()
    props.discovery.acquisitionProfile = 'ENHANCED'
    props.discovery.acquisition = { websiteAcquisition: { status: 'FAILED', sourceCount: 1, acquiredSourceCount: 0, failedSourceCount: 1 },
      documentAcquisition: { latestAttempt: { contractVersion: 'document-extraction-outcomes.v1',
        items: [{ inputIndex: 0, status: 'SUCCEEDED', evidenceObjectCount: 0 }] } } }
    mount(props)
    expect(screen.getByText('0 succeeded · 1 failed across 1 submitted websites.')).toBeVisible()
    expect(screen.getByText('Input 1: Succeeded · 0 eligible evidence objects')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Acquire new evidence' })).toBeVisible()
  })
  it('reports partial website acquisition from the complete latest attempt counts', () => {
    const props = base()
    props.discovery.acquisition = { websiteAcquisition: { status: 'PARTIAL', sourceCount: 3, acquiredSourceCount: 2, failedSourceCount: 1 } }
    mount(props)
    expect(screen.getByText('2 succeeded · 1 failed across 3 submitted websites.')).toBeVisible()
  })
  it.each([
    { status: 'ACQUIRED', sourceCount: 0, acquiredSourceCount: 0, failedSourceCount: 0 },
    { status: 'ACQUIRED', sourceCount: 2, acquiredSourceCount: 1, failedSourceCount: 0 },
    { status: 'PARTIAL', sourceCount: 1, acquiredSourceCount: 1, failedSourceCount: 0 },
  ])('does not fabricate an attempt from inconsistent website results %j', websiteAcquisition => {
    const props = base(); props.discovery.acquisition = { websiteAcquisition }; mount(props)
    expect(screen.getByText('Latest website acquisition outcomes unavailable.')).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Latest website acquisition outcomes' })).not.toBeInTheDocument()
  })
  it('shows partial document outcomes without equating extraction with readiness', () => {
    const props = base()
    props.discovery.acquisition = { documentAcquisition: { latestAttempt: { contractVersion: 'document-extraction-outcomes.v1',
      items: [{ inputIndex: 0, status: 'SUCCEEDED', evidenceObjectCount: 2 }, { inputIndex: 1, status: 'FAILED' }] } } }
    mount(props)
    expect(screen.getByText('Input 1: Succeeded · 2 eligible evidence objects')).toBeVisible()
    expect(screen.getByText('Input 2: Failed · Choose a supported readable file and retry.')).toBeVisible()
    expect(screen.getByText(/Successful extraction does not establish evidence sufficiency/)).toBeVisible()
  })
  it('distinguishes zero eligible evidence from a failed extraction', () => {
    const props = base()
    props.discovery.acquisition = { documentAcquisition: { latestAttempt: { contractVersion: 'document-extraction-outcomes.v1',
      items: [{ inputIndex: 0, status: 'SUCCEEDED', evidenceObjectCount: 0 }] } } }
    mount(props)
    expect(screen.getByText('Input 1: Succeeded · 0 eligible evidence objects')).toBeVisible()
  })
  it('does not invent outcomes for a legacy attempt without the contract', () => {
    mount(base())
    expect(screen.queryByRole('region', { name: 'Latest document extraction outcomes' })).not.toBeInTheDocument()
    expect(screen.queryByText('Latest document extraction')).not.toBeInTheDocument()
  })
  it('does not render a malformed success count as a verified outcome', () => {
    const props = base()
    props.discovery.acquisition = { documentAcquisition: { latestAttempt: { contractVersion: 'document-extraction-outcomes.v1',
      items: [{ inputIndex: 0, status: 'SUCCEEDED' }] } } }
    mount(props)
    expect(screen.getByText('Latest document extraction outcomes unavailable.')).toBeVisible()
    expect(screen.queryByText(/Succeeded ·/)).not.toBeInTheDocument()
  })
  it('allows acquisition on an empty editable revision without review eligibility or implicit acceptance', async () => {
    const props = base(); props.authority.canReview = false
    mount(props)
    await userEvent.click(screen.getByRole('button', { name: 'Acquire new evidence' }))
    expect(calls.update).toHaveBeenCalledWith({ runtimeInstanceId: 'revision-1', body: { inputs: inputValues, acquisitionProfile: 'STANDARD', expectedUpdatedAt: stamp, requestKey: expect.stringMatching(/^[a-f0-9-]{36}$/) } })
    expect(calls.execute).not.toHaveBeenCalled()
    expect(await screen.findByText(/Acquisition recorded.*No evidence was accepted/)).toBeVisible()
    expect(props.refresh).toHaveBeenCalledOnce()
  })
  it('uses projected governed action with exact scope, editable brief, website list and selected document', async () => {
    const props = base(); props.renderer.actions = [{ governedAction: 'BUILD_EVIDENCE_PACK', enabled: true }]
    mount(props)
    await userEvent.clear(screen.getByLabelText('Company name')); await userEvent.type(screen.getByLabelText('Company name'), 'Changed company')
    await userEvent.click(screen.getByRole('button', { name: 'Add URL' })); await userEvent.type(screen.getByLabelText('Website URL 2'), 'https://example.com')
    await userEvent.upload(screen.getByLabelText(/Select documents/), new File(['Synthetic evidence only.'], 'controlled.txt', { type: 'text/plain' }))
    await screen.findByText(/controlled.txt.*Staged locally/)
    await userEvent.click(screen.getByRole('button', { name: 'Acquire new evidence' }))
    expect(calls.execute).toHaveBeenCalledWith(expect.objectContaining({ runtimeInstanceId: 'revision-1', customerId: 'customer-1', tenantId: 'tenant-1', actionKey: 'BUILD_EVIDENCE_PACK', body: expect.objectContaining({ expectedUpdatedAt: stamp, inputs: expect.objectContaining({ companyName: 'Changed company', websiteSources: ['https://example.org', 'https://example.com'] }), documentSources: [expect.objectContaining({ fileName: 'controlled.txt', assetType: 'CUSTOMER_DOCUMENT', contentBase64: expect.stringContaining('data:text/plain;base64,') })] }) }))
    expect(calls.update).not.toHaveBeenCalled()
  })
  it.each([{ locked: true }, { authority: null }, { loading: true }, { discovery: { evidenceReady: false } }])('fails closed for unavailable or locked input/authority %j', async overrides => {
    mount({ ...base(), ...overrides })
    expect(screen.getByRole('button', { name: 'Acquire new evidence' })).toBeDisabled()
    if (screen.queryByLabelText('Company name')) expect(screen.getByLabelText('Company name')).toBeDisabled()
    expect(calls.update).not.toHaveBeenCalled()
  })
  it('does not fall back around a disabled projected action', () => {
    const props=base(); props.renderer.actions=[{ actionKey:'BUILD_EVIDENCE_PACK', enabled:false, disabledReason:'A governed dependency is unavailable.' }, { actionKey:'SAVE_DISCOVERY_INPUTS', enabled:true }]
    mount(props); expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled(); expect(screen.getByRole('status')).toHaveTextContent('A governed dependency is unavailable.')
  })
  it('requires complete brief and limits website controls to ten URLs', async () => {
    const props=base(); props.discovery.inputValues={ ...inputValues, companyName:'' }; mount(props)
    expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled()
    for(let i=0;i<9;i++) await userEvent.click(screen.getByRole('button',{name:'Add URL'}))
    expect(screen.getByRole('button',{name:'Add URL'})).toBeDisabled()
  })
  it('blocks file count and format/size errors without sending a request', async () => {
    mount(base())
    await userEvent.upload(screen.getByLabelText(/Select documents/), Array.from({length:6}, (_,i)=>new File(['text'],`${i}.txt`,{type:'text/plain'})))
    expect(await screen.findByRole('alert')).toHaveTextContent('up to 5')
    expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled()
    await userEvent.click(screen.getByRole('button',{name:'Clear selected files'}))
    const file=new File(['text'],'oversize.txt',{type:'text/plain'}); Object.defineProperty(file,'size',{value:2500001})
    await userEvent.upload(screen.getByLabelText(/Select documents/),file)
    expect(await screen.findByRole('alert')).toHaveTextContent('size limit')
    expect(calls.update).not.toHaveBeenCalled()
  })
  it('prevents overlap and late preparation from submitting after unmount', async () => {
    let finish; const read=vi.spyOn(FileReader.prototype,'readAsDataURL').mockImplementation(function(){ finish=()=>{Object.defineProperty(this,'result',{value:'data:text/plain;base64,dGVzdA=='});this.onload()} })
    const view=mount(base());await userEvent.upload(screen.getByLabelText(/Select documents/),new File(['test'],'slow.txt',{type:'text/plain'}))
    expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled()
    view.unmount(); await act(async()=>finish()); expect(calls.update).not.toHaveBeenCalled();read.mockRestore()
  })
  it('preserves staged files on response failure and checks the same request after refresh', async () => {
    calls.update.mockReturnValueOnce({unwrap:()=>Promise.reject({data:{message:'Controlled service failure'}})})
    const props=base();mount(props)
    await userEvent.upload(screen.getByLabelText(/Select documents/),new File(['test'],'retry.txt',{type:'text/plain'}));await screen.findByText(/retry.txt.*Staged locally/)
    await userEvent.click(screen.getByRole('button',{name:'Acquire new evidence'}))
    expect(await screen.findByText(/selected documents remain staged locally/)).toBeVisible()
    expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled()
    expect(screen.getByText(/retry.txt.*Staged locally/)).toBeVisible()
    await userEvent.click(screen.getByRole('button',{name:'Refresh acquisition data'}))
    expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled()
    const original = calls.update.mock.calls[0][0]
    await userEvent.click(screen.getByRole('button',{name:'Check original acquisition request'}))
    await waitFor(()=>expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeEnabled())
    expect(calls.update).toHaveBeenCalledTimes(2); expect(calls.update.mock.calls[1][0]).toEqual(original)
  })
  it('blocks stale local changes until explicit discard loads the new basis', async () => {
    const props=base();const view=mount(props);await userEvent.type(screen.getByLabelText('Company name'),' change')
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} renderer={{...props.renderer,runtimeInstance:{updatedAt:'2026-10-04T11:00:00.000Z'}}} /></MemoryRouter>)
    expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled();expect(screen.getByRole('status')).toHaveTextContent('revision changed')
    await userEvent.click(screen.getByRole('button',{name:'Discard local changes'}));expect(screen.getByLabelText('Company name')).toHaveValue('Controlled fixture')
  })
  it('keeps selected file unavailable when inputValues disappears', async () => {
    const props=base();const view=mount(props)
    await userEvent.upload(screen.getByLabelText(/Select documents/),new File(['test'],'staged.txt',{type:'text/plain'}));await screen.findByText(/staged.txt.*Staged locally/)
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} discovery={{...props.discovery,inputValues:null}} /></MemoryRouter>)
    expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled();expect(screen.queryByLabelText('Company name')).not.toBeInTheDocument();expect(calls.update).not.toHaveBeenCalled()
  })
  it('focuses persistent status and ignores completion after unmount without refreshing another Context', async () => {
    let finish;calls.update.mockReturnValueOnce({unwrap:()=>new Promise(resolve=>{finish=resolve})})
    const props=base();const view=mount(props);await userEvent.click(screen.getByRole('button',{name:'Acquire new evidence'}))
    expect(screen.getByRole('status')).toHaveFocus();expect(screen.getByRole('button',{name:'Acquiring…'})).toBeDisabled()
    view.unmount();await act(async()=>finish({}));expect(props.refresh).not.toHaveBeenCalled();expect(calls.update).toHaveBeenCalledOnce()
  })
  it('preserves failed request blocker, edited brief and staged files through inactive tab roundtrip', async () => {
    calls.update.mockReturnValueOnce({unwrap:()=>Promise.reject({data:{message:'Controlled failure'}})})
    const props=base();const view=mount(props);await userEvent.type(screen.getByLabelText('Company name'),' local')
    await userEvent.upload(screen.getByLabelText(/Select documents/),new File(['test'],'kept.txt',{type:'text/plain'}));await screen.findByText(/kept.txt.*Staged locally/)
    await userEvent.click(screen.getByRole('button',{name:'Acquire new evidence'}));await screen.findByText(/selected documents remain staged locally/)
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active={false} /></MemoryRouter>);view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active /></MemoryRouter>)
    expect(screen.getByText('Controlled fixture local',{exact:true})).toBeVisible();expect(screen.getByText(/kept.txt.*Staged locally/)).toBeVisible();expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled()
  })
  it('invalidates pending preparation when a tab leaves and returns before FileReader completes', async () => {
    let finish;vi.spyOn(FileReader.prototype,'readAsDataURL').mockImplementation(function(){finish=()=>{Object.defineProperty(this,'result',{value:'data:text/plain;base64,dGVzdA=='});this.onload()}})
    const props=base();const view=mount(props);await userEvent.upload(screen.getByLabelText(/Select documents/),new File(['test'],'late.txt',{type:'text/plain'}))
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active={false} /></MemoryRouter>);view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active /></MemoryRouter>)
    await act(async()=>finish());expect(screen.queryByText(/late.txt.*Staged locally/)).not.toBeInTheDocument();expect(screen.getByRole('alert')).toHaveTextContent('cancelled');expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled()
  })
  it.each([false,true])('requires explicit refresh after pending mutation completes following tab roundtrip (return before settle %s)', async returnFirst => {
    let finish;calls.update.mockReturnValueOnce({unwrap:()=>new Promise(resolve=>{finish=resolve})})
    const props=base();const view=mount(props);await userEvent.click(screen.getByRole('button',{name:'Acquire new evidence'}))
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active={false} /></MemoryRouter>)
    if(returnFirst)view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active /></MemoryRouter>)
    await act(async()=>finish({}));if(!returnFirst)view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active /></MemoryRouter>)
    expect(props.refresh).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled();expect(screen.getByRole('button',{name:'Refresh acquisition data'})).toBeEnabled()
    await userEvent.click(screen.getByRole('button',{name:'Refresh acquisition data'}));expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled()
    const original = calls.update.mock.calls[0][0]
    await userEvent.click(screen.getByRole('button',{name:'Check original acquisition request'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeEnabled())
    expect(calls.update.mock.calls[1][0]).toEqual(original)
  })
  it('does not unlock from a recovery refresh that left and returned before completion', async () => {
    calls.update.mockReturnValueOnce({unwrap:()=>Promise.reject({data:{message:'Controlled failure'}})})
    let finish;const props=base();props.refresh.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
    const view=mount(props);await userEvent.click(screen.getByRole('button',{name:'Acquire new evidence'}));await screen.findByText(/selected documents remain staged locally/)
    await userEvent.click(screen.getByRole('button',{name:'Refresh acquisition data'}))
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active={false} /></MemoryRouter>);view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active /></MemoryRouter>)
    await act(async()=>finish(true));expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled();expect(screen.getByRole('status')).toHaveTextContent('Context changed while refreshing');expect(screen.getByRole('button',{name:'Refresh acquisition data'})).toBeEnabled()
  })
  it('reports persisted acquisition separately when reads fail and never silently retries', async () => {
    const props=base();props.refresh.mockResolvedValue(false);mount(props);await userEvent.click(screen.getByRole('button',{name:'Acquire new evidence'}))
    expect(await screen.findByText(/Acquisition recorded, but current reads/)).toBeVisible();expect(screen.getByRole('button',{name:'Acquire new evidence'})).toBeDisabled();expect(calls.update).toHaveBeenCalledOnce()
  })
})

it('passes the locked selected scope and current read authority to availability without unlocking acquisition', () => {
  const selected = base()
  mount({ ...selected, locked: true, availabilityReadAllowed: true, availabilityLoading: false,
    availabilityRoute: 'view=context', availabilityError: undefined })
  const props = calls.availability.mock.calls.at(-1)[0]
  expect(props.scope).toEqual({ runtimeInstanceId: selected.runtimeInstanceId, customerId: selected.customerId, tenantId: selected.tenantId })
  expect(props.renderer).toBe(selected.renderer)
  expect(props.canRead).toBe(true)
  expect(props.route).toBe('view=context')
  expect(screen.getByRole('button', { name: 'Acquire new evidence', exact: true })).toBeDisabled()
  expect(calls.execute).not.toHaveBeenCalled()
  expect(calls.update).not.toHaveBeenCalled()
})

it('retains read-only acquisition Run history in the locked Context without enabling retry', async () => {
  const selected = base()
  mount({ ...selected, locked: true })
  await userEvent.click(screen.getByRole('button', { name: 'Runs and processing history' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('Run history test boundary')
  expect(calls.history.mock.calls.at(-1)[0]).toMatchObject({ locked: true, canAcquire: false, active: true,
    scope: { runtimeInstanceId: selected.runtimeInstanceId, customerId: selected.customerId, tenantId: selected.tenantId } })
  expect(calls.history.mock.calls.at(-1)[0].onRetry).toBeUndefined()
  expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled()
})

it('keeps the submission owner mounted but inactive when leaving Context', () => {
  mount({ ...base(), locked: true, active: false, availabilityReadAllowed: true })
  expect(calls.availability.mock.calls.at(-1)[0]).toMatchObject({ active: false, locked: true })
  expect(screen.queryByRole('form', { name: 'Post-lock submission test boundary' })).not.toBeInTheDocument()
})

it('places the separate submission form outside the existing acquisition form', () => {
  mount({ ...base(), locked: true })
  const form = screen.getByRole('form', { name: 'Post-lock submission test boundary' })
  expect(form.parentElement.closest('form')).toBeNull()
  expect(document.querySelectorAll('form form')).toHaveLength(0)
})

it.each(['departure', 'loading', 'authority', 'scope', 'brief', 'session'])('discards research preparation dialog on %s without resurrection or acquisition', async kind => {
  const user = userEvent.setup(), props = base()
  const view = render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
  await user.click(screen.getByRole('checkbox', { name: 'Research public information' }))
  await user.click(screen.getByRole('button', { name: 'Configure research' }))
  expect(screen.getByRole('button', { name: 'Start research' })).toBeDisabled()
  const changed = { ...props }
  if (kind === 'departure') changed.active = false
  if (kind === 'loading') changed.loading = true
  if (kind === 'authority') changed.authority = { canAcquire: false }
  if (kind === 'scope') changed.contextKey = 'other-scope'
  if (kind === 'brief') {
    const updatedAt = '2026-10-04T11:00:00.000Z'
    changed.renderer = { ...props.renderer, runtimeInstance: { updatedAt } }
    changed.authority = { canAcquire: true, runtimeUpdatedAt: updatedAt }
    changed.discovery = { ...props.discovery, inputValues: { ...inputValues, companyName: 'Changed brief' } }
  }
  if (kind === 'session') act(() => clearTokens())
  else view.rerender(<MemoryRouter><ContextAcquisitionView {...changed} /></MemoryRouter>)
  expect(screen.queryByRole('dialog', { name: 'Configure research' })).not.toBeInTheDocument()
  view.rerender(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
  expect(screen.queryByRole('dialog', { name: 'Configure research' })).not.toBeInTheDocument()
  expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled()
})

const configurationFixture = (saved = false) => {
 const scope = { customerId: 'customer-1', tenantId: 'tenant-1', runtimeInstanceId: '123456789012345678901234', runtimeInstanceKey: 'revision-1' }
 const context = { companyName: 'Saved fixture', marketRegion: 'Test market', targetOffer: 'Synthetic service', notes: '' }
 return { data: { contractVersion: 'public-research-configuration-read.v1', scope, basis: { stateVersion: 'rsv2:basis', updatedAt: stamp }, editable: true,
 currency: saved ? 'CURRENT_BASIS' : 'NOT_RECORDED', configuration: saved ? { contractVersion: 'public-research-configuration.v1', configurationVersion: '12345678-1234-4123-8123-123456789abc', scope,
 basisStateVersion: 'rsv2:basis', basisUpdatedAt: stamp, contextSource: 'USER_PREPARED_CONTEXT_BRIEF', context, coverage: 'STANDARD',
 purpose: 'Company: Saved fixture\nMarket / region: Test market\nProduct or service: Synthetic service', savedAt: stamp, savedBy: '123456789012345678901234', configurationHash: 'sha256:' + 'a'.repeat(64), saveAuditId: '123456789012345678901235',
 settings: { startingUrls: ['https://fixture.example'], legalEntity: '', countryCode: '', entityIdentifier: '', entityConfirmed: false, ukSubsidiary: false, sources: ['WEBSITE'], instructions: 'Retain qualification.' } } : null } }
}
describe('server-saved research configuration', () => {
 const openConfiguration = async () => { await userEvent.click(screen.getByRole('checkbox', { name: 'Research public information' })); await userEvent.click(screen.getByRole('button', { name: 'Configure research' })) }
 it('saves explicit intent, verifies scoped read-back and restores after remount without acquisition', async () => {
   const response = configurationFixture(true)
   calls.configRead = { currentData: configurationFixture(), refetch: calls.configRefetch }
   calls.saveConfig.mockReturnValue({ unwrap: () => Promise.resolve(response) })
   calls.configRefetch.mockImplementation(() => { calls.configRead = { currentData: response, refetch: calls.configRefetch }; return { unwrap: () => Promise.resolve(response) } })
   const props = base(), view = render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
   await openConfiguration(); await userEvent.click(screen.getByRole('button', { name: 'Save research configuration' }))
   await waitFor(() => expect(calls.configRefetch).toHaveBeenCalledTimes(1))
   expect(calls.saveConfig.mock.calls[0][0]).toMatchObject({ runtimeInstanceId: 'revision-1', customerId: 'customer-1', tenantId: 'tenant-1', body: { expectedStateVersion: 'rsv2:basis', expectedUpdatedAt: stamp, expectedConfigurationVersion: null, context: { companyName: 'Controlled fixture' } } })
   view.unmount()
   render(<MemoryRouter><ContextAcquisitionView {...props} discovery={{ inputValues: {}, acquisitionProfile: 'STANDARD' }} /></MemoryRouter>)
   expect(screen.getByText(/Saved research configuration ·/)).toBeVisible()
   await userEvent.click(screen.getByRole('button', { name: 'Configure research' }))
   expect(screen.getByText('Saved fixture', { exact: true })).toBeVisible()
   expect(screen.getByLabelText('Optional narrowing instructions')).toHaveValue('Retain qualification.')
   expect(screen.getByRole('button', { name: 'Start research' })).toBeDisabled()
   expect(calls.update).not.toHaveBeenCalled(); expect(calls.execute).not.toHaveBeenCalled()
 })
 it.each(['save failure', 'read-back mismatch', 'late session'])('does not claim saved settings after %s', async kind => {
   const response = configurationFixture(true); let finish
   calls.configRead = { currentData: configurationFixture(), refetch: calls.configRefetch }
   calls.configRefetch.mockReturnValue({ unwrap: () => Promise.resolve(configurationFixture()) })
   calls.saveConfig.mockReturnValue({ unwrap: () => kind === 'save failure' ? Promise.reject({ data: { error: { message: 'Configuration changed; reload.' } } }) : kind === 'late session' ? new Promise(resolve => { finish = resolve }) : Promise.resolve(response) })
   render(<MemoryRouter><ContextAcquisitionView {...base()} /></MemoryRouter>)
   await openConfiguration(); await userEvent.click(screen.getByRole('button', { name: 'Save research configuration' }))
   if (kind === 'late session') { act(() => clearTokens()); await act(async () => finish(response)); expect(calls.configRefetch).not.toHaveBeenCalled() }
   else await screen.findByText(kind === 'save failure' ? /Configuration changed; reload/ : /read-back could not be verified/)
   expect(screen.queryByText(/Saved research configuration ·/)).not.toBeInTheDocument()
   expect(calls.update).not.toHaveBeenCalled(); expect(calls.execute).not.toHaveBeenCalled()
 })
})

it('keeps saving unavailable when the server configuration read fails', async () => {
 calls.configRead = { currentData: configurationFixture(), error: { status: 503 } }
 render(<MemoryRouter><ContextAcquisitionView {...base()} /></MemoryRouter>)
 expect(screen.getByText(/Saved configuration is unavailable/)).toBeVisible()
 await userEvent.click(screen.getByRole('checkbox', { name: 'Research public information' }))
 await userEvent.click(screen.getByRole('button', { name: 'Configure research' }))
 expect(screen.getByRole('button', { name: 'Save research configuration' })).toBeDisabled()
 expect(calls.saveConfig).not.toHaveBeenCalled()
})

const availabilityFixture = () => {
 const response = configurationFixture(true), data = response.data, record = data.configuration
 data.availability = { contractVersion: 'public-research-availability.v1', canStart: false, executionEnabled: false, reason: 'OPERATING_APPROVAL_NOT_RECORDED',
 configurationVersion: record.configurationVersion, configurationHash: record.configurationHash,
 categories: ['WEBSITE', 'SEARCH', 'REGISTRY', 'GITHUB', 'LINKEDIN', 'SOCIAL', 'NEWS', 'REVIEWS', 'INDUSTRY'].map(key => ({ key, selected: key === 'WEBSITE', status: key === 'WEBSITE' ? 'GATED' : 'NOT_SELECTED', reason: key === 'WEBSITE' ? 'OPERATING_APPROVAL_NOT_RECORDED' : 'SOURCE_NOT_SELECTED' })),
 requestMapping: { contractVersion: 'public-research-request-mapping.v1', configurationVersion: record.configurationVersion, configurationHash: record.configurationHash,
 saveAuditId: record.saveAuditId, scope: data.scope, basis: data.basis, contextSource: record.contextSource, inputs: record.context, purpose: record.purpose,
 acquisitionProfile: record.coverage, settings: record.settings } }
 return response
}
describe('server-owned research availability', () => {
 it('shows the server-bound saved request without dispatching or claiming configuration cannot be saved', async () => {
  calls.configRead = { currentData: availabilityFixture() }
  render(<MemoryRouter><ContextAcquisitionView {...base()} /></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: 'Research availability' }))
  expect(within(screen.getByRole('dialog')).getByText('Provider/registry operating approval is not recorded. No retrieval will run.')).toBeVisible()
  expect(screen.queryByText(/Research settings cannot be saved/)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Back to Context' }))
  await userEvent.click(screen.getByRole('button', { name: 'Configure research' }))
  expect(screen.getByText(/Saved request mapped · Standard coverage · 1 selected categories/)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Start research' })).toBeDisabled()
  expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled(); expect(calls.saveConfig).not.toHaveBeenCalled()
 })
 it.each(['brief edit', 'fetching', 'failed read', 'root stamp'])('withholds authoritative availability after %s', async kind => {
  const props = base(); calls.configRead = { currentData: availabilityFixture() }
  const view = render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
  if (kind === 'brief edit') {
   await userEvent.click(screen.getByRole('button', { name: 'Edit evidence gathering brief' }))
   await userEvent.type(screen.getByLabelText('Company name'), ' changed')
   await userEvent.click(screen.getByRole('button', { name: 'Apply brief' }))
  } else {
   if (kind === 'fetching') calls.configRead.isFetching = true
   if (kind === 'failed read') calls.configRead.error = { status: 503 }
   if (kind === 'root stamp') props.renderer = { runtimeInstance: { stateVersion: 'rsv2:basis', updatedAt: '2026-11-12T13:00:00Z' } }
   view.rerender(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
  }
  await userEvent.click(screen.getByRole('button', { name: 'Research availability' }))
  expect(screen.queryByText('Provider/registry operating approval is not recorded. No retrieval will run.')).not.toBeInTheDocument()
  expect(screen.queryByText(/Saved request mapped/)).not.toBeInTheDocument()
  expect(calls.execute).not.toHaveBeenCalled(); expect(calls.saveConfig).not.toHaveBeenCalled()
 })
 it.each(['binding', 'basis', 'source identity', 'duplicate category', 'execution flag', 'mapping contents'])('rejects invalid %s while preserving readable settings', kind => {
  const data = availabilityFixture().data
  expect(readResearchAvailability(data)).not.toBeNull()
  if (kind === 'binding') data.availability.configurationHash = 'sha256:' + '0'.repeat(64)
  if (kind === 'basis') data.availability.requestMapping.basis = { ...data.basis, stateVersion: 'foreign' }
  if (kind === 'source identity') data.availability.categories[0].key = 'PRIVATE_WEB'
  if (kind === 'duplicate category') data.availability.categories[1] = data.availability.categories[0]
  if (kind === 'execution flag') data.availability.executionEnabled = true
  if (kind === 'mapping contents') data.availability.requestMapping = { ...data.availability.requestMapping, inputs: { ...data.configuration.context, companyName: 'foreign' } }
  expect(readResearchAvailability(data)).toBeNull()
  expect(data.configuration.context.companyName).toBe('Saved fixture')
 })
})

const fixtureStartConfiguration = () => {
 const response = availabilityFixture(), data = response.data, record = data.configuration
 data.scope.customerId = "123456789012345678901231"; data.scope.tenantId = "123456789012345678901232"
 data.availability.fixtureStart = { contractVersion: 'controlled-fixture-start.v1', eligible: true, classification: 'CONTROLLED_SYNTHETIC_REPLAY', actorUserId: record.savedBy,
  scope: data.scope, basis: data.basis, bindingId: 'fixture.1', bindingDigest: 'sha256:' + 'b'.repeat(64),
  fixture: { fixtureId: 'fixture-html', fixtureVersion: 1, fixtureFileSha256: 'a'.repeat(64), htmlSha256: 'b'.repeat(64), sourceUrl: record.settings.startingUrls[0] },
  selector: { configurationVersion: record.configurationVersion, configurationHash: record.configurationHash, basisStateVersion: data.basis.stateVersion } }
 return response
}
const researchRunFor = (requestKey, status = 'SUCCEEDED') => {
 const config = fixtureStartConfiguration().data, active = ['QUEUED', 'RUNNING'].includes(status)
 const binding = { contractVersion: 'controlled-replay-binding.v1', classification: 'CONTROLLED_SYNTHETIC_REPLAY', environment: 'DEVELOPMENT_TEST',
  bindingId: 'fixture.1', bindingVersion: 1, scope: { customerId: config.scope.customerId, tenantId: config.scope.tenantId, runtimeInstanceId: config.scope.runtimeInstanceId },
  actorUserId: config.configuration.savedBy, revisionId: config.scope.runtimeInstanceKey, basisStateVersion: config.basis.stateVersion, fixture: config.availability.fixtureStart.fixture }
 return { contractVersion: 'controlled-acquisition-run.v1', runId: '12345678-1234-4123-8123-123456789abb', executionAttemptId: '12345678-1234-4123-8123-123456789acd', requestKey, scope: config.scope,
  actorUserId: binding.actorUserId, actionKey: 'BUILD_EVIDENCE_PACK', basisStateVersion: config.basis.stateVersion, basisUpdatedAt: config.basis.updatedAt,
  researchConfiguration: config.configuration, status, currency: active ? 'ACTIVE' : 'CURRENT_OUTPUT',
  controlledReplayProvenance: { binding, provenance: { contractVersion: 'controlled-replay-provenance.v1', classification: binding.classification,
   operation: 'CONTROLLED_HTML_REPLAY_CAPTURE', adapter: 'controlled-html-replay-v1', bindingId: binding.bindingId, bindingVersion: 1,
   bindingDigest: 'sha256:' + 'b'.repeat(64), ...binding.fixture } },
  ...(active ? { recovery: 'Recorded active Run. Refresh its exact receipt.' } : { canonicalSaved: true, outputStateVersion: 'rsv2:recorded',
   outcomes: [{ kind: 'CONTROLLED', inputIndex: 0, status: 'SUCCEEDED', sourceId: 'fixture_original', evidenceObjectCount: 4 }],
   audit: { admissionId: 'a', startId: 'b', terminalId: 'c', saveId: 's' } }) }
}
const researchPage = (key, rows) => ({ data: { contractVersion: 'acquisition-run.v1', requestedRequestKey: key,
 scope: fixtureStartConfiguration().data.scope, items: rows, hasMore: false } })
const ResearchLocation = () => <p data-testid="research-location">{useLocation().search}</p>
const researchView = (props, route) => <MemoryRouter initialEntries={[route]}><ContextAcquisitionView {...props} /><ResearchLocation /></MemoryRouter>
const researchProps = () => { const props = base(); props.customerId = "123456789012345678901231"; props.tenantId = "123456789012345678901232"; props.renderer.actions = [{ actionKey: 'BUILD_EVIDENCE_PACK', enabled: true }]; return props }
describe('explicit provider-free Start and recorded progress', () => {
 it.each(['Start research', 'Save research configuration'].flatMap(action =>
  ['authority', 'locked', 'loading', 'configuration', 'departure and return', 'session', 'unmount'].map(departure => [action, departure])))(
  'never dispatches retained %s after %s', async (action, departure) => {
   calls.configRead = { currentData: fixtureStartConfiguration() }
   const props = researchProps(), route = '/app/intelligence?view=context'
   const view = render(researchView(props, route))
   await userEvent.click(screen.getByRole('button', { name: 'Configure research' }))
   const button = screen.getByRole('button', { name: action })
   expect(button).toBeEnabled()
   const retained = button[Object.keys(button).find(key => key.startsWith('__reactProps'))].onClick
   if (departure === 'unmount') view.unmount()
   else if (departure === 'session') act(() => clearTokens())
   else {
    if (departure === 'configuration') calls.configRead = { currentData: fixtureStartConfiguration() }
    view.rerender(researchView({ ...props, ...(departure === 'authority' ? {authority: {canAcquire: false}}
     : departure === 'locked' ? {locked: true} : departure === 'loading' ? {loading: true}
     : departure === 'departure and return' ? {active: false} : {}) }, route))
   }
   act(() => retained())
   expect(calls.execute).not.toHaveBeenCalled(); expect(calls.saveConfig).not.toHaveBeenCalled()
   if (!['session', 'unmount'].includes(departure)) {
    view.rerender(researchView(props, route))
    act(() => retained())
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.saveConfig).not.toHaveBeenCalled()
   }
  })
 it('prepares a failed fixture locally and only an explicit Start submits its new predecessor-linked request', async () => {
  const key = '12345678-1234-4123-8123-123456789aba', row = researchRunFor(key)
  row.status = 'FAILED'; row.canonicalSaved = false; row.currency = 'HISTORICAL_OUTPUT'; delete row.outputStateVersion; delete row.audit.saveId
  row.outcomes = [{ kind: 'CONTROLLED', inputIndex: 0, status: 'FAILED', evidenceObjectCount: 0 }]
  calls.configRead = { currentData: fixtureStartConfiguration() }
  render(researchView(researchProps(), '/app/intelligence?view=context&researchRequestKey=' + key + '&acquisitionRunId=' + row.runId))
  const history = calls.history.mock.calls.at(-1)[0]
  expect(history.canRetryResearch(row)).toBe(true)
  act(() => history.onRetry(row))
  expect(calls.execute).not.toHaveBeenCalled(); expect(screen.getByTestId('research-location')).toHaveTextContent(key)
  expect(screen.getByText(/Explicit fixture retry prepared for Run/)).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Configure research' })); await userEvent.click(screen.getByRole('button', { name: 'Start research' }))
  const payload = calls.execute.mock.calls[0][0].body
  expect(payload.requestKey).not.toBe(key)
  expect(payload).toMatchObject({ predecessorRunId: row.runId, predecessorExecutionAttemptId: row.executionAttemptId })
  expect(calls.execute).toHaveBeenCalledOnce()
 })
 it.each(['saved', 'active', 'cancelled', 'wrong actor', 'stale snapshot'])('does not prepare a %s controlled retry', kind => {
  const key = '12345678-1234-4123-8123-123456789aba', row = researchRunFor(key)
  row.status = 'FAILED'; row.canonicalSaved = false; row.currency = 'HISTORICAL_OUTPUT'; delete row.outputStateVersion; delete row.audit.saveId
  row.outcomes = [{ kind: 'CONTROLLED', inputIndex: 0, status: 'FAILED', evidenceObjectCount: 0 }]
  if (kind === 'saved') row.canonicalSaved = true
  if (kind === 'active') row.status = 'RUNNING'
  if (kind === 'cancelled') row.status = 'CANCELLED'
  if (kind === 'wrong actor') row.actorUserId = 'a'.repeat(24)
  if (kind === 'stale snapshot') row.researchConfiguration = { ...row.researchConfiguration, configurationHash: 'sha256:' + 'f'.repeat(64) }
  calls.configRead = { currentData: fixtureStartConfiguration() }
  render(researchView(researchProps(), '/app/intelligence?view=context&researchRequestKey=' + key))
  expect(calls.history.mock.calls.at(-1)[0].canRetryResearch(row)).toBe(false); expect(calls.execute).not.toHaveBeenCalled()
 })
 it.each(['reload', 'configuration read failed', 'session replaced'])('invalidates prepared retry after %s without redispatch', kind => {
  const key = '12345678-1234-4123-8123-123456789aba', row = researchRunFor(key)
  row.status = 'FAILED'; row.canonicalSaved = false; row.currency = 'HISTORICAL_OUTPUT'; delete row.outputStateVersion; delete row.audit.saveId
  row.outcomes = [{ kind: 'CONTROLLED', inputIndex: 0, status: 'FAILED', evidenceObjectCount: 0 }]
  calls.configRead = { currentData: fixtureStartConfiguration() }
  const props = researchProps(), route = '/app/intelligence?view=context&researchRequestKey=' + key
  const view = render(researchView(props, route))
  act(() => calls.history.mock.calls.at(-1)[0].onRetry(row))
  expect(screen.getByText(/Explicit fixture retry prepared for Run/)).toBeVisible()
  if (kind === 'session replaced') act(() => clearTokens())
  else if (kind === 'reload') { view.unmount(); render(researchView(props, route)) }
  else { calls.configRead = { error: { status: 503 } }; view.rerender(researchView(props, route)); calls.configRead = { currentData: fixtureStartConfiguration() }; view.rerender(researchView(props, route)) }
  expect(screen.queryByText(/Explicit fixture retry prepared for Run/)).not.toBeInTheDocument(); expect(calls.execute).not.toHaveBeenCalled()
 })
 it('allocates one request only on Start and routes its verified receipt to existing history', async () => {
  calls.configRead = { currentData: fixtureStartConfiguration() }; let finish
  calls.execute.mockImplementation(args => ({ unwrap: () => new Promise(resolve => { finish = () => resolve({ data: { acquisitionRun: researchRunFor(args.body.requestKey) } }) }) }))
  render(researchView(researchProps(), '/app/intelligence?view=context'))
  expect(calls.execute).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Configure research' }))
  expect(screen.getByRole('button', { name: 'Start research' })).toBeEnabled()
  await userEvent.click(screen.getByRole('button', { name: 'Start research' }))
  expect(calls.execute).toHaveBeenCalledOnce()
  const operation = calls.execute.mock.calls[0][0], key = operation.body.requestKey
  expect(operation).toMatchObject({ actionKey: 'BUILD_EVIDENCE_PACK', runtimeInstanceId: 'revision-1', body: {
   expectedUpdatedAt: stamp, acquisitionProfile: 'STANDARD', controlledReplay: { bindingId: 'fixture.1' }, researchConfiguration: fixtureStartConfiguration().data.availability.fixtureStart.selector } })
  expect(operation.body).not.toHaveProperty('inputs'); expect(operation.body).not.toHaveProperty('documentSources')
  expect(screen.getByTestId('research-location')).toHaveTextContent('researchRequestKey=' + key)
  expect(screen.getByText(/this is not recorded progress/)).toBeVisible()
  await act(async () => finish())
  expect(screen.getByTestId('research-location')).toHaveTextContent('acquisitionRunId=12345678-1234-4123-8123-123456789abb')
  expect(calls.saveConfig).not.toHaveBeenCalled(); expect(calls.execute).toHaveBeenCalledOnce()
 })
 it.each(['QUEUED', 'RUNNING', 'SUCCEEDED'])('reload reads exact persisted %s progress without a POST', status => {
  const key = '12345678-1234-4123-8123-123456789aba', row = researchRunFor(key, status)
  calls.configRead = { currentData: fixtureStartConfiguration() }; calls.lookupRead = { currentData: researchPage(key, [row]), refetch: calls.lookupRefetch }
  render(researchView(researchProps(), '/app/intelligence?view=context&researchRequestKey=' + key))
  expect(screen.getByText('Recorded request preview: ' + status + '. Verify its exact Run receipt below.')).toBeVisible()
  expect(screen.queryByText(/No research run has started/i)).not.toBeInTheDocument()
  expect(screen.getByText(/Saving settings does not start a research run/)).toBeVisible()
  expect(calls.history).toHaveBeenLastCalledWith(expect.objectContaining({ requestedRunId: row.runId, active: true }))
  expect(calls.lookupArgs).toHaveBeenLastCalledWith(expect.objectContaining({ requestKey: key, runtimeInstanceId: 'revision-1' }), { skip: false })
  expect(calls.execute).not.toHaveBeenCalled()
 })
 it.each(['missing', 'failed', 'other request', 'other scope'])('keeps %s request outcomes unknown and never redispatches', async kind => {
  const key = '12345678-1234-4123-8123-123456789aba', row = researchRunFor(key, 'RUNNING')
  calls.configRead = { currentData: fixtureStartConfiguration() }
  calls.lookupRead = { currentData: researchPage(key, kind === 'missing' ? [] : [row]), refetch: calls.lookupRefetch }
  if (kind === 'failed') calls.lookupRead.error = { status: 503 }
  if (kind === 'other request') calls.lookupRead.currentData.data.requestedRequestKey = '12345678-1234-4123-8123-123456789acc'
  if (kind === 'other scope') calls.lookupRead.currentData.data.scope = { ...row.scope, tenantId: 'foreign' }
  render(researchView(researchProps(), '/app/intelligence?view=context&researchRequestKey=' + key))
  expect(screen.queryByText(/Recorded request preview/)).not.toBeInTheDocument()
  expect(calls.history).toHaveBeenLastCalledWith(expect.objectContaining({ requestedRunId: undefined }))
  await userEvent.click(screen.getByRole('button', { name: 'Refresh original research request' }))
  expect(calls.lookupRefetch).toHaveBeenCalledOnce(); expect(calls.execute).not.toHaveBeenCalled()
 })
 it('retains an uncertain original request across reload without another Start', async () => {
  calls.configRead = { currentData: fixtureStartConfiguration() }
  calls.execute.mockReturnValue({ unwrap: () => Promise.reject(new Error('Unknown transport result')) })
  const props = researchProps(), view = render(researchView(props, '/app/intelligence?view=context'))
  await userEvent.click(screen.getByRole('button', { name: 'Configure research' })); await userEvent.click(screen.getByRole('button', { name: 'Start research' }))
  await screen.findByText(/Start outcome could not be verified/)
  const route = '/app/intelligence' + screen.getByTestId('research-location').textContent
  view.unmount(); render(researchView(props, route))
  expect(calls.execute).toHaveBeenCalledOnce(); expect(screen.getByRole('button', { name: 'Refresh original research request' })).toBeVisible()
 })
 it('does not reinterpret a late Start response after session replacement', async () => {
  let finish; calls.configRead = { currentData: fixtureStartConfiguration() }
  calls.execute.mockImplementation(args => ({ unwrap: () => new Promise(resolve => { finish = () => resolve({ data: { acquisitionRun: researchRunFor(args.body.requestKey) } }) }) }))
  render(researchView(researchProps(), '/app/intelligence?view=context'))
  await userEvent.click(screen.getByRole('button', { name: 'Configure research' })); await userEvent.click(screen.getByRole('button', { name: 'Start research' }))
  act(() => clearTokens()); await act(async () => finish())
  expect(screen.getByTestId('research-location').textContent).not.toContain('acquisitionRunId=')
 })
})

const searchStartConfiguration = () => {
 const response = fixtureStartConfiguration(), data = response.data, record = data.configuration
 record.settings.sources = ['SEARCH']; record.settings.startingUrls = ['https://www.trilogywebsolutions.co.uk/clients/']
 data.availability.categories = data.availability.categories.map(item => ({ ...item, selected: item.key === 'SEARCH',
  status: item.key === 'SEARCH' ? 'GATED' : 'NOT_SELECTED', reason: item.key === 'SEARCH' ? 'OPERATING_APPROVAL_NOT_RECORDED' : 'SOURCE_NOT_SELECTED' }))
 data.availability.fixtureStart = { contractVersion: 'provider-free-search-start.v1', eligible: true,
  classification: 'LOCAL_SYNTHETIC_RECEIPT_ONLY', provider: 'TAVILY_SEARCH', actorUserId: record.savedBy,
  scope: data.scope, basis: data.basis, selector: { configurationVersion: record.configurationVersion,
   configurationHash: record.configurationHash, basisStateVersion: data.basis.stateVersion },
  fixture: { fixtureId: 'trilogy-clients-search.v1', fixtureVersion: 1, fixtureFileSha256: 'd'.repeat(64),
   targetUrl: record.settings.startingUrls[0], provider: 'TAVILY_SEARCH' }, receiptOnly: true, liveExecutionEnabled: false }
 return response
}
const searchRunFor = (key, status = 'SUCCEEDED') => {
 const value = researchRunFor(key), config = searchStartConfiguration().data.configuration, failed = status === 'FAILED'
 delete value.controlledReplayProvenance; delete value.outputStateVersion; delete value.audit.saveId
 value.contractVersion = 'provider-free-search-run.v1'; value.status = status; value.canonicalSaved = false
 value.currency = 'HISTORICAL_OUTPUT'; value.receiptRecorded = true; value.authority = 'VMF_UPDATE'; value.acquisitionProfile = 'STANDARD'
 value.researchConfiguration = { configurationVersion: config.configurationVersion, configurationHash: config.configurationHash, saveAuditId: config.saveAuditId }
 value.outcomes = [{ kind: 'SEARCH', inputIndex: 0, status: failed ? 'FAILED' : 'SUCCEEDED', evidenceObjectCount: 0 }]
 value.providerFreeSearch = { classification: 'LOCAL_SYNTHETIC_RECEIPT_ONLY', purpose: 'TAVILY_DISCOVERY_RECEIPT',
  authorityRef: 'ss049-provider-free-search-receipt.2026-11-13.v1', provider: 'TAVILY_SEARCH',
  recordHash: 'sha256:' + 'a'.repeat(64), rawResponseHash: 'sha256:' + 'b'.repeat(64),
  descriptorHash: 'sha256:' + 'c'.repeat(64), mappedResponseHash: 'sha256:' + 'd'.repeat(64),
  adaptationStatus: 'VALID', providerRequestId: failed ? null : 'synthetic-tavily-1',
  transportOutcome: status === 'PARTIALLY_SUCCEEDED' ? 'PARTIAL' : 'COMPLETE', httpStatus: failed ? 429 : 200,
  configuration: { configurationVersion: config.configurationVersion, configurationHash: config.configurationHash, basisStateVersion: value.basisStateVersion },
  discoveryItemCount: failed ? 0 : 1, liveExecutionEnabled: false, evidenceObjectCount: 0 }
 return value
}
describe('provider-free Trilogy search Start connection', () => {
 it('builds only the approved fixture selector and dispatches once from explicit Start', async () => {
  const config = searchStartConfiguration(); calls.configRead = { currentData: config }
  calls.execute.mockImplementation(({body}) => ({ unwrap: async () => ({ data: { acquisitionRun: searchRunFor(body.requestKey) } }) }))
  render(researchView(researchProps(), '/app/intelligence?view=context'))
  expect(calls.execute).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Configure research' }))
  expect(screen.getByText(/Start records only the registered provider-free search fixture receipt/)).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Start research' }))
  await waitFor(() => expect(screen.getByTestId('research-location')).toHaveTextContent('acquisitionRunId='))
  const body = calls.execute.mock.calls[0][0].body
  expect(body).toEqual({ requestKey: expect.any(String), expectedUpdatedAt: stamp,
   researchConfiguration: config.data.availability.fixtureStart.selector,
   providerFreeSearch: { fixtureId: 'trilogy-clients-search.v1', fixtureVersion: 1, fixtureFileSha256: 'd'.repeat(64) } })
  expect(body).not.toHaveProperty('fixture'); expect(body).not.toHaveProperty('responseText'); expect(body).not.toHaveProperty('controlledReplay')
  expect(calls.execute).toHaveBeenCalledOnce(); expect(calls.update).not.toHaveBeenCalled(); expect(calls.saveConfig).not.toHaveBeenCalled()
 })
 it.each(['provider', 'URL', 'hash', 'scope', 'actor', 'selector', 'mixed', 'live', 'category'])(
  'refuses a mismatched search capability: %s', kind => {
   const data = searchStartConfiguration().data, descriptor = data.availability.fixtureStart
   if (kind === 'provider') descriptor.provider = 'BRAVE_SEARCH'
   if (kind === 'URL') descriptor.fixture.targetUrl = 'https://foreign.example/'
   if (kind === 'hash') descriptor.fixture.fixtureFileSha256 = 'invalid'
   if (kind === 'scope') descriptor.scope = { ...descriptor.scope, tenantId: 'f'.repeat(24) }
   if (kind === 'actor') descriptor.actorUserId = 'f'.repeat(24)
   if (kind === 'selector') descriptor.selector.configurationHash = 'sha256:' + 'f'.repeat(64)
   if (kind === 'mixed') descriptor.bindingId = 'controlled.1'
   if (kind === 'live') descriptor.liveExecutionEnabled = true
   if (kind === 'category') data.configuration.settings.sources = ['WEBSITE', 'SEARCH']
   expect(readFixtureStart(data)).toBeNull()
   expect(buildFixtureStartPayload(data, '12345678-1234-4123-8123-123456789aba')).toBeNull()
  })
 it.each(['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED'])('reload reads the saved %s receipt without submitting another request', status => {
  const key = '12345678-1234-4123-8123-123456789aba', row = searchRunFor(key, status)
  calls.configRead = { currentData: searchStartConfiguration() }; calls.lookupRead = { currentData: researchPage(key, [row]) }
  render(researchView(researchProps(), '/app/intelligence?view=context&researchRequestKey=' + key))
  expect(screen.getByText('Recorded request preview: ' + status + '. Verify its exact Run receipt below.')).toBeVisible()
  expect(calls.history.mock.calls.at(-1)[0].requestedRunId).toBe(row.runId)
  expect(calls.execute).not.toHaveBeenCalled()
 })
 it.each(['FAILED', 'PARTIALLY_SUCCEEDED'])('prepares %s retry locally then sends the exact predecessor pair only on Start', async status => {
  const key = '12345678-1234-4123-8123-123456789aba', row = searchRunFor(key, status)
  calls.configRead = { currentData: searchStartConfiguration() }
  render(researchView(researchProps(), '/app/intelligence?view=context&researchRequestKey=' + key))
  const history = calls.history.mock.calls.at(-1)[0]
  expect(history.canRetryResearch(row)).toBe(true)
  act(() => history.onRetry(row)); expect(calls.execute).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Configure research' }))
  await userEvent.click(screen.getByRole('button', { name: 'Start research' }))
  const body = calls.execute.mock.calls[0][0].body
  expect(body).toMatchObject({ predecessorRunId: row.runId, predecessorExecutionAttemptId: row.executionAttemptId })
  expect(body.requestKey).not.toBe(key); expect(body.providerFreeSearch.fixtureId).toBe('trilogy-clients-search.v1')
  expect(calls.execute).toHaveBeenCalledOnce()
 })
 it.each(['authority', 'locked', 'loading', 'configuration', 'departure and return', 'session', 'unmount'])(
  'refuses retained search Start after %s', async departure => {
   calls.configRead = { currentData: searchStartConfiguration() }
   const props = researchProps(), route = '/app/intelligence?view=context', view = render(researchView(props, route))
   await userEvent.click(screen.getByRole('button', { name: 'Configure research' }))
   const button = screen.getByRole('button', { name: 'Start research' })
   expect(button).toBeEnabled()
   const retained = button[Object.keys(button).find(key => key.startsWith('__reactProps'))].onClick
   if (departure === 'unmount') view.unmount()
   else if (departure === 'session') act(() => clearTokens())
   else {
    if (departure === 'configuration') calls.configRead = { currentData: searchStartConfiguration() }
    view.rerender(researchView({ ...props, ...(departure === 'authority' ? { authority: { canAcquire: false } }
     : departure === 'locked' ? { locked: true } : departure === 'loading' ? { loading: true }
      : departure === 'departure and return' ? { active: false } : {}) }, route))
   }
   act(() => retained()); expect(calls.execute).not.toHaveBeenCalled()
   if (!['unmount', 'session'].includes(departure)) { view.rerender(researchView(props, route)); act(() => retained()); expect(calls.execute).not.toHaveBeenCalled() }
  })
 it('does not expose a late search response after the session changes or submit a retry', async () => {
  let finish
  calls.configRead = { currentData: searchStartConfiguration() }
  calls.execute.mockImplementation(({body}) => ({ unwrap: () => new Promise(resolve => { finish = () => resolve({ data: { acquisitionRun: searchRunFor(body.requestKey) } }) }) }))
  render(researchView(researchProps(), '/app/intelligence?view=context'))
  await userEvent.click(screen.getByRole('button', { name: 'Configure research' })); await userEvent.click(screen.getByRole('button', { name: 'Start research' }))
  act(() => clearTokens()); await act(async () => finish())
  expect(screen.getByTestId('research-location')).not.toHaveTextContent('acquisitionRunId=')
  expect(calls.execute).toHaveBeenCalledOnce()
 })
})

const publicStartConfiguration = (mode = 'OFFLINE') => {
 const response = fixtureStartConfiguration(), data = response.data, record = data.configuration
 Object.assign(record.settings, {sources: ['SEARCH', 'WEBSITE', 'REGISTRY'], startingUrls: ['https://controlled-context.example/case-study'],
  legalEntity: 'Synthetic Child Limited', countryCode: 'GB', entityIdentifier: '00123456', entityConfirmed: true})
 data.availability.categories = data.availability.categories.map(item => ({...item, selected: record.settings.sources.includes(item.key),
  status: record.settings.sources.includes(item.key) ? 'GATED' : 'NOT_SELECTED',
  reason: record.settings.sources.includes(item.key) ? 'OPERATING_APPROVAL_NOT_RECORDED' : 'SOURCE_NOT_SELECTED'}))
 data.availability.researchStart = {contractVersion: 'public-research-start.v1', eligible: true, mode,
  classification: mode === 'OFFLINE' ? 'CONTROLLED_PROVIDER_FREE_RESEARCH' : 'NATIVE_PUBLIC_RESEARCH', liveExecutionEnabled: mode === 'LIVE',
  actorUserId: record.savedBy, scope: data.scope, basis: data.basis,
  selector: {configurationVersion: record.configurationVersion, configurationHash: record.configurationHash, basisStateVersion: data.basis.stateVersion},
  requestKey: mode === 'OFFLINE' ? null : '12345678-1234-4123-8123-123456789ac1',
  ...(mode === 'OFFLINE' ? {fixture: {fixtureId: 'controlled-public-research.v1', fixtureVersion: 1, fixtureFileSha256: 'e'.repeat(64), controlledBindingId: 'local-public-research.1'}} : {})}
 return response
}
const publicRunFor = (key, status = 'SUCCEEDED', mode = 'OFFLINE') => {
 const value = searchRunFor(key), stamp = '2026-11-16T10:00:00.000Z'
 delete value.providerFreeSearch; delete value.receiptRecorded
 Object.assign(value, {contractVersion: 'public-research-run.v1', plannerVersion: 'public-research-planner.v1', status,
  createdAt: stamp, startedAt: stamp, completedAt: stamp, canonicalSaved: true, outputStateVersion: 'rsv2:public-output', currency: 'CURRENT_OUTPUT',
  cancellation: {eligible: false, executionAttemptId: value.executionAttemptId},
  outcomes: ['SEARCH', 'REGISTRY', mode === 'OFFLINE' ? 'CONTROLLED' : 'WEBSITE'].map(kind => ({kind, inputIndex: 0, status: 'SUCCEEDED',
   evidenceObjectCount: ['SEARCH', 'REGISTRY'].includes(kind) ? 0 : 1, ...(['SEARCH', 'REGISTRY'].includes(kind) ? {} : {sourceId: 'controlled_original'})})),
  publicResearch: {mode, classification: mode === 'OFFLINE' ? 'CONTROLLED_PROVIDER_FREE_RESEARCH' : 'NATIVE_PUBLIC_RESEARCH', liveExecutionEnabled: mode === 'LIVE',
   planHash: 'sha256:' + 'a'.repeat(64), policyHash: 'sha256:' + 'b'.repeat(64), receiptHash: 'sha256:' + 'c'.repeat(64), releaseId: key,
   operationCount: 3, completedOperationCount: 3, bytesRead: 100, elapsedMsRecorded: 30, reservedCostMicros: 0, modelTokens: 0,
   limits: {maxSearchRequests: 1, maxRegistryRequests: 1, maxPages: 1, maxPageBytes: 320000, maxJsonBytes: 16384, maxTotalBytes: 350000,
    maxElapsedMs: 10000, maxRequestMs: 1000, maxCostMicros: 0, searchRequestCostMicros: 0, registryRequestCostMicros: 0, concurrency: 1, retries: 0, redirects: 0, modelTokens: 0},
   categories: ['SEARCH', 'WEBSITE', 'REGISTRY'].map(category => ({key: category, status: 'SUCCEEDED', completedCount: 1, failedCount: 0, unknownCount: 0,
    evidenceObjectCount: category === 'WEBSITE' ? 1 : 0})),
   receipts: ['SEARCH', 'REGISTRY', 'WEBSITE'].map((category, ordinal) => ({ordinal, category, phase: 'RECORDED', inputIndex: 0,
    requestHash: 'sha256:' + 'd'.repeat(64), responseTextHash: 'sha256:' + 'f'.repeat(64), httpStatus: 200, bytesRead: 10, elapsedMs: 10,
    providerRequestId: null, sourceId: category === 'WEBSITE' ? 'controlled_original' : null, evidenceObjectCount: category === 'WEBSITE' ? 1 : 0})),
   qualifications: ['Offline fixture material remains unverified.']}})
 value.audit.saveId = 'public-save'
 if (status !== 'SUCCEEDED') {
  value.canonicalSaved = false; value.currency = 'HISTORICAL_OUTPUT'; delete value.outputStateVersion; delete value.audit.saveId
  value.outcomes.forEach(item => {item.evidenceObjectCount = 0; delete item.sourceId})
  value.publicResearch.categories.forEach(item => {item.evidenceObjectCount = 0; item.status = 'UNKNOWN'})
  value.publicResearch.receipts.forEach(item => {item.evidenceObjectCount = 0; item.sourceId = null})
 }
 if (['QUEUED', 'RUNNING'].includes(status)) {
  delete value.canonicalSaved; delete value.outcomes; delete value.audit; delete value.completedAt
  if (status === 'QUEUED') delete value.startedAt
  value.currency = 'ACTIVE'; value.cancellation.eligible = true
  value.publicResearch.completedOperationCount = 0; value.publicResearch.receipts = []; value.publicResearch.operationCount = 0
  value.publicResearch.categories.forEach(item => {item.status = 'PENDING'; item.completedCount = 0})
 }
 return value
}
describe('combined Public Research explicit Start and original request connection', () => {
 it('a malformed present category matrix withholds even an otherwise valid LIVE Start descriptor', async () => {
  const config = publicStartConfiguration('LIVE')
  expect(readFixtureStart(config.data)?.eligible).toBe(true)
  config.data.availability.capabilityMatrix = {contractVersion: 'public-research-capability-matrix.v1', categories: [], canStart: true}
  calls.configRead = {currentData: config}
  expect(readResearchAvailability(config.data)).toBeNull()
  expect(readFixtureStart(config.data)).toBeNull()
  render(researchView(researchProps(), '/app/intelligence?view=context'))
  await userEvent.click(screen.getByRole('button', {name: 'Configure research'}))
  expect(screen.getByRole('button', {name: 'Start research'})).toBeDisabled()
  expect(screen.queryByText('Available under the current operating release.')).not.toBeInTheDocument()
  expect(calls.execute).not.toHaveBeenCalled()
 })
 it.each(['OFFLINE', 'LIVE'])('submits only the frozen %s selector with its correct request identity', async mode => {
  const config = publicStartConfiguration(mode); calls.configRead = {currentData: config}
  calls.execute.mockImplementation(({body}) => ({unwrap: async () => ({data: {acquisitionRun: publicRunFor(body.requestKey, 'SUCCEEDED', mode)}})}))
  render(researchView(researchProps(), '/app/intelligence?view=context'))
  await userEvent.click(screen.getByRole('button', {name: 'Configure research'}))
  expect(calls.execute).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', {name: 'Start research'}))
  await waitFor(() => expect(screen.getByTestId('research-location')).toHaveTextContent('acquisitionRunId='))
  const body = calls.execute.mock.calls[0][0].body
  expect(body).toEqual({researchConfiguration: config.data.availability.researchStart.selector, requestKey: mode === 'LIVE'
   ? config.data.availability.researchStart.requestKey : expect.any(String), expectedUpdatedAt: stamp, acquisitionProfile: 'STANDARD',
   publicResearch: mode === 'OFFLINE' ? {mode, fixture: {fixtureId: 'controlled-public-research.v1', fixtureVersion: 1, fixtureFileSha256: 'e'.repeat(64)}}
    : {mode, releaseId: config.data.availability.researchStart.requestKey},
   ...(mode === 'OFFLINE' ? {controlledReplay: {bindingId: 'local-public-research.1'}} : {})})
  expect(body).not.toHaveProperty('responseText'); expect(body).not.toHaveProperty('settings'); expect(body).not.toHaveProperty('providerFreeSearch')
  expect(calls.execute).toHaveBeenCalledOnce()
 })
 it('lets a present blocked LIVE capability suppress an otherwise eligible old fixture', async () => {
  const config = fixtureStartConfiguration()
  config.data.availability.researchStart = {contractVersion: 'public-research-start.v1', eligible: false, mode: 'LIVE', liveExecutionEnabled: false, reason: 'OPERATING_APPROVAL_NOT_RECORDED'}
  calls.configRead = {currentData: config}
  expect(readFixtureStart(config.data)).toBeNull()
  render(researchView(researchProps(), '/app/intelligence?view=context'))
  await userEvent.click(screen.getByRole('button', {name: 'Configure research'}))
  expect(screen.getByRole('button', {name: 'Start research'})).toBeDisabled()
  expect(calls.execute).not.toHaveBeenCalled()
 })
 it.each(['classification', 'live flag', 'actor', 'scope', 'basis', 'selector', 'fixture', 'binding', 'raw witness', 'request key', 'category'])(
  'refuses mismatched combined capability %s', kind => {
   const data = publicStartConfiguration().data, descriptor = data.availability.researchStart
   if (kind === 'classification') descriptor.classification = 'NATIVE_PUBLIC_RESEARCH'
   if (kind === 'live flag') descriptor.liveExecutionEnabled = true
   if (kind === 'actor') descriptor.actorUserId = 'f'.repeat(24)
   if (kind === 'scope') descriptor.scope = {...descriptor.scope, runtimeInstanceKey: 'other-revision'}
   if (kind === 'basis') descriptor.basis = {...descriptor.basis, stateVersion: 'other-basis'}
   if (kind === 'selector') descriptor.selector.configurationHash = 'sha256:' + 'f'.repeat(64)
   if (kind === 'fixture') descriptor.fixture.fixtureId = 'unregistered-fixture'
   if (kind === 'binding') descriptor.fixture.controlledBindingId = 'unknown-binding'
   if (kind === 'raw witness') descriptor.responseText = 'UNTRUSTED_RAW_BODY'
   if (kind === 'request key') descriptor.requestKey = '12345678-1234-4123-8123-123456789ac1'
   if (kind === 'category') data.configuration.settings.sources.push('NEWS')
   expect(readFixtureStart(data)).toBeNull()
   expect(buildFixtureStartPayload(data, '12345678-1234-4123-8123-123456789aba')).toBeNull()
  })
 it('never allocates a different key for an eligible LIVE release', () => {
  const data = publicStartConfiguration('LIVE').data
  expect(buildFixtureStartPayload(data, '12345678-1234-4123-8123-123456789aba')).toBeNull()
  expect(buildFixtureStartPayload(data, data.availability.researchStart.requestKey).publicResearch.releaseId).toBe(data.availability.researchStart.requestKey)
 })
 it.each(['QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED'])('reopens the original PUBLIC %s request using reads only', status => {
  const key = '12345678-1234-4123-8123-123456789aba', row = publicRunFor(key, status)
  calls.configRead = {currentData: publicStartConfiguration()}; calls.lookupRead = {currentData: researchPage(key, [row])}
  render(researchView(researchProps(), '/app/intelligence?view=context&researchRequestKey=' + key))
  expect(screen.getByText('Recorded request preview: ' + status + '. Verify its exact Run receipt below.')).toBeVisible()
  expect(calls.history.mock.calls.at(-1)[0].requestedRunId).toBe(row.runId)
  expect(calls.execute).not.toHaveBeenCalled()
 })
 it('prepares an offline failed predecessor without dispatch and links both identities on explicit new Start', async () => {
  const key = '12345678-1234-4123-8123-123456789aba', row = publicRunFor(key, 'FAILED')
  calls.configRead = {currentData: publicStartConfiguration()}
  render(researchView(researchProps(), '/app/intelligence?view=context&researchRequestKey=' + key))
  const history = calls.history.mock.calls.at(-1)[0]
  expect(history.canRetryResearch(row)).toBe(true)
  act(() => history.onRetry(row)); expect(calls.execute).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', {name: 'Configure research'})); await userEvent.click(screen.getByRole('button', {name: 'Start research'}))
  const body = calls.execute.mock.calls[0][0].body
  expect(body.requestKey).not.toBe(key)
  expect(body).toMatchObject({predecessorRunId: row.runId, predecessorExecutionAttemptId: row.executionAttemptId, publicResearch: {mode: 'OFFLINE'}})
 })
 it('requires a separate eligible LIVE identity before preparing a native predecessor retry', () => {
  const config = publicStartConfiguration('LIVE'), key = config.data.availability.researchStart.requestKey, row = publicRunFor(key, 'FAILED', 'LIVE')
  calls.configRead = {currentData: config}
  const view = render(researchView(researchProps(), '/app/intelligence?view=context&researchRequestKey=' + key))
  expect(calls.history.mock.calls.at(-1)[0].canRetryResearch(row)).toBe(false)
  config.data.availability.researchStart.requestKey = '12345678-1234-4123-8123-123456789ac2'
  calls.configRead = {currentData: structuredClone(config)}
  view.rerender(researchView(researchProps(), '/app/intelligence?view=context&researchRequestKey=' + key))
  expect(calls.history.mock.calls.at(-1)[0].canRetryResearch(row)).toBe(true)
  expect(calls.execute).not.toHaveBeenCalled()
 })
 it.each(['permission', 'configuration', 'departure', 'session'])('does not dispatch a retained PUBLIC Start after %s', async kind => {
  calls.configRead = {currentData: publicStartConfiguration()}
  const props = researchProps(), route = '/app/intelligence?view=context', view = render(researchView(props, route))
  await userEvent.click(screen.getByRole('button', {name: 'Configure research'}))
  const button = screen.getByRole('button', {name: 'Start research'}), retained = button[Object.keys(button).find(key => key.startsWith('__reactProps'))].onClick
  if (kind === 'session') act(() => clearTokens())
  else {
   if (kind === 'configuration') calls.configRead = {currentData: publicStartConfiguration()}
   view.rerender(researchView({...props, ...(kind === 'permission' ? {authority: {canAcquire: false}} : kind === 'departure' ? {active: false} : {})}, route))
  }
  act(() => retained()); expect(calls.execute).not.toHaveBeenCalled()
 })
})

it.each(['wrong actor', 'late session'])('does not select a PUBLIC Start response after %s', async kind => {
 let finish
 calls.configRead = {currentData: publicStartConfiguration()}
 calls.execute.mockImplementation(({body}) => ({unwrap: () => new Promise(resolve => { finish = () => {
  const value = publicRunFor(body.requestKey)
  if (kind === 'wrong actor') value.actorUserId = 'f'.repeat(24)
  resolve({data: {acquisitionRun: value}})
 } })}))
 render(researchView(researchProps(), '/app/intelligence?view=context'))
 await userEvent.click(screen.getByRole('button', {name: 'Configure research'})); await userEvent.click(screen.getByRole('button', {name: 'Start research'}))
 if (kind === 'late session') act(() => clearTokens())
 await act(async () => finish())
 expect(screen.getByTestId('research-location')).not.toHaveTextContent('acquisitionRunId=')
 expect(calls.execute).toHaveBeenCalledOnce()
})

it.each(['OFFLINE', 'LIVE'])('describes PUBLIC %s availability and retry without mislabelling native work as a fixture', async mode => {
 const config = publicStartConfiguration(mode), key = mode === 'LIVE' ? '12345678-1234-4123-8123-123456789aba' : '12345678-1234-4123-8123-123456789ac0'
 calls.configRead = {currentData: config}
 render(researchView(researchProps(), '/app/intelligence?view=context&researchRequestKey=' + key))
 await userEvent.click(screen.getByRole('button', {name: 'Research availability'}))
 expect(screen.getByText(mode === 'LIVE' ? /A server-issued research release is available/ : /A verified offline Public Research fixture is available/)).toBeVisible()
 expect(screen.queryByText(/A verified provider-free fixture is available/)).not.toBeInTheDocument()
 expect(screen.queryByText('Provider/registry operating approval is not recorded. No retrieval will run.')).not.toBeInTheDocument()
 expect(screen.getByText(mode === 'LIVE' ? 'The current server-issued release controls this Public Research operation.' : 'Only the registered offline Public Research fixture is available. Live research remains unavailable.')).toBeVisible()
 await userEvent.click(screen.getByRole('button', {name: 'Back to Context'}))
 await userEvent.click(screen.getByRole('button', {name: 'Runs and processing history'}))
 const row = publicRunFor(key, 'FAILED', mode)
 act(() => calls.history.mock.calls.at(-1)[0].onRetry(row))
 expect(screen.getByText(/Explicit research retry prepared for Run/)).toBeVisible()
 expect(screen.queryByText(/Fixture retry prepared locally/)).not.toBeInTheDocument()
 expect(calls.execute).not.toHaveBeenCalled()
})

describe('AM02 copy-only prompt and customer report controls', () => {
  const stageReport = async (user, name = 'unit-report.txt') => {
    await user.selectOptions(screen.getByLabelText('Document handling'), 'research')
    await user.upload(screen.getByLabelText(/Select one research report/), new File(['Invented unit-only report'], name, { type: 'text/plain' }))
    await screen.findByText(new RegExp(`${name}.*Staged locally`))
  }
  const declareRights = async user => {
    await user.type(screen.getByLabelText(/Permission or ownership reference/), 'Unit-only permission declaration')
    await user.click(screen.getByRole('checkbox', { name: /I have the right to supply this report/ }))
  }
  it.each(['absent', 'disabled'])('report intake without a saved company brief uses its own guards when generic action is %s', async kind => {
    const user = userEvent.setup(), props = base()
    const emptyInputs = { companyName: '', marketRegion: '', targetOffer: '', companyWebsite: '', websiteSources: [], notes: '' }
    props.discovery = { ...props.discovery, inputValues: emptyInputs }
    props.renderer.actions = kind === 'disabled' ? [{ actionKey: 'BUILD_EVIDENCE_PACK', enabled: false, disabledReason: 'Unit ordinary build requires a brief.' }] : []
    render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    await stageReport(user); await declareRights(user)
    expect(screen.getByRole('button', { name: 'Upload research report' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Upload research report' }))
    await waitFor(() => expect(calls.update).toHaveBeenCalledTimes(1))
    expect(calls.update.mock.calls[0][0]).toMatchObject({ customerId: props.customerId, tenantId: props.tenantId, runtimeInstanceId: props.runtimeInstanceId,
      body: { inputs: { companyName: '', marketRegion: '', targetOffer: '', companyWebsite: '', notes: '' }, acquisitionProfile: 'STANDARD' } })
    expect(calls.update.mock.calls[0][0].body.documentSources).toHaveLength(1)
    expect(calls.execute).not.toHaveBeenCalled()
  })
  it('submits one declared URL through the scoped report PATCH without a file or research action',async()=>{
    const user=userEvent.setup(),props=base()
    render(<MemoryRouter><ContextAcquisitionView {...props}/></MemoryRouter>)
    await user.selectOptions(screen.getByLabelText('Document handling'),'research')
    await user.selectOptions(screen.getByLabelText('Report delivery'),'url')
    expect(screen.queryByLabelText(/Select one research report/)).toBeNull()
    await user.type(screen.getByLabelText('Public report file URL'),'https://unit.example/report.txt')
    await declareRights(user)
    await user.click(screen.getByRole('button',{name:'Retrieve research report'}))
    await waitFor(()=>expect(calls.update).toHaveBeenCalledTimes(1))
    expect(calls.update.mock.calls[0][0]).toMatchObject({customerId:props.customerId,tenantId:props.tenantId,runtimeInstanceId:props.runtimeInstanceId,
      body:{customerReportUrl:'https://unit.example/report.txt',acquisitionProfile:'STANDARD',inputs:inputValues}})
    expect(calls.update.mock.calls[0][0].body.documentSources).toBeUndefined();expect(calls.execute).not.toHaveBeenCalled()
  })
  it('resets rights on each URL edit and clears file/declaration state when delivery changes',async()=>{
    const user=userEvent.setup()
    render(<MemoryRouter><ContextAcquisitionView {...base()}/></MemoryRouter>)
    await stageReport(user);await declareRights(user)
    await user.selectOptions(screen.getByLabelText('Report delivery'),'url')
    expect(screen.getByRole('checkbox',{name:/I have the right/})).not.toBeChecked()
    expect(screen.getByLabelText(/Permission or ownership reference/)).toHaveValue('')
    await user.type(screen.getByLabelText('Public report file URL'),'https://unit.example/report.txt');await declareRights(user)
    await user.type(screen.getByLabelText('Public report file URL'),'x')
    expect(screen.getByRole('checkbox',{name:/I have the right/})).not.toBeChecked()
    expect(screen.getByRole('button',{name:'Retrieve research report'})).toBeDisabled()
    await user.selectOptions(screen.getByLabelText('Report delivery'),'file')
    expect(screen.getByText('0 of 1 files staged')).toBeVisible();expect(calls.update).not.toHaveBeenCalled()
  })
  it.each(['url','session'])('rejects a retained URL submit after %s changes',async change=>{
    const user=userEvent.setup()
    render(<MemoryRouter><ContextAcquisitionView {...base()}/></MemoryRouter>)
    await user.selectOptions(screen.getByLabelText('Document handling'),'research');await user.selectOptions(screen.getByLabelText('Report delivery'),'url')
    await user.type(screen.getByLabelText('Public report file URL'),'https://unit.example/report.txt');await declareRights(user)
    const form=screen.getByRole('button',{name:'Retrieve research report'}).closest('form')
    const retained=form[Object.keys(form).find(key=>key.startsWith('__reactProps'))].onSubmit
    if(change==='url')await user.clear(screen.getByLabelText('Public report file URL'))
    else act(()=>clearTokens())
    await act(async()=>retained({preventDefault:vi.fn()}))
    expect(calls.update).not.toHaveBeenCalled();expect(calls.execute).not.toHaveBeenCalled()
  })
  it('previews and copies the saved brief, excluding staged edits and unavailable settings, without a mutation', async () => {
    const user = userEvent.setup(), props = base()
    render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Edit evidence gathering brief' }))
    await user.clear(screen.getByLabelText('Company name')); await user.type(screen.getByLabelText('Company name'), 'Staged unit company')
    await user.click(screen.getByRole('button', { name: 'Preview research prompt' }))
    const prompt = screen.getByLabelText('Research prompt from saved context')
    expect(prompt.value).toContain(`Company: ${inputValues.companyName}`)
    expect(prompt.value).not.toContain('Staged unit company')
    expect(prompt).toHaveAttribute('readonly')
    expect(screen.getByText(/Staged brief edits are excluded/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Copy prompt' }))
    await screen.findByText(/Prompt copied/)
    expect(await navigator.clipboard.readText()).toBe(prompt.value)
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled(); expect(calls.saveConfig).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Back to Context' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Preview research prompt' })).toHaveFocus())
  })
  it.each(['current', 'stale', 'different brief'])('includes only current saved source settings: %s', async kind => {
    const user = userEvent.setup(), fixture = configurationFixture(true)
    fixture.data.configuration.context.companyName = inputValues.companyName
    fixture.data.configuration.purpose = `Company: ${inputValues.companyName}\nMarket / region: Test market\nProduct or service: Synthetic service`
    if (kind === 'stale') { fixture.data.currency = 'STALE_BASIS'; fixture.data.configuration.basisStateVersion = 'rsv2:old' }
    if (kind === 'different brief') {
      fixture.data.configuration.context.companyName = 'Other unit company'
      fixture.data.configuration.purpose = 'Company: Other unit company\nMarket / region: Test market\nProduct or service: Synthetic service'
    }
    calls.configRead = { currentData: fixture }
    render(<MemoryRouter><ContextAcquisitionView {...base()} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Preview research prompt' }))
    const prompt = screen.getByLabelText('Research prompt from saved context').value
    expect(prompt.includes('Current saved source choices:')).toBe(kind === 'current')
    expect(prompt.includes('settings are unavailable or stale and are excluded')).toBe(kind !== 'current')
  })
  it('offers manual copy guidance after clipboard failure', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Unit clipboard unavailable'))
    render(<MemoryRouter><ContextAcquisitionView {...base()} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Preview research prompt' }))
    await user.click(screen.getByRole('button', { name: 'Copy prompt' }))
    expect(await screen.findByText(/copy it manually/)).toBeVisible()
    expect(screen.queryByText(/Prompt copied/)).not.toBeInTheDocument()
    expect(calls.update).not.toHaveBeenCalled()
  })
  it.each(['departure', 'session', 'scope', 'brief'])('ignores late clipboard completion after %s', async kind => {
    const user = userEvent.setup(), props = base(); let finish
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const view = render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Preview research prompt' }))
    await user.click(screen.getByRole('button', { name: 'Copy prompt' }))
    if (kind === 'session') act(() => clearTokens())
    else {
      const changed = kind === 'departure' ? { active: false } : kind === 'scope' ? { contextKey: 'other-unit-scope' }
        : { discovery: { ...props.discovery, inputValues: { ...inputValues, notes: 'Updated saved unit brief' } } }
      view.rerender(<MemoryRouter><ContextAcquisitionView {...props} {...changed} /></MemoryRouter>)
    }
    await act(async () => finish())
    expect(screen.queryByText(/Prompt copied/)).not.toBeInTheDocument()
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled()
  })
  it('uses the existing scoped PATCH for one declared report, even when a generic action is enabled', async () => {
    const user = userEvent.setup(), props = base()
    props.renderer.actions = [{ actionKey: 'BUILD_EVIDENCE_PACK', enabled: true }]
    render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    await stageReport(user)
    expect(screen.getByRole('button', { name: 'Upload research report' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Website address' })).toBeDisabled()
    await declareRights(user)
    expect(calls.update).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Upload research report' }))
    await waitFor(() => expect(calls.update).toHaveBeenCalledTimes(1))
    const request = calls.update.mock.calls[0][0]
    expect(request.sessionRevision).toBe(getSessionRevision())
    expect(request).toMatchObject({ runtimeInstanceId: props.runtimeInstanceId, customerId: props.customerId, tenantId: props.tenantId,
      body: { inputs: inputValues, acquisitionProfile: 'STANDARD', expectedUpdatedAt: stamp,
        customerSuppliedResearch: readCustomerResearchDeclaration({ ...emptyCustomerResearchFields(), rightsConfirmed: true,
          rightsReference: 'Unit-only permission declaration' }).declaration } })
    expect(request.body.documentSources).toHaveLength(1)
    expect(request.body).not.toHaveProperty('publicResearch')
    expect(request.body.customerSuppliedResearch).not.toHaveProperty('suppliedBy')
    expect(calls.execute).not.toHaveBeenCalled()
    await screen.findByText(/0 of 1 files staged/)
    expect(screen.getByRole('checkbox', { name: /I have the right/ })).not.toBeChecked()
  })
  it('clears files and declarations on mode changes and keeps ordinary extraction as the default', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><ContextAcquisitionView {...base()} /></MemoryRouter>)
    expect(screen.getByLabelText('Document handling')).toHaveValue('extract')
    await stageReport(user); await declareRights(user)
    await user.selectOptions(screen.getByLabelText('Document handling'), 'extract')
    expect(screen.getByText(/0 of 5 files staged/)).toBeVisible()
    expect(screen.getByLabelText(/Select documents/)).toHaveAttribute('multiple')
    await user.selectOptions(screen.getByLabelText('Document handling'), 'research')
    expect(screen.getByLabelText(/Permission or ownership reference/)).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: /I have the right/ })).not.toBeChecked()
    expect(screen.getByLabelText(/Select one research report/)).not.toHaveAttribute('multiple')
    expect(screen.getByRole('button', { name: 'Upload research report' })).toBeDisabled()
  })
  it.each(['rights', 'reference', 'profile', 'scope', 'brief', 'stale', 'authority', 'locked'])('keeps report upload blocked for %s', async kind => {
    const user = userEvent.setup(), props = base()
    const view = render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    if (kind === 'brief') {
      await user.click(screen.getByRole('button', { name: 'Edit evidence gathering brief' }))
      await user.type(screen.getByLabelText('Company name'), ' changed')
      await user.click(screen.getByRole('button', { name: 'Apply brief' }))
    }
    await stageReport(user); await declareRights(user)
    if (kind === 'rights') await user.click(screen.getByRole('checkbox', { name: /I have the right/ }))
    if (kind === 'reference') await user.clear(screen.getByLabelText(/Permission or ownership reference/))
    if (kind === 'profile') props.discovery = { ...props.discovery, acquisitionProfile: 'ENHANCED' }
    if (kind === 'scope') props.customerId = ''
    if (kind === 'stale') props.renderer = { ...props.renderer, runtimeInstance: { ...props.renderer.runtimeInstance, updatedAt: '2026-10-04T11:00:00.000Z' } }
    if (kind === 'authority') props.authority = { canAcquire: false }
    if (kind === 'locked') props.locked = true
    if (kind === 'profile') {
      // The local profile is intentionally held with staged input. Mount the
      // enhanced saved profile as its own ownership frame instead.
      props.contextKey = 'unit-enhanced-scope'
    }
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    if (kind === 'profile' || kind === 'scope') { await stageReport(user); await declareRights(user) }
    expect(screen.getByRole('button', { name: kind === 'locked' ? 'Acquire new evidence' : 'Upload research report' })).toBeDisabled()
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled()
  })
  it('preserves an unconfirmed report request and never automatically resubmits it', async () => {
    const user = userEvent.setup()
    calls.update.mockReturnValue({ unwrap: () => Promise.reject({ data: { message: 'Unit upload outcome unconfirmed' } }) })
    render(<MemoryRouter><ContextAcquisitionView {...base()} /></MemoryRouter>)
    await stageReport(user); await declareRights(user)
    await user.click(screen.getByRole('button', { name: 'Upload research report' }))
    expect(await screen.findByText(/Execution outcome is unconfirmed/)).toBeVisible()
    expect(calls.update).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/unit-report.txt.*Staged locally/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Upload research report' })).toBeDisabled()
    const original = calls.update.mock.calls[0][0]
    await user.click(screen.getByRole('button', { name: 'Check original acquisition request' }))
    await waitFor(() => expect(calls.update).toHaveBeenCalledTimes(2))
    expect(calls.update.mock.calls[1][0]).toEqual(original)
  })
  it.each(['authority', 'loading', 'brief'])('rejects a retained Copy handler after current %s changes', async kind => {
    const user = userEvent.setup(), props = base()
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    const view = render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Preview research prompt' }))
    const button = screen.getByRole('button', { name: 'Copy prompt' })
    const retained = button[Object.keys(button).find(key => key.startsWith('__reactProps'))].onClick
    const change = kind === 'authority' ? { authority: { canAcquire: false } } : kind === 'loading' ? { loading: true }
      : { discovery: { ...props.discovery, inputValues: { ...inputValues, notes: 'Different saved unit brief' } } }
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} {...change} /></MemoryRouter>)
    await act(async () => retained({ preventDefault: vi.fn() }))
    expect(write).not.toHaveBeenCalled()
    expect(calls.update).not.toHaveBeenCalled(); expect(calls.execute).not.toHaveBeenCalled()
  })
  it.each(['rights', 'mode', 'authority'])('rejects a retained report submit handler after %s changes', async kind => {
    const user = userEvent.setup(), props = base()
    const view = render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
    await stageReport(user); await declareRights(user)
    const form = screen.getByRole('button', { name: 'Upload research report' }).closest('form')
    const retained = form[Object.keys(form).find(key => key.startsWith('__reactProps'))].onSubmit
    if (kind === 'rights') await user.click(screen.getByRole('checkbox', { name: /I have the right/ }))
    if (kind === 'mode') await user.selectOptions(screen.getByLabelText('Document handling'), 'extract')
    if (kind === 'authority') view.rerender(<MemoryRouter><ContextAcquisitionView {...props} authority={{ canAcquire: false }} /></MemoryRouter>)
    await act(async () => retained({ preventDefault: vi.fn() }))
    expect(calls.update).not.toHaveBeenCalled(); expect(calls.execute).not.toHaveBeenCalled()
  })
})
