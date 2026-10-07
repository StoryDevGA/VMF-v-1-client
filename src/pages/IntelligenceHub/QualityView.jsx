import { useEffect, useRef, useState } from 'react'
import { MdSearch, MdSwapHoriz } from 'react-icons/md'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { displayHubToken } from './intelligenceHubModel.js'
import { filterQualityCandidates, qualityDefaultPopulation, QUALITY_POPULATIONS, QUALITY_TYPES, readQualityCandidates, text, hasQualityControlCharacters } from './intelligenceQualityModel.js'
import './QualityView.css'
import DiscoveryHealthDetails from './DiscoveryHealthDetails.jsx'
import ContradictionHistoryInspector from './ContradictionHistoryInspector.jsx'

const ACTIONS = [['NOT_CONTRADICTORY', 'Not contradictory'], ['CONFIRMED', 'Confirm contradiction'], ['REOPENED', 'Reopen for review']]
const REVIEW_TONES = { UNREVIEWED: 'warning', NOT_CONTRADICTORY: 'success', CONFIRMED: 'danger', REOPENED: 'warning', STALE: 'neutral' }
const unavailable = value => text(value) || 'Unavailable'

function DetailSection({ title, children, className = '' }) {
  return <section className={`intelligence-quality__section ${className}`}><h4>{title}</h4>{children}</section>
}

function FindingDetail({ candidate, onOpenSource, onOpenGraph, canOpenGraph, onExplain, locked, preview, actions, historyScope }) {
  const [disposition, setDisposition] = useState('')
  const [rationale, setRationale] = useState('')
  const canResolve = !locked && !preview && actions?.canReviewFinding
    && (!actions.canReviewCandidate || actions.canReviewCandidate(candidate))
    && /^sha256:[a-f0-9]{64}$/.test(candidate.evidencePairHash || '')
  const review = candidate.latestReview
  return <>
    <header className="intelligence-quality__detail-header">
      <div><span>{candidate.id}</span><Badge variant="neutral" size="sm">Priority unavailable</Badge><Badge variant={REVIEW_TONES[candidate.status] || 'neutral'} size="sm">{displayHubToken(candidate.status)}</Badge></div>
      <h3>{candidate.domain ? `${displayHubToken(candidate.domain)} contradiction candidate` : 'Contradiction candidate'}</h3>
      <p>Contradiction · {displayHubToken(candidate.domain)} domain · Updated time unavailable</p>
    </header>
    <div className="intelligence-quality__detail-body">
      <div className="intelligence-quality__pair">
        <DetailSection title="What was detected"><p>Evidence in this domain was flagged for contradiction review.</p><small>Recorded severity: {displayHubToken(candidate.severity)} · not a governed priority</small></DetailSection>
        <DetailSection title="Why it was detected"><p>{unavailable(candidate.basis)}</p><small>Analysis version unavailable</small></DetailSection>
      </div>
      <section className="intelligence-quality__confidence" aria-label="Confidence distinction">
        <div><h4>Detection confidence</h4><strong>Unavailable</strong><p>Confidence that this quality issue was identified correctly.</p></div><i aria-hidden="true">≠</i>
        <div><h4>Affected intelligence confidence</h4><strong>Unavailable</strong><p>Current confidence in the business intelligence itself.</p></div>
      </section>
      <DetailSection title="Conflicting evidence and lineage">
        {candidate.evidence.length ? <div className="intelligence-quality__pair">{candidate.evidence.map((item, index) => <article className="intelligence-quality__evidence" key={item.evidenceObjectId}>
          <header><strong>Evidence {index === 0 ? 'A' : 'B'}</strong><span>{displayHubToken(item.reviewStatus)}</span></header>
          <p>{text(item.extractedFact) ? `“${item.extractedFact}”` : 'Evidence text unavailable'}</p>
          <small>↳ {displayHubToken(item.sourceType)} · {text(item.lineageRef) || 'Lineage unavailable'}</small>
          <Button size="sm" variant="ghost" className="intelligence-quality__text-action" disabled={!onOpenSource || preview || !text(item.sourceId) || text(item.sourceId).length > 240 || !text(item.evidenceObjectId) || text(item.evidenceObjectId).length > 240} onClick={() => onOpenSource(candidate.id, text(item.sourceId), text(item.evidenceObjectId))}>Open evidence {index === 0 ? 'A' : 'B'} in Sources →</Button>
          <Button size="sm" variant="ghost" className="intelligence-quality__text-action intelligence-quality__graph-action" disabled={preview || !onOpenGraph || !canOpenGraph?.(candidate.id, item.evidenceObjectId)} onClick={() => onOpenGraph(candidate.id, item.evidenceObjectId)}>Inspect evidence {index === 0 ? 'A' : 'B'} in Graph →</Button>
        </article>)}</div> : <p>{preview ? 'Evidence comparison requires update permission.' : 'No evidence pair is projected for this candidate.'}</p>}
      </DetailSection>
      <DetailSection title="Likely consequence"><p>Downstream impact and affected outputs are not supplied by this read.</p></DetailSection>
      <aside className="intelligence-quality__advisor"><i aria-hidden="true">A</i><div><h4>Advisor recommendation</h4><p>No recorded recommendation is supplied for this candidate.</p><small>Recommendation only · An authorised person must choose and confirm any governed action.</small><Button size="sm" variant="ghost" className="intelligence-quality__text-action" onClick={onExplain}>Recommendation availability</Button></div></aside>
      <DetailSection title="Governed resolution" className="intelligence-quality__resolution">
        <p>{locked ? 'This revision is locked. Governed resolution is unavailable here.' : canResolve ? 'Record a human disposition against this exact evidence pair. Evidence acceptance is separate.' : 'Resolution is unavailable until current review authority and evidence basis are verified. Refresh to inspect the current state.'}</p>
        <div className="intelligence-quality__actions" role="group" aria-label="Contradiction disposition">{ACTIONS.map(([value, label]) => <Button key={value} size="sm" variant="outline" disabled={!canResolve} aria-pressed={disposition === value} onClick={() => setDisposition(value)}>{label}</Button>)}</div>
        <Textarea aria-label="Resolution rationale" placeholder="Required rationale: explain the evidence, authority and intended effect of this decision…" disabled={!canResolve} maxLength={2000} value={rationale} onChange={event => setRationale(event.target.value)} />
        <footer><small>A current confirmed contradiction completes its decision and can still block readiness. Reopening requires review again.</small><Button size="sm" disabled={!canResolve || !disposition || rationale.trim().length < 10 || rationale.trim().length > 2000} onClick={async () => {
          if (await actions.decideFinding(candidate, disposition, rationale)) { setDisposition(''); setRationale('') }
        }}>Confirm governed action</Button></footer>
      </DetailSection>
      <DetailSection title="Audit history"><ContradictionHistoryInspector key={JSON.stringify([historyScope?.runtimeInstanceId, historyScope?.customerId, historyScope?.tenantId, historyScope?.sessionRevision, historyScope?.stateVersion, candidate.id])} scope={historyScope} findingId={candidate.id} disabled={preview || !historyScope} />
        {review ? <div className="intelligence-quality__review"><strong>Latest recorded review · {displayHubToken(review.disposition)}</strong><p>{unavailable(review.rationale)}</p><small>{unavailable(review.reviewedAt)} · {candidate.status === 'STALE' ? 'Stale review; not a current decision' : 'Latest review only; not complete history'}</small></div> : <p>No latest review is supplied for this candidate.</p>}
        <small>Complete finding history is not available from this read.</small>
      </DetailSection>
    </div>
  </>
}

export default function QualityView({ discovery, discoveryHealth, discoveryHealthLoading, response, error, isLoading, locked, onSelectView, onOpenSource, onOpenGraph, canOpenGraph, actions, findingId = '', onSelectFinding, returnView = 'Intelligence Graph', inspection, onInspectionChange, historyScope, storedRead, storedLoading, storedError, storedPopulation }) {
  const [localInspection, setLocalInspection] = useState({ type: 'All', search: '', population: null })
  const { type, search, population: populationOverride } = inspection || localInspection
  const changeInspection = patch => onInspectionChange ? onInspectionChange(patch) : setLocalInspection(current => ({ ...current, ...patch }))
  const [selectedId, setSelectedId] = useState('')
  const [explanation, setExplanation] = useState(false)
  const opener = useRef(null)
  const decisionFeedbackRef = useRef(null)
  const focusedActions = actions ? { ...actions, decideFinding: (...args) => {
    decisionFeedbackRef.current?.focus()
    return actions.decideFinding(...args)
  } } : null
  const stored = storedRead !== undefined
  const busy = stored ? storedLoading : isLoading
  const [draftSearch, setDraftSearch] = useState(search)
  useEffect(() => { setDraftSearch(search) }, [search])
  const listRegion = useRef(null)
  const { candidates, message, preview } = stored ? { candidates: storedRead?.available ? storedRead.candidates : null, preview: false,
    message: busy ? 'Loading stored findings…' : storedRead?.available ? '' : storedRead?.reason
      ? `Stored finding inspection unavailable: ${displayHubToken(storedRead.reason)}. Refresh or select a supported finding type.`
      : 'Stored findings could not be verified for this scope. Refresh to retry.' } : readQualityCandidates({ response, error, isLoading, discovery })
  const linkedCandidate = candidates?.find(item => item.id === findingId)
  const population = stored ? storedPopulation : preview ? 'Detected candidates' : populationOverride || qualityDefaultPopulation(linkedCandidate)
  const filtered = stored ? candidates || [] : filterQualityCandidates(candidates, type, search, population)
  const selected = findingId ? filtered.find(item => item.id === findingId) || null
    : filtered.find(item => item.id === selectedId) || filtered[0] || null
  if (explanation && !selected) setExplanation(false)
  const chooseType = next => { changeInspection({ type: next }); setSelectedId(''); setExplanation(false) }
  const close = () => { setExplanation(false); opener.current?.focus() }
  const count = busy ? 'Loading…' : stored ? storedRead?.available ? storedRead.populations.detected.toLocaleString() : 'Unavailable' : candidates ? candidates.length.toLocaleString() : 'Unavailable'
  const unsupportedType = type !== 'All' && type !== 'Contradiction'
  return <section className={`intelligence-quality intelligence-hub__sources-workspace${stored ? ' intelligence-quality--stored' : ''}`} aria-label="Intelligence Improvement Queue">
    <header className="intelligence-quality__toolbar">
      <div><p className="intelligence-hub__eyebrow">Improve · Intelligence</p><h2>Intelligence Improvement Queue</h2><p>Understand what needs attention, why it matters and which governed action can improve this workspace.</p></div>
      <article className="intelligence-quality__readiness"><header><span>Discovery readiness</span></header><DiscoveryHealthDetails model={discoveryHealth} loading={discoveryHealthLoading} /><div><span>Workspace use <b>Unavailable</b></span><span>Outputs <b>Unavailable</b></span></div></article>
      <Button size="sm" disabled title="Downstream priority is not provided by the available API.">Start highest priority →</Button>
    </header>
    <div className="intelligence-quality__metrics" aria-label="Quality summary">
      {['Open findings', ...QUALITY_TYPES.slice(1)].map((label, index) => <Button key={label} size="sm" variant="outline" className={`intelligence-quality__metric intelligence-quality__metric--${index}`} disabled={busy || index === 0 && preview} aria-pressed={type === (index === 0 ? 'All' : label) && (index !== 0 || population === 'Open decisions')} onClick={() => { changeInspection(index === 0 ? { type: 'All', population: 'Open decisions' } : { type: label }); setSelectedId(''); setExplanation(false) }}>
        <strong aria-label={index === 1 ? count : 'Unavailable'} title={index === 1 ? count : 'Unavailable'}>{index === 1 ? count === 'Unavailable' ? '—' : count : '—'}</strong><span>{label === 'Contradiction' ? 'Contradictions' : label}<small>{index === 1 ? stored ? 'Stored detections · producer limit 8' : 'Returned candidates · up to 8' : index === 0 ? 'Complete findings read unavailable' : 'Finding read unavailable'}</small></span>
      </Button>)}
    </div>
    <div className="intelligence-quality__filterbar">
      <Input size="sm" aria-label="Search quality findings" placeholder={stored ? 'Search findings and supporting evidence…' : 'Search finding, domain or ID…'} leftIcon={<MdSearch />} value={stored ? draftSearch : search} maxLength={240} disabled={busy} onChange={event => stored ? setDraftSearch(event.target.value) : changeInspection({ search: event.target.value })} />
      {stored ? <Button size="sm" variant="outline" disabled={busy || hasQualityControlCharacters(draftSearch)} onClick={() => changeInspection({ search: draftSearch.trim() })}>Search findings</Button> : null}
      <div role="group" aria-label="Finding type filter">{QUALITY_TYPES.map(label => <Button key={label} size="sm" variant="ghost" disabled={busy} aria-pressed={type === label} onClick={() => chooseType(label)}>{label}</Button>)}</div>
      <div>
        <Select size="sm" aria-label="Finding population" disabled={preview || busy} value={population} options={QUALITY_POPULATIONS.map(value => ({ value, label: value }))} onChange={event => { changeInspection({ population: event.target.value }); setSelectedId(''); setExplanation(false) }} />
        {stored ? <Select size="sm" aria-label="Finding order" disabled={busy} value={inspection.sort} options={[{ value: 'ID_ASC', label: 'Finding ID ascending' }, { value: 'ID_DESC', label: 'Finding ID descending' }]} onChange={event => changeInspection({ sort: event.target.value })} /> : null}
        <Select size="sm" aria-label="Filter by priority" disabled value="All" options={['All', 'High', 'Medium', 'Low'].map(value => ({ value, label: value }))} onChange={() => {}} />
      </div>
      <span>{candidates ? `${filtered.length} shown${stored ? ` of ${storedRead.total} matching stored detections` : ''}` : 'Count unavailable'} · Priority unavailable</span>
    </div>
    {message ? <p role={storedError || error && error.status !== 403 ? 'alert' : 'status'} className="intelligence-quality__notice">{message}</p> : null}
    {inspection?.invalid ? <p role="status" className="intelligence-quality__notice">The linked Quality filters are invalid. Default inspection is shown; choose valid filters to recover.</p> : null}
    <p className="intelligence-quality__notice">{preview ? 'Current decision status is unavailable in this preview.' : 'Open decisions need review or reassessment. Current Not Contradictory and Confirmed dispositions complete their decisions; a confirmed contradiction can still affect readiness. Unknown decision states remain in Detected candidates.'} {stored ? 'Search covers all persisted detections and their supporting evidence before pagination. The detector stores at most eight candidates; this does not establish complete revision coverage or a complete four-type register. Detected, open and recorded populations overlap. Recorded includes reopened and stale reviews.' : 'All populations and search cover only the returned candidates, not the complete revision. Recorded dispositions expose latest reviews only.'}</p>
    <p ref={decisionFeedbackRef} tabIndex={-1} role={actions?.feedback?.error ? 'alert' : 'status'} aria-label="Quality decision status">{actions?.feedback?.message}</p>
    <div className="intelligence-quality__browser">
      <Card variant="outlined" className="intelligence-quality__queue"><Card.Header><span>{population}</span><strong>{candidates ? `${filtered.length} candidates shown` : 'Candidates unavailable'}</strong><small>{stored ? 'Stable finding ID order · Stored detections' : 'Returned order · Current read only'}</small></Card.Header><Card.Body><div ref={listRegion} role="region" aria-label="Finding results" tabIndex={-1}>
        {filtered.map(item => <Button key={item.id} size="sm" variant="outline" className="intelligence-quality__finding" aria-pressed={selected?.id === item.id} onClick={() => { setSelectedId(item.id); onSelectFinding?.(item.id); setExplanation(false) }}><MdSwapHoriz aria-hidden="true" /><span><small>{item.id} · Contradiction</small><strong>{item.domain ? `${displayHubToken(item.domain)} contradiction candidate` : 'Contradiction candidate'}</strong><em>{displayHubToken(item.domain)} · {displayHubToken(item.status)}</em></span></Button>)}
        {findingId && candidates && !selected ? <p>{linkedCandidate ? 'The exact linked finding is outside the selected population or filters. Change the filters to inspect it. No other finding is substituted.' : 'The exact linked finding is unavailable in this read. No other finding is substituted.'}</p> : null}
        {!filtered.length ? <p>{busy ? 'Loading candidates…' : unsupportedType ? `${type} findings are not supplied by the available API.` : !candidates ? 'Candidate queue unavailable.' : search ? 'No candidates match this search.' : population === 'Open decisions' ? 'No open decisions in the returned candidates. This does not prove whole-revision completion.' : population === 'Recorded dispositions' ? 'No recorded dispositions in the returned candidates.' : 'No contradiction candidates returned for this revision.'}</p> : null}
        </div>{stored ? <div className="intelligence-quality__pagination" role="group" aria-label="Finding pagination"><Button size="sm" variant="outline" disabled={busy || !storedRead?.available || inspection.page <= 1} onClick={() => { listRegion.current?.focus(); changeInspection({ page: inspection.page - 1 }) }}>Previous findings</Button><span>Page {inspection.page}{storedRead?.available ? ` of ${storedRead.totalPages}` : ''}</span><Button size="sm" variant="outline" disabled={busy || !storedRead?.available || inspection.page >= storedRead.totalPages} onClick={() => { listRegion.current?.focus(); changeInspection({ page: inspection.page + 1 }) }}>Next findings</Button></div> : null}
      </Card.Body></Card>
      <Card variant="outlined" className="intelligence-quality__detail" aria-label="Selected quality candidate">
        {selected ? <FindingDetail key={`${selected.id}:${selected.evidencePairHash}`} candidate={selected} preview={preview} locked={locked} actions={focusedActions} historyScope={historyScope} onOpenSource={onOpenSource} onOpenGraph={onOpenGraph} canOpenGraph={canOpenGraph} onExplain={event => { opener.current = event.currentTarget; setExplanation(true) }} /> : <Card.Body><h3>{unsupportedType ? `${type} unavailable` : 'Selected finding'}</h3><p>{isLoading ? 'Loading selected revision candidates…' : 'Select an available candidate to inspect its detection basis and supporting evidence.'}</p></Card.Body>}
      </Card>
    </div>
    <footer className="intelligence-quality__footer"><Button variant="ghost" size="sm" onClick={() => onSelectView(returnView)}>← {returnView}</Button><span>Human dispositions use the governed review service. Complete finding coverage remains unavailable.</span><Button variant="ghost" size="sm" onClick={() => onSelectView('Overview')}>Return to Intelligence overview →</Button></footer>
    <Dialog open={Boolean(explanation && selected)} onClose={close} size="lg" className="intelligence-quality__dialog" aria-label="Advisor recommendation explanation">
      <Dialog.Header><h2>Recommendation availability</h2></Dialog.Header><Dialog.Body><p>{selected?.id} · {displayHubToken(selected?.domain)}</p><DetailSection title="State considered"><p>{selected?.basis || 'Unavailable'}</p></DetailSection><DetailSection title="Downstream impact"><p>The available read does not provide finding-specific downstream impact.</p></DetailSection><DetailSection title="Recommended legal action"><p>No recorded Advisor recommendation or connected governed action is available in this view.</p></DetailSection></Dialog.Body><Dialog.Footer><small>Recommendation only · Human authority is required.</small><Button size="sm" variant="outline" onClick={close}>Close</Button></Dialog.Footer>
    </Dialog>
  </section>
}
