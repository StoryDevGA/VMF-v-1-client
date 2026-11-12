import { getExecutionWorkspaceDestinationHref, getRuntimeWorkspaceRoute } from '../../utils/runtimeWorkspace.js'

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
    || !Number.isSafeInteger(receipt.inputIndex) || receipt.inputIndex < 0 || receipt.inputIndex > 4) return null
  if (receipt.operation === 'CONTROLLED_HTML_REPLAY_CAPTURE') {
    const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)
    if (!uuid(receipt.runId) || !uuid(receipt.attemptId) || receipt.inputIndex !== 0
      || capture.adapter !== 'controlled-html-replay-v1' || capture.extractionMethod !== 'DECODED_HTML_STRIPPED_TEXT') return null
  } else if (receipt.runId !== null || receipt.attemptId !== null) return null
  return capture
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
