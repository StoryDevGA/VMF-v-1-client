import { describe, expect, it } from 'vitest'
import {
  HUB_VIEWS,
  getRecordedSourceCapture,
  getRecordedNativeOriginal,
  getRecordedOriginalRead,
  getRecordedEvidenceSupport,
  recordedEvidenceLocation,
  getHubContextSearch,
  getHubEvidencePage,
  getHubEvidenceStatusCount,
  getHubViewFromSearch,
  reconcileHubDiscovery,
  validateHubContext,
} from './intelligenceHubModel.js'

const renderer = {
  runtimeInstance: {
    id: 'revision-2',
    customerId: 'customer-1',
    tenantId: 'tenant-1',
  },
  revision: {
    rootRuntimeInstanceKey: 'workspace-1',
    lineage: [{ runtimeInstanceId: 'revision-2', relationship: 'CURRENT' }],
  },
}

const context = {
  renderer,
  workspaceId: 'workspace-1',
  revisionId: 'revision-2',
  customerId: 'customer-1',
  tenantId: 'tenant-1',
}

describe('Intelligence Hub read context', () => {
  it('accepts only a verified selected workspace and revision lineage', () => {
    expect(validateHubContext(context).valid).toBe(true)
    expect(validateHubContext({ ...context, workspaceId: 'other-workspace' }).valid).toBe(false)
    expect(validateHubContext({ ...context, revisionId: 'revision-1' }).valid).toBe(false)
    expect(validateHubContext({ ...context, customerId: 'other-customer' }).valid).toBe(false)
    expect(validateHubContext({ ...context, tenantId: 'other-tenant' }).valid).toBe(false)
    expect(validateHubContext({ ...context, renderer: { ...renderer, revision: { ...renderer.revision, lineage: [] } } }).valid).toBe(false)
  })

  it('keeps the selected context in every first-level view', () => {
    for (const view of HUB_VIEWS) {
      const search = getHubContextSearch('workspace-1', 'revision-2', view)
      expect(new URLSearchParams(search).get('runtimeInstanceId')).toBe('workspace-1')
      expect(new URLSearchParams(search).get('revisionId')).toBe('revision-2')
      expect(HUB_VIEWS[getHubViewFromSearch(`?${search}`)]).toBe(view)
    }
  })

  it('recognises bounded evidence pages without treating missing detail as zero', () => {
    expect(getHubEvidencePage({ data: { data: { evidenceObjects: [], totalPages: 2 } } })).toEqual({ evidenceObjects: [], totalPages: 2 })
    expect(getHubEvidencePage({ data: { data: {} } })).toBeNull()
  })

  it('uses bounded filtered totals and only treats an empty filtered read as zero when the base page is verified', () => {
    const base = { evidenceObjects: [{}], total: 853, totalCapped: false }
    expect(getHubEvidenceStatusCount({ data: { data: { evidenceObjects: [{}], total: 761 } } }, null, base)).toBe(761)
    expect(getHubEvidenceStatusCount(null, { data: { error: { code: 'RUNTIME_STATE_V2_EVIDENCE_MISSING' } } }, base)).toBe(0)
    expect(getHubEvidenceStatusCount(null, { data: { error: { code: 'RUNTIME_STATE_V2_EVIDENCE_MISSING' } } }, null)).toBeNull()
    expect(getHubEvidenceStatusCount({ data: { data: { evidenceObjects: [{}], total: 853, totalCapped: true } } }, null, base)).toBeNull()
  })

  it('reconciles a stale renderer zero against a bounded evidence count', () => {
    const discovery = { sourceRegistrySummary: { count: 0 }, evidenceObjectSummary: { evidenceObjectCount: 0, acceptedEvidenceCount: 0, pendingReviewCount: 0 } }
    const result = reconcileHubDiscovery(discovery, { total: 12, evidenceObjects: [{}] })
    expect(result.sourceRegistrySummary.count).toBeNull()
    expect(result.evidenceObjectSummary.evidenceObjectCount).toBe(12)
    expect(result.evidenceObjectSummary.acceptedEvidenceCount).toBeNull()
    expect(result.evidenceObjectSummary.pendingReviewCount).toBeNull()
  })
})

const recordedCapture = {
  "contractVersion": "source-capture.v1",
  "sourceId": "source-1",
  "originalContentHash": "sha256:7f89c175b0da167969061551865ee67ad42b793283e61aecaec9f84aadc35777",
  "captureTextHash": "sha256:f242dd6378a58a934eada9e4ee2434ca5c44b17b649c7a34c3238402ac26a1fe",
  "textLength": 3623,
  "coordinateSystem": "UTF16_CODE_UNIT",
  "captureScope": "NORMALIZED_EXTRACTED_TEXT_ONLY",
  "adapter": "controlled-html-replay-v1",
  "extractionMethod": "DECODED_HTML_STRIPPED_TEXT",
  "capturedAt": "2026-11-11T12:29:20.906Z",
  "captureReceipt": {
    "contractVersion": "source-capture-receipt.v1",
    "operation": "CONTROLLED_HTML_REPLAY_CAPTURE",
    "status": "SUCCEEDED",
    "runId": "edae7bde-d527-4a60-a05a-16ff36ee3192",
    "attemptId": "f0dc1413-1d49-44e3-ac67-0089981cb134",
    "inputIndex": 0
  }
}
const recordedSupport = {
  "contractVersion": "evidence-support.v1",
  "sourceId": "source-1",
  "originalContentHash": "sha256:7f89c175b0da167969061551865ee67ad42b793283e61aecaec9f84aadc35777",
  "captureTextHash": "sha256:f242dd6378a58a934eada9e4ee2434ca5c44b17b649c7a34c3238402ac26a1fe",
  "coordinateSystem": "UTF16_CODE_UNIT",
  "start": 3,
  "end": 40,
  "exactExcerpt": "Controlled synthetic workflow profile",
  "excerptHash": "sha256:aa47e2bc71a0f83e0551a3dc8c5037b782020d0c785f0bcaa4c75c4b24a8d135",
  "statementOrigin": "DETERMINISTIC_EXTRACTOR_NORMALIZATION",
  "epistemicType": "SOURCE_ASSERTION",
  "supportStatus": "EXACT_CAPTURE_SPAN_VERIFIED",
  "restrictions": [
    "EXTRACTED_TEXT_COORDINATES_ONLY",
    "SOURCE_ASSERTION_NOT_INDEPENDENTLY_VERIFIED"
  ]
}

const recordedVersion = 'rsv2:recorded-read'
const recordedSource = { sourceId: 'source-1', stateVersion: recordedVersion, sourceStateVersion: recordedVersion,
  contentHash: recordedCapture.originalContentHash, sourceCaptureAvailability: 'RECORDED', sourceCapture: recordedCapture }
const recordedItem = { evidenceObjectId: 'evidence-1', sourceId: 'source-1', stateVersion: recordedVersion,
  sourceStateVersion: recordedVersion, evidenceSupportAvailability: 'RECORDED', evidenceSupport: recordedSupport }
it('binds recorded capture and exact excerpt to the same current source without treating it as original-file coordinates', () => {
  expect(getRecordedSourceCapture(recordedSource, recordedVersion)).toEqual(recordedCapture)
  expect(getRecordedEvidenceSupport(recordedItem, recordedSource, recordedVersion)).toEqual(recordedSupport)
  expect(recordedEvidenceLocation(recordedItem, recordedSource, recordedVersion)).toBe('Extracted-text UTF-16 span [3, 40)')
})
it.each([
  source => { delete source.sourceCapture },
  source => { source.sourceCaptureAvailability = 'NOT_RECORDED' },
  source => { source.stateVersion = 'stale' },
  source => { source.sourceStateVersion = 'stale' },
  source => { source.sourceCapture.sourceId = 'different-source' },
  source => { source.contentHash = 'sha256:' + '0'.repeat(64) },
  source => { source.sourceCapture.captureReceipt.status = 'FAILED' },
  source => { source.sourceCapture.captureReceipt.runId = null },
  source => { source.sourceCapture.coordinateSystem = 'PDF_PAGE' },
  source => { source.sourceCapture.capturedAt = 'unknown' },
])('withholds missing, stale or invalid capture metadata (%#)', mutate => {
  const source = structuredClone(recordedSource); mutate(source)
  expect(getRecordedSourceCapture(source, recordedVersion)).toBeNull()
  expect(getRecordedEvidenceSupport(recordedItem, source, recordedVersion)).toBeNull()
})
it.each([
  item => { delete item.evidenceSupport },
  item => { item.evidenceSupportAvailability = 'NOT_RECORDED' },
  item => { item.sourceId = 'another-source' },
  item => { item.sourceStateVersion = 'stale' },
  item => { item.evidenceSupport.originalContentHash = 'sha256:' + '0'.repeat(64) },
  item => { item.evidenceSupport.captureTextHash = 'sha256:' + '0'.repeat(64) },
  item => { item.evidenceSupport.start = -1 },
  item => { item.evidenceSupport.end = recordedCapture.textLength + 1 },
  item => { item.evidenceSupport.exactExcerpt = '<script>not a recorded excerpt</script>' },
  item => { item.evidenceSupport.restrictions = [] },
  item => { item.evidenceSupport.supportStatus = 'INDEPENDENTLY_VERIFIED' },
])('withholds unrelated or unsupported spans (%#)', mutate => {
  const item = structuredClone(recordedItem); mutate(item)
  expect(getRecordedEvidenceSupport(item, recordedSource, recordedVersion)).toBeNull()
  expect(recordedEvidenceLocation(item, recordedSource, recordedVersion)).toBe('Location not supplied')
})
it('counts UTF-16 units for an emoji span and preserves its exact text', () => {
  const item = structuredClone(recordedItem)
  Object.assign(item.evidenceSupport, {start: 0, end: 2, exactExcerpt: '😀'})
  expect(getRecordedEvidenceSupport(item, recordedSource, recordedVersion)?.exactExcerpt).toBe('😀')
})
it('preserves absent legacy support and non-run document capture semantics', () => {
  expect(getRecordedSourceCapture({}, recordedVersion)).toBeNull()
  expect(recordedEvidenceLocation({}, {}, recordedVersion)).toBe('Location not supplied')
  const source = structuredClone(recordedSource)
  Object.assign(source.sourceCapture.captureReceipt, { operation: 'DOCUMENT_TEXT_CAPTURE', runId: null, attemptId: null })
  expect(getRecordedSourceCapture(source, recordedVersion)?.captureReceipt.runId).toBeNull()
})


const ordinaryWebsiteSource = () => {
  const source = structuredClone(recordedSource)
  source.sourceCapture.adapter = 'website-html-fetch-v1'
  source.sourceCapture.captureReceipt.operation = 'WEBSITE_DECODED_TEXT_CAPTURE'
  return source
}

it.each([true, false])('reads exact WEBSITE capture/support with linked owner IDs: %s', linked => {
  const source = ordinaryWebsiteSource()
  if (!linked) Object.assign(source.sourceCapture.captureReceipt, {runId: null, attemptId: null})
  expect(getRecordedSourceCapture(source, recordedVersion)).toEqual(source.sourceCapture)
  expect(getRecordedEvidenceSupport(recordedItem, source, recordedVersion)).toEqual(recordedSupport)
})

it.each([5, 9])('reads the existing ordinary WEBSITE index%s with exact support', inputIndex => {
  const source = ordinaryWebsiteSource()
  source.sourceCapture.captureReceipt.inputIndex = inputIndex
  expect(getRecordedSourceCapture(source, recordedVersion)).toEqual(source.sourceCapture)
  expect(getRecordedEvidenceSupport(recordedItem, source, recordedVersion)).toEqual(recordedSupport)
})

it.each([
  ['WEBSITE_DECODED_TEXT_CAPTURE', 10], ['DOCUMENT_TEXT_CAPTURE', 5], ['CONTROLLED_HTML_REPLAY_CAPTURE', 1],
])('refuses capture index overflow for %s', (operation, inputIndex) => {
  const source = ordinaryWebsiteSource()
  Object.assign(source.sourceCapture.captureReceipt, { operation, inputIndex })
  if (operation === 'DOCUMENT_TEXT_CAPTURE') Object.assign(source.sourceCapture.captureReceipt, { runId: null, attemptId: null })
  if (operation === 'CONTROLLED_HTML_REPLAY_CAPTURE') source.sourceCapture.adapter = 'controlled-html-replay-v1'
  expect(getRecordedSourceCapture(source, recordedVersion)).toBeNull()
  expect(getRecordedEvidenceSupport(recordedItem, source, recordedVersion)).toBeNull()
})

it.each([
  source => { source.sourceCapture.captureReceipt.runId = null },
  source => { source.sourceCapture.captureReceipt.attemptId = null },
  source => { source.sourceCapture.captureReceipt.runId = 'unverified' },
  source => { source.sourceCapture.captureReceipt.attemptId = 'unverified' },
  source => { source.sourceCapture.adapter = 'controlled-html-replay-v1' },
  source => { source.sourceCapture.extractionMethod = 'UNKNOWN' },
  source => { source.sourceStateVersion = 'different-basis' },
  source => { source.contentHash = 'sha256:' + '0'.repeat(64) },
])('refuses malformed or mismatched WEBSITE receipt without exposing capture or support %#', mutate => {
  const source = ordinaryWebsiteSource()
  mutate(source)
  expect(getRecordedSourceCapture(source, recordedVersion)).toBeNull()
  expect(getRecordedEvidenceSupport(recordedItem, source, recordedVersion)).toBeNull()
})

it('continues to refuse document capture owner IDs rather than extending the website exception', () => {
  const source = ordinaryWebsiteSource()
  source.sourceCapture.captureReceipt.operation = 'DOCUMENT_TEXT_CAPTURE'
  expect(getRecordedSourceCapture(source, recordedVersion)).toBeNull()
})

const nativeUnitRead = () => {
  const source = structuredClone(recordedSource)
  source.sourceRef = 'https://unit.example/'
  Object.assign(source.sourceCapture, {adapter:'website-html-fetch-v1', extractionMethod:'DECODED_HTML_STRIPPED_TEXT'})
  Object.assign(source.sourceCapture.captureReceipt,{operation:'WEBSITE_DECODED_TEXT_CAPTURE'})
  const scope={customerId:'customer',tenantId:'tenant',runtimeInstanceId:'runtime',stateVersion:recordedVersion,sessionRevision:0}
  source.originalContentRef={contractVersion:'evidence-original-reference.v1',originalId:'original_'+'a'.repeat(64),
    inputKind:'PUBLIC_URL',byteHash:'sha256:'+'b'.repeat(64),byteLength:10,acquiredAt:'2026-11-24T12:00:00.000Z',
    binding:{customerId:scope.customerId,tenantId:scope.tenantId,runtimeInstanceId:scope.runtimeInstanceId,
      sourceId:source.sourceId,sourceContentHash:source.contentHash,sourceLocator:source.sourceRef},
    policy:{policyId:'FS-006',policyVersion:'0.2',effectiveEnvironment:'DEVELOPMENT_TEST',policyHash:'sha256:'+'c'.repeat(64),retentionDays:30,
      nativeResearch:{capture:source.sourceCapture,grant:{kind:'PUBLISHER_TERMS',decision:'ALLOWED',legalStatus:'CONFIRMED',retentionAllowed:true,
        url:source.sourceRef,scope:{customerId:scope.customerId,tenantId:scope.tenantId},
        attribution:{publisher:'Unit publisher',statement:'Unit attribution',licenceUrl:'https://unit.example/licence'}}}}}
  const data={availability:'AVAILABLE_DEV_TEST',originalContentRef:source.originalContentRef,observedStateVersion:recordedVersion,
    auditId:'d'.repeat(24),capturedText:'x'.repeat(source.sourceCapture.textLength)}
  return {source,scope,data}
}
it('binds original read metadata to selected source, scope and current state',()=>{
  const {source,scope,data}=nativeUnitRead()
  expect(getRecordedNativeOriginal(source,scope)).toEqual(source.originalContentRef)
  expect(getRecordedOriginalRead({data},source,scope)).toEqual(data)
  for(const patch of [{stateVersion:'old'},{customerId:'other'},{tenantId:'other'},{runtimeInstanceId:'other'}])
    expect(getRecordedNativeOriginal(source,{...scope,...patch})).toBeNull()
  for(const patch of [{observedStateVersion:'old'},{availability:'AVAILABLE_DEV_TEST_FIXTURE'},{auditId:null},{capturedText:'wrong'}])
    expect(getRecordedOriginalRead({data:{...data,...patch}},source,scope)).toBeNull()
})
it('hides malformed or missing native references without inventing legacy originals',()=>{
  const {source,scope}=nativeUnitRead()
  expect(getRecordedNativeOriginal(recordedSource,scope)).toBeNull()
  for(const mutate of [
    ref=>{ref.binding.sourceId='other'},ref=>{ref.byteHash='unverified'},
    ref=>{ref.policy.nativeResearch.grant.attribution.licenceUrl='javascript:alert(1)'},
    ref=>{ref.policy.nativeResearch.grant.retentionAllowed=false},
  ]){const copy=structuredClone(source);mutate(copy.originalContentRef);expect(getRecordedNativeOriginal(copy,scope)).toBeNull()}
})

const reverseRecordedKeys = value => value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reverseRecordedKeys(item)])) : value
it('accepts the same recorded values after storage and projection reorder nested keys',()=>{
  const {source,scope,data}=nativeUnitRead()
  source.originalContentRef.policy.nativeResearch.capture=reverseRecordedKeys(source.sourceCapture)
  data.originalContentRef=reverseRecordedKeys(source.originalContentRef)
  expect(getRecordedNativeOriginal(source,scope)).toEqual(source.originalContentRef)
  expect(getRecordedOriginalRead({data},source,scope)).toEqual(data)
  data.originalContentRef.binding.sourceId='changed'
  expect(getRecordedOriginalRead({data},source,scope)).toBeNull()
})
it('rejects malformed or cyclic recorded values even when both arguments share identity',()=>{
  const {source,scope,data}=nativeUnitRead()
  source.originalContentRef.self=source.originalContentRef
  expect(getRecordedOriginalRead({data},source,scope)).toBeNull()
  delete source.originalContentRef.self
  Object.defineProperty(source.originalContentRef.policy.nativeResearch.capture,'injected',{enumerable:true,get:()=>{throw Error('Getter must not run')}})
  expect(()=>getRecordedNativeOriginal(source,scope)).not.toThrow()
  expect(getRecordedNativeOriginal(source,scope)).toBeNull()
})
