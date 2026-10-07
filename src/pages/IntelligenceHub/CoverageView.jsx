import { useEffect } from 'react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Link } from '../../components/Link'
import { displayHubCount, displayHubToken, getHubCount } from './intelligenceHubModel.js'
import { readCoverageSourceFacts } from './coverageReadModel.js'
import DiscoveryHealthDetails from './DiscoveryHealthDetails.jsx'

const coverageGroup = (domain) => {
  if (domain.state === 'STRONG') return 'Strong'
  if (domain.state === 'ADEQUATE') return 'Adequate'
  if (['WEAK', 'MISSING'].includes(domain.state)) return 'Gaps'
  return 'Other'
}
const coverageTone = (domain) => ({ Strong: 'success', Adequate: 'info', Gaps: 'warning' })[coverageGroup(domain)] || 'neutral'

export default function CoverageView({ discoveryHealth, discoveryHealthLoading, graphCoverage, isLoading, error, qualityHref, acquisitionHref, onSelectView, onOpenSources, inspection, onInspectionChange, active = true }) {
  const { filter, selectedDomain, notice } = inspection
  const summary = !isLoading && !error && graphCoverage?.available === true
    && graphCoverage.coverage?.coverageModel === 'EVIDENCE_DOMAIN_COVERAGE' ? graphCoverage.coverage : null
  const domains = Array.isArray(summary?.domains) ? summary.domains.filter(item => typeof item?.domain === 'string') : []
  const filtered = domains.filter(item => filter === 'All' || coverageGroup(item) === filter)
  const selected = notice ? null : selectedDomain ? filtered.find(item => item.domain === selectedDomain) || null : filtered[0] || null
  const sourceFacts = selected ? readCoverageSourceFacts(selected.sourceFacts, selected.connectedEvidenceCount) : null
  useEffect(() => {
    if (active && !notice && selected && !selectedDomain) onInspectionChange({ selectedDomain: selected.domain }, { replace: true })
  }, [active, notice, selected, selectedDomain, onInspectionChange])
  const percent = getHubCount(summary, 'coveragePercent')
  const value = count => isLoading ? 'Loading…' : displayHubCount(count)
  const message = isLoading ? 'Loading selected revision coverage…' : error
    ? 'Coverage could not be loaded. Refresh to retry.' : !summary
      ? 'No domain coverage projection is available for this selected revision.' : ''
  return <section className="intelligence-hub__sources-workspace intelligence-hub__coverage-workspace">
    <header className="intelligence-hub__coverage-toolbar">
      <div><p className="intelligence-hub__eyebrow">Intelligence health</p><h2>Understand where intelligence is sufficiently supported</h2><p>Coverage shows domains with connected evidence. Missing domains remain visible even when overall coverage is high.</p></div>
      <Card variant="outlined" className="intelligence-hub__coverage-readiness">
        <Card.Body><header><span>Discovery readiness</span></header><DiscoveryHealthDetails model={discoveryHealth} loading={discoveryHealthLoading} />
          <div><span><small>Workspace use</small><b>Unavailable</b></span><span><small>Confidence</small><b>Unavailable</b></span></div>
          <Link to={qualityHref} variant="subtle" underline="none" title="Opens Intelligence Quality with the selected context.">Review recommended items →</Link>
        </Card.Body>
      </Card>
      <Link to={acquisitionHref} variant="subtle" underline="none" className="btn btn--primary intelligence-hub__coverage-acquire" title="Open Context for acquisition. Navigation makes no change.">＋ Acquire evidence</Link>
    </header>
    <div className="intelligence-hub__sources-summary intelligence-hub__coverage-summary" aria-label="Coverage summary" aria-busy={isLoading}>
      <span title="Percentage of required domains with connected evidence; not a percentage of evidence objects."><strong>{isLoading ? 'Loading…' : percent === null ? 'Unavailable' : `${percent}%`}</strong><small>Domain/Intelligence Coverage</small></span>
      <span><strong>{value(getHubCount(summary, 'totalDomainCount'))}</strong><small>Required domains</small></span>
      <span><strong>{value(getHubCount(summary, 'coveredDomainCount'))}</strong><small>Supported</small></span>
      <span title="Domains with no connected evidence; the API does not rate materiality."><strong>{value(Array.isArray(summary?.missingDomains) ? summary.missingDomains.length : null)}</strong><small>Missing domains</small></span>
    </div>
    <p className="intelligence-hub__coverage-hint">Domain/Intelligence Coverage is the share of the ten DIG domains with connected accepted evidence. It is separate from evidence-object counts and readiness.</p>
    {notice ? <p role="status">{notice}</p> : null}
    {message ? <p role="status" aria-label="Coverage read status" className="intelligence-hub__muted">{message}</p> : null}
    <p className="intelligence-hub__coverage-hint">↳ Select a domain to inspect its evidence, confidence and recommended improvements.</p>
    <div className="intelligence-hub__coverage-browser">
      <Card variant="outlined" className="intelligence-hub__coverage-map">
        <Card.Header><div><h2>Coverage map</h2><strong>{summary ? `${filtered.length} domains shown` : 'Domains unavailable'}</strong></div>
          <div role="group" className="intelligence-hub__sources-filters" aria-label="Coverage filters">{['All', 'Strong', 'Adequate', 'Gaps'].map(item => <Button key={item} size="sm" variant="ghost" aria-pressed={filter === item} onClick={() => onInspectionChange({ filter: item, selectedDomain: '' })}>{item}</Button>)}</div>
        </Card.Header>
        <Card.Body className="intelligence-hub__coverage-domains" role="region" aria-label="Coverage domains" tabIndex={0}>
          {filtered.length ? filtered.map(item => <Button key={item.domain} size="sm" variant="ghost" className="intelligence-hub__coverage-domain" aria-pressed={selected?.domain === item.domain} onClick={() => onInspectionChange({ selectedDomain: item.domain })}>
            <span className="intelligence-hub__coverage-domain-heading"><i aria-label="Domain coverage percentage unavailable" title="Per-domain percentage is not projected">—</i><strong>{displayHubToken(item.domain)}</strong><Badge variant={coverageTone(item)} size="sm" pill>{displayHubToken(item.state)}</Badge></span>
            <span className="intelligence-hub__coverage-divider" aria-hidden="true" />
            <small>{displayHubCount(getHubCount(item, 'connectedEvidenceCount'))} connected evidence · {readCoverageSourceFacts(item.sourceFacts, item.connectedEvidenceCount)?.sourceCompleteness === 'COMPLETE' ? `${item.sourceFacts.resolvedSourceCount} recorded sources` : 'sources unavailable'}</small>
          </Button>) : <p className="intelligence-hub__muted">{message || 'No domains match this filter.'}</p>}
        </Card.Body>
        <Card.Footer><span className="intelligence-hub__coverage-legend--success">●</span> Strong <span className="intelligence-hub__coverage-legend--info">●</span> Adequate <span className="intelligence-hub__coverage-legend--warning">●</span> Weak / missing</Card.Footer>
      </Card>
      <Card variant="outlined" className="intelligence-hub__coverage-detail" role="region" aria-label="Selected coverage domain" tabIndex={0}>
        <Card.Body>{selected ? <>
          <header><div><span>{displayHubToken(selected.domain)} domain</span><Badge variant={coverageTone(selected)} size="sm" pill>{displayHubToken(selected.state)}</Badge></div><h3>Per-domain percentage unavailable</h3><p>Graph coverage provides evidence counts and a recorded state for this domain.</p></header>
          <div className="intelligence-hub__coverage-factors"><span><small>Connected evidence</small><strong>{displayHubCount(getHubCount(selected, 'connectedEvidenceCount'))} objects</strong></span><span><small>Source diversity</small><strong>{sourceFacts?.typeCompleteness === 'COMPLETE' ? `${sourceFacts.sourceTypeCounts.length} recorded source kinds` : 'Unavailable'}</strong></span><span><small>Connected sources</small><strong>{sourceFacts?.sourceCompleteness === 'COMPLETE' ? `${sourceFacts.resolvedSourceCount} recorded identities` : 'Unavailable'}</strong></span></div>
          <section aria-label="Recorded source basis">
            <p>{sourceFacts ? 'Recorded graph source identities and kinds describe this domain’s connected accepted evidence. They do not establish independent corroboration or source authority.' : 'Connected-source identities and recorded source kinds were not supplied by a valid current graph receipt.'}</p>
            {sourceFacts?.sourceCompleteness === 'PARTIAL' ? <p>{sourceFacts.resolvedSourceCount} resolved source identities are a lower bound; {sourceFacts.unresolvedEvidenceCount} connected evidence objects have unresolved provenance.</p> : null}
            {sourceFacts?.typeCompleteness === 'COMPLETE' ? <><p>{sourceFacts.unknownSourceTypeCount} resolved source identities have an unknown kind.</p>{sourceFacts.sourceTypeCounts.length ? <ul>{sourceFacts.sourceTypeCounts.map(row => <li key={row.sourceType}>{displayHubToken(row.sourceType)}: {row.count} sources</li>)}</ul> : null}</> : sourceFacts ? <p>The recorded source-kind distribution exceeds the bounded projection; it is unavailable.</p> : null}
          </section>
          <section className="intelligence-hub__coverage-confidence"><header><span>Explainable confidence</span><strong>Unavailable</strong></header><div><p className="intelligence-hub__coverage-increase"><i aria-hidden="true">↑</i><span><small>Increased by</small>Recorded confidence factors unavailable</span></p><p className="intelligence-hub__coverage-reduction"><i aria-hidden="true">↓</i><span><small>Reduced by</small>Recorded confidence qualifications unavailable</span></p></div></section>
          <section className="intelligence-hub__coverage-impact"><h4>Why this matters</h4><p>Domain impact is not projected for this revision.</p></section>
          <section className="intelligence-hub__coverage-next"><h4>Recommended improvement</h4><p>A domain-specific recommendation is not projected.</p><div><Button size="sm" square variant="outline" onClick={() => onOpenSources(selected.domain)}>Search sources and evidence for this domain →</Button><Link to={acquisitionHref} variant="subtle" underline="none" className="intelligence-hub__coverage-destination" title="Navigation only; evidence acquisition is not performed here.">Open acquisition in Context →</Link>{coverageGroup(selected) === 'Gaps' ? <Link to={qualityHref} variant="subtle" underline="none" className="intelligence-hub__coverage-destination intelligence-hub__coverage-destination--quality" title="Opens Intelligence Quality; no specific quality finding is projected.">Open Intelligence Quality →</Link> : null}</div></section>
          <footer><span>{displayHubCount(getHubCount(selected, 'acceptedEvidenceCount'))} accepted · {displayHubCount(getHubCount(selected, 'pendingEvidenceCount'))} pending · {displayHubCount(getHubCount(selected, 'rejectedEvidenceCount'))} rejected</span><p>Coverage is diagnostic. Quality findings and governed resolutions remain in Intelligence Quality.</p></footer>
        </> : <p className="intelligence-hub__muted">{message || notice || (selectedDomain ? 'The requested domain is unavailable in the current filter or coverage read. Choose a displayed domain or change the filter.' : 'Select a domain from a matching filter to inspect its detail.')}</p>}</Card.Body>
      </Card>
    </div>
    <footer className="intelligence-hub__sources-footer"><Button variant="ghost" size="sm" onClick={() => onSelectView('Review')}>← Review</Button><span>Coverage is diagnostic; readiness and publication are inspected next.</span><Button variant="ghost" size="sm" onClick={() => onSelectView('Readiness & publish')}>Continue to Readiness &amp; publish →</Button></footer>
  </section>
}
