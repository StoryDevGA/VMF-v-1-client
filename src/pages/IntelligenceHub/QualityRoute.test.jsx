import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IntelligenceHub from './IntelligenceHub.jsx'
import { clearTokens } from '../../utils/tokenStorage.js'
import { storedFindingFixture, storedFindingRow } from '../../test/storedFindingFixture.js'
import { createHash, webcrypto } from 'node:crypto'

const state = vi.hoisted(() => ({ current: true, wrongTenant: false, locked: true, authorityHash: 'sha256:' + 'a'.repeat(64), error: null, storedError: null, storedRows: null, busy: false, rendererBusy: false, rendererError: null, selectedCandidate: 'first', history: vi.fn(), qualityControl: {}, tenant: 'tenant-1', qualityView: vi.fn(), quality: vi.fn(), findings: vi.fn(), refresh: vi.fn(), execute: vi.fn(), update: vi.fn(), reviewEvidence: vi.fn(), reviewFinding: vi.fn() }))
vi.mock('./QualityView.jsx', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, default: props => { state.qualityView(props); return <actual.default {...props} /> } }
})
vi.mock('../../hooks/useTenantContext.js', () => ({ useTenantContext: () => ({ customerId: 'customer-1', tenantId: state.tenant }) }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetRuntimeStateFindingsQuery: (args, options) => {
    state.findings(args, options)
    const rows = state.storedRows || [storedFindingRow(state.selectedCandidate)]
    const filtered = rows.filter(row => !args.search || [row.findingId, row.domain, row.basis, ...row.evidence.flatMap(e => [e.extractedFact, e.sourceId, e.evidenceObjectId])].some(value => value.toLowerCase().includes(args.search.toLowerCase())))
      .sort((a, b) => a.findingId.localeCompare(b.findingId) * (args.sort === 'ID_DESC' ? -1 : 1))
    const unsupported = args.type !== 'CONTRADICTION'
    const data = { data: storedFindingFixture(args, unsupported ? { available: false, completeness: 'UNAVAILABLE', reason: 'CANONICAL_FINDING_TYPE_UNAVAILABLE', records: [], total: null, totalPages: null, populations: null }
      : { records: filtered.slice((args.page - 1) * 4, args.page * 4), total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / 4)), populations: { detected: rows.length, open: rows.length, recorded: 0, counting: 'OVERLAPPING_INSPECTION_POPULATIONS' } }) }
    return { data, currentData: state.current && !options.skip ? data : undefined, error: state.storedError, isFetching: state.busy, isUninitialized: options.skip, refetch: state.refresh }
  },
  useGetRuntimeStateSourceSummaryQuery: () => ({ refetch: state.refresh }),
  useGetRuntimeStateEvidenceInventoryQuery: () => ({ refetch: state.refresh }),
  useGetRuntimeStateDiscoveryHealthQuery: () => ({ refetch: state.refresh }),
  useGetRuntimeStateLockBasisQuery: () => ({ refetch: state.refresh }),
  useGetRuntimeStateContradictionHistoryQuery: (args, options) => {
    state.history(args, options)
    return { refetch: state.refresh, currentData: { data: {
      contractVersion: 'intelligence-contradiction-history.v1', source: 'runtime_state_v2.contradiction_history', currency: 'AS_READ', readAt: '2026-10-06T11:00:00.000Z',
      control: { id: args.runtimeInstanceId, runtimeInstanceKey: args.runtimeInstanceId, customerId: args.customerId, tenantId: args.tenantId, stateVersion: 'version-2' },
      readReceipt: { source: 'runtime_state_v2.contradiction_history', bounded: true, fullLegacyFrameworkStateFetched: false,
        maxTimeMS: 2000, requestTimeoutMS: 6000, workTimeoutMS: 5500, cleanupReserveMS: 500, maxSerializedPayloadBytes: 524288, serializedPayloadBytes: 1000 },
      history: { available: true, completeness: 'COMPLETE_STORED_HISTORY', reason: null, findingId: args.findingId, page: 1, pageSize: 10,
        total: 1, totalPages: 1, basis: 'RECORDED_DECISIONS', currentness: 'NOT_ASSESSED', auditReferences: 'UNAVAILABLE', recalculation: 'UNAVAILABLE', records: [{
          contractVersion: 'discovery-contradiction-review-v1', reviewId: '5b4d1f42-d7e2-4a3f-af5c-000000000004', runtimeInstanceId: args.runtimeInstanceId,
          contradictionId: args.findingId, evidencePairHash: 'sha256:' + 'a'.repeat(64), disposition: 'NOT_CONTRADICTORY', rationale: 'Historical locked decision rationale.',
          reviewEpoch: '', reviewedBy: '64b000000000000000000001', reviewedAt: '2026-10-06T10:00:00.000Z', reviewedStateVersion: 'original-version' }] },
    } } }
  },
  useGetAcquisitionRunsQuery: () => ({ refetch: state.refresh }),
  useGetAcquisitionRunQuery: () => ({}),
  useExecuteRuntimeActionMutation: () => [state.execute],
  useUpdateRuntimeDiscoveryInputsMutation: () => [state.update],
  useReviewRuntimeDiscoveryEvidenceMutation: () => [state.reviewEvidence],
  useReviewRuntimeDiscoveryContradictionMutation: () => [state.reviewFinding],
  useGetRuntimeRendererQuery: ({ runtimeInstanceId }) => ({ currentData: { data: {
    runtimeInstance: { id: runtimeInstanceId, stateVersion: 'version-2', updatedAt: '2026-10-06T10:00:00.000Z', customerId: 'customer-1', tenantId: state.wrongTenant ? 'other' : state.tenant, name: 'Selected workspace' },
    revision: { rootRuntimeInstanceKey: 'root', revisionNumber: 2, lineage: [{ relationship: 'CURRENT', runtimeInstanceId }] },
    lock: { locked: state.locked },
  } }, isFetching: state.rendererBusy, error: state.rendererError, refetch: state.refresh }),
  useGetReviewCompletionQuery: () => ({ isLoading: false, refetch: vi.fn() }),
  useCompleteReviewMutation: () => [vi.fn()],
  useGetRuntimeDiscoveryContradictionsQuery: (...args) => {
    state.quality(...args)
    const data = { data: { contractVersion: 'intelligence-review-actions.v1',
      runtimeUpdatedAt: '2026-10-06T10:00:00.000Z', canReview: true,
      control: { id: args[0].runtimeInstanceId, customerId: 'customer-1', tenantId: state.tenant, stateVersion: 'version-2', ...state.qualityControl },
      candidates: [{ contradictionId: state.selectedCandidate, evidencePairHash: state.authorityHash, reviewStatus: 'UNREVIEWED', domain: 'Market', basis: 'Recorded detection basis', evidenceObjectIds: ['e1', 'e2'],
        evidence: [{ evidenceObjectId: 'e1', sourceId: 'source-1', extractedFact: 'Current selected fact' }, { evidenceObjectId: 'e2', sourceId: 'source-2', extractedFact: 'Second selected fact' }] }] } }
    return { data, currentData: state.current ? data : undefined, error: state.error, isFetching: state.busy, refetch: state.refresh }
  },
  useGetRuntimeStateSourcesQuery: () => ({refetch: state.refresh}),
  useGetRuntimeStateEvidenceQuery: () => ({}),
  useGetRuntimeStateGraphManifestQuery: () => ({}),
  useGetRuntimeStateGraphProjectionQuery: () => ({}),
  useGetRuntimeStateGraphNeighbourhoodQuery: () => ({}),
  useGetRuntimeIntelligenceGraphCoverageQuery: () => ({}),
}))

function Harness() {
  const navigate = useNavigate()
  const location = useLocation()
  return <><button onClick={() => navigate(-1)}>Browser Back</button><button onClick={() => navigate('/quality?runtimeInstanceId=root&revisionId=revision-3')}>Other revision</button><output aria-label="Route">{location.pathname}{location.search}</output><Routes><Route path="/quality" element={<IntelligenceHub quality />} /><Route path="/app/intelligence/quality" element={<IntelligenceHub quality />} /><Route path="/app/intelligence" element={<IntelligenceHub />} /></Routes></>
}
const show = (entry = '/quality?runtimeInstanceId=root&revisionId=revision-2') => render(<MemoryRouter initialEntries={[entry]}><Harness /></MemoryRouter>)

describe('Quality selected-context integration', () => {
  it.each(['session', 'revision', 'read'])('blocks a retained exact Graph handoff callback after departed %s', async departure => {
    show()
    const prior = state.qualityView.mock.calls.at(-1)[0]
    if (departure === 'session') act(() => clearTokens())
    if (departure === 'revision') await userEvent.setup().click(screen.getByRole('button', { name: 'Other revision' }))
    if (departure === 'read') {
      state.qualityControl = { stateVersion: 'old' }
      await userEvent.setup().type(screen.getByRole('textbox', { name: 'Search quality findings' }), 'Market')
      await userEvent.click(screen.getByRole('button', { name: 'Search findings', exact: true }))
    }
    act(() => prior.onOpenGraph('first', 'e1'))
    expect(screen.getByLabelText('Route')).not.toHaveTextContent('graphEvidenceObjectId')
    expect(screen.getByRole('tab', { name: 'Intelligence Quality' })).toHaveAttribute('aria-selected', 'true')
  })
  it.each([['A', 'e1'], ['B', 'e2']])('binds auto-selected exact finding and evidence %s, clears old Graph state and preserves Quality/Review return', async (label, id) => {
    state.execute.mockClear(); state.update.mockClear(); state.reviewEvidence.mockClear(); state.reviewFinding.mockClear()
    show('/app/intelligence/quality?runtimeInstanceId=root&revisionId=revision-2&qualityInspectionContext=root%3Arevision-2%3Acustomer-1%3Atenant-1&qualityPopulation=Detected+candidates&qualityType=Contradiction&qualityQuery=Market&qualityReturnContext=root%3Arevision-2%3Acustomer-1%3Atenant-1&qualityReturnView=Review&graphInspectionContext=root%3Arevision-2%3Acustomer-1%3Atenant-1&graphMode=Impact&graphObjectId=stale-node&graphQuery=old-filter&graphAfterEdgeKey=old-cursor')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: `Inspect evidence ${label} in Graph →` }))
    const route = new URL(screen.getByLabelText('Route').textContent, 'http://localhost')
    expect(route.pathname).toBe('/app/intelligence')
    for (const [key, value] of Object.entries({ view: 'intelligence-graph', graphEvidenceObjectId: id, graphMode: 'Lineage', graphObjectView: 'object',
      findingId: 'first', findingContext: 'root:revision-2:customer-1:tenant-1', qualityQuery: 'Market', qualityReturnView: 'Review' })) expect(route.searchParams.get(key)).toBe(value)
    for (const key of ['graphObjectId', 'graphQuery', 'graphAfterEdgeKey']) expect(route.searchParams.has(key)).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Browser Back' }))
    expect(screen.getByLabelText('Route')).toHaveTextContent('findingId=first')
    expect(screen.getByRole('textbox', { name: 'Search quality findings' })).toHaveValue('Market')
    expect(screen.getByRole('combobox', { name: 'Finding population' })).toHaveValue('Detected candidates')
    expect(screen.getByText('“Current selected fact”')).toBeInTheDocument()
    expect(state.execute).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled()
    expect(state.reviewEvidence).not.toHaveBeenCalled(); expect(state.reviewFinding).not.toHaveBeenCalled()
  })
  it.each(['stateVersion', 'tenantId', 'id'])('disables Graph evidence handoff on mismatched current %s', field => {
    state.qualityControl = { [field]: 'other' }
    show()
    expect(screen.getByRole('button', { name: 'Inspect evidence A in Graph →' })).toBeDisabled()
  })
  it('opens canonical Sources with the exact pair, clears conflicting source filters and returns with Quality inspection', async () => {
    state.execute.mockClear(); state.update.mockClear(); state.reviewEvidence.mockClear(); state.reviewFinding.mockClear()
    show('/app/intelligence/quality?runtimeInstanceId=root&revisionId=revision-2&qualityInspectionContext=root%3Arevision-2%3Acustomer-1%3Atenant-1&qualityPopulation=Detected+candidates&qualityType=Contradiction&qualityQuery=Market&sourceQuery=exclude&sourceType=WEBSITE&sourcePage=9&sourceEvidencePage=8&qualityReturnContext=root%3Arevision-2%3Acustomer-1%3Atenant-1&qualityReturnView=Review')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Open evidence A in Sources →' }))
    const route = new URL(screen.getByLabelText('Route').textContent, 'http://localhost')
    expect(route.pathname).toBe('/app/intelligence')
    for (const [key, value] of Object.entries({ view: 'sources', sourceId: 'source-1', evidenceObjectId: 'e1', findingId: 'first', sourceContext: 'root:revision-2:customer-1:tenant-1', findingContext: 'root:revision-2:customer-1:tenant-1', qualityQuery: 'Market', qualityReturnView: 'Review', sourceEvidencePage: '1' })) expect(route.searchParams.get(key)).toBe(value)
    for (const key of ['sourceQuery', 'sourceType', 'sourcePage']) expect(route.searchParams.has(key)).toBe(false)
    expect(screen.getByRole('tab', { name: 'Sources', exact: true })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Sources' })).not.toHaveTextContent('Current selected fact')
    await user.click(screen.getByRole('button', { name: 'Browser Back' }))
    expect(screen.getByText('“Current selected fact”')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Search quality findings' })).toHaveValue('Market')
    expect(screen.getByRole('combobox', { name: 'Finding population' })).toHaveValue('Detected candidates')
    expect(screen.getByLabelText('Route')).toHaveTextContent('findingId=first')
    expect(state.execute).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled()
    expect(state.reviewEvidence).not.toHaveBeenCalled(); expect(state.reviewFinding).not.toHaveBeenCalled()
  })
  it('restores scoped filters from a link and preserves edits through Graph and Browser Back', async () => {
    show('/app/intelligence/quality?runtimeInstanceId=root&revisionId=revision-2&findingId=first&findingContext=root%3Arevision-2%3Acustomer-1%3Atenant-1&qualityInspectionContext=root%3Arevision-2%3Acustomer-1%3Atenant-1&qualityPopulation=Detected+candidates&qualityType=Contradiction&qualityQuery=Market')
    const user = userEvent.setup()
    expect(screen.getByRole('combobox', { name: 'Finding population' })).toHaveValue('Detected candidates')
    expect(screen.getByRole('textbox', { name: 'Search quality findings' })).toHaveValue('Market')
    await user.clear(screen.getByRole('textbox', { name: 'Search quality findings' }))
    await user.type(screen.getByRole('textbox', { name: 'Search quality findings' }), 'first')
    await user.click(screen.getByRole('button', { name: 'Search findings', exact: true }))
    expect(screen.getByLabelText('Route')).toHaveTextContent('qualityQuery=first')
    await user.click(screen.getByRole('button', { name: '← Intelligence Graph' }))
    await user.click(screen.getByRole('button', { name: 'Browser Back' }))
    expect(screen.getByRole('combobox', { name: 'Finding population' })).toHaveValue('Detected candidates')
    expect(screen.getByRole('textbox', { name: 'Search quality findings' })).toHaveValue('first')
    expect(screen.getByText('“Current selected fact”')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Finding type filter' })).getByRole('button', { name: 'Contradiction', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Route')).toHaveTextContent('findingId=first')
  })
  it('ignores another revision inspection receipt and recovers invalid same-scope filters', async () => {
    show('/app/intelligence/quality?runtimeInstanceId=root&revisionId=revision-2&qualityInspectionContext=root%3Arevision-3%3Acustomer-1%3Atenant-1&qualityPopulation=Recorded+dispositions&qualityQuery=hidden')
    expect(screen.getByRole('textbox', { name: 'Search quality findings' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Finding population' })).toHaveValue('Open decisions')
  })
  it('reports invalid matching-scope filters and replaces them with a valid inspection', async () => {
    show('/app/intelligence/quality?runtimeInstanceId=root&revisionId=revision-2&qualityInspectionContext=root%3Arevision-2%3Acustomer-1%3Atenant-1&qualityPopulation=invalid')
    expect(screen.getByText(/linked Quality filters are invalid/)).toBeInTheDocument()
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Finding population' }), 'Detected candidates')
    expect(screen.queryByText(/linked Quality filters are invalid/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Route')).toHaveTextContent('qualityPopulation=Detected+candidates')
  })
  it.each(['overview','coverage','intelligence-graph','evidence-readiness','quality'])('routes %s acquisition handoff to Context preserving exact scope and inspection state without mutation', async view => {
    state.execute.mockClear();state.update.mockClear()
    const prefix=view==='quality'?'/quality':'/app/intelligence'
    show(prefix+'?runtimeInstanceId=root&revisionId=revision-2&view='+view+'&customerId=customer-1&tenantId=tenant-1&sourceQuery=preserved-source&findingId=first&findingContext=root%3Arevision-2%3Acustomer-1%3Atenant-1&qualityReturnView=Review&qualityReturnContext=root%3Arevision-2%3Acustomer-1%3Atenant-1')
    const link=screen.getByRole('link',{name:/Add Evidence/i});const href=new URL(link.getAttribute('href'),'http://local.test')
    expect(href.pathname).toBe('/app/intelligence');expect(href.searchParams.get('view')).toBe('context')
    for(const [key,value] of Object.entries({runtimeInstanceId:'root',revisionId:'revision-2',customerId:'customer-1',tenantId:'tenant-1',sourceQuery:'preserved-source',findingId:'first',findingContext:'root:revision-2:customer-1:tenant-1',qualityReturnView:'Review'}))expect(href.searchParams.get(key)).toBe(value)
    await userEvent.click(link)
    expect(screen.getByRole('tab',{name:'Context',exact:true})).toHaveAttribute('aria-selected','true');expect(screen.getByRole('heading',{name:'What should this acquisition understand?'})).toBeVisible()
    expect(screen.getByRole('button',{name:'Build evidence'})).toBeDisabled();expect(state.execute).not.toHaveBeenCalled();expect(state.update).not.toHaveBeenCalled()
  })

  it('hands an exact Review finding to Quality and returns with the prior Review search', async () => {
    const user = userEvent.setup()
    show('/app/intelligence?runtimeInstanceId=root&revisionId=revision-2&view=review&reviewContext=root%3Arevision-2%3Acustomer-1%3Atenant-1&reviewQuery=preserve-me&qualityInspectionContext=root%3Arevision-2%3Acustomer-1%3Atenant-1&qualityPopulation=Recorded+dispositions&qualityQuery=hidden')
    await user.click(screen.getByRole('button', { name: /first.*Resolve in Quality/ }))
    expect(screen.getByLabelText('Route')).toHaveTextContent('/app/intelligence/quality?')
    expect(screen.getByLabelText('Route')).toHaveTextContent('findingId=first')
    expect(screen.getByLabelText('Route')).not.toHaveTextContent('qualityQuery=hidden')
    expect(screen.getByText('“Current selected fact”')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '← Review', exact: true }))
    expect(screen.getByRole('tab', { name: 'Review', exact: true })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('textbox', { name: 'Search all review evidence' })).toHaveValue('preserve-me')
  })
  it('allows explicit selection to replace an unavailable exact finding and records its link', async () => {
    const user = userEvent.setup()
    show('/app/intelligence/quality?runtimeInstanceId=root&revisionId=revision-2&findingContext=root%3Arevision-2%3Acustomer-1%3Atenant-1&findingId=absent')
    expect(screen.getByText('The exact linked finding is unavailable in this read. No other finding is substituted.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /first · Contradiction/ }))
    expect(screen.getByLabelText('Route')).toHaveTextContent('findingId=first')
    expect(screen.getByText('“Current selected fact”')).toBeInTheDocument()
  })
  beforeEach(() => { vi.stubGlobal('crypto', webcrypto); state.locked = true; state.authorityHash = 'sha256:' + 'a'.repeat(64); state.reviewFinding.mockReset(); state.current = true; state.wrongTenant = false; state.error = null; state.storedError = null; state.storedRows = null; state.findings.mockClear(); state.busy = false; state.rendererBusy = false; state.rendererError = null; state.selectedCandidate = 'first'; state.history.mockClear(); state.qualityControl = {}; state.tenant = 'tenant-1'; state.quality.mockClear(); state.refresh.mockReset().mockResolvedValue({ data: {} }) })
  it.each(['pair', 'membership', 'version'])('disables a stored finding decision with mismatched mutation %s authority', async mismatch => {
    state.locked = false
    if (mismatch === 'pair') state.authorityHash = 'sha256:' + 'b'.repeat(64)
    if (mismatch === 'membership') state.storedRows = [storedFindingRow('other')]
    if (mismatch === 'version') state.qualityControl = { stateVersion: 'other' }
    show(); expect(screen.getByRole('button', { name: 'Not contradictory' })).toBeDisabled()
    const props = state.qualityView.mock.calls.at(-1)[0]
    await act(async () => { expect(await props.actions.decideFinding(props.storedRead.candidates[0], 'NOT_CONTRADICTORY', 'A recorded human rationale.')).toBe(false) })
    expect(state.reviewFinding).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Open evidence A in Sources →' })).toBeEnabled()
  })
  it.each(['query', 'read', 'session', 'selection'])('blocks retained decisions after %s departure', async departure => {
    state.locked = false; const view = show(), user = userEvent.setup(), old = state.qualityView.mock.calls.at(-1)[0], item = old.storedRead.candidates[0]
    if (departure === 'session') act(() => clearTokens())
    if (departure === 'query') { await user.type(screen.getByRole('textbox', { name: 'Search quality findings' }), 'absent'); await user.click(screen.getByRole('button', { name: 'Search findings', exact: true })) }
    if (departure === 'read') { state.storedError = { status: 503 }; view.rerender(<MemoryRouter><Harness /></MemoryRouter>) }
    if (departure === 'selection') { state.selectedCandidate = 'second'; view.rerender(<MemoryRouter><Harness /></MemoryRouter>) }
    await act(async () => { expect(await old.actions.decideFinding(item, 'NOT_CONTRADICTORY', 'A recorded human rationale.')).toBe(false) })
    expect(state.reviewFinding).not.toHaveBeenCalled()
  })
  it('refreshes the same owned initialized read after its own mutation enters fetching', async () => {
    state.locked = false; const view = show()
    state.reviewFinding.mockImplementation(command => ({ unwrap: async () => {
      state.busy = true; view.rerender(<MemoryRouter><Harness /></MemoryRouter>)
      const body = command.body, actor = '64b000000000000000000001'
      const requestPayloadHash = createHash('sha256').update(JSON.stringify({ contractVersion: 'discovery-contradiction-review-v1', actorUserId: actor,
        runtimeInstanceId: 'revision-2', contradictionId: command.contradictionId, expectedUpdatedAt: body.expectedUpdatedAt,
        expectedEvidencePairHash: body.expectedEvidencePairHash, disposition: body.disposition, rationale: body.rationale, confirm: true })).digest('hex')
      return { review: { contractVersion: 'discovery-contradiction-review-v1', reviewId: '5b4d1f42-d7e2-4a3f-af5c-000000000004', runtimeInstanceId: 'revision-2', contradictionId: command.contradictionId,
        reviewedBy: actor, reviewedAt: '2026-10-06T10:01:00.000Z', reviewedStateVersion: 'version-2', requestPayloadHash,
        requestKey: body.requestKey, requestExpectedUpdatedAt: body.expectedUpdatedAt, evidencePairHash: body.expectedEvidencePairHash, disposition: body.disposition, rationale: body.rationale } }
    } }))
    const current = state.qualityView.mock.calls.at(-1)[0]
    await act(async () => { expect(await current.actions.decideFinding(current.storedRead.candidates[0], 'NOT_CONTRADICTORY', 'A recorded human rationale.')).toBe(true) })
    expect(state.refresh).toHaveBeenCalledTimes(4)
    expect(screen.getByRole('status', { name: 'Quality decision status' })).toHaveTextContent('Current reads refreshed')
  })
  it('searches exact evidence beyond page one, resets pages, preserves ID ordering and focuses results', async () => {
    state.storedRows = Array.from({ length: 6 }, (_, i) => storedFindingRow(`finding-${i}`, { evidence: storedFindingRow().evidence.map(e => ({ ...e, extractedFact: i === 5 ? 'Unique off-page evidence' : 'Other statement' })) }))
    show(); const user = userEvent.setup()
    expect(screen.getByText('4 shown of 6 matching stored detections · Priority unavailable')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next findings' }))
    expect(screen.getByRole('region', { name: 'Finding results' })).toHaveFocus()
    expect(screen.getByLabelText('Route')).toHaveTextContent('qualityPage=2')
    expect(screen.getByRole('button', { name: 'Next findings' })).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: 'Search quality findings' }), 'Unique off-page evidence')
    expect(state.findings.mock.calls.at(-1)[0].search).toBe('')
    await user.click(screen.getByRole('button', { name: 'Search findings', exact: true }))
    expect(state.findings.mock.calls.at(-1)[0]).toMatchObject({ search: 'Unique off-page evidence', page: 1, pageSize: 4 })
    expect(screen.getByRole('button', { name: /finding-5 · Contradiction/ })).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Finding order' }), 'ID_DESC')
    expect(state.findings.mock.calls.at(-1)[0]).toMatchObject({ sort: 'ID_DESC', page: 1 })
  })
  it.each(['selection', 'read', 'query', 'session', 'scope', 'view'])('blocks a retained Source/selection/page/filter/refresh callback after %s departure', async departure => {
    const rendered = show(), user = userEvent.setup(), previous = state.qualityView.mock.calls.at(-1)[0]
    if (departure === 'selection') { state.selectedCandidate = 'second'; rendered.rerender(<MemoryRouter><Harness /></MemoryRouter>) }
    if (departure === 'read') { state.storedError = { status: 503 }; rendered.rerender(<MemoryRouter><Harness /></MemoryRouter>) }
    if (departure === 'query') { await user.type(screen.getByRole('textbox', { name: 'Search quality findings' }), 'absent'); await user.click(screen.getByRole('button', { name: 'Search findings', exact: true })) }
    if (departure === 'session') act(() => clearTokens())
    if (departure === 'scope') await user.click(screen.getByRole('button', { name: 'Other revision' }))
    if (departure === 'view') act(() => previous.onSelectView('Overview'))
    const route = screen.getByLabelText('Route').textContent
    act(() => { previous.onOpenSource('first', 'source-1', 'e1'); previous.onSelectFinding('first'); previous.onInspectionChange({ page: 2 }); previous.onInspectionChange({ search: 'captured' }) })
    expect(screen.getByLabelText('Route').textContent).toBe(route)
  })
  it('keeps a failed stored read unavailable despite a valid legacy mutation read and recovers unsupported type', async () => {
    state.storedError = { status: 503 }; const view = show()
    expect(screen.queryByText('“Current selected fact”')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Stored findings could not be verified')
    state.storedError = null; view.rerender(<MemoryRouter><Harness /></MemoryRouter>)
    await userEvent.click(within(screen.getByRole('group', { name: 'Finding type filter' })).getByRole('button', { name: 'Weak confidence', exact: true }))
    expect(screen.getByText(/Stored finding inspection unavailable: Canonical Finding Type Unavailable/)).toBeInTheDocument()
    expect(screen.queryByText('“Current selected fact”')).not.toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('group', { name: 'Finding type filter' })).getByRole('button', { name: 'Contradiction', exact: true }))
    expect(screen.getByText('“Current selected fact”')).toBeInTheDocument()
  })
  it('permits locked recorded-history inspection independently of disabled resolution', async () => {
    show(); expect(state.history).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Not contradictory' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'View recorded decisions' }))
    expect(screen.getByText('Historical locked decision rationale.')).toBeInTheDocument()
    expect(state.history.mock.calls.at(-1)[0]).toMatchObject({ runtimeInstanceId: 'revision-2', findingId: 'first', customerId: 'customer-1', tenantId: 'tenant-1' })
  })
  it.each(['finding', 'renderer-loading', 'renderer-error', 'session', 'revision', 'route'])('closes recorded-history subscription on %s departure', async departure => {
    const view = show(), user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'View recorded decisions' }))
    expect(screen.getByRole('dialog', { name: 'Recorded contradiction decisions' })).toBeInTheDocument()
    if (departure === 'session') act(() => clearTokens())
    else if (departure === 'revision') await user.click(screen.getByRole('button', { name: 'Other revision' }))
    else if (departure === 'route') act(() => state.qualityView.mock.calls.at(-1)[0].onSelectView('Overview'))
    else {
      if (departure === 'finding') state.selectedCandidate = 'second'
      if (departure === 'renderer-loading') state.rendererBusy = true
      if (departure === 'renderer-error') state.rendererError = { status: 503 }
      view.rerender(<MemoryRouter initialEntries={['/quality?runtimeInstanceId=root&revisionId=revision-2']}><Harness /></MemoryRouter>)
    }
    expect(screen.queryByRole('dialog', { name: 'Recorded contradiction decisions' })).not.toBeInTheDocument()
  })
  it('keys the bounded read by revision and selected customer/tenant', () => {
    show()
    expect(state.quality.mock.calls.at(-1)).toEqual([{ runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', sessionRevision: expect.any(Number) }, { skip: false }])
    expect(screen.getByRole('tab', { name: 'Intelligence Quality' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('This revision is locked. Governed resolution is unavailable here.')).toBeInTheDocument()
  })
  it('blocks detail reads and rendering when renderer scope conflicts', () => {
    state.wrongTenant = true
    show()
    expect(state.quality.mock.calls.at(-1)[1].skip).toBe(true)
    expect(screen.getByText('The returned revision is outside the selected customer or tenant.')).toBeInTheDocument()
    expect(screen.queryByText('“Current selected fact”')).not.toBeInTheDocument()
  })
  it('ignores retained data when currentData is missing', () => {
    state.current = false
    show()
    expect(screen.queryByText('“Current selected fact”')).not.toBeInTheDocument()
    expect(screen.getByText('Stored findings could not be verified for this scope. Refresh to retry.')).toBeInTheDocument()
  })
  it('allows read-only finding inspection when mutation authority is denied', () => {
    state.error = { status: 403 }
    show()
    expect(screen.getByText('“Current selected fact”')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not contradictory' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Open evidence A in Sources →' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Inspect evidence A in Graph →' })).toBeDisabled()
  })
  it('resets search, selection and open explanations on revision changes', async () => {
    const user = userEvent.setup()
    show()
    await user.type(screen.getByRole('textbox', { name: 'Search quality findings' }), 'Market')
    await user.click(screen.getByRole('button', { name: 'Recommendation availability' }))
    await user.click(screen.getByRole('button', { name: 'Other revision' }))
    expect(screen.getByRole('textbox', { name: 'Search quality findings' })).toHaveValue('')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(state.quality.mock.calls.at(-1)[0].runtimeInstanceId).toBe('revision-3')
  })
  it('preserves context when returning to Graph or Overview', async () => {
    show()
    await userEvent.setup().click(screen.getByRole('button', { name: '← Intelligence Graph' }))
    expect(screen.getByLabelText('Route')).toHaveTextContent('/app/intelligence?runtimeInstanceId=root&revisionId=revision-2&view=intelligence-graph')
  })
  it('refreshes renderer, candidates and shared Discovery health together', async () => {
    show()
    await userEvent.setup().click(screen.getByRole('button', { name: '↻ Refresh' }))
    expect(state.refresh).toHaveBeenCalledTimes(4)
  })
})
