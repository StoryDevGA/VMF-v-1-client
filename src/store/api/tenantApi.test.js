/**
 * tenantApi Tests
 *
 * Covers:
 * - Endpoint definitions are injected correctly
 * - Hook exports exist
 * - Query and mutation types
 */

import { describe, it, expect, vi } from 'vitest'
import { setTokens } from '../../utils/tokenStorage.js'
import {
  tenantApi,
  useListTenantsQuery,
  useLazyListTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useEnableTenantMutation,
  useDisableTenantMutation,
  fetchTenantContextCatalogue,
  useTenantContextCatalogueQuery,
} from './tenantApi.js'

describe('tenantApi', () => {
  it('should expose injected endpoints', () => {
    const endpoints = tenantApi.endpoints
    expect(endpoints).toHaveProperty('listTenants')
    expect(endpoints).toHaveProperty('createTenant')
    expect(endpoints).toHaveProperty('updateTenant')
    expect(endpoints).toHaveProperty('enableTenant')
    expect(endpoints).toHaveProperty('disableTenant')
  })

  it('should export query hooks', () => {
    expect(typeof useListTenantsQuery).toBe('function')
    expect(typeof useLazyListTenantsQuery).toBe('function')
  })

  it('should export mutation hooks', () => {
    expect(typeof useCreateTenantMutation).toBe('function')
    expect(typeof useUpdateTenantMutation).toBe('function')
    expect(typeof useEnableTenantMutation).toBe('function')
    expect(typeof useDisableTenantMutation).toBe('function')
  })

  it('listTenants endpoint should be a query', () => {
    expect(tenantApi.endpoints.listTenants).toBeDefined()
    expect(typeof tenantApi.endpoints.listTenants.initiate).toBe('function')
  })

  it('createTenant endpoint should be a mutation', () => {
    expect(tenantApi.endpoints.createTenant).toBeDefined()
    expect(typeof tenantApi.endpoints.createTenant.initiate).toBe('function')
  })

  it('updateTenant endpoint should be a mutation', () => {
    expect(tenantApi.endpoints.updateTenant).toBeDefined()
    expect(typeof tenantApi.endpoints.updateTenant.initiate).toBe('function')
  })

  it('enableTenant endpoint should be a mutation', () => {
    expect(tenantApi.endpoints.enableTenant).toBeDefined()
    expect(typeof tenantApi.endpoints.enableTenant.initiate).toBe('function')
  })

  it('disableTenant endpoint should be a mutation', () => {
    expect(tenantApi.endpoints.disableTenant).toBeDefined()
    expect(typeof tenantApi.endpoints.disableTenant.initiate).toBe('function')
  })
})

describe('complete context-only tenant catalogue', () => {
  const page = (pageNumber, total = 101) => ({ data: {
    data: Array.from({ length: Math.min(100, total - (pageNumber - 1) * 100) }, (_, index) => ({ id: `tenant-${(pageNumber - 1) * 100 + index}`, isSelectable: true })),
    meta: { page: pageNumber, pageSize: 100, total, totalPages: Math.ceil(total / 100), customerName: 'Customer' },
  } })
  const read = (baseQuery, signal = new AbortController().signal) => fetchTenantContextCatalogue({ customerId: 'customer-a' }, { signal }, {}, baseQuery)

  it('uses a separate endpoint and combines all 101 tenants in customer-scoped pages', async () => {
    expect(typeof useTenantContextCatalogueQuery).toBe('function')
    expect(tenantApi.endpoints.tenantContextCatalogue).toBeDefined()
    const query = vi.fn().mockResolvedValueOnce(page(1)).mockResolvedValueOnce(page(2))
    const result = await read(query)
    expect(result.data.data).toHaveLength(101)
    expect(result.data.meta).toMatchObject({ complete: true, customerId: 'customer-a' })
    expect(query.mock.calls.map(([url]) => url)).toEqual(['/customers/customer-a/tenants?page=1&pageSize=100', '/customers/customer-a/tenants?page=2&pageSize=100'])
  })

  it('returns the later-page failure without advertising the first page as complete', async () => {
    const error = { error: { status: 403, data: { code: 'FORBIDDEN' } } }
    const query = vi.fn().mockResolvedValueOnce(page(1)).mockResolvedValueOnce(error)
    expect(await read(query)).toEqual(error)
  })

  it.each(['duplicate', 'changed total', 'wrong page', 'missing metadata', 'too many pages', 'short first page'])('fails closed for %s', async (scenario) => {
    const first = page(1)
    const second = page(2)
    if (scenario === 'duplicate') second.data.data[0].id = 'tenant-0'
    if (scenario === 'changed total') second.data.meta.total = 102
    if (scenario === 'wrong page') second.data.meta.page = 1
    if (scenario === 'missing metadata') delete first.data.meta
    if (scenario === 'too many pages') Object.assign(first.data.meta, { total: 10001, totalPages: 101 })
    if (scenario === 'short first page') first.data.data.pop()
    const result = await read(vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second))
    expect(result).toMatchObject({ error: { data: { code: 'TENANT_CONTEXT_INCOMPLETE' } } })
    expect(result).not.toHaveProperty('data')
  })

  it('stops pagination when its caller aborts', async () => {
    const controller = new AbortController()
    const query = vi.fn(async () => { controller.abort(); return page(1) })
    expect(await read(query, controller.signal)).toMatchObject({ error: { error: 'AbortError' } })
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('never loads a later page with a newly logged-in account', async () => {
    const query = vi.fn(async () => {
      setTokens({ accessToken: 'other-account', refreshToken: 'other-refresh' })
      return page(1)
    })
    expect(await read(query)).toMatchObject({ error: { data: { code: 'TENANT_CONTEXT_INCOMPLETE' } } })
    expect(query).toHaveBeenCalledTimes(1)
  })
})
