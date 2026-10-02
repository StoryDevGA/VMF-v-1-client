import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import GraphView from './GraphView.jsx'
import { buildGraphViewModel, graphRelationships } from './intelligenceGraphModel.js'

const graph = {
  graphHash: 'hash-1', graphVersion: '2.2',
  nodes: ['SOURCE', 'EVIDENCE', 'INTELLIGENCE', 'SIGNAL', 'SECTION_TRUTH', 'OUTPUT_REFERENCE'].map((nodeType, index) => ({ nodeId: `n${index}`, nodeType, label: 'private content', entityDisplayName: 'private name', metadata: { basis: 'private basis' }, coverageDomain: 'COMPANY' })),
  edges: [
    { fromNodeId: 'n0', toNodeId: 'n1', edgeType: 'SOURCE_PRODUCES_EVIDENCE' },
    { fromNodeId: 'n1', toNodeId: 'n2', edgeType: 'EVIDENCE_DERIVES_INTELLIGENCE' },
    { fromNodeId: 'n2', toNodeId: 'n4', edgeType: 'INTELLIGENCE_SUPPORTS_SECTION_TRUTH' },
    { fromNodeId: 'n4', toNodeId: 'n5', edgeType: 'CANONICAL_TRUTH_REFERENCED_BY_OUTPUT' },
    { fromNodeId: 'n2', toNodeId: 'n3', edgeType: 'NODE_HAS_SIGNAL' },
  ], coverage: { missingDomains: ['ECONOMICS', 'private domain'] }, projection: { truncated: true },
}
const props = { manifest: { status: 'CURRENT', graphHash: 'hash-1', graphVersion: '2.2', counts: { nodeCount: 100, edgeCount: 150 } }, graph, workspaceName: 'Current Workspace', revisionLabel: 'R3', qualityHref: '/app/intelligence-quality?revisionId=r3', workbenchHref: '/app/runtime/r3/workbench', onSelectView: vi.fn(), onOpenSources: vi.fn() }
const show = overrides => render(<MemoryRouter><GraphView {...props} {...overrides} /></MemoryRouter>)

describe('bounded Graph model', () => {
  it.each([[0, '0'], [1, '100'], [0.84, '84'], [74, '74']])('normalizes canonical ratios and legacy percentages: %s', (confidenceScore, percentage) => {
    const model = buildGraphViewModel({ nodes: [{ nodeId: 'e1', nodeType: 'EVIDENCE', customerVisible: true, metadata: { confidenceScore } }] })
    expect(model.nodes[0].subtitle).toBe(`Not projected · ${percentage}% confidence`)
  })
  it('retains quality alongside review and keeps different quality groups distinct', () => {
    const nodes = ['ORPHAN', 'LOW_QUALITY'].map((graphQualityState, index) => ({ nodeId: `e${index}`, nodeType: 'EVIDENCE', customerVisible: true, reviewStatus: 'ACCEPTED', graphQualityState }))
    const model = buildGraphViewModel({ nodes })
    expect(model.entries).toHaveLength(2)
    expect(model.nodes.map(node => node.subtitle)).toEqual(['Accepted · Orphan', 'Accepted · Low quality'])
    expect(model.nodes.map(node => node.quality)).toEqual(['Orphan', 'Low quality'])
  })
  it.each([
    ['CONNECTED', 'Connected'], ['ORPHAN', 'Orphan'], ['LOW_QUALITY', 'Low quality'],
    ['UNCLASSIFIED', 'Unclassified'], ['INVALID', 'Invalid'],
  ])('displays recorded graph quality %s without claiming evidence approval', (graphQualityState, state) => {
    const node = { nodeId: 'i1', nodeType: 'INTELLIGENCE', customerVisible: true, graphQualityState }
    expect(buildGraphViewModel({ nodes: [node] }).nodes[0].state).toBe(state)
    expect(buildGraphViewModel({ nodes: [{ ...node, reviewStatus: 'INVALID' }] }).nodes[0].state).toBe(state)
    expect(buildGraphViewModel({ nodes: [{ ...node, customerVisible: undefined }] }).nodes[0].state).toBe('Not projected')
  })
  it.each([['PENDING', 'Review'], ['ACCEPTED', 'Accepted'], ['REJECTED', 'Rejected']])('keeps recorded evidence review %s separate from quality', (reviewStatus, state) => {
    const node = { nodeId: 'e1', nodeType: 'EVIDENCE', customerVisible: true, reviewStatus, graphQualityState: 'CONNECTED' }
    expect(buildGraphViewModel({ nodes: [node] }).nodes[0].state).toBe(state)
  })
  it('omits unsupported confidence and cross-field states instead of inventing metadata', () => {
    const node = { nodeId: 'e1', nodeType: 'EVIDENCE', customerVisible: true, reviewStatus: 'CONNECTED', graphQualityState: 'ACCEPTED' }
    for (const confidence of ['ACCEPTED', 'HIGH', '74', -1, 101, Infinity, NaN]) {
      expect(buildGraphViewModel({ nodes: [{ ...node, metadata: { confidence } }] }).nodes[0].subtitle).toBe('Not projected')
    }
    expect(buildGraphViewModel({ nodes: [{ ...node, metadata: { confidenceScore: 101, confidence: 0 } }] }).nodes[0].subtitle).toBe('Not projected · 0% confidence')
  })
  it('groups matching display details while preserving identities and all member relationships', () => {
    const nodes = ['e1', 'e2', 'e3'].map(nodeId => ({ nodeId, nodeType: 'EVIDENCE', customerVisible: true, label: 'Products', coverageDomain: 'PRODUCTS', metadata: { confidenceScore: nodeId === 'e3' ? 72 : 74 } }))
    nodes.push({ nodeId: 'i1', nodeType: 'INTELLIGENCE', customerVisible: true, label: 'Products Signal' }, { nodeId: 'i2', nodeType: 'INTELLIGENCE', customerVisible: true, label: 'Products Signal' })
    const edges = [{ fromNodeId: 'e1', toNodeId: 'i1', edgeType: 'EVIDENCE_DERIVES_INTELLIGENCE' }, { fromNodeId: 'e2', toNodeId: 'i2', edgeType: 'EVIDENCE_DERIVES_INTELLIGENCE' }]
    const model = buildGraphViewModel({ nodes, edges })
    expect(model.nodes).toHaveLength(5)
    expect(model.entries).toHaveLength(3)
    expect(model.objectCount).toBe(5)
    const selected = model.entries[0]
    expect(selected.memberKeys).toEqual(['e1', 'e2'])
    expect(selected.count).toBe(2)
    expect(graphRelationships(model, selected)).toHaveLength(1)
    expect(graphRelationships(model, selected)[0]).toMatchObject({ count: 2, direction: 'Outgoing', object: { label: 'Products Signal' } })
    const varied = buildGraphViewModel({ nodes: [nodes[0], { ...nodes[0], nodeId: 'other', reviewStatus: 'REJECTED' }, { ...nodes[0], nodeId: 'domain', coverageDomain: 'MARKET' }] })
    expect(varied.entries).toHaveLength(3)
  })
  it.each([
    ['UNVALIDATED', 'Unvalidated', 'READY_FOR_REASONING', 'Ready for reasoning'],
    ['PARTIALLY_VALIDATED', 'Partially validated', 'NEEDS_EVIDENCE', 'Needs evidence'],
    ['VALIDATED', 'Validated', 'CONTRADICTION_UNRESOLVED', 'Contradiction unresolved'],
    ['CONTRADICTED', 'Contradicted', 'CONFIDENCE_INSUFFICIENT', 'Confidence insufficient'],
    ['REJECTED', 'Rejected', 'VALIDATION_REQUIRED', 'Validation required'],
    ['UNKNOWN', 'Unknown', 'NOT_APPLICABLE', 'Not applicable'],
  ])('preserves recorded API states %s and %s', (validationStatus, validation, reasoningStatus, reasoning) => {
    const model = buildGraphViewModel({ nodes: [{ nodeId: 'e1', nodeType: 'EVIDENCE', customerVisible: true, metadata: { validationStatus, reasoningStatus } }] })
    expect(model.nodes[0]).toMatchObject({ validation, reasoning })
  })
  it('uses explicitly visible API titles and bounded scores without collapsing repeated labels', () => {
    const nodes = [0, 1].map(index => ({ nodeId: `e${index}`, nodeType: 'EVIDENCE', customerVisible: true, label: ' Value Drivers ', reviewStatus: 'ACCEPTED', metadata: { confidenceScore: index ? 72 : 74, validationStatus: 'PARTIALLY_VALIDATED', reasoningStatus: 'READY_FOR_REASONING', basis: 'private basis' } }))
    const model = buildGraphViewModel({ nodes })
    expect(model.nodes.map(node => node.label)).toEqual(['Value Drivers', 'Value Drivers'])
    expect(model.nodes.map(node => node.key)).toEqual(['e0', 'e1'])
    expect(model.nodes[0]).toMatchObject({ typeLabel: 'Evidence', subtitle: 'Accepted · 74% confidence', validation: 'Partially validated', reasoning: 'Ready for reasoning' })
    expect(buildGraphViewModel({ nodes }, 'Journey', 'value drivers').entries).toHaveLength(2)
    expect(JSON.stringify(model)).not.toContain('private basis')
    const invalid = buildGraphViewModel({ nodes: [{ ...nodes[0], label: ' ', metadata: { confidenceScore: 101, confidence: NaN, validationStatus: '__proto__', reasoningStatus: 'private status' } }] }).nodes[0]
    expect(invalid).toMatchObject({ label: 'Evidence', subtitle: 'Accepted', validation: '', reasoning: '' })
  })
  it('retains every API-supported missing domain including Consequences', () => {
    const domains = ['COMPANY', 'PRODUCTS', 'SERVICES', 'MARKET', 'ECONOMICS', 'PROBLEMS', 'CONSEQUENCES', 'STAKEHOLDERS', 'PROOF', 'DIFFERENTIATION']
    const model = buildGraphViewModel({ coverage: { missingDomains: domains } }, 'Gaps')
    expect(model.entries.map(item => item.domain.toUpperCase())).toEqual(domains)
    expect(model.gaps).toHaveLength(10)
  })
  it('never exposes serialized content or edges to hidden or unknown endpoints', () => {
    const model = buildGraphViewModel({ ...graph, nodes: [...graph.nodes, { nodeId: 'hidden', nodeType: 'EVIDENCE', customerVisible: false }, { nodeId: 'unknown', nodeType: '__proto__' }], edges: [...graph.edges,
      { fromNodeId: 'n0', toNodeId: 'hidden', edgeType: 'SOURCE_PRODUCES_EVIDENCE' },
      { fromNodeId: 'n0', toNodeId: 'n1', edgeType: 'UNKNOWN', relationshipDisplayName: 'private relation' },
    ] })
    expect(model.edges).toHaveLength(5)
    expect(model.nodes).toHaveLength(6)
    expect(JSON.stringify(model)).not.toMatch(/private/)
  })
  it('uses directed recorded lineage and impact, handles cycles, and keeps gaps diagnostic', () => {
    expect(buildGraphViewModel(graph, 'Lineage').entries.map(n => n.key)).toEqual(['n0', 'n1', 'n2', 'n4'])
    expect(buildGraphViewModel(graph, 'Impact').entries.map(n => n.key)).toEqual(['n2', 'n3', 'n4', 'n5'])
    const cycle = { ...graph, edges: [...graph.edges, { fromNodeId: 'n4', toNodeId: 'n2', edgeType: 'INTELLIGENCE_SUPPORTS_CONSUMER' }] }
    expect(buildGraphViewModel(cycle, 'Impact').entries).toHaveLength(4)
    const gaps = buildGraphViewModel(graph, 'Gaps')
    expect(gaps.entries[0].label).toBe('Economics')
    expect(gaps.entries).toHaveLength(1)
    expect(graphRelationships(gaps, gaps.entries[0])).toEqual([])
  })
  it('requires actual contradiction edges and searches only safe labels within a mode', () => {
    expect(buildGraphViewModel(graph, 'Contradictions').entries).toEqual([])
    const conflict = { ...graph, edges: [...graph.edges, { fromNodeId: 'n1', toNodeId: 'n2', edgeType: 'INTELLIGENCE_CONTRADICTS_INTELLIGENCE' }] }
    expect(buildGraphViewModel(conflict, 'Contradictions').entries).toHaveLength(2)
    expect(buildGraphViewModel(graph, 'Journey', 'private').entries).toEqual([])
    expect(buildGraphViewModel(graph, 'Journey', 'company').entries).toHaveLength(6)
  })
})

describe('Intelligence Graph', () => {
  it('renders six layers and truthful totals, selects objects and clears search', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText(/Partial projection/)).toBeInTheDocument()
    const inspector = screen.getByRole('region', { name: 'Selected graph object' })
    await user.click(screen.getByRole('button', { name: /^Source Company/ }))
    expect(within(inspector).getByRole('heading', { name: 'Source' })).toBeInTheDocument()
    expect(within(inspector).getByText('Produces evidence')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Search this graph view' }), 'no match')
    expect(screen.queryByRole('button', { name: /^Source Company/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear graph search' }))
    expect(screen.getByRole('textbox', { name: 'Search this graph view' })).toHaveFocus()
    expect(screen.getByRole('button', { name: /^Source Company/ })).toBeInTheDocument()
    expect(screen.queryByText(/private/)).not.toBeInTheDocument()
  })
  it.each([{ isLoading: true }, { error: { status: 503 } }, { manifest: { status: 'STALE' } }, { graph: null }, { graph: { ...graph, graphHash: 'different-generation' } }, { graph: { ...graph, graphVersion: 'old-version' } }])('hides retained graph and totals when unavailable: %j', overrides => {
    show(overrides)
    expect(screen.queryByRole('button', { name: /^Source Company/ })).not.toBeInTheDocument()
    expect(screen.queryByText('100')).not.toBeInTheDocument()
    expect(screen.queryByText('150')).not.toBeInTheDocument()
  })
  it('preserves selected context in destination links and source/view actions', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.getByRole('link', { name: /Open technical graph/ })).toHaveAttribute('href', props.workbenchHref)
    await user.click(screen.getByRole('button', { name: 'Inspect supporting source →' }))
    expect(props.onOpenSources).toHaveBeenCalledWith('Company')
    await user.click(screen.getByRole('button', { name: /Gaps/ }))
    expect(screen.getByRole('link', { name: 'Open in Intelligence Quality →' })).toHaveAttribute('href', props.qualityHref)
    await user.click(screen.getByRole('button', { name: '← Readiness & publish' }))
    expect(props.onSelectView).toHaveBeenCalledWith('Readiness & publish')
  })
})

