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
import { selectCurrentUser } from '../store/slices/authSlice.js'
import {
  selectSelectedCustomerId,
  selectSelectedTenantId,
  selectSelectedTenantName,
  setCustomer,
  setTenant,
  initializeFromUser,
  clearTenantContext,
} from '../store/slices/tenantContextSlice.js'
import { useListTenantsQuery } from '../store/api/tenantApi.js'
import { isSuperAdmin as checkIsSuperAdmin, getAccessibleCustomerIds } from '../utils/authorization.js'

export function useTenantContext() {
  const dispatch = useDispatch()
  const user = useSelector(selectCurrentUser)
  const customerId = useSelector(selectSelectedCustomerId)
  const tenantId = useSelector(selectSelectedTenantId)
  const tenantName = useSelector(selectSelectedTenantName)

  /* ---- Auto-initialize when user arrives ---- */
  useEffect(() => {
    if (user && !customerId) {
      dispatch(initializeFromUser(user))
    }
  }, [user, customerId, dispatch])

  /* ---- Fetch tenant list for the active customer ---- */
  const { data: tenantsData, isLoading: isLoadingTenants } = useListTenantsQuery(
    { customerId, page: 1, pageSize: 100 },
    { skip: !customerId },
  )

  const tenants = useMemo(() => tenantsData?.data ?? [], [tenantsData])

  /* ---- Derived state ---- */
  const isSuperAdminUser = useMemo(() => checkIsSuperAdmin(user), [user])
  const accessibleCustomerIds = useMemo(() => getAccessibleCustomerIds(user), [user])

  /* ---- Actions ---- */

  const setCustomerId = useCallback(
    (id) => dispatch(setCustomer({ customerId: id })),
    [dispatch],
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
    tenants,
    isLoadingTenants,
    isSuperAdmin: isSuperAdminUser,
    accessibleCustomerIds,
    setCustomerId,
    setTenantId,
    clearContext,
  }
}

export default useTenantContext
