import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ButtonGroup } from '../../components/Button'
import { Card } from '../../components/Card'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { useAdmitRuntimePostLockEvidenceMutation, useLazyGetRuntimePostLockEvidenceQuery,
  useGetRuntimeInstanceQuery } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision } from '../../utils/tokenStorage.js'
import { readPostLockAdmission, buildPostLockAdmission, postLockAdmissionIdentity,
  readSavedPostLockEvidence, readAdmittedSuccessor } from './postLockSubmissionModel.js'

const owns = (read, args) => read.isSuccess === true && read.currentData !== undefined && read.originalArgs
  && Object.keys(read.originalArgs).length === Object.keys(args).length
  && Object.keys(args).every(key => read.originalArgs[key] === args[key])
const explanations = {
  VMF_UPDATE_REQUIRED: 'Admission requires an authorised workspace reviewer.',
  POST_LOCK_ADMISSION_POLICY_UNAVAILABLE: 'This locked revision has no supported successor-admission policy.',
  POST_LOCK_ADMISSION_DECISION_REQUIRED: 'A verified impact decision is required before admission.',
  POST_LOCK_ADMISSION_DISPOSITION_BLOCKED: 'The latest verified decision must be Successor revision required. Other outcomes, including unresolved currentness, cannot be admitted.',
  POST_LOCK_ADMISSION_RETENTION_BLOCKED: 'The supplied source does not currently permit retention.',
  POST_LOCK_ADMISSION_CHILD_EXISTS: 'This locked revision already has a successor. Inspect the recorded revision.',
  POST_LOCK_ADMISSION_ALREADY_RECORDED: 'This item already has a recorded successor admission.',
}

export default function PostLockAdmissionPanel({ scope, receipt, renderer, lockBasis, frameKey, sessionRevision, actorId }) {
  const id = useId(), intent = useRef(null), inFlight = useRef(false)
  const owner = useMemo(() => ({ frameKey, submissionId: receipt.submissionId, digest: receipt.requestDigest, sessionRevision, actorId }),
    [frameKey, receipt.submissionId, receipt.requestDigest, sessionRevision, actorId])
  const live = useRef(owner)
  useLayoutEffect(() => { live.current = owner; return () => { if (live.current === owner) live.current = null } }, [owner])
  const current = () => live.current === owner && getSessionRevision() === sessionRevision
  const [rationale, setRationale] = useState(''), [confirmedFor, setConfirmedFor] = useState(null)
  const [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(null)
  const [checked, setChecked] = useState(null), [feedback, setFeedback] = useState(null)
  const [refreshRead, setRefreshRead] = useState(null)
  const [admit] = useAdmitRuntimePostLockEvidenceMutation(), [inspect] = useLazyGetRuntimePostLockEvidenceQuery()
  const activeReceipt = checked?.owner === owner ? checked.receipt : receipt
  const readUnavailable = refreshRead?.owner === owner && refreshRead.state !== 'VERIFIED'
  const model = current() && !readUnavailable ? readPostLockAdmission(activeReceipt) : null
  const admission = model?.admission
  const childArgs = { runtimeInstanceId: admission?.child.runtimeInstanceKey, sessionRevision, frameKey }
  const childRead = useGetRuntimeInstanceQuery(childArgs, { skip: !admission, refetchOnMountOrArgChange: true })
  const child = admission && !childRead.isFetching && owns(childRead, childArgs)
    ? readAdmittedSuccessor(childRead.currentData, activeReceipt, admission) : null
  const head = model?.impact?.headHash ?? null
  const eligible = model?.eligible && /^[a-f0-9]{24}$/.test(actorId || '') && globalThis.crypto?.subtle && globalThis.crypto?.randomUUID
  const canSubmit = eligible && !attempt && !busy && rationale.trim() && confirmedFor === head
  const readBack = async command => {
    const response = await inspect({ ...scope, submissionId: receipt.submissionId, sessionRevision, frameKey, admissionRead: true }, false).unwrap()
    if (!current()) return
    const saved = readSavedPostLockEvidence(response, { scope, renderer, lockBasis }, receipt.submissionId)
    if (!saved) throw new Error('Submission readback mismatch.')
    if (command) {
      const result = readPostLockAdmission(saved)?.admission
      if (!result || result.admissionId !== command.admissionId || result.actorUserId !== actorId
        || result.rationale !== command.body.postLockAdmission.rationale
        || result.selectedDecision.decisionHash !== command.body.postLockAdmission.expectedImpactHeadHash) throw new Error('Admission readback mismatch.')
    }
    setChecked({ owner, receipt: saved })
    setRefreshRead({ owner, state: 'VERIFIED' })
    setFeedback({ owner, message: command ? 'Admission saved and read back. Checking the successor’s own evidence basis and readiness…' : 'Admission state refreshed from the server.' })
  }
  const submit = async event => {
    event.preventDefault()
    if (!current() || !canSubmit || intent.current || inFlight.current) return
    inFlight.current = true; setBusy(true); setFeedback(null)
    let dispatched = false
    try {
      const body = buildPostLockAdmission({ receipt: activeReceipt, expectedUpdatedAt: renderer.runtimeInstance.updatedAt,
        requestKey: crypto.randomUUID(), rationale, confirm: true })
      const command = { body, admissionId: await postLockAdmissionIdentity(body.postLockAdmission) }
      if (!current()) return
      intent.current = command; setAttempt(command); dispatched = true
      await admit({ runtimeInstanceId: scope.runtimeInstanceId, body }).unwrap()
      if (current()) await readBack(command)
    } catch (failure) {
      if (current()) setFeedback({ owner, error: true, message: !dispatched ? 'Admission could not be prepared. No revision request was sent.'
        : [403, 409, 422].includes(failure?.status) ? 'Admission was blocked or its basis changed. Inspect the exact saved admission before any further action. This request will not be rewritten or sent again.'
          : 'The admission outcome is unconfirmed. Check the original admission. No new successor request will be sent automatically.' })
    } finally { inFlight.current = false; if (current()) setBusy(false) }
  }
  const refresh = async () => {
    if (!current() || inFlight.current) return
    inFlight.current = true; setBusy(true); setConfirmedFor(null); setFeedback(null)
    setRefreshRead({ owner, state: 'CHECKING' })
    try { await readBack(intent.current) }
    catch { if (current()) {
      setRefreshRead({ owner, state: 'UNAVAILABLE' })
      setFeedback({ owner, error: true, message: 'The saved admission could not be verified. No new successor request was sent.' })
    } }
    finally { inFlight.current = false; if (current()) setBusy(false) }
  }
  return <section aria-label="Successor admission">
    <h3>Successor admission</h3>
    <p>Admit this reviewed item through the normal revision workflow. This keeps the locked predecessor unchanged and does not rerun or approve the VMF.</p>
    {!model ? <p role={refreshRead?.state === 'CHECKING' ? 'status' : 'alert'}>{refreshRead?.state === 'CHECKING'
      ? 'Checking the current admission state…' : 'Admission availability could not be verified. Refresh before acting.'}</p>
      : model.state === 'UNVERIFIED' ? <p role="alert">The recorded admission could not be verified. No new successor can be requested.</p>
        : admission ? <Card variant="outlined" role="region" aria-label="Verified successor admission"><Card.Header><h4>Evidence admitted to a successor</h4></Card.Header><Card.Body>
          <dl className="intelligence-hub__inspection-facts">{[['Admission reference', admission.admissionId], ['Admitted', admission.admittedAt],
            ['Reason', admission.rationale], ['Selected review', admission.selectedDecision.decisionId],
            ['Audit receipt', admission.receipt.auditId]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
          {childRead.isFetching ? <p role="status">Reading the successor’s own evidence basis and readiness…</p>
            : !child ? <p role="alert">Admission is recorded, but the successor’s current initial-basis read could not be verified. No readiness result is claimed.</p>
              : <><h4>Successor revision {child.revisionNumber}</h4><p>{child.stage} · {child.ready ? 'Ready according to the current read' : 'Not ready — evidence review and readiness checks remain'}</p>
                <p>Own evidence basis: {child.basis.counts.sources} sources, {child.basis.counts.evidence} evidence items. State version: {child.stateVersion}</p>
                <p>Admitted evidence: {child.evidenceTitle} · {child.reviewStatus}</p>
                <p>The predecessor remains locked. This successor has not inherited publication or lock approval.</p>
                <Link to={`/app/runtime/${encodeURIComponent(child.runtimeInstanceKey)}`}>Open successor workspace</Link></>}
        </Card.Body></Card>
          : model.blockedBy.map(reason => <p key={reason}>{explanations[reason] || 'Required authority, policy or audit checks block admission.'}</p>)}
    {eligible && !attempt ? <form aria-label="Admit reviewed evidence to successor" onSubmit={submit}>
      <Textarea id={`${id}-reason`} label="Reason for successor admission" rows={4} maxLength={1000} fullWidth required value={rationale}
        disabled={busy} onChange={event => { setRationale(event.target.value); setConfirmedFor(null) }} />
      <Tickbox id={`${id}-confirm`} label="Confirm admission to a new successor revision" checked={confirmedFor === head}
        disabled={busy} onChange={event => setConfirmedFor(event.target.checked ? head : null)} />
      <Button size="sm" type="submit" loading={busy} disabled={!canSubmit}>Admit evidence and create successor</Button>
    </form> : null}
    <ButtonGroup stackOnMobile><Button size="sm" variant="outline" disabled={busy} onClick={refresh}>
      {attempt && !admission ? 'Check original admission' : 'Refresh admission state'}</Button></ButtonGroup>
    {feedback?.owner === owner ? <p role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p> : null}
  </section>
}
