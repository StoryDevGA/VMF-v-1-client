import { baseApi } from './baseApi.js'
import {
  cloneFrameworkPackage,
  DEPRECATED_FRAMEWORK_PACKAGE_FIELD_MESSAGES,
  DEPRECATED_FRAMEWORK_PACKAGE_FIELDS,
  FRAMEWORK_PACKAGE_PAGE_SIZE,
  FRAMEWORK_PACKAGE_STATUSES,
  INITIAL_FRAMEWORK_PACKAGES,
} from '../../pages/SuperAdminFrameworkPackages/superAdminFrameworkPackages.constants.js'
import {
  cloneFrameworkRegistryEntry,
  FRAMEWORK_REGISTRY_PAGE_SIZE,
  INITIAL_FRAMEWORK_REGISTRIES,
} from '../../pages/SuperAdminFrameworkRegistry/superAdminFrameworkRegistry.constants.js'
import {
  cloneRuntimeAgent,
  INITIAL_RUNTIME_AGENTS,
  normalizePathSelectionList,
  RUNTIME_AGENT_STATUSES,
  RUNTIME_AGENT_PAGE_SIZE,
} from '../../pages/SuperAdminAgents/superAdminAgents.constants.js'
import {
  cloneRuntimeSkill,
  INITIAL_RUNTIME_SKILLS,
  RUNTIME_SKILL_PAGE_SIZE,
  RUNTIME_SKILL_STATUSES,
} from '../../pages/SuperAdminSkills/superAdminSkills.constants.js'
import {
  cloneWorkflowPolicy,
  INITIAL_WORKFLOW_POLICIES,
  validateWorkflowPolicyForm,
  WORKFLOW_POLICY_CONDITION_OPERATORS,
  WORKFLOW_POLICY_PAGE_SIZE,
} from '../../pages/SuperAdminWorkflowPolicies/superAdminWorkflowPolicies.constants.js'
import {
  buildRuntimePathRegistryStableId,
  cloneRuntimePathRegistryEntry,
  LOCKED_RUNTIME_CONTROL_EDIT_MESSAGE,
  RUNTIME_PATH_REGISTRY_PAGE_SIZE,
  RUNTIME_PATH_REGISTRY_STATUSES,
} from '../../pages/SuperAdminRuntimePathRegistry/superAdminRuntimePathRegistry.constants.js'
import {
  INITIAL_RUNTIME_PATH_REGISTRY,
  INITIAL_RUNTIME_PATH_REGISTRY_STAGED,
} from '../../mocks/runtimePathRegistry.fixtures.js'
import {
  buildSkillRoleRegistryStableId,
  cloneSkillRoleRegistryEntry,
  INITIAL_SKILL_ROLE_REGISTRY,
  SKILL_ROLE_REGISTRY_CATEGORIES,
  SKILL_ROLE_REGISTRY_OPERATIONS,
  SKILL_ROLE_REGISTRY_PAGE_SIZE,
  SKILL_ROLE_REGISTRY_STATUSES,
} from '../../pages/SuperAdminSkillRoleRegistry/superAdminSkillRoleRegistry.constants.js'
import {
  buildValidationRegistryStableId,
  cloneValidationRegistryEntry,
  INITIAL_VALIDATION_REGISTRY,
  VALIDATION_REGISTRY_PAGE_SIZE,
  VALIDATION_REGISTRY_STATUSES,
} from '../../pages/SuperAdminValidationRegistry/superAdminValidationRegistry.constants.js'
import {
  cloneUIContract,
  INITIAL_UI_CONTRACTS,
  UI_CONTRACT_PAGE_SIZE,
  UI_CONTRACT_STATUSES,
} from '../../pages/SuperAdminUiContracts/superAdminUiContracts.constants.js'

const FRAMEWORK_PACKAGE_LIST_TAG = { type: 'RuntimeFrameworkPackage', id: 'LIST' }
const UI_CONTRACT_LIST_TAG = { type: 'RuntimeUIContract', id: 'LIST' }
const FRAMEWORK_REGISTRY_LIST_TAG = { type: 'RuntimeFrameworkRegistry', id: 'LIST' }
const AGENT_LIST_TAG = { type: 'RuntimeAgent', id: 'LIST' }
const SKILL_LIST_TAG = { type: 'RuntimeSkill', id: 'LIST' }
const WORKFLOW_POLICY_LIST_TAG = { type: 'RuntimeWorkflowPolicy', id: 'LIST' }
const WORKFLOW_POLICY_DEPENDENCIES_LIST_TAG = { type: 'RuntimeWorkflowPolicyDependencies', id: 'LIST' }
const RUNTIME_PATH_LIST_TAG = { type: 'RuntimePath', id: 'LIST' }
const SKILL_ROLE_LIST_TAG = { type: 'SkillRole', id: 'LIST' }
const VALIDATION_REGISTRY_LIST_TAG = { type: 'ValidationRegistry', id: 'LIST' }
const RUNTIME_VALIDATION_AUDIT_LIST_TAG = { type: 'RuntimeValidationAudit', id: 'LIST' }
const RUNTIME_ACTIVATION_LIST_TAG = { type: 'RuntimeActivation', id: 'LIST' }
const RUNTIME_DEPLOYMENT_LIST_TAG = { type: 'RuntimeDeployment', id: 'LIST' }
const RUNTIME_CONTROL_BASE_PATH = '/super-admin/runtime-control'
const RUNTIME_ACTIVATION_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
})
const RUNTIME_DEPLOYMENT_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
})
const CLONEABLE_FRAMEWORK_PACKAGE_STATUSES = new Set([
  FRAMEWORK_PACKAGE_STATUSES.ACTIVE,
  FRAMEWORK_PACKAGE_STATUSES.VALIDATED,
])

const RUNTIME_CONTROL_UPDATED_BY = Object.freeze({
  id: 'sa-local',
  name: 'Super Admin',
})

const WORKFLOW_POLICY_GOVERNED_METADATA_FIELDS = Object.freeze([
  'componentVersion',
  'versionStatus',
  'stableId',
  'lineageId',
  'isLocked',
  'lockedAt',
  'lockedBy',
  'lockedReason',
  'lockedByPackageKeys',
  'clonedFromStableId',
  'supersedesStableId',
  'supersededByStableId',
])

const RUNTIME_AGENT_GOVERNED_METADATA_FIELDS = WORKFLOW_POLICY_GOVERNED_METADATA_FIELDS
const RUNTIME_SKILL_GOVERNED_METADATA_FIELDS = WORKFLOW_POLICY_GOVERNED_METADATA_FIELDS
const SKILL_ROLE_GOVERNED_METADATA_FIELDS = WORKFLOW_POLICY_GOVERNED_METADATA_FIELDS

const isRuntimeControlMockMode = () => {
  const mockModeAllowed = import.meta.env.MODE === 'test'
    || import.meta.env.VITE_RUNTIME_CONTROL_ALLOW_MOCK === 'true'

  return mockModeAllowed && globalThis.__RUNTIME_CONTROL_API_MOCK__ === true
}

const buildListParams = ({
  page,
  pageSize,
  q,
  keys,
  status,
  sortBy,
  sortOrder,
  frameworkKey,
  frameworkKeys,
  scope,
  operation,
  category,
  dataType,
  sourceType,
  isProtected,
  type,
  structureType,
  severity,
  policyUsable,
  packageUsable,
  defaultPageSize,
}) => ({
  page: normalizePositiveInteger(page, 1),
  pageSize: normalizePositiveInteger(pageSize, defaultPageSize),
  q: String(q ?? '').trim(),
  keys: String(keys ?? '').trim(),
  status: String(status ?? '').trim(),
  sortBy: String(sortBy ?? '').trim(),
  sortOrder: String(sortOrder ?? '').trim().toLowerCase(),
  frameworkKey: normalizeFrameworkKey(frameworkKey),
  frameworkKeys: String(frameworkKeys ?? '').trim(),
  scope: String(scope ?? '').trim(),
  operation: String(operation ?? '').trim(),
  category: String(category ?? '').trim(),
  dataType: String(dataType ?? '').trim(),
  sourceType: String(sourceType ?? '').trim(),
  isProtected: String(isProtected ?? '').trim().toLowerCase(),
  type: String(type ?? '').trim(),
  structureType: String(structureType ?? '').trim().toLowerCase(),
  severity: String(severity ?? '').trim(),
  policyUsable: String(policyUsable ?? '').trim().toLowerCase(),
  packageUsable: String(packageUsable ?? '').trim().toLowerCase(),
})

export const buildRuntimeControlListRequest = ({
  resourcePath,
  page,
  pageSize,
  q,
  keys,
  status,
  sortBy,
  sortOrder,
  frameworkKey,
  frameworkKeys,
  scope,
  operation,
  category,
  dataType,
  sourceType,
  isProtected,
  type,
  structureType,
  severity,
  policyUsable,
  packageUsable,
  defaultPageSize,
}) => {
  const params = buildListParams({
    page,
    pageSize,
    q,
    keys,
    status,
    sortBy,
    sortOrder,
    frameworkKey,
    frameworkKeys,
    scope,
    operation,
    category,
    dataType,
    sourceType,
    isProtected,
    type,
    structureType,
    severity,
    policyUsable,
    packageUsable,
    defaultPageSize,
  })

  return {
    url: `${RUNTIME_CONTROL_BASE_PATH}/${resourcePath}`,
    params: {
      page: params.page,
      pageSize: params.pageSize,
      ...(params.q ? { q: params.q } : {}),
      ...(params.keys ? { keys: params.keys } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params.sortOrder ? { sortOrder: params.sortOrder } : {}),
      ...(params.frameworkKey ? { frameworkKey: params.frameworkKey } : {}),
      ...(params.frameworkKeys ? { frameworkKeys: params.frameworkKeys } : {}),
      ...(params.scope ? { scope: params.scope } : {}),
      ...(params.operation ? { operation: params.operation } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.dataType ? { dataType: params.dataType } : {}),
      ...(params.sourceType ? { sourceType: params.sourceType } : {}),
      ...(params.severity ? { severity: params.severity } : {}),
      ...(params.isProtected ? { isProtected: params.isProtected } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.structureType ? { structureType: params.structureType } : {}),
      ...(params.policyUsable ? { policyUsable: params.policyUsable } : {}),
      ...(params.packageUsable ? { packageUsable: params.packageUsable } : {}),
    },
  }
}

export const buildRuntimeControlDetailRequest = (resourcePath, entityId) => ({
  url: `${RUNTIME_CONTROL_BASE_PATH}/${resourcePath}/${entityId}`,
})

export const buildRuntimeControlMutationRequest = ({
  resourcePath,
  entityId,
  method,
  body,
  headers,
}) => ({
  url: entityId
    ? `${RUNTIME_CONTROL_BASE_PATH}/${resourcePath}/${entityId}`
    : `${RUNTIME_CONTROL_BASE_PATH}/${resourcePath}`,
  method,
  body,
  ...(headers && Object.keys(headers).length > 0 ? { headers } : {}),
})

const normalizePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const normalizeSearch = (value) => String(value ?? '').trim().toLowerCase()
const normalizeFrameworkKey = (value) => String(value ?? '').trim().toUpperCase()
const normalizeKeyToken = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
const KEY_TOKEN_PATTERN = /^[a-z][a-z0-9-]*$/
const normalizeStableIdList = (values) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean))]
const toSearchValues = (values) =>
  values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())

const matchesSearch = (query, values) =>
  !query || toSearchValues(values).some((value) => value.includes(query))

const buildMeta = ({ page, pageSize, total, filters = {} }) => ({
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize))),
  filters,
})

const buildListResponse = ({ rows, page, pageSize, filters }) => {
  const total = rows.length
  const meta = buildMeta({ page, pageSize, total, filters })
  const normalizedPage = Math.min(page, meta.totalPages)
  const startIndex = (normalizedPage - 1) * pageSize

  return {
    data: rows.slice(startIndex, startIndex + pageSize),
    meta: {
      ...meta,
      page: normalizedPage,
    },
  }
}

const buildEntityResponse = (entity) => ({
  data: entity,
  meta: {},
})

const compilePromptPreview = (promptConfig = {}) => {
  const blocks = [
    { label: 'Base System Prompt', value: String(promptConfig.baseSystemPrompt ?? '').trim() },
    { label: 'Role Prompt', value: String(promptConfig.rolePrompt ?? '').trim() },
    { label: 'Developer Instructions', value: String(promptConfig.developerInstructions ?? '').trim() },
    { label: 'Output Contract Prompt', value: String(promptConfig.outputContractPrompt ?? '').trim() },
    { label: 'Forbidden Actions Prompt', value: String(promptConfig.forbiddenActionsPrompt ?? '').trim() },
    { label: 'Handoff Prompt', value: String(promptConfig.handoffPrompt ?? '').trim() },
  ].filter((block) => block.value)

  if (blocks.length === 0) return ''

  return blocks
    .map((block) => `## ${block.label}\n\n${block.value}`)
    .join('\n\n')
}

const buildConflictError = (message, details = {}) => ({
  error: {
    status: 409,
    data: {
      error: {
        code: 'CONFLICT',
        message,
        details,
      },
    },
  },
})

const buildValidationFailedError = (message, details = {}) => ({
  error: {
    status: 422,
    data: {
      error: {
        code: 'VALIDATION_FAILED',
        message,
        details,
      },
    },
  },
})

const buildNotFoundError = (message) => ({
  error: {
    status: 404,
    data: {
      error: {
        code: 'NOT_FOUND',
        message,
      },
    },
  },
})

const validateMockWorkflowPolicyGovernedMetadataFields = (payload = {}) => {
  const field = WORKFLOW_POLICY_GOVERNED_METADATA_FIELDS.find((fieldName) =>
    Object.prototype.hasOwnProperty.call(payload, fieldName),
  )

  if (!field) return null

  return buildValidationFailedError('Please check the form for errors.', {
    [field]: 'Workflow Policy version and lock metadata is managed by the server.',
  })
}

const WORKFLOW_POLICY_DEPRECATED_FIELDS = [
  'gatingRules',
  'orderedSteps',
  'requiredAgentIds',
  'requiredSkillIds',
]

const validateMockWorkflowPolicyDeprecatedFields = (payload = {}) => {
  const details = WORKFLOW_POLICY_DEPRECATED_FIELDS.reduce((nextDetails, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      nextDetails[field] = `${field} is deprecated. Use conditions and governed steps instead.`
    }
    return nextDetails
  }, {})

  if (Object.keys(details).length === 0) return null

  return buildValidationFailedError('Please check the form for errors.', details)
}

const validateMockRuntimeAgentGovernedMetadataFields = (payload = {}) => {
  const field = RUNTIME_AGENT_GOVERNED_METADATA_FIELDS.find((fieldName) =>
    Object.prototype.hasOwnProperty.call(payload, fieldName),
  )

  if (!field) return null

  return buildValidationFailedError('Please check the form for errors.', {
    [field]: 'Runtime Agent version and lock metadata is managed by the server.',
  })
}

const validateMockRuntimeSkillGovernedMetadataFields = (payload = {}) => {
  const field = RUNTIME_SKILL_GOVERNED_METADATA_FIELDS.find((fieldName) =>
    Object.prototype.hasOwnProperty.call(payload, fieldName),
  )

  if (!field) return null

  return buildValidationFailedError('Please check the form for errors.', {
    [field]: 'Runtime Skill version and lock metadata is managed by the server.',
  })
}

const validateMockSkillRoleGovernedMetadataFields = (payload = {}) => {
  const field = SKILL_ROLE_GOVERNED_METADATA_FIELDS.find((fieldName) =>
    Object.prototype.hasOwnProperty.call(payload, fieldName),
  )

  if (!field) return null

  return buildValidationFailedError('Please check the form for errors.', {
    [field]: 'Skill Role version and lock metadata is managed by the server.',
  })
}

const buildRuntimeAgentLockedConflictError = (agent = {}) =>
  buildConflictError(LOCKED_RUNTIME_CONTROL_EDIT_MESSAGE, {
    field: 'isLocked',
    reason: 'RUNTIME_AGENT_LOCKED',
    lockedByPackageKeys: Array.isArray(agent.lockedByPackageKeys)
      ? agent.lockedByPackageKeys
      : [],
  })

const buildRuntimeSkillLockedConflictError = (skill = {}) =>
  buildConflictError(LOCKED_RUNTIME_CONTROL_EDIT_MESSAGE, {
    field: 'isLocked',
    reason: 'RUNTIME_SKILL_LOCKED',
    lockedByPackageKeys: Array.isArray(skill.lockedByPackageKeys)
      ? skill.lockedByPackageKeys
      : [],
  })

const buildSkillRoleLockedConflictError = (role = {}) =>
  buildConflictError(LOCKED_RUNTIME_CONTROL_EDIT_MESSAGE, {
    field: 'isLocked',
    reason: 'SKILL_ROLE_LOCKED',
    lockedByPackageKeys: Array.isArray(role.lockedByPackageKeys)
      ? role.lockedByPackageKeys
      : [],
  })

const buildRuntimePathLockedConflictError = (runtimePath = {}) =>
  buildConflictError(LOCKED_RUNTIME_CONTROL_EDIT_MESSAGE, {
    field: 'isLocked',
    reason: 'RUNTIME_PATH_LOCKED',
    lockedByPackageKeys: Array.isArray(runtimePath.lockedByPackageKeys)
      ? runtimePath.lockedByPackageKeys
      : [],
  })

const UI_CONTRACT_GOVERNANCE_FIELDS = Object.freeze([
  'componentVersion',
  'versionStatus',
  'stableId',
  'lineageId',
  'isLocked',
  'lockedAt',
  'lockedBy',
  'lockedReason',
  'lockedByPackageKeys',
  'clonedFromStableId',
  'supersedesStableId',
  'supersededByStableId',
  'resolvedAt',
])

const buildUIContractLockedConflictError = (uiContract = {}) =>
  buildConflictError(LOCKED_RUNTIME_CONTROL_EDIT_MESSAGE, {
    field: uiContract.isLocked ? 'isLocked' : 'isProtected',
    reason: 'UI_CONTRACT_LOCKED',
    lockedByPackageKeys: Array.isArray(uiContract.lockedByPackageKeys)
      ? uiContract.lockedByPackageKeys
      : [],
  })

const validateMockUIContractGovernanceFields = (payload = {}) => {
  const details = {}
  for (const field of UI_CONTRACT_GOVERNANCE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) continue
    details[field] = `${field} is server-managed governance metadata and cannot be edited directly.`
  }

  return Object.keys(details).length > 0
    ? buildValidationFailedError('Please check the form for errors.', details)
    : null
}

const validateMockDeprecatedFrameworkPackageFields = (payload = {}) => {
  const details = {}

  for (const field of DEPRECATED_FRAMEWORK_PACKAGE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) continue

    details[field] = DEPRECATED_FRAMEWORK_PACKAGE_FIELD_MESSAGES[field]
  }

  return Object.keys(details).length > 0
    ? buildValidationFailedError('Please check the form for errors.', details)
    : null
}

const buildAuditFields = (timestamp = new Date().toISOString()) => ({
  updatedAt: timestamp,
  updatedBy: { ...RUNTIME_CONTROL_UPDATED_BY },
})

const buildUIContractResolutionFields = (timestamp = new Date().toISOString()) => ({
  resolvedAt: timestamp,
})

const buildInitialRuntimeControlState = () => ({
  frameworkRegistries: INITIAL_FRAMEWORK_REGISTRIES.map((entry) => cloneFrameworkRegistryEntry(entry)),
  frameworkPackages: INITIAL_FRAMEWORK_PACKAGES.map((pkg) => cloneFrameworkPackage(pkg)),
  runtimePaths: [...INITIAL_RUNTIME_PATH_REGISTRY, ...INITIAL_RUNTIME_PATH_REGISTRY_STAGED]
    .map((entry) => cloneRuntimePathRegistryEntry(entry)),
  skillRoles: INITIAL_SKILL_ROLE_REGISTRY.map((entry) => cloneSkillRoleRegistryEntry(entry)),
  validationRegistry: INITIAL_VALIDATION_REGISTRY.map((entry) => cloneValidationRegistryEntry(entry)),
  uiContracts: INITIAL_UI_CONTRACTS.map((entry) => cloneUIContract(entry)),
  agents: INITIAL_RUNTIME_AGENTS.map((agent) => cloneRuntimeAgent(agent)),
  skills: INITIAL_RUNTIME_SKILLS.map((skill) => cloneRuntimeSkill(skill)),
  workflowPolicies: INITIAL_WORKFLOW_POLICIES.map((policy) => cloneWorkflowPolicy(policy)),
  runtimeValidationAudits: [],
  runtimeActivationSnapshots: [],
  runtimeDeployments: [],
})

let runtimeControlState = buildInitialRuntimeControlState()

export const __resetRuntimeControlApiStateForTests = () => {
  runtimeControlState = buildInitialRuntimeControlState()
}

export const __mutateRuntimeControlApiStateForTests = (updater) => {
  if (typeof updater === 'function') {
    runtimeControlState = updater(runtimeControlState)
  }
}

const buildMockRuntimeAgentDependencies = (agentId) => {
  const workflowPolicies = (runtimeControlState.workflowPolicies || []).filter((policy) =>
    Array.isArray(policy.requiredAgentIds) && policy.requiredAgentIds.includes(agentId),
  )
  const frameworkPackages = []

  const activeWorkflowPolicies = workflowPolicies.filter((policy) => policy.status === 'ACTIVE')
  const activeFrameworkPackages = []

  const warnings = []
  const blocks = []

  if (activeWorkflowPolicies.length > 0) {
    warnings.push(`This Agent is used by ${activeWorkflowPolicies.length} ACTIVE workflow policies.`)
  }

  if (warnings.length > 0) {
    blocks.push('Deactivation is blocked while this agent is referenced by ACTIVE runtime-control resources.')
  }

  return {
    workflowPolicies,
    frameworkPackages,
    summary: {
      workflowPolicies: workflowPolicies.length,
      frameworkPackages: frameworkPackages.length,
      activeWorkflowPolicies: activeWorkflowPolicies.length,
      activeFrameworkPackages: activeFrameworkPackages.length,
    },
    warnings,
    blocks,
  }
}

const buildMockSkillRoleDependencies = (roleKey) => {
  const normalizedRoleKey = String(roleKey ?? '').trim().toUpperCase()
  if (!normalizedRoleKey) {
    return {
      skillIds: [],
      agentIds: [],
      summary: { skills: 0, agents: 0 },
    }
  }

  const skillIds = (runtimeControlState.skills || [])
    .filter((skill) => String(skill?.skillRoleKey ?? '').trim().toUpperCase() === normalizedRoleKey)
    .map((skill) => skill.id)
    .filter(Boolean)

  const agentIds = (runtimeControlState.agents || [])
    .filter((agent) => {
      const roleKeys = Array.isArray(agent?.requiredSkillRoleKeys) ? agent.requiredSkillRoleKeys : []
      return roleKeys
        .map((value) => String(value ?? '').trim().toUpperCase())
        .includes(normalizedRoleKey)
    })
    .map((agent) => agent.id)
    .filter(Boolean)

  return {
    skillIds,
    agentIds,
    summary: {
      skills: skillIds.length,
      agents: agentIds.length,
    },
  }
}

const buildMockValidationDefaultAgentSummaries = (defaultAgentIds = [], frameworkKeys = []) => {
  const normalizedFrameworkKeys = normalizeStableIdList(frameworkKeys).map((value) => normalizeFrameworkKey(value))

  return normalizeStableIdList(defaultAgentIds).map((agentId) => {
    const agent = findRuntimeAgentById(agentId)

    if (!agent) {
      return {
        id: agentId,
        key: agentId,
        name: agentId,
        status: 'MISSING',
        supportedFrameworkKeys: [],
        compatibleWithValidation: false,
      }
    }

    const supportedFrameworkKeys = Array.isArray(agent.supportedFrameworkKeys)
      ? agent.supportedFrameworkKeys.map((value) => normalizeFrameworkKey(value)).filter(Boolean)
      : []

    return {
      id: agent.id,
      key: agent.key,
      name: agent.name,
      status: agent.status,
      supportedFrameworkKeys,
      compatibleWithValidation: normalizedFrameworkKeys.every((frameworkKey) => supportedFrameworkKeys.includes(frameworkKey)),
    }
  })
}

const validateMockValidationRegistryDefaultAgents = ({ defaultAgentIds = [], supportedFrameworkKeys = [], status = '' } = {}) => {
  const requireActive = String(status ?? '').trim().toUpperCase() === VALIDATION_REGISTRY_STATUSES.ACTIVE
  const errors = []
  const normalizedFrameworkKeys = normalizeStableIdList(supportedFrameworkKeys).map((value) => normalizeFrameworkKey(value))

  for (const summary of buildMockValidationDefaultAgentSummaries(defaultAgentIds, supportedFrameworkKeys)) {
    if (summary.status === 'MISSING') {
      errors.push(`Default agent "${summary.id}" was not found.`)
      continue
    }

    if (requireActive && String(summary.status ?? '').trim().toUpperCase() !== RUNTIME_AGENT_STATUSES.ACTIVE) {
      errors.push(`Default agent "${summary.id}" must be ACTIVE when the validation is ACTIVE.`)
      continue
    }

    if (!summary.compatibleWithValidation) {
      const missingFrameworks = normalizedFrameworkKeys.filter((frameworkKey) => !(summary.supportedFrameworkKeys ?? []).includes(frameworkKey))
      errors.push(
        `Default agent "${summary.id}" does not support framework${missingFrameworks.length === 1 ? '' : 's'}: ${missingFrameworks.join(', ')}.`,
      )
    }
  }

  return errors
}

const validateMockPathDescendant = (outputPath, fieldPath, fieldLabel) => {
  if (!fieldPath) return null
  const prefix = `${outputPath}.`
  if (String(fieldPath).startsWith(prefix)) return null
  return `${fieldLabel} must be inside the selected Output Path.`
}

const validateMockValidationRuntimePaths = ({ outputPath, passFieldPath, detailsFieldPath, messageFieldPath } = {}) => {
  const errors = {}
  const paths = [outputPath, passFieldPath, detailsFieldPath, messageFieldPath].filter(Boolean)
  const summaries = buildMockValidationRuntimePathSummaries(paths)
  const allowedValidationPathScopes = new Set(['VALIDATION_RESULT', 'FRAMEWORK_STATE'])

  for (const summary of summaries) {
    if (summary.status === 'MISSING') {
      if (summary.pathKey === outputPath) errors.outputPath = `Unknown runtime path "${summary.pathKey}".`
      else if (summary.pathKey === passFieldPath) errors.passFieldPath = `Unknown runtime path "${summary.pathKey}".`
      else if (summary.pathKey === detailsFieldPath) errors.detailsFieldPath = `Unknown runtime path "${summary.pathKey}".`
      else if (summary.pathKey === messageFieldPath) errors.messageFieldPath = `Unknown runtime path "${summary.pathKey}".`
      continue
    }

    if (!allowedValidationPathScopes.has(String(summary.scope || '').toUpperCase())) {
      if (summary.pathKey === outputPath) errors.outputPath = `Runtime path "${summary.pathKey}" must be a validation-compatible path.`
      else if (summary.pathKey === passFieldPath) errors.passFieldPath = `Runtime path "${summary.pathKey}" must be a validation-compatible path.`
      else if (summary.pathKey === detailsFieldPath) errors.detailsFieldPath = `Runtime path "${summary.pathKey}" must be a validation-compatible path.`
      else if (summary.pathKey === messageFieldPath) errors.messageFieldPath = `Runtime path "${summary.pathKey}" must be a validation-compatible path.`
    }
  }

  const passErr = validateMockPathDescendant(outputPath, passFieldPath, 'Pass Field Path')
  if (passErr) errors.passFieldPath = passErr

  const detailsErr = validateMockPathDescendant(outputPath, detailsFieldPath, 'Details Field Path')
  if (detailsErr) errors.detailsFieldPath = detailsErr

  const messageErr = validateMockPathDescendant(outputPath, messageFieldPath, 'Message Field Path')
  if (messageErr) errors.messageFieldPath = messageErr

  return errors
}

const validateMockValidationProducerSkill = ({ producerSkillId, supportedFrameworkKeys = [], status = '' } = {}) => {
  if (!producerSkillId) return null

  const skill = (runtimeControlState.skills || []).find((s) => s.id === producerSkillId)
  if (!skill) return 'Producer skill was not found.'

  const validationIsActive = String(status ?? '').trim().toUpperCase() === VALIDATION_REGISTRY_STATUSES.ACTIVE
  if (validationIsActive && String(skill.status || '').trim().toUpperCase() !== 'ACTIVE') {
    return 'Producer skill must be ACTIVE when the validation is ACTIVE.'
  }

  const normalizedFrameworks = normalizeStableIdList(supportedFrameworkKeys).map((k) => normalizeFrameworkKey(k))
  const skillFrameworks = normalizeStableIdList(skill.supportedFrameworkKeys || []).map((k) => normalizeFrameworkKey(k))
  const missing = normalizedFrameworks.filter((fw) => !skillFrameworks.includes(fw))
  if (missing.length > 0) {
    return `Producer skill does not support framework${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`
  }

  return null
}

const buildMockValidationRuntimePathSummaries = (pathKeys = []) =>
  normalizeStableIdList(pathKeys).map((pathKey) => {
    const row = (runtimeControlState.runtimePaths || []).find((entry) => entry.pathKey === pathKey)
    return row
      ? {
          id: row.id,
          pathKey: row.pathKey,
          label: row.label,
          status: row.status,
          scope: row.scope,
          isProtected: Boolean(row.isProtected),
        }
      : {
          id: '',
          pathKey,
          label: pathKey,
          status: 'MISSING',
          scope: '',
          isProtected: false,
        }
  })

const buildMockValidationRegistryDependencies = (validation) => {
  const normalizedKey = String(validation?.key ?? '').trim().toLowerCase()
  if (!normalizedKey) {
    return {
      workflowPolicies: [],
      frameworkPackages: [],
      summary: { workflowPolicies: 0, frameworkPackages: 0 },
    }
  }

  const workflowPolicies = (runtimeControlState.workflowPolicies || [])
    .filter((policy) => Array.isArray(policy.requiredValidationKeys) && policy.requiredValidationKeys.includes(normalizedKey))
    .map((policy) => ({
      id: policy.id,
      key: policy.key,
      name: policy.name,
      status: policy.status,
    }))

  const frameworkPackages = (runtimeControlState.frameworkPackages || [])
    .filter((pkg) => {
      const validationBindingMatch = Array.isArray(pkg?.validationBindings)
        && pkg.validationBindings.some((binding) =>
          String(binding?.validationKey ?? '').trim().toLowerCase() === normalizedKey,
        )
      const sectionValidationMatch = Array.isArray(pkg?.sections)
        && pkg.sections.some((section) =>
          Array.isArray(section?.validationKeys)
          && section.validationKeys.some((validationKey) =>
            String(validationKey ?? '').trim().toLowerCase() === normalizedKey,
          ),
        )
      return validationBindingMatch || sectionValidationMatch
    })
    .map((pkg) => ({
      id: pkg.id,
      frameworkKey: pkg.frameworkKey,
      frameworkName: pkg.frameworkName,
      version: pkg.version,
      status: pkg.status,
    }))

  return {
    workflowPolicies,
    frameworkPackages,
    summary: {
      workflowPolicies: workflowPolicies.length,
      frameworkPackages: frameworkPackages.length,
    },
  }
}

const buildMockWorkflowPolicyDependencies = (policy) => {
  const normalizedPolicyKey = String(policy?.key ?? '').trim().toLowerCase()
  const referencedFrameworkPackages = (runtimeControlState.frameworkPackages || []).filter((pkg) =>
    Array.isArray(pkg.workflowBindings)
    && pkg.workflowBindings.some((binding) =>
      String(binding?.policyKey ?? '').trim().toLowerCase() === normalizedPolicyKey,
    ),
  )
  const agentIds = [
    ...new Set([
      String(policy?.primaryAgentId ?? '').trim(),
      String(policy?.fallbackAgentId ?? '').trim(),
      ...(Array.isArray(policy?.requiredAgentIds) ? policy.requiredAgentIds : []),
      ...(Array.isArray(policy?.steps) ? policy.steps.map((step) => step?.agentId) : []),
    ].filter(Boolean)),
  ]
  const agents = (runtimeControlState.agents || []).filter((agent) => agentIds.includes(agent.id))
  const skillIds = [
    ...new Set([
      ...(Array.isArray(policy?.requiredSkillIds) ? policy.requiredSkillIds : []),
      ...(Array.isArray(policy?.steps) ? policy.steps.map((step) => step?.skillId) : []),
    ].map((value) => String(value ?? '').trim()).filter(Boolean)),
  ]
  const skills = (runtimeControlState.skills || []).filter((skill) => skillIds.includes(skill.id) || skillIds.includes(skill.key))
  const runtimePathKeys = [
    ...new Set([
      ...(Array.isArray(policy?.conditions) ? policy.conditions.map((condition) => condition?.path) : []),
      ...(Array.isArray(policy?.onPassEffects) ? policy.onPassEffects.map((effect) => effect?.targetPath) : []),
      ...(Array.isArray(policy?.onFailEffects) ? policy.onFailEffects.map((effect) => effect?.targetPath) : []),
      ...(Array.isArray(policy?.steps) ? policy.steps.map((step) => step?.targetPath) : []),
    ].map((value) => String(value ?? '').trim()).filter(Boolean)),
  ]
  const runtimePaths = (runtimeControlState.runtimePaths || []).filter((path) => runtimePathKeys.includes(path.pathKey))
  const frameworks = (runtimeControlState.frameworkRegistries || []).filter((entry) =>
    (policy?.frameworkKeys || []).includes(entry.frameworkKey),
  )
  const collisions = (runtimeControlState.workflowPolicies || []).filter((row) =>
    row.id !== policy.id
    && row.priority === policy.priority
    && String(row.triggerEvent ?? '').trim().toUpperCase() === String(policy?.triggerEvent ?? '').trim().toUpperCase()
    && String(row.governedAction ?? '').trim().toUpperCase() === String(policy?.governedAction ?? '').trim().toUpperCase()
    && (Array.isArray(row.frameworkKeys) ? row.frameworkKeys : []).some((frameworkKey) =>
      (policy?.frameworkKeys || []).includes(frameworkKey),
    ),
  )

  const warnings = []
  const inactiveAgent = agents.find((agent) => String(agent?.status ?? '').trim().toUpperCase() !== 'ACTIVE')
  if (inactiveAgent) {
    warnings.push(`This policy references non-active Agent: ${inactiveAgent.key || inactiveAgent.id}.`)
  }
  if (collisions.length > 0) {
    warnings.push(`Priority collision with policy: ${collisions[0].key || collisions[0].id}.`)
  }
  const activeFrameworkPackages = referencedFrameworkPackages.filter((pkg) => String(pkg?.status ?? '').trim().toUpperCase() === 'ACTIVE')
  if (activeFrameworkPackages.length > 0) {
    warnings.push(`This policy is referenced by ${activeFrameworkPackages.length} ACTIVE framework package${activeFrameworkPackages.length === 1 ? '' : 's'}.`)
  }

  return {
    policyId: policy.id,
    referencedBy: {
      frameworkPackages: referencedFrameworkPackages.map((pkg) => ({
        id: pkg.id,
        frameworkKey: pkg.frameworkKey,
        frameworkName: pkg.frameworkName,
        version: pkg.version,
        status: pkg.status,
      })),
      workflowPolicies: [],
      scheduledJobs: [],
    },
    uses: {
      agents: agents.map((agent) => ({
        id: agent.id,
        key: agent.key,
        name: agent.name,
        status: agent.status,
      })),
      skills: skills.map((skill) => ({
        id: skill.id,
        key: skill.key,
        name: skill.name,
        status: skill.status,
      })),
      frameworks: frameworks.map((entry) => ({
        id: entry.id,
        key: entry.frameworkKey,
        name: entry.name,
        status: entry.status,
      })),
      validationOutputs: (policy?.requiredValidationKeys || []).map((value) => ({
        id: value,
        key: value,
        name: value,
        status: 'CONFIGURED',
      })),
      runtimePaths: runtimePaths.map((path) => ({
        id: path.id,
        key: path.pathKey,
        name: path.label,
        status: path.status,
        scope: path.scope,
        isProtected: Boolean(path.isProtected),
      })),
    },
    collisions: collisions.map((row) => ({
      id: row.id,
      key: row.key,
      name: row.name,
      status: row.status,
    })),
    summary: {
      frameworkPackages: referencedFrameworkPackages.length,
      activeFrameworkPackages: activeFrameworkPackages.length,
      agents: agents.length,
      skills: skills.length,
      frameworks: frameworks.length,
      validationOutputs: Array.isArray(policy?.requiredValidationKeys) ? policy.requiredValidationKeys.length : 0,
      runtimePaths: runtimePaths.length,
      priorityCollisions: collisions.length,
    },
    warnings,
    blocks: [],
  }
}

const getMockValueAtPath = (source, path) =>
  String(path ?? '')
    .split('.')
    .filter(Boolean)
    .reduce((current, segment) => {
      if (current === null || current === undefined) return undefined
      if (Array.isArray(current) && /^\d+$/.test(segment)) {
        return current[Number(segment)]
      }
      if (typeof current !== 'object') return undefined
      return current[segment]
    }, source)

const MOCK_FRAMEWORK_STATE_ROOT_PATH = 'framework_state'
const normalizeMockRegistryId = (value) => String(value ?? '').trim()

const isMockPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const mockDeepEqual = (left, right) => {
  if (Object.is(left, right)) return true

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false
    }

    return left.every((entry, index) => mockDeepEqual(entry, right[index]))
  }

  if (isMockPlainObject(left) || isMockPlainObject(right)) {
    if (!isMockPlainObject(left) || !isMockPlainObject(right)) {
      return false
    }

    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    if (leftKeys.length !== rightKeys.length) {
      return false
    }

    return leftKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(right, key) && mockDeepEqual(left[key], right[key]))
  }

  return false
}

const getMockFrameworkStateValueAtPath = (frameworkState, path) => {
  const normalizedPath = String(path ?? '').trim()
  if (!normalizedPath) return undefined

  const literalValue = getMockValueAtPath(frameworkState, normalizedPath)
  if (literalValue !== undefined) {
    return literalValue
  }

  const canUseRootFallback =
    frameworkState
    && typeof frameworkState === 'object'
    && !Array.isArray(frameworkState)
    && !Object.prototype.hasOwnProperty.call(frameworkState, MOCK_FRAMEWORK_STATE_ROOT_PATH)

  if (canUseRootFallback && normalizedPath === MOCK_FRAMEWORK_STATE_ROOT_PATH) {
    return frameworkState
  }

  if (!canUseRootFallback || !normalizedPath.startsWith(`${MOCK_FRAMEWORK_STATE_ROOT_PATH}.`)) {
    return undefined
  }

  return getMockValueAtPath(
    frameworkState,
    normalizedPath.slice(MOCK_FRAMEWORK_STATE_ROOT_PATH.length + 1),
  )
}

const canMockCoerceToNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return true
  if (typeof value === 'string' && String(value).trim() !== '') {
    return Number.isFinite(Number(value))
  }
  return false
}

const normalizeMockComparableScalar = (value) => {
  if (typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^(true|false)$/i.test(trimmed)) {
      return trimmed.toLowerCase() === 'true'
    }
    if (canMockCoerceToNumber(trimmed)) {
      return Number(trimmed)
    }
    return trimmed
  }
  return value
}

const mockValuesEqual = (left, right) => {
  if (Array.isArray(left) || Array.isArray(right)) {
    return mockDeepEqual(left, right)
  }

  return mockDeepEqual(
    normalizeMockComparableScalar(left),
    normalizeMockComparableScalar(right),
  )
}

const normalizeMockWorkflowPolicyOperator = (operator) => String(operator ?? '').trim().toLowerCase()
const MOCK_WORKFLOW_POLICY_OPERATOR_VALUES = Object.freeze({
  EQUALS: normalizeMockWorkflowPolicyOperator(WORKFLOW_POLICY_CONDITION_OPERATORS.EQUALS),
  NOT_EQUALS: normalizeMockWorkflowPolicyOperator(WORKFLOW_POLICY_CONDITION_OPERATORS.NOT_EQUALS),
  EXISTS: normalizeMockWorkflowPolicyOperator(WORKFLOW_POLICY_CONDITION_OPERATORS.EXISTS),
  NOT_EXISTS: normalizeMockWorkflowPolicyOperator(WORKFLOW_POLICY_CONDITION_OPERATORS.NOT_EXISTS),
  CONTAINS: normalizeMockWorkflowPolicyOperator(WORKFLOW_POLICY_CONDITION_OPERATORS.CONTAINS),
  IN: normalizeMockWorkflowPolicyOperator(WORKFLOW_POLICY_CONDITION_OPERATORS.IN),
  NOT_IN: normalizeMockWorkflowPolicyOperator(WORKFLOW_POLICY_CONDITION_OPERATORS.NOT_IN),
  GREATER_THAN: normalizeMockWorkflowPolicyOperator(WORKFLOW_POLICY_CONDITION_OPERATORS.GREATER_THAN),
  LESS_THAN: normalizeMockWorkflowPolicyOperator(WORKFLOW_POLICY_CONDITION_OPERATORS.LESS_THAN),
  GREATER_THAN_OR_EQUALS: normalizeMockWorkflowPolicyOperator(WORKFLOW_POLICY_CONDITION_OPERATORS.GREATER_THAN_OR_EQUALS),
  LESS_THAN_OR_EQUALS: normalizeMockWorkflowPolicyOperator(WORKFLOW_POLICY_CONDITION_OPERATORS.LESS_THAN_OR_EQUALS),
})

const evaluateMockWorkflowPolicyCondition = ({ operator, actualValue, expectedValue }) => {
  const normalizedOperator = normalizeMockWorkflowPolicyOperator(operator)

  switch (normalizedOperator) {
    case MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.EQUALS:
      return mockValuesEqual(actualValue, expectedValue)
    case MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.NOT_EQUALS:
      return !mockValuesEqual(actualValue, expectedValue)
    case MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.EXISTS:
      return actualValue !== undefined && actualValue !== null && String(actualValue).trim() !== ''
    case MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.NOT_EXISTS:
      return actualValue === undefined || actualValue === null || String(actualValue).trim() === ''
    case MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.CONTAINS:
      if (Array.isArray(actualValue)) {
        return actualValue.some((entry) => mockValuesEqual(entry, expectedValue))
      }
      return String(actualValue ?? '').includes(String(expectedValue ?? ''))
    case MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.IN: {
      const expectedList = Array.isArray(expectedValue) ? expectedValue : [expectedValue]
      if (Array.isArray(actualValue)) {
        return actualValue.some((entry) => expectedList.some((candidate) => mockValuesEqual(entry, candidate)))
      }
      return expectedList.some((candidate) => mockValuesEqual(actualValue, candidate))
    }
    case MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.NOT_IN: {
      const expectedList = Array.isArray(expectedValue) ? expectedValue : [expectedValue]
      if (Array.isArray(actualValue)) {
        return actualValue.every((entry) => expectedList.every((candidate) => !mockValuesEqual(entry, candidate)))
      }
      return expectedList.every((candidate) => !mockValuesEqual(actualValue, candidate))
    }
    case MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.GREATER_THAN:
    case MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.LESS_THAN:
    case MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.GREATER_THAN_OR_EQUALS:
    case MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.LESS_THAN_OR_EQUALS: {
      if (!canMockCoerceToNumber(actualValue) || !canMockCoerceToNumber(expectedValue)) {
        return false
      }

      const actualNumber = Number(actualValue)
      const expectedNumber = Number(expectedValue)

      if (normalizedOperator === MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.GREATER_THAN) return actualNumber > expectedNumber
      if (normalizedOperator === MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.LESS_THAN) return actualNumber < expectedNumber
      if (normalizedOperator === MOCK_WORKFLOW_POLICY_OPERATOR_VALUES.GREATER_THAN_OR_EQUALS) return actualNumber >= expectedNumber
      return actualNumber <= expectedNumber
    }
    default:
      return false
  }
}

const selectMockWorkflowPolicyTestAgent = (draft) => {
  const candidateAgentIds = [
    ...new Set([
      String(draft?.primaryAgentId ?? '').trim(),
      String(draft?.fallbackAgentId ?? '').trim(),
      ...(Array.isArray(draft?.requiredAgentIds) ? draft.requiredAgentIds : []),
    ].filter(Boolean)),
  ]
  const selectedFrameworkKeys = Array.isArray(draft?.frameworkKeys) ? draft.frameworkKeys : []
  const activeCompatibleAgents = (runtimeControlState.agents || []).filter((agent) => {
    if (!candidateAgentIds.includes(agent.id)) return false
    if (String(agent?.status ?? '').trim().toUpperCase() !== 'ACTIVE') return false
    const supportedFrameworkKeys = Array.isArray(agent?.supportedFrameworkKeys) ? agent.supportedFrameworkKeys : []
    return selectedFrameworkKeys.every((frameworkKey) => supportedFrameworkKeys.includes(frameworkKey))
  })

  const primaryAgentId = String(draft?.primaryAgentId ?? '').trim()
  const fallbackAgentId = String(draft?.fallbackAgentId ?? '').trim()
  const findAgent = (agentId) => activeCompatibleAgents.find((agent) => agent.id === agentId)
  const routingMode = String(draft?.routingMode ?? '').trim().toUpperCase()

  let chosenAgent = null
  if (routingMode === 'FIXED_AGENT') {
    chosenAgent = findAgent(primaryAgentId) ?? findAgent(fallbackAgentId) ?? null
  } else if (routingMode === 'FIRST_COMPATIBLE_ACTIVE_AGENT') {
    chosenAgent = activeCompatibleAgents[0] ?? null
  } else {
    chosenAgent = findAgent(primaryAgentId) ?? activeCompatibleAgents[0] ?? findAgent(fallbackAgentId) ?? null
  }

  const warnings = []
  if (!chosenAgent) {
    warnings.push('No ACTIVE compatible Agent could be selected for this test run.')
  } else if (fallbackAgentId && chosenAgent.id === fallbackAgentId) {
    warnings.push(`Fallback Agent "${chosenAgent.key}" was selected for this test run.`)
  }

  return {
    chosenAgent: chosenAgent
      ? {
          id: chosenAgent.id,
          key: chosenAgent.key,
          name: chosenAgent.name,
          status: chosenAgent.status,
        }
      : null,
    warnings,
  }
}

const findMockUnsupportedFrameworkKey = (supportedFrameworkKeys, selectedFrameworkKeys) => {
  const supportedSet = new Set(
    (Array.isArray(supportedFrameworkKeys) ? supportedFrameworkKeys : [])
      .map(normalizeFrameworkKey)
      .filter(Boolean),
  )

  return (Array.isArray(selectedFrameworkKeys) ? selectedFrameworkKeys : [])
    .map(normalizeFrameworkKey)
    .find((frameworkKey) => frameworkKey && !supportedSet.has(frameworkKey))
}

const validateMockWorkflowPolicyRegistryDependencies = ({
  status,
  frameworkKeys = [],
  requiredAgentIds = [],
  requiredSkillIds = [],
}) => {
  const errors = {}
  const normalizedRequiredAgentIds = Array.isArray(requiredAgentIds)
    ? requiredAgentIds.map(normalizeMockRegistryId).filter(Boolean)
    : []
  const normalizedRequiredSkillIds = Array.isArray(requiredSkillIds)
    ? requiredSkillIds.map(normalizeMockRegistryId).filter(Boolean)
    : []
  const normalizedFrameworkKeys = Array.isArray(frameworkKeys)
    ? frameworkKeys.map(normalizeFrameworkKey).filter(Boolean)
    : []
  const agentById = new Map(
    (runtimeControlState.agents || [])
      .map((agent) => [normalizeMockRegistryId(agent.id), agent])
      .filter(([id]) => id),
  )
  const skillById = new Map(
    (runtimeControlState.skills || [])
      .map((skill) => [normalizeMockRegistryId(skill.id), skill])
      .filter(([id]) => id),
  )

  const missingAgentIds = normalizedRequiredAgentIds.filter((agentId) => !agentById.has(agentId))
  if (missingAgentIds.length > 0) {
    errors.requiredAgentIds = `Unknown runtime agent ids: ${missingAgentIds.join(', ')}.`
  }

  const missingSkillIds = normalizedRequiredSkillIds.filter((skillId) => !skillById.has(skillId))
  if (missingSkillIds.length > 0) {
    errors.requiredSkillIds = `Unknown runtime skill ids: ${missingSkillIds.join(', ')}.`
  }

  if (!errors.requiredAgentIds) {
    for (const agentId of normalizedRequiredAgentIds) {
      const unsupportedFrameworkKey = findMockUnsupportedFrameworkKey(
        agentById.get(agentId)?.supportedFrameworkKeys,
        normalizedFrameworkKeys,
      )

      if (unsupportedFrameworkKey) {
        errors.requiredAgentIds =
          `Runtime agent "${agentId}" does not support framework key "${unsupportedFrameworkKey}".`
        break
      }
    }
  }

  if (!errors.requiredSkillIds) {
    for (const skillId of normalizedRequiredSkillIds) {
      const unsupportedFrameworkKey = findMockUnsupportedFrameworkKey(
        skillById.get(skillId)?.supportedFrameworkKeys,
        normalizedFrameworkKeys,
      )

      if (unsupportedFrameworkKey) {
        errors.requiredSkillIds =
          `Runtime skill "${skillId}" does not support framework key "${unsupportedFrameworkKey}".`
        break
      }
    }
  }

  const isActivePolicy = String(status ?? '').trim().toUpperCase() === 'ACTIVE'

  if (
    isActivePolicy
    && !errors.requiredAgentIds
    && normalizedRequiredAgentIds.length === 1
    && String(agentById.get(normalizedRequiredAgentIds[0])?.status ?? '').trim().toUpperCase() !== 'ACTIVE'
  ) {
    errors.requiredAgentIds =
      `Active workflow policies cannot depend on only inactive runtime agent "${normalizedRequiredAgentIds[0]}".`
  }

  if (
    isActivePolicy
    && !errors.requiredSkillIds
    && normalizedRequiredSkillIds.length === 1
    && String(skillById.get(normalizedRequiredSkillIds[0])?.status ?? '').trim().toUpperCase() !== 'ACTIVE'
  ) {
    errors.requiredSkillIds =
      `Active workflow policies cannot depend on only inactive runtime skill "${normalizedRequiredSkillIds[0]}".`
  }

  return errors
}

const buildMockWorkflowPolicyTestResult = ({
  draft = {},
  frameworkState = {},
  triggerEvent = '',
  actorScope = '',
}) => {
  const resolvedTriggerEvent = String(triggerEvent || draft.triggerEvent || '').trim().toUpperCase()
  const resolvedActorScope = String(actorScope || draft.actorScope || '').trim().toUpperCase()
  const policyTriggerEvent = String(draft?.triggerEvent ?? '').trim().toUpperCase()
  const policyActorScope = String(draft?.actorScope ?? '').trim().toUpperCase()
  const conditionRows = Array.isArray(draft?.conditions) ? draft.conditions : []
  const matchedConditions = conditionRows.map((condition) => {
    const actualValue = getMockFrameworkStateValueAtPath(frameworkState, condition?.path)
    return {
      path: String(condition?.path ?? '').trim(),
      operator: String(condition?.operator ?? '').trim(),
      expectedValue: condition?.value ?? '',
      actualValue: actualValue ?? null,
      matched: evaluateMockWorkflowPolicyCondition({
        operator: condition?.operator,
        actualValue,
        expectedValue: condition?.value,
      }),
      ...(condition?.logic ? { logic: String(condition.logic).trim().toUpperCase() } : {}),
    }
  })

  const conditionsMatched = matchedConditions.reduce((currentResult, conditionResult, index) => {
    if (index === 0) return conditionResult.matched
    const previousCondition = matchedConditions[index - 1]
    if (previousCondition?.logic === 'OR') {
      return currentResult || conditionResult.matched
    }
    return currentResult && conditionResult.matched
  }, matchedConditions.length === 0 ? true : false)

  const triggerMatched = resolvedTriggerEvent === policyTriggerEvent
  const actorMatched = policyActorScope === 'ANY' || resolvedActorScope === policyActorScope
  let outcome = triggerMatched && actorMatched && conditionsMatched ? 'PASS' : 'FAIL'

  const requiresRouting =
    String(draft?.decisionMode ?? '').trim().toUpperCase() === 'REQUIRE_AGENT_EVALUATION'
    || String(draft?.policyType ?? '').trim().toUpperCase() === 'ROUTING'
  const routingSelection = requiresRouting
    ? selectMockWorkflowPolicyTestAgent(draft)
    : { chosenAgent: null, warnings: [] }

  const executionTrace = [
    `Evaluating policy "${draft.name || draft.key}" for governed action "${draft.governedAction || '--'}".`,
    `Resolved trigger event: ${resolvedTriggerEvent || '--'}.`,
    `Resolved actor scope: ${resolvedActorScope || '--'}.`,
    matchedConditions.length > 0
      ? `Evaluated ${matchedConditions.length} governed condition row${matchedConditions.length === 1 ? '' : 's'}.`
      : 'No governed conditions are configured, so the condition phase passed automatically.',
  ]

  if (requiresRouting) {
    if (outcome === 'PASS' && routingSelection.chosenAgent) {
      executionTrace.push(`Selected governed Agent "${routingSelection.chosenAgent.key}" for routed execution.`)
    } else if (outcome === 'PASS') {
      executionTrace.push('Routing is required but no ACTIVE compatible Agent could be selected.')
      outcome = 'FAIL'
    } else {
      executionTrace.push('Routing preview skipped because the policy did not reach a passing state.')
    }
  }

  const selectedEffects = outcome === 'PASS'
    ? (Array.isArray(draft?.onPassEffects) ? draft.onPassEffects : [])
    : (Array.isArray(draft?.onFailEffects) ? draft.onFailEffects : [])

  executionTrace.push(
    `Selected ${selectedEffects.length} ${outcome === 'PASS' ? 'pass' : 'fail'} effect row${selectedEffects.length === 1 ? '' : 's'} for preview.`,
  )

  return {
    ok: true,
    outcome,
    triggerMatched,
    actorMatched,
    conditionsMatched,
    matchedConditions,
    chosenAgent: outcome === 'PASS' ? routingSelection.chosenAgent : null,
    stateEffectsPreview: {
      outcome,
      effects: selectedEffects,
    },
    executionTrace,
    warnings: routingSelection.warnings,
  }
}

const getFrameworkPackageRows = ({
  q = '',
  status = '',
  frameworkKey = '',
}) => {
  const normalizedSearch = normalizeSearch(q)
  const normalizedStatus = String(status ?? '').trim().toUpperCase()
  const normalizedFrameworkKey = normalizeFrameworkKey(frameworkKey)

  return runtimeControlState.frameworkPackages
    .filter((pkg) => {
      const matchesStatus = normalizedStatus ? pkg.status === normalizedStatus : true
      const matchesFramework = normalizedFrameworkKey
        ? pkg.frameworkKey === normalizedFrameworkKey
        : true
      const queryMatches = matchesSearch(normalizedSearch, [
        pkg.frameworkKey,
        pkg.frameworkName,
        pkg.version,
        pkg.description,
        pkg.status,
        JSON.stringify(pkg.sections ?? []),
        JSON.stringify(pkg.executionModel ?? {}),
        JSON.stringify(pkg.validationBindings ?? []),
        JSON.stringify(pkg.workflowBindings ?? []),
        pkg.uiContractKey,
        pkg.packageKey,
        pkg.packageName,
      ])

      return matchesStatus && matchesFramework && queryMatches
    })
    .map((pkg) => cloneFrameworkPackage(pkg))
}

const getUIContractRows = ({
  q = '',
  status = '',
  frameworkKey = '',
} = {}) => {
  const normalizedSearch = normalizeSearch(q)
  const normalizedStatus = String(status ?? '').trim().toUpperCase()
  const normalizedFrameworkKey = normalizeFrameworkKey(frameworkKey)

  return runtimeControlState.uiContracts
    .filter((contract) => {
      const matchesStatus = normalizedStatus ? contract.status === normalizedStatus : true
      const matchesFramework = normalizedFrameworkKey
        ? (contract.frameworkKeys ?? []).includes(normalizedFrameworkKey)
        : true
      const queryMatches = matchesSearch(normalizedSearch, [
        contract.uiContractKey,
        contract.name,
        contract.description,
        contract.status,
        contract.frameworkKeys,
        contract.compatibilityTags,
        JSON.stringify(contract.sections ?? []),
        JSON.stringify(contract.lifecycleStages ?? []),
        JSON.stringify(contract.actions ?? []),
      ])

      return matchesStatus && matchesFramework && queryMatches
    })
    .map((contract) => cloneUIContract(contract))
}

const findUIContractById = (uiContractId) =>
  runtimeControlState.uiContracts.find((contract) =>
    contract.id === uiContractId || contract.uiContractKey === uiContractId,
  )

const getFrameworkRegistryRows = ({
  q = '',
  status = '',
  type = '',
  structureType = '',
} = {}) => {
  const normalizedSearch = normalizeSearch(q)
  const normalizedStatus = String(status ?? '').trim().toUpperCase()
  const normalizedType = String(type ?? '').trim().toLowerCase()
  const normalizedStructureType = String(structureType ?? '').trim().toLowerCase()

  return runtimeControlState.frameworkRegistries
    .filter((entry) => {
      const matchesStatus = normalizedStatus ? entry.status === normalizedStatus : true
      const matchesType = normalizedType ? String(entry.type ?? '').trim().toLowerCase() === normalizedType : true
      const matchesStructureType = normalizedStructureType
        ? String(entry.structureType ?? '').trim().toLowerCase() === normalizedStructureType
        : true
      const queryMatches = matchesSearch(normalizedSearch, [
        entry.frameworkKey,
        entry.name,
        entry.type,
        entry.structureType,
        entry.supportedWorkflowKeys,
        JSON.stringify(entry.defaultBehaviorProfile ?? {}),
        entry.status,
      ])

      return matchesStatus && matchesType && matchesStructureType && queryMatches
    })
    .map((entry) => cloneFrameworkRegistryEntry(entry))
}

const getRuntimeAgentRows = ({
  q = '',
  status = '',
  frameworkKey = '',
}) => {
  const normalizedSearch = normalizeSearch(q)
  const normalizedStatus = String(status ?? '').trim().toUpperCase()
  const normalizedFrameworkKey = normalizeFrameworkKey(frameworkKey)

  return runtimeControlState.agents
    .filter((agent) => {
      const matchesStatus = normalizedStatus ? agent.status === normalizedStatus : true
      const matchesFramework = normalizedFrameworkKey
        ? agent.supportedFrameworkKeys.includes(normalizedFrameworkKey)
        : true
      const queryMatches = matchesSearch(normalizedSearch, [
        agent.key,
        agent.name,
        agent.description,
        agent.status,
        agent.supportedFrameworkKeys,
        agent.defaultSkillIds,
      ])

      return matchesStatus && matchesFramework && queryMatches
    })
    .map((agent) => cloneRuntimeAgent(agent))
}

const parseCsvKeys = (value) =>
  String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const getRuntimePathRows = ({
  q = '',
  status = '',
  frameworkKey = '',
  frameworkKeys = '',
  scope = '',
  operation = '',
  category = '',
  dataType = '',
  sourceType = '',
  isProtected = '',
} = {}) => {
  const normalizedSearch = normalizeSearch(q)
  const normalizedStatus = String(status ?? '').trim().toUpperCase()
  const normalizedFrameworkKey = normalizeFrameworkKey(frameworkKey)
  const normalizedFrameworkKeys = [
    ...(normalizedFrameworkKey ? [normalizedFrameworkKey] : []),
    ...parseCsvKeys(frameworkKeys).map(normalizeFrameworkKey),
  ].filter(Boolean)
  const uniqueFrameworkKeys = [...new Set(normalizedFrameworkKeys)]
  const normalizedScope = String(scope ?? '').trim().toUpperCase()
  const normalizedOperation = String(operation ?? '').trim().toUpperCase()
  const normalizedCategory = String(category ?? '').trim().toUpperCase()
  const normalizedDataType = String(dataType ?? '').trim().toUpperCase()
  const normalizedSourceType = String(sourceType ?? '').trim().toUpperCase()
  const normalizedIsProtected = String(isProtected ?? '').trim().toLowerCase()

  return runtimeControlState.runtimePaths
    .filter((row) => {
      const matchesStatus = normalizedStatus ? row.status === normalizedStatus : true
      const matchesFramework = uniqueFrameworkKeys.length > 0
        ? uniqueFrameworkKeys.some((key) => (row.frameworkKeys ?? []).includes(key))
        : true
      const matchesScope = normalizedScope ? String(row.scope ?? '').toUpperCase() === normalizedScope : true
      const matchesOperation = normalizedOperation
        ? (row.allowedOperations ?? []).includes(normalizedOperation)
        : true
      const matchesCategory = normalizedCategory ? String(row.category ?? '').toUpperCase() === normalizedCategory : true
      const matchesDataType = normalizedDataType ? String(row.dataType ?? '').toUpperCase() === normalizedDataType : true
      const matchesSourceType = normalizedSourceType ? String(row.sourceType ?? '').toUpperCase() === normalizedSourceType : true
      const matchesProtected = normalizedIsProtected === 'true'
        ? Boolean(row.isProtected)
        : normalizedIsProtected === 'false'
          ? !row.isProtected
          : true
      const queryMatches = matchesSearch(normalizedSearch, [
        row.pathKey,
        row.label,
        row.description,
        row.status,
        row.frameworkKeys,
        row.scope,
        row.allowedOperations,
        row.category,
        row.dataType,
        row.sourceType,
      ])

      return matchesStatus
        && matchesFramework
        && matchesScope
        && matchesOperation
        && matchesCategory
        && matchesDataType
        && matchesSourceType
        && matchesProtected
        && queryMatches
    })
    .map((entry) => cloneRuntimePathRegistryEntry(entry))
}

const getSkillRoleRows = ({
  q = '',
  status = '',
  sortBy = '',
  sortOrder = '',
} = {}) => {
  const normalizedSearch = normalizeSearch(q)
  const normalizedStatus = String(status ?? '').trim().toUpperCase()

  const rows = runtimeControlState.skillRoles
    .map((role) => attachSkillRoleUsageCount(role))
    .filter((role) => {
      const matchesStatus = normalizedStatus ? role.status === normalizedStatus : true
      const queryMatches = matchesSearch(normalizedSearch, [
        role.roleKey,
        role.label,
        role.description,
        role.status,
        role.category,
        role.allowedOperations,
        role.allowedReadScopes,
        role.allowedWriteScopes,
      ])

      return matchesStatus && queryMatches
    })

  return sortSkillRoleRows(rows, { sortBy, sortOrder })
}

const getRuntimeSkillRows = ({
  q = '',
  status = '',
  frameworkKey = '',
}) => {
  const normalizedSearch = normalizeSearch(q)
  const normalizedStatus = String(status ?? '').trim().toUpperCase()
  const normalizedFrameworkKey = normalizeFrameworkKey(frameworkKey)

  return runtimeControlState.skills
    .filter((skill) => {
      const matchesStatus = normalizedStatus ? skill.status === normalizedStatus : true
      const matchesFramework = normalizedFrameworkKey
        ? skill.supportedFrameworkKeys.includes(normalizedFrameworkKey)
        : true
      const queryMatches = matchesSearch(normalizedSearch, [
        skill.key,
        skill.name,
        skill.description,
        skill.status,
        skill.supportedFrameworkKeys,
        skill.skillRoleKey,
        skill.category,
        skill.type,
        skill.executionMode,
      ])

      return matchesStatus && matchesFramework && queryMatches
    })
    .map((skill) => cloneRuntimeSkill(skill))
}

const getValidationRegistryRows = ({
  q = '',
  keys = '',
  status = '',
  frameworkKey = '',
  frameworkKeys = '',
  category = '',
  severity = '',
  policyUsable = '',
  packageUsable = '',
  sortBy = '',
  sortOrder = '',
} = {}) => {
  const normalizedSearch = normalizeSearch(q)
  const normalizedStatus = String(status ?? '').trim().toUpperCase()
  const normalizedFrameworkKey = normalizeFrameworkKey(frameworkKey)
  const normalizedFrameworkKeys = String(frameworkKeys ?? '').trim()
    .split(',')
    .map((item) => normalizeFrameworkKey(item))
    .filter(Boolean)
  const allFrameworkKeys = [
    ...(normalizedFrameworkKey ? [normalizedFrameworkKey] : []),
    ...normalizedFrameworkKeys,
  ]
  const uniqueFrameworkKeys = [...new Set(allFrameworkKeys)]
  const normalizedCategory = String(category ?? '').trim().toUpperCase()
  const normalizedSeverity = String(severity ?? '').trim().toUpperCase()
  const normalizedPolicyUsable = String(policyUsable ?? '').trim().toLowerCase()
  const normalizedPackageUsable = String(packageUsable ?? '').trim().toLowerCase()
  const normalizedKeys = String(keys ?? '').trim()
    .split(',')
    .map((item) => String(item ?? '').trim().toLowerCase())
    .filter(Boolean)
  const keysSet = normalizedKeys.length > 0 ? new Set(normalizedKeys) : null

  const rows = runtimeControlState.validationRegistry
    .filter((row) => {
      const matchesStatus = normalizedStatus ? row.status === normalizedStatus : true
      const matchesFrameworks = uniqueFrameworkKeys.length > 0
        ? uniqueFrameworkKeys.every((key) => (row.supportedFrameworkKeys ?? []).includes(key))
        : true
      const matchesCategory = normalizedCategory ? String(row.category ?? '').trim().toUpperCase() === normalizedCategory : true
      const matchesSeverity = normalizedSeverity ? String(row.severity ?? '').trim().toUpperCase() === normalizedSeverity : true
      const matchesPolicyUsable = normalizedPolicyUsable === 'true'
        ? Boolean(row.policyUsable)
        : normalizedPolicyUsable === 'false'
          ? !row.policyUsable
          : true
      const matchesPackageUsable = normalizedPackageUsable === 'true'
        ? Boolean(row.packageUsable)
        : normalizedPackageUsable === 'false'
          ? !row.packageUsable
          : true
      const matchesKeys = keysSet ? keysSet.has(String(row.key ?? '').trim().toLowerCase()) : true
      const queryMatches = matchesSearch(normalizedSearch, [
        row.key,
        row.label,
        row.description,
        row.status,
        row.supportedFrameworkKeys,
        row.category,
        row.severity,
        row.producerSkillId,
        row.outputPath,
      ])

      return matchesStatus
        && matchesFrameworks
        && matchesCategory
        && matchesSeverity
        && matchesPolicyUsable
        && matchesPackageUsable
        && matchesKeys
        && queryMatches
    })
    .map((row) => cloneValidationRegistryEntry(row))

  const normalizedSortBy = String(sortBy ?? '').trim()
  const direction = String(sortOrder ?? '').trim().toLowerCase() === 'asc' ? 1 : -1
  const sorted = [...rows]
  sorted.sort((left, right) => {
    if (normalizedSortBy === 'label') {
      return direction * String(left?.label ?? '').localeCompare(String(right?.label ?? ''))
    }

    if (normalizedSortBy === 'updatedAt') {
      return direction * String(left?.updatedAt ?? '').localeCompare(String(right?.updatedAt ?? ''))
    }

    // Default: ACTIVE first, newest first, then key.
    return String(left?.status ?? '').localeCompare(String(right?.status ?? ''))
      || (-1 * String(left?.updatedAt ?? '').localeCompare(String(right?.updatedAt ?? '')))
      || String(left?.key ?? '').localeCompare(String(right?.key ?? ''))
  })

  return sorted
}

const getWorkflowPolicyRows = ({
  q = '',
  status = '',
  frameworkKey = '',
  type = '',
}) => {
  const normalizedSearch = normalizeSearch(q)
  const normalizedStatus = String(status ?? '').trim().toUpperCase()
  const normalizedFrameworkKey = normalizeFrameworkKey(frameworkKey)
  const normalizedType = String(type ?? '').trim().toUpperCase()

  return runtimeControlState.workflowPolicies
    .filter((policy) => {
      const matchesStatus = normalizedStatus ? policy.status === normalizedStatus : true
      const matchesFramework = normalizedFrameworkKey
        ? policy.frameworkKeys.includes(normalizedFrameworkKey)
        : true
      const matchesType = normalizedType ? String(policy.policyType ?? '').trim().toUpperCase() === normalizedType : true
      const queryMatches = matchesSearch(normalizedSearch, [
        policy.key,
        policy.name,
        policy.description,
        policy.status,
        policy.policyType,
        policy.triggerEvent,
        policy.triggerMode,
        policy.governedAction,
        policy.decisionMode,
        policy.routingMode,
        policy.primaryAgentId,
        policy.fallbackAgentId,
        policy.requiredValidationKeys,
        (policy.conditions ?? []).map((condition) => condition.path),
        (policy.onPassEffects ?? []).map((effect) => [effect.type, effect.targetPath, effect.value]),
        (policy.onFailEffects ?? []).map((effect) => [effect.type, effect.targetPath, effect.value]),
        policy.frameworkKeys,
        policy.orderedSteps,
        policy.requiredAgentIds,
        policy.requiredSkillIds,
        policy.gatingRules,
      ])

      return matchesStatus && matchesFramework && matchesType && queryMatches
    })
    .map((policy) => cloneWorkflowPolicy(policy))
}

const generateRuntimeId = (prefix, suffix = '') => {
  const safeSuffix = String(suffix ?? '')
    .trim()
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  const randomSegment = Math.random().toString(36).slice(2, 8)
  return [prefix, safeSuffix, randomSegment].filter(Boolean).join('-')
}

const generateMockObjectId = (seed = '') => {
  const source = String(seed || Math.random())
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619) >>> 0
  }

  return [
    hash,
    (hash ^ 0x9e3779b9) >>> 0,
    (hash ^ 0x85ebca6b) >>> 0,
  ]
    .map((part) => part.toString(16).padStart(8, '0'))
    .join('')
    .slice(0, 24)
}

const findFrameworkPackageById = (packageId) =>
  runtimeControlState.frameworkPackages.find((pkg) => pkg.id === packageId)

const getLatestRuntimeValidationVerdictForPackage = (packageId) => {
  return findFrameworkPackageById(packageId)?.runtimeVerdict || null
}

const getActiveMockRuntimeDeployment = (frameworkKey) =>
  (runtimeControlState.runtimeDeployments ?? [])
    .find((deployment) =>
      deployment.frameworkKey === frameworkKey
      && deployment.status === RUNTIME_DEPLOYMENT_STATUSES.ACTIVE
      && deployment.tenantScope === 'GLOBAL'
      && deployment.deploymentMode === 'PRODUCTION')

const buildMockRuntimeActivationReadiness = (pkg, checkpoint = null) => {
  const checkpointStatus = String(checkpoint?.status || pkg?.lastCheckpointStatus || '').trim().toUpperCase()
  const runtimeVerdict = getLatestRuntimeValidationVerdictForPackage(pkg?.id)
  const runtimeVerdictResult = String(runtimeVerdict?.result ?? '').trim().toUpperCase()
  const runtimeVerdictDependencyLockState = String(runtimeVerdict?.dependencyLockState ?? '').trim().toUpperCase()
  const runtimeVerdictAuditPersisted = runtimeVerdict?.auditPersisted === true
  const runtimeVerdictLastValidatedAt = runtimeVerdict?.lastValidatedAt ? new Date(runtimeVerdict.lastValidatedAt) : null
  const packageUpdatedAt = pkg?.updatedAt ? new Date(pkg.updatedAt) : null
  const dependencyLockStatus = String(pkg?.dependencyLock?.status ?? '').trim().toUpperCase()
  const dependencyLockResolvedAt = pkg?.dependencyLock?.resolvedAt || pkg?.dependencyLock?.lockedAt
    ? new Date(pkg.dependencyLock.resolvedAt || pkg.dependencyLock.lockedAt)
    : null
  const dependencyReferences = Array.isArray(pkg?.dependencyLock?.references) ? pkg.dependencyLock.references : []
  const activeDeployment = getActiveMockRuntimeDeployment(pkg?.frameworkKey)
  const runtimeVerdictStale =
    runtimeVerdictResult === 'ALLOW'
    && runtimeVerdictLastValidatedAt instanceof Date
    && !Number.isNaN(runtimeVerdictLastValidatedAt.getTime())
    && (
      (packageUpdatedAt instanceof Date && !Number.isNaN(packageUpdatedAt.getTime()) && packageUpdatedAt > runtimeVerdictLastValidatedAt)
      || (dependencyLockResolvedAt instanceof Date && !Number.isNaN(dependencyLockResolvedAt.getTime()) && dependencyLockResolvedAt > runtimeVerdictLastValidatedAt)
    )
  const runtimeVerdictCertified =
    runtimeVerdictResult === 'ALLOW'
    && runtimeVerdictAuditPersisted
    && runtimeVerdictDependencyLockState === 'LOCKED'
    && runtimeVerdictLastValidatedAt instanceof Date
    && !Number.isNaN(runtimeVerdictLastValidatedAt.getTime())
    && !runtimeVerdictStale
  let runtimeVerdictReason = 'RUNTIME_VERDICT_MISSING'
  if (runtimeVerdictCertified) {
    runtimeVerdictReason = 'RUNTIME_VERDICT_ALLOW'
  } else if (runtimeVerdictResult && runtimeVerdictResult !== 'ALLOW') {
    runtimeVerdictReason = 'RUNTIME_VERDICT_BLOCKED'
  } else if (
    runtimeVerdictResult === 'ALLOW'
    && (!runtimeVerdictAuditPersisted || !(runtimeVerdictLastValidatedAt instanceof Date) || Number.isNaN(runtimeVerdictLastValidatedAt.getTime()))
  ) {
    runtimeVerdictReason = 'RUNTIME_VERDICT_NOT_CERTIFIED'
  } else if (runtimeVerdictResult === 'ALLOW' && runtimeVerdictDependencyLockState !== 'LOCKED') {
    runtimeVerdictReason = 'RUNTIME_VERDICT_DEPENDENCY_LOCK_NOT_CERTIFIED'
  } else if (runtimeVerdictStale) {
    runtimeVerdictReason = 'RUNTIME_VERDICT_STALE'
  }
  const requirements = [
    {
      key: 'packageStatus',
      status: pkg?.status === FRAMEWORK_PACKAGE_STATUSES.VALIDATED ? 'PASS' : 'FAIL',
      reason: pkg?.status === FRAMEWORK_PACKAGE_STATUSES.VALIDATED
        ? 'FRAMEWORK_PACKAGE_VALIDATED'
        : 'FRAMEWORK_PACKAGE_ACTIVATION_REQUIRES_VALIDATED',
      message: pkg?.status === FRAMEWORK_PACKAGE_STATUSES.VALIDATED
        ? 'Package is validated.'
        : 'Only validated framework packages can be activated.',
    },
    {
      key: 'checkpoint',
      status: checkpointStatus === 'PASS' || checkpointStatus === 'PASS_WITH_WARNINGS' ? 'PASS' : 'FAIL',
      reason: checkpointStatus === 'PASS' || checkpointStatus === 'PASS_WITH_WARNINGS'
        ? 'RUNTIME_CHECKPOINT_READY'
        : 'RUNTIME_CHECKPOINT_NOT_READY',
      message: checkpointStatus === 'PASS' || checkpointStatus === 'PASS_WITH_WARNINGS'
        ? 'Checkpoint evidence allows activation.'
        : 'Latest checkpoint must be PASS or PASS_WITH_WARNINGS before activation.',
    },
    {
      key: 'runtimeVerdict',
      status: runtimeVerdictCertified ? 'PASS' : 'FAIL',
      reason: runtimeVerdictReason,
      message: runtimeVerdictCertified
        ? 'Runtime Validation verdict allows activation.'
        : 'Latest certified Runtime Validation verdict must be ALLOW before activation.',
    },
    {
      key: 'dependencyLock',
      status: dependencyLockStatus === 'PASS' && dependencyReferences.length > 0 ? 'PASS' : 'FAIL',
      reason: dependencyLockStatus === 'PASS' && dependencyReferences.length > 0
        ? 'DEPENDENCY_LOCK_LOCKED'
        : 'DEPENDENCY_LOCK_NOT_LOCKED',
      message: dependencyLockStatus === 'PASS' && dependencyReferences.length > 0
        ? 'Dependency lock evidence is certified.'
        : 'A locked dependency snapshot is required before activation.',
    },
    {
      key: 'activeDeployment',
      status: activeDeployment ? 'WARN' : 'PASS',
      reason: activeDeployment ? 'RUNTIME_DEPLOYMENT_WILL_SUPERSEDE' : 'RUNTIME_DEPLOYMENT_NO_CONFLICT',
      message: activeDeployment
        ? 'Existing active deployment will be superseded.'
        : 'No active runtime deployment conflict exists.',
    },
  ]
  const blockingRequirements = requirements.filter((item) => item.status === 'FAIL')
  return {
    ready: blockingRequirements.length === 0,
    status: blockingRequirements.length === 0 ? 'READY' : 'BLOCKED',
    packageStatus: String(pkg?.status ?? '').trim().toUpperCase(),
    checkpointStatus: checkpointStatus || 'NOT_RUN',
    runtimeVerdict: runtimeVerdict
      ? {
          ...runtimeVerdict,
          dependencyLockState: runtimeVerdictDependencyLockState,
          stale: runtimeVerdictStale,
        }
      : null,
    dependencyLockState: dependencyLockStatus === 'PASS' && dependencyReferences.length > 0 ? 'LOCKED' : 'NOT_LOCKED',
    dependencySnapshotId: pkg?.dependencyLock?.snapshotId || '',
    dependencyReferenceCount: dependencyReferences.length,
    supersedesDeploymentId: activeDeployment?.deploymentId || null,
    requirements,
    blockingReasons: blockingRequirements.map((item) => item.reason),
  }
}

const findFrameworkRegistryById = (registryId) =>
  runtimeControlState.frameworkRegistries.find((entry) => entry.id === registryId)

const findRuntimeAgentById = (agentId) =>
  runtimeControlState.agents.find((agent) => agent.id === agentId)

const findRuntimePathById = (pathId) =>
  runtimeControlState.runtimePaths.find((row) => row.id === pathId)

const findRuntimePathByPathKey = (pathKey) => {
  const normalizedPathKey = String(pathKey ?? '').trim()
  return runtimeControlState.runtimePaths.find(
    (row) => String(row.pathKey ?? '').trim() === normalizedPathKey,
  )
}

const getPackageValidationKeys = (pkg = {}) => [
  ...new Set([
    ...(Array.isArray(pkg.validationBindings)
      ? pkg.validationBindings.map((binding) => binding?.validationKey)
      : []),
    ...(Array.isArray(pkg.sections)
      ? pkg.sections.flatMap((section) => Array.isArray(section?.validationKeys) ? section.validationKeys : [])
      : []),
  ].map((value) => String(value ?? '').trim().toLowerCase()).filter(Boolean)),
]

const getPackageWorkflowPolicyKeys = (pkg = {}) => [
  ...new Set((Array.isArray(pkg.workflowBindings) ? pkg.workflowBindings : [])
    .map((binding) => String(binding?.policyKey ?? '').trim().toLowerCase())
    .filter(Boolean)),
]

const buildMockDependencyRow = ({
  id,
  key,
  name,
  status = 'UNKNOWN',
  source = 'PACKAGE',
  frameworkCompatible = true,
  issues = [],
  ...rest
}) => ({
  id: id || key || '',
  key: key || id || '',
  name: name || key || id || '',
  status,
  source,
  frameworkCompatible,
  issues,
  ...rest,
})

const buildMockFrameworkPackageDependencies = (pkg) => {
  const frameworkKey = normalizeFrameworkKey(pkg?.frameworkKey)
  const validationKeys = getPackageValidationKeys(pkg)
  const workflowPolicyKeys = getPackageWorkflowPolicyKeys(pkg)
  const validations = validationKeys.map((validationKey) => {
    const row = (runtimeControlState.validationRegistry || []).find((entry) => entry.key === validationKey)
    const issues = []
    if (!row) issues.push(`Validation "${validationKey}" was not found.`)
    else {
      if (row.status !== 'ACTIVE') issues.push('Validation must be ACTIVE.')
      if (row.packageUsable === false) issues.push('Validation must be package-usable.')
      if (!(row.supportedFrameworkKeys || []).includes(frameworkKey)) {
        issues.push(`Validation is not compatible with framework "${frameworkKey}".`)
      }
    }
    return buildMockDependencyRow({
      id: row?.id || validationKey,
      key: row?.key || validationKey,
      name: row?.label || validationKey,
      status: row?.status || 'MISSING',
      source: 'validationBindings',
      frameworkCompatible: issues.length === 0,
      issues,
      outputPath: row?.outputPath || '',
      producerSkillId: row?.producerSkillId || '',
    })
  })

  const workflowPolicies = workflowPolicyKeys.map((policyKey) => {
    const row = (runtimeControlState.workflowPolicies || []).find((entry) => entry.key === policyKey)
    const issues = []
    if (!row) issues.push(`Workflow policy "${policyKey}" was not found.`)
    else {
      if (row.status !== 'ACTIVE') issues.push('Workflow policy must be ACTIVE.')
      if (!(row.frameworkKeys || []).includes(frameworkKey)) {
        issues.push(`Workflow policy is not compatible with framework "${frameworkKey}".`)
      }
    }
    return buildMockDependencyRow({
      id: row?.id || policyKey,
      key: row?.key || policyKey,
      name: row?.name || policyKey,
      status: row?.status || 'MISSING',
      source: 'workflowBindings',
      frameworkCompatible: issues.length === 0,
      issues,
    })
  })

  const workflowRows = workflowPolicyKeys
    .map((policyKey) => (runtimeControlState.workflowPolicies || []).find((entry) => entry.key === policyKey))
    .filter(Boolean)
  const validationRows = validationKeys
    .map((validationKey) => (runtimeControlState.validationRegistry || []).find((entry) => entry.key === validationKey))
    .filter(Boolean)
  const agentIds = [
    ...new Set([
      ...workflowRows.flatMap((policy) => [
        policy.primaryAgentId,
        policy.fallbackAgentId,
        ...(Array.isArray(policy.requiredAgentIds) ? policy.requiredAgentIds : []),
      ]),
      ...validationRows.flatMap((validation) =>
        Array.isArray(validation.defaultAgentIds) ? validation.defaultAgentIds : []),
    ].map((value) => String(value ?? '').trim()).filter(Boolean)),
  ]
  const agents = agentIds.map((agentId) => {
    const row = findRuntimeAgentById(agentId)
    const issues = []
    if (!row) issues.push(`Runtime Agent "${agentId}" was not found.`)
    else if (!(row.supportedFrameworkKeys || []).includes(frameworkKey)) {
      issues.push(`Runtime Agent is not compatible with framework "${frameworkKey}".`)
    }
    return buildMockDependencyRow({
      id: row?.id || agentId,
      key: row?.key || agentId,
      name: row?.name || agentId,
      status: row?.status || 'MISSING',
      source: 'workflow/validation',
      frameworkCompatible: issues.length === 0,
      issues,
    })
  })

  const agentRows = agentIds.map((agentId) => findRuntimeAgentById(agentId)).filter(Boolean)
  const skillIds = [
    ...new Set([
      ...workflowRows.flatMap((policy) => Array.isArray(policy.requiredSkillIds) ? policy.requiredSkillIds : []),
      ...validationRows.map((validation) => validation.producerSkillId),
      ...agentRows.flatMap((agent) => [
        ...(Array.isArray(agent.defaultSkillIds) ? agent.defaultSkillIds : []),
        ...(Array.isArray(agent.primarySkillIds) ? agent.primarySkillIds : []),
        ...(Array.isArray(agent.optionalSkillIds) ? agent.optionalSkillIds : []),
        ...(Array.isArray(agent.executionPlan) ? agent.executionPlan.map((step) => step?.skillId) : []),
      ]),
    ].map((value) => String(value ?? '').trim()).filter(Boolean)),
  ]
  const skills = skillIds.map((skillId) => {
    const row = findRuntimeSkillById(skillId)
    const issues = []
    if (!row) issues.push(`Runtime Skill "${skillId}" was not found.`)
    else if (!(row.supportedFrameworkKeys || []).includes(frameworkKey)) {
      issues.push(`Runtime Skill is not compatible with framework "${frameworkKey}".`)
    }
    return buildMockDependencyRow({
      id: row?.id || skillId,
      key: row?.key || skillId,
      name: row?.name || skillId,
      status: row?.status || 'MISSING',
      source: 'workflow/validation/agent',
      frameworkCompatible: issues.length === 0,
      issues,
      skillRoleKey: row?.skillRoleKey || '',
      category: row?.category || '',
    })
  })

  const sectionRuntimePaths = (pkg.sections || []).map((section) => section.runtimePath).filter(Boolean)
  const validationRuntimePaths = validationRows.flatMap((validation) => [
    validation.outputPath,
    validation.passFieldPath,
    validation.detailsFieldPath,
  ])
  const workflowRuntimePaths = workflowRows.flatMap((policy) => [
    ...(Array.isArray(policy.conditions) ? policy.conditions.map((condition) => condition?.path) : []),
    ...(Array.isArray(policy.onPassEffects) ? policy.onPassEffects.map((effect) => effect?.targetPath) : []),
    ...(Array.isArray(policy.onFailEffects) ? policy.onFailEffects.map((effect) => effect?.targetPath) : []),
  ])
  const runtimePathKeys = [
    ...new Set([...sectionRuntimePaths, ...validationRuntimePaths, ...workflowRuntimePaths]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean)),
  ]
  const runtimePaths = runtimePathKeys.map((pathKey) => {
    const row = findRuntimePathByPathKey(pathKey)
    const issues = []
    if (!row) issues.push(`Runtime path "${pathKey}" was not found.`)
    else if (row.status !== 'ACTIVE') issues.push('Runtime path must be ACTIVE.')
    return buildMockDependencyRow({
      id: row?.id || pathKey,
      key: row?.pathKey || pathKey,
      name: row?.label || pathKey,
      status: row?.status || 'MISSING',
      source: sectionRuntimePaths.includes(pathKey)
        ? 'sections'
        : validationRuntimePaths.includes(pathKey)
          ? 'validation'
          : 'workflow',
      frameworkCompatible: issues.length === 0,
      issues,
      scope: row?.scope || '',
      category: row?.category || '',
      isProtected: Boolean(row?.isProtected),
    })
  })

  const uiContractRow = pkg.uiContractKey ? findUIContractById(pkg.uiContractKey) : null
  const uiContractIssues = []
  if (pkg.uiContractKey && !uiContractRow) {
    uiContractIssues.push(`UI Contract "${pkg.uiContractKey}" was not found.`)
  } else if (uiContractRow) {
    if (uiContractRow.status !== UI_CONTRACT_STATUSES.ACTIVE) {
      uiContractIssues.push(`UI Contract must be ACTIVE; current status is ${uiContractRow.status}.`)
    }
    if (uiContractRow.versionStatus !== 'ACTIVE') {
      uiContractIssues.push(`UI Contract version status must be ACTIVE; current version status is ${uiContractRow.versionStatus || 'UNKNOWN'}.`)
    }
    if (!(uiContractRow.frameworkKeys || []).includes(frameworkKey)) {
      uiContractIssues.push(`UI Contract is not compatible with framework "${frameworkKey}".`)
    }
  }
  const uiContract = pkg.uiContractKey
    ? buildMockDependencyRow({
        id: uiContractRow?.id || pkg.uiContractKey,
        key: uiContractRow?.uiContractKey || pkg.uiContractKey,
        name: uiContractRow?.name || pkg.uiContractKey,
        status: uiContractRow?.status || 'MISSING',
        source: 'uiContractKey',
        frameworkCompatible: uiContractIssues.length === 0,
        issues: uiContractIssues,
        version: uiContractRow?.sourcePackageVersion || uiContractRow?.introducedInVersion || '',
        compatibilityMode: uiContractRow?.compatibilityMode || '',
        componentVersion: Number(uiContractRow?.componentVersion) || 1,
        versionStatus: uiContractRow?.versionStatus || '',
        lineageId: uiContractRow?.lineageId || uiContractRow?.id || '',
        isLocked: Boolean(uiContractRow?.isLocked),
        lockedAt: uiContractRow?.lockedAt || null,
        lockedByPackageKeys: Array.isArray(uiContractRow?.lockedByPackageKeys)
          ? uiContractRow.lockedByPackageKeys
          : [],
      })
    : null

  const allRows = [
    ...agents,
    ...skills,
    ...runtimePaths,
    ...validations,
    ...workflowPolicies,
    ...(uiContract ? [uiContract] : []),
  ]

  return {
    id: pkg.id,
    frameworkKey,
    packageKey: pkg.packageKey || '',
    summary: {
      agents: agents.length,
      skills: skills.length,
      runtimePaths: runtimePaths.length,
      validations: validations.length,
      workflowPolicies: workflowPolicies.length,
      uiContract: uiContract ? 1 : 0,
      issues: allRows.reduce((count, row) => count + (Array.isArray(row.issues) ? row.issues.length : 0), 0),
    },
    agents,
    skills,
    runtimePaths,
    validations,
    workflowPolicies,
    uiContract,
  }
}

const buildMockDependencyResolutionIntegrityChecks = (dependencies = {}) => {
  const dependencyGroups = [
    { key: 'agents', label: 'Resolved Agents', field: 'workflowBindings' },
    { key: 'skills', label: 'Resolved Skills', field: 'workflowBindings' },
    { key: 'runtimePaths', label: 'Resolved Runtime Paths', field: 'sections' },
    { key: 'validations', label: 'Resolved Validations', field: 'validationBindings' },
    { key: 'workflowPolicies', label: 'Resolved Workflow Policies', field: 'workflowBindings' },
    { key: 'uiContract', label: 'Resolved UI Contract', field: 'uiContractKey', singleton: true },
  ]

  return dependencyGroups.map(({ key, label, field, singleton = false }) => {
    const rows = singleton
      ? (dependencies[key] ? [dependencies[key]] : [])
      : (Array.isArray(dependencies[key]) ? dependencies[key] : [])
    const issueRows = rows.filter((row) => Array.isArray(row.issues) && row.issues.length > 0)

    return {
      key: `dependencies.${key}`,
      group: 'Dependency Integrity',
      severity: issueRows.length > 0 ? 'FAIL' : 'PASS',
      message: rows.length === 0
        ? `${label} are not required by this package.`
        : issueRows.length > 0
          ? `${label} have unresolved issues: ${issueRows
            .map((row) => `${row.key || row.id}: ${(row.issues || []).join(' ')}`)
            .join(' ')}`
          : `${label} resolve without dependency issues.`,
      field,
      ...(issueRows.length > 0
        ? {
            details: {
              issues: issueRows.map((row) => ({
                key: row.key || row.id,
                status: row.status,
                issues: row.issues,
              })),
            },
          }
        : {}),
    }
  })
}

const buildMockFrameworkPackageIntegrity = (pkg) => {
  const checks = []
  const ready = ['VALIDATED', 'ACTIVE'].includes(String(pkg.status ?? '').trim().toUpperCase())
  const packageKey = String(pkg.packageKey ?? '').trim()
  checks.push({
    key: 'packageKey.required',
    group: 'Configuration Integrity',
    severity: packageKey ? 'PASS' : ready ? 'FAIL' : 'WARN',
    message: packageKey ? 'Package key is present.' : 'Package key is required before validation.',
    field: 'packageKey',
  })
  const sections = Array.isArray(pkg.sections) ? pkg.sections : []
  const sectionKeys = sections.map((section) => String(section.sectionKey ?? '').trim()).filter(Boolean)
  checks.push({
    key: 'sections.uniqueKeys',
    group: 'Sections Integrity',
    severity: sectionKeys.length === new Set(sectionKeys).size ? 'PASS' : 'FAIL',
    message: sectionKeys.length === new Set(sectionKeys).size ? 'Section keys are unique.' : 'Section keys must be unique.',
    field: 'sections',
  })
  checks.push({
    key: 'uiContract.required',
    group: 'UI Contract Integrity',
    severity: sections.length > 0 && !pkg.uiContractKey ? ready ? 'FAIL' : 'WARN' : 'PASS',
    message: sections.length > 0 && !pkg.uiContractKey
      ? 'UI Contract is required before validation when sections are configured.'
      : 'UI Contract binding is present or not required.',
    field: 'uiContractKey',
  })
  const dependencies = buildMockFrameworkPackageDependencies(pkg)
  checks.push(...buildMockDependencyResolutionIntegrityChecks(dependencies))
  const externalStateMissing =
    String(pkg.stateModelMode ?? '').trim().toUpperCase() === 'EXTERNAL'
    && (!String(pkg.stateModelKey ?? '').trim() || !String(pkg.stateModelVersion ?? '').trim())
  checks.push({
    key: 'stateContract.consistency',
    group: 'State Contract Integrity',
    severity: externalStateMissing ? 'FAIL' : 'PASS',
    message: externalStateMissing
      ? 'External state model mode requires a key and version.'
      : 'State Contract fields are internally consistent.',
    field: externalStateMissing ? 'stateModelKey' : 'stateModelMode',
  })
  checks.push({
    key: 'outputs.metadataOnly',
    group: 'Output Placeholder Integrity',
    severity: 'PASS',
    message: 'Output fields are metadata placeholders only.',
    field: 'availableOutputKeys',
  })
  const summary = checks.reduce(
    (counts, check) => ({
      ...counts,
      [String(check.severity).toLowerCase()]: (counts[String(check.severity).toLowerCase()] || 0) + 1,
    }),
    { pass: 0, warn: 0, fail: 0 },
  )
  return {
    schemaVersion: '1',
    id: pkg.id,
    frameworkKey: pkg.frameworkKey,
    packageKey: pkg.packageKey,
    version: pkg.version,
    packageStatus: pkg.status,
    status: summary.fail > 0 ? 'FAIL' : summary.warn > 0 ? 'WARN' : 'PASS',
    summary,
    checks,
  }
}

const buildMockCheckpointCode = (value) =>
  String(value || 'checkpoint.issue')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    || 'CHECKPOINT_ISSUE'

const buildMockFrameworkPackageDependencyLock = (pkg, dependencies = buildMockFrameworkPackageDependencies(pkg)) => {
  const now = new Date().toISOString()
  const dependencyRows = [
    ...(dependencies.agents ?? []).map((row) => ({ ...row, collectionKey: 'RuntimeAgent' })),
    ...(dependencies.skills ?? []).map((row) => ({ ...row, collectionKey: 'RuntimeSkill' })),
    ...(dependencies.runtimePaths ?? []).map((row) => ({ ...row, collectionKey: 'RuntimePathRegistry' })),
    ...(dependencies.validations ?? []).map((row) => ({ ...row, collectionKey: 'ValidationRegistry' })),
    ...(dependencies.workflowPolicies ?? []).map((row) => ({ ...row, collectionKey: 'WorkflowPolicy' })),
    ...(dependencies.uiContract ? [{ ...dependencies.uiContract, collectionKey: 'UIContract' }] : []),
  ]
  const hasIssues = dependencyRows.some((row) => Array.isArray(row.issues) && row.issues.length > 0)

  return {
    status: hasIssues ? 'FAIL' : 'PASS',
    resolvedAt: now,
    resolvedBy: null,
    packageKey: pkg.packageKey || '',
    packageVersion: pkg.version || '',
    references: dependencyRows.map((row) => ({
      collectionKey: row.collectionKey,
      id: row.id || row.key || '',
      key: row.key || '',
      name: row.name || '',
      status: row.status || '',
      versionStatus: row.versionStatus || 'ACTIVE',
      componentVersion: Number(row.componentVersion) || 1,
      lineageId: row.lineageId || row.id || row.key || '',
      lockedAt: row.lockedAt || null,
      issues: Array.isArray(row.issues) ? row.issues : [],
    })),
  }
}

const buildMockFrameworkPackageDependencyGraph = (pkg, dependencies = buildMockFrameworkPackageDependencies(pkg)) => {
  const packageNodeId = `framework-package:${pkg.id || pkg.packageKey || 'package'}`
  const nodes = [
    {
      id: packageNodeId,
      type: 'FrameworkPackage',
      key: pkg.packageKey || '',
      label: pkg.packageName || `${pkg.frameworkKey} ${pkg.version}`,
      status: pkg.status || '',
      issueCount: 0,
    },
  ]
  const edges = []
  const groups = [
    ['agents', 'RuntimeAgent'],
    ['skills', 'RuntimeSkill'],
    ['runtimePaths', 'RuntimePathRegistry'],
    ['validations', 'ValidationRegistry'],
    ['workflowPolicies', 'WorkflowPolicy'],
    ['uiContract', 'UIContract'],
  ]

  for (const [groupKey, type] of groups) {
    const rows = groupKey === 'uiContract'
      ? (dependencies.uiContract ? [dependencies.uiContract] : [])
      : (dependencies[groupKey] ?? [])
    for (const row of rows) {
      const nodeId = `${type}:${row.id || row.key || nodes.length}`
      nodes.push({
        id: nodeId,
        type,
        key: row.key || row.id || '',
        label: row.name || row.key || row.id || type,
        status: row.status || '',
        issueCount: Array.isArray(row.issues) ? row.issues.length : 0,
      })
      edges.push({
        id: `${packageNodeId}->${nodeId}`,
        from: packageNodeId,
        to: nodeId,
        relationship: row.source || groupKey,
      })
    }
  }

  return {
    nodes,
    edges,
    summary: {
      nodes: nodes.length,
      edges: edges.length,
      issueNodes: nodes.filter((node) => Number(node.issueCount) > 0).length,
    },
  }
}

const buildMockFrameworkPackageCheckpoint = (pkg, { mode = 'FULL' } = {}) => {
  const checkpointPkg = {
    ...pkg,
    status: String(mode ?? '').trim().toUpperCase() === 'ACTIVATION'
      ? FRAMEWORK_PACKAGE_STATUSES.ACTIVE
      : FRAMEWORK_PACKAGE_STATUSES.VALIDATED,
  }
  const dependencies = buildMockFrameworkPackageDependencies(checkpointPkg)
  const dependencyLockPreview = buildMockFrameworkPackageDependencyLock(checkpointPkg, dependencies)
  const integrity = buildMockFrameworkPackageIntegrity(checkpointPkg)
  const checks = (integrity.checks ?? []).map((check) => {
    if (check.key === 'dependencyLock.snapshot' && check.severity === 'WARN' && dependencyLockPreview.status !== 'FAIL') {
      return {
        ...check,
        severity: 'PASS',
        message: 'Dependency lock snapshot can be created by this checkpoint.',
      }
    }
    return check
  })
  const issues = checks
    .filter((check) => String(check.severity ?? '').toUpperCase() !== 'PASS')
    .map((check) => ({
      code: buildMockCheckpointCode(check.key),
      severity: check.severity === 'FAIL' ? 'BLOCKING' : 'WARNING',
      category: check.group || 'Runtime Architecture Checkpoint',
      message: check.message,
      path: check.field || check.key,
      source: check.group || 'Runtime Architecture Checkpoint',
    }))
  const errors = issues.filter((issue) => issue.severity === 'BLOCKING')
  const warnings = issues.filter((issue) => issue.severity === 'WARNING')
  const passedChecks = checks
    .filter((check) => String(check.severity ?? '').toUpperCase() === 'PASS')
    .map((check) => ({
      code: buildMockCheckpointCode(check.key),
      category: check.group || 'Runtime Architecture Checkpoint',
      message: check.message,
      path: check.field || check.key,
      source: check.group || 'Runtime Architecture Checkpoint',
    }))

  return {
    id: pkg.id,
    frameworkKey: pkg.frameworkKey,
    packageKey: pkg.packageKey || '',
    packageVersion: pkg.version || '',
    mode: String(mode ?? 'FULL').trim().toUpperCase() || 'FULL',
    status: errors.length > 0 ? 'FAIL' : warnings.length > 0 ? 'PASS_WITH_WARNINGS' : 'PASS',
    errors,
    warnings,
    issues,
    passedChecks,
    dependencyGraph: buildMockFrameworkPackageDependencyGraph(checkpointPkg, dependencies),
    dependencyLockPreview,
    summary: {
      totalChecks: passedChecks.length + warnings.length + errors.length,
      passed: passedChecks.length,
      warnings: warnings.length,
      failed: errors.length,
      resolvedReferences: dependencyLockPreview.references.length,
    },
    timestamp: new Date().toISOString(),
    runBy: { ...RUNTIME_CONTROL_UPDATED_BY },
  }
}

const compactMockCheckpointForValidationError = (checkpoint = {}) => {
  const compactCheckpoint = { ...(checkpoint || {}) }
  delete compactCheckpoint.dependencyGraph
  delete compactCheckpoint.dependencyLockPreview
  delete compactCheckpoint.passedChecks
  return compactCheckpoint
}

const buildMockCheckpointValidationError = (checkpoint) => ({
  error: {
    status: 422,
    data: {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Runtime Architecture Checkpoint failed.',
        details: checkpoint.errors.reduce((details, issue) => ({
          ...details,
          [issue.path || issue.code]: issue.message,
        }), {}),
        checkpoint: compactMockCheckpointForValidationError(checkpoint),
      },
    },
  },
})

const MOCK_RUNTIME_VALIDATION_CODES = Object.freeze({
  SCOPE_OUTSIDE_ALLOWED: 'RVL-SCOPE-001',
  PATH_INVALID: 'RVL-PATH-002',
  OUTPUT_CONTRACT_INVALID: 'RVL-OUTPUT-003',
  LIFECYCLE_TRANSITION_INVALID: 'RVL-LIFECYCLE-004',
  SKILL_INVALID: 'RVL-SKILL-007',
  DEPENDENCY_INVALID: 'RVL-DEPENDENCY-008',
  EXECUTION_INVALID: 'RVL-EXECUTION-009',
})

const MOCK_RUNTIME_LIFECYCLE_TRANSITIONS = Object.freeze({
  DRAFT: ['IN_REVIEW', 'VALIDATION', 'ARCHIVED'],
  IN_REVIEW: ['DRAFT', 'APPROVED', 'REJECTED'],
  VALIDATION: ['DRAFT', 'APPROVED', 'REJECTED'],
  APPROVED: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['LOCKED', 'DEPRECATED'],
  LOCKED: ['ARCHIVED'],
  REJECTED: ['DRAFT', 'ARCHIVED'],
  DEPRECATED: ['ARCHIVED'],
  ARCHIVED: [],
})

const normalizeMockRuntimeValidationMode = (value) => {
  const normalized = String(value ?? 'STRICT').trim().toUpperCase()
  return ['STRICT', 'WARN_ONLY', 'AUDIT_ONLY', 'DISABLED'].includes(normalized)
    ? normalized
    : 'STRICT'
}

const buildMockRuntimeValidationIssue = ({
  code,
  severity = 'ERROR',
  message,
  path = '',
  source = 'runtime-validation',
}) => ({
  code,
  severity,
  message,
  path,
  source,
})

const mockRuntimeScopeMatches = (scopePattern, runtimePath) => {
  const pattern = String(scopePattern ?? '').trim()
  const path = String(runtimePath ?? '').trim()
  if (!pattern || !path) return false
  if (pattern === path) return true
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2)
    return path === prefix || path.startsWith(`${prefix}.`)
  }
  const patternSegments = pattern.split('.')
  const pathSegments = path.split('.')
  if (patternSegments.length !== pathSegments.length) return false
  return patternSegments.every((segment, index) => segment === '*' || segment === pathSegments[index])
}

const mockRuntimeScopeBoundaryIssue = ({ runtimePath, operation, source }) => buildMockRuntimeValidationIssue({
  code: MOCK_RUNTIME_VALIDATION_CODES.SCOPE_OUTSIDE_ALLOWED,
  severity: 'BLOCKING',
  message: `Runtime path "${runtimePath}" is not covered by the configured ${String(operation ?? 'runtime').toUpperCase()} scopes.`,
  path: 'runtimePath',
  source,
})

const mockRuntimePathAllowedByScopes = (scopes = [], runtimePath = '') => {
  const normalizedScopes = normalizeRuntimePathList(scopes)
  if (normalizedScopes.length === 0) return true
  return normalizedScopes.some((scope) => mockRuntimeScopeMatches(scope, runtimePath))
}

const validateMockRuntimeOutputContract = ({ outputContract = {}, payload }) => {
  if (!outputContract || typeof outputContract !== 'object' || Array.isArray(outputContract)) return []
  const required = Array.isArray(outputContract.required) ? outputContract.required : []
  const properties = outputContract.properties && typeof outputContract.properties === 'object'
    ? outputContract.properties
    : {}
  const issues = []

  for (const requiredKey of required) {
    if (!Object.prototype.hasOwnProperty.call(payload ?? {}, requiredKey)) {
      issues.push(buildMockRuntimeValidationIssue({
        code: MOCK_RUNTIME_VALIDATION_CODES.OUTPUT_CONTRACT_INVALID,
        severity: 'BLOCKING',
        message: `Runtime output / must have required property "${requiredKey}".`,
        path: `payload.${requiredKey}`,
        source: 'runtime-output-validator',
      }))
    }
  }

  for (const [propertyKey, propertySchema] of Object.entries(properties)) {
    if (!Object.prototype.hasOwnProperty.call(payload ?? {}, propertyKey)) continue
    const expectedType = String(propertySchema?.type ?? '').trim().toLowerCase()
    if (!expectedType) continue
    const actualValue = payload[propertyKey]
    const actualType = Array.isArray(actualValue) ? 'array' : typeof actualValue
    if (actualType !== expectedType) {
      issues.push(buildMockRuntimeValidationIssue({
        code: MOCK_RUNTIME_VALIDATION_CODES.OUTPUT_CONTRACT_INVALID,
        severity: 'BLOCKING',
        message: `Runtime output /${propertyKey} must be ${expectedType}.`,
        path: `payload.${propertyKey}`,
        source: 'runtime-output-validator',
      }))
    }
  }

  if (outputContract.additionalProperties === false && payload && typeof payload === 'object' && !Array.isArray(payload)) {
    for (const propertyKey of Object.keys(payload)) {
      if (Object.prototype.hasOwnProperty.call(properties, propertyKey)) continue
      issues.push(buildMockRuntimeValidationIssue({
        code: MOCK_RUNTIME_VALIDATION_CODES.OUTPUT_CONTRACT_INVALID,
        severity: 'BLOCKING',
        message: `Runtime output / must NOT have additional property "${propertyKey}".`,
        path: `payload.${propertyKey}`,
        source: 'runtime-output-validator',
      }))
    }
  }

  return issues
}

const validateMockRuntimeOperation = (payload = {}) => {
  const mode = normalizeMockRuntimeValidationMode(payload.mode)
  const operationType = String(payload.operationType ?? '').trim().toUpperCase()
  const operation = String(payload.operation ?? (['STATE_MUTATION', 'STATE_WRITE'].includes(operationType) ? 'WRITE' : 'READ')).trim().toUpperCase()
  const runtimePath = String(payload.runtimePath ?? '').trim()
  const frameworkKey = normalizeFrameworkKey(payload.frameworkKey)
  const issues = []

  if (mode === 'DISABLED') {
    issues.push(buildMockRuntimeValidationIssue({
      code: MOCK_RUNTIME_VALIDATION_CODES.EXECUTION_INVALID,
      severity: 'INFO',
      message: 'Runtime validation is disabled for this operation.',
      path: 'mode',
      source: 'runtime-validation-engine',
    }))
  } else {
    const packageId = String(payload.packageId ?? '').trim()
    if (packageId) {
      const pkg = findFrameworkPackageById(packageId)
      if (!pkg) {
        issues.push(buildMockRuntimeValidationIssue({
          code: MOCK_RUNTIME_VALIDATION_CODES.DEPENDENCY_INVALID,
          severity: 'ERROR',
          message: `Framework package "${packageId}" was not found.`,
          path: 'packageId',
          source: 'runtime-dependency-validator',
        }))
      } else if (!pkg.dependencyLock) {
        issues.push(buildMockRuntimeValidationIssue({
          code: MOCK_RUNTIME_VALIDATION_CODES.DEPENDENCY_INVALID,
          severity: 'ERROR',
          message: `Framework package "${pkg.packageKey || packageId}" does not have a dependency lock snapshot.`,
          path: 'packageId',
          source: 'runtime-dependency-validator',
        }))
      }
    }

    if (['STATE_MUTATION', 'STATE_READ', 'STATE_WRITE'].includes(operationType)) {
      const runtimePathRow = findRuntimePathByPathKey(runtimePath)
      if (!runtimePath) {
        issues.push(buildMockRuntimeValidationIssue({
          code: MOCK_RUNTIME_VALIDATION_CODES.PATH_INVALID,
          severity: 'BLOCKING',
          message: 'Runtime path is required for state mutation validation.',
          path: 'runtimePath',
          source: 'runtime-mutation-validator',
        }))
      } else if (!runtimePathRow) {
        issues.push(buildMockRuntimeValidationIssue({
          code: MOCK_RUNTIME_VALIDATION_CODES.PATH_INVALID,
          severity: 'BLOCKING',
          message: `Runtime path "${runtimePath}" is not registered.`,
          path: 'runtimePath',
          source: 'runtime-mutation-validator',
        }))
      } else {
        if (runtimePathRow.status !== 'ACTIVE') {
          issues.push(buildMockRuntimeValidationIssue({
            code: MOCK_RUNTIME_VALIDATION_CODES.PATH_INVALID,
            severity: 'BLOCKING',
            message: `Runtime path "${runtimePath}" must be ACTIVE before runtime use.`,
            path: 'runtimePath',
            source: 'runtime-mutation-validator',
          }))
        }
        if (frameworkKey && Array.isArray(runtimePathRow.frameworkKeys) && runtimePathRow.frameworkKeys.length > 0 && !runtimePathRow.frameworkKeys.includes(frameworkKey)) {
          issues.push(buildMockRuntimeValidationIssue({
            code: MOCK_RUNTIME_VALIDATION_CODES.PATH_INVALID,
            severity: 'BLOCKING',
            message: `Runtime path "${runtimePath}" does not support framework "${frameworkKey}".`,
            path: 'runtimePath',
            source: 'runtime-mutation-validator',
          }))
        }
        if (!normalizeRuntimePathList(runtimePathRow.allowedOperations, { upper: true }).includes(operation)) {
          issues.push(buildMockRuntimeValidationIssue({
            code: MOCK_RUNTIME_VALIDATION_CODES.PATH_INVALID,
            severity: 'BLOCKING',
            message: `Runtime path "${runtimePath}" does not allow ${operation}.`,
            path: 'runtimePath',
            source: 'runtime-mutation-validator',
          }))
        }
        if (operation === 'WRITE' && runtimePathRow.isProtected) {
          issues.push(buildMockRuntimeValidationIssue({
            code: MOCK_RUNTIME_VALIDATION_CODES.PATH_INVALID,
            severity: 'BLOCKING',
            message: `Runtime path "${runtimePath}" is protected from runtime writes.`,
            path: 'runtimePath',
            source: 'runtime-mutation-validator',
          }))
        }
      }

      const skill = payload.skillId ? findRuntimeSkillById(payload.skillId) : null
      if (payload.skillId && !skill) {
        issues.push(buildMockRuntimeValidationIssue({
          code: MOCK_RUNTIME_VALIDATION_CODES.SKILL_INVALID,
          severity: 'BLOCKING',
          message: `Runtime skill "${payload.skillId}" was not found.`,
          path: 'skillId',
          source: 'runtime-mutation-validator',
        }))
      }
      if (skill && skill.status !== 'ACTIVE') {
        issues.push(buildMockRuntimeValidationIssue({
          code: MOCK_RUNTIME_VALIDATION_CODES.SKILL_INVALID,
          severity: 'BLOCKING',
          message: `Runtime skill "${skill.key || skill.id}" must be ACTIVE before runtime use.`,
          path: 'skillId',
          source: 'runtime-mutation-validator',
        }))
      }
      if (skill && operation === 'WRITE' && !mockRuntimePathAllowedByScopes(skill.allowedWritePaths, runtimePath)) {
        issues.push(mockRuntimeScopeBoundaryIssue({
          runtimePath,
          operation,
          source: 'runtime-skill-boundary-validator',
        }))
      }
      if (skill && operation === 'WRITE' && normalizeRuntimePathList(skill.forbiddenWritePaths).some((scope) => mockRuntimeScopeMatches(scope, runtimePath))) {
        issues.push(buildMockRuntimeValidationIssue({
          code: MOCK_RUNTIME_VALIDATION_CODES.SCOPE_OUTSIDE_ALLOWED,
          severity: 'BLOCKING',
          message: `Runtime path "${runtimePath}" is explicitly forbidden by the skill boundary.`,
          path: 'runtimePath',
          source: 'runtime-skill-boundary-validator',
        }))
      }

      const roleKey = String(payload.skillRoleKey ?? skill?.skillRoleKey ?? '').trim().toUpperCase()
      const skillRole = roleKey ? findSkillRoleByRoleKey(roleKey) : null
      if (roleKey && !skillRole) {
        issues.push(buildMockRuntimeValidationIssue({
          code: MOCK_RUNTIME_VALIDATION_CODES.SKILL_INVALID,
          severity: 'BLOCKING',
          message: `Skill role "${roleKey}" was not found.`,
          path: 'skillRoleKey',
          source: 'runtime-mutation-validator',
        }))
      }
      if (skillRole && skillRole.status !== 'ACTIVE') {
        issues.push(buildMockRuntimeValidationIssue({
          code: MOCK_RUNTIME_VALIDATION_CODES.SKILL_INVALID,
          severity: 'BLOCKING',
          message: `Skill role "${skillRole.roleKey}" must be ACTIVE before runtime use.`,
          path: 'skillRoleKey',
          source: 'runtime-mutation-validator',
        }))
      }
      if (skillRole && !normalizeRuntimePathList(skillRole.allowedOperations, { upper: true }).includes(operation)) {
        issues.push(buildMockRuntimeValidationIssue({
          code: MOCK_RUNTIME_VALIDATION_CODES.SKILL_INVALID,
          severity: 'BLOCKING',
          message: `Skill role "${skillRole.roleKey}" does not allow ${operation}.`,
          path: 'skillRoleKey',
          source: 'runtime-mutation-validator',
        }))
      }
      if (skillRole && operation === 'WRITE' && !mockRuntimePathAllowedByScopes(skillRole.allowedWriteScopes, runtimePath)) {
        issues.push(mockRuntimeScopeBoundaryIssue({
          runtimePath,
          operation,
          source: 'runtime-skill-role-boundary-validator',
        }))
      }
    }

    if (operationType === 'OUTPUT_VALIDATION') {
      issues.push(...validateMockRuntimeOutputContract({
        outputContract: payload.outputContract,
        payload: payload.payload,
      }))
    }

    if (operationType === 'LIFECYCLE_TRANSITION') {
      const fromStage = String(payload.lifecycleStage ?? '').trim().toUpperCase()
      const toStage = String(payload.targetLifecycleStage ?? '').trim().toUpperCase()
      if (!fromStage || !toStage || !MOCK_RUNTIME_LIFECYCLE_TRANSITIONS[fromStage]?.includes(toStage)) {
        issues.push(buildMockRuntimeValidationIssue({
          code: MOCK_RUNTIME_VALIDATION_CODES.LIFECYCLE_TRANSITION_INVALID,
          severity: 'BLOCKING',
          message: fromStage && toStage
            ? `Lifecycle transition ${fromStage} -> ${toStage} is not allowed.`
            : 'Lifecycle transition validation requires both lifecycleStage and targetLifecycleStage.',
          path: !fromStage ? 'lifecycleStage' : 'targetLifecycleStage',
          source: 'runtime-transition-validator',
        }))
      }
    }
  }

  const blocking = issues.some((issue) =>
    ['ERROR', 'BLOCKING', 'CRITICAL'].includes(String(issue.severity ?? '').trim().toUpperCase())
    && mode !== 'AUDIT_ONLY'
    && mode !== 'DISABLED',
  )
  const validationIssues = issues.length > 0 ? issues : [buildMockRuntimeValidationIssue({
    code: MOCK_RUNTIME_VALIDATION_CODES.EXECUTION_INVALID,
    severity: 'INFO',
    message: 'Runtime validation passed.',
    path: '',
    source: 'runtime-validation-engine',
  })]
  const hasFailedIssue = validationIssues.some((issue) =>
    ['ERROR', 'BLOCKING', 'CRITICAL'].includes(String(issue.severity ?? '').trim().toUpperCase()))
  const hasWarningIssue = validationIssues.some((issue) =>
    String(issue.severity ?? '').trim().toUpperCase() === 'WARN')
  const timestamp = new Date().toISOString()
  const validationId = generateRuntimeId('rvl', operationType || 'runtime-validation')
  let status = 'PASS'
  if (blocking) {
    status = 'FAIL'
  } else if (hasFailedIssue || hasWarningIssue) {
    status = 'WARN'
  }
  let result = 'ALLOW'
  if (mode === 'AUDIT_ONLY') {
    result = 'AUDIT_ONLY'
  } else if (blocking) {
    result = 'BLOCK'
  }

  return {
    validationId,
    status,
    result,
    mode,
    operationType,
    operation,
    runtimePath,
    packageId: String(payload.packageId ?? '').trim(),
    frameworkKey,
    workspaceId: String(payload.workspaceId ?? '').trim(),
    actorId: RUNTIME_CONTROL_UPDATED_BY.id,
    actorType: String(payload.actorType ?? 'USER').trim().toUpperCase(),
    validationCode: validationIssues[0]?.code || MOCK_RUNTIME_VALIDATION_CODES.EXECUTION_INVALID,
    severity: validationIssues.find((issue) => ['ERROR', 'BLOCKING', 'CRITICAL'].includes(issue.severity))?.severity || validationIssues[0]?.severity || 'INFO',
    message: blocking ? 'Runtime validation blocked this operation.' : 'Runtime validation allowed this operation.',
    issues: validationIssues,
    summary: {
      totalChecks: validationIssues.length,
      passed: validationIssues.filter((issue) => issue.severity === 'INFO').length,
      warnings: validationIssues.filter((issue) => issue.severity === 'WARN').length,
      failed: validationIssues.filter((issue) => ['ERROR', 'BLOCKING', 'CRITICAL'].includes(issue.severity)).length,
    },
    timestamp,
    beforeState: payload.beforeState ?? null,
    afterState: payload.afterState ?? null,
  }
}

const buildMockRuntimeValidationError = (validation) => ({
  error: {
    status: 422,
    data: {
      error: {
        code: 'RUNTIME_VALIDATION_FAILED',
        message: validation.message,
        details: validation.issues.reduce((details, issue) => ({
          ...details,
          [issue.path || issue.code]: issue.message,
        }), {}),
        validation,
      },
    },
  },
})

const getActiveFrameworkRegistryKeys = () =>
  new Set(
    runtimeControlState.frameworkRegistries
      .filter((entry) => String(entry.status ?? '').trim().toUpperCase() === 'ACTIVE')
      .map((entry) => normalizeFrameworkKey(entry.frameworkKey))
      .filter(Boolean),
  )

const normalizeRuntimePathList = (values, { upper = false } = {}) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value ?? '').trim())
    .map((value) => (upper ? value.toUpperCase() : value))
    .filter(Boolean))]

const normalizeRuntimePathValueLabels = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  return Object.entries(value).reduce((labels, [rawKey, rawValue]) => {
    const key = String(rawKey ?? '').trim()
    const label = String(rawValue ?? '').trim()
    if (key && label) labels[key] = label
    return labels
  }, {})
}

const normalizeRuntimePathNullableText = (value) => String(value ?? '').trim() || null

const buildRuntimePathMockPayload = (payload = {}, existing = {}) => ({
  ...existing,
  ...(payload.pathKey !== undefined ? { pathKey: String(payload.pathKey ?? '').trim() } : {}),
  ...(payload.label !== undefined ? { label: String(payload.label ?? '').trim() } : {}),
  ...(payload.description !== undefined ? { description: String(payload.description ?? '').trim() } : {}),
  ...(payload.status !== undefined ? { status: String(payload.status ?? '').trim().toUpperCase() } : {}),
  ...(payload.frameworkKeys !== undefined ? { frameworkKeys: normalizeRuntimePathList(payload.frameworkKeys, { upper: true }) } : {}),
  ...(payload.scope !== undefined ? { scope: String(payload.scope ?? '').trim().toUpperCase() } : {}),
  ...(payload.allowedOperations !== undefined ? { allowedOperations: normalizeRuntimePathList(payload.allowedOperations, { upper: true }) } : {}),
  ...(payload.dataType !== undefined ? { dataType: String(payload.dataType ?? '').trim().toUpperCase() } : {}),
  ...(payload.category !== undefined ? { category: String(payload.category ?? '').trim().toUpperCase() } : {}),
  ...(payload.sourceType !== undefined ? { sourceType: String(payload.sourceType ?? '').trim().toUpperCase() } : {}),
  ...(payload.isProtected !== undefined ? { isProtected: Boolean(payload.isProtected) } : {}),
  ...(payload.isSystem !== undefined ? { isSystem: Boolean(payload.isSystem) } : {}),
  ...(payload.introducedInVersion !== undefined ? { introducedInVersion: String(payload.introducedInVersion ?? '').trim() } : {}),
  ...(payload.deprecatedInVersion !== undefined ? { deprecatedInVersion: normalizeRuntimePathNullableText(payload.deprecatedInVersion) } : {}),
  ...(payload.replacementPathKey !== undefined ? { replacementPathKey: String(payload.replacementPathKey ?? '').trim() } : {}),
  ...(payload.notes !== undefined ? { notes: String(payload.notes ?? '').trim() } : {}),
  ...(payload.displayOrder !== undefined && String(payload.displayOrder ?? '').trim() !== ''
    ? { displayOrder: Number(payload.displayOrder) }
    : payload.displayOrder !== undefined
      ? { displayOrder: undefined }
      : {}),
  ...(payload.exampleValue !== undefined ? { exampleValue: payload.exampleValue } : {}),
  ...(payload.compatibilityTags !== undefined ? { compatibilityTags: normalizeRuntimePathList(payload.compatibilityTags) } : {}),
  ...(payload.allowedValues !== undefined ? { allowedValues: normalizeRuntimePathList(payload.allowedValues) } : {}),
  ...(payload.allowedValueLabels !== undefined ? { allowedValueLabels: normalizeRuntimePathValueLabels(payload.allowedValueLabels) } : {}),
  ...(payload.uiControl !== undefined ? { uiControl: String(payload.uiControl ?? '').trim().toUpperCase() } : {}),
  ...(payload.placeholderText !== undefined ? { placeholderText: String(payload.placeholderText ?? '').trim() } : {}),
  ...(payload.helpText !== undefined ? { helpText: String(payload.helpText ?? '').trim() } : {}),
  ...(payload.defaultValue !== undefined ? { defaultValue: payload.defaultValue } : {}),
  ...(payload.minValue !== undefined && String(payload.minValue ?? '').trim() !== ''
    ? { minValue: Number(payload.minValue) }
    : payload.minValue !== undefined
      ? { minValue: undefined }
      : {}),
  ...(payload.maxValue !== undefined && String(payload.maxValue ?? '').trim() !== ''
    ? { maxValue: Number(payload.maxValue) }
    : payload.maxValue !== undefined
      ? { maxValue: undefined }
      : {}),
  ...(payload.minLength !== undefined && String(payload.minLength ?? '').trim() !== ''
    ? { minLength: Number(payload.minLength) }
    : payload.minLength !== undefined
      ? { minLength: undefined }
      : {}),
  ...(payload.maxLength !== undefined && String(payload.maxLength ?? '').trim() !== ''
    ? { maxLength: Number(payload.maxLength) }
    : payload.maxLength !== undefined
      ? { maxLength: undefined }
      : {}),
  ...(payload.regexPattern !== undefined ? { regexPattern: String(payload.regexPattern ?? '').trim() } : {}),
  ...(payload.isNullable !== undefined ? { isNullable: Boolean(payload.isNullable) } : {}),
})

const validateMockRuntimePathPayload = (payload = {}, { isEditMode = false } = {}) => {
  const errors = {}

  if (!isEditMode && !String(payload.pathKey ?? '').trim()) {
    errors.pathKey = 'Path key is required.'
  }

  if (!String(payload.label ?? '').trim()) {
    errors.label = 'Label is required.'
  }

  if (!String(payload.description ?? '').trim()) {
    errors.description = 'Description is required.'
  }

  const frameworkKeys = normalizeRuntimePathList(payload.frameworkKeys, { upper: true })
  if (frameworkKeys.length === 0) {
    errors.frameworkKeys = 'At least one framework key is required.'
  } else {
    const activeFrameworkKeys = getActiveFrameworkRegistryKeys()
    const inactiveKey = frameworkKeys.find((frameworkKey) => !activeFrameworkKeys.has(frameworkKey))
    if (inactiveKey) {
      errors.frameworkKeys = `Inactive framework key "${inactiveKey}".`
    }
  }

  const allowedOperations = normalizeRuntimePathList(payload.allowedOperations, { upper: true })
  if (allowedOperations.length === 0) {
    errors.allowedOperations = 'At least one allowed operation is required.'
  }

  for (const field of ['status', 'scope', 'dataType', 'category', 'sourceType']) {
    if (!String(payload[field] ?? '').trim()) {
      errors[field] = `${field} is required.`
    }
  }

  return errors
}

const buildMockRuntimePathDependencies = (pathKey) => {
  const normalizedPathKey = String(pathKey ?? '').trim()
  const skills = (runtimeControlState.skills || [])
    .filter((skill) =>
      [...(skill.allowedReadPaths || []), ...(skill.allowedWritePaths || []), ...(skill.forbiddenWritePaths || [])]
        .includes(normalizedPathKey),
    )
    .map((skill) => ({
      id: skill.id,
      key: skill.key,
      name: skill.name,
      status: skill.status,
    }))

  const agents = (runtimeControlState.agents || [])
    .filter((agent) => (Array.isArray(agent.executionPlan) ? agent.executionPlan : []).some((step) =>
      [...(step.readsFrom || []), ...(step.writesTo || [])].includes(normalizedPathKey),
    ))
    .map((agent) => ({
      id: agent.id,
      key: agent.key,
      name: agent.name,
      status: agent.status,
    }))

  const workflowPolicies = (runtimeControlState.workflowPolicies || [])
    .filter((policy) => [
      ...(Array.isArray(policy.conditions) ? policy.conditions.map((condition) => condition.path) : []),
      ...(Array.isArray(policy.onPassEffects) ? policy.onPassEffects.map((effect) => effect.targetPath) : []),
      ...(Array.isArray(policy.onFailEffects) ? policy.onFailEffects.map((effect) => effect.targetPath) : []),
    ].includes(normalizedPathKey))
    .map((policy) => ({
      id: policy.id,
      key: policy.key,
      name: policy.name,
      status: policy.status,
    }))

  const validations = (runtimeControlState.validationRegistry || [])
    .filter((validation) =>
      [validation.outputPath, validation.passFieldPath, validation.detailsFieldPath].includes(normalizedPathKey),
    )
    .map((validation) => ({
      id: validation.id,
      key: validation.key,
      label: validation.label,
      status: validation.status,
    }))

  const items = [
    ...skills.map((skill) => ({ sourceType: 'Runtime Skill', sourceId: skill.id, sourceKey: skill.key, sourceLabel: skill.name, status: skill.status })),
    ...agents.map((agent) => ({ sourceType: 'Runtime Agent', sourceId: agent.id, sourceKey: agent.key, sourceLabel: agent.name, status: agent.status })),
    ...workflowPolicies.map((policy) => ({ sourceType: 'Workflow Policy', sourceId: policy.id, sourceKey: policy.key, sourceLabel: policy.name, status: policy.status })),
    ...validations.map((validation) => ({ sourceType: 'Validation Registry', sourceId: validation.id, sourceKey: validation.key, sourceLabel: validation.label, status: validation.status })),
  ]
  const activeItems = items.filter((item) => String(item.status ?? '').trim().toUpperCase() === 'ACTIVE')

  return {
    skillIds: skills.map((skill) => skill.id).filter(Boolean),
    agentIds: agents.map((agent) => agent.id).filter(Boolean),
    workflowPolicyIds: workflowPolicies.map((policy) => policy.id).filter(Boolean),
    validationIds: validations.map((validation) => validation.id).filter(Boolean),
    frameworkPackageIds: [],
    skills,
    agents,
    workflowPolicies,
    validations,
    frameworkPackages: [],
    items,
    summary: {
      skills: skills.length,
      agents: agents.length,
      workflowPolicies: workflowPolicies.length,
      validations: validations.length,
      frameworkPackages: 0,
      total: items.length,
      active: activeItems.length,
    },
    hasDependencies: items.length > 0,
    hasActiveDependencies: activeItems.length > 0,
  }
}

const buildRuntimePathDependencyConfirmationError = (dependencies) => ({
  error: {
    status: 409,
    data: {
      error: {
        code: 'DEPENDENCY_CONFIRMATION_REQUIRED',
        message: 'Runtime path has active dependencies. Confirm the lifecycle change to continue.',
        details: {
          dependencies,
          confirmDependencies: 'Set confirmDependencies to true after reviewing dependencies.',
        },
      },
    },
  },
})

const validateMockRuntimeAgent = (agent) => {
  const errors = {}
  const warnings = []
  const activeFrameworkKeys = getActiveFrameworkRegistryKeys()
  const supportedFrameworkKeys = Array.isArray(agent?.supportedFrameworkKeys)
    ? agent.supportedFrameworkKeys.map((value) => normalizeFrameworkKey(value)).filter(Boolean)
    : []
  const supportedFrameworkKeySet = new Set(supportedFrameworkKeys)
  const requiredSkillRoleKeys = Array.isArray(agent?.requiredSkillRoleKeys)
    ? [...new Set(agent.requiredSkillRoleKeys.map((value) => String(value ?? '').trim().toUpperCase()).filter(Boolean))]
    : []
  const assignedSkillIds = [...new Set([
    ...(Array.isArray(agent?.defaultSkillIds) ? agent.defaultSkillIds : []),
    ...(Array.isArray(agent?.primarySkillIds) ? agent.primarySkillIds : []),
    ...(Array.isArray(agent?.optionalSkillIds) ? agent.optionalSkillIds : []),
  ].map((value) => String(value ?? '').trim()).filter(Boolean))]
  const skillLookup = new Map(
    runtimeControlState.skills.map((skill) => [String(skill.id ?? '').trim(), skill]).filter(([id]) => id),
  )

  if (!String(agent?.key ?? '').trim()) {
    errors.key = 'Agent key is required.'
  }

  if (!String(agent?.name ?? '').trim()) {
    errors.name = 'Agent name is required.'
  }

  if (supportedFrameworkKeys.length === 0) {
    errors.supportedFrameworkKeys = 'At least one supported framework key is required.'
  } else {
    const invalidFrameworkKey = supportedFrameworkKeys.find(
      (frameworkKey) => !activeFrameworkKeys.has(frameworkKey),
    )

    if (invalidFrameworkKey) {
      errors.supportedFrameworkKeys = `Inactive framework key "${invalidFrameworkKey}".`
    }
  }

  if (requiredSkillRoleKeys.length > 0) {
    const unknownRoleKey = requiredSkillRoleKeys.find((roleKey) => !findSkillRoleByRoleKey(roleKey))
    if (unknownRoleKey) {
      errors.requiredSkillRoleKeys = `Required skill role "${unknownRoleKey}" was not found.`
    }

    if (!errors.requiredSkillRoleKeys) {
      const inactiveRoleKey = requiredSkillRoleKeys.find((roleKey) => {
        const role = findSkillRoleByRoleKey(roleKey)
        return String(role?.status ?? '').trim().toUpperCase() !== SKILL_ROLE_REGISTRY_STATUSES.ACTIVE
      })

      if (inactiveRoleKey) {
        errors.requiredSkillRoleKeys = `Required skill role "${inactiveRoleKey}" must be ACTIVE.`
      }
    }
  }

  const executionPlan = Array.isArray(agent?.executionPlan) ? agent.executionPlan : []
  if (executionPlan.length === 0) {
    errors.executionPlan = 'Execution plan must contain at least one step.'
  } else {
    const seenSkillIds = new Set()

    for (let index = 0; index < executionPlan.length; index += 1) {
      const step = executionPlan[index]
      const stepNumber = index + 1
      const skillId = String(step?.skillId ?? '').trim()
      const readsFrom = normalizePathSelectionList(step?.readsFrom)
      const writesTo = normalizePathSelectionList(step?.writesTo)

      if (!skillId) {
        errors.executionPlan = `Step ${stepNumber} is missing a skill id.`
        break
      }

      if (seenSkillIds.has(skillId)) {
        errors.executionPlan = `Duplicate skill "${skillId}" is not allowed in the execution plan.`
        break
      }
      seenSkillIds.add(skillId)

      if (!assignedSkillIds.includes(skillId)) {
        errors.executionPlan = `Skill "${skillId}" must be assigned before it can be used in the execution plan.`
        break
      }

      const skill = skillLookup.get(skillId)
      if (!skill) {
        errors.executionPlan = `Unknown skill id "${skillId}".`
        break
      }

      if (String(skill?.status ?? '').trim().toUpperCase() !== 'ACTIVE') {
        errors.executionPlan = `Skill "${skillId}" is not ACTIVE and cannot be used in the execution plan.`
        break
      }

      const compatibleSkill = (Array.isArray(skill?.supportedFrameworkKeys) ? skill.supportedFrameworkKeys : [])
        .some((frameworkKey) => supportedFrameworkKeySet.has(normalizeFrameworkKey(frameworkKey)))
      if (supportedFrameworkKeySet.size > 0 && !compatibleSkill) {
        errors.executionPlan = `Skill "${skillId}" is not compatible with the selected frameworks.`
        break
      }

      const invalidReadPath = readsFrom.find((pathKey) => {
        const runtimePath = getRuntimePathRows({
          frameworkKeys: supportedFrameworkKeys.join(','),
          operation: 'READ',
          status: 'ACTIVE',
        }).find((row) => row.pathKey === pathKey)
        return !runtimePath
      })

      if (invalidReadPath) {
        errors.executionPlan = `Step ${stepNumber} reads from unknown runtime path "${invalidReadPath}".`
        break
      }

      const invalidWritePath = writesTo.find((pathKey) => {
        const runtimePath = getRuntimePathRows({
          frameworkKeys: supportedFrameworkKeys.join(','),
          operation: 'WRITE',
          status: 'ACTIVE',
        }).find((row) => row.pathKey === pathKey)
        return !runtimePath || Boolean(runtimePath.isProtected)
      })

      if (invalidWritePath) {
        const runtimePath = getRuntimePathRows({ status: 'ACTIVE' }).find((row) => row.pathKey === invalidWritePath)
        errors.executionPlan = runtimePath?.isProtected
          ? `Step ${stepNumber} cannot write to protected runtime path "${invalidWritePath}".`
          : `Step ${stepNumber} writes to unknown runtime path "${invalidWritePath}".`
        break
      }
    }
  }

  if (String(agent?.status ?? '').trim().toUpperCase() === 'DEPRECATED') {
    warnings.push('Agent is deprecated and should not be selected as a default for new policies.')
  }

  return {
    errors,
    warnings,
  }
}

const findRuntimeSkillById = (skillId) => {
  const normalized = normalizeMockRegistryId(skillId).toLowerCase()
  return runtimeControlState.skills.find((skill) =>
    [
      skill.id,
      skill.stableId,
      skill.key,
    ].some((value) => normalizeMockRegistryId(value).toLowerCase() === normalized),
  )
}

const findValidationRegistryById = (validationId) =>
  runtimeControlState.validationRegistry.find((row) => row.id === validationId || row.key === validationId)

const findSkillRoleById = (roleId) =>
  runtimeControlState.skillRoles.find((role) => {
    const normalizedRoleId = String(roleId ?? '').trim().toLowerCase()
    return String(role.id ?? '').trim().toLowerCase() === normalizedRoleId
      || String(role.stableId ?? '').trim().toLowerCase() === normalizedRoleId
  })

const findSkillRoleByRoleKey = (roleKey) => {
  const normalizedRoleKey = String(roleKey ?? '').trim().toUpperCase()
  if (!normalizedRoleKey) return null

  return runtimeControlState.skillRoles.find(
    (role) => String(role.roleKey ?? '').trim().toUpperCase() === normalizedRoleKey,
  ) ?? null
}

const countSkillsUsingRoleKey = (roleKey) => {
  const normalizedRoleKey = String(roleKey ?? '').trim().toUpperCase()
  if (!normalizedRoleKey) return 0

  return runtimeControlState.skills.filter(
    (skill) => String(skill.skillRoleKey ?? '').trim().toUpperCase() === normalizedRoleKey,
  ).length
}

const attachSkillRoleUsageCount = (role) => cloneSkillRoleRegistryEntry({
  ...role,
  usageCount: countSkillsUsingRoleKey(role?.roleKey),
})

const sortSkillRoleRows = (rows, { sortBy = '', sortOrder = '' } = {}) => {
  const normalizedSortBy = String(sortBy ?? '').trim()
  const direction = String(sortOrder ?? '').trim().toLowerCase() === 'asc' ? 1 : -1
  const sortedRows = [...rows]

  sortedRows.sort((left, right) => {
    if (normalizedSortBy === 'label') {
      return direction * String(left?.label ?? '').localeCompare(String(right?.label ?? ''))
    }

    if (normalizedSortBy === 'usageCount') {
      const usageDelta = (Number(left?.usageCount) || 0) - (Number(right?.usageCount) || 0)
      if (usageDelta !== 0) return direction * usageDelta
      return String(left?.label ?? '').localeCompare(String(right?.label ?? ''))
    }

    if (normalizedSortBy === 'updatedAt') {
      const leftTime = Date.parse(left?.updatedAt ?? '') || 0
      const rightTime = Date.parse(right?.updatedAt ?? '') || 0
      const timeDelta = leftTime - rightTime
      if (timeDelta !== 0) return direction * timeDelta
      return String(left?.roleKey ?? '').localeCompare(String(right?.roleKey ?? ''))
    }

    const statusCompare = String(left?.status ?? '').localeCompare(String(right?.status ?? ''))
    if (statusCompare !== 0) return statusCompare

    const updatedCompare = (Date.parse(right?.updatedAt ?? '') || 0) - (Date.parse(left?.updatedAt ?? '') || 0)
    if (updatedCompare !== 0) return updatedCompare

    return String(left?.roleKey ?? '').localeCompare(String(right?.roleKey ?? ''))
  })

  return sortedRows
}

const validateMockRuntimeSkillRoleKey = (skillRoleKey, { currentSkillRoleKey = '' } = {}) => {
  const normalizedSkillRoleKey = String(skillRoleKey ?? '').trim().toUpperCase()
  const normalizedCurrentSkillRoleKey = String(currentSkillRoleKey ?? '').trim().toUpperCase()

  if (!normalizedSkillRoleKey) {
    return 'Skill role is required.'
  }

  const skillRole = findSkillRoleByRoleKey(normalizedSkillRoleKey)
  if (!skillRole) {
    return `Skill role "${normalizedSkillRoleKey}" was not found.`
  }

  const roleStatus = String(skillRole.status ?? '').trim().toUpperCase()
  if (roleStatus !== SKILL_ROLE_REGISTRY_STATUSES.ACTIVE && normalizedSkillRoleKey !== normalizedCurrentSkillRoleKey) {
    return `Skill role "${normalizedSkillRoleKey}" must be ACTIVE.`
  }

  return ''
}

const pathMatchesRoleScope = (pathKey, scope) => {
  const normalizedPathKey = String(pathKey ?? '').trim()
  const normalizedScope = String(scope ?? '').trim()
  if (!normalizedPathKey || !normalizedScope) return false
  if (normalizedScope === '*') return true
  if (normalizedScope === normalizedPathKey) return true
  if (normalizedScope.endsWith('.*')) return normalizedPathKey.startsWith(normalizedScope.slice(0, -1))
  if (normalizedScope.endsWith('*')) return normalizedPathKey.startsWith(normalizedScope.slice(0, -1))
  return false
}

const validateMockRuntimeSkillRoleWriteScopes = ({ skillRoleKey, allowedWritePaths = [] } = {}) => {
  const writePaths = [...new Set((Array.isArray(allowedWritePaths) ? allowedWritePaths : [])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean))]
  if (writePaths.length === 0) return ''

  const skillRole = findSkillRoleByRoleKey(skillRoleKey)
  if (!skillRole) return ''

  const operations = (Array.isArray(skillRole.allowedOperations) ? skillRole.allowedOperations : [])
    .map((value) => String(value ?? '').trim().toUpperCase())
  if (!operations.includes(SKILL_ROLE_REGISTRY_OPERATIONS.WRITE)) {
    return `Skill role "${skillRole.roleKey}" does not allow WRITE operations.`
  }

  const scopes = Array.isArray(skillRole.allowedWriteScopes) ? skillRole.allowedWriteScopes : []
  const uncovered = writePaths.filter((pathKey) =>
    !scopes.some((scope) => pathMatchesRoleScope(pathKey, scope)),
  )

  if (uncovered.length === 0) return ''
  return `Allowed write paths must be covered by the selected Skill Role write scopes: ${uncovered.map((value) => `"${value}"`).join(', ')}.`
}

const findWorkflowPolicyById = (policyId) =>
  runtimeControlState.workflowPolicies.find((policy) => policy.id === policyId)

export const runtimeControlApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listUiContracts: build.query({
      queryFn: async (
        { page = 1, pageSize = UI_CONTRACT_PAGE_SIZE, q = '', status = '', frameworkKey = '', version = '' } = {},
        api,
        extraOptions,
        baseQuery,
      ) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlListRequest({
              resourcePath: 'ui-contracts',
              page,
              pageSize,
              q,
              status,
              frameworkKey,
              version,
              defaultPageSize: UI_CONTRACT_PAGE_SIZE,
            }),
            api,
            extraOptions,
          )
        }

        const rows = getUIContractRows({ q, status, frameworkKey })
        return {
          data: buildListResponse({
            rows,
            page,
            pageSize,
            filters: { q, status, frameworkKey, version },
          }),
        }
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'RuntimeUIContract', id })),
              UI_CONTRACT_LIST_TAG,
            ]
          : [UI_CONTRACT_LIST_TAG],
    }),

    createUiContract: build.mutation({
      queryFn: async (payload = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'ui-contracts',
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const governanceError = validateMockUIContractGovernanceFields(payload)
        if (governanceError) return governanceError

        const duplicate = runtimeControlState.uiContracts.find((contract) =>
          contract.uiContractKey === String(payload.uiContractKey ?? '').trim().toLowerCase(),
        )
        if (duplicate) {
          return buildConflictError('UI Contract key must be unique.', {
            field: 'uiContractKey',
            reason: 'UI_CONTRACT_KEY_CONFLICT',
          })
        }

        const createdTimestamp = new Date().toISOString()
        const created = cloneUIContract({
          id: `ui-contract-${String(payload.uiContractKey ?? '').trim().toLowerCase()}`,
          ...payload,
          componentVersion: 1,
          versionStatus: String(payload.status ?? '').trim().toUpperCase() === UI_CONTRACT_STATUSES.ACTIVE
            ? 'ACTIVE'
            : 'DRAFT',
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          lockedReason: null,
          lockedByPackageKeys: [],
          clonedFromStableId: null,
          supersedesStableId: null,
          supersededByStableId: null,
          ...buildUIContractResolutionFields(createdTimestamp),
          ...buildAuditFields(createdTimestamp),
        })
        created.lineageId = created.lineageId || created.id
        runtimeControlState = {
          ...runtimeControlState,
          uiContracts: [created, ...runtimeControlState.uiContracts],
        }
        return { data: buildEntityResponse(cloneUIContract(created)) }
      },
      invalidatesTags: [UI_CONTRACT_LIST_TAG],
    }),

    cloneUiContract: build.mutation({
      queryFn: async ({ uiContractId, ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'ui-contracts',
              entityId: `${uiContractId}/clone`,
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const governanceError = validateMockUIContractGovernanceFields(payload)
        if (governanceError) return governanceError

        const source = findUIContractById(uiContractId)
        if (!source) return buildNotFoundError('UI Contract was not found.')

        const nextKey = String(payload.uiContractKey ?? '').trim().toLowerCase()
        const duplicate = runtimeControlState.uiContracts.find((contract) =>
          contract.uiContractKey === nextKey,
        )
        if (duplicate) {
          return buildConflictError('UI Contract key must be unique.', {
            field: 'uiContractKey',
            reason: 'UI_CONTRACT_KEY_CONFLICT',
          })
        }

        const sourceStableId = source.id
        const cloneTimestamp = new Date().toISOString()
        const clone = cloneUIContract({
          ...source,
          id: `ui-contract-${nextKey}`,
          uiContractKey: nextKey,
          name: String(payload.name ?? '').trim(),
          description: String(payload.description ?? source.description ?? '').trim(),
          status: UI_CONTRACT_STATUSES.DRAFT,
          isSystem: false,
          isProtected: false,
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          lockedReason: null,
          lockedByPackageKeys: [],
          componentVersion: (Number(source.componentVersion) || 1) + 1,
          versionStatus: 'DRAFT',
          lineageId: source.lineageId || sourceStableId,
          clonedFromStableId: sourceStableId,
          supersedesStableId: sourceStableId,
          supersededByStableId: null,
          ...buildUIContractResolutionFields(cloneTimestamp),
          ...buildAuditFields(cloneTimestamp),
        })
        const supersededSource = cloneUIContract({
          ...source,
          supersededByStableId: clone.id,
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          uiContracts: [
            clone,
            ...runtimeControlState.uiContracts.map((contract) =>
              contract.id === source.id ? supersededSource : contract,
            ),
          ],
        }

        return { data: buildEntityResponse(cloneUIContract(clone)) }
      },
      invalidatesTags: (_result, _error, { uiContractId }) => [
        UI_CONTRACT_LIST_TAG,
        { type: 'RuntimeUIContract', id: uiContractId },
      ],
    }),

    getUiContract: build.query({
      queryFn: async (uiContractId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('ui-contracts', uiContractId),
            api,
            extraOptions,
          )
        }

        const contract = findUIContractById(uiContractId)
        if (!contract) return buildNotFoundError('UI Contract was not found.')
        return { data: buildEntityResponse(cloneUIContract(contract)) }
      },
      providesTags: (_result, _error, uiContractId) => [
        { type: 'RuntimeUIContract', id: uiContractId },
      ],
    }),

    updateUiContract: build.mutation({
      queryFn: async ({ uiContractId, ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'ui-contracts',
              entityId: uiContractId,
              method: 'PATCH',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const existing = findUIContractById(uiContractId)
        if (!existing) return buildNotFoundError('UI Contract was not found.')
        if (Object.prototype.hasOwnProperty.call(payload, 'uiContractKey')) {
          return buildValidationFailedError('Please check the form for errors.', {
            uiContractKey: 'uiContractKey is server-managed governance metadata and cannot be edited directly.',
          })
        }
        const governanceError = validateMockUIContractGovernanceFields(payload)
        if (governanceError) return governanceError
        if (existing.isLocked || existing.isProtected) {
          return buildUIContractLockedConflictError(existing)
        }
        const updateTimestamp = new Date().toISOString()
        const next = cloneUIContract({
          ...existing,
          ...payload,
          uiContractKey: existing.uiContractKey,
          ...buildUIContractResolutionFields(updateTimestamp),
          ...buildAuditFields(updateTimestamp),
        })
        runtimeControlState = {
          ...runtimeControlState,
          uiContracts: runtimeControlState.uiContracts.map((contract) =>
            contract.id === existing.id ? next : contract,
          ),
        }
        return { data: buildEntityResponse(cloneUIContract(next)) }
      },
      invalidatesTags: (_result, _error, { uiContractId }) => [
        UI_CONTRACT_LIST_TAG,
        { type: 'RuntimeUIContract', id: uiContractId },
      ],
    }),

    listFrameworkPackages: build.query({
      queryFn: async (
        { page = 1, pageSize = FRAMEWORK_PACKAGE_PAGE_SIZE, q = '', status = '', frameworkKey = '' } = {},
        api,
        extraOptions,
        baseQuery,
      ) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlListRequest({
              resourcePath: 'framework-packages',
              page,
              pageSize,
              q,
              status,
              frameworkKey,
              defaultPageSize: FRAMEWORK_PACKAGE_PAGE_SIZE,
            }),
            api,
            extraOptions,
          )
        }

        const normalizedPage = normalizePositiveInteger(page, 1)
        const normalizedPageSize = normalizePositiveInteger(pageSize, FRAMEWORK_PACKAGE_PAGE_SIZE)
        const rows = getFrameworkPackageRows({ q, status, frameworkKey })

        return {
          data: buildListResponse({
            rows,
            page: normalizedPage,
            pageSize: normalizedPageSize,
            filters: {
              q: String(q ?? '').trim(),
              status: String(status ?? '').trim(),
              frameworkKey: normalizeFrameworkKey(frameworkKey),
            },
          }),
        }
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'RuntimeFrameworkPackage', id })),
              FRAMEWORK_PACKAGE_LIST_TAG,
            ]
          : [FRAMEWORK_PACKAGE_LIST_TAG],
    }),

    createFrameworkPackage: build.mutation({
      queryFn: async (payload = {}, api, extraOptions, baseQuery) => {
        const runtimePayload = payload ?? {}

        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'framework-packages',
              method: 'POST',
              body: runtimePayload,
            }),
            api,
            extraOptions,
          )
        }

        const deprecatedFieldError = validateMockDeprecatedFrameworkPackageFields(runtimePayload)
        if (deprecatedFieldError) {
          return deprecatedFieldError
        }

        const duplicatePackage = runtimeControlState.frameworkPackages.find(
          (pkg) =>
            normalizeFrameworkKey(pkg.frameworkKey) === normalizeFrameworkKey(runtimePayload.frameworkKey)
            && String(pkg.version ?? '').trim() === String(runtimePayload.version ?? '').trim(),
        )

        if (duplicatePackage) {
          return buildConflictError('Framework key and version must be unique.', {
            field: 'version',
            reason: 'FRAMEWORK_PACKAGE_VERSION_CONFLICT',
          })
        }

        const createdPackage = {
          id: generateRuntimeId(
            'pkg',
            `${normalizeFrameworkKey(runtimePayload.frameworkKey)}-${runtimePayload.version}`,
          ),
          ...cloneFrameworkPackage({
            ...runtimePayload,
            isDefault: runtimePayload.status === FRAMEWORK_PACKAGE_STATUSES.ACTIVE,
            ...buildAuditFields(),
          }),
        }

        runtimeControlState = {
          ...runtimeControlState,
          frameworkPackages: [createdPackage, ...runtimeControlState.frameworkPackages],
        }

        return { data: buildEntityResponse(cloneFrameworkPackage(createdPackage)) }
      },
      invalidatesTags: [FRAMEWORK_PACKAGE_LIST_TAG],
    }),

    cloneFrameworkPackage: build.mutation({
      queryFn: async ({ packageId, ...payload } = {}, api, extraOptions, baseQuery) => {
        const runtimePayload = payload

        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            {
              url: `${RUNTIME_CONTROL_BASE_PATH}/framework-packages/${packageId}/clone`,
              method: 'POST',
              body: runtimePayload,
            },
            api,
            extraOptions,
          )
        }

        const sourcePackage = findFrameworkPackageById(packageId)
        if (!sourcePackage) {
          return buildNotFoundError('Framework package was not found.')
        }

        const sourceStatus = String(sourcePackage.status ?? '').trim().toUpperCase()
        if (!CLONEABLE_FRAMEWORK_PACKAGE_STATUSES.has(sourceStatus)) {
          return buildConflictError('Only active or validated framework packages can be cloned.', {
            field: 'status',
            reason: 'FRAMEWORK_PACKAGE_CLONE_SOURCE_STATUS_CONFLICT',
          })
        }

        const version = String(runtimePayload.version ?? '').trim()
        const packageKey = normalizeKeyToken(runtimePayload.packageKey)
        const packageName = String(
          runtimePayload.packageName ?? `${sourcePackage.packageName || sourcePackage.frameworkName} Clone`,
        ).trim()
        const description = runtimePayload.description === undefined
          ? (sourcePackage.description ?? '')
          : String(runtimePayload.description ?? '').trim()

        if (!version || !packageKey) {
          return buildValidationFailedError('Please check the form for errors.', {
            ...(!version ? { version: 'Version is required.' } : {}),
            ...(!packageKey ? { packageKey: 'Package key is required.' } : {}),
          })
        }

        if (!KEY_TOKEN_PATTERN.test(packageKey)) {
          return buildValidationFailedError('Please check the form for errors.', {
            packageKey: 'Package key must use lowercase letters, numbers, or hyphens.',
          })
        }

        const duplicateVersion = runtimeControlState.frameworkPackages.find(
          (pkg) =>
            normalizeFrameworkKey(pkg.frameworkKey) === normalizeFrameworkKey(sourcePackage.frameworkKey)
            && String(pkg.version ?? '').trim() === version,
        )

        if (duplicateVersion) {
          return buildConflictError('Framework key and version must be unique.', {
            field: 'version',
            reason: 'FRAMEWORK_PACKAGE_VERSION_CONFLICT',
          })
        }

        const duplicatePackageKey = runtimeControlState.frameworkPackages.find(
          (pkg) => normalizeKeyToken(pkg.packageKey) === packageKey,
        )

        if (duplicatePackageKey) {
          return buildConflictError('Package key must be unique.', {
            field: 'packageKey',
            reason: 'FRAMEWORK_PACKAGE_KEY_CONFLICT',
          })
        }

        const clonedPackage = cloneFrameworkPackage({
          ...sourcePackage,
          id: generateMockObjectId(`${sourcePackage.id}:${version}:${packageKey}`),
          version,
          packageKey,
          packageName,
          description,
          status: FRAMEWORK_PACKAGE_STATUSES.DRAFT,
          versionStatus: 'DRAFT',
          derivedFromPackageId: sourcePackage.id,
          isDefault: false,
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          lockedReason: '',
          dependencyLock: null,
          lastCheckpointStatus: null,
          lastCheckpointAt: null,
          lastCheckpointResult: null,
          runtimeVerdict: null,
          uiContractBinding: null,
          activatedAt: null,
          activatedBy: null,
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          frameworkPackages: [clonedPackage, ...runtimeControlState.frameworkPackages],
        }

        return { data: buildEntityResponse(cloneFrameworkPackage(clonedPackage)) }
      },
      invalidatesTags: [FRAMEWORK_PACKAGE_LIST_TAG],
    }),

    getFrameworkPackage: build.query({
      queryFn: async (packageId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('framework-packages', packageId),
            api,
            extraOptions,
          )
        }

        const pkg = findFrameworkPackageById(packageId)
        if (!pkg) {
          return buildNotFoundError('Framework package was not found.')
        }

        return { data: buildEntityResponse(cloneFrameworkPackage(pkg)) }
      },
      providesTags: (_result, _error, packageId) => [
        { type: 'RuntimeFrameworkPackage', id: packageId },
      ],
    }),

    getFrameworkPackageDependencies: build.query({
      queryFn: async (packageId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('framework-packages', `${packageId}/dependencies`),
            api,
            extraOptions,
          )
        }

        const pkg = findFrameworkPackageById(packageId)
        if (!pkg) {
          return buildNotFoundError('Framework package was not found.')
        }

        return { data: buildEntityResponse(buildMockFrameworkPackageDependencies(pkg)) }
      },
      providesTags: (_result, _error, packageId) => [
        { type: 'RuntimeFrameworkPackage', id: packageId },
      ],
    }),

    getFrameworkPackageDependencyGraph: build.query({
      queryFn: async (packageId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('framework-packages', `${packageId}/dependency-graph`),
            api,
            extraOptions,
          )
        }

        const pkg = findFrameworkPackageById(packageId)
        if (!pkg) {
          return buildNotFoundError('Framework package was not found.')
        }

        return { data: buildEntityResponse(buildMockFrameworkPackageDependencyGraph(pkg)) }
      },
      providesTags: (_result, _error, packageId) => [
        { type: 'RuntimeFrameworkPackage', id: packageId },
      ],
    }),

    getFrameworkPackageDependencyLock: build.query({
      queryFn: async (packageId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('framework-packages', `${packageId}/dependency-lock`),
            api,
            extraOptions,
          )
        }

        const pkg = findFrameworkPackageById(packageId)
        if (!pkg) {
          return buildNotFoundError('Framework package was not found.')
        }

        return {
          data: buildEntityResponse(
            pkg.dependencyLock || buildMockFrameworkPackageDependencyLock(pkg),
          ),
        }
      },
      providesTags: (_result, _error, packageId) => [
        { type: 'RuntimeFrameworkPackage', id: packageId },
      ],
    }),

    getFrameworkPackageIntegrity: build.query({
      queryFn: async (packageId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('framework-packages', `${packageId}/integrity`),
            api,
            extraOptions,
          )
        }

        const pkg = findFrameworkPackageById(packageId)
        if (!pkg) {
          return buildNotFoundError('Framework package was not found.')
        }

        return { data: buildEntityResponse(buildMockFrameworkPackageIntegrity(pkg)) }
      },
      providesTags: (_result, _error, packageId) => [
        { type: 'RuntimeFrameworkPackage', id: packageId },
      ],
    }),

    getFrameworkPackageLatestCheckpoint: build.query({
      queryFn: async (packageId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('framework-packages', `${packageId}/checkpoint/latest`),
            api,
            extraOptions,
          )
        }

        const pkg = findFrameworkPackageById(packageId)
        if (!pkg) {
          return buildNotFoundError('Framework package was not found.')
        }

        // A status string without a full checkpoint result is treated as not-run.
        const hasStoredCheckpoint = pkg.lastCheckpointResult && typeof pkg.lastCheckpointResult === 'object'
        return {
          data: buildEntityResponse(hasStoredCheckpoint ? pkg.lastCheckpointResult : {
            schemaVersion: '1',
            id: pkg.id,
            frameworkKey: pkg.frameworkKey,
            packageKey: pkg.packageKey || '',
            packageVersion: pkg.version || '',
            mode: null,
            status: 'NOT_RUN',
            errors: [],
            warnings: [],
            issues: [],
            passedChecks: [],
            dependencyGraph: null,
            dependencyLockPreview: pkg.dependencyLock || null,
            summary: {
              totalChecks: 0,
              passed: 0,
              warnings: 0,
              failed: 0,
              resolvedReferences: Number(pkg.dependencyLock?.references?.length) || 0,
            },
            timestamp: null,
            runBy: null,
          }),
        }
      },
      providesTags: (_result, _error, packageId) => [
        { type: 'RuntimeFrameworkPackage', id: packageId },
      ],
    }),

    runFrameworkPackageCheckpoint: build.mutation({
      queryFn: async ({ packageId, mode = 'FULL', persist = false } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            {
              url: `${RUNTIME_CONTROL_BASE_PATH}/framework-packages/${packageId}/checkpoint`,
              method: 'POST',
              body: { mode, persist },
            },
            api,
            extraOptions,
          )
        }

        const pkg = findFrameworkPackageById(packageId)
        if (!pkg) {
          return buildNotFoundError('Framework package was not found.')
        }

        const normalizedMode = String(mode || 'FULL').trim().toUpperCase()
        if (!['FULL', 'DRY_RUN'].includes(normalizedMode)) {
          return {
            error: {
              status: 422,
              data: {
                error: {
                  code: 'VALIDATION_FAILED',
                  message: 'Please check the form for errors.',
                  details: { mode: 'Checkpoint mode must be FULL or DRY_RUN.' },
                },
              },
            },
          }
        }
        if (persist === true && normalizedMode === 'DRY_RUN') {
          return {
            error: {
              status: 422,
              data: {
                error: {
                  code: 'VALIDATION_FAILED',
                  message: 'Please check the form for errors.',
                  details: { persist: 'Dry-run checkpoints cannot be persisted.' },
                },
              },
            },
          }
        }

        const checkpoint = buildMockFrameworkPackageCheckpoint(pkg, { mode: normalizedMode })
        if (persist) {
          runtimeControlState = {
            ...runtimeControlState,
            frameworkPackages: runtimeControlState.frameworkPackages.map((row) =>
              row.id === packageId
                ? cloneFrameworkPackage({
                    ...row,
                    lastCheckpointStatus: checkpoint.status,
                    lastCheckpointAt: checkpoint.timestamp,
                    lastCheckpointResult: checkpoint,
                  })
                : row,
            ),
          }
        }

        return { data: buildEntityResponse(checkpoint) }
      },
      invalidatesTags: (_result, _error, { packageId } = {}) => [
        { type: 'RuntimeFrameworkPackage', id: packageId },
      ],
    }),

    getFrameworkPackageAudit: build.query({
      queryFn: async ({ packageId, page = 1, pageSize = 20 } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            {
              url: `${RUNTIME_CONTROL_BASE_PATH}/framework-packages/${packageId}/audit`,
              params: {
                page: normalizePositiveInteger(page, 1),
                pageSize: normalizePositiveInteger(pageSize, 20),
              },
            },
            api,
            extraOptions,
          )
        }

        const pkg = findFrameworkPackageById(packageId)
        if (!pkg) {
          return buildNotFoundError('Framework package was not found.')
        }

        return {
          data: {
            data: [],
            meta: {
              page: normalizePositiveInteger(page, 1),
              pageSize: normalizePositiveInteger(pageSize, 20),
              totalCount: 0,
              totalPages: 0,
            },
          },
        }
      },
      providesTags: (_result, _error, args = {}) => [
        { type: 'RuntimeFrameworkPackage', id: args.packageId },
      ],
    }),

    getFrameworkPackageDiff: build.query({
      queryFn: async ({ packageId, version } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('framework-packages', `${packageId}/diff/${version}`),
            api,
            extraOptions,
          )
        }

        const pkg = findFrameworkPackageById(packageId)
        if (!pkg) {
          return buildNotFoundError('Framework package was not found.')
        }

        return {
          error: {
            status: 501,
            data: {
              error: {
                code: 'FRAMEWORK_PACKAGE_DIFF_NOT_AVAILABLE',
                message: 'Framework package version diff is not available until package snapshot history is implemented.',
                details: { packageId, requestedVersion: version },
              },
            },
          },
        }
      },
    }),

    updateFrameworkPackage: build.mutation({
      queryFn: async ({ packageId, ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'framework-packages',
              entityId: packageId,
              method: 'PATCH',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const runtimePayload = payload
        const deprecatedFieldError = validateMockDeprecatedFrameworkPackageFields(runtimePayload)
        if (deprecatedFieldError) {
          return deprecatedFieldError
        }

        const existingPackage = findFrameworkPackageById(packageId)
        if (!existingPackage) {
          return buildNotFoundError('Framework package was not found.')
        }

        const duplicatePackage = runtimeControlState.frameworkPackages.find(
          (pkg) =>
            pkg.id !== packageId
            && normalizeFrameworkKey(pkg.frameworkKey) === normalizeFrameworkKey(runtimePayload.frameworkKey ?? existingPackage.frameworkKey)
            && String(pkg.version ?? '').trim() === String(runtimePayload.version ?? existingPackage.version).trim(),
        )

        if (duplicatePackage) {
          return buildConflictError('Framework key and version must be unique.', {
            field: 'version',
            reason: 'FRAMEWORK_PACKAGE_VERSION_CONFLICT',
          })
        }

        const nextStatus = payload.status ?? existingPackage.status

        const nextPackage = cloneFrameworkPackage({
          ...existingPackage,
          ...runtimePayload,
          isDefault: payload.status
            ? nextStatus === FRAMEWORK_PACKAGE_STATUSES.ACTIVE
            : Boolean(runtimePayload.isDefault ?? existingPackage.isDefault),
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          frameworkPackages: runtimeControlState.frameworkPackages.map((pkg) =>
            pkg.id === packageId ? nextPackage : pkg,
          ),
        }

        return { data: buildEntityResponse(cloneFrameworkPackage(nextPackage)) }
      },
      invalidatesTags: (_result, _error, { packageId }) => [
        FRAMEWORK_PACKAGE_LIST_TAG,
        { type: 'RuntimeFrameworkPackage', id: packageId },
      ],
    }),

    validateFrameworkPackage: build.mutation({
      queryFn: async ({ packageId }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            {
              url: `${RUNTIME_CONTROL_BASE_PATH}/framework-packages/${packageId}/validate`,
              method: 'POST',
            },
            api,
            extraOptions,
          )
        }

        const existingPackage = findFrameworkPackageById(packageId)
        if (!existingPackage) {
          return buildNotFoundError('Framework package was not found.')
        }

        const checkpoint = buildMockFrameworkPackageCheckpoint(existingPackage, { mode: 'FULL' })
        if (checkpoint.status === 'FAIL') {
          const failedPackage = cloneFrameworkPackage({
            ...existingPackage,
            lastCheckpointStatus: checkpoint.status,
            lastCheckpointAt: checkpoint.timestamp,
            lastCheckpointResult: checkpoint,
          })

          runtimeControlState = {
            ...runtimeControlState,
            frameworkPackages: runtimeControlState.frameworkPackages.map((pkg) =>
              pkg.id === packageId ? failedPackage : pkg,
            ),
          }

          return buildMockCheckpointValidationError(checkpoint)
        }

        const validatedPackage = cloneFrameworkPackage({
          ...existingPackage,
          status: FRAMEWORK_PACKAGE_STATUSES.VALIDATED,
          isDefault: false,
          isLocked: true,
          lockedReason: 'Framework package reached a governed runtime release boundary.',
          dependencyLock: checkpoint.dependencyLockPreview,
          lastCheckpointStatus: checkpoint.status,
          lastCheckpointAt: checkpoint.timestamp,
          lastCheckpointResult: checkpoint,
          ...buildAuditFields(checkpoint.timestamp),
        })

        runtimeControlState = {
          ...runtimeControlState,
          frameworkPackages: runtimeControlState.frameworkPackages.map((pkg) =>
            pkg.id === packageId ? validatedPackage : pkg,
          ),
        }

        return {
          data: buildEntityResponse({
            package: cloneFrameworkPackage(validatedPackage),
            checkpoint,
          }),
        }
      },
      invalidatesTags: (_result, _error, { packageId }) => [
        FRAMEWORK_PACKAGE_LIST_TAG,
        { type: 'RuntimeFrameworkPackage', id: packageId },
      ],
    }),

    activateFrameworkPackage: build.mutation({
      queryFn: async ({ packageId }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            {
              url: `${RUNTIME_CONTROL_BASE_PATH}/framework-packages/${packageId}/activate`,
              method: 'POST',
            },
            api,
            extraOptions,
          )
        }

        const existingPackage = findFrameworkPackageById(packageId)
        if (!existingPackage) {
          return buildNotFoundError('Framework package was not found.')
        }

        if (existingPackage.status !== FRAMEWORK_PACKAGE_STATUSES.VALIDATED) {
          return buildConflictError('Only validated framework packages can be activated.', {
            field: 'status',
            reason: 'FRAMEWORK_PACKAGE_ACTIVATION_REQUIRES_VALIDATED',
          })
        }

        const checkpoint = buildMockFrameworkPackageCheckpoint(existingPackage, { mode: 'ACTIVATION' })
        if (checkpoint.status === 'FAIL') {
          return buildMockCheckpointValidationError(checkpoint)
        }
        const readiness = buildMockRuntimeActivationReadiness(existingPackage, checkpoint)
        if (!readiness.ready) {
          return buildConflictError('Runtime activation readiness requirements are not met.', {
            reason: readiness.blockingReasons[0] || 'RUNTIME_ACTIVATION_READINESS_BLOCKED',
            readiness,
          })
        }

        const activationTime = new Date().toISOString()
        const activationId = generateRuntimeId('activation', `${existingPackage.frameworkKey}-${existingPackage.version}`)
        const deploymentId = `deployment-${String(existingPackage.frameworkKey ?? '').toLowerCase()}-global-production-${String(activationId).slice(-24)}`
        const previousDeployment = getActiveMockRuntimeDeployment(existingPackage.frameworkKey)
        const activationSnapshot = {
          id: generateMockObjectId(activationId),
          activationId,
          deploymentId,
          packageId,
          packageKey: existingPackage.packageKey || '',
          frameworkKey: existingPackage.frameworkKey,
          frameworkVersion: existingPackage.version,
          packageStatusAtActivation: FRAMEWORK_PACKAGE_STATUSES.VALIDATED,
          activationStatus: RUNTIME_ACTIVATION_STATUSES.ACTIVE,
          dependencySnapshotId: existingPackage.dependencyLock?.snapshotId || '',
          dependencySnapshotHash: existingPackage.dependencyLock?.snapshotHash || existingPackage.dependencyLock?.hash || '',
          checkpointId: checkpoint.checkpointId || checkpoint.id || '',
          checkpointStatus: checkpoint.status,
          runtimeVerdictId: existingPackage.runtimeVerdict?.validationId || existingPackage.runtimeVerdict?.auditId || '',
          runtimeVerdictResult: existingPackage.runtimeVerdict?.result || '',
          deploymentGraph: checkpoint.dependencyGraph || null,
          tenantScope: 'GLOBAL',
          deploymentMode: 'PRODUCTION',
          activatedAt: activationTime,
          activatedBy: RUNTIME_CONTROL_UPDATED_BY.id,
          supersedesActivationId: previousDeployment?.activationId || null,
          supersededByActivationId: null,
          rollbackSourceActivationId: null,
          failureReason: null,
          createdAt: activationTime,
          updatedAt: activationTime,
        }
        const deployment = {
          id: generateMockObjectId(deploymentId),
          deploymentId,
          activationId,
          packageId,
          packageKey: existingPackage.packageKey || '',
          frameworkKey: existingPackage.frameworkKey,
          frameworkVersion: existingPackage.version,
          status: RUNTIME_DEPLOYMENT_STATUSES.ACTIVE,
          tenantScope: 'GLOBAL',
          deploymentMode: 'PRODUCTION',
          registeredAt: activationTime,
          registeredBy: RUNTIME_CONTROL_UPDATED_BY.id,
          isRollbackDeployment: false,
          supersededAt: null,
          supersededByDeploymentId: null,
        }
        let activatedPackage = null

        runtimeControlState = {
          ...runtimeControlState,
          frameworkPackages: runtimeControlState.frameworkPackages.map((pkg) => {
            if (pkg.frameworkKey !== existingPackage.frameworkKey) {
              return pkg
            }

            if (pkg.id === packageId) {
              activatedPackage = cloneFrameworkPackage({
                ...pkg,
                status: FRAMEWORK_PACKAGE_STATUSES.ACTIVE,
                isDefault: true,
                lastCheckpointStatus: checkpoint.status,
                lastCheckpointAt: checkpoint.timestamp,
                lastCheckpointResult: checkpoint,
                dependencyLock: existingPackage.dependencyLock || checkpoint.dependencyLockPreview,
                ...buildAuditFields(activationTime),
              })
              return activatedPackage
            }

            if (
              pkg.status === FRAMEWORK_PACKAGE_STATUSES.ACTIVE
              || pkg.isDefault
            ) {
              return cloneFrameworkPackage({
                ...pkg,
                isDefault: false,
                ...buildAuditFields(activationTime),
              })
            }

            return pkg
          }),
          runtimeActivationSnapshots: [
            activationSnapshot,
            ...(runtimeControlState.runtimeActivationSnapshots ?? []).map((snapshot) =>
              snapshot.activationId === previousDeployment?.activationId
                ? {
                    ...snapshot,
                    activationStatus: RUNTIME_ACTIVATION_STATUSES.SUPERSEDED,
                    supersededByActivationId: activationId,
                    updatedAt: activationTime,
                  }
                : snapshot,
            ),
          ],
          runtimeDeployments: [
            deployment,
            ...(runtimeControlState.runtimeDeployments ?? []).map((row) =>
              row.deploymentId === previousDeployment?.deploymentId
                ? {
                    ...row,
                    status: 'SUPERSEDED',
                    supersededAt: activationTime,
                    supersededByDeploymentId: deploymentId,
                    updatedAt: activationTime,
                  }
                : row,
            ),
          ],
        }

        return {
          data: {
            ...buildEntityResponse(
              activatedPackage ? cloneFrameworkPackage(activatedPackage) : cloneFrameworkPackage(existingPackage),
            ),
            meta: {
              runtimeActivation: {
                readiness,
                activationSnapshot,
                deployment,
                supersededDeployment: previousDeployment || null,
              },
            },
          },
        }
      },
      invalidatesTags: (_result, _error, { packageId }) => [
        FRAMEWORK_PACKAGE_LIST_TAG,
        { type: 'RuntimeFrameworkPackage', id: packageId },
        RUNTIME_ACTIVATION_LIST_TAG,
        RUNTIME_DEPLOYMENT_LIST_TAG,
      ],
    }),

    getRuntimeActivationReadiness: build.query({
      queryFn: async (packageId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            {
              url: `${RUNTIME_CONTROL_BASE_PATH}/runtime-activation/packages/${packageId}/readiness`,
            },
            api,
            extraOptions,
          )
        }

        const existingPackage = findFrameworkPackageById(packageId)
        if (!existingPackage) {
          return buildNotFoundError('Framework package was not found.')
        }

        return {
          data: buildEntityResponse(buildMockRuntimeActivationReadiness(existingPackage)),
        }
      },
      providesTags: (_result, _error, packageId) => [
        RUNTIME_ACTIVATION_LIST_TAG,
        { type: 'RuntimeActivation', id: packageId || 'LIST' },
      ],
    }),

    getRuntimeActivationHistory: build.query({
      queryFn: async (packageId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            {
              url: `${RUNTIME_CONTROL_BASE_PATH}/runtime-activation/packages/${packageId}/history`,
            },
            api,
            extraOptions,
          )
        }

        const rows = (runtimeControlState.runtimeActivationSnapshots ?? [])
          .filter((snapshot) => String(snapshot.packageId ?? '').trim() === String(packageId ?? '').trim())

        return { data: buildEntityResponse(rows) }
      },
      providesTags: (_result, _error, packageId) => [
        RUNTIME_ACTIVATION_LIST_TAG,
        { type: 'RuntimeActivation', id: packageId || 'LIST' },
      ],
    }),

    listRuntimeDeployments: build.query({
      queryFn: async (_arg, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            {
              url: `${RUNTIME_CONTROL_BASE_PATH}/runtime-activation/deployments`,
            },
            api,
            extraOptions,
          )
        }

        return { data: buildEntityResponse([...(runtimeControlState.runtimeDeployments ?? [])]) }
      },
      providesTags: [RUNTIME_DEPLOYMENT_LIST_TAG],
    }),

    validateRuntimeOperation: build.mutation({
      queryFn: async (payload = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            {
              url: `${RUNTIME_CONTROL_BASE_PATH}/runtime-validation/validate`,
              method: 'POST',
              body: payload,
            },
            api,
            extraOptions,
          )
        }

        const validModes = ['STRICT', 'WARN_ONLY', 'AUDIT_ONLY', 'DISABLED']
        const normalizedMode = String(payload.mode ?? 'STRICT').trim().toUpperCase()
        if (!validModes.includes(normalizedMode)) {
          return buildValidationFailedError('Runtime validation request is invalid.', {
            mode: 'Invalid option: expected one of "STRICT"|"WARN_ONLY"|"AUDIT_ONLY"|"DISABLED"',
          })
        }

        const validation = validateMockRuntimeOperation(payload)
        const shouldUpdatePackageRuntimeVerdict = payload.isPackageLevelValidation === true && validation.packageResolved !== false
        const runtimeVerdict = shouldUpdatePackageRuntimeVerdict
          ? {
              validationId: validation.validationId,
              auditId: validation.validationId,
              status: validation.status,
              result: validation.result,
              mode: validation.mode,
              lastValidatedAt: validation.timestamp,
              auditPersisted: true,
              dependencyLockState: validation.result === 'ALLOW' ? 'LOCKED' : 'NOT_LOCKED',
              blockingIssues: Number(validation.summary?.failed) || 0,
              warnings: Number(validation.summary?.warnings) || 0,
            }
          : null
        runtimeControlState = {
          ...runtimeControlState,
          frameworkPackages: runtimeControlState.frameworkPackages.map((pkg) =>
            shouldUpdatePackageRuntimeVerdict
            && (
              String(pkg.id ?? '').trim() === String(validation.packageId ?? '').trim()
              || String(pkg.packageKey ?? '').trim() === String(validation.packageId ?? '').trim()
            )
              ? cloneFrameworkPackage({
                  ...pkg,
                  runtimeVerdict,
                })
              : pkg,
          ),
          runtimeValidationAudits: [
            {
              id: validation.validationId,
              validationCode: validation.validationCode,
              severity: validation.severity,
              operationType: validation.operationType,
              runtimePath: validation.runtimePath,
              actorId: validation.actorId,
              actorType: validation.actorType,
              packageId: validation.packageId,
              frameworkKey: validation.frameworkKey,
              workspaceId: validation.workspaceId,
              status: validation.status,
              result: validation.result,
              mode: validation.mode,
              message: validation.message,
              issues: validation.issues,
              summary: validation.summary,
              beforeState: validation.beforeState,
              afterState: validation.afterState,
              createdAt: validation.timestamp,
              updatedAt: validation.timestamp,
            },
            ...(runtimeControlState.runtimeValidationAudits ?? []),
          ],
        }

        if (validation.result === 'BLOCK') {
          return buildMockRuntimeValidationError(validation)
        }

        return { data: buildEntityResponse(validation) }
      },
      invalidatesTags: (_result, _error, payload = {}) => [
        RUNTIME_VALIDATION_AUDIT_LIST_TAG,
        { type: 'RuntimeValidationAudit', id: payload.packageId || 'LIST' },
        { type: 'RuntimeFrameworkPackage', id: payload.packageId || 'LIST' },
        { type: 'RuntimeActivation', id: payload.packageId || 'LIST' },
        RUNTIME_ACTIVATION_LIST_TAG,
      ],
    }),

    getRuntimeValidationHistory: build.query({
      queryFn: async ({ packageId, page = 1, pageSize = 20 } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            {
              url: `${RUNTIME_CONTROL_BASE_PATH}/runtime-validation/history/${packageId}`,
              params: {
                page: normalizePositiveInteger(page, 1),
                pageSize: normalizePositiveInteger(pageSize, 20),
              },
            },
            api,
            extraOptions,
          )
        }

        const normalizedPage = normalizePositiveInteger(page, 1)
        const normalizedPageSize = normalizePositiveInteger(pageSize, 20)
        const rows = (runtimeControlState.runtimeValidationAudits ?? [])
          .filter((row) => String(row.packageId ?? '').trim() === String(packageId ?? '').trim())
        const start = (normalizedPage - 1) * normalizedPageSize
        const data = rows.slice(start, start + normalizedPageSize)

        return {
          data: {
            data,
            meta: {
              page: normalizedPage,
              pageSize: normalizedPageSize,
              total: rows.length,
              totalCount: rows.length,
              totalPages: Math.ceil(rows.length / normalizedPageSize),
            },
          },
        }
      },
      providesTags: (_result, _error, args = {}) => [
        RUNTIME_VALIDATION_AUDIT_LIST_TAG,
        { type: 'RuntimeValidationAudit', id: args.packageId || 'LIST' },
      ],
    }),

    listFrameworkRegistries: build.query({
      queryFn: async (
        { page = 1, pageSize = FRAMEWORK_REGISTRY_PAGE_SIZE, q = '', status = '', type = '', structureType = '' } = {},
        api,
        extraOptions,
        baseQuery,
      ) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlListRequest({
              resourcePath: 'framework-registry',
              page,
              pageSize,
              q,
              status,
              type,
              structureType,
              defaultPageSize: FRAMEWORK_REGISTRY_PAGE_SIZE,
            }),
            api,
            extraOptions,
          )
        }

        const normalizedPage = normalizePositiveInteger(page, 1)
        const normalizedPageSize = normalizePositiveInteger(pageSize, FRAMEWORK_REGISTRY_PAGE_SIZE)
        const rows = getFrameworkRegistryRows({ q, status, type, structureType })

        return {
          data: buildListResponse({
            rows,
            page: normalizedPage,
            pageSize: normalizedPageSize,
            filters: {
              q: String(q ?? '').trim(),
              status: String(status ?? '').trim(),
              type: String(type ?? '').trim().toLowerCase(),
              structureType: String(structureType ?? '').trim().toLowerCase(),
            },
          }),
        }
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'RuntimeFrameworkRegistry', id })),
              FRAMEWORK_REGISTRY_LIST_TAG,
            ]
          : [FRAMEWORK_REGISTRY_LIST_TAG],
    }),

    createFrameworkRegistry: build.mutation({
      queryFn: async (payload = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'framework-registry',
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const runtimePayload = payload
        const duplicateEntry = runtimeControlState.frameworkRegistries.find(
          (entry) =>
            String(entry.frameworkKey ?? '').trim().toUpperCase()
            === String(runtimePayload.frameworkKey ?? '').trim().toUpperCase(),
        )

        if (duplicateEntry) {
          return buildConflictError('Framework key must be unique.', {
            field: 'frameworkKey',
            reason: 'FRAMEWORK_REGISTRY_KEY_CONFLICT',
          })
        }

        const createdEntry = cloneFrameworkRegistryEntry({
          id: generateRuntimeId('framework', runtimePayload.frameworkKey),
          ...runtimePayload,
          frameworkKey: String(runtimePayload.frameworkKey ?? '').trim().toUpperCase(),
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          frameworkRegistries: [createdEntry, ...runtimeControlState.frameworkRegistries],
        }

        return { data: buildEntityResponse(cloneFrameworkRegistryEntry(createdEntry)) }
      },
      invalidatesTags: [FRAMEWORK_REGISTRY_LIST_TAG],
    }),

    getFrameworkRegistry: build.query({
      queryFn: async (registryId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('framework-registry', registryId),
            api,
            extraOptions,
          )
        }

        const entry = findFrameworkRegistryById(registryId)
        if (!entry) {
          return buildNotFoundError('Framework registry entry was not found.')
        }

        return { data: buildEntityResponse(cloneFrameworkRegistryEntry(entry)) }
      },
      providesTags: (_result, _error, registryId) => [
        { type: 'RuntimeFrameworkRegistry', id: registryId },
      ],
    }),

    updateFrameworkRegistry: build.mutation({
      queryFn: async ({ registryId, ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'framework-registry',
              entityId: registryId,
              method: 'PATCH',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const existingEntry = findFrameworkRegistryById(registryId)
        if (!existingEntry) {
          return buildNotFoundError('Framework registry entry was not found.')
        }

        const duplicateEntry = runtimeControlState.frameworkRegistries.find(
          (entry) =>
            entry.id !== registryId
            && String(entry.frameworkKey ?? '').trim().toUpperCase()
              === String(payload.frameworkKey ?? existingEntry.frameworkKey).trim().toUpperCase(),
        )

        if (duplicateEntry) {
          return buildConflictError('Framework key must be unique.', {
            field: 'frameworkKey',
            reason: 'FRAMEWORK_REGISTRY_KEY_CONFLICT',
          })
        }

        const nextEntry = cloneFrameworkRegistryEntry({
          ...existingEntry,
          ...payload,
          frameworkKey: String(payload.frameworkKey ?? existingEntry.frameworkKey).trim().toUpperCase(),
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          frameworkRegistries: runtimeControlState.frameworkRegistries.map((entry) =>
            entry.id === registryId ? nextEntry : entry,
          ),
        }

        return { data: buildEntityResponse(cloneFrameworkRegistryEntry(nextEntry)) }
      },
      invalidatesTags: (_result, _error, { registryId }) => [
        FRAMEWORK_REGISTRY_LIST_TAG,
        { type: 'RuntimeFrameworkRegistry', id: registryId },
      ],
    }),

    listRuntimeAgents: build.query({
      queryFn: async (
        { page = 1, pageSize = RUNTIME_AGENT_PAGE_SIZE, q = '', status = '', frameworkKey = '' } = {},
        api,
        extraOptions,
        baseQuery,
      ) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlListRequest({
              resourcePath: 'agents',
              page,
              pageSize,
              q,
              status,
              frameworkKey,
              defaultPageSize: RUNTIME_AGENT_PAGE_SIZE,
            }),
            api,
            extraOptions,
          )
        }

        const normalizedPage = normalizePositiveInteger(page, 1)
        const normalizedPageSize = normalizePositiveInteger(pageSize, RUNTIME_AGENT_PAGE_SIZE)
        const rows = getRuntimeAgentRows({ q, status, frameworkKey })

        return {
          data: buildListResponse({
            rows,
            page: normalizedPage,
            pageSize: normalizedPageSize,
            filters: {
              q: String(q ?? '').trim(),
              status: String(status ?? '').trim(),
              frameworkKey: normalizeFrameworkKey(frameworkKey),
            },
          }),
        }
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'RuntimeAgent', id })),
              AGENT_LIST_TAG,
            ]
          : [AGENT_LIST_TAG],
    }),

    createRuntimeAgent: build.mutation({
      queryFn: async (payload = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'agents',
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const governedMetadataError = validateMockRuntimeAgentGovernedMetadataFields(payload)
        if (governedMetadataError) return governedMetadataError

        const duplicateAgent = runtimeControlState.agents.find(
          (agent) => String(agent.key ?? '').trim() === String(payload.key ?? '').trim(),
        )

        if (duplicateAgent) {
          return buildConflictError('Agent key must be unique.', {
            field: 'key',
            reason: 'RUNTIME_AGENT_KEY_CONFLICT',
          })
        }

        const validation = validateMockRuntimeAgent(payload)
        if (Object.keys(validation.errors).length > 0) {
          return buildValidationFailedError('Please check the form for errors.', validation.errors)
        }

        const stableId = generateRuntimeId('agent', payload.key)
        const createdAgent = {
          id: stableId,
          stableId,
          ...cloneRuntimeAgent({
            ...payload,
            componentVersion: 1,
            versionStatus: 'DRAFT',
            lineageId: stableId,
            isLocked: false,
            lockedAt: null,
            lockedBy: null,
            lockedReason: '',
            lockedByPackageKeys: [],
            clonedFromStableId: null,
            supersedesStableId: null,
            supersededByStableId: null,
            ...buildAuditFields(),
          }),
        }

        runtimeControlState = {
          ...runtimeControlState,
          agents: [createdAgent, ...runtimeControlState.agents],
        }

        return { data: buildEntityResponse(cloneRuntimeAgent(createdAgent)) }
      },
      invalidatesTags: [AGENT_LIST_TAG],
    }),

    getRuntimeAgent: build.query({
      queryFn: async (agentId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('agents', agentId),
            api,
            extraOptions,
          )
        }

        const agent = findRuntimeAgentById(agentId)
        if (!agent) {
          return buildNotFoundError('Agent was not found.')
        }

        return { data: buildEntityResponse(cloneRuntimeAgent(agent)) }
      },
      providesTags: (_result, _error, agentId) => [{ type: 'RuntimeAgent', id: agentId }],
    }),

    getRuntimeAgentDependencies: build.query({
      queryFn: async (agentId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('agents', `${agentId}/dependencies`),
            api,
            extraOptions,
          )
        }

        const agent = findRuntimeAgentById(agentId)
        if (!agent) {
          return buildNotFoundError('Agent was not found.')
        }

        const dependencies = buildMockRuntimeAgentDependencies(agentId)

        return {
          data: buildEntityResponse({
            agentId,
            workflowPolicies: dependencies.workflowPolicies.map((policy) => ({
              id: policy.id,
              key: policy.key,
              name: policy.name,
              status: policy.status,
            })),
            frameworkPackages: dependencies.frameworkPackages.map((pkg) => ({
              id: pkg.id,
              frameworkKey: pkg.frameworkKey,
              frameworkName: pkg.frameworkName,
              version: pkg.version,
              status: pkg.status,
            })),
            summary: dependencies.summary,
            warnings: dependencies.warnings,
            blocks: dependencies.blocks,
          }),
        }
      },
      providesTags: (_result, _error, agentId) => [{ type: 'RuntimeAgentDependencies', id: agentId }],
    }),

    cloneRuntimeAgent: build.mutation({
      queryFn: async ({ agentId, ...payload } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'agents',
              entityId: `${agentId}/clone`,
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const governedMetadataError = validateMockRuntimeAgentGovernedMetadataFields(payload)
        if (governedMetadataError) return governedMetadataError

        const sourceAgent = findRuntimeAgentById(agentId)
        if (!sourceAgent) {
          return buildNotFoundError('Agent was not found.')
        }

        const duplicateAgent = runtimeControlState.agents.find(
          (agent) => String(agent.key ?? '').trim() === String(payload.key ?? '').trim(),
        )

        if (duplicateAgent) {
          return buildConflictError('Agent key must be unique.', {
            field: 'key',
            reason: 'RUNTIME_AGENT_KEY_CONFLICT',
          })
        }

        const stableId = generateRuntimeId('agent', payload.key)
        const sourceStableId = sourceAgent.stableId || sourceAgent.id
        const clonedAgent = cloneRuntimeAgent({
          ...sourceAgent,
          id: stableId,
          stableId,
          key: payload.key,
          name: payload.name,
          description: payload.description ?? sourceAgent.description ?? '',
          status: RUNTIME_AGENT_STATUSES.DRAFT,
          componentVersion: Number(sourceAgent.componentVersion ?? 1) + 1,
          versionStatus: 'DRAFT',
          lineageId: sourceAgent.lineageId || sourceStableId,
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          lockedReason: null,
          lockedByPackageKeys: [],
          clonedFromStableId: sourceStableId,
          supersedesStableId: sourceStableId,
          supersededByStableId: null,
          ...buildAuditFields(),
        })

        const validation = validateMockRuntimeAgent(clonedAgent)
        if (Object.keys(validation.errors).length > 0) {
          return buildValidationFailedError('Please check the form for errors.', validation.errors)
        }

        runtimeControlState = {
          ...runtimeControlState,
          agents: [
            clonedAgent,
            ...runtimeControlState.agents.map((agent) =>
              agent.id === agentId
                ? cloneRuntimeAgent({
                    ...agent,
                    supersededByStableId: stableId,
                    ...buildAuditFields(),
                  })
                : agent,
            ),
          ],
        }

        return { data: buildEntityResponse(cloneRuntimeAgent(clonedAgent)) }
      },
      invalidatesTags: (_result, _error, { agentId }) => [
        AGENT_LIST_TAG,
        { type: 'RuntimeAgent', id: agentId },
      ],
    }),

    updateRuntimeAgent: build.mutation({
      queryFn: async ({ agentId, ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'agents',
              entityId: agentId,
              method: 'PATCH',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const existingAgent = findRuntimeAgentById(agentId)
        if (!existingAgent) {
          return buildNotFoundError('Agent was not found.')
        }

        const governedMetadataError = validateMockRuntimeAgentGovernedMetadataFields(payload)
        if (governedMetadataError) return governedMetadataError

        if (existingAgent.isLocked === true) {
          return buildRuntimeAgentLockedConflictError(existingAgent)
        }

        const requestedStatus = String(payload.status ?? '').trim().toUpperCase()
        const currentStatus = String(existingAgent.status ?? '').trim().toUpperCase()
        const lifecycleStatuses = new Set(['ACTIVE', 'INACTIVE', 'DEPRECATED'])

        if (requestedStatus && requestedStatus !== currentStatus && lifecycleStatuses.has(requestedStatus)) {
          return buildConflictError(
            'Agent status must be changed using the lifecycle actions (activate, disable, deprecate).',
            {
              field: 'status',
              reason: 'RUNTIME_AGENT_LIFECYCLE_ACTION_REQUIRED',
            },
          )
        }

        const duplicateAgent = runtimeControlState.agents.find(
          (agent) =>
            agent.id !== agentId
            && String(agent.key ?? '').trim() === String(payload.key ?? existingAgent.key).trim(),
        )

        if (duplicateAgent) {
          return buildConflictError('Agent key must be unique.', {
            field: 'key',
            reason: 'RUNTIME_AGENT_KEY_CONFLICT',
          })
        }

        const nextAgent = cloneRuntimeAgent({
          ...existingAgent,
          ...payload,
          ...buildAuditFields(),
        })

        const validation = validateMockRuntimeAgent(nextAgent)
        if (Object.keys(validation.errors).length > 0) {
          return buildValidationFailedError('Please check the form for errors.', validation.errors)
        }

        runtimeControlState = {
          ...runtimeControlState,
          agents: runtimeControlState.agents.map((agent) =>
            agent.id === agentId ? nextAgent : agent,
          ),
        }

        return { data: buildEntityResponse(cloneRuntimeAgent(nextAgent)) }
      },
      invalidatesTags: (_result, _error, { agentId }) => [
        AGENT_LIST_TAG,
        { type: 'RuntimeAgent', id: agentId },
      ],
    }),

    validateRuntimeAgent: build.mutation({
      queryFn: async ({ agentId } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'agents',
              entityId: `${agentId}/validate`,
              method: 'POST',
              body: {},
            }),
            api,
            extraOptions,
          )
        }

        const agent = findRuntimeAgentById(agentId)
        if (!agent) {
          return buildNotFoundError('Agent was not found.')
        }

        const { errors, warnings } = validateMockRuntimeAgent(agent)
        if (Object.keys(errors).length > 0) {
          return buildValidationFailedError('Agent validation failed.', errors)
        }

        return {
          data: buildEntityResponse({
            valid: true,
            warnings,
          }),
        }
      },
    }),

    testRuntimeAgent: build.mutation({
      queryFn: async ({ agentId, ...payload } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'agents',
              entityId: `${agentId}/test`,
              method: 'POST',
              body: payload ?? {},
            }),
            api,
            extraOptions,
          )
        }

        const agent = findRuntimeAgentById(agentId)
        if (!agent) {
          return buildNotFoundError('Agent was not found.')
        }

        const { errors, warnings } = validateMockRuntimeAgent(agent)
        const normalizedFrameworkKey = normalizeFrameworkKey(payload?.frameworkKey)
        const supportedFrameworkKeys = Array.isArray(agent.supportedFrameworkKeys)
          ? agent.supportedFrameworkKeys.map((value) => normalizeFrameworkKey(value))
          : []

        if (normalizedFrameworkKey && !supportedFrameworkKeys.includes(normalizedFrameworkKey)) {
          errors.frameworkKey = `Agent does not support framework key "${normalizedFrameworkKey}".`
        }

        if (Object.keys(errors).length > 0) {
          return buildValidationFailedError('Agent test failed.', errors)
        }

        const compiledPromptPreview = compilePromptPreview(agent.promptConfig ?? {})

        return {
          data: buildEntityResponse({
            ok: true,
            warnings,
            promptHash: 'mock-prompt-hash',
            compiledPromptPreview,
          }),
        }
      },
    }),

    activateRuntimeAgent: build.mutation({
      queryFn: async ({ agentId } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'agents',
              entityId: `${agentId}/activate`,
              method: 'POST',
              body: {},
            }),
            api,
            extraOptions,
          )
        }

        const existingAgent = findRuntimeAgentById(agentId)
        if (!existingAgent) {
          return buildNotFoundError('Agent was not found.')
        }

        if (String(existingAgent.status ?? '').trim().toUpperCase() === 'DEPRECATED') {
          return buildConflictError('Deprecated agents cannot be activated.', {
            field: 'status',
            reason: 'RUNTIME_AGENT_DEPRECATED',
          })
        }

        const { errors } = validateMockRuntimeAgent(existingAgent)
        if (Object.keys(errors).length > 0) {
          return buildValidationFailedError('Agent must pass validation before activation.', errors)
        }

        const nextAgent = cloneRuntimeAgent({
          ...existingAgent,
          status: 'ACTIVE',
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          agents: runtimeControlState.agents.map((agent) =>
            agent.id === agentId ? nextAgent : agent,
          ),
        }

        return { data: buildEntityResponse(cloneRuntimeAgent(nextAgent)) }
      },
      invalidatesTags: (_result, _error, { agentId }) => [
        AGENT_LIST_TAG,
        { type: 'RuntimeAgent', id: agentId },
      ],
    }),

    disableRuntimeAgent: build.mutation({
      queryFn: async ({ agentId } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'agents',
              entityId: `${agentId}/disable`,
              method: 'POST',
              body: {},
            }),
            api,
            extraOptions,
          )
        }

        const existingAgent = findRuntimeAgentById(agentId)
        if (!existingAgent) {
          return buildNotFoundError('Agent was not found.')
        }

        const dependencies = buildMockRuntimeAgentDependencies(agentId)
        if (dependencies.blocks.length > 0) {
          return buildConflictError(dependencies.blocks[0], {
            field: 'status',
            reason: 'RUNTIME_AGENT_DEPENDENCIES_ACTIVE',
            ...dependencies.summary,
          })
        }

        const nextAgent = cloneRuntimeAgent({
          ...existingAgent,
          status: 'INACTIVE',
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          agents: runtimeControlState.agents.map((agent) =>
            agent.id === agentId ? nextAgent : agent,
          ),
        }

        return { data: buildEntityResponse(cloneRuntimeAgent(nextAgent)) }
      },
      invalidatesTags: (_result, _error, { agentId }) => [
        AGENT_LIST_TAG,
        { type: 'RuntimeAgent', id: agentId },
      ],
    }),

    deprecateRuntimeAgent: build.mutation({
      queryFn: async ({ agentId } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'agents',
              entityId: `${agentId}/deprecate`,
              method: 'POST',
              body: {},
            }),
            api,
            extraOptions,
          )
        }

        const existingAgent = findRuntimeAgentById(agentId)
        if (!existingAgent) {
          return buildNotFoundError('Agent was not found.')
        }

        const dependencies = buildMockRuntimeAgentDependencies(agentId)
        if (dependencies.blocks.length > 0) {
          return buildConflictError(dependencies.blocks[0], {
            field: 'status',
            reason: 'RUNTIME_AGENT_DEPENDENCIES_ACTIVE',
            ...dependencies.summary,
          })
        }

        const nextAgent = cloneRuntimeAgent({
          ...existingAgent,
          status: 'DEPRECATED',
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          agents: runtimeControlState.agents.map((agent) =>
            agent.id === agentId ? nextAgent : agent,
          ),
        }

        return { data: buildEntityResponse(cloneRuntimeAgent(nextAgent)) }
      },
      invalidatesTags: (_result, _error, { agentId }) => [
        AGENT_LIST_TAG,
        { type: 'RuntimeAgent', id: agentId },
      ],
    }),

    listSkillRoles: build.query({
      queryFn: async (
        {
          page = 1,
          pageSize = SKILL_ROLE_REGISTRY_PAGE_SIZE,
          q = '',
          status = '',
          sortBy = '',
          sortOrder = '',
        } = {},
        api,
        extraOptions,
        baseQuery,
      ) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlListRequest({
              resourcePath: 'skill-roles',
              page,
              pageSize,
              q,
              status,
              sortBy,
              sortOrder,
              defaultPageSize: SKILL_ROLE_REGISTRY_PAGE_SIZE,
            }),
            api,
            extraOptions,
          )
        }

        const normalizedPage = normalizePositiveInteger(page, 1)
        const normalizedPageSize = normalizePositiveInteger(pageSize, SKILL_ROLE_REGISTRY_PAGE_SIZE)
        const rows = getSkillRoleRows({ q, status, sortBy, sortOrder })

        return {
          data: buildListResponse({
            rows,
            page: normalizedPage,
            pageSize: normalizedPageSize,
            filters: {
              q: String(q ?? '').trim(),
              status: String(status ?? '').trim(),
              sortBy: String(sortBy ?? '').trim(),
              sortOrder: String(sortOrder ?? '').trim().toLowerCase(),
            },
          }),
        }
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'SkillRole', id })),
              SKILL_ROLE_LIST_TAG,
            ]
          : [SKILL_ROLE_LIST_TAG],
    }),

    createSkillRole: build.mutation({
      queryFn: async (payload = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'skill-roles',
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const runtimePayload = payload
        const metadataError = validateMockSkillRoleGovernedMetadataFields(runtimePayload)
        if (metadataError) return metadataError

        const roleKey = String(runtimePayload.roleKey ?? '').trim().toUpperCase()

        const duplicate = runtimeControlState.skillRoles.find(
          (role) => String(role.roleKey ?? '').trim().toUpperCase() === roleKey,
        )

        if (duplicate) {
          return buildConflictError('Role key must be unique.', {
            roleKey: 'Role key must be unique.',
          })
        }

        const createdRole = cloneSkillRoleRegistryEntry({
          id: buildSkillRoleRegistryStableId(roleKey),
          roleKey,
          label: String(runtimePayload.label ?? '').trim(),
          description: String(runtimePayload.description ?? '').trim(),
          status: String(runtimePayload.status ?? SKILL_ROLE_REGISTRY_STATUSES.DRAFT).trim().toUpperCase(),
          category: String(runtimePayload.category ?? SKILL_ROLE_REGISTRY_CATEGORIES.EXECUTION_ROLE).trim().toUpperCase(),
          allowedOperations: Array.isArray(runtimePayload.allowedOperations)
            ? [...new Set(runtimePayload.allowedOperations.map((value) => String(value).trim().toUpperCase()).filter(Boolean))]
            : [SKILL_ROLE_REGISTRY_OPERATIONS.READ],
          allowedReadScopes: Array.isArray(runtimePayload.allowedReadScopes)
            ? [...new Set(runtimePayload.allowedReadScopes.map((value) => String(value).trim()).filter(Boolean))]
            : [],
          allowedWriteScopes: Array.isArray(runtimePayload.allowedWriteScopes)
            ? [...new Set(runtimePayload.allowedWriteScopes.map((value) => String(value).trim()).filter(Boolean))]
            : [],
          isSystem: false,
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          skillRoles: [createdRole, ...runtimeControlState.skillRoles],
        }

        return { data: buildEntityResponse(attachSkillRoleUsageCount(createdRole)) }
      },
      invalidatesTags: [SKILL_ROLE_LIST_TAG],
    }),

    cloneSkillRole: build.mutation({
      queryFn: async ({ roleId, ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'skill-roles',
              entityId: `${roleId}/clone`,
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const metadataError = validateMockSkillRoleGovernedMetadataFields(payload)
        if (metadataError) return metadataError

        const source = findSkillRoleById(roleId)
        if (!source) {
          return buildNotFoundError('Skill role was not found.')
        }

        const roleKey = String(payload.roleKey ?? '').trim().toUpperCase()
        const duplicate = runtimeControlState.skillRoles.find(
          (role) => String(role.roleKey ?? '').trim().toUpperCase() === roleKey,
        )

        if (duplicate) {
          return buildConflictError('Role key must be unique.', {
            roleKey: 'Role key must be unique.',
          })
        }

        const stableId = buildSkillRoleRegistryStableId(roleKey)
        const sourceStableId = source.stableId || source.id
        const clonedRole = cloneSkillRoleRegistryEntry({
          ...source,
          id: stableId,
          stableId,
          roleKey,
          label: String(payload.label ?? source.label ?? '').trim(),
          description: String(payload.description ?? source.description ?? '').trim(),
          status: SKILL_ROLE_REGISTRY_STATUSES.DRAFT,
          category: String(payload.category ?? source.category ?? SKILL_ROLE_REGISTRY_CATEGORIES.EXECUTION_ROLE)
            .trim()
            .toUpperCase(),
          allowedOperations: Array.isArray(payload.allowedOperations)
            ? [...new Set(payload.allowedOperations.map((value) => String(value).trim().toUpperCase()).filter(Boolean))]
            : source.allowedOperations,
          allowedReadScopes: Array.isArray(payload.allowedReadScopes)
            ? [...new Set(payload.allowedReadScopes.map((value) => String(value).trim()).filter(Boolean))]
            : source.allowedReadScopes,
          allowedWriteScopes: Array.isArray(payload.allowedWriteScopes)
            ? [...new Set(payload.allowedWriteScopes.map((value) => String(value).trim()).filter(Boolean))]
            : source.allowedWriteScopes,
          isSystem: false,
          componentVersion: (Number(source.componentVersion) || 1) + 1,
          versionStatus: 'DRAFT',
          lineageId: source.lineageId || sourceStableId,
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          lockedReason: null,
          lockedByPackageKeys: [],
          clonedFromStableId: sourceStableId,
          supersedesStableId: sourceStableId,
          supersededByStableId: null,
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          skillRoles: [
            clonedRole,
            ...runtimeControlState.skillRoles.map((role) =>
              role.id === source.id
                ? cloneSkillRoleRegistryEntry({ ...role, supersededByStableId: clonedRole.id })
                : role,
            ),
          ],
        }

        return { data: buildEntityResponse(attachSkillRoleUsageCount(clonedRole)) }
      },
      invalidatesTags: [SKILL_ROLE_LIST_TAG],
    }),

    getSkillRole: build.query({
      queryFn: async (roleId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('skill-roles', roleId),
            api,
            extraOptions,
          )
        }

        const role = findSkillRoleById(roleId)
        if (!role) {
          return buildNotFoundError('Skill role was not found.')
        }

        return { data: buildEntityResponse(attachSkillRoleUsageCount(role)) }
      },
      providesTags: (_result, _error, roleId) => [
        { type: 'SkillRole', id: roleId },
      ],
    }),

    updateSkillRole: build.mutation({
      queryFn: async ({ roleId, ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'skill-roles',
              entityId: roleId,
              method: 'PATCH',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const runtimePayload = payload
        const metadataError = validateMockSkillRoleGovernedMetadataFields(runtimePayload)
        if (metadataError) return metadataError

        const existingRole = findSkillRoleById(roleId)
        if (!existingRole) {
          return buildNotFoundError('Skill role was not found.')
        }

        if (existingRole.isLocked === true) {
          return buildSkillRoleLockedConflictError(existingRole)
        }

        if (runtimePayload.roleKey !== undefined) {
          const nextRoleKey = String(runtimePayload.roleKey ?? '').trim().toUpperCase()
          if (nextRoleKey && nextRoleKey !== String(existingRole.roleKey ?? '').trim().toUpperCase()) {
            return buildValidationFailedError('Validation failed.', {
              roleKey: 'Role key is immutable and cannot be changed after creation.',
            })
          }
        }

        const nextRole = cloneSkillRoleRegistryEntry({
          ...existingRole,
          ...(runtimePayload.label !== undefined ? { label: String(runtimePayload.label ?? '').trim() } : {}),
          ...(runtimePayload.description !== undefined ? { description: String(runtimePayload.description ?? '').trim() } : {}),
          ...(runtimePayload.status !== undefined ? { status: String(runtimePayload.status ?? '').trim().toUpperCase() } : {}),
          ...(runtimePayload.category !== undefined ? { category: String(runtimePayload.category ?? '').trim().toUpperCase() } : {}),
          ...(runtimePayload.allowedOperations !== undefined
            ? {
                allowedOperations: Array.isArray(runtimePayload.allowedOperations)
                  ? [...new Set(runtimePayload.allowedOperations.map((value) => String(value).trim().toUpperCase()).filter(Boolean))]
                  : [],
              }
            : {}),
          ...(runtimePayload.allowedReadScopes !== undefined
            ? {
                allowedReadScopes: Array.isArray(runtimePayload.allowedReadScopes)
                  ? [...new Set(runtimePayload.allowedReadScopes.map((value) => String(value).trim()).filter(Boolean))]
                  : [],
              }
            : {}),
          ...(runtimePayload.allowedWriteScopes !== undefined
            ? {
                allowedWriteScopes: Array.isArray(runtimePayload.allowedWriteScopes)
                  ? [...new Set(runtimePayload.allowedWriteScopes.map((value) => String(value).trim()).filter(Boolean))]
                  : [],
              }
            : {}),
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          skillRoles: runtimeControlState.skillRoles.map((role) =>
            role.id === existingRole.id ? nextRole : role,
          ),
        }

        return { data: buildEntityResponse(attachSkillRoleUsageCount(nextRole)) }
      },
      invalidatesTags: (_result, _error, { roleId }) => [
        SKILL_ROLE_LIST_TAG,
        { type: 'SkillRole', id: roleId },
        { type: 'SkillRoleDependencies', id: roleId },
      ],
    }),

    getSkillRoleDependencies: build.query({
      queryFn: async (roleId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('skill-roles', `${roleId}/dependencies`),
            api,
            extraOptions,
          )
        }

        const role = findSkillRoleById(roleId)
        if (!role) {
          return buildNotFoundError('Skill role was not found.')
        }

        const dependencies = buildMockSkillRoleDependencies(role.roleKey)

        return {
          data: buildEntityResponse({
            id: roleId,
            roleKey: role.roleKey,
            dependencies,
          }),
        }
      },
      providesTags: (_result, _error, roleId) => [
        { type: 'SkillRoleDependencies', id: roleId },
      ],
    }),

    listRuntimePaths: build.query({
      queryFn: async (
        {
          page = 1,
          pageSize = RUNTIME_PATH_REGISTRY_PAGE_SIZE,
          q = '',
          status = '',
          frameworkKey = '',
          frameworkKeys = '',
          scope = '',
          operation = '',
          category = '',
          dataType = '',
          sourceType = '',
          isProtected = '',
        } = {},
        api,
        extraOptions,
        baseQuery,
      ) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlListRequest({
              resourcePath: 'runtime-paths',
              page,
              pageSize,
              q,
              status,
              frameworkKey,
              frameworkKeys,
              scope,
              operation,
              category,
              dataType,
              sourceType,
              isProtected,
              defaultPageSize: RUNTIME_PATH_REGISTRY_PAGE_SIZE,
            }),
            api,
            extraOptions,
          )
        }

        const normalizedPage = normalizePositiveInteger(page, 1)
        const normalizedPageSize = normalizePositiveInteger(pageSize, RUNTIME_PATH_REGISTRY_PAGE_SIZE)
        const rows = getRuntimePathRows({
          q,
          status,
          frameworkKey,
          frameworkKeys,
          scope,
          operation,
          category,
          dataType,
          sourceType,
          isProtected,
        })

        return {
          data: buildListResponse({
            rows,
            page: normalizedPage,
            pageSize: normalizedPageSize,
            filters: {
              q: String(q ?? '').trim(),
              status: String(status ?? '').trim(),
              frameworkKey: normalizeFrameworkKey(frameworkKey),
              frameworkKeys: String(frameworkKeys ?? '').trim(),
              scope: String(scope ?? '').trim(),
              operation: String(operation ?? '').trim(),
              category: String(category ?? '').trim(),
              dataType: String(dataType ?? '').trim(),
              sourceType: String(sourceType ?? '').trim(),
              isProtected: String(isProtected ?? '').trim(),
            },
          }),
        }
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'RuntimePath', id })),
              RUNTIME_PATH_LIST_TAG,
            ]
          : [RUNTIME_PATH_LIST_TAG],
    }),

    createRuntimePath: build.mutation({
      queryFn: async (payload = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'runtime-paths',
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const pathKey = String(payload.pathKey ?? '').trim()
        if (findRuntimePathByPathKey(pathKey)) {
          return buildConflictError('Path key must be unique.', {
            pathKey: 'Path key must be unique.',
          })
        }

        const nextPayload = buildRuntimePathMockPayload({
          status: RUNTIME_PATH_REGISTRY_STATUSES.DRAFT,
          isSystem: false,
          ...payload,
        })
        const validationErrors = validateMockRuntimePathPayload(nextPayload)
        if (Object.keys(validationErrors).length > 0) {
          return buildValidationFailedError('Please check the form for errors.', validationErrors)
        }

        const created = cloneRuntimePathRegistryEntry({
          id: buildRuntimePathRegistryStableId(nextPayload.pathKey),
          ...nextPayload,
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          runtimePaths: [created, ...runtimeControlState.runtimePaths],
        }

        return { data: buildEntityResponse(cloneRuntimePathRegistryEntry(created)) }
      },
      invalidatesTags: [RUNTIME_PATH_LIST_TAG],
    }),

    getRuntimePath: build.query({
      queryFn: async (pathId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('runtime-paths', pathId),
            api,
            extraOptions,
          )
        }

        const runtimePath = findRuntimePathById(pathId)
        if (!runtimePath) {
          return buildNotFoundError('Runtime path was not found.')
        }

        return { data: buildEntityResponse(cloneRuntimePathRegistryEntry(runtimePath)) }
      },
      providesTags: (_result, _error, pathId) => [
        { type: 'RuntimePath', id: pathId },
      ],
    }),

    updateRuntimePath: build.mutation({
      queryFn: async ({ pathId, ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'runtime-paths',
              entityId: pathId,
              method: 'PATCH',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const existing = findRuntimePathById(pathId)
        if (!existing) {
          return buildNotFoundError('Runtime path was not found.')
        }

        if (existing.isLocked === true) {
          return buildRuntimePathLockedConflictError(existing)
        }

        if (
          payload.pathKey !== undefined
          && String(payload.pathKey ?? '').trim() !== String(existing.pathKey ?? '').trim()
        ) {
          return buildValidationFailedError('Validation failed.', {
            pathKey: 'Path key is immutable and cannot be changed after creation.',
          })
        }

        const nextPayload = buildRuntimePathMockPayload(payload, existing)
        const validationErrors = validateMockRuntimePathPayload(nextPayload, { isEditMode: true })
        if (Object.keys(validationErrors).length > 0) {
          return buildValidationFailedError('Please check the form for errors.', validationErrors)
        }

        const next = cloneRuntimePathRegistryEntry({
          ...nextPayload,
          id: existing.id,
          pathKey: existing.pathKey,
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          runtimePaths: runtimeControlState.runtimePaths.map((row) =>
            row.id === pathId ? next : row,
          ),
        }

        return { data: buildEntityResponse(cloneRuntimePathRegistryEntry(next)) }
      },
      invalidatesTags: (_result, _error, { pathId }) => [
        RUNTIME_PATH_LIST_TAG,
        { type: 'RuntimePath', id: pathId },
      ],
    }),

    cloneRuntimePath: build.mutation({
      queryFn: async ({ pathId, ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'runtime-paths',
              entityId: `${pathId}/clone`,
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const source = findRuntimePathById(pathId)
        if (!source) {
          return buildNotFoundError('Runtime path was not found.')
        }

        const pathKey = String(payload.pathKey ?? '').trim()
        if (findRuntimePathByPathKey(pathKey)) {
          return buildConflictError('Path key must be unique.', {
            pathKey: 'Path key must be unique.',
          })
        }

        if (payload.status !== undefined && payload.status !== RUNTIME_PATH_REGISTRY_STATUSES.DRAFT) {
          return buildValidationFailedError('Please check the form for errors.', {
            status: 'Cloned runtime paths must start in DRAFT status.',
          })
        }

        const nextPayload = {
          ...buildRuntimePathMockPayload({
            ...source,
            pathKey,
            label: payload.label ?? source.label,
            description: payload.description ?? source.description,
            status: RUNTIME_PATH_REGISTRY_STATUSES.DRAFT,
            isSystem: false,
          }),
          componentVersion: (Number(source.componentVersion) || 1) + 1,
          versionStatus: 'DRAFT',
          lineageId: source.lineageId || source.stableId || source.id,
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          lockedReason: null,
          lockedByPackageKeys: [],
          clonedFromStableId: source.stableId || source.id,
          supersedesStableId: source.stableId || source.id,
          supersededByStableId: null,
        }
        const validationErrors = validateMockRuntimePathPayload(nextPayload)
        if (Object.keys(validationErrors).length > 0) {
          return buildValidationFailedError('Please check the form for errors.', validationErrors)
        }

        const created = cloneRuntimePathRegistryEntry({
          ...nextPayload,
          id: buildRuntimePathRegistryStableId(nextPayload.pathKey),
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          runtimePaths: [created, ...runtimeControlState.runtimePaths],
        }

        return { data: buildEntityResponse(cloneRuntimePathRegistryEntry(created)) }
      },
      invalidatesTags: [RUNTIME_PATH_LIST_TAG],
    }),

    duplicateRuntimePath: build.mutation({
      queryFn: async ({ pathId, ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'runtime-paths',
              entityId: `${pathId}/duplicate`,
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const source = findRuntimePathById(pathId)
        if (!source) {
          return buildNotFoundError('Runtime path was not found.')
        }

        const pathKey = String(payload.pathKey ?? '').trim()
        if (findRuntimePathByPathKey(pathKey)) {
          return buildConflictError('Path key must be unique.', {
            pathKey: 'Path key must be unique.',
          })
        }

        if (payload.status !== undefined && payload.status !== RUNTIME_PATH_REGISTRY_STATUSES.DRAFT) {
          return buildValidationFailedError('Please check the form for errors.', {
            status: 'Cloned runtime paths must start in DRAFT status.',
          })
        }

        const nextPayload = {
          ...buildRuntimePathMockPayload({
            ...source,
            pathKey,
            label: payload.label ?? source.label,
            description: payload.description ?? source.description,
            status: RUNTIME_PATH_REGISTRY_STATUSES.DRAFT,
            isSystem: false,
          }),
          componentVersion: (Number(source.componentVersion) || 1) + 1,
          versionStatus: 'DRAFT',
          lineageId: source.lineageId || source.stableId || source.id,
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          lockedReason: null,
          lockedByPackageKeys: [],
          clonedFromStableId: source.stableId || source.id,
          supersedesStableId: source.stableId || source.id,
          supersededByStableId: null,
        }
        const validationErrors = validateMockRuntimePathPayload(nextPayload)
        if (Object.keys(validationErrors).length > 0) {
          return buildValidationFailedError('Please check the form for errors.', validationErrors)
        }

        const created = cloneRuntimePathRegistryEntry({
          ...nextPayload,
          id: buildRuntimePathRegistryStableId(nextPayload.pathKey),
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          runtimePaths: [created, ...runtimeControlState.runtimePaths],
        }

        return { data: buildEntityResponse(cloneRuntimePathRegistryEntry(created)) }
      },
      invalidatesTags: [RUNTIME_PATH_LIST_TAG],
    }),

    getRuntimePathDependencies: build.query({
      queryFn: async (pathId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('runtime-paths', `${pathId}/dependencies`),
            api,
            extraOptions,
          )
        }

        const runtimePath = findRuntimePathById(pathId)
        if (!runtimePath) {
          return buildNotFoundError('Runtime path was not found.')
        }

        return {
          data: buildEntityResponse({
            id: pathId,
            pathKey: runtimePath.pathKey,
            dependencies: buildMockRuntimePathDependencies(runtimePath.pathKey),
          }),
        }
      },
      providesTags: (_result, _error, pathId) => [
        { type: 'RuntimePath', id: pathId },
      ],
    }),

    activateRuntimePath: build.mutation({
      queryFn: async ({ pathId } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'runtime-paths',
              entityId: `${pathId}/activate`,
              method: 'POST',
              body: {},
            }),
            api,
            extraOptions,
          )
        }

        const runtimePath = findRuntimePathById(pathId)
        if (!runtimePath) {
          return buildNotFoundError('Runtime path was not found.')
        }

        if (runtimePath.isLocked === true) {
          return buildRuntimePathLockedConflictError(runtimePath)
        }

        const next = cloneRuntimePathRegistryEntry({
          ...runtimePath,
          status: RUNTIME_PATH_REGISTRY_STATUSES.ACTIVE,
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          runtimePaths: runtimeControlState.runtimePaths.map((row) =>
            row.id === pathId ? next : row,
          ),
        }

        return { data: buildEntityResponse(cloneRuntimePathRegistryEntry(next)) }
      },
      invalidatesTags: (_result, _error, { pathId }) => [
        RUNTIME_PATH_LIST_TAG,
        { type: 'RuntimePath', id: pathId },
      ],
    }),

    disableRuntimePath: build.mutation({
      queryFn: async ({ pathId, confirmDependencies = false } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'runtime-paths',
              entityId: `${pathId}/disable`,
              method: 'POST',
              body: { confirmDependencies },
            }),
            api,
            extraOptions,
          )
        }

        const runtimePath = findRuntimePathById(pathId)
        if (!runtimePath) {
          return buildNotFoundError('Runtime path was not found.')
        }

        if (runtimePath.isLocked === true) {
          return buildRuntimePathLockedConflictError(runtimePath)
        }

        const dependencies = buildMockRuntimePathDependencies(runtimePath.pathKey)
        if (dependencies.hasActiveDependencies && !confirmDependencies) {
          return buildRuntimePathDependencyConfirmationError(dependencies)
        }

        const next = cloneRuntimePathRegistryEntry({
          ...runtimePath,
          status: RUNTIME_PATH_REGISTRY_STATUSES.INACTIVE,
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          runtimePaths: runtimeControlState.runtimePaths.map((row) =>
            row.id === pathId ? next : row,
          ),
        }

        return { data: buildEntityResponse(cloneRuntimePathRegistryEntry(next)) }
      },
      invalidatesTags: (_result, _error, { pathId }) => [
        RUNTIME_PATH_LIST_TAG,
        { type: 'RuntimePath', id: pathId },
      ],
    }),

    deprecateRuntimePath: build.mutation({
      queryFn: async (args = {}, api, extraOptions, baseQuery) => {
        const {
          pathId,
          confirmDependencies = false,
        } = args
        const hasDeprecatedInVersion = Object.prototype.hasOwnProperty.call(args, 'deprecatedInVersion')
        const deprecatedInVersion = hasDeprecatedInVersion ? args.deprecatedInVersion : undefined
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'runtime-paths',
              entityId: `${pathId}/deprecate`,
              method: 'POST',
              body: {
                ...(hasDeprecatedInVersion ? { deprecatedInVersion } : {}),
                confirmDependencies,
              },
            }),
            api,
            extraOptions,
          )
        }

        const runtimePath = findRuntimePathById(pathId)
        if (!runtimePath) {
          return buildNotFoundError('Runtime path was not found.')
        }

        if (runtimePath.isLocked === true) {
          return buildRuntimePathLockedConflictError(runtimePath)
        }

        const dependencies = buildMockRuntimePathDependencies(runtimePath.pathKey)
        if (dependencies.hasActiveDependencies && !confirmDependencies) {
          return buildRuntimePathDependencyConfirmationError(dependencies)
        }

        const next = cloneRuntimePathRegistryEntry({
          ...runtimePath,
          status: RUNTIME_PATH_REGISTRY_STATUSES.DEPRECATED,
          deprecatedInVersion: hasDeprecatedInVersion
            ? normalizeRuntimePathNullableText(deprecatedInVersion)
            : runtimePath.deprecatedInVersion,
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          runtimePaths: runtimeControlState.runtimePaths.map((row) =>
            row.id === pathId ? next : row,
          ),
        }

        return { data: buildEntityResponse(cloneRuntimePathRegistryEntry(next)) }
      },
      invalidatesTags: (_result, _error, { pathId }) => [
        RUNTIME_PATH_LIST_TAG,
        { type: 'RuntimePath', id: pathId },
      ],
    }),

    listRuntimeSkills: build.query({
      queryFn: async (
        { page = 1, pageSize = RUNTIME_SKILL_PAGE_SIZE, q = '', status = '', frameworkKey = '' } = {},
        api,
        extraOptions,
        baseQuery,
      ) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlListRequest({
              resourcePath: 'skills',
              page,
              pageSize,
              q,
              status,
              frameworkKey,
              defaultPageSize: RUNTIME_SKILL_PAGE_SIZE,
            }),
            api,
            extraOptions,
          )
        }

        const normalizedPage = normalizePositiveInteger(page, 1)
        const normalizedPageSize = normalizePositiveInteger(pageSize, RUNTIME_SKILL_PAGE_SIZE)
        const rows = getRuntimeSkillRows({ q, status, frameworkKey })

        return {
          data: buildListResponse({
            rows,
            page: normalizedPage,
            pageSize: normalizedPageSize,
            filters: {
              q: String(q ?? '').trim(),
              status: String(status ?? '').trim(),
              frameworkKey: normalizeFrameworkKey(frameworkKey),
            },
          }),
        }
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'RuntimeSkill', id })),
              SKILL_LIST_TAG,
            ]
          : [SKILL_LIST_TAG],
    }),

    createRuntimeSkill: build.mutation({
      queryFn: async (payload = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'skills',
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const runtimePayload = payload
        const governedMetadataError = validateMockRuntimeSkillGovernedMetadataFields(runtimePayload)
        if (governedMetadataError) {
          return governedMetadataError
        }

        const duplicateSkill = runtimeControlState.skills.find(
          (skill) => String(skill.key ?? '').trim() === String(runtimePayload.key ?? '').trim(),
        )

        if (duplicateSkill) {
          return buildConflictError('Skill key must be unique.', {
            field: 'key',
            reason: 'RUNTIME_SKILL_KEY_CONFLICT',
          })
        }

        const skillRoleError = validateMockRuntimeSkillRoleKey(runtimePayload.skillRoleKey)
        if (skillRoleError) {
          return buildValidationFailedError('Please check the form for errors.', {
            skillRoleKey: skillRoleError,
          })
        }

        const skillRoleScopeError = validateMockRuntimeSkillRoleWriteScopes({
          skillRoleKey: runtimePayload.skillRoleKey,
          allowedWritePaths: runtimePayload.allowedWritePaths,
        })
        if (skillRoleScopeError) {
          return buildValidationFailedError('Please check the form for errors.', {
            allowedWritePaths: skillRoleScopeError,
          })
        }

        const stableId = generateRuntimeId('skill', runtimePayload.key)
        const createdSkill = {
          id: stableId,
          ...cloneRuntimeSkill({
            id: stableId,
            stableId,
            ...runtimePayload,
            componentVersion: 1,
            versionStatus: String(runtimePayload.status ?? '').trim().toUpperCase() === 'ACTIVE'
              ? 'ACTIVE'
              : 'DRAFT',
            lineageId: stableId,
            isLocked: false,
            lockedAt: null,
            lockedBy: null,
            lockedReason: '',
            lockedByPackageKeys: [],
            clonedFromStableId: null,
            supersedesStableId: null,
            supersededByStableId: null,
            dependencySummary: { agentIds: [], workflowPolicyIds: [] },
            ...buildAuditFields(),
          }),
        }

        runtimeControlState = {
          ...runtimeControlState,
          skills: [createdSkill, ...runtimeControlState.skills],
        }

        return { data: buildEntityResponse(cloneRuntimeSkill(createdSkill)) }
      },
      invalidatesTags: [SKILL_LIST_TAG],
    }),

    cloneRuntimeSkill: build.mutation({
      queryFn: async ({ skillId, ...payload } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'skills',
              entityId: `${skillId}/clone`,
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const governedMetadataError = validateMockRuntimeSkillGovernedMetadataFields(payload)
        if (governedMetadataError) {
          return governedMetadataError
        }

        const sourceSkill = findRuntimeSkillById(skillId)
        if (!sourceSkill) {
          return buildNotFoundError('Skill was not found.')
        }

        const duplicateSkill = runtimeControlState.skills.find(
          (skill) => String(skill.key ?? '').trim() === String(payload.key ?? '').trim(),
        )

        if (duplicateSkill) {
          return buildConflictError('Skill key must be unique.', {
            field: 'key',
            reason: 'RUNTIME_SKILL_KEY_CONFLICT',
          })
        }

        const stableId = generateRuntimeId('skill', payload.key)
        const sourceStableId = sourceSkill.stableId || sourceSkill.id
        const clonedSkill = cloneRuntimeSkill({
          ...sourceSkill,
          id: stableId,
          stableId,
          key: payload.key,
          name: payload.name,
          description: payload.description ?? sourceSkill.description ?? '',
          status: RUNTIME_SKILL_STATUSES.DRAFT,
          componentVersion: Number(sourceSkill.componentVersion ?? 1) + 1,
          versionStatus: 'DRAFT',
          lineageId: sourceSkill.lineageId || sourceStableId,
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          lockedReason: '',
          lockedByPackageKeys: [],
          clonedFromStableId: sourceStableId,
          supersedesStableId: sourceStableId,
          supersededByStableId: null,
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          skills: [
            clonedSkill,
            ...runtimeControlState.skills.map((skill) =>
              skill.id === sourceSkill.id
                ? cloneRuntimeSkill({
                    ...skill,
                    supersededByStableId: stableId,
                    ...buildAuditFields(),
                  })
                : skill,
            ),
          ],
        }

        return { data: buildEntityResponse(cloneRuntimeSkill(clonedSkill)) }
      },
      invalidatesTags: (_result, _error, { skillId }) => [
        SKILL_LIST_TAG,
        { type: 'RuntimeSkill', id: skillId },
      ],
    }),

    getRuntimeSkill: build.query({
      queryFn: async (skillId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('skills', skillId),
            api,
            extraOptions,
          )
        }

        const skill = findRuntimeSkillById(skillId)
        if (!skill) {
          return buildNotFoundError('Skill was not found.')
        }

        return { data: buildEntityResponse(cloneRuntimeSkill(skill)) }
      },
      providesTags: (_result, _error, skillId) => [{ type: 'RuntimeSkill', id: skillId }],
    }),

    updateRuntimeSkill: build.mutation({
      queryFn: async ({ skillId, ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'skills',
              entityId: skillId,
              method: 'PATCH',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const existingSkill = findRuntimeSkillById(skillId)
        if (!existingSkill) {
          return buildNotFoundError('Skill was not found.')
        }

        const governedMetadataError = validateMockRuntimeSkillGovernedMetadataFields(payload)
        if (governedMetadataError) {
          return governedMetadataError
        }

        if (existingSkill.isLocked === true) {
          return buildRuntimeSkillLockedConflictError(existingSkill)
        }

        const duplicateSkill = runtimeControlState.skills.find(
          (skill) =>
            skill.id !== skillId
            && String(skill.key ?? '').trim() === String(payload.key ?? existingSkill.key).trim(),
        )

        if (duplicateSkill) {
          return buildConflictError('Skill key must be unique.', {
            field: 'key',
            reason: 'RUNTIME_SKILL_KEY_CONFLICT',
          })
        }

        const effectiveSkillRoleKey = payload.skillRoleKey ?? existingSkill.skillRoleKey ?? ''
        const skillRoleError = validateMockRuntimeSkillRoleKey(effectiveSkillRoleKey, {
          currentSkillRoleKey: existingSkill.skillRoleKey ?? '',
        })
        if (skillRoleError) {
          return buildValidationFailedError('Please check the form for errors.', {
            skillRoleKey: skillRoleError,
          })
        }

        const skillRoleScopeError = validateMockRuntimeSkillRoleWriteScopes({
          skillRoleKey: effectiveSkillRoleKey,
          allowedWritePaths: payload.allowedWritePaths ?? existingSkill.allowedWritePaths,
        })
        if (skillRoleScopeError) {
          return buildValidationFailedError('Please check the form for errors.', {
            allowedWritePaths: skillRoleScopeError,
          })
        }

        const nextSkill = cloneRuntimeSkill({
          ...existingSkill,
          ...payload,
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          skills: runtimeControlState.skills.map((skill) =>
            skill.id === skillId ? nextSkill : skill,
          ),
        }

        return { data: buildEntityResponse(cloneRuntimeSkill(nextSkill)) }
      },
      invalidatesTags: (_result, _error, { skillId }) => [
        SKILL_LIST_TAG,
        { type: 'RuntimeSkill', id: skillId },
      ],
    }),

    listValidationRegistry: build.query({
      queryFn: async (
        {
          page = 1,
          pageSize = VALIDATION_REGISTRY_PAGE_SIZE,
          q = '',
          keys = '',
          status = '',
          sortBy = '',
          sortOrder = '',
          frameworkKey = '',
          frameworkKeys = '',
          category = '',
          severity = '',
          policyUsable = '',
          packageUsable = '',
        } = {},
        api,
        extraOptions,
        baseQuery,
      ) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlListRequest({
              resourcePath: 'validation-registry',
              page,
              pageSize,
              q,
              keys,
              status,
              sortBy,
              sortOrder,
              frameworkKey,
              frameworkKeys,
              category,
              severity,
              policyUsable,
              packageUsable,
              defaultPageSize: VALIDATION_REGISTRY_PAGE_SIZE,
            }),
            api,
            extraOptions,
          )
        }

        const normalizedPage = normalizePositiveInteger(page, 1)
        const normalizedPageSize = normalizePositiveInteger(pageSize, VALIDATION_REGISTRY_PAGE_SIZE)
        const rows = getValidationRegistryRows({
          q,
          keys,
          status,
          sortBy,
          sortOrder,
          frameworkKey,
          frameworkKeys,
          category,
          severity,
          policyUsable,
          packageUsable,
        })

        return {
          data: buildListResponse({
            rows,
            page: normalizedPage,
            pageSize: normalizedPageSize,
            filters: {
              q: String(q ?? '').trim(),
              keys: String(keys ?? '').trim(),
              status: String(status ?? '').trim(),
              sortBy: String(sortBy ?? '').trim(),
              sortOrder: String(sortOrder ?? '').trim().toLowerCase(),
              frameworkKey: normalizeFrameworkKey(frameworkKey),
              frameworkKeys: String(frameworkKeys ?? '').trim(),
              category: String(category ?? '').trim().toUpperCase(),
              severity: String(severity ?? '').trim().toUpperCase(),
              policyUsable: String(policyUsable ?? '').trim().toLowerCase(),
              packageUsable: String(packageUsable ?? '').trim().toLowerCase(),
            },
          }),
        }
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'ValidationRegistry', id })),
              VALIDATION_REGISTRY_LIST_TAG,
            ]
          : [VALIDATION_REGISTRY_LIST_TAG],
    }),

    createValidationRegistry: build.mutation({
      queryFn: async (payload = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'validation-registry',
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const runtimePayload = payload
        const key = String(runtimePayload.key ?? '').trim().toLowerCase()
        const duplicate = runtimeControlState.validationRegistry.find(
          (row) => String(row.key ?? '').trim().toLowerCase() === key,
        )

        if (duplicate) {
          return buildConflictError('Validation key must be unique.', {
            key: 'Validation key must be unique.',
          })
        }

        const defaultAgentErrors = validateMockValidationRegistryDefaultAgents({
          defaultAgentIds: runtimePayload.defaultAgentIds,
          supportedFrameworkKeys: runtimePayload.supportedFrameworkKeys,
          status: runtimePayload.status,
        })
        if (defaultAgentErrors.length > 0) {
          return buildValidationFailedError('Please check the form for errors.', {
            defaultAgentIds: defaultAgentErrors.join(' '),
          })
        }

        const producerSkillError = validateMockValidationProducerSkill({
          producerSkillId: runtimePayload.producerSkillId,
          supportedFrameworkKeys: runtimePayload.supportedFrameworkKeys,
          status: runtimePayload.status,
        })
        if (producerSkillError) {
          return buildValidationFailedError('Please check the form for errors.', {
            producerSkillId: producerSkillError,
          })
        }

        const pathErrors = validateMockValidationRuntimePaths({
          outputPath: String(runtimePayload.outputPath ?? '').trim(),
          passFieldPath: String(runtimePayload.passFieldPath ?? '').trim(),
          detailsFieldPath: String(runtimePayload.detailsFieldPath ?? '').trim(),
          messageFieldPath: String(runtimePayload.messageFieldPath ?? '').trim(),
          supportedFrameworkKeys: runtimePayload.supportedFrameworkKeys,
        })
        if (Object.keys(pathErrors).length > 0) {
          return buildValidationFailedError('Please check the form for errors.', pathErrors)
        }

        const created = cloneValidationRegistryEntry({
          id: buildValidationRegistryStableId(key),
          key,
          label: String(runtimePayload.label ?? '').trim(),
          description: String(runtimePayload.description ?? '').trim(),
          status: String(runtimePayload.status ?? VALIDATION_REGISTRY_STATUSES.ACTIVE).trim().toUpperCase(),
          supportedFrameworkKeys: Array.isArray(runtimePayload.supportedFrameworkKeys)
            ? runtimePayload.supportedFrameworkKeys.map((value) => normalizeFrameworkKey(value)).filter(Boolean)
            : [],
          category: String(runtimePayload.category ?? '').trim().toUpperCase(),
          severity: String(runtimePayload.severity ?? '').trim().toUpperCase(),
          producerSkillId: String(runtimePayload.producerSkillId ?? '').trim(),
          defaultAgentIds: normalizeStableIdList(runtimePayload.defaultAgentIds),
          outputPath: String(runtimePayload.outputPath ?? '').trim(),
          resultType: String(runtimePayload.resultType ?? '').trim().toUpperCase(),
          passFieldPath: String(runtimePayload.passFieldPath ?? '').trim(),
          detailsFieldPath: String(runtimePayload.detailsFieldPath ?? '').trim(),
          messageFieldPath: String(runtimePayload.messageFieldPath ?? '').trim(),
          parameterSchema: runtimePayload.parameterSchema && typeof runtimePayload.parameterSchema === 'object'
            ? runtimePayload.parameterSchema
            : {},
          defaultParameters: runtimePayload.defaultParameters && typeof runtimePayload.defaultParameters === 'object'
            ? runtimePayload.defaultParameters
            : {},
          retryPolicy: runtimePayload.retryPolicy && typeof runtimePayload.retryPolicy === 'object'
            ? runtimePayload.retryPolicy
            : { maxAttempts: 1, retryableErrorCodes: [], backoffSeconds: 0 },
          policyUsable: runtimePayload.policyUsable === undefined ? true : Boolean(runtimePayload.policyUsable),
          packageUsable: runtimePayload.packageUsable === undefined ? true : Boolean(runtimePayload.packageUsable),
          requiresLatestRun: Boolean(runtimePayload.requiresLatestRun),
          freshnessDefaultMinutes: Number(runtimePayload.freshnessDefaultMinutes ?? 30) || 30,
          blockingDefault: runtimePayload.blockingDefault === undefined ? true : Boolean(runtimePayload.blockingDefault),
          warningOnlyDefault: Boolean(runtimePayload.warningOnlyDefault),
          allowManualRun: runtimePayload.allowManualRun === undefined ? true : Boolean(runtimePayload.allowManualRun),
          executionMode: String(runtimePayload.executionMode ?? 'SYNC').trim().toUpperCase(),
          version: Number(runtimePayload.version ?? 1) || 1,
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          validationRegistry: [created, ...runtimeControlState.validationRegistry],
        }

        return { data: buildEntityResponse(cloneValidationRegistryEntry(created)) }
      },
      invalidatesTags: [VALIDATION_REGISTRY_LIST_TAG],
    }),

    cloneValidationRegistry: build.mutation({
      queryFn: async ({ validationId, body = {} } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'validation-registry',
              entityId: `${validationId}/clone`,
              method: 'POST',
              body,
            }),
            api,
            extraOptions,
          )
        }

        const source = findValidationRegistryById(validationId)
        if (!source) {
          return buildNotFoundError('Validation was not found.')
        }

        const key = String(body.key ?? '').trim().toLowerCase()
        const duplicate = runtimeControlState.validationRegistry.some((row) => row.key === key)
        if (duplicate) {
          return buildConflictError('Validation key must be unique.', {
            field: 'key',
            reason: 'VALIDATION_REGISTRY_KEY_CONFLICT',
          })
        }

        const now = new Date().toISOString()
        const sourceStableId = source.id
        const clone = cloneValidationRegistryEntry({
          ...source,
          id: buildValidationRegistryStableId(key),
          key,
          label: String(body.label ?? '').trim(),
          description: body.description === undefined
            ? source.description
            : String(body.description ?? '').trim(),
          status: VALIDATION_REGISTRY_STATUSES.DRAFT,
          version: Number(source.version ?? 1) + 1,
          componentVersion: Number(source.componentVersion ?? source.version ?? 1) + 1,
          versionStatus: 'DRAFT',
          lineageId: source.lineageId || sourceStableId,
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          lockedReason: '',
          lockedByPackageKeys: [],
          clonedFromStableId: sourceStableId,
          supersedesStableId: sourceStableId,
          supersededByStableId: null,
          createdAt: now,
          updatedAt: now,
          createdBy: { ...RUNTIME_CONTROL_UPDATED_BY },
          updatedBy: { ...RUNTIME_CONTROL_UPDATED_BY },
        })
        const updatedSource = cloneValidationRegistryEntry({
          ...source,
          supersededByStableId: clone.id,
          updatedAt: now,
          updatedBy: { ...RUNTIME_CONTROL_UPDATED_BY },
        })

        runtimeControlState = {
          ...runtimeControlState,
          validationRegistry: [
            clone,
            ...runtimeControlState.validationRegistry.map((row) =>
              row.id === source.id ? updatedSource : row,
            ),
          ],
        }

        return { data: buildEntityResponse(cloneValidationRegistryEntry(clone)) }
      },
      invalidatesTags: (_result, _error, { validationId } = {}) => [
        VALIDATION_REGISTRY_LIST_TAG,
        { type: 'ValidationRegistry', id: validationId },
        { type: 'ValidationRegistryDependencies', id: validationId },
      ],
    }),

    getValidationRegistry: build.query({
      queryFn: async (validationId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('validation-registry', validationId),
            api,
            extraOptions,
          )
        }

        const validation = findValidationRegistryById(validationId)
        if (!validation) {
          return buildNotFoundError('Validation was not found.')
        }

        return { data: buildEntityResponse(cloneValidationRegistryEntry(validation)) }
      },
      providesTags: (_result, _error, validationId) => [
        { type: 'ValidationRegistry', id: validationId },
      ],
    }),

    updateValidationRegistry: build.mutation({
      queryFn: async ({ validationId, ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'validation-registry',
              entityId: validationId,
              method: 'PATCH',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const existing = findValidationRegistryById(validationId)
        if (!existing) {
          return buildNotFoundError('Validation was not found.')
        }

        if (existing.isLocked === true) {
          return buildConflictError(LOCKED_RUNTIME_CONTROL_EDIT_MESSAGE, {
            field: 'isLocked',
            reason: 'VALIDATION_REGISTRY_LOCKED',
            lockedByPackageKeys: Array.isArray(existing.lockedByPackageKeys) ? existing.lockedByPackageKeys : [],
          })
        }

        if (payload.key !== undefined) {
          const nextKey = String(payload.key ?? '').trim().toLowerCase()
          const currentKey = String(existing.key ?? '').trim().toLowerCase()
          if (nextKey && nextKey !== currentKey) {
            return buildValidationFailedError('Validation failed.', {
              key: 'Key is immutable and cannot be changed after creation.',
            })
          }
        }

        const nextBlockingDefault = payload.blockingDefault === undefined ? Boolean(existing.blockingDefault) : Boolean(payload.blockingDefault)
        const nextWarningOnlyDefault = payload.warningOnlyDefault === undefined ? Boolean(existing.warningOnlyDefault) : Boolean(payload.warningOnlyDefault)
        if (nextBlockingDefault && nextWarningOnlyDefault) {
          return buildValidationFailedError('Please check the form for errors.', {
            warningOnlyDefault: 'Blocking Default and Warning Only Default cannot both be true.',
          })
        }

        const nextSupportedFrameworkKeys = payload.supportedFrameworkKeys ?? existing.supportedFrameworkKeys
        const nextStatus = payload.status ?? existing.status
        const nextProducerSkillId = payload.producerSkillId ?? existing.producerSkillId
        const nextOutputPath = String(payload.outputPath ?? existing.outputPath ?? '').trim()
        const nextPassFieldPath = String(payload.passFieldPath ?? existing.passFieldPath ?? '').trim()
        const nextDetailsFieldPath = String(payload.detailsFieldPath ?? existing.detailsFieldPath ?? '').trim()
        const nextMessageFieldPath = String(payload.messageFieldPath ?? existing.messageFieldPath ?? '').trim()

        if (payload.defaultAgentIds !== undefined || payload.supportedFrameworkKeys !== undefined || payload.status !== undefined) {
          const defaultAgentErrors = validateMockValidationRegistryDefaultAgents({
            defaultAgentIds: payload.defaultAgentIds ?? existing.defaultAgentIds,
            supportedFrameworkKeys: nextSupportedFrameworkKeys,
            status: nextStatus,
          })
          if (defaultAgentErrors.length > 0) {
            return buildValidationFailedError('Please check the form for errors.', {
              defaultAgentIds: defaultAgentErrors.join(' '),
            })
          }
        }

        if (payload.producerSkillId !== undefined || payload.supportedFrameworkKeys !== undefined || payload.status !== undefined) {
          const producerSkillError = validateMockValidationProducerSkill({
            producerSkillId: nextProducerSkillId,
            supportedFrameworkKeys: nextSupportedFrameworkKeys,
            status: nextStatus,
          })
          if (producerSkillError) {
            return buildValidationFailedError('Please check the form for errors.', {
              producerSkillId: producerSkillError,
            })
          }
        }

        if (payload.outputPath !== undefined || payload.passFieldPath !== undefined || payload.detailsFieldPath !== undefined || payload.messageFieldPath !== undefined) {
          const pathErrors = validateMockValidationRuntimePaths({
            outputPath: nextOutputPath,
            passFieldPath: nextPassFieldPath,
            detailsFieldPath: nextDetailsFieldPath,
            messageFieldPath: nextMessageFieldPath,
            supportedFrameworkKeys: nextSupportedFrameworkKeys,
          })
          if (Object.keys(pathErrors).length > 0) {
            return buildValidationFailedError('Please check the form for errors.', pathErrors)
          }
        }

        const next = cloneValidationRegistryEntry({
          ...existing,
          ...(payload.label !== undefined ? { label: String(payload.label ?? '').trim() } : {}),
          ...(payload.description !== undefined ? { description: String(payload.description ?? '').trim() } : {}),
          ...(payload.status !== undefined ? { status: String(payload.status ?? '').trim().toUpperCase() } : {}),
          ...(payload.supportedFrameworkKeys !== undefined
            ? {
                supportedFrameworkKeys: Array.isArray(payload.supportedFrameworkKeys)
                  ? payload.supportedFrameworkKeys.map((value) => normalizeFrameworkKey(value)).filter(Boolean)
                  : [],
              }
            : {}),
          ...(payload.category !== undefined ? { category: String(payload.category ?? '').trim().toUpperCase() } : {}),
          ...(payload.severity !== undefined ? { severity: String(payload.severity ?? '').trim().toUpperCase() } : {}),
          ...(payload.producerSkillId !== undefined ? { producerSkillId: String(payload.producerSkillId ?? '').trim() } : {}),
          ...(payload.defaultAgentIds !== undefined ? { defaultAgentIds: normalizeStableIdList(payload.defaultAgentIds) } : {}),
          ...(payload.outputPath !== undefined ? { outputPath: String(payload.outputPath ?? '').trim() } : {}),
          ...(payload.resultType !== undefined ? { resultType: String(payload.resultType ?? '').trim().toUpperCase() } : {}),
          ...(payload.passFieldPath !== undefined ? { passFieldPath: String(payload.passFieldPath ?? '').trim() } : {}),
          ...(payload.detailsFieldPath !== undefined ? { detailsFieldPath: String(payload.detailsFieldPath ?? '').trim() } : {}),
          ...(payload.messageFieldPath !== undefined ? { messageFieldPath: String(payload.messageFieldPath ?? '').trim() } : {}),
          ...(payload.parameterSchema !== undefined ? { parameterSchema: payload.parameterSchema && typeof payload.parameterSchema === 'object' ? payload.parameterSchema : {} } : {}),
          ...(payload.defaultParameters !== undefined ? { defaultParameters: payload.defaultParameters && typeof payload.defaultParameters === 'object' ? payload.defaultParameters : {} } : {}),
          ...(payload.retryPolicy !== undefined ? { retryPolicy: payload.retryPolicy && typeof payload.retryPolicy === 'object' ? payload.retryPolicy : { maxAttempts: 1, retryableErrorCodes: [], backoffSeconds: 0 } } : {}),
          ...(payload.policyUsable !== undefined ? { policyUsable: Boolean(payload.policyUsable) } : {}),
          ...(payload.packageUsable !== undefined ? { packageUsable: Boolean(payload.packageUsable) } : {}),
          ...(payload.requiresLatestRun !== undefined ? { requiresLatestRun: Boolean(payload.requiresLatestRun) } : {}),
          ...(payload.freshnessDefaultMinutes !== undefined ? { freshnessDefaultMinutes: Number(payload.freshnessDefaultMinutes ?? 0) } : {}),
          ...(payload.blockingDefault !== undefined ? { blockingDefault: nextBlockingDefault } : {}),
          ...(payload.warningOnlyDefault !== undefined ? { warningOnlyDefault: nextWarningOnlyDefault } : {}),
          ...(payload.allowManualRun !== undefined ? { allowManualRun: Boolean(payload.allowManualRun) } : {}),
          ...(payload.executionMode !== undefined ? { executionMode: String(payload.executionMode ?? 'SYNC').trim().toUpperCase() } : {}),
          ...(payload.version !== undefined ? { version: Number(payload.version ?? 1) || 1 } : {}),
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          validationRegistry: runtimeControlState.validationRegistry.map((row) =>
            row.id === validationId || row.key === validationId ? next : row,
          ),
        }

        return { data: buildEntityResponse(cloneValidationRegistryEntry(next)) }
      },
      invalidatesTags: (_result, _error, { validationId }) => [
        VALIDATION_REGISTRY_LIST_TAG,
        { type: 'ValidationRegistry', id: validationId },
        { type: 'ValidationRegistryDependencies', id: validationId },
      ],
    }),

    getValidationRegistryDependencies: build.query({
      queryFn: async (validationId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('validation-registry', `${validationId}/dependencies`),
            api,
            extraOptions,
          )
        }

        const validation = findValidationRegistryById(validationId)
        if (!validation) {
          return buildNotFoundError('Validation was not found.')
        }

        const dependencies = buildMockValidationRegistryDependencies(validation)
        const producerSkill = findRuntimeSkillById(validation.producerSkillId)
        const runtimePaths = buildMockValidationRuntimePathSummaries([
          validation.outputPath,
          validation.passFieldPath,
          validation.detailsFieldPath,
          validation.messageFieldPath,
        ])
        const defaultAgents = buildMockValidationDefaultAgentSummaries(
          validation.defaultAgentIds,
          validation.supportedFrameworkKeys,
        )

        return {
          data: buildEntityResponse({
            id: validationId,
            key: validation.key,
            producerSkill: producerSkill
              ? {
                  id: producerSkill.id,
                  key: producerSkill.key,
                  name: producerSkill.name,
                  status: producerSkill.status,
                }
              : null,
            runtimePaths,
            defaultAgents,
            dependencies,
          }),
        }
      },
      providesTags: (_result, _error, validationId) => [
        { type: 'ValidationRegistryDependencies', id: validationId },
      ],
    }),

    listWorkflowPolicies: build.query({
      queryFn: async (
        { page = 1, pageSize = WORKFLOW_POLICY_PAGE_SIZE, q = '', status = '', frameworkKey = '', type = '' } = {},
        api,
        extraOptions,
        baseQuery,
      ) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlListRequest({
              resourcePath: 'workflow-policies',
              page,
              pageSize,
              q,
              status,
              frameworkKey,
              type,
              defaultPageSize: WORKFLOW_POLICY_PAGE_SIZE,
            }),
            api,
            extraOptions,
          )
        }

        const normalizedPage = normalizePositiveInteger(page, 1)
        const normalizedPageSize = normalizePositiveInteger(pageSize, WORKFLOW_POLICY_PAGE_SIZE)
        const rows = getWorkflowPolicyRows({ q, status, frameworkKey, type })

        return {
          data: buildListResponse({
            rows,
            page: normalizedPage,
            pageSize: normalizedPageSize,
            filters: {
              q: String(q ?? '').trim(),
              status: String(status ?? '').trim(),
              frameworkKey: normalizeFrameworkKey(frameworkKey),
              type: String(type ?? '').trim().toUpperCase(),
            },
          }),
        }
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'RuntimeWorkflowPolicy', id })),
              WORKFLOW_POLICY_LIST_TAG,
            ]
          : [WORKFLOW_POLICY_LIST_TAG],
    }),

    createWorkflowPolicy: build.mutation({
      queryFn: async ({ body = {} } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'workflow-policies',
              method: 'POST',
              body,
            }),
            api,
            extraOptions,
          )
        }

        const runtimePayload = body
        const governedMetadataError = validateMockWorkflowPolicyGovernedMetadataFields(runtimePayload)
        if (governedMetadataError) {
          return governedMetadataError
        }
        const deprecatedFieldError = validateMockWorkflowPolicyDeprecatedFields(runtimePayload)
        if (deprecatedFieldError) {
          return deprecatedFieldError
        }

        const duplicatePolicy = runtimeControlState.workflowPolicies.find(
          (policy) => String(policy.key ?? '').trim() === String(runtimePayload.key ?? '').trim(),
        )

        if (duplicatePolicy) {
          return buildConflictError('Workflow policy key must be unique.', {
            field: 'key',
            reason: 'WORKFLOW_POLICY_KEY_CONFLICT',
          })
        }

        const writableRuntimePathRows = getRuntimePathRows({
          status: 'ACTIVE',
          scope: 'FRAMEWORK_STATE',
          operation: 'WRITE',
          isProtected: 'false',
          frameworkKeys: Array.isArray(runtimePayload.frameworkKeys) ? runtimePayload.frameworkKeys.join(',') : '',
        })
        const frameworkRegistryKeys = getFrameworkRegistryRows()
          .map((entry) => String(entry.frameworkKey ?? '').trim().toUpperCase())
          .filter(Boolean)
        const { errors: validationErrors, payload: normalizedPayload } = validateWorkflowPolicyForm(
          runtimePayload,
          runtimeControlState.workflowPolicies,
          '',
          frameworkRegistryKeys,
          runtimeControlState.agents,
          writableRuntimePathRows,
        )
        const normalizedPolicyPayload = cloneWorkflowPolicy(normalizedPayload)
        const dependencyValidationErrors = validateMockWorkflowPolicyRegistryDependencies(normalizedPolicyPayload)
        const mockValidationErrors = {
          ...validationErrors,
          ...dependencyValidationErrors,
        }

        if (Object.keys(mockValidationErrors).length > 0) {
          return buildValidationFailedError('Please check the form for errors.', mockValidationErrors)
        }

        const createdPolicy = {
          id: generateRuntimeId('policy', normalizedPayload.key),
          ...cloneWorkflowPolicy({
            ...normalizedPolicyPayload,
            version: 1,
            lastActivatedAt: String(normalizedPayload.status ?? '').trim().toUpperCase() === 'ACTIVE'
              ? new Date().toISOString()
              : '',
            ...buildAuditFields(),
          }),
        }

        runtimeControlState = {
          ...runtimeControlState,
          workflowPolicies: [createdPolicy, ...runtimeControlState.workflowPolicies],
        }

        return { data: buildEntityResponse(cloneWorkflowPolicy(createdPolicy)) }
      },
      invalidatesTags: [WORKFLOW_POLICY_LIST_TAG],
    }),

    cloneWorkflowPolicy: build.mutation({
      queryFn: async ({ policyId, body = {} } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            {
              url: `${RUNTIME_CONTROL_BASE_PATH}/workflow-policies/${policyId}/clone`,
              method: 'POST',
              body,
            },
            api,
            extraOptions,
          )
        }

        const runtimePayload = body
        const governedMetadataError = validateMockWorkflowPolicyGovernedMetadataFields(runtimePayload)
        if (governedMetadataError) {
          return governedMetadataError
        }
        const deprecatedFieldError = validateMockWorkflowPolicyDeprecatedFields(runtimePayload)
        if (deprecatedFieldError) {
          return deprecatedFieldError
        }

        const sourcePolicy = findWorkflowPolicyById(policyId)
        if (!sourcePolicy) {
          return buildNotFoundError('Workflow policy was not found.')
        }

        const key = String(runtimePayload.key ?? '').trim().toLowerCase()
        if (!key) {
          return buildValidationFailedError('Please check the form for errors.', {
            key: 'Workflow policy key is required.',
          })
        }

        const duplicatePolicy = runtimeControlState.workflowPolicies.find(
          (policy) => String(policy.key ?? '').trim().toLowerCase() === key,
        )

        if (duplicatePolicy) {
          return buildConflictError('Workflow policy key must be unique.', {
            field: 'key',
            reason: 'WORKFLOW_POLICY_KEY_CONFLICT',
          })
        }

        const now = new Date().toISOString()
        const nextId = generateRuntimeId('policy', key)
        const sourceStableId = sourcePolicy.stableId || sourcePolicy.id
        const clonedPolicy = cloneWorkflowPolicy({
          ...sourcePolicy,
          id: nextId,
          stableId: nextId,
          key,
          name: String(runtimePayload.name ?? '').trim() || `${sourcePolicy.name || sourcePolicy.key} Clone`,
          description: String(runtimePayload.description ?? sourcePolicy.description ?? '').trim(),
          status: 'DRAFT',
          componentVersion: Number(sourcePolicy.componentVersion ?? sourcePolicy.version ?? 1) + 1,
          version: Number(sourcePolicy.version ?? 1) + 1,
          versionStatus: 'DRAFT',
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          lockedReason: null,
          lockedByPackageKeys: [],
          lineageId: sourcePolicy.lineageId || sourceStableId,
          clonedFromStableId: sourceStableId,
          supersedesStableId: sourceStableId,
          supersededByStableId: null,
          lastActivatedAt: '',
          updatedAt: now,
          updatedBy: { ...RUNTIME_CONTROL_UPDATED_BY },
          createdAt: now,
          createdBy: { ...RUNTIME_CONTROL_UPDATED_BY },
        })

        const updatedSourcePolicy = cloneWorkflowPolicy({
          ...sourcePolicy,
          supersededByStableId: clonedPolicy.stableId,
          updatedAt: now,
          updatedBy: { ...RUNTIME_CONTROL_UPDATED_BY },
        })

        runtimeControlState = {
          ...runtimeControlState,
          workflowPolicies: [
            clonedPolicy,
            ...runtimeControlState.workflowPolicies.map((policy) =>
              policy.id === sourcePolicy.id ? updatedSourcePolicy : policy,
            ),
          ],
        }

        return { data: buildEntityResponse(cloneWorkflowPolicy(clonedPolicy)) }
      },
      invalidatesTags: (_result, _error, { policyId }) => [
        WORKFLOW_POLICY_LIST_TAG,
        { type: 'RuntimeWorkflowPolicy', id: policyId },
        { type: 'RuntimeWorkflowPolicyDependencies', id: policyId },
        WORKFLOW_POLICY_DEPENDENCIES_LIST_TAG,
      ],
    }),

    getWorkflowPolicy: build.query({
      queryFn: async (policyId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('workflow-policies', policyId),
            api,
            extraOptions,
          )
        }

        const policy = findWorkflowPolicyById(policyId)
        if (!policy) {
          return buildNotFoundError('Workflow policy was not found.')
        }

        return { data: buildEntityResponse(cloneWorkflowPolicy(policy)) }
      },
      providesTags: (_result, _error, policyId) => [
        { type: 'RuntimeWorkflowPolicy', id: policyId },
      ],
    }),

    getWorkflowPolicyDependencies: build.query({
      queryFn: async (policyId, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlDetailRequest('workflow-policies', `${policyId}/dependencies`),
            api,
            extraOptions,
          )
        }

        const policy = findWorkflowPolicyById(policyId)
        if (!policy) {
          return buildNotFoundError('Workflow policy was not found.')
        }

        return {
          data: buildEntityResponse(buildMockWorkflowPolicyDependencies(policy)),
        }
      },
      providesTags: (_result, _error, policyId) => [
        { type: 'RuntimeWorkflowPolicyDependencies', id: policyId },
        WORKFLOW_POLICY_DEPENDENCIES_LIST_TAG,
      ],
    }),

    testWorkflowPolicy: build.mutation({
      queryFn: async (payload = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            {
              url: `${RUNTIME_CONTROL_BASE_PATH}/workflow-policies/test-console`,
              method: 'POST',
              body: payload,
            },
            api,
            extraOptions,
          )
        }

        const runtimePayload = payload && typeof payload === 'object' ? payload : {}
        const draft = runtimePayload.draft && typeof runtimePayload.draft === 'object'
          ? runtimePayload.draft
          : null

        if (!draft) {
          return buildValidationFailedError('Workflow policy test failed.', {
            draft: 'Workflow policy draft payload is required for test console runs.',
          })
        }
        const deprecatedFieldError = validateMockWorkflowPolicyDeprecatedFields(draft)
        if (deprecatedFieldError) {
          return deprecatedFieldError
        }

        const writableRuntimePathRows = getRuntimePathRows({
          status: 'ACTIVE',
          scope: 'FRAMEWORK_STATE',
          operation: 'WRITE',
          isProtected: 'false',
          frameworkKeys: Array.isArray(draft.frameworkKeys) ? draft.frameworkKeys.join(',') : '',
        })
        const frameworkRegistryKeys = getFrameworkRegistryRows()
          .map((entry) => String(entry.frameworkKey ?? '').trim().toUpperCase())
          .filter(Boolean)
        const { errors: validationErrors, payload: normalizedPayload } = validateWorkflowPolicyForm(
          draft,
          [],
          '',
          frameworkRegistryKeys,
          runtimeControlState.agents,
          writableRuntimePathRows,
        )
        const normalizedPolicyPayload = cloneWorkflowPolicy(normalizedPayload)
        const dependencyValidationErrors = validateMockWorkflowPolicyRegistryDependencies(normalizedPolicyPayload)
        const mockValidationErrors = {
          ...validationErrors,
          ...dependencyValidationErrors,
        }

        if (Object.keys(mockValidationErrors).length > 0) {
          return buildValidationFailedError('Workflow policy test failed.', mockValidationErrors)
        }

        return {
          data: buildEntityResponse(buildMockWorkflowPolicyTestResult({
            draft,
            frameworkState:
              runtimePayload.frameworkState
              && typeof runtimePayload.frameworkState === 'object'
              && !Array.isArray(runtimePayload.frameworkState)
                ? runtimePayload.frameworkState
                : {},
            triggerEvent: runtimePayload.triggerEvent,
            actorScope: runtimePayload.actorScope,
          })),
        }
      },
    }),

    updateWorkflowPolicy: build.mutation({
      queryFn: async ({ policyId, ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'workflow-policies',
              entityId: policyId,
              method: 'PATCH',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const runtimePayload = payload

        const existingPolicy = findWorkflowPolicyById(policyId)
        if (!existingPolicy) {
          return buildNotFoundError('Workflow policy was not found.')
        }

        const governedMetadataError = validateMockWorkflowPolicyGovernedMetadataFields(runtimePayload)
        if (governedMetadataError) {
          return governedMetadataError
        }
        const deprecatedFieldError = validateMockWorkflowPolicyDeprecatedFields(runtimePayload)
        if (deprecatedFieldError) {
          return deprecatedFieldError
        }

        if (existingPolicy.isLocked === true) {
          return buildConflictError(LOCKED_RUNTIME_CONTROL_EDIT_MESSAGE, {
            field: 'isLocked',
            reason: 'WORKFLOW_POLICY_LOCKED',
            lockedByPackageKeys: Array.isArray(existingPolicy.lockedByPackageKeys)
              ? existingPolicy.lockedByPackageKeys
              : [],
          })
        }

        if (
          payload.key !== undefined
          && String(payload.key ?? '').trim() !== String(existingPolicy.key ?? '').trim()
        ) {
          return buildValidationFailedError('Please check the form for errors.', {
            key: 'Workflow policy key is immutable after creation.',
          })
        }

        const duplicatePolicy = runtimeControlState.workflowPolicies.find(
          (policy) =>
            policy.id !== policyId
            && String(policy.key ?? '').trim() === String(runtimePayload.key ?? existingPolicy.key).trim(),
        )

        if (duplicatePolicy) {
          return buildConflictError('Workflow policy key must be unique.', {
            field: 'key',
            reason: 'WORKFLOW_POLICY_KEY_CONFLICT',
          })
        }

        const nextDraft = {
          ...existingPolicy,
          ...runtimePayload,
        }
        const writableRuntimePathRows = getRuntimePathRows({
          status: 'ACTIVE',
          scope: 'FRAMEWORK_STATE',
          operation: 'WRITE',
          isProtected: 'false',
          frameworkKeys: Array.isArray(nextDraft.frameworkKeys) ? nextDraft.frameworkKeys.join(',') : '',
        })
        const frameworkRegistryKeys = getFrameworkRegistryRows()
          .map((entry) => String(entry.frameworkKey ?? '').trim().toUpperCase())
          .filter(Boolean)
        const { errors: validationErrors, payload: normalizedPayload } = validateWorkflowPolicyForm(
          nextDraft,
          runtimeControlState.workflowPolicies,
          policyId,
          frameworkRegistryKeys,
          runtimeControlState.agents,
          writableRuntimePathRows,
        )
        const normalizedPolicyPayload = cloneWorkflowPolicy({
          ...existingPolicy,
          ...normalizedPayload,
        })
        const dependencyValidationErrors = validateMockWorkflowPolicyRegistryDependencies(normalizedPolicyPayload)
        const mockValidationErrors = {
          ...validationErrors,
          ...dependencyValidationErrors,
        }

        if (Object.keys(mockValidationErrors).length > 0) {
          return buildValidationFailedError('Please check the form for errors.', mockValidationErrors)
        }

        const nextPolicy = cloneWorkflowPolicy({
          ...normalizedPolicyPayload,
          version: Number(existingPolicy.version ?? 1) + 1,
          lastActivatedAt:
            String(normalizedPayload.status ?? existingPolicy.status ?? '').trim().toUpperCase() === 'ACTIVE'
            && String(existingPolicy.status ?? '').trim().toUpperCase() !== 'ACTIVE'
              ? new Date().toISOString()
              : (existingPolicy.lastActivatedAt ?? ''),
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          workflowPolicies: runtimeControlState.workflowPolicies.map((policy) =>
            policy.id === policyId ? nextPolicy : policy,
          ),
        }

        return { data: buildEntityResponse(cloneWorkflowPolicy(nextPolicy)) }
      },
      invalidatesTags: (_result, _error, { policyId }) => [
        WORKFLOW_POLICY_LIST_TAG,
        { type: 'RuntimeWorkflowPolicy', id: policyId },
        { type: 'RuntimeWorkflowPolicyDependencies', id: policyId },
        WORKFLOW_POLICY_DEPENDENCIES_LIST_TAG,
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useListFrameworkRegistriesQuery,
  useCreateFrameworkRegistryMutation,
  useGetFrameworkRegistryQuery,
  useUpdateFrameworkRegistryMutation,
  useListFrameworkPackagesQuery,
  useCreateFrameworkPackageMutation,
  useCloneFrameworkPackageMutation,
  useGetFrameworkPackageQuery,
  useGetFrameworkPackageAuditQuery,
  useGetFrameworkPackageDependenciesQuery,
  useGetFrameworkPackageDependencyGraphQuery,
  useGetFrameworkPackageDependencyLockQuery,
  useGetFrameworkPackageDiffQuery,
  useGetFrameworkPackageIntegrityQuery,
  useGetFrameworkPackageLatestCheckpointQuery,
  useUpdateFrameworkPackageMutation,
  useRunFrameworkPackageCheckpointMutation,
  useValidateFrameworkPackageMutation,
  useActivateFrameworkPackageMutation,
  useGetRuntimeActivationReadinessQuery,
  useGetRuntimeActivationHistoryQuery,
  useListRuntimeDeploymentsQuery,
  useValidateRuntimeOperationMutation,
  useGetRuntimeValidationHistoryQuery,
  useListUiContractsQuery,
  useCreateUiContractMutation,
  useCloneUiContractMutation,
  useGetUiContractQuery,
  useUpdateUiContractMutation,
  useListRuntimeAgentsQuery,
  useCreateRuntimeAgentMutation,
  useCloneRuntimeAgentMutation,
  useGetRuntimeAgentQuery,
  useGetRuntimeAgentDependenciesQuery,
  useUpdateRuntimeAgentMutation,
  useValidateRuntimeAgentMutation,
  useTestRuntimeAgentMutation,
  useActivateRuntimeAgentMutation,
  useDisableRuntimeAgentMutation,
  useDeprecateRuntimeAgentMutation,
  useListSkillRolesQuery,
  useCreateSkillRoleMutation,
  useCloneSkillRoleMutation,
  useGetSkillRoleQuery,
  useLazyGetSkillRoleDependenciesQuery,
  useUpdateSkillRoleMutation,
  useListRuntimePathsQuery,
  useLazyListRuntimePathsQuery,
  useCreateRuntimePathMutation,
  useGetRuntimePathQuery,
  useUpdateRuntimePathMutation,
  useCloneRuntimePathMutation,
  useDuplicateRuntimePathMutation,
  useGetRuntimePathDependenciesQuery,
  useActivateRuntimePathMutation,
  useDisableRuntimePathMutation,
  useDeprecateRuntimePathMutation,
  useListRuntimeSkillsQuery,
  useCreateRuntimeSkillMutation,
  useCloneRuntimeSkillMutation,
  useGetRuntimeSkillQuery,
  useUpdateRuntimeSkillMutation,
  useListValidationRegistryQuery,
  useLazyListValidationRegistryQuery,
  useCreateValidationRegistryMutation,
  useCloneValidationRegistryMutation,
  useGetValidationRegistryQuery,
  useUpdateValidationRegistryMutation,
  useGetValidationRegistryDependenciesQuery,
  useLazyGetValidationRegistryDependenciesQuery,
  useListWorkflowPoliciesQuery,
  useCreateWorkflowPolicyMutation,
  useCloneWorkflowPolicyMutation,
  useGetWorkflowPolicyQuery,
  useGetWorkflowPolicyDependenciesQuery,
  useTestWorkflowPolicyMutation,
  useUpdateWorkflowPolicyMutation,
} = runtimeControlApi
