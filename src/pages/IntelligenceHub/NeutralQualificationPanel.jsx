import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '../../components/Button'
import { Textarea } from '../../components/Textarea'
import { useGetEvidenceNeutralQualificationQuery, useGetEvidenceNeutralQualificationHistoryQuery,
  useSaveEvidenceNeutralQualificationMutation, useLazyGetEvidenceNeutralQualificationReceiptQuery,
  useLazyGetEvidenceNeutralQualificationRequestQuery } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { NEUTRAL_FIELDS, neutralFactsValid, readNeutralQualification, readNeutralReceiptResponse, readNeutralHistory } from './neutralQualificationModel.js'

const materialLabel = value => value === 'MATCHES_CURRENT_MATERIAL' ? 'Matches current source and evidence'
  : value === 'STALE_MATERIAL' ? 'Source or evidence changed since recording' : 'No qualification recorded'
function RecordedQualification({ value, currency }) {
  return value ? <section aria-label="Recorded neutral qualification">
    <p>{currency === 'HISTORICAL' ? 'Earlier qualification record' : 'Recorded qualification'} · Recorded by {value.authoredBy} · {value.authoredAt}</p>
    <dl className="intelligence-hub__inspection-facts">{NEUTRAL_FIELDS.map(([key, label]) =>
      <div key={key}><dt>{label}</dt><dd>{value.facts[key] === null ? 'Not recorded' : value.facts[key]}</dd></div>)}</dl>
  </section> : <p>No neutral qualification has been recorded for this evidence object.</p>
}

export default function NeutralQualificationPanel(props) {
  const session = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const identity = JSON.stringify([props.scope?.runtimeInstanceId, props.scope?.customerId, props.scope?.tenantId,
    props.evidenceObjectId, props.sourceId, session])
  return <ScopedNeutralQualificationPanel key={identity} {...props} session={session} identity={identity} />
}
function ScopedNeutralQualificationPanel({ scope, evidenceObjectId, sourceId, stateVersion, locked = false,
  canInspect = true, onRecorded, ownsIntent, session, identity }) {
  const args = { runtimeInstanceId: scope.runtimeInstanceId, customerId: scope.customerId, tenantId: scope.tenantId,
    evidenceObjectId, sourceId, sessionRevision: session }
  const query = useGetEvidenceNeutralQualificationQuery(args, { skip: !canInspect, refetchOnMountOrArgChange: true })
  const [cursor, setCursor] = useState(null), [previous, setPrevious] = useState([])
  const history = useGetEvidenceNeutralQualificationHistoryQuery({ ...args, limit: 5, ...(cursor ? { cursor } : {}) }, { skip: !canInspect, refetchOnMountOrArgChange: true })
  const [save] = useSaveEvidenceNeutralQualificationMutation()
  const [readReceipt] = useLazyGetEvidenceNeutralQualificationReceiptQuery()
  const [readRequest] = useLazyGetEvidenceNeutralQualificationRequestQuery()
  const [currentCheck, setCurrentCheck] = useState(null), [historyCheck, setHistoryCheck] = useState(null)
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(null), [note, setNote] = useState(''), [draftBasis, setDraftBasis] = useState(null)
  const [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [feedback, setFeedback] = useState(null)
  const [reopened, setReopened] = useState(null)
  const frame = useRef(null), inFlight = useRef(false), attempt = useRef(null), feedbackRef = useRef(null)
  const owned = () => frame.current?.identity === identity && getSessionRevision() === session
    && (!frame.current.ownsIntent || frame.current.ownsIntent())
  useLayoutEffect(() => {
    frame.current = { identity, stateVersion, locked, canInspect, ownsIntent }
    return () => { frame.current = null }
  }, [identity, stateVersion, locked, canInspect, ownsIntent])
  useEffect(() => {
    let active = true
    if (!query.error && !query.isFetching && query.currentData && canInspect) {
      readNeutralQualification(query.currentData, args, stateVersion).then(value => {
        if (active && owned()) setCurrentCheck({ input: query.currentData, stateVersion, value })
      }).catch(() => { if (active && owned()) setCurrentCheck({ input: query.currentData, stateVersion, value: null }) })
    }
    return () => { active = false }
    // args is identified by the scoped component key; stateVersion is a read basis, not account identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, stateVersion, canInspect, query.currentData, query.isFetching, query.error])
  useEffect(() => {
    let active = true
    if (!history.error && !history.isFetching && history.currentData && canInspect) {
      readNeutralHistory(history.currentData, args).then(value => {
        if (active && owned()) setHistoryCheck({ input: history.currentData, cursor, value })
      }).catch(() => { if (active && owned()) setHistoryCheck({ input: history.currentData, cursor, value: null }) })
    }
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, canInspect, cursor, history.currentData, history.isFetching, history.error])
  useEffect(() => { if (feedback) feedbackRef.current?.focus() }, [feedback])
  const current = canInspect && !query.error && !query.isFetching && !query.isLoading && currentCheck?.input === query.currentData
    && currentCheck.stateVersion === stateVersion ? currentCheck.value : null
  const records = canInspect && !history.error && !history.isFetching && historyCheck?.input === history.currentData
    && historyCheck.cursor === cursor ? historyCheck.value : null
  const basis = current ? JSON.stringify([current.control, current.qualificationHash]) : null
  const canWrite = Boolean(current?.canWrite && !locked && !blocked && !busy && !inFlight.current && (!editing || draftBasis === basis))
  const fresh = () => owned() && frame.current.canInspect && !frame.current.locked && current
    && frame.current.stateVersion === current.control.stateVersion && !inFlight.current
  const edit = () => {
    if (!fresh() || !canWrite || attempt.current) return
    setDraft(Object.fromEntries(NEUTRAL_FIELDS.map(([key]) => [key, current.qualification?.facts[key] ?? ''])))
    setNote(''); setDraftBasis(basis); setEditing(true); setReopened(null); setCursor(null); setPrevious([])
  }
  const cancel = () => { if (owned() && !inFlight.current && !attempt.current) { setEditing(false); setDraft(null); setNote('') } }
  const facts = draft && Object.fromEntries(NEUTRAL_FIELDS.map(([key]) => [key, draft[key].trim() || null]))
  const finish = async (response, command) => {
    const returned = await readNeutralReceiptResponse(response, args, { command, requestKey: command.requestKey })
    if (!owned()) return
    if (!returned) throw new Error('The qualification receipt does not match this exact request.')
    const exact = await readReceipt({ ...args, receiptId: returned.receipt.receiptId }, false).unwrap()
    if (!owned()) return
    const verified = await readNeutralReceiptResponse(exact, args, { command, receiptId: returned.receipt.receiptId })
    if (!owned()) return
    if (!verified || verified.receipt.bodyHash !== returned.receipt.bodyHash) throw new Error('The saved qualification could not be reopened exactly.')
    setReopened(verified)
    const [currentResult, historyResult] = await Promise.all([query.refetch(), history.refetch()])
    if (!owned()) return
    const latest = !currentResult.error && await readNeutralQualification(currentResult.data, args)
    const ledger = !historyResult.error && await readNeutralHistory(historyResult.data, args)
    if (!owned()) return
    if (!latest || !ledger || (verified.receiptCurrency === 'CURRENT' && latest.latestReceipt?.receiptId !== verified.receipt.receiptId)) {
      throw new Error('The receipt is verified, but current qualification or history reads could not be verified. Further saves remain blocked.')
    }
    const related = onRecorded ? await onRecorded() : true
    if (!owned()) return
    if (related === false) throw new Error('The receipt is verified, but related workspace reads could not be refreshed. Further saves remain blocked.')
    attempt.current = null; setBlocked(false); setEditing(false); setDraft(null); setNote('')
    setFeedback({ error: false, message: `Qualification saved and reopened. ${verified.receiptCurrency === 'HISTORICAL'
      ? 'This is an earlier record; inspect the current qualification.' : 'Evidence acceptance and source verification are unchanged.'}` })
  }
  const submit = async event => {
    event.preventDefault()
    if (!fresh() || !canWrite || attempt.current || !neutralFactsValid(facts) || note.trim().length > 2000) return
    const command = { requestKey: crypto.randomUUID(), expectedStateVersion: current.control.stateVersion,
      expectedUpdatedAt: current.control.updatedAt, expectedEvidenceFingerprint: current.control.evidenceFingerprint,
      expectedSourceFingerprint: current.control.sourceFingerprint, expectedQualificationHash: current.qualificationHash,
      facts, rationale: note.trim() || null }
    attempt.current = command; inFlight.current = true; setBusy(true); setBlocked(true); setFeedback(null)
    try { const response = await save({ ...args, body: command }).unwrap(); if (owned()) await finish(response, command) }
    catch (error) {
      if (owned()) {
        if (error?.status === 422) { attempt.current = null; setBlocked(false) }
        setFeedback({ error: true, message: error?.data?.error?.message || error.message || 'The save is unconfirmed. Further saves are blocked; recover the original request or inspect current reads.' })
      }
    } finally { inFlight.current = false; if (owned()) setBusy(false) }
  }
  const recover = async () => {
    if (!owned() || !canInspect || inFlight.current || !attempt.current) return
    inFlight.current = true; setBusy(true)
    try { const response = await readRequest({ ...args, requestKey: attempt.current.requestKey }, false).unwrap(); if (owned()) await finish(response, attempt.current) }
    catch (error) { if (owned()) setFeedback({ error: true, message: error?.data?.error?.message || error.message || 'The original request is still unresolved. No new save was sent.' }) }
    finally { inFlight.current = false; if (owned()) setBusy(false) }
  }
  const inspect = async receiptId => {
    if (!owned() || !canInspect || inFlight.current || !records?.items.some(item => item.receiptId === receiptId)) return
    inFlight.current = true; setBusy(true)
    try {
      const response = await readReceipt({ ...args, receiptId }, false).unwrap()
      if (!owned()) return
      const value = await readNeutralReceiptResponse(response, args, { receiptId })
      if (!owned()) return
      if (!value) throw new Error('The exact qualification record could not be verified.')
      setReopened(value)
    } catch (error) { if (owned()) { setReopened(null); setFeedback({ error: true, message: error.message || 'The exact record is unavailable.' }) } }
    finally { inFlight.current = false; if (owned()) setBusy(false) }
  }
  const refresh = async () => {
    if (!owned() || inFlight.current || !canInspect) return
    inFlight.current = true; setBusy(true)
    try {
      const [a, b] = await Promise.all([query.refetch(), history.refetch()])
      if (!owned()) return
      const valid = !a.error && await readNeutralQualification(a.data, args)
      const validHistory = !b.error && await readNeutralHistory(b.data, args)
      if (!owned()) return
      if (!valid || !validHistory) throw new Error('Qualification or history reads are unavailable. No new save was sent.')
      setFeedback({ error: false, message: attempt.current ? 'Reads refreshed. The original request remains unresolved; recover it explicitly.' : 'Qualification reads refreshed.' })
      if (onRecorded) await onRecorded()
    } catch (error) { if (owned()) setFeedback({ error: true, message: error.message || 'The reads could not be refreshed.' }) }
    finally { inFlight.current = false; if (owned()) setBusy(false) }
  }
  return <section aria-label="Neutral evidence qualification">
    <h3>Evidence qualification</h3>
    <p>Record known details and leave unknown details unrecorded. This does not establish authenticity, confidence, acceptance, section mapping or permission to generate an output.</p>
    {!current ? <p role={query.error ? 'alert' : 'status'}>{query.isLoading || query.isFetching ? 'Loading qualification…' : 'Current qualification is unavailable or does not match this evidence and revision.'}</p>
      : <><p>{materialLabel(current.bindingCurrency)}. This describes the recorded binding, not the authored currentness statement.</p>
        <RecordedQualification value={current.qualification} />
        {!current.canWrite || locked ? <p>Qualification inspection is read-only for this revision or permission.</p> : null}
        {!editing ? <Button size="sm" variant="outline" disabled={!canWrite} onClick={edit}>Edit qualification</Button> : null}</>}
    {editing ? <form aria-label="Record neutral evidence qualification" onSubmit={submit}>
      {basis && draftBasis !== basis ? <p role="alert">The qualification basis changed. Cancel this draft and inspect the current record before editing again.</p> : null}
      {NEUTRAL_FIELDS.map(([key, label, maxLength]) => <Textarea key={key} label={label} size="sm" rows={2} fullWidth
        value={draft?.[key] ?? ''} maxLength={maxLength} disabled={!canWrite} helperText="Leave blank for Not recorded; no fact is inferred."
        onChange={event => { if (fresh() && canWrite) setDraft(previousDraft => ({ ...previousDraft, [key]: event.target.value })) }} />)}
      <Textarea label="Qualification note (optional)" size="sm" rows={2} fullWidth value={note} maxLength={2000} disabled={!canWrite}
        onChange={event => { if (fresh() && canWrite) setNote(event.target.value) }} />
      <div className="intelligence-hub__review-confirm-actions"><Button size="sm" type="submit" disabled={!canWrite || !neutralFactsValid(facts)}>Save qualifications</Button>
        <Button size="sm" variant="outline" disabled={busy || Boolean(attempt.current)} onClick={cancel}>Cancel qualification edit</Button></div>
    </form> : null}
    {blocked ? <p role="alert">Further saves are blocked until the original request and current reads can be verified. Closing this inspection does not undo a committed record.</p> : null}
    {attempt.current ? <Button size="sm" variant="outline" aria-label="Recover original qualification request" disabled={busy || !canInspect} onClick={recover}>Recover original request</Button> : null}
    <Button size="sm" variant="outline" aria-label="Refresh qualification and workspace reads" disabled={busy || !canInspect} onClick={refresh}>Refresh qualification reads</Button>
    {feedback ? <p ref={feedbackRef} tabIndex={-1} role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p> : null}
    <h4>Recorded qualification history</h4>
    {!records ? <p role={history.error ? 'alert' : 'status'}>{history.isLoading || history.isFetching ? 'Loading qualification history…' : 'Qualification history is unavailable; no empty history has been assumed.'}</p>
      : <>{records.items.length ? <ul>{records.items.map(receipt => <li key={receipt.receiptId}>
        <span>{receipt.body.qualification.authoredAt} · {receipt.body.qualification.authoredBy}</span>{' '}
        <Button size="sm" variant="outline" aria-label={`Reopen qualification ${receipt.receiptId}`} disabled={busy} onClick={() => inspect(receipt.receiptId)}>Reopen qualification</Button>
      </li>)}</ul> : <p>No qualification records were returned for this history page.</p>}
        <Button size="sm" variant="outline" aria-label="Previous qualification records" disabled={busy || !previous.length} onClick={() => { if (owned()) { setCursor(previous.at(-1)); setPrevious(previous.slice(0, -1)) } }}>Previous records</Button>
        <Button size="sm" variant="outline" aria-label="Next qualification records" disabled={busy || !records.nextCursor} onClick={() => { if (owned()) { setPrevious([...previous, cursor]); setCursor(records.nextCursor) } }}>Next records</Button></>}
    {reopened ? <><p>{materialLabel(reopened.bindingCurrency)} · {reopened.receiptCurrency === 'HISTORICAL' ? 'Earlier recorded receipt' : 'Latest recorded receipt'}</p>
      <RecordedQualification value={reopened.qualification} currency={reopened.receiptCurrency} /><p>Recorded note: {reopened.receipt.body.rationale ?? 'Not recorded'}</p></> : null}
  </section>
}
