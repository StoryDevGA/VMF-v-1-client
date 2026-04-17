import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminSkills from '../SuperAdminSkills'
import SuperAdminSkillEditor from './SuperAdminSkillEditor'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'

function renderSkillEditor(route) {
  return renderRuntimeControlPage({
    route,
    routes: [
      {
        path: '/super-admin/runtime-control/skills',
        element: <SuperAdminSkills />,
      },
      {
        path: '/super-admin/runtime-control/skills/new',
        element: <SuperAdminSkillEditor />,
      },
      {
        path: '/super-admin/runtime-control/skills/:skillId',
        element: <SuperAdminSkillEditor />,
      },
    ],
  })
}

describe('SuperAdminSkillEditor page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('creates a runtime skill from the dedicated page flow', async () => {
    const user = userEvent.setup()
    renderSkillEditor('/super-admin/runtime-control/skills/new')

    expect(screen.getByRole('heading', { name: /^create skill$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^skill classification$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^framework compatibility$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^input \/ output contract$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^optional configuration$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^reference assets$/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /^dependency visibility$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /review missing fields/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create skill/i })).not.toBeInTheDocument()
    expect(screen.getByRole('tablist').parentElement).toHaveClass('tabview--sm')
    expect(screen.getByRole('heading', { name: /^framework compatibility$/i })).toBeInTheDocument()

    await user.clear(
      screen.getByLabelText(/^skill key$/i, {
        selector: 'input#runtime-skill-editor-key',
      }),
    )
    await user.type(
      screen.getByLabelText(/^skill key$/i, {
        selector: 'input#runtime-skill-editor-key',
      }),
      'alignment',
    )
    await user.clear(
      screen.getByLabelText(/^skill name$/i, {
        selector: 'input#runtime-skill-editor-name',
      }),
    )
    await user.type(
      screen.getByLabelText(/^skill name$/i, {
        selector: 'input#runtime-skill-editor-name',
      }),
      'Alignment',
    )
    await user.clear(
      screen.getByLabelText(/^description$/i, {
        selector: 'textarea#runtime-skill-editor-description',
      }),
    )
    await user.type(
      screen.getByLabelText(/^description$/i, {
        selector: 'textarea#runtime-skill-editor-description',
      }),
      'Captures alignment checks for runtime control approvals.',
    )
    await user.click(screen.getByRole('tab', { name: /^framework compatibility$/i }))
    await user.click(screen.getByRole('button', { name: /remove rld/i }))
    await user.click(screen.getByRole('button', { name: /remove vmf/i }))
    await user.selectOptions(
      screen.getByLabelText(/^add framework$/i, {
        selector: 'select#runtime-skill-editor-framework-select',
      }),
      'VMF',
    )
    await user.click(screen.getByRole('button', { name: /^add framework$/i }))
    expect(screen.getByText('VMF - Value Messaging Framework')).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(/^category$/i, {
        selector: 'select#runtime-skill-editor-category',
      }),
      'SNAPSHOT',
    )
    await user.selectOptions(
      screen.getByLabelText(/^type$/i, {
        selector: 'select#runtime-skill-editor-type',
      }),
      'HYBRID',
    )
    await user.selectOptions(
      screen.getByLabelText(/^execution mode$/i, {
        selector: 'select#runtime-skill-editor-execution-mode',
      }),
      'RULE_ENGINE',
    )

    await user.click(screen.getByRole('tab', { name: /^input \/ output contract$/i }))
    expect(screen.getByRole('heading', { name: /input \/ output contract/i })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^execution config/i, {
        selector: 'textarea#runtime-skill-editor-execution-config',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^allowed read paths$/i, {
        selector: 'textarea#runtime-skill-editor-allowed-read-paths',
      }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^optional configuration$/i }))
    expect(screen.getByRole('heading', { name: /optional configuration/i })).toBeInTheDocument()

    const timeoutInput = screen.getByLabelText(/^timeout/i, {
      selector: 'input#runtime-skill-editor-timeout',
    })
    await user.clear(timeoutInput)
    await user.type(timeoutInput, '3000')

    await user.selectOptions(
      screen.getByLabelText(/^retry policy$/i, {
        selector: 'select#runtime-skill-editor-retry-policy',
      }),
      'RETRY_ONCE',
    )

    expect(screen.getByRole('button', { name: /create skill/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /create skill/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^skills$/i })).toBeInTheDocument()
    })
    expect(screen.getByText('Alignment')).toBeInTheDocument()
    expect(screen.getByText('alignment')).toBeInTheDocument()
  })

  it('only offers active frameworks in the compatibility dropdown', async () => {
    const user = userEvent.setup()
    renderSkillEditor('/super-admin/runtime-control/skills/new')

    await user.click(screen.getByRole('tab', { name: /^framework compatibility$/i }))
    await user.click(screen.getByRole('button', { name: /remove vmf/i }))
    await user.click(screen.getByRole('button', { name: /remove rld/i }))

    const frameworkSelect = screen.getByLabelText(/^add framework$/i, {
      selector: 'select#runtime-skill-editor-framework-select',
    })

    expect(frameworkSelect).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'VMF - Value Messaging Framework' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'RLD - Revenue Lifecycle Design' })).toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: 'CMF - Customer Messaging Framework' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: 'QMF - Quality Messaging Framework' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: 'OPS - Operations Messaging Framework' }),
    ).not.toBeInTheDocument()
  })

  it('updates an existing runtime skill from the dedicated edit page flow', async () => {
    const user = userEvent.setup()
    renderSkillEditor('/super-admin/runtime-control/skills/skill-snapshot')

    expect(await screen.findByRole('heading', { name: /^skill editor$/i })).toBeInTheDocument()

    const categorySelect = await screen.findByLabelText(/^category$/i, {
      selector: 'select#runtime-skill-editor-category',
    })
    expect(categorySelect).toHaveValue('SNAPSHOT')

    const executionModeSelect = screen.getByLabelText(/^execution mode$/i, {
      selector: 'select#runtime-skill-editor-execution-mode',
    })
    expect(executionModeSelect).toHaveValue('SYSTEM')

    const nameInput = await screen.findByLabelText(/^skill name$/i, {
      selector: 'input#runtime-skill-editor-name',
    })
    await user.clear(nameInput)
    await user.type(nameInput, 'State Snapshot')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^skills$/i })).toBeInTheDocument()
    })
    expect(screen.getByText('State Snapshot')).toBeInTheDocument()
  })

  it('shows validation error for invalid JSON in contract fields', async () => {
    const user = userEvent.setup()
    renderSkillEditor('/super-admin/runtime-control/skills/new')

    await user.type(
      screen.getByLabelText(/^skill key$/i, {
        selector: 'input#runtime-skill-editor-key',
      }),
      'test-skill',
    )
    await user.type(
      screen.getByLabelText(/^skill name$/i, {
        selector: 'input#runtime-skill-editor-name',
      }),
      'Test Skill',
    )

    await user.click(screen.getByRole('tab', { name: /^input \/ output contract$/i }))
    const inputContractTextarea = screen.getByLabelText(/^input contract$/i, {
      selector: 'textarea#runtime-skill-editor-input-contract',
    })
    await user.type(inputContractTextarea, '{{invalid json')
    expect(screen.queryByRole('button', { name: /create skill/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /review missing fields/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: '' })).toHaveTextContent('Invalid JSON.')
    })
  })

  it('enforces a single output binding mode by disabling the non-selected field', async () => {
    const user = userEvent.setup()
    renderSkillEditor('/super-admin/runtime-control/skills/new')

    await user.type(
      screen.getByLabelText(/^skill key$/i, {
        selector: 'input#runtime-skill-editor-key',
      }),
      'check-required-vmf-sections',
    )
    await user.type(
      screen.getByLabelText(/^skill name$/i, {
        selector: 'input#runtime-skill-editor-name',
      }),
      'Check Required VMF Sections',
    )

    await user.click(screen.getByRole('tab', { name: /^input \/ output contract$/i }))

    expect(
      screen.getByLabelText(/^output binding mode$/i, {
        selector: 'select#runtime-skill-editor-output-binding-mode',
      }),
    ).toHaveValue('NONE')

    await user.selectOptions(
      screen.getByLabelText(/^output binding mode$/i, {
        selector: 'select#runtime-skill-editor-output-binding-mode',
      }),
      'PRIMARY',
    )

    expect(
      screen.getByLabelText(/^output binding mode$/i, {
        selector: 'select#runtime-skill-editor-output-binding-mode',
      }),
    ).toHaveValue('PRIMARY')

    await user.clear(
      screen.getByLabelText(/^output contract$/i, {
        selector: 'textarea#runtime-skill-editor-output-contract',
      }),
    )
    await user.type(
      screen.getByLabelText(/^output contract$/i, {
        selector: 'textarea#runtime-skill-editor-output-contract',
      }),
      JSON.stringify({
        type: 'object',
        properties: {
          isValid: { type: 'boolean' },
          missingSections: { type: 'array' },
        },
      }, null, 2),
    )

    const primaryOutputSelect = screen.getByLabelText(/^primary output key$/i, {
      selector: 'select#runtime-skill-editor-primary-output-key',
    })

    const outputBindingsTextarea = screen.getByLabelText(/^output bindings$/i, {
      selector: 'textarea#runtime-skill-editor-output-bindings',
    })

    await user.selectOptions(primaryOutputSelect, 'isValid')

    expect(outputBindingsTextarea).toBeDisabled()

    await user.selectOptions(
      screen.getByLabelText(/^output binding mode$/i, {
        selector: 'select#runtime-skill-editor-output-binding-mode',
      }),
      'BINDINGS',
    )

    expect(
      screen.getByLabelText(/^output binding mode$/i, {
        selector: 'select#runtime-skill-editor-output-binding-mode',
      }),
    ).toHaveValue('BINDINGS')

    expect(primaryOutputSelect).toBeDisabled()
    expect(primaryOutputSelect).toHaveValue('')

    await user.type(outputBindingsTextarea, 'validationResult\nmissingSections')
    expect(outputBindingsTextarea).not.toBeDisabled()
  })

  it('derives primary output key options from the Output Contract properties', async () => {
    const user = userEvent.setup()
    renderSkillEditor('/super-admin/runtime-control/skills/new')

    await user.type(
      screen.getByLabelText(/^skill key$/i, {
        selector: 'input#runtime-skill-editor-key',
      }),
      'check-required-vmf-sections',
    )
    await user.type(
      screen.getByLabelText(/^skill name$/i, {
        selector: 'input#runtime-skill-editor-name',
      }),
      'Check Required VMF Sections',
    )

    await user.click(screen.getByRole('tab', { name: /^input \/ output contract$/i }))
    await user.type(
      screen.getByLabelText(/^output contract$/i, {
        selector: 'textarea#runtime-skill-editor-output-contract',
      }),
      JSON.stringify({
        type: 'object',
        properties: {
          isValid: { type: 'boolean' },
          missingSections: { type: 'array' },
        },
      }, null, 2),
    )

    await user.selectOptions(
      screen.getByLabelText(/^output binding mode$/i, {
        selector: 'select#runtime-skill-editor-output-binding-mode',
      }),
      'PRIMARY',
    )

    expect(screen.getByRole('option', { name: /isValid/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /missingSections/i })).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(/^primary output key$/i, {
        selector: 'select#runtime-skill-editor-primary-output-key',
      }),
      'missingSections',
    )

    expect(
      screen.getByLabelText(/^primary output key$/i, {
        selector: 'select#runtime-skill-editor-primary-output-key',
      }),
    ).toHaveValue('missingSections')
  })

  it('clears the primary output key when the Output Contract schema changes', async () => {
    const user = userEvent.setup()
    renderSkillEditor('/super-admin/runtime-control/skills/new')

    await user.type(
      screen.getByLabelText(/^skill key$/i, {
        selector: 'input#runtime-skill-editor-key',
      }),
      'check-required-vmf-sections',
    )
    await user.type(
      screen.getByLabelText(/^skill name$/i, {
        selector: 'input#runtime-skill-editor-name',
      }),
      'Check Required VMF Sections',
    )

    await user.click(screen.getByRole('tab', { name: /^input \/ output contract$/i }))
    const outputContract = screen.getByLabelText(/^output contract$/i, {
      selector: 'textarea#runtime-skill-editor-output-contract',
    })

    await user.type(outputContract, JSON.stringify({
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        missingSections: { type: 'array' },
      },
    }, null, 2))

    await user.selectOptions(
      screen.getByLabelText(/^output binding mode$/i, {
        selector: 'select#runtime-skill-editor-output-binding-mode',
      }),
      'PRIMARY',
    )

    const primaryOutputSelect = screen.getByLabelText(/^primary output key$/i, {
      selector: 'select#runtime-skill-editor-primary-output-key',
    })
    await user.selectOptions(primaryOutputSelect, 'isValid')
    expect(primaryOutputSelect).toHaveValue('isValid')

    await user.clear(outputContract)
    await user.type(outputContract, JSON.stringify({
      type: 'object',
      properties: {
        missingSections: { type: 'array' },
      },
    }, null, 2))

    await waitFor(() => {
      expect(primaryOutputSelect).toHaveValue('')
    })
  })

  it('hides execution config for SYSTEM skills on the Input / Output Contract tab', async () => {
    renderSkillEditor('/super-admin/runtime-control/skills/new')

    await userEvent.click(screen.getByRole('tab', { name: /^input \/ output contract$/i }))

    expect(
      screen.queryByLabelText(/^execution config/i, {
        selector: 'textarea#runtime-skill-editor-execution-config',
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/execution config is only available/i)).toBeInTheDocument()
  })

  it('renders dependency visibility section in edit mode', async () => {
    const user = userEvent.setup()
    renderSkillEditor('/super-admin/runtime-control/skills/skill-snapshot')

    expect(await screen.findByRole('tab', { name: /^dependency visibility$/i })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /^dependency visibility$/i }))
    expect(screen.getByRole('heading', { name: /dependency visibility/i })).toBeInTheDocument()
    expect(screen.getByText(/skill id:/i)).toBeInTheDocument()
    expect(screen.getByText('skill-snapshot')).toBeInTheDocument()
    expect(screen.getByText(/referencing agents/i)).toBeInTheDocument()
    expect(screen.getByText(/no agents reference this skill/i)).toBeInTheDocument()
    expect(screen.getByText(/referencing workflow policies/i)).toBeInTheDocument()
    expect(screen.getByText(/no workflow policies reference this skill/i)).toBeInTheDocument()
  })

  it('manages reference assets on the Reference Assets tab', async () => {
    const user = userEvent.setup()
    renderSkillEditor('/super-admin/runtime-control/skills/new')

    await user.click(screen.getByRole('tab', { name: /^reference assets$/i }))

    expect(screen.getByText(/no reference assets attached yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^add reference asset$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^add reference asset$/i }))

    expect(screen.getByLabelText(/^asset name$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^type$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^purpose$/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^asset name$/i), 'User Guide')
    await user.selectOptions(screen.getByLabelText(/^purpose$/i), 'AUTHORING_HELP')

    await user.click(screen.getByRole('button', { name: /^add asset$/i }))

    expect(screen.getByText('User Guide')).toBeInTheDocument()
    expect(screen.getByText(/authoring_help/i)).toBeInTheDocument()
  })

  it('prevents invalid reference asset flag combinations', async () => {
    const user = userEvent.setup()
    renderSkillEditor('/super-admin/runtime-control/skills/new')

    await user.click(screen.getByRole('tab', { name: /^reference assets$/i }))
    await user.click(screen.getByRole('button', { name: /^add reference asset$/i }))

    const runtimeCheckbox = screen.getByLabelText(/^runtime accessible$/i)
    const adminCheckbox = screen.getByLabelText(/^admin only$/i)

    await user.type(screen.getByLabelText(/^asset name$/i), 'Test Asset')

    // Enable runtime accessible
    await user.click(runtimeCheckbox)
    expect(runtimeCheckbox).toBeChecked()

    // Admin only should be disabled when runtime accessible is enabled
    expect(adminCheckbox).toBeDisabled()
  })
})
