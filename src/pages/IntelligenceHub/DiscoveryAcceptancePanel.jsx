import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '../../components/Button'
import { useAcceptRuntimeDiscoveryMutation, useExecuteRuntimeActionMutation } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { isDiscoveryAcceptanceUnlocked, readDiscoveryAcceptanceBasis, readDiscoveryAcceptanceRoute } from './discoveryAcceptanceModel.js'

export default function DiscoveryAcceptancePanel(props) {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  return <ScopedDiscoveryAcceptancePanel key={JSON.stringify([props.scope, sessionRevision])} {...props} sessionRevision={sessionRevision} />
}

function ScopedDiscoveryAcceptancePanel({ renderer, authority, scope, evidenceReads, loading, locked, refresh, sessionRevision }) {
  const [accept] = useAcceptRuntimeDiscoveryMutation()
  const [execute] = useExecuteRuntimeActionMutation()
  const [confirmed, setConfirmed] = useState('')
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const alive = useRef(true), inFlight = useRef(false), currentLocked = useRef(locked)
  const feedbackRef = useRef(null)
  currentLocked.current = locked || !isDiscoveryAcceptanceUnlocked(renderer)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { if (feedback) feedbackRef.current?.focus() }, [feedback])
  const isCurrent = () => alive.current && !currentLocked.current && getSessionRevision() === sessionRevision
  const basis = readDiscoveryAcceptanceBasis({ renderer, authority, scope, evidenceReads, loading, locked })
  const route = readDiscoveryAcceptanceRoute(renderer)
  const eligible = Boolean(basis?.ready && route && !busy && !blocked)
  const inspect = async () => {
    if (!isCurrent() || busy || inFlight.current) return
    inFlight.current = true; setBusy(true); setConfirmed('')
    try {
      const current = await refresh()
      if (!isCurrent()) return
      setBlocked(!current)
      setFeedback({ error: !current, message: current ? 'Current evidence-pack basis refreshed. Inspect its recorded state before continuing.' : 'The current evidence-pack basis could not be verified. Refresh before continuing.' })
    } catch {
      if (isCurrent()) { setBlocked(true); setFeedback({ error: true, message: 'The current evidence-pack basis could not be verified. Refresh before continuing.' }) }
    } finally { inFlight.current = false; if (isCurrent()) setBusy(false) }
  }
  const submit = async event => {
    event.preventDefault()
    if (!isCurrent() || !eligible || inFlight.current || confirmed !== basis.signature) return
    const before = basis
    inFlight.current = true; setBusy(true); setBlocked(true); setConfirmed('')
    try {
      const body = { expectedUpdatedAt: before.expectedUpdatedAt }
      if (route.dedicated) await accept({ runtimeInstanceId: scope.runtimeInstanceId, body }).unwrap()
      else await execute({ ...scope, actionKey: route.actionKey, body }).unwrap()
      if (!isCurrent()) return
      const current = await refresh()
      if (!isCurrent()) return
      const verified = current?.packAccepted === true && current.pending === 0
        && ['total', 'accepted', 'rejected'].every(key => current[key] === before[key])
      setFeedback({ error: !verified, message: verified
        ? 'Evidence pack accepted and current reads verified. Generated Understanding, Review Completion and publication remain separate.'
        : 'Acceptance was submitted, but its current state could not be verified. Refresh and inspect before continuing.' })
    } catch (failure) {
      if (isCurrent()) setFeedback({ error: true, message: `${failure?.data?.error?.message || failure.message || 'Acceptance could not be confirmed.'} Refresh and inspect before trying again.` })
    } finally { inFlight.current = false; if (isCurrent()) setBusy(false) }
  }
  return <section className="intelligence-hub__completion" aria-label="Evidence-pack acceptance">
    <h3>Evidence-pack acceptance</h3>
    <p>Accept the reviewed evidence pack for section generation. This does not accept generated Understanding, complete Quality review or approve publication.</p>
    <p>{basis?.packAccepted ? 'The current evidence pack is accepted.' : basis
      ? `${basis.accepted} accepted · ${basis.pending} awaiting decision · ${basis.rejected} rejected of ${basis.total} evidence records.`
      : 'The current acceptance basis is unavailable. Refresh to inspect this revision.'}</p>
    {route?.dedicated && !basis?.packAccepted ? <p>This action starts a new Quality review basis. Previous contradiction decisions remain historical and must be reassessed against the new basis.</p> : null}
    {!basis?.packAccepted ? <form onSubmit={submit}>
      <label className="intelligence-hub__completion-confirm"><input type="checkbox" checked={Boolean(basis && confirmed === basis.signature)} disabled={!eligible}
        onChange={event => setConfirmed(event.target.checked ? basis.signature : '')} />I choose to accept this reviewed evidence pack for section generation.</label>
      <Button type="submit" size="sm" disabled={!eligible || confirmed !== basis?.signature} aria-busy={busy}>Accept reviewed evidence pack</Button>
      {!eligible ? <p>{locked ? 'This locked revision permits inspection only.' : 'Acceptance requires current editable scope, server authority, a ready pack and no pending evidence decisions.'}</p> : null}
    </form> : null}
    <p ref={feedbackRef} tabIndex={-1} role={feedback?.error ? 'alert' : 'status'}>{feedback?.message}</p>
    <Button variant="outline" size="sm" disabled={busy || locked} onClick={inspect}>Refresh evidence-pack basis</Button>
  </section>
}
