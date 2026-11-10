import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, ButtonGroup } from '../../components/Button'
import { Card } from '../../components/Card'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { useGetRuntimePostLockImpactHistoryQuery, useLazyGetRuntimePostLockImpactHistoryQuery,
  useRecordRuntimePostLockImpactMutation } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision } from '../../utils/tokenStorage.js'
import { POST_LOCK_IMPACT_OPTIONS, readPostLockImpactHistory, buildPostLockImpactRequest,
  postLockImpactDecisionIdentity } from './postLockSubmissionModel.js'

const owns = (read, args) => read.isSuccess === true && read.currentData !== undefined && read.originalArgs
  && Object.keys(read.originalArgs).length === Object.keys(args).length
  && Object.keys(args).every(key => read.originalArgs[key] === args[key])
const label = value => POST_LOCK_IMPACT_OPTIONS.find(option => option.value === value)?.label
const blockers = {
  VMF_UPDATE_REQUIRED: 'Recording a decision requires an authorised workspace reviewer.',
  POST_LOCK_IMPACT_POLICY_UNAVAILABLE: 'This locked revision has no supported impact-review policy.',
  CONTROLLED_REPLAY_ISOLATED: 'Impact review is unavailable for this controlled replay.',
  POST_LOCK_IMPACT_CAPACITY: 'The retained decision history is full.',
}

export default function PostLockImpactPanel({ scope, receipt, frameKey, sessionRevision, actorId }) {
  const id = useId(), inFlight = useRef(false), intent = useRef(null)
  const owner = useMemo(() => ({ frameKey, submissionId: receipt.submissionId, requestDigest: receipt.requestDigest, sessionRevision, actorId }),
    [frameKey, receipt.submissionId, receipt.requestDigest, sessionRevision, actorId])
  const live = useRef(owner)
  useLayoutEffect(() => { live.current = owner; return () => { if (live.current === owner) live.current = null } }, [owner])
  const current = () => live.current === owner && getSessionRevision() === sessionRevision
  const [afterSequence, setAfterSequence] = useState(0)
  const [disposition, setDisposition] = useState('')
  const [rationale, setRationale] = useState('')
  const [confirmedFor, setConfirmedFor] = useState(null)
  const [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(null)
  const [feedback, setFeedback] = useState(null), [verifiedRead, setVerifiedRead] = useState(null)
  const args = { ...scope, submissionId: receipt.submissionId, afterSequence, sessionRevision, frameKey }
  const query = useGetRuntimePostLockImpactHistoryQuery(args, { refetchOnMountOrArgChange: true })
  const [inspect] = useLazyGetRuntimePostLockImpactHistoryQuery(), [record] = useRecordRuntimePostLockImpactMutation()
  const history = !current() || query.isFetching ? null : verifiedRead?.owner === owner ? verifiedRead.value
    : owns(query, args) ? readPostLockImpactHistory(query.currentData, receipt.submissionId, afterSequence) : null
  const head = history ? history.impact.headHash ?? 'NONE' : null
  const eligible = history?.canRecord && /^[a-f0-9]{24}$/.test(actorId || '') && globalThis.crypto?.subtle && globalThis.crypto?.randomUUID
  const canSubmit = eligible && !attempt && !busy && disposition && rationale.trim() && confirmedFor === head
  const check = async command => {
    const response = await inspect({ ...args, afterSequence: command.afterSequence }, false).unwrap()
    if (!current()) return
    const value = readPostLockImpactHistory(response, receipt.submissionId, command.afterSequence)
    const entry = value?.entries.find(item => item.decisionId === command.decisionId)
    if (!entry || entry.reviewerUserId !== actorId || entry.disposition !== command.body.disposition
      || entry.rationale !== command.body.rationale || entry.previousDecisionHash !== command.body.expectedHeadHash) throw new Error('Decision readback mismatch.')
    setVerifiedRead({ owner, value }); setFeedback({ owner, message: 'Impact decision recorded and read back. The locked evidence basis is unchanged.' })
  }
  const submit = async event => {
    event.preventDefault()
    if (!current() || !canSubmit || inFlight.current || intent.current) return
    inFlight.current = true; setBusy(true); setFeedback(null)
    let dispatched = false
    try {
      const body = buildPostLockImpactRequest({ receipt, history, requestKey: crypto.randomUUID(), disposition, rationale, confirm: true })
      const command = { body, afterSequence: history.pagination.total,
        decisionId: await postLockImpactDecisionIdentity(receipt.submissionId, body.requestKey) }
      if (!current()) return
      intent.current = command; setAttempt(command); dispatched = true
      await record({ ...scope, submissionId: receipt.submissionId, body }).unwrap()
      if (current()) await check(command)
    } catch (failure) {
      if (current()) setFeedback({ owner, error: true, message: !dispatched ? 'The decision could not be prepared. Nothing was submitted.'
        : failure?.status === 403 ? 'You are not authorised to record this decision. No new decision will be sent automatically.'
          : failure?.status === 409 ? 'The submission, previous decision or review policy changed. Refresh and inspect the history; this request will not be rewritten or sent again.'
            : 'The decision outcome is unconfirmed. Check the original decision before doing anything else. No new decision will be sent automatically.' })
    } finally { inFlight.current = false; if (current()) setBusy(false) }
  }
  const checkOriginal = async () => {
    if (!current() || !intent.current || inFlight.current) return
    inFlight.current = true; setBusy(true)
    try { await check(intent.current) }
    catch { if (current()) setFeedback({ owner, error: true, message: 'The original decision could not be confirmed. Refresh and inspect its history before any further action.' }) }
    finally { inFlight.current = false; if (current()) setBusy(false) }
  }
  const refresh = () => { setVerifiedRead(null); setConfirmedFor(null); query.refetch() }
  return <section aria-label="Impact review">
    <h3>Impact review</h3>
    <p>An authorised reviewer records what this evidence means. Review does not accept evidence, create a successor or rerun the VMF.</p>
    {query.isFetching ? <p role="status">Loading impact decisions…</p> : !history ? <p role="alert">{query.error?.status === 403
      ? 'You do not have permission to read this impact history.' : 'Impact history could not be verified. Refresh before acting.'}</p>
      : <><Card variant="outlined" role="region" aria-label="Impact decision history"><Card.Header><h4>Recorded impact decisions</h4></Card.Header><Card.Body>
        {!history.pagination.total ? <p>No impact decision recorded.</p> : <>
          <p>Latest outcome: {label(history.impact.latestDecision.disposition)}</p>
          {history.entries.map(entry => <div key={entry.decisionId}>
            <h4>Decision {entry.sequence}: {label(entry.disposition)}</h4><p>{entry.rationale}</p>
            <dl className="intelligence-hub__inspection-facts">{[['Decision reference', entry.decisionId], ['Reviewer', entry.reviewerUserId],
              ['Recorded', entry.decidedAt], ['Audit receipt', entry.audit.id], ['Authority', entry.authority],
              ['History position', entry.isCurrent ? 'Current decision' : 'Earlier decision']].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
            <p>Audit verification reported by the server: verified.</p>
          </div>)}</>}
        {history.pagination.nextAfterSequence !== null ? <Button size="sm" variant="outline" onClick={() => {
          setVerifiedRead(null); setAfterSequence(history.pagination.nextAfterSequence)
        }}>Next impact decisions</Button> : null}
      </Card.Body></Card>
        {!history.canRecord ? history.blockedBy.map(reason => <p key={reason}>{blockers[reason] || 'Required decision audit evidence could not be verified.'}</p>) : null}
      </>}
    {eligible && !attempt ? <form aria-label="Record impact decision" onSubmit={submit}>
      <Select id={`${id}-outcome`} label="Impact outcome" placeholder="Choose an outcome" size="sm" value={disposition}
        options={POST_LOCK_IMPACT_OPTIONS} disabled={busy} onChange={event => { setDisposition(event.target.value); setConfirmedFor(null) }} />
      <Textarea id={`${id}-rationale`} label="Reason for this decision" rows={4} maxLength={2000} fullWidth required value={rationale}
        disabled={busy} onChange={event => { setRationale(event.target.value); setConfirmedFor(null) }} />
      <Tickbox id={`${id}-confirm`} label="Confirm this impact decision" checked={confirmedFor === head}
        disabled={busy} onChange={event => setConfirmedFor(event.target.checked ? head : null)} />
      <Button size="sm" type="submit" loading={busy} disabled={!canSubmit}>Record impact decision</Button>
    </form> : null}
    <ButtonGroup stackOnMobile><Button size="sm" variant="outline" disabled={busy || query.isFetching} onClick={refresh}>Refresh impact history</Button>
      {attempt && !verifiedRead ? <Button size="sm" variant="outline" disabled={busy || query.isFetching} onClick={checkOriginal}>Check original decision</Button> : null}</ButtonGroup>
    {feedback?.owner === owner ? <p role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p> : null}
  </section>
}
