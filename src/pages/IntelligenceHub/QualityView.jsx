import { useRef, useState } from 'react'
import { MdSearch, MdSwapHoriz } from 'react-icons/md'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { displayHubToken } from './intelligenceHubModel.js'
import { filterQualityCandidates, QUALITY_TYPES, readQualityCandidates, text } from './intelligenceQualityModel.js'
import './QualityView.css'

const ACTIONS = ['Select supported position', 'Record context distinction', 'Request more evidence', 'Defer finding', 'Dismiss with rationale']
const REVIEW_TONES = { UNREVIEWED: 'warning', NOT_CONTRADICTORY: 'success', CONFIRMED: 'danger', REOPENED: 'warning', STALE: 'neutral' }
const unavailable = value => text(value) || 'Unavailable'

function DetailSection({ title, children, className = '' }) {
  return <section className={`intelligence-quality__section ${className}`}><h4>{title}</h4>{children}</section>
}

function FindingDetail({ candidate, onSelectView, onExplain, locked, preview }) {
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
        <Button size="sm" variant="ghost" className="intelligence-quality__text-action" onClick={() => onSelectView('Intelligence Graph')}>View in Intelligence Graph →</Button>
        {candidate.evidence.length ? <div className="intelligence-quality__pair">{candidate.evidence.map((item, index) => <article className="intelligence-quality__evidence" key={item.evidenceObjectId}>
          <header><strong>Evidence {index === 0 ? 'A' : 'B'}</strong><span>{displayHubToken(item.reviewStatus)}</span></header>
          <p>{text(item.extractedFact) ? `“${item.extractedFact}”` : 'Evidence text unavailable'}</p>
          <small>↳ {displayHubToken(item.sourceType)} · {text(item.lineageRef) || 'Lineage unavailable'}</small>
        </article>)}</div> : <p>{preview ? 'Evidence comparison requires update permission.' : 'No evidence pair is projected for this candidate.'}</p>}
      </DetailSection>
      <DetailSection title="Likely consequence"><p>Downstream impact and affected outputs are not supplied by this read.</p></DetailSection>
      <aside className="intelligence-quality__advisor"><i aria-hidden="true">A</i><div><h4>Advisor recommendation</h4><p>No recorded recommendation is supplied for this candidate.</p><small>Recommendation only · An authorised person must choose and confirm any governed action.</small><Button size="sm" variant="ghost" className="intelligence-quality__text-action" onClick={onExplain}>Recommendation availability</Button></div></aside>
      <DetailSection title="Governed resolution" className="intelligence-quality__resolution">
        <p>{locked ? 'This revision is locked. Governed resolution is unavailable here.' : 'Governed resolution is not delivered in this UI slice.'}</p>
        <div className="intelligence-quality__actions">{ACTIONS.map(action => <Button key={action} size="sm" variant="outline" disabled>○ {action}</Button>)}</div>
        <Textarea aria-label="Resolution rationale" placeholder="Required rationale: explain the evidence, authority and intended effect of this decision…" disabled />
        <footer><small>Actions require a connected governance workflow and human authority.</small><Button size="sm" disabled>Confirm governed action</Button></footer>
      </DetailSection>
      <DetailSection title="Audit history"><Button size="sm" variant="ghost" className="intelligence-quality__text-action" disabled>View complete history</Button>
        {review ? <div className="intelligence-quality__review"><strong>Latest recorded review · {displayHubToken(review.disposition)}</strong><p>{unavailable(review.rationale)}</p><small>{unavailable(review.reviewedAt)} · {candidate.status === 'STALE' ? 'Stale review; not a current decision' : 'Latest review only; not complete history'}</small></div> : <p>No latest review is supplied for this candidate.</p>}
        <small>Complete finding history is not available from this read.</small>
      </DetailSection>
    </div>
  </>
}

export default function QualityView({ discovery, response, error, isLoading, locked, onSelectView }) {
  const [type, setType] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [explanation, setExplanation] = useState(false)
  const opener = useRef(null)
  const { candidates, message, preview } = readQualityCandidates({ response, error, isLoading, discovery })
  const filtered = filterQualityCandidates(candidates, type, search)
  const selected = filtered.find(item => item.id === selectedId) || filtered[0] || null
  if (explanation && !selected) setExplanation(false)
  const health = discovery?.discoveryHealth
  const chooseType = next => { setType(next); setSelectedId(''); setExplanation(false) }
  const close = () => { setExplanation(false); opener.current?.focus() }
  const count = isLoading ? 'Loading…' : candidates ? candidates.length.toLocaleString() : 'Unavailable'
  const unsupportedType = type !== 'All' && type !== 'Contradiction'
  return <section className="intelligence-quality intelligence-hub__sources-workspace" aria-label="Intelligence Improvement Queue">
    <header className="intelligence-quality__toolbar">
      <div><p className="intelligence-hub__eyebrow">Improve · Intelligence</p><h2>Intelligence Improvement Queue</h2><p>Understand what needs attention, why it matters and which governed action can improve this workspace.</p></div>
      <article className="intelligence-quality__readiness"><header><span>Discovery readiness</span><strong>{displayHubToken(health?.readiness?.state)}</strong></header><div><span>Workspace use <b>Unavailable</b></span><span>Outputs <b>Unavailable</b></span></div><p>{health?.readiness?.state ? [...(health.readiness.blockerReasons || []), ...(health.readiness.warningReasons || [])].map(displayHubToken).join(' · ') || 'Workspace and output-use assessments are not supplied by this read.' : 'Discovery readiness is not projected for this revision.'}</p></article>
      <Button size="sm" disabled title="Downstream priority is not provided by the available API.">Start highest priority →</Button>
    </header>
    <div className="intelligence-quality__metrics" aria-label="Quality summary">
      {['Open findings', ...QUALITY_TYPES.slice(1)].map((label, index) => <Button key={label} size="sm" variant="outline" className={`intelligence-quality__metric intelligence-quality__metric--${index}`} aria-pressed={type === (index === 0 ? 'All' : label)} onClick={() => chooseType(index === 0 ? 'All' : label)}>
        <strong aria-label={index === 1 ? count : 'Unavailable'} title={index === 1 ? count : 'Unavailable'}>{index === 1 ? count === 'Unavailable' ? '—' : count : '—'}</strong><span>{label === 'Contradiction' ? 'Contradictions' : label}<small>{index === 1 ? 'Returned candidates · up to 8' : index === 0 ? 'Complete findings read unavailable' : 'Finding read unavailable'}</small></span>
      </Button>)}
    </div>
    <div className="intelligence-quality__filterbar">
      <Input size="sm" aria-label="Search quality findings" placeholder="Search finding, domain or ID…" leftIcon={<MdSearch />} value={search} onChange={event => setSearch(event.target.value)} />
      <div role="group" aria-label="Finding type filter">{QUALITY_TYPES.map(label => <Button key={label} size="sm" variant="ghost" aria-pressed={type === label} onClick={() => chooseType(label)}>{label}</Button>)}</div>
      <Select size="sm" aria-label="Filter by priority" disabled value="All" options={['All', 'High', 'Medium', 'Low'].map(value => ({ value, label: value }))} onChange={() => {}} />
      <span>{candidates ? `${filtered.length} shown` : 'Count unavailable'} · Priority unavailable</span>
    </div>
    {message ? <p role={error && error.status !== 403 ? 'alert' : 'status'} className="intelligence-quality__notice">{message}</p> : null}
    <div className="intelligence-quality__browser">
      <Card variant="outlined" className="intelligence-quality__queue"><Card.Header><span>Candidate queue</span><strong>{candidates ? `${filtered.length} candidates shown` : 'Candidates unavailable'}</strong><small>Returned order · Current read only</small></Card.Header><Card.Body>
        {filtered.map(item => <Button key={item.id} size="sm" variant="outline" className="intelligence-quality__finding" aria-pressed={selected?.id === item.id} onClick={() => { setSelectedId(item.id); setExplanation(false) }}><MdSwapHoriz aria-hidden="true" /><span><small>{item.id} · Contradiction</small><strong>{item.domain ? `${displayHubToken(item.domain)} contradiction candidate` : 'Contradiction candidate'}</strong><em>{displayHubToken(item.domain)} · {displayHubToken(item.status)}</em></span></Button>)}
        {!filtered.length ? <p>{isLoading ? 'Loading candidates…' : unsupportedType ? `${type} findings are not supplied by the available API.` : !candidates ? 'Candidate queue unavailable.' : search ? 'No candidates match this search.' : 'No contradiction candidates returned for this revision.'}</p> : null}
      </Card.Body></Card>
      <Card variant="outlined" className="intelligence-quality__detail" aria-label="Selected quality candidate">
        {selected ? <FindingDetail candidate={selected} preview={preview} locked={locked} onSelectView={onSelectView} onExplain={event => { opener.current = event.currentTarget; setExplanation(true) }} /> : <Card.Body><h3>{unsupportedType ? `${type} unavailable` : 'Selected finding'}</h3><p>{isLoading ? 'Loading selected revision candidates…' : 'Select an available candidate to inspect its detection basis and supporting evidence.'}</p></Card.Body>}
      </Card>
    </div>
    <footer className="intelligence-quality__footer"><Button variant="ghost" size="sm" onClick={() => onSelectView('Intelligence Graph')}>← Intelligence Graph</Button><span>This view explains candidates; it does not change governed records.</span><Button variant="ghost" size="sm" onClick={() => onSelectView('Overview')}>Return to Intelligence overview →</Button></footer>
    <Dialog open={Boolean(explanation && selected)} onClose={close} size="lg" className="intelligence-quality__dialog" aria-label="Advisor recommendation explanation">
      <Dialog.Header><h2>Recommendation availability</h2></Dialog.Header><Dialog.Body><p>{selected?.id} · {displayHubToken(selected?.domain)}</p><DetailSection title="State considered"><p>{selected?.basis || 'Unavailable'}</p></DetailSection><DetailSection title="Downstream impact"><p>The available read does not provide finding-specific downstream impact.</p></DetailSection><DetailSection title="Recommended legal action"><p>No recorded Advisor recommendation or connected governed action is available in this view.</p></DetailSection></Dialog.Body><Dialog.Footer><small>Recommendation only · Human authority is required.</small><Button size="sm" variant="outline" onClick={close}>Close</Button></Dialog.Footer>
    </Dialog>
  </section>
}
