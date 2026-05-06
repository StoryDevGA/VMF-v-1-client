import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminSkillRoleEditor from './SuperAdminSkillRoleEditor.jsx'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'

function renderPage(initialRoute) {
  return renderRuntimeControlPage({
    route: initialRoute,
    routes: [
      {
        path: '/super-admin/runtime-control/skill-roles/new',
        element: <SuperAdminSkillRoleEditor />,
      },
      {
        path: '/super-admin/runtime-control/skill-roles/:roleId',
        element: <SuperAdminSkillRoleEditor />,
      },
    ],
  })
}

describe('SuperAdminSkillRoleEditor page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('clears the create form after a successful submission', async () => {
    const user = userEvent.setup()
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        cb()
        return 0
      })

    renderPage('/super-admin/runtime-control/skill-roles/new')

    expect(screen.getByRole('heading', { name: /^create skill role$/i })).toBeInTheDocument()

    const roleKeyInput = screen.getByLabelText(/^role key/i, {
      selector: 'input#skill-role-editor-role-key',
    })
    const statusSelect = screen.getByLabelText(/^status/i, {
      selector: 'select#skill-role-editor-status',
    })
    const labelInput = screen.getByLabelText(/^label/i, {
      selector: 'input#skill-role-editor-label',
    })
    const descriptionInput = screen.getByLabelText(/^description/i, {
      selector: 'textarea#skill-role-editor-description',
    })

    await user.type(roleKeyInput, 'test_helper')
    await user.type(labelInput, 'Test helper')
    await user.type(descriptionInput, 'Helper role for tests.')
    await user.selectOptions(statusSelect, 'ACTIVE')

    await user.click(screen.getByRole('button', { name: /^create role$/i }))

    await waitFor(() => {
      expect(roleKeyInput).toHaveValue('')
      expect(labelInput).toHaveValue('')
      expect(descriptionInput).toHaveValue('')
    })

    expect(statusSelect).toHaveValue('DRAFT')
    expect(document.activeElement).toBe(roleKeyInput)

    rafSpy.mockRestore()
  })

  it('warns before deprecating an in-use skill role from the editor', async () => {
    const user = userEvent.setup()

    renderPage('/super-admin/runtime-control/skill-roles/role-validator')

    expect(await screen.findByRole('heading', { name: /^edit skill role$/i })).toBeInTheDocument()
    expect(await screen.findByText(/skills using/i)).toBeInTheDocument()

    const statusSelect = await screen.findByLabelText(/^status/i, {
      selector: 'select#skill-role-editor-status',
    })

    await user.selectOptions(statusSelect, 'DEPRECATED')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByRole('heading', { name: /deprecate skill role/i })).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByText(/currently used by/i)).toBeInTheDocument()
    expect(
      within(screen.getByRole('dialog')).getByText(/will block new assignments but will not remove existing references/i),
    ).toBeInTheDocument()
  })

  it('keeps clone forms editable when the source skill role is locked', async () => {
    const user = userEvent.setup()

    renderPage('/super-admin/runtime-control/skill-roles/new?cloneFrom=role-validator')

    expect(await screen.findByRole('heading', { name: /^clone skill role$/i })).toBeInTheDocument()

    const roleKeyInput = await screen.findByLabelText(/^role key/i, {
      selector: 'input#skill-role-editor-role-key',
    })
    const labelInput = screen.getByLabelText(/^label/i, {
      selector: 'input#skill-role-editor-label',
    })
    const statusSelect = screen.getByLabelText(/^status/i, {
      selector: 'select#skill-role-editor-status',
    })

    expect(roleKeyInput).toBeEnabled()
    expect(labelInput).toBeEnabled()
    expect(statusSelect).toBeEnabled()
    expect(screen.queryByText(/referenced by validated or active framework packages/i)).not.toBeInTheDocument()

    await user.clear(roleKeyInput)
    await user.type(roleKeyInput, 'VALIDATOR_CLONE_FOR_TEST')

    expect(screen.getByRole('button', { name: /^save clone$/i })).toBeEnabled()
  })
})
