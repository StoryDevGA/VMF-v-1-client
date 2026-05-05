import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminAgents from './SuperAdminAgents'
import SuperAdminAgentEditor from '../SuperAdminAgentEditor'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'

function renderPage() {
  return renderRuntimeControlPage({
    route: '/super-admin/runtime-control/agents',
    path: '/super-admin/runtime-control/agents',
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

describe('SuperAdminAgents page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('renders the catalogue-first agents page and routes create actions to the dedicated editor page', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { name: /^agents$/i })).toBeInTheDocument()
    expect(screen.getByText(/active agents remain selectable/i)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /^agents$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByRole('heading', { name: /^create agent$/i })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^agent key$/i, {
        selector: 'input#runtime-agent-create-key',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /framework compatibility/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /skill composition/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /contracts/i })).toBeInTheDocument()
  })

  it('only offers active frameworks in the agent dialog selector', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    await user.click(screen.getByRole('tab', { name: /framework compatibility/i }))
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

  it('supports search filters and pagination for the agents catalogue', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/page 1 of 3/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^last$/i }))
    expect(await screen.findByText(/page 3 of 3/i)).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(/^framework$/i, {
        selector: 'select#runtime-agent-framework-filter',
      }),
      'RLD',
    )

    await waitFor(() => {
      expect(screen.getByText('Validator')).toBeInTheDocument()
      expect(screen.getByText('Readiness Check')).toBeInTheDocument()
      expect(screen.queryByText('Governance Review')).not.toBeInTheDocument()
    })

    await user.type(
      screen.getByLabelText(/^search$/i, {
        selector: 'input#runtime-agent-search',
      }),
      'reporter',
    )

    await waitFor(() => {
      expect(screen.getByText('Report Publisher')).toBeInTheDocument()
      expect(screen.queryByText('Validator')).not.toBeInTheDocument()
    })
  })

  it('routes edit flow from row actions to the dedicated editor page', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for validator/i), 'Edit')

    expect(await screen.findByRole('heading', { name: /^agent editor$/i })).toBeInTheDocument()
    expect(
      await screen.findByLabelText(/^agent key$/i, {
        selector: 'input#runtime-agent-edit-key',
      }),
    ).toHaveValue('validator')
    expect(screen.getByRole('tab', { name: /prompt & instruction design/i })).toBeInTheDocument()
  })

  it('updates an agent status from the row action menu', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for validator/i), 'Set Inactive')

    await waitFor(() => {
      const validatorRow = screen.getByText('Validator').closest('tr')
      expect(validatorRow).not.toBeNull()
      expect(within(validatorRow).getByText(/inactive/i)).toBeInTheDocument()
    })
  })

  it('blocks lifecycle changes when an agent has active dependencies', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for validator/i), 'Deprecate')

    expect(await screen.findByText(/failed to update agent status/i)).toBeInTheDocument()

    const validatorRow = screen.getByText('Validator').closest('tr')
    expect(validatorRow).not.toBeNull()
    expect(within(validatorRow).getAllByText(/^active$/i).length).toBeGreaterThan(0)
  })

  it('validates an agent from the row action menu and shows a toast', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for validator/i), 'Validate')

    expect(await screen.findByText(/agent validated/i)).toBeInTheDocument()
  })

  it('tests an agent from the row action menu and shows a toast', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for validator/i), 'Test')

    expect(await screen.findByRole('button', { name: /run test/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /run test/i }))

    expect(await screen.findByText(/agent test completed/i)).toBeInTheDocument()

    const testDialogHeading = screen.getByText(/^test agent$/i)
    const testDialog = testDialogHeading.closest('dialog')
    expect(testDialog).not.toBeNull()

    await user.click(within(testDialog).getByRole('button', { name: /show compiled prompt preview/i }))

    await waitFor(() => {
      expect(testDialog.querySelector('#runtime-agent-test-compiled-preview')).not.toBeNull()
    })

    expect(within(testDialog).getByDisplayValue(/base system prompt/i)).toBeInTheDocument()
  })
})
