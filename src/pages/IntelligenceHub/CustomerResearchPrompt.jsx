import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Dialog } from '../../components/Dialog'
import { Fieldset } from '../../components/Fieldset'
import { Tickbox } from '../../components/Tickbox'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { Button } from '../../components/Button'
import { PUBLIC_RESEARCH_SOURCES } from '../../constants/publicResearchSources.js'
import { buildCustomerResearchPrompt, normalizeCustomerResearchLinks, CUSTOMER_RESEARCH_PROMPT_MAX_LINKS } from '../../utils/customerSuppliedResearch.js'
import { useGetRuntimeStateSourcesQuery, useGetAcquisitionRunsQuery, useGetAcquisitionRunQuery } from '../../store/api/runtimeInstanceApi.js'
import { getHubPayload, getRecordedCustomerResearch } from './intelligenceHubModel.js'
import { readAcquisitionRun, isAcquisitionRunId } from './acquisitionRunContract.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'

const text = (value, max = 240) => typeof value === 'string' && value.length > 0 && value.length <= max
  && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value) // eslint-disable-line no-control-regex -- Recorded identifiers reject controls.
const sameScope = (value, scope) => value?.customerId === scope.customerId && value?.tenantId === scope.tenantId
  && [value.id, value.runtimeInstanceId, value.runtimeInstanceKey].includes(scope.runtimeInstanceId)
const settled = read => !read.isFetching && !read.isLoading && !read.error

function sourcePage(read, scope, page) {
  const value = getHubPayload(read.currentData)
  if (!settled(read) || value?.contractVersion !== 'intelligence-source-registry.v1'
    || !sameScope(value.control, scope) || !sameScope(value.scope, scope) || value.control.stateVersion !== scope.stateVersion
    || value.stateVersion !== scope.stateVersion || value.currency !== 'AS_READ'
    || value.page !== page || value.pageSize !== 25 || !Array.isArray(value.sourceRegistry)
    || value.sourceRegistry.length > 25
    || !['COMPLETE', 'PARTIAL'].includes(value.completeness) || typeof value.totalCapped !== 'boolean'
    || new Set(value.sourceRegistry.map(row => row?.sourceId)).size !== value.sourceRegistry.length
    || value.sourceRegistry.some(row => !text(row?.sourceId) || !text(row.sourceType, 100)
      || row.stateVersion !== scope.stateVersion || row.sourceStateVersion !== scope.stateVersion)) return null
  if (value.totalCapped) {
    if (value.completeness !== 'PARTIAL' || value.total !== null || value.totalPages !== null || value.hasMore !== null) return null
  } else if (value.completeness !== 'COMPLETE' || !Number.isSafeInteger(value.total) || value.total < 0
    || value.totalPages !== Math.max(1, Math.ceil(value.total / 25))
    || value.hasMore !== (page < value.totalPages)
    || value.sourceRegistry.length !== Math.min(25, Math.max(0, value.total - (page - 1) * 25))) return null
  return value
}

function runPage(read, scope) {
  const value = read.currentData?.data
  if (!settled(read) || value?.contractVersion !== 'acquisition-run.v1' || !sameScope(value.scope, scope)
    || value.observedStateVersion !== scope.stateVersion
    || !Array.isArray(value.items) || value.items.length > 25 || typeof value.hasMore !== 'boolean'
    || value.hasMore && (!text(value.nextCursor, 256))
    || new Set(value.items.map(row => row?.runId)).size !== value.items.length
    || value.items.some(row => !readAcquisitionRun(row, scope))) return null
  return value
}

function recordedLink(row, scope) {
  if (row.sourceType === 'UPLOADED_DOCUMENT') {
    const report = getRecordedCustomerResearch(row, scope.stateVersion)
    if (!report?.delivery || report.delivery.authorization.scope.customerId !== scope.customerId
      || report.delivery.authorization.scope.tenantId !== scope.tenantId) return null
  }
  const candidate = { key: 'source:' + row.sourceId, title: row.label || row.sourceId,
    url: row.sourceRef || row.url, kind: 'RECORDED_SOURCE', sourceId: row.sourceId,
    sourceType: row.customerSuppliedResearch ? 'CUSTOMER_SUPPLIED_RESEARCH' : text(row.publicResearchProvenance?.category, 100) ? row.publicResearchProvenance.category : row.sourceType,
    ...(typeof row.sourceCapture?.capturedAt === 'string' && Number.isFinite(Date.parse(row.sourceCapture.capturedAt)) ? { retrievedAt: row.sourceCapture.capturedAt } : {}),
    ...(text(row.reviewStatus, 100) ? { reviewStatus: row.reviewStatus } : {}) }
  const normalized = normalizeCustomerResearchLinks([candidate])[0]
  return normalized || null
}

const readMessage = (read, page, empty) => read.isLoading || read.isFetching ? 'Loading saved records…'
  : read.error || !page ? 'This scoped read is unavailable or inconsistent. Retry before exporting its selected links.'
    : empty

export default function CustomerResearchPrompt(props) {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const owner = JSON.stringify([props.scope, props.basisUpdatedAt, props.savedBrief, props.savedSettings, sessionRevision])
  return <ScopedCustomerResearchPrompt key={owner} {...props} currentSession={sessionRevision} />
}

function ScopedCustomerResearchPrompt({ savedBrief, savedSettings = null, scope, basisUpdatedAt,
  active, disabled, onClose, stagedChanges = false, currentSession }) {
  const [categories, setCategories] = useState([])
  const [links, setLinks] = useState([])
  const [questions, setQuestions] = useState('')
  const [page, setPage] = useState(1)
  const [cursors, setCursors] = useState([null])
  const [runId, setRunId] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [selectionError, setSelectionError] = useState('')
  const enabled = active && !disabled && currentSession === scope.sessionRevision
    && [scope.runtimeInstanceId, scope.customerId, scope.tenantId, scope.stateVersion].every(value => text(value))
    && text(basisUpdatedAt) && Boolean(savedBrief?.companyName?.trim())
  const cursor = cursors[cursors.length - 1]
  const sourceRead = useGetRuntimeStateSourcesQuery({ ...scope, page, pageSize: 25 }, { skip: !enabled })
  const historyRead = useGetAcquisitionRunsQuery({ ...scope, cursor }, { skip: !enabled })
  const detailRead = useGetAcquisitionRunQuery({ ...scope, runId }, { skip: !enabled || !isAcquisitionRunId(runId) })
  const sources = enabled ? sourcePage(sourceRead, scope, page) : null
  const history = enabled ? runPage(historyRead, scope) : null
  const detail = enabled && runId && settled(detailRead) ? readAcquisitionRun(detailRead.currentData?.data, scope) : null
  const selectedRun = detail?.runId === runId && detail.observedStateVersion === scope.stateVersion ? detail : null
  const sourceLinks = sources ? sources.sourceRegistry.map(row => recordedLink(row, scope)).filter(Boolean) : []
  const discoveries = selectedRun?.discovery?.items?.map(item => ({ key: 'discovery:' + runId + ':' + item.resultOrder,
    title: item.title, url: item.url, kind: 'SEARCH_DISCOVERY', runId,
    retrievedAt: selectedRun.discovery.retrievedAt })) || []
  const hasSources = links.some(link => link.kind === 'RECORDED_SOURCE')
  const hasSearch = links.some(link => link.kind === 'SEARCH_DISCOVERY')
  const selectedReadUnavailable = hasSources && !sources || hasSearch && (!history || runId && !selectedRun)
  const canCopy = Boolean(enabled && !selectedReadUnavailable && questions.length <= 4000)
  const prompt = buildCustomerResearchPrompt(savedBrief, savedSettings, { categories, links, questions })
  const mounted = useRef(true), frame = useRef(null), latest = useRef(null), attempt = useRef(0), promptPreview = useRef(null)
  const token = Symbol('prompt-frame')
  useLayoutEffect(() => {
    frame.current = token
    const key = JSON.stringify([prompt, canCopy])
    latest.current = { prompt, canCopy, key, epoch: latest.current?.key === key ? latest.current.epoch : (latest.current?.epoch || 0) + 1 }
    return () => { if (frame.current === token) frame.current = null }
  })
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; latest.current = null; attempt.current += 1 } }, [])
  const owned = () => mounted.current && enabled && frame.current === token
    && getSessionRevision() === scope.sessionRevision
  const change = update => {
    if (!owned()) return
    setFeedback(null); setSelectionError('')
    update()
  }
  const toggleLink = (candidate, checked) => {
    if (!owned() || ![...sourceLinks, ...discoveries].some(link => link === candidate)) return
    const next = checked ? [...links.filter(link => link.key !== candidate.key), candidate] : links.filter(link => link.key !== candidate.key)
    if (normalizeCustomerResearchLinks(next).length > CUSTOMER_RESEARCH_PROMPT_MAX_LINKS) {
      setSelectionError('Select up to ' + CUSTOMER_RESEARCH_PROMPT_MAX_LINKS + ' distinct links for this prompt.'); return
    }
    change(() => setLinks(next))
  }
  const copy = async () => {
    if (!owned() || !canCopy) return
    const copyAttempt = ++attempt.current, epoch = latest.current?.epoch
    const current = () => mounted.current && getSessionRevision() === scope.sessionRevision
      && latest.current?.epoch === epoch && latest.current?.prompt === prompt && latest.current?.canCopy && copyAttempt === attempt.current
    setFeedback(null)
    let copied = false
    try {
      await navigator.clipboard.writeText(prompt)
      copied = true
    } catch {
      // A late rejection must not initiate another write for an old prompt or session.
      if (!current()) return
      const preview = promptPreview.current
      if (preview?.isConnected && preview.value === prompt) {
        const focused = document.activeElement
        const { selectionStart, selectionEnd, selectionDirection } = preview
        try {
          preview.focus({ preventScroll: true })
          preview.select()
          if (current() && preview.isConnected && preview.value === prompt) copied = document.execCommand?.('copy') === true
        } catch {
          copied = false
        } finally {
          if (current() && preview.isConnected && promptPreview.current === preview) {
            preview.setSelectionRange(selectionStart, selectionEnd, selectionDirection)
            if (document.activeElement === preview && focused?.isConnected) focused.focus?.({ preventScroll: true })
          }
        }
      }
    }
    if (current()) setFeedback({ prompt, message: copied
      ? 'Prompt copied. Choose where to paste it; no research was started.'
      : 'The prompt could not be copied. Select the preview text and copy it manually.' })
  }
  const refreshRead = read => { if (owned() && !read.isUninitialized && !read.isFetching) read.refetch?.() }
  const linkOptions = (options, kind) => options.map(link => <div key={link.key}>
    <Tickbox size="sm" className="intelligence-hub__prompt-option" label={link.title + ' — ' + (kind === 'SEARCH_DISCOVERY' ? 'Discovery only' : 'Recorded source pointer')}
      checked={links.some(selected => selected.key === link.key)} disabled={!enabled}
      onChange={event => toggleLink(link, event.target.checked)} />
    <p className="intelligence-hub__prompt-url">{link.url} · {link.sourceType || 'Search discovery'}{link.reviewStatus ? ' · ' + link.reviewStatus : ''}</p>
  </div>)
  return <Dialog open onClose={onClose} size="lg" className="intelligence-hub__inspection-dialog" aria-label="Customer-supplied research prompt">
    <Dialog.Header><h2>Customer-supplied research prompt</h2></Dialog.Header>
    <Dialog.Body>
      <p>Review this saved-context prompt before copying. It contains your brief; paste it only into a tool you are authorised to use. StorylineOS does not send it to an external tool.</p>
      <p>These choices are local to this prompt and reset when it closes. They do not change native research settings, availability or permissions.</p>
      {stagedChanges ? <p role="status">Staged brief edits are excluded. This preview uses the saved brief.</p> : null}
      {!savedSettings ? <p>Current saved research settings are unavailable or stale and are excluded from this prompt.</p> : null}
      <Fieldset disabled={!enabled}><Fieldset.Legend>External-tool source categories</Fieldset.Legend><Fieldset.Content>
        <p>Choose only the categories you want your permitted external tool to investigate. None are selected automatically. Selection grants no source access or StorylineOS integration.</p>
        {PUBLIC_RESEARCH_SOURCES.map(source => <Tickbox key={source.key} size="sm" label={source.label} checked={categories.includes(source.key)}
          onChange={event => change(() => setCategories(event.target.checked ? [...categories, source.key] : categories.filter(key => key !== source.key)))} />)}
      </Fieldset.Content></Fieldset>
      <section aria-label="Existing source links"><h3>Existing source links</h3>
        <p>Recorded URL pointers with fragments omitted, not automatic confirmation or permission. Uploaded files without a recorded public delivery URL are not link options.</p>
        {sources ? sourceLinks.length ? linkOptions(sourceLinks, 'RECORDED_SOURCE') : <p>No usable HTTP/S source links are recorded on this page.</p>
          : <p role="status">{readMessage(sourceRead, sources)}</p>}
        <div className="intelligence-hub__filters">
          <Button size="sm" variant="outline" disabled={!enabled || !sources || page <= 1} onClick={() => change(() => setPage(page - 1))}>Previous source page</Button>
          <span>{sources ? 'Source page ' + page + (sources.totalCapped ? ' · partial total' : ' of ' + sources.totalPages) : 'Source page unavailable'}</span>
          <Button size="sm" variant="outline" disabled={!enabled || !sources || !(sources.totalCapped ? sources.sourceRegistry.length === 25 : sources.hasMore) || page >= 1000} onClick={() => change(() => setPage(page + 1))}>Next source page</Button>
          <Button size="sm" variant="outline" disabled={!enabled || sourceRead.isFetching} onClick={() => refreshRead(sourceRead)}>Refresh source links</Button>
        </div>
      </section>
      <section aria-label="Existing search discoveries"><h3>Existing search discoveries</h3>
        <p>Select a saved Run to inspect its actual search discoveries. Historical results are starting pointers, not captured originals or current verified facts.</p>
        {history ? <>
          <Select size="sm" label="Saved research Run" value={runId} disabled={!enabled}
            options={[{ value: '', label: 'Choose a saved Run' }, ...history.items.map(run => ({ value: run.runId, label: run.status + ' · ' + run.runId }))]}
            onChange={event => { const value = event.target.value; if (!value || history.items.some(run => run.runId === value)) change(() => setRunId(value)) }} />
          {!history.items.length ? <p>No saved Runs were returned on this page.</p> : null}
        </> : <p role="status">{readMessage(historyRead, history)}</p>}
        <div className="intelligence-hub__filters">
          <Button size="sm" variant="outline" disabled={!enabled || !history || cursors.length <= 1} onClick={() => change(() => { setCursors(cursors.slice(0, -1)); setRunId('') })}>Previous Run page</Button>
          <Button size="sm" variant="outline" disabled={!enabled || !history?.hasMore} onClick={() => change(() => { setCursors([...cursors, history.nextCursor]); setRunId('') })}>Next Run page</Button>
          <Button size="sm" variant="outline" disabled={!enabled || historyRead.isFetching} onClick={() => refreshRead(historyRead)}>Refresh saved Runs</Button>
        </div>
        {runId ? selectedRun ? discoveries.length ? linkOptions(discoveries, 'SEARCH_DISCOVERY')
          : <p>No eligible search discoveries are recorded for this Run.</p>
          : <p role="status">{readMessage(detailRead, selectedRun)}</p> : null}
        {runId ? <Button size="sm" variant="outline" disabled={!enabled || detailRead.isFetching} onClick={() => refreshRead(detailRead)}>Refresh selected Run</Button> : null}
      </section>
      <section aria-label="Selected starting links"><h3>Selected starting links</h3>
        <p>{normalizeCustomerResearchLinks(links).length} of {CUSTOMER_RESEARCH_PROMPT_MAX_LINKS} distinct links selected. Repeated URLs are not independent corroboration.</p>
        {links.map(link => <div key={link.key} className="intelligence-hub__prompt-selection"><span>{link.title} · {link.kind === 'SEARCH_DISCOVERY' ? 'Discovery only' : 'Recorded source pointer'}</span>
          <Button size="sm" variant="outline" disabled={!enabled} onClick={() => change(() => setLinks(links.filter(row => row.key !== link.key)))} aria-label={'Remove selected link ' + link.title}>Remove</Button></div>)}
        {selectionError ? <p role="alert">{selectionError}</p> : null}
        {selectedReadUnavailable ? <p role="alert">A read used by selected links is unavailable. Retry it or remove those links before copying.</p> : null}
      </section>
      <Textarea label="Customer research questions / gaps (optional)" size="sm" fullWidth rows={3} maxLength={4000} value={questions} disabled={!enabled}
        onChange={event => change(() => setQuestions(event.target.value))} />
      <p>These are your requests to investigate, not assessed system findings. No questions supplied does not mean there are no research gaps.</p>
      {questions.length > 4000 ? <p role="alert">Use up to 4000 characters for customer questions.</p> : null}
      <Textarea ref={promptPreview} label="Research prompt from saved context" size="sm" fullWidth rows={14} value={prompt} readOnly />
      {feedback?.prompt === prompt ? <p role="status">{feedback.message}</p> : null}
    </Dialog.Body>
    <Dialog.Footer><Button size="sm" disabled={!canCopy} onClick={copy}>Copy prompt</Button>
      <Button size="sm" variant="outline" onClick={onClose}>Back to Context</Button></Dialog.Footer>
  </Dialog>
}
