import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminSkillRoleRegistry from './SuperAdminSkillRoleRegistry.jsx'

const navigateMock = vi.fn()
const addToastMock = vi.fn()
const updateSkillRoleMock = vi.fn()
const managementMock = {
  search: '',
  setSearch: vi.fn(),
  statusFilter: '',
  setStatusFilter: vi.fn(),
  sortValue: 'updatedAt:desc',
  setSortValue: vi.fn(),
  setPage: vi.fn(),
  rows: [
    {
      id: 'role-validator',
      roleKey: 'VALIDATOR',
      label: 'Validator',
      description: 'Evaluates correctness.',
      status: 'ACTIVE',
      isSystem: true,
      usageCount: 3,
      updatedAt: '2026-04-20T10:00:00.000Z',
    },
  ],
  currentPage: 1,
  totalPages: 1,
  isListLoading: false,
  isListFetching: false,
  listAppError: null,
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../components/Toaster', () => ({
  useToaster: () => ({ addToast: addToastMock }),
}))

vi.mock('../../store/api/runtimeControlApi.js', () => ({
  useUpdateSkillRoleMutation: () => [
    updateSkillRoleMock,
    { isLoading: false },
  ],
}))

vi.mock('./useSkillRoleRegistryManagement.js', () => ({
  useSkillRoleRegistryManagement: () => managementMock,
}))

describe('SuperAdminSkillRoleRegistry', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    addToastMock.mockReset()
    updateSkillRoleMock.mockReset()
    updateSkillRoleMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          roleKey: 'VALIDATOR',
        },
      }),
    })
    HTMLDialogElement.prototype.showModal = vi.fn(function showModalMock() {
      this.open = true
    })
    HTMLDialogElement.prototype.close = vi.fn(function closeMock() {
      this.open = false
    })
  })

  it('renders the skill role registry catalogue shell', () => {
    render(<SuperAdminSkillRoleRegistry />)

    expect(screen.getByRole('heading', { name: /skill roles/i })).toBeInTheDocument()
    expect(screen.getByText(/governed skill role registry/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument()

    expect(screen.getByRole('columnheader', { name: /skill role/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /description/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /skills using/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument()
    expect(screen.getByText('SYSTEM')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('warns before deprecating a skill role that is still in use', async () => {
    const user = userEvent.setup()
    render(<SuperAdminSkillRoleRegistry />)

    await user.selectOptions(
      screen.getByLabelText(/actions for validator/i),
      'Set Deprecated',
    )

    expect(screen.getByRole('heading', { name: /deprecate skill role/i })).toBeInTheDocument()
    expect(screen.getByText(/used by 3 skills/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /deprecate role/i }))

    await waitFor(() => {
      expect(updateSkillRoleMock).toHaveBeenCalledWith({
        roleId: 'role-validator',
        status: 'DEPRECATED',
      })
    })
  })
})
