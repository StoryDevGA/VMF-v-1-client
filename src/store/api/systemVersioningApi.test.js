import { describe, it, expect } from 'vitest'
import {
  systemVersioningApi,
  useGetActivePolicyQuery,
  useGetPolicyHistoryQuery,
  useCreatePolicyMutation,
  useUpdatePolicyMetadataMutation,
} from './systemVersioningApi.js'

describe('systemVersioningApi', () => {
  it('exposes policy endpoints', () => {
    expect(systemVersioningApi.endpoints).toHaveProperty('getActivePolicy')
    expect(systemVersioningApi.endpoints).toHaveProperty('getPolicyHistory')
    expect(systemVersioningApi.endpoints).toHaveProperty('createPolicy')
    expect(systemVersioningApi.endpoints).toHaveProperty('updatePolicyMetadata')
  })

  it('exports query hooks', () => {
    expect(typeof useGetActivePolicyQuery).toBe('function')
    expect(typeof useGetPolicyHistoryQuery).toBe('function')
  })

  it('exports mutation hooks', () => {
    expect(typeof useCreatePolicyMutation).toBe('function')
    expect(typeof useUpdatePolicyMetadataMutation).toBe('function')
  })
})
