import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider } from '../../components/Toaster'
import SuperAdminRoles from './SuperAdminRoles'

vi.mock('../../store/api/roleApi.js', () => ({
  useListRolesQuery: vi.fn(),
  useCreateRoleMutation: vi.fn(),
  useGetRoleQuery: vi.fn(),
  useUpdateRoleMutation: vi.fn(),
  useDeleteRoleMutation: vi.fn(),
}))

import {
  useListRolesQuery,
  useCreateRoleMutation,
  useGetRoleQuery,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from '../../store/api/roleApi.js'

const createRoleMock = vi.fn()
const deleteRoleMock = vi.fn()

function renderPage() {
  return render(
    <ToasterProvider>
      <SuperAdminRoles />
    </ToasterProvider>,
  )
}

describe('SuperAdminRoles page', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useListRolesQuery.mockReturnValue({
      data: { data: [], meta: { page: 1, totalPages: 1, total: 0 } },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    createRoleMock.mockReset()
    createRoleMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { _id: 'role-1' } }),
    })
    useCreateRoleMutation.mockReturnValue([createRoleMock, { isLoading: false }])

    deleteRoleMock.mockReset()
    deleteRoleMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    useDeleteRoleMutation.mockReturnValue([deleteRoleMock, { isLoading: false }])

    useGetRoleQuery.mockReturnValue({
      data: null,
      isFetching: false,
      error: null,
    })

    useUpdateRoleMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('renders heading and opens create dialog from catalogue action', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { name: /role definitions/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(
      screen.getByLabelText(/role key/i, { selector: 'input#role-create-key' }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/name/i, { selector: 'input#role-create-name' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to role definitions/i })).toBeInTheDocument()
  })

  it('normalizes key and permissions before create submit', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    await user.type(
      screen.getByLabelText(/role key/i, { selector: 'input#role-create-key' }),
      'vmf creator',
    )
    await user.type(
      screen.getByLabelText(/name/i, { selector: 'input#role-create-name' }),
      'VMF Creator',
    )
    fireEvent.change(screen.getByLabelText(/permissions/i, { selector: 'textarea#role-create-permissions' }), {
      target: { value: 'read,write' },
    })

    await user.click(screen.getByRole('button', { name: /create role/i }))

    await waitFor(() => {
      expect(createRoleMock).toHaveBeenCalledTimes(1)
    })

    expect(createRoleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'VMF_CREATOR',
        name: 'VMF Creator',
        permissions: ['READ', 'WRITE'],
      }),
    )
  })

  it('shows protected system roles without edit actions and exposes full permissions', async () => {
    const user = userEvent.setup()

    useListRolesQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'role-system',
            key: 'SUPER_ADMIN',
            name: 'Super Admin',
            scope: 'PLATFORM',
            isSystem: true,
            isActive: true,
            permissions: ['READ'],
            updatedAt: '2026-03-24T10:00:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    expect(screen.getByText(/^protected$/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/actions for super admin/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /view all \(1\) permissions for super admin/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: /role permissions/i })).toBeInTheDocument()
    expect(within(dialog).getByText('READ')).toBeInTheDocument()
    expect(within(dialog).getByText('SUPER_ADMIN')).toBeInTheDocument()
  })

  it('surfaces role-in-use conflict guidance on delete', async () => {
    const user = userEvent.setup()

    useListRolesQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'role-custom',
            key: 'VMF_CREATOR',
            name: 'VMF Creator',
            scope: 'CUSTOMER',
            isSystem: false,
            isActive: true,
            permissions: ['READ'],
            updatedAt: '2026-03-24T10:00:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    deleteRoleMock.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'CONFLICT',
            message: 'Role cannot be deleted while assigned to users.',
            requestId: 'role-1',
            details: {
              reason: 'ROLE_IN_USE',
              roleKey: 'VMF_CREATOR',
              assignedUserCount: 2,
            },
          },
        },
      }),
    })

    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for vmf creator/i),
      'Delete',
    )

    expect(
      await screen.findByText(
        /role cannot be deleted while assigned to 2 users/i,
      ),
    ).toBeInTheDocument()
  })

  it('opens the update dialog from the row actions menu for custom roles', async () => {
    const user = userEvent.setup()

    useListRolesQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'role-custom',
            key: 'VMF_CREATOR',
            name: 'VMF Creator',
            scope: 'CUSTOMER',
            isSystem: false,
            isActive: true,
            permissions: ['READ', 'WRITE', 'PUBLISH'],
            updatedAt: '2026-03-24T10:00:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for vmf creator/i),
      'Edit',
    )

    expect(screen.getByRole('heading', { name: /update role/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to role definitions/i })).toBeInTheDocument()
  })

  it('opens the permissions dialog with the full permission list from the table cell', async () => {
    const user = userEvent.setup()

    useListRolesQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'role-custom',
            key: 'VMF_CREATOR',
            name: 'VMF Creator',
            scope: 'CUSTOMER',
            isSystem: false,
            isActive: true,
            permissions: ['READ', 'WRITE', 'PUBLISH', 'APPROVE'],
            updatedAt: '2026-03-24T10:00:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /view all \(4\) permissions for vmf creator/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('READ')).toBeInTheDocument()
    expect(within(dialog).getByText('WRITE')).toBeInTheDocument()
    expect(within(dialog).getByText('PUBLISH')).toBeInTheDocument()
    expect(within(dialog).getByText('APPROVE')).toBeInTheDocument()
  })
})
