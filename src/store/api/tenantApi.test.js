/**
 * tenantApi Tests
 *
 * Covers:
 * - Endpoint definitions are injected correctly
 * - Hook exports exist
 * - Query and mutation types
 */

import { describe, it, expect } from 'vitest'
import {
  tenantApi,
  useListTenantsQuery,
  useLazyListTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useEnableTenantMutation,
  useDisableTenantMutation,
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
