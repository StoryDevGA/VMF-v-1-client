const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const checksum = value => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value)
const candidateId = value => typeof value === 'string' && /^docx_candidate_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)
const linkedCandidateVersion = 'private-docx-candidate.v2'
const linkedPreviewVersion = 'private-docx-page-preview.v2'
const plain = value => value && Object.getPrototypeOf(value) === Object.prototype
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key) && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'))
const objectId = value => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value)
const holds = value => value?.classification === 'NON_AUTHORITATIVE_SYNTHETIC_DEV_TEST'
  && ['authoritative', 'officialUse', 'normalOutputAvailable', 'authorisesApproval', 'finalisationAvailable', 'deliveryAvailable'].every(key => value[key] === false)
const scoped = (value, scope) => ['runtimeInstanceId', 'customerId', 'tenantId'].every(key => value?.[key] === scope[key])
const fail = () => { throw new Error('The saved document preview could not be verified.') }
const bytesOf = value => new TextEncoder().encode(value)
const digest = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('')
const linkedFields = ['bodyFingerprint', 'masterBinding', 'masterBindingFingerprint']
const storageReceipt = {
  contractVersion: 'controlled-docx-storage.v1', kind: 'CONTROLLED_SNAPSHOT',
  sourceCurrentness: 'ISOLATED_READ_OBSERVATION_ONLY', nativeAccess: 'CHECKED_FOR_THIS_RESPONSE',
  customerApproved: false, authorisesApproval: false,
}
const storageValid = value => !Object.hasOwn(value, 'storageProvenance')
  || (exact(value.storageProvenance, Object.keys(storageReceipt))
    && Object.entries(storageReceipt).every(([key, expected]) => value.storageProvenance[key] === expected))
const correctedBindingValid = (candidate, binding) => {
  const correction = binding.correctionReference, predecessor = correction?.predecessor
  return candidate.renderer?.version === '0.1.3'
    && exact(correction, ['predecessor', 'predecessorBodyFingerprint']) && hash(correction.predecessorBodyFingerprint)
    && correction.predecessorBodyFingerprint !== candidate.bodyFingerprint
    && exact(predecessor, ['candidateId', 'inputFingerprint', 'outputChecksum', 'failedReviewExecutionId', 'failedReviewResultFingerprint'])
    && candidateId(predecessor.candidateId) && predecessor.candidateId !== candidate.candidateId
    && hash(predecessor.inputFingerprint) && predecessor.inputFingerprint !== candidate.inputFingerprint
    && checksum(predecessor.outputChecksum) && predecessor.outputChecksum !== candidate.artifact?.outputChecksum
    && typeof predecessor.failedReviewExecutionId === 'string' && /^master_docx_result_[a-f0-9]{40}$/.test(predecessor.failedReviewExecutionId)
    && hash(predecessor.failedReviewResultFingerprint)
}
const approvedBindingValid = (candidate, binding) => {
  const ref = binding.compatibilityReference
  const narrow = binding.contractVersion === 'master-linked-private-docx-binding.v4'
  return candidate.renderer?.version === (narrow ? '0.1.5' : '0.1.4')
    && (!narrow || candidate.renderer.layoutProfile === 'SOURCE_SCOPED_QUOTATIONS_V2')
    && exact(ref, ['version', 'auditId', 'decisionFingerprint', 'sourceFingerprint', 'mappingFingerprint', 'masterId',
      'predecessorCandidateId', 'failedReviewExecutionId', 'failedReviewResultFingerprint', 'section13State'])
    && ref.version === (narrow ? 'commercial-docx-approved-expression.v2' : 'commercial-docx-approved-expression.v1') && objectId(ref.auditId)
    && ['decisionFingerprint', 'sourceFingerprint', 'mappingFingerprint', 'failedReviewResultFingerprint'].every(key => hash(ref[key]))
    && ref.sourceFingerprint === candidate.sourceFingerprint && ref.masterId === binding.masterReference?.masterId
    && candidateId(ref.predecessorCandidateId) && ref.predecessorCandidateId !== candidate.candidateId
    && typeof ref.failedReviewExecutionId === 'string' && /^master_docx_result_[a-f0-9]{40}$/.test(ref.failedReviewExecutionId)
    && ref.section13State === 'DESCRIPTIVE_NO_OPERATIONAL_AUTHORITY_CONTROLLED_TEST_ONLY'
}
const candidateVersionValid = (candidate, scope) => {
  if (!plain(candidate)) return false
  if (candidate.contractVersion !== linkedCandidateVersion) return [undefined, 'private-docx-candidate.v1'].includes(candidate.contractVersion)
    && linkedFields.every(key => !Object.hasOwn(candidate, key))
  const binding = candidate.masterBinding, ref = binding?.masterReference
  const corrected = binding?.contractVersion === 'master-linked-private-docx-binding.v2'
  const narrow = binding?.contractVersion === 'master-linked-private-docx-binding.v4'
  const approved = binding?.contractVersion === 'master-linked-private-docx-binding.v3' || narrow
  return hash(candidate.bodyFingerprint) && hash(candidate.masterBindingFingerprint)
    && exact(binding, ['contractVersion', 'masterReference', 'expressionOrigin', 'wrapperFingerprint', ...(corrected ? ['correctionReference'] : []),
      ...(approved ? ['compatibilityReference'] : [])])
    && (approved ? binding.expressionOrigin === (narrow ? 'NARROW_EXPRESSION_PRIVATE_CORRECTION_UNREVIEWED'
      : 'APPROVED_EXPRESSION_PRIVATE_CORRECTION_UNREVIEWED') && approvedBindingValid(candidate, binding)
      : corrected ? binding.expressionOrigin === 'VERSIONED_COMMERCIAL_CORRECTION_UNREVIEWED' && correctedBindingValid(candidate, binding)
      : binding.contractVersion === 'master-linked-private-docx-binding.v1' && binding.expressionOrigin === 'RETAINED_SOURCE_SHAPING_UNREVIEWED')
    && hash(binding.wrapperFingerprint)
    && exact(ref, ['storageId', 'masterId', 'version', 'scope', 'bodyFingerprint', 'sourceFingerprint', 'sourceProjectionFingerprint', 'auditId', 'auditSignatureVersion'])
    && objectId(ref.storageId) && objectId(ref.auditId) && typeof ref.masterId === 'string'
    && /^meaning_master_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(ref.masterId)
    && ref.version === 1 && Number.isSafeInteger(ref.auditSignatureVersion) && ref.auditSignatureVersion >= 1
    && exact(ref.scope, ['runtimeInstanceId', 'customerId', 'tenantId']) && Object.values(ref.scope).every(objectId)
    && scoped(ref.scope, scope) && ref.sourceFingerprint === candidate.sourceFingerprint
    && ['bodyFingerprint', 'sourceFingerprint', 'sourceProjectionFingerprint'].every(key => hash(ref[key]))
}
// This is the server's sorted-key checksum for the exact validated JSON binding.
// Body/wrapper hashes remain opaque server commitments; the private input is not returned.
const canonicalBinding = value => plain(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalBinding(value[key])])) : value

export const readPrivateDocxCandidates = (response, scope) => {
  const data = response?.data
  if (!scoped(data?.scope, scope) || !hash(data.sourceFingerprint) || !Array.isArray(data.candidates) || data.candidates.length > 20
    || data.candidates.some(row => !row || typeof row !== 'object' || Array.isArray(row))
    || new Set(data.candidates.map(row => row.candidateId)).size !== data.candidates.length
    || data.candidates.some(row => !candidateId(row.candidateId) || !holds(row) || !candidateVersionValid(row, scope) || !storageValid(row) || row.status !== 'PRIVATE_UNREVIEWED'
      || row.sourceFingerprint !== data.sourceFingerprint || !hash(row.inputFingerprint) || !checksum(row.artifact?.outputChecksum)
      || row.artifact.format !== 'DOCX' || typeof row.renderer?.version !== 'string' || !row.renderer.version.trim()
      || typeof row.createdAt !== 'string' || !Number.isFinite(Date.parse(row.createdAt))
      || typeof row.selectedPacks?.OUTPUT_TYPE?.label !== 'string' || !row.selectedPacks.OUTPUT_TYPE.label.trim()
      || row.selectedPacks.OUTPUT_TYPE.label.length > 300)) return null
  return data.candidates
}

export const decodePrivateDocxPreview = async (response, candidate, scope) => {
  if (bytesOf(JSON.stringify(response)).length > 12 * 1024 ** 2) fail()
  const data = response?.data, preview = data?.preview, conversion = preview?.conversion, text = data?.document
  const linked = candidate?.contractVersion === linkedCandidateVersion
  if (!candidate || !candidateId(candidate.candidateId) || !holds(candidate) || candidate.status !== 'PRIVATE_UNREVIEWED'
    || !candidateVersionValid(candidate, scope) || !storageValid(candidate) || !preview
    || preview.contractVersion !== (linked ? linkedPreviewVersion : 'private-docx-page-preview.v1')
    || (linked ? preview.candidateBodyFingerprint !== candidate.bodyFingerprint || preview.masterBindingFingerprint !== candidate.masterBindingFingerprint
      : ['candidateBodyFingerprint', 'masterBindingFingerprint'].some(key => Object.hasOwn(preview, key)))
    || preview.status !== 'PRIVATE_PREVIEW_ONLY'
    || !/^docx_preview_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(preview.previewId || '')
    || !holds(preview) || !storageValid(preview)
    || Object.hasOwn(candidate, 'storageProvenance') !== Object.hasOwn(preview, 'storageProvenance')
    || !scoped(preview.scope, scope) || preview.candidateId !== candidate.candidateId
    || preview.sourceFingerprint !== candidate.sourceFingerprint || preview.inputFingerprint !== candidate.inputFingerprint
    || JSON.stringify(preview.renderer) !== JSON.stringify(candidate.renderer)
    || conversion?.contractVersion !== 'DOCX_PAGE_PREVIEW_V1' || conversion.status !== 'PRIVATE_PREVIEW_ONLY'
    || ['authorisesApproval', 'finalisationAvailable', 'deliveryAvailable'].some(key => conversion[key] !== false)
    || conversion.docxChecksum !== candidate.artifact.outputChecksum || !checksum(conversion.pdfChecksum)
    || !hash(preview.conversionFingerprint) || !hash(conversion.runtimeFingerprint)
    || conversion.runtime?.contractVersion !== 'DOCX_PAGE_RUNTIME_V1' || conversion.runtime.dpi !== 150
    || conversion.runtime.platform !== 'win32' || conversion.runtime.standardFontPolicy !== 'PDFJS_BUNDLED_BASE14_V1'
    || !Array.isArray(conversion.pages) || conversion.pages.length < 1 || conversion.pages.length > 20
    || !Array.isArray(data.pages) || data.pages.length !== conversion.pages.length
    || !text || typeof text.title !== 'string' || !text.title.trim() || typeof text.markdown !== 'string'
    || !text.markdown.trim() || bytesOf(text.markdown).length > 1024 ** 2 || text.inputFingerprint !== candidate.inputFingerprint) fail()
  if (linked && await digest(bytesOf(JSON.stringify(canonicalBinding(candidate.masterBinding)))) !== candidate.masterBindingFingerprint) fail()
  if (await digest(bytesOf(JSON.stringify(conversion))) !== preview.conversionFingerprint
    || await digest(bytesOf(JSON.stringify(conversion.runtime))) !== conversion.runtimeFingerprint) fail()
  let total = 0, pixels = 0
  const blobs = []
  for (const [index, page] of data.pages.entries()) {
    const expected = conversion.pages[index]
    if (page.number !== index + 1 || expected.number !== index + 1 || page.mimeType !== 'image/png'
      || typeof page.base64 !== 'string' || page.base64.length > Math.ceil(2 * 1024 ** 2 / 3) * 4
      || page.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(page.base64)
      || ![expected.width, expected.height].every(value => Number.isInteger(value) && value > 0 && value <= 2500)
      || !hash(expected.sha256)) fail()
    const raw = atob(page.base64)
    if (btoa(raw) !== page.base64) fail()
    const bytes = Uint8Array.from(raw, character => character.charCodeAt(0))
    total += bytes.length; pixels += expected.width * expected.height
    if (bytes.length < 24 || bytes.length > 2 * 1024 ** 2 || bytes.length !== expected.byteLength
      || total > 8 * 1024 ** 2 || pixels > 60_000_000
      || [...bytes.subarray(0, 8)].join(',') !== '137,80,78,71,13,10,26,10'
      || new DataView(bytes.buffer).getUint32(16) !== expected.width || new DataView(bytes.buffer).getUint32(20) !== expected.height
      || await digest(bytes) !== expected.sha256) fail()
    blobs.push(new Blob([bytes], { type: 'image/png' }))
  }
  return { blobs, document: text, preview }
}
