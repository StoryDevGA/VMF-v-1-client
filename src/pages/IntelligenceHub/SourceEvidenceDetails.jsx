import { useState, useSyncExternalStore } from 'react'
import { Button } from '../../components/Button'
import { Textarea } from '../../components/Textarea'
import { useGetEvidenceOriginalQuery } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { getRecordedNativeOriginal, getRecordedOriginalRead, getRecordedEvidenceSupport, getRecordedSourceCapture, getRecordedNewsSource } from './intelligenceHubModel.js'

function NativeOriginalDetails({ source, scope, reference }) {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const [requested, setRequested] = useState(false)
  const current = sessionRevision === scope.sessionRevision && getSessionRevision() === scope.sessionRevision
  const query = useGetEvidenceOriginalQuery({ ...scope, sourceId: source.sourceId, originalId: reference.originalId,
    purpose: 'Inspect retained research original before human review' }, { skip: !current || !requested, refetchOnMountOrArgChange: true })
  const read = current && requested && !query.isFetching && !query.error
    ? getRecordedOriginalRead(query.currentData, source, scope) : null
  if (!current) return null
  const attribution = reference.policy.nativeResearch.grant.attribution
  return <section aria-label="Retained original material">
    <h3>Retained original material</h3>
    <p>{attribution.publisher}: {attribution.statement} <a href={attribution.licenceUrl} target="_blank" rel="noreferrer">Licence</a></p>
    <Button size="sm" onClick={() => setRequested(true)} disabled={requested}>Read retained material</Button>
    {requested && query.isFetching ? <p role="status">Reading retained material…</p> : null}
    {requested && !query.isFetching && !read ? <p role="alert">Retained material is unavailable or could not be verified for this read. Reload before continuing.</p> : null}
    {read ? <>
      <dl className="intelligence-hub__inspection-facts">
        <div><dt>Original byte hash</dt><dd>{reference.byteHash}</dd></div>
        <div><dt>Original byte length</dt><dd>{reference.byteLength}</dd></div>
        <div><dt>Retained at</dt><dd>{reference.acquiredAt}</dd></div>
        <div><dt>Retention</dt><dd>30 days · Development/Test</dd></div>
        <div><dt>Original read audit</dt><dd>{read.auditId}</dd></div>
      </dl>
      <Textarea label="Full captured text from retained original" value={read.capturedText} readOnly rows={12} fullWidth />
    </> : null}
  </section>
}

export default function SourceEvidenceDetails({ source, item, stateVersion, scope }) {
  const capture = getRecordedSourceCapture(source, stateVersion)
  const support = item ? getRecordedEvidenceSupport(item, source, stateVersion) : null
  const original = getRecordedNativeOriginal(source, scope)
  const news = getRecordedNewsSource(source, stateVersion)
  const receipt = capture?.captureReceipt
  const facts = capture ? {
    'Capture operation': receipt.operation === 'CONTROLLED_HTML_REPLAY_CAPTURE'
      ? 'Controlled synthetic HTML capture · provider-free fixture' : receipt.operation,
    'Recorded capture status': receipt.status,
    'Capture Run': receipt.runId || 'Not recorded',
    'Capture Attempt': receipt.attemptId || 'Not recorded',
    'Capture input index': receipt.inputIndex,
    'Captured at': capture.capturedAt,
    'Source ID': capture.sourceId,
    'Read state version': stateVersion,
    'Original content hash': capture.originalContentHash,
    'Extracted-text hash': capture.captureTextHash,
    'Extracted-text length': `${capture.textLength} UTF-16 code units`,
    'Extraction method': capture.extractionMethod,
    ...(support ? {
      'Evidence ID': item.evidenceObjectId,
      'Support span': `[${support.start}, ${support.end}) · UTF-16 code units · end exclusive`,
      'Exact recorded excerpt': support.exactExcerpt,
      'Excerpt hash': support.excerptHash,
      'Recorded support status': support.supportStatus,
      'Statement origin': support.statementOrigin,
      'Knowledge status': support.epistemicType,
      Restrictions: support.restrictions.join(' · '),
    } : {}),
  } : null
  return <section aria-label="Recorded capture and support">
    {source?.publicResearchProvenance?.contractVersion === 'public-research-source.v2' ? <section aria-label="Recorded News provenance">
      <h3>Recorded News provenance</h3>
      {news ? <dl className="intelligence-hub__inspection-facts">{Object.entries({
        Category: 'News', 'Article title': news.title, 'Recorded publisher': news.publisher,
        'Recorded author': news.author ?? 'Not recorded', 'Publisher publication time': news.publishedAt ?? 'Not recorded',
        'Retrieved at': news.retrievedAt, 'Requested URL': news.requestedUrl, 'Final URL': news.finalUrl,
        'Metadata method': 'NewsArticle JSON-LD from captured HTML',
        Currentness: 'Publisher assertion · not independently verified',
        'Permitted interpretation': news.permittedInterpretation, 'Prohibited interpretation': news.prohibitedInterpretation,
        Limitations: news.limitations,
      }).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
        : <p role="alert">Recorded News provenance is unavailable or inconsistent with this source and revision.</p>}
    </section> : null}
    <h3>Recorded source capture</h3>
    {facts ? <dl className="intelligence-hub__inspection-facts">{Object.entries(facts).map(([term, value]) =>
      <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
      : <p>Current source capture receipt unavailable or inconsistent with this read.</p>}
    {item && !support ? <p>Exact extracted-text support unavailable or inconsistent with this source and revision.</p> : null}
    {original ? <NativeOriginalDetails key={JSON.stringify([scope, original.originalId])} source={source} scope={scope} reference={original} /> : null}
    <p>Coordinates refer only to normalized extracted text, not original HTML or PDF locations. Recorded capture and support do not establish source authenticity, independent verification, evidence acceptance or frozen membership.</p>
  </section>
}
