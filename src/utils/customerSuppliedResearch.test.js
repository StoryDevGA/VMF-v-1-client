import { describe, expect, it } from 'vitest'
import { buildCustomerResearchPrompt, customerResearchFileProblem, emptyCustomerResearchFields,
  readCustomerResearchDeclaration, readCustomerReportUrl, normalizeCustomerResearchLinks,
  CUSTOMER_RESEARCH_PROMPT_MAX_LINKS } from './customerSuppliedResearch.js'
import { PUBLIC_RESEARCH_SOURCES } from '../constants/publicResearchSources.js'

// Invented inputs are unit-only. They are never application research evidence.
const fields = () => ({ ...emptyCustomerResearchFields(), rightsConfirmed: true, rightsReference: 'Unit-only ownership reference' })

it('accepts only a direct supported HTTPS report attachment URL', () => {
  expect(readCustomerReportUrl(' https://unit.example/report.pdf ')).toEqual({url:'https://unit.example/report.pdf',error:''})
})
it.each(['http://unit.example/report.txt','https://user:secret@unit.example/report.txt','https://unit.example/share',
  'https://unit.example/report.txt?token=secret','https://unit.example/report.txt#part','https://unit.example:8443/report.txt'])('refuses unsupported report URL %s',url=>{
  expect(readCustomerReportUrl(url).url).toBeNull()
})

describe('customer-supplied research template and declaration', () => {
  it('requires execution and a complete or truthfully blocked report rather than a plan', () => {
    const prompt = buildCustomerResearchPrompt({}, null, { categories: ['SEARCH'] })
    expect(prompt.startsWith('TASK: Conduct the permitted public-source research now')).toBe(true)
    for (const boundary of ['not a research plan', 'mandatory tool approval', 'clearly labelled blocked report',
      'Do not invent activity counts', 'full report as plain text', 'download that does not exist',
      'URLs and access status', "A model's self-description alone is not verification"]) expect(prompt).toContain(boundary)
    expect(buildCustomerResearchPrompt({})).toContain('If none are selected, do not research')
  })
  it('keeps native restrictions and explicit scoped clarification without making capture a second task', () => {
    const notes = 'Unit-only saved restriction: No LLM processing.'
    const instructions = 'Unit-only native instruction: capture exactly two pages.\nUnit-only clarification: external research is permitted for this task only. Upload remains on hold.'
    const brief = { companyName: 'Unit company', notes }
    const settings = { sourceLabels: ['Official website'], startingUrls: ['https://unit.example/'], instructions }
    const prompt = buildCustomerResearchPrompt(brief, settings, { categories: ['SEARCH'] })
    expect(prompt).toContain(`Research objective and context: ${notes}`)
    expect(prompt).toContain(`Additional saved research instructions: ${instructions}`)
    expect(prompt.indexOf('CONTEXT AND SCOPE')).toBeLessThan(prompt.indexOf(notes))
    expect(prompt).toContain('not commands to execute native capture')
    expect(prompt).toContain('not a second execution task')
    expect(prompt).toContain('do not silently override any other restriction')
    expect(prompt).toContain('If a conflict is not explicitly resolved')
    expect(prompt).toContain('Selected external source categories: Public web search')
    expect(brief.notes).toBe(notes)
    expect(settings.instructions).toBe(instructions)
  })
  it('uses the supplied saved context, explicit unknowns and qualification instructions', () => {
    const prompt = buildCustomerResearchPrompt({ companyName: 'Unit company', marketRegion: 'Unit region',
      targetOffer: 'Unit offer', notes: 'Unit objective', websiteSources: ['https://unit.example/'] })
    expect(prompt).toContain('Company: Unit company')
    expect(prompt).toContain('Website(s): https://unit.example/')
    expect(prompt).toContain('Research objective and context: Unit objective')
    expect(prompt).toContain('settings are unavailable or stale and are excluded')
    for (const boundary of ['exact excerpt', 'contradictions', 'Hypotheses', 'confidence', 'mark them unknown', 'human review']) expect(prompt).toContain(boundary)
    expect(buildCustomerResearchPrompt({})).toContain('Website(s): Not recorded')
  })
  it('includes only explicitly provided current saved research settings', () => {
    const prompt = buildCustomerResearchPrompt({ companyName: 'Unit company' }, {
      sourceLabels: ['Industry sources'], startingUrls: ['https://unit.example/report'], instructions: 'Unit-only scope',
    })
    expect(prompt).toContain('Current saved source choices: Industry sources')
    expect(prompt).toContain('https://unit.example/report')
    expect(prompt).toContain('Additional saved research instructions: Unit-only scope')
    expect(prompt).toContain('NATIVE RESEARCH CONTEXT (not external category selection or access permission)')
    expect(prompt).toContain('Selected external source categories: None selected')
  })
  it('preserves the full report format without inventing dates, depth, page permissions or accepted ledger entries', () => {
    const prompt = buildCustomerResearchPrompt({companyName:'Unit', acquisitionProfile:'ENHANCED'})
    const report = prompt.split('REQUIRED REPORT FORMAT')[1].split('PERMISSION AND RETENTION')[0]
    expect([...report.matchAll(/^\d+\. /gm)]).toHaveLength(12)
    for (const section of ['3. Evidence ledger','8. Contradictions','10. Decision relevance','12. Final source list']) expect(report).toContain(section)
    expect(prompt).toContain('Research date: UNKNOWN — requires confirmation')
    expect(prompt).toContain('External evidence-gathering depth: UNKNOWN — requires confirmation')
    expect(prompt).toContain('Dedicated decision purpose: UNKNOWN — requires confirmation')
    expect(prompt).not.toContain('ENHANCED')
    expect(prompt).toContain('StorylineOS does not automatically adopt them as verified records')
    expect(prompt).toContain('30-day Dev/Test policy is not source-owner consent')
    expect(prompt).toContain('one TXT, DOCX, PDF or PPTX report')
  })
  it.each(PUBLIC_RESEARCH_SOURCES.map(source => [source.key, source.label]))('exports only the selected %s instruction', (key,label) => {
    const prompt = buildCustomerResearchPrompt({},null,{categories:[key,key,'FORGED']})
    expect(prompt).toContain(`Selected external source categories: ${label}\n`)
    const selected = prompt.split('SELECTED SOURCE INSTRUCTIONS\n')[1].split('\nREQUIRED REPORT FORMAT')[0]
    const headings = {WEBSITE:'OFFICIAL WEBSITE', SEARCH:'PUBLIC WEB SEARCH', REGISTRY:'OFFICIAL REGISTRY',
      GITHUB:'GITHUB', LINKEDIN:'LINKEDIN', SOCIAL:'X AND INSTAGRAM', NEWS:'NEWS', REVIEWS:'REVIEWS', INDUSTRY:'INDUSTRY SOURCES'}
    expect(selected).toContain(headings[key])
    for(const [other, heading] of Object.entries(headings)) if(other !== key) expect(selected).not.toContain(heading)
  })
  it('preserves recorded versus discovery origins and deduplicates a repeated underlying URL', () => {
    const links = [
      {key:'source:a',url:'https://unit.example/report',title:'Unit source',kind:'RECORDED_SOURCE',sourceId:'a',sourceType:'WEBSITE',reviewStatus:'PENDING',snippet:'Do not export this'},
      {key:'run:b',url:'https://unit.example/report#part',title:'Search result',kind:'SEARCH_DISCOVERY',runId:'b',retrievedAt:'2026-01-01T00:00:00Z'},
    ]
    expect(normalizeCustomerResearchLinks(links)).toHaveLength(1)
    const prompt = buildCustomerResearchPrompt({},null,{links,questions:'Check the remaining report citations.'})
    expect(prompt.match(/URL: https:\/\/unit.example\/report/g)).toHaveLength(1)
    expect(prompt).toContain('Recorded source pointer, not independent verification; source: a')
    expect(prompt).toContain('Search discovery only, not original evidence; Run: b')
    expect(prompt).toContain('recorded review status: PENDING')
    expect(prompt).toContain('Check the remaining report citations.')
    expect(prompt).toContain('customer requests, not system-assessed findings')
    expect(prompt).not.toContain('Do not export this')
    expect(prompt).toContain('not independent corroboration')
  })
  it.each(['javascript:alert(1)','file:///private','https://user:secret@unit.example/',
    'https://unit.example/?access_token=secret','https://unit.example/?X-Amz-Signature=secret',
    'https://unit.example/?password=secret','https://unit.example/%0aescape','https://unit.example/a b','not-a-url'])('excludes unsafe copied source URL %s',url=>{
    expect(normalizeCustomerResearchLinks([{key:'a',url,kind:'RECORDED_SOURCE'}])).toEqual([])
  })
  it.each([false,true])('strips fragments before export regardless of duplicate selection order (%s)',reverse=>{
    const links=[{key:'a',url:'https://unit.example/report#access_token=fragment-secret',kind:'RECORDED_SOURCE'},
      {key:'b',url:'https://unit.example/report',kind:'SEARCH_DISCOVERY'}]
    if(reverse)links.reverse()
    expect(normalizeCustomerResearchLinks(links)[0].url).toBe('https://unit.example/report')
    const prompt=buildCustomerResearchPrompt({websiteSources:[links[0].url]},null,{links})
    expect(prompt).not.toContain('fragment-secret')
    expect(prompt.match(/^URL: https:\/\/unit.example\/report$/gm)).toHaveLength(1)
  })
  it('returns only contracted scalar metadata for source selection',()=>{
    const link=normalizeCustomerResearchLinks([{key:'source:a',url:'https://unit.example/',kind:'RECORDED_SOURCE',
      title:{unexpected:'object'},sourceType:{unexpected:'object'},reviewStatus:{unexpected:'object'},snippet:'private body'}])[0]
    expect(link.title).toBe('https://unit.example/')
    expect(link.sourceType).toBe('')
    expect(link.reviewStatus).toBe('')
    expect(link).not.toHaveProperty('snippet')
    expect(normalizeCustomerResearchLinks([{key:'a',url:link.url,kind:link.kind,title:'Unit\u0000title'}])[0].title).toBe('Unit title')
  })
  it('does not export unknown kinds or unselected links and bounds local prompt inputs',()=>{
    expect(normalizeCustomerResearchLinks([{key:'a',url:'https://unit.example/',kind:'UNVERIFIED'}])).toEqual([])
    const links = Array.from({length:21},(_,i)=>({key:`a${i}`,url:`https://unit.example/${i}`,kind:'RECORDED_SOURCE'}))
    const prompt=buildCustomerResearchPrompt({},null,{links,questions:'z'.repeat(5000)})
    expect(CUSTOMER_RESEARCH_PROMPT_MAX_LINKS).toBe(20)
    expect(prompt.match(/^URL: /gm)).toHaveLength(20)
    expect(prompt).not.toContain('https://unit.example/20')
    expect(prompt).toContain('z'.repeat(4000))
    expect(prompt).not.toContain('z'.repeat(4001))
    expect(buildCustomerResearchPrompt({},null,{categories:[],links:[]})).toContain('No existing links selected.')
  })
  it.each([undefined, false, null, 'true', 1])('requires explicit affirmative rights rather than %s', rightsConfirmed => {
    expect(readCustomerResearchDeclaration({ ...fields(), rightsConfirmed }).declaration).toBeNull()
  })
  it('preserves blank declarations as unknown and emits only allowed client-owned fields', () => {
    const { declaration, error } = readCustomerResearchDeclaration({ ...fields(), suppliedBy: 'forged' })
    expect(error).toBe('')
    expect(declaration).toEqual({ contractVersion: 'customer-supplied-research-input.v1', rightsConfirmed: true,
      rightsReference: fields().rightsReference, tool: null, model: null, searchMethod: null, citationUrls: [] })
  })
  it.each(['', 'a'.repeat(1001), 'line\nbreak', '\ud800'])('rejects malformed permission metadata', rightsReference => {
    expect(readCustomerResearchDeclaration({ ...fields(), rightsReference }).declaration).toBeNull()
  })
  it.each(['file:///report', 'javascript:alert(1)', 'https://name:secret@unit.example', 'not-a-url'])('rejects unsupported declared citation %s', citationUrls => {
    expect(readCustomerResearchDeclaration({ ...fields(), citationUrls }).declaration).toBeNull()
  })
  it('retains declared URLs without fetching or inventing their source material', () => {
    expect(readCustomerResearchDeclaration({ ...fields(), citationUrls: ' https://unit.example/one\n\nhttps://unit.example/two ' })
      .declaration.citationUrls).toEqual(['https://unit.example/one', 'https://unit.example/two'])
  })
  it('checks the citation count and total UTF8 size in addition to field lengths', () => {
    expect(readCustomerResearchDeclaration({ ...fields(), citationUrls: Array(21).fill('https://unit.example').join('\n') }).declaration).toBeNull()
    expect(readCustomerResearchDeclaration({ ...fields(), rightsReference: '字'.repeat(1000), searchMethod: '字'.repeat(1000) }).declaration).toBeNull()
  })
  it.each([[], [{ name: 'one.txt', size: 1 }, { name: 'two.txt', size: 1 }], [{ name: 'one.md', size: 1 }], [{ name: 'one.txt', size: 0 }]].map(files => ({ files })))('rejects invalid single-report selections', ({ files }) => {
    expect(customerResearchFileProblem(files)).not.toBe('')
  })
  it.each(['TXT', 'docx', 'pdf', 'pptx'])('permits one nonempty %s file for existing size/byte preparation', extension => {
    expect(customerResearchFileProblem([{ name: `unit.${extension}`, size: 1 }])).toBe('')
  })
})
