import { describe, expect, it } from 'vitest'
import {
  runtimeControlApi,
  useActivateFrameworkPackageMutation,
  useCreateFrameworkPackageMutation,
  useCreateRuntimeAgentMutation,
  useCreateRuntimeSkillMutation,
  useCreateWorkflowPolicyMutation,
  useGetFrameworkPackageQuery,
  useGetRuntimeAgentQuery,
  useGetRuntimeSkillQuery,
  useGetWorkflowPolicyQuery,
  useListFrameworkPackagesQuery,
  useListRuntimeAgentsQuery,
  useListRuntimeSkillsQuery,
  useListWorkflowPoliciesQuery,
  useUpdateFrameworkPackageMutation,
  useUpdateRuntimeAgentMutation,
  useUpdateRuntimeSkillMutation,
  useUpdateWorkflowPolicyMutation,
} from './runtimeControlApi.js'

describe('runtimeControlApi', () => {
  it('exposes Runtime Control endpoints', () => {
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
})
