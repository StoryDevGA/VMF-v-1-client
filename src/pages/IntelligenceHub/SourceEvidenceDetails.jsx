import { getRecordedEvidenceSupport, getRecordedSourceCapture } from './intelligenceHubModel.js'

export default function SourceEvidenceDetails({ source, item, stateVersion }) {
  const capture = getRecordedSourceCapture(source, stateVersion)
  const support = item ? getRecordedEvidenceSupport(item, source, stateVersion) : null
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
    <h3>Recorded source capture</h3>
    {facts ? <dl className="intelligence-hub__inspection-facts">{Object.entries(facts).map(([term, value]) =>
      <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
      : <p>Current source capture receipt unavailable or inconsistent with this read.</p>}
    {item && !support ? <p>Exact extracted-text support unavailable or inconsistent with this source and revision.</p> : null}
    <p>Coordinates refer only to normalized extracted text, not original HTML or PDF locations. Recorded capture and support do not establish source authenticity, independent verification, evidence acceptance or frozen membership.</p>
  </section>
}
