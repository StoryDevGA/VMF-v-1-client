import { describe, expect, it } from 'vitest'
import {
  vmfApi,
  useListVmfsQuery,
  useCreateVmfMutation,
  useGetVmfQuery,
  useUpdateVmfMutation,
  useDeleteVmfMutation,
} from './vmfApi.js'

describe('vmfApi', () => {
  it('registers expected endpoint definitions', () => {
    expect(vmfApi.endpoints).toHaveProperty('listVmfs')
    expect(vmfApi.endpoints).toHaveProperty('createVmf')
    expect(vmfApi.endpoints).toHaveProperty('getVmf')
    expect(vmfApi.endpoints).toHaveProperty('updateVmf')
    expect(vmfApi.endpoints).toHaveProperty('deleteVmf')
  })

  it('exports list query hook', () => {
    expect(typeof useListVmfsQuery).toBe('function')
  })

  it('exports create mutation hook', () => {
    expect(typeof useCreateVmfMutation).toBe('function')
  })

  it('exports get query hook', () => {
    expect(typeof useGetVmfQuery).toBe('function')
  })

  it('exports update mutation hook', () => {
    expect(typeof useUpdateVmfMutation).toBe('function')
  })

  it('exports delete mutation hook', () => {
    expect(typeof useDeleteVmfMutation).toBe('function')
  })

  it('exposes list endpoint initiate function', () => {
    expect(vmfApi.endpoints.listVmfs).toBeDefined()
    expect(typeof vmfApi.endpoints.listVmfs.initiate).toBe('function')
  })

  it('exposes delete endpoint initiate function', () => {
    expect(vmfApi.endpoints.deleteVmf).toBeDefined()
    expect(typeof vmfApi.endpoints.deleteVmf.initiate).toBe('function')
  })
})

