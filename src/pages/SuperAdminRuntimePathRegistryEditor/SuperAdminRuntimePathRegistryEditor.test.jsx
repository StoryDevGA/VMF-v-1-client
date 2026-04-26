import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminRuntimePathRegistryEditor from './SuperAdminRuntimePathRegistryEditor.jsx'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
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
  useGetRuntimePathQuery: () => ({ data: null, isLoading: false, error: null }),
  useListFrameworkRegistriesQuery: () => ({
    data: { data: [{ frameworkKey: 'VMF', status: 'ACTIVE' }] },
    error: null,
  }),
  useUpdateRuntimePathMutation: () => [vi.fn(), { isLoading: false }],
}))

describe('SuperAdminRuntimePathRegistryEditor', () => {
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

    expect(screen.getByRole('button', { name: /create path/i })).toBeInTheDocument()
    expect(screen.queryByText(/^XXX$/)).not.toBeInTheDocument()
  })
})
