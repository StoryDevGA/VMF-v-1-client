import { DEFAULT_TABLE_PAGE_SIZE } from '../../components/Table/tableConstants.js'

export const RUNTIME_PATH_REGISTRY_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DEPRECATED: 'DEPRECATED',
})

export const RUNTIME_PATH_REGISTRY_OPERATIONS = Object.freeze({
  READ: 'READ',
  WRITE: 'WRITE',
  BIND: 'BIND',
})

export const RUNTIME_PATH_REGISTRY_SCOPES = Object.freeze({
  FRAMEWORK_STATE: 'FRAMEWORK_STATE',
  RUNTIME_INPUT: 'RUNTIME_INPUT',
  RUNTIME_OUTPUT: 'RUNTIME_OUTPUT',
  SNAPSHOT: 'SNAPSHOT',
  VALIDATION_RESULT: 'VALIDATION_RESULT',
  SYSTEM_CONTEXT: 'SYSTEM_CONTEXT',
})

export const RUNTIME_PATH_REGISTRY_DATA_TYPES = Object.freeze({
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  OBJECT: 'OBJECT',
  ARRAY: 'ARRAY',
  ENUM: 'ENUM',
  MIXED: 'MIXED',
})

export const RUNTIME_PATH_REGISTRY_CATEGORIES = Object.freeze({
  STATE: 'STATE',
  SECTION: 'SECTION',
  METADATA: 'METADATA',
  VALIDATION: 'VALIDATION',
  LIFECYCLE: 'LIFECYCLE',
  POLICY: 'POLICY',
  WORKFLOW: 'WORKFLOW',
  APPROVAL: 'APPROVAL',
  ESCALATION: 'ESCALATION',
  AUDIT: 'AUDIT',
  OUTPUT: 'OUTPUT',
  ARTIFACT: 'ARTIFACT',
  INPUT: 'INPUT',
  REFERENCE: 'REFERENCE',
  NOTIFICATION: 'NOTIFICATION',
  COMMENT: 'COMMENT',
  TASK: 'TASK',
  STYLE: 'STYLE',
  GENERATION: 'GENERATION',
  METRIC: 'METRIC',
  SYSTEM: 'SYSTEM',
})

export const RUNTIME_PATH_REGISTRY_SOURCE_TYPES = Object.freeze({
  RUNTIME_STATE: 'RUNTIME_STATE',
  SNAPSHOT: 'SNAPSHOT',
  REQUEST_PAYLOAD: 'REQUEST_PAYLOAD',
  DERIVED: 'DERIVED',
  SYSTEM_GENERATED: 'SYSTEM_GENERATED',
})

export const RUNTIME_PATH_REGISTRY_UI_CONTROLS = Object.freeze({
  TEXT: 'TEXT',
  TEXTAREA: 'TEXTAREA',
  NUMBER: 'NUMBER',
  CHECKBOX: 'CHECKBOX',
  SELECT: 'SELECT',
  JSON: 'JSON',
})

export const RUNTIME_PATH_REGISTRY_PAGE_SIZE = DEFAULT_TABLE_PAGE_SIZE

export const LOCKED_RUNTIME_CONTROL_EDIT_MESSAGE =
  'Locked Runtime Control records cannot be edited directly. Clone the record to make behavior changes.'

export const RUNTIME_PATH_REGISTRY_FORM_ERROR_FIELDS = Object.freeze([
  'pathKey',
  'label',
  'description',
  'status',
  'frameworkKeys',
  'scope',
  'allowedOperations',
  'dataType',
  'category',
  'sourceType',
  'displayOrder',
  'allowedValues',
  'allowedValueLabels',
  'uiControl',
  'defaultValue',
  'exampleValue',
  'minValue',
  'maxValue',
  'minLength',
  'maxLength',
  'regexPattern',
])

export const RUNTIME_PATH_REGISTRY_PATH_KEY_PATTERN = /^\S+$/

const normalizeStableKeySegment = (value) =>
  String(value || '')
    .trim()
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

const buildStableKeyHash = (value) => {
  const input = String(value || '')
  let hash = 5381

  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash * 33) ^ input.charCodeAt(index)) >>> 0
  }

  return hash.toString(36)
}

export const buildRuntimePathRegistryStableId = (pathKey) =>
  `path-${normalizeStableKeySegment(pathKey).slice(0, 160)}-${buildStableKeyHash(pathKey)}`

export const RUNTIME_PATH_REGISTRY_HELP_TEXT =
  'Runtime Paths define the governed state addresses that skills and agents can read, write, or explicitly deny.'

export const RUNTIME_PATH_REGISTRY_STATUS_OPTIONS = Object.freeze([
  { label: 'All', value: '' },
  ...Object.values(RUNTIME_PATH_REGISTRY_STATUSES).map((value) => ({ label: value, value })),
])

export const RUNTIME_PATH_REGISTRY_OPERATION_OPTIONS = Object.freeze([
  { label: 'All', value: '' },
  ...Object.values(RUNTIME_PATH_REGISTRY_OPERATIONS).map((value) => ({ label: value, value })),
])

export const RUNTIME_PATH_REGISTRY_FORM_OPERATION_OPTIONS = Object.freeze(
  Object.values(RUNTIME_PATH_REGISTRY_OPERATIONS).map((value) => ({ label: value, value })),
)

export const RUNTIME_PATH_REGISTRY_SCOPE_OPTIONS = Object.freeze(
  Object.values(RUNTIME_PATH_REGISTRY_SCOPES).map((value) => ({ label: value, value })),
)

export const RUNTIME_PATH_REGISTRY_DATA_TYPE_OPTIONS = Object.freeze(
  Object.values(RUNTIME_PATH_REGISTRY_DATA_TYPES).map((value) => ({ label: value, value })),
)

export const RUNTIME_PATH_REGISTRY_CATEGORY_OPTIONS = Object.freeze(
  Object.values(RUNTIME_PATH_REGISTRY_CATEGORIES).map((value) => ({ label: value, value })),
)

export const RUNTIME_PATH_REGISTRY_SOURCE_TYPE_OPTIONS = Object.freeze(
  Object.values(RUNTIME_PATH_REGISTRY_SOURCE_TYPES).map((value) => ({ label: value, value })),
)

export const RUNTIME_PATH_REGISTRY_UI_CONTROL_OPTIONS = Object.freeze([
  { label: 'None', value: '' },
  ...Object.values(RUNTIME_PATH_REGISTRY_UI_CONTROLS).map((value) => ({ label: value, value })),
])

export const RUNTIME_PATH_REGISTRY_PROTECTED_OPTIONS = Object.freeze([
  { label: 'All', value: '' },
  { label: 'Protected only', value: 'true' },
  { label: 'Standard only', value: 'false' },
])

export const formatRuntimePathRegistryStatus = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()

export const getRuntimePathRegistryStatusVariant = (value) => {
  const normalized = formatRuntimePathRegistryStatus(value)

  if (normalized === RUNTIME_PATH_REGISTRY_STATUSES.DRAFT) return 'warning'
  if (normalized === RUNTIME_PATH_REGISTRY_STATUSES.ACTIVE) return 'success'
  if (normalized === RUNTIME_PATH_REGISTRY_STATUSES.DEPRECATED) return 'warning'
  return 'neutral'
}

export const formatRuntimeControlVersionStatus = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/_/g, ' ')

export const getRuntimeControlVersionStatusVariant = (value) => {
  const normalized = formatRuntimeControlVersionStatus(value).replace(/\s+/g, '_')

  if (normalized === 'ACTIVE') return 'success'
  if (normalized === 'DRAFT') return 'warning'
  if (normalized === 'DEPRECATED') return 'warning'
  if (normalized === 'ARCHIVED') return 'neutral'
  return 'neutral'
}

export const normalizeRuntimePathRegistryList = (values, { upper = false } = {}) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value ?? '').trim())
    .map((value) => (upper ? value.toUpperCase() : value))
    .filter(Boolean))]

export const parseRuntimePathRegistryListText = (value, { upper = false } = {}) =>
  normalizeRuntimePathRegistryList(
    String(value ?? '')
      .split(/[\n,]+/)
      .map((item) => item.trim()),
    { upper },
  )

export const parseOptionalRuntimePathRegistryNumber = (value) => {
  const text = String(value ?? '').trim()
  if (!text) return undefined
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export const validateRuntimePathRegistryForm = (form = {}, { isEditMode = false } = {}) => {
  const errors = {}
  const pathKey = String(form.pathKey ?? '').trim()

  if (!isEditMode) {
    if (!pathKey) errors.pathKey = 'Path key is required.'
    else if (!RUNTIME_PATH_REGISTRY_PATH_KEY_PATTERN.test(pathKey)) errors.pathKey = 'Path key cannot contain whitespace.'
  }

  if (!String(form.label ?? '').trim()) errors.label = 'Label is required.'
  if (!String(form.description ?? '').trim()) errors.description = 'Description is required.'
  if (normalizeRuntimePathRegistryList(form.frameworkKeys, { upper: true }).length === 0) {
    errors.frameworkKeys = 'Select at least one framework.'
  }
  if (normalizeRuntimePathRegistryList(form.allowedOperations, { upper: true }).length === 0) {
    errors.allowedOperations = 'Select at least one operation.'
  }

  const numericFields = ['displayOrder', 'minValue', 'maxValue', 'minLength', 'maxLength']
  for (const field of numericFields) {
    const value = String(form[field] ?? '').trim()
    if (value && !Number.isFinite(Number(value))) {
      errors[field] = 'Enter a valid number.'
    }
  }

  if (
    form.uiControl === RUNTIME_PATH_REGISTRY_UI_CONTROLS.SELECT
    && parseRuntimePathRegistryListText(form.allowedValues).length === 0
  ) {
    errors.uiControl = 'SELECT requires at least one allowed value.'
  }

  if (
    form.uiControl === RUNTIME_PATH_REGISTRY_UI_CONTROLS.CHECKBOX
    && form.dataType !== RUNTIME_PATH_REGISTRY_DATA_TYPES.BOOLEAN
  ) {
    errors.uiControl = 'CHECKBOX requires BOOLEAN data type.'
  }

  if (
    form.uiControl === RUNTIME_PATH_REGISTRY_UI_CONTROLS.NUMBER
    && form.dataType !== RUNTIME_PATH_REGISTRY_DATA_TYPES.NUMBER
  ) {
    errors.uiControl = 'NUMBER requires NUMBER data type.'
  }

  const minValue = parseOptionalRuntimePathRegistryNumber(form.minValue)
  const maxValue = parseOptionalRuntimePathRegistryNumber(form.maxValue)
  if (Number.isFinite(minValue) && Number.isFinite(maxValue) && minValue > maxValue) {
    errors.maxValue = 'Max Value must be greater than or equal to Min Value.'
  }

  const minLength = parseOptionalRuntimePathRegistryNumber(form.minLength)
  const maxLength = parseOptionalRuntimePathRegistryNumber(form.maxLength)
  if (Number.isFinite(minLength) && Number.isFinite(maxLength) && minLength > maxLength) {
    errors.maxLength = 'Max Length must be greater than or equal to Min Length.'
  }

  return errors
}

export const cloneRuntimePathRegistryEntry = (entry) => ({
  ...entry,
  componentVersion: Number(entry.componentVersion) || 1,
  versionStatus: entry.versionStatus
    ?? (entry.status === RUNTIME_PATH_REGISTRY_STATUSES.ACTIVE
      ? 'ACTIVE'
      : entry.status === RUNTIME_PATH_REGISTRY_STATUSES.DEPRECATED
        ? 'DEPRECATED'
        : entry.status === RUNTIME_PATH_REGISTRY_STATUSES.INACTIVE
          ? 'ARCHIVED'
          : 'DRAFT'),
  lineageId: entry.lineageId ?? entry.id ?? buildRuntimePathRegistryStableId(entry.pathKey),
  isLocked: Boolean(entry.isLocked),
  lockedAt: entry.lockedAt ?? null,
  lockedBy: entry.lockedBy ? { ...entry.lockedBy } : null,
  lockedReason: String(entry.lockedReason ?? '').trim() || null,
  lockedByPackageKeys: [...(entry.lockedByPackageKeys ?? [])],
  deprecatedInVersion: String(entry.deprecatedInVersion ?? '').trim() || null,
  clonedFromStableId: entry.clonedFromStableId ?? null,
  supersedesStableId: entry.supersedesStableId ?? null,
  supersededByStableId: entry.supersededByStableId ?? null,
  frameworkKeys: [...(entry.frameworkKeys ?? [])],
  allowedOperations: [...(entry.allowedOperations ?? [])],
  compatibilityTags: [...(entry.compatibilityTags ?? [])],
  allowedValues: Array.isArray(entry.allowedValues) ? [...entry.allowedValues] : entry.allowedValues,
  allowedValueLabels: entry.allowedValueLabels ? { ...entry.allowedValueLabels } : entry.allowedValueLabels,
  exampleValue:
    entry.exampleValue && typeof entry.exampleValue === 'object'
      ? JSON.parse(JSON.stringify(entry.exampleValue))
      : entry.exampleValue,
  defaultValue:
    entry.defaultValue && typeof entry.defaultValue === 'object'
      ? JSON.parse(JSON.stringify(entry.defaultValue))
      : entry.defaultValue,
  updatedBy: entry.updatedBy ? { ...entry.updatedBy } : null,
})
