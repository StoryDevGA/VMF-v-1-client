import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IntelligenceHub from './IntelligenceHub.jsx'

const state = vi.hoisted(() => ({ conflict: false, locked: false, evidenceCurrent: true, candidateCurrent: true, candidate: vi.fn(), evidence: vi.fn(), refresh: vi.fn() }))
vi.mock('../../hooks/useTenantContext.js', () => ({ useTenantContext: () => ({ customerId: 'customer', tenantId: 'tenant' }) }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetRuntimeStateFindingsQuery: (_args, options) => ({ isUninitialized: options.skip }),
  useGetRuntimeStateSourceSummaryQuery: () => ({ refetch: state.refresh }),
  useGetRuntimeStateEvidenceInventoryQuery: () => ({ refetch: state.refresh }),
  useGetRuntimeStateDiscoveryHealthQuery: () => ({ refetch: state.refresh }),
  useGetRuntimeStateLockBasisQuery: () => ({ refetch: state.refresh }),
  useGetAcquisitionRunsQuery: () => ({ refetch: state.refresh }),
  useGetAcquisitionRunQuery: () => ({}),
  useExecuteRuntimeActionMutation: () => [vi.fn()],
  useUpdateRuntimeDiscoveryInputsMutation: () => [vi.fn()],
  useReviewRuntimeDiscoveryEvidenceMutation: () => [vi.fn()],
  useReviewRuntimeDiscoveryContradictionMutation: () => [vi.fn()],
  useGetRuntimeStateSourcesQuery: () => ({ refetch: state.refresh }),
  useGetRuntimeRendererQuery: ({ runtimeInstanceId }) => ({ currentData: { data: {
    runtimeInstance: { id: runtimeInstanceId, customerId: 'customer', tenantId: state.conflict ? 'other' : 'tenant', name: 'Scoped workspace' },
    revision: { rootRuntimeInstanceKey: 'root', revisionNumber: 2, lineage: [{ relationship: 'CURRENT', runtimeInstanceId }] },
    lock: { locked: state.locked, state: state.locked ? 'LOCKED' : 'UNLOCKED' },
    discovery: { state: { status: 'ACCEPTED' }, sourceRegistrySummary: { count: 0 } },
  } }, refetch: state.refresh }),
  useGetReviewCompletionQuery: () => ({ isLoading: false, refetch: vi.fn() }),
  useCompleteReviewMutation: () => [vi.fn()],
  useGetRuntimeDiscoveryContradictionsQuery: (...args) => {
    state.candidate(...args)
    const data = { data: { candidates: [{ contradictionId: 'one', domain: 'Market', reviewStatus: 'UNREVIEWED' }] } }
    return { data, currentData: state.candidateCurrent ? data : undefined, refetch: state.refresh }
  },
  useGetRuntimeStateEvidenceQuery: (...args) => {
    state.evidence(...args)
    const data = { data: { evidenceObjects: [], total: 853 } }
    return { data, currentData: state.evidenceCurrent ? data : undefined, refetch: state.refresh }
  },
  useGetRuntimeStateGraphManifestQuery: () => ({}),
  useGetRuntimeStateGraphNeighbourhoodQuery: () => ({}),
  useGetRuntimeStateGraphProjectionQuery: () => ({}),
  useGetRuntimeIntelligenceGraphCoverageQuery: () => ({}),
}))
function LocationProbe() {
  const location = useLocation()
  return <output aria-label="Current route">{location.pathname}{location.search}</output>
}
const show = (entry = '/app/intelligence?runtimeInstanceId=root&revisionId=rev-2&view=evidence-readiness') => render(<MemoryRouter initialEntries={[entry]}><LocationProbe /><Routes><Route path="/app/intelligence" element={<IntelligenceHub />} /><Route path="/app/intelligence/quality" element={<p>Quality destination</p>} /></Routes></MemoryRouter>)

describe('Evidence readiness selected-context integration', () => {
  beforeEach(() => { state.conflict = false; state.locked = false; state.evidenceCurrent = true; state.candidateCurrent = true; state.candidate.mockClear(); state.evidence.mockClear(); state.refresh.mockClear() })
  it.each([
    ['editable', false, true],
    ['locked', true, true],
    ['locked unavailable', true, false],
  ])('preserves exact context in both footer destinations with expanded inspection: %s', async (_name, locked, current) => {
    state.locked = locked
    state.evidenceCurrent = current
    state.candidateCurrent = current
    const user = userEvent.setup()
    const rendered = show()
    await user.click(screen.getByRole('button', { name: 'Advanced evidence inspection' }))
    await user.click(screen.getByRole('button', { name: '← Review', exact: true }))
    expect(screen.getByRole('tab', { name: 'Review', exact: true })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/app/intelligence?runtimeInstanceId=root&revisionId=rev-2&view=review')
    await user.click(screen.getByRole('tab', { name: 'Evidence readiness', exact: true }))
    await user.click(screen.getByRole('button', { name: 'Advanced evidence inspection' }))
    await user.click(screen.getByRole('button', { name: 'Readiness & publish →', exact: true }))
    expect(screen.getByRole('tab', { name: 'Readiness & publish', exact: true })).toHaveAttribute('aria-selected', 'true')
    const route = screen.getByLabelText('Current route').textContent
    expect(route).toBe('/app/intelligence?runtimeInstanceId=root&revisionId=rev-2&view=readiness-publish')
    expect(state.refresh).not.toHaveBeenCalled()
    rendered.unmount()
    show(route)
    expect(screen.getByRole('tab', { name: 'Readiness & publish', exact: true })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('link', { name: '← Back' })).toHaveAttribute('href', '/app/runtime/rev-2')
  })
  it('places the tab after Review and requests only the current scoped bounded reads', () => {
    show()
    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Overview', 'Context', 'Sources', 'Review', 'Evidence readiness', 'Readiness & publish', 'After lock', 'Coverage', 'Intelligence Graph', 'Intelligence Quality'])
    expect(screen.getByRole('tab', { name: 'Evidence readiness', exact: true })).toHaveAttribute('aria-selected', 'true')
    expect(state.candidate.mock.calls.at(-1)).toEqual([{ runtimeInstanceId: 'rev-2', customerId: 'customer', tenantId: 'tenant', sessionRevision: expect.any(Number) }, { skip: false }])
    const active = state.evidence.mock.calls.filter(([, options]) => !options.skip)
    expect(active).toHaveLength(1)
    expect(active[0][0]).toMatchObject({ runtimeInstanceId: 'rev-2', customerId: 'customer', tenantId: 'tenant', page: 1, pageSize: 1 })
  })
  it('maps keyboard navigation through Review, Evidence readiness and Readiness & publish', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('tab', { name: 'Review', exact: true }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Evidence readiness', exact: true })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('region', { name: 'Evidence readiness details' })).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Readiness & publish', exact: true })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Evidence readiness', exact: true })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('link', { name: '← Back' })).toHaveAttribute('href', '/app/runtime/rev-2')
  })
  it('fails closed for a conflicting selected tenant', () => {
    state.conflict = true
    show()
    expect(state.candidate.mock.calls.at(-1)[1].skip).toBe(true)
    expect(state.evidence.mock.calls.every(([, options]) => options.skip)).toBe(true)
    expect(screen.queryByRole('region', { name: 'Evidence readiness details' })).not.toBeInTheDocument()
  })
  it('ignores cached evidence and candidates without currentData', () => {
    state.evidenceCurrent = false
    state.candidateCurrent = false
    show()
    expect(screen.getByText('Evidence object total is unavailable.')).toBeInTheDocument()
    expect(screen.queryByText('1 returned candidates')).not.toBeInTheDocument()
  })
  it('refreshes exactly six active reads including source summary, inventory and recorded lock basis and stops candidates after leaving', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('button', { name: '↻ Refresh' }))
    expect(state.refresh).toHaveBeenCalledTimes(6)
    await user.click(screen.getByRole('button', { name: 'Inspect sources' }))
    expect(screen.getByRole('tab', { name: 'Sources', exact: true })).toHaveAttribute('aria-selected', 'true')
    expect(state.candidate.mock.calls.at(-1)[1].skip).toBe(true)
    expect(screen.getByRole('link', { name: '← Back' })).toHaveAttribute('href', '/app/runtime/rev-2')
  })
})
