import { describe, expect, test } from 'vitest'
import { INITIAL_FORM } from './superAdminCustomers.constants.js'
import { parseWholeNumber, validateForm } from './superAdminCustomers.utils.js'

describe('SS-031 customer credit form validation', () => {
  test('accepts only strict whole-number credit input', () => {
    expect(parseWholeNumber('10')).toBe(10)
    expect(parseWholeNumber('-1')).toBe(-1)
    expect(parseWholeNumber('10.5')).toBeNaN()
    expect(parseWholeNumber('10credits')).toBeNaN()
  })

  test('includes independent starting balances in the create payload', () => {
    const result = validateForm({
      ...INITIAL_FORM,
      name: 'Customer',
      licenseLevelId: 'lic-1',
      startingWebsiteCredits: '12',
      startingDocumentCredits: '7',
    }, { includeStartingCredits: true })

    expect(result.errors).toEqual({})
    expect(result.payload.startingCredits).toEqual({ websiteAnalysis: 12, documentImprovement: 7 })
  })

  test('allows an existing customer licence to be cleared without topology fields', () => {
    const result = validateForm({
      ...INITIAL_FORM,
      name: 'Customer',
      licenseLevelId: '',
    }, { includeTopology: false, requireLicenseLevel: false })

    expect(result.errors).toEqual({})
    expect(result.payload.licenseLevelId).toBeNull()
    expect(result.payload).not.toHaveProperty('topology')
    expect(result.payload).not.toHaveProperty('vmfPolicy')
    expect(result.payload).not.toHaveProperty('isServiceProvider')
  })
})
