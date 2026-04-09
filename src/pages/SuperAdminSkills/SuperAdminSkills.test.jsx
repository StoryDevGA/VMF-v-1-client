import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminSkills from './SuperAdminSkills'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'

function renderPage() {
  return renderRuntimeControlPage({
    route: '/super-admin/runtime-control/skills',
    path: '/super-admin/runtime-control/skills',
    element: <SuperAdminSkills />,
  })
}

describe('SuperAdminSkills page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('renders the catalogue-first skills page and opens the create dialog', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { name: /^skills$/i })).toBeInTheDocument()
    expect(screen.getByText(/active skills remain selectable/i)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /^skills$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(screen.getByRole('button', { name: /create skill/i })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^skill key$/i, {
        selector: 'input#runtime-skill-create-key',
      }),
    ).toBeInTheDocument()
  })

  it('creates a skill from the modal dialog and shows it in the catalogue', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    await user.type(
      screen.getByLabelText(/^skill key$/i, {
        selector: 'input#runtime-skill-create-key',
      }),
      'alignment',
    )
    await user.type(
      screen.getByLabelText(/^skill name$/i, {
        selector: 'input#runtime-skill-create-name',
      }),
      'Alignment',
    )
    await user.click(screen.getByRole('button', { name: /create skill/i }))

    await waitFor(() => {
      expect(screen.getByText('Alignment')).toBeInTheDocument()
      expect(screen.getByText('alignment')).toBeInTheDocument()
    })
  })

  it('supports search filters and pagination for the skills catalogue', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/page 1 of 2/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^last$/i }))
    expect(await screen.findByText(/page 2 of 2/i)).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(/^framework$/i, {
        selector: 'select#runtime-skill-framework-filter',
      }),
      'RLD',
    )

    await waitFor(() => {
      expect(screen.getByText('Snapshot')).toBeInTheDocument()
      expect(screen.getByText('Revenue Map')).toBeInTheDocument()
      expect(screen.queryByText('Review')).not.toBeInTheDocument()
    })

    await user.type(
      screen.getByLabelText(/^search$/i, {
        selector: 'input#runtime-skill-search',
      }),
      'report',
    )

    await waitFor(() => {
      expect(screen.getByText('Report')).toBeInTheDocument()
      expect(screen.queryByText('Snapshot')).not.toBeInTheDocument()
    })
  })

  it('opens the edit flow from row actions and saves changes', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for snapshot/i), 'Edit')

    const editNameInput = screen.getByLabelText(/^skill name$/i, {
      selector: 'input#runtime-skill-edit-name',
    })
    await user.clear(editNameInput)
    await user.type(editNameInput, 'State Snapshot')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('State Snapshot')).toBeInTheDocument()
    })
  })

  it('updates a skill status from the row action menu', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for snapshot/i), 'Set Inactive')

    await waitFor(() => {
      const snapshotRow = screen.getByText('Snapshot').closest('tr')
      expect(snapshotRow).not.toBeNull()
      expect(within(snapshotRow).getByText(/inactive/i)).toBeInTheDocument()
    })
  })
})
