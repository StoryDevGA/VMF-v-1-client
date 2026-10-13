import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import SourcesView from './SourcesView.jsx'
import { StrictMode, useState } from 'react'

const calls = vi.hoisted(() => ({ sources: vi.fn(), evidence: vi.fn(), retry: vi.fn(), open: vi.fn(), selectView: vi.fn(), session: 1, browse: null, handlers: {}, typeHandler: null, record: vi.fn(), reviewed: vi.fn() }))
vi.mock('../../utils/tokenStorage.js', () => ({ getSessionRevision: () => calls.session, subscribeToSession: () => () => {} }))
vi.mock('../../components/Button', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, Button: props => {
    if (props.children === 'Browse all evidence from this source') calls.browse = props.onClick
    const label = props['aria-label'] || (Array.isArray(props.children) ? props.children.filter(child => typeof child === 'string').join('') : props.children)
    if (typeof label === 'string') calls.handlers[label.trim()] = props.onClick
    return <actual.Button {...props} />
  } }
})
vi.mock('../../components/Select', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, Select: props => {
    if (props.label === 'Source type') calls.typeHandler = props.onChange
    return <actual.Select {...props} />
  } }
})
let state
const control = { id: 'revision-2', runtimeInstanceKey: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', stateVersion: 'rsv2:source-basis' }
const source = { sourceId: 'source-off-page', label: 'Stored website', sourceType: 'WEBSITE', evidenceObjectCount: 853, acquisitionStatus: 'ACQUIRED' }
const object = { evidenceObjectId: 'evidence-off-page', sourceId: source.sourceId, extractedFact: 'Evidence only needle', reviewStatus: 'PENDING' }
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useRecordRuntimeSourceVerificationMutation: () => [calls.record],
  useGetRuntimeStateSourcesQuery: (query, options) => {
    calls.sources(query, options)
    if (options.skip) return { refetch: calls.retry }
    const selectedSource = { ...source, label: state.longName || source.label, evidenceObjectCount: state.empty ? 0 : state.unknownCount ? null : source.evidenceObjectCount, evidenceCountCapped: Boolean(state.cappedCount) }
    const rows = query.sourceId ? [selectedSource] : query.search ? [] : [selectedSource]
    const data = { control: state.wrongScope ? { ...control, tenantId: 'another-tenant' } : control,
      sourceRegistry: rows, total: query.sourceId ? 1 : query.search ? 0 : 61, totalPages: 3,
      pageSize: 25, completeness: state.capped ? 'PARTIAL' : 'COMPLETE', totalCapped: state.capped }
    if (state.capped) { data.total = null; data.totalPages = null; data.sourceRegistry = Array.from({ length: 25 }, (_, i) => ({ ...source, sourceId: `s-${i}` })) }
    return { currentData: state.missing ? undefined : { data }, data: { data }, refetch: calls.retry,
      isFetching: state.pending, error: state.error || (query.sourceId === 'unknown' ? { data: { error: { message: 'Selected source unavailable' } } } : undefined) }
  },
  useGetRuntimeStateEvidenceQuery: (query, options) => {
    calls.evidence(query, options)
    if (options.skip) return { refetch: calls.retry }
    const data = { control: state.wrongScope ? { ...control, tenantId: 'another-tenant' } : state.wrongVersion ? { ...control, stateVersion: 'rsv2:other' } : control,
      evidenceObjects: state.empty ? [] : state.stableEvidence && !state.wrongPair ? [object] : [{ ...object, title: state.title, sourceId: state.wrongPair ? 'wrong-source' : object.sourceId }],
      sourceRegistry: [source], total: state.empty ? 0 : query.evidenceObjectId || query.search ? 1 : 853,
      totalPages: query.evidenceObjectId || query.search ? 1 : 35, pageSize: 25 }
    return { currentData: state.missing ? undefined : { data }, data: { data }, refetch: calls.retry, isFetching: state.pending, error: state.error }
  },
}))
const context = 'workspace-1:revision-2:customer-1:tenant-1'
const base = `/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources&sourceContext=${encodeURIComponent(context)}`
function Harness({ revisionId = 'revision-2', active = true, canRead = true, stateVersion = control.stateVersion, reviewAuthority, evidenceCount, sourceSummary, onBasisInspectionReady, onRefreshWorkspace, workspaceRefreshing }) {
  const location = useLocation()
  const navigate = useNavigate()
  return <><SourcesView workspaceId="workspace-1" revisionId={revisionId} customerId="customer-1" tenantId="tenant-1"
    onBasisInspectionReady={onBasisInspectionReady} onRefreshWorkspace={onRefreshWorkspace} workspaceRefreshing={workspaceRefreshing} active={active} canRead={canRead} stateVersion={stateVersion} locked reviewAuthority={reviewAuthority} onSourceReviewed={calls.reviewed} pendingCount={12} evidenceCount={evidenceCount} sourceSummary={sourceSummary} onOpen={calls.open} onSelectView={calls.selectView} />
    <output aria-label="Route">{location.search}</output><button onClick={() => navigate(-1)}>Browser Back</button></>
}
const show = (suffix = '') => render(<MemoryRouter initialEntries={[base + suffix]}><Harness /></MemoryRouter>)
beforeEach(() => { state = {}; calls.session = 1; calls.handlers = {}; vi.clearAllMocks() })
it.each([null, undefined, '', 'rsv2:wrong-basis'])('withholds Source rows and handoffs without matching parent basis (%s)', version => {
  render(<MemoryRouter initialEntries={[base]}><Harness stateVersion={version === undefined ? null : version} /></MemoryRouter>)
  expect(screen.queryByText('Evidence only needle')).not.toBeInTheDocument()
  expect(screen.queryByText('Stored website')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Source summary')).toHaveTextContent('UnavailableRecorded sources')
})
it('keeps cache-only session and version on each read', () => {
  show('&sourceId=source-off-page')
  expect(calls.sources.mock.calls.every(([query]) => query.sessionRevision === 1 && query.stateVersion === control.stateVersion)).toBe(true)
  expect(calls.evidence.mock.calls.every(([query]) => query.sessionRevision === 1 && query.stateVersion === control.stateVersion)).toBe(true)
})
it.each(['permission', 'inactive', 'version', 'error', 'fetching', 'session'])('rejects every captured Source navigation after %s departure', key => {
  const route = base + '&sourceId=source-off-page&sourceQuery=needle'
  const tree = props => <MemoryRouter initialEntries={[route]}><Harness {...props} /></MemoryRouter>
  const view = render(tree({}))
  const names = ['Next source page', 'Next evidence page', 'Inspect recorded lineage · Stored website', '← Context', 'Continue to Review →', 'Source details', 'Retry source reads', 'Return to search results', 'Clear search']
  const captured = names.map(name => { expect(calls.handlers[name]).toBeTypeOf('function'); return calls.handlers[name] })
  expect(calls.typeHandler).toBeTypeOf('function')
  captured.push(calls.typeHandler)
  if (key === 'error') state.error = { status: 503 }
  if (key === 'fetching') state.pending = true
  if (key === 'session') calls.session = 2
  else view.rerender(tree(key === 'permission' ? { canRead: false } : key === 'inactive' ? { active: false } : key === 'version' ? { stateVersion: 'rsv2:new' } : {}))
  const before = screen.getByLabelText('Route').textContent
  captured.forEach(callback => callback({ currentTarget: document.body, target: { value: "WEBSITE" } }))
  expect(screen.getByLabelText('Route').textContent).toBe(before)
  expect(calls.open).not.toHaveBeenCalled()
  expect(calls.selectView).not.toHaveBeenCalled()
  expect(calls.retry).not.toHaveBeenCalled()
})
it('allows current scoped search and retry recovery after failed dependent read', async () => {
  state.error = { status: 503 }; show(); const user = userEvent.setup()
  await user.type(screen.getByRole('searchbox', { name: 'Find a source or evidence' }), 'recovery')
  await user.click(screen.getByRole('button', { name: 'Search', exact: true }))
  expect(screen.getByLabelText('Route')).toHaveTextContent('sourceQuery=recovery')
  await user.click(screen.getByRole('button', { name: 'Retry source reads' }))
  expect(calls.retry).toHaveBeenCalled()
})
it.each(['&sourcePage=01', '&sourcePage=1&sourcePage=2', '&sourceType=OTHER', '&sourceQuery=a%0Ab', '&sourceId=%20source-off-page', '&sourceContext=' + encodeURIComponent(context)])('rejects malformed scalar Sources state (%s)', suffix => {
  show(suffix)
  expect(screen.getByRole('alert')).toHaveTextContent('invalid query')
  expect(calls.sources.mock.calls.every(([, options]) => options.skip)).toBe(true)
})
it('separates exact focused count from full source and browses all with preserved context and Back', async () => {
  show('&sourceId=source-off-page&evidenceObjectId=evidence-off-page&sourceQuery=needle&sourcePage=2&evidencePage=3'); const user = userEvent.setup()
  expect(screen.getByText('853 evidence objects from this source')).toBeInTheDocument()
  expect(screen.getByText('1 evidence objects matching this exact focus')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Browse all evidence from this source' }))
  expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ sourceId: source.sourceId, evidenceObjectId: '', search: '', page: 1 }), { skip: false })
  expect(screen.getByRole('region', { name: 'Selected source detail' })).toHaveFocus()
  expect(screen.getByLabelText('Route')).toHaveTextContent('sourceQuery=needle')
  expect(screen.getByLabelText('Route')).toHaveTextContent('sourcePage=2')
  expect(screen.getByLabelText('Route')).toHaveTextContent('evidencePage=3')
  await user.click(screen.getByRole('button', { name: 'Next evidence page' }))
  expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, evidenceObjectId: '' }), { skip: false })
  await user.click(screen.getByRole('button', { name: 'Browser Back' }))
  await user.click(screen.getByRole('button', { name: 'Browser Back' }))
  expect(screen.getByLabelText('Route')).toHaveTextContent('evidenceObjectId=evidence-off-page')
  expect(screen.getByText('1 evidence objects matching this exact focus')).toBeInTheDocument()
})
it.each(['pending', 'error', 'wrongVersion', 'wrongPair'])('withholds focused totals and browse on %s', key => {
  state[key] = key === 'error' ? { status: 503 } : true
  show('&sourceId=source-off-page&evidenceObjectId=evidence-off-page')
  expect(screen.getByText('Unavailable evidence objects from this source')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Browse all evidence from this source' })).toBeDisabled()
})
it.each([['unknownCount', 'Unavailable'], ['cappedCount', 'Partial · total unavailable']])('does not infer source count from focused evidence (%s)', (key, text) => {
  state[key] = true; show('&sourceId=source-off-page&evidenceObjectId=evidence-off-page')
  expect(screen.getByText(`${text} evidence objects from this source`)).toBeInTheDocument()
  expect(screen.getByText('1 evidence objects matching this exact focus')).toBeInTheDocument()
})
it('rejects a retained browse callback after session changes before rerender', async () => {
  show('&sourceId=source-off-page&evidenceObjectId=evidence-off-page'); const user = userEvent.setup()
  calls.session = 2
  await user.click(screen.getByRole('button', { name: 'Browse all evidence from this source' }))
  expect(screen.getByLabelText('Route')).toHaveTextContent('evidenceObjectId=evidence-off-page')
})
it('supports browse-all after Strict Mode effect replay', async () => {
  render(<StrictMode><MemoryRouter initialEntries={[base + '&sourceId=source-off-page&evidenceObjectId=evidence-off-page']}><Harness /></MemoryRouter></StrictMode>)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Browse all evidence from this source' }))
  expect(screen.getByLabelText('Route')).not.toHaveTextContent('evidenceObjectId=')
  expect(screen.getByRole('region', { name: 'Selected source detail' })).toHaveFocus()
})
it.each(['permission', 'inactive', 'revision', 'error', 'fetching', 'version'])('rejects captured browse callback after committed %s departure', key => {
  const route = base + '&sourceId=source-off-page&evidenceObjectId=evidence-off-page'
  const tree = props => <MemoryRouter initialEntries={[route]}><Harness {...props} /></MemoryRouter>
  const view = render(tree({}))
  const captured = calls.browse
  if (key === 'error') state.error = { status: 503 }
  if (key === 'fetching') state.pending = true
  if (key === 'version') state.wrongVersion = true
  view.rerender(tree(key === 'permission' ? { canRead: false } : key === 'inactive' ? { active: false } : key === 'revision' ? { revisionId: 'revision-3' } : {}))
  captured()
  expect(screen.getByLabelText('Route')).toHaveTextContent('evidenceObjectId=evidence-off-page')
})
it.each([undefined, 'A recorded display title'])('keeps presentation title separate from unavailable classifications (%s)', title => {
  state.title = title; show()
  expect(screen.getByText(title || 'Evidence object', { exact: true })).toBeInTheDocument()
  expect(screen.getByText('Classification and domain are not assessed. Accepted does not mean verified.')).toBeInTheDocument()
  expect(screen.queryByText('Evidence classification unavailable', { exact: true })).not.toBeInTheDocument()
  expect(screen.getByText('Needs Review', { exact: true })).toBeInTheDocument()
})
it('reads a source registry independently and shows actual contributions', () => {
  show()
  expect(within(screen.getByLabelText('Revision source registry')).getByText(/853 recorded evidence/)).toBeInTheDocument()
  expect(screen.getByLabelText('Source summary')).toHaveTextContent('61Recorded sources')
  expect(screen.getByText('Locked revision · inspection is read-only.')).toBeInTheDocument()
  expect(calls.sources).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 25, runtimeInstanceId: 'revision-2', tenantId: 'tenant-1' }), { skip: false })
})
it('global evidence-only search does not depend on a source-text match', async () => {
  show(); const user = userEvent.setup()
  await user.type(screen.getByRole('searchbox', { name: 'Find a source or evidence' }), 'needle')
  await user.click(screen.getByRole('button', { name: 'Search', exact: true }))
  expect(screen.getByRole('region', { name: 'Source registry results' })).toHaveTextContent('No matching sources in this revision.')
  expect(screen.getByRole('region', { name: 'Evidence search results' })).toHaveTextContent('Evidence only needle')
  expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'needle', sourceId: '', page: 1 }), { skip: false })
})
it('opens an exact off-page pair, preserves search, returns and restores browser history', async () => {
  show('&sourceQuery=needle&sourcePage=2&evidencePage=2'); const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Open exact source and evidence' }))
  expect(screen.getByRole('region', { name: 'Selected source detail' })).toHaveFocus()
  expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ sourceId: source.sourceId, evidenceObjectId: object.evidenceObjectId, search: '', page: 1 }), { skip: false })
  expect(screen.getByLabelText('Route')).toHaveTextContent('sourcePage=2')
  expect(screen.getByLabelText('Route')).toHaveTextContent('sourceQuery=needle')
  await user.click(screen.getByRole('button', { name: 'Return to search results' }))
  expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'needle', page: 2 }), { skip: false })
  expect(screen.getByRole('region', { name: 'Evidence search results' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Evidence search results' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Browser Back' }))
  expect(screen.getByLabelText('Route')).toHaveTextContent('evidenceObjectId=evidence-off-page')
})
it('restores a shareable exact pair on reload/remount independently of the source page', () => {
  show('&sourceId=source-off-page&evidenceObjectId=evidence-off-page&sourcePage=3')
  expect(screen.getByRole('heading', { name: 'Stored website' })).toBeInTheDocument()
  expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ sourceId: source.sourceId, evidenceObjectId: object.evidenceObjectId }), { skip: false })
})
it('source pagination preserves evidence selection and evidence page', async () => {
  show('&sourceId=source-off-page&sourceEvidencePage=2'); const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Next source page' }))
  expect(screen.getByRole('navigation', { name: 'Source pages' })).toHaveFocus()
  expect(calls.sources).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 25 }), { skip: false })
  expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, sourceId: source.sourceId }), { skip: false })
  await user.click(screen.getByRole('button', { name: 'Next evidence page' }))
  expect(screen.getByRole('navigation', { name: 'Evidence pages' })).toHaveFocus()
  expect(screen.getByLabelText('Route')).toHaveTextContent('sourcePage=2')
  expect(screen.getByLabelText('Route')).toHaveTextContent('sourceEvidencePage=3')
})
it.each(['pending', 'error', 'missing', 'wrongScope'])('withholds retained rows in %s state', key => {
  state[key] = key === 'error' ? { status: 503 } : true
  show()
  expect(screen.queryByText('Evidence only needle')).not.toBeInTheDocument()
  expect(screen.queryByText('Stored website')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Source summary')).toHaveTextContent('UnavailableRecorded sources')
})
it('refuses a mismatched exact source/evidence payload', () => {
  state.wrongPair = true; show('&sourceId=source-off-page&evidenceObjectId=evidence-off-page')
  expect(screen.queryByText('Evidence only needle')).not.toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Selected source detail' })).toHaveTextContent('does not match the selected revision')
})
it('unknown exact source never selects another source', () => {
  show('&sourceId=unknown')
  expect(screen.queryByRole('heading', { name: 'Stored website' })).not.toBeInTheDocument()
  expect(screen.queryByText('Evidence only needle')).not.toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Selected source unavailable')
})
it('reports valid empty source evidence as zero', () => {
  state.empty = true; show('&sourceId=source-off-page')
  expect(screen.getByLabelText('Source evidence')).toHaveTextContent('0 evidence objects from this source')
  expect(screen.getByText('No matching evidence in this scope.')).toBeInTheDocument()
})
it.each(['&sourcePage=1001', '&evidencePage=-1', '&sourceQuery=' + 'x'.repeat(241), '&evidenceObjectId=orphan', '&sourceType=' + 'x'.repeat(101)])('blocks malformed URLs without querying a substitute (%s)', suffix => {
  show(suffix)
  expect(screen.getByRole('alert')).toHaveTextContent('invalid query')
  expect(calls.sources.mock.calls.every(([, options]) => options.skip)).toBe(true)
  expect(calls.evidence.mock.calls.every(([, options]) => options.skip)).toBe(true)
})
it('shows honest capped totals and bounded next-page navigation', () => {
  state.capped = true; show()
  expect(screen.getByLabelText('Source summary')).toHaveTextContent('UnavailableRecorded sources')
  expect(screen.getByLabelText('Revision source registry')).toHaveTextContent('Partial · total unavailable')
  expect(screen.getByRole('navigation', { name: 'Source pages' })).toHaveTextContent('total unavailable (partial read)')
  expect(screen.getByRole('button', { name: 'Next source page' })).toBeEnabled()
})
it('ignores view state tied to another revision before querying', () => {
  render(<MemoryRouter initialEntries={[base + '&sourceQuery=old&sourcePage=3&sourceId=old-id']}><Harness revisionId="revision-3" /></MemoryRouter>)
  expect(calls.sources.mock.calls.every(([query]) => query.runtimeInstanceId === 'revision-3' && query.page === 1 && query.search !== 'old')).toBe(true)
  expect(screen.getByRole('searchbox', { name: 'Find a source or evidence' })).toHaveValue('')
})

it('presents selected evidence before the unchanged source review form without recording a review', async () => {
  render(<MemoryRouter initialEntries={[base + '&sourceId=source-off-page']}><Harness reviewAuthority={{ canReviewEvidence: false }} /></MemoryRouter>)
  const region = screen.getByRole('region', { name: 'Selected source detail' })
  const fact = within(region).getByText('Evidence only needle')
  const status = within(region).getByText(/Source review · No source verification review is recorded/)
  const user = userEvent.setup()
  await user.click(status)
  const form = within(region).getByRole('form', { name: 'Record source verification review' })
  expect(fact.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(fact.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(within(form).getByRole('button', { name: 'Record source review' })).toBeDisabled()
  expect(calls.record).not.toHaveBeenCalled()
  expect(calls.reviewed).not.toHaveBeenCalled()
})

it('retains a full long registry name in the accessible source selector', () => {
  state.longName = 'Customer Document: controlled-acquisition-fixture-with-a-long-original-filename.txt'
  show()
  const row = screen.getByRole('button', { name: new RegExp(state.longName) })
  expect(within(row).getByText(state.longName)).toBeInTheDocument()
  expect(row).toHaveAttribute('aria-pressed', 'true')
  expect(calls.record).not.toHaveBeenCalled()
})

it('changes source type through the scoped select and preserves bounded query ownership', async () => {
  show(); const user = userEvent.setup()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Source type' }), 'WEBSITE')
  expect(screen.getByLabelText('Route')).toHaveTextContent('sourceType=WEBSITE')
  expect(calls.sources.mock.calls.filter(([query]) => !query.sourceId).at(-1)[0]).toEqual(expect.objectContaining({ sourceType: 'WEBSITE', page: 1, runtimeInstanceId: 'revision-2', tenantId: 'tenant-1' }))
  expect(calls.record).not.toHaveBeenCalled()
})
it('shows three distinct summary counts and never substitutes selected source evidence for whole-revision evidence', () => {
  show('&sourceId=source-off-page')
  const summary = screen.getByLabelText('Source summary')
  expect(summary).toHaveTextContent('UnavailableEvidence objects')
  expect(summary).not.toHaveTextContent('853Evidence objects')
  expect(summary).toHaveTextContent('12Awaiting evidence review')
  expect(screen.getByText(/No source verification review is recorded/)).toBeVisible()
})
it('submits the Sources search with Enter without changing evidence', async () => {
  show(); const user = userEvent.setup()
  await user.type(screen.getByRole('searchbox', { name: 'Find a source or evidence' }), 'needle{Enter}')
  expect(screen.getByLabelText('Route')).toHaveTextContent('sourceQuery=needle')
  expect(calls.record).not.toHaveBeenCalled()
})

it.each([{ active: false }, { stateVersion: null }])('withholds provided Sources summary values when the parent read frame departs %s', props => {
  render(<MemoryRouter initialEntries={[base]}><Harness {...props} evidenceCount={47} sourceSummary={{ uniqueSourceCount: 9, unknownCount: 27 }} /></MemoryRouter>)
  expect(screen.getByLabelText('Source summary')).toHaveTextContent('UnavailableRecorded sourcesUnavailableEvidence objects')
  expect(screen.queryByText('Processing provenance unknown for 27 documents')).not.toBeInTheDocument()
})
it('shows the supplied whole-revision evidence count independently of selected-source contributions', () => {
  render(<MemoryRouter initialEntries={[base]}><Harness evidenceCount={47} sourceSummary={{ uniqueSourceCount: 9 }} /></MemoryRouter>)
  expect(screen.getByLabelText('Source summary')).toHaveTextContent('9Recorded sources47Evidence objects')
  expect(screen.getByLabelText('Revision source registry')).toHaveTextContent('853 recorded evidence')
})
it('opens current source details with provenance without recording a source review', async () => {
  show('&sourceId=source-off-page'); const user = userEvent.setup()
  expect(screen.getByRole('heading', { name: 'Stored website', level: 2 })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Source details', exact: true }))
  expect(calls.open.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({ kind: 'summary-inspection', title: 'Source details and provenance' }))
  expect(calls.record).not.toHaveBeenCalled()
})
it('shows exact recorded evidence text and hands its pair to Review from inspection', async () => {
  show('&sourceId=source-off-page')
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Inspect recorded lineage · Stored website' }))
  const inspection = render(calls.open.mock.calls.at(-1)[0].body)
  expect(within(inspection.container).getByText(object.extractedFact)).toBeInTheDocument()
  await user.click(within(inspection.container).getByRole('button', { name: 'Inspect in Review' }))
  expect(calls.selectView).toHaveBeenCalledWith('Review', undefined, { sourceId: object.sourceId, evidenceObjectId: object.evidenceObjectId })
  expect(calls.record).not.toHaveBeenCalled()
})
it('keeps inspection Review navigation live when opening the dialog rerenders its parent', async () => {
  state.stableEvidence = true
  function Parent() {
    const [inspection, setInspection] = useState(null)
    return <><SourcesView workspaceId="workspace-1" revisionId="revision-2" customerId="customer-1" tenantId="tenant-1"
      active canRead stateVersion={control.stateVersion} locked onOpen={setInspection} onSelectView={calls.selectView} />
      {inspection ? <section aria-label="Evidence inspection">{inspection.body}</section> : null}</>
  }
  render(<MemoryRouter initialEntries={[base + '&sourceId=source-off-page']}><Parent /></MemoryRouter>)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Inspect recorded lineage · Stored website' }))
  const inspection = screen.getByRole('region', { name: 'Evidence inspection' })
  expect(within(inspection).getByText(object.extractedFact)).toBeInTheDocument()
  await user.click(within(inspection).getByRole('button', { name: 'Inspect in Review' }))
  expect(calls.selectView).toHaveBeenCalledWith('Review', undefined, { sourceId: object.sourceId, evidenceObjectId: object.evidenceObjectId })
  expect(calls.record).not.toHaveBeenCalled()
})
it.each(['permission', 'inactive', 'version', 'error', 'fetching', 'session', 'source', 'object'])('rejects captured inspection Review navigation after %s departure', async key => {
  state.stableEvidence = true
  const tree = props => <MemoryRouter initialEntries={[base + '&sourceId=source-off-page']}><Harness {...props} /></MemoryRouter>
  const view = render(tree({}))
  await userEvent.setup().click(screen.getByRole('button', { name: 'Inspect recorded lineage · Stored website' }))
  render(calls.open.mock.calls.at(-1)[0].body)
  const captured = calls.handlers['Inspect in Review']
  expect(captured).toBeTypeOf('function')
  if (key === 'error') state.error = { status: 503 }
  if (key === 'fetching') state.pending = true
  if (key === 'source') state.wrongPair = true
  if (key === 'object') state.stableEvidence = false
  if (key === 'session') calls.session = 2
  else view.rerender(tree(key === 'permission' ? { canRead: false } : key === 'inactive' ? { active: false } : key === 'version' ? { stateVersion: 'rsv2:new' } : {}))
  captured()
  expect(calls.selectView).not.toHaveBeenCalled()
  expect(calls.record).not.toHaveBeenCalled()
})
it('rejects stored inspection navigation after its URL owner changes with the same evidence object', async () => {
  state.stableEvidence = true
  render(<MemoryRouter initialEntries={[base + '&sourceQuery=needle', base + '&sourceId=source-off-page']}><Harness /></MemoryRouter>)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Inspect recorded lineage · Stored website' }))
  render(calls.open.mock.calls.at(-1)[0].body)
  const captured = calls.handlers['Inspect in Review']
  await user.click(screen.getByRole('button', { name: 'Browser Back' }))
  expect(screen.getByLabelText('Route')).toHaveTextContent('sourceQuery=needle')
  captured()
  expect(calls.selectView).not.toHaveBeenCalled()
  expect(calls.record).not.toHaveBeenCalled()
})

it('keeps core provenance qualified and the exact technical basis inspectable',async()=>{
  show('&sourceId=source-off-page');const user=userEvent.setup()
  await user.click(screen.getByRole('button',{name:'Source details',exact:true}))
  const inspection=render(calls.open.mock.calls.at(-1)[0].body)
  expect(within(inspection.container).getByText('Original filename').nextElementSibling).toHaveTextContent('Not supplied')
  expect(within(inspection.container).getByText('Current processing receipt').nextElementSibling).toHaveTextContent('Not supplied')
  expect(within(inspection.container).getByText('Frozen membership').nextElementSibling).toHaveTextContent('Not established')
  const technical=within(inspection.container).getByText('Technical basis').closest('details')
  expect(technical).not.toHaveAttribute('open')
  expect(technical).toHaveTextContent(source.sourceId)
  await user.click(within(inspection.container).getByRole('button',{name:'Open this source'}))
  expect(calls.selectView).toHaveBeenCalledWith('Sources',undefined,undefined)
  expect(calls.record).not.toHaveBeenCalled()
})
it('keeps processing inspection refresh current after its parent rerenders',async()=>{
  function Parent(){const [inspection,setInspection]=useState(null);return <><SourcesView workspaceId="workspace-1" revisionId="revision-2" customerId="customer-1" tenantId="tenant-1" active canRead stateVersion={control.stateVersion} locked sourceSummary={{uniqueSourceCount:9,knownProcessedCount:2,unknownCount:1}} onRefreshSummary={calls.retry} onOpen={setInspection} onSelectView={calls.selectView}/>{inspection?<section aria-label="Processing inspection">{inspection.body}</section>:null}</>}
  render(<MemoryRouter initialEntries={[base]}><Parent/></MemoryRouter>);const user=userEvent.setup()
  fireEvent.click(screen.getByText(/Processing provenance unknown/))
  await user.click(screen.getByRole('button',{name:'Inspect processing history'}))
  const inspection=screen.getByRole('region',{name:'Processing inspection'})
  expect(within(inspection).getByText('Current-content verified receipts').nextElementSibling).toHaveTextContent('2')
  await user.click(within(inspection).getByRole('button',{name:'Refresh processing reads'}))
  expect(calls.retry).toHaveBeenCalled()
  expect(calls.record).not.toHaveBeenCalled()
})
it.each(['permission','inactive','version','session','url'])('rejects captured processing inspection refresh after %s',async key=>{
  const tree=props=><MemoryRouter initialEntries={[base+'&sourceQuery=needle',base+'&sourceId=source-off-page']}><Harness {...props}/></MemoryRouter>
  const view=render(tree({}));const user=userEvent.setup()
  fireEvent.click(document.querySelector('.intelligence-hub__sources-warning > summary'))
  await user.click(screen.getByRole('button',{name:'Inspect processing history'}))
  render(calls.open.mock.calls.at(-1)[0].body)
  const captured=calls.handlers['Refresh processing reads'];expect(captured).toBeTypeOf('function')
  if(key==='session')calls.session=2
  else if(key==='url')await user.click(screen.getByRole('button',{name:'Browser Back'}))
  else view.rerender(tree(key==='permission'?{canRead:false}:key==='inactive'?{active:false}:{stateVersion:'rsv2:new'}))
  captured();expect(calls.retry).not.toHaveBeenCalled();expect(calls.record).not.toHaveBeenCalled()
})

it.each(['permission','inactive','version','session','url','error','fetching'])('rejects captured source inspection navigation after %s',async key=>{
  const tree=props=><MemoryRouter initialEntries={[base+'&sourceQuery=needle',base+'&sourceId=source-off-page']}><Harness {...props}/></MemoryRouter>
  const view=render(tree({}));const user=userEvent.setup()
  await user.click(screen.getByRole('button',{name:'Source details',exact:true}))
  render(calls.open.mock.calls.at(-1)[0].body)
  const captured=calls.handlers['Open this source'];expect(captured).toBeTypeOf('function')
  if(key==='session')calls.session=2
  else if(key==='url')await user.click(screen.getByRole('button',{name:'Browser Back'}))
  else {
    if(key==='error')state.error={status:503}
    if(key==='fetching')state.pending=true
    view.rerender(tree(key==='permission'?{canRead:false}:key==='inactive'?{active:false}:key==='version'?{stateVersion:'rsv2:new'}:{}))
  }
  captured();expect(calls.selectView).not.toHaveBeenCalled();expect(calls.record).not.toHaveBeenCalled()
})

it('registers the current selected source inspector without a parent rerender loop and cleans up on unmount', () => {
  const ready = vi.fn()
  const view = render(<StrictMode><MemoryRouter initialEntries={[base]}><Harness onBasisInspectionReady={ready} /></MemoryRouter></StrictMode>)
  const [registration, available] = ready.mock.calls.at(-1)
  expect(available).toBe(true)
  registration.open(document.body)
  expect(calls.open.mock.calls.at(-1)[0].title).toBe('Source details and provenance')
  view.rerender(<StrictMode><MemoryRouter initialEntries={[base]}><Harness onBasisInspectionReady={ready} /></MemoryRouter></StrictMode>)
  expect(ready.mock.calls.at(-1)[0]).toBe(registration)
  view.unmount()
  calls.open.mockClear()
  registration.open(document.body)
  expect(calls.open).not.toHaveBeenCalled()
  expect(ready.mock.calls.at(-1)).toEqual([registration,false,true])
})
it.each(['permission','inactive','version','error','fetching','session'])('withholds captured View basis after %s departure', key => {
  const ready = vi.fn()
  const tree = props => <MemoryRouter initialEntries={[base]}><Harness onBasisInspectionReady={ready} {...props} /></MemoryRouter>
  const view = render(tree({}))
  const registration = ready.mock.calls.at(-1)[0]
  if (key === 'error') state.error = {status:503}
  if (key === 'fetching') state.pending = true
  if (key === 'session') calls.session++
  view.rerender(tree(key === 'permission' ? {canRead:false} : key === 'inactive' ? {active:false} : key === 'version' ? {stateVersion:'other'} : {}))
  registration.open(document.body)
  expect(calls.open).not.toHaveBeenCalled()
})
it('withholds View basis from multi-source search results', () => {
  const ready = vi.fn()
  render(<MemoryRouter initialEntries={[base+'&sourceQuery=needle']}><Harness onBasisInspectionReady={ready} /></MemoryRouter>)
  expect(ready.mock.calls.at(-1)[1]).toBe(false)
  ready.mock.calls.at(-1)[0].open(document.body)
  expect(calls.open).not.toHaveBeenCalled()
})
it('uses the latest guarded workspace refresh from Source technical basis', () => {
  const refresh = vi.fn(), nextRefresh = vi.fn()
  const tree = props => <MemoryRouter initialEntries={[base]}><Harness onRefreshWorkspace={refresh} {...props} /></MemoryRouter>
  const view = render(tree({}))
  fireEvent.click(screen.getByRole('button',{name:'Source details'}))
  const body = calls.open.mock.calls.at(-1)[0].body
  const inspector = render(body)
  const captured = calls.handlers['Refresh Sources reads']
  view.rerender(tree({onRefreshWorkspace:nextRefresh}))
  captured()
  expect(nextRefresh).toHaveBeenCalledOnce()
  expect(refresh).not.toHaveBeenCalled()
  view.rerender(tree({onRefreshWorkspace:nextRefresh,workspaceRefreshing:true}))
  captured()
  expect(nextRefresh).toHaveBeenCalledOnce()
  view.unmount()
  captured()
  expect(nextRefresh).toHaveBeenCalledOnce()
  inspector.unmount()
})
