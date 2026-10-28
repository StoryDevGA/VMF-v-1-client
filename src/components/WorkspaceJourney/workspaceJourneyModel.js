const readCount = (value) => (
  Number.isSafeInteger(value) && value >= 0 ? value : null
)

const firstCount = (...values) => values.map(readCount).find((value) => value !== null) ?? null
const asRecord = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
)

const formatCount = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`

export const getWorkspaceJourneyCompletion = ({ response, runtime, scope, loading, error, discovery }) => {
  const unavailable = { status: 'Unavailable', detail: '', state: 'unknown' }
  if (loading) return { ...unavailable, status: 'Checking review' }
  if (error || !runtime) return unavailable
  if (!response) return getWorkspaceJourneyReviewSummary(discovery)
  const record = response.data ?? response
  const identity = record.scope ?? {}
  const ids = [identity.runtimeInstanceId, identity.runtimeInstanceKey].filter(Boolean)
  if (record.available === false || !ids.includes(scope.runtimeInstanceId)
    || identity.customerId !== scope.customerId || identity.tenantId !== scope.tenantId
    || !runtime.stateVersion || record.stateVersion !== runtime.stateVersion
    || !runtime.updatedAt || record.runtimeUpdatedAt !== runtime.updatedAt) return unavailable
  const population = record.population
  const receipt = record.latestReceipt
  if (record.contractVersion === 'intelligence-review-completion.v1'
    && population?.completeness === 'COMPLETE' && population.complete === true
    && population.evidenceCount > 0 && population.pendingEvidence === 0
    && population.pendingFindings === 0 && population.confirmedReadinessBlockers === 0
    && receipt?.receiptId && receipt.currency === 'CURRENT'
    && population.hash && receipt.populationHash === population.hash) {
    return { status: 'Review complete', detail: 'Current disposition receipt verified. Draft readiness is checked separately.', state: 'complete' }
  }
  return { status: 'Review needed', detail: 'A current completion receipt is required.', state: 'attention' }
}

export const getWorkspaceJourneyReviewSummary = (discovery = null) => {
  const discoveryRecord = asRecord(discovery)
  if (Object.keys(discoveryRecord).length === 0) {
    return { status: 'Unavailable', detail: '', state: 'unknown' }
  }

  const health = asRecord(discoveryRecord.discoveryHealth)
  const readiness = asRecord(discoveryRecord.readiness)
  const healthReadiness = asRecord(health.readiness)
  const contradictions = asRecord(discoveryRecord.contradictions)

  if (discoveryRecord.available === false || health.available === false) {
    return { status: 'Unavailable', detail: '', state: 'unknown' }
  }

  const contradictionCount = firstCount(
    readiness.unresolvedContradictionCount,
    healthReadiness.unresolvedContradictionCount,
    contradictions.unresolvedCount,
  )
  const pendingEvidenceCount = firstCount(
    readiness.pendingReviewCount,
    healthReadiness.pendingReviewCount,
  )
  const evidenceObjectCount = firstCount(
    readiness.evidenceObjectCount,
    healthReadiness.evidenceObjectCount,
    asRecord(discoveryRecord.evidenceObjectSummary).evidenceObjectCount,
  )

  if (contradictionCount === null && pendingEvidenceCount === null) {
    return { status: 'Unavailable', detail: '', state: 'unknown' }
  }

  if ((contradictionCount ?? 0) > 0 || (pendingEvidenceCount ?? 0) > 0) {
    const details = []
    if (contradictionCount > 0) {
      details.push(formatCount(contradictionCount, 'unresolved contradiction', 'unresolved contradictions'))
    }
    if (pendingEvidenceCount > 0) {
      details.push(formatCount(pendingEvidenceCount, 'evidence item pending review', 'evidence items pending review'))
    }
    if (contradictionCount === null) details.push('Contradiction count unavailable')
    if (pendingEvidenceCount === null) details.push('Pending evidence review count unavailable')
    return { status: 'Review needed', detail: details.join(' · '), state: 'attention' }
  }

  if (contradictionCount === 0 && pendingEvidenceCount === 0) {
    if (evidenceObjectCount === 0) {
      return { status: 'Not yet recorded', detail: '', state: 'unknown' }
    }
    if (evidenceObjectCount > 0) {
      return { status: 'No pending review recorded', detail: '', state: 'complete' }
    }
    return {
      status: 'Unavailable',
      detail: 'Evidence count unavailable',
      state: 'unknown',
    }
  }

  const details = []
  if (contradictionCount === 0) details.push('No unresolved contradictions')
  if (pendingEvidenceCount === 0) details.push('No pending evidence reviews')
  if (contradictionCount === null) details.push('Contradiction count unavailable')
  if (pendingEvidenceCount === null) details.push('Pending evidence review count unavailable')
  return {
    status: 'Unavailable',
    detail: details.join(' · '),
    state: 'unknown',
  }
}
