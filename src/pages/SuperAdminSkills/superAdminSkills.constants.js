export const RUNTIME_SKILL_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DRAFT: 'DRAFT',
  DEPRECATED: 'DEPRECATED',
})

export const RUNTIME_SKILL_STATUS_OPTIONS = Object.freeze([
  { value: '', label: 'All statuses' },
  { value: RUNTIME_SKILL_STATUSES.ACTIVE, label: 'Active' },
  { value: RUNTIME_SKILL_STATUSES.INACTIVE, label: 'Inactive' },
  { value: RUNTIME_SKILL_STATUSES.DRAFT, label: 'Draft' },
  { value: RUNTIME_SKILL_STATUSES.DEPRECATED, label: 'Deprecated' },
])

export const RUNTIME_SKILL_FORM_STATUS_OPTIONS = Object.freeze([
  { value: RUNTIME_SKILL_STATUSES.ACTIVE, label: 'Active' },
  { value: RUNTIME_SKILL_STATUSES.INACTIVE, label: 'Inactive' },
  { value: RUNTIME_SKILL_STATUSES.DRAFT, label: 'Draft' },
  { value: RUNTIME_SKILL_STATUSES.DEPRECATED, label: 'Deprecated' },
])

export const RUNTIME_SKILL_CATEGORY_OPTIONS = Object.freeze([
  { value: 'GENERAL', label: 'General' },
  { value: 'SNAPSHOT', label: 'Snapshot' },
  { value: 'VALIDATION', label: 'Validation' },
  { value: 'STATE', label: 'State' },
  { value: 'LIFECYCLE', label: 'Lifecycle' },
  { value: 'ACTION_RESOLUTION', label: 'Action Resolution' },
])

export const RUNTIME_SKILL_TYPE_OPTIONS = Object.freeze([
  { value: 'DETERMINISTIC', label: 'Deterministic' },
  { value: 'AGENT_ASSISTED', label: 'Agent-assisted' },
  { value: 'HYBRID', label: 'Hybrid' },
])

export const RUNTIME_SKILL_EXECUTION_MODE_OPTIONS = Object.freeze([
  { value: 'SYSTEM', label: 'System' },
  { value: 'RULE_ENGINE', label: 'Rule Engine' },
  { value: 'AGENT', label: 'Agent-assisted' },
])

export const RUNTIME_SKILL_RETRY_POLICY_OPTIONS = Object.freeze([
  { value: 'NONE', label: 'None' },
  { value: 'RETRY_ONCE', label: 'Retry once' },
  { value: 'RETRY_WITH_BACKOFF', label: 'Retry with backoff' },
])

export const RUNTIME_SKILL_PAGE_SIZE = 4

export const RUNTIME_SKILLS_HELP_TEXT =
  'Active skills remain selectable by framework packages and workflow policies. Set a skill inactive only after confirming live runtime bundles still have a compatible replacement.'

export const INITIAL_RUNTIME_SKILL_FORM = Object.freeze({
  key: '',
  name: '',
  description: '',
  status: RUNTIME_SKILL_STATUSES.ACTIVE,
  supportedFrameworkKeys: '',
  category: 'GENERAL',
  type: 'DETERMINISTIC',
  executionMode: 'SYSTEM',
  inputContract: '',
  outputContract: '',
  outputBindingMode: 'NONE',
  primaryOutputKey: '',
  outputBindings: '',
  timeoutMs: '5000',
  retryPolicy: 'NONE',
  allowedReadPaths: '',
  allowedWritePaths: '',
  forbiddenWritePaths: '',
  executionConfig: '',
  referenceAssets: Object.freeze([]),
})

export const INITIAL_RUNTIME_SKILLS = Object.freeze([
  Object.freeze({
    id: 'skill-snapshot',
    key: 'snapshot',
    name: 'Snapshot',
    description: 'Captures runtime state at workflow checkpoints for later validation and audit.',
    status: RUNTIME_SKILL_STATUSES.ACTIVE,
    supportedFrameworkKeys: Object.freeze(['VMF', 'RLD']),
    category: 'SNAPSHOT',
    type: 'DETERMINISTIC',
    executionMode: 'SYSTEM',
    inputContract: Object.freeze({}),
    outputContract: Object.freeze({}),
    runtimeConfig: Object.freeze({ timeoutMs: 5000, retryPolicy: 'NONE' }),
    dependencySummary: Object.freeze({ agentIds: [], workflowPolicyIds: [] }),
    updatedAt: '2026-04-08T12:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: 'skill-summary',
    key: 'summary',
    name: 'Summary',
    description: 'Generates concise runtime summaries for review and handoff surfaces.',
    status: RUNTIME_SKILL_STATUSES.ACTIVE,
    supportedFrameworkKeys: Object.freeze(['VMF', 'RLD']),
    category: 'GENERAL',
    type: 'DETERMINISTIC',
    executionMode: 'SYSTEM',
    inputContract: Object.freeze({}),
    outputContract: Object.freeze({}),
    runtimeConfig: Object.freeze({ timeoutMs: 5000, retryPolicy: 'NONE' }),
    dependencySummary: Object.freeze({ agentIds: [], workflowPolicyIds: [] }),
    updatedAt: '2026-04-07T15:35:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'skill-review',
    key: 'review',
    name: 'Review',
    description: 'Supports governance review checkpoints before activation and publish actions.',
    status: RUNTIME_SKILL_STATUSES.ACTIVE,
    supportedFrameworkKeys: Object.freeze(['VMF']),
    category: 'VALIDATION',
    type: 'DETERMINISTIC',
    executionMode: 'RULE_ENGINE',
    inputContract: Object.freeze({}),
    outputContract: Object.freeze({}),
    runtimeConfig: Object.freeze({ timeoutMs: 5000, retryPolicy: 'NONE' }),
    dependencySummary: Object.freeze({ agentIds: [], workflowPolicyIds: [] }),
    updatedAt: '2026-04-07T11:10:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'skill-revenue-map',
    key: 'revenue-map',
    name: 'Revenue Map',
    description: 'Builds revenue lifecycle mapping outputs for RLD workflows and evidence packs.',
    status: RUNTIME_SKILL_STATUSES.ACTIVE,
    supportedFrameworkKeys: Object.freeze(['RLD']),
    category: 'LIFECYCLE',
    type: 'DETERMINISTIC',
    executionMode: 'SYSTEM',
    inputContract: Object.freeze({}),
    outputContract: Object.freeze({}),
    runtimeConfig: Object.freeze({ timeoutMs: 5000, retryPolicy: 'NONE' }),
    dependencySummary: Object.freeze({ agentIds: [], workflowPolicyIds: [] }),
    updatedAt: '2026-04-06T14:20:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'skill-report',
    key: 'report',
    name: 'Report',
    description: 'Produces report-ready narrative sections when a package enables published output.',
    status: RUNTIME_SKILL_STATUSES.INACTIVE,
    supportedFrameworkKeys: Object.freeze(['VMF', 'RLD']),
    category: 'GENERAL',
    type: 'DETERMINISTIC',
    executionMode: 'SYSTEM',
    inputContract: Object.freeze({}),
    outputContract: Object.freeze({}),
    runtimeConfig: Object.freeze({ timeoutMs: 5000, retryPolicy: 'NONE' }),
    dependencySummary: Object.freeze({ agentIds: [], workflowPolicyIds: [] }),
    updatedAt: '2026-04-05T10:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'skill-go-to-market',
    key: 'go-to-market',
    name: 'Go To Market',
    description: 'Supports RLD go-to-market planning outputs during staged rollout validation.',
    status: RUNTIME_SKILL_STATUSES.INACTIVE,
    supportedFrameworkKeys: Object.freeze(['RLD']),
    category: 'ACTION_RESOLUTION',
    type: 'HYBRID',
    executionMode: 'AGENT',
    inputContract: Object.freeze({}),
    outputContract: Object.freeze({}),
    runtimeConfig: Object.freeze({ timeoutMs: 10000, retryPolicy: 'RETRY_ONCE' }),
    dependencySummary: Object.freeze({ agentIds: [], workflowPolicyIds: [] }),
    updatedAt: '2026-04-04T09:35:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
])

const KEY_TOKEN_PATTERN = /^[a-z][a-z0-9-]*$/i
const VALID_EXECUTION_MODES = new Set(['SYSTEM', 'RULE_ENGINE', 'AGENT'])
const VALID_RETRY_POLICIES = new Set(['NONE', 'RETRY_ONCE', 'RETRY_WITH_BACKOFF'])
const OUTPUT_BINDING_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/
const REFERENCE_ASSET_PURPOSES = new Set([
  'AUTHORING_HELP',
  'RUNTIME_REFERENCE',
  'EXAMPLE_INPUT',
  'EXAMPLE_OUTPUT',
  'TEMPLATE',
  'POLICY_GUIDANCE',
  'TEST_ASSET',
])
const REFERENCE_ASSET_USAGE_MODES = new Set(['OPTIONAL', 'REQUIRED', 'TEST_ONLY'])
const REFERENCE_ASSET_STATUSES = new Set(['ACTIVE', 'INACTIVE'])

export function cloneRuntimeSkill(skill) {
  return {
    ...skill,
    supportedFrameworkKeys: [...(skill.supportedFrameworkKeys ?? [])],
    inputContract: { ...(skill.inputContract ?? {}) },
    outputContract: { ...(skill.outputContract ?? {}) },
    runtimeConfig: { ...(skill.runtimeConfig ?? {}) },
    primaryOutputKey: String(skill.primaryOutputKey ?? ''),
    outputBindings: [...(skill.outputBindings ?? [])],
    allowedReadPaths: [...(skill.allowedReadPaths ?? [])],
    allowedWritePaths: [...(skill.allowedWritePaths ?? [])],
    forbiddenWritePaths: [...(skill.forbiddenWritePaths ?? [])],
    executionConfig: { ...(skill.executionConfig ?? {}) },
    referenceAssets: Array.isArray(skill.referenceAssets) ? skill.referenceAssets.map((asset) => ({ ...asset })) : [],
    dependencySummary: skill.dependencySummary
      ? {
          agentIds: [...(skill.dependencySummary.agentIds ?? [])],
          workflowPolicyIds: [...(skill.dependencySummary.workflowPolicyIds ?? [])],
        }
      : { agentIds: [], workflowPolicyIds: [] },
    createdBy: skill.createdBy
      ? { ...skill.createdBy }
      : undefined,
    updatedBy: skill.updatedBy
      ? { ...skill.updatedBy }
      : undefined,
  }
}

export function getRuntimeSkillStatusVariant(status) {
  if (status === RUNTIME_SKILL_STATUSES.ACTIVE) return 'success'
  if (status === RUNTIME_SKILL_STATUSES.DRAFT) return 'warning'
  return 'neutral'
}

export function formatRuntimeSkillStatus(status) {
  return String(status ?? '')
    .toLowerCase()
    .replace(/^\w/, (character) => character.toUpperCase())
}

export function normalizeSkillKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .toLowerCase()
}

export function normalizeFrameworkKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .toUpperCase()
}

export function parseFrameworkKeyList(value) {
  return [...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map(normalizeFrameworkKey)
      .filter(Boolean),
  )]
}

export function formatKeyList(items) {
  return Array.isArray(items) ? items.join('\n') : ''
}

export function parseStringList(value) {
  return [...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map((item) => String(item ?? '').trim())
      .filter(Boolean),
  )]
}

export function formatJsonField(value) {
  if (!value || typeof value !== 'object') return ''
  if (Object.keys(value).length === 0) return ''
  return JSON.stringify(value, null, 2)
}

export function parseJsonField(text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return { value: {}, error: null }
  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: null, error: 'Value must be a JSON object.' }
    }
    return { value: parsed, error: null }
  } catch {
    return { value: null, error: 'Invalid JSON.' }
  }
}

export function mapRuntimeSkillToForm(skill) {
  const primaryOutputKey = String(skill.primaryOutputKey ?? '')
  const outputBindingsList = Array.isArray(skill.outputBindings) ? skill.outputBindings : []
  const outputBindingMode = primaryOutputKey.trim()
    ? 'PRIMARY'
    : (outputBindingsList.length > 0 ? 'BINDINGS' : 'NONE')

  return {
    key: skill.key ?? '',
    name: skill.name ?? '',
    description: skill.description ?? '',
    status: skill.status ?? RUNTIME_SKILL_STATUSES.ACTIVE,
    supportedFrameworkKeys: formatKeyList(skill.supportedFrameworkKeys),
    category: String(skill.category ?? 'GENERAL').toUpperCase(),
    type: String(skill.type ?? 'DETERMINISTIC').toUpperCase(),
    executionMode: String(skill.executionMode ?? 'SYSTEM').toUpperCase(),
    inputContract: formatJsonField(skill.inputContract),
    outputContract: formatJsonField(skill.outputContract),
    outputBindingMode,
    primaryOutputKey,
    outputBindings: formatKeyList(outputBindingsList),
    timeoutMs: String(skill.runtimeConfig?.timeoutMs ?? 5000),
    retryPolicy: String(skill.runtimeConfig?.retryPolicy ?? 'NONE'),
    allowedReadPaths: formatKeyList(skill.allowedReadPaths),
    allowedWritePaths: formatKeyList(skill.allowedWritePaths),
    forbiddenWritePaths: formatKeyList(skill.forbiddenWritePaths),
    executionConfig: formatJsonField(skill.executionConfig),
    referenceAssets: Array.isArray(skill.referenceAssets)
      ? skill.referenceAssets.map((asset) => {
          const purpose = String(asset?.purpose ?? '').trim().toUpperCase()
          const usageModeRaw = String(asset?.usageMode ?? '').trim().toUpperCase()
          const usageMode = usageModeRaw === 'TESTING' ? 'TEST_ONLY' : usageModeRaw

          return {
            ...asset,
            purpose,
            usageMode,
            status: String(asset?.status ?? '').trim().toUpperCase(),
            isRuntimeAccessible: typeof asset?.isRuntimeAccessible === 'boolean'
              ? asset.isRuntimeAccessible
              : purpose === 'RUNTIME_REFERENCE',
            isAdminOnly: typeof asset?.isAdminOnly === 'boolean'
              ? asset.isAdminOnly
              : purpose === 'AUTHORING_HELP',
            isTestOnly: typeof asset?.isTestOnly === 'boolean'
              ? asset.isTestOnly
              : purpose === 'TEST_ASSET' || usageMode === 'TEST_ONLY',
          }
        })
      : [],
  }
}

export function validateRuntimeSkillForm(formState, existingSkills = [], selectedSkillId = '') {
  const errors = {}
  const key = normalizeSkillKey(formState.key)
  const name = String(formState.name ?? '').trim()
  const description = String(formState.description ?? '').trim()
  const status = String(formState.status ?? '').trim() || RUNTIME_SKILL_STATUSES.ACTIVE
  const supportedFrameworkKeys = parseFrameworkKeyList(formState.supportedFrameworkKeys)
  const category = String(formState.category ?? 'GENERAL').trim().toUpperCase()
  const type = String(formState.type ?? 'DETERMINISTIC').trim().toUpperCase()
  const executionMode = String(formState.executionMode ?? 'SYSTEM').trim().toUpperCase()
  const retryPolicy = String(formState.retryPolicy ?? 'NONE').trim().toUpperCase()
  const outputBindingMode = String(formState.outputBindingMode ?? 'NONE').trim().toUpperCase()
  const rawPrimaryOutputKey = String(formState.primaryOutputKey ?? '').trim()
  const rawOutputBindings = parseStringList(formState.outputBindings)
  let primaryOutputKey = rawPrimaryOutputKey
  let outputBindings = rawOutputBindings
  const allowedReadPaths = parseStringList(formState.allowedReadPaths)
  const allowedWritePaths = parseStringList(formState.allowedWritePaths)
  const forbiddenWritePaths = parseStringList(formState.forbiddenWritePaths)
  const referenceAssets = Array.isArray(formState.referenceAssets) ? formState.referenceAssets : []

  if (!KEY_TOKEN_PATTERN.test(key)) {
    errors.key = 'Skill key is required and must use letters, numbers, or hyphens.'
  }

  if (!name) {
    errors.name = 'Skill name is required.'
  } else if (name.length > 120) {
    errors.name = 'Skill name must be 120 characters or fewer.'
  }

  if (description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.'
  }

  if (supportedFrameworkKeys.length === 0) {
    errors.supportedFrameworkKeys = 'At least one supported framework key is required.'
  }

  const invalidFrameworkKey = supportedFrameworkKeys.find((value) => !value || !/^[A-Z][A-Z0-9_]*$/.test(value))
  if (invalidFrameworkKey) {
    errors.supportedFrameworkKeys = `Framework key "${invalidFrameworkKey}" must use uppercase letters, numbers, or underscores.`
  }

  const duplicateKey = existingSkills.find(
    (skill) => skill.id !== selectedSkillId && normalizeSkillKey(skill.key) === key,
  )
  if (duplicateKey) {
    errors.key = 'Skill key must be unique.'
  }

  if (!VALID_EXECUTION_MODES.has(executionMode)) {
    errors.executionMode = 'Execution mode must be System, Rule Engine, or Agent-assisted.'
  }

  const inputContractResult = parseJsonField(formState.inputContract)
  if (inputContractResult.error) {
    errors.inputContract = inputContractResult.error
  }

  const outputContractResult = parseJsonField(formState.outputContract)
  if (outputContractResult.error) {
    errors.outputContract = outputContractResult.error
  }

  if (outputBindingMode === 'NONE') {
    primaryOutputKey = ''
    outputBindings = []
  } else if (outputBindingMode === 'PRIMARY') {
    outputBindings = []
    if (!primaryOutputKey) {
      errors.primaryOutputKey = 'Primary output key is required when using Primary Output Key binding mode.'
    }
  } else if (outputBindingMode === 'BINDINGS') {
    primaryOutputKey = ''
    if (outputBindings.length === 0) {
      errors.outputBindings = 'At least one output binding is required when using Output Bindings mode.'
    }
  } else {
    errors.outputBindingMode = 'Output binding mode must be None, Primary Output Key, or Output Bindings.'
  }

  if (primaryOutputKey && !OUTPUT_BINDING_PATTERN.test(primaryOutputKey)) {
    errors.primaryOutputKey = 'Primary output key must start with a letter and only use letters, numbers, or underscores.'
  }

  const invalidOutputBinding = outputBindings.find((item) => !OUTPUT_BINDING_PATTERN.test(item))
  if (invalidOutputBinding) {
    errors.outputBindings = 'Output bindings must start with a letter and only use letters, numbers, or underscores.'
  }

  if (primaryOutputKey && outputBindings.length > 0) {
    errors.primaryOutputKey = 'Provide either a primary output key or output bindings, not both.'
    errors.outputBindings = 'Provide either a primary output key or output bindings, not both.'
  }

  if (!outputContractResult.error && outputContractResult.value) {
    const properties = outputContractResult.value.properties

    if (properties != null && (typeof properties !== 'object' || Array.isArray(properties))) {
      errors.outputContract = 'Output contract properties must be a JSON object.'
    } else if (outputBindingMode === 'PRIMARY') {
      const propertyKeys = properties && typeof properties === 'object'
        ? Object.keys(properties).filter(Boolean)
        : []

      if (propertyKeys.length === 0) {
        errors.primaryOutputKey = 'Define output contract properties to select a primary output key.'
      } else if (primaryOutputKey && !propertyKeys.includes(primaryOutputKey)) {
        errors.primaryOutputKey = 'Primary output key must be one of the Output Contract properties.'
      }
    }
  }

  const invalidReadPath = allowedReadPaths.find((item) => /\s/.test(item))
  if (invalidReadPath) {
    errors.allowedReadPaths = 'Allowed read paths must not contain whitespace.'
  }

  const invalidWritePath = allowedWritePaths.find((item) => /\s/.test(item))
  if (invalidWritePath) {
    errors.allowedWritePaths = 'Allowed write paths must not contain whitespace.'
  }

  const invalidForbiddenPath = forbiddenWritePaths.find((item) => /\s/.test(item))
  if (invalidForbiddenPath) {
    errors.forbiddenWritePaths = 'Forbidden write paths must not contain whitespace.'
  }

  const allowedWriteSet = new Set(allowedWritePaths)
  const forbiddenOverlap = forbiddenWritePaths.find((item) => allowedWriteSet.has(item))
  if (forbiddenOverlap) {
    errors.forbiddenWritePaths = 'Forbidden write paths must not overlap with allowed write paths.'
  }

  const executionConfigResult = parseJsonField(formState.executionConfig)
  if (executionConfigResult.error) {
    errors.executionConfig = executionConfigResult.error
  }

  if (
    executionMode === 'SYSTEM'
    && executionConfigResult.value
    && Object.keys(executionConfigResult.value).length > 0
  ) {
    errors.executionConfig = 'Execution config is only supported for rule engine or agent-assisted skills.'
  }

  const normalizedReferenceAssets = []
  for (const asset of referenceAssets) {
    if (!asset || typeof asset !== 'object' || Array.isArray(asset)) {
      continue
    }

    const assetId = String(asset.assetId ?? '').trim().toLowerCase()
    const name = String(asset.name ?? '').trim()
    const assetType = String(asset.assetType ?? 'OTHER').trim().toUpperCase()
    const mimeType = String(asset.mimeType ?? '').trim()
    const purpose = String(asset.purpose ?? '').trim().toUpperCase()
    const usageModeRaw = String(asset.usageMode ?? 'OPTIONAL').trim().toUpperCase()
    const usageMode = usageModeRaw === 'TESTING' ? 'TEST_ONLY' : usageModeRaw
    const status = String(asset.status ?? 'ACTIVE').trim().toUpperCase()
    const description = String(asset.description ?? '').trim()
    const storageKey = String(asset.storageKey ?? '').trim()
    const isRuntimeAccessible = typeof asset.isRuntimeAccessible === 'boolean'
      ? asset.isRuntimeAccessible
      : purpose === 'RUNTIME_REFERENCE'
    const isAdminOnly = typeof asset.isAdminOnly === 'boolean'
      ? asset.isAdminOnly
      : purpose === 'AUTHORING_HELP'
    const isTestOnly = typeof asset.isTestOnly === 'boolean'
      ? asset.isTestOnly
      : purpose === 'TEST_ASSET' || usageMode === 'TEST_ONLY'

    if (!assetId) {
      errors.referenceAssets = 'Each reference asset must have an asset id.'
      break
    }
    if (!name) {
      errors.referenceAssets = 'Each reference asset must have a name.'
      break
    }
    if (!purpose) {
      errors.referenceAssets = 'Each reference asset must have a purpose.'
      break
    }
    if (!REFERENCE_ASSET_PURPOSES.has(purpose)) {
      errors.referenceAssets = `Reference asset purpose "${purpose}" is not supported.`
      break
    }
    if (!REFERENCE_ASSET_USAGE_MODES.has(usageMode)) {
      errors.referenceAssets = `Reference asset usage mode "${usageMode}" is not supported.`
      break
    }
    if (!REFERENCE_ASSET_STATUSES.has(status)) {
      errors.referenceAssets = `Reference asset status "${status}" is not supported.`
      break
    }
    if (isRuntimeAccessible && isAdminOnly) {
      errors.referenceAssets = 'Reference assets cannot be both runtime-accessible and admin-only.'
      break
    }
    if (isRuntimeAccessible && isTestOnly) {
      errors.referenceAssets = 'Reference assets cannot be both runtime-accessible and test-only.'
      break
    }
    if (usageMode === 'TEST_ONLY' && !isTestOnly) {
      errors.referenceAssets = 'Test-only usage mode requires the asset to be marked as test-only.'
      break
    }
    if (purpose === 'TEST_ASSET' && !isTestOnly) {
      errors.referenceAssets = 'Test asset purpose requires the asset to be marked as test-only.'
      break
    }
    if ((usageMode === 'REQUIRED' || isRuntimeAccessible) && !storageKey) {
      errors.referenceAssets = 'Required or runtime-accessible reference assets must include a storage key or URL.'
      break
    }

    normalizedReferenceAssets.push({
      assetId,
      name,
      assetType,
      mimeType,
      purpose,
      usageMode,
      status,
      description,
      storageKey,
      isRuntimeAccessible,
      isAdminOnly,
      isTestOnly,
    })
  }

  const timeoutMs = Number.parseInt(String(formState.timeoutMs ?? ''), 10)
  if (Number.isNaN(timeoutMs) || timeoutMs < 0) {
    errors.timeoutMs = 'Timeout must be a non-negative integer.'
  }

  if (!VALID_RETRY_POLICIES.has(retryPolicy)) {
    errors.retryPolicy = 'Retry policy must be None, Retry once, or Retry with backoff.'
  }

  return {
    errors,
    payload: {
      key,
      name,
      description,
      status,
      supportedFrameworkKeys,
      category,
      type,
      executionMode,
      inputContract: inputContractResult.error ? {} : inputContractResult.value,
      outputContract: outputContractResult.error ? {} : outputContractResult.value,
      primaryOutputKey,
      outputBindings,
      runtimeConfig: {
        timeoutMs: Number.isNaN(timeoutMs) ? 5000 : timeoutMs,
        retryPolicy,
      },
      allowedReadPaths,
      allowedWritePaths,
      forbiddenWritePaths,
      executionConfig: executionConfigResult.error ? {} : executionConfigResult.value,
      referenceAssets: normalizedReferenceAssets,
    },
  }
}
