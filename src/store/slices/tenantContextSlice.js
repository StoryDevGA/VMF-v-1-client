/**
 * Tenant Context Slice
 *
 * Manages the currently selected customer and tenant for scoped navigation.
 *
 * State shape:
 *   {
 *     customerId: string | null,   — active customer scope
 *     tenantId:   string | null,   — active tenant scope (null = all tenants)
 *     tenantName: string | null,   — display name for the active tenant
 *   }
 *
 * The slice auto-initializes from the user's first CUSTOMER_ADMIN membership
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

const tenantContextSlice = createSlice({
  name: 'tenantContext',
  initialState,
  reducers: {
    /**
     * Set the active customer scope.
     * Clears tenant selection when the customer changes.
     * @param {Object} action.payload — { customerId: string }
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
     * @param {Object} action.payload — { tenantId: string|null, tenantName?: string|null }
     */
    setTenant: (state, action) => {
      const { tenantId, tenantName = null } = action.payload
      state.tenantId = tenantId
      state.tenantName = tenantName
    },

    /**
     * Auto-initialize from the authenticated user's memberships.
     * Picks the first customerId with CUSTOMER_ADMIN role.
     * No-op if context is already set.
     * @param {Object} action.payload — AuthUser (from authSlice)
     */
    initializeFromUser: (state, action) => {
      // Skip if already initialized
      if (state.customerId) return

      const user = action.payload
      if (!user?.memberships) return

      const adminMembership = user.memberships.find(
        (m) => m.customerId && m.roles?.includes('CUSTOMER_ADMIN'),
      )
      if (adminMembership) {
        state.customerId = adminMembership.customerId
      }
    },

    /**
     * Clear all context (e.g. on logout).
     */
    clearTenantContext: () => initialState,
  },
})

export const { setCustomer, setTenant, initializeFromUser, clearTenantContext } =
  tenantContextSlice.actions

/* ---- Selectors ---- */

export const selectTenantContext     = (state) => state.tenantContext ?? initialState
export const selectSelectedCustomerId = (state) => state.tenantContext?.customerId ?? null
export const selectSelectedTenantId   = (state) => state.tenantContext?.tenantId ?? null
export const selectSelectedTenantName = (state) => state.tenantContext?.tenantName ?? null

export default tenantContextSlice.reducer
