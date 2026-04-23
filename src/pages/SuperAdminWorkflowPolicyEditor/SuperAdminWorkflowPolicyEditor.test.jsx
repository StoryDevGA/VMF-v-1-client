import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import SuperAdminWorkflowPolicies from '../SuperAdminWorkflowPolicies'
import SuperAdminWorkflowPolicyEditor from './SuperAdminWorkflowPolicyEditor'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'

function renderWorkflowPolicyEditorRoutes(initialEntries) {
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

describe('SuperAdminWorkflowPolicyEditor page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('uses the agent-style review-missing-fields flow for create validation', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyEditorRoutes(['/super-admin/runtime-control/workflow-policies/new'])

    expect(screen.getByRole('heading', { name: /basic information/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /review missing fields/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create workflow policy/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /review missing fields/i }))

    expect(await screen.findByText(/workflow policy key is required/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByLabelText(/^workflow policy key$/i, {
          selector: 'input#workflow-policy-editor-key',
        }),
      ).toHaveFocus()
    })
    expect(screen.queryByRole('tab', { name: /overview/i })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /framework compatibility .*validation errors/i })).toBeInTheDocument()
  })

  it('shows a clear empty-state message when the selected frameworks have no compatible governed runtime paths', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyEditorRoutes(['/super-admin/runtime-control/workflow-policies/new'])

    await user.click(screen.getByRole('tab', { name: /framework compatibility/i }))
    await user.click(screen.getByRole('checkbox', { name: /customer messaging framework/i }))
    await user.click(screen.getByRole('tab', { name: /framework_state conditions/i }))

    expect(
      screen.getByText(/no active framework_state runtime paths are currently registered for cmf/i),
    ).toBeInTheDocument()
  })

  it('creates a workflow policy from the dedicated editor and returns to the catalogue', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyEditorRoutes(['/super-admin/runtime-control/workflow-policies/new'])

    await user.type(
      screen.getByLabelText(/^workflow policy key$/i, {
        selector: 'input#workflow-policy-editor-key',
      }),
      'vmf-stage-gate',
    )
    await user.type(
      screen.getByLabelText(/^workflow policy name$/i, {
        selector: 'input#workflow-policy-editor-name',
      }),
      'VMF Stage Gate',
    )

    await user.click(screen.getByRole('tab', { name: /framework compatibility/i }))
    await user.click(screen.getByRole('checkbox', { name: /value messaging framework/i }))
    await user.click(screen.getByRole('tab', { name: /scope & trigger/i }))
    await user.selectOptions(
      screen.getByLabelText(/^trigger event$/i, {
        selector: 'select#workflow-policy-editor-trigger-event',
      }),
      'ON_STAGE_CHANGE',
    )
    await user.click(screen.getByRole('tab', { name: /action governance/i }))
    await user.selectOptions(
      screen.getByLabelText(/^governed action$/i, {
        selector: 'select#workflow-policy-editor-governed-action',
      }),
      'APPROVE',
    )
    await user.selectOptions(
      screen.getByLabelText(/^decision mode$/i, {
        selector: 'select#workflow-policy-editor-decision-mode',
      }),
      'REQUIRE_AGENT_EVALUATION',
    )

    await user.click(screen.getByRole('tab', { name: /framework_state conditions/i }))
    await user.click(screen.getByRole('button', { name: /add condition/i }))
    await user.selectOptions(
      screen.getByLabelText(/^path$/i, {
        selector: 'select#workflow-policy-editor-condition-path-0',
      }),
      'vmf.status',
    )
    await user.selectOptions(
      screen.getByLabelText(/^operator$/i, {
        selector: 'select#workflow-policy-editor-condition-operator-0',
      }),
      '=',
    )
    await user.type(
      screen.getByLabelText(/^value$/i, {
        selector: 'input#workflow-policy-editor-condition-value-0',
      }),
      'DRAFT',
    )

    await user.click(screen.getByRole('tab', { name: /agent routing/i }))
    await user.selectOptions(
      screen.getByLabelText(/^routing mode$/i, {
        selector: 'select#workflow-policy-editor-routing-mode',
      }),
      'FIXED_AGENT',
    )
    await user.selectOptions(
      screen.getByLabelText(/^primary agent$/i, {
        selector: 'select#workflow-policy-editor-primary-agent',
      }),
      'agent-validator',
    )

    await user.click(screen.getByRole('tab', { name: /validation requirements/i }))
    await user.type(
      screen.getByLabelText(/^required validation key$/i, {
        selector: 'input#workflow-policy-editor-validation-key',
      }),
      'required-sections-check',
    )
    await user.click(screen.getByRole('button', { name: /add validation key/i }))

    await user.click(screen.getByRole('tab', { name: /outcome \/ state effects/i }))
    await user.click(screen.getAllByRole('button', { name: /add effect/i })[0])
    await user.selectOptions(
      screen.getByLabelText(/^action$/i, {
        selector: 'select#workflow-policy-editor-onPassEffects-type-0',
      }),
      'SET_VALUE',
    )
    await user.selectOptions(
      screen.getByLabelText(/^target path$/i, {
        selector: 'select#workflow-policy-editor-onPassEffects-path-0',
      }),
      'vmf.metadata.lastValidatedAt',
    )
    await user.type(
      screen.getByLabelText(/^value$/i, {
        selector: 'input#workflow-policy-editor-onPassEffects-value-0',
      }),
      'REVIEW_READY',
    )

    await user.click(screen.getByRole('tab', { name: /escalation & overrides/i }))
    await user.click(screen.getByLabelText(/^override allowed$/i))
    await user.click(screen.getByLabelText(/^approval required$/i))
    await user.click(screen.getByRole('checkbox', { name: /super admin/i }))
    await user.selectOptions(
      screen.getByLabelText(/^escalate to$/i, {
        selector: 'select#workflow-policy-editor-escalate-to',
      }),
      'GOVERNANCE_LEAD',
    )
    await user.clear(
      screen.getByLabelText(/^sla minutes$/i, {
        selector: 'input#workflow-policy-editor-sla-minutes',
      }),
    )
    await user.type(
      screen.getByLabelText(/^sla minutes$/i, {
        selector: 'input#workflow-policy-editor-sla-minutes',
      }),
      '45',
    )
    await user.type(
      screen.getByLabelText(/^escalation message$/i, {
        selector: 'textarea#workflow-policy-editor-escalation-message',
      }),
      'Escalate blocked review overrides to governance.',
    )

    await user.click(screen.getByRole('button', { name: /create workflow policy/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /workflow policies/i })).toBeInTheDocument()
      expect(screen.getByText('VMF Stage Gate')).toBeInTheDocument()
    })
  }, 15000)

  it('loads an existing workflow policy, saves edits, and returns to the catalogue', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyEditorRoutes([
      '/super-admin/runtime-control/workflow-policies/policy-vmf-publish/edit',
    ])

    const nameInput = await screen.findByLabelText(/^workflow policy name$/i, {
      selector: 'input#workflow-policy-editor-name',
    })

    await user.click(screen.getByRole('tab', { name: /dependencies/i }))
    expect(await screen.findByText(/read-only impact view/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /audit & versioning/i }))
    expect(screen.getByText(/^version$/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /escalation & overrides/i }))
    expect(screen.getByLabelText(/^override allowed$/i)).toBeChecked()
    expect(screen.getByLabelText(/^approval required$/i)).toBeChecked()
    expect(
      screen.getByLabelText(/^escalation message$/i, {
        selector: 'textarea#workflow-policy-editor-escalation-message',
      }).value,
    ).toContain('Escalate blocked publish overrides to governance before release sign-off.')

    await user.clear(nameInput)
    await user.type(nameInput, 'VMF Release Gate')
    expect(nameInput).toHaveValue('VMF Release Gate')

    await user.click(screen.getByRole('tab', { name: /json \/ diff/i }))
    expect(await screen.findByText(/visual diff summary/i)).toBeInTheDocument()
    expect(screen.getByText(/^name$/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /test console/i }))
    await user.click(screen.getByRole('button', { name: /run policy test/i }))
    expect(await screen.findByText(/^pass$/i)).toBeInTheDocument()
    expect(screen.getByText(/execution trace/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /workflow policies/i })).toBeInTheDocument()
      expect(screen.getByText('VMF Release Gate')).toBeInTheDocument()
    })
  })
})
