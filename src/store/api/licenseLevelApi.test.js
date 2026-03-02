import { describe, it, expect } from 'vitest'
import {
  licenseLevelApi,
  useListLicenseLevelsQuery,
  useLazyListLicenseLevelsQuery,
  useCreateLicenseLevelMutation,
  useGetLicenseLevelQuery,
  useUpdateLicenseLevelMutation,
} from './licenseLevelApi.js'

describe('licenseLevelApi', () => {
  it('exposes license level endpoints', () => {
    expect(licenseLevelApi.endpoints).toHaveProperty('listLicenseLevels')
    expect(licenseLevelApi.endpoints).toHaveProperty('createLicenseLevel')
    expect(licenseLevelApi.endpoints).toHaveProperty('getLicenseLevel')
    expect(licenseLevelApi.endpoints).toHaveProperty('updateLicenseLevel')
  })

  it('exports query hooks', () => {
    expect(typeof useListLicenseLevelsQuery).toBe('function')
    expect(typeof useLazyListLicenseLevelsQuery).toBe('function')
    expect(typeof useGetLicenseLevelQuery).toBe('function')
  })

  it('exports mutation hooks', () => {
    expect(typeof useCreateLicenseLevelMutation).toBe('function')
    expect(typeof useUpdateLicenseLevelMutation).toBe('function')
  })

  it('listLicenseLevels endpoint should be a query', () => {
    expect(licenseLevelApi.endpoints.listLicenseLevels).toBeDefined()
    expect(typeof licenseLevelApi.endpoints.listLicenseLevels.initiate).toBe('function')
  })

  it('createLicenseLevel endpoint should be a mutation', () => {
    expect(licenseLevelApi.endpoints.createLicenseLevel).toBeDefined()
    expect(typeof licenseLevelApi.endpoints.createLicenseLevel.initiate).toBe('function')
  })

  it('getLicenseLevel endpoint should be a query', () => {
    expect(licenseLevelApi.endpoints.getLicenseLevel).toBeDefined()
    expect(typeof licenseLevelApi.endpoints.getLicenseLevel.initiate).toBe('function')
  })

  it('updateLicenseLevel endpoint should be a mutation', () => {
    expect(licenseLevelApi.endpoints.updateLicenseLevel).toBeDefined()
    expect(typeof licenseLevelApi.endpoints.updateLicenseLevel.initiate).toBe('function')
  })
})
