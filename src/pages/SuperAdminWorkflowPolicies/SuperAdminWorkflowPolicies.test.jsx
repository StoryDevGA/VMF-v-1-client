import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import SuperAdminWorkflowPolicies from './SuperAdminWorkflowPolicies'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'

function renderPage() {
  return renderRuntimeControlPage({
    route: '/super-admin/runtime-control/workflow-policies',
    path: '/super-admin/runtime-control/workflow-policies',
    element: <SuperAdminWorkflowPolicies />,
  })
}

describe('SuperAdminWorkflowPolicies page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('renders the catalogue-first workflow policies page and opens the create dialog', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { name: /workflow policies/i })).toBeInTheDocument()
    expect(screen.getByText(/active workflow policies bind ordered steps/i)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /workflow policies/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(screen.getByRole('button', { name: /create workflow policy/i })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^workflow policy key$/i, {
        selector: 'input#workflow-policy-create-key',
      }),
    ).toBeInTheDocument()
  })

  it('creates a workflow policy from the modal dialog and shows it in the catalogue', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    await user.type(
      screen.getByLabelText(/^workflow policy key$/i, {
        selector: 'input#workflow-policy-create-key',
      }),
      'vmf-review',
    )
    await user.type(
      screen.getByLabelText(/^workflow policy name$/i, {
        selector: 'input#workflow-policy-create-name',
      }),
      'VMF Review Policy',
    )
    fireEvent.change(
      screen.getByLabelText(/^ordered steps$/i, {
        selector: 'textarea#workflow-policy-create-ordered-steps',
      }),
      { target: { value: 'snapshot,\nreview,\napprove' } },
    )
    fireEvent.change(
      screen.getByLabelText(/required agent ids/i, {
        selector: 'textarea#workflow-policy-create-agent-ids',
      }),
      { target: { value: 'agent-validator,\nagent-summary' } },
    )
    fireEvent.change(
      screen.getByLabelText(/required skill ids/i, {
        selector: 'textarea#workflow-policy-create-skill-ids',
      }),
      { target: { value: 'skill-snapshot,\nskill-review' } },
    )

    await user.click(screen.getByRole('button', { name: /create workflow policy/i }))

    await waitFor(() => {
      expect(screen.getByText('VMF Review Policy')).toBeInTheDocument()
      expect(screen.getByText('vmf-review')).toBeInTheDocument()
    })
  })

  it('supports search filters and pagination for the workflow policies catalogue', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/page 1 of 2/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^last$/i }))
    expect(await screen.findByText(/page 2 of 2/i)).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(/^framework$/i, {
        selector: 'select#workflow-policy-framework-filter',
      }),
      'RLD',
    )

    await waitFor(() => {
      expect(screen.getByText('RLD Publish Policy')).toBeInTheDocument()
      expect(screen.getByText('RLD Go To Market Policy')).toBeInTheDocument()
      expect(screen.queryByText('VMF Publish Policy')).not.toBeInTheDocument()
    })

    await user.type(
      screen.getByLabelText(/^search$/i, {
        selector: 'input#workflow-policy-search',
      }),
      'publish',
    )

    await waitFor(() => {
      expect(screen.getByText('RLD Publish Policy')).toBeInTheDocument()
      expect(screen.queryByText('RLD Baseline Policy')).not.toBeInTheDocument()
    })
  })

  it('opens the edit flow from row actions and saves changes', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      await screen.findByLabelText(/actions for vmf publish policy/i),
      'Edit',
    )

    const editNameInput = screen.getByLabelText(/^workflow policy name$/i, {
      selector: 'input#workflow-policy-edit-name',
    })
    await user.clear(editNameInput)
    await user.type(editNameInput, 'VMF Release Policy')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('VMF Release Policy')).toBeInTheDocument()
    })
  })

  it('updates a workflow policy status from the row action menu', async () => {
    const user = userEvent.setup()
    renderPage()

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
})
