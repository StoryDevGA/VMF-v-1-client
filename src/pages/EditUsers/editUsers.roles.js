/**
 * Shared role-resolution helpers for customer-app user management flows.
 *
 * FE can safely expose baseline assignable roles plus any non-reserved roles
 * already visible in customer-scoped user memberships or an optional role
 * catalogue response. Reserved governance roles stay excluded.
 */

export const BASE_ASSIGNABLE_ROLE_KEYS = ['USER', 'TENANT_ADMIN']
export const RESERVED_ASSIGNABLE_ROLE_KEYS = ['CUSTOMER_ADMIN', 'SUPER_ADMIN']

const RESERVED_ROLE_SET = new Set(RESERVED_ASSIGNABLE_ROLE_KEYS)
const BASE_ROLE_RANK = new Map(BASE_ASSIGNABLE_ROLE_KEYS.map((role, index) => [role, index]))

export const normalizeRoleKey = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')

export const getTopologyAwareRoles = (roles, topology) => {
  const normalizedTopology = String(topology ?? '')
    .trim()
    .toUpperCase()

  if (normalizedTopology === 'MULTI_TENANT') {
    return roles
  }

  return roles.filter((role) => role !== 'TENANT_ADMIN')
}

const isReservedAssignableRole = (roleKey) => RESERVED_ROLE_SET.has(roleKey)

const getRoleSortRank = (roleKey) =>
  BASE_ROLE_RANK.has(roleKey) ? BASE_ROLE_RANK.get(roleKey) : Number.MAX_SAFE_INTEGER

const compareRoleKeys = (leftRole, rightRole) => {
  const rankDelta = getRoleSortRank(leftRole) - getRoleSortRank(rightRole)
  if (rankDelta !== 0) return rankDelta
  return leftRole.localeCompare(rightRole)
}

const getCatalogueRoleKey = (role) =>
  normalizeRoleKey(role?.key ?? role?.name ?? role?.id ?? role?._id)

const isActiveCatalogueRole = (role) => {
  if (typeof role?.isActive === 'boolean') {
    return role.isActive
  }

  const normalizedStatus = String(role?.status ?? '')
    .trim()
    .toUpperCase()

  if (!normalizedStatus) return true
  return normalizedStatus === 'ACTIVE'
}

export const getCustomerScopedRoles = (user, customerId) => {
  const memberships = Array.isArray(user?.memberships) ? user.memberships : []
  const scopedMemberships = memberships.filter((membership) => {
    if (!customerId) return true
    return String(membership?.customerId ?? '') === String(customerId)
  })

  return scopedMemberships.flatMap((membership) => membership?.roles ?? [])
}

export function resolveAssignableUserRoles({
  users = [],
  customerId,
  roleCatalogue = [],
  includeRoles = [],
} = {}) {
  const roleKeys = new Set(BASE_ASSIGNABLE_ROLE_KEYS)

  for (const role of roleCatalogue) {
    const roleKey = getCatalogueRoleKey(role)
    if (!roleKey || !isActiveCatalogueRole(role) || isReservedAssignableRole(roleKey)) continue
    roleKeys.add(roleKey)
  }

  for (const user of users) {
    for (const role of getCustomerScopedRoles(user, customerId)) {
      const roleKey = normalizeRoleKey(role)
      if (!roleKey || isReservedAssignableRole(roleKey)) continue
      roleKeys.add(roleKey)
    }
  }

  for (const role of includeRoles) {
    const roleKey = normalizeRoleKey(role)
    if (!roleKey || isReservedAssignableRole(roleKey)) continue
    roleKeys.add(roleKey)
  }

  return [...roleKeys].sort(compareRoleKeys)
}
