import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Select } from '../../components/Select'
import { Link } from '../../components/Link'
import { FiArrowLeft, FiArrowRight, FiArrowUpRight } from 'react-icons/fi'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'

const CHECKS = ['Evidence provenance retained', 'Section mapping reviewed', 'Quality findings decided', 'Publication boundary confirmed']

export default function ReadinessPublishView({ scope, stateVersion, locked, active, canInspect, inventoryStatus, reviewStatus,
  certificationLabel, certificationSummary, evidenceDetails, interpretationDetails, advancedEvidenceDetails, completionDetails, publicationDetails, diagnostics, structureHref, onSelectView, onRefresh, refreshing, onReport }) {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const ownerKey = JSON.stringify([scope, stateVersion, locked, active, canInspect, sessionRevision])
  const token = Symbol('readiness-frame')
  const frame = useRef(null), opener = useRef(null), restore = useRef(null)
  const [inspection, setInspection] = useState(null)
  useLayoutEffect(() => {
    frame.current = { token, ownerKey }
    return () => { if (frame.current?.token === token) frame.current = null }
  })
  const owned = () => active && canInspect && frame.current?.token === token && frame.current.ownerKey === ownerKey && getSessionRevision() === sessionRevision
  const visible = active && canInspect && inspection?.owner === ownerKey && getSessionRevision() === sessionRevision ? inspection : null
  useLayoutEffect(() => {
    if (inspection && (!active || !canInspect || inspection.owner !== ownerKey)) setInspection(null)
  }, [inspection, active, canInspect, ownerKey])
  useLayoutEffect(() => {
    if (visible || !restore.current) return
    const intent = restore.current; restore.current = null
    if (active && canInspect && intent.owner === ownerKey && getSessionRevision() === sessionRevision && intent.opener?.isConnected) intent.opener.focus()
  }, [visible, active, canInspect, ownerKey, sessionRevision])
  const open = (kind, event) => { if (owned()) { opener.current = event.currentTarget; setInspection({ kind, owner: ownerKey }) } }
  const close = () => { if (owned()) { restore.current = { owner: ownerKey, opener: opener.current }; setInspection(null) } }
  const navigate = view => { if (owned()) onSelectView(view) }
  const structureLink = <Link to={structureHref} variant="subtle" underline="none" className="btn btn--primary intelligence-hub__publish-structure" onClick={event => { if (!owned()) event.preventDefault() }}>Open Workspace Structure<FiArrowUpRight size={14} aria-hidden="true" /></Link>
  const inspect = (kind, name = 'Inspect', arrow = false) => <Button size="sm" variant="outline" disabled={!active || !canInspect} onClick={event => open(kind, event)}>{name}{arrow ? <FiArrowUpRight size={14} aria-hidden="true" /> : null}</Button>
  return <div className="intelligence-hub__publish-workspace">
    <div className="intelligence-hub__publish-basis"><Select label="Readiness basis" size="sm" value="current" options={[{ value:'current', label:'Current revision · bounded reads' }]} onChange={() => {}} /><span>Recorded current reads · evidence, interpretation and human decisions stay distinct</span></div>
    <div className="intelligence-hub__publish-summary">
      <Card bordered={false} rounded={false}><h2>Evidence available</h2><strong>{inventoryStatus}</strong><p>Evidence availability does not establish interpretation or approval.</p>{inspect('evidence', 'Inspect evidence readiness')}</Card>
      <Card bordered={false} rounded={false}><h2>Interpretation current</h2><strong>Not established</strong><p>Certification and human approval remain separate.</p></Card>
    </div>
    <section className="intelligence-hub__publish-row intelligence-hub__publish-attention"><div><h2>What needs attention</h2><strong>Review basis and publication checks</strong></div><Button size="sm" variant="outline" disabled={!active || !canInspect} onClick={() => navigate('Review')}>Open Review<FiArrowRight size={14} aria-hidden="true" /></Button></section>
    <section aria-label="Publication checks"><h2>Publication checks</h2>{CHECKS.map(title => <div key={title} className="intelligence-hub__publish-check"><strong>{title}</strong><span className="intelligence-hub__publish-warning">Not verified</span>{inspect('checks', 'Inspect', true)}</div>)}</section>
    <section className="intelligence-hub__publish-human" aria-label="Human decisions"><h2>Human decisions</h2>
      <div className="intelligence-hub__publish-check"><strong>Review completion</strong><span className="intelligence-hub__publish-warning">{reviewStatus}</span><Button size="sm" variant="outline" disabled={!active || !canInspect} onClick={() => navigate('Review')}>Go to completion<FiArrowRight size={14} aria-hidden="true" /></Button></div>
      <div className="intelligence-hub__publish-check"><strong>Exception disclosure</strong><span>Record not supplied</span>{inspect('disclosure')}</div>
      <div className="intelligence-hub__publish-check"><strong>Publication authorisation</strong><span className="intelligence-hub__publish-warning">Record not supplied</span>{inspect('authorisation')}</div>
    </section>
    <div className="intelligence-hub__publish-row"><div><strong>Intelligence certification · {canInspect && certificationLabel ? certificationLabel : 'Not established'}</strong><p>A human completion receipt is not certification or publication approval.</p></div>{inspect('assurance', 'Inspect assurance')}</div>
    <div className="intelligence-hub__publish-row"><span>Publish/Lock remains in Workspace Structure.</span>{structureLink}</div>
    <footer className="intelligence-hub__publish-footer"><Button size="sm" variant="outline" disabled={!active || !canInspect} onClick={() => navigate('Review')}><FiArrowLeft size={14} aria-hidden="true" />Review</Button><span>Current evidence, human decisions and certification stay distinct.</span><Button size="sm" variant="outline" disabled={!active || !canInspect} onClick={() => navigate('After lock')}>After lock<FiArrowRight size={14} aria-hidden="true" /></Button></footer>
    <details className="intelligence-hub__publish-advanced"><summary>Current readiness read basis</summary>{diagnostics}{completionDetails}<Button size="sm" variant="outline" disabled={!active || !canInspect || refreshing} onClick={() => { if (owned() && !refreshing) onRefresh() }}>Refresh readiness reads</Button><Button size="sm" variant="outline" disabled={!active || !canInspect} onClick={event => { if (owned()) onReport(event) }}>Preview assurance report</Button></details>
    {visible ? <Dialog open size="lg" className="intelligence-hub__dialog intelligence-hub__inspection-dialog intelligence-hub__publish-inspection" onClose={close} onCancel={event => { event.preventDefault(); if (event.target === event.currentTarget) close() }} aria-label={visible.kind === 'evidence' ? 'Detailed evidence readiness' : 'Contextual inspection'}>
      <Dialog.Header><h2>{visible.kind === 'evidence' ? 'Detailed evidence readiness' : 'Contextual inspection'}</h2></Dialog.Header>
      <Dialog.Body>{visible.kind === 'evidence' ? <><h3>Evidence snapshot</h3>{evidenceDetails}<h3>Interpretation</h3>{interpretationDetails}<h3>Classification and current-state anchors</h3><p>Verified, Reported, Hypothesis, Unresolved, Contradicted and Requires confirmation remain separate classifications. Highest validated state, first broken link and current constraint require recorded supporting evidence. Complete four-type findings are unavailable.</p><details><summary>Advanced evidence inspection</summary>{advancedEvidenceDetails}{publicationDetails}<Button size="sm" variant="outline" onClick={() => navigate('Evidence readiness')}>Open evidence readiness<FiArrowRight size={14} aria-hidden="true" /></Button></details></>
        : visible.kind === 'checks' ? <><h3>Exact publication basis</h3><p>Complete current check records are unavailable. No publication approval is implied.</p>{CHECKS.map(title => <p key={title}>{title}: Not verified</p>)}<details><summary>Recorded basis and limitations</summary>{publicationDetails}</details></>
        : visible.kind === 'disclosure' ? <><h3>Exception disclosure</h3><p>No governed exception disclosure record is supplied. Confirmed issues cannot be hidden or treated as resolved.</p><p>Disclosure provides transparency; it does not waive mandatory requirements or resolve independent findings.</p></>
        : visible.kind === 'authorisation' ? <><h3>Publication authorisation</h3><p>A governed grant, refusal or withdrawal receipt is unavailable. A current grant and the actual server action authority are required before execution in Workspace Structure.</p><p>No authorisation has been recorded here. Publish/Lock executes only in Workspace Structure.</p>{structureLink}</>
        : <><h3>Certification is separate</h3>{certificationLabel ? <><strong>{certificationLabel}</strong><p>{certificationSummary || 'Recorded server projection; its currency and publication authority are not independently verified here.'}</p><p>Server-projected certification remains separate from human completion and publication approval.</p></> : <p>No current certification is supplied by these bounded reads. Evidence acceptance, Quality decisions and human completion do not certify intelligence.</p>}</>}
      </Dialog.Body>
      <Dialog.Footer><Button size="sm" variant="outline" onClick={close}><FiArrowLeft size={14} aria-hidden="true" />Return to Readiness &amp; publish</Button></Dialog.Footer>
    </Dialog> : null}
  </div>
}
