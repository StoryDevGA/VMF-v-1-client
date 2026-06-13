export const GRAPH_NODE_TYPE_CLASS_NAMES = Object.freeze([
  'source',
  'evidence',
  'intelligence',
  'signal',
  'section-truth',
  'published-truth',
  'canonical-truth',
  'output-reference',
  'reasoning-consumer',
  'unknown',
])

const GRAPH_NODE_TYPE_CLASS_NAME_SET = new Set(GRAPH_NODE_TYPE_CLASS_NAMES)

export const normalizeGraphNodeTypeClassName = (value) => {
  const className = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')

  return GRAPH_NODE_TYPE_CLASS_NAME_SET.has(className) ? className : 'unknown'
}
