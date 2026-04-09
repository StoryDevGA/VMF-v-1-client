export const WORKFLOW_POLICY_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
})

export const WORKFLOW_POLICY_STATUS_OPTIONS = Object.freeze([
  { value: '', label: 'All statuses' },
  { value: WORKFLOW_POLICY_STATUSES.ACTIVE, label: 'Active' },
  { value: WORKFLOW_POLICY_STATUSES.INACTIVE, label: 'Inactive' },
])

export const WORKFLOW_POLICY_FORM_STATUS_OPTIONS = Object.freeze([
  { value: WORKFLOW_POLICY_STATUSES.ACTIVE, label: 'Active' },
  { value: WORKFLOW_POLICY_STATUSES.INACTIVE, label: 'Inactive' },
])

export const WORKFLOW_POLICY_FRAMEWORK_OPTIONS = Object.freeze([
  { value: '', label: 'All frameworks' },
  { value: 'RLD', label: 'RLD' },
  { value: 'VMF', label: 'VMF' },
])

export const WORKFLOW_POLICY_PAGE_SIZE = 4

export const WORKFLOW_POLICIES_HELP_TEXT =
  'Active workflow policies bind ordered steps, agent requirements, and skill requirements. Keep them aligned with compatible framework packages and live runtime registries.'

export const INITIAL_WORKFLOW_POLICY_FORM = Object.freeze({
  key: '',
  name: '',
  description: '',
  status: WORKFLOW_POLICY_STATUSES.ACTIVE,
  frameworkKeys: 'VMF',
  orderedSteps: '',
  requiredAgentIds: '',
  requiredSkillIds: '',
  gatingRules: '',
})

export const INITIAL_WORKFLOW_POLICIES = Object.freeze([
  Object.freeze({
    id: 'policy-vmf-publish',
    key: 'vmf-publish',
    name: 'VMF Publish Policy',
    description: 'Controls the publish transition for active VMF framework packages.',
    status: WORKFLOW_POLICY_STATUSES.ACTIVE,
    frameworkKeys: Object.freeze(['VMF']),
    orderedSteps: Object.freeze(['validate', 'lock', 'publish']),
    requiredAgentIds: Object.freeze(['agent-validator']),
    requiredSkillIds: Object.freeze(['skill-snapshot']),
    gatingRules: Object.freeze(['validation-pass', 'framework-package-active']),
    updatedAt: '2026-04-08T12:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: 'policy-vmf-baseline',
    key: 'vmf-baseline',
    name: 'VMF Baseline Policy',
    description: 'Validates baseline VMF workspace progression before review and publish.',
    status: WORKFLOW_POLICY_STATUSES.ACTIVE,
    frameworkKeys: Object.freeze(['VMF']),
    orderedSteps: Object.freeze(['snapshot', 'validate', 'review']),
    requiredAgentIds: Object.freeze(['agent-validator', 'agent-governance-review']),
    requiredSkillIds: Object.freeze(['skill-snapshot', 'skill-review']),
    gatingRules: Object.freeze(['framework-package-active']),
    updatedAt: '2026-04-07T15:10:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'policy-rld-publish',
    key: 'rld-publish',
    name: 'RLD Publish Policy',
    description: 'Controls publish sequencing for RLD workflow packages and report output.',
    status: WORKFLOW_POLICY_STATUSES.ACTIVE,
    frameworkKeys: Object.freeze(['RLD']),
    orderedSteps: Object.freeze(['validate', 'synthesise', 'publish']),
    requiredAgentIds: Object.freeze(['agent-validator', 'agent-reporter']),
    requiredSkillIds: Object.freeze(['skill-snapshot', 'skill-report']),
    gatingRules: Object.freeze(['validation-pass', 'framework-package-active']),
    updatedAt: '2026-04-06T13:20:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'policy-rld-baseline',
    key: 'rld-baseline',
    name: 'RLD Baseline Policy',
    description: 'Sequences baseline RLD mapping and review activity before rollout readiness checks.',
    status: WORKFLOW_POLICY_STATUSES.ACTIVE,
    frameworkKeys: Object.freeze(['RLD']),
    orderedSteps: Object.freeze(['snapshot', 'map', 'review']),
    requiredAgentIds: Object.freeze(['agent-readiness-check']),
    requiredSkillIds: Object.freeze(['skill-snapshot', 'skill-revenue-map']),
    gatingRules: Object.freeze(['framework-package-active']),
    updatedAt: '2026-04-05T14:40:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'policy-vmf-preview',
    key: 'vmf-preview',
    name: 'VMF Preview Policy',
    description: 'Stages preview-only sequencing for draft VMF bundle validation.',
    status: WORKFLOW_POLICY_STATUSES.INACTIVE,
    frameworkKeys: Object.freeze(['VMF']),
    orderedSteps: Object.freeze(['snapshot', 'summarise']),
    requiredAgentIds: Object.freeze(['agent-summary']),
    requiredSkillIds: Object.freeze(['skill-summary']),
    gatingRules: Object.freeze(['framework-package-active']),
    updatedAt: '2026-04-04T10:05:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'policy-rld-go-to-market',
    key: 'rld-go-to-market',
    name: 'RLD Go To Market Policy',
    description: 'Coordinates go-to-market review sequencing for staged RLD rollout planning.',
    status: WORKFLOW_POLICY_STATUSES.INACTIVE,
    frameworkKeys: Object.freeze(['RLD']),
    orderedSteps: Object.freeze(['map', 'summarise', 'review']),
    requiredAgentIds: Object.freeze(['agent-readiness-check', 'agent-summary']),
    requiredSkillIds: Object.freeze(['skill-go-to-market', 'skill-summary']),
    gatingRules: Object.freeze(['framework-package-active']),
    updatedAt: '2026-04-03T09:20:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
])

const KEY_TOKEN_PATTERN = /^[a-z][a-z0-9-]*$/i
export const DEFAULT_SUPPORTED_FRAMEWORK_KEYS = Object.freeze(['VMF', 'RLD'])

export function cloneWorkflowPolicy(policy) {
  return {
    ...policy,
    frameworkKeys: [...(policy.frameworkKeys ?? [])],
    orderedSteps: [...(policy.orderedSteps ?? [])],
    requiredAgentIds: [...(policy.requiredAgentIds ?? [])],
    requiredSkillIds: [...(policy.requiredSkillIds ?? [])],
    gatingRules: [...(policy.gatingRules ?? [])],
    updatedBy: {
      ...policy.updatedBy,
    },
  }
}

export function getWorkflowPolicyStatusVariant(status) {
  if (status === WORKFLOW_POLICY_STATUSES.ACTIVE) return 'success'
  return 'neutral'
}

export function formatWorkflowPolicyStatus(status) {
  return String(status ?? '')
    .toLowerCase()
    .replace(/^\w/, (character) => character.toUpperCase())
}

export function normalizePolicyKey(value) {
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

export function parseKeyList(value, normalize = normalizePolicyKey) {
  return [...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map(normalize)
      .filter(Boolean),
  )]
}

export function formatKeyList(items) {
  return Array.isArray(items) ? items.join('\n') : ''
}

export function mapWorkflowPolicyToForm(policy) {
  return {
    key: policy.key ?? '',
    name: policy.name ?? '',
    description: policy.description ?? '',
    status: policy.status ?? WORKFLOW_POLICY_STATUSES.ACTIVE,
    frameworkKeys: formatKeyList(policy.frameworkKeys),
    orderedSteps: formatKeyList(policy.orderedSteps),
    requiredAgentIds: formatKeyList(policy.requiredAgentIds),
    requiredSkillIds: formatKeyList(policy.requiredSkillIds),
    gatingRules: formatKeyList(policy.gatingRules),
  }
}

export function validateWorkflowPolicyForm(
  formState,
  existingPolicies = [],
  selectedPolicyId = '',
  supportedFrameworkKeys = DEFAULT_SUPPORTED_FRAMEWORK_KEYS,
) {
  const errors = {}
  const key = normalizePolicyKey(formState.key)
  const name = String(formState.name ?? '').trim()
  const description = String(formState.description ?? '').trim()
  const status = String(formState.status ?? '').trim() || WORKFLOW_POLICY_STATUSES.ACTIVE
  const frameworkKeys = parseKeyList(formState.frameworkKeys, normalizeFrameworkKey)
  const orderedSteps = parseKeyList(formState.orderedSteps)
  const requiredAgentIds = parseKeyList(formState.requiredAgentIds)
  const requiredSkillIds = parseKeyList(formState.requiredSkillIds)
  const gatingRules = parseKeyList(formState.gatingRules)

  if (!KEY_TOKEN_PATTERN.test(key)) {
    errors.key = 'Workflow policy key is required and must use letters, numbers, or hyphens.'
  }

  if (!name) {
    errors.name = 'Workflow policy name is required.'
  } else if (name.length > 120) {
    errors.name = 'Workflow policy name must be 120 characters or fewer.'
  }

  if (description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.'
  }

  if (frameworkKeys.length === 0) {
    errors.frameworkKeys = 'At least one framework key is required.'
  }

  const supportedFrameworkKeySet = new Set(supportedFrameworkKeys)
  const invalidFrameworkKey = frameworkKeys.find((value) => !supportedFrameworkKeySet.has(value))
  if (invalidFrameworkKey) {
    errors.frameworkKeys = `Unsupported framework key "${invalidFrameworkKey}".`
  }

  if (orderedSteps.length === 0) {
    errors.orderedSteps = 'At least one ordered step is required.'
  }

  if (requiredAgentIds.length === 0) {
    errors.requiredAgentIds = 'At least one required agent id is required.'
  }

  if (requiredSkillIds.length === 0) {
    errors.requiredSkillIds = 'At least one required skill id is required.'
  }

  const invalidStep = orderedSteps.find((value) => !KEY_TOKEN_PATTERN.test(value))
  if (invalidStep) {
    errors.orderedSteps = `Invalid workflow step "${invalidStep}". Use letters, numbers, or hyphens.`
  }

  const invalidAgentId = requiredAgentIds.find((value) => !KEY_TOKEN_PATTERN.test(value))
  if (invalidAgentId) {
    errors.requiredAgentIds = `Invalid agent id "${invalidAgentId}". Use letters, numbers, or hyphens.`
  }

  const invalidSkillId = requiredSkillIds.find((value) => !KEY_TOKEN_PATTERN.test(value))
  if (invalidSkillId) {
    errors.requiredSkillIds = `Invalid skill id "${invalidSkillId}". Use letters, numbers, or hyphens.`
  }

  const invalidRule = gatingRules.find((value) => !KEY_TOKEN_PATTERN.test(value))
  if (invalidRule) {
    errors.gatingRules = `Invalid gating rule "${invalidRule}". Use letters, numbers, or hyphens.`
  }

  const duplicateKey = existingPolicies.find(
    (policy) => policy.id !== selectedPolicyId && normalizePolicyKey(policy.key) === key,
  )
  if (duplicateKey) {
    errors.key = 'Workflow policy key must be unique.'
  }

  return {
    errors,
    payload: {
      key,
      name,
      description,
      status,
      frameworkKeys,
      orderedSteps,
      requiredAgentIds,
      requiredSkillIds,
      gatingRules,
    },
  }
}
