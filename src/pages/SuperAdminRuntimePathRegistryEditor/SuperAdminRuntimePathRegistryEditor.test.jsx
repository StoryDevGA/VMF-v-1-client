import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminRuntimePathRegistryEditor from './SuperAdminRuntimePathRegistryEditor.jsx'

const navigateMock = vi.fn()
let paramsMock = {}
let runtimePathQueryMock = { data: null, isLoading: false, error: null }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => paramsMock,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  }
})

vi.mock('../../components/Toaster', () => ({
  useToaster: () => ({ addToast: vi.fn() }),
}))

vi.mock('../../store/api/runtimeControlApi.js', () => ({
  useCreateRuntimePathMutation: () => [vi.fn(), { isLoading: false }],
  useDuplicateRuntimePathMutation: () => [vi.fn(), { isLoading: false }],
  useGetRuntimePathDependenciesQuery: () => ({ data: null, isLoading: false, error: null }),
  useGetRuntimePathQuery: (_id, options = {}) => (options.skip ? { data: null, isLoading: false, error: null } : runtimePathQueryMock),
  useListFrameworkRegistriesQuery: () => ({
    data: { data: [{ frameworkKey: 'VMF', status: 'ACTIVE' }] },
    error: null,
  }),
  useUpdateRuntimePathMutation: () => [vi.fn(), { isLoading: false }],
}))

describe('SuperAdminRuntimePathRegistryEditor', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    paramsMock = {}
    runtimePathQueryMock = { data: null, isLoading: false, error: null }
  })

  it('renders the create editor shell with governed fields', async () => {
    const user = userEvent.setup()
    const { container } = render(<SuperAdminRuntimePathRegistryEditor />)

    expect(screen.getByRole('heading', { name: /create runtime path/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /basic information/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /path key/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument()
    expect(
      container.querySelector(
        '.super-admin-runtime-path-registry-editor__field-label[for="runtime-path-editor-status"]',
      ),
    ).toBeInTheDocument()
    expect(container.querySelector('.input-label')).not.toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: /runtime path editor sections/i }).closest('.tabview')).toHaveClass(
      'tabview--pills',
      'tabview--sm',
      'tabview--even-tabs',
    )
    expect(screen.queryByRole('tab', { name: /^overview$/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^framework compatibility$/i }))
    expect(screen.getByRole('button', { name: /^add framework$/i })).toHaveClass(
      'super-admin-runtime-path-registry-editor__framework-add-button',
    )

    await user.click(screen.getByRole('tab', { name: /^schema & ui$/i }))
    expect(screen.getByRole('combobox', { name: /^category \*$/i })).toHaveDisplayValue('STATE')
    expect(screen.getByRole('option', { name: /^POLICY$/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^WORKFLOW$/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^AUDIT$/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^NOTIFICATION$/i })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /create path/i })).toBeInTheDocument()
    expect(screen.queryByText(/^XXX$/)).not.toBeInTheDocument()
  })

  it('maps persisted runtime path records into the edit UI', async () => {
    const user = userEvent.setup()
    paramsMock = { pathId: 'path-framework-state-metadata-tenant-id-1y5pv6y' }
    runtimePathQueryMock = {
      data: {
        data: {
          id: 'path-framework-state-metadata-tenant-id-1y5pv6y',
          stableId: 'path-framework-state-metadata-tenant-id-1y5pv6y',
          pathKey: 'framework_state.metadata.tenant_id',
          label: 'Tenant ID',
          description: 'Tenant ID runtime path for VMF v2.3.1.',
          status: 'ACTIVE',
          frameworkKeys: ['VMF'],
          scope: 'FRAMEWORK_STATE',
          allowedOperations: ['READ', 'BIND'],
          dataType: 'STRING',
          category: 'METADATA',
          sourceType: 'RUNTIME_STATE',
          isProtected: false,
          isSystem: true,
          introducedInVersion: '2.3.1',
          exampleValue: '',
          compatibilityTags: ['VMF', '2.3.1'],
          uiControl: 'TEXT',
          createdAt: '2026-04-24T17:21:22.100Z',
          updatedAt: '2026-04-24T17:21:22.100Z',
        },
      },
      isLoading: false,
      error: null,
    }

    render(<SuperAdminRuntimePathRegistryEditor />)

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /path key/i })).toHaveValue('framework_state.metadata.tenant_id')
    })

    expect(screen.getByRole('textbox', { name: /label/i })).toHaveValue('Tenant ID')

    await user.click(screen.getByRole('tab', { name: /^schema & ui$/i }))
    expect(screen.getByRole('combobox', { name: /^category \*$/i })).toHaveDisplayValue('METADATA')
    expect(screen.getByRole('combobox', { name: /^source type \*$/i })).toHaveDisplayValue('RUNTIME_STATE')
    expect(screen.getByRole('combobox', { name: /^ui control$/i })).toHaveDisplayValue('TEXT')

    await user.click(screen.getByRole('tab', { name: /^json & notes$/i }))
    const currentRecord = screen.getByLabelText(/current runtime path record json/i)
    expect(currentRecord).toHaveTextContent('"stableId": "path-framework-state-metadata-tenant-id-1y5pv6y"')
    expect(currentRecord).toHaveTextContent('"createdAt": "2026-04-24T17:21:22.100Z"')
  })
})
