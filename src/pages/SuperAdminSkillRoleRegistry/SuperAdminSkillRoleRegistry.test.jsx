import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SuperAdminSkillRoleRegistry from './SuperAdminSkillRoleRegistry.jsx'

const navigateMock = vi.fn()

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
  useUpdateSkillRoleMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('./useSkillRoleRegistryManagement.js', () => ({
  useSkillRoleRegistryManagement: () => ({
    search: '',
    setSearch: vi.fn(),
    statusFilter: '',
    setStatusFilter: vi.fn(),
    setPage: vi.fn(),
    rows: [],
    currentPage: 1,
    totalPages: 1,
    isListLoading: false,
    isListFetching: false,
    listAppError: null,
  }),
}))

describe('SuperAdminSkillRoleRegistry', () => {
  it('renders the skill role registry catalogue shell', () => {
    render(<SuperAdminSkillRoleRegistry />)

    expect(screen.getByRole('heading', { name: /skill roles/i })).toBeInTheDocument()
    expect(screen.getByText(/governed skill role registry/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument()

    expect(screen.getByRole('columnheader', { name: /skill role/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /description/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument()
  })
})

