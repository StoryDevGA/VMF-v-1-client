import { describe, expect, it } from 'vitest'
import { getWorkspaceJourneyReviewSummary } from './workspaceJourneyModel.js'

describe('getWorkspaceJourneyReviewSummary', () => {
  it('shows contradiction and pending evidence counts separately when both need review', () => {
    expect(getWorkspaceJourneyReviewSummary({
      evidenceObjectSummary: { evidenceObjectCount: 8 },
      discoveryHealth: {
        readiness: {
          pendingReviewCount: 3,
          unresolvedContradictionCount: 2,
          evidenceObjectCount: 8,
        },
      },
    })).toEqual({
      status: 'Review needed',
      detail: '2 unresolved contradictions · 3 evidence items pending review',
      state: 'attention',
    })
  })

  it('keeps Review needed status when only one known category is positive', () => {
    expect(getWorkspaceJourneyReviewSummary({
      discoveryHealth: {
        readiness: { pendingReviewCount: 0, unresolvedContradictionCount: 1, evidenceObjectCount: 4 },
      },
    })).toEqual({
      status: 'Review needed',
      detail: '1 unresolved contradiction',
      state: 'attention',
    })
  })

  it('states when the other review category is unavailable instead of hiding it', () => {
    expect(getWorkspaceJourneyReviewSummary({
      discoveryHealth: { readiness: { unresolvedContradictionCount: 2 } },
    })).toEqual({
      status: 'Review needed',
      detail: '2 unresolved contradictions · Pending evidence review count unavailable',
      state: 'attention',
    })
  })

  it('distinguishes reviewed evidence from a workspace with no recorded evidence', () => {
    expect(getWorkspaceJourneyReviewSummary({
      discoveryHealth: { readiness: { pendingReviewCount: 0, unresolvedContradictionCount: 0, evidenceObjectCount: 4 } },
    })).toEqual({ status: 'No pending review recorded', detail: '', state: 'complete' })

    expect(getWorkspaceJourneyReviewSummary({
      discoveryHealth: { readiness: { pendingReviewCount: 0, unresolvedContradictionCount: 0, evidenceObjectCount: 0 } },
    })).toEqual({ status: 'Not yet recorded', detail: '', state: 'unknown' })
  })

  it('keeps missing or explicitly unavailable review summaries neutral', () => {
    expect(getWorkspaceJourneyReviewSummary(null)).toEqual({
      status: 'Unavailable',
      detail: '',
      state: 'unknown',
    })
    expect(getWorkspaceJourneyReviewSummary({
      discoveryHealth: { readiness: { state: 'UNKNOWN' } },
    })).toEqual({
      status: 'Unavailable',
      detail: '',
      state: 'unknown',
    })
    expect(getWorkspaceJourneyReviewSummary({ available: false, discoveryHealth: {
      readiness: { pendingReviewCount: 4, unresolvedContradictionCount: 1 },
    } })).toEqual({
      status: 'Unavailable',
      detail: '',
      state: 'unknown',
    })
  })
})
