// Explicit consumer fixture, never a deployed completeness claim.
export const storedFindingRow = (findingId = 'finding-a', patch = {}) => ({ findingId, type: 'CONTRADICTION', domain: 'Market',
  severity: 'HIGH', basis: 'Recorded detection basis', evidencePairHash: 'sha256:' + 'a'.repeat(64), reviewStatus: 'UNREVIEWED', latestReview: null,
  evidence: [{ evidenceObjectId: 'e1', sourceId: 'source-1', extractedFact: 'Current selected fact', sourceType: '', lineageRef: '', validationStatus: '', reviewStatus: 'PENDING' },
    { evidenceObjectId: 'e2', sourceId: 'source-2', extractedFact: 'Second selected fact', sourceType: '', lineageRef: '', validationStatus: '', reviewStatus: 'ACCEPTED' }],
  priority: { available: false, reason: 'GOVERNED_PRIORITY_NOT_RECORDED' }, consequences: 'UNAVAILABLE', ...patch })
export const storedFindingFixture = (args = {}, patch = {}) => ({ contractVersion: 'intelligence-finding-read.v1', source: 'runtime_state_v2.stored_findings',
  currency: 'AS_READ', readAt: '2026-10-06T11:00:00.000Z', control: { id: args.runtimeInstanceId || 'revision-id', runtimeInstanceKey: args.runtimeInstanceId || 'revision',
    customerId: args.customerId || 'customer', tenantId: args.tenantId || 'tenant', stateVersion: args.stateVersion || 'rsv2:current' },
  readReceipt: { source: 'runtime_state_v2.stored_findings', bounded: true, fullLegacyFrameworkStateFetched: false,
    maxTimeMS: 2000, requestTimeoutMS: 6000, workTimeoutMS: 5500, cleanupReserveMS: 500, maxSerializedPayloadBytes: 524288, serializedPayloadBytes: 2000 },
  findings: { available: true, completeness: 'COMPLETE_STORED_DETECTIONS', reason: null, search: args.search || '', type: args.type || 'CONTRADICTION',
    population: args.population || 'DETECTED', sort: args.sort || 'ID_ASC', page: args.page || 1, pageSize: args.pageSize || 4,
    total: 1, totalPages: 1, populations: { detected: 1, open: 1, recorded: 0, counting: 'OVERLAPPING_INSPECTION_POPULATIONS' },
    allTypesCompleteness: 'UNAVAILABLE', detectionPolicy: { coverage: 'LIMITED_BY_PRODUCER_POLICY', maxStoredCandidates: 8, detectorVersion: null },
    records: [storedFindingRow()], ...patch } })
