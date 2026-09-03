import { useRef, useState } from 'react'
import { Badge } from '../../components/Badge'
import { Button, ButtonGroup } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import {
  useGetRuntimeDiscoveryContradictionsQuery,
  useReviewRuntimeDiscoveryContradictionMutation,
} from '../../store/api/runtimeInstanceApi.js'

const DECISIONS = [
  { value: 'NOT_CONTRADICTORY', label: 'Not contradictory' },
  { value: 'CONFIRMED', label: 'Confirm contradiction' },
  { value: 'REOPENED', label: 'Reopen for review' },
]
const display = (value) => value == null ? 'Not available' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)

export default function DiscoveryContradictionReview({ runtimeInstanceId }) {
  const { currentData, isLoading, isFetching, error: readError, refetch } = useGetRuntimeDiscoveryContradictionsQuery(
    { runtimeInstanceId }, { skip: !runtimeInstanceId },
  )
  const [review, { isLoading: saving }] = useReviewRuntimeDiscoveryContradictionMutation()
  const [snapshot, setSnapshot] = useState(null)
  const [decision, setDecision] = useState('')
  const [rationale, setRationale] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [needsReopen, setNeedsReopen] = useState(false)
  const submitting = useRef(false)
  const data = currentData?.data
  const candidates = Array.isArray(data?.candidates) ? data.candidates : []
  const candidate = candidates.find((item) => item.contradictionId === snapshot?.candidate.contradictionId)
  const stale = snapshot && (snapshot.runtimeInstanceId !== runtimeInstanceId
    || snapshot.runtimeUpdatedAt !== data?.runtimeUpdatedAt
    || snapshot.candidate.evidencePairHash !== candidate?.evidencePairHash)
  const evidence = snapshot?.candidate.evidence || []
  const pairValid = evidence.length === 2 && evidence.every((item) => item.evidenceObjectId && item.extractedFact)
    && Boolean(snapshot?.candidate.evidencePairHash)
  const canSubmit = data?.canReview === true && pairValid && Boolean(snapshot?.runtimeUpdatedAt)
    && !stale && !needsReopen && !readError && !isFetching && !saving
    && DECISIONS.some((item) => item.value === decision)
    && rationale.trim().length >= 10 && rationale.trim().length <= 2000 && confirmed

  const open = (item) => {
    setSnapshot({ runtimeInstanceId, runtimeUpdatedAt: data.runtimeUpdatedAt, candidate: item })
    setDecision('')
    setRationale('')
    setConfirmed(false)
    setError('')
    setNeedsReopen(false)
  }
  const close = () => { if (!submitting.current) setSnapshot(null) }
  const submit = async () => {
    if (!canSubmit || submitting.current) return
    submitting.current = true
    setError('')
    try {
      await review({
        runtimeInstanceId: snapshot.runtimeInstanceId,
        contradictionId: snapshot.candidate.contradictionId,
        body: {
          expectedUpdatedAt: snapshot.runtimeUpdatedAt,
          expectedEvidencePairHash: snapshot.candidate.evidencePairHash,
          disposition: decision,
          rationale: rationale.trim(),
          confirm: true,
        },
      }).unwrap()
      setSnapshot(null)
    } catch (failure) {
      setConfirmed(false)
      setNeedsReopen(true)
      setError(failure?.status === 409
        ? 'The runtime or evidence changed. Refresh and reopen the pair before reviewing again.'
        : 'Review was not confirmed saved. Refresh and reopen the pair before trying again.')
    } finally {
      submitting.current = false
    }
  }

  if (!runtimeInstanceId) return null
  return (
    <section aria-label="Human contradiction review">
      <h4>Human contradiction review</h4>
      {(isLoading || isFetching) && <p role="status">Loading contradiction reviews…</p>}
      {readError && <p role="alert">{readError.status === 403
        ? 'VMF update permission is required to view contradiction reviews.'
        : 'Contradiction reviews could not be loaded.'}</p>}
      <Button size="sm" variant="outline" onClick={refetch} disabled={isFetching || saving}>Refresh reviews</Button>
      {data?.canReview === false && <p>Review is read-only for a locked or stale runtime. Use an editable, current revision to submit a review.</p>}
      {!readError && data && !isFetching && candidates.length === 0 && <p>No contradiction candidates.</p>}
      <ul className="runtime-workspace__projection-list">
        {candidates.map((item) => (
          <li key={item.contradictionId}>
            <span>{display(item.domain)} · {display(item.severity)} </span>
            <Badge size="sm" variant={item.reviewStatus === 'NOT_CONTRADICTORY' ? 'success' : 'warning'}>{item.reviewStatus}</Badge>
            <p>{display(item.basis)}</p>
            <Button size="sm" variant="outline" disabled={isFetching || Boolean(readError) || saving} onClick={() => open(item)}>View evidence pair</Button>
          </li>
        ))}
      </ul>
      <Dialog open={Boolean(snapshot)} onClose={close} size="lg" aria-labelledby="contradiction-review-title"
        closeOnBackdropClick={!saving} closeOnEscape={!saving} showCloseButton={!saving}>
        <Dialog.Header><h2 id="contradiction-review-title">Review contradiction evidence pair</h2></Dialog.Header>
        <Dialog.Body>
          {snapshot && <>
            <p>{display(snapshot.candidate.domain)} · {display(snapshot.candidate.severity)} · {display(snapshot.candidate.reviewStatus)}</p>
            <p>{display(snapshot.candidate.basis)}</p>
            {evidence.map((item, index) => (
              <section key={`${item.evidenceObjectId}-${index}`} aria-label={`Evidence ${index + 1}`}>
                <h3>Evidence {index + 1}</h3>
                <dl className="runtime-workspace__section-detail-copy">
                  {['evidenceObjectId', 'sourceId', 'sourceType', 'lineageRef', 'reviewStatus', 'validationStatus'].map((field) => (
                    <div key={field}><dt>{field}</dt><dd><span>{display(item[field])}</span></dd></div>
                  ))}
                </dl>
                <div className="runtime-workspace__section-detail-copy"><span>{display(item.extractedFact)}</span></div>
              </section>
            ))}
            {snapshot.candidate.latestReview && <section aria-label="Latest review">
              <h3>Latest review</h3>
              <p>{display(snapshot.candidate.latestReview.disposition)}</p>
              <p>Reviewed by: {display(snapshot.candidate.latestReview.reviewedBy)}</p>
              <p>Reviewed at: {display(snapshot.candidate.latestReview.reviewedAt)}</p>
              <div className="runtime-workspace__section-detail-copy"><span>{display(snapshot.candidate.latestReview.rationale)}</span></div>
            </section>}
            {!pairValid && <p role="alert">The evidence pair is incomplete or invalid; review is disabled.</p>}
            {(stale || needsReopen) && <p role="alert">Refresh and reopen this pair to review the current evidence.</p>}
            {data?.canReview !== true && <p>This runtime is read-only. Use an editable, current revision.</p>}
            <p>Only a current “Not contradictory” review can release this candidate. Other decisions keep it blocking.</p>
            <Select label="Decision" placeholder="Choose a decision" options={DECISIONS} value={decision}
              onChange={(event) => { setDecision(event.target.value); setConfirmed(false) }} disabled={saving || !data?.canReview || !pairValid || Boolean(stale) || needsReopen} />
            <Textarea label="Rationale" value={rationale} minLength={10} maxLength={2000} required
              helperText="Explain your decision in 10–2000 characters." disabled={saving || !data?.canReview || !pairValid || Boolean(stale) || needsReopen}
              onChange={(event) => { setRationale(event.target.value); setConfirmed(false) }} />
            <Tickbox label="I have reviewed both evidence items and confirm this decision." checked={confirmed}
              disabled={saving || !data?.canReview || !pairValid || Boolean(stale) || needsReopen}
              onChange={(event) => setConfirmed(event.target.checked)} />
            {error && <p role="alert">{error}</p>}
          </>}
        </Dialog.Body>
        <Dialog.Footer><ButtonGroup>
          <Button size="sm" disabled={!canSubmit} loading={saving} onClick={submit}>Save review</Button>
          <Button size="sm" variant="outline" disabled={saving} onClick={close}>Close</Button>
        </ButtonGroup></Dialog.Footer>
      </Dialog>
    </section>
  )
}
