import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import AfterLockView from './AfterLockView.jsx'

const calls=vi.hoisted(()=>({session:1,navigate:vi.fn(),refresh:vi.fn(),handlers:{},registration:null}))
vi.mock('../../utils/tokenStorage.js',()=>({getSessionRevision:()=>calls.session,subscribeToSession:()=>()=>{}}))
vi.mock('../../components/Button',async original=>{
  const actual=await original()
  return {...actual,Button:props=>{const text=Array.isArray(props.children)?props.children.filter(c=>typeof c==='string').join(''):props.children
    if(typeof text==='string')calls.handlers[text]=props.onClick
    return <actual.Button {...props}/>}}
})
const lock={available:true,locked:true,lockedAt:'2026-09-17T18:14:00Z',lockedBy:'actor-1',lockVersion:1,stateVersion:'version-1',readAt:'2026-10-12T12:00:00Z',snapshot:{snapshotId:'exact-snapshot',snapshotHash:'actual-hash',contractVersion:'runtime-truth-snapshot-v1'},replay:{available:false}}
const base={scope:{workspaceId:'workspace-1',revisionId:'revision-1',customerId:'customer-1',tenantId:'tenant-1'},stateVersion:'version-1',route:'view=after-lock',active:true,canInspect:true,lockBasisLoading:false,lockBasis:lock,renderer:{revision:{revisionNumber:3},publish:{state:'PUBLISHED',outputEligibility:{outputEligible:true}},readiness:{state:'LOCKED'}},refreshing:false,onSelectView:calls.navigate,onRefresh:calls.refresh,onBasisInspectionReady:(registration,available,departing)=>{if(departing&&calls.registration!==registration)return;calls.registration=departing?null:registration}}
const tree=changes=><AfterLockView {...base} {...changes}/>
const show=changes=>render(tree(changes))
beforeEach(()=>{vi.clearAllMocks();calls.session=1;calls.handlers={};calls.registration=null})
it('uses captured locked state without fictional inbox, price or approval records',()=>{
  show();expect(screen.getByRole('status',{name:'Post-lock discovery inbox'})).toHaveTextContent('Post-lock inbox not supplied')
  expect(screen.getByText('This is not a zero-item result.')).toBeInTheDocument()
  expect(screen.queryByText(/GBP|Monthly price|0 items/)).not.toBeInTheDocument()
  expect(screen.queryByRole('button',{name:/Approve|Save decision|Updated revision/})).not.toBeInTheDocument()
})
it.each([['missing',{available:false,locked:false,reason:'LOCK_NOT_RECORDED'},false,'After-lock review not active'],['failed',{available:false,reason:'LOCK_STATE_INVALID'},false,'Lock basis unavailable'],['incomplete',{available:false,locked:true},false,'Lock basis unavailable'],['pending',lock,true,'Checking lock basis']])('qualifies %s lock state',(_,lockBasis,lockBasisLoading,title)=>{
  show({lockBasis,lockBasisLoading});expect(screen.getByRole('status',{name:'Post-lock discovery inbox'})).toHaveTextContent(title)
  expect(screen.queryByText(/R3 is frozen/)).not.toBeInTheDocument()
})
it.each(['Why this is separate','Inspect basis and history','header'])('opens the same actual basis through %s',async name=>{
  show();if(name==='header')act(()=>calls.registration.open(document.body));else await userEvent.click(screen.getByRole('button',{name,exact:true}))
  const dialog=await screen.findByRole('dialog',{name:'After-lock basis and impact history'})
  expect(within(dialog).getByRole('combobox',{name:'Record'})).toHaveValue('after-lock')
  expect(within(dialog).getAllByRole('option')).toHaveLength(1)
  expect(dialog).toHaveTextContent('Recorded locked R3');expect(dialog).toHaveTextContent('frozen membership not recorded')
})
it('preserves qualified real metadata behind Advanced and strips retained failed reads',async()=>{
  const view=show();await userEvent.click(screen.getByText('Recorded lock read basis',{selector:'summary'}))
  const region=screen.getByRole('region',{name:'Recorded lock basis'});expect(region).toHaveTextContent('exact-snapshot');expect(region).toHaveTextContent('have not been independently verified')
  expect(screen.getByText(/Recorded output eligibility: Eligible/)).toBeVisible()
  view.rerender(tree({lockBasis:{available:false,reason:'LOCK_STATE_INVALID'}}));expect(region).not.toHaveTextContent('exact-snapshot')
})
it.each([{stateVersion:'version-2'},{route:'view=after-lock&sourceId=new'},{scope:{...base.scope,customerId:'customer-2'}},{canInspect:false},{active:false},{lockBasisLoading:true},{lockBasis:{available:false,reason:'LOCK_STATE_INVALID'}}])('rejects departing ownership and never resurrects its dialog %j',changes=>{
  const view=show();fireEvent.click(screen.getByRole('button',{name:'Why this is separate'}))
  const retained=calls.handlers['Review evidence'],registration=calls.registration
  view.rerender(tree(changes));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();retained();registration.open(document.body);expect(calls.navigate).not.toHaveBeenCalled()
  view.rerender(tree());expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('rejects session departure and unmounted callbacks',()=>{
  const view=show();fireEvent.click(screen.getByRole('button',{name:'Why this is separate'}));const handler=calls.handlers['Review evidence'],registration=calls.registration
  calls.session=2;handler();registration.open(document.body);expect(calls.navigate).not.toHaveBeenCalled();view.unmount();handler();expect(calls.navigate).not.toHaveBeenCalled();expect(calls.registration).toBeNull()
})
it('rejects an obsolete same-owner render callback',()=>{
  const view=show();const retained=calls.handlers['Gather separate evidence'];view.rerender(tree());retained();expect(calls.navigate).not.toHaveBeenCalled()
})
it('restores focus only after closing the owned dialog',async()=>{
  const user=userEvent.setup();show();const opener=screen.getByRole('button',{name:'Why this is separate'});await user.click(opener)
  await user.click(screen.getByRole('button',{name:'Back to After lock'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(opener).toHaveFocus()
})
it('uses read-only current navigation for Context, Review, readiness and coverage',async()=>{
  const user=userEvent.setup();show();await user.click(screen.getByRole('button',{name:'Gather separate evidence',exact:true}));expect(calls.navigate).toHaveBeenLastCalledWith('Context')
  await user.click(screen.getByRole('button',{name:'Readiness & publish',exact:true}));expect(calls.navigate).toHaveBeenLastCalledWith('Readiness & publish')
  await user.click(screen.getByRole('button',{name:'Coverage',exact:true}));expect(calls.navigate).toHaveBeenLastCalledWith('Coverage')
  await user.click(screen.getByRole('button',{name:'Inspect basis and history'}));await user.click(screen.getByRole('button',{name:'Review evidence'}));expect(calls.navigate).toHaveBeenLastCalledWith('Review')
})
it('blocks retained refresh while busy',()=>{
  const view=show();const retained=calls.handlers['Refresh lock reads'];view.rerender(tree({refreshing:true}));retained();expect(calls.refresh).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Refresh lock reads',hidden:true})).toBeDisabled()
})
