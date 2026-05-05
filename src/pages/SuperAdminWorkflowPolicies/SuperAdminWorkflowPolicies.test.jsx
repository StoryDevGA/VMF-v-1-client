import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import SuperAdminWorkflowPolicies from './SuperAdminWorkflowPolicies'
import SuperAdminWorkflowPolicyEditor from '../SuperAdminWorkflowPolicyEditor'
import {
  INITIAL_WORKFLOW_POLICY_FORM,
  WORKFLOW_POLICY_EXECUTION_TYPES,
  WORKFLOW_POLICY_STEP_TYPES,
  validateWorkflowPolicyForm,
} from './superAdminWorkflowPolicies.constants.js'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'
import { __mutateRuntimeControlApiStateForTests } from '../../store/api/runtimeControlApi.js'

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

  it('supports search, type filtering, framework filtering, and pagination', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyRoutes()

    expect(await screen.findByText(/page 1 of 2/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^last$/i }))
    expect(await screen.findByText(/page 2 of 2/i)).toBeInTheDocument()

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
})
