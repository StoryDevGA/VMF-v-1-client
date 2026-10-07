import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useReviewRuntimeDiscoveryEvidenceMutation, useReviewRuntimeDiscoveryContradictionMutation } from '../../store/api/runtimeInstanceApi.js'
import { getHubPayload } from './intelligenceHubModel.js'
import { getSessionRevision } from '../../utils/tokenStorage.js'
import { verifyFindingDecisionReceipt } from './findingDecisionReceipt.js'

export function readHubReviewAuthority({ response, error, loading, scope, renderer, locked }) {
  if (error || loading || locked) return null
  const payload = getHubPayload(response)
  const control = payload?.control
  const stamp = payload?.runtimeUpdatedAt
  if (payload?.contractVersion !== 'intelligence-review-actions.v1' || !control
    || String(control.customerId) !== scope.customerId || String(control.tenantId) !== scope.tenantId
    || ![control.id, control.runtimeInstanceKey].includes(scope.runtimeInstanceId)
    || typeof control.stateVersion !== 'string' || !control.stateVersion.trim()
    || !stamp || !Number.isFinite(Date.parse(stamp))
    || Date.parse(stamp) !== Date.parse(renderer?.runtimeInstance?.updatedAt)) return null
  return payload
}

// Both UI owners call existing governed mutations. No local decision or receipt store.
export default function useHubReviewActions({ authority, runtimeInstanceId, contextKey, viewKey, sessionRevision = getSessionRevision(), locked = false, refresh }) {
  const [reviewEvidence] = useReviewRuntimeDiscoveryEvidenceMutation()
  const [reviewFinding] = useReviewRuntimeDiscoveryContradictionMutation()
  const frame = useRef(null)
  const attempt = useRef(null)
  const ownerToken = useMemo(() => ({ runtimeInstanceId, contextKey, viewKey, sessionRevision, locked }), [runtimeInstanceId, contextKey, viewKey, sessionRevision, locked])
  const inFlight = useRef(false)
  const [state, setState] = useState(null)
  const current = state?.ownerToken === ownerToken && state?.viewKey === viewKey && state?.contextKey === contextKey && state?.sessionRevision === sessionRevision ? state : null
  const blocked = inFlight.current || Boolean(state?.contextKey === contextKey && state.sessionRevision === sessionRevision && state.blocked)
  const enabled = Boolean(authority && !blocked && !locked && getSessionRevision() === sessionRevision)
  useLayoutEffect(() => {
    frame.current = { authority, runtimeInstanceId, contextKey, viewKey, sessionRevision, locked, blocked, ownerToken }
    return () => { frame.current = null }
  }, [authority, runtimeInstanceId, contextKey, viewKey, sessionRevision, locked, blocked, ownerToken])
  const owned = () => frame.current && frame.current.ownerToken === ownerToken && frame.current.runtimeInstanceId === runtimeInstanceId
    && frame.current.contextKey === contextKey && frame.current.viewKey === viewKey
    && frame.current.sessionRevision === sessionRevision && getSessionRevision() === sessionRevision && !frame.current.locked
  const resetAfterRefresh = () => {
    if (owned() && !inFlight.current) setState(null)
  }
  const decide = async (kind, item, decision, rationale = '') => {
    if (!owned() || frame.current.authority !== authority || frame.current.blocked || !enabled || inFlight.current || !item?.id
      || kind === 'evidence' && (!authority.canReviewEvidence || !['ACCEPTED', 'REJECTED'].includes(decision))
      || kind === 'finding' && (!authority.canReview || !['NOT_CONTRADICTORY', 'CONFIRMED', 'REOPENED'].includes(decision)
        || !/^sha256:[a-f0-9]{64}$/.test(item.evidencePairHash || '') || rationale.trim().length < 10 || rationale.trim().length > 2000)) return false
    inFlight.current = true
    setState({ contextKey, viewKey, sessionRevision, ownerToken, blocked: true, busy: true, message: 'Recording governed decision…' })
    try {
      const body = { expectedUpdatedAt: authority.runtimeUpdatedAt }
      let receipt = null
      if (kind === 'evidence') {
        await reviewEvidence({ runtimeInstanceId, evidenceObjectId: item.id, body: { ...body, reviewStatus: decision } }).unwrap()
      } else {
        const signature = JSON.stringify([contextKey, runtimeInstanceId, authority.control.id, sessionRevision, item.id, item.evidencePairHash, decision, rationale.trim()])
        if (attempt.current?.signature !== signature) attempt.current = { signature, id: item.id, runtimeId: authority.control.id, stateVersion: authority.control.stateVersion, body: {
          ...body, expectedEvidencePairHash: item.evidencePairHash, disposition: decision, rationale: rationale.trim(), confirm: true, requestKey: crypto.randomUUID(),
        } }
        const command = attempt.current
        const response = await reviewFinding({ runtimeInstanceId, contradictionId: item.id, body: command.body }).unwrap()
        if (!owned()) return false
        receipt = await verifyFindingDecisionReceipt(response, command, command.runtimeId)
        if (!receipt) throw new Error('The returned decision receipt could not be bound to this exact request.')
      }
      if (!owned()) return false
      const refreshed = await refresh()
      if (!owned()) return false
      if (refreshed && kind === 'finding') attempt.current = null
      const outcome = receipt?.replay ? `Original decision receipt recovered${receipt.historical ? ' as historical' : ''}.` : 'Governed decision recorded.'
      setState({ contextKey, viewKey, sessionRevision, ownerToken, blocked: !refreshed, busy: false, error: !refreshed,
        message: refreshed ? `${outcome} Current reads refreshed.` : receipt?.replay
          ? `${outcome} Current reads could not be refreshed. Refresh before making another decision.`
          : 'Decision recorded, but current reads could not be refreshed. Refresh before making another decision.' })
      return Boolean(refreshed)
    } catch (error) {
      if (owned()) setState({ contextKey, viewKey, sessionRevision, ownerToken, blocked: true, busy: false, error: true,
        message: `${error?.data?.error?.message || error?.data?.message || error?.message || 'The decision could not be confirmed.'} Refresh and inspect the current decision before trying again.` })
      return false
    } finally {
      inFlight.current = false
      if (frame.current) setState(previous => previous ? { ...previous, busy: false } : previous)
    }
  }
  return { canReviewEvidence: enabled && authority.canReviewEvidence === true,
    canReviewFinding: enabled && authority.canReview === true, busy: Boolean(current?.busy), feedback: current,
    resetAfterRefresh, decideEvidence: (id, decision) => decide('evidence', { id }, decision),
    decideFinding: (candidate, decision, rationale) => decide('finding', candidate, decision, rationale) }
}
