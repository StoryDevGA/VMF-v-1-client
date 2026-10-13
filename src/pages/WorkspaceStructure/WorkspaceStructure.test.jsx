import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ScopedStructure } from './WorkspaceStructure.jsx'
import { readUnderstandingCatalogue, readUnderstandingBasis, understandingLineageHref } from './understandingModel.js'
import { readGraphInspection } from '../IntelligenceHub/intelligenceGraphModel.js'
import { clearTokens, getSessionRevision } from '../../utils/tokenStorage.js'

const calls = vi.hoisted(() => ({ execute: vi.fn(), accept: vi.fn(), mutate: vi.fn(), upload: vi.fn(), review: vi.fn(), renderer: vi.fn(), bootstrap: vi.fn(), section: vi.fn() }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetRuntimeRendererQuery: (...args) => calls.renderer(...args),
  useGetRuntimeStateBootstrapQuery: (...args) => calls.bootstrap(...args),
  useGetRuntimeStateSectionSummaryQuery: (...args) => calls.section(...args),
  useExecuteRuntimeActionMutation: () => [calls.execute], useAcceptRuntimeSectionMutation: () => [calls.accept], useMutateRuntimeStateMutation: () => [calls.mutate],
  useUpdateRuntimeSectionEvidenceMutation: () => [calls.upload],
  useReviewRuntimeSectionEvidenceMutation: () => [calls.review],
  useReviewRuntimeDiscoveryEvidenceMutation: () => [vi.fn()], useReviewRuntimeDiscoveryContradictionMutation: () => [vi.fn()],
}))
const confirmations = vi.hoisted(() => ({ current: null }))
vi.mock('../../components/ConfirmationDialog', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, ConfirmationDialog: props => {
    if (props.open) confirmations.current = props.onConfirm
    return <actual.ConfirmationDialog {...props} />
  } }
})
const scope = { workspaceId: 'root-1', runtimeInstanceId: 'revision-1', customerId: 'customer-1', tenantId: 'tenant-1' }
const stamp = '2026-10-10T17:40:06.266Z'
const generated = () => ({ content: 'Synthetic fixture understanding only.', generatedAt: stamp, inputHash: 'input-1', truthEligibility: { eligible: true } })
function fixture(version = 'v1', updatedAt = stamp) {
  const control = { id: 'id-1', runtimeInstanceKey: scope.runtimeInstanceId, customerId: scope.customerId, tenantId: scope.tenantId,
    packageId: 'pack-id', packageKey: 'pack-1', packageVersion: '3.2.0', stateVersion: version, updatedAt }
  const section = { sectionKey: 'customer-context', runtimePath: 'framework_state.sections.customer_context', label: 'Customer Context',
    control: 'TEXTAREA', dataType: 'STRING', allowedOperations: ['READ', 'WRITE'],
    visible: true, editable: true, generationEligibility: { canGenerate: true } }
  const renderer = { runtimeInstance: control, sectionStateSource: 'runtime_state_v2', package: { packageName: 'Fixture package', frameworkVersion: '3.2.0' },
    revision: { rootRuntimeInstanceKey: scope.workspaceId, revisionNumber: 1, lineage: [{ relationship: 'CURRENT', runtimeInstanceKey: scope.runtimeInstanceId }] },
    lock: { state: 'UNLOCKED' }, lifecycle: { stage: 'DRAFT' }, discovery: { accepted: true }, sections: [section],
    actions: ['GENERATE_SECTION', 'REGENERATE_SECTION'].map(actionKey => ({ actionKey, governedAction: actionKey, enabled: true })) }
  const native = { sectionKey: 'customer_context', stateVersion: version, sourceStateVersion: version,
    projectionReceipt: { receiptHash: '', sourceStateVersion: '' },
    sectionDetail: { generated: null, accepted: null, additionalEvidence: { documents: [] }, evidenceObjects: [], state: { status: 'DRAFT' }, review: {}, revisions: [], lineage: { sectionKey: section.sectionKey, runtimePath: section.runtimePath } } }
  return { renderer, bootstrap: { control, sections: [native] }, detail: { control, section: native } }
}
const catalogue = f => readUnderstandingCatalogue(f.renderer, f.bootstrap, scope)
const basis = f => readUnderstandingBasis(catalogue(f), f.detail, 'customer-context', true)
const mount = (f, overrides = {}) => {
  calls.renderer.mockReturnValue({ data: f.renderer, refetch: vi.fn().mockResolvedValue({ data: f.renderer }) })
  calls.bootstrap.mockReturnValue({ data: f.bootstrap, refetch: vi.fn().mockResolvedValue({ data: f.bootstrap }) })
  calls.section.mockReturnValue({ data: f.detail, refetch: vi.fn().mockResolvedValue({ data: f.detail }) })
  return render(<MemoryRouter><ScopedStructure scope={scope} session={getSessionRevision()} canUpdate search={new URLSearchParams('sectionView=understanding')} setSearch={vi.fn()} {...overrides} /></MemoryRouter>)
}
beforeEach(() => {
  vi.clearAllMocks(); calls.execute.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) })); calls.accept.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
})

describe('Modern individual section evidence review', () => {
  const evidenceFixture = () => {
    const f = fixture(), section = f.renderer.sections[0]
    f.detail.section.sectionDetail.additionalEvidence.documents = [{ sectionDocumentId: 'doc1', sourceId: 'doc1', fileName: 'fixture.txt' }]
    f.detail.section.sectionDetail.evidenceObjects = [{ evidenceObjectId: 'e1', sourceId: 'doc1', extractedFact: 'Synthetic test objective only.', reviewStatus: 'PENDING', sectionKey: section.sectionKey, runtimePath: section.runtimePath }]
    return f
  }
  const review = (f = evidenceFixture(), overrides = {}) => mount(f, { search: new URLSearchParams('sectionView=review'), ...overrides })
  it('shows exact fact and source, requires confirmation and blocks after failure without retry', async () => {
    review(); expect(screen.getByText('Synthetic test objective only.')).toBeInTheDocument(); expect(screen.getByText('Source: fixture.txt')).toBeInTheDocument()
    calls.review.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { message: 'Changed basis' } }) })
    await userEvent.click(screen.getByRole('button', { name: 'Accept evidence', exact: true })); expect(calls.review).not.toHaveBeenCalled()
    expect(screen.getByText(/Accept this extracted fact: Synthetic test objective only/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm evidence decision' }))
    await screen.findByText(/Refresh and inspect before another command/)
    expect(calls.review).toHaveBeenCalledTimes(1)
    expect(calls.review.mock.calls[0][0]).toEqual({ runtimeInstanceId: scope.runtimeInstanceId, evidenceObjectId: 'e1', body: { sectionKey: 'customer-context', runtimePath: 'framework_state.sections.customer_context', expectedUpdatedAt: stamp, reviewStatus: 'ACCEPTED' } })
    expect(screen.getByRole('button', { name: 'Reject evidence', exact: true })).toBeDisabled()
  })
  it.each(['locked', 'unauthorized', 'foreign', 'missing-source', 'duplicate'])('blocks %s evidence commands', key => {
    const f = evidenceFixture(), row = f.detail.section.sectionDetail.evidenceObjects[0]
    if (key === 'locked') f.renderer.lock.state = 'LOCKED'
    if (key === 'foreign') row.sectionKey = 'foreign'
    if (key === 'missing-source') row.sourceId = 'missing'
    if (key === 'duplicate') f.detail.section.sectionDetail.evidenceObjects.push({ ...row })
    review(f, key === 'unauthorized' ? { canUpdate: false } : {})
    for (const button of screen.getAllByRole('button', { name: 'Accept evidence', exact: true })) expect(button).toBeDisabled()
  })
  it('rejects transport-only success and guards confirmation after session expiry', async () => {
    review(); calls.review.mockReturnValue({ unwrap: () => Promise.resolve({}) })
    await userEvent.click(screen.getByRole('button', { name: 'Reject evidence', exact: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm evidence decision' }))
    await screen.findByText(/current result could not be verified/)
    expect(screen.getByRole('button', { name: 'Accept evidence', exact: true })).toBeDisabled()
  })
  it('does not submit an expired-session confirmation', async () => {
    review(); await userEvent.click(screen.getByRole('button', { name: 'Accept evidence', exact: true }))
    act(() => clearTokens())
    await userEvent.click(screen.getByRole('button', { name: 'Confirm evidence decision' }))
    expect(calls.review).not.toHaveBeenCalled()
  })
  it('verifies a fresh exact decision while preserving section content', async () => {
    const f = evidenceFixture(); review(f)
    const next = structuredClone(f), time = '2026-10-11T17:00:00Z'
    Object.assign(next.renderer.runtimeInstance, { stateVersion: 'v2', updatedAt: time })
    Object.assign(next.detail.control, { stateVersion: 'v2', updatedAt: time })
    Object.assign(next.detail.section, { stateVersion: 'v2', sourceStateVersion: 'v2' })
    Object.assign(next.detail.section.sectionDetail.evidenceObjects[0], { reviewStatus: 'REJECTED', lastReviewedBy: 'actor', lastReviewedAt: time, rejectedBy: 'actor', rejectionTimestamp: time, acceptedBy: '', acceptanceTimestamp: '' })
    const receipt = { ...next.detail.section.sectionDetail.evidenceObjects[0], snippet: 'Synthetic test objective only.', sourceType: 'SECTION_UPLOADED_DOCUMENT', category: 'Section Evidence', coverageArea: 'Section Evidence', sourceFileName: '', createdAt: '' }; delete receipt.extractedFact; delete receipt.lastReviewedAt; delete receipt.lastReviewedBy
    calls.review.mockReturnValue({ unwrap: () => Promise.resolve({ data: { runtimeInstance: next.renderer.runtimeInstance, section: { ...f.renderer.sections[0], sectionEvidence: { evidenceObjects: [receipt] } } } }) })
    calls.renderer().refetch.mockResolvedValue({ data: next.renderer }); calls.bootstrap().refetch.mockResolvedValue({ data: next.bootstrap }); calls.section().refetch.mockResolvedValue({ data: next.detail })
    await userEvent.click(screen.getByRole('button', { name: 'Reject evidence', exact: true })); await userEvent.click(screen.getByRole('button', { name: 'Confirm evidence decision' }))
    await screen.findByText(/Section evidence decision verified/)
  })
})

describe('Modern section supporting files', () => {
  const file = (name = 'fixture.txt', text = 'Synthetic section evidence only') => new File([text], name, { type: 'text/plain' })
  const context = (f = fixture(), overrides = {}) => mount(f, { search: new URLSearchParams('sectionView=context'), ...overrides })
  const choose = async (files) => { fireEvent.change(screen.getByLabelText(/^Supporting files/), { target: { files } }); await screen.findByText(/files staged locally/); await vi.waitFor(() => expect(screen.getByLabelText(/^Supporting files/)).not.toBeDisabled()) }
  it('appends distinct selections, ignores duplicate bytes and removes only staged files', async () => {
    context(); await choose([file()]); await choose([file(), file('second.txt')])
    expect(screen.getByText(/^2 of 5/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate section' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /^Remove staged supporting file 1/ }))
    expect(screen.getByText(/^1 of 5/)).toBeInTheDocument(); expect(calls.upload).not.toHaveBeenCalled()
  })
  it('retains prior valid selection when a later batch is invalid or exceeds five', async () => {
    context(); await choose([file()]); await choose([new File(['no'], 'bad.exe', { type: 'application/octet-stream' })])
    expect(screen.getByRole('alert')).toHaveTextContent('not a supported')
    await choose(Array.from({ length: 5 }, (_, i) => file(`${i}.txt`)))
    expect(screen.getByRole('alert')).toHaveTextContent('up to five')
    expect(screen.getByText(/^1 of 5/)).toBeInTheDocument()
  })
  it.each([ { canUpdate: false }, { locked: true } ])('disables locked or unauthorized intake %j', overrides => {
    const f = fixture(); if (overrides.locked) f.renderer.lock.state = 'LOCKED'
    context(f, overrides.canUpdate === false ? { canUpdate: false } : {})
    expect(screen.getByLabelText(/^Supporting files/)).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Extract supporting files' })).toBeDisabled()
  })
  it('requires explicit confirmation and retains files after failed extraction without retry', async () => {
    context(); await choose([file()]); calls.upload.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { message: 'Changed basis' } }) })
    await userEvent.click(screen.getByRole('button', { name: 'Extract supporting files' }))
    expect(calls.upload).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm extraction' }))
    await screen.findByText(/Refresh and inspect before another command/)
    expect(calls.upload).toHaveBeenCalledTimes(1)
    expect(calls.upload.mock.calls[0][0]).toMatchObject({ runtimeInstanceId: scope.runtimeInstanceId, body: { sectionKey: 'customer-context', runtimePath: 'framework_state.sections.customer_context', expectedUpdatedAt: stamp, documentSources: [{ assetType: 'SECTION_SUPPORTING_FILE', fileName: 'fixture.txt' }] } })
    expect(screen.getByText(/^1 of 5/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Extract supporting files' })).toBeDisabled()
  })
  it('staged files participate in dirty navigation and discard confirmation', async () => {
    const f = fixture(); const other = { ...f.renderer.sections[0], sectionKey: 'other', runtimePath: 'framework_state.sections.other', label: 'Other' }
    f.renderer.sections.push(other); f.bootstrap.sections.push({ ...f.bootstrap.sections[0], sectionKey: 'other' })
    const navigate = vi.fn(); context(f, { setSearch: navigate }); await choose([file()])
    await userEvent.click(screen.getByRole('button', { name: 'Other · Optional' }))
    expect(screen.getByText(/unsaved context and staged files/)).toBeInTheDocument(); expect(navigate).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' })); expect(screen.getByText(/^1 of 5/)).toBeInTheDocument()
  })
  it('reports success only after exact fresh native receipts and pending evidence, then clears the batch', async () => {
    const f = fixture(); context(f); await choose([file()])
    const after = fixture('v2', '2026-10-11T17:00:00Z')
    const doc = { sectionDocumentId: 'doc1', sourceId: 'doc1', fileName: 'fixture.txt', sizeBytes: file().size, mimeType: 'text/plain', status: 'PROCESSED', uploadedAt: '2026-10-11T17:00:00Z', uploadedBy: 'actor1' }
    after.detail.section.sectionDetail.additionalEvidence.documents = [doc]
    after.detail.section.sectionDetail.evidenceObjects = [{ evidenceObjectId: 'e1', sourceId: 'doc1', reviewStatus: 'PENDING', sectionKey: 'customer-context', runtimePath: f.renderer.sections[0].runtimePath }]
    calls.renderer.mockReturnValue({ data: f.renderer, refetch: vi.fn().mockResolvedValue({ data: after.renderer }) })
    calls.bootstrap.mockReturnValue({ data: f.bootstrap, refetch: vi.fn().mockResolvedValue({ data: after.bootstrap }) })
    calls.section.mockReturnValue({ data: f.detail, refetch: vi.fn().mockResolvedValue({ data: after.detail }) })
    calls.upload.mockReturnValue({ unwrap: () => Promise.resolve({ data: { runtimeInstance: after.renderer.runtimeInstance, section: { sectionKey: 'customer-context', runtimePath: f.renderer.sections[0].runtimePath, sectionEvidence: { documents: [doc] } } } }) })
    await userEvent.click(screen.getByRole('button', { name: 'Extract supporting files' })); await userEvent.click(screen.getByRole('button', { name: 'Confirm extraction' }))
    await screen.findByText(/Supporting files extracted. Current section receipts/)
    expect(screen.getByText(/^0 of 5/)).toBeInTheDocument(); expect(calls.accept).not.toHaveBeenCalled(); expect(calls.execute).not.toHaveBeenCalled()
  })
  it('keeps staged files and blocks commands when transport success lacks fresh receipts', async () => {
    context(); await choose([file()]); calls.upload.mockReturnValue({ unwrap: () => Promise.resolve({}) })
    await userEvent.click(screen.getByRole('button', { name: 'Extract supporting files' })); await userEvent.click(screen.getByRole('button', { name: 'Confirm extraction' }))
    await screen.findByText(/current result could not be verified/)
    expect(screen.getByText(/^1 of 5/)).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Generate section' })).toBeDisabled()
  })
  it('does not silently restamp a staged batch after refreshed authority changes', async () => {
    const f = fixture(); const view = context(f); await choose([file()])
    const after = fixture('v2', '2026-10-11T17:00:00Z')
    calls.renderer.mockReturnValue({ data: after.renderer }); calls.bootstrap.mockReturnValue({ data: after.bootstrap }); calls.section.mockReturnValue({ data: after.detail })
    view.rerender(<MemoryRouter><ScopedStructure scope={scope} session={getSessionRevision()} canUpdate search={new URLSearchParams('sectionView=context')} setSearch={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText(/section basis changed. Inspect it, then remove/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Supporting files/)).toBeDisabled(); expect(screen.getByText(/^1 of 5/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Remove staged supporting file 1/ }))
    expect(screen.getByLabelText(/^Supporting files/)).not.toBeDisabled()
    await choose([file()]); expect(screen.getByRole('button', { name: 'Extract supporting files' })).not.toBeDisabled()
  })
  it('keeps distinct bytes sharing a filename, type and size as two staged inputs', async () => {
    context(); await choose([file('same.txt', 'abc'), file('same.txt', 'def')])
    expect(screen.getByText(/^2 of 5/)).toBeInTheDocument()
  })
  it('blocks extraction while additional context is unsaved', async () => {
    context(); await choose([file()]); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Unsaved synthetic context' } })
    expect(screen.getByRole('button', { name: 'Extract supporting files' })).toBeDisabled()
    expect(screen.getByText(/Save or discard unsaved section context before extracting files/)).toBeInTheDocument()
  })
  it('ignores file preparation completing after unmount and protects navigation while preparing', async () => {
    let reader
    const spy = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function () { reader = this })
    try {
      const draftState = vi.fn(), view = context(fixture(), { onDraftState: draftState })
      fireEvent.change(screen.getByLabelText(/^Supporting files/), { target: { files: [file()] } })
      expect(screen.getByLabelText(/^Supporting files/)).toBeDisabled()
      expect(draftState.mock.calls.at(-1)[0].busy).toBe(true)
      view.unmount(); const count = draftState.mock.calls.length
      Object.defineProperty(reader, 'result', { value: 'data:text/plain;base64,YWJj' })
      await act(async () => { reader.onload() })
      expect(draftState).toHaveBeenCalledTimes(count); expect(calls.upload).not.toHaveBeenCalled()
    } finally { spy.mockRestore() }
  })
})

describe('Modern saved Context', () => {
  const context = f => mount(f, { search: new URLSearchParams('sectionView=context') })
  it('uses the declared object summary envelope and preserves other stored fields', async () => {
    const f = fixture(); Object.assign(f.renderer.sections[0], { control: 'JSON', dataType: 'OBJECT' })
    f.detail.section.sectionDetail.input = { summary: 'Stored summary', evidence: { retained: ['reference-1'] } }
    context(f); expect(screen.getByRole('textbox')).toHaveValue('Stored summary')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Updated summary  ' } })
    const after = fixture('v2', '2026-10-11T16:00:00Z'); Object.assign(after.renderer.sections[0], { control: 'JSON', dataType: 'OBJECT' })
    after.detail.section.sectionDetail.input = { evidence: { retained: ['reference-1'] }, summary: 'Updated summary' }
    after.detail.section.sectionDetail.lineage.sectionKey = 'customer_context'
    calls.renderer.mockReturnValue({ data: f.renderer, refetch: vi.fn().mockResolvedValue({ data: after.renderer }) })
    calls.bootstrap.mockReturnValue({ data: f.bootstrap, refetch: vi.fn().mockResolvedValue({ data: after.bootstrap }) })
    calls.section.mockReturnValue({ data: f.detail, refetch: vi.fn().mockResolvedValue({ data: after.detail }) })
    calls.mutate.mockReturnValue({ unwrap: () => Promise.resolve({}) })
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm context save' }))
    expect(calls.mutate.mock.calls[0][0].body.value).toEqual({ summary: 'Updated summary', evidence: { retained: ['reference-1'] } })
    await screen.findByText(/Section context saved. Current saved input/)
  })
  it('blocks blank and semantic no-op object saves and unknown input contracts', async () => {
    const f = fixture(); Object.assign(f.renderer.sections[0], { control: 'JSON', dataType: 'OBJECT' })
    const view = context(f)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    f.detail.section.sectionDetail.input = { summary: 'Same input' }
    view.rerender(<MemoryRouter><ScopedStructure scope={scope} session={getSessionRevision()} canUpdate search={new URLSearchParams('sectionView=context')} setSearch={vi.fn()} /></MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' Same input ' } })
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    f.detail.section.sectionDetail.input = { other: 'Do not flatten this object' }
    view.rerender(<MemoryRouter><ScopedStructure scope={scope} session={getSessionRevision()} canUpdate search={new URLSearchParams('sectionView=context')} setSearch={vi.fn()} /></MemoryRouter>)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(calls.mutate).not.toHaveBeenCalled()
  })
  it('does not save unchanged or structured inputs, or permit locked context edits', async () => {
    const f = fixture(); const view = context(f)
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    f.renderer.lock.state = 'LOCKED'
    view.rerender(<MemoryRouter><ScopedStructure scope={scope} session={getSessionRevision()} canUpdate search={new URLSearchParams('sectionView=context')} setSearch={vi.fn()} /></MemoryRouter>)
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    f.detail.section.sectionDetail.input = { preserved: 'structured' }
    view.rerender(<MemoryRouter><ScopedStructure scope={scope} session={getSessionRevision()} canUpdate search={new URLSearchParams('sectionView=context')} setSearch={vi.fn()} /></MemoryRouter>)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(calls.mutate).not.toHaveBeenCalled()
  })
  it('retains drafts across views and prompts before section switching', async () => {
    const f = fixture(), setSearch = vi.fn()
    const other = { ...f.renderer.sections[0], sectionKey: 'strategic-objectives', runtimePath: 'framework_state.sections.strategic_objectives', label: 'Strategic Objectives' }
    f.renderer.sections.push(other); f.bootstrap.sections.push({ ...f.bootstrap.sections[0], sectionKey: 'strategic_objectives' })
    mount(f, { search: new URLSearchParams('section=customer-context&sectionView=context'), setSearch })
    await userEvent.type(screen.getByRole('textbox'), 'Synthetic draft')
    expect(screen.getByRole('button', { name: 'Generate section', exact: true })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Strategic Objectives · Optional' }))
    expect(setSearch).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByRole('textbox')).toHaveValue('Synthetic draft')
    await userEvent.click(screen.getByRole('button', { name: 'Strategic Objectives · Optional' }))
    await userEvent.click(screen.getByRole('button', { name: 'Discard and continue' }))
    expect(setSearch.mock.calls[0][0].get('section')).toBe('strategic-objectives')
    expect(calls.mutate).not.toHaveBeenCalled()
  })
  it('sends only exact WRITE fields and verifies persisted input with native lineage', async () => {
    const f = fixture(); context(f)
    await userEvent.type(screen.getByRole('textbox'), 'Synthetic saved context')
    const after = fixture('v2', '2026-10-11T15:00:00Z')
    after.detail.section.sectionDetail.input = 'Synthetic saved context'
    after.detail.section.sectionDetail.lineage.sectionKey = 'customer_context'
    calls.renderer.mockReturnValue({ data: f.renderer, refetch: vi.fn().mockResolvedValue({ data: after.renderer }) })
    calls.bootstrap.mockReturnValue({ data: f.bootstrap, refetch: vi.fn().mockResolvedValue({ data: after.bootstrap }) })
    calls.section.mockReturnValue({ data: f.detail, refetch: vi.fn().mockResolvedValue({ data: after.detail }) })
    calls.mutate.mockReturnValue({ unwrap: () => Promise.resolve({}) })
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(calls.mutate).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm context save' }))
    expect(calls.mutate).toHaveBeenCalledWith({ runtimeInstanceId: scope.runtimeInstanceId, body: {
      runtimePath: 'framework_state.sections.customer_context', operation: 'WRITE', value: 'Synthetic saved context', expectedUpdatedAt: stamp,
    } })
    await screen.findByText(/Section context saved. Current saved input/)
    expect(calls.mutate).toHaveBeenCalledTimes(1)
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.accept).not.toHaveBeenCalled()
  })
  it('preserves unsaved text after a rejected save and prevents automatic retry', async () => {
    context(fixture()); await userEvent.type(screen.getByRole('textbox'), 'Retain this draft')
    calls.mutate.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { message: 'Stale context.' } }) })
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm context save' }))
    await screen.findByText(/Refresh and inspect before another command/)
    expect(screen.getByRole('textbox')).toHaveValue('Retain this draft')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(calls.mutate).toHaveBeenCalledTimes(1)
  })
  it('blocks a drifted saved-input basis without erasing the draft', async () => {
    const f = fixture(); const view = context(f)
    await userEvent.type(screen.getByRole('textbox'), 'Retain original draft')
    f.detail.section.sectionDetail.input = 'Another saved input'
    view.rerender(<MemoryRouter><ScopedStructure scope={scope} session={getSessionRevision()} canUpdate search={new URLSearchParams('sectionView=context')} setSearch={vi.fn()} /></MemoryRouter>)
    expect(screen.getByRole('textbox')).toHaveValue('Retain original draft')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(calls.mutate).not.toHaveBeenCalled()
  })
  it('does not label an old pristine draft saved after external input changes', async () => {
    const f = fixture(); f.detail.section.sectionDetail.input = 'Original input'
    const view = context(f)
    await userEvent.type(screen.getByRole('textbox'), ' appended')
    f.detail.section.sectionDetail.input = 'External input'
    view.rerender(<MemoryRouter><ScopedStructure scope={scope} session={getSessionRevision()} canUpdate search={new URLSearchParams('sectionView=context')} setSearch={vi.fn()} /></MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Original input' } })
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Generate section', exact: true })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(screen.getByRole('textbox')).toHaveValue('External input')
  })
  it('keeps conflict navigation protection during fetching and read errors', async () => {
    const f = fixture(); f.detail.section.sectionDetail.input = 'Original input'
    const onDraftState = vi.fn(), props = { scope, session: getSessionRevision(), canUpdate: true, search: new URLSearchParams('sectionView=context'), setSearch: vi.fn(), onDraftState }
    const view = mount(f, props)
    await userEvent.type(screen.getByRole('textbox'), ' appended')
    f.detail.section.sectionDetail.input = 'External input'
    view.rerender(<MemoryRouter><ScopedStructure {...props} /></MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Original input' } })
    for (const unavailable of [{ isFetching: true }, { error: { status: 500 } }]) {
      calls.section.mockReturnValue({ data: f.detail, ...unavailable })
      view.rerender(<MemoryRouter><ScopedStructure {...props} /></MemoryRouter>)
      expect(onDraftState.mock.calls.at(-1)[0].dirty).toBe(true)
      expect(screen.getByRole('button', { name: 'Generate section', exact: true })).toBeDisabled()
    }
  })
})
describe('Exact modern Understanding bindings', () => {
  it('renders stored interpretation sections and the actual generation validation and provider receipt', () => {
    const f = fixture(); f.detail.section.sectionDetail.generated = { ...generated(),
      sections: [{ heading: 'Commercial Interpretation', body: 'Stored commercial meaning.', bullets: ['Restricted: synthetic pilot only.'] }],
      sectionIntelligence: { contradictionSignals: [{ signal: 'Stored service-scope conflict.' }] },
      generator: { providerMetadata: { responseId: 'response-exact' } },
      validationResults: [{ status: 'PASS', resultHash: 'validation-exact' }],
      supportingEvidenceRefs: ['evidence-exact'], evidenceProjection: { gaps: ['NO_STRATEGIC_TENSION_EVIDENCE'] } }
    mount(f)
    expect(screen.getByRole('heading', { name: 'Commercial Interpretation' })).toBeInTheDocument()
    const proposal = within(screen.getByRole('tabpanel', { name: 'Understanding' }))
    expect(proposal.getByText('Stored commercial meaning.')).toBeInTheDocument()
    expect(proposal.getByText('Restricted: synthetic pilot only.')).toBeInTheDocument()
    const inspection = screen.getByText('Inspect generation evidence and validation basis').closest('details')
    expect(inspection).toHaveTextContent('Stored service-scope conflict.')
    expect(inspection).toHaveTextContent('response-exact')
    expect(inspection).toHaveTextContent('validation-exact')
    expect(inspection).toHaveTextContent('evidence-exact')
    expect(inspection).toHaveTextContent('NO_STRATEGIC_TENSION_EVIDENCE')
    expect(screen.getByText('No accepted Understanding is recorded for this section.')).toBeInTheDocument()
  })
  it('reads the native declared-path key and preserves package identity for generation', async () => {
    const f = fixture(); mount(f)
    expect(calls.section).toHaveBeenCalledWith({ runtimeInstanceId: scope.runtimeInstanceId, customerId: scope.customerId, tenantId: scope.tenantId, sectionKey: 'customer_context' }, { skip: false })
    await userEvent.click(screen.getByRole('button', { name: 'Generate section', exact: true }))
    expect(calls.execute).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm generation' }))
    expect(calls.execute).toHaveBeenCalledTimes(1)
    expect(calls.execute).toHaveBeenCalledWith({ runtimeInstanceId: scope.runtimeInstanceId, customerId: scope.customerId, tenantId: scope.tenantId,
      actionKey: 'GENERATE_SECTION', body: { expectedUpdatedAt: stamp, runtimePath: 'framework_state.sections.customer_context', sectionKey: 'customer-context' } })
    await screen.findByText(/command was submitted, but its current result could not be verified/)
    expect(screen.getByRole('button', { name: 'Generate section', exact: true })).toBeDisabled()
  })
  it('cancels confirmation without a command', async () => {
    mount(fixture()); await userEvent.click(screen.getByRole('button', { name: 'Generate section', exact: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(calls.execute).not.toHaveBeenCalled()
  })
  it('does not claim generated success from HTTP success without fresh content', async () => {
    mount(fixture()); await userEvent.click(screen.getByRole('button', { name: 'Generate section', exact: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm generation' }))
    await screen.findByText(/current result could not be verified/)
    expect(screen.queryByText(/^Understanding generated\./)).not.toBeInTheDocument()
  })
  it('confirms a separate exact generated version and verifies acceptance on new current reads', async () => {
    const f = fixture(); f.detail.section.sectionDetail.generated = generated(); mount(f)
    const after = fixture('v2', '2026-10-10T18:01:00Z'), detail = after.detail.section.sectionDetail
    detail.generated = generated(); detail.accepted = { ...generated(), sourceGeneratedAt: stamp, acceptedAt: after.renderer.runtimeInstance.updatedAt, acceptedBy: 'actor-1', truthHash: 'truth-1' }; detail.state.status = 'ACCEPTED'
    calls.renderer.mockReturnValue({ data: f.renderer, refetch: vi.fn().mockResolvedValue({ data: after.renderer }) })
    calls.bootstrap.mockReturnValue({ data: f.bootstrap, refetch: vi.fn().mockResolvedValue({ data: after.bootstrap }) })
    calls.section.mockReturnValue({ data: f.detail, refetch: vi.fn().mockResolvedValue({ data: after.detail }) })
    await userEvent.click(screen.getByRole('button', { name: 'Accept Understanding', exact: true }))
    expect(calls.accept).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm acceptance' }))
    expect(calls.accept).toHaveBeenCalledWith({ runtimeInstanceId: scope.runtimeInstanceId, body: { expectedUpdatedAt: stamp, runtimePath: 'framework_state.sections.customer_context', sectionKey: 'customer-context' } })
    await screen.findByText(/Understanding accepted. Current content and decision record verified/)
    expect(calls.execute).not.toHaveBeenCalled()
  })
  it('blocks duplicate submission and section changes during a pending command', async () => {
    let resolve; calls.execute.mockReturnValue({ unwrap: () => new Promise(done => { resolve = done }) })
    const setSearch = vi.fn(); mount(fixture(), { setSearch })
    await userEvent.click(screen.getByRole('button', { name: 'Generate section', exact: true }))
    const confirmButton = screen.getByRole('button', { name: 'Confirm generation' })
    fireEvent.click(confirmButton); fireEvent.click(confirmButton)
    expect(calls.execute).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Customer Context · Optional' })).toBeDisabled()
    expect(setSearch).not.toHaveBeenCalled(); await act(async () => resolve({}))
  })
  it('invalidates confirmation when current basis or authority changes', async () => {
    const f = fixture(); const view = mount(f)
    await userEvent.click(screen.getByRole('button', { name: 'Generate section', exact: true }))
    view.rerender(<MemoryRouter><ScopedStructure scope={scope} session={getSessionRevision()} canUpdate={false} search={new URLSearchParams('sectionView=understanding')} setSearch={vi.fn()} /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: 'Confirm generation' })).not.toBeInTheDocument(); expect(calls.execute).not.toHaveBeenCalled()
  })
  it('fails closed on provider rejection and requires explicit refresh instead of automatic retry', async () => {
    calls.execute.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { error: { code: 'PROVIDER_BLOCKED', message: 'Provider safety blocked generation.' } } }) })
    mount(fixture()); await userEvent.click(screen.getByRole('button', { name: 'Generate section', exact: true })); await userEvent.click(screen.getByRole('button', { name: 'Confirm generation' }))
    await screen.findByText(/Provider safety blocked generation/)
    expect(calls.execute).toHaveBeenCalledTimes(1); expect(screen.getByRole('button', { name: 'Generate section', exact: true })).toBeDisabled()
  })
  it('suppresses late callbacks and reads after unmount', async () => {
    let resolve; calls.execute.mockReturnValue({ unwrap: () => new Promise(done => { resolve = done }) })
    const view = mount(fixture()); await userEvent.click(screen.getByRole('button', { name: 'Generate section', exact: true })); await userEvent.click(screen.getByRole('button', { name: 'Confirm generation' }))
    const read = calls.renderer.mock.results[0].value.refetch; view.unmount(); await act(async () => resolve({})); expect(read).not.toHaveBeenCalled()
  })
  it('suppresses late callbacks after session change', async () => {
    let resolve; calls.execute.mockReturnValue({ unwrap: () => new Promise(done => { resolve = done }) })
    mount(fixture()); await userEvent.click(screen.getByRole('button', { name: 'Generate section', exact: true })); await userEvent.click(screen.getByRole('button', { name: 'Confirm generation' }))
    const read = calls.renderer.mock.results[0].value.refetch; act(() => clearTokens()); await act(async () => resolve({})); expect(read).not.toHaveBeenCalled()
  })
  it.each(['locked', 'denied', 'stale-read', 'foreign', 'ambiguous', 'path', 'native-key', 'wrong-lineage', 'receipt-conflict', 'disabled-action', 'duplicate-action', 'unaccepted-pack'])('blocks %s safely', async kind => {
    const f = fixture()
    if (kind === 'locked') f.renderer.lock.state = 'LOCKED'
    if (kind === 'stale-read') f.detail.section.sourceStateVersion = 'old'
    if (kind === 'foreign') f.detail.control = { ...f.detail.control, tenantId: 'other' }
    if (kind === 'ambiguous') f.bootstrap.sections.push(f.bootstrap.sections[0])
    if (kind === 'path') f.renderer.sections[0].runtimePath = 'framework_state.other.customer_context'
    if (kind === 'native-key') f.detail.section.sectionKey = 'customer-context'
    if (kind === 'wrong-lineage') f.detail.section.sectionDetail.lineage.runtimePath = 'framework_state.sections.other'
    if (kind === 'receipt-conflict') f.detail.section.projectionReceipt.sourceStateVersion = 'old'
    if (kind === 'disabled-action') f.renderer.actions[0].enabled = false
    if (kind === 'duplicate-action') f.renderer.actions.push(f.renderer.actions[0])
    if (kind === 'unaccepted-pack') f.renderer.discovery.accepted = false
    mount(f, { canUpdate: kind !== 'denied' })
    const action = screen.queryByRole('button', { name: 'Generate section', exact: true })
    if (action) expect(action).toBeDisabled()
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.accept).not.toHaveBeenCalled()
  })
  it.each(['unknown', 'ineligible', 'stale', 'dependency-invalidated', 'already-accepted', 'wrong-version'])('does not accept %s content', kind => {
    const f = fixture(), detail = f.detail.section.sectionDetail; detail.generated = generated()
    if (kind === 'unknown') delete detail.generated.truthEligibility
    if (kind === 'ineligible') detail.generated.truthEligibility.eligible = false
    if (kind === 'stale') detail.state.needsRegeneration = true
    if (kind === 'dependency-invalidated') detail.dependencies = { state: 'DEPENDENCY_CONTEXT_INVALIDATED' }
    if (kind === 'wrong-version') delete detail.generated.inputHash
    if (kind === 'already-accepted') { detail.accepted = { ...generated(), sourceGeneratedAt: stamp, acceptedAt: stamp, acceptedBy: 'actor-1', truthHash: 'truth-1' }; detail.state.status = 'ACCEPTED' }
    mount(f); expect(screen.getByRole('button', { name: kind === 'already-accepted' ? 'Understanding accepted' : 'Accept Understanding', exact: true })).toBeDisabled()
    expect(calls.accept).not.toHaveBeenCalled()
  })
  it('disables absent previous comparison and preserves exact modern lineage scope', () => {
    mount(fixture()); expect(screen.getByRole('button', { name: 'Compare' })).toBeDisabled()
    expect(screen.queryByRole('link', { name: 'Inspect Understanding lineage →' })).not.toBeInTheDocument()
    expect(screen.getByText('Current accepted Understanding lineage is unavailable for this section.')).toBeInTheDocument()
  })
  it.each(['editable', 'locked', 'read-only'])('opens the exact current accepted truth for an %s revision', kind => {
    const f = fixture(), detail = f.detail.section.sectionDetail
    detail.generated = generated()
    detail.accepted = { ...generated(), sourceGeneratedAt: stamp, acceptedAt: stamp, acceptedBy: 'actor-1', truthHash: `sha256:${'a'.repeat(64)}` }
    detail.state.status = 'ACCEPTED'
    if (kind === 'locked') { f.renderer.lock = { state: 'LOCKED' }; f.renderer.lifecycle.stage = 'COMPLETE'; f.renderer.sections[0].editable = false }
    mount(f, { canUpdate: kind === 'editable' })
    const href = screen.getByRole('link', { name: 'Inspect Understanding lineage →' }).getAttribute('href')
    const url = new URL(href, 'http://local'), contextKey = 'root-1:revision-1:customer-1:tenant-1'
    expect(url.pathname).toBe('/app/intelligence')
    expect(url.searchParams.get('runtimeInstanceId')).toBe(scope.workspaceId)
    expect(url.searchParams.get('revisionId')).toBe(scope.runtimeInstanceId)
    expect(readGraphInspection(url.searchParams, contextKey)).toEqual({
      mode: 'Lineage', objectView: 'object', selectedKey: `section-truth:revision-1:customer-context:sha256-${'a'.repeat(64)}`,
      search: '', afterEdgeKey: '', invalid: false,
    })
    expect(url.searchParams.has('graphEvidenceObjectId')).toBe(false)
    expect(url.searchParams.has('graphAfterEdgeKey')).toBe(false)
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.accept).not.toHaveBeenCalled(); expect(calls.mutate).not.toHaveBeenCalled()
  })
  it.each(['stale', 'invalid-hash', 'array-hash', 'noncanonical-section', 'noncanonical-runtime', 'long-key', 'foreign-root', 'foreign-revision', 'foreign-customer', 'foreign-tenant'])('withholds exact lineage for %s', kind => {
    const f = fixture(), detail = f.detail.section.sectionDetail
    detail.generated = generated()
    detail.accepted = { ...generated(), sourceGeneratedAt: stamp, acceptedAt: stamp, acceptedBy: 'actor-1', truthHash: `sha256:${'a'.repeat(64)}` }
    detail.state.status = 'ACCEPTED'
    if (kind === 'stale') detail.state.needsRegeneration = true
    if (kind === 'invalid-hash') detail.accepted.truthHash = 'historical-truth'
    const current = basis(f), selectedScope = { ...scope }
    if (kind === 'array-hash') current.accepted.truthHash = [`sha256:${'a'.repeat(64)}`]
    if (kind === 'noncanonical-section') current.section.sectionKey = 'Customer_Context'
    if (kind === 'noncanonical-runtime') current.renderer.runtimeInstance.runtimeInstanceKey = 'Revision_1'
    if (kind === 'long-key') current.section.sectionKey = 'a'.repeat(240)
    if (kind === 'foreign-root') selectedScope.workspaceId = 'other'
    if (kind === 'foreign-revision') selectedScope.runtimeInstanceId = 'other'
    if (kind === 'foreign-customer') selectedScope.customerId = 'other'
    if (kind === 'foreign-tenant') selectedScope.tenantId = 'other'
    expect(understandingLineageHref(current, selectedScope)).toBe('')
    expect(understandingLineageHref(null, scope)).toBe('')
  })
  it('rejects unknown or contradictory lock metadata and package identity mismatch', () => {
    for (const lock of [{ state: 'UNKNOWN' }, { state: 'UNLOCKED', locked: true }, { state: 'UNLOCKED', locked: null }]) {
      const f = fixture(); f.renderer.lock = lock; expect(basis(f).editable).toBe(false)
    }
    const f = fixture(); f.bootstrap.control = { ...f.bootstrap.control, packageVersion: 'other' }; expect(catalogue(f)).toBeNull()
  })
})

describe('Section command currentness', () => {
  it.each(['permission', 'basis', 'fetching', 'cancel'])('rejects retained confirmation after %s departure', async departure => {
    const view = mount(fixture())
    await userEvent.click(screen.getByRole('button', { name: 'Generate section', exact: true }))
    const confirm = confirmations.current
    if (departure === 'cancel') await userEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true }))
    else {
      if (departure === 'basis') {
        const changed = fixture('v2', '2026-10-10T17:41:00.000Z')
        calls.renderer.mockReturnValue({ data: changed.renderer })
        calls.bootstrap.mockReturnValue({ data: changed.bootstrap })
        calls.section.mockReturnValue({ data: changed.detail })
      }
      if (departure === 'fetching') calls.section.mockReturnValue({ data: fixture().detail, isFetching: true })
      view.rerender(<MemoryRouter><ScopedStructure scope={scope} session={getSessionRevision()} canUpdate={departure !== 'permission'} search={new URLSearchParams('sectionView=understanding')} setSearch={vi.fn()} /></MemoryRouter>)
    }
    expect(screen.queryByRole('button', { name: 'Confirm generation' })).not.toBeInTheDocument()
    await act(async () => confirm())
    expect(calls.execute).not.toHaveBeenCalled()
    expect(calls.accept).not.toHaveBeenCalled()
    expect(calls.mutate).not.toHaveBeenCalled()
    expect(calls.upload).not.toHaveBeenCalled()
    expect(calls.review).not.toHaveBeenCalled()
  })
})