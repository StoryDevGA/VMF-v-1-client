import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SuperAdminWorkflowPolicies from '../SuperAdminWorkflowPolicies'
import SuperAdminWorkflowPolicyEditor from './SuperAdminWorkflowPolicyEditor'
import * as runtimeControlApiModule from '../../store/api/runtimeControlApi.js'
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

async function selectRuntimePath(user, { selector, label, query, optionName }) {
  const input = screen.getByLabelText(label, { selector })
  await user.click(input)
  await user.type(input, query)
  await user.click(await screen.findByRole('option', { name: optionName }))
  return input
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

  it('renders the workflow policy tabs in the authoring order from the rearrange-tabs feedback', () => {
    renderWorkflowPolicyEditorRoutes(['/super-admin/runtime-control/workflow-policies/new'])

    const tabTexts = screen.getAllByRole('tab').map((tab) => tab.textContent?.trim() ?? '')

    expect(tabTexts).toEqual([
      'Framework Compatibility',
      'Scope & Trigger',
      'Framework State Conditions',
      'Validation Requirements',
      'Action Governance',
      'Agent Routing',
      'Outcome & State Effects',
      'Escalation & Overrides',
      'Dependencies',
      'Audit & Versioning',
      'JSON / Diff',
      'Test Console',
    ])
  })

  it('explains the accepted FRAMEWORK_STATE JSON shapes in the test console', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyEditorRoutes(['/super-admin/runtime-control/workflow-policies/new'])

    await user.click(screen.getByRole('tab', { name: /test console/i }))

    expect(
      screen.getByText(/paste the framework_state object itself\. full sample payloads that already include top-level "framework_state" are also accepted\./i),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^sample framework_state object json$/i, {
        selector: 'textarea#workflow-policy-editor-test-framework-state',
      }).value,
    ).toContain('"framework_state"')
    expect(
      screen.getByLabelText(/^sample framework_state object json$/i, {
        selector: 'textarea#workflow-policy-editor-test-framework-state',
      }).value,
    ).toContain('"customerProblem"')
    expect(
      screen.getByLabelText(/^sample framework_state object json$/i, {
        selector: 'textarea#workflow-policy-editor-test-framework-state',
      }).value,
    ).toContain('"lifecycle"')
    expect(
      screen.getByLabelText(/^sample framework_state object json$/i, {
        selector: 'textarea#workflow-policy-editor-test-framework-state',
      }).value,
    ).toContain('"required_sections"')
    expect(
      screen.getByLabelText(/^sample framework_state object json$/i, {
        selector: 'textarea#workflow-policy-editor-test-framework-state',
      }).value,
    ).toContain('"missingSections"')
  })

  it('renders a summary-first workflow policy test result layout with evidence and trace detail', async () => {
    const user = userEvent.setup()
    const testWorkflowPolicySpy = vi
      .spyOn(runtimeControlApiModule, 'useTestWorkflowPolicyMutation')
      .mockReturnValue([
        () => ({
          unwrap: async () => ({
            data: {
              outcome: 'PASS',
              triggerMatched: true,
              actorMatched: true,
              conditionsMatched: true,
              matchedConditions: [
                {
                  path: 'framework_state.lifecycle.stage',
                  operator: '=',
                  expectedValue: 'DRAFT',
                  actualValue: 'DRAFT',
                  matched: true,
                },
              ],
              chosenAgent: {
                id: 'agent-validator',
                key: 'validator',
                name: 'VMF Submit Validator Agent',
              },
              stateEffectsPreview: {
                outcome: 'PASS',
                effects: [
                  {
                    type: 'SET_VALUE',
                    targetPath: 'framework_state.policy.last_result',
                    value: 'PASS',
                  },
                ],
              },
              executionTrace: [
                'Evaluating policy "VMF Submit Validator Agent" for governed action "SUBMIT_FOR_REVIEW".',
                'Selected governed Agent "validator" for routed execution.',
              ],
              warnings: ['Using fallback registry view.'],
            },
          }),
        }),
        { isLoading: false },
      ])

    renderWorkflowPolicyEditorRoutes([
      '/super-admin/runtime-control/workflow-policies/policy-vmf-publish/edit',
    ])

    await user.click(await screen.findByRole('tab', { name: /test console/i }))
    await user.click(screen.getByRole('button', { name: /run policy test/i }))

    expect(await screen.findByText(/policy would pass this evaluation path\./i)).toBeInTheDocument()
    expect(screen.getByText(/condition evidence/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /execution trace/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /warnings/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/using fallback registry view\./i)).toBeInTheDocument()

    testWorkflowPolicySpy.mockRestore()
  })

  it('surfaces backend field details when the test console returns a workflow policy validation error', async () => {
    const user = userEvent.setup()
    const testWorkflowPolicySpy = vi
      .spyOn(runtimeControlApiModule, 'useTestWorkflowPolicyMutation')
      .mockReturnValue([
        () => ({
          unwrap: async () => {
            throw {
              status: 422,
              data: {
                error: {
                  code: 'VALIDATION_FAILED',
                  message: 'Workflow policy test failed.',
                  details: {
                    conditions: 'Unknown condition runtime path "framework_state.validation.required_sections.missing_sections".',
                  },
                  requestId: 'mocumtpn-eiokvi',
                },
              },
            }
          },
        }),
        { isLoading: false },
      ])

    renderWorkflowPolicyEditorRoutes([
      '/super-admin/runtime-control/workflow-policies/policy-vmf-publish/edit',
    ])

    await user.click(await screen.findByRole('tab', { name: /test console/i }))
    await user.click(screen.getByRole('button', { name: /run policy test/i }))

    expect(
      await screen.findAllByText(/unknown condition runtime path "framework_state\.validation\.required_sections\.missing_sections"/i),
    ).toHaveLength(2)
    expect(screen.getByRole('tab', { name: /framework state conditions/i })).toHaveAttribute('aria-selected', 'true')

    testWorkflowPolicySpy.mockRestore()
  })

  it('shows a clear empty-state message when the selected frameworks have no compatible governed runtime paths', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyEditorRoutes(['/super-admin/runtime-control/workflow-policies/new'])

    await user.click(screen.getByRole('tab', { name: /framework compatibility/i }))
    await user.click(screen.getByRole('checkbox', { name: /customer messaging framework/i }))
    await user.click(screen.getByRole('tab', { name: /framework state conditions/i }))

    expect(
      screen.getByText(/no active readable framework_state\.\* runtime paths are currently registered for cmf/i),
    ).toBeInTheDocument()
  })

  it('offers validation-result framework_state paths as governed condition paths', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyEditorRoutes(['/super-admin/runtime-control/workflow-policies/new'])

    await user.click(screen.getByRole('tab', { name: /framework compatibility/i }))
    await user.click(screen.getByRole('checkbox', { name: /value messaging framework/i }))
    await user.click(screen.getByRole('tab', { name: /framework state conditions/i }))
    await user.click(screen.getByRole('button', { name: /add condition/i }))

    await selectRuntimePath(user, {
      selector: 'input#workflow-policy-editor-condition-path-0',
      label: /^path$/i,
      query: 'required sections',
      optionName: /framework_state\.validation\.required_sections\.is_valid/i,
    })

    expect(
      screen.getByLabelText(/^path$/i, {
        selector: 'input#workflow-policy-editor-condition-path-0',
      }),
    ).toHaveValue('')
    expect(screen.getByText('framework_state.validation.required_sections.is_valid')).toBeInTheDocument()
  })

  it('shows logic only between condition rows', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyEditorRoutes(['/super-admin/runtime-control/workflow-policies/new'])

    await user.click(screen.getByRole('tab', { name: /framework state conditions/i }))
    await user.click(screen.getByRole('button', { name: /add condition/i }))

    expect(screen.queryByLabelText(/^logic$/i)).not.toBeInTheDocument()
    expect(screen.getByText(/final condition/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add condition/i }))

    expect(
      screen.getByLabelText(/^logic$/i, {
        selector: 'select#workflow-policy-editor-condition-logic-0',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/^logic$/i, {
      selector: 'select#workflow-policy-editor-condition-logic-1',
    })).not.toBeInTheDocument()
    expect(screen.getByText(/final condition/i)).toBeInTheDocument()
  })

  it('hides the effect value input when the selected action does not need a value', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyEditorRoutes(['/super-admin/runtime-control/workflow-policies/new'])

    await user.click(screen.getByRole('tab', { name: /outcome & state effects/i }))
    await user.click(screen.getAllByRole('button', { name: /add effect/i })[0])
    await user.selectOptions(
      screen.getByLabelText(/^action$/i, {
        selector: 'select#workflow-policy-editor-onPassEffects-type-0',
      }),
      'BLOCK_ACTION',
    )

    expect(
      screen.queryByLabelText(/^value$/i, {
        selector: '#workflow-policy-editor-onPassEffects-value-0',
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/no value required for this action/i)).toBeInTheDocument()
  })

  it('renders boolean effect values as yes-no choices from runtime path metadata', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyEditorRoutes(['/super-admin/runtime-control/workflow-policies/new'])

    await user.click(screen.getByRole('tab', { name: /framework compatibility/i }))
    await user.click(screen.getByRole('checkbox', { name: /value messaging framework/i }))
    await user.click(screen.getByRole('tab', { name: /outcome & state effects/i }))
    await user.click(screen.getAllByRole('button', { name: /add effect/i })[0])
    await user.selectOptions(
      screen.getByLabelText(/^action$/i, {
        selector: 'select#workflow-policy-editor-onPassEffects-type-0',
      }),
      'SET_VALUE',
    )
    await selectRuntimePath(user, {
      selector: 'input#workflow-policy-editor-onPassEffects-path-0',
      label: /^target path$/i,
      query: 'locked',
      optionName: /framework_state\.lifecycle\.locked/i,
    })

    const valueGroup = screen.getByRole('radiogroup', { name: /^value$/i })
    const yesOption = within(valueGroup).getByRole('radio', { name: /yes/i })
    const noOption = within(valueGroup).getByRole('radio', { name: /no/i })

    expect(noOption).toHaveAttribute('aria-checked', 'true')
    await user.click(yesOption)
    expect(yesOption).toHaveAttribute('aria-checked', 'true')
  })

  it('lets the validation requirements selector find ACTIVE policy-usable validations for the selected frameworks', async () => {
    const user = userEvent.setup()
    renderWorkflowPolicyEditorRoutes([
      '/super-admin/runtime-control/workflow-policies/policy-vmf-publish/edit',
    ])

    await user.click(await screen.findByRole('tab', { name: /validation requirements/i }))

    const validationInput = screen.getByLabelText(/^required validations$/i, {
      selector: 'input#workflow-policy-editor-validation-key',
    })

    await user.click(validationInput)
    await user.type(validationInput, 'required')

    const resultsList = await screen.findByRole('listbox', { name: /validation results/i })
    expect(await within(resultsList).findByText(/required sections check/i)).toBeInTheDocument()
    expect(await within(resultsList).findByText(/required-sections-check/i)).toBeInTheDocument()
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

    await user.click(screen.getByRole('tab', { name: /framework state conditions/i }))
    await user.click(screen.getByRole('button', { name: /add condition/i }))
    await selectRuntimePath(user, {
      selector: 'input#workflow-policy-editor-condition-path-0',
      label: /^path$/i,
      query: 'stage',
      optionName: /framework_state\.lifecycle\.stage/i,
    })
    await user.selectOptions(
      screen.getByLabelText(/^operator$/i, {
        selector: 'select#workflow-policy-editor-condition-operator-0',
      }),
      '=',
    )
    await user.selectOptions(
      screen.getByLabelText(/^value$/i, {
        selector: 'select#workflow-policy-editor-condition-value-0',
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

    await user.click(screen.getByRole('tab', { name: /outcome & state effects/i }))
    await user.click(screen.getAllByRole('button', { name: /add effect/i })[0])
    await user.selectOptions(
      screen.getByLabelText(/^action$/i, {
        selector: 'select#workflow-policy-editor-onPassEffects-type-0',
      }),
      'SET_VALUE',
    )
    await selectRuntimePath(user, {
      selector: 'input#workflow-policy-editor-onPassEffects-path-0',
      label: /^target path$/i,
      query: 'last validated',
      optionName: /vmf\.metadata\.lastValidatedAt/i,
    })
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
      screen.getByLabelText(/^escalate to role$/i, {
        selector: 'select#workflow-policy-editor-escalation-role',
      }),
      'CUSTOMER_ADMIN',
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
    expect(await screen.findByText(/policy would pass this evaluation path\./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /execution trace/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /workflow policies/i })).toBeInTheDocument()
      expect(screen.getByText('VMF Release Gate')).toBeInTheDocument()
    })
  })

  it('warns before leaving the editor with unsaved changes', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    renderWorkflowPolicyEditorRoutes([
      '/super-admin/runtime-control/workflow-policies/policy-vmf-publish/edit',
    ])

    const nameInput = await screen.findByLabelText(/^workflow policy name$/i, {
      selector: 'input#workflow-policy-editor-name',
    })
    await user.clear(nameInput)
    await user.type(nameInput, 'VMF Unsaved Gate')

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(confirmSpy).toHaveBeenCalledWith('Discard unsaved workflow policy changes?')
    expect(screen.getByRole('heading', { name: /basic information/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /workflow policies/i })).toBeInTheDocument()
    })

    confirmSpy.mockRestore()
  })
})
