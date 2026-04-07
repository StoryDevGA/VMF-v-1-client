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
const SINGLE_ROLE_PRIORITY = new Map([
  ['SUPER_ADMIN', 4],
  ['CUSTOMER_ADMIN', 3],
  ['TENANT_ADMIN', 2],
  ['USER', 0],
])

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

const getSingleRolePriority = (roleKey) => {
  if (SINGLE_ROLE_PRIORITY.has(roleKey)) {
    return SINGLE_ROLE_PRIORITY.get(roleKey)
  }

  return 1
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

export function normalizeSingleRoleSelection({
  roles = [],
  availableRoles = [],
} = {}) {
  const availableRoleOrder = new Map(
    (availableRoles ?? [])
      .map((role, index) => [normalizeRoleKey(role), index]),
  )
  const availableRoleSet = new Set(availableRoleOrder.keys())

  const normalizedRoles = [...new Set(
    (roles ?? [])
      .map((role) => normalizeRoleKey(role))
      .filter(Boolean),
  )]
    .filter((role) => availableRoleSet.size === 0 || availableRoleSet.has(role))
    .sort((leftRole, rightRole) => {
      const priorityDelta = getSingleRolePriority(rightRole) - getSingleRolePriority(leftRole)
      if (priorityDelta !== 0) return priorityDelta

      const leftIndex = availableRoleOrder.get(leftRole)
      const rightIndex = availableRoleOrder.get(rightRole)
      const hasLeftIndex = Number.isInteger(leftIndex)
      const hasRightIndex = Number.isInteger(rightIndex)

      if (hasLeftIndex && hasRightIndex && leftIndex !== rightIndex) {
        return leftIndex - rightIndex
      }

      if (hasLeftIndex !== hasRightIndex) {
        return hasLeftIndex ? -1 : 1
      }

      return leftRole.localeCompare(rightRole)
    })

  return normalizedRoles[0] ? [normalizedRoles[0]] : []
}
