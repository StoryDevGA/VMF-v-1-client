import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useGetReviewCompletionQuery, useCompleteReviewMutation } from '../../store/api/runtimeInstanceApi.js'
import { Button } from '../../components/Button'
import { Textarea } from '../../components/Textarea'
import { readCompletion } from './reviewCompletionModel.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'


export default function ReviewCompletionPanel(props) {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  return <ScopedReviewCompletionPanel key={JSON.stringify([props.scope, sessionRevision])} {...props} sessionRevision={sessionRevision} />
}

function ScopedReviewCompletionPanel({ scope, sessionRevision, readOnly = false, locked = false, onRecorded }) {
  const { currentData, error, isFetching, isLoading, refetch } = useGetReviewCompletionQuery({ ...scope, sessionRevision }, { refetchOnMountOrArgChange: true })
  const [complete] = useCompleteReviewMutation()
  const [rationale, setRationale] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const alive = useRef(true)
  const inFlight = useRef(false)
  const attempt = useRef(null)
  const feedbackRef = useRef(null)
  const scopeKey = JSON.stringify(scope)
  const activeScope = useRef(scopeKey)
  activeScope.current = scopeKey
  const isCurrent = () => alive.current && getSessionRevision() === sessionRevision
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { if (feedback) feedbackRef.current?.focus() }, [feedback])
  const value = !error && !isFetching && !isLoading ? readCompletion(currentData, scope) : null
  const receipt = value?.latestReceipt
  const eligible = !readOnly && !locked && value?.canComplete === true && value.population.complete === true
  const refresh = async () => {
    if (!isCurrent() || busy || inFlight.current) return
    const started = scopeKey
    setBusy(true)
    try {
      const refreshed = await refetch()
      if (!isCurrent() || activeScope.current !== started) return
      const current = !refreshed.error && readCompletion(refreshed.data, scope)
      setBlocked(!current)
      setFeedback({ error: !current, message: current ? 'Current review population refreshed. Inspect the receipt before retrying.' : 'Review population could not be verified. Refresh to retry.' })
    } finally { if (isCurrent() && activeScope.current === started) setBusy(false) }
  }
  const submit = async event => {
    event.preventDefault()
    if (!isCurrent() || !eligible || blocked || busy || inFlight.current || !confirmed || rationale.trim().length < 10) return
    const started = scopeKey
    const body = { expectedPopulationHash: value.population.hash, rationale: rationale.trim(), confirm: true }
    if (!attempt.current || JSON.stringify(attempt.current.body) !== JSON.stringify(body))
      attempt.current = { requestKey: crypto.randomUUID(), body }
    inFlight.current = true; setBusy(true); setBlocked(true)
    try {
      const result = await complete({ ...scope, body: { ...body, requestKey: attempt.current.requestKey } }).unwrap()
      if (!isCurrent() || activeScope.current !== started) return
      const recorded = readCompletion(result, scope)
      if (!recorded?.receipt || recorded.receipt.currency !== 'CURRENT' || !recorded.population.complete)
        throw new Error('The returned receipt could not be verified against the current population.')
      const refreshed = await refetch()
      if (!isCurrent() || activeScope.current !== started) return
      const current = !refreshed.error && readCompletion(refreshed.data, scope)
      const verified = current?.latestReceipt?.receiptId === recorded.receipt.receiptId
        && current.latestReceipt.currency === 'CURRENT' && current.population.complete === true
      const related = onRecorded ? await onRecorded() : true
      if (!isCurrent() || activeScope.current !== started) return
      setBlocked(!verified || !related)
      setFeedback({ error: !verified || !related,
        message: verified && related ? 'Review Completion recorded and current reads refreshed. Publication readiness is assessed separately.'
          : 'Review Completion recorded, but current reads could not be verified. Refresh before continuing.' })
      setConfirmed(false)
    } catch (failure) {
      if (isCurrent() && activeScope.current === started) setFeedback({ error: true,
        message: `${failure?.data?.error?.message || failure.message || 'Completion could not be confirmed.'} Refresh and inspect the current receipt before retrying.` })
    } finally {
      inFlight.current = false
      if (isCurrent() && activeScope.current === started) setBusy(false)
    }
  }
  return <section className="intelligence-hub__completion" aria-label="Review Completion">
    <h3>Review Completion</h3>
    <p>Complete the revision’s evidence and contradiction decisions. Rejected evidence counts as decided; confirmed contradictions can still block readiness.</p>
    {isLoading || isFetching ? <p role="status">Checking the complete review population…</p>
      : !value ? <p role="alert">{error?.data?.error?.message || 'The complete review population is unavailable.'} Refresh to retry.</p>
        : <><p>{value.population.pendingEvidence} evidence decisions and {value.population.pendingFindings} finding decisions outstanding across {value.population.decisionCount} decisions in this revision.</p>
          {value.population.reason === 'EVIDENCE_REFRESH_REQUIRED' ? <p>Evidence refresh is required in Context before completion.</p> : null}
          {value.population.confirmedReadinessBlockers > 0 ? <p>{value.population.confirmedReadinessBlockers} confirmed contradiction(s) remain independent readiness blockers.</p> : null}
          <p>{receipt ? <>Recorded review: <strong>{receipt.currency === 'CURRENT' ? 'Current' : 'Stale — reassessment required'}</strong> · {new Date(receipt.completedAt).toLocaleString()}</> : 'No Review Completion receipt is recorded.'}</p>
          {receipt ? <details><summary>Inspect recorded completion</summary><p>{receipt.rationale}</p><p>Reviewer: {receipt.actorUserId}</p><p>Receipt: {receipt.receiptId}</p><p>Audit: {receipt.auditId}</p></details> : null}</>}
    {!readOnly ? <form onSubmit={submit}>
      <Textarea label="Review Completion rationale" value={rationale} maxLength={2000} rows={3} fullWidth
        disabled={!eligible || busy} onChange={event => setRationale(event.target.value)} />
      <label className="intelligence-hub__completion-confirm"><input type="checkbox" checked={confirmed} disabled={!eligible || busy}
        onChange={event => setConfirmed(event.target.checked)} />I confirm I reviewed the complete mandatory decision population for this revision.</label>
      <Button type="submit" disabled={!eligible || blocked || busy || !confirmed || rationale.trim().length < 10} aria-busy={busy}>Record Review Completion</Button>
    </form> : null}
    {locked ? <p>This locked revision permits inspection only.</p> : null}
    <p ref={feedbackRef} tabIndex={-1} role={feedback?.error ? 'alert' : 'status'}>{feedback?.message}</p>
    <Button variant="outline" size="sm" disabled={busy} onClick={refresh}>Refresh Review Completion</Button>
  </section>
}
