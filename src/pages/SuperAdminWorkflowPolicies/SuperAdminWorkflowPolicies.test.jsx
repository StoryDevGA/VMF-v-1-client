import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import SuperAdminWorkflowPolicies from './SuperAdminWorkflowPolicies'
import SuperAdminWorkflowPolicyEditor from '../SuperAdminWorkflowPolicyEditor'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'

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
      screen.getByLabelText(/^workflow policy name$/i, {
        selector: 'input#workflow-policy-editor-name',
      }),
    ).toHaveValue('VMF Publish Policy')
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
})
