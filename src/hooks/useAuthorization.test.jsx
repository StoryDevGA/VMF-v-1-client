/**
 * useAuthorization Hook Tests
 *
 * Covers the React hook that wraps authorization helpers
 * against the current Redux user. Uses renderHook with a
 * real Redux store.
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../store/slices/authSlice.js'
import { baseApi } from '../store/api/baseApi.js'
import { useAuthorization } from './useAuthorization.js'

/* ------------------------------------------------------------------ */
/*  Test data                                                         */
/* ------------------------------------------------------------------ */

const CUSTOMER_ID = '607f1f77bcf86cd799439022'
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

function renderUseAuthorization(user) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
    preloadedState: {
      auth: {
        user: user ?? null,
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
})
