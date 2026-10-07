import { inventoryExplanation } from './evidenceInventoryModel.js'

export default function EvidenceInventoryDetails({ inventory }) {
  if (!inventory) return <p>Current inventory receipt unavailable. Refresh to retry.</p>
  return <div className="intelligence-hub__inventory-details">
    <p>{inventoryExplanation(inventory)}</p>
    <dl><div><dt>Inventory hash</dt><dd>{inventory.inventoryHash}</dd></div>
      <div><dt>Exact revision</dt><dd>{inventory.scope.runtimeInstanceKey}</dd></div>
      <div><dt>State version</dt><dd>{inventory.stateVersion}</dd></div>
      <div><dt>Read time</dt><dd>{inventory.readAt}</dd></div>
      <div><dt>Contract</dt><dd>{inventory.upstreamContractVersion}</dd></div></dl>
    <p>Source inventory · {inventory.sources.readCount} records</p>
    <ul>{inventory.sources.records.map(record => <li key={record.sourceId}>{record.sourceId} · {record.recordHash}</li>)}</ul>
  </div>
}
