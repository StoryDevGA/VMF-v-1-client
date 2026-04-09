import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminFrameworkRegistry from './SuperAdminFrameworkRegistry'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'

vi.mock('../../components/StepUpAuthForm', () => ({
  StepUpAuthForm: ({ onStepUpComplete }) => (
    <button
      type="button"
      onClick={() => onStepUpComplete('mock-step-up-token', 900)}
    >
      Verify Runtime Control Access
    </button>
  ),
}))

function renderPage() {
  return renderRuntimeControlPage({
    route: '/super-admin/runtime-control/framework-registry',
    path: '/super-admin/runtime-control/framework-registry',
    element: <SuperAdminFrameworkRegistry />,
  })
}

async function verifyRuntimeControlAccess(user) {
  await user.click(screen.getByRole('button', { name: /verify runtime control access/i }))
}

describe('SuperAdminFrameworkRegistry page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('renders the registry catalogue and opens the create dialog', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { name: /framework registry/i })).toBeInTheDocument()
    expect(screen.getByText(/canonical framework keys/i)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /framework registry/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /create framework key/i }))
    const createDialog = screen.getByRole('dialog')

    expect(
      within(createDialog).getByRole('button', { name: /create framework key/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^framework key$/i, {
        selector: 'input#framework-registry-create-framework-key',
      }),
    ).toBeInTheDocument()
  })

  it('creates a framework registry entry from the modal dialog', async () => {
    const user = userEvent.setup()
    renderPage()

    await verifyRuntimeControlAccess(user)

    await user.click(screen.getByRole('button', { name: /create framework key/i }))
    const createDialog = screen.getByRole('dialog')
    await user.click(
      within(createDialog).getByRole('button', { name: /^create framework key$/i }),
    )
    await user.clear(
      screen.getByLabelText(/^framework key$/i, {
        selector: 'input#framework-registry-create-framework-key',
      }),
    )
    await user.type(
      screen.getByLabelText(/^framework key$/i, {
        selector: 'input#framework-registry-create-framework-key',
      }),
      'LFM',
    )
    await user.clear(
      screen.getByLabelText(/^framework name$/i, {
        selector: 'input#framework-registry-create-name',
      }),
    )
    await user.type(
      screen.getByLabelText(/^framework name$/i, {
        selector: 'input#framework-registry-create-name',
      }),
      'Learning Framework Model',
    )

    await user.click(
      within(createDialog).getByRole('button', { name: /^create framework key$/i }),
    )

    await waitFor(() => {
      expect(screen.getByText('LFM')).toBeInTheDocument()
      expect(screen.getByText('Learning Framework Model')).toBeInTheDocument()
    })
  })

  it('opens the detail surface and updates an existing framework entry', async () => {
    const user = userEvent.setup()
    renderPage()

    await verifyRuntimeControlAccess(user)

    await user.selectOptions(
      await screen.findByLabelText(/actions for vmf/i),
      'View details',
    )

    const detailDialog = screen.getByRole('dialog')
    expect(
      within(detailDialog).getByRole('heading', { name: /framework registry details/i }),
    ).toBeInTheDocument()
    expect(within(detailDialog).getByText(/value messaging framework/i)).toBeInTheDocument()
    expect(within(detailDialog).getByText(/default behavior profile/i)).toBeInTheDocument()

    await user.click(within(detailDialog).getByRole('button', { name: /^close$/i }))

    await user.selectOptions(
      await screen.findByLabelText(/actions for qmf/i),
      'Edit',
    )

    const editNameInput = screen.getByLabelText(/^framework name$/i, {
      selector: 'input#framework-registry-edit-name',
    })
    await user.clear(editNameInput)
    await user.type(editNameInput, 'Quality Messaging Core')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Quality Messaging Core')).toBeInTheDocument()
    })
  })

  it('surfaces framework key conflicts inline during edit', async () => {
    const user = userEvent.setup()
    renderPage()

    await verifyRuntimeControlAccess(user)

    await user.selectOptions(
      await screen.findByLabelText(/actions for qmf/i),
      'Edit',
    )

    const editDialog = screen.getByRole('dialog')
    const frameworkKeyInput = within(editDialog).getByLabelText(/^framework key$/i, {
      selector: 'input#framework-registry-edit-framework-key',
    })

    await user.clear(frameworkKeyInput)
    await user.type(frameworkKeyInput, 'VMF')
    await user.click(within(editDialog).getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(within(editDialog).getByText(/framework key must be unique/i)).toBeInTheDocument()
    })
  })
})
