import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectCurrentUser } from '../../store/slices/authSlice.js'
import { useLazyGetRuntimeOutcomeAssetQuery } from '../../store/api/runtimeInstanceApi.js'
import { useLazyGetOutcomeSuccessorPreflightQuery, useConfirmOutcomeSuccessorMutation, useCreateOutcomeSuccessorMutation,
  useLazyGetOutcomeSuccessorByKeyQuery, useLazyGetOutcomeSuccessorOperationQuery, useLazyGetOutcomeSuccessorCompareQuery,
  useReconcileOutcomeSuccessorMutation } from '../../store/api/outcomeSuccessorApi.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { renderSafeMarkdown } from '../../utils/safeMarkdown.jsx'
import { Dialog } from '../../components/Dialog'
import { Select } from '../../components/Select'
import { Button } from '../../components/Button'
import { Status } from '../../components/Status'
import { TabView } from '../../components/TabView'
import { createOutcomeSuccessorIntent, outcomeSuccessorIntentKey, readOutcomeSuccessorIntent, writeOutcomeSuccessorIntent } from './outcomeSuccessorIntent.js'

const dataOf = (response) => response?.data ?? response
const versionId = (version) => String(version?.outcomeAssetVersionId ?? version?.id ?? '')
const messageOf = (error) => error?.data?.error?.message ?? error?.data?.message ?? error?.message ?? 'The saved action could not be verified. Check its result before proceeding.'
const ready = (data) => data?.status === 'READY_FOR_CONFIRMATION' && data.readiness?.canExecute === true
const draftSaved = (operation) => operation?.status === 'SUCCEEDED' && Boolean(operation.result?.draftId && operation.result?.draftIterationId)
const operationLabel = (operation) => ({ PREPARING: 'Preparing', READY_TO_GENERATE: 'Ready to generate', GENERATING: 'Generating',
  BLOCKED: 'Blocked', RECOVERY_REQUIRED: 'Recovery required', SUCCEEDED: draftSaved(operation) ? 'Working Draft saved' : 'Saved receipt incomplete' })[operation?.status] ?? 'Saved result unverified'
const EvidenceSnapshotDetails = ({ snapshot }) => <section aria-label="Recorded evidence snapshot">
  <h4>Recorded evidence snapshot</h4>
  {snapshot?.status === 'AVAILABLE' ? <dl>{[
    ['Published truth snapshot', 'publishSnapshotId', 'publishSnapshotHash'],
    ['Locked truth snapshot', 'lockSnapshotId', 'lockSnapshotHash'],
    ['Evidence replay anchor', 'replayAnchorId', 'replayAnchorHash'],
  ].map(([label, id, hash]) => <div key={id}><dt>{label}</dt><dd>{snapshot[id] || 'Not recorded'}</dd><dd>{snapshot[hash] || 'Hash not recorded'}</dd></div>)}</dl> : <p>Evidence snapshot identity unavailable. This does not establish accepted evidence readiness.</p>}
  {snapshot?.inventoryReceipt ? snapshot.inventoryReceipt.status === 'AVAILABLE'
    ? <dl><dt>Recorded evidence inventory</dt><dd>{snapshot.inventoryReceipt.completeness} · {snapshot.inventoryReceipt.totalEvidenceCount} evidence · {snapshot.inventoryReceipt.totalSourceCount} sources</dd><dt>Evidence inventory hash</dt><dd>{snapshot.inventoryReceipt.overallHash}</dd></dl>
    : <p>Evidence inventory receipt unavailable. Snapshot identity alone does not establish required-section support.</p> : null}
</section>

export default function DuplicateOutcomeDialog({ asset, scope, onClose, onSaved }) {
  const navigate = useNavigate()
  const user = useSelector(selectCurrentUser)
  const actorId = String(user?.id ?? user?._id ?? '')
  const revision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const apiScope = useMemo(() => ({ ...scope, runtimeInstanceId: String(asset.runtimeInstanceId || scope.runtimeInstanceId),
    outcomeAssetId: String(asset.outcomeAssetId || asset.id || '') }), [scope, asset])
  const fence = `${actorId}:${apiScope.customerId}:${apiScope.tenantId}:${apiScope.runtimeInstanceId}:${apiScope.outcomeAssetId}:${revision}`
  const fenceRef = useRef(fence)
  fenceRef.current = fence
  const sequence = useRef(0)
  const busyRef = useRef(false)
  const savedNotified = useRef('')
  const [loadAsset] = useLazyGetRuntimeOutcomeAssetQuery()
  const [loadPreflight] = useLazyGetOutcomeSuccessorPreflightQuery()
  const [confirm] = useConfirmOutcomeSuccessorMutation()
  const [create] = useCreateOutcomeSuccessorMutation()
  const [readByKey] = useLazyGetOutcomeSuccessorByKeyQuery()
  const [readOperation] = useLazyGetOutcomeSuccessorOperationQuery()
  const [loadCompare] = useLazyGetOutcomeSuccessorCompareQuery()
  const [reconcile] = useReconcileOutcomeSuccessorMutation()
  const [intent, setIntent] = useState(null)
  const intentRef = useRef(null)
  const [versions, setVersions] = useState([])
  const [preflight, setPreflight] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [operation, setOperation] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [comparisonTab, setComparisonTab] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [recovered, setRecovered] = useState(false)

  const storageKey = () => outcomeSuccessorIntentKey({ ...apiScope, actorId })
  const saveIntent = (value) => {
    const saved = writeOutcomeSuccessorIntent(window.sessionStorage, storageKey(), value)
    intentRef.current = saved; setIntent(saved)
    return saved
  }
  const assertSelection = (data, selected) => {
    if (data?.source?.outcomeAssetId !== apiScope.outcomeAssetId
      || data?.source?.outcomeAssetVersionId !== selected.outcomeAssetVersionId
      || data?.source?.runtimeInstanceId !== apiScope.runtimeInstanceId
      || data?.target?.runtimeInstanceId !== selected.targetRuntimeInstanceId) {
      throw new Error('The returned source or target does not match this saved action. Refresh its result before proceeding.')
    }
  }
  const run = async (work) => {
    if (busyRef.current) return
    const token = ++sequence.current
    const activeFence = fenceRef.current
    const current = () => token === sequence.current && activeFence === fenceRef.current
    busyRef.current = true; setBusy(true); setError('')
    try { await work(current) } catch (failure) { if (current()) setError(messageOf(failure)) }
    finally { if (current()) { busyRef.current = false; setBusy(false) } }
  }
  const fetchPreflight = async (selected, current) => {
    const data = dataOf(await loadPreflight({ ...apiScope, outcomeAssetVersionId: selected.outcomeAssetVersionId,
      targetRuntimeInstanceId: selected.targetRuntimeInstanceId }).unwrap())
    if (!current()) return
    assertSelection(data, selected); setPreflight(data)
  }

  useEffect(() => {
    sequence.current += 1; busyRef.current = false
    setIntent(null); intentRef.current = null; setReceipt(null); setOperation(null); setComparison(null); setPreflight(null)
    setError(''); setNotice(''); savedNotified.current = ''
    run(async (current) => {
      if (!actorId) throw new Error('The signed-in source scope could not be verified.')
      const detail = dataOf(await loadAsset(apiScope).unwrap())
      if (!current()) return
      const list = detail?.versions
      if (!Array.isArray(list)) throw new Error('The preserved asset version list could not be verified.')
      setVersions(list)
      const previous = readOutcomeSuccessorIntent(window.sessionStorage, storageKey())
      const selectedVersion = previous?.outcomeAssetVersionId || String(detail.currentVersionId || asset.currentVersionId || '')
      if (!selectedVersion || !list.some((item) => versionId(item) === selectedVersion)) throw new Error('The selected source version could not be verified in the preserved asset history.')
      const selected = saveIntent(previous || createOutcomeSuccessorIntent({ outcomeAssetVersionId: selectedVersion, targetRuntimeInstanceId: apiScope.runtimeInstanceId }))
      setRecovered(Boolean(previous)); setNotice(previous ? 'Saved action restored. Check its recorded result before starting another action.' : '')
      await fetchPreflight(selected, current)
    })
    return () => { sequence.current += 1; busyRef.current = false }
    // The fence owns this operation; changing a token or scope invalidates every pending response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fence])

  const select = (changes) => run(async (current) => {
    if (intentRef.current?.submitted) return
    const selected = saveIntent(createOutcomeSuccessorIntent({ ...intentRef.current, ...changes }))
    setReceipt(null); setOperation(null); setComparison(null); setPreflight(null); setNotice(''); setRecovered(false)
    await fetchPreflight(selected, current)
  })
  const prepareConfirmation = () => run(async (current) => {
    const selected = intentRef.current
    if (!selected || selected.submitted || !ready(preflight)) return
    const data = dataOf(await confirm({ ...apiScope, outcomeAssetVersionId: selected.outcomeAssetVersionId,
      body: { targetRuntimeInstanceId: selected.targetRuntimeInstanceId, idempotencyKey: selected.idempotencyKey } }).unwrap())
    if (!current()) return
    assertSelection(data, selected)
    if (!ready(data) || data.idempotencyKey !== selected.idempotencyKey || !data.confirmation?.receipt) throw new Error('A current explicit confirmation could not be verified.')
    setPreflight(data); setReceipt(data.confirmation.receipt)
  })
  const acceptOperation = async (data, selected, current) => {
    if (!current()) return
    if (data?.status === 'NOT_RECORDED') {
      saveIntent({ ...selected, submitted: false, operationId: undefined }); setOperation(null); setReceipt(null); setComparison(null)
      setNotice('No operation is recorded for this action. Review the confirmation before explicitly starting it.'); return
    }
    assertSelection(data, selected)
    if (!data.operationId) throw new Error('The recorded operation identity could not be verified.')
    saveIntent({ ...selected, submitted: true, operationId: data.operationId }); setOperation(data); setReceipt(null)
    if (!draftSaved(data)) { setComparison(null); return }
    const compared = dataOf(await loadCompare({ ...apiScope, operationId: data.operationId }).unwrap())
    if (!current()) return
    if (compared?.compareAvailable !== true
      || compared.from?.identity?.outcomeAssetVersionId !== selected.outcomeAssetVersionId
      || compared.from?.identity?.runtimeInstanceId !== apiScope.runtimeInstanceId
      || compared.to?.identity?.runtimeInstanceId !== selected.targetRuntimeInstanceId
      || compared.to?.identity?.draftId !== data.result.draftId
      || compared.to?.identity?.draftIterationId !== data.result.draftIterationId) throw new Error('The saved content comparison could not be verified.')
    setComparison(compared)
    if (savedNotified.current !== data.operationId) { savedNotified.current = data.operationId; onSaved?.(data) }
  }
  const createDuplicate = () => run(async (current) => {
    const selected = intentRef.current
    if (!selected || selected.submitted || !receipt || !ready(preflight)) return
    saveIntent({ ...selected, submitted: true })
    setNotice('The action is submitted. A lost response requires checking the saved result with this same action identity.')
    const data = dataOf(await create({ ...apiScope, outcomeAssetVersionId: selected.outcomeAssetVersionId,
      body: { confirm: true, targetRuntimeInstanceId: selected.targetRuntimeInstanceId,
        idempotencyKey: selected.idempotencyKey, confirmationReceipt: receipt } }).unwrap())
    await acceptOperation(data, selected, current)
  })
  const checkSavedResult = () => run(async (current) => {
    const selected = intentRef.current
    if (!selected) return
    const data = dataOf(await (selected.operationId
      ? readOperation({ ...apiScope, operationId: selected.operationId })
      : readByKey({ ...apiScope, outcomeAssetVersionId: selected.outcomeAssetVersionId,
        targetRuntimeInstanceId: selected.targetRuntimeInstanceId, idempotencyKey: selected.idempotencyKey })).unwrap())
    await acceptOperation(data, selected, current)
  })
  const recoverSavedResult = () => run(async (current) => {
    const selected = intentRef.current
    if (!selected?.operationId) return
    const data = dataOf(await reconcile({ ...apiScope, operationId: selected.operationId,
      targetRuntimeInstanceId: selected.targetRuntimeInstanceId }).unwrap())
    await acceptOperation(data, selected, current)
  })
  const target = operation?.target || preflight?.target
  const source = operation?.source || preflight?.source
  const targets = [preflight?.source, ...(preflight?.targets || [])].filter(Boolean)
  const targetOptions = targets.filter((item, index) => targets.findIndex((other) => other.runtimeInstanceId === item.runtimeInstanceId) === index)
    .map((item) => ({ value: item.runtimeInstanceId, label: `Runtime revision ${item.revisionNumber}${item.runtimeInstanceId === preflight.source.runtimeInstanceId ? ' — preserve current revision' : ''}${item.eligible === false ? ' — unavailable' : ''}`, disabled: item.eligible === false }))
  const targetPath = target && draftSaved(operation) ? `/app/runtime/${encodeURIComponent(target.runtimeInstanceKey || target.runtimeInstanceId)}/outcome-studio?${new URLSearchParams({ customerId: apiScope.customerId, tenantId: apiScope.tenantId, sessionId: operation.request?.sessionId || '' })}` : null

  return <Dialog open onClose={onClose} size="xl" aria-labelledby="duplicate-outcome-title">
    <Dialog.Header><h2 id="duplicate-outcome-title">Duplicate as Working Draft — Preserve this version</h2></Dialog.Header>
    <Dialog.Body>
      <p>The selected version stays unchanged. This action recomposes accepted target evidence with fresh validation. Approval remains separate.</p>
      {notice ? <p role="status">{notice}</p> : null}
      {error ? <Status variant="error" showIcon>{error}</Status> : null}
      <div className="outcome-studio-workspace__successor-revisions">
        <Select label="Preserved source version" value={intent?.outcomeAssetVersionId || ''} disabled={busy || intent?.submitted}
          options={versions.map((item) => ({ value: versionId(item), label: `Version ${item.versionNumber} — ${item.status || 'Recorded'}` }))}
          onChange={(event) => select({ outcomeAssetVersionId: event.target.value, targetRuntimeInstanceId: apiScope.runtimeInstanceId })} />
        <Select label="Target Runtime revision" value={intent?.targetRuntimeInstanceId || ''} disabled={busy || intent?.submitted}
          options={targetOptions} onChange={(event) => select({ targetRuntimeInstanceId: event.target.value })}
          helperText="Keep the source revision, or explicitly choose a newer revision in the same Framework and package lineage." />
      </div>
      {source && target ? <div className="outcome-studio-workspace__successor-revisions" aria-label="Source and target revisions before confirmation">
        <section><h3>Preserved source</h3><p>Version {source.versionNumber} · Runtime revision {source.revisionNumber}</p><p>{source.frameworkKey} · {source.packageKey} · {source.packageVersion}</p><EvidenceSnapshotDetails snapshot={source.evidenceSnapshot || preflight?.source?.evidenceSnapshot} /></section>
        <section><h3>Selected target</h3><p>Runtime revision {target.revisionNumber}</p><p>{target.frameworkKey} · {target.packageKey} · {target.packageVersion}</p><EvidenceSnapshotDetails snapshot={target.evidenceSnapshot || preflight?.target?.evidenceSnapshot} /></section>
      </div> : null}
      {preflight?.carryForward ? <section aria-label="Preserved request contract"><h3>Preserved request and presentation</h3><p>{preflight.carryForward.originalRequest}</p><p>Output: {preflight.carryForward.outputType?.label || preflight.carryForward.outputType?.key || 'Unavailable'}</p><p>Structure: {preflight.carryForward.outputSchema?.label || preflight.carryForward.outputSchema?.key || 'Unavailable'}</p><p>Style: {preflight.carryForward.style?.label || preflight.carryForward.style?.key || 'Unavailable'}</p></section> : null}
      {preflight && !ready(preflight) ? <Status variant="warning" showIcon>{preflight.blocker?.message || 'The selected target is not ready for this governed duplicate.'}</Status> : null}
      {operation ? <section aria-label="Saved successor result"><h3>{operationLabel(operation)}</h3>{operation.blocker?.message ? <p>{operation.blocker.message}</p> : null}{!draftSaved(operation) ? <p>No completed governed Working Draft is claimed by this receipt.</p> : <p>The saved Working Draft has fresh governed receipts. Review its content and lineage before separate approval.</p>}</section> : null}
      {comparison ? <TabView activeTab={comparisonTab} onTabChange={setComparisonTab} aria-label="Successor comparison views">
        <TabView.Tab label="Content"><div className="outcome-studio-workspace__successor-revisions">{[['Preserved version', comparison.from], ['Governed Working Draft', comparison.to]].map(([label, content]) => <section key={label}><h3>{label}</h3>{content.markdown ? renderSafeMarkdown(content.markdown) : content.sections?.map((section) => <section key={section.key || section.label}><h4>{section.label}</h4><p>{section.body}</p></section>)}{content.warnings?.map((warning) => <p key={warning}>{warning}</p>)}{content.limitations?.map((limitation) => <p key={limitation}>{limitation}</p>)}</section>)}</div></TabView.Tab>
        <TabView.Tab label="Governance"><p>Source Runtime revision {source?.revisionNumber} → target Runtime revision {target?.revisionNumber}</p>{comparison.governance?.changes?.length ? <dl>{comparison.governance.changes.map((change) => <div key={change.field}><dt>{change.field}</dt><dd>{String(change.from ?? 'Not recorded')} → {String(change.to ?? 'Not recorded')}</dd></div>)}</dl> : <p>No recorded lineage changes.</p>}</TabView.Tab>
      </TabView> : null}
    </Dialog.Body>
    <Dialog.Footer>
      <Button variant="outline" onClick={onClose}>Close</Button>
      {intent?.submitted || recovered ? <Button variant="outline" disabled={busy || !intent} onClick={checkSavedResult}>Check saved result</Button> : null}
      {operation?.status === 'RECOVERY_REQUIRED' && operation.recovery?.canCheckSavedWork === true && operation.links?.reconcile ? <Button variant="outline" disabled={busy} onClick={recoverSavedResult}>Recover saved result</Button> : null}
      {!intent?.submitted ? <Button disabled={busy || !ready(preflight) || !intent} loading={busy} onClick={receipt ? createDuplicate : prepareConfirmation}>{receipt ? 'Confirm duplicate' : 'Review duplicate'}</Button> : null}
      {targetPath ? <Button onClick={() => navigate(targetPath)} variant="outline">Open target Working Draft</Button> : null}
    </Dialog.Footer>
  </Dialog>
}
