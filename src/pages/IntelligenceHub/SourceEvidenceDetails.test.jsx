import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createHash, webcrypto } from 'node:crypto'
import { Blob as NodeBlob, Buffer } from 'node:buffer'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import SourceEvidenceDetails from './SourceEvidenceDetails.jsx'
import { getSessionRevision, setAccessToken } from '../../utils/tokenStorage.js'
const {read,downloadHook,download,reset,operationReset}=vi.hoisted(()=>({read:vi.fn(),downloadHook:vi.fn(),download:vi.fn(),reset:vi.fn(),operationReset:vi.fn()}))
vi.mock('../../store/api/runtimeInstanceApi.js',()=>({useGetEvidenceOriginalQuery:read,useDownloadEvidenceOriginalMutation:downloadHook}))
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
beforeEach(()=>{read.mockReturnValue({isFetching:false});downloadHook.mockReturnValue([download,{isLoading:false,reset}])})
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals()})
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

const reportSample = () => {
  const args = sample(), { source } = args, capture = source.sourceCapture
  const bytes = Buffer.from(args.text), hash = 'sha256:' + createHash('sha256').update(bytes).digest('hex')
  source.sourceType = 'UPLOADED_DOCUMENT'; source.fileName = 'unit-report.txt'; delete source.sourceRef
  source.contentHash = hash; capture.originalContentHash = hash
  capture.adapter = 'document-txt-text-extraction-v1'; capture.extractionMethod = 'TEXT_NATIVE'
  capture.captureReceipt.operation = 'DOCUMENT_TEXT_CAPTURE'
  source.customerSuppliedResearch = { contractVersion:'customer-supplied-research.v1', classification:'CUSTOMER_SUPPLIED_RESEARCH',
    rightsStatus:'CUSTOMER_DECLARED_NOT_VERIFIED', sourceId:source.sourceId, suppliedBy:'1'.repeat(24),
    suppliedAt:capture.capturedAt, originalByteHash:hash, runId:capture.captureReceipt.runId, attemptId:capture.captureReceipt.attemptId,
    declaration:{rightsConfirmed:true,rightsReference:'Unit-only permission claim',tool:'<script>Unit tool</script>',model:null,
      searchMethod:null,citationUrls:['https://unit.example/citation']} }
  const ref = source.originalContentRef
  Object.assign(ref,{inputKind:'UPLOADED_FILE',parent:null,byteHash:hash,byteLength:bytes.length})
  ref.binding.sourceContentHash = hash;ref.binding.sourceLocator = source.fileName
  delete ref.policy.nativeResearch
  ref.policy.customerSuppliedResearch = {amendment:'SS-058-AM02',provenance:structuredClone(source.customerSuppliedResearch)}
  delete args.data.data.capturedText
  return {...args,attachment:{blob:new NodeBlob([bytes]),auditId:'b'.repeat(24)}}
}

it('shows declared provenance and unknowns, never provider verification or executable report content',()=>{
  const args=reportSample();const view=render(<SourceEvidenceDetails {...args}/>)
  expect(screen.getByRole('heading',{name:'Customer-supplied research'})).toBeTruthy()
  expect(screen.getByText('Customer declared · not independently verified')).toBeTruthy()
  expect(screen.getAllByText('Unknown · not declared')).toHaveLength(2)
  expect(screen.getByText('<script>Unit tool</script>')).toBeTruthy();expect(view.container.querySelector('script')).toBeNull()
  expect(screen.getByRole('link',{name:'https://unit.example/citation'}).getAttribute('rel')).toContain('noreferrer')
  expect(read.mock.lastCall[1].skip).toBe(true);expect(download).not.toHaveBeenCalled()
  expect(screen.queryByRole('button',{name:'Download original report'})).toBeNull()
})

it('shows separately detected links only after exact original inspection without fetching targets',()=>{
  const args=reportSample()
  args.data.data.reportCitations={contractVersion:'customer-report-citations.v1',originalByteHash:args.source.contentHash,status:'PARTIAL',
    method:'TXT_TEXT',locationsInspected:1,limitReached:true,entries:[{url:'https://unit.example/detected',location:'Report text',origin:'TEXT_URL'}],
    limitations:['Unit-only partial metadata, not retrieved evidence.']}
  read.mockReturnValue({currentData:args.data,isFetching:false})
  render(<SourceEvidenceDetails {...args}/>);expect(screen.queryByRole('link',{name:'https://unit.example/detected'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Inspect report original'}))
  expect(screen.getByRole('link',{name:'https://unit.example/detected'})).toBeTruthy()
  expect(screen.getByRole('link',{name:'https://unit.example/citation'})).toBeTruthy()
  expect(screen.getByText(/Inspection reached a limit/)).toBeTruthy();expect(download).not.toHaveBeenCalled()
})
it.each(['malformed','unavailable','missing','null-entry'])('citation %s leaves original download and declarations available',kind=>{
  const args=reportSample()
  if(kind!=='missing')args.data.data.reportCitations={contractVersion:'customer-report-citations.v1',originalByteHash:args.source.contentHash,
    status:'UNAVAILABLE',method:'UNAVAILABLE',locationsInspected:0,limitReached:false,entries:[],limitations:['Unit citation read unavailable.']}
  if(kind==='malformed')args.data.data.reportCitations.originalByteHash='wrong'
  if(kind==='null-entry')Object.assign(args.data.data.reportCitations,{status:'PARTIAL',method:'TXT_TEXT',locationsInspected:1,entries:[null]})
  read.mockReturnValue({currentData:args.data,isFetching:false})
  render(<SourceEvidenceDetails {...args}/>);fireEvent.click(screen.getByRole('button',{name:'Inspect report original'}))
  expect(screen.getByRole('button',{name:'Download original report'})).toBeTruthy()
  expect(screen.getByRole('link',{name:'https://unit.example/citation'})).toBeTruthy();expect(download).not.toHaveBeenCalled()
})

it('reads original metadata explicitly and prepares only the exact audited report attachment',async()=>{
  vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('URL',class extends URL {static createObjectURL=vi.fn(()=>'blob:unit-only');static revokeObjectURL=vi.fn()})
  const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{})
  try {
    const args=reportSample();read.mockReturnValue({currentData:args.data,isFetching:false})
    download.mockReturnValue({unwrap:()=>Promise.resolve(args.attachment),reset:operationReset})
    render(<SourceEvidenceDetails {...args}/>);fireEvent.click(screen.getByRole('button',{name:'Inspect report original'}))
    expect(screen.getByText(args.data.data.auditId)).toBeTruthy();expect(screen.queryByLabelText('Full captured text from retained original')).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:'Download original report'}))
    await screen.findByText(/Original download prepared/)
    expect(download).toHaveBeenCalledTimes(1);expect(download.mock.calls[0][0]).toMatchObject({customerId:'customer',tenantId:'tenant',sourceId:'source'})
    expect(click).toHaveBeenCalledOnce();expect(click.mock.instances[0].download).toBe(args.source.originalContentRef.originalId+'.txt')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:unit-only');expect(operationReset).toHaveBeenCalledOnce();expect(reset).not.toHaveBeenCalled()
  } finally {click.mockRestore()}
})

it.each(['hash','audit','read','error'])('withholds an inconsistent report attachment or read: %s',async kind=>{
  vi.stubGlobal('crypto',webcrypto)
  const create=vi.fn();vi.stubGlobal('URL',class extends URL {static createObjectURL=create})
  const args=reportSample()
  if(kind==='hash') args.attachment.blob=new NodeBlob(['x'.repeat(args.attachment.blob.size)])
  if(kind==='audit') args.attachment.auditId=null
  read.mockReturnValue({currentData:kind==='read'?{data:{...args.data.data,observedStateVersion:'old'}}:args.data,isFetching:false})
  download.mockReturnValue({unwrap:()=>kind==='error'?Promise.reject(Error('unavailable')):Promise.resolve(args.attachment),reset:operationReset})
  render(<SourceEvidenceDetails {...args}/>);fireEvent.click(screen.getByRole('button',{name:'Inspect report original'}))
  if(kind==='read') expect(screen.queryByRole('button',{name:'Download original report'})).toBeNull()
  else {fireEvent.click(screen.getByRole('button',{name:'Download original report'}));await screen.findByRole('alert')}
  expect(create).not.toHaveBeenCalled()
})

it.each(['logout','unmount','source-change'])('ignores a late report download after %s',async change=>{
  const args=reportSample();let resolve
  read.mockReturnValue({currentData:args.data,isFetching:false})
  download.mockReturnValue({unwrap:()=>new Promise(done=>{resolve=done}),reset:operationReset})
  const create=vi.fn();vi.stubGlobal('URL',class extends URL {static createObjectURL=create})
  const view=render(<SourceEvidenceDetails {...args}/>);fireEvent.click(screen.getByRole('button',{name:'Inspect report original'}))
  fireEvent.click(screen.getByRole('button',{name:'Download original report'}))
  if(change==='logout') act(()=>setAccessToken(null))
  else if(change==='unmount') view.unmount()
  else view.rerender(<SourceEvidenceDetails {...args} scope={{...args.scope,tenantId:'different'}}/>)
  await act(async()=>resolve(args.attachment))
  expect(create).not.toHaveBeenCalled();expect(operationReset).toHaveBeenCalledOnce();expect(reset).not.toHaveBeenCalled()
})

it('leaves missing originals and inconsistent declarations unavailable without another upload or native reader',()=>{
  const args=reportSample();delete args.source.originalContentRef
  const view=render(<SourceEvidenceDetails {...args}/>)
  expect(screen.getByRole('alert').textContent).toContain('Retained report original is unavailable')
  expect(read).not.toHaveBeenCalled();expect(downloadHook).not.toHaveBeenCalled()
  args.source.customerSuppliedResearch.declaration.citationUrls=['javascript:alert(1)'];view.rerender(<SourceEvidenceDetails {...args}/>)
  expect(screen.getByRole('alert').textContent).toContain('provenance is unavailable');expect(screen.queryByRole('link')).toBeNull()
})


const newsSample = () => {
  const args = sample(), source = args.source
  source.publicResearchProvenance = { contractVersion: 'public-research-source.v2', mode: 'LIVE_PUBLIC_WEB',
    provider: 'PUBLIC_HTTPS', category: 'NEWS', metadataMethod: 'NEWSARTICLE_JSON_LD',
    title: '<script>Unit article title</script>', publisher: 'Unit publisher', author: 'Unit author',
    publishedAt: '2026-11-18T09:00:07+00:00', currentness: 'PUBLISHER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    permittedInterpretation: 'Attribute this unit assertion to its publisher.',
    prohibitedInterpretation: 'No independent verification or identity match.',
    limitations: 'Unit metadata is a publisher assertion only.', sourceId: source.sourceId,
    originalContentHash: source.contentHash, requestedUrl: source.sourceRef, finalUrl: source.sourceRef,
    retrievedAt: source.sourceCapture.capturedAt }
  return args
}
it('shows recorded News publisher metadata as literal qualified text with the existing capture facts', () => {
  const args = newsSample(); render(<SourceEvidenceDetails {...args}/>)
  const region = screen.getByRole('region', { name: 'Recorded News provenance' })
  expect(region.textContent).toContain('Unit publisher')
  expect(region.textContent).toContain('2026-11-18T09:00:07+00:00')
  expect(region.textContent).toContain('<script>Unit article title</script>')
  expect(region.querySelector('script')).toBeNull()
  expect(region.textContent).toContain('Publisher assertion · not independently verified')
  expect(region.textContent).toContain('No independent verification or identity match.')
})
it('keeps missing publication time and author visibly unknown', () => {
  const args = newsSample(); args.source.publicResearchProvenance.author = null; args.source.publicResearchProvenance.publishedAt = null
  render(<SourceEvidenceDetails {...args}/>)
  expect(screen.getByRole('region', { name: 'Recorded News provenance' }).textContent.match(/Not recorded/g)).toHaveLength(2)
})
it.each(['sourceId', 'originalContentHash', 'requestedUrl', 'retrievedAt', 'mode', 'unknown field', 'stale read'])(
  'withholds inconsistent native News provenance: %s', kind => {
    const args = newsSample()
    if (kind === 'unknown field') args.source.publicResearchProvenance.extra = 'unsupported'
    else if (kind === 'stale read') args.source.stateVersion = 'old-state'
    else args.source.publicResearchProvenance[kind] = 'changed'
    render(<SourceEvidenceDetails {...args}/>)
    expect(screen.getByRole('region', { name: 'Recorded News provenance' }).textContent).toContain('unavailable or inconsistent')
  })


const githubSample = () => {
  const args = sample(), source = args.source
  const target = 'https://api.github.com/repos/unit-owner/unit-repo/contents/README.md?ref=' + 'a'.repeat(40)
  source.sourceRef = target
  source.originalContentRef.binding.sourceLocator = target
  source.originalContentRef.policy.nativeResearch.grant.url = target
  source.publicResearchProvenance = { contractVersion: 'public-research-source.v3', mode: 'LIVE_PUBLIC_API',
    provider: 'GITHUB_CONTENTS', category: 'GITHUB', metadataMethod: 'GITHUB_CONTENTS_RENDERED_HTML', apiVersion: '2026-03-10',
    owner: 'unit-owner', repository: 'unit-repo', path: 'README.md', commit: 'a'.repeat(40),
    canonicalUrl: 'https://github.com/unit-owner/unit-repo/blob/' + 'a'.repeat(40) + '/README.md',
    publishedAt: null, currentness: 'PINNED_REVISION_NOT_LATEST_STATUS',
    permittedInterpretation: 'Unit-only repository assertion.', prohibitedInterpretation: 'No independent verification or company identity.',
    limitations: 'Unit API rendering, not raw Markdown.', sourceId: source.sourceId, originalContentHash: source.contentHash,
    requestedUrl: target, finalUrl: target, retrievedAt: source.sourceCapture.capturedAt }
  return args
}
it('shows GitHub repository, pinned revision and actual API representation separately from News', () => {
  render(<SourceEvidenceDetails {...githubSample()}/>)
  const region = screen.getByRole('region', { name: 'Recorded GitHub provenance' })
  expect(region.textContent).toContain('unit-owner/unit-repo')
  expect(region.textContent).toContain('a'.repeat(40))
  expect(region.textContent).toContain('GitHub API HTML rendering · not raw Markdown file bytes')
  expect(region.textContent).toContain('Requested media typeapplication/vnd.github.html+json')
  expect(region.textContent).toContain('Publication timeNot recorded')
  expect(screen.queryByRole('region', { name: 'Recorded News provenance' })).toBeNull()
})
it.each(['commit', 'canonicalUrl', 'requestedUrl', 'originalContentHash', 'publishedAt', 'apiVersion', 'unknown field', 'stale read'])(
  'withholds inconsistent GitHub provenance %s', kind => {
    const args = githubSample()
    if (kind === 'unknown field') args.source.publicResearchProvenance.extra = 'unit-only'
    else if (kind === 'stale read') args.source.stateVersion = 'old'
    else args.source.publicResearchProvenance[kind] = 'changed'
    render(<SourceEvidenceDetails {...args}/>)
    expect(screen.getByRole('region', { name: 'Recorded GitHub provenance' }).textContent).toContain('unavailable or inconsistent')
  })

const industrySample = () => {
  const args = sample(), source = args.source
  const target = 'https://www.gov.uk/government/statistics/unit-release/unit-release'
  source.sourceRef = target; source.originalContentRef.binding.sourceLocator = target
  source.originalContentRef.policy.nativeResearch.grant.url = target
  source.publicResearchProvenance = { contractVersion: 'public-research-source.v4', mode: 'LIVE_PUBLIC_WEB',
    provider: 'PUBLIC_HTTPS', category: 'INDUSTRY', metadataMethod: 'GOVUK_HTML_PUBLICATION_METADATA',
    title: '<script>Unit statistical publication</script>', publisher: 'Unit department', publishedAt: '2026-11-05T08:50:47+00:00',
    publicationContentId: '11111111-1111-4111-8111-111111111111', canonicalUrl: target,
    reportingPeriodQuote: 'at the start of 2026', reportCaveatQuote: 'official statistics in development',
    scopeMethod: 'NOMINATED_QUOTES_MATCHED_CAPTURE_TEXT', currentness: 'PUBLISHER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    permittedInterpretation: 'Unit industry context.', prohibitedInterpretation: 'No company facts or independent verification.',
    limitations: 'Other metrics can use different periods.', sourceId: source.sourceId, originalContentHash: source.contentHash,
    requestedUrl: target, finalUrl: target, retrievedAt: source.sourceCapture.capturedAt }
  return args
}
it('shows Industry publisher/date/period and caveat as qualified literal text', () => {
  render(<SourceEvidenceDetails {...industrySample()}/>)
  const region = screen.getByRole('region', { name: 'Recorded Industry provenance' })
  expect(region.textContent).toContain('Unit department')
  expect(region.textContent).toContain('2026-11-05T08:50:47+00:00')
  expect(region.textContent).toContain('at the start of 2026')
  expect(region.textContent).toContain('official statistics in development')
  expect(region.textContent).toContain('other metrics can use different periods')
  expect(region.textContent).toContain('<script>Unit statistical publication</script>')
  expect(region.querySelector('script')).toBeNull()
  expect(screen.queryByRole('region', { name: 'Recorded GitHub provenance' })).toBeNull()
})
it.each(['canonicalUrl', 'requestedUrl', 'originalContentHash', 'retrievedAt', 'publishedAt', 'publicationContentId',
  'scopeMethod', 'empty period', 'empty caveat', 'unknown field', 'stale read'])(
  'withholds inconsistent Industry provenance: %s', kind => {
    const args = industrySample(), value = args.source.publicResearchProvenance
    if (kind === 'empty period') value.reportingPeriodQuote = ''
    else if (kind === 'empty caveat') value.reportCaveatQuote = ''
    else if (kind === 'unknown field') value.extra = 'unit-only'
    else if (kind === 'stale read') args.source.stateVersion = 'old'
    else value[kind] = 'changed'
    render(<SourceEvidenceDetails {...args}/>)
    expect(screen.getByRole('region', { name: 'Recorded Industry provenance' }).textContent).toContain('unavailable or inconsistent')
  })

const urlReportSample=(kind)=>{
  const args=reportSample(),{source,scope}=args,url='https://unit.example/report.txt'
  const grant={owner:'PRODUCT_GOVERNANCE',url,scope:{customerId:scope.customerId,tenantId:scope.tenantId},
    reference:kind==='reference'?{}:'Unit reference',decision:'ALLOWED',legalStatus:'CONFIRMED',retentionAllowed:true,
    recordedAt:'2026-01-01T00:00:00.000Z',reviewBy:'2027-01-01T00:00:00.000Z',
    attribution:{publisher:kind==='publisher'?{}:'Unit publisher',statement:'Unit attribution',licenceUrl:'https://unit.example/licence'}}
  source.fileName='report.txt';source.sourceRef=url
  source.customerSuppliedResearch.delivery={mode:'PUBLIC_URL',url,fileName:source.fileName,contentType:'text/plain',httpStatus:200,
    retrievedAt:source.sourceCapture.capturedAt,authorizationHash:'sha256:'+'d'.repeat(64),authorization:grant}
  source.originalContentRef.inputKind='PUBLIC_URL';source.originalContentRef.binding.sourceLocator=url
  source.originalContentRef.policy.customerSuppliedResearch.provenance=structuredClone(source.customerSuppliedResearch)
  return args
}
it.each(['reference','publisher'])('malformed URL grant %s is unavailable without crashing details',kind=>{
  const args=urlReportSample(kind)
  expect(()=>render(<SourceEvidenceDetails {...args}/>)).not.toThrow()
  expect(screen.queryByRole('button',{name:'Inspect report original'})).toBeNull()
})
it.each(['https://unit.example/licence?version=3','https://unit.example:8443/licence?version=3'])('shows API-supported licence link and retains original inspection %s',licenceUrl=>{
  const args=urlReportSample(),{source}=args
  source.customerSuppliedResearch.delivery.authorization.attribution.licenceUrl=licenceUrl
  source.originalContentRef.policy.customerSuppliedResearch.provenance=structuredClone(source.customerSuppliedResearch)
  read.mockReturnValue({currentData:args.data,isFetching:false})
  render(<SourceEvidenceDetails {...args}/>)
  expect(screen.getByText(licenceUrl)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Inspect report original'}))
  expect(screen.getByRole('button',{name:'Download original report'})).toBeTruthy()
})
