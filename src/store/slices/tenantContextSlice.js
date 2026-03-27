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
  ownerUserId: null,
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

  const normalizedCustomerId = customerId.toString()
  return customerScopes.find((scope) => {
    const scopeCustomerId = scope?.customerId
    if (scopeCustomerId === null || scopeCustomerId === undefined) return false
    return scopeCustomerId.toString() === normalizedCustomerId
  }) ?? null
}

const getSingleTenantDefaultTenantContext = (customerScopes, customerId) => {
  const scope = getCustomerScopeForCustomerId(customerScopes, customerId)
  if (!scope) return null
  if (normalizeCustomerScopeTopology(scope.topology) !== 'SINGLE_TENANT') return null

  const defaultTenantId = scope?.defaultTenantId
  if (defaultTenantId === null || defaultTenantId === undefined) return null

  const normalizedTenantId = defaultTenantId.toString().trim()
  if (!normalizedTenantId) return null

  return {
    tenantId: normalizedTenantId,
    tenantName: null,
  }
}

const extractUserContextPayload = (payload) => {
  if (payload && typeof payload === 'object' && ('user' in payload || 'customerScopes' in payload)) {
    return {
      user: payload.user ?? null,
      customerScopes: Array.isArray(payload.customerScopes) ? payload.customerScopes : [],
    }
  }

  return {
    user: payload,
    customerScopes: [],
  }
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

const hasPlatformRoleForUser = (user, role) =>
  Array.isArray(user?.memberships) && user.memberships.some(
    (membership) =>
      getMembershipCustomerId(membership) === null
      && membership.roles?.includes(role),
  )

const isSuperAdminUser = (user) => hasPlatformRoleForUser(user, 'SUPER_ADMIN')

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

  if (tenantAdminMembership) {
    return getTenantMembershipCustomerId(tenantAdminMembership)
  }

  // Priority 4: Any membership with a non-null customerId (any role)
  const anyMembership = Array.isArray(user.memberships)
    ? user.memberships.find(
      (membership) => getMembershipCustomerId(membership),
    )
    : null

  if (anyMembership) {
    return getMembershipCustomerId(anyMembership)
  }

  // Priority 5: Any tenantMembership with a non-null customerId (any role)
  const anyTenantMembership = Array.isArray(user.tenantMemberships)
    ? user.tenantMemberships.find(
      (tenantMembership) => getTenantMembershipCustomerId(tenantMembership),
    )
    : null

  return getTenantMembershipCustomerId(anyTenantMembership)
}

const hasCustomerAccessForUser = (user, customerId) => {
  if (!customerId) return false
  if (isSuperAdminUser(user)) return true

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

const hasCustomerRoleForUser = (user, customerId, role) => {
  if (!customerId || !role || !Array.isArray(user?.memberships)) return false

  const normalizedCustomerId = customerId.toString()

  return user.memberships.some(
    (membership) =>
      getMembershipCustomerId(membership)
      && getMembershipCustomerId(membership).toString() === normalizedCustomerId
      && membership.roles?.includes(role),
  )
}

const hasTenantAccessForUser = (user, customerId, tenantId) => {
  if (!customerId || !tenantId) return false
  if (isSuperAdminUser(user)) return true
  if (hasCustomerRoleForUser(user, customerId, 'CUSTOMER_ADMIN')) return true
  if (hasCustomerRoleForUser(user, customerId, 'TENANT_ADMIN')) return true

  const normalizedCustomerId = customerId.toString()
  const normalizedTenantId = tenantId.toString()

  return Array.isArray(user?.tenantMemberships) && user.tenantMemberships.some(
    (tenantMembership) =>
      getTenantMembershipCustomerId(tenantMembership)
      && getTenantMembershipCustomerId(tenantMembership).toString() === normalizedCustomerId
      && tenantMembership?.tenantId?.toString() === normalizedTenantId,
  )
}

const applyUserContextState = (state, nextUser, customerScopes = []) => {
  const nextUserId = nextUser?.id ?? null
  const hasBoundOwner = state.ownerUserId !== null && state.ownerUserId !== undefined
  const shouldResetTenantForOwnerChange =
    !hasBoundOwner
    || (
      nextUserId !== null
      && String(state.ownerUserId) !== String(nextUserId)
    )

  if (!nextUser?.memberships && !nextUser?.tenantMemberships) {
    return initialState
  }

  if (state.customerId && hasCustomerAccessForUser(nextUser, state.customerId)) {
    state.ownerUserId = nextUserId
    const defaultTenantContext = getSingleTenantDefaultTenantContext(
      customerScopes,
      state.customerId,
    )

    if (shouldResetTenantForOwnerChange) {
      state.tenantId = defaultTenantContext?.tenantId ?? null
      state.tenantName = defaultTenantContext?.tenantName ?? null
      return state
    }

    if (defaultTenantContext) {
      state.tenantId = defaultTenantContext.tenantId
      state.tenantName = defaultTenantContext.tenantName
      return state
    }

    if (state.tenantId && !hasTenantAccessForUser(nextUser, state.customerId, state.tenantId)) {
      state.tenantId = null
      state.tenantName = null
    }
    return state
  }

  state.customerId = getFirstManageableCustomerId(nextUser)
  const defaultTenantContext = getSingleTenantDefaultTenantContext(
    customerScopes,
    state.customerId,
  )
  state.tenantId = defaultTenantContext?.tenantId ?? null
  state.tenantName = defaultTenantContext?.tenantName ?? null
  state.ownerUserId = nextUserId

  return state
}

const tenantContextSlice = createSlice({
  name: 'tenantContext',
  initialState,
  reducers: {
    /**
     * Set the active customer scope.
     * Clears tenant selection when the customer changes.
     * @param {Object} action.payload - { customerId: string, tenantId?: string|null, tenantName?: string|null }
     */
    setCustomer: (state, action) => {
      const { customerId, tenantId = null, tenantName = null } = action.payload
      if (state.customerId !== customerId) {
        state.customerId = customerId
        state.tenantId = tenantId
        state.tenantName = tenantName
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
     * Priority: (1) CUSTOMER_ADMIN membership, (2) TENANT_ADMIN membership,
     * (3) TENANT_ADMIN tenantMembership, (4) any membership with customerId,
     * (5) any tenantMembership with customerId.
     * No-op if context is already set.
     * @param {Object|AuthUser} action.payload - Auth user or { user, customerScopes }
     */
    initializeFromUser: (state, action) => {
      if (state.customerId) return

      const { user, customerScopes } = extractUserContextPayload(action.payload)
      state.ownerUserId = user?.id ?? null
      const initialCustomerId = getFirstManageableCustomerId(user)
      if (initialCustomerId) {
        state.customerId = initialCustomerId
        const defaultTenantContext = getSingleTenantDefaultTenantContext(
          customerScopes,
          initialCustomerId,
        )
        state.tenantId = defaultTenantContext?.tenantId ?? null
        state.tenantName = defaultTenantContext?.tenantName ?? null
      }
    },

    reconcileUserContext: (state, action) => {
      const { user, customerScopes } = extractUserContextPayload(action.payload)
      return applyUserContextState(state, user, customerScopes)
    },

    /**
     * Clear all context (e.g. on logout).
     */
    clearTenantContext: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase('auth/clearCredentials', () => initialState)

    builder.addCase('auth/setCredentials', (state, action) =>
      applyUserContextState(
        state,
        action.payload?.user,
        Array.isArray(action.payload?.customerScopes) ? action.payload.customerScopes : [],
      ))
  },
})

export const { setCustomer, setTenant, initializeFromUser, reconcileUserContext, clearTenantContext } =
  tenantContextSlice.actions

/* ---- Selectors ---- */

export const selectTenantContext = (state) => state.tenantContext ?? initialState
export const selectSelectedCustomerId = (state) => state.tenantContext?.customerId ?? null
export const selectSelectedTenantId = (state) => state.tenantContext?.tenantId ?? null
export const selectSelectedTenantName = (state) => state.tenantContext?.tenantName ?? null

export default tenantContextSlice.reducer
