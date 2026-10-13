import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import ReviewView from './ReviewView.jsx'

const calls = vi.hoisted(() => ({ session: 1, realHistory: false, handlers: {}, navigate: vi.fn(), source: vi.fn(), decide: vi.fn(), filter: vi.fn(), search: vi.fn(), refresh: vi.fn() }))
vi.mock('../../utils/tokenStorage.js', () => ({ getSessionRevision: () => calls.session, subscribeToSession: () => () => {} }))
vi.mock('../../components/Button', async original => {
  const actual = await original()
  return { ...actual, Button: props => {
    const text = Array.isArray(props.children) ? props.children.filter(child => typeof child === 'string').join('') : props.children
    if (typeof text === 'string') calls.handlers[text] = props.onClick
    return <actual.Button {...props} />
  } }
})
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({ useGetRuntimeStateContradictionHistoryQuery: () => ({error:{status:503},refetch:vi.fn()}) }))
vi.mock('./ContradictionHistoryInspector.jsx', async original => {
  const ActualInspector=(await original()).default
  return {default:props=>calls.realHistory ? <ActualInspector {...props} /> : <button disabled={props.disabled}>View recorded decisions</button>}
})
const scope = { runtimeInstanceId: 'revision-1', customerId: 'customer-1', tenantId: 'tenant-1' }
const evidence = { evidenceObjectId: 'evidence-1', sourceId: 'source-1', extractedFact: 'The exact full recorded statement.', reviewStatus: 'ACCEPTED' }
const finding = { id: 'contradiction-1', type: 'Contradiction', domain: 'Company', basis: 'Two recorded statements disagree.', status: 'UNREVIEWED', evidence: [evidence], evidencePairHash: `sha256:${'a'.repeat(64)}` }
const base = { scope, stateVersion: 'current-version', canInspect: true, evidencePage: { evidenceObjects: [evidence], sourceRegistry: [{ sourceId: 'source-1', label: 'Customer interview' }] }, isLoading: false, evidenceStatusCounts: { accepted: 1, pending: 0 }, filter: 'All', page: 1, query: '', actions: { canReviewEvidence: true, decideEvidence: calls.decide }, findings: [finding], onSelectView: calls.navigate, onOpenSource: calls.source, onFilterChange: calls.filter, onSearch: calls.search, onRefresh: calls.refresh }
beforeEach(() => { vi.clearAllMocks(); calls.session = 1; calls.realHistory=false; calls.handlers = {} })
const show = changes => render(<ReviewView {...base} {...changes} />)

it('combines real evidence and bounded contradictions without fabricating unsupported types or full totals', () => {
  show()
  expect(screen.getByText('2 loaded items · bounded subset')).toBeInTheDocument()
  const select = screen.getByRole('combobox', {name:'Quality finding type'})
  for (const name of ['Missing coverage','Weak confidence','Duplicate source']) expect(within(select).getByRole('option',{name})).toBeDisabled()
  expect(screen.getByText(/up to eight contradiction candidates only/)).toBeInTheDocument()
})
it('opens supporting, history and contextual inspection and preserves recorded text and exact source navigation', async () => {
  const user = userEvent.setup(); show()
  await user.click(screen.getByRole('button',{name:'Supporting evidence'}))
  const support = screen.getByRole('dialog',{name:'Supporting evidence and provenance'})
  expect(within(support).getByText(evidence.extractedFact)).toBeInTheDocument()
  await user.click(within(support).getByRole('button',{name:'Inspect this item\'s history'}))
  expect(screen.getByRole('dialog',{name:'Item decision history'})).toHaveTextContent('Per-item evidence decision history is not supplied')
  await user.click(screen.getByRole('button',{name:'Return to Review'}))
  await user.click(screen.getByRole('button',{name:'Detailed inspection'}))
  await user.click(within(screen.getByRole('dialog',{name:'Contextual inspection'})).getByRole('button',{name:'Open source'}))
  expect(calls.source).toHaveBeenCalledWith('source-1','evidence-1')
})
it('routes contradiction decisions to the existing governed owner and offers its history only with an exact pair hash', async () => {
  const user=userEvent.setup();show()
  await user.click(screen.getByRole('button',{name:/Company contradiction/}))
  await user.click(screen.getByRole('radio',{name:'Not an issue'}))
  await user.type(screen.getByRole('textbox',{name:'Decision rationale'}),'Preview of the exact recorded pair only.')
  await user.click(screen.getByRole('button',{name:'Review Quality decision'}))
  expect(screen.getByRole('dialog',{name:'Confirm Quality disposition'})).toHaveTextContent('local preview cannot record')
  expect(screen.getByRole('button',{name:'Confirm decision'})).toBeDisabled()
  await user.click(screen.getByRole('button',{name:'Open governed Quality'}))
  expect(calls.navigate).toHaveBeenCalledWith('Intelligence Quality',undefined,{findingId:'contradiction-1'})
  await user.click(screen.getByRole('button',{name:'Return to Review'}))
  await user.click(screen.getByRole('button',{name:'Decision history'}))
  expect(screen.getByRole('button',{name:'View recorded decisions'})).toBeEnabled()
  expect(calls.decide).not.toHaveBeenCalled()
})
it.each(['Evidence needing review','Quality awaiting a decision','Confirmed issues','Completed decisions'])('projects the %s filter without inventing decisions', label => {
  show({findings:[finding,{...finding,id:'confirmed',status:'CONFIRMED'},{...finding,id:'resolved',status:'NOT_CONTRADICTORY'}]})
  fireEvent.click(screen.getByRole('button',{name:label}))
  expect(calls.filter).toHaveBeenCalledWith(label==='Evidence needing review'?'Needs review':'All')
  const queue=screen.getByRole('region',{name:'Evidence candidate queue'})
  expect(queue.textContent).not.toContain('Duplicate source')
  expect(calls.decide).not.toHaveBeenCalled()
})
it('retains full evidence paging separately from the loaded mixed queue', () => {
  show({pagination:<nav aria-label="Evidence pages">Page 2 of 4</nav>})
  expect(screen.getByRole('navigation',{name:'Evidence pages'})).toHaveTextContent('Page 2 of 4')
})
it.each(['version','scope','permission','session','unmount','loading','error'])('blocks captured evidence actions and dialogs after %s departure', kind => {
  const view=show();fireEvent.click(screen.getByRole('button',{name:'Supporting evidence'}))
  const source=calls.handlers['Open source'], decision=calls.handlers['Reject evidence'], route=calls.handlers['Sources']
  if(kind==='unmount')view.unmount()
  else {
    if(kind==='session')calls.session++
    view.rerender(<ReviewView {...base} {...(kind==='version'?{stateVersion:'new'}:kind==='scope'?{scope:{...scope,tenantId:'new'}}:kind==='permission'?{canInspect:false}:kind==='loading'?{isLoading:true}:kind==='error'?{error:{status:503}}:{})} />)
    if(kind!=='loading'&&kind!=='error')expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  }
  source();decision();route()
  expect(calls.source).not.toHaveBeenCalled();expect(calls.decide).not.toHaveBeenCalled();expect(calls.navigate).not.toHaveBeenCalled()
})
it('records only the existing evidence rejection and acceptance commands with current authority', () => {
  show();fireEvent.click(screen.getByRole('button',{name:'Reject evidence'}))
  expect(calls.decide).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Confirm rejection'}))
  expect(calls.decide).toHaveBeenCalledWith('evidence-1','REJECTED')
  expect(screen.getByRole('button',{name:'Accept evidence'})).toBeDisabled()
  expect(screen.queryByRole('button',{name:'Unaccept evidence'})).not.toBeInTheDocument()
})
it.each(['permission','version','lock','busy','session','unmount'])('rejects captured evidence confirmation after %s departure', kind => {
  const view=show();fireEvent.click(screen.getByRole('button',{name:'Reject evidence'}))
  const confirm=calls.handlers['Confirm rejection']
  if(kind==='unmount')view.unmount()
  else {
    if(kind==='session')calls.session++
    view.rerender(<ReviewView {...base} {...(kind==='permission'?{actions:{...base.actions,canReviewEvidence:false}}:kind==='version'?{stateVersion:'new'}:kind==='lock'?{locked:true}:kind==='busy'?{actions:{...base.actions,busy:true}}:{})} />)
  }
  confirm();expect(calls.decide).not.toHaveBeenCalled()
})
it('never dispatches a captured evidence confirmation twice', () => {
  show();fireEvent.click(screen.getByRole('button',{name:'Reject evidence'}))
  const confirm=calls.handlers['Confirm rejection'];act(()=>{confirm();confirm()})
  expect(calls.decide).toHaveBeenCalledOnce()
})
it('clears local Quality preview drafts on owner departure and blocks unsupported dispositions', async () => {
  const user=userEvent.setup();const view=show({evidencePage:{...base.evidencePage,evidenceObjects:[]}})
  expect(screen.getByRole('radio',{name:'Deferred'})).toBeDisabled()
  expect(screen.getByRole('radio',{name:'Request more evidence'})).toBeDisabled()
  await user.click(screen.getByRole('radio',{name:'Reopened'}))
  await user.type(screen.getByRole('textbox',{name:'Decision rationale'}),'A local preview, without recording a decision.')
  view.rerender(<ReviewView {...base} evidencePage={{...base.evidencePage,evidenceObjects:[]}} stateVersion="other" />)
  view.rerender(<ReviewView {...base} evidencePage={{...base.evidencePage,evidenceObjects:[]}} />)
  expect(screen.getByRole('textbox',{name:'Decision rationale'})).toHaveValue('')
  expect(screen.getByRole('button',{name:'Review Quality decision'})).toBeDisabled()
})
it.each(['loading','missing','error'])('keeps read failures and absent populations explicit (%s)', kind => {
  show({...kind==='loading'?{isLoading:true}:kind==='error'?{error:{status:503}}:{evidencePage:null},findings:null})
  expect(screen.getByRole('region',{name:'Evidence candidate queue'})).toHaveTextContent(kind==='loading'?'Loading review items':kind==='error'?'could not be loaded':'unavailable')
  expect(screen.getByText(/Current finding decisions unavailable/)).toBeInTheDocument()
})
it('submits scoped search through Enter and rejects control characters', () => {
  show();const input=screen.getByRole('searchbox',{name:'Find a review item'})
  fireEvent.change(input,{target:{value:'  evidence  '}});fireEvent.submit(input.closest('form'))
  expect(calls.search).toHaveBeenCalledWith('evidence')
  calls.search.mockClear();fireEvent.change(input,{target:{value:'bad\u0001value'}});fireEvent.submit(input.closest('form'))
  expect(calls.search).not.toHaveBeenCalled()
})
it.each(['permission','scope','version','pair','session'])('never resurrects an inspector after %s departure and return', kind => {
  const view=show({evidencePage:{...base.evidencePage,evidenceObjects:[]}})
  fireEvent.click(screen.getByRole('button',{name:'Supporting evidence'}))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  const changes=kind==='permission'?{canInspect:false}:kind==='scope'?{scope:{...scope,tenantId:'other'}}:kind==='version'?{stateVersion:'other'}:kind==='pair'?{findings:[{...finding,evidencePairHash:`sha256:${'b'.repeat(64)}`}]}:{}
  if(kind==='session')calls.session++
  view.rerender(<ReviewView {...base} evidencePage={{...base.evidencePage,evidenceObjects:[]}} {...changes} />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  if(kind==='session')calls.session=1
  view.rerender(<ReviewView {...base} evidencePage={{...base.evidencePage,evidenceObjects:[]}} />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('keeps an old inspector closed after a filter roundtrip', () => {
  show();fireEvent.click(screen.getByRole('button',{name:'Supporting evidence'}))
  fireEvent.click(screen.getByRole('button',{name:'Confirmed issues'}))
  fireEvent.click(screen.getByRole('button',{name:'All',exact:true}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it.each(['return','escape'])('restores the current opener after native dialog unmount (%s)', kind => {
  show();const trigger=screen.getByRole('button',{name:'Supporting evidence'})
  fireEvent.click(trigger)
  if(kind==='return')fireEvent.click(screen.getByRole('button',{name:'Return to Review'}))
  else fireEvent(screen.getByRole('dialog'),new Event('cancel',{bubbles:true,cancelable:true}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(document.activeElement).toBe(trigger)
})
it('isolates real nested history Escape from its parent inspection and restores each opener after unmount', async () => {
  calls.realHistory=true;const user=userEvent.setup();show({evidencePage:{...base.evidencePage,evidenceObjects:[]}})
  const parentTrigger=screen.getByRole('button',{name:'Decision history'})
  await user.click(parentTrigger)
  const childTrigger=screen.getByRole('button',{name:'View recorded decisions'})
  await user.click(childTrigger)
  fireEvent(screen.getByRole('dialog',{name:'Recorded contradiction decisions'}),new Event('cancel',{bubbles:true,cancelable:true}))
  expect(screen.getByRole('dialog',{name:'Item decision history'})).toBeInTheDocument()
  expect(screen.queryByRole('dialog',{name:'Recorded contradiction decisions'})).not.toBeInTheDocument()
  expect(document.activeElement).toBe(childTrigger)
  await user.click(screen.getByRole('button',{name:'Return to Review'}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(document.activeElement).toBe(parentTrigger)
})
