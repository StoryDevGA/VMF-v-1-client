import { getHubPayload } from './intelligenceHubModel.js'

export const COVERAGE_DOMAINS = Object.freeze(['Company', 'Products', 'Services', 'Market', 'Economics', 'Problems', 'Consequences', 'Stakeholders', 'Proof', 'Differentiation'])
const domains = COVERAGE_DOMAINS.map(domain => domain.toUpperCase())
const token = value => typeof value === 'string' ? value.trim().toUpperCase() : ''
const identity = value => typeof value === 'string' && value.trim().length > 0
const count = value => Number.isSafeInteger(value) && value >= 0

// Optional additive facts cannot invalidate an independently valid domain map.
export function readCoverageSourceFacts(value, connectedEvidenceCount) {
  if (!value || value.contractVersion !== 'dig-connected-source-facts.v1'
    || value.basis !== 'RECORDED_CONNECTED_ACCEPTED_EVIDENCE' || !count(connectedEvidenceCount)
    || ![value.resolvedSourceCount, value.unresolvedEvidenceCount, value.unknownSourceTypeCount].every(count)
    || value.unresolvedEvidenceCount > connectedEvidenceCount
    || value.resolvedSourceCount > connectedEvidenceCount - value.unresolvedEvidenceCount
    || (connectedEvidenceCount > value.unresolvedEvidenceCount && value.resolvedSourceCount === 0)
    || value.unknownSourceTypeCount > value.resolvedSourceCount
    || value.sourceCompleteness !== (value.unresolvedEvidenceCount === 0 ? 'COMPLETE' : 'PARTIAL')) return null
  const { sourceTypeCounts } = value
  if (value.typeCompleteness === 'PARTIAL') {
    if (sourceTypeCounts !== null || value.resolvedSourceCount - value.unknownSourceTypeCount < 13) return null
  } else if (value.typeCompleteness === 'COMPLETE') {
    if (!Array.isArray(sourceTypeCounts) || sourceTypeCounts.length > 12) return null
    let previous = '', total = value.unknownSourceTypeCount
    for (const row of sourceTypeCounts) {
      if (!row || typeof row.sourceType !== 'string' || row.sourceType === 'UNKNOWN'
        || !/^[A-Z][A-Z0-9_]{0,99}$/.test(row.sourceType) || row.sourceType <= previous
        || !count(row.count) || row.count === 0) return null
      total += row.count
      if (!Number.isSafeInteger(total)) return null
      previous = row.sourceType
    }
    if (total !== value.resolvedSourceCount) return null
  } else return null
  return { contractVersion: value.contractVersion, basis: value.basis,
    resolvedSourceCount: value.resolvedSourceCount, unresolvedEvidenceCount: value.unresolvedEvidenceCount,
    sourceCompleteness: value.sourceCompleteness, unknownSourceTypeCount: value.unknownSourceTypeCount,
    typeCompleteness: value.typeCompleteness,
    sourceTypeCounts: sourceTypeCounts?.map(row => ({ sourceType: row.sourceType, count: row.count })) ?? null }
}

// Validate the existing producer's receipt; this does not calculate new coverage.
export function readCurrentCoverage({ response, scope, stateVersion, loading, error }) {
  const value = getHubPayload(response)
  const { control, manifest, readReceipt } = value || {}
  if (loading || error || !identity(stateVersion)
    || control?.customerId !== scope.customerId || control?.tenantId !== scope.tenantId
    || ![control?.id, control?.runtimeInstanceKey].includes(scope.runtimeInstanceId)
    || control?.stateVersion !== stateVersion || manifest?.stateVersion !== stateVersion
    || manifest?.sourceStateVersion !== stateVersion || manifest?.status !== 'CURRENT'
    || !identity(manifest.snapshotId) || !identity(manifest.graphHash) || !identity(manifest.graphVersion)
    || !/^sha256:[a-f0-9]{64}$/.test(manifest.sourceHash || '')
    || readReceipt?.bounded !== true || readReceipt.fullLegacyFrameworkStateFetched !== false
    || readReceipt.source !== 'runtime_state_v2.graph_manifest'
    || readReceipt.maxSerializedPayloadBytes !== 512 * 1024
    || !count(readReceipt.serializedPayloadBytes) || readReceipt.serializedPayloadBytes > 512 * 1024) return null
  const coverage = manifest.metadata?.coverage
  if (coverage?.coverageModel !== 'EVIDENCE_DOMAIN_COVERAGE'
    || coverage.totalDomainCount !== domains.length || !count(coverage.coveredDomainCount)
    || coverage.coveredDomainCount > domains.length || !count(coverage.unclassifiedEvidenceCount)
    || !Array.isArray(coverage.domains) || coverage.domains.length !== domains.length
    || !Array.isArray(coverage.missingDomains)) return null
  const names = coverage.domains.map(row => token(row?.domain))
  if (new Set(names).size !== domains.length || names.some(name => !domains.includes(name))) return null
  for (const row of coverage.domains) {
    if (![row.connectedEvidenceCount, row.acceptedEvidenceCount, row.pendingEvidenceCount,
      row.rejectedEvidenceCount, row.lowQualityEvidenceCount].every(count)
      || row.connectedEvidenceCount > row.acceptedEvidenceCount) return null
    const state = row.connectedEvidenceCount >= 2 ? 'STRONG' : row.connectedEvidenceCount === 1 ? 'ADEQUATE'
      : row.acceptedEvidenceCount + row.pendingEvidenceCount + row.lowQualityEvidenceCount > 0 ? 'WEAK' : 'MISSING'
    if (row.state !== state) return null
  }
  const covered = coverage.domains.filter(row => row.connectedEvidenceCount > 0).length
  const missing = new Set(coverage.domains.filter(row => row.connectedEvidenceCount === 0).map(row => token(row.domain)))
  if (coverage.coveredDomainCount !== covered || coverage.coveragePercent !== Math.round(covered / domains.length * 100)
    || coverage.missingDomains.length !== missing.size
    || new Set(coverage.missingDomains.map(token)).size !== missing.size
    || coverage.missingDomains.some(name => !missing.has(token(name)))) return null
  return { available: true, coverage: { ...coverage, domains: coverage.domains.map(row => ({ ...row,
    sourceFacts: readCoverageSourceFacts(row.sourceFacts, row.connectedEvidenceCount) })) }, basis: { snapshotId: manifest.snapshotId, stateVersion,
    sourceHash: manifest.sourceHash, graphHash: manifest.graphHash, graphVersion: manifest.graphVersion } }
}
