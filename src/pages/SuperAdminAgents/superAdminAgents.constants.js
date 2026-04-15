export const RUNTIME_AGENT_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DRAFT: 'DRAFT',
  DEPRECATED: 'DEPRECATED',
})

export const RUNTIME_AGENT_STATUS_OPTIONS = Object.freeze([
  { value: '', label: 'All statuses' },
  { value: RUNTIME_AGENT_STATUSES.ACTIVE, label: 'Active' },
  { value: RUNTIME_AGENT_STATUSES.INACTIVE, label: 'Inactive' },
  { value: RUNTIME_AGENT_STATUSES.DRAFT, label: 'Draft' },
  { value: RUNTIME_AGENT_STATUSES.DEPRECATED, label: 'Deprecated' },
])

export const RUNTIME_AGENT_FORM_STATUS_OPTIONS = Object.freeze([
  { value: RUNTIME_AGENT_STATUSES.ACTIVE, label: 'Active' },
  { value: RUNTIME_AGENT_STATUSES.INACTIVE, label: 'Inactive' },
  { value: RUNTIME_AGENT_STATUSES.DRAFT, label: 'Draft' },
  { value: RUNTIME_AGENT_STATUSES.DEPRECATED, label: 'Deprecated' },
])

export const RUNTIME_AGENT_TYPES = Object.freeze({
  INTAKE: 'INTAKE',
  EXECUTION: 'EXECUTION',
  VALIDATION: 'VALIDATION',
  INTERROGATION: 'INTERROGATION',
  MIGRATION: 'MIGRATION',
  ARTEFACT: 'ARTEFACT',
  SPINE: 'SPINE',
})

export const RUNTIME_AGENT_TYPE_OPTIONS = Object.freeze([
  { value: RUNTIME_AGENT_TYPES.INTAKE, label: 'Intake' },
  { value: RUNTIME_AGENT_TYPES.EXECUTION, label: 'Execution' },
  { value: RUNTIME_AGENT_TYPES.VALIDATION, label: 'Validation' },
  { value: RUNTIME_AGENT_TYPES.INTERROGATION, label: 'Interrogation' },
  { value: RUNTIME_AGENT_TYPES.MIGRATION, label: 'Migration' },
  { value: RUNTIME_AGENT_TYPES.ARTEFACT, label: 'Artefact' },
  { value: RUNTIME_AGENT_TYPES.SPINE, label: 'Spine' },
])

export const RUNTIME_AGENT_FRAMEWORK_OPTIONS = Object.freeze([
  { value: '', label: 'All frameworks' },
  { value: 'RLD', label: 'RLD' },
  { value: 'VMF', label: 'VMF' },
])

export const RUNTIME_AGENT_PAGE_SIZE = 4

export const RUNTIME_AGENTS_HELP_TEXT =
  'Active agents remain selectable by framework packages and workflow policies. Set an agent inactive only after confirming another compatible agent can satisfy any live dependency.'

export const INITIAL_RUNTIME_AGENT_FORM = Object.freeze({
  key: '',
  name: '',
  description: '',
  status: RUNTIME_AGENT_STATUSES.ACTIVE,
  agentType: RUNTIME_AGENT_TYPES.EXECUTION,
  supportedFrameworkKeys: 'VMF\nRLD',
  defaultSkillIds: '',
  primarySkillIds: '',
  optionalSkillIds: '',
  executionPlan: [],
  promptBaseSystem: '',
  promptRole: '',
  developerInstructions: '',
  outputContractPrompt: '',
  forbiddenActionsPrompt: '',
  handoffPrompt: '',
  inputContractJson: '{}',
  outputContractJson: '{}',
  policyMaxTokenBudget: '',
  policyTimeoutMs: '',
  policyRetryPolicy: '',
})

export const INITIAL_RUNTIME_AGENTS = Object.freeze([
  Object.freeze({
    id: 'agent-validator',
    key: 'validator',
    name: 'Validator',
    description: 'Runs baseline validation rules for compatible frameworks before policy transitions.',
    status: RUNTIME_AGENT_STATUSES.ACTIVE,
    agentType: RUNTIME_AGENT_TYPES.VALIDATION,
    supportedFrameworkKeys: Object.freeze(['VMF', 'RLD']),
    defaultSkillIds: Object.freeze(['skill-snapshot']),
    primarySkillIds: Object.freeze([]),
    optionalSkillIds: Object.freeze([]),
    executionPlan: Object.freeze([
      Object.freeze({ skillId: 'skill-snapshot', description: '' }),
    ]),
    promptConfig: Object.freeze({
      baseSystemPrompt: 'You are a governed StorylineOS runtime agent.',
      rolePrompt: 'Validate runtime control agent configuration.',
    }),
    inputContract: Object.freeze({}),
    outputContract: Object.freeze({}),
    policies: Object.freeze({}),
    updatedAt: '2026-04-08T12:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: 'agent-summary',
    key: 'summary',
    name: 'Summary Composer',
    description: 'Produces cross-framework runtime summaries for downstream review surfaces.',
    status: RUNTIME_AGENT_STATUSES.ACTIVE,
    agentType: RUNTIME_AGENT_TYPES.ARTEFACT,
    supportedFrameworkKeys: Object.freeze(['VMF', 'RLD']),
    defaultSkillIds: Object.freeze(['skill-summary']),
    primarySkillIds: Object.freeze([]),
    optionalSkillIds: Object.freeze([]),
    executionPlan: Object.freeze([
      Object.freeze({ skillId: 'skill-summary', description: '' }),
    ]),
    promptConfig: Object.freeze({}),
    inputContract: Object.freeze({}),
    outputContract: Object.freeze({}),
    policies: Object.freeze({}),
    updatedAt: '2026-04-07T15:30:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'agent-governance-review',
    key: 'governance-review',
    name: 'Governance Review',
    description: 'Checks governance guardrails before approval transitions on VMF runtime bundles.',
    status: RUNTIME_AGENT_STATUSES.ACTIVE,
    agentType: RUNTIME_AGENT_TYPES.VALIDATION,
    supportedFrameworkKeys: Object.freeze(['VMF']),
    defaultSkillIds: Object.freeze(['skill-review']),
    primarySkillIds: Object.freeze([]),
    optionalSkillIds: Object.freeze([]),
    executionPlan: Object.freeze([
      Object.freeze({ skillId: 'skill-review', description: '' }),
    ]),
    promptConfig: Object.freeze({}),
    inputContract: Object.freeze({}),
    outputContract: Object.freeze({}),
    policies: Object.freeze({}),
    updatedAt: '2026-04-07T11:20:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'agent-readiness-check',
    key: 'readiness-check',
    name: 'Readiness Check',
    description: 'Evaluates RLD readiness milestones before activation or publish steps.',
    status: RUNTIME_AGENT_STATUSES.ACTIVE,
    agentType: RUNTIME_AGENT_TYPES.VALIDATION,
    supportedFrameworkKeys: Object.freeze(['RLD']),
    defaultSkillIds: Object.freeze(['skill-snapshot']),
    primarySkillIds: Object.freeze([]),
    optionalSkillIds: Object.freeze([]),
    executionPlan: Object.freeze([
      Object.freeze({ skillId: 'skill-snapshot', description: '' }),
    ]),
    promptConfig: Object.freeze({}),
    inputContract: Object.freeze({}),
    outputContract: Object.freeze({}),
    policies: Object.freeze({}),
    updatedAt: '2026-04-06T14:15:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'agent-reporter',
    key: 'reporter',
    name: 'Report Publisher',
    description: 'Builds report-ready output packages when a compatible framework requests a published artifact.',
    status: RUNTIME_AGENT_STATUSES.INACTIVE,
    agentType: RUNTIME_AGENT_TYPES.ARTEFACT,
    supportedFrameworkKeys: Object.freeze(['VMF', 'RLD']),
    defaultSkillIds: Object.freeze(['skill-summary', 'skill-report']),
    primarySkillIds: Object.freeze([]),
    optionalSkillIds: Object.freeze([]),
    executionPlan: Object.freeze([
      Object.freeze({ skillId: 'skill-summary', description: '' }),
      Object.freeze({ skillId: 'skill-report', description: '' }),
    ]),
    promptConfig: Object.freeze({}),
    inputContract: Object.freeze({}),
    outputContract: Object.freeze({}),
    policies: Object.freeze({}),
    updatedAt: '2026-04-05T10:05:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'agent-baseline-sync',
    key: 'baseline-sync',
    name: 'Baseline Sync',
    description: 'Synchronises baseline runtime state during staged rollout validation.',
    status: RUNTIME_AGENT_STATUSES.INACTIVE,
    agentType: RUNTIME_AGENT_TYPES.EXECUTION,
    supportedFrameworkKeys: Object.freeze(['VMF']),
    defaultSkillIds: Object.freeze(['skill-snapshot']),
    primarySkillIds: Object.freeze([]),
    optionalSkillIds: Object.freeze([]),
    executionPlan: Object.freeze([
      Object.freeze({ skillId: 'skill-snapshot', description: '' }),
    ]),
    promptConfig: Object.freeze({}),
    inputContract: Object.freeze({}),
    outputContract: Object.freeze({}),
    policies: Object.freeze({}),
    updatedAt: '2026-04-04T09:40:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
])

const KEY_TOKEN_PATTERN = /^[a-z][a-z0-9-]*$/i
const ENUM_TOKEN_PATTERN = /^[A-Z][A-Z0-9_]*$/

export function normalizeEnumToken(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .toUpperCase()
}

export function cloneRuntimeAgent(agent) {
  return {
    ...agent,
    supportedFrameworkKeys: [...(agent.supportedFrameworkKeys ?? [])],
    defaultSkillIds: [...(agent.defaultSkillIds ?? [])],
    primarySkillIds: [...(agent.primarySkillIds ?? [])],
    optionalSkillIds: [...(agent.optionalSkillIds ?? [])],
    executionPlan: Array.isArray(agent.executionPlan)
      ? agent.executionPlan.map((step) => ({ ...step }))
      : [],
    promptConfig: { ...(agent.promptConfig ?? {}) },
    inputContract: { ...(agent.inputContract ?? {}) },
    outputContract: { ...(agent.outputContract ?? {}) },
    policies: { ...(agent.policies ?? {}) },
    updatedBy: {
      ...agent.updatedBy,
    },
  }
}

export function getRuntimeAgentStatusVariant(status) {
  if (status === RUNTIME_AGENT_STATUSES.ACTIVE) return 'success'
  return 'neutral'
}

export function formatRuntimeAgentStatus(status) {
  return String(status ?? '')
    .toLowerCase()
    .replace(/^\w/, (character) => character.toUpperCase())
}

export function normalizeAgentKey(value) {
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

export function parseKeyList(value) {
  return [...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map(normalizeAgentKey)
      .filter(Boolean),
  )]
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

export function mapRuntimeAgentToForm(agent) {
  const promptConfig = agent.promptConfig ?? {}
  const policies = agent.policies ?? {}
  const executionPlan = Array.isArray(agent.executionPlan)
    ? agent.executionPlan.map((step) => ({
        skillId: normalizeAgentKey(step?.skillId),
        description: String(step?.description ?? ''),
      }))
    : []

  return {
    key: agent.key ?? '',
    name: agent.name ?? '',
    description: agent.description ?? '',
    status: agent.status ?? RUNTIME_AGENT_STATUSES.ACTIVE,
    agentType: agent.agentType ?? RUNTIME_AGENT_TYPES.EXECUTION,
    supportedFrameworkKeys: formatKeyList(agent.supportedFrameworkKeys),
    defaultSkillIds: formatKeyList(agent.defaultSkillIds),
    primarySkillIds: formatKeyList(agent.primarySkillIds),
    optionalSkillIds: formatKeyList(agent.optionalSkillIds),
    executionPlan,
    promptBaseSystem: String(promptConfig.baseSystemPrompt ?? ''),
    promptRole: String(promptConfig.rolePrompt ?? ''),
    developerInstructions: String(promptConfig.developerInstructions ?? ''),
    outputContractPrompt: String(promptConfig.outputContractPrompt ?? ''),
    forbiddenActionsPrompt: String(promptConfig.forbiddenActionsPrompt ?? ''),
    handoffPrompt: String(promptConfig.handoffPrompt ?? ''),
    inputContractJson: JSON.stringify(agent.inputContract ?? {}, null, 2),
    outputContractJson: JSON.stringify(agent.outputContract ?? {}, null, 2),
    policyMaxTokenBudget:
      policies.maxTokenBudget === 0 || policies.maxTokenBudget
        ? String(policies.maxTokenBudget)
        : '',
    policyTimeoutMs:
      policies.timeoutMs === 0 || policies.timeoutMs
        ? String(policies.timeoutMs)
        : '',
    policyRetryPolicy: policies.retryPolicy ?? '',
  }
}

function parseJsonObject(value) {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return { value: {}, error: null }
  }

  try {
    const parsed = JSON.parse(raw)
    const isPlainObject = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    if (!isPlainObject) {
      return { value: null, error: 'Must be a JSON object.' }
    }
    return { value: parsed, error: null }
  } catch (_err) {
    return { value: null, error: 'Invalid JSON.' }
  }
}

export function validateRuntimeAgentForm(
  formState,
  existingAgents = [],
  selectedAgentId = '',
  availableFrameworkKeys = [],
  availableSkills = [],
) {
  const errors = {}
  const key = normalizeAgentKey(formState.key)
  const name = String(formState.name ?? '').trim()
  const description = String(formState.description ?? '').trim()
  const status = String(formState.status ?? '').trim() || RUNTIME_AGENT_STATUSES.ACTIVE
  const agentType = normalizeEnumToken(formState.agentType) || RUNTIME_AGENT_TYPES.EXECUTION
  const supportedFrameworkKeys = parseFrameworkKeyList(formState.supportedFrameworkKeys)
  const defaultSkillIds = parseKeyList(formState.defaultSkillIds)
  const primarySkillIds = parseKeyList(formState.primarySkillIds)
  const optionalSkillIds = parseKeyList(formState.optionalSkillIds)
  const assignedSkillIds = [...new Set([...defaultSkillIds, ...primarySkillIds, ...optionalSkillIds])]
  const executionPlanStepsRaw = Array.isArray(formState.executionPlan) ? formState.executionPlan : []
  const executionPlan = executionPlanStepsRaw.map((step) => ({
    skillId: normalizeAgentKey(step?.skillId),
    description: String(step?.description ?? '').trim(),
  }))

  if (!KEY_TOKEN_PATTERN.test(key)) {
    errors.key = 'Agent key is required and must use letters, numbers, or hyphens.'
  }

  if (!name) {
    errors.name = 'Agent name is required.'
  } else if (name.length > 120) {
    errors.name = 'Agent name must be 120 characters or fewer.'
  }

  if (description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.'
  }

  if (agentType && !ENUM_TOKEN_PATTERN.test(agentType)) {
    errors.agentType = 'Agent type must use letters, numbers, or underscores.'
  }

  if (supportedFrameworkKeys.length === 0) {
    errors.supportedFrameworkKeys = 'At least one supported framework key is required.'
  }

  const normalizedAvailableFrameworkKeys = new Set(
    Array.isArray(availableFrameworkKeys)
      ? availableFrameworkKeys.map(normalizeFrameworkKey).filter(Boolean)
      : [],
  )
  if (normalizedAvailableFrameworkKeys.size > 0) {
    const invalidFrameworkKey = supportedFrameworkKeys.find(
      (value) => !normalizedAvailableFrameworkKeys.has(value),
    )
    if (invalidFrameworkKey) {
      errors.supportedFrameworkKeys = `Unsupported framework key "${invalidFrameworkKey}".`
    }
  }

  const invalidSkillId = assignedSkillIds.find((value) => !KEY_TOKEN_PATTERN.test(value))
  if (invalidSkillId) {
    errors.defaultSkillIds = `Invalid skill id "${invalidSkillId}". Use letters, numbers, or hyphens.`
  }

  const inputContract = parseJsonObject(formState.inputContractJson)
  if (inputContract.error) {
    errors.inputContractJson = inputContract.error
  }

  const outputContract = parseJsonObject(formState.outputContractJson)
  if (outputContract.error) {
    errors.outputContractJson = outputContract.error
  }

  const maxTokenBudgetRaw = String(formState.policyMaxTokenBudget ?? '').trim()
  const timeoutMsRaw = String(formState.policyTimeoutMs ?? '').trim()
  const maxTokenBudget =
    maxTokenBudgetRaw === '' ? undefined : Number.parseInt(maxTokenBudgetRaw, 10)
  const timeoutMs =
    timeoutMsRaw === '' ? undefined : Number.parseInt(timeoutMsRaw, 10)

  if (maxTokenBudgetRaw !== '' && (!Number.isInteger(maxTokenBudget) || maxTokenBudget < 0)) {
    errors.policyMaxTokenBudget = 'Max token budget must be a non-negative integer.'
  }

  if (timeoutMsRaw !== '' && (!Number.isInteger(timeoutMs) || timeoutMs < 0)) {
    errors.policyTimeoutMs = 'Timeout must be a non-negative integer.'
  }

  const duplicateKey = existingAgents.find(
    (agent) => agent.id !== selectedAgentId && normalizeAgentKey(agent.key) === key,
  )
  if (duplicateKey) {
    errors.key = 'Agent key must be unique.'
  }

  const promptConfig = {
    baseSystemPrompt: String(formState.promptBaseSystem ?? '').trim(),
    rolePrompt: String(formState.promptRole ?? '').trim(),
    developerInstructions: String(formState.developerInstructions ?? '').trim(),
    outputContractPrompt: String(formState.outputContractPrompt ?? '').trim(),
    forbiddenActionsPrompt: String(formState.forbiddenActionsPrompt ?? '').trim(),
    handoffPrompt: String(formState.handoffPrompt ?? '').trim(),
  }

  const policies = {
    ...(Number.isInteger(maxTokenBudget) ? { maxTokenBudget } : {}),
    ...(Number.isInteger(timeoutMs) ? { timeoutMs } : {}),
    ...(String(formState.policyRetryPolicy ?? '').trim()
      ? { retryPolicy: String(formState.policyRetryPolicy ?? '').trim() }
      : {}),
  }

  if (executionPlan.length === 0) {
    errors.executionPlan = 'Execution plan must contain at least one step.'
  } else {
    const stepSkillIds = executionPlan.map((step) => step.skillId).filter(Boolean)
    const invalidStepSkillId = stepSkillIds.find((value) => !KEY_TOKEN_PATTERN.test(value))
    if (invalidStepSkillId) {
      errors.executionPlan = `Invalid skill id "${invalidStepSkillId}" in execution plan.`
    }

    const stepSkillIdSet = new Set()
    const duplicateStepSkillId = stepSkillIds.find((value) => {
      if (stepSkillIdSet.has(value)) return true
      stepSkillIdSet.add(value)
      return false
    })
    if (!errors.executionPlan && duplicateStepSkillId) {
      errors.executionPlan = `Duplicate skill "${duplicateStepSkillId}" is not allowed in the execution plan.`
    }

    const unassignedStepSkillId = stepSkillIds.find((value) => !assignedSkillIds.includes(value))
    if (!errors.executionPlan && unassignedStepSkillId) {
      errors.executionPlan = `Skill "${unassignedStepSkillId}" must be assigned before it can be used in the execution plan.`
    }
  }

  const availableSkillRows = Array.isArray(availableSkills) ? availableSkills : []
  if (availableSkillRows.length > 0 && assignedSkillIds.length > 0 && !errors.defaultSkillIds) {
    const skillLookup = new Map(
      availableSkillRows
        .map((skill) => [normalizeAgentKey(skill?.id), skill])
        .filter(([id]) => id),
    )
    const supportedFrameworkKeySet = new Set(supportedFrameworkKeys)

    const unknownSkillId = assignedSkillIds.find((skillId) => !skillLookup.has(skillId))
    if (unknownSkillId) {
      errors.defaultSkillIds = `Unknown skill id "${unknownSkillId}". Select a skill from the governed registry.`
    }

    if (!errors.defaultSkillIds && supportedFrameworkKeySet.size > 0) {
      const incompatibleSkillId = assignedSkillIds.find((skillId) => {
        const skill = skillLookup.get(skillId)
        const skillFrameworkKeys = Array.isArray(skill?.supportedFrameworkKeys)
          ? skill.supportedFrameworkKeys.map(normalizeFrameworkKey).filter(Boolean)
          : []
        return !skillFrameworkKeys.some((frameworkKey) => supportedFrameworkKeySet.has(frameworkKey))
      })

      if (incompatibleSkillId) {
        errors.defaultSkillIds = `Skill "${incompatibleSkillId}" is not compatible with the selected frameworks.`
      }
    }

    if (!errors.defaultSkillIds && status === RUNTIME_AGENT_STATUSES.ACTIVE) {
      const inactiveSkillId = assignedSkillIds.find((skillId) => {
        const skill = skillLookup.get(skillId)
        return String(skill?.status ?? '').trim().toUpperCase() !== 'ACTIVE'
      })

      if (inactiveSkillId) {
        errors.defaultSkillIds = `Skill "${inactiveSkillId}" is not ACTIVE and cannot be assigned to an ACTIVE agent.`
      }
    }
  }

  if (availableSkillRows.length > 0 && executionPlan.length > 0 && !errors.executionPlan) {
    const skillLookup = new Map(
      availableSkillRows
        .map((skill) => [normalizeAgentKey(skill?.id), skill])
        .filter(([id]) => id),
    )
    const supportedFrameworkKeySet = new Set(supportedFrameworkKeys)
    const stepSkillIds = executionPlan.map((step) => step.skillId).filter(Boolean)

    const unknownStepSkillId = stepSkillIds.find((skillId) => !skillLookup.has(skillId))
    if (unknownStepSkillId) {
      errors.executionPlan = `Unknown skill id "${unknownStepSkillId}" in execution plan.`
    }

    if (!errors.executionPlan && status === RUNTIME_AGENT_STATUSES.ACTIVE) {
      const inactiveStepSkillId = stepSkillIds.find((skillId) => {
        const skill = skillLookup.get(skillId)
        return String(skill?.status ?? '').trim().toUpperCase() !== 'ACTIVE'
      })
      if (inactiveStepSkillId) {
        errors.executionPlan = `Skill "${inactiveStepSkillId}" is not ACTIVE and cannot be used in the execution plan.`
      }
    }

    if (!errors.executionPlan && supportedFrameworkKeySet.size > 0) {
      const incompatibleStepSkillId = stepSkillIds.find((skillId) => {
        const skill = skillLookup.get(skillId)
        const skillFrameworkKeys = Array.isArray(skill?.supportedFrameworkKeys)
          ? skill.supportedFrameworkKeys.map(normalizeFrameworkKey).filter(Boolean)
          : []
        return !skillFrameworkKeys.some((frameworkKey) => supportedFrameworkKeySet.has(frameworkKey))
      })

      if (incompatibleStepSkillId) {
        errors.executionPlan = `Skill "${incompatibleStepSkillId}" is not compatible with the selected frameworks.`
      }
    }
  }

  return {
    errors,
    payload: {
      key,
      name,
      description,
      status,
      agentType,
      supportedFrameworkKeys,
      defaultSkillIds,
      primarySkillIds,
      optionalSkillIds,
      executionPlan,
      promptConfig,
      inputContract: inputContract.value ?? {},
      outputContract: outputContract.value ?? {},
      policies,
    },
  }
}
