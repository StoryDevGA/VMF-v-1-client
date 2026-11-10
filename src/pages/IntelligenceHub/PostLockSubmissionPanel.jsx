import { useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useSelector } from 'react-redux'
import { Button, ButtonGroup } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Status } from '../../components/Status'
import { Textarea } from '../../components/Textarea'
import { useSubmitRuntimePostLockEvidenceMutation, useLazyGetRuntimePostLockEvidenceQuery } from '../../store/api/runtimeInstanceApi.js'
import { selectCurrentUser } from '../../store/slices/authSlice.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { PostLockAvailabilityDisplay } from './PostLockAvailability.jsx'
import usePostLockAvailability from './usePostLockAvailability.js'
import PostLockEvidenceHistory from './PostLockEvidenceHistory.jsx'
import { parsePostLockCandidate, buildPostLockSubmission, getPostLockSubmissionIdentity,
  verifyPostLockSubmissionReceipt } from './postLockSubmissionModel.js'

const MAX_FILE_BYTES = 65536
const unconfirmed = 'Submission outcome is unconfirmed. Check this exact saved submission before doing anything else. No new submission will be sent automatically.'

function Facts({ items }) {
  return <dl className="intelligence-hub__inspection-facts">{items.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
}

export function PostLockMaterial({ source, evidence }) {
  return <Card variant="outlined"><Card.Header><h3>Supplied source and evidence</h3></Card.Header><Card.Body>
    <Facts items={[
      ['Source', source.title], ['Source type', source.sourceType],
      ['Locator', [source.locator.url, source.locator.page && `Page ${source.locator.page}`, source.locator.passage].filter(Boolean).join(' · ')],
      ['Retrieved', source.retrievedAt], ['Currentness', source.currentness === 'AS_OF' ? `As of ${source.asOfAt}` : source.currentness === 'STALE' ? 'Stale' : 'Unconfirmed'],
      ['Licence', source.licensing.licenceRef], ['Retention', source.licensing.retentionPermitted
        ? source.licensing.retainUntil ? `Permitted until ${source.licensing.retainUntil}` : 'Permitted; no end date supplied' : 'Not permitted'],
    ]} />
    <h4>{evidence.title}</h4><p>{evidence.statement}</p>
    <h4>Qualifications</h4>{source.qualifications.length ? <ul>{source.qualifications.map(value => <li key={value}>{value}</li>)}</ul> : <p>None supplied; this is not independent verification.</p>}
    <details className="intelligence-hub__context-disclosure"><summary>Source identity and provenance</summary><Facts items={[
      ['Source identity', source.sourceId], ['Content hash supplied by the producer', source.contentHash],
      ['Producer', `${source.provenance.producerKey} / ${source.provenance.producerVersion}`],
      ['Acquisition receipt', source.provenance.receiptRef], ['Acquired', source.provenance.acquiredAt],
      ['Sections', evidence.sectionKeys.join(', ') || 'No section supplied'],
    ]} /></details>
    <p>These are supplied source assertions. Importing this candidate does not independently verify its source, licence or content hash.</p>
  </Card.Body></Card>
}

export default function PostLockSubmissionPanel(props) {
  const user = useSelector(selectCurrentUser)
  const actorId = String(user?.id ?? user?._id ?? '')
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const privacyKey = JSON.stringify([props.contextKey, props.scope, actorId, sessionRevision])
  return <ScopedSubmissionPanel key={privacyKey} {...props} actorId={actorId} sessionRevision={sessionRevision} />
}

function ScopedSubmissionPanel({ scope, renderer, contextKey, route, canRead = false, loading = false, error,
  active = true, locked = false, actorId, sessionRevision }) {
  const availability = usePostLockAvailability({ scope, renderer, contextKey, route, canRead, loading, error, active: active && locked })
  const [submit] = useSubmitRuntimePostLockEvidenceMutation()
  const [inspect] = useLazyGetRuntimePostLockEvidenceQuery()
  const [candidateDraft, setCandidate] = useState(null)
  const [reasonDraft, setReason] = useState(null)
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [result, setResult] = useState(null)
  const [rejection, setRejection] = useState(null)
  const [retryCheck, setRetryCheck] = useState(null)
  const committed = useRef(null), inFlight = useRef(false), intent = useRef(null)
  const fileId = useId()
  const runtime = renderer?.runtimeInstance
  const actorValid = /^[a-f0-9]{24}$/.test(actorId)
  const canInspect = active && locked && canRead && !loading && !error && actorValid && availability.model.state === 'VERIFIED'
  const secure = Boolean(globalThis.crypto?.subtle && globalThis.crypto?.randomUUID)
  const canPrepare = canInspect && secure && availability.model.data.recording.eligibility === 'ELIGIBLE_AS_READ'
  const frameKey = JSON.stringify([availability.ownershipKey, active, locked, canRead, loading, Boolean(error), actorId, sessionRevision])
  const frame = useMemo(() => ({ key: frameKey, canInspect, canPrepare }), [frameKey, canInspect, canPrepare])
  const candidate = candidateDraft?.owner === frame ? candidateDraft.value : null
  const reason = reasonDraft?.owner === frame ? reasonDraft.value : ''
  useLayoutEffect(() => {
    committed.current = frame
    return () => { if (committed.current === frame) committed.current = null }
  }, [frame])
  const current = owner => committed.current === owner && getSessionRevision() === sessionRevision
  const currentFeedback = feedback?.owner === frame ? feedback : null
  const currentResult = canInspect && result?.owner === frame ? result.receipt : null
  const sameAttemptBasis = !attempt || attempt.body.binding.basisStateVersion === runtime?.stateVersion
    && attempt.body.binding.runtimeInstanceId === runtime?.id && attempt.body.binding.runtimeInstanceKey === runtime?.runtimeInstanceKey
    && (availability.model.data?.recording.binding == null || Object.entries(attempt.body.binding)
      .every(([key, value]) => availability.model.data.recording.binding[key] === value))
  const staleRejected = rejection?.command === intent.current && rejection?.reason === 'STALE'
  const canPrepareAnother = staleRejected && canPrepare && rejection.owner !== frame
  const retryAllowed = canPrepare && sameAttemptBasis && !staleRejected && retryCheck?.owner === frame
    && retryCheck?.command === intent.current
  const submissionFailure = (failure, owner, command, verifiedPost) => {
    if (!current(owner)) return
    if (!verifiedPost && failure?.status === 409 && failure?.data?.error?.details?.reason === 'POST_LOCK_BINDING_STALE') {
      setRejection({ command, reason: 'STALE', owner })
      setFeedback({ owner, error: true, message: 'This submission was rejected because its locked basis is outdated. No evidence was saved. Refresh the workspace before preparing another submission.' })
    } else setFeedback({ owner, error: true, message: verifiedPost
      ? 'A recording receipt was returned, but its saved readback could not be verified. Check this exact saved submission; do not start another one.' : unconfirmed })
  }

  const importCandidate = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    const owner = frame
    if (!file || !current(owner) || !owner.canPrepare || inFlight.current || intent.current) return
    if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > MAX_FILE_BYTES) {
      setFeedback({ owner, error: true, message: 'Choose a non-empty candidate JSON file of 65,536 bytes or fewer.' }); return
    }
    inFlight.current = true; setBusy(true); setCandidate(null); setFeedback(null)
    try {
      const bytes = await file.arrayBuffer()
      if (!current(owner)) return
      if (bytes.byteLength !== file.size || bytes.byteLength > MAX_FILE_BYTES) throw new Error('Candidate size changed.')
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      const value = parsePostLockCandidate(text)
      if (!current(owner)) return
      setCandidate({ owner, value })
      setFeedback({ owner, message: 'Candidate staged locally. Inspect the supplied material and enter the reason for review.' })
    } catch {
      if (current(owner)) setFeedback({ owner, error: true, message: 'The candidate could not be read as a valid UTF-8 source-and-evidence JSON file. No submission was sent.' })
    } finally {
      inFlight.current = false
      if (committed.current) setBusy(false)
    }
  }

  const readBack = async (command, owner) => {
    const response = await inspect({ ...scope, submissionId: command.identity.submissionId,
      sessionRevision, contextKey, route, frameKey: owner.key }, false).unwrap()
    if (!current(owner)) return
    const receipt = await verifyPostLockSubmissionReceipt(response, command.body, actorId, { readback: true })
    if (!current(owner)) return
    if (!receipt) throw new Error('Receipt mismatch.')
    setResult({ owner, receipt })
    setFeedback({ owner, message: 'Submission saved and read back. Its original recording is pending review, outside the locked evidence basis.' })
  }

  const record = async event => {
    event.preventDefault()
    const owner = frame
    if (!current(owner) || !owner.canPrepare || !candidate || !reason.trim() || inFlight.current || intent.current) return
    let body
    try { body = buildPostLockSubmission({ candidate, reason, binding: availability.model.data.recording.binding, requestKey: crypto.randomUUID() }) }
    catch {
      setFeedback({ owner, error: true, message: 'The candidate and review reason do not form a valid bounded submission. Check them before continuing.' }); return
    }
    inFlight.current = true; setBusy(true); setResult(null); setFeedback(null)
    const preparing = { body, identity: null, dispatched: false }
    intent.current = preparing; setAttempt(preparing)
    let dispatched = false, verifiedPost = false
    try {
      const identity = await getPostLockSubmissionIdentity(body, actorId)
      if (!current(owner)) return
      const command = { body, identity, dispatched: true }
      intent.current = command; setAttempt(command); dispatched = true
      const response = await submit({ ...scope, body }).unwrap()
      if (!current(owner)) return
      const receipt = await verifyPostLockSubmissionReceipt(response, body, actorId)
      if (!current(owner)) return
      if (!receipt) throw new Error('Receipt mismatch.')
      verifiedPost = true
      setFeedback({ owner, message: 'The server returned a recording receipt. Checking this exact saved submission…' })
      await readBack(command, owner)
      if (!current(owner)) return
    } catch (failure) {
      if (dispatched) submissionFailure(failure, owner, intent.current, verifiedPost)
      else if (current(owner)) setFeedback({ owner, error: true, message: 'The browser could not prepare a verified submission identity. No submission was sent.' })
    } finally {
      if (!dispatched && intent.current === preparing) { intent.current = null; if (committed.current) setAttempt(null) }
      inFlight.current = false
      if (committed.current) setBusy(false)
    }
  }

  const checkSaved = async () => {
    const owner = frame, command = intent.current
    if (!current(owner) || !owner.canInspect || !sameAttemptBasis || staleRejected || !command?.dispatched || !command.identity || inFlight.current) return
    inFlight.current = true; setBusy(true); setResult(null); setRetryCheck(null)
    setFeedback({ owner, message: 'Checking the exact original submission. No new submission is being sent…' })
    try {
      await readBack(command, owner)
      if (!current(owner)) return
    } catch (failure) {
      if (current(owner)) {
        const absent = failure?.status === 404 && failure?.data?.error?.details?.reason === 'POST_LOCK_SUBMISSION_NOT_FOUND'
        if (absent) setRetryCheck({ owner, command })
        setFeedback({ owner, error: true, message: absent
          ? 'No saved item was found for this exact request. You may explicitly retry the unchanged original submission. Its request reference will stay the same.' : unconfirmed })
      }
    } finally {
      inFlight.current = false
      if (committed.current) setBusy(false)
    }
  }

  const retryOriginal = async () => {
    const owner = frame, command = intent.current
    if (!current(owner) || !owner.canPrepare || !retryAllowed || !command?.identity || inFlight.current) return
    inFlight.current = true; setBusy(true); setResult(null); setRetryCheck(null)
    setFeedback({ owner, message: 'Retrying the unchanged original request. No new request reference is being created…' })
    let verifiedPost = false
    try {
      const response = await submit({ ...scope, body: command.body }).unwrap()
      if (!current(owner)) return
      const receipt = await verifyPostLockSubmissionReceipt(response, command.body, actorId)
      if (!current(owner)) return
      if (!receipt) throw new Error('Receipt mismatch.')
      verifiedPost = true
      await readBack(command, owner)
    } catch (failure) { submissionFailure(failure, owner, command, verifiedPost) }
    finally {
      inFlight.current = false
      if (committed.current) setBusy(false)
    }
  }

  const prepareAnother = () => {
    if (!current(frame) || !canPrepareAnother || inFlight.current) return
    intent.current = null
    setAttempt(null); setRejection(null); setRetryCheck(null); setResult(null)
    setCandidate(null); setReason(null)
    setFeedback({ owner: frame, message: 'The rejected request has been set aside. Import a candidate and enter a new reason against the refreshed basis.' })
  }

  if (!active || !locked) return null
  return <section className="intelligence-hub__context-workspace" aria-label="Separate post-lock submission">
    <PostLockAvailabilityDisplay model={availability.model} checking={availability.checking} submissionEnabled={canPrepare && !attempt} />
    {canInspect && !secure ? <p role="alert">Secure browser submission preparation is unavailable. No submission can be sent.</p> : null}
    {canRead && !loading && !error && availability.model.state === 'VERIFIED' && !actorValid
      ? <p role="alert">The current signed-in recording identity could not be verified.</p> : null}
    {canPrepare && !attempt ? <form aria-label="Submit separate post-lock evidence" onSubmit={record}>
      <Card variant="outlined"><Card.Header><h3>Prepare supplied evidence for impact review</h3></Card.Header><Card.Body>
        <p>Select one candidate JSON file containing source and evidence information only. It is staged locally; no provider or file acquisition runs.</p>
        <Input id={`${fileId}-candidate`} type="file" label="Candidate JSON file" accept=".json,application/json" size="sm" fullWidth
          disabled={busy} onChange={importCandidate} helperText="UTF-8 JSON, up to 65,536 bytes. The selected locked binding comes from the server, not the file." />
        {candidate ? <PostLockMaterial source={candidate.source} evidence={candidate.evidence} /> : null}
        <Fieldset disabled={busy}><Fieldset.Legend>Reason for impact review</Fieldset.Legend><Fieldset.Content>
          <Textarea id={`${fileId}-reason`} label="Why should this evidence be reviewed?" value={reason} onChange={event => setReason({ owner: frame, value: event.target.value })}
            maxLength={2000} rows={4} fullWidth required helperText="Required. Explain the possible effect on a future revision." />
        </Fieldset.Content></Fieldset>
        <p>The server checks authority, policy, the locked basis and supplied material again when you submit. Recording does not accept evidence or create a successor.</p>
        <ButtonGroup stackOnMobile><Button type="submit" size="sm" loading={busy} disabled={busy || !candidate || !reason.trim()}>Submit for impact review</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => { setCandidate(null); setReason(null); setFeedback(null) }}>Clear local candidate</Button></ButtonGroup>
      </Card.Body></Card>
    </form> : null}
    {canInspect && attempt?.dispatched && !currentResult ? <Card variant="outlined"><Card.Body>
      <Status variant="warning" showIcon announce={false}>{staleRejected ? 'Outdated submission rejected' : 'Original submission needs checking'}</Status>
      <p>{staleRejected ? 'No evidence was saved by this rejected request. Refresh the workspace before preparing another submission.'
        : sameAttemptBasis ? unconfirmed : 'The selected basis differs from this frozen submission command. Its request has been retained and will not be rewritten or sent again.'}</p>
      <Facts items={[['Submission reference', attempt.identity.submissionId], ['Request reference', attempt.body.requestKey]]} />
      {canPrepareAnother ? <Button size="sm" variant="outline" disabled={busy} onClick={prepareAnother}>Prepare another submission</Button> : null}
      {!staleRejected ? <ButtonGroup stackOnMobile><Button size="sm" variant="outline" disabled={busy || !sameAttemptBasis} onClick={checkSaved}>Check saved submission</Button>
        {retryAllowed ? <Button size="sm" variant="outline" disabled={busy} onClick={retryOriginal}>Retry original submission</Button> : null}</ButtonGroup> : null}
    </Card.Body></Card> : null}
    {currentResult ? <Card variant="outlined" role="region" aria-label="Verified original submission receipt"><Card.Header><h3>Pending outside the frozen basis</h3></Card.Header><Card.Body>
      <Status variant="warning" showIcon announce={false}>Original recording: pending review</Status>
      <p>This original submission receipt remains separate from any later impact decision or successor admission. It does not change the locked evidence basis.</p>
      <Facts items={[
        ['Submission reference', currentResult.submissionId], ['Request reference', attempt.body.requestKey],
        ['Recorded', currentResult.submittedAt], ['Recorded by', currentResult.submittedBy],
        ['Receipt', currentResult.receipt.id], ['Reason for review', currentResult.reason],
      ]} />
      <PostLockMaterial source={currentResult.source} evidence={currentResult.evidence} />
      <p>Impact review and admission are separate tasks and are not offered by this panel.</p>
    </Card.Body></Card> : null}
    {currentFeedback ? <p role={currentFeedback.error ? 'alert' : 'status'}>{currentFeedback.message}</p> : null}
    <PostLockEvidenceHistory key={frameKey} scope={scope} renderer={renderer} lockBasis={availability.lockBasis}
      active={active && locked && canRead && !loading && !error} checking={availability.checking}
      sessionRevision={sessionRevision} frameKey={frameKey} actorId={actorId} Material={PostLockMaterial} />
  </section>
}
