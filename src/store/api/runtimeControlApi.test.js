import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import {
  runtimeControlApi,
  buildRuntimeControlDetailRequest,
  buildRuntimeControlListRequest,
  buildRuntimeControlMutationRequest,
  __mutateRuntimeControlApiStateForTests,
  __resetRuntimeControlApiStateForTests,
  useCreateFrameworkRegistryMutation,
  useActivateFrameworkPackageMutation,
  useCloneFrameworkPackageMutation,
  useCreateFrameworkPackageMutation,
  useCreateRuntimeAgentMutation,
  useCreateRuntimePathMutation,
  useCreateRuntimeSkillMutation,
  useCloneRuntimeSkillMutation,
  useCreateValidationRegistryMutation,
  useCreateWorkflowPolicyMutation,
  useCloneWorkflowPolicyMutation,
  useDeprecateRuntimePathMutation,
  useDisableRuntimePathMutation,
  useCloneRuntimePathMutation,
  useDuplicateRuntimePathMutation,
  useGetFrameworkRegistryQuery,
  useGetFrameworkPackageAuditQuery,
  useGetFrameworkPackageDependenciesQuery,
  useGetFrameworkPackageDiffQuery,
  useGetFrameworkPackageIntegrityQuery,
  useGetFrameworkPackageQuery,
  useGetRuntimeActivationHistoryQuery,
  useGetRuntimeActivationReadinessQuery,
  useGetRuntimeValidationHistoryQuery,
  useGetRuntimeAgentQuery,
  useGetRuntimePathDependenciesQuery,
  useGetRuntimePathQuery,
  useGetRuntimeSkillQuery,
  useGetValidationRegistryDependenciesQuery,
  useGetValidationRegistryQuery,
  useGetWorkflowPolicyQuery,
  useGetWorkflowPolicyDependenciesQuery,
  useGetUiContractQuery,
  useListFrameworkRegistriesQuery,
  useListFrameworkPackagesQuery,
  useListRuntimeAgentsQuery,
  useListRuntimeDeploymentsQuery,
  useListRuntimePathsQuery,
  useListRuntimeSkillsQuery,
  useListUiContractsQuery,
  useListValidationRegistryQuery,
  useListWorkflowPoliciesQuery,
  useTestWorkflowPolicyMutation,
  useActivateRuntimePathMutation,
  useUpdateFrameworkRegistryMutation,
  useUpdateFrameworkPackageMutation,
  useUpdateFrameworkPackageSafeMetadataMutation,
  useValidateRuntimeOperationMutation,
  useUpdateRuntimeAgentMutation,
  useUpdateRuntimePathMutation,
  useUpdateRuntimeSkillMutation,
  useCreateUiContractMutation,
  useCloneUiContractMutation,
  useUpdateUiContractMutation,
  useUpdateValidationRegistryMutation,
  useUpdateWorkflowPolicyMutation,
} from './runtimeControlApi.js'
import { baseApi } from './baseApi.js'

const createTestStore = () =>
  configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })

const testDirname = path.dirname(fileURLToPath(import.meta.url))
const runtimeControlParityContracts = JSON.parse(
  fs.readFileSync(
    path.resolve(testDirname, '../../../../docs/references/runtime-control/mock-api-parity-contracts.json'),
    'utf8',
  ),
)
const {
  frameworkPackageClone: frameworkPackageCloneParity,
  frameworkPackageCheckpoint: frameworkPackageCheckpointParity,
  runtimeValidation: runtimeValidationParity,
  runtimeActivation: runtimeActivationParity,
} = runtimeControlParityContracts

const expectFrameworkPackageCloneReleaseFieldsCleared = (frameworkPackage) => {
  const { clearedReleaseFields = [], clearedReleaseFieldValues = {} } = frameworkPackageCloneParity.cloneResult
  expect(Object.keys(clearedReleaseFieldValues)).toEqual(clearedReleaseFields)

  for (const field of clearedReleaseFields) {
    expect(frameworkPackage[field]).toEqual(clearedReleaseFieldValues[field])
  }
}

describe('runtimeControlApi', () => {
  beforeEach(() => {
    globalThis.__RUNTIME_CONTROL_API_MOCK__ = true
    __resetRuntimeControlApiStateForTests()
  })

  it('exposes Runtime Control endpoints', () => {
    expect(runtimeControlApi.endpoints).toHaveProperty('listFrameworkRegistries')
    expect(runtimeControlApi.endpoints).toHaveProperty('createFrameworkRegistry')
    expect(runtimeControlApi.endpoints).toHaveProperty('getFrameworkRegistry')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateFrameworkRegistry')
    expect(runtimeControlApi.endpoints).toHaveProperty('listFrameworkPackages')
    expect(runtimeControlApi.endpoints).toHaveProperty('createFrameworkPackage')
    expect(runtimeControlApi.endpoints).toHaveProperty('cloneFrameworkPackage')
    expect(runtimeControlApi.endpoints).toHaveProperty('getFrameworkPackage')
    expect(runtimeControlApi.endpoints).toHaveProperty('getFrameworkPackageDependencies')
    expect(runtimeControlApi.endpoints).toHaveProperty('getFrameworkPackageIntegrity')
    expect(runtimeControlApi.endpoints).toHaveProperty('getFrameworkPackageAudit')
    expect(runtimeControlApi.endpoints).toHaveProperty('getFrameworkPackageDiff')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateFrameworkPackage')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateFrameworkPackageSafeMetadata')
    expect(runtimeControlApi.endpoints).toHaveProperty('activateFrameworkPackage')
    expect(runtimeControlApi.endpoints).toHaveProperty('getRuntimeActivationReadiness')
    expect(runtimeControlApi.endpoints).toHaveProperty('getRuntimeActivationHistory')
    expect(runtimeControlApi.endpoints).toHaveProperty('listRuntimeDeployments')
    expect(runtimeControlApi.endpoints).toHaveProperty('validateRuntimeOperation')
    expect(runtimeControlApi.endpoints).toHaveProperty('getRuntimeValidationHistory')
    expect(runtimeControlApi.endpoints).toHaveProperty('listRuntimeAgents')
    expect(runtimeControlApi.endpoints).toHaveProperty('createRuntimeAgent')
    expect(runtimeControlApi.endpoints).toHaveProperty('getRuntimeAgent')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateRuntimeAgent')
    expect(runtimeControlApi.endpoints).toHaveProperty('listRuntimePaths')
    expect(runtimeControlApi.endpoints).toHaveProperty('createRuntimePath')
    expect(runtimeControlApi.endpoints).toHaveProperty('getRuntimePath')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateRuntimePath')
    expect(runtimeControlApi.endpoints).toHaveProperty('cloneRuntimePath')
    expect(runtimeControlApi.endpoints).toHaveProperty('duplicateRuntimePath')
    expect(runtimeControlApi.endpoints).toHaveProperty('getRuntimePathDependencies')
    expect(runtimeControlApi.endpoints).toHaveProperty('activateRuntimePath')
    expect(runtimeControlApi.endpoints).toHaveProperty('disableRuntimePath')
    expect(runtimeControlApi.endpoints).toHaveProperty('deprecateRuntimePath')
    expect(runtimeControlApi.endpoints).toHaveProperty('listRuntimeSkills')
    expect(runtimeControlApi.endpoints).toHaveProperty('createRuntimeSkill')
    expect(runtimeControlApi.endpoints).toHaveProperty('cloneRuntimeSkill')
    expect(runtimeControlApi.endpoints).toHaveProperty('getRuntimeSkill')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateRuntimeSkill')
    expect(runtimeControlApi.endpoints).toHaveProperty('listValidationRegistry')
    expect(runtimeControlApi.endpoints).toHaveProperty('createValidationRegistry')
    expect(runtimeControlApi.endpoints).toHaveProperty('getValidationRegistry')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateValidationRegistry')
    expect(runtimeControlApi.endpoints).toHaveProperty('getValidationRegistryDependencies')
    expect(runtimeControlApi.endpoints).toHaveProperty('listWorkflowPolicies')
    expect(runtimeControlApi.endpoints).toHaveProperty('createWorkflowPolicy')
    expect(runtimeControlApi.endpoints).toHaveProperty('cloneWorkflowPolicy')
    expect(runtimeControlApi.endpoints).toHaveProperty('getWorkflowPolicy')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateWorkflowPolicy')
    expect(runtimeControlApi.endpoints).toHaveProperty('listUiContracts')
    expect(runtimeControlApi.endpoints).toHaveProperty('createUiContract')
    expect(runtimeControlApi.endpoints).toHaveProperty('getUiContract')
    expect(runtimeControlApi.endpoints).toHaveProperty('cloneUiContract')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateUiContract')
  })

  it('exports query hooks', () => {
    expect(typeof useListFrameworkRegistriesQuery).toBe('function')
    expect(typeof useGetFrameworkRegistryQuery).toBe('function')
    expect(typeof useListFrameworkPackagesQuery).toBe('function')
    expect(typeof useGetFrameworkPackageQuery).toBe('function')
    expect(typeof useGetFrameworkPackageDependenciesQuery).toBe('function')
    expect(typeof useGetFrameworkPackageIntegrityQuery).toBe('function')
    expect(typeof useGetFrameworkPackageAuditQuery).toBe('function')
    expect(typeof useGetFrameworkPackageDiffQuery).toBe('function')
    expect(typeof useGetRuntimeActivationReadinessQuery).toBe('function')
    expect(typeof useGetRuntimeActivationHistoryQuery).toBe('function')
    expect(typeof useListRuntimeDeploymentsQuery).toBe('function')
    expect(typeof useGetRuntimeValidationHistoryQuery).toBe('function')
    expect(typeof useListRuntimeAgentsQuery).toBe('function')
    expect(typeof useGetRuntimeAgentQuery).toBe('function')
    expect(typeof useListRuntimePathsQuery).toBe('function')
    expect(typeof useGetRuntimePathQuery).toBe('function')
    expect(typeof useGetRuntimePathDependenciesQuery).toBe('function')
    expect(typeof useListRuntimeSkillsQuery).toBe('function')
    expect(typeof useGetRuntimeSkillQuery).toBe('function')
    expect(typeof useListValidationRegistryQuery).toBe('function')
    expect(typeof useGetValidationRegistryQuery).toBe('function')
    expect(typeof useGetValidationRegistryDependenciesQuery).toBe('function')
    expect(typeof useListWorkflowPoliciesQuery).toBe('function')
    expect(typeof useGetWorkflowPolicyQuery).toBe('function')
    expect(typeof useGetWorkflowPolicyDependenciesQuery).toBe('function')
    expect(typeof useListUiContractsQuery).toBe('function')
    expect(typeof useGetUiContractQuery).toBe('function')
  })

  it('exports mutation hooks', () => {
    expect(typeof useCreateFrameworkRegistryMutation).toBe('function')
    expect(typeof useUpdateFrameworkRegistryMutation).toBe('function')
    expect(typeof useCreateFrameworkPackageMutation).toBe('function')
    expect(typeof useCloneFrameworkPackageMutation).toBe('function')
    expect(typeof useUpdateFrameworkPackageMutation).toBe('function')
    expect(typeof useUpdateFrameworkPackageSafeMetadataMutation).toBe('function')
    expect(typeof useActivateFrameworkPackageMutation).toBe('function')
    expect(typeof useValidateRuntimeOperationMutation).toBe('function')
    expect(typeof useCreateRuntimeAgentMutation).toBe('function')
    expect(typeof useUpdateRuntimeAgentMutation).toBe('function')
    expect(typeof useCreateRuntimePathMutation).toBe('function')
    expect(typeof useUpdateRuntimePathMutation).toBe('function')
    expect(typeof useCloneRuntimePathMutation).toBe('function')
    expect(typeof useDuplicateRuntimePathMutation).toBe('function')
    expect(typeof useActivateRuntimePathMutation).toBe('function')
    expect(typeof useDisableRuntimePathMutation).toBe('function')
    expect(typeof useDeprecateRuntimePathMutation).toBe('function')
    expect(typeof useCreateRuntimeSkillMutation).toBe('function')
    expect(typeof useCloneRuntimeSkillMutation).toBe('function')
    expect(typeof useUpdateRuntimeSkillMutation).toBe('function')
    expect(typeof useCreateValidationRegistryMutation).toBe('function')
    expect(typeof useUpdateValidationRegistryMutation).toBe('function')
    expect(typeof useCreateWorkflowPolicyMutation).toBe('function')
    expect(typeof useCloneWorkflowPolicyMutation).toBe('function')
    expect(typeof useTestWorkflowPolicyMutation).toBe('function')
    expect(typeof useUpdateWorkflowPolicyMutation).toBe('function')
    expect(typeof useCreateUiContractMutation).toBe('function')
    expect(typeof useCloneUiContractMutation).toBe('function')
    expect(typeof useUpdateUiContractMutation).toBe('function')
  })

  it('registers query and mutation initiators for each Runtime Control resource', () => {
    expect(typeof runtimeControlApi.endpoints.listFrameworkRegistries.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.createFrameworkRegistry.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getFrameworkRegistry.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateFrameworkRegistry.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.listFrameworkPackages.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.createFrameworkPackage.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.cloneFrameworkPackage.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getFrameworkPackage.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getFrameworkPackageDependencies.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getFrameworkPackageIntegrity.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getFrameworkPackageAudit.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getFrameworkPackageDiff.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateFrameworkPackage.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateFrameworkPackageSafeMetadata.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.activateFrameworkPackage.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getRuntimeActivationReadiness.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getRuntimeActivationHistory.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.listRuntimeDeployments.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.listRuntimeAgents.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.createRuntimeAgent.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getRuntimeAgent.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateRuntimeAgent.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.listRuntimePaths.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.createRuntimePath.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getRuntimePath.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateRuntimePath.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.cloneRuntimePath.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.duplicateRuntimePath.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getRuntimePathDependencies.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.activateRuntimePath.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.disableRuntimePath.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.deprecateRuntimePath.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.listRuntimeSkills.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.createRuntimeSkill.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.cloneRuntimeSkill.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getRuntimeSkill.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateRuntimeSkill.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.listValidationRegistry.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.createValidationRegistry.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getValidationRegistry.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateValidationRegistry.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getValidationRegistryDependencies.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.listWorkflowPolicies.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.createWorkflowPolicy.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.cloneWorkflowPolicy.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getWorkflowPolicy.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getWorkflowPolicyDependencies.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.testWorkflowPolicy.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateWorkflowPolicy.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.listUiContracts.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.createUiContract.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getUiContract.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.cloneUiContract.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateUiContract.initiate).toBe('function')
  })

  it('builds live framework package catalogue and mutation requests', () => {
    expect(
      buildRuntimeControlListRequest({
        resourcePath: 'framework-packages',
        page: 2,
        pageSize: 10,
        q: 'vmf',
        status: 'ACTIVE',
        frameworkKey: 'vmf',
        defaultPageSize: 4,
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-packages',
      params: {
        page: 2,
        pageSize: 10,
        q: 'vmf',
        status: 'ACTIVE',
        frameworkKey: 'VMF',
      },
    })

    expect(
      buildRuntimeControlDetailRequest('framework-packages', 'pkg-live-2'),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-packages/pkg-live-2',
    })

    expect(
      buildRuntimeControlDetailRequest('framework-packages', 'pkg-live-2/dependencies'),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-packages/pkg-live-2/dependencies',
    })

    expect(
      buildRuntimeControlDetailRequest('framework-packages', 'pkg-live-2/integrity'),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-packages/pkg-live-2/integrity',
    })

    expect(
      buildRuntimeControlDetailRequest('framework-packages', 'pkg-live-2/diff/2.3.0'),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-packages/pkg-live-2/diff/2.3.0',
    })

    expect(
      buildRuntimeControlMutationRequest({
        resourcePath: 'framework-packages',
        entityId: 'pkg-live-2',
        method: 'PATCH',
        body: { version: '3.1.1' },
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-packages/pkg-live-2',
      method: 'PATCH',
      body: { version: '3.1.1' },
    })

    expect(
      buildRuntimeControlMutationRequest({
        resourcePath: 'framework-packages',
        entityId: 'pkg-vmf-231/safe-metadata',
        method: 'PATCH',
        body: {
          packageName: 'Enterprise VMF Package',
          description: 'Customer-facing package.',
          visibility: 'CUSTOMER_VISIBLE',
          customerAccessMode: 'ALL_CUSTOMERS',
          assignedCustomerIds: [],
        },
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-packages/pkg-vmf-231/safe-metadata',
      method: 'PATCH',
      body: {
        packageName: 'Enterprise VMF Package',
        description: 'Customer-facing package.',
        visibility: 'CUSTOMER_VISIBLE',
        customerAccessMode: 'ALL_CUSTOMERS',
        assignedCustomerIds: [],
      },
    })

    expect(
      buildRuntimeControlMutationRequest({
        resourcePath: 'framework-packages',
        entityId: 'pkg-live-2',
        method: 'POST',
        body: null,
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-packages/pkg-live-2',
      method: 'POST',
      body: null,
    })
  })

  it('builds live framework registry requests with type filters and mutation requests', () => {
    expect(
      buildRuntimeControlListRequest({
        resourcePath: 'framework-registry',
        page: 3,
        pageSize: 25,
        q: 'vmf',
        status: 'ACTIVE',
        type: 'structured',
        structureType: 'section_based',
        defaultPageSize: 4,
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-registry',
      params: {
        page: 3,
        pageSize: 25,
        q: 'vmf',
        status: 'ACTIVE',
        type: 'structured',
        structureType: 'section_based',
      },
    })

    expect(
      buildRuntimeControlDetailRequest('framework-registry', 'framework-vmf'),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-registry/framework-vmf',
    })

    expect(
      buildRuntimeControlMutationRequest({
        resourcePath: 'framework-registry',
        entityId: 'framework-vmf',
        method: 'PATCH',
        body: { name: 'Value Messaging Framework' },
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-registry/framework-vmf',
      method: 'PATCH',
      body: { name: 'Value Messaging Framework' },
    })
  })

  it('builds live workflow policy requests with mutation requests', () => {
    expect(
      buildRuntimeControlListRequest({
        resourcePath: 'workflow-policies',
        page: 1,
        pageSize: 10,
        q: '',
        status: '',
        frameworkKey: '',
        type: 'ROUTING',
        defaultPageSize: 4,
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/workflow-policies',
      params: {
        page: 1,
        pageSize: 10,
        type: 'ROUTING',
      },
    })

    expect(
      buildRuntimeControlMutationRequest({
        resourcePath: 'workflow-policies',
        method: 'POST',
        body: { key: 'vmf-review' },
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/workflow-policies',
      method: 'POST',
      body: { key: 'vmf-review' },
    })

    expect(
      buildRuntimeControlMutationRequest({
        resourcePath: 'workflow-policies',
        entityId: 'policy-live-1',
        method: 'PATCH',
        body: { name: 'VMF Release Policy' },
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/workflow-policies/policy-live-1',
      method: 'PATCH',
      body: { name: 'VMF Release Policy' },
    })
  })

  it('keeps mock Workflow Policy clone and lock behavior aligned with live API', async () => {
    const store = createTestStore()
    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      workflowPolicies: state.workflowPolicies.map((policy) =>
        policy.id === 'policy-vmf-publish'
          ? {
              ...policy,
              componentVersion: 2,
              versionStatus: 'ACTIVE',
              isLocked: true,
              lockedByPackageKeys: ['vmf-package-1'],
              steps: [{
                stepKey: 'publish-ready',
                type: 'EVENT_EMIT',
                order: 1,
                eventKey: 'publish-ready',
              }],
            }
          : policy,
      ),
    }))

    const lockedUpdateResult = await store.dispatch(
      runtimeControlApi.endpoints.updateWorkflowPolicy.initiate({
        policyId: 'policy-vmf-publish',
        name: 'Blocked Update',
      }),
    )

    expect(lockedUpdateResult.error?.status).toBe(409)
    expect(lockedUpdateResult.error?.data?.error?.details?.reason).toBe('WORKFLOW_POLICY_LOCKED')

    const cloneResult = await store.dispatch(
      runtimeControlApi.endpoints.cloneWorkflowPolicy.initiate({
        policyId: 'policy-vmf-publish',
        body: {
          key: 'vmf-publish-v2',
          name: 'VMF Publish Policy v2',
        },
      }),
    )

    expect(cloneResult.error).toBeUndefined()
    expect(cloneResult.data?.data).toMatchObject({
      key: 'vmf-publish-v2',
      name: 'VMF Publish Policy v2',
      status: 'DRAFT',
      componentVersion: 3,
      versionStatus: 'DRAFT',
      isLocked: false,
      lockedReason: null,
      lockedByPackageKeys: [],
      clonedFromStableId: 'policy-vmf-publish',
      supersedesStableId: 'policy-vmf-publish',
      steps: [expect.objectContaining({ stepKey: 'publish-ready' })],
    })

    const clonedPolicyId = cloneResult.data?.data?.id
    expect(clonedPolicyId).toBeTruthy()

    const stepsUpdateResult = await store.dispatch(
      runtimeControlApi.endpoints.updateWorkflowPolicy.initiate({
        policyId: clonedPolicyId,
        executionType: 'ORDERED_STEPS',
        steps: [{
          stepKey: 'emit-review-ready',
          type: 'EVENT_EMIT',
          order: 1,
          eventKey: 'review-ready',
        }],
        timeoutMs: 10000,
        validationFreshnessMinutes: 30,
      }),
    )

    expect(stepsUpdateResult.error).toBeUndefined()
    expect(stepsUpdateResult.data?.data?.steps).toEqual([
      expect.objectContaining({
        stepKey: 'emit-review-ready',
        type: 'EVENT_EMIT',
        order: 1,
        eventKey: 'review-ready',
      }),
    ])

    const reloadedPolicy = await store.dispatch(
      runtimeControlApi.endpoints.getWorkflowPolicy.initiate(clonedPolicyId, { forceRefetch: true }),
    )
    expect(reloadedPolicy.data?.data?.steps).toEqual([
      expect.objectContaining({ stepKey: 'emit-review-ready' }),
    ])

    const managedFieldResult = await store.dispatch(
      runtimeControlApi.endpoints.createWorkflowPolicy.initiate({
        body: {
          key: 'vmf-managed-field',
          name: 'VMF Managed Field',
          componentVersion: 99,
        },
      }),
    )

    expect(managedFieldResult.error?.status).toBe(422)
    expect(managedFieldResult.error?.data?.error?.details?.componentVersion).toContain('managed by the server')
  })

  it('keeps mock Runtime Skill clone and lock behavior aligned with live API', async () => {
    const store = createTestStore()
    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      skills: state.skills.map((skill) =>
        skill.id === 'skill-snapshot'
          ? {
              ...skill,
              componentVersion: 1,
              versionStatus: 'ACTIVE',
              isLocked: true,
              lockedByPackageKeys: ['vmf-package-1'],
            }
          : skill,
      ),
    }))

    const lockedUpdateResult = await store.dispatch(
      runtimeControlApi.endpoints.updateRuntimeSkill.initiate({
        skillId: 'SKILL-SNAPSHOT',
        name: 'Blocked Skill Update',
      }),
    )

    expect(lockedUpdateResult.error?.status).toBe(409)
    expect(lockedUpdateResult.error?.data?.error?.details?.reason).toBe('RUNTIME_SKILL_LOCKED')

    const governedMetadataResult = await store.dispatch(
      runtimeControlApi.endpoints.cloneRuntimeSkill.initiate({
        skillId: 'skill-snapshot',
        key: 'snapshot-v2',
        name: 'Snapshot v2',
        isLocked: false,
      }),
    )

    expect(governedMetadataResult.error?.status).toBe(422)
    expect(governedMetadataResult.error?.data?.error?.details?.isLocked).toContain('server')

    const cloneResult = await store.dispatch(
      runtimeControlApi.endpoints.cloneRuntimeSkill.initiate({
        skillId: 'SKILL-SNAPSHOT',
        key: 'snapshot-v2',
        name: 'Snapshot v2',
        description: 'Editable draft successor.',
      }),
    )

    expect(cloneResult.error).toBeUndefined()
    expect(cloneResult.data?.data).toMatchObject({
      key: 'snapshot-v2',
      name: 'Snapshot v2',
      status: 'DRAFT',
      componentVersion: 2,
      versionStatus: 'DRAFT',
      isLocked: false,
      lockedByPackageKeys: [],
      clonedFromStableId: 'skill-snapshot',
      supersedesStableId: 'skill-snapshot',
    })
  })

  it('builds live UI Contract clone requests and aligns mock clone/lock behavior', async () => {
    expect(
      buildRuntimeControlMutationRequest({
        resourcePath: 'ui-contracts',
        entityId: 'ui-contract-vmf-ui-contract-v1/clone',
        method: 'POST',
        body: { uiContractKey: 'vmf-ui-contract-v2' },
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/ui-contracts/ui-contract-vmf-ui-contract-v1/clone',
      method: 'POST',
      body: { uiContractKey: 'vmf-ui-contract-v2' },
    })

    const store = createTestStore()
    const cloneResult = await store.dispatch(
      runtimeControlApi.endpoints.cloneUiContract.initiate({
        uiContractId: 'ui-contract-vmf-ui-contract-v1',
        uiContractKey: 'vmf-ui-contract-v2',
        name: 'VMF UI Contract v2',
      }),
    )

    expect(cloneResult.error).toBeUndefined()
    expect(cloneResult.data?.data?.uiContractKey).toBe('vmf-ui-contract-v2')
    expect(cloneResult.data?.data?.status).toBe('DRAFT')
    expect(cloneResult.data?.data?.componentVersion).toBe(2)
    expect(cloneResult.data?.data?.versionStatus).toBe('DRAFT')
    expect(cloneResult.data?.data?.isLocked).toBe(false)
    expect(cloneResult.data?.data?.lockedReason).toBeNull()
    expect(cloneResult.data?.data?.clonedFromStableId).toBe('ui-contract-vmf-ui-contract-v1')
    expect(new Date(cloneResult.data?.data?.resolvedAt).toISOString()).toBe(cloneResult.data?.data?.resolvedAt)
    expect(cloneResult.data?.data?.resolvedAt).toBe(cloneResult.data?.data?.updatedAt)

    const immutableKeyResult = await store.dispatch(
      runtimeControlApi.endpoints.updateUiContract.initiate({
        uiContractId: 'ui-contract-vmf-ui-contract-v1',
        uiContractKey: 'renamed-ui-contract',
      }),
    )
    expect(immutableKeyResult.error?.status).toBe(422)
    expect(immutableKeyResult.error?.data?.error?.details?.uiContractKey).toContain('server-managed governance metadata')

    const resolvedAtResult = await store.dispatch(
      runtimeControlApi.endpoints.updateUiContract.initiate({
        uiContractId: 'ui-contract-vmf-ui-contract-v1',
        resolvedAt: '2026-04-29T08:00:00.000Z',
      }),
    )
    expect(resolvedAtResult.error?.status).toBe(422)
    expect(resolvedAtResult.error?.data?.error?.details?.resolvedAt).toContain('server-managed governance metadata')

    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      uiContracts: state.uiContracts.map((contract) =>
        contract.id === 'ui-contract-vmf-ui-contract-v1'
          ? {
              ...contract,
              isLocked: true,
              lockedByPackageKeys: ['vmf-qa-manual-951'],
            }
          : contract),
    }))

    const lockedUpdateResult = await store.dispatch(
      runtimeControlApi.endpoints.updateUiContract.initiate({
        uiContractId: 'ui-contract-vmf-ui-contract-v1',
        name: 'Blocked Update',
      }),
    )

    expect(lockedUpdateResult.error?.status).toBe(409)
    expect(lockedUpdateResult.error?.data?.error?.details?.reason).toBe('UI_CONTRACT_LOCKED')
  })

  it('keeps mock framework package mutations aligned with live deprecated-field rejection', async () => {
    const store = createTestStore()

    const createResult = await store.dispatch(
      runtimeControlApi.endpoints.createFrameworkPackage.initiate({
        frameworkKey: 'VMF',
        frameworkName: 'Value Management Framework',
        version: '9.9.9',
        validationConfig: [],
      }),
    )

    expect(createResult.error?.status).toBe(422)
    expect(createResult.error?.data?.error?.details?.validationConfig).toContain('validationBindings')

    const updateResult = await store.dispatch(
      runtimeControlApi.endpoints.updateFrameworkPackage.initiate({
        packageId: 'pkg-vmf-240',
        workflowPolicyConfig: [],
      }),
    )

    expect(updateResult.error?.status).toBe(422)
    expect(updateResult.error?.data?.error?.details?.workflowPolicyConfig).toContain('workflowBindings')

    const getResult = await store.dispatch(
      runtimeControlApi.endpoints.getFrameworkPackage.initiate('pkg-vmf-240'),
    )

    expect(getResult.error).toBeUndefined()
    expect(getResult.data?.data?.workflowPolicyConfig).toBeUndefined()
    expect(getResult.data?.data?.validationConfig).toBeUndefined()
  })

  it('keeps mock active framework package safe metadata updates scoped to display and access fields', async () => {
    const store = createTestStore()
    const beforeResult = await store.dispatch(
      runtimeControlApi.endpoints.getFrameworkPackage.initiate('pkg-vmf-231'),
    )
    const previousDependencyLock = beforeResult.data?.data?.dependencyLock
    const previousCheckpointStatus = beforeResult.data?.data?.lastCheckpointStatus

    const updateResult = await store.dispatch(
      runtimeControlApi.endpoints.updateFrameworkPackageSafeMetadata.initiate({
        packageId: 'pkg-vmf-231',
        packageName: 'Enterprise VMF Package',
        description: 'Customer-facing package.',
        visibility: 'CUSTOMER_VISIBLE',
        customerAccessMode: 'SELECTED_CUSTOMERS',
        assignedCustomerIds: ['cust-acme'],
      }),
    )

    expect(updateResult.error).toBeUndefined()
    expect(updateResult.data?.data).toEqual(expect.objectContaining({
      packageName: 'Enterprise VMF Package',
      description: 'Customer-facing package.',
      visibility: 'CUSTOMER_VISIBLE',
      customerAccessMode: 'SELECTED_CUSTOMERS',
      assignedCustomerIds: ['cust-acme'],
      status: 'ACTIVE',
    }))
    expect(updateResult.data?.data?.dependencyLock).toEqual(previousDependencyLock)
    expect(updateResult.data?.data?.lastCheckpointStatus).toEqual(previousCheckpointStatus)

    const blockedResult = await store.dispatch(
      runtimeControlApi.endpoints.updateFrameworkPackageSafeMetadata.initiate({
        packageId: 'pkg-vmf-231',
        sections: [],
      }),
    )
    expect(blockedResult.error?.status).toBe(422)
    expect(blockedResult.error?.data?.error?.code).toBe('FIELD_LOCKED_ON_ACTIVE_PACKAGE')

    const nonActiveResult = await store.dispatch(
      runtimeControlApi.endpoints.updateFrameworkPackageSafeMetadata.initiate({
        packageId: 'pkg-vmf-240',
        packageName: 'Draft Package',
      }),
    )
    expect(nonActiveResult.error?.status).toBe(409)
    expect(nonActiveResult.error?.data?.error?.details?.reason).toBe(
      'FRAMEWORK_PACKAGE_SAFE_METADATA_REQUIRES_ACTIVE',
    )
  })

  it('rejects mock active framework package safe metadata payloads that live validation rejects', async () => {
    const invalidCases = [
      {
        label: 'overlong package name',
        payload: { packageName: 'A'.repeat(161) },
        field: 'packageName',
      },
      {
        label: 'overlong description',
        payload: { description: 'A'.repeat(501) },
        field: 'description',
      },
      {
        label: 'invalid visibility enum',
        payload: { visibility: 'PUBLIC' },
        field: 'visibility',
      },
      {
        label: 'invalid customer access enum',
        payload: {
          visibility: 'CUSTOMER_VISIBLE',
          customerAccessMode: 'MANUAL_LIST',
        },
        field: 'customerAccessMode',
      },
      {
        label: 'invalid customer id',
        payload: {
          visibility: 'CUSTOMER_VISIBLE',
          customerAccessMode: 'SELECTED_CUSTOMERS',
          assignedCustomerIds: ['customer 123'],
        },
        field: 'assignedCustomerIds',
      },
      {
        label: 'oversized customer id list',
        payload: {
          visibility: 'CUSTOMER_VISIBLE',
          customerAccessMode: 'SELECTED_CUSTOMERS',
          assignedCustomerIds: Array.from({ length: 201 }, (_, index) => `customer-${index + 1}`),
        },
        field: 'assignedCustomerIds',
      },
    ]

    for (const invalidCase of invalidCases) {
      const store = createTestStore()
      const result = await store.dispatch(
        runtimeControlApi.endpoints.updateFrameworkPackageSafeMetadata.initiate({
          packageId: 'pkg-vmf-231',
          ...invalidCase.payload,
        }),
      )

      expect(result.error?.status, invalidCase.label).toBe(422)
      expect(result.error?.data?.error?.code, invalidCase.label).toBe('VALIDATION_FAILED')
      expect(result.error?.data?.error?.details?.[invalidCase.field], invalidCase.label).toBeTruthy()
    }
  })

  it('clones mock framework packages as editable drafts without release evidence', async () => {
    const store = createTestStore()

    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      frameworkPackages: state.frameworkPackages.map((pkg) =>
        pkg.id === 'pkg-vmf-231'
          ? {
              ...pkg,
              status: 'ACTIVE',
              versionStatus: 'ACTIVE',
              isDefault: true,
              isLocked: true,
              lockedAt: '2026-05-08T12:00:00.000Z',
              lockedBy: 'sa-1',
              lockedReason: 'Activation',
              dependencyLock: {
                status: 'PASS',
                references: [{ collectionKey: 'RuntimePathRegistry', key: 'framework_state.sections.customer_problem' }],
              },
              lastCheckpointStatus: 'PASS',
              lastCheckpointAt: '2026-05-08T12:00:00.000Z',
              lastCheckpointResult: { status: 'PASS', summary: { totalChecks: 1, passed: 1, warnings: 0, failed: 0 } },
              uiContractBinding: { key: 'vmf-ui-contract-v1', status: 'ACTIVE' },
              activatedAt: '2026-05-08T12:05:00.000Z',
              activatedBy: 'sa-1',
            }
          : pkg,
      ),
    }))

    const cloneResult = await store.dispatch(
      runtimeControlApi.endpoints.cloneFrameworkPackage.initiate({
        packageId: 'pkg-vmf-231',
        version: '2.4.9',
        packageKey: 'vmf-clone-249',
        packageName: 'VMF Clone 2.4.9',
        description: 'Draft clone for governed edits.',
      }),
    )

    expect(cloneResult.error).toBeUndefined()
    expect(cloneResult.data?.data).toEqual(expect.objectContaining({
      id: expect.stringMatching(/^[a-f0-9]{24}$/),
      version: '2.4.9',
      packageKey: 'vmf-clone-249',
      packageName: 'VMF Clone 2.4.9',
      status: frameworkPackageCloneParity.cloneResult.status,
      versionStatus: frameworkPackageCloneParity.cloneResult.versionStatus,
      derivedFromPackageId: 'pkg-vmf-231',
      isDefault: false,
      isLocked: false,
    }))
    expectFrameworkPackageCloneReleaseFieldsCleared(cloneResult.data?.data)
    expect(cloneResult.data?.data.sections.length).toBeGreaterThan(0)
    expect(cloneResult.data?.data.uiContractKey).toBeTruthy()

    const duplicateResult = await store.dispatch(
      runtimeControlApi.endpoints.cloneFrameworkPackage.initiate({
        packageId: 'pkg-vmf-231',
        version: '2.4.9',
        packageKey: 'vmf-clone-249-next',
      }),
    )

    expect(duplicateResult.error?.status).toBe(409)
    expect(duplicateResult.error?.data?.error?.details?.reason).toBe('FRAMEWORK_PACKAGE_VERSION_CONFLICT')

    const invalidKeyResult = await store.dispatch(
      runtimeControlApi.endpoints.cloneFrameworkPackage.initiate({
        packageId: 'pkg-vmf-231',
        version: '2.5.9',
        packageKey: '"quoted-key"',
      }),
    )

    expect(invalidKeyResult.error?.status).toBe(422)
    expect(invalidKeyResult.error?.data?.error?.details?.packageKey).toContain('lowercase letters')
  })

  it('clones mock validated framework packages and rejects draft sources', async () => {
    const store = createTestStore()
    expect(frameworkPackageCloneParity.eligibleSourceStatuses).toContain('VALIDATED')

    const validatedCloneResult = await store.dispatch(
      runtimeControlApi.endpoints.cloneFrameworkPackage.initiate({
        packageId: 'pkg-vmf-230',
        version: '2.5.0',
        packageKey: 'vmf-valid-clone-250',
      }),
    )

    expect(validatedCloneResult.error).toBeUndefined()
    expect(validatedCloneResult.data?.data).toEqual(expect.objectContaining({
      status: frameworkPackageCloneParity.cloneResult.status,
      versionStatus: frameworkPackageCloneParity.cloneResult.versionStatus,
      derivedFromPackageId: 'pkg-vmf-230',
    }))

    const ineligibleSourceCases = [
      { status: 'DRAFT', packageId: 'pkg-vmf-240', version: '2.5.1', packageKey: 'vmf-draft-clone-251' },
      { status: 'DEPRECATED', packageId: 'pkg-rld-100', version: '1.0.1', packageKey: 'rld-deprecated-clone-101' },
    ]
    expect(ineligibleSourceCases.map((entry) => entry.status)).toEqual(
      frameworkPackageCloneParity.ineligibleSourceStatuses,
    )

    for (const sourceCase of ineligibleSourceCases) {
      const sourceCloneResult = await store.dispatch(
        runtimeControlApi.endpoints.cloneFrameworkPackage.initiate({
          packageId: sourceCase.packageId,
          version: sourceCase.version,
          packageKey: sourceCase.packageKey,
        }),
      )

      expect(sourceCloneResult.error?.status).toBe(frameworkPackageCloneParity.sourceStatusConflict.httpStatus)
      expect(sourceCloneResult.error?.data?.error?.code).toBe(
        frameworkPackageCloneParity.sourceStatusConflict.errorCode,
      )
      expect(sourceCloneResult.error?.data?.error?.details?.reason).toBe(
        frameworkPackageCloneParity.sourceStatusConflict.reason,
      )
    }
  })

  it('keeps mock framework package integrity aligned with dependency issues', async () => {
    const store = createTestStore()

    const createResult = await store.dispatch(
      runtimeControlApi.endpoints.createFrameworkPackage.initiate({
        frameworkKey: 'VMF',
        frameworkName: 'Value Management Framework',
        version: '9.9.8',
        packageKey: 'vmf-mock-integrity-998',
        status: 'DRAFT',
        validationBindings: [
          {
            validationKey: 'missing-validation-check',
            trigger: 'ON_SUBMIT',
            blocking: true,
            priority: 100,
            enabled: true,
          },
        ],
      }),
    )
    const packageId = createResult.data?.data?.id

    const integrityResult = await store.dispatch(
      runtimeControlApi.endpoints.getFrameworkPackageIntegrity.initiate(packageId),
    )

    expect(integrityResult.error).toBeUndefined()
    expect(integrityResult.data?.data?.status).toBe('FAIL')
    expect(integrityResult.data?.data?.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'dependencies.validations',
          severity: 'FAIL',
          message: expect.stringContaining('missing-validation-check'),
        }),
      ]),
    )
  })

  it('validates mock framework packages through the checkpoint contract', async () => {
    const store = createTestStore()

    const createResult = await store.dispatch(
      runtimeControlApi.endpoints.createFrameworkPackage.initiate({
        frameworkKey: 'VMF',
        frameworkName: 'Value Management Framework',
        version: '9.9.7',
        packageKey: 'vmf-mock-checkpoint-997',
        status: 'DRAFT',
      }),
    )
    expect(createResult.error).toBeUndefined()
    const packageId = createResult.data?.data?.id

    const validateResult = await store.dispatch(
      runtimeControlApi.endpoints.validateFrameworkPackage.initiate({ packageId }),
    )

    expect(validateResult.error).toBeUndefined()
    expect(validateResult.data?.data?.package?.status).toBe('VALIDATED')
    expect(validateResult.data?.data?.checkpoint?.status).toBe('PASS')

    const latestCheckpointResult = await store.dispatch(
      runtimeControlApi.endpoints.getFrameworkPackageLatestCheckpoint.initiate(packageId),
    )
    expect(latestCheckpointResult.error).toBeUndefined()
    expect(latestCheckpointResult.data?.data?.status).toBe('PASS')
  })

  it('keeps mock checkpoint invalid-mode validation aligned with the live contract', async () => {
    const store = createTestStore()
    const invalidModeContract = frameworkPackageCheckpointParity.invalidCheckpointMode

    const checkpointResult = await store.dispatch(
      runtimeControlApi.endpoints.runFrameworkPackageCheckpoint.initiate({
        packageId: 'pkg-vmf-231',
        mode: invalidModeContract.requestMode,
        persist: invalidModeContract.persist,
      }),
    )

    expect(checkpointResult.error?.status).toBe(invalidModeContract.httpStatus)
    expect(checkpointResult.error?.data?.error?.code).toBe(invalidModeContract.errorCode)
    expect(checkpointResult.error?.data?.error?.details?.[invalidModeContract.detailsField]).toBeTruthy()
  })

  it('reports imported mock dependency locks without checkpoint results as not run', async () => {
    const store = createTestStore()
    const packageId = 'pkg-imported-lock'

    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      frameworkPackages: [
        {
          id: packageId,
          frameworkKey: 'VMF',
          frameworkName: 'Value Management Framework',
          version: '2.3.1',
          packageKey: 'vmf-imported-lock',
          packageName: 'VMF Imported Lock',
          status: 'DRAFT',
          lastCheckpointStatus: 'PASS',
          lastCheckpointAt: '2026-05-07T13:42:00.000Z',
          lastCheckpointResult: null,
          dependencyLock: {
            status: 'PASS',
            references: [
              { collectionKey: 'RuntimePathRegistry', key: 'framework_state.sections.customer_problem' },
            ],
          },
        },
        ...state.frameworkPackages,
      ],
    }))

    const latestCheckpointResult = await store.dispatch(
      runtimeControlApi.endpoints.getFrameworkPackageLatestCheckpoint.initiate(packageId),
    )

    expect(latestCheckpointResult.error).toBeUndefined()
    expect(latestCheckpointResult.data?.data?.status).toBe('NOT_RUN')
    expect(latestCheckpointResult.data?.data?.timestamp).toBeNull()
    expect(latestCheckpointResult.data?.data?.runBy).toBeNull()
    expect(latestCheckpointResult.data?.data?.summary.resolvedReferences).toBe(1)
  })

  it('validates mock runtime mutations and records audit history', async () => {
    const store = createTestStore()

    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      runtimePaths: [
        {
          id: 'path-rvl-sections-probe',
          pathKey: 'framework_state.sections.rvl_probe',
          label: 'RVL Probe Section',
          status: 'ACTIVE',
          frameworkKeys: ['VMF'],
          allowedOperations: ['READ', 'WRITE', 'BIND'],
          isProtected: false,
        },
        ...state.runtimePaths,
      ],
      skillRoles: [
        {
          id: 'role-rvl-validator',
          stableId: 'role-validator',
          roleKey: 'VALIDATOR',
          label: 'Validator',
          status: 'ACTIVE',
          allowedOperations: ['READ', 'WRITE', 'EXECUTE'],
          allowedReadScopes: ['framework_state.sections.*'],
          allowedWriteScopes: ['framework_state.sections.*'],
        },
        ...state.skillRoles,
      ],
    }))

    const createResult = await store.dispatch(
      runtimeControlApi.endpoints.createFrameworkPackage.initiate({
        frameworkKey: 'VMF',
        frameworkName: 'Value Management Framework',
        version: '9.9.5',
        packageKey: 'vmf-mock-rvl-995',
        status: 'DRAFT',
      }),
    )
    const packageId = createResult.data?.data?.id
    await store.dispatch(runtimeControlApi.endpoints.validateFrameworkPackage.initiate({ packageId }))

    const validationResult = await store.dispatch(
      runtimeControlApi.endpoints.validateRuntimeOperation.initiate({
        operationType: 'STATE_WRITE',
        packageId,
        frameworkKey: 'VMF',
        runtimePath: 'framework_state.sections.rvl_probe',
        skillRoleKey: 'VALIDATOR',
      }),
    )

    expect(validationResult.error).toBeUndefined()
    expect(validationResult.data?.data?.status).toBe(runtimeValidationParity.stateWritePass.status)
    expect(validationResult.data?.data?.result).toBe(runtimeValidationParity.stateWritePass.result)
    expect(validationResult.data?.data?.operation).toBe(runtimeValidationParity.stateWritePass.operation)

    const historyResult = await store.dispatch(
      runtimeControlApi.endpoints.getRuntimeValidationHistory.initiate({ packageId }),
    )

    expect(historyResult.error).toBeUndefined()
    expect(historyResult.data?.data).toEqual([
      expect.objectContaining({
        operationType: 'STATE_WRITE',
        status: runtimeValidationParity.stateWritePass.status,
        result: runtimeValidationParity.stateWritePass.result,
        runtimePath: 'framework_state.sections.rvl_probe',
      }),
    ])

    const packageAfterCustomerValidation = await store.dispatch(
      runtimeControlApi.endpoints.getFrameworkPackage.initiate(packageId),
    )
    expect(packageAfterCustomerValidation.data?.data?.runtimeVerdict ?? null).toBeNull()

    const packageLevelValidationResult = await store.dispatch(
      runtimeControlApi.endpoints.validateRuntimeOperation.initiate({
        operationType: 'STATE_WRITE',
        packageId,
        frameworkKey: 'VMF',
        runtimePath: 'framework_state.sections.rvl_probe',
        skillRoleKey: 'VALIDATOR',
        isPackageLevelValidation: true,
      }),
    )

    expect(packageLevelValidationResult.error).toBeUndefined()

    const packageAfterPackageValidation = await store.dispatch(
      runtimeControlApi.endpoints.getFrameworkPackage.initiate(packageId, { forceRefetch: true }),
    )
    expect(packageAfterPackageValidation.data?.data?.runtimeVerdict).toEqual(expect.objectContaining({
      result: runtimeValidationParity.stateWritePass.result,
      auditPersisted: true,
      dependencyLockState: runtimeActivationParity.readinessReady.dependencyLockState,
    }))
  })

  it('blocks mock runtime mutations outside the skill role boundary', async () => {
    const store = createTestStore()

    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      runtimePaths: [
        {
          id: 'path-rvl-sections-blocked',
          pathKey: 'framework_state.sections.rvl_blocked',
          label: 'RVL Blocked Section',
          status: 'ACTIVE',
          frameworkKeys: ['VMF'],
          allowedOperations: ['READ', 'WRITE', 'BIND'],
          isProtected: false,
        },
        ...state.runtimePaths,
      ],
      skillRoles: [
        {
          id: 'role-rvl-validator',
          stableId: 'role-validator',
          roleKey: 'VALIDATOR',
          label: 'Validator',
          status: 'ACTIVE',
          allowedOperations: ['READ', 'WRITE', 'EXECUTE'],
          allowedReadScopes: ['framework_state.validation.*'],
          allowedWriteScopes: ['framework_state.validation.*'],
        },
        ...state.skillRoles,
      ],
    }))

    const createResult = await store.dispatch(
      runtimeControlApi.endpoints.createFrameworkPackage.initiate({
        frameworkKey: 'VMF',
        frameworkName: 'Value Management Framework',
        version: '9.9.4',
        packageKey: 'vmf-mock-rvl-994',
        status: 'DRAFT',
      }),
    )
    const packageId = createResult.data?.data?.id
    await store.dispatch(runtimeControlApi.endpoints.validateFrameworkPackage.initiate({ packageId }))

    const validationResult = await store.dispatch(
      runtimeControlApi.endpoints.validateRuntimeOperation.initiate({
        operationType: 'STATE_WRITE',
        packageId,
        frameworkKey: 'VMF',
        runtimePath: 'framework_state.sections.rvl_blocked',
        skillRoleKey: 'VALIDATOR',
        isPackageLevelValidation: true,
      }),
    )

    expect(validationResult.error?.status).toBe(runtimeValidationParity.scopeFailure.httpStatus)
    expect(validationResult.error?.data?.error?.code).toBe(runtimeValidationParity.scopeFailure.errorCode)
    expect(validationResult.error?.data?.error?.validation?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: runtimeValidationParity.scopeFailure.issueCode,
          source: runtimeValidationParity.scopeFailure.source,
        }),
      ]),
    )

    const packageAfterBlockedValidation = await store.dispatch(
      runtimeControlApi.endpoints.getFrameworkPackage.initiate(packageId, { forceRefetch: true }),
    )
    expect(packageAfterBlockedValidation.data?.data?.runtimeVerdict).toEqual(expect.objectContaining({
      result: 'BLOCK',
      dependencyLockState: 'NOT_LOCKED',
    }))
  })

  it('blocks mock runtime outputs with forbidden extra fields', async () => {
    const store = createTestStore()

    const validationResult = await store.dispatch(
      runtimeControlApi.endpoints.validateRuntimeOperation.initiate({
        operationType: 'OUTPUT_VALIDATION',
        frameworkKey: 'VMF',
        outputContract: {
          type: 'object',
          required: ['is_valid'],
          additionalProperties: false,
          properties: {
            is_valid: { type: 'boolean' },
          },
        },
        payload: { is_valid: true, unexpected: true },
      }),
    )

    expect(validationResult.error?.status).toBe(runtimeValidationParity.outputExtraFieldFailure.httpStatus)
    expect(validationResult.error?.data?.error?.code).toBe(runtimeValidationParity.outputExtraFieldFailure.errorCode)
    expect(validationResult.error?.data?.error?.validation?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: runtimeValidationParity.outputExtraFieldFailure.issueCode,
          path: runtimeValidationParity.outputExtraFieldFailure.path,
        }),
      ]),
    )
  })

  it('does not force mock mutation validation for output validation context paths', async () => {
    const store = createTestStore()

    const validationResult = await store.dispatch(
      runtimeControlApi.endpoints.validateRuntimeOperation.initiate({
        operationType: 'OUTPUT_VALIDATION',
        frameworkKey: 'VMF',
        runtimePath: 'framework_state.sections.unregistered_context',
        outputContract: {
          type: 'object',
          required: ['is_valid'],
          properties: {
            is_valid: { type: 'boolean' },
          },
        },
        payload: { is_valid: true },
      }),
    )

    expect(validationResult.error).toBeUndefined()
    expect(validationResult.data?.data?.status).toBe('PASS')
    expect(validationResult.data?.data?.result).toBe('ALLOW')
  })

  it('blocks mock framework package activation when the activation checkpoint fails', async () => {
    const store = createTestStore()

    const createResult = await store.dispatch(
      runtimeControlApi.endpoints.createFrameworkPackage.initiate({
        frameworkKey: 'VMF',
        frameworkName: 'Value Management Framework',
        version: '9.9.6',
        packageKey: 'vmf-mock-checkpoint-996',
        status: 'VALIDATED',
        validationBindings: [
          {
            bindingKey: 'missing-validation-on-submit',
            validationKey: 'missing-validation-check',
            trigger: 'ON_SUBMIT',
            blocking: true,
            priority: 100,
            enabled: true,
          },
        ],
      }),
    )
    expect(createResult.error).toBeUndefined()

    const activateResult = await store.dispatch(
      runtimeControlApi.endpoints.activateFrameworkPackage.initiate({
        packageId: createResult.data?.data?.id,
      }),
    )

    expect(activateResult.error?.status).toBe(422)
    expect(activateResult.error?.data?.error?.checkpoint?.status).toBe('FAIL')
    expect(activateResult.error?.data?.error?.details?.validationBindings).toContain('missing-validation-check')
  })

  it('keeps mock runtime activation readiness and deployment registration aligned with the live contract', async () => {
    const store = createTestStore()

    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      runtimeValidationAudits: (state.runtimeValidationAudits ?? []).filter((row) => row.packageId !== 'pkg-vmf-230'),
      frameworkPackages: state.frameworkPackages.map((pkg) =>
        pkg.id === 'pkg-vmf-230'
          ? {
              ...pkg,
              status: 'VALIDATED',
              versionStatus: 'VALIDATED',
              isDefault: false,
              dependencyLock: {
                status: 'PASS',
                snapshotId: 'dep-lock-vmf-230',
                snapshotHash: 'sha256-dep-lock-vmf-230',
                references: [{ collectionKey: 'RuntimePathRegistry', itemKey: 'framework_state.sections.customer_problem' }],
              },
              lastCheckpointStatus: 'PASS_WITH_WARNINGS',
              lastCheckpointResult: { status: 'PASS_WITH_WARNINGS', summary: { totalChecks: 1, passed: 1, warnings: 1, failed: 0 } },
              runtimeVerdict: {
                validationId: 'rvl-vmf-230',
                auditId: 'rvl-vmf-230',
                status: 'PASS',
                result: runtimeActivationParity.readinessReady.runtimeVerdictResult,
                mode: 'STRICT',
                lastValidatedAt: '2026-05-08T12:00:00.000Z',
                auditPersisted: true,
                dependencyLockState: runtimeActivationParity.readinessReady.dependencyLockState,
              },
            }
          : pkg,
      ),
    }))

    const readinessResult = await store.dispatch(
      runtimeControlApi.endpoints.getRuntimeActivationReadiness.initiate('pkg-vmf-230'),
    )

    expect(readinessResult.error).toBeUndefined()
    expect(readinessResult.data?.data).toEqual(expect.objectContaining({
      ready: true,
      status: runtimeActivationParity.readinessReady.status,
      dependencyLockState: runtimeActivationParity.readinessReady.dependencyLockState,
      checkpointStatus: 'PASS_WITH_WARNINGS',
    }))
    expect(readinessResult.data?.data?.runtimeVerdict).toEqual(expect.objectContaining({
      result: runtimeActivationParity.readinessReady.runtimeVerdictResult,
    }))

    const activateResult = await store.dispatch(
      runtimeControlApi.endpoints.activateFrameworkPackage.initiate({ packageId: 'pkg-vmf-230' }),
    )

    expect(activateResult.error).toBeUndefined()
    expect(activateResult.data?.data?.status).toBe('ACTIVE')
    const activationSnapshot = activateResult.data?.meta?.runtimeActivation?.activationSnapshot
    const deployment = activateResult.data?.meta?.runtimeActivation?.deployment
    expect(activationSnapshot).toEqual(expect.objectContaining({
      activationStatus: runtimeActivationParity.activationResult.activationStatus,
      tenantScope: runtimeActivationParity.activationResult.tenantScope,
      deploymentMode: runtimeActivationParity.activationResult.deploymentMode,
    }))
    expect(deployment).toEqual(expect.objectContaining({
      status: runtimeActivationParity.activationResult.deploymentStatus,
      tenantScope: runtimeActivationParity.activationResult.tenantScope,
      deploymentMode: runtimeActivationParity.activationResult.deploymentMode,
    }))
    for (const field of runtimeActivationParity.activationResult.evidenceIdentifierFields) {
      expect(activationSnapshot?.[field]).toEqual(expect.any(String))
      expect(activationSnapshot?.[field]).not.toHaveLength(0)
    }
    expect(activationSnapshot?.deploymentId).toBe(deployment?.deploymentId)
    expect(activationSnapshot?.dependencySnapshotId).toBe('dep-lock-vmf-230')
    expect(activationSnapshot?.dependencySnapshotHash).toBe('sha256-dep-lock-vmf-230')

    const deploymentsResult = await store.dispatch(runtimeControlApi.endpoints.listRuntimeDeployments.initiate())
    expect(deploymentsResult.error).toBeUndefined()
    expect(deploymentsResult.data?.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        packageId: 'pkg-vmf-230',
        status: runtimeActivationParity.activationResult.deploymentStatus,
      }),
    ]))

    const historyResult = await store.dispatch(
      runtimeControlApi.endpoints.getRuntimeActivationHistory.initiate('pkg-vmf-230'),
    )
    expect(historyResult.error).toBeUndefined()
    expect(historyResult.data?.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        packageId: 'pkg-vmf-230',
        deploymentId: deployment?.deploymentId,
        dependencySnapshotHash: 'sha256-dep-lock-vmf-230',
        activationStatus: runtimeActivationParity.activationResult.activationStatus,
      }),
    ]))
  })

  it('blocks mock runtime activation when the Runtime Validation verdict is missing', async () => {
    const store = createTestStore()

    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      runtimeValidationAudits: (state.runtimeValidationAudits ?? []).filter((row) => row.packageId !== 'pkg-vmf-230'),
      frameworkPackages: state.frameworkPackages.map((pkg) =>
        pkg.id === 'pkg-vmf-230'
          ? {
              ...pkg,
              status: 'VALIDATED',
              versionStatus: 'VALIDATED',
              dependencyLock: {
                status: 'PASS',
                snapshotId: 'dep-lock-vmf-230',
                references: [{ collectionKey: 'RuntimePathRegistry', itemKey: 'framework_state.sections.customer_problem' }],
              },
              lastCheckpointStatus: 'PASS',
              lastCheckpointResult: { status: 'PASS', summary: { totalChecks: 1, passed: 1, warnings: 0, failed: 0 } },
              runtimeVerdict: null,
            }
          : pkg,
      ),
    }))

    const readinessResult = await store.dispatch(
      runtimeControlApi.endpoints.getRuntimeActivationReadiness.initiate('pkg-vmf-230'),
    )
    expect(readinessResult.error).toBeUndefined()
    expect(readinessResult.data?.data?.ready).toBe(false)
    expect(readinessResult.data?.data?.blockingReasons).toContain(
      runtimeActivationParity.readinessBlockedRuntimeVerdictMissing.reason,
    )

    const activateResult = await store.dispatch(
      runtimeControlApi.endpoints.activateFrameworkPackage.initiate({ packageId: 'pkg-vmf-230' }),
    )

    expect(activateResult.error?.status).toBe(runtimeActivationParity.readinessBlockedRuntimeVerdictMissing.httpStatus)
    expect(activateResult.error?.data?.error?.code).toBe(
      runtimeActivationParity.readinessBlockedRuntimeVerdictMissing.errorCode,
    )
    expect(activateResult.error?.data?.error?.details?.reason).toBe(
      runtimeActivationParity.readinessBlockedRuntimeVerdictMissing.reason,
    )
  })

  it('blocks mock runtime activation when the Runtime Validation verdict blocks', async () => {
    const store = createTestStore()

    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      runtimeValidationAudits: (state.runtimeValidationAudits ?? []).filter((row) => row.packageId !== 'pkg-vmf-230'),
      frameworkPackages: state.frameworkPackages.map((pkg) =>
        pkg.id === 'pkg-vmf-230'
          ? {
              ...pkg,
              status: 'VALIDATED',
              versionStatus: 'VALIDATED',
              dependencyLock: {
                status: 'PASS',
                snapshotId: 'dep-lock-vmf-230',
                references: [{ collectionKey: 'RuntimePathRegistry', itemKey: 'framework_state.sections.customer_problem' }],
              },
              lastCheckpointStatus: 'PASS',
              lastCheckpointResult: { status: 'PASS', summary: { totalChecks: 1, passed: 1, warnings: 0, failed: 0 } },
              runtimeVerdict: {
                validationId: 'rvl-vmf-230-blocked',
                auditId: 'rvl-vmf-230-blocked',
                status: 'FAIL',
                result: 'BLOCK',
                mode: 'STRICT',
                lastValidatedAt: '2026-05-08T12:00:00.000Z',
                auditPersisted: true,
                dependencyLockState: 'LOCKED',
              },
            }
          : pkg,
      ),
    }))

    const activateResult = await store.dispatch(
      runtimeControlApi.endpoints.activateFrameworkPackage.initiate({ packageId: 'pkg-vmf-230' }),
    )

    expect(activateResult.error?.status).toBe(runtimeActivationParity.readinessBlockedRuntimeVerdictBlocked.httpStatus)
    expect(activateResult.error?.data?.error?.code).toBe(
      runtimeActivationParity.readinessBlockedRuntimeVerdictBlocked.errorCode,
    )
    expect(activateResult.error?.data?.error?.details?.reason).toBe(
      runtimeActivationParity.readinessBlockedRuntimeVerdictBlocked.reason,
    )
  })

  it('blocks mock runtime activation when the Runtime Validation verdict is not certified', async () => {
    const store = createTestStore()

    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      frameworkPackages: state.frameworkPackages.map((pkg) =>
        pkg.id === 'pkg-vmf-230'
          ? {
              ...pkg,
              status: 'VALIDATED',
              versionStatus: 'VALIDATED',
              dependencyLock: {
                status: 'PASS',
                snapshotId: 'dep-lock-vmf-230',
                references: [{ collectionKey: 'RuntimePathRegistry', itemKey: 'framework_state.sections.customer_problem' }],
              },
              lastCheckpointStatus: 'PASS',
              lastCheckpointResult: { status: 'PASS', summary: { totalChecks: 1, passed: 1, warnings: 0, failed: 0 } },
              runtimeVerdict: {
                validationId: 'rvl-vmf-230',
                auditId: 'rvl-vmf-230',
                status: 'PASS',
                result: 'ALLOW',
                mode: 'STRICT',
                lastValidatedAt: '2026-05-08T12:00:00.000Z',
                auditPersisted: false,
                dependencyLockState: 'LOCKED',
              },
            }
          : pkg,
      ),
    }))

    const activateResult = await store.dispatch(
      runtimeControlApi.endpoints.activateFrameworkPackage.initiate({ packageId: 'pkg-vmf-230' }),
    )

    expect(activateResult.error?.status).toBe(runtimeActivationParity.readinessBlockedRuntimeVerdictNotCertified.httpStatus)
    expect(activateResult.error?.data?.error?.details?.reason).toBe(
      runtimeActivationParity.readinessBlockedRuntimeVerdictNotCertified.reason,
    )
  })

  it('blocks mock runtime activation when the Runtime Validation verdict is stale', async () => {
    const store = createTestStore()

    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      frameworkPackages: state.frameworkPackages.map((pkg) =>
        pkg.id === 'pkg-vmf-230'
          ? {
              ...pkg,
              status: 'VALIDATED',
              versionStatus: 'VALIDATED',
              updatedAt: '2026-05-08T13:00:00.000Z',
              dependencyLock: {
                status: 'PASS',
                snapshotId: 'dep-lock-vmf-230',
                references: [{ collectionKey: 'RuntimePathRegistry', itemKey: 'framework_state.sections.customer_problem' }],
              },
              lastCheckpointStatus: 'PASS',
              lastCheckpointResult: { status: 'PASS', summary: { totalChecks: 1, passed: 1, warnings: 0, failed: 0 } },
              runtimeVerdict: {
                validationId: 'rvl-vmf-230',
                auditId: 'rvl-vmf-230',
                status: 'PASS',
                result: 'ALLOW',
                mode: 'STRICT',
                lastValidatedAt: '2026-05-08T12:00:00.000Z',
                auditPersisted: true,
                dependencyLockState: 'LOCKED',
              },
            }
          : pkg,
      ),
    }))

    const activateResult = await store.dispatch(
      runtimeControlApi.endpoints.activateFrameworkPackage.initiate({ packageId: 'pkg-vmf-230' }),
    )

    expect(activateResult.error?.status).toBe(runtimeActivationParity.readinessBlockedRuntimeVerdictStale.httpStatus)
    expect(activateResult.error?.data?.error?.details?.reason).toBe(
      runtimeActivationParity.readinessBlockedRuntimeVerdictStale.reason,
    )
  })

  it('blocks mock runtime activation when dependency lock evidence is missing', async () => {
    const store = createTestStore()

    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      runtimeValidationAudits: (state.runtimeValidationAudits ?? []).filter((row) => row.packageId !== 'pkg-vmf-230'),
      frameworkPackages: state.frameworkPackages.map((pkg) =>
        pkg.id === 'pkg-vmf-230'
          ? {
              ...pkg,
              status: 'VALIDATED',
              versionStatus: 'VALIDATED',
              dependencyLock: null,
              lastCheckpointStatus: 'PASS',
              lastCheckpointResult: { status: 'PASS', summary: { totalChecks: 1, passed: 1, warnings: 0, failed: 0 } },
              runtimeVerdict: {
                validationId: 'rvl-vmf-230',
                auditId: 'rvl-vmf-230',
                status: 'PASS',
                result: 'ALLOW',
                mode: 'STRICT',
                lastValidatedAt: '2026-05-08T12:00:00.000Z',
                auditPersisted: true,
                dependencyLockState: 'LOCKED',
              },
            }
          : pkg,
      ),
    }))

    const readinessResult = await store.dispatch(
      runtimeControlApi.endpoints.getRuntimeActivationReadiness.initiate('pkg-vmf-230'),
    )
    expect(readinessResult.error).toBeUndefined()
    expect(readinessResult.data?.data?.dependencyLockState).toBe(
      runtimeActivationParity.readinessBlockedDependencyLockMissing.dependencyLockState,
    )
    expect(readinessResult.data?.data?.blockingReasons).toContain(
      runtimeActivationParity.readinessBlockedDependencyLockMissing.reason,
    )

    const activateResult = await store.dispatch(
      runtimeControlApi.endpoints.activateFrameworkPackage.initiate({ packageId: 'pkg-vmf-230' }),
    )

    expect(activateResult.error?.status).toBe(runtimeActivationParity.readinessBlockedDependencyLockMissing.httpStatus)
    expect(activateResult.error?.data?.error?.code).toBe(
      runtimeActivationParity.readinessBlockedDependencyLockMissing.errorCode,
    )
    expect(activateResult.error?.data?.error?.details?.reason).toBe(
      runtimeActivationParity.readinessBlockedDependencyLockMissing.reason,
    )
  })

  it('supersedes the previous mock runtime deployment when activation registers a new deployment', async () => {
    const store = createTestStore()

    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      runtimeValidationAudits: (state.runtimeValidationAudits ?? []).filter((row) => row.packageId !== 'pkg-vmf-230'),
      runtimeDeployments: [
        {
          id: 'deployment-previous-id',
          deploymentId: 'deployment-vmf-global-production-previous',
          activationId: 'activation-vmf-2-3-0-previous',
          packageId: 'pkg-vmf-231',
          frameworkKey: 'VMF',
          frameworkVersion: '2.3.0',
          status: 'ACTIVE',
          tenantScope: runtimeActivationParity.activationResult.tenantScope,
          deploymentMode: runtimeActivationParity.activationResult.deploymentMode,
          registeredAt: '2026-05-01T12:00:00.000Z',
          registeredBy: 'sa-1',
        },
      ],
      runtimeActivationSnapshots: [
        {
          id: 'activation-previous-id',
          activationId: 'activation-vmf-2-3-0-previous',
          packageId: 'pkg-vmf-231',
          packageKey: 'vmf-2-3-0',
          frameworkKey: 'VMF',
          frameworkVersion: '2.3.0',
          activationStatus: 'ACTIVE',
          tenantScope: runtimeActivationParity.activationResult.tenantScope,
          deploymentMode: runtimeActivationParity.activationResult.deploymentMode,
        },
      ],
      frameworkPackages: state.frameworkPackages.map((pkg) =>
        pkg.id === 'pkg-vmf-230'
          ? {
              ...pkg,
              status: 'VALIDATED',
              versionStatus: 'VALIDATED',
              dependencyLock: {
                status: 'PASS',
                snapshotId: 'dep-lock-vmf-230',
                references: [{ collectionKey: 'RuntimePathRegistry', itemKey: 'framework_state.sections.customer_problem' }],
              },
              lastCheckpointStatus: 'PASS',
              lastCheckpointResult: { status: 'PASS', summary: { totalChecks: 1, passed: 1, warnings: 0, failed: 0 } },
              runtimeVerdict: {
                validationId: 'rvl-vmf-230',
                auditId: 'rvl-vmf-230',
                status: 'PASS',
                result: runtimeActivationParity.readinessReady.runtimeVerdictResult,
                mode: 'STRICT',
                lastValidatedAt: '2026-05-08T12:00:00.000Z',
                auditPersisted: true,
                dependencyLockState: runtimeActivationParity.readinessReady.dependencyLockState,
              },
            }
          : pkg,
      ),
    }))

    const activateResult = await store.dispatch(
      runtimeControlApi.endpoints.activateFrameworkPackage.initiate({ packageId: 'pkg-vmf-230' }),
    )

    expect(activateResult.error).toBeUndefined()
    expect(activateResult.data?.meta?.runtimeActivation?.readiness?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'activeDeployment',
        status: 'WARN',
        reason: runtimeActivationParity.supersession.readinessReason,
      }),
    ]))
    expect(activateResult.data?.meta?.runtimeActivation?.deployment?.deploymentId).not.toBe(
      'deployment-vmf-global-production-previous',
    )
    expect(activateResult.data?.meta?.runtimeActivation?.supersededDeployment).toEqual(expect.objectContaining({
      deploymentId: 'deployment-vmf-global-production-previous',
    }))

    const deploymentsResult = await store.dispatch(runtimeControlApi.endpoints.listRuntimeDeployments.initiate())
    expect(deploymentsResult.data?.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        deploymentId: 'deployment-vmf-global-production-previous',
        status: runtimeActivationParity.supersession.previousDeploymentStatus,
      }),
      expect.objectContaining({
        packageId: 'pkg-vmf-230',
        status: runtimeActivationParity.activationResult.deploymentStatus,
      }),
    ]))

    const previousPackageResult = await store.dispatch(
      runtimeControlApi.endpoints.getFrameworkPackage.initiate('pkg-vmf-231', { forceRefetch: true }),
    )
    expect(previousPackageResult.data?.data).toEqual(expect.objectContaining({
      id: 'pkg-vmf-231',
      status: 'ACTIVE',
      isDefault: false,
    }))

    const previousHistoryResult = await store.dispatch(
      runtimeControlApi.endpoints.getRuntimeActivationHistory.initiate('pkg-vmf-231'),
    )
    expect(previousHistoryResult.data?.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        activationId: 'activation-vmf-2-3-0-previous',
        activationStatus: runtimeActivationParity.supersession.previousActivationStatus,
      }),
    ]))
  })

  it('round-trips mock Runtime Path Registry CRUD, clone, dependencies, and lifecycle', async () => {
    const store = createTestStore()

    const createResult = await store.dispatch(
      runtimeControlApi.endpoints.createRuntimePath.initiate({
        pathKey: 'framework_state.custom.flag',
        label: 'Custom Flag',
        description: 'Custom boolean flag for runtime-control harness coverage.',
        frameworkKeys: ['VMF'],
        scope: 'FRAMEWORK_STATE',
        allowedOperations: ['READ', 'WRITE'],
        dataType: 'BOOLEAN',
        category: 'STATE',
        sourceType: 'RUNTIME_STATE',
        uiControl: 'CHECKBOX',
        isProtected: false,
        isSystem: false,
        defaultValue: false,
      }),
    )

    expect(createResult.error).toBeUndefined()
    expect(createResult.data?.data?.status).toBe('DRAFT')
    const pathId = createResult.data?.data?.id

    const getResult = await store.dispatch(
      runtimeControlApi.endpoints.getRuntimePath.initiate(pathId),
    )
    expect(getResult.error).toBeUndefined()
    expect(getResult.data?.data?.pathKey).toBe('framework_state.custom.flag')

    const updateResult = await store.dispatch(
      runtimeControlApi.endpoints.updateRuntimePath.initiate({
        pathId,
        label: 'Custom Runtime Flag',
        allowedValues: ['TRUE', 'FALSE'],
        allowedValueLabels: { TRUE: 'True', FALSE: 'False' },
        helpText: 'Used by the mock Runtime Path Registry editor harness.',
      }),
    )
    expect(updateResult.error).toBeUndefined()
    expect(updateResult.data?.data?.label).toBe('Custom Runtime Flag')
    expect(updateResult.data?.data?.allowedValues).toEqual(['TRUE', 'FALSE'])
    expect(updateResult.data?.data?.allowedValueLabels).toEqual({ TRUE: 'True', FALSE: 'False' })

    const cloneResult = await store.dispatch(
      runtimeControlApi.endpoints.cloneRuntimePath.initiate({
        pathId,
        pathKey: 'framework_state.custom.flag_copy',
        label: 'Custom Runtime Flag Copy',
      }),
    )
    expect(cloneResult.error).toBeUndefined()
    expect(cloneResult.data?.data?.isSystem).toBe(false)
    expect(cloneResult.data?.data?.componentVersion).toBe(2)
    expect(cloneResult.data?.data?.versionStatus).toBe('DRAFT')
    expect(cloneResult.data?.data?.isLocked).toBe(false)
    expect(cloneResult.data?.data?.lockedReason).toBeNull()
    expect(cloneResult.data?.data?.deprecatedInVersion).toBeNull()
    expect(cloneResult.data?.data?.lineageId).toBe(pathId)
    expect(cloneResult.data?.data?.clonedFromStableId).toBe(pathId)

    const dependencyResult = await store.dispatch(
      runtimeControlApi.endpoints.getRuntimePathDependencies.initiate(pathId),
    )
    expect(dependencyResult.error).toBeUndefined()
    expect(dependencyResult.data?.data?.dependencies?.summary?.total).toBe(0)

    const activateResult = await store.dispatch(
      runtimeControlApi.endpoints.activateRuntimePath.initiate({ pathId }),
    )
    expect(activateResult.error).toBeUndefined()
    expect(activateResult.data?.data?.status).toBe('ACTIVE')

    const disableResult = await store.dispatch(
      runtimeControlApi.endpoints.disableRuntimePath.initiate({ pathId }),
    )
    expect(disableResult.error).toBeUndefined()
    expect(disableResult.data?.data?.status).toBe('INACTIVE')

    const deprecateWithVersionResult = await store.dispatch(
      runtimeControlApi.endpoints.deprecateRuntimePath.initiate({
        pathId,
        deprecatedInVersion: '9.9.9',
      }),
    )
    expect(deprecateWithVersionResult.error).toBeUndefined()
    expect(deprecateWithVersionResult.data?.data?.status).toBe('DEPRECATED')
    expect(deprecateWithVersionResult.data?.data?.deprecatedInVersion).toBe('9.9.9')

    const preserveDeprecatedVersionResult = await store.dispatch(
      runtimeControlApi.endpoints.deprecateRuntimePath.initiate({ pathId }),
    )
    expect(preserveDeprecatedVersionResult.error).toBeUndefined()
    expect(preserveDeprecatedVersionResult.data?.data?.deprecatedInVersion).toBe('9.9.9')

    const clearDeprecatedVersionResult = await store.dispatch(
      runtimeControlApi.endpoints.deprecateRuntimePath.initiate({
        pathId,
        deprecatedInVersion: '',
      }),
    )
    expect(clearDeprecatedVersionResult.error).toBeUndefined()
    expect(clearDeprecatedVersionResult.data?.data?.deprecatedInVersion).toBeNull()
  })

  it('keeps mock Runtime Path clone and lock behavior aligned with live API', async () => {
    const store = createTestStore()

    const createResult = await store.dispatch(
      runtimeControlApi.endpoints.createRuntimePath.initiate({
        pathKey: 'framework_state.custom.locked_flag',
        label: 'Locked Flag',
        description: 'Custom flag used to verify locked mock behavior.',
        frameworkKeys: ['VMF'],
        scope: 'FRAMEWORK_STATE',
        allowedOperations: ['READ', 'WRITE'],
        dataType: 'BOOLEAN',
        category: 'STATE',
        sourceType: 'RUNTIME_STATE',
      }),
    )
    const pathId = createResult.data?.data?.id

    const invalidCloneResult = await store.dispatch(
      runtimeControlApi.endpoints.cloneRuntimePath.initiate({
        pathId,
        pathKey: 'framework_state.custom.locked_flag_clone',
        label: 'Locked Flag Clone',
        status: 'ACTIVE',
      }),
    )
    expect(invalidCloneResult.error?.status).toBe(422)
    expect(invalidCloneResult.error?.data?.error?.details?.status).toContain('DRAFT')

    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      runtimePaths: state.runtimePaths.map((row) =>
        row.id === pathId
          ? { ...row, isLocked: true, lockedByPackageKeys: ['vmf-2-3-1'] }
          : row,
      ),
    }))

    const lockedUpdateResult = await store.dispatch(
      runtimeControlApi.endpoints.updateRuntimePath.initiate({
        pathId,
        label: 'Edited Locked Flag',
      }),
    )
    expect(lockedUpdateResult.error?.status).toBe(409)
    expect(lockedUpdateResult.error?.data?.error?.details?.reason).toBe('RUNTIME_PATH_LOCKED')

    const lockedLifecycleResult = await store.dispatch(
      runtimeControlApi.endpoints.disableRuntimePath.initiate({ pathId, confirmDependencies: true }),
    )
    expect(lockedLifecycleResult.error?.status).toBe(409)
    expect(lockedLifecycleResult.error?.data?.error?.details?.reason).toBe('RUNTIME_PATH_LOCKED')
  })

  it('round-trips mock Validation Registry PDF follow-up fields', async () => {
    const store = createTestStore()

    const createResult = await store.dispatch(
      runtimeControlApi.endpoints.createValidationRegistry.initiate({
        key: 'manual-run-validation',
        label: 'Manual Run Validation',
        description: 'Validation used to test console-ready metadata.',
        status: 'ACTIVE',
        supportedFrameworkKeys: ['VMF'],
        category: 'QUALITY',
        severity: 'WARNING',
        producerSkillId: 'skill-snapshot',
        defaultAgentIds: ['agent-vmf-submit-validator-agent'],
        outputPath: 'framework_state.validation.required_sections',
        resultType: 'OBJECT',
        passFieldPath: 'framework_state.validation.required_sections.is_valid',
        detailsFieldPath: 'framework_state.validation.required_sections.missing_sections',
        policyUsable: true,
        packageUsable: true,
        requiresLatestRun: true,
        freshnessDefaultMinutes: 15,
        blockingDefault: false,
        warningOnlyDefault: true,
        allowManualRun: true,
        executionMode: 'QUEUED',
        version: 2,
      }),
    )

    expect(createResult.error).toBeUndefined()
    expect(createResult.data?.data?.allowManualRun).toBe(true)
    expect(createResult.data?.data?.executionMode).toBe('QUEUED')
    expect(createResult.data?.data?.version).toBe(2)

    const validationId = createResult.data?.data?.id
    const updateResult = await store.dispatch(
      runtimeControlApi.endpoints.updateValidationRegistry.initiate({
        validationId,
        allowManualRun: false,
        executionMode: 'ASYNC',
        version: 3,
      }),
    )

    expect(updateResult.error).toBeUndefined()
    expect(updateResult.data?.data?.allowManualRun).toBe(false)
    expect(updateResult.data?.data?.executionMode).toBe('ASYNC')
    expect(updateResult.data?.data?.version).toBe(3)
  })

  it('blocks mock disable/deprecate when active dependencies exist', async () => {
    const store = createTestStore()

    const disableResult = await store.dispatch(
      runtimeControlApi.endpoints.disableRuntimeAgent.initiate({ agentId: 'agent-validator' }),
    )

    expect(disableResult.error?.status).toBe(409)
    expect(disableResult.error?.data?.error?.details?.reason).toBe('RUNTIME_AGENT_DEPENDENCIES_ACTIVE')

    const deprecateResult = await store.dispatch(
      runtimeControlApi.endpoints.deprecateRuntimeAgent.initiate({ agentId: 'agent-validator' }),
    )

    expect(deprecateResult.error?.status).toBe(409)
    expect(deprecateResult.error?.data?.error?.details?.reason).toBe('RUNTIME_AGENT_DEPENDENCIES_ACTIVE')
  })

  it('allows mock disable/deprecate when only inactive dependencies exist', async () => {
    const store = createTestStore()

    const disableResult = await store.dispatch(
      runtimeControlApi.endpoints.disableRuntimeAgent.initiate({ agentId: 'agent-summary' }),
    )

    expect(disableResult.error).toBeUndefined()
    expect(disableResult.data?.data?.status).toBe('INACTIVE')

    const deprecateResult = await store.dispatch(
      runtimeControlApi.endpoints.deprecateRuntimeAgent.initiate({ agentId: 'agent-summary' }),
    )

    expect(deprecateResult.error).toBeUndefined()
    expect(deprecateResult.data?.data?.status).toBe('DEPRECATED')
  })

  it('blocks mock PATCH updates that attempt lifecycle status transitions', async () => {
    const store = createTestStore()

    const result = await store.dispatch(
      runtimeControlApi.endpoints.updateRuntimeAgent.initiate({
        agentId: 'agent-reporter',
        status: 'ACTIVE',
      }),
    )

    expect(result.error?.status).toBe(409)
    expect(result.error?.data?.error?.details?.reason).toBe('RUNTIME_AGENT_LIFECYCLE_ACTION_REQUIRED')
  })

  it('round-trips validation registry default agents and extended result fields in mock mode', async () => {
    const store = createTestStore()

    const createResult = await store.dispatch(
      runtimeControlApi.endpoints.createValidationRegistry.initiate({
        key: 'mock-default-agent-validation',
        label: 'Mock Default Agent Validation',
        description: 'Exercises validation registry extended metadata.',
        status: 'ACTIVE',
        supportedFrameworkKeys: ['VMF'],
        category: 'QUALITY',
        severity: 'WARNING',
        producerSkillId: 'skill-snapshot',
        defaultAgentIds: ['agent-vmf-submit-validator-agent'],
        outputPath: 'framework_state.validation.required_sections',
        resultType: 'OBJECT',
        passFieldPath: 'framework_state.validation.required_sections.is_valid',
        detailsFieldPath: 'framework_state.validation.required_sections.missing_sections',
        policyUsable: true,
        packageUsable: true,
        requiresLatestRun: true,
        freshnessDefaultMinutes: 45,
        blockingDefault: false,
        warningOnlyDefault: true,
      }),
    )

    expect(createResult.error).toBeUndefined()
    expect(createResult.data?.data?.defaultAgentIds).toEqual(['agent-vmf-submit-validator-agent'])
    expect(createResult.data?.data?.resultType).toBe('OBJECT')
    expect(createResult.data?.data?.requiresLatestRun).toBe(true)

    const updateResult = await store.dispatch(
      runtimeControlApi.endpoints.updateValidationRegistry.initiate({
        validationId: 'validation-mock-default-agent-validation',
        defaultAgentIds: ['agent-vmf-governance-validator-agent'],
        requiresLatestRun: false,
      }),
    )

    expect(updateResult.error).toBeUndefined()
    expect(updateResult.data?.data?.defaultAgentIds).toEqual(['agent-vmf-governance-validator-agent'])
    expect(updateResult.data?.data?.requiresLatestRun).toBe(false)
    expect(updateResult.data?.data?.resultType).toBe('OBJECT')
  })

  it('rejects unresolved default agents when mock validation-registry default agents are edited', async () => {
    const store = createTestStore()

    const result = await store.dispatch(
      runtimeControlApi.endpoints.updateValidationRegistry.initiate({
        validationId: 'validation-required-sections-check',
        defaultAgentIds: ['agent-missing-validator'],
      }),
    )

    expect(result.error?.status).toBe(422)
    expect(result.error?.data?.error?.details?.defaultAgentIds).toContain('agent-missing-validator')
    expect(result.error?.data?.error?.details?.defaultAgentIds).toContain('was not found')
  })

  it('returns validation registry dependency summaries with resolved default agents in mock mode', async () => {
    const store = createTestStore()

    const result = await store.dispatch(
      runtimeControlApi.endpoints.getValidationRegistryDependencies.initiate('validation-required-sections-check'),
    )

    expect(result.error).toBeUndefined()
    expect(result.data?.data?.defaultAgents).toEqual([
      expect.objectContaining({
        id: 'agent-vmf-submit-validator-agent',
        status: 'ACTIVE',
        compatibleWithValidation: true,
      }),
    ])
    expect(result.data?.data?.runtimePaths).toEqual([
      expect.objectContaining({ pathKey: 'framework_state.validation.required_sections' }),
      expect.objectContaining({ pathKey: 'framework_state.validation.required_sections.is_valid' }),
      expect.objectContaining({ pathKey: 'framework_state.validation.required_sections.missing_sections' }),
    ])
  })

  it('keeps mock Workflow Policy test-console behavior aligned with live API for framework_state-prefixed paths', async () => {
    const store = createTestStore()

    const result = await store.dispatch(
      runtimeControlApi.endpoints.testWorkflowPolicy.initiate({
        draft: {
          key: 'vmf-framework-state-console',
          name: 'VMF Framework State Console Policy',
          description: 'Exercises the framework_state test-console fallback.',
          status: 'ACTIVE',
          policyType: 'LIFECYCLE_GATE',
          priority: 25,
          frameworkKeys: ['VMF'],
          appliesTo: 'FRAMEWORK_LIFECYCLE',
          triggerEvent: 'ON_SUBMIT',
          triggerMode: 'PRE_ACTION',
          actorScope: 'USER',
          cooldownSeconds: 0,
          reevaluateOnRetry: false,
          governedAction: 'SUBMIT_FOR_REVIEW',
          decisionMode: 'REQUIRE_AGENT_EVALUATION',
          passMessage: 'Submission allowed.',
          failMessage: 'Submission blocked.',
          severity: 'BLOCKING',
          conditions: [{
            path: 'framework_state.lifecycle.stage',
            operator: '=',
            value: 'DRAFT',
            logic: 'AND',
          }],
          routingMode: 'FIXED_AGENT',
          primaryAgentId: 'agent-validator',
          fallbackAgentId: '',
          timeoutMs: 10000,
          retryOverride: '',
          requireSuccess: true,
          requiredValidationKeys: [],
          validationBlockingOnFail: true,
          validationWarningOnly: false,
          validationFreshnessMinutes: 30,
          validationRequireLatestRun: true,
          onPassEffects: [],
          onFailEffects: [],
          overrideAllowed: false,
          overrideRoles: [],
          approvalRequired: false,
          escalationRoleKey: '',
          escalationMessage: '',
          slaMinutes: 0,
          executionType: 'ORDERED_STEPS',
          steps: [{
            stepKey: 'validate',
            type: 'AGENT_EXECUTION',
            order: 1,
            agentId: 'agent-validator',
          }],
        },
        frameworkState: {
          lifecycle: {
            stage: 'DRAFT',
          },
        },
        triggerEvent: 'ON_SUBMIT',
        actorScope: 'USER',
      }),
    )

    expect(result.error).toBeUndefined()
    expect(result.data?.data?.conditionsMatched).toBe(true)
    expect(result.data?.data?.matchedConditions).toEqual([
      expect.objectContaining({
        path: 'framework_state.lifecycle.stage',
        actualValue: 'DRAFT',
        matched: true,
      }),
    ])
  })

  it('accepts wrapped framework_state payloads in the mock Workflow Policy test-console', async () => {
    const store = createTestStore()

    const result = await store.dispatch(
      runtimeControlApi.endpoints.testWorkflowPolicy.initiate({
        draft: {
          key: 'vmf-framework-state-console-wrapped',
          name: 'VMF Framework State Console Wrapped Policy',
          description: 'Exercises wrapped framework_state payloads.',
          status: 'ACTIVE',
          policyType: 'LIFECYCLE_GATE',
          priority: 25,
          frameworkKeys: ['VMF'],
          appliesTo: 'FRAMEWORK_LIFECYCLE',
          triggerEvent: 'ON_SUBMIT',
          triggerMode: 'PRE_ACTION',
          actorScope: 'USER',
          cooldownSeconds: 0,
          reevaluateOnRetry: false,
          governedAction: 'SUBMIT_FOR_REVIEW',
          decisionMode: 'REQUIRE_AGENT_EVALUATION',
          passMessage: 'Submission allowed.',
          failMessage: 'Submission blocked.',
          severity: 'BLOCKING',
          conditions: [{
            path: 'framework_state.lifecycle.stage',
            operator: '=',
            value: 'DRAFT',
            logic: 'AND',
          }],
          routingMode: 'FIXED_AGENT',
          primaryAgentId: 'agent-validator',
          fallbackAgentId: '',
          timeoutMs: 10000,
          retryOverride: '',
          requireSuccess: true,
          requiredValidationKeys: [],
          validationBlockingOnFail: true,
          validationWarningOnly: false,
          validationFreshnessMinutes: 30,
          validationRequireLatestRun: true,
          onPassEffects: [],
          onFailEffects: [],
          overrideAllowed: false,
          overrideRoles: [],
          approvalRequired: false,
          escalationRoleKey: '',
          escalationMessage: '',
          slaMinutes: 0,
          executionType: 'ORDERED_STEPS',
          steps: [{
            stepKey: 'validate',
            type: 'AGENT_EXECUTION',
            order: 1,
            agentId: 'agent-validator',
          }],
        },
        frameworkState: {
          framework_state: {
            lifecycle: {
              stage: 'DRAFT',
            },
          },
        },
        triggerEvent: 'ON_SUBMIT',
        actorScope: 'USER',
      }),
    )

    expect(result.error).toBeUndefined()
    expect(result.data?.data?.conditionsMatched).toBe(true)
    expect(result.data?.data?.matchedConditions).toEqual([
      expect.objectContaining({
        path: 'framework_state.lifecycle.stage',
        actualValue: 'DRAFT',
        matched: true,
      }),
    ])
  })

  it('does not fall back to the inner object when wrapped framework_state is explicitly null', async () => {
    const store = createTestStore()

    const result = await store.dispatch(
      runtimeControlApi.endpoints.testWorkflowPolicy.initiate({
        draft: {
          key: 'vmf-framework-state-console-null',
          name: 'VMF Framework State Console Null Policy',
          description: 'Documents explicit null framework_state behavior.',
          status: 'ACTIVE',
          policyType: 'LIFECYCLE_GATE',
          priority: 25,
          frameworkKeys: ['VMF'],
          appliesTo: 'FRAMEWORK_LIFECYCLE',
          triggerEvent: 'ON_SUBMIT',
          triggerMode: 'PRE_ACTION',
          actorScope: 'USER',
          cooldownSeconds: 0,
          reevaluateOnRetry: false,
          governedAction: 'SUBMIT_FOR_REVIEW',
          decisionMode: 'REQUIRE_AGENT_EVALUATION',
          passMessage: 'Submission allowed.',
          failMessage: 'Submission blocked.',
          severity: 'BLOCKING',
          conditions: [{
            path: 'framework_state.lifecycle.stage',
            operator: '=',
            value: 'DRAFT',
            logic: 'AND',
          }],
          routingMode: 'FIXED_AGENT',
          primaryAgentId: 'agent-validator',
          fallbackAgentId: '',
          timeoutMs: 10000,
          retryOverride: '',
          requireSuccess: true,
          requiredValidationKeys: [],
          validationBlockingOnFail: true,
          validationWarningOnly: false,
          validationFreshnessMinutes: 30,
          validationRequireLatestRun: true,
          onPassEffects: [],
          onFailEffects: [],
          overrideAllowed: false,
          overrideRoles: [],
          approvalRequired: false,
          escalationRoleKey: '',
          escalationMessage: '',
          slaMinutes: 0,
          executionType: 'ORDERED_STEPS',
          steps: [{
            stepKey: 'validate',
            type: 'AGENT_EXECUTION',
            order: 1,
            agentId: 'agent-validator',
          }],
        },
        frameworkState: {
          framework_state: null,
          lifecycle: {
            stage: 'DRAFT',
          },
        },
        triggerEvent: 'ON_SUBMIT',
        actorScope: 'USER',
      }),
    )

    expect(result.error).toBeUndefined()
    expect(result.data?.data?.conditionsMatched).toBe(false)
    expect(result.data?.data?.matchedConditions).toEqual([
      expect.objectContaining({
        path: 'framework_state.lifecycle.stage',
        actualValue: null,
        matched: false,
      }),
    ])
  })

  it('keeps array equality and non-framework_state literal paths working in the mock Workflow Policy test-console', async () => {
    const store = createTestStore()

    const result = await store.dispatch(
      runtimeControlApi.endpoints.testWorkflowPolicy.initiate({
        draft: {
          key: 'vmf-framework-state-console-arrays',
          name: 'VMF Framework State Console Array Policy',
          description: 'Exercises array equality and literal path lookups.',
          status: 'ACTIVE',
          policyType: 'LIFECYCLE_GATE',
          priority: 25,
          frameworkKeys: ['VMF'],
          appliesTo: 'FRAMEWORK_LIFECYCLE',
          triggerEvent: 'ON_SUBMIT',
          triggerMode: 'PRE_ACTION',
          actorScope: 'USER',
          cooldownSeconds: 0,
          reevaluateOnRetry: false,
          governedAction: 'SUBMIT_FOR_REVIEW',
          decisionMode: 'REQUIRE_AGENT_EVALUATION',
          passMessage: 'Submission allowed.',
          failMessage: 'Submission blocked.',
          severity: 'BLOCKING',
          conditions: [{
            path: 'framework_state.validation.required_sections.missing_sections',
            operator: '=',
            value: ['summary', 'goals'],
            logic: 'AND',
          }, {
            path: 'vmf.status',
            operator: '=',
            value: 'DRAFT',
            logic: 'AND',
          }],
          routingMode: 'FIXED_AGENT',
          primaryAgentId: 'agent-validator',
          fallbackAgentId: '',
          timeoutMs: 10000,
          retryOverride: '',
          requireSuccess: true,
          requiredValidationKeys: [],
          validationBlockingOnFail: true,
          validationWarningOnly: false,
          validationFreshnessMinutes: 30,
          validationRequireLatestRun: true,
          onPassEffects: [],
          onFailEffects: [],
          overrideAllowed: false,
          overrideRoles: [],
          approvalRequired: false,
          escalationRoleKey: '',
          escalationMessage: '',
          slaMinutes: 0,
          executionType: 'ORDERED_STEPS',
          steps: [{
            stepKey: 'validate',
            type: 'AGENT_EXECUTION',
            order: 1,
            agentId: 'agent-validator',
          }],
        },
        frameworkState: {
          validation: {
            required_sections: {
              missing_sections: ['summary', 'goals'],
            },
          },
          vmf: {
            status: 'DRAFT',
          },
        },
        triggerEvent: 'ON_SUBMIT',
        actorScope: 'USER',
      }),
    )

    expect(result.error).toBeUndefined()
    expect(result.data?.data?.conditionsMatched).toBe(true)
    expect(result.data?.data?.matchedConditions).toEqual([
      expect.objectContaining({
        path: 'framework_state.validation.required_sections.missing_sections',
        actualValue: ['summary', 'goals'],
        matched: true,
      }),
      expect.objectContaining({
        path: 'vmf.status',
        actualValue: 'DRAFT',
        matched: true,
      }),
    ])
  })

  it('uses mock Workflow Policy condition logic as the connector to the next row', async () => {
    const store = createTestStore()

    const result = await store.dispatch(
      runtimeControlApi.endpoints.testWorkflowPolicy.initiate({
        draft: {
          key: 'vmf-framework-state-console-or-connector',
          name: 'VMF Framework State Console OR Connector Policy',
          description: 'Exercises condition connector ordering.',
          status: 'ACTIVE',
          policyType: 'LIFECYCLE_GATE',
          priority: 25,
          frameworkKeys: ['VMF'],
          appliesTo: 'FRAMEWORK_LIFECYCLE',
          triggerEvent: 'ON_SUBMIT',
          triggerMode: 'PRE_ACTION',
          actorScope: 'USER',
          cooldownSeconds: 0,
          reevaluateOnRetry: false,
          governedAction: 'SUBMIT_FOR_REVIEW',
          decisionMode: 'REQUIRE_AGENT_EVALUATION',
          passMessage: 'Submission allowed.',
          failMessage: 'Submission blocked.',
          severity: 'BLOCKING',
          conditions: [{
            path: 'framework_state.lifecycle.stage',
            operator: '=',
            value: 'APPROVED',
            logic: 'OR',
          }, {
            path: 'framework_state.validation.required_sections.is_valid',
            operator: '=',
            value: true,
          }],
          routingMode: 'FIXED_AGENT',
          primaryAgentId: 'agent-validator',
          fallbackAgentId: '',
          timeoutMs: 10000,
          retryOverride: '',
          requireSuccess: true,
          requiredValidationKeys: [],
          validationBlockingOnFail: true,
          validationWarningOnly: false,
          validationFreshnessMinutes: 30,
          validationRequireLatestRun: true,
          onPassEffects: [],
          onFailEffects: [],
          overrideAllowed: false,
          overrideRoles: [],
          approvalRequired: false,
          escalationRoleKey: '',
          escalationMessage: '',
          slaMinutes: 0,
          executionType: 'ORDERED_STEPS',
          steps: [{
            stepKey: 'validate',
            type: 'AGENT_EXECUTION',
            order: 1,
            agentId: 'agent-validator',
          }],
        },
        frameworkState: {
          lifecycle: {
            stage: 'DRAFT',
          },
          validation: {
            required_sections: {
              is_valid: true,
            },
          },
        },
        triggerEvent: 'ON_SUBMIT',
        actorScope: 'USER',
      }),
    )

    expect(result.error).toBeUndefined()
    expect(result.data?.data?.conditionsMatched).toBe(true)
    expect(result.data?.data?.matchedConditions).toEqual([
      expect.objectContaining({
        path: 'framework_state.lifecycle.stage',
        matched: false,
        logic: 'OR',
      }),
      expect.objectContaining({
        path: 'framework_state.validation.required_sections.is_valid',
        actualValue: true,
        matched: true,
      }),
    ])
  })

  it.each([
    'gatingRules',
    'orderedSteps',
    'requiredAgentIds',
    'requiredSkillIds',
  ])('rejects deprecated Workflow Policy %s in the mock API', async (field) => {
    const store = createTestStore()

    const result = await store.dispatch(
      runtimeControlApi.endpoints.createWorkflowPolicy.initiate({
        body: { [field]: [] },
      }),
    )

    expect(result.error?.status).toBe(422)
    expect(result.error?.data?.error?.details?.[field]).toContain('deprecated')
  })

  it('keeps mock Workflow Policy skill-step validation aligned with the API', async () => {
    const store = createTestStore()

    const result = await store.dispatch(
      runtimeControlApi.endpoints.createWorkflowPolicy.initiate({
        body: {
          key: 'vmf-required-skill-parity',
          name: 'VMF Required Skill Parity',
          description: 'Ensures mock validation rejects inactive required skills for active policies.',
          status: 'ACTIVE',
          policyType: 'LIFECYCLE_GATE',
          priority: 10,
          frameworkKeys: ['VMF'],
          appliesTo: 'FRAMEWORK_LIFECYCLE',
          triggerEvent: 'ON_SUBMIT',
          triggerMode: 'PRE_ACTION',
          actorScope: 'USER',
          cooldownSeconds: 0,
          reevaluateOnRetry: false,
          governedAction: 'SUBMIT_FOR_REVIEW',
          decisionMode: 'REQUIRE_AGENT_EVALUATION',
          passMessage: 'Allowed.',
          failMessage: 'Blocked.',
          severity: 'BLOCKING',
          conditions: [],
          routingMode: 'FIXED_AGENT',
          primaryAgentId: 'agent-validator',
          fallbackAgentId: '',
          timeoutMs: 10000,
          retryOverride: '',
          requireSuccess: true,
          requiredValidationKeys: [],
          validationBlockingOnFail: true,
          validationWarningOnly: false,
          validationFreshnessMinutes: 30,
          validationRequireLatestRun: true,
          onPassEffects: [],
          onFailEffects: [],
          overrideAllowed: false,
          overrideRoles: [],
          approvalRequired: false,
          escalationRoleKey: '',
          escalationMessage: '',
          slaMinutes: 0,
          executionType: 'ORDERED_STEPS',
          steps: [{
            stepKey: 'review',
            type: 'SKILL_EXECUTION',
            order: 1,
            skillId: 'skill-report',
          }],
        },
      }),
    )

    expect(result.error?.status).toBe(422)
    expect(result.error?.data?.error?.details?.requiredSkillIds)
      .toBe('Active workflow policies cannot depend on only inactive runtime skill "skill-report".')
  })
})
