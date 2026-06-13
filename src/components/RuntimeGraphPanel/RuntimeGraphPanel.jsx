import { useId, useState } from 'react'
import { MdFullscreen } from 'react-icons/md'
import { Button } from '../Button'
import { Dialog } from '../Dialog'
import { ForceDirectedGraph } from '../ForceDirectedGraph'
import { normalizeGraphNodeTypeClassName } from '../../constants/graphNodeTypes'
import './RuntimeGraphPanel.css'

const MAX_FORCE_GRAPH_LINKS = 48
const MAX_FORCE_GRAPH_NODES = 36
const MAX_VISIBLE_RELATIONSHIPS = 8

const GENERIC_NODE_LABEL_TYPES = new Set(['SOURCE', 'EVIDENCE'])

const formatTokenLabel = (value) =>
  String(value || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const formatEvidenceDomainLabel = (value) => {
  const label = formatTokenLabel(value).replace(/^Section\s+\d+\s+/i, '').trim()
  if (!label) return ''

  const words = label.split(/\s+/).filter(Boolean)
  return words.length > 3 ? words.slice(0, 3).join(' ') : label
}

const getNodeTypeLabel = (node = {}) =>
  node.entityDisplayName || formatTokenLabel(node.nodeType) || 'Node'

const getGenericNodeDisplayLabel = (node = {}, nodeType, typeLabel) => {
  const metadata = node.metadata && typeof node.metadata === 'object' ? node.metadata : {}
  const coverageDomain = formatEvidenceDomainLabel(node.coverageDomain)
  const sectionKey = formatTokenLabel(node.sectionKey)

  if (nodeType === 'EVIDENCE') {
    if (coverageDomain) return `${coverageDomain} Evidence`
    if (sectionKey) return `${sectionKey} Evidence`
    if (metadata.validationStatus) return `${formatTokenLabel(metadata.validationStatus)} Evidence`
  }

  if (nodeType === 'SOURCE') {
    const sourceType = formatTokenLabel(metadata.sourceType || metadata.inputType || node.sourceType)
    if (sourceType) return `${sourceType} Source`
  }

  return typeLabel
}

const getNodeDisplayLabel = (node = {}) => {
  const nodeType = String(node.nodeType || '').trim().toUpperCase()
  const typeLabel = getNodeTypeLabel(node)
  if (GENERIC_NODE_LABEL_TYPES.has(nodeType)) {
    return getGenericNodeDisplayLabel(node, nodeType, typeLabel)
  }

  return String(node.label || node.entityDisplayName || formatTokenLabel(node.nodeType) || 'Graph Node').trim()
}

const getNodeMetaLabel = (node = {}) => {
  const metadata = node.metadata && typeof node.metadata === 'object' ? node.metadata : {}
  const values = [
    node.coverageDomain ? formatTokenLabel(node.coverageDomain) : '',
    node.sectionKey ? formatTokenLabel(node.sectionKey) : '',
    metadata.validationStatus ? formatTokenLabel(metadata.validationStatus) : '',
    metadata.readinessContribution ? formatTokenLabel(metadata.readinessContribution) : '',
  ].filter(Boolean)

  return values.length > 0 ? values.join(' / ') : formatTokenLabel(node.nodeType) || 'Projected metadata'
}

const getEdgeDisplayLabel = (edge = {}) =>
  String(edge.relationshipDisplayName || formatTokenLabel(edge.edgeType) || 'Relationship').trim()

const toGraphId = (value) => String(value ?? '').trim()

const getEdgeGroupKey = (edge = {}) =>
  String(edge.edgeType || edge.relationshipDefinitionKey || edge.relationshipDisplayName || 'RELATIONSHIP').trim()

const getBalancedEdgeEntries = (edges = []) => {
  const bucketsByType = edges.reduce((buckets, edge, index) => {
    const key = getEdgeGroupKey(edge)
    const bucket = buckets.get(key) || []
    bucket.push({ edge, index })
    buckets.set(key, bucket)
    return buckets
  }, new Map())
  const buckets = Array.from(bucketsByType.values())
  const balancedEntries = []
  let nextBucketIndex = 0
  let addedEntry = true

  while (addedEntry) {
    addedEntry = false

    buckets.forEach((bucket) => {
      const entry = bucket[nextBucketIndex]
      if (entry) {
        balancedEntries.push(entry)
        addedEntry = true
      }
    })

    nextBucketIndex += 1
  }

  return balancedEntries
}

const buildNodeGroups = (nodes = []) =>
  nodes.reduce((groups, node) => {
    const label = getNodeTypeLabel(node)
    groups[label] = (groups[label] || 0) + 1
    return groups
  }, {})

const getRelationshipNode = (node = {}) => ({
  className: normalizeGraphNodeTypeClassName(node.nodeType),
  label: getNodeDisplayLabel(node),
  meta: getNodeMetaLabel(node),
  typeLabel: getNodeTypeLabel(node),
})

const buildGraphProjection = (graph = {}) => {
  const projectedNodes = Array.isArray(graph.nodes)
    ? graph.nodes.filter((node) => node?.customerVisible !== false && toGraphId(node?.nodeId))
    : []
  const projectedEdges = Array.isArray(graph.edges)
    ? graph.edges.filter((edge) => (
        edge?.customerVisible !== false
        && toGraphId(edge?.fromNodeId)
        && toGraphId(edge?.toNodeId)
      ))
    : []
  const nodeById = new Map(projectedNodes.map((node) => [toGraphId(node.nodeId), node]))
  const validEdges = projectedEdges.filter((edge) => (
    nodeById.has(toGraphId(edge.fromNodeId)) && nodeById.has(toGraphId(edge.toNodeId))
  ))
  const balancedEdgeEntries = getBalancedEdgeEntries(validEdges)
  const visibleEdgeEntries = balancedEdgeEntries.slice(0, MAX_VISIBLE_RELATIONSHIPS)
  const representedNodeById = new Map()
  const networkNodeById = new Map()
  const networkLinks = []

  visibleEdgeEntries.forEach(({ edge }) => {
    const sourceId = toGraphId(edge.fromNodeId)
    const targetId = toGraphId(edge.toNodeId)

    representedNodeById.set(sourceId, nodeById.get(sourceId))
    representedNodeById.set(targetId, nodeById.get(targetId))
  })

  balancedEdgeEntries.forEach(({ edge, index }) => {
    if (networkLinks.length >= MAX_FORCE_GRAPH_LINKS) return

    const sourceId = toGraphId(edge.fromNodeId)
    const targetId = toGraphId(edge.toNodeId)
    const nextNodeCount = networkNodeById.size
      + (networkNodeById.has(sourceId) ? 0 : 1)
      + (networkNodeById.has(targetId) ? 0 : 1)

    if (nextNodeCount > MAX_FORCE_GRAPH_NODES) return

    networkNodeById.set(sourceId, nodeById.get(sourceId))
    networkNodeById.set(targetId, nodeById.get(targetId))
    networkLinks.push({
      id: String(edge.edgeId || `${sourceId}-${targetId}-${index}`),
      label: getEdgeDisplayLabel(edge),
      source: sourceId,
      target: targetId,
    })
  })

  const relationships = visibleEdgeEntries.map(({ edge, index }) => {
    const sourceId = toGraphId(edge.fromNodeId)
    const targetId = toGraphId(edge.toNodeId)
    const sourceNode = nodeById.get(sourceId)
    const targetNode = nodeById.get(targetId)

    return {
      id: String(edge.edgeId || `${sourceId}-${targetId}-${index}`),
      label: getEdgeDisplayLabel(edge),
      source: getRelationshipNode(sourceNode),
      target: getRelationshipNode(targetNode),
    }
  })
  const networkNodes = Array.from(networkNodeById.entries()).map(([id, node]) => ({
    id,
    label: getNodeDisplayLabel(node),
    meta: getNodeMetaLabel(node),
    type: normalizeGraphNodeTypeClassName(node.nodeType),
    typeLabel: getNodeTypeLabel(node),
  }))

  return {
    networkLinks,
    networkNodes,
    nodeGroups: buildNodeGroups(Array.from(representedNodeById.values())),
    projectedEdgeCount: projectedEdges.length,
    projectedNodeCount: projectedNodes.length,
    relationshipCount: validEdges.length,
    relationships,
  }
}

function RuntimeGraphEntity({ node }) {
  return (
    <span className={`runtime-graph-panel__entity runtime-graph-panel__entity--${node.className}`}>
      <span className="runtime-graph-panel__entity-type">{node.typeLabel}</span>
      <strong>{node.label}</strong>
      <span>{node.meta}</span>
    </span>
  )
}

export function RuntimeGraphPanel({
  className = '',
  error = null,
  graph = null,
  loading = false,
}) {
  const dialogTitleId = useId()
  const [expandedGraphOpen, setExpandedGraphOpen] = useState(false)
  const safeGraph = graph && typeof graph === 'object' && !Array.isArray(graph) ? graph : null
  const graphAvailable = safeGraph?.available === true
  const {
    networkLinks,
    networkNodes,
    nodeGroups,
    projectedEdgeCount,
    projectedNodeCount,
    relationshipCount,
    relationships,
  } = buildGraphProjection(safeGraph || {})
  const graphSummary = [
    `${projectedNodeCount} node${projectedNodeCount === 1 ? '' : 's'}`,
    `${projectedEdgeCount} relationship${projectedEdgeCount === 1 ? '' : 's'}`,
  ].join(' / ')
  const visibleSummary = relationships.length < relationshipCount || relationshipCount < projectedEdgeCount
    ? `Showing ${relationships.length} of ${projectedEdgeCount} customer-visible relationships.`
    : 'Showing all projected customer-visible relationships.'
  const forceGraphDescription = `Network view includes ${networkNodes.length} of ${projectedNodeCount} nodes and ${networkLinks.length} of ${relationshipCount} validated links.`
  const rootClassName = [
    'runtime-graph-panel',
    className,
  ].filter(Boolean).join(' ')

  return (
    <section className={rootClassName} role="region" aria-label="Runtime intelligence graph">
      <div className="runtime-graph-panel__header">
        <div>
          <h3>Runtime Intelligence Graph</h3>
          <p>{graphAvailable ? graphSummary : 'Graph projection is not available for this runtime yet.'}</p>
        </div>
        <div className="runtime-graph-panel__header-actions">
          {graphAvailable && relationships.length > 0 ? (
            <Button
              aria-haspopup="dialog"
              className="runtime-graph-panel__expand-button"
              leftIcon={<MdFullscreen aria-hidden="true" focusable="false" />}
              onClick={() => setExpandedGraphOpen(true)}
              size="sm"
              variant="outline"
            >
              Open full-screen graph
            </Button>
          ) : null}
          {graphAvailable ? (
            <span className="runtime-graph-panel__version">
              {safeGraph.graphVersion ? `v${safeGraph.graphVersion}` : 'Projected'}
            </span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="runtime-graph-panel__empty">Loading graph projection...</p>
      ) : error ? (
        <p className="runtime-graph-panel__empty">Graph projection is unavailable right now.</p>
      ) : graphAvailable && relationships.length > 0 ? (
        <>
          <ForceDirectedGraph
            ariaLabel="Runtime intelligence force-directed network"
            className="runtime-graph-panel__network"
            description={forceGraphDescription}
            links={networkLinks}
            nodes={networkNodes}
          />
          <div className="runtime-graph-panel__summary">
            <p>{visibleSummary}</p>
            <ul aria-label="Runtime intelligence graph node groups">
              {Object.entries(nodeGroups).map(([label, count]) => (
                <li key={label}>
                  <strong>{label}</strong>
                  <span>{count}</span>
                </li>
              ))}
            </ul>
          </div>
          <ol className="runtime-graph-panel__relationships" aria-label="Runtime intelligence relationships">
            {relationships.map((relationship) => (
              <li className="runtime-graph-panel__relationship" key={relationship.id}>
                <RuntimeGraphEntity node={relationship.source} />
                <span className="runtime-graph-panel__relationship-link">
                  <span>{relationship.label}</span>
                </span>
                <RuntimeGraphEntity node={relationship.target} />
              </li>
            ))}
          </ol>
          {expandedGraphOpen ? (
            <Dialog
              aria-labelledby={dialogTitleId}
              className="runtime-graph-panel__dialog"
              onClose={() => setExpandedGraphOpen(false)}
              open={expandedGraphOpen}
              size="full"
            >
              <Dialog.Header className="runtime-graph-panel__dialog-header">
                <h2 id={dialogTitleId}>Runtime Intelligence Graph</h2>
                <p className="dialog__subtitle">
                  {`${graphSummary}. ${forceGraphDescription}`}
                </p>
              </Dialog.Header>
              <Dialog.Body className="runtime-graph-panel__dialog-body">
                <ForceDirectedGraph
                  ariaLabel="Runtime intelligence force-directed network full-screen view"
                  className="runtime-graph-panel__network runtime-graph-panel__network--dialog"
                  description={forceGraphDescription}
                  links={networkLinks}
                  nodes={networkNodes}
                />
              </Dialog.Body>
            </Dialog>
          ) : null}
        </>
      ) : (
        <p className="runtime-graph-panel__empty">
          {graphAvailable
            ? 'No customer-visible graph relationships are projected yet.'
            : 'Rebuild the Intelligence Graph to project runtime relationships.'}
        </p>
      )}
    </section>
  )
}

export default RuntimeGraphPanel
