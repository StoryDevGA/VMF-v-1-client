import { describe, expect, it } from 'vitest'
import { buildDiscoveryDocumentSource, buildDiscoveryInputsPayload, normalizeWebsiteSourceDrafts, selectAcquisitionAction, formatIntelligenceHubEvidenceError } from './discoveryAcquisition.js'
describe('shared acquisition parity contracts', () => {
  it('preserves canonical brief payload and unique website drafts', () => {
    expect(normalizeWebsiteSourceDrafts({ companyWebsite:'https://example.org',websiteSources:[' https://example.org ','https://example.com'] })).toEqual(['https://example.org','https://example.com'])
    expect(buildDiscoveryInputsPayload({companyName:' Company ',marketRegion:' UK ',targetOffer:' Service ',notes:' Note ',websiteSources:[' https://example.org ']})).toEqual({companyName:'Company',marketRegion:'UK',targetOffer:'Service',notes:'Note',companyWebsite:'https://example.org',websiteSources:['https://example.org']})
  })
  it('rejects unsupported document format', async () => {
    await expect(buildDiscoveryDocumentSource(new File(['data'],'archive.zip',{type:'application/zip'}))).rejects.toThrow('not a supported')
  })
  it.each(['csv','docx','md','pdf','pptx','txt'])('supports existing %s file format', async extension => {
    expect(await buildDiscoveryDocumentSource(new File(['data'],`file.${extension}`))).toEqual(expect.objectContaining({fileName:`file.${extension}`,assetType:'CUSTOMER_DOCUMENT',sizeBytes:4,contentBase64:expect.stringContaining('base64,')}))
  })
  it('retains the distinct PPTX size ceiling and does not raise the ordinary file ceiling', async () => {
    const pptx=new File(['text'],'deck.pptx');Object.defineProperty(pptx,'size',{value:40000000});await expect(buildDiscoveryDocumentSource(pptx)).resolves.toHaveProperty('sizeBytes',40000000)
    const oversized=new File(['text'],'deck.pptx');Object.defineProperty(oversized,'size',{value:40000001});await expect(buildDiscoveryDocumentSource(oversized)).rejects.toThrow('size limit')
  })
  it('selects existing refresh action before save and retains disabled projected actions', () => {
    const disabled={actionKey:'REFRESH_EVIDENCE_PACK',enabled:false};expect(selectAcquisitionAction({actions:[{actionKey:'SAVE_DISCOVERY_INPUTS',enabled:true},disabled]},{evidenceReady:true})).toBe(disabled)
  })
})

describe('actual pre-save acquisition error outcomes', () => {
  const outcomes = () => ({ contractVersion: 'acquisition-error-outcomes.v1', canonicalSaved: false,
    websiteItems: [{ inputIndex: 0, status: 'SUCCEEDED', sourceId: 'website_actual', evidenceObjectCount: 0 }],
    documentItems: [{ inputIndex: 0, status: 'FAILED', evidenceObjectCount: 0, reason: 'DOCUMENT_EXTRACTION_FAILED' }] })
  const error = acquisitionOutcomes => ({ status: 409, data: { error: { code: 'CONFLICT', message: 'Continuity could not be verified.', requestId: 'request-1',
    details: { reason: 'ACQUISITION_CONTINUITY_BLOCKED', acquisitionOutcomes } } } })
  it('keeps actual zero-fact success separate from a failed save and retains request reference', () => {
    const message = formatIntelligenceHubEvidenceError(error(outcomes()))
    expect(message).toContain('Website extraction: 1 succeeded · 0 failed.')
    expect(message).toContain('Document extraction: 0 succeeded · 1 failed.')
    expect(message).toContain('These extraction results were not saved to this revision.')
    expect(message).toContain('request-1')
    expect(message).not.toContain('website_actual')
  })
  it.each(['unknown-save', 'saved', 'wrong-contract', 'legacy', 'unattempted'])('does not infer save failure or execution for %s', scenario => {
    const item = outcomes()
    if (scenario === 'unknown-save') delete item.canonicalSaved
    if (scenario === 'saved') item.canonicalSaved = true
    if (scenario === 'wrong-contract') item.contractVersion = 'unknown'
    if (scenario === 'unattempted') { item.websiteItems = []; item.documentItems = [] }
    const message = formatIntelligenceHubEvidenceError(error(scenario === 'legacy' ? undefined : item))
    expect(message).not.toMatch(/extraction:|were not saved/)
    expect(message).toContain('Continuity could not be verified.')
  })
  it.each(['not-array', 'over-cap', 'bad-index', 'duplicate-source', 'missing-source', 'unsafe-source', 'negative-count', 'fraction-count', 'failed-count', 'bad-status', 'bad-reason'])('does not display counts for malformed %s', scenario => {
    const item = outcomes()
    const row = item.websiteItems[0]
    if (scenario === 'not-array') item.websiteItems = {}
    if (scenario === 'over-cap') item.websiteItems = Array.from({length:11},(_,inputIndex)=>({...row,inputIndex,sourceId:`website_${inputIndex}`}))
    if (scenario === 'bad-index') row.inputIndex = 1
    if (scenario === 'duplicate-source') item.websiteItems.push({...row,inputIndex:1})
    if (scenario === 'missing-source') delete row.sourceId
    if (scenario === 'unsafe-source') row.sourceId = 'https://private.example/secret'
    if (scenario === 'negative-count') row.evidenceObjectCount = -1
    if (scenario === 'fraction-count') row.evidenceObjectCount = 0.5
    if (scenario === 'failed-count') { row.status = 'FAILED'; row.reason = 'WEBSITE_ACQUISITION_FAILED'; row.evidenceObjectCount = 1 }
    if (scenario === 'bad-status') row.status = 'ACQUIRED'
    if (scenario === 'bad-reason') { row.status = 'FAILED'; row.reason = 'raw failure' }
    const message = formatIntelligenceHubEvidenceError(error(item))
    expect(message).toContain('Website extraction outcomes unavailable.')
    expect(message).not.toContain('Website extraction:')
    expect(message).toContain('Document extraction: 0 succeeded · 1 failed.')
  })
  it('does not convert a persistence or response error into a not-saved claim', () => {
    expect(formatIntelligenceHubEvidenceError({status:503,data:{error:{message:'Readback unavailable.',details:{reason:'READBACK_UNAVAILABLE'}}}}))
      .not.toContain('not saved')
  })
})
