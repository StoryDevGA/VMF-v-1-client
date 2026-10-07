import { selectAcquisitionAction } from '../../utils/discoveryAcquisition.js'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { Link } from '../../components/Link'
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

function ScopedContextAcquisitionView({ sessionRevision, discovery, renderer, authority, loading, locked, runtimeInstanceId, customerId, tenantId, contextKey, refresh, workbenchHref, onSelectView, evidenceStatusCounts, countsLoading, sourceSummary, sourceSummaryLoading, active = true }) {
  const [execute] = useExecuteRuntimeActionMutation()
  const [updateInputs] = useUpdateRuntimeDiscoveryInputsMutation()
  const [draft, setDraft] = useState(() => draftFrom(discovery))
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
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; preparation.current += 1 } }, [contextKey])
  useEffect(() => {
    if (!active) {
      generation.current += 1; preparation.current += 1; setPreparing(false)
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
              : fileError || (action && action.enabled !== true ? action.disabledReason || 'The delivered acquisition action is unavailable.' : readiness.reason)
  const controlsDisabled = !editable || busy || preparing || stale || blocked
  const change = (key, value) => { setDirty(true); setDraft(previous => ({ ...previous, [key]: value })) }
  const clearFiles = () => { preparation.current += 1; setDocuments([]); setFileError(''); if (fileInput.current) fileInput.current.value = '' }
  const chooseFiles = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!isCurrent() || !currentActive.current || inFlight.current) return
    const operation = ++preparation.current
    preparingRef.current = true; setPreparing(true); setFileError(''); setDocuments([])
    try {
      if (files.length > DISCOVERY_DOCUMENT_MAX_COUNT) throw new Error(`Select up to ${DISCOVERY_DOCUMENT_MAX_COUNT} documents per acquisition.`)
      const prepared = await Promise.all(files.map(buildDiscoveryDocumentSource))
      if (isCurrent() && preparation.current === operation) { setDocuments(prepared); setDirty(true) }
    } catch (error) {
      if (isCurrent() && preparation.current === operation) setFileError(error.message)
    } finally {
      if (isCurrent() && preparation.current === operation) { preparingRef.current = false; setPreparing(false) }
    }
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
  return <form className="intelligence-hub__context-workspace intelligence-hub__acquisition" onSubmit={acquire}>
    <div className="intelligence-hub__grid intelligence-hub__grid--two">
      <Card variant="outlined" className="intelligence-hub__panel"><Card.Body>
        <p className="intelligence-hub__eyebrow">Acquisition brief</p><h2>What should this acquisition understand?</h2>
        {briefAvailable ? <div className="intelligence-hub__acquisition-fields">
          {[['companyName', 'Company name', 255], ['marketRegion', 'Market / region', 255], ['targetOffer', 'Target product or offer', 500]].map(([key, label, limit]) => <Input key={key} id={`context-${key}`} label={label} fullWidth maxLength={limit} value={draft[key] || ''} disabled={controlsDisabled} onChange={event => change(key, event.target.value)} />)}
          <Textarea id="context-notes" label="Optional notes" rows={3} fullWidth maxLength={4000} value={draft.notes || ''} disabled={controlsDisabled} onChange={event => change('notes', event.target.value)} />
          <Select label="Acquisition profile" options={DISCOVERY_ACQUISITION_PROFILE_OPTIONS} value={profile} disabled={controlsDisabled} onChange={event => { setDirty(true); setProfile(event.target.value) }} />
          <p>{DISCOVERY_ACQUISITION_PROFILE_GUIDANCE[profile]?.summary}</p>
        </div> : <p>Brief details unavailable for this revision.</p>}
      </Card.Body></Card>
      <Card variant="outlined" className="intelligence-hub__panel"><Card.Body>
        <p className="intelligence-hub__eyebrow">Brief completeness</p><h2>{briefAvailable ? `${readiness.rows.filter(row => row.complete).length}/4 brief fields` : 'Unavailable'}</h2>
        <ul>{readiness.rows.map(row => <li key={row.key}>{row.label}: {briefAvailable ? row.complete ? 'Present' : 'Missing' : 'Unavailable'}</li>)}</ul>
        <p>Brief completeness is separate from source processing, evidence acceptance and readiness.</p>
        {countsLoading ? <p role="status">Loading Context evidence counts…</p> : null}
        <p>Acquisition status: {discovery?.acquisition?.status || 'Unavailable'}</p>
        <p>Sources connected: {sourceSummaryLoading ? 'Loading…' : sourceSummary?.uniqueSourceCount ?? 'Unavailable'} · Documents processed: {sourceProcessingLabel(sourceSummary, sourceSummaryLoading)}</p>
        <p>{sourceProcessingExplanation(sourceSummary)}</p>
        <AcquisitionRunHistory scope={scope} active={active} locked={locked} canAcquire={authority?.canAcquire === true} busy={busy || preparing || pendingRequest}
          onRetry={run => { setRetryFrom(run.runId); setBlocked(true); setFeedback({ message: `Retry prepared for Run ${run.runId}. Refresh current acquisition data, inspect inputs and staged documents, then submit a new explicit operation.` }) }} />
        <p>Snapshot continuity receipt unavailable. Recorded evidence and decisions remain attached to their revision.</p>
        <p>Accepted evidence: {countsLoading ? 'Loading…' : evidenceStatusCounts?.accepted ?? 'Unavailable'} · Evidence awaiting review: {countsLoading ? 'Loading…' : evidenceStatusCounts?.pending ?? 'Unavailable'}</p>
      </Card.Body></Card>
      <Card variant="outlined" className="intelligence-hub__panel"><Card.Body>
        <h2>Website sources</h2><p>Manage submitted URLs in this brief. Processing and provenance are recorded in Sources.</p>
        {websiteCounts ? <section aria-label="Latest website acquisition outcomes">
          <h3>Latest website acquisition</h3>
          <p>{websiteAttempt.acquiredSourceCount} succeeded · {websiteAttempt.failedSourceCount} failed across {websiteAttempt.sourceCount} submitted websites.</p>
          {websiteOutcomes ? <ul>{websiteOutcomes.map(item => <li key={item.inputIndex}>
            Website {item.inputIndex + 1}: {item.status === 'SUCCEEDED' ? `Succeeded · ${item.evidenceObjectCount} eligible evidence objects`
              : `Failed · ${item.retainedPrior ? `Prior source retained with ${item.retainedEvidenceObjectCount} previous evidence objects.` : 'Inspect the URL and retry.'}`}
          </li>)}</ul> : websiteItems ? <p>Individual website outcomes unavailable.</p> : null}
          <p>These are the latest attempt’s outcomes. Inspect Sources for exact provenance; acquisition does not establish evidence sufficiency.</p>
        </section> : websiteAttempt ? <p>Latest website acquisition outcomes unavailable.</p> : null}
        {briefAvailable ? <div className="intelligence-hub__acquisition-fields">{draft.websiteSources.map((url, index) => <div key={index} className="intelligence-hub__acquisition-url">
          <Input label={`Website URL ${index + 1}`} id={`context-url-${index}`} fullWidth maxLength={500} value={url} disabled={controlsDisabled} onChange={event => change('websiteSources', draft.websiteSources.map((value, i) => i === index ? event.target.value : value))} />
          <Button type="button" variant="ghost" disabled={controlsDisabled} aria-label={`Remove website URL ${index + 1}`} onClick={() => change('websiteSources', draft.websiteSources.length === 1 ? [''] : draft.websiteSources.filter((_, i) => i !== index))}>Remove</Button>
        </div>)}<Button type="button" variant="outline" disabled={controlsDisabled || draft.websiteSources.length >= DISCOVERY_WEBSITE_SOURCE_MAX_COUNT} onClick={() => change('websiteSources', [...draft.websiteSources, ''])}>Add URL</Button></div> : <p>Website detail unavailable.</p>}
      </Card.Body></Card>
      <Card variant="outlined" className="intelligence-hub__panel"><Card.Body>
        <h2>Document acquisition</h2><p>{DOCUMENT_EXTRACTION_HELPER_TEXT}</p><p>{DOCUMENT_EXTRACTION_STORAGE_NOTE}</p>
        <label htmlFor="context-documents">Select documents (up to 5; 2.5 MB each, PPTX up to 40 MB)</label>
        <input ref={fileInput} id="context-documents" type="file" multiple accept={DISCOVERY_DOCUMENT_ACCEPT} disabled={controlsDisabled} onChange={chooseFiles} />
        {documents.length ? <ul aria-label="Selected acquisition documents">{documents.map((document, index) => <li key={index}>{document.fileName} · {formatDocumentSize(document.sizeBytes)} · Staged locally</li>)}</ul> : null}
        {fileError ? <p role="alert">{fileError}</p> : null}
        <Button type="button" variant="ghost" disabled={busy || preparing || !documents.length && !fileError} onClick={clearFiles}>Clear selected files</Button>
        <p>Previously processed documents and actual contribution counts are available in Sources.</p>
        {documentOutcomes ? <section aria-label="Latest document extraction outcomes">
          <h3>Latest document extraction</h3>
          <p>Each result refers to an input in the latest attempt. Successful extraction does not establish evidence sufficiency.</p>
          <ul>{documentOutcomes.map(item => <li key={item.inputIndex}>Input {item.inputIndex + 1}: {item.status === 'SUCCEEDED'
            ? `Succeeded · ${item.evidenceObjectCount} eligible evidence objects`
            : item.status === 'FAILED' ? 'Failed · Choose a supported readable file and retry.' : 'Outcome unavailable'}</li>)}</ul>
        </section> : null}
        {documentAttempt && !documentOutcomes ? <p>Latest document extraction outcomes unavailable.</p> : null}
      </Card.Body></Card>
    </div>
    <div ref={status} tabIndex={-1} role="status" className="intelligence-hub__decision-feedback">{feedback?.message || reason || 'Ready to acquire. Resulting evidence still requires human review.'}</div>
    {feedback?.error && reason ? <p>{reason}</p> : null}
    <div className="intelligence-hub__context-actionbar">
      <Button type="submit" disabled={Boolean(reason) || !['STANDARD', 'ENHANCED'].includes(profile)}>{busy ? 'Acquiring…' : discovery?.evidenceReady ? 'Refresh evidence' : 'Build evidence'}</Button>
      <Button type="button" variant="outline" disabled={busy || preparing} onClick={refreshCurrent}>Refresh acquisition data</Button>
      {pendingRequest ? <Button type="button" variant="outline" disabled={busy || preparing || !active} onClick={() => submitRequest(request.current)}>Check original acquisition request</Button> : null}
      {retryFrom ? <p>Next acquisition explicitly retries Run {retryFrom} with a new request identity.</p> : null}
      <Button type="button" variant="ghost" disabled={busy || preparing || !dirty && !documents.length} onClick={() => { setDraft(draftFrom(discovery)); setProfile(discovery?.acquisitionProfile || 'STANDARD'); setBasis(stamp); setDirty(false); clearFiles() }}>Discard local changes</Button>
      <Button type="button" variant="outline" onClick={() => onSelectView('Sources')}>View current sources</Button>
      <Link to={workbenchHref} underline="hover">Open existing acquisition workbench ↗</Link>
    </div>
  </form>
}
