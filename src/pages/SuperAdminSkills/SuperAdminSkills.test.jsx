import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminSkills from './SuperAdminSkills'
import SuperAdminSkillEditor from '../SuperAdminSkillEditor'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'
import { __mutateRuntimeControlApiStateForTests } from '../../store/api/runtimeControlApi.js'
import { RUNTIME_SKILL_CATEGORY_OPTIONS } from './superAdminSkills.constants.js'

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

function getSkillNameCell(name) {
  return screen
    .getAllByText(name)
    .find((element) => element.classList.contains('super-admin-skills__skill-name'))
}

function querySkillNameCell(name) {
  return screen
    .queryAllByText(name)
    .find((element) => element.classList.contains('super-admin-skills__skill-name')) || null
}

function getSkillKeyCell(key) {
  return screen
    .getAllByText(key)
    .find((element) => element.classList.contains('super-admin-skills__skill-key'))
}

function addSkillPaginationFixtures() {
  __mutateRuntimeControlApiStateForTests((state) => ({
    ...state,
    skills: [
      ...state.skills,
      ...Array.from({ length: 15 }, (_, index) => ({
        ...state.skills[0],
        id: `skill-pagination-${index + 1}`,
        key: `pagination-skill-${index + 1}`,
        name: `Pagination Skill ${index + 1}`,
        description: 'Pagination coverage fixture.',
        supportedFrameworkKeys: ['VMF'],
        updatedAt: `2026-04-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`,
      })),
    ],
  }))
}

describe('SuperAdminSkills page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('keeps the skill category dropdown aligned with backend-controlled categories', () => {
    const categories = new Set(RUNTIME_SKILL_CATEGORY_OPTIONS.map((option) => option.value))

    expect([...categories]).toEqual(expect.arrayContaining([
      'CONSUMPTION',
      'ADVISOR',
      'TRUTH',
      'EVIDENCE',
      'RECOMMENDATION',
      'KNOWLEDGE_PACK',
      'OUTCOME',
    ]))
  })

  it('renders the catalogue-first skills page and routes create actions to the dedicated editor page', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { name: /^skills$/i })).toBeInTheDocument()
    expect(screen.getByText(/active skills remain selectable/i)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /^skills$/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^version$/i })).toBeInTheDocument()
    await waitFor(() => expect(getSkillNameCell('Snapshot')).toBeInTheDocument())
    expect(getSkillNameCell('Snapshot')).toHaveAttribute('title', 'Snapshot')
    expect(getSkillKeyCell('snapshot')).toHaveAttribute('title', 'snapshot')
    expect(screen.getAllByText(/^v1$/i).length).toBeGreaterThan(0)
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
    addSkillPaginationFixtures()
    renderPage()

    expect(await screen.findByText(/page 1 of 3/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^last$/i }))
    expect(await screen.findByText(/page 3 of 3/i)).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(/^framework$/i, {
        selector: 'select#runtime-skill-framework-filter',
      }),
      'RLD',
    )

    await waitFor(() => {
      expect(getSkillNameCell('Snapshot')).toBeInTheDocument()
      expect(getSkillNameCell('Revenue Map')).toBeInTheDocument()
      expect(querySkillNameCell('Review')).not.toBeInTheDocument()
    })

    await user.type(
      screen.getByLabelText(/^search$/i, {
        selector: 'input#runtime-skill-search',
      }),
      'report',
    )

    await waitFor(() => {
      expect(getSkillNameCell('Report')).toBeInTheDocument()
      expect(querySkillNameCell('Snapshot')).not.toBeInTheDocument()
    })
  })

  it('routes edit actions to the dedicated editor page', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for snapshot/i), 'Edit')

    expect(await screen.findByRole('heading', { name: /^skill editor$/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByLabelText(/^skill key$/i, {
          selector: 'input#runtime-skill-editor-key',
        }),
      ).toHaveValue('snapshot')
    })
    expect(screen.getByText(/skill id:/i)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /dependency visibility/i }))
    expect(screen.getByRole('heading', { name: /dependency visibility/i })).toBeInTheDocument()
  })

  it('updates a skill status from the row action menu', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for snapshot/i), 'Set Inactive')

    await waitFor(() => {
      const snapshotRow = getSkillNameCell('Snapshot')?.closest('tr')
      expect(snapshotRow).not.toBeNull()
      expect(within(snapshotRow).getByLabelText(/status: inactive/i)).toBeInTheDocument()
    })
  })

  it('routes clone actions to the dedicated clone editor page', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for snapshot/i), 'Clone')

    expect(await screen.findByRole('heading', { name: /^clone skill$/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByLabelText(/^skill name$/i, {
          selector: 'input#runtime-skill-editor-name',
        }),
      ).toHaveValue('Snapshot Clone')
    })
    expect(
      screen.getByLabelText(/^skill key$/i, {
        selector: 'input#runtime-skill-editor-key',
      }),
    ).toHaveValue('')
  })

  it('deprecates a skill from the row action menu', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText(/actions for snapshot/i), 'Set Deprecated')

    await waitFor(() => {
      const snapshotRow = getSkillNameCell('Snapshot')?.closest('tr')
      expect(snapshotRow).not.toBeNull()
      expect(within(snapshotRow).getByText(/deprecated/i)).toBeInTheDocument()
    })
  })
})
