import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  MdArrowBack,
  MdCheck,
  MdCheckCircle,
  MdClose,
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
  useLazyGetRuntimeOutcomeSessionQuery,
  useLazyGetRuntimeOutcomeAssetPreviewQuery,
  useLazyGetRuntimeOutcomeDraftCompareQuery,
  useLazyGetRuntimeOutcomeAssetQuery,
  useLazyGetRuntimeOutcomeDraftPreviewQuery,
  usePublishRuntimeOutcomeAssetMutation,
  useReviseRuntimeOutcomeAssetMutation,
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
const OUTPUT_CONTRACT_CLARIFICATION_CODE = 'OUTCOME_OUTPUT_CONTRACT_CLARIFICATION_REQUIRED'

const payload = (response) => response?.data ?? response ?? null
const token = (value) => String(value || '').trim().toUpperCase()
const idOf = (record, keys) => String(keys.map((key) => record?.[key]).find(Boolean) || '').trim()
const sessionIdOf = (session) => idOf(session, ['sessionId', 'id', '_id'])
const draftIdOf = (draft) => idOf(draft, ['draftId', 'id', '_id'])
const assetIdOf = (asset) => idOf(asset, ['outcomeAssetId', 'assetId', 'id', '_id'])
const normalizeRequestText = (value) => String(value || '').trim().replace(/\s+/g, ' ')
const isUserRequestMessage = (message) => token(message?.role) !== 'ASSISTANT'

const informationCurrentnessOf = (record) => token(
  record?.informationStatus?.currentness
  || record?.informationStatus?.status
  || record?.truthSignature?.currentness
  || record?.truthSignature?.status
  || 'UNKNOWN',
)

const isInformationCurrent = (record) => informationCurrentnessOf(record) === 'CURRENT'
const approvalReadinessOf = (draft) => draft?.approvalReadiness || null
const isExecutionApprovalReady = (draft) => {
  const readiness = approvalReadinessOf(draft)
  return readiness?.contractVersion === 'outcome-studio.execution-approval-readiness.v2'
    && token(readiness.status) === 'PASSED'
    && readiness.approvalAvailable === true
}

const activeSessionFrom = (studio) => {
  const sessions = Array.isArray(studio?.sessions) ? studio.sessions : EMPTY_ARRAY
  return sessions.find((session) => token(session?.status) === 'ACTIVE') || null
}

const buildDraftRows = (drafts, { sessionInformationCurrent }) => drafts.map((draft, index) => {
  const draftId = draftIdOf(draft)
  const informationCurrentness = informationCurrentnessOf(draft)
  const approvalReadiness = approvalReadinessOf(draft)
  const approvalDisabledReason = !draftId
    ? 'Approval is unavailable until the draft has been persisted.'
    : !isExecutionApprovalReady(draft)
      ? approvalReadiness?.message || 'Approval is blocked until all required execution evidence passes for this exact draft version.'
      : draft.approvalAvailable === false
        ? 'Approval is not available for this draft.'
      : !sessionInformationCurrent || informationCurrentness !== 'CURRENT'
        ? 'Approval is blocked until the draft uses current verified business information.'
        : ''
  const previewDisabledReason = !draftId
    ? 'Preview is unavailable until the draft has been persisted.'
    : draft.contentReview?.result && token(draft.contentReview.result) !== 'ALLOW'
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
  if (['READY', 'CURRENT', 'BOUND', 'RECORDED', 'ACTIVE', 'APPROVED', 'PUBLISHED', 'PASSED', 'RESPONSE_READY', 'RESPONSE_GENERATED'].includes(normalized)) return 'success'
  if (['BLOCKED', 'FAILED', 'ERROR', 'STALE', 'OBSOLETE', 'NOT_RECORDED', 'MISSING'].includes(normalized)) return 'error'
  if (['PENDING', 'PENDING_RESPONSE', 'DRAFT', 'READY_WITH_GAPS', 'OUT_OF_DATE', 'IN_PROGRESS', 'BOUNDED_FIXTURE'].includes(normalized)) return 'warning'
  return 'neutral'
}

const isStagePassed = (status) => token(status) === 'PASSED'
const isExecutionPassed = (status) => token(status) === 'PASSED'
const isEvidenceInputPassed = (status) => statusVariant(status) === 'success'
const sourceContextLabelOf = (sourceOutput) => token(sourceOutput?.sourceType) === 'FRAMEWORK_HANDOFF'
  ? 'Locked Framework Runtime handoff'
  : sourceOutput?.outputAssetId
    ? 'Output Lab asset'
    : 'Not recorded'
const compareBlockerOf = (error) => (
  normalizeError(error)?.details?.blockerReason
  || (error?.data?.error?.state?.compareAvailable === false ? 'OUTCOME_DRAFT_PREVIOUS_ITERATION_MISSING' : '')
  || ''
)

const OUTCOME_PROVIDER_SAFE_CONTEXT_STAGE_LABELS = Object.freeze({
  REQUEST: 'request preparation',
  TRUTH: 'verified information',
  KNOWLEDGE_SELECTION: 'knowledge selection',
  KNOWLEDGE_VERSION: 'knowledge version lookup',
  GUIDANCE: 'guidance preparation',
  SAFE_CONTEXT: 'safe-context validation',
})

const OUTCOME_PROVIDER_SAFE_CONTEXT_CODE_MESSAGES = Object.freeze({
  REQUEST_INVALID: 'the request could not be validated',
  TRUTH_UNUSABLE: 'the verified information could not be used',
  KNOWLEDGE_SELECTION_INVALID: 'the selected guidance could not be validated',
  KNOWLEDGE_VERSION_UNAVAILABLE: 'a selected guidance version was unavailable',
  GUIDANCE_NOT_USABLE: 'the selected guidance could not be used safely',
  REQUIRED_GUIDANCE_UNAVAILABLE: 'required guidance was not available',
  GUIDANCE_CONTENT_REJECTED: 'selected guidance content was rejected by the safety checks',
  SAFE_CONTEXT_VALIDATION_FAILED: 'the safe context did not pass validation',
})

const providerSafeContextDiagnosticMessage = (diagnostic) => {
  if (!diagnostic || typeof diagnostic !== 'object') return ''
  const stage = OUTCOME_PROVIDER_SAFE_CONTEXT_STAGE_LABELS[diagnostic.failureStage]
  const reason = OUTCOME_PROVIDER_SAFE_CONTEXT_CODE_MESSAGES[diagnostic.diagnosticCode]
  if (!stage || !reason) return ''
  return ` Diagnostic: ${stage}; ${reason}.`
}

const executionCheckDetails = (check = {}) => [
  check.providerKey,
  check.model,
  check.configurationVersion,
  check.schemaName && `Schema ${check.schemaName}${check.schemaVersion ? ` v${check.schemaVersion}` : ''}`,
  check.strict === true ? 'Strict' : '',
  check.requestId && `Request ${check.requestId}`,
  check.responseId && `Response ${check.responseId}`,
  Number(check.latencyMs) > 0 ? `${Number(check.latencyMs)} ms` : '',
].filter(Boolean).join(' · ')

const OUTCOME_STUDIO_STAGE_LABELS = Object.freeze({
  CLARIFICATION: 'Clarification',
  GUARDRAILS: 'Guardrails',
  VALIDATION: 'Validation',
  OUTCOME_READINESS: 'Outcome readiness',
})

const OUTCOME_STUDIO_STAGE_STATUS_LABELS = Object.freeze({
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  PASSED: 'Passed',
  BLOCKED: 'Blocked',
  BOUNDED_FIXTURE: 'Bounded fixture',
})

const isBoundedFixture = (readiness = {}) => [
  readiness?.evidenceMode,
  readiness?.sourceMode,
  readiness?.reasoningChain?.mode,
  readiness?.truthBinding?.mode,
].some((value) => token(value).includes('FIXTURE'))

const firstReadinessBlocker = (readiness = {}) => {
  const blocker = Array.isArray(readiness.blockers) ? readiness.blockers[0] : null
  return String(blocker?.message || blocker?.code || '').trim()
}

const firstBlockedSafetyGate = (readiness = {}) => {
  const gates = Array.isArray(readiness?.safetyGates?.gates) ? readiness.safetyGates.gates : EMPTY_ARRAY
  return gates.find((gate) => token(gate?.status) === 'BLOCKED') || null
}

const stage = (key, status, message, nextAction = '', evidence = null) => ({
  key,
  label: OUTCOME_STUDIO_STAGE_LABELS[key],
  status,
  statusLabel: OUTCOME_STUDIO_STAGE_STATUS_LABELS[status],
  message,
  nextAction,
  evidence,
})

const getOutcomeStudioStages = ({
  readiness = {},
  session = null,
  requestMessages = EMPTY_ARRAY,
  draftRows = EMPTY_ARRAY,
  governanceEvidence = null,
  selectedDraftRow = null,
  selectedDraftPreview = null,
} = {}) => {
  const fixture = isBoundedFixture(readiness)
  const fixtureStatus = fixture ? 'BOUNDED_FIXTURE' : 'PASSED'
  const activeSession = token(session?.status) === 'ACTIVE'
  const hasRequest = requestMessages.length > 0
  const clarification = !activeSession
    ? stage('CLARIFICATION', 'PENDING', 'No governed conversation has been started yet.', 'Start with an Executive Brief request.')
    : !hasRequest
      ? stage('CLARIFICATION', 'IN_PROGRESS', 'The governed session is active and is waiting for a request.', 'Describe the Executive Brief you need.')
      : stage('CLARIFICATION', fixtureStatus, 'The request is captured in the governed conversation.', fixture ? 'Treat this source as bounded fixture evidence.' : '')

  const blockedGate = firstBlockedSafetyGate(readiness)
  const guardrails = blockedGate || firstReadinessBlocker(readiness)
    ? stage(
        'GUARDRAILS',
        'BLOCKED',
        blockedGate?.message || firstReadinessBlocker(readiness) || 'A mandatory readiness check is blocking the flow.',
        blockedGate?.blockerReason || 'Resolve the reported readiness blocker before generating an outcome.',
      )
    : Array.isArray(readiness?.safetyGates?.gates) && readiness.safetyGates.gates.length > 0
      ? stage('GUARDRAILS', fixtureStatus, 'The server-owned safety gates are passed for this flow.', fixture ? 'This pass is bounded by the controlled fixture.' : '')
      : stage('GUARDRAILS', 'PENDING', 'The server has not supplied the mandatory safety-gate result yet.', 'Refresh readiness before generating an outcome.')

  const currentDraftRow = selectedDraftRow
    || draftRows.find((row) => token(row?.draft?.status) === 'ACTIVE')
    || draftRows[0]
  const selectedContentReview = token(selectedDraftRow?.draft?.contentReview?.result)
  const validation = !draftRows.length
    ? hasRequest
      ? stage('VALIDATION', 'IN_PROGRESS', 'The request is waiting for a Working Draft v1.', 'Generate Draft v1, then open its in-context Preview.')
      : stage('VALIDATION', 'PENDING', 'Validation begins after a Working Draft is available.', 'Submit a request to create the first draft.')
    : selectedDraftRow && selectedDraftPreview
      ? selectedDraftPreview.previewAvailable === false || (selectedContentReview && selectedContentReview !== 'ALLOW')
        ? stage('VALIDATION', 'BLOCKED', 'The selected draft did not pass customer-content validation.', 'Resolve the validation finding before approval or finalisation.')
        : stage('VALIDATION', fixtureStatus, `Working Draft v${selectedDraftRow.draft.currentIterationNumber || 1} is open in the in-context Preview surface.`, fixture ? 'Preview is bounded fixture evidence; it does not prove generation quality.' : '')
      : stage('VALIDATION', 'IN_PROGRESS', 'A Working Draft exists but its current version is not open in Preview.', 'Open Preview for the current draft before approving it.')

  const executionReadiness = approvalReadinessOf(currentDraftRow?.draft)
  const executionReady = Boolean(currentDraftRow) && isExecutionApprovalReady(currentDraftRow.draft)
  const resolvedGuardrails = guardrails.status === 'PENDING' && executionReady
    ? stage(
        'GUARDRAILS',
        fixtureStatus,
        'The exact draft version passed the required execution guardrails.',
        fixture ? 'This pass is bounded by the controlled fixture.' : '',
      )
    : guardrails

  const readyDraft = draftRows.find((row) => row.readyToApprove)
  const outcomeReadiness = resolvedGuardrails.status === 'BLOCKED'
    ? stage('OUTCOME_READINESS', 'BLOCKED', 'Outcome readiness is unavailable while guardrails are blocked.', 'Resolve the earlier blocked stage first.')
    : validation.status === 'BLOCKED'
      ? stage('OUTCOME_READINESS', 'BLOCKED', 'Outcome readiness is blocked by the validation result.', 'Resolve validation before approval or finalisation.')
      : readyDraft && validation.status === 'PASSED'
        ? stage('OUTCOME_READINESS', fixtureStatus, 'The current draft is ready for explicit approval.', fixture ? 'Approval remains bounded by the controlled fixture.' : '')
        : draftRows.length
          ? stage('OUTCOME_READINESS', 'IN_PROGRESS', 'The flow is still preparing a draft for explicit approval.', 'Complete Preview and any conversational revision before approval.')
          : stage('OUTCOME_READINESS', 'PENDING', 'No outcome is available until the earlier stages pass.', 'Complete Clarification, Guardrails, and Validation first.')

  const executionReceiptBlocked = Boolean(currentDraftRow) && !executionReady
  const trackedStages = executionReceiptBlocked
    ? [clarification, resolvedGuardrails, validation, outcomeReadiness].map((item) => stage(
        item.key,
        'BLOCKED',
        executionReadiness?.message
          || 'Required execution evidence is missing or incomplete for the exact current draft version.',
        'Review the crossed Knowledge Pack and runtime checks, then regenerate the draft before approval.',
      ))
    : [clarification, resolvedGuardrails, validation, outcomeReadiness]

  const evidenceSources = [
    currentDraftRow?.draft?.governanceEvidence,
    selectedDraftRow?.draft?.governanceEvidence,
    session?.governanceEvidence,
    governanceEvidence,
  ].filter(Boolean)
  const stageEvidence = (stageKey) => {
    for (const source of evidenceSources) {
      const evidence = Array.isArray(source.stages)
        ? source.stages.find((item) => item.key === stageKey)
        : null
      if (evidence) return { ...evidence, notice: source.notice }
    }
    return null
  }

  return trackedStages.map((item) => ({
    ...item,
    evidence: stageEvidence(item.key),
  }))
}

const renderSafeInlineMarkdown = (text) => {
  const tokens = String(text || '').split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g)
  return tokens.map((token, index) => {
    const key = `inline-${index}-${token}`
    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      return <strong key={key}>{token.slice(2, -2)}</strong>
    }
    if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      return <em key={key}>{token.slice(1, -1)}</em>
    }
    return token
  })
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
      return <Heading key={key}>{renderSafeInlineMarkdown(block.text)}</Heading>
    }
    if (block.type === 'ordered-list') {
      return <ol key={key}>{block.items.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{renderSafeInlineMarkdown(item)}</li>)}</ol>
    }
    if (block.type === 'unordered-list') {
      return <ul key={key}>{block.items.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{renderSafeInlineMarkdown(item)}</li>)}</ul>
    }
    return <p key={key}>{renderSafeInlineMarkdown(block.text)}</p>
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

const evidenceDialogIdOf = (stageKey) => `outcome-studio-stage-evidence-${String(stageKey || '').toLowerCase()}`

const OUTCOME_EVIDENCE_KIND_LABELS = Object.freeze({
  PACK_EXECUTION: 'Pack execution',
  PACK_RECEIPT: 'Pack receipt',
  FRAMEWORK_CONTROL: 'Framework control',
  NOT_RECORDED: 'Evidence type not recorded',
})

const evidenceKindLabel = (value) => (
  OUTCOME_EVIDENCE_KIND_LABELS[String(value || '').trim().toUpperCase()]
  || OUTCOME_EVIDENCE_KIND_LABELS.NOT_RECORDED
)

const renderEvidenceAcknowledgement = (passed, label) => (
  <span
    className={`outcome-studio-workspace__execution-mark outcome-studio-workspace__execution-mark--${passed ? 'passed' : 'not-passed'}`}
    aria-label={label}
    role="img"
  >
    {passed ? <MdCheck aria-hidden="true" /> : <MdClose aria-hidden="true" />}
  </span>
)

const renderStageEvidenceContent = (item) => (
  <div className="outcome-studio-workspace__stage-evidence-body">
    <p className="outcome-studio-workspace__stage-evidence-status">
      {item.evidence.evidenceLabel || 'Evidence status not recorded.'}
    </p>
    <div className="outcome-studio-workspace__stage-evidence-section">
      <h4>Knowledge Packs</h4>
      {item.evidence.knowledgePacks?.length ? (
        <ul className="outcome-studio-workspace__stage-evidence-list">
          {item.evidence.knowledgePacks.map((pack) => {
            const executionChecks = Array.isArray(pack.executionChecks) ? pack.executionChecks : []
            const hasExecutionReceipt = executionChecks.length > 0
            const packExecutionPassed = hasExecutionReceipt && isExecutionPassed(pack.executionStatus)
            const hasDispositionDiagnostics = hasExecutionReceipt
              && pack.projectionDisposition
              && pack.projectionDisposition !== 'NOT_RECORDED'
            return (
              <li key={`${pack.packKey}-${pack.versionId || pack.semanticVersion}`}>
                <div className="outcome-studio-workspace__pack-heading">
                  {renderEvidenceAcknowledgement(
                    packExecutionPassed,
                    `${pack.label || pack.packKey}: ${packExecutionPassed ? 'execution passed' : hasExecutionReceipt ? 'execution not passed' : 'execution not recorded'}`,
                  )}
                  <div>
                    <strong>{pack.label || pack.packKey}</strong>
                    <span>{pack.packKey}{pack.semanticVersion ? ` · v${pack.semanticVersion}` : ''}</span>
                  </div>
                </div>
                <small>{pack.roles?.join(' · ') || pack.role || 'Binding role not recorded'} · {pack.assignmentStatus === 'NOT_STAGE_TAGGED' ? 'stage assignment not recorded' : pack.evidenceLabel}</small>
                <small>
                  Boundary: {formatRuntimeTokenLabel(pack.boundary || 'NOT_RECORDED')} · Receipt: {formatRuntimeTokenLabel(pack.receiptType || 'NOT_RECORDED')} · Status: {formatRuntimeTokenLabel(pack.receiptStatus || pack.executionStatus || 'NOT_RECORDED')}
                </small>
                {hasExecutionReceipt ? (
                  <>
                    <small>
                    {pack.suppliedEntryCount || 0} supplied / {pack.projectedEntryCount || 0} projected
                    {pack.suppliedCategories?.length ? ` · ${pack.suppliedCategories.join(', ')}` : ''}
                    {pack.sharedContribution ? ' · shared/deduplicated contribution' : ''}
                    </small>
                  {hasDispositionDiagnostics ? (
                    <small>
                      {pack.safeCandidateEntryCount || 0} safe candidates · {formatRuntimeTokenLabel(pack.projectionDisposition)} · {formatRuntimeTokenLabel(pack.admissionDisposition)}
                    </small>
                  ) : null}
                  </>
                ) : (
                  <small>Binding evidence only; no execution receipt row is asserted for this stage.</small>
                )}
                {hasExecutionReceipt ? (
                  <ul className="outcome-studio-workspace__execution-checks" aria-label={`${pack.label || pack.packKey} execution checks`}>
                    {executionChecks.map((check) => (
                      <li key={check.key}>
                        {renderEvidenceAcknowledgement(
                          isExecutionPassed(check.status),
                          `${formatRuntimeTokenLabel(check.key)}: ${isExecutionPassed(check.status) ? 'passed' : formatRuntimeTokenLabel(check.status)}`,
                        )}
                        <span>
                          <strong>{formatRuntimeTokenLabel(check.key)}</strong> · {formatRuntimeTokenLabel(check.status)}
                          <small> · Evidence type: {evidenceKindLabel(check.evidenceKind)}</small>
                          {check.message ? ` · ${check.message}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : <p>No Knowledge Pack assignment is recorded for this stage.</p>}
    </div>
    <div className="outcome-studio-workspace__stage-evidence-section">
      <h4>Other inputs</h4>
      <dl className="outcome-studio-workspace__stage-evidence-inputs">
        {(item.evidence.inputs || []).map((input) => (
          <div key={input.key}>
            <dt>{input.label}</dt>
            <dd>
              {renderEvidenceAcknowledgement(
                isEvidenceInputPassed(input.status),
                `${input.label}: ${isEvidenceInputPassed(input.status) ? 'passed' : formatRuntimeTokenLabel(input.status)}`,
              )}
              <Status variant={statusVariant(input.status)} size="sm">{formatRuntimeTokenLabel(input.status)}</Status>
              <span>{input.value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
    {item.evidence.checks?.length ? (
      <div className="outcome-studio-workspace__stage-evidence-section">
        <h4>Checks</h4>
        <ul className="outcome-studio-workspace__stage-evidence-checks">
          {item.evidence.checks.map((check) => (
            <li key={check.key}>
              {renderEvidenceAcknowledgement(
                isExecutionPassed(check.status),
                `${formatRuntimeTokenLabel(check.key)}: ${isExecutionPassed(check.status) ? 'passed' : formatRuntimeTokenLabel(check.status)}`,
              )}
              <span>
                <strong>{check.label || formatRuntimeTokenLabel(check.key)}</strong>
                <small> · Evidence type: {evidenceKindLabel(check.evidenceKind)}</small>
                {check.message ? ` · ${check.message}` : ''}
                {executionCheckDetails(check) ? <small> · {executionCheckDetails(check)}</small> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
  </div>
)

function OutcomeStudioWorkspace() {
  const { runtimeInstanceId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { addToast } = useToaster()
  const [activeTab, setActiveTab] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [composerError, setComposerError] = useState('')
  const [uncertainPrompt, setUncertainPrompt] = useState('')
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [pendingDiscard, setPendingDiscard] = useState(null)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [selectedDraftId, setSelectedDraftId] = useState('')
  const [selectedDraftPreview, setSelectedDraftPreview] = useState(null)
  const [selectedDraftCompare, setSelectedDraftCompare] = useState(null)
  const [draftPreviewView, setDraftPreviewView] = useState('CONTENT')
  const [assetPreviewView, setAssetPreviewView] = useState('CONTENT')
  const [draftPreviewError, setDraftPreviewError] = useState(null)
  const [draftCompareError, setDraftCompareError] = useState(null)
  const [openEvidenceStageKey, setOpenEvidenceStageKey] = useState('')
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
  const [reviseAsset] = useReviseRuntimeOutcomeAssetMutation()
  const [discardDraft, discardState] = useDiscardRuntimeOutcomeDraftMutation()
  const [publishAsset] = usePublishRuntimeOutcomeAssetMutation()
  const [exportAsset] = useLazyExportRuntimeOutcomeAssetQuery()
  const [loadAsset, assetDetailState] = useLazyGetRuntimeOutcomeAssetQuery()
  const [loadPreview, assetPreviewState] = useLazyGetRuntimeOutcomeAssetPreviewQuery()
  const [loadDraftCompare] = useLazyGetRuntimeOutcomeDraftCompareQuery()
  const [loadDraftPreview] = useLazyGetRuntimeOutcomeDraftPreviewQuery()
  const [loadSessionForReconciliation] = useLazyGetRuntimeOutcomeSessionQuery()

  const deliverables = useMemo(() => (
    (Array.isArray(studio?.deliverables?.available) ? studio.deliverables.available : EMPTY_ARRAY)
      .map((item) => ({
        ...item,
        key: String(item?.key || '').trim().toLowerCase(),
        label: String(item?.label || '').trim(),
      }))
      .filter((item) => item.key && item.label)
  ), [studio?.deliverables?.available])
  const messages = Array.isArray(session?.messages) ? session.messages : EMPTY_ARRAY
  const requestMessages = messages.filter(isUserRequestMessage)
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
  const stageTracker = getOutcomeStudioStages({
    governanceEvidence: studio?.governanceEvidence,
    readiness,
    session,
    requestMessages,
    draftRows,
    selectedDraftRow,
    selectedDraftPreview,
  })
  const loading = studioQuery.isLoading || readinessQuery.isLoading
  const pageError = studioQuery.error || readinessQuery.error

  useEffect(() => {
    draftPreviewRequestRef.current += 1
    setShowAllRequests(false)
    setSelectedDraftId('')
    setSelectedDraftPreview(null)
    setSelectedDraftCompare(null)
    setDraftPreviewView('CONTENT')
    setDraftPreviewError(null)
    setDraftCompareError(null)
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
    setSelectedDraftCompare(null)
    setDraftPreviewView('CONTENT')
    setDraftPreviewError(null)
    setDraftCompareError(null)
    setBusyKey((current) => current.startsWith('preview:') ? '' : current)
  }, [selectedDraftId, selectedDraftIterationId])

  const notify = (title, description, variant = 'success') => addToast({ title, description, variant })
  const failureMessage = (error) => {
    const normalized = normalizeError(error)
    return `${stripRequestReference(normalized.message)}${providerSafeContextDiagnosticMessage(normalized.diagnostic)}${normalized.requestId ? ` Reference: ${normalized.requestId}` : ''}`
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

  const setClarificationFromError = (error) => {
    const normalized = normalizeError(error)
    if (token(normalized.code) !== OUTPUT_CONTRACT_CLARIFICATION_CODE) return false
    setComposerError(stripRequestReference(normalized.message))
    return true
  }

  const reconcileMessageSubmission = async ({
    beforeMessages = [],
    boundOutputTypeKey = '',
    promptText,
    targetSessionId,
  }) => {
    const beforeIds = new Set(beforeMessages.map((message) => idOf(message, ['messageId', 'id', '_id'])).filter(Boolean))
    try {
      const response = await loadSessionForReconciliation({
        runtimeInstanceId,
        sessionId: targetSessionId,
      }).unwrap()
      const refreshedSession = payload(response)
      const refreshedMessages = (Array.isArray(refreshedSession?.messages) ? refreshedSession.messages : EMPTY_ARRAY)
        .filter(isUserRequestMessage)
      if (refreshedMessages.some((message) => !idOf(message, ['messageId', 'id', '_id']))) {
        throw new Error('Outcome Studio returned an unidentifiable request during reconciliation.')
      }
      const newMessages = refreshedMessages.filter((message) => (
        !beforeIds.has(idOf(message, ['messageId', 'id', '_id']))
      ))
      const normalizedPrompt = normalizeRequestText(promptText)
      const normalizedBoundKey = String(boundOutputTypeKey || refreshedSession?.requestedOutputTypeKey || '')
        .trim()
        .toLowerCase()
      const matchingMessages = newMessages.filter((message) => {
        const messageKey = String(message?.requestedOutputTypeKey || '').trim().toLowerCase()
        return normalizeRequestText(message?.content || message?.prompt) === normalizedPrompt
          && (!normalizedBoundKey || !messageKey || messageKey === normalizedBoundKey)
      })

      if (newMessages.length === 1 && matchingMessages.length === 1) {
        setPrompt('')
        setComposerError('')
        setUncertainPrompt('')
        await refetchAll(studioQuery.refetch, readinessQuery.refetch)
        notify(
          'Outcome Studio request recovered',
          'The request was saved even though its first response was interrupted.',
          'warning',
        )
        return 'COMMITTED'
      }
      if (newMessages.length === 0) return 'NOT_COMMITTED'
    } catch {
      // The fail-closed branch below intentionally covers query and identity uncertainty.
    }

    setUncertainPrompt(promptText)
    setComposerError('Outcome Studio could not confirm whether this request was saved. Refresh before trying again.')
    return 'UNCERTAIN'
  }

  const submitPromptToSession = async ({
    beforeMessages = [],
    boundOutputTypeKey = '',
    isNewSession = false,
    promptText,
    targetSessionId,
  }) => {
    try {
      await submitMessage({
        runtimeInstanceId,
        sessionId: targetSessionId,
        body: { prompt: promptText },
      }).unwrap()
      setPrompt('')
      setComposerError('')
      setUncertainPrompt('')
      await refreshAfterMutation(
        isNewSession
          ? 'Outcome Studio session started and request submitted.'
          : 'Outcome Studio request submitted.',
        isNewSession
          ? { refetchers: [studioQuery.refetch, readinessQuery.refetch] }
          : {},
      )
      return true
    } catch (error) {
      const reconciliation = await reconcileMessageSubmission({
        beforeMessages,
        boundOutputTypeKey,
        promptText,
        targetSessionId,
      })
      if (reconciliation === 'COMMITTED' || reconciliation === 'UNCERTAIN') return reconciliation === 'COMMITTED'
      if (setClarificationFromError(error)) {
        notify('Outcome Studio needs clarification', failureMessage(error), 'warning')
      } else if (isNewSession) {
        notify(
          'Outcome Studio session saved',
          'The session was started, but the request was not saved. Submit the retained request again.',
          'warning',
        )
      } else {
        notify('Outcome Studio action failed', failureMessage(error), 'error')
      }
      return false
    }
  }

  const handleStartSession = async () => {
    const promptText = normalizeRequestText(prompt)
    if (!promptText || requestSubmitting) return
    setRequestSubmitting(true)
    setComposerError('')
    try {
      const response = await createSession({
        runtimeInstanceId,
        body: { prompt: promptText },
      }).unwrap()
      const createdSession = payload(response)
      const createdSessionId = sessionIdOf(createdSession)
      if (!createdSessionId) throw new Error('Outcome Studio did not return the new session.')
      await submitPromptToSession({
        beforeMessages: [],
        boundOutputTypeKey: createdSession?.requestedOutputTypeKey,
        isNewSession: true,
        promptText,
        targetSessionId: createdSessionId,
      })
    } catch (error) {
      if (setClarificationFromError(error)) {
        notify('Outcome Studio needs clarification', failureMessage(error), 'warning')
      } else {
        try {
          const refreshed = await studioQuery.refetch()
          await readinessQuery.refetch()
          const refreshedStudio = payload(refreshed?.data)
          const recoveredSession = activeSessionFrom(refreshedStudio)
          const recoveredSessionId = sessionIdOf(recoveredSession)
          if (
            recoveredSessionId
            && normalizeRequestText(recoveredSession?.requestText) === promptText
          ) {
            await submitPromptToSession({
              beforeMessages: [],
              boundOutputTypeKey: recoveredSession?.requestedOutputTypeKey,
              isNewSession: true,
              promptText,
              targetSessionId: recoveredSessionId,
            })
          } else {
            notify('Outcome Studio action failed', failureMessage(error), 'error')
          }
        } catch {
          notify('Outcome Studio action failed', failureMessage(error), 'error')
        }
      }
    } finally {
      setRequestSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    const promptText = normalizeRequestText(prompt)
    if (!activeSessionId || !promptText || requestSubmitting) return
    setRequestSubmitting(true)
    setComposerError('')
    try {
      await submitPromptToSession({
        beforeMessages: requestMessages,
        boundOutputTypeKey: session?.requestedOutputTypeKey,
        promptText,
        targetSessionId: activeSessionId,
      })
    } finally {
      setRequestSubmitting(false)
    }
  }

  const handleGenerate = async (message) => {
    const messageId = idOf(message, ['messageId', 'id', '_id'])
    if (!activeSessionId || !messageId || generationBlockedReason) return
    setBusyKey(`generate:${messageId}`)
    try {
      await generateResponse({
        runtimeInstanceId,
        sessionId: activeSessionId,
        messageId,
        body: { allowReadyWithGaps: true },
      }).unwrap()
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
    setAssetPreviewView('CONTENT')
    await Promise.allSettled([
      loadAsset({ runtimeInstanceId, outcomeAssetId }),
      loadPreview({ runtimeInstanceId, outcomeAssetId }),
    ])
  }

  const handleReviseAsset = async (asset) => {
    const outcomeAssetId = assetIdOf(asset)
    if (
      !activeSessionId
      || !outcomeAssetId
      || token(asset?.status) === 'PUBLISHED'
    ) return false

    setBusyKey(`revise:${outcomeAssetId}`)
    try {
      const response = await reviseAsset({
        runtimeInstanceId,
        sessionId: activeSessionId,
        outcomeAssetId,
        body: {},
      }).unwrap()
      const revised = payload(response)
      const refreshed = await refreshAfterMutation(
        'A new unapproved Working Draft was created from the approved baseline.',
        { title: 'Revision ready' },
      )
      if (refreshed) {
        setActiveTab(1)
        const revisedDraftId = draftIdOf(revised?.draft)
        if (revisedDraftId) setSelectedDraftId(revisedDraftId)
      }
      return refreshed
    } catch (error) {
      notify('Revision failed', failureMessage(error), 'error')
      return false
    } finally {
      setBusyKey('')
    }
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
    setSelectedDraftCompare(null)
    setDraftPreviewView('CONTENT')
    setDraftPreviewError(null)
    setDraftCompareError(null)
    setBusyKey(`preview:${draftId}`)
    try {
      const [previewResult, compareResult] = await Promise.allSettled([
        loadDraftPreview({
          runtimeInstanceId,
          sessionId: activeSessionId,
          draftId,
        }).unwrap(),
        loadDraftCompare({
          runtimeInstanceId,
          sessionId: activeSessionId,
          draftId,
        }).unwrap(),
      ])
      if (
        draftPreviewRequestRef.current !== requestId
        || currentSelectedDraftIterationRef.current !== draftIterationId
      ) return
      if (previewResult.status === 'rejected') throw previewResult.reason
      setSelectedDraftPreview(payload(previewResult.value))
      if (compareResult.status === 'fulfilled') {
        setSelectedDraftCompare(payload(compareResult.value))
      } else if (compareBlockerOf(compareResult.reason) !== 'OUTCOME_DRAFT_PREVIOUS_ITERATION_MISSING') {
        setDraftCompareError(compareResult.reason)
      }
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

  const renderDraftPreviewBody = (preview) => (
    String(preview?.markdown || '').trim()
      ? <div className="outcome-studio-workspace__preview-body outcome-studio-workspace__preview-body--markdown">{renderSafeMarkdown(preview.markdown)}</div>
      : preview?.sections?.length
        ? <div className="outcome-studio-workspace__preview-body">{preview.sections.map((section) => <section key={section.key || section.label}><h4>{section.label}</h4><p>{section.body}</p></section>)}</div>
        : <Status variant="neutral" size="sm">Preview content is not available for this version.</Status>
  )

  const renderDraftGovernanceView = () => {
    const draft = selectedDraftRow?.draft || {}
    const versionBound = Boolean(selectedDraftPreview?.draftIterationId)
      && selectedDraftPreview.draftIterationId === draft.currentIterationId
    const contentReviewPassed = token(draft.contentReview?.result) === 'ALLOW'
    const executionPassed = isExecutionApprovalReady(draft)
    return (
      <div className="outcome-studio-workspace__draft-governance-view">
        <dl className="outcome-studio-workspace__draft-governance-list">
          <div><dt>Draft identity</dt><dd>{draft.draftId || 'Not recorded'}</dd></div>
          <div><dt>Current version</dt><dd>v{draft.currentIterationNumber || 1} · {draft.currentIterationId || 'Not recorded'}</dd></div>
          <div><dt>Content review</dt><dd><Status variant={statusVariant(draft.contentReview?.result)} size="sm">{formatRuntimeTokenLabel(draft.contentReview?.result || 'NOT_RECORDED')}</Status></dd></div>
          <div><dt>Execution approval readiness</dt><dd><Status variant={statusVariant(draft.approvalReadiness?.status)} size="sm">{formatRuntimeTokenLabel(draft.approvalReadiness?.status || 'NOT_RECORDED')}</Status></dd></div>
        </dl>
        <ul className="outcome-studio-workspace__draft-governance-checks" aria-label="Working draft governance checks">
          <li>{renderEvidenceAcknowledgement(versionBound, `Current draft version binding: ${versionBound ? 'passed' : 'not passed'}`)}<span>Current preview is bound to the persisted draft iteration.</span></li>
          <li>{renderEvidenceAcknowledgement(contentReviewPassed, `Customer content review: ${contentReviewPassed ? 'passed' : 'not passed'}`)}<span>Customer content review is {contentReviewPassed ? 'allowed' : 'not passed'}.</span></li>
          <li>{renderEvidenceAcknowledgement(executionPassed, `Execution evidence: ${executionPassed ? 'passed' : 'not passed'}`)}<span>Required execution evidence for this exact version is {executionPassed ? 'recorded' : 'not recorded'}.</span></li>
        </ul>
        <p className="outcome-studio-workspace__draft-governance-note">Governance metadata is shown here and in the readiness path; it is not included in customer content.</p>
      </div>
    )
  }

  const renderDraftCompareView = () => {
    if (draftCompareError) {
      return <div className="outcome-studio-workspace__error"><Status variant="error" size="sm" showIcon>Draft comparison is temporarily unavailable.</Status><ErrorSupportPanel error={normalizeError(draftCompareError)} context="outcome-studio-draft-compare" /></div>
    }
    if (!selectedDraftCompare?.compareAvailable) {
      return <Status variant="neutral" size="sm">Compare is unavailable until a conversational revision creates a previous draft version.</Status>
    }
    return (
      <div className="outcome-studio-workspace__draft-compare-grid" aria-label="Working draft version comparison">
        {[['from', selectedDraftCompare.from, 'Previous version'], ['to', selectedDraftCompare.to, 'Current version']].map(([key, version, label]) => (
          <article key={key} className="outcome-studio-workspace__draft-compare-column">
            <header><div><span className="outcome-studio-workspace__kicker">{label}</span><h4>{version?.title || 'Working draft'}</h4></div><Status variant="info" size="sm">v{version?.iterationNumber || '?'}</Status></header>
            {renderDraftPreviewBody(version)}
          </article>
        ))}
      </div>
    )
  }

  const renderApprovedAssetGovernanceView = () => {
    const asset = selectedAssetDetail || selectedAsset || {}
    const currentVersion = (Array.isArray(asset.versions) ? asset.versions : EMPTY_ARRAY).find(
      (version) => version?.outcomeAssetVersionId === asset.currentVersionId,
    ) || asset.versions?.[0] || {}
    const evidence = currentVersion.governanceEvidence || asset.governanceEvidence || {}
    const sourceOutput = evidence.sourceOutput || {}
    const truthBinding = evidence.truthBinding || {}
    const runtimeContext = evidence.runtimeContext || {}
    const knowledgeResolution = evidence.knowledgeResolution || {}
    const governedReasoning = evidence.governedReasoning || {}
    const record = evidence.record || {}
    const stagedPacks = (Array.isArray(evidence.stages) ? evidence.stages : EMPTY_ARRAY)
      .flatMap((stageItem) => Array.isArray(stageItem.knowledgePacks) ? stageItem.knowledgePacks : EMPTY_ARRAY)
    const uniquePacks = Array.from(new Map(stagedPacks.map((pack) => [
      `${pack.packKey || pack.label || 'pack'}:${pack.versionId || pack.semanticVersion || ''}`,
      pack,
    ])).values())
    const assetIdentity = asset.outcomeAssetId || record.id
    const versionIdentity = currentVersion.outcomeAssetVersionId || asset.currentVersionId || record.iterationId
    const versionNumber = currentVersion.versionNumber || asset.currentVersionNumber || record.versionNumber
    const valueOrNotRecorded = (value) => value || 'Not recorded'
    return (
      <div className="outcome-studio-workspace__asset-governance-view">
        <dl className="outcome-studio-workspace__asset-governance-list">
          <div><dt>Asset identity</dt><dd>{valueOrNotRecorded(assetIdentity)}</dd></div>
          <div><dt>Approved version</dt><dd>v{versionNumber || '?'} Â· {valueOrNotRecorded(versionIdentity)}</dd></div>
          <div><dt>Source deliverable</dt><dd><Status variant={statusVariant(sourceOutput.status)} size="sm">{formatRuntimeTokenLabel(sourceOutput.status || 'NOT_RECORDED')}</Status><span>{valueOrNotRecorded(sourceOutput.outputTypeLabel || sourceOutput.outputTypeKey || sourceOutput.outputAssetId)}</span></dd></div>
          <div><dt>Verified information / Certified Truth</dt><dd><Status variant={statusVariant(truthBinding.currentness || truthBinding.status)} size="sm">{formatRuntimeTokenLabel(truthBinding.currentness || truthBinding.status || 'NOT_RECORDED')}</Status><span>{valueOrNotRecorded([truthBinding.status, truthBinding.truthSignatureId].filter(Boolean).join(' Â· '))}</span></dd></div>
          <div><dt>Runtime context</dt><dd>{valueOrNotRecorded([runtimeContext.runtimeInstanceKey, runtimeContext.runtimeType, runtimeContext.frameworkKey, runtimeContext.packageKey, runtimeContext.packageVersion].filter(Boolean).join(' Â· '))}</dd></div>
          <div><dt>Knowledge resolution</dt><dd><Status variant={statusVariant(knowledgeResolution.status)} size="sm">{formatRuntimeTokenLabel(knowledgeResolution.status || 'NOT_RECORDED')}</Status><span>{valueOrNotRecorded([knowledgeResolution.manifestKey, knowledgeResolution.manifestVersion, knowledgeResolution.policyVersion].filter(Boolean).join(' Â· '))}</span></dd></div>
          <div><dt>Governed reasoning chain</dt><dd><Status variant={statusVariant(governedReasoning.executionId || governedReasoning.runtimeArtifactId ? 'RECORDED' : 'NOT_RECORDED')} size="sm">{formatRuntimeTokenLabel(governedReasoning.executionId || governedReasoning.runtimeArtifactId ? 'RECORDED' : 'NOT_RECORDED')}</Status><span>{valueOrNotRecorded([governedReasoning.executionId, governedReasoning.runtimeArtifactId, governedReasoning.providerMode].filter(Boolean).join(' Â· '))}</span></dd></div>
          <div><dt>Content validation</dt><dd><Status variant={statusVariant(asset.contentReview?.result || currentVersion.contentReview?.result)} size="sm">{formatRuntimeTokenLabel(asset.contentReview?.result || currentVersion.contentReview?.result || 'NOT_RECORDED')}</Status><span>{valueOrNotRecorded(asset.contentReview?.checkedAt || currentVersion.contentReview?.checkedAt)}</span></dd></div>
        </dl>
        <div className="outcome-studio-workspace__asset-governance-section">
          <div className="outcome-studio-workspace__panel-heading"><div><h4>Knowledge Pack execution</h4><p>Server-projected binding and execution evidence for this approved asset version.</p></div><Status variant={uniquePacks.length ? 'info' : 'neutral'} size="sm">{uniquePacks.length} pack{uniquePacks.length === 1 ? '' : 's'}</Status></div>
          {uniquePacks.length ? (
            <ul className="outcome-studio-workspace__asset-governance-packs" aria-label="Approved asset Knowledge Pack execution">
              {uniquePacks.map((pack) => {
                const hasReceipt = Array.isArray(pack.executionChecks) && pack.executionChecks.length > 0
                const passed = hasReceipt && isExecutionPassed(pack.executionStatus)
                return <li key={`${pack.packKey || pack.label}-${pack.versionId || pack.semanticVersion}`}>
                  {renderEvidenceAcknowledgement(passed, `${pack.label || pack.packKey}: ${passed ? 'execution passed' : hasReceipt ? 'execution not passed' : 'execution not recorded'}`)}
                  <span><strong>{pack.label || pack.packKey || 'Knowledge Pack'}</strong><small>{valueOrNotRecorded([pack.packKey, pack.semanticVersion ? `v${pack.semanticVersion}` : '', pack.executionStatus ? formatRuntimeTokenLabel(pack.executionStatus) : ''].filter(Boolean).join(' Â· '))}</small></span>
                </li>
              })}
            </ul>
          ) : <Status variant="neutral" size="sm">Knowledge Pack execution is not recorded for this asset version.</Status>}
        </div>
        <p className="outcome-studio-workspace__draft-governance-note">This view contains governance and linkage metadata only. The Content view remains the customer-facing body.</p>
      </div>
    )
  }

  const renderSummary = () => {
    const frameworkHandoff = readiness.frameworkHandoff || {}
    const sourceOutput = information.sourceOutput || null
    return (
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
        <div>
          <dt>Framework handoff</dt>
          <dd>
            <Status variant={statusVariant(frameworkHandoff.status)} size="sm" showIcon>
              {formatRuntimeTokenLabel(frameworkHandoff.status || 'UNKNOWN')}
            </Status>
            <small>{formatRuntimeTokenLabel(frameworkHandoff.currentness || 'UNKNOWN')} · {frameworkHandoff.contractVersion || 'Contract not recorded'}</small>
          </dd>
        </div>
        <div>
          <dt>Source context</dt>
          <dd>{sourceContextLabelOf(sourceOutput)}</dd>
        </div>
        </dl>
        {readiness.blockers?.length ? (
          <ul className="outcome-studio-workspace__messages" aria-label="Outcome Studio blockers">
            {readiness.blockers.map((blocker) => <li key={blocker.code || blocker.message}>{blocker.message}</li>)}
          </ul>
        ) : null}
      </section>
    )
  }

  const renderStageTracker = () => (
    <section className="outcome-studio-workspace__stage-tracker" aria-label="Outcome Studio stage progress">
      <div className="outcome-studio-workspace__stage-heading">
        <div>
          <span className="outcome-studio-workspace__kicker">Governed progression</span>
          <h2>Outcome readiness path</h2>
          <p>Each stage is shown from the current server-owned session and readiness state. A mandatory blocked stage prevents a governed outcome.</p>
          <p className="outcome-studio-workspace__stage-acknowledgement-legend" aria-label="Stage result legend">
            <span><MdCheck aria-hidden="true" /> Tick = all required checks passed for this exact draft version</span>
            <span><MdClose aria-hidden="true" /> Cross = not passed</span>
          </p>
          {studio?.governanceEvidence?.notice ? <p className="outcome-studio-workspace__stage-evidence-notice">{studio.governanceEvidence.notice}</p> : null}
        </div>
        <Status variant={stageTracker.every(({ status }) => isStagePassed(status)) ? 'success' : 'warning'} size="sm" showIcon>
          {stageTracker.filter(({ status }) => isStagePassed(status)).length}/{stageTracker.length} stages passed
        </Status>
      </div>
      <ol className="outcome-studio-workspace__stage-list">
        {stageTracker.map((item, index) => (
          <li key={item.key} className={`outcome-studio-workspace__stage outcome-studio-workspace__stage--${item.status.toLowerCase()}`}>
            <div className="outcome-studio-workspace__stage-index" aria-hidden="true">{index + 1}</div>
            <div className="outcome-studio-workspace__stage-copy">
              <div className="outcome-studio-workspace__stage-title">
                <div className="outcome-studio-workspace__stage-title-label">
                  <span
                    className={`outcome-studio-workspace__stage-acknowledgement outcome-studio-workspace__stage-acknowledgement--${isStagePassed(item.status) ? 'complete' : 'incomplete'}`}
                    role="img"
                    aria-label={`${item.label}: ${isStagePassed(item.status) ? 'passed' : 'not passed'}`}
                  >
                    {isStagePassed(item.status) ? <MdCheck aria-hidden="true" /> : <MdClose aria-hidden="true" />}
                  </span>
                  <h3>{item.label}</h3>
                </div>
                <Status variant={statusVariant(item.status)} size="sm" showIcon>{item.statusLabel}</Status>
              </div>
              <p>{item.message}</p>
              {item.nextAction ? <p className="outcome-studio-workspace__stage-next">Next: {item.nextAction}</p> : null}
              {item.evidence ? (
                <div className="outcome-studio-workspace__stage-evidence">
                  <button
                    type="button"
                    className="outcome-studio-workspace__stage-evidence-trigger"
                    aria-haspopup="dialog"
                    aria-label={`${item.label} evidence details`}
                    aria-expanded={openEvidenceStageKey === item.key}
                    aria-controls={evidenceDialogIdOf(item.key)}
                    onClick={() => setOpenEvidenceStageKey(item.key)}
                  >
                    <span>Evidence details</span>
                    <small>{item.evidence.knowledgePacks?.length || 0} Knowledge Packs · {item.evidence.inputs?.length || 0} recorded inputs</small>
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {stageTracker.map((item) => {
        if (!item.evidence) return null
        const dialogId = evidenceDialogIdOf(item.key)
        const titleId = `${dialogId}-title`
        return (
          <Dialog
            key={dialogId}
            id={dialogId}
            open={openEvidenceStageKey === item.key}
            onClose={() => setOpenEvidenceStageKey('')}
            size="xl"
            aria-labelledby={titleId}
          >
            <Dialog.Header>
              <div className="outcome-studio-workspace__stage-evidence-dialog-heading">
                {renderEvidenceAcknowledgement(
                  isStagePassed(item.status),
                  `${item.label}: ${isStagePassed(item.status) ? 'passed' : 'not passed'}`,
                )}
                <div>
                  <h2 id={titleId}>{item.label} evidence</h2>
                  <p className="outcome-studio-workspace__stage-evidence-dialog-status">{item.statusLabel}</p>
                </div>
              </div>
            </Dialog.Header>
            <Dialog.Body>{renderStageEvidenceContent(item)}</Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setOpenEvidenceStageKey('')}>Close</Button>
            </Dialog.Footer>
          </Dialog>
        )
      })}
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
      {renderStageTracker()}

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
                <Textarea
                  id="outcome-studio-request"
                  label="Your request"
                  value={prompt}
                  rows={5}
                  maxLength={studio?.conversation?.requestMaxLength || 2000}
                  disabled={Boolean(activeSessionId) && !conversationEnabled}
                  error={composerError}
                  helperText="Outcome Studio will infer the deliverable, audience, structure, style, and applicable guidance from your request."
                  onChange={(event) => {
                    setPrompt(event.target.value)
                    setComposerError('')
                    setUncertainPrompt('')
                  }}
                />
                {selectedDraftRow ? <div className="outcome-studio-workspace__asset-binding" role="status"><Status variant="info" size="sm" showIcon>Composer bound to current draft</Status><span>{selectedDraftRow.draft.title || selectedDraftRow.draft.outputTypeLabel || 'Working draft'} · v{selectedDraftRow.draft.currentIterationNumber || 1}</span><small>Submitting a revision keeps the same governed asset identity and creates the next draft version.</small></div> : null}
                <ButtonGroup align="end" stackOnMobile fullWidthOnMobile>
                  <Button
                    loading={requestSubmitting || submitState.isLoading || createState.isLoading}
                    disabled={
                      !prompt.trim()
                      || normalizeRequestText(uncertainPrompt) === normalizeRequestText(prompt)
                      || (activeSessionId ? !conversationEnabled : readiness.canStartSession !== true)
                    }
                    leftIcon={<MdPlayArrow aria-hidden="true" />}
                    onClick={activeSessionId ? handleSubmit : handleStartSession}
                  >
                    {selectedDraftRow ? 'Submit revision' : 'Submit request'}
                  </Button>
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
              {selectedDraftRow ? (
                <section className="outcome-studio-workspace__preview" aria-label="Outcome Studio working draft preview">
                  <div className="outcome-studio-workspace__panel-heading">
                    <div><h3>Working Draft Preview</h3><p>{selectedDraftRow.draft.title || selectedDraftRow.draft.outputTypeLabel || 'Working draft'}</p></div>
                    {busyKey === `preview:${selectedDraftId}` ? <Spinner size="sm" aria-label="Loading working draft preview" /> : <Status variant={draftPreviewError ? 'error' : selectedDraftPreview ? 'success' : 'neutral'} size="sm">{draftPreviewError ? 'Unavailable' : selectedDraftPreview ? 'Available' : 'Not loaded'}</Status>}
                  </div>
                  <div className="outcome-studio-workspace__draft-view-tabs" role="tablist" aria-label="Working draft views">
                    {[
                      ['CONTENT', 'Content'],
                      ['GOVERNANCE', 'Governance'],
                      ['COMPARE', 'Compare'],
                    ].map(([view, label]) => (
                      <button
                        key={view}
                        type="button"
                        role="tab"
                        aria-selected={draftPreviewView === view}
                        aria-controls={`outcome-studio-draft-view-${view.toLowerCase()}`}
                        disabled={view === 'COMPARE' && !selectedDraftCompare}
                        onClick={() => setDraftPreviewView(view)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div id={`outcome-studio-draft-view-${draftPreviewView.toLowerCase()}`} role="tabpanel" tabIndex="0">
                    {draftPreviewSupportError ? <div className="outcome-studio-workspace__error"><Status variant="error" size="sm" showIcon>{draftPreviewSupportError.message}</Status><ErrorSupportPanel error={draftPreviewSupportError} context="outcome-studio-draft-preview" /></div>
                      : draftPreviewView === 'GOVERNANCE' ? renderDraftGovernanceView()
                        : draftPreviewView === 'COMPARE' ? renderDraftCompareView()
                          : renderDraftPreviewBody(selectedDraftPreview)}
                  </div>
                </section>
              ) : null}
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
                return <li key={assetId}><div><h3>{asset.title || asset.outputTypeLabel || 'Approved output'}</h3><p>Version {asset.currentVersionNumber || 1} | Generated {formatDateTime(asset.generatedAt || asset.createdAt, 'Time unavailable')}</p><Status variant={statusVariant(asset.status)} size="sm">{formatRuntimeTokenLabel(asset.status || 'APPROVED')}</Status>{previewReason ? <p id={previewReasonId}>{previewReason}</p> : null}{publishReason && publishReason !== previewReason ? <p id={reasonId}>{publishReason}</p> : null}</div><ButtonGroup align="end"><Button variant="outline" size="sm" leftIcon={<MdVisibility aria-hidden="true" />} disabled={Boolean(previewReason)} aria-describedby={previewReason ? previewReasonId : undefined} onClick={() => handleViewAsset(asset)}>Preview</Button>{token(asset.status) !== 'PUBLISHED' ? <Button variant="outline" size="sm" leftIcon={<MdRefresh aria-hidden="true" />} loading={busyKey === `revise:${assetId}`} disabled={!activeSessionId} onClick={() => handleReviseAsset(asset)}>Revise as working draft</Button> : null}<Button variant="outline" size="sm" leftIcon={<MdPublish aria-hidden="true" />} loading={busyKey === `publish:${assetId}`} disabled={Boolean(publishReason)} aria-describedby={publishReason ? (publishReason === previewReason ? previewReasonId : reasonId) : undefined} onClick={() => handlePublish(asset)}>Publish</Button>{formats.map((descriptor) => { const format = typeof descriptor === 'string' ? descriptor : descriptor.format; const formatDescriptor = typeof descriptor === 'string' ? { format: descriptor } : descriptor; return <Button key={format} variant="outline" size="sm" leftIcon={<MdDownload aria-hidden="true" />} loading={busyKey === `export:${assetId}:${token(format)}`} disabled={Boolean(distributionReason)} aria-describedby={distributionReason ? (distributionReason === previewReason ? previewReasonId : reasonId) : undefined} onClick={() => handleExport(asset, formatDescriptor)}>{formatDescriptor.label || formatRuntimeTokenLabel(format)}</Button> })}</ButtonGroup></li>
              })}</ul> : <Status variant="neutral" size="sm">No approved outputs</Status>}
              {selectedAsset ? <section className="outcome-studio-workspace__preview" aria-label="Outcome Studio generated body preview"><div className="outcome-studio-workspace__panel-heading"><div><h3>Generated Body Preview</h3><p>{selectedAsset.title || selectedAsset.outputTypeLabel}</p></div>{previewLoading ? <Spinner size="sm" aria-label="Loading output preview" /> : <Status variant={previewError ? 'error' : selectedPreview?.previewAvailable === false ? 'warning' : selectedPreview ? 'success' : 'neutral'} size="sm">{previewError || selectedPreview?.previewAvailable === false ? 'Unavailable' : selectedPreview ? 'Available' : 'Not loaded'}</Status>}</div><div className="outcome-studio-workspace__draft-view-tabs" role="tablist" aria-label="Approved output views"><button type="button" role="tab" aria-selected={assetPreviewView === 'CONTENT'} aria-controls="outcome-studio-approved-output-content" onClick={() => setAssetPreviewView('CONTENT')}>Content</button><button type="button" role="tab" aria-selected={assetPreviewView === 'GOVERNANCE'} aria-controls="outcome-studio-approved-output-governance" onClick={() => setAssetPreviewView('GOVERNANCE')}>Governance</button></div><div id={`outcome-studio-approved-output-${assetPreviewView.toLowerCase()}`} role="tabpanel" tabIndex="0">{assetPreviewView === 'GOVERNANCE' ? renderApprovedAssetGovernanceView() : previewError ? <Status variant="error" size="sm" showIcon>{previewFailureMessage(previewError)}</Status> : String(selectedPreview?.markdown || '').trim() ? <div className="outcome-studio-workspace__preview-body outcome-studio-workspace__preview-body--markdown">{renderSafeMarkdown(selectedPreview.markdown)}</div> : selectedPreview?.sections?.length ? <div className="outcome-studio-workspace__preview-body">{selectedPreview.sections.map((section) => <section key={section.key || section.label}><h4>{section.label}</h4><p>{section.body}</p></section>)}</div> : selectedAssetDetail ? <Status variant="neutral" size="sm">Preview content is not available for this version.</Status> : null}</div></section> : null}
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
