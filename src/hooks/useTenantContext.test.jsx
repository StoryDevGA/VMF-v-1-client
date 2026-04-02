/**
 * useTenantContext — hook tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

const { mockUseListTenantsQuery } = vi.hoisted(() => ({
  mockUseListTenantsQuery: vi.fn(),
}))

vi.mock('../store/api/tenantApi.js', () => ({
  useListTenantsQuery: (...args) => mockUseListTenantsQuery(...args),
}))

import useTenantContext from './useTenantContext.js'
import authReducer from '../store/slices/authSlice.js'
import tenantContextReducer from '../store/slices/tenantContextSlice.js'
import { baseApi } from '../store/api/baseApi.js'

const defaultResolvedPermissions = {
  platform: { roleKeys: [], permissions: [] },
  customers: [{ customerId: 'cust-1', roleKeys: ['CUSTOMER_ADMIN'], permissions: ['TENANT_VIEW'] }],
  tenants: [{ customerId: 'cust-1', tenantId: 'ten-1', roleKeys: ['TENANT_ADMIN'], permissions: ['TENANT_VIEW'] }],
}

// ── Polyfills ────────────────────────────────────────────
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () { this.open = true })
  HTMLDialogElement.prototype.close = vi.fn(function () { this.open = false })
  mockUseListTenantsQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: undefined,
  })
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
  const mergedPreloadedState = {
    ...preloadedState,
    auth: {
      user: null,
      customerScopes: [],
      resolvedPermissions: defaultResolvedPermissions,
      status: 'idle',
      ...(preloadedState?.auth ?? {}),
    },
  }

  const testStore = configureStore({
    reducer: {
      auth: authReducer,
      tenantContext: tenantContextReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
    preloadedState: mergedPreloadedState,
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

  it('resolves selected tenant details from the active customer tenant list', () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [
          { _id: 'ten-1', name: 'Alpha Tenant' },
          { _id: 'ten-2', name: 'Beta Tenant' },
        ],
      },
      isLoading: false,
      error: undefined,
    })

    const wrapper = createWrapper({
      auth: { user: customerAdminUser, status: 'authenticated' },
      tenantContext: {
        customerId: 'cust-1',
        tenantId: 'ten-2',
        tenantName: null,
        ownerUserId: 'user-1',
      },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    expect(result.current.selectedTenant?._id).toBe('ten-2')
    expect(result.current.resolvedTenantName).toBe('Beta Tenant')
    expect(result.current.hasInvalidTenantContext).toBe(false)
  })

  it('flags invalid tenant context when the selected tenant is not in the active customer tenant list', () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [{ _id: 'ten-1', name: 'Alpha Tenant' }],
      },
      isLoading: false,
      error: undefined,
    })

    const wrapper = createWrapper({
      auth: { user: customerAdminUser, status: 'authenticated' },
      tenantContext: {
        customerId: 'cust-1',
        tenantId: 'ten-404',
        tenantName: 'Ghost',
        ownerUserId: 'user-1',
      },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    expect(result.current.selectedTenant).toBeNull()
    expect(result.current.hasInvalidTenantContext).toBe(true)
  })

  it('clears legacy cross-user tenant scope on mount when the stored owner is missing', async () => {
    const wrapper = createWrapper({
      auth: {
        user: {
          id: 'user-9',
          email: 'jena@example.com',
          name: 'Jena',
          isActive: true,
          memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
          tenantMemberships: [],
          vmfGrants: [],
        },
        status: 'authenticated',
      },
      tenantContext: { customerId: 'cust-1', tenantId: 'ten-1', tenantName: 'Aldi' },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.tenantId).toBeNull()
    })

    expect(result.current.tenantName).toBeNull()
  })

  it('does not expose a tenant label when tenantId is missing even if tenantName is stale', () => {
    const wrapper = createWrapper({
      auth: { user: customerAdminUser, status: 'authenticated' },
      tenantContext: {
        customerId: 'cust-1',
        tenantId: null,
        tenantName: 'Aldi',
        ownerUserId: 'user-1',
      },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    expect(result.current.resolvedTenantName).toBeNull()
  })

  it('exposes normalized tenant-visibility metadata and selectable tenants', () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [
          { id: 'ten-1', name: 'Alpha Tenant', isSelectable: true },
          { id: 'ten-2', name: 'Beta Tenant', isSelectable: false },
        ],
        meta: {
          tenantVisibility: {
            mode: 'guided',
            allowed: true,
            topology: 'multi_tenant',
            isServiceProvider: true,
            selectableStatuses: ['enabled'],
          },
        },
      },
      isLoading: false,
      error: undefined,
    })

    const wrapper = createWrapper({
      auth: { user: customerAdminUser, status: 'authenticated' },
      tenantContext: { customerId: 'cust-1', tenantId: null, tenantName: null },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    expect(result.current.tenantVisibilityMeta).toEqual({
      mode: 'GUIDED',
      allowed: true,
      topology: 'MULTI_TENANT',
      isServiceProvider: true,
      selectableStatuses: ['ENABLED'],
    })
    expect(result.current.selectedCustomerTopology).toBe('MULTI_TENANT')
    expect(result.current.supportsTenantManagement).toBe(true)
    expect(result.current.selectableTenants.map((tenant) => tenant.id)).toEqual(['ten-1'])
  })

  it('falls back to authenticated customer topology when tenant metadata is not present', () => {
    const wrapper = createWrapper({
      auth: {
        user: {
          ...customerAdminUser,
          memberships: [
            {
              customerId: 'cust-1',
              roles: ['CUSTOMER_ADMIN'],
              customer: { topology: 'single_tenant' },
            },
          ],
        },
        status: 'authenticated',
      },
      tenantContext: { customerId: 'cust-1', tenantId: null, tenantName: null },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    expect(result.current.selectedCustomerTopology).toBe('SINGLE_TENANT')
    expect(result.current.supportsTenantManagement).toBe(false)
  })

  it('hydrates tenantId from authenticated customer scope metadata before the tenant list resolves', async () => {
    const wrapper = createWrapper({
      auth: {
        user: {
          id: 'user-11',
          email: 'viewer@example.com',
          name: 'Viewer',
          isActive: true,
          memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
          tenantMemberships: [],
          vmfGrants: [],
        },
        customerScopes: [
          {
            customerId: 'cust-1',
            featureEntitlements: ['VMF'],
            entitlementSource: 'LICENSE_LEVEL',
            topology: 'SINGLE_TENANT',
            defaultTenantId: 'ten-session-default',
          },
        ],
        status: 'authenticated',
      },
      tenantContext: {
        customerId: null,
        tenantId: null,
        tenantName: null,
        ownerUserId: null,
      },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.customerId).toBe('cust-1')
      expect(result.current.tenantId).toBe('ten-session-default')
    })

    expect(result.current.selectedCustomerTopology).toBe('SINGLE_TENANT')
    expect(result.current.supportsTenantManagement).toBe(false)
  })

  it('auto-selects the only selectable tenant for a single-tenant customer when tenant context is missing', async () => {
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [{ id: 'ten-1', name: 'Solo Tenant', isSelectable: true }],
        meta: {
          tenantVisibility: {
            mode: 'disallowed',
            allowed: false,
            topology: 'single_tenant',
            isServiceProvider: false,
            selectableStatuses: ['enabled'],
          },
        },
      },
      isLoading: false,
      error: undefined,
    })

    const wrapper = createWrapper({
      auth: {
        user: {
          id: 'user-9',
          email: 'viewer@example.com',
          name: 'Viewer',
          isActive: true,
          memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
          tenantMemberships: [],
          vmfGrants: [],
        },
        status: 'authenticated',
      },
      tenantContext: {
        customerId: 'cust-1',
        tenantId: null,
        tenantName: null,
        ownerUserId: 'user-9',
      },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.tenantId).toBe('ten-1')
    })

    expect(result.current.tenantName).toBe('Solo Tenant')
    expect(result.current.resolvedTenantName).toBe('Solo Tenant')
    expect(result.current.supportsTenantManagement).toBe(false)
  })

  it('returns no tenant visibility when resolved permissions lack TENANT_VIEW', () => {
    const wrapper = createWrapper({
      auth: {
        user: {
          id: 'user-12',
          email: 'tenant.admin@example.com',
          name: 'Tenant Admin',
          isActive: true,
          memberships: [{ customerId: 'cust-1', roles: ['TENANT_ADMIN', 'USER'] }],
          tenantMemberships: [{ customerId: 'cust-1', tenantId: 'ten-1', roles: ['TENANT_ADMIN'] }],
          vmfGrants: [],
        },
        resolvedPermissions: {
          platform: { roleKeys: [], permissions: [] },
          customers: [],
          tenants: [],
        },
        status: 'authenticated',
      },
      tenantContext: {
        customerId: 'cust-1',
        tenantId: null,
        tenantName: null,
        ownerUserId: 'user-12',
      },
    })

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    expect(result.current.canViewTenants).toBe(false)
    expect(result.current.selectableTenants).toEqual([])
    expect(mockUseListTenantsQuery).toHaveBeenLastCalledWith(
      { customerId: 'cust-1', page: 1, pageSize: 100 },
      { skip: true },
    )
  })
})
