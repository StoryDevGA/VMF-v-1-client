import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Button } from '../../components/Button'
import { useRecordRuntimeSourceVerificationMutation } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision } from '../../utils/tokenStorage.js'
import { getHubPayload } from './intelligenceHubModel.js'

const fields = [['sourceOrigin', 'Source origin', 1000], ['organizationRelationship', 'Relationship to the organisation', 1000],
  ['independenceGroup', 'Shared origin / independence group', 240], ['supportingReference', 'Supporting reference', 2000],
  ['rationale', 'Review rationale', 2000]]
const hash = /^sha256:[a-f0-9]{64}$/

export default function SourceVerificationForm({ source, scope, authority, locked, refresh, ownsIntent }) {
  const formId = useId()
  const [record] = useRecordRuntimeSourceVerificationMutation()
  const [facts, setFacts] = useState(() => Object.fromEntries(['authenticity', ...fields.map(([key]) => key)]
    .map(key => [key, source.verificationContext?.[key] || ''])))
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState(false)
  const frame = useRef(null)
  const inFlight = useRef(false)
  const ownerKey = [scope.runtimeInstanceId, scope.customerId, scope.tenantId, scope.sessionRevision, source.sourceId].join(':')
  const eligible = !locked && authority?.canReviewEvidence === true
    && authority.control?.stateVersion === scope.stateVersion
    && String(authority.control.customerId) === scope.customerId && String(authority.control.tenantId) === scope.tenantId
    && [authority.control.id, authority.control.runtimeInstanceKey].includes(scope.runtimeInstanceId)
    && Number.isFinite(Date.parse(authority.runtimeUpdatedAt)) && hash.test(source.materialFingerprint || '')
  useLayoutEffect(() => {
    const owner = { ownerKey, eligible, locked }
    frame.current = owner
    return () => { if (frame.current === owner) frame.current = null }
  }, [ownerKey, eligible, locked])
  const current = () => frame.current?.ownerKey === ownerKey && !frame.current.locked && getSessionRevision() === scope.sessionRevision
  const submit = async event => {
    event.preventDefault()
    if (!current() || !frame.current.eligible || inFlight.current || !facts.authenticity || fields.some(([key]) => !facts[key].trim())) return
    inFlight.current = true; setBusy(true); setFeedback(null)
    try {
      const response = await record({ runtimeInstanceId: scope.runtimeInstanceId, sourceId: source.sourceId,
        body: { expectedUpdatedAt: authority.runtimeUpdatedAt, expectedSourceFingerprint: source.materialFingerprint,
          facts: Object.fromEntries(Object.entries(facts).map(([key, value]) => [key, value.trim()])) } }).unwrap()
      if (!(ownsIntent ? ownsIntent() : current())) return
      const receipt = getHubPayload(response)
      const review = receipt?.verificationContext
      if (receipt?.sourceId !== source.sourceId || review?.contractVersion !== 'source-recorded-review.v1'
        || review.status !== 'RECORDED_REVIEW' || review.sourceFingerprint !== source.materialFingerprint
        || !/^[a-f0-9]{24}$/i.test(review.reviewedBy || '') || !Number.isFinite(Date.parse(review.reviewedAt))
        || !receipt.stateVersion || receipt.stateVersion === scope.stateVersion
        || Object.entries(facts).some(([key, value]) => review[key] !== value.trim())) throw new Error('The source review receipt did not match this request.')
      const refreshed = await refresh(receipt)
      if (!current()) return
      setFeedback({ error: !refreshed, message: refreshed ? 'Review recorded. Inspect the refreshed source record.'
        : 'Review was recorded, but the current source could not be refreshed. Reload before continuing.' })
    } catch (error) {
      if (current()) setFeedback({ error: true, message: error?.data?.error?.message || error.message || 'The source review could not be saved.' })
    } finally { inFlight.current = false; if (current()) setBusy(false) }
  }
  return <form onSubmit={submit} aria-label="Record source verification review">
    <h3>Record source review</h3>
    <p>Record the facts and supporting reference you checked. Authenticity is your recorded disposition; it does not certify the source independently or change accepted evidence.</p>
    <Select label="Authenticity disposition" size="sm" required disabled={!eligible || busy} value={facts.authenticity}
      placeholder="Select a disposition" options={[{ value: 'AUTHENTIC', label: 'Authentic — recorded reviewer finding' },
        { value: 'UNVERIFIED', label: 'Unverified' }, { value: 'INVALID', label: 'Invalid' }]}
      onChange={event => setFacts(previous => ({ ...previous, authenticity: event.target.value }))} />
    {fields.map(([key, label, maxLength]) => <Input key={key} id={`${formId}-${key}`} label={label} size="sm" fullWidth required maxLength={maxLength}
      disabled={!eligible || busy} value={facts[key]} onChange={event => setFacts(previous => ({ ...previous, [key]: event.target.value }))} />)}
    <Button type="submit" size="sm" disabled={!eligible || busy || !facts.authenticity || fields.some(([key]) => !facts[key].trim())}>Record source review</Button>
    {feedback ? <p role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p> : null}
  </form>
}
