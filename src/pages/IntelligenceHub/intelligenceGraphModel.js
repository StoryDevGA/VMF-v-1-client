// Types and statuses are contract-owned; titles use explicitly customer-visible API labels.
export const GRAPH_LAYERS = [
  { key: 'source', label: 'Source', icon: 'S' },
  { key: 'evidence', label: 'Evidence', icon: 'E' },
  { key: 'intelligence', label: 'Intelligence', icon: 'I' },
  { key: 'signal', label: 'Signal', icon: 'Q' },
  { key: 'truth', label: 'Workspace Understanding', icon: 'T' },
  { key: 'outcome', label: 'Outcome', icon: 'O' },
]
const NODE_TYPES = {
  SOURCE: ['source', 'Source'], EVIDENCE: ['evidence', 'Evidence'],
  INTELLIGENCE: ['intelligence', 'Intelligence'], SIGNAL: ['signal', 'Signal'],
  SECTION_TRUTH: ['truth', 'Section Truth'], PUBLISHED_TRUTH: ['truth', 'Published Truth'],
  CANONICAL_TRUTH: ['truth', 'Canonical Truth'], OUTPUT_REFERENCE: ['outcome', 'Output Reference'],
  REASONING_CONSUMER: ['outcome', 'Reasoning Consumer'],
}
const RELATIONSHIPS = {
  SOURCE_PRODUCES_EVIDENCE: 'Produces evidence', EVIDENCE_DERIVES_INTELLIGENCE: 'Derives intelligence',
  INTELLIGENCE_SUPPORTS_SECTION_TRUTH: 'Supports understanding', SECTION_TRUTH_PUBLISHED_AS: 'Published as',
  PUBLISHED_TRUTH_LOCKED_AS_CANONICAL: 'Locked as canonical', CANONICAL_TRUTH_REFERENCED_BY_OUTPUT: 'Referenced by outcome',
  INTELLIGENCE_SUPPORTS_CONSUMER: 'Supports consumer', SECTION_TRUTH_DEPENDS_ON_SECTION_TRUTH: 'Depends on understanding',
  NODE_HAS_SIGNAL: 'Has signal', EVIDENCE_CONTRADICTS_EVIDENCE: 'Contradicts',
  INTELLIGENCE_CONTRADICTS_INTELLIGENCE: 'Contradicts', EVIDENCE_VALIDATES_INTELLIGENCE: 'Validates intelligence',
  VALIDATION_FLAGS_NODE: 'Flags object',
}
const DOMAINS = { COMPANY: 'Company', PRODUCTS: 'Products', SERVICES: 'Services', MARKET: 'Market', ECONOMICS: 'Economics', PROBLEMS: 'Problems', CONSEQUENCES: 'Consequences', STAKEHOLDERS: 'Stakeholders', PROOF: 'Proof', DIFFERENTIATION: 'Differentiation' }
const REVIEW_STATES = { ACCEPTED: 'Accepted', PENDING: 'Review', REJECTED: 'Rejected' }
const QUALITY_STATES = { CONNECTED: 'Connected', ORPHAN: 'Orphan', LOW_QUALITY: 'Low quality', UNCLASSIFIED: 'Unclassified', INVALID: 'Invalid' }
const token = value => typeof value === 'string' ? value.trim().toUpperCase() : ''
const list = value => Array.isArray(value) ? value : []
const VALIDATION_STATES = { UNVALIDATED: 'Unvalidated', PARTIALLY_VALIDATED: 'Partially validated', VALIDATED: 'Validated', CONTRADICTED: 'Contradicted', REJECTED: 'Rejected', UNKNOWN: 'Unknown' }
const REASONING_STATES = { READY_FOR_REASONING: 'Ready for reasoning', NEEDS_EVIDENCE: 'Needs evidence', CONTRADICTION_UNRESOLVED: 'Contradiction unresolved', CONFIDENCE_INSUFFICIENT: 'Confidence insufficient', VALIDATION_REQUIRED: 'Validation required', NOT_APPLICABLE: 'Not applicable' }
// Canonical evidence scores are ratios; older graph metadata also stores percentages.
// Without a unit marker, 1 follows the canonical ratio contract and means 100%.
const score = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
  ? value <= 1 ? Math.round(value * 100) : value : null
const knownState = (states, value) => Object.hasOwn(states, token(value)) ? states[token(value)] : ''

function visibleNodeDetails(node) {
  if (node.customerVisible !== true) return {}
  const confidenceScore = score(node.metadata?.confidenceScore) ?? score(node.metadata?.confidence)
  return {
    title: typeof node.label === 'string' ? node.label.trim() : '',
    confidence: confidenceScore !== null ? `${confidenceScore}% confidence` : '',
    validation: knownState(VALIDATION_STATES, node.metadata?.validationStatus),
    reasoning: knownState(REASONING_STATES, node.metadata?.reasoningStatus),
  }
}

export function isCurrentGraphSnapshot(manifest, graph) {
  return manifest?.status === 'CURRENT' && typeof manifest.graphHash === 'string' && Boolean(manifest.graphHash)
    && typeof manifest.graphVersion === 'string' && Boolean(manifest.graphVersion)
    && graph?.graphHash === manifest.graphHash && graph.graphVersion === manifest.graphVersion
}

function directedClosure(nodes, edges, reverse) {
  const selected = new Set(nodes.filter(node => ['intelligence', 'truth', ...(!reverse ? ['signal'] : [])].includes(node.layer)).map(node => node.key))
  let changed = true
  while (changed) {
    changed = false
    for (const edge of edges) {
      const from = reverse ? edge.to : edge.from
      const to = reverse ? edge.from : edge.to
      if (selected.has(from) && !selected.has(to)) { selected.add(to); changed = true }
    }
  }
  return nodes.filter(node => selected.has(node.key))
}

const visibleSignature = node => JSON.stringify([node.layer, node.typeLabel, node.label, node.domain, node.state, node.quality, node.subtitle, node.validation, node.reasoning, node.diagnostic])

function groupEntries(entries) {
  const groups = new Map()
  for (const node of entries) {
    const signature = visibleSignature(node)
    const group = groups.get(signature)
    if (group) { group.memberKeys.push(node.key); group.count += 1 }
    else groups.set(signature, { ...node, memberKeys: [node.key], count: 1 })
  }
  return [...groups.values()]
}

export function buildGraphViewModel(graph, mode = 'Journey', search = '') {
  const nodes = list(graph?.nodes).flatMap(node => {
    const definition = Object.hasOwn(NODE_TYPES, token(node?.nodeType)) ? NODE_TYPES[token(node.nodeType)] : null
    if (!definition || node.customerVisible === false || typeof node.nodeId !== 'string' || !node.nodeId) return []
    const domain = knownState(DOMAINS, node.coverageDomain)
    const review = node.customerVisible === true ? knownState(REVIEW_STATES, node.reviewStatus) : ''
    const quality = node.customerVisible === true ? knownState(QUALITY_STATES, node.graphQualityState) : ''
    const state = review || quality || 'Not projected'
    const details = visibleNodeDetails(node)
    return [{ key: node.nodeId, layer: definition[0], typeLabel: definition[1], label: details.title || definition[1], domain, state,
      review, quality, validation: details.validation, reasoning: details.reasoning,
      subtitle: [domain, state, quality !== state ? quality : '', details.confidence].filter(Boolean).join(' · '), diagnostic: false }]
  })
  const byKey = new Map(nodes.map(node => [node.key, node]))
  const edges = list(graph?.edges).flatMap(edge => {
    const kind = token(edge?.edgeType)
    if (edge?.customerVisible === false || !Object.hasOwn(RELATIONSHIPS, kind) || !byKey.has(edge.fromNodeId) || !byKey.has(edge.toNodeId)) return []
    return [{ key: edge.edgeId, type: kind, from: edge.fromNodeId, to: edge.toNodeId, label: RELATIONSHIPS[kind], contradiction: kind.endsWith('_CONTRADICTS_EVIDENCE') || kind.endsWith('_CONTRADICTS_INTELLIGENCE') }]
  })
  const contradictions = edges.filter(edge => edge.contradiction)
  const gaps = [...new Set(list(graph?.coverage?.missingDomains).map(token))].filter(domain => Object.hasOwn(DOMAINS, domain)).map(domain => ({
    key: `gap:${domain}`, layer: 'intelligence', label: DOMAINS[domain], domain: DOMAINS[domain], state: 'Missing coverage', subtitle: 'Recorded coverage gap', diagnostic: true,
  }))
  const conflictingKeys = new Set(contradictions.flatMap(edge => [edge.from, edge.to]))
  const entries = mode === 'Gaps' ? gaps : mode === 'Contradictions' ? nodes.filter(node => conflictingKeys.has(node.key))
    : mode === 'Lineage' ? directedClosure(nodes, edges, true) : mode === 'Impact' ? directedClosure(nodes, edges, false) : nodes
  const query = search.trim().toLowerCase()
  const matchingEntries = entries.filter(node => `${node.label} ${node.subtitle}`.toLowerCase().includes(query))
  return { nodes, edges, gaps, contradictions, objectCount: matchingEntries.length, entries: groupEntries(matchingEntries) }
}

export function graphRelationships(model, selected) {
  if (!selected || selected.diagnostic) return []
  const byKey = new Map(model.nodes.map(node => [node.key, node]))
  const members = new Set(selected.memberKeys || [selected.key])
  const groups = new Map()
  for (const edge of model.edges) {
    if (!members.has(edge.from) && !members.has(edge.to)) continue
    const direction = members.has(edge.from) && members.has(edge.to) ? 'Within group' : members.has(edge.from) ? 'Outgoing' : 'Incoming'
    const object = byKey.get(members.has(edge.from) ? edge.to : edge.from)
    const signature = JSON.stringify([direction, edge.type, edge.label, visibleSignature(object)])
    const group = groups.get(signature)
    if (group) group.count += 1
    else groups.set(signature, { ...edge, key: signature, direction, object, count: 1 })
  }
  return [...groups.values()]
}
