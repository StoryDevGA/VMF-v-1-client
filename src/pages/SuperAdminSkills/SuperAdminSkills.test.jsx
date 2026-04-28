import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminSkills from './SuperAdminSkills'
import SuperAdminSkillEditor from '../SuperAdminSkillEditor'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'

function renderPage(initialRoute = '/super-admin/runtime-control/skills') {
  return renderRuntimeControlPage({
    route: initialRoute,
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

describe('SuperAdminSkills page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('renders the catalogue-first skills page and routes create actions to the dedicated editor page', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { name: /^skills$/i })).toBeInTheDocument()
    expect(screen.getByText(/active skills remain selectable/i)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /^skills$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(screen.getByRole('heading', { name: /^create skill$/i })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^skill key$/i, {
        selector: 'input#runtime-skill-editor-key',
      }),
    ).toBeInTheDocument()
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

  it('routes edit actions to the dedicated editor page', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for snapshot/i), 'Edit')

    expect(await screen.findByRole('heading', { name: /^skill editor$/i })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^skill key$/i, {
        selector: 'input#runtime-skill-editor-key',
      }),
    ).toHaveValue('snapshot')
    expect(screen.getByText(/skill id:/i)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /dependency visibility/i }))
    expect(screen.getByRole('heading', { name: /dependency visibility/i })).toBeInTheDocument()
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

  it('deprecates a skill from the row action menu', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for snapshot/i), 'Set Deprecated')

    await waitFor(() => {
      const snapshotRow = screen.getByText('Snapshot').closest('tr')
      expect(snapshotRow).not.toBeNull()
      expect(within(snapshotRow).getByText(/deprecated/i)).toBeInTheDocument()
    })
  })
})
