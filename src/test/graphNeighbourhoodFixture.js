export const neighbourhoodHash = `sha256:${'a'.repeat(64)}`
export function graphNeighbourhoodFixture({ nodeId = 'source:outside', evidenceObjectId, mode = 'Impact', afterEdgeKey = '', size = 1, privateEndpoint = false } = {}) {
  const nodes = [{ nodeId, nodeType: evidenceObjectId ? 'EVIDENCE' : 'SOURCE', customerVisible: true,
    label: evidenceObjectId ? 'Outside evidence' : 'Outside source', sourceId: 'recorded-source', ...(evidenceObjectId ? { evidenceObjectId } : {}) }]
  const edges = Array.from({ length: size }, (_, index) => {
    const suffix = `${index}`.padStart(3, '0'), endpoint = `evidence:${suffix}`
    nodes.push(privateEndpoint ? { nodeId: endpoint, customerVisible: false }
      : { nodeId: endpoint, nodeType: 'EVIDENCE', customerVisible: true, label: `Connected evidence ${suffix}`, sourceId: 'recorded-source', evidenceObjectId: `recorded-${suffix}` })
    return { edgeId: `edge:${afterEdgeKey ? 'z' : 'a'}:${suffix}`, fromNodeId: mode === 'Lineage' ? endpoint : nodeId,
      toNodeId: mode === 'Lineage' ? nodeId : endpoint, customerVisible: !privateEndpoint,
      ...(privateEndpoint ? {} : { edgeType: 'SOURCE_PRODUCES_EVIDENCE' }) }
  })
  const body = { control: { id: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', stateVersion: 'version-2' },
    source: 'runtime_state_v2.graph_neighbourhood', currency: 'AS_READ', readAt: '2026-10-06T10:00:00.000Z',
    graph: { available: true, graphHash: neighbourhoodHash, graphVersion: '2.2', totalNodeCount: 100, totalEdgeCount: 150, nodes, edges,
      neighbourhood: { version: 1, nodeId, mode, depth: 1, completenessBasis: 'RECORDED_ONE_HOP_EDGES',
        ...(evidenceObjectId ? { evidenceSelection: { evidenceObjectId, nodeId, scope: 'GLOBAL' } } : {}),
        direction: { Journey: 'BOTH', Lineage: 'INCOMING', Impact: 'OUTGOING' }[mode], afterEdgeKey: afterEdgeKey || null,
        nextAfterEdgeKey: size === 48 ? edges.at(-1).edgeId : null, continuation: size === 48 ? 'MAY_HAVE_MORE' : 'EXHAUSTED', complete: !afterEdgeKey && size < 48 } } }
  return sealGraphNeighbourhood(body)
}
export function sealGraphNeighbourhood(payload) {
  const { readReceipt: _receipt, ...body } = payload
  return { ...body, readReceipt: { source: body.source, bounded: true, fullLegacyFrameworkStateFetched: false,
    maxSerializedPayloadBytes: 524288, maxTimeMS: 2000, requestTimeoutMS: 6000, serializedPayloadBytes: new Blob([JSON.stringify(body)]).size } }
}
