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

export const RUNTIME_PATH_REGISTRY_PAGE_SIZE = 20

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

  if (normalized === RUNTIME_PATH_REGISTRY_STATUSES.DRAFT) return 'info'
  if (normalized === RUNTIME_PATH_REGISTRY_STATUSES.ACTIVE) return 'success'
  if (normalized === RUNTIME_PATH_REGISTRY_STATUSES.DEPRECATED) return 'warning'
  return 'neutral'
}

export const cloneRuntimePathRegistryEntry = (entry) => ({
  ...entry,
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
