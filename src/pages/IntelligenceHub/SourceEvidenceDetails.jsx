import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '../../components/Button'
import { Textarea } from '../../components/Textarea'
import { useDownloadEvidenceOriginalMutation, useGetEvidenceOriginalQuery } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { verifyCustomerReportDownload } from '../../utils/customerSuppliedResearch.js'
import { getRecordedCustomerResearch, getRecordedCustomerOriginal, getRecordedReportCitations, getRecordedNativeOriginal, getRecordedOriginalRead, getRecordedEvidenceSupport, getRecordedSourceCapture, getRecordedNewsSource, getRecordedGithubSource, getRecordedIndustrySource } from './intelligenceHubModel.js'

function CustomerOriginalDetails({ source, scope, reference }) {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const [requested, setRequested] = useState(false)
  const [downloadStatus, setDownloadStatus] = useState(null)
  const [download, downloadState] = useDownloadEvidenceOriginalMutation()
  const mounted = useRef(false), inFlight = useRef(false), latestRead = useRef(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const current = sessionRevision === scope.sessionRevision && getSessionRevision() === scope.sessionRevision
  const args = { ...scope, sourceId: source.sourceId, originalId: reference.originalId,
    purpose: 'Inspect retained customer-supplied report before human review' }
  const query = useGetEvidenceOriginalQuery(args, { skip: !current || !requested, refetchOnMountOrArgChange: true })
  const read = current && requested && !query.isFetching && !query.error ? getRecordedOriginalRead(query.currentData, source, scope) : null
  const citations = read ? getRecordedReportCitations(query.currentData, source, scope) : null
  latestRead.current = read
  const ownsRead = () => mounted.current && getSessionRevision() === scope.sessionRevision && latestRead.current === read && Boolean(read)
  const downloadOriginal = async () => {
    if (!ownsRead() || inFlight.current) return
    inFlight.current = true
    setDownloadStatus(null)
    let operation
    try {
      operation = download(args)
      const attachment = await operation.unwrap()
      if (!ownsRead()) return
      if (!await verifyCustomerReportDownload(attachment, reference)) throw new Error('Original attachment does not match its recorded identity.')
      if (!ownsRead()) return
      const objectUrl = URL.createObjectURL(attachment.blob)
      const link = document.createElement('a')
      try {
        link.href = objectUrl
        link.download = `${reference.originalId}.${source.fileName.split('.').pop().toLowerCase()}`
        document.body.appendChild(link)
        link.click()
      } finally { link.remove(); URL.revokeObjectURL(objectUrl) }
      setDownloadStatus({ message: `Original download prepared. Exact byte hash matched. Download read audit: ${attachment.auditId}` })
    } catch {
      if (ownsRead()) setDownloadStatus({ error: true, message: 'Original report download is unavailable or could not be verified. No replacement report was created. Refresh the source before trying again.' })
    } finally { inFlight.current = false; operation?.reset() }
  }
  if (!current) return null
  return <section aria-label="Retained customer report original">
    <h3>Retained report original</h3>
    <Button size="sm" disabled={requested} onClick={() => {
      if (mounted.current && getSessionRevision() === scope.sessionRevision) setRequested(true)
    }}>Inspect report original</Button>
    {requested && query.isFetching ? <p role="status">Checking retained report original…</p> : null}
    {requested && !query.isFetching && !read ? <p role="alert">Retained report original is unavailable or inconsistent with this source and revision. Refresh the source before continuing.</p> : null}
    {read ? <>
      <dl className="intelligence-hub__inspection-facts">
        <div><dt>Original byte hash</dt><dd>{reference.byteHash}</dd></div>
        <div><dt>Original byte length</dt><dd>{reference.byteLength}</dd></div>
        <div><dt>Retained at</dt><dd>{reference.acquiredAt}</dd></div>
        <div><dt>Retention</dt><dd>30 days · Development/Test</dd></div>
        <div><dt>Original inspection audit</dt><dd>{read.auditId}</dd></div>
      </dl>
      <Button size="sm" disabled={downloadState.isLoading} onClick={downloadOriginal}>Download original report</Button>
      <p>The original file opens in your own document reader. Recorded evidence passages below use normalized extracted-text coordinates; they are not PDF page or original-file locations.</p>
      <section aria-label="Links found in retained report">
        <h4>Links found in retained report</h4>
        {citations ? <>
          <p>{citations.status === 'UNAVAILABLE' ? 'Citation inspection unavailable.' : `${citations.locationsInspected} report locations inspected · partial citation coverage.`}</p>
          {citations.limitReached ? <p>Inspection reached a limit. More links may remain in the original.</p> : null}
          {citations.entries.length ? <dl className="intelligence-hub__inspection-facts">{citations.entries.map((entry, index) =>
            <div key={index}><dt>{entry.location} · {entry.origin === 'HYPERLINK' ? 'Embedded hyperlink' : 'URL-like text'}</dt>
              <dd><a href={entry.url} target="_blank" rel="noopener noreferrer nofollow">{entry.url}</a></dd></div>)}</dl>
            : citations.status === 'PARTIAL' ? <p>No safe absolute HTTP/S links were found in the inspected locations. This does not establish that the report has no citations.</p> : null}
          {citations.limitations.map((text, index) => <p key={index}>{text}</p>)}
        </> : <p>Found-link metadata is unavailable or inconsistent with this original read. Inspect the retained report; manually declared links remain separate.</p>}
      </section>
      {downloadStatus ? <p role={downloadStatus.error ? 'alert' : 'status'}>{downloadStatus.message}</p> : null}
    </> : null}
  </section>
}

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
  const report = getRecordedCustomerResearch(source, stateVersion)
  const reportOriginal = getRecordedCustomerOriginal(source, scope)
  const news = getRecordedNewsSource(source, stateVersion)
  const github = getRecordedGithubSource(source, stateVersion)
  const industry = getRecordedIndustrySource(source, stateVersion)
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
    {Object.hasOwn(source || {}, 'customerSuppliedResearch') ? <section aria-label="Customer-supplied research provenance">
      <h3>Customer-supplied research</h3>
      {report ? <>
        <p>Supplied by a customer, not captured by StorylineOS Public Research. Declarations and citations are not independently verified. Evidence still requires human review and qualification.</p>
        <dl className="intelligence-hub__inspection-facts">{Object.entries({
          'Supplied by (user ID)': report.suppliedBy, 'Supplied at': report.suppliedAt, 'Supplied via': report.delivery ? 'Public report URL' : 'Report upload',
          'Declared tool': report.declaration.tool ?? 'Unknown · not declared', 'Declared model / version': report.declaration.model ?? 'Unknown · not declared',
          'Declared research method': report.declaration.searchMethod ?? 'Unknown · not declared',
          'Permission basis': 'Customer declared · not independently verified', 'Declared permission reference': report.declaration.rightsReference,
          'Supplied original byte hash': report.originalByteHash, 'Report Run': report.runId, 'Report Attempt': report.attemptId,
          ...(report.delivery ? {
            'Report URL': report.delivery.url, 'Report retrieved at': report.delivery.retrievedAt,
            'Report HTTP status': report.delivery.httpStatus, 'Response content type': report.delivery.contentType,
            'Recorded retrieval basis': report.delivery.authorization.reference, 'Retrieval basis hash': report.delivery.authorizationHash,
            'Recorded publisher': report.delivery.authorization.attribution?.publisher ?? 'Not recorded',
            'Recorded attribution': report.delivery.authorization.attribution?.statement ?? 'Not recorded',
            'Recorded licence URL': report.delivery.authorization.attribution?.licenceUrl ?? 'Not recorded',
          } : {}),
        }).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
        <h4>Declared citation URLs</h4>
        {report.declaration.citationUrls.length ? <dl className="intelligence-hub__inspection-facts">{report.declaration.citationUrls.map((url, index) =>
          <div key={index}><dt>Citation {index + 1}</dt><dd><a href={url} target="_blank" rel="noopener noreferrer nofollow">{url}</a></dd></div>)}</dl>
          : <p>No citation URLs declared in the upload fields. Inspect the original report for any embedded citations and unknowns.</p>}
        <p>These links are declarations, not separately retrieved sources or independent support. Inspect the retained original for separately detected links, citation gaps and report qualifications.</p>
        {reportOriginal ? <CustomerOriginalDetails key={JSON.stringify([scope, reportOriginal])} source={source} scope={scope} reference={reportOriginal} />
          : <p role="alert">Retained report original is unavailable or inconsistent with this source and revision. Inspect the recorded Run outcome; do not assume the upload was fully retained.</p>}
      </> : <p role="alert">Customer-supplied report provenance is unavailable or inconsistent with this source and revision.</p>}
    </section> : null}
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
    {source?.publicResearchProvenance?.contractVersion === 'public-research-source.v3' ? <section aria-label="Recorded GitHub provenance">
      <h3>Recorded GitHub provenance</h3>
      {github ? <dl className="intelligence-hub__inspection-facts">{Object.entries({
        Category: 'GitHub', Repository: github.owner + '/' + github.repository, File: github.path,
        'Requested commit': github.commit, 'Canonical file URL': github.canonicalUrl,
        'API request URL': github.requestedUrl, 'Final URL': github.finalUrl, 'API version': github.apiVersion,
        Representation: 'GitHub API HTML rendering · not raw Markdown file bytes',
        'Requested media type': 'application/vnd.github.html+json',
        'Retrieved at': github.retrievedAt, 'Publication time': 'Not recorded',
        Currentness: 'Pinned requested revision · latest repository state not verified',
        'Permitted interpretation': github.permittedInterpretation, 'Prohibited interpretation': github.prohibitedInterpretation,
        Limitations: github.limitations,
      }).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
        : <p role="alert">Recorded GitHub provenance is unavailable or inconsistent with this source and revision.</p>}
    </section> : null}
    {source?.publicResearchProvenance?.contractVersion === 'public-research-source.v4' ? <section aria-label="Recorded Industry provenance">
      <h3>Recorded Industry provenance</h3>
      {industry ? <dl className="intelligence-hub__inspection-facts">{Object.entries({
        Category: 'Industry', 'Publication title': industry.title, 'Recorded publisher': industry.publisher,
        'Publisher publication time': industry.publishedAt, 'Publication content ID': industry.publicationContentId,
        'Canonical publication URL': industry.canonicalUrl, 'Requested URL': industry.requestedUrl, 'Final URL': industry.finalUrl,
        Representation: 'Published GOV.UK statistical HTML · linked charts and downloads not fetched',
        'Nominated period quote': industry.reportingPeriodQuote, 'Nominated caveat quote': industry.reportCaveatQuote,
        'Scope basis': 'Both nominated quotes match captured text; other metrics can use different periods',
        'Retrieved at': industry.retrievedAt, Currentness: 'Publisher assertion · not independently verified',
        'Permitted interpretation': industry.permittedInterpretation, 'Prohibited interpretation': industry.prohibitedInterpretation,
        Limitations: industry.limitations,
      }).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
        : <p role="alert">Recorded Industry provenance is unavailable or inconsistent with this source and revision.</p>}
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
