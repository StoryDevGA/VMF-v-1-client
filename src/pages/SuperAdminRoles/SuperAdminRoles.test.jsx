import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider } from '../../components/Toaster'
import SuperAdminRoles from './SuperAdminRoles'

vi.mock('../../store/api/roleApi.js', () => ({
  getRoleRows: (result) => result?.data?.data ?? result?.data ?? [],
  useListRolesQuery: vi.fn(),
  useGetPermissionCatalogueQuery: vi.fn(),
  useCreateRoleMutation: vi.fn(),
  useGetRoleQuery: vi.fn(),
  useUpdateRoleMutation: vi.fn(),
  useDeleteRoleMutation: vi.fn(),
}))

import {
  useListRolesQuery,
  useGetPermissionCatalogueQuery,
  useCreateRoleMutation,
  useGetRoleQuery,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from '../../store/api/roleApi.js'

const createRoleMock = vi.fn()
const updateRoleMock = vi.fn()
const deleteRoleMock = vi.fn()

const roleRows = [
  {
    id: 'role-super-admin',
    key: 'SUPER_ADMIN',
    name: 'Super Admin',
    scope: 'PLATFORM',
    isSystem: true,
    isActive: true,
    permissions: ['PLATFORM_MANAGE'],
  },
  {
    id: 'role-user',
    key: 'USER',
    name: 'User',
    scope: 'TENANT',
    isSystem: true,
    isActive: true,
    permissions: [],
  },
  {
    id: 'role-tenant-admin',
    key: 'TENANT_ADMIN',
    name: 'Tenant Admin',
    scope: 'TENANT',
    isSystem: true,
    isActive: true,
    permissions: ['TENANT_VIEW'],
  },
  {
    id: 'role-customer-admin',
    key: 'CUSTOMER_ADMIN',
    name: 'Customer Admin',
    scope: 'CUSTOMER',
    isSystem: true,
    isActive: true,
    permissions: ['CUSTOMER_VIEW'],
  },
  {
    id: 'role-custom',
    key: 'VMF_CREATOR',
    name: 'VMF Creator',
    scope: 'CUSTOMER',
    isSystem: false,
    isActive: false,
    permissions: ['CUSTOMER_VIEW'],
  },
]

const permissionGroups = [
  {
    groupKey: 'PLATFORM_MANAGEMENT',
    groupLabel: 'Platform Management',
    permissions: [
      {
        key: 'PLATFORM_MANAGE',
        label: 'Manage Platform',
        description: 'Manage platform workflows.',
      },
    ],
  },
  {
    groupKey: 'CUSTOMER_MANAGEMENT',
    groupLabel: 'Customer Management',
    permissions: [
      {
        key: 'CUSTOMER_VIEW',
        label: 'View Customers',
        description: 'View customer records.',
      },
    ],
  },
  {
    groupKey: 'USER_MANAGEMENT',
    groupLabel: 'User Management',
    permissions: [
      {
        key: 'USER_VIEW',
        label: 'View Users',
        description: 'View user records.',
      },
    ],
  },
]

function renderPage() {
  return render(
    <ToasterProvider>
      <SuperAdminRoles />
    </ToasterProvider>,
  )
}

describe('SuperAdminRoles page', () => {
  beforeEach(() => {
    const emptyRoleResponse = {
      data: null,
      isFetching: false,
      error: null,
    }
    const selectedRoleResponse = {
      data: {
        data: {
          id: 'role-custom',
          key: 'VMF_CREATOR',
          name: 'VMF Creator',
          description: 'Custom role description',
          scope: 'CUSTOMER',
          permissions: ['CUSTOMER_VIEW'],
          isSystem: false,
          isActive: false,
        },
      },
      isFetching: false,
      error: null,
    }

    vi.clearAllMocks()
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }

    useListRolesQuery.mockImplementation((args = {}, options = {}) => {
      if (options?.skip) {
        return {
          data: null,
          isLoading: false,
          isFetching: false,
          error: null,
        }
      }

      return {
        data: {
          data: roleRows,
          meta: {
            page: Number(args.page ?? 1),
            totalPages: 1,
            total: roleRows.length,
          },
        },
        isLoading: false,
        isFetching: false,
        error: null,
      }
    })

    useGetPermissionCatalogueQuery.mockReturnValue({
      data: {
        data: permissionGroups,
      },
    })

    createRoleMock.mockReset()
    createRoleMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { _id: 'role-1' } }),
    })
    useCreateRoleMutation.mockReturnValue([createRoleMock, { isLoading: false }])

    updateRoleMock.mockReset()
    updateRoleMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    useUpdateRoleMutation.mockReturnValue([updateRoleMock, { isLoading: false }])

    deleteRoleMock.mockReset()
    deleteRoleMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    useDeleteRoleMutation.mockReturnValue([deleteRoleMock, { isLoading: false }])

    useGetRoleQuery.mockImplementation((roleId, options = {}) => {
      if (options?.skip || !roleId) {
        return emptyRoleResponse
      }

      return selectedRoleResponse
    })
  })

  it('renders the matrix-first roles page and uses the matrix role query', () => {
    const { container } = renderPage()
    const title = screen.getByRole('heading', { name: /role permissions/i })
    const subtitle = screen.getByText(/review seeded and custom role definitions/i)

    expect(title).toBeInTheDocument()
    expect(window.getComputedStyle(title).fontSize).toBe('var(--font-size-2xl)')
    expect(window.getComputedStyle(subtitle).fontSize).toBe('var(--font-size-base)')
    expect(screen.getByRole('button', { name: /\+ new role/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/search permissions/i)).toBeInTheDocument()
    expect(
      screen.getByText(/runtime api authorization still follows fixed role-key checks/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Manage Platform')).toBeInTheDocument()
    expect(screen.getByText('View Customers')).toBeInTheDocument()
    expect(screen.getByText('View Users')).toBeInTheDocument()
    expect(screen.getByText('Super Admin')).toBeInTheDocument()
    expect(screen.getByText('User')).toBeInTheDocument()
    expect(screen.getByText('Tenant Admin')).toBeInTheDocument()
    expect(screen.getByText('Customer Admin')).toBeInTheDocument()
    expect(screen.getByText('VMF Creator')).toBeInTheDocument()
    expect(screen.getByText('Default permissions locked')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(
      screen.getAllByText(/^(User|Tenant Admin|Customer Admin|Super Admin|VMF Creator)$/).map(
        (node) => node.textContent,
      ),
    ).toEqual(['User', 'Tenant Admin', 'Customer Admin', 'Super Admin', 'VMF Creator'])

    expect(
      useListRolesQuery.mock.calls.some(
        ([args, options]) => args?.page === 1 && args?.pageSize === 100 && options === undefined,
      ),
    ).toBe(true)
    expect(useListRolesQuery).toHaveBeenCalledTimes(1)
    expect(
      window.getComputedStyle(container.querySelector('.super-admin-roles__matrix-wrap')).overflow,
    ).toBe('visible')
  })

  it('opens and resets the create dialog from the matrix action bar', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /\+ new role/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: /create role/i })).toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/permissions/i)).not.toBeInTheDocument()
    expect(
      within(dialog).getByText(/permissions are assigned from the matrix after the role is created/i),
    ).toBeInTheDocument()

    await user.type(
      within(dialog).getByLabelText(/role key/i, { selector: 'input#role-create-key' }),
      'temp_role',
    )
    await user.type(
      within(dialog).getByLabelText(/name/i, { selector: 'input#role-create-name' }),
      'Temporary Role',
    )

    await user.click(within(dialog).getByRole('button', { name: /^back$/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /\+ new role/i }))

    const reopenedDialog = screen.getByRole('dialog')
    expect(
      within(reopenedDialog).getByLabelText(/role key/i, { selector: 'input#role-create-key' }),
    ).toHaveValue('')
    expect(
      within(reopenedDialog).getByLabelText(/name/i, { selector: 'input#role-create-name' }),
    ).toHaveValue('')
  })

  it('creates new roles with an empty permissions array because the matrix owns permissions', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /\+ new role/i }))

    const dialog = screen.getByRole('dialog')
    await user.type(
      within(dialog).getByLabelText(/role key/i, { selector: 'input#role-create-key' }),
      'vmf creator',
    )
    await user.type(
      within(dialog).getByLabelText(/name/i, { selector: 'input#role-create-name' }),
      'VMF Creator',
    )

    await user.click(within(dialog).getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(createRoleMock).toHaveBeenCalledWith({
        key: 'VMF_CREATOR',
        name: 'VMF Creator',
        scope: 'CUSTOMER',
        permissions: [],
        isActive: true,
      })
    })
  })

  it('locks only seeded super-admin permissions and leaves other permissions editable', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(
      screen.getByRole('switch', { name: /manage platform for super admin/i }),
    ).toBeDisabled()
    expect(
      screen.getByRole('switch', { name: /view users for super admin/i }),
    ).not.toBeDisabled()

    await user.click(
      screen.getByRole('switch', { name: /view users for super admin/i }),
    )

    await user.click(
      screen.getByRole('switch', { name: /view customers for user/i }),
    )

    await waitFor(() => {
      expect(updateRoleMock).toHaveBeenNthCalledWith(1, {
        roleId: 'role-super-admin',
        permissions: ['PLATFORM_MANAGE', 'USER_VIEW'],
      })
      expect(updateRoleMock).toHaveBeenNthCalledWith(2, {
        roleId: 'role-user',
        permissions: ['CUSTOMER_VIEW'],
      })
    })
  })

  it('opens the edit dialog from the custom-role matrix header without a permissions field', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(
      screen.queryByRole('combobox', { name: /actions for super admin/i }),
    ).not.toBeInTheDocument()

    const customRoleActions = screen.getByRole('combobox', { name: /actions for vmf creator/i })

    await user.click(customRoleActions)
    await user.click(screen.getByRole('option', { name: 'Edit' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: /update role/i })).toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/permissions/i)).not.toBeInTheDocument()
    expect(
      within(dialog).getByText(/permissions are managed from the role matrix on the main page/i),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByLabelText(/name/i, { selector: 'input#role-edit-name' }),
    ).toHaveValue('VMF Creator')
    await user.click(within(dialog).getByRole('button', { name: /^back$/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('opens the delete action from the custom-role matrix header', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(
      screen.queryByRole('combobox', { name: /actions for super admin/i }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: /actions for vmf creator/i }))
    await user.click(screen.getByRole('option', { name: 'Delete' }))

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(deleteRoleMock).toHaveBeenCalledWith({
        roleId: 'role-custom',
      })
    })
  })

  it('renders error and empty states when the matrix query fails', () => {
    useListRolesQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: {
        status: 500,
        data: {
          error: {
            code: 'SERVER_ERROR',
            message: 'Unable to load roles.',
          },
        },
      },
    })

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent(/unable to load roles/i)
    expect(screen.getByText(/no roles available/i)).toBeInTheDocument()
  })

  it('filters permission rows from the search toolbar and keeps inactive roles visible', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByText('VMF Creator')).toBeInTheDocument()
    expect(screen.getByText('Manage Platform')).toBeInTheDocument()
    expect(screen.getByText('View Customers')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/search permissions/i), 'platform')

    expect(screen.getByText('Manage Platform')).toBeInTheDocument()
    expect(screen.queryByText('View Customers')).not.toBeInTheDocument()
    expect(screen.queryByText('Customer Management')).not.toBeInTheDocument()
  })
})
