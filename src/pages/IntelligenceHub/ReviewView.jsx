import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { FiArrowLeft, FiArrowRight, FiArrowUpRight } from 'react-icons/fi'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Radio } from '../../components/Radio'
import { Textarea } from '../../components/Textarea'
import ContradictionHistoryInspector from './ContradictionHistoryInspector.jsx'
import { displayHubCount, displayHubToken } from './intelligenceHubModel.js'
import { hasQualityControlCharacters } from './intelligenceQualityModel.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'

const FILTERS = ['All', 'Evidence needing review', 'Quality awaiting a decision', 'Confirmed issues', 'Completed decisions']
const DISPOSITIONS = [['CONFIRMED', 'Confirm contradiction'], ['NOT_CONTRADICTORY', 'Not an issue'], ['REQUEST_MORE', 'Request more evidence'], ['DEFERRED', 'Deferred'], ['REOPENED', 'Reopened']]
const SUPPORTED_DISPOSITIONS = ['CONFIRMED', 'NOT_CONTRADICTORY', 'REOPENED']
const fact = item => item?.extractedFact || item?.summary || 'Recorded text unavailable'
const sourceLabel = item => item?.label || item?.sourceRef || item?.fileName || 'Source unavailable'
const status = row => row.kind === 'evidence' ? row.item.reviewStatus === 'PENDING' ? 'Awaiting decision' : displayHubToken(row.item.reviewStatus)
  : ({ UNREVIEWED: 'Awaiting decision', REOPENED: 'Reopened', STALE: 'Reassessment required', CONFIRMED: 'Confirmed issue', NOT_CONTRADICTORY: 'Not an issue' }[row.item.status] || 'Decision unavailable')

export default function ReviewView({ scope, stateVersion, canInspect, locked = false, completion, evidencePage, isLoading, error,
  evidenceStatusCounts, countsLoading, onOpenSource, onSelectView, page, filter, onFilterChange, query, onSearch,
  actions, findings, findingsLoading, pagination, focused, onReturn, onRefresh, refreshing }) {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const [draftState, setDraftState] = useState({ query, draft: query })
  if (draftState.query !== query) setDraftState({ query, draft: query })
  const [sharedFilter, setSharedFilter] = useState('All')
  const [findingType, setFindingType] = useState('All')
  const [selection, setSelection] = useState(null)
  const [inspection, setInspection] = useState(null)
  const searchRef = useRef(null)
  const feedbackRef = useRef(null)
  const opener = useRef(null)
  const restoreFocus = useRef(null)
  const frame = useRef(null)
  const available = canInspect && !isLoading && !error && Boolean(evidencePage)
  const evidence = available ? evidencePage.evidenceObjects || [] : []
  const sources = available ? evidencePage.sourceRegistry || [] : []
  const scopeKey = JSON.stringify([scope, stateVersion, sessionRevision, locked, filter, page, query, sharedFilter, findingType])
  const rows = [
    ...evidence.map(item => ({ kind: 'evidence', id: item.evidenceObjectId, item })),
    ...(canInspect && !findingsLoading && findings || []).map(item => ({ kind: 'quality', id: item.id, item })),
  ].filter(row => (findingType === 'All' || row.kind === 'quality')
    && (sharedFilter === 'All' || sharedFilter === 'Evidence needing review' && row.kind === 'evidence' && row.item.reviewStatus === 'PENDING'
      || sharedFilter === 'Quality awaiting a decision' && row.kind === 'quality' && ['UNREVIEWED', 'REOPENED', 'STALE'].includes(row.item.status)
      || sharedFilter === 'Confirmed issues' && row.kind === 'quality' && row.item.status === 'CONFIRMED'
      || sharedFilter === 'Completed decisions' && (row.kind === 'evidence' && ['ACCEPTED', 'REJECTED'].includes(row.item.reviewStatus)
        || row.kind === 'quality' && row.item.status === 'NOT_CONTRADICTORY'))
    && (row.kind === 'evidence' || !query || [row.item.id, row.item.domain, row.item.basis].some(value => String(value || '').toLowerCase().includes(query.toLowerCase()))))
  const selected = rows.find(row => selection?.owner === scopeKey && row.id === selection.id && row.kind === selection.kind) || rows[0] || null
  const selectedKey = selected ? `${selected.kind}:${selected.id}` : ''
  const inspectionKey = `${scopeKey}:${selectedKey}:${selected?.item.evidencePairHash || selected?.item.lineageRef || ''}`
  const [decisionDraft, setDecisionDraft] = useState({ owner: inspectionKey, choice: '', rationale: '' })
  const decisionAttempt = useRef(null)
  const currentDraft = decisionDraft.owner === inspectionKey ? decisionDraft : { choice: '', rationale: '' }
  const canPreviewQuality = selected?.kind === 'quality' && !locked && SUPPORTED_DISPOSITIONS.includes(currentDraft.choice)
    && currentDraft.rationale.trim().length >= 10 && currentDraft.rationale.length <= 2000 && !hasQualityControlCharacters(currentDraft.rationale)
  useLayoutEffect(() => {
    if (decisionDraft.owner !== inspectionKey || locked && (decisionDraft.choice || decisionDraft.rationale)) setDecisionDraft({ owner: inspectionKey, choice: '', rationale: '' })
  }, [decisionDraft, inspectionKey, locked])
  const source = selected?.kind === 'evidence' ? sources.find(row => row.sourceId === selected.item.sourceId) : null
  const token = Symbol('review-frame')
  useLayoutEffect(() => {
    const owner = { token, scopeKey, selectedKey, canInspect }
    frame.current = owner
    return () => { if (frame.current === owner) frame.current = null }
  })
  const owned = () => frame.current?.token === token && frame.current.scopeKey === scopeKey && frame.current.canInspect
    && getSessionRevision() === sessionRevision
  const navigate = (view, focus) => { if (owned()) onSelectView(view, undefined, focus) }
  const open = (kind, trigger) => {
    if (!owned() || !selected) return
    opener.current = trigger
    setInspection({ kind, owner: inspectionKey })
  }
  const visibleInspection = inspection?.owner === inspectionKey && canInspect && getSessionRevision() === sessionRevision ? inspection : null
  useLayoutEffect(() => {
    if (inspection && (!canInspect || inspection.owner !== inspectionKey || getSessionRevision() !== sessionRevision)) setInspection(null)
  }, [inspection, inspectionKey, canInspect, sessionRevision])
  useLayoutEffect(() => {
    if (visibleInspection || !restoreFocus.current) return
    const intent = restoreFocus.current
    restoreFocus.current = null
    if (canInspect && intent.owner === inspectionKey && getSessionRevision() === sessionRevision && intent.opener?.isConnected) intent.opener.focus()
  }, [visibleInspection, inspectionKey, canInspect, sessionRevision])
  const close = () => {
    if (!owned()) return
    restoreFocus.current = { owner: inspectionKey, opener: opener.current }
    setInspection(null)
  }
  const confirmEvidence = () => {
    const decision = visibleInspection?.kind === 'accept' ? 'ACCEPTED' : visibleInspection?.kind === 'reject' ? 'REJECTED' : null
    if (!owned() || !available || locked || !decision || selected?.kind !== 'evidence' || !actions?.canReviewEvidence || actions.busy
      || selected.item.reviewStatus === decision || decisionAttempt.current === visibleInspection) return
    decisionAttempt.current = visibleInspection
    close()
    actions.decideEvidence(selected.id, decision)
  }
  const selectFilter = value => {
    if (!owned() || !FILTERS.includes(value)) return
    setSharedFilter(value)
    onFilterChange(value === 'Evidence needing review' ? 'Needs review' : 'All')
  }
  const inspectSource = item => {
    if (owned() && selected?.kind === 'evidence' && selected.item === item && source?.sourceId === item.sourceId) onOpenSource(item.sourceId, item.evidenceObjectId)
  }
  const title = selected?.kind === 'quality' ? `${selected.item.domain || 'Recorded'} contradiction` : selected?.item.title || fact(selected?.item)
  const explanation = selected?.kind === 'quality' ? selected.item.basis || 'The recorded contradiction needs inspection against its exact evidence pair.'
    : selected?.item.reviewStatus === 'PENDING' ? 'This evidence needs a human decision before it can affect downstream workspace understanding.'
      : 'This evidence has a recorded decision. Acceptance is separate from source verification, Quality disposition and publication.'
  const queueMessage = isLoading || findingsLoading ? 'Loading review items…' : error ? 'Evidence candidates could not be loaded. Refresh to retry.'
    : !available ? 'Current evidence items are unavailable.' : 'No items match this filter in the loaded review subset.'
  const technical = selected && <details><summary>Advanced provenance</summary><p>{selected.id}</p><p>State version: {stateVersion}</p>
    {selected.kind === 'quality' ? <p>Evidence pair: {selected.item.evidencePairHash || 'Unavailable'}</p>
      : <><p>Source: {selected.item.sourceId}</p><p>Lineage: {selected.item.lineageRef || 'Unavailable'}</p></>}
    <p>Frozen membership and complete four-type findings are not established by these reads.</p></details>
  const history = selected && <><strong>{title}</strong><p>{status(selected)} · Current recorded state</p>
    {selected.kind === 'quality' && selected.item.latestReview ? <><p>{selected.item.latestReview.rationale || 'Rationale unavailable'}</p>
      <p>Reviewer: {selected.item.latestReview.reviewedBy || 'Unavailable'} · {selected.item.latestReview.reviewedAt || 'Time unavailable'}</p></>
      : <p>Per-item evidence decision history is not supplied by this read. A current status is not a history receipt.</p>}
    {selected.kind === 'quality' ? <ContradictionHistoryInspector compact scope={{ ...scope, stateVersion, sessionRevision }} findingId={selected.id}
      disabled={!canInspect || !/^sha256:[a-f0-9]{64}$/.test(selected.item.evidencePairHash || '')} /> : null}{technical}</>
  return <div className="intelligence-hub__review-workspace">
    <div className="intelligence-hub__review-basis"><Select label="Review basis" size="sm" value="current" options={[{ value: 'current', label: 'Current revision · bounded reads' }]} onChange={() => {}} />
      <span>Complete four-type findings unavailable · loaded evidence page and up to eight contradiction candidates only.</span></div>
    <div className="intelligence-hub__review-tools"><form onSubmit={event => { event.preventDefault(); const text = draftState.draft.trim(); if (owned() && text.length <= 240 && !hasQualityControlCharacters(text)) onSearch(text) }}>
      <label htmlFor={`review-search-${scope.runtimeInstanceId}`}>Find a review item</label><Input id={`review-search-${scope.runtimeInstanceId}`} ref={searchRef} type="search" size="sm" fullWidth aria-label="Find a review item" maxLength={240} value={draftState.draft} onChange={event => setDraftState({ query, draft: event.target.value })} />
      <Button size="sm" type="submit" className="sr-only">Search review</Button>{query ? <Button size="sm" variant="outline" onClick={() => { if (owned()) { onSearch(''); searchRef.current?.focus() } }}>Clear evidence search</Button> : null}</form>
      <Select label="Quality finding type" size="sm" value={findingType} options={['All', 'Contradiction', 'Missing coverage', 'Weak confidence', 'Duplicate source'].map(value => ({ value, label: value, disabled: !['All', 'Contradiction'].includes(value) }))}
        onChange={event => { if (owned() && ['All', 'Contradiction'].includes(event.target.value)) setFindingType(event.target.value) }} /></div>
    <div className="intelligence-hub__review-filters" role="group" aria-label="Shared review filters">{FILTERS.map(value => <Button key={value} size="sm" variant="outline" aria-pressed={sharedFilter === value} onClick={() => selectFilter(value)}>{value}</Button>)}</div>
    {focused ? <p>Inspecting the exact linked evidence item. <Button size="sm" variant="outline" onClick={() => { if (owned()) { onReturn(); searchRef.current?.focus() } }}>Return to Review search</Button></p> : null}
    {actions?.feedback?.message ? <p ref={feedbackRef} tabIndex={-1} role={actions.feedback.error ? 'alert' : 'status'} aria-label="Evidence decision status">{actions.feedback.message}</p> : null}
    <div className="intelligence-hub__review-browser">
      <Card bordered={false} rounded={false} className="intelligence-hub__review-queue" aria-label="Review queue"><Card.Header><h2>Review queue</h2><span>{rows.length} loaded items · bounded subset</span></Card.Header>
        <Card.Body role="region" aria-label="Evidence candidate queue" tabIndex={0}>{rows.length ? <ul>{rows.map(row => <li key={`${row.kind}:${row.id}`}><Button variant="ghost" size="sm" fullWidth className="intelligence-hub__review-row" aria-pressed={selectedKey === `${row.kind}:${row.id}`} onClick={() => { if (owned()) setSelection({ owner: scopeKey, id: row.id, kind: row.kind }) }}>
          <strong>{row.kind === 'quality' ? `${row.item.domain || 'Recorded'} contradiction` : row.item.title || fact(row.item)}</strong><small>{row.kind === 'quality' ? 'Quality · Contradiction · detected candidate' : 'Evidence acceptance'}</small><span data-status={row.kind === 'quality' ? row.item.status : row.item.reviewStatus}>{status(row)}</span>
        </Button></li>)}</ul> : <p role={error ? 'alert' : 'status'}>{queueMessage}</p>}</Card.Body>
        <Card.Footer>{pagination}</Card.Footer></Card>
      <Card bordered={false} rounded={false} className="intelligence-hub__review-detail" role="region" aria-label="Selected evidence candidate" tabIndex={0}>
        {selected ? <><h2>{title}</h2><p>{selected.kind === 'quality' ? 'Quality decision · Contradiction' : 'Evidence status'} · {status(selected)}</p><p>{explanation}</p>
          {(selected.kind === 'quality' ? selected.item.evidence : [selected.item]).map((item, index) => <article key={item.evidenceObjectId || index}><small>{selected.kind === 'evidence' ? sourceLabel(source) : index ? 'Compared evidence' : 'Recorded evidence'} · Location not supplied</small><p>{fact(item)}</p></article>)}
          <div className="intelligence-hub__review-inspect-actions">{[['support', 'Supporting evidence'], ['history', 'Decision history'], ['detail', 'Detailed inspection']].map(([kind, label]) => <Button key={kind} size="sm" variant="outline" onClick={event => open(kind, event.currentTarget)}>{label}<FiArrowUpRight size={14} aria-hidden="true" /></Button>)}</div>
          <div className="intelligence-hub__review-decision-actions">{selected.kind === 'quality' ? <div className="intelligence-hub__review-quality-preview">
            <fieldset><legend>Quality disposition</legend><div>{DISPOSITIONS.map(([value, label]) => <Radio key={value} name={`quality-${selected.id}`} size="sm" value={value} label={label} checked={currentDraft.choice === value}
              disabled={locked || !SUPPORTED_DISPOSITIONS.includes(value)} onChange={() => { if (owned() && !locked && SUPPORTED_DISPOSITIONS.includes(value)) setDecisionDraft({ owner: inspectionKey, ...currentDraft, choice: value }) }} />)}</div></fieldset>
            <Textarea label="Decision rationale" size="sm" rows={2} fullWidth value={currentDraft.rationale} maxLength={2000} disabled={locked} onChange={event => { if (owned() && !locked) setDecisionDraft({ owner: inspectionKey, ...currentDraft, rationale: event.target.value }) }} />
            <Button size="sm" variant="outline" disabled={!canPreviewQuality} onClick={event => { if (canPreviewQuality) open('quality-decision', event.currentTarget) }}>Review Quality decision<FiArrowRight size={14} aria-hidden="true" /></Button>
            <p>Local preview only. Record the decision in governed Quality. This draft is not transferred. Deferred and request more evidence are unavailable.</p>
          </div> : <><Button size="sm" variant="outline" disabled={locked || !actions?.canReviewEvidence || selected.item.reviewStatus === 'REJECTED'} onClick={event => { if (owned() && available) open('reject', event.currentTarget) }}>Reject evidence</Button>
              <Button size="sm" variant="outline" disabled={locked || !actions?.canReviewEvidence || selected.item.reviewStatus === 'ACCEPTED'} onClick={event => { if (owned() && available) open('accept', event.currentTarget) }}>Accept evidence</Button><p>An Unaccept action is not supplied. Reject records an explicit evidence decision.</p></>}</div>
        </> : <p>{queueMessage}</p>}
      </Card>
    </div>
    {completion}
    <details className="intelligence-hub__review-read-basis"><summary>Current review read basis</summary><div role="region" aria-label="Evidence review summary"><p>{countsLoading ? 'Loading…' : displayHubCount(evidenceStatusCounts.accepted)} already accepted · {countsLoading ? 'Loading…' : displayHubCount(evidenceStatusCounts.pending)} evidence awaiting review.</p></div>
      <p>CANONICAL_FINDING_TYPE_UNAVAILABLE: Missing coverage, Weak confidence and Duplicate source are not supplied as canonical findings. Loaded contradiction candidates are not a complete review population.</p>
      {!findings ? <p>Current finding decisions unavailable. Refresh to retry.</p> : null}<Button size="sm" variant="outline" disabled={refreshing} onClick={() => { if (owned()) onRefresh?.() }}>Refresh Review reads</Button></details>
    <footer className="intelligence-hub__review-footer"><Button variant="outline" size="sm" onClick={() => navigate('Sources')}><FiArrowLeft size={14} aria-hidden="true" />Sources</Button><span>Acceptance, Quality disposition and completion are separate decisions.</span><Button variant="outline" size="sm" onClick={() => navigate('Readiness & publish')}>Readiness &amp; publish<FiArrowRight size={14} aria-hidden="true" /></Button></footer>
    {visibleInspection ? <Dialog open onClose={close} onCancel={event => { event.preventDefault(); if (event.target === event.currentTarget) close() }} size="lg" className="intelligence-hub__dialog intelligence-hub__inspection-dialog intelligence-hub__review-inspection" aria-label={visibleInspection.kind === 'history' ? 'Item decision history' : visibleInspection.kind === 'support' ? 'Supporting evidence and provenance' : visibleInspection.kind === 'quality-decision' ? 'Confirm Quality disposition' : ['accept','reject'].includes(visibleInspection.kind) ? 'Review evidence decision' : 'Contextual inspection'}>
      <Dialog.Header><h2>{visibleInspection.kind === 'history' ? 'Item decision history' : visibleInspection.kind === 'support' ? 'Supporting evidence and provenance' : visibleInspection.kind === 'quality-decision' ? 'Confirm Quality disposition' : ['accept','reject'].includes(visibleInspection.kind) ? 'Review evidence decision' : 'Contextual inspection'}</h2></Dialog.Header>
      <Dialog.Body>{visibleInspection.kind === 'history' ? history : ['accept','reject','quality-decision'].includes(visibleInspection.kind) ? <><strong>{title}</strong>
        <p>{visibleInspection.kind === 'quality-decision' ? `${DISPOSITIONS.find(([value])=>value===currentDraft.choice)?.[1] || 'Preview unavailable'} · Quality disposition only; no evidence status change.` : visibleInspection.kind === 'accept' ? 'Accept evidence · Evidence decision only.' : 'Reject evidence · Evidence decision only.'}</p>
        {visibleInspection.kind === 'quality-decision' ? <><p>{currentDraft.rationale}</p><p>This local preview cannot record a Quality decision. Inspect the current governed basis to record it; the draft remains here.</p></> : <p>This records an evidence decision only. It does not verify the source, resolve Quality findings, complete review or authorise publication.</p>}
        <div className="intelligence-hub__review-confirm-actions">{visibleInspection.kind === 'quality-decision' ? <><Button size="sm" disabled>Confirm decision</Button><Button size="sm" variant="outline" onClick={() => navigate('Intelligence Quality', { findingId: selected.id })}>Open governed Quality<FiArrowRight size={14} aria-hidden="true" /></Button></> : <Button size="sm" disabled={locked || !actions?.canReviewEvidence || actions?.busy} onClick={confirmEvidence}>{visibleInspection.kind === 'accept' ? 'Confirm acceptance' : 'Confirm rejection'}</Button>}<Button size="sm" variant="outline" onClick={close}>Cancel</Button></div>
        {technical}</> : <><strong>{source ? sourceLabel(source) : title}</strong><p>Location not supplied · Current recorded basis</p><p>{selected.kind === 'evidence' ? fact(selected.item) : selected.item.basis || 'Recorded contradiction basis unavailable'}</p>
        <h3>Classification</h3><p>Not assessed; acceptance does not mean independently verified.</p><h3>Finding types</h3><p>Contradiction, Missing coverage, Weak confidence, Duplicate source are distinct populations. Only bounded detected contradictions are supplied here.</p>
        <h3>Explanation and required action</h3><p>{explanation}</p><h3>Permission and history</h3><p>{actions?.canReviewEvidence ? 'Current evidence decision authority is available.' : 'Current evidence decision authority is unavailable.'} Quality and completion have separate authority.</p>
        <Button size="sm" variant="outline" onClick={() => { if (owned()) setInspection({ kind: 'history', owner: inspectionKey }) }}>Inspect this item's history</Button>
        {selected.kind === 'evidence' ? <Button size="sm" variant="outline" disabled={!source} onClick={() => inspectSource(selected.item)}>Open source<FiArrowRight size={14} aria-hidden="true" /></Button> : null}{technical}</>}</Dialog.Body>
      <Dialog.Footer><Button size="sm" variant="outline" onClick={close}><FiArrowLeft size={14} aria-hidden="true" />Return to Review</Button></Dialog.Footer>
    </Dialog> : null}
  </div>
}
