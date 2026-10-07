import { normalizeError, stripRequestReference } from './errors.js'
const INTELLIGENCE_HUB_LABEL = 'Intelligence Hub'

const DISCOVERY_DOCUMENT_ACCEPT = [
  '.csv',
  '.docx',
  '.md',
  '.pdf',
  '.pptx',
  '.txt',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'text/markdown',
  'text/plain',
].join(',')
const DISCOVERY_DOCUMENT_MAX_COUNT = 5
const DISCOVERY_DOCUMENT_MAX_BYTES = 2500000
const DISCOVERY_PPTX_DOCUMENT_MAX_BYTES = 40000000
const DISCOVERY_WEBSITE_SOURCE_MAX_COUNT = 10

const buildEmptyDiscoveryDraftInputs = () => ({
  companyWebsite: '',
  websiteSources: [''],
  companyName: '',
  marketRegion: '',
  targetOffer: '',
  notes: '',
})

const getFileExtension = (fileName = '') => {
  const normalized = String(fileName || '').trim().toLowerCase()
  const dotIndex = normalized.lastIndexOf('.')
  return dotIndex >= 0 ? normalized.slice(dotIndex) : ''
}

const isSupportedDiscoveryDocument = (file) => {
  const mimeType = String(file?.type || '').trim().toLowerCase()
  const extension = getFileExtension(file?.name)
  return [
    '.csv',
    '.docx',
    '.md',
    '.pdf',
    '.pptx',
    '.txt',
  ].includes(extension) || [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'text/markdown',
    'text/plain',
  ].includes(mimeType)
}

const isPptxDiscoveryDocument = (file) => {
  const mimeType = String(file?.type || '').trim().toLowerCase()
  return getFileExtension(file?.name) === '.pptx'
    || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}

const getDiscoveryDocumentMaxBytes = (file) =>
  isPptxDiscoveryDocument(file) ? DISCOVERY_PPTX_DOCUMENT_MAX_BYTES : DISCOVERY_DOCUMENT_MAX_BYTES

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
  reader.readAsDataURL(file)
})

const buildDiscoveryDocumentSource = async (file) => {
  if (!isSupportedDiscoveryDocument(file)) {
    throw new Error(`${file.name} is not a supported ${INTELLIGENCE_HUB_LABEL} document type.`)
  }
  if (file.size > getDiscoveryDocumentMaxBytes(file)) {
    throw new Error(`${file.name} exceeds the ${INTELLIGENCE_HUB_LABEL} document size limit.`)
  }

  return {
    fileName: file.name,
    mimeType: file.type || '',
    assetType: 'CUSTOMER_DOCUMENT',
    sizeBytes: file.size,
    contentBase64: await readFileAsDataUrl(file),
  }
}


const formatDocumentSize = (sizeBytes = 0) =>
  `${Math.max(1, Math.round((Number(sizeBytes) || 0) / 1024))} KB`

const DOCUMENT_EXTRACTION_STORAGE_NOTE = 'Original documents are not stored. Only extracted evidence and source details are retained.'
const DOCUMENT_EXTRACTION_HELPER_TEXT = 'PDF, PPTX, DOCX, TXT, MD, or CSV. Files are used only to extract evidence; originals are not stored.'
const PDF_UNREADABLE_TEXT_ERROR_PREFIX = 'PDF document did not contain readable extractable text'
const PDF_UNREADABLE_TEXT_HELPER = 'This PDF has no readable text layer. Use an OCR/searchable PDF, PPTX, DOCX, TXT, MD, or CSV.'
const PPTX_UNREADABLE_TEXT_ERROR_PREFIX = 'PowerPoint document did not contain readable extractable slide text or speaker notes'
const PPTX_UNREADABLE_TEXT_HELPER = 'This PowerPoint file has no extractable slide text or speaker notes. Use a PPTX with selectable text.'
const PPTX_MALFORMED_ERROR_PREFIX = 'PowerPoint file is not a valid PPTX package'
const PPTX_MALFORMED_HELPER = 'We could not extract this presentation. Confirm that it is a valid PPTX file.'
const DOCUMENT_INGESTION_FAILED_REASON = 'DOCUMENT_INGESTION_FAILED'
const DOCUMENT_INGESTION_FAILED_MESSAGE = 'Document ingestion could not produce governed evidence.'

const getNestedDetailMessage = (details) => {
  if (!details || typeof details !== 'object') return ''

  const stack = [details]
  while (stack.length > 0) {
    const current = stack.shift()
    if (!current || typeof current !== 'object') continue

    if (typeof current.message === 'string' && current.message.trim()) {
      return current.message.trim()
    }

    stack.push(...Object.values(current).filter((value) => value && typeof value === 'object'))
  }

  return ''
}

const formatSectionSupportingFileError = (error) => {
  const normalizedError = normalizeError(error)
  const nestedMessage =
    getNestedDetailMessage(normalizedError.details?.ingestionError)
    || getNestedDetailMessage(normalizedError.details)
  const baseMessage = stripRequestReference(nestedMessage || normalizedError.message)
  const message = baseMessage.startsWith(PDF_UNREADABLE_TEXT_ERROR_PREFIX)
    ? PDF_UNREADABLE_TEXT_HELPER
    : baseMessage.startsWith(PPTX_UNREADABLE_TEXT_ERROR_PREFIX)
      ? PPTX_UNREADABLE_TEXT_HELPER
      : baseMessage.startsWith(PPTX_MALFORMED_ERROR_PREFIX)
        ? PPTX_MALFORMED_HELPER
      : baseMessage
  const requestReference = normalizedError.requestId
    ? ` Reference: ${normalizedError.requestId}`
    : ''

  return `${message}${requestReference}`
}

const formatDocumentIngestionMessage = (message) => {
  if (message.startsWith(PDF_UNREADABLE_TEXT_ERROR_PREFIX)) {
    return PDF_UNREADABLE_TEXT_HELPER
  }
  if (message.startsWith(PPTX_UNREADABLE_TEXT_ERROR_PREFIX)) {
    return PPTX_UNREADABLE_TEXT_HELPER
  }
  if (message.startsWith(PPTX_MALFORMED_ERROR_PREFIX)) {
    return PPTX_MALFORMED_HELPER
  }
  return message
}

const formatAcquisitionErrorOutcomes = (outcomes) => {
  if (outcomes?.contractVersion !== 'acquisition-error-outcomes.v1' || outcomes.canonicalSaved !== false) return ''
  const counts = (items, kind, limit) => {
    if (items === undefined || Array.isArray(items) && items.length === 0) return ''
    if (!Array.isArray(items)) return `${kind} extraction outcomes unavailable.`
    const ids = items.filter(item => item?.sourceId !== undefined).map(item => item.sourceId)
    const valid = items.length <= limit && new Set(ids).size === ids.length
      && items.every((item, index) => item?.inputIndex === index && ['SUCCEEDED', 'FAILED'].includes(item.status)
        && Number.isSafeInteger(item.evidenceObjectCount) && item.evidenceObjectCount >= 0
        && (item.status !== 'FAILED' || item.evidenceObjectCount === 0
          && item.reason === (kind === 'Website' ? 'WEBSITE_ACQUISITION_FAILED' : 'DOCUMENT_EXTRACTION_FAILED'))
        && (kind !== 'Website' && item.status === 'FAILED' && item.sourceId === undefined
          || typeof item.sourceId === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(item.sourceId)))
    if (!valid) return `${kind} extraction outcomes unavailable.`
    const succeeded = items.filter(item => item.status === 'SUCCEEDED').length
    return `${kind} extraction: ${succeeded} succeeded · ${items.length - succeeded} failed.`
  }
  const parts = [counts(outcomes.websiteItems, 'Website', DISCOVERY_WEBSITE_SOURCE_MAX_COUNT),
    counts(outcomes.documentItems, 'Document', DISCOVERY_DOCUMENT_MAX_COUNT)].filter(Boolean)
  return parts.length ? ` ${parts.join(' ')} These extraction results were not saved to this revision.` : ''
}

const formatIntelligenceHubEvidenceError = (error) => {
  const normalizedError = normalizeError(error)
  const acquisitionError = typeof normalizedError.details?.acquisitionError === 'string'
    ? normalizedError.details.acquisitionError.trim()
    : ''
  const isDocumentIngestionError =
    normalizedError.details?.reason === DOCUMENT_INGESTION_FAILED_REASON
    || stripRequestReference(normalizedError.message) === DOCUMENT_INGESTION_FAILED_MESSAGE
  const outcomeMessage = formatAcquisitionErrorOutcomes(normalizedError.details?.acquisitionOutcomes)

  if (!isDocumentIngestionError) {
    return `${normalizedError.message}${outcomeMessage}`
  }

  const baseMessage = stripRequestReference(acquisitionError || normalizedError.message)
  const requestReference = normalizedError.requestId
    ? ` Reference: ${normalizedError.requestId}`
    : ''

  return `${formatDocumentIngestionMessage(baseMessage)}${requestReference}${outcomeMessage}`
}


const DISCOVERY_REQUIRED_CONTEXT_FIELDS = Object.freeze([
  {
    key: 'websiteSources',
    label: 'Website URL',
    isComplete: (draftInputs = {}) => Array.isArray(draftInputs.websiteSources)
      && draftInputs.websiteSources.some((source) => String(source || '').trim()),
  },
  {
    key: 'companyName',
    label: 'Company name',
    isComplete: (draftInputs = {}) => Boolean(String(draftInputs.companyName || '').trim()),
  },
  {
    key: 'marketRegion',
    label: 'Market / region',
    isComplete: (draftInputs = {}) => Boolean(String(draftInputs.marketRegion || '').trim()),
  },
  {
    key: 'targetOffer',
    label: 'Target product or offer',
    isComplete: (draftInputs = {}) => Boolean(String(draftInputs.targetOffer || '').trim()),
  },
])

const formatDiscoveryRequiredContextList = (values = []) => {
  const labels = values.map((value) => String(value || '').trim()).filter(Boolean)
  if (labels.length <= 1) return labels[0] || ''
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

const buildDiscoveryContextReadiness = (draftInputs = {}) => {
  const rows = DISCOVERY_REQUIRED_CONTEXT_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    complete: field.isComplete(draftInputs),
  }))
  const missingRows = rows.filter((row) => !row.complete)
  const missingLabels = missingRows.map((row) => row.label)

  return {
    complete: missingRows.length === 0,
    missingLabels,
    reason: missingLabels.length > 0
      ? `Add ${formatDiscoveryRequiredContextList(missingLabels)} before building evidence.`
      : '',
    rows,
  }
}

const normalizeWebsiteSourceDrafts = (inputValues = {}) => {
  const explicitSources = Array.isArray(inputValues.websiteSources)
    ? inputValues.websiteSources
    : []
  const candidates = [
    ...explicitSources,
    inputValues.companyWebsite,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  const uniqueSources = Array.from(new Set(candidates))
  return uniqueSources.length > 0 ? uniqueSources : ['']
}

const buildDiscoveryInputsPayload = (draftInputs = {}) => {
  const websiteSources = Array.isArray(draftInputs.websiteSources)
    ? draftInputs.websiteSources.map((value) => String(value || '').trim()).filter(Boolean)
    : []
  const payload = {
    companyWebsite: websiteSources[0] || String(draftInputs.companyWebsite || '').trim(),
    companyName: String(draftInputs.companyName || '').trim(),
    marketRegion: String(draftInputs.marketRegion || '').trim(),
    targetOffer: String(draftInputs.targetOffer || '').trim(),
    notes: String(draftInputs.notes || '').trim(),
  }

  if (websiteSources.length > 0) {
    payload.websiteSources = websiteSources
  }

  return payload
}


export { DISCOVERY_DOCUMENT_ACCEPT, DISCOVERY_DOCUMENT_MAX_COUNT, DISCOVERY_WEBSITE_SOURCE_MAX_COUNT, buildEmptyDiscoveryDraftInputs, isSupportedDiscoveryDocument, getDiscoveryDocumentMaxBytes, readFileAsDataUrl, buildDiscoveryDocumentSource, formatDocumentSize, DOCUMENT_EXTRACTION_STORAGE_NOTE, DOCUMENT_EXTRACTION_HELPER_TEXT, formatSectionSupportingFileError, formatIntelligenceHubEvidenceError, buildDiscoveryContextReadiness, normalizeWebsiteSourceDrafts, buildDiscoveryInputsPayload }

export function selectAcquisitionAction(renderer, discovery) {
  const actions = Array.isArray(renderer?.actions) ? renderer.actions : []
  const key = discovery?.evidenceReady ? 'REFRESH_EVIDENCE_PACK' : 'BUILD_EVIDENCE_PACK'
  const actionKey = action => String(action.governedAction || action.actionKey || '').trim().toUpperCase()
  return actions.find(action => actionKey(action) === key) || actions.find(action => actionKey(action) === 'SAVE_DISCOVERY_INPUTS') || null
}
