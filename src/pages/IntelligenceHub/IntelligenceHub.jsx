import { getHubHelpHref } from '../Help/helpNavigation.js'
import { refreshAcquisitionScope } from './acquisitionRefreshContract.js'
import ContextAcquisitionView from './ContextAcquisitionView.jsx'
import { LuFileSearch2 } from 'react-icons/lu'
import { useCallback, useMemo, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { readSourceSummary, sourceProcessingLabel, sourceProcessingExplanation } from './sourceSummaryModel.js'
import { readEvidenceInventory, inventoryLabel, inventoryExplanation } from './evidenceInventoryModel.js'
import EvidenceInventoryDetails from './EvidenceInventoryDetails.jsx'
import CoverageView from './CoverageView.jsx'
import GraphView from './GraphView.jsx'
import { readCoverageInspection, writeCoverageInspection } from './coverageInspectionModel.js'
import { readGraphInspection, writeGraphInspection, isCurrentGraphSnapshot, buildGraphViewModel, resolveGraphSelection, graphSourceFocus, graphSourceDestination, graphSourceParams, graphSourceReturnHref, graphContextReturnHref, readGraphLifecycle } from './intelligenceGraphModel.js'
import { readCurrentGraphNeighbourhood } from './graphNeighbourhoodModel.js'
import QualityView from './QualityView.jsx'
import { readStoredFindings, FINDING_TYPES, FINDING_POPULATIONS } from './storedFindingModel.js'
import { QUALITY_INSPECTION_KEYS, readQualityCandidates, readQualityInspection, readQualityGraphPair, qualityDefaultPopulation } from './intelligenceQualityModel.js'
import EvidenceReadinessView from './EvidenceReadinessView.jsx'
import ReadinessPublishView from './ReadinessPublishView.jsx'
import AfterLockView from './AfterLockView.jsx'
import SourcesView from './SourcesView.jsx'
import ReviewCompletionPanel from './ReviewCompletionPanel.jsx'
import ReviewView from './ReviewView.jsx'
import DiscoveryAcceptancePanel from './DiscoveryAcceptancePanel.jsx'
import { readDiscoveryAcceptanceRefresh } from './discoveryAcceptanceModel.js'
import { readCompletion } from './reviewCompletionModel.js'
import { readAssuranceReview } from './assuranceReviewModel.js'
import AssuranceReviewDetails from './AssuranceReviewDetails.jsx'
import NamedControlRegister from './NamedControlRegister.jsx'
import DiscoveryHealthDetails from './DiscoveryHealthDetails.jsx'
import RecordedLockBasisDetails from './RecordedLockBasisDetails.jsx'
import { readLockBasis } from './lockBasisModel.js'
import { readDiscoveryHealth } from './discoveryHealthModel.js'
import { readCurrentCoverage } from './coverageReadModel.js'
import useHubReviewActions, { readHubReviewAuthority } from './useHubReviewActions.js'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiArrowLeft, FiArrowRight, FiArrowUpRight } from 'react-icons/fi'
import { MdChevronRight, MdNorthEast, MdSearch, MdInfoOutline } from 'react-icons/md'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
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

const PRIMARY_HUB_VIEWS = HUB_VIEWS.filter(view => view !== 'Evidence readiness')

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

export function Metric({ label, value, hint = 'Inspect details', onOpen, detail, onNavigate, className = '' }) {
  return <Button variant="ghost" size="sm" fullWidth className={`intelligence-hub__metric ${className}`}
    onClick={event => onNavigate ? onNavigate() : onOpen({ kind: 'summary-inspection', title: label, body: <><Select label="Record" size="sm" value={label} options={[{ value: label, label }]} onChange={() => {}} className="intelligence-hub__inspection-record" /><dl className="intelligence-hub__inspection-facts"><div><dt>{label}</dt><dd>{value}</dd></div><div><dt>Assessment scope</dt><dd>{hint}</dd></div></dl><p>{detail}</p>
    </> }, event.currentTarget)}>
    <small className="intelligence-hub__metric-label">{label}</small>
    <strong className="intelligence-hub__metric-value">{value}</strong>
    <span className="intelligence-hub__metric-helper">{hint}<FiArrowRight size={12} aria-hidden="true" /></span>
  </Button>
}

function BoundaryLink({ to, children, note = 'Destination screen is outside SS-037.', variant = 'subtle' }) {
  return to ? (
    <div className="intelligence-hub__boundary-link">
      <Link to={to} variant={variant} underline="hover">{children}</Link>
      {note ? <small>{note}</small> : null}
    </div>
  ) : note ? <p className="intelligence-hub__muted">{note}</p> : null
}

function OverviewMetrics({ renderer, discovery, sourceSummary, inventory, inventoryLoading, inventoryError, pendingFindingCount, findingCountLoading, onOpen, onSelectView }) {
  const evidenceSummary = discovery?.evidenceObjectSummary
  const sourceCount = sourceSummary?.uniqueSourceCount ?? null
  return <div className="intelligence-hub__metrics" aria-label="Intelligence summary">
    <Metric className="intelligence-hub__metric--assurance" label="Intelligence assurance" value={summaryValue(renderer?.truthBinding?.certification?.label)} onOpen={onOpen}
      detail="Assurance is shown only when the selected revision has a server-projected certification. Coverage or evidence counts alone do not establish an assurance level." />
    <Metric className="intelligence-hub__metric--sources" label="Sources" value={displayHubCount(sourceCount)} onOpen={onOpen} onNavigate={() => onSelectView('Sources')}
      detail="The canonical summary counts unique sources across the selected revision. Search results and paginated evidence lists have separate totals." />
    <Metric className="intelligence-hub__metric--evidence" label="Evidence objects" value={displayHubCount(getHubCount(evidenceSummary, 'evidenceObjectCount'))} onOpen={onOpen} onNavigate={() => onSelectView('Sources')}
      detail="Evidence objects are recorded facts or candidates. Accepted and pending counts are distinct; the Hub does not approve evidence." />
    <Metric className="intelligence-hub__metric--readiness" label="Evidence readiness" value={inventoryLoading ? 'Loading…' : inventory ? 'Complete inventory' : inventoryError ? 'Unavailable' : 'Not assessed'} hint="Interpretation not assessed" onOpen={onOpen} onNavigate={() => onSelectView('Readiness & publish')}
      detail={inventoryExplanation(inventory, inventoryLoading)} />
    <Metric className="intelligence-hub__metric--review" label="Needs attention" value={findingCountLoading ? 'Loading…' : pendingFindingCount === null ? 'Not assessed' : `${displayHubCount(pendingFindingCount)} known`} hint="Other Quality types not assessed" onOpen={onOpen} onNavigate={() => onSelectView('Readiness & publish')}
      detail="The known count covers outstanding contradiction decisions only, not unresolved section references or a complete attention register. Other Quality types are not assessed. Current dispositions are decided and excluded; a confirmed contradiction can separately block readiness." />
  </div>
}

function overviewInventoryInspection({ sourceCount, evidenceTotal, hasEvidenceCounts, evidenceStatusCounts, sourceSummary, sourceSummaryLoading, onSelectView }) {
  return { title: 'Inspect frozen evidence membership', record: 'Evidence inventory and snapshot', facts: {
      'Current source inventory': displayHubCount(sourceCount), 'Current evidence inventory': displayHubCount(evidenceTotal),
      'Inventory captured': 'Unavailable', 'Last successful frozen snapshot membership': 'Not supplied',
      'Accepted evidence': displayHubCount(hasEvidenceCounts ? evidenceStatusCounts.accepted : null),
      'Unresolved references': 'Unavailable', 'Processing provenance': sourceProcessingLabel(sourceSummary, sourceSummaryLoading),
    }, note: 'Current inventory completeness is separate from the exact evidence versions frozen at publication.',
    action: <><Button variant="outline" size="sm" onClick={() => onSelectView('Sources')}>Inspect sources<FiArrowUpRight size={14} aria-hidden="true" /></Button><Button variant="outline" size="sm" onClick={() => onSelectView('Context')}>Gather or synchronise evidence<FiArrowUpRight size={14} aria-hidden="true" /></Button></> }
}

function InspectionRecord({ item }) {
  return <>
    <Select label="Record" size="sm" value={item.record} options={[{ value: item.record, label: item.record }]} onChange={() => {}} className="intelligence-hub__inspection-record" />
    <dl className="intelligence-hub__inspection-facts">{Object.entries(item.facts).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
    <p>{item.note}</p><div className="intelligence-hub__next-destinations">{item.action}</div>
  </>
}

function Overview({ renderer, discovery, sourceSummary, sourceSummaryLoading, graphCoverage, evidenceStatusCounts, isLoading, onOpen, onSelectView, onOpenDomain, structureHref, reportReview }) {
  if (isLoading) return <p role="status">Loading Overview details…</p>
  const evidenceSummary = discovery?.evidenceObjectSummary
  const domainCoverage = graphCoverage?.available === true
    && graphCoverage?.coverage?.coverageModel === 'EVIDENCE_DOMAIN_COVERAGE'
    ? graphCoverage.coverage
    : null
  const coverage = domainCoverage ? `${domainCoverage.coveredDomainCount} of ${domainCoverage.totalDomainCount} domains supported` : null
  const sourceCount = sourceSummary?.uniqueSourceCount ?? null
  const domainRows = Array.isArray(domainCoverage?.domains) ? domainCoverage.domains : []
  const candidates = domainRows
  const evidenceTotal = getHubCount(evidenceSummary, 'evidenceObjectCount')
  const statusCounts = [evidenceStatusCounts?.accepted ?? null, evidenceStatusCounts?.pending ?? null, evidenceStatusCounts?.rejected ?? null]
  const classifiedTotal = statusCounts.every(value => value !== null) ? statusCounts.reduce((sum, value) => sum + value, 0) : null
  const hasEvidenceCounts = evidenceTotal !== null && classifiedTotal !== null && classifiedTotal <= evidenceTotal
  const inspections = [
    { title: 'Inspect unresolved references', record: 'Section references and mapping', facts: {
      'Unresolved stored references': 'Unavailable', 'Exact reference identities': 'Not supplied',
      'Required sections': 'Not assessed', 'Current mapping assessment': 'Not assessed',
    }, note: 'The bounded Overview does not supply unresolved reference identities or a current mapping assessment. Inspect Workspace Structure before relying on section readiness.',
    action: <Link to={structureHref} variant="subtle" underline="none">Open Workspace Structure<FiArrowUpRight size={14} aria-hidden="true" /></Link> },
    overviewInventoryInspection({ sourceCount, evidenceTotal, hasEvidenceCounts, evidenceStatusCounts, sourceSummary, sourceSummaryLoading, onSelectView }),
    { title: 'Review completion and Quality scope', record: 'Review completion and decision history', facts: {
      'Captured decisions': reportReview ? `${displayHubCount(reportReview.population.decisionCount)} evidence and contradiction decisions` : 'Unavailable',
      'Awaiting in the returned set': reportReview ? `${displayHubCount(reportReview.population.pendingEvidence)} evidence; ${displayHubCount(reportReview.population.pendingFindings)} contradictions` : 'Unavailable',
      'Human completion receipt': reportReview ? reportReview.latestReceipt ? `${displayHubToken(reportReview.latestReceipt.currency)} receipt` : 'No receipt supplied' : 'Unavailable',
      'Other Quality populations': 'Not assessed',
      'Receipt history': reportReview ? `${reportReview.history.records.length} receipts returned${reportReview.history.hasMore ? '; more available' : ''}` : 'Unavailable',
    }, note: 'Decided items do not establish complete review or certification. Other finding types remain unassessed; complete canonical findings are unavailable.',
    action: <Button variant="outline" size="sm" onClick={() => onSelectView('Review', 'All')}>Open Review<FiArrowUpRight size={14} aria-hidden="true" /></Button> },
  ]
  return (
    <>
      <div className="intelligence-hub__grid intelligence-hub__grid--three intelligence-hub__overview-top">
        <Panel title="Acquisition summary" className="intelligence-hub__overview-acquisition" inlineHeader>
          <dl className="intelligence-hub__facts">
            <div><dt>Sources recorded</dt><dd>{displayHubCount(sourceCount)}</dd></div>
            <div><dt>Evidence retained</dt><dd>{displayHubCount(evidenceTotal)}</dd></div>
            <div><dt>Processing provenance</dt><dd title={`${sourceProcessingLabel(sourceSummary, sourceSummaryLoading)}. ${sourceProcessingExplanation(sourceSummary)}`}>
              {sourceSummaryLoading ? 'Loading…' : sourceSummary?.unknownCount > 0
                ? `${sourceSummary.unknownCount} unknown document receipt${sourceSummary.unknownCount === 1 ? '' : 's'}${sourceSummary.staleCount ? ` · ${sourceSummary.staleCount} stale` : ''}`
                : sourceProcessingLabel(sourceSummary)}
            </dd></div>
          </dl>
          <Button size="sm" variant="ghost" className="intelligence-hub__acquisition-gather" onClick={() => onSelectView('Context')}>Gather more evidence<FiArrowRight size={14} aria-hidden="true" /></Button>
        </Panel>
        <Panel title="Evidence summary" className="intelligence-hub__overview-evidence" inlineHeader>
          <dl className="intelligence-hub__facts" aria-label="Evidence counts">
            <div><dt>Accepted</dt><dd>{displayHubCount(hasEvidenceCounts ? evidenceStatusCounts.accepted : null)}</dd></div>
            <div><dt>Awaiting evidence decision</dt><dd>{displayHubCount(hasEvidenceCounts ? evidenceStatusCounts.pending : null)}</dd></div>
            <div><dt>Inventory captured</dt><dd title="The inventory capture date is not recorded.">Unavailable</dd></div>
          </dl>
          <Button className="intelligence-hub__evidence-inspect-review" size="sm" variant="ghost" onClick={() => onSelectView('Review', 'All')}>Inspect Review<FiArrowRight size={14} aria-hidden="true" /></Button>
        </Panel>
        <Panel title="Intelligence assurance" className="intelligence-hub__overview-assurance" inlineHeader>
          <div className="intelligence-hub__assurance-state" data-available={Boolean(renderer?.truthBinding?.certification?.label)}>
            <strong title={!renderer?.truthBinding?.certification?.label ? 'Certification data has not been supplied for this view.' : undefined}>{renderer?.truthBinding?.certification?.label ? summaryValue(renderer.truthBinding.certification.label) : 'Certification not established'}</strong>
            <p>{renderer?.truthBinding?.certification?.summary || 'A published revision does not establish current assurance.'}</p>
          </div>
          <Button size="sm" variant="ghost" className="intelligence-hub__assurance-inspect-report" onClick={event => onOpen({
            title: 'Intelligence assurance report', kind: 'summary-inspection', body: <>
              <Select label="Record" size="sm" value="Intelligence assurance report" options={[{ value: 'Intelligence assurance report', label: 'Intelligence assurance report' }]} onChange={() => {}} className="intelligence-hub__inspection-record" />
              <dl className="intelligence-hub__inspection-facts">{Object.entries({
                'Revision and scope': `${summaryValue(renderer?.runtimeInstance?.name)} · ${renderer?.revision?.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Revision unavailable'}`,
                Lifecycle: displayHubToken(renderer?.lifecycle?.stage),
                'Assurance and certification': renderer?.truthBinding?.certification?.label ? summaryValue(renderer.truthBinding.certification.label) : 'Not supplied',
                'Current inventory': `${displayHubCount(sourceCount)} sources; ${displayHubCount(evidenceTotal)} evidence objects`,
                'Domain coverage': coverage || 'Unavailable',
                'Review completion': 'Not assessed',
                'Disclosure and publication authority': 'Not assessed',
                'Complete Quality population': 'Unavailable',
                'Output-specific readiness': 'Not assessed',
              }).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
              <p>Separate reads are not an atomic approval or a signed assurance report.</p>
              <div className="intelligence-hub__assurance-export-actions"><Button size="sm" variant="outline" disabled>CSV</Button><Button size="sm" variant="outline" disabled>PDF</Button></div>
              <p>Governed report exports are unavailable.</p>
            </>,
          }, event.currentTarget)}>Inspect assurance report<FiArrowRight size={14} aria-hidden="true" /></Button>
        </Panel>
      </div>
      <div className="intelligence-hub__grid intelligence-hub__grid--two intelligence-hub__overview-bottom">
        <section className="intelligence-hub__overview-coverage" aria-labelledby="overview-domain-heading">
          <h2 id="overview-domain-heading">Domain coverage</h2>
          <p>{coverage || 'Coverage unavailable'}. Not a confidence or readiness score.</p>
          {candidates.length ? <div className="intelligence-hub__domain-grid">
            {candidates.map(candidate => <Button key={candidate.domain} variant="outline" size="sm" className="intelligence-hub__domain" data-state={String(candidate.state || '').toLowerCase()} onClick={() => onOpenDomain(candidate.domain)}>
              <strong>{displayHubToken(candidate.domain)}</strong><span className="intelligence-hub__domain-state">{displayHubToken(candidate.state)}</span>
              <small>{displayHubCount(getHubCount(candidate, 'connectedEvidenceCount'))} connected evidence</small>
            </Button>)}
          </div> : <p role="status">No bounded graph coverage projection is available for this selected revision.</p>}
        </section>
        <section className="intelligence-hub__overview-advisor" aria-labelledby="overview-actions-heading">
          <h2 id="overview-actions-heading">Next useful actions</h2>
          {inspections.map(item => <div className="intelligence-hub__next-action" key={item.record}>
            <strong>{item.title}</strong><Button variant="outline" size="sm" className="intelligence-hub__next-inspect" aria-label={`${item.title}: Inspect`} onClick={event => onOpen({title: item.record, kind: 'summary-inspection', body: <InspectionRecord item={item} />}, event.currentTarget)}>Inspect<FiArrowUpRight size={14} aria-hidden="true" /></Button>
          </div>)}
          <Button variant="ghost" size="sm" className="intelligence-hub__next-gather" onClick={() => onSelectView('Context')}>Add missing customer evidence<FiArrowRight size={14} aria-hidden="true" /></Button>
        </section>
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

function ReadinessView({ active, canInspect, scope, stateVersion, locked, structureHref, refreshing, onRefresh, completion, review, reviewLoading, renderer, lockBasis, lockBasisLoading, discoveryHealth, discoveryHealthLoading, sourceSummary, sourceSummaryLoading, inventory, inventoryLoading, onOpen, onSelectView }) {
  const revision = renderer?.revision?.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Unavailable'
  const truth = renderer?.readiness?.sectionTruth
  const projectedCertification = canInspect ? renderer?.truthBinding?.certification : null
  const certificationLabel = projectedCertification?.label === null || projectedCertification?.label === undefined || projectedCertification?.label === '' ? null : summaryValue(projectedCertification.label)
  const preview = event => onOpen({ title:'Intelligence assurance report', kind:'assurance-report', subtitle:summaryValue(renderer?.runtimeInstance?.name) + ' · selected revision ' + revision, previewedAt:new Date().toISOString() }, event.currentTarget)
  const sourceDetails = <section aria-label="Current revision source basis"><strong>Current revision source basis</strong><p>Sources connected: {sourceSummaryLoading ? 'Loading…' : displayHubCount(sourceSummary?.uniqueSourceCount ?? null)}</p><p>Documents processed: {sourceProcessingLabel(sourceSummary, sourceSummaryLoading)}</p><p>{sourceProcessingExplanation(sourceSummary, sourceSummaryLoading)}</p><p>Current source records are separate from frozen snapshot membership and publication readiness.</p></section>
  const interpretationDetails = <><p>Interpretation currency is not established by the bounded summary.</p><p>Selected revision {revision} · {displayHubToken(renderer?.lifecycle?.stage)} · Publication {displayHubToken(renderer?.publish?.state)}</p><p>Canonical readiness: {displayHubToken(renderer?.readiness?.state)}. {truth ? `${displayHubCount(getHubCount(truth, 'readySectionCount'))} of ${displayHubCount(getHubCount(truth, 'requiredSectionCount'))} required sections ready.` : 'Section readiness is unavailable.'}</p><p>{truth?.reason || 'Section-truth readiness explanation is unavailable.'}</p><DiscoveryHealthDetails model={discoveryHealth} loading={discoveryHealthLoading} /></>
  const publicationDetails = <><p>Complete four-type Quality findings and frozen membership are not established. Recorded review decisions do not supply certification or publication authority.</p><AssuranceReviewDetails review={reviewLoading ? null : review} loading={reviewLoading} /><RecordedLockBasisDetails model={lockBasis} loading={lockBasisLoading} /></>
  const evidenceDetails = <p>{inventoryExplanation(inventory, inventoryLoading)}</p>
  return <ReadinessPublishView active={active} canInspect={canInspect} scope={scope} stateVersion={stateVersion} locked={locked} structureHref={structureHref} inventoryStatus={inventoryLabel(inventory, inventoryLoading)}
    certificationLabel={certificationLabel} certificationSummary={projectedCertification?.summary === undefined || projectedCertification?.summary === null ? null : summaryValue(projectedCertification.summary)}
    reviewStatus={reviewLoading ? 'Loading…' : !review ? 'Unavailable' : !review.latestReceipt ? 'No current receipt' : review.latestReceipt.currency === 'CURRENT' ? 'Current receipt' : 'Stale receipt'}
    evidenceDetails={evidenceDetails} interpretationDetails={<p>Interpretation currency is not established. {truth ? `${displayHubCount(getHubCount(truth, 'readySectionCount'))} of ${displayHubCount(getHubCount(truth, 'requiredSectionCount'))} required sections have recorded readiness.` : 'Section readiness is unavailable.'} Certification and human approval remain separate.</p>} advancedEvidenceDetails={<>{inventoryLoading ? <p>Reading the current evidence inventory…</p> : <EvidenceInventoryDetails inventory={inventory} />}{sourceDetails}{interpretationDetails}</>} publicationDetails={publicationDetails} completionDetails={completion}
    diagnostics={<>{interpretationDetails}<p>Outcome readiness: Unavailable. Outcome Studio readiness is not exposed by the bounded summary.</p><p>Recorded output eligibility: {typeof renderer?.publish?.outputEligibility?.outputEligible === 'boolean' ? renderer.publish.outputEligibility.outputEligible ? 'Eligible' : 'Not eligible' : 'Unavailable'}</p>{sourceDetails}{publicationDetails}</>}
    refreshing={refreshing} onRefresh={onRefresh} onReport={preview} onSelectView={onSelectView} />
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
  const primaryView = quality ? 'Review' : evidenceReadiness ? 'Readiness & publish' : view
  const primaryViewIndex = PRIMARY_HUB_VIEWS.indexOf(primaryView)
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
  const reviewFilter = reviewEvidenceId ? 'All' : reviewFilterReceipt?.contextKey === contextKey ? reviewFilterReceipt.filter : 'All'
  const setReviewFilter = (filter) => setReviewFilterReceipt({ contextKey, filter })
  const [sourceRefresh, setSourceRefresh] = useState(0)
  const sourceBasis = useRef(null)
  const [sourceBasisAvailable, setSourceBasisAvailable] = useState(false)
  const registerSourceBasis = useCallback((registration, available, departing = false) => {
    if (departing && sourceBasis.current !== registration) return
    sourceBasis.current = departing ? null : registration
    setSourceBasisAvailable(Boolean(!departing && available))
  }, [])
  const openSourceBasis = trigger => {
    const current = sourceBasis.current?.current()
    if (view === 'Sources' && current?.available && current.contextKey === contextKey && current.route === searchParams.toString()
      && current.sessionRevision === sessionRevision && getSessionRevision() === sessionRevision) sourceBasis.current.open(trigger)
  }
  const afterLockBasis = useRef(null)
  const [afterLockBasisAvailable, setAfterLockBasisAvailable] = useState(false)
  const registerAfterLockBasis = useCallback((registration, available, departing = false) => {
    if (departing && afterLockBasis.current !== registration) return
    afterLockBasis.current = departing ? null : registration
    setAfterLockBasisAvailable(Boolean(!departing && available))
  }, [])
  const openAfterLockBasis = trigger => {
    const current = afterLockBasis.current?.current()
    if (view === 'After lock' && current?.available && current.scopeKey === JSON.stringify({ workspaceId, revisionId, customerId, tenantId }) && current.stateVersion === renderer?.runtimeInstance?.stateVersion && current.route === searchParams.toString() && current.sessionRevision === sessionRevision && getSessionRevision() === sessionRevision) afterLockBasis.current.open(trigger)
  }
  const diagnosticBasis = useRef(null)
  const [diagnosticBasisAvailable, setDiagnosticBasisAvailable] = useState(false)
  const registerDiagnosticBasis = useCallback((registration, available, departing = false) => {
    if (departing && diagnosticBasis.current !== registration) return
    diagnosticBasis.current = departing ? null : registration
    setDiagnosticBasisAvailable(Boolean(!departing && available))
  }, [])
  const openDiagnosticBasis = trigger => {
    const current = diagnosticBasis.current?.current()
    if (current?.available && current.view === view && (view === 'Coverage' ? current.receiptKey === JSON.stringify(graphCoverage) : current.receiptKey === JSON.stringify([graph?.graphHash, manifest?.graphHash, graphInspection])) && current.scopeKey === JSON.stringify({ workspaceId, revisionId, customerId, tenantId }) && current.stateVersion === renderer?.runtimeInstance?.stateVersion && current.route === searchParams.toString() && current.sessionRevision === sessionRevision && getSessionRevision() === sessionRevision) diagnosticBasis.current.open(trigger)
  }
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
    { skip: !canReadDetail || !(quality || evidenceReadiness || view === 'Review' || view === 'Context' || view === 'Sources') },
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
  const findingRefreshKey = JSON.stringify([contextKey, view, sessionRevision, qualityLinkedId, qualityInspection])
  const ownedFindingScope = () => findingFrame.current?.scopeKey === findingScopeKey
    && findingFrame.current.view === 'Intelligence Quality' && findingFrame.current.contextKey === contextKey
    && findingFrame.current.sessionRevision === sessionRevision && getSessionRevision() === sessionRevision
  const ownedFindingRefreshScope = () => findingFrame.current?.refreshKey === findingRefreshKey
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
    findingFrame.current = { token: findingFrameToken, scopeKey: findingScopeKey, refreshKey: findingRefreshKey, contextKey, view, sessionRevision, model: storedFindings,
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
  const needsInventory = ['Overview', 'Evidence readiness', 'Readiness & publish'].includes(view)
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
    { skip: !canReadDetail || (view !== 'Overview' && view !== 'Review' && view !== 'Readiness & publish') },
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
    ? { evidenceObjects: [], total: 0, page: 1, pageSize: 25, control: summaryEvidencePage.control }
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
    if (graphNavigation.current) Object.assign(graphNavigation.current, { graph, manifest, neighbourhood, neighbourhoodKey, renderer, rendererFetching, rendererError, graphInspection })
  }, [graph, manifest, neighbourhood, neighbourhoodKey, renderer, rendererFetching, rendererError, graphInspection, view, contextKey, sessionRevision])
  const resolveSourceDestination = focus => {
    if (!canReadDetail || rendererFetching || rendererError
      || !renderer?.runtimeInstance?.stateVersion || manifest?.stateVersion !== renderer.runtimeInstance.stateVersion
      || manifest?.sourceStateVersion !== renderer.runtimeInstance.stateVersion) return null
    return graphSourceDestination(renderer, focus, { workspaceId, revisionId, customerId, tenantId })
  }
  const openSourceDestination = focus => {
    const current = graphNavigation.current
    if (!current || current.renderer !== renderer || current.rendererFetching || current.rendererError
      || current.graphInspection !== graphInspection) return
    const destination = resolveSourceDestination(focus)
    if (destination?.kind === 'section') navigate(destination.href)
    else if (destination?.kind === 'global') setSearchParams(graphSourceParams(searchParams, contextKey, focus))
  }
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
    openSourceDestination(focus)
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
      refetchRejectedEvidence, refetchGraphManifest, sourceSummaryRead.refetch, overviewCompletionRead.refetch, inventoryRead.refetch].forEach((refetch) => refetch())
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

  const overviewBasisFrame = useRef(null)
  const overviewBasisAvailable = view === 'Overview' && canReadDetail && !overviewRefreshing && !inventoryLoading && !rendererError
  const overviewBasisOwner = JSON.stringify([contextKey, sessionRevision, searchParams.toString(), renderer?.runtimeInstance?.stateVersion, overviewBasisAvailable])
  const overviewBasisToken = useMemo(() => ({ owner: overviewBasisOwner }), [overviewBasisOwner])
  useLayoutEffect(() => {
    const frame = { owner: overviewBasisOwner, available: overviewBasisAvailable, token: overviewBasisToken }
    overviewBasisFrame.current = frame
    return () => { overviewBasisFrame.current = null }
  }, [overviewBasisOwner, overviewBasisAvailable, overviewBasisToken])
  const displayedInfo = visibleInfo?.overviewBasisOwner && (visibleInfo.overviewBasisOwner !== overviewBasisOwner || visibleInfo.overviewBasisToken !== overviewBasisToken || !overviewBasisAvailable) ? null : visibleInfo
  const isOverviewBasisCurrent = () => overviewBasisFrame.current?.owner === overviewBasisOwner && overviewBasisFrame.current?.token === overviewBasisToken && overviewBasisFrame.current?.available
    && getSessionRevision() === sessionRevision
  const openInfo = (nextInfo, opener) => {
    const overviewInspection = view === 'Overview' && nextInfo.kind === 'summary-inspection'
    if (overviewInspection && !isOverviewBasisCurrent()) return
    openerRef.current = opener
    setInfo({ ...nextInfo, contextKey, sessionRevision,
      ...(overviewInspection ? { overviewBasisOwner, overviewBasisToken } : {}) })
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
  const openOverviewBasis = opener => {
    if (!isOverviewBasisCurrent()) return
    const total = getHubCount(discovery?.evidenceObjectSummary, 'evidenceObjectCount')
    const counts = [evidenceStatusCounts?.accepted ?? null, evidenceStatusCounts?.pending ?? null, evidenceStatusCounts?.rejected ?? null]
    const classified = counts.every(value => value !== null) ? counts.reduce((sum, value) => sum + value, 0) : null
    const item = overviewInventoryInspection({ sourceCount: sourceSummary?.uniqueSourceCount ?? null, evidenceTotal: total,
      hasEvidenceCounts: total !== null && classified !== null && classified <= total, evidenceStatusCounts, sourceSummary, sourceSummaryLoading,
      onSelectView: nextView => { if (isOverviewBasisCurrent()) selectView(nextView) } })
    openInfo({ title: item.record, kind: 'summary-inspection', overviewBasisOwner, overviewBasisToken, body: <>
      <InspectionRecord item={item} />
      <details><summary>Recorded read controls</summary><Button size="sm" variant="outline" onClick={() => { if (isOverviewBasisCurrent()) { closeInfo(); refreshOverview() } }}>Refresh Overview</Button></details>
    </> }, opener)
  }
  const structureHref = `/app/workspace-structure?${new URLSearchParams({ runtimeInstanceId: workspaceId, revisionId })}`
  const openOverviewDomain = domain => {
    if (view !== 'Overview' || graphCoverageFetching || !context.valid || getSessionRevision() !== sessionRevision
      || !graphCoverage?.coverage?.domains.some(row => row.domain === domain)) return
    const next = writeCoverageInspection(searchParams, contextKey, { filter: 'All', selectedDomain: domain })
    next.set('view', 'coverage')
    setInfo(null)
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
    const selected = resolveGraphSelection(buildGraphViewModel(graph, graphInspection.mode, graphInspection.search), graphInspection).selected
    if (!selected || JSON.stringify(focus) !== JSON.stringify(graphSourceFocus(selected))) return
    openSourceDestination(focus)
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
    const ownsScope = afterDecision ? ownedFindingRefreshScope : ownedFindingScope
    if (quality && (!ownsScope() || !afterDecision && (!currentHealthScope(origin) || discoveryHealthLoading || !currentFindingFrame()))) return false
    const reads = quality ? [refetchRenderer, refetchQuality] : [refetchRenderer, refetchQuality, refetchSummaryEvidence, refetchAcceptedEvidence, refetchPendingEvidence, refetchEvidence]
    if (quality && storedFindingRead.isUninitialized !== true && typeof storedFindingRead.refetch === 'function') reads.push(storedFindingRead.refetch)
    if (quality && discoveryHealthRead.isUninitialized !== true && typeof discoveryHealthRead.refetch === 'function') reads.push(discoveryHealthRead.refetch)
    const results = await Promise.allSettled(reads.map(read => quality && !ownsScope() ? { error: true } : read()))
    return (!quality || ownsScope()) && results.every(result => result.status === 'fulfilled' && result.value && !result.value.error)
  }
  const refreshAcquisitionReads = async () => {
    return refreshAcquisitionScope({
      reads: [refetchRenderer, refetchQuality, refetchAcquisitionSources, refetchSummaryEvidence, refetchAcceptedEvidence, refetchPendingEvidence],
      scope: { workspaceId, revisionId, customerId, tenantId }, refreshSummary: sourceSummaryRead.refetch,
      summaryIsCurrent: () => summaryActive.current && getSessionRevision() === sessionRevision,
    })
  }
  const refreshDiscoveryAcceptance = async () => {
    const results = await Promise.allSettled([refetchRenderer, refetchQuality, refetchSummaryEvidence,
      refetchAcceptedEvidence, refetchPendingEvidence, refetchRejectedEvidence].map(read => read()))
    return readDiscoveryAcceptanceRefresh(results, { runtimeInstanceId: revisionId, customerId, tenantId })
  }
  const refreshSourceReviewReads = async () => {
    if (!canReadDetail || getSessionRevision() !== sessionRevision) return false
    const results = await Promise.allSettled([refetchRenderer(), refetchQuality(), sourceSummaryRead.refetch()])
    return getSessionRevision() === sessionRevision && results.every(result => result.status === 'fulfilled' && !result.value.error)
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
  const findingControl = getHubPayload(qualityResponse)?.control
  const reviewFindings = canReadDetail && !rendererFetching && !rendererError && !qualityLoading && !qualityFetching && !qualityError
    && getHubPayload(qualityResponse)?.contractVersion === 'intelligence-review-actions.v1'
    && findingControl?.customerId === customerId && findingControl?.tenantId === tenantId
    && [findingControl?.id, findingControl?.runtimeInstanceKey].includes(revisionId)
    && findingControl?.stateVersion === renderer?.runtimeInstance?.stateVersion ? findingRead.candidates : null
  const searchReview = query => {
    const next = new URLSearchParams(searchParams)
    next.set('reviewContext', contextKey)
    if (query) next.set('reviewQuery', query); else next.delete('reviewQuery')
    next.delete('reviewSourceId'); next.delete('reviewEvidenceObjectId')
    setEvidencePageNumber(1)
    setSearchParams(next)
  }
  const helpHref = getHubHelpHref({ view, search: searchParams.toString(), quality })

  return <main className={`intelligence-hub intelligence-hub--screen container${evidenceReadiness ? ' intelligence-hub--evidence-readiness' : view === 'Overview' ? ' intelligence-hub--overview' : view === 'Context' ? ' intelligence-hub--context' : view === 'Sources' ? ' intelligence-hub--sources' : view === 'Review' ? ' intelligence-hub--review' : view === 'Readiness & publish' ? ' intelligence-hub--readiness' : view === 'After lock' ? ' intelligence-hub--after-lock' : view === 'Coverage' ? ' intelligence-hub--coverage' : view === 'Intelligence Graph' ? ' intelligence-hub--graph' : quality ? ' intelligence-hub--quality' : ''}`} aria-labelledby="intelligence-hub-title">
    <div className="intelligence-hub__selected" role="group" aria-label="Selected workspace context">
      <div className="intelligence-hub__selected-context">
        <span>Selected Workspace</span>
        <strong>{context.valid ? renderer.runtimeInstance.name || 'Workspace' : 'Workspace unavailable'}</strong>
        {context.valid && renderer.revision.revisionNumber ? <Badge className="intelligence-hub__selected-revision" variant="success" size="sm" pill>{`R${renderer.revision.revisionNumber} · Current`}</Badge> : null}
      </div>
      <nav aria-label="Workspace areas">
        <Link to={context.valid ? getHubReturnHref(revisionId) : '/app/dashboard'} variant="subtle">Workspace Home</Link>
        <span aria-current="page">Intelligence Hub</span>
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
        <h1 id="intelligence-hub-title">{primaryView === 'Overview' ? 'Intelligence Hub' : primaryView}</h1>
      </div>
      {context.valid ? view === 'Overview' ? <div className="intelligence-hub__heading-actions intelligence-hub__overview-actions">
        <nav className="intelligence-hub__overview-controls" aria-label="Intelligence Hub actions">
          <Button className="intelligence-hub__overview-refresh" size="sm" variant="outline" disabled={!overviewBasisAvailable} onClick={event => openOverviewBasis(event.currentTarget)}><LuFileSearch2 size={14} aria-hidden="true" />View basis</Button>
          <Link to={acquisitionHref} variant="subtle" underline="none" className="btn btn--primary intelligence-hub__overview-add-evidence"
            title="Open Context for acquisition or locked-revision recovery. Navigation makes no change.">＋ Add Evidence</Link>
        </nav>
      </div> : <div className="intelligence-hub__heading-actions">
        {!evidenceReadiness && view !== 'Context' && view !== 'Sources' && view !== 'Review' && view !== 'Readiness & publish' && view !== 'After lock' && view !== 'Coverage' && view !== 'Intelligence Graph' && !quality ? <span>Last updated <strong>{readableDate(renderer.runtimeInstance.updatedAt)}</strong></span> : null}
        {(view === 'Review' && !quality || view === 'Readiness & publish' && !evidenceReadiness) ? null : ['Coverage', 'Intelligence Graph'].includes(view) ? <Button size="sm" variant="outline" className="intelligence-hub__diagnostic-basis" disabled={!diagnosticBasisAvailable || !canReadDetail} onClick={event => openDiagnosticBasis(event.currentTarget)}><LuFileSearch2 size={14} aria-hidden="true"/>View basis</Button> : view === 'After lock' ? <Button size="sm" variant="outline" className="intelligence-hub__after-lock-basis" disabled={!afterLockBasisAvailable || !canReadDetail} onClick={event => openAfterLockBasis(event.currentTarget)}><LuFileSearch2 size={14} aria-hidden="true" />View basis</Button> : view === 'Sources' ? <Button size="sm" variant="outline" className="intelligence-hub__source-basis" title="Inspect the basis of the selected source" disabled={!sourceBasisAvailable || sourcesRefreshing || !canReadDetail} onClick={event => openSourceBasis(event.currentTarget)}><LuFileSearch2 size={14} aria-hidden="true" />View basis</Button> : <Button size="sm" variant="outline" disabled={evidenceReadiness ? evidenceReadinessRefreshing : quality ? rendererFetching || qualityFetching || storedFindingLoading || discoveryHealthLoading : view === 'Context' ? contextRefreshing : view === 'Sources' ? sourcesRefreshing : view === 'Review' ? reviewRefreshing : view === 'Readiness & publish' ? readinessRefreshing : view === 'Coverage' ? coverageRefreshing : view === 'Intelligence Graph' ? graphLoading : view === 'After lock' && lockBasisLoading} aria-busy={Boolean(evidenceReadiness ? evidenceReadinessRefreshing : quality ? rendererFetching || qualityFetching || storedFindingLoading || discoveryHealthLoading : view === 'Context' ? contextRefreshing : view === 'Sources' ? sourcesRefreshing : view === 'Review' ? reviewRefreshing : view === 'Readiness & publish' ? readinessRefreshing : view === 'Coverage' ? coverageRefreshing : view === 'Intelligence Graph' ? graphLoading : view === 'After lock' && lockBasisLoading)} onClick={evidenceReadiness ? refreshEvidenceReadiness : quality ? refreshDecisions : view === 'Context' ? refreshContext : view === 'Sources' ? refreshSources : view === 'Review' ? refreshDecisions : view === 'Readiness & publish' ? refreshReadiness : view === 'Coverage' ? refreshCoverage : view === 'Intelligence Graph' ? refreshGraph : view === 'After lock' ? refreshAfterLock : refetchRenderer}>↻ Refresh</Button>}
        {view === 'After lock' || view === 'Coverage' || view === 'Sources' || view === 'Review' && !quality || view === 'Readiness & publish' && !evidenceReadiness ? <Link to={acquisitionHref} variant="subtle" underline="none" className="btn btn--primary intelligence-hub__coverage-acquire" title="Open Context for acquisition. Navigation makes no change.">＋ Add Evidence</Link> : null}
        {view === 'Intelligence Graph' || quality || evidenceReadiness ? <Link to={acquisitionHref} variant="subtle" underline="none" className="btn btn--primary intelligence-graph__technical" title="Open Context for acquisition or locked-revision recovery. Navigation makes no change.">＋ Add Evidence</Link> : null}
      </div> : null}
    </header>
    {!requiredContext ? <Status variant="warning">Open Intelligence Hub from a selected Execution Workspace revision.</Status>
      : rendererLoading || (!renderer && rendererFetching) ? <p role="status">Loading selected revision…</p>
        : rendererError || !context.valid ? <Status variant="warning">{rendererError ? 'The selected revision could not be loaded.' : context.reason}</Status>
          : <>
            <TabView activeTab={primaryViewIndex} onTabChange={(index) => selectView(PRIMARY_HUB_VIEWS[index])} aria-label="Intelligence Hub views" className="intelligence-hub__tabs">
            <TabView.Tab label="Overview">
              {overviewPending ? null : <OverviewMetrics renderer={renderer} discovery={discovery} sourceSummary={sourceSummary} inventory={inventory} inventoryLoading={inventoryLoading} inventoryError={inventoryRead.error || rendererError} pendingFindingCount={pendingFindingCount} findingCountLoading={findingCountLoading} onOpen={openInfo} onSelectView={selectView} />}
              <Overview renderer={renderer} discovery={discovery} sourceSummary={sourceSummary} sourceSummaryLoading={sourceSummaryLoading} pendingFindingCount={pendingFindingCount} graphCoverage={graphCoverage} evidenceStatusCounts={evidenceStatusCounts} isLoading={overviewPending} onOpen={openInfo} onSelectView={selectView} onOpenDomain={openOverviewDomain} structureHref={structureHref} reportReview={reportReview} />
            </TabView.Tab>
            <TabView.Tab label="Context">{view === 'Context' && graphContextReturnHref(searchParams, contextKey) ? <Link className="intelligence-hub__graph-return" to={graphContextReturnHref(searchParams, contextKey)} variant="subtle" underline="none">Return to graph inspection →</Link> : null}<ContextAcquisitionView sourceSummary={sourceSummary} sourceSummaryLoading={sourceSummaryLoading} active={view === 'Context'} key={contextKey} discovery={getHubDiscovery(renderer)} renderer={renderer} authority={reviewAuthority} loading={rendererFetching || qualityLoading || qualityFetching} locked={reviewLocked} runtimeInstanceId={revisionId} customerId={customerId} tenantId={tenantId} contextKey={contextKey} refresh={refreshAcquisitionReads} evidenceStatusCounts={evidenceStatusCounts} countsLoading={summaryEvidenceLoading || summaryEvidenceFetching || acceptedEvidenceFetching || pendingEvidenceFetching} workbenchHref={workbenchHref} onSelectView={selectView} /></TabView.Tab>
            <TabView.Tab label="Sources">{view === 'Sources' ? <>{graphSourceReturnHref(searchParams, contextKey) ? <Link className="intelligence-hub__graph-return" to={graphSourceReturnHref(searchParams, contextKey)} variant="subtle" underline="none">Return to graph inspection →</Link> : null}<SourcesView onBasisInspectionReady={registerSourceBasis} onRefreshWorkspace={refreshSources} workspaceRefreshing={sourcesRefreshing} reviewAuthority={reviewAuthority} onSourceReviewed={refreshSourceReviewReads} stateVersion={!rendererFetching && !rendererError && context.valid ? renderer?.runtimeInstance?.stateVersion : null} sourceSummary={sourceSummary} sourceSummaryLoading={sourceSummaryLoading} evidenceCount={!rendererFetching && !rendererError && context.valid ? getHubCount(discovery?.evidenceObjectSummary, 'evidenceObjectCount') : null} onRefreshSummary={sourceSummaryRead.refetch} key={contextKey} workspaceId={workspaceId} revisionId={revisionId} customerId={customerId} tenantId={tenantId} active={view === 'Sources'} canRead={canReadDetail} locked={Boolean(renderer.lock?.locked || renderer.runtimeInstance.lockedAt || renderer.revision.status === 'LOCKED')} pendingCount={evidenceStatusCounts.pending} countsLoading={summaryEvidenceFetching || pendingEvidenceFetching} onOpen={openInfo} onSelectView={selectView} refreshToken={sourceRefresh} /></> : null}</TabView.Tab>
            <TabView.Tab label="Review">{quality ? <QualityView storedRead={storedFindings} storedLoading={storedFindingLoading} storedError={storedFindingRead.error} storedPopulation={findingPopulation} historyScope={quality && storedFindings?.available && canReadDetail && !rendererFetching && !rendererError ? { runtimeInstanceId: revisionId, customerId, tenantId, sessionRevision, stateVersion: renderer?.runtimeInstance?.stateVersion } : null} discoveryHealth={discoveryHealth} discoveryHealthLoading={discoveryHealthLoading} key={contextKey} onOpenSource={openQualitySource} onOpenGraph={openQualityGraph} canOpenGraph={(findingId, evidenceObjectId) => Boolean(qualityGraphPair(findingId, evidenceObjectId))} inspection={qualityInspection} onInspectionChange={changeQualityInspection} discovery={getHubDiscovery(renderer)} response={qualityResponse} error={qualityError} isLoading={qualityLoading || qualityFetching} locked={reviewLocked} actions={storedQualityActions} findingId={qualityLinkedId} returnView={searchParams.get("qualityReturnContext") === contextKey && searchParams.get("qualityReturnView") === "Review" ? "Review" : "Intelligence Graph"} onSelectFinding={findingId => { if (!currentFindingFrame() || !storedFindings?.available || !storedFindings.candidates.some(row => row.id === findingId)) return; const next = new URLSearchParams(searchParams); next.set("findingId", findingId); next.set("findingContext", contextKey); setSearchParams(next) }} onSelectView={selectView} /> : <ReviewView locked={reviewLocked} scope={{ runtimeInstanceId: revisionId, customerId, tenantId }} stateVersion={renderer?.runtimeInstance?.stateVersion} canInspect={view === 'Review' && canReadDetail && !rendererFetching && !rendererError && context.valid} findingsLoading={qualityLoading || qualityFetching} onRefresh={refreshDecisions} refreshing={reviewRefreshing || qualityLoading || qualityFetching} pagination={<EvidencePagination evidencePage={evidenceError ? null : evidencePage} page={evidencePageNumber} setPage={setEvidencePageNumber} isLoading={evidenceLoading || evidenceFetching} />} completion={view === "Review" ? <><ReviewCompletionPanel compact key={contextKey} scope={{ runtimeInstanceId: revisionId, workspaceId, customerId, tenantId }} locked={reviewLocked} onRecorded={refreshReviewReads} /><details className="intelligence-hub__review-pack"><summary>Evidence-pack acceptance</summary><DiscoveryAcceptancePanel scope={{ runtimeInstanceId: revisionId, customerId, tenantId }} renderer={renderer} authority={reviewAuthority} locked={reviewLocked} loading={rendererFetching || qualityLoading || qualityFetching || summaryEvidenceFetching || acceptedEvidenceFetching || pendingEvidenceFetching || rejectedEvidenceFetching} evidenceReads={[{ response: summaryEvidenceResponse, error: summaryEvidenceError }, { response: acceptedEvidenceResponse, error: acceptedEvidenceError }, { response: pendingEvidenceResponse, error: pendingEvidenceError }, { response: rejectedEvidenceResponse, error: rejectedEvidenceError }]} refresh={refreshDiscoveryAcceptance} /></details></> : null} key={contextKey} evidencePage={evidenceControl && String(evidenceControl.customerId) === customerId && String(evidenceControl.tenantId) === tenantId && [evidenceControl.id, evidenceControl.runtimeInstanceKey].includes(revisionId) && evidenceControl.stateVersion === renderer?.runtimeInstance?.stateVersion ? evidencePage : null} isLoading={evidenceLoading || evidenceFetching} error={emptyFilteredPage ? null : evidenceError} evidenceStatusCounts={evidenceStatusCounts} countsLoading={summaryEvidenceFetching || acceptedEvidenceFetching || pendingEvidenceFetching} onOpenSource={openReviewSource} onSelectView={selectView} page={evidencePageNumber} setPage={setEvidencePageNumber} filter={reviewFilter} onFilterChange={selectReviewFilter} query={reviewEvidenceId ? "" : reviewQuery} onSearch={searchReview} focused={Boolean(reviewEvidenceId)} onReturn={() => { const next = new URLSearchParams(searchParams); next.delete("reviewSourceId"); next.delete("reviewEvidenceObjectId"); setSearchParams(next) }} actions={evidenceActions} findings={reviewFindings} />}</TabView.Tab>
            <TabView.Tab label="Readiness & publish">{evidenceReadiness ? <div className="intelligence-hub__sources-filters" role="group" aria-label="Readiness inspections"><Button size="sm" variant="outline" aria-pressed={!evidenceReadiness} onClick={() => selectView('Readiness & publish')}>Readiness & publish</Button><Button size="sm" variant="outline" aria-pressed={evidenceReadiness} onClick={() => selectView('Evidence readiness')}>Evidence readiness</Button></div> : null}{evidenceReadiness ? <EvidenceReadinessView lockBasis={lockBasis} lockBasisLoading={lockBasisLoading} key={contextKey} renderer={renderer} sourceSummary={sourceSummary} sourceSummaryLoading={sourceSummaryLoading} inventory={inventory} inventoryLoading={inventoryLoading} evidenceResponse={summaryEvidenceResponse} evidenceError={summaryEvidenceError} evidenceLoading={summaryEvidenceLoading || summaryEvidenceFetching} candidateResponse={qualityResponse} candidateError={qualityError} candidateLoading={qualityLoading || qualityFetching} acquisitionHref={acquisitionHref} onSelectView={selectView} /> : <ReadinessView active={view === 'Readiness & publish' && !evidenceReadiness} canInspect={canReadDetail && !rendererFetching && !rendererError && context.valid} scope={{ workspaceId, revisionId, customerId, tenantId }} stateVersion={renderer?.runtimeInstance?.stateVersion} locked={reviewLocked} structureHref={structureHref} refreshing={readinessRefreshing} onRefresh={refreshReadiness} review={reportReview} reviewLoading={findingCountLoading} lockBasis={lockBasis} lockBasisLoading={lockBasisLoading} discoveryHealth={discoveryHealth} discoveryHealthLoading={discoveryHealthLoading} completion={view === "Readiness & publish" ? <ReviewCompletionPanel key={contextKey} scope={{ runtimeInstanceId: revisionId, workspaceId, customerId, tenantId, sessionRevision }} locked={reviewLocked} readOnly /> : null} key={contextKey} renderer={renderer} discovery={discovery} sourceSummary={sourceSummary} sourceSummaryLoading={sourceSummaryLoading} inventory={inventory} inventoryLoading={inventoryLoading} evidenceStatusCounts={evidenceStatusCounts} countsLoading={summaryEvidenceFetching || acceptedEvidenceFetching || pendingEvidenceFetching || rejectedEvidenceFetching} onOpen={openInfo} onSelectView={selectView} qualityHref={qualityHref} />}</TabView.Tab>
            <TabView.Tab label="After lock"><AfterLockView key={contextKey} active={view === 'After lock'} canInspect={canReadDetail && !rendererFetching && !rendererError && context.valid} scope={{ workspaceId, revisionId, customerId, tenantId }} stateVersion={renderer?.runtimeInstance?.stateVersion} route={searchParams.toString()} onBasisInspectionReady={registerAfterLockBasis} refreshing={lockBasisLoading} onRefresh={refreshAfterLock} lockBasis={lockBasis} lockBasisLoading={lockBasisLoading} renderer={renderer} onSelectView={selectView} /></TabView.Tab>
            <TabView.Tab label="Coverage"><CoverageView scope={{ workspaceId, revisionId, customerId, tenantId }} stateVersion={renderer?.runtimeInstance?.stateVersion} route={searchParams.toString()} canInspect={canReadDetail && !rendererFetching && !rendererError && context.valid} lifecycle={readGraphLifecycle({lock:renderer?.lock,loading:rendererFetching,error:rendererError})} revisionLabel={renderer.revision.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Selected revision'} onBasisInspectionReady={registerDiagnosticBasis} onRefresh={refreshCoverage} refreshing={coverageRefreshing} discoveryHealth={discoveryHealth} discoveryHealthLoading={discoveryHealthLoading} key={contextKey} active={view === 'Coverage'} inspection={coverageInspection} onInspectionChange={changeCoverageInspection} discovery={getHubDiscovery(renderer)} graphCoverage={graphCoverage} isLoading={graphCoverageFetching} error={graphCoverageError} qualityHref={qualityHref} acquisitionHref={acquisitionHref} onSelectView={selectView} onOpenSources={openCoverageSources} /></TabView.Tab>
            <TabView.Tab label="Intelligence Graph"><GraphView scope={{ workspaceId, revisionId, customerId, tenantId }} stateVersion={renderer?.runtimeInstance?.stateVersion} route={searchParams.toString()} canInspect={canReadDetail && !rendererFetching && !rendererError && context.valid} onBasisInspectionReady={registerDiagnosticBasis} onRefresh={refreshGraph} refreshing={graphLoading} key={contextKey} active={view === 'Intelligence Graph'} inspection={graphInspection} onInspectionChange={changeGraphInspection} manifest={manifest} graph={graph} isLoading={graphLoading} error={graphManifestError || graphError} workspaceName={renderer.runtimeInstance.name || 'Workspace'} revisionLabel={renderer.revision.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Selected revision'} qualityHref={graphQualityHref} findingId={graphFindingId} workbenchHref={workbenchHref} acquisitionHref={acquisitionHref} lifecycle={readGraphLifecycle({ lock: renderer?.lock, loading: rendererFetching, error: rendererError })} onSelectView={selectView} onOpenSources={openCoverageSources} onOpenSource={openGraphSource} resolveSourceDestination={resolveSourceDestination} neighbourhood={neighbourhood} neighbourhoodEnabled={neighbourhoodEnabled} neighbourhoodLoading={neighbourhoodLoading} onNeighbourhoodRetry={retryNeighbourhood} onNeighbourhoodPage={pageNeighbourhood} onNeighbourhoodInspect={inspectNeighbourhood} onNeighbourhoodSource={openNeighbourhoodSource} /></TabView.Tab>
            </TabView>
          </>}
    <Dialog open={Boolean(displayedInfo)} onClose={closeInfo} size={displayedInfo?.kind === 'assurance-report' ? 'xl' : ['after-lock', 'summary-inspection'].includes(displayedInfo?.kind) ? 'lg' : 'md'} className={displayedInfo?.kind === 'assurance-report' ? 'intelligence-hub__report-dialog' : displayedInfo?.kind === 'after-lock' ? 'intelligence-hub__lock-dialog' : displayedInfo?.kind === 'summary-inspection' ? `intelligence-hub__dialog intelligence-hub__inspection-dialog${view === 'Sources' ? ' intelligence-hub__sources-inspection' : ''}` : 'intelligence-hub__dialog'} showCloseButton={!['assurance-report', 'after-lock'].includes(displayedInfo?.kind)} aria-label={displayedInfo?.kind === 'assurance-report' ? 'Intelligence assurance report' : displayedInfo?.kind === 'after-lock' ? 'Why new evidence is reviewed separately' : undefined}>
      <Dialog.Header>{displayedInfo?.kind === 'after-lock' ? <><div><p className="intelligence-hub__eyebrow">{'About After lock'}</p><h2>{displayedInfo.title}</h2><p>{displayedInfo.subtitle}</p></div><Button size="sm" variant="outline" aria-label={'Close explanation'} onClick={closeInfo}>Close ×</Button></> : displayedInfo?.kind === 'assurance-report' ? <><div><p className="intelligence-hub__report-eyebrow">Assurance report inspection</p><h2>{displayedInfo.title}</h2><p>{displayedInfo.subtitle}</p></div><Button size="sm" variant="outline" aria-label="Close report" onClick={closeInfo}>Close ×</Button></> : <h2>{displayedInfo?.title || 'Information'}</h2>}</Dialog.Header>
      <Dialog.Body key={displayedInfo?.kind || 'information'} role={['assurance-report', 'after-lock'].includes(displayedInfo?.kind) ? 'region' : undefined} aria-label={displayedInfo?.kind === 'assurance-report' ? 'Assurance report content' : displayedInfo?.kind === 'after-lock' ? 'After lock explanation content' : undefined} tabIndex={['assurance-report', 'after-lock'].includes(displayedInfo?.kind) ? 0 : undefined}>{displayedInfo?.kind === 'assurance-report' ? <AssuranceReport lockBasis={lockBasis} lockBasisLoading={lockBasisLoading} discoveryHealth={discoveryHealth} discoveryHealthLoading={discoveryHealthLoading} renderer={!rendererFetching && !rendererError && context.valid ? renderer : null} evidenceStatusCounts={evidenceStatusCounts} countsLoading={rendererFetching || Boolean(rendererError) || summaryEvidenceFetching || acceptedEvidenceFetching || pendingEvidenceFetching || rejectedEvidenceFetching} previewedAt={displayedInfo.previewedAt} scope={{ workspaceId, runtimeInstanceId: revisionId, customerId, tenantId }} sourceSummary={sourceSummary} sourceSummaryLoading={sourceSummaryLoading} inventory={inventory} inventoryLoading={inventoryLoading} graphCoverage={!graphCoverageFetching && !graphCoverageError ? graphCoverage : null} coverageLoading={graphCoverageFetching} review={reportReview} reviewLoading={findingCountLoading} /> : displayedInfo?.body}</Dialog.Body>
      <Dialog.Footer>{displayedInfo?.kind === 'after-lock' ? <><Button variant="outline" size="sm" onClick={closeInfo}>Return to evidence</Button><Button size="sm" onClick={() => { closeInfo(); selectView('Readiness & publish') }}>View readiness and publication →</Button></> : displayedInfo?.kind === 'assurance-report' ? <><span>Read-only preview · governed exports are unavailable</span><div><Button variant="outline" size="sm" disabled={reportRefreshing} aria-busy={Boolean(reportRefreshing)} onClick={refreshReport}>Refresh report</Button><Button variant="outline" size="sm" onClick={closeInfo}>Close</Button><Button variant="outline" size="sm" disabled>Download data CSV</Button><Button size="sm" disabled>Export PDF</Button></div></> : <Button variant="outline" size="sm" onClick={closeInfo}>{view === 'Sources' && displayedInfo?.kind === 'summary-inspection' ? <FiArrowLeft size={14} aria-hidden="true" /> : null}Back to {view}</Button>}</Dialog.Footer>
    </Dialog>
  </main>
}
