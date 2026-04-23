import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminValidationRegistryEditor from './SuperAdminValidationRegistryEditor.jsx'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'

function renderPage(initialRoute) {
  return renderRuntimeControlPage({
    route: initialRoute,
    routes: [
      {
        path: '/super-admin/runtime-control/validation-registry/new',
        element: <SuperAdminValidationRegistryEditor />,
      },
      {
        path: '/super-admin/runtime-control/validation-registry/:validationId',
        element: <SuperAdminValidationRegistryEditor />,
      },
    ],
  })
}

describe('SuperAdminValidationRegistryEditor page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('shows client validation errors when required fields are missing', async () => {
    const user = userEvent.setup()

    renderPage('/super-admin/runtime-control/validation-registry/new')

    expect(screen.getByRole('heading', { name: /^create validation$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^create validation$/i }))

    expect(await screen.findByText(/key is required/i)).toBeInTheDocument()
    expect(screen.getByText(/label is required/i)).toBeInTheDocument()
    expect(screen.getByText(/description is required/i)).toBeInTheDocument()
    expect(screen.getByText(/select at least one supported framework/i)).toBeInTheDocument()
    expect(screen.getByText(/producer skill is required/i)).toBeInTheDocument()
    expect(screen.getByText(/output path is required/i)).toBeInTheDocument()
  })

  it('warns before deprecating an in-use validation from the editor', async () => {
    const user = userEvent.setup()

    renderPage('/super-admin/runtime-control/validation-registry/validation-required-sections-check')

    expect(await screen.findByRole('heading', { name: /^edit validation$/i })).toBeInTheDocument()

    const statusSelect = await screen.findByLabelText(/^status/i, {
      selector: 'select#validation-registry-editor-status',
    })

    await user.selectOptions(statusSelect, 'DEPRECATED')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByRole('heading', { name: /deprecate validation/i })).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByText(/currently referenced by/i)).toBeInTheDocument()
    expect(
      within(screen.getByRole('dialog')).getByText(/will block new assignments but will not remove existing references/i),
    ).toBeInTheDocument()
  })
})
