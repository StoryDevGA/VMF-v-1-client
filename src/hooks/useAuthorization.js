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
import { selectCurrentUser, selectCustomerScopes, selectResolvedPermissions } from '../store/slices/authSlice.js'
import {
  getUserPlatformRoles,
  hasPlatformRole as _hasPlatformRole,
  isSuperAdmin as _isSuperAdmin,
  getUserCustomerRoles,
  hasCustomerRole as _hasCustomerRole,
  hasCustomerAccess as _hasCustomerAccess,
  getCustomerScope as _getCustomerScope,
  getCustomerFeatureEntitlements as _getCustomerFeatureEntitlements,
  hasCustomerFeatureEntitlement as _hasCustomerFeatureEntitlement,
  getCustomerEntitlementSource as _getCustomerEntitlementSource,
  getUserTenantRoles,
  hasTenantRole as _hasTenantRole,
  hasTenantAccess as _hasTenantAccess,
  hasVmfWorkspaceAccess as _hasVmfWorkspaceAccess,
  hasVmfWorkspaceManagementAccess as _hasVmfWorkspaceManagementAccess,
  getUserVmfPermissions,
  hasVmfPermission as _hasVmfPermission,
  hasVmfAccess as _hasVmfAccess,
  getAccessibleCustomerIds,
  getAccessibleTenantIds,
  hasPlatformPermission as _hasPlatformPermission,
  hasCustomerPermission as _hasCustomerPermission,
  hasTenantPermission as _hasTenantPermission,
  hasAnyPermission as _hasAnyPermission,
} from '../utils/authorization.js'

export function useAuthorization() {
  const user = useSelector(selectCurrentUser)
  const customerScopes = useSelector(selectCustomerScopes)
  const resolvedPermissions = useSelector(selectResolvedPermissions)
  const resolvedCustomerScopes = useMemo(() => {
    if (Array.isArray(customerScopes) && customerScopes.length > 0) {
      return customerScopes
    }

    if (Array.isArray(user?.customerScopes)) {
      return user.customerScopes
    }

    return []
  }, [customerScopes, user])

  const authorizationUser = useMemo(
    () => (user ? { ...user, customerScopes: resolvedCustomerScopes } : user),
    [resolvedCustomerScopes, user],
  )

  /* ---- Platform ---- */

  const platformRoles = useMemo(
    () => getUserPlatformRoles(authorizationUser),
    [authorizationUser],
  )

  const isSuperAdmin = useMemo(() => _isSuperAdmin(authorizationUser), [authorizationUser])

  const hasPlatformRole = useCallback(
    (role) => _hasPlatformRole(authorizationUser, role),
    [authorizationUser],
  )

  /* ---- Customer ---- */

  const getCustomerRoles = useCallback(
    (customerId) => getUserCustomerRoles(authorizationUser, customerId),
    [authorizationUser],
  )

  const hasCustomerRole = useCallback(
    (customerId, role) => _hasCustomerRole(authorizationUser, customerId, role),
    [authorizationUser],
  )

  const hasCustomerAccess = useCallback(
    (customerId) => _hasCustomerAccess(authorizationUser, customerId),
    [authorizationUser],
  )

  const accessibleCustomerIds = useMemo(
    () => getAccessibleCustomerIds(authorizationUser),
    [authorizationUser],
  )

  const getCustomerScope = useCallback(
    (customerId) => _getCustomerScope(authorizationUser, customerId),
    [authorizationUser],
  )

  const getFeatureEntitlements = useCallback(
    (customerId) => _getCustomerFeatureEntitlements(authorizationUser, customerId),
    [authorizationUser],
  )

  const hasFeatureEntitlement = useCallback(
    (customerId, featureKey, options) =>
      _hasCustomerFeatureEntitlement(authorizationUser, customerId, featureKey, options),
    [authorizationUser],
  )

  const getEntitlementSource = useCallback(
    (customerId) => _getCustomerEntitlementSource(authorizationUser, customerId),
    [authorizationUser],
  )

  /* ---- Tenant ---- */

  const getTenantRoles = useCallback(
    (customerId, tenantId) => getUserTenantRoles(authorizationUser, customerId, tenantId),
    [authorizationUser],
  )

  const hasTenantRole = useCallback(
    (customerId, tenantId, role) =>
      _hasTenantRole(authorizationUser, customerId, tenantId, role),
    [authorizationUser],
  )

  const hasTenantAccess = useCallback(
    (customerId, tenantId, options) =>
      _hasTenantAccess(authorizationUser, customerId, tenantId, options),
    [authorizationUser],
  )

  const getAccessibleTenants = useCallback(
    (customerId) => getAccessibleTenantIds(authorizationUser, customerId),
    [authorizationUser],
  )

  /* ---- VMF ---- */

  const hasVmfWorkspaceAccess = useCallback(
    (customerId, tenantId, options) =>
      _hasVmfWorkspaceAccess(authorizationUser, customerId, tenantId, options),
    [authorizationUser],
  )

  const hasVmfWorkspaceManagementAccess = useCallback(
    (customerId, tenantId, options) =>
      _hasVmfWorkspaceManagementAccess(authorizationUser, customerId, tenantId, options),
    [authorizationUser],
  )

  const getVmfPermissions = useCallback(
    (customerId, tenantId, vmfId) =>
      getUserVmfPermissions(authorizationUser, customerId, tenantId, vmfId),
    [authorizationUser],
  )

  const hasVmfPermission = useCallback(
    (customerId, tenantId, vmfId, permission) =>
      _hasVmfPermission(authorizationUser, customerId, tenantId, vmfId, permission),
    [authorizationUser],
  )

  const hasVmfAccess = useCallback(
    (customerId, tenantId, vmfId) =>
      _hasVmfAccess(authorizationUser, customerId, tenantId, vmfId),
    [authorizationUser],
  )

  /* ---- Resolved-permission helpers (FE-02) ---- */

  const hasPlatformPermission = useCallback(
    (permission) => _hasPlatformPermission(resolvedPermissions, permission),
    [resolvedPermissions],
  )

  const hasCustomerPermission = useCallback(
    (customerId, permission) => _hasCustomerPermission(resolvedPermissions, customerId, permission),
    [resolvedPermissions],
  )

  const hasTenantPermission = useCallback(
    (customerId, tenantId, permission) =>
      _hasTenantPermission(resolvedPermissions, customerId, tenantId, permission),
    [resolvedPermissions],
  )

  const hasAnyPermission = useCallback(
    (permission) => _hasAnyPermission(resolvedPermissions, permission),
    [resolvedPermissions],
  )

  return {
    user,
    customerScopes: resolvedCustomerScopes,
    resolvedPermissions,
    // Platform
    platformRoles,
    isSuperAdmin,
    hasPlatformRole,
    // Customer
    getCustomerRoles,
    hasCustomerRole,
    hasCustomerAccess,
    accessibleCustomerIds,
    getCustomerScope,
    getFeatureEntitlements,
    hasFeatureEntitlement,
    getEntitlementSource,
    // Tenant
    getTenantRoles,
    hasTenantRole,
    hasTenantAccess,
    getAccessibleTenants,
    // VMF
    hasVmfWorkspaceAccess,
    hasVmfWorkspaceManagementAccess,
    getVmfPermissions,
    hasVmfPermission,
    hasVmfAccess,
    // Resolved permissions
    hasPlatformPermission,
    hasCustomerPermission,
    hasTenantPermission,
    hasAnyPermission,
  }
}

export default useAuthorization
