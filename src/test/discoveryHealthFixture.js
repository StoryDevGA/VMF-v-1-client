export function discoveryHealthFixture({ runtimeInstanceId = 'revision-2', customerId = 'customer-1', tenantId = 'tenant-1', stateVersion = 'version-2', state = 'PARTIALLY_READY', freshness = 'NOT_MARKED_STALE' } = {}) {
  return { contractVersion: 'intelligence-discovery-health.v1',
    source: 'runtime_state_v2.discovery_health', currency: 'AS_READ', readAt: '2026-10-06T12:30:00.000Z',
    control: { id: runtimeInstanceId, customerId, tenantId, stateVersion },
    discoveryHealth: { available: true, reason: null, assessmentBasis: 'UNKNOWN', freshness,
      assessment: { state, blockerReasons: [], warningReasons: ['EVIDENCE_REVIEW_PENDING'], assessedAt: '2026-10-06T12:00:00.000Z' } },
    readReceipt: { source: 'runtime_state_v2.discovery_health', bounded: true, fullLegacyFrameworkStateFetched: false,
      maxTimeMS: 2000, requestTimeoutMS: 6000, workTimeoutMS: 5500, cleanupReserveMS: 500,
      maxSerializedPayloadBytes: 524288, serializedPayloadBytes: 900 } }
}
