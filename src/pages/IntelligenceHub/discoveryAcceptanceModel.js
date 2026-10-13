import { getHubDiscovery, getHubEvidencePage, getHubPayload } from './intelligenceHubModel.js'
import { readHubReviewAuthority } from './useHubReviewActions.js'

const count = value => Number.isSafeInteger(value) && value >= 0
export const isDiscoveryAcceptanceUnlocked = renderer => {
  const lock = renderer?.lock
  return Boolean(lock && (lock.locked === undefined || typeof lock.locked === 'boolean')
    && (lock.state === undefined || ['UNLOCKED', 'LOCKED'].includes(lock.state))
    && lock.locked !== true && !lock.lockedAt && lock.state !== 'LOCKED'
    && (lock.locked === false || lock.state === 'UNLOCKED')
    && !renderer?.runtimeInstance?.lockedAt && renderer?.revision?.status !== 'LOCKED')
}
const matches = (control, scope, version) => control && control.customerId === scope.customerId
  && control.tenantId === scope.tenantId && [control.id, control.runtimeInstanceKey].includes(scope.runtimeInstanceId)
  && control.stateVersion === version

// Evidence-pack acceptance is separate from section truth and Review Completion.
export function readDiscoveryAcceptanceBasis({ renderer, authority, evidenceReads, scope, loading, locked }) {
  const runtime = renderer?.runtimeInstance, version = runtime?.stateVersion, discovery = getHubDiscovery(renderer)
  if (loading || locked || !isDiscoveryAcceptanceUnlocked(renderer)
    || !matches(runtime, scope, version) || typeof version !== 'string' || !version.trim()
    || !matches(authority?.control, scope, version) || authority?.canReviewEvidence !== true
    || !runtime.updatedAt || !Number.isFinite(Date.parse(runtime.updatedAt))
    || Date.parse(authority.runtimeUpdatedAt) !== Date.parse(runtime.updatedAt)
    || !Array.isArray(evidenceReads) || evidenceReads.length !== 4
    || evidenceReads.some(read => !read || typeof read !== 'object')) return null
  const totalPage = !evidenceReads[0].error && getHubEvidencePage(evidenceReads[0].response)
  if (!totalPage || !matches(totalPage.control, scope, version) || !count(totalPage.total) || totalPage.totalCapped !== false) return null
  const totals = evidenceReads.map((read, index) => {
    if (index > 0 && read.error?.data?.error?.code === 'RUNTIME_STATE_V2_EVIDENCE_MISSING') return 0
    const page = !read.error && getHubEvidencePage(read.response)
    return page && matches(page.control, scope, version) && count(page.total) && page.totalCapped === false ? page.total : null
  })
  const [total, accepted, pending, rejected] = totals
  if (!totals.every(count) || total !== accepted + pending + rejected) return null
  return { total, accepted, pending, rejected, packAccepted: discovery?.accepted === true,
    ready: discovery?.accepted === false && discovery.inputComplete === true && discovery.evidenceReady === true
      && discovery.needsRefresh === false && pending === 0 && accepted > 0,
    signature: JSON.stringify([scope, version, runtime.updatedAt, ...totals, discovery?.accepted]),
    expectedUpdatedAt: runtime.updatedAt }
}

export function readDiscoveryAcceptanceRoute(renderer) {
  if (!Array.isArray(renderer?.actions) || renderer.actions.length > 100
    || renderer.actions.some(action => !action || typeof action.actionKey !== 'string' || typeof action.enabled !== 'boolean')) return null
  const candidates = renderer.actions.filter(action => [action.actionKey, action.governedAction]
    .some(key => typeof key === 'string' && key.trim().toUpperCase() === 'ACCEPT_EVIDENCE'))
  if (!candidates.length) return { dedicated: true }
  if (candidates.length !== 1 || candidates[0].actionKey !== 'ACCEPT_EVIDENCE'
    || candidates[0].governedAction !== 'ACCEPT_EVIDENCE' || candidates[0].enabled !== true) return null
  return { dedicated: false, actionKey: 'ACCEPT_EVIDENCE' }
}

export function readDiscoveryAcceptanceRefresh(results, scope) {
  if (results.length !== 6 || results.some(result => result.status !== 'fulfilled' || !result.value)) return null
  const [rendererRead, qualityRead, ...reads] = results.map(result => result.value)
  if (rendererRead.error || qualityRead.error) return null
  const renderer = getHubPayload(rendererRead.data)
  const authority = readHubReviewAuthority({ response: qualityRead.data, renderer, scope, locked: !isDiscoveryAcceptanceUnlocked(renderer) })
  return readDiscoveryAcceptanceBasis({ renderer, authority, scope,
    evidenceReads: reads.map(read => ({ response: read.data, error: read.error })) })
}
