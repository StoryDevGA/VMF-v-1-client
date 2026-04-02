/**
 * useAuthorization Hook Tests
 *
 * Covers the React hook that wraps authorization helpers
 * against the current Redux user. Uses renderHook with a
 * real Redux store.
 */

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import authReducer, { setCredentials } from '../store/slices/authSlice.js'
import { baseApi } from '../store/api/baseApi.js'
import { useAuthorization } from './useAuthorization.js'

/* ------------------------------------------------------------------ */
/*  Test data                                                         */
/* ------------------------------------------------------------------ */

const CUSTOMER_ID = '607f1f77bcf86cd799439022'
const CUSTOMER_ID_2 = '607f1f77bcf86cd799439033'
const TENANT_ID = '707f1f77bcf86cd799439044'
const VMF_ID = '807f1f77bcf86cd799439066'

const superAdminUser = {
  id: '1',
  email: 'sa@example.com',
  name: 'Super Admin',
  isActive: true,
  memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
  tenantMemberships: [],
  vmfGrants: [],
}

const customerAdminUser = {
  id: '2',
  email: 'ca@example.com',
  name: 'Customer Admin',
  isActive: true,
  memberships: [{ customerId: CUSTOMER_ID, roles: ['CUSTOMER_ADMIN'] }],
  customerScopes: [
    {
      customerId: CUSTOMER_ID,
      featureEntitlements: ['VMF', 'DEALS'],
      entitlementSource: 'LICENSE_LEVEL',
    },
  ],
  tenantMemberships: [
    { customerId: CUSTOMER_ID, tenantId: TENANT_ID, roles: ['TENANT_ADMIN'] },
  ],
  vmfGrants: [
    {
      customerId: CUSTOMER_ID,
      tenantId: TENANT_ID,
      vmfId: VMF_ID,
      permissions: ['READ', 'WRITE'],
    },
  ],
}

const customerScopedTenantAdminUser = {
  id: '3',
  email: 'ta@example.com',
  name: 'Scoped Tenant Admin',
  isActive: true,
  memberships: [{ customerId: CUSTOMER_ID, roles: ['TENANT_ADMIN', 'USER'] }],
  tenantMemberships: [
    { customerId: CUSTOMER_ID, tenantId: TENANT_ID, roles: ['USER'] },
  ],
  vmfGrants: [],
}

/* ------------------------------------------------------------------ */
/*  Helper                                                            */
/* ------------------------------------------------------------------ */

function renderUseAuthorization(user, resolvedPermissions = null) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
    preloadedState: {
      auth: {
        user: user ?? null,
        resolvedPermissions,
        status: user ? 'authenticated' : 'unauthenticated',
      },
    },
  })

  return renderHook(() => useAuthorization(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  })
}

/* ================================================================== */
/*  Tests                                                             */
/* ================================================================== */

describe('useAuthorization', () => {
  describe('when user is null', () => {
    it('returns safe defaults', () => {
      const { result } = renderUseAuthorization(null)

      expect(result.current.user).toBeNull()
      expect(result.current.platformRoles).toEqual([])
      expect(result.current.isSuperAdmin).toBe(false)
      expect(result.current.accessibleCustomerIds).toEqual([])
    })

    it('hasPlatformRole returns false', () => {
      const { result } = renderUseAuthorization(null)
      expect(result.current.hasPlatformRole('SUPER_ADMIN')).toBe(false)
    })
  })

  describe('when user is a Super Admin', () => {
    it('exposes platform roles', () => {
      const { result } = renderUseAuthorization(superAdminUser)

      expect(result.current.platformRoles).toEqual(['SUPER_ADMIN'])
      expect(result.current.isSuperAdmin).toBe(true)
    })

    it('hasPlatformRole works', () => {
      const { result } = renderUseAuthorization(superAdminUser)
      expect(result.current.hasPlatformRole('SUPER_ADMIN')).toBe(true)
      expect(result.current.hasPlatformRole('USER')).toBe(false)
    })

    it('hasCustomerAccess returns true for any customer', () => {
      const { result } = renderUseAuthorization(superAdminUser)
      expect(result.current.hasCustomerAccess(CUSTOMER_ID)).toBe(true)
    })

    it('hasTenantAccess returns true for any tenant', () => {
      const { result } = renderUseAuthorization(superAdminUser)
      expect(result.current.hasTenantAccess(CUSTOMER_ID, TENANT_ID)).toBe(true)
    })

    it('hasVmfAccess returns true for any VMF', () => {
      const { result } = renderUseAuthorization(superAdminUser)
      expect(result.current.hasVmfAccess(CUSTOMER_ID, TENANT_ID, VMF_ID)).toBe(true)
    })

    it('hasVmfWorkspaceAccess returns true for any scope', () => {
      const { result } = renderUseAuthorization(superAdminUser)
      expect(
        result.current.hasVmfWorkspaceAccess(CUSTOMER_ID, null, {
          supportsTenantManagement: false,
        }),
      ).toBe(true)
    })
  })

  describe('when user is a Customer Admin', () => {
    it('is not a super admin', () => {
      const { result } = renderUseAuthorization(customerAdminUser)
      expect(result.current.isSuperAdmin).toBe(false)
    })

    it('getCustomerRoles returns roles', () => {
      const { result } = renderUseAuthorization(customerAdminUser)
      expect(result.current.getCustomerRoles(CUSTOMER_ID)).toEqual(['CUSTOMER_ADMIN'])
    })

    it('exposes customer-scoped entitlement helpers', () => {
      const { result } = renderUseAuthorization(customerAdminUser)

      expect(result.current.getCustomerScope(CUSTOMER_ID)).toEqual({
        customerId: CUSTOMER_ID,
        featureEntitlements: ['VMF', 'DEALS'],
        entitlementSource: 'LICENSE_LEVEL',
      })
      expect(result.current.getFeatureEntitlements(CUSTOMER_ID)).toEqual(['VMF', 'DEALS'])
      expect(result.current.hasFeatureEntitlement(CUSTOMER_ID, 'DEALS')).toBe(true)
      expect(result.current.hasFeatureEntitlement(CUSTOMER_ID, 'VIEWS')).toBe(false)
      expect(result.current.getEntitlementSource(CUSTOMER_ID)).toBe('LICENSE_LEVEL')
    })

    it('hasCustomerRole works', () => {
      const { result } = renderUseAuthorization(customerAdminUser)
      expect(result.current.hasCustomerRole(CUSTOMER_ID, 'CUSTOMER_ADMIN')).toBe(true)
      expect(result.current.hasCustomerRole(CUSTOMER_ID, 'SUPER_ADMIN')).toBe(false)
    })

    it('accessibleCustomerIds includes customer', () => {
      const { result } = renderUseAuthorization(customerAdminUser)
      expect(result.current.accessibleCustomerIds).toEqual([CUSTOMER_ID])
    })

    it('getTenantRoles returns roles', () => {
      const { result } = renderUseAuthorization(customerAdminUser)
      expect(result.current.getTenantRoles(CUSTOMER_ID, TENANT_ID)).toEqual(['TENANT_ADMIN'])
    })

    it('getAccessibleTenants returns tenant IDs', () => {
      const { result } = renderUseAuthorization(customerAdminUser)
      expect(result.current.getAccessibleTenants(CUSTOMER_ID)).toEqual([TENANT_ID])
    })

    it('getVmfPermissions returns permissions', () => {
      const { result } = renderUseAuthorization(customerAdminUser)
      expect(result.current.getVmfPermissions(CUSTOMER_ID, TENANT_ID, VMF_ID)).toEqual([
        'READ',
        'WRITE',
      ])
    })

    it('hasVmfPermission works', () => {
      const { result } = renderUseAuthorization(customerAdminUser)
      expect(result.current.hasVmfPermission(CUSTOMER_ID, TENANT_ID, VMF_ID, 'READ')).toBe(true)
      expect(result.current.hasVmfPermission(CUSTOMER_ID, TENANT_ID, VMF_ID, 'DELETE')).toBe(false)
    })

    it('exposes VMF workspace access helpers', () => {
      const { result } = renderUseAuthorization(customerAdminUser)

      expect(
        result.current.hasVmfWorkspaceAccess(CUSTOMER_ID, TENANT_ID, {
          supportsTenantManagement: true,
        }),
      ).toBe(true)
      expect(result.current.hasVmfWorkspaceManagementAccess(CUSTOMER_ID, TENANT_ID)).toBe(true)
    })

    it('lets customer-scoped tenant admins fall back to read-only access on non-admin tenants', () => {
      const { result } = renderUseAuthorization(customerScopedTenantAdminUser)

      expect(
        result.current.hasVmfWorkspaceAccess(CUSTOMER_ID, TENANT_ID, {
          supportsTenantManagement: true,
          tenant: { tenantAdmin: { id: 'other-user', name: 'Other Admin' } },
        }),
      ).toBe(true)
      expect(
        result.current.hasVmfWorkspaceManagementAccess(CUSTOMER_ID, TENANT_ID, {
          tenant: { tenantAdmin: { id: 'other-user', name: 'Other Admin' } },
        }),
      ).toBe(false)
      expect(
        result.current.hasVmfWorkspaceManagementAccess(CUSTOMER_ID, TENANT_ID, {
          tenant: { tenantAdmin: { id: '3', name: 'Scoped Tenant Admin' } },
        }),
      ).toBe(true)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Resolved-permission helpers (FE-06)                            */
  /* ---------------------------------------------------------------- */

  describe('resolved-permission helpers (FE-06)', () => {
    const resolvedBase = {
      platform: { roleKeys: [], permissions: [] },
      customers: [
        { customerId: CUSTOMER_ID, roleKeys: ['USER'], permissions: ['USER_VIEW'] },
      ],
      tenants: [
        {
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          roleKeys: ['USER'],
          permissions: ['VMF_VIEW', 'VMF_CREATE'],
        },
      ],
    }

    const resolvedSuperAdminPerms = {
      platform: { roleKeys: ['SUPER_ADMIN'], permissions: [] },
      customers: [],
      tenants: [],
    }

    it('hasPlatformPermission returns false when resolvedPermissions is null', () => {
      const { result } = renderUseAuthorization(customerAdminUser)
      expect(result.current.hasPlatformPermission('SYSTEM_HEALTH_VIEW')).toBe(false)
    })

    it('hasPlatformPermission returns true when permission is in platform bucket', () => {
      const { result } = renderUseAuthorization(customerAdminUser, {
        platform: { roleKeys: [], permissions: ['SYSTEM_HEALTH_VIEW'] },
        customers: [],
        tenants: [],
      })
      expect(result.current.hasPlatformPermission('SYSTEM_HEALTH_VIEW')).toBe(true)
    })

    it('hasCustomerPermission returns false when resolvedPermissions is null', () => {
      const { result } = renderUseAuthorization(customerAdminUser)
      expect(result.current.hasCustomerPermission(CUSTOMER_ID, 'USER_VIEW')).toBe(false)
    })

    it('hasCustomerPermission returns true when permission is in customers bucket', () => {
      const { result } = renderUseAuthorization(customerAdminUser, resolvedBase)
      expect(result.current.hasCustomerPermission(CUSTOMER_ID, 'USER_VIEW')).toBe(true)
    })

    it('hasCustomerPermission returns false for a different customer id', () => {
      const { result } = renderUseAuthorization(customerAdminUser, resolvedBase)
      expect(result.current.hasCustomerPermission('other-cust', 'USER_VIEW')).toBe(false)
    })

    it('hasTenantPermission returns false when resolvedPermissions is null', () => {
      const { result } = renderUseAuthorization(customerAdminUser)
      expect(result.current.hasTenantPermission(CUSTOMER_ID, TENANT_ID, 'VMF_VIEW')).toBe(false)
    })

    it('hasTenantPermission returns true when permission is in tenant bucket', () => {
      const { result } = renderUseAuthorization(customerAdminUser, resolvedBase)
      expect(result.current.hasTenantPermission(CUSTOMER_ID, TENANT_ID, 'VMF_VIEW')).toBe(true)
    })

    it('hasAnyPermission returns false when resolvedPermissions is null', () => {
      const { result } = renderUseAuthorization(customerAdminUser)
      expect(result.current.hasAnyPermission('VMF_VIEW')).toBe(false)
    })

    it('hasAnyPermission returns true for permission found in tenant bucket', () => {
      const { result } = renderUseAuthorization(customerAdminUser, resolvedBase)
      expect(result.current.hasAnyPermission('VMF_CREATE')).toBe(true)
    })

    it('SUPER_ADMIN roleKey bypasses all four permission helpers', () => {
      const { result } = renderUseAuthorization(superAdminUser, resolvedSuperAdminPerms)
      expect(result.current.hasPlatformPermission('ANY_PERM')).toBe(true)
      expect(result.current.hasCustomerPermission(CUSTOMER_ID, 'ANY_PERM')).toBe(true)
      expect(result.current.hasTenantPermission(CUSTOMER_ID, TENANT_ID, 'ANY_PERM')).toBe(true)
      expect(result.current.hasAnyPermission('ANY_PERM')).toBe(true)
    })

    it('permission helpers recompute after session refresh dispatches new resolvedPermissions', async () => {
      const store = configureStore({
        reducer: {
          auth: authReducer,
          [baseApi.reducerPath]: baseApi.reducer,
        },
        middleware: (gDM) => gDM().concat(baseApi.middleware),
        preloadedState: {
          auth: {
            user: customerAdminUser,
            resolvedPermissions: null,
            status: 'authenticated',
          },
        },
      })

      const { result } = renderHook(() => useAuthorization(), {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      })

      expect(result.current.hasPlatformPermission('SYSTEM_HEALTH_VIEW')).toBe(false)

      await act(async () => {
        store.dispatch(
          setCredentials({
            user: customerAdminUser,
            customerScopes: [],
            resolvedPermissions: {
              platform: { roleKeys: [], permissions: ['SYSTEM_HEALTH_VIEW'] },
              customers: [],
              tenants: [],
            },
          }),
        )
      })

      expect(result.current.hasPlatformPermission('SYSTEM_HEALTH_VIEW')).toBe(true)
    })

    it('refreshing credentials replaces stale customer and tenant permissions instead of bleeding into other scopes', async () => {
      const store = configureStore({
        reducer: {
          auth: authReducer,
          [baseApi.reducerPath]: baseApi.reducer,
        },
        middleware: (gDM) => gDM().concat(baseApi.middleware),
        preloadedState: {
          auth: {
            user: customerAdminUser,
            resolvedPermissions: {
              platform: { roleKeys: [], permissions: [] },
              customers: [
                { customerId: CUSTOMER_ID, roleKeys: ['USER'], permissions: ['CUSTOMER_VIEW'] },
              ],
              tenants: [
                {
                  customerId: CUSTOMER_ID,
                  tenantId: TENANT_ID,
                  roleKeys: ['USER'],
                  permissions: ['VMF_CREATE'],
                },
              ],
            },
            status: 'authenticated',
          },
        },
      })

      const { result } = renderHook(() => useAuthorization(), {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      })

      expect(result.current.hasCustomerPermission(CUSTOMER_ID, 'CUSTOMER_VIEW')).toBe(true)
      expect(result.current.hasTenantPermission(CUSTOMER_ID, TENANT_ID, 'VMF_CREATE')).toBe(true)
      expect(result.current.hasCustomerPermission('other-customer', 'CUSTOMER_VIEW')).toBe(false)
      expect(result.current.hasTenantPermission(CUSTOMER_ID, 'other-tenant', 'VMF_CREATE')).toBe(false)

      await act(async () => {
        store.dispatch(
          setCredentials({
            user: customerAdminUser,
            customerScopes: [],
            resolvedPermissions: {
              platform: { roleKeys: [], permissions: [] },
              customers: [
                { customerId: CUSTOMER_ID_2, roleKeys: ['USER'], permissions: ['CUSTOMER_VIEW'] },
              ],
              tenants: [
                {
                  customerId: CUSTOMER_ID_2,
                  tenantId: 'tenant-2',
                  roleKeys: ['USER'],
                  permissions: ['VMF_CREATE'],
                },
              ],
            },
          }),
        )
      })

      expect(result.current.hasCustomerPermission(CUSTOMER_ID, 'CUSTOMER_VIEW')).toBe(false)
      expect(result.current.hasTenantPermission(CUSTOMER_ID, TENANT_ID, 'VMF_CREATE')).toBe(false)
      expect(result.current.hasCustomerPermission(CUSTOMER_ID_2, 'CUSTOMER_VIEW')).toBe(true)
      expect(result.current.hasTenantPermission(CUSTOMER_ID_2, 'tenant-2', 'VMF_CREATE')).toBe(true)
    })
  })
})
