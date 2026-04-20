import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminAgents from '../SuperAdminAgents'
import SuperAdminAgentEditor from './SuperAdminAgentEditor'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'

function renderPage(initialRoute) {
  return renderRuntimeControlPage({
    route: initialRoute,
    routes: [
      {
        path: '/super-admin/runtime-control/agents',
        element: <SuperAdminAgents />,
      },
      {
        path: '/super-admin/runtime-control/agents/new',
        element: <SuperAdminAgentEditor />,
      },
      {
        path: '/super-admin/runtime-control/agents/:agentId',
        element: <SuperAdminAgentEditor />,
      },
    ],
  })
}

describe('SuperAdminAgentEditor page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('creates a runtime agent from the dedicated page flow', async () => {
    const user = userEvent.setup()
    renderPage('/super-admin/runtime-control/agents/new')

    expect(screen.getByRole('heading', { name: /^create agent$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^overview$/i })).toBeInTheDocument()
    expect(screen.queryByText(/vmf_state/i)).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^framework compatibility$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^skill composition$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^execution plan$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^prompt & instruction design$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^contracts$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^runtime configuration$/i })).toBeInTheDocument()
    expect(screen.getByRole('tablist').parentElement).toHaveClass('tabview--sm')

    await user.clear(
      screen.getByLabelText(/^agent key$/i, {
        selector: 'input#runtime-agent-create-key',
      }),
    )
    await user.type(
      screen.getByLabelText(/^agent key$/i, {
        selector: 'input#runtime-agent-create-key',
      }),
      'planner',
    )
    await user.clear(
      screen.getByLabelText(/^agent name$/i, {
        selector: 'input#runtime-agent-create-name',
      }),
    )
    await user.type(
      screen.getByLabelText(/^agent name$/i, {
        selector: 'input#runtime-agent-create-name',
      }),
      'Planner',
    )
    await user.clear(
      screen.getByLabelText(/^description$/i, {
        selector: 'textarea#runtime-agent-create-description',
      }),
    )
    await user.type(
      screen.getByLabelText(/^description$/i, {
        selector: 'textarea#runtime-agent-create-description',
      }),
      'Coordinates planner-oriented agent actions for runtime control.',
    )

    await user.click(screen.getByRole('tab', { name: /^skill composition$/i }))
    expect(
      screen.getByLabelText(/^required skill roles$/i, {
        selector: 'select#runtime-agent-create-required-role-select',
      }),
    ).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(/^required skill roles$/i, {
        selector: 'select#runtime-agent-create-required-role-select',
      }),
      'VALIDATOR',
    )
    await user.click(screen.getByRole('button', { name: /add role/i }))

    expect(screen.getByText('VALIDATOR')).toBeInTheDocument()

    expect(
      screen.getByLabelText(/^skill selector$/i, {
        selector: 'select#runtime-agent-create-skill-select',
      }),
    ).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(/^skill selector$/i, {
        selector: 'select#runtime-agent-create-skill-select',
      }),
      'skill-snapshot',
    )
    await user.click(screen.getByRole('button', { name: /add skill/i }))
    await user.selectOptions(
      screen.getByLabelText(/^skill selector$/i, {
        selector: 'select#runtime-agent-create-skill-select',
      }),
      'skill-summary',
    )
    await user.click(screen.getByRole('button', { name: /add skill/i }))

    await user.click(screen.getByRole('tab', { name: /^execution plan$/i }))
    await user.selectOptions(
      screen.getByLabelText(/^add step$/i, {
        selector: 'select#runtime-agent-create-execution-add-skill',
      }),
      'skill-snapshot',
    )
    await user.click(screen.getByRole('button', { name: /^add step$/i }))
    await user.selectOptions(
      screen.getByLabelText(/^add step$/i, {
        selector: 'select#runtime-agent-create-execution-add-skill',
      }),
      'skill-summary',
    )
    await user.click(screen.getByRole('button', { name: /^add step$/i }))
    await user.selectOptions(
      screen.getByLabelText(/^writes to for step 1$/i, {
        selector: 'select#runtime-agent-create-execution-step-1-writes-to',
      }),
      'runtime.validationResult',
    )

    expect(screen.getByText(/^estimated flow$/i)).toBeInTheDocument()
    expect(screen.getByText(/snapshot -> summary/i)).toBeInTheDocument()
    expect(screen.getByText(/all current execution steps are valid\./i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^runtime configuration$/i }))
    await user.clear(
      screen.getByLabelText(/^timeout \(ms\)$/i, {
        selector: 'input#runtime-agent-create-policy-timeout-ms',
      }),
    )
    await user.type(
      screen.getByLabelText(/^timeout \(ms\)$/i, {
        selector: 'input#runtime-agent-create-policy-timeout-ms',
      }),
      '2500',
    )

    await user.click(screen.getByRole('button', { name: /create agent/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^agents$/i })).toBeInTheDocument()
    })
    expect(screen.getByText('Planner')).toBeInTheDocument()
    expect(screen.getByText('planner')).toBeInTheDocument()
  })

  it('only offers active frameworks in the compatibility selector', async () => {
    const user = userEvent.setup()
    renderPage('/super-admin/runtime-control/agents/new')

    await user.click(screen.getByRole('tab', { name: /^framework compatibility$/i }))
    await user.click(screen.getByRole('button', { name: /remove vmf/i }))
    await user.click(screen.getByRole('button', { name: /remove rld/i }))

    const frameworkSelect = screen.getByLabelText(/^add framework$/i, {
      selector: 'select#runtime-agent-create-framework-select',
    })

    expect(within(frameworkSelect).getByRole('option', { name: 'VMF - Value Messaging Framework' })).toBeInTheDocument()
    expect(within(frameworkSelect).getByRole('option', { name: 'RLD - Revenue Lifecycle Design' })).toBeInTheDocument()
    expect(
      within(frameworkSelect).queryByRole('option', { name: 'CMF - Customer Messaging Framework' }),
    ).not.toBeInTheDocument()
    expect(
      within(frameworkSelect).queryByRole('option', { name: 'QMF - Quality Messaging Framework' }),
    ).not.toBeInTheDocument()
    expect(
      within(frameworkSelect).queryByRole('option', { name: 'OPS - Operations Messaging Framework' }),
    ).not.toBeInTheDocument()
    expect(frameworkSelect).not.toBeDisabled()
  })

  it('only offers ACTIVE skills in the governed skill selector', async () => {
    const user = userEvent.setup()
    renderPage('/super-admin/runtime-control/agents/new')

    await user.click(screen.getByRole('tab', { name: /^skill composition$/i }))

    const skillSelect = screen.getByLabelText(/^skill selector$/i, {
      selector: 'select#runtime-agent-create-skill-select',
    })

    expect(within(skillSelect).getByRole('option', { name: /snapshot/i })).toBeInTheDocument()
    expect(within(skillSelect).getByRole('option', { name: /summary/i })).toBeInTheDocument()
    expect(within(skillSelect).queryByRole('option', { name: /report/i })).not.toBeInTheDocument()
    expect(within(skillSelect).queryByRole('option', { name: /go to market/i })).not.toBeInTheDocument()
  })

  it('updates an existing runtime agent from the dedicated edit page flow', async () => {
    const user = userEvent.setup()
    renderPage('/super-admin/runtime-control/agents/agent-validator')

    expect(await screen.findByRole('heading', { name: /^agent editor$/i })).toBeInTheDocument()
    expect(
      await screen.findByLabelText(/^agent key$/i, {
        selector: 'input#runtime-agent-edit-key',
      }),
    ).toHaveValue('validator')

    const nameInput = screen.getByLabelText(/^agent name$/i, {
      selector: 'input#runtime-agent-edit-name',
    })
    await user.clear(nameInput)
    await user.type(nameInput, 'Validation Guard')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^agents$/i })).toBeInTheDocument()
    })
    expect(screen.getByText('Validation Guard')).toBeInTheDocument()
  })

  it('renders dependencies tab in edit mode', async () => {
    const user = userEvent.setup()
    renderPage('/super-admin/runtime-control/agents/agent-validator')

    expect(await screen.findByRole('tab', { name: /^dependencies$/i })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /^dependencies$/i }))
    expect(screen.getByRole('heading', { name: /^dependencies$/i })).toBeInTheDocument()
    expect(screen.getByText(/referenced by workflow policies/i)).toBeInTheDocument()
  })

  it('surfaces dependency warnings before the dependencies tab is opened', async () => {
    renderPage('/super-admin/runtime-control/agents/agent-validator')

    expect(
      await screen.findByText(/^dependency warnings$/i, {
        selector: '.super-admin-agents__dependency-notice-title',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/this agent is referenced by/i, {
        selector: '.super-admin-agents__dependency-notice-copy',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open dependencies tab/i })).toBeInTheDocument()
  })

  it('shows validation error for invalid JSON in contract fields', async () => {
    const user = userEvent.setup()
    renderPage('/super-admin/runtime-control/agents/new')

    await user.type(
      screen.getByLabelText(/^agent key$/i, {
        selector: 'input#runtime-agent-create-key',
      }),
      'test-agent',
    )
    await user.type(
      screen.getByLabelText(/^agent name$/i, {
        selector: 'input#runtime-agent-create-name',
      }),
      'Test Agent',
    )

    await user.click(screen.getByRole('tab', { name: /^contracts$/i }))
    fireEvent.change(
      screen.getByLabelText(/^input contract \(json\)$/i, {
        selector: 'textarea#runtime-agent-create-input-contract',
      }),
      { target: { value: '{' } },
    )

    expect(screen.queryByRole('button', { name: /create agent/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /review missing fields/i }))

    expect(await screen.findByText(/invalid json\./i)).toBeInTheDocument()
    expect(screen.queryByText('Test Agent')).not.toBeInTheDocument()
  })
})
