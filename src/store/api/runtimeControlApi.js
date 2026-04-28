import { baseApi } from './baseApi.js'
import {
  cloneFrameworkPackage,
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

const FRAMEWORK_PACKAGE_LIST_TAG = { type: 'RuntimeFrameworkPackage', id: 'LIST' }
const FRAMEWORK_REGISTRY_LIST_TAG = { type: 'RuntimeFrameworkRegistry', id: 'LIST' }
const AGENT_LIST_TAG = { type: 'RuntimeAgent', id: 'LIST' }
const SKILL_LIST_TAG = { type: 'RuntimeSkill', id: 'LIST' }
const WORKFLOW_POLICY_LIST_TAG = { type: 'RuntimeWorkflowPolicy', id: 'LIST' }
const WORKFLOW_POLICY_DEPENDENCIES_LIST_TAG = { type: 'RuntimeWorkflowPolicyDependencies', id: 'LIST' }
const RUNTIME_PATH_LIST_TAG = { type: 'RuntimePath', id: 'LIST' }
const SKILL_ROLE_LIST_TAG = { type: 'SkillRole', id: 'LIST' }
const VALIDATION_REGISTRY_LIST_TAG = { type: 'ValidationRegistry', id: 'LIST' }
const RUNTIME_CONTROL_BASE_PATH = '/super-admin/runtime-control'

const RUNTIME_CONTROL_UPDATED_BY = Object.freeze({
  id: 'sa-local',
  name: 'Super Admin',
})

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

const buildAuditFields = (timestamp = new Date().toISOString()) => ({
  updatedAt: timestamp,
  updatedBy: { ...RUNTIME_CONTROL_UPDATED_BY },
})

const buildInitialRuntimeControlState = () => ({
  frameworkRegistries: INITIAL_FRAMEWORK_REGISTRIES.map((entry) => cloneFrameworkRegistryEntry(entry)),
  frameworkPackages: INITIAL_FRAMEWORK_PACKAGES.map((pkg) => cloneFrameworkPackage(pkg)),
  runtimePaths: [...INITIAL_RUNTIME_PATH_REGISTRY, ...INITIAL_RUNTIME_PATH_REGISTRY_STAGED]
    .map((entry) => cloneRuntimePathRegistryEntry(entry)),
  skillRoles: INITIAL_SKILL_ROLE_REGISTRY.map((entry) => cloneSkillRoleRegistryEntry(entry)),
  validationRegistry: INITIAL_VALIDATION_REGISTRY.map((entry) => cloneValidationRegistryEntry(entry)),
  agents: INITIAL_RUNTIME_AGENTS.map((agent) => cloneRuntimeAgent(agent)),
  skills: INITIAL_RUNTIME_SKILLS.map((skill) => cloneRuntimeSkill(skill)),
  workflowPolicies: INITIAL_WORKFLOW_POLICIES.map((policy) => cloneWorkflowPolicy(policy)),
})

let runtimeControlState = buildInitialRuntimeControlState()

export const __resetRuntimeControlApiStateForTests = () => {
  runtimeControlState = buildInitialRuntimeControlState()
}

const buildMockRuntimeAgentDependencies = (agentId) => {
  const workflowPolicies = (runtimeControlState.workflowPolicies || []).filter((policy) =>
    Array.isArray(policy.requiredAgentIds) && policy.requiredAgentIds.includes(agentId),
  )
  const frameworkPackages = (runtimeControlState.frameworkPackages || []).filter((pkg) =>
    Array.isArray(pkg.defaultAgentIds) && pkg.defaultAgentIds.includes(agentId),
  )

  const activeWorkflowPolicies = workflowPolicies.filter((policy) => policy.status === 'ACTIVE')
  const activeFrameworkPackages = frameworkPackages.filter((pkg) => pkg.status === 'ACTIVE')

  const warnings = []
  const blocks = []

  if (activeWorkflowPolicies.length > 0) {
    warnings.push(`This Agent is used by ${activeWorkflowPolicies.length} ACTIVE workflow policies.`)
  }

  if (activeFrameworkPackages.length > 0) {
    warnings.push(`This Agent is used by ${activeFrameworkPackages.length} ACTIVE framework packages.`)
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

const validateMockValidationRuntimePaths = ({ outputPath, passFieldPath, detailsFieldPath } = {}) => {
  const errors = {}
  const paths = [outputPath, passFieldPath, detailsFieldPath].filter(Boolean)
  const summaries = buildMockValidationRuntimePathSummaries(paths)
  const allowedValidationPathScopes = new Set(['VALIDATION_RESULT', 'FRAMEWORK_STATE'])

  for (const summary of summaries) {
    if (summary.status === 'MISSING') {
      if (summary.pathKey === outputPath) errors.outputPath = `Unknown runtime path "${summary.pathKey}".`
      else if (summary.pathKey === passFieldPath) errors.passFieldPath = `Unknown runtime path "${summary.pathKey}".`
      else if (summary.pathKey === detailsFieldPath) errors.detailsFieldPath = `Unknown runtime path "${summary.pathKey}".`
      continue
    }

    if (!allowedValidationPathScopes.has(String(summary.scope || '').toUpperCase())) {
      if (summary.pathKey === outputPath) errors.outputPath = `Runtime path "${summary.pathKey}" must be a validation-compatible path.`
      else if (summary.pathKey === passFieldPath) errors.passFieldPath = `Runtime path "${summary.pathKey}" must be a validation-compatible path.`
      else if (summary.pathKey === detailsFieldPath) errors.detailsFieldPath = `Runtime path "${summary.pathKey}" must be a validation-compatible path.`
    }
  }

  const passErr = validateMockPathDescendant(outputPath, passFieldPath, 'Pass Field Path')
  if (passErr) errors.passFieldPath = passErr

  const detailsErr = validateMockPathDescendant(outputPath, detailsFieldPath, 'Details Field Path')
  if (detailsErr) errors.detailsFieldPath = detailsErr

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
      const requiredSections = pkg?.validationRules?.requiredSections
      const publishChecks = pkg?.validationRules?.publishChecks
      return (Array.isArray(requiredSections) && requiredSections.includes(normalizedKey))
        || (Array.isArray(publishChecks) && publishChecks.includes(normalizedKey))
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
    Array.isArray(pkg.compatibleWorkflowKeys)
    && pkg.compatibleWorkflowKeys.map((value) => String(value ?? '').trim().toLowerCase()).includes(normalizedPolicyKey),
  )
  const agentIds = [
    ...new Set([
      String(policy?.primaryAgentId ?? '').trim(),
      String(policy?.fallbackAgentId ?? '').trim(),
      ...(Array.isArray(policy?.requiredAgentIds) ? policy.requiredAgentIds : []),
    ].filter(Boolean)),
  ]
  const agents = (runtimeControlState.agents || []).filter((agent) => agentIds.includes(agent.id))
  const runtimePathKeys = [
    ...new Set([
      ...(Array.isArray(policy?.conditions) ? policy.conditions.map((condition) => condition?.path) : []),
      ...(Array.isArray(policy?.onPassEffects) ? policy.onPassEffects.map((effect) => effect?.targetPath) : []),
      ...(Array.isArray(policy?.onFailEffects) ? policy.onFailEffects.map((effect) => effect?.targetPath) : []),
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
        pkg.compatibleWorkflowKeys,
        pkg.defaultAgentIds,
        pkg.requiredSkillIds,
      ])

      return matchesStatus && matchesFramework && queryMatches
    })
    .map((pkg) => cloneFrameworkPackage(pkg))
}

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

const findFrameworkPackageById = (packageId) =>
  runtimeControlState.frameworkPackages.find((pkg) => pkg.id === packageId)

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
  ...(payload.deprecatedInVersion !== undefined ? { deprecatedInVersion: String(payload.deprecatedInVersion ?? '').trim() } : {}),
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

const findRuntimeSkillById = (skillId) =>
  runtimeControlState.skills.find((skill) => skill.id === skillId)

const findValidationRegistryById = (validationId) =>
  runtimeControlState.validationRegistry.find((row) => row.id === validationId)

const findSkillRoleById = (roleId) =>
  runtimeControlState.skillRoles.find((role) => role.id === roleId)

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

const findWorkflowPolicyById = (policyId) =>
  runtimeControlState.workflowPolicies.find((policy) => policy.id === policyId)

export const runtimeControlApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
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
        const { stepUpToken = '', ...runtimePayload } = payload ?? {}

        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'framework-packages',
              method: 'POST',
              body: runtimePayload,
              headers: stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : undefined,
            }),
            api,
            extraOptions,
          )
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

    updateFrameworkPackage: build.mutation({
      queryFn: async ({ packageId, stepUpToken = '', ...payload }, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'framework-packages',
              entityId: packageId,
              method: 'PATCH',
              body: payload,
              headers: stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : undefined,
            }),
            api,
            extraOptions,
          )
        }

        const runtimePayload = payload

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

        const activationTime = new Date().toISOString()
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
                status: FRAMEWORK_PACKAGE_STATUSES.VALIDATED,
                isDefault: false,
                ...buildAuditFields(activationTime),
              })
            }

            return pkg
          }),
        }

        return {
          data: buildEntityResponse(
            activatedPackage ? cloneFrameworkPackage(activatedPackage) : cloneFrameworkPackage(existingPackage),
          ),
        }
      },
      invalidatesTags: (_result, _error, { packageId }) => [
        FRAMEWORK_PACKAGE_LIST_TAG,
        { type: 'RuntimeFrameworkPackage', id: packageId },
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

        const createdAgent = {
          id: generateRuntimeId('agent', payload.key),
          ...cloneRuntimeAgent({
            ...payload,
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
          status: String(runtimePayload.status ?? SKILL_ROLE_REGISTRY_STATUSES.ACTIVE).trim().toUpperCase(),
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
        const existingRole = findSkillRoleById(roleId)
        if (!existingRole) {
          return buildNotFoundError('Skill role was not found.')
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
          ...buildAuditFields(),
        })

        runtimeControlState = {
          ...runtimeControlState,
          skillRoles: runtimeControlState.skillRoles.map((role) =>
            role.id === roleId ? nextRole : role,
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

        const nextPayload = buildRuntimePathMockPayload({
          ...source,
          pathKey,
          label: payload.label ?? source.label,
          description: payload.description ?? source.description,
          status: payload.status ?? RUNTIME_PATH_REGISTRY_STATUSES.DRAFT,
          isSystem: false,
        })
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
      queryFn: async ({ pathId, deprecatedInVersion = '' } = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'runtime-paths',
              entityId: `${pathId}/deprecate`,
              method: 'POST',
              body: { deprecatedInVersion },
            }),
            api,
            extraOptions,
          )
        }

        const runtimePath = findRuntimePathById(pathId)
        if (!runtimePath) {
          return buildNotFoundError('Runtime path was not found.')
        }

        const next = cloneRuntimePathRegistryEntry({
          ...runtimePath,
          status: RUNTIME_PATH_REGISTRY_STATUSES.DEPRECATED,
          deprecatedInVersion: String(deprecatedInVersion ?? '').trim() || runtimePath.deprecatedInVersion,
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

        const createdSkill = {
          id: generateRuntimeId('skill', runtimePayload.key),
          ...cloneRuntimeSkill({
            ...runtimePayload,
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

        if (payload.outputPath !== undefined || payload.passFieldPath !== undefined || payload.detailsFieldPath !== undefined) {
          const pathErrors = validateMockValidationRuntimePaths({
            outputPath: nextOutputPath,
            passFieldPath: nextPassFieldPath,
            detailsFieldPath: nextDetailsFieldPath,
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
            row.id === validationId ? next : row,
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
        const dependencyValidationErrors = validateMockWorkflowPolicyRegistryDependencies(runtimePayload)
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
            ...normalizedPayload,
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
        const { errors: validationErrors } = validateWorkflowPolicyForm(
          draft,
          [],
          '',
          frameworkRegistryKeys,
          runtimeControlState.agents,
          writableRuntimePathRows,
        )
        const dependencyValidationErrors = validateMockWorkflowPolicyRegistryDependencies(draft)
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
        const dependencyValidationErrors = validateMockWorkflowPolicyRegistryDependencies(nextDraft)
        const mockValidationErrors = {
          ...validationErrors,
          ...dependencyValidationErrors,
        }

        if (Object.keys(mockValidationErrors).length > 0) {
          return buildValidationFailedError('Please check the form for errors.', mockValidationErrors)
        }

        const nextPolicy = cloneWorkflowPolicy({
          ...existingPolicy,
          ...normalizedPayload,
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
  useGetFrameworkPackageQuery,
  useUpdateFrameworkPackageMutation,
  useActivateFrameworkPackageMutation,
  useListRuntimeAgentsQuery,
  useCreateRuntimeAgentMutation,
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
  useGetSkillRoleQuery,
  useLazyGetSkillRoleDependenciesQuery,
  useUpdateSkillRoleMutation,
  useListRuntimePathsQuery,
  useLazyListRuntimePathsQuery,
  useCreateRuntimePathMutation,
  useGetRuntimePathQuery,
  useUpdateRuntimePathMutation,
  useDuplicateRuntimePathMutation,
  useGetRuntimePathDependenciesQuery,
  useActivateRuntimePathMutation,
  useDisableRuntimePathMutation,
  useDeprecateRuntimePathMutation,
  useListRuntimeSkillsQuery,
  useCreateRuntimeSkillMutation,
  useGetRuntimeSkillQuery,
  useUpdateRuntimeSkillMutation,
  useListValidationRegistryQuery,
  useLazyListValidationRegistryQuery,
  useCreateValidationRegistryMutation,
  useGetValidationRegistryQuery,
  useUpdateValidationRegistryMutation,
  useGetValidationRegistryDependenciesQuery,
  useLazyGetValidationRegistryDependenciesQuery,
  useListWorkflowPoliciesQuery,
  useCreateWorkflowPolicyMutation,
  useGetWorkflowPolicyQuery,
  useGetWorkflowPolicyDependenciesQuery,
  useTestWorkflowPolicyMutation,
  useUpdateWorkflowPolicyMutation,
} = runtimeControlApi
