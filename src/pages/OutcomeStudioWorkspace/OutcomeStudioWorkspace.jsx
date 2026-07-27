import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  MdArrowBack,
  MdCheckCircle,
  MdDeleteOutline,
  MdDownload,
  MdOutlineArticle,
  MdPlayArrow,
  MdPublish,
  MdRefresh,
  MdVisibility,
} from 'react-icons/md'
import { Button, ButtonGroup } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { TabView } from '../../components/TabView'
import { Textarea } from '../../components/Textarea'
import { useToaster } from '../../components/Toaster'
import {
  useApproveRuntimeOutcomeDraftMutation,
  useCreateRuntimeOutcomeSessionMutation,
  useDiscardRuntimeOutcomeDraftMutation,
  useGenerateRuntimeOutcomeResponseMutation,
  useGetRuntimeOutcomeStudioQuery,
  useGetRuntimeOutcomeStudioReadinessQuery,
  useGetRuntimeOutcomeSessionQuery,
  useLazyExportRuntimeOutcomeAssetQuery,
  useLazyGetRuntimeOutcomeAssetPreviewQuery,
  useLazyGetRuntimeOutcomeAssetQuery,
  useLazyGetRuntimeOutcomeDraftPreviewQuery,
  usePublishRuntimeOutcomeAssetMutation,
  useSubmitRuntimeOutcomeMessageMutation,
  useUpdateRuntimeOutcomeSessionFromLatestTruthMutation,
} from '../../store/api/runtimeInstanceApi.js'
import { formatDateTime } from '../../utils/dateTime.js'
import { normalizeError, stripRequestReference } from '../../utils/errors.js'
import {
  formatRuntimeTokenLabel,
  getOutcomeStudioReturnTarget,
} from '../../utils/runtimeWorkspace.js'
import './OutcomeStudioWorkspace.css'

const EMPTY_ARRAY = Object.freeze([])
const DOWNLOAD_CLEANUP_DELAY_MS = 1000
const REQUEST_HISTORY_PREVIEW_LIMIT = 5

const payload = (response) => response?.data ?? response ?? null
const token = (value) => String(value || '').trim().toUpperCase()
const idOf = (record, keys) => String(keys.map((key) => record?.[key]).find(Boolean) || '').trim()
const sessionIdOf = (session) => idOf(session, ['sessionId', 'id', '_id'])
const draftIdOf = (draft) => idOf(draft, ['draftId', 'id', '_id'])
const assetIdOf = (asset) => idOf(asset, ['outcomeAssetId', 'assetId', 'id', '_id'])

const informationCurrentnessOf = (record) => token(
  record?.informationStatus?.currentness
  || record?.informationStatus?.status
  || record?.truthSignature?.currentness
  || record?.truthSignature?.status
  || 'UNKNOWN',
)

const isInformationCurrent = (record) => informationCurrentnessOf(record) === 'CURRENT'

const activeSessionFrom = (studio) => {
  const sessions = Array.isArray(studio?.sessions) ? studio.sessions : EMPTY_ARRAY
  return sessions.find((session) => token(session?.status) === 'ACTIVE') || null
}

const buildDraftRows = (drafts, { sessionInformationCurrent }) => drafts.map((draft, index) => {
  const draftId = draftIdOf(draft)
  const informationCurrentness = informationCurrentnessOf(draft)
  const approvalDisabledReason = !draftId
    ? 'Approval is unavailable until the draft has been persisted.'
    : draft.approvalAvailable === false
      ? 'Approval is not available for this draft.'
      : !sessionInformationCurrent || informationCurrentness !== 'CURRENT'
        ? 'Approval is blocked until the draft uses current verified business information.'
        : ''
  const previewDisabledReason = !draftId
    ? 'Preview is unavailable until the draft has been persisted.'
    : draft.approvalAvailable === false
      ? 'Preview is unavailable until the draft passes content review.'
      : !sessionInformationCurrent || informationCurrentness !== 'CURRENT'
        ? 'Preview is blocked until the draft uses current verified business information.'
        : ''

  return {
    approvalDisabledReason,
    draft,
    draftId,
    informationCurrentness,
    key: draftId || `unpersisted-draft-${index}`,
    previewDisabledReason,
    readyToApprove: !approvalDisabledReason,
  }
})

const statusVariant = (value) => {
  const normalized = token(value)
  if (['READY', 'CURRENT', 'ACTIVE', 'APPROVED', 'PUBLISHED', 'PASSED', 'RESPONSE_READY', 'RESPONSE_GENERATED'].includes(normalized)) return 'success'
  if (['BLOCKED', 'FAILED', 'ERROR', 'STALE', 'OBSOLETE'].includes(normalized)) return 'error'
  if (['PENDING', 'PENDING_RESPONSE', 'DRAFT', 'READY_WITH_GAPS', 'OUT_OF_DATE'].includes(normalized)) return 'warning'
  return 'neutral'
}

const resolveDeliverableKey = ({ deliverableKey, requestedOutputTypeKey, deliverables }) => {
  const availableKeys = new Set(deliverables.map((item) => item.key))
  const candidates = [
    String(deliverableKey || '').trim().toLowerCase(),
    String(requestedOutputTypeKey || '').trim().toLowerCase(),
    deliverables[0]?.key || '',
  ]
  return candidates.find((candidate) => availableKeys.has(candidate)) || ''
}

const renderSafeMarkdown = (markdown) => {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let paragraph = []
  let list = null

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }
  const flushList = () => {
    if (!list) return
    blocks.push(list)
    list = null
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/)
    const unorderedItem = trimmed.match(/^[-*]\s+(.+)$/)
    const orderedItem = trimmed.match(/^\d+[.)]\s+(.+)$/)

    if (!trimmed) {
      flushParagraph()
      flushList()
    } else if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ level: heading[1].length, text: heading[2], type: 'heading' })
    } else if (unorderedItem || orderedItem) {
      flushParagraph()
      const type = orderedItem ? 'ordered-list' : 'unordered-list'
      if (list?.type !== type) flushList()
      if (!list) list = { items: [], type }
      list.items.push((orderedItem || unorderedItem)[1])
    } else {
      flushList()
      paragraph.push(trimmed)
    }
  })
  flushParagraph()
  flushList()

  return blocks.map((block, index) => {
    const key = `${block.type}-${index}`
    if (block.type === 'heading') {
      const Heading = `h${Math.min(block.level + 3, 6)}`
      return <Heading key={key}>{block.text}</Heading>
    }
    if (block.type === 'ordered-list') {
      return <ol key={key}>{block.items.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{item}</li>)}</ol>
    }
    if (block.type === 'unordered-list') {
      return <ul key={key}>{block.items.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{item}</li>)}</ul>
    }
    return <p key={key}>{block.text}</p>
  })
}

const refetchAll = async (...refetchers) => {
  const results = await Promise.allSettled(
    refetchers.filter((refetcher) => typeof refetcher === 'function').map((refetcher) => refetcher()),
  )
  const rejected = results.find((result) => result.status === 'rejected')
  if (rejected) throw rejected.reason
}

const downloadExport = (exported, fallbackName, fallbackMimeType) => {
  const isBase64 = exported?.encoding === 'base64' && exported?.contentBase64
  let content = exported?.content
  if (isBase64) {
    try {
      const binary = window.atob(exported.contentBase64)
      content = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    } catch {
      throw new Error('Export content could not be decoded.')
    }
  } else if (typeof content !== 'string') {
    content = JSON.stringify(content ?? {}, null, 2)
  }
  const objectUrl = URL.createObjectURL(new Blob([content], {
    type: exported?.mimeType || fallbackMimeType || 'application/octet-stream',
  }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = exported?.filename || fallbackName
  link.rel = 'noopener'
  link.hidden = true
  document.body.appendChild(link)
  link.click()
  window.setTimeout(() => {
    link.remove()
    URL.revokeObjectURL(objectUrl)
  }, DOWNLOAD_CLEANUP_DELAY_MS)
  return link.download
}

function OutcomeStudioWorkspace() {
  const { runtimeInstanceId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { addToast } = useToaster()
  const [activeTab, setActiveTab] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [deliverableKey, setDeliverableKey] = useState('')
  const [pendingDiscard, setPendingDiscard] = useState(null)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [selectedDraftId, setSelectedDraftId] = useState('')
  const [selectedDraftPreview, setSelectedDraftPreview] = useState(null)
  const [draftPreviewError, setDraftPreviewError] = useState(null)
  const [busyKey, setBusyKey] = useState('')
  const [showAllRequests, setShowAllRequests] = useState(false)
  const draftPreviewRequestRef = useRef(0)
  const requestedDraftIterationRef = useRef('')
  const currentSelectedDraftIterationRef = useRef('')

  const studioQuery = useGetRuntimeOutcomeStudioQuery({ runtimeInstanceId }, { skip: !runtimeInstanceId })
  const readinessQuery = useGetRuntimeOutcomeStudioReadinessQuery(
    { runtimeInstanceId },
    { skip: !runtimeInstanceId },
  )
  const studio = payload(studioQuery.data)
  const dedicatedReadiness = payload(readinessQuery.data)
  const readiness = dedicatedReadiness || studio?.readiness || {}
  const activeSession = activeSessionFrom(studio)
  const activeSessionId = sessionIdOf(activeSession)
  const sessionQuery = useGetRuntimeOutcomeSessionQuery(
    { runtimeInstanceId, sessionId: activeSessionId },
    { skip: !runtimeInstanceId || !activeSessionId },
  )
  const session = payload(sessionQuery.data) || activeSession

  const [createSession, createState] = useCreateRuntimeOutcomeSessionMutation()
  const [submitMessage, submitState] = useSubmitRuntimeOutcomeMessageMutation()
  const [generateResponse] = useGenerateRuntimeOutcomeResponseMutation()
  const [updateTruth, updateTruthState] = useUpdateRuntimeOutcomeSessionFromLatestTruthMutation()
  const [approveDraft] = useApproveRuntimeOutcomeDraftMutation()
  const [discardDraft, discardState] = useDiscardRuntimeOutcomeDraftMutation()
  const [publishAsset] = usePublishRuntimeOutcomeAssetMutation()
  const [exportAsset] = useLazyExportRuntimeOutcomeAssetQuery()
  const [loadAsset, assetDetailState] = useLazyGetRuntimeOutcomeAssetQuery()
  const [loadPreview, assetPreviewState] = useLazyGetRuntimeOutcomeAssetPreviewQuery()
  const [loadDraftPreview] = useLazyGetRuntimeOutcomeDraftPreviewQuery()

  const deliverables = useMemo(() => (
    (Array.isArray(studio?.deliverables?.available) ? studio.deliverables.available : EMPTY_ARRAY)
      .map((item) => ({
        ...item,
        key: String(item?.key || '').trim().toLowerCase(),
        label: String(item?.label || '').trim(),
      }))
      .filter((item) => item.key && item.label)
  ), [studio?.deliverables?.available])
  const selectedDeliverableKey = resolveDeliverableKey({
    deliverableKey,
    requestedOutputTypeKey: session?.requestedOutputTypeKey,
    deliverables,
  })
  const messages = Array.isArray(session?.messages) ? session.messages : EMPTY_ARRAY
  const requestMessages = messages.filter((message) => token(message?.role) !== 'ASSISTANT')
  const newestFirstRequestMessages = [...requestMessages].reverse()
  const visibleMessages = showAllRequests
    ? newestFirstRequestMessages
    : newestFirstRequestMessages.slice(0, REQUEST_HISTORY_PREVIEW_LIMIT)
  const drafts = (Array.isArray(session?.drafts) ? session.drafts : EMPTY_ARRAY)
    .filter((draft) => token(draft?.status) === 'ACTIVE')
  const assets = Array.isArray(session?.assets)
    ? session.assets
    : Array.isArray(studio?.assets) ? studio.assets : EMPTY_ARRAY
  const selectedAsset = assets.find((asset) => assetIdOf(asset) === selectedAssetId) || null
  const selectedAssetDetail = payload(assetDetailState.data)
  const selectedPreview = payload(assetPreviewState.data)
  const previewError = assetDetailState.error || assetPreviewState.error
  const previewLoading = assetDetailState.isFetching || assetPreviewState.isFetching
  const draftPreviewSupportError = draftPreviewError
    ? {
        ...normalizeError(draftPreviewError),
        message: 'This draft preview is temporarily unavailable. Refresh and try again.',
      }
    : null
  const information = studio?.information || studio?.truthBinding?.truthSignature || {}
  const isSessionInformationCurrent = !activeSessionId || isInformationCurrent(session)
  const draftRows = buildDraftRows(drafts, { sessionInformationCurrent: isSessionInformationCurrent })
  const selectedDraftRow = draftRows.find((row) => row.draftId === selectedDraftId) || null
  const selectedDraftIterationId = String(selectedDraftRow?.draft?.currentIterationId || '').trim()
  currentSelectedDraftIterationRef.current = selectedDraftIterationId
  const readyDraftCount = draftRows.filter((row) => row.readyToApprove).length
  const unavailableDraftCount = draftRows.length - readyDraftCount
  const conversationEnabled = studio?.conversation?.enabled === true && isSessionInformationCurrent
  const responseGenerationAvailable = (
    studio?.safetyGates?.responseGenerationAvailable === true
    && dedicatedReadiness?.canReason === true
    && dedicatedReadiness?.safetyGates?.responseGenerationAvailable === true
  )
  const generationBlockedReason = !isSessionInformationCurrent
    ? 'Draft generation is blocked until the session uses current verified business information.'
    : !responseGenerationAvailable
      ? 'Draft generation is not available until the required information and content checks are complete.'
      : ''
  const loading = studioQuery.isLoading || readinessQuery.isLoading
  const pageError = studioQuery.error || readinessQuery.error

  useEffect(() => {
    draftPreviewRequestRef.current += 1
    setShowAllRequests(false)
    setSelectedDraftId('')
    setSelectedDraftPreview(null)
    setDraftPreviewError(null)
    requestedDraftIterationRef.current = ''
    setBusyKey((current) => current.startsWith('preview:') ? '' : current)
  }, [activeSessionId])

  useEffect(() => {
    if (
      !selectedDraftId
      || !requestedDraftIterationRef.current
      || requestedDraftIterationRef.current === selectedDraftIterationId
    ) return

    draftPreviewRequestRef.current += 1
    requestedDraftIterationRef.current = ''
    setSelectedDraftId('')
    setSelectedDraftPreview(null)
    setDraftPreviewError(null)
    setBusyKey((current) => current.startsWith('preview:') ? '' : current)
  }, [selectedDraftId, selectedDraftIterationId])

  const notify = (title, description, variant = 'success') => addToast({ title, description, variant })
  const failureMessage = (error) => {
    const normalized = normalizeError(error)
    return `${stripRequestReference(normalized.message)}${normalized.requestId ? ` Reference: ${normalized.requestId}` : ''}`
  }
  const previewFailureMessage = (error) => {
    const normalized = normalizeError(error)
    const reference = normalized.requestId ? ` Reference: ${normalized.requestId}` : ''
    return `This output preview is temporarily unavailable. Refresh and try again.${reference}`
  }

  const refreshFailureMessage = (error) => {
    const normalized = normalizeError(error)
    const reference = normalized.requestId ? ` Reference: ${normalized.requestId}` : ''
    return `The change was saved, but the latest Outcome Studio information could not be loaded. Refresh the page.${reference}`
  }

  const refreshAfterMutation = async (
    message,
    {
      title = 'Outcome Studio updated',
      refetchers = [sessionQuery.refetch, studioQuery.refetch, readinessQuery.refetch],
    } = {},
  ) => {
    try {
      await refetchAll(...refetchers)
    } catch (error) {
      notify('Outcome Studio refresh needed', refreshFailureMessage(error), 'warning')
      return false
    }
    notify(title, message)
    return true
  }

  const handleStartSession = async () => {
    if (!selectedDeliverableKey) return
    try {
      await createSession({
        runtimeInstanceId,
        body: {
          requestedOutputTypeKey: selectedDeliverableKey,
          ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
        },
      }).unwrap()
      setPrompt('')
      await refreshAfterMutation('Outcome Studio session started.', {
        refetchers: [studioQuery.refetch, readinessQuery.refetch],
      })
    } catch (error) {
      notify('Outcome Studio action failed', failureMessage(error), 'error')
    }
  }

  const handleSubmit = async () => {
    if (!activeSessionId || !prompt.trim() || !selectedDeliverableKey) return
    try {
      await submitMessage({
        runtimeInstanceId,
        sessionId: activeSessionId,
        body: { prompt: prompt.trim(), requestedOutputTypeKey: selectedDeliverableKey },
      }).unwrap()
      setPrompt('')
      await refreshAfterMutation('Outcome Studio request submitted.')
    } catch (error) {
      notify('Outcome Studio action failed', failureMessage(error), 'error')
    }
  }

  const handleGenerate = async (message) => {
    const messageId = idOf(message, ['messageId', 'id', '_id'])
    if (!activeSessionId || !messageId || generationBlockedReason) return
    setBusyKey(`generate:${messageId}`)
    try {
      await generateResponse({ runtimeInstanceId, sessionId: activeSessionId, messageId, body: {} }).unwrap()
      await refreshAfterMutation('Outcome Studio draft generated.')
    } catch (error) {
      notify('Outcome Studio action failed', failureMessage(error), 'error')
    } finally {
      setBusyKey('')
    }
  }

  const handleUpdateTruth = async () => {
    if (!activeSessionId) return
    try {
      await updateTruth({ runtimeInstanceId, sessionId: activeSessionId, body: {} }).unwrap()
      await refreshAfterMutation('Outcome Studio information updated.')
    } catch (error) {
      notify('Outcome Studio action failed', failureMessage(error), 'error')
    }
  }

  const handleApprove = async (draftRow) => {
    const { draftId } = draftRow || {}
    if (!activeSessionId || !draftId || draftRow.approvalDisabledReason) return false

    setBusyKey(`approve:${draftId}`)
    try {
      await approveDraft({ runtimeInstanceId, sessionId: activeSessionId, draftId, body: {} }).unwrap()
      await refreshAfterMutation('Working draft approved as a governed output.')
      setActiveTab(2)
      return true
    } catch (error) {
      notify('Outcome Studio action failed', failureMessage(error), 'error')
      return false
    } finally {
      setBusyKey('')
    }
  }

  const handleDiscard = async () => {
    const draftId = draftIdOf(pendingDiscard)
    if (!draftId || !pendingDiscard?.updatedAt) return
    try {
      await discardDraft({
        runtimeInstanceId,
        sessionId: activeSessionId,
        draftId,
        expectedUpdatedAt: pendingDiscard.updatedAt,
      }).unwrap()
      setPendingDiscard(null)
      await refreshAfterMutation(
        'The draft was retained in history and removed from active work.',
        {
          title: 'Working draft discarded',
          refetchers: [sessionQuery.refetch, studioQuery.refetch],
        },
      )
    } catch (error) {
      notify('Draft discard failed', failureMessage(error), 'error')
    }
  }

  const handleViewAsset = async (asset) => {
    const outcomeAssetId = assetIdOf(asset)
    setSelectedAssetId(outcomeAssetId)
    await Promise.allSettled([
      loadAsset({ runtimeInstanceId, outcomeAssetId }),
      loadPreview({ runtimeInstanceId, outcomeAssetId }),
    ])
  }

  const handlePreviewDraft = async (draftRow) => {
    const { draft, draftId, previewDisabledReason } = draftRow || {}
    const draftIterationId = String(draft?.currentIterationId || '').trim()
    if (!activeSessionId || !draftId || !draftIterationId || previewDisabledReason) return

    const requestId = draftPreviewRequestRef.current + 1
    draftPreviewRequestRef.current = requestId
    requestedDraftIterationRef.current = draftIterationId
    currentSelectedDraftIterationRef.current = draftIterationId
    setSelectedDraftId(draftId)
    setSelectedDraftPreview(null)
    setDraftPreviewError(null)
    setBusyKey(`preview:${draftId}`)
    try {
      const response = await loadDraftPreview({
        runtimeInstanceId,
        sessionId: activeSessionId,
        draftId,
      }).unwrap()
      if (
        draftPreviewRequestRef.current !== requestId
        || currentSelectedDraftIterationRef.current !== draftIterationId
      ) return
      setSelectedDraftPreview(payload(response))
    } catch (error) {
      if (draftPreviewRequestRef.current !== requestId) return
      setDraftPreviewError(error)
    } finally {
      if (draftPreviewRequestRef.current === requestId) setBusyKey('')
    }
  }

  const handlePublish = async (asset) => {
    const outcomeAssetId = assetIdOf(asset)
    if (
      !outcomeAssetId
      || !asset?.currentVersionId
      || !isInformationCurrent(asset)
      || asset?.distributionAvailable === false
      || token(asset?.status) === 'PUBLISHED'
    ) return
    setBusyKey(`publish:${outcomeAssetId}`)
    try {
      await publishAsset({ runtimeInstanceId, outcomeAssetId, body: {} }).unwrap()
      await refreshAfterMutation('Approved output published.')
    } catch (error) {
      notify('Publish failed', failureMessage(error), 'error')
    } finally {
      setBusyKey('')
    }
  }

  const handleExport = async (asset, formatDescriptor) => {
    const outcomeAssetId = assetIdOf(asset)
    if (
      !outcomeAssetId
      || !asset?.currentVersionId
      || !isInformationCurrent(asset)
      || asset?.distributionAvailable === false
    ) return
    const format = token(formatDescriptor?.format)
    setBusyKey(`export:${outcomeAssetId}:${format}`)
    try {
      const response = await exportAsset({ runtimeInstanceId, outcomeAssetId, format }).unwrap()
      const exported = payload(response)
      const extension = String(formatDescriptor?.extension || format).toLowerCase()
      const filename = downloadExport(
        exported,
        `${runtimeInstanceId || 'outcome'}.${extension}`,
        formatDescriptor?.mimeType,
      )
      notify('Export ready', filename)
    } catch (error) {
      notify('Export failed', failureMessage(error), 'error')
    } finally {
      setBusyKey('')
    }
  }

  const renderSummary = () => (
    <section className="outcome-studio-workspace__summary" aria-label="Outcome Studio readiness and information">
      <div className="outcome-studio-workspace__summary-copy">
        <span>Readiness</span>
        <strong>{readiness.summary || 'Outcome Studio readiness is being evaluated.'}</strong>
      </div>
      <dl className="outcome-studio-workspace__summary-list">
        <div>
          <dt>Status</dt>
          <dd><Status variant={statusVariant(readiness.state)} size="sm" showIcon>{formatRuntimeTokenLabel(readiness.state || 'UNKNOWN')}</Status></dd>
        </div>
        <div>
          <dt>Information</dt>
          <dd>{formatRuntimeTokenLabel(information.currentness || information.status || 'UNKNOWN')}</dd>
        </div>
        <div>
          <dt>Deliverables</dt>
          <dd>{deliverables.length} available</dd>
        </div>
      </dl>
      {readiness.blockers?.length ? (
        <ul className="outcome-studio-workspace__messages" aria-label="Outcome Studio blockers">
          {readiness.blockers.map((blocker) => <li key={blocker.code || blocker.message}>{blocker.message}</li>)}
        </ul>
      ) : null}
    </section>
  )

  if (loading) {
    return <div className="outcome-studio-workspace__state" role="status"><Spinner size="lg" aria-label="Loading Outcome Studio" /></div>
  }

  if (pageError) {
    return (
      <section className="outcome-studio-workspace outcome-studio-workspace--state">
        <Status variant="error" showIcon>{failureMessage(pageError)}</Status>
        <Button variant="outline" leftIcon={<MdArrowBack aria-hidden="true" />} onClick={() => navigate(getOutcomeStudioReturnTarget(runtimeInstanceId), { state: location.state?.returnState })}>Return to Execution Workspace</Button>
      </section>
    )
  }

  return (
    <section className="outcome-studio-workspace">
      <header className="outcome-studio-workspace__header">
        <div>
          <p className="outcome-studio-workspace__kicker">Customer workspace</p>
          <h1>Outcome Studio</h1>
          <p>Shape, review, and approve business deliverables using verified information.</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<MdArrowBack aria-hidden="true" />} onClick={() => navigate(getOutcomeStudioReturnTarget(runtimeInstanceId), { state: location.state?.returnState })}>Execution Workspace</Button>
      </header>

      {renderSummary()}

      <div className="outcome-studio-workspace__main">
        <TabView activeTab={activeTab} onTabChange={setActiveTab} aria-label="Outcome Studio sections">
          <TabView.Tab label="Conversation">
            <section className="outcome-studio-workspace__panel" aria-label="Outcome Studio conversation">
              <div className="outcome-studio-workspace__panel-heading">
                <div><h2>Conversation</h2><p>Describe the business outcome and refine it over multiple requests.</p></div>
                {activeSessionId ? <Status variant="success" size="sm" showIcon>Session active</Status> : <Status variant="neutral" size="sm">No active session</Status>}
              </div>
              {!isSessionInformationCurrent && activeSessionId ? (
                <div className="outcome-studio-workspace__notice">
                  <Status variant="warning" size="sm" showIcon>Information out of date</Status>
                  <Button variant="outline" size="sm" loading={updateTruthState.isLoading} leftIcon={<MdRefresh aria-hidden="true" />} onClick={handleUpdateTruth}>Use latest information</Button>
                </div>
              ) : null}
              <div className="outcome-studio-workspace__composer">
                <Select id="outcome-studio-deliverable" label="Deliverable" value={selectedDeliverableKey} options={deliverables.map((item) => ({ value: item.key, label: item.label }))} disabled={!deliverables.length} onChange={(event) => setDeliverableKey(event.target.value)} />
                <Textarea id="outcome-studio-request" label="Your request" value={prompt} rows={5} maxLength={studio?.conversation?.requestMaxLength || 2000} disabled={Boolean(activeSessionId) && !conversationEnabled} onChange={(event) => setPrompt(event.target.value)} />
                <ButtonGroup align="end" stackOnMobile fullWidthOnMobile>
                  <Button loading={activeSessionId ? submitState.isLoading : createState.isLoading} disabled={!selectedDeliverableKey || (activeSessionId ? !conversationEnabled || !prompt.trim() : readiness.canStartSession !== true)} leftIcon={<MdPlayArrow aria-hidden="true" />} onClick={activeSessionId ? handleSubmit : handleStartSession}>{activeSessionId ? 'Submit request' : 'Start session'}</Button>
                </ButtonGroup>
              </div>
              <div className="outcome-studio-workspace__history">
                <h3>Request history</h3>
                {generationBlockedReason && activeSessionId ? <p id="outcome-generation-blocked-reason">{generationBlockedReason}</p> : null}
                {sessionQuery.error ? (
                  <div className="outcome-studio-workspace__error">
                    <Status variant="error" size="sm" showIcon>Conversation could not be loaded.</Status>
                    <ErrorSupportPanel error={normalizeError(sessionQuery.error)} context="outcome-studio-session" />
                  </div>
                ) : sessionQuery.isLoading ? <Spinner size="sm" aria-label="Loading conversation" /> : requestMessages.length ? (
                  <ol id="outcome-studio-request-history" aria-label="Outcome Studio request history">
                    {visibleMessages.map((message) => {
                      const messageId = idOf(message, ['messageId', 'id', '_id'])
                      const messageContent = String(message.content || message.prompt || '').trim() || 'Request unavailable'
                      const isPending = token(message.responseStatus) === 'PENDING_RESPONSE'
                      const isGenerating = busyKey === `generate:${messageId}`
                      const statusLabel = isGenerating
                        ? 'Generating draft'
                        : isPending
                          ? 'Ready to generate'
                          : token(message.responseStatus) === 'RESPONSE_GENERATED'
                            ? 'Draft created'
                            : formatRuntimeTokenLabel(message.responseStatus || message.status)
                      const statusDescription = isGenerating
                        ? 'Your draft is being created. This may take a moment.'
                        : isPending
                          ? 'No draft has been created for this request yet.'
                          : token(message.responseStatus) === 'RESPONSE_GENERATED'
                            ? 'A draft was created from this request.'
                            : ''
                      return (
                        <li key={messageId}>
                          <div>
                            <strong>{messageContent}</strong>
                            <span className="outcome-studio-workspace__request-time">{formatDateTime(message.submittedAt, 'Time unavailable')}</span>
                          </div>
                          <div>
                            <Status variant={isGenerating ? 'warning' : statusVariant(message.responseStatus || message.status)} size="sm">
                              {statusLabel}
                            </Status>
                            {statusDescription ? <p className="outcome-studio-workspace__request-status-copy">{statusDescription}</p> : null}
                            {isPending ? (
                              <Button
                                size="sm"
                                loading={isGenerating}
                                disabled={Boolean(generationBlockedReason)}
                                aria-describedby={generationBlockedReason ? 'outcome-generation-blocked-reason' : undefined}
                                onClick={() => handleGenerate(message)}
                              >
                                Generate draft
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                ) : <Status variant="neutral" size="sm">No requests yet</Status>}
                {requestMessages.length > REQUEST_HISTORY_PREVIEW_LIMIT ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-controls="outcome-studio-request-history"
                    aria-expanded={showAllRequests}
                    onClick={() => setShowAllRequests((current) => !current)}
                  >
                    {showAllRequests ? 'Show recent requests' : 'View all requests'}
                  </Button>
                ) : null}
              </div>
            </section>
          </TabView.Tab>

          <TabView.Tab label="Working Drafts">
            <section className="outcome-studio-workspace__panel" aria-label="Outcome Studio working drafts">
              <div className="outcome-studio-workspace__panel-heading"><div><h2>Working Drafts</h2><p>Review active drafts before creating an immutable approved output.</p></div><Status variant={readyDraftCount ? 'success' : draftRows.length ? 'warning' : 'neutral'} size="sm">{readyDraftCount} ready to approve · {unavailableDraftCount} unavailable</Status></div>
              {sessionQuery.error ? (
                <div className="outcome-studio-workspace__error">
                  <Status variant="error" size="sm" showIcon>Working drafts could not be loaded.</Status>
                  <ErrorSupportPanel error={normalizeError(sessionQuery.error)} context="outcome-studio-session" />
                </div>
              ) : sessionQuery.isLoading ? <Spinner size="sm" aria-label="Loading working drafts" /> : draftRows.length ? (
                <ul className="outcome-studio-workspace__items" aria-label="Working drafts">
                  {draftRows.map((draftRow) => {
                    const { approvalDisabledReason, draft, draftId, informationCurrentness, key, previewDisabledReason, readyToApprove } = draftRow
                    const approvalReasonId = `outcome-draft-approval-reason-${key}`
                    const previewReasonId = `outcome-draft-preview-reason-${key}`
                    return <li key={key}><div><h3>{draft.title || draft.outputTypeLabel || 'Working draft'}</h3><p>Current iteration {draft.currentIterationNumber || 1} · Updated {formatDateTime(draft.updatedAt, 'Time unavailable')}</p><Status variant={readyToApprove ? 'success' : 'warning'} size="sm">{readyToApprove ? 'Ready to approve' : 'Approval unavailable'}</Status><Status variant={statusVariant(informationCurrentness)} size="sm">Information {formatRuntimeTokenLabel(informationCurrentness)}</Status>{previewDisabledReason ? <p id={previewReasonId}>{previewDisabledReason}</p> : null}{approvalDisabledReason && approvalDisabledReason !== previewDisabledReason ? <p id={approvalReasonId}>{approvalDisabledReason}</p> : null}</div><ButtonGroup align="end"><Button variant="danger" size="sm" leftIcon={<MdDeleteOutline aria-hidden="true" />} disabled={!draftId || !draft.updatedAt || discardState.isLoading} onClick={() => setPendingDiscard(draft)}>Discard</Button><Button variant="outline" size="sm" leftIcon={<MdVisibility aria-hidden="true" />} loading={busyKey === `preview:${draftId}`} disabled={Boolean(previewDisabledReason)} aria-describedby={previewDisabledReason ? previewReasonId : undefined} onClick={() => handlePreviewDraft(draftRow)}>Preview</Button><Button size="sm" leftIcon={<MdCheckCircle aria-hidden="true" />} loading={busyKey === `approve:${draftId}`} disabled={Boolean(approvalDisabledReason)} aria-describedby={approvalDisabledReason ? (approvalDisabledReason === previewDisabledReason ? previewReasonId : approvalReasonId) : undefined} onClick={() => handleApprove(draftRow)}>Approve draft</Button></ButtonGroup></li>
                  })}
                </ul>
              ) : <Status variant="neutral" size="sm">No working drafts</Status>}
              {selectedDraftRow ? <section className="outcome-studio-workspace__preview" aria-label="Outcome Studio working draft preview"><div className="outcome-studio-workspace__panel-heading"><div><h3>Working Draft Preview</h3><p>{selectedDraftRow.draft.title || selectedDraftRow.draft.outputTypeLabel || 'Working draft'}</p></div>{busyKey === `preview:${selectedDraftId}` ? <Spinner size="sm" aria-label="Loading working draft preview" /> : <Status variant={draftPreviewError ? 'error' : selectedDraftPreview ? 'success' : 'neutral'} size="sm">{draftPreviewError ? 'Unavailable' : selectedDraftPreview ? 'Available' : 'Not loaded'}</Status>}</div>{draftPreviewSupportError ? <div className="outcome-studio-workspace__error"><Status variant="error" size="sm" showIcon>{draftPreviewSupportError.message}</Status><ErrorSupportPanel error={draftPreviewSupportError} context="outcome-studio-draft-preview" /></div> : String(selectedDraftPreview?.markdown || '').trim() ? <div className="outcome-studio-workspace__preview-body outcome-studio-workspace__preview-body--markdown">{renderSafeMarkdown(selectedDraftPreview.markdown)}</div> : selectedDraftPreview?.sections?.length ? <div className="outcome-studio-workspace__preview-body">{selectedDraftPreview.sections.map((section) => <section key={section.key || section.label}><h4>{section.label}</h4><p>{section.body}</p></section>)}</div> : null}</section> : null}
            </section>
          </TabView.Tab>

          <TabView.Tab label="Approved Outputs">
            <section className="outcome-studio-workspace__panel" aria-label="Outcome Studio approved outputs">
              <div className="outcome-studio-workspace__panel-heading"><div><h2>Approved Outputs</h2><p>Preview, publish, and export approved governed versions.</p></div><Status variant={assets.length ? 'success' : 'neutral'} size="sm">{assets.length} output{assets.length === 1 ? '' : 's'}</Status></div>
              {assets.length ? <ul className="outcome-studio-workspace__items" aria-label="Approved outputs">{assets.map((asset) => {
                const assetId = assetIdOf(asset)
                const formats = Array.isArray(asset.supportedFormats) ? asset.supportedFormats : (deliverables.find((item) => item.key === String(asset.outputTypeCapabilityKey || asset.outputTypeKey || '').toLowerCase())?.formats || EMPTY_ARRAY)
                const distributionReason = !asset.currentVersionId
                  ? 'This output is not ready for distribution yet.'
                  : !isInformationCurrent(asset)
                    ? 'Publish and export are blocked until this output uses current verified business information.'
                    : asset.distributionAvailable === false
                      ? 'Publish and export are unavailable until this output passes customer content review.'
                      : ''
                const previewReason = !asset.currentVersionId
                  ? 'This output is not ready for preview yet.'
                  : !isInformationCurrent(asset)
                    ? 'Preview is blocked until this output uses current verified business information.'
                    : asset.previewAvailable === false
                      ? 'Preview is unavailable until this output passes customer content review.'
                      : ''
                const publishReason = distributionReason || (token(asset.status) === 'PUBLISHED' ? 'This output has already been published.' : '')
                const reasonId = `outcome-output-reason-${assetId}`
                const previewReasonId = `outcome-output-preview-reason-${assetId}`
                return <li key={assetId}><div><h3>{asset.title || asset.outputTypeLabel || 'Approved output'}</h3><p>Version {asset.currentVersionNumber || 1} | Generated {formatDateTime(asset.generatedAt || asset.createdAt, 'Time unavailable')}</p><Status variant={statusVariant(asset.status)} size="sm">{formatRuntimeTokenLabel(asset.status || 'APPROVED')}</Status>{previewReason ? <p id={previewReasonId}>{previewReason}</p> : null}{publishReason && publishReason !== previewReason ? <p id={reasonId}>{publishReason}</p> : null}</div><ButtonGroup align="end"><Button variant="outline" size="sm" leftIcon={<MdVisibility aria-hidden="true" />} disabled={Boolean(previewReason)} aria-describedby={previewReason ? previewReasonId : undefined} onClick={() => handleViewAsset(asset)}>Preview</Button><Button variant="outline" size="sm" leftIcon={<MdPublish aria-hidden="true" />} loading={busyKey === `publish:${assetId}`} disabled={Boolean(publishReason)} aria-describedby={publishReason ? (publishReason === previewReason ? previewReasonId : reasonId) : undefined} onClick={() => handlePublish(asset)}>Publish</Button>{formats.map((descriptor) => { const format = typeof descriptor === 'string' ? descriptor : descriptor.format; const formatDescriptor = typeof descriptor === 'string' ? { format: descriptor } : descriptor; return <Button key={format} variant="outline" size="sm" leftIcon={<MdDownload aria-hidden="true" />} loading={busyKey === `export:${assetId}:${token(format)}`} disabled={Boolean(distributionReason)} aria-describedby={distributionReason ? (distributionReason === previewReason ? previewReasonId : reasonId) : undefined} onClick={() => handleExport(asset, formatDescriptor)}>{formatDescriptor.label || formatRuntimeTokenLabel(format)}</Button> })}</ButtonGroup></li>
              })}</ul> : <Status variant="neutral" size="sm">No approved outputs</Status>}
              {selectedAsset ? <section className="outcome-studio-workspace__preview" aria-label="Outcome Studio generated body preview"><div className="outcome-studio-workspace__panel-heading"><div><h3>Generated Body Preview</h3><p>{selectedAsset.title || selectedAsset.outputTypeLabel}</p></div>{previewLoading ? <Spinner size="sm" aria-label="Loading output preview" /> : <Status variant={previewError ? 'error' : selectedPreview?.previewAvailable === false ? 'warning' : selectedPreview ? 'success' : 'neutral'} size="sm">{previewError || selectedPreview?.previewAvailable === false ? 'Unavailable' : selectedPreview ? 'Available' : 'Not loaded'}</Status>}</div>{previewError ? <Status variant="error" size="sm" showIcon>{previewFailureMessage(previewError)}</Status> : String(selectedPreview?.markdown || '').trim() ? <div className="outcome-studio-workspace__preview-body outcome-studio-workspace__preview-body--markdown">{renderSafeMarkdown(selectedPreview.markdown)}</div> : selectedPreview?.sections?.length ? <div className="outcome-studio-workspace__preview-body">{selectedPreview.sections.map((section) => <section key={section.key || section.label}><h4>{section.label}</h4><p>{section.body}</p></section>)}</div> : selectedAssetDetail ? <Status variant="neutral" size="sm">Preview content is not available for this version.</Status> : null}</section> : null}
            </section>
          </TabView.Tab>
        </TabView>
      </div>

      <Dialog open={Boolean(pendingDiscard)} onClose={() => !discardState.isLoading && setPendingDiscard(null)} closeOnBackdropClick={!discardState.isLoading} closeOnEscape={!discardState.isLoading} size="sm" aria-labelledby="discard-outcome-draft-title">
        <Dialog.Header><h2 id="discard-outcome-draft-title">Discard working draft?</h2></Dialog.Header>
        <Dialog.Body><p>The draft will leave active work but remain retained in governed history. This cannot be undone here.</p>{!pendingDiscard?.updatedAt ? <Status variant="error" size="sm" showIcon>The draft must be refreshed before it can be discarded.</Status> : null}</Dialog.Body>
        <Dialog.Footer><Button variant="outline" disabled={discardState.isLoading} onClick={() => setPendingDiscard(null)}>Cancel</Button><Button variant="danger" loading={discardState.isLoading} disabled={!pendingDiscard?.updatedAt} leftIcon={<MdDeleteOutline aria-hidden="true" />} onClick={handleDiscard}>Discard draft</Button></Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default OutcomeStudioWorkspace
