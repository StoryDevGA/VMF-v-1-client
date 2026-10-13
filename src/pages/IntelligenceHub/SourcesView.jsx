import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { FiArrowUpRight, FiArrowRight, FiArrowLeft, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
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
  const searchId = useId()
  if (draftState.query !== query) setDraftState({ query, draft: query })
  const draft = draftState.draft
  return <form className="intelligence-hub__sources-search" onSubmit={event => { event.preventDefault(); submit(draft.trim()) }}>
    <label htmlFor={searchId}>Find a source or evidence</label>
    <Input id={searchId} type="search" ref={searchRef} size="sm" fullWidth aria-label="Find a source or evidence" placeholder="Source name or evidence text" title="Press Enter to search"
      maxLength={240} value={draft} onChange={event => setDraftState({ query, draft: event.target.value })} />
    <Button size="sm" type="submit" className="sr-only">Search</Button>
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
  return <nav ref={navRef} tabIndex={-1} className="intelligence-hub__filters intelligence-hub__sources-pages" aria-label={`${name} pages`}>
    <Button size="sm" variant="outline" aria-label={`Previous ${name.toLowerCase()} page`} disabled={!receipt || busy || page <= 1} onClick={() => activatePage(page - 1)}><FiChevronLeft aria-hidden="true" /></Button>
    <span>{!receipt ? busy ? 'Loading page…' : 'Page unavailable' : `Page ${page}${capped ? ' · total unavailable (partial read)' : ` of ${receipt.totalPages}`}`}</span>
    <Button size="sm" variant="outline" aria-label={`Next ${name.toLowerCase()} page`} disabled={!receipt || busy || !more || page >= 1000} onClick={() => activatePage(page + 1)}><FiChevronRight aria-hidden="true" /></Button>
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
  stateVersion, pendingCount, evidenceCount, countsLoading, locked, onOpen, onSelectView, sourceSummary, sourceSummaryLoading, onRefreshSummary,
  reviewAuthority, onSourceReviewed, onBasisInspectionReady, onRefreshWorkspace, workspaceRefreshing, refreshToken = 0 }) {
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
  const inspectionNavigation = useRef(null)
  const inspectionOwnerKey = `${verificationOwnerKey}:${stateVersion}`
  useLayoutEffect(() => {
    inspectionNavigation.current = { ownerKey: inspectionOwnerKey, selectView, retry, selected, refreshWorkspace: onRefreshWorkspace, workspaceRefreshing, currentFrame }
    return () => { inspectionNavigation.current = null }
  })
  const provenance = (source, item = {}) => {
    const evidenceInspection = Boolean(item.evidenceObjectId)
    const record = evidenceInspection ? 'Original extraction and review' : 'Source details and provenance'
    return <>
      <Select label="Record" size="sm" value={record} options={[{value:record,label:record}]} onChange={() => {}} className="intelligence-hub__inspection-record" />
      {evidenceInspection ? <><h3 className="intelligence-hub__recorded-title">{item.title || 'Evidence object'}</h3><p>{item.extractedFact || item.summary || 'Evidence detail unavailable'}</p></> : null}
      <dl className="intelligence-hub__inspection-facts">{Object.entries(evidenceInspection ? {
        Source: label(source), 'Recorded decision': displayHubToken(item.reviewStatus),
        'Exact evidence identity and location': `${item.evidenceObjectId} · Location not supplied`, Classification: 'Not assessed',
      } : {
        Source: label(source), 'Original filename': source?.sourceFileName || source?.fileName || 'Not supplied',
        'Recorded evidence': count(source?.evidenceObjectCount,source?.evidenceCountCapped),
        'Current processing receipt': 'Not supplied', 'Original file': 'Not supplied',
        'Frozen membership': 'Not established by current source records',
      }).map(([term,value])=><div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
      <p>{evidenceInspection ? 'The fragment is preserved as recorded, not rewritten as a complete or verified assertion.' : 'Extracted evidence is retained. Unavailable processing provenance is not a failed extraction.'}</p>
      <details className="intelligence-hub__source-technical"><summary>Technical basis</summary><dl className="intelligence-hub__inspection-facts">{Object.entries({
        'Source ID':source?.sourceId || 'Unavailable',Reference:source?.sourceRef || 'Unavailable',
        'Source lineage':source?.lineageRef || 'Unavailable','State version':source?.stateVersion || 'Unavailable',
        ...(evidenceInspection?{'Evidence ID':item.evidenceObjectId,'Evidence lineage':item.lineageRef || 'Unavailable','Acceptance state':displayHubToken(item.acceptanceState)}:{}),
      }).map(([term,value])=><div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
        {!evidenceInspection && onRefreshWorkspace ? <Button size="sm" variant="outline" disabled={workspaceRefreshing} onClick={() => {
          const current = inspectionNavigation.current
          if (current?.ownerKey === inspectionOwnerKey && current.selected?.sourceId === source?.sourceId && !current.workspaceRefreshing && current.currentFrame()) current.refreshWorkspace?.()
        }}>Refresh Sources reads</Button> : null}</details>
      <Button size="sm" variant="outline" onClick={() => {
        const current=inspectionNavigation.current
        if(current?.ownerKey!==inspectionOwnerKey) return
        if(evidenceInspection) { if(source?.sourceId===item.sourceId) current.selectView('Review',item) }
        else if(current.selected?.sourceId===source?.sourceId) current.selectView('Sources')
      }}>{evidenceInspection?'Inspect in Review':'Open this source'}<FiArrowRight size={14} aria-hidden="true" /></Button>
    </>
  }
  const basisOpen = useRef(null)
  useLayoutEffect(() => {
    const owner = { ownerKey: inspectionOwnerKey, contextKey, sessionRevision, route: params.toString(), stateVersion, available: !searching && Boolean(selected) && !skip,
      open: trigger => {
        if (currentFrame() && !searching && selected) onOpen({ kind: 'summary-inspection', title: 'Source details and provenance', body: provenance(selected) }, trigger)
      } }
    basisOpen.current = owner
    return () => { if (basisOpen.current === owner) basisOpen.current = null }
  })
  const basisRegistration = useMemo(() => ({
    open: trigger => { if (basisOpen.current?.ownerKey === inspectionOwnerKey) basisOpen.current.open(trigger) },
    current: () => basisOpen.current?.ownerKey === inspectionOwnerKey ? basisOpen.current : null,
  }), [inspectionOwnerKey])
  const basisAvailable = !searching && Boolean(selected) && !skip
  useLayoutEffect(() => {
    const registration = basisRegistration
    onBasisInspectionReady?.(registration, basisAvailable)
    return () => onBasisInspectionReady?.(registration, false, true)
  }, [onBasisInspectionReady, basisAvailable, basisRegistration])
  const processingInspection = () => <>
    <Select label="Record" size="sm" value="Evidence intake and processing history" options={[{value:'Evidence intake and processing history',label:'Evidence intake and processing history'}]} onChange={()=>{}} className="intelligence-hub__inspection-record" />
    <p>Acquisition is separate from recomputation and source inspection. Processing totals are shown only from current recorded receipts.</p>
    <dl className="intelligence-hub__inspection-facts">{Object.entries({
      'Current processing provenance':sourceProcessingLabel(usableScope?sourceSummary:null,sourceSummaryLoading),
      'Recorded sources':count(usableScope?sourceSummary?.uniqueSourceCount:null),
      'Current-content verified receipts':count(usableScope?sourceSummary?.knownProcessedCount:null),
      'Unknown processing receipts':count(usableScope?sourceSummary?.unknownCount:null),
    }).map(([term,value])=><div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
    <p>{sourceProcessingExplanation(usableScope?sourceSummary:null)}</p>
    <Button size="sm" variant="outline" onClick={()=>{const current=inspectionNavigation.current;if(current?.ownerKey===inspectionOwnerKey)current.retry()}}>Refresh processing reads</Button>
  </>
  if (!valid) return <div role="alert"><p>The Sources link contains an invalid query, page or evidence/source pair.</p>
    <Button onClick={() => update({}, true)}>Reset Sources query</Button></div>
  return <div className="intelligence-hub__sources-workspace">
    <div className="intelligence-hub__sources-summary" aria-label="Source summary">
      <span><strong>{sourceSummaryLoading ? 'Loading…' : count(usableScope ? sourceSummary ? sourceSummary.uniqueSourceCount : !query && !sourceType && !registry?.totalCapped ? registry?.total : null : null)}</strong><small>Recorded sources</small></span>
      <span><strong>{countsLoading ? 'Loading…' : count(usableScope ? evidenceCount : null)}</strong><small>Evidence objects</small></span>
      <span><strong>{countsLoading ? 'Loading…' : count(usableScope ? pendingCount : null)}</strong><small>Awaiting evidence review</small></span>
    </div>
    <details className="intelligence-hub__sources-warning">
      <summary>{sourceSummaryLoading ? 'Loading processing provenance…' : (usableScope ? sourceSummary : null)?.unknownCount ? `Processing provenance unknown for ${sourceSummary.unknownCount} document${sourceSummary.unknownCount===1?'':'s'}` : sourceProcessingLabel(usableScope ? sourceSummary : null)}</summary>
      <p>{sourceProcessingExplanation(usableScope ? sourceSummary : null)}</p>
      <Button size="sm" variant="outline" disabled={skip} onClick={event=>{if(currentFrame())onOpen({kind:'summary-inspection',title:'Evidence intake and processing history',body:processingInspection()},event.currentTarget)}}>Inspect processing history<FiArrowUpRight size={14} aria-hidden="true" /></Button>
      <Button size="sm" variant="outline" disabled={skip} onClick={retry}>Retry source reads</Button>
    </details>
    {locked ? <p className="intelligence-hub__sources-readonly">Locked revision · inspection is read-only.</p> : null}
    <div className="intelligence-hub__sources-tools">
      <Select size="sm" label="Source type" value={sourceType} options={[{ value: '', label: 'All' }, { value: 'UPLOADED_DOCUMENT', label: 'Uploaded document' }, { value: 'WEBSITE', label: 'Website' }]}
        onChange={event => update({ sourceType: event.target.value, sourcePage: 1 })} />
      <Search key={contextKey} query={query} submit={submit} />
    </div>
    <div className="intelligence-hub__sources-browser">
      <Card bordered={false} rounded={false} className="intelligence-hub__sources-registry" aria-label="Revision source registry">
        <Card.Header><h2>Source registry</h2><span>{registry ? `${sources.length} on this page · ${count(registry.total, registry.totalCapped)} ${query || sourceType ? 'matching' : 'recorded'}` : 'Current registry unavailable'}</span></Card.Header>
        <Card.Body role="region" aria-label="Source registry results" tabIndex={0}>
          {sources.length ? <ul className="intelligence-hub__sources-list">{sources.map(source => <li key={source.sourceId}>
            <Button size="sm" variant="ghost" fullWidth className="intelligence-hub__sources-row" aria-pressed={source.sourceId === selectedId}
              onClick={() => focus(source.sourceId)}><span><strong>{label(source)}</strong><small>{source.sourceType==='UPLOADED_DOCUMENT'?'Uploaded document':displayHubToken(source.sourceType)} · {count(source.evidenceObjectCount, source.evidenceCountCapped)} recorded evidence</small></span>
            </Button></li>)}</ul> : <ReadMessage read={registryRead} payload={registry} empty="No matching sources in this revision." loading="Loading sources…" />}
        </Card.Body><Card.Footer><p>{registry?.completeness === 'PARTIAL' ? 'Partial registry count. Refine the search for an exact total.' : 'Unique recorded sources in the selected revision.'}</p>
          <Pages receipt={registry} page={sourcePage} canNavigate={() => currentFrame() && Boolean(registry)} change={page => update({ sourcePage: page, sourceId: selectedId })} name="Source" busy={registryRead.isFetching} /></Card.Footer>
      </Card>
      <Card bordered={false} rounded={false} className="intelligence-hub__sources-detail" aria-label="Source evidence">
        <Card.Header><div><h2>{searching ? `Evidence matching “${query}”` : selected ? label(selected) : 'Selected source'}</h2>
          {!searching && evidenceId ? <><p>{count(focusedPair ? evidence?.total : null, focusedPair && evidence?.totalCapped)} evidence objects matching this exact focus</p>
            <Button size="sm" variant="ghost" disabled={!focusedPair || skip} onClick={browseAll}>Browse all evidence from this source</Button></> : null}
          {sourceId && query ? <Button size="sm" variant="ghost" onClick={() => {
            if (!currentFrame()) return
            selectionIntent.current = 'SEARCH_RESULTS'
            update({ sourceId: '', evidenceObjectId: '' })
          }}>Return to search results</Button> : null}
        </div>{!searching && selected ? <Button size="sm" variant="outline" onClick={event => { if (currentFrame()) onOpen({ kind: 'summary-inspection', title: 'Source details and provenance', body: provenance(selected) }, event.currentTarget) }}>Source details<FiArrowUpRight size={14} aria-hidden="true" /></Button> : null}</Card.Header>
        <Card.Body><div ref={detailRef} role="region" aria-label={searching ? 'Evidence search results' : 'Selected source detail'} tabIndex={0}>
          <p className="intelligence-hub__sources-classification">Classification and domain are not assessed. Accepted does not mean verified.</p>
          {!searching && selectedId && !selected ? <ReadMessage read={exactRead} payload={exact} empty="The requested source is unavailable." loading="Loading exact source…" />
            : objects.length ? objects.map(item => {
              const source = evidence.sourceRegistry?.find(row => row.sourceId === item.sourceId)
              const status = item.reviewStatus === 'PENDING' ? 'Needs Review' : displayHubToken(item.reviewStatus)
              return <article key={item.evidenceObjectId} className="intelligence-hub__sources-evidence" data-state={item.reviewStatus}>
                <header><strong>{item.title || 'Evidence object'}</strong><Badge size="sm" variant={item.reviewStatus === "ACCEPTED" ? "success" : item.reviewStatus === "PENDING" ? "warning" : item.reviewStatus === "REJECTED" ? "danger" : "neutral"}>{status}</Badge></header>
                <p>{item.extractedFact || item.summary || 'Evidence detail unavailable'}</p>
                <footer><Button size="sm" variant="outline" aria-label={`Inspect recorded lineage · ${label(source)}`} onClick={event => { if (currentEvidence(item) && source?.sourceId === item.sourceId) onOpen({ kind: 'summary-inspection', title: 'Original extraction and review', body: provenance(source, item) }, event.currentTarget) }}>Recorded text and Review<FiArrowUpRight size={14} aria-hidden="true" /></Button>
                  {searching ? <Button size="sm" variant="outline" onClick={() => focus(item.sourceId, item.evidenceObjectId)}>Open exact source and evidence</Button> : null}
</footer>
              </article>
            }) : <ReadMessage read={evidenceRead} payload={evidence} empty="No matching evidence in this scope." loading="Loading evidence…" />}
            {!searching && selected ? <details className="intelligence-hub__sources-review" aria-label="Recorded source verification"><summary>Source review · {selected.verificationContext ? selected.verificationContext.sourceFingerprint === selected.materialFingerprint ? `Recorded review · ${displayHubToken(selected.verificationContext.authenticity)} · ${selected.verificationContext.reviewedAt}` : 'The recorded source review is stale. Review the current source before assessment.' : 'No source verification review is recorded.'}</summary>
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
            </details> : null}
        </div></Card.Body><Card.Footer><p>{searching ? `${count(evidence?.total, evidence?.totalCapped)} matching evidence objects`
            : `${count(matchingSourceBasis ? selected.evidenceObjectCount : null, matchingSourceBasis && selected.evidenceCountCapped)} evidence objects from this source`}</p><Pages receipt={evidence} page={displayedEvidencePage} canNavigate={() => currentFrame() && Boolean(evidence)} change={page => update(searching ? { evidencePage: page } : { sourceEvidencePage: page })} name="Evidence" busy={evidenceRead.isFetching} /></Card.Footer>
      </Card>
    </div>
    <footer className="intelligence-hub__sources-footer"><Button size="sm" variant="ghost" onClick={() => selectView('Context')} aria-label="← Context"><FiArrowLeft size={14} aria-hidden="true" />Context</Button>
      <span>Navigation does not approve evidence or change the revision.</span><Button size="sm" variant="ghost" onClick={() => selectView('Review')} aria-label="Continue to Review →">Review<FiArrowRight size={14} aria-hidden="true" /></Button></footer>
  </div>
}
