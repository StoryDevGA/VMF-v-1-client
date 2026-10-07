import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IntelligenceHub from './IntelligenceHub.jsx'
import { evidenceInventoryFixture } from '../../test/evidenceInventoryFixture.js'
import { coverageManifestFixture } from '../../test/coverageManifestFixture.js'
import { graphNeighbourhoodFixture, neighbourhoodHash } from '../../test/graphNeighbourhoodFixture.js'
import { clearTokens } from '../../utils/tokenStorage.js'
import { assuranceReviewFixture, assuranceReceiptFixture } from '../../test/assuranceReviewFixture.js'
import { discoveryHealthFixture } from '../../test/discoveryHealthFixture.js'
import { lockBasisFixture } from '../../test/lockBasisFixture.js'

let lockFixture, lockBusy, lockFailure, lockMissing

const renderer = {
  runtimeInstance: {
    id: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1',
    name: 'Acme Workspace', stateVersion: 'version-2', updatedAt: '2026-09-29T10:00:00.000Z',
  },
  revision: {
    revisionNumber: 2, rootRuntimeInstanceKey: 'workspace-1',
    lineage: [{ runtimeInstanceId: 'revision-2', relationship: 'CURRENT' }],
  },
  lock: { locked: false, state: 'UNLOCKED' },
  discovery: {
    sourceRegistrySummary: { count: 2 },
    evidenceObjectSummary: { evidenceObjectCount: 3, pendingReviewCount: 1, acceptedEvidenceCount: 2 },
    discoveryHealth: { coveragePercent: 40, signalCandidates: [{ signalId: 'one', domain: 'Company', signalStrength: 'MODERATE', evidenceObjectCount: 2 }] },
    acquisitionEffectiveness: { metrics: { sourceCount: 4, coveragePercent: 100, contradictionCount: 2 } },
  },
}

const calls = { execute: vi.fn(), update: vi.fn(), evidence: vi.fn(), manifest: vi.fn(), graph: vi.fn(), coverage: vi.fn(), refresh: vi.fn(), coverageView: vi.fn(), completion: vi.fn(), health: vi.fn(), headerRefresh: vi.fn(), reportRefresh: vi.fn() }
vi.mock('./CoverageView.jsx', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, default: props => { calls.coverageView(props); return <actual.default {...props} /> } }
})
vi.mock('../../components/Button', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, Button: props => {
    if (props.children === '↻ Refresh') calls.headerRefresh(props)
    if (props.children === 'Refresh report') calls.reportRefresh(props)
    return <actual.Button {...props} />
  } }
})
let readinessFields = {}
let contextInputs
let cachedContextRevision = false
let staleOverviewDetails = false
let initialOverviewPending = false
let rendererRefreshing = false
let pendingRendererContext = false
let emptyFilteredReview = false
let missingSummaryEvidence = false
let conflictingStatusCounts = false
let additionalUnclassifiedEvidence = false
let emptyEvidenceTotal = false
let invalidSummaryTotal = undefined
let retainedSummaryError = false
let retainedStatusError = false
let sourcePageFixture
let sourcePageError = false
let sourcePageMissing = false
let sourceCurrentPending = false
let coverageHealthFixture
let summaryEvidencePending = false
let graphReadError = false
let graphEvidenceProvenance = {}
let graphManifestState = 'CURRENT'
let neighbourhoodFixture
let neighbourhoodFailure = false
let neighbourhoodBusy = false
let manifestRefreshPromise
let sourceSummaryOverrides = {}
let sourceSummaryBusy = false
let sourceSummaryFailure = false
let inventoryFixture
let inventoryBusy = false
let inventoryFailure = false
let completionOverrides = {}
let completionBusy = false
let completionFailure = false
let healthFixture
let healthBusy = false
let healthFailure = false
let healthCurrentMissing = false
vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: () => ({ customerId: 'customer-1', tenantId: 'tenant-1' }),
}))
vi.mock('../../store/api/runtimeInstanceApi.js', () => {
const queries = {
  useGetRuntimeStateFindingsQuery: (args, options) => ({ isUninitialized: options.skip }),
  useGetRuntimeStateLockBasisQuery: (args, options) => ({ data: options.skip ? undefined : { data: lockFixture || lockBasisFixture({ locked: false }) }, isFetching: lockBusy, isUninitialized: options.skip, error: lockFailure ? { status: 503 } : undefined }),
  useGetRuntimeStateDiscoveryHealthQuery: (args, options) => ({ data: options.skip ? undefined : { data: healthFixture || discoveryHealthFixture() },
    isFetching: healthBusy, isUninitialized: options.skip, error: healthFailure ? { status: 503 } : undefined }),
  useGetRuntimeStateGraphNeighbourhoodQuery: (args, options) => ({ data: options.skip ? undefined : { data: typeof neighbourhoodFixture === 'function' ? neighbourhoodFixture(args) : neighbourhoodFixture },
    error: neighbourhoodFailure ? { status: 503 } : undefined, isFetching: neighbourhoodBusy, isUninitialized: options.skip }),
  useGetRuntimeStateEvidenceInventoryQuery: () => ({ data: inventoryFixture ? { data: inventoryFixture } : undefined,
    isFetching: inventoryBusy, error: inventoryFailure ? { status: 503 } : undefined }),
  useGetRuntimeStateSourceSummaryQuery: () => ({ data: { data: {
    contractVersion: 'intelligence-source-summary.v1', scope: { customerId: 'customer-1', tenantId: 'tenant-1', runtimeInstanceId: 'revision-2' },
    stateVersion: 'version-2', currency: 'AS_READ', readAt: '2026-10-06T10:00:00.000Z', countLimit: 1000,
    basis: 'DOCUMENT_SOURCE_CURRENT_CONTENT_SUCCESS_RECEIPT', readReceipt: { bounded: true, fullLegacyFrameworkStateFetched: false, maxSerializedPayloadBytes: 524288, maxTimeMS: 2000, requestTimeoutMS: 6000 },
    sourceCompleteness: 'COMPLETE', uniqueSourceCount: 2, documentSourceCount: 1, sourceCountsByType: { UPLOADED_DOCUMENT: 1, WEBSITE: 1 },
    processingCompleteness: 'COMPLETE', documentsProcessed: 1, knownProcessedCount: 1, unknownCount: 0, staleCount: 0,
    ...sourceSummaryOverrides,
  } }, error: sourceSummaryFailure ? {} : undefined, isFetching: sourceSummaryBusy }),
  useGetRuntimeStateSourcesQuery: (args) => {
    const fixture = typeof sourcePageFixture === 'function' ? sourcePageFixture(args) : sourcePageFixture
    const rows = (fixture?.sourceRegistry || []).filter(source => !args.sourceId || source.sourceId === args.sourceId)
      .map(source => ({ ...source, evidenceObjectCount: 17 }))
    return { data: { data: { control: { ...renderer.runtimeInstance, id: args.runtimeInstanceId }, sourceRegistry: rows, total: rows.length, totalPages: 1, pageSize: args.pageSize, completeness: 'COMPLETE' } },
      ...(args.sourceId && !rows.length ? { error: { data: { error: { message: 'The requested source is unavailable in this revision.' } } } } : {}), isLoading: false }
  },
  useGetReviewCompletionQuery: () => ({ data: { data: {
    contractVersion: 'intelligence-review-completion.v1',
    scope: { customerId: 'customer-1', tenantId: 'tenant-1', runtimeInstanceKey: 'revision-2', rootRuntimeInstanceKey: 'workspace-1' },
    stateVersion: 'version-2', currency: 'AS_READ', readAt: '2026-10-06T10:00:00.000Z',
    population: { completeness: 'COMPLETE', policy: 'revision-evidence-contradiction-decisions.v1',
      hash: 'a'.repeat(64), pendingEvidence: 1, pendingFindings: 2, decisionCount: 7, complete: false },
    ...completionOverrides,
  } }, isFetching: completionBusy, error: completionFailure ? { status: 503 } : undefined }),
  useGetRuntimeDiscoveryContradictionsQuery: () => ({ data: { data: { candidates: [] } }, isLoading: false }),
  useGetRuntimeRendererQuery: () => ({ data: { data: emptyEvidenceTotal ? {
    ...renderer,
    discovery: { ...renderer.discovery, evidenceObjectSummary: { ...renderer.discovery.evidenceObjectSummary, evidenceObjectCount: 0 } },
  } : { ...renderer, ...readinessFields, discovery: { ...renderer.discovery, discoveryHealth: coverageHealthFixture ?? renderer.discovery.discoveryHealth, inputComplete: true, ...(contextInputs !== undefined ? { inputValues: contextInputs } : {}) } } }, isLoading: false, refetch: vi.fn() }),
  useGetRuntimeStateEvidenceQuery: (...args) => {
    calls.evidence(...args)
    if (summaryEvidencePending && args[0].pageSize === 1 && !args[0].reviewStatus) return { isLoading: true }
    if (args[0].pageSize === 1 && !args[0].reviewStatus && invalidSummaryTotal !== undefined) return { data: { data: { evidenceObjects: [], sourceRegistry: [], total: invalidSummaryTotal === 'capped' ? 3 : invalidSummaryTotal, totalCapped: invalidSummaryTotal === 'capped' } }, isLoading: false }
    if (args[0].pageSize === 1 && (args[0].reviewStatus ? retainedStatusError : retainedSummaryError)) return { data: { data: { evidenceObjects: [], sourceRegistry: [], total: 99 } }, error: { status: 503 }, isLoading: false }
    if (args[0].pageSize === 25 && sourcePageError) return { data: sourcePageFixture ? { data: sourcePageFixture } : undefined, error: { status: 503 }, isLoading: false }
    if (args[0].pageSize === 25 && sourcePageMissing) return { isLoading: false }
    if (args[0].pageSize === 25 && sourcePageFixture) return { data: { data: typeof sourcePageFixture === 'function' ? sourcePageFixture(args[0]) : sourcePageFixture }, isLoading: false }
    if (missingSummaryEvidence && args[0].pageSize === 1) return {
      error: { data: { error: { code: 'RUNTIME_STATE_V2_EVIDENCE_MISSING' } } }, isLoading: false,
    }
    if (emptyFilteredReview && args[0].reviewStatus) return {
      error: { data: { error: { code: 'RUNTIME_STATE_V2_EVIDENCE_MISSING' } } }, isLoading: false,
    }
    if (args[0].reviewStatus === 'REJECTED' && emptyEvidenceTotal) return {
      data: { data: { evidenceObjects: [], sourceRegistry: [], total: 0 } }, isLoading: false,
    }
    if (args[0].reviewStatus === 'REJECTED') return {
      error: { data: { error: { code: 'RUNTIME_STATE_V2_EVIDENCE_MISSING' } } }, isLoading: false,
    }
    if (args[0].reviewStatus === 'ACCEPTED' || args[0].reviewStatus === 'PENDING') return {
      data: { data: { evidenceObjects: emptyEvidenceTotal ? [] : [{ evidenceObjectId: 'count-receipt', reviewStatus: args[0].reviewStatus }], sourceRegistry: [], total: emptyEvidenceTotal ? 0 : args[0].reviewStatus === 'ACCEPTED' ? 2 : args[0].reviewStatus === 'PENDING' && conflictingStatusCounts ? 2 : 1 } }, isLoading: false,
    }
    return { data: { data: { evidenceObjects: [], sourceRegistry: [], total: emptyEvidenceTotal ? 0 : additionalUnclassifiedEvidence ? 4 : 3 } }, isLoading: false }
  },
  useGetRuntimeStateGraphManifestQuery: (...args) => { calls.manifest(...args); const fixture = coverageManifestFixture(); fixture.manifest.status = graphManifestState;
    if (neighbourhoodFixture) { fixture.manifest.graphHash = neighbourhoodHash; fixture.manifest.counts = { nodeCount: 100, edgeCount: 150 } }
    fixture.control.id = args[0].runtimeInstanceId; fixture.control.runtimeInstanceKey = args[0].runtimeInstanceId;
    return { data: { data: fixture }, ...(graphReadError ? { error: { status: 503 } } : {}) } },
  useGetRuntimeStateGraphProjectionQuery: (...args) => { calls.graph(...args); return { data: { data: { graph: {
    graphHash: neighbourhoodFixture ? neighbourhoodHash : 'hash-1', graphVersion: '2.2',
    nodes: [
      { nodeId: 'source-1', nodeType: 'SOURCE', entityDisplayName: 'Source', label: 'private raw source text' },
      { nodeId: 'truth-1', nodeType: 'SECTION_TRUTH', entityDisplayName: 'Section Truth' },
      { nodeId: 'output-1', nodeType: 'OUTPUT_REFERENCE', entityDisplayName: 'Output Reference' },
      { nodeId: 'evidence-1', nodeType: 'EVIDENCE', entityDisplayName: 'Evidence', label: 'private raw evidence text' },
      { nodeId: 'evidence-2', nodeType: 'EVIDENCE', entityDisplayName: 'Evidence', label: 'another private raw evidence text', ...graphEvidenceProvenance },
    ],
    edges: [
      { edgeId: 'edge-1', fromNodeId: 'source-1', toNodeId: 'truth-1', edgeType: 'INTELLIGENCE_SUPPORTS_SECTION_TRUTH', relationshipDisplayName: 'Supports', customerVisible: true },
      { edgeId: 'edge-output', fromNodeId: 'truth-1', toNodeId: 'output-1', edgeType: 'CANONICAL_TRUTH_REFERENCED_BY_OUTPUT', customerVisible: true },
      { edgeId: 'edge-2', fromNodeId: 'evidence-1', toNodeId: 'evidence-2', edgeType: 'EVIDENCE_CONTRADICTS_EVIDENCE', relationshipDisplayName: 'Contradicts', customerVisible: true },
    ],
    coverage: { missingDomains: ['ECONOMICS'] },
  } } }, isLoading: false } },
  useGetRuntimeIntelligenceGraphCoverageQuery: (...args) => {
    calls.coverage(...args)
    return { data: { data: { available: true, coverage: {
      coverageModel: 'EVIDENCE_DOMAIN_COVERAGE', coveragePercent: 70, coveredDomainCount: 7, totalDomainCount: 10,
      missingDomains: ['Problems', 'Consequences', 'Stakeholders'],
      domains: [
        { domain: 'Company', connectedEvidenceCount: 2, acceptedEvidenceCount: 2, pendingEvidenceCount: 0, rejectedEvidenceCount: 0, state: 'STRONG' },
        { domain: 'Products', connectedEvidenceCount: 12, acceptedEvidenceCount: 12, pendingEvidenceCount: 0, rejectedEvidenceCount: 0, state: 'STRONG' },
        { domain: 'Services', connectedEvidenceCount: 1, acceptedEvidenceCount: 1, pendingEvidenceCount: 0, rejectedEvidenceCount: 0, state: 'ADEQUATE' },
        { domain: 'Market', connectedEvidenceCount: 2, acceptedEvidenceCount: 2, pendingEvidenceCount: 0, rejectedEvidenceCount: 0, state: 'STRONG' },
        { domain: 'Problems', connectedEvidenceCount: 0, acceptedEvidenceCount: 0, pendingEvidenceCount: 0, rejectedEvidenceCount: 0, state: 'MISSING' },
        { domain: 'Consequences', connectedEvidenceCount: 0, acceptedEvidenceCount: 0, pendingEvidenceCount: 0, rejectedEvidenceCount: 0, state: 'MISSING' },
        { domain: 'Proof', connectedEvidenceCount: 2, acceptedEvidenceCount: 2, pendingEvidenceCount: 0, rejectedEvidenceCount: 0, state: 'STRONG' },
        { domain: 'Economics', connectedEvidenceCount: 2, acceptedEvidenceCount: 2, pendingEvidenceCount: 0, rejectedEvidenceCount: 0, state: 'STRONG' },
        { domain: 'Differentiation', connectedEvidenceCount: 1, acceptedEvidenceCount: 1, pendingEvidenceCount: 0, rejectedEvidenceCount: 0, state: 'ADEQUATE' },
        { domain: 'Stakeholders', connectedEvidenceCount: 0, acceptedEvidenceCount: 0, pendingEvidenceCount: 0, rejectedEvidenceCount: 0, state: 'MISSING' },
      ],
    } } }, isLoading: false }
  },
  }
  return { useExecuteRuntimeActionMutation: () => [calls.execute],
  useGetAcquisitionRunsQuery: () => ({ refetch: vi.fn() }),
  useGetAcquisitionRunQuery: () => ({}),
  useCompleteReviewMutation: () => [vi.fn()],
  useUpdateRuntimeDiscoveryInputsMutation: () => [calls.update],
  useReviewRuntimeDiscoveryEvidenceMutation: () => [vi.fn()], useReviewRuntimeDiscoveryContradictionMutation: () => [vi.fn()], ...Object.fromEntries(Object.entries(queries).map(([name, query]) => [name, (...args) => {
    if (name === 'useGetReviewCompletionQuery') calls.completion(...args)
    if (name === 'useGetRuntimeStateDiscoveryHealthQuery') calls.health(...args)
    const result = query(...args)
    if (name === 'useGetRuntimeStateEvidenceQuery' && result.data?.data) {
      result.data.data = { ...result.data.data, control: { ...renderer.runtimeInstance, id: args[0].runtimeInstanceId } }
      if (args[0].sourceId || args[0].evidenceObjectId) result.data.data.evidenceObjects = (result.data.data.evidenceObjects || [])
        .filter(item => (!args[0].sourceId || item.sourceId === args[0].sourceId) && (!args[0].evidenceObjectId || item.evidenceObjectId === args[0].evidenceObjectId))
    }
    const detailPending = (staleOverviewDetails || initialOverviewPending)
      && ['useGetRuntimeStateEvidenceQuery', 'useGetRuntimeStateGraphManifestQuery'].includes(name)
    const currentData = name === 'useGetRuntimeRendererQuery' && cachedContextRevision && args[0].runtimeInstanceId === 'revision-3'
      ? { data: { ...result.data.data, runtimeInstance: { ...renderer.runtimeInstance, id: 'revision-3' }, revision: {
        ...renderer.revision, revisionNumber: 3, lineage: [{ runtimeInstanceId: 'revision-3', relationship: 'CURRENT' }],
      } } }
      : name === 'useGetRuntimeRendererQuery' && pendingRendererContext ? undefined
      : name === 'useGetRuntimeRendererQuery' && staleOverviewDetails
      ? { data: { ...renderer, runtimeInstance: { ...renderer.runtimeInstance, id: 'revision-3' }, revision: {
        ...renderer.revision, revisionNumber: 3, lineage: [{ runtimeInstanceId: 'revision-3', relationship: 'CURRENT' }],
      } } }
      : detailPending || (name === 'useGetRuntimeStateEvidenceQuery' && args[0].pageSize === 25 && sourceCurrentPending)
        || (name === 'useGetRuntimeStateDiscoveryHealthQuery' && healthCurrentMissing)
        || (name === 'useGetRuntimeStateLockBasisQuery' && lockMissing) ? undefined : result.data
    return {
      ...result,
      data: initialOverviewPending && detailPending ? undefined : result.data,
      currentData,
      isFetching: result.isFetching || detailPending || (name === 'useGetRuntimeStateEvidenceQuery' && ((args[0].pageSize === 25 && sourceCurrentPending) || (args[0].pageSize === 1 && !args[0].reviewStatus && summaryEvidencePending))) || (name === 'useGetRuntimeRendererQuery' && (rendererRefreshing || pendingRendererContext)),
      refetch: () => { calls.refresh(name, args[0]); return name === 'useGetRuntimeStateGraphManifestQuery' && manifestRefreshPromise ? manifestRefreshPromise : Promise.resolve({ data: result.data, error: result.error }) },
    }
  }])) }
})

const show = (search = '?runtimeInstanceId=workspace-1&revisionId=revision-2') => render(
  <MemoryRouter initialEntries={[`/app/intelligence${search}`]}>
    <Routes><Route path="/app/intelligence" element={<IntelligenceHub />} /></Routes>
  </MemoryRouter>,
)

function LocationProof() { const location = useLocation(); return <output data-testid="route-proof">{location.search}</output> }
function GraphHistoryProof() {
  const navigate = useNavigate()
  return <><LocationProof /><button onClick={() => navigate(-1)}>History back</button><button onClick={() => navigate(1)}>History forward</button></>
}

function RevisionSwitchReview({ view }) {
  const navigate = useNavigate()
  return <>
    <IntelligenceHub />
    <button onClick={() => navigate(`/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-3${view ? `&view=${view}` : ''}`)}>Switch revision</button>
    <button onClick={() => navigate(`/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2${view ? `&view=${view}` : ''}`)}>Return to original revision</button>
  </>
}

describe('Intelligence Hub', () => {
  it('rejects retained Readiness Refresh while current completion is fetching', () => {
    const search = '?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish'
    const { rerender } = show(search)
    const retained = calls.headerRefresh.mock.calls.at(-1)[0].onClick
    completionBusy = true
    rerender(<MemoryRouter initialEntries={[`/app/intelligence${search}`]}><Routes><Route path="/app/intelligence" element={<IntelligenceHub />} /></Routes></MemoryRouter>)
    expect(screen.getByRole('button', { name: '↻ Refresh' })).toBeDisabled()
    calls.refresh.mockClear(); act(() => retained()); expect(calls.refresh).not.toHaveBeenCalled()
  })
  it.each(['evidence-readiness', 'readiness-publish', 'after-lock'])('inspects current recorded lock metadata on %s and hides retained failed reads', async view => {
    lockFixture = lockBasisFixture()
    const search = '?runtimeInstanceId=workspace-1&revisionId=revision-2&view=' + view
    const { rerender } = show(search)
    if (view === 'evidence-readiness') await userEvent.click(screen.getByRole('button', { name: 'Advanced evidence inspection' }))
    const panelName = { 'evidence-readiness': 'Evidence readiness', 'readiness-publish': 'Readiness & publish', 'after-lock': 'After lock' }[view]
    const panel = () => within(screen.getByRole('tabpanel', { name: panelName }))
    expect(panel().getByRole('region', { name: 'Recorded lock basis' })).toHaveTextContent('lock-receipt-2')
    expect(panel().getByRole('region', { name: 'Recorded lock basis' })).toHaveTextContent('have not been independently verified')
    lockFailure = true
    rerender(<MemoryRouter initialEntries={[`/app/intelligence${search}`]}><Routes><Route path="/app/intelligence" element={<IntelligenceHub />} /></Routes></MemoryRouter>)
    expect(panel().getByRole('region', { name: 'Recorded lock basis' })).not.toHaveTextContent('lock-receipt-2')
    expect(panel().getByRole('region', { name: 'Recorded lock basis' })).toHaveTextContent('Refresh this view')
    if (view === 'after-lock') expect(panel().queryByText('Published and locked')).not.toBeInTheDocument()
  })
  it.each(['after-lock', 'evidence-readiness'])('rejects retained Refresh from %s after navigation and session change', async view => {
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=' + view)
    const retained = calls.headerRefresh.mock.calls.at(-1)[0].onClick
    await user.click(screen.getByRole('tab', { name: 'Overview' }))
    calls.refresh.mockClear(); act(() => retained()); expect(calls.refresh).not.toHaveBeenCalled()
    act(() => clearTokens()); act(() => retained()); expect(calls.refresh).not.toHaveBeenCalled()
  })
  beforeEach(() => {
    lockFixture = undefined; lockBusy = false; lockFailure = false; lockMissing = false
    neighbourhoodFixture = undefined; neighbourhoodFailure = false; neighbourhoodBusy = false
    manifestRefreshPromise = undefined
    sourceSummaryOverrides = {}; sourceSummaryBusy = false; sourceSummaryFailure = false
    inventoryFixture = undefined; inventoryBusy = false; inventoryFailure = false
    completionOverrides = {}; completionBusy = false; completionFailure = false
    readinessFields = {}
    contextInputs = undefined
    retainedSummaryError = false
    invalidSummaryTotal = undefined
    retainedStatusError = false
    cachedContextRevision = false
    sourcePageFixture = undefined
    sourcePageError = false
    sourcePageMissing = false
    sourceCurrentPending = false
    coverageHealthFixture = undefined
    healthFixture = undefined; healthBusy = false; healthFailure = false; healthCurrentMissing = false
    summaryEvidencePending = false
    graphReadError = false
    graphEvidenceProvenance = {}
    graphManifestState = 'CURRENT'
    emptyFilteredReview = false
    missingSummaryEvidence = false
    conflictingStatusCounts = false
    additionalUnclassifiedEvidence = false
    emptyEvidenceTotal = false
    staleOverviewDetails = false
    initialOverviewPending = false
    rendererRefreshing = false
    pendingRendererContext = false
    Object.values(calls).forEach((spy) => spy.mockClear())
  })
  it.each(['coverage', 'readiness-publish'])('uses the shared scoped Discovery health read on %s and refreshes it without mutation', async view => {
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=' + view)
    expect(screen.getByRole('region', { name: 'Recorded Discovery Health assessment' })).toHaveTextContent('Recorded Partially Ready')
    expect(calls.health).toHaveBeenLastCalledWith(expect.objectContaining({ runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', sessionRevision: expect.any(Number) }), { skip: false })
    await userEvent.setup().click(screen.getByRole('button', { name: '↻ Refresh' }))
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateDiscoveryHealthQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2' }))
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled()
  })
  it('uses the actual Quality route for the shared scoped Discovery assessment and refresh', async () => {
    render(<MemoryRouter initialEntries={['/app/intelligence/quality?runtimeInstanceId=workspace-1&revisionId=revision-2']}><IntelligenceHub quality /></MemoryRouter>)
    expect(screen.getByRole('region', { name: 'Recorded Discovery Health assessment' })).toHaveTextContent('Recorded Partially Ready')
    expect(calls.health).toHaveBeenLastCalledWith(expect.objectContaining({ runtimeInstanceId: 'revision-2', sessionRevision: expect.any(Number) }), { skip: false })
    await userEvent.setup().click(screen.getByRole('button', { name: '↻ Refresh' }))
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateDiscoveryHealthQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2' }))
  })
  it.each(['overview', 'context', 'sources', 'review', 'evidence-readiness', 'intelligence-graph', 'after-lock'])('does not subscribe Discovery health on inactive %s view', view => {
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=' + view)
    expect(calls.health).toHaveBeenLastCalledWith(expect.anything(), { skip: true })
  })
  it.each(['failed', 'loading', 'wrong-scope', 'wrong-version', 'missing-currentData'])('hides retained Discovery assessment when %s and never falls back to legacy Ready', condition => {
    coverageHealthFixture = { readiness: { state: 'READY' } }
    if (condition === 'failed') healthFailure = true
    if (condition === 'loading') healthBusy = true
    if (condition === 'wrong-scope') { healthFixture = discoveryHealthFixture(); healthFixture.control.tenantId = 'other' }
    if (condition === 'wrong-version') { healthFixture = discoveryHealthFixture(); healthFixture.control.stateVersion = 'old' }
    if (condition === 'missing-currentData') healthCurrentMissing = true
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=coverage')
    const region = screen.getByRole('region', { name: 'Recorded Discovery Health assessment' })
    expect(region).not.toHaveTextContent('Recorded Ready'); expect(region).not.toHaveTextContent('Recorded Partially Ready')
    expect(region).not.toHaveTextContent('Evidence Review Pending')
  })
  it('replaces an open report assessment with unavailable on failed refresh and includes its exact subscriber in report recovery', async () => {
    const mounted = show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Preview assurance report →' }))
    const report = screen.getByRole('region', { name: 'Assurance report content' })
    expect(within(report).getByRole('region', { name: 'Recorded Discovery Health assessment' })).toHaveTextContent('Recorded Partially Ready')
    healthFailure = true
    mounted.rerender(<MemoryRouter><Routes><Route path='/app/intelligence' element={<IntelligenceHub />} /></Routes></MemoryRouter>)
    expect(within(report).getByRole('region', { name: 'Recorded Discovery Health assessment' })).not.toHaveTextContent('Recorded Partially Ready')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh report' }))
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateDiscoveryHealthQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2' }))
  })
  it.each(['session', 'revision', 'view', 'loading'])('rejects a retained Coverage refresh after %s departure', async departure => {
    const mounted = render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=coverage']}><RevisionSwitchReview view='coverage' /></MemoryRouter>)
    const retained = calls.headerRefresh.mock.calls.at(-1)[0].onClick
    if (departure === 'session') act(() => clearTokens())
    if (departure === 'revision') { cachedContextRevision = true; await userEvent.setup().click(screen.getByRole('button', { name: 'Switch revision' })) }
    if (departure === 'view') await userEvent.setup().click(screen.getByRole('tab', { name: 'Overview' }))
    if (departure === 'loading') { healthBusy = true; mounted.rerender(<MemoryRouter><RevisionSwitchReview view='coverage' /></MemoryRouter>) }
    calls.refresh.mockClear()
    act(() => retained())
    expect(calls.refresh).not.toHaveBeenCalled()
  })
  it('blocks retained report Refresh while Discovery assessment is loading and recovers a failed assessment', async () => {
    const mounted = show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Preview assurance report →' }))
    const retained = calls.reportRefresh.mock.calls.at(-1)[0].onClick
    healthBusy = true
    mounted.rerender(<MemoryRouter><Routes><Route path='/app/intelligence' element={<IntelligenceHub />} /></Routes></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Refresh report' })).toBeDisabled()
    calls.refresh.mockClear(); act(() => retained()); expect(calls.refresh).not.toHaveBeenCalled()
    healthBusy = false; healthFailure = true
    mounted.rerender(<MemoryRouter><Routes><Route path='/app/intelligence' element={<IntelligenceHub />} /></Routes></MemoryRouter>)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh report' }))
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateDiscoveryHealthQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2' }))
  })
  it('keeps requested canonical evidence and finding context through current outside-flat Graph, Sources and return', async () => {
    neighbourhoodFixture = args => graphNeighbourhoodFixture({ nodeId: 'actual:outside', evidenceObjectId: args.evidenceObjectId, mode: args.mode })
    const params = new URLSearchParams({ runtimeInstanceId: 'workspace-1', revisionId: 'revision-2', view: 'intelligence-graph',
      graphInspectionContext: 'workspace-1:revision-2:customer-1:tenant-1', graphMode: 'Lineage', graphEvidenceObjectId: 'canonical:one', graphObjectView: 'object',
      findingContext: 'workspace-1:revision-2:customer-1:tenant-1', findingId: 'finding:exact', qualityQuery: 'retain', qualityPopulation: 'Recorded dispositions' })
    render(<MemoryRouter initialEntries={['/app/intelligence?' + params]}><IntelligenceHub /><LocationProof /></MemoryRouter>)
    const user = userEvent.setup(), region = screen.getByRole('region', { name: 'Selected object neighbourhood' })
    expect(within(region).getByText('actual:outside')).toBeInTheDocument()
    expect(screen.getByTestId('route-proof')).toHaveTextContent('graphEvidenceObjectId=canonical%3Aone')
    expect(screen.getByTestId('route-proof')).not.toHaveTextContent('graphObjectId=')
    expect(screen.getByRole('link', { name: 'Return to selected Quality finding →' })).toHaveAttribute('href', expect.stringContaining('findingId=finding%3Aexact'))
    await user.click(screen.getByRole('button', { name: 'Open selected object’s exact source and evidence →' }))
    expect(screen.getByTestId('route-proof')).toHaveTextContent('evidenceObjectId=canonical%3Aone')
    await user.click(screen.getByRole('link', { name: 'Return to graph inspection →' }))
    expect(screen.getByRole('region', { name: 'Selected object neighbourhood' })).toHaveTextContent('actual:outside')
    expect(screen.getByTestId('route-proof')).toHaveTextContent('qualityQuery=retain')
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled()
  })
  it.each(['missing', 'failed', 'loading', 'mismatch'])('never substitutes a flat object when canonical evidence read is %s', condition => {
    neighbourhoodFixture = args => graphNeighbourhoodFixture({ nodeId: 'actual:outside', evidenceObjectId: condition === 'mismatch' ? 'other' : args.evidenceObjectId, mode: args.mode })
    if (condition === 'missing') neighbourhoodFixture = () => undefined
    if (condition === 'failed') neighbourhoodFailure = true
    if (condition === 'loading') neighbourhoodBusy = true
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=intelligence-graph&graphInspectionContext=workspace-1%3Arevision-2%3Acustomer-1%3Atenant-1&graphMode=Lineage&graphEvidenceObjectId=canonical%3Aone&graphObjectView=object')
    expect(screen.getByRole('region', { name: 'Selected graph object' })).toHaveTextContent('Requested canonical evidence: canonical:one')
    expect(screen.getByRole('region', { name: 'Selected object neighbourhood' })).not.toHaveTextContent('actual:outside')
  })
  it('keeps locked Graph inspectable and returns from Context to its exact individual cursor without mutation', async () => {
    readinessFields = { lock: { locked: true, state: 'LOCKED', lockedAt: '2026-10-06T10:00:00.000Z' } }
    const params = new URLSearchParams({ runtimeInstanceId: 'workspace-1', revisionId: 'revision-2', view: 'intelligence-graph',
      graphInspectionContext: 'workspace-1:revision-2:customer-1:tenant-1', graphMode: 'Impact', graphQuery: 'Evidence', graphObjectId: 'evidence-2', graphObjectView: 'object', graphAfterEdgeKey: 'edge:a:047' })
    render(<MemoryRouter initialEntries={['/app/intelligence?' + params]}><IntelligenceHub /><LocationProof /></MemoryRouter>)
    expect(screen.getByText('Locked revision inspection. Frozen accepted evidence and truth remain unchanged.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Selected graph object' })).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: 'Inspect acquisition and revision routes in Context →' }))
    expect(screen.getByTestId('route-proof')).toHaveTextContent('graphContextReturn=inspection')
    expect(screen.getByText(/This revision is locked. Inspect its sources/)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Return to graph inspection →' }))
    expect(screen.getByTestId('route-proof')).toHaveTextContent('graphAfterEdgeKey=edge%3Aa%3A047')
    expect(screen.getByTestId('route-proof')).toHaveTextContent('graphObjectId=evidence-2')
    expect(screen.getByTestId('route-proof')).not.toHaveTextContent('graphContextReturn')
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled()
  })
  it.each(['selection', 'tab', 'unchanged'])('guards deferred Graph refresh after %s', async departure => {
    neighbourhoodFixture = args => graphNeighbourhoodFixture({ nodeId: args.nodeId, mode: args.mode })
    const params = new URLSearchParams({ runtimeInstanceId: 'workspace-1', revisionId: 'revision-2', view: 'intelligence-graph',
      graphInspectionContext: 'workspace-1:revision-2:customer-1:tenant-1', graphMode: 'Impact', graphObjectId: 'source:outside', graphObjectView: 'object' })
    let settle
    manifestRefreshPromise = new Promise(resolve => { settle = resolve })
    show('?' + params)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '↻ Refresh' }))
    if (departure === 'selection') await user.click(screen.getByRole('button', { name: /Connected evidence 000/ }))
    if (departure === 'tab') await user.click(screen.getByRole('tab', { name: 'Context', exact: true }))
    const manifest = coverageManifestFixture(); manifest.manifest.graphHash = neighbourhoodHash
    await act(async () => settle({ data: { data: manifest } }))
    const followups = calls.refresh.mock.calls.filter(([name]) => name === 'useGetRuntimeStateGraphNeighbourhoodQuery')
    expect(followups).toHaveLength(departure === 'unchanged' ? 1 : 0)
  })
  it('loads an outside-flat selected object, pages its connections and preserves exact Source return', async () => {
    neighbourhoodFixture = args => graphNeighbourhoodFixture({ nodeId: args.nodeId, mode: args.mode, afterEdgeKey: args.afterEdgeKey, size: args.afterEdgeKey ? 2 : 48 })
    const params = new URLSearchParams({ runtimeInstanceId: 'workspace-1', revisionId: 'revision-2', view: 'intelligence-graph',
      graphInspectionContext: 'workspace-1:revision-2:customer-1:tenant-1', graphMode: 'Impact', graphObjectId: 'source:outside', graphObjectView: 'object' })
    render(<MemoryRouter initialEntries={['/app/intelligence?' + params]}><IntelligenceHub /><LocationProof /></MemoryRouter>)
    const user = userEvent.setup()
    expect(within(screen.getByRole('region', { name: 'Selected object neighbourhood' })).getByText('source:outside')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next relationship page' }))
    expect(screen.getByTestId('route-proof')).toHaveTextContent('graphAfterEdgeKey=edge%3Aa%3A047')
    expect(screen.getByText(/This continuation page is exhausted/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Open selected object’s exact source/ }))
    expect(screen.getByTestId('route-proof')).toHaveTextContent('sourceId=recorded-source')
    await user.click(screen.getByRole('link', { name: 'Return to graph inspection →' }))
    expect(screen.getByTestId('route-proof')).toHaveTextContent('graphAfterEdgeKey=edge%3Aa%3A047')
    await user.click(screen.getByRole('button', { name: 'First relationship page' }))
    expect(screen.getByTestId('route-proof')).not.toHaveTextContent('graphAfterEdgeKey')
    await user.click(screen.getByRole('button', { name: /Connected evidence 000/ }))
    expect(screen.getByTestId('route-proof')).toHaveTextContent('graphObjectId=evidence%3A000')
  })
  it.each(['loading', 'failed', 'wrong scope'])('withholds retained neighbourhood success on %s', condition => {
    neighbourhoodFixture = graphNeighbourhoodFixture()
    if (condition === 'loading') neighbourhoodBusy = true
    if (condition === 'failed') neighbourhoodFailure = true
    if (condition === 'wrong scope') neighbourhoodFixture.control.tenantId = 'other'
    const params = new URLSearchParams({ runtimeInstanceId: 'workspace-1', revisionId: 'revision-2', view: 'intelligence-graph',
      graphInspectionContext: 'workspace-1:revision-2:customer-1:tenant-1', graphMode: 'Impact', graphObjectId: 'source:outside', graphObjectView: 'object' })
    show('?' + params)
    expect(screen.queryByRole('button', { name: /Connected evidence 000/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Open selected object’s exact source/ })).not.toBeInTheDocument()
  })
  it('restores scoped Graph mode/search/member identity and carries it into Help and Quality links', () => {
    const params = new URLSearchParams({ runtimeInstanceId: 'workspace-1', revisionId: 'revision-2', view: 'intelligence-graph',
      graphInspectionContext: 'workspace-1:revision-2:customer-1:tenant-1', graphMode: 'Journey', graphQuery: 'Evidence', graphObjectId: 'evidence-2' })
    render(<MemoryRouter initialEntries={['/app/intelligence?' + params]}><IntelligenceHub /><LocationProof /></MemoryRouter>)
    expect(screen.getByRole('textbox', { name: 'Search this graph view' })).toHaveValue('Evidence')
    expect(within(screen.getByRole('region', { name: 'Selected graph object' })).getByRole('heading', { name: 'Evidence' })).toBeInTheDocument()
    const help = screen.getByRole('link', { name: /Help/ })
    expect(help.getAttribute('href')).toContain('graphObjectId=evidence-2')
    expect(screen.getByRole('link', { name: /Continue to Intelligence Quality/ }).getAttribute('href')).toContain('graphObjectId=evidence-2')
    expect(screen.getByTestId('route-proof').textContent).toContain('graphQuery=Evidence')
  })
  it('opens recorded exact Graph evidence in Sources, clears old Source filters and returns even if the source is unavailable', async () => {
    graphEvidenceProvenance = { customerVisible: true, label: 'Evidence', sourceId: 'canonical-source', evidenceObjectId: 'canonical-evidence' }
    const params = new URLSearchParams({ runtimeInstanceId: 'workspace-1', revisionId: 'revision-2', view: 'intelligence-graph',
      graphInspectionContext: 'workspace-1:revision-2:customer-1:tenant-1', graphMode: 'Journey', graphQuery: 'Evidence', graphObjectId: 'evidence-2', graphObjectView: 'object',
      sourceQuery: 'old', sourceType: 'WEBSITE', sourcePage: '3', evidencePage: '2', sourceEvidencePage: '4' })
    render(<MemoryRouter initialEntries={['/app/intelligence?' + params]}><IntelligenceHub /><LocationProof /></MemoryRouter>)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Open exact source and evidence →' }))
    const next = new URLSearchParams(screen.getByTestId('route-proof').textContent)
    expect(next.get('sourceId')).toBe('canonical-source'); expect(next.get('evidenceObjectId')).toBe('canonical-evidence')
    expect(next.get('view')).toBe('sources'); expect(next.get('graphObjectId')).toBe('evidence-2')
    expect(next.get('graphObjectView')).toBe('object')
    for (const key of ['sourceQuery', 'sourceType', 'sourcePage', 'evidencePage', 'sourceEvidencePage']) expect(next.has(key)).toBe(false)
    expect(screen.getAllByText(/The requested source is unavailable/).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('link', { name: 'Return to graph inspection →' }))
    expect(screen.getByRole('textbox', { name: 'Search this graph view' })).toHaveValue('Evidence')
    expect(within(screen.getByRole('region', { name: 'Selected graph object' })).getByText('evidence-2')).toBeInTheDocument()
    expect(screen.getByTestId('route-proof')).not.toHaveTextContent('sourceReturn=graph')
  })
  it('records default stable identity with replace and restores Graph mode through browser history', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=intelligence-graph']}><IntelligenceHub /><GraphHistoryProof /></MemoryRouter>)
    expect(screen.getByTestId('route-proof').textContent).toContain('graphObjectId=source-1')
    await user.click(screen.getByRole('button', { name: 'Impact', exact: true }))
    expect(screen.getByRole('button', { name: 'Impact', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('route-proof').textContent).toContain('graphMode=Impact')
    await user.click(screen.getByRole('button', { name: 'History back' }))
    expect(screen.getByRole('button', { name: 'Journey', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'History forward' }))
    expect(screen.getByRole('button', { name: 'Impact', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })
  it('does not write Graph state from a hidden panel or apply another revision inspection', () => {
    render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=overview&graphInspectionContext=workspace-1:other:customer-1:tenant-1&graphMode=Impact&graphObjectId=output-1']}><IntelligenceHub /><LocationProof /></MemoryRouter>)
    expect(screen.getByTestId('route-proof').textContent).toContain('graphObjectId=output-1')
    expect(screen.getByTestId('route-proof').textContent).not.toContain('graphObjectId=source-1')
    expect(screen.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute('aria-selected', 'true')
  })

  it('links the current Sources scope and exact selection to canonical Help', () => {
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources&sourceContext=workspace-1%3Arevision-2%3Acustomer-1%3Atenant-1&sourceId=s1&evidenceObjectId=e1&sourceQuery=off-page&sourcePage=2&returnView=graph')
    const url = new URL(screen.getByRole('link', { name: 'Help ↗' }).getAttribute('href'), 'http://localhost')
    expect(url.pathname).toBe('/help')
    expect(url.searchParams.get('article')).toBe('intelligence-hub-sources')
    expect(url.searchParams.get('sourceId')).toBe('s1')
    expect(url.searchParams.get('evidenceObjectId')).toBe('e1')
    expect(url.searchParams.get('sourceQuery')).toBe('off-page')
    expect(url.searchParams.get('sourcePage')).toBe('2')
    expect(url.searchParams.get('revisionId')).toBe('revision-2')
    expect(url.searchParams.get('helpReturnView')).toBe('sources')
    expect(url.searchParams.get('returnView')).toBe('graph')
    expect(calls.execute).not.toHaveBeenCalled()
    expect(calls.update).not.toHaveBeenCalled()
  })

  it.each([undefined, null])('shows omitted/null brief values as unavailable, not empty (%s)', inputs => {
    contextInputs = inputs
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context')
    expect(screen.getByText('Brief details unavailable for this revision.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Company name')).not.toBeInTheDocument()
    expect(screen.queryByText('0/4 brief fields')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Build evidence' })).toBeDisabled()
  })
  it('renders brief independently of missing evidence and fails closed without action authority', () => {
    contextInputs = { companyName: 'Acme', marketRegion: 'UK', targetOffer: 'Cloud', companyWebsite: 'https://acme.example/', notes: 'Focus on proof' }
    missingSummaryEvidence = true
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context')
    expect(screen.getByLabelText('Company name')).toHaveValue('Acme')
    expect(screen.getByLabelText('Optional notes')).toHaveValue('Focus on proof')
    expect(screen.getByLabelText('Website URL 1')).toHaveValue('https://acme.example/')
    expect(screen.getByLabelText('Company name')).toBeDisabled()
    expect(screen.getByText('4/4 brief fields')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start over with evidence' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open existing acquisition workbench/ })).toHaveAttribute('href', '/app/runtime/revision-2/workbench')
  })
  it('shows unique brief URLs without treating them as connected sources', () => {
    contextInputs = { companyWebsite: 'https://acme.example/', websiteSources: ['https://acme.example/', 'https://docs.acme.example/'] }
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context')
    expect(screen.getByLabelText('Website URL 1')).toHaveValue('https://acme.example/')
    expect(screen.getByLabelText('Website URL 2')).toHaveValue('https://docs.acme.example/')
    expect(screen.queryByLabelText('Website URL 3')).not.toBeInTheDocument()
  })
  it('replaces cached brief on exact revision change', async () => {
    cachedContextRevision = true; contextInputs = { companyWebsite: 'https://previous.example/' }
    render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context']}><Routes><Route path="/app/intelligence" element={<RevisionSwitchReview view="context" />} /></Routes></MemoryRouter>)
    expect(screen.getByLabelText('Website URL 1')).toHaveValue('https://previous.example/')
    contextInputs = { companyWebsite: 'https://current.example/' }
    await userEvent.click(screen.getByRole('button', { name: 'Switch revision' }))
    expect(screen.getByLabelText('Website URL 1')).toHaveValue('https://current.example/')
  })
  it('distinguishes an exposed empty brief and preserves navigation context', async () => {
    contextInputs = {}
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context')
    expect(screen.getByText('0/4 brief fields')).toBeInTheDocument()
    expect(screen.getByLabelText('Optional notes')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'View current sources' }))
    expect(screen.getByRole('tab', { name: 'Sources' })).toHaveAttribute('aria-selected', 'true')
  })
  it('refreshes the scoped acquisition metadata and bounded Context counts', async () => {
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context')
    await userEvent.click(screen.getByRole('button', { name: '↻ Refresh' }))
    expect(calls.refresh).toHaveBeenCalledTimes(6)
    const reads = calls.refresh.mock.calls.map(([name, args]) => ({ name, ...args }))
    expect(reads.filter(read => read.pageSize === 1)).toHaveLength(3)
    expect(reads.some(read => read.reviewStatus === 'REJECTED')).toBe(false)
    expect(calls.coverage.mock.calls.every(([, options]) => options.skip)).toBe(true)
  })
  it('keeps brief visible while counts load', () => {
    initialOverviewPending = true; contextInputs = { companyName: 'Acme' }
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context')
    expect(screen.getByLabelText('Company name')).toHaveValue('Acme')
    expect(screen.getByText('Loading Context evidence counts…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '↻ Refresh' })).toBeDisabled()
  })

  const sourceFixture = () => ({
    sourceRegistry: [
      { sourceId: 'web', sourceType: 'WEBSITE', label: 'Customer website', sourceRef: 'https://acme.example/', url: 'https://acme.example/', acquisitionStatus: 'CAPTURED', lineageRef: 'input.companyWebsite', stateVersion: 'version-2' },
      { sourceId: 'doc', sourceType: 'UPLOADED_DOCUMENT', label: 'Report.pdf', sourceRef: 'Report.pdf', fileName: 'Report.pdf', acquisitionStatus: 'ACQUIRED', lineageRef: 'batch-doc-1', stateVersion: 'version-2' },
      { sourceId: 'note', sourceType: 'DISCOVERY_NOTES', label: 'Company name', acquisitionStatus: 'CAPTURED' },
    ],
    evidenceObjects: [
      { evidenceObjectId: 'one', sourceId: 'web', extractedFact: 'Website discusses observability.', reviewStatus: 'ACCEPTED', acceptanceState: 'ACCEPTED', lineageRef: 'web:first' },
      { evidenceObjectId: 'two', sourceId: 'doc', title: 'Market research', extractedFact: 'Specialised infrastructure demand.', reviewStatus: 'PENDING', acceptanceState: 'CANDIDATE', lineageRef: 'doc:second' },
    ], total: 2, page: 1, pageSize: 25, totalPages: 2,
  })


  it.each(['capped', null, 'unknown', -1])('does not classify filtered missing as empty using an invalid base total (%s)', (total) => {
    invalidSummaryTotal = total
    emptyFilteredReview = true
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    expect(screen.getByText('Evidence candidates could not be loaded. Refresh to retry.')).toBeInTheDocument()
    expect(screen.queryByText('No candidates match this review filter in the selected revision.')).not.toBeInTheDocument()
  })
  it('does not convert a filtered missing read to empty success using a failed retained base read', () => {
    retainedSummaryError = true
    emptyFilteredReview = true
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    expect(screen.getByText('Evidence candidates could not be loaded. Refresh to retry.')).toBeInTheDocument()
    expect(screen.queryByText('No candidates match this review filter in the selected revision.')).not.toBeInTheDocument()
  })
  it('does not present retained status counts as current after failed reads', () => {
    retainedStatusError = true
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    const summary = within(screen.getByLabelText('Evidence review summary'))
    expect(summary.queryByText('99')).not.toBeInTheDocument()
    expect(summary.getAllByText('Unavailable')).toHaveLength(2)
  })
  it('makes the Review summary a named keyboard-focusable region', async () => {
    sourcePageFixture = sourceFixture()
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    const summary = screen.getByRole('region', { name: 'Evidence review summary' })
    expect(summary).toHaveAttribute('tabindex', '0')
    await user.click(screen.getByRole('textbox', { name: 'Search all review evidence' }))
    await user.tab()
    expect(screen.getByRole('button', { name: 'Search review' })).toHaveFocus()
    await user.tab()
    expect(summary).toHaveFocus()
    expect(within(summary).getByText('Evidence awaiting review')).toBeInTheDocument()
  })
  it('submits complete scoped Review search and retains it across filters', async () => {
    sourcePageFixture = sourceFixture()
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    const queue = within(screen.getByRole('region', { name: 'Evidence candidate queue' }))
    const detail = within(screen.getByRole('region', { name: 'Selected evidence candidate' }))
    const search = screen.getByRole('textbox', { name: 'Search all review evidence' })
    await user.type(search, 'market')
    await user.click(screen.getByRole('button', { name: 'Search review' }))
    expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'market', page: 1 }), expect.anything())
    expect(queue.getByText('Specialised infrastructure demand.')).toBeInTheDocument()
    expect(detail.getByRole('heading')).toHaveTextContent('Website discusses observability.')
    await user.click(screen.getByRole('button', { name: 'All', exact: true }))
    expect(search).toHaveValue('market')
    await user.click(screen.getByRole('button', { name: 'Clear evidence search' }))
    expect(search).toHaveFocus()
    expect(screen.getByRole('button', { name: '✓ Accept evidence' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '× Reject' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Record Review Completion' })).toBeDisabled()
  })
  it.each([0, null])('renders actual confidence without fabricating missing scores (%s)', (score) => {
    sourcePageFixture = sourceFixture()
    sourcePageFixture.evidenceObjects[0].confidence = score === null ? null : { score, level: 'LOW' }
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    const detail = within(screen.getByRole('region', { name: 'Selected evidence candidate' }))
    expect(detail.getByText('Confidence').nextSibling).toHaveTextContent(score === null ? 'Unavailable' : 'Low · 0%')
    expect(detail.getByText('Coverage area').nextSibling).toHaveTextContent('Unavailable')
  })
  it('opens the selected source preserving exact revision and evidence identity', async () => {
    sourcePageFixture = sourceFixture()
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    await user.click(screen.getByRole('button', { name: 'Next page', exact: true }))
    await user.click(within(screen.getByRole('region', { name: 'Evidence candidate queue' })).getByRole('button', { name: /Market research/ }))
    await user.click(screen.getByRole('button', { name: 'Open source →' }))
    expect(screen.getByRole('tab', { name: 'Sources' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Report.pdf' })).toBeInTheDocument()
    expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ runtimeInstanceId: 'revision-2', sourceId: 'doc', evidenceObjectId: 'two', page: 1, pageSize: 25 }), expect.anything())
  })
  it('does not substitute another source when the linked source is absent', async () => {
    sourcePageFixture = (args) => ({ ...sourceFixture(), sourceRegistry: args.reviewStatus ? sourceFixture().sourceRegistry : [sourceFixture().sourceRegistry[1]] })
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    await user.click(screen.getByRole('button', { name: 'Open source →' }))
    expect(screen.getByText(/The requested source is unavailable in this revision/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Report.pdf' })).not.toBeInTheDocument()
  })
  it.each(['error', 'missing', 'loading'])('hides retained candidates during a Review %s read', (state) => {
    sourcePageFixture = sourceFixture()
    sourcePageError = state === 'error'
    sourcePageMissing = state === 'missing'
    sourceCurrentPending = state === 'loading'
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    const queue = within(screen.getByRole('region', { name: 'Evidence candidate queue' }))
    expect(queue.queryByText('Website discusses observability.')).not.toBeInTheDocument()
    expect(queue.getByText(state === 'error' ? 'Evidence candidates could not be loaded. Refresh to retry.' : state === 'missing' ? 'Evidence candidates are unavailable for this revision.' : 'Loading evidence candidates…')).toBeInTheDocument()
  })
  it('resets Review search and filters when switching to a cached revision', async () => {
    cachedContextRevision = true
    sourcePageFixture = sourceFixture()
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review']}>
      <Routes><Route path="/app/intelligence" element={<RevisionSwitchReview view="review" />} /></Routes>
    </MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Accepted', exact: true }))
    await user.type(screen.getByRole('textbox', { name: 'Search all review evidence' }), 'market')
    await user.click(screen.getByRole('button', { name: 'Switch revision' }))
    expect(screen.getByRole('textbox', { name: 'Search all review evidence' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Needs review', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ runtimeInstanceId: 'revision-3', reviewStatus: 'PENDING', page: 1 }), expect.anything())
  })

  // Sources scoped query, paging, stale/error, exact provenance and history cases now live
  it('lets an exact Review item override prior search and restores that search on Return', async () => {
    sourcePageFixture = sourceFixture()
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review&reviewContext=workspace-1%3Arevision-2%3Acustomer-1%3Atenant-1&reviewQuery=unrelated&reviewSourceId=doc&reviewEvidenceObjectId=two')
    expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ sourceId: 'doc', evidenceObjectId: 'two', search: '' }), expect.anything())
    expect(within(screen.getByRole('region', { name: 'Selected evidence candidate' })).getByRole('heading')).toHaveTextContent('Specialised infrastructure demand.')
    await user.click(screen.getByRole('button', { name: 'Return to Review search' }))
    expect(screen.getByRole('textbox', { name: 'Search all review evidence' })).toHaveFocus()
    expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ sourceId: '', evidenceObjectId: '', search: 'unrelated' }), expect.anything())
    expect(screen.getByRole('textbox', { name: 'Search all review evidence' })).toHaveValue('unrelated')
  })
  // in SourcesView.test.jsx against the canonical registry/evidence contracts.
  it('keeps Sources search when switching tabs in the same revision', async () => {
    sourcePageFixture = sourceFixture()
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources')
    await user.type(screen.getByRole('textbox', { name: 'Search all sources and evidence' }), 'market')
    await user.click(screen.getByRole('button', { name: 'Search', exact: true }))
    await user.click(screen.getByRole('tab', { name: 'Overview' }))
    await user.click(screen.getByRole('tab', { name: 'Sources' }))
    expect(screen.getByRole('textbox', { name: 'Search all sources and evidence' })).toHaveValue('market')
  })
  it('ignores exact Review focus belonging to another scope', () => {
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review&reviewContext=another-scope&reviewSourceId=old-source&reviewEvidenceObjectId=old-evidence')
    expect(calls.evidence.mock.calls.filter(([query]) => query.pageSize === 25).at(-1)[0])
      .toMatchObject({ sourceId: '', evidenceObjectId: '', reviewStatus: 'PENDING' })
  })
  it('labels Sources inspection using the canonical lock flag without a timestamp', () => {
    readinessFields = { lock: { locked: true } }
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources')
    expect(screen.getByText('Locked revision · inspection is read-only.')).toBeInTheDocument()
  })

  it('refreshes eight bounded Overview reads including current review population', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('button', { name: /Refresh/ }))
    expect(calls.refresh).toHaveBeenCalledTimes(8)
    expect(calls.refresh).toHaveBeenCalledWith('useGetReviewCompletionQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2', workspaceId: 'workspace-1', customerId: 'customer-1', tenantId: 'tenant-1', sessionRevision: expect.any(Number) }))
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeRendererQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2' }))
    for (const reviewStatus of [undefined, 'ACCEPTED', 'PENDING', 'REJECTED']) {
      expect(calls.refresh.mock.calls.some(([name, args]) => name === 'useGetRuntimeStateEvidenceQuery'
        && args.runtimeInstanceId === 'revision-2' && args.pageSize === 1 && args.reviewStatus === reviewStatus)).toBe(true)
    }
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateGraphManifestQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', sessionRevision: expect.any(Number) }))
  })

  it('does not show prior-argument evidence or coverage while the new revision loads', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2']}>
      <Routes><Route path="/app/intelligence" element={<RevisionSwitchReview />} /></Routes>
    </MemoryRouter>)
    expect(screen.getByText(/70% evidence mapped/i)).toBeInTheDocument()
    staleOverviewDetails = true
    await user.click(screen.getByRole('button', { name: 'Switch revision' }))
    expect(screen.getByText('R3 · Current')).toBeInTheDocument()
    expect(screen.getByText('Loading Overview details…')).toBeInTheDocument()
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.queryByText(/70% evidence mapped/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Evidence status distribution:/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeDisabled()
  })

  it('distinguishes initial pending reads from unavailable evidence', () => {
    initialOverviewPending = true
    show()
    expect(screen.getByText('Loading Overview details…')).toBeInTheDocument()
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.queryByText('Evidence status distribution unavailable')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeDisabled()
  })

  it('shows loading while the current renderer is absent even when prior data remains cached', () => {
    pendingRendererContext = true
    show('?runtimeInstanceId=workspace-1&revisionId=revision-3')
    expect(screen.getByText('Loading selected revision…')).toBeInTheDocument()
    expect(screen.queryByText('The selected revision could not be verified.')).not.toBeInTheDocument()
    expect(screen.queryByText(/70% evidence mapped/i)).not.toBeInTheDocument()
  })

  it('disables Refresh while the renderer is already fetching', async () => {
    rendererRefreshing = true
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('button', { name: /Refresh/ }))
    expect(calls.refresh).not.toHaveBeenCalled()
  })

  it('shows all eight views and reads overview counts through bounded API queries', async () => {
    sourcePageFixture = sourceFixture()
    const user = userEvent.setup()
    show()
    expect(screen.getByRole('heading', { name: 'Intelligence Hub' })).toBeInTheDocument()
    expect(screen.getByText('Acme Workspace')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(10)
    const overviewPanel = screen.getByRole('tabpanel', { name: 'Overview' })
    const summary = within(overviewPanel).getByLabelText('Intelligence summary')
    expect(summary.compareDocumentPosition(within(overviewPanel).getByRole('heading', { name: 'Acquisition summary' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Inspect connected sources →' }).closest('.intelligence-hub__metric'))
      .toHaveTextContent('2')
    expect(within(overviewPanel).getByText('Sources connected').nextElementSibling).toHaveTextContent('2')
    expect(screen.getByText('Evidence accepted').nextElementSibling).toHaveTextContent('2')
    const overviewStatusReads = calls.evidence.mock.calls.filter(([query]) => ['ACCEPTED', 'PENDING', 'REJECTED'].includes(query.reviewStatus))
    expect(overviewStatusReads).toHaveLength(3)
    expect(overviewStatusReads.every(([query, options]) => query.pageSize === 1 && options.skip === false)).toBe(true)
    expect(calls.manifest.mock.calls.at(-1)[1].skip).toBe(false)
    expect(calls.graph.mock.calls.at(-1)[1].skip).toBe(true)
    expect(calls.coverage).not.toHaveBeenCalled()
    await user.click(screen.getByRole('tab', { name: 'Sources' }))
    expect(summary).not.toBeVisible()
    expect(calls.evidence.mock.calls.filter(([query]) => query.pageSize === 25).at(-1)[1].skip).toBe(false)
    expect(calls.manifest.mock.calls.at(-1)[1].skip).toBe(true)
    expect(calls.evidence.mock.calls.filter(([query]) => query.pageSize === 25).at(-1)[0]).toMatchObject({ runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', pageSize: 25 })
  })

  it.each(['READY', 'PARTIALLY_READY', 'NOT_READY', undefined, 'UNRECOGNISED'])('keeps Coverage distinct from recorded readiness %s', state => {
    coverageHealthFixture = { readiness: { state }, coveragePercent: 99 }
    show()
    const card = screen.getByRole('button', { name: 'Check evidence coverage →' }).closest('.intelligence-hub__metric')
    expect(within(card).getByText('70%', { exact: true })).toBeInTheDocument()
    expect(within(card).getByText('Evidence Coverage', { exact: true })).toBeInTheDocument()
    expect(card).not.toHaveTextContent('99%')
  })
  it.each([['Check evidence coverage →', 'Coverage'], ['Open evidence readiness →', 'Evidence readiness']])('opens the correct view from Overview action %s', async (name, destination) => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('button', { name, exact: true }))
    expect(screen.getByRole('tab', { name: destination, exact: true })).toHaveAttribute('aria-selected', 'true')
    if (destination === 'Evidence readiness') expect(screen.getByRole('heading', { name: destination, exact: true })).toBeInTheDocument()
    expect(calls.evidence.mock.calls.some(([query]) => query.runtimeInstanceId === 'revision-2' && query.customerId === 'customer-1' && query.tenantId === 'tenant-1')).toBe(true)
  })
  it('preserves the selected view across an explanation popup', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('button', { name: 'Select to view assurance details' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Assurance is shown only')
    await user.click(screen.getByRole('button', { name: 'Back to Overview' }))
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })

  it('uses graph coverage instead of conflicting acquisition coverage and keeps Advisor explanations informational', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.getByText(/70% evidence mapped/i)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Evidence status distribution: Accepted 2, Pending review 1, Rejected 0; total 3.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Products 12 evidence objects Domain coverage percentage unavailable Strong' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Resolve outstanding contradiction decisions/ })).toHaveTextContent('2 contradiction decisions outstanding.')
    expect(screen.getByRole('link', { name: /Resolve outstanding contradiction decisions/ })).toHaveAttribute('href', expect.stringContaining('revisionId=revision-2'))
    expect(screen.getByRole('button', { name: /Review Problems coverage/ })).toHaveTextContent('0 connected evidence · 0 pending review')
    expect(screen.getByRole('link', { name: 'Open quality findings →' })).toHaveAttribute('href', expect.stringContaining('runtimeInstanceId=workspace-1'))
    await user.click(screen.getByRole('button', { name: /Review Problems coverage/ }))
    expect(screen.getByRole('dialog')).toHaveTextContent('informational recommendation')
    expect(screen.getByRole('dialog')).toHaveTextContent('a person must review')
    await user.click(screen.getByRole('button', { name: 'Back to Overview' }))
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })

  it.each([0, 1])('uses outstanding contradiction decisions %s instead of the saved candidate count', pendingFindings => {
    completionOverrides = { population: { completeness: 'COMPLETE', policy: 'revision-evidence-contradiction-decisions.v1', hash: 'a'.repeat(64), pendingEvidence: 1, pendingFindings, decisionCount: 7, confirmedReadinessBlockers: 1 } }
    const { container } = show()
    expect(container.querySelector('.intelligence-hub__metric--review .intelligence-hub__metric-value')).toHaveTextContent(String(pendingFindings))
    expect(screen.getByText('Outstanding contradiction decisions only. Other finding types unavailable.')).toBeVisible()
    if (pendingFindings === 0) expect(screen.queryByRole('link', { name: /Resolve outstanding contradiction decisions/ })).not.toBeInTheDocument()
    else expect(screen.getByRole('link', { name: /Resolve outstanding contradiction decisions/ })).toHaveTextContent('1 contradiction decision outstanding.')
    expect(calls.execute).not.toHaveBeenCalled()
    expect(calls.update).not.toHaveBeenCalled()
  })

  it.each(['fetching', 'error', 'renderer-refresh', 'wrong-scope', 'wrong-workspace', 'wrong-revision', 'state-version', 'currency', 'read-time', 'policy', 'incomplete', 'invalid-counts'])('withholds retained Overview review count for %s', state => {
    completionBusy = state === 'fetching'; completionFailure = state === 'error'; rendererRefreshing = state === 'renderer-refresh'
    if (['wrong-scope', 'wrong-workspace', 'wrong-revision'].includes(state)) completionOverrides.scope = {
      customerId: state === 'wrong-scope' ? 'another-customer' : 'customer-1', tenantId: 'tenant-1',
      rootRuntimeInstanceKey: state === 'wrong-workspace' ? 'another-workspace' : 'workspace-1',
      runtimeInstanceKey: state === 'wrong-revision' ? 'revision-3' : 'revision-2',
    }
    if (state === 'state-version') completionOverrides.stateVersion = 'old-version'
    if (state === 'currency') completionOverrides.currency = 'STALE'
    if (state === 'read-time') completionOverrides.readAt = null
    if (['policy', 'incomplete', 'invalid-counts'].includes(state)) completionOverrides.population = {
      completeness: state === 'incomplete' ? 'PARTIAL' : 'COMPLETE',
      policy: state === 'policy' ? 'other-policy' : 'revision-evidence-contradiction-decisions.v1', hash: 'a'.repeat(64),
      pendingEvidence: 1, pendingFindings: 2, decisionCount: state === 'invalid-counts' ? 1 : 7,
    }
    const { container } = show()
    expect(container.querySelector('.intelligence-hub__metric--review .intelligence-hub__metric-value')).toHaveTextContent(['fetching', 'renderer-refresh'].includes(state) ? 'Loading…' : 'Unavailable')
    expect(screen.queryByRole('link', { name: /Resolve outstanding contradiction decisions/ })).not.toBeInTheDocument()
    expect(screen.getByText('Outstanding contradiction decisions only. Other finding types unavailable.')).toBeVisible()
  })

  it('routes evidence summaries to their matching server review filter', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('button', { name: 'Inspect accepted evidence →' }))
    expect(calls.evidence.mock.calls.at(-1)[0].reviewStatus).toBe('ACCEPTED')
    await user.click(screen.getByRole('tab', { name: 'Overview' }))
    await user.click(screen.getByRole('button', { name: 'Review exceptions →' }))
    expect(calls.evidence.mock.calls.at(-1)[0].reviewStatus).toBe('PENDING')
  })

  it('uses the same bounded graph manifest coverage without loading graph elements', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('tab', { name: 'Coverage' }))
    expect(calls.coverage).not.toHaveBeenCalled()
    expect(calls.manifest.mock.calls.at(-1)[1].skip).toBe(false)
    expect(calls.graph.mock.calls.at(-1)[1].skip).toBe(true)
    expect(within(screen.getByRole('tabpanel', { name: 'Coverage' })).getByText('70%')).toBeInTheDocument()
    expect(screen.getByText('Per-domain percentage unavailable')).toBeInTheDocument()
    expect(screen.getByText('Connected evidence')).toBeInTheDocument()
  })

  it.each(['loading', 'error'])('preserves scoped Discovery Health independently of evidence-summary %s', (state) => {
    coverageHealthFixture = { readiness: { state: 'REVIEW_RECOMMENDED', workspaceUse: 'ALLOWED', reason: 'Recorded renderer readiness.' }, confidence: 'REDUCED' }
    summaryEvidencePending = state === 'loading'
    retainedSummaryError = state === 'error'
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=coverage')
    const coveragePanel = within(screen.getByRole('tabpanel', { name: 'Coverage' }))
    const health = within(coveragePanel.getByRole('region', { name: 'Recorded Discovery Health assessment' }))
    expect(health.getByText('Recorded Partially Ready')).toBeInTheDocument()
    expect(health.getByText('Evidence Review Pending')).toBeInTheDocument()
    expect(coveragePanel.queryByText('Review Recommended')).not.toBeInTheDocument()
    expect(coveragePanel.queryByText('Recorded renderer readiness.')).not.toBeInTheDocument()
    expect(coveragePanel.queryByText('Discovery readiness is not projected for this revision.')).not.toBeInTheDocument()
    expect(coveragePanel.getByText('70%')).toBeInTheDocument()
  })

  it.each(['tab', 'session', 'read'])('rejects retained Coverage navigation after departed %s', async departure => {
    render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=coverage']}><IntelligenceHub /><LocationProof /></MemoryRouter>)
    const retained = calls.coverageView.mock.calls.at(-1)[0], user = userEvent.setup()
    if (departure === 'tab') await user.click(screen.getByRole('tab', { name: 'Context', exact: true }))
    if (departure === 'session') act(() => clearTokens())
    if (departure === 'read') { graphReadError = true; await user.click(screen.getByRole('button', { name: 'Strong', exact: true })) }
    const before = screen.getByTestId('route-proof').textContent
    act(() => { retained.onInspectionChange({ selectedDomain: 'Proof' }); retained.onOpenSources('Company') })
    expect(screen.getByTestId('route-proof').textContent).toBe(before)
  })
  it('retains exact Coverage filter/domain through history and Help and clears conflicting Source return state', async () => {
    const params = new URLSearchParams({ runtimeInstanceId: 'workspace-1', revisionId: 'revision-2', view: 'coverage',
      coverageContext: 'workspace-1:revision-2:customer-1:tenant-1', coverageFilter: 'Strong', coverageDomain: 'Proof',
      sourceId: 'old', evidenceObjectId: 'old', sourcePage: '3', sourceReturn: 'graph', graphContextReturn: 'inspection' })
    render(<MemoryRouter initialEntries={['/app/intelligence?' + params]}><IntelligenceHub /><GraphHistoryProof /></MemoryRouter>)
    const user = userEvent.setup()
    expect(screen.getByRole('region', { name: 'Selected coverage domain' })).toHaveTextContent('Proof domain')
    expect(screen.getByRole('link', { name: /Help/ })).toHaveAttribute('href', expect.stringContaining('coverageDomain=Proof'))
    await user.click(screen.getByRole('button', { name: 'Gaps', exact: true }))
    expect(screen.getByTestId('route-proof')).toHaveTextContent('coverageDomain=Problems')
    await user.click(screen.getByRole('button', { name: 'History back' }))
    expect(screen.getByRole('region', { name: 'Selected coverage domain' })).toHaveTextContent('Proof domain')
    await user.click(screen.getByRole('button', { name: 'Search sources and evidence for this domain →' }))
    const next = new URLSearchParams(screen.getByTestId('route-proof').textContent)
    expect(next.get('sourceQuery')).toBe('Proof'); expect(next.get('coverageDomain')).toBe('Proof')
    for (const key of ['sourceId', 'evidenceObjectId', 'sourcePage', 'sourceReturn', 'graphContextReturn']) expect(next.has(key)).toBe(false)
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled()
  })
  it('refreshes Coverage reads and opens scoped supporting evidence search with revision context', async () => {
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=coverage')
    await user.click(screen.getByRole('button', { name: '↻ Refresh' }))
    expect(calls.refresh).toHaveBeenCalledTimes(4)
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateGraphManifestQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', sessionRevision: expect.any(Number) }))
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateDiscoveryHealthQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', sessionRevision: expect.any(Number) }))
    await user.click(screen.getByRole('button', { name: 'Search sources and evidence for this domain →' }))
    expect(screen.getByRole('tab', { name: 'Sources' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('textbox', { name: 'Search all sources and evidence' })).toHaveValue('Company')
    expect(calls.evidence.mock.calls.at(-1)[0]).toMatchObject({ runtimeInstanceId: 'revision-2', page: 1, pageSize: 25 })
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByRole('textbox', { name: 'Search all sources and evidence' })).toHaveValue('')
    await user.click(screen.getByRole('tab', { name: 'Coverage' }))
    await user.click(screen.getByRole('button', { name: 'Search sources and evidence for this domain →' }))
    expect(screen.getByRole('textbox', { name: 'Search all sources and evidence' })).toHaveValue('Company')
  })

  it('resets Coverage filters and selected domain when a cached revision replaces the context', async () => {
    cachedContextRevision = true
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=coverage']}><Routes><Route path="/app/intelligence" element={<RevisionSwitchReview view="coverage" />} /></Routes></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Gaps', exact: true }))
    expect(screen.getByRole('region', { name: 'Selected coverage domain' })).toHaveTextContent('Problems domain')
    await user.click(screen.getByRole('button', { name: 'Switch revision' }))
    expect(screen.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('region', { name: 'Selected coverage domain' })).toHaveTextContent('Company domain')
    const destination = new URL(screen.getByRole('link', { name: 'Open acquisition in Context →' }).getAttribute('href'), 'http://local')
    expect(destination.searchParams.get('runtimeInstanceId')).toBe('workspace-1')
    expect(destination.searchParams.get('revisionId')).toBe('revision-3')
    expect(destination.searchParams.get('view')).toBe('context')
  })

  it.each(['STALE', 'MISSING'])('blocks projection for a %s manifest', status => {
    graphManifestState = status
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=intelligence-graph')
    expect(calls.graph.mock.calls.at(-1)[1].skip).toBe(true)
    expect(screen.queryByRole('button', { name: /^Source Review\/quality state unavailable/ })).not.toBeInTheDocument()
  })

  it('hides a retained current manifest on error and refreshes only graph reads in order', async () => {
    graphReadError = true
    const user = userEvent.setup()
    const rendered = show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=intelligence-graph')
    expect(calls.graph.mock.calls.at(-1)[1].skip).toBe(true)
    expect(screen.getAllByText('Graph could not be loaded. Refresh to retry.').length).toBeGreaterThan(0)
    graphReadError = false
    rendered.rerender(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=intelligence-graph']}><Routes><Route path="/app/intelligence" element={<IntelligenceHub />} /></Routes></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: '↻ Refresh' }))
    expect(calls.refresh.mock.calls.map(call => call[0])).toEqual(['useGetRuntimeStateGraphManifestQuery', 'useGetRuntimeStateGraphProjectionQuery'])
  })

  it('uses server review filters and explains graph relationships without raw source text', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('tab', { name: 'Review' }))
    expect(calls.evidence.mock.calls.at(-1)[0].reviewStatus).toBe('PENDING')
    await user.click(screen.getByRole('button', { name: 'Accepted', exact: true }))
    expect(calls.evidence.mock.calls.at(-1)[0].reviewStatus).toBe('ACCEPTED')
    await user.click(screen.getByRole('tab', { name: 'Intelligence Graph' }))
    expect(calls.graph.mock.calls.at(-1)[1].skip).toBe(false)
    expect(screen.queryByText('private raw source text')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Source Review\/quality state unavailable/ }))
    expect(screen.getByText('Supports understanding')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Source' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Gaps/ }))
    expect(screen.getAllByText('Economics').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Impact' }))
    expect(screen.getAllByText('Output Reference').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /Contradictions/ }))
    expect(screen.getAllByText('Contradicts').length).toBeGreaterThan(0)
  })

  it('keeps After lock inactive while the selected revision is unlocked', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('tab', { name: 'After lock' }))
    expect(screen.getByRole('heading', { name: 'After-lock review starts when the selected revision is locked' })).toBeInTheDocument()
    expect(screen.getAllByText('Not active').length).toBeGreaterThan(0)
    expect(screen.getByText('Post-lock inbox is not active because the selected revision is unlocked.')).toBeInTheDocument()
  })

  it('uses recorded lock receipts without inventing a post-lock inbox or decision', () => {
    lockFixture = lockBasisFixture()
    readinessFields = { readiness: { state: 'LOCKED' }, publish: { published: true }, lock: { state: 'LOCKED', locked: true, lockedAt: '2026-09-17T18:14:00Z', snapshot: { snapshotId: 'lock-receipt-2' } } }
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=after-lock')
    expect(screen.getByText('Published and locked')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'After lock summary' })).toHaveTextContent('Unavailable')
    expect(screen.getByText(/Snapshot lock-receipt-2/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Post-lock discovery inbox' })).toHaveTextContent('not available')
    expect(screen.getByRole('button', { name: 'Save decision' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Inspect source details →' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '○ Supports current revision' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '○ No change to current revision' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '○ Updated revision required' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Could require|Current revision may need review|Awaiting impact assessment/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Evidence acceptance is separate from impact assessment/)).toHaveTextContent('Every result preserves frozen truth; Updated revision required does not create a successor automatically.')
    expect(screen.queryByText('Awaiting impact assessment', { exact: true })).not.toBeInTheDocument()
    expect(within(screen.getByRole('tabpanel', { name: 'After lock' })).queryByText(/0 items shown/)).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Open acquisition in Context →' })).toHaveLength(2)
    expect(screen.queryByRole('link', { name: '＋ Start discovery' })).not.toBeInTheDocument()
  })

  it.each([{}, { state: 'LOCKED', locked: false }])('does not assert protection when lock state is missing or conflicting (%j)', (lock) => {
    lockFailure = true
    readinessFields = { lock }
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=after-lock')
    expect(screen.getByRole('heading', { name: 'Confirm the lock state before reviewing post-lock evidence' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Post-lock discovery inbox' })).toHaveTextContent('could not be verified')
    expect(screen.queryByText('R2 is protected')).not.toBeInTheDocument()
    expect(screen.queryByText('Not active')).not.toBeInTheDocument()
  })

  it.each([{}, { state: 'LOCKED', locked: false }, { state: 'UNLOCKED', locked: false }])('keeps the protection explanation policy-only without a verified lock (%j)', async (lock) => {
    const user = userEvent.setup()
    readinessFields = { lock }
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=after-lock')
    expect(screen.getByText(/These protections apply only after a verified lock/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Why this is separate →' }))
    const dialog = screen.getByRole('dialog', { name: 'Why new evidence is reviewed separately' })
    expect(dialog).toHaveTextContent('This view does not establish a lock for the selected revision.')
    expect(dialog).toHaveTextContent('When a revision is locked')
    expect(dialog).not.toHaveTextContent('R2 is a point-in-time reference')
    expect(dialog).not.toHaveTextContent('R2 remains the reference')
  })

  it('preserves After lock on explanation close and navigates with selected context', async () => {
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=after-lock')
    const opener = screen.getByRole('button', { name: 'Why this is separate →' })
    await user.click(opener)
    expect(screen.getByRole('dialog', { name: 'Why new evidence is reviewed separately' })).toBeInTheDocument()
    expect(screen.getByText('An updated revision is created only when needed')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Why new evidence is reviewed separately' })).toHaveTextContent('One recorded assessment states No change to current revision, Supports current revision or Updated revision required. Evidence acceptance is a separate decision.')
    await user.click(screen.getByRole('button', { name: 'Return to evidence' }))
    expect(screen.getByRole('tab', { name: 'After lock' })).toHaveAttribute('aria-selected', 'true')
    expect(opener).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'View readiness and history →' }))
    expect(screen.getByRole('tab', { name: 'Readiness & publish' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'After lock' }))
    await user.click(screen.getByRole('button', { name: 'Current revision' }))
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(calls.evidence.mock.calls.at(-1)[0].runtimeInstanceId).toBe('revision-2')
  })

  it.each([0, 1])('opens exact locked Context from After Lock control %i without intake', async (index) => {
    readinessFields = { lock: { state: 'LOCKED', locked: true } }
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=after-lock&sourceId=source-1&evidenceId=evidence-1&findingId=finding-1&sourceSearch=proof&returnView=graph']}><IntelligenceHub /><LocationProof /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: /Start discovery/ })).not.toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Open acquisition in Context →' })[index])
    expect(screen.getByRole('tab', { name: 'Context' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('What should we review?')).not.toBeInTheDocument()
    expect(screen.getByTestId('route-proof')).toHaveTextContent('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context&sourceId=source-1&evidenceId=evidence-1&findingId=finding-1&sourceSearch=proof&returnView=graph')
    expect(calls.execute).not.toHaveBeenCalled()
    expect(calls.update).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Build evidence' })).toBeDisabled()
    expect(calls.evidence.mock.calls.at(-1)[0]).toMatchObject({ runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1' })
    expect(screen.getByRole('link', { name: /Open existing acquisition workbench/ })).toHaveAttribute('href', '/app/runtime/revision-2/workbench')
  })

  it('does not reopen an obsolete explanation when returning to a revision', async () => {
    cachedContextRevision = true
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=after-lock']}><Routes><Route path="/app/intelligence" element={<RevisionSwitchReview view="after-lock" />} /></Routes></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Why this is separate →' }))
    await user.click(screen.getByRole('button', { name: 'Switch revision' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Return to original revision' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('blocks After lock Refresh while its bounded renderer read is pending', async () => {
    rendererRefreshing = true
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=after-lock')
    const refresh = screen.getByRole('button', { name: /Refresh/ })
    expect(refresh).toBeDisabled()
    expect(refresh).toHaveAttribute('aria-busy', 'true')
    await user.click(refresh)
    expect(calls.refresh).not.toHaveBeenCalled()
  })

  it('refreshes the selected bounded renderer and lock basis from After lock', async () => {
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=after-lock')
    await user.click(screen.getByRole('button', { name: /Refresh/ }))
    expect(calls.refresh).toHaveBeenCalledTimes(2)
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateLockBasisQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2' }))
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeRendererQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1' }))
  })

  it('does not render revision data when route context is missing', () => {
    show('?runtimeInstanceId=workspace-1')
    expect(screen.getByText(/open intelligence hub from a selected execution workspace revision/i)).toBeInTheDocument()
    expect(screen.queryByText('Acme Workspace')).not.toBeInTheDocument()
    expect(calls.evidence.mock.calls.at(-1)[1].skip).toBe(true)
  })

  it('shows an empty filtered queue when unfiltered evidence exists but the API returns its missing code', () => {
    emptyFilteredReview = true
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    expect(screen.getByText('No candidates match this review filter in the selected revision.')).toBeInTheDocument()
    expect(calls.evidence.mock.calls.at(-1)[0].reviewStatus).toBe('PENDING')
  })

  it('does not present renderer counts when the bounded evidence count cannot be checked', () => {
    missingSummaryEvidence = true
    const { container } = show()
    expect(screen.getAllByText('Evidence objects').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0)
    const metrics = [...container.querySelectorAll('[aria-label="Intelligence summary"] .intelligence-hub__metric-value')]
    expect(metrics.map((metric) => metric.textContent)).not.toContain('3')
    expect(screen.getByRole('status')).toHaveTextContent('Evidence status distribution unavailable')
    expect(screen.queryByRole('img', { name: /Evidence status distribution/ })).not.toBeInTheDocument()
  })

  it('withholds the evidence distribution when status totals exceed the selected revision total', () => {
    conflictingStatusCounts = true
    show()
    expect(screen.getByRole('status')).toHaveTextContent('Evidence status distribution unavailable')
    expect(screen.queryByRole('img', { name: /Evidence status distribution/ })).not.toBeInTheDocument()
  })

  it('withholds the evidence distribution when the selected revision has no evidence', () => {
    emptyEvidenceTotal = true
    show()
    expect(screen.queryByRole('img', { name: /Evidence status distribution/ })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Evidence status distribution unavailable')
  })

  it('labels an unclassified residual without inventing a review state', () => {
    additionalUnclassifiedEvidence = true
    show()
    expect(screen.getByRole('img', { name: /Other status 1/ })).toBeInTheDocument()
    expect(screen.getByText('Other status: 1')).toBeInTheDocument()
    expect(screen.queryByText(/Draft/)).not.toBeInTheDocument()
  })
  it('renders selected readiness receipts without inventing control decisions or outcome readiness', () => {
    lockFixture = lockBasisFixture({ snapshotId: 'recorded-lock-id' })
    readinessFields = { readiness: { state: 'LOCKED', reason: 'WRONG TOP LEVEL REASON', sectionTruth: { reason: 'Recorded section truth', readySectionCount: 5, requiredSectionCount: 5 } }, publish: { state: 'PUBLISHED', outputEligibility: { outputEligible: true } }, lock: { state: 'LOCKED', locked: true, snapshot: { snapshotId: 'recorded-lock-id' } } }
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    expect(screen.getByText('Recorded section truth')).toBeInTheDocument()
    expect(screen.queryByText('WRONG TOP LEVEL REASON')).not.toBeInTheDocument()
    expect(screen.getByText('5 of 5 required sections ready')).toBeInTheDocument()
    expect(within(screen.getByRole('tabpanel', { name: 'Readiness & publish' })).getByText('recorded-lock-id')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Publish & lock revision' })).not.toBeInTheDocument()
    expect(screen.getByText('Publication and locking are performed in Workspace Structure.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Workspace Structure' })).toHaveAttribute('href', '/app/workspace-structure?runtimeInstanceId=workspace-1&revisionId=revision-2')
    expect(within(screen.getByRole('region', { name: 'Selected assurance control' })).getAllByText('Unavailable').length).toBeGreaterThan(0)
    expect(screen.queryByText(/Working revision R/)).not.toBeInTheDocument()
  })
  it('keeps the selected control after report preview closes and preserves navigation context', async () => {
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    await user.click(screen.getByRole('button', { name: /Review completion An explicit human receipt/ }))
    expect(screen.getByRole('heading', { name: 'Review completion', exact: true })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Preview assurance report →' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Executive assurance summary' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Export PDF' })).toBeDisabled()
    await user.click(within(dialog).getByRole('button', { name: 'Close', exact: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Review completion', exact: true })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open Review →' }))
    expect(screen.getByRole('tab', { name: 'Review' })).toHaveAttribute('aria-selected', 'true')
  })
  it('does not present missing or failed readiness evidence totals as zero', async () => {
    retainedStatusError = true
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    await user.click(screen.getByRole('button', { name: /Review completion An explicit human receipt/ }))
    expect(screen.queryByText('0 accepted')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Selected assurance control' })).getAllByText('Unavailable').length).toBeGreaterThan(0)
  })
  it('refreshes only bounded readiness reads', async () => {
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    await user.click(screen.getByRole('button', { name: '↻ Refresh' }))
    expect(calls.refresh.mock.calls).toHaveLength(10)
    expect(calls.refresh).toHaveBeenCalledWith('useGetReviewCompletionQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2' }))
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateLockBasisQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2' }))
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateDiscoveryHealthQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', sessionRevision: expect.any(Number) }))
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateEvidenceInventoryQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2', sessionRevision: expect.any(Number) }))
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateSourceSummaryQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', sessionRevision: expect.any(Number) }))
    expect(calls.refresh.mock.calls.filter(([name]) => name === 'useGetRuntimeStateEvidenceQuery').every(([, args]) => args.pageSize === 1 && args.runtimeInstanceId === 'revision-2')).toBe(true)
  })

  it('does not fall back to renderer totals when the readiness evidence count is capped', () => {
    invalidSummaryTotal = 'capped'
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    const frozen = within(screen.getByRole('heading', { name: 'Recorded lock snapshot' }).closest('section'))
    expect(frozen.getByText(/Frozen source membership and exact evidence versions are unavailable/)).toBeInTheDocument()
    expect(frozen.getByText('No recorded lock basis')).toBeInTheDocument()
    expect(frozen.queryByText(/2 sources/)).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Current revision source basis' })).getByText('Sources connected').nextElementSibling).toHaveTextContent('2')
  })
  it('resets the selected assurance control when the revision changes', async () => {
    cachedContextRevision = true
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish']}><RevisionSwitchReview view="readiness-publish" /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: /Exception disclosure A person confirms/ }))
    await user.click(screen.getByRole('button', { name: 'Switch revision' }))
    expect(screen.getByRole('heading', { name: 'Review completion', exact: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Review completion An explicit human receipt/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps general activity separate from the three approved human controls', async () => {
    readinessFields = { activity: [{ id: 'event-1', summary: 'Recorded runtime event 1' }] }
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    const controls = within(screen.getByRole('region', { name: 'Assurance control register' }))
    expect(controls.getAllByRole('button')).toHaveLength(3)
    expect(controls.queryByText('Decision and audit history')).not.toBeInTheDocument()
    await userEvent.click(controls.getByRole('button', { name: /Publication authorisation/ }))
    expect(screen.getByRole('region', { name: 'Selected assurance control' })).toHaveTextContent('decision history are unavailable')
    expect(screen.queryByText('Recorded runtime event 1')).not.toBeInTheDocument()
  })

  it.each(['zero', 'unavailable'])('does not assert accepted evidence when the report total is %s', async (state) => {
    emptyEvidenceTotal = state === 'zero'
    retainedStatusError = state === 'unavailable'
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    await user.click(screen.getByRole('button', { name: 'Preview assurance report →' }))
    const dialog = screen.getByRole('dialog', { name: 'Intelligence assurance report' })
    expect(within(dialog).getByText('Accepted evidence').previousElementSibling).toHaveTextContent(state === 'zero' ? '0' : 'Unavailable')
    expect(within(dialog).queryByText(/Accepted evidence is recorded for this revision/)).not.toBeInTheDocument()
    expect(within(dialog).getByText(/Evidence counts describe recorded review state/)).toBeInTheDocument()
  })

  it.each(['overview', 'context', 'sources', 'evidence-readiness', 'readiness-publish'])('shares qualified processing in %s without using latest attempt totals', view => {
    sourceSummaryOverrides = { documentSourceCount: 2, uniqueSourceCount: 4,
      sourceCountsByType: { UPLOADED_DOCUMENT: 2, WEBSITE: 2 }, processingCompleteness: 'PARTIAL',
      documentsProcessed: null, knownProcessedCount: 1, unknownCount: 1 }
    show(`?runtimeInstanceId=workspace-1&revisionId=revision-2&view=${view}`)
    expect(screen.getAllByText(/Unavailable · 1 verified, 1 unknown/).length).toBeGreaterThan(0)
    if (view === 'overview') expect(within(screen.getByRole('tabpanel', { name: 'Overview' })).getByText('Sources connected').nextElementSibling).toHaveTextContent('4')
    if (view === 'sources') expect(screen.getByText('Whole-revision sources').previousElementSibling).toHaveTextContent('4')
  })

  it.each(['evidence-readiness', 'readiness-publish'])('rejects a stale summary in %s without replacing it with renderer counts', view => {
    sourceSummaryOverrides = { stateVersion: 'older' }
    show(`?runtimeInstanceId=workspace-1&revisionId=revision-2&view=${view}`)
    const scope = view === 'readiness-publish' ? within(screen.getByRole('region', { name: 'Current revision source basis' })) : within(screen.getByRole('region', { name: 'Evidence readiness details' }))
    expect(scope.getByText('Sources connected').nextElementSibling).toHaveTextContent('Unavailable')
  })

  it('refreshes the canonical source read on Evidence readiness without executing an action', async () => {
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=evidence-readiness')
    await user.click(screen.getByRole('button', { name: '↻ Refresh' }))
    expect(calls.refresh.mock.calls).toHaveLength(6)
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateEvidenceInventoryQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2', sessionRevision: expect.any(Number) }))
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeStateSourceSummaryQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1' }))
    expect(calls.execute).not.toHaveBeenCalled()
  })

  it.each(['error', 'fetching', 'stale', 'wrong-scope'])('withholds retained Overview totals when summary is %s', state => {
    sourceSummaryFailure = state === 'error'; sourceSummaryBusy = state === 'fetching'
    sourceSummaryOverrides = state === 'stale' ? { stateVersion: 'old' }
      : state === 'wrong-scope' ? { scope: { customerId: 'other', tenantId: 'tenant-1', runtimeInstanceId: 'revision-2' } } : {}
    show()
    expect(within(screen.getByRole('tabpanel', { name: 'Overview' })).getByText('Sources connected').nextElementSibling).toHaveTextContent('Unavailable')
    expect(screen.getByText('Documents processed', { selector: 'dt' }).nextElementSibling).toHaveTextContent(state === 'fetching' ? 'Loading…' : 'Unavailable')
  })

  it('renders the paper assurance report with actual evidence and no synthetic certification or audit totals', async () => {
    readinessFields = { publish: { state: 'PUBLISHED' }, activity: [{ id: 'one', summary: 'Generic runtime activity' }] }
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    await user.click(screen.getByRole('button', { name: 'Preview assurance report →' }))
    const dialog = screen.getByRole('dialog', { name: 'Intelligence assurance report' })
    expect(dialog).toHaveClass('intelligence-hub__report-dialog')
    expect(within(dialog).getByRole('heading', { name: 'Acme Workspace' })).toBeInTheDocument()
    expect(within(dialog).getByText('Accepted evidence').previousElementSibling).toHaveTextContent('2')
    expect(within(dialog).getByText('Published')).toBeInTheDocument()
    expect(within(dialog).getByText('Governed decisions').previousElementSibling).toHaveTextContent('Unavailable')
    expect(within(dialog).getByText('Audit events').previousElementSibling).toHaveTextContent('Unavailable')
    expect(within(dialog).getByRole('button', { name: 'Download data CSV' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Export PDF' })).toBeDisabled()
    expect(within(dialog).queryByText(/ASSURE-R|L3 assured/)).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Close report' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each(['CURRENT', 'STALE'])('inspects a recorded %s report receipt and bounded history without granting publication', async currency => {
    const receipt = assuranceReceiptFixture({ currency, populationHash: (currency === 'CURRENT' ? 'a' : 'b').repeat(64) })
    completionOverrides = assuranceReviewFixture(receipt)
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    expect(calls.completion.mock.calls.filter(([, options]) => typeof options.skip === 'boolean').at(-1)[1].skip).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Preview assurance report →' }))
    expect(calls.completion.mock.calls.filter(([, options]) => typeof options.skip === 'boolean').at(-1)[1].skip).toBe(false)
    const region = within(screen.getByRole('dialog')).getByRole('region', { name: 'Report Review Completion' })
    expect(region).toHaveTextContent(receipt.actorUserId)
    expect(region).toHaveTextContent(receipt.auditId)
    expect(region).toHaveTextContent(currency === 'CURRENT' ? 'StatusCurrent' : 'Stale — reassessment required')
    expect(region).toHaveTextContent('1 confirmed contradiction decisions remain independent readiness blockers')
    expect(region).toHaveTextContent('not verify audit signatures')
    const history = within(region).getByText(/Inspect Review Completion history/)
    await userEvent.click(history)
    expect(within(region).getAllByText(receipt.rationale)).toHaveLength(2)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Refresh report', exact: true }))
    expect(calls.refresh.mock.calls.map(([name]) => name)).toEqual(expect.arrayContaining(['useGetReviewCompletionQuery', 'useGetRuntimeStateGraphManifestQuery', 'useGetRuntimeStateSourceSummaryQuery', 'useGetRuntimeStateEvidenceInventoryQuery', 'useGetRuntimeRendererQuery']))
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled()
  })

  it('hides retained report receipts during a review read failure while preserving independently verified inventory', async () => {
    completionOverrides = assuranceReviewFixture(); inventoryFixture = evidenceInventoryFixture()
    const search = '?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish'
    const { rerender } = show(search)
    await userEvent.click(screen.getByRole('button', { name: 'Preview assurance report →' }))
    expect(within(screen.getByRole('dialog')).getByRole('region', { name: 'Report Review Completion' })).toHaveTextContent(completionOverrides.latestReceipt.receiptId)
    completionFailure = true
    rerender(<MemoryRouter initialEntries={[`/app/intelligence${search}`]}><Routes><Route path="/app/intelligence" element={<IntelligenceHub />} /></Routes></MemoryRouter>)
    expect(within(screen.getByRole('dialog')).getByRole('region', { name: 'Report Review Completion' })).not.toHaveTextContent(completionOverrides.latestReceipt.receiptId)
    expect(screen.getByRole('region', { name: 'Report current evidence inventory' })).toHaveTextContent('853 of 853')
  })

  it('stops a report refresh after the session changes during first read scheduling', async () => {
    completionOverrides = assuranceReviewFixture()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    await userEvent.click(screen.getByRole('button', { name: 'Preview assurance report →' }))
    calls.refresh.mockImplementationOnce(() => clearTokens())
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Refresh report', exact: true }))
    expect(calls.refresh).toHaveBeenCalledTimes(1)
    expect(calls.refresh.mock.calls[0][0]).toBe('useGetRuntimeRendererQuery')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled()
  })

  it('updates an open report from current scoped reads and withholds retained source/inventory/coverage during failure', async () => {
    inventoryFixture = evidenceInventoryFixture()
    const search = '?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish'
    const { rerender } = show(search)
    await userEvent.click(screen.getByRole('button', { name: 'Preview assurance report →' }))
    const report = () => within(screen.getByRole('dialog', { name: 'Intelligence assurance report' }))
    expect(report().getByRole('region', { name: 'Report current evidence inventory' })).toHaveTextContent('853 of 853')
    expect(report().getByRole('region', { name: 'Report canonical source basis' })).toHaveTextContent('Unique sources2')
    expect(report().getByRole('region', { name: 'Report identity and current basis' })).toHaveTextContent('revision-2Customercustomer-1Tenanttenant-1')
    const refresh = () => rerender(<MemoryRouter initialEntries={[`/app/intelligence${search}`]}><Routes><Route path="/app/intelligence" element={<IntelligenceHub />} /></Routes></MemoryRouter>)
    sourceSummaryBusy = true; inventoryBusy = true; graphReadError = true
    refresh()
    expect(report().getByRole('region', { name: 'Report canonical source basis' })).not.toHaveTextContent('Unique sources2')
    expect(report().getByRole('region', { name: 'Report current evidence inventory' })).not.toHaveTextContent('853 of 853')
    expect(report().getByRole('region', { name: 'Report domain coverage basis' })).not.toHaveTextContent('Graph hash')
    sourceSummaryBusy = false; inventoryBusy = false; graphReadError = false
    sourceSummaryOverrides = { uniqueSourceCount: 0, documentSourceCount: 0, sourceCountsByType: {}, documentsProcessed: 0, knownProcessedCount: 0 }
    refresh()
    expect(report().getByRole('region', { name: 'Report canonical source basis' })).toHaveTextContent('Unique sources0')
    expect(report().getByRole('region', { name: 'Report current evidence inventory' })).toHaveTextContent('853 of 853')
    expect(report().getByRole('region', { name: 'Report domain coverage basis' })).toHaveTextContent('Graph hash')
    expect(calls.execute).not.toHaveBeenCalled(); expect(calls.update).not.toHaveBeenCalled()
  })

  it('withholds report renderer facts on current refetch and dismisses the report after session replacement', async () => {
    lockFixture = lockBasisFixture({ snapshotId: 'recorded-lock-proof' })
    readinessFields = { publish: { state: 'PUBLISHED' }, lock: { locked: true, state: 'LOCKED', snapshot: { snapshotId: 'recorded-lock-proof' } } }
    const search = '?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish'
    const { rerender } = show(search)
    await userEvent.click(screen.getByRole('button', { name: 'Preview assurance report →' }))
    expect(within(screen.getByRole('dialog')).getByRole('region', { name: 'Report lifecycle and recorded snapshot' })).toHaveTextContent('recorded-lock-proof')
    rendererRefreshing = true
    rerender(<MemoryRouter initialEntries={[`/app/intelligence${search}`]}><Routes><Route path="/app/intelligence" element={<IntelligenceHub />} /></Routes></MemoryRouter>)
    expect(within(screen.getByRole('dialog')).getByRole('region', { name: 'Report lifecycle and recorded snapshot' })).not.toHaveTextContent('recorded-lock-proof')
    expect(within(screen.getByRole('dialog')).queryByText('Published')).not.toBeInTheDocument()
    act(() => clearTokens())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each(['evidence-readiness', 'readiness-publish'])('shows the scoped current inventory and inspection in %s without a readiness grant', async view => {
    inventoryFixture = evidenceInventoryFixture()
    show(`?runtimeInstanceId=workspace-1&revisionId=revision-2&view=${view}`)
    const panel = within(screen.getByRole('tabpanel', { name: view === 'evidence-readiness' ? 'Evidence readiness' : 'Readiness & publish' }))
    expect(panel.getByText('Complete current inventory')).toBeVisible()
    if (view === 'evidence-readiness') {
      expect(screen.getByText('Records read').nextElementSibling).toHaveTextContent('853')
      await userEvent.click(screen.getByRole('button', { name: 'Advanced evidence inspection' }))
    } else {
      expect(within(screen.getByRole('region', { name: 'Current evidence inventory' })).getByText('853 / 853')).toBeVisible()
      await userEvent.click(screen.getByRole('button', { name: 'Inspect inventory receipt →' }))
    }
    expect(screen.getByText('a'.repeat(64))).toBeVisible()
    expect(screen.getByText('source-one · ' + 'b'.repeat(64))).toBeVisible()
    expect(calls.execute).not.toHaveBeenCalled()
  })
  it.each(['evidence-readiness', 'readiness-publish'])('withholds wrong-version inventory in %s', view => {
    inventoryFixture = evidenceInventoryFixture({ stateVersion: 'other-version' })
    show(`?runtimeInstanceId=workspace-1&revisionId=revision-2&view=${view}`)
    const panel = within(screen.getByRole('tabpanel', { name: view === 'evidence-readiness' ? 'Evidence readiness' : 'Readiness & publish' }))
    expect(panel.queryByText('Complete current inventory')).not.toBeInTheDocument()
    expect(panel.queryByText('853 / 853')).not.toBeInTheDocument()
    expect(panel.getByLabelText('Current evidence inventory')).toHaveTextContent('Current inventory receipt unavailable')
  })
  it.each(['fetching', 'renderer-refresh', 'error'])('withholds retained inventory while %s', state => {
    inventoryFixture = evidenceInventoryFixture()
    inventoryBusy = state === 'fetching'; inventoryFailure = state === 'error'; rendererRefreshing = state === 'renderer-refresh'
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=evidence-readiness')
    expect(screen.queryByText('Complete current inventory')).not.toBeInTheDocument()
    expect(screen.getByText('Records read').nextElementSibling).toHaveTextContent(state === 'error' ? 'Unavailable' : 'Loading…')
  })

})
