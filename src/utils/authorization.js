/**
 * Authorization Utilities
 *
 * Pure helper functions for checking a user's roles and permissions
 * against the hierarchical membership model returned by the backend:
 *
 *   memberships[]         – customer-level (customerId + roles[])
 *                           platform-level when customerId is null
 *   tenantMemberships[]   – tenant-level (customerId + tenantId + roles[])
 *   vmfGrants[]           – VMF-level (customerId + tenantId + vmfId + permissions[])
 *
 * These functions are intentionally pure (no React/Redux dependency)
 * so they can be used in hooks, middleware, route guards, or tests.
 */

/* ------------------------------------------------------------------ */
/*  Platform                                                          */
/* ------------------------------------------------------------------ */

/**
 * Extract all platform-level roles from a user object.
 * Platform memberships have customerId === null.
 *
 * @param {Object} user – The user object from the Redux store / API
 * @returns {string[]}
 */
export const getUserPlatformRoles = (user) => {
  if (!user?.memberships) return []
  return user.memberships
    .filter((m) => m.customerId === null || m.customerId === undefined)
    .flatMap((m) => m.roles ?? [])
}

/**
 * Check whether the user holds a specific platform-level role.
 *
 * @param {Object} user
 * @param {string} role  – e.g. 'SUPER_ADMIN'
 * @returns {boolean}
 */
export const hasPlatformRole = (user, role) =>
  getUserPlatformRoles(user).includes(role)

/**
 * Shorthand: is the user a Super Admin?
 *
 * @param {Object} user
 * @returns {boolean}
 */
export const isSuperAdmin = (user) => hasPlatformRole(user, 'SUPER_ADMIN')

/* ------------------------------------------------------------------ */
/*  Customer                                                          */
/* ------------------------------------------------------------------ */

/**
 * Extract customer-level roles for a specific customer.
 *
 * @param {Object} user
 * @param {string} customerId
 * @returns {string[]}
 */
export const getUserCustomerRoles = (user, customerId) => {
  if (!user?.memberships || !customerId) return []
  const membership = user.memberships.find(
    (m) => m.customerId && m.customerId.toString() === customerId.toString(),
  )
  return membership?.roles ?? []
}

/**
 * Check whether the user holds a specific role for a customer.
 *
 * @param {Object} user
 * @param {string} customerId
 * @param {string} role  – e.g. 'CUSTOMER_ADMIN'
 * @returns {boolean}
 */
export const hasCustomerRole = (user, customerId, role) =>
  getUserCustomerRoles(user, customerId).includes(role)

/**
 * Check whether the user has any membership for the given customer
 * (regardless of role).
 *
 * @param {Object} user
 * @param {string} customerId
 * @returns {boolean}
 */
export const hasCustomerAccess = (user, customerId) => {
  if (isSuperAdmin(user)) return true
  return getUserCustomerRoles(user, customerId).length > 0
}

/* ------------------------------------------------------------------ */
/*  Tenant                                                            */
/* ------------------------------------------------------------------ */

/**
 * Extract tenant-level roles for a specific customer + tenant pair.
 *
 * @param {Object} user
 * @param {string} customerId
 * @param {string} tenantId
 * @returns {string[]}
 */
export const getUserTenantRoles = (user, customerId, tenantId) => {
  if (!user?.tenantMemberships || !customerId || !tenantId) return []
  const membership = user.tenantMemberships.find(
    (tm) =>
      tm.customerId?.toString() === customerId.toString() &&
      tm.tenantId?.toString() === tenantId.toString(),
  )
  return membership?.roles ?? []
}

/**
 * Check whether the user holds a specific role for a tenant.
 *
 * @param {Object} user
 * @param {string} customerId
 * @param {string} tenantId
 * @param {string} role  – e.g. 'TENANT_ADMIN'
 * @returns {boolean}
 */
export const hasTenantRole = (user, customerId, tenantId, role) =>
  getUserTenantRoles(user, customerId, tenantId).includes(role)

/**
 * Check whether the user has access to a tenant (through any level
 * of the role hierarchy: Super Admin > Customer Admin > Tenant membership).
 *
 * @param {Object} user
 * @param {string} customerId
 * @param {string} tenantId
 * @returns {boolean}
 */
export const hasTenantAccess = (user, customerId, tenantId) => {
  if (isSuperAdmin(user)) return true
  if (hasCustomerRole(user, customerId, 'CUSTOMER_ADMIN')) return true
  return getUserTenantRoles(user, customerId, tenantId).length > 0
}

/* ------------------------------------------------------------------ */
/*  VMF                                                               */
/* ------------------------------------------------------------------ */

/**
 * Extract VMF-level permissions for a specific VMF.
 *
 * @param {Object} user
 * @param {string} customerId
 * @param {string} tenantId
 * @param {string} vmfId
 * @returns {string[]}
 */
export const getUserVmfPermissions = (user, customerId, tenantId, vmfId) => {
  if (!user?.vmfGrants || !customerId || !tenantId || !vmfId) return []
  const grant = user.vmfGrants.find(
    (g) =>
      g.customerId?.toString() === customerId.toString() &&
      g.tenantId?.toString() === tenantId.toString() &&
      g.vmfId?.toString() === vmfId.toString(),
  )
  return grant?.permissions ?? []
}

/**
 * Check whether the user holds a specific permission on a VMF.
 *
 * @param {Object} user
 * @param {string} customerId
 * @param {string} tenantId
 * @param {string} vmfId
 * @param {string} permission  – e.g. 'READ', 'WRITE'
 * @returns {boolean}
 */
export const hasVmfPermission = (user, customerId, tenantId, vmfId, permission) =>
  getUserVmfPermissions(user, customerId, tenantId, vmfId).includes(permission)

/**
 * Check whether the user has access to a VMF (through any level of
 * the role hierarchy: Super Admin > Customer Admin > Tenant Admin > VMF grant).
 *
 * @param {Object} user
 * @param {string} customerId
 * @param {string} tenantId
 * @param {string} vmfId
 * @returns {boolean}
 */
export const hasVmfAccess = (user, customerId, tenantId, vmfId) => {
  if (isSuperAdmin(user)) return true
  if (hasCustomerRole(user, customerId, 'CUSTOMER_ADMIN')) return true
  if (hasTenantRole(user, customerId, tenantId, 'TENANT_ADMIN')) return true
  return getUserVmfPermissions(user, customerId, tenantId, vmfId).length > 0
}

/* ------------------------------------------------------------------ */
/*  Aggregate helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Return all customer IDs the user has any membership for.
 *
 * @param {Object} user
 * @returns {string[]}
 */
export const getAccessibleCustomerIds = (user) => {
  if (!user?.memberships) return []
  return user.memberships
    .filter((m) => m.customerId !== null && m.customerId !== undefined)
    .map((m) => m.customerId.toString())
}

/**
 * Return all tenant IDs the user has membership for under a given customer.
 *
 * @param {Object} user
 * @param {string} customerId
 * @returns {string[]}
 */
export const getAccessibleTenantIds = (user, customerId) => {
  if (!user?.tenantMemberships || !customerId) return []
  return user.tenantMemberships
    .filter((tm) => tm.customerId?.toString() === customerId.toString())
    .map((tm) => tm.tenantId.toString())
}
