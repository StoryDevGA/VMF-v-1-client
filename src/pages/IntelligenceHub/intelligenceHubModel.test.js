import { describe, expect, it } from 'vitest'
import {
  HUB_VIEWS,
  getRecordedSourceCapture,
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
