import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Card } from '../../components/Card'
import { Button, ButtonGroup } from '../../components/Button'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { TabView } from '../../components/TabView'
import { useGetPrivateDocxCandidatesQuery, useGetPrivateDocxPreviewBundleQuery } from '../../store/api/docxPreviewApi.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { renderSafeMarkdown } from '../../utils/safeMarkdown.jsx'
import { controlledOutcomeRuntimeId } from './controlledOutcomeModel.js'
import { readPrivateDocxCandidates, decodePrivateDocxPreview } from './privateDocxPreviewModel.js'
import './PrivateDocxPreviewPanel.css'

function SavedPages({ candidate, scope }) {
  const bundle = useGetPrivateDocxPreviewBundleQuery({ ...scope, candidateId: candidate.candidateId }, { refetchOnMountOrArgChange: true })
  const [decoded, setDecoded] = useState(null), [failed, setFailed] = useState(false), [page, setPage] = useState(0)
  const response = !bundle.isFetching && !bundle.error ? bundle.currentData : null
  useEffect(() => {
    let disposed = false
    const ownership = { live: true }
    const urls = []
    if (response && response.data?.preview !== null) decodePrivateDocxPreview(response, candidate, scope).then(result => {
      if (disposed || scope.sessionRevision !== getSessionRevision()) return
      try {
        result.blobs.forEach(blob => urls.push(URL.createObjectURL(blob)))
        if (disposed || scope.sessionRevision !== getSessionRevision()) { urls.forEach(url => URL.revokeObjectURL(url)); return }
        setDecoded({ response, candidate, scope, ownership, urls: [...urls], document: result.document }); setFailed(false); setPage(0)
      } catch { urls.forEach(url => URL.revokeObjectURL(url)); setFailed(true) }
    }).catch(() => { if (!disposed) setFailed(true) })
    return () => { disposed = true; ownership.live = false; urls.forEach(url => URL.revokeObjectURL(url)) }
  }, [response, candidate, scope])
  if (bundle.isFetching || bundle.isLoading) return <Status variant="info">Checking the saved document and loading its pages…</Status>
  if (bundle.error || failed || !response) return <Status variant="error">The saved preview is unavailable or could not be verified. Refresh to check it again.</Status>
  if (response?.data?.preview === null) return <Status variant="neutral">No saved preview is available for this document.</Status>
  if (!decoded || decoded.response !== response || decoded.candidate !== candidate || decoded.scope !== scope
    || !decoded.ownership.live) return <Status variant="info">Verifying the saved page images…</Status>
  return <TabView aria-label="Private Word document views">
    <TabView.Tab label="Document pages">
      <div className="private-docx-preview__pages">
        <ButtonGroup aria-label="Document page navigation">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous page</Button>
          <Button variant="outline" disabled={page === decoded.urls.length - 1} onClick={() => setPage(value => value + 1)}>Next page</Button>
        </ButtonGroup>
        <p aria-live="polite">Page {page + 1} of {decoded.urls.length}</p>
        <figure><img className="private-docx-preview__image" src={decoded.urls[page]}
          alt={`${decoded.document.title}, document page ${page + 1} of ${decoded.urls.length}. The text alternative is available in the next tab.`} />
          <figcaption>Saved document page {page + 1}. Private preview awaiting a separate document review.</figcaption></figure>
      </div>
    </TabView.Tab>
    <TabView.Tab label="Text alternative">
      <div className="outcome-studio-workspace__preview-body outcome-studio-workspace__preview-body--markdown">
        <p>This is the content from the same saved document. The Document pages tab shows its actual layout.</p>
        {renderSafeMarkdown(decoded.document.markdown, { headingOffset: 2 })}
      </div>
    </TabView.Tab>
  </TabView>
}

function ScopedPreview({ scope }) {
  const query = useGetPrivateDocxCandidatesQuery(scope, { refetchOnMountOrArgChange: true })
  const [selection, setSelection] = useState(''), [requested, setRequested] = useState('')
  const candidates = !query.isFetching && !query.error ? readPrivateDocxCandidates(query.currentData, scope) : null
  const selected = candidates?.find(row => row.candidateId === selection) || (candidates?.length === 1 ? candidates[0] : null)
  return <section className="private-docx-preview" aria-label="Private Word document">
    <Card><Card.Body><div className="private-docx-preview__body">
      <h2>Private Word document</h2>
      <p>Development/Test preview · non-authoritative. Document review and final approval are still required; delivery is held.</p>
      <Status variant="warning">Private preview · not reviewed</Status>
      {selected?.masterBinding?.contractVersion === 'master-linked-private-docx-binding.v2'
        ? <Status variant="info">Corrected private version. The earlier document and its failed review are preserved. This version is awaiting its own review; approval and delivery remain on hold.</Status> : null}
      {selected?.masterBinding?.contractVersion === 'master-linked-private-docx-binding.v3'
        ? <Status variant="info">Wording correction awaiting review. All three earlier review attempts are preserved. This version has no quality verdict; approval and delivery remain on hold. The source gives no operational authorisation.</Status> : null}
      {selected?.storageProvenance ? <Status variant="info">Controlled Development/Test snapshot. Workspace access was checked for this read; customer approval is unavailable.</Status> : null}
      {query.isFetching || query.isLoading ? <Status variant="info">Checking saved Word documents…</Status>
        : query.error || candidates === null ? <Status variant="error">Saved Word documents are unavailable. Refresh to check again.</Status>
          : candidates.length === 0 ? <Status variant="neutral">No eligible saved Word document is available for this runtime.</Status> : <>
            {candidates.length > 1 ? <Select label="Saved Word document" placeholder="Select a document" value={selected?.candidateId || ''}
              options={candidates.map(row => ({ value: row.candidateId, label: `${row.selectedPacks.OUTPUT_TYPE.label} · ${new Date(row.createdAt).toLocaleString()}` }))}
              onChange={event => { setSelection(event.target.value); setRequested('') }} /> : <h3>{selected?.selectedPacks.OUTPUT_TYPE.label}</h3>}
            {requested && selected?.candidateId === requested ? <SavedPages key={requested} candidate={selected} scope={scope} />
              : <Button variant="outline" disabled={!selected} onClick={() => setRequested(selected.candidateId)}>View saved preview</Button>}
            {selected ? <details><summary>Document lineage</summary><p>Renderer version {selected.renderer.version}. Source and document identity are checked by the server on every read.</p>
              <p>Candidate: <code>{selected.candidateId}</code></p>
              {selected.masterBinding?.correctionReference ? <><p>Previous candidate: <code>{selected.masterBinding.correctionReference.predecessor.candidateId}</code></p>
                <p>The original failed review is preserved. This corrected version has not been reviewed.</p></> : null}
              {selected.masterBinding?.compatibilityReference ? <><p>Previous candidate: <code>{selected.masterBinding.compatibilityReference.predecessorCandidateId}</code></p>
                <p>The wording decision permits this private correction only. All {selected.masterBinding.contractVersion === 'master-linked-private-docx-binding.v4' ? 'five' : 'three'} prior attempts remain unchanged; this version has not been reviewed.</p></> : null}</details> : null}
          </>}
      <Button variant="outline" disabled={query.isFetching} onClick={() => { setRequested(''); query.refetch() }}>Refresh saved documents</Button>
    </div></Card.Body></Card>
  </section>
}

export default function PrivateDocxPreviewPanel({ runtimeInstanceId, customerId, tenantId }) {
  const nativeId = controlledOutcomeRuntimeId(runtimeInstanceId)
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const scope = useMemo(() => ({ runtimeInstanceId: nativeId, customerId, tenantId, sessionRevision }), [nativeId, customerId, tenantId, sessionRevision])
  if (!nativeId || !/^[a-f0-9]{24}$/.test(customerId || '') || !/^[a-f0-9]{24}$/.test(tenantId || '')) return null
  return <ScopedPreview key={JSON.stringify(scope)} scope={scope} />
}
