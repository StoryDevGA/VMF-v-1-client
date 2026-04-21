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
  WORKFLOW_POLICY_PAGE_SIZE,
} from '../../pages/SuperAdminWorkflowPolicies/superAdminWorkflowPolicies.constants.js'
import {
  cloneRuntimePathRegistryEntry,
  INITIAL_RUNTIME_PATH_REGISTRY,
  RUNTIME_PATH_REGISTRY_PAGE_SIZE,
} from '../../pages/SuperAdminRuntimePathRegistry/superAdminRuntimePathRegistry.constants.js'
import {
  buildSkillRoleRegistryStableId,
  cloneSkillRoleRegistryEntry,
  INITIAL_SKILL_ROLE_REGISTRY,
  SKILL_ROLE_REGISTRY_PAGE_SIZE,
  SKILL_ROLE_REGISTRY_STATUSES,
} from '../../pages/SuperAdminSkillRoleRegistry/superAdminSkillRoleRegistry.constants.js'

const FRAMEWORK_PACKAGE_LIST_TAG = { type: 'RuntimeFrameworkPackage', id: 'LIST' }
const FRAMEWORK_REGISTRY_LIST_TAG = { type: 'RuntimeFrameworkRegistry', id: 'LIST' }
const AGENT_LIST_TAG = { type: 'RuntimeAgent', id: 'LIST' }
const SKILL_LIST_TAG = { type: 'RuntimeSkill', id: 'LIST' }
const WORKFLOW_POLICY_LIST_TAG = { type: 'RuntimeWorkflowPolicy', id: 'LIST' }
const RUNTIME_PATH_LIST_TAG = { type: 'RuntimePath', id: 'LIST' }
const SKILL_ROLE_LIST_TAG = { type: 'SkillRole', id: 'LIST' }
const RUNTIME_CONTROL_BASE_PATH = '/super-admin/runtime-control'

const RUNTIME_CONTROL_UPDATED_BY = Object.freeze({
  id: 'sa-local',
  name: 'Super Admin',
})

const isRuntimeControlMockMode = () => globalThis.__RUNTIME_CONTROL_API_MOCK__ === true

const buildListParams = ({
  page,
  pageSize,
  q,
  status,
  sortBy,
  sortOrder,
  frameworkKey,
  frameworkKeys,
  scope,
  operation,
  category,
  isProtected,
  type,
  structureType,
  defaultPageSize,
}) => ({
  page: normalizePositiveInteger(page, 1),
  pageSize: normalizePositiveInteger(pageSize, defaultPageSize),
  q: String(q ?? '').trim(),
  status: String(status ?? '').trim(),
  sortBy: String(sortBy ?? '').trim(),
  sortOrder: String(sortOrder ?? '').trim().toLowerCase(),
  frameworkKey: normalizeFrameworkKey(frameworkKey),
  frameworkKeys: String(frameworkKeys ?? '').trim(),
  scope: String(scope ?? '').trim(),
  operation: String(operation ?? '').trim(),
  category: String(category ?? '').trim(),
  isProtected: String(isProtected ?? '').trim().toLowerCase(),
  type: String(type ?? '').trim().toLowerCase(),
  structureType: String(structureType ?? '').trim().toLowerCase(),
})

export const buildRuntimeControlListRequest = ({
  resourcePath,
  page,
  pageSize,
  q,
  status,
  sortBy,
  sortOrder,
  frameworkKey,
  frameworkKeys,
  scope,
  operation,
  category,
  isProtected,
  type,
  structureType,
  defaultPageSize,
}) => {
  const params = buildListParams({
    page,
    pageSize,
    q,
    status,
    sortBy,
    sortOrder,
    frameworkKey,
    frameworkKeys,
    scope,
    operation,
    category,
    isProtected,
    type,
    structureType,
    defaultPageSize,
  })

  return {
    url: `${RUNTIME_CONTROL_BASE_PATH}/${resourcePath}`,
    params: {
      page: params.page,
      pageSize: params.pageSize,
      ...(params.q ? { q: params.q } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params.sortOrder ? { sortOrder: params.sortOrder } : {}),
      ...(params.frameworkKey ? { frameworkKey: params.frameworkKey } : {}),
      ...(params.frameworkKeys ? { frameworkKeys: params.frameworkKeys } : {}),
      ...(params.scope ? { scope: params.scope } : {}),
      ...(params.operation ? { operation: params.operation } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.isProtected ? { isProtected: params.isProtected } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.structureType ? { structureType: params.structureType } : {}),
    },
  }
}

export const buildRuntimeControlDetailRequest = (resourcePath, entityId) => ({
  url: `${RUNTIME_CONTROL_BASE_PATH}/${resourcePath}/${entityId}`,
})

export const buildRuntimeControlMutationRequest = ({ resourcePath, entityId, method, body }) => ({
  url: entityId
    ? `${RUNTIME_CONTROL_BASE_PATH}/${resourcePath}/${entityId}`
    : `${RUNTIME_CONTROL_BASE_PATH}/${resourcePath}`,
  method,
  body,
})

const normalizePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const normalizeSearch = (value) => String(value ?? '').trim().toLowerCase()
const normalizeFrameworkKey = (value) => String(value ?? '').trim().toUpperCase()
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
  runtimePaths: INITIAL_RUNTIME_PATH_REGISTRY.map((entry) => cloneRuntimePathRegistryEntry(entry)),
  skillRoles: INITIAL_SKILL_ROLE_REGISTRY.map((entry) => cloneSkillRoleRegistryEntry(entry)),
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
}) => {
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
      ])

      return matchesStatus && matchesFramework && matchesScope && matchesOperation && matchesCategory && matchesProtected && queryMatches
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

const getWorkflowPolicyRows = ({
  q = '',
  status = '',
  frameworkKey = '',
}) => {
  const normalizedSearch = normalizeSearch(q)
  const normalizedStatus = String(status ?? '').trim().toUpperCase()
  const normalizedFrameworkKey = normalizeFrameworkKey(frameworkKey)

  return runtimeControlState.workflowPolicies
    .filter((policy) => {
      const matchesStatus = normalizedStatus ? policy.status === normalizedStatus : true
      const matchesFramework = normalizedFrameworkKey
        ? policy.frameworkKeys.includes(normalizedFrameworkKey)
        : true
      const queryMatches = matchesSearch(normalizedSearch, [
        policy.key,
        policy.name,
        policy.description,
        policy.status,
        policy.frameworkKeys,
        policy.orderedSteps,
        policy.requiredAgentIds,
        policy.requiredSkillIds,
        policy.gatingRules,
      ])

      return matchesStatus && matchesFramework && queryMatches
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

const getActiveFrameworkRegistryKeys = () =>
  new Set(
    runtimeControlState.frameworkRegistries
      .filter((entry) => String(entry.status ?? '').trim().toUpperCase() === 'ACTIVE')
      .map((entry) => normalizeFrameworkKey(entry.frameworkKey))
      .filter(Boolean),
  )

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
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'framework-packages',
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const runtimePayload = payload

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
              isProtected,
              defaultPageSize: RUNTIME_PATH_REGISTRY_PAGE_SIZE,
            }),
            api,
            extraOptions,
          )
        }

        const normalizedPage = normalizePositiveInteger(page, 1)
        const normalizedPageSize = normalizePositiveInteger(pageSize, RUNTIME_PATH_REGISTRY_PAGE_SIZE)
        const rows = getRuntimePathRows({ q, status, frameworkKey, frameworkKeys, scope, operation, category, isProtected })

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

    listWorkflowPolicies: build.query({
      queryFn: async (
        { page = 1, pageSize = WORKFLOW_POLICY_PAGE_SIZE, q = '', status = '', frameworkKey = '' } = {},
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
              defaultPageSize: WORKFLOW_POLICY_PAGE_SIZE,
            }),
            api,
            extraOptions,
          )
        }

        const normalizedPage = normalizePositiveInteger(page, 1)
        const normalizedPageSize = normalizePositiveInteger(pageSize, WORKFLOW_POLICY_PAGE_SIZE)
        const rows = getWorkflowPolicyRows({ q, status, frameworkKey })

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
              ...result.data.map(({ id }) => ({ type: 'RuntimeWorkflowPolicy', id })),
              WORKFLOW_POLICY_LIST_TAG,
            ]
          : [WORKFLOW_POLICY_LIST_TAG],
    }),

    createWorkflowPolicy: build.mutation({
      queryFn: async (payload = {}, api, extraOptions, baseQuery) => {
        if (!isRuntimeControlMockMode()) {
          return baseQuery(
            buildRuntimeControlMutationRequest({
              resourcePath: 'workflow-policies',
              method: 'POST',
              body: payload,
            }),
            api,
            extraOptions,
          )
        }

        const runtimePayload = payload

        const duplicatePolicy = runtimeControlState.workflowPolicies.find(
          (policy) => String(policy.key ?? '').trim() === String(runtimePayload.key ?? '').trim(),
        )

        if (duplicatePolicy) {
          return buildConflictError('Workflow policy key must be unique.', {
            field: 'key',
            reason: 'WORKFLOW_POLICY_KEY_CONFLICT',
          })
        }

        const createdPolicy = {
          id: generateRuntimeId('policy', runtimePayload.key),
          ...cloneWorkflowPolicy({
            ...runtimePayload,
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

        const nextPolicy = cloneWorkflowPolicy({
          ...existingPolicy,
          ...runtimePayload,
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
  useUpdateSkillRoleMutation,
  useListRuntimePathsQuery,
  useLazyListRuntimePathsQuery,
  useListRuntimeSkillsQuery,
  useCreateRuntimeSkillMutation,
  useGetRuntimeSkillQuery,
  useUpdateRuntimeSkillMutation,
  useListWorkflowPoliciesQuery,
  useCreateWorkflowPolicyMutation,
  useGetWorkflowPolicyQuery,
  useUpdateWorkflowPolicyMutation,
} = runtimeControlApi
