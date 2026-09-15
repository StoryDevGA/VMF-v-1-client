import { describe, expect, it } from 'vitest'
import {
  buildCustomerHomeWorkspaceCard,
  CUSTOMER_EXPERIENCE,
  resolveCustomerExperience,
} from './customerExperience.js'

describe('customer experience resolution', () => {
  it('maps VMF-entitled scopes to Core', () => {
    expect(resolveCustomerExperience({ featureEntitlements: ['VMF', 'DEALS'] })).toBe(CUSTOMER_EXPERIENCE.CORE)
  })

  it('maps known non-Core scopes to Signal', () => {
    expect(resolveCustomerExperience({ featureEntitlements: ['DEALS', 'VIEWS'] })).toBe(CUSTOMER_EXPERIENCE.SIGNAL)
  })

  it('fails closed for missing, empty, and unknown scopes', () => {
    expect(resolveCustomerExperience(null)).toBe(CUSTOMER_EXPERIENCE.UNKNOWN)
    expect(resolveCustomerExperience({ featureEntitlements: [] })).toBe(CUSTOMER_EXPERIENCE.UNKNOWN)
    expect(resolveCustomerExperience({ featureEntitlements: ['UNKNOWN'] })).toBe(CUSTOMER_EXPERIENCE.UNKNOWN)
  })
})

describe('customer home workspace summary adapter', () => {
  it('maps accepted understanding and review state without reading full state', () => {
    expect(buildCustomerHomeWorkspaceCard({
      id: 'workspace-1',
      name: 'Objective',
      frameworkLifecycleStage: 'REVIEW',
      validationStatus: 'ACCEPTED',
      readinessState: 'READY',
      submittedForReview: true,
    })).toMatchObject({
      businessObjective: 'Objective',
      currentStage: 'REVIEW',
      understanding: 'Understanding accepted',
      evidence: 'READY',
      nextAction: 'Review & evidence',
    })
  })

  it('uses conservative fallbacks when summary fields are absent', () => {
    expect(buildCustomerHomeWorkspaceCard({})).toMatchObject({
      businessObjective: 'Not yet recorded',
      currentStage: 'Not yet recorded',
      understanding: 'Not yet recorded',
      evidence: 'Not yet recorded',
      nextAction: 'Review items',
      attentionGroup: 'Needs your input',
    })
  })
})

