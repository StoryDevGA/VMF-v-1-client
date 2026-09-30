import { describe, expect, it } from 'vitest'
import {
  HUB_VIEWS,
  getHubContextSearch,
  getHubEvidencePage,
  getHubEvidenceStatusCount,
  getHubViewFromSearch,
  reconcileHubDiscovery,
  validateHubContext,
} from './intelligenceHubModel.js'

const renderer = {
  runtimeInstance: {
    id: 'revision-2',
    customerId: 'customer-1',
    tenantId: 'tenant-1',
  },
  revision: {
    rootRuntimeInstanceKey: 'workspace-1',
    lineage: [{ runtimeInstanceId: 'revision-2', relationship: 'CURRENT' }],
  },
}

const context = {
  renderer,
  workspaceId: 'workspace-1',
  revisionId: 'revision-2',
  customerId: 'customer-1',
  tenantId: 'tenant-1',
}

describe('Intelligence Hub read context', () => {
  it('accepts only a verified selected workspace and revision lineage', () => {
    expect(validateHubContext(context).valid).toBe(true)
    expect(validateHubContext({ ...context, workspaceId: 'other-workspace' }).valid).toBe(false)
    expect(validateHubContext({ ...context, revisionId: 'revision-1' }).valid).toBe(false)
    expect(validateHubContext({ ...context, customerId: 'other-customer' }).valid).toBe(false)
    expect(validateHubContext({ ...context, tenantId: 'other-tenant' }).valid).toBe(false)
    expect(validateHubContext({ ...context, renderer: { ...renderer, revision: { ...renderer.revision, lineage: [] } } }).valid).toBe(false)
  })

  it('keeps the selected context in every first-level view', () => {
    for (const view of HUB_VIEWS) {
      const search = getHubContextSearch('workspace-1', 'revision-2', view)
      expect(new URLSearchParams(search).get('runtimeInstanceId')).toBe('workspace-1')
      expect(new URLSearchParams(search).get('revisionId')).toBe('revision-2')
      expect(HUB_VIEWS[getHubViewFromSearch(`?${search}`)]).toBe(view)
    }
  })

  it('recognises bounded evidence pages without treating missing detail as zero', () => {
    expect(getHubEvidencePage({ data: { data: { evidenceObjects: [], totalPages: 2 } } })).toEqual({ evidenceObjects: [], totalPages: 2 })
    expect(getHubEvidencePage({ data: { data: {} } })).toBeNull()
  })

  it('uses bounded filtered totals and only treats an empty filtered read as zero when the base page is verified', () => {
    const base = { evidenceObjects: [{}], total: 853, totalCapped: false }
    expect(getHubEvidenceStatusCount({ data: { data: { evidenceObjects: [{}], total: 761 } } }, null, base)).toBe(761)
    expect(getHubEvidenceStatusCount(null, { data: { error: { code: 'RUNTIME_STATE_V2_EVIDENCE_MISSING' } } }, base)).toBe(0)
    expect(getHubEvidenceStatusCount(null, { data: { error: { code: 'RUNTIME_STATE_V2_EVIDENCE_MISSING' } } }, null)).toBeNull()
    expect(getHubEvidenceStatusCount({ data: { data: { evidenceObjects: [{}], total: 853, totalCapped: true } } }, null, base)).toBeNull()
  })

  it('reconciles a stale renderer zero against a bounded evidence count', () => {
    const discovery = { sourceRegistrySummary: { count: 0 }, evidenceObjectSummary: { evidenceObjectCount: 0, acceptedEvidenceCount: 0, pendingReviewCount: 0 } }
    const result = reconcileHubDiscovery(discovery, { total: 12, evidenceObjects: [{}] })
    expect(result.sourceRegistrySummary.count).toBeNull()
    expect(result.evidenceObjectSummary.evidenceObjectCount).toBe(12)
    expect(result.evidenceObjectSummary.acceptedEvidenceCount).toBeNull()
    expect(result.evidenceObjectSummary.pendingReviewCount).toBeNull()
  })
})
