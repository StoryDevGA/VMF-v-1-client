export function lockBasisFixture({ locked = true, snapshotId = 'lock-receipt-2' } = {}) {
  const stamp = '2026-09-17T18:14:00.000Z'
  return { contractVersion: 'intelligence-lock-basis.v1', source: 'runtime_state_v2.lock_basis', currency: 'AS_READ', readAt: '2026-10-06T12:30:00.000Z',
    control: { id: 'revision-2', runtimeInstanceKey: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', stateVersion: 'version-2', status: locked ? 'LOCKED' : 'DRAFT', lockedAt: locked ? stamp : null },
    lockBasis: { available: locked, reason: locked ? null : 'LOCK_NOT_RECORDED', locked,
      ...(locked ? { lockedAt: stamp, lockedBy: 'reviewer-1', lockVersion: 1 } : {}),
      snapshot: locked ? { snapshotId, snapshotHash: 'a'.repeat(64), snapshotAt: stamp, contractVersion: 'runtime-truth-snapshot-v1', actionKey: 'LOCK_RECORD' } : null,
      replay: locked ? { available: true, reason: null, anchor: { replayAnchorId: 'replay-2', replayAnchorHash: 'b'.repeat(64), relationship: 'LOCKED_VALUE_NARRATIVE',
        runtimeInstanceId: 'revision-2', runtimeInstanceKey: 'revision-2', lockSnapshotId: snapshotId, lockSnapshotHash: 'a'.repeat(64) } }
        : { available: false, reason: 'LOCK_BASIS_UNAVAILABLE', anchor: null },
      frozenInventory: { available: false, completeness: 'UNAVAILABLE', reason: 'FROZEN_MEMBERSHIP_NOT_RECORDED' } },
    readReceipt: { source: 'runtime_state_v2.lock_basis', bounded: true, fullLegacyFrameworkStateFetched: false, maxTimeMS: 2000, requestTimeoutMS: 6000,
      workTimeoutMS: 5500, cleanupReserveMS: 500, maxSerializedPayloadBytes: 524288, serializedPayloadBytes: 1400 } }
}
