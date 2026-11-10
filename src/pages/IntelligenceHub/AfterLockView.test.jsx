import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import AfterLockView from './AfterLockView.jsx'

const calls=vi.hoisted(()=>({session:1,navigate:vi.fn(),refresh:vi.fn(),handlers:{},registration:null,history:vi.fn()}))
vi.mock('react-redux',()=>({useSelector:()=>({id:'a'.repeat(24)})}))
vi.mock('./PostLockSubmissionPanel.jsx',()=>({PostLockMaterial:()=>null}))
vi.mock('./PostLockEvidenceHistory.jsx',()=>({default:props=>{calls.history(props);return null}}))
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
  show();expect(screen.getByRole('status',{name:'Post-lock discovery inbox'})).toHaveTextContent('Saved evidence availability unverified')
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

const unavailableCapability = reason => ({ contractVersion: 'post-lock-evidence-intake-capability.v1', available: false, reason, blockedBy: [reason] })
const operationalCapability = reason => ({ state: 'VERIFIED', data: { readAt: '2026-11-06T22:00:00.000Z',
  recording: { eligibility: reason ? 'BLOCKED' : 'ELIGIBLE_AS_READ', blockedBy: reason ? [reason] : [],
    checks: { storageIndexes: reason === 'POST_LOCK_INDEX_REQUIRED' ? 'MISMATCH' : reason ? 'NOT_CHECKED' : 'VERIFIED_AS_WRITER' } } } })
it.each([
  ['FROZEN_MEMBERSHIP_NOT_RECORDED', 'exact frozen evidence membership was not recorded'],
  ['POST_LOCK_POLICY_NOT_RECORDED', 'no recorded post-lock policy'],
  ['POST_LOCK_POLICY_UNAVAILABLE', 'recorded policy could not be verified'],
  ['VMF_UPDATE_REQUIRED', 'requires update permission'],
  ['POST_LOCK_INDEX_REQUIRED', 'required storage checks are incomplete'],
  ['CONTROLLED_REPLAY_ISOLATED', 'isolated for controlled replay'],
  ['LOCK_BASIS_UNAVAILABLE', 'selected locked basis could not be verified'],
])('explains current operational %s on both surfaces without adding mutation controls', async (reason, text) => {
  show({ operationalCapability: operationalCapability(reason) })
  expect(screen.getByRole('status', { name: 'Post-lock discovery inbox' })).toHaveTextContent(text)
  expect(screen.getByText('This is not a zero-item result.')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Why this is separate' }))
  expect(screen.getByRole('dialog')).toHaveTextContent(text)
  expect(screen.queryByRole('button', { name: /Submit|Approve|Save decision|Create revision/i })).not.toBeInTheDocument()
})
it.each([{ active: false }, { canInspect: false }, { lockBasisLoading: true }])('hides retained capability while not inspectable %j', changes => {
  show({ ...changes, operationalCapability: operationalCapability('POST_LOCK_POLICY_NOT_RECORDED') })
  expect(screen.queryByText(/no recorded post-lock policy/)).not.toBeInTheDocument()
})
it('never falls back to legacy or raw server text when the separate operational result is missing', () => {
  show({ lockBasis: { ...lock, outsideSnapshotIntake: unavailableCapability('PRIVATE_SERVER_MESSAGE') } })
  expect(screen.queryByText(/PRIVATE_SERVER_MESSAGE/)).not.toBeInTheDocument()
  expect(screen.getByRole('status', { name: 'Post-lock discovery inbox' })).toHaveTextContent('Saved evidence availability unverified')
  expect(screen.getByRole('status', { name: 'Post-lock discovery inbox' })).toHaveTextContent('availability could not be verified')
})
it('invalidates inspection ownership when the operational read changes without a state change', () => {
  const view = show({ operationalCapability: operationalCapability('POST_LOCK_POLICY_NOT_RECORDED') })
  fireEvent.click(screen.getByRole('button', { name: 'Why this is separate' }))
  const retained = calls.handlers['Review evidence'], registration = calls.registration
  view.rerender(tree({ operationalCapability: { state: 'UNAVAILABLE' } }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  retained(); registration.open(document.body)
  expect(calls.navigate).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it.each(['CHECKING', 'DENIED', 'STALE', 'UNAVAILABLE'])('shows the same %s explanation without reviving legacy policy copy', async state => {
  show({ operationalCapability: { state }, lockBasis: { ...lock, outsideSnapshotIntake: unavailableCapability('POST_LOCK_POLICY_NOT_RECORDED') } })
  const page = screen.getByRole('status', { name: 'Post-lock discovery inbox' }), text = page.querySelector('p:last-child').textContent
  await userEvent.click(screen.getByRole('button', { name: 'Inspect basis and history' }))
  expect(screen.getByRole('dialog')).toHaveTextContent(text)
  expect(page).not.toHaveTextContent('no recorded post-lock policy')
})
it('reports observed prerequisites without exposing a submission action', () => {
  show({ operationalCapability: operationalCapability(null) })
  const page = screen.getByRole('status', { name: 'Post-lock discovery inbox' })
  expect(page).toHaveTextContent('server verified recording prerequisites')
  expect(page).toHaveTextContent('explicit evidence submission requires fresh server checks')
  expect(screen.queryByRole('button', { name: /Submit|Admit|Record decision/i })).not.toBeInTheDocument()
})
it('derives dialog membership metadata and keeps original-body verification qualified', async () => {
  show({ lockBasis: { ...lock, frozenInventory: { snapshotId: 'membership-1', membershipHash: 'c'.repeat(64), basisStateVersion: 'version-1', counts: { sources: 2, evidence: 3, sections: 1 } } } })
  await userEvent.click(screen.getByRole('button', { name: 'Inspect basis and history' }))
  const dialog = screen.getByRole('dialog')
  expect(dialog).toHaveTextContent('Verified recorded membership metadata supplied')
  expect(dialog).toHaveTextContent('membership-1')
  expect(dialog).toHaveTextContent('does not establish independent verification of the original snapshot or replay bodies')
  expect(dialog).not.toHaveTextContent('frozen membership not recorded')
})
it('connects saved evidence, impact and admission to the selected revision without inventing an inbox count', async () => {
  show({operationalCapability:operationalCapability(null),lockBasis:{...lock,frozenInventory:{available:true,membershipHash:'c'.repeat(64),counts:{sources:1,evidence:1,sections:0}}}})
  const props=calls.history.mock.calls.at(-1)[0]
  expect(props).toMatchObject({active:true,scope:{runtimeInstanceId:'revision-1',customerId:'customer-1',tenantId:'tenant-1'},sessionRevision:1,actorId:'a'.repeat(24)})
  expect(screen.getByRole('status',{name:'Post-lock discovery inbox'})).toHaveTextContent('Open an item below')
  expect(screen.getByRole('status',{name:'Post-lock discovery inbox'})).toHaveTextContent('Select a saved evidence item below')
  expect(screen.getByRole('status',{name:'Post-lock discovery inbox'})).not.toHaveTextContent('are unavailable here')
  await userEvent.click(screen.getByRole('button',{name:'Inspect basis and history'}))
  expect(screen.getByRole('dialog')).toHaveTextContent('Each action requires its own authority, rationale and confirmation.')
  expect(screen.getByRole('dialog')).not.toHaveTextContent('controls are unavailable here')
})
it.each([{active:false},{canInspect:false},{operationalCapability:{state:'DENIED'}},{lockBasisLoading:true}])('does not enable history for an inactive, denied or checking owner %j',changes=>{
  show({operationalCapability:operationalCapability(null),lockBasis:{...lock,frozenInventory:{available:true,counts:{sources:1,evidence:1,sections:0}}},...changes})
  expect(calls.history.mock.calls.at(-1)?.[0]?.active??false).toBe(false)
})
