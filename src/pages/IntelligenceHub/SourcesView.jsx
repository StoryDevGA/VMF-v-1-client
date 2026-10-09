import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { useGetRuntimeStateSourcesQuery, useGetRuntimeStateEvidenceQuery } from '../../store/api/runtimeInstanceApi.js'
import { displayHubToken, getHubPayload } from './intelligenceHubModel.js'
import { sourceProcessingLabel, sourceProcessingExplanation } from './sourceSummaryModel.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import SourceVerificationForm from './SourceVerificationForm.jsx'

const STATE_KEYS = ['sourceQuery', 'sourceType', 'sourcePage', 'sourceId', 'evidenceObjectId', 'evidencePage', 'sourceEvidencePage', 'sourceContext']
const label = source => source?.label || source?.sourceRef || source?.sourceId || 'Source unavailable'
const count = (value, capped = false) => capped ? 'Partial · total unavailable'
  : typeof value === 'number' && value >= 0 ? value.toLocaleString() : 'Unavailable'
const noControls = value => typeof value === 'string' && !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
const identity = value => noControls(value) && value.length > 0 && value.length <= 240 && value === value.trim()
const parsePage = value => value === null ? 1 : /^[1-9][0-9]{0,3}$/.test(value) && Number(value) <= 1000 ? Number(value) : null
const scopedPayload = (read, scope) => {
  if (read.isFetching || read.isLoading || read.error || !identity(scope.stateVersion)) return null
  const payload = getHubPayload(read.currentData)
  const control = payload?.control
  return control && String(control.customerId) === scope.customerId && String(control.tenantId) === scope.tenantId
    && [control.id, control.runtimeInstanceKey].includes(scope.runtimeInstanceId) && control.stateVersion === scope.stateVersion ? payload : null
}
function Search({ query, submit }) {
  const [draftState, setDraftState] = useState({ query, draft: query })
  const searchRef = useRef(null)
  if (draftState.query !== query) setDraftState({ query, draft: query })
  const draft = draftState.draft
  return <form className="intelligence-hub__sources-search" onSubmit={event => { event.preventDefault(); submit(draft.trim()) }}>
    <Input ref={searchRef} size="sm" fullWidth aria-label="Search all sources and evidence" placeholder="Search source, evidence or title…"
      maxLength={240} value={draft} onChange={event => setDraftState({ query, draft: event.target.value })} />
    <Button size="sm" type="submit">Search</Button>
    {query ? <Button size="sm" variant="ghost" onClick={() => { if (submit('') !== false) searchRef.current?.focus() }}>Clear search</Button> : null}
  </form>
}
function Pages({ receipt, page, change, name, busy, canNavigate }) {
  const navRef = useRef(null)
  const activatePage = nextPage => {
    if (!canNavigate?.()) return
    navRef.current?.focus()
    change(nextPage)
  }
  const capped = Boolean(receipt?.totalCapped)
  const rows = receipt?.sourceRegistry && !receipt?.evidenceObjects ? receipt.sourceRegistry : receipt?.evidenceObjects || []
  const more = capped ? rows.length === receipt.pageSize : page < receipt?.totalPages
  return <nav ref={navRef} tabIndex={-1} className="intelligence-hub__filters" aria-label={`${name} pages`}>
    <Button size="sm" variant="outline" disabled={!receipt || busy || page <= 1} onClick={() => activatePage(page - 1)}>Previous {name.toLowerCase()} page</Button>
    <span>{!receipt ? busy ? 'Loading page…' : 'Page unavailable' : `Page ${page}${capped ? ' · total unavailable (partial read)' : ` of ${receipt.totalPages}`}`}</span>
    <Button size="sm" variant="outline" disabled={!receipt || busy || !more || page >= 1000} onClick={() => activatePage(page + 1)}>Next {name.toLowerCase()} page</Button>
    {page >= 1000 ? <span>Pagination limit reached. Refine the search.</span> : null}
  </nav>
}
function ReadMessage({ read, payload, empty, loading }) {
  return <p role={read.error ? 'alert' : read.isFetching || read.isLoading ? 'status' : undefined}>
    {read.isFetching || read.isLoading ? loading : read.error
      ? `${read.error?.data?.error?.message || 'This read could not be loaded.'} Retry this read.`
      : !payload ? 'This read is unavailable or does not match the selected revision. Retry this read.' : empty}
  </p>
}

export default function SourcesView({ workspaceId, revisionId, customerId, tenantId, active, canRead,
  stateVersion, pendingCount, countsLoading, locked, onOpen, onSelectView, sourceSummary, sourceSummaryLoading, onRefreshSummary,
  reviewAuthority, onSourceReviewed, refreshToken = 0 }) {
  const [params, setParams] = useSearchParams()
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const contextKey = `${workspaceId}:${revisionId}:${customerId}:${tenantId}`
  const matchesContext = params.get('sourceContext') === contextKey
  const value = key => matchesContext ? params.get(key) || '' : ''
  const query = value('sourceQuery')
  const sourceId = value('sourceId')
  const evidenceId = value('evidenceObjectId')
  const sourceType = value('sourceType')
  const sourcePage = parsePage(matchesContext ? params.get('sourcePage') : null)
  const evidencePage = parsePage(matchesContext ? params.get('evidencePage') : null)
  const sourceEvidencePage = parsePage(matchesContext ? params.get('sourceEvidencePage') : null)
  const valid = sourcePage !== null && evidencePage !== null && sourceEvidencePage !== null && query.length <= 240
    && noControls(query) && (!sourceId || identity(sourceId)) && (!evidenceId || identity(evidenceId))
    && ['', 'WEBSITE', 'UPLOADED_DOCUMENT'].includes(sourceType) && (!evidenceId || Boolean(sourceId))
    && !STATE_KEYS.some(key => params.getAll(key).length > 1)
  const update = (changes, reset = false) => {
    if (!currentFrame(reset)) return
    const next = new URLSearchParams(params)
    if (!matchesContext || reset) STATE_KEYS.forEach(key => next.delete(key))
    next.set('sourceContext', contextKey)
    Object.entries(changes).forEach(([key, val]) => val ? next.set(key, String(val)) : next.delete(key))
    setParams(next)
  }
  const scope = { runtimeInstanceId: revisionId, customerId, tenantId, stateVersion, sessionRevision }
  const verificationFrame = useRef(null)
  const verificationOwnerKey = `${contextKey}:${sessionRevision}:${params.toString()}`
  useLayoutEffect(() => {
    const owner = { key: verificationOwnerKey, active, canRead, locked }
    verificationFrame.current = owner
    return () => { if (verificationFrame.current === owner) verificationFrame.current = null }
  }, [verificationOwnerKey, active, canRead, locked])
  const ownsVerification = () => verificationFrame.current?.key === verificationOwnerKey
    && verificationFrame.current.active && verificationFrame.current.canRead && !verificationFrame.current.locked
    && getSessionRevision() === sessionRevision
  const usableScope = active && canRead && identity(stateVersion)
  const skip = !usableScope || !valid
  const registryRead = useGetRuntimeStateSourcesQuery({ ...scope, page: sourcePage || 1, pageSize: 25, search: query, sourceType }, { skip })
  const registry = !skip ? scopedPayload(registryRead, scope) : null
  const sources = Array.isArray(registry?.sourceRegistry) ? registry.sourceRegistry : []
  const selectedId = sourceId || (!query ? sources[0]?.sourceId || '' : '')
  const exactRead = useGetRuntimeStateSourcesQuery({ ...scope, sourceId: selectedId, page: 1, pageSize: 1 }, { skip: skip || !selectedId })
  const exact = !skip && selectedId ? scopedPayload(exactRead, scope) : null
  const selected = exact?.sourceRegistry?.length === 1 && exact.sourceRegistry[0]?.sourceId === selectedId ? exact.sourceRegistry[0] : null
  const searching = Boolean(query && !sourceId)
  const displayedEvidencePage = searching ? evidencePage : evidenceId ? 1 : sourceEvidencePage
  const evidenceRead = useGetRuntimeStateEvidenceQuery({ ...scope, page: displayedEvidencePage || 1, pageSize: 25,
    search: searching ? query : '', sourceId: searching ? '' : selectedId, evidenceObjectId: evidenceId },
  { skip: skip || (!searching && !selectedId) })
  const evidencePayload = !skip && (searching || selectedId) ? scopedPayload(evidenceRead, scope) : null
  const evidence = evidencePayload && Array.isArray(evidencePayload.evidenceObjects)
    && evidencePayload.evidenceObjects.every(item => identity(item?.sourceId) && identity(item?.evidenceObjectId)
      && (searching || item.sourceId === selectedId && (!evidenceId || item.evidenceObjectId === evidenceId)))
    && new Set(evidencePayload.evidenceObjects.map(item => item.evidenceObjectId)).size === evidencePayload.evidenceObjects.length ? evidencePayload : null
  const objects = evidence?.evidenceObjects || []
  const detailRef = useRef(null)
  const selectionIntent = useRef('')
  const matchingSourceBasis = selected && typeof exact?.control?.stateVersion === 'string' && exact.control.stateVersion.length > 0
    && exact.control.stateVersion === evidence?.control?.stateVersion
  const focusedPair = matchingSourceBasis && evidenceId && objects.length === 1
    && objects[0].sourceId === selectedId && objects[0].evidenceObjectId === evidenceId
  const navigationFrame = useRef(null)
  const navigationToken = Symbol('source-navigation-frame')
  useLayoutEffect(() => {
    navigationFrame.current = { token: navigationToken, usableScope, valid, sessionRevision }
    return () => { if (navigationFrame.current?.token === navigationToken) navigationFrame.current = null }
  }, [navigationToken, usableScope, valid, sessionRevision])
  const currentFrame = (recovery = false) => {
    const current = navigationFrame.current
    return current?.usableScope && (recovery || current.valid) && current.token === navigationToken
      && current.sessionRevision === sessionRevision && getSessionRevision() === sessionRevision
  }
  const currentEvidence = item => currentFrame() && Boolean(evidence) && (searching || Boolean(selected))
    && objects.some(row => row === item && row.sourceId === item.sourceId && row.evidenceObjectId === item.evidenceObjectId)
  const browseAll = () => {
    if (!currentFrame() || !focusedPair) return
    selectionIntent.current = `${selectedId}:`
    update({ evidenceObjectId: '', sourceEvidencePage: 1 })
  }
  const retry = () => {
    if (!currentFrame() || skip) return
    onRefreshSummary?.()
    if (currentFrame() && !registryRead.isUninitialized) registryRead.refetch()
    if (currentFrame() && selectedId && !exactRead.isUninitialized) exactRead.refetch()
    if (currentFrame() && (searching || selectedId) && !evidenceRead.isUninitialized) evidenceRead.refetch()
  }
  const lastRefresh = useRef(refreshToken)
  useEffect(() => {
    if (lastRefresh.current === refreshToken) return
    lastRefresh.current = refreshToken
    if (!skip && getSessionRevision() === sessionRevision && !registryRead.isUninitialized) registryRead.refetch()
    if (!skip && selectedId && getSessionRevision() === sessionRevision && !exactRead.isUninitialized) exactRead.refetch()
    if (!skip && (searching || selectedId) && getSessionRevision() === sessionRevision && !evidenceRead.isUninitialized) evidenceRead.refetch()
  }, [refreshToken, skip, selectedId, searching, registryRead, exactRead, evidenceRead, sessionRevision])
  useEffect(() => {
    if (selectionIntent.current === 'SEARCH_RESULTS' && searching && evidence) {
      selectionIntent.current = ''
      detailRef.current?.focus()
      return
    }
    if (selectionIntent.current !== `${sourceId}:${evidenceId}` || !selected || !evidence) return
    selectionIntent.current = ''
    detailRef.current?.focus()
  }, [sourceId, evidenceId, selected, evidence, searching])
  const focus = (id, objectId = '') => {
    if (!currentFrame() || !identity(id) || (objectId ? !objects.some(item => item.sourceId === id && item.evidenceObjectId === objectId)
      : !sources.some(source => source.sourceId === id))) return
    selectionIntent.current = `${id}:${objectId}`
    update({ sourceId: id, evidenceObjectId: objectId, sourceEvidencePage: 1 })
  }
  const submit = text => {
    if (!currentFrame() || !noControls(text) || text.length > 240) return false
    update({ sourceQuery: text, sourcePage: 1, evidencePage: 1, sourceEvidencePage: 1, sourceId: '', evidenceObjectId: '' })
    return true
  }
  const selectView = (view, item) => {
    if (!currentFrame() || item && !currentEvidence(item)) return
    onSelectView(view, undefined, item ? { sourceId: item.sourceId, evidenceObjectId: item.evidenceObjectId } : undefined)
  }
  const provenance = (source, item) => <>
    <p>Recorded provenance for this exact revision. Inspection does not change evidence.</p>
    <dl className="intelligence-hub__facts">{Object.entries({ Source: label(source), 'Source ID': source?.sourceId || 'Unavailable',
      Reference: source?.sourceRef || 'Unavailable', 'Source lineage': source?.lineageRef || 'Unavailable',
      'State version': source?.stateVersion || 'Unavailable', 'Evidence ID': item.evidenceObjectId,
      'Evidence lineage': item.lineageRef || 'Unavailable', 'Review state': displayHubToken(item.reviewStatus),
      'Acceptance state': displayHubToken(item.acceptanceState),
    }).map(([key, val]) => <div key={key}><dt>{key}</dt><dd>{val}</dd></div>)}</dl>
  </>
  if (!valid) return <div role="alert"><p>The Sources link contains an invalid query, page or evidence/source pair.</p>
    <Button onClick={() => update({}, true)}>Reset Sources query</Button></div>
  return <div className="intelligence-hub__sources-workspace">
    <div className="intelligence-hub__sources-toolbar"><div><p className="intelligence-hub__eyebrow">Source provenance</p>
      <h2>Confirm sources and processing</h2><p>Search all recorded sources and evidence in the selected revision.</p>
      {locked ? <p>Locked revision · inspection is read-only.</p> : null}</div>
      <Search key={contextKey} query={query} submit={submit} /></div>
    <div className="intelligence-hub__sources-summary" aria-label="Source summary">
      <span><strong>{count(registry?.total, registry?.totalCapped)}</strong><small>{query || sourceType ? 'Matching sources' : 'Unique sources'}</small></span>
      <span><strong>{sourceSummaryLoading ? 'Loading…' : count(usableScope ? sourceSummary?.uniqueSourceCount : null)}</strong><small>Whole-revision sources</small></span>
      <span><strong>{sourceProcessingLabel(usableScope ? sourceSummary : null, sourceSummaryLoading)}</strong><small>Documents processed</small></span>
      <span><strong>{countsLoading ? 'Loading…' : count(usableScope ? pendingCount : null)}</strong><small>Evidence awaiting review</small></span>
      <Button size="sm" variant="ghost" disabled={skip} onClick={retry}>Retry source reads</Button>
    </div>
    <p>{sourceProcessingExplanation(usableScope ? sourceSummary : null)}</p>
    <div className="intelligence-hub__sources-browser">
      <Card variant="outlined" className="intelligence-hub__sources-registry" aria-label="Revision source registry">
        <Card.Header><h2>Source registry</h2><div className="intelligence-hub__sources-filters" role="group" aria-label="Source type filters">
          {[['', 'All'], ['WEBSITE', 'Website'], ['UPLOADED_DOCUMENT', 'Uploaded document']].map(([type, text]) =>
            <Button key={type} size="sm" variant="outline" aria-pressed={sourceType === type}
              onClick={() => update({ sourceType: type, sourcePage: 1 })}>{text}</Button>)}
        </div></Card.Header>
        <Card.Body role="region" aria-label="Source registry results" tabIndex={0}>
          {sources.length ? <ul className="intelligence-hub__sources-list">{sources.map(source => <li key={source.sourceId}>
            <Button size="sm" variant="ghost" fullWidth className="intelligence-hub__sources-row" aria-pressed={source.sourceId === selectedId}
              onClick={() => focus(source.sourceId)}><span><strong>{label(source)}</strong><small>{displayHubToken(source.sourceType)} · {displayHubToken(source.acquisitionStatus)}</small></span>
              <span className="intelligence-hub__sources-count"><strong>{count(source.evidenceObjectCount, source.evidenceCountCapped)}</strong><small>evidence objects</small></span>
            </Button></li>)}</ul> : <ReadMessage read={registryRead} payload={registry} empty="No matching sources in this revision." loading="Loading sources…" />}
        </Card.Body><Card.Footer><p>{registry?.completeness === 'PARTIAL' ? 'Partial registry count. Refine the search for an exact total.' : 'Unique recorded sources in the selected revision.'}</p>
          <Pages receipt={registry} page={sourcePage} canNavigate={() => currentFrame() && Boolean(registry)} change={page => update({ sourcePage: page, sourceId: selectedId })} name="Source" busy={registryRead.isFetching} /></Card.Footer>
      </Card>
      <Card variant="outlined" className="intelligence-hub__sources-detail" aria-label="Source evidence">
        <Card.Header><div><h3>{searching ? `Evidence matching “${query}”` : selected ? label(selected) : 'Selected source'}</h3>
          <p>{searching ? `${count(evidence?.total, evidence?.totalCapped)} matching evidence objects`
            : `${count(matchingSourceBasis ? selected.evidenceObjectCount : null, matchingSourceBasis && selected.evidenceCountCapped)} evidence objects from this source`}</p>
          {!searching && evidenceId ? <><p>{count(focusedPair ? evidence?.total : null, focusedPair && evidence?.totalCapped)} evidence objects matching this exact focus</p>
            <Button size="sm" variant="ghost" disabled={!focusedPair || skip} onClick={browseAll}>Browse all evidence from this source</Button></> : null}
          {sourceId && query ? <Button size="sm" variant="ghost" onClick={() => {
            if (!currentFrame()) return
            selectionIntent.current = 'SEARCH_RESULTS'
            update({ sourceId: '', evidenceObjectId: '' })
          }}>Return to search results</Button> : null}
        </div></Card.Header>
        <Card.Body><div ref={detailRef} role="region" aria-label={searching ? 'Evidence search results' : 'Selected source detail'} tabIndex={0}>
          {!searching && selected ? <section aria-label="Recorded source verification">
            <h3>Source verification</h3>
            <p>{selected.verificationContext ? selected.verificationContext.sourceFingerprint === selected.materialFingerprint
              ? `Recorded review · ${displayHubToken(selected.verificationContext.authenticity)} · ${selected.verificationContext.reviewedAt}`
              : 'The recorded source review is stale. Review the current source before assessment.'
              : 'No source verification review is recorded.'}</p>
            {reviewAuthority && onSourceReviewed ? <SourceVerificationForm key={`${selected.sourceId}:${stateVersion}:${sessionRevision}`}
              source={selected} scope={scope} authority={reviewAuthority} locked={locked} ownsIntent={ownsVerification} refresh={async receipt => {
                if (!ownsVerification()) return false
                const read = await exactRead.refetch()
                if (!ownsVerification() || read.error) return false
                const saved = getHubPayload(read.data)
                const row = saved?.sourceRegistry?.find(item => item.sourceId === receipt.sourceId)
                if (saved?.control?.stateVersion !== receipt.stateVersion || saved.control.customerId !== customerId
                  || saved.control.tenantId !== tenantId || row?.materialFingerprint !== receipt.verificationContext.sourceFingerprint
                  || JSON.stringify(row?.verificationContext) !== JSON.stringify(receipt.verificationContext)) return false
                return onSourceReviewed()
              }} /> : null}
          </section> : null}
          {!searching && selectedId && !selected ? <ReadMessage read={exactRead} payload={exact} empty="The requested source is unavailable." loading="Loading exact source…" />
            : objects.length ? objects.map(item => {
              const source = evidence.sourceRegistry?.find(row => row.sourceId === item.sourceId)
              const status = item.reviewStatus === 'PENDING' ? 'Needs Review' : displayHubToken(item.reviewStatus)
              return <article key={item.evidenceObjectId} className="intelligence-hub__sources-evidence">
                <header><strong>{item.title || 'Evidence object'}</strong><Badge size="sm" variant="neutral">{status}</Badge></header>
                <small>Governed evidence classification and domain are unavailable in this read. A title or acceptance decision does not establish either.</small>
                <p>{item.extractedFact || item.summary || 'Evidence detail unavailable'}</p>
                <footer><Button size="sm" variant="ghost" onClick={event => { if (currentEvidence(item) && source?.sourceId === item.sourceId) onOpen({ title: 'Source and evidence provenance', body: provenance(source, item) }, event.currentTarget) }}>Inspect recorded lineage · {label(source)}</Button>
                  {searching ? <Button size="sm" variant="outline" onClick={() => focus(item.sourceId, item.evidenceObjectId)}>Open exact source and evidence</Button> : null}
                  <Button size="sm" variant="ghost" onClick={() => selectView('Review', item)}>Open in Review →</Button></footer>
              </article>
            }) : <ReadMessage read={evidenceRead} payload={evidence} empty="No matching evidence in this scope." loading="Loading evidence…" />}
        </div></Card.Body><Card.Footer><Pages receipt={evidence} page={displayedEvidencePage} canNavigate={() => currentFrame() && Boolean(evidence)} change={page => update(searching ? { evidencePage: page } : { sourceEvidencePage: page })} name="Evidence" busy={evidenceRead.isFetching} /></Card.Footer>
      </Card>
    </div>
    <footer className="intelligence-hub__sources-footer"><Button size="sm" variant="ghost" onClick={() => selectView('Context')}>← Context</Button>
      <span>Acquisition belongs to Context. Evidence decisions belong to Review.</span><Button size="sm" variant="ghost" onClick={() => selectView('Review')}>Continue to Review →</Button></footer>
  </div>
}
