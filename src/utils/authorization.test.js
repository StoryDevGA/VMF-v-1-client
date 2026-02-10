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
  getUserTenantRoles,
  hasTenantRole,
  hasTenantAccess,
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
  })
})

/* ================================================================== */
/*  VMF                                                               */
/* ================================================================== */

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
