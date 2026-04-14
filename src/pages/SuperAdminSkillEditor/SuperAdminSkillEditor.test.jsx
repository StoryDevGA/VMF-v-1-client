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
    expect(screen.getByRole('heading', { name: /input \/ output contract/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /optional configuration/i })).toBeInTheDocument()

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

    const inputContractTextarea = screen.getByLabelText(/^input contract$/i, {
      selector: 'textarea#runtime-skill-editor-input-contract',
    })
    await user.type(inputContractTextarea, '{{invalid json')
    await user.click(screen.getByRole('button', { name: /create skill/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: '' })).toHaveTextContent('Invalid JSON.')
    })
  })

  it('renders dependency visibility section in edit mode', async () => {
    renderSkillEditor('/super-admin/runtime-control/skills/skill-snapshot')

    expect(await screen.findByRole('heading', { name: /dependency visibility/i })).toBeInTheDocument()
    expect(screen.getByText(/skill id:/i)).toBeInTheDocument()
    expect(screen.getByText('skill-snapshot')).toBeInTheDocument()
    expect(screen.getByText(/referencing agents/i)).toBeInTheDocument()
    expect(screen.getByText(/no agents reference this skill/i)).toBeInTheDocument()
    expect(screen.getByText(/referencing workflow policies/i)).toBeInTheDocument()
    expect(screen.getByText(/no workflow policies reference this skill/i)).toBeInTheDocument()
  })
})
