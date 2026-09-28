import { describe, expect, it } from 'vitest'
import { buildAdvisorRecommendation } from './advisorRecommendationModel.js'

describe('buildAdvisorRecommendation', () => {
  it('recommends quality review from unresolved contradiction summaries', () => {
    const recommendation = buildAdvisorRecommendation({
      discoveryHealth: {
        contradictionCandidates: [
          { domain: 'MARKET', reviewStatus: 'NEEDS_REVIEW' },
          { domain: 'STAKEHOLDER', reviewStatus: 'PENDING' },
          { domain: 'MARKET', reviewStatus: 'NOT_CONTRADICTORY' },
        ],
      },
      acceptedSectionCount: 4,
      requiredSectionCount: 6,
    })

    expect(recommendation).toMatchObject({
      kind: 'contradictions',
      title: 'Review 2 contradiction candidates before progressing customer outputs.',
      affectedItems: ['Market', 'Stakeholder'],
      actionHref: '/app/intelligence/quality',
      stateSummary: '2 open contradiction candidates',
    })
  })

  it('routes missing evidence coverage to Intelligence Hub', () => {
    const recommendation = buildAdvisorRecommendation({
      discoveryHealth: { contradictionCandidates: [], missingAreas: ['ECONOMICS'] },
    })

    expect(recommendation).toMatchObject({
      kind: 'coverage',
      affectedItems: ['Economics'],
      actionHref: '/app/intelligence',
    })
  })

  it('routes incomplete accepted truth to Workspace Structure', () => {
    const recommendation = buildAdvisorRecommendation({
      discoveryHealth: { readiness: { sectionTruth: { blockers: [{ sectionKey: 'customer_problem' }] } } },
      acceptedSectionCount: 2,
      requiredSectionCount: 4,
      requiredSections: [{ sectionKey: 'customer_problem', label: 'Customer Problem' }],
    })

    expect(recommendation).toMatchObject({
      kind: 'understanding',
      affectedItems: ['Customer Problem'],
      actionHref: '/app/workspace-structure',
    })
  })

  it('does not infer an action when the summary has no actionable information', () => {
    expect(buildAdvisorRecommendation()).toBeNull()
  })
})
