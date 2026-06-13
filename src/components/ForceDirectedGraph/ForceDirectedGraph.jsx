import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force'
import { normalizeGraphNodeTypeClassName } from '../../constants/graphNodeTypes'
import './ForceDirectedGraph.css'

const GRAPH_WIDTH = 960
const GRAPH_HEIGHT = 560
const GRAPH_PADDING = 54
const SIMULATION_WARMUP_TICKS = 48
const ACTIVE_ALPHA = 0.74
const DRAG_ALPHA_TARGET = 0.34
const FRAME_DELAY_MS = 16

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const getNodeRadius = (degree = 0) => clamp(9 + degree * 1.35, 10, 18)

const getShortLabel = (value) => {
  const label = String(value || '').trim()
  return label.length > 28 ? `${label.slice(0, 25)}...` : label
}

const getKickerLabel = ({ label = '', typeLabel = '' } = {}) => {
  const normalizedLabel = String(label).trim().toLowerCase()
  const normalizedTypeLabel = String(typeLabel).trim().toLowerCase()

  if (!normalizedTypeLabel || normalizedLabel.endsWith(normalizedTypeLabel)) return ''
  return typeLabel
}

const requestFrame = (callback) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback)
  }

  if (typeof globalThis.setTimeout === 'function') {
    return globalThis.setTimeout(callback, FRAME_DELAY_MS)
  }

  callback()
  return null
}

const cancelFrame = (frameId) => {
  if (frameId === null || frameId === undefined) return

  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(frameId)
    return
  }

  if (typeof globalThis.clearTimeout === 'function') {
    globalThis.clearTimeout(frameId)
  }
}

const normalizeGraphData = ({ links = [], nodes = [] }) => {
  const normalizedNodes = Array.isArray(nodes)
    ? nodes
        .map((node) => {
          const label = String(node?.label || node?.id || 'Node').trim()
          const typeLabel = String(node?.typeLabel || node?.type || 'Node').trim()

          return {
            ...node,
            id: String(node?.id || '').trim(),
            kickerLabel: getKickerLabel({ label, typeLabel }),
            label,
            meta: String(node?.meta || '').trim(),
            shortLabel: getShortLabel(label),
            type: normalizeGraphNodeTypeClassName(node?.type || node?.typeLabel),
            typeLabel,
          }
        })
        .filter((node) => node.id)
    : []
  const nodeIds = new Set(normalizedNodes.map((node) => node.id))
  const normalizedLinks = Array.isArray(links)
    ? links
        .map((link, index) => ({
          ...link,
          id: String(link?.id || `${link?.source || 'source'}-${link?.target || 'target'}-${index}`),
          label: String(link?.label || 'Related').trim(),
          source: String(link?.source || '').trim(),
          target: String(link?.target || '').trim(),
        }))
        .filter((link) => link.source && link.target && nodeIds.has(link.source) && nodeIds.has(link.target))
    : []

  return {
    links: normalizedLinks,
    nodes: normalizedNodes,
  }
}

const getDegreeByNodeId = (links = []) => links.reduce((degrees, link) => {
  degrees[link.source] = (degrees[link.source] || 0) + 1
  degrees[link.target] = (degrees[link.target] || 0) + 1
  return degrees
}, {})

const createSimulationNodes = (nodes = [], degreeByNodeId = {}) => {
  const spreadX = Math.min(340, 128 + nodes.length * 5.4)
  const spreadY = Math.min(230, 102 + nodes.length * 3.8)

  return nodes.map((node, index) => {
    const degree = degreeByNodeId[node.id] || 0
    const radius = getNodeRadius(degree)
    const angle = index * 2.399963229728653

    return {
      ...node,
      degree,
      radius,
      x: GRAPH_WIDTH / 2 + Math.cos(angle) * spreadX,
      y: GRAPH_HEIGHT / 2 + Math.sin(angle) * spreadY,
    }
  })
}

const createSimulationLinks = (links = []) => links.map((link) => ({ ...link }))

const getEndpointId = (endpoint) => (typeof endpoint === 'object' ? endpoint?.id : endpoint)

const getEndpointDegree = (endpoint) => (typeof endpoint === 'object' ? endpoint?.degree || 0 : 0)

const applySimulationForces = (simulation, simulationLinks) => simulation
  .force(
    'link',
    forceLink(simulationLinks)
      .id((node) => node.id)
      .distance((link) => {
        const combinedDegree = getEndpointDegree(link.source) + getEndpointDegree(link.target)
        return clamp(128 - combinedDegree * 2.2, 92, 142)
      })
      .strength((link) => {
        const combinedDegree = getEndpointDegree(link.source) + getEndpointDegree(link.target)
        return clamp(0.44 + combinedDegree * 0.032, 0.48, 0.72)
      }),
  )
  .force('charge', forceManyBody().strength((node) => -184 - node.radius * 6.2))
  .force('collide', forceCollide().radius((node) => node.radius + 46).strength(0.92))
  .force('x', forceX(GRAPH_WIDTH / 2).strength(0.048))
  .force('y', forceY(GRAPH_HEIGHT / 2).strength(0.052))
  .force('center', forceCenter(GRAPH_WIDTH / 2, GRAPH_HEIGHT / 2))

const snapshotSimulationGraph = (simulationNodes, simulationLinks) => {
  const positionedNodes = simulationNodes.map((node) => {
    const x = Number.isFinite(node.x) ? node.x : GRAPH_WIDTH / 2
    const y = Number.isFinite(node.y) ? node.y : GRAPH_HEIGHT / 2

    return {
      ...node,
      x: clamp(x, GRAPH_PADDING, GRAPH_WIDTH - GRAPH_PADDING),
      y: clamp(y, GRAPH_PADDING, GRAPH_HEIGHT - GRAPH_PADDING),
    }
  })
  const nodeById = new Map(positionedNodes.map((node) => [node.id, node]))
  const positionedLinks = simulationLinks
    .map((link) => {
      const source = nodeById.get(getEndpointId(link.source))
      const target = nodeById.get(getEndpointId(link.target))
      if (!source || !target) return null

      return {
        ...link,
        source,
        target,
      }
    })
    .filter(Boolean)

  return {
    links: positionedLinks,
    nodes: positionedNodes,
  }
}

const buildInitialGraph = ({ links = [], nodes = [] }) => {
  const degreeByNodeId = getDegreeByNodeId(links)
  const simulationNodes = createSimulationNodes(nodes, degreeByNodeId)
  const simulationLinks = createSimulationLinks(links)
  const simulation = applySimulationForces(forceSimulation(simulationNodes), simulationLinks).stop()

  for (let tick = 0; tick < SIMULATION_WARMUP_TICKS; tick += 1) {
    simulation.tick()
  }

  simulation.stop()
  return snapshotSimulationGraph(simulationNodes, simulationLinks)
}

export function ForceDirectedGraph({
  ariaLabel = 'Force-directed network graph',
  className = '',
  description = '',
  emptyMessage = 'No graph relationships are available.',
  links = [],
  nodes = [],
}) {
  const descriptionId = useId()
  const svgRef = useRef(null)
  const simulationRef = useRef(null)
  const dragStateRef = useRef(null)
  const animationFrameRef = useRef(null)
  const lastPointerStartRef = useRef(0)
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [hoveredNodeId, setHoveredNodeId] = useState('')
  const [draggedNode, setDraggedNode] = useState({ key: '', nodeId: '' })
  const normalizedGraph = useMemo(() => normalizeGraphData({ links, nodes }), [links, nodes])
  const initialGraph = useMemo(() => buildInitialGraph(normalizedGraph), [normalizedGraph])
  const graphDataKey = useMemo(() => JSON.stringify({
    links: normalizedGraph.links.map((link) => ({
      id: link.id,
      label: link.label,
      source: link.source,
      target: link.target,
    })),
    nodes: normalizedGraph.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      meta: node.meta,
      kickerLabel: node.kickerLabel,
      type: node.type,
      typeLabel: node.typeLabel,
    })),
  }), [normalizedGraph])
  const [graphState, setGraphState] = useState(() => ({
    graph: initialGraph,
    key: graphDataKey,
  }))
  const graph = graphState.key === graphDataKey ? graphState.graph : initialGraph
  const clearDragRef = useCallback(() => {
    const dragState = dragStateRef.current

    if (!dragState) return

    const simulation = simulationRef.current
    const simulationNode = simulation?.nodes().find((node) => node.id === dragState.nodeId)

    if (simulationNode) {
      simulationNode.fx = null
      simulationNode.fy = null
    }

    if (
      dragState.inputType === 'pointer'
      && typeof dragState.target?.releasePointerCapture === 'function'
      && dragState.pointerId !== undefined
    ) {
      try {
        dragState.target.releasePointerCapture(dragState.pointerId)
      } catch {
        // Pointer capture may already be released if the graph data changed mid-drag.
      }
    }

    dragStateRef.current = null
    simulation?.alphaTarget(0)
  }, [])
  const clearDragState = useCallback(() => {
    clearDragRef()
    setDraggedNode((current) => (current.key || current.nodeId ? { key: '', nodeId: '' } : current))
  }, [clearDragRef])

  useEffect(() => {
    clearDragRef()

    if (initialGraph.nodes.length === 0 || initialGraph.links.length === 0) {
      simulationRef.current?.stop()
      simulationRef.current = null
      return undefined
    }

    const degreeByNodeId = getDegreeByNodeId(normalizedGraph.links)
    const simulationNodes = createSimulationNodes(normalizedGraph.nodes, degreeByNodeId)
    const simulationLinks = createSimulationLinks(normalizedGraph.links)
    const simulation = applySimulationForces(forceSimulation(simulationNodes), simulationLinks).stop()
    let disposed = false

    for (let tick = 0; tick < SIMULATION_WARMUP_TICKS; tick += 1) {
      simulation.tick()
    }

    const syncGraph = () => {
      if (!disposed) {
        setGraphState({
          graph: snapshotSimulationGraph(simulationNodes, simulationLinks),
          key: graphDataKey,
        })
      }
    }

    const queueGraphSync = () => {
      if (animationFrameRef.current !== null) return

      animationFrameRef.current = requestFrame(() => {
        animationFrameRef.current = null
        syncGraph()
      })
    }

    simulation.on('tick', queueGraphSync)
    queueGraphSync()
    simulation.alpha(ACTIVE_ALPHA).restart()
    simulationRef.current = simulation

    return () => {
      disposed = true
      simulation.stop()
      simulation.on('tick', null)

      if (animationFrameRef.current !== null) {
        cancelFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      if (simulationRef.current === simulation) {
        simulationRef.current = null
      }
    }
  }, [clearDragRef, graphDataKey, initialGraph, normalizedGraph.links, normalizedGraph.nodes])

  const getSvgPointFromPointer = useCallback((event) => {
    const svg = svgRef.current
    if (!svg) return null

    if (typeof svg.createSVGPoint === 'function' && typeof svg.getScreenCTM === 'function') {
      const currentTransformMatrix = svg.getScreenCTM()

      if (currentTransformMatrix) {
        const point = svg.createSVGPoint()
        point.x = event.clientX
        point.y = event.clientY
        const transformedPoint = point.matrixTransform(currentTransformMatrix.inverse())

        return {
          x: clamp(transformedPoint.x, GRAPH_PADDING, GRAPH_WIDTH - GRAPH_PADDING),
          y: clamp(transformedPoint.y, GRAPH_PADDING, GRAPH_HEIGHT - GRAPH_PADDING),
        }
      }
    }

    const bounds = svg.getBoundingClientRect()
    if (bounds.width > 0 && bounds.height > 0) {
      return {
        x: clamp(((event.clientX - bounds.left) / bounds.width) * GRAPH_WIDTH, GRAPH_PADDING, GRAPH_WIDTH - GRAPH_PADDING),
        y: clamp(((event.clientY - bounds.top) / bounds.height) * GRAPH_HEIGHT, GRAPH_PADDING, GRAPH_HEIGHT - GRAPH_PADDING),
      }
    }

    return {
      x: GRAPH_WIDTH / 2,
      y: GRAPH_HEIGHT / 2,
    }
  }, [])

  const moveSimulationNode = useCallback((event, nodeId) => {
    if (dragStateRef.current?.graphDataKey && dragStateRef.current.graphDataKey !== graphDataKey) {
      clearDragState()
      return
    }

    const point = getSvgPointFromPointer(event)
    const simulation = simulationRef.current
    const simulationNode = simulation?.nodes().find((node) => node.id === nodeId)
    if (!point || !simulation || !simulationNode) return

    simulationNode.fx = point.x
    simulationNode.fy = point.y
    simulationNode.x = point.x
    simulationNode.y = point.y
    simulation.alpha(Math.max(simulation.alpha(), 0.42)).restart()
  }, [clearDragState, getSvgPointFromPointer, graphDataKey])

  const handleNodePointerDown = useCallback((event, nodeId) => {
    event.preventDefault()
    event.stopPropagation()
    lastPointerStartRef.current = Date.now()

    setSelectedNodeId(nodeId)
    setDraggedNode({ key: graphDataKey, nodeId })

    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    dragStateRef.current = {
      graphDataKey,
      inputType: 'pointer',
      nodeId,
      pointerId: event.pointerId,
      target: event.currentTarget,
    }
    moveSimulationNode(event, nodeId)
    simulationRef.current?.alphaTarget(DRAG_ALPHA_TARGET).restart()
  }, [graphDataKey, moveSimulationNode])

  const handlePointerMove = useCallback((event) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.inputType !== 'pointer' || dragState.pointerId !== event.pointerId) return

    event.preventDefault()
    moveSimulationNode(event, dragState.nodeId)
  }, [moveSimulationNode])

  const releasePointerDraggedNode = useCallback((event) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.inputType !== 'pointer' || dragState.pointerId !== event.pointerId) return

    event.preventDefault()

    const simulation = simulationRef.current
    const simulationNode = simulation?.nodes().find((node) => node.id === dragState.nodeId)
    if (simulationNode) {
      simulationNode.fx = null
      simulationNode.fy = null
    }

    if (typeof dragState.target?.releasePointerCapture === 'function') {
      dragState.target.releasePointerCapture(dragState.pointerId)
    }

    dragStateRef.current = null
    setDraggedNode({ key: '', nodeId: '' })
    simulation?.alphaTarget(0).alpha(Math.max(simulation.alpha(), 0.32)).restart()
  }, [])

  const handleNodeMouseDown = useCallback((event, nodeId) => {
    if (event.button !== 0 || Date.now() - lastPointerStartRef.current < 450) return

    event.preventDefault()
    event.stopPropagation()
    setSelectedNodeId(nodeId)
    setDraggedNode({ key: graphDataKey, nodeId })
    dragStateRef.current = {
      graphDataKey,
      inputType: 'mouse',
      nodeId,
    }
    moveSimulationNode(event, nodeId)
    simulationRef.current?.alphaTarget(DRAG_ALPHA_TARGET).restart()
  }, [graphDataKey, moveSimulationNode])

  const handleMouseMove = useCallback((event) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.inputType !== 'mouse') return

    event.preventDefault()
    moveSimulationNode(event, dragState.nodeId)
  }, [moveSimulationNode])

  const releaseMouseDraggedNode = useCallback((event) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.inputType !== 'mouse') return

    event.preventDefault()

    const simulation = simulationRef.current
    const simulationNode = simulation?.nodes().find((node) => node.id === dragState.nodeId)
    if (simulationNode) {
      simulationNode.fx = null
      simulationNode.fy = null
    }

    dragStateRef.current = null
    setDraggedNode({ key: '', nodeId: '' })
    simulation?.alphaTarget(0).alpha(Math.max(simulation.alpha(), 0.32)).restart()
  }, [])

  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId) || null
  const hoveredNode = graph.nodes.find((node) => node.id === hoveredNodeId) || null
  const inspectedNode = selectedNode || hoveredNode
  const inspectedNeighborIds = useMemo(() => {
    if (!inspectedNode) return new Set()
    return graph.links.reduce((neighbors, link) => {
      if (link.source.id === inspectedNode.id) neighbors.add(link.target.id)
      if (link.target.id === inspectedNode.id) neighbors.add(link.source.id)
      return neighbors
    }, new Set())
  }, [graph.links, inspectedNode])
  const connectedNodes = useMemo(() => {
    if (!inspectedNode) return []
    return graph.nodes.filter((node) => inspectedNeighborIds.has(node.id)).slice(0, 5)
  }, [graph.nodes, inspectedNeighborIds, inspectedNode])
  const nodeTypeSummaries = useMemo(() => {
    const summariesByType = normalizedGraph.nodes.reduce((summaries, node) => {
      const key = node.type
      const current = summaries.get(key) || {
        count: 0,
        type: key,
        typeLabel: node.typeLabel,
      }
      summaries.set(key, {
        ...current,
        count: current.count + 1,
      })
      return summaries
    }, new Map())

    return Array.from(summariesByType.values())
  }, [normalizedGraph.nodes])
  const rootClassName = [
    'force-directed-graph',
    className,
  ].filter(Boolean).join(' ')

  if (graph.nodes.length === 0 || graph.links.length === 0) {
    return (
      <section className={rootClassName} aria-label={ariaLabel}>
        <p className="force-directed-graph__empty">{emptyMessage}</p>
      </section>
    )
  }

  return (
    <section className={rootClassName} aria-label={ariaLabel}>
      {description ? <p className="force-directed-graph__description">{description}</p> : null}
      {nodeTypeSummaries.length > 0 ? (
        <ul className="force-directed-graph__type-strip" aria-label="Graph node types">
          {nodeTypeSummaries.map((summary) => (
            <li className="force-directed-graph__legend-item" key={summary.type}>
              <span className={`force-directed-graph__legend-swatch force-directed-graph__legend-swatch--${summary.type}`} />
              <span>{summary.typeLabel}</span>
              <strong>{summary.count}</strong>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="force-directed-graph__body">
        <div className="force-directed-graph__canvas">
          <svg
            aria-describedby={description ? descriptionId : undefined}
            aria-label={ariaLabel}
            className="force-directed-graph__svg"
            onMouseLeave={releaseMouseDraggedNode}
            onMouseMove={handleMouseMove}
            onMouseUp={releaseMouseDraggedNode}
            onPointerCancel={releasePointerDraggedNode}
            onPointerMove={handlePointerMove}
            onPointerUp={releasePointerDraggedNode}
            ref={svgRef}
            role="img"
            viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          >
            {description ? <desc id={descriptionId}>{description}</desc> : null}
            <g className="force-directed-graph__links" aria-hidden="true">
              {graph.links.map((link) => {
                const highlighted = inspectedNode
                  ? link.source.id === inspectedNode.id || link.target.id === inspectedNode.id
                  : false

                return (
                  <line
                    className={`force-directed-graph__link${highlighted ? ' force-directed-graph__link--selected' : ''}`}
                    key={link.id}
                    x1={link.source.x}
                    x2={link.target.x}
                    y1={link.source.y}
                    y2={link.target.y}
                  />
                )
              })}
            </g>
            <g className="force-directed-graph__nodes">
              {graph.nodes.map((node) => {
                const selected = selectedNode?.id === node.id
                const inspected = inspectedNode?.id === node.id
                const connected = inspectedNeighborIds.has(node.id)
                const muted = inspectedNode ? !inspected && !connected : false
                const dragging = draggedNode.key === graphDataKey && draggedNode.nodeId === node.id

                return (
                  <g
                    aria-label={`${node.label}. ${node.typeLabel}${node.meta ? `. ${node.meta}` : ''}`}
                    className={[
                      'force-directed-graph__node',
                      `force-directed-graph__node--${node.type}`,
                      selected ? 'force-directed-graph__node--selected' : '',
                      inspected && !selected ? 'force-directed-graph__node--previewed' : '',
                      connected ? 'force-directed-graph__node--connected' : '',
                      muted ? 'force-directed-graph__node--muted' : '',
                      dragging ? 'force-directed-graph__node--dragging' : '',
                    ].filter(Boolean).join(' ')}
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedNodeId(node.id)
                      }
                    }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId((currentNodeId) => (currentNodeId === node.id ? '' : currentNodeId))}
                    onMouseDown={(event) => handleNodeMouseDown(event, node.id)}
                    onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                    role="button"
                    tabIndex={0}
                    transform={`translate(${node.x} ${node.y})`}
                  >
                    <title>
                      {[node.label, node.typeLabel, node.meta].filter(Boolean).join(' / ')}
                    </title>
                    <circle className="force-directed-graph__node-halo" r={node.radius + 9} />
                    <circle className="force-directed-graph__node-core" r={node.radius} />
                    <text className="force-directed-graph__node-label" dy={-(node.radius + 8)}>
                      {node.shortLabel}
                      {node.kickerLabel ? (
                        <tspan className="force-directed-graph__node-kicker" x="0" dy="1.12em">
                          {node.kickerLabel}
                        </tspan>
                      ) : null}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
        <aside className="force-directed-graph__detail" aria-label="Selected graph node">
          {inspectedNode ? (
            <>
              <div className="force-directed-graph__detail-header">
                <span className={`force-directed-graph__detail-type force-directed-graph__detail-type--${inspectedNode.type}`}>
                  {selectedNode ? 'Selected' : 'Preview'}
                </span>
                <span className="force-directed-graph__detail-kicker">{inspectedNode.typeLabel}</span>
              </div>
              <h4>{inspectedNode.label}</h4>
              {inspectedNode.meta ? <p>{inspectedNode.meta}</p> : null}
              <dl>
                <div>
                  <dt>Links</dt>
                  <dd>{inspectedNeighborIds.size}</dd>
                </div>
              </dl>
              {connectedNodes.length > 0 ? (
                <ul className="force-directed-graph__connection-list" aria-label="Connected graph nodes">
                  {connectedNodes.map((node) => (
                    <li key={node.id}>
                      <span className={`force-directed-graph__connection-dot force-directed-graph__connection-dot--${node.type}`} />
                      <span>{node.shortLabel}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <>
              <div className="force-directed-graph__detail-header">
                <span className="force-directed-graph__detail-type">
                  Network
                </span>
              </div>
              <h4>Network Summary</h4>
              <p>{`${graph.nodes.length} nodes / ${graph.links.length} links`}</p>
              {nodeTypeSummaries.length > 0 ? (
                <ul className="force-directed-graph__legend" aria-label="Network node type counts">
                  {nodeTypeSummaries.map((summary) => (
                    <li className="force-directed-graph__legend-item" key={summary.type}>
                      <span className={`force-directed-graph__legend-swatch force-directed-graph__legend-swatch--${summary.type}`} />
                      <span>{summary.typeLabel}</span>
                      <strong>{summary.count}</strong>
                    </li>
                  ))}
                </ul>
              ) : null}
              <dl>
                <div>
                  <dt>Links</dt>
                  <dd>{graph.links.length}</dd>
                </div>
              </dl>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}

export default ForceDirectedGraph
