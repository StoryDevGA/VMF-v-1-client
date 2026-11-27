import { readGithubCapture, githubCaptureRequestUrl, githubCaptureCanonicalUrl } from './githubCaptureContract.js'
import { readIndustryCapture } from './industryCaptureContract.js'
import { getExecutionWorkspaceDestinationHref, getRuntimeWorkspaceRoute } from '../../utils/runtimeWorkspace.js'
import { readCustomerResearchDeclaration, readCustomerReportUrl } from '../../utils/customerSuppliedResearch.js'

export const HUB_VIEWS = Object.freeze([
  'Overview',
  'Context',
  'Sources',
  'Review',
  'Evidence readiness',
  'Readiness & publish',
  'After lock',
  'Coverage',
  'Intelligence Graph',
])

const id = (value) => String(value ?? '').trim()

export const getHubPayload = (response) => response?.data?.data ?? response?.data ?? response ?? null

export const getHubDiscovery = (renderer) =>
  renderer?.discovery ?? renderer?.evidencePack ?? renderer?.evidence_pack ?? null

export const getHubEvidencePage = (response) => {
  const payload = getHubPayload(response)
  return Array.isArray(payload?.evidenceObjects) ? payload : null
}

const sourceEvidenceHash = value => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value)
const currentSourceEvidence = (row, stateVersion) => Boolean(stateVersion && row?.stateVersion === stateVersion
  && row.sourceStateVersion === stateVersion)

// The API validates recorded metadata. These guards bind it to the selected
// read; they do not independently verify capture bytes or audit authority.
export const getRecordedSourceCapture = (source, stateVersion) => {
  const capture = source?.sourceCapture
  const receipt = capture?.captureReceipt
  if (!currentSourceEvidence(source, stateVersion) || source.sourceCaptureAvailability !== 'RECORDED'
    || !source.sourceId || capture?.contractVersion !== 'source-capture.v1' || capture.sourceId !== source.sourceId
    || !sourceEvidenceHash(capture.originalContentHash) || capture.originalContentHash !== source.contentHash
    || !sourceEvidenceHash(capture.captureTextHash) || capture.coordinateSystem !== 'UTF16_CODE_UNIT'
    || capture.captureScope !== 'NORMALIZED_EXTRACTED_TEXT_ONLY'
    || !Number.isSafeInteger(capture.textLength) || capture.textLength < 1 || capture.textLength > 80000
    || typeof capture.capturedAt !== 'string' || !Number.isFinite(Date.parse(capture.capturedAt))
    || typeof capture.adapter !== 'string' || !capture.adapter || typeof capture.extractionMethod !== 'string' || !capture.extractionMethod
    || receipt?.contractVersion !== 'source-capture-receipt.v1' || receipt.status !== 'SUCCEEDED'
    || !['CONTROLLED_HTML_REPLAY_CAPTURE', 'DOCUMENT_TEXT_CAPTURE', 'WEBSITE_DECODED_TEXT_CAPTURE'].includes(receipt.operation)
    || !Number.isSafeInteger(receipt.inputIndex) || receipt.inputIndex < 0
    || receipt.inputIndex > (receipt.operation === 'WEBSITE_DECODED_TEXT_CAPTURE' ? 9 : 4)) return null
  const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)
  if (receipt.operation === 'CONTROLLED_HTML_REPLAY_CAPTURE') {
    if (!uuid(receipt.runId) || !uuid(receipt.attemptId) || receipt.inputIndex !== 0
      || capture.adapter !== 'controlled-html-replay-v1' || capture.extractionMethod !== 'DECODED_HTML_STRIPPED_TEXT') return null
  } else if (receipt.operation === 'WEBSITE_DECODED_TEXT_CAPTURE') {
    if (capture.adapter !== 'website-html-fetch-v1' || capture.extractionMethod !== 'DECODED_HTML_STRIPPED_TEXT'
      || !(receipt.runId === null && receipt.attemptId === null)
        && !(uuid(receipt.runId) && uuid(receipt.attemptId))) return null
  } else if (!(receipt.runId === null && receipt.attemptId === null)
    && !(uuid(receipt.runId) && uuid(receipt.attemptId))) return null
  return capture
}

export const getRecordedGithubSource = (source, stateVersion) => {
  const capture = getRecordedSourceCapture(source, stateVersion), value = source?.publicResearchProvenance
  const fields = ['contractVersion', 'mode', 'provider', 'category', 'metadataMethod', 'apiVersion', 'owner', 'repository',
    'path', 'commit', 'canonicalUrl', 'publishedAt', 'currentness', 'permittedInterpretation', 'prohibitedInterpretation',
    'limitations', 'sourceId', 'originalContentHash', 'requestedUrl', 'finalUrl', 'retrievedAt']
  if (!capture || !value || Array.isArray(value) || Object.keys(value).length !== fields.length
    || !fields.every(key => Object.hasOwn(value, key)) || value.contractVersion !== 'public-research-source.v3'
    || value.mode !== 'LIVE_PUBLIC_API' || value.provider !== 'GITHUB_CONTENTS' || value.category !== 'GITHUB'
    || value.metadataMethod !== 'GITHUB_CONTENTS_RENDERED_HTML' || value.apiVersion !== '2026-03-10'
    || value.publishedAt !== null || value.currentness !== 'PINNED_REVISION_NOT_LATEST_STATUS'
    || capture.captureReceipt.operation !== 'WEBSITE_DECODED_TEXT_CAPTURE'
    || value.sourceId !== source.sourceId || value.originalContentHash !== capture.originalContentHash
    || value.requestedUrl !== source.sourceRef || value.finalUrl !== value.requestedUrl || value.retrievedAt !== capture.capturedAt
    || !['permittedInterpretation', 'prohibitedInterpretation', 'limitations'].every(key => typeof value[key] === 'string'
      && value[key].trim().length > 0 && value[key].length <= 2000)) return null
  const identity = readGithubCapture({ contractVersion: 'public-research-github-capture.v1', owner: value.owner,
    repository: value.repository, path: value.path, commit: value.commit })
  return identity && value.requestedUrl === githubCaptureRequestUrl(identity)
    && value.canonicalUrl === githubCaptureCanonicalUrl(identity) ? value : null
}

export const getRecordedIndustrySource = (source, stateVersion) => {
  const capture = getRecordedSourceCapture(source, stateVersion), value = source?.publicResearchProvenance
  const fields = ['contractVersion', 'mode', 'provider', 'category', 'metadataMethod', 'title', 'publisher', 'publishedAt',
    'publicationContentId', 'canonicalUrl', 'reportingPeriodQuote', 'reportCaveatQuote', 'scopeMethod', 'currentness',
    'permittedInterpretation', 'prohibitedInterpretation', 'limitations', 'sourceId', 'originalContentHash', 'requestedUrl', 'finalUrl', 'retrievedAt']
  const text = (candidate, max) => typeof candidate === 'string' && candidate.trim().length > 0 && candidate.length <= max
  if (!capture || !value || Array.isArray(value) || Object.keys(value).length !== fields.length
    || !fields.every(key => Object.hasOwn(value, key)) || value.contractVersion !== 'public-research-source.v4'
    || value.mode !== 'LIVE_PUBLIC_WEB' || value.provider !== 'PUBLIC_HTTPS' || value.category !== 'INDUSTRY'
    || value.metadataMethod !== 'GOVUK_HTML_PUBLICATION_METADATA'
    || value.scopeMethod !== 'NOMINATED_QUOTES_MATCHED_CAPTURE_TEXT'
    || value.currentness !== 'PUBLISHER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'
    || !text(value.title, 500) || !text(value.publisher, 255) || !text(value.publishedAt, 80) || !Number.isFinite(Date.parse(value.publishedAt))
    || typeof value.publicationContentId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.publicationContentId)
    || capture.captureReceipt.operation !== 'WEBSITE_DECODED_TEXT_CAPTURE'
    || value.sourceId !== source.sourceId || value.originalContentHash !== capture.originalContentHash
    || value.requestedUrl !== source.sourceRef || value.finalUrl !== value.requestedUrl || value.canonicalUrl !== value.requestedUrl
    || value.retrievedAt !== capture.capturedAt
    || !['permittedInterpretation', 'prohibitedInterpretation', 'limitations'].every(key => text(value[key], 2000))) return null
  return readIndustryCapture({ contractVersion: 'public-research-industry-capture.v1', reportUrl: value.requestedUrl,
    reportingPeriodQuote: value.reportingPeriodQuote, reportCaveatQuote: value.reportCaveatQuote }) ? value : null
}

export const getRecordedNewsSource = (source, stateVersion) => {
  const capture = getRecordedSourceCapture(source, stateVersion), value = source?.publicResearchProvenance
  const fields = ['contractVersion', 'mode', 'provider', 'category', 'metadataMethod', 'title', 'publisher', 'author',
    'publishedAt', 'currentness', 'permittedInterpretation', 'prohibitedInterpretation', 'limitations',
    'sourceId', 'originalContentHash', 'requestedUrl', 'finalUrl', 'retrievedAt']
  const text = (candidate, max) => typeof candidate === 'string' && candidate.trim().length > 0 && candidate.length <= max
  if (!capture || !value || Array.isArray(value) || Object.keys(value).length !== fields.length
    || !fields.every(field => Object.hasOwn(value, field))
    || value.contractVersion !== 'public-research-source.v2' || value.mode !== 'LIVE_PUBLIC_WEB'
    || value.provider !== 'PUBLIC_HTTPS' || value.category !== 'NEWS' || value.metadataMethod !== 'NEWSARTICLE_JSON_LD'
    || capture.captureReceipt.operation !== 'WEBSITE_DECODED_TEXT_CAPTURE'
    || value.currentness !== 'PUBLISHER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'
    || value.sourceId !== source.sourceId || value.originalContentHash !== capture.originalContentHash
    || value.requestedUrl !== source.sourceRef || value.finalUrl !== value.requestedUrl
    || value.retrievedAt !== capture.capturedAt || !text(value.title, 500) || !text(value.publisher, 255)
    || !(value.author === null || text(value.author, 255))
    || !(value.publishedAt === null || text(value.publishedAt, 100) && Number.isFinite(Date.parse(value.publishedAt)))
    || !['permittedInterpretation', 'prohibitedInterpretation', 'limitations'].every(field => text(value[field], 2000))) return null
  try {
    const url = new URL(value.requestedUrl)
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) return null
  } catch { return null }
  return value
}

// Recorded references/capture descriptors contain plain objects, arrays and scalar JSON
// values. Compare their values, independent of storage/projection key order.
const sameRecordedValue = (left, right, seen = new WeakSet(), depth = 0) => {
  if (depth > 16 || typeof left !== typeof right) return false
  if (left === null || right === null) return left === right
  if (['string', 'boolean', 'number'].includes(typeof left))
    return (typeof left !== 'number' || Number.isFinite(left)) && left === right
  const array = Array.isArray(left)
  if (typeof left !== 'object' || array !== Array.isArray(right)
    || !(array ? Object.getPrototypeOf(left) === Array.prototype && left.length <= 20
      : [Object.prototype, null].includes(Object.getPrototypeOf(left)))
    || !(array ? Object.getPrototypeOf(right) === Array.prototype && right.length <= 20
      : [Object.prototype, null].includes(Object.getPrototypeOf(right)))
    || Object.getOwnPropertySymbols(left).length || Object.getOwnPropertySymbols(right).length
    || seen.has(left) || seen.has(right)) return false
  const leftFields = Object.getOwnPropertyDescriptors(left), rightFields = Object.getOwnPropertyDescriptors(right)
  const keys = Object.keys(leftFields).filter(key => !array || key !== 'length')
  if (array && (left.length !== right.length || keys.length !== left.length
    || keys.some((key, index) => key !== String(index)))) return false
  if (keys.length !== Object.keys(rightFields).filter(key => !array || key !== 'length').length) return false
  seen.add(left); seen.add(right)
  try {
    return keys.every(key => !['__proto__', 'constructor', 'prototype'].includes(key)
      && Object.hasOwn(rightFields, key) && leftFields[key].enumerable && rightFields[key].enumerable
      && Object.hasOwn(leftFields[key], 'value') && Object.hasOwn(rightFields[key], 'value')
      && sameRecordedValue(leftFields[key].value, rightFields[key].value, seen, depth + 1))
  } finally { seen.delete(left); seen.delete(right) }
}

export const getRecordedCustomerResearch = (source, stateVersion) => {
  const capture = getRecordedSourceCapture(source, stateVersion), report = source?.customerSuppliedResearch
  if (!capture || !report || !sameRecordedValue(report, report) || source.sourceType !== 'UPLOADED_DOCUMENT'
    || source.publicResearchProvenance !== undefined || source.controlledReplayProvenance !== undefined
    || report.contractVersion !== 'customer-supplied-research.v1' || report.classification !== 'CUSTOMER_SUPPLIED_RESEARCH'
    || report.rightsStatus !== 'CUSTOMER_DECLARED_NOT_VERIFIED' || report.sourceId !== source.sourceId
    || !/^[a-f0-9]{24}$/.test(report.suppliedBy || '') || report.suppliedAt !== capture.capturedAt
    || report.originalByteHash !== capture.originalContentHash || capture.captureReceipt.operation !== 'DOCUMENT_TEXT_CAPTURE'
    || !report.runId || !report.attemptId || report.runId !== capture.captureReceipt.runId
    || report.attemptId !== capture.captureReceipt.attemptId || capture.captureReceipt.inputIndex !== 0) return null
  const declaration = report.declaration
  const validated = readCustomerResearchDeclaration({ ...declaration, tool: declaration?.tool ?? '', model: declaration?.model ?? '',
    searchMethod: declaration?.searchMethod ?? '', citationUrls: Array.isArray(declaration?.citationUrls) ? declaration.citationUrls.join('\n') : '' }).declaration
  if (!validated) return null
  const { contractVersion: _version, ...normalized } = validated
  const delivery = report.delivery
  if (delivery) {
    const grant = delivery.authorization
    const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
    const attribution = grant?.attribution
    if (attribution !== undefined) {
      if (!attribution || typeof attribution !== 'object' || Array.isArray(attribution)
        || Object.keys(attribution).sort().join() !== 'licenceUrl,publisher,statement'
        || !text(attribution.publisher, 160) || !text(attribution.statement, 1000) || !text(attribution.licenceUrl, 500)) return null
      try {
        const licence = new URL(attribution.licenceUrl)
        if (licence.protocol !== 'https:' || licence.username || licence.password || licence.hash) return null
      } catch { return null }
    }
    if (Object.keys(delivery).sort().join() !== 'authorization,authorizationHash,contentType,fileName,httpStatus,mode,retrievedAt,url'
      || delivery.mode !== 'PUBLIC_URL' || readCustomerReportUrl(delivery.url).url !== delivery.url
      || source.sourceRef !== delivery.url || source.fileName !== delivery.fileName || !/\.(txt|docx|pdf|pptx)$/i.test(delivery.fileName || '')
      || /[\\/]/.test(delivery.fileName) || delivery.httpStatus !== 200 || !sourceEvidenceHash(delivery.authorizationHash)
      || !Number.isFinite(Date.parse(delivery.retrievedAt)) || typeof delivery.contentType !== 'string' || !delivery.contentType
      || grant?.owner !== 'PRODUCT_GOVERNANCE' || grant.url !== delivery.url || !grant.scope?.customerId || !grant.scope?.tenantId
      || !text(grant.reference, 500) || grant.decision !== 'ALLOWED' || grant.legalStatus !== 'CONFIRMED' || grant.retentionAllowed !== true
      || !(Date.parse(grant.recordedAt) <= Date.parse(delivery.retrievedAt) && Date.parse(grant.reviewBy) > Date.parse(delivery.retrievedAt))) return null
  }
  const expected = { contractVersion: report.contractVersion, classification: report.classification, rightsStatus: report.rightsStatus,
    sourceId: report.sourceId, suppliedBy: report.suppliedBy, suppliedAt: report.suppliedAt, originalByteHash: report.originalByteHash,
    runId: report.runId, attemptId: report.attemptId, declaration: normalized, ...(delivery ? { delivery } : {}) }
  return sameRecordedValue(report, expected) ? report : null
}

export const getRecordedCustomerOriginal = (source, scope) => {
  const report = getRecordedCustomerResearch(source, scope?.stateVersion), ref = source?.originalContentRef
  if (!report || !ref || !sameRecordedValue(ref, ref) || !scope?.customerId || !scope?.tenantId || !scope?.runtimeInstanceId) return null
  const binding = ref.binding, policy = ref.policy
  if (ref.contractVersion !== 'evidence-original-reference.v1' || ref.inputKind !== (report.delivery ? 'PUBLIC_URL' : 'UPLOADED_FILE') || ref.parent !== null
    || !/^original_[a-f0-9]{64}$/.test(ref.originalId || '') || ref.byteHash !== report.originalByteHash
    || !Number.isSafeInteger(ref.byteLength) || ref.byteLength < 1
    || ref.byteLength > (/\.pptx$/i.test(source.fileName || '') ? 40000000 : 2500000)
    || !/\.(txt|docx|pdf|pptx)$/i.test(source.fileName || '') || !Number.isFinite(Date.parse(ref.acquiredAt))
    || binding?.customerId !== scope.customerId || binding.tenantId !== scope.tenantId
    || ![binding.runtimeInstanceId, binding.runtimeInstanceKey].includes(scope.runtimeInstanceId)
    || binding.sourceId !== source.sourceId || binding.sourceContentHash !== report.originalByteHash
    || binding.sourceLocator !== (source.sourceRef ?? source.url ?? source.fileRef ?? source.fileName)
    || policy?.policyId !== 'FS-006' || policy.policyVersion !== '0.2' || policy.retentionDays !== 30
    || policy.effectiveEnvironment !== 'DEVELOPMENT_TEST' || policy.nativeResearch !== undefined || !sourceEvidenceHash(policy.policyHash)
    || policy.customerSuppliedResearch?.amendment !== 'SS-058-AM02'
    || !sameRecordedValue(policy.customerSuppliedResearch.provenance, report)
    || report.delivery && (report.delivery.authorization.scope.customerId !== scope.customerId
      || report.delivery.authorization.scope.tenantId !== scope.tenantId)) return null
  return ref
}

export const getRecordedNativeOriginal = (source, scope) => {
  const capture = getRecordedSourceCapture(source, scope?.stateVersion), ref = source?.originalContentRef
  const binding = ref?.binding, native = ref?.policy?.nativeResearch, grant = native?.grant
  if (!capture || !scope?.customerId || !scope?.tenantId || !scope?.runtimeInstanceId
    || ref?.contractVersion !== 'evidence-original-reference.v1' || ref.inputKind !== 'PUBLIC_URL'
    || !/^original_[a-f0-9]{64}$/.test(ref.originalId || '') || !sourceEvidenceHash(ref.byteHash)
    || !Number.isSafeInteger(ref.byteLength) || ref.byteLength < 1 || ref.byteLength > 320000
    || binding?.customerId !== scope.customerId || binding.tenantId !== scope.tenantId
    || ![binding.runtimeInstanceId, binding.runtimeInstanceKey].includes(scope.runtimeInstanceId)
    || binding.sourceId !== source.sourceId || binding.sourceContentHash !== capture.originalContentHash
    || binding.sourceLocator !== (source.sourceRef || source.url) || ref.policy.policyId !== 'FS-006'
    || ref.policy.policyVersion !== '0.2' || ref.policy.retentionDays !== 30
    || ref.policy.effectiveEnvironment !== 'DEVELOPMENT_TEST' || !sourceEvidenceHash(ref.policy.policyHash)
    || grant?.kind !== 'PUBLISHER_TERMS' || grant.decision !== 'ALLOWED' || grant.legalStatus !== 'CONFIRMED'
    || !grant.retentionAllowed || grant.url !== binding.sourceLocator
    || grant.scope?.customerId !== scope.customerId || grant.scope?.tenantId !== scope.tenantId
    || !grant.attribution?.statement || !grant.attribution?.publisher
    || !sameRecordedValue(native.capture, capture)) return null
  try {
    const url = new URL(grant.attribution.licenceUrl)
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return null
  } catch { return null }
  return ref
}

export const getRecordedOriginalRead = (response, source, scope) => {
  const ref = getRecordedCustomerOriginal(source, scope) || getRecordedNativeOriginal(source, scope), data = getHubPayload(response)
  if (!ref || data?.availability !== 'AVAILABLE_DEV_TEST' || data.observedStateVersion !== scope.stateVersion
    || !sameRecordedValue(data.originalContentRef, ref)
    || !/^[a-f0-9]{24}$/.test(data.auditId || '')) return null
  if (ref.policy.nativeResearch && (typeof data.capturedText !== 'string'
    || data.capturedText.length !== ref.policy.nativeResearch.capture.textLength || data.capturedText.length > 80000)) return null
  return data
}

export const getRecordedReportCitations = (response, source, scope) => {
  if (!getRecordedCustomerOriginal(source, scope) || !getRecordedOriginalRead(response, source, scope)) return null
  const value = getHubPayload(response)?.reportCitations
  if (!value || !sameRecordedValue(value, value)
    || Object.keys(value).sort().join() !== 'contractVersion,entries,limitReached,limitations,locationsInspected,method,originalByteHash,status'
    || value.contractVersion !== 'customer-report-citations.v1' || value.originalByteHash !== source.originalContentRef.byteHash
    || !['PARTIAL', 'UNAVAILABLE'].includes(value.status) || typeof value.limitReached !== 'boolean'
    || !Number.isInteger(value.locationsInspected) || value.locationsInspected < 0 || value.locationsInspected > 120
    || !Array.isArray(value.entries) || value.entries.length > 20 || !Array.isArray(value.limitations)
    || !value.limitations.length || value.limitations.length > 8
    || value.limitations.some(text => typeof text !== 'string' || !text || text.length > 500)) return null
  if (value.status === 'UNAVAILABLE') return value.method === 'UNAVAILABLE' && !value.entries.length && !value.locationsInspected ? value : null
  const expectedMethod = { txt: 'TXT_TEXT', docx: 'DOCX_MAIN_DOCUMENT', pptx: 'PPTX_SLIDES_AND_NOTES', pdf: 'PDF_TEXT_AND_LINKS' }[source.fileName.split('.').pop().toLowerCase()]
  if (value.method !== expectedMethod || !value.locationsInspected) return null
  for (const entry of value.entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).sort().join() !== 'location,origin,url' || !['TEXT_URL', 'HYPERLINK'].includes(entry.origin)
      || typeof entry.location !== 'string' || !entry.location || entry.location.length > 80 || typeof entry.url !== 'string' || entry.url.length > 500) return null
    try { const url = new URL(entry.url); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null } catch { return null }
  }
  return value
}

export const getRecordedEvidenceSupport = (item, source, stateVersion) => {
  const capture = getRecordedSourceCapture(source, stateVersion)
  const support = item?.evidenceSupport
  if (!capture || !currentSourceEvidence(item, stateVersion) || !item.evidenceObjectId
    || item.evidenceSupportAvailability !== 'RECORDED' || item.sourceId !== source.sourceId
    || support?.contractVersion !== 'evidence-support.v1' || support.sourceId !== source.sourceId
    || support.originalContentHash !== capture.originalContentHash || support.captureTextHash !== capture.captureTextHash
    || support.coordinateSystem !== 'UTF16_CODE_UNIT' || !sourceEvidenceHash(support.excerptHash)
    || !Number.isSafeInteger(support.start) || !Number.isSafeInteger(support.end)
    || support.start < 0 || support.end <= support.start || support.end > capture.textLength
    || typeof support.exactExcerpt !== 'string' || !support.exactExcerpt.trim()
    || support.exactExcerpt.length !== support.end - support.start
    || support.supportStatus !== 'EXACT_CAPTURE_SPAN_VERIFIED' || support.epistemicType !== 'SOURCE_ASSERTION'
    || support.statementOrigin !== 'DETERMINISTIC_EXTRACTOR_NORMALIZATION'
    || !Array.isArray(support.restrictions) || support.restrictions.length !== 2
    || support.restrictions[0] !== 'EXTRACTED_TEXT_COORDINATES_ONLY'
    || support.restrictions[1] !== 'SOURCE_ASSERTION_NOT_INDEPENDENTLY_VERIFIED') return null
  return support
}

export const recordedEvidenceLocation = (item, source, stateVersion) => {
  const support = getRecordedEvidenceSupport(item, source, stateVersion)
  return support ? `Extracted-text UTF-16 span [${support.start}, ${support.end})` : 'Location not supplied'
}

export const getHubEvidenceStatusCount = (response, error, unfilteredPage) => {
  const page = getHubEvidencePage(response)
  if (!error && typeof page?.total === 'number' && Number.isFinite(page.total)
    && page.total >= 0 && !page.totalCapped) return page.total
  const unfilteredCountIsVerified = typeof unfilteredPage?.total === 'number'
    && Number.isFinite(unfilteredPage.total) && unfilteredPage.total >= 0 && !unfilteredPage.totalCapped
  return unfilteredCountIsVerified
    && error?.data?.error?.code === 'RUNTIME_STATE_V2_EVIDENCE_MISSING' ? 0 : null
}

export const reconcileHubDiscovery = (discovery, evidencePage) => {
  if (!evidencePage) return discovery
  const total = typeof evidencePage.total === 'number' && Number.isFinite(evidencePage.total)
    && evidencePage.total >= 0 && !evidencePage.totalCapped ? evidencePage.total : null
  if (total === null) return discovery
  const summary = discovery?.evidenceObjectSummary || {}
  const rendererTotal = getHubCount(summary, 'evidenceObjectCount')
  const conflicts = rendererTotal !== null && rendererTotal !== total
  const sourceSummary = discovery?.sourceRegistrySummary || {}
  const rendererSourceCount = getHubCount(sourceSummary, 'count')
  const sourceConflict = rendererSourceCount === 0 && total > 0
  return {
    ...discovery,
    sourceRegistrySummary: { ...sourceSummary, count: sourceConflict ? null : rendererSourceCount },
    evidenceObjectSummary: {
      ...summary,
      evidenceObjectCount: total,
      acceptedEvidenceCount: conflicts ? null : getHubCount(summary, 'acceptedEvidenceCount'),
      pendingReviewCount: conflicts ? null : getHubCount(summary, 'pendingReviewCount'),
      rejectedEvidenceCount: conflicts ? null : getHubCount(summary, 'rejectedEvidenceCount'),
    },
  }
}

export const validateHubContext = ({ renderer, workspaceId, revisionId, customerId, tenantId }) => {
  if (![workspaceId, revisionId, customerId, tenantId].every((value) => id(value))) {
    return { valid: false, reason: 'The selected workspace, revision or customer context is missing.' }
  }
  if (!renderer || !renderer.runtimeInstance || !renderer.revision) {
    return { valid: false, reason: 'The selected revision could not be verified.' }
  }
  const runtime = renderer.runtimeInstance
  if (![runtime.id, runtime.runtimeInstanceId, runtime.runtimeInstanceKey, runtime.key]
    .some((value) => id(value) === id(revisionId))) {
    return { valid: false, reason: 'The returned revision does not match the selected revision.' }
  }
  if (id(runtime.customerId) !== id(customerId) || id(runtime.tenantId) !== id(tenantId)) {
    return { valid: false, reason: 'The returned revision is outside the selected customer or tenant.' }
  }
  if (![renderer.revision.rootRuntimeInstanceKey, renderer.revision.rootRuntimeId]
    .some((value) => id(value) === id(workspaceId))) {
    return { valid: false, reason: 'The selected revision does not belong to this workspace.' }
  }
  const matches = (Array.isArray(renderer.revision.lineage) ? renderer.revision.lineage : [])
    .filter((row) => id(row?.relationship).toUpperCase() === 'CURRENT'
      && [row?.runtimeInstanceId, row?.runtimeInstanceKey].some((value) => id(value) === id(revisionId)))
  if (matches.length !== 1) {
    return { valid: false, reason: 'The selected revision lineage could not be verified.' }
  }
  return { valid: true, reason: '' }
}

export const getHubViewFromSearch = (search) => {
  const selected = new URLSearchParams(search).get('view')
  return HUB_VIEWS.findIndex((view) => view.toLowerCase().replace(/[^a-z]+/g, '-')
    .replace(/^-|-$/g, '') === selected)
}

export const getHubViewKey = (view) => view.toLowerCase().replace(/[^a-z]+/g, '-')
  .replace(/^-|-$/g, '')

export const getHubCount = (source, key) => {
  const value = source?.[key]
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export const displayHubCount = (count) => count === null ? 'Unavailable' : count.toLocaleString()

export const displayHubToken = (value) => {
  const text = id(value)
  return text ? text.replace(/[_-]+/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Unavailable'
}

export const getHubReturnHref = (revisionId) =>
  id(revisionId) ? getRuntimeWorkspaceRoute(id(revisionId)) : '/app/dashboard'

export const getHubDestinationHref = (destination, workspaceId, revisionId) =>
  getExecutionWorkspaceDestinationHref(destination, workspaceId, revisionId)

export const getHubContextSearch = (workspaceId, revisionId, view) => {
  const params = new URLSearchParams()
  params.set('runtimeInstanceId', id(workspaceId))
  params.set('revisionId', id(revisionId))
  if (view) params.set('view', getHubViewKey(view))
  return params.toString()
}
