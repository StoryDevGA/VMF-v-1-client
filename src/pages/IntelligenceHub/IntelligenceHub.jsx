import { useEffect, useRef, useState } from 'react'
import CoverageView from './CoverageView.jsx'
import GraphView from './GraphView.jsx'
import QualityView from './QualityView.jsx'
import EvidenceReadinessView from './EvidenceReadinessView.jsx'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MdChevronRight, MdNorthEast, MdSearch, MdInfoOutline } from 'react-icons/md'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
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
  useGetRuntimeDiscoveryContradictionsQuery,
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

function OverviewMetrics({ renderer, discovery, onOpen, onSelectView, qualityHref }) {
  const evidenceSummary = discovery?.evidenceObjectSummary
  const acquisitionMetrics = discovery?.acquisitionEffectiveness?.metrics
  const readiness = discovery?.discoveryHealth?.readiness?.state
  const readinessLabel = ['READY', 'PARTIALLY_READY', 'NOT_READY'].includes(readiness) ? displayHubToken(readiness) : 'Unavailable'
  const reviewCandidates = getHubCount(acquisitionMetrics, 'contradictionCount')
  const sourceCount = getHubCount(discovery?.sourceRegistrySummary, 'count')
  return <div className="intelligence-hub__metrics" aria-label="Intelligence summary">
    <Metric className="intelligence-hub__metric--assurance" label="Intelligence assurance" value={summaryValue(renderer?.truthBinding?.certification?.label)} hint="Select to view assurance details" onOpen={onOpen} valueAction
      detail="Assurance is shown only when the selected revision has a server-projected certification. Coverage or evidence counts alone do not establish an assurance level." />
    <Metric className="intelligence-hub__metric--sources" label="Sources" value={displayHubCount(sourceCount)} hint="Inspect connected sources →" onOpen={onOpen} onAction={() => onSelectView('Sources')}
      detail="The server-projected source registry summary reports this revision's source count. The bounded evidence read exposes only sources linked to its current page." />
    <Metric className="intelligence-hub__metric--evidence" label="Evidence objects" value={displayHubCount(getHubCount(evidenceSummary, 'evidenceObjectCount'))} hint="Inspect accepted evidence →" onOpen={onOpen} onAction={() => onSelectView('Review', 'Approved')}
      detail="Evidence objects are recorded facts or candidates. Accepted and pending counts are distinct; the Hub does not approve evidence." />
    <Metric className="intelligence-hub__metric--coverage" label="Evidence readiness" value={readinessLabel} hint="Check evidence coverage →" onOpen={onOpen} onAction={() => onSelectView('Evidence readiness')}
      detail="Evidence readiness uses the recorded readiness state of this revision. Coverage percentages do not establish readiness, assurance or publication approval." />
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

function ContextView({ discovery, evidenceStatusCounts, isLoading, onOpen, workbenchHref, onSelectView }) {
  const [search, setSearch] = useState('')
  const briefAvailable = Boolean(discovery?.inputValues && typeof discovery.inputValues === 'object' && !Array.isArray(discovery.inputValues))
  const values = briefAvailable ? discovery.inputValues : {}
  const fields = [
    ['Company', values.companyName], ['Market', values.marketRegion],
    ['Product or offer', values.targetOffer], ['Acquisition profile', discovery?.acquisitionProfile],
  ]
  const websites = [...new Set([values.companyWebsite, ...(Array.isArray(values.websiteSources) ? values.websiteSources : [])]
    .filter((value) => typeof value === 'string').map((value) => value.trim()).filter(Boolean))]
  const completeness = [values.companyName, values.marketRegion, values.targetOffer, websites[0]]
    .map((value) => Boolean(String(value ?? '').trim()))
  const recorded = completeness.filter(Boolean).length
  const complete = discovery?.inputComplete
  const readiness = complete === true ? 'Context ready' : complete === false ? 'Needs attention' : 'Status unavailable'
  const matchingWebsites = websites.filter((website) => website.toLowerCase().includes(search.trim().toLowerCase()))
  const stages = [
    { title: 'Context', detail: readiness, complete: complete === true, current: complete !== true },
    { title: 'Acquire', detail: 'Build a batch', current: complete === true },
    { title: 'Sources', detail: 'Inspect recorded sources' },
    { title: 'Review', detail: 'Resolve exceptions' },
  ]
  const workbenchTitle = 'Opens the acquisition workbench. No evidence or brief is changed in this view.'
  const countText = (count) => isLoading ? 'Loading…' : displayHubCount(count)
  return <div className="intelligence-hub__context-workspace">
    <ol className="intelligence-hub__journey" aria-label="Intelligence acquisition stages">
      {stages.map((stage, index) => <li key={stage.title} data-complete={Boolean(stage.complete)} aria-current={stage.current ? 'step' : undefined}>
        <span className="intelligence-hub__journey-index" aria-hidden="true">{stage.complete ? '✓' : index + 1}</span>
        <span><strong>{stage.title}</strong><small>{stage.detail}</small></span>
      </li>)}
    </ol>
    <div className="intelligence-hub__grid intelligence-hub__context-top">
      <Card variant="outlined" className="intelligence-hub__panel"><Card.Body>
        <header className="intelligence-hub__context-header"><div>
          <p className="intelligence-hub__eyebrow">Acquisition brief</p><h2>What should this acquisition understand?</h2>
        </div><Link to={workbenchHref} className="intelligence-hub__context-control" underline="none" title={workbenchTitle}>Edit brief ↗</Link></header>
        <dl className="intelligence-hub__brief-grid">
          {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{briefAvailable ? label === 'Acquisition profile' ? displayHubToken(value) : summaryValue(value) : 'Unavailable'}</dd></div>)}
        </dl>
        <div className="intelligence-hub__context-notes"><div><strong>Optional notes</strong><span>Recorded guidance</span></div>
          <Textarea size="sm" fullWidth rows={2} resize="vertical" aria-label="Recorded acquisition notes" readOnly
            value={briefAvailable ? String(values.notes ?? '') : 'Notes unavailable'} placeholder="No additional acquisition guidance is recorded." />
        </div>
      </Card.Body></Card>
      <Card variant="outlined" className="intelligence-hub__panel"><Card.Body>
        <header className="intelligence-hub__context-header"><div><p className="intelligence-hub__eyebrow">Acquisition readiness</p><h2>{readiness}</h2></div>
          <Badge variant={briefAvailable && recorded === completeness.length ? 'success' : 'neutral'} size="sm" pill>{briefAvailable ? `${recorded}/${completeness.length} brief fields` : 'Unavailable'}</Badge></header>
        <div className="intelligence-hub__required-fields">
          {['Company identity', 'Market and region', 'Target offer', 'Website recorded'].map((label, index) => <span key={label}>
            <strong aria-hidden="true">{briefAvailable ? completeness[index] ? '✓' : '○' : '—'}</strong>{label}
            <span className="sr-only">{briefAvailable ? completeness[index] ? ' present' : ' missing' : ' unavailable'}</span>
          </span>)}
        </div>
        <div className="intelligence-hub__context-guidance" data-recommendation={Boolean(discovery?.acquisitionEffectiveness?.recommendation)}>
          <strong>{discovery?.acquisitionEffectiveness?.recommendation ? 'Recommended improvement' : 'Acquisition boundary'}</strong>
          <p>{discovery?.acquisitionEffectiveness?.recommendation || 'Brief completeness does not confirm connected sources or authorise acquisition. Continue in the workbench.'}</p>
        </div>
        {!briefAvailable ? <p className="intelligence-hub__muted">Brief details unavailable for this revision.</p> : null}
      </Card.Body></Card>
    </div>
    <div className="intelligence-hub__grid intelligence-hub__context-bottom">
      <Panel title="Website discovery" headerIcon={<Badge variant="success" size="sm" className="intelligence-hub__intake-marker" aria-hidden="true">W</Badge>} eyebrow={briefAvailable ? websites.length ? `${websites.length} recorded in brief` : 'No website recorded' : 'Unavailable'} inlineHeader>
        <Input size="sm" fullWidth leftIcon={<MdSearch aria-hidden="true" />} aria-label="Search brief website" placeholder="Search recorded website…" value={search} onChange={(event) => setSearch(event.target.value)} />
        <span className="sr-only" role="status">{search.trim() ? `${matchingWebsites.length} matching recorded website${matchingWebsites.length === 1 ? '' : 's'}.` : ''}</span>
        {matchingWebsites.length ? <div className="intelligence-hub__context-websites" role="region" aria-label="Recorded brief websites" tabIndex={0}>{matchingWebsites.map((website) => <div key={website} className="intelligence-hub__context-source"><div><small>{website === websites[0] ? 'Primary website in brief' : 'Website in brief'}</small><strong>{website}</strong></div>
          <Button size="sm" variant="ghost" disabled title="Removal is not delivered in this view." aria-label={`Remove ${website}`}>Remove</Button></div>)}</div>
          : <p>{!briefAvailable ? 'Website detail unavailable.' : websites.length ? 'No matching website.' : 'No website is recorded in the brief.'}</p>}
        <Link to={workbenchHref} className="intelligence-hub__context-control" underline="none" title={workbenchTitle}>＋ Add URL in workbench ↗</Link>
        <small className="intelligence-hub__muted">Connection status unavailable. Removal is not delivered here.</small>
      </Panel>
      <Panel title="Document batch" headerIcon={<Badge variant="success" size="sm" className="intelligence-hub__intake-marker" aria-hidden="true">D</Badge>} eyebrow="Batch status unavailable" inlineHeader>
        <p>Select and process documents in the acquisition workbench, then review the resulting evidence candidates.</p>
        <Link to={workbenchHref} className="intelligence-hub__context-control intelligence-hub__context-select" underline="none" title={workbenchTitle}>＋ Select files in workbench ↗</Link>
        <small className="intelligence-hub__muted">File selection and acquisition are not performed in this view.</small>
      </Panel>
      <Panel title="Evidence continuity" headerIcon={<Badge variant="success" size="sm" className="intelligence-hub__intake-marker" aria-hidden="true">E</Badge>} eyebrow="Selected revision" inlineHeader>
        <div className="intelligence-hub__context-evidence"><strong>{countText(evidenceStatusCounts.accepted)}</strong><span>Accepted evidence objects</span></div>
        <p>Evidence and human decisions remain attached to their recorded revision. New acquisition does not silently alter a locked revision.</p>
        <p className="intelligence-hub__context-batch-status">Batch history unavailable · {countText(evidenceStatusCounts.pending)} awaiting review</p>
        <Button size="sm" variant="ghost" disabled>Start over with evidence</Button>
        <small className="intelligence-hub__muted">Reset is not delivered here.</small>
      </Panel>
    </div>
    {isLoading ? <p role="status">Loading Context evidence counts…</p> : null}
    <div className="intelligence-hub__context-actionbar"><span><strong>{readiness}</strong> · Recorded evidence is preserved. Acquisition continues in the workbench.</span>
      <div><Button size="sm" variant="outline" onClick={() => onSelectView('Sources')}>View current sources</Button>
        <Link to={workbenchHref} className="btn btn--primary intelligence-hub__context-control intelligence-hub__context-acquire" underline="none" title={workbenchTitle}>Run acquisition in workbench ↗</Link>
        <DetailButton onOpen={onOpen} title="Context and acquisition" body="This view displays the selected revision's recorded brief and bounded evidence counts. Brief edits, file selection, acquisition and reset belong to the existing workbench; this screen does not perform those actions.">About these actions</DetailButton>
      </div>
    </div>
  </div>
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

function SourcesView({ discovery, evidencePage, isLoading, error, pendingCount, countsLoading, onOpen, onSelectView, page, setPage, preferredSourceId = '', initialSearch = '' }) {
  const [search, setSearch] = useState(initialSearch)
  const [filter, setFilter] = useState('All')
  const [selectedSourceId, setSelectedSourceId] = useState(preferredSourceId)
  const searchRef = useRef(null)
  const sources = !isLoading && !error && Array.isArray(evidencePage?.sourceRegistry) ? evidencePage.sourceRegistry : []
  const evidence = !isLoading && !error && Array.isArray(evidencePage?.evidenceObjects) ? evidencePage.evidenceObjects : []
  const pageAvailable = !error && Boolean(evidencePage)
  const query = search.trim().toLowerCase()
  const linkedEvidence = (source) => evidence.filter((item) => item.sourceId === source.sourceId)
  const sourceMatches = (source) => [getSourceLabel(source), source.url, source.fileName, source.sourceRef, source.sourceType].filter(Boolean).join(' ').toLowerCase().includes(query)
  const evidenceMatches = (item) => [item.title, item.summary, item.extractedFact].filter(Boolean).join(' ').toLowerCase().includes(query)
  const filtered = sources.filter((source) => {
    const matchesFilter = filter === 'All' || filter === getSourceKind(source)
    return matchesFilter && (sourceMatches(source) || linkedEvidence(source).some(evidenceMatches))
  })
  const eligibleSources = sources.filter((source) => filter === 'All' || filter === getSourceKind(source))
  const requestedSourceMissing = preferredSourceId && selectedSourceId === preferredSourceId && !sources.some((source) => source.sourceId === preferredSourceId)
  const selected = eligibleSources.find((source) => source.sourceId === selectedSourceId) || (!requestedSourceMissing ? eligibleSources[0] : null) || null
  const selectedEvidence = selected ? linkedEvidence(selected) : []
  const resultIds = new Set()
  const matchingEvidence = evidence.flatMap((item) => {
    const source = filtered.find((candidate) => candidate.sourceId === item.sourceId)
    const id = item.evidenceObjectId || item.id
    if (!source || !(sourceMatches(source) || evidenceMatches(item)) || resultIds.has(id)) return []
    resultIds.add(id)
    return [{ item, source }]
  })
  const displayedEvidence = query ? matchingEvidence : selectedEvidence.map((item) => ({ item, source: selected }))
  const totalEvidence = error || evidencePage?.totalCapped ? null : getHubCount(evidencePage, 'total')
  const summaryValue = (count) => countsLoading ? 'Loading…' : displayHubCount(count)
  const sourceMessage = isLoading ? 'Loading sources…' : error ? 'Sources could not be loaded. Refresh to retry.'
    : !evidencePage ? 'Bounded source detail is unavailable.' : sources.length ? 'No sources match on this page.' : 'No sources are linked to this evidence page.'
  const sourceFacts = (source, item) => <>
    <p>This provenance belongs to the selected revision and the current evidence page. Inspecting it does not accept evidence or change the source.</p>
    <dl className="intelligence-hub__facts">
      {Object.entries({ Source: getSourceLabel(source), Type: displayHubToken(source.sourceType), 'Acquisition status': getSourceStatus(source),
        Reference: source.sourceRef || source.url || source.fileName || 'Unavailable', 'Source lineage': source.lineageRef || 'Unavailable',
        'State version': source.stateVersion || 'Unavailable',
        ...(item ? { 'Evidence title': item.title || 'Unavailable', 'Review state': displayHubToken(item.reviewStatus),
          'Acceptance state': displayHubToken(item.acceptanceState), 'Evidence lineage': item.lineageRef || 'Unavailable' } : {}),
      }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  </>
  return <div className="intelligence-hub__sources-workspace">
    <div className="intelligence-hub__sources-toolbar">
      <div><p className="intelligence-hub__eyebrow">Source provenance</p><h2>Confirm sources and processing</h2>
        <p>Inspect source provenance and trace evidence to its origin on this page.</p></div>
      <div className="intelligence-hub__sources-search"><Input ref={searchRef} size="sm" fullWidth leftIcon={<MdSearch aria-hidden="true" />} aria-label="Search sources and evidence on this page" placeholder="Search evidence, source or title on this page…" value={search} onChange={(event) => setSearch(event.target.value)} />
        {search ? <Button size="sm" variant="ghost" aria-label="Clear search" className="intelligence-hub__sources-clear" onClick={() => { setSearch(''); searchRef.current?.focus() }}>×</Button> : null}</div>
    </div>
    <span className="sr-only" role="status">{pageAvailable && !isLoading && (query || filter !== 'All') ? `${filtered.length} matching sources on this page.${query ? ` ${matchingEvidence.length} matching evidence objects on this page.` : ''}` : ''}</span>
    <div className="intelligence-hub__sources-summary" aria-label="Source summary">
      <span><strong>{isLoading ? 'Loading…' : pageAvailable ? sources.length : 'Unavailable'}</strong><small>Sources on page</small></span>
      <span><strong>{summaryValue(getHubCount(discovery?.sourceRegistrySummary, 'processedCount'))}</strong><small>Processed total</small></span>
      <span><strong>{isLoading ? 'Loading…' : displayHubCount(totalEvidence)}</strong><small>Evidence objects</small></span>
      <span><strong>{summaryValue(pendingCount)}</strong><small>Require review</small></span>
      <Button size="sm" variant="ghost" onClick={(event) => onOpen({ title: 'Source processing report', body: <>
        <p>Sources shown here are linked to evidence page {page}. Acquisition status is a recorded source state, not proof that processing checks passed or evidence was accepted.</p>
        <dl className="intelligence-hub__facts"><div><dt>Revision evidence objects</dt><dd>{displayHubCount(totalEvidence)}</dd></div><div><dt>Awaiting review</dt><dd>{displayHubCount(pendingCount)}</dd></div></dl>
        {sources.length ? <ul>{sources.map((source) => <li key={source.sourceId}>{getSourceLabel(source)} · {getSourceStatus(source)}</li>)}</ul> : <p>Source processing detail unavailable.</p>}
        <p>Processing runs, batch history, control checks and downloadable logs are unavailable from this bounded read. Evidence decisions remain in the governed review workflow.</p>
      </> }, event.currentTarget)}>View processing report</Button>
    </div>
    <div className="intelligence-hub__sources-browser">
      <Card variant="outlined" className="intelligence-hub__sources-registry" aria-label="Page-local source registry">
        <Card.Header><div><h2>Source registry</h2><strong>{isLoading ? 'Loading…' : pageAvailable ? `${filtered.length} shown · ${sources.length} on page ${page}` : 'Unavailable'}</strong></div>
          <div className="intelligence-hub__sources-filters" role="group" aria-label="Source type filters">
            {['All', 'Website', 'Document'].map((item) => <Button key={item} size="sm" variant="outline" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</Button>)}
          </div>
        </Card.Header>
        <Card.Body role="region" aria-label="Source registry results" tabIndex={0}>{filtered.length ? <ul className="intelligence-hub__sources-list">
          {filtered.map((source) => <li key={source.sourceId}><Button size="sm" variant="ghost" fullWidth className="intelligence-hub__sources-row" aria-pressed={selected?.sourceId === source.sourceId}
            onClick={() => { setSelectedSourceId(source.sourceId); setSearch('') }} title={getSourceLabel(source)}>
            <Badge variant="success" size="sm" className="intelligence-hub__sources-marker" aria-hidden="true">{getSourceKind(source)[0]}</Badge>
            <span><strong>{getSourceLabel(source)}</strong><small>{displayHubToken(source.sourceType)} · {getSourceStatus(source)}</small></span>
            <span className="intelligence-hub__sources-count"><strong>{linkedEvidence(source).length}</strong><small>on page</small></span>
          </Button></li>)}
        </ul> : <p role={isLoading ? 'status' : error ? 'alert' : undefined}>{sourceMessage}</p>}</Card.Body>
        <Card.Footer><p>Evidence-linked sources on this page only. Search and filters do not cover the complete registry.</p>
          <EvidencePagination evidencePage={error ? null : evidencePage} page={page} setPage={setPage} isLoading={isLoading} />
        </Card.Footer>
      </Card>
      <Card variant="outlined" className="intelligence-hub__sources-detail" aria-label="Source evidence">
        <Card.Header><div><small>{query ? 'Search results' : selected ? `${getSourceKind(selected)} source · ${getSourceStatus(selected)}` : 'No source selected'}</small>
          <h3 title={!query && selected ? getSourceLabel(selected) : undefined}>{query ? `Evidence matching “${search.trim()}”` : selected ? getSourceLabel(selected) : 'Selected source'}</h3>
          {query ? <p>{isLoading ? 'Loading matching evidence…' : error ? 'Matching evidence could not be loaded.' : !pageAvailable ? 'Matching evidence is unavailable.' : `${matchingEvidence.length} matching evidence objects across sources on this page`}</p> : selected ? <p>{selectedEvidence.length} evidence objects on this page · {displayHubToken(selected.sourceType)}</p> : null}</div>
        </Card.Header>
        <Card.Body role="region" aria-label={query ? 'Evidence search results' : 'Selected source detail'} tabIndex={0}>{query || selected ? <>
          {displayedEvidence.map(({ item, source }) => {
            const status = String(item.reviewStatus || item.acceptanceState || '').toUpperCase()
            const variant = status === 'ACCEPTED' ? 'success' : status === 'PENDING' ? 'warning' : status === 'REJECTED' ? 'danger' : 'neutral'
            return <article key={item.evidenceObjectId || item.id} className="intelligence-hub__sources-evidence" data-state={status}>
              <header><strong>{item.title || 'Evidence classification unavailable'}</strong><Badge size="sm" variant={variant} pill>{displayHubToken(status)}</Badge></header>
              <p>{item.extractedFact || item.summary || 'Evidence detail unavailable'}</p>
              <footer><Button size="sm" variant="ghost" className="intelligence-hub__sources-origin" onClick={(event) => onOpen({ title: 'Source and evidence provenance', body: sourceFacts(source, item) }, event.currentTarget)}>
                <Badge variant="success" size="sm" className="intelligence-hub__sources-marker" aria-hidden="true">{getSourceKind(source)[0]}</Badge>
                <span><strong>{source.sourceRef || source.url || source.fileName || getSourceLabel(source)}</strong><small>Inspect recorded lineage</small></span>
              </Button>{status === 'PENDING' ? <Button size="sm" variant="ghost" onClick={() => onSelectView('Review')}>Open in Review →</Button> : null}</footer>
            </article>
          })}
          {!displayedEvidence.length ? <p>{isLoading ? 'Loading matching evidence…' : error ? 'Matching evidence could not be loaded.' : !pageAvailable ? 'Matching evidence is unavailable.' : 'No matching evidence is present in this bounded page.'}</p> : null}
        </> : <p>{isLoading ? 'Loading selected-source evidence…' : error ? 'Selected-source evidence could not be loaded.' : !pageAvailable ? 'Selected-source evidence is unavailable.' : requestedSourceMissing ? 'The requested source is not present on this evidence page.' : 'Select a source from this page to inspect its recorded evidence.'}</p>}</Card.Body>
      </Card>
    </div>
    <footer className="intelligence-hub__sources-footer"><Button size="sm" variant="ghost" onClick={() => onSelectView('Context')}>← Context</Button>
      <span>Processing is inspected here; evidence decisions remain in the governed review workflow.</span><Button size="sm" variant="ghost" onClick={() => onSelectView('Review')}>Continue to Review →</Button>
    </footer>
  </div>
}

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

function ReviewView({ evidencePage, isLoading, error, evidenceStatusCounts, countsLoading, onOpenSource, onSelectView, page, setPage, filter, onFilterChange }) {
  const [search, setSearch] = useState('')
  const [selection, setSelection] = useState(null)
  const searchRef = useRef(null)
  const selectionKey = `${filter}:${page}`
  const available = !error && Boolean(evidencePage)
  const evidence = available && !isLoading ? evidencePage.evidenceObjects || [] : []
  const sources = available && !isLoading ? evidencePage.sourceRegistry || [] : []
  const query = search.trim().toLowerCase()
  const sourceFor = (item) => sources.find((source) => source.sourceId === item.sourceId)
  const filtered = evidence.filter((item) => {
    const source = sourceFor(item)
    return [item.title, item.summary, item.extractedFact, source?.label, source?.sourceRef, source?.url, source?.fileName].filter(Boolean).join(' ').toLowerCase().includes(query)
  })
  const selected = evidence.find((item) => selection?.key === selectionKey && item.evidenceObjectId === selection.id) || evidence[0] || null
  const source = selected ? sourceFor(selected) : null
  const state = getReviewState(selected)
  const count = (value) => countsLoading ? 'Loading…' : displayHubCount(value)
  const queueMessage = isLoading ? 'Loading evidence candidates…' : error ? 'Evidence candidates could not be loaded. Refresh to retry.' : !available ? 'Evidence candidates are unavailable for this revision.' : query ? 'No candidates match this search on this page.' : 'No candidates match this review filter in the selected revision.'
  return <div className="intelligence-hub__sources-workspace intelligence-hub__review-workspace">
    <div className="intelligence-hub__sources-toolbar intelligence-hub__review-toolbar">
      <div><p className="intelligence-hub__eyebrow">Evidence review</p><h2>Resolve evidence requiring attention</h2>
        <p>Inspect accepted evidence and review exceptions. Evidence decisions remain in the governed workflow.</p></div>
      <div className="intelligence-hub__sources-search"><Input ref={searchRef} size="sm" fullWidth leftIcon={<MdSearch aria-hidden="true" />} aria-label="Search evidence candidates on this page" placeholder="Search evidence or source on this page…" value={search} onChange={(event) => setSearch(event.target.value)} />
        {search ? <Button size="sm" variant="ghost" aria-label="Clear evidence search" className="intelligence-hub__sources-clear" onClick={() => { setSearch(''); searchRef.current?.focus() }}>×</Button> : null}</div>
      <Button size="sm" variant="outline" className="intelligence-hub__review-complete" disabled title="Review completion is not delivered by SS-037.">Complete review &amp; continue →</Button>
    </div>
    <span className="sr-only" role="status">{available && !isLoading && query ? `${filtered.length} matching evidence candidates on this page.` : ''}</span>
    <div className="intelligence-hub__sources-summary intelligence-hub__review-summary" role="region" aria-label="Evidence review summary" tabIndex={0}>
      <span><strong>Unavailable</strong><small>Review started with</small></span>
      <span><strong>{count(evidenceStatusCounts.accepted)}</strong><small>Already accepted</small></span>
      <span><strong>Unavailable</strong><small>Approved this review</small></span>
      <span><strong>{count(evidenceStatusCounts.pending)}</strong><small>Unresolved decisions</small></span>
    </div>
    <div className="intelligence-hub__review-browser">
      <Card variant="outlined" className="intelligence-hub__review-queue" aria-label="Exception queue">
        <Card.Header><div><h2>Exception queue</h2><strong>{isLoading ? 'Loading…' : available ? `${filtered.length} items shown on this page` : 'Unavailable'}</strong></div>
          <div className="intelligence-hub__sources-filters" role="group" aria-label="Review filters">{['Needs review', 'All', 'Approved', 'Rejected'].map((label) => <Button key={label} size="sm" variant="outline" aria-pressed={filter === label} onClick={() => onFilterChange(label)}>{label}</Button>)}</div>
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
          <section className="intelligence-hub__review-provenance"><header><strong>Evidence provenance</strong><Button variant="ghost" size="sm" disabled={!source} onClick={() => onOpenSource(source.sourceId)}>Open source →</Button></header>
            <div><Badge variant="success" size="sm" className="intelligence-hub__sources-marker" aria-hidden="true">{source ? getSourceKind(source)[0] : '?'}</Badge><span><strong>{source ? source.sourceRef || source.url || source.fileName || getSourceLabel(source) : 'Source unavailable'}</strong><small>{source ? `${displayHubToken(source.sourceType)} · ${getSourceStatus(source)}` : 'Source provenance unavailable'}</small></span></div>
            <p>Source content remains linked to this evidence object for inspection and explainability.</p>
          </section>
          <section className="intelligence-hub__review-explanation"><strong>Why this needs attention</strong><p>{state === 'PENDING' ? 'This candidate needs a human decision before it can affect downstream workspace understanding.' : 'This evidence has a recorded review state. Inspection does not change that decision or the selected revision.'}</p></section>
          <footer className="intelligence-hub__review-actions"><span>Approval, rejection and review completion remain in the governed workflow.</span><div><Button variant="outline" size="sm" className="intelligence-hub__review-reject" disabled title="Evidence decisions are not delivered by SS-037.">× Reject</Button><Button variant="outline" size="sm" className="intelligence-hub__review-approve" disabled title="Evidence decisions are not delivered by SS-037.">✓ Approve evidence</Button></div></footer>
        </> : <p>{isLoading ? 'Loading selected evidence…' : error ? 'Selected evidence could not be loaded.' : available ? 'No candidate is selected for this review filter.' : 'Selected evidence is unavailable.'}</p>}
      </Card>
    </div>
    <footer className="intelligence-hub__sources-footer"><Button variant="ghost" size="sm" onClick={() => onSelectView('Sources')}>← Sources</Button><span>{countsLoading ? 'Loading unresolved decisions…' : evidenceStatusCounts.pending === null ? 'Unresolved decision count is unavailable.' : `${evidenceStatusCounts.pending} evidence decisions remain; continuing preserves them for later review.`}</span><Button variant="ghost" size="sm" onClick={() => onSelectView('Coverage')}>Continue to Coverage →</Button></footer>
  </div>
}
const READINESS_CONTROLS = [
  ['acceptance', 'Evidence acceptance', 'Human review establishes accepted evidence.', 'Review'],
  ['lineage', 'Provenance and lineage', 'Source origins and evidence lineage remain attached.', 'Sources'],
  ['quality', 'Quality exceptions', 'Findings require a decision or disclosed exception.', 'Review'],
  ['assurance', 'Intelligence assurance', 'Assurance requires a recorded review basis.', 'Overview'],
  ['scope', 'Source scope and permissions', 'Source access remains within this workspace.', 'Sources'],
  ['history', 'Decision and audit history', 'Decisions require authority and rationale.', 'Review'],
]

function RecentRuntimeActivity({ activity }) {
  const events = Array.isArray(activity) ? activity.slice(0, 10) : []
  return <section><h3>Recent runtime activity</h3><p>General runtime events are not per-control review decisions.</p>{events.length ? <ol>{events.map((item, index) => <li key={item.id || index}>{item.summary || item.description || item.label || displayHubToken(item.eventType || item.action || item.type)} · {readableDate(item.occurredAt || item.createdAt || item.timestamp)}</li>)}</ol> : <p>Unavailable</p>}</section>
}

function AssuranceReport({ renderer, evidenceStatusCounts, countsLoading, previewedAt }) {
  const revision = renderer?.revision?.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Unavailable'
  const name = summaryValue(renderer?.runtimeInstance?.name)
  const accepted = countsLoading ? 'Loading…' : displayHubCount(getHubCount(evidenceStatusCounts, 'accepted'))
  return <div className="intelligence-hub__report-content">
    <section className="intelligence-hub__report-purpose"><div><h3>Report scope</h3><strong>Point-in-time summary for selected revision {revision}</strong><p>This point-in-time preview records the selected revision’s evidence and available publication state. Assurance and control decisions are shown only when recorded; this preview does not approve evidence or change workspace state.</p></div><Badge size="sm" pill>Assurance unavailable</Badge></section>
    <article className="intelligence-hub__report-sheet" aria-label="Selected revision assurance summary">
      <header><div><p>StorylineOS Intelligence Assurance Report</p><h3>{name}</h3><small>Selected revision {revision} · Previewed {compactReadableDate(previewedAt)}</small></div><span className="intelligence-hub__report-assurance" aria-label="Assurance level unavailable">—</span></header>
      <div className="intelligence-hub__report-posture">{[['Assurance posture', 'Unavailable'], ['Workspace use', 'Unavailable'], ['Publication', displayHubToken(renderer?.publish?.state)], ['Assurance', 'Unavailable']].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
      <section><header><h4>Executive assurance summary</h4><small>Selected revision</small></header><p>Canonical readiness: {displayHubToken(renderer?.readiness?.state)}. Evidence counts describe recorded review state; they do not independently establish assurance. Assurance decisions and disclosed quality exceptions are unavailable.</p><div className="intelligence-hub__report-metrics">{[['Accepted evidence', accepted], ['Governed decisions', 'Unavailable'], ['Open exceptions', 'Unavailable'], ['Audit events', 'Unavailable']].map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></section>
      <section><header><h4>Control register</h4><small>6 controls</small></header><div className="intelligence-hub__report-controls">{READINESS_CONTROLS.map(([id, title]) => <section key={id}><span className="intelligence-hub__report-marker" aria-hidden="true"><MdInfoOutline /></span><div><strong>{title}</strong><small>Authority unavailable</small></div><Badge size="sm" pill>Unavailable</Badge></section>)}</div></section>
      <section className="intelligence-hub__report-disclosures"><header><h4>Disclosed exceptions</h4><small>Recorded findings unavailable</small></header><div><p><strong>Quality exceptions unavailable</strong><small>No recorded exception summary is available for this revision.</small></p><p><strong>Material coverage gaps unavailable</strong><small>No recorded gap disclosure is available for this revision.</small></p></div></section>
      <footer><span>Scope: {name} · {revision}</span><small>Recorded revision summary · This preview does not accept or approve new understanding</small></footer>
    </article>
  </div>
}

function ReadinessView({ renderer, discovery, evidenceTotal, evidenceStatusCounts, countsLoading, onOpen, onSelectView, qualityHref }) {
  const [selectedId, setSelectedId] = useState('quality')
  const selected = READINESS_CONTROLS.find(([id]) => id === selectedId)
  const revision = renderer?.revision?.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Unavailable'
  const truth = renderer?.readiness?.sectionTruth
  const snapshot = renderer?.lock?.snapshot?.snapshotId
  const count = (value) => countsLoading ? 'Loading…' : displayHubCount(getHubCount({ value }, 'value'))
  const preview = (event) => onOpen({
    title: 'Intelligence assurance report', kind: 'assurance-report',
    subtitle: summaryValue(renderer?.runtimeInstance?.name) + ' · selected revision ' + revision,
    body: <AssuranceReport renderer={renderer} evidenceStatusCounts={evidenceStatusCounts} countsLoading={countsLoading} previewedAt={new Date().toISOString()} />,
  }, event.currentTarget)
  return <div className="intelligence-hub__sources-workspace intelligence-hub__readiness-workspace">
    <header className="intelligence-hub__readiness-toolbar"><div><p className="intelligence-hub__eyebrow">Readiness and publication</p><h2>Review the selected revision before publication</h2></div><Button size="sm" disabled title="Publication remains in the governed workflow.">Publish &amp; lock revision</Button></header>
    <section className="intelligence-hub__readiness-posture" aria-label="Selected revision posture"><strong>Selected revision {revision} · {displayHubToken(renderer?.lifecycle?.stage)}</strong><div className="intelligence-hub__readiness-metrics"><span><small>Publication</small><b>{displayHubToken(renderer?.publish?.state)}</b></span><span><small>Canonical readiness</small><b>{displayHubToken(renderer?.readiness?.state)}</b></span><span><small>Discovery readiness</small><b>{displayHubToken(discovery?.discoveryHealth?.readiness?.state)}</b></span></div><p>{truth?.reason || 'Section-truth readiness explanation is unavailable.'}</p></section>
    <section className="intelligence-hub__readiness-boundary"><span aria-hidden="true"><MdInfoOutline /></span><p><strong>What changes at publication</strong> Publication freezes the accepted understanding. New evidence after lock requires a governed successor revision; it does not silently change this revision.</p><Button variant="ghost" size="sm" onClick={() => onSelectView('After lock')}>View After lock →</Button></section>
    <div className="intelligence-hub__readiness-cards">
      <section><header><h3>Canonical readiness</h3><Badge variant="info" size="sm" pill>{displayHubToken(renderer?.readiness?.state)}</Badge></header><p>{truth ? `${displayHubCount(getHubCount(truth, 'readySectionCount'))} of ${displayHubCount(getHubCount(truth, 'requiredSectionCount'))} required sections ready` : 'Section readiness is unavailable.'}</p><Link to={qualityHref} variant="subtle" className="intelligence-hub__readiness-link">Review quality findings →</Link></section>
      <section><header><h3>Outcome readiness</h3><Badge size="sm" pill>Unavailable</Badge></header><p>Outcome Studio readiness is not exposed by the bounded summary.</p><p>Recorded output eligibility: {typeof renderer?.publish?.outputEligibility?.outputEligible === 'boolean' ? renderer.publish.outputEligibility.outputEligible ? 'Eligible' : 'Not eligible' : 'Unavailable'}</p><Button variant="ghost" size="sm" onClick={() => onSelectView('Coverage')}>View coverage conditions →</Button></section>
      <section><header><h3>Lock snapshot</h3><Badge size="sm" pill>{displayHubToken(renderer?.lock?.state)}</Badge></header><dl><div><dt>Revision</dt><dd>{revision}</dd></div><div><dt>Source basis</dt><dd>{displayHubCount(getHubCount(discovery?.sourceRegistrySummary, 'count'))} sources · {count(evidenceTotal)} evidence objects</dd></div><div><dt>Snapshot</dt><dd title={snapshot}>{summaryValue(snapshot)}</dd></div></dl></section>
    </div>
    <section className="intelligence-hub__readiness-checklist"><header><h3>Publication checks</h3><span>Check receipts unavailable</span><Button variant="ghost" size="sm" onClick={preview}>Preview assurance report →</Button></header><div className="intelligence-hub__readiness-checks">{['Evidence provenance retained', 'Section mapping reviewed', 'Quality findings need a decision', 'Publication boundary confirmed'].map((title) => <div key={title}><span aria-hidden="true"><MdInfoOutline /></span><div><strong>{title}</strong><small>Unavailable</small></div></div>)}</div></section>
    <div className="intelligence-hub__readiness-browser">
      <section className="intelligence-hub__readiness-register"><header><h3>Decision and assurance history</h3><small>6 controls · select a control to inspect its basis</small></header><div role="region" aria-label="Assurance control register" tabIndex={0}>{READINESS_CONTROLS.map(([id, title, description]) => <Button variant="ghost" size="sm" key={id} className="intelligence-hub__readiness-row" aria-pressed={selectedId === id} onClick={() => setSelectedId(id)}><span className="intelligence-hub__readiness-marker" aria-hidden="true"><MdInfoOutline /></span><span><strong>{title}</strong><small>{description}</small></span><Badge size="sm" pill>Unavailable</Badge></Button>)}</div></section>
      <section className="intelligence-hub__readiness-detail" aria-label="Selected assurance control" tabIndex={0}><header><p className="intelligence-hub__eyebrow">Selected assurance control</p><Badge size="sm" pill>Unavailable</Badge></header><h3>{selected[1]}</h3><p>{selected[2]}</p><div className="intelligence-hub__readiness-basis"><strong>Review basis</strong><p>No named control receipt is exposed in the bounded selected-revision summary. Evidence totals and general activity do not establish this control's approval.</p></div><div className="intelligence-hub__readiness-records"><span>{revision}</span>{selectedId === 'acceptance' ? <><span>{count(evidenceStatusCounts.accepted)} accepted</span><span>{count(evidenceStatusCounts.pending)} awaiting review</span><span>{count(evidenceStatusCounts.rejected)} rejected</span></> : <span>Control decision unavailable</span>}</div><div className="intelligence-hub__readiness-authority"><div><small>Authority</small><strong>Unavailable</strong></div><div><small>Latest review event</small><strong>Unavailable</strong></div></div><div className="intelligence-hub__readiness-action"><strong>Next available action</strong><p>Inspect the relevant information. Approval and publication require an authorised human decision.</p><div>{selectedId === 'quality' ? <Link to={qualityHref} variant="subtle" className="intelligence-hub__readiness-link">Open quality findings →</Link> : selectedId === 'assurance' ? <Button variant="ghost" size="sm" onClick={(event) => onOpen({ title: 'Intelligence assurance', body: 'Assurance describes a recorded review scope and state for a specific revision. This bounded summary does not expose a named assurance-control receipt. Evidence counts, output eligibility and a locked snapshot do not independently certify assurance.' }, event.currentTarget)}>Understand assurance →</Button> : selectedId === 'history' ? <Button variant="ghost" size="sm" onClick={(event) => onOpen({ title: 'Recent runtime activity', body: <RecentRuntimeActivity activity={renderer?.activity} /> }, event.currentTarget)}>View recorded activity →</Button> : <Button variant="ghost" size="sm" onClick={() => onSelectView(selected[3])}>{selectedId === 'acceptance' ? 'Open evidence review →' : selectedId === 'scope' ? 'Review source scope →' : 'Inspect sources →'}</Button>}</div></div><footer>Publication must retain authority, rationale, accepted evidence and the recorded snapshot.</footer></section>
    </div>
    <footer className="intelligence-hub__sources-footer"><Button variant="ghost" size="sm" onClick={() => onSelectView('Review')}>← Review</Button><span>Resolve or disclose findings before publication.</span><Button variant="ghost" size="sm" onClick={() => onSelectView('After lock')}>Continue to After lock →</Button></footer>
  </div>
}

function DiscoveryIntake() {
  const [sourceType, setSourceType] = useState('Document')
  const [values, setValues] = useState({ Document: '', Website: '' })
  const [description, setDescription] = useState('')
  return <div className="intelligence-hub__discovery-intake">
    <div role="group" aria-label="Evidence source type">{['Document', 'Website'].map(type => <Button key={type} size="sm" variant="outline" aria-pressed={sourceType === type} onClick={() => setSourceType(type)}>{type}</Button>)}</div>
    <label htmlFor="hub-discovery-source">{sourceType === 'Document' ? 'Document name' : 'Website URL'}</label>
    <Input id="hub-discovery-source" size="sm" fullWidth type={sourceType === 'Website' ? 'url' : 'text'} placeholder={sourceType === 'Document' ? 'For example, Customer interview notes' : 'https://example.com/customer-update'} value={values[sourceType]} onChange={event => setValues({ ...values, [sourceType]: event.target.value })} />
    <label htmlFor="hub-discovery-description">What should we review?</label>
    <Input id="hub-discovery-description" size="sm" fullWidth placeholder="Add a short description of the new evidence" value={description} onChange={event => setDescription(event.target.value)} />
    <aside><strong>What happens next</strong><p>Add to discovery is unavailable because the API does not provide a post-lock intake workflow. These fields are a local draft only and are discarded when this dialog closes. No source or evidence is saved, and the selected revision remains unchanged.</p></aside>
  </div>
}

const discoveryIntakeInfo = (renderer) => ({
  kind: 'discovery-intake', title: 'Add evidence for review',
  subtitle: `${summaryValue(renderer?.runtimeInstance?.name)} · ${renderer?.revision?.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Selected revision'}. Review new evidence separately; this dialog does not alter the selected revision.`,
  body: <DiscoveryIntake />,
})

function AfterLockExplanation({ revision, locked }) {
  const steps = [
    ['The locked revision stays unchanged', locked ? `${revision} remains the reference that existing outcomes rely on.` : 'When a revision is locked, it remains the reference for outcomes created from it.'],
    ['New evidence is reviewed separately', 'Source details, provenance and the possible effect must be visible before a decision is made.'],
    ['A person records the impact', 'Evidence may support the current revision, need no change or require closer review.'],
    ['An updated revision is created only when needed', locked ? `A new revision can be prepared and reviewed without overwriting ${revision}.` : 'A new revision can be prepared without overwriting a previously locked revision.'],
  ]
  return <div className="intelligence-hub__lock-explanation">
    <section><strong>Separate review protects clarity</strong><p>Review new material, its provenance and its effect before an authorised person updates accepted understanding.</p></section>
    <div className="intelligence-hub__lock-steps">{steps.map(([title, body], index) => <article key={title}><span aria-hidden="true">{index + 1}</span><div><strong>{title}</strong><p>{body}</p></div></article>)}</div>
    <section className="intelligence-hub__lock-outcomes"><strong>What this means for you</strong><div><strong>Existing outcomes remain dependable</strong><p>Published assets retain their recorded revision reference until an authorised update.</p></div><div><strong>New evidence remains actionable</strong><p>Important changes need a visible review and updated-revision path rather than being applied silently.</p></div></section>
  </div>
}

function AfterLockView({ renderer, onOpen, onSelectView }) {
  const lockToken = String(renderer?.lock?.state || '').toUpperCase()
  const lockedSignal = renderer?.lock?.locked === true || lockToken === 'LOCKED'
  const unlockedSignal = renderer?.lock?.locked === false || lockToken === 'UNLOCKED'
  const lockKnown = lockedSignal !== unlockedSignal
  const locked = lockKnown && lockedSignal
  const unlocked = lockKnown && unlockedSignal
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
      <div className="intelligence-hub__lock-state"><strong>{locked ? published ? 'Published and locked' : 'Locked revision' : unlocked ? 'Not locked' : 'Lock state unavailable'}</strong><span>{summaryValue(renderer?.runtimeInstance?.name)} · {revision}</span><small>Locked {locked ? compactReadableDate(renderer?.lock?.lockedAt) : 'Unavailable'} · Snapshot {locked ? summaryValue(renderer?.lock?.snapshot?.snapshotId) : 'Unavailable'}</small></div>
    </header>
    <div className="intelligence-hub__lock-notice"><MdInfoOutline aria-hidden="true" /><p><strong>{locked ? `${revision} is protected` : unlocked ? `${revision} is not locked` : 'Lock state unavailable'}</strong> {locked ? 'Evidence gathered after lock can support, qualify or challenge the current revision, but cannot silently alter accepted understanding.' : 'These protections apply only after a verified lock. New evidence requires human review before changing accepted understanding.'}</p><Button size="sm" variant="ghost" onClick={explanation}>Why this is separate →</Button></div>
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
        <section className="intelligence-hub__lock-impact"><p className="intelligence-hub__eyebrow">Evidence impact</p><p>Unavailable · no recorded post-lock impact decision.</p><div>{['No change to current revision', 'Supports current revision', 'Could require an updated revision', 'Current revision may need review'].map(label => <Button key={label} size="sm" variant="outline" disabled>○ {label}</Button>)}</div></section>
        <section className="intelligence-hub__lock-next"><p className="intelligence-hub__eyebrow">Next action</p><strong>Unavailable</strong><p>No next step is inferred without a recorded impact.</p></section>
        <aside className="intelligence-hub__lock-advisor"><MdInfoOutline aria-hidden="true" /><div><p className="intelligence-hub__eyebrow">Advisor suggestion</p><p>Unavailable</p><small>Guidance only · an authorised person records the decision.</small></div></aside>
        <section className="intelligence-hub__lock-decision"><header><p className="intelligence-hub__eyebrow">Record next step</p><small>Owner · Unavailable</small></header><p>Recording a decision must not change {revision}. Decision recording is not delivered here.</p><Button size="sm" disabled>Save decision</Button></section>
        <section><p className="intelligence-hub__eyebrow">Decision history</p><p>Unavailable · general revision activity is not post-lock decision history.</p></section>
      </div></article>
    </div>
    <footer className="intelligence-hub__lock-footer"><span>Current revision readiness <strong>{readiness}</strong> · Outcome readiness <span>Unavailable</span></span><Button size="sm" variant="ghost" onClick={() => onSelectView('Readiness & publish')}>View readiness and history →</Button><Button size="sm" className="intelligence-hub__lock-discovery" onClick={event => onOpen(discoveryIntakeInfo(renderer), event.currentTarget)}>＋ Start discovery</Button></footer>
    <nav className="intelligence-hub__sources-footer intelligence-hub__lock-navigation" aria-label="After lock view navigation"><Button size="sm" variant="ghost" onClick={() => onSelectView('Readiness & publish')}>← Readiness &amp; publish</Button><Button size="sm" variant="ghost" onClick={() => onSelectView('Coverage')}>Continue to Coverage →</Button></nav>
  </section>
}

export default function IntelligenceHub({ quality = false }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const workspaceId = String(searchParams.get('runtimeInstanceId') || '').trim()
  const revisionId = String(searchParams.get('revisionId') || '').trim()
  const { customerId, tenantId } = useTenantContext()
  const contextKey = `${workspaceId}:${revisionId}:${customerId}:${tenantId}`
  const viewIndex = quality ? HUB_VIEWS.length : Math.max(0, getHubViewFromSearch(`?${searchParams.toString()}`))
  const view = quality ? 'Intelligence Quality' : HUB_VIEWS[viewIndex]
  const evidenceReadiness = view === 'Evidence readiness'
  const [info, setInfo] = useState(null)
  const [evidencePagination, setEvidencePagination] = useState({ contextKey, page: 1 })
  const evidencePageNumber = evidencePagination.contextKey === contextKey ? evidencePagination.page : 1
  const setEvidencePageNumber = (page) => setEvidencePagination({ contextKey, page })
  const [reviewFilterReceipt, setReviewFilterReceipt] = useState(null)
  const reviewFilter = reviewFilterReceipt?.contextKey === contextKey ? reviewFilterReceipt.filter : 'Needs review'
  const setReviewFilter = (filter) => setReviewFilterReceipt({ contextKey, filter })
  const [sourceFocus, setSourceFocus] = useState(null)
  const preferredSourceId = sourceFocus?.contextKey === contextKey && sourceFocus.page === evidencePageNumber ? sourceFocus.sourceId : ''
  const preferredSourceSearch = sourceFocus?.contextKey === contextKey && sourceFocus.page === evidencePageNumber ? sourceFocus.search || '' : ''
  const sourceSearchRequest = sourceFocus?.contextKey === contextKey ? sourceFocus.requestId || 0 : 0
  const visibleInfo = info?.contextKey === contextKey ? info : null
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
    { runtimeInstanceId: revisionId, customerId, tenantId },
    { skip: !requiredContext },
  )
  const renderer = getHubPayload(rendererResponse)
  const context = validateHubContext({ renderer, workspaceId, revisionId, customerId, tenantId })
  const canReadDetail = context.valid
  const { currentData: qualityResponse, error: qualityError, isFetching: qualityFetching, isLoading: qualityLoading, refetch: refetchQuality } = useGetRuntimeDiscoveryContradictionsQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId },
    { skip: !canReadDetail || !(quality || evidenceReadiness) },
  )
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
  const needsEvidence = view === 'Sources' || view === 'Review'
  const {
    currentData: evidenceResponse,
    isLoading: evidenceLoading,
    isFetching: evidenceFetching,
    error: evidenceError,
    refetch: refetchEvidence,
  } = useGetRuntimeStateEvidenceQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId, page: evidencePageNumber, pageSize: 25,
      reviewStatus: view === 'Review' && reviewFilter !== 'All'
        ? ({ 'Needs review': 'PENDING', Approved: 'ACCEPTED', Rejected: 'REJECTED' }[reviewFilter] || '')
        : '' },
    { skip: !canReadDetail || !needsEvidence },
  )
  // The V2 endpoint reports an empty first filtered page as EVIDENCE_MISSING.
  // A successful unfiltered count distinguishes that from missing storage.
  const emptyFilteredPage = view === 'Review' && reviewFilter !== 'All' && evidencePageNumber === 1
    && typeof summaryEvidencePage?.total === 'number' && Number.isFinite(summaryEvidencePage.total)
    && summaryEvidencePage.total >= 0 && !summaryEvidencePage.totalCapped
    && evidenceError?.data?.error?.code === 'RUNTIME_STATE_V2_EVIDENCE_MISSING'
  const evidencePage = emptyFilteredPage
    ? { evidenceObjects: [], total: 0, page: 1, pageSize: 25 }
    : getHubEvidencePage(evidenceResponse)
  const needsGraphManifest = view === 'Intelligence Graph'
  const { currentData: graphManifestResponse, isFetching: graphManifestFetching, error: graphManifestError, refetch: refetchGraphManifest } = useGetRuntimeStateGraphManifestQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId },
    { skip: !canReadDetail || !needsGraphManifest },
  )
  const manifest = !graphManifestError ? getHubPayload(graphManifestResponse)?.manifest ?? getHubPayload(graphManifestResponse) : null
  const { currentData: graphResponse, isFetching: graphFetching, error: graphError, isUninitialized: graphUninitialized, refetch: refetchGraph } = useGetRuntimeStateGraphProjectionQuery(
    { runtimeInstanceId: revisionId, customerId, tenantId },
    { skip: !canReadDetail || view !== 'Intelligence Graph' || manifest?.status !== 'CURRENT' },
  )
  const graphLoading = Boolean(graphManifestFetching || graphFetching)
  const graph = !graphLoading && !graphError && manifest?.status === 'CURRENT' ? getHubPayload(graphResponse)?.graph ?? getHubPayload(graphResponse) : null
  const refreshGraph = async () => {
    const result = await refetchGraphManifest()
    const nextManifest = getHubPayload(result.data)?.manifest ?? getHubPayload(result.data)
    if (!result.error && !graphUninitialized && nextManifest?.status === 'CURRENT') refetchGraph()
  }
  const { currentData: graphCoverageResponse, isFetching: graphCoverageFetching, error: graphCoverageError, refetch: refetchGraphCoverage } = useGetRuntimeIntelligenceGraphCoverageQuery(
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
  const coverageRefreshing = rendererFetching || summaryEvidenceFetching || graphCoverageFetching
  const refreshCoverage = () => [refetchRenderer, refetchSummaryEvidence, refetchGraphCoverage].forEach(refetch => refetch())
  const contextPending = view === 'Context' && [[summaryEvidenceResponse, summaryEvidenceFetching], [acceptedEvidenceResponse, acceptedEvidenceFetching], [pendingEvidenceResponse, pendingEvidenceFetching]].some(([response, fetching]) => !response && fetching)
  const contextRefreshing = rendererFetching || summaryEvidenceFetching || acceptedEvidenceFetching || pendingEvidenceFetching
  const refreshContext = () => [refetchRenderer, refetchSummaryEvidence, refetchAcceptedEvidence, refetchPendingEvidence].forEach((refetch) => refetch())
  const sourcesRefreshing = rendererFetching || summaryEvidenceFetching || pendingEvidenceFetching || evidenceFetching
  const refreshSources = () => [refetchRenderer, refetchSummaryEvidence, refetchPendingEvidence, refetchEvidence].forEach((refetch) => refetch())
  const reviewRefreshing = sourcesRefreshing || acceptedEvidenceFetching
  const refreshReview = () => [refetchRenderer, refetchSummaryEvidence, refetchAcceptedEvidence, refetchPendingEvidence, refetchEvidence].forEach((refetch) => refetch())
  const readinessRefreshing = contextRefreshing || rejectedEvidenceFetching
  const refreshReadiness = () => [refetchRenderer, refetchSummaryEvidence, refetchAcceptedEvidence, refetchPendingEvidence, refetchRejectedEvidence].forEach((refetch) => refetch())
  const discovery = summaryEvidenceLoading || !summaryEvidencePage
    ? null
    : reconcileHubDiscovery(getHubDiscovery(renderer), summaryEvidencePage)
  const qualityHref = context.valid ? getHubDestinationHref('quality', workspaceId, revisionId) : ''
  const evidenceReadinessRefreshing = rendererFetching || summaryEvidenceFetching || qualityFetching
  const refreshEvidenceReadiness = () => [refetchRenderer, refetchSummaryEvidence, refetchQuality].forEach(refetch => refetch())
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
    if (nextView === 'Intelligence Quality') {
      navigate(qualityHref)
      return
    }
    if (quality) {
      navigate(`/app/intelligence?${getHubContextSearch(workspaceId, revisionId, nextView)}`)
      return
    }
    if (nextView === 'Review' && nextReviewFilter) setReviewFilter(nextReviewFilter)
    setSearchParams(`?${getHubContextSearch(workspaceId, revisionId, nextView)}`, { replace: true })
  }
  const selectReviewFilter = (nextFilter) => {
    setReviewFilter(nextFilter)
    setEvidencePageNumber(1)
  }
  const openReviewSource = (sourceId) => {
    setInfo(null)
    setSourceFocus({ contextKey, page: evidencePageNumber, sourceId })
    setSearchParams(`?${getHubContextSearch(workspaceId, revisionId, 'Sources')}`, { replace: true })
  }
  const openCoverageSources = domain => {
    setEvidencePageNumber(1)
    setSourceFocus(previous => ({ contextKey, page: 1, sourceId: '', search: domain, requestId: (previous?.requestId || 0) + 1 }))
    selectView('Sources')
  }
  const helpHref = `/help?context=${encodeURIComponent(`Intelligence Hub · ${view}`)}#context-help`
  const headingSourceCount = displayHubCount(getHubCount(discovery?.sourceRegistrySummary, 'count'))
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
            : `${headingSourceCount} acquired sources · ${headingEvidenceCount} evidence objects`}</span>
        </div>
        <nav className="intelligence-hub__overview-controls" aria-label="Intelligence Hub actions">
          <Button className="intelligence-hub__overview-refresh" size="sm" variant="outline" disabled={overviewRefreshing} aria-busy={Boolean(overviewRefreshing)} onClick={refreshOverview}>↻ Refresh</Button>
          <Link to={workbenchHref} variant="subtle" underline="none" className="btn btn--primary intelligence-hub__overview-add-evidence"
            title="Opens Evidence Workbench; evidence is not added in the Intelligence Hub.">＋ Add Evidence</Link>
        </nav>
      </div> : <div className="intelligence-hub__heading-actions">
        {!evidenceReadiness && view !== 'Context' && view !== 'After lock' && view !== 'Coverage' && view !== 'Intelligence Graph' && !quality ? <span>Last updated <strong>{readableDate(renderer.runtimeInstance.updatedAt)}</strong></span> : null}
        <Button size="sm" variant="outline" disabled={evidenceReadiness ? evidenceReadinessRefreshing : quality ? rendererFetching || qualityFetching : view === 'Context' ? contextRefreshing : view === 'Sources' ? sourcesRefreshing : view === 'Review' ? reviewRefreshing : view === 'Readiness & publish' ? readinessRefreshing : view === 'Coverage' ? coverageRefreshing : view === 'Intelligence Graph' ? graphLoading : view === 'After lock' && rendererFetching} aria-busy={Boolean(evidenceReadiness ? evidenceReadinessRefreshing : quality ? rendererFetching || qualityFetching : view === 'Context' ? contextRefreshing : view === 'Sources' ? sourcesRefreshing : view === 'Review' ? reviewRefreshing : view === 'Readiness & publish' ? readinessRefreshing : view === 'Coverage' ? coverageRefreshing : view === 'Intelligence Graph' ? graphLoading : view === 'After lock' && rendererFetching)} onClick={evidenceReadiness ? refreshEvidenceReadiness : quality ? () => { refetchRenderer(); refetchQuality() } : view === 'Context' ? refreshContext : view === 'Sources' ? refreshSources : view === 'Review' ? refreshReview : view === 'Readiness & publish' ? refreshReadiness : view === 'Coverage' ? refreshCoverage : view === 'Intelligence Graph' ? refreshGraph : refetchRenderer}>↻ Refresh</Button>
        {view === 'After lock' ? <Button size="sm" className="intelligence-hub__lock-discovery" onClick={event => openInfo(discoveryIntakeInfo(renderer), event.currentTarget)}>＋ Start discovery</Button> : null}
        {view === 'Coverage' ? <Link to={workbenchHref} variant="subtle" underline="none" className="btn btn--primary intelligence-hub__coverage-acquire" title="Opens Evidence Workbench; evidence is not added here.">＋ Add Evidence</Link> : null}
        {view === 'Intelligence Graph' || quality || evidenceReadiness ? <Link to={workbenchHref} variant="subtle" underline="none" className="btn btn--primary intelligence-graph__technical" title="Navigation to Evidence Workbench; evidence is not added here.">＋ Add Evidence</Link> : null}
      </div> : null}
    </header>
    {!requiredContext ? <Status variant="warning">Open Intelligence Hub from a selected Execution Workspace revision.</Status>
      : rendererLoading || (!renderer && rendererFetching) ? <p role="status">Loading selected revision…</p>
        : rendererError || !context.valid ? <Status variant="warning">{rendererError ? 'The selected revision could not be loaded.' : context.reason}</Status>
          : <>
            {view === 'Overview' ? overviewPending ? null : <OverviewMetrics renderer={renderer} discovery={discovery} onOpen={openInfo} onSelectView={selectView} qualityHref={qualityHref} /> : null}
            <TabView activeTab={viewIndex} onTabChange={(index) => selectView(index === HUB_VIEWS.length ? 'Intelligence Quality' : HUB_VIEWS[index])} aria-label="Intelligence Hub views" className="intelligence-hub__tabs">
            <TabView.Tab label="Overview"><Overview renderer={renderer} discovery={discovery} graphCoverage={graphCoverage} evidenceStatusCounts={evidenceStatusCounts} isLoading={overviewPending} onOpen={openInfo} qualityHref={qualityHref} onSelectView={selectView} /></TabView.Tab>
            <TabView.Tab label="Context"><ContextView key={contextKey} discovery={reconcileHubDiscovery(getHubDiscovery(renderer), summaryEvidencePage)} evidenceStatusCounts={evidenceStatusCounts} isLoading={contextPending} onOpen={openInfo} onSelectView={selectView} workbenchHref={workbenchHref} /></TabView.Tab>
            <TabView.Tab label="Sources"><SourcesView key={`${contextKey}:${evidencePageNumber}:${preferredSourceId}:${preferredSourceSearch}:${sourceSearchRequest}`} initialSearch={preferredSourceSearch} preferredSourceId={preferredSourceId} discovery={discovery} evidencePage={evidencePage} isLoading={evidenceLoading || evidenceFetching} error={evidenceError} pendingCount={evidenceStatusCounts.pending} countsLoading={summaryEvidenceFetching || pendingEvidenceFetching} onOpen={openInfo} onSelectView={selectView} page={evidencePageNumber} setPage={setEvidencePageNumber} /></TabView.Tab>
            <TabView.Tab label="Review"><ReviewView key={contextKey} evidencePage={evidencePage} isLoading={evidenceLoading || evidenceFetching} error={emptyFilteredPage ? null : evidenceError} evidenceStatusCounts={evidenceStatusCounts} countsLoading={summaryEvidenceFetching || acceptedEvidenceFetching || pendingEvidenceFetching} onOpenSource={openReviewSource} onSelectView={selectView} page={evidencePageNumber} setPage={setEvidencePageNumber} filter={reviewFilter} onFilterChange={selectReviewFilter} /></TabView.Tab>
            <TabView.Tab label="Evidence readiness">{evidenceReadiness ? <EvidenceReadinessView key={contextKey} renderer={renderer} evidenceResponse={summaryEvidenceResponse} evidenceError={summaryEvidenceError} evidenceLoading={summaryEvidenceLoading || summaryEvidenceFetching} candidateResponse={qualityResponse} candidateError={qualityError} candidateLoading={qualityLoading || qualityFetching} workbenchHref={workbenchHref} workspaceHref={getHubReturnHref(revisionId)} onSelectView={selectView} /> : null}</TabView.Tab>
            <TabView.Tab label="Readiness & publish"><ReadinessView key={contextKey} renderer={renderer} discovery={discovery} evidenceTotal={summaryEvidencePage?.totalCapped ? null : getHubCount(summaryEvidencePage, 'total')} evidenceStatusCounts={evidenceStatusCounts} countsLoading={summaryEvidenceFetching || acceptedEvidenceFetching || pendingEvidenceFetching || rejectedEvidenceFetching} onOpen={openInfo} onSelectView={selectView} qualityHref={qualityHref} /></TabView.Tab>
            <TabView.Tab label="After lock"><AfterLockView renderer={renderer} onOpen={openInfo} onSelectView={selectView} /></TabView.Tab>
            <TabView.Tab label="Coverage"><CoverageView key={contextKey} discovery={getHubDiscovery(renderer)} graphCoverage={graphCoverage} isLoading={graphCoverageFetching} error={graphCoverageError} qualityHref={qualityHref} workbenchHref={workbenchHref} onSelectView={selectView} onOpenSources={openCoverageSources} /></TabView.Tab>
            <TabView.Tab label="Intelligence Graph"><GraphView key={contextKey} manifest={manifest} graph={graph} isLoading={graphLoading} error={graphManifestError || graphError} workspaceName={renderer.runtimeInstance.name || 'Workspace'} revisionLabel={renderer.revision.revisionNumber ? `R${renderer.revision.revisionNumber}` : 'Selected revision'} qualityHref={qualityHref} workbenchHref={workbenchHref} onSelectView={selectView} onOpenSources={openCoverageSources} /></TabView.Tab>
            <TabView.Tab label="Intelligence Quality"><QualityView key={contextKey} discovery={getHubDiscovery(renderer)} response={qualityResponse} error={qualityError} isLoading={qualityLoading || qualityFetching} locked={renderer.lock?.locked === true} onSelectView={selectView} /></TabView.Tab>
            </TabView>
          </>}
    <Dialog open={Boolean(visibleInfo)} onClose={closeInfo} size={visibleInfo?.kind === 'assurance-report' ? 'xl' : ['after-lock', 'discovery-intake'].includes(visibleInfo?.kind) ? 'lg' : 'md'} className={visibleInfo?.kind === 'assurance-report' ? 'intelligence-hub__report-dialog' : visibleInfo?.kind === 'after-lock' ? 'intelligence-hub__lock-dialog' : visibleInfo?.kind === 'discovery-intake' ? 'intelligence-hub__lock-dialog intelligence-hub__intake-dialog' : ''} showCloseButton={!['assurance-report', 'after-lock', 'discovery-intake'].includes(visibleInfo?.kind)} aria-label={visibleInfo?.kind === 'assurance-report' ? 'Intelligence assurance report' : visibleInfo?.kind === 'after-lock' ? 'Why new evidence is reviewed separately' : visibleInfo?.kind === 'discovery-intake' ? 'Add evidence for review' : undefined}>
      <Dialog.Header>{['after-lock', 'discovery-intake'].includes(visibleInfo?.kind) ? <><div><p className="intelligence-hub__eyebrow">{visibleInfo?.kind === 'discovery-intake' ? 'New evidence after lock' : 'About After lock'}</p><h2>{visibleInfo.title}</h2><p>{visibleInfo.subtitle}</p></div><Button size="sm" variant="outline" aria-label={visibleInfo?.kind === 'discovery-intake' ? 'Close evidence intake' : 'Close explanation'} onClick={closeInfo}>Close ×</Button></> : visibleInfo?.kind === 'assurance-report' ? <><div><p className="intelligence-hub__report-eyebrow">Assurance export preview</p><h2>{visibleInfo.title}</h2><p>{visibleInfo.subtitle}</p></div><Button size="sm" variant="outline" aria-label="Close report" onClick={closeInfo}>Close ×</Button></> : <h2>{visibleInfo?.title || 'Information'}</h2>}</Dialog.Header>
      <Dialog.Body key={visibleInfo?.kind || 'information'} role={['assurance-report', 'after-lock', 'discovery-intake'].includes(visibleInfo?.kind) ? 'region' : undefined} aria-label={visibleInfo?.kind === 'assurance-report' ? 'Assurance report content' : visibleInfo?.kind === 'after-lock' ? 'After lock explanation content' : visibleInfo?.kind === 'discovery-intake' ? 'Evidence intake content' : undefined} tabIndex={['assurance-report', 'after-lock', 'discovery-intake'].includes(visibleInfo?.kind) ? 0 : undefined}>{visibleInfo?.body}</Dialog.Body>
      <Dialog.Footer>{visibleInfo?.kind === 'discovery-intake' ? <><Button variant="outline" size="sm" onClick={closeInfo}>Cancel</Button><Button size="sm" disabled>Add to discovery →</Button></> : visibleInfo?.kind === 'after-lock' ? <><Button variant="outline" size="sm" onClick={closeInfo}>Return to evidence</Button><Button size="sm" onClick={() => { closeInfo(); selectView('Readiness & publish') }}>View readiness and publication →</Button></> : visibleInfo?.kind === 'assurance-report' ? <><span>Read-only preview · governed exports are unavailable</span><div><Button variant="outline" size="sm" onClick={closeInfo}>Close</Button><Button variant="outline" size="sm" disabled>Download data CSV</Button><Button size="sm" disabled>Export PDF</Button></div></> : <Button variant="outline" size="sm" onClick={closeInfo}>Back to {view}</Button>}</Dialog.Footer>
    </Dialog>
  </main>
}
