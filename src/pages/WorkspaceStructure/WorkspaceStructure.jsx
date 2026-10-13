import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button, ButtonGroup } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { Dialog } from '../../components/Dialog'
import { Link } from '../../components/Link'
import { Status } from '../../components/Status'
import { TabView } from '../../components/TabView'
import { Textarea } from '../../components/Textarea'
import { StructureNavigationGuard } from './StructureNavigationGuard.jsx'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { selectResolvedPermissions } from '../../store/slices/authSlice.js'
import { hasCustomerPermission, hasTenantPermission } from '../../utils/authorization.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { getExecutionWorkspaceDestinationHref } from '../../utils/runtimeWorkspace.js'
import { normalizeError } from '../../utils/errors.js'
import { useGetRuntimeRendererQuery, useGetRuntimeStateBootstrapQuery, useGetRuntimeStateSectionSummaryQuery,
  useExecuteRuntimeActionMutation, useAcceptRuntimeSectionMutation, useMutateRuntimeStateMutation, useUpdateRuntimeSectionEvidenceMutation, useReviewRuntimeSectionEvidenceMutation } from '../../store/api/runtimeInstanceApi.js'
import { buildDiscoveryDocumentSource, DISCOVERY_DOCUMENT_ACCEPT, DISCOVERY_DOCUMENT_MAX_COUNT, DOCUMENT_EXTRACTION_HELPER_TEXT, formatDocumentSize, formatSectionSupportingFileError } from '../../utils/discoveryAcquisition.js'
import { sectionDocuments, sectionEvidence, reviewableSectionEvidence, verifiedSectionEvidenceReview, verifiedSectionFileUpload } from './sectionFilesModel.js'
import { readUnderstandingCatalogue, readUnderstandingBasis, understandingContent, understandingLineageHref, sectionContextText, sectionContextValue, sameSectionInput } from './understandingModel.js'
import '../IntelligenceHub/IntelligenceHub.css'
import './WorkspaceStructure.css'

const VIEWS = ['Overview', 'Context', 'Understanding', 'Review']
const ignoreDraft = () => {}
const printable = value => value == null ? 'Unavailable' : typeof value === 'string' ? value : JSON.stringify(value, null, 2)
function Content({ value, empty }) {
  const sections = Array.isArray(value?.sections) ? value.sections.filter(section => section && typeof section === 'object') : []
  return <div className="workspace-structure__content">{sections.length ? sections.map((section, index) => <section key={index}>
    {typeof section.heading === 'string' ? <h4>{section.heading}</h4> : null}
    {typeof section.body === 'string' ? <p>{section.body}</p> : null}
    {Array.isArray(section.bullets) && section.bullets.some(bullet => typeof bullet === 'string') ? <ul>{section.bullets.filter(bullet => typeof bullet === 'string').map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}</ul> : null}
  </section>) : understandingContent(value) || empty}</div>
}
export default function WorkspaceStructure() {
  const [search, setSearch] = useSearchParams()
  const { customerId, tenantId } = useTenantContext()
  const session = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const permissions = useSelector(selectResolvedPermissions)
  const workspaceId = search.get('runtimeInstanceId') || '', runtimeInstanceId = search.get('revisionId') || ''
  const scope = { workspaceId, runtimeInstanceId, customerId, tenantId }
  const canUpdate = hasCustomerPermission(permissions, customerId, 'VMF_UPDATE') || hasTenantPermission(permissions, customerId, tenantId, 'VMF_UPDATE')
  const draftRef = useRef({ dirty: false })
  const [draftBusy, setDraftBusy] = useState(false)
  const onDraftState = useCallback(state => { draftRef.current = state; setDraftBusy(Boolean(state.busy)) }, [])
  return <><StructureNavigationGuard draftRef={draftRef} busy={draftBusy} /><ScopedStructure key={JSON.stringify([scope, session])} scope={scope} session={session} canUpdate={canUpdate} search={search} setSearch={setSearch} onDraftState={onDraftState} /></>
}

export function ScopedStructure({ scope, session, canUpdate, search, setSearch, onDraftState = ignoreDraft }) {
  const args = { runtimeInstanceId: scope.runtimeInstanceId, customerId: scope.customerId, tenantId: scope.tenantId }
  const skip = !Object.values(scope).every(Boolean)
  const rendererRead = useGetRuntimeRendererQuery(args, { skip })
  const bootstrapRead = useGetRuntimeStateBootstrapQuery(args, { skip })
  const catalogue = !rendererRead.error && !bootstrapRead.error ? readUnderstandingCatalogue(rendererRead.currentData ?? rendererRead.data, bootstrapRead.currentData ?? bootstrapRead.data, scope) : null
  const requestedKey = search.get('section') || catalogue?.sections[0]?.sectionKey || ''
  const selected = catalogue?.sections.find(row => row.sectionKey === requestedKey)
  const sectionRead = useGetRuntimeStateSectionSummaryQuery({ ...args, sectionKey: selected?.nativeKey || '' }, { skip: skip || !selected })
  const loading = [rendererRead, bootstrapRead, sectionRead].some(read => read.isLoading || read.isFetching)
  const basis = !loading && !sectionRead.error ? readUnderstandingBasis(catalogue, sectionRead.currentData ?? sectionRead.data, requestedKey, canUpdate) : null
  const [execute] = useExecuteRuntimeActionMutation(), [accept] = useAcceptRuntimeSectionMutation(), [mutate] = useMutateRuntimeStateMutation()
  const [upload] = useUpdateRuntimeSectionEvidenceMutation()
  const [reviewEvidence] = useReviewRuntimeSectionEvidenceMutation()
  const [files, setFiles] = useState(null), [fileError, setFileError] = useState('')
  const fileInput = useRef(null)
  const [pending, setPending] = useState(null), [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false)
  const [message, setMessage] = useState(''), [compare, setCompare] = useState(false), [guidance, setGuidance] = useState(false)
  const [draft, setDraft] = useState(null), [leave, setLeave] = useState(null)
  const savedContext = basis ? sectionContextText(basis.section, basis.detail.input) : null
  const contextDirty = Boolean(draft && (!basis || draft.value !== draft.savedInput || draft.value !== savedContext))
  const dirty = contextDirty || Boolean(files?.documents.length)
  const discard = useCallback(() => { setDraft(null); setFiles(null); setFileError(''); setPending(null); onDraftState({ dirty: false }) }, [onDraftState])
  useEffect(() => { onDraftState({ dirty, busy, discard }); return () => onDraftState({ dirty: false }) }, [dirty, busy, discard, onDraftState])
  const alive = useRef(true), flight = useRef(false), frame = useRef(null)
  useLayoutEffect(() => {
    const current = { basis, requestedKey, canUpdate, pending, busy, blocked }
    frame.current = current
    return () => { if (frame.current === current) frame.current = null }
  })
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const owns = () => alive.current && getSessionRevision() === session && frame.current?.requestedKey === requestedKey
  const chooseFiles = async event => {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ''
    if (!selectedFiles.length) return
    if (!owns() || flight.current || !basis?.editable || !basis.section.allowedOperations?.includes('WRITE') || blocked
      || files && files.signature !== basis.signature) return
    const signature = files?.signature || basis.signature
    flight.current = true; setBusy(true); setFileError('')
    try {
      const prepared = [...(files?.documents || [])]
      for (const file of selectedFiles) {
        const document = { ...await buildDiscoveryDocumentSource(file), assetType: 'SECTION_SUPPORTING_FILE' }
        if (!prepared.some(item => item.fileName === document.fileName && item.mimeType === document.mimeType
          && item.sizeBytes === document.sizeBytes && item.contentBase64 === document.contentBase64)) prepared.push(document)
        if (prepared.length > DISCOVERY_DOCUMENT_MAX_COUNT) throw new Error('Select up to five supporting files per batch.')
      }
      if (owns()) setFiles({ signature, documents: prepared })
    } catch (error) { if (owns()) setFileError(error.message) }
    finally { flight.current = false; if (owns()) setBusy(false) }
  }
  const href = destination => getExecutionWorkspaceDestinationHref(destination, scope.workspaceId, scope.runtimeInstanceId)
  const hubHref = view => `${href('intelligence')}&view=${view}`
  const select = (key, view = search.get('sectionView') || 'understanding') => {
    if (busy || flight.current) return
    if (dirty && key !== requestedKey) { setLeave({ key, view }); return }
    navigateSection(key, view)
  }
  const navigateSection = (key, view) => {
    const next = new URLSearchParams(search); next.set('section', key); next.set('sectionView', view)
    setPending(null); setMessage(''); setCompare(false); setSearch(next)
  }
  const refresh = async () => {
    const results = await Promise.allSettled([rendererRead.refetch(), bootstrapRead.refetch(), sectionRead.refetch()])
    if (!owns() || results.some(result => result.status !== 'fulfilled' || result.value.error)) return null
    const [renderer, bootstrap, section] = results.map(result => result.value.data)
    return readUnderstandingBasis(readUnderstandingCatalogue(renderer, bootstrap, scope), section, requestedKey, frame.current.canUpdate)
  }
  const inspect = async () => {
    if (flight.current || !selected || !owns()) return
    flight.current = true; setBusy(true); setPending(null)
    try {
      const current = await refresh()
      if (owns() && current && draft) {
        if (sameSectionInput(current.detail.input, sectionContextValue(current.section, current.detail.input, draft.value))) setDraft(null)
        else if (sectionContextText(current.section, current.detail.input) === draft.savedInput) setDraft({ ...draft, signature: current.signature })
      }
      if (owns()) { setBlocked(!current); setMessage(current ? 'Current section basis refreshed. Inspect before continuing.' : 'The current section basis could not be verified.') }
    } catch { if (owns()) { setBlocked(true); setMessage('The current section basis could not be verified.') } }
    finally { flight.current = false; if (owns()) setBusy(false) }
  }
  const reason = (kind, command) => !basis ? 'Current selected-section data is loading, unavailable or inconsistent.'
    : blocked ? 'Refresh and inspect the current section basis before another command.'
      : busy ? 'Wait for the current section command to finish.'
        : kind === 'UPLOAD_FILES' ? !basis.editable || !basis.section.allowedOperations?.includes('WRITE') ? 'This revision or your current authority permits inspection only.'
          : !sectionDocuments(basis) || !sectionEvidence(basis) ? 'Current section file and evidence receipts are unavailable. Refresh and inspect before extraction.'
          : contextDirty ? 'Save or discard unsaved section context before extracting files.'
            : !files?.documents.length ? 'Choose supporting files before extraction.'
              : files.signature !== basis.signature ? 'The section basis changed. Inspect it, then remove and select the files again.' : ''
        : kind === 'SAVE_CONTEXT' ? !basis.editable ? 'This revision or your current authority permits inspection only.'
          : files?.documents.length ? 'Extract or remove staged supporting files before saving context.'
          : savedContext === null || !basis.section.allowedOperations?.includes('WRITE') ? 'The declared context input contract permits inspection only.'
          : !dirty ? 'There are no unsaved changes.'
            : basis.section.dataType === 'OBJECT' && !draft.value.trim() ? 'Enter additional context before saving.'
              : sameSectionInput(basis.detail.input, sectionContextValue(basis.section, basis.detail.input, draft.value)) ? 'There are no unsaved changes.'
            : draft.sectionKey !== requestedKey || draft.signature !== basis.signature ? 'The saved context basis changed. Refresh and inspect before saving.' : ''
          : dirty ? 'Save or discard unsaved section context and staged files before another command.'
        : kind === 'REVIEW_EVIDENCE' ? !basis.editable || !basis.section.allowedOperations?.includes('WRITE') ? 'This revision or your current authority permits inspection only.'
          : !reviewableSectionEvidence(basis, command?.evidenceObjectId) ? 'Current evidence fact and source could not be verified.'
            : !['ACCEPTED', 'REJECTED'].includes(command.reviewStatus) ? 'This evidence decision is unavailable.'
              : reviewableSectionEvidence(basis, command.evidenceObjectId).reviewStatus === command.reviewStatus ? 'This evidence decision is already recorded.' : ''
        : kind === 'ACCEPT' ? basis.acceptanceReason : basis.actionReason(kind)
  const confirm = async () => {
    const command = pending
    const current = frame.current
    if (!owns() || flight.current || !command || current.pending !== command || !current.canUpdate || current.busy || current.blocked
      || !current.basis?.editable || current.basis.signature !== basis?.signature || command.signature !== current.basis.signature || reason(command.kind, command)
      || command.kind === 'REVIEW_EVIDENCE' && !sameSectionInput(command.evidence, reviewableSectionEvidence(basis, command.evidenceObjectId))) return
    flight.current = true; setBusy(true); setBlocked(true); setPending(null); setMessage('Submitting the selected section command…')
    try {
      const body = { expectedUpdatedAt: basis.expectedUpdatedAt, runtimePath: basis.section.runtimePath, sectionKey: basis.section.sectionKey }
      let uploadResponse
      if (command.kind === 'UPLOAD_FILES') uploadResponse = await upload({ runtimeInstanceId: scope.runtimeInstanceId, body: { ...body, documentSources: command.documents } }).unwrap()
      else if (command.kind === 'REVIEW_EVIDENCE') uploadResponse = await reviewEvidence({ runtimeInstanceId: scope.runtimeInstanceId, evidenceObjectId: command.evidenceObjectId, body: { ...body, reviewStatus: command.reviewStatus } }).unwrap()
      else if (command.kind === 'SAVE_CONTEXT') {
        if (command.text !== draft?.value) return
        await mutate({ runtimeInstanceId: scope.runtimeInstanceId, body: { runtimePath: basis.section.runtimePath, operation: 'WRITE', value: command.value, expectedUpdatedAt: basis.expectedUpdatedAt } }).unwrap()
      } else if (command.kind === 'ACCEPT') await accept({ runtimeInstanceId: scope.runtimeInstanceId, body }).unwrap()
      else await execute({ ...args, actionKey: command.kind, body }).unwrap()
      if (!owns() || !frame.current.canUpdate) return
      const current = await refresh()
      if (!owns()) return
      const verified = current?.editable && current.expectedUpdatedAt !== basis.expectedUpdatedAt && (command.kind === 'UPLOAD_FILES'
        ? verifiedSectionFileUpload(basis, current, command.documents, uploadResponse)
        : command.kind === 'REVIEW_EVIDENCE' ? verifiedSectionEvidenceReview(basis, current, command, uploadResponse)
        : command.kind === 'SAVE_CONTEXT'
        ? sameSectionInput(current.detail.input, command.value) && (!basis.generated && !basis.accepted || !current.generated && !current.accepted)
        : command.kind === 'ACCEPT'
        ? current.acceptedCurrent && understandingContent(current.generated) === understandingContent(basis.generated)
          && current.generated?.inputHash === basis.generated?.inputHash && current.generated?.generatedAt === basis.generated?.generatedAt
        : understandingContent(current.generated).trim() && current.generated.generatedAt !== basis.generated?.generatedAt && !current.acceptedCurrent)
      setBlocked(!verified)
      if (verified && command.kind === 'SAVE_CONTEXT') discard()
      if (verified && command.kind === 'UPLOAD_FILES') { setFiles(null); setFileError('') }
      setMessage(verified ? command.kind === 'REVIEW_EVIDENCE' ? 'Section evidence decision verified. Inspect generation eligibility and any Understanding invalidation before continuing.' : command.kind === 'UPLOAD_FILES' ? 'Supporting files extracted. Current section receipts and pending evidence verified; Understanding is unchanged.' : command.kind === 'SAVE_CONTEXT' ? 'Section context saved. Current saved input and revision basis verified.' : command.kind === 'ACCEPT' ? 'Understanding accepted. Current content and decision record verified.'
        : 'Understanding generated. Current reads verified; inspect it before deciding acceptance.'
        : 'The command was submitted, but its current result could not be verified. Refresh and inspect before continuing.')
    } catch (failure) {
      if (owns()) setMessage(`${command.kind === 'UPLOAD_FILES' ? formatSectionSupportingFileError(failure) : normalizeError(failure).message} Refresh and inspect before another command.`)
    } finally { flight.current = false; if (owns()) setBusy(false) }
  }
  const index = catalogue?.sections.findIndex(row => row.sectionKey === requestedKey) ?? -1
  const section = basis?.section || selected, detail = basis?.detail
  const viewIndex = Math.max(0, VIEWS.findIndex(view => view.toLowerCase() === search.get('sectionView')))
  const previous = detail?.revisions?.at(-1)?.generated
  const canCompare = Boolean(understandingContent(previous).trim())
  const lineageHref = understandingLineageHref(basis, scope)
  return <main className="intelligence-hub workspace-structure container" aria-labelledby="workspace-structure-title">
    <div className="intelligence-hub__selected" role="group" aria-label="Selected workspace context">
      <div className="intelligence-hub__selected-context"><span>Selected Workspace</span><strong>{catalogue?.renderer.runtimeInstance.name || 'Workspace unavailable'}</strong>
        {catalogue ? <Badge size="sm" variant="success" pill>{`R${catalogue.renderer.revision.revisionNumber}`}</Badge> : null}</div>
      <nav aria-label="Workspace areas"><Link to={catalogue ? `/app/runtime/${encodeURIComponent(scope.runtimeInstanceId)}` : '/app/dashboard'} variant="subtle">Workspace Home</Link>
        <Link to={href('intelligence')} variant="subtle">Intelligence Hub</Link><Link to={href('quality')} variant="subtle">Intelligence Quality</Link>
        <span aria-current="page">Workspace Structure</span><Link to={href('outcome-studio')} variant="subtle">Outcome Studio</Link></nav>
    </div>
    <nav className="intelligence-hub__navigation-actions" aria-label="Workspace Structure navigation actions"><Link to={catalogue ? `/app/runtime/${encodeURIComponent(scope.runtimeInstanceId)}` : '/app/dashboard'}>← Back</Link><Button variant="ghost" size="sm" onClick={() => setGuidance(true)}>Generation and acceptance guidance</Button></nav>
    <header className="intelligence-hub__heading"><div><p className="intelligence-hub__eyebrow">Workspace Structure · {catalogue?.renderer.package?.packageName || 'Selected Framework package'}</p>
      <h1 id="workspace-structure-title">Workspace Structure</h1><p>{catalogue?.renderer.package?.frameworkVersion ? `Framework package v${catalogue.renderer.package.frameworkVersion}` : 'Package provenance unavailable'}</p></div>
      <Button size="sm" variant="outline" disabled={busy || !selected} onClick={inspect}>Refresh section basis</Button></header>
    {!catalogue || !section ? <p role="status">{loading ? 'Loading selected workspace structure…' : 'The selected workspace, package or section could not be verified. Open Workspace Structure from the selected Workspace Home.'}</p> : <div className="workspace-structure__layout">
      <Card variant="outlined"><Card.Body>
        <p className="intelligence-hub__eyebrow">Workspace section</p><h2>{section.label}</h2><p>{section.helpText}</p>
        <ButtonGroup><Badge size="sm">{section.required ? 'Required' : 'Optional'}</Badge><Status size="sm" variant={basis?.acceptedCurrent ? 'success' : 'warning'}>{basis?.acceptedCurrent ? 'Understanding accepted' : detail?.state?.status || 'Current detail unavailable'}</Status></ButtonGroup>
        <TabView size="sm" activeTab={viewIndex} onTabChange={next => select(requestedKey, VIEWS[next].toLowerCase())} aria-label="Workspace section views">
          <TabView.Tab label="Overview"><h3>Section purpose</h3><p>{section.helpText || 'Section guidance is unavailable.'}</p><p>Framework guidance describes how to interpret evidence. It is not customer evidence or accepted Understanding.</p><Link to={hubHref('sources')}>Inspect sources →</Link><Button size="sm" variant="ghost" onClick={() => select(requestedKey, 'understanding')}>Review proposed Understanding →</Button></TabView.Tab>
          <TabView.Tab label="Context"><h3>Additional section context</h3>
            {basis && savedContext !== null ? <>
              <Textarea label={`Additional context for ${section.label}`} size="sm" fullWidth rows={6}
                value={draft?.sectionKey === requestedKey ? draft.value : savedContext}
                readOnly={!basis.editable || !basis.section.allowedOperations?.includes('WRITE') || busy || Boolean(pending)} helperText={dirty ? 'Unsaved changes' : 'Saved context'}
                onChange={event => setDraft(previous => previous ? { ...previous, value: event.target.value } : { sectionKey: requestedKey, savedInput: savedContext, signature: basis.signature, value: event.target.value })} />
              <ButtonGroup><Button size="sm" disabled={Boolean(reason('SAVE_CONTEXT'))} title={reason('SAVE_CONTEXT')} onClick={() => setPending({ kind: 'SAVE_CONTEXT', signature: basis.signature, text: draft.value, value: sectionContextValue(section, detail.input, draft.value) })}>Save changes</Button>
                <Button size="sm" variant="ghost" disabled={!dirty || busy} title="Discard unsaved context and staged files." onClick={discard}>Discard changes</Button></ButtonGroup><p>{reason('SAVE_CONTEXT')}</p>
            </> : <><div className="workspace-structure__content">{printable(detail?.input)}</div><p>This context format is available for inspection only.</p></>}
            <p>Changing saved context archives this section's generated and accepted Understanding and resets readiness. Inspect the resulting section before generating again.</p>
            <section aria-label="Section supporting files"><h3>Section evidence</h3><p>{DOCUMENT_EXTRACTION_HELPER_TEXT}</p>
              <p>Extraction appends pending section evidence. It does not accept evidence, generate Understanding or replace the current accepted Understanding.</p>
              <label htmlFor="section-supporting-files">Supporting files (up to 5; 2.5 MB each, PPTX up to 40 MB)</label>
              <input ref={fileInput} id="section-supporting-files" type="file" multiple accept={DISCOVERY_DOCUMENT_ACCEPT} onChange={chooseFiles}
                disabled={busy || blocked || !basis?.editable || !basis.section.allowedOperations?.includes('WRITE') || Boolean(pending) || Boolean(files && files.signature !== basis.signature)} />
              <p>{files?.documents.length || 0} of 5 files staged locally. Further selections add to this batch; identical files are included once.</p>
              {files?.documents.length ? <ul className="intelligence-hub__staged-documents" aria-label="Staged section supporting files">{files.documents.map((document, index) => <li key={index}><span>{document.fileName} · {formatDocumentSize(document.sizeBytes)}</span>
                <Button size="sm" variant="ghost" disabled={busy || Boolean(pending)} aria-label={`Remove staged supporting file ${index + 1}: ${document.fileName}`} onClick={() => { const remaining = files.documents.filter((_, i) => i !== index); setFiles(remaining.length ? { ...files, documents: remaining } : null); setFileError(''); fileInput.current?.focus() }}>Remove</Button></li>)}</ul> : null}
              {fileError ? <p role="alert">{fileError}</p> : null}
              <Button size="sm" disabled={Boolean(reason('UPLOAD_FILES'))} title={reason('UPLOAD_FILES')} onClick={() => setPending({ kind: 'UPLOAD_FILES', signature: basis.signature, documents: files.documents })}>Extract supporting files</Button><p>{reason('UPLOAD_FILES')}</p>
              <details><summary>Inspect persisted section files and evidence</summary>
                {sectionDocuments(basis)?.length === 0 ? <p>No supporting files are recorded for this section.</p> : null}
                {sectionDocuments(basis) ? <ul>{sectionDocuments(basis).map(row => <li key={row.sectionDocumentId}>{row.fileName} · {row.status} · {row.uploadedAt}<details><summary>Receipt details</summary><div className="workspace-structure__content">{printable({ sectionDocumentId: row.sectionDocumentId, sourceId: row.sourceId, uploadedBy: row.uploadedBy, sizeBytes: row.sizeBytes, extractionMethod: row.extractionMethod })}</div></details></li>)}</ul> : <p>Current supporting-file receipts are unavailable.</p>}
                {sectionEvidence(basis) ? <ul>{sectionEvidence(basis).map(row => <li key={row.evidenceObjectId}>{row.title || row.evidenceObjectId} · {row.reviewStatus || 'Review status unavailable'}</li>)}</ul> : <p>Current section evidence is unavailable.</p>}
              </details></section><Link to={hubHref('context')}>Open Intelligence Hub Context →</Link></TabView.Tab>
          <TabView.Tab label="Understanding"><h3>Proposed Understanding</h3><Content value={basis?.generated} empty={loading ? 'Loading current section…' : 'No generated Understanding is recorded for this section.'} />
            <p>Generated: {basis?.generated?.generatedAt || 'Not recorded'} · Generation basis: {basis?.generated?.inputHash || 'Unavailable'}</p>
            <h3>Accepted Understanding</h3><Content value={basis?.accepted} empty="No accepted Understanding is recorded for this section." />
            {basis?.accepted ? <p>{basis.acceptedCurrent ? 'Current decision' : 'Historical or unverified decision'} · {basis.accepted.acceptedBy || 'Actor unavailable'} · {basis.accepted.acceptedAt || 'Time unavailable'} · {basis.accepted.truthHash || 'Receipt unavailable'}</p> : null}
            {lineageHref ? <Link to={lineageHref}>Inspect Understanding lineage →</Link>
              : <p role="status">Current accepted Understanding lineage is unavailable for this section.</p>}
            <details><summary>Inspect generation evidence and validation basis</summary><div className="workspace-structure__content">{printable({ truthEligibility: basis?.generated?.truthEligibility || detail?.intelligence?.truthEligibility,
              evidenceRefs: basis?.generated?.supportingEvidenceRefs, evidenceProjection: basis?.generated?.evidenceProjection,
              sectionIntelligence: basis?.generated?.sectionIntelligence, generatorReceipt: basis?.generated?.generator,
              validationResults: basis?.generated?.validationResults, validation: detail?.validation, lineage: detail?.lineage })}</div></details>
          </TabView.Tab>
          <TabView.Tab label="Review"><h3>Section evidence review</h3><p>Inspect each extracted fact and its source before deciding. Accepting evidence makes it available to section generation; it does not accept Understanding or approve publication. A changed accepted evidence basis requires regeneration of existing Understanding.</p>
            {!sectionEvidence(basis) ? <p>Current section evidence is unavailable.</p> : !sectionEvidence(basis).length ? <p>No section evidence is recorded.</p> : sectionEvidence(basis).map(row => <section key={row.evidenceObjectId} aria-label={`Section evidence ${row.evidenceObjectId}`}>
              <p>{typeof row.extractedFact === 'string' ? row.extractedFact : 'Extracted fact unavailable'}</p><p>Source: {row.sourceFileName || sectionDocuments(basis)?.find(document => document.sourceId === row.sourceId)?.fileName || 'Unavailable'}</p>
              <Status size="sm" variant={row.reviewStatus === 'ACCEPTED' ? 'success' : 'warning'}>{row.reviewStatus || 'Review status unavailable'}</Status>
              <ButtonGroup stackOnMobile>{['ACCEPTED', 'REJECTED'].map(reviewStatus => {
                const command = { kind: 'REVIEW_EVIDENCE', evidenceObjectId: row.evidenceObjectId, reviewStatus, evidence: row, signature: basis.signature }
                return <Button key={reviewStatus} size="sm" variant="outline" disabled={Boolean(reason(command.kind, command))} title={reason(command.kind, command)} onClick={() => setPending(command)}>{reviewStatus === 'ACCEPTED' ? 'Accept evidence' : 'Reject evidence'}</Button>
              })}</ButtonGroup>
              <details><summary>Inspect evidence decision receipt</summary><div className="workspace-structure__content">{printable({ evidenceObjectId: row.evidenceObjectId, sourceId: row.sourceId, sectionKey: row.sectionKey, runtimePath: row.runtimePath, lastReviewedBy: row.lastReviewedBy, lastReviewedAt: row.lastReviewedAt, acceptedBy: row.acceptedBy, acceptanceTimestamp: row.acceptanceTimestamp, rejectedBy: row.rejectedBy, rejectionTimestamp: row.rejectionTimestamp })}</div></details>
            </section>)}
            <h3>Recorded section review</h3><p>Section acceptance is a separate decision from evidence-pack acceptance, Quality review and publication.</p><div className="workspace-structure__content">{printable(detail?.review)}</div><details><summary>Inspect recorded section lineage</summary><div className="workspace-structure__content">{printable(detail?.lineage)}</div></details><Link to={href('quality')}>Inspect Intelligence Quality →</Link></TabView.Tab>
        </TabView>
        <ButtonGroup stackOnMobile aria-label="Section actions">
          <Button variant="ghost" size="sm" disabled={busy || index < 1} onClick={() => select(catalogue.sections[index - 1].sectionKey)}>← Previous section</Button>
          {['GENERATE_SECTION', 'REGENERATE_SECTION'].map(kind => <Button key={kind} size="sm" variant={kind === 'GENERATE_SECTION' ? 'primary' : 'outline'} disabled={Boolean(reason(kind))} title={reason(kind)}
            onClick={() => setPending({ kind, signature: basis.signature })}>{kind === 'GENERATE_SECTION' ? 'Generate section' : 'Regenerate section'}</Button>)}
          <Button variant="outline" size="sm" disabled={!canCompare || busy} title={canCompare ? 'Compare with the recorded previous section generation.' : 'No previous section generation is recorded.'} onClick={() => setCompare(true)}>Compare</Button>
          <Button size="sm" disabled={Boolean(reason('ACCEPT'))} title={reason('ACCEPT')} onClick={() => setPending({ kind: 'ACCEPT', signature: basis.signature })}>{basis?.acceptedCurrent ? 'Understanding accepted' : 'Accept Understanding'}</Button>
          <Button variant="ghost" size="sm" disabled={busy || index < 0 || index >= catalogue.sections.length - 1} onClick={() => select(catalogue.sections[index + 1].sectionKey)}>Next section →</Button>
        </ButtonGroup>
        <p>{reason('ACCEPT')}</p><p role={blocked ? 'alert' : 'status'}>{message}</p>
      </Card.Body></Card>
      <aside aria-label="Guided sections"><Card variant="outlined"><Card.Body><h2>Guided sections</h2><p>Supplied by the active Framework package</p><Link to={href('intelligence')}>Intelligence Hub prerequisite →</Link>
        <nav aria-label="Package sections">{catalogue.sections.map(row => <Button key={row.sectionKey} variant={row.sectionKey === requestedKey ? 'outline' : 'ghost'} size="sm" fullWidth disabled={busy} aria-current={row.sectionKey === requestedKey ? 'step' : undefined} onClick={() => select(row.sectionKey)}>{row.label} · {row.required ? 'Required' : 'Optional'}</Button>)}</nav><Link to={href('outcome-studio')}>Outcome Studio →</Link></Card.Body></Card></aside>
    </div>}
    <ConfirmationDialog open={Boolean(pending?.kind === 'REVIEW_EVIDENCE' && basis && pending.signature === basis.signature)} title="Review section evidence"
      message={pending ? `${pending.reviewStatus === 'ACCEPTED' ? 'Accept' : 'Reject'} this extracted fact: ${pending.evidence?.extractedFact || ''}` : ''}
      detail="This records your evidence decision for this section and source. A changed accepted evidence basis invalidates existing Understanding until regeneration; evidence review does not accept Understanding or complete Quality review."
      confirmLabel="Confirm evidence decision" loading={busy} onCancel={() => { if (!busy) setPending(null) }} onConfirm={confirm} />
    <ConfirmationDialog open={Boolean(pending && pending.kind !== 'REVIEW_EVIDENCE' && basis && pending.signature === basis.signature)} title={pending?.kind === 'UPLOAD_FILES' ? 'Extract supporting files' : pending?.kind === 'SAVE_CONTEXT' ? 'Save section context' : pending?.kind === 'ACCEPT' ? 'Accept Understanding' : 'Generate Understanding'}
      message={pending?.kind === 'UPLOAD_FILES' ? `Extract ${pending.documents.length} staged files for ${section.label}?` : pending?.kind === 'SAVE_CONTEXT' ? 'Save this additional context for the selected section?' : pending?.kind === 'ACCEPT' ? 'I have inspected this generated version and choose to accept it for this workspace revision.' : 'Generate this selected section using its current saved context, evidence and Framework package contracts.'}
      detail={pending?.kind === 'UPLOAD_FILES' ? 'Originals are not retained. Extraction appends pending section evidence; it does not accept evidence or generate or accept Understanding.' : pending?.kind === 'SAVE_CONTEXT' ? 'A changed input archives this section’s current generated and accepted Understanding and resets readiness. Acceptance and publication remain separate decisions.' : pending?.kind === 'ACCEPT' ? 'Acceptance records your actor, time and this exact generated version. It does not complete Quality review or approve publication.' : 'Generation may call the configured reasoning provider. Regeneration replaces current proposed content and may invalidate earlier acceptance. Acceptance remains a separate decision.'}
      confirmLabel={pending?.kind === 'UPLOAD_FILES' ? 'Confirm extraction' : pending?.kind === 'SAVE_CONTEXT' ? 'Confirm context save' : pending?.kind === 'ACCEPT' ? 'Confirm acceptance' : 'Confirm generation'} loading={busy} onCancel={() => { if (!busy) setPending(null) }} onConfirm={confirm} />
    <ConfirmationDialog open={Boolean(leave)} title="Unsaved section context" message="Discard your unsaved context and staged files and switch sections?"
      confirmLabel="Discard and continue" cancelLabel="Keep editing" onCancel={() => setLeave(null)}
      onConfirm={() => { const destination = leave; discard(); setLeave(null); navigateSection(destination.key, destination.view) }} />
    <Dialog open={compare && canCompare} onClose={() => setCompare(false)} aria-label="Compare section Understanding"><Dialog.Header>Recorded section comparison</Dialog.Header><Dialog.Body><h3>Previous generation</h3><Content value={previous} /><h3>Current generation</h3><Content value={basis?.generated} /></Dialog.Body></Dialog>
    <Dialog open={guidance} onClose={() => setGuidance(false)} aria-label="Generation and acceptance guidance"><Dialog.Header>Generation and acceptance</Dialog.Header><Dialog.Body><p>Generate uses the selected section's active package contracts and current evidence. Inspect the proposed content, evidence associations, reasoning receipts and validation before accepting. Acceptance records the exact generated version; it does not verify evidence independently or approve publication. Locked revisions permit inspection only. After an uncertain result, refresh and inspect the original result before submitting another command.</p></Dialog.Body></Dialog>
  </main>
}
