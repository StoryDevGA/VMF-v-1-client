import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminRuntimePathRegistry from './SuperAdminRuntimePathRegistry.jsx'

const navigateMock = vi.fn()
const runtimePathRows = [
  {
    id: 'path-test-row',
    pathKey: 'framework_state.test.path',
    label: 'Test Runtime Path',
    description: 'A runtime path used by catalogue tests.',
    status: 'ACTIVE',
    frameworkKeys: ['VMF'],
    allowedOperations: ['READ'],
    scope: 'FRAMEWORK_STATE',
    category: 'SYSTEM',
    dataType: 'STRING',
    sourceType: 'DERIVED',
    isProtected: false,
    isSystem: false,
    updatedAt: '2026-04-26T12:00:00.000Z',
  },
]

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../components/Toaster', () => ({
  useToaster: () => ({ addToast: vi.fn() }),
}))

vi.mock('../../store/api/runtimeControlApi.js', () => ({
  useActivateRuntimePathMutation: () => [vi.fn(), { isLoading: false }],
  useDisableRuntimePathMutation: () => [vi.fn(), { isLoading: false }],
  useDeprecateRuntimePathMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('./useRuntimePathRegistryManagement.js', () => ({
  useRuntimePathRegistryManagement: () => ({
    search: '',
    setSearch: vi.fn(),
    statusFilter: '',
    setStatusFilter: vi.fn(),
    operationFilter: '',
    setOperationFilter: vi.fn(),
    protectedFilter: '',
    setProtectedFilter: vi.fn(),
    setPage: vi.fn(),
    rows: runtimePathRows,
    currentPage: 1,
    totalPages: 1,
    isListLoading: false,
    isListFetching: false,
    listAppError: null,
  }),
}))

describe('SuperAdminRuntimePathRegistry', () => {
  beforeEach(() => {
    navigateMock.mockClear()
  })

  it('renders the runtime paths catalogue shell without placeholder artifacts', () => {
    render(<SuperAdminRuntimePathRegistry />)

    expect(screen.getByRole('heading', { name: /runtime paths/i })).toBeInTheDocument()
    expect(screen.getByText(/review the governed runtime path registry/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument()
    expect(screen.queryByText(/^XXX$/)).not.toBeInTheDocument()

    expect(screen.getByRole('columnheader', { name: /flags/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /schema/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/actions for test runtime path/i)).toBeInTheDocument()
  })

  it('uses the compact row action select pattern for edit and duplicate actions', async () => {
    const user = userEvent.setup()
    render(<SuperAdminRuntimePathRegistry />)

    const actionSelect = screen.getByLabelText(/actions for test runtime path/i)

    await user.selectOptions(actionSelect, 'Edit')
    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/runtime-paths/path-test-row/edit')

    await user.selectOptions(actionSelect, 'Duplicate')
    expect(navigateMock).toHaveBeenCalledWith(
      '/super-admin/runtime-control/runtime-paths/new?duplicateFrom=path-test-row',
    )
  })
})
