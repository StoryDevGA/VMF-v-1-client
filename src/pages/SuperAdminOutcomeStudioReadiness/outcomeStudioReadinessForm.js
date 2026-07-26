export const DEVELOPMENT_TEST_POLICY_VERSION = 'OES_004_DEVELOPMENT_TEST_READINESS_V1'
export const LEGACY_POLICY_VERSION = 'LEGACY_SLICE_5A_V1'
export const MAX_REFERENCE_BYTES = 10_000_000

export const REFERENCE_FAMILIES = Object.freeze([
  { key: 'PROFESSIONAL_DOCUMENT', label: 'Professional document' },
  { key: 'PRESENTATION', label: 'Presentation' },
  { key: 'INFOGRAPHIC', label: 'Infographic' },
])

export const DECISION_OPTIONS = Object.freeze([
  { value: 'OPEN', label: 'Open' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
])

const STABLE_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,138}[a-z0-9])?$/
const VERSION_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,78}[A-Za-z0-9])?$/
const DECISION_STATUSES = new Set(DECISION_OPTIONS.map(({ value }) => value))
const FAMILY_KEYS = new Set(REFERENCE_FAMILIES.map(({ key }) => key))

const text = (value) => String(value ?? '').trim()
const unwrap = (response) => response?.data ?? response ?? {}

export const createBlankProductDecision = () => ({
  status: 'OPEN',
  productApproverName: '',
  productApproverRole: '',
  rationale: '',
})

export const createBlankReadinessForm = () => ({
  rubric: {
    rubricKey: '',
    rubricVersion: '',
    threshold: 85,
    decision: createBlankProductDecision(),
  },
  providerPolicy: {
    providerKey: '',
    model: '',
    decision: createBlankProductDecision(),
  },
  testingApproval: {
    decision: createBlankProductDecision(),
  },
})

export const isDevelopmentTestProjection = (response) => (
  unwrap(response).policyVersion === DEVELOPMENT_TEST_POLICY_VERSION
)

const hydrateDecision = (source = {}) => ({
  status: DECISION_STATUSES.has(source.status) ? source.status : 'OPEN',
  productApproverName: text(source.productApproverName),
  productApproverRole: text(source.productApproverRole),
  rationale: text(source.rationale),
})

export function toReadinessForm(response) {
  const projection = unwrap(response)
  if (projection.policyVersion !== DEVELOPMENT_TEST_POLICY_VERSION) return createBlankReadinessForm()
  return {
    rubric: {
      rubricKey: text(projection.rubric?.rubricKey),
      rubricVersion: text(projection.rubric?.rubricVersion),
      threshold: projection.rubric?.threshold ?? 85,
      decision: hydrateDecision(projection.rubric?.decision),
    },
    providerPolicy: {
      providerKey: text(projection.providerPolicy?.providerKey),
      model: text(projection.providerPolicy?.model),
      decision: hydrateDecision(projection.providerPolicy?.decision),
    },
    testingApproval: {
      decision: hydrateDecision(projection.testingApproval?.decision),
    },
  }
}

const buildDecision = (decision) => ({
  status: decision.status,
  productApproverName: text(decision.productApproverName),
  productApproverRole: text(decision.productApproverRole),
  rationale: text(decision.rationale),
})

export function buildReadinessPayload(form, expectedRevision) {
  return {
    expectedRevision,
    rubric: {
      rubricKey: text(form.rubric.rubricKey).toLowerCase(),
      rubricVersion: text(form.rubric.rubricVersion),
      threshold: Number(form.rubric.threshold),
      decision: buildDecision(form.rubric.decision),
    },
    providerPolicy: {
      providerKey: text(form.providerPolicy.providerKey).toLowerCase(),
      model: text(form.providerPolicy.model),
      decision: buildDecision(form.providerPolicy.decision),
    },
    testingApproval: {
      decision: buildDecision(form.testingApproval.decision),
    },
  }
}

const validateDecision = (decision, path, errors) => {
  if (!DECISION_STATUSES.has(decision.status)) {
    errors[`${path}.status`] = 'Select a valid decision'
    return
  }
  const fields = [
    ['productApproverName', 160, 'Product approver name'],
    ['productApproverRole', 160, 'Product approver role'],
    ['rationale', 1000, 'Rationale'],
  ]
  for (const [field, max, label] of fields) {
    const value = text(decision[field])
    if (decision.status !== 'OPEN' && !value) errors[`${path}.${field}`] = `${label} is required`
    if (value.length > max) errors[`${path}.${field}`] = `${label} cannot exceed ${max} characters`
    if (decision.status === 'OPEN' && value) errors[`${path}.${field}`] = 'Open decisions cannot include Product approval details'
  }
}

export function validateReadinessForm(form) {
  const errors = {}
  const rubricKey = text(form.rubric.rubricKey)
  const rubricVersion = text(form.rubric.rubricVersion)
  const providerKey = text(form.providerPolicy.providerKey)
  const model = text(form.providerPolicy.model)
  if (!STABLE_KEY_PATTERN.test(rubricKey)) errors['rubric.rubricKey'] = 'Use a lowercase stable key of 1 to 140 characters'
  if (!VERSION_PATTERN.test(rubricVersion)) errors['rubric.rubricVersion'] = 'Use a version of 1 to 80 letters, numbers, dots, underscores, or hyphens'
  if (!Number.isFinite(Number(form.rubric.threshold)) || Number(form.rubric.threshold) < 0 || Number(form.rubric.threshold) > 100) errors['rubric.threshold'] = 'Enter a threshold from 0 to 100'
  if (!STABLE_KEY_PATTERN.test(providerKey)) errors['providerPolicy.providerKey'] = 'Use a lowercase stable key of 1 to 140 characters'
  if (!model || model.length > 160) errors['providerPolicy.model'] = 'Enter a model name of 1 to 160 characters'
  validateDecision(form.rubric.decision, 'rubric.decision', errors)
  validateDecision(form.providerPolicy.decision, 'providerPolicy.decision', errors)
  validateDecision(form.testingApproval.decision, 'testingApproval.decision', errors)
  return errors
}

export function updateDecisionStatus(decision, status) {
  return status === 'OPEN'
    ? createBlankProductDecision()
    : { ...decision, status }
}

const getErrorDetails = (error) => error?.data?.error?.details ?? error?.data?.details ?? error?.details ?? {}
const getErrorMessage = (error) => error?.data?.error?.message ?? error?.data?.message ?? error?.message ?? 'Check this field'

export function mapReadinessApiFieldErrors(error) {
  const path = text(getErrorDetails(error).path).replace(/^body\./, '')
  if (!/^(rubric|providerPolicy|testingApproval)(\.|$)/.test(path)) return {}
  return { [path]: getErrorMessage(error) }
}

export function mapReferenceApiFieldErrors(error) {
  const field = text(getErrorDetails(error).field).replace(/^body\./, '')
  if (['contentBase64', 'mimeType', 'originalFileName'].includes(field)) return { file: getErrorMessage(error) }
  if (['family', 'title', 'purpose', 'approverName', 'approverRole', 'rationale', 'replacementReferenceKey', 'reason'].includes(field)) return { [field]: getErrorMessage(error) }
  return {}
}

export const createBlankReferenceUploadForm = () => ({
  family: 'PROFESSIONAL_DOCUMENT',
  title: '',
  purpose: '',
  file: null,
})

export const createBlankReferenceApprovalForm = () => ({
  approverName: '',
  approverRole: '',
  rationale: '',
})

export const createBlankReferenceSupersessionForm = () => ({
  replacementReferenceKey: '',
  reason: '',
})

export function validateReferenceUploadForm(form) {
  const errors = {}
  if (!FAMILY_KEYS.has(form.family)) errors.family = 'Select a supported reference family'
  if (!text(form.title) || text(form.title).length > 200) errors.title = 'Enter a title of 1 to 200 characters'
  if (text(form.purpose).length > 1000) errors.purpose = 'Purpose cannot exceed 1000 characters'
  const file = form.file
  if (!file) errors.file = 'Select a PDF file'
  else if (!/\.pdf$/i.test(file.name || '') || String(file.name).includes('/') || String(file.name).includes('\\')) errors.file = 'Select a PDF filename without a path'
  else if (file.type !== 'application/pdf') errors.file = 'The file type must be application/pdf'
  else if (!Number.isFinite(file.size) || file.size < 1 || file.size > MAX_REFERENCE_BYTES) errors.file = 'Select a PDF up to 10 MB'
  return errors
}

const bytesToBase64 = (bytes) => {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return globalThis.btoa(binary)
}

export async function readReferenceFileBase64(file) {
  if (typeof file?.arrayBuffer === 'function') return bytesToBase64(new Uint8Array(await file.arrayBuffer()))
  const FileReaderConstructor = globalThis.FileReader
  if (typeof FileReaderConstructor !== 'function') throw new Error('File binary reader is unavailable.')
  return new Promise((resolve, reject) => {
    const reader = new FileReaderConstructor()
    reader.onload = () => {
      const value = String(reader.result ?? '')
      resolve(value.includes(',') ? value.slice(value.indexOf(',') + 1) : value)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the PDF file.'))
    reader.readAsDataURL(file)
  })
}

export function buildReferenceUploadPayload(form, contentBase64) {
  return {
    family: form.family,
    title: text(form.title),
    purpose: text(form.purpose),
    originalFileName: form.file.name,
    mimeType: form.file.type,
    contentBase64,
  }
}

export function validateReferenceApprovalForm(form) {
  const errors = {}
  for (const [field, max, label] of [['approverName', 160, 'Product approver name'], ['approverRole', 160, 'Product approver role'], ['rationale', 1000, 'Rationale']]) {
    if (!text(form[field]) || text(form[field]).length > max) errors[field] = `Enter ${label.toLowerCase()} of 1 to ${max} characters`
  }
  return errors
}

export function validateReferenceSupersessionForm(form, source, references = []) {
  const errors = {}
  const replacement = references.find((item) => item.referenceKey === form.replacementReferenceKey)
  if (!replacement || replacement.referenceKey === source?.referenceKey || replacement.family !== source?.family || replacement.status !== 'APPROVED') errors.replacementReferenceKey = 'Select a different approved reference from the same family'
  if (!text(form.reason) || text(form.reason).length > 1000) errors.reason = 'Enter a reason of 1 to 1000 characters'
  return errors
}

export const formatReferenceFamily = (family) => REFERENCE_FAMILIES.find(({ key }) => key === family)?.label ?? family
