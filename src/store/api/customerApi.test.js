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
  normalizeCustomerPayload,
  normalizeCustomerStatus,
  useListCustomersQuery,
  useLazyListCustomersQuery,
  useCreateCustomerMutation,
  useOnboardCustomerMutation,
  useGetCustomerQuery,
  useUpdateCustomerMutation,
  useUpdateCustomerStatusMutation,
  useCreateCustomerAdminInvitationMutation,
  useAssignAdminMutation,
  useReplaceCustomerAdminMutation,
} from './customerApi.js'

describe('customerApi', () => {
  it('should expose injected endpoints', () => {
    const endpoints = customerApi.endpoints
    expect(endpoints).toHaveProperty('listCustomers')
    expect(endpoints).toHaveProperty('createCustomer')
    expect(endpoints).toHaveProperty('onboardCustomer')
    expect(endpoints).toHaveProperty('getCustomer')
    expect(endpoints).toHaveProperty('updateCustomer')
    expect(endpoints).toHaveProperty('updateCustomerStatus')
    expect(endpoints).toHaveProperty('createCustomerAdminInvitation')
    expect(endpoints).toHaveProperty('assignAdmin')
    expect(endpoints).toHaveProperty('replaceCustomerAdmin')
  })

  it('should export query hooks', () => {
    expect(typeof useListCustomersQuery).toBe('function')
    expect(typeof useLazyListCustomersQuery).toBe('function')
    expect(typeof useGetCustomerQuery).toBe('function')
  })

  it('should export mutation hooks', () => {
    expect(typeof useCreateCustomerMutation).toBe('function')
    expect(typeof useOnboardCustomerMutation).toBe('function')
    expect(typeof useUpdateCustomerMutation).toBe('function')
    expect(typeof useUpdateCustomerStatusMutation).toBe('function')
    expect(typeof useCreateCustomerAdminInvitationMutation).toBe('function')
    expect(typeof useAssignAdminMutation).toBe('function')
    expect(typeof useReplaceCustomerAdminMutation).toBe('function')
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

  it('onboardCustomer endpoint should be a mutation', () => {
    expect(customerApi.endpoints.onboardCustomer).toBeDefined()
    expect(typeof customerApi.endpoints.onboardCustomer.initiate).toBe('function')
  })

  it('updateCustomer endpoint should be a mutation', () => {
    expect(customerApi.endpoints.updateCustomer).toBeDefined()
    expect(typeof customerApi.endpoints.updateCustomer.initiate).toBe('function')
  })

  it('updateCustomerStatus endpoint should be a mutation', () => {
    expect(customerApi.endpoints.updateCustomerStatus).toBeDefined()
    expect(typeof customerApi.endpoints.updateCustomerStatus.initiate).toBe('function')
  })

  it('createCustomerAdminInvitation endpoint should be a mutation', () => {
    expect(customerApi.endpoints.createCustomerAdminInvitation).toBeDefined()
    expect(typeof customerApi.endpoints.createCustomerAdminInvitation.initiate).toBe('function')
  })

  it('assignAdmin endpoint should be a mutation', () => {
    expect(customerApi.endpoints.assignAdmin).toBeDefined()
    expect(typeof customerApi.endpoints.assignAdmin.initiate).toBe('function')
  })

  it('replaceCustomerAdmin endpoint should be a mutation', () => {
    expect(customerApi.endpoints.replaceCustomerAdmin).toBeDefined()
    expect(typeof customerApi.endpoints.replaceCustomerAdmin.initiate).toBe('function')
  })

  it('normalizes legacy DISABLED lifecycle status to INACTIVE', () => {
    expect(normalizeCustomerStatus('DISABLED')).toBe('INACTIVE')
    expect(normalizeCustomerStatus('disabled')).toBe('INACTIVE')
    expect(normalizeCustomerStatus('INACTIVE')).toBe('INACTIVE')
    expect(normalizeCustomerStatus('ACTIVE')).toBe('ACTIVE')
    expect(normalizeCustomerStatus('')).toBe('')
  })

  it('preserves governance and license-level fields in customer payloads', () => {
    expect(
      normalizeCustomerPayload({
        name: 'Acme',
        licenseLevelId: '65f1f2f3f4f5f6f7f8f9a0b1',
        governance: {
          maxTenants: 5,
          maxVmfsPerTenant: 3,
          customerAdminUserId: '65f1f2f3f4f5f6f7f8f9a0b2',
        },
      }),
    ).toEqual({
      name: 'Acme',
      licenseLevelId: '65f1f2f3f4f5f6f7f8f9a0b1',
      governance: {
        maxTenants: 5,
        maxVmfsPerTenant: 3,
        customerAdminUserId: '65f1f2f3f4f5f6f7f8f9a0b2',
      },
    })
  })

  it('drops empty optional governance fields from payloads', () => {
    expect(
      normalizeCustomerPayload({
        name: 'Acme',
        licenseLevelId: '',
        governance: {
          maxTenants: 5,
          maxVmfsPerTenant: '',
          customerAdminUserId: undefined,
        },
      }),
    ).toEqual({
      name: 'Acme',
      governance: {
        maxTenants: 5,
      },
    })
  })

  it('strips governance.customerAdminUserId from update payloads', () => {
    expect(
      normalizeCustomerPayload(
        {
          name: 'Acme',
          governance: {
            maxTenants: 5,
            customerAdminUserId: '65f1f2f3f4f5f6f7f8f9a0b2',
          },
        },
        { stripCanonicalAdminUserId: true },
      ),
    ).toEqual({
      name: 'Acme',
      governance: {
        maxTenants: 5,
      },
    })
  })
})
