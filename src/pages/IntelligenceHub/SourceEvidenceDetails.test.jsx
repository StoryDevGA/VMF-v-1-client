import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import SourceEvidenceDetails from './SourceEvidenceDetails.jsx'
import { getSessionRevision, setAccessToken } from '../../utils/tokenStorage.js'
const {read}=vi.hoisted(()=>({read:vi.fn()}))
vi.mock('../../store/api/runtimeInstanceApi.js',()=>({useGetEvidenceOriginalQuery:read}))
const sample=()=>{
  const text='<script>unit only</script>\nSecond line', hash='sha256:'+'a'.repeat(64)
  const capture={contractVersion:'source-capture.v1',sourceId:'source',originalContentHash:hash,captureTextHash:hash,textLength:text.length,
    coordinateSystem:'UTF16_CODE_UNIT',captureScope:'NORMALIZED_EXTRACTED_TEXT_ONLY',adapter:'website-html-fetch-v1',
    extractionMethod:'DECODED_HTML_STRIPPED_TEXT',capturedAt:'2026-11-24T12:00:00.000Z',
    captureReceipt:{contractVersion:'source-capture-receipt.v1',operation:'WEBSITE_DECODED_TEXT_CAPTURE',status:'SUCCEEDED',
      runId:'11111111-1111-4111-8111-111111111111',attemptId:'22222222-2222-4222-8222-222222222222',inputIndex:0}}
  const scope={customerId:'customer',tenantId:'tenant',runtimeInstanceId:'runtime',stateVersion:'state',sessionRevision:getSessionRevision()}
  const ref={contractVersion:'evidence-original-reference.v1',originalId:'original_'+'a'.repeat(64),inputKind:'PUBLIC_URL',byteHash:hash,byteLength:40,
    acquiredAt:capture.capturedAt,binding:{...scope,sourceId:'source',sourceContentHash:hash,sourceLocator:'https://unit.example/'},
    policy:{policyId:'FS-006',policyVersion:'0.2',policyHash:hash,effectiveEnvironment:'DEVELOPMENT_TEST',retentionDays:30,
      nativeResearch:{capture,grant:{kind:'PUBLISHER_TERMS',decision:'ALLOWED',legalStatus:'CONFIRMED',retentionAllowed:true,url:'https://unit.example/',
        scope:{customerId:'customer',tenantId:'tenant'},attribution:{publisher:'Unit publisher',statement:'Unit attribution',licenceUrl:'https://unit.example/licence'}}}}}
  const source={sourceId:'source',sourceRef:'https://unit.example/',stateVersion:'state',sourceStateVersion:'state',contentHash:hash,
    sourceCaptureAvailability:'RECORDED',sourceCapture:capture,originalContentRef:ref}
  const data={data:{availability:'AVAILABLE_DEV_TEST',originalContentRef:ref,observedStateVersion:'state',auditId:'a'.repeat(24),capturedText:text}}
  return {source,scope,stateVersion:'state',data,text}
}
beforeEach(()=>{read.mockReturnValue({isFetching:false})})
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('leaves historical sources without a native reference unchanged',()=>{
  const args=sample();delete args.source.originalContentRef;render(<SourceEvidenceDetails {...args}/>)
  expect(screen.queryByRole('button',{name:'Read retained material'})).toBeNull();expect(read).not.toHaveBeenCalled()
})
it('reads on request and shows escaped, whitespace-preserving captured text and attribution',()=>{
  const args=sample();read.mockReturnValue({currentData:args.data,isFetching:false})
  const view=render(<SourceEvidenceDetails {...args}/>)
  expect(screen.queryByLabelText('Full captured text from retained original')).toBeNull()
  expect(read.mock.lastCall[1].skip).toBe(true)
  fireEvent.click(screen.getByRole('button',{name:'Read retained material'}))
  expect(read.mock.lastCall[1].skip).toBe(false)
  const text=screen.getByLabelText('Full captured text from retained original')
  expect(text.value).toBe(args.text);expect(text.readOnly).toBe(true);expect(view.container.querySelector('script')).toBeNull()
  expect(screen.getByRole('link',{name:'Licence'}).getAttribute('href')).toBe('https://unit.example/licence')
})
it('shows loading and refuses stale cached data after error or mismatched state',()=>{
  const args=sample();read.mockReturnValue({currentData:args.data,isFetching:true})
  const view=render(<SourceEvidenceDetails {...args}/>);fireEvent.click(screen.getByRole('button',{name:'Read retained material'}))
  expect(screen.getByRole('status').textContent).toContain('Reading')
  for(const response of [{currentData:args.data,error:{status:403}}, {data:args.data},
    {currentData:{data:{...args.data.data,observedStateVersion:'old'}}}]){
    read.mockReturnValue({...response,isFetching:false});view.rerender(<SourceEvidenceDetails {...args}/>)
    expect(screen.queryByLabelText('Full captured text from retained original')).toBeNull();expect(screen.getByRole('alert')).toBeTruthy()
  }
})
it('clears visible text after logout/account-switch and rejects a late response',()=>{
  const args=sample();read.mockReturnValue({currentData:args.data,isFetching:false})
  const view=render(<SourceEvidenceDetails {...args}/>);fireEvent.click(screen.getByRole('button',{name:'Read retained material'}))
  expect(screen.getByLabelText('Full captured text from retained original')).toBeTruthy()
  act(() => setAccessToken(null));view.rerender(<SourceEvidenceDetails {...args}/>)
  expect(screen.queryByLabelText('Full captured text from retained original')).toBeNull();expect(read.mock.lastCall[1].skip).toBe(true)
  const switched={...args,scope:{...args.scope,customerId:'other',sessionRevision:getSessionRevision()}}
  view.rerender(<SourceEvidenceDetails {...switched}/>);expect(screen.queryByLabelText('Full captured text from retained original')).toBeNull()
})

it('opens the same real-shaped recorded reference despite nested JSON key reordering',()=>{
  const args=sample()
  const reverse=value=>value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reverse(item)])):value
  args.source.originalContentRef.policy.nativeResearch.capture=reverse(args.source.sourceCapture)
  args.data.data.originalContentRef=reverse(args.source.originalContentRef)
  read.mockReturnValue({currentData:args.data,isFetching:false})
  render(<SourceEvidenceDetails {...args}/>)
  fireEvent.click(screen.getByRole('button',{name:'Read retained material'}))
  expect(screen.getByLabelText('Full captured text from retained original').value).toBe(args.text)
})
