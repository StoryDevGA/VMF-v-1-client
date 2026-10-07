import { getHubHelpHref } from '../Help/helpNavigation.js'
import { refreshAcquisitionScope } from './acquisitionRefreshContract.js'
import ContextAcquisitionView from './ContextAcquisitionView.jsx'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { readSourceSummary, sourceProcessingLabel, sourceProcessingExplanation } from './sourceSummaryModel.js'
import { readEvidenceInventory, inventoryLabel, inventoryExplanation } from './evidenceInventoryModel.js'
import EvidenceInventoryDetails from './EvidenceInventoryDetails.jsx'
import CoverageView from './CoverageView.jsx'
import GraphView from './GraphView.jsx'
import { readCoverageInspection, writeCoverageInspection } from './coverageInspectionModel.js'
import { readGraphInspection, writeGraphInspection, isCurrentGraphSnapshot, graphSourceFocus, graphSourceParams, graphSourceReturnHref, graphContextReturnHref, readGraphLifecycle } from './intelligenceGraphModel.js'
import { readCurrentGraphNeighbourhood } from './graphNeighbourhoodModel.js'
import QualityView from './QualityView.jsx'
import { readStoredFindings, FINDING_TYPES, FINDING_POPULATIONS } from './storedFindingModel.js'
import { QUALITY_INSPECTION_KEYS, readQualityCandidates, readQualityInspection, readQualityGraphPair, qualityDefaultPopulation } from './intelligenceQualityModel.js'
import EvidenceReadinessView from './EvidenceReadinessView.jsx'
import SourcesView from './SourcesView.jsx'
import ReviewCompletionPanel from './ReviewCompletionPanel.jsx'
import { readCompletion } from './reviewCompletionModel.js'
import { readAssuranceReview } from './assuranceReviewModel.js'
import AssuranceReviewDetails from './AssuranceReviewDetails.jsx'
import NamedControlRegister from './NamedControlRegister.jsx'
import DiscoveryHealthDetails from './DiscoveryHealthDetails.jsx'
import RecordedLockBasisDetails from './RecordedLockBasisDetails.jsx'
import { readLockBasis } from './lockBasisModel.js'
import { readDiscoveryHealth, discoveryHealthLabel } from './discoveryHealthModel.js'
import { readCurrentCoverage } from './coverageReadModel.js'
import useHubReviewActions, { readHubReviewAuthority } from './useHubReviewActions.js'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MdChevronRight, MdNorthEast, MdSearch, MdInfoOutline } from 'react-icons/md'
import { Input } from '../../components/Input'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Link } from '../../components/Link'
import { Status } from '../../components/Status'
import { TabView } from '../../components/TabView'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import {
  useGetRuntimeStateSourcesQuery,
  useGetRuntimeStateSourceSummaryQuery,
  useGetRuntimeStateEvidenceInventoryQuery,
  useGetRuntimeStateDiscoveryHealthQuery,
  useGetRuntimeStateLockBasisQuery,
  useGetRuntimeStateFindingsQuery,
  useGetRuntimeRendererQuery,
  useGetRuntimeStateEvidenceQuery,
  useGetRuntimeStateGraphManifestQuery,
  useGetRuntimeStateGraphProjectionQuery,
  useGetRuntimeStateGraphNeighbourhoodQuery,
  useGetRuntimeDiscoveryContradictionsQuery,
  useGetReviewCompletionQuery,
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

function Panel({ title, eyebrow, children, className = '', inlineHeader = false, headerIcon = null }) {
  return (
    <Card variant="outlined" className={`intelligence-hub__panel ${className}`}>
      <Card.Body>
        {inlineHeader ? <header className="intelligence-hub__panel-header">
          <h2>{headerIcon}{title}</h2>
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

function Metric({ label, value, hint, onOpen, detail, onAction, actionHref, valueAction = false, className = '', qualification }) {
  const hasValue = String(value) !== 'Unavailable'
  const positiveValue = Number.isFinite(Number(value)) && Number(value) > 0
  return (
    <Card variant="outlined" className={`intelligence-hub__metric ${className}`} data-has-value={String(hasValue)} data-positive={String(positiveValue)}>
      <Card.Body>
        <p className="intelligence-hub__eyebrow">{label}</p>
        {valueAction && hasValue
          ? <button type="button" className="intelligence-hub__metric-value intelligence-hub__metric-value-action" onClick={(event) => onOpen({ title: label, body: detail }, event.currentTarget)}>{value}</button>
          : <strong className="intelligence-hub__metric-value">{value}</strong>}
        {qualification ? <small>{qualification}</small> : null}
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

function OverviewMetrics({ renderer, discovery, sourceSummary, graphCoverage, coverageLoading, pendingFindingCount, findingCountLoading, onOpen, onSelectView, qualityHref }) {
  const evidenceSummary = discovery?.evidenceObjectSummary
  const coverage = graphCoverage?.coverage
  const sourceCount = sourceSummary?.uniqueSourceCount ?? null
  return <div className="intelligence-hub__metrics" aria-label="Intelligence summary">
    <Metric className="intelligence-hub__metric--assurance" label="Intelligence assurance" value={summaryValue(renderer?.truthBinding?.certification?.label)} hint="Select to view assurance details" onOpen={onOpen} valueAction
      detail="Assurance is shown only when the selected revision has a server-projected certification. Coverage or evidence counts alone do not establish an assurance level." />
    <Metric className="intelligence-hub__metric--sources" label="Sources" value={displayHubCount(sourceCount)} hint="Inspect connected sources →" onOpen={onOpen} onAction={() => onSelectView('Sources')}
      detail="The canonical summary counts unique sources across the selected revision. Search results and paginated evidence lists have separate totals." />
    <Metric className="intelligence-hub__metric--evidence" label="Evidence objects" value={displayHubCount(getHubCount(evidenceSummary, 'evidenceObjectCount'))} hint="Inspect accepted evidence →" onOpen={onOpen} onAction={() => onSelectView('Review', 'Accepted')}
      detail="Evidence objects are recorded facts or candidates. Accepted and pending counts are distinct; the Hub does not approve evidence." />
    <Metric className="intelligence-hub__metric--coverage" label="Evidence Coverage" value={coverageLoading ? 'Loading…' : coverage ? `${coverage.coveragePercent}%` : 'Unavailable'} hint="Check evidence coverage →" onOpen={onOpen} valueAction={Boolean(coverage)} onAction={() => onSelectView('Coverage')}
      detail={coverage ? `${coverage.coveredDomainCount} of ${coverage.totalDomainCount} DIG domains have connected accepted evidence in the current graph basis. Domain coverage does not establish evidence sufficiency, readiness, assurance or publication approval.` : 'A current scoped graph coverage receipt is unavailable. Refresh to retry; coverage does not establish readiness or approval.'} />
    <Metric className="intelligence-hub__metric--review" label="Items recommended for review" value={findingCountLoading ? 'Loading…' : displayHubCount(pendingFindingCount)} hint="Open quality findings →" onOpen={onOpen} actionHref={qualityHref}
      qualification="Outstanding contradiction decisions only. Other finding types unavailable."
      detail="Current dispositions are decided and excluded from this count. A confirmed contradiction can separately block readiness. This count does not establish the complete four-type Quality population." />
  </div>
}

const OVERVIEW_DOMAINS = ['Company', 'Products', 'Market', 'Economics', 'Problems', 'Stakeholders']

function Overview({ renderer, discovery, sourceSummary, sourceSummaryLoading, pendingFindingCount, graphCoverage, evidenceStatusCounts, isLoading, onOpen, qualityHref, onSelectView }) {
  if (isLoading) return <p role="status">Loading Overview details…</p>
  const evidenceSummary = discovery?.evidenceObjectSummary
  const domainCoverage = graphCoverage?.available === true
    && graphCoverage?.coverage?.coverageModel === 'EVIDENCE_DOMAIN_COVERAGE'
    ? graphCoverage.coverage
    : null
  const coverage = getHubCount(domainCoverage, 'coveragePercent')
  const sourceCount = sourceSummary?.uniqueSourceCount ?? null
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
    ...(pendingFindingCount > 0 ? [{
      key: 'contradiction-decisions',
      title: 'Resolve outstanding contradiction decisions',
      detail: `${pendingFindingCount} contradiction decision${pendingFindingCount === 1 ? '' : 's'} outstanding.`,
      explanation: `The complete revision review population records ${pendingFindingCount} outstanding contradiction decisions. Quality resolves these findings; evidence acceptance and independent readiness consequences remain separate. Other finding types are not included in this count.`,
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
            <div><dt>Documents processed</dt><dd>{sourceProcessingLabel(sourceSummary, sourceSummaryLoading)}</dd></div>
            <div><dt>Evidence accepted</dt><dd>{displayHubCount(evidenceStatusCounts?.accepted)}</dd></div>
          </dl>
          <DetailButton className="intelligence-hub__acquisition-details" onOpen={onOpen} title="Acquisition details" body={sourceProcessingExplanation(sourceSummary)} >View acquisition details →</DetailButton>
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
          <Button className="intelligence-hub__evidence-readiness-action" size="sm" variant="ghost" onClick={() => onSelectView('Evidence readiness')}>Open evidence readiness →</Button>
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

function EvidencePagination({ evidencePage, page, setPage, isLoading }) {
  const totalPages = Number(evidencePage?.totalPages) || 1
  return totalPages > 1 ? <div className="intelligence-hub__filters" aria-label="Evidence pages">
    <Button size="sm" variant="outline" disabled={isLoading || page <= 1} onClick={() => setPage(page - 1)}>Previous page</Button>
    <span>Page {page} of {totalPages}</span>
    <Button size="sm" variant="outline" disabled={isLoading || page >= totalPages} onClick={() => setPage(page + 1)}>Next page</Button>
  </div> : null
}

const getSourceLabel = (source) => source.label || source.url || source.sourceFileName || source.fileName || source.sourceRef || 'Unnamed source'
const getSourceKind = (source) => {
  const type = String(source.sourceType || '').toUpperCase()
  if (type === 'WEBSITE' || type === 'URL') return 'Website'
  if (['UPLOADED_DOCUMENT', 'SECTION_UPLOADED_DOCUMENT', 'DOCUMENT'].includes(type)) return 'Document'
  if (type === 'DISCOVERY_NOTES') return 'Input'
  return 'Unknown'
}
const getSourceStatus = (source) => displayHubToken(source.acquisitionStatus || source.documentStatus || source.status)

const getReviewState = (item) => String(item?.reviewStatus || '').toUpperCase()
const getReviewLabel = (state) => state === 'PENDING' ? 'Needs review' : displayHubToken(state)
const getReviewVariant = (state) => state === 'PENDING' ? 'warning' : state === 'ACCEPTED' ? 'success' : state === 'REJECTED' ? 'danger' : 'neutral'
const getReviewFact = (item) => item.extractedFact || item.summary || item.title || 'Evidence detail unavailable'
const getReviewConfidence = (confidence) => {
  if (!confidence || typeof confidence !== 'object') return 'Unavailable'
  const level = confidence.level ? displayHubToken(confidence.level) : ''
  const score = confidence.score
  const percentage = typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 1 ? `${Math.round(score * 100)}%` : ''
  return [level, percentage].filter(Boolean).join(' · ') || 'Unavailable'
}

function ReviewView({ completion, evidencePage, isLoading, error, evidenceStatusCounts, countsLoading, onOpenSource, onSelectView, page, setPage, filter, onFilterChange, query, onSearch, actions, findings, focused, onReturn }) {
  const [draft, setDraft] = useState(query)
  const [draftQuery, setDraftQuery] = useState(query)
  if (draftQuery !== query) { setDraftQuery(query); setDraft(query) }
  const [selection, setSelection] = useState(null)
  const searchRef = useRef(null)
  const decisionFeedbackRef = useRef(null)
  const selectionKey = `${filter}:${page}:${query}`
  const available = !error && Boolean(evidencePage)
  const evidence = available && !isLoading ? evidencePage.evidenceObjects || [] : []
  const sources = available && !isLoading ? evidencePage.sourceRegistry || [] : []
  const sourceFor = (item) => sources.find((source) => source.sourceId === item.sourceId)
  const filtered = evidence
  const selected = evidence.find((item) => selection?.key === selectionKey && item.evidenceObjectId === selection.id) || evidence[0] || null
  const source = selected ? sourceFor(selected) : null
  const state = getReviewState(selected)
  const count = (value) => countsLoading ? 'Loading…' : displayHubCount(value)
  const queueMessage = isLoading ? 'Loading evidence candidates…' : error ? 'Evidence candidates could not be loaded. Refresh to retry.' : !available ? 'Evidence candidates are unavailable for this revision.' : query ? 'No candidates match this scoped search.' : 'No candidates match this review filter in the selected revision.'
  return <div className="intelligence-hub__sources-workspace intelligence-hub__review-workspace">
    <div className="intelligence-hub__sources-toolbar intelligence-hub__review-toolbar">
      <div><p className="intelligence-hub__eyebrow">Evidence review</p><h2>Resolve evidence requiring attention</h2>
        <p>Resolve outstanding evidence decisions. Quality owns finding resolution; acceptance and quality disposition remain distinct.</p></div>
      <form className="intelligence-hub__sources-search" onSubmit={event => { event.preventDefault(); onSearch(draft.trim()) }}><Input ref={searchRef} size="sm" fullWidth leftIcon={<MdSearch aria-hidden="true" />} aria-label="Search all review evidence" placeholder="Search all evidence in this revision…" maxLength={240} value={draft} onChange={event => setDraft(event.target.value)} />
        <Button size="sm" type="submit">Search review</Button>{query ? <Button size="sm" variant="ghost" aria-label="Clear evidence search" className="intelligence-hub__sources-clear" onClick={() => { setDraft(''); onSearch(''); searchRef.current?.focus() }}>×</Button> : null}</form>
    </div>
    <span className="sr-only" role="status">{available && !isLoading && query ? `${filtered.length} matching evidence candidates on this page.` : ''}</span>
    <div className="intelligence-hub__sources-summary intelligence-hub__review-summary" role="region" aria-label="Evidence review summary" tabIndex={0}>
      <span><strong>{count(evidenceStatusCounts.accepted)}</strong><small>Already accepted</small></span>
      <span><strong>{count(evidenceStatusCounts.pending)}</strong><small>Evidence awaiting review</small></span>
    </div>
    {focused ? <div><p>Inspecting the exact linked evidence item. Prior Review search is preserved for return.</p><Button size="sm" variant="outline" onClick={() => { onReturn(); searchRef.current?.focus() }}>Return to Review search</Button></div> : null}
    <p ref={decisionFeedbackRef} tabIndex={-1} role={actions?.feedback?.error ? 'alert' : 'status'} aria-label="Evidence decision status">{actions?.feedback?.message}</p>
    {completion}
    <section aria-label="Outstanding finding decisions"><h3>Finding decisions</h3><p>Bounded contradiction candidates only; complete four-type findings and unified totals remain unavailable.</p>{findings === null ? <p>Current finding decisions unavailable. Refresh to retry.</p> : findings.length ? findings.map(item => <Button key={item.id} size="sm" variant="outline" onClick={() => onSelectView('Intelligence Quality', undefined, { findingId: item.id })}>{item.id} · {displayHubToken(item.status)} · Resolve in Quality →</Button>) : <p>No outstanding decisions in the returned contradiction candidates. This does not establish complete review.</p>}</section>
    <div className="intelligence-hub__review-browser">
      <Card variant="outlined" className="intelligence-hub__review-queue" aria-label="Exception queue">
        <Card.Header><div><h2>Exception queue</h2><strong>{isLoading ? 'Loading…' : available ? `${filtered.length} items shown on this page` : 'Unavailable'}</strong></div>
          <div className="intelligence-hub__sources-filters" role="group" aria-label="Review filters">{['Needs review', 'All', 'Accepted', 'Rejected'].map((label) => <Button key={label} size="sm" variant="outline" aria-pressed={filter === label} onClick={() => onFilterChange(label)}>{label}</Button>)}</div>
        </Card.Header>
        <Card.Body role="region" aria-label="Evidence candidate queue" tabIndex={0}>{filtered.length ? <ul className="intelligence-hub__sources-list">{filtered.map((item) => {
          const itemState = getReviewState(item)
          const itemSource = sourceFor(item)
          return <li key={item.evidenceObjectId}><Button variant="ghost" size="sm" fullWidth className="intelligence-hub__review-row" aria-pressed={selected?.evidenceObjectId === item.evidenceObjectId} onClick={() => setSelection({ key: selectionKey, id: item.evidenceObjectId })}>
            <span className="intelligence-hub__review-row-heading"><Badge size="sm" variant="success" className="intelligence-hub__sources-marker" aria-hidden="true">E</Badge><strong>{item.title || 'Evidence'}</strong><Badge size="sm" variant={getReviewVariant(itemState)} pill>{getReviewLabel(itemState)}</Badge></span>
            <p>{getReviewFact(item)}</p><small>{itemSource ? getSourceLabel(itemSource) : 'Source unavailable'}</small>
          </Button></li>
        })}</ul> : <p role={isLoading ? 'status' : error ? 'alert' : undefined}>{queueMessage}</p>}</Card.Body>
        <Card.Footer><EvidencePagination evidencePage={error ? null : evidencePage} page={page} setPage={setPage} isLoading={isLoading} /></Card.Footer>
      </Card>
      <Card variant="outlined" className="intelligence-hub__review-detail" role="region" aria-label="Selected evidence candidate" tabIndex={0}>
        {selected ? <>
          <header><div><small>{selected.title || 'Evidence'} · {source ? getSourceKind(source) : 'Source unavailable'}</small><Badge size="sm" variant={getReviewVariant(state)} pill>{getReviewLabel(state)}</Badge></div><h3>{getReviewFact(selected)}</h3></header>
          <dl className="intelligence-hub__review-detail-metrics">{[
            ['Confidence', getReviewConfidence(selected.confidence)], ['Coverage area', 'Unavailable'], ['Acquisition', source?.acquisitionProfile ? displayHubToken(source.acquisitionProfile) : 'Unavailable'], ['Decision', state === 'PENDING' ? 'Unresolved' : displayHubToken(state)],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <section className="intelligence-hub__review-provenance"><header><strong>Evidence provenance</strong><Button variant="ghost" size="sm" disabled={!source} onClick={() => onOpenSource(source.sourceId, selected.evidenceObjectId)}>Open source →</Button></header>
            <div><Badge variant="success" size="sm" className="intelligence-hub__sources-marker" aria-hidden="true">{source ? getSourceKind(source)[0] : '?'}</Badge><span><strong>{source ? source.sourceRef || source.url || source.fileName || getSourceLabel(source) : 'Source unavailable'}</strong><small>{source ? `${displayHubToken(source.sourceType)} · ${getSourceStatus(source)}` : 'Source provenance unavailable'}</small></span></div>
            <p>Source content remains linked to this evidence object for inspection and explainability.</p>
          </section>
          <section className="intelligence-hub__review-explanation"><strong>Why this needs attention</strong><p>{state === 'PENDING' ? 'This candidate needs a human decision before it can affect downstream workspace understanding.' : 'This evidence has a recorded review state. Inspection does not change that decision or the selected revision.'}</p></section>
          <footer className="intelligence-hub__review-actions"><span>{actions?.canReviewEvidence ? "Record a governed evidence decision. Review Completion is separate." : "Decisions require current editable scope and server review authority. Refresh to inspect eligibility."}</span><div><Button variant="outline" size="sm" className="intelligence-hub__review-reject" disabled={!actions?.canReviewEvidence || state === "REJECTED"} onClick={() => { decisionFeedbackRef.current?.focus(); actions.decideEvidence(selected.evidenceObjectId, "REJECTED") }}>× Reject</Button><Button variant="outline" size="sm" className="intelligence-hub__review-approve" disabled={!actions?.canReviewEvidence || state === "ACCEPTED"} onClick={() => { decisionFeedbackRef.current?.focus(); actions.decideEvidence(selected.evidenceObjectId, "ACCEPTED") }}>✓ Accept evidence</Button></div></footer>
        </> : <p>{isLoading ? 'Loading selected evidence…' : error ? 'Selected evidence could not be loaded.' : available ? 'No candidate is selected for this review filter.' : 'Selected evidence is unavailable.'}</p>}
      </Card>
    </div>
    <footer className="intelligence-hub__sources-footer"><Button variant="ghost" size="sm" onClick={() => onSelectView('Sources')}>← Sources</Button><span>{countsLoading ? 'Loading unresolved decisions…' : evidenceStatusCounts.pending === null ? 'Unresolved decision count is unavailable.' : `${evidenceStatusCounts.pending} evidence decisions remain; continuing preserves them for later review.`}</span><Button variant="ghost" size="sm" onClick={() => onSelectView('Evidence readiness')}>Continue to Evidence readiness →</Button></footer>
  </div>
}

function RecentRuntimeActivity({ activity }) {
  const events = Array.isArray(activity) ? activity.slice(0, 10) : []
  return <section><h3>Recent runtime activity</h3><p>General runtime events are not per-control review decisions.</p>{events.length ? <ol>{events.map((item, index) => <li key={item.id || index}>{item.summary || item.description || item.label || displayHubToken(item.eventType || item.action || item.type)} · {readableDate(item.occurredAt || item.createdAt || item.timestamp)}</li>)}</ol> : <p>Unavailable</p>}</section>
}

function AssuranceReport({ renderer, lockBasis, lockBasisLoading, evidenceStatusCounts, countsLoading, previewedAt, scope, sourceSummary, sourceSummaryLoading, inventory, inventoryLoading, graphCoverage, coverageLoading, review, reviewLoading, discoveryHealth, discoveryHealthLoading }) {
  const revision = renderer?.revision?.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Unavailable'
  const name = summaryValue(renderer?.runtimeInstance?.name)
  const accepted = countsLoading ? 'Loading…' : displayHubCount(getHubCount(evidenceStatusCounts, 'accepted'))
  return <div className="intelligence-hub__report-content">
    <section className="intelligence-hub__report-purpose"><div><h3>Report scope</h3><strong>Current inspected facts for selected revision {revision}</strong><p>This read-only report updates with verified current reads. Opening time is separate from each receipt’s read time and basis. It does not approve evidence or change workspace state.</p></div><Badge size="sm" pill>Assurance unavailable</Badge></section>
    <article className="intelligence-hub__report-sheet" aria-label="Selected revision assurance summary">
      <header><div><p>StorylineOS Intelligence Assurance Report</p><h3>{name}</h3><small>Selected revision {revision} · Previewed {compactReadableDate(previewedAt)}</small></div><span className="intelligence-hub__report-assurance" aria-label="Assurance level unavailable">—</span></header>
      <div className="intelligence-hub__report-posture">{[['Assurance posture', 'Unavailable'], ['Workspace use', 'Unavailable'], ['Publication', displayHubToken(renderer?.publish?.state)], ['Assurance', 'Unavailable']].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
      <section aria-label="Report identity and current basis"><header><h4>Exact report scope</h4><small>Inspection only</small></header><dl className="intelligence-hub__report-basis">{[['Workspace', scope.workspaceId], ['Revision', scope.runtimeInstanceId], ['Customer', scope.customerId], ['Tenant', scope.tenantId], ['Current state version', renderer?.runtimeInstance?.stateVersion]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{summaryValue(value)}</dd></div>)}</dl><p>Separate bounded reads have their own recorded basis; this report is not an atomic approval or frozen report receipt.</p></section>
      <section aria-label="Report current evidence inventory"><header><h4>Current stored inventory</h4><small>{inventoryLabel(inventory, inventoryLoading)}</small></header><p>{inventoryExplanation(inventory, inventoryLoading)}</p>{inventory ? <dl className="intelligence-hub__report-basis">{[['Inventory hash', inventory.inventoryHash], ['Inventory state version', inventory.stateVersion], ['Inventory read time', inventory.readAt], ['Stored-reference mapping', inventory.sectionMapping.state]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}</section>
      <section aria-label="Report canonical source basis"><header><h4>Canonical source basis</h4><small>{sourceSummaryLoading ? 'Loading…' : sourceSummary ? 'Recorded current read' : 'Unavailable'}</small></header><dl className="intelligence-hub__report-basis"><div><dt>Unique sources</dt><dd>{sourceSummaryLoading ? 'Loading…' : displayHubCount(sourceSummary?.uniqueSourceCount ?? null)}</dd></div><div><dt>Documents processed</dt><dd>{sourceProcessingLabel(sourceSummary, sourceSummaryLoading)}</dd></div>{sourceSummary ? <><div><dt>Source state version</dt><dd>{sourceSummary.stateVersion}</dd></div><div><dt>Source read time</dt><dd>{sourceSummary.readAt}</dd></div></> : null}</dl><p>{sourceProcessingExplanation(sourceSummary, sourceSummaryLoading)}</p></section>
      <section aria-label="Report domain coverage basis"><header><h4>Domain/Intelligence Coverage</h4><small>{coverageLoading ? 'Loading…' : graphCoverage ? 'Recorded current graph' : 'Unavailable'}</small></header>{graphCoverage ? <><p>{graphCoverage.coverage.coveredDomainCount} of {graphCoverage.coverage.totalDomainCount} domains have connected accepted evidence. Recorded missing domains: {graphCoverage.coverage.missingDomains.join(', ') || 'None'}.</p><dl className="intelligence-hub__report-basis">{[['Graph snapshot', graphCoverage.basis.snapshotId], ['Graph hash', graphCoverage.basis.graphHash], ['Graph source hash', graphCoverage.basis.sourceHash], ['Graph state version', graphCoverage.basis.stateVersion]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></> : <p>A current matching graph coverage receipt is unavailable. No evidence score substitutes for this basis.</p>}<p>Current graph coverage does not establish target sufficiency, frozen membership or approval.</p></section>
      <section aria-label="Report lifecycle and recorded snapshot"><header><h4>Lifecycle and recorded snapshot</h4><small>{displayHubToken(renderer?.lifecycle?.stage)}</small></header><RecordedLockBasisDetails model={lockBasis} loading={lockBasisLoading} /><p>Successor continuity is unavailable from this current report basis.</p></section>
      <AssuranceReviewDetails review={review} loading={reviewLoading} />
      <DiscoveryHealthDetails model={discoveryHealth} loading={discoveryHealthLoading} />
      <section><header><h4>Executive assurance summary</h4><small>Selected revision</small></header><p>Canonical readiness: {displayHubToken(renderer?.readiness?.state)}. Evidence counts describe recorded review state; they do not independently establish assurance. Assurance decisions and disclosed quality exceptions are unavailable.</p><div className="intelligence-hub__report-metrics">{[['Accepted evidence', accepted], ['Governed decisions', 'Unavailable'], ['Open exceptions', 'Unavailable'], ['Audit events', 'Unavailable']].map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></section>
      <NamedControlRegister review={review} loading={reviewLoading} summary />
      <section className="intelligence-hub__report-disclosures"><header><h4>Disclosed limitations</h4><small>Incomplete assurance report</small></header><div><p><strong>Quality exceptions unavailable</strong><small>No complete recorded finding/impact summary is supplied.</small></p><p><strong>Truth Quality certification unavailable</strong><small>Machine inventory and coverage checks do not provide certification.</small></p><p><strong>Human control receipts unavailable</strong><small>Other named approvals and complete control history are not supplied. The recorded Review Completion basis is inspected separately above.</small></p><p><strong>Target readiness unavailable</strong><small>Required/optional sufficiency for an explicit framework/output/plan target is not supplied.</small></p></div></section>
      <footer><span>Scope: {name} · {revision}</span><small>Recorded revision summary · This preview does not accept or approve new understanding</small></footer>
    </article>
  </div>
}

function ReadinessView({ completion, review, reviewLoading, renderer, lockBasis, lockBasisLoading, discoveryHealth, discoveryHealthLoading, sourceSummary, sourceSummaryLoading, inventory, inventoryLoading, onOpen, onSelectView, qualityHref }) {
  const revision = renderer?.revision?.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Unavailable'
  const truth = renderer?.readiness?.sectionTruth
  const preview = (event) => onOpen({
    title: 'Intelligence assurance report', kind: 'assurance-report',
    subtitle: summaryValue(renderer?.runtimeInstance?.name) + ' · selected revision ' + revision,
    previewedAt: new Date().toISOString(),
  }, event.currentTarget)
  return <div className="intelligence-hub__sources-workspace intelligence-hub__readiness-workspace">
    <header className="intelligence-hub__readiness-toolbar"><div><p className="intelligence-hub__eyebrow">Readiness and publication</p><h2>Review the selected revision before publication</h2></div><p>Publication and locking are performed in Workspace Structure.</p></header>
    {completion}
    <section className="intelligence-hub__readiness-posture" aria-label="Current evidence inventory"><strong>{inventoryLabel(inventory, inventoryLoading)}</strong><div className="intelligence-hub__readiness-metrics"><span><small>Evidence records read</small><b>{inventoryLoading ? 'Loading…' : inventory ? `${inventory.evidence.readCount} / ${inventory.evidence.expectedCount}` : 'Unavailable'}</b></span><span><small>Source records read</small><b>{inventoryLoading ? 'Loading…' : inventory ? `${inventory.sources.readCount} / ${inventory.sources.expectedCount}` : 'Unavailable'}</b></span></div><p>{inventoryExplanation(inventory, inventoryLoading)}</p><DetailButton onOpen={onOpen} title="Current evidence inventory receipt" body={<EvidenceInventoryDetails inventory={inventory} />}>Inspect inventory receipt →</DetailButton></section>
    <section className="intelligence-hub__readiness-posture" aria-label="Current revision source basis"><strong>Current revision source basis</strong><div className="intelligence-hub__readiness-metrics"><span><small>Sources connected</small><b>{sourceSummaryLoading ? 'Loading…' : displayHubCount(sourceSummary?.uniqueSourceCount ?? null)}</b></span><span><small>Documents processed</small><b>{sourceProcessingLabel(sourceSummary, sourceSummaryLoading)}</b></span></div><p>{sourceProcessingExplanation(sourceSummary, sourceSummaryLoading)}</p><p>Current source records are separate from frozen snapshot membership and publication readiness.</p></section>
    <section className="intelligence-hub__readiness-posture" aria-label="Selected revision posture"><strong>Selected revision {revision} · {displayHubToken(renderer?.lifecycle?.stage)}</strong><div className="intelligence-hub__readiness-metrics"><span><small>Publication</small><b>{displayHubToken(renderer?.publish?.state)}</b></span><span><small>Canonical readiness</small><b>{displayHubToken(renderer?.readiness?.state)}</b></span><span><small>Discovery readiness</small><b>{discoveryHealthLabel(discoveryHealth, discoveryHealthLoading)}</b></span></div><p>{truth?.reason || 'Section-truth readiness explanation is unavailable.'}</p><DiscoveryHealthDetails model={discoveryHealth} loading={discoveryHealthLoading} /></section>
    <section className="intelligence-hub__readiness-boundary"><span aria-hidden="true"><MdInfoOutline /></span><p><strong>What changes at publication</strong> Publication freezes the accepted understanding. New evidence after lock requires a governed successor revision; it does not silently change this revision.</p><Button variant="ghost" size="sm" onClick={() => onSelectView('After lock')}>View After lock →</Button></section>
    <div className="intelligence-hub__readiness-cards">
      <section><header><h3>Canonical readiness</h3><Badge variant="info" size="sm" pill>{displayHubToken(renderer?.readiness?.state)}</Badge></header><p>{truth ? `${displayHubCount(getHubCount(truth, 'readySectionCount'))} of ${displayHubCount(getHubCount(truth, 'requiredSectionCount'))} required sections ready` : 'Section readiness is unavailable.'}</p><Link to={qualityHref} variant="subtle" className="intelligence-hub__readiness-link">Review quality findings →</Link></section>
      <section><header><h3>Outcome readiness</h3><Badge size="sm" pill>Unavailable</Badge></header><p>Outcome Studio readiness is not exposed by the bounded summary.</p><p>Recorded output eligibility: {typeof renderer?.publish?.outputEligibility?.outputEligible === 'boolean' ? renderer.publish.outputEligibility.outputEligible ? 'Eligible' : 'Not eligible' : 'Unavailable'}</p><Button variant="ghost" size="sm" onClick={() => onSelectView('Coverage')}>View coverage conditions →</Button></section>
      <section><header><h3>Recorded lock snapshot</h3></header><RecordedLockBasisDetails model={lockBasis} loading={lockBasisLoading} /></section>
    </div>
    <section className="intelligence-hub__readiness-checklist"><header><h3>Publication checks</h3><span>Check receipts unavailable</span><Button variant="ghost" size="sm" onClick={preview}>Preview assurance report →</Button></header><div className="intelligence-hub__readiness-checks">{['Evidence provenance retained', 'Section mapping reviewed', 'Quality findings need a decision', 'Publication boundary confirmed'].map((title) => <div key={title}><span aria-hidden="true"><MdInfoOutline /></span><div><strong>{title}</strong><small>Unavailable</small></div></div>)}</div></section>
    <NamedControlRegister review={review} loading={reviewLoading} qualityHref={qualityHref} onSelectView={onSelectView} />
    <footer className="intelligence-hub__sources-footer"><Button variant="ghost" size="sm" onClick={() => onSelectView('Review')}>← Review</Button><span>Resolve or disclose findings before publication.</span><Button variant="ghost" size="sm" onClick={() => onSelectView('After lock')}>Continue to After lock →</Button></footer>
  </div>
}

function AfterLockExplanation({ revision, locked }) {
  const steps = [
    ['The locked revision stays unchanged', locked ? `${revision} remains the reference that existing outcomes rely on.` : 'When a revision is locked, it remains the reference for outcomes created from it.'],
    ['New evidence is reviewed separately', 'Source details, provenance and the possible effect must be visible before a decision is made.'],
    ['A person records the impact', 'One recorded assessment states No change to current revision, Supports current revision or Updated revision required. Evidence acceptance is a separate decision.'],
    ['An updated revision is created only when needed', locked ? `A new revision can be prepared and reviewed without overwriting ${revision}.` : 'A new revision can be prepared without overwriting a previously locked revision.'],
  ]
  return <div className="intelligence-hub__lock-explanation">
    <section><strong>Separate review protects clarity</strong><p>Review new material, its provenance and its effect before an authorised person updates accepted understanding.</p></section>
    <div className="intelligence-hub__lock-steps">{steps.map(([title, body], index) => <article key={title}><span aria-hidden="true">{index + 1}</span><div><strong>{title}</strong><p>{body}</p></div></article>)}</div>
    <section className="intelligence-hub__lock-outcomes"><strong>What this means for you</strong><div><strong>Existing outcomes remain dependable</strong><p>Published assets retain their recorded revision reference until an authorised update.</p></div><div><strong>New evidence remains actionable</strong><p>Important changes need a visible review and updated-revision path rather than being applied silently.</p></div></section>
  </div>
}

function AfterLockView({ renderer, lockBasis, lockBasisLoading, onOpen, onSelectView }) {
  const locked = !lockBasisLoading && lockBasis?.locked === true
  const unlocked = !lockBasisLoading && lockBasis?.reason === 'LOCK_NOT_RECORDED'
  const revision = renderer?.revision?.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Selected revision'
  const postLockValue = unlocked ? 'Not active' : 'Unavailable'
  const readiness = displayHubToken(renderer?.readiness?.state)
  const published = renderer?.publish?.published === true
  const explanation = (event) => onOpen({ kind: 'after-lock', title: 'Why new evidence is reviewed separately', subtitle: locked ? `${revision} is a point-in-time reference. New evidence must not rewrite accepted understanding.` : 'These protections apply when a revision has a verified lock. This view does not establish a lock for the selected revision.', body: <AfterLockExplanation revision={revision} locked={locked} /> }, event.currentTarget)
  return <section className="intelligence-hub__lock-workspace">
    <header className="intelligence-hub__lock-hero">
      <div><p className="intelligence-hub__eyebrow">New evidence after lock</p><h2>{locked
        ? `Keep gathering evidence without changing ${revision}`
        : unlocked
          ? 'After-lock review starts when the selected revision is locked'
          : 'Confirm the lock state before reviewing post-lock evidence'}</h2>
        <p>{locked
          ? 'New material is reviewed separately. The locked revision remains unchanged until an authorised person creates an updated revision.'
          : unlocked
            ? 'The selected revision is not locked, so after-lock evidence and decision history are not active yet.'
            : 'The selected revision’s lock state is unavailable or inconsistent. Post-lock evidence is not inferred.'}</p></div>
      <div className="intelligence-hub__lock-state"><strong>{locked ? published ? 'Published and locked' : 'Locked revision' : unlocked ? 'Not locked' : 'Lock state unavailable'}</strong><span>{summaryValue(renderer?.runtimeInstance?.name)} · {revision}</span><small>Locked {locked ? compactReadableDate(lockBasis?.lockedAt) : 'Unavailable'} · Snapshot {locked ? summaryValue(lockBasis?.snapshot?.snapshotId) : 'Unavailable'}</small></div>
    </header>
    <RecordedLockBasisDetails model={lockBasis} loading={lockBasisLoading} /><div className="intelligence-hub__lock-notice"><MdInfoOutline aria-hidden="true" /><p><strong>{locked ? `${revision} is protected` : unlocked ? `${revision} is not locked` : 'Lock state unavailable'}</strong> {locked ? 'Evidence gathered after lock can support, qualify or challenge the current revision, but cannot silently alter accepted understanding.' : 'These protections apply only after a verified lock. New evidence requires human review before changing accepted understanding.'}</p><Button size="sm" variant="ghost" onClick={explanation}>Why this is separate →</Button></div>
    <div className="intelligence-hub__lock-summary" role="group" aria-label="After lock summary">{['Items in discovery', 'Needs a decision', 'May require an update', 'Current revision'].map((label, index) => <div key={label}><strong data-unavailable={index < 3 || readiness === 'Unavailable'}>{index < 3 ? postLockValue : readiness}</strong><small>{label}</small></div>)}<nav aria-label="Revision perspective"><Button size="sm" variant="outline" aria-current="page">After lock</Button><Button size="sm" variant="outline" onClick={() => onSelectView('Overview')}>Current revision</Button></nav></div>
    <div className="intelligence-hub__lock-toolbar"><div><p className="intelligence-hub__eyebrow">Discovery inbox</p><strong>{locked ? `Evidence gathered since ${revision} was locked` : 'Post-lock evidence'}</strong></div><nav aria-label="Discovery inbox filters">{['All', 'Needs decision', 'Accepted'].map((label, index) => <Button key={label} size="sm" variant="outline" disabled aria-pressed={index === 0}>{label}</Button>)}</nav></div>
    <div className="intelligence-hub__lock-browser">
      <aside className="intelligence-hub__lock-inbox"><header><div><small>New evidence</small><strong>{postLockValue}</strong></div><small>Most recent first</small></header><div role="region" aria-label="Post-lock discovery inbox" tabIndex={0}><p>{unlocked
          ? 'Post-lock inbox is not active because the selected revision is unlocked.'
          : locked
            ? 'Post-lock inbox items are not available from the bounded read models for this selected revision.'
          : 'Post-lock inbox state is unavailable because the selected revision lock state could not be verified.'}</p></div><footer>Evidence must remain linked to the exact locked revision.</footer></aside>
      <article className="intelligence-hub__lock-detail"><header><Badge size="sm" pill>{postLockValue}</Badge><h3>No post-lock item selected</h3><p>Source and received time unavailable</p></header><div className="intelligence-hub__lock-detail-scroll" role="region" aria-label="Post-lock evidence detail" tabIndex={0}>
        <section><p className="intelligence-hub__eyebrow">Source and provenance</p><strong>Unavailable</strong><p>No post-lock source receipt is available for this revision.</p><Button size="sm" variant="ghost" disabled>Inspect source details →</Button></section>
        <section className="intelligence-hub__lock-boundary"><p className="intelligence-hub__eyebrow">What this can affect</p><div><strong>{locked ? `Locked revision ${revision}` : revision}</strong><small>{locked ? 'New evidence cannot be added silently into this revision.' : 'A verified lock is required for after-lock review.'}</small></div><div><strong>Accepted understanding</strong><small>Any change requires human review and an updated revision.</small></div></section>
        <section className="intelligence-hub__lock-impact"><p className="intelligence-hub__eyebrow">Evidence impact</p><p>Unavailable · no recorded post-lock impact decision.</p><div>{['No change to current revision', 'Supports current revision', 'Updated revision required'].map(label => <Button key={label} size="sm" variant="outline" disabled>○ {label}</Button>)}</div><p>Evidence acceptance is separate from impact assessment. Every result preserves frozen truth; Updated revision required does not create a successor automatically.</p></section>
        <section className="intelligence-hub__lock-next"><p className="intelligence-hub__eyebrow">Next action</p><strong>Unavailable</strong><p>No next step is inferred without a recorded impact.</p></section>
        <aside className="intelligence-hub__lock-advisor"><MdInfoOutline aria-hidden="true" /><div><p className="intelligence-hub__eyebrow">Advisor suggestion</p><p>Unavailable</p><small>Guidance only · an authorised person records the decision.</small></div></aside>
        <section className="intelligence-hub__lock-decision"><header><p className="intelligence-hub__eyebrow">Record next step</p><small>Owner · Unavailable</small></header><p>Recording a decision must not change {revision}. Decision recording is not delivered here.</p><Button size="sm" disabled>Save decision</Button></section>
        <section><p className="intelligence-hub__eyebrow">Decision history</p><p>Unavailable · general revision activity is not post-lock decision history.</p></section>
      </div></article>
    </div>
    <footer className="intelligence-hub__lock-footer"><span>Current revision readiness <strong>{readiness}</strong> · Outcome readiness <span>Unavailable</span></span><Button size="sm" variant="ghost" onClick={() => onSelectView('Readiness & publish')}>View readiness and history →</Button><Button size="sm" className="intelligence-hub__lock-discovery" onClick={() => onSelectView('Context')}>Open acquisition in Context →</Button></footer>
    <nav className="intelligence-hub__sources-footer intelligence-hub__lock-navigation" aria-label="After lock view navigation"><Button size="sm" variant="ghost" onClick={() => onSelectView('Readiness & publish')}>← Readiness &amp; publish</Button><Button size="sm" variant="ghost" onClick={() => onSelectView('Coverage')}>Continue to Coverage →</Button></nav>
  </section>
}

export default function IntelligenceHub(props) {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  return <SessionIntelligenceHub key={sessionRevision} {...props} sessionRevision={sessionRevision} />
}

function SessionIntelligenceHub({ quality = false, sessionRevision }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const workspaceId = String(searchParams.get('runtimeInstanceId') || '').trim()
  const revisionId = String(searchParams.get('revisionId') || '').trim()
  const { customerId, tenantId } = useTenantContext()
  const contextKey = `${workspaceId}:${revisionId}:${customerId}:${tenantId}`
  const qualityInspection = readQualityInspection(searchParams, contextKey)
  const findingFrame = useRef(null)
  const findingFrameToken = {}
  const currentFindingFrame = () => findingFrame.current?.token === findingFrameToken
    && findingFrame.current.view === 'Intelligence Quality' && findingFrame.current.contextKey === contextKey
    && findingFrame.current.sessionRevision === sessionRevision && getSessionRevision() === sessionRevision
    && !findingFrame.current.blocked
  const changeQualityInspection = patch => {
    if (quality && !currentFindingFrame()) return
    const inspection = { ...qualityInspection, ...patch }
    const next = new URLSearchParams(searchParams)
    next.set('qualityInspectionContext', contextKey)
    if (inspection.population) next.set('qualityPopulation', inspection.population)
    else next.delete('qualityPopulation')
    next.set('qualityType', inspection.type)
    next.set('qualityQuery', inspection.search)
    next.set('qualitySort', inspection.sort)
    next.set('qualityPage', String(patch.page ?? 1))
    setSearchParams(next, { replace: true })
  }
  const viewIndex = quality ? HUB_VIEWS.length : Math.max(0, getHubViewFromSearch(`?${searchParams.toString()}`))
  const view = quality ? 'Intelligence Quality' : HUB_VIEWS[viewIndex]
  const graphInspection = readGraphInspection(searchParams, contextKey)
  const coverageInspection = readCoverageInspection(searchParams, contextKey)
  const coverageNavigation = useRef(null)
  const coverageNavigationKey = JSON.stringify([coverageInspection.filter, coverageInspection.selectedDomain, coverageInspection.notice])
  useLayoutEffect(() => {
    coverageNavigation.current = { contextKey, view, sessionRevision, key: coverageNavigationKey }
    return () => { coverageNavigation.current = null }
  }, [contextKey, view, sessionRevision, coverageNavigationKey])
  const changeCoverageInspection = (patch, options) => {
    const current = coverageNavigation.current
    if (!current || current.contextKey !== contextKey || current.view !== 'Coverage' || current.sessionRevision !== sessionRevision
      || getSessionRevision() !== sessionRevision || current.key !== coverageNavigationKey) return
    setSearchParams(writeCoverageInspection(searchParams, contextKey, { ...coverageInspection, ...patch }), options)
  }
  const graphNavigation = useRef(null)
  useLayoutEffect(() => {
    graphNavigation.current = { contextKey, view, sessionRevision }
    return () => { graphNavigation.current = null }
  }, [contextKey, view, sessionRevision])
  const changeGraphInspection = (patch, options) => {
    const current = graphNavigation.current
    if (!current || current.contextKey !== contextKey || current.view !== 'Intelligence Graph'
      || current.sessionRevision !== sessionRevision || getSessionRevision() !== sessionRevision) return
    const nextInspection = { ...graphInspection, ...patch }
    if (Object.hasOwn(patch, 'selectedKey')) nextInspection.evidenceObjectId = ''
    setSearchParams(writeGraphInspection(searchParams, contextKey, nextInspection), options)
  }
  const evidenceReadiness = view === 'Evidence readiness'
  const [info, setInfo] = useState(null)
  const [evidencePagination, setEvidencePagination] = useState({ contextKey, page: 1 })
  const evidencePageNumber = evidencePagination.contextKey === contextKey ? evidencePagination.page : 1
  const setEvidencePageNumber = (page) => setEvidencePagination({ contextKey, page })
  const [reviewFilterReceipt, setReviewFilterReceipt] = useState(null)
  const reviewContextMatches = searchParams.get('reviewContext') === contextKey
  const reviewEvidenceId = reviewContextMatches ? searchParams.get('reviewEvidenceObjectId') || '' : ''
  const reviewSourceId = reviewContextMatches ? searchParams.get('reviewSourceId') || '' : ''
  const reviewQuery = reviewContextMatches ? searchParams.get('reviewQuery') || '' : ''
  const reviewQueryValid = reviewQuery.length <= 240 && reviewSourceId.length <= 240 && reviewEvidenceId.length <= 240
    && (!reviewEvidenceId || Boolean(reviewSourceId))
  const reviewFilter = reviewEvidenceId ? 'All' : reviewFilterReceipt?.contextKey === contextKey ? reviewFilterReceipt.filter : 'Needs review'
  const setReviewFilter = (filter) => setReviewFilterReceipt({ contextKey, filter })
  const [sourceRefresh, setSourceRefresh] = useState(0)
  const visibleInfo = info?.contextKey === contextKey && info?.sessionRevision === sessionRevision && getSessionRevision() === sessionRevision ? info : null
  const openerRef = useRef(null)
  if (info && info.contextKey !== contextKey) setInfo(null)
  useEffect(() => {
    openerRef.current = null
  }, [contextKey])
  const requiredContext = Boolean(workspaceId && revisionId && customerId && tenantId)
  const {
    currentData: rendererResponse,
    isLoading: rendererLoading,
    isFetching: rendererFetching,
    error: rendererError,
    refetch: refetchRenderer,
  } = useGetRuntimeRendererQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, sessionRevision },
    { skip: !requiredContext },
  )
  const renderer = getHubPayload(rendererResponse)
  const context = validateHubContext({ renderer, workspaceId, revisionId, customerId, tenantId })
  const canReadDetail = context.valid
  const needsLockBasis = ['Evidence readiness', 'Readiness & publish', 'After lock'].includes(view)
  const lockBasisRead = useGetRuntimeStateLockBasisQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, sessionRevision },
    { skip: !canReadDetail || !needsLockBasis || rendererFetching || Boolean(rendererError) },
  )
  const lockBasisLoading = Boolean(rendererFetching || lockBasisRead.isLoading || lockBasisRead.isFetching)
  const lockBasis = readLockBasis({ response: lockBasisRead.currentData,
    scope: { runtimeInstanceId: revisionId, customerId, tenantId }, stateVersion: renderer?.runtimeInstance?.stateVersion,
    loading: lockBasisLoading, error: lockBasisRead.error || rendererError })
  const lockNavigation = useRef(null)
  useLayoutEffect(() => {
    lockNavigation.current = { contextKey, view, sessionRevision, eligible: canReadDetail && needsLockBasis, loading: lockBasisLoading }
    return () => { lockNavigation.current = null }
  }, [contextKey, view, sessionRevision, canReadDetail, needsLockBasis, lockBasisLoading])
  const refreshLockView = (reads, additionalGuard = () => true) => {
    const origin = lockNavigation.current
    const isCurrent = () => origin && lockNavigation.current === origin && origin.eligible && !origin.loading
      && origin.contextKey === contextKey && origin.view === view && origin.sessionRevision === sessionRevision && getSessionRevision() === sessionRevision
    if (!isCurrent() || !additionalGuard()) return
    for (const refetch of reads) { if (!isCurrent() || !additionalGuard()) return; if (typeof refetch === 'function') refetch() }
  }
  const needsDiscoveryHealth = ['Intelligence Quality', 'Coverage', 'Readiness & publish'].includes(view)
  const discoveryHealthRead = useGetRuntimeStateDiscoveryHealthQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, sessionRevision },
    { skip: !canReadDetail || !needsDiscoveryHealth || rendererFetching || Boolean(rendererError) },
  )
  const discoveryHealthLoading = Boolean(rendererFetching || discoveryHealthRead.isLoading || discoveryHealthRead.isFetching)
  const discoveryHealth = readDiscoveryHealth({ response: discoveryHealthRead.currentData,
    scope: { runtimeInstanceId: revisionId, customerId, tenantId }, stateVersion: renderer?.runtimeInstance?.stateVersion,
    loading: discoveryHealthLoading, error: discoveryHealthRead.error || rendererError })
  const healthNavigation = useRef(null)
  useLayoutEffect(() => {
    healthNavigation.current = { contextKey, view, sessionRevision, eligible: canReadDetail && needsDiscoveryHealth, loading: discoveryHealthLoading }
    return () => { healthNavigation.current = null }
  }, [contextKey, view, sessionRevision, canReadDetail, needsDiscoveryHealth, discoveryHealthLoading])
  const currentHealthScope = origin => origin && healthNavigation.current === origin && origin.eligible && !origin.loading
    && origin.contextKey === contextKey && origin.view === view && origin.sessionRevision === sessionRevision
    && getSessionRevision() === sessionRevision
  const refreshHealthView = reads => {
    const origin = healthNavigation.current
    if (!currentHealthScope(origin) || discoveryHealthLoading) return
    for (const refetch of reads) { if (!currentHealthScope(origin)) return; if (typeof refetch === 'function') refetch() }
  }
  const completionScope = { runtimeInstanceId: revisionId, workspaceId, customerId, tenantId }
  const overviewCompletionRead = useGetReviewCompletionQuery(
    { ...completionScope, sessionRevision },
    { skip: !canReadDetail || !['Overview', 'Readiness & publish'].includes(view), refetchOnMountOrArgChange: true },
  )
  const findingCountLoading = Boolean(overviewCompletionRead.isLoading || overviewCompletionRead.isFetching || rendererFetching)
  const overviewCompletion = !findingCountLoading && !overviewCompletionRead.error && !rendererError
    ? readCompletion(overviewCompletionRead.currentData, completionScope) : null
  const reportReview = readAssuranceReview({ response: overviewCompletionRead.currentData, scope: completionScope,
    stateVersion: renderer?.runtimeInstance?.stateVersion, loading: findingCountLoading,
    error: overviewCompletionRead.error || rendererError })
  const pendingFindingCount = overviewCompletion?.currency === 'AS_READ'
    && typeof overviewCompletion.readAt === 'string' && Number.isFinite(Date.parse(overviewCompletion.readAt))
    && typeof overviewCompletion.stateVersion === 'string' && overviewCompletion.stateVersion.trim().length > 0
    && overviewCompletion.stateVersion === renderer?.runtimeInstance?.stateVersion
    && overviewCompletion.population.policy === 'revision-evidence-contradiction-decisions.v1'
    && overviewCompletion.population.pendingEvidence + overviewCompletion.population.pendingFindings <= overviewCompletion.population.decisionCount
    ? overviewCompletion.population.pendingFindings : null
  const { currentData: qualityResponse, error: qualityError, isFetching: qualityFetching, isLoading: qualityLoading, refetch: refetchQuality } = useGetRuntimeDiscoveryContradictionsQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, sessionRevision },
    { skip: !canReadDetail || !(quality || evidenceReadiness || view === 'Review' || view === 'Context') },
  )
  const { refetch: refetchAcquisitionSources } = useGetRuntimeStateSourcesQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, page: 1, pageSize: 1 },
    { skip: !canReadDetail || view !== 'Context' },
  )
  const qualityLinkedId = searchParams.get('findingContext') === contextKey ? searchParams.get('findingId') || '' : ''
  const defaultCandidate = !qualityLoading && !qualityFetching && !qualityError
    && getHubPayload(qualityResponse)?.control?.stateVersion === renderer?.runtimeInstance?.stateVersion
    && getHubPayload(qualityResponse)?.control?.customerId === customerId && getHubPayload(qualityResponse)?.control?.tenantId === tenantId
    ? readQualityCandidates({ response: qualityResponse }).candidates?.find(row => row.id === qualityLinkedId) : null
  const findingPopulation = qualityInspection.population || (qualityLinkedId && !defaultCandidate ? 'Detected candidates' : qualityDefaultPopulation(defaultCandidate))
  const findingSelection = { search: qualityInspection.search.trim(), type: FINDING_TYPES[qualityInspection.type],
    population: FINDING_POPULATIONS[findingPopulation], sort: qualityInspection.sort, page: qualityInspection.page, pageSize: 4 }
  const findingScopeKey = JSON.stringify([contextKey, view, sessionRevision, qualityLinkedId, findingSelection])
  const ownedFindingScope = () => findingFrame.current?.scopeKey === findingScopeKey
    && findingFrame.current.view === 'Intelligence Quality' && findingFrame.current.contextKey === contextKey
    && findingFrame.current.sessionRevision === sessionRevision && getSessionRevision() === sessionRevision
  const storedFindingRead = useGetRuntimeStateFindingsQuery({ runtimeInstanceId: revisionId, customerId, tenantId,
    ...findingSelection, stateVersion: renderer?.runtimeInstance?.stateVersion, sessionRevision },
  { skip: !quality || !canReadDetail || rendererFetching || Boolean(rendererError) })
  const storedFindingLoading = Boolean(storedFindingRead.isLoading || storedFindingRead.isFetching || rendererFetching)
  const storedFindings = readStoredFindings({ response: storedFindingRead.currentData,
    scope: { runtimeInstanceId: revisionId, customerId, tenantId, stateVersion: renderer?.runtimeInstance?.stateVersion },
    selection: findingSelection, loading: !quality || !canReadDetail || storedFindingLoading, error: rendererError || storedFindingRead.error })
  useLayoutEffect(() => {
    findingFrame.current = { token: findingFrameToken, scopeKey: findingScopeKey, contextKey, view, sessionRevision, model: storedFindings,
      blocked: !quality || !canReadDetail || storedFindingLoading || rendererError || storedFindingRead.isUninitialized === true }
    return () => { findingFrame.current = null }
  })
  const qualityNavigation = useRef(null)
  useLayoutEffect(() => {
    qualityNavigation.current = { contextKey, view, sessionRevision, response: qualityResponse,
      stateVersion: renderer?.runtimeInstance?.stateVersion, blocked: !canReadDetail || rendererFetching || rendererError || qualityLoading || qualityFetching || qualityError }
    return () => { qualityNavigation.current = null }
  }, [contextKey, view, sessionRevision, qualityResponse, renderer, canReadDetail, rendererFetching, rendererError, qualityLoading, qualityFetching, qualityError])
  const needsSourceSummary = ['Overview', 'Context', 'Sources', 'Evidence readiness', 'Readiness & publish'].includes(view)
  const sourceSummaryRead = useGetRuntimeStateSourceSummaryQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, sessionRevision },
    { skip: !canReadDetail || !needsSourceSummary },
  )
  const summaryActive = useRef(false)
  useEffect(() => {
    summaryActive.current = canReadDetail && needsSourceSummary && !sourceSummaryRead.isUninitialized
    return () => { summaryActive.current = false }
  }, [canReadDetail, needsSourceSummary, sourceSummaryRead.isUninitialized])
  const sourceSummaryLoading = Boolean(sourceSummaryRead.isLoading || sourceSummaryRead.isFetching || rendererFetching)
  const sourceSummary = readSourceSummary({ response: sourceSummaryRead.currentData,
    scope: { runtimeInstanceId: revisionId, customerId, tenantId }, stateVersion: renderer?.runtimeInstance?.stateVersion,
    loading: sourceSummaryLoading, error: sourceSummaryRead.error || rendererError })
  const needsInventory = ['Evidence readiness', 'Readiness & publish'].includes(view)
  const inventoryRead = useGetRuntimeStateEvidenceInventoryQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, sessionRevision },
    { skip: !canReadDetail || !needsInventory },
  )
  const inventoryLoading = Boolean(inventoryRead.isLoading || inventoryRead.isFetching || rendererFetching)
  const inventory = readEvidenceInventory({ response: inventoryRead.currentData,
    scope: { runtimeInstanceId: revisionId, customerId, tenantId }, stateVersion: renderer?.runtimeInstance?.stateVersion,
    loading: inventoryLoading, error: inventoryRead.error || rendererError })
  const { currentData: summaryEvidenceResponse, error: summaryEvidenceError, isLoading: summaryEvidenceLoading, isFetching: summaryEvidenceFetching, refetch: refetchSummaryEvidence } = useGetRuntimeStateEvidenceQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, page: 1, pageSize: 1 },
    { skip: !canReadDetail },
  )
  const summaryEvidencePage = summaryEvidenceError || summaryEvidenceFetching ? null : getHubEvidencePage(summaryEvidenceResponse)
  const needsOverviewCounts = view === 'Overview' || view === 'Context' || view === 'Review' || view === 'Readiness & publish'
  const { currentData: acceptedEvidenceResponse, error: acceptedEvidenceError, isFetching: acceptedEvidenceFetching, refetch: refetchAcceptedEvidence } = useGetRuntimeStateEvidenceQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, page: 1, pageSize: 1, reviewStatus: 'ACCEPTED' },
    { skip: !canReadDetail || !needsOverviewCounts },
  )
  const { currentData: pendingEvidenceResponse, error: pendingEvidenceError, isFetching: pendingEvidenceFetching, refetch: refetchPendingEvidence } = useGetRuntimeStateEvidenceQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, page: 1, pageSize: 1, reviewStatus: 'PENDING' },
    { skip: !canReadDetail || !(needsOverviewCounts || view === 'Sources') },
  )
  const { currentData: rejectedEvidenceResponse, error: rejectedEvidenceError, isFetching: rejectedEvidenceFetching, refetch: refetchRejectedEvidence } = useGetRuntimeStateEvidenceQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, page: 1, pageSize: 1, reviewStatus: 'REJECTED' },
    { skip: !canReadDetail || (view !== 'Overview' && view !== 'Readiness & publish') },
  )
  const evidenceStatusCounts = {
    accepted: getHubEvidenceStatusCount(acceptedEvidenceResponse, acceptedEvidenceError, summaryEvidencePage),
    pending: getHubEvidenceStatusCount(pendingEvidenceResponse, pendingEvidenceError, summaryEvidencePage),
    rejected: getHubEvidenceStatusCount(rejectedEvidenceResponse, rejectedEvidenceError, summaryEvidencePage),
  }
  const needsEvidence = view === 'Review'
  const {
    currentData: evidenceResponse,
    isLoading: evidenceLoading,
    isFetching: evidenceFetching,
    error: evidenceError,
    refetch: refetchEvidence,
  } = useGetRuntimeStateEvidenceQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, page: evidencePageNumber, pageSize: 25,
      search: view === 'Review' && !reviewEvidenceId ? reviewQuery : '',
      sourceId: view === 'Review' ? reviewSourceId : '',
      evidenceObjectId: view === 'Review' ? reviewEvidenceId : '',
      reviewStatus: view === 'Review' && reviewFilter !== 'All'
        ? ({ 'Needs review': 'PENDING', Accepted: 'ACCEPTED', Rejected: 'REJECTED' }[reviewFilter] || '')
        : '' },
    { skip: !canReadDetail || !needsEvidence || !reviewQueryValid },
  )
  // The V2 endpoint reports an empty first filtered page as EVIDENCE_MISSING.
  // A successful unfiltered count distinguishes that from missing storage.
  const emptyFilteredPage = view === 'Review' && reviewFilter !== 'All' && evidencePageNumber === 1
    && typeof summaryEvidencePage?.total === 'number' && Number.isFinite(summaryEvidencePage.total)
    && summaryEvidencePage.total >= 0 && !summaryEvidencePage.totalCapped
    && evidenceError?.data?.error?.code === 'RUNTIME_STATE_V2_EVIDENCE_MISSING'
  const readEvidencePage = emptyFilteredPage
    ? { evidenceObjects: [], total: 0, page: 1, pageSize: 25 }
    : getHubEvidencePage(evidenceResponse)
  const exactReviewMismatch = Boolean(reviewEvidenceId && readEvidencePage
    && (readEvidencePage.evidenceObjects.length !== 1 || readEvidencePage.evidenceObjects[0].evidenceObjectId !== reviewEvidenceId
      || readEvidencePage.evidenceObjects[0].sourceId !== reviewSourceId))
  const evidencePage = exactReviewMismatch ? null : readEvidencePage
  const needsGraphManifest = ['Intelligence Graph', 'Overview', 'Coverage'].includes(view) || (view === 'Readiness & publish' && visibleInfo?.kind === 'assurance-report')
  const { currentData: graphManifestResponse, isFetching: graphManifestFetching, error: graphManifestError, refetch: refetchGraphManifest, isUninitialized: manifestUninitialized } = useGetRuntimeStateGraphManifestQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, sessionRevision },
    { skip: !canReadDetail || !needsGraphManifest },
  )
  const manifest = !graphManifestError ? getHubPayload(graphManifestResponse)?.manifest ?? getHubPayload(graphManifestResponse) : null
  const { currentData: graphResponse, isFetching: graphFetching, error: graphError, isUninitialized: graphUninitialized, refetch: refetchGraph } = useGetRuntimeStateGraphProjectionQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, sessionRevision },
    { skip: !canReadDetail || view !== 'Intelligence Graph' || manifest?.status !== 'CURRENT' },
  )
  const graphLoading = Boolean(graphManifestFetching || graphFetching)
  const graph = !graphLoading && !graphError && manifest?.status === 'CURRENT' ? getHubPayload(graphResponse)?.graph ?? getHubPayload(graphResponse) : null
  const neighbourhoodEnabled = Boolean(canReadDetail && view === 'Intelligence Graph' && !graphInspection.invalid
    && graphInspection.objectView === 'object' && (graphInspection.selectedKey || graphInspection.evidenceObjectId) && ['Journey', 'Lineage', 'Impact'].includes(graphInspection.mode))
  const neighbourhoodReady = neighbourhoodEnabled && !graphLoading && !graphManifestError && !graphError
    && isCurrentGraphSnapshot(manifest, graph) && /^sha256:[a-f0-9]{64}$/.test(manifest?.graphHash)
  const neighbourhoodQuery = useGetRuntimeStateGraphNeighbourhoodQuery({ runtimeInstanceId: revisionId, customerId, tenantId, sessionRevision,
    nodeId: graphInspection.selectedKey, evidenceObjectId: graphInspection.evidenceObjectId,
    mode: graphInspection.mode, graphHash: manifest?.graphHash, afterEdgeKey: graphInspection.afterEdgeKey }, { skip: !neighbourhoodReady })
  const neighbourhoodLoading = Boolean(graphLoading || neighbourhoodQuery.isFetching)
  const neighbourhood = readCurrentGraphNeighbourhood({ response: neighbourhoodQuery.currentData,
    scope: { runtimeInstanceId: revisionId, customerId, tenantId }, manifest, stateVersion: renderer?.runtimeInstance?.stateVersion,
    selection: { nodeId: graphInspection.selectedKey, evidenceObjectId: graphInspection.evidenceObjectId, mode: graphInspection.mode, afterEdgeKey: graphInspection.afterEdgeKey },
    loading: neighbourhoodLoading, error: graphManifestError || graphError || neighbourhoodQuery.error, active: neighbourhoodReady })
  const neighbourhoodKey = JSON.stringify([graphInspection.selectedKey, graphInspection.evidenceObjectId, graphInspection.mode, graphInspection.afterEdgeKey, manifest?.graphHash])
  useLayoutEffect(() => {
    if (graphNavigation.current) Object.assign(graphNavigation.current, { graph, manifest, neighbourhood, neighbourhoodKey })
  }, [graph, manifest, neighbourhood, neighbourhoodKey, view, contextKey, sessionRevision])
  const currentNeighbourhood = () => {
    const current = graphNavigation.current
    return current && current.contextKey === contextKey && current.view === 'Intelligence Graph'
      && current.sessionRevision === sessionRevision && getSessionRevision() === sessionRevision
      && current.neighbourhood === neighbourhood && current.neighbourhoodKey === neighbourhoodKey
      && current.manifest === manifest && neighbourhoodReady && !neighbourhoodLoading
  }
  const retryNeighbourhood = () => {
    if (currentNeighbourhood() && !neighbourhoodQuery.isUninitialized) neighbourhoodQuery.refetch()
  }
  const pageNeighbourhood = afterEdgeKey => {
    if (!currentNeighbourhood() || (afterEdgeKey && afterEdgeKey !== neighbourhood?.page.nextAfterEdgeKey)) return
    changeGraphInspection({ afterEdgeKey })
  }
  const inspectNeighbourhood = selectedKey => {
    if (!currentNeighbourhood() || !neighbourhood?.model.nodes.some(node => node.key === selectedKey)) return
    changeGraphInspection({ selectedKey, objectView: 'object', afterEdgeKey: '' })
  }
  const openNeighbourhoodSource = focus => {
    if (!currentNeighbourhood() || !neighbourhood || JSON.stringify(focus) !== JSON.stringify(graphSourceFocus(neighbourhood.selected))) return
    setSearchParams(graphSourceParams(searchParams, contextKey, focus))
  }
  const refreshGraph = async () => {
    const origin = graphNavigation.current ? { ...graphNavigation.current } : null
    const result = await refetchGraphManifest()
    const current = graphNavigation.current
    if (!origin || !current || current.contextKey !== contextKey || current.view !== 'Intelligence Graph'
      || current.sessionRevision !== sessionRevision || getSessionRevision() !== sessionRevision
      || current.neighbourhoodKey !== origin.neighbourhoodKey) return
    const nextManifest = getHubPayload(result.data)?.manifest ?? getHubPayload(result.data)
    if (!result.error && !graphUninitialized && nextManifest?.status === 'CURRENT') refetchGraph()
    if (!result.error && neighbourhoodReady && !neighbourhoodQuery.isUninitialized && nextManifest?.graphHash === manifest?.graphHash) neighbourhoodQuery.refetch()
  }
  const graphCoverageFetching = Boolean(graphManifestFetching || rendererFetching)
  const graphCoverageError = graphManifestError || rendererError
  const graphCoverage = readCurrentCoverage({ response: graphManifestResponse,
    scope: { runtimeInstanceId: revisionId, customerId, tenantId }, stateVersion: renderer?.runtimeInstance?.stateVersion,
    loading: graphCoverageFetching, error: graphCoverageError })
  useLayoutEffect(() => {
    if (coverageNavigation.current) Object.assign(coverageNavigation.current, { coverage: graphCoverage, loading: graphCoverageFetching })
  }, [graphCoverage, graphCoverageFetching, view, contextKey, sessionRevision])
  const overviewReads = [
    [overviewCompletionRead.currentData, overviewCompletionRead.isFetching],
    [sourceSummaryRead.currentData, sourceSummaryRead.isFetching],
    [summaryEvidenceResponse, summaryEvidenceFetching],
    [acceptedEvidenceResponse, acceptedEvidenceFetching],
    [pendingEvidenceResponse, pendingEvidenceFetching],
    [rejectedEvidenceResponse, rejectedEvidenceFetching],
    [graphManifestResponse, graphCoverageFetching],
  ]
  const overviewPending = view === 'Overview' && overviewReads.some(([response, fetching]) => !response && fetching)
  const overviewRefreshing = rendererFetching || overviewReads.some(([, fetching]) => fetching)
  const refreshOverview = () => {
    [refetchRenderer, refetchSummaryEvidence, refetchAcceptedEvidence, refetchPendingEvidence,
      refetchRejectedEvidence, refetchGraphManifest, sourceSummaryRead.refetch, overviewCompletionRead.refetch].forEach((refetch) => refetch())
  }
  const coverageRefreshing = rendererFetching || summaryEvidenceFetching || graphCoverageFetching || discoveryHealthLoading
  const refreshCoverage = () => refreshHealthView([refetchRenderer, refetchSummaryEvidence, refetchGraphManifest,
    discoveryHealthRead.isUninitialized !== true && discoveryHealthRead.refetch])
  const contextRefreshing = qualityLoading || qualityFetching || rendererFetching || summaryEvidenceFetching || acceptedEvidenceFetching || pendingEvidenceFetching || (needsSourceSummary && sourceSummaryRead.isFetching)
  const refreshContext = () => [refetchRenderer, refetchQuality, refetchSummaryEvidence, refetchAcceptedEvidence, refetchPendingEvidence, sourceSummaryRead.refetch].forEach((refetch) => refetch())
  const sourcesRefreshing = rendererFetching || summaryEvidenceFetching || pendingEvidenceFetching || evidenceFetching || (needsSourceSummary && sourceSummaryRead.isFetching)
  const refreshSources = () => {
    setSourceRefresh(value => value + 1)
    ;[refetchRenderer, refetchSummaryEvidence, refetchPendingEvidence, sourceSummaryRead.refetch].forEach(refetch => refetch())
  }
  const reviewRefreshing = sourcesRefreshing || acceptedEvidenceFetching
  const readinessRefreshing = contextRefreshing || rejectedEvidenceFetching || inventoryRead.isFetching || discoveryHealthLoading || lockBasisLoading || findingCountLoading
  const readinessNavigation = useRef(null)
  useLayoutEffect(() => {
    readinessNavigation.current = { contextKey, view, sessionRevision, loading: readinessRefreshing }
    return () => { readinessNavigation.current = null }
  }, [contextKey, view, sessionRevision, readinessRefreshing])
  const refreshReadiness = () => {
    const origin = readinessNavigation.current
    const isCurrent = () => origin && readinessNavigation.current === origin && !origin.loading
      && origin.contextKey === contextKey && origin.view === view && origin.sessionRevision === sessionRevision
    if (readinessRefreshing || !isCurrent()) return
    refreshLockView([refetchRenderer, refetchSummaryEvidence, refetchAcceptedEvidence, refetchPendingEvidence, refetchRejectedEvidence, sourceSummaryRead.refetch, inventoryRead.refetch,
      discoveryHealthRead.isUninitialized !== true && discoveryHealthRead.refetch, lockBasisRead.isUninitialized !== true && lockBasisRead.refetch,
      overviewCompletionRead.isUninitialized !== true && overviewCompletionRead.refetch], isCurrent)
  }
  const reportRefreshing = readinessRefreshing || graphCoverageFetching || findingCountLoading
  const reportNavigation = useRef(null)
  useLayoutEffect(() => {
    reportNavigation.current = { contextKey, view, sessionRevision, info: visibleInfo, refreshing: reportRefreshing, eligible: canReadDetail }
    return () => { reportNavigation.current = null }
  }, [contextKey, view, sessionRevision, visibleInfo, reportRefreshing, canReadDetail])
  const refreshReport = () => {
    const current = reportNavigation.current
    const isCurrent = () => current && reportNavigation.current === current && current.contextKey === contextKey
      && current.eligible && !current.refreshing
      && current.view === 'Readiness & publish' && current.sessionRevision === sessionRevision
      && getSessionRevision() === sessionRevision && current.info === visibleInfo && visibleInfo?.kind === 'assurance-report'
    if (!isCurrent() || !canReadDetail || reportRefreshing) return
    const reads = [refetchRenderer, refetchSummaryEvidence, refetchAcceptedEvidence, refetchPendingEvidence, refetchRejectedEvidence,
      sourceSummaryRead.isUninitialized !== true && sourceSummaryRead.refetch,
      inventoryRead.isUninitialized !== true && inventoryRead.refetch,
      manifestUninitialized !== true && refetchGraphManifest,
      discoveryHealthRead.isUninitialized !== true && discoveryHealthRead.refetch,
      lockBasisRead.isUninitialized !== true && lockBasisRead.refetch,
      overviewCompletionRead.isUninitialized !== true && overviewCompletionRead.refetch]
    for (const refetch of reads) { if (!isCurrent()) return; if (typeof refetch === 'function') refetch() }
  }
  const discovery = summaryEvidenceLoading || !summaryEvidencePage
    ? null
    : reconcileHubDiscovery(getHubDiscovery(renderer), summaryEvidencePage)
  const qualityHref = context.valid ? getHubDestinationHref('quality', workspaceId, revisionId) : ''
  const graphQualityHref = context.valid ? `/app/intelligence/quality?${searchParams}` : ''
  const requestedFinding = searchParams.get('findingId') || ''
  const graphFindingId = searchParams.get('findingContext') === contextKey && searchParams.getAll('findingContext').length === 1
    && searchParams.getAll('findingId').length === 1 && requestedFinding.length <= 240 && requestedFinding === requestedFinding.trim()
    && !Array.from(requestedFinding).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ? requestedFinding : ''
  const evidenceReadinessRefreshing = rendererFetching || summaryEvidenceFetching || qualityFetching || sourceSummaryRead.isFetching || inventoryRead.isFetching || lockBasisLoading
  const refreshEvidenceReadiness = () => {
    if (!evidenceReadinessRefreshing) refreshLockView([refetchRenderer, refetchSummaryEvidence, refetchQuality, sourceSummaryRead.refetch, inventoryRead.refetch, lockBasisRead.isUninitialized !== true && lockBasisRead.refetch])
  }
  const refreshAfterLock = () => refreshLockView([refetchRenderer, lockBasisRead.isUninitialized !== true && lockBasisRead.refetch])
  const workbenchHref = context.valid ? `${getHubReturnHref(revisionId)}/workbench` : ''
  const acquisitionParams = new URLSearchParams(searchParams)
  acquisitionParams.set('view', 'context')
  if (view === 'Intelligence Graph' && !graphInspection.invalid && graphInspection.objectView === 'object' && (graphInspection.selectedKey || graphInspection.evidenceObjectId)) acquisitionParams.set('graphContextReturn', 'inspection')
  else acquisitionParams.delete('graphContextReturn')
  const acquisitionHref = context.valid ? `/app/intelligence?${acquisitionParams.toString()}` : ''

  const openInfo = (nextInfo, opener) => {
    openerRef.current = opener
    setInfo({ ...nextInfo, contextKey, sessionRevision })
  }
  const closeInfo = () => {
    setInfo(null)
    openerRef.current?.focus()
  }
  const selectView = (nextView, nextReviewFilter, focus) => {
    setInfo(null)
    setEvidencePageNumber(1)
    if (nextView === 'Intelligence Quality') {
      const next = new URLSearchParams(searchParams)
      if (focus?.findingId) {
        QUALITY_INSPECTION_KEYS.forEach(key => next.delete(key))
        next.set('findingId', focus.findingId); next.set('findingContext', contextKey)
        next.set('qualityReturnView', view); next.set('qualityReturnContext', contextKey)
      }
      navigate(`/app/intelligence/quality?${next}`)
      return
    }
    if (quality) {
      const next = new URLSearchParams(searchParams)
      next.set('view', nextView.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, ''))
      navigate(`/app/intelligence?${next}`)
      return
    }
    if (nextView === 'Review' && nextReviewFilter) setReviewFilter(nextReviewFilter)
    const next = new URLSearchParams(searchParams)
    next.set('view', nextView.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, ''))
    if (focus) {
      next.set('reviewContext', contextKey)
      next.set('reviewSourceId', focus.sourceId)
      next.set('reviewEvidenceObjectId', focus.evidenceObjectId)
    } else if (nextView === 'Review') {
      next.delete('reviewSourceId'); next.delete('reviewEvidenceObjectId'); next.delete('reviewContext')
    }
    setSearchParams(next)
  }
  const selectReviewFilter = (nextFilter) => {
    setReviewFilter(nextFilter)
    setEvidencePageNumber(1)
    const next = new URLSearchParams(searchParams)
    next.delete('reviewSourceId'); next.delete('reviewEvidenceObjectId')
    if (!next.get('reviewQuery')) next.delete('reviewContext')
    setSearchParams(next)
  }
  const openReviewSource = (sourceId, evidenceObjectId) => {
    setInfo(null)
    const next = new URLSearchParams(searchParams)
    next.set('view', 'sources')
    next.set('sourceContext', contextKey)
    next.set('sourceId', sourceId)
    if (evidenceObjectId) next.set('evidenceObjectId', evidenceObjectId)
    else next.delete('evidenceObjectId')
    next.set('sourceEvidencePage', '1')
    setSearchParams(next)
  }
  const openGraphSource = focus => {
    const current = graphNavigation.current
    if (!current || current.contextKey !== contextKey || current.view !== 'Intelligence Graph'
      || current.sessionRevision !== sessionRevision || getSessionRevision() !== sessionRevision
      || current.graph !== graph || current.manifest !== manifest
      || graphLoading || !isCurrentGraphSnapshot(manifest, graph)) return
    setSearchParams(graphSourceParams(searchParams, contextKey, focus))
  }
  const openQualitySource = (findingId, sourceId, evidenceObjectId) => {
    const current = () => currentFindingFrame() && storedFindings?.available === true
      && findingFrame.current.model === storedFindings && storedFindings.candidates.some(row => row.id === findingId
        && row.evidence.some(item => item.sourceId === sourceId && item.evidenceObjectId === evidenceObjectId))
    if (!current()) return
    const origin = new URLSearchParams(searchParams)
    origin.set('findingId', findingId); origin.set('findingContext', contextKey)
    // The initially displayed candidate may not yet have a shareable selection.
    // Bind it in the history entry before leaving so Back cannot choose another.
    navigate(`/app/intelligence/quality?${origin}`, { replace: true })
    if (!current()) return
    const next = new URLSearchParams(origin)
    ;['sourceQuery', 'sourceType', 'sourcePage', 'evidencePage', 'sourceEvidencePage'].forEach(key => next.delete(key))
    next.set('view', 'sources'); next.set('sourceContext', contextKey)
    next.set('sourceId', sourceId); next.set('evidenceObjectId', evidenceObjectId)
    next.set('sourceEvidencePage', '1')
    navigate(`/app/intelligence?${next}`)
  }
  const qualityGraphPair = (findingId, evidenceObjectId) => readQualityGraphPair({ response: qualityResponse,
    scope: { runtimeInstanceId: revisionId, customerId, tenantId }, stateVersion: renderer?.runtimeInstance?.stateVersion,
    findingId, evidenceObjectId, loading: !canReadDetail || rendererFetching || qualityLoading || qualityFetching,
    error: rendererError || qualityError })
  const openQualityGraph = (findingId, evidenceObjectId) => {
    const originRead = qualityNavigation.current
    const isCurrent = () => originRead && qualityNavigation.current === originRead && originRead.contextKey === contextKey
      && originRead.view === 'Intelligence Quality' && originRead.sessionRevision === sessionRevision && getSessionRevision() === sessionRevision
      && originRead.response === qualityResponse && originRead.stateVersion === renderer?.runtimeInstance?.stateVersion && !originRead.blocked
    if (!isCurrent() || !currentFindingFrame() || !storedFindings?.available
      || !storedFindings.candidates.some(row => row.id === findingId && row.evidence.some(item => item.evidenceObjectId === evidenceObjectId))
      || !qualityGraphPair(findingId, evidenceObjectId)) return
    const origin = new URLSearchParams(searchParams)
    origin.set('findingId', findingId); origin.set('findingContext', contextKey)
    navigate(`/app/intelligence/quality?${origin}`, { replace: true })
    if (!isCurrent() || !currentFindingFrame()) return
    const next = writeGraphInspection(origin, contextKey, { mode: 'Lineage', search: '', selectedKey: '', evidenceObjectId, objectView: 'object' })
    next.set('view', 'intelligence-graph')
    next.delete('graphContextReturn')
    navigate(`/app/intelligence?${next}`)
  }
  const openCoverageSources = domain => {
    const current = coverageNavigation.current
    if (view === 'Coverage' && (!current || current.contextKey !== contextKey || current.view !== 'Coverage'
      || current.sessionRevision !== sessionRevision || getSessionRevision() !== sessionRevision || current.key !== coverageNavigationKey
      || current.coverage !== graphCoverage || current.loading || coverageInspection.notice || graphCoverageFetching
      || !graphCoverage?.coverage.domains.some(row => row.domain === domain))) return
    const next = new URLSearchParams(searchParams)
    next.set('view', 'sources')
    next.set('sourceContext', contextKey)
    next.set('sourceQuery', domain)
    ;['sourceId', 'evidenceObjectId', 'sourcePage', 'evidencePage', 'sourceEvidencePage', 'sourceType', 'sourceReturn', 'graphContextReturn'].forEach(key => next.delete(key))
    setSearchParams(next)
  }
  const reviewLocked = renderer?.lock?.locked === true || Boolean(renderer?.lock?.lockedAt) || renderer?.lock?.state === 'LOCKED'
  const reviewAuthority = readHubReviewAuthority({ response: canReadDetail ? qualityResponse : null, error: qualityError,
    loading: qualityLoading || qualityFetching || rendererFetching, locked: reviewLocked,
    scope: { runtimeInstanceId: revisionId, customerId, tenantId }, renderer })
  const refreshReviewReads = async (afterDecision = false) => {
    const origin = healthNavigation.current
    if (quality && (!ownedFindingScope() || !afterDecision && (!currentHealthScope(origin) || discoveryHealthLoading || !currentFindingFrame()))) return false
    const reads = quality ? [refetchRenderer, refetchQuality] : [refetchRenderer, refetchQuality, refetchSummaryEvidence, refetchAcceptedEvidence, refetchPendingEvidence, refetchEvidence]
    if (quality && storedFindingRead.isUninitialized !== true && typeof storedFindingRead.refetch === 'function') reads.push(storedFindingRead.refetch)
    if (quality && discoveryHealthRead.isUninitialized !== true && typeof discoveryHealthRead.refetch === 'function') reads.push(discoveryHealthRead.refetch)
    const results = await Promise.allSettled(reads.map(read => quality && !ownedFindingScope() ? { error: true } : read()))
    return (!quality || ownedFindingScope()) && results.every(result => result.status === 'fulfilled' && result.value && !result.value.error)
  }
  const refreshAcquisitionReads = async () => {
    return refreshAcquisitionScope({
      reads: [refetchRenderer, refetchQuality, refetchAcquisitionSources, refetchSummaryEvidence, refetchAcceptedEvidence, refetchPendingEvidence],
      scope: { workspaceId, revisionId, customerId, tenantId }, refreshSummary: sourceSummaryRead.refetch,
      summaryIsCurrent: () => summaryActive.current && getSessionRevision() === sessionRevision,
    })
  }
  const reviewActions = useHubReviewActions({ authority: reviewAuthority, runtimeInstanceId: revisionId,
    contextKey, viewKey: contextKey + ':' + view, sessionRevision, locked: reviewLocked, refresh: quality ? () => refreshReviewReads(true) : refreshReviewReads })
  const canDecideStoredFinding = candidate => storedFindings?.available && reviewActions.canReviewFinding
    && reviewAuthority?.control?.stateVersion === renderer?.runtimeInstance?.stateVersion
    && storedFindings.candidates.some(row => row.id === candidate?.id && row.evidencePairHash === candidate.evidencePairHash)
    && reviewAuthority.candidates?.filter(row => row.contradictionId === candidate?.id && row.evidencePairHash === candidate.evidencePairHash).length === 1
  const storedQualityActions = { ...reviewActions, canReviewCandidate: canDecideStoredFinding,
    decideFinding: (candidate, disposition, rationale) => currentFindingFrame() && canDecideStoredFinding(candidate)
      ? reviewActions.decideFinding(candidate, disposition, rationale) : Promise.resolve(false) }
  const refreshDecisions = async () => { if (await refreshReviewReads()) reviewActions.resetAfterRefresh() }
  const evidenceControl = evidencePage?.control
  const evidenceScopeMatches = evidenceControl && String(evidenceControl.customerId) === customerId && String(evidenceControl.tenantId) === tenantId
    && [evidenceControl.id, evidenceControl.runtimeInstanceKey].includes(revisionId)
    && evidenceControl.stateVersion === reviewAuthority?.control?.stateVersion
  const evidenceActions = { ...reviewActions, canReviewEvidence: reviewActions.canReviewEvidence && Boolean(evidenceScopeMatches) && !evidenceFetching && !evidenceError }
  const findingRead = readQualityCandidates({ response: qualityResponse, error: qualityError, isLoading: qualityLoading || qualityFetching })
  const outstandingFindings = findingRead.candidates?.filter(item => !['NOT_CONTRADICTORY', 'CONFIRMED'].includes(item.status)) ?? null
  const searchReview = query => {
    const next = new URLSearchParams(searchParams)
    next.set('reviewContext', contextKey)
    if (query) next.set('reviewQuery', query); else next.delete('reviewQuery')
    next.delete('reviewSourceId'); next.delete('reviewEvidenceObjectId')
    setEvidencePageNumber(1)
    setSearchParams(next)
  }
  const helpHref = getHubHelpHref({ view, search: searchParams.toString(), quality })
  const headingSourceCount = displayHubCount(sourceSummary?.uniqueSourceCount ?? null)
  const headingEvidenceCount = displayHubCount(getHubCount(discovery?.evidenceObjectSummary, 'evidenceObjectCount'))

  return <main className={`intelligence-hub container${evidenceReadiness ? ' intelligence-hub--evidence-readiness' : view === 'Overview' ? ' intelligence-hub--overview' : view === 'Context' ? ' intelligence-hub--context' : view === 'Sources' ? ' intelligence-hub--sources' : view === 'Review' ? ' intelligence-hub--review' : view === 'Readiness & publish' ? ' intelligence-hub--readiness' : view === 'After lock' ? ' intelligence-hub--after-lock' : view === 'Coverage' ? ' intelligence-hub--coverage' : view === 'Intelligence Graph' ? ' intelligence-hub--graph' : quality ? ' intelligence-hub--quality' : ''}`} aria-labelledby="intelligence-hub-title">
    <div className="intelligence-hub__selected" role="group" aria-label="Selected workspace context">
      <div className="intelligence-hub__selected-context">
        <span>Selected Workspace</span>
        <strong>{context.valid ? renderer.runtimeInstance.name || 'Workspace' : 'Workspace unavailable'}</strong>
        {context.valid && renderer.revision.revisionNumber ? <Badge className="intelligence-hub__selected-revision" variant="success" size="sm" pill>{`R${renderer.revision.revisionNumber} · Current`}</Badge> : null}
      </div>
      <nav aria-label="Workspace areas">
        <Link to={context.valid ? getHubReturnHref(revisionId) : '/app/dashboard'} variant="subtle">Workspace Home</Link>
        {quality ? <Link to={`/app/intelligence?${getHubContextSearch(workspaceId, revisionId, 'Overview')}`} variant="subtle">Intelligence Hub</Link> : <span aria-current="page">Intelligence Hub</span>}
        {quality ? <span aria-current="page">Intelligence Quality</span> : <BoundaryLink to={qualityHref} note="">Intelligence Quality</BoundaryLink>}
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
            ? `Sources unavailable · ${headingEvidenceCount} evidence objects`
            : `${headingSourceCount} unique sources · ${headingEvidenceCount} evidence objects`}</span>
        </div>
        <nav className="intelligence-hub__overview-controls" aria-label="Intelligence Hub actions">
          <Button className="intelligence-hub__overview-refresh" size="sm" variant="outline" disabled={overviewRefreshing} aria-busy={Boolean(overviewRefreshing)} onClick={refreshOverview}>↻ Refresh</Button>
          <Link to={acquisitionHref} variant="subtle" underline="none" className="btn btn--primary intelligence-hub__overview-add-evidence"
            title="Open Context for acquisition or locked-revision recovery. Navigation makes no change.">＋ Add Evidence</Link>
        </nav>
      </div> : <div className="intelligence-hub__heading-actions">
        {!evidenceReadiness && view !== 'Context' && view !== 'After lock' && view !== 'Coverage' && view !== 'Intelligence Graph' && !quality ? <span>Last updated <strong>{readableDate(renderer.runtimeInstance.updatedAt)}</strong></span> : null}
        <Button size="sm" variant="outline" disabled={evidenceReadiness ? evidenceReadinessRefreshing : quality ? rendererFetching || qualityFetching || storedFindingLoading || discoveryHealthLoading : view === 'Context' ? contextRefreshing : view === 'Sources' ? sourcesRefreshing : view === 'Review' ? reviewRefreshing : view === 'Readiness & publish' ? readinessRefreshing : view === 'Coverage' ? coverageRefreshing : view === 'Intelligence Graph' ? graphLoading : view === 'After lock' && lockBasisLoading} aria-busy={Boolean(evidenceReadiness ? evidenceReadinessRefreshing : quality ? rendererFetching || qualityFetching || storedFindingLoading || discoveryHealthLoading : view === 'Context' ? contextRefreshing : view === 'Sources' ? sourcesRefreshing : view === 'Review' ? reviewRefreshing : view === 'Readiness & publish' ? readinessRefreshing : view === 'Coverage' ? coverageRefreshing : view === 'Intelligence Graph' ? graphLoading : view === 'After lock' && lockBasisLoading)} onClick={evidenceReadiness ? refreshEvidenceReadiness : quality ? refreshDecisions : view === 'Context' ? refreshContext : view === 'Sources' ? refreshSources : view === 'Review' ? refreshDecisions : view === 'Readiness & publish' ? refreshReadiness : view === 'Coverage' ? refreshCoverage : view === 'Intelligence Graph' ? refreshGraph : view === 'After lock' ? refreshAfterLock : refetchRenderer}>↻ Refresh</Button>
        {view === 'After lock' ? <Button size="sm" className="intelligence-hub__lock-discovery" onClick={() => selectView('Context')}>Open acquisition in Context →</Button> : null}
        {view === 'Coverage' ? <Link to={acquisitionHref} variant="subtle" underline="none" className="btn btn--primary intelligence-hub__coverage-acquire" title="Open Context for acquisition. Navigation makes no change.">＋ Add Evidence</Link> : null}
        {view === 'Intelligence Graph' || quality || evidenceReadiness ? <Link to={acquisitionHref} variant="subtle" underline="none" className="btn btn--primary intelligence-graph__technical" title="Open Context for acquisition or locked-revision recovery. Navigation makes no change.">＋ Add Evidence</Link> : null}
      </div> : null}
    </header>
    {!requiredContext ? <Status variant="warning">Open Intelligence Hub from a selected Execution Workspace revision.</Status>
      : rendererLoading || (!renderer && rendererFetching) ? <p role="status">Loading selected revision…</p>
        : rendererError || !context.valid ? <Status variant="warning">{rendererError ? 'The selected revision could not be loaded.' : context.reason}</Status>
          : <>
            <TabView activeTab={viewIndex} onTabChange={(index) => selectView(index === HUB_VIEWS.length ? 'Intelligence Quality' : HUB_VIEWS[index])} aria-label="Intelligence Hub views" className="intelligence-hub__tabs">
            <TabView.Tab label="Overview">
              {overviewPending ? null : <OverviewMetrics renderer={renderer} discovery={discovery} sourceSummary={sourceSummary} graphCoverage={graphCoverage} coverageLoading={graphCoverageFetching} pendingFindingCount={pendingFindingCount} findingCountLoading={findingCountLoading} onOpen={openInfo} onSelectView={selectView} qualityHref={qualityHref} />}
              <Overview renderer={renderer} discovery={discovery} sourceSummary={sourceSummary} sourceSummaryLoading={sourceSummaryLoading} pendingFindingCount={pendingFindingCount} graphCoverage={graphCoverage} evidenceStatusCounts={evidenceStatusCounts} isLoading={overviewPending} onOpen={openInfo} qualityHref={qualityHref} onSelectView={selectView} />
            </TabView.Tab>
            <TabView.Tab label="Context">{view === 'Context' && graphContextReturnHref(searchParams, contextKey) ? <Link className="intelligence-hub__graph-return" to={graphContextReturnHref(searchParams, contextKey)} variant="subtle" underline="none">Return to graph inspection →</Link> : null}<ContextAcquisitionView sourceSummary={sourceSummary} sourceSummaryLoading={sourceSummaryLoading} active={view === 'Context'} key={contextKey} discovery={getHubDiscovery(renderer)} renderer={renderer} authority={reviewAuthority} loading={rendererFetching || qualityLoading || qualityFetching} locked={reviewLocked} runtimeInstanceId={revisionId} customerId={customerId} tenantId={tenantId} contextKey={contextKey} refresh={refreshAcquisitionReads} evidenceStatusCounts={evidenceStatusCounts} countsLoading={summaryEvidenceLoading || summaryEvidenceFetching || acceptedEvidenceFetching || pendingEvidenceFetching} workbenchHref={workbenchHref} onSelectView={selectView} /></TabView.Tab>
            <TabView.Tab label="Sources">{view === 'Sources' ? <>{graphSourceReturnHref(searchParams, contextKey) ? <Link className="intelligence-hub__graph-return" to={graphSourceReturnHref(searchParams, contextKey)} variant="subtle" underline="none">Return to graph inspection →</Link> : null}<SourcesView stateVersion={!rendererFetching && !rendererError && context.valid ? renderer?.runtimeInstance?.stateVersion : null} sourceSummary={sourceSummary} sourceSummaryLoading={sourceSummaryLoading} onRefreshSummary={sourceSummaryRead.refetch} key={contextKey} workspaceId={workspaceId} revisionId={revisionId} customerId={customerId} tenantId={tenantId} active={view === 'Sources'} canRead={canReadDetail} locked={Boolean(renderer.lock?.locked || renderer.runtimeInstance.lockedAt || renderer.revision.status === 'LOCKED')} pendingCount={evidenceStatusCounts.pending} countsLoading={summaryEvidenceFetching || pendingEvidenceFetching} onOpen={openInfo} onSelectView={selectView} refreshToken={sourceRefresh} /></> : null}</TabView.Tab>
            <TabView.Tab label="Review"><ReviewView completion={view === "Review" ? <ReviewCompletionPanel key={contextKey} scope={{ runtimeInstanceId: revisionId, workspaceId, customerId, tenantId }} locked={reviewLocked} onRecorded={refreshReviewReads} /> : null} key={contextKey} evidencePage={evidencePage} isLoading={evidenceLoading || evidenceFetching} error={emptyFilteredPage ? null : evidenceError} evidenceStatusCounts={evidenceStatusCounts} countsLoading={summaryEvidenceFetching || acceptedEvidenceFetching || pendingEvidenceFetching} onOpenSource={openReviewSource} onSelectView={selectView} page={evidencePageNumber} setPage={setEvidencePageNumber} filter={reviewFilter} onFilterChange={selectReviewFilter} query={reviewEvidenceId ? "" : reviewQuery} onSearch={searchReview} focused={Boolean(reviewEvidenceId)} onReturn={() => { const next = new URLSearchParams(searchParams); next.delete("reviewSourceId"); next.delete("reviewEvidenceObjectId"); setSearchParams(next) }} actions={evidenceActions} findings={outstandingFindings} /></TabView.Tab>
            <TabView.Tab label="Evidence readiness">{evidenceReadiness ? <EvidenceReadinessView lockBasis={lockBasis} lockBasisLoading={lockBasisLoading} key={contextKey} renderer={renderer} sourceSummary={sourceSummary} sourceSummaryLoading={sourceSummaryLoading} inventory={inventory} inventoryLoading={inventoryLoading} evidenceResponse={summaryEvidenceResponse} evidenceError={summaryEvidenceError} evidenceLoading={summaryEvidenceLoading || summaryEvidenceFetching} candidateResponse={qualityResponse} candidateError={qualityError} candidateLoading={qualityLoading || qualityFetching} acquisitionHref={acquisitionHref} onSelectView={selectView} /> : null}</TabView.Tab>
            <TabView.Tab label="Readiness & publish"><ReadinessView review={reportReview} reviewLoading={findingCountLoading} lockBasis={lockBasis} lockBasisLoading={lockBasisLoading} discoveryHealth={discoveryHealth} discoveryHealthLoading={discoveryHealthLoading} completion={view === "Readiness & publish" ? <ReviewCompletionPanel key={contextKey} scope={{ runtimeInstanceId: revisionId, workspaceId, customerId, tenantId, sessionRevision }} locked={reviewLocked} readOnly /> : null} key={contextKey} renderer={renderer} discovery={discovery} sourceSummary={sourceSummary} sourceSummaryLoading={sourceSummaryLoading} inventory={inventory} inventoryLoading={inventoryLoading} evidenceStatusCounts={evidenceStatusCounts} countsLoading={summaryEvidenceFetching || acceptedEvidenceFetching || pendingEvidenceFetching || rejectedEvidenceFetching} onOpen={openInfo} onSelectView={selectView} qualityHref={qualityHref} /></TabView.Tab>
            <TabView.Tab label="After lock"><AfterLockView lockBasis={lockBasis} lockBasisLoading={lockBasisLoading} renderer={renderer} onOpen={openInfo} onSelectView={selectView} /></TabView.Tab>
            <TabView.Tab label="Coverage"><CoverageView discoveryHealth={discoveryHealth} discoveryHealthLoading={discoveryHealthLoading} key={contextKey} active={view === 'Coverage'} inspection={coverageInspection} onInspectionChange={changeCoverageInspection} discovery={getHubDiscovery(renderer)} graphCoverage={graphCoverage} isLoading={graphCoverageFetching} error={graphCoverageError} qualityHref={qualityHref} acquisitionHref={acquisitionHref} onSelectView={selectView} onOpenSources={openCoverageSources} /></TabView.Tab>
            <TabView.Tab label="Intelligence Graph"><GraphView key={contextKey} active={view === 'Intelligence Graph'} inspection={graphInspection} onInspectionChange={changeGraphInspection} manifest={manifest} graph={graph} isLoading={graphLoading} error={graphManifestError || graphError} workspaceName={renderer.runtimeInstance.name || 'Workspace'} revisionLabel={renderer.revision.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Selected revision'} qualityHref={graphQualityHref} findingId={graphFindingId} workbenchHref={workbenchHref} acquisitionHref={acquisitionHref} lifecycle={readGraphLifecycle({ lock: renderer?.lock, loading: rendererFetching, error: rendererError })} onSelectView={selectView} onOpenSources={openCoverageSources} onOpenSource={openGraphSource} neighbourhood={neighbourhood} neighbourhoodEnabled={neighbourhoodEnabled} neighbourhoodLoading={neighbourhoodLoading} onNeighbourhoodRetry={retryNeighbourhood} onNeighbourhoodPage={pageNeighbourhood} onNeighbourhoodInspect={inspectNeighbourhood} onNeighbourhoodSource={openNeighbourhoodSource} /></TabView.Tab>
            <TabView.Tab label="Intelligence Quality"><QualityView storedRead={storedFindings} storedLoading={storedFindingLoading} storedError={storedFindingRead.error} storedPopulation={findingPopulation} historyScope={quality && storedFindings?.available && canReadDetail && !rendererFetching && !rendererError ? { runtimeInstanceId: revisionId, customerId, tenantId, sessionRevision, stateVersion: renderer?.runtimeInstance?.stateVersion } : null} discoveryHealth={discoveryHealth} discoveryHealthLoading={discoveryHealthLoading} key={contextKey} onOpenSource={openQualitySource} onOpenGraph={openQualityGraph} canOpenGraph={(findingId, evidenceObjectId) => Boolean(qualityGraphPair(findingId, evidenceObjectId))} inspection={qualityInspection} onInspectionChange={changeQualityInspection} discovery={getHubDiscovery(renderer)} response={qualityResponse} error={qualityError} isLoading={qualityLoading || qualityFetching} locked={reviewLocked} actions={storedQualityActions} findingId={qualityLinkedId} returnView={searchParams.get("qualityReturnContext") === contextKey && searchParams.get("qualityReturnView") === "Review" ? "Review" : "Intelligence Graph"} onSelectFinding={findingId => { if (!currentFindingFrame() || !storedFindings?.available || !storedFindings.candidates.some(row => row.id === findingId)) return; const next = new URLSearchParams(searchParams); next.set("findingId", findingId); next.set("findingContext", contextKey); setSearchParams(next) }} onSelectView={selectView} /></TabView.Tab>
            </TabView>
          </>}
    <Dialog open={Boolean(visibleInfo)} onClose={closeInfo} size={visibleInfo?.kind === 'assurance-report' ? 'xl' : visibleInfo?.kind === 'after-lock' ? 'lg' : 'md'} className={visibleInfo?.kind === 'assurance-report' ? 'intelligence-hub__report-dialog' : visibleInfo?.kind === 'after-lock' ? 'intelligence-hub__lock-dialog' : 'intelligence-hub__dialog'} showCloseButton={!['assurance-report', 'after-lock'].includes(visibleInfo?.kind)} aria-label={visibleInfo?.kind === 'assurance-report' ? 'Intelligence assurance report' : visibleInfo?.kind === 'after-lock' ? 'Why new evidence is reviewed separately' : undefined}>
      <Dialog.Header>{visibleInfo?.kind === 'after-lock' ? <><div><p className="intelligence-hub__eyebrow">{'About After lock'}</p><h2>{visibleInfo.title}</h2><p>{visibleInfo.subtitle}</p></div><Button size="sm" variant="outline" aria-label={'Close explanation'} onClick={closeInfo}>Close ×</Button></> : visibleInfo?.kind === 'assurance-report' ? <><div><p className="intelligence-hub__report-eyebrow">Assurance report inspection</p><h2>{visibleInfo.title}</h2><p>{visibleInfo.subtitle}</p></div><Button size="sm" variant="outline" aria-label="Close report" onClick={closeInfo}>Close ×</Button></> : <h2>{visibleInfo?.title || 'Information'}</h2>}</Dialog.Header>
      <Dialog.Body key={visibleInfo?.kind || 'information'} role={['assurance-report', 'after-lock'].includes(visibleInfo?.kind) ? 'region' : undefined} aria-label={visibleInfo?.kind === 'assurance-report' ? 'Assurance report content' : visibleInfo?.kind === 'after-lock' ? 'After lock explanation content' : undefined} tabIndex={['assurance-report', 'after-lock'].includes(visibleInfo?.kind) ? 0 : undefined}>{visibleInfo?.kind === 'assurance-report' ? <AssuranceReport lockBasis={lockBasis} lockBasisLoading={lockBasisLoading} discoveryHealth={discoveryHealth} discoveryHealthLoading={discoveryHealthLoading} renderer={!rendererFetching && !rendererError && context.valid ? renderer : null} evidenceStatusCounts={evidenceStatusCounts} countsLoading={rendererFetching || Boolean(rendererError) || summaryEvidenceFetching || acceptedEvidenceFetching || pendingEvidenceFetching || rejectedEvidenceFetching} previewedAt={visibleInfo.previewedAt} scope={{ workspaceId, runtimeInstanceId: revisionId, customerId, tenantId }} sourceSummary={sourceSummary} sourceSummaryLoading={sourceSummaryLoading} inventory={inventory} inventoryLoading={inventoryLoading} graphCoverage={!graphCoverageFetching && !graphCoverageError ? graphCoverage : null} coverageLoading={graphCoverageFetching} review={reportReview} reviewLoading={findingCountLoading} /> : visibleInfo?.body}</Dialog.Body>
      <Dialog.Footer>{visibleInfo?.kind === 'after-lock' ? <><Button variant="outline" size="sm" onClick={closeInfo}>Return to evidence</Button><Button size="sm" onClick={() => { closeInfo(); selectView('Readiness & publish') }}>View readiness and publication →</Button></> : visibleInfo?.kind === 'assurance-report' ? <><span>Read-only preview · governed exports are unavailable</span><div><Button variant="outline" size="sm" disabled={reportRefreshing} aria-busy={Boolean(reportRefreshing)} onClick={refreshReport}>Refresh report</Button><Button variant="outline" size="sm" onClick={closeInfo}>Close</Button><Button variant="outline" size="sm" disabled>Download data CSV</Button><Button size="sm" disabled>Export PDF</Button></div></> : <Button variant="outline" size="sm" onClick={closeInfo}>Back to {view}</Button>}</Dialog.Footer>
    </Dialog>
  </main>
}
