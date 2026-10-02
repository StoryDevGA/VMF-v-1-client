import { useRef, useState } from 'react'
import { MdSearch, MdClose, MdChevronRight, MdOpenInNew } from 'react-icons/md'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Input } from '../../components/Input'
import { Link } from '../../components/Link'
import { displayHubCount, getHubCount } from './intelligenceHubModel.js'
import { buildGraphViewModel, graphRelationships, GRAPH_LAYERS, isCurrentGraphSnapshot } from './intelligenceGraphModel.js'
import './GraphView.css'

const MODES = {
  Journey: ['Visible journey', 'Inspect objects and recorded relationships in the selected revision projection. Layers describe object types; they do not imply a connected path.'],
  Lineage: ['Upstream provenance', 'Trace recorded incoming relationships to intelligence and workspace understanding in this projection.'],
  Impact: ['Downstream consumers', 'Trace recorded outgoing relationships from intelligence, signals and workspace understanding in this projection.'],
  Gaps: ['Missing coverage', 'Inspect recorded missing domains. These are coverage diagnostics, not additional graph objects.'],
  Contradictions: ['Conflicting evidence', 'Inspect objects connected by recorded contradiction relationships in this projection.'],
}

export default function GraphView({ manifest, graph, isLoading, error, workspaceName, revisionLabel, qualityHref, workbenchHref, onSelectView, onOpenSources }) {
  const [mode, setMode] = useState('Journey')
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)
  const [selectedKey, setSelectedKey] = useState('')
  const available = !isLoading && !error && isCurrentGraphSnapshot(manifest, graph) && graph.available !== false
  const model = buildGraphViewModel(available ? graph : null, mode, search)
  const selected = model.entries.find(node => node.key === selectedKey) || model.entries.find(node => node.layer === 'intelligence') || model.entries[0]
  const relationships = graphRelationships(model, selected)
  const relationshipCount = relationships.reduce((total, item) => total + item.count, 0)
  const message = isLoading ? 'Loading selected revision graph…' : error ? 'Graph could not be loaded. Refresh to retry.'
    : manifest?.status !== 'CURRENT' ? 'A current graph manifest is unavailable for this selected revision.'
      : !available ? 'A matching current graph projection is unavailable for this selected revision. Refresh to retry.' : ''
  const metric = key => isLoading ? 'Loading…' : available ? displayHubCount(getHubCount(manifest?.counts, key)) : 'Unavailable'
  return <section className="intelligence-hub__sources-workspace intelligence-graph" aria-busy={isLoading}>
    <header className="intelligence-graph__toolbar">
      <div><p className="intelligence-hub__eyebrow">Explainability and impact</p><h2>Intelligence Graph</h2><p>See how recorded evidence connects to workspace understanding and outcomes.</p></div>
      <div className="intelligence-graph__metrics" aria-label="Graph summary">
        <span><strong>{metric('nodeCount')}</strong><small>Graph objects</small></span><span><strong>{metric('edgeCount')}</strong><small>Relationships</small></span><span title="Verified lineage-path totals are not provided by the bounded API."><strong>Unavailable</strong><small>Verified lineage paths</small></span>
      </div>
      <Link to={workbenchHref} variant="subtle" underline="none" className="btn btn--primary intelligence-graph__technical" title="Navigation to the existing selected revision workbench; technical graph tools are a downstream contract."><MdOpenInNew aria-hidden="true" /> Open technical graph</Link>
    </header>
    <div className="intelligence-graph__modebar">
      <nav aria-label="Intelligence Graph modes">{Object.keys(MODES).map(item => <Button key={item} size="sm" variant="ghost" aria-pressed={mode === item} onClick={() => { setMode(item); setSelectedKey('') }}>
        {item}{available && (item === 'Gaps' || item === 'Contradictions') ? <Badge size="sm" pill variant="danger">{item === 'Gaps' ? model.gaps.length : model.contradictions.length}</Badge> : null}
      </Button>)}</nav>
      <div className="intelligence-graph__search"><Input ref={searchRef} size="sm" value={search} onChange={event => { setSearch(event.target.value); setSelectedKey('') }} aria-label="Search this graph view" placeholder="Find an object in this view…" leftIcon={<MdSearch aria-hidden="true" />} />{search ? <Button size="sm" variant="ghost" iconOnly aria-label="Clear graph search" onClick={() => { setSearch(''); setSelectedKey(''); searchRef.current?.focus() }}><MdClose aria-hidden="true" /></Button> : null}</div>
    </div>
    <div className="intelligence-graph__context" role="status"><div><strong>{MODES[mode][0]}</strong><p>{message || MODES[mode][1]}</p></div><span>{available ? `${model.entries.length} ${mode === 'Gaps' ? 'diagnostics' : 'groups'} · ${model.objectCount} ${mode === 'Gaps' ? 'missing domains' : 'objects'} · ${graph.projection?.truncated ? 'Partial projection' : 'Bounded projection'} · Search this view only` : 'Objects unavailable'}</span></div>
    <div className="intelligence-graph__browser">
      <Card variant="outlined" className="intelligence-graph__canvas" role="region" aria-label="Graph layers" tabIndex={0}>
        {GRAPH_LAYERS.map((layer, index) => <section className="intelligence-graph__layer" key={layer.key} aria-label={layer.label}>
          <header><span>{index + 1}</span><div><small>Layer {index + 1}</small><strong title={layer.label}>{layer.label}</strong></div>{index < GRAPH_LAYERS.length - 1 ? <i className="intelligence-graph__layer-arrow" aria-hidden="true">→</i> : null}</header>
          <div tabIndex={0} role="region" aria-label={`${layer.label} objects`}>{model.entries.filter(node => node.layer === layer.key).map(node => <Button key={node.key} square size="sm" variant="ghost" className={`intelligence-graph__node intelligence-graph__node--${node.layer}${node.diagnostic ? ' intelligence-graph__node--gap' : ''}`} aria-pressed={selected?.key === node.key} onClick={() => setSelectedKey(node.key)}>
            <i aria-hidden="true">{node.diagnostic ? '!' : layer.icon}</i><span><strong>{node.label}</strong><small>{node.subtitle}</small>{node.count > 1 ? <small>{node.count} objects</small> : null}</span><MdChevronRight aria-hidden="true" />
          </Button>)}{!model.entries.some(node => node.layer === layer.key) ? <p>{message ? 'Unavailable' : search ? 'No matching objects' : 'No projected objects'}</p> : null}</div>
        </section>)}
        <footer><span>─ Recorded relationships</span><span>─ Selected object</span><span>─ Coverage / conflict</span><small>Connections are explained in the detail panel.</small></footer>
      </Card>
      <Card variant="outlined" className="intelligence-graph__inspector" role="region" aria-label="Selected graph object" tabIndex={0}>
        <Card.Body>{selected ? <>
          <header><div><span className="intelligence-hub__eyebrow">Selected {selected.diagnostic ? 'coverage gap' : selected.typeLabel}{selected.count > 1 ? ' group' : ''}</span><Badge size="sm" pill variant={selected.diagnostic || mode === 'Contradictions' ? 'warning' : 'neutral'}>{selected.state}</Badge></div><h3>{selected.label}</h3><p>{selected.subtitle}</p>{selected.count > 1 ? <p>{selected.count} separate objects with the same displayed details.</p> : null}</header>
          <section className="intelligence-graph__explanation"><h4>{selected.count > 1 ? 'Why this group is here' : 'Why this object is here'}</h4><p>{selected.diagnostic ? 'The API records this domain as missing coverage. No graph object or propagated outcome impact is inferred.' : selected.count > 1 ? 'Separate objects from the selected revision are grouped because their displayed details match. Relationships below include every object in this group; no records are merged or approved.' : 'This object is present in the selected revision projection. Its recorded visible relationships are shown below; this view does not approve or change it.'}</p>{selected.quality ? <p>Graph quality: {selected.quality}</p> : null}{selected.validation ? <p>Validation: {selected.validation}</p> : null}{selected.reasoning ? <p>Reasoning: {selected.reasoning}</p> : null}</section>
          <section className="intelligence-graph__relations"><header><strong>Connected relationships</strong><span>{selected.diagnostic ? 'Unavailable' : relationshipCount}</span></header>
            {relationships.length ? relationships.map(item => <p key={item.key}><span aria-hidden="true">→</span><span><strong>{item.label}</strong> · {item.object.label}<small>{item.direction}{item.count > 1 ? ` · ${item.count} relationships with matching displayed details` : ''}</small></span></p>) : <p>{selected.diagnostic ? 'No relationship projection for this diagnostic.' : 'No visible relationships in this projection.'}</p>}
          </section>
          <section className="intelligence-graph__governance"><h4>Governance</h4><div><small>Workspace scope</small><strong>{workspaceName} · {revisionLabel}</strong></div><div><small>Lineage</small><strong>{selected.diagnostic ? 'Not projected' : 'Recorded relationships'}</strong></div><div><small>Last evaluated</small><strong>Unavailable</strong></div></section>
          {mode === 'Gaps' || mode === 'Contradictions' ? <Link to={qualityHref} variant="subtle" underline="none" className="intelligence-graph__inspect" title="Navigation only; the projection does not supply a finding identifier.">Open in Intelligence Quality →</Link> : <Button size="sm" square variant="outline" className="intelligence-graph__inspect" disabled={selected.count > 1 && !selected.domain} title={selected.count > 1 && !selected.domain ? 'A shared source domain is not supplied for this group.' : undefined} onClick={() => onOpenSources(selected.domain)}>Inspect supporting source →</Button>}
          {mode !== 'Gaps' && mode !== 'Contradictions' && selected.count > 1 && !selected.domain ? <p>A shared source domain is not supplied for this group.</p> : null}
        </> : <p role="status">{message || 'No objects match this view in the current projection.'}</p>}</Card.Body>
      </Card>
    </div>
    <footer className="intelligence-hub__sources-footer intelligence-graph__footer"><Button size="sm" variant="ghost" onClick={() => onSelectView('Readiness & publish')}>← Readiness &amp; publish</Button><span>The graph explains relationships. Governed resolution remains in Intelligence Quality.</span><Link to={qualityHref} variant="subtle" underline="none">Continue to Intelligence Quality →</Link></footer>
  </section>
}
