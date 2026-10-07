// Explicit fixture receipt; not connected or deployment evidence.
export const evidenceInventoryFixture = (overrides = {}) => ({
  contractVersion: 'intelligence-evidence-inventory.v1', upstreamContractVersion: 'outcome-evidence-inventory.v1',
  scope: { runtimeInstanceId: 'revision-2', runtimeInstanceKey: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1' },
  stateVersion: 'version-2', currency: 'AS_READ', readAt: '2026-10-06T10:00:00.000Z',
  basis: 'CURRENT_STORED_INVENTORY', completeness: 'COMPLETE', inventoryHash: 'a'.repeat(64),
  evidence: { expectedCount: 853, readCount: 853 },
  sources: { expectedCount: 1, readCount: 1, records: [{ sourceId: 'source-one', recordHash: 'b'.repeat(64) }] },
  sectionMapping: { basis: 'STORED_SECTION_REFERENCES', state: 'UNRESOLVED', sectionCount: 10, unresolvedReferenceCount: 1 },
  readReceipt: { bounded: true, fullLegacyFrameworkStateFetched: false, inventoryPageSize: 150,
    maxTimeMS: 2000, requestTimeoutMS: 6000, workTimeoutMS: 5500, cleanupReserveMS: 500, maxSerializedReadBytes: 524288 },
  ...overrides,
})
