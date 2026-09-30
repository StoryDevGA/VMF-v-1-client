import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MdChevronRight, MdNorthEast } from 'react-icons/md'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Link } from '../../components/Link'
import { Status } from '../../components/Status'
import { TabView } from '../../components/TabView'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import {
  useGetRuntimeRendererQuery,
  useGetRuntimeStateEvidenceQuery,
  useGetRuntimeStateGraphManifestQuery,
  useGetRuntimeStateGraphProjectionQuery,
  useGetRuntimeIntelligenceGraphCoverageQuery,
} from '../../store/api/runtimeInstanceApi.js'
import {
  HUB_VIEWS,
  displayHubCount,
  displayHubToken,
  getHubContextSearch,
  getHubCount,
  getHubDestinationHref,
  getHubDiscovery,
  getHubEvidencePage,
  getHubEvidenceStatusCount,
  getHubPayload,
  getHubReturnHref,
  getHubViewFromSearch,
  reconcileHubDiscovery,
  validateHubContext,
} from './intelligenceHubModel.js'
import './IntelligenceHub.css'

const summaryValue = (value) => value === null || value === undefined || value === ''
  ? 'Unavailable'
  : String(value)

const readableDate = (value) => {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.valueOf()) ? date.toLocaleString() : 'Unavailable'
}

const compactReadableDate = (value) => {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.valueOf())
    ? date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    : 'Unavailable'
}

function Panel({ title, eyebrow, children, className = '', inlineHeader = false }) {
  return (
    <Card variant="outlined" className={`intelligence-hub__panel ${className}`}>
      <Card.Body>
        {inlineHeader ? <header className="intelligence-hub__panel-header">
          <h2>{title}</h2>
          {eyebrow ? <p className="intelligence-hub__eyebrow">{eyebrow}</p> : null}
        </header> : <>
          {eyebrow ? <p className="intelligence-hub__eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </>}
        {children}
      </Card.Body>
    </Card>
  )
}

function DetailButton({ children, onOpen, title, body, variant = 'ghost', className = '' }) {
  return <Button className={className} size="sm" variant={variant} onClick={(event) => onOpen({ title, body }, event.currentTarget)}>{children}</Button>
}

function Metric({ label, value, hint, onOpen, detail, onAction, actionHref, valueAction = false, className = '' }) {
  const hasValue = String(value) !== 'Unavailable'
  const positiveValue = Number.isFinite(Number(value)) && Number(value) > 0
  return (
    <Card variant="outlined" className={`intelligence-hub__metric ${className}`} data-has-value={String(hasValue)} data-positive={String(positiveValue)}>
      <Card.Body>
        <p className="intelligence-hub__eyebrow">{label}</p>
        {valueAction && hasValue
          ? <button type="button" className="intelligence-hub__metric-value intelligence-hub__metric-value-action" onClick={(event) => onOpen({ title: label, body: detail }, event.currentTarget)}>{value}</button>
          : <strong className="intelligence-hub__metric-value">{value}</strong>}
        {actionHref
          ? <Link to={actionHref} variant="subtle" underline="hover" className="intelligence-hub__metric-action">{hint}</Link>
          : <Button size="sm" variant="ghost" onClick={onAction || ((event) => onOpen({ title: label, body: detail }, event.currentTarget))}>{hint}</Button>}
      </Card.Body>
    </Card>
  )
}

function BoundaryLink({ to, children, note = 'Destination screen is outside SS-037.', variant = 'subtle' }) {
  return to ? (
    <div className="intelligence-hub__boundary-link">
      <Link to={to} variant={variant} underline="hover">{children}</Link>
      {note ? <small>{note}</small> : null}
    </div>
  ) : note ? <p className="intelligence-hub__muted">{note}</p> : null
}

function OverviewMetrics({ renderer, discovery, graphCoverage, onOpen, onSelectView, qualityHref }) {
  const evidenceSummary = discovery?.evidenceObjectSummary
  const acquisitionMetrics = discovery?.acquisitionEffectiveness?.metrics
  const graphSummary = graphCoverage?.available === true
    && graphCoverage?.coverage?.coverageModel === 'EVIDENCE_DOMAIN_COVERAGE'
    ? graphCoverage.coverage
    : null
  const coverage = getHubCount(graphSummary, 'coveragePercent')
  const reviewCandidates = getHubCount(acquisitionMetrics, 'contradictionCount')
  const sourceCount = getHubCount(discovery?.sourceRegistrySummary, 'count')
  return <div className="intelligence-hub__metrics" aria-label="Intelligence summary">
    <Metric className="intelligence-hub__metric--assurance" label="Intelligence assurance" value={summaryValue(renderer?.truthBinding?.certification?.label)} hint="Select to view assurance details" onOpen={onOpen} valueAction
      detail="Assurance is shown only when the selected revision has a server-projected certification. Coverage or evidence counts alone do not establish an assurance level." />
    <Metric className="intelligence-hub__metric--sources" label="Sources" value={displayHubCount(sourceCount)} hint="Inspect source records →" onOpen={onOpen} onAction={() => onSelectView('Sources')}
      detail="The server-projected source registry summary reports this revision's source count. The bounded evidence read exposes only sources linked to its current page." />
    <Metric className="intelligence-hub__metric--evidence" label="Evidence objects" value={displayHubCount(getHubCount(evidenceSummary, 'evidenceObjectCount'))} hint="Inspect accepted evidence →" onOpen={onOpen} onAction={() => onSelectView('Review', 'Approved')}
      detail="Evidence objects are recorded facts or candidates. Accepted and pending counts are distinct; the Hub does not approve evidence." />
    <Metric className="intelligence-hub__metric--coverage" label="Evidence coverage" value={coverage === null ? 'Unavailable' : `${coverage}%`} hint="Explore contributing domains →" onOpen={onOpen} onAction={() => onSelectView('Coverage')}
      detail="Coverage is a discovery signal for the selected revision, not a truth certification or publication decision." />
    <Metric className="intelligence-hub__metric--review" label="Items recommended for review" value={displayHubCount(reviewCandidates)} hint="Open quality findings →" onOpen={onOpen} actionHref={qualityHref}
      detail="The saved acquisition summary reports contradiction candidates for human review. Open Intelligence Quality to inspect them; this recommendation does not approve evidence or change governed records." />
  </div>
}

const OVERVIEW_DOMAINS = ['Company', 'Products', 'Market', 'Economics', 'Problems', 'Stakeholders']

function Overview({ renderer, discovery, graphCoverage, evidenceStatusCounts, isLoading, onOpen, qualityHref, onSelectView }) {
  if (isLoading) return <p role="status">Loading Overview details…</p>
  const evidenceSummary = discovery?.evidenceObjectSummary
  const domainCoverage = graphCoverage?.available === true
    && graphCoverage?.coverage?.coverageModel === 'EVIDENCE_DOMAIN_COVERAGE'
    ? graphCoverage.coverage
    : null
  const coverage = getHubCount(domainCoverage, 'coveragePercent')
  const reviewCandidates = getHubCount(discovery?.acquisitionEffectiveness?.metrics, 'contradictionCount')
  const sourceCount = getHubCount(discovery?.sourceRegistrySummary, 'count')
  const domainRows = Array.isArray(domainCoverage?.domains) ? domainCoverage.domains : []
  const domainsByName = new Map(domainRows.map((row) => [String(row.domain || '').toLowerCase(), row]))
  const candidates = OVERVIEW_DOMAINS.map((name) => domainsByName.get(name.toLowerCase())).filter(Boolean)
  const missingAreas = Array.isArray(domainCoverage?.missingDomains) ? domainCoverage.missingDomains : []
  const evidenceMetrics = [
    { key: 'total', label: 'Total', value: getHubCount(evidenceSummary, 'evidenceObjectCount') },
    { key: 'accepted', label: 'Accepted', value: evidenceStatusCounts?.accepted ?? null },
    { key: 'review', label: 'Review', value: evidenceStatusCounts?.pending ?? null },
    { key: 'rejected', label: 'Rejected', value: evidenceStatusCounts?.rejected ?? null },
  ]
  const statusCounts = [evidenceStatusCounts?.accepted ?? null, evidenceStatusCounts?.pending ?? null, evidenceStatusCounts?.rejected ?? null]
  const classifiedTotal = statusCounts.every((value) => value !== null)
    ? statusCounts.reduce((sum, value) => sum + value, 0)
    : null
  const evidenceTotal = evidenceMetrics[0].value
  const hasEvidenceDistribution = evidenceTotal !== null && evidenceTotal > 0 && classifiedTotal !== null && classifiedTotal <= evidenceTotal
  const evidenceDistribution = hasEvidenceDistribution ? [
    { key: 'accepted', label: 'Accepted', value: statusCounts[0] },
    { key: 'pending', label: 'Pending review', value: statusCounts[1] },
    { key: 'rejected', label: 'Rejected', value: statusCounts[2] },
    ...(evidenceTotal - classifiedTotal > 0
      ? [{ key: 'other', label: 'Other status', value: evidenceTotal - classifiedTotal }]
      : []),
  ] : []
  const otherEvidenceStatus = evidenceDistribution.find(({ key }) => key === 'other')
  const advisorItems = [
    ...(reviewCandidates > 0 ? [{
      key: 'contradiction-candidates',
      title: 'Review contradiction candidates',
      detail: `${displayHubCount(reviewCandidates)} candidate${reviewCandidates === 1 ? '' : 's'} recorded for human review.`,
      explanation: `The selected revision summary reports ${displayHubCount(reviewCandidates)} contradiction candidates. A person must inspect the underlying evidence and make any governed decision.`,
      destinationHref: qualityHref,
    }] : []),
    ...missingAreas.map((area) => {
      const row = domainsByName.get(String(area || '').toLowerCase())
      const connected = getHubCount(row, 'connectedEvidenceCount')
      const pending = getHubCount(row, 'pendingEvidenceCount')
      return {
        key: String(area),
        title: `Review ${displayHubToken(area)} coverage`,
        detail: `${connected === null ? 'Connected evidence count unavailable' : `${displayHubCount(connected)} connected evidence`}${pending === null ? '' : ` · ${displayHubCount(pending)} pending review`}.`,
        explanation: `The bounded graph coverage summary marks ${displayHubToken(area)} as missing. ${connected === null ? 'Its connected evidence count is unavailable.' : `${displayHubCount(connected)} evidence objects are connected.`}${pending === null ? '' : ` ${displayHubCount(pending)} are pending review.`} This is an informational recommendation; a person must review sources and evidence before making any governed change.`,
      }
    }),
  ].slice(0, 3)
  return (
    <>
      <div className="intelligence-hub__grid intelligence-hub__grid--three intelligence-hub__overview-top">
        <Panel title="Acquisition summary" eyebrow={displayHubToken(discovery?.acquisitionProfile)} className={String(discovery?.acquisitionProfile).toUpperCase() === 'ENHANCED' ? 'intelligence-hub__overview-acquisition--enhanced' : ''} inlineHeader>
          <dl className="intelligence-hub__facts">
            <div><dt>Last acquisition</dt><dd>{compactReadableDate(discovery?.acquisition?.completedAt ?? discovery?.acceptedAt)}</dd></div>
            <div><dt>Sources connected</dt><dd>{displayHubCount(sourceCount)}</dd></div>
            <div><dt>Documents processed</dt><dd>{displayHubCount(getHubCount(discovery?.acquisition?.documentAcquisition, 'documentCount'))}</dd></div>
            <div><dt>Evidence accepted</dt><dd>{displayHubCount(evidenceStatusCounts?.accepted)}</dd></div>
          </dl>
          <DetailButton className="intelligence-hub__acquisition-details" onOpen={onOpen} title="Acquisition details" body="Acquisition brings customer context and sources into the governed evidence record. New acquisition work opens in the existing workspace." >View acquisition details →</DetailButton>
        </Panel>
        <Panel title="Evidence summary" eyebrow="Selected revision" className="intelligence-hub__overview-evidence" inlineHeader>
          <div className="intelligence-hub__mini-metrics" aria-label="Evidence counts">
            {evidenceMetrics.map(({ key, label, value }) => <span key={key} data-status={key} data-available={value !== null}>
              <strong>{displayHubCount(value)}</strong>{label}
            </span>)}
          </div>
          {hasEvidenceDistribution ? <div className="intelligence-hub__evidence-distribution" role="img"
            aria-label={`Evidence status distribution: ${evidenceDistribution.map(({ label, value }) => `${label} ${displayHubCount(value)}`).join(', ')}; total ${displayHubCount(evidenceTotal)}.`}>
            {evidenceDistribution.map(({ key, value }) => <span key={key} data-status={key}
              style={{ width: evidenceTotal > 0 ? `${(value / evidenceTotal) * 100}%` : '0%' }} />)}
          </div> : <p className="intelligence-hub__distribution-unavailable" role="status">Evidence status distribution unavailable for this selected revision.</p>}
          {hasEvidenceDistribution ? <p className="intelligence-hub__evidence-legend" aria-label="Evidence status shares">
            {evidenceDistribution.map(({ label, value }) => `${label} ${Math.round((value / evidenceTotal) * 100)}%`).join(' · ')}
          </p> : null}
          {otherEvidenceStatus ? <p className="intelligence-hub__distribution-other">
            Other status: {displayHubCount(otherEvidenceStatus.value)}
          </p> : null}
          <Button className="intelligence-hub__evidence-review-action" size="sm" variant="ghost" onClick={() => onSelectView('Review', 'Needs review')}>Review exceptions →</Button>
        </Panel>
        <Panel title="Intelligence assurance" eyebrow={summaryValue(renderer?.truthBinding?.certification?.label)} className="intelligence-hub__overview-assurance" inlineHeader>
          <div className="intelligence-hub__assurance-state" data-available={Boolean(renderer?.truthBinding?.certification?.label)}>
            <strong>{summaryValue(renderer?.truthBinding?.certification?.label)}</strong>
            <p>{renderer?.truthBinding?.certification?.summary || 'No certification detail is available for this revision.'}</p>
          </div>
          <DetailButton onOpen={onOpen} title="Intelligence assurance" body="An assurance level must come from an explicit server-owned certification. The Hub does not infer one from coverage, confidence or source counts.">What does assurance mean? →</DetailButton>
        </Panel>
      </div>
      <div className="intelligence-hub__grid intelligence-hub__grid--two intelligence-hub__overview-bottom">
        <Panel title="Coverage heatmap" eyebrow={coverage === null ? 'Coverage unavailable' : `${coverage}% evidence mapped`} className="intelligence-hub__overview-coverage" inlineHeader>
          {candidates.length ? <div className="intelligence-hub__domain-grid">
            {candidates.map((candidate) => {
              const state = String(candidate.state || '').toUpperCase()
              const variant = state === 'STRONG' ? 'success' : ['ADEQUATE', 'WEAK'].includes(state) ? 'warning' : state === 'MISSING' ? 'danger' : 'neutral'
              return (
              <button key={candidate.domain} type="button" className="intelligence-hub__domain" data-state={String(candidate.state || '').toLowerCase()}
                onClick={(event) => onOpen({ title: displayHubToken(candidate.domain), body: `${displayHubCount(getHubCount(candidate, 'connectedEvidenceCount'))} evidence objects are connected to the current intelligence graph for this domain. ${displayHubCount(getHubCount(candidate, 'pendingEvidenceCount'))} pending review; ${displayHubCount(getHubCount(candidate, 'rejectedEvidenceCount'))} rejected. State: ${displayHubToken(candidate.state)}. Open Coverage for all domain detail.` }, event.currentTarget)}>
                <Badge variant={variant} size="sm" className="intelligence-hub__domain-marker" aria-hidden="true">{String(candidate.domain || '').charAt(0).toUpperCase()}</Badge>
                <span className="intelligence-hub__domain-description"><strong>{displayHubToken(candidate.domain)}</strong><span className="intelligence-hub__domain-count">{displayHubCount(getHubCount(candidate, 'connectedEvidenceCount'))} evidence objects</span></span>
                <span className="intelligence-hub__domain-percent" aria-label="Domain coverage percentage unavailable" title="The coverage API does not provide a per-domain percentage">—</span>
                <Badge variant={variant} size="sm" pill className="intelligence-hub__domain-status">{displayHubToken(candidate.state)}</Badge>
              </button>
              )
            })}
          </div> : <div className="intelligence-hub__overview-empty" role="status">
            <span aria-hidden="true">—</span>
            <div><strong>Coverage is unavailable</strong><p>No bounded graph coverage projection is available for this selected revision.</p></div>
          </div>}
        </Panel>
        <Panel title="Recommended next actions" eyebrow="Advisor" className="intelligence-hub__overview-advisor" inlineHeader>
          {advisorItems.length ? <div className="intelligence-hub__advisor-list">{advisorItems.map((item) => {
            const content = <>
              <Badge variant="success" size="sm" className="intelligence-hub__advisor-marker" aria-hidden="true"><MdNorthEast /></Badge>
              <span className="intelligence-hub__advisor-copy"><strong>{item.title}</strong><span>{item.detail}</span></span>
              <Badge size="sm" pill className="intelligence-hub__advisor-priority" title="Recommendation priority is unavailable in the current summary">Unranked</Badge>
              <MdChevronRight className="intelligence-hub__advisor-chevron" aria-hidden="true" />
            </>
            return item.destinationHref
              ? <Link key={item.key} to={item.destinationHref} variant="subtle" underline="none" className="intelligence-hub__action">{content}</Link>
              : <button key={item.key} type="button" className="intelligence-hub__action" onClick={(event) => onOpen({ title: item.title, body: item.explanation }, event.currentTarget)}>{content}</button>
          })}</div> : <div className="intelligence-hub__overview-empty" role="status">
            <span aria-hidden="true">—</span>
            <div><strong>No Advisor recommendation is available</strong><p>The selected revision does not expose a bounded next-action summary.</p></div>
          </div>}
        </Panel>
      </div>
    </>
  )
}

function ContextView({ discovery, onOpen, workbenchHref, onSelectView }) {
  const values = discovery?.inputValues || {}
  const sourceCount = getHubCount(discovery?.sourceRegistrySummary, 'count')
  const evidenceCount = getHubCount(discovery?.evidenceObjectSummary, 'evidenceObjectCount')
  const completeness = [values.companyName, values.marketRegion, values.targetOffer, values.companyWebsite]
  const recorded = completeness.filter((value) => String(value ?? '').trim()).length
  const acquisitionStages = [
    { title: 'Context', detail: discovery?.inputComplete === true ? 'Ready' : discovery?.inputComplete === false ? 'Needs attention' : 'Status unavailable', current: true },
    { title: 'Acquire', detail: 'Existing workbench', current: false },
    { title: 'Sources', detail: sourceCount === null ? 'Summary unavailable' : `${displayHubCount(sourceCount)} recorded`, current: false },
    { title: 'Review', detail: displayHubCount(getHubCount(discovery?.evidenceObjectSummary, 'pendingReviewCount')), current: false },
  ]
  return <>
    <ol className="intelligence-hub__journey" aria-label="Intelligence acquisition stages">
      {acquisitionStages.map((stage, index) => <li key={stage.title} aria-current={stage.current ? 'step' : undefined}>
        <span className="intelligence-hub__journey-index">{index === 0 && discovery?.inputComplete === true ? '✓' : index + 1}</span>
        <span><strong>{stage.title}</strong><small>{stage.detail}</small></span>
      </li>)}
    </ol>
    <div className="intelligence-hub__grid intelligence-hub__grid--two intelligence-hub__context-top">
      <Panel title="What should this acquisition understand?" eyebrow="Acquisition brief">
        <dl className="intelligence-hub__brief-grid">
          <div><dt>Company</dt><dd>{summaryValue(values.companyName)}</dd></div>
          <div><dt>Market</dt><dd>{summaryValue(values.marketRegion)}</dd></div>
          <div><dt>Product or offer</dt><dd>{summaryValue(values.targetOffer)}</dd></div>
          <div><dt>Acquisition profile</dt><dd>{displayHubToken(discovery?.acquisitionProfile)}</dd></div>
        </dl>
        <div className="intelligence-hub__notes"><strong>Optional notes</strong><p>{values.notes || 'No additional acquisition guidance is recorded.'}</p></div>
        <BoundaryLink to={workbenchHref}>Open acquisition in the existing workbench →</BoundaryLink>
      </Panel>
      <Panel title="Acquisition readiness" eyebrow={discovery?.inputComplete === true ? 'Ready to acquire' : discovery?.inputComplete === false ? 'Needs attention' : 'Status unavailable'}>
        <p>{discovery?.acquisitionEffectiveness?.summary || 'Readiness detail is unavailable in this revision summary.'}</p>
        <p className="intelligence-hub__muted">{recorded} of 4 acquisition context fields are present in the selected revision summary.</p>
        <div className="intelligence-hub__required-fields">
          {['Company identity', 'Market and region', 'Target offer', 'Website recorded'].map((label, index) => <span key={label}>
            <strong aria-hidden="true">{completeness[index] ? '✓' : '○'}</strong>{label}
          </span>)}
        </div>
        {discovery?.acquisitionEffectiveness?.recommendation
          ? <div className="intelligence-hub__recommendation"><strong>Recommended improvement</strong><p>{discovery.acquisitionEffectiveness.recommendation}</p></div>
          : <p className="intelligence-hub__muted">No recommended improvement is present in the bounded summary.</p>}
      </Panel>
    </div>
    <div className="intelligence-hub__grid intelligence-hub__grid--three intelligence-hub__context-bottom">
      <Panel title="Website discovery" eyebrow={values.companyWebsite ? 'Website recorded in brief' : 'Source detail unavailable'}>
        <p>{summaryValue(values.companyWebsite)}</p>
        <p className="intelligence-hub__muted">Connection and processing status are not provided by the selected revision summary.</p>
        <BoundaryLink to={workbenchHref}>Manage sources in the existing workbench →</BoundaryLink>
      </Panel>
      <Panel title="Document acquisition" eyebrow="Existing workflow">
        <p>Document batch selection and processing are handled by the existing acquisition workbench.</p>
        <p className="intelligence-hub__muted">No document batch status is available in the selected revision summary.</p>
        <BoundaryLink to={workbenchHref}>Open document acquisition →</BoundaryLink>
      </Panel>
      <Panel title="Evidence continuity" eyebrow="Selected revision">
        <strong className="intelligence-hub__large-value">{displayHubCount(evidenceCount)}</strong>
        <p>Evidence objects recorded for the selected revision. Acceptance totals are unavailable when the summary and evidence read do not agree.</p>
        <DetailButton onOpen={onOpen} title="Evidence continuity" body="Evidence and decisions stay attached to their recorded revision. New evidence does not silently rewrite an existing revision.">Why evidence continuity matters →</DetailButton>
        <Button size="sm" variant="ghost" onClick={() => onSelectView('Sources')}>View current sources →</Button>
      </Panel>
    </div>
  </>
}

function EvidencePagination({ evidencePage, page, setPage, isLoading }) {
  const totalPages = Number(evidencePage?.totalPages) || 1
  return totalPages > 1 ? <div className="intelligence-hub__filters" aria-label="Evidence pages">
    <Button size="sm" variant="outline" disabled={isLoading || page <= 1} onClick={() => setPage(page - 1)}>Previous page</Button>
    <span>Page {page} of {totalPages}</span>
    <Button size="sm" variant="outline" disabled={isLoading || page >= totalPages} onClick={() => setPage(page + 1)}>Next page</Button>
  </div> : null
}

function SourcesView({ discovery, evidencePage, isLoading, onOpen, onSelectView, page, setPage, workbenchHref }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const sources = Array.isArray(evidencePage?.sourceRegistry) ? evidencePage.sourceRegistry : []
  const filtered = sources.filter((source) => {
    const kind = String(source?.sourceType || '').toUpperCase()
    const isWebsite = kind.includes('WEB') || kind === 'URL' || /^https?:/i.test(String(source?.url || ''))
    const isDocument = !isWebsite && (kind.includes('DOCUMENT') || Boolean(source?.sourceFileName || source?.fileName))
    const matchesFilter = filter === 'All' || (filter === 'Website' ? isWebsite : isDocument)
    const label = String(source?.label || source?.url || source?.sourceFileName || source?.fileName || source?.sourceId || '')
    return matchesFilter && label.toLowerCase().includes(search.toLowerCase())
  })
  const selected = filtered.find((source) => source.sourceId === selectedSourceId) || filtered[0] || null
  const selectedEvidence = selected
    ? (Array.isArray(evidencePage?.evidenceObjects) ? evidencePage.evidenceObjects : []).filter((item) => item.sourceId === selected.sourceId)
    : []
  const totalEvidence = getHubCount(evidencePage, 'total')
  return <>
    <div className="intelligence-hub__view-intro">
      <div><p className="intelligence-hub__eyebrow">Source provenance</p><h2>Confirm sources and processing</h2>
        <p>Inspect source provenance and trace evidence to its source.</p></div>
      <BoundaryLink to={workbenchHref} note={null}>＋ Add evidence in workbench →</BoundaryLink>
    </div>
    <div className="intelligence-hub__metrics intelligence-hub__metrics--four intelligence-hub__metrics--compact" aria-label="Source summary">
      <Metric label="Total sources" value={displayHubCount(getHubCount(discovery?.sourceRegistrySummary, 'count'))} hint="Source registry" onOpen={onOpen} detail="A revision-wide source total is unavailable when the source summary is not exposed." />
      <Metric label="Processed" value={displayHubCount(getHubCount(discovery?.sourceRegistrySummary, 'processedCount'))} hint="Processing status" onOpen={onOpen} detail="Processing totals are shown only when an authoritative summary is available." />
      <Metric label="Evidence objects" value={displayHubCount(totalEvidence)} hint="Revision total" onOpen={onOpen} detail="Count from the bounded selected-revision evidence page receipt." />
      <Metric label="Require review" value={displayHubCount(getHubCount(discovery?.evidenceObjectSummary, 'pendingReviewCount'))} hint="Human review" onOpen={onOpen} detail="Missing review totals are unavailable, never assumed to be zero." />
    </div>
    <div className="intelligence-hub__grid intelligence-hub__grid--two intelligence-hub__source-layout">
      <Panel title="Source registry" eyebrow={`${sources.length} sources linked to page ${page}${totalEvidence === null ? '' : ` · ${displayHubCount(totalEvidence)} evidence objects in revision`}`}>
        <label className="intelligence-hub__search">Search sources on this page<input value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="intelligence-hub__filters" role="group" aria-label="Source type filters">
          {['All', 'Website', 'Document'].map((item) => <Button key={item} size="sm" variant={filter === item ? 'secondary' : 'ghost'} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</Button>)}
        </div>
        {isLoading ? <p role="status">Loading sources…</p> : filtered.length ? <ul className="intelligence-hub__list intelligence-hub__source-list">
          {filtered.map((source, index) => <li key={source.sourceId || index}><button type="button" aria-pressed={selected?.sourceId === source.sourceId}
            onClick={() => setSelectedSourceId(source.sourceId || '')}>
            <strong>{source.label || source.url || source.sourceFileName || source.fileName || 'Unnamed source'}</strong>
            <span>{displayHubToken(source.sourceType)} · {displayHubToken(source.acquisitionStatus || source.documentStatus || source.status)}</span>
          </button></li>)}
        </ul> : <p className="intelligence-hub__muted">{evidencePage ? 'No sources match on this page.' : 'Bounded source detail is unavailable.'}</p>}
        <EvidencePagination evidencePage={evidencePage} page={page} setPage={setPage} isLoading={isLoading} />
      </Panel>
      <Panel title="Selected source" eyebrow={selected ? displayHubToken(selected.acquisitionStatus || selected.documentStatus || selected.status) : 'No source selected'}>
        {selected ? <>
          <h3>{selected.label || selected.url || selected.sourceFileName || selected.fileName || 'Source detail'}</h3>
          <dl className="intelligence-hub__facts">
            <div><dt>Type</dt><dd>{displayHubToken(selected.sourceType)}</dd></div>
            <div><dt>Processing</dt><dd>{displayHubToken(selected.acquisitionStatus || selected.documentStatus || selected.status)}</dd></div>
            <div><dt>Evidence linked on this page</dt><dd>{displayHubCount(selectedEvidence.length)}</dd></div>
          </dl>
          {selectedEvidence.length ? <ul className="intelligence-hub__related-evidence">{selectedEvidence.slice(0, 4).map((item, index) => <li key={item.evidenceObjectId || index}>
            <strong>{displayHubToken(item.coverageArea || item.domain || item.sectionKey)}</strong><span>{item.extractedFact || item.summary || 'Evidence detail unavailable'}</span>
          </li>)}</ul> : <p className="intelligence-hub__muted">No matching evidence objects are present in this bounded page.</p>}
          <DetailButton onOpen={onOpen} title="Source provenance" body="Source details are limited to the selected page. The complete Source Registry is outside the page-local Sources scope accepted for this sprint.">About this source view →</DetailButton>
        </> : <p className="intelligence-hub__muted">Select a source from the current evidence page to inspect its available provenance.</p>}
        <Button size="sm" variant="ghost" onClick={() => onSelectView('Review')}>Continue to Review →</Button>
        <BoundaryLink to={workbenchHref}>Open source workbench →</BoundaryLink>
      </Panel>
    </div>
  </>
}

function ReviewView({ discovery, evidencePage, isLoading, onOpen, qualityHref, page, setPage, filter, onFilterChange }) {
  const evidence = Array.isArray(evidencePage?.evidenceObjects) ? evidencePage.evidenceObjects : []
  const [selectedId, setSelectedId] = useState('')
  const selected = evidence.find((item) => (item.evidenceObjectId || item.id) === selectedId) || evidence[0] || null
  const source = selected && (evidencePage?.sourceRegistry || []).find((item) => item.sourceId === selected.sourceId)
  const summary = discovery?.evidenceObjectSummary
  const filterValues = ['Needs review', 'All', 'Approved', 'Rejected']
  return <>
    <div className="intelligence-hub__review-intro">
      <div><p className="intelligence-hub__eyebrow">Evidence review</p><h2>Resolve evidence requiring attention</h2>
        <p>Inspect the recorded evidence and review state. Decisions remain with the governed review workflow.</p></div>
      <BoundaryLink to={qualityHref}>Open Intelligence Quality →</BoundaryLink>
    </div>
    <div className="intelligence-hub__metrics intelligence-hub__metrics--four intelligence-hub__metrics--compact" aria-label="Evidence review summary">
      <Metric label="Evidence objects" value={displayHubCount(getHubCount(summary, 'evidenceObjectCount'))} hint="Selected revision" onOpen={onOpen} detail="Count from the bounded selected-revision evidence summary." />
      <Metric label="Already accepted" value={displayHubCount(getHubCount(summary, 'acceptedEvidenceCount'))} hint="Recorded summary" onOpen={onOpen} detail="An unavailable count is not treated as zero or inferred from the current page." />
      <Metric label="Needs review" value={displayHubCount(getHubCount(summary, 'pendingReviewCount'))} hint="Human decision" onOpen={onOpen} detail="The Hub does not approve or reject evidence." />
      <Metric label="Rejected" value={displayHubCount(getHubCount(summary, 'rejectedEvidenceCount'))} hint="Recorded summary" onOpen={onOpen} detail="The count is shown only when supplied by a consistent server summary." />
    </div>
    <div className="intelligence-hub__grid intelligence-hub__grid--two intelligence-hub__review-layout">
      <Panel title="Exception queue" eyebrow={`${filter} · ${evidence.length ? `${evidence.length} shown on this page` : 'selected revision'}`}>
        <div className="intelligence-hub__filters" role="group" aria-label="Review filters">
          {filterValues.map((label) => <Button key={label} size="sm" variant={filter === label ? 'secondary' : 'ghost'} aria-pressed={filter === label} onClick={() => onFilterChange(label)}>{label}</Button>)}
        </div>
        {isLoading ? <p role="status">Loading evidence candidates…</p> : evidence.length ? <ul className="intelligence-hub__list">
          {evidence.map((item, index) => {
            const key = item.evidenceObjectId || item.id || `${item.sourceId}-${index}`
            const candidateSource = (evidencePage?.sourceRegistry || []).find((sourceItem) => sourceItem.sourceId === item.sourceId)
            return <li key={key}><button type="button" aria-pressed={selected && (selected.evidenceObjectId || selected.id) === key}
              onClick={() => setSelectedId(key)}>
              <strong>{item.extractedFact || item.summary || 'Evidence candidate'}</strong><span>{displayHubToken(item.reviewStatus)}</span>
              <small>{candidateSource?.label || candidateSource?.sourceFileName || 'Source provenance available in the selected evidence record'}</small>
            </button></li>
          })}
        </ul> : <p className="intelligence-hub__muted">{filter === 'Needs review' && evidencePage ? 'No candidates match this review filter in the selected revision.' : evidencePage ? 'No candidates match this review filter on the bounded page.' : 'Evidence candidates are unavailable for this revision.'}</p>}
        <EvidencePagination evidencePage={evidencePage} page={page} setPage={setPage} isLoading={isLoading} />
      </Panel>
      <Panel title="Selected evidence" eyebrow={selected ? displayHubToken(selected.reviewStatus) : 'No candidate selected'}>
        {selected ? <>
          <h3>{selected.extractedFact || selected.summary || 'Evidence candidate'}</h3>
          <dl className="intelligence-hub__facts">
            <div><dt>Review state</dt><dd>{displayHubToken(selected.reviewStatus)}</dd></div>
            <div><dt>Confidence</dt><dd>{summaryValue(selected.confidence?.score ?? selected.confidence)}</dd></div>
            <div><dt>Source</dt><dd>{source?.label || source?.sourceFileName || source?.url || 'Unavailable'}</dd></div>
          </dl>
          <p className="intelligence-hub__muted">The Hub provides explanation only. Approval and rejection are recorded in the governed review workflow.</p>
          <DetailButton onOpen={onOpen} title="Why this needs attention" body="Only a human reviewer can decide whether the candidate is accepted, rejected or deferred. This view does not change the evidence record.">Why this needs attention →</DetailButton>
        </> : <p className="intelligence-hub__muted">A selected evidence detail is unavailable because no candidate matched this filter.</p>}
        <BoundaryLink to={qualityHref}>Continue in Intelligence Quality →</BoundaryLink>
        <button type="button" className="intelligence-hub__inline-action" onClick={() => { onFilterChange('All'); setPage(1) }}>← Show all evidence</button>
      </Panel>
    </div>
  </>
}

function ReadinessView({ renderer, discovery, onOpen, qualityHref, workbenchHref }) {
  const readiness = discovery?.discoveryHealth?.readiness
  const locked = renderer?.lock?.locked === true
  const activity = Array.isArray(renderer?.activity) ? renderer.activity : []
  const activityLabel = (item) => item.summary || item.description || item.label || displayHubToken(item.eventType || item.action || item.type)
  const activityDate = (item) => readableDate(item.occurredAt || item.createdAt || item.timestamp)
  return <div className="intelligence-hub__grid intelligence-hub__grid--two">
    <Panel title="Review the selected revision" eyebrow="Readiness and publication">
      <dl className="intelligence-hub__facts">
        <div><dt>Selected revision</dt><dd>{summaryValue(renderer?.revision?.revisionNumber ? `R${renderer.revision.revisionNumber}` : '')}</dd></div>
        <div><dt>Lifecycle</dt><dd>{displayHubToken(renderer?.lifecycle?.stage)}</dd></div>
        <div><dt>Canonical readiness</dt><dd>{displayHubToken(renderer?.readiness?.state)}</dd></div>
        <div><dt>Discovery readiness</dt><dd>{displayHubToken(readiness?.state)}</dd></div>
        <div><dt>Publication</dt><dd>{displayHubToken(renderer?.publish?.state)}</dd></div>
        <div><dt>Lock snapshot</dt><dd>{locked ? 'Locked' : displayHubToken(renderer?.lock?.state)}</dd></div>
      </dl>
      <DetailButton onOpen={onOpen} title="Publication control" body="Publication and locking are governed actions. This Hub displays recorded readiness only; it does not publish, lock or create a revision.">What changes at publication? →</DetailButton>
    </Panel>
    <Panel title="Publication boundary" eyebrow="Human authority">
      <Status variant={renderer?.readiness?.state ? 'info' : 'warning'} size="sm">{displayHubToken(renderer?.readiness?.state)}</Status>
      <p>{renderer?.readiness?.reason || 'No readiness explanation is available for this revision.'}</p>
      <p>Open findings must be reviewed by an authorised person. Informational guidance does not approve evidence.</p>
      <p className="intelligence-hub__muted">The bounded renderer does not expose a publication checklist for this revision.</p>
      <BoundaryLink to={qualityHref}>Review quality findings →</BoundaryLink>
      <DetailButton onOpen={onOpen} title="Lock snapshot" body={locked
        ? `Revision ${renderer?.revision?.revisionNumber || ''} is recorded as locked. New evidence cannot silently alter its accepted understanding.`
        : 'No locked snapshot is recorded for this selected revision. Publication and revision creation remain in the existing governed workflow.'}>What is retained in a lock snapshot? →</DetailButton>
    </Panel>
    <Panel title="Decision and assurance history" eyebrow="Recorded events">
      <p>{activity.length ? `${activity.length} activity records are available in the selected revision summary.` : 'History detail is unavailable in this bounded projection.'}</p>
      {activity.length ? <ol className="intelligence-hub__history-list">{activity.slice(0, 6).map((item, index) => <li key={item.id || item.eventId || `${item.type}-${index}`}>
        <span className="intelligence-hub__history-dot" aria-hidden="true">{item.status === 'COMPLETED' ? '✓' : '·'}</span>
        <div><strong>{activityLabel(item) || 'Recorded event'}</strong><small>{activityDate(item)}</small></div>
      </li>)}</ol> : null}
      <DetailButton onOpen={onOpen} title="Assurance history" body="History is read from recorded activity and control projections. The Hub does not infer approval, publication or assurance from an empty history.">Understand control history →</DetailButton>
      <BoundaryLink to={workbenchHref}>Open existing publication workflow →</BoundaryLink>
    </Panel>
  </div>
}

function AfterLockView({ renderer, onOpen, workbenchHref }) {
  const lockToken = String(renderer?.lock?.state || '').toUpperCase()
  const lockedSignal = renderer?.lock?.locked === true || lockToken === 'LOCKED'
  const unlockedSignal = renderer?.lock?.locked === false || lockToken === 'UNLOCKED'
  const lockKnown = lockedSignal !== unlockedSignal
  const locked = lockKnown && lockedSignal
  const unlocked = lockKnown && unlockedSignal
  const lockState = locked ? 'LOCKED' : unlocked ? 'UNLOCKED' : ''
  const postLockMetric = (label, hint, detail) => ({
    value: unlocked ? 'Not active' : 'Unavailable',
    hint: unlocked ? 'Selected revision is unlocked' : hint,
    detail: unlocked
      ? 'After-lock items apply only after the selected revision is locked. This revision is currently unlocked.'
      : detail,
    label,
  })
  const discoveryMetric = postLockMetric('Items in discovery', 'No post-lock inbox projection', 'The current bounded customer read models do not expose a post-lock discovery inbox for this revision.')
  const decisionMetric = postLockMetric('Needs a decision', 'Recorded decisions only', 'A missing post-lock read model does not establish that no decisions are pending.')
  const impactMetric = postLockMetric('May require an update', 'No revision impact projection', 'Impact on a future revision must come from an authorised recorded decision.')
  return <>
    <div className="intelligence-hub__view-intro">
      <div><p className="intelligence-hub__eyebrow">New evidence after lock</p><h2>{locked
        ? 'Keep gathering evidence without changing the locked revision'
        : unlocked
          ? 'After-lock review starts when the selected revision is locked'
          : 'Confirm the lock state before reviewing post-lock evidence'}</h2>
        <p>{locked
          ? 'New material can support, qualify or challenge a locked revision. Only an authorised decision can change a later revision.'
          : unlocked
            ? 'The selected revision is not locked, so after-lock evidence and decision history are not active yet.'
            : 'The selected revision’s lock state is unavailable or inconsistent. Post-lock evidence is not inferred.'}</p></div>
      <Status variant={locked ? 'success' : 'info'} size="sm">{locked ? 'Locked revision' : unlocked ? 'Not locked' : 'Lock state unavailable'}</Status>
    </div>
    <div className="intelligence-hub__metrics intelligence-hub__metrics--three intelligence-hub__metrics--compact" aria-label="After lock summary">
      <Metric {...discoveryMetric} onOpen={onOpen} />
      <Metric {...decisionMetric} onOpen={onOpen} />
      <Metric {...impactMetric} onOpen={onOpen} />
    </div>
    <div className="intelligence-hub__grid intelligence-hub__grid--two intelligence-hub__after-lock-layout">
      <Panel title="Discovery inbox" eyebrow="Post-lock evidence">
        <div className="intelligence-hub__filters" role="group" aria-label="Discovery inbox filters">
          {['All', 'Needs decision', 'Accepted', 'New evidence'].map((item, index) => <Button key={item} size="sm" variant={index === 0 ? 'secondary' : 'ghost'} disabled aria-pressed={index === 0}>{item}</Button>)}
        </div>
        <p className="intelligence-hub__empty-state">{unlocked
          ? 'Post-lock inbox is not active because the selected revision is unlocked.'
          : locked
            ? 'Post-lock inbox items are not available from the bounded read models for this selected revision.'
            : 'Post-lock inbox state is unavailable because the selected revision lock state could not be verified.'}</p>
        <p className="intelligence-hub__muted">General revision activity is not treated as new post-lock evidence.</p>
        <BoundaryLink to={workbenchHref}>Open existing revision workbench →</BoundaryLink>
      </Panel>
      <Panel title="Evidence impact and history" eyebrow="Human authority">
        <p>Accept, qualify, challenge or defer are decisions for the governed review workflow. This Hub makes no automatic impact decision.</p>
        <dl className="intelligence-hub__facts">
          <div><dt>Selected revision</dt><dd>{summaryValue(renderer?.revision?.revisionNumber ? `R${renderer.revision.revisionNumber}` : '')}</dd></div>
          <div><dt>Lock snapshot</dt><dd>{locked ? displayHubToken(renderer?.lock?.snapshotId || renderer?.lock?.lockedAt) : displayHubToken(lockState)}</dd></div>
          <div><dt>Post-lock decision history</dt><dd>Unavailable</dd></div>
        </dl>
        <DetailButton onOpen={onOpen} title="Why After lock is separate" body="New evidence cannot silently change accepted understanding in a locked revision. An authorised person must decide whether it affects a later revision.">Why this is separate →</DetailButton>
        <BoundaryLink to={workbenchHref}>Open the existing discovery workflow →</BoundaryLink>
      </Panel>
    </div>
  </>
}

function CoverageView({ discovery, graphCoverage, onOpen, qualityHref, workbenchHref }) {
  const health = discovery?.discoveryHealth
  const graphSummary = graphCoverage?.available === true
    && graphCoverage?.coverage?.coverageModel === 'EVIDENCE_DOMAIN_COVERAGE'
    ? graphCoverage.coverage
    : null
  const [filter, setFilter] = useState('All')
  const [selectedKey, setSelectedKey] = useState('')
  const areas = Array.isArray(graphSummary?.domains) ? graphSummary.domains : []
  const group = (item) => {
    const state = String(item.signalStrength || item.state || '').toUpperCase()
    if (state === 'STRONG') return 'Strong'
    if (state === 'ADEQUATE' || state === 'MODERATE') return 'Adequate'
    if (state === 'GAP' || state === 'WEAK' || state === 'REVIEW' || state === 'MISSING') return 'Gaps'
    return 'Other'
  }
  const filtered = areas.filter((item) => filter === 'All' || group(item) === filter)
  const selected = areas.find((item, index) => (item.signalId || item.area || item.domain || String(index)) === selectedKey) || filtered[0] || null
  const coverage = getHubCount(graphSummary, 'coveragePercent')
  const missingDomainCount = Array.isArray(graphSummary?.missingDomains) ? graphSummary.missingDomains.length : null
  return <>
    <div className="intelligence-hub__view-intro">
      <div><p className="intelligence-hub__eyebrow">Intelligence health</p><h2>Understand where intelligence is sufficiently supported</h2>
        <p>{health?.readiness?.reason || 'Coverage is diagnostic. It does not certify truth or approve a publication.'}</p></div>
      <div className="intelligence-hub__readiness-statuses">
        <span><small>Discovery readiness</small><strong>{displayHubToken(health?.readiness?.state)}</strong></span>
        <span><small>Workspace use</small><strong>{displayHubToken(health?.readiness?.workspaceUse)}</strong></span>
        <span><small>Confidence</small><strong>{displayHubToken(health?.confidence)}</strong></span>
      </div>
    </div>
    <div className="intelligence-hub__metrics intelligence-hub__metrics--four intelligence-hub__metrics--compact" aria-label="Coverage summary">
      <Metric label="Evidence mapped" value={coverage === null ? 'Unavailable' : `${coverage}%`} hint="Selected revision" onOpen={onOpen} detail="Coverage percent is supplied by the selected revision summary." />
      <Metric label="Required domains" value={displayHubCount(getHubCount(graphSummary, 'totalDomainCount'))} hint="Recorded graph coverage summary" onOpen={onOpen} detail="The bounded graph coverage summary supplies this domain total." />
      <Metric label="Supported" value={displayHubCount(getHubCount(graphSummary, 'coveredDomainCount'))} hint="Recorded graph coverage summary" onOpen={onOpen} detail="The bounded graph coverage summary supplies this supported-domain total." />
      <Metric label="Material gaps" value={displayHubCount(missingDomainCount)} hint="Recorded graph coverage summary" onOpen={onOpen} detail="This count is the number of missing domains returned by the bounded graph coverage summary." />
    </div>
    <div className="intelligence-hub__grid intelligence-hub__grid--two intelligence-hub__coverage-layout">
      <Panel title="Coverage map" eyebrow={`${graphSummary ? displayHubCount(getHubCount(graphSummary, 'totalDomainCount')) : 'Unavailable'} domains in selected revision summary`}>
        <div className="intelligence-hub__filters" role="group" aria-label="Coverage filters">
          {['All', 'Strong', 'Adequate', 'Gaps'].map((item) => <Button key={item} size="sm" variant={filter === item ? 'secondary' : 'ghost'} aria-pressed={filter === item} onClick={() => { setFilter(item); setSelectedKey('') }}>{item}</Button>)}
        </div>
        {filtered.length ? <ul className="intelligence-hub__list">{filtered.map((item, index) => {
          const key = item.signalId || item.area || item.domain || String(index)
          const areaName = item.area || item.domain || item.signalId
          const connectedEvidenceCount = getHubCount(item, 'connectedEvidenceCount')
          return <li key={key}><button type="button" aria-pressed={selected?.signalId === item.signalId || selected?.area === item.area || selected?.domain === item.domain}
            onClick={() => setSelectedKey(key)}>
            <strong>{displayHubToken(areaName)}</strong><span>{displayHubToken(item.state)} · {connectedEvidenceCount === null ? 'Connected evidence unavailable' : `${displayHubCount(connectedEvidenceCount)} connected evidence`}</span>
            <small>{displayHubCount(getHubCount(item, 'acceptedEvidenceCount'))} accepted · {displayHubCount(getHubCount(item, 'pendingEvidenceCount'))} pending · {displayHubCount(getHubCount(item, 'rejectedEvidenceCount'))} rejected</small>
          </button></li>
        })}</ul> : <p className="intelligence-hub__empty-state">{areas.length ? 'No domains match this filter.' : 'No domain coverage projection is available for this selected revision.'}</p>}
        <BoundaryLink to={qualityHref}>Review recommended items →</BoundaryLink>
      </Panel>
      <Panel title={selected ? `${displayHubToken(selected.area || selected.domain)} domain` : 'Selected domain'} eyebrow={selected ? displayHubToken(group(selected)) : 'No domain selected'}>
        {selected ? <>
          <p>{selected.summary || selected.explanation || 'The graph coverage summary provides evidence counts and state, but no prose explanation for this domain.'}</p>
          <dl className="intelligence-hub__facts">
            <div><dt>Coverage</dt><dd>Per-domain percentage unavailable</dd></div>
            <div><dt>Connected evidence</dt><dd>{displayHubCount(getHubCount(selected, 'connectedEvidenceCount'))}</dd></div>
            <div><dt>Confidence</dt><dd>{displayHubToken(selected.confidence)}</dd></div>
          </dl>
          <DetailButton onOpen={onOpen} title={`${displayHubToken(selected.area || selected.domain)} coverage`} body="Coverage describes current evidence support. It is diagnostic guidance, not a resolution or assurance decision.">Why this matters →</DetailButton>
        </> : <p className="intelligence-hub__muted">A selected-domain detail is unavailable because no coverage domain is present in the bounded summary.</p>}
        <BoundaryLink to={workbenchHref}>Acquire evidence in the workbench →</BoundaryLink>
      </Panel>
    </div>
  </>
}

function GraphView({ manifest, graph, isLoading, onOpen, qualityHref, workbenchHref }) {
  const [mode, setMode] = useState('Journey')
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState('')
  const nodes = (Array.isArray(graph?.nodes) ? graph.nodes : Array.isArray(graph?.elements) ? graph.elements : [])
    .filter((node) => node?.customerVisible !== false)
  const type = (node) => String(node?.nodeType || node?.type || '').toUpperCase()
  const nodeLabel = (node) => node?.entityDisplayName || displayHubToken(type(node))
  const focusNodes = mode === 'Lineage'
    ? nodes.filter((node) => ['SOURCE', 'EVIDENCE', 'INTELLIGENCE', 'SECTION_TRUTH', 'PUBLISHED_TRUTH', 'CANONICAL_TRUTH'].includes(type(node)))
    : mode === 'Impact'
      ? nodes.filter((node) => ['SECTION_TRUTH', 'PUBLISHED_TRUTH', 'CANONICAL_TRUTH', 'OUTPUT_REFERENCE', 'REASONING_CONSUMER', 'SIGNAL'].includes(type(node)))
      : mode === 'Gaps' || mode === 'Contradictions' ? [] : nodes
  const edges = Array.isArray(graph?.edges) ? graph.edges.filter((edge) => edge?.customerVisible !== false) : []
  const contradictionEdges = edges.filter((edge) => ['EVIDENCE_CONTRADICTS_EVIDENCE', 'INTELLIGENCE_CONTRADICTS_INTELLIGENCE'].includes(String(edge.edgeType || '').toUpperCase()))
  const focusEntries = mode === 'Gaps'
    ? (Array.isArray(graph?.coverage?.missingDomains) ? graph.coverage.missingDomains : []).map((domain) => ({ key: String(domain), label: displayHubToken(domain), kind: 'Coverage gap' }))
    : mode === 'Contradictions'
      ? contradictionEdges.map((edge) => {
        const left = nodes.find((node) => (node.id || node.nodeId) === edge.fromNodeId)
        const right = nodes.find((node) => (node.id || node.nodeId) === edge.toNodeId)
        return { key: edge.edgeId, label: `${left ? nodeLabel(left) : 'Recorded object'} ↔ ${right ? nodeLabel(right) : 'recorded object'}`, kind: edge.relationshipDisplayName || 'Recorded contradiction' }
      })
      : focusNodes.map((node) => ({ key: node.id || node.nodeId, label: nodeLabel(node), kind: displayHubToken(node.type || node.nodeType), node }))
  const filtered = focusEntries.filter((entry) => entry.label.toLowerCase().includes(search.toLowerCase())).slice(0, 12)
  const selected = filtered.find((entry) => (entry.key || entry.label) === selectedKey) || filtered[0] || null
  const relatedEdges = selected?.node
    ? edges.filter((edge) => [edge.fromNodeId, edge.toNodeId].includes(selected.key)).slice(0, 6)
    : []
  const relatedLabels = relatedEdges.map((edge) => {
    const otherId = edge.fromNodeId === selected.key ? edge.toNodeId : edge.fromNodeId
    const other = nodes.find((node) => (node.id || node.nodeId) === otherId)
    return { label: other ? nodeLabel(other) : 'Related object', relationship: edge.relationshipDisplayName || displayHubToken(edge.edgeType) }
  })
  const graphState = manifest?.status ? displayHubToken(manifest.status) : 'Unavailable'
  const graphVersion = manifest?.graphVersion ? displayHubToken(manifest.graphVersion) : 'Unavailable'
  return <>
    <div className="intelligence-hub__view-intro">
      <div><p className="intelligence-hub__eyebrow">Explainability and impact</p><h2>Intelligence Graph</h2>
        <p>Trace available, customer-visible relationships from recorded evidence to the understanding and outcomes they support.</p></div>
      <div className="intelligence-hub__graph-links">
        <BoundaryLink to={workbenchHref} note="Graph actions remain in the selected workspace workflow.">Open selected workspace →</BoundaryLink>
        <BoundaryLink to={qualityHref} note="Human review remains in Intelligence Quality.">Open Intelligence Quality →</BoundaryLink>
      </div>
    </div>
    <div className="intelligence-hub__metrics intelligence-hub__metrics--three intelligence-hub__metrics--compact" aria-label="Graph summary">
      <Metric label="Graph objects" value={displayHubCount(getHubCount(manifest?.counts, 'nodeCount'))} hint="Selected revision" onOpen={onOpen} detail="Object totals are shown only from the selected revision's graph manifest." />
      <Metric label="Relationships" value={displayHubCount(getHubCount(manifest?.counts, 'edgeCount'))} hint="Selected revision" onOpen={onOpen} detail="Relationship totals are shown only from the selected revision's graph manifest." />
      <Metric label="Graph version" value={graphVersion} hint={`Graph state · ${graphState}`} onOpen={onOpen} detail="The graph version and currentness state are provided by the selected revision manifest." />
    </div>
    <div className="intelligence-hub__grid intelligence-hub__grid--two intelligence-hub__graph-layout">
      <Panel title={mode === 'Journey' ? 'Complete journey' : mode} eyebrow="Focused graph objects">
        <p>{mode === 'Journey' ? 'Follow customer-visible objects and their recorded relationships through the selected revision.' : `Inspect ${mode.toLowerCase()} present in the selected revision graph.`}</p>
        <div className="intelligence-hub__filters" role="group" aria-label="Intelligence Graph modes">
          {['Journey', 'Lineage', 'Impact', 'Gaps', 'Contradictions'].map((item) => <Button key={item} size="sm" variant={mode === item ? 'secondary' : 'ghost'} aria-pressed={mode === item} onClick={() => { setMode(item); setSelectedKey('') }}>{item}</Button>)}
        </div>
        <label className="intelligence-hub__search">Search this graph view<input value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        {isLoading ? <p role="status">Loading graph focus…</p> : filtered.length ? <ul className="intelligence-hub__list intelligence-hub__graph-list">{filtered.map((entry, index) => <li key={entry.key || `${entry.label}-${index}`}>
          <button type="button" aria-pressed={selected === entry} onClick={() => setSelectedKey(entry.key || entry.label)}>
            <span className="intelligence-hub__graph-step"><strong>{entry.label}</strong><span>{entry.kind}</span></span>
            {entry.node ? <small>{relatedEdges.length && selected?.key === entry.key ? `${relatedEdges.length} recorded relationship${relatedEdges.length === 1 ? '' : 's'}` : 'Select to inspect recorded relationships'}</small> : null}
          </button>
        </li>)}</ul> : <p className="intelligence-hub__empty-state">{graph ? 'No customer-visible objects match this graph view.' : 'A current graph manifest and projection are unavailable for this selected revision.'}</p>}
      </Panel>
      <Panel title={selected ? selected.label : 'Selected graph object'} eyebrow={selected ? selected.kind : 'No object selected'}>
        {selected ? <>
          <p>{selected.node ? 'This object is shown from the selected revision graph. Its recorded relationships are listed below.' : `${selected.kind}. This is an informational relationship from the selected revision graph.`}</p>
          <dl className="intelligence-hub__facts">
            <div><dt>Graph state</dt><dd>{graphState}</dd></div>
            <div><dt>Graph version</dt><dd>{graphVersion}</dd></div>
            <div><dt>Recorded relationships</dt><dd>{selected.node ? displayHubCount(relatedEdges.length) : 'Unavailable'}</dd></div>
          </dl>
          {relatedLabels.length ? <ul className="intelligence-hub__related-evidence">{relatedLabels.map((item, index) => <li key={`${item.relationship}-${item.label}-${index}`}><strong>{item.relationship}</strong><span>{item.label}</span></li>)}</ul> : <p className="intelligence-hub__muted">No customer-visible relationship detail is available for this object.</p>}
          <DetailButton onOpen={onOpen} title="Graph relationships" body="Graph relationships are read-only explanations of governed records. They do not edit nodes, edges, evidence or the selected revision.">Why this relationship is shown →</DetailButton>
        </> : <p className="intelligence-hub__muted">Selected-object detail is unavailable until a current graph projection is exposed for this revision.</p>}
      </Panel>
    </div>
  </>
}

export default function IntelligenceHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const workspaceId = String(searchParams.get('runtimeInstanceId') || '').trim()
  const revisionId = String(searchParams.get('revisionId') || '').trim()
  const { customerId, tenantId } = useTenantContext()
  const contextKey = `${workspaceId}:${revisionId}:${customerId}:${tenantId}`
  const viewIndex = Math.max(0, getHubViewFromSearch(`?${searchParams.toString()}`))
  const view = HUB_VIEWS[viewIndex]
  const [info, setInfo] = useState(null)
  const [evidencePageNumber, setEvidencePageNumber] = useState(1)
  const [reviewFilter, setReviewFilter] = useState('Needs review')
  const visibleInfo = info?.contextKey === contextKey ? info : null
  const openerRef = useRef(null)
  const requiredContext = Boolean(workspaceId && revisionId && customerId && tenantId)
  const {
    currentData: rendererResponse,
    isLoading: rendererLoading,
    isFetching: rendererFetching,
    error: rendererError,
    refetch: refetchRenderer,
  } = useGetRuntimeRendererQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId },
    { skip: !requiredContext },
  )
  const renderer = getHubPayload(rendererResponse)
  const context = validateHubContext({ renderer, workspaceId, revisionId, customerId, tenantId })
  const canReadDetail = context.valid
  const { currentData: summaryEvidenceResponse, isLoading: summaryEvidenceLoading, isFetching: summaryEvidenceFetching, refetch: refetchSummaryEvidence } = useGetRuntimeStateEvidenceQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, page: 1, pageSize: 1 },
    { skip: !canReadDetail },
  )
  const summaryEvidencePage = getHubEvidencePage(summaryEvidenceResponse)
  const needsOverviewCounts = view === 'Overview'
  const { currentData: acceptedEvidenceResponse, error: acceptedEvidenceError, isFetching: acceptedEvidenceFetching, refetch: refetchAcceptedEvidence } = useGetRuntimeStateEvidenceQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, page: 1, pageSize: 1, reviewStatus: 'ACCEPTED' },
    { skip: !canReadDetail || !needsOverviewCounts },
  )
  const { currentData: pendingEvidenceResponse, error: pendingEvidenceError, isFetching: pendingEvidenceFetching, refetch: refetchPendingEvidence } = useGetRuntimeStateEvidenceQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, page: 1, pageSize: 1, reviewStatus: 'PENDING' },
    { skip: !canReadDetail || !needsOverviewCounts },
  )
  const { currentData: rejectedEvidenceResponse, error: rejectedEvidenceError, isFetching: rejectedEvidenceFetching, refetch: refetchRejectedEvidence } = useGetRuntimeStateEvidenceQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, page: 1, pageSize: 1, reviewStatus: 'REJECTED' },
    { skip: !canReadDetail || !needsOverviewCounts },
  )
  const evidenceStatusCounts = {
    accepted: getHubEvidenceStatusCount(acceptedEvidenceResponse, acceptedEvidenceError, summaryEvidencePage),
    pending: getHubEvidenceStatusCount(pendingEvidenceResponse, pendingEvidenceError, summaryEvidencePage),
    rejected: getHubEvidenceStatusCount(rejectedEvidenceResponse, rejectedEvidenceError, summaryEvidencePage),
  }
  const needsEvidence = view === 'Sources' || view === 'Review'
  const {
    data: evidenceResponse,
    isLoading: evidenceLoading,
    isFetching: evidenceFetching,
    error: evidenceError,
  } = useGetRuntimeStateEvidenceQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, page: evidencePageNumber, pageSize: 25,
      reviewStatus: view === 'Review' && reviewFilter !== 'All'
        ? ({ 'Needs review': 'PENDING', Approved: 'ACCEPTED', Rejected: 'REJECTED' }[reviewFilter] || '')
        : '' },
    { skip: !canReadDetail || !needsEvidence },
  )
  // The V2 endpoint reports an empty first filtered page as EVIDENCE_MISSING.
  // A successful unfiltered count distinguishes that from missing storage.
  const emptyFilteredPage = view === 'Review' && reviewFilter !== 'All'
    && summaryEvidencePage && evidenceError?.data?.error?.code === 'RUNTIME_STATE_V2_EVIDENCE_MISSING'
  const evidencePage = emptyFilteredPage
    ? { evidenceObjects: [], total: 0, page: 1, pageSize: 25 }
    : getHubEvidencePage(evidenceResponse)
  const needsGraphManifest = view === 'Intelligence Graph'
  const { data: graphManifestResponse } = useGetRuntimeStateGraphManifestQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId },
    { skip: !canReadDetail || !needsGraphManifest },
  )
  const manifest = getHubPayload(graphManifestResponse)?.manifest ?? getHubPayload(graphManifestResponse)
  const { data: graphResponse, isLoading: graphLoading } = useGetRuntimeStateGraphProjectionQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId },
    { skip: !canReadDetail || view !== 'Intelligence Graph' || manifest?.status !== 'CURRENT' },
  )
  const graph = getHubPayload(graphResponse)?.graph ?? getHubPayload(graphResponse)
  const { currentData: graphCoverageResponse, isFetching: graphCoverageFetching, refetch: refetchGraphCoverage } = useGetRuntimeIntelligenceGraphCoverageQuery(
    { runtimeInstanceId: revisionId },
    { skip: !canReadDetail || (view !== 'Overview' && view !== 'Coverage') },
  )
  const graphCoverage = getHubPayload(graphCoverageResponse)
  const overviewReads = [
    [summaryEvidenceResponse, summaryEvidenceFetching],
    [acceptedEvidenceResponse, acceptedEvidenceFetching],
    [pendingEvidenceResponse, pendingEvidenceFetching],
    [rejectedEvidenceResponse, rejectedEvidenceFetching],
    [graphCoverageResponse, graphCoverageFetching],
  ]
  const overviewPending = view === 'Overview' && overviewReads.some(([response, fetching]) => !response && fetching)
  const overviewRefreshing = rendererFetching || overviewReads.some(([, fetching]) => fetching)
  const refreshOverview = () => {
    [refetchRenderer, refetchSummaryEvidence, refetchAcceptedEvidence, refetchPendingEvidence,
      refetchRejectedEvidence, refetchGraphCoverage].forEach((refetch) => refetch())
  }
  const discovery = summaryEvidenceLoading || !summaryEvidencePage
    ? null
    : reconcileHubDiscovery(getHubDiscovery(renderer), summaryEvidencePage)
  const qualityHref = context.valid ? getHubDestinationHref('quality', workspaceId, revisionId) : ''
  const workbenchHref = context.valid ? `${getHubReturnHref(revisionId)}/workbench` : ''

  const openInfo = (nextInfo, opener) => {
    openerRef.current = opener
    setInfo({ ...nextInfo, contextKey })
  }
  const closeInfo = () => {
    setInfo(null)
    openerRef.current?.focus()
  }
  const selectView = (nextView, nextReviewFilter) => {
    setInfo(null)
    setEvidencePageNumber(1)
    if (nextView === 'Review' && nextReviewFilter) setReviewFilter(nextReviewFilter)
    setSearchParams(`?${getHubContextSearch(workspaceId, revisionId, nextView)}`, { replace: true })
  }
  const selectReviewFilter = (nextFilter) => {
    setReviewFilter(nextFilter)
    setEvidencePageNumber(1)
  }
  const helpHref = `/help?context=${encodeURIComponent(`Intelligence Hub · ${view}`)}#context-help`
  const headingSourceCount = displayHubCount(getHubCount(discovery?.sourceRegistrySummary, 'count'))
  const headingEvidenceCount = displayHubCount(getHubCount(discovery?.evidenceObjectSummary, 'evidenceObjectCount'))

  return <main className={`intelligence-hub container${view === 'Overview' ? ' intelligence-hub--overview' : ''}`} aria-labelledby="intelligence-hub-title">
    <div className="intelligence-hub__selected" role="group" aria-label="Selected workspace context">
      <div className="intelligence-hub__selected-context">
        <span>Selected Workspace</span>
        <strong>{context.valid ? renderer.runtimeInstance.name || 'Workspace' : 'Workspace unavailable'}</strong>
        {context.valid && renderer.revision.revisionNumber ? <Badge className="intelligence-hub__selected-revision" variant="success" size="sm" pill>{`R${renderer.revision.revisionNumber} · Current`}</Badge> : null}
      </div>
      <nav aria-label="Workspace areas">
        <Link to={context.valid ? getHubReturnHref(revisionId) : '/app/dashboard'} variant="subtle">Workspace Home</Link>
        <span aria-current="page">Intelligence Hub</span>
        <BoundaryLink to={qualityHref} note="">Intelligence Quality</BoundaryLink>
        <BoundaryLink to={context.valid ? getHubDestinationHref('structure', workspaceId, revisionId) : ''} note="">Workspace Structure</BoundaryLink>
        <BoundaryLink to={context.valid ? getHubDestinationHref('outcome-studio', workspaceId, revisionId) : ''} note="">Outcome Studio</BoundaryLink>
      </nav>
    </div>
    <nav className="intelligence-hub__navigation-actions" aria-label="Intelligence Hub navigation actions">
      <Link to={context.valid ? getHubReturnHref(revisionId) : '/app/dashboard'} variant="secondary" underline="none" className="intelligence-hub__navigation-back">← Back</Link>
      {context.valid ? <Link to={helpHref} variant="secondary" underline="none" className="intelligence-hub__navigation-help">Help ↗</Link> : null}
    </nav>
    <header className="intelligence-hub__heading">
      <div className="intelligence-hub__heading-title">
        <div className="intelligence-hub__heading-context">
          <p className="intelligence-hub__eyebrow">Intelligence Hub · {context.valid && renderer.revision.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Selected revision'}</p>
        </div>
        <h1 id="intelligence-hub-title">{view === 'Overview' ? 'Intelligence Hub' : view}</h1>
        {view === 'Overview' ? <p>Discover, acquire and govern the customer intelligence that supports accepted truth and outcomes.</p> : null}
      </div>
      {context.valid ? view === 'Overview' ? <div className="intelligence-hub__heading-actions intelligence-hub__overview-actions">
        <div className="intelligence-hub__overview-meta">
          <div className="intelligence-hub__overview-meta-top">
            <span className="intelligence-hub__eyebrow">Last updated</span>
          </div>
          <strong>{compactReadableDate(renderer.runtimeInstance.updatedAt)}</strong>
          <span>{overviewPending ? 'Loading intelligence summary…' : headingSourceCount === 'Unavailable'
            ? `Sources unavailable · ${headingEvidenceCount} evidence`
            : `${headingSourceCount} acquired sources · ${headingEvidenceCount} evidence objects`}</span>
        </div>
        <nav className="intelligence-hub__overview-controls" aria-label="Intelligence Hub actions">
          <Button className="intelligence-hub__overview-refresh" size="sm" variant="outline" disabled={overviewRefreshing} aria-busy={Boolean(overviewRefreshing)} onClick={refreshOverview}>↻ Refresh</Button>
          <Link to={workbenchHref} variant="subtle" underline="none" className="btn btn--primary intelligence-hub__overview-add-evidence"
            title="Opens Evidence Workbench; evidence is not added in the Intelligence Hub.">＋ Add Evidence</Link>
        </nav>
      </div> : <div className="intelligence-hub__heading-actions">
        <span>Last updated <strong>{readableDate(renderer.runtimeInstance.updatedAt)}</strong></span>
        <Button size="sm" variant="outline" onClick={() => refetchRenderer()}>Refresh</Button>
      </div> : null}
    </header>
    {!requiredContext ? <Status variant="warning">Open Intelligence Hub from a selected Execution Workspace revision.</Status>
      : rendererLoading || (!renderer && rendererFetching) ? <p role="status">Loading selected revision…</p>
        : rendererError || !context.valid ? <Status variant="warning">{rendererError ? 'The selected revision could not be loaded.' : context.reason}</Status>
          : <>
            {view === 'Overview' ? overviewPending ? null : <OverviewMetrics renderer={renderer} discovery={discovery} graphCoverage={graphCoverage} onOpen={openInfo} onSelectView={selectView} qualityHref={qualityHref} /> : null}
            <TabView activeTab={viewIndex} onTabChange={(index) => selectView(HUB_VIEWS[index])} aria-label="Intelligence Hub views" className="intelligence-hub__tabs">
            <TabView.Tab label="Overview"><Overview renderer={renderer} discovery={discovery} graphCoverage={graphCoverage} evidenceStatusCounts={evidenceStatusCounts} isLoading={overviewPending} onOpen={openInfo} qualityHref={qualityHref} onSelectView={selectView} /></TabView.Tab>
            <TabView.Tab label="Context"><ContextView discovery={discovery} onOpen={openInfo} onSelectView={selectView} workbenchHref={workbenchHref} /></TabView.Tab>
            <TabView.Tab label="Sources"><SourcesView discovery={discovery} evidencePage={evidencePage} isLoading={evidenceLoading || evidenceFetching} onOpen={openInfo} onSelectView={selectView} page={evidencePageNumber} setPage={setEvidencePageNumber} workbenchHref={workbenchHref} /></TabView.Tab>
            <TabView.Tab label="Review"><ReviewView discovery={discovery} evidencePage={evidencePage} isLoading={evidenceLoading || evidenceFetching} onOpen={openInfo} qualityHref={qualityHref} page={evidencePageNumber} setPage={setEvidencePageNumber} filter={reviewFilter} onFilterChange={selectReviewFilter} /></TabView.Tab>
            <TabView.Tab label="Readiness & publish"><ReadinessView renderer={renderer} discovery={discovery} onOpen={openInfo} qualityHref={qualityHref} workbenchHref={workbenchHref} /></TabView.Tab>
            <TabView.Tab label="After lock"><AfterLockView renderer={renderer} onOpen={openInfo} workbenchHref={workbenchHref} /></TabView.Tab>
            <TabView.Tab label="Coverage"><CoverageView discovery={discovery} graphCoverage={graphCoverage} onOpen={openInfo} qualityHref={qualityHref} workbenchHref={workbenchHref} /></TabView.Tab>
            <TabView.Tab label="Intelligence Graph"><GraphView manifest={manifest} graph={graph} isLoading={graphLoading} onOpen={openInfo} qualityHref={qualityHref} workbenchHref={workbenchHref} /></TabView.Tab>
            </TabView>
          </>}
    <Dialog open={Boolean(visibleInfo)} onClose={closeInfo} size="md">
      <Dialog.Header><h2>{visibleInfo?.title || 'Information'}</h2></Dialog.Header>
      <Dialog.Body>{visibleInfo?.body}</Dialog.Body>
      <Dialog.Footer><Button variant="outline" size="sm" onClick={closeInfo}>Back to {view}</Button></Dialog.Footer>
    </Dialog>
  </main>
}
