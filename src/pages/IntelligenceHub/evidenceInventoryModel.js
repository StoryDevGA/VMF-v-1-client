const count = value => Number.isSafeInteger(value) && value >= 0
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const identity = value => typeof value === 'string' && value.length > 0 && value.length <= 240
  && value.trim() === value && !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)

export function readEvidenceInventory({ response, scope, stateVersion, loading, error }) {
  const value = response?.data || response
  if (loading || error || !stateVersion || value?.contractVersion !== 'intelligence-evidence-inventory.v1'
    || value.upstreamContractVersion !== 'outcome-evidence-inventory.v1'
    || value.currency !== 'AS_READ' || value.stateVersion !== stateVersion
    || value.scope?.customerId !== scope.customerId || value.scope?.tenantId !== scope.tenantId
    || ![value.scope?.runtimeInstanceId, value.scope?.runtimeInstanceKey].includes(scope.runtimeInstanceId)
    || value.basis !== 'CURRENT_STORED_INVENTORY' || value.completeness !== 'COMPLETE'
    || !hash(value.inventoryHash) || !Number.isFinite(Date.parse(value.readAt))) return null
  const receipt = value.readReceipt
  if (receipt?.bounded !== true || receipt.fullLegacyFrameworkStateFetched !== false
    || receipt.inventoryPageSize !== 150 || receipt.maxTimeMS !== 2000 || receipt.requestTimeoutMS !== 6000
    || receipt.workTimeoutMS !== 5500 || receipt.cleanupReserveMS !== 500
    || receipt.maxSerializedReadBytes !== 512 * 1024) return null
  for (const family of [value.evidence, value.sources]) {
    if (!count(family?.expectedCount) || !count(family.readCount) || family.expectedCount !== family.readCount) return null
  }
  const records = value.sources.records
  const mapping = value.sectionMapping
  if (!Array.isArray(records) || records.length !== value.sources.readCount
    || records.some(record => !identity(record?.sourceId) || !hash(record.recordHash))
    || new Set(records.map(record => record.sourceId)).size !== records.length
    || mapping?.basis !== 'STORED_SECTION_REFERENCES'
    || !['REFERENCES_RESOLVED', 'UNRESOLVED'].includes(mapping.state)
    || !count(mapping.sectionCount) || !count(mapping.unresolvedReferenceCount)
    || (mapping.state === 'REFERENCES_RESOLVED') !== (mapping.unresolvedReferenceCount === 0)) return null
  return value
}

export const inventoryLabel = (inventory, loading = false) => loading ? 'Loading…' : inventory ? 'Complete current inventory' : 'Unavailable'
export const inventoryExplanation = (inventory, loading = false) => loading
  ? 'Reading the current evidence inventory…'
  : !inventory ? 'Current inventory receipt unavailable. Refresh this view to verify the selected revision.'
    : `${inventory.evidence.readCount} of ${inventory.evidence.expectedCount} expected evidence records and ${inventory.sources.readCount} of ${inventory.sources.expectedCount} expected sources read. ${inventory.sectionMapping.state === 'UNRESOLVED'
      ? `${inventory.sectionMapping.unresolvedReferenceCount} stored references could not be resolved; mapping remains unassessed.`
      : 'Stored section references resolve within this inventory.'} Inventory completeness does not establish frozen membership, interpretation, target sufficiency or human approval.`
