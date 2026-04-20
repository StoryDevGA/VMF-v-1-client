import { describe, expect, it } from 'vitest'
import {
  cloneRuntimeAgent,
  mapRuntimeAgentToForm,
  validateRuntimeAgentForm,
} from './superAdminAgents.constants.js'

describe('superAdminAgents.constants', () => {
  it('normalizes legacy scalar execution-plan path values when cloning agents', () => {
    const agent = cloneRuntimeAgent({
      key: 'legacy-agent',
      executionPlan: [
        {
          skillId: 'skill-snapshot',
          readsFrom: 'vmf.sections.icp',
          writesTo: 'runtime.validationResult',
        },
      ],
    })

    expect(agent.executionPlan).toEqual([
      {
        skillId: 'skill-snapshot',
        readsFrom: ['vmf.sections.icp'],
        writesTo: ['runtime.validationResult'],
      },
    ])
  })

  it('preserves legacy scalar execution-plan path values when mapping to the editor form', () => {
    const form = mapRuntimeAgentToForm({
      key: 'legacy-agent',
      executionPlan: [
        {
          skillId: 'skill-snapshot',
          description: 'Capture baseline state.',
          readsFrom: 'vmf.sections.icp',
          writesTo: 'runtime.validationResult',
        },
      ],
      promptConfig: {},
      inputContract: {},
      outputContract: {},
      policies: {},
    })

    expect(form.executionPlan).toEqual([
      {
        skillId: 'skill-snapshot',
        description: 'Capture baseline state.',
        readsFrom: ['vmf.sections.icp'],
        writesTo: ['runtime.validationResult'],
      },
    ])
  })

  it('emits normalized array payloads for legacy scalar execution-plan path values', () => {
    const result = validateRuntimeAgentForm(
      {
        key: 'legacy-agent',
        name: 'Legacy Agent',
        description: '',
        status: 'ACTIVE',
        agentType: 'EXECUTION',
        supportedFrameworkKeys: 'VMF',
        requiredSkillRoleKeys: '',
        defaultSkillIds: 'skill-snapshot',
        primarySkillIds: '',
        optionalSkillIds: '',
        executionPlan: [
          {
            skillId: 'skill-snapshot',
            description: '',
            readsFrom: 'vmf.sections.icp',
            writesTo: 'runtime.validationResult',
          },
        ],
        promptBaseSystem: '',
        promptRole: '',
        developerInstructions: '',
        outputContractPrompt: '',
        forbiddenActionsPrompt: '',
        handoffPrompt: '',
        inputContractJson: '{}',
        outputContractJson: '{}',
        policyMaxTokenBudget: '',
        policyTimeoutMs: '',
        policyRetryPolicy: '',
      },
      [],
      '',
      [],
      [],
      [],
    )

    expect(result.errors).toEqual({})
    expect(result.payload.executionPlan).toEqual([
      {
        skillId: 'skill-snapshot',
        description: '',
        readsFrom: ['vmf.sections.icp'],
        writesTo: ['runtime.validationResult'],
      },
    ])
  })
})
