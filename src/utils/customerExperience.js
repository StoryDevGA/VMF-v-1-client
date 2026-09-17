import { formatRuntimeTokenLabel } from './runtimeWorkspace.js'

export const CUSTOMER_EXPERIENCE = Object.freeze({
  CORE: 'CORE',
  SIGNAL: 'SIGNAL',
  UNKNOWN: 'UNKNOWN',
})

const CORE_FEATURE = 'VMF'
export const SIGNAL_FEATURES = Object.freeze(new Set(['DEALS', 'VIEWS']))

export const CUSTOMER_WORKSPACE_STATES = Object.freeze({
  UNDERSTANDING_ACCEPTED: 'UNDERSTANDING_ACCEPTED',
  UNDERSTANDING_REVIEW: 'UNDERSTANDING_REVIEW',
  UNDERSTANDING_UNRECORDED: 'UNDERSTANDING_UNRECORDED',
  EVIDENCE_AVAILABLE: 'EVIDENCE_AVAILABLE',
  EVIDENCE_CHECKED: 'EVIDENCE_CHECKED',
  EVIDENCE_REVIEW: 'EVIDENCE_REVIEW',
  EVIDENCE_ATTENTION: 'EVIDENCE_ATTENTION',
  EVIDENCE_VERIFY: 'EVIDENCE_VERIFY',
  EVIDENCE_UNRECORDED: 'EVIDENCE_UNRECORDED',
  WORKING: 'WORKING',
  NEEDS_INPUT: 'NEEDS_INPUT',
  THINGS_TO_VERIFY: 'THINGS_TO_VERIFY',
})

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
  if (entitlements.some((feature) => SIGNAL_FEATURES.has(feature))) {
    return CUSTOMER_EXPERIENCE.SIGNAL
  }

  return CUSTOMER_EXPERIENCE.UNKNOWN
}

const ACCEPTED_UNDERSTANDING_STATES = Object.freeze(new Set([
  'ACCEPTED',
  'VALIDATED',
  'COMPLETE',
  'COMPLETED',
  'PASSED',
  'PASS',
  'VALID',
]))

export const isAcceptedUnderstanding = (value) => ACCEPTED_UNDERSTANDING_STATES.has(
  String(value ?? '').trim().toUpperCase(),
)

const READY_EVIDENCE_STATES = Object.freeze(new Set([
  'READY',
  'AVAILABLE',
  'COMPLETE',
  'COMPLETED',
  'CURRENT',
]))

const CHECKED_EVIDENCE_STATES = Object.freeze(new Set(['VALIDATED', 'APPROVED']))
const REVIEW_EVIDENCE_STATES = Object.freeze(new Set(['IN_REVIEW']))
const ATTENTION_EVIDENCE_STATES = Object.freeze(new Set(['BLOCKED', 'FAILED', 'ERROR']))
const VERIFY_EVIDENCE_STATES = Object.freeze(new Set([
  'PENDING',
  'WAITING',
  'NOT_READY',
  'LEGACY_POLICY_ONLY',
]))

const CUSTOMER_EVIDENCE_LABELS = Object.freeze({
  READY: 'Source basis available',
  AVAILABLE: 'Source basis available',
  COMPLETE: 'Source basis available',
  COMPLETED: 'Source basis available',
  CURRENT: 'Source basis available',
  LOCKED: 'Source basis locked',
  BLOCKED: 'Items needing attention',
  FAILED: 'Items needing attention',
  ERROR: 'Items needing attention',
  PENDING: 'Things to verify',
  WAITING: 'Things to verify',
  NOT_READY: 'Things to verify',
  VALIDATED: 'Evidence checked',
  IN_REVIEW: 'Review & evidence',
  APPROVED: 'Evidence checked',
  PUBLISHED: 'Source basis available',
  PACKAGE_BOUND: 'Source basis available',
  PACKAGE_INFERRED_FROM_VERSION: 'Source basis available',
  LEGACY_POLICY_ONLY: 'Things to verify',
  UNBOUND: 'Not yet recorded',
})

const normalizeToken = (value) => String(value ?? '').trim().toUpperCase()

const formatCustomerEvidenceLabel = (value) => {
  const normalized = normalizeToken(value)
  return CUSTOMER_EVIDENCE_LABELS[normalized] || 'Not yet recorded'
}

const resolveEvidenceState = (value) => {
  const normalized = normalizeToken(value)
  if (!normalized || normalized === 'UNBOUND') {
    return CUSTOMER_WORKSPACE_STATES.EVIDENCE_UNRECORDED
  }
  if (CHECKED_EVIDENCE_STATES.has(normalized)) {
    return CUSTOMER_WORKSPACE_STATES.EVIDENCE_CHECKED
  }
  if (REVIEW_EVIDENCE_STATES.has(normalized)) {
    return CUSTOMER_WORKSPACE_STATES.EVIDENCE_REVIEW
  }
  if (ATTENTION_EVIDENCE_STATES.has(normalized)) {
    return CUSTOMER_WORKSPACE_STATES.EVIDENCE_ATTENTION
  }
  if (VERIFY_EVIDENCE_STATES.has(normalized)) {
    return CUSTOMER_WORKSPACE_STATES.EVIDENCE_VERIFY
  }
  if (READY_EVIDENCE_STATES.has(normalized) || normalized === 'LOCKED' || normalized === 'PUBLISHED' || normalized === 'PACKAGE_BOUND' || normalized === 'PACKAGE_INFERRED_FROM_VERSION') {
    return CUSTOMER_WORKSPACE_STATES.EVIDENCE_AVAILABLE
  }
  return CUSTOMER_WORKSPACE_STATES.EVIDENCE_UNRECORDED
}

const formatWorkspaceTypeLabel = (summary = {}) => {
  const runtimeType = normalizeToken(summary.runtimeType)
  const frameworkKey = normalizeToken(summary.frameworkKey)

  if (runtimeType === 'VALUE_NARRATIVE' && (!frameworkKey || frameworkKey === 'VMF')) {
    return 'Value Narrative workspace'
  }

  if (!runtimeType) return 'Workspace'
  return `${formatRuntimeTokenLabel(runtimeType)} workspace`
}

const firstText = (...values) => values
  .map((value) => String(value ?? '').trim())
  .find(Boolean) || 'Not yet recorded'

export const buildCustomerHomeWorkspaceCard = (summary = {}) => {
  const businessObjective = firstText(summary.name, summary.description)
  const currentStageValue = firstText(summary.frameworkLifecycleStage, summary.status)
  const currentStage = currentStageValue === 'Not yet recorded'
    ? currentStageValue
    : formatRuntimeTokenLabel(currentStageValue, 'Not yet recorded')
  const understandingStatus = String(summary.validationStatus ?? '').trim()
  const understandingAccepted = isAcceptedUnderstanding(understandingStatus)
  const understandingState = understandingAccepted
    ? CUSTOMER_WORKSPACE_STATES.UNDERSTANDING_ACCEPTED
    : understandingStatus
      ? CUSTOMER_WORKSPACE_STATES.UNDERSTANDING_REVIEW
      : CUSTOMER_WORKSPACE_STATES.UNDERSTANDING_UNRECORDED
  const evidenceStateValue = firstText(
    summary.readinessState,
    summary.snapshotStatus,
    summary.submittedForReview ? 'Review & evidence' : '',
  )
  const evidenceStatus = resolveEvidenceState(evidenceStateValue)
  const evidenceState = evidenceStateValue === 'Review & evidence'
    ? 'Review & evidence'
    : formatCustomerEvidenceLabel(evidenceStateValue)
  const statusSignal = understandingAccepted
    ? 'Evidence checked'
    : evidenceStatus === CUSTOMER_WORKSPACE_STATES.EVIDENCE_AVAILABLE
      ? 'Source basis available'
      : null
  const submittedForReview = summary.submittedForReview === true
  const nextAction = submittedForReview || evidenceStatus === CUSTOMER_WORKSPACE_STATES.EVIDENCE_REVIEW
    ? 'Review & evidence'
    : understandingState !== CUSTOMER_WORKSPACE_STATES.UNDERSTANDING_ACCEPTED
      ? 'Review items'
      : evidenceStatus === CUSTOMER_WORKSPACE_STATES.EVIDENCE_UNRECORDED
        || evidenceStatus === CUSTOMER_WORKSPACE_STATES.EVIDENCE_VERIFY
        || evidenceStatus === CUSTOMER_WORKSPACE_STATES.EVIDENCE_ATTENTION
        ? 'Things to verify'
        : 'Open workspace'

  const executionStatus = String(summary.executionStatus ?? '').trim().toUpperCase()
  const attentionGroup = executionStatus === 'RUNNING' || executionStatus === 'IN_PROGRESS'
    ? 'StoryLineOS is working on'
    : (!understandingAccepted || businessObjective === 'Not yet recorded')
      ? 'Needs your input'
      : 'Things to verify'

  const identityParts = [
    summary.id,
    summary.runtimeInstanceKey,
    summary.name,
    summary.updatedAt ?? summary.updated_at ?? summary.modifiedAt ?? summary.createdAt,
  ].map((value) => String(value ?? '').trim()).filter(Boolean)

  return {
    id: summary.id ?? summary.runtimeInstanceKey ?? null,
    identityKey: identityParts.join('|') || null,
    title: businessObjective,
    businessObjective,
    workspaceType: formatWorkspaceTypeLabel(summary),
    currentStage,
    understandingState,
    understanding: understandingAccepted ? 'Understanding accepted' : (understandingStatus ? 'Review items' : 'Not yet recorded'),
    evidenceStatus,
    evidence: evidenceState,
    nextAction,
    attentionGroup,
    statusSignal,
    status: firstText(summary.status),
    runtimeInstanceKey: summary.runtimeInstanceKey ?? null,
    updatedAt: summary.updatedAt ?? summary.updated_at ?? summary.modifiedAt ?? summary.createdAt ?? null,
  }
}
