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

const getMembershipCustomerId = (membership) => {
  const customerId =
    membership?.customerId
    ?? membership?.customer?.id
    ?? membership?.customer?._id

  return customerId === null || customerId === undefined
    ? null
    : customerId.toString()
}

const getUserId = (user) => {
  const userId = user?._id ?? user?.id
  return userId === null || userId === undefined ? null : userId.toString()
}

const getTenantAdminIds = (tenant) => {
  const directTenantAdminId = tenant?.tenantAdmin?.id ?? tenant?.tenantAdmin?._id
  const tenantAdminUserIds = Array.isArray(tenant?.tenantAdminUserIds)
    ? tenant.tenantAdminUserIds
    : []

  return [...new Set(
    [directTenantAdminId, ...tenantAdminUserIds]
      .filter((tenantAdminId) => tenantAdminId !== null && tenantAdminId !== undefined)
      .map((tenantAdminId) => tenantAdminId.toString()),
  )]
}

export const isAssignedTenantAdmin = (user, tenant) => {
  const userId = getUserId(user)
  if (!userId || !tenant) return false

  return getTenantAdminIds(tenant).includes(userId)
}

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
    .filter((m) => getMembershipCustomerId(m) === null)
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
  const normalizedCustomerId = customerId.toString()
  const membership = user.memberships.find(
    (m) => getMembershipCustomerId(m) === normalizedCustomerId,
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
  if (getUserCustomerRoles(user, customerId).length > 0) return true
  return getAccessibleTenantIds(user, customerId).length > 0
}

/**
 * Normalize customer lifecycle status to the shared ACTIVE/INACTIVE model.
 * Keeps compatibility with legacy DISABLED payloads.
 *
 * @param {string | undefined | null} status
 * @returns {string}
 */
export const normalizeCustomerLifecycleStatus = (status) => {
  const normalizedStatus = String(status ?? '')
    .trim()
    .toUpperCase()

  if (!normalizedStatus) return ''
  return normalizedStatus === 'DISABLED' ? 'INACTIVE' : normalizedStatus
}

/**
 * Best-effort resolver for the selected customer's lifecycle status from the
 * authenticated user payload. Supports customer-specific status keys when the
 * session profile includes them.
 *
 * @param {Object} user
 * @param {string} customerId
 * @returns {string}
 */
export const getCustomerLifecycleStatus = (user, customerId) => {
  if (!user?.memberships || !customerId) return ''
  const normalizedCustomerId = customerId.toString()

  const membership = user.memberships.find(
    (m) => getMembershipCustomerId(m) === normalizedCustomerId,
  )

  if (!membership || typeof membership !== 'object') return ''

  const candidateStatuses = [
    membership?.customer?.status,
    membership?.customerStatus,
    membership?.customerLifecycleStatus,
    membership?.customer?.lifecycleStatus,
    membership?.status,
    membership?.lifecycleStatus,
  ]

  for (const candidateStatus of candidateStatuses) {
    const normalizedStatus = normalizeCustomerLifecycleStatus(candidateStatus)
    if (normalizedStatus) return normalizedStatus
  }

  return ''
}

/**
 * Normalize customer topology to the shared SINGLE_TENANT / MULTI_TENANT model.
 *
 * @param {string | undefined | null} topology
 * @returns {string}
 */
export const normalizeCustomerTopology = (topology) => {
  const normalizedTopology = String(topology ?? '')
    .trim()
    .toUpperCase()

  if (normalizedTopology === 'SINGLE_TENANT' || normalizedTopology === 'MULTI_TENANT') {
    return normalizedTopology
  }

  return ''
}

/**
 * Best-effort resolver for the selected customer's topology from the
 * authenticated user payload. Supports customer-specific topology keys when the
 * session profile includes them.
 *
 * @param {Object} user
 * @param {string} customerId
 * @returns {string}
 */
export const getCustomerTopology = (user, customerId) => {
  if (!user?.memberships || !customerId) return ''
  const normalizedCustomerId = customerId.toString()

  const membership = user.memberships.find(
    (m) => getMembershipCustomerId(m) === normalizedCustomerId,
  )

  if (!membership || typeof membership !== 'object') return ''

  const candidateTopologies = [
    membership?.customer?.topology,
    membership?.customerTopology,
    membership?.customer?.customerTopology,
    membership?.topology,
  ]

  for (const candidateTopology of candidateTopologies) {
    const normalizedTopology = normalizeCustomerTopology(candidateTopology)
    if (normalizedTopology) return normalizedTopology
  }

  return ''
}

/**
 * Check whether the selected customer is explicitly marked inactive in the
 * authenticated user payload.
 *
 * @param {Object} user
 * @param {string} customerId
 * @returns {boolean}
 */
export const isCustomerInactiveForContext = (user, customerId) =>
  getCustomerLifecycleStatus(user, customerId) === 'INACTIVE'

/**
 * Check whether the user holds a specific role for any customer
 * membership.
 *
 * @param {Object} user
 * @param {string} role
 * @returns {boolean}
 */
export const hasAnyCustomerRole = (user, role) => {
  if (!user?.memberships || !role) return false

  return user.memberships.some(
    (membership) =>
      getMembershipCustomerId(membership) !== null
      && (membership.roles ?? []).includes(role),
  )
}

/**
 * Check whether the user holds a specific role across any tenant
 * membership.
 *
 * @param {Object} user
 * @param {string} role
 * @returns {boolean}
 */
export const hasAnyTenantRole = (user, role) => {
  if (!user?.tenantMemberships || !role) return false

  return user.tenantMemberships.some(
    (tenantMembership) => (tenantMembership.roles ?? []).includes(role),
  )
}

/**
 * Best-effort check for whether any CUSTOMER_ADMIN membership currently
 * resolves to multi-tenant topology. Used when customer-admin UI needs a
 * safer startup fallback before selected customer context is initialized.
 *
 * Returns `true` when at least one admin membership is explicitly
 * `MULTI_TENANT`. Returns `false` when all resolved admin topologies are
 * `SINGLE_TENANT` or when no admin membership exposes topology data.
 *
 * @param {Object} user
 * @returns {boolean}
 */
export const hasAnyMultiTenantCustomerAdminScope = (user) => {
  if (!user?.memberships) return false

  const customerAdminMemberships = user.memberships.filter(
    (membership) =>
      getMembershipCustomerId(membership) !== null
      && (membership.roles ?? []).includes('CUSTOMER_ADMIN'),
  )

  if (customerAdminMemberships.length === 0) return false

  const resolvedTopologies = customerAdminMemberships
    .map((membership) => getCustomerTopology(user, getMembershipCustomerId(membership)))
    .filter(Boolean)

  if (resolvedTopologies.length === 0) return false

  return resolvedTopologies.includes('MULTI_TENANT')
}

/**
 * Return the entitlement scope object for a selected customer when exposed in
 * the authenticated user payload.
 *
 * @param {Object} user
 * @param {string} customerId
 * @returns {Object|null}
 */
export const getCustomerScope = (user, customerId) => {
  if (!customerId) return null
  if (!Array.isArray(user?.customerScopes)) return null

  const normalizedCustomerId = customerId.toString()

  const scope = user.customerScopes.find((entry) => {
    const scopeCustomerId = entry?.customerId
    if (scopeCustomerId === null || scopeCustomerId === undefined) return false
    return scopeCustomerId.toString() === normalizedCustomerId
  })

  return scope ?? null
}

/**
 * Return normalized feature entitlements for the selected customer scope.
 *
 * @param {Object} user
 * @param {string} customerId
 * @returns {string[]}
 */
export const getCustomerFeatureEntitlements = (user, customerId) => {
  const scope = getCustomerScope(user, customerId)
  if (!scope) return []

  if (!Array.isArray(scope.featureEntitlements)) return []

  return Array.from(
    new Set(
      scope.featureEntitlements
        .map((feature) => String(feature ?? '').trim().toUpperCase())
        .filter(Boolean),
    ),
  )
}

/**
 * Check if the selected customer scope includes a feature entitlement.
 * Falls back to allow when no scope is available to preserve backward
 * compatibility on stale sessions.
 *
 * @param {Object} user
 * @param {string} customerId
 * @param {string} featureKey
 * @param {{ fallbackWhenScopeMissing?: boolean }} [options]
 * @returns {boolean}
 */
export const hasCustomerFeatureEntitlement = (
  user,
  customerId,
  featureKey,
  { fallbackWhenScopeMissing = true } = {},
) => {
  const normalizedFeatureKey = String(featureKey ?? '').trim().toUpperCase()
  if (!normalizedFeatureKey) return false
  if (!customerId) return false

  const scope = getCustomerScope(user, customerId)
  if (!scope) return fallbackWhenScopeMissing

  return getCustomerFeatureEntitlements(user, customerId).includes(normalizedFeatureKey)
}

/**
 * Return normalized entitlement source metadata for the selected customer.
 *
 * @param {Object} user
 * @param {string} customerId
 * @returns {string}
 */
export const getCustomerEntitlementSource = (user, customerId) => {
  const scope = getCustomerScope(user, customerId)
  if (!scope) return ''

  return String(scope.entitlementSource ?? '').trim().toUpperCase()
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
 * @param {{ tenant?: Object | null }} [options]
 * @returns {boolean}
 */
export const hasTenantAccess = (user, customerId, tenantId, { tenant = null } = {}) => {
  if (!customerId || !tenantId) return false
  if (isSuperAdmin(user)) return true
  if (hasCustomerRole(user, customerId, 'CUSTOMER_ADMIN')) return true
  if (hasTenantRole(user, customerId, tenantId, 'TENANT_ADMIN')) return true
  if (isAssignedTenantAdmin(user, tenant)) return true
  return getUserTenantRoles(user, customerId, tenantId).length > 0
}

/* ------------------------------------------------------------------ */
/*  VMF                                                               */
/* ------------------------------------------------------------------ */

/**
 * Check whether the current customer/tenant scope can open the VMF workspace.
 *
 * This is intentionally broader than VMF-level grant checks:
 * - single-tenant customer users can open the workspace from customer scope
 * - multi-tenant users must resolve a tenant they can access
 * - administrators keep their existing scope access
 *
 * @param {Object} user
 * @param {string} customerId
 * @param {string | null | undefined} tenantId
 * @param {{ supportsTenantManagement?: boolean, tenant?: Object | null }} [options]
 * @returns {boolean}
 */
export const hasVmfWorkspaceAccess = (
  user,
  customerId,
  tenantId,
  { supportsTenantManagement = true, tenant = null } = {},
) => {
  if (!customerId) return false
  if (isSuperAdmin(user)) return true
  if (hasCustomerRole(user, customerId, 'CUSTOMER_ADMIN')) return true

  if (!supportsTenantManagement) {
    return hasCustomerAccess(user, customerId)
  }

  if (!tenantId) return false
  return hasTenantAccess(user, customerId, tenantId, { tenant })
}

/**
 * Check whether the current customer/tenant scope can manage VMFs.
 *
 * @param {Object} user
 * @param {string} customerId
 * @param {string | null | undefined} tenantId
 * @param {{ tenant?: Object | null }} [options]
 * @returns {boolean}
 */
export const hasVmfWorkspaceManagementAccess = (
  user,
  customerId,
  tenantId,
  { tenant = null } = {},
) => {
  if (!customerId) return false
  if (isSuperAdmin(user)) return true
  if (hasCustomerRole(user, customerId, 'CUSTOMER_ADMIN')) return true
  if (!tenantId) return false
  if (hasTenantRole(user, customerId, tenantId, 'TENANT_ADMIN')) return true
  return isAssignedTenantAdmin(user, tenant)
}

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
/*  Resolved-permission helpers (FE-02)                              */
/* ------------------------------------------------------------------ */

/**
 * Check whether a `resolvedPermissions` platform bucket includes a permission.
 * Super Admin platform role is treated as an implicit bypass for all checks.
 *
 * @param {import('../store/slices/authSlice.js').ResolvedPermissions|null|undefined} resolvedPermissions
 * @param {string} permission  – e.g. 'PLATFORM_MANAGE'
 * @returns {boolean}
 */
export const hasPlatformPermission = (resolvedPermissions, permission) => {
  if (!resolvedPermissions || !permission) return false
  const platform = resolvedPermissions.platform
  if (!platform) return false
  const normalizedPermission = permission.trim().toUpperCase()
  if (platform.roleKeys?.includes('SUPER_ADMIN')) return true
  return Array.isArray(platform.permissions) && platform.permissions.includes(normalizedPermission)
}

/**
 * Check whether a `resolvedPermissions` customers bucket includes a permission
 * for the given customer ID. Falls back to the platform bucket's SUPER_ADMIN bypass.
 *
 * @param {import('../store/slices/authSlice.js').ResolvedPermissions|null|undefined} resolvedPermissions
 * @param {string} customerId
 * @param {string} permission  – e.g. 'CUSTOMER_VIEW'
 * @returns {boolean}
 */
export const hasCustomerPermission = (resolvedPermissions, customerId, permission) => {
  if (!resolvedPermissions || !customerId || !permission) return false
  if (resolvedPermissions.platform?.roleKeys?.includes('SUPER_ADMIN')) return true
  const normalizedCustomerId = customerId.toString()
  const normalizedPermission = permission.trim().toUpperCase()
  const bucket = Array.isArray(resolvedPermissions.customers)
    ? resolvedPermissions.customers.find(
        (c) => c.customerId?.toString() === normalizedCustomerId,
      )
    : null
  return bucket != null && Array.isArray(bucket.permissions) &&
    bucket.permissions.includes(normalizedPermission)
}

/**
 * Check whether a `resolvedPermissions` tenants bucket includes a permission
 * for the given customer + tenant pair. Falls back to platform SUPER_ADMIN.
 *
 * @param {import('../store/slices/authSlice.js').ResolvedPermissions|null|undefined} resolvedPermissions
 * @param {string} customerId
 * @param {string} tenantId
 * @param {string} permission  – e.g. 'VMF_CREATE'
 * @returns {boolean}
 */
export const hasTenantPermission = (resolvedPermissions, customerId, tenantId, permission) => {
  if (!resolvedPermissions || !customerId || !tenantId || !permission) return false
  if (resolvedPermissions.platform?.roleKeys?.includes('SUPER_ADMIN')) return true
  const normalizedCustomerId = customerId.toString()
  const normalizedTenantId = tenantId.toString()
  const normalizedPermission = permission.trim().toUpperCase()
  const bucket = Array.isArray(resolvedPermissions.tenants)
    ? resolvedPermissions.tenants.find(
        (t) =>
          t.customerId?.toString() === normalizedCustomerId &&
          t.tenantId?.toString() === normalizedTenantId,
      )
    : null
  return bucket != null && Array.isArray(bucket.permissions) &&
    bucket.permissions.includes(normalizedPermission)
}

/**
 * Check whether `resolvedPermissions` contains a permission in ANY bucket
 * (platform, any customer, or any tenant). Useful for navigation visibility
 * where the precise scope is not needed.
 *
 * @param {import('../store/slices/authSlice.js').ResolvedPermissions|null|undefined} resolvedPermissions
 * @param {string} permission
 * @returns {boolean}
 */
export const hasAnyPermission = (resolvedPermissions, permission) => {
  if (!resolvedPermissions || !permission) return false
  const normalizedPermission = permission.trim().toUpperCase()
  if (resolvedPermissions.platform?.roleKeys?.includes('SUPER_ADMIN')) return true
  if (
    Array.isArray(resolvedPermissions.platform?.permissions) &&
    resolvedPermissions.platform.permissions.includes(normalizedPermission)
  ) return true
  if (
    Array.isArray(resolvedPermissions.customers) &&
    resolvedPermissions.customers.some(
      (c) => Array.isArray(c.permissions) && c.permissions.includes(normalizedPermission),
    )
  ) return true
  if (
    Array.isArray(resolvedPermissions.tenants) &&
    resolvedPermissions.tenants.some(
      (t) => Array.isArray(t.permissions) && t.permissions.includes(normalizedPermission),
    )
  ) return true
  return false
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
  const membershipCustomerIds = Array.isArray(user?.memberships)
    ? user.memberships
    .map((m) => getMembershipCustomerId(m))
    .filter(Boolean)
    : []
  const tenantMembershipCustomerIds = Array.isArray(user?.tenantMemberships)
    ? user.tenantMemberships
      .map((tm) => {
        const customerId = tm?.customerId
        return customerId === null || customerId === undefined
          ? null
          : customerId.toString()
      })
      .filter(Boolean)
    : []

  return Array.from(new Set([...membershipCustomerIds, ...tenantMembershipCustomerIds]))
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
