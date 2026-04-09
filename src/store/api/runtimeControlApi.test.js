import { beforeEach, describe, expect, it } from 'vitest'
import {
  runtimeControlApi,
  buildRuntimeControlDetailRequest,
  buildRuntimeControlListRequest,
  buildRuntimeControlMutationRequest,
  useCreateFrameworkRegistryMutation,
  useActivateFrameworkPackageMutation,
  useCreateFrameworkPackageMutation,
  useCreateRuntimeAgentMutation,
  useCreateRuntimeSkillMutation,
  useCreateWorkflowPolicyMutation,
  useGetFrameworkRegistryQuery,
  useGetFrameworkPackageQuery,
  useGetRuntimeAgentQuery,
  useGetRuntimeSkillQuery,
  useGetWorkflowPolicyQuery,
  useListFrameworkRegistriesQuery,
  useListFrameworkPackagesQuery,
  useListRuntimeAgentsQuery,
  useListRuntimeSkillsQuery,
  useListWorkflowPoliciesQuery,
  useUpdateFrameworkRegistryMutation,
  useUpdateFrameworkPackageMutation,
  useUpdateRuntimeAgentMutation,
  useUpdateRuntimeSkillMutation,
  useUpdateWorkflowPolicyMutation,
} from './runtimeControlApi.js'

describe('runtimeControlApi', () => {
  beforeEach(() => {
    globalThis.__RUNTIME_CONTROL_API_MOCK__ = true
  })

  it('exposes Runtime Control endpoints', () => {
    expect(runtimeControlApi.endpoints).toHaveProperty('listFrameworkRegistries')
    expect(runtimeControlApi.endpoints).toHaveProperty('createFrameworkRegistry')
    expect(runtimeControlApi.endpoints).toHaveProperty('getFrameworkRegistry')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateFrameworkRegistry')
    expect(runtimeControlApi.endpoints).toHaveProperty('listFrameworkPackages')
    expect(runtimeControlApi.endpoints).toHaveProperty('createFrameworkPackage')
    expect(runtimeControlApi.endpoints).toHaveProperty('getFrameworkPackage')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateFrameworkPackage')
    expect(runtimeControlApi.endpoints).toHaveProperty('activateFrameworkPackage')
    expect(runtimeControlApi.endpoints).toHaveProperty('listRuntimeAgents')
    expect(runtimeControlApi.endpoints).toHaveProperty('createRuntimeAgent')
    expect(runtimeControlApi.endpoints).toHaveProperty('getRuntimeAgent')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateRuntimeAgent')
    expect(runtimeControlApi.endpoints).toHaveProperty('listRuntimeSkills')
    expect(runtimeControlApi.endpoints).toHaveProperty('createRuntimeSkill')
    expect(runtimeControlApi.endpoints).toHaveProperty('getRuntimeSkill')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateRuntimeSkill')
    expect(runtimeControlApi.endpoints).toHaveProperty('listWorkflowPolicies')
    expect(runtimeControlApi.endpoints).toHaveProperty('createWorkflowPolicy')
    expect(runtimeControlApi.endpoints).toHaveProperty('getWorkflowPolicy')
    expect(runtimeControlApi.endpoints).toHaveProperty('updateWorkflowPolicy')
  })

  it('exports query hooks', () => {
    expect(typeof useListFrameworkRegistriesQuery).toBe('function')
    expect(typeof useGetFrameworkRegistryQuery).toBe('function')
    expect(typeof useListFrameworkPackagesQuery).toBe('function')
    expect(typeof useGetFrameworkPackageQuery).toBe('function')
    expect(typeof useListRuntimeAgentsQuery).toBe('function')
    expect(typeof useGetRuntimeAgentQuery).toBe('function')
    expect(typeof useListRuntimeSkillsQuery).toBe('function')
    expect(typeof useGetRuntimeSkillQuery).toBe('function')
    expect(typeof useListWorkflowPoliciesQuery).toBe('function')
    expect(typeof useGetWorkflowPolicyQuery).toBe('function')
  })

  it('exports mutation hooks', () => {
    expect(typeof useCreateFrameworkRegistryMutation).toBe('function')
    expect(typeof useUpdateFrameworkRegistryMutation).toBe('function')
    expect(typeof useCreateFrameworkPackageMutation).toBe('function')
    expect(typeof useUpdateFrameworkPackageMutation).toBe('function')
    expect(typeof useActivateFrameworkPackageMutation).toBe('function')
    expect(typeof useCreateRuntimeAgentMutation).toBe('function')
    expect(typeof useUpdateRuntimeAgentMutation).toBe('function')
    expect(typeof useCreateRuntimeSkillMutation).toBe('function')
    expect(typeof useUpdateRuntimeSkillMutation).toBe('function')
    expect(typeof useCreateWorkflowPolicyMutation).toBe('function')
    expect(typeof useUpdateWorkflowPolicyMutation).toBe('function')
  })

  it('registers query and mutation initiators for each Runtime Control resource', () => {
    expect(typeof runtimeControlApi.endpoints.listFrameworkRegistries.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.createFrameworkRegistry.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getFrameworkRegistry.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateFrameworkRegistry.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.listFrameworkPackages.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.createFrameworkPackage.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getFrameworkPackage.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateFrameworkPackage.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.activateFrameworkPackage.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.listRuntimeAgents.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.createRuntimeAgent.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getRuntimeAgent.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateRuntimeAgent.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.listRuntimeSkills.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.createRuntimeSkill.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getRuntimeSkill.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateRuntimeSkill.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.listWorkflowPolicies.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.createWorkflowPolicy.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.getWorkflowPolicy.initiate).toBe('function')
    expect(typeof runtimeControlApi.endpoints.updateWorkflowPolicy.initiate).toBe('function')
  })

  it('builds live framework package requests with step-up headers for protected mutations', () => {
    expect(
      buildRuntimeControlListRequest({
        resourcePath: 'framework-packages',
        page: 2,
        pageSize: 20,
        q: 'vmf',
        status: 'ACTIVE',
        frameworkKey: 'vmf',
        defaultPageSize: 4,
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-packages',
      params: {
        page: 2,
        pageSize: 20,
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
      buildRuntimeControlMutationRequest({
        resourcePath: 'framework-packages',
        entityId: 'pkg-live-2',
        method: 'PATCH',
        body: { version: '3.1.1' },
        stepUpToken: 'step-up-token',
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-packages/pkg-live-2',
      method: 'PATCH',
      body: { version: '3.1.1' },
      headers: { 'X-Step-Up-Token': 'step-up-token' },
    })

    expect(
      buildRuntimeControlMutationRequest({
        resourcePath: 'framework-packages',
        entityId: 'pkg-live-2',
        method: 'POST',
        body: null,
        stepUpToken: 'step-up-token',
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-packages/pkg-live-2',
      method: 'POST',
      body: null,
      headers: { 'X-Step-Up-Token': 'step-up-token' },
    })
  })

  it('builds live framework registry requests with type filters and step-up headers for protected mutations', () => {
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
        stepUpToken: 'step-up-token',
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/framework-registry/framework-vmf',
      method: 'PATCH',
      body: { name: 'Value Messaging Framework' },
      headers: { 'X-Step-Up-Token': 'step-up-token' },
    })
  })

  it('builds live workflow policy requests with step-up headers for protected mutations', () => {
    expect(
      buildRuntimeControlListRequest({
        resourcePath: 'workflow-policies',
        page: 1,
        pageSize: 20,
        q: '',
        status: '',
        frameworkKey: '',
        defaultPageSize: 4,
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/workflow-policies',
      params: {
        page: 1,
        pageSize: 20,
      },
    })

    expect(
      buildRuntimeControlMutationRequest({
        resourcePath: 'workflow-policies',
        method: 'POST',
        body: { key: 'vmf-review' },
        stepUpToken: 'step-up-token',
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/workflow-policies',
      method: 'POST',
      body: { key: 'vmf-review' },
      headers: { 'X-Step-Up-Token': 'step-up-token' },
    })

    expect(
      buildRuntimeControlMutationRequest({
        resourcePath: 'workflow-policies',
        entityId: 'policy-live-1',
        method: 'PATCH',
        body: { name: 'VMF Release Policy' },
        stepUpToken: 'step-up-token',
      }),
    ).toEqual({
      url: '/super-admin/runtime-control/workflow-policies/policy-live-1',
      method: 'PATCH',
      body: { name: 'VMF Release Policy' },
      headers: { 'X-Step-Up-Token': 'step-up-token' },
    })
  })
})
