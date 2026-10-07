const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 1000
export function readSourceSummary({ response, scope, stateVersion, loading, error }) {
  const value = response?.data || response
  if (loading || error || !stateVersion || value?.contractVersion !== 'intelligence-source-summary.v1'
    || value.currency !== 'AS_READ' || value.stateVersion !== stateVersion
    || value.scope?.customerId !== scope.customerId || value.scope?.tenantId !== scope.tenantId
    || ![value.scope?.runtimeInstanceId, value.scope?.runtimeInstanceKey].includes(scope.runtimeInstanceId)
    || value.basis !== 'DOCUMENT_SOURCE_CURRENT_CONTENT_SUCCESS_RECEIPT'
    || !Number.isFinite(Date.parse(value.readAt)) || value.countLimit !== 1000
    || value.readReceipt?.bounded !== true || value.readReceipt?.fullLegacyFrameworkStateFetched !== false
    || value.readReceipt?.maxTimeMS !== 2000 || value.readReceipt?.requestTimeoutMS !== 6000
    || value.readReceipt?.maxSerializedPayloadBytes !== 512 * 1024) return null
  if (value.sourceCompleteness === 'PARTIAL') return value.uniqueSourceCount === null
    && value.documentSourceCount === null && value.documentsProcessed === null
    && value.knownProcessedCount === null && value.unknownCount === null && value.staleCount === null
    && value.processingCompleteness === 'UNAVAILABLE' ? value : null
  if (value.sourceCompleteness !== 'COMPLETE' || !count(value.uniqueSourceCount) || !count(value.documentSourceCount)
    || value.documentSourceCount > value.uniqueSourceCount || !value.sourceCountsByType
    || typeof value.sourceCountsByType !== 'object' || Array.isArray(value.sourceCountsByType)
    || Object.entries(value.sourceCountsByType).some(([type, total]) => !/^[A-Z][A-Z0-9_]{0,99}$/.test(type) || !count(total))
    || Object.values(value.sourceCountsByType).reduce((sum, total) => sum + total, 0) !== value.uniqueSourceCount
    || (value.sourceCountsByType.UPLOADED_DOCUMENT || 0) !== value.documentSourceCount
    || ![value.knownProcessedCount, value.unknownCount, value.staleCount].every(count)
    || value.knownProcessedCount + value.unknownCount + value.staleCount !== value.documentSourceCount) return null
  if (value.processingCompleteness === 'COMPLETE') return value.unknownCount === 0
    && value.documentsProcessed === value.knownProcessedCount ? value : null
  if (!['PARTIAL', 'UNAVAILABLE'].includes(value.processingCompleteness) || value.documentsProcessed !== null
    || value.processingCompleteness === 'PARTIAL' && value.unknownCount === 0
    || value.processingCompleteness === 'UNAVAILABLE' && (value.knownProcessedCount !== 0
      || value.staleCount !== 0 || value.unknownCount !== value.documentSourceCount)) return null
  return value
}

export const sourceProcessingLabel = (summary, loading = false) => loading ? 'Loading…'
  : !summary ? 'Unavailable'
    : summary.processingCompleteness === 'COMPLETE' ? String(summary.documentsProcessed)
      : summary.sourceCompleteness !== 'COMPLETE' ? 'Unavailable · source population partial'
        : `Unavailable · ${summary.knownProcessedCount} verified, ${summary.unknownCount} unknown${summary.staleCount ? `, ${summary.staleCount} stale` : ''}`

export const sourceProcessingExplanation = summary => !summary
  ? 'Current source processing summary unavailable. Refresh this view to verify the selected revision.'
  : summary.sourceCompleteness !== 'COMPLETE'
    ? 'The source population exceeds the bounded count limit. Whole-revision totals are unavailable.'
    : summary.processingCompleteness === 'UNAVAILABLE'
      ? 'Processing proof exceeds the bounded read allowance. Whole-source totals remain available; the processed total is unavailable.'
      : summary.unknownCount
        ? 'Some document sources have no verified processing receipt for their current content. The whole processed total is unavailable.'
        : 'Distinct current document sources with successful processing receipts. Zero-object extraction counts once; processing does not establish acceptance or readiness.'

export const refreshSourceSummarySafely = ({ refetch, isCurrent }) => Promise.resolve()
  .then(() => isCurrent() ? refetch() : null).catch(() => null)
