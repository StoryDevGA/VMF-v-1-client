/**
 * Tenant Context Slice
 *
 * Manages the currently selected customer and tenant for scoped navigation.
 *
 * State shape:
 *   {
 *     customerId: string | null, // active customer scope
 *     tenantId:   string | null, // active tenant scope (null = all tenants)
 *     tenantName: string | null, // display name for the active tenant
 *   }
 *
 * The slice auto-initializes from the user's first manageable customer scope
 * when `initializeFromUser` is dispatched. Super Admins may switch customers.
 *
 * @module store/slices/tenantContextSlice
 */

import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  customerId: null,
  tenantId: null,
  tenantName: null,
}

const getMembershipCustomerId = (membership) => {
  const customerId =
    membership?.customerId
    ?? membership?.customer?.id
    ?? membership?.customer?._id

  return customerId === null || customerId === undefined ? null : customerId
}

const getTenantMembershipCustomerId = (tenantMembership) => {
  const customerId = tenantMembership?.customerId
  return customerId === null || customerId === undefined ? null : customerId
}

const getFirstManageableCustomerId = (user) => {
  if (!user) return null

  const customerAdminMembership = Array.isArray(user.memberships)
    ? user.memberships.find(
      (membership) =>
        getMembershipCustomerId(membership)
        && membership.roles?.includes('CUSTOMER_ADMIN'),
    )
    : null

  if (customerAdminMembership) {
    return getMembershipCustomerId(customerAdminMembership)
  }

  const customerScopedTenantAdminMembership = Array.isArray(user.memberships)
    ? user.memberships.find(
      (membership) =>
        getMembershipCustomerId(membership)
        && membership.roles?.includes('TENANT_ADMIN'),
    )
    : null

  if (customerScopedTenantAdminMembership) {
    return getMembershipCustomerId(customerScopedTenantAdminMembership)
  }

  const tenantAdminMembership = Array.isArray(user.tenantMemberships)
    ? user.tenantMemberships.find(
      (tenantMembership) =>
        getTenantMembershipCustomerId(tenantMembership)
        && tenantMembership.roles?.includes('TENANT_ADMIN'),
    )
    : null

  return getTenantMembershipCustomerId(tenantAdminMembership)
}

const hasCustomerAccessForUser = (user, customerId) => {
  if (!customerId) return false

  const normalizedCustomerId = customerId.toString()

  const hasMembershipAccess = Array.isArray(user?.memberships) && user.memberships.some(
    (membership) =>
      getMembershipCustomerId(membership)
      && getMembershipCustomerId(membership).toString() === normalizedCustomerId,
  )

  if (hasMembershipAccess) return true

  return Array.isArray(user?.tenantMemberships) && user.tenantMemberships.some(
    (tenantMembership) =>
      getTenantMembershipCustomerId(tenantMembership)
      && getTenantMembershipCustomerId(tenantMembership).toString() === normalizedCustomerId,
  )
}

const tenantContextSlice = createSlice({
  name: 'tenantContext',
  initialState,
  reducers: {
    /**
     * Set the active customer scope.
     * Clears tenant selection when the customer changes.
     * @param {Object} action.payload - { customerId: string }
     */
    setCustomer: (state, action) => {
      const { customerId } = action.payload
      if (state.customerId !== customerId) {
        state.customerId = customerId
        state.tenantId = null
        state.tenantName = null
      }
    },

    /**
     * Set the active tenant scope within the current customer.
     * @param {Object} action.payload - { tenantId: string|null, tenantName?: string|null }
     */
    setTenant: (state, action) => {
      const { tenantId, tenantName = null } = action.payload
      state.tenantId = tenantId
      state.tenantName = tenantName
    },

    /**
     * Auto-initialize from the authenticated user's manageable customer scopes.
     * Picks the first CUSTOMER_ADMIN customer, otherwise the first customer
     * where the user is TENANT_ADMIN.
     * No-op if context is already set.
     * @param {Object} action.payload - AuthUser (from authSlice)
     */
    initializeFromUser: (state, action) => {
      if (state.customerId) return

      const user = action.payload
      const initialCustomerId = getFirstManageableCustomerId(user)
      if (initialCustomerId) {
        state.customerId = initialCustomerId
      }
    },

    /**
     * Clear all context (e.g. on logout).
     */
    clearTenantContext: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase('auth/clearCredentials', () => initialState)

    builder.addCase('auth/setCredentials', (state, action) => {
      const nextUser = action.payload?.user

      if (!nextUser?.memberships && !nextUser?.tenantMemberships) {
        return initialState
      }

      if (state.customerId && hasCustomerAccessForUser(nextUser, state.customerId)) {
        return state
      }

      state.customerId = getFirstManageableCustomerId(nextUser)
      state.tenantId = null
      state.tenantName = null

      return state
    })
  },
})

export const { setCustomer, setTenant, initializeFromUser, clearTenantContext } =
  tenantContextSlice.actions

/* ---- Selectors ---- */

export const selectTenantContext = (state) => state.tenantContext ?? initialState
export const selectSelectedCustomerId = (state) => state.tenantContext?.customerId ?? null
export const selectSelectedTenantId = (state) => state.tenantContext?.tenantId ?? null
export const selectSelectedTenantName = (state) => state.tenantContext?.tenantName ?? null

export default tenantContextSlice.reducer
