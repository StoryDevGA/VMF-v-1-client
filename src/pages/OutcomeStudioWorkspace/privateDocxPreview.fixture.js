import { webcrypto } from 'node:crypto'

export const previewScopeFixture = { runtimeInstanceId: '6ad715c91f39fea112115875', customerId: '507f1f77bcf86cd799439012', tenantId: '507f1f77bcf86cd799439011' }
export const privateDocxPreviewFixture = async (count = 5) => {
  const sha = async value => [...new Uint8Array(await webcrypto.subtle.digest('SHA-256', value))].map(byte => byte.toString(16).padStart(2, '0')).join('')
  const hashJson = value => sha(new TextEncoder().encode(JSON.stringify(value)))
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='
  const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0))
  const flags = { classification: 'NON_AUTHORITATIVE_SYNTHETIC_DEV_TEST', authoritative: false, officialUse: false,
    normalOutputAvailable: false, authorisesApproval: false, finalisationAvailable: false, deliveryAvailable: false }
  const candidate = { ...flags, candidateId: 'docx_candidate_12345678-1234-4234-8234-123456789012',
    status: 'PRIVATE_UNREVIEWED', sourceFingerprint: 'a'.repeat(64), inputFingerprint: 'b'.repeat(64),
    renderer: { version: '0.1.2' }, selectedPacks: { OUTPUT_TYPE: { label: 'Generic paper' } }, createdAt: '2026-10-28T16:00:00.000Z',
    artifact: { format: 'DOCX', outputChecksum: `sha256:${'c'.repeat(64)}` } }
  const runtime = { contractVersion: 'DOCX_PAGE_RUNTIME_V1', dpi: 150, platform: 'win32', standardFontPolicy: 'PDFJS_BUNDLED_BASE14_V1' }
  const conversion = { contractVersion: 'DOCX_PAGE_PREVIEW_V1', status: 'PRIVATE_PREVIEW_ONLY', authorisesApproval: false,
    finalisationAvailable: false, deliveryAvailable: false, docxChecksum: candidate.artifact.outputChecksum, pdfChecksum: `sha256:${'d'.repeat(64)}`,
    runtime, runtimeFingerprint: await hashJson(runtime), pages: [] }
  for (let index = 0; index < count; index++) conversion.pages.push({ number: index + 1, width: 1, height: 1, byteLength: bytes.length, sha256: await sha(bytes) })
  const preview = { ...flags, contractVersion: 'private-docx-page-preview.v1', status: 'PRIVATE_PREVIEW_ONLY',
    previewId: 'docx_preview_12345678-1234-4234-8234-123456789012', candidateId: candidate.candidateId,
    scope: { ...previewScopeFixture }, sourceFingerprint: candidate.sourceFingerprint, inputFingerprint: candidate.inputFingerprint,
    renderer: candidate.renderer, conversion, conversionFingerprint: await hashJson(conversion) }
  const document = { title: 'Generic paper', markdown: '# Generic paper\n\n## Decision\n\nA qualified claim.\n\n<script>unsafe</script>', inputFingerprint: candidate.inputFingerprint }
  return { candidate, hashJson, list: { data: { scope: { ...previewScopeFixture }, sourceFingerprint: candidate.sourceFingerprint, candidates: [candidate] } },
    bundle: { data: { preview, document, pages: conversion.pages.map(page => ({ number: page.number, mimeType: 'image/png', base64 })) } } }
}

export const masterLinkedPrivateDocxPreviewFixture = async (count = 6) => {
  const f = await privateDocxPreviewFixture(count), candidate = f.candidate
  const canonical = value => value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
  candidate.contractVersion = 'private-docx-candidate.v2'
  candidate.bodyFingerprint = 'f'.repeat(64)
  candidate.renderer.version = '0.1.3'
  candidate.masterBinding = { contractVersion: 'master-linked-private-docx-binding.v1',
    masterReference: { storageId: '507f1f77bcf86cd799439021', masterId: 'meaning_master_12345678-1234-4234-8234-123456789012',
      version: 1, scope: { ...previewScopeFixture }, bodyFingerprint: '2'.repeat(64), sourceFingerprint: candidate.sourceFingerprint,
      sourceProjectionFingerprint: '3'.repeat(64), auditId: '507f1f77bcf86cd799439022', auditSignatureVersion: 3 },
    expressionOrigin: 'RETAINED_SOURCE_SHAPING_UNREVIEWED', wrapperFingerprint: 'e'.repeat(64) }
  candidate.masterBindingFingerprint = await f.hashJson(canonical(candidate.masterBinding))
  Object.assign(f.bundle.data.preview, { contractVersion: 'private-docx-page-preview.v2',
    candidateBodyFingerprint: candidate.bodyFingerprint, masterBindingFingerprint: candidate.masterBindingFingerprint })
  return f
}

export const controlledSnapshotPreviewFixture = async () => {
  const f = await masterLinkedPrivateDocxPreviewFixture()
  const provenance = { contractVersion: 'controlled-docx-storage.v1', kind: 'CONTROLLED_SNAPSHOT',
    sourceCurrentness: 'ISOLATED_READ_OBSERVATION_ONLY', nativeAccess: 'CHECKED_FOR_THIS_RESPONSE',
    customerApproved: false, authorisesApproval: false }
  f.candidate.storageProvenance = { ...provenance }
  f.bundle.data.preview.storageProvenance = { ...provenance }
  return f
}

// Decoder projection only: generic one-pixel images do not prove a saved DOCX or review.
export const correctedPrivateDocxPreviewFixture = async () => {
  const f = await masterLinkedPrivateDocxPreviewFixture(7)
  const binding = f.candidate.masterBinding
  binding.contractVersion = 'master-linked-private-docx-binding.v2'
  binding.expressionOrigin = 'VERSIONED_COMMERCIAL_CORRECTION_UNREVIEWED'
  binding.correctionReference = { predecessorBodyFingerprint: '6'.repeat(64), predecessor: {
    candidateId: 'docx_candidate_22345678-1234-4234-8234-123456789012', inputFingerprint: '7'.repeat(64),
    outputChecksum: 'sha256:' + '8'.repeat(64), failedReviewExecutionId: 'master_docx_result_' + '9'.repeat(40),
    failedReviewResultFingerprint: '0'.repeat(64),
  } }
  const canonical = value => value && Object.getPrototypeOf(value) === Object.prototype
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
  f.candidate.masterBindingFingerprint = await f.hashJson(canonical(binding))
  f.bundle.data.preview.masterBindingFingerprint = f.candidate.masterBindingFingerprint
  return f
}

// Generic decoder projection only; no stored bytes, approval or currentness proof.
export const approvedPrivateDocxPreviewFixture = async () => {
  const f = await masterLinkedPrivateDocxPreviewFixture(7), binding = f.candidate.masterBinding
  binding.contractVersion = 'master-linked-private-docx-binding.v3'
  binding.expressionOrigin = 'APPROVED_EXPRESSION_PRIVATE_CORRECTION_UNREVIEWED'
  f.candidate.renderer.version = '0.1.4'
  binding.compatibilityReference = { version: 'commercial-docx-approved-expression.v1', auditId: 'a'.repeat(24),
    decisionFingerprint: 'b'.repeat(64), sourceFingerprint: f.candidate.sourceFingerprint, mappingFingerprint: 'c'.repeat(64),
    masterId: binding.masterReference.masterId, predecessorCandidateId: 'docx_candidate_22345678-1234-4234-8234-123456789012',
    failedReviewExecutionId: 'master_docx_result_' + 'd'.repeat(40), failedReviewResultFingerprint: 'e'.repeat(64),
    section13State: 'DESCRIPTIVE_NO_OPERATIONAL_AUTHORITY_CONTROLLED_TEST_ONLY' }
  const canonical = value => value && Object.getPrototypeOf(value) === Object.prototype
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
  f.candidate.masterBindingFingerprint = await f.hashJson(canonical(binding))
  f.bundle.data.preview.masterBindingFingerprint = f.candidate.masterBindingFingerprint
  return f
}
