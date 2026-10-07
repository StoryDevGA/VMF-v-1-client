import { describe, expect, it } from 'vitest'
import { readCurrentGraphNeighbourhood } from './graphNeighbourhoodModel.js'
import { graphNeighbourhoodFixture, neighbourhoodHash, sealGraphNeighbourhood } from '../../test/graphNeighbourhoodFixture.js'
const args = response => ({ response, scope: { runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1' },
  manifest: { status: 'CURRENT', graphHash: neighbourhoodHash, graphVersion: '2.2', stateVersion: 'version-2', sourceStateVersion: 'version-2', counts: { nodeCount: 100, edgeCount: 150 } },
  stateVersion: 'version-2', selection: { nodeId: response.graph.neighbourhood.nodeId, mode: response.graph.neighbourhood.mode, afterEdgeKey: response.graph.neighbourhood.afterEdgeKey }, active: true })
describe('current selected Graph neighbourhood', () => {
  it('resolves a canonical evidence identity to its verified different recorded node', () => {
    const body = graphNeighbourhoodFixture({ evidenceObjectId: 'canonical:49', nodeId: 'recorded-node:outside', mode: 'Lineage' })
    const input = args(body); input.selection = { evidenceObjectId: 'canonical:49', mode: 'Lineage' }
    const read = readCurrentGraphNeighbourhood(input)
    expect(read.selected.key).toBe('recorded-node:outside'); expect(read.selected.evidenceObjectId).toBe('canonical:49')
  })
  it.each(['absent', 'canonical', 'node', 'scope', 'extra', 'stored', 'type', 'private', 'exclusive', 'node-query'])('rejects mismatched canonical resolution %s', kind => {
    const body = graphNeighbourhoodFixture({ evidenceObjectId: 'canonical:49', nodeId: 'recorded-node:outside' })
    if (kind === 'absent') delete body.graph.neighbourhood.evidenceSelection
    if (kind === 'canonical') body.graph.neighbourhood.evidenceSelection.evidenceObjectId = 'other'
    if (kind === 'node') body.graph.neighbourhood.evidenceSelection.nodeId = 'other'
    if (kind === 'scope') body.graph.neighbourhood.evidenceSelection.scope = 'SECTION'
    if (kind === 'extra') body.graph.neighbourhood.evidenceSelection.extra = 'guess'
    if (kind === 'stored') body.graph.nodes[0].evidenceObjectId = 'other'
    if (kind === 'type') body.graph.nodes[0].nodeType = 'SOURCE'
    if (kind === 'private') body.graph.nodes[0] = { nodeId: 'recorded-node:outside', customerVisible: false }
    const input = args(sealGraphNeighbourhood(body)); input.selection = { evidenceObjectId: 'canonical:49', mode: 'Impact' }
    if (kind === 'exclusive') input.selection.nodeId = 'recorded-node:outside'
    if (kind === 'node-query') input.selection = { nodeId: 'recorded-node:outside', mode: 'Impact' }
    expect(readCurrentGraphNeighbourhood(input)).toBeNull()
  })
  it.each(['Journey', 'Lineage', 'Impact'])('reads exact %s one-hop endpoints beyond the flat projection', mode => {
    const read = readCurrentGraphNeighbourhood(args(graphNeighbourhoodFixture({ mode })))
    expect(read.selected.key).toBe('source:outside'); expect(read.model.nodes).toHaveLength(2); expect(read.page.complete).toBe(true)
  })
  it('keeps private envelopes structural and never exposes their facts', () => {
    const read = readCurrentGraphNeighbourhood(args(graphNeighbourhoodFixture({ privateEndpoint: true })))
    expect(read.graph.nodes).toHaveLength(2); expect(read.model.nodes).toHaveLength(1); expect(read.model.edges).toHaveLength(0)
  })
  it('handles isolated objects, exact 48 and exhausted continuation without false completeness', () => {
    expect(readCurrentGraphNeighbourhood(args(graphNeighbourhoodFixture({ size: 0 }))).page.complete).toBe(true)
    expect(readCurrentGraphNeighbourhood(args(graphNeighbourhoodFixture({ size: 48 }))).page.continuation).toBe('MAY_HAVE_MORE')
    expect(readCurrentGraphNeighbourhood(args(graphNeighbourhoodFixture({ size: 0, afterEdgeKey: 'edge:a:047' }))).page.complete).toBe(false)
  })
  it.each(['active', 'loading', 'error', 'scope', 'stateVersion', 'manifest'])('withholds retained data when %s changes', field => {
    const input = args(graphNeighbourhoodFixture())
    input[field] = { active: false, loading: true, error: { status: 503 }, scope: { ...input.scope, tenantId: 'other' }, stateVersion: 'new', manifest: { ...input.manifest, graphHash: `sha256:${'b'.repeat(64)}` } }[field]
    expect(readCurrentGraphNeighbourhood(input)).toBeNull()
  })
  it.each(['duplicate', 'extra', 'endpoint', 'direction', 'order', 'private', 'receipt', 'cursor', 'complete', 'selected', 'hash', 'total'])('rejects malformed %s even with matching serialized bytes', kind => {
    const body = graphNeighbourhoodFixture({ size: 2 }), graph = body.graph
    if (kind === 'duplicate') graph.nodes.push(graph.nodes[0])
    if (kind === 'extra') graph.nodes.push({ nodeId: 'extra', customerVisible: true, nodeType: 'SOURCE' })
    if (kind === 'endpoint') graph.edges[0].toNodeId = 'absent'
    if (kind === 'direction') graph.edges[0].fromNodeId = 'evidence:000'
    if (kind === 'order') graph.edges.reverse()
    if (kind === 'private') Object.assign(graph.nodes[1], { customerVisible: false, label: 'private secret' })
    if (kind === 'cursor') graph.neighbourhood.afterEdgeKey = 'wrong'
    if (kind === 'complete') graph.neighbourhood.complete = false
    if (kind === 'selected') graph.nodes[0].customerVisible = false
    if (kind === 'hash') graph.graphHash = 'fabricated'
    if (kind === 'total') graph.totalNodeCount = 99
    const input = args(sealGraphNeighbourhood(body))
    if (kind === 'cursor') input.selection.afterEdgeKey = ''
    if (kind === 'receipt') input.response.readReceipt.serializedPayloadBytes++
    expect(readCurrentGraphNeighbourhood(input)).toBeNull()
  })
})
