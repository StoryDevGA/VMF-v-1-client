import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import SourcesView from './SourcesView.jsx'
import { StrictMode } from 'react'

const calls = vi.hoisted(() => ({ sources: vi.fn(), evidence: vi.fn(), retry: vi.fn(), open: vi.fn(), selectView: vi.fn(), session: 1, browse: null, handlers: {} }))
vi.mock('../../utils/tokenStorage.js', () => ({ getSessionRevision: () => calls.session, subscribeToSession: () => () => {} }))
vi.mock('../../components/Button', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, Button: props => {
    if (props.children === 'Browse all evidence from this source') calls.browse = props.onClick
    const label = Array.isArray(props.children) ? props.children.filter(child => typeof child === 'string').join('') : props.children
    if (typeof label === 'string') calls.handlers[label] = props.onClick
    return <actual.Button {...props} />
  } }
})
let state
const control = { id: 'revision-2', runtimeInstanceKey: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', stateVersion: 'rsv2:source-basis' }
const source = { sourceId: 'source-off-page', label: 'Stored website', sourceType: 'WEBSITE', evidenceObjectCount: 853, acquisitionStatus: 'ACQUIRED' }
const object = { evidenceObjectId: 'evidence-off-page', sourceId: source.sourceId, extractedFact: 'Evidence only needle', reviewStatus: 'PENDING' }
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetRuntimeStateSourcesQuery: (query, options) => {
    calls.sources(query, options)
    if (options.skip) return { refetch: calls.retry }
    const selectedSource = { ...source, evidenceObjectCount: state.empty ? 0 : state.unknownCount ? null : source.evidenceObjectCount, evidenceCountCapped: Boolean(state.cappedCount) }
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
      evidenceObjects: state.empty ? [] : [{ ...object, title: state.title, sourceId: state.wrongPair ? 'wrong-source' : object.sourceId }],
      sourceRegistry: [source], total: state.empty ? 0 : query.evidenceObjectId || query.search ? 1 : 853,
      totalPages: query.evidenceObjectId || query.search ? 1 : 35, pageSize: 25 }
    return { currentData: state.missing ? undefined : { data }, data: { data }, refetch: calls.retry, isFetching: state.pending, error: state.error }
  },
}))
const context = 'workspace-1:revision-2:customer-1:tenant-1'
const base = `/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources&sourceContext=${encodeURIComponent(context)}`
function Harness({ revisionId = 'revision-2', active = true, canRead = true, stateVersion = control.stateVersion }) {
  const location = useLocation()
  const navigate = useNavigate()
  return <><SourcesView workspaceId="workspace-1" revisionId={revisionId} customerId="customer-1" tenantId="tenant-1"
    active={active} canRead={canRead} stateVersion={stateVersion} locked pendingCount={12} onOpen={calls.open} onSelectView={calls.selectView} />
    <output aria-label="Route">{location.search}</output><button onClick={() => navigate(-1)}>Browser Back</button></>
}
const show = (suffix = '') => render(<MemoryRouter initialEntries={[base + suffix]}><Harness /></MemoryRouter>)
beforeEach(() => { state = {}; calls.session = 1; calls.handlers = {}; vi.clearAllMocks() })
it.each([null, undefined, '', 'rsv2:wrong-basis'])('withholds Source rows and handoffs without matching parent basis (%s)', version => {
  render(<MemoryRouter initialEntries={[base]}><Harness stateVersion={version === undefined ? null : version} /></MemoryRouter>)
  expect(screen.queryByText('Evidence only needle')).not.toBeInTheDocument()
  expect(screen.queryByText('Stored website')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Source summary')).toHaveTextContent('UnavailableUnique sources')
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
  const names = ['Next source page', 'Next evidence page', 'Open in Review →', 'Inspect recorded lineage · Stored website', '← Context', 'Continue to Review →', 'Website', 'Retry source reads', 'Return to search results', 'Clear search']
  const captured = names.map(name => { expect(calls.handlers[name]).toBeTypeOf('function'); return calls.handlers[name] })
  if (key === 'error') state.error = { status: 503 }
  if (key === 'fetching') state.pending = true
  if (key === 'session') calls.session = 2
  else view.rerender(tree(key === 'permission' ? { canRead: false } : key === 'inactive' ? { active: false } : key === 'version' ? { stateVersion: 'rsv2:new' } : {}))
  const before = screen.getByLabelText('Route').textContent
  captured.forEach(callback => callback({ currentTarget: document.body }))
  expect(screen.getByLabelText('Route').textContent).toBe(before)
  expect(calls.open).not.toHaveBeenCalled()
  expect(calls.selectView).not.toHaveBeenCalled()
  expect(calls.retry).not.toHaveBeenCalled()
})
it('allows current scoped search and retry recovery after failed dependent read', async () => {
  state.error = { status: 503 }; show(); const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: 'Search all sources and evidence' }), 'recovery')
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
  expect(screen.getByText('Governed evidence classification and domain are unavailable in this read. A title or acceptance decision does not establish either.')).toBeInTheDocument()
  expect(screen.queryByText('Evidence classification unavailable', { exact: true })).not.toBeInTheDocument()
  expect(screen.getByText('Needs Review', { exact: true })).toBeInTheDocument()
})
it('reads a source registry independently and shows actual contributions', () => {
  show()
  expect(within(screen.getByLabelText('Revision source registry')).getByText('853')).toBeInTheDocument()
  expect(screen.getByLabelText('Source summary')).toHaveTextContent('61Unique sources')
  expect(screen.getByText('Locked revision · inspection is read-only.')).toBeInTheDocument()
  expect(calls.sources).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 25, runtimeInstanceId: 'revision-2', tenantId: 'tenant-1' }), { skip: false })
})
it('global evidence-only search does not depend on a source-text match', async () => {
  show(); const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: 'Search all sources and evidence' }), 'needle')
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
  expect(screen.getByLabelText('Source summary')).toHaveTextContent('UnavailableUnique sources')
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
  expect(screen.getByLabelText('Source summary')).toHaveTextContent('Partial · total unavailable')
  expect(screen.getByRole('navigation', { name: 'Source pages' })).toHaveTextContent('total unavailable (partial read)')
  expect(screen.getByRole('button', { name: 'Next source page' })).toBeEnabled()
})
it('ignores view state tied to another revision before querying', () => {
  render(<MemoryRouter initialEntries={[base + '&sourceQuery=old&sourcePage=3&sourceId=old-id']}><Harness revisionId="revision-3" /></MemoryRouter>)
  expect(calls.sources.mock.calls.every(([query]) => query.runtimeInstanceId === 'revision-3' && query.page === 1 && query.search !== 'old')).toBe(true)
  expect(screen.getByRole('textbox', { name: 'Search all sources and evidence' })).toHaveValue('')
})
