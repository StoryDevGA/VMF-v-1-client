export const RUNTIME_AGENT_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
})

export const RUNTIME_AGENT_STATUS_OPTIONS = Object.freeze([
  { value: '', label: 'All statuses' },
  { value: RUNTIME_AGENT_STATUSES.ACTIVE, label: 'Active' },
  { value: RUNTIME_AGENT_STATUSES.INACTIVE, label: 'Inactive' },
])

export const RUNTIME_AGENT_FORM_STATUS_OPTIONS = Object.freeze([
  { value: RUNTIME_AGENT_STATUSES.ACTIVE, label: 'Active' },
  { value: RUNTIME_AGENT_STATUSES.INACTIVE, label: 'Inactive' },
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
  supportedFrameworkKeys: 'VMF\nRLD',
  defaultSkillIds: '',
})

export const INITIAL_RUNTIME_AGENTS = Object.freeze([
  Object.freeze({
    id: 'agent-validator',
    key: 'validator',
    name: 'Validator',
    description: 'Runs baseline validation rules for compatible frameworks before policy transitions.',
    status: RUNTIME_AGENT_STATUSES.ACTIVE,
    supportedFrameworkKeys: Object.freeze(['VMF', 'RLD']),
    defaultSkillIds: Object.freeze(['skill-snapshot']),
    updatedAt: '2026-04-08T12:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: 'agent-summary',
    key: 'summary',
    name: 'Summary Composer',
    description: 'Produces cross-framework runtime summaries for downstream review surfaces.',
    status: RUNTIME_AGENT_STATUSES.ACTIVE,
    supportedFrameworkKeys: Object.freeze(['VMF', 'RLD']),
    defaultSkillIds: Object.freeze(['skill-summary']),
    updatedAt: '2026-04-07T15:30:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'agent-governance-review',
    key: 'governance-review',
    name: 'Governance Review',
    description: 'Checks governance guardrails before approval transitions on VMF runtime bundles.',
    status: RUNTIME_AGENT_STATUSES.ACTIVE,
    supportedFrameworkKeys: Object.freeze(['VMF']),
    defaultSkillIds: Object.freeze(['skill-review']),
    updatedAt: '2026-04-07T11:20:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'agent-readiness-check',
    key: 'readiness-check',
    name: 'Readiness Check',
    description: 'Evaluates RLD readiness milestones before activation or publish steps.',
    status: RUNTIME_AGENT_STATUSES.ACTIVE,
    supportedFrameworkKeys: Object.freeze(['RLD']),
    defaultSkillIds: Object.freeze(['skill-snapshot']),
    updatedAt: '2026-04-06T14:15:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'agent-reporter',
    key: 'reporter',
    name: 'Report Publisher',
    description: 'Builds report-ready output packages when a compatible framework requests a published artifact.',
    status: RUNTIME_AGENT_STATUSES.INACTIVE,
    supportedFrameworkKeys: Object.freeze(['VMF', 'RLD']),
    defaultSkillIds: Object.freeze(['skill-summary', 'skill-report']),
    updatedAt: '2026-04-05T10:05:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'agent-baseline-sync',
    key: 'baseline-sync',
    name: 'Baseline Sync',
    description: 'Synchronises baseline runtime state during staged rollout validation.',
    status: RUNTIME_AGENT_STATUSES.INACTIVE,
    supportedFrameworkKeys: Object.freeze(['VMF']),
    defaultSkillIds: Object.freeze(['skill-snapshot']),
    updatedAt: '2026-04-04T09:40:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
])

const KEY_TOKEN_PATTERN = /^[a-z][a-z0-9-]*$/i
const SUPPORTED_FRAMEWORK_KEYS = new Set(['VMF', 'RLD'])

export function cloneRuntimeAgent(agent) {
  return {
    ...agent,
    supportedFrameworkKeys: [...(agent.supportedFrameworkKeys ?? [])],
    defaultSkillIds: [...(agent.defaultSkillIds ?? [])],
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
  return {
    key: agent.key ?? '',
    name: agent.name ?? '',
    description: agent.description ?? '',
    status: agent.status ?? RUNTIME_AGENT_STATUSES.ACTIVE,
    supportedFrameworkKeys: formatKeyList(agent.supportedFrameworkKeys),
    defaultSkillIds: formatKeyList(agent.defaultSkillIds),
  }
}

export function validateRuntimeAgentForm(formState, existingAgents = [], selectedAgentId = '') {
  const errors = {}
  const key = normalizeAgentKey(formState.key)
  const name = String(formState.name ?? '').trim()
  const description = String(formState.description ?? '').trim()
  const status = String(formState.status ?? '').trim() || RUNTIME_AGENT_STATUSES.ACTIVE
  const supportedFrameworkKeys = parseFrameworkKeyList(formState.supportedFrameworkKeys)
  const defaultSkillIds = parseKeyList(formState.defaultSkillIds)

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

  if (supportedFrameworkKeys.length === 0) {
    errors.supportedFrameworkKeys = 'At least one supported framework key is required.'
  }

  const invalidFrameworkKey = supportedFrameworkKeys.find(
    (value) => !SUPPORTED_FRAMEWORK_KEYS.has(value),
  )
  if (invalidFrameworkKey) {
    errors.supportedFrameworkKeys = `Unsupported framework key "${invalidFrameworkKey}".`
  }

  const invalidSkillId = defaultSkillIds.find((value) => !KEY_TOKEN_PATTERN.test(value))
  if (invalidSkillId) {
    errors.defaultSkillIds = `Invalid skill id "${invalidSkillId}". Use letters, numbers, or hyphens.`
  }

  const duplicateKey = existingAgents.find(
    (agent) => agent.id !== selectedAgentId && normalizeAgentKey(agent.key) === key,
  )
  if (duplicateKey) {
    errors.key = 'Agent key must be unique.'
  }

  return {
    errors,
    payload: {
      key,
      name,
      description,
      status,
      supportedFrameworkKeys,
      defaultSkillIds,
    },
  }
}
