import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PermissionMatrix } from './PermissionMatrix.jsx'

const roles = [
  {
    id: 'role-user',
    key: 'USER',
    name: 'User',
    scope: 'TENANT',
    isSystem: true,
    permissions: ['DEAL_VIEW'],
  },
  {
    id: 'role-tenant-admin',
    key: 'TENANT_ADMIN',
    name: 'Tenant Admin',
    scope: 'TENANT',
    isSystem: true,
    permissions: ['TENANT_VIEW'],
  },
  {
    id: 'role-customer-admin',
    key: 'CUSTOMER_ADMIN',
    name: 'Customer Admin',
    scope: 'CUSTOMER',
    isSystem: true,
    permissions: ['CUSTOMER_VIEW'],
  },
  {
    id: 'role-super-admin',
    key: 'SUPER_ADMIN',
    name: 'Super Admin',
    scope: 'PLATFORM',
    isSystem: true,
    permissions: ['PLATFORM_MANAGE', 'CUSTOMER_VIEW'],
  },
  {
    id: 'role-custom',
    key: 'VMF_CREATOR',
    name: 'VMF Creator',
    scope: 'CUSTOMER',
    isSystem: false,
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

describe('PermissionMatrix', () => {
  it('renders permission groups and role columns', () => {
    render(
      <PermissionMatrix roles={roles} permissionGroups={permissionGroups} />,
    )

    expect(screen.getByText('Platform Management')).toBeInTheDocument()
    expect(screen.getByText('Customer Management')).toBeInTheDocument()
    expect(screen.getByText('Super Admin')).toBeInTheDocument()
    expect(screen.getByText('Tenant Admin')).toBeInTheDocument()
    expect(screen.getByText('Customer Admin')).toBeInTheDocument()
    expect(screen.getByText('VMF Creator')).toBeInTheDocument()
    expect(screen.getByText('Manage Platform')).toBeInTheDocument()
    expect(screen.getByText('View Customers')).toBeInTheDocument()
  })

  it('orders system role columns as user, tenant admin, customer admin, then super admin', () => {
    const { container } = render(
      <PermissionMatrix roles={roles} permissionGroups={permissionGroups} />,
    )

    expect(
      screen.getAllByText(/^(User|Tenant Admin|Customer Admin|Super Admin|VMF Creator)$/).map(
        (node) => node.textContent,
      ),
    ).toEqual(['User', 'Tenant Admin', 'Customer Admin', 'Super Admin', 'VMF Creator'])

    expect(
      window.getComputedStyle(
        container.querySelector('.permission-matrix__header-row'),
      ).position,
    ).toBe('sticky')
  })

  it('calls onToggle with role id, permission key, and next value', async () => {
    const user = userEvent.setup()
    const handleToggle = vi.fn()

    render(
      <PermissionMatrix
        roles={roles}
        permissionGroups={permissionGroups}
        onToggle={handleToggle}
      />,
    )

    await user.click(
      screen.getByRole('switch', { name: /manage platform for customer admin/i }),
    )

    expect(handleToggle).toHaveBeenCalledWith(
      'role-customer-admin',
      'PLATFORM_MANAGE',
      true,
    )
  })

  it('locks configured default permissions while keeping other super-admin permissions editable', async () => {
    const user = userEvent.setup()
    render(
      <PermissionMatrix
        roles={roles}
        permissionGroups={permissionGroups}
        lockedPermissionKeysByRoleKey={{
          SUPER_ADMIN: ['PLATFORM_MANAGE', 'CUSTOMER_VIEW'],
        }}
      />,
    )

    expect(
      screen.getByRole('switch', { name: /manage platform for super admin/i }),
    ).toBeDisabled()
    const lockedIndicators = screen.getAllByLabelText('Locked permission')
    expect(lockedIndicators).toHaveLength(2)
    expect(
      screen.getByRole('switch', { name: /manage platform for super admin/i }).closest(
        '.permission-matrix__toggle-cell',
      ),
    ).toHaveClass('permission-matrix__toggle-cell--locked')
    expect(
      screen.getByRole('switch', { name: /view customers for super admin/i }),
    ).toBeDisabled()
    expect(
      screen.getByRole('switch', { name: /view users for super admin/i }),
    ).not.toBeDisabled()
    expect(
      screen.getByRole('switch', { name: /view customers for customer admin/i }),
    ).not.toBeDisabled()
    expect(screen.getByText('Default permissions locked')).toBeInTheDocument()

    await user.hover(lockedIndicators[0])
    expect(
      screen.getAllByText(
        /this permission is part of the seeded super_admin baseline and cannot be changed/i,
      ),
    ).toHaveLength(2)
  })

  it('filters permission rows and hides empty groups', () => {
    render(
      <PermissionMatrix
        roles={roles}
        permissionGroups={permissionGroups}
        search="platform"
      />,
    )

    expect(screen.getByText('Platform Management')).toBeInTheDocument()
    expect(screen.queryByText('Customer Management')).not.toBeInTheDocument()
    expect(screen.queryByText('View Customers')).not.toBeInTheDocument()
  })

  it('shows pending cell indicators and disables pending toggles', () => {
    render(
      <PermissionMatrix
        roles={roles}
        permissionGroups={permissionGroups}
        pendingToggles={new Set(['role-customer-admin-CUSTOMER_VIEW'])}
      />,
    )

    expect(
      screen.getByRole('switch', { name: /view customers for customer admin/i }),
    ).toBeDisabled()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders header actions for custom roles only and routes edit/delete callbacks', async () => {
    const user = userEvent.setup()
    const onEditRole = vi.fn()
    const onDeleteRole = vi.fn()

    render(
      <PermissionMatrix
        roles={roles}
        permissionGroups={permissionGroups}
        onEditRole={onEditRole}
        onDeleteRole={onDeleteRole}
      />,
    )

    expect(
      screen.queryByRole('combobox', { name: /actions for super admin/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('combobox', { name: /actions for customer admin/i }),
    ).not.toBeInTheDocument()

    const actionsMenu = screen.getByRole('combobox', { name: /actions for vmf creator/i })
    await user.click(actionsMenu)
    await user.click(screen.getByRole('option', { name: 'Edit' }))

    expect(onEditRole).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'role-custom',
        key: 'VMF_CREATOR',
      }),
    )

    await user.click(actionsMenu)
    await user.click(screen.getByRole('option', { name: 'Delete' }))

    expect(onDeleteRole).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'role-custom',
        key: 'VMF_CREATOR',
      }),
    )
  })
})
