import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Textarea } from '../../components/Textarea'
import { useGetEvidencePackageQuery, useLazyGetEvidencePackageReceiptQuery, useBatchReviewEvidenceMutation,
  useFreezeEvidencePackageMutation, useSaveEvidencePackageMutation } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { readEvidencePackage, verifyEvidencePackageReceipt, verifyEvidencePackageLinks } from './evidencePackageModel.js'

const label = key => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, character => character.toUpperCase())
const display = value => value === null || value === undefined || value === '' ? 'Not recorded'
  : typeof value === 'object' ? Array.isArray(value) ? value.length ? value.map(display).join(' · ') : 'None recorded'
    : Object.entries(value).map(([key, item]) => `${label(key)}: ${display(item)}`).join(' · ')
    : typeof value === 'string' && /^[A-Z_]{4,}$/.test(value) ? value.toLowerCase().replaceAll('_', ' ').replace(/^./, character => character.toUpperCase()) : String(value)
const availabilityMessage = reason => ({ READ_ONLY: 'This revision is available for inspection only.',
  REVIEW_COMPLETION_REQUIRED: 'Record current Review Completion before freezing package membership.',
  NO_ACCEPTED_EVIDENCE: 'No accepted evidence is available for a package.' }[reason] || 'Inspect the current review and package basis.')
function Facts({ value }) {
  return <dl className="intelligence-hub__inspection-facts">{Object.entries(value || {}).map(([key, item]) =>
    <div key={key}><dt>{label(key)}</dt><dd>{display(item)}</dd></div>)}</dl>
}
function PackageContents({ value, onOpenSource }) {
  if (!value) return <p>Package preview is unavailable. Inspect the current blocking reason.</p>
  return <>
    <p>This evidence package preserves recorded qualifications. It does not establish independent verification, customer truth, workspace lock or publication authority.</p>
    <h3>Qualification ledger</h3>
    {value.qualificationLedger.map(item => <details key={item.evidenceObjectId}><summary>{item.evidenceObjectId} · {item.sourceId}</summary>
      <Facts value={item} />{onOpenSource ? <Button size="sm" variant="outline" onClick={() => onOpenSource(item.sourceId, item.evidenceObjectId)}>Open exact source and evidence</Button> : null}
    </details>)}
    <h3>Evidence Register</h3>
    {value.evidenceRegister.length ? value.evidenceRegister.map((item, index) => <Facts key={item.evidenceObjectId || index} value={item} />) : <p>No accepted entries recorded.</p>}
    <h3>Validated Customer Baseline</h3><p>{display(value.baseline.classification)}</p>
    {value.baseline.statements.length ? value.baseline.statements.map((item, index) => <Facts key={item.evidenceObjectId || index} value={item} />) : <p>No baseline statements recorded.</p>}
    {Object.entries(value.analysis).map(([kind, items]) => <section key={kind}><h3>{label(kind)}</h3>
      {items.length ? items.map((item, index) => <Facts key={item.id || index} value={typeof item === 'object' ? item : { recordedValue: item }} />) : <p>None recorded; no interpretation has been invented.</p>}
    </section>)}
    <h3>Warnings and limitations</h3><p>{display(value.warnings)}</p>
  </>
}

export default function EvidencePackagePanel(props) {
  const session = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  return <ScopedEvidencePackagePanel key={JSON.stringify([props.scope, session, props.readOnly])} {...props} session={session} />
}

function ScopedEvidencePackagePanel({ scope, session, stateVersion, canInspect, locked = false, readOnly = false, onRecorded, onOpenSource }) {
  const query = useGetEvidencePackageQuery({ ...scope, sessionRevision: session }, { skip: !canInspect, refetchOnMountOrArgChange: true })
  const [readReceipt] = useLazyGetEvidencePackageReceiptQuery()
  const [batch] = useBatchReviewEvidenceMutation(), [freeze] = useFreezeEvidencePackageMutation(), [save] = useSaveEvidencePackageMutation()
  const [dialog, setDialog] = useState(null), [rationale, setRationale] = useState(''), [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [recorded, setRecorded] = useState(null)
  const frame = useRef(null), inFlight = useRef(false), attempt = useRef(null), opener = useRef(null), feedbackRef = useRef(null)
  const restoreFocus = useRef(null)
  const value = canInspect && !query.isLoading && !query.isFetching && !query.error ? readEvidencePackage(query.currentData, scope, stateVersion) : null
  // Authentication/scope lifetime is independent of data invalidation caused by
  // this command. Exact receipt verification may finish across its own refresh.
  const owner = JSON.stringify([scope, session, readOnly])
  const basis = value ? JSON.stringify([owner, stateVersion, canInspect, locked, value.control, value.freezePreview?.basisHash, value.latestFreeze?.receiptId, value.latestPackage?.receiptId]) : null
  const owned = () => frame.current?.owner === owner && frame.current?.alive && getSessionRevision() === session
  useLayoutEffect(() => {
    frame.current = { owner, alive: true }
    restoreFocus.current = null
    setDialog(null); setRecorded(null); setRationale(''); setFeedback(null)
    setBusy(Boolean(inFlight.current)); setBlocked(Boolean(attempt.current))
    return () => { frame.current = null; restoreFocus.current = null }
  }, [owner])
  useLayoutEffect(() => {
    if (frame.current?.owner === owner) Object.assign(frame.current, { basis, stateVersion, canInspect, locked })
    restoreFocus.current = null
    setDialog(null); setRecorded(null); setRationale('')
  }, [owner, basis, stateVersion, canInspect, locked])
  const currentBasis = () => owned() && basis && frame.current.basis === basis && frame.current.canInspect
  useEffect(() => { if (feedback) feedbackRef.current?.focus() }, [feedback])
  useEffect(() => {
    let current = true
    setRecorded(null)
    if (value?.latestFreeze) verifyEvidencePackageReceipt({ contractVersion: value.contractVersion, scope: value.scope, receipt: value.latestFreeze }, scope)
      .then(receipt => { if (current && owned()) setRecorded(receipt?.kind === 'FREEZE' ? { basis, receipt } : null) })
      .catch(() => { if (current && owned()) setRecorded(null) })
    return () => { current = false }
  // The server read/basis owns validation; departed reads cannot restore content.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basis, query.currentData])
  const visibleDialog = dialog?.basis === basis && basis && owned() ? dialog : null
  useLayoutEffect(() => {
    if (visibleDialog || !restoreFocus.current) return
    const intent = restoreFocus.current
    restoreFocus.current = null
    if (intent.owner === owner && intent.basis === basis && frame.current?.owner === owner && frame.current.alive
      && frame.current.basis === basis && frame.current.canInspect && getSessionRevision() === session
      && intent.opener?.isConnected) intent.opener.focus()
  }, [visibleDialog, owner, basis, session])
  const verifiedReceipt = recorded?.basis === basis ? recorded.receipt : null
  const verifiedFreeze = verifiedReceipt?.kind === 'FREEZE' && verifiedReceipt.receiptId === value?.latestFreeze?.receiptId
    && verifiedReceipt.currency === 'CURRENT' ? verifiedReceipt : null
  const canWrite = Boolean(value?.canWrite && !readOnly && !locked && !busy && !blocked && !inFlight.current)
  const canRecover = Boolean(value && !readOnly && !busy && !blocked && !inFlight.current && attempt.current)
  const open = (kind, event) => { if (!currentBasis()) return; restoreFocus.current = null; opener.current = event.currentTarget; setDialog({ kind, basis }) }
  const close = () => {
    if (!currentBasis() || inFlight.current) return
    restoreFocus.current = { owner, basis, opener: opener.current }
    setDialog(null)
  }
  const refresh = async () => {
    if (!owned() || inFlight.current) return
    setBusy(true)
    try {
      const result = await query.refetch()
      if (!owned()) return
      const current = !result.error && readEvidencePackage(result.data, scope, frame.current.stateVersion)
      setBlocked(!current)
      setFeedback({ error: !current, message: current ? attempt.current ? 'Current reads refreshed. Inspect and explicitly recover the original command; no automatic retry occurred.' : 'Current package basis refreshed.' : 'Current package read could not be verified.' })
    } finally { if (frame.current) setBusy(false) }
  }
  const execute = async (kind, recover = false) => {
    if (!currentBasis() || (recover ? !canRecover : !canWrite || frame.current.locked) || inFlight.current || !value || (!recover && visibleDialog?.kind !== kind)) return
    let command = recover ? attempt.current : null
    if (!recover && attempt.current) return
    if (!command) {
      const common = { requestKey: crypto.randomUUID(), confirm: true }
      const control = { expectedUpdatedAt: value.control.runtimeUpdatedAt, expectedStateVersion: value.control.stateVersion }
      if (kind === 'BATCH') {
        if (!value.batch.eligibleIds.length || rationale.trim() && (rationale.trim().length < 10 || rationale.trim().length > 2000)) return
        command = { kind, expectedAcceptedIds: [...value.batch.eligibleIds], body: { ...common, ...control, expectedPopulationHash: value.control.populationHash, ...(rationale.trim() ? { rationale: rationale.trim() } : {}) } }
      } else if (kind === 'FREEZE') {
        if (!value.availability.canFreeze || !value.completion?.receiptId || !value.freezePreview) return
        command = { kind, body: { ...common, ...control, completionReceiptId: value.completion.receiptId, expectedBasisHash: value.freezePreview.basisHash } }
      } else {
        if (!value.availability.canSave || !verifiedFreeze) return
        command = { kind, body: { ...common, freezeReceiptId: verifiedFreeze.receiptId, expectedMembershipHash: verifiedFreeze.body.membershipHash } }
      }
      attempt.current = command
    }
    inFlight.current = true; setBusy(true); setBlocked(true); setDialog(null)
    try {
      const mutate = { BATCH: batch, FREEZE: freeze, PACKAGE: save }[command.kind]
      const response = await mutate({ ...scope, body: command.body }).unwrap()
      if (!owned()) return
      const receipt = await verifyEvidencePackageReceipt(response, scope, command)
      if (!owned()) return
      if (!receipt) throw new Error('The returned receipt could not be verified against the exact command.')
      const readback = await readReceipt({ ...scope, receiptId: receipt.receiptId }, false).unwrap()
      if (!owned()) return
      const reopened = await verifyEvidencePackageReceipt(readback, scope, command)
      if (!owned()) return
      if (!reopened || reopened.bodyHash !== receipt.bodyHash || reopened.receiptId !== receipt.receiptId) throw new Error('The saved receipt could not be reopened exactly.')
      if (reopened.kind === 'PACKAGE') {
        const freezeRead = await readReceipt({ ...scope, receiptId: reopened.body.freezeReceiptId }, false).unwrap()
        if (!owned()) return
        const frozen = await verifyEvidencePackageReceipt(freezeRead, scope)
        if (!owned()) return
        if (!await verifyEvidencePackageLinks(reopened, frozen)) throw new Error('Saved package evidence does not match its exact frozen membership.')
        if (!owned()) return
      }
      attempt.current = null
      const refreshed = await query.refetch()
      if (!owned()) return
      const related = onRecorded ? await onRecorded() : true
      if (!owned()) return
      if (refreshed.error || !related) throw new Error('Saved receipt verified; current related reads could not be refreshed. Inspect before continuing.')
      setBlocked(false); setRationale('')
      setFeedback({ error: false, message: `${command.kind === 'BATCH' ? 'Batch decisions' : command.kind === 'FREEZE' ? 'Package membership' : 'Evidence package'} saved and reopened. Receipt ${receipt.receiptId}. ${reopened.currency === 'STALE' ? 'This recorded result is historical; inspect the current basis.' : 'Workspace locking and publication remain separate.'}` })
    } catch (error) {
      if (owned()) setFeedback({ error: true, message: `${error?.data?.error?.message || error?.data?.message || error.message || 'The command could not be confirmed.'} Refresh and inspect before explicit recovery.` })
    } finally { inFlight.current = false; if (frame.current) setBusy(false) }
  }
  const inspectRecorded = async event => {
    if (!currentBasis() || !value?.latestPackage || busy) return
    restoreFocus.current = null
    const captured = basis; opener.current = event.currentTarget; setBusy(true)
    try {
      const result = await readReceipt({ ...scope, receiptId: value.latestPackage.receiptId }, false).unwrap()
      if (!owned()) return
      const receipt = await verifyEvidencePackageReceipt(result, scope)
      if (!owned()) return
      if (!receipt || receipt.kind !== 'PACKAGE' || receipt.receiptId !== value.latestPackage.receiptId) throw new Error('Saved package readback did not match the selected receipt.')
      const freezeRead = await readReceipt({ ...scope, receiptId: receipt.body.freezeReceiptId }, false).unwrap()
      if (!owned()) return
      const frozen = await verifyEvidencePackageReceipt(freezeRead, scope)
      if (!owned()) return
      if (!await verifyEvidencePackageLinks(receipt, frozen)) throw new Error('The recorded package does not reconcile to its frozen membership.')
      if (!owned()) return
      setDialog({ kind: 'RECORDED', basis: captured, receipt })
    } catch (error) { if (owned()) setFeedback({ error: true, message: error.message || 'Saved package unavailable.' }) }
    finally { if (owned()) setBusy(false) }
  }
  const source = (sourceId, evidenceId) => {
    if (!currentBasis() || !onOpenSource) return
    restoreFocus.current = null
    setDialog(null)
    onOpenSource(sourceId, evidenceId)
  }
  return <Card variant="outlined" className="intelligence-hub__panel" aria-label="Qualified evidence package">
    <h2>Qualified evidence package</h2>
    {feedback ? <p ref={feedbackRef} tabIndex={-1} role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p> : null}
    {!value ? <p role={query.error ? 'alert' : 'status'}>{query.isLoading || query.isFetching ? 'Loading complete package basis…' : 'Current package basis unavailable or inconsistent with the selected revision.'}</p> : <>
      <p>{value.batch.eligibleIds.length} eligible pending evidence items · {value.batch.excluded.length} excluded. This count covers the server population, independently of Review filters.</p>
      <p>{availabilityMessage(value.availability.reason)}</p>
      <div className="intelligence-hub__review-inspect-actions">
        {!readOnly ? <><Button size="sm" variant="outline" disabled={!canWrite || Boolean(attempt.current) || !value.batch.eligibleIds.length} onClick={event => open('BATCH', event)}>Accept all eligible</Button>
          <Button size="sm" variant="outline" disabled={!canWrite || Boolean(attempt.current) || !value.availability.canFreeze} onClick={event => open('FREEZE', event)}>Freeze package membership</Button>
          <Button size="sm" disabled={!canWrite || Boolean(attempt.current) || !value.availability.canSave || !verifiedFreeze} onClick={event => open('PACKAGE', event)}>Save evidence package</Button></> : null}
        <Button size="sm" variant="outline" disabled={!value.packagePreview || busy} onClick={event => open('PREVIEW', event)}>Preview evidence package</Button>
        <Button size="sm" variant="outline" disabled={!value.latestPackage || busy} onClick={inspectRecorded}>Reopen saved package</Button>
      </div>
      <p>Complete review, freeze package membership and save the package are explicit separate steps. No source verification, workspace lock or publication is implied.</p>
      {verifiedReceipt ? <Facts value={{ receiptId: verifiedReceipt.receiptId, kind: verifiedReceipt.kind, currency: verifiedReceipt.currency, bodyHash: verifiedReceipt.bodyHash, auditId: verifiedReceipt.auditId }} /> : value.latestPackage || value.latestFreeze ? <p>Recorded receipt integrity has not been verified in this view.</p> : null}
    </>}
    <Button size="sm" variant="outline" disabled={!canInspect || busy} onClick={refresh}>Refresh package reads</Button>
    {attempt.current ? <Button size="sm" variant="outline" disabled={!canRecover} onClick={() => execute(attempt.current.kind, true)}>Recover original command</Button> : null}
    {visibleDialog ? <Dialog open size="lg" className="intelligence-hub__dialog intelligence-hub__inspection-dialog" aria-label={visibleDialog.kind === 'BATCH' ? 'Confirm batch evidence acceptance' : visibleDialog.kind === 'FREEZE' ? 'Confirm package membership freeze' : visibleDialog.kind === 'PACKAGE' ? 'Confirm evidence package save' : 'Evidence package inspection'} onClose={close}>
      <Dialog.Header><h2>{visibleDialog.kind === 'BATCH' ? 'Accept all eligible evidence' : visibleDialog.kind === 'FREEZE' ? 'Freeze exact package membership' : visibleDialog.kind === 'PACKAGE' ? 'Save qualified evidence package' : visibleDialog.kind === 'RECORDED' ? 'Recorded evidence package' : 'Evidence package preview'}</h2></Dialog.Header>
      <Dialog.Body>{visibleDialog.kind === 'BATCH' ? <>
        <p>Explicitly accept {value.batch.eligibleIds.length} eligible pending items in the complete population. Existing accepted and rejected items remain unchanged. Quality decisions and review completion remain separate.</p>
        <Facts value={{ eligibleIds: value.batch.eligibleIds, exclusions: value.batch.excluded, populationHash: value.control.populationHash }} />
        <Textarea label="Optional shared acceptance note" size="sm" rows={3} fullWidth maxLength={2000} value={rationale} onChange={event => { if (currentBasis()) setRationale(event.target.value) }} helperText="Optional; supplied notes use 10–2000 characters. Individual overrides remain available." />
      </> : visibleDialog.kind === 'FREEZE' ? <><p>This freezes the accepted package membership only. It does not lock or publish the workspace.</p><Facts value={value.freezePreview} /></>
        : visibleDialog.kind === 'PACKAGE' ? <><p>Save the package against the exact verified membership. Original evidence and the locked predecessor remain unchanged.</p><Facts value={{ freezeReceiptId: value.latestFreeze?.receiptId, membershipHash: value.latestFreeze?.body?.membershipHash }} /></>
          : <>{visibleDialog.receipt ? <Facts value={{ receiptId: visibleDialog.receipt.receiptId, currency: visibleDialog.receipt.currency, membershipHash: visibleDialog.receipt.body.membershipHash, ledgerHash: visibleDialog.receipt.body.ledgerHash, outputHash: visibleDialog.receipt.body.outputHash }} /> : <p>Preview only; this view does not save a package.</p>}
            <PackageContents value={visibleDialog.receipt?.body || value.packagePreview} onOpenSource={onOpenSource ? source : null} /></>}
      </Dialog.Body>
      <Dialog.Footer>{['BATCH', 'FREEZE', 'PACKAGE'].includes(visibleDialog.kind) ? <Button size="sm" disabled={!canWrite || visibleDialog.kind === 'BATCH' && Boolean(rationale.trim()) && (rationale.trim().length < 10 || rationale.trim().length > 2000)} onClick={() => execute(visibleDialog.kind)}>Confirm {visibleDialog.kind === 'BATCH' ? 'batch acceptance' : visibleDialog.kind === 'FREEZE' ? 'membership freeze' : 'package save'}</Button> : null}
        <Button size="sm" variant="outline" onClick={close}>{['PREVIEW', 'RECORDED'].includes(visibleDialog.kind) ? 'Return to evidence' : 'Cancel'}</Button></Dialog.Footer>
    </Dialog> : null}
  </Card>
}
