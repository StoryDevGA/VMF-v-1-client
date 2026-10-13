import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
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
import { Select } from '../../components/Select'
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiSearch } from 'react-icons/fi'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
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

export default function GraphView({ manifest, graph, isLoading, error, workspaceName, revisionLabel, qualityHref, findingId, acquisitionHref, lifecycle = 'UNAVAILABLE', onSelectView, onOpenSources, onOpenSource, resolveSourceDestination, inspection, onInspectionChange, neighbourhood, neighbourhoodLoading, neighbourhoodEnabled, onNeighbourhoodRetry, onNeighbourhoodPage, onNeighbourhoodInspect, onNeighbourhoodSource, active = true, canInspect = true, scope, stateVersion, route, onBasisInspectionReady, onRefresh, refreshing }) {
  const { mode, search, selectedKey, evidenceObjectId, invalid, objectView = 'group' } = inspection
  const searchId=useId()
  const searchRef = useRef(null)
  const membersOpener = useRef(null)
  const [membersDialog, setMembersDialog] = useState(null)
  const available = active && canInspect && !invalid && !isLoading && !error && isCurrentGraphSnapshot(manifest, graph) && graph.available !== false
  const model = buildGraphViewModel(available ? graph : null, mode, search)
  const { group: selectedGroup, selected } = resolveGraphSelection(model, inspection)
  const sourceFocus = graphSourceFocus(selected)
  const sourceDestination = sourceFocus && resolveSourceDestination?.(sourceFocus)
  const membership = JSON.stringify([mode, search, selectedGroup?.memberKeys?.slice().sort()])
  const members = selectedGroup?.count > 1 ? model.nodes.filter(node => selectedGroup.memberKeys.includes(node.key)) : []
  const relationships = graphRelationships(model, selected)
  const sessionRevision=useSyncExternalStore(subscribeToSession,getSessionRevision,getSessionRevision)
  const scopeKey=JSON.stringify(scope)
  const ownerKey=JSON.stringify([scopeKey,stateVersion,route,sessionRevision,active,canInspect,available,graph?.graphHash,manifest?.graphHash,inspection,lifecycle])
  const token=Symbol('graph-frame'), frame=useRef(null), latest=useRef(null), opener=useRef(null), restore=useRef(null)
  const [inspectionDialog,setInspectionDialog]=useState(null),[connectionFocus,setConnectionFocus]=useState(null)
  useLayoutEffect(()=>{frame.current={ownerKey,token};return()=>{if(frame.current?.token===token)frame.current=null}})
  const owned=()=>active&&canInspect&&frame.current?.token===token&&frame.current.ownerKey===ownerKey&&getSessionRevision()===sessionRevision
  const visible=active&&canInspect&&inspectionDialog?.owner===ownerKey&&getSessionRevision()===sessionRevision&&(!inspectionDialog.relationshipKey||relationships.some(item=>item.key===inspectionDialog.relationshipKey))
  const focused=connectionFocus===ownerKey
  useLayoutEffect(()=>{if(inspectionDialog&&(!active||!canInspect||inspectionDialog.owner!==ownerKey))setInspectionDialog(null);if(connectionFocus&&connectionFocus!==ownerKey)setConnectionFocus(null)},[inspectionDialog,connectionFocus,active,canInspect,ownerKey])
  useLayoutEffect(()=>{if(visible||!restore.current)return;const intent=restore.current;restore.current=null;if(active&&canInspect&&intent.owner===ownerKey&&getSessionRevision()===sessionRevision&&intent.opener?.isConnected)intent.opener.focus()},[visible,active,canInspect,ownerKey,sessionRevision,membersDialog])
  const openInspection=(kind,trigger,relationshipKey)=>{if(owned()&&(kind!=='connection'||relationships.some(item=>item.key===relationshipKey))){opener.current=trigger;setInspectionDialog({kind,owner:ownerKey,relationshipKey})}}
  const closeInspection=()=>{if(owned()){restore.current={owner:ownerKey,opener:opener.current};setInspectionDialog(null)}}
  const change=(patch,options)=>{if(!owned())return;if(options===undefined)onInspectionChange(patch);else onInspectionChange(patch,options)}
  const navigate=view=>{if(owned())onSelectView(view)}
  useLayoutEffect(()=>{latest.current={ownerKey,owned,openInspection};return()=>{latest.current=null}})
  const receiptKey=JSON.stringify([graph?.graphHash,manifest?.graphHash,inspection])
  useLayoutEffect(()=>{const current=()=>latest.current?.ownerKey===ownerKey?latest.current:null;const registration={current:()=>({available:Boolean(current()?.owned()),scopeKey,stateVersion,route,sessionRevision,view:'Intelligence Graph',receiptKey}),open:trigger=>current()?.openInspection('basis',trigger)};if(active)onBasisInspectionReady?.(registration,canInspect);return()=>onBasisInspectionReady?.(registration,false,true)},[ownerKey,onBasisInspectionReady,active,canInspect,scopeKey,stateVersion,route,sessionRevision,receiptKey])
  const membersOpen = Boolean(membersDialog && active && canInspect && available && membersDialog.ownerKey === ownerKey && membersDialog.graphHash === graph.graphHash
    && membersDialog.membership === membership && members.length > 1)
  if (membersDialog && !membersOpen) setMembersDialog(null)
  useEffect(() => {
    if (active && available && !selectedKey && selected) onInspectionChange({ selectedKey: selected.key }, { replace: true })
  }, [active, available, selectedKey, selected, onInspectionChange])
  const relationshipCount = relationships.reduce((total, item) => total + item.count, 0)
  const message = invalid ? 'This graph inspection link is invalid. Choose a mode to reset its navigation state.'
    : isLoading ? 'Loading selected revision graph…' : error ? 'Graph could not be loaded. Refresh to retry.'
    : manifest?.status !== 'CURRENT' ? 'A current graph manifest is unavailable for this selected revision.'
      : !available ? 'A matching current graph projection is unavailable for this selected revision. Refresh to retry.' : ''
  const metric = key => isLoading ? 'Loading…' : available ? displayHubCount(getHubCount(manifest?.counts, key)) : 'Unavailable'
  const connections=relationships.map(item=>item.object.key)
  const displayed=model.entries.filter(node=>!focused||node.key===selectedGroup?.key||(node.memberKeys||[node.key]).some(key=>connections.includes(key)))
  const displayedObjectCount=displayed.reduce((total,node)=>total+(node.count||1),0)
  const selectedCount=selected&&!selected.diagnostic?(objectView==='object'?1:typeof selected.count==='number'?selected.count:null):null
  const canLoad=available&&selected&&!selected.diagnostic&&selectedCount===1&&['Journey','Lineage','Impact'].includes(mode)
  const details = (<Card variant="outlined" className="intelligence-graph__inspector" role="region" aria-label="Selected graph object" tabIndex={0}>
        <Card.Body>{selected ? <>
          <header><div><span className="intelligence-hub__eyebrow">Selected {selected.diagnostic ? 'coverage gap' : selected.typeLabel}{selected.count > 1 ? ' group' : ''}</span><Badge size="sm" pill variant={selected.diagnostic || mode === 'Contradictions' ? 'warning' : 'neutral'}>{selected.state}</Badge></div><h3>{selected.label}</h3><p>{selected.subtitle}</p>{selected.count > 1 ? <p>{selected.count} separate objects with the same displayed details.</p> : null}</header>
          {!selected.diagnostic ? <p className="intelligence-graph__identity"><strong>{objectView === 'object' ? 'Object identity' : selected.count > 1 ? 'Group representative identity' : 'Object identity'}</strong><code>{selected.key}</code></p> : null}
          {members.length > 1 ? <div className="intelligence-graph__member-actions">
            <Button size="sm" variant="outline" onClick={() => { if (!owned()) return; membersOpener.current = searchRef.current; setInspectionDialog(null); setMembersDialog({ ownerKey, graphHash: graph.graphHash, membership }) }}>Inspect {members.length} individual objects</Button>
            {objectView === 'object' ? <Button size="sm" variant="ghost" onClick={() => change({ objectView: 'group' })}>Return to group</Button> : null}
          </div> : null}
          <section className="intelligence-graph__explanation"><h4>{selected.count > 1 ? 'Why this group is here' : 'Why this object is here'}</h4><p>{selected.diagnostic ? 'The API records this domain as missing coverage. No graph object or propagated outcome impact is inferred.' : selected.count > 1 ? 'Separate objects from the selected revision are grouped because their displayed details match. Relationships below include every object in this group; no records are merged or approved.' : 'This object is present in the selected revision projection. Its recorded visible relationships are shown below; this view does not approve or change it.'}</p>{selected.quality ? <p>Graph quality: {selected.quality}</p> : null}</section>
          <GraphProperties selected={selected} graphHash={graph.graphHash} />
          <section className="intelligence-graph__relations"><header><strong>Connected relationships</strong><span>{selected.diagnostic ? 'Unavailable' : relationshipCount}</span></header>
            {relationships.length ? relationships.map(item => <p key={item.key}><span aria-hidden="true">→</span><span><strong>{item.label}</strong> · {item.object.label}<small>{item.direction}{item.count > 1 ? ` · ${item.count} relationships with matching displayed details` : ''}</small></span></p>) : <p>{selected.diagnostic ? 'No relationship projection for this diagnostic.' : 'No visible relationships in this projection.'}</p>}
          </section>
          <section className="intelligence-graph__governance"><h4>Governance</h4><div><small>Workspace scope</small><strong>{workspaceName} · {revisionLabel}</strong></div><div><small>Lineage</small><strong>{selected.diagnostic ? 'No relationship projection for this diagnostic' : 'Recorded relationships'}</strong></div><div><small>Last evaluated</small><strong>Unavailable</strong></div></section>
          {sourceFocus ? <Button size="sm" variant="outline" disabled={Boolean(resolveSourceDestination && (!sourceDestination || sourceDestination.kind === 'unavailable'))} onClick={() => { if (owned()) onOpenSource(sourceFocus) }}>{sourceDestination?.label || (sourceFocus.sectionLocal ? 'Section source unavailable' : selected.layer === 'evidence' ? 'Open exact source and evidence →' : 'Open exact source →')}</Button> : null}
          {mode === 'Gaps' || mode === 'Contradictions' ? <Link to={qualityHref} variant="subtle" underline="none" className="intelligence-graph__inspect" title="Navigation only; the projection does not supply a finding identifier.">Open in Intelligence Quality →</Link> : !graphSourceFocus(selected) ? <Button size="sm" square variant="outline" className="intelligence-graph__inspect" disabled={!selected.domain} title="Domain search only; exact source provenance is unavailable in this projection." onClick={() => { if (owned()) onOpenSources(selected.domain) }}>Search sources by domain →</Button> : null}
          {objectView === 'object' && !graphSourceFocus(selected) ? <p>Exact source/evidence provenance is unavailable in this graph projection.</p> : null}
          {mode !== 'Gaps' && mode !== 'Contradictions' && selected.count > 1 && !selected.domain ? <p>A shared source domain is not supplied for this group.</p> : null}
        </> : <p role="status">{message || (evidenceObjectId ? <>Requested canonical evidence: <code>{evidenceObjectId}</code>. Inspect its verified recorded object in the neighbourhood below. Another object is not substituted when this read is unavailable.</> : selectedKey ? active && neighbourhoodEnabled ? 'The requested graph object is not displayed in this bounded view. Inspect its object neighbourhood below; another object is not substituted if that read is unavailable.' : 'The requested graph object is not displayed in this bounded view. Change the mode or search, or choose a displayed object.' : 'No objects match this view in the current projection.')}</p>}

        </Card.Body>
      </Card>)
  const inspectedRelationship=relationships.find(item=>item.key===inspectionDialog?.relationshipKey)
  const facts=inspectionDialog?.kind==='basis'?[
    ['Whole recorded graph',available?`${metric('nodeCount')} objects; ${metric('edgeCount')} relationships`:'Unavailable'],
    ['Current selection',available?`${model.entries.length} groups; ${model.objectCount} objects`:'Unavailable'],
    ['Recorded visible relationships',available?`${relationshipCount} for selected ${selected?.count>1?'group':'object'}`:'Unavailable'],
    ['Verified lineage-path count','Not supplied'],
    ['Group member identities',selectedGroup?`${selectedGroup.count} delivered object identities; bounded projection`:'Unavailable'],
    ['Connected neighbourhood beyond this selection',neighbourhood?`${neighbourhood.graph.edges.length} one-hop relationships on this page`:neighbourhoodLoading?'Loading…':'Not loaded'],
  ] : inspectionDialog?.kind==='connection' ? [['Recorded relationship',inspectedRelationship?.label||'Unavailable'],['Direction',inspectedRelationship?.direction||'Unavailable'],[inspectedRelationship?.count>1?'Representative from object':'From object',inspectedRelationship?.from||'Unavailable'],[inspectedRelationship?.count>1?'Representative to object':'To object',inspectedRelationship?.to||'Unavailable'],['Recorded relationship count',inspectedRelationship?.count??'Unavailable']] : [['Layer',selected?.typeLabel||'Unavailable'],[objectView==='object'?'Objects in selection':'Objects in group',selectedCount??'Unavailable'],['Exact members and provenance',sourceFocus?'Recorded exact source basis':'Inspect recorded identities; exact source provenance unavailable'],['Review and Quality state',selected?.state||'Unavailable'],['Recorded relationships',relationshipCount]]
  const title=inspectionDialog?.kind==='basis'?'Graph basis and completeness':inspectionDialog?.kind==='connection'?`${selected?.label||'Graph'}: recorded connection`:`${selected?.label||'Graph'}: selected ${selected?.count>1?'group':'object'}`
  return <section className="intelligence-graph intelligence-graph--modern" aria-busy={isLoading}>
    {findingId?<section aria-label="Quality finding return context"><p>Quality finding: <code>{findingId}</code>. Finding decisions remain in Quality.</p><Link to={qualityHref} variant="subtle">Return to selected Quality finding →</Link></section>:null}
    <div className="intelligence-graph__modern-tools"><div className="intelligence-graph__modern-filters" role="group" aria-label="Intelligence Graph modes">{Object.keys(MODES).map(item=><Button key={item} size="sm" variant="outline" aria-pressed={mode===item} disabled={!active||!canInspect} onClick={()=>change({mode:item,search:'',selectedKey:'',objectView:'group',afterEdgeKey:''})}>{item}</Button>)}</div><div className="intelligence-graph__modern-search"><FiSearch size={14} aria-hidden="true"/><label htmlFor={searchId}>Find a displayed object</label><Input id={searchId} ref={searchRef} type="search" aria-label="Search this graph view" size="sm" value={search} maxLength={240} disabled={!active||!canInspect} onChange={event=>change({search:event.target.value,selectedKey:'',objectView:'group',afterEdgeKey:''},{replace:true})}/>{search?<Button size="sm" variant="outline" aria-label="Clear graph search" onClick={()=>{change({search:'',selectedKey:'',objectView:'group',afterEdgeKey:''},{replace:true});searchRef.current?.focus()}}>Clear</Button>:null}</div></div>
    <div className="intelligence-graph__modern-boundary" role="status"><span><strong>{available?`${graph.projection?.truncated?'Partial':'Bounded'} ${mode} view`:MODES[mode][0]}</strong><br/>{message||`${displayed.length} ${mode==='Gaps'?'diagnostics':'groups'} representing ${displayedObjectCount} ${mode==='Gaps'?'missing domains':'objects'} in this selection`}</span><Button size="sm" variant="outline" onClick={event=>openInspection('basis',event.currentTarget)} disabled={!active||!canInspect}>Graph basis<FiArrowUpRight size={14} aria-hidden="true"/></Button></div>
    <div className="intelligence-graph__modern-row"><div><strong>{selected?.label||'No object selected'}</strong><p>{selected?`${selected.typeLabel} · ${selected.state}`:message||'Choose a displayed object. Another object is not substituted.'}</p></div><div className="intelligence-graph__modern-actions"><Button size="sm" variant="outline" aria-pressed={focused} disabled={!available||!selected} onClick={()=>{if(owned())setConnectionFocus(focused?null:ownerKey)}}>Focus connections</Button><Button size="sm" variant="outline" disabled={!available||!selected} onClick={event=>openInspection('selected',event.currentTarget)}>Inspect selected</Button></div></div>
    <Card bordered={false} rounded={false} className="intelligence-graph__modern-canvas" role="region" aria-label="Graph layers" tabIndex={0}>{GRAPH_LAYERS.map(layer=><section key={layer.key} aria-label={layer.label}><h2>{layer.label}</h2><div role="region" aria-label={`${layer.label} objects`}>{displayed.filter(node=>node.layer===layer.key).map(node=><Button key={node.key} size="sm" variant="outline" className="intelligence-graph__modern-node" aria-pressed={selectedGroup?.key===node.key} onClick={()=>change({selectedKey:node.key,objectView:!node.diagnostic&&node.count===1?'object':'group',afterEdgeKey:''})}><strong>{node.label}</strong><small>{node.count||1} {node.count===1?'object':'objects'}{node.layer==='evidence'?` · ${node.state}`:''}</small></Button>)}{!displayed.some(node=>node.layer===layer.key)?<p>{message?'Unavailable':search?'No matching displayed objects':'Not loaded in this bounded projection.'}</p>:null}</div></section>)}</Card>
    <div className="intelligence-graph__modern-relationships">{relationships.length?relationships.map(item=><div key={item.key}><strong>{item.direction==='Incoming'?item.object.label:selected?.label} <FiArrowRight size={16} aria-hidden="true"/> {item.direction==='Incoming'?selected?.label:item.object.label}</strong><p>Recorded relationship: {item.label}{item.count>1?` · ${item.count} recorded relationships`:''}. No other connections are inferred from layer placement.</p><Button size="sm" variant="outline" onClick={event=>openInspection('connection',event.currentTarget,item.key)}>Inspect connection</Button></div>):<p>{message||'No visible relationships in this projection. This does not establish absence of connections beyond this selection.'}</p>}</div>
    <div className="intelligence-graph__modern-row"><div><strong>Connected journey beyond this selection</strong><p>Source and Workspace understanding connections may exist outside this bounded selection. Inspection loads recorded one-hop connections.</p></div><Button size="sm" variant="outline" disabled={!canLoad} onClick={()=>change({selectedKey:selected.key,objectView:'object',afterEdgeKey:''})}>Load connected journey<FiArrowRight size={14} aria-hidden="true"/></Button></div>
    {active && neighbourhoodEnabled ? <GraphNeighbourhoodView read={neighbourhood} loading={neighbourhoodLoading} afterEdgeKey={inspection.afterEdgeKey} onRetry={onNeighbourhoodRetry} onPage={onNeighbourhoodPage} onInspect={onNeighbourhoodInspect} onOpenSource={onNeighbourhoodSource} resolveSourceDestination={resolveSourceDestination} properties={neighbourhood ? <GraphProperties selected={neighbourhood.selected} graphHash={neighbourhood.graph.graphHash} /> : null} /> : null}
    {!selected?details:null}
    <footer className="intelligence-hub__after-lock-footer"><Button size="sm" variant="outline" onClick={()=>navigate('Coverage')}><FiArrowLeft size={14} aria-hidden="true"/>Coverage</Button><small>Navigation does not approve evidence or change the revision.</small><Button size="sm" variant="outline" onClick={()=>navigate('Review')}>Review<FiArrowRight size={14} aria-hidden="true"/></Button></footer>
    {visible?<Dialog open size="lg" className="intelligence-hub__dialog intelligence-hub__inspection-dialog intelligence-graph__modern-inspection" aria-label={title} onClose={closeInspection} onCancel={event=>{event.preventDefault();if(event.target===event.currentTarget)closeInspection()}}><Dialog.Header><h2>{title}</h2></Dialog.Header><Dialog.Body><Select label="Record" size="sm" className="intelligence-hub__inspection-record" value="current" options={[{value:'current',label:title}]} onChange={()=>{}}/><dl className="intelligence-hub__inspection-facts">{facts.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>{inspectionDialog.kind==='connection' && inspectedRelationship?.count>1?<p>Grouped relationships are represented by one recorded edge. These endpoints do not identify every edge in the group.</p>:null}{inspectionDialog.kind==='basis'?<><p>Empty layers are not proof of no connection or no downstream impact. Sources and understanding may exist beyond the bounded selection.</p><details><summary>Technical graph basis</summary><p>Current manifest: {manifest?.status||'Unavailable'} · recorded hash {available?graph.graphHash:'Unavailable'}. {lifecycle==='LOCKED'?'Recorded revision is locked. This inspection does not mutate accepted evidence or truth; frozen membership is not supplied.':lifecycle==='UNLOCKED'?'Selected revision is unlocked.':'Lock state unavailable.'}</p><p>Verified lineage-path totals are not provided by the bounded API.</p><Button size="sm" variant="outline" disabled>Open technical graph</Button><Button size="sm" variant="outline" disabled>Legacy workbench</Button><Button size="sm" variant="outline" disabled={!active||!canInspect||refreshing} onClick={()=>{if(owned()&&!refreshing)onRefresh?.()}}>Refresh graph reads</Button><Link to={acquisitionHref} variant="subtle">Inspect acquisition and revision routes in Context →</Link></details></>:<><p>A domain search is an alternative search, not exact provenance.</p><details><summary>Recorded object inspection</summary>{details}</details>{selected?.domain?<Button size="sm" variant="outline" onClick={()=>{if(owned())onOpenSources(selected.domain)}}>Search {selected.domain} sources<FiArrowRight size={14} aria-hidden="true"/></Button>:null}<Link to={qualityHref} variant="subtle" className="btn btn--outline" onClick={event=>{if(!owned())event.preventDefault()}}>Inspect Quality</Link></>}</Dialog.Body><Dialog.Footer><Button size="sm" variant="outline" onClick={closeInspection}><FiArrowLeft size={14} aria-hidden="true"/>Back to Intelligence Graph</Button></Dialog.Footer></Dialog>:null}
    <Dialog open={membersOpen} onClose={() => { if(owned()){restore.current={owner:ownerKey,opener:searchRef.current};setMembersDialog(null)} }} size="lg" className="intelligence-hub__dialog intelligence-hub__inspection-dialog intelligence-graph__modern-inspection" aria-label="Objects in selected graph group" onKeyDown={event => {
      if (event.key !== 'Tab') return
      const buttons = [...event.currentTarget.querySelectorAll('button:not([disabled])')]
      const first = buttons[0], last = buttons[buttons.length - 1]
      if ((!event.shiftKey && event.target === last) || (event.shiftKey && event.target === first)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first)?.focus()
      }
    }}>
      <Dialog.Header><h2>Objects in selected graph group</h2></Dialog.Header>
      <Dialog.Body>{membersOpen ? <>
        <p>{members.length} individual objects delivered in this bounded projection. Choose an identity to inspect its recorded visible relationships.</p>
        <div className="intelligence-graph__member-list">{members.map(node => <Button key={node.key} size="sm" variant="outline" fullWidth onClick={() => { if(!owned())return; change({ selectedKey: node.key, objectView: 'object' }); setMembersDialog(null) }}><strong>{node.label}</strong><code>{node.key}</code></Button>)}</div>
      </> : null}</Dialog.Body>
      <Dialog.Footer><Button size="sm" variant="ghost" onClick={() => { if(owned()){restore.current={owner:ownerKey,opener:searchRef.current};setMembersDialog(null)} }}>Close member inspection</Button></Dialog.Footer>
    </Dialog>

  </section>
}
