import { baseApi } from './baseApi.js'
import {
  cloneFrameworkPackage,
  FRAMEWORK_PACKAGE_PAGE_SIZE,
  FRAMEWORK_PACKAGE_STATUSES,
  INITIAL_FRAMEWORK_PACKAGES,
} from '../../pages/SuperAdminFrameworkPackages/superAdminFrameworkPackages.constants.js'
import {
  cloneRuntimeAgent,
  INITIAL_RUNTIME_AGENTS,
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

const FRAMEWORK_PACKAGE_LIST_TAG = { type: 'RuntimeFrameworkPackage', id: 'LIST' }
const AGENT_LIST_TAG = { type: 'RuntimeAgent', id: 'LIST' }
const SKILL_LIST_TAG = { type: 'RuntimeSkill', id: 'LIST' }
const WORKFLOW_POLICY_LIST_TAG = { type: 'RuntimeWorkflowPolicy', id: 'LIST' }

const RUNTIME_CONTROL_UPDATED_BY = Object.freeze({
  id: 'sa-local',
  name: 'Super Admin',
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
  frameworkPackages: INITIAL_FRAMEWORK_PACKAGES.map((pkg) => cloneFrameworkPackage(pkg)),
  agents: INITIAL_RUNTIME_AGENTS.map((agent) => cloneRuntimeAgent(agent)),
  skills: INITIAL_RUNTIME_SKILLS.map((skill) => cloneRuntimeSkill(skill)),
  workflowPolicies: INITIAL_WORKFLOW_POLICIES.map((policy) => cloneWorkflowPolicy(policy)),
})

let runtimeControlState = buildInitialRuntimeControlState()

export const __resetRuntimeControlApiStateForTests = () => {
  runtimeControlState = buildInitialRuntimeControlState()
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

const findRuntimeAgentById = (agentId) =>
  runtimeControlState.agents.find((agent) => agent.id === agentId)

const findRuntimeSkillById = (skillId) =>
  runtimeControlState.skills.find((skill) => skill.id === skillId)

const findWorkflowPolicyById = (policyId) =>
  runtimeControlState.workflowPolicies.find((policy) => policy.id === policyId)

export const runtimeControlApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listFrameworkPackages: build.query({
      queryFn: ({ page = 1, pageSize = FRAMEWORK_PACKAGE_PAGE_SIZE, q = '', status = '', frameworkKey = '' } = {}) => {
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
      queryFn: (payload = {}) => {
        const duplicatePackage = runtimeControlState.frameworkPackages.find(
          (pkg) =>
            normalizeFrameworkKey(pkg.frameworkKey) === normalizeFrameworkKey(payload.frameworkKey)
            && String(pkg.version ?? '').trim() === String(payload.version ?? '').trim(),
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
            `${normalizeFrameworkKey(payload.frameworkKey)}-${payload.version}`,
          ),
          ...cloneFrameworkPackage({
            ...payload,
            isDefault: payload.status === FRAMEWORK_PACKAGE_STATUSES.ACTIVE,
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
      queryFn: (packageId) => {
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
      queryFn: ({ packageId, ...payload }) => {
        const existingPackage = findFrameworkPackageById(packageId)
        if (!existingPackage) {
          return buildNotFoundError('Framework package was not found.')
        }

        const duplicatePackage = runtimeControlState.frameworkPackages.find(
          (pkg) =>
            pkg.id !== packageId
            && normalizeFrameworkKey(pkg.frameworkKey) === normalizeFrameworkKey(payload.frameworkKey ?? existingPackage.frameworkKey)
            && String(pkg.version ?? '').trim() === String(payload.version ?? existingPackage.version).trim(),
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
          ...payload,
          isDefault: payload.status
            ? nextStatus === FRAMEWORK_PACKAGE_STATUSES.ACTIVE
            : Boolean(payload.isDefault ?? existingPackage.isDefault),
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
      queryFn: ({ packageId }) => {
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

    listRuntimeAgents: build.query({
      queryFn: ({ page = 1, pageSize = RUNTIME_AGENT_PAGE_SIZE, q = '', status = '', frameworkKey = '' } = {}) => {
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
      queryFn: (payload = {}) => {
        const duplicateAgent = runtimeControlState.agents.find(
          (agent) => String(agent.key ?? '').trim() === String(payload.key ?? '').trim(),
        )

        if (duplicateAgent) {
          return buildConflictError('Agent key must be unique.', {
            field: 'key',
            reason: 'RUNTIME_AGENT_KEY_CONFLICT',
          })
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
      queryFn: (agentId) => {
        const agent = findRuntimeAgentById(agentId)
        if (!agent) {
          return buildNotFoundError('Agent was not found.')
        }

        return { data: buildEntityResponse(cloneRuntimeAgent(agent)) }
      },
      providesTags: (_result, _error, agentId) => [{ type: 'RuntimeAgent', id: agentId }],
    }),

    updateRuntimeAgent: build.mutation({
      queryFn: ({ agentId, ...payload }) => {
        const existingAgent = findRuntimeAgentById(agentId)
        if (!existingAgent) {
          return buildNotFoundError('Agent was not found.')
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

    listRuntimeSkills: build.query({
      queryFn: ({ page = 1, pageSize = RUNTIME_SKILL_PAGE_SIZE, q = '', status = '', frameworkKey = '' } = {}) => {
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
      queryFn: (payload = {}) => {
        const duplicateSkill = runtimeControlState.skills.find(
          (skill) => String(skill.key ?? '').trim() === String(payload.key ?? '').trim(),
        )

        if (duplicateSkill) {
          return buildConflictError('Skill key must be unique.', {
            field: 'key',
            reason: 'RUNTIME_SKILL_KEY_CONFLICT',
          })
        }

        const createdSkill = {
          id: generateRuntimeId('skill', payload.key),
          ...cloneRuntimeSkill({
            ...payload,
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
      queryFn: (skillId) => {
        const skill = findRuntimeSkillById(skillId)
        if (!skill) {
          return buildNotFoundError('Skill was not found.')
        }

        return { data: buildEntityResponse(cloneRuntimeSkill(skill)) }
      },
      providesTags: (_result, _error, skillId) => [{ type: 'RuntimeSkill', id: skillId }],
    }),

    updateRuntimeSkill: build.mutation({
      queryFn: ({ skillId, ...payload }) => {
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
      queryFn: ({ page = 1, pageSize = WORKFLOW_POLICY_PAGE_SIZE, q = '', status = '', frameworkKey = '' } = {}) => {
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
      queryFn: (payload = {}) => {
        const duplicatePolicy = runtimeControlState.workflowPolicies.find(
          (policy) => String(policy.key ?? '').trim() === String(payload.key ?? '').trim(),
        )

        if (duplicatePolicy) {
          return buildConflictError('Workflow policy key must be unique.', {
            field: 'key',
            reason: 'WORKFLOW_POLICY_KEY_CONFLICT',
          })
        }

        const createdPolicy = {
          id: generateRuntimeId('policy', payload.key),
          ...cloneWorkflowPolicy({
            ...payload,
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
      queryFn: (policyId) => {
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
      queryFn: ({ policyId, ...payload }) => {
        const existingPolicy = findWorkflowPolicyById(policyId)
        if (!existingPolicy) {
          return buildNotFoundError('Workflow policy was not found.')
        }

        const duplicatePolicy = runtimeControlState.workflowPolicies.find(
          (policy) =>
            policy.id !== policyId
            && String(policy.key ?? '').trim() === String(payload.key ?? existingPolicy.key).trim(),
        )

        if (duplicatePolicy) {
          return buildConflictError('Workflow policy key must be unique.', {
            field: 'key',
            reason: 'WORKFLOW_POLICY_KEY_CONFLICT',
          })
        }

        const nextPolicy = cloneWorkflowPolicy({
          ...existingPolicy,
          ...payload,
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
  useListFrameworkPackagesQuery,
  useCreateFrameworkPackageMutation,
  useGetFrameworkPackageQuery,
  useUpdateFrameworkPackageMutation,
  useActivateFrameworkPackageMutation,
  useListRuntimeAgentsQuery,
  useCreateRuntimeAgentMutation,
  useGetRuntimeAgentQuery,
  useUpdateRuntimeAgentMutation,
  useListRuntimeSkillsQuery,
  useCreateRuntimeSkillMutation,
  useGetRuntimeSkillQuery,
  useUpdateRuntimeSkillMutation,
  useListWorkflowPoliciesQuery,
  useCreateWorkflowPolicyMutation,
  useGetWorkflowPolicyQuery,
  useUpdateWorkflowPolicyMutation,
} = runtimeControlApi
