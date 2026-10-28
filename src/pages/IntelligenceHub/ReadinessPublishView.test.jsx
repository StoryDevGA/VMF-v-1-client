import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ReadinessPublishView from './ReadinessPublishView.jsx'

const calls=vi.hoisted(()=>({ session:1, navigate:vi.fn(), refresh:vi.fn(), report:vi.fn(), handlers:{} }))
vi.mock('../../utils/tokenStorage.js',()=>({ getSessionRevision:()=>calls.session, subscribeToSession:()=>()=>{} }))
vi.mock('../../components/Button',async original=>{
  const actual=await original()
  return {...actual,Button:props=>{
    const text=Array.isArray(props.children)?props.children.filter(child=>typeof child==='string').join(''):props.children
    if(typeof text==='string')calls.handlers[text]=props.onClick
    return <actual.Button {...props}/>
  }}
})
const base={scope:{revisionId:'revision-1',customerId:'customer-1',tenantId:'tenant-1'},stateVersion:'version-1',locked:false,active:true,canInspect:true,
  inventoryStatus:'Complete current inventory',reviewStatus:'Stale receipt',evidenceDetails:<p>47 of 47 real evidence records</p>,interpretationDetails:<p>Actual current section readiness</p>,
  publicationDetails:<p>Frozen membership unavailable</p>,completionDetails:<p>Read-only completion receipt</p>,diagnostics:<p>Recorded Partially Ready</p>,structureHref:'/app/workspace-structure?revisionId=revision-1',
  onSelectView:calls.navigate,onRefresh:calls.refresh,onReport:calls.report,refreshing:false}
const tree=changes=><MemoryRouter><ReadinessPublishView {...base} {...changes}/></MemoryRouter>
const show=changes=>render(tree(changes))
beforeEach(()=>{vi.clearAllMocks();calls.session=1;calls.handlers={}})

it('keeps evidence, interpretation, publication checks and human decisions separate',()=>{
  show()
  expect(screen.getAllByRole('heading',{level:2}).map(e=>e.textContent)).toEqual(['Evidence available','Interpretation current','What needs attention','Publication checks','Human decisions'])
  expect(within(screen.getByRole('region',{name:'Publication checks'})).getAllByText('Not verified')).toHaveLength(4)
  expect(screen.getByText('Stale receipt')).toBeInTheDocument()
  expect(screen.getAllByText('Record not supplied')).toHaveLength(2)
  expect(screen.queryByRole('button',{name:/Publish|Lock|Authorise|Accept/})).not.toBeInTheDocument()
  expect(screen.getByRole('link',{name:'Open Workspace Home'})).toHaveAttribute('href','/app/runtime/revision-1#workspace-lifecycle-actions')
})
it('opens live evidence details and advanced anchors without inferring approval',async()=>{
  const user=userEvent.setup();show()
  await user.click(screen.getByRole('button',{name:'Inspect evidence readiness'}))
  const dialog=screen.getByRole('dialog',{name:'Detailed evidence readiness'})
  expect(dialog).toHaveTextContent('47 of 47 real evidence records')
  expect(dialog).toHaveTextContent('Actual current section readiness')
  await user.click(within(dialog).getByText('Advanced evidence inspection',{selector:'summary'}))
  expect(within(dialog).getByText('Frozen membership unavailable')).toBeVisible()
  await user.click(within(dialog).getByRole('button',{name:'Open evidence readiness'}))
  expect(calls.navigate).toHaveBeenCalledWith('Evidence readiness')
})
it('retains real receipt metadata behind Advanced inspection and updates it with current reads',async()=>{
  const user=userEvent.setup();const view=show({advancedEvidenceDetails:<p>Exact inventory receipt hash</p>})
  await user.click(screen.getByRole('button',{name:'Inspect evidence readiness'}))
  expect(screen.getByText('Exact inventory receipt hash')).not.toBeVisible()
  await user.click(screen.getByText('Advanced evidence inspection',{selector:'summary'}))
  expect(screen.getByText('Exact inventory receipt hash')).toBeVisible()
  view.rerender(tree({advancedEvidenceDetails:<p>Receipt unavailable during current read</p>}))
  expect(screen.queryByText('Exact inventory receipt hash')).not.toBeInTheDocument()
  expect(screen.getByText('Receipt unavailable during current read')).toBeVisible()
})
it.each([0,1,2,3])('publication check %s opens the same qualified basis inspector',async index=>{
  const user=userEvent.setup();show()
  await user.click(within(screen.getByRole('region',{name:'Publication checks'})).getAllByRole('button',{name:'Inspect'})[index])
  expect(screen.getByRole('dialog')).toHaveTextContent('Exact publication basis')
  expect(screen.getByRole('dialog')).toHaveTextContent('No publication approval is implied.')
})
it.each([['Exception disclosure',0,'No governed exception disclosure'],['Publication authorisation',1,'A governed grant']])('inspects %s without creating a control',async(name,index,text)=>{
  const user=userEvent.setup();show()
  await user.click(within(screen.getByRole('region',{name:'Human decisions'})).getAllByRole('button',{name:'Inspect'})[index])
  expect(screen.getByRole('dialog')).toHaveTextContent(text)
  if(index===1)expect(within(screen.getByRole('dialog')).getByRole('link',{name:'Open Workspace Home'})).toHaveAttribute('href','/app/runtime/revision-1#workspace-lifecycle-actions')
})
it('assurance does not equate completion with certification',async()=>{
  const user=userEvent.setup();show();await user.click(screen.getByRole('button',{name:'Inspect assurance'}))
  expect(screen.getByRole('dialog')).toHaveTextContent('Certification is separate')
  expect(screen.getByRole('dialog')).toHaveTextContent('do not certify intelligence')
})
it('preserves a supplied certification projection without treating it as approval',async()=>{
  const user=userEvent.setup();show({certificationLabel:'Recorded certification label',certificationSummary:'Exact recorded summary'})
  expect(screen.getByText('Intelligence certification · Recorded certification label')).toBeInTheDocument()
  await user.click(screen.getByRole('button',{name:'Inspect assurance'}))
  expect(screen.getByRole('dialog')).toHaveTextContent('Exact recorded summary')
  expect(screen.getByRole('dialog')).toHaveTextContent('separate from human completion and publication approval')
})
it('withholds retained certification when current inspection authority departs',()=>{
  const view=show({certificationLabel:'Retained certificate'});fireEvent.click(screen.getByRole('button',{name:'Inspect assurance'}))
  view.rerender(tree({certificationLabel:'Retained certificate',canInspect:false}))
  expect(screen.queryByText(/Retained certificate/)).not.toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('updates open inspectors from current supplied details and restores opener after close',async()=>{
  const user=userEvent.setup();const view=show()
  await user.click(screen.getByRole('button',{name:'Inspect evidence readiness'}))
  view.rerender(tree({evidenceDetails:<p>New scoped evidence read</p>}))
  expect(screen.getByRole('dialog')).toHaveTextContent('New scoped evidence read')
  expect(screen.getByRole('dialog')).not.toHaveTextContent('47 of 47')
  await user.click(screen.getByRole('button',{name:'Return to Readiness & publish'}))
  expect(screen.getByRole('button',{name:'Inspect evidence readiness'})).toHaveFocus()
})
it.each(['version','scope','session','lock','inactive','permission','unmount'])('rejects captured inspector/navigation/refresh/report after %s departure',kind=>{
  const view=show();fireEvent.click(screen.getByRole('button',{name:'Inspect evidence readiness'}))
  const navigate=calls.handlers['Open evidence readiness'],open=calls.handlers['Inspect evidence readiness']
  fireEvent.click(screen.getByText('Current readiness read basis',{selector:'summary'}))
  const refresh=calls.handlers['Refresh readiness reads'],report=calls.handlers['Preview assurance report']
  if(kind==='unmount')view.unmount()
  else {if(kind==='session')calls.session++;view.rerender(tree(kind==='version'?{stateVersion:'new'}:kind==='scope'?{scope:{...base.scope,tenantId:'new'}}:kind==='lock'?{locked:true}:kind==='inactive'?{active:false}:kind==='permission'?{canInspect:false}:{}))}
  navigate();open({currentTarget:null});refresh();report({currentTarget:null})
  expect(calls.navigate).not.toHaveBeenCalled();expect(calls.refresh).not.toHaveBeenCalled();expect(calls.report).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('does not resurrect an inspector after leaving and returning to the same scope',()=>{
  const view=show();fireEvent.click(screen.getByRole('button',{name:'Inspect assurance'}))
  view.rerender(tree({active:false}));view.rerender(tree())
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('retains read-only navigation on locked revisions and does not submit a governance command',async()=>{
  const user=userEvent.setup();show({locked:true})
  await user.click(screen.getByRole('button',{name:'Go to completion'}));expect(calls.navigate).toHaveBeenLastCalledWith('Review')
  await user.click(screen.getByRole('button',{name:'After lock',exact:true}));expect(calls.navigate).toHaveBeenLastCalledWith('After lock')
  expect(screen.getByRole('link',{name:'Open Workspace Home'})).toHaveAttribute('href','/app/runtime/revision-1#workspace-lifecycle-actions')
})
it('preserves advanced diagnostics and suppresses refresh while current reads are fetching',async()=>{
  const user=userEvent.setup();show({refreshing:true,inventoryStatus:'Loading…',reviewStatus:'Unavailable'})
  expect(screen.getByText('Loading…')).toBeInTheDocument()
  await user.click(screen.getByText('Current readiness read basis',{selector:'summary'}))
  expect(screen.getByText('Recorded Partially Ready')).toBeVisible()
  expect(screen.getByRole('button',{name:'Refresh readiness reads'})).toBeDisabled()
})
