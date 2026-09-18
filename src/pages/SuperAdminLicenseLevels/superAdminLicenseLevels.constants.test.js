import { describe, expect, it } from 'vitest'
import { mapValidationErrors, validateForm } from './superAdminLicenseLevels.constants.js'

describe('licence level validation boundaries', () => {
  it('rejects WEBSITE on Core licence levels before submit', () => {
    const result = validateForm({
      name: 'Core Plus',
      description: '',
      entitlements: 'VMF, WEBSITE',
      homeExperience: 'CORE',
      isActive: true,
    })

    expect(result.errors.entitlements).toMatch(/Core licence levels cannot include WEBSITE/i)
  })

  it('maps server confirmation fields back to the edit form', () => {
    expect(mapValidationErrors({
      details: {
        isActive: 'Confirmation does not match.',
        homeExperience: 'This change is not allowed.',
      },
    })).toEqual({
      isActive: 'Confirmation does not match.',
      homeExperience: 'This change is not allowed.',
    })
  })
})
