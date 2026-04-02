/**
 * useTenantContext Hook
 *
 * Facade for the tenantContext Redux slice that provides:
 *   - Auto-initialization from the current user's memberships
 *   - Active customer / tenant IDs
 *   - Setters for customer and tenant switching
 *   - Available tenant list from the API (auto-fetched when customerId is set)
 *
 * Usage:
 *   const { customerId, tenantId, tenants, setTenantId } = useTenantContext()
 *
 * @module hooks/useTenantContext
 */

import { useEffect, useCallback, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { selectCurrentUser, selectCustomerScopes, selectResolvedPermissions } from '../store/slices/authSlice.js'
import {
  selectSelectedCustomerId,
  selectSelectedTenantId,
  selectSelectedTenantName,
  setCustomer,
  setTenant,
  initializeFromUser,
  reconcileUserContext,
  clearTenantContext,
} from '../store/slices/tenantContextSlice.js'
import { useListTenantsQuery } from '../store/api/tenantApi.js'
import {
  isSuperAdmin as checkIsSuperAdmin,
  getAccessibleCustomerIds,
  getCustomerTopology,
  hasCustomerPermission,
} from '../utils/authorization.js'

const normalizeTenantVisibilityMeta = (meta) => {
  if (!meta || typeof meta !== 'object') return null

  return {
    mode: String(meta.mode ?? '')
      .trim()
      .toUpperCase(),
    allowed: Boolean(meta.allowed),
    topology: String(meta.topology ?? '')
      .trim()
      .toUpperCase(),
    isServiceProvider: Boolean(meta.isServiceProvider),
    selectableStatuses: Array.isArray(meta.selectableStatuses)
      ? meta.selectableStatuses
        .map((status) => String(status ?? '').trim().toUpperCase())
        .filter(Boolean)
      : [],
  }
}

const getTenantRowId = (tenant) => {
  const tenantId = tenant?._id ?? tenant?.id
  return tenantId === null || tenantId === undefined ? null : String(tenantId)
}

const normalizeCustomerScopeTopology = (value) => {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()

  return normalized === 'SINGLE_TENANT' || normalized === 'MULTI_TENANT'
    ? normalized
    : ''
}

const getCustomerScopeForCustomerId = (customerScopes, customerId) => {
  if (!Array.isArray(customerScopes) || !customerId) return null

  const normalizedCustomerId = String(customerId)
  return customerScopes.find((scope) => {
    const scopeCustomerId = scope?.customerId
    if (scopeCustomerId === null || scopeCustomerId === undefined) return false
    return String(scopeCustomerId) === normalizedCustomerId
  }) ?? null
}

const getSingleTenantDefaultContext = (customerScopes, customerId) => {
  const scope = getCustomerScopeForCustomerId(customerScopes, customerId)
  if (!scope) return null
  if (normalizeCustomerScopeTopology(scope.topology) !== 'SINGLE_TENANT') return null

  const defaultTenantId = scope?.defaultTenantId
  if (defaultTenantId === null || defaultTenantId === undefined) return null

  const normalizedTenantId = String(defaultTenantId).trim()
  if (!normalizedTenantId) return null

  return {
    tenantId: normalizedTenantId,
    tenantName: null,
  }
}

export function useTenantContext() {
  const dispatch = useDispatch()
  const user = useSelector(selectCurrentUser)
  const customerScopes = useSelector(selectCustomerScopes)
  const resolvedPermissions = useSelector(selectResolvedPermissions)
  const customerId = useSelector(selectSelectedCustomerId)
  const tenantId = useSelector(selectSelectedTenantId)
  const tenantName = useSelector(selectSelectedTenantName)
  const authCustomerScope = useMemo(
    () => getCustomerScopeForCustomerId(customerScopes, customerId),
    [customerId, customerScopes],
  )
  const authCustomerTopology = useMemo(() => {
    const scopeTopology = normalizeCustomerScopeTopology(authCustomerScope?.topology)
    if (scopeTopology) return scopeTopology
    return getCustomerTopology(user, customerId)
  }, [authCustomerScope?.topology, customerId, user])
  const defaultTenantContext = useMemo(
    () => getSingleTenantDefaultContext(customerScopes, customerId),
    [customerId, customerScopes],
  )
  const isSuperAdminUser = useMemo(() => checkIsSuperAdmin(user), [user])
  const canViewTenants = useMemo(() => {
    if (!customerId) return false
    if (isSuperAdminUser) return true
    if (hasCustomerPermission(resolvedPermissions, customerId, 'TENANT_VIEW')) return true

    const normalizedCustomerId = String(customerId)
    return Array.isArray(resolvedPermissions?.tenants) && resolvedPermissions.tenants.some(
      (tenantScope) =>
        String(tenantScope?.customerId ?? '') === normalizedCustomerId
        && Array.isArray(tenantScope?.permissions)
        && tenantScope.permissions.includes('TENANT_VIEW'),
    )
  }, [customerId, isSuperAdminUser, resolvedPermissions])

  /* ---- Auto-initialize when user arrives ---- */
  useEffect(() => {
    if (user && !customerId) {
      dispatch(initializeFromUser({ user, customerScopes }))
    }
  }, [user, customerId, customerScopes, dispatch])

  useEffect(() => {
    if (user) {
      dispatch(reconcileUserContext({ user, customerScopes }))
    }
  }, [customerScopes, dispatch, user])

  /* ---- Fetch tenant list for the active customer ---- */
  const {
    data: tenantsData,
    isLoading: isLoadingTenants,
    error: tenantsError,
  } = useListTenantsQuery(
    { customerId, page: 1, pageSize: 100 },
    { skip: !customerId || !canViewTenants },
  )

  const tenants = useMemo(() => tenantsData?.data ?? [], [tenantsData])
  const tenantVisibilityMeta = useMemo(
    () => normalizeTenantVisibilityMeta(tenantsData?.meta?.tenantVisibility),
    [tenantsData],
  )
  const customerName = tenantsData?.meta?.customerName || null
  const selectedCustomerTopology = tenantVisibilityMeta?.topology ?? authCustomerTopology
  const supportsTenantManagement = selectedCustomerTopology === 'MULTI_TENANT'
  const selectableTenants = useMemo(
    () => (canViewTenants ? tenants.filter((tenant) => tenant?.isSelectable === true) : []),
    [canViewTenants, tenants],
  )

  /* ---- Derived state ---- */
  const accessibleCustomerIds = useMemo(() => getAccessibleCustomerIds(user), [user])
  const hasSelectedCustomerAccess = useMemo(() => {
    if (!customerId) return false
    if (isSuperAdminUser) return true
    return accessibleCustomerIds.includes(String(customerId))
  }, [accessibleCustomerIds, customerId, isSuperAdminUser])
  const selectedTenant = useMemo(() => {
    if (!tenantId) return null

    return tenants.find((tenant) => {
      const tenantRowId = String(tenant?._id ?? tenant?.id ?? '')
      return tenantRowId === String(tenantId)
    }) ?? null
  }, [tenantId, tenants])
  const resolvedTenantName = tenantId ? (selectedTenant?.name ?? tenantName) : null
  const isResolvingSelectedTenantContext = Boolean(customerId && tenantId && isLoadingTenants)
  const hasInvalidTenantContext = Boolean(
    customerId
      && tenantId
      && !isLoadingTenants
      && !tenantsError
      && !selectedTenant,
  )

  useEffect(() => {
    if (!customerId || !defaultTenantContext?.tenantId) return
    if (tenantId === defaultTenantContext.tenantId && !hasInvalidTenantContext) return

    dispatch(setTenant({
      tenantId: defaultTenantContext.tenantId,
      tenantName: defaultTenantContext.tenantName,
    }))
  }, [
    customerId,
    defaultTenantContext,
    dispatch,
    hasInvalidTenantContext,
    tenantId,
  ])

  useEffect(() => {
    if (!customerId || isLoadingTenants || tenantsError) return
    if (!Array.isArray(selectableTenants) || selectableTenants.length !== 1) return
    if (tenantId && !hasInvalidTenantContext) return

    const onlyTenant = selectableTenants[0]
    const onlyTenantId = getTenantRowId(onlyTenant)
    if (!onlyTenantId) return

    dispatch(setTenant({
      tenantId: onlyTenantId,
      tenantName: onlyTenant?.name ?? null,
    }))
  }, [
    customerId,
    dispatch,
    hasInvalidTenantContext,
    isLoadingTenants,
    selectableTenants,
    tenantId,
    tenantsError,
  ])

  /* ---- Actions ---- */

  const setCustomerId = useCallback(
    (id) => {
      const nextDefaultTenantContext = getSingleTenantDefaultContext(customerScopes, id)
      dispatch(setCustomer({
        customerId: id,
        tenantId: nextDefaultTenantContext?.tenantId ?? null,
        tenantName: nextDefaultTenantContext?.tenantName ?? null,
      }))
    },
    [customerScopes, dispatch],
  )

  const setTenantId = useCallback(
    (id, name = null) => dispatch(setTenant({ tenantId: id, tenantName: name })),
    [dispatch],
  )

  const clearContext = useCallback(
    () => dispatch(clearTenantContext()),
    [dispatch],
  )

  return {
    customerId,
    tenantId,
    tenantName,
    customerName,
    resolvedTenantName,
    tenants,
    selectableTenants,
    canViewTenants,
    tenantVisibilityMeta,
    selectedCustomerTopology,
    supportsTenantManagement,
    isLoadingTenants,
    tenantsError,
    isSuperAdmin: isSuperAdminUser,
    accessibleCustomerIds,
    hasSelectedCustomerAccess,
    selectedTenant,
    isResolvingSelectedTenantContext,
    hasInvalidTenantContext,
    setCustomerId,
    setTenantId,
    clearContext,
  }
}

export default useTenantContext
