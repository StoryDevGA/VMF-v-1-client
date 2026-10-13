import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import GraphView from './GraphView.jsx'
import { buildGraphViewModel, graphRelationships, readGraphInspection, writeGraphInspection, resolveGraphSelection, graphSourceFocus, graphSourceDestination, graphSourceParams, graphSourceReturnHref, graphContextReturnHref } from './intelligenceGraphModel.js'

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

describe('section-local graph source ownership', () => {
  const scope = { workspaceId: 'workspace', revisionId: 'revision', customerId: 'customer', tenantId: 'tenant' }
  const focus = { sourceId: 'document', evidenceObjectId: 'fact', sectionLocal: true, sectionKey: 'strategic_objectives' }
  const fixture = () => ({ sectionStateSource: 'runtime_state_v2', runtimeInstance: { id: 'revision', customerId: 'customer', tenantId: 'tenant' },
    revision: { rootRuntimeInstanceKey: 'workspace', lineage: [{ runtimeInstanceId: 'revision', relationship: 'CURRENT' }] },
    sections: [{ sectionKey: 'strategic-objectives', runtimePath: 'framework_state.sections.strategic_objectives', visible: true,
      sectionEvidence: { documents: [{ sourceId: 'document', sectionDocumentId: 'document' }],
        evidenceObjects: [{ evidenceObjectId: 'fact', sourceId: 'document', sectionKey: 'strategic-objectives', runtimePath: 'framework_state.sections.strategic_objectives' }] } }] })
  it.each(['strategic_objectives', 'strategic-objectives'])('uses explicit owning membership with declared/native parity %s', sectionKey => {
    const result = graphSourceDestination(fixture(), { ...focus, sectionKey }, scope)
    expect(result).toEqual({ kind: 'section', label: 'Open section evidence review →', href: '/app/workspace-structure?runtimeInstanceId=workspace&revisionId=revision&section=strategic-objectives&sectionView=review' })
  })
  it('locates source-only receipts without inventing a native section key', () => {
    expect(graphSourceDestination(fixture(), { sourceId: 'document' }, scope)).toMatchObject({ kind: 'section', label: 'Open supporting files →', href: expect.stringContaining('sectionView=context') })
  })
  it('keeps unrelated global sources on their existing contract', () => {
    expect(graphSourceDestination(fixture(), { sourceId: 'global', evidenceObjectId: 'global-fact' }, scope)).toEqual({ kind: 'global' })
  })
  it.each(['missing document', 'missing evidence', 'duplicate document', 'duplicate evidence', 'different source', 'different path', 'different declared key', 'different native key', 'hidden section', 'wrong tenant', 'wrong revision', 'duplicate section', 'legacy owner', 'invalid path'])('withholds known-local %s instead of global fallback', condition => {
    const renderer = fixture(), row = renderer.sections[0], item = row.sectionEvidence.evidenceObjects[0]
    const selected = { ...focus }
    if (condition === 'missing document') row.sectionEvidence.documents = []
    if (condition === 'missing evidence') row.sectionEvidence.evidenceObjects = []
    if (condition === 'duplicate document') row.sectionEvidence.documents.push({ ...row.sectionEvidence.documents[0] })
    if (condition === 'duplicate evidence') row.sectionEvidence.evidenceObjects.push({ ...item })
    if (condition === 'different source') item.sourceId = 'other'
    if (condition === 'different path') item.runtimePath = 'framework_state.sections.other'
    if (condition === 'different declared key') item.sectionKey = 'other'
    if (condition === 'different native key') selected.sectionKey = 'other'
    if (condition === 'hidden section') row.visible = false
    if (condition === 'wrong tenant') renderer.runtimeInstance.tenantId = 'other'
    if (condition === 'wrong revision') renderer.runtimeInstance.id = 'other'
    if (condition === 'duplicate section') renderer.sections.push(structuredClone(row))
    if (condition === 'legacy owner') renderer.sectionStateSource = 'framework_state'
    if (condition === 'invalid path') row.runtimePath += '.nested'
    expect(graphSourceDestination(renderer, selected, scope)).toEqual({ kind: 'unavailable', label: 'Section source unavailable' })
  })
  it('uses canonical local namespace only to reject missing ownership', () => {
    const selected = buildGraphViewModel({ nodes: [{ nodeId: 'evidence:section:opaque', nodeType: 'EVIDENCE', customerVisible: true, sourceId: 'missing', evidenceObjectId: 'missing-fact' }] }).nodes[0]
    expect(graphSourceDestination(fixture(), graphSourceFocus(selected), scope).kind).toBe('unavailable')
  })
  it('retains the actual native key as provenance without converting it to a route slug', () => {
    const selected = buildGraphViewModel({ nodes: [{ nodeId: 'opaque', nodeType: 'EVIDENCE', customerVisible: true, sourceId: 'document', evidenceObjectId: 'fact', sectionKey: 'strategic_objectives' }] }).nodes[0]
    expect(graphSourceFocus(selected)).toEqual(focus)
  })
})
function ControlledGraph({ overrides }) {
  const [inspection, setInspection] = useState(overrides?.inspection || { mode: 'Journey', search: '', selectedKey: '', invalid: false })
  return <GraphView {...props} {...overrides} inspection={inspection} onInspectionChange={patch => setInspection(current => ({ ...current, ...patch, invalid: false }))} />
}
const inspectCurrent=()=>{const button=screen.queryByRole('button',{name:'Inspect selected',exact:true});if(button&&!button.disabled){fireEvent.click(button);const advanced=screen.queryByText('Recorded object inspection',{selector:'summary'});if(advanced)fireEvent.click(advanced)}}
const show=overrides=>{const view=render(<MemoryRouter><ControlledGraph overrides={overrides}/></MemoryRouter>);inspectCurrent();return view}

describe('scoped Graph inspection URL', () => {
  const context = 'workspace:revision:customer:tenant'
  const parsed = query => readGraphInspection(new URLSearchParams(query), context)
  it('retains mutually exclusive canonical evidence and exact Sources/Context return without fabricating node IDs', () => {
    const params = writeGraphInspection(new URLSearchParams('findingId=exact-finding'), context,
      { mode: 'Lineage', evidenceObjectId: 'canonical:outside', selectedKey: '', search: '', objectView: 'object' })
    const inspection = readGraphInspection(params, context)
    expect(inspection).toMatchObject({ evidenceObjectId: 'canonical:outside', selectedKey: '', objectView: 'object', invalid: false })
    expect(params.has('graphObjectId')).toBe(false)
    const model = buildGraphViewModel(graph)
    expect(resolveGraphSelection(model, inspection)).toEqual({ group: null, selected: null })
    const source = graphSourceParams(params, context, { sourceId: 'canonical-source', evidenceObjectId: 'canonical:outside' })
    expect(graphSourceReturnHref(source, context)).toContain('graphEvidenceObjectId=canonical%3Aoutside')
    params.set('graphContextReturn', 'inspection')
    expect(graphContextReturnHref(params, context)).toContain('graphEvidenceObjectId=canonical%3Aoutside')
    const changed = writeGraphInspection(params, context, { mode: 'Journey', selectedKey: 'actual-node', objectView: 'object' })
    expect(changed.has('graphEvidenceObjectId')).toBe(false)
  })
  it.each(['graphObjectId=conflict', 'graphMode=Gaps', 'graphObjectView=group',
    'graphEvidenceObjectId=%00bad', 'graphEvidenceObjectId=runtime_evidence_objects', 'graphEvidenceObjectId=' + 'x'.repeat(241)])('rejects invalid canonical evidence navigation %s', invalid => {
    const input = new URLSearchParams('graphInspectionContext=' + context + '&graphMode=Lineage&graphObjectView=object&graphEvidenceObjectId=canonical')
    for (const [key, value] of new URLSearchParams(invalid)) input.set(key, value)
    expect(readGraphInspection(input, context).invalid).toBe(true)
  })
  it('rejects duplicate canonical graph identities', () => {
    expect(parsed('graphInspectionContext=' + context + '&graphMode=Lineage&graphObjectView=object&graphEvidenceObjectId=first&graphEvidenceObjectId=second').invalid).toBe(true)
  })
  it('retains only exact scoped mode, raw search and stable identity, leaving unrelated route parameters intact', () => {
    const params = writeGraphInspection(new URLSearchParams('view=intelligence-graph&revisionId=revision'), context,
      { mode: 'Lineage', search: ' Proof & sources ', selectedKey: 'evidence:version-1' })
    expect(readGraphInspection(params, context)).toEqual({ mode: 'Lineage', search: ' Proof & sources ', selectedKey: 'evidence:version-1', objectView: 'group', afterEdgeKey: '', invalid: false })
    expect(params.get('revisionId')).toBe('revision')
    expect(readGraphInspection(params, 'workspace:other:customer:tenant')).toEqual({ mode: 'Journey', search: '', selectedKey: '', objectView: 'group', afterEdgeKey: '', invalid: false })
  })
  it.each(['graphMode=Other', 'graphMode=Lineage&graphMode=Impact', 'graphQuery=one&graphQuery=two',
    'graphObjectId=one&graphObjectId=two', 'graphObjectId=%20%20', 'graphQuery=%00', 'graphObjectId=%0A',
    'graphQuery=' + 'x'.repeat(241), 'graphObjectId=' + 'x'.repeat(241), 'graphInspectionContext=' + context,
    'graphObjectView=Other', 'graphObjectView=object', 'graphObjectView=group&graphObjectView=object'])('rejects malformed same-scope navigation %s', query => {
    expect(parsed('graphInspectionContext=' + context + '&' + query)).toMatchObject({ invalid: true, selectedKey: '', search: '', mode: 'Journey' })
  })
  it.each(['Journey', 'Lineage', 'Impact', 'Gaps', 'Contradictions'])('accepts the existing mode %s', mode => {
    expect(parsed('graphInspectionContext=' + context + '&graphMode=' + mode)).toMatchObject({ mode, invalid: false })
  })
  it('preserves individual view with its exact identity', () => {
    const params = writeGraphInspection(new URLSearchParams(), context, { mode: 'Journey', search: '', selectedKey: 'second', objectView: 'object' })
    expect(readGraphInspection(params, context)).toMatchObject({ selectedKey: 'second', objectView: 'object', invalid: false })
  })
})

const groupedGraph = {
  ...graph, nodes: [
    ...['first', 'second', 'third'].map(nodeId => ({ nodeId, nodeType: 'EVIDENCE', customerVisible: true, label: 'Products', coverageDomain: 'PRODUCTS' })),
    { nodeId: 'intel-1', nodeType: 'INTELLIGENCE', customerVisible: true, label: 'First intelligence' },
    { nodeId: 'intel-2', nodeType: 'INTELLIGENCE', customerVisible: true, label: 'Second intelligence' },
  ], edges: [
    { edgeId: 'edge-first', fromNodeId: 'first', toNodeId: 'intel-1', edgeType: 'EVIDENCE_DERIVES_INTELLIGENCE' },
    { edgeId: 'edge-second', fromNodeId: 'second', toNodeId: 'intel-2', edgeType: 'EVIDENCE_DERIVES_INTELLIGENCE' },
    { edgeId: 'edge-third', fromNodeId: 'third', toNodeId: 'intel-1', edgeType: 'EVIDENCE_DERIVES_INTELLIGENCE' },
  ],
}

describe('bounded individual Graph inspection', () => {
  it('keeps a clicked multi-object entry in group inspection', async () => {
    const change = vi.fn()
    render(<MemoryRouter><GraphView {...props} graph={groupedGraph}
      inspection={{ mode: 'Journey', search: '', selectedKey: 'intel-1', objectView: 'object', invalid: false }} onInspectionChange={change} /></MemoryRouter>)
    await userEvent.setup().click(within(screen.getByRole('region', { name: 'Evidence objects' })).getByRole('button'))
    expect(change).toHaveBeenCalledWith({ selectedKey: 'first', objectView: 'group', afterEdgeKey:'' })
  })
  it('keeps a coverage diagnostic out of native object inspection', async () => {
    const change = vi.fn()
    render(<MemoryRouter><GraphView {...props}
      inspection={{ mode: 'Gaps', search: '', selectedKey: 'gap:ECONOMICS', objectView: 'group', invalid: false }} onInspectionChange={change} /></MemoryRouter>)
    await userEvent.setup().click(within(screen.getByRole('region', { name: 'Intelligence objects' })).getByRole('button'))
    expect(change).toHaveBeenCalledWith({ selectedKey: 'gap:ECONOMICS', objectView: 'group', afterEdgeKey:'' })
    expect(screen.queryByRole('region', { name: 'Selected object neighbourhood' })).not.toBeInTheDocument()
  })
  it('opens delivered member identities, inspects only one object relationships and returns to the group', async () => {
    const user = userEvent.setup()
    show({ graph: groupedGraph, inspection: { mode: 'Journey', search: '', selectedKey: 'first', objectView: 'group', invalid: false } })
    await user.click(screen.getByRole('button', { name: 'Inspect 3 individual objects' }))
    const dialog = screen.getByRole('dialog', { name: 'Objects in selected graph group' })
    expect(within(dialog).getByText('first')).toBeInTheDocument(); expect(within(dialog).getByText('second')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Products second' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    inspectCurrent()
    const inspector = screen.getByRole('region', { name: 'Selected graph object' })
    expect(within(inspector).getByText('second')).toBeInTheDocument()
    expect(within(inspector).getByText('Second intelligence', { exact: false })).toBeInTheDocument()
    expect(within(inspector).queryByText('First intelligence', { exact: false })).not.toBeInTheDocument()
    expect(within(inspector).getByText(/Exact source\/evidence provenance is unavailable/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Return to group' }))
    inspectCurrent()
    expect(within(screen.getByRole('region',{name:'Selected graph object'})).getByText('3 separate objects with the same displayed details.')).toBeInTheDocument()
  })
  it.each(['first', 'second', 'third'])('resolves exact individual %s despite reordered group representatives', key => {
    const model = buildGraphViewModel({ ...groupedGraph, nodes: [...groupedGraph.nodes].reverse() })
    const { selected } = resolveGraphSelection(model, { selectedKey: key, objectView: 'object' })
    expect(selected.key).toBe(key)
    expect(selected.memberKeys).toBeUndefined()
    expect(graphRelationships(model, selected).reduce((sum, item) => sum + item.count, 0)).toBe(1)
  })
  it('does not invent missing, filtered or diagnostic objects', () => {
    for (const [mode, search, key] of [['Journey', '', 'missing'], ['Journey', 'unknown', 'second'], ['Gaps', '', 'gap:ECONOMICS']]) {
      expect(resolveGraphSelection(buildGraphViewModel(groupedGraph, mode, search), { selectedKey: key, objectView: 'object' }).selected).toBeUndefined()
    }
  })
  it.each([{ isLoading: true }, { error: { status: 503 } }, { active: false },
    { graph: { ...groupedGraph, graphHash: 'new-hash' } }, { graph: { ...groupedGraph, nodes: groupedGraph.nodes.filter(node => node.nodeId !== 'third') } }])('invalidates open member inspection during current-read change %j', async changes => {
    const user = userEvent.setup(), overrides = { graph: groupedGraph, inspection: { mode: 'Journey', search: '', selectedKey: 'first', invalid: false } }
    const rendered = show(overrides)
    await user.click(screen.getByRole('button', { name: 'Inspect 3 individual objects' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    rendered.rerender(<MemoryRouter><ControlledGraph overrides={{ ...overrides, ...changes }} /></MemoryRouter>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rendered.rerender(<MemoryRouter><ControlledGraph overrides={overrides} /></MemoryRouter>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('supports explicit member-list close without changing selection', async () => {
    const user = userEvent.setup()
    show({ graph: groupedGraph, inspection: { mode: 'Journey', search: '', selectedKey: 'second', objectView: 'object', invalid: false } })
    await user.click(screen.getByRole('button', { name: 'Inspect 3 individual objects' }))
    await user.click(screen.getByRole('button', { name: 'Close member inspection' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    inspectCurrent()
    expect(within(screen.getByRole('region', { name: 'Selected graph object' })).getByText('second')).toBeInTheDocument()
  })
  it('wraps keyboard focus inside the member dialog in both directions', async () => {
    const user = userEvent.setup()
    show({ graph: groupedGraph, inspection: { mode: 'Journey', search: '', selectedKey: 'second', objectView: 'object', invalid: false } })
    await user.click(screen.getByRole('button', { name: 'Inspect 3 individual objects' }))
    const close = screen.getByRole('button', { name: 'Close dialog' })
    const footer = screen.getByRole('button', { name: 'Close member inspection' })
    footer.focus(); await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(footer).toHaveFocus()
  })
})

describe('bounded Graph model', () => {
  it.each([[0, '0'], [1, '100'], [0.84, '84'], [74, '74']])('normalizes canonical ratios and legacy percentages: %s', (confidenceScore, percentage) => {
    const model = buildGraphViewModel({ nodes: [{ nodeId: 'e1', nodeType: 'EVIDENCE', customerVisible: true, metadata: { confidenceScore } }] })
    expect(model.nodes[0].subtitle).toBe(`Review/quality state unavailable · ${percentage}% confidence`)
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
    expect(buildGraphViewModel({ nodes: [{ ...node, customerVisible: undefined }] }).nodes[0].state).toBe('Review/quality state unavailable')
  })
  it.each([['PENDING', 'Review'], ['ACCEPTED', 'Accepted'], ['REJECTED', 'Rejected']])('keeps recorded evidence review %s separate from quality', (reviewStatus, state) => {
    const node = { nodeId: 'e1', nodeType: 'EVIDENCE', customerVisible: true, reviewStatus, graphQualityState: 'CONNECTED' }
    expect(buildGraphViewModel({ nodes: [node] }).nodes[0].state).toBe(state)
  })
  it('omits unsupported confidence and cross-field states instead of inventing metadata', () => {
    const node = { nodeId: 'e1', nodeType: 'EVIDENCE', customerVisible: true, reviewStatus: 'CONNECTED', graphQualityState: 'ACCEPTED' }
    for (const confidence of ['ACCEPTED', 'HIGH', '74', -1, 101, Infinity, NaN]) {
      expect(buildGraphViewModel({ nodes: [{ ...node, metadata: { confidence } }] }).nodes[0].subtitle).toBe('Review/quality state unavailable')
    }
    expect(buildGraphViewModel({ nodes: [{ ...node, metadata: { confidenceScore: 101, confidence: 0 } }] }).nodes[0].subtitle).toBe('Review/quality state unavailable · 0% confidence')
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
  it('restores a nonrepresentative saved member to its correct reordered group', () => {
    const grouped = { ...graph, nodes: ['second', 'first'].map(nodeId => ({ nodeId, nodeType: 'EVIDENCE',
      customerVisible: true, label: 'Shared Products', coverageDomain: 'PRODUCTS' })) }
    show({ graph: grouped, inspection: { mode: 'Journey', search: '', selectedKey: 'first', invalid: false } })
    const inspector = screen.getByRole('region', { name: 'Selected graph object' })
    expect(within(inspector).getByRole('heading', { name: 'Shared Products' })).toBeInTheDocument()
    expect(within(inspector).getByText('2 separate objects with the same displayed details.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Shared Products/ })).toHaveAttribute('aria-pressed', 'true')
  })
  it.each([{ selectedKey: 'missing', search: '' }, { selectedKey: 'n0', search: 'unmatched' }])('does not substitute a different object for explicit missing or filtered identity %j', state => {
    show({ inspection: { mode: 'Journey', invalid: false, ...state } })
    expect(within(screen.getByRole('region', { name: 'Selected graph object' })).getByText(/requested graph object is not displayed/)).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Selected graph object' })).queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByText(/Change the mode or search, or choose a displayed object/)).toBeInTheDocument()
  })
  it('directs an omitted exact object to its existing neighbourhood without claiming that read succeeded', () => {
    show({ inspection: { mode: 'Lineage', search: '', selectedKey: 'section-truth:runtime:customer-context:hash', objectView: 'object', invalid: false }, neighbourhoodEnabled: true, neighbourhoodLoading: true })
    expect(screen.getByText(/Inspect its object neighbourhood below; another object is not substituted if that read is unavailable/)).toBeInTheDocument()
    expect(screen.queryByText(/Change the mode or search/)).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Selected object neighbourhood' })).toHaveTextContent('Loading recorded connections')
  })
  it('invalid same-scope navigation hides retained data and choosing a mode restores inspection', async () => {
    const user = userEvent.setup()
    show({ inspection: { mode: 'Journey', search: '', selectedKey: '', invalid: true } })
    expect(screen.queryByText('100')).not.toBeInTheDocument()
    expect(screen.getAllByRole('status').some(node=>node.textContent.includes('inspection link is invalid'))).toBe(true); expect(within(screen.getByRole('region',{name:'Graph layers'})).queryByRole('button')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lineage' }))
    expect(screen.getByRole('status')).toHaveTextContent('view')
  })
  it('hidden Graph panels never automatically persist a selection', () => {
    const change = vi.fn()
    render(<MemoryRouter><GraphView {...props} active={false} inspection={{ mode: 'Journey', search: '', selectedKey: '', invalid: false }} onInspectionChange={change} /></MemoryRouter>)
    expect(change).not.toHaveBeenCalled()
  })
  it('renders six layers and inspects truthful totals, selects objects and clears search', async () => {
    const user=userEvent.setup();show()
    await user.click(screen.getByRole('button',{name:'Back to Intelligence Graph'}));await user.click(screen.getByRole('button',{name:'Graph basis',exact:true}))
    expect(screen.getByRole('dialog')).toHaveTextContent('100 objects; 150 relationships')
    await user.click(screen.getByRole('button',{name:'Back to Intelligence Graph'}))
    expect(screen.getAllByRole('heading',{level:2})).toHaveLength(6)
    await user.click(within(screen.getByRole('region',{name:'Source objects'})).getByRole('button'))
    inspectCurrent();const inspector=screen.getByRole('region',{name:'Selected graph object'});expect(within(inspector).getByText('Produces evidence')).toBeInTheDocument()
    await user.click(screen.getByRole('button',{name:'Back to Intelligence Graph'}))
    await user.type(screen.getByRole('searchbox',{name:'Search this graph view'}),'no match')
    expect(within(screen.getByRole('region',{name:'Source objects'})).queryByRole('button')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button',{name:'Clear graph search'}));expect(screen.getByRole('searchbox',{name:'Search this graph view'})).toHaveFocus()
    expect(within(screen.getByRole('region',{name:'Source objects'})).getByRole('button')).toBeInTheDocument()
    expect(screen.queryByText(/private/)).not.toBeInTheDocument()
  })
  it.each([{ isLoading: true }, { error: { status: 503 } }, { manifest: { status: 'STALE' } }, { graph: null }, { graph: { ...graph, graphHash: 'different-generation' } }, { graph: { ...graph, graphVersion: 'old-version' } }])('hides retained graph and totals when unavailable: %j', overrides => {
    show(overrides)
    expect(screen.queryByRole('button', { name: /^Source Company/ })).not.toBeInTheDocument()
    expect(screen.queryByText('100')).not.toBeInTheDocument()
    expect(screen.queryByText('150')).not.toBeInTheDocument()
  })
  it('preserves selected context in source and modern peer navigation',async()=>{
    const user=userEvent.setup();show();expect(screen.queryByRole('link',{name:/workbench/})).not.toBeInTheDocument()
    await user.click(screen.getByRole('button',{name:'Search sources by domain →'}));expect(props.onOpenSources).toHaveBeenCalledWith('Company')
    await user.click(screen.getByRole('button',{name:'Back to Intelligence Graph'}));await user.click(screen.getByRole('button',{name:'Gaps',exact:true}));inspectCurrent()
    expect(screen.getByRole('link',{name:'Open in Intelligence Quality →'})).toHaveAttribute('href',props.qualityHref)
    await user.click(screen.getByRole('button',{name:'Back to Intelligence Graph'}));await user.click(screen.getByRole('button',{name:'Coverage',exact:true}));expect(props.onSelectView).toHaveBeenCalledWith('Coverage')
  })})


 describe('recorded exact Graph provenance', () => {
  const context = 'workspace:revision:customer:tenant'
  const raw = { ...groupedGraph, nodes: groupedGraph.nodes.map(node => node.nodeId === 'second'
    ? { ...node, sourceId: 'canonical-source', evidenceObjectId: 'canonical-evidence' } : node) }
  it('uses the individual stored pair rather than graph key or group representative', async () => {
    const onOpenSource = vi.fn()
    show({ graph: raw, onOpenSource, inspection: { mode: 'Journey', search: '', selectedKey: 'second', objectView: 'object' } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open exact source and evidence →' }))
    expect(onOpenSource).toHaveBeenCalledWith({ sourceId: 'canonical-source', evidenceObjectId: 'canonical-evidence' })
    expect(screen.queryByText('Exact source/evidence provenance is unavailable in this graph projection.')).not.toBeInTheDocument()
  })
  it('does not substitute a stored member pair for combined group provenance', () => {
    show({ graph: raw, inspection: { mode: 'Journey', search: '', selectedKey: 'second', objectView: 'group' } })
    expect(screen.queryByRole('button', { name: 'Open exact source and evidence →' })).not.toBeInTheDocument()
  })
  it.each([undefined, '', 42, 'bad\u0000id', 'x'.repeat(241)])('keeps an incomplete or malformed evidence pair unavailable: %s', id => {
    const graph = { ...raw, nodes: raw.nodes.map(node => node.nodeId === 'second' ? { ...node, evidenceObjectId: id } : node) }
    expect(graphSourceFocus(resolveGraphSelection(buildGraphViewModel(graph), { selectedKey: 'second', objectView: 'object' }).selected)).toBeNull()
  })
  it('supports a recorded source identity only on explicit visible eligible nodes', () => {
    const node = { nodeId: 'unrelated-graph-key', nodeType: 'SOURCE', sourceId: 'canonical-source', customerVisible: true }
    expect(graphSourceFocus(buildGraphViewModel({ nodes: [node] }).nodes[0])).toEqual({ sourceId: 'canonical-source' })
    for (const patch of [{ customerVisible: false }, { customerVisible: undefined }, { nodeType: 'INTELLIGENCE' }])
      expect(graphSourceFocus(buildGraphViewModel({ nodes: [{ ...node, ...patch }] }).nodes[0])).toBeNull()
  })
  it('clears previous Sources filters while retaining exact Graph state and produces a scoped return', () => {
    const params = writeGraphInspection(new URLSearchParams('runtimeInstanceId=workspace&revisionId=revision&sourceQuery=old&sourceType=WEBSITE&sourcePage=3&evidencePage=2&sourceEvidencePage=4&sourceId=old&evidenceObjectId=old'), context,
      { mode: 'Lineage', search: 'Proof', selectedKey: 'second', objectView: 'object' })
    const next = graphSourceParams(params, context, { sourceId: 'canonical-source', evidenceObjectId: 'canonical-evidence' })
    for (const key of ['sourceQuery', 'sourceType', 'sourcePage', 'evidencePage', 'sourceEvidencePage']) expect(next.has(key)).toBe(false)
    expect(next.get('view')).toBe('sources'); expect(next.get('sourceId')).toBe('canonical-source')
    const returned = new URLSearchParams(graphSourceReturnHref(next, context).split('?')[1])
    expect(readGraphInspection(returned, context)).toEqual(readGraphInspection(params, context))
    expect(returned.get('view')).toBe('intelligence-graph'); expect(returned.get('revisionId')).toBe('revision')
    expect(returned.has('sourceId')).toBe(false); expect(returned.has('sourceReturn')).toBe(false)
    expect(graphSourceReturnHref(next, 'wrong-scope')).toBe('')
    next.append('graphMode', 'Other'); expect(graphSourceReturnHref(next, context)).toBe('')
  })
 })

 describe('recorded Graph property explanations', () => {
  const individual = { ...graph, nodes: [{ nodeId: 'individual', nodeType: 'EVIDENCE', customerVisible: true, label: 'Recorded object', metadata: {
    confidenceScore: 0.74, validationStatus: 'PARTIALLY_VALIDATED', reasoningStatus: 'READY_FOR_REASONING',
    confidenceReason: 'Persisted confidence reason', confidenceBasis: ['Recorded source basis'], confidenceFactors: ['Recorded factor'], confidenceWarnings: ['Recorded qualification'],
  } }], edges: [] }
  const inspection = { mode: 'Journey', search: '', selectedKey: 'individual', objectView: 'object' }
  it('names confidence, validation and reasoning independently and exposes only recorded details', async () => {
    show({ graph: individual, inspection })
    const properties = screen.getByRole('region', { name: 'Recorded graph properties' })
    expect(properties).toHaveTextContent('Confidence: 74%')
    expect(properties).toHaveTextContent('Validation: Partially validated')
    expect(properties).toHaveTextContent('Reasoning: Ready for reasoning')
    await userEvent.setup().click(within(properties).getByText('Recorded confidence details'))
    expect(within(properties).getByText('Persisted confidence reason')).toBeVisible()
    expect(within(properties).getByText('Recorded source basis')).toBeVisible()
    expect(within(properties).getByText('Recorded factor')).toBeVisible()
    expect(within(properties).getByText('Recorded qualification')).toBeVisible()
    expect(properties).toHaveTextContent('It does not certify evidence or approve a decision.')
  })
  it.each([undefined, 42, 'not an array', ['bad\u0000value'], [''], ['recorded', 42]])('qualifies unsupported factor values as unavailable: %s', confidenceFactors => {
    const node = { ...individual.nodes[0], metadata: { confidenceFactors } }
    show({ graph: { ...individual, nodes: [node] }, inspection })
    const properties = screen.getByRole('region', { name: 'Recorded graph properties' })
    expect(properties).toHaveTextContent('Confidence: Unavailable')
    expect(properties).toHaveTextContent('Validation: Unavailable')
    expect(properties).toHaveTextContent('Reasoning: Unavailable')
    expect(properties).toHaveTextContent('Confidence factors unavailable.')
    expect(properties).not.toHaveTextContent('0%')
  })
  it('shows the exact bounded factor subset count without inventing omitted values', () => {
    const node = { ...individual.nodes[0], metadata: { confidenceFactors: Array.from({ length: 14 }, (_, index) => `Factor ${index}`) } }
    show({ graph: { ...individual, nodes: [node] }, inspection })
    const properties = screen.getByRole('region', { name: 'Recorded graph properties' })
    expect(within(properties).getAllByRole('listitem', { hidden: true })).toHaveLength(12)
    expect(properties).toHaveTextContent('Showing 12 of 14 recorded entries. This is a displayed subset.')
    expect(within(properties).queryByText('Factor 13')).not.toBeInTheDocument()
  })
  it('does not project one representative explanation across a displayed group', () => {
    const node = individual.nodes[0]
    show({ graph: { ...individual, nodes: [node, { ...node, nodeId: 'other', metadata: { ...node.metadata, confidenceReason: 'Other reason', confidenceFactors: ['Other factor'] } }] }, inspection: { ...inspection, objectView: 'group' } })
    expect(screen.getByText('Inspect an individual object to see its recorded confidence basis and factors.')).toBeInTheDocument()
    expect(screen.queryByText('Recorded confidence details')).not.toBeInTheDocument()
    expect(screen.queryByText('Persisted confidence reason')).not.toBeInTheDocument()
  })
  it('never exposes recorded detail metadata without explicit visibility', () => {
    const node = { ...individual.nodes[0], customerVisible: undefined }
    expect(buildGraphViewModel({ nodes: [node] }).nodes[0].confidenceDetails).toBeNull()
    show({ graph: { ...individual, nodes: [node] }, inspection })
    expect(screen.queryByText('Persisted confidence reason')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Recorded graph properties' })).toHaveTextContent('Confidence: Unavailable')
  })
  it('resets the native disclosure on snapshot, identity and unavailable changes', async () => {
    const node = individual.nodes[0], other = { ...node, nodeId: 'other', label: 'Other object' }
    const read = { ...individual, nodes: [node, other] }
    const renderView = (overrides = {}) => <MemoryRouter><GraphView {...props} graph={read} inspection={inspection} onInspectionChange={vi.fn()} {...overrides} /></MemoryRouter>
    const { rerender } = render(renderView());inspectCurrent()
    const user = userEvent.setup()
    await user.click(screen.getByText('Recorded confidence details'))
    expect(screen.getByText('Recorded confidence details').closest('details').open).toBe(true)
    rerender(renderView({ graph: { ...read, graphHash: 'hash-2' }, manifest: { ...props.manifest, graphHash: 'hash-2' } }))
    inspectCurrent();expect(screen.getByText('Recorded confidence details').closest('details').open).toBe(false)
    await user.click(screen.getByText('Recorded confidence details'))
    rerender(renderView({ inspection: { ...inspection, selectedKey: 'other' } }))
    inspectCurrent();expect(screen.getByText('Recorded confidence details').closest('details').open).toBe(false)
    rerender(renderView({ isLoading: true }))
    expect(screen.queryByText('Recorded confidence details')).not.toBeInTheDocument()
    rerender(renderView())
    inspectCurrent();expect(screen.getByText('Recorded confidence details').closest('details').open).toBe(false)
  })
  it('names the unavailable relationship projection for a coverage diagnostic', () => {
    show({ inspection: { mode: 'Gaps', search: '', selectedKey: 'gap:ECONOMICS' } })
    expect(screen.getByText('No relationship projection for this diagnostic')).toBeInTheDocument()
    expect(screen.getByText('These properties are unavailable for this coverage diagnostic.')).toBeInTheDocument()
    expect(screen.queryByText('Not projected')).not.toBeInTheDocument()
  })
 })

const graphGuardCalls=vi.hoisted(()=>({handlers:{}}))
vi.mock('../../components/Button',async original=>{const actual=await original();return {...actual,Button:props=>{const text=Array.isArray(props.children)?props.children.filter(c=>typeof c==='string').join(''):props.children;if(typeof text==='string')graphGuardCalls.handlers[text]=props.onClick;return <actual.Button {...props}/>}}})
it('loads only the currently selected exact singleton through existing inspection change',()=>{
  const change=vi.fn();render(<MemoryRouter><GraphView {...props} inspection={{mode:'Journey',search:'',selectedKey:'n2',objectView:'group'}} onInspectionChange={change}/></MemoryRouter>)
  fireEvent.click(screen.getByRole('button',{name:'Load connected journey'}));expect(change).toHaveBeenCalledWith({selectedKey:'n2',objectView:'object',afterEdgeKey:''})
})
it('binds connection inspection to the exact recorded relationship',()=>{
  show({inspection:{mode:'Journey',search:'',selectedKey:'n2',objectView:'object'}})
  fireEvent.click(screen.getByRole('button',{name:'Back to Intelligence Graph'}))
  const buttons=screen.getAllByRole('button',{name:'Inspect connection'});fireEvent.click(buttons[0])
  const first=screen.getByRole('dialog');expect(first).toHaveTextContent('Recorded relationship');expect(first).toHaveTextContent('n1');expect(first).toHaveTextContent('n2')
  fireEvent.click(screen.getByRole('button',{name:'Back to Intelligence Graph'}));fireEvent.click(buttons[1]);expect(screen.getByRole('dialog')).toHaveTextContent('n4')
})
it.each([{active:false},{canInspect:false},{stateVersion:'next'},{route:'changed'},{isLoading:true},{graph:{...graph,graphHash:'new'}},{inspection:{mode:'Lineage',search:'',selectedKey:'n2',objectView:'object'}}])('rejects retained dialog, loading and member callbacks on ownership departure %j',changes=>{
  const inspection={mode:'Journey',search:'',selectedKey:'n2',objectView:'object'},change=vi.fn()
  const tree=extra=><MemoryRouter><GraphView {...props} inspection={inspection} onInspectionChange={change} {...extra}/></MemoryRouter>
  const view=render(tree());fireEvent.click(screen.getByRole('button',{name:'Inspect selected'}));const retained=graphGuardCalls.handlers['Load connected journey']
  view.rerender(tree(changes));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();act(()=>retained());expect(change).not.toHaveBeenCalled()
  view.rerender(tree());expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})


it('loads an exact native individual without a grouped-count field',()=>{
  const change=vi.fn();render(<MemoryRouter><GraphView {...props} inspection={{mode:'Journey',search:'',selectedKey:'n2',objectView:'object'}} onInspectionChange={change}/></MemoryRouter>)
  fireEvent.click(screen.getByRole('button',{name:'Load connected journey'}));expect(change).toHaveBeenCalledWith({selectedKey:'n2',objectView:'object',afterEdgeKey:''})
  fireEvent.click(screen.getByRole('button',{name:'Inspect selected'}));expect(screen.getByRole('dialog')).toHaveTextContent('Objects in selection1')
})
it.each([{graph:groupedGraph,inspection:{mode:'Journey',search:'',selectedKey:'first',objectView:'group'}},{inspection:{mode:'Gaps',search:'',selectedKey:'gap:ECONOMICS',objectView:'group'}},{isLoading:true},{graph:null}])('does not load a group, diagnostic or unavailable native selection %j',changes=>{
  render(<MemoryRouter><GraphView {...props} inspection={{mode:'Journey',search:'',selectedKey:'n2',objectView:'object'}} onInspectionChange={vi.fn()} {...changes}/></MemoryRouter>)
  expect(screen.getByRole('button',{name:'Load connected journey'})).toBeDisabled()
})

it('qualifies representative endpoints when a connection combines multiple recorded edges', async () => {
  const graph = { graphHash: 'hash-1', graphVersion: '2.2',
    nodes: [{ nodeId: 'e1', nodeType: 'EVIDENCE', coverageDomain: 'COMPANY' }, { nodeId: 'e2', nodeType: 'EVIDENCE', coverageDomain: 'COMPANY' }, { nodeId: 'i1', nodeType: 'INTELLIGENCE', coverageDomain: 'COMPANY' }],
    edges: [{ fromNodeId: 'e1', toNodeId: 'i1', edgeType: 'EVIDENCE_DERIVES_INTELLIGENCE' }, { fromNodeId: 'e2', toNodeId: 'i1', edgeType: 'EVIDENCE_DERIVES_INTELLIGENCE' }] }
  render(<MemoryRouter><GraphView {...props} graph={graph} inspection={{ mode: 'Journey', search: '', selectedKey: 'e1', objectView: 'group' }} /></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: 'Inspect connection', exact: true }))
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByText('Representative from object')).toBeInTheDocument()
  expect(dialog.getByText('Representative to object')).toBeInTheDocument()
  expect(dialog.getByText('Recorded relationship count').nextElementSibling).toHaveTextContent('2')
  expect(dialog.getByText(/These endpoints do not identify every edge in the group/)).toBeInTheDocument()
  expect(dialog.queryByText('From object', { exact: true })).not.toBeInTheDocument()
})
it.each([{ active: false }, { canInspect: false }, { stateVersion: 'next' }, { refreshing: true }])('refreshes current graph reads and rejects retained callbacks after %j', async changes => {
  const refresh = vi.fn()
  const tree = extra => <MemoryRouter><GraphView {...props} onRefresh={refresh} inspection={{ mode: 'Journey', search: '', selectedKey: 'n2', objectView: 'object' }} {...extra} /></MemoryRouter>
  const view = render(tree())
  await userEvent.click(screen.getByRole('button', { name: 'Graph basis' }))
  await userEvent.click(screen.getByText('Technical graph basis', { selector: 'summary' }))
  const button = screen.getByRole('button', { name: 'Refresh graph reads' })
  expect(button).toBeEnabled()
  const retained = graphGuardCalls.handlers['Refresh graph reads']
  await userEvent.click(button)
  expect(refresh).toHaveBeenCalledTimes(1)
  view.rerender(tree(changes))
  act(() => retained())
  expect(refresh).toHaveBeenCalledTimes(1)
})