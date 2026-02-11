/**
 * useTenantContext — hook tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

import useTenantContext from './useTenantContext.js'
import authReducer from '../store/slices/authSlice.js'
import tenantContextReducer from '../store/slices/tenantContextSlice.js'
import { baseApi } from '../store/api/baseApi.js'

// ── Polyfills ────────────────────────────────────────────
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () { this.open = true })
  HTMLDialogElement.prototype.close = vi.fn(function () { this.open = false })
})

// ── User fixtures ────────────────────────────────────────
const customerAdminUser = {
  id: 'user-1',
  email: 'admin@acme.com',
  name: 'Admin',
  isActive: true,
  memberships: [{ customerId: 'cust-1', roles: ['CUSTOMER_ADMIN'] }],
  tenantMemberships: [],
  vmfGrants: [],
}

const superAdminUser = {
  id: 'user-2',
  email: 'super@vmf.io',
  name: 'Super Admin',
  isActive: true,
  memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
  tenantMemberships: [],
  vmfGrants: [],
}

// ── Helpers ──────────────────────────────────────────────
function createWrapper(preloadedState) {
  const testStore = configureStore({
    reducer: {
      auth: authReducer,
      tenantContext: tenantContextReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
    preloadedState,
  })

  return function Wrapper({ children }) {
    return <Provider store={testStore}>{children}</Provider>
  }
}

// ── Tests ────────────────────────────────────────────────
describe('useTenantContext', () => {
  it('returns null customerId when not initialized', () => {
    const wrapper = createWrapper({
      auth: { user: null, status: 'idle' },
      tenantContext: { customerId: null, tenantId: null, tenantName: null },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })
    expect(result.current.customerId).toBeNull()
  })

  it('auto-initializes customerId from user memberships', async () => {
    const wrapper = createWrapper({
      auth: { user: customerAdminUser, status: 'authenticated' },
      tenantContext: { customerId: null, tenantId: null, tenantName: null },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.customerId).toBe('cust-1')
    })
  })

  it('returns isSuperAdmin true for super admin user', () => {
    const wrapper = createWrapper({
      auth: { user: superAdminUser, status: 'authenticated' },
      tenantContext: { customerId: null, tenantId: null, tenantName: null },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })
    expect(result.current.isSuperAdmin).toBe(true)
  })

  it('setCustomerId updates customerId', () => {
    const wrapper = createWrapper({
      auth: { user: customerAdminUser, status: 'authenticated' },
      tenantContext: { customerId: null, tenantId: null, tenantName: null },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    act(() => {
      result.current.setCustomerId('cust-99')
    })

    expect(result.current.customerId).toBe('cust-99')
  })

  it('setTenantId updates tenantId and tenantName', () => {
    const wrapper = createWrapper({
      auth: { user: customerAdminUser, status: 'authenticated' },
      tenantContext: { customerId: 'cust-1', tenantId: null, tenantName: null },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    act(() => {
      result.current.setTenantId('ten-1', 'Alpha')
    })

    expect(result.current.tenantId).toBe('ten-1')
    expect(result.current.tenantName).toBe('Alpha')
  })

  it('clearContext resets all to null', () => {
    // Use null user so auto-init does not re-populate after clear
    const wrapper = createWrapper({
      auth: { user: null, status: 'idle' },
      tenantContext: { customerId: 'cust-1', tenantId: 'ten-1', tenantName: 'Alpha' },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    act(() => {
      result.current.clearContext()
    })

    expect(result.current.customerId).toBeNull()
    expect(result.current.tenantId).toBeNull()
    expect(result.current.tenantName).toBeNull()
  })
})
