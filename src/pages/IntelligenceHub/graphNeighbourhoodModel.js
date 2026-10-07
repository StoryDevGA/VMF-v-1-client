import { getHubPayload } from './intelligenceHubModel.js'
import { buildGraphViewModel } from './intelligenceGraphModel.js'

const key = value => typeof value === 'string' && value.length > 0 && value.length <= 240 && value === value.trim()
  && !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
const count = value => Number.isSafeInteger(value) && value >= 0
const only = (value, keys) => Object.keys(value).every(name => keys.includes(name))
const order = (a, b) => {
  const left = Array.from(a, character => character.codePointAt(0)), right = Array.from(b, character => character.codePointAt(0))
  for (let index = 0; index < Math.min(left.length, right.length); index++) if (left[index] !== right[index]) return left[index] - right[index]
  return left.length - right.length
}

export function readCurrentGraphNeighbourhood({ response, scope, manifest, stateVersion, selection, loading, error, active }) {
  if (!active || loading || error || !selection || Boolean(selection.nodeId) === Boolean(selection.evidenceObjectId)
    || !key(selection.nodeId || selection.evidenceObjectId) || (selection.afterEdgeKey && !key(selection.afterEdgeKey))
    || !key(stateVersion) || manifest?.status !== 'CURRENT' || !/^sha256:[a-f0-9]{64}$/.test(manifest.graphHash)) return null
  const payload = getHubPayload(response), { control, graph, readReceipt } = payload || {}
  const page = graph?.neighbourhood, direction = { Journey: 'BOTH', Lineage: 'INCOMING', Impact: 'OUTGOING' }[selection.mode]
  const selectedNodeId = selection.nodeId || page?.nodeId
  const canonical = page?.evidenceSelection
  if (!key(selectedNodeId) || (selection.evidenceObjectId
    ? !canonical || Object.keys(canonical).length !== 3 || !only(canonical, ['evidenceObjectId', 'nodeId', 'scope'])
      || canonical.evidenceObjectId !== selection.evidenceObjectId || canonical.nodeId !== selectedNodeId || canonical.scope !== 'GLOBAL'
    : canonical !== undefined)) return null
  if (!direction || control?.customerId !== scope.customerId || control?.tenantId !== scope.tenantId
    || ![control?.id, control?.runtimeInstanceKey].includes(scope.runtimeInstanceId) || control?.stateVersion !== stateVersion
    || payload?.currency !== 'AS_READ' || !Number.isFinite(Date.parse(payload?.readAt))
    || manifest.stateVersion !== stateVersion || manifest.sourceStateVersion !== stateVersion
    || graph?.graphHash !== manifest.graphHash || graph?.graphVersion !== manifest.graphVersion || graph.available !== true
    || payload.source !== 'runtime_state_v2.graph_neighbourhood' || readReceipt?.source !== payload.source
    || readReceipt.bounded !== true || readReceipt.fullLegacyFrameworkStateFetched !== false
    || readReceipt.maxSerializedPayloadBytes !== 524288 || readReceipt.maxTimeMS !== 2000 || readReceipt.requestTimeoutMS !== 6000
    || !count(readReceipt.serializedPayloadBytes) || readReceipt.serializedPayloadBytes > 524288
    || page?.version !== 1 || page.depth !== 1 || page.completenessBasis !== 'RECORDED_ONE_HOP_EDGES'
    || page.nodeId !== selectedNodeId || page.mode !== selection.mode || page.direction !== direction
    || page.afterEdgeKey !== (selection.afterEdgeKey || null)
    || !Array.isArray(graph.nodes) || graph.nodes.length < 1 || graph.nodes.length > 49
    || !Array.isArray(graph.edges) || graph.edges.length > 48
    || ![graph.totalNodeCount, graph.totalEdgeCount].every(count)
    || graph.totalNodeCount !== manifest.counts?.nodeCount || graph.totalEdgeCount !== manifest.counts?.edgeCount
    || graph.nodes.length > graph.totalNodeCount || graph.edges.length > graph.totalEdgeCount) return null
  try {
    const { readReceipt: _receipt, ...body } = payload
    if (new Blob([JSON.stringify(body)]).size !== readReceipt.serializedPayloadBytes) return null
  } catch { return null }
  const nodeIds = new Set(graph.nodes.map(node => node?.nodeId)), edgeIds = new Set(graph.edges.map(edge => edge?.edgeId))
  if (nodeIds.size !== graph.nodes.length || edgeIds.size !== graph.edges.length
    || graph.nodes.some(node => !key(node?.nodeId) || typeof node.customerVisible !== 'boolean'
      || (node.customerVisible === false && !only(node, ['nodeId', 'customerVisible'])))
    || graph.edges.some((edge, index) => !key(edge?.edgeId) || !key(edge.fromNodeId) || !key(edge.toNodeId)
      || typeof edge.customerVisible !== 'boolean' || !nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)
      || (edge.customerVisible === false && !only(edge, ['edgeId', 'fromNodeId', 'toNodeId', 'customerVisible']))
      || order(edge.edgeId, index ? graph.edges[index - 1].edgeId : selection.afterEdgeKey || '') <= 0
      || (direction === 'INCOMING' ? edge.toNodeId !== selectedNodeId : direction === 'OUTGOING'
        ? edge.fromNodeId !== selectedNodeId : edge.fromNodeId !== selectedNodeId && edge.toNodeId !== selectedNodeId))) return null
  const selectedRows = graph.nodes.filter(node => node.nodeId === selectedNodeId)
  const endpointIds = new Set([selectedNodeId, ...graph.edges.flatMap(edge => [edge.fromNodeId, edge.toNodeId])])
  if (endpointIds.size !== nodeIds.size || [...nodeIds].some(id => !endpointIds.has(id))) return null
  if (selectedRows.length !== 1 || selectedRows[0].customerVisible !== true) return null
  if (selection.evidenceObjectId && (selectedRows[0].nodeType !== 'EVIDENCE'
    || selectedRows[0].evidenceObjectId !== selection.evidenceObjectId)) return null
  const more = graph.edges.length === 48
  if (page.continuation !== (more ? 'MAY_HAVE_MORE' : 'EXHAUSTED')
    || page.nextAfterEdgeKey !== (more ? graph.edges.at(-1).edgeId : null)
    || page.complete !== (!selection.afterEdgeKey && !more)) return null
  const model = buildGraphViewModel(graph, 'Journey', '')
  const selected = model.nodes.find(node => node.key === selectedNodeId)
  return selected ? { graph, page, selected, model } : null
}
