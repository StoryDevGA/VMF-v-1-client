import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Select } from '../../components/Select'
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiLock } from 'react-icons/fi'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { displayHubToken } from './intelligenceHubModel.js'
import RecordedLockBasisDetails from './RecordedLockBasisDetails.jsx'

export default function AfterLockView({ renderer, lockBasis, lockBasisLoading, scope, stateVersion, route, active, canInspect, onBasisInspectionReady, onSelectView, onRefresh, refreshing }) {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const scopeKey = JSON.stringify(scope)
  const ownerKey = JSON.stringify([scope, stateVersion, route, active, canInspect, lockBasisLoading, lockBasis?.available, lockBasis?.locked, lockBasis?.reason, lockBasis?.snapshot?.snapshotHash, sessionRevision])
  const token = Symbol('after-lock-frame')
  const frame = useRef(null), opener = useRef(null), restore = useRef(null), latestBasis = useRef(null)
  const [inspection, setInspection] = useState(null)
  useLayoutEffect(() => {
    frame.current = { token, ownerKey }
    return () => { if (frame.current?.token === token) frame.current = null }
  })
  const owned = () => active && canInspect && frame.current?.token === token && frame.current.ownerKey === ownerKey && getSessionRevision() === sessionRevision
  const visible = active && canInspect && inspection?.owner === ownerKey && getSessionRevision() === sessionRevision
  useLayoutEffect(() => { if (inspection && (!active || !canInspect || inspection.owner !== ownerKey)) setInspection(null) }, [inspection, active, canInspect, ownerKey])
  useLayoutEffect(() => {
    if (visible || !restore.current) return
    const intent = restore.current; restore.current = null
    if (owned() && intent.owner === ownerKey && intent.opener?.isConnected) intent.opener.focus()
  })
  const open = trigger => { if (owned()) { opener.current = trigger; setInspection({ owner: ownerKey }) } }
  const close = () => { if (owned()) { restore.current = { owner: ownerKey, opener: opener.current }; setInspection(null) } }
  useLayoutEffect(() => {
    latestBasis.current = { ownerKey, available: owned, open }
    return () => { latestBasis.current = null }
  })
  useLayoutEffect(() => {
    const current = () => latestBasis.current?.ownerKey === ownerKey ? latestBasis.current : null
    const registration = { current: () => ({ available: Boolean(current()?.available()), ownerKey, sessionRevision, scopeKey, stateVersion, route }), open: trigger => current()?.open(trigger) }
    onBasisInspectionReady?.(registration, active && canInspect)
    return () => onBasisInspectionReady?.(registration, false, true)
  }, [onBasisInspectionReady, active, canInspect, ownerKey, sessionRevision, scopeKey, stateVersion, route])
  const navigate = view => { if (owned()) onSelectView(view) }
  const locked = canInspect && !lockBasisLoading && lockBasis?.available === true && lockBasis?.locked === true
  const unlocked = canInspect && !lockBasisLoading && lockBasis?.reason === 'LOCK_NOT_RECORDED'
  const revision = renderer?.revision?.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Selected revision'
  const notice = locked ? `${revision} is frozen. New evidence is reviewed separately before any updated revision is created.`
    : lockBasisLoading ? 'Checking the selected revision’s lock basis…'
      : unlocked ? 'These protections apply only after a verified lock. The selected revision has no recorded lock.' : 'The selected revision’s lock basis could not be verified. No frozen revision is asserted.'
  const inspectButton = title => <Button size="sm" variant="outline" disabled={!active || !canInspect} onClick={event => open(event.currentTarget)}>{title}</Button>
  return <div className="intelligence-hub__after-lock-workspace">
    <div className="intelligence-hub__after-lock-notice"><FiLock size={16} aria-hidden="true" /><span>{notice}</span><Button size="sm" variant="outline" disabled={!active || !canInspect} onClick={event => open(event.currentTarget)}>Why this is separate<FiArrowUpRight size={14} aria-hidden="true" /></Button></div>
    <section className="intelligence-hub__after-lock-empty" role="status" aria-label="Post-lock discovery inbox"><strong>{lockBasisLoading ? 'Checking lock basis' : unlocked ? 'After-lock review not active' : locked ? 'Post-lock inbox not supplied' : 'Lock basis unavailable'}</strong><p>{locked ? 'This is not a zero-item result.' : unlocked ? 'Post-lock inbox is not active because the selected revision is unlocked.' : lockBasisLoading ? 'Post-lock evidence cannot be assessed while the scoped lock read is pending.' : 'Post-lock evidence cannot be assessed without a verified lock basis.'} <Button size="sm" variant="outline" disabled={!active || !canInspect} onClick={() => navigate('Context')}>Gather separate evidence</Button>{inspectButton('Inspect basis and history')}</p></section>
    <footer className="intelligence-hub__after-lock-footer"><Button size="sm" variant="outline" disabled={!active || !canInspect} onClick={() => navigate('Readiness & publish')}><FiArrowLeft size={14} aria-hidden="true" />Readiness &amp; publish</Button><small>Navigation does not approve evidence or change the revision.</small><Button size="sm" variant="outline" disabled={!active || !canInspect} onClick={() => navigate('Coverage')}>Coverage<FiArrowRight size={14} aria-hidden="true" /></Button></footer>
    <details className="intelligence-hub__after-lock-advanced"><summary>Recorded lock read basis</summary><RecordedLockBasisDetails model={canInspect ? lockBasis : null} loading={lockBasisLoading} /><p>Canonical readiness: {canInspect ? displayHubToken(renderer?.readiness?.state) : 'Unavailable'}. Outcome readiness: Unavailable.</p><p>Recorded publication state: {canInspect ? displayHubToken(renderer?.publish?.state) : 'Unavailable'}. Recorded output eligibility: {canInspect && typeof renderer?.publish?.outputEligibility?.outputEligible === 'boolean' ? renderer.publish.outputEligibility.outputEligible ? 'Eligible' : 'Not eligible' : 'Unavailable'}.</p><Button size="sm" variant="outline" disabled={!active || !canInspect || refreshing} aria-busy={Boolean(refreshing)} onClick={() => { if (owned() && !refreshing) onRefresh() }}>Refresh lock reads</Button></details>
    {visible ? <Dialog open size="lg" className="intelligence-hub__dialog intelligence-hub__inspection-dialog intelligence-hub__after-lock-inspection" aria-label="After-lock basis and impact history" onClose={close} onCancel={event => { event.preventDefault(); if (event.target === event.currentTarget) close() }}>
      <Dialog.Header><h2>After-lock basis and impact history</h2></Dialog.Header>
      <Dialog.Body><Select className="intelligence-hub__inspection-record" label="Record" size="sm" value="after-lock" options={[{value:'after-lock',label:'After-lock basis and impact history'}]} onChange={() => {}} /><p>Inspect acquisition in Context, sources in Sources and evidence decisions in Review. Navigation grants no acquisition or successor authority. Locked Context cannot acquire evidence. Post-lock intake, impact assessment, approval and updated revision continuity are not supplied by these reads.</p><dl className="intelligence-hub__inspection-facts">{[
        ['Protected understanding', locked ? `Recorded locked ${revision}` : unlocked ? 'No recorded lock' : 'Lock basis unavailable'],
        ['Exact frozen assertions and new versions', 'Not supplied · frozen membership not recorded'],
        ['Production post-lock inbox and history', 'Not supplied'],
        ['Updated revision continuity', 'Not supplied'],
      ].map(([title,value]) => <div key={title}><dt>{title}</dt><dd>{value}</dd></div>)}</dl><Button size="sm" variant="outline" onClick={() => navigate('Context')}>Gather separate evidence<FiArrowRight size={14} aria-hidden="true" /></Button><Button size="sm" variant="outline" onClick={() => navigate('Review')}>Review evidence<FiArrowRight size={14} aria-hidden="true" /></Button></Dialog.Body>
      <Dialog.Footer><Button size="sm" variant="outline" onClick={close}><FiArrowLeft size={14} aria-hidden="true" />Back to After lock</Button></Dialog.Footer>
    </Dialog> : null}
  </div>
}
