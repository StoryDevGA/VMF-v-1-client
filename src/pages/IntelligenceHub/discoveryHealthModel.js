import { getHubPayload, displayHubToken } from './intelligenceHubModel.js'

const identity = value => typeof value === 'string' && value.length > 0 && value.length <= 240
  && value === value.trim() && !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
const time = value => typeof value === 'string' && value.length <= 40 && value === value.trim()
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value))
const reasons = value => Array.isArray(value) && value.length <= 32 && new Set(value).size === value.length
  && value.every(reason => typeof reason === 'string' && reason === reason.trim() && /^[A-Z][A-Z0-9_]{0,99}$/.test(reason))

export function readDiscoveryHealth({ response, scope, stateVersion, loading, error }) {
  const value = getHubPayload(response), budget = value?.readReceipt, health = value?.discoveryHealth
  if (loading || error || !identity(stateVersion) || value?.contractVersion !== 'intelligence-discovery-health.v1'
    || value.source !== 'runtime_state_v2.discovery_health' || value.currency !== 'AS_READ' || !time(value.readAt)
    || value.control?.customerId !== scope.customerId || value.control?.tenantId !== scope.tenantId
    || ![value.control?.id, value.control?.runtimeInstanceKey].includes(scope.runtimeInstanceId)
    || value.control?.stateVersion !== stateVersion || health?.assessmentBasis !== 'UNKNOWN'
    || budget?.source !== value.source || budget.bounded !== true || budget.fullLegacyFrameworkStateFetched !== false
    || budget.maxTimeMS !== 2000 || budget.requestTimeoutMS !== 6000 || budget.workTimeoutMS !== 5500 || budget.cleanupReserveMS !== 500
    || budget.maxSerializedPayloadBytes !== 512 * 1024 || !Number.isSafeInteger(budget.serializedPayloadBytes)
    || budget.serializedPayloadBytes < 0 || budget.serializedPayloadBytes > 512 * 1024) return null
  if (health.available === false) {
    if (!['ASSESSMENT_MISSING', 'ASSESSMENT_INVALID', 'REFRESH_MARKER_INVALID'].includes(health.reason)
      || health.assessment !== null || health.freshness !== 'UNKNOWN') return null
  } else if (health.available === true) {
    const a = health.assessment
    if (health.reason !== null || !['STALE', 'NOT_MARKED_STALE', 'UNKNOWN'].includes(health.freshness)
      || !['READY', 'PARTIALLY_READY', 'NOT_READY'].includes(a?.state)
      || !reasons(a.blockerReasons) || !reasons(a.warningReasons) || (a.assessedAt !== null && !time(a.assessedAt))) return null
  } else return null
  return { ...health, assessment: health.assessment ? { state: health.assessment.state,
    blockerReasons: [...health.assessment.blockerReasons], warningReasons: [...health.assessment.warningReasons],
    assessedAt: health.assessment.assessedAt } : null, stateVersion, readAt: value.readAt }
}

export const discoveryHealthLabel = (model, loading) => loading ? 'Loading…' : model?.available
  ? `Recorded ${displayHubToken(model.assessment.state)}${model.freshness === 'STALE' ? ' · Stale' : ''}` : 'Unavailable'
