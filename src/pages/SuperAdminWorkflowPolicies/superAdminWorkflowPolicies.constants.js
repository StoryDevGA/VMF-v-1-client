export const WORKFLOW_POLICY_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DEPRECATED: 'DEPRECATED',
})

export const WORKFLOW_POLICY_TYPES = Object.freeze({
  VALIDATION: 'VALIDATION',
  LIFECYCLE_GATE: 'LIFECYCLE_GATE',
  ROUTING: 'ROUTING',
  AUTOMATION: 'AUTOMATION',
  APPROVAL: 'APPROVAL',
  ESCALATION: 'ESCALATION',
  NOTIFICATION: 'NOTIFICATION',
  COMPOSITE: 'COMPOSITE',
})

export const WORKFLOW_POLICY_APPLIES_TO = Object.freeze({
  FRAMEWORK_LIFECYCLE: 'FRAMEWORK_LIFECYCLE',
  WORKSPACE_ACTION: 'WORKSPACE_ACTION',
  SYSTEM_EVENT: 'SYSTEM_EVENT',
  AGENT_OUTCOME: 'AGENT_OUTCOME',
  SCHEDULED_CHECK: 'SCHEDULED_CHECK',
  MANUAL_INVOCATION: 'MANUAL_INVOCATION',
})

export const WORKFLOW_POLICY_TRIGGER_EVENTS = Object.freeze({
  ON_SAVE_DRAFT: 'ON_SAVE_DRAFT',
  ON_SUBMIT: 'ON_SUBMIT',
  ON_APPROVE: 'ON_APPROVE',
  ON_PUBLISH: 'ON_PUBLISH',
  ON_STAGE_CHANGE: 'ON_STAGE_CHANGE',
  ON_PACKAGE_BUILD: 'ON_PACKAGE_BUILD',
  ON_AGENT_COMPLETE: 'ON_AGENT_COMPLETE',
  ON_SCHEDULED_SCAN: 'ON_SCHEDULED_SCAN',
  MANUAL_RUN: 'MANUAL_RUN',
})

export const WORKFLOW_POLICY_TRIGGER_MODES = Object.freeze({
  PRE_ACTION: 'PRE_ACTION',
  POST_ACTION: 'POST_ACTION',
  CONTINUOUS: 'CONTINUOUS',
  SINGLE_FIRE: 'SINGLE_FIRE',
  RECURRING: 'RECURRING',
})

export const WORKFLOW_POLICY_ACTOR_SCOPES = Object.freeze({
  ANY: 'ANY',
  USER: 'USER',
  SYSTEM: 'SYSTEM',
  AGENT: 'AGENT',
  ADMINISTRATOR: 'ADMINISTRATOR',
})

export const WORKFLOW_POLICY_GOVERNED_ACTIONS = Object.freeze({
  SAVE_DRAFT: 'SAVE_DRAFT',
  SUBMIT_FOR_REVIEW: 'SUBMIT_FOR_REVIEW',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  PUBLISH: 'PUBLISH',
  GENERATE_ARTEFACT: 'GENERATE_ARTEFACT',
  RUN_ANALYSIS: 'RUN_ANALYSIS',
  LOCK_RECORD: 'LOCK_RECORD',
  UNLOCK_RECORD: 'UNLOCK_RECORD',
  ARCHIVE: 'ARCHIVE',
})

export const WORKFLOW_POLICY_DECISION_MODES = Object.freeze({
  ALLOW: 'ALLOW',
  DENY: 'DENY',
  WARN_ONLY: 'WARN_ONLY',
  REQUIRE_AGENT_EVALUATION: 'REQUIRE_AGENT_EVALUATION',
  REQUIRE_APPROVAL: 'REQUIRE_APPROVAL',
  CONDITIONAL: 'CONDITIONAL',
})

export const WORKFLOW_POLICY_SEVERITIES = Object.freeze({
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  BLOCKING: 'BLOCKING',
})

export const WORKFLOW_POLICY_CONDITION_OPERATORS = Object.freeze({
  EQUALS: '=',
  NOT_EQUALS: '!=',
  CONTAINS: 'contains',
  EXISTS: 'exists',
  NOT_EXISTS: 'not exists',
  GREATER_THAN: '>',
  LESS_THAN: '<',
  GREATER_THAN_OR_EQUAL: '>=',
  LESS_THAN_OR_EQUAL: '<=',
  IN: 'in',
  NOT_IN: 'not in',
})

export const WORKFLOW_POLICY_CONDITION_LOGIC = Object.freeze({
  AND: 'AND',
  OR: 'OR',
})

export const WORKFLOW_POLICY_ROUTING_MODES = Object.freeze({
  FIXED_AGENT: 'FIXED_AGENT',
  FIRST_COMPATIBLE_ACTIVE_AGENT: 'FIRST_COMPATIBLE_ACTIVE_AGENT',
  BY_FRAMEWORK: 'BY_FRAMEWORK',
  BY_PRIORITY: 'BY_PRIORITY',
  MANUAL_SELECTION: 'MANUAL_SELECTION',
})

export const WORKFLOW_POLICY_EFFECT_TYPES = Object.freeze({
  SET_VALUE: 'SET_VALUE',
  APPEND_AUDIT_ENTRY: 'APPEND_AUDIT_ENTRY',
  INCREMENT_COUNTER: 'INCREMENT_COUNTER',
  CLEAR_FIELD: 'CLEAR_FIELD',
  TRIGGER_POLICY_GROUP: 'TRIGGER_POLICY_GROUP',
  QUEUE_NOTIFICATION: 'QUEUE_NOTIFICATION',
  BLOCK_ACTION: 'BLOCK_ACTION',
})

export const WORKFLOW_POLICY_OVERRIDE_ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  FRAMEWORK_OWNER: 'FRAMEWORK_OWNER',
  GOVERNANCE_LEAD: 'GOVERNANCE_LEAD',
  OPERATIONS_ADMIN: 'OPERATIONS_ADMIN',
})

export const WORKFLOW_POLICY_STATUS_OPTIONS = Object.freeze([
  { value: '', label: 'All statuses' },
  { value: WORKFLOW_POLICY_STATUSES.DRAFT, label: 'Draft' },
  { value: WORKFLOW_POLICY_STATUSES.ACTIVE, label: 'Active' },
  { value: WORKFLOW_POLICY_STATUSES.INACTIVE, label: 'Inactive' },
  { value: WORKFLOW_POLICY_STATUSES.DEPRECATED, label: 'Deprecated' },
])

export const WORKFLOW_POLICY_FORM_STATUS_OPTIONS = Object.freeze([
  { value: WORKFLOW_POLICY_STATUSES.DRAFT, label: 'Draft' },
  { value: WORKFLOW_POLICY_STATUSES.ACTIVE, label: 'Active' },
  { value: WORKFLOW_POLICY_STATUSES.INACTIVE, label: 'Inactive' },
  { value: WORKFLOW_POLICY_STATUSES.DEPRECATED, label: 'Deprecated' },
])

const toLabel = (value) =>
  String(value ?? '')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const toOptions = (values, { includeAllLabel = '' } = {}) => [
  ...(includeAllLabel ? [{ value: '', label: includeAllLabel }] : []),
  ...Object.values(values).map((value) => ({ value, label: toLabel(value) })),
]

export const WORKFLOW_POLICY_TYPE_OPTIONS = Object.freeze(
  toOptions(WORKFLOW_POLICY_TYPES, { includeAllLabel: 'All policy types' }),
)

export const WORKFLOW_POLICY_FORM_TYPE_OPTIONS = Object.freeze(
  toOptions(WORKFLOW_POLICY_TYPES),
)

export const WORKFLOW_POLICY_APPLIES_TO_OPTIONS = Object.freeze(
  toOptions(WORKFLOW_POLICY_APPLIES_TO),
)

export const WORKFLOW_POLICY_TRIGGER_EVENT_OPTIONS = Object.freeze(
  toOptions(WORKFLOW_POLICY_TRIGGER_EVENTS),
)

export const WORKFLOW_POLICY_TRIGGER_MODE_OPTIONS = Object.freeze(
  toOptions(WORKFLOW_POLICY_TRIGGER_MODES),
)

export const WORKFLOW_POLICY_ACTOR_SCOPE_OPTIONS = Object.freeze(
  toOptions(WORKFLOW_POLICY_ACTOR_SCOPES),
)

export const WORKFLOW_POLICY_GOVERNED_ACTION_OPTIONS = Object.freeze(
  toOptions(WORKFLOW_POLICY_GOVERNED_ACTIONS),
)

export const WORKFLOW_POLICY_DECISION_MODE_OPTIONS = Object.freeze(
  toOptions(WORKFLOW_POLICY_DECISION_MODES),
)

export const WORKFLOW_POLICY_SEVERITY_OPTIONS = Object.freeze(
  toOptions(WORKFLOW_POLICY_SEVERITIES),
)

export const WORKFLOW_POLICY_CONDITION_OPERATOR_OPTIONS = Object.freeze(
  Object.values(WORKFLOW_POLICY_CONDITION_OPERATORS).map((value) => ({ value, label: toLabel(value) })),
)

export const WORKFLOW_POLICY_CONDITION_LOGIC_OPTIONS = Object.freeze(
  Object.values(WORKFLOW_POLICY_CONDITION_LOGIC).map((value) => ({ value, label: value })),
)

export const WORKFLOW_POLICY_ROUTING_MODE_OPTIONS = Object.freeze(
  toOptions(WORKFLOW_POLICY_ROUTING_MODES),
)

export const WORKFLOW_POLICY_EFFECT_TYPE_OPTIONS = Object.freeze(
  toOptions(WORKFLOW_POLICY_EFFECT_TYPES),
)

export const WORKFLOW_POLICY_OVERRIDE_ROLE_OPTIONS = Object.freeze(
  toOptions(WORKFLOW_POLICY_OVERRIDE_ROLES),
)

export const WORKFLOW_POLICY_ESCALATE_TO_OPTIONS = Object.freeze(
  toOptions(WORKFLOW_POLICY_OVERRIDE_ROLES),
)

export const WORKFLOW_POLICY_PAGE_SIZE = 4

export const WORKFLOW_POLICY_EDITOR_TABS = Object.freeze([
  { key: 'frameworks', label: 'Framework Compatibility' },
  { key: 'scope', label: 'Scope & Trigger' },
  { key: 'conditions', label: 'Framework State Conditions' },
  { key: 'validation', label: 'Validation Requirements' },
  { key: 'action', label: 'Action Governance' },
  { key: 'routing', label: 'Agent Routing' },
  { key: 'outcomes', label: 'Outcome & State Effects' },
  { key: 'escalation', label: 'Escalation & Overrides' },
  { key: 'dependencies', label: 'Dependencies' },
  { key: 'audit', label: 'Audit & Versioning' },
  { key: 'json', label: 'JSON / Diff' },
  { key: 'test', label: 'Test Console' },
])

export const WORKFLOW_POLICIES_HELP_TEXT =
  'Govern runtime decisions, lifecycle gates, routing logic, and controlled runtime actions.'

export const INITIAL_WORKFLOW_POLICY_FORM = Object.freeze({
  key: '',
  name: '',
  description: '',
  status: WORKFLOW_POLICY_STATUSES.DRAFT,
  policyType: WORKFLOW_POLICY_TYPES.VALIDATION,
  priority: '100',
  frameworkKeys: [],
  appliesTo: WORKFLOW_POLICY_APPLIES_TO.FRAMEWORK_LIFECYCLE,
  triggerEvent: '',
  triggerMode: WORKFLOW_POLICY_TRIGGER_MODES.PRE_ACTION,
  actorScope: WORKFLOW_POLICY_ACTOR_SCOPES.ANY,
  cooldownSeconds: '0',
  reevaluateOnRetry: false,
  governedAction: '',
  decisionMode: WORKFLOW_POLICY_DECISION_MODES.ALLOW,
  passMessage: '',
  failMessage: '',
  severity: WORKFLOW_POLICY_SEVERITIES.INFO,
  conditions: [],
  routingMode: '',
  primaryAgentId: '',
  fallbackAgentId: '',
  timeoutMs: '0',
  retryOverride: '',
  requireSuccess: false,
  requiredValidationKeys: [],
  validationBlockingOnFail: true,
  validationWarningOnly: false,
  validationFreshnessMinutes: '30',
  validationRequireLatestRun: true,
  onPassEffects: [],
  onFailEffects: [],
  overrideAllowed: false,
  overrideRoles: [],
  approvalRequired: false,
  escalateTo: '',
  escalationMessage: '',
  slaMinutes: '0',
  version: '1',
  lastActivatedAt: '',
  orderedSteps: [],
  requiredAgentIds: [],
  requiredSkillIds: [],
})

export const INITIAL_WORKFLOW_POLICIES = Object.freeze([
  Object.freeze({
    id: 'policy-vmf-publish',
    key: 'vmf-publish',
    name: 'VMF Publish Policy',
    description: 'Controls publish sequencing for active VMF packages.',
    status: WORKFLOW_POLICY_STATUSES.ACTIVE,
    policyType: WORKFLOW_POLICY_TYPES.LIFECYCLE_GATE,
    priority: 100,
    frameworkKeys: Object.freeze(['VMF']),
    appliesTo: WORKFLOW_POLICY_APPLIES_TO.FRAMEWORK_LIFECYCLE,
    triggerEvent: WORKFLOW_POLICY_TRIGGER_EVENTS.ON_PUBLISH,
    triggerMode: WORKFLOW_POLICY_TRIGGER_MODES.PRE_ACTION,
    actorScope: WORKFLOW_POLICY_ACTOR_SCOPES.ADMINISTRATOR,
    cooldownSeconds: 0,
    reevaluateOnRetry: false,
    governedAction: WORKFLOW_POLICY_GOVERNED_ACTIONS.PUBLISH,
    decisionMode: WORKFLOW_POLICY_DECISION_MODES.REQUIRE_APPROVAL,
    passMessage: 'Publish can continue.',
    failMessage: 'Publish is blocked until governance checks pass.',
    severity: WORKFLOW_POLICY_SEVERITIES.BLOCKING,
    overrideAllowed: true,
    overrideRoles: Object.freeze([
      WORKFLOW_POLICY_OVERRIDE_ROLES.SUPER_ADMIN,
      WORKFLOW_POLICY_OVERRIDE_ROLES.FRAMEWORK_OWNER,
    ]),
    approvalRequired: true,
    escalateTo: WORKFLOW_POLICY_OVERRIDE_ROLES.GOVERNANCE_LEAD,
    escalationMessage: 'Escalate blocked publish overrides to governance before release sign-off.',
    slaMinutes: 60,
    onPassEffects: Object.freeze([
      Object.freeze({
        type: WORKFLOW_POLICY_EFFECT_TYPES.SET_VALUE,
        targetPath: 'vmf.metadata.lastValidatedAt',
        value: 'REVIEW_READY',
      }),
    ]),
    onFailEffects: Object.freeze([
      Object.freeze({
        type: WORKFLOW_POLICY_EFFECT_TYPES.BLOCK_ACTION,
        targetPath: '',
        value: 'Validation must pass before publish can continue.',
      }),
    ]),
    version: 3,
    lastActivatedAt: '2026-04-08T12:00:00.000Z',
    orderedSteps: Object.freeze(['validate', 'lock', 'publish']),
    requiredAgentIds: Object.freeze(['agent-validator']),
    requiredSkillIds: Object.freeze(['skill-snapshot']),
    gatingRules: Object.freeze(['validation-pass', 'framework-package-active']),
    updatedAt: '2026-04-08T12:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: 'policy-vmf-review',
    key: 'vmf-review',
    name: 'VMF Review Gate',
    description: 'Applies review-time governance before approval.',
    status: WORKFLOW_POLICY_STATUSES.ACTIVE,
    policyType: WORKFLOW_POLICY_TYPES.VALIDATION,
    priority: 80,
    frameworkKeys: Object.freeze(['VMF']),
    appliesTo: WORKFLOW_POLICY_APPLIES_TO.WORKSPACE_ACTION,
    triggerEvent: WORKFLOW_POLICY_TRIGGER_EVENTS.ON_SUBMIT,
    triggerMode: WORKFLOW_POLICY_TRIGGER_MODES.PRE_ACTION,
    actorScope: WORKFLOW_POLICY_ACTOR_SCOPES.USER,
    cooldownSeconds: 0,
    reevaluateOnRetry: true,
    governedAction: WORKFLOW_POLICY_GOVERNED_ACTIONS.SUBMIT_FOR_REVIEW,
    decisionMode: WORKFLOW_POLICY_DECISION_MODES.REQUIRE_AGENT_EVALUATION,
    passMessage: 'Review submission can continue.',
    failMessage: 'Review submission requires additional validation.',
    severity: WORKFLOW_POLICY_SEVERITIES.WARNING,
    overrideAllowed: true,
    overrideRoles: Object.freeze([
      WORKFLOW_POLICY_OVERRIDE_ROLES.SUPER_ADMIN,
    ]),
    approvalRequired: false,
    escalateTo: '',
    escalationMessage: '',
    slaMinutes: 0,
    conditions: Object.freeze([
      Object.freeze({
        path: 'vmf.status',
        operator: '=',
        value: 'DRAFT',
        logic: WORKFLOW_POLICY_CONDITION_LOGIC.AND,
      }),
    ]),
    routingMode: WORKFLOW_POLICY_ROUTING_MODES.FIXED_AGENT,
    primaryAgentId: 'agent-validator',
    fallbackAgentId: '',
    timeoutMs: 45000,
    retryOverride: 'retry-once',
    requireSuccess: true,
    requiredValidationKeys: Object.freeze(['required-sections-check']),
    validationBlockingOnFail: true,
    validationWarningOnly: false,
    validationFreshnessMinutes: 30,
    validationRequireLatestRun: true,
    onPassEffects: Object.freeze([
      Object.freeze({
        type: WORKFLOW_POLICY_EFFECT_TYPES.SET_VALUE,
        targetPath: 'vmf.metadata.lastValidatedAt',
        value: 'PASS',
      }),
    ]),
    onFailEffects: Object.freeze([
      Object.freeze({
        type: WORKFLOW_POLICY_EFFECT_TYPES.QUEUE_NOTIFICATION,
        targetPath: '',
        value: 'Notify governance reviewers.',
      }),
    ]),
    version: 4,
    lastActivatedAt: '2026-04-07T15:10:00.000Z',
    orderedSteps: Object.freeze(['snapshot', 'review']),
    requiredAgentIds: Object.freeze(['agent-validator']),
    requiredSkillIds: Object.freeze(['skill-snapshot', 'skill-review']),
    gatingRules: Object.freeze(['framework-package-active']),
    updatedAt: '2026-04-07T15:10:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'policy-rld-automation',
    key: 'rld-automation',
    name: 'RLD Automation Policy',
    description: 'Automates post-build checks for active RLD packages.',
    status: WORKFLOW_POLICY_STATUSES.ACTIVE,
    policyType: WORKFLOW_POLICY_TYPES.AUTOMATION,
    priority: 120,
    frameworkKeys: Object.freeze(['RLD']),
    appliesTo: WORKFLOW_POLICY_APPLIES_TO.SYSTEM_EVENT,
    triggerEvent: WORKFLOW_POLICY_TRIGGER_EVENTS.ON_PACKAGE_BUILD,
    triggerMode: WORKFLOW_POLICY_TRIGGER_MODES.POST_ACTION,
    actorScope: WORKFLOW_POLICY_ACTOR_SCOPES.SYSTEM,
    cooldownSeconds: 300,
    reevaluateOnRetry: true,
    governedAction: WORKFLOW_POLICY_GOVERNED_ACTIONS.RUN_ANALYSIS,
    decisionMode: WORKFLOW_POLICY_DECISION_MODES.ALLOW,
    passMessage: 'Automation checks completed.',
    failMessage: 'Automation checks require follow-up.',
    severity: WORKFLOW_POLICY_SEVERITIES.INFO,
    overrideAllowed: false,
    overrideRoles: Object.freeze([]),
    approvalRequired: false,
    escalateTo: '',
    escalationMessage: '',
    slaMinutes: 0,
    orderedSteps: Object.freeze(['validate', 'synthesise']),
    requiredAgentIds: Object.freeze(['agent-reporter']),
    requiredSkillIds: Object.freeze(['skill-report']),
    gatingRules: Object.freeze(['framework-package-active']),
    updatedAt: '2026-04-06T13:20:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'policy-rld-routing',
    key: 'rld-routing',
    name: 'RLD Routing Draft',
    description: 'Draft routing policy for RLD approval orchestration.',
    status: WORKFLOW_POLICY_STATUSES.DRAFT,
    policyType: WORKFLOW_POLICY_TYPES.ROUTING,
    priority: 150,
    frameworkKeys: Object.freeze(['RLD']),
    appliesTo: WORKFLOW_POLICY_APPLIES_TO.AGENT_OUTCOME,
    triggerEvent: WORKFLOW_POLICY_TRIGGER_EVENTS.ON_AGENT_COMPLETE,
    triggerMode: WORKFLOW_POLICY_TRIGGER_MODES.SINGLE_FIRE,
    actorScope: WORKFLOW_POLICY_ACTOR_SCOPES.AGENT,
    cooldownSeconds: 0,
    reevaluateOnRetry: false,
    governedAction: WORKFLOW_POLICY_GOVERNED_ACTIONS.APPROVE,
    decisionMode: WORKFLOW_POLICY_DECISION_MODES.CONDITIONAL,
    passMessage: 'Routing may proceed.',
    failMessage: 'Routing conditions are incomplete.',
    severity: WORKFLOW_POLICY_SEVERITIES.WARNING,
    overrideAllowed: false,
    overrideRoles: Object.freeze([]),
    approvalRequired: false,
    escalateTo: '',
    escalationMessage: '',
    slaMinutes: 0,
    orderedSteps: Object.freeze([]),
    requiredAgentIds: Object.freeze([]),
    requiredSkillIds: Object.freeze([]),
    gatingRules: Object.freeze([]),
    updatedAt: '2026-04-05T14:40:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'policy-vmf-preview',
    key: 'vmf-preview',
    name: 'VMF Preview Policy',
    description: 'Inactive preview-only sequencing for draft VMF bundles.',
    status: WORKFLOW_POLICY_STATUSES.INACTIVE,
    policyType: WORKFLOW_POLICY_TYPES.NOTIFICATION,
    priority: 220,
    frameworkKeys: Object.freeze(['VMF']),
    appliesTo: WORKFLOW_POLICY_APPLIES_TO.MANUAL_INVOCATION,
    triggerEvent: WORKFLOW_POLICY_TRIGGER_EVENTS.MANUAL_RUN,
    triggerMode: WORKFLOW_POLICY_TRIGGER_MODES.SINGLE_FIRE,
    actorScope: WORKFLOW_POLICY_ACTOR_SCOPES.ADMINISTRATOR,
    cooldownSeconds: 0,
    reevaluateOnRetry: false,
    governedAction: WORKFLOW_POLICY_GOVERNED_ACTIONS.SAVE_DRAFT,
    decisionMode: WORKFLOW_POLICY_DECISION_MODES.WARN_ONLY,
    passMessage: 'Preview can continue.',
    failMessage: 'Preview generated a warning.',
    severity: WORKFLOW_POLICY_SEVERITIES.INFO,
    overrideAllowed: false,
    overrideRoles: Object.freeze([]),
    approvalRequired: false,
    escalateTo: '',
    escalationMessage: '',
    slaMinutes: 0,
    orderedSteps: Object.freeze(['snapshot', 'summarise']),
    requiredAgentIds: Object.freeze(['agent-summary']),
    requiredSkillIds: Object.freeze(['skill-summary']),
    gatingRules: Object.freeze(['framework-package-active']),
    updatedAt: '2026-04-04T10:05:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'policy-vmf-legacy',
    key: 'vmf-legacy',
    name: 'VMF Legacy Policy',
    description: 'Deprecated policy retained for historical continuity.',
    status: WORKFLOW_POLICY_STATUSES.DEPRECATED,
    policyType: WORKFLOW_POLICY_TYPES.COMPOSITE,
    priority: 300,
    frameworkKeys: Object.freeze(['VMF']),
    appliesTo: WORKFLOW_POLICY_APPLIES_TO.FRAMEWORK_LIFECYCLE,
    triggerEvent: WORKFLOW_POLICY_TRIGGER_EVENTS.ON_STAGE_CHANGE,
    triggerMode: WORKFLOW_POLICY_TRIGGER_MODES.POST_ACTION,
    actorScope: WORKFLOW_POLICY_ACTOR_SCOPES.SYSTEM,
    cooldownSeconds: 60,
    reevaluateOnRetry: false,
    governedAction: WORKFLOW_POLICY_GOVERNED_ACTIONS.ARCHIVE,
    decisionMode: WORKFLOW_POLICY_DECISION_MODES.DENY,
    passMessage: '',
    failMessage: 'Legacy policy is deprecated.',
    severity: WORKFLOW_POLICY_SEVERITIES.CRITICAL,
    overrideAllowed: false,
    overrideRoles: Object.freeze([]),
    approvalRequired: false,
    escalateTo: '',
    escalationMessage: '',
    slaMinutes: 0,
    orderedSteps: Object.freeze([]),
    requiredAgentIds: Object.freeze([]),
    requiredSkillIds: Object.freeze([]),
    gatingRules: Object.freeze([]),
    updatedAt: '2026-04-03T09:20:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
])

const KEY_TOKEN_PATTERN = /^[a-z][a-z0-9-]*$/i
export const DEFAULT_SUPPORTED_FRAMEWORK_KEYS = Object.freeze(['VMF', 'RLD'])
const CONDITION_OPERATORS_WITHOUT_VALUE = new Set(['exists', 'not exists'])
const ROUTING_MODES_REQUIRING_PRIMARY_AGENT = new Set([WORKFLOW_POLICY_ROUTING_MODES.FIXED_AGENT])
const EFFECT_TYPES_REQUIRING_TARGET_PATH = new Set([
  WORKFLOW_POLICY_EFFECT_TYPES.SET_VALUE,
  WORKFLOW_POLICY_EFFECT_TYPES.INCREMENT_COUNTER,
  WORKFLOW_POLICY_EFFECT_TYPES.CLEAR_FIELD,
])
const EFFECT_TYPES_REQUIRING_VALUE = new Set([
  WORKFLOW_POLICY_EFFECT_TYPES.SET_VALUE,
  WORKFLOW_POLICY_EFFECT_TYPES.APPEND_AUDIT_ENTRY,
  WORKFLOW_POLICY_EFFECT_TYPES.TRIGGER_POLICY_GROUP,
  WORKFLOW_POLICY_EFFECT_TYPES.QUEUE_NOTIFICATION,
])

const normalizeEffectType = (value) => String(value ?? '').trim().toUpperCase()

const effectRequiresTargetPath = (type) => EFFECT_TYPES_REQUIRING_TARGET_PATH.has(normalizeEffectType(type))

const effectRequiresValue = (type) => EFFECT_TYPES_REQUIRING_VALUE.has(normalizeEffectType(type))

const normalizeAgentId = (value) =>
  String(value ?? '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .toLowerCase()

const normalizeValidationKey = normalizePolicyKey

const parseConditionValue = (value, operator) => {
  const normalizedOperator = String(operator ?? '').trim().toLowerCase()
  const normalizedValue = String(value ?? '').trim()

  if (CONDITION_OPERATORS_WITHOUT_VALUE.has(normalizedOperator)) {
    return ''
  }

  if (normalizedOperator === 'in' || normalizedOperator === 'not in') {
    return [...new Set(
      normalizedValue
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    )]
  }

  if (/^(true|false)$/i.test(normalizedValue)) {
    return normalizedValue.toLowerCase() === 'true'
  }

  if (/^-?\d+(\.\d+)?$/.test(normalizedValue)) {
    return Number(normalizedValue)
  }

  return normalizedValue
}

export function cloneWorkflowPolicy(policy) {
  return {
    ...policy,
    frameworkKeys: [...(policy.frameworkKeys ?? [])],
    conditions: Array.isArray(policy.conditions)
      ? policy.conditions.map((condition) => ({
          ...condition,
          ...(Array.isArray(condition?.value) ? { value: [...condition.value] } : {}),
        }))
      : [],
    requiredValidationKeys: [...(policy.requiredValidationKeys ?? [])],
    onPassEffects: Array.isArray(policy.onPassEffects)
      ? policy.onPassEffects.map((effect) => ({
          ...effect,
          ...(Array.isArray(effect?.value) ? { value: [...effect.value] } : {}),
        }))
      : [],
    onFailEffects: Array.isArray(policy.onFailEffects)
      ? policy.onFailEffects.map((effect) => ({
          ...effect,
          ...(Array.isArray(effect?.value) ? { value: [...effect.value] } : {}),
        }))
      : [],
    overrideRoles: [...(policy.overrideRoles ?? [])],
    orderedSteps: [...(policy.orderedSteps ?? [])],
    requiredAgentIds: [...(policy.requiredAgentIds ?? [])],
    requiredSkillIds: [...(policy.requiredSkillIds ?? [])],
    updatedBy: policy.updatedBy ? { ...policy.updatedBy } : null,
  }
}

export function getWorkflowPolicyStatusVariant(status) {
  const normalized = String(status ?? '').trim().toUpperCase()
  if (normalized === WORKFLOW_POLICY_STATUSES.ACTIVE) return 'success'
  if (normalized === WORKFLOW_POLICY_STATUSES.DRAFT) return 'info'
  if (normalized === WORKFLOW_POLICY_STATUSES.DEPRECATED) return 'warning'
  return 'neutral'
}

export function formatWorkflowPolicyStatus(status) {
  return toLabel(status)
}

export function formatWorkflowPolicyType(type) {
  return toLabel(type)
}

export function formatWorkflowPolicyEnumLabel(value) {
  return toLabel(value)
}

export function formatConditionValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ')
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return String(value ?? '')
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
    status: policy.status ?? WORKFLOW_POLICY_STATUSES.DRAFT,
    policyType: policy.policyType ?? WORKFLOW_POLICY_TYPES.VALIDATION,
    priority: String(policy.priority ?? 100),
    frameworkKeys: Array.isArray(policy.frameworkKeys) ? [...policy.frameworkKeys] : [],
    appliesTo: policy.appliesTo ?? WORKFLOW_POLICY_APPLIES_TO.FRAMEWORK_LIFECYCLE,
    triggerEvent: policy.triggerEvent ?? '',
    triggerMode: policy.triggerMode ?? WORKFLOW_POLICY_TRIGGER_MODES.PRE_ACTION,
    actorScope: policy.actorScope ?? WORKFLOW_POLICY_ACTOR_SCOPES.ANY,
    cooldownSeconds: String(policy.cooldownSeconds ?? 0),
    reevaluateOnRetry: Boolean(policy.reevaluateOnRetry),
    governedAction: policy.governedAction ?? '',
    decisionMode: policy.decisionMode ?? WORKFLOW_POLICY_DECISION_MODES.ALLOW,
    passMessage: policy.passMessage ?? '',
    failMessage: policy.failMessage ?? '',
    severity: policy.severity ?? WORKFLOW_POLICY_SEVERITIES.INFO,
    conditions: Array.isArray(policy.conditions)
      ? policy.conditions.map((condition) => ({
          path: condition?.path ?? '',
          operator: condition?.operator ?? WORKFLOW_POLICY_CONDITION_OPERATORS.EQUALS,
          value: formatConditionValue(condition?.value),
          logic: condition?.logic ?? WORKFLOW_POLICY_CONDITION_LOGIC.AND,
        }))
      : [],
    routingMode: policy.routingMode ?? '',
    primaryAgentId: policy.primaryAgentId ?? '',
    fallbackAgentId: policy.fallbackAgentId ?? '',
    timeoutMs: String(policy.timeoutMs ?? 0),
    retryOverride: policy.retryOverride ?? '',
    requireSuccess: Boolean(policy.requireSuccess),
    requiredValidationKeys: Array.isArray(policy.requiredValidationKeys) ? [...policy.requiredValidationKeys] : [],
    validationBlockingOnFail: policy.validationBlockingOnFail ?? true,
    validationWarningOnly: Boolean(policy.validationWarningOnly),
    validationFreshnessMinutes: String(policy.validationFreshnessMinutes ?? 30),
    validationRequireLatestRun: policy.validationRequireLatestRun ?? true,
    onPassEffects: Array.isArray(policy.onPassEffects)
      ? policy.onPassEffects.map((effect) => ({
          type: normalizeEffectType(effect?.type),
          targetPath: effectRequiresTargetPath(effect?.type) ? effect?.targetPath ?? '' : '',
          value: effectRequiresValue(effect?.type) ? formatConditionValue(effect?.value) : '',
        }))
      : [],
    onFailEffects: Array.isArray(policy.onFailEffects)
      ? policy.onFailEffects.map((effect) => ({
          type: normalizeEffectType(effect?.type),
          targetPath: effectRequiresTargetPath(effect?.type) ? effect?.targetPath ?? '' : '',
          value: effectRequiresValue(effect?.type) ? formatConditionValue(effect?.value) : '',
        }))
      : [],
    overrideAllowed: Boolean(policy.overrideAllowed),
    overrideRoles: Array.isArray(policy.overrideRoles) ? [...policy.overrideRoles] : [],
    approvalRequired: Boolean(policy.approvalRequired),
    escalateTo: policy.escalateTo ?? '',
    escalationMessage: policy.escalationMessage ?? '',
    slaMinutes: String(policy.slaMinutes ?? 0),
    version: String(policy.version ?? 1),
    lastActivatedAt: policy.lastActivatedAt ?? '',
    orderedSteps: Array.isArray(policy.orderedSteps) ? [...policy.orderedSteps] : [],
    requiredAgentIds: Array.isArray(policy.requiredAgentIds) ? [...policy.requiredAgentIds] : [],
    requiredSkillIds: Array.isArray(policy.requiredSkillIds) ? [...policy.requiredSkillIds] : [],
  }
}

export function validateWorkflowPolicyForm(
  formState,
  existingPolicies = [],
  selectedPolicyId = '',
  supportedFrameworkKeys = DEFAULT_SUPPORTED_FRAMEWORK_KEYS,
  availableAgentRows = [],
  availableWritePathRows = [],
) {
  const errors = {}
  const key = normalizePolicyKey(formState.key)
  const name = String(formState.name ?? '').trim()
  const description = String(formState.description ?? '').trim()
  const status = String(formState.status ?? '').trim() || WORKFLOW_POLICY_STATUSES.DRAFT
  const policyType = String(formState.policyType ?? '').trim()
  const priority = Number.parseInt(String(formState.priority ?? '').trim(), 10)
  const frameworkKeys = [...new Set(
    (Array.isArray(formState.frameworkKeys) ? formState.frameworkKeys : [])
      .map(normalizeFrameworkKey)
      .filter(Boolean),
  )]
  const appliesTo = String(formState.appliesTo ?? '').trim()
  const triggerEvent = String(formState.triggerEvent ?? '').trim()
  const triggerMode = String(formState.triggerMode ?? '').trim()
  const actorScope = String(formState.actorScope ?? '').trim()
  const cooldownSeconds = Number.parseInt(String(formState.cooldownSeconds ?? '').trim(), 10)
  const reevaluateOnRetry = Boolean(formState.reevaluateOnRetry)
  const governedAction = String(formState.governedAction ?? '').trim()
  const decisionMode = String(formState.decisionMode ?? '').trim()
  const passMessage = String(formState.passMessage ?? '').trim()
  const failMessage = String(formState.failMessage ?? '').trim()
  const severity = String(formState.severity ?? '').trim()
  const conditions = Array.isArray(formState.conditions) ? formState.conditions : []
  const routingMode = String(formState.routingMode ?? '').trim()
  const primaryAgentId = normalizeAgentId(formState.primaryAgentId)
  const fallbackAgentId = normalizeAgentId(formState.fallbackAgentId)
  const timeoutMs = Number.parseInt(String(formState.timeoutMs ?? '').trim(), 10)
  const retryOverride = String(formState.retryOverride ?? '').trim()
  const requireSuccess = Boolean(formState.requireSuccess)
  const requiredValidationKeys = [...new Set(
    (Array.isArray(formState.requiredValidationKeys) ? formState.requiredValidationKeys : [])
      .map(normalizeValidationKey)
      .filter(Boolean),
  )]
  const validationBlockingOnFail = Boolean(formState.validationBlockingOnFail)
  const validationWarningOnly = Boolean(formState.validationWarningOnly)
  const validationFreshnessMinutes = Number.parseInt(String(formState.validationFreshnessMinutes ?? '').trim(), 10)
  const validationRequireLatestRun = Boolean(formState.validationRequireLatestRun)
  const onPassEffects = Array.isArray(formState.onPassEffects) ? formState.onPassEffects : []
  const onFailEffects = Array.isArray(formState.onFailEffects) ? formState.onFailEffects : []
  const overrideAllowed = Boolean(formState.overrideAllowed)
  const overrideRoles = [...new Set(
    (Array.isArray(formState.overrideRoles) ? formState.overrideRoles : [])
      .map((value) => String(value ?? '').trim().toUpperCase())
      .filter(Boolean),
  )]
  const approvalRequired = Boolean(formState.approvalRequired)
  const escalateTo = String(formState.escalateTo ?? '').trim().toUpperCase()
  const escalationMessage = String(formState.escalationMessage ?? '').trim()
  const slaMinutes = Number.parseInt(String(formState.slaMinutes ?? '').trim(), 10)
  const orderedSteps = Array.isArray(formState.orderedSteps) ? [...formState.orderedSteps] : []
  const requiredAgentIds = Array.isArray(formState.requiredAgentIds) ? [...formState.requiredAgentIds] : []
  const requiredSkillIds = Array.isArray(formState.requiredSkillIds) ? [...formState.requiredSkillIds] : []

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

  if (!policyType) {
    errors.policyType = 'Workflow policy type is required.'
  }

  if (!Number.isInteger(priority) || priority < 1 || priority > 9999) {
    errors.priority = 'Priority must be a whole number between 1 and 9999.'
  }

  if (frameworkKeys.length === 0) {
    errors.frameworkKeys = 'At least one framework is required.'
  }

  const supportedFrameworkKeySet = new Set(supportedFrameworkKeys)
  const invalidFrameworkKey = frameworkKeys.find((value) => !supportedFrameworkKeySet.has(value))
  if (invalidFrameworkKey) {
    errors.frameworkKeys = `Unsupported framework key "${invalidFrameworkKey}".`
  }

  if (!appliesTo) {
    errors.appliesTo = 'Applies To is required.'
  }

  if (!triggerEvent) {
    errors.triggerEvent = 'Trigger Event is required.'
  }

  if (!triggerMode) {
    errors.triggerMode = 'Trigger Mode is required.'
  }

  if (!actorScope) {
    errors.actorScope = 'Actor Scope is required.'
  }

  if (!Number.isInteger(cooldownSeconds) || cooldownSeconds < 0 || cooldownSeconds > 86400) {
    errors.cooldownSeconds = 'Cooldown seconds must be between 0 and 86400.'
  }

  if (!governedAction) {
    errors.governedAction = 'Governed Action is required.'
  }

  if (!decisionMode) {
    errors.decisionMode = 'Decision Mode is required.'
  }

  if (!severity) {
    errors.severity = 'Severity is required.'
  }

  if (passMessage.length > 500) {
    errors.passMessage = 'Pass message must be 500 characters or fewer.'
  }

  if (failMessage.length > 500) {
    errors.failMessage = 'Fail message must be 500 characters or fewer.'
  }

  const normalizedConditions = conditions
    .map((condition) => ({
      path: String(condition?.path ?? '').trim(),
      operator: String(condition?.operator ?? '').trim(),
      value: String(condition?.value ?? '').trim(),
      logic: String(condition?.logic ?? WORKFLOW_POLICY_CONDITION_LOGIC.AND).trim().toUpperCase(),
    }))
    .filter((condition) => condition.path || condition.operator || condition.value)

  const invalidConditionRow = normalizedConditions.find((condition) => !condition.path || !condition.operator)
  if (invalidConditionRow) {
    errors.conditions = 'Each condition row must include both a path and an operator.'
  }

  if (!errors.conditions) {
    const missingConditionValue = normalizedConditions.find((condition) =>
      !CONDITION_OPERATORS_WITHOUT_VALUE.has(condition.operator.toLowerCase()) && !condition.value,
    )

    if (missingConditionValue) {
      errors.conditions = `Condition "${missingConditionValue.path}" requires a value.`
    }
  }

  const normalizeEffects = (effects, fieldName) => {
    const normalizedEffects = effects
      .map((effect) => {
        const type = normalizeEffectType(effect?.type)
        return {
          type,
          targetPath: effectRequiresTargetPath(type) ? String(effect?.targetPath ?? '').trim() : '',
          value: effectRequiresValue(type) ? String(effect?.value ?? '').trim() : '',
        }
      })
      .filter((effect) => effect.type || effect.targetPath || effect.value)

    const firstMissingType = normalizedEffects.find((effect) => !effect.type)
    if (firstMissingType) {
      errors[fieldName] = 'Each effect row must include an effect type.'
      return []
    }

    const firstMissingTargetPath = normalizedEffects.find((effect) =>
      EFFECT_TYPES_REQUIRING_TARGET_PATH.has(effect.type) && !effect.targetPath,
    )
    if (firstMissingTargetPath) {
      errors[fieldName] = `Effect "${formatWorkflowPolicyEnumLabel(firstMissingTargetPath.type)}" requires a writable runtime path.`
      return []
    }

    const firstMissingValue = normalizedEffects.find((effect) =>
      EFFECT_TYPES_REQUIRING_VALUE.has(effect.type) && !effect.value,
    )
    if (firstMissingValue) {
      errors[fieldName] = `Effect "${formatWorkflowPolicyEnumLabel(firstMissingValue.type)}" requires a value.`
      return []
    }

    if (!errors[fieldName] && availableWritePathRows.length > 0) {
      const writePathKeySet = new Set(
        availableWritePathRows
          .map((row) => String(row?.pathKey ?? row?.value ?? '').trim())
          .filter(Boolean),
      )
      const invalidWriteTarget = normalizedEffects.find((effect) =>
        effect.targetPath && !writePathKeySet.has(effect.targetPath),
      )
      if (invalidWriteTarget) {
        errors[fieldName] = `Effect runtime path "${invalidWriteTarget.targetPath}" is not available for governed writes.`
        return []
      }
    }

    return normalizedEffects
  }

  const normalizedOnPassEffects = normalizeEffects(onPassEffects, 'onPassEffects')
  const normalizedOnFailEffects = normalizeEffects(onFailEffects, 'onFailEffects')

  const requiresRouting =
    decisionMode === WORKFLOW_POLICY_DECISION_MODES.REQUIRE_AGENT_EVALUATION
    || policyType === WORKFLOW_POLICY_TYPES.ROUTING

  if (requiresRouting && !routingMode) {
    errors.routingMode = 'Routing Mode is required when this policy routes execution.'
  }

  if (ROUTING_MODES_REQUIRING_PRIMARY_AGENT.has(routingMode) && !primaryAgentId) {
    errors.primaryAgentId = 'Primary Agent is required for the selected routing mode.'
  }

  if (fallbackAgentId && !primaryAgentId) {
    errors.fallbackAgentId = 'Choose a Primary Agent before setting a Fallback Agent.'
  }

  if (!Number.isInteger(timeoutMs) || timeoutMs < 0 || timeoutMs > 300000) {
    errors.timeoutMs = 'Timeout Override must be between 0 and 300000 milliseconds.'
  }

  if (retryOverride.length > 120) {
    errors.retryOverride = 'Retry Override must be 120 characters or fewer.'
  }

  if (!Number.isInteger(validationFreshnessMinutes) || validationFreshnessMinutes < 0 || validationFreshnessMinutes > 10080) {
    errors.validationFreshnessMinutes = 'Freshness Minutes must be between 0 and 10080.'
  }

  if (overrideAllowed && overrideRoles.length === 0) {
    errors.overrideRoles = 'Select at least one override role when overrides are allowed.'
  }

  if (approvalRequired && !overrideAllowed) {
    errors.approvalRequired = 'Approval Required can only be enabled when overrides are allowed.'
  }

  if (approvalRequired && !escalateTo) {
    errors.escalateTo = 'Escalate To is required when approval is required.'
  }

  if (escalationMessage.length > 500) {
    errors.escalationMessage = 'Escalation Message must be 500 characters or fewer.'
  }

  if (!Number.isInteger(slaMinutes) || slaMinutes < 0 || slaMinutes > 10080) {
    errors.slaMinutes = 'SLA Minutes must be between 0 and 10080.'
  } else if (approvalRequired && slaMinutes < 1) {
    errors.slaMinutes = 'Approval-required escalation must use at least 1 SLA minute.'
  }

  const duplicateKey = existingPolicies.find(
    (policy) => policy.id !== selectedPolicyId && normalizePolicyKey(policy.key) === key,
  )
  if (duplicateKey) {
    errors.key = 'Workflow policy key must be unique.'
  }

  if (availableAgentRows.length > 0) {
    const agentMap = new Map(
      availableAgentRows.map((agent) => [normalizeAgentId(agent.id), agent]),
    )

    for (const [field, agentId] of [['primaryAgentId', primaryAgentId], ['fallbackAgentId', fallbackAgentId]]) {
      if (!agentId) continue

      const agent = agentMap.get(agentId)
      if (!agent) {
        errors[field] = `Unknown runtime agent id "${agentId}".`
        continue
      }

      const supportedAgentFrameworkKeys = Array.isArray(agent.supportedFrameworkKeys)
        ? agent.supportedFrameworkKeys
        : []
      const incompatibleFramework = frameworkKeys.find((frameworkKey) => !supportedAgentFrameworkKeys.includes(frameworkKey))

      if (incompatibleFramework) {
        errors[field] = `Runtime agent "${agentId}" is not compatible with framework "${incompatibleFramework}".`
        continue
      }

      if (status === WORKFLOW_POLICY_STATUSES.ACTIVE && String(agent.status ?? '').trim().toUpperCase() !== 'ACTIVE') {
        errors[field] = `Active workflow policies require ACTIVE runtime agent "${agentId}".`
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
      policyType,
      priority,
      frameworkKeys,
      appliesTo,
      triggerEvent,
      triggerMode,
      actorScope,
      cooldownSeconds,
      reevaluateOnRetry,
      governedAction,
      decisionMode,
      passMessage,
      failMessage,
      severity,
      conditions: normalizedConditions.map((condition, index) => ({
        path: condition.path,
        operator: condition.operator,
        value: parseConditionValue(condition.value, condition.operator),
        ...(index < normalizedConditions.length - 1
          ? { logic: condition.logic || WORKFLOW_POLICY_CONDITION_LOGIC.AND }
          : {}),
      })),
      routingMode,
      primaryAgentId,
      fallbackAgentId,
      timeoutMs,
      retryOverride,
      requireSuccess,
      requiredValidationKeys,
      validationBlockingOnFail,
      validationWarningOnly,
      validationFreshnessMinutes,
      validationRequireLatestRun,
      onPassEffects: normalizedOnPassEffects.map((effect) => ({
        type: effect.type,
        ...(effectRequiresTargetPath(effect.type) ? { targetPath: effect.targetPath } : {}),
        ...(effectRequiresValue(effect.type) ? { value: parseConditionValue(effect.value, effect.type) } : {}),
      })),
      onFailEffects: normalizedOnFailEffects.map((effect) => ({
        type: effect.type,
        ...(effectRequiresTargetPath(effect.type) ? { targetPath: effect.targetPath } : {}),
        ...(effectRequiresValue(effect.type) ? { value: parseConditionValue(effect.value, effect.type) } : {}),
      })),
      overrideAllowed,
      overrideRoles,
      approvalRequired,
      escalateTo,
      escalationMessage,
      slaMinutes,
      orderedSteps,
      requiredAgentIds,
      requiredSkillIds,
    },
  }
}
