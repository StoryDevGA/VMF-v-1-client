/**
 * tenantContextSlice — pure reducer + selector tests
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

const initialState = { customerId: null, tenantId: null, tenantName: null }

describe('tenantContextSlice', () => {
  // ── Reducer ────────────────────────────────────────────

  it('should return the initial state', () => {
    const state = tenantContextReducer(undefined, { type: '@@INIT' })
    expect(state).toEqual(initialState)
  })

  it('setCustomer — sets customerId', () => {
    const state = tenantContextReducer(initialState, setCustomer({ customerId: 'cust-1' }))
    expect(state.customerId).toBe('cust-1')
  })

  it('setCustomer — clears tenant when customer changes', () => {
    const prev = { customerId: 'cust-1', tenantId: 'ten-1', tenantName: 'Tenant One' }
    const state = tenantContextReducer(prev, setCustomer({ customerId: 'cust-2' }))
    expect(state.customerId).toBe('cust-2')
    expect(state.tenantId).toBeNull()
    expect(state.tenantName).toBeNull()
  })

  it('setCustomer — no-op when same customerId', () => {
    const prev = { customerId: 'cust-1', tenantId: 'ten-1', tenantName: 'Tenant One' }
    const state = tenantContextReducer(prev, setCustomer({ customerId: 'cust-1' }))
    expect(state).toEqual(prev)
  })

  it('setTenant — sets both tenantId and tenantName', () => {
    const prev = { customerId: 'cust-1', tenantId: null, tenantName: null }
    const state = tenantContextReducer(prev, setTenant({ tenantId: 'ten-1', tenantName: 'Tenant One' }))
    expect(state.tenantId).toBe('ten-1')
    expect(state.tenantName).toBe('Tenant One')
  })

  it('setTenant — allows null tenantId', () => {
    const prev = { customerId: 'cust-1', tenantId: 'ten-1', tenantName: 'Tenant One' }
    const state = tenantContextReducer(prev, setTenant({ tenantId: null, tenantName: null }))
    expect(state.tenantId).toBeNull()
    expect(state.tenantName).toBeNull()
  })

  it('initializeFromUser — sets customerId from first CUSTOMER_ADMIN membership', () => {
    const user = {
      memberships: [
        { customerId: 'cust-9', roles: ['USER'] },
        { customerId: 'cust-5', roles: ['CUSTOMER_ADMIN'] },
        { customerId: 'cust-7', roles: ['CUSTOMER_ADMIN'] },
      ],
    }
    const state = tenantContextReducer(initialState, initializeFromUser(user))
    expect(state.customerId).toBe('cust-5')
  })

  it('initializeFromUser — no-op if customerId already set', () => {
    const prev = { customerId: 'cust-1', tenantId: null, tenantName: null }
    const user = {
      memberships: [{ customerId: 'cust-99', roles: ['CUSTOMER_ADMIN'] }],
    }
    const state = tenantContextReducer(prev, initializeFromUser(user))
    expect(state.customerId).toBe('cust-1')
  })

  it('initializeFromUser — no-op for user with no CUSTOMER_ADMIN membership', () => {
    const user = {
      memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
    }
    const state = tenantContextReducer(initialState, initializeFromUser(user))
    expect(state).toEqual(initialState)
  })

  it('clearTenantContext — resets to initial state', () => {
    const prev = { customerId: 'cust-1', tenantId: 'ten-1', tenantName: 'Tenant One' }
    const state = tenantContextReducer(prev, clearTenantContext())
    expect(state).toEqual(initialState)
  })

  // ── Selectors ──────────────────────────────────────────

  it('selectors — return correct values', () => {
    const rootState = {
      tenantContext: { customerId: 'cust-1', tenantId: 'ten-2', tenantName: 'Acme' },
    }

    expect(selectTenantContext(rootState)).toEqual(rootState.tenantContext)
    expect(selectSelectedCustomerId(rootState)).toBe('cust-1')
    expect(selectSelectedTenantId(rootState)).toBe('ten-2')
    expect(selectSelectedTenantName(rootState)).toBe('Acme')
  })
})
