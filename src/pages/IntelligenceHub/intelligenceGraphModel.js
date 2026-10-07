// Types and statuses are contract-owned; titles use explicitly customer-visible API labels.
export const GRAPH_MODES = Object.freeze(['Journey', 'Lineage', 'Impact', 'Gaps', 'Contradictions'])
export const GRAPH_INSPECTION_KEYS = Object.freeze(['graphInspectionContext', 'graphMode', 'graphQuery', 'graphObjectId', 'graphEvidenceObjectId', 'graphObjectView', 'graphAfterEdgeKey'])

export function readGraphInspection(params, contextKey) {
  const defaults = { mode: 'Journey', search: '', selectedKey: '', objectView: 'group', afterEdgeKey: '', invalid: false }
  if (params.get('graphInspectionContext') !== contextKey) return defaults
  const mode = params.get('graphMode') || 'Journey'
  const search = params.get('graphQuery') || ''
  const selectedKey = params.get('graphObjectId') || ''
  const evidenceObjectId = params.get('graphEvidenceObjectId') || ''
  const objectView = params.get('graphObjectView') || 'group'
  const afterEdgeKey = params.get('graphAfterEdgeKey') || ''
  if (GRAPH_INSPECTION_KEYS.some(key => params.getAll(key).length > 1)
    || !GRAPH_MODES.includes(mode) || !['group', 'object'].includes(objectView) || search.length > 240 || selectedKey.length > 240
    || (selectedKey && evidenceObjectId)
    || (evidenceObjectId && (evidenceObjectId !== evidenceObjectId.trim() || evidenceObjectId.length > 240
      || objectView !== 'object' || !['Journey', 'Lineage', 'Impact'].includes(mode)
      || /runtime_(?:instances|section_states|evidence_sources|evidence_objects|graph_snapshots|graph_elements)|mongodb|mongo(?:db)?|collection/i.test(evidenceObjectId)))
    || (objectView === 'object' && !selectedKey && !evidenceObjectId)
    || afterEdgeKey.length > 240 || (afterEdgeKey && (afterEdgeKey !== afterEdgeKey.trim() || objectView !== 'object' || !['Journey', 'Lineage', 'Impact'].includes(mode)))
    || Array.from(search + selectedKey + evidenceObjectId + afterEdgeKey).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
    || (selectedKey && !selectedKey.trim())) return { ...defaults, invalid: true }
  return { mode, search, selectedKey, objectView, afterEdgeKey, invalid: false, ...(evidenceObjectId ? { evidenceObjectId } : {}) }
}

export function writeGraphInspection(params, contextKey, inspection) {
  const next = new URLSearchParams(params)
  next.set('graphInspectionContext', contextKey)
  next.set('graphMode', inspection.mode)
  next.set('graphObjectView', inspection.objectView || 'group')
  if (inspection.search) next.set('graphQuery', inspection.search); else next.delete('graphQuery')
  if (inspection.selectedKey) next.set('graphObjectId', inspection.selectedKey); else next.delete('graphObjectId')
  if (inspection.evidenceObjectId) next.set('graphEvidenceObjectId', inspection.evidenceObjectId); else next.delete('graphEvidenceObjectId')
  const changed = params.get('graphInspectionContext') !== contextKey || (params.get('graphMode') || 'Journey') !== inspection.mode
    || (params.get('graphQuery') || '') !== (inspection.search || '') || (params.get('graphObjectId') || '') !== (inspection.selectedKey || '')
    || (params.get('graphEvidenceObjectId') || '') !== (inspection.evidenceObjectId || '')
  if (!changed && inspection.objectView === 'object' && ['Journey', 'Lineage', 'Impact'].includes(inspection.mode) && inspection.afterEdgeKey) next.set('graphAfterEdgeKey', inspection.afterEdgeKey)
  else next.delete('graphAfterEdgeKey')
  return next
}

export function resolveGraphSelection(model, { selectedKey, evidenceObjectId, objectView = 'group' }) {
  if (evidenceObjectId) return { group: null, selected: null }
  const group = selectedKey ? model.entries.find(node => node.key === selectedKey || node.memberKeys?.includes(selectedKey))
    : model.entries.find(node => node.layer === 'intelligence') || model.entries[0]
  const selected = objectView === 'object' ? group && !group.diagnostic
    ? model.nodes.find(node => node.key === selectedKey) : undefined : group
  return { group, selected }
}

const sourceNavigationKeys = ['sourceContext', 'sourceQuery', 'sourceType', 'sourcePage', 'evidencePage', 'sourceEvidencePage', 'sourceId', 'evidenceObjectId', 'sourceReturn']
const recordedId = value => typeof value === 'string' && value.trim() && value.trim().length <= 240
  && !Array.from(value.trim()).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ? value.trim() : ''

export function graphSourceFocus(selected) {
  if (!selected || selected.diagnostic || selected.memberKeys?.length > 1 || !selected.sourceId) return null
  if (selected.layer === 'source') return { sourceId: selected.sourceId }
  return selected.layer === 'evidence' && selected.evidenceObjectId
    ? { sourceId: selected.sourceId, evidenceObjectId: selected.evidenceObjectId } : null
}

export function graphSourceParams(params, contextKey, focus) {
  const next = new URLSearchParams(params)
  sourceNavigationKeys.forEach(key => next.delete(key))
  next.set('view', 'sources'); next.set('sourceContext', contextKey); next.set('sourceReturn', 'graph')
  next.set('sourceId', focus.sourceId)
  if (focus.evidenceObjectId) next.set('evidenceObjectId', focus.evidenceObjectId)
  return next
}

export function graphSourceReturnHref(params, contextKey) {
  if (params.get('sourceReturn') !== 'graph' || params.getAll('sourceReturn').length !== 1
    || params.getAll('sourceContext').length !== 1 || params.get('sourceContext') !== contextKey
    || params.get('graphInspectionContext') !== contextKey) return ''
  const inspection = readGraphInspection(params, contextKey)
  if (inspection.invalid || (!inspection.selectedKey && !inspection.evidenceObjectId)) return ''
  const next = new URLSearchParams(params)
  sourceNavigationKeys.forEach(key => next.delete(key))
  next.set('view', 'intelligence-graph')
  return `/app/intelligence?${next}`
}

export function graphContextReturnHref(params, contextKey) {
  if (params.getAll('graphContextReturn').length !== 1 || params.get('graphContextReturn') !== 'inspection'
    || params.get('graphInspectionContext') !== contextKey) return ''
  const inspection = readGraphInspection(params, contextKey)
  if (inspection.invalid || inspection.objectView !== 'object' || (!inspection.selectedKey && !inspection.evidenceObjectId)
    || (inspection.selectedKey && inspection.selectedKey !== inspection.selectedKey.trim())) return ''
  const next = new URLSearchParams(params)
  next.delete('graphContextReturn'); next.set('view', 'intelligence-graph')
  return `/app/intelligence?${next}`
}

export function readGraphLifecycle({ lock, loading, error }) {
  if (loading || error || !lock || typeof lock !== 'object' || Array.isArray(lock)) return 'UNAVAILABLE'
  if (lock.locked !== undefined && typeof lock.locked !== 'boolean') return 'UNAVAILABLE'
  if (lock.state !== undefined && !['LOCKED', 'UNLOCKED'].includes(lock.state)) return 'UNAVAILABLE'
  const timestamp = lock.lockedAt
  const hasTimestamp = timestamp !== undefined && timestamp !== null && timestamp !== ''
  if (hasTimestamp && (typeof timestamp !== 'string' || timestamp !== timestamp.trim() || !Number.isFinite(Date.parse(timestamp)))) return 'UNAVAILABLE'
  const locked = lock.locked === true || lock.state === 'LOCKED' || hasTimestamp
  const unlocked = lock.locked === false || lock.state === 'UNLOCKED'
  return locked && unlocked ? 'UNAVAILABLE' : locked ? 'LOCKED' : unlocked ? 'UNLOCKED' : 'UNAVAILABLE'
}

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
const confidenceText = value => typeof value === 'string' && !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ? value.trim() : ''
const confidenceList = value => Array.isArray(value) && value.length && value.every(item => Boolean(confidenceText(item))) ? value.map(confidenceText) : null

function visibleNodeDetails(node) {
  if (node.customerVisible !== true) return {}
  const confidenceScore = score(node.metadata?.confidenceScore) ?? score(node.metadata?.confidence)
  return {
    title: typeof node.label === 'string' ? node.label.trim() : '',
    confidence: confidenceScore !== null ? `${confidenceScore}% confidence` : '',
    recordedConfidence: confidenceScore !== null ? `${confidenceScore}%` : '',
    confidenceDetails: {
      reason: confidenceText(node.metadata?.confidenceReason),
      basis: confidenceList(node.metadata?.confidenceBasis),
      factors: confidenceList(node.metadata?.confidenceFactors),
      warnings: confidenceList(node.metadata?.confidenceWarnings),
    },
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
    const state = review || quality || 'Review/quality state unavailable'
    const details = visibleNodeDetails(node)
    const sourceId = node.customerVisible === true && ['source', 'evidence'].includes(definition[0]) ? recordedId(node.sourceId) : ''
    const evidenceObjectId = node.customerVisible === true && definition[0] === 'evidence' ? recordedId(node.evidenceObjectId) : ''
    return [{ key: node.nodeId, layer: definition[0], typeLabel: definition[1], label: details.title || definition[1], domain, state,
      sourceId, evidenceObjectId,
      recordedConfidence: details.recordedConfidence || '', confidenceDetails: details.confidenceDetails || null,
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
