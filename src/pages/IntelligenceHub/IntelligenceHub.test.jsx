import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IntelligenceHub from './IntelligenceHub.jsx'

const renderer = {
  runtimeInstance: {
    id: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1',
    name: 'Acme Workspace', updatedAt: '2026-09-29T10:00:00.000Z',
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

const calls = { evidence: vi.fn(), manifest: vi.fn(), graph: vi.fn(), coverage: vi.fn(), refresh: vi.fn() }
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
vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: () => ({ customerId: 'customer-1', tenantId: 'tenant-1' }),
}))
vi.mock('../../store/api/runtimeInstanceApi.js', () => {
  const queries = {
  useGetRuntimeRendererQuery: () => ({ data: { data: emptyEvidenceTotal ? {
    ...renderer,
    discovery: { ...renderer.discovery, evidenceObjectSummary: { ...renderer.discovery.evidenceObjectSummary, evidenceObjectCount: 0 } },
  } : { ...renderer, ...readinessFields, discovery: { ...renderer.discovery, inputComplete: true, ...(contextInputs !== undefined ? { inputValues: contextInputs } : {}) } } }, isLoading: false, refetch: vi.fn() }),
  useGetRuntimeStateEvidenceQuery: (...args) => {
    calls.evidence(...args)
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
  useGetRuntimeStateGraphManifestQuery: (...args) => { calls.manifest(...args); return { data: { data: { manifest: { status: 'CURRENT' } } } } },
  useGetRuntimeStateGraphProjectionQuery: (...args) => { calls.graph(...args); return { data: { data: { graph: {
    nodes: [
      { nodeId: 'source-1', nodeType: 'SOURCE', entityDisplayName: 'Source', label: 'private raw source text' },
      { nodeId: 'truth-1', nodeType: 'SECTION_TRUTH', entityDisplayName: 'Section Truth' },
      { nodeId: 'output-1', nodeType: 'OUTPUT_REFERENCE', entityDisplayName: 'Output Reference' },
      { nodeId: 'evidence-1', nodeType: 'EVIDENCE', entityDisplayName: 'Evidence', label: 'private raw evidence text' },
      { nodeId: 'evidence-2', nodeType: 'EVIDENCE', entityDisplayName: 'Evidence', label: 'another private raw evidence text' },
    ],
    edges: [
      { edgeId: 'edge-1', fromNodeId: 'source-1', toNodeId: 'truth-1', relationshipDisplayName: 'Supports', customerVisible: true },
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
  return Object.fromEntries(Object.entries(queries).map(([name, query]) => [name, (...args) => {
    const result = query(...args)
    const detailPending = (staleOverviewDetails || initialOverviewPending)
      && ['useGetRuntimeStateEvidenceQuery', 'useGetRuntimeIntelligenceGraphCoverageQuery'].includes(name)
    const currentData = name === 'useGetRuntimeRendererQuery' && cachedContextRevision && args[0].runtimeInstanceId === 'revision-3'
      ? { data: { ...result.data.data, runtimeInstance: { ...renderer.runtimeInstance, id: 'revision-3' }, revision: {
        ...renderer.revision, revisionNumber: 3, lineage: [{ runtimeInstanceId: 'revision-3', relationship: 'CURRENT' }],
      } } }
      : name === 'useGetRuntimeRendererQuery' && pendingRendererContext ? undefined
      : name === 'useGetRuntimeRendererQuery' && staleOverviewDetails
      ? { data: { ...renderer, runtimeInstance: { ...renderer.runtimeInstance, id: 'revision-3' }, revision: {
        ...renderer.revision, revisionNumber: 3, lineage: [{ runtimeInstanceId: 'revision-3', relationship: 'CURRENT' }],
      } } }
      : detailPending || (name === 'useGetRuntimeStateEvidenceQuery' && args[0].pageSize === 25 && sourceCurrentPending) ? undefined : result.data
    return {
      ...result,
      data: initialOverviewPending && detailPending ? undefined : result.data,
      currentData,
      isFetching: detailPending || (name === 'useGetRuntimeStateEvidenceQuery' && args[0].pageSize === 25 && sourceCurrentPending) || (name === 'useGetRuntimeRendererQuery' && (rendererRefreshing || pendingRendererContext)),
      refetch: () => calls.refresh(name, args[0]),
    }
  }]))
})

const show = (search = '?runtimeInstanceId=workspace-1&revisionId=revision-2') => render(
  <MemoryRouter initialEntries={[`/app/intelligence${search}`]}>
    <Routes><Route path="/app/intelligence" element={<IntelligenceHub />} /></Routes>
  </MemoryRouter>,
)

function RevisionSwitchReview({ view }) {
  const navigate = useNavigate()
  return <>
    <IntelligenceHub />
    <button onClick={() => navigate(`/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-3${view ? `&view=${view}` : ''}`)}>Switch revision</button>
  </>
}

describe('Intelligence Hub', () => {
  beforeEach(() => {
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

  it.each([undefined, null])('shows omitted/null brief values as unavailable, not empty (%s)', (inputs) => {
    contextInputs = inputs
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context')
    expect(screen.getByText('Brief details unavailable for this revision.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Recorded acquisition notes' })).toHaveValue('Notes unavailable')
    expect(screen.queryByText('0/4 brief fields')).not.toBeInTheDocument()
  })

  it('renders real brief values independently of a failed evidence read and searches only its website', async () => {
    contextInputs = { companyName: 'Acme', marketRegion: 'UK', targetOffer: 'Cloud', companyWebsite: 'https://acme.example/', notes: 'Focus on proof' }
    missingSummaryEvidence = true
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context')
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Recorded acquisition notes' })).toHaveValue('Focus on proof')
    expect(screen.getByRole('textbox', { name: 'Recorded acquisition notes' })).toHaveAttribute('readonly')
    expect(screen.getByText('4/4 brief fields')).toBeInTheDocument()
    expect(screen.getByText('https://acme.example/')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Search brief website' }), 'other')
    expect(screen.getByText('No matching website.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start over with evidence' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Run acquisition in workbench ↗' })).toHaveAttribute('href', '/app/runtime/revision-2/workbench')
  })

  it('displays and searches every recorded brief website without treating them as connected', async () => {
    contextInputs = { companyWebsite: 'https://acme.example/', websiteSources: ['https://acme.example/', 'https://docs.acme.example/'] }
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context')
    expect(screen.getByText('2 recorded in brief')).toBeInTheDocument()
    expect(screen.getByText('https://acme.example/')).toBeInTheDocument()
    expect(screen.getByText('https://docs.acme.example/')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Search brief website' }), 'docs')
    await user.tab()
    expect(screen.getByRole('region', { name: 'Recorded brief websites' })).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('1 matching recorded website.')
    expect(screen.queryByText('https://acme.example/')).not.toBeInTheDocument()
    expect(screen.getByText('https://docs.acme.example/')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove https://docs.acme.example/' })).toBeDisabled()
    await user.clear(screen.getByRole('textbox', { name: 'Search brief website' }))
    await user.type(screen.getByRole('textbox', { name: 'Search brief website' }), 'missing')
    expect(screen.getByRole('status')).toHaveTextContent('0 matching recorded websites.')
  })

  it('clears the website filter when a cached revision replaces the selected Context', async () => {
    const user = userEvent.setup()
    cachedContextRevision = true
    contextInputs = { companyWebsite: 'https://previous.example/' }
    render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context']}>
      <Routes><Route path="/app/intelligence" element={<RevisionSwitchReview view="context" />} /></Routes>
    </MemoryRouter>)
    await user.type(screen.getByRole('textbox', { name: 'Search brief website' }), 'previous')
    contextInputs = { companyWebsite: 'https://current.example/' }
    await user.click(screen.getByRole('button', { name: 'Switch revision' }))
    expect(screen.getByRole('tab', { name: 'Context' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('textbox', { name: 'Search brief website' })).toHaveValue('')
    expect(screen.getByText('https://current.example/')).toBeInTheDocument()
    expect(screen.queryByText('https://previous.example/')).not.toBeInTheDocument()
  })

  it('distinguishes an exposed empty brief and preserves navigation context', async () => {
    contextInputs = {}
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context')
    expect(screen.getByText('0/4 brief fields')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Recorded acquisition notes' })).toHaveValue('')
    expect(screen.getByText('No website is recorded in the brief.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'About these actions' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('tab', { name: 'Context' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('button', { name: 'View current sources' }))
    expect(screen.getByRole('tab', { name: 'Sources' })).toHaveAttribute('aria-selected', 'true')
  })

  it('refreshes only the four bounded Context reads and announces pending counts', async () => {
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context')
    await user.click(screen.getByRole('button', { name: '↻ Refresh' }))
    expect(calls.refresh).toHaveBeenCalledTimes(4)
    const reads = calls.refresh.mock.calls.map(([name, args]) => ({ name, ...args }))
    expect(reads.filter((read) => read.pageSize === 1)).toHaveLength(3)
    expect(reads.some((read) => read.reviewStatus === 'REJECTED')).toBe(false)
    expect(calls.coverage.mock.calls.every(([, options]) => options.skip)).toBe(true)
  })

  it('keeps brief fields visible while counts load', () => {
    initialOverviewPending = true
    contextInputs = { companyName: 'Acme' }
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=context')
    expect(screen.getByText('Acme')).toBeInTheDocument()
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
    expect(summary.getAllByText('Unavailable')).toHaveLength(4)
  })
  it('makes the Review summary a named keyboard-focusable region', async () => {
    sourcePageFixture = sourceFixture()
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    const summary = screen.getByRole('region', { name: 'Evidence review summary' })
    expect(summary).toHaveAttribute('tabindex', '0')
    await user.click(screen.getByRole('textbox', { name: 'Search evidence candidates on this page' }))
    await user.tab()
    expect(summary).toHaveFocus()
    expect(within(summary).getByText('Unresolved decisions')).toBeInTheDocument()
  })
  it('preserves selected Review detail while searching and retains search across filters', async () => {
    sourcePageFixture = sourceFixture()
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    const queue = within(screen.getByRole('region', { name: 'Evidence candidate queue' }))
    const detail = within(screen.getByRole('region', { name: 'Selected evidence candidate' }))
    const search = screen.getByRole('textbox', { name: 'Search evidence candidates on this page' })
    await user.type(search, 'market')
    expect(queue.queryByText('Website discusses observability.')).not.toBeInTheDocument()
    expect(queue.getByText('Specialised infrastructure demand.')).toBeInTheDocument()
    expect(detail.getByRole('heading')).toHaveTextContent('Website discusses observability.')
    await user.click(screen.getByRole('button', { name: 'All', exact: true }))
    expect(search).toHaveValue('market')
    await user.click(screen.getByRole('button', { name: 'Clear evidence search' }))
    expect(search).toHaveFocus()
    expect(screen.getByRole('button', { name: '✓ Approve evidence' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '× Reject' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Complete review & continue →' })).toBeDisabled()
  })
  it.each([0, null])('renders actual confidence without fabricating missing scores (%s)', (score) => {
    sourcePageFixture = sourceFixture()
    sourcePageFixture.evidenceObjects[0].confidence = score === null ? null : { score, level: 'LOW' }
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    const detail = within(screen.getByRole('region', { name: 'Selected evidence candidate' }))
    expect(detail.getByText('Confidence').nextSibling).toHaveTextContent(score === null ? 'Unavailable' : 'Low · 0%')
    expect(detail.getByText('Coverage area').nextSibling).toHaveTextContent('Unavailable')
  })
  it('opens the selected source preserving revision and bounded page', async () => {
    sourcePageFixture = sourceFixture()
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    await user.click(screen.getByRole('button', { name: 'Next page', exact: true }))
    await user.click(within(screen.getByRole('region', { name: 'Evidence candidate queue' })).getByRole('button', { name: /Market research/ }))
    await user.click(screen.getByRole('button', { name: 'Open source →' }))
    expect(screen.getByRole('tab', { name: 'Sources' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Report.pdf' })).toBeInTheDocument()
    expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ runtimeInstanceId: 'revision-2', page: 2, pageSize: 25 }), expect.anything())
  })
  it('does not substitute another source when the linked source is absent', async () => {
    sourcePageFixture = (args) => ({ ...sourceFixture(), sourceRegistry: args.reviewStatus ? sourceFixture().sourceRegistry : [sourceFixture().sourceRegistry[1]] })
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=review')
    await user.click(screen.getByRole('button', { name: 'Open source →' }))
    expect(screen.getByText('The requested source is not present on this evidence page.')).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Approved', exact: true }))
    await user.type(screen.getByRole('textbox', { name: 'Search evidence candidates on this page' }), 'market')
    await user.click(screen.getByRole('button', { name: 'Switch revision' }))
    expect(screen.getByRole('textbox', { name: 'Search evidence candidates on this page' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Needs review', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(calls.evidence).toHaveBeenLastCalledWith(expect.objectContaining({ runtimeInstanceId: 'revision-3', reviewStatus: 'PENDING', page: 1 }), expect.anything())
  })

  it('searches evidence text and titles on the current source page and keeps filters page-local', async () => {
    sourcePageFixture = sourceFixture()
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources')
    const registry = within(screen.getByLabelText('Page-local source registry'))
    const search = screen.getByRole('textbox', { name: 'Search sources and evidence on this page' })
    await user.type(search, 'infrastructure')
    expect(registry.getByRole('button', { name: /Report.pdf/ })).toBeInTheDocument()
    expect(registry.queryByRole('button', { name: /Customer website/ })).not.toBeInTheDocument()
    await user.clear(search)
    await user.type(search, 'Market research')
    expect(registry.getByRole('button', { name: /Report.pdf/ })).toBeInTheDocument()
    await user.clear(search)
    await user.click(registry.getByRole('button', { name: 'Website', exact: true }))
    expect(registry.getByRole('button', { name: /Customer website/ })).toBeInTheDocument()
    expect(registry.queryByRole('button', { name: /Report.pdf/ })).not.toBeInTheDocument()
    await user.click(registry.getByRole('button', { name: 'All', exact: true }))
    expect(registry.getByRole('button', { name: /Company name/ })).toBeInTheDocument()
    await user.type(search, 'absent')
    expect(screen.getByText('No sources match on this page.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('0 matching sources on this page.')
  })

  it('includes section-uploaded documents in the Document filter', async () => {
    sourcePageFixture = sourceFixture()
    sourcePageFixture.sourceRegistry[1].sourceType = 'SECTION_UPLOADED_DOCUMENT'
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources')
    const registry = within(screen.getByLabelText('Page-local source registry'))
    await user.click(registry.getByRole('button', { name: 'Document', exact: true }))
    await user.click(registry.getByRole('button', { name: /Report.pdf/ }))
    expect(screen.getByText('Document source · Acquired')).toBeInTheDocument()
    expect(registry.queryByRole('button', { name: /Company name/ })).not.toBeInTheDocument()
  })

  it('shows only matching evidence across sources and restores detail when cleared or selected', async () => {
    sourcePageFixture = sourceFixture()
    sourcePageFixture.evidenceObjects.push(
      { evidenceObjectId: 'three', sourceId: 'web', extractedFact: 'Infrastructure growth.', reviewStatus: 'ACCEPTED' },
      { evidenceObjectId: 'four', sourceId: 'doc', extractedFact: 'Unrelated fact.', reviewStatus: 'ACCEPTED' },
    )
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources')
    const search = screen.getByRole('textbox', { name: 'Search sources and evidence on this page' })
    const detail = within(screen.getByLabelText('Source evidence'))
    const registry = within(screen.getByLabelText('Page-local source registry'))
    await user.type(search, 'infrastructure')
    expect(detail.getByRole('heading', { name: 'Evidence matching “infrastructure”' })).toBeInTheDocument()
    expect(detail.getByText('2 matching evidence objects across sources on this page')).toBeInTheDocument()
    expect(detail.queryByText('Unrelated fact.')).not.toBeInTheDocument()
    expect(detail.queryByText('Website discusses observability.')).not.toBeInTheDocument()
    await user.click(detail.getByRole('button', { name: /Report.pdf Inspect recorded lineage/ }))
    expect(within(screen.getByRole('dialog')).getByText('batch-doc-1')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(registry.getByRole('button', { name: 'Document', exact: true }))
    expect(detail.getByText('1 matching evidence objects across sources on this page')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(search).toHaveFocus()
    expect(detail.getByRole('heading', { name: 'Report.pdf' })).toBeInTheDocument()
    expect(detail.getByText('Unrelated fact.')).toBeInTheDocument()
    await user.type(search, 'Report.pdf')
    expect(detail.getByText('2 matching evidence objects across sources on this page')).toBeInTheDocument()
    await user.click(registry.getByRole('button', { name: /Report.pdf/ }))
    expect(search).toHaveValue('')
    expect(detail.getByRole('heading', { name: 'Report.pdf' })).toBeInTheDocument()
  })

  it('keeps unrecognized source types under All without inventing an input classification', async () => {
    sourcePageFixture = sourceFixture()
    sourcePageFixture.sourceRegistry[2].sourceType = 'FUTURE_SOURCE_TYPE'
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources')
    const registry = within(screen.getByLabelText('Page-local source registry'))
    await user.click(registry.getByRole('button', { name: /Company name/ }))
    expect(screen.getByText('Unknown source · Captured')).toBeInTheDocument()
    await user.click(registry.getByRole('button', { name: 'Document', exact: true }))
    expect(registry.queryByRole('button', { name: /Company name/ })).not.toBeInTheDocument()
    await user.click(registry.getByRole('button', { name: 'All', exact: true }))
    expect(registry.getByRole('button', { name: /Company name/ })).toBeInTheDocument()
  })

  it('retains the selected source across its provenance explanation and exposes actual states', async () => {
    sourcePageFixture = sourceFixture()
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources')
    const registry = within(screen.getByLabelText('Page-local source registry'))
    const selected = registry.getByRole('button', { name: /Report.pdf/ })
    await user.click(selected)
    expect(selected).toHaveAttribute('aria-pressed', 'true')
    const detail = within(screen.getByLabelText('Source evidence'))
    expect(detail.getByText('Pending')).toBeInTheDocument()
    await user.click(detail.getByRole('button', { name: /Inspect recorded lineage/ }))
    expect(screen.getByRole('dialog')).toHaveTextContent('batch-doc-1')
    expect(screen.getByRole('dialog')).toHaveTextContent('doc:second')
    expect(screen.getByRole('dialog')).toHaveTextContent('Candidate')
    await user.keyboard('{Escape}')
    expect(selected).toHaveAttribute('aria-pressed', 'true')
    expect(detail.getByRole('button', { name: /Inspect recorded lineage/ })).toHaveFocus()
  })

  it('renders every bounded linked evidence object without inventing classifications', () => {
    sourcePageFixture = { ...sourceFixture(), evidenceObjects: Array.from({ length: 6 }, (_, index) => ({ evidenceObjectId: `e-${index}`, sourceId: 'web', extractedFact: `Fact ${index}`, reviewStatus: 'ACCEPTED' })), total: 6 }
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources')
    const detail = within(screen.getByLabelText('Source evidence'))
    expect(detail.getAllByRole('article')).toHaveLength(6)
    expect(detail.getByText('Fact 5')).toBeInTheDocument()
    expect(detail.getAllByText('Evidence classification unavailable')).toHaveLength(6)
  })

  it('clears prior page rows while current data is pending instead of presenting stale details', () => {
    sourcePageFixture = sourceFixture()
    sourceCurrentPending = true
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources')
    expect(screen.queryByText('Report.pdf')).not.toBeInTheDocument()
    expect(screen.getByText('Loading sources…')).toBeInTheDocument()
    expect(screen.getByText('Loading selected-source evidence…')).toBeInTheDocument()
  })

  it('shows a source read failure separately from an empty successful page', () => {
    sourcePageError = true
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources')
    expect(screen.getByRole('alert')).toHaveTextContent('Sources could not be loaded.')
    expect(screen.queryByText('No sources are linked to this evidence page.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Source summary')).toHaveTextContent('UnavailableSources on page')
  })

  it.each(['failed refresh', 'missing read'])('does not announce zero search results for a %s', async (state) => {
    sourcePageFixture = sourceFixture()
    sourcePageError = state === 'failed refresh'
    sourcePageMissing = state === 'missing read'
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources')
    await user.type(screen.getByRole('textbox', { name: 'Search sources and evidence on this page' }), 'report')
    expect(screen.getByLabelText('Source summary')).toHaveTextContent('UnavailableSources on page')
    expect(within(screen.getByLabelText('Page-local source registry')).getByText('Unavailable')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    const results = screen.getByRole('region', { name: 'Evidence search results' })
    expect(results).toHaveAttribute('tabindex', '0')
    expect(results).toHaveTextContent(state === 'failed refresh' ? 'Matching evidence could not be loaded.' : 'Matching evidence is unavailable.')
    expect(screen.queryByText('0 matching evidence objects across sources on this page')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Source registry results' })).toHaveAttribute('tabindex', '0')
  })

  it('resets Sources page and search before querying a new cached revision', async () => {
    sourcePageFixture = (args) => ({ ...sourceFixture(), sourceRegistry: [{ sourceId: 'web', sourceType: 'WEBSITE', label: args.runtimeInstanceId === 'revision-3' ? 'Current website' : 'Previous website' }], totalPages: args.runtimeInstanceId === 'revision-3' ? 1 : 2 })
    cachedContextRevision = true
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources']}><Routes><Route path="/app/intelligence" element={<RevisionSwitchReview view="sources" />} /></Routes></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Next page', exact: true }))
    expect(within(screen.getByLabelText('Page-local source registry')).getByText('Page 2 of 2')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Search sources and evidence on this page' }), 'previous')
    calls.evidence.mockClear()
    await user.click(screen.getByRole('button', { name: 'Switch revision' }))
    expect(screen.getByRole('textbox', { name: 'Search sources and evidence on this page' })).toHaveValue('')
    expect(screen.getByText('1 shown · 1 on page 1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Current website' })).toBeInTheDocument()
    expect(calls.evidence.mock.calls.filter(([query]) => query.pageSize === 25).every(([query]) => query.runtimeInstanceId === 'revision-3' && query.page === 1)).toBe(true)
    expect(screen.queryByText('Page 2 of 1')).not.toBeInTheDocument()
  })

  it('refreshes four scoped Sources reads and keeps processing report informational', async () => {
    sourcePageFixture = sourceFixture()
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=sources')
    await user.click(screen.getByRole('button', { name: '↻ Refresh' }))
    expect(calls.refresh).toHaveBeenCalledTimes(4)
    expect(calls.refresh.mock.calls.every(([, query]) => query.runtimeInstanceId === 'revision-2' && query.customerId === 'customer-1' && query.tenantId === 'tenant-1')).toBe(true)
    expect(calls.refresh.mock.calls.filter(([, query]) => query.pageSize === 25)).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'View processing report', exact: true }))
    expect(screen.getByRole('dialog')).toHaveTextContent('downloadable logs are unavailable')
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to Sources' }))
    expect(screen.getByRole('tab', { name: 'Sources' })).toHaveAttribute('aria-selected', 'true')
  })

  it('refreshes all six bounded Overview reads for the selected revision', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('button', { name: /Refresh/ }))
    expect(calls.refresh).toHaveBeenCalledTimes(6)
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeRendererQuery', expect.objectContaining({ runtimeInstanceId: 'revision-2' }))
    for (const reviewStatus of [undefined, 'ACCEPTED', 'PENDING', 'REJECTED']) {
      expect(calls.refresh.mock.calls.some(([name, args]) => name === 'useGetRuntimeStateEvidenceQuery'
        && args.runtimeInstanceId === 'revision-2' && args.pageSize === 1 && args.reviewStatus === reviewStatus)).toBe(true)
    }
    expect(calls.refresh).toHaveBeenCalledWith('useGetRuntimeIntelligenceGraphCoverageQuery', { runtimeInstanceId: 'revision-2' })
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
    const user = userEvent.setup()
    show()
    expect(screen.getByRole('heading', { name: 'Intelligence Hub' })).toBeInTheDocument()
    expect(screen.getByText('Acme Workspace')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'Inspect source records →' }).closest('.intelligence-hub__metric'))
      .toHaveTextContent('2')
    expect(screen.getByText('Sources connected').nextElementSibling).toHaveTextContent('2')
    expect(screen.getByText('Evidence accepted').nextElementSibling).toHaveTextContent('2')
    const overviewStatusReads = calls.evidence.mock.calls.filter(([query]) => ['ACCEPTED', 'PENDING', 'REJECTED'].includes(query.reviewStatus))
    expect(overviewStatusReads).toHaveLength(3)
    expect(overviewStatusReads.every(([query, options]) => query.pageSize === 1 && options.skip === false)).toBe(true)
    expect(calls.manifest.mock.calls.at(-1)[1].skip).toBe(true)
    expect(calls.graph.mock.calls.at(-1)[1].skip).toBe(true)
    expect(calls.coverage.mock.calls.at(-1)[1].skip).toBe(false)
    await user.click(screen.getByRole('tab', { name: 'Sources' }))
    expect(calls.evidence.mock.calls.filter(([query]) => query.pageSize === 25).at(-1)[1].skip).toBe(false)
    expect(calls.coverage.mock.calls.at(-1)[1].skip).toBe(true)
    expect(calls.evidence.mock.calls.filter(([query]) => query.pageSize === 25).at(-1)[0]).toMatchObject({ runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', pageSize: 25 })
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
    expect(screen.getByRole('link', { name: /Review contradiction candidates/ })).toHaveTextContent('2 candidates recorded for human review.')
    expect(screen.getByRole('link', { name: /Review contradiction candidates/ })).toHaveAttribute('href', expect.stringContaining('revisionId=revision-2'))
    expect(screen.getByRole('button', { name: /Review Problems coverage/ })).toHaveTextContent('0 connected evidence · 0 pending review')
    expect(screen.getByRole('link', { name: 'Open quality findings →' })).toHaveAttribute('href', expect.stringContaining('runtimeInstanceId=workspace-1'))
    await user.click(screen.getByRole('button', { name: /Review Problems coverage/ }))
    expect(screen.getByRole('dialog')).toHaveTextContent('informational recommendation')
    expect(screen.getByRole('dialog')).toHaveTextContent('a person must review')
    await user.click(screen.getByRole('button', { name: 'Back to Overview' }))
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
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

  it('uses the same bounded graph coverage summary on Coverage without loading the graph manifest', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('tab', { name: 'Coverage' }))
    expect(calls.coverage.mock.calls.at(-1)[1].skip).toBe(false)
    expect(calls.manifest.mock.calls.at(-1)[1].skip).toBe(true)
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getByText('Per-domain percentage unavailable')).toBeInTheDocument()
    expect(screen.getByText('Connected evidence')).toBeInTheDocument()
  })

  it('uses server review filters and explains graph relationships without raw source text', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('tab', { name: 'Review' }))
    expect(calls.evidence.mock.calls.at(-1)[0].reviewStatus).toBe('PENDING')
    await user.click(screen.getByRole('button', { name: 'Approved', exact: true }))
    expect(calls.evidence.mock.calls.at(-1)[0].reviewStatus).toBe('ACCEPTED')
    await user.click(screen.getByRole('tab', { name: 'Intelligence Graph' }))
    expect(calls.graph.mock.calls.at(-1)[1].skip).toBe(false)
    expect(screen.queryByText('private raw source text')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Source/i }))
    expect(screen.getByText('Supports')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Source' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Gaps' }))
    expect(screen.getAllByText('Economics').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Impact' }))
    expect(screen.getAllByText('Output Reference').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Contradictions' }))
    expect(screen.getAllByText('Evidence ↔ Evidence').length).toBeGreaterThan(0)
  })

  it('keeps After lock inactive while the selected revision is unlocked', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('tab', { name: 'After lock' }))
    expect(screen.getByRole('heading', { name: 'After-lock review starts when the selected revision is locked' })).toBeInTheDocument()
    expect(screen.getAllByText('Not active').length).toBeGreaterThan(0)
    expect(screen.getByText('Post-lock inbox is not active because the selected revision is unlocked.')).toBeInTheDocument()
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
    readinessFields = { readiness: { state: 'LOCKED', reason: 'WRONG TOP LEVEL REASON', sectionTruth: { reason: 'Recorded section truth', readySectionCount: 5, requiredSectionCount: 5 } }, publish: { state: 'PUBLISHED', outputEligibility: { outputEligible: true } }, lock: { state: 'LOCKED', locked: true, snapshot: { snapshotId: 'recorded-lock-id' } } }
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    expect(screen.getByText('Recorded section truth')).toBeInTheDocument()
    expect(screen.queryByText('WRONG TOP LEVEL REASON')).not.toBeInTheDocument()
    expect(screen.getByText('5 of 5 required sections ready')).toBeInTheDocument()
    expect(screen.getByText('recorded-lock-id')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publish & lock revision' })).toBeDisabled()
    expect(within(screen.getByRole('region', { name: 'Selected assurance control' })).getAllByText('Unavailable').length).toBeGreaterThan(1)
    expect(screen.queryByText(/Working revision R/)).not.toBeInTheDocument()
  })
  it('keeps the selected control after report preview closes and preserves navigation context', async () => {
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    await user.click(screen.getByRole('button', { name: /Evidence acceptance Human review/ }))
    expect(screen.getByRole('heading', { name: 'Evidence acceptance' })).toBeInTheDocument()
    expect(screen.getByText('2 accepted')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Preview assurance report →' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Executive assurance summary' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Export PDF' })).toBeDisabled()
    await user.click(within(dialog).getByRole('button', { name: 'Close', exact: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Evidence acceptance' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open evidence review →' }))
    expect(screen.getByRole('tab', { name: 'Review' })).toHaveAttribute('aria-selected', 'true')
  })
  it('does not present missing or failed readiness evidence totals as zero', async () => {
    retainedStatusError = true
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    await user.click(screen.getByRole('button', { name: /Evidence acceptance Human review/ }))
    expect(screen.getByText('Unavailable accepted')).toBeInTheDocument()
    expect(screen.getByText('Unavailable awaiting review')).toBeInTheDocument()
    expect(screen.queryByText('0 accepted')).not.toBeInTheDocument()
  })
  it('refreshes only bounded readiness reads', async () => {
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    await user.click(screen.getByRole('button', { name: '↻ Refresh' }))
    expect(calls.refresh.mock.calls).toHaveLength(5)
    expect(calls.refresh.mock.calls.filter(([name]) => name === 'useGetRuntimeStateEvidenceQuery').every(([, args]) => args.pageSize === 1 && args.runtimeInstanceId === 'revision-2')).toBe(true)
  })

  it('does not fall back to renderer totals when the readiness evidence count is capped', () => {
    invalidSummaryTotal = 'capped'
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    expect(screen.getByText('2 sources · Unavailable evidence objects')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: 'Lock snapshot' }).closest('section')).getByText('Unlocked')).toBeInTheDocument()
  })
  it('resets the selected assurance control when the revision changes', async () => {
    cachedContextRevision = true
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/app/intelligence?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish']}><RevisionSwitchReview view="readiness-publish" /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: /Evidence acceptance Human review/ }))
    await user.click(screen.getByRole('button', { name: 'Switch revision' }))
    expect(screen.getByRole('heading', { name: 'Quality exceptions' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Selected assurance control' })).getByText('R3')).toBeInTheDocument()
  })

  it('opens assurance information locally and caps readiness runtime activity at ten events', async () => {
    readinessFields = { activity: Array.from({ length: 14 }, (_, i) => ({ id: 'event-' + i, summary: 'Recorded runtime event ' + i })) }
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    expect(screen.getByRole('link', { name: 'Open quality findings →' })).toHaveAttribute('href', '/app/intelligence/quality?runtimeInstanceId=workspace-1&revisionId=revision-2')
    await user.click(screen.getByRole('button', { name: /Intelligence assurance Assurance requires/ }))
    await user.click(screen.getByRole('button', { name: 'Understand assurance →' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('does not expose a named assurance-control receipt')
    await user.click(screen.getByRole('button', { name: 'Back to Readiness & publish' }))
    await user.click(screen.getByRole('button', { name: /Decision and audit history Decisions require/ }))
    await user.click(screen.getByRole('button', { name: 'View recorded activity →' }))
    expect(within(screen.getByRole('dialog')).getAllByRole('listitem')).toHaveLength(10)
    expect(screen.queryByText('Recorded runtime event 10')).not.toBeInTheDocument()
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

  it('renders the paper assurance report with actual evidence and no synthetic certification or audit totals', async () => {
    readinessFields = { publish: { state: 'PUBLISHED' }, activity: [{ id: 'one', summary: 'Generic runtime activity' }] }
    const user = userEvent.setup()
    show('?runtimeInstanceId=workspace-1&revisionId=revision-2&view=readiness-publish')
    await user.click(screen.getByRole('button', { name: 'Preview assurance report →' }))
    const dialog = screen.getByRole('dialog', { name: 'Intelligence assurance report' })
    expect(dialog).toHaveClass('intelligence-hub__report-dialog')
    expect(within(dialog).getByRole('heading', { name: 'Acme Workspace' })).toBeInTheDocument()
    expect(within(dialog).getByText('2')).toBeInTheDocument()
    expect(within(dialog).getByText('Published')).toBeInTheDocument()
    expect(within(dialog).getByText('Governed decisions').previousElementSibling).toHaveTextContent('Unavailable')
    expect(within(dialog).getByText('Audit events').previousElementSibling).toHaveTextContent('Unavailable')
    expect(within(dialog).getByRole('button', { name: 'Download data CSV' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Export PDF' })).toBeDisabled()
    expect(within(dialog).queryByText(/ASSURE-R|L3 assured/)).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Close report' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

})
