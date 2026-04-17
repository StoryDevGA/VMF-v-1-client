import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SuperAdminRuntimePathRegistry from './SuperAdminRuntimePathRegistry.jsx'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

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
    rows: [],
    currentPage: 1,
    totalPages: 1,
    isListLoading: false,
    isListFetching: false,
    listAppError: null,
  }),
}))

describe('SuperAdminRuntimePathRegistry', () => {
  it('renders the runtime paths catalogue shell without placeholder artifacts', () => {
    render(<SuperAdminRuntimePathRegistry />)

    expect(screen.getByRole('heading', { name: /runtime paths/i })).toBeInTheDocument()
    expect(screen.getByText(/review the governed runtime path registry/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()
    expect(screen.queryByText(/^XXX$/)).not.toBeInTheDocument()
  })
})
