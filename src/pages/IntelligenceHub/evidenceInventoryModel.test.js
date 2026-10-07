import { expect, it } from 'vitest'
import { readEvidenceInventory, inventoryExplanation, inventoryLabel } from './evidenceInventoryModel.js'
import { evidenceInventoryFixture } from '../../test/evidenceInventoryFixture.js'

const read = (overrides = {}, args = {}) => readEvidenceInventory({ response: { data: evidenceInventoryFixture(overrides) },
  scope: { runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1' }, stateVersion: 'version-2', ...args })
it('complete current inventory retains unresolved mapping without granting target or frozen readiness', () => {
  const value = read()
  expect(value.evidence.readCount).toBe(853)
  expect(inventoryExplanation(value)).toMatch(/mapping remains unassessed/)
  expect(inventoryExplanation(value)).toMatch(/does not establish frozen membership/)
  expect(value).not.toHaveProperty('ready')
})
it.each(['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey'])('rejects wrong %s', key => {
  const scope = evidenceInventoryFixture().scope
  if (key.startsWith('runtime')) { scope.runtimeInstanceId = 'other'; scope.runtimeInstanceKey = 'other' }
  else scope[key] = 'other'
  expect(read({ scope })).toBeNull()
})
it.each([{ loading: true }, { error: { status: 503 } }, { stateVersion: 'other' }, { response: undefined }])('withholds old or failed reads %j', args => expect(read({}, args)).toBeNull())
it.each([{ completeness: 'PARTIAL' }, { inventoryHash: 'invalid' }, { readAt: 'invalid' }, { currency: 'CURRENT' },
  { evidence: { expectedCount: 853, readCount: 150 } }, { sources: { expectedCount: 0, readCount: 0, records: evidenceInventoryFixture().sources.records } },
  { sectionMapping: { basis: 'STORED_SECTION_REFERENCES', state: 'REFERENCES_RESOLVED', sectionCount: 1, unresolvedReferenceCount: 1 } },
  { sources: { expectedCount: 2, readCount: 2, records: [...evidenceInventoryFixture().sources.records, ...evidenceInventoryFixture().sources.records] } },
  { readReceipt: { ...evidenceInventoryFixture().readReceipt, maxTimeMS: 6000 } }])('rejects incoherent receipt %j', value => expect(read(value)).toBeNull())
it('distinguishes proved empty inventory from missing and loading', () => {
  const empty = read({ evidence: { expectedCount: 0, readCount: 0 }, sources: { expectedCount: 0, readCount: 0, records: [] },
    sectionMapping: { basis: 'STORED_SECTION_REFERENCES', state: 'REFERENCES_RESOLVED', sectionCount: 0, unresolvedReferenceCount: 0 } })
  expect(empty.evidence.readCount).toBe(0)
  expect(inventoryLabel(empty)).toBe('Complete current inventory')
  expect(inventoryLabel(null)).toBe('Unavailable')
  expect(inventoryLabel(null, true)).toBe('Loading…')
})
