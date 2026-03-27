/**
 * tenantContextSlice reducer + selector tests
 */

import { describe, it, expect } from 'vitest'
import tenantContextReducer, {
  setCustomer,
  setTenant,
  initializeFromUser,
  clearTenantContext,
  selectTenantContext,
  selectSelectedCustomerId,
  selectSelectedTenantId,
  selectSelectedTenantName,
} from './tenantContextSlice.js'
import { clearCredentials, setCredentials } from './authSlice.js'

const initialState = { customerId: null, tenantId: null, tenantName: null, ownerUserId: null }

describe('tenantContextSlice', () => {
  it('returns the initial state', () => {
    const state = tenantContextReducer(undefined, { type: '@@INIT' })
    expect(state).toEqual(initialState)
  })

  it('setCustomer sets customerId', () => {
    const state = tenantContextReducer(initialState, setCustomer({ customerId: 'cust-1' }))
    expect(state.customerId).toBe('cust-1')
  })

  it('setCustomer clears tenant when customer changes', () => {
    const prev = { customerId: 'cust-1', tenantId: 'ten-1', tenantName: 'Tenant One' }
    const state = tenantContextReducer(prev, setCustomer({ customerId: 'cust-2' }))
    expect(state.customerId).toBe('cust-2')
    expect(state.tenantId).toBeNull()
    expect(state.tenantName).toBeNull()
  })

  it('setCustomer accepts an immediate default tenant context when provided', () => {
    const prev = { customerId: 'cust-1', tenantId: 'ten-1', tenantName: 'Tenant One' }
    const state = tenantContextReducer(
      prev,
      setCustomer({ customerId: 'cust-2', tenantId: 'ten-2', tenantName: null }),
    )

    expect(state.customerId).toBe('cust-2')
    expect(state.tenantId).toBe('ten-2')
    expect(state.tenantName).toBeNull()
  })

  it('setCustomer is a no-op when customerId stays the same', () => {
    const prev = { customerId: 'cust-1', tenantId: 'ten-1', tenantName: 'Tenant One' }
    const state = tenantContextReducer(prev, setCustomer({ customerId: 'cust-1' }))
    expect(state).toEqual(prev)
  })

  it('setTenant sets both tenantId and tenantName', () => {
    const prev = { customerId: 'cust-1', tenantId: null, tenantName: null }
    const state = tenantContextReducer(prev, setTenant({ tenantId: 'ten-1', tenantName: 'Tenant One' }))
    expect(state.tenantId).toBe('ten-1')
    expect(state.tenantName).toBe('Tenant One')
  })

  it('setTenant allows null tenantId', () => {
    const prev = { customerId: 'cust-1', tenantId: 'ten-1', tenantName: 'Tenant One' }
    const state = tenantContextReducer(prev, setTenant({ tenantId: null, tenantName: null }))
    expect(state.tenantId).toBeNull()
    expect(state.tenantName).toBeNull()
  })

  it('initializeFromUser sets customerId from first CUSTOMER_ADMIN membership', () => {
    const user = {
      id: 'user-1',
      memberships: [
        { customerId: 'cust-9', roles: ['USER'] },
        { customerId: 'cust-5', roles: ['CUSTOMER_ADMIN'] },
        { customerId: 'cust-7', roles: ['CUSTOMER_ADMIN'] },
      ],
    }
    const state = tenantContextReducer(initialState, initializeFromUser(user))
    expect(state.customerId).toBe('cust-5')
    expect(state.ownerUserId).toBe('user-1')
  })

  it('initializeFromUser supports nested customer ids on customer-admin memberships', () => {
    const user = {
      memberships: [
        {
          customer: { id: 'cust-nested' },
          roles: ['CUSTOMER_ADMIN'],
        },
      ],
    }

    const state = tenantContextReducer(initialState, initializeFromUser(user))

    expect(state.customerId).toBe('cust-nested')
  })

  it('initializeFromUser falls back to first TENANT_ADMIN customer', () => {
    const user = {
      memberships: [{ customerId: 'cust-9', roles: ['USER'] }],
      tenantMemberships: [
        { customerId: 'cust-tenant-2', tenantId: 'ten-2', roles: ['TENANT_ADMIN'] },
        { customerId: 'cust-tenant-3', tenantId: 'ten-3', roles: ['TENANT_ADMIN'] },
      ],
    }

    const state = tenantContextReducer(initialState, initializeFromUser(user))

    expect(state.customerId).toBe('cust-tenant-2')
  })

  it('initializeFromUser falls back to customer membership carrying TENANT_ADMIN', () => {
    const user = {
      memberships: [
        { customerId: 'cust-9', roles: ['USER'] },
        { customerId: 'cust-tenant-6', roles: ['TENANT_ADMIN', 'USER'] },
      ],
      tenantMemberships: [{ customerId: 'cust-tenant-6', tenantId: 'ten-11', roles: ['USER'] }],
    }

    const state = tenantContextReducer(initialState, initializeFromUser(user))

    expect(state.customerId).toBe('cust-tenant-6')
  })

  it('initializeFromUser is a no-op if customerId is already set', () => {
    const prev = { customerId: 'cust-1', tenantId: null, tenantName: null }
    const user = {
      memberships: [{ customerId: 'cust-99', roles: ['CUSTOMER_ADMIN'] }],
    }
    const state = tenantContextReducer(prev, initializeFromUser(user))
    expect(state.customerId).toBe('cust-1')
  })

  it('initializeFromUser resolves customerId for USER with memberships via Priority 4', () => {
    const user = {
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
      tenantMemberships: [{ customerId: 'cust-1', tenantId: 'ten-1', roles: ['USER'] }],
    }
    const state = tenantContextReducer(initialState, initializeFromUser(user))
    expect(state.customerId).toBe('cust-1')
  })

  it('initializeFromUser admin priorities take precedence over USER fallback', () => {
    const user = {
      memberships: [
        { customerId: 'cust-user', roles: ['USER'] },
        { customerId: 'cust-admin', roles: ['CUSTOMER_ADMIN'] },
      ],
      tenantMemberships: [{ customerId: 'cust-user', tenantId: 'ten-1', roles: ['USER'] }],
    }
    const state = tenantContextReducer(initialState, initializeFromUser(user))
    expect(state.customerId).toBe('cust-admin')
  })

  it('initializeFromUser resolves customerId for USER with only tenantMemberships via Priority 5', () => {
    const user = {
      memberships: [],
      tenantMemberships: [{ customerId: 'cust-tm', tenantId: 'ten-1', roles: ['USER'] }],
    }
    const state = tenantContextReducer(initialState, initializeFromUser(user))
    expect(state.customerId).toBe('cust-tm')
  })

  it('initializeFromUser is a no-op when user has no memberships at all', () => {
    const user = {
      memberships: [],
      tenantMemberships: [],
    }
    const state = tenantContextReducer(initialState, initializeFromUser(user))
    expect(state).toEqual(initialState)
  })

  it('clearTenantContext resets to initial state', () => {
    const prev = { customerId: 'cust-1', tenantId: 'ten-1', tenantName: 'Tenant One' }
    const state = tenantContextReducer(prev, clearTenantContext())
    expect(state).toEqual(initialState)
  })

  it('selectors return correct values', () => {
    const rootState = {
      tenantContext: { customerId: 'cust-1', tenantId: 'ten-2', tenantName: 'Acme' },
    }

    expect(selectTenantContext(rootState)).toEqual(rootState.tenantContext)
    expect(selectSelectedCustomerId(rootState)).toBe('cust-1')
    expect(selectSelectedTenantId(rootState)).toBe('ten-2')
    expect(selectSelectedTenantName(rootState)).toBe('Acme')
  })

  it('auth clearCredentials resets to initial state', () => {
    const prev = {
      customerId: 'cust-1',
      tenantId: 'ten-1',
      tenantName: 'Tenant One',
      ownerUserId: 'user-1',
    }
    const state = tenantContextReducer(prev, clearCredentials())
    expect(state).toEqual(initialState)
  })

  it('auth setCredentials reinitializes stale customer context for customer-admin session', () => {
    const prev = {
      customerId: 'stale-customer',
      tenantId: 'ten-1',
      tenantName: 'Tenant One',
      ownerUserId: 'stale-user',
    }
    const nextUser = {
      id: 'user-2',
      memberships: [
        { customerId: 'cust-9', roles: ['USER'] },
        { customerId: 'cust-5', roles: ['CUSTOMER_ADMIN'] },
        { customerId: 'cust-7', roles: ['CUSTOMER_ADMIN'] },
      ],
    }

    const state = tenantContextReducer(prev, setCredentials({ user: nextUser }))

    expect(state).toEqual({
      customerId: 'cust-5',
      tenantId: null,
      tenantName: null,
      ownerUserId: 'user-2',
    })
  })

  it('auth setCredentials reinitializes stale customer context for tenant-admin session', () => {
    const prev = {
      customerId: 'stale-customer',
      tenantId: 'ten-1',
      tenantName: 'Tenant One',
      ownerUserId: 'stale-user',
    }
    const nextUser = {
      id: 'user-4',
      memberships: [{ customerId: 'cust-9', roles: ['USER'] }],
      tenantMemberships: [
        { customerId: 'cust-tenant-5', tenantId: 'ten-11', roles: ['TENANT_ADMIN'] },
      ],
    }

    const state = tenantContextReducer(prev, setCredentials({ user: nextUser }))

    expect(state).toEqual({
      customerId: 'cust-tenant-5',
      tenantId: null,
      tenantName: null,
      ownerUserId: 'user-4',
    })
  })

  it('auth setCredentials reinitializes stale customer context for customer-scoped tenant-admin session', () => {
    const prev = {
      customerId: 'stale-customer',
      tenantId: 'ten-1',
      tenantName: 'Tenant One',
      ownerUserId: 'stale-user',
    }
    const nextUser = {
      id: 'user-6',
      memberships: [
        { customerId: 'cust-9', roles: ['USER'] },
        { customerId: 'cust-tenant-6', roles: ['TENANT_ADMIN', 'USER'] },
      ],
      tenantMemberships: [{ customerId: 'cust-tenant-6', tenantId: 'ten-11', roles: ['USER'] }],
    }

    const state = tenantContextReducer(prev, setCredentials({ user: nextUser }))

    expect(state).toEqual({
      customerId: 'cust-tenant-6',
      tenantId: null,
      tenantName: null,
      ownerUserId: 'user-6',
    })
  })

  it('auth setCredentials preserves customer context when user still has access via memberships', () => {
    const prev = {
      customerId: 'cust-5',
      tenantId: 'ten-1',
      tenantName: 'Tenant One',
      ownerUserId: 'user-3',
    }
    const nextUser = {
      id: 'user-3',
      memberships: [
        { customerId: 'cust-5', roles: ['CUSTOMER_ADMIN'] },
        { customerId: 'cust-7', roles: ['CUSTOMER_ADMIN'] },
      ],
    }

    const state = tenantContextReducer(prev, setCredentials({ user: nextUser }))

    expect(state).toEqual(prev)
  })

  it('auth setCredentials clears stale tenant when the next user only keeps customer-level access', () => {
    const prev = {
      customerId: 'cust-5',
      tenantId: 'ten-1',
      tenantName: 'Tenant One',
      ownerUserId: 'user-3',
    }
    const nextUser = {
      id: 'user-7',
      memberships: [{ customerId: 'cust-5', roles: ['USER'] }],
      tenantMemberships: [],
    }

    const state = tenantContextReducer(prev, setCredentials({ user: nextUser }))

    expect(state).toEqual({
      customerId: 'cust-5',
      tenantId: null,
      tenantName: null,
      ownerUserId: 'user-7',
    })
  })

  it('auth setCredentials clears stale tenant when tenant access moved to a different tenant', () => {
    const prev = {
      customerId: 'cust-tenant-5',
      tenantId: 'ten-1',
      tenantName: 'Tenant One',
      ownerUserId: 'user-5',
    }
    const nextUser = {
      id: 'user-5',
      memberships: [{ customerId: 'cust-tenant-5', roles: ['USER'] }],
      tenantMemberships: [
        { customerId: 'cust-tenant-5', tenantId: 'ten-12', roles: ['TENANT_ADMIN'] },
      ],
    }

    const state = tenantContextReducer(prev, setCredentials({ user: nextUser }))

    expect(state).toEqual({
      customerId: 'cust-tenant-5',
      tenantId: null,
      tenantName: null,
      ownerUserId: 'user-5',
    })
  })

  it('auth setCredentials preserves tenant context when the next user still has access to that tenant', () => {
    const prev = {
      customerId: 'cust-tenant-5',
      tenantId: 'ten-1',
      tenantName: 'Tenant One',
      ownerUserId: 'user-8',
    }
    const nextUser = {
      id: 'user-8',
      memberships: [{ customerId: 'cust-tenant-5', roles: ['USER'] }],
      tenantMemberships: [
        { customerId: 'cust-tenant-5', tenantId: 'ten-1', roles: ['USER'] },
      ],
    }

    const state = tenantContextReducer(prev, setCredentials({ user: nextUser }))

    expect(state).toEqual(prev)
  })

  it('auth setCredentials seeds default tenant context for a single-tenant customer scope', () => {
    const prev = initialState
    const nextUser = {
      id: 'user-10',
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
      tenantMemberships: [],
    }

    const state = tenantContextReducer(
      prev,
      setCredentials({
        user: nextUser,
        customerScopes: [
          {
            customerId: 'cust-1',
            featureEntitlements: ['VMF'],
            entitlementSource: 'LICENSE_LEVEL',
            topology: 'SINGLE_TENANT',
            defaultTenantId: 'ten-default',
          },
        ],
      }),
    )

    expect(state).toEqual({
      customerId: 'cust-1',
      tenantId: 'ten-default',
      tenantName: null,
      ownerUserId: 'user-10',
    })
  })

  it('auth setCredentials clears tenant context when a different user signs in to the same customer', () => {
    const prev = {
      customerId: 'cust-1',
      tenantId: 'ten-1',
      tenantName: 'Tenant One',
      ownerUserId: 'gary-user',
    }
    const nextUser = {
      id: 'jena-user',
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
      tenantMemberships: [{ customerId: 'cust-1', tenantId: 'ten-1', roles: ['USER'] }],
    }

    const state = tenantContextReducer(prev, setCredentials({ user: nextUser }))

    expect(state).toEqual({
      customerId: 'cust-1',
      tenantId: null,
      tenantName: null,
      ownerUserId: 'jena-user',
    })
  })
})
