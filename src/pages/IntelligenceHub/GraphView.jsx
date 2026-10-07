import { useEffect, useRef, useState } from 'react'
import { MdSearch, MdClose, MdChevronRight, MdOpenInNew } from 'react-icons/md'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Input } from '../../components/Input'
import { Dialog } from '../../components/Dialog'
import { Link } from '../../components/Link'
import GraphNeighbourhoodView from './GraphNeighbourhoodView.jsx'
import { displayHubCount, getHubCount } from './intelligenceHubModel.js'
import { buildGraphViewModel, graphRelationships, graphSourceFocus, GRAPH_LAYERS, isCurrentGraphSnapshot, resolveGraphSelection } from './intelligenceGraphModel.js'
import './GraphView.css'

const MODES = {
  Journey: ['Visible journey', 'Inspect objects and recorded relationships in the selected revision projection. Layers describe object types; they do not imply a connected path.'],
  Lineage: ['Upstream provenance', 'Trace recorded incoming relationships to intelligence and workspace understanding in this projection.'],
  Impact: ['Downstream consumers', 'Trace recorded outgoing relationships from intelligence, signals and workspace understanding in this projection.'],
  Gaps: ['Missing coverage', 'Inspect recorded missing domains. These are coverage diagnostics, not additional graph objects.'],
  Contradictions: ['Conflicting evidence', 'Inspect objects connected by recorded contradiction relationships in this projection.'],
}

function ConfidenceFacts({ name, values }) {
  return <section><h5>{name}</h5>{values ? <>
    <ul>{values.slice(0, 12).map((value, index) => <li key={index}>{value}</li>)}</ul>
    {values.length > 12 ? <p>Showing 12 of {values.length} recorded entries. This is a displayed subset.</p> : null}
  </> : <p>{name} unavailable.</p>}</section>
}

function GraphProperties({ selected, graphHash }) {
  const details = selected.confidenceDetails
  return <section className="intelligence-graph__properties" aria-label="Recorded graph properties">
    <p><strong>Confidence:</strong> {selected.recordedConfidence || 'Unavailable'}</p>
    <p><strong>Validation:</strong> {selected.validation || 'Unavailable'}</p>
    <p><strong>Reasoning:</strong> {selected.reasoning || 'Unavailable'}</p>
    {selected.count > 1 ? <p>Inspect an individual object to see its recorded confidence basis and factors.</p>
      : !selected.diagnostic ? <details key={`${graphHash}:${selected.key}`}>
        <summary>Recorded confidence details</summary>
        <p>Recorded confidence is separate from review, validation and readiness. It does not certify evidence or approve a decision.</p>
        <section><h5>Recorded reason</h5><p>{details?.reason || 'Confidence reason unavailable.'}</p></section>
        <ConfidenceFacts name="Confidence basis" values={details?.basis} />
        <ConfidenceFacts name="Confidence factors" values={details?.factors} />
        <ConfidenceFacts name="Confidence qualifications" values={details?.warnings} />
      </details> : <p>These properties are unavailable for this coverage diagnostic.</p>}
  </section>
}

export default function GraphView({ manifest, graph, isLoading, error, workspaceName, revisionLabel, qualityHref, findingId, workbenchHref, acquisitionHref, lifecycle = 'UNAVAILABLE', onSelectView, onOpenSources, onOpenSource, inspection, onInspectionChange, neighbourhood, neighbourhoodLoading, neighbourhoodEnabled, onNeighbourhoodRetry, onNeighbourhoodPage, onNeighbourhoodInspect, onNeighbourhoodSource, active = true }) {
  const { mode, search, selectedKey, evidenceObjectId, invalid, objectView = 'group' } = inspection
  const searchRef = useRef(null)
  const membersOpener = useRef(null)
  const [membersDialog, setMembersDialog] = useState(null)
  const available = active && !invalid && !isLoading && !error && isCurrentGraphSnapshot(manifest, graph) && graph.available !== false
  const model = buildGraphViewModel(available ? graph : null, mode, search)
  const { group: selectedGroup, selected } = resolveGraphSelection(model, inspection)
  const membership = JSON.stringify([mode, search, selectedGroup?.memberKeys?.slice().sort()])
  const members = selectedGroup?.count > 1 ? model.nodes.filter(node => selectedGroup.memberKeys.includes(node.key)) : []
  const membersOpen = Boolean(membersDialog && active && available && membersDialog.graphHash === graph.graphHash
    && membersDialog.membership === membership && members.length > 1)
  if (membersDialog && !membersOpen) setMembersDialog(null)
  useEffect(() => {
    if (!membersDialog) return
    const opener = membersOpener.current, fallback = searchRef.current
    return () => { if (!opener?.isConnected && fallback?.isConnected) fallback.focus() }
  }, [membersDialog])
  useEffect(() => {
    if (active && available && !selectedKey && selected) onInspectionChange({ selectedKey: selected.key }, { replace: true })
  }, [active, available, selectedKey, selected, onInspectionChange])
  const relationships = graphRelationships(model, selected)
  const relationshipCount = relationships.reduce((total, item) => total + item.count, 0)
  const message = invalid ? 'This graph inspection link is invalid. Choose a mode to reset its navigation state.'
    : isLoading ? 'Loading selected revision graph…' : error ? 'Graph could not be loaded. Refresh to retry.'
    : manifest?.status !== 'CURRENT' ? 'A current graph manifest is unavailable for this selected revision.'
      : !available ? 'A matching current graph projection is unavailable for this selected revision. Refresh to retry.' : ''
  const metric = key => isLoading ? 'Loading…' : available ? displayHubCount(getHubCount(manifest?.counts, key)) : 'Unavailable'
  return <section className="intelligence-hub__sources-workspace intelligence-graph" aria-busy={isLoading}>
    {findingId ? <section className="intelligence-graph__lifecycle" aria-label="Quality finding return context"><p>Quality finding: <code>{findingId}</code>. Graph inspects recorded evidence; finding decisions remain in Quality.</p><Link to={qualityHref} variant="subtle">Return to selected Quality finding →</Link></section> : null}
    <header className="intelligence-graph__toolbar">
      <div><p className="intelligence-hub__eyebrow">Explainability and impact</p><h2>Intelligence Graph</h2><p>See how recorded evidence connects to workspace understanding and outcomes.</p></div>
      <div className="intelligence-graph__metrics" aria-label="Graph summary">
        <span><strong>{metric('nodeCount')}</strong><small>Graph objects</small></span><span><strong>{metric('edgeCount')}</strong><small>Relationships</small></span><span title="Verified lineage-path totals are not provided by the bounded API."><strong>Unavailable</strong><small>Verified lineage paths</small></span>
      </div>
      <Link to={workbenchHref} variant="subtle" underline="none" className="btn btn--primary intelligence-graph__technical" title="Navigation to the existing selected revision workbench; technical graph tools are a downstream contract."><MdOpenInNew aria-hidden="true" /> Existing workspace workbench</Link>
    </header>
    <p className="intelligence-hub__muted">Technical graph availability is unverified. The existing workspace workbench is a legacy inspection fallback.</p>
    <section aria-label="Graph lifecycle inspection" className="intelligence-graph__lifecycle">
      <p>{lifecycle === 'LOCKED' ? 'Locked revision inspection. Frozen accepted evidence and truth remain unchanged.'
        : lifecycle === 'UNLOCKED' ? 'Unlocked revision inspection. This graph remains read-only; acquisition depends on Context authority.'
          : 'Revision lifecycle is unavailable. Graph inspection does not establish permission to acquire or change evidence.'}</p>
      {acquisitionHref ? <Link to={acquisitionHref} variant="subtle" underline="none">Inspect acquisition and revision routes in Context →</Link> : null}
      {lifecycle === 'LOCKED' ? <p>Context explains permitted post-lock and normal revision routes. Creating a successor is an explicit step.</p> : null}
    </section>
    <div className="intelligence-graph__modebar">
      <nav aria-label="Intelligence Graph modes">{Object.keys(MODES).map(item => <Button key={item} size="sm" variant="ghost" aria-pressed={mode === item} onClick={() => onInspectionChange({ mode: item, selectedKey: '', objectView: 'group' })}>
        {item}{available && (item === 'Gaps' || item === 'Contradictions') ? <Badge size="sm" pill variant="danger">{item === 'Gaps' ? model.gaps.length : model.contradictions.length}</Badge> : null}
      </Button>)}</nav>
      <div className="intelligence-graph__search"><Input ref={searchRef} size="sm" value={search} maxLength={240} onChange={event => onInspectionChange({ search: event.target.value, selectedKey: '', objectView: 'group' }, { replace: true })} aria-label="Search this graph view" placeholder="Find an object in this view…" leftIcon={<MdSearch aria-hidden="true" />} />{search ? <Button size="sm" variant="ghost" iconOnly aria-label="Clear graph search" onClick={() => { onInspectionChange({ search: '', selectedKey: '', objectView: 'group' }, { replace: true }); searchRef.current?.focus() }}><MdClose aria-hidden="true" /></Button> : null}</div>
    </div>
    <div className="intelligence-graph__context" role="status"><div><strong>{MODES[mode][0]}</strong><p>{message || MODES[mode][1]}</p></div><span>{available ? `${model.entries.length} ${mode === 'Gaps' ? 'diagnostics' : 'groups'} · ${model.objectCount} ${mode === 'Gaps' ? 'missing domains' : 'objects'} · ${graph.projection?.truncated ? 'Partial projection' : 'Bounded projection'} · Search this view only` : 'Objects unavailable'}</span></div>
    <div className="intelligence-graph__browser">
      <Card variant="outlined" className="intelligence-graph__canvas" role="region" aria-label="Graph layers" tabIndex={0}>
        {GRAPH_LAYERS.map((layer, index) => <section className="intelligence-graph__layer" key={layer.key} aria-label={layer.label}>
          <header><span>{index + 1}</span><div><small>Layer {index + 1}</small><strong title={layer.label}>{layer.label}</strong></div>{index < GRAPH_LAYERS.length - 1 ? <i className="intelligence-graph__layer-arrow" aria-hidden="true">→</i> : null}</header>
          <div tabIndex={0} role="region" aria-label={`${layer.label} objects`}>{model.entries.filter(node => node.layer === layer.key).map(node => <Button key={node.key} square size="sm" variant="ghost" className={`intelligence-graph__node intelligence-graph__node--${node.layer}${node.diagnostic ? ' intelligence-graph__node--gap' : ''}`} aria-pressed={selectedGroup?.key === node.key} onClick={() => onInspectionChange({ selectedKey: node.key, objectView: 'group' })}>
            <i aria-hidden="true">{node.diagnostic ? '!' : layer.icon}</i><span><strong>{node.label}</strong><small>{node.subtitle}</small>{node.count > 1 ? <small>{node.count} objects</small> : null}</span><MdChevronRight aria-hidden="true" />
          </Button>)}{!model.entries.some(node => node.layer === layer.key) ? <p>{message ? 'Unavailable' : search ? 'No matching objects' : 'No projected objects'}</p> : null}</div>
        </section>)}
        <footer><span>─ Recorded relationships</span><span>─ Selected object</span><span>─ Coverage / conflict</span><small>Connections are explained in the detail panel.</small></footer>
      </Card>
      <Card variant="outlined" className="intelligence-graph__inspector" role="region" aria-label="Selected graph object" tabIndex={0}>
        <Card.Body>{selected ? <>
          <header><div><span className="intelligence-hub__eyebrow">Selected {selected.diagnostic ? 'coverage gap' : selected.typeLabel}{selected.count > 1 ? ' group' : ''}</span><Badge size="sm" pill variant={selected.diagnostic || mode === 'Contradictions' ? 'warning' : 'neutral'}>{selected.state}</Badge></div><h3>{selected.label}</h3><p>{selected.subtitle}</p>{selected.count > 1 ? <p>{selected.count} separate objects with the same displayed details.</p> : null}</header>
          {!selected.diagnostic ? <p className="intelligence-graph__identity"><strong>{objectView === 'object' ? 'Object identity' : selected.count > 1 ? 'Group representative identity' : 'Object identity'}</strong><code>{selected.key}</code></p> : null}
          {members.length > 1 ? <div className="intelligence-graph__member-actions">
            <Button size="sm" variant="outline" onClick={event => { membersOpener.current = event.currentTarget; setMembersDialog({ graphHash: graph.graphHash, membership }) }}>Inspect {members.length} individual objects</Button>
            {objectView === 'object' ? <Button size="sm" variant="ghost" onClick={() => onInspectionChange({ objectView: 'group' })}>Return to group</Button> : null}
          </div> : null}
          <section className="intelligence-graph__explanation"><h4>{selected.count > 1 ? 'Why this group is here' : 'Why this object is here'}</h4><p>{selected.diagnostic ? 'The API records this domain as missing coverage. No graph object or propagated outcome impact is inferred.' : selected.count > 1 ? 'Separate objects from the selected revision are grouped because their displayed details match. Relationships below include every object in this group; no records are merged or approved.' : 'This object is present in the selected revision projection. Its recorded visible relationships are shown below; this view does not approve or change it.'}</p>{selected.quality ? <p>Graph quality: {selected.quality}</p> : null}</section>
          <GraphProperties selected={selected} graphHash={graph.graphHash} />
          <section className="intelligence-graph__relations"><header><strong>Connected relationships</strong><span>{selected.diagnostic ? 'Unavailable' : relationshipCount}</span></header>
            {relationships.length ? relationships.map(item => <p key={item.key}><span aria-hidden="true">→</span><span><strong>{item.label}</strong> · {item.object.label}<small>{item.direction}{item.count > 1 ? ` · ${item.count} relationships with matching displayed details` : ''}</small></span></p>) : <p>{selected.diagnostic ? 'No relationship projection for this diagnostic.' : 'No visible relationships in this projection.'}</p>}
          </section>
          <section className="intelligence-graph__governance"><h4>Governance</h4><div><small>Workspace scope</small><strong>{workspaceName} · {revisionLabel}</strong></div><div><small>Lineage</small><strong>{selected.diagnostic ? 'No relationship projection for this diagnostic' : 'Recorded relationships'}</strong></div><div><small>Last evaluated</small><strong>Unavailable</strong></div></section>
          {graphSourceFocus(selected) ? <Button size="sm" variant="outline" onClick={() => onOpenSource(graphSourceFocus(selected))}>{selected.layer === 'evidence' ? 'Open exact source and evidence →' : 'Open exact source →'}</Button> : null}
          {mode === 'Gaps' || mode === 'Contradictions' ? <Link to={qualityHref} variant="subtle" underline="none" className="intelligence-graph__inspect" title="Navigation only; the projection does not supply a finding identifier.">Open in Intelligence Quality →</Link> : !graphSourceFocus(selected) ? <Button size="sm" square variant="outline" className="intelligence-graph__inspect" disabled={!selected.domain} title="Domain search only; exact source provenance is unavailable in this projection." onClick={() => onOpenSources(selected.domain)}>Search sources by domain →</Button> : null}
          {objectView === 'object' && !graphSourceFocus(selected) ? <p>Exact source/evidence provenance is unavailable in this graph projection.</p> : null}
          {mode !== 'Gaps' && mode !== 'Contradictions' && selected.count > 1 && !selected.domain ? <p>A shared source domain is not supplied for this group.</p> : null}
        </> : <p role="status">{message || (evidenceObjectId ? <>Requested canonical evidence: <code>{evidenceObjectId}</code>. Inspect its verified recorded object in the neighbourhood below. Another object is not substituted when this read is unavailable.</> : selectedKey ? 'The requested graph object is not displayed in this bounded view. Change the mode or search, or choose a displayed object.' : 'No objects match this view in the current projection.')}</p>}
          {active && neighbourhoodEnabled ? <GraphNeighbourhoodView read={neighbourhood} loading={neighbourhoodLoading} afterEdgeKey={inspection.afterEdgeKey} onRetry={onNeighbourhoodRetry} onPage={onNeighbourhoodPage} onInspect={onNeighbourhoodInspect} onOpenSource={onNeighbourhoodSource} properties={neighbourhood ? <GraphProperties selected={neighbourhood.selected} graphHash={neighbourhood.graph.graphHash} /> : null} /> : null}
        </Card.Body>
      </Card>
    </div>
    <Dialog open={membersOpen} onClose={() => setMembersDialog(null)} size="lg" aria-label="Objects in selected graph group" onKeyDown={event => {
      if (event.key !== 'Tab') return
      const buttons = [...event.currentTarget.querySelectorAll('button:not([disabled])')]
      const first = buttons[0], last = buttons[buttons.length - 1]
      if ((!event.shiftKey && event.target === last) || (event.shiftKey && event.target === first)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first)?.focus()
      }
    }}>
      <Dialog.Header><h3>Objects in selected graph group</h3></Dialog.Header>
      <Dialog.Body>{membersOpen ? <>
        <p>{members.length} individual objects delivered in this bounded projection. Choose an identity to inspect its recorded visible relationships.</p>
        <div className="intelligence-graph__member-list">{members.map(node => <Button key={node.key} size="sm" variant="outline" fullWidth onClick={() => { onInspectionChange({ selectedKey: node.key, objectView: 'object' }); setMembersDialog(null) }}><strong>{node.label}</strong><code>{node.key}</code></Button>)}</div>
      </> : null}</Dialog.Body>
      <Dialog.Footer><Button size="sm" variant="ghost" onClick={() => setMembersDialog(null)}>Close member inspection</Button></Dialog.Footer>
    </Dialog>
    <footer className="intelligence-hub__sources-footer intelligence-graph__footer"><Button size="sm" variant="ghost" onClick={() => onSelectView('Readiness & publish')}>← Readiness &amp; publish</Button><span>The graph explains relationships. Governed resolution remains in Intelligence Quality.</span><Link to={qualityHref} variant="subtle" underline="none">Continue to Intelligence Quality →</Link></footer>
  </section>
}
