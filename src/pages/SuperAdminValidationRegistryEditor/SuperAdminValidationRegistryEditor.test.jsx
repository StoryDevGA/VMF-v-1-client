import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminValidationRegistryEditor from './SuperAdminValidationRegistryEditor.jsx'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'
import { __mutateRuntimeControlApiStateForTests } from '../../store/api/runtimeControlApi.js'

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

  it('hydrates default-agent and result metadata for seeded validations', async () => {
    renderPage('/super-admin/runtime-control/validation-registry/validation-required-sections-check')

    expect(await screen.findByRole('heading', { name: /^edit validation$/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('OBJECT')).toBeInTheDocument()
    expect(screen.getByLabelText(/^execution mode$/i)).toHaveDisplayValue('SYNC')
    expect(screen.getByLabelText(/^version$/i)).toHaveValue(1)
    expect(screen.getByLabelText(/^allow manual run$/i)).toBeChecked()
    expect(screen.getByLabelText(/requires latest run/i)).toBeChecked()
    expect(screen.getAllByText(/vmf submit validator agent/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/failed to load agents/i)).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /^usage$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^live json preview$/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/validation registry json preview/i)).toHaveTextContent('"executionMode": "SYNC"')
    expect(screen.queryByRole('button', { name: /^test validation$/i })).not.toBeInTheDocument()
    expect(screen.getByText(/validation console pending/i)).toBeInTheDocument()
  })

  it('uses the compact lock banner pattern for locked validations', async () => {
    __mutateRuntimeControlApiStateForTests((state) => ({
      ...state,
      validationRegistry: state.validationRegistry.map((validation) => (
        validation.id === 'validation-required-sections-check'
          ? {
              ...validation,
              isLocked: true,
              lockedByPackageKeys: ['vmf-qa-manual-951', 'qa-dependency-lock-05031724'],
            }
          : validation
      )),
    }))

    renderPage('/super-admin/runtime-control/validation-registry/validation-required-sections-check')

    expect(await screen.findByRole('heading', { name: /^edit validation$/i })).toBeInTheDocument()

    const banner = screen.getByRole('status', { name: /locked validation notice/i })
    expect(within(banner).getByText(/^locked$/i)).toBeInTheDocument()
    expect(within(banner).getByText(/locked by validated package usage/i)).toBeInTheDocument()
    expect(within(banner).getByText(/clone this validation to make behavior changes/i)).toBeInTheDocument()
    expect(within(banner).getByText('vmf-qa-manual-951')).toBeInTheDocument()
    expect(within(banner).getByText('qa-dependency-lock-05031724')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^clone$/i })).toBeInTheDocument()
  })

  it('keeps the live JSON preview aligned with runtime parameter edits before submit', async () => {
    const user = userEvent.setup()

    renderPage('/super-admin/runtime-control/validation-registry/validation-required-sections-check')

    expect(await screen.findByRole('heading', { name: /^edit validation$/i })).toBeInTheDocument()

    const parameterSchema = screen.getByLabelText(/^parameter schema$/i)
    const defaultParameters = screen.getByLabelText(/^default parameters$/i)
    const retryableErrorCodes = screen.getByLabelText(/^retryable error codes$/i)

    await user.clear(parameterSchema)
    fireEvent.change(parameterSchema, {
      target: { value: '{ "required": ["stage"], "properties": { "stage": { "type": "string" } } }' },
    })
    await user.clear(defaultParameters)
    fireEvent.change(defaultParameters, { target: { value: '{ "stage": "REVIEW_READY" }' } })
    await user.clear(retryableErrorCodes)
    await user.type(retryableErrorCodes, 'timeout, transient')

    const preview = screen.getByLabelText(/validation registry json preview/i)
    expect(preview).toHaveTextContent('"stage": "REVIEW_READY"')
    expect(preview).toHaveTextContent('"retryableErrorCodes"')
    expect(preview).toHaveTextContent('"TIMEOUT"')
    expect(preview).toHaveTextContent('"TRANSIENT"')
  })

  it('quick-fills descendant runtime output paths from the selected output path', async () => {
    const user = userEvent.setup()

    renderPage('/super-admin/runtime-control/validation-registry/validation-required-sections-check')

    expect(await screen.findByRole('heading', { name: /^edit validation$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /details: \.message/i }))
    await user.click(screen.getByRole('button', { name: /message: \.message/i }))

    expect(
      screen.getAllByText('framework_state.validation.required_sections.message').length,
    ).toBeGreaterThan(0)
    expect(screen.getByLabelText(/validation registry json preview/i)).toHaveTextContent(
      '"detailsFieldPath": "framework_state.validation.required_sections.message"',
    )
    expect(screen.getByLabelText(/validation registry json preview/i)).toHaveTextContent(
      '"messageFieldPath": "framework_state.validation.required_sections.message"',
    )
  })

  it('shows a local warning when selected default agents are no longer framework-compatible', async () => {
    const user = userEvent.setup()

    renderPage('/super-admin/runtime-control/validation-registry/validation-required-sections-check')

    expect(await screen.findByRole('heading', { name: /^edit validation$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^remove vmf$/i }))
    await user.selectOptions(
      screen.getByLabelText(/^add framework$/i, { selector: 'select#validation-registry-editor-framework-add' }),
      'RLD',
    )
    await user.click(screen.getByRole('button', { name: /^add framework$/i }))

    expect(await screen.findByText(/review required/i)).toBeInTheDocument()
    expect(screen.getByText(/does not support framework: rld/i)).toBeInTheDocument()
  })
})
