import { describe, expect, it } from 'vitest'
import { coverageManifestFixture } from '../../test/coverageManifestFixture.js'
import { readCurrentCoverage, readCoverageSourceFacts } from './coverageReadModel.js'

const read = (response, options = {}) => readCurrentCoverage({ response: { data: response },
  scope: { runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1' }, stateVersion: 'version-2', ...options })

const sourceFacts = () => ({ contractVersion: 'dig-connected-source-facts.v1', basis: 'RECORDED_CONNECTED_ACCEPTED_EVIDENCE',
  resolvedSourceCount: 2, unresolvedEvidenceCount: 0, sourceCompleteness: 'COMPLETE', unknownSourceTypeCount: 1,
  typeCompleteness: 'COMPLETE', sourceTypeCounts: [{ sourceType: 'WEBSITE', count: 1 }] })

describe('optional recorded source facts', () => {
  it('reads qualified identities and known kinds without treating an unknown kind as an absent source', () => {
    expect(readCoverageSourceFacts(sourceFacts(), 3)).toEqual(sourceFacts())
    const partial = { ...sourceFacts(), unresolvedEvidenceCount: 1, sourceCompleteness: 'PARTIAL' }
    expect(readCoverageSourceFacts(partial, 3)).toEqual(partial)
  })
  it.each([
    value => { value.contractVersion = 'other' }, value => { value.basis = 'INFERRED' },
    value => { value.resolvedSourceCount = '2' }, value => { value.resolvedSourceCount = 4 },
    value => { value.unresolvedEvidenceCount = -1 }, value => { value.sourceCompleteness = 'PARTIAL' },
    value => { value.unknownSourceTypeCount = 3 }, value => { value.typeCompleteness = 'PARTIAL'; value.sourceTypeCounts = null },
    value => { value.sourceTypeCounts[0].count = 2 }, value => { value.sourceTypeCounts[0].sourceType = 'UNKNOWN' },
    value => { value.sourceTypeCounts[0].sourceType = ' website ' }, value => { value.sourceTypeCounts.push({ sourceType: 'WEBSITE', count: 1 }) },
    value => { value.sourceTypeCounts = null }, value => { value.sourceTypeCounts[0].count = 0 },
    value => { value.resolvedSourceCount = 0; value.unknownSourceTypeCount = 0; value.sourceTypeCounts = [] },
  ])('withholds malformed optional facts without losing current coverage %#', change => {
    const fixture = coverageManifestFixture(), value = sourceFacts(); change(value)
    fixture.manifest.metadata.coverage.domains[0].sourceFacts = value
    const result = read(fixture)
    expect(result.coverage.coveragePercent).toBe(70)
    expect(result.coverage.domains[0].sourceFacts).toBeNull()
  })
  it('accepts honest zero and bounded type overflow while legacy facts stay unavailable', () => {
    expect(readCoverageSourceFacts({ ...sourceFacts(), resolvedSourceCount: 0, unknownSourceTypeCount: 0, sourceTypeCounts: [] }, 0)?.resolvedSourceCount).toBe(0)
    expect(readCoverageSourceFacts({ ...sourceFacts(), resolvedSourceCount: 0, unknownSourceTypeCount: 0, sourceTypeCounts: [], unresolvedEvidenceCount: 2, sourceCompleteness: 'PARTIAL' }, 2)?.sourceCompleteness).toBe('PARTIAL')
    expect(readCoverageSourceFacts({ ...sourceFacts(), resolvedSourceCount: 13, unknownSourceTypeCount: 0, typeCompleteness: 'PARTIAL', sourceTypeCounts: null }, 13)?.typeCompleteness).toBe('PARTIAL')
    expect(read(coverageManifestFixture()).coverage.domains[0].sourceFacts).toBeNull()
  })
})

describe('current graph coverage receipt', () => {
  it('reads the ten-domain current graph basis with connected evidence a subset of accepted', () => {
    const fixture = coverageManifestFixture()
    expect(read(fixture)?.coverage.coveragePercent).toBe(70)
    expect(read(fixture)?.basis.snapshotId).toBe('snapshot-1')
    const company = fixture.manifest.metadata.coverage.domains[0]
    company.acceptedEvidenceCount = 3
    expect(read(fixture)).not.toBeNull()
  })
  it.each(['loading', 'error'])('withholds retained coverage on %s', state => {
    expect(read(coverageManifestFixture(), { loading: state === 'loading', error: state === 'error' })).toBeNull()
  })
  it.each([
    value => { value.control.customerId = 'other' },
    value => { value.control.tenantId = 'other' },
    value => { value.control.id = 'other'; value.control.runtimeInstanceKey = 'other' },
    value => { value.control.stateVersion = 'old' },
    value => { value.manifest.stateVersion = 'old' },
    value => { value.manifest.sourceStateVersion = 'old' },
    value => { value.manifest.status = 'STALE' },
    value => { value.manifest.snapshotId = '' },
    value => { value.manifest.sourceHash = '' },
    value => { value.manifest.graphHash = '' },
    value => { value.manifest.graphVersion = '' },
    value => { value.readReceipt.bounded = false },
    value => { value.readReceipt.fullLegacyFrameworkStateFetched = true },
    value => { value.readReceipt.source = 'legacy' },
    value => { value.readReceipt.serializedPayloadBytes = 524289 },
    value => { delete value.manifest.metadata.coverage },
    value => { value.manifest.metadata.coverage.domains.pop() },
    value => { value.manifest.metadata.coverage.domains[0].domain = 'Stakeholders' },
    value => { value.manifest.metadata.coverage.domains[0].pendingEvidenceCount = -1 },
    value => { value.manifest.metadata.coverage.domains[0].acceptedEvidenceCount = 1 },
    value => { value.manifest.metadata.coverage.domains[0].state = 'MISSING' },
    value => { value.manifest.metadata.coverage.coveredDomainCount = 8 },
    value => { value.manifest.metadata.coverage.coveragePercent = 80 },
    value => { value.manifest.metadata.coverage.missingDomains = ['Company', 'Consequences', 'Stakeholders'] },
  ])('rejects unavailable, stale, wrong-scope or inconsistent receipts %#', change => {
    const fixture = coverageManifestFixture(); change(fixture)
    expect(read(fixture)).toBeNull()
  })
  it('accepts a complete zero-coverage map without claiming readiness', () => {
    const fixture = coverageManifestFixture(); const coverage = fixture.manifest.metadata.coverage
    coverage.domains.forEach(row => { row.connectedEvidenceCount = 0; row.acceptedEvidenceCount = 0; row.state = 'MISSING' })
    coverage.coveredDomainCount = 0; coverage.coveragePercent = 0; coverage.missingDomains = coverage.domains.map(row => row.domain)
    expect(read(fixture)?.coverage.coveragePercent).toBe(0)
  })
  it('rejects the legacy coverage shape without a manifest receipt', () => {
    expect(read({ available: true, coverage: coverageManifestFixture().manifest.metadata.coverage })).toBeNull()
  })
})
