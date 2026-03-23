import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import TenantLinkedUsersWorkspace from './TenantLinkedUsersWorkspace'

const {
  mockUseAuthorization,
  mockUseTenantContext,
  mockUseUsers,
  mockUseListTenantsQuery,
  mockUseLazyListTenantsQuery,
  mockUseLazyListUsersQuery,
} = vi.hoisted(() => ({
  mockUseAuthorization: vi.fn(),
  mockUseTenantContext: vi.fn(),
  mockUseUsers: vi.fn(),
  mockUseListTenantsQuery: vi.fn(),
  mockUseLazyListTenantsQuery: vi.fn(),
  mockUseLazyListUsersQuery: vi.fn(),
}))

vi.mock('../../hooks/useAuthorization.js', () => ({
  useAuthorization: (...args) => mockUseAuthorization(...args),
}))

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: (...args) => mockUseTenantContext(...args),
}))

vi.mock('../../hooks/useUsers.js', () => ({
  useUsers: (...args) => mockUseUsers(...args),
}))

vi.mock('../../store/api/tenantApi.js', () => ({
  useListTenantsQuery: (...args) => mockUseListTenantsQuery(...args),
  useLazyListTenantsQuery: (...args) => mockUseLazyListTenantsQuery(...args),
}))

vi.mock('../../store/api/userApi.js', () => ({
  useLazyListUsersQuery: (...args) => mockUseLazyListUsersQuery(...args),
}))

vi.mock('../../components/UserSearchSelect', () => {
  function MockUserSearchSelect({
    label,
    onChange,
    disabled,
    selectedIds = [],
  }) {
    return (
      <div>
        <span>{label}</span>
        <button
          type="button"
          onClick={() =>
            onChange(['user-3'], {
              'user-3': {
                name: 'Jordan New',
                email: 'jordan.new@example.com',
                roles: ['USER'],
                isActive: true,
              },
            })}
          disabled={disabled}
        >
          Mock select linked user
        </button>
        <p>{selectedIds.join(', ')}</p>
      </div>
    )
  }

  return {
    UserSearchSelect: MockUserSearchSelect,
    default: MockUserSearchSelect,
  }
})

function renderWorkspace(initialEntry = '/app/administration/maintain-tenants/tenant-1/linked-users') {
  const entries = [initialEntry]

  return render(
    <ToasterProvider>
      <MemoryRouter initialEntries={entries}>
        <Routes>
          <Route
            path="/app/administration/maintain-tenants/:tenantId/linked-users"
            element={<TenantLinkedUsersWorkspace />}
          />
          <Route
            path="/app/administration/maintain-tenants"
            element={<h1>Maintain Tenants</h1>}
          />
        </Routes>
      </MemoryRouter>
    </ToasterProvider>,
  )
}

describe('TenantLinkedUsersWorkspace', () => {
  let allUsers
  let updateUserMock

  beforeEach(() => {
    vi.clearAllMocks()

    allUsers = [
      {
        _id: 'user-1',
        name: 'Avery North',
        email: 'avery.north@example.com',
        isActive: true,
        memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
        tenantMemberships: [
          {
            customerId: 'cust-1',
            tenantId: 'tenant-1',
            roles: ['USER'],
          },
        ],
      },
      {
        _id: 'user-2',
        name: 'Taylor Reed',
        email: 'taylor.reed@example.com',
        isActive: false,
        memberships: [{ customerId: 'cust-1', roles: ['TENANT_ADMIN', 'USER'] }],
        tenantMemberships: [
          {
            customerId: 'cust-1',
            tenantId: 'tenant-1',
            roles: ['USER'],
          },
          {
            customerId: 'cust-1',
            tenantId: 'tenant-2',
            roles: ['USER'],
          },
        ],
      },
      {
        _id: 'user-3',
        name: 'Jordan New',
        email: 'jordan.new@example.com',
        isActive: true,
        memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
        tenantMemberships: [],
      },
    ]

    updateUserMock = vi.fn().mockResolvedValue({})

    mockUseAuthorization.mockReturnValue({
      user: { id: 'user-2' },
      isSuperAdmin: false,
      hasCustomerRole: vi.fn((customerId, role) => role === 'CUSTOMER_ADMIN'),
      hasTenantRole: vi.fn(() => false),
      getAccessibleTenants: vi.fn(() => []),
    })

    mockUseTenantContext.mockReturnValue({
      customerId: 'cust-1',
    })

    mockUseUsers.mockReturnValue({
      updateUser: updateUserMock,
      updateUserResult: { isLoading: false },
    })

    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [
          {
            _id: 'tenant-1',
            name: 'Lidl Workspace',
            status: 'ENABLED',
            tenantAdmin: { id: 'user-2', name: 'Taylor Reed' },
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    mockUseLazyListTenantsQuery.mockReturnValue([vi.fn()])

    const triggerListUsersMock = vi.fn().mockImplementation(async ({ page = 1 }) => ({
      data: {
        data: {
          users: allUsers,
          page,
          totalPages: 1,
        },
      },
    }))

    mockUseLazyListUsersQuery.mockReturnValue([triggerListUsersMock])
  })

  it('renders linked users workspace and navigates back to maintain tenants', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    expect(await screen.findByRole('heading', { name: /linked users/i })).toBeInTheDocument()
    expect(screen.getByText(/manage users linked to/i)).toBeInTheDocument()
    expect(screen.getByText('Avery North')).toBeInTheDocument()
    expect(screen.getByText('Taylor Reed')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back to maintain tenants/i }))

    expect(await screen.findByRole('heading', { name: /maintain tenants/i })).toBeInTheDocument()
  })

  it('uses compact roles affordance and reveals full roles on hover/focus', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await screen.findByText('Taylor Reed')

    expect(screen.queryByText('TENANT_ADMIN, USER')).not.toBeInTheDocument()

    const rolesTrigger = screen.getByRole('button', { name: /show roles for taylor reed/i })
    const tenantAdminRole = screen.getByText('TENANT_ADMIN')

    expect(tenantAdminRole).not.toBeVisible()

    await user.hover(rolesTrigger)
    expect(tenantAdminRole).toBeVisible()

    await user.unhover(rolesTrigger)
    await waitFor(() => {
      expect(tenantAdminRole).not.toBeVisible()
    })

    await user.click(rolesTrigger)
    expect(tenantAdminRole).toBeVisible()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(tenantAdminRole).not.toBeVisible()
    })
  })

  it('shows unauthorized boundary state when the user lacks tenant-linked-users access', async () => {
    mockUseAuthorization.mockReturnValue({
      user: { id: 'user-2' },
      isSuperAdmin: false,
      hasCustomerRole: vi.fn(() => false),
      hasTenantRole: vi.fn(() => false),
      getAccessibleTenants: vi.fn(() => []),
    })

    renderWorkspace()

    expect(
      await screen.findByText(/do not have permission to manage linked users for this tenant/i),
    ).toBeInTheDocument()
  })

  it('allows customer-scoped tenant admins to access linked users when assigned to the tenant', async () => {
    mockUseAuthorization.mockReturnValue({
      user: { id: 'user-2' },
      isSuperAdmin: false,
      hasCustomerRole: vi.fn((customerId, role) => role === 'TENANT_ADMIN'),
      hasTenantRole: vi.fn(() => false),
      getAccessibleTenants: vi.fn(() => []),
    })

    renderWorkspace({
      pathname: '/app/administration/maintain-tenants/tenant-1/linked-users',
      state: {
        tenant: {
          _id: 'tenant-1',
          name: 'Lidl Workspace',
          status: 'ENABLED',
          tenantAdmin: { id: 'user-2', name: 'Taylor Reed' },
        },
      },
    })

    expect(await screen.findByRole('heading', { name: /linked users/i })).toBeInTheDocument()
    expect(screen.queryByText(/do not have permission to manage linked users/i)).not.toBeInTheDocument()
  })

  it('links selected users by updating tenantVisibility for each selected user', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await screen.findByText('Avery North')

    await user.click(screen.getByRole('button', { name: /mock select linked user/i }))
    await user.click(screen.getByRole('button', { name: /link selected users/i }))

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith('user-3', {
        tenantVisibility: ['tenant-1'],
      })
    })
  })

  it('removes a single linked user from the row actions flow', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await screen.findByText('Avery North')

    fireEvent.change(
      screen.getByRole('combobox', { name: /actions for avery north/i }),
      { target: { value: 'Remove' } },
    )

    expect(await screen.findByRole('heading', { name: /remove linked users/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^remove$/i }))

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith('user-1', {
        tenantVisibility: [],
      })
    })
  })

  it('supports bulk remove for selected linked users', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await screen.findByText('Avery North')

    await user.click(screen.getByRole('checkbox', { name: /select row user-1/i }))
    await user.click(screen.getByRole('checkbox', { name: /select row user-2/i }))

    await user.click(screen.getByRole('button', { name: /remove selected/i }))
    await user.click(screen.getByRole('button', { name: /^remove$/i }))

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith('user-1', {
        tenantVisibility: [],
      })
      expect(updateUserMock).toHaveBeenCalledWith('user-2', {
        tenantVisibility: ['tenant-2'],
      })
    })
  })

  it('enforces read-only behavior for archived tenants', async () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [
          {
            _id: 'tenant-1',
            name: 'Lidl Workspace',
            status: 'ARCHIVED',
          },
        ],
      },
      error: null,
    })

    renderWorkspace()

    expect(await screen.findByText(/archived and read-only/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /link selected users/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /remove selected/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /mock select linked user/i })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: /actions for avery north/i })).toBeDisabled()
  })
})
