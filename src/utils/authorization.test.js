/**
 * Authorization Utilities Tests
 *
 * Covers all pure helper functions in utils/authorization.js:
 * - Platform role helpers
 * - Customer role / access helpers
 * - Tenant role / access helpers
 * - VMF permission / access helpers
 * - Aggregate helpers (accessible IDs)
 * - Edge cases (null user, missing arrays, etc.)
 */

import { describe, it, expect } from 'vitest'
import {
  getUserPlatformRoles,
  hasPlatformRole,
  isSuperAdmin,
  getUserCustomerRoles,
  hasCustomerRole,
  hasCustomerAccess,
  normalizeCustomerLifecycleStatus,
  normalizeCustomerTopology,
  getCustomerLifecycleStatus,
  getCustomerTopology,
  isCustomerInactiveForContext,
  hasAnyCustomerRole,
  hasAnyTenantRole,
  hasAnyMultiTenantCustomerAdminScope,
  getCustomerScope,
  getCustomerFeatureEntitlements,
  hasCustomerFeatureEntitlement,
  getCustomerEntitlementSource,
  getUserTenantRoles,
  hasTenantRole,
  hasTenantAccess,
  hasVmfWorkspaceAccess,
  hasVmfWorkspaceManagementAccess,
  isAssignedTenantAdmin,
  getUserVmfPermissions,
  hasVmfPermission,
  hasVmfAccess,
  getAccessibleCustomerIds,
  getAccessibleTenantIds,
} from './authorization.js'

/* ------------------------------------------------------------------ */
/*  Test data                                                         */
/* ------------------------------------------------------------------ */

const CUSTOMER_ID = '607f1f77bcf86cd799439022'
const CUSTOMER_ID_2 = '607f1f77bcf86cd799439033'
const TENANT_ID = '707f1f77bcf86cd799439044'
const TENANT_ID_2 = '707f1f77bcf86cd799439055'
const VMF_ID = '807f1f77bcf86cd799439066'

const superAdminUser = {
  id: '1',
  memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
  tenantMemberships: [],
  vmfGrants: [],
}

const customerAdminUser = {
  id: '2',
  memberships: [{ customerId: CUSTOMER_ID, roles: ['CUSTOMER_ADMIN'] }],
  customerScopes: [
    {
      customerId: CUSTOMER_ID,
      featureEntitlements: ['VMF', 'DEALS'],
      entitlementSource: 'LICENSE_LEVEL',
    },
  ],
  tenantMemberships: [],
  vmfGrants: [],
}

const tenantAdminUser = {
  id: '3',
  memberships: [{ customerId: CUSTOMER_ID, roles: ['USER'] }],
  tenantMemberships: [
    { customerId: CUSTOMER_ID, tenantId: TENANT_ID, roles: ['TENANT_ADMIN'] },
  ],
  vmfGrants: [],
}

const vmfUser = {
  id: '4',
  memberships: [{ customerId: CUSTOMER_ID, roles: ['USER'] }],
  tenantMemberships: [
    { customerId: CUSTOMER_ID, tenantId: TENANT_ID, roles: ['USER'] },
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

const multiCustomerUser = {
  id: '5',
  memberships: [
    { customerId: CUSTOMER_ID, roles: ['CUSTOMER_ADMIN'] },
    { customerId: CUSTOMER_ID_2, roles: ['USER'] },
  ],
  tenantMemberships: [
    { customerId: CUSTOMER_ID, tenantId: TENANT_ID, roles: ['TENANT_ADMIN'] },
    { customerId: CUSTOMER_ID_2, tenantId: TENANT_ID_2, roles: ['USER'] },
  ],
  vmfGrants: [],
}

const nestedCustomerMembershipUser = {
  id: '6',
  memberships: [
    {
      customer: { id: CUSTOMER_ID, topology: 'SINGLE_TENANT' },
      roles: ['CUSTOMER_ADMIN'],
    },
  ],
  tenantMemberships: [],
  vmfGrants: [],
}

const tenantMembershipOnlyUser = {
  id: '7',
  memberships: [],
  tenantMemberships: [
    { customerId: CUSTOMER_ID, tenantId: TENANT_ID, roles: ['TENANT_ADMIN'] },
    { customerId: CUSTOMER_ID_2, tenantId: TENANT_ID_2, roles: ['USER'] },
  ],
  vmfGrants: [],
}

const singleTenantCustomerUser = {
  id: '8',
  memberships: [{ customerId: CUSTOMER_ID, roles: ['USER'] }],
  tenantMemberships: [],
  vmfGrants: [],
}

const customerScopedTenantAdminUser = {
  id: '9',
  memberships: [{ customerId: CUSTOMER_ID, roles: ['TENANT_ADMIN', 'USER'] }],
  tenantMemberships: [
    { customerId: CUSTOMER_ID, tenantId: TENANT_ID, roles: ['USER'] },
    { customerId: CUSTOMER_ID, tenantId: TENANT_ID_2, roles: ['USER'] },
  ],
  vmfGrants: [],
}

const assignedTenant = {
  id: TENANT_ID,
  tenantAdmin: { id: '9', name: 'Scoped Admin' },
}

const otherTenant = {
  id: TENANT_ID_2,
  tenantAdmin: { id: '77', name: 'Another Admin' },
}

/* ================================================================== */
/*  Platform                                                          */
/* ================================================================== */

describe('Platform role helpers', () => {
  describe('getUserPlatformRoles', () => {
    it('returns platform roles for a super admin', () => {
      expect(getUserPlatformRoles(superAdminUser)).toEqual(['SUPER_ADMIN'])
    })

    it('returns empty array for a non-platform user', () => {
      expect(getUserPlatformRoles(customerAdminUser)).toEqual([])
    })

    it('handles null/undefined user', () => {
      expect(getUserPlatformRoles(null)).toEqual([])
      expect(getUserPlatformRoles(undefined)).toEqual([])
    })

    it('handles user with no memberships', () => {
      expect(getUserPlatformRoles({ id: '1' })).toEqual([])
    })
  })

  describe('hasPlatformRole', () => {
    it('returns true when user has the platform role', () => {
      expect(hasPlatformRole(superAdminUser, 'SUPER_ADMIN')).toBe(true)
    })

    it('returns false when user lacks the platform role', () => {
      expect(hasPlatformRole(customerAdminUser, 'SUPER_ADMIN')).toBe(false)
    })

    it('returns false for null user', () => {
      expect(hasPlatformRole(null, 'SUPER_ADMIN')).toBe(false)
    })
  })

  describe('isSuperAdmin', () => {
    it('returns true for a super admin', () => {
      expect(isSuperAdmin(superAdminUser)).toBe(true)
    })

    it('returns false for a non-super-admin', () => {
      expect(isSuperAdmin(customerAdminUser)).toBe(false)
    })
  })
})

/* ================================================================== */
/*  Customer                                                          */
/* ================================================================== */

describe('Customer role helpers', () => {
  describe('getUserCustomerRoles', () => {
    it('returns roles for a matching customer', () => {
      expect(getUserCustomerRoles(customerAdminUser, CUSTOMER_ID)).toEqual([
        'CUSTOMER_ADMIN',
      ])
    })

    it('returns empty array for a non-matching customer', () => {
      expect(getUserCustomerRoles(customerAdminUser, CUSTOMER_ID_2)).toEqual([])
    })

    it('returns empty array for null user', () => {
      expect(getUserCustomerRoles(null, CUSTOMER_ID)).toEqual([])
    })

    it('returns empty array when customerId is missing', () => {
      expect(getUserCustomerRoles(customerAdminUser, null)).toEqual([])
    })

    it('resolves customer roles when the membership uses a nested customer id', () => {
      expect(getUserCustomerRoles(nestedCustomerMembershipUser, CUSTOMER_ID)).toEqual([
        'CUSTOMER_ADMIN',
      ])
    })
  })

  describe('hasCustomerRole', () => {
    it('returns true when user has the role for the customer', () => {
      expect(hasCustomerRole(customerAdminUser, CUSTOMER_ID, 'CUSTOMER_ADMIN')).toBe(true)
    })

    it('returns false when user lacks the role', () => {
      expect(hasCustomerRole(customerAdminUser, CUSTOMER_ID, 'SUPER_ADMIN')).toBe(false)
    })
  })

  describe('hasCustomerAccess', () => {
    it('grants access to super admins for any customer', () => {
      expect(hasCustomerAccess(superAdminUser, CUSTOMER_ID)).toBe(true)
    })

    it('grants access when user has a membership for the customer', () => {
      expect(hasCustomerAccess(customerAdminUser, CUSTOMER_ID)).toBe(true)
    })

    it('denies access when user has no membership', () => {
      expect(hasCustomerAccess(customerAdminUser, CUSTOMER_ID_2)).toBe(false)
    })

    it('grants access when user has only tenantMemberships for the customer', () => {
      expect(hasCustomerAccess(tenantMembershipOnlyUser, CUSTOMER_ID)).toBe(true)
    })

    it('denies access when tenantMembership-only user has no entry for the customer', () => {
      expect(hasCustomerAccess(tenantMembershipOnlyUser, 'unknown-customer')).toBe(false)
    })
  })

  describe('customer lifecycle helpers', () => {
    it('normalizes legacy customer lifecycle statuses', () => {
      expect(normalizeCustomerLifecycleStatus('DISABLED')).toBe('INACTIVE')
      expect(normalizeCustomerLifecycleStatus('inactive')).toBe('INACTIVE')
      expect(normalizeCustomerLifecycleStatus('ACTIVE')).toBe('ACTIVE')
      expect(normalizeCustomerLifecycleStatus('')).toBe('')
    })

    it('resolves customer lifecycle status from customer-specific membership fields', () => {
      expect(
        getCustomerLifecycleStatus(
          {
            memberships: [
              {
                customerId: CUSTOMER_ID,
                roles: ['CUSTOMER_ADMIN'],
                customer: { status: 'DISABLED' },
              },
            ],
          },
          CUSTOMER_ID,
        ),
      ).toBe('INACTIVE')

      expect(
        getCustomerLifecycleStatus(
          {
            memberships: [
              {
                customerId: CUSTOMER_ID,
                roles: ['CUSTOMER_ADMIN'],
                customerStatus: 'ACTIVE',
              },
            ],
          },
          CUSTOMER_ID,
        ),
      ).toBe('ACTIVE')
    })

    it('falls back to generic membership lifecycle fields when needed', () => {
      expect(
        getCustomerLifecycleStatus(
          {
            memberships: [
              {
                customerId: CUSTOMER_ID,
                roles: ['CUSTOMER_ADMIN'],
                status: 'INACTIVE',
              },
            ],
          },
          CUSTOMER_ID,
        ),
      ).toBe('INACTIVE')
    })

    it('detects inactive customer context from the authenticated user payload', () => {
      expect(
        isCustomerInactiveForContext(
          {
            memberships: [
              {
                customerId: CUSTOMER_ID,
                roles: ['CUSTOMER_ADMIN'],
                customerStatus: 'INACTIVE',
              },
            ],
          },
          CUSTOMER_ID,
        ),
      ).toBe(true)

      expect(isCustomerInactiveForContext(customerAdminUser, CUSTOMER_ID)).toBe(false)
    })
  })

  describe('customer topology helpers', () => {
    it('normalizes supported customer topology values', () => {
      expect(normalizeCustomerTopology('single_tenant')).toBe('SINGLE_TENANT')
      expect(normalizeCustomerTopology('MULTI_TENANT')).toBe('MULTI_TENANT')
      expect(normalizeCustomerTopology('service_provider')).toBe('')
      expect(normalizeCustomerTopology('')).toBe('')
    })

    it('resolves customer topology from customer-specific membership fields', () => {
      expect(
        getCustomerTopology(
          {
            memberships: [
              {
                customerId: CUSTOMER_ID,
                roles: ['CUSTOMER_ADMIN'],
                customer: { topology: 'single_tenant' },
              },
            ],
          },
          CUSTOMER_ID,
        ),
      ).toBe('SINGLE_TENANT')

      expect(
        getCustomerTopology(
          {
            memberships: [
              {
                customerId: CUSTOMER_ID,
                roles: ['CUSTOMER_ADMIN'],
                customerTopology: 'MULTI_TENANT',
              },
            ],
          },
          CUSTOMER_ID,
        ),
      ).toBe('MULTI_TENANT')
    })

    it('falls back to generic membership topology fields when needed', () => {
      expect(
        getCustomerTopology(
          {
            memberships: [
              {
                customerId: CUSTOMER_ID,
                roles: ['CUSTOMER_ADMIN'],
                topology: 'SINGLE_TENANT',
              },
            ],
          },
          CUSTOMER_ID,
        ),
      ).toBe('SINGLE_TENANT')
    })
  })

  describe('hasAnyCustomerRole', () => {
    it('returns true when the user holds the role on at least one customer', () => {
      expect(hasAnyCustomerRole(multiCustomerUser, 'CUSTOMER_ADMIN')).toBe(true)
    })

    it('returns false when the user lacks the role across all customers', () => {
      expect(hasAnyCustomerRole(multiCustomerUser, 'TENANT_ADMIN')).toBe(false)
    })

    it('returns false for null user', () => {
      expect(hasAnyCustomerRole(null, 'CUSTOMER_ADMIN')).toBe(false)
    })

    it('supports nested customer ids when checking customer roles', () => {
      expect(hasAnyCustomerRole(nestedCustomerMembershipUser, 'CUSTOMER_ADMIN')).toBe(true)
    })
  })

  describe('hasAnyMultiTenantCustomerAdminScope', () => {
    it('returns false when all customer-admin memberships resolve to single-tenant', () => {
      expect(
        hasAnyMultiTenantCustomerAdminScope({
          memberships: [
            {
              customerId: CUSTOMER_ID,
              roles: ['CUSTOMER_ADMIN'],
              customer: { topology: 'SINGLE_TENANT' },
            },
          ],
        }),
      ).toBe(false)
    })

    it('returns true when at least one customer-admin membership resolves to multi-tenant', () => {
      expect(
        hasAnyMultiTenantCustomerAdminScope({
          memberships: [
            {
              customerId: CUSTOMER_ID,
              roles: ['CUSTOMER_ADMIN'],
              customer: { topology: 'SINGLE_TENANT' },
            },
            {
              customerId: CUSTOMER_ID_2,
              roles: ['CUSTOMER_ADMIN'],
              customer: { topology: 'MULTI_TENANT' },
            },
          ],
        }),
      ).toBe(true)
    })

    it('returns false when topology has not been exposed yet', () => {
      expect(
        hasAnyMultiTenantCustomerAdminScope({
          memberships: [{ customerId: CUSTOMER_ID, roles: ['CUSTOMER_ADMIN'] }],
        }),
      ).toBe(false)
    })

    it('returns false when the user has no customer-admin memberships', () => {
      expect(
        hasAnyMultiTenantCustomerAdminScope({
          memberships: [{ customerId: CUSTOMER_ID, roles: ['USER'] }],
        }),
      ).toBe(false)
    })
  })

  describe('hasAnyTenantRole', () => {
    it('returns true when the user holds the role on at least one tenant membership', () => {
      expect(hasAnyTenantRole(tenantAdminUser, 'TENANT_ADMIN')).toBe(true)
    })

    it('returns false when the user lacks the role across tenant memberships', () => {
      expect(hasAnyTenantRole(tenantAdminUser, 'CUSTOMER_ADMIN')).toBe(false)
    })

    it('returns false for null user', () => {
      expect(hasAnyTenantRole(null, 'TENANT_ADMIN')).toBe(false)
    })
  })

  describe('customer scope entitlement helpers', () => {
    it('returns the selected customer scope and normalized feature entitlements', () => {
      expect(getCustomerScope(customerAdminUser, CUSTOMER_ID)).toEqual({
        customerId: CUSTOMER_ID,
        featureEntitlements: ['VMF', 'DEALS'],
        entitlementSource: 'LICENSE_LEVEL',
      })
      expect(getCustomerFeatureEntitlements(customerAdminUser, CUSTOMER_ID)).toEqual([
        'VMF',
        'DEALS',
      ])
      expect(getCustomerEntitlementSource(customerAdminUser, CUSTOMER_ID)).toBe(
        'LICENSE_LEVEL',
      )
    })

    it('checks feature entitlement membership for a selected customer', () => {
      expect(hasCustomerFeatureEntitlement(customerAdminUser, CUSTOMER_ID, 'vmf')).toBe(true)
      expect(hasCustomerFeatureEntitlement(customerAdminUser, CUSTOMER_ID, 'VIEWS')).toBe(false)
    })

    it('falls back to allow when customer scope metadata is missing', () => {
      expect(
        hasCustomerFeatureEntitlement({ memberships: [] }, CUSTOMER_ID, 'DEALS'),
      ).toBe(true)
      expect(
        hasCustomerFeatureEntitlement(
          { memberships: [] },
          CUSTOMER_ID,
          'DEALS',
          { fallbackWhenScopeMissing: false },
        ),
      ).toBe(false)
    })
  })
})

/* ================================================================== */
/*  Tenant                                                            */
/* ================================================================== */

describe('Tenant role helpers', () => {
  describe('getUserTenantRoles', () => {
    it('returns roles for a matching tenant', () => {
      expect(getUserTenantRoles(tenantAdminUser, CUSTOMER_ID, TENANT_ID)).toEqual([
        'TENANT_ADMIN',
      ])
    })

    it('returns empty for a non-matching tenant', () => {
      expect(getUserTenantRoles(tenantAdminUser, CUSTOMER_ID, TENANT_ID_2)).toEqual([])
    })

    it('returns empty for null user', () => {
      expect(getUserTenantRoles(null, CUSTOMER_ID, TENANT_ID)).toEqual([])
    })

    it('returns empty when tenantId is missing', () => {
      expect(getUserTenantRoles(tenantAdminUser, CUSTOMER_ID, null)).toEqual([])
    })
  })

  describe('hasTenantRole', () => {
    it('returns true when user has the role', () => {
      expect(hasTenantRole(tenantAdminUser, CUSTOMER_ID, TENANT_ID, 'TENANT_ADMIN')).toBe(true)
    })

    it('returns false when user lacks the role', () => {
      expect(hasTenantRole(tenantAdminUser, CUSTOMER_ID, TENANT_ID, 'CUSTOMER_ADMIN')).toBe(false)
    })
  })

  describe('hasTenantAccess', () => {
    it('grants super admin access to any tenant', () => {
      expect(hasTenantAccess(superAdminUser, CUSTOMER_ID, TENANT_ID)).toBe(true)
    })

    it('grants customer admin access to any tenant under their customer', () => {
      expect(hasTenantAccess(customerAdminUser, CUSTOMER_ID, TENANT_ID)).toBe(true)
    })

    it('grants access when user has a tenant membership', () => {
      expect(hasTenantAccess(tenantAdminUser, CUSTOMER_ID, TENANT_ID)).toBe(true)
    })

    it('denies access when user has no tenant membership and is not admin', () => {
      expect(hasTenantAccess(tenantAdminUser, CUSTOMER_ID, TENANT_ID_2)).toBe(false)
    })

    it('keeps linked-tenant access for customer-scoped tenant admins outside their admin assignment', () => {
      expect(hasTenantAccess(customerScopedTenantAdminUser, CUSTOMER_ID, TENANT_ID_2)).toBe(true)
    })

    it('allows tenant access when tenant metadata confirms assigned tenant-admin ownership', () => {
      const assignedOnlyUser = {
        id: '10',
        memberships: [{ customerId: CUSTOMER_ID, roles: ['TENANT_ADMIN', 'USER'] }],
        tenantMemberships: [],
        vmfGrants: [],
      }

      expect(
        hasTenantAccess(assignedOnlyUser, CUSTOMER_ID, TENANT_ID, {
          tenant: { tenantAdmin: { id: '10', name: 'Assigned Admin' } },
        }),
      ).toBe(true)
    })
  })
})

/* ================================================================== */
/*  VMF                                                               */
/* ================================================================== */

describe('VMF workspace helpers', () => {
  it('allows single-tenant customer users to open the VMF workspace from customer scope', () => {
    expect(
      hasVmfWorkspaceAccess(singleTenantCustomerUser, CUSTOMER_ID, null, {
        supportsTenantManagement: false,
      }),
    ).toBe(true)
  })

  it('allows tenantMembership-only users to open the VMF workspace for a single-tenant customer', () => {
    expect(
      hasVmfWorkspaceAccess(tenantMembershipOnlyUser, CUSTOMER_ID, null, {
        supportsTenantManagement: false,
      }),
    ).toBe(true)
  })

  it('requires tenant scope for multi-tenant standard users', () => {
    expect(
      hasVmfWorkspaceAccess(singleTenantCustomerUser, CUSTOMER_ID, TENANT_ID, {
        supportsTenantManagement: true,
      }),
    ).toBe(false)
    expect(
      hasVmfWorkspaceAccess(vmfUser, CUSTOMER_ID, TENANT_ID, {
        supportsTenantManagement: true,
      }),
    ).toBe(true)
  })

  it('keeps VMF management access restricted to administrators', () => {
    expect(hasVmfWorkspaceManagementAccess(customerAdminUser, CUSTOMER_ID, TENANT_ID)).toBe(true)
    expect(hasVmfWorkspaceManagementAccess(tenantAdminUser, CUSTOMER_ID, TENANT_ID)).toBe(true)
    expect(hasVmfWorkspaceManagementAccess(vmfUser, CUSTOMER_ID, TENANT_ID)).toBe(false)
  })

  it('treats customer-scoped tenant admins as read-only users on linked tenants they do not administer', () => {
    expect(
      hasVmfWorkspaceAccess(customerScopedTenantAdminUser, CUSTOMER_ID, TENANT_ID_2, {
        supportsTenantManagement: true,
        tenant: otherTenant,
      }),
    ).toBe(true)
    expect(
      hasVmfWorkspaceManagementAccess(customerScopedTenantAdminUser, CUSTOMER_ID, TENANT_ID_2, {
        tenant: otherTenant,
      }),
    ).toBe(false)
  })

  it('allows customer-scoped tenant admins to manage VMFs only for assigned tenants', () => {
    expect(
      hasVmfWorkspaceManagementAccess(customerScopedTenantAdminUser, CUSTOMER_ID, TENANT_ID, {
        tenant: assignedTenant,
      }),
    ).toBe(true)
  })
})

describe('Assigned tenant-admin helper', () => {
  it('detects tenant-admin ownership from tenant metadata', () => {
    expect(isAssignedTenantAdmin(customerScopedTenantAdminUser, assignedTenant)).toBe(true)
    expect(isAssignedTenantAdmin(customerScopedTenantAdminUser, otherTenant)).toBe(false)
  })
})

describe('VMF permission helpers', () => {
  describe('getUserVmfPermissions', () => {
    it('returns permissions for a matching VMF', () => {
      expect(getUserVmfPermissions(vmfUser, CUSTOMER_ID, TENANT_ID, VMF_ID)).toEqual([
        'READ',
        'WRITE',
      ])
    })

    it('returns empty for a non-matching VMF', () => {
      expect(getUserVmfPermissions(vmfUser, CUSTOMER_ID, TENANT_ID, '999')).toEqual([])
    })

    it('returns empty for null user', () => {
      expect(getUserVmfPermissions(null, CUSTOMER_ID, TENANT_ID, VMF_ID)).toEqual([])
    })

    it('returns empty when vmfId is missing', () => {
      expect(getUserVmfPermissions(vmfUser, CUSTOMER_ID, TENANT_ID, null)).toEqual([])
    })
  })

  describe('hasVmfPermission', () => {
    it('returns true when user has the permission', () => {
      expect(hasVmfPermission(vmfUser, CUSTOMER_ID, TENANT_ID, VMF_ID, 'READ')).toBe(true)
    })

    it('returns false when user lacks the permission', () => {
      expect(hasVmfPermission(vmfUser, CUSTOMER_ID, TENANT_ID, VMF_ID, 'DELETE')).toBe(false)
    })
  })

  describe('hasVmfAccess', () => {
    it('grants super admin access', () => {
      expect(hasVmfAccess(superAdminUser, CUSTOMER_ID, TENANT_ID, VMF_ID)).toBe(true)
    })

    it('grants customer admin access', () => {
      expect(hasVmfAccess(customerAdminUser, CUSTOMER_ID, TENANT_ID, VMF_ID)).toBe(true)
    })

    it('grants tenant admin access', () => {
      expect(hasVmfAccess(tenantAdminUser, CUSTOMER_ID, TENANT_ID, VMF_ID)).toBe(true)
    })

    it('grants access when user has VMF grant', () => {
      expect(hasVmfAccess(vmfUser, CUSTOMER_ID, TENANT_ID, VMF_ID)).toBe(true)
    })

    it('denies access when user has no grant and is not admin', () => {
      const basicUser = {
        id: '99',
        memberships: [{ customerId: CUSTOMER_ID, roles: ['USER'] }],
        tenantMemberships: [
          { customerId: CUSTOMER_ID, tenantId: TENANT_ID, roles: ['USER'] },
        ],
        vmfGrants: [],
      }
      expect(hasVmfAccess(basicUser, CUSTOMER_ID, TENANT_ID, VMF_ID)).toBe(false)
    })
  })
})

/* ================================================================== */
/*  Aggregate helpers                                                 */
/* ================================================================== */

describe('Aggregate helpers', () => {
  describe('getAccessibleCustomerIds', () => {
    it('returns customer IDs from memberships', () => {
      expect(getAccessibleCustomerIds(multiCustomerUser)).toEqual([
        CUSTOMER_ID,
        CUSTOMER_ID_2,
      ])
    })

    it('excludes platform memberships (customerId null)', () => {
      expect(getAccessibleCustomerIds(superAdminUser)).toEqual([])
    })

    it('returns empty for null user', () => {
      expect(getAccessibleCustomerIds(null)).toEqual([])
    })

    it('extracts nested customer ids from memberships', () => {
      expect(getAccessibleCustomerIds(nestedCustomerMembershipUser)).toEqual([CUSTOMER_ID])
    })

    it('includes customer ids inferred from tenant memberships', () => {
      expect(getAccessibleCustomerIds(tenantMembershipOnlyUser)).toEqual([
        CUSTOMER_ID,
        CUSTOMER_ID_2,
      ])
    })
  })

  describe('getAccessibleTenantIds', () => {
    it('returns tenant IDs for a given customer', () => {
      expect(getAccessibleTenantIds(multiCustomerUser, CUSTOMER_ID)).toEqual([
        TENANT_ID,
      ])
    })

    it('returns empty for a customer with no tenant memberships', () => {
      expect(getAccessibleTenantIds(customerAdminUser, CUSTOMER_ID)).toEqual([])
    })

    it('returns empty for null user', () => {
      expect(getAccessibleTenantIds(null, CUSTOMER_ID)).toEqual([])
    })
  })
})
