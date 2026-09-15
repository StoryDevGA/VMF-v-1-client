export const CUSTOMER_EXPERIENCE = Object.freeze({
  CORE: 'CORE',
  SIGNAL: 'SIGNAL',
  UNKNOWN: 'UNKNOWN',
})

const CORE_FEATURE = 'VMF'
const SIGNAL_FEATURES = new Set(['DEALS', 'VIEWS'])

export const normalizeFeatureEntitlements = (values) => (
  Array.isArray(values)
    ? Array.from(new Set(values
      .map((value) => String(value ?? '').trim().toUpperCase())
      .filter(Boolean)))
    : []
)

/**
 * Resolve the customer-facing V1 experience from one selected customer scope.
 * Missing, empty, or unknown scopes fail closed rather than becoming Signal.
 */
export const resolveCustomerExperience = (scope) => {
  if (!scope || !Array.isArray(scope.featureEntitlements)) {
    return CUSTOMER_EXPERIENCE.UNKNOWN
  }

  const entitlements = normalizeFeatureEntitlements(scope.featureEntitlements)
  if (entitlements.length === 0) return CUSTOMER_EXPERIENCE.UNKNOWN
  if (entitlements.includes(CORE_FEATURE)) return CUSTOMER_EXPERIENCE.CORE
  if (entitlements.every((feature) => SIGNAL_FEATURES.has(feature))) {
    return CUSTOMER_EXPERIENCE.SIGNAL
  }

  return CUSTOMER_EXPERIENCE.UNKNOWN
}

export const isAcceptedUnderstanding = (value) => new Set([
  'ACCEPTED',
  'VALIDATED',
  'COMPLETE',
  'COMPLETED',
  'PASSED',
  'PASS',
  'VALID',
]).has(String(value ?? '').trim().toUpperCase())

const firstText = (...values) => values
  .map((value) => String(value ?? '').trim())
  .find(Boolean) || 'Not yet recorded'

export const buildCustomerHomeWorkspaceCard = (summary = {}) => {
  const businessObjective = firstText(summary.name, summary.description)
  const currentStage = firstText(summary.frameworkLifecycleStage, summary.status)
  const understandingStatus = String(summary.validationStatus ?? '').trim()
  const understandingAccepted = isAcceptedUnderstanding(understandingStatus)
  const evidenceState = firstText(
    summary.readinessState,
    summary.snapshotStatus,
    summary.submittedForReview ? 'Review & evidence' : '',
  )
  const evidenceRecorded = evidenceState !== 'Not yet recorded'
  const submittedForReview = summary.submittedForReview === true
  const nextAction = submittedForReview
    ? 'Review & evidence'
    : !understandingAccepted
      ? (understandingStatus ? 'Review items' : 'Review items')
      : !evidenceRecorded
        ? 'Things to verify'
        : 'Open workspace'

  const executionStatus = String(summary.executionStatus ?? '').trim().toUpperCase()
  const attentionGroup = executionStatus === 'RUNNING' || executionStatus === 'IN_PROGRESS'
    ? 'StoryLineOS is working on'
    : (!understandingAccepted || businessObjective === 'Not yet recorded')
      ? 'Needs your input'
      : 'Things to verify'

  return {
    id: summary.id || summary.runtimeInstanceKey || businessObjective,
    title: businessObjective,
    businessObjective,
    currentStage,
    understanding: understandingAccepted ? 'Understanding accepted' : (understandingStatus ? 'Review items' : 'Not yet recorded'),
    evidence: evidenceState,
    nextAction,
    attentionGroup,
    status: firstText(summary.status),
    runtimeInstanceKey: summary.runtimeInstanceKey || '',
    updatedAt: summary.updatedAt ?? summary.updated_at ?? summary.modifiedAt ?? summary.createdAt ?? null,
  }
}
