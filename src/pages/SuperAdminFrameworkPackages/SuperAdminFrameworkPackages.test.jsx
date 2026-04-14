import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminFrameworkPackages from './SuperAdminFrameworkPackages'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'

function renderPage() {
  return renderRuntimeControlPage({
    route: '/super-admin/runtime-control/framework-packages',
    path: '/super-admin/runtime-control/framework-packages',
    element: <SuperAdminFrameworkPackages />,
  })
}

describe('SuperAdminFrameworkPackages page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('renders the catalogue-first framework packages page and opens the create dialog', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { name: /framework packages/i })).toBeInTheDocument()
    expect(screen.getByText(/validated packages can be activated/i)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /framework packages/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(screen.getByRole('button', { name: /create framework package/i })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^framework name$/i, {
        selector: 'input#framework-package-create-framework-name',
      }),
    ).toBeInTheDocument()
  })

  it('creates a framework package from the modal dialog and shows it in the catalogue', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    await user.clear(
      screen.getByLabelText(/^framework name$/i, {
        selector: 'input#framework-package-create-framework-name',
      }),
    )
    await user.type(
      screen.getByLabelText(/^framework name$/i, {
        selector: 'input#framework-package-create-framework-name',
      }),
      'Value Management Framework',
    )
    await user.type(
      screen.getByLabelText(/^version$/i, {
        selector: 'input#framework-package-create-version',
      }),
      '2.5.0',
    )
    fireEvent.change(
      screen.getByLabelText(/compatible workflow keys/i, {
        selector: 'textarea#framework-package-create-workflow-keys',
      }),
      { target: { value: 'vmf-baseline,\nvmf-publish' } },
    )

    await user.click(screen.getByRole('button', { name: /create framework package/i }))

    await waitFor(() => {
      expect(screen.getByText('2.5.0')).toBeInTheDocument()
      expect(screen.getAllByText('Value Management Framework').length).toBeGreaterThan(0)
    })
  })

  it('supports search filters and pagination for the framework packages catalogue', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/page 1 of 2/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^last$/i }))
    expect(await screen.findByText(/page 2 of 2/i)).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(/^framework$/i, {
        selector: 'select#framework-package-framework-filter',
      }),
      'RLD',
    )

    await waitFor(() => {
      expect(screen.queryByText('2.3.1')).not.toBeInTheDocument()
      expect(screen.getByText('1.1.0')).toBeInTheDocument()
      expect(screen.getByText('1.2.0')).toBeInTheDocument()
    })

    await user.type(
      screen.getByLabelText(/^search$/i, {
        selector: 'input#framework-package-search',
      }),
      '1.2.0',
    )

    await waitFor(() => {
      expect(screen.getByText('1.2.0')).toBeInTheDocument()
      expect(screen.queryByText('1.1.0')).not.toBeInTheDocument()
    })
  })

  it('opens the edit flow from row actions and saves changes', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      await screen.findByLabelText(/actions for vmf 2.3.1/i),
      'Edit',
    )

    const editNameInput = screen.getByLabelText(/^framework name$/i, {
      selector: 'input#framework-package-edit-framework-name',
    })
    await user.clear(editNameInput)
    await user.type(editNameInput, 'VMF Control Plane')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('VMF Control Plane')).toBeInTheDocument()
    })
  })

  it('activates a validated package and updates the default status in the catalogue', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      await screen.findByLabelText(/actions for vmf 2.3.0/i),
      'Activate',
    )

    await waitFor(() => {
      const activatedRow = screen.getByText('2.3.0').closest('tr')
      const previousDefaultRow = screen.getByText('2.3.1').closest('tr')
      expect(activatedRow).not.toBeNull()
      expect(previousDefaultRow).not.toBeNull()
      expect(within(activatedRow).getByText(/active/i)).toBeInTheDocument()
      expect(within(activatedRow).getByText(/default/i)).toBeInTheDocument()
      expect(within(previousDefaultRow).getByText(/validated/i)).toBeInTheDocument()
    })
  })
})
