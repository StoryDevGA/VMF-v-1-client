import { render, screen } from '@testing-library/react'
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
vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: () => ({ customerId: 'customer-1', tenantId: 'tenant-1' }),
}))
vi.mock('../../store/api/runtimeInstanceApi.js', () => {
  const queries = {
  useGetRuntimeRendererQuery: () => ({ data: { data: emptyEvidenceTotal ? {
    ...renderer,
    discovery: { ...renderer.discovery, evidenceObjectSummary: { ...renderer.discovery.evidenceObjectSummary, evidenceObjectCount: 0 } },
  } : { ...renderer, discovery: { ...renderer.discovery, inputComplete: true, ...(contextInputs !== undefined ? { inputValues: contextInputs } : {}) } } }, isLoading: false, refetch: vi.fn() }),
  useGetRuntimeStateEvidenceQuery: (...args) => {
    calls.evidence(...args)
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
      data: { data: { evidenceObjects: emptyEvidenceTotal ? [] : [{}], sourceRegistry: [], total: emptyEvidenceTotal ? 0 : args[0].reviewStatus === 'ACCEPTED' ? 2 : args[0].reviewStatus === 'PENDING' && conflictingStatusCounts ? 2 : 1 } }, isLoading: false,
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
      : detailPending ? undefined : result.data
    return {
      ...result,
      data: initialOverviewPending && detailPending ? undefined : result.data,
      currentData,
      isFetching: detailPending || (name === 'useGetRuntimeRendererQuery' && (rendererRefreshing || pendingRendererContext)),
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
    contextInputs = undefined
    cachedContextRevision = false
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
})
