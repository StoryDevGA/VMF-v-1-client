/**
 * useAuthorization Hook
 *
 * React hook that wraps the pure authorization helpers from
 * `utils/authorization.js` against the current Redux user.
 *
 * Usage:
 *   const { isSuperAdmin, hasCustomerAccess, hasTenantAccess } = useAuthorization()
 *   if (hasCustomerAccess('607f...')) { ... }
 */

import { useMemo, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '../store/slices/authSlice.js'
import {
  getUserPlatformRoles,
  hasPlatformRole as _hasPlatformRole,
  isSuperAdmin as _isSuperAdmin,
  getUserCustomerRoles,
  hasCustomerRole as _hasCustomerRole,
  hasCustomerAccess as _hasCustomerAccess,
  getUserTenantRoles,
  hasTenantRole as _hasTenantRole,
  hasTenantAccess as _hasTenantAccess,
  getUserVmfPermissions,
  hasVmfPermission as _hasVmfPermission,
  hasVmfAccess as _hasVmfAccess,
  getAccessibleCustomerIds,
  getAccessibleTenantIds,
} from '../utils/authorization.js'

export function useAuthorization() {
  const user = useSelector(selectCurrentUser)

  /* ---- Platform ---- */

  const platformRoles = useMemo(
    () => getUserPlatformRoles(user),
    [user],
  )

  const isSuperAdmin = useMemo(() => _isSuperAdmin(user), [user])

  const hasPlatformRole = useCallback(
    (role) => _hasPlatformRole(user, role),
    [user],
  )

  /* ---- Customer ---- */

  const getCustomerRoles = useCallback(
    (customerId) => getUserCustomerRoles(user, customerId),
    [user],
  )

  const hasCustomerRole = useCallback(
    (customerId, role) => _hasCustomerRole(user, customerId, role),
    [user],
  )

  const hasCustomerAccess = useCallback(
    (customerId) => _hasCustomerAccess(user, customerId),
    [user],
  )

  const accessibleCustomerIds = useMemo(
    () => getAccessibleCustomerIds(user),
    [user],
  )

  /* ---- Tenant ---- */

  const getTenantRoles = useCallback(
    (customerId, tenantId) => getUserTenantRoles(user, customerId, tenantId),
    [user],
  )

  const hasTenantRole = useCallback(
    (customerId, tenantId, role) => _hasTenantRole(user, customerId, tenantId, role),
    [user],
  )

  const hasTenantAccess = useCallback(
    (customerId, tenantId) => _hasTenantAccess(user, customerId, tenantId),
    [user],
  )

  const getAccessibleTenants = useCallback(
    (customerId) => getAccessibleTenantIds(user, customerId),
    [user],
  )

  /* ---- VMF ---- */

  const getVmfPermissions = useCallback(
    (customerId, tenantId, vmfId) =>
      getUserVmfPermissions(user, customerId, tenantId, vmfId),
    [user],
  )

  const hasVmfPermission = useCallback(
    (customerId, tenantId, vmfId, permission) =>
      _hasVmfPermission(user, customerId, tenantId, vmfId, permission),
    [user],
  )

  const hasVmfAccess = useCallback(
    (customerId, tenantId, vmfId) =>
      _hasVmfAccess(user, customerId, tenantId, vmfId),
    [user],
  )

  return {
    user,
    // Platform
    platformRoles,
    isSuperAdmin,
    hasPlatformRole,
    // Customer
    getCustomerRoles,
    hasCustomerRole,
    hasCustomerAccess,
    accessibleCustomerIds,
    // Tenant
    getTenantRoles,
    hasTenantRole,
    hasTenantAccess,
    getAccessibleTenants,
    // VMF
    getVmfPermissions,
    hasVmfPermission,
    hasVmfAccess,
  }
}

export default useAuthorization
