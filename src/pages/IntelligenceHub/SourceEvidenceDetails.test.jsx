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
