import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminAgents from './SuperAdminAgents'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'

function renderPage() {
  return renderRuntimeControlPage({
    route: '/super-admin/runtime-control/agents',
    path: '/super-admin/runtime-control/agents',
    element: <SuperAdminAgents />,
  })
}

describe('SuperAdminAgents page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('renders the catalogue-first agents page and opens the create dialog', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { name: /^agents$/i })).toBeInTheDocument()
    expect(screen.getByText(/active agents remain selectable/i)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /^agents$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(screen.getByRole('button', { name: /create agent/i })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^agent key$/i, {
        selector: 'input#runtime-agent-create-key',
      }),
    ).toBeInTheDocument()
  })

  it('creates an agent from the modal dialog and shows it in the catalogue', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    await user.type(
      screen.getByLabelText(/^agent key$/i, {
        selector: 'input#runtime-agent-create-key',
      }),
      'planner',
    )
    await user.type(
      screen.getByLabelText(/^agent name$/i, {
        selector: 'input#runtime-agent-create-name',
      }),
      'Planner',
    )
    fireEvent.change(
      screen.getByLabelText(/default skill ids/i, {
        selector: 'textarea#runtime-agent-create-skill-ids',
      }),
      { target: { value: 'skill-snapshot,\nskill-summary' } },
    )

    await user.click(screen.getByRole('button', { name: /create agent/i }))

    await waitFor(() => {
      expect(screen.getByText('Planner')).toBeInTheDocument()
      expect(screen.getByText('planner')).toBeInTheDocument()
    })
  })

  it('supports search filters and pagination for the agents catalogue', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/page 1 of 2/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^last$/i }))
    expect(await screen.findByText(/page 2 of 2/i)).toBeInTheDocument()

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

  it('opens the edit flow from row actions and saves changes', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for validator/i), 'Edit')

    const editNameInput = screen.getByLabelText(/^agent name$/i, {
      selector: 'input#runtime-agent-edit-name',
    })
    await user.clear(editNameInput)
    await user.type(editNameInput, 'Validation Guard')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Validation Guard')).toBeInTheDocument()
    })
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
})
