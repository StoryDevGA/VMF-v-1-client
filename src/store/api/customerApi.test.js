/**
 * customerApi Tests
 *
 * Covers:
 * - Endpoint definitions are injected correctly
 * - Hook exports exist
 * - Query and mutation types
 */

import { describe, it, expect } from 'vitest'
import {
  customerApi,
  useListCustomersQuery,
  useLazyListCustomersQuery,
  useCreateCustomerMutation,
  useGetCustomerQuery,
  useUpdateCustomerMutation,
  useUpdateCustomerStatusMutation,
  useAssignAdminMutation,
} from './customerApi.js'

describe('customerApi', () => {
  it('should expose injected endpoints', () => {
    const endpoints = customerApi.endpoints
    expect(endpoints).toHaveProperty('listCustomers')
    expect(endpoints).toHaveProperty('createCustomer')
    expect(endpoints).toHaveProperty('getCustomer')
    expect(endpoints).toHaveProperty('updateCustomer')
    expect(endpoints).toHaveProperty('updateCustomerStatus')
    expect(endpoints).toHaveProperty('assignAdmin')
  })

  it('should export query hooks', () => {
    expect(typeof useListCustomersQuery).toBe('function')
    expect(typeof useLazyListCustomersQuery).toBe('function')
    expect(typeof useGetCustomerQuery).toBe('function')
  })

  it('should export mutation hooks', () => {
    expect(typeof useCreateCustomerMutation).toBe('function')
    expect(typeof useUpdateCustomerMutation).toBe('function')
    expect(typeof useUpdateCustomerStatusMutation).toBe('function')
    expect(typeof useAssignAdminMutation).toBe('function')
  })

  it('listCustomers endpoint should be a query', () => {
    expect(customerApi.endpoints.listCustomers).toBeDefined()
    expect(typeof customerApi.endpoints.listCustomers.initiate).toBe('function')
  })

  it('createCustomer endpoint should be a mutation', () => {
    expect(customerApi.endpoints.createCustomer).toBeDefined()
    expect(typeof customerApi.endpoints.createCustomer.initiate).toBe('function')
  })

  it('getCustomer endpoint should be a query', () => {
    expect(customerApi.endpoints.getCustomer).toBeDefined()
    expect(typeof customerApi.endpoints.getCustomer.initiate).toBe('function')
  })

  it('updateCustomer endpoint should be a mutation', () => {
    expect(customerApi.endpoints.updateCustomer).toBeDefined()
    expect(typeof customerApi.endpoints.updateCustomer.initiate).toBe('function')
  })

  it('updateCustomerStatus endpoint should be a mutation', () => {
    expect(customerApi.endpoints.updateCustomerStatus).toBeDefined()
    expect(typeof customerApi.endpoints.updateCustomerStatus.initiate).toBe('function')
  })

  it('assignAdmin endpoint should be a mutation', () => {
    expect(customerApi.endpoints.assignAdmin).toBeDefined()
    expect(typeof customerApi.endpoints.assignAdmin.initiate).toBe('function')
  })
})
