import { lockBasisLabel } from './lockBasisModel.js'

export default function RecordedLockBasisDetails({ model, loading }) {
  const current = !loading && model?.available ? model : null
  return <section aria-label="Recorded lock basis" className="intelligence-hub__inventory-details">
    <h4>{lockBasisLabel(model, loading)}</h4>
    {current ? <>
      <dl className="intelligence-hub__report-basis">{[
        ['Recorded snapshot ID', current.snapshot.snapshotId], ['Recorded snapshot hash', current.snapshot.snapshotHash],
        ['Recorded lock time', current.lockedAt], ['Recorded actor', current.lockedBy || 'Unavailable'], ['Recorded lock version', current.lockVersion ?? 'Unavailable'],
        ['Snapshot contract', current.snapshot.contractVersion], ['Read state version', current.stateVersion], ['Read time', current.readAt],
        ['Recorded replay anchor', current.replay.anchor?.replayAnchorId || 'Unavailable'], ['Recorded replay hash', current.replay.anchor?.replayAnchorHash || 'Unavailable'],
        ...(current.frozenInventory ? [
          ['Frozen membership snapshot', current.frozenInventory.snapshotId], ['Frozen membership hash', current.frozenInventory.membershipHash],
          ['Frozen basis state version', current.frozenInventory.basisStateVersion], ['Frozen sources', current.frozenInventory.counts.sources],
          ['Frozen evidence objects', current.frozenInventory.counts.evidence], ['Frozen sections', current.frozenInventory.counts.sections],
        ] : []),
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p>{current.replay.available ? 'The recorded replay anchor matches this runtime and lock snapshot.' : 'A matching recorded replay anchor is unavailable.'} The original snapshot body and replay integrity have not been independently verified.</p>
    </> : <p role="status">{loading ? 'Loading the scoped lock basis…' : model?.reason === 'LOCK_NOT_RECORDED'
      ? 'No lock basis is recorded for this selected revision. This does not grant acquisition or revision authority.'
      : 'The current scoped lock basis is unavailable or inconsistent. Refresh this view to retry.'}</p>}
    {current?.frozenInventory ? <p>Native frozen membership and source/evidence versions were verified against the persisted receipt. This does not grant post-lock intake or impact authority, establish source authenticity, validate claims or readiness, or approve an output.</p>
      : <p>Frozen source membership and exact evidence versions are unavailable. Current inventory and graph records do not establish frozen membership or post-lock impact.</p>}
  </section>
}
