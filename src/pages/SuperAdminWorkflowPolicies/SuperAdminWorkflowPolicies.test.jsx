import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import SuperAdminWorkflowPolicies from './SuperAdminWorkflowPolicies'
import SuperAdminWorkflowPolicyEditor from '../SuperAdminWorkflowPolicyEditor'
import {
  cloneWorkflowPolicy,
  INITIAL_WORKFLOW_POLICY_FORM,
  mapWorkflowPolicyToForm,
  WORKFLOW_POLICY_APPLIES_TO_OPTIONS,
  WORKFLOW_POLICY_GOVERNED_ACTION_OPTIONS,
  WORKFLOW_POLICY_EXECUTION_TYPES,
  WORKFLOW_POLICY_STEP_TYPES,
  WORKFLOW_POLICY_TRIGGER_EVENT_OPTIONS,
  WORKFLOW_POLICY_TYPE_OPTIONS,
  validateWorkflowPolicyForm,
} from './superAdminWorkflowPolicies.constants.js'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'
import { __mutateRuntimeControlApiStateForTests } from '../../store/api/runtimeControlApi.js'

const testDirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(testDirname, '../../../..')
const apiWorkflowPolicyModelPath = path.join(
  workspaceRoot,
  'VMF-v-1-api/src/models/WorkflowPolicy.js',
)

const loadBackendWorkflowPolicySnapshot = () => {
  const script = `
const workflowPolicyModel = await import(${JSON.stringify(pathToFileURL(apiWorkflowPolicyModelPath).href)})
process.stdout.write(JSON.stringify({
  governedActions: Object.values(workflowPolicyModel.WORKFLOW_POLICY_GOVERNED_ACTIONS),
  policyTypes: Object.values(workflowPolicyModel.WORKFLOW_POLICY_TYPES),
  appliesTo: Object.values(workflowPolicyModel.WORKFLOW_POLICY_APPLIES_TO),
}))
`

  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: workspaceRoot,
      encoding: 'utf8',
    }),
  )
}

function renderWorkflowPolicyRoutes(initialEntries = ['/super-admin/runtime-control/workflow-policies']) {
  return renderRuntimeControlPage({
    route: '/super-admin/runtime-control/workflow-policies',
    path: '/super-admin/runtime-control/workflow-policies',
    element: <SuperAdminWorkflowPolicies />,
    initialEntries,
    routes: [
      {
        path: '/super-admin/runtime-control/workflow-policies',
        element: <SuperAdminWorkflowPolicies />,
      },
      {
        path: '/super-admin/runtime-control/workflow-policies/new',
        element: <SuperAdminWorkflowPolicyEditor />,
      },
      {
        path: '/super-admin/runtime-control/workflow-policies/:policyId/edit',
        element: <SuperAdminWorkflowPolicyEditor />,
      },
    ],
  })
}

function addWorkflowPolicyPaginationFixtures() {
  __mutateRuntimeControlApiStateForTests((state) => ({
    ...state,
    workflowPolicies: [
      ...state.workflowPolicies,
      ...Array.from({ length: 15 }, (_, index) => ({
        ...state.workflowPolicies[0],
        id: `policy-pagination-${index + 1}`,
        key: `pagination-policy-${index + 1}`,
        name: `Pagination Policy ${index + 1}`,
        description: 'Pagination coverage fixture.',
        policyType: 'VALIDATION',
        frameworkKeys: ['VMF'],
        updatedAt: `2026-04-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`,
      })),
    ],
  }))
}

describe('SuperAdminWorkflowPolicies page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('renders the catalogue-first workflow policies page and routes create into the dedicated editor', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyRoutes()

    expect(screen.getByRole('heading', { name: /workflow policies/i })).toBeInTheDocument()
    expect(screen.getByText(/govern runtime decisions, lifecycle gates/i)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /workflow policies/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByRole('heading', { name: /create workflow policy/i })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^workflow policy key$/i, {
        selector: 'input#workflow-policy-editor-key',
      }),
    ).toBeInTheDocument()
  })

  it('keeps the governed action registry aligned with runtime action sprints', () => {
    const optionValues = WORKFLOW_POLICY_GOVERNED_ACTION_OPTIONS.map((option) => option.value)

    expect(optionValues).toEqual(loadBackendWorkflowPolicySnapshot().governedActions)
  })

  it('keeps policy type and applies-to options aligned with the backend model', () => {
    const snapshot = loadBackendWorkflowPolicySnapshot()

    expect(WORKFLOW_POLICY_TYPE_OPTIONS.map((option) => option.value).filter(Boolean))
      .toEqual(snapshot.policyTypes)
    expect(WORKFLOW_POLICY_APPLIES_TO_OPTIONS.map((option) => option.value).filter(Boolean))
      .toEqual(snapshot.appliesTo)
  })

  it('keeps trigger event options aligned with section generation events', () => {
    const optionValues = WORKFLOW_POLICY_TRIGGER_EVENT_OPTIONS.map((option) => option.value)

    expect(optionValues).toEqual(expect.arrayContaining([
      'ON_MARK_READY',
      'ON_SECTION_GENERATE',
      'ON_SECTION_REGENERATE',
      'ON_LOCK',
    ]))
  })

  it('supports search, type filtering, framework filtering, and pagination', async () => {
    const user = userEvent.setup()
    addWorkflowPolicyPaginationFixtures()
    renderWorkflowPolicyRoutes()

    expect(await screen.findByText(/page 1 of 3/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^last$/i }))
    expect(await screen.findByText(/page 3 of 3/i)).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(/^policy type$/i, {
        selector: 'select#workflow-policy-type-filter',
      }),
      'ROUTING',
    )

    await waitFor(() => {
      expect(screen.getByText('RLD Routing Draft')).toBeInTheDocument()
      expect(screen.queryByText('VMF Publish Policy')).not.toBeInTheDocument()
    })

    await user.selectOptions(
      screen.getByLabelText(/^framework$/i, {
        selector: 'select#workflow-policy-framework-filter',
      }),
      'RLD',
    )

    await user.type(
      screen.getByLabelText(/^search$/i, {
        selector: 'input#workflow-policy-search',
      }),
      'routing',
    )

    await waitFor(() => {
      expect(screen.getByText('RLD Routing Draft')).toBeInTheDocument()
      expect(screen.queryByText('RLD Publish Policy')).not.toBeInTheDocument()
    })
  })

  it('routes row edit actions into the dedicated editor', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyRoutes()

    await user.selectOptions(
      await screen.findByLabelText(/actions for vmf publish policy/i),
      'Edit',
    )

    expect(await screen.findByRole('heading', { name: /workflow policy editor/i })).toBeInTheDocument()
    expect(
      await screen.findByLabelText(/^workflow policy name$/i, {
        selector: 'input#workflow-policy-editor-name',
      }),
    ).toHaveValue('VMF Publish Policy')
  })

  it('shows version and lock state, and routes locked rows through clone only', async () => {
    const user = userEvent.setup()
    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      workflowPolicies: state.workflowPolicies.map((policy) =>
        policy.key === 'vmf-publish'
          ? {
              ...policy,
              componentVersion: 3,
              versionStatus: 'ACTIVE',
              isLocked: true,
              lockedByPackageKeys: ['vmf-package-1'],
            }
          : policy,
      ),
    }))

    renderWorkflowPolicyRoutes()

    const policyRow = (await screen.findByText('VMF Publish Policy')).closest('tr')
    expect(policyRow).not.toBeNull()
    expect(within(policyRow).getByText('v3')).toBeInTheDocument()
    expect(within(policyRow).getByText('ACTIVE')).toBeInTheDocument()
    expect(within(policyRow).getByText('Locked')).toBeInTheDocument()

    const actions = within(policyRow).getByLabelText(/actions for vmf publish policy/i)
    expect(within(actions).queryByRole('option', { name: 'Edit' })).not.toBeInTheDocument()
    expect(within(actions).getByRole('option', { name: 'Clone' })).toBeInTheDocument()

    await user.selectOptions(actions, 'Clone')

    expect(await screen.findByRole('heading', { name: /clone workflow policy/i })).toBeInTheDocument()
    expect(
      await screen.findByLabelText(/^workflow policy key$/i, {
        selector: 'input#workflow-policy-editor-key',
      }),
    ).toHaveValue('')
    expect(
      screen.getByLabelText(/^workflow policy name$/i, {
        selector: 'input#workflow-policy-editor-name',
      }),
    ).toHaveValue('VMF Publish Policy Clone')
  })

  it('updates a workflow policy status from the row action menu', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyRoutes()

    await user.selectOptions(
      await screen.findByLabelText(/actions for vmf publish policy/i),
      'Set Inactive',
    )

    await waitFor(() => {
      const policyRow = screen.getByText('VMF Publish Policy').closest('tr')
      expect(policyRow).not.toBeNull()
      expect(within(policyRow).getByText(/inactive/i)).toBeInTheDocument()
    })
  })

  it('validates governed event step keys before submit', () => {
    const baseForm = {
      ...INITIAL_WORKFLOW_POLICY_FORM,
      key: 'qa-workflow-policy',
      name: 'QA Workflow Policy',
      priority: '100',
      frameworkKeys: ['VMF'],
      triggerEvent: 'ON_SUBMIT',
      governedAction: 'SUBMIT_FOR_REVIEW',
      executionType: WORKFLOW_POLICY_EXECUTION_TYPES.ORDERED_STEPS,
      steps: [
        {
          stepKey: 'emit-complete',
          type: WORKFLOW_POLICY_STEP_TYPES.EVENT_EMIT,
          order: '1',
          eventKey: 'qa.workflow.policy.step.completed',
          blocking: true,
        },
      ],
    }

    expect(validateWorkflowPolicyForm(baseForm).errors.steps).toBe(
      'Event step "emit-complete" event key must use letters, numbers, or hyphens.',
    )

    expect(validateWorkflowPolicyForm({
      ...baseForm,
      steps: [
        {
          ...baseForm.steps[0],
          eventKey: 'qa-workflow-policy-step-completed',
        },
      ],
    }).errors.steps).toBeUndefined()
  })

  it('validates runtime hardening rules before submit', () => {
    const baseForm = {
      ...INITIAL_WORKFLOW_POLICY_FORM,
      key: 'qa-workflow-policy',
      name: 'QA Workflow Policy',
      priority: '100',
      frameworkKeys: ['VMF'],
      triggerEvent: 'ON_SUBMIT',
      governedAction: 'SUBMIT_FOR_REVIEW',
    }

    expect(validateWorkflowPolicyForm({
      ...baseForm,
      timeoutMs: '0',
    }).errors.timeoutMs).toBe('Timeout Override must be between 1 and 300000 milliseconds.')

    expect(validateWorkflowPolicyForm({
      ...baseForm,
      timeoutMs: '',
    }).payload.timeoutMs).toBeNull()
    expect(mapWorkflowPolicyToForm({
      key: 'qa-null-timeout',
      name: 'QA Null Timeout',
      timeoutMs: null,
    }).timeoutMs).toBe('')

    expect(validateWorkflowPolicyForm({
      ...baseForm,
      policyType: 'LIFECYCLE_GATE',
      severity: 'INFO',
      overrideAllowed: true,
      overrideRoles: ['SUPER_ADMIN'],
      approvalRequired: true,
      escalationRoleKey: 'FRAMEWORK_OWNER',
      slaMinutes: '15',
    }).errors.severity).toBe('Approval-required lifecycle gates must use Warning, Critical, or Blocking severity.')

    expect(validateWorkflowPolicyForm({
      ...baseForm,
      executionType: WORKFLOW_POLICY_EXECUTION_TYPES.SINGLE_STEP,
      steps: [],
      decisionMode: 'REQUIRE_APPROVAL',
    }).errors.steps).toBe('Single-step policies without governed steps are only allowed for Allow decisions.')
  })

  it('keeps Workflow Policy compatibility fields derived from canonical or legacy source data', () => {
    const formResult = validateWorkflowPolicyForm({
      ...INITIAL_WORKFLOW_POLICY_FORM,
      key: 'qa-derived-contract',
      name: 'QA Derived Contract',
      frameworkKeys: ['VMF'],
      triggerEvent: 'ON_SUBMIT',
      governedAction: 'SUBMIT_FOR_REVIEW',
      executionType: WORKFLOW_POLICY_EXECUTION_TYPES.ORDERED_STEPS,
      steps: [{
        stepKey: 'validate',
        type: WORKFLOW_POLICY_STEP_TYPES.AGENT_EXECUTION,
        order: '1',
        agentId: 'agent-validator',
        blocking: true,
      }],
    })

    expect(formResult.payload).not.toHaveProperty('orderedSteps')
    expect(formResult.payload).not.toHaveProperty('requiredAgentIds')
    expect(formResult.payload).not.toHaveProperty('requiredSkillIds')
    expect(cloneWorkflowPolicy({
      key: 'legacy-policy',
      name: 'Legacy Policy',
      steps: [],
      orderedSteps: ['legacy-step'],
      requiredAgentIds: ['agent-validator'],
      requiredSkillIds: ['skill-review'],
    })).toMatchObject({
      orderedSteps: ['legacy-step'],
      requiredAgentIds: ['agent-validator'],
      requiredSkillIds: ['skill-review'],
    })
  })
})
