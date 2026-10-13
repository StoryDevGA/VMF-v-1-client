import { selectAcquisitionAction } from '../../utils/discoveryAcquisition.js'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiLock, FiPlus } from 'react-icons/fi'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { DISCOVERY_ACQUISITION_PROFILE_OPTIONS, DISCOVERY_ACQUISITION_PROFILE_GUIDANCE } from '../../constants/discoveryAcquisitionProfiles.js'
import { buildEmptyDiscoveryDraftInputs, normalizeWebsiteSourceDrafts, buildDiscoveryInputsPayload, buildDiscoveryContextReadiness, buildDiscoveryDocumentSource, DISCOVERY_DOCUMENT_ACCEPT, DISCOVERY_DOCUMENT_MAX_COUNT, DISCOVERY_WEBSITE_SOURCE_MAX_COUNT, DOCUMENT_EXTRACTION_HELPER_TEXT, DOCUMENT_EXTRACTION_STORAGE_NOTE, formatDocumentSize, formatIntelligenceHubEvidenceError } from '../../utils/discoveryAcquisition.js'
import { useExecuteRuntimeActionMutation, useUpdateRuntimeDiscoveryInputsMutation } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import AcquisitionRunHistory from './AcquisitionRunHistory.jsx'
import { sourceProcessingLabel, sourceProcessingExplanation } from './sourceSummaryModel.js'
import { acquisitionRunFromResponse, acquisitionRunFromError, acquisitionRunLabel } from './acquisitionRunContract.js'

const draftFrom = (discovery) => ({ ...buildEmptyDiscoveryDraftInputs(), ...discovery?.inputValues, websiteSources: normalizeWebsiteSourceDrafts(discovery?.inputValues || {}) })

export default function ContextAcquisitionView(props) {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const ownershipKey = JSON.stringify([props.contextKey, props.runtimeInstanceId, props.customerId, props.tenantId, sessionRevision])
  return <ScopedContextAcquisitionView key={ownershipKey} {...props} sessionRevision={sessionRevision} />
}

function ScopedContextAcquisitionView({ sessionRevision, discovery, renderer, authority, loading, locked, runtimeInstanceId, customerId, tenantId, contextKey, refresh, onSelectView, evidenceStatusCounts, countsLoading, sourceSummary, sourceSummaryLoading, active = true }) {
  const [execute] = useExecuteRuntimeActionMutation()
  const [updateInputs] = useUpdateRuntimeDiscoveryInputsMutation()
  const [draft, setDraft] = useState(() => draftFrom(discovery))
  const [editor, setEditor] = useState(null)
  const [websiteAddress, setWebsiteAddress] = useState('')
  const [inspection, setInspection] = useState(null)
  const briefHeader = useRef(null)
  const restoreEditorFocus = useRef(false)
  useEffect(() => { if (!editor && active && restoreEditorFocus.current) { briefHeader.current?.querySelector('button')?.focus(); restoreEditorFocus.current = false } }, [editor, active])
  const inspectionTrigger = useRef(null)
  const closeInspection = () => setInspection(null)
  const openInspection = (name, target) => { inspectionTrigger.current = target; setInspection(name) }
  useEffect(() => {
    if (!inspection && active && getSessionRevision() === sessionRevision) {
      const target = inspectionTrigger.current
      inspectionTrigger.current = null
      if (target?.isConnected) target.focus()
    }
  }, [inspection, active, sessionRevision])
  const [profile, setProfile] = useState(discovery?.acquisitionProfile || 'STANDARD')
  const [basis, setBasis] = useState(renderer?.runtimeInstance?.updatedAt)
  const [dirty, setDirty] = useState(false)
  const [documents, setDocuments] = useState([])
  const [preparing, setPreparing] = useState(false)
  const [fileError, setFileError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [pendingRequest, setPendingRequest] = useState(false)
  const [retryFrom, setRetryFrom] = useState(null)
  const request = useRef(null)
  const scope = { runtimeInstanceId, customerId, tenantId }
  const inFlight = useRef(false)
  const generation = useRef(0)
  const currentActive = useRef(active)
  currentActive.current = active
  const preparingRef = useRef(false)
  const preparation = useRef(0)
  const mounted = useRef(true)
  const isCurrent = () => mounted.current && getSessionRevision() === sessionRevision
  const fileInput = useRef(null)
  const status = useRef(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; inspectionTrigger.current = null; preparation.current += 1 } }, [contextKey])
  useEffect(() => {
    if (!active) {
      generation.current += 1; preparation.current += 1; setPreparing(false); setInspection(null); inspectionTrigger.current = null; setEditor(null); restoreEditorFocus.current = false
      if (preparingRef.current) {
        preparingRef.current = false; setFileError('Document preparation was cancelled when leaving Context. Clear the selection and choose files again.'); if (fileInput.current) fileInput.current.value = ''
      }
    }
  }, [active])
  const stamp = renderer?.runtimeInstance?.updatedAt
  const briefAvailable = Boolean(discovery?.inputValues && typeof discovery.inputValues === 'object' && !Array.isArray(discovery.inputValues))
  useEffect(() => {
    if (!dirty && briefAvailable && !busy) {
      setDraft(draftFrom(discovery)); setProfile(discovery?.acquisitionProfile || 'STANDARD'); setBasis(stamp)
    }
  }, [stamp, briefAvailable, dirty, busy, discovery])
  const stale = basis !== stamp
  const action = selectAcquisitionAction(renderer, discovery)
  const editable = Boolean(briefAvailable && authority?.canAcquire === true && !locked && !loading && active)
  const readiness = buildDiscoveryContextReadiness(draft)
  const documentAttempt = discovery?.acquisition?.documentAcquisition?.latestAttempt
  const websiteAttempt = discovery?.acquisition?.websiteAcquisition
  const websiteCounts = websiteAttempt
    && [websiteAttempt.sourceCount, websiteAttempt.acquiredSourceCount, websiteAttempt.failedSourceCount]
      .every(count => Number.isSafeInteger(count) && count >= 0 && count <= DISCOVERY_WEBSITE_SOURCE_MAX_COUNT)
    && websiteAttempt.sourceCount > 0
    && websiteAttempt.sourceCount === websiteAttempt.acquiredSourceCount + websiteAttempt.failedSourceCount
    && (websiteAttempt.status === 'ACQUIRED' && websiteAttempt.acquiredSourceCount > 0 && websiteAttempt.failedSourceCount === 0
      || websiteAttempt.status === 'PARTIAL' && websiteAttempt.acquiredSourceCount > 0 && websiteAttempt.failedSourceCount > 0
      || websiteAttempt.status === 'FAILED' && websiteAttempt.acquiredSourceCount === 0 && websiteAttempt.failedSourceCount > 0)
  const documentOutcomes = documentAttempt?.contractVersion === 'document-extraction-outcomes.v1'
    && Array.isArray(documentAttempt.items) && documentAttempt.items.length <= DISCOVERY_DOCUMENT_MAX_COUNT
    && new Set(documentAttempt.items.map(item => item?.inputIndex)).size === documentAttempt.items.length
    && documentAttempt.items.every(item => Number.isInteger(item?.inputIndex) && item.inputIndex >= 0
      && item.inputIndex < DISCOVERY_DOCUMENT_MAX_COUNT && ['SUCCEEDED', 'FAILED'].includes(item.status)
      && (item.status !== 'SUCCEEDED' || Number.isSafeInteger(item.evidenceObjectCount) && item.evidenceObjectCount >= 0))
    ? documentAttempt.items : null
  const websiteItems = websiteAttempt?.latestAttempt
  const websiteOutcomes = websiteCounts && websiteItems?.contractVersion === 'website-acquisition-outcomes.v1'
    && Array.isArray(websiteItems.items) && websiteItems.items.length === websiteAttempt.sourceCount
    && websiteItems.items.every((item, index) => item?.inputIndex === index && ['SUCCEEDED', 'FAILED'].includes(item.status)
      && typeof item.sourceId === 'string' && item.sourceId.length > 0 && item.sourceId.length <= 160
      && Number.isSafeInteger(item.evidenceObjectCount) && item.evidenceObjectCount >= 0
      && typeof item.retainedPrior === 'boolean'
      && (item.status !== 'FAILED' || item.evidenceObjectCount === 0 && item.reason === 'WEBSITE_ACQUISITION_FAILED')
      && (!item.retainedPrior || item.status === 'FAILED' && Number.isSafeInteger(item.retainedEvidenceObjectCount) && item.retainedEvidenceObjectCount >= 0))
    && websiteItems.items.filter(item => item.status === 'SUCCEEDED').length === websiteAttempt.acquiredSourceCount
    && new Set(websiteItems.items.map(item => item.sourceId)).size === websiteItems.items.length
    ? websiteItems.items : null
  const reason = locked ? 'This revision is locked. Inspect its sources or use the normal revision workflow for new acquisition.'
    : !briefAvailable ? 'Brief details unavailable for this revision. Refresh or inspect the existing workspace.'
      : !editable ? 'Acquisition authority or current scoped data is unavailable. Refresh before editing.'
        : busy ? 'Acquisition is in progress.' : preparing ? 'Preparing selected documents…'
          : stale ? 'The revision changed. Discard local changes and load the current brief before acquiring.'
            : blocked ? 'Refresh and inspect the current sources before retrying acquisition.'
              : websiteAddress.trim() ? 'Stage or clear the website address before acquiring.'
                : fileError || (action && action.enabled !== true ? action.disabledReason || 'The delivered acquisition action is unavailable.' : readiness.reason)
  const controlsDisabled = !editable || busy || preparing || stale || blocked
  const change = (key, value) => { setDirty(true); setDraft(previous => ({ ...previous, [key]: value })) }
  const clearFiles = () => { preparation.current += 1; setDocuments([]); setFileError(''); if (fileInput.current) fileInput.current.value = '' }
  const chooseFiles = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length || !isCurrent() || !currentActive.current || controlsDisabled || inFlight.current || preparingRef.current) return
    const operation = ++preparation.current
    preparingRef.current = true; setPreparing(true); setFileError('')
    try {
      const prepared = [...documents]
      for (const file of files) {
        const document = await buildDiscoveryDocumentSource(file)
        if (!isCurrent() || preparation.current !== operation || !currentActive.current) return
        const duplicate = prepared.some(existing => existing.fileName === document.fileName
          && existing.mimeType === document.mimeType && existing.sizeBytes === document.sizeBytes
          && existing.contentBase64 === document.contentBase64)
        if (!duplicate) prepared.push(document)
        if (prepared.length > DISCOVERY_DOCUMENT_MAX_COUNT) throw new Error(`Select up to ${DISCOVERY_DOCUMENT_MAX_COUNT} documents per acquisition.`)
      }
      if (isCurrent() && preparation.current === operation) { setDocuments(prepared); setDirty(true) }
    } catch (error) {
      if (isCurrent() && preparation.current === operation) setFileError(error.message)
    } finally {
      if (isCurrent() && preparation.current === operation) { preparingRef.current = false; setPreparing(false); if (fileInput.current) fileInput.current.value = '' }
    }
  }
  const removeDocument = (index) => {
    if (!isCurrent() || controlsDisabled || preparingRef.current || inFlight.current) return
    setDocuments(previous => previous.filter((_, itemIndex) => itemIndex !== index))
    setFileError('')
    fileInput.current?.focus()
  }
  const refreshCurrent = async () => {
    if (!isCurrent() || inFlight.current || preparing) return
    const operationGeneration = generation.current
    setBusy(true)
    try {
      const refreshed = await refresh()
      if (!isCurrent()) return
      if (generation.current !== operationGeneration || !currentActive.current) {
        setBlocked(true); setFeedback({ message: 'Context changed while refreshing. Refresh current acquisition data again before continuing.' }); return
      }
      if (refreshed) { if (isCurrent()) { setBlocked(Boolean(request.current)); setFeedback({ message: request.current ? 'Current data refreshed. Check the original acquisition request before starting another operation.' : 'Current acquisition data refreshed. Inspect Sources before retrying a previous request.' }) } }
      else if (isCurrent()) setFeedback({ error: true, message: 'Current acquisition data could not be verified. Try Refresh again.' })
    } finally { if (isCurrent()) setBusy(false) }
  }
  const submitRequest = async (operation) => {
    if (!isCurrent() || !operation || inFlight.current) return
    const operationGeneration = generation.current
    inFlight.current = true; setBusy(true); setBlocked(true)
    setFeedback({ message: 'Acquiring evidence through the existing governed service…' })
    status.current?.focus()
    try {
      const response = operation.actionKey
        ? await execute({ ...scope, actionKey: operation.actionKey, body: operation.body }).unwrap()
        : await updateInputs({ runtimeInstanceId, body: operation.body }).unwrap()
      const receipt = acquisitionRunFromResponse(response, scope, operation.body.requestKey)
      if (!receipt || !['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED'].includes(receipt.status)) {
        if (isCurrent()) setFeedback({ error: true, message: 'Acquisition response has no verified scoped terminal receipt. Check the original request or inspect Run history before continuing.' })
        return
      }
      request.current = null
      if (isCurrent()) { setPendingRequest(false); setRetryFrom(['FAILED', 'PARTIALLY_SUCCEEDED'].includes(receipt.status) ? receipt.runId : null) }
      if (!isCurrent()) return
      if (generation.current !== operationGeneration || !currentActive.current) {
        setFeedback({ message: 'Acquisition request completed after leaving Context. Refresh and inspect current sources before continuing.' }); return
      }
      if (receipt.canonicalSaved) { clearFiles(); setDirty(false) }
      const refreshed = await refresh()
      if (isCurrent()) {
        if (generation.current !== operationGeneration || !currentActive.current) {
          setFeedback({ message: 'Acquisition completed while Context changed. Refresh and inspect current sources before continuing.' }); return
        }
        setBlocked(!refreshed)
        setFeedback({ error: !refreshed || receipt.status === 'FAILED', message: `${acquisitionRunLabel(receipt)}. ${receipt.canonicalSaved ? refreshed ? 'Acquisition recorded. Inspect Sources and review the resulting evidence. No evidence was accepted by this action.' : 'Acquisition recorded, but current reads could not be verified. Refresh before continuing.' : 'This operation did not save the revision. Inspect its Run before preparing an explicit retry.'}` })
      }
    } catch (error) {
      const receipt = acquisitionRunFromError(error, scope, operation.body.requestKey)
      if (receipt && ['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED'].includes(receipt.status)) {
        request.current = null
        if (isCurrent()) { setPendingRequest(false); setRetryFrom(['FAILED', 'PARTIALLY_SUCCEEDED'].includes(receipt.status) ? receipt.runId : null) }
      }
      if (isCurrent()) setFeedback({ error: true, message: `${formatIntelligenceHubEvidenceError(error)} ${receipt ? `${acquisitionRunLabel(receipt)}.` : 'Execution outcome is unconfirmed. Check the original request before starting another operation.'} Refresh and inspect Sources before retrying; selected documents remain staged locally.` })
    } finally { inFlight.current = false; if (isCurrent()) setBusy(false) }
  }
  const acquire = async event => {
    event.preventDefault()
    if (reason || inFlight.current || request.current || !['STANDARD', 'ENHANCED'].includes(profile)) return
    const operation = { actionKey: action ? String(action.governedAction || action.actionKey).trim().toUpperCase() : null,
      body: { inputs: buildDiscoveryInputsPayload(draft), acquisitionProfile: profile, expectedUpdatedAt: authority.runtimeUpdatedAt,
        requestKey: crypto.randomUUID(), ...(retryFrom ? { predecessorRunId: retryFrom } : {}),
        ...(documents.length ? { documentSources: documents } : {}) } }
    request.current = operation; setPendingRequest(true)
    await submitRequest(operation)
  }
  const startEditing = () => { restoreEditorFocus.current = true; setEditor({ companyName: draft.companyName, marketRegion: draft.marketRegion, targetOffer: draft.targetOffer, notes: draft.notes, profile, dirty, websiteSources: [...draft.websiteSources] }) }
  const cancelEditing = () => {
    if (!editor) return
    const { profile: previousProfile, dirty: previousDirty, websiteSources: previousWebsites, ...fields } = editor
    setDraft(previous => ({ ...previous, ...fields })); setProfile(previousProfile)
    setDirty(previousDirty || documents.length > 0 || JSON.stringify(previousWebsites) !== JSON.stringify(draft.websiteSources)); setEditor(null)
  }
  const validWebsite = (() => { try { const url = new URL(websiteAddress.trim()); return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname) } catch { return false } })()
  const stageWebsite = () => {
    if (controlsDisabled || !validWebsite || draft.websiteSources.filter(Boolean).length >= DISCOVERY_WEBSITE_SOURCE_MAX_COUNT) return
    change('websiteSources', [...draft.websiteSources.filter(Boolean), websiteAddress.trim()]); setWebsiteAddress('')
  }
  return <form className="intelligence-hub__context-workspace intelligence-hub__acquisition" onSubmit={acquire}>
    <div className="intelligence-hub__context-boundary"><FiLock size={16} aria-hidden="true" /><span>{locked ? 'This revision is locked. Gather new evidence through an authorised successor revision.' : 'Gather evidence for this revision. Accepted understanding remains separate.'}</span><Button size="sm" variant="outline" onClick={event => openInspection('Publication and lock record', event.currentTarget)}>Why separate?<FiArrowUpRight size={14} aria-hidden="true" /></Button></div>
    <section className="intelligence-hub__context-brief">
      <header ref={briefHeader}><h2>Evidence gathering brief</h2>{!editor ? <Button size="sm" variant="outline" aria-label="Edit evidence gathering brief" disabled={!briefAvailable || controlsDisabled} onClick={startEditing}>Edit</Button> : null}</header>
      {briefAvailable ? <>{!editor ? <dl className="intelligence-hub__context-brief-values">
        {[['companyName', 'Company name'], ['marketRegion', 'Market / region'], ['targetOffer', 'Product or service']].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{draft[key]?.trim() || 'Missing'}</dd></div>)}
        <div><dt>Evidence gathering level</dt><dd>{profile === 'STANDARD' ? 'Standard' : profile === 'ENHANCED' ? 'Enhanced' : 'Unavailable'}</dd></div>
      </dl> : <div className="intelligence-hub__brief-editor">
        {[['companyName', 'Company name', 255], ['marketRegion', 'Market / region', 255], ['targetOffer', 'Product or service', 500]].map(([key,label,limit]) => <div key={key} className="intelligence-hub__brief-field"><label htmlFor={`context-${key}`}>{label}</label><Input id={`context-${key}`} size="sm" fullWidth maxLength={limit} value={draft[key] || ''} disabled={controlsDisabled} onChange={event => change(key,event.target.value)} /></div>)}
        <Select size="sm" label="Evidence gathering level" options={DISCOVERY_ACQUISITION_PROFILE_OPTIONS.map(option => ({...option,label:option.value === 'STANDARD' ? 'Standard' : option.value === 'ENHANCED' ? 'Enhanced' : 'Strategic · Coming soon'}))} value={profile} disabled={controlsDisabled} onChange={event => {setDirty(true);setProfile(event.target.value)}} />
        <div className="intelligence-hub__brief-notes"><label htmlFor="context-notes">Additional notes or instructions (optional)</label><Textarea id="context-notes" rows={3} size="sm" fullWidth maxLength={4000} value={draft.notes || ''} disabled={controlsDisabled} onChange={event => change('notes', event.target.value)} /></div>
        <p>{DISCOVERY_ACQUISITION_PROFILE_GUIDANCE[profile]?.summary} Apply stages this brief locally; it is saved when acquisition is submitted.</p>
        <div className="intelligence-hub__context-controls"><Button size="sm" variant="outline" disabled={controlsDisabled} onClick={() => setEditor(null)}>Apply brief</Button><Button size="sm" variant="outline" disabled={busy || preparing} onClick={cancelEditing}>Cancel</Button></div>
      </div>}{dirty ? <p>Brief edits are staged locally. Acquisition has not been submitted.</p> : null}</> : <p>Brief details unavailable for this revision.</p>}
    </section>
    <div className="intelligence-hub__context-intake">
      <section><h2>Websites</h2>
        <div className="intelligence-hub__website-stage"><Input type="url" aria-label="Website address" placeholder="https://example.com" size="sm" fullWidth maxLength={500} value={websiteAddress} disabled={controlsDisabled} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); stageWebsite() } }} onChange={event => setWebsiteAddress(event.target.value)} /><Button size="sm" variant="outline" aria-label="Stage website" disabled={controlsDisabled || !validWebsite || draft.websiteSources.filter(Boolean).length >= DISCOVERY_WEBSITE_SOURCE_MAX_COUNT} onClick={stageWebsite}><FiPlus size={16} aria-hidden="true" /></Button></div>
        <p>{dirty && draft.websiteSources.some(Boolean) ? `${draft.websiteSources.filter(Boolean).length} website addresses in the local brief.` : 'No websites staged.'}</p>
        <details className="intelligence-hub__context-disclosure"><summary>Connected websites</summary><p>Historical sources remain in Sources; editing the brief does not remove previously acquired evidence.</p>
        {briefAvailable ? <div className="intelligence-hub__acquisition-fields">{draft.websiteSources.map((url,index) => <div key={index} className="intelligence-hub__acquisition-url"><Input label={`Website URL ${index+1}`} size="sm" id={`context-url-${index}`} fullWidth maxLength={500} value={url} disabled={controlsDisabled} onChange={event => change('websiteSources',draft.websiteSources.map((value,i)=>i===index?event.target.value:value))} /><Button size="sm" variant="outline" disabled={controlsDisabled} aria-label={`Remove website URL ${index+1}`} onClick={() => change('websiteSources',draft.websiteSources.length===1?['']:draft.websiteSources.filter((_,i)=>i!==index))}>Remove</Button></div>)}<Button size="sm" variant="outline" disabled={controlsDisabled || draft.websiteSources.length>=DISCOVERY_WEBSITE_SOURCE_MAX_COUNT} onClick={() => change('websiteSources',[...draft.websiteSources,''])}>Add URL</Button></div> : <p>Website detail unavailable.</p>}
        <Button size="sm" variant="outline" onClick={()=>onSelectView('Sources')}>Inspect connected sources</Button>
        {websiteCounts ? <section aria-label="Latest website acquisition outcomes"><h3>Latest website acquisition</h3><p>{websiteAttempt.acquiredSourceCount} succeeded · {websiteAttempt.failedSourceCount} failed across {websiteAttempt.sourceCount} submitted websites.</p>{websiteOutcomes ? <ul>{websiteOutcomes.map(item=><li key={item.inputIndex}>Website {item.inputIndex+1}: {item.status==='SUCCEEDED'?`Succeeded · ${item.evidenceObjectCount} eligible evidence objects`:`Failed · ${item.retainedPrior?`Prior source retained with ${item.retainedEvidenceObjectCount} previous evidence objects.`:'Inspect the URL and retry.'}`}</li>)}</ul>:websiteItems?<p>Individual website outcomes unavailable.</p>:null}<p>These are the latest attempt’s outcomes. Inspect Sources for exact provenance; acquisition does not establish evidence sufficiency.</p></section>:websiteAttempt?<p>Latest website acquisition outcomes unavailable.</p>:null}</details>
      </section>
      <section><h2>Document batch</h2><p>{documents.length} of {DISCOVERY_DOCUMENT_MAX_COUNT} files staged</p>
        <input ref={fileInput} id="context-documents" className="sr-only" type="file" aria-label="Select documents (up to 5; 2.5 MB each, PPTX up to 40 MB)" multiple accept={DISCOVERY_DOCUMENT_ACCEPT} disabled={controlsDisabled} onChange={chooseFiles} />
        <Button size="sm" variant="outline" className="intelligence-hub__select-files" aria-label="Select evidence files" disabled={controlsDisabled} onClick={()=>fileInput.current?.click()}><FiPlus size={14} aria-hidden="true" />Select files</Button>
        {documents.length ? <ul className="intelligence-hub__staged-documents" aria-label="Selected acquisition documents">{documents.map((document,index)=><li key={index}><span>{document.fileName} · {formatDocumentSize(document.sizeBytes)} · Staged locally</span><Button size="sm" variant="outline" disabled={controlsDisabled} aria-label={`Remove staged document ${index+1}: ${document.fileName}`} onClick={()=>removeDocument(index)}>Remove</Button></li>)}</ul>:null}
        {fileError ? <p role="alert">{fileError}</p>:null}
        {documents.length || fileError ? <Button size="sm" variant="outline" disabled={busy || preparing} onClick={clearFiles}>Clear selected files</Button>:null}
        <details className="intelligence-hub__context-disclosure"><summary>File limits</summary><p>{DOCUMENT_EXTRACTION_HELPER_TEXT}</p><p>Up to 5 files; 2.5 MB each, PPTX up to 40 MB. Further selections add to this batch; identical files are included once.</p><p>{DOCUMENT_EXTRACTION_STORAGE_NOTE}</p>
        {documentOutcomes?<section aria-label="Latest document extraction outcomes"><h3>Latest document extraction</h3><p>Each result refers to an input in the latest attempt. Successful extraction does not establish evidence sufficiency.</p><ul>{documentOutcomes.map(item=><li key={item.inputIndex}>Input {item.inputIndex+1}: {item.status==='SUCCEEDED'?`Succeeded · ${item.evidenceObjectCount} eligible evidence objects`:'Failed · Choose a supported readable file and retry.'}</li>)}</ul></section>:documentAttempt?<p>Latest document extraction outcomes unavailable.</p>:null}</details>
      </section>
      <section><h2>Evidence continuity</h2><strong className="intelligence-hub__continuity-number">{countsLoading?'Loading…':evidenceStatusCounts?.accepted??'Unavailable'}</strong><p>Accepted evidence retained in the selected revision.</p><p>New evidence and interpretation stay separate from published understanding.</p>
        <Button size="sm" variant="outline" onClick={event=>openInspection('Evidence intake and processing history',event.currentTarget)}>Runs and processing history<FiArrowUpRight size={14} aria-hidden="true" /></Button>
      </section>
    </div>
    <div className="intelligence-hub__context-submit"><div ref={status} tabIndex={-1} role="status" className="intelligence-hub__decision-feedback">{feedback?.message || reason || 'Ready to acquire. Resulting evidence still requires human review.'}</div><Button size="sm" type="submit" disabled={Boolean(reason)||!['STANDARD','ENHANCED'].includes(profile)}>{busy?'Acquiring…':'Acquire new evidence'}<FiArrowRight size={14} aria-hidden="true" /></Button></div>
    {feedback?.error && reason ? <p>{reason}</p>:null}
    {(pendingRequest||blocked||stale||retryFrom||dirty||documents.length>0) ? <div className="intelligence-hub__context-controls">
      <Button size="sm" variant="outline" disabled={busy||preparing} onClick={refreshCurrent}>Refresh acquisition data</Button>
      {pendingRequest?<Button size="sm" variant="outline" disabled={busy||preparing||!active} onClick={()=>submitRequest(request.current)}>Check original acquisition request</Button>:null}
      {retryFrom?<p>Next acquisition explicitly retries Run {retryFrom} with a new request identity.</p>:null}
      <Button size="sm" variant="outline" disabled={busy||preparing||!dirty&&!documents.length} onClick={()=>{setDraft(draftFrom(discovery));setProfile(discovery?.acquisitionProfile||'STANDARD');setBasis(stamp);setDirty(false);clearFiles()}}>Discard local changes</Button>
    </div>:null}
    <footer className="intelligence-hub__context-footer"><Button size="sm" variant="outline" onClick={()=>onSelectView('Overview')}><FiArrowLeft size={14} aria-hidden="true" />Overview</Button><small>Navigation does not approve evidence or change the revision.</small><Button size="sm" variant="outline" onClick={()=>onSelectView('Sources')}>Sources<FiArrowRight size={14} aria-hidden="true" /></Button></footer>
    {inspection && active ? <Dialog open onClose={closeInspection} size="lg" className="intelligence-hub__inspection-dialog" aria-label={inspection||'Context inspection'}><Dialog.Header><h2>{inspection}</h2></Dialog.Header><Dialog.Body>
      <Select size="sm" label="Record" className="intelligence-hub__inspection-record" value={inspection||''} options={[{value:inspection||'',label:inspection||''}]} onChange={()=>{}} />
      {inspection==='Publication and lock record'?<><dl className="intelligence-hub__inspection-facts"><div><dt>Selected revision</dt><dd>{renderer?.runtimeInstance?.name||'Selected workspace'} · {renderer?.revision?.revisionNumber?`R${renderer.revision.revisionNumber}`:'Revision unavailable'}</dd></div><div><dt>Lock state</dt><dd>{locked?'Locked':'Not locked'}</dd></div><div><dt>Frozen evidence membership and versions</dt><dd>Not supplied</dd></div><div><dt>Snapshot integrity</dt><dd>Not independently verified</dd></div></dl><p>Only an explicit authorised successor can change a locked revision. Acquisition and evidence acceptance remain separate.</p></>:<><p>Acquisition is separate from recomputation and source inspection. Recorded executions are inspected through their existing scoped receipts.</p><AcquisitionRunHistory scope={scope} active={active && Boolean(inspection) && isCurrent()} locked={locked} canAcquire={authority?.canAcquire===true} busy={busy||preparing||pendingRequest} onRetry={run=>{setRetryFrom(run.runId);setBlocked(true);setFeedback({message:`Retry prepared for Run ${run.runId}. Refresh current acquisition data, inspect inputs and staged documents, then submit a new explicit operation.`});closeInspection()}} /><p>Sources connected: {sourceSummaryLoading?'Loading…':sourceSummary?.uniqueSourceCount??'Unavailable'} · Documents processed: {sourceProcessingLabel(sourceSummary,sourceSummaryLoading)}</p><p>{sourceProcessingExplanation(sourceSummary)}</p><p>Snapshot continuity receipt unavailable. Recorded evidence and decisions remain attached to their revision.</p><p>Accepted evidence: {countsLoading?'Loading…':evidenceStatusCounts?.accepted??'Unavailable'} · Evidence awaiting review: {countsLoading?'Loading…':evidenceStatusCounts?.pending??'Unavailable'}</p></>}
    </Dialog.Body><Dialog.Footer><Button size="sm" variant="outline" onClick={closeInspection}>Back to Context</Button></Dialog.Footer></Dialog> : null}
  </form>
}
