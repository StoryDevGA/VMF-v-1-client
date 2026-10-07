import { useRef } from 'react'
import { Button } from '../../components/Button'
import { graphSourceFocus } from './intelligenceGraphModel.js'

export default function GraphNeighbourhoodView({ read, loading, afterEdgeKey, onRetry, onPage, onInspect, onOpenSource, properties }) {
  const region = useRef(null)
  const focusThen = action => { region.current?.focus(); action() }
  const { graph, page, selected, model } = read || {}
  const nodes = new Map(model?.nodes.map(node => [node.key, node]) || [])
  return <section ref={region} tabIndex={-1} aria-label="Selected object neighbourhood" aria-busy={loading} className="intelligence-graph__neighbourhood">
    <h4>Selected object neighbourhood</h4>
    {!read ? <p role="status">{loading ? 'Loading recorded connections…' : 'Current scoped connections are unavailable. Retry or return to the first page.'}</p> : <>
      <h5>{selected.label}</h5><p className="intelligence-graph__identity"><strong>Exact object identity</strong><code>{selected.key}</code></p>
      {properties}
      <p>{page.mode} · {page.direction === 'BOTH' ? 'Incoming and outgoing' : page.direction === 'INCOMING' ? 'Incoming' : 'Outgoing'} · Depth {page.depth}: recorded one-hop connections.</p>
      <p>{graph.edges.length} recorded one-hop relationships on this page · {graph.nodes.length} endpoint objects. Whole graph: {graph.totalNodeCount} objects and {graph.totalEdgeCount} relationships.</p>
      <p>{page.complete ? 'All recorded one-hop relationships are included in this first page.' : page.continuation === 'MAY_HAVE_MORE' ? 'More recorded relationships may exist. Continue to check the next page.' : 'This continuation page is exhausted; earlier pages are separate.'} These counts do not certify whole-revision coverage or absence of contradictions. Private object details remain unavailable.</p>
      <div className="intelligence-graph__neighbourhood-list">{graph.edges.map(edge => {
        const targetId = edge.fromNodeId === selected.key ? edge.toNodeId : edge.fromNodeId
        const target = nodes.get(targetId)
        const relation = model.edges.find(item => item.key === edge.edgeId)
        return <div key={edge.edgeId}><code>{edge.edgeId}</code>{edge.customerVisible && target ? <>
          <p>{relation?.label || 'Relationship type unavailable'} · {edge.fromNodeId === selected.key ? 'Outgoing' : 'Incoming'}</p>
          <Button size="sm" variant="outline" onClick={() => focusThen(() => onInspect(target.key))}><strong>{target.label}</strong><code>{target.key}</code></Button>
        </> : <p>Recorded connection; details unavailable.</p>}</div>
      })}</div>
      {graphSourceFocus(selected) ? <Button size="sm" variant="outline" onClick={() => onOpenSource(graphSourceFocus(selected))}>Open selected object’s exact source{selected.layer === 'evidence' ? ' and evidence' : ''} →</Button> : null}
    </>}
    <div className="intelligence-graph__member-actions">
      {afterEdgeKey ? <Button size="sm" variant="outline" disabled={loading} onClick={() => focusThen(() => onPage(''))}>First relationship page</Button> : null}
      {read?.page.nextAfterEdgeKey ? <Button size="sm" variant="outline" disabled={loading} onClick={() => focusThen(() => onPage(page.nextAfterEdgeKey))}>Next relationship page</Button> : null}
      <Button size="sm" variant="ghost" disabled={loading} onClick={() => focusThen(onRetry)}>Retry connections</Button>
    </div>
  </section>
}
