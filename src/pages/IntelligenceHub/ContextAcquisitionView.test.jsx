import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearTokens, setTokens } from '../../utils/tokenStorage.js'
import ContextAcquisitionView from './ContextAcquisitionView.jsx'
const calls = vi.hoisted(() => ({ execute: vi.fn(), update: vi.fn() }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({ useExecuteRuntimeActionMutation: () => [calls.execute], useUpdateRuntimeDiscoveryInputsMutation: () => [calls.update] }))
vi.mock('./AcquisitionRunHistory.jsx', () => ({ default: () => <p>Run history test boundary</p> }))
const stamp = '2026-10-04T10:00:00.000Z'
const inputValues = { companyName: 'Controlled fixture', marketRegion: 'Test market', targetOffer: 'Synthetic service', companyWebsite: 'https://example.org', websiteSources: ['https://example.org'], notes: '' }
const base = () => ({ discovery: { inputValues, acquisitionProfile: 'STANDARD', evidenceReady: false }, renderer: { runtimeInstance: { updatedAt: stamp }, actions: [] }, authority: { canAcquire: true, runtimeUpdatedAt: stamp }, runtimeInstanceId: 'revision-1', customerId: 'customer-1', tenantId: 'tenant-1', contextKey: 'scope-1', workbenchHref: '/app/runtime', refresh: vi.fn().mockResolvedValue(true), onSelectView: vi.fn(), evidenceStatusCounts: {} })
const mount = props => render(<MemoryRouter><ContextAcquisitionView {...props} /></MemoryRouter>)
const receiptFor = (requestKey, overrides = {}) => ({ contractVersion: 'acquisition-run.v1', runId: '12345678-1234-4123-8123-123456789abc', requestKey,
  scope: { runtimeInstanceKey: 'revision-1', customerId: 'customer-1', tenantId: 'tenant-1' }, status: 'SUCCEEDED', canonicalSaved: true,
  basisStateVersion: 'rsv2:basis', outputStateVersion: 'rsv2:recorded', outcomes: [{ kind: 'BRIEF', inputIndex: 0, status: 'SUCCEEDED', evidenceObjectCount: 0 }],
  audit: { admissionId: 'audit-a', startId: 'audit-b', terminalId: 'audit-c',
    ...(overrides.canonicalSaved !== false ? { saveId: 'audit-save' } : {}) }, ...overrides })
beforeEach(() => { vi.restoreAllMocks(); calls.execute.mockReset(); calls.update.mockReset();
  const respond = args => ({ unwrap: () => Promise.resolve({ acquisitionRun: receiptFor(args.body.requestKey) }) })
  calls.execute.mockImplementation(respond); calls.update.mockImplementation(respond)
})
describe('Context governed acquisition', () => {
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
      await userEvent.click(screen.getByRole('button', { name: 'Build evidence' }))
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
    await userEvent.click(screen.getByRole('button', { name: 'Build evidence' }))
    const original = calls.update.mock.calls[0][0]
    act(() => clearTokens())
    expect(screen.queryByText(/old-session.txt.*Staged locally/)).not.toBeInTheDocument()
    await userEvent.upload(screen.getByLabelText(/Select documents/), new File(['new'], 'new-session.txt', { type: 'text/plain' }))
    await act(async () => result === 'success' ? finish({ acquisitionRun: receiptFor(original.body.requestKey) }) : reject({ data: { message: 'SESSION_CHANGED' } }))
    expect(screen.getByText(/new-session.txt.*Staged locally/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Check original acquisition request' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Build evidence' })).toBeEnabled()
    expect(props.refresh).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).not.toHaveTextContent('SESSION_CHANGED')
    expect(screen.getByRole('status')).not.toHaveTextContent('Revision saved')
  })
  it('keeps uncertain request identity during ordinary token renewal and allows locked original checks', async () => {
    const props = base()
    calls.update.mockReturnValueOnce({ unwrap: () => Promise.reject({ status: 'FETCH_ERROR' }) })
    const view = mount(props)
    await userEvent.click(screen.getByRole('button', { name: 'Build evidence' }))
    const original = calls.update.mock.calls[0][0]
    act(() => setTokens({ accessToken: null, refreshToken: null }, { preserveSession: true }))
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} locked authority={{ canAcquire: false }} /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Build evidence' })).toBeDisabled()
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
    mount(base()); await userEvent.click(screen.getByRole('button', { name: 'Build evidence' }))
    await screen.findByText(/Next acquisition explicitly retries Run/)
    const first = calls.update.mock.calls[0][0]
    await userEvent.click(screen.getByRole('button', { name: 'Refresh acquisition data' }))
    await userEvent.click(screen.getByRole('button', { name: 'Build evidence' }))
    expect(calls.update.mock.calls[1][0].body).toMatchObject({ predecessorRunId: '12345678-1234-4123-8123-123456789abc' })
    expect(calls.update.mock.calls[1][0].body.requestKey).not.toBe(first.body.requestKey)
  })
  it.each(['wrong-request', 'wrong-scope', 'missing-receipt'])('keeps acquisition blocked on a %s response without claiming a saved revision', async kind => {
    calls.update.mockImplementationOnce(args => ({ unwrap: () => Promise.resolve(kind === 'missing-receipt' ? {} : { acquisitionRun:
      receiptFor(kind === 'wrong-request' ? '12345678-1234-4123-8123-123456789abd' : args.body.requestKey,
        kind === 'wrong-scope' ? { scope: { runtimeInstanceKey: 'revision-other', customerId: 'customer-1', tenantId: 'tenant-1' } } : {}) }) }))
    const props = base(); mount(props); await userEvent.click(screen.getByRole('button', { name: 'Build evidence' }))
    await screen.findByText(/no verified scoped terminal receipt/)
    expect(screen.getByRole('button', { name: 'Build evidence' })).toBeDisabled()
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
    await userEvent.click(screen.getByRole('button', { name: 'Build evidence' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Website extraction: 1 succeeded · 0 failed.'))
    expect(screen.getByRole('status')).toHaveTextContent('These extraction results were not saved to this revision.')
    expect(screen.getByRole('status')).toHaveTextContent('continuity-request')
    expect(screen.getByRole('button', { name: 'Build evidence' })).toBeDisabled()
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
    expect(screen.getByRole('button', { name: 'Build evidence' })).toBeVisible()
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
    await userEvent.click(screen.getByRole('button', { name: 'Build evidence' }))
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
    await userEvent.click(screen.getByRole('button', { name: 'Build evidence' }))
    expect(calls.execute).toHaveBeenCalledWith(expect.objectContaining({ runtimeInstanceId: 'revision-1', customerId: 'customer-1', tenantId: 'tenant-1', actionKey: 'BUILD_EVIDENCE_PACK', body: expect.objectContaining({ expectedUpdatedAt: stamp, inputs: expect.objectContaining({ companyName: 'Changed company', websiteSources: ['https://example.org', 'https://example.com'] }), documentSources: [expect.objectContaining({ fileName: 'controlled.txt', assetType: 'CUSTOMER_DOCUMENT', contentBase64: expect.stringContaining('data:text/plain;base64,') })] }) }))
    expect(calls.update).not.toHaveBeenCalled()
  })
  it.each([{ locked: true }, { authority: null }, { loading: true }, { discovery: { evidenceReady: false } }])('fails closed for unavailable or locked input/authority %j', async overrides => {
    mount({ ...base(), ...overrides })
    expect(screen.getByRole('button', { name: 'Build evidence' })).toBeDisabled()
    if (screen.queryByLabelText('Company name')) expect(screen.getByLabelText('Company name')).toBeDisabled()
    expect(calls.update).not.toHaveBeenCalled()
  })
  it('does not fall back around a disabled projected action', () => {
    const props=base(); props.renderer.actions=[{ actionKey:'BUILD_EVIDENCE_PACK', enabled:false, disabledReason:'A governed dependency is unavailable.' }, { actionKey:'SAVE_DISCOVERY_INPUTS', enabled:true }]
    mount(props); expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled(); expect(screen.getByRole('status')).toHaveTextContent('A governed dependency is unavailable.')
  })
  it('requires complete brief and limits website controls to ten URLs', async () => {
    const props=base(); props.discovery.inputValues={ ...inputValues, companyName:'' }; mount(props)
    expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled()
    for(let i=0;i<9;i++) await userEvent.click(screen.getByRole('button',{name:'Add URL'}))
    expect(screen.getByRole('button',{name:'Add URL'})).toBeDisabled()
  })
  it('blocks file count and format/size errors without sending a request', async () => {
    mount(base())
    await userEvent.upload(screen.getByLabelText(/Select documents/), Array.from({length:6}, (_,i)=>new File(['text'],`${i}.txt`,{type:'text/plain'})))
    expect(await screen.findByRole('alert')).toHaveTextContent('up to 5')
    expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled()
    await userEvent.click(screen.getByRole('button',{name:'Clear selected files'}))
    const file=new File(['text'],'oversize.txt',{type:'text/plain'}); Object.defineProperty(file,'size',{value:2500001})
    await userEvent.upload(screen.getByLabelText(/Select documents/),file)
    expect(await screen.findByRole('alert')).toHaveTextContent('size limit')
    expect(calls.update).not.toHaveBeenCalled()
  })
  it('prevents overlap and late preparation from submitting after unmount', async () => {
    let finish; const read=vi.spyOn(FileReader.prototype,'readAsDataURL').mockImplementation(function(){ finish=()=>{Object.defineProperty(this,'result',{value:'data:text/plain;base64,dGVzdA=='});this.onload()} })
    const view=mount(base());await userEvent.upload(screen.getByLabelText(/Select documents/),new File(['test'],'slow.txt',{type:'text/plain'}))
    expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled()
    view.unmount(); await act(async()=>finish()); expect(calls.update).not.toHaveBeenCalled();read.mockRestore()
  })
  it('preserves staged files on response failure and checks the same request after refresh', async () => {
    calls.update.mockReturnValueOnce({unwrap:()=>Promise.reject({data:{message:'Controlled service failure'}})})
    const props=base();mount(props)
    await userEvent.upload(screen.getByLabelText(/Select documents/),new File(['test'],'retry.txt',{type:'text/plain'}));await screen.findByText(/retry.txt.*Staged locally/)
    await userEvent.click(screen.getByRole('button',{name:'Build evidence'}))
    expect(await screen.findByText(/selected documents remain staged locally/)).toBeVisible()
    expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled()
    expect(screen.getByText(/retry.txt.*Staged locally/)).toBeVisible()
    await userEvent.click(screen.getByRole('button',{name:'Refresh acquisition data'}))
    expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled()
    const original = calls.update.mock.calls[0][0]
    await userEvent.click(screen.getByRole('button',{name:'Check original acquisition request'}))
    await waitFor(()=>expect(screen.getByRole('button',{name:'Build evidence'})).toBeEnabled())
    expect(calls.update).toHaveBeenCalledTimes(2); expect(calls.update.mock.calls[1][0]).toEqual(original)
  })
  it('blocks stale local changes until explicit discard loads the new basis', async () => {
    const props=base();const view=mount(props);await userEvent.type(screen.getByLabelText('Company name'),' change')
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} renderer={{...props.renderer,runtimeInstance:{updatedAt:'2026-10-04T11:00:00.000Z'}}} /></MemoryRouter>)
    expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled();expect(screen.getByRole('status')).toHaveTextContent('revision changed')
    await userEvent.click(screen.getByRole('button',{name:'Discard local changes'}));expect(screen.getByLabelText('Company name')).toHaveValue('Controlled fixture')
  })
  it('keeps selected file unavailable when inputValues disappears', async () => {
    const props=base();const view=mount(props)
    await userEvent.upload(screen.getByLabelText(/Select documents/),new File(['test'],'staged.txt',{type:'text/plain'}));await screen.findByText(/staged.txt.*Staged locally/)
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} discovery={{...props.discovery,inputValues:null}} /></MemoryRouter>)
    expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled();expect(screen.queryByLabelText('Company name')).not.toBeInTheDocument();expect(calls.update).not.toHaveBeenCalled()
  })
  it('focuses persistent status and ignores completion after unmount without refreshing another Context', async () => {
    let finish;calls.update.mockReturnValueOnce({unwrap:()=>new Promise(resolve=>{finish=resolve})})
    const props=base();const view=mount(props);await userEvent.click(screen.getByRole('button',{name:'Build evidence'}))
    expect(screen.getByRole('status')).toHaveFocus();expect(screen.getByRole('button',{name:'Acquiring…'})).toBeDisabled()
    view.unmount();await act(async()=>finish({}));expect(props.refresh).not.toHaveBeenCalled();expect(calls.update).toHaveBeenCalledOnce()
  })
  it('preserves failed request blocker, edited brief and staged files through inactive tab roundtrip', async () => {
    calls.update.mockReturnValueOnce({unwrap:()=>Promise.reject({data:{message:'Controlled failure'}})})
    const props=base();const view=mount(props);await userEvent.type(screen.getByLabelText('Company name'),' local')
    await userEvent.upload(screen.getByLabelText(/Select documents/),new File(['test'],'kept.txt',{type:'text/plain'}));await screen.findByText(/kept.txt.*Staged locally/)
    await userEvent.click(screen.getByRole('button',{name:'Build evidence'}));await screen.findByText(/selected documents remain staged locally/)
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active={false} /></MemoryRouter>);view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active /></MemoryRouter>)
    expect(screen.getByLabelText('Company name')).toHaveValue('Controlled fixture local');expect(screen.getByText(/kept.txt.*Staged locally/)).toBeVisible();expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled()
  })
  it('invalidates pending preparation when a tab leaves and returns before FileReader completes', async () => {
    let finish;vi.spyOn(FileReader.prototype,'readAsDataURL').mockImplementation(function(){finish=()=>{Object.defineProperty(this,'result',{value:'data:text/plain;base64,dGVzdA=='});this.onload()}})
    const props=base();const view=mount(props);await userEvent.upload(screen.getByLabelText(/Select documents/),new File(['test'],'late.txt',{type:'text/plain'}))
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active={false} /></MemoryRouter>);view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active /></MemoryRouter>)
    await act(async()=>finish());expect(screen.queryByText(/late.txt.*Staged locally/)).not.toBeInTheDocument();expect(screen.getByRole('alert')).toHaveTextContent('cancelled');expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled()
  })
  it.each([false,true])('requires explicit refresh after pending mutation completes following tab roundtrip (return before settle %s)', async returnFirst => {
    let finish;calls.update.mockReturnValueOnce({unwrap:()=>new Promise(resolve=>{finish=resolve})})
    const props=base();const view=mount(props);await userEvent.click(screen.getByRole('button',{name:'Build evidence'}))
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active={false} /></MemoryRouter>)
    if(returnFirst)view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active /></MemoryRouter>)
    await act(async()=>finish({}));if(!returnFirst)view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active /></MemoryRouter>)
    expect(props.refresh).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled();expect(screen.getByRole('button',{name:'Refresh acquisition data'})).toBeEnabled()
    await userEvent.click(screen.getByRole('button',{name:'Refresh acquisition data'}));expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled()
    const original = calls.update.mock.calls[0][0]
    await userEvent.click(screen.getByRole('button',{name:'Check original acquisition request'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Build evidence'})).toBeEnabled())
    expect(calls.update.mock.calls[1][0]).toEqual(original)
  })
  it('does not unlock from a recovery refresh that left and returned before completion', async () => {
    calls.update.mockReturnValueOnce({unwrap:()=>Promise.reject({data:{message:'Controlled failure'}})})
    let finish;const props=base();props.refresh.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
    const view=mount(props);await userEvent.click(screen.getByRole('button',{name:'Build evidence'}));await screen.findByText(/selected documents remain staged locally/)
    await userEvent.click(screen.getByRole('button',{name:'Refresh acquisition data'}))
    view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active={false} /></MemoryRouter>);view.rerender(<MemoryRouter><ContextAcquisitionView {...props} active /></MemoryRouter>)
    await act(async()=>finish(true));expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled();expect(screen.getByRole('status')).toHaveTextContent('Context changed while refreshing');expect(screen.getByRole('button',{name:'Refresh acquisition data'})).toBeEnabled()
  })
  it('reports persisted acquisition separately when reads fail and never silently retries', async () => {
    const props=base();props.refresh.mockResolvedValue(false);mount(props);await userEvent.click(screen.getByRole('button',{name:'Build evidence'}))
    expect(await screen.findByText(/Acquisition recorded, but current reads/)).toBeVisible();expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled();expect(calls.update).toHaveBeenCalledOnce()
  })
})
