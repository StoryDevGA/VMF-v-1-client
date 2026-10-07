export function coverageManifestFixture() {
  const connected = { Company: 2, Products: 12, Services: 1, Market: 2, Problems: 0, Consequences: 0, Proof: 2, Economics: 2, Differentiation: 1, Stakeholders: 0 }
  return {
    control: { id: 'revision-2', runtimeInstanceKey: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1', stateVersion: 'version-2' },
    readReceipt: { bounded: true, source: 'runtime_state_v2.graph_manifest', fullLegacyFrameworkStateFetched: false,
      maxSerializedPayloadBytes: 524288, serializedPayloadBytes: 3000 },
    manifest: { status: 'CURRENT', stateVersion: 'version-2', sourceStateVersion: 'version-2', snapshotId: 'snapshot-1',
      sourceHash: `sha256:${'a'.repeat(64)}`, graphHash: 'hash-1', graphVersion: '2.2', metadata: { coverage: {
        coverageModel: 'EVIDENCE_DOMAIN_COVERAGE', coveragePercent: 70, coveredDomainCount: 7, totalDomainCount: 10,
        unclassifiedEvidenceCount: 0, missingDomains: ['Problems', 'Consequences', 'Stakeholders'],
        domains: Object.entries(connected).map(([domain, total]) => ({ domain, connectedEvidenceCount: total,
          acceptedEvidenceCount: total, pendingEvidenceCount: 0, rejectedEvidenceCount: 0, lowQualityEvidenceCount: 0,
          state: total >= 2 ? 'STRONG' : total === 1 ? 'ADEQUATE' : 'MISSING' })),
      } } },
  }
}
