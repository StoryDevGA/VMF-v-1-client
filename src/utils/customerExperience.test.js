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

  it('keeps Signal when the API adds an unrelated additive entitlement token', () => {
    expect(resolveCustomerExperience({ featureEntitlements: ['DEALS', 'VIEWS', 'NEW_SIGNAL_CAPABILITY'] })).toBe(
      CUSTOMER_EXPERIENCE.SIGNAL,
    )
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
      runtimeType: 'VALUE_NARRATIVE',
      frameworkKey: 'VMF',
      frameworkLifecycleStage: 'REVIEW',
      validationStatus: 'ACCEPTED',
      readinessState: 'READY',
      submittedForReview: true,
    })).toMatchObject({
      businessObjective: 'Objective',
      workspaceType: 'Value Narrative workspace',
      currentStage: 'Review',
      understanding: 'Understanding accepted',
      evidence: 'Source basis available',
      nextAction: 'Review & evidence',
      statusSignal: 'Evidence checked',
    })
  })

  it('derives customer labels from VMF summary fields instead of exposing enum tokens', () => {
    expect(buildCustomerHomeWorkspaceCard({
      runtimeType: 'VALUE_NARRATIVE',
      frameworkKey: 'VMF',
      frameworkLifecycleStage: 'DRAFT',
      validationStatus: 'PENDING',
      readinessState: 'BLOCKED',
    })).toMatchObject({
      workspaceType: 'Value Narrative workspace',
      currentStage: 'Draft',
      understanding: 'Review items',
      evidence: 'Items needing attention',
      statusSignal: null,
    })
  })

  it('maps VMF readiness states to customer language', () => {
    expect(buildCustomerHomeWorkspaceCard({ readinessState: 'VALIDATED' }).evidence).toBe('Evidence checked')
    expect(buildCustomerHomeWorkspaceCard({ readinessState: 'IN_REVIEW' }).evidence).toBe('Review & evidence')
    expect(buildCustomerHomeWorkspaceCard({ readinessState: 'DRAFT' }).evidence).toBe('Not yet recorded')
    expect(buildCustomerHomeWorkspaceCard({ snapshotStatus: 'PACKAGE_BOUND' }).evidence).toBe('Source basis available')
  })

  it('does not use a display name as a route identity', () => {
    expect(buildCustomerHomeWorkspaceCard({ name: 'Named workspace' })).toMatchObject({
      id: null,
      title: 'Named workspace',
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

