import { getHubEvidencePage, getHubPayload, validateHubContext } from './intelligenceHubModel.js'
import { readHubReviewAuthority } from './useHubReviewActions.js'
import { refreshSourceSummarySafely } from './sourceSummaryModel.js'

export async function refreshAcquisitionScope({ reads, scope, refreshSummary, summaryIsCurrent }) {
  const results = await Promise.allSettled(reads.map(read => Promise.resolve().then(read)))
  void refreshSourceSummarySafely({ refetch: refreshSummary, isCurrent: summaryIsCurrent })
  return verifyAcquisitionRefresh({ results, scope })
}

export function verifyAcquisitionRefresh({ results, scope }) {
  if (results.length !== 6 || results.some(result => result.status !== 'fulfilled' || !result.value)) return false
  const reads = results.map(result => result.value)
  const [rendererRead, qualityRead, sourceRead, unfiltered, accepted, pending] = reads
  if (rendererRead.error || qualityRead.error || sourceRead.error || unfiltered.error) return false
  const renderer = getHubPayload(rendererRead.data)
  if (!validateHubContext({ renderer, ...scope }).valid) return false
  const authority = readHubReviewAuthority({ response: qualityRead.data, scope: { runtimeInstanceId: scope.revisionId, customerId: scope.customerId, tenantId: scope.tenantId }, renderer })
  if (!authority) return false
  const current = control => control && String(control.customerId) === scope.customerId && String(control.tenantId) === scope.tenantId
    && [control.id, control.runtimeInstanceKey].includes(scope.revisionId) && control.stateVersion === authority.control.stateVersion
  const evidence = getHubEvidencePage(unfiltered.data)
  if (!current(getHubPayload(sourceRead.data)?.control) || !evidence || !current(evidence.control)) return false
  const verifiedEmptyBasis = typeof evidence.total === 'number' && Number.isFinite(evidence.total) && evidence.total >= 0 && !evidence.totalCapped
  return [accepted, pending].every(read => {
    if (read.error) return verifiedEmptyBasis && read.error?.data?.error?.code === 'RUNTIME_STATE_V2_EVIDENCE_MISSING'
    const page = getHubEvidencePage(read.data)
    return Boolean(page && current(page.control))
  })
}
