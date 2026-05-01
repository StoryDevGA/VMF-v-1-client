export const FRAMEWORK_PACKAGE_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  VALIDATED: 'VALIDATED',
  ACTIVE: 'ACTIVE',
  DEPRECATED: 'DEPRECATED',
})

const READY_FRAMEWORK_PACKAGE_STATUSES = new Set([
  FRAMEWORK_PACKAGE_STATUSES.VALIDATED,
  FRAMEWORK_PACKAGE_STATUSES.ACTIVE,
])

export const FRAMEWORK_PACKAGE_STATUS_OPTIONS = Object.freeze([
  { value: '', label: 'All lifecycle states' },
  { value: FRAMEWORK_PACKAGE_STATUSES.DRAFT, label: 'Draft' },
  { value: FRAMEWORK_PACKAGE_STATUSES.VALIDATED, label: 'Validated' },
  { value: FRAMEWORK_PACKAGE_STATUSES.ACTIVE, label: 'Active' },
  { value: FRAMEWORK_PACKAGE_STATUSES.DEPRECATED, label: 'Deprecated' },
])

export const FRAMEWORK_PACKAGE_SCOPE_OPTIONS = Object.freeze([
  { value: 'SYSTEM', label: 'System' },
  { value: 'CUSTOMER', label: 'Customer' },
])

export const FRAMEWORK_PACKAGE_TYPE_OPTIONS = Object.freeze([
  { value: 'STANDARD', label: 'Standard' },
  { value: 'EXPERIMENTAL', label: 'Experimental' },
  { value: 'CUSTOM', label: 'Custom' },
])

export const FRAMEWORK_PACKAGE_VISIBILITY_OPTIONS = Object.freeze([
  { value: 'INTERNAL_ONLY', label: 'Internal only' },
  { value: 'CUSTOMER_VISIBLE', label: 'Customer visible' },
])

export const FRAMEWORK_PACKAGE_CUSTOMER_ACCESS_OPTIONS = Object.freeze([
  { value: 'ALL_CUSTOMERS', label: 'All customers' },
  { value: 'SELECTED_CUSTOMERS', label: 'Selected customers' },
])

export const FRAMEWORK_PACKAGE_RETRY_POLICY_OPTIONS = Object.freeze([
  { value: 'NONE', label: 'No retry' },
  { value: 'RETRY_ONCE', label: 'Retry once' },
  { value: 'RETRY_WITH_BACKOFF', label: 'Retry with backoff' },
])

export const FRAMEWORK_PACKAGE_VALIDATION_TRIGGER_OPTIONS = Object.freeze([
  { value: 'ON_SAVE', label: 'On save' },
  { value: 'ON_SUBMIT', label: 'On submit' },
  { value: 'ON_STAGE_CHANGE', label: 'On stage change' },
  { value: 'ON_PUBLISH', label: 'On publish' },
  { value: 'MANUAL', label: 'Manual' },
])

export const FRAMEWORK_PACKAGE_WORKFLOW_EXECUTION_CONTEXT_OPTIONS = Object.freeze([
  { value: 'ON_CREATE', label: 'On create' },
  { value: 'ON_SAVE', label: 'On save' },
  { value: 'ON_SUBMIT', label: 'On submit' },
  { value: 'ON_STAGE_ENTER', label: 'On stage enter' },
  { value: 'ON_STAGE_EXIT', label: 'On stage exit' },
  { value: 'ON_APPROVAL', label: 'On approval' },
  { value: 'ON_PUBLISH', label: 'On publish' },
])

export const FRAMEWORK_PACKAGE_EXECUTION_MODE_OPTIONS = Object.freeze([
  { value: 'EVENT_DRIVEN', label: 'Event driven' },
  { value: 'MANUAL', label: 'Manual' },
])

export const FRAMEWORK_PACKAGE_STATE_MODEL_OPTIONS = Object.freeze([
  { value: 'LIFECYCLE_BASED', label: 'Lifecycle based' },
  { value: 'FREEFORM', label: 'Freeform' },
])

export const FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES = Object.freeze({
  INTERNAL: 'INTERNAL',
  EXTERNAL: 'EXTERNAL',
})

export const FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODE_OPTIONS = Object.freeze([
  { value: FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL, label: 'Internal' },
  { value: FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.EXTERNAL, label: 'External' },
])

export const FRAMEWORK_PACKAGE_STATE_BINDING_MODE_OPTIONS = Object.freeze([
  { value: 'STRICT', label: 'Strict' },
  { value: 'FLEXIBLE', label: 'Flexible' },
])

export const FRAMEWORK_PACKAGE_STATE_PERSISTENCE_OPTIONS = Object.freeze([
  { value: 'SESSION', label: 'Session' },
  { value: 'PERSISTED', label: 'Persisted' },
])

export const FRAMEWORK_PACKAGE_EVALUATION_MODE_OPTIONS = Object.freeze([
  { value: 'POLICY_DRIVEN', label: 'Policy driven' },
  { value: 'VALIDATION_FIRST', label: 'Validation first' },
])

export const FRAMEWORK_PACKAGE_OUTPUT_KEY_OPTIONS = Object.freeze([
  { value: 'board-summary', label: 'Board Summary' },
  { value: 'executive-brief', label: 'Executive Brief' },
  { value: 'review-pack', label: 'Review Pack' },
])

export const FRAMEWORK_PACKAGE_OUTPUT_STYLE_OPTIONS = Object.freeze([
  { value: 'executive-concise', label: 'Executive concise' },
  { value: 'board-ready', label: 'Board ready' },
  { value: 'review-detail', label: 'Review detail' },
])

export const FRAMEWORK_PACKAGE_LIFECYCLE_STAGE_OPTIONS = Object.freeze([
  { value: 'DRAFT', label: 'Draft' },
  { value: 'REVIEW_READY', label: 'Ready for review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PUBLISHED', label: 'Published' },
])

export const FRAMEWORK_PACKAGE_FORM_STATUS_OPTIONS = Object.freeze([
  { value: FRAMEWORK_PACKAGE_STATUSES.DRAFT, label: 'Draft' },
  { value: FRAMEWORK_PACKAGE_STATUSES.VALIDATED, label: 'Validated' },
  { value: FRAMEWORK_PACKAGE_STATUSES.DEPRECATED, label: 'Deprecated' },
])

export const FRAMEWORK_PACKAGE_PAGE_SIZE = 4

export const FRAMEWORK_PACKAGES_HELP_TEXT =
  'Validated packages can be activated. The active default package for a framework becomes the authoritative binding for future framework-aware products.'

export const DEPRECATED_FRAMEWORK_PACKAGE_FIELD_MESSAGES = Object.freeze({
  compatibleWorkflowKeys: 'compatibleWorkflowKeys is deprecated. Use workflowBindings instead.',
  defaultAgentIds: 'defaultAgentIds is deprecated. Agents are assigned through workflow policies.',
  requiredSkillIds: 'requiredSkillIds is deprecated. Skills are resolved through workflow policies.',
  validationRules: 'validationRules is deprecated. Use sections and validationBindings instead.',
  validationConfig: 'validationConfig is deprecated. Use validationBindings instead.',
  workflowPolicyConfig: 'workflowPolicyConfig is deprecated. Use workflowBindings instead.',
})

export const DEPRECATED_FRAMEWORK_PACKAGE_FIELDS = Object.freeze(
  Object.keys(DEPRECATED_FRAMEWORK_PACKAGE_FIELD_MESSAGES),
)

export const INITIAL_FRAMEWORK_PACKAGE_FORM = Object.freeze({
  frameworkKey: 'VMF',
  frameworkName: 'Value Management Framework',
  version: '',
  packageKey: '',
  packageName: '',
  packageScope: 'SYSTEM',
  packageType: 'STANDARD',
  derivedFromPackageId: '',
  description: '',
  status: FRAMEWORK_PACKAGE_STATUSES.DRAFT,
  visibility: 'INTERNAL_ONLY',
  customerAccessMode: 'ALL_CUSTOMERS',
  assignedCustomerIds: '',
  sections: Object.freeze([]),
  sectionsText: '',
  executionModel: Object.freeze({
    mode: 'EVENT_DRIVEN',
    stateModel: 'LIFECYCLE_BASED',
    evaluationMode: 'POLICY_DRIVEN',
  }),
  runtimeSettings: Object.freeze({
    enablePreviewMode: true,
    enableRuntimeValidation: true,
    requireValidationBeforePublish: true,
    allowManualValidationRun: true,
    allowPolicyRetry: true,
    retryPolicy: 'RETRY_ONCE',
    defaultTimeoutMs: 30000,
    maxPolicyExecutionsPerRun: 10,
  }),
  validationBindings: Object.freeze([]),
  workflowBindings: Object.freeze([]),
  uiContractKey: '',
  uiContractBinding: null,
  stateModelKey: '',
  stateModelVersion: '',
  stateModelMode: FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL,
  stateBindingMode: 'STRICT',
  statePersistence: 'SESSION',
  stateContractNotes: '',
  availableOutputKeys: '',
  defaultOutputStyles: '',
  allowCustomerOutputDefinitions: false,
  artifactRetentionDays: 365,
  allowOutputRevisionHistory: true,
  supportsPreviewMode: true,
  supportsFullReport: true,
  requiresValidationBeforePublish: true,
})

export const INITIAL_FRAMEWORK_PACKAGES = Object.freeze([
  Object.freeze({
    id: 'pkg-vmf-231',
    frameworkKey: 'VMF',
    frameworkName: 'Value Management Framework',
    version: '2.3.1',
    packageKey: 'vmf-2-3-1',
    packageName: 'VMF 2.3.1',
    packageScope: 'SYSTEM',
    packageType: 'STANDARD',
    description: 'Current VMF default bundle for publish-ready customer workspaces.',
    status: FRAMEWORK_PACKAGE_STATUSES.ACTIVE,
    isDefault: true,
    visibility: 'CUSTOMER_VISIBLE',
    customerAccessMode: 'ALL_CUSTOMERS',
    assignedCustomerIds: Object.freeze([]),
    sections: Object.freeze([
      Object.freeze({ sectionKey: 'customer_problem', runtimePath: 'framework_state.sections.customer_problem', required: true, validationKeys: Object.freeze(['required-sections-check']), notes: '' }),
      Object.freeze({ sectionKey: 'proposed_solution', runtimePath: 'framework_state.sections.proposed_solution', required: true, validationKeys: Object.freeze(['required-sections-check']), notes: '' }),
      Object.freeze({ sectionKey: 'value_metrics', runtimePath: 'framework_state.sections.value_metrics', required: false, validationKeys: Object.freeze([]), notes: '' }),
      Object.freeze({ sectionKey: 'proof_points', runtimePath: 'framework_state.sections.proof_points', required: true, validationKeys: Object.freeze(['required-sections-check']), notes: '' }),
    ]),
    runtimeSettings: Object.freeze({
      enablePreviewMode: true,
      enableRuntimeValidation: true,
      requireValidationBeforePublish: true,
      allowManualValidationRun: true,
      allowPolicyRetry: true,
      retryPolicy: 'RETRY_ONCE',
      defaultTimeoutMs: 30000,
      maxPolicyExecutionsPerRun: 10,
    }),
    executionModel: Object.freeze({
      mode: 'EVENT_DRIVEN',
      stateModel: 'LIFECYCLE_BASED',
      evaluationMode: 'POLICY_DRIVEN',
    }),
    validationBindings: Object.freeze([
      Object.freeze({ validationKey: 'required-sections-check', trigger: 'ON_SUBMIT', blocking: true, priority: 100, freshnessMinutes: null, enabled: true, notes: '' }),
    ]),
    workflowBindings: Object.freeze([
      Object.freeze({ policyKey: 'vmf-publish', executionContext: 'ON_SUBMIT', priority: 100, enabled: true, notes: '' }),
    ]),
    uiContractKey: 'vmf-ui-contract-v1',
    uiContractBinding: Object.freeze({
      key: 'vmf-ui-contract-v1',
      version: '2.3.1',
      status: 'ACTIVE',
      compatibilityMode: 'INHERITED_MINOR',
      resolvedAt: '2026-04-08T09:15:00.000Z',
    }),
    stateModelKey: null,
    stateModelVersion: null,
    stateModelMode: FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL,
    stateBindingMode: 'STRICT',
    statePersistence: 'SESSION',
    stateContractNotes: '',
    availableOutputKeys: Object.freeze(['board-summary', 'executive-brief']),
    defaultOutputStyles: Object.freeze(['executive-concise']),
    allowCustomerOutputDefinitions: false,
    artifactRetentionDays: 365,
    allowOutputRevisionHistory: true,
    capabilities: Object.freeze({
      supportsPreviewMode: true,
      supportsFullReport: true,
      requiresValidationBeforePublish: true,
    }),
    updatedAt: '2026-04-08T09:15:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: 'pkg-vmf-230',
    frameworkKey: 'VMF',
    frameworkName: 'Value Management Framework',
    version: '2.3.0',
    packageKey: 'vmf-2-3-0',
    description: 'Validated fallback package retained for rollback review.',
    status: FRAMEWORK_PACKAGE_STATUSES.VALIDATED,
    isDefault: false,
    workflowBindings: Object.freeze([
      Object.freeze({ policyKey: 'vmf-publish', executionContext: 'ON_SUBMIT', priority: 100, enabled: true, notes: '' }),
    ]),
    capabilities: Object.freeze({
      supportsPreviewMode: true,
      supportsFullReport: true,
      requiresValidationBeforePublish: true,
    }),
    updatedAt: '2026-04-07T16:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: 'pkg-vmf-240',
    frameworkKey: 'VMF',
    frameworkName: 'Value Management Framework',
    version: '2.4.0',
    packageKey: 'vmf-2-4-0',
    description: 'Draft next-wave VMF package with expanded publish checks.',
    status: FRAMEWORK_PACKAGE_STATUSES.DRAFT,
    isDefault: false,
    workflowBindings: Object.freeze([
      Object.freeze({ policyKey: 'vmf-publish', executionContext: 'ON_SUBMIT', priority: 100, enabled: true, notes: '' }),
    ]),
    capabilities: Object.freeze({
      supportsPreviewMode: true,
      supportsFullReport: true,
      requiresValidationBeforePublish: true,
    }),
    updatedAt: '2026-04-06T10:20:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'pkg-rld-110',
    frameworkKey: 'RLD',
    frameworkName: 'Revenue Lifecycle Design',
    version: '1.1.0',
    packageKey: 'rld-1-1-0',
    description: 'Current active RLD package for internal rollout.',
    status: FRAMEWORK_PACKAGE_STATUSES.ACTIVE,
    isDefault: true,
    workflowBindings: Object.freeze([
      Object.freeze({ policyKey: 'rld-baseline', executionContext: 'ON_SUBMIT', priority: 100, enabled: true, notes: '' }),
    ]),
    capabilities: Object.freeze({
      supportsPreviewMode: false,
      supportsFullReport: true,
      requiresValidationBeforePublish: true,
    }),
    updatedAt: '2026-04-05T14:45:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'pkg-rld-120',
    frameworkKey: 'RLD',
    frameworkName: 'Revenue Lifecycle Design',
    version: '1.2.0',
    packageKey: 'rld-1-2-0',
    description: 'Validated successor package awaiting activation approval.',
    status: FRAMEWORK_PACKAGE_STATUSES.VALIDATED,
    isDefault: false,
    workflowBindings: Object.freeze([
      Object.freeze({ policyKey: 'rld-publish', executionContext: 'ON_SUBMIT', priority: 100, enabled: true, notes: '' }),
    ]),
    capabilities: Object.freeze({
      supportsPreviewMode: true,
      supportsFullReport: true,
      requiresValidationBeforePublish: true,
    }),
    updatedAt: '2026-04-04T11:05:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'pkg-rld-100',
    frameworkKey: 'RLD',
    frameworkName: 'Revenue Lifecycle Design',
    version: '1.0.0',
    packageKey: 'rld-1-0-0',
    description: 'Deprecated seed package retained for audit and migration planning.',
    status: FRAMEWORK_PACKAGE_STATUSES.DEPRECATED,
    isDefault: false,
    workflowBindings: Object.freeze([
      Object.freeze({ policyKey: 'rld-baseline', executionContext: 'ON_SUBMIT', priority: 100, enabled: true, notes: '' }),
    ]),
    capabilities: Object.freeze({
      supportsPreviewMode: false,
      supportsFullReport: false,
      requiresValidationBeforePublish: true,
    }),
    updatedAt: '2026-04-03T08:40:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
])

const KEY_TOKEN_PATTERN = /^[a-z][a-z0-9-]*$/i
const SECTION_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/i
const RUNTIME_PATH_PATTERN = /^\S+$/
const FRAMEWORK_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/
const DEFAULT_SUPPORTED_FRAMEWORK_KEYS = Object.freeze(['VMF', 'RLD'])

export function omitDeprecatedFrameworkPackageFields(pkg = {}) {
  const canonicalPackage = { ...pkg }

  for (const field of DEPRECATED_FRAMEWORK_PACKAGE_FIELDS) {
    delete canonicalPackage[field]
  }

  return canonicalPackage
}

export function cloneFrameworkPackage(pkg) {
  const source = omitDeprecatedFrameworkPackageFields(pkg)

  return {
    ...source,
    assignedCustomerIds: [...(source.assignedCustomerIds ?? [])],
    sections: (source.sections ?? []).map((section) => ({ ...section })),
    executionModel: {
      ...INITIAL_FRAMEWORK_PACKAGE_FORM.executionModel,
      ...(source.executionModel ?? {}),
    },
    runtimeSettings: {
      ...INITIAL_FRAMEWORK_PACKAGE_FORM.runtimeSettings,
      ...(source.runtimeSettings ?? {}),
    },
    validationBindings: (source.validationBindings ?? []).map((item) => ({ ...item })),
    workflowBindings: (source.workflowBindings ?? []).map((item) => ({ ...item })),
    uiContractKey: String(source.uiContractKey ?? '').trim(),
    uiContractBinding: source.uiContractBinding && typeof source.uiContractBinding === 'object'
      ? { ...source.uiContractBinding }
      : null,
    stateModelKey: source.stateModelKey ?? null,
    stateModelVersion: source.stateModelVersion ?? null,
    stateModelMode: String(source.stateModelMode ?? FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL).trim().toUpperCase(),
    stateBindingMode: String(source.stateBindingMode ?? 'STRICT').trim().toUpperCase(),
    statePersistence: String(source.statePersistence ?? 'SESSION').trim().toUpperCase(),
    stateContractNotes: String(source.stateContractNotes ?? '').trim(),
    availableOutputKeys: [...(source.availableOutputKeys ?? [])],
    defaultOutputStyles: [...(source.defaultOutputStyles ?? [])],
    capabilities: {
      ...source.capabilities,
    },
    updatedBy: {
      ...source.updatedBy,
    },
  }
}

export function getFrameworkPackageStatusVariant(status) {
  if (status === FRAMEWORK_PACKAGE_STATUSES.ACTIVE) return 'success'
  if (status === FRAMEWORK_PACKAGE_STATUSES.VALIDATED) return 'info'
  if (status === FRAMEWORK_PACKAGE_STATUSES.DRAFT) return 'warning'
  return 'neutral'
}

export function formatFrameworkPackageStatus(status) {
  return String(status ?? '')
    .toLowerCase()
    .replace(/^\w/, (character) => character.toUpperCase())
}

function normalizeFrameworkKey(value) {
  return String(value ?? '').trim().toUpperCase()
}

function normalizeVersion(value) {
  return String(value ?? '').trim()
}

function normalizeKeyToken(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .toLowerCase()
}

export function normalizeSectionKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .toLowerCase()
}

export function normalizeRuntimePath(value) {
  return String(value ?? '').trim()
}

export function deriveSectionKeyFromRuntimePath(runtimePath) {
  const normalizedRuntimePath = normalizeRuntimePath(runtimePath)
  const [, sectionKey = ''] = normalizedRuntimePath.match(/framework_state\.sections\.([^.\s]+)$/i) ?? []
  return normalizeSectionKey(sectionKey)
}

function parseKeyList(value) {
  return [...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map(normalizeKeyToken)
      .filter(Boolean),
  )]
}

export function parseCustomerIdList(value) {
  return [...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  )]
}

export function formatCustomerIdList(items) {
  return Array.isArray(items)
    ? items.map((item) => String(item ?? '').trim()).filter(Boolean).join('\n')
    : ''
}

function formatKeyList(items) {
  return Array.isArray(items) ? items.join('\n') : ''
}

function formatSectionRows(sections) {
  if (!Array.isArray(sections)) return ''
  return sections
    .map((section) => {
      const sectionKey = String(section.sectionKey ?? '').trim()
      if (!sectionKey) return ''
      const runtimePath = normalizeRuntimePath(section.runtimePath)
      return runtimePath ? `${sectionKey}|${runtimePath}` : sectionKey
    })
    .filter(Boolean)
    .join('\n')
}

function parseSectionRows(value) {
  return String(value ?? '')
    .split(/\n+/)
    .map((row) => {
      const [rawKey, rawRuntimePath = ''] = row.split('|')
      const runtimePath = normalizeRuntimePath(
        rawRuntimePath
        || (String(rawKey).includes('.') ? rawKey : `framework_state.sections.${normalizeSectionKey(rawKey)}`),
      )
      const sectionKey = normalizeSectionKey(
        rawRuntimePath ? rawKey : deriveSectionKeyFromRuntimePath(runtimePath),
      )
      if (!sectionKey) return null
      return {
        sectionKey,
        runtimePath,
        required: true,
        validationKeys: [],
        notes: '',
      }
    })
    .filter(Boolean)
}

function normalizeSectionRows(sections) {
  if (!Array.isArray(sections)) return []

  return sections
    .map((section) => {
      const runtimePath = normalizeRuntimePath(section.runtimePath ?? section.path)
      const sectionKey = normalizeSectionKey(
        section.sectionKey
        ?? section.key
        ?? deriveSectionKeyFromRuntimePath(runtimePath),
      )
      if (!sectionKey) return null

      return {
        sectionKey,
        runtimePath,
        required: section.required !== false,
        validationKeys: Array.isArray(section.validationKeys)
          ? [...new Set(section.validationKeys.map(normalizeKeyToken).filter(Boolean))]
          : parseKeyList(section.validationKeys),
        notes: String(section.notes ?? '').trim(),
      }
    })
    .filter(Boolean)
}

function normalizeValidationBindings(bindings, fallbackConfig = []) {
  const source = Array.isArray(bindings) && bindings.length > 0
    ? bindings
    : (fallbackConfig ?? []).map((item, index) => ({
        validationKey: item.validationKey,
        trigger: 'ON_SUBMIT',
        blocking: item.warningOnlyOverride === true ? false : true,
        priority: (index + 1) * 100,
        freshnessMinutes: item.freshnessOverrideMinutes ?? null,
        enabled: item.enabled !== false,
        notes: item.notes ?? '',
      }))

  return source
    .map((binding, index) => ({
      validationKey: normalizeKeyToken(binding.validationKey),
      trigger: String(binding.trigger ?? 'ON_SUBMIT').trim().toUpperCase(),
      blocking: binding.blocking !== false,
      priority: Number(binding.priority ?? ((index + 1) * 100)),
      freshnessMinutes: binding.freshnessMinutes === null || binding.freshnessMinutes === ''
        ? null
        : Number(binding.freshnessMinutes ?? 0),
      enabled: binding.enabled !== false,
      notes: String(binding.notes ?? '').trim(),
    }))
    .filter((binding) => binding.validationKey)
}

function normalizeWorkflowBindings(bindings, fallbackConfig = []) {
  const source = Array.isArray(bindings) && bindings.length > 0
    ? bindings
    : (fallbackConfig ?? []).map((item, index) => ({
        policyKey: item.policyKey,
        executionContext: 'ON_SUBMIT',
        priority: Number(item.executionOrder ?? ((index + 1) * 100)),
        enabled: item.enabled !== false,
        notes: item.notes ?? '',
      }))

  return source
    .map((binding, index) => ({
      policyKey: normalizeKeyToken(binding.policyKey),
      executionContext: String(binding.executionContext ?? 'ON_SUBMIT').trim().toUpperCase(),
      priority: Number(binding.priority ?? ((index + 1) * 100)),
      enabled: binding.enabled !== false,
      notes: String(binding.notes ?? '').trim(),
    }))
    .filter((binding) => binding.policyKey)
}

const hasNonEmptyArray = (value) => Array.isArray(value) && value.length > 0

const hasNonEmptyValidationRules = (value) =>
  Boolean(value && typeof value === 'object')
  && (
    hasNonEmptyArray(value.requiredSections)
    || hasNonEmptyArray(value.publishChecks)
  )

export function hasLegacyFrameworkPackageContractFields(pkg = {}) {
  const source = pkg || {}

  return (
    hasNonEmptyArray(source.validationConfig)
    || hasNonEmptyArray(source.workflowPolicyConfig)
    || hasNonEmptyArray(source.compatibleWorkflowKeys)
    || hasNonEmptyArray(source.defaultAgentIds)
    || hasNonEmptyArray(source.requiredSkillIds)
    || hasNonEmptyValidationRules(source.validationRules)
  )
}

function hasDuplicateBy(items, getKey) {
  const seen = new Set()
  return items.some((item) => {
    const key = getKey(item)
    if (!key) return false
    if (seen.has(key)) return true
    seen.add(key)
    return false
  })
}

function validateSectionRows(sections, errors) {
  const invalidSection = sections.find((section) => !SECTION_KEY_PATTERN.test(section.sectionKey))
  if (invalidSection) {
    errors.sections = `Invalid section key "${invalidSection.sectionKey}". Use letters, numbers, underscores, or hyphens.`
    return
  }

  if (hasDuplicateBy(sections, (section) => section.sectionKey)) {
    errors.sections = 'Section keys must be unique.'
    return
  }

  const missingRuntimePath = sections.find((section) => !normalizeRuntimePath(section.runtimePath))
  if (missingRuntimePath) {
    errors.sections = `Section "${missingRuntimePath.sectionKey}" requires a runtime path.`
    return
  }

  const invalidRuntimePath = sections.find((section) => !RUNTIME_PATH_PATTERN.test(section.runtimePath))
  if (invalidRuntimePath) {
    errors.sections = `Section "${invalidRuntimePath.sectionKey}" has an invalid runtime path.`
    return
  }

  if (hasDuplicateBy(sections, (section) => section.runtimePath)) {
    errors.sections = 'Section runtime paths must be unique.'
  }
}

function validateValidationBindings(validationBindings, errors) {
  const validTriggers = new Set(FRAMEWORK_PACKAGE_VALIDATION_TRIGGER_OPTIONS.map((option) => option.value))
  const invalidBinding = validationBindings.find((binding) =>
    !KEY_TOKEN_PATTERN.test(binding.validationKey)
    || !validTriggers.has(binding.trigger)
    || !Number.isInteger(binding.priority)
    || binding.priority < 1
    || binding.priority > 10000
    || (
      binding.freshnessMinutes !== null
      && (!Number.isInteger(binding.freshnessMinutes) || binding.freshnessMinutes < 1 || binding.freshnessMinutes > 10080)
    ),
  )
  if (invalidBinding) {
    errors.validationBindings = 'Validation bindings require a valid key, trigger, priority, and freshness window.'
    return
  }

  if (hasDuplicateBy(validationBindings, (binding) => `${binding.validationKey}:${binding.trigger}`)) {
    errors.validationBindings = 'Validation binding keys must be unique per trigger.'
  }
}

function validateWorkflowBindings(workflowBindings, errors) {
  const validExecutionContexts = new Set(FRAMEWORK_PACKAGE_WORKFLOW_EXECUTION_CONTEXT_OPTIONS.map((option) => option.value))
  const invalidBinding = workflowBindings.find((binding) =>
    !KEY_TOKEN_PATTERN.test(binding.policyKey)
    || !validExecutionContexts.has(binding.executionContext)
    || !Number.isInteger(binding.priority)
    || binding.priority < 1
    || binding.priority > 10000,
  )
  if (invalidBinding) {
    errors.workflowBindings = 'Workflow bindings require a valid policy key, execution context, and priority.'
    return
  }

  if (hasDuplicateBy(workflowBindings, (binding) => `${binding.policyKey}:${binding.executionContext}`)) {
    errors.workflowBindings = 'Workflow policy keys must be unique per execution context.'
    return
  }

  if (hasDuplicateBy(workflowBindings, (binding) => `${binding.executionContext}:${binding.priority}`)) {
    errors.workflowBindings = 'Workflow priority must be unique within each execution context.'
  }
}

export function mapFrameworkPackageToForm(pkg) {
  const visibility = pkg.visibility ?? 'INTERNAL_ONLY'
  const customerAccessMode = visibility === 'INTERNAL_ONLY'
    ? 'ALL_CUSTOMERS'
    : (pkg.customerAccessMode ?? 'ALL_CUSTOMERS')
  const assignedCustomerIds =
    visibility === 'CUSTOMER_VISIBLE' && customerAccessMode === 'SELECTED_CUSTOMERS'
      ? formatCustomerIdList(pkg.assignedCustomerIds)
      : ''

  const sections = normalizeSectionRows(pkg.sections)
  const validationBindings = normalizeValidationBindings(pkg.validationBindings, pkg.validationConfig)
  const workflowBindings = normalizeWorkflowBindings(pkg.workflowBindings, pkg.workflowPolicyConfig)

  return {
    frameworkKey: pkg.frameworkKey ?? '',
    frameworkName: pkg.frameworkName ?? '',
    version: pkg.version ?? '',
    packageKey: pkg.packageKey ?? '',
    packageName: pkg.packageName ?? '',
    packageScope: pkg.packageScope ?? 'SYSTEM',
    packageType: pkg.packageType ?? 'STANDARD',
    derivedFromPackageId: pkg.derivedFromPackageId ?? '',
    description: pkg.description ?? '',
    status: pkg.status ?? FRAMEWORK_PACKAGE_STATUSES.DRAFT,
    visibility,
    customerAccessMode,
    assignedCustomerIds,
    sections,
    sectionsText: formatSectionRows(pkg.sections),
    executionModel: {
      ...INITIAL_FRAMEWORK_PACKAGE_FORM.executionModel,
      ...(pkg.executionModel ?? {}),
    },
    runtimeSettings: {
      ...INITIAL_FRAMEWORK_PACKAGE_FORM.runtimeSettings,
      ...(pkg.runtimeSettings ?? {}),
    },
    validationBindings,
    workflowBindings,
    uiContractKey: String(pkg.uiContractKey ?? '').trim(),
    uiContractBinding: pkg.uiContractBinding && typeof pkg.uiContractBinding === 'object'
      ? { ...pkg.uiContractBinding }
      : null,
    stateModelKey: String(pkg.stateModelKey ?? '').trim(),
    stateModelVersion: String(pkg.stateModelVersion ?? '').trim(),
    stateModelMode: String(pkg.stateModelMode ?? FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL).trim().toUpperCase(),
    stateBindingMode: String(pkg.stateBindingMode ?? 'STRICT').trim().toUpperCase(),
    statePersistence: String(pkg.statePersistence ?? 'SESSION').trim().toUpperCase(),
    stateContractNotes: String(pkg.stateContractNotes ?? '').trim(),
    availableOutputKeys: formatKeyList(pkg.availableOutputKeys),
    defaultOutputStyles: formatKeyList(pkg.defaultOutputStyles),
    allowCustomerOutputDefinitions: Boolean(pkg.allowCustomerOutputDefinitions),
    artifactRetentionDays: Number(pkg.artifactRetentionDays ?? 365),
    allowOutputRevisionHistory: pkg.allowOutputRevisionHistory !== false,
    supportsPreviewMode: Boolean(pkg.capabilities?.supportsPreviewMode),
    supportsFullReport: Boolean(pkg.capabilities?.supportsFullReport),
    requiresValidationBeforePublish: Boolean(pkg.capabilities?.requiresValidationBeforePublish),
  }
}

export function validateFrameworkPackageForm(
  formState,
  existingPackages = [],
  selectedPackageId = '',
  supportedFrameworkKeys = DEFAULT_SUPPORTED_FRAMEWORK_KEYS,
) {
  const errors = {}
  const frameworkKey = normalizeFrameworkKey(formState.frameworkKey)
  const frameworkName = String(formState.frameworkName ?? '').trim()
  const version = normalizeVersion(formState.version)
  const description = String(formState.description ?? '').trim()
  const packageKey = normalizeKeyToken(formState.packageKey)
  const packageName = String(formState.packageName ?? '').trim()
  const assignedCustomerIds = parseCustomerIdList(formState.assignedCustomerIds)
  const sections = normalizeSectionRows(
    Array.isArray(formState.sections) && formState.sections.length > 0
      ? formState.sections
      : parseSectionRows(formState.sectionsText),
  )
  const validationBindings = normalizeValidationBindings(formState.validationBindings)
  const workflowBindings = normalizeWorkflowBindings(formState.workflowBindings)
  const uiContractKey = normalizeKeyToken(formState.uiContractKey)
  const stateModelKey = normalizeKeyToken(formState.stateModelKey)
  const stateModelVersion = String(formState.stateModelVersion ?? '').trim()
  const stateModelMode = String(formState.stateModelMode ?? FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL)
    .trim()
    .toUpperCase() || FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL
  const stateBindingMode = String(formState.stateBindingMode ?? 'STRICT').trim().toUpperCase() || 'STRICT'
  const statePersistence = String(formState.statePersistence ?? 'SESSION').trim().toUpperCase() || 'SESSION'
  const stateContractNotes = String(formState.stateContractNotes ?? '').trim()
  const availableOutputKeys = parseKeyList(formState.availableOutputKeys)
  const defaultOutputStyles = parseKeyList(formState.defaultOutputStyles)
  const status = String(formState.status ?? '').trim() || FRAMEWORK_PACKAGE_STATUSES.DRAFT
  const normalizedCustomerAccessMode = formState.visibility === 'INTERNAL_ONLY'
    ? 'ALL_CUSTOMERS'
    : formState.customerAccessMode
  const normalizedAssignedCustomerIds =
    formState.visibility === 'CUSTOMER_VISIBLE' && normalizedCustomerAccessMode === 'SELECTED_CUSTOMERS'
      ? assignedCustomerIds
      : []

  if (!FRAMEWORK_KEY_PATTERN.test(frameworkKey)) {
    errors.frameworkKey = 'Framework key is required and must use uppercase letters, numbers, or underscores.'
  } else if (!new Set(supportedFrameworkKeys).has(frameworkKey)) {
    errors.frameworkKey = 'Selected framework key is not available in the Framework Registry.'
  }

  if (!frameworkName) {
    errors.frameworkName = 'Framework name is required.'
  } else if (frameworkName.length > 120) {
    errors.frameworkName = 'Framework name must be 120 characters or fewer.'
  }

  if (!VERSION_PATTERN.test(version)) {
    errors.version = 'Version must use semantic version format, for example 2.3.1.'
  }

  if (description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.'
  }

  if (packageKey && !KEY_TOKEN_PATTERN.test(packageKey)) {
    errors.packageKey = 'Package key must use letters, numbers, or hyphens.'
  }

  if (READY_FRAMEWORK_PACKAGE_STATUSES.has(status) && !packageKey) {
    errors.packageKey = 'Package key is required before validation.'
  }

  if (packageName.length > 160) {
    errors.packageName = 'Package name must be 160 characters or fewer.'
  }

  if (
    formState.visibility === 'CUSTOMER_VISIBLE'
    && formState.customerAccessMode === 'SELECTED_CUSTOMERS'
    && assignedCustomerIds.length === 0
  ) {
    errors.assignedCustomerIds = 'Assigned customers are required for selected-customer access.'
  }

  if (
    formState.visibility === 'INTERNAL_ONLY'
    && formState.customerAccessMode === 'SELECTED_CUSTOMERS'
  ) {
    errors.customerAccessMode = 'Internal-only packages must use all-customers access mode.'
  }

  if (formState.visibility === 'INTERNAL_ONLY' && assignedCustomerIds.length > 0) {
    errors.assignedCustomerIds = 'Internal-only packages cannot be assigned to customers.'
  }

  if (formState.customerAccessMode === 'ALL_CUSTOMERS' && assignedCustomerIds.length > 0) {
    errors.assignedCustomerIds = 'Assigned customers must be empty when access mode is all customers.'
  }

  validateSectionRows(sections, errors)
  validateValidationBindings(validationBindings, errors)
  validateWorkflowBindings(workflowBindings, errors)
  if (uiContractKey && !KEY_TOKEN_PATTERN.test(uiContractKey)) {
    errors.uiContractKey = 'UI Contract key must use letters, numbers, or hyphens.'
  }

  if (READY_FRAMEWORK_PACKAGE_STATUSES.has(status) && sections.length > 0 && !uiContractKey) {
    errors.uiContractKey = 'UI Contract is required before validation when sections are configured.'
  }

  if (stateModelKey && !KEY_TOKEN_PATTERN.test(stateModelKey)) {
    errors.stateModelKey = 'State Model key must use letters, numbers, or hyphens.'
  }

  if (stateModelVersion.length > 50) {
    errors.stateModelVersion = 'State Model version must be 50 characters or fewer.'
  }

  if (!Object.values(FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES).includes(stateModelMode)) {
    errors.stateModelMode = 'State Model mode must be INTERNAL or EXTERNAL.'
  }

  if (stateModelMode === FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.EXTERNAL && !stateModelKey) {
    errors.stateModelKey = 'State Model key is required when State Model Mode is EXTERNAL.'
  }

  if (stateModelMode === FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.EXTERNAL && !stateModelVersion) {
    errors.stateModelVersion = 'State Model version is required when State Model Mode is EXTERNAL.'
  } else if (stateModelVersion && !VERSION_PATTERN.test(stateModelVersion)) {
    errors.stateModelVersion = 'State Model version must use semantic version format.'
  }

  if (!FRAMEWORK_PACKAGE_STATE_BINDING_MODE_OPTIONS.some((option) => option.value === stateBindingMode)) {
    errors.stateBindingMode = 'State Binding Mode must be STRICT or FLEXIBLE.'
  }

  if (!FRAMEWORK_PACKAGE_STATE_PERSISTENCE_OPTIONS.some((option) => option.value === statePersistence)) {
    errors.statePersistence = 'State Persistence must be SESSION or PERSISTED.'
  }

  if (stateContractNotes.length > 1000) {
    errors.stateContractNotes = 'State Contract notes must be 1000 characters or fewer.'
  }

  const duplicateVersion = existingPackages.find(
    (pkg) =>
      pkg.id !== selectedPackageId
      && normalizeFrameworkKey(pkg.frameworkKey) === frameworkKey
      && normalizeVersion(pkg.version) === version,
  )
  if (duplicateVersion) {
    errors.version = 'Framework key and version must be unique.'
  }

  return {
    errors,
    payload: {
      frameworkKey,
      frameworkName,
      version,
      packageKey: packageKey || undefined,
      packageName,
      packageScope: formState.packageScope,
      packageType: formState.packageType,
      derivedFromPackageId: String(formState.derivedFromPackageId ?? '').trim(),
      description,
      status,
      visibility: formState.visibility,
      customerAccessMode: normalizedCustomerAccessMode,
      assignedCustomerIds: normalizedAssignedCustomerIds,
      sections,
      executionModel: {
        ...INITIAL_FRAMEWORK_PACKAGE_FORM.executionModel,
        ...(formState.executionModel ?? {}),
      },
      runtimeSettings: {
        ...formState.runtimeSettings,
        defaultTimeoutMs: Number(formState.runtimeSettings?.defaultTimeoutMs ?? 0),
        maxPolicyExecutionsPerRun: Number(formState.runtimeSettings?.maxPolicyExecutionsPerRun ?? 1),
      },
      validationBindings,
      workflowBindings,
      uiContractKey,
      stateModelKey: stateModelMode === FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.EXTERNAL
        ? (stateModelKey || null)
        : null,
      stateModelVersion: stateModelMode === FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.EXTERNAL
        ? (stateModelVersion || null)
        : null,
      stateModelMode,
      stateBindingMode,
      statePersistence,
      stateContractNotes,
      availableOutputKeys,
      defaultOutputStyles,
      allowCustomerOutputDefinitions: Boolean(formState.allowCustomerOutputDefinitions),
      artifactRetentionDays: Number(formState.artifactRetentionDays ?? 365),
      allowOutputRevisionHistory: Boolean(formState.allowOutputRevisionHistory),
      capabilities: {
        supportsPreviewMode: Boolean(formState.supportsPreviewMode),
        supportsFullReport: Boolean(formState.supportsFullReport),
        requiresValidationBeforePublish: Boolean(formState.requiresValidationBeforePublish),
      },
    },
  }
}
