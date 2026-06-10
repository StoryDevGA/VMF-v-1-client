import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  MdBolt,
  MdAdd,
  MdAccountTree,
  MdArrowForward,
  MdCheckCircle,
  MdClose,
  MdCompareArrows,
  MdDelete,
  MdDownload,
  MdDonutLarge,
  MdErrorOutline,
  MdFactCheck,
  MdInfoOutline,
  MdInventory2,
  MdOutlineHistory,
  MdRefresh,
  MdSave,
  MdArticle,
  MdOutlineWarningAmber,
  MdSource,
  MdUploadFile,
} from 'react-icons/md'
import { Badge } from '../../components/Badge'
import { Button, ButtonGroup } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { ProgressBar, getProgressBarValueTint } from '../../components/ProgressBar'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { TabView } from '../../components/TabView'
import { Textarea } from '../../components/Textarea'
import { Tooltip } from '../../components/Tooltip'
import { useToaster } from '../../components/Toaster'
import {
  useAcceptRuntimeDiscoveryMutation,
  useAcceptRuntimeSectionMutation,
  useClearRuntimeSectionEvidenceMutation,
  useExecuteRuntimeActionMutation,
  useGetRuntimeEvidenceQuery,
  useCreateRuntimeOutputRequestMutation,
  useGenerateRuntimeOutputRequestMutation,
  useGetRuntimeOutputLabQuery,
  useGetRuntimeRendererQuery,
  useLazyExportRuntimeOutputAssetQuery,
  useMutateRuntimeStateMutation,
  useResetRuntimeDiscoveryMutation,
  useReviewRuntimeDiscoveryEvidenceMutation,
  useReviewAllRuntimeSectionEvidenceMutation,
  useReviewRuntimeSectionEvidenceMutation,
  useUpdateRuntimeSectionEvidenceMutation,
  useUpdateRuntimeDiscoveryInputsMutation,
} from '../../store/api/runtimeInstanceApi.js'
import {
  DISCOVERY_ACQUISITION_PROFILE_GUIDANCE,
  DISCOVERY_ACQUISITION_PROFILES,
  DISCOVERY_ACQUISITION_PROFILE_OPTIONS,
} from '../../constants/discoveryAcquisitionProfiles.js'
import { formatDateOnly, formatDateTimeParts } from '../../utils/dateTime.js'
import { normalizeError, stripRequestReference } from '../../utils/errors.js'
import {
  formatRuntimeTokenLabel,
  getExecutionStateVariant,
  getRuntimeExecutionState,
  getRuntimeInstanceDisplayId,
  getRuntimeLifecycleStatus,
  getRuntimeStatusVariant,
} from '../../utils/runtimeWorkspace.js'
import './RuntimeWorkspace.css'

const EMPTY_ARRAY = Object.freeze([])
const RUNTIME_WORKSPACE_BACK_FALLBACK = '/app/workspaces/vmf'
const DISCOVERY_INPUT_LABELS = Object.freeze({
  companyWebsite: 'Company website',
  websiteSources: 'Website sources',
  companyName: 'Company name',
  marketRegion: 'Market / region',
  targetOffer: 'Target product or offer',
  notes: 'Optional notes',
})
const DISCOVERY_DOCUMENT_ACCEPT = [
  '.csv',
  '.docx',
  '.md',
  '.pdf',
  '.pptx',
  '.txt',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'text/markdown',
  'text/plain',
].join(',')
const DISCOVERY_DOCUMENT_MAX_COUNT = 5
const DISCOVERY_DOCUMENT_MAX_BYTES = 2500000
const DISCOVERY_PPTX_DOCUMENT_MAX_BYTES = 40000000
const DISCOVERY_WEBSITE_SOURCE_MAX_COUNT = 10

const buildEmptyDiscoveryDraftInputs = () => ({
  companyWebsite: '',
  websiteSources: [''],
  companyName: '',
  marketRegion: '',
  targetOffer: '',
  notes: '',
})
const INTELLIGENCE_HUB_LABEL = 'Intelligence Hub'
const INTELLIGENCE_HUB_EVIDENCE_LABEL = `${INTELLIGENCE_HUB_LABEL} evidence`
const INTELLIGENCE_HUB_INPUTS_LABEL = `${INTELLIGENCE_HUB_LABEL} inputs`
const INTELLIGENCE_HUB_TAB_INDEXES = Object.freeze({
  OVERVIEW: 0,
  CONTEXT: 1,
  SOURCES: 2,
  EVIDENCE: 3,
  COVERAGE: 4,
  GOVERNANCE: 5,
})
const normalizeIntelligenceHubDisplayText = (value) =>
  String(value || '').trim().replace(/\bDiscovery\b/g, INTELLIGENCE_HUB_LABEL)

const getRendererPayload = (response) => response?.data ?? null

const getRuntimeWorkspaceBackTarget = (state) => {
  const from = typeof state?.from === 'string' ? state.from.trim() : ''
  if (
    from === RUNTIME_WORKSPACE_BACK_FALLBACK
    || from.startsWith(`${RUNTIME_WORKSPACE_BACK_FALLBACK}?`)
    || from.startsWith(`${RUNTIME_WORKSPACE_BACK_FALLBACK}#`)
  ) {
    return from
  }
  return RUNTIME_WORKSPACE_BACK_FALLBACK
}

const getFileExtension = (fileName = '') => {
  const normalized = String(fileName || '').trim().toLowerCase()
  const dotIndex = normalized.lastIndexOf('.')
  return dotIndex >= 0 ? normalized.slice(dotIndex) : ''
}

const isSupportedDiscoveryDocument = (file) => {
  const mimeType = String(file?.type || '').trim().toLowerCase()
  const extension = getFileExtension(file?.name)
  return [
    '.csv',
    '.docx',
    '.md',
    '.pdf',
    '.pptx',
    '.txt',
  ].includes(extension) || [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'text/markdown',
    'text/plain',
  ].includes(mimeType)
}

const isPptxDiscoveryDocument = (file) => {
  const mimeType = String(file?.type || '').trim().toLowerCase()
  return getFileExtension(file?.name) === '.pptx'
    || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}

const getDiscoveryDocumentMaxBytes = (file) =>
  isPptxDiscoveryDocument(file) ? DISCOVERY_PPTX_DOCUMENT_MAX_BYTES : DISCOVERY_DOCUMENT_MAX_BYTES

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
  reader.readAsDataURL(file)
})

const buildDiscoveryDocumentSource = async (file) => {
  if (!isSupportedDiscoveryDocument(file)) {
    throw new Error(`${file.name} is not a supported ${INTELLIGENCE_HUB_LABEL} document type.`)
  }
  if (file.size > getDiscoveryDocumentMaxBytes(file)) {
    throw new Error(`${file.name} exceeds the ${INTELLIGENCE_HUB_LABEL} document size limit.`)
  }

  return {
    fileName: file.name,
    mimeType: file.type || '',
    assetType: 'CUSTOMER_DOCUMENT',
    sizeBytes: file.size,
    contentBase64: await readFileAsDataUrl(file),
  }
}

const buildSectionDocumentSource = async (file) => {
  if (!isSupportedDiscoveryDocument(file)) {
    throw new Error(`${file.name} is not a supported section evidence document type.`)
  }
  if (file.size > getDiscoveryDocumentMaxBytes(file)) {
    throw new Error(`${file.name} exceeds the section evidence document size limit.`)
  }

  return {
    fileName: file.name,
    mimeType: file.type || '',
    assetType: 'SECTION_SUPPORTING_FILE',
    sizeBytes: file.size,
    contentBase64: await readFileAsDataUrl(file),
  }
}

const formatDocumentSize = (sizeBytes = 0) =>
  `${Math.max(1, Math.round((Number(sizeBytes) || 0) / 1024))} KB`

const DOCUMENT_EXTRACTION_STORAGE_NOTE = 'Original documents are not stored. Only extracted evidence and source details are retained.'
const DOCUMENT_EXTRACTION_HELPER_TEXT = 'PDF, PPTX, DOCX, TXT, MD, or CSV. Files are used only to extract evidence; originals are not stored.'
const PDF_UNREADABLE_TEXT_ERROR_PREFIX = 'PDF document did not contain readable extractable text'
const PDF_UNREADABLE_TEXT_HELPER = 'This PDF has no readable text layer. Use an OCR/searchable PDF, PPTX, DOCX, TXT, MD, or CSV.'
const PPTX_UNREADABLE_TEXT_ERROR_PREFIX = 'PowerPoint document did not contain readable extractable slide text or speaker notes'
const PPTX_UNREADABLE_TEXT_HELPER = 'This PowerPoint file has no extractable slide text or speaker notes. Use a PPTX with selectable text.'
const PPTX_MALFORMED_ERROR_PREFIX = 'PowerPoint file is not a valid PPTX package'
const PPTX_MALFORMED_HELPER = 'We could not extract this presentation. Confirm that it is a valid PPTX file.'

const getNestedDetailMessage = (details) => {
  if (!details || typeof details !== 'object') return ''

  const stack = [details]
  while (stack.length > 0) {
    const current = stack.shift()
    if (!current || typeof current !== 'object') continue

    if (typeof current.message === 'string' && current.message.trim()) {
      return current.message.trim()
    }

    stack.push(...Object.values(current).filter((value) => value && typeof value === 'object'))
  }

  return ''
}

const formatSectionSupportingFileError = (error) => {
  const normalizedError = normalizeError(error)
  const nestedMessage =
    getNestedDetailMessage(normalizedError.details?.ingestionError)
    || getNestedDetailMessage(normalizedError.details)
  const baseMessage = stripRequestReference(nestedMessage || normalizedError.message)
  const message = baseMessage.startsWith(PDF_UNREADABLE_TEXT_ERROR_PREFIX)
    ? PDF_UNREADABLE_TEXT_HELPER
    : baseMessage.startsWith(PPTX_UNREADABLE_TEXT_ERROR_PREFIX)
      ? PPTX_UNREADABLE_TEXT_HELPER
      : baseMessage.startsWith(PPTX_MALFORMED_ERROR_PREFIX)
        ? PPTX_MALFORMED_HELPER
      : baseMessage
  const requestReference = normalizedError.requestId
    ? ` Reference: ${normalizedError.requestId}`
    : ''

  return `${message}${requestReference}`
}

function DocumentStorageTooltip({ id }) {
  return (
    <Tooltip
      id={id}
      content={DOCUMENT_EXTRACTION_STORAGE_NOTE}
      position="top"
      align="start"
      className="runtime-workspace__action-tooltip runtime-workspace__document-storage-tooltip"
    >
      <button
        type="button"
        className="runtime-workspace__document-storage-tooltip-trigger"
        aria-label="Document storage note"
      >
        <MdInfoOutline className="runtime-workspace__action-icon runtime-workspace__action-icon--info" aria-hidden="true" />
      </button>
    </Tooltip>
  )
}

function SelectedDocumentUploadList({ ariaLabel, documents = [] }) {
  if (!Array.isArray(documents) || documents.length === 0) return null

  return (
    <ul
      className="runtime-workspace__plain-list runtime-workspace__document-upload-list runtime-workspace__document-upload-list--selected"
      aria-label={ariaLabel}
    >
      {documents.map((documentSource) => (
        <li
          className="runtime-workspace__document-upload-item"
          key={`${documentSource.fileName}-${documentSource.sizeBytes}`}
        >
          <span className="runtime-workspace__document-upload-ready-icon" aria-hidden="true">
            <MdCheckCircle />
          </span>
          <span className="runtime-workspace__document-upload-copy">
            <strong>{documentSource.fileName}</strong>
            <span>{`${formatDocumentSize(documentSource.sizeBytes)} staged for extraction`}</span>
          </span>
          <Badge variant="success" size="sm" pill outline>
            Ready to extract
          </Badge>
        </li>
      ))}
    </ul>
  )
}

const RENDERER_WARNING_SEVERITY_VARIANTS = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'danger',
  BLOCKER: 'danger',
})

const TOKEN_STATUS_VARIANTS = Object.freeze({
  BLOCKED: 'error',
  ACCEPTED_TRUTH_READY: 'success',
  ACCEPTED_TRUTH_REVIEW_NEEDED: 'warning',
  DRAFT: 'neutral',
  DRAFT_INPUT_NEEDED: 'warning',
  DEPENDENCY_ACCEPTED_TRUTH_MISSING: 'warning',
  DEPENDENCY_CONTEXT_MISSING: 'warning',
  DEPENDENCY_CONTEXT_INVALIDATED: 'warning',
  FAILED: 'error',
  GENERATED_DIFFERS_FROM_ACCEPTED_TRUTH: 'warning',
  GENERATED_MATCHES_ACCEPTED_TRUTH: 'success',
  GENERATED_REVIEW_NEEDED: 'warning',
  GENERATED_STALE_AGAINST_INPUT: 'warning',
  IN_REVIEW: 'info',
  INSUFFICIENT_EVIDENCE: 'warning',
  MISSING_CONTEXT: 'warning',
  MISSING_ACCEPTED_TRUTH: 'warning',
  APPROVED: 'success',
  PUBLISHED: 'success',
  LOCKED: 'success',
  LOW: 'warning',
  MEDIUM: 'info',
  HIGH: 'success',
  MODERATE: 'info',
  NONE: 'neutral',
  NO_GENERATED_CONTENT: 'neutral',
  NO_SECTION_DEPENDENCIES: 'neutral',
  NOT_READY: 'warning',
  PARTIALLY_READY: 'info',
  PASSED: 'success',
  READY: 'success',
  REGENERATION_REQUIRED: 'warning',
  SATISFIED: 'success',
  SECTION_TRUTH_BLOCKED: 'warning',
  SECTION_TRUTH_LOCKED: 'success',
  SECTION_TRUTH_NOT_CONFIGURED: 'warning',
  SECTION_TRUTH_READY: 'success',
  UNPUBLISHED: 'neutral',
  UNLOCKED: 'neutral',
  UNACCEPTED_GENERATED_CONTENT: 'warning',
  UNKNOWN: 'neutral',
  VALIDATED: 'success',
  VALIDATION_BLOCKED: 'error',
})

const normalizeRuntimeActionToken = (value) => String(value ?? '').trim().toUpperCase()

const SECTION_ACTION_KEYS = Object.freeze({
  GENERATE_SECTION: 'GENERATE_SECTION',
  REGENERATE_SECTION: 'REGENERATE_SECTION',
})

const SECTION_ACTION_KEY_SET = new Set(Object.values(SECTION_ACTION_KEYS))

const DISCOVERY_ACTION_KEYS = Object.freeze({
  SAVE_DISCOVERY_INPUTS: 'SAVE_DISCOVERY_INPUTS',
  BUILD_EVIDENCE_PACK: 'BUILD_EVIDENCE_PACK',
  REFRESH_EVIDENCE_PACK: 'REFRESH_EVIDENCE_PACK',
  ACCEPT_EVIDENCE: 'ACCEPT_EVIDENCE',
})

const DISCOVERY_ACTION_KEY_SET = new Set(Object.values(DISCOVERY_ACTION_KEYS))
const IMMUTABLE_RUNTIME_LIFECYCLE_STAGES = new Set(['APPROVED', 'PUBLISHED', 'LOCKED'])
const IMMUTABLE_RUNTIME_DISCOVERY_REASON = 'Runtime lifecycle truth is approved, published, or locked and cannot be directly mutated.'
const LOCKED_RUNTIME_INSPECTION_REASON =
  'Locked runtimes are read-only. Create a revision before changing discovery or section truth.'

const DISCOVERY_NAV_KEY = 'discovery'
const OUTPUT_LAB_NAV_KEY = 'output_lab'
const OUTPUT_LAB_LABEL = 'Output Lab'
const ACTIVITY_PREVIEW_LIMIT = 3
const SIGNAL_PREVIEW_LIMIT = 3
const WARNING_PREVIEW_LIMIT = 1

const SIGNAL_STATUS_VARIANTS = Object.freeze({
  BLOCKED: 'danger',
  BLOCKER: 'danger',
  DANGER: 'danger',
  ERROR: 'danger',
  FAILED: 'danger',
  FAILING: 'danger',
  WARNING: 'warning',
  WARN: 'warning',
  AT_RISK: 'warning',
  NEEDS_ATTENTION: 'warning',
  NEEDS_VALIDATION: 'warning',
  SUCCESS: 'success',
  GOOD: 'success',
  HEALTHY: 'success',
  PASSED: 'success',
  READY: 'success',
  INFO: 'info',
  INFORMATION: 'info',
})

const getRuntimeActionLabel = (action, fallback) =>
  action?.buttonLabel || action?.label || fallback

const getSectionActionDisabledReason = ({
  action,
  actionKey,
  editable,
  executingActionKey,
  generatedContent,
  hasGenerationBaseline = false,
  section,
}) => {
  if (!action) return ''
  if (!action.enabled && action.disabledReason) return action.disabledReason
  if (!editable) return 'Current role or permissions do not allow runtime section generation.'
  if (executingActionKey) return 'Another runtime section action is already in progress.'
  if (actionKey === SECTION_ACTION_KEYS.GENERATE_SECTION) {
    const eligibility = section?.generationEligibility ?? null
    if (eligibility && eligibility.canGenerate === false) {
      return eligibility.reason || `Accept ${INTELLIGENCE_HUB_EVIDENCE_LABEL} before generating this section.`
    }
    if (!generatedContent && hasGenerationBaseline) {
      return 'Regenerate this section because previous generated content is archived for comparison.'
    }
  }
  if (actionKey === SECTION_ACTION_KEYS.REGENERATE_SECTION && !generatedContent && !hasGenerationBaseline) {
    return 'Generate this section before regenerating it.'
  }
  return ''
}

const getSectionAcceptanceRegenerationRequiredReason = (section) => {
  const state = section?.state || {}
  const readiness = section?.intelligence?.readiness || {}
  const dependencyState = String(section?.intelligence?.dependency?.state || '').trim().toUpperCase()
  const readinessState = String(readiness.state || '').trim().toUpperCase()
  const stateInvalidationReason = String(state.acceptedInvalidationReason || state.sectionEvidenceInvalidationReason || '').trim().toUpperCase()

  if (readinessState === 'REGENERATION_REQUIRED' && readiness.reason) {
    return readiness.reason
  }

  if (state.needsRegeneration === true) {
    return stateInvalidationReason === 'SECTION_EVIDENCE_CHANGED'
      ? 'Accepted section evidence changed. Regenerate this section before accepting truth.'
      : 'Section content is stale. Regenerate this section before accepting truth.'
  }

  if (dependencyState === 'DEPENDENCY_CONTEXT_INVALIDATED') {
    return 'Accepted upstream section truth changed. Regenerate this section before accepting truth.'
  }

  return ''
}

const getAcceptSectionDisabledReason = ({
  acceptedIsCurrent,
  editable,
  executingActionKey,
  generatedContent,
  isAcceptingSection,
  isSaving,
  section,
}) => {
  if (!generatedContent) return 'Generate this section before accepting it as governed truth.'
  const truthEligibility = section?.intelligence?.truthEligibility || section?.generated?.truthEligibility || null
  if (truthEligibility?.eligible === false) {
    const firstMessage = Array.isArray(truthEligibility.messages)
      ? truthEligibility.messages.find((message) => message?.message)?.message
      : ''
    return firstMessage || 'This generated section needs more evidence before it can be accepted as truth.'
  }
  const regenerationRequiredReason = getSectionAcceptanceRegenerationRequiredReason(section)
  if (regenerationRequiredReason) return regenerationRequiredReason
  if (acceptedIsCurrent) return 'Current generated content is already accepted as governed truth.'
  if (!editable) {
    return section?.readonlyReason || 'Current role or permissions do not allow accepting this section.'
  }
  if (isSaving || isAcceptingSection) return 'Wait for the current section update to finish.'
  if (executingActionKey) return 'Another runtime section action is already in progress.'
  return ''
}

const getDefaultConfirmationMessage = (action) => {
  const label = String(action?.buttonLabel || action?.governedAction || action?.actionKey || 'this runtime action').trim()
  return `Confirm ${label}?`
}

const getRuntimeActionGateStatus = (validationState) => {
  const normalizedValidationState = normalizeRuntimeActionToken(validationState)
  if (['PASSED', 'VALIDATED', 'VALIDATION_PASSED'].includes(normalizedValidationState)) {
    return {
      variant: 'success',
      message: 'Runtime Validation Gate passed.',
    }
  }
  if (['BLOCKED', 'FAILED', 'ERROR', 'VALIDATION_BLOCKED'].includes(normalizedValidationState)) {
    return {
      variant: 'error',
      message: 'Runtime Validation Gate blocked.',
    }
  }
  if (['PENDING', 'RUNNING', 'IN_PROGRESS', 'WARNING'].includes(normalizedValidationState)) {
    return {
      variant: 'warning',
      message: `Runtime Validation Gate ${formatRuntimeTokenLabel(validationState).toLowerCase()}.`,
    }
  }
  return null
}

const getTokenStatusVariant = (value, fallback = 'neutral') =>
  TOKEN_STATUS_VARIANTS[normalizeRuntimeActionToken(value)] ?? fallback

const getSectionIntelligence = (section) => ({
  ownershipZones: section?.intelligence?.ownershipZones ?? {},
  confidence: section?.intelligence?.confidence ?? section?.confidence ?? null,
  dependency: section?.intelligence?.dependency ?? section?.dependency ?? null,
  compare: section?.intelligence?.compare ?? section?.compare ?? null,
  readiness: section?.intelligence?.readiness ?? section?.readiness ?? null,
  generationControls: section?.intelligence?.generationControls ?? {},
  sourceProjection: section?.intelligence?.sourceProjection ?? null,
  scopedEvidence: section?.intelligence?.scopedEvidence ?? null,
  supportingEvidence: section?.intelligence?.supportingEvidence ?? [],
  generationBoundaries: section?.intelligence?.generationBoundaries ?? [],
  truthEligibility: section?.intelligence?.truthEligibility ?? section?.generated?.truthEligibility ?? null,
  displayProjection: section?.intelligence?.displayProjection ?? {},
})

const getProjectionItems = (value) => (Array.isArray(value) ? value.filter(Boolean) : [])

const getTruthEligibilityMessage = (truthEligibility) => {
  if (!truthEligibility) return ''
  const firstMessage = Array.isArray(truthEligibility.messages)
    ? truthEligibility.messages.find((message) => message?.message)?.message
    : null
  return firstMessage || ''
}

const getDependencySummary = (dependency) => {
  const required = Array.isArray(dependency?.requiredSectionKeys) ? dependency.requiredSectionKeys : []
  const missing = Array.isArray(dependency?.missingSectionKeys) ? dependency.missingSectionKeys : []
  const missingAcceptedTruth = Array.isArray(dependency?.missingAcceptedTruthSectionKeys)
    ? dependency.missingAcceptedTruthSectionKeys
    : []
  const invalidated = Array.isArray(dependency?.invalidatedSectionKeys) ? dependency.invalidatedSectionKeys : []
  if (required.length === 0) return 'No upstream dependencies'
  if (missing.length > 0) return `${missing.length} dependency ${missing.length === 1 ? 'is' : 'are'} missing context`
  if (missingAcceptedTruth.length > 0) {
    return `${missingAcceptedTruth.length} upstream accepted truth ${missingAcceptedTruth.length === 1 ? 'is' : 'items are'} missing`
  }
  if (invalidated.length > 0) {
    return `${invalidated.length} upstream accepted truth ${invalidated.length === 1 ? 'changed' : 'items changed'}`
  }
  if (missing.length === 0) return `${required.length} dependency${required.length === 1 ? '' : 'ies'} satisfied`
  return `${missing.length} dependency ${missing.length === 1 ? 'is' : 'are'} missing context`
}

const getTruthReadinessSummary = (readiness) =>
  readiness?.reason || formatRuntimeTokenLabel(readiness?.state || 'UNKNOWN')

const getSummaryValueClassName = (variant = 'neutral') => [
  'runtime-workspace__summary-value',
  variant !== 'neutral' && `runtime-workspace__summary-value--${variant}`,
].filter(Boolean).join(' ')

const getActionButtonVariant = () => 'outline'

const formatRuntimeIdentifier = (value) => {
  const normalized = String(value ?? '').trim()
  if (!normalized) return '--'
  if (normalized.length <= 24) return normalized
  return `${normalized.slice(0, 12)}...${normalized.slice(-8)}`
}

const normalizeWarningSeverity = (value) => {
  const severity = String(value ?? '').trim().toUpperCase()
  if (severity === 'INFO' || severity === 'WARNING' || severity === 'ERROR' || severity === 'BLOCKER') {
    return severity
  }
  return 'WARNING'
}

const getWarningSeverityVariant = (severity) =>
  RENDERER_WARNING_SEVERITY_VARIANTS[normalizeWarningSeverity(severity)] ?? 'warning'

const WARNING_SEVERITY_RANK = Object.freeze({
  INFO: 0,
  WARNING: 1,
  ERROR: 2,
  BLOCKER: 3,
})

const getHigherWarningSeverity = (currentSeverity, nextSeverity) => {
  const current = normalizeWarningSeverity(currentSeverity)
  const next = normalizeWarningSeverity(nextSeverity)
  return WARNING_SEVERITY_RANK[next] > WARNING_SEVERITY_RANK[current] ? next : current
}

const getWarningPresentation = (warning) => {
  const code = normalizeRuntimeActionToken(warning?.code)
  if (code.includes('ACTION_POLICY') || code.includes('POLICY_ACTION')) {
    return {
      groupKey: 'workflow-action-alignment',
      title: 'Workflow and action alignment issue',
      summary: 'A governed runtime action is unavailable because its workspace configuration is incomplete.',
    }
  }
  if (code.includes('UI_CONTRACT') || code.includes('PRESENTATION') || code.includes('SECTION_MISSING')) {
    return {
      groupKey: 'workspace-presentation-fallback',
      title: 'Workspace presentation fallback',
      summary: 'The workspace used a safe fallback because configured presentation metadata is incomplete.',
    }
  }
  if (code.includes('RENDER') || code.includes('FALLBACK')) {
    return {
      groupKey: 'workspace-rendering-fallback',
      title: 'Workspace fallback state',
      summary: 'The workspace displayed a safe fallback for one or more governed runtime fields.',
    }
  }
  return {
    groupKey: code || 'runtime-warning',
    title: formatRuntimeTokenLabel(code || 'Runtime warning'),
    summary: 'A runtime configuration warning was returned by the server projection.',
  }
}

const sanitizeWarningMessage = (message) => {
  const normalized = String(message ?? '').trim()
  if (!normalized) return ''
  return normalized
    .replace(/\bUI Contract\b/gi, 'workspace configuration')
    .replace(/\bworkflow policy\b/gi, 'workflow alignment')
    .replace(/\brenderer\b/gi, 'runtime workspace')
    .replace(/\bexecutable by runtime workspace\b/gi, 'available in this workspace')
    .replace(/\bexecutable by renderer\b/gi, 'available in this workspace')
}

const buildWarningGroups = (warnings = EMPTY_ARRAY) => {
  const groups = new Map()
  warnings.forEach((warning) => {
    const presentation = getWarningPresentation(warning)
    const existing = groups.get(presentation.groupKey) || {
      ...presentation,
      count: 0,
      severity: normalizeWarningSeverity(warning?.severity),
      messages: [],
    }
    existing.count += 1
    existing.severity = getHigherWarningSeverity(existing.severity, warning?.severity)
    const safeMessage = sanitizeWarningMessage(warning?.message)
    if (safeMessage && !existing.messages.includes(safeMessage)) {
      existing.messages.push(safeMessage)
    }
    groups.set(presentation.groupKey, existing)
  })
  return Array.from(groups.values()).sort((left, right) => {
    const severityDelta = WARNING_SEVERITY_RANK[right.severity] - WARNING_SEVERITY_RANK[left.severity]
    if (severityDelta !== 0) return severityDelta
    return right.count - left.count
  })
}

const formatWarningCount = (count) =>
  `${count} warning${count === 1 ? '' : 's'}`

const normalizeSignalValue = (value) => String(value ?? '').trim()

const getSignalSummary = (signal) =>
  normalizeSignalValue(signal?.summary ?? signal?.message ?? signal?.label ?? signal?.title)

const getSignalVariant = (signal) => {
  const token = normalizeRuntimeActionToken(
    signal?.variant ?? signal?.severity ?? signal?.status ?? signal?.state ?? signal?.type,
  )
  return SIGNAL_STATUS_VARIANTS[token] ?? 'neutral'
}

const getSignalIcon = (variant) => {
  if (variant === 'success') return <MdCheckCircle aria-hidden="true" />
  if (variant === 'info' || variant === 'neutral') return <MdInfoOutline aria-hidden="true" />
  if (variant === 'warning') return <MdOutlineWarningAmber aria-hidden="true" />
  return <MdErrorOutline aria-hidden="true" />
}

const normalizeActivityValue = (value) => String(value ?? '').trim()

const getActivitySummary = (event) => normalizeActivityValue(event?.summary)

const getActivityActorLabel = (event) =>
  normalizeActivityValue(event?.actorLabel).replace(/\s*<[^>]+>\s*/g, ' ').trim()

const activitySummaryIncludesActor = (summary, actorLabel) => {
  if (!summary || !actorLabel) return false
  return summary.toLocaleLowerCase().includes(actorLabel.toLocaleLowerCase())
}

const buildActivityDisplayEvents = (events = EMPTY_ARRAY) => {
  const groupedEvents = []
  const eventByKey = new Map()

  events.forEach((event) => {
    const summary = getActivitySummary(event)
    if (!summary) return

    const actorLabel = getActivityActorLabel(event)
    const groupKey = [
      summary.toLocaleLowerCase(),
      actorLabel.toLocaleLowerCase(),
    ].join('|')
    const existingEvent = eventByKey.get(groupKey)

    if (!existingEvent) {
      const nextEvent = {
        ...event,
        summary,
        actorLabel,
        occurrenceCount: 1,
      }
      eventByKey.set(groupKey, nextEvent)
      groupedEvents.push(nextEvent)
      return
    }

    existingEvent.occurrenceCount += 1
  })

  return groupedEvents
}

const formatActivityTime = (value) => {
  const parts = formatDateTimeParts(value)
  if (!parts) return ''

  const occurredAt = new Date(parts.iso)
  const now = new Date()
  const isToday =
    occurredAt.getFullYear() === now.getFullYear()
    && occurredAt.getMonth() === now.getMonth()
    && occurredAt.getDate() === now.getDate()
  const timeLabel = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(occurredAt)

  return isToday ? `Today, ${timeLabel}` : `${parts.dateLabel}, ${timeLabel}`
}

const isEmptyStructuredValue = (value) => {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.length === 0
  return Object.keys(value).length === 0
}

const hasRuntimeValue = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (isEmptyStructuredValue(value)) return false
  return true
}

const hasAcceptedSectionTruth = (section) =>
  hasRuntimeValue(section?.accepted?.content ?? section?.accepted)
  || section?.intelligence?.ownershipZones?.acceptedTruth?.available === true
  || section?.intelligence?.compare?.hasAccepted === true
  || section?.compare?.hasAccepted === true

const hasRequiredSectionProgress = (section) =>
  section?.intelligence?.readiness?.publishEligible === true
  || section?.readiness?.publishEligible === true
  || section?.intelligence?.compare?.currentGeneratedAccepted === true
  || section?.compare?.currentGeneratedAccepted === true
  || (
    hasAcceptedSectionTruth(section)
    && String(section?.state?.status || '').trim().toUpperCase() === 'ACCEPTED'
  )

const toProgressCount = (value) => {
  const count = Number(value)
  if (!Number.isFinite(count) || count < 0) return null
  return Math.floor(count)
}

const stringifyValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (isEmptyStructuredValue(value)) return ''
  return JSON.stringify(value, null, 2)
}

const stringifyGeneratedContent = (generated) => {
  if (!generated) return ''
  if (typeof generated.content === 'string') return generated.content
  return stringifyValue(generated.content ?? generated)
}

const stringifyAcceptedContent = (accepted) => {
  if (!accepted) return ''
  if (typeof accepted.content === 'string') return accepted.content
  return stringifyValue(accepted.content ?? accepted)
}

const isAcceptedGeneratedCurrent = ({ accepted, generated }) => {
  if (!accepted || !generated) return false

  const acceptedGeneratedAt = String(accepted.sourceGeneratedAt || '').trim()
  const generatedAt = String(generated.generatedAt || '').trim()
  const acceptedInputHash = String(accepted.inputHash || '').trim()
  const generatedInputHash = String(generated.inputHash || '').trim()

  if (acceptedGeneratedAt && generatedAt && acceptedGeneratedAt !== generatedAt) return false
  if (acceptedInputHash && generatedInputHash && acceptedInputHash !== generatedInputHash) return false

  if (acceptedGeneratedAt && generatedAt && acceptedInputHash && generatedInputHash) {
    return true
  }

  return stringifyAcceptedContent(accepted) === stringifyGeneratedContent(generated)
}

const getLatestRevisionValue = (revisions, key) => {
  if (!Array.isArray(revisions)) return null
  for (let index = revisions.length - 1; index >= 0; index -= 1) {
    if (revisions[index]?.[key]) return revisions[index]
  }
  return null
}

const formatReadableRuntimeKey = (value) => {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''
  return DISCOVERY_INPUT_LABELS[rawValue] || formatRuntimeTokenLabel(rawValue)
}

const formatReadableKeyList = (keys = [], limit = 4) => {
  const labels = keys.map(formatReadableRuntimeKey).filter(Boolean)
  if (labels.length === 0) return ''
  return labels.slice(0, limit).join(', ') + (labels.length > limit ? `, +${labels.length - limit} more` : '')
}

const formatDiscoveryInputsSummary = ({ count, inputValues, keys }) => {
  const keyCount = Number.isFinite(Number(count)) ? Number(count) : keys.length
  if (keys.length > 0) {
    const readableKeys = formatReadableKeyList(keys)
    return `${keyCount} accepted ${INTELLIGENCE_HUB_LABEL} input${keyCount === 1 ? '' : 's'} captured${readableKeys ? `: ${readableKeys}` : ''}.`
  }
  if (hasRuntimeValue(inputValues)) return `${INTELLIGENCE_HUB_INPUTS_LABEL} are captured for governed downstream use.`
  return ''
}

const formatDiscoveryEvidenceSummary = ({ count, evidence, evidenceReady, keys }) => {
  const evidenceCount = Number.isFinite(Number(count)) ? Number(count) : keys.length
  if (evidenceCount > 0) {
    return `${evidenceCount} governed evidence signal${evidenceCount === 1 ? '' : 's'} prepared for section intelligence.`
  }
  if (evidenceReady || hasRuntimeValue(evidence)) {
    return `${INTELLIGENCE_HUB_LABEL} evidence pack is ready for governed downstream use.`
  }
  return ''
}

const getSummaryCount = (summary, key) => {
  const count = Number(summary?.[key])
  return Number.isFinite(count) ? count : 0
}

const hasSourceRegistrySummary = (summary) =>
  getSummaryCount(summary, 'count') > 0
  || (Array.isArray(summary?.sourceTypes) && summary.sourceTypes.length > 0)

const hasEvidenceObjectSummary = (summary) =>
  getSummaryCount(summary, 'evidenceObjectCount') > 0

const hasDiscoveryHealthSummary = (summary) =>
  Boolean(
    summary
    && typeof summary === 'object'
    && !Array.isArray(summary)
    && (
      Number.isFinite(Number(summary.coveragePercent))
      || getSummaryCount(summary, 'evidenceObjectCount') > 0
      || getSummaryCount(summary, 'sourceCount') > 0
      || (Array.isArray(summary.missingAreas) && summary.missingAreas.length > 0)
      || (summary.readiness && typeof summary.readiness === 'object' && !Array.isArray(summary.readiness))
      || (Array.isArray(summary.signalCandidates) && summary.signalCandidates.length > 0)
      || (Array.isArray(summary.contradictionCandidates) && summary.contradictionCandidates.length > 0)
    ),
  )

const hasIntelligenceGraphSummary = (summary) =>
  Boolean(summary && typeof summary === 'object' && !Array.isArray(summary))

const formatDiscoveryEvidenceObjectSummary = (summary = {}) => {
  const evidenceObjectCount = getSummaryCount(summary, 'evidenceObjectCount')
  if (evidenceObjectCount === 0) return ''

  const acceptedCount = getSummaryCount(summary, 'acceptedEvidenceCount')
  const pendingCount = getSummaryCount(summary, 'pendingReviewCount')
  const rejectedCount = getSummaryCount(summary, 'rejectedEvidenceCount')

  return `${evidenceObjectCount} evidence object${evidenceObjectCount === 1 ? '' : 's'}: ${
    acceptedCount
  } accepted, ${pendingCount} pending review, ${rejectedCount} rejected.`
}

const formatDiscoveryHealthReasonList = (reasons = []) =>
  reasons.map(formatRuntimeTokenLabel).filter(Boolean).join(', ')

const formatDiscoveryReadinessSummary = (readiness = {}) => {
  const blockers = Array.isArray(readiness.blockerReasons) ? readiness.blockerReasons : []
  const warnings = Array.isArray(readiness.warningReasons) ? readiness.warningReasons : []

  if (blockers.length > 0) return `Blocked by ${formatDiscoveryHealthReasonList(blockers)}.`
  if (warnings.length > 0) return `Watch ${formatDiscoveryHealthReasonList(warnings)}.`
  return 'No readiness blockers are projected.'
}

const formatDiscoverySignalSummary = (signal = {}) => {
  const evidenceObjectCount = getSummaryCount(signal, 'evidenceObjectCount')
  const acceptedEvidenceCount = getSummaryCount(signal, 'acceptedEvidenceCount')
  const pendingReviewCount = getSummaryCount(signal, 'pendingReviewCount')
  const sourceCount = getSummaryCount(signal, 'sourceCount')
  return `${formatRuntimeTokenLabel(signal.signalStrength || 'UNKNOWN')} signal: ${
    evidenceObjectCount
  } evidence object${evidenceObjectCount === 1 ? '' : 's'}, ${
    acceptedEvidenceCount
  } accepted, ${pendingReviewCount} pending, ${sourceCount} source${sourceCount === 1 ? '' : 's'}.`
}

const getAcquisitionProfileGuidance = (profile) =>
  DISCOVERY_ACQUISITION_PROFILE_GUIDANCE[String(profile || '').trim().toUpperCase()]
  || DISCOVERY_ACQUISITION_PROFILE_GUIDANCE[DISCOVERY_ACQUISITION_PROFILES.STANDARD]

const getDiscoveryAcquisitionEffectiveness = ({ discovery, evidenceDetail }) => {
  const candidates = [
    discovery?.acquisitionEffectiveness,
    discovery?.acquisition?.effectiveness,
    evidenceDetail?.acquisitionEffectiveness,
    evidenceDetail?.discovery?.acquisitionEffectiveness,
  ]
  return candidates.find((candidate) =>
    candidate && typeof candidate === 'object' && !Array.isArray(candidate)) || {}
}

const formatInputRecommendationList = (values = [], limit = 4) => {
  const labels = Array.isArray(values)
    ? values.map((value) => String(value || '').trim()).filter(Boolean)
    : []
  if (labels.length === 0) return 'No input recommendations projected.'
  const visibleLabels = labels.slice(0, limit)
  const overflowCount = labels.length - visibleLabels.length
  return `${visibleLabels.join(', ')}${overflowCount > 0 ? `, +${overflowCount} more` : ''}`
}

const formatSourceRegistryTypeLabel = (value) => {
  const normalizedValue = String(value || '').trim().toUpperCase()
  if (normalizedValue === 'DISCOVERY_NOTES') return `${INTELLIGENCE_HUB_LABEL} Notes`
  if (normalizedValue === 'DISCOVERY_INPUTS') return INTELLIGENCE_HUB_INPUTS_LABEL
  return formatRuntimeTokenLabel(value)
}

const formatSourceRegistrySummary = (summary = {}) => {
  const sourceCount = getSummaryCount(summary, 'count')
  if (sourceCount === 0) return ''
  const sourceTypes = Array.isArray(summary.sourceTypes)
    ? summary.sourceTypes.map(formatSourceRegistryTypeLabel).filter(Boolean)
    : []

  return `${sourceCount} registered source${sourceCount === 1 ? '' : 's'}${
    sourceTypes.length > 0 ? `: ${sourceTypes.join(', ')}` : ''
  }.`
}

const formatResetCount = (count, singularLabel, pluralLabel = `${singularLabel}s`) => {
  const normalizedCount = Number(count)
  if (!Number.isFinite(normalizedCount) || normalizedCount < 0) return ''
  return `${normalizedCount} ${normalizedCount === 1 ? singularLabel : pluralLabel}`
}

const isDiscoveryResetActivity = (event = {}) =>
  normalizeRuntimeActionToken(event.activityType) === 'DISCOVERY_RESET'
  || normalizeRuntimeActionToken(event.reset?.reason) === 'DISCOVERY_RESET'

const getDiscoveryResetSummary = ({ activity = EMPTY_ARRAY, discovery = {} } = {}) => {
  const safeDiscovery = discovery && typeof discovery === 'object' && !Array.isArray(discovery)
    ? discovery
    : {}
  const resetActivity = Array.isArray(activity)
    ? activity.find(isDiscoveryResetActivity)
    : null
  const activityReset = resetActivity?.reset && typeof resetActivity.reset === 'object'
    ? resetActivity.reset
    : {}
  const persistedReset = discovery?.resetSummary && typeof discovery.resetSummary === 'object'
    ? discovery.resetSummary
    : {}
  const discoveryState = safeDiscovery.state && typeof safeDiscovery.state === 'object'
    ? safeDiscovery.state
    : {}
  const resetAt = activityReset.resetAt
    || persistedReset.resetAt
    || safeDiscovery.resetAt
    || discoveryState.lastResetAt
    || discoveryState.resetAt
    || ''
  const resetBy = resetActivity?.actorLabel
    || activityReset.resetByLabel
    || persistedReset.resetByLabel
    || ''
  const previousEvidenceSummary = activityReset.previousEvidenceSummary
    || persistedReset.previousEvidenceSummary
    || {}
  const clearedSectionTruthCount = Number.isFinite(Number(activityReset.clearedSectionTruthCount))
    ? Number(activityReset.clearedSectionTruthCount)
    : Number.isFinite(Number(persistedReset.clearedSectionTruthCount))
      ? Number(persistedReset.clearedSectionTruthCount)
      : null

  if (!resetAt && !resetBy && Object.keys(previousEvidenceSummary).length === 0 && clearedSectionTruthCount === null) {
    return null
  }

  return {
    resetAt,
    resetBy,
    previousEvidenceSummary,
    clearedSectionTruthCount,
  }
}

const formatDiscoveryResetPreviousEvidence = (summary = {}) => {
  const parts = [
    formatResetCount(getSummaryCount(summary, 'inputCount'), 'input'),
    formatResetCount(
      getSummaryCount(summary, 'sourceRegistryCount') || getSummaryCount(summary, 'sourceCount'),
      'source',
    ),
    formatResetCount(getSummaryCount(summary, 'evidenceObjectCount'), 'evidence object'),
    formatResetCount(getSummaryCount(summary, 'scopedViewCount'), 'scoped view'),
  ].filter((part) => part && !part.startsWith('0 '))

  return parts.length > 0
    ? `Previous ${INTELLIGENCE_HUB_LABEL} held ${parts.join(', ')}.`
    : `Previous ${INTELLIGENCE_HUB_LABEL} summary was not projected.`
}

const getReviewStatusVariant = (reviewStatus) => {
  const normalizedStatus = String(reviewStatus || '').trim().toUpperCase()
  if (normalizedStatus === 'ACCEPTED') return 'success'
  if (normalizedStatus === 'REJECTED') return 'error'
  return 'neutral'
}

const getEvidenceObjectActionLabel = (evidenceObject = {}) => {
  const candidate = evidenceObject.evidenceObjectId
    || evidenceObject.extractedFact
    || evidenceObject.category
    || evidenceObject.sourceId
    || 'evidence object'
  return String(candidate || '').trim() || 'evidence object'
}

const getDiscoverySourceRegistry = ({ discovery, evidenceDetail }) => {
  if (Array.isArray(evidenceDetail?.sourceRegistry)) return evidenceDetail.sourceRegistry
  if (Array.isArray(discovery?.sourceRegistry)) return discovery.sourceRegistry
  if (Array.isArray(discovery?.acquisition?.sourceRegistry)) return discovery.acquisition.sourceRegistry
  return EMPTY_ARRAY
}

const getDiscoveryEvidenceObjects = ({ discovery, evidenceDetail }) => {
  if (Array.isArray(evidenceDetail?.evidenceObjects)) return evidenceDetail.evidenceObjects
  if (Array.isArray(discovery?.evidenceObjects)) return discovery.evidenceObjects
  return EMPTY_ARRAY
}

const normalizeWebsiteSourceDrafts = (inputValues = {}) => {
  const explicitSources = Array.isArray(inputValues.websiteSources)
    ? inputValues.websiteSources
    : []
  const candidates = [
    ...explicitSources,
    inputValues.companyWebsite,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  const uniqueSources = Array.from(new Set(candidates))
  return uniqueSources.length > 0 ? uniqueSources : ['']
}

const buildDiscoveryInputsPayload = (draftInputs = {}) => {
  const websiteSources = Array.isArray(draftInputs.websiteSources)
    ? draftInputs.websiteSources.map((value) => String(value || '').trim()).filter(Boolean)
    : []
  const payload = {
    companyWebsite: websiteSources[0] || String(draftInputs.companyWebsite || '').trim(),
    companyName: String(draftInputs.companyName || '').trim(),
    marketRegion: String(draftInputs.marketRegion || '').trim(),
    targetOffer: String(draftInputs.targetOffer || '').trim(),
    notes: String(draftInputs.notes || '').trim(),
  }

  if (websiteSources.length > 0) {
    payload.websiteSources = websiteSources
  }

  return payload
}

const getSourceRegistryGroupKey = (source = {}) => {
  const fieldKey = String(source.fieldKey || '').trim()
  const sourceId = String(source.sourceId || '').trim()
  const sourceType = String(source.sourceType || source.type || '').trim().toUpperCase()
  const lineageType = String(source.type || '').trim().toUpperCase()
  if (fieldKey === 'companyWebsite' || sourceId === 'input_companyWebsite' || lineageType === 'USER_PROVIDED_WEBSITE') {
    return 'discovery'
  }
  if (sourceType === 'WEBSITE' || lineageType === 'WEBSITE_ACQUISITION') return 'website'
  if (sourceType === 'UPLOADED_DOCUMENT') return 'document'
  return 'discovery'
}

const SOURCE_REGISTRY_GROUP_LABELS = Object.freeze({
  website: 'Website Sources',
  document: 'Document Sources',
  discovery: `${INTELLIGENCE_HUB_LABEL} Sources`,
})

const COVERAGE_AREA_STATE_META = Object.freeze({
  STRONG: {
    label: 'Strong',
    className: 'strong',
    description: 'Strong accepted evidence coverage',
    icon: MdCheckCircle,
    progressVariant: 'success',
  },
  ADEQUATE: {
    label: 'Adequate',
    className: 'adequate',
    description: 'Adequate accepted evidence coverage',
    icon: MdOutlineWarningAmber,
    progressVariant: 'warning',
  },
  WEAK: {
    label: 'Weak',
    className: 'weak',
    description: 'Weak accepted evidence coverage',
    icon: MdErrorOutline,
    progressVariant: 'danger',
  },
  MISSING: {
    label: 'Missing',
    className: 'missing',
    description: 'No accepted evidence coverage',
    icon: MdInfoOutline,
    progressVariant: 'danger',
  },
})

const getCoverageAreaProgressValue = ({ acceptedEvidenceCount = 0, evidenceCount = 0 } = {}) => {
  const acceptedCount = Number(acceptedEvidenceCount)
  const totalCount = Number(evidenceCount)

  if (!Number.isFinite(acceptedCount) || !Number.isFinite(totalCount) || totalCount <= 0) {
    return 0
  }

  return Math.round((Math.min(Math.max(acceptedCount, 0), totalCount) / totalCount) * 100)
}

const getCoverageAreaProgressText = ({ acceptedEvidenceCount = 0, evidenceCount = 0 } = {}) => {
  const acceptedCount = Number.isFinite(Number(acceptedEvidenceCount)) ? Number(acceptedEvidenceCount) : 0
  const totalCount = Number.isFinite(Number(evidenceCount)) ? Number(evidenceCount) : 0
  return `${acceptedCount} accepted of ${totalCount} evidence object${totalCount === 1 ? '' : 's'}`
}

const buildSourceRegistryGroups = (sourceRegistry = []) => {
  const groupedEntries = sourceRegistry.reduce((groups, source) => {
    const groupKey = getSourceRegistryGroupKey(source)
    return {
      ...groups,
      [groupKey]: [...(groups[groupKey] || []), source],
    }
  }, {})

  return ['website', 'document', 'discovery']
    .map((groupKey) => ({
      key: groupKey,
      label: SOURCE_REGISTRY_GROUP_LABELS[groupKey],
      entries: groupedEntries[groupKey] || [],
    }))
    .filter((group) => group.entries.length > 0)
}

const formatSourceRegistryEvidenceCount = (source = {}) => {
  const count = Number(source.evidenceObjectsGenerated ?? source.evidenceProduced ?? 0)
  if (!Number.isFinite(count) || count <= 0) return ''
  return `${count} evidence object${count === 1 ? '' : 's'}`
}

const formatSourceRegistryEntryTitle = (source = {}) =>
  source.fileName
  || source.url
  || source.finalUrl
  || normalizeIntelligenceHubDisplayText(source.label)
  || normalizeIntelligenceHubDisplayText(source.fieldKey)
  || source.sourceId
  || 'Source'

const formatLineageSourceTitle = (source = {}) =>
  normalizeIntelligenceHubDisplayText(source.label)
  || normalizeIntelligenceHubDisplayText(source.fieldKey)
  || source.fileName
  || source.url
  || source.finalUrl
  || source.sourceId
  || 'Source'

const formatSourceRegistryEntryMeta = (source = {}) => [
  source.documentType || source.assetType || formatSourceRegistryTypeLabel(source.sourceType),
  source.documentStatus || source.acquisitionStatus || source.status,
  formatSourceRegistryEvidenceCount(source),
  source.contentTruncated ? 'Sampled to supported size' : '',
  source.failureReason,
].map((value) => {
  const rawValue = String(value || '').trim()
  if (/^[A-Z0-9]{2,5}$/.test(rawValue)) return rawValue
  return /^[A-Z0-9_]+$/.test(rawValue) ? formatRuntimeTokenLabel(rawValue) : rawValue
}).filter(Boolean).join(' / ')

const getSourceRegistryGroupIcon = (groupKey) => {
  if (groupKey === 'website') return MdSource
  if (groupKey === 'document') return MdUploadFile
  return MdInfoOutline
}

const getSourceRegistryGroupBadgeVariant = (groupKey) => {
  if (groupKey === 'website') return 'primary'
  if (groupKey === 'document') return 'warning'
  return 'info'
}

const getCoverageAreaStateMeta = (state) => {
  const normalizedState = normalizeRuntimeActionToken(state)
  return COVERAGE_AREA_STATE_META[normalizedState] || {
    label: formatRuntimeTokenLabel(normalizedState || 'UNKNOWN'),
    className: 'unknown',
    description: 'Unknown accepted evidence coverage',
    icon: MdInfoOutline,
    progressVariant: 'info',
  }
}

const renderStackedMetricHeading = (label) => {
  const words = String(label || '').trim().split(/\s+/).filter(Boolean)
  if (words.length < 2) return label

  const [firstWord, ...remainingWords] = words
  return (
    <>
      <span className="runtime-workspace__intelligence-metric-heading-lead">{firstWord}</span>
      {' '}
      <span className="runtime-workspace__intelligence-metric-heading-focus">{remainingWords.join(' ')}</span>
    </>
  )
}

const splitInsightListItem = (item) => {
  const text = String(item || '').trim()
  const separatorIndex = text.indexOf(':')

  if (separatorIndex <= 0 || separatorIndex > 42) {
    return { label: '', detail: text }
  }

  return {
    label: text.slice(0, separatorIndex + 1),
    detail: text.slice(separatorIndex + 1).trim(),
  }
}

const normalizeInsightLabel = (value) => String(value || '').replace(/:\s*$/, '').trim()

const buildProjectionDetailRows = (items = EMPTY_ARRAY) => (
  Array.isArray(items)
    ? items.map((item, index) => {
      const text = String(item || '').trim()
      const itemParts = splitInsightListItem(text)
      const title = itemParts.label
        ? normalizeInsightLabel(itemParts.label)
        : text

      return {
        id: `${index}-${text}`,
        title,
        meta: itemParts.label ? itemParts.detail : '',
      }
    }).filter((row) => row.title)
    : EMPTY_ARRAY
)

const buildCompareValueGroups = (value, fallbackTitle = 'Comparison Value') => {
  const text = String(value || '').trim()
  if (!text) {
    return [{
      id: `${fallbackTitle}-empty`,
      title: fallbackTitle,
      icon: MdCompareArrows,
      iconVariant: 'compare',
      badgeVariant: 'neutral',
      rows: [{
        id: `${fallbackTitle}-empty-row`,
        title: 'No content',
        meta: 'No comparison content is available.',
      }],
    }]
  }

  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
  const groups = []
  let activeGroup = null

  const ensureGroup = (title = fallbackTitle) => {
    if (!activeGroup) {
      activeGroup = {
        id: `${fallbackTitle}-${groups.length}-${title}`,
        title,
        icon: MdCompareArrows,
        iconVariant: 'compare',
        badgeVariant: 'info',
        rows: [],
      }
      groups.push(activeGroup)
    }

    return activeGroup
  }

  blocks.forEach((block) => {
    const isBullet = /^-\s+/.test(block)
    const isLikelyHeading = blocks.length > 1
      && !isBullet
      && block.length <= 80
      && !/[.!?]$/.test(block)
      && !block.includes('\n')

    if (isLikelyHeading) {
      activeGroup = {
        id: `${fallbackTitle}-${groups.length}-${block}`,
        title: block,
        icon: MdCompareArrows,
        iconVariant: 'compare',
        badgeVariant: 'info',
        rows: [],
      }
      groups.push(activeGroup)
      return
    }

    const group = ensureGroup()
    const cleanedBlock = block.replace(/^-\s+/, '').trim()
    const rowParts = splitInsightListItem(cleanedBlock)
    const rowTitle = rowParts.label
      ? normalizeInsightLabel(rowParts.label)
      : isBullet
        ? cleanedBlock
        : group.rows.length === 0
          ? 'Summary'
          : 'Detail'

    group.rows.push({
      id: `${group.id}-${group.rows.length}-${cleanedBlock}`,
      title: rowTitle,
      meta: rowParts.label ? rowParts.detail : isBullet ? '' : cleanedBlock,
    })
  })

  return groups
    .map((group) => ({
      ...group,
      badgeLabel: '',
    }))
    .filter((group) => group.rows.length > 0)
}

function SourceRegistryGroupList({ groups = EMPTY_ARRAY }) {
  if (!Array.isArray(groups) || groups.length === 0) return null

  return (
    <div className="runtime-workspace__source-registry-groups">
      {groups.map((group) => {
        const GroupIcon = getSourceRegistryGroupIcon(group.key)
        return (
          <div className="runtime-workspace__source-registry-group" key={group.key}>
            <div className="runtime-workspace__source-registry-group-header">
              <span
                className={`runtime-workspace__source-registry-group-icon runtime-workspace__source-registry-group-icon--${group.key}`}
                aria-hidden="true"
              >
                <GroupIcon />
              </span>
              <h4 aria-label={`${group.label} (${group.entries.length})`}>{group.label}</h4>
              <Badge
                variant={getSourceRegistryGroupBadgeVariant(group.key)}
                size="sm"
                pill
                outline
              >
                {`${group.entries.length} source${group.entries.length === 1 ? '' : 's'}`}
              </Badge>
            </div>
            <ul className="runtime-workspace__plain-list runtime-workspace__source-registry-list">
              {group.entries.map((source) => (
                <li key={source.sourceId || source.fieldKey || source.lineageRef}>
                  <strong className="runtime-workspace__source-registry-title">
                    {formatSourceRegistryEntryTitle(source)}
                  </strong>
                  <span className="runtime-workspace__source-registry-meta">
                    {formatSourceRegistryEntryMeta(source)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function SectionDetailRows({ rows = EMPTY_ARRAY, ariaLabel = '', className = '' }) {
  if (!Array.isArray(rows) || rows.length === 0) return null

  const resolvedClassName = [
    'runtime-workspace__section-detail-rows',
    className,
  ].filter(Boolean).join(' ')
  const listProps = ariaLabel
    ? { role: 'list', 'aria-label': ariaLabel }
    : {}

  return (
    <div className={resolvedClassName} {...listProps}>
      {rows.map((row) => {
        const badgeLabel = String(row.badgeLabel || '').trim()
        const hasMeta = row.meta !== null && row.meta !== undefined && row.meta !== ''

        return (
          <div
            className="runtime-workspace__section-detail-row"
            key={row.id}
            role={ariaLabel ? 'listitem' : undefined}
          >
            <span className="runtime-workspace__section-detail-copy">
              <strong>{row.title}</strong>
              {hasMeta ? <span>{row.meta}</span> : null}
            </span>
            {badgeLabel ? (
              <Badge
                variant={row.badgeVariant || 'neutral'}
                size="sm"
                pill
                outline
              >
                {badgeLabel}
              </Badge>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function SectionDetailGroupList({
  groups = EMPTY_ARRAY,
  ariaLabel = '',
  className = '',
}) {
  if (!Array.isArray(groups) || groups.length === 0) return null

  const resolvedClassName = [
    'runtime-workspace__section-detail-groups',
    className,
  ].filter(Boolean).join(' ')
  const listProps = ariaLabel
    ? { role: 'list', 'aria-label': ariaLabel }
    : {}

  return (
    <div className={resolvedClassName} {...listProps}>
      {groups.map((group) => {
        const GroupIcon = group.icon || MdInfoOutline
        const rows = Array.isArray(group.rows) ? group.rows : EMPTY_ARRAY
        const badgeLabel = String(group.badgeLabel || '').trim()

        if (rows.length === 0) return null

        return (
          <div
            className="runtime-workspace__section-detail-group"
            key={group.id || group.title}
            role={ariaLabel ? 'listitem' : undefined}
          >
            <div className="runtime-workspace__section-detail-group-header">
              <span
                className={`runtime-workspace__section-detail-group-icon${
                  group.iconVariant ? ` runtime-workspace__section-detail-group-icon--${group.iconVariant}` : ''
                }`}
                aria-hidden="true"
              >
                <GroupIcon />
              </span>
              <h4>{group.title}</h4>
              {badgeLabel ? (
                <Badge
                  variant={group.badgeVariant || 'neutral'}
                  size="sm"
                  pill
                  outline
                >
                  {badgeLabel}
                </Badge>
              ) : null}
            </div>
            <SectionDetailRows rows={rows} className="runtime-workspace__section-detail-rows--grouped" />
          </div>
        )
      })}
    </div>
  )
}

function IntelligenceDetailRows({ rows = EMPTY_ARRAY }) {
  if (!Array.isArray(rows) || rows.length === 0) return null

  return (
    <div className="runtime-workspace__intelligence-detail-rows">
      {rows.map((row) => {
        const RowIcon = row.icon || MdInfoOutline
        const badgeLabel = String(row.badgeLabel || '').trim()

        return (
          <div className="runtime-workspace__intelligence-detail-row" key={row.id}>
            <span
              className={`runtime-workspace__intelligence-detail-icon${
                row.iconVariant ? ` runtime-workspace__intelligence-detail-icon--${row.iconVariant}` : ''
              }`}
              aria-hidden="true"
            >
              <RowIcon />
            </span>
            <span className="runtime-workspace__intelligence-detail-copy">
              <strong>{row.title}</strong>
              {row.meta ? <span>{row.meta}</span> : null}
            </span>
            {badgeLabel ? (
              <Badge
                variant={row.badgeVariant || 'neutral'}
                size="sm"
                pill
                outline
              >
                {badgeLabel}
              </Badge>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

const getDiscoveryProjection = (renderer) =>
  renderer?.discovery ?? renderer?.evidencePack ?? renderer?.evidence_pack ?? null

const getDiscoveryAcquisitionProfile = (discovery) => {
  const profile = String(discovery?.acquisition?.profile || discovery?.acquisitionProfile || '').trim().toUpperCase()
  if (
    profile === DISCOVERY_ACQUISITION_PROFILES.STANDARD
    || profile === DISCOVERY_ACQUISITION_PROFILES.ENHANCED
  ) return profile
  return DISCOVERY_ACQUISITION_PROFILES.STANDARD
}

const getDiscoveryAcquisitionLabel = (profile) => {
  if (profile === DISCOVERY_ACQUISITION_PROFILES.STANDARD) return 'Standard Acquisition'
  if (profile === DISCOVERY_ACQUISITION_PROFILES.ENHANCED) return 'Enhanced Acquisition'
  return formatRuntimeTokenLabel(profile)
}

const getDiscoveryState = (renderer) => {
  const discovery = getDiscoveryProjection(renderer)
  const explicitStatus = String(discovery?.state?.status ?? discovery?.status ?? '').trim()
  if (explicitStatus) return formatRuntimeTokenLabel(explicitStatus)
  if (hasRuntimeValue(discovery?.scopedViews) || hasRuntimeValue(discovery?.scoped_views)) return 'Evidence Ready'
  if (hasRuntimeValue(discovery)) return 'Input Captured'
  return 'Evidence Not Ready'
}

const getDiscoveryScopedViews = (discovery) => {
  const scopedViews = discovery?.scopedViews ?? discovery?.scoped_views ?? {}
  return scopedViews && typeof scopedViews === 'object' && !Array.isArray(scopedViews)
    ? scopedViews
    : {}
}

const getSectionScopedEvidenceView = ({ discovery, section }) => {
  const scopedViews = getDiscoveryScopedViews(discovery)
  const runtimePathTail = String(section?.runtimePath || '').split('.').filter(Boolean).pop()
  const candidates = [
    section?.sectionKey,
    section?.key,
    section?.runtimePath,
    runtimePathTail,
    runtimePathTail?.replace(/_/g, '-'),
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)

  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(scopedViews, candidate)) {
      return scopedViews[candidate]
    }
  }

  return null
}

const formatProjectionSummary = (value) => {
  if (!hasRuntimeValue(value)) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'} projected`
  if (typeof value === 'object') {
    return 'Structured evidence projection is available.'
  }
  return String(value)
}

const getSectionDisplayStatus = (section, { lockedInspection = false } = {}) => {
  const stateStatus = String(section?.state?.status ?? '').trim()
  if (lockedInspection) return 'LOCKED'
  if (stateStatus) return stateStatus
  return ''
}

const getSectionNavigationStatus = (section, options = {}) => {
  const stateStatus = getSectionDisplayStatus(section, options)
  if (stateStatus) return formatRuntimeTokenLabel(stateStatus)
  const hasInput = hasRuntimeValue(section?.value)
  const hasGenerated = hasRuntimeValue(section?.generated?.content ?? section?.generated)
  return hasGenerated ? 'Generated' : hasInput ? 'Input Captured' : 'Input Required'
}

const getSectionDisplayLabel = (section, fallback = 'Runtime field') => {
  const rawLabel = String(
    section?.shortLabel
    || section?.label
    || section?.sectionKey
    || section?.key
    || fallback,
  ).trim()

  return normalizeIntelligenceHubDisplayText(rawLabel.replace(/^Section\s+/i, '').trim()) || fallback
}

const getSectionPlaceholder = (section) => {
  const explicitPlaceholder = String(section?.placeholder ?? '').trim()
  const control = String(section?.control ?? 'TEXT').trim().toUpperCase()
  const dataType = String(section?.dataType ?? '').trim().toUpperCase()
  const label = getSectionDisplayLabel(section, 'this section').toLowerCase()
    || 'this section'
  const isStructuredField = control === 'JSON' || dataType === 'OBJECT' || dataType === 'ARRAY'
  const isGenericPlaceholder = /^enter\s+.+\.\.\.$/i.test(explicitPlaceholder)

  if (explicitPlaceholder && (!isStructuredField || !isGenericPlaceholder)) return explicitPlaceholder

  if (dataType === 'ARRAY') {
    return 'Add one relevant point per line for this section.'
  }

  if (control === 'JSON' || dataType === 'OBJECT') {
    if (label === 'executive summary') {
      return 'Summarise the customer situation, priority, and recommended value narrative focus.'
    }

    return `Add a concise ${label} note for this value narrative.`
  }

  return `Add ${label} details here.`
}

const stringifyDraftValue = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value)
    if (keys.length === 1 && typeof value.summary === 'string') {
      return value.summary
    }
  }

  return stringifyValue(value)
}

const parseDraftValue = (section, draftValue) => {
  const control = String(section?.control ?? 'TEXT').trim().toUpperCase()
  const dataType = String(section?.dataType ?? '').trim().toUpperCase()
  const textValue = String(draftValue ?? '')

  if (control === 'CHECKBOX' || dataType === 'BOOLEAN') {
    return textValue === 'true'
  }

  if (control === 'NUMBER' || dataType === 'NUMBER') {
    const normalizedValue = textValue.trim()
    if (!normalizedValue) return null
    const numericValue = Number(normalizedValue)
    if (!Number.isFinite(numericValue)) {
      throw new Error('Enter a valid number before saving.')
    }
    return numericValue
  }

  if (control === 'JSON' || dataType === 'OBJECT' || dataType === 'ARRAY') {
    const normalizedValue = textValue.trim()
    if (!normalizedValue) return null
    try {
      return JSON.parse(normalizedValue)
    } catch {
      if (normalizedValue.startsWith('{') || normalizedValue.startsWith('[')) {
        throw new Error('Enter valid JSON before saving.')
      }

      if (dataType === 'ARRAY') {
        return normalizedValue
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      }

      return { summary: normalizedValue }
    }
  }

  return textValue
}

const getSectionValidationError = (section) => {
  const message = (Array.isArray(section?.validationMessages) ? section.validationMessages : [])
    .find((item) => String(item?.severity ?? '').toUpperCase() === 'ERROR')
  return message?.message ?? ''
}

const getSectionHelperText = (section) => {
  const validationMessages = Array.isArray(section?.validationMessages)
    ? section.validationMessages
    : []
  if (validationMessages.length > 0) {
    return validationMessages.map((message) => message.message).filter(Boolean).join(' ')
  }
  return section?.helpText ?? ''
}

const getAllowedValueLabel = (section, value) => {
  const labels = section?.allowedValueLabels ?? {}
  return labels?.[value] ?? value
}

const getSectionControlId = (section) => {
  const rawId = String(section?.key ?? section?.runtimePath ?? 'runtime-field')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `runtime-field-${rawId || 'section'}`
}

const getSectionDomId = (section, index = 0) => {
  const rawId = String(section?.key ?? section?.sectionKey ?? `section-${index + 1}`)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `runtime-section-${rawId || index + 1}`
}

function RuntimeSummaryTile({
  label,
  value,
  variant = 'neutral',
}) {
  return (
    <li className="runtime-workspace__summary-card">
      <span className="runtime-workspace__summary-label">{label}</span>
      <strong className={getSummaryValueClassName(variant)}>{value}</strong>
    </li>
  )
}

function RuntimeValueControl({
  disabled = false,
  editable = false,
  onChange,
  section,
  value,
}) {
  const control = String(section?.control ?? 'TEXT').trim().toUpperCase()
  const label = getSectionDisplayLabel(section)
  const error = getSectionValidationError(section)
  const helperText = getSectionHelperText(section)
  const isReadOnly = !editable || disabled
  const commonProps = {
    id: getSectionControlId(section),
    label,
    value,
    placeholder: getSectionPlaceholder(section),
    required: Boolean(section?.required),
    error,
    helperText,
    fullWidth: true,
    readOnly: isReadOnly,
    onChange,
  }

  if (control === 'TEXTAREA') {
    return (
      <Textarea
        {...commonProps}
        rows={5}
        resize="vertical"
      />
    )
  }

  if (control === 'NUMBER') {
    return (
      <Input
        {...commonProps}
        type="number"
      />
    )
  }

  if (control === 'CHECKBOX') {
    return (
      <label className="runtime-workspace__checkbox">
        <input
          type="checkbox"
          checked={value === 'true'}
          disabled={isReadOnly}
          onChange={(event) => onChange?.({ target: { value: String(event.target.checked) } })}
          aria-label={label}
        />
        <span>{label}</span>
      </label>
    )
  }

  if (control === 'SELECT') {
    const allowedValues = Array.isArray(section?.allowedValues) ? section.allowedValues : []
    return (
      <label className="runtime-workspace__select-field">
        <span>{label}</span>
        <select value={value} disabled={isReadOnly} onChange={onChange}>
          <option value="">{section?.placeholder || 'Select value'}</option>
          {allowedValues.map((allowedValue) => (
            <option key={allowedValue} value={allowedValue}>
              {getAllowedValueLabel(section, allowedValue)}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (control === 'JSON') {
    return (
      <label className="runtime-workspace__json-field">
        <span>{label}</span>
        <textarea
          value={value}
          placeholder={commonProps.placeholder}
          readOnly={isReadOnly}
          rows={6}
          onChange={onChange}
          aria-label={label}
        />
      </label>
    )
  }

  return (
    <Input
      {...commonProps}
      type="text"
    />
  )
}

function RuntimeSection({
  acceptingRuntimePath = '',
  disabled = false,
  discovery = null,
  executingActionKey = '',
  feedback = null,
  generationActions = {},
  id,
  lockedInspection = false,
  onExecuteSectionAction,
  onAcceptSection,
  onClearSectionEvidence,
  onReviewAllSectionEvidence,
  onReviewSectionEvidence,
  onSave,
  onSaveAndNext,
  onNext,
  onUploadSectionEvidence,
  reviewingSectionEvidenceObjectId = '',
  section,
  showRuntimePath = false,
  clearingSectionEvidencePath = '',
  uploadingSectionEvidencePath = '',
}) {
  const validationMessages = Array.isArray(section?.validationMessages)
    ? section.validationMessages
    : []
  const currentValue = stringifyDraftValue(section?.value)
  const [draftValue, setDraftValue] = useState(currentValue)
  const [localError, setLocalError] = useState('')
  const [showCompare, setShowCompare] = useState(false)
  const [activeSectionContentTab, setActiveSectionContentTab] = useState(0)
  const [sectionDocumentSources, setSectionDocumentSources] = useState([])
  const [sectionDocumentUploadError, setSectionDocumentUploadError] = useState('')
  const [sectionDocumentUploadPreparing, setSectionDocumentUploadPreparing] = useState(false)
  const [showSectionEvidenceClearWarning, setShowSectionEvidenceClearWarning] = useState(false)
  const sectionDocumentUploadPreparingRef = useRef(false)
  const sectionDocumentInputRef = useRef(null)
  const editable = Boolean(section?.editable)
  const isDirty = draftValue !== currentValue
  const isSaving = Boolean(disabled)
  const canSave = editable && isDirty && !isSaving
  const canAdvance = Boolean(onNext || onSaveAndNext) && !isSaving && !executingActionKey
  const generatedContent = stringifyGeneratedContent(section?.generated)
  const acceptedContent = stringifyAcceptedContent(section?.accepted)
  const intelligence = getSectionIntelligence(section)
  const confidenceState = intelligence.confidence?.level || 'NONE'
  const dependencyState = intelligence.dependency?.state || 'NO_SECTION_DEPENDENCIES'
  const readinessState = intelligence.readiness?.state || 'DRAFT_INPUT_NEEDED'
  const compareState = intelligence.compare?.state || 'NO_GENERATED_CONTENT'
  const displayProjection = intelligence.displayProjection || {}
  const suggestedProjection = displayProjection.suggestedFromDiscovery || {}
  const generatedInsightProjection = displayProjection.generatedInsight || {}
  const supportingEvidenceProjection = displayProjection.supportingEvidence || {}
  const boundariesProjection = displayProjection.boundaries || {}
  const confidenceProjection = displayProjection.confidence || {}
  const suggestedBullets = getProjectionItems(suggestedProjection.bullets)
  const generatedInsightSections = getProjectionItems(generatedInsightProjection.sections)
  const supportingEvidenceItems = getProjectionItems(supportingEvidenceProjection.items)
  const boundaryItems = getProjectionItems(boundariesProjection.items)
  const confidenceSignals = getProjectionItems(confidenceProjection.signals)
  const truthEligibilityMessage = getTruthEligibilityMessage(intelligence.truthEligibility)
  const scopedEvidenceView = getSectionScopedEvidenceView({ discovery, section })
  const sectionEvidence = section?.sectionEvidence && typeof section.sectionEvidence === 'object'
    ? section.sectionEvidence
    : {}
  const sectionEvidenceDocuments = Array.isArray(sectionEvidence.documents) ? sectionEvidence.documents : []
  const sectionEvidenceObjects = Array.isArray(sectionEvidence.evidenceObjects) ? sectionEvidence.evidenceObjects : []
  const sectionEvidenceStatus = sectionEvidence.status || 'EMPTY'
  const isUploadingSectionEvidence = uploadingSectionEvidencePath === section?.runtimePath
  const isClearingSectionEvidence = clearingSectionEvidencePath === section?.runtimePath
  const isReviewingAllSectionEvidence = reviewingSectionEvidenceObjectId === `all:${section?.runtimePath}`
  const sectionEvidenceHasPersisted = sectionEvidenceDocuments.length > 0
    || sectionEvidenceObjects.length > 0
    || Number(sectionEvidence.documentCount || 0) > 0
    || Number(sectionEvidence.evidenceObjectCount || 0) > 0
  const scopedEvidenceSummary = scopedEvidenceView?.summary
    || formatProjectionSummary(scopedEvidenceView)
  const acceptedIsCurrent = isAcceptedGeneratedCurrent({
    accepted: section?.accepted,
    generated: section?.generated,
  })
  const isAcceptingSection = acceptingRuntimePath === section?.runtimePath
  const revisions = Array.isArray(section?.revisions) ? section.revisions : []
  const acceptedRevisions = Array.isArray(section?.acceptedRevisions)
    ? section.acceptedRevisions
    : Array.isArray(section?.accepted?.revisions)
      ? section.accepted.revisions
      : []
  const latestGeneratedRevision = getLatestRevisionValue(revisions, 'generated')
  const latestAcceptedRevision = getLatestRevisionValue(acceptedRevisions, 'accepted')
    || getLatestRevisionValue(revisions, 'accepted')
  const previousGeneratedContent = stringifyGeneratedContent(latestGeneratedRevision?.generated)
  const previousAcceptedContent = stringifyAcceptedContent(latestAcceptedRevision?.accepted)
  const hasGenerationBaseline = hasRuntimeValue(latestGeneratedRevision?.generated)
  const canCompare = Boolean(generatedContent || acceptedContent || previousGeneratedContent || previousAcceptedContent)
  const generateAction = generationActions[SECTION_ACTION_KEYS.GENERATE_SECTION] || null
  const regenerateAction = generationActions[SECTION_ACTION_KEYS.REGENERATE_SECTION] || null
  const generateLabel = getRuntimeActionLabel(generateAction, 'Generate')
  const regenerateLabel = getRuntimeActionLabel(regenerateAction, 'Regenerate')
  const unsavedContextReason = canSave
    ? 'Save context changes before generating or accepting truth.'
    : ''
  const generateDisabledReason = unsavedContextReason || getSectionActionDisabledReason({
    action: generateAction,
    actionKey: SECTION_ACTION_KEYS.GENERATE_SECTION,
    editable,
    executingActionKey,
    generatedContent,
    hasGenerationBaseline,
    section,
  })
  const regenerateDisabledReason = unsavedContextReason || getSectionActionDisabledReason({
    action: regenerateAction,
    actionKey: SECTION_ACTION_KEYS.REGENERATE_SECTION,
    editable,
    executingActionKey,
    generatedContent,
    hasGenerationBaseline,
    section,
  })
  const generateReasonId = `${section.key}-generate-section-reason`
  const regenerateReasonId = `${section.key}-regenerate-section-reason`
  const acceptReasonId = `${section.key}-accept-section-reason`
  const unsavedContextReasonId = `${section.key}-context-save-reason`
  const acceptDisabledReason = unsavedContextReason || getAcceptSectionDisabledReason({
    acceptedIsCurrent,
    editable,
    executingActionKey,
    generatedContent,
    isAcceptingSection,
    isSaving,
    section,
  })
  const resolvedFeedback = localError
    ? { variant: 'error', message: localError }
    : feedback
  const showGenerateAction = Boolean(generateAction)
  const showRegenerateAction = Boolean(regenerateAction)
  const showCompareAction = canCompare
  const showAcceptAction = Boolean(onAcceptSection)
  const showNextAction = canAdvance
  const nextActionLabel = editable ? 'Save & Next' : 'Next'
  const nextActionTitle = canSave
    ? 'Save unsaved additional context and continue to the next guided section.'
    : generatedContent || acceptedContent
      ? 'Continue to the next guided section. Generated or accepted truth is already persisted.'
      : 'Continue to the next guided section without marking this section complete.'
  const sectionDisplayLabel = getSectionDisplayLabel(section, `Guided item ${section?.key ?? ''}`.trim())
  const sectionDisplayStatus = getSectionDisplayStatus(section, { lockedInspection })
  const suggestedRows = buildProjectionDetailRows(suggestedBullets)
  const supportingEvidenceRows = buildProjectionDetailRows(supportingEvidenceItems)
  const boundaryRows = buildProjectionDetailRows(boundaryItems)
  const confidenceRows = [
    {
      id: 'confidence-state',
      title: 'Confidence',
      meta: confidenceSignals.length > 0
        ? 'Projected from section evidence and generation controls.'
        : 'No confidence signals are projected yet.',
      badgeLabel: confidenceProjection.label || formatRuntimeTokenLabel(confidenceState),
      badgeVariant: getTokenStatusVariant(confidenceState),
    },
    ...confidenceSignals.map((signal, index) => ({
      id: `confidence-signal-${index}-${signal}`,
      title: signal,
      meta: 'Confidence signal',
    })),
  ]
  const governedIntelligenceRows = [
    ...confidenceRows,
    {
      id: 'dependency-state',
      title: 'Dependencies',
      meta: getDependencySummary(intelligence.dependency),
      badgeLabel: formatRuntimeTokenLabel(dependencyState),
      badgeVariant: getTokenStatusVariant(dependencyState),
    },
    {
      id: 'truth-readiness-state',
      title: 'Truth Readiness',
      meta: getTruthReadinessSummary(intelligence.readiness),
      badgeLabel: formatRuntimeTokenLabel(readinessState),
      badgeVariant: getTokenStatusVariant(readinessState),
    },
    {
      id: 'compare-state',
      title: 'Compare',
      meta: intelligence.compare?.summary || formatRuntimeTokenLabel(compareState),
      badgeLabel: formatRuntimeTokenLabel(compareState),
      badgeVariant: getTokenStatusVariant(compareState),
    },
  ]
  const acceptedTruthRows = [
    {
      id: 'accepted-truth',
      title: acceptedContent ? 'Current accepted truth' : 'Accepted truth not projected',
      meta: acceptedContent || 'No accepted governed truth has been projected for this section.',
    },
  ]
  const compareRows = [
    {
      id: 'generated-section',
      title: 'Generated Section',
      meta: generatedContent || 'Awaiting generation',
    },
    {
      id: 'accepted-truth',
      title: 'Accepted Truth',
      meta: acceptedContent || 'No accepted governed truth has been projected for this section.',
    },
    {
      id: 'previous-generated',
      title: 'Previous Generated',
      meta: previousGeneratedContent || 'No previous generated revision',
    },
    {
      id: 'previous-accepted-truth',
      title: 'Previous Accepted Truth',
      meta: previousAcceptedContent || 'No previous accepted truth revision',
    },
  ]
  const compareGroups = compareRows.map((row) => ({
    ...row,
    groups: buildCompareValueGroups(row.meta, row.title),
  }))
  const suggestedDetailGroups = suggestedRows.length > 0
    ? [
      {
        id: 'suggested-evidence-themes',
        title: 'Evidence Themes',
        icon: MdSource,
        iconVariant: 'evidence',
        badgeLabel: `${suggestedRows.length} item${suggestedRows.length === 1 ? '' : 's'}`,
        badgeVariant: 'primary',
        rows: suggestedRows,
      },
    ]
    : EMPTY_ARRAY
  const generatedInsightGroups = [
    ...generatedInsightSections.map((generatedSection, index) => {
      const generatedRows = buildProjectionDetailRows(generatedSection.bullets)
      const body = String(generatedSection.body || '').trim()
      const rows = [
        ...(body ? [{
          id: `generated-section-${index}-summary`,
          title: 'Summary',
          meta: body,
        }] : []),
        ...generatedRows,
      ]

      return {
        id: `generated-section-${index}-${generatedSection.heading || 'generated-insight'}`,
        title: generatedSection.heading || 'Generated Theme',
        icon: MdBolt,
        iconVariant: 'generated',
        badgeLabel: '',
        badgeVariant: 'primary',
        rows,
      }
    }),
    ...(supportingEvidenceRows.length > 0 ? [{
      id: 'supporting-evidence',
      title: supportingEvidenceProjection.title || 'Supporting Evidence',
      icon: MdFactCheck,
      iconVariant: 'evidence',
      badgeLabel: `${supportingEvidenceRows.length} item${supportingEvidenceRows.length === 1 ? '' : 's'}`,
      badgeVariant: 'success',
      rows: supportingEvidenceRows,
    }] : []),
    ...(boundaryRows.length > 0 ? [{
      id: 'generation-boundaries',
      title: boundariesProjection.title || 'Boundaries / Not Assumed',
      icon: MdOutlineWarningAmber,
      iconVariant: 'boundary',
      badgeLabel: `${boundaryRows.length} item${boundaryRows.length === 1 ? '' : 's'}`,
      badgeVariant: 'warning',
      rows: boundaryRows,
    }] : []),
  ].filter((group) => Array.isArray(group.rows) && group.rows.length > 0)
  const acceptedTruthGroups = [
    {
      id: 'accepted-truth-current',
      title: 'Accepted Truth',
      icon: MdFactCheck,
      iconVariant: 'truth',
      badgeLabel: formatRuntimeTokenLabel(section?.state?.status || (acceptedContent ? 'ACCEPTED' : 'DRAFT')),
      badgeVariant: getTokenStatusVariant(section?.state?.status || (acceptedContent ? 'ACCEPTED' : 'DRAFT')),
      rows: acceptedTruthRows,
    },
  ]

  const handleChange = (event) => {
    setLocalError('')
    setDraftValue(event.target.value)
  }

  const parseCurrentDraftValue = () => {
    if (!canSave) return

    try {
      return parseDraftValue(section, draftValue)
    } catch (parseError) {
      setLocalError(parseError.message)
      return undefined
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const value = parseCurrentDraftValue()
    if (value === undefined) return

    await onSave?.({ section, value })
  }

  const handleDiscardContextChanges = () => {
    setLocalError('')
    setDraftValue(currentValue)
  }

  const handleNext = async () => {
    if (canSave) {
      const value = parseCurrentDraftValue()
      if (value === undefined) return

      await onSaveAndNext?.({ section, value })
      return
    }

    await onNext?.({ section })
  }

  const handleAcceptTruth = async () => {
    const accepted = await onAcceptSection?.({ section })
    if (accepted) {
      setActiveSectionContentTab(2)
    }
  }

  const handleSectionEvidenceFilesChange = async (event) => {
    const files = Array.from(event.target.files || [])
    setSectionDocumentUploadError('')
    setSectionDocumentSources([])

    if (files.length === 0) return
    if (files.length > DISCOVERY_DOCUMENT_MAX_COUNT) {
      setSectionDocumentUploadError(`Select ${DISCOVERY_DOCUMENT_MAX_COUNT} documents or fewer.`)
      return
    }

    sectionDocumentUploadPreparingRef.current = true
    setSectionDocumentUploadPreparing(true)

    try {
      const documentSources = await Promise.all(files.map(buildSectionDocumentSource))
      setSectionDocumentSources(documentSources)
    } catch (uploadError) {
      setSectionDocumentSources([])
      setSectionDocumentUploadError(uploadError?.message || 'One or more section documents could not be prepared.')
    } finally {
      sectionDocumentUploadPreparingRef.current = false
      setSectionDocumentUploadPreparing(false)
    }
  }

  const handleClearSectionEvidenceFiles = () => {
    setSectionDocumentSources([])
    setSectionDocumentUploadError('')
    if (sectionDocumentInputRef.current) {
      sectionDocumentInputRef.current.value = ''
    }
  }

  const handleSectionEvidenceUpload = async () => {
    if (sectionDocumentUploadPreparingRef.current || sectionDocumentUploadPreparing) {
      setSectionDocumentUploadError('Wait for selected documents to finish preparing.')
      return
    }
    if (sectionDocumentUploadError || sectionDocumentSources.length === 0) return

    const uploaded = await onUploadSectionEvidence?.({
      section,
      documentSources: sectionDocumentSources,
    })
    if (uploaded) {
      setSectionDocumentSources([])
      setSectionDocumentUploadError('')
      if (sectionDocumentInputRef.current) {
        sectionDocumentInputRef.current.value = ''
      }
    }
  }

  const handleClearPersistedSectionEvidence = async () => {
    const cleared = await onClearSectionEvidence?.({ section })
    if (cleared) {
      setShowSectionEvidenceClearWarning(false)
    }
  }

  const suggestedFromIntelligencePanel = (
    <section
      className="runtime-workspace__section-panel runtime-workspace__insight-card"
      aria-label={`Suggested from ${INTELLIGENCE_HUB_LABEL}`}
      tabIndex={0}
    >
      <div className="runtime-workspace__insight-header">
        <div>
          <h3>Suggested From {INTELLIGENCE_HUB_LABEL}</h3>
          <p className="runtime-workspace__insight-lede">
            {suggestedProjection.summary || scopedEvidenceSummary || `No ${INTELLIGENCE_HUB_EVIDENCE_LABEL} is projected for this section yet.`}
          </p>
        </div>
      </div>
      {suggestedBullets.length > 0 || suggestedProjection.summary ? (
        <>
          {suggestedDetailGroups.length > 0 ? (
            <SectionDetailGroupList groups={suggestedDetailGroups} ariaLabel="Evidence themes" />
          ) : null}
          {suggestedProjection.evidenceScope ? (
            <p className="runtime-workspace__insight-note">
              <span>{suggestedProjection.evidenceScope}</span>
            </p>
          ) : null}
        </>
      ) : hasRuntimeValue(scopedEvidenceView) ? (
        null
      ) : (
        <p className="runtime-workspace__insight-note">
          <span>No section-scoped intelligence is available yet.</span>
        </p>
      )}
    </section>
  )

  const additionalContextPanel = (
    <section className="runtime-workspace__section-panel" aria-label="Your Additional Context">
      <h3>Your Additional Context</h3>
      <RuntimeValueControl
        section={section}
        value={draftValue}
        editable={editable}
        disabled={isSaving}
        onChange={handleChange}
      />
      {editable ? (
        <div className="runtime-workspace__context-save-bar">
          <p id={unsavedContextReasonId}>
            {canSave || isSaving
              ? 'Save context changes before generating or accepting truth.'
              : 'No unsaved context changes.'}
          </p>
          <ButtonGroup
            align="start"
            stackOnMobile
            fullWidthOnMobile
            className="runtime-workspace__context-save-actions"
            aria-label={`${sectionDisplayLabel} context changes`}
          >
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!canSave}
              leftIcon={<MdSave aria-hidden="true" />}
            >
              {isSaving ? 'Saving' : 'Save Changes'}
            </Button>
            {canSave || isSaving ? (
            <Button
              type="button"
              variant="warning"
              size="sm"
              disabled={isSaving}
              leftIcon={<MdClose aria-hidden="true" />}
              onClick={handleDiscardContextChanges}
            >
              Discard
            </Button>
            ) : null}
          </ButtonGroup>
        </div>
      ) : null}
    </section>
  )

  const sectionEvidenceUploadDisabledReason = !editable
    ? section?.readonlyReason || 'Current role or permissions do not allow section evidence extraction.'
    : isSaving
      ? 'Wait for the section save to finish before extracting evidence.'
      : isUploadingSectionEvidence
        ? 'Section evidence extraction is already running.'
        : sectionDocumentUploadPreparing
          ? 'Wait for selected documents to finish preparing.'
          : sectionDocumentUploadError
            ? sectionDocumentUploadError
            : ''
  const showSectionEvidenceUploadButton = sectionDocumentSources.length > 0
    && !sectionDocumentUploadError
    && !sectionDocumentUploadPreparing
    && editable
    && !isSaving
  const sectionEvidenceUploadReasonId = `${section.key}-section-evidence-upload-reason`
  const sectionEvidenceReviewSummary = sectionEvidenceObjects.length > 0
    ? `${sectionEvidenceObjects.length} evidence object${sectionEvidenceObjects.length === 1 ? '' : 's'}: ${
      Number(sectionEvidence.acceptedEvidenceObjectCount || 0)
    } accepted, ${
      Number(sectionEvidence.pendingEvidenceObjectCount || 0)
    } pending, ${
      Number(sectionEvidence.rejectedEvidenceObjectCount || 0)
    } rejected`
    : ''
  const reviewAllSectionEvidenceDisabledReason = !editable
    ? section?.readonlyReason || 'Current role or permissions do not allow section evidence review.'
    : isSaving
      ? 'Wait for the section save to finish before accepting evidence.'
      : isUploadingSectionEvidence
        ? 'Wait for section evidence extraction to finish before accepting evidence.'
        : isClearingSectionEvidence
          ? 'Wait for section evidence cleanup to finish before accepting evidence.'
          : reviewingSectionEvidenceObjectId
            ? 'Wait for the section evidence review to finish before accepting more evidence.'
            : ''
  const canReviewAllSectionEvidence = editable
    && !isSaving
    && !isUploadingSectionEvidence
    && !isClearingSectionEvidence
    && !reviewingSectionEvidenceObjectId
  const reviewAllSectionEvidenceReasonId = `${section.key}-section-evidence-review-all-reason`
  const clearSectionEvidenceDisabledReason = !editable
    ? section?.readonlyReason || 'Current role or permissions do not allow section evidence cleanup.'
    : isSaving
      ? 'Wait for the section save to finish before clearing evidence.'
      : isUploadingSectionEvidence
        ? 'Wait for section evidence extraction to finish before clearing evidence.'
      : isClearingSectionEvidence
        ? 'Section evidence cleanup is already running.'
        : isReviewingAllSectionEvidence
          ? 'Section evidence bulk review is already running.'
        : reviewingSectionEvidenceObjectId
          ? 'Wait for the section evidence review to finish before clearing evidence.'
          : ''
  const canClearSectionEvidence = sectionEvidenceHasPersisted
    && editable
    && !isSaving
    && !isUploadingSectionEvidence
    && !isClearingSectionEvidence
    && !isReviewingAllSectionEvidence
    && !reviewingSectionEvidenceObjectId
  const clearSectionEvidenceTitleId = `${section.key}-section-evidence-clear-title`
  const clearSectionEvidenceCopyId = `${section.key}-section-evidence-clear-copy`
  const sectionEvidencePanel = (
    <section className="runtime-workspace__section-panel" aria-label="Section evidence">
      <div className="runtime-workspace__section-evidence-heading">
        <div>
          <h3>Section Evidence</h3>
          <p className="runtime-workspace__section-note">
            <span>{`${sectionEvidence.documentCount || 0} document${Number(sectionEvidence.documentCount || 0) === 1 ? '' : 's'} / ${sectionEvidence.evidenceObjectCount || 0} evidence object${Number(sectionEvidence.evidenceObjectCount || 0) === 1 ? '' : 's'}`}</span>
          </p>
        </div>
        <div className="runtime-workspace__section-evidence-heading-actions">
          <Badge variant={getTokenStatusVariant(sectionEvidenceStatus)} size="sm" pill outline>
            {formatRuntimeTokenLabel(sectionEvidenceStatus)}
          </Badge>
          {sectionEvidenceHasPersisted ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={!canClearSectionEvidence}
              loading={isClearingSectionEvidence}
              aria-describedby={clearSectionEvidenceDisabledReason ? `${section.key}-section-evidence-clear-reason` : undefined}
              leftIcon={<MdDelete aria-hidden="true" />}
              onClick={() => setShowSectionEvidenceClearWarning(true)}
            >
              Clear Section Evidence
            </Button>
          ) : null}
        </div>
      </div>
      {clearSectionEvidenceDisabledReason && sectionEvidenceHasPersisted ? (
        <p
          id={`${section.key}-section-evidence-clear-reason`}
          className="runtime-workspace__action-disabled-reason"
        >
          {clearSectionEvidenceDisabledReason}
        </p>
      ) : null}

      <div className="runtime-workspace__document-upload">
        <div className="runtime-workspace__document-upload-field">
          <div className="runtime-workspace__document-upload-label-row">
            <span id={`${section.key}-section-documents-label`} className="runtime-workspace__document-upload-label">
              Supporting Files
            </span>
            <DocumentStorageTooltip id={`${section.key}-section-documents-storage-note`} />
          </div>
          <input
            ref={sectionDocumentInputRef}
            id={`${section.key}-section-documents`}
            type="file"
            className="runtime-workspace__document-upload-input sr-only"
            accept={DISCOVERY_DOCUMENT_ACCEPT}
            multiple
            disabled={!editable || isSaving || sectionDocumentSources.length > 0 || sectionDocumentUploadPreparing || isUploadingSectionEvidence}
            aria-labelledby={`${section.key}-section-documents-label`}
            aria-describedby={`${section.key}-section-documents-helper`}
            onChange={handleSectionEvidenceFilesChange}
          />
          {sectionDocumentSources.length > 0 ? (
            <Button
              type="button"
              variant="warning"
              size="sm"
              className="runtime-workspace__document-upload-cancel"
              disabled={isUploadingSectionEvidence}
              leftIcon={<MdClose aria-hidden="true" />}
              onClick={handleClearSectionEvidenceFiles}
            >
              Cancel
            </Button>
          ) : (
            <label
              htmlFor={`${section.key}-section-documents`}
              className={`btn btn--outline btn--sm runtime-workspace__document-upload-button${
                !editable || isSaving || sectionDocumentUploadPreparing || isUploadingSectionEvidence
                  ? ' runtime-workspace__document-upload-button--disabled'
                  : ''
              }`}
              aria-disabled={!editable || isSaving || sectionDocumentUploadPreparing || isUploadingSectionEvidence}
            >
              <MdUploadFile aria-hidden="true" />
              Select Files
            </label>
          )}
          {showSectionEvidenceUploadButton ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isUploadingSectionEvidence}
              loading={isUploadingSectionEvidence}
              aria-describedby={sectionEvidenceUploadDisabledReason ? sectionEvidenceUploadReasonId : undefined}
              leftIcon={<MdUploadFile aria-hidden="true" />}
              onClick={handleSectionEvidenceUpload}
            >
              Extract Evidence
            </Button>
          ) : null}
        </div>
        <span className="input-helper" id={`${section.key}-section-documents-helper`}>
          {DOCUMENT_EXTRACTION_HELPER_TEXT}
        </span>
        {sectionDocumentUploadPreparing ? (
          <Status variant="info" size="sm" showIcon>Preparing selected documents</Status>
        ) : null}
        {sectionDocumentUploadError ? (
          <Status variant="error" size="sm" showIcon>{sectionDocumentUploadError}</Status>
        ) : null}
        <SelectedDocumentUploadList
          ariaLabel="Selected section supporting files"
          documents={sectionDocumentSources}
        />
        {sectionEvidenceUploadDisabledReason && showSectionEvidenceUploadButton ? (
          <p
            id={sectionEvidenceUploadReasonId}
            className="runtime-workspace__action-disabled-reason"
          >
            {sectionEvidenceUploadDisabledReason}
          </p>
        ) : null}
      </div>

      {sectionEvidenceDocuments.length > 0 ? (
        <ul className="runtime-workspace__plain-list runtime-workspace__document-upload-list" aria-label="Persisted section supporting files">
          {sectionEvidenceDocuments.map((document) => (
            <li key={document.sectionDocumentId || `${document.fileName}-${document.uploadedAt}`}>
              <strong>{document.fileName || 'Supporting file'}</strong>
              <span>{[
                document.status ? formatRuntimeTokenLabel(document.status) : '',
                document.sizeBytes ? formatDocumentSize(document.sizeBytes) : '',
                document.evidenceObjectsGenerated ? `${document.evidenceObjectsGenerated} evidence object${Number(document.evidenceObjectsGenerated) === 1 ? '' : 's'}` : '',
              ].filter(Boolean).join(' / ')}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Status variant="neutral" size="sm" showIcon>No section files added</Status>
      )}

      {sectionEvidenceObjects.length > 0 ? (
        <div className="runtime-workspace__section-evidence-review">
          <div className="runtime-workspace__section-evidence-review-header">
            <p className="runtime-workspace__section-evidence-summary">
              {sectionEvidenceReviewSummary}
            </p>
            {Number(sectionEvidence.pendingEvidenceObjectCount || 0) > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canReviewAllSectionEvidence}
                loading={isReviewingAllSectionEvidence}
                aria-describedby={reviewAllSectionEvidenceDisabledReason ? reviewAllSectionEvidenceReasonId : undefined}
                leftIcon={<MdCheckCircle aria-hidden="true" />}
                onClick={() => onReviewAllSectionEvidence?.({ section })}
              >
                Accept All
              </Button>
            ) : null}
          </div>
          {reviewAllSectionEvidenceDisabledReason && Number(sectionEvidence.pendingEvidenceObjectCount || 0) > 0 ? (
            <p
              id={reviewAllSectionEvidenceReasonId}
              className="runtime-workspace__action-disabled-reason"
            >
              {reviewAllSectionEvidenceDisabledReason}
            </p>
          ) : null}
          <div
            className="runtime-workspace__section-evidence-scroll"
            role="region"
            aria-label="Section evidence objects review"
            tabIndex={0}
          >
            <ul className="runtime-workspace__plain-list runtime-workspace__plain-list--evidence-objects" aria-label="Section evidence objects">
              {sectionEvidenceObjects.map((evidenceObject) => {
                const evidenceObjectId = String(evidenceObject?.evidenceObjectId || '').trim()
                const reviewStatus = String(evidenceObject?.reviewStatus || 'PENDING').trim().toUpperCase()
                const reviewDisabled = !editable || isSaving || Boolean(reviewingSectionEvidenceObjectId)
                const reviewingThisObject = reviewingSectionEvidenceObjectId === evidenceObjectId
                const evidenceSnippet = String(
                  evidenceObject?.snippet
                    || evidenceObject?.evidenceSnippet
                    || '',
                ).trim()

                return (
                  <li key={evidenceObjectId || `${evidenceObject.sourceId}-${evidenceObject.category}`}>
                    <div className="runtime-workspace__evidence-object-heading">
                      <div>
                        <strong>{evidenceObject.category || evidenceObject.coverageArea || 'Section Evidence'}</strong>
                        <span>{[
                          evidenceObject.coverageArea,
                          evidenceObject.sourceFileName,
                        ].filter(Boolean).join(' / ')}</span>
                        {evidenceSnippet ? (
                          <p className="runtime-workspace__evidence-object-snippet">
                            {normalizeIntelligenceHubDisplayText(evidenceSnippet)}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant={getTokenStatusVariant(reviewStatus)} size="sm" pill outline>
                        {formatRuntimeTokenLabel(reviewStatus)}
                      </Badge>
                    </div>
                    <div className="runtime-workspace__evidence-object-actions">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={reviewDisabled || reviewStatus === 'ACCEPTED'}
                        loading={reviewingThisObject}
                        leftIcon={<MdCheckCircle aria-hidden="true" />}
                        onClick={() => onReviewSectionEvidence?.({
                          section,
                          evidenceObjectId,
                          reviewStatus: 'ACCEPTED',
                        })}
                      >
                        Accept
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={reviewDisabled || reviewStatus === 'REJECTED'}
                        loading={reviewingThisObject}
                        leftIcon={<MdClose aria-hidden="true" />}
                        onClick={() => onReviewSectionEvidence?.({
                          section,
                          evidenceObjectId,
                          reviewStatus: 'REJECTED',
                        })}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      ) : null}
      <Dialog
        open={showSectionEvidenceClearWarning}
        onClose={() => {
          if (!isClearingSectionEvidence) setShowSectionEvidenceClearWarning(false)
        }}
        size="sm"
        closeOnBackdropClick={!isClearingSectionEvidence}
        closeOnEscape={!isClearingSectionEvidence}
        showCloseButton={!isClearingSectionEvidence}
        className="runtime-workspace__section-evidence-clear-dialog"
        role="alertdialog"
        aria-labelledby={clearSectionEvidenceTitleId}
        aria-describedby={clearSectionEvidenceCopyId}
      >
        <Dialog.Header>
          <h2 id={clearSectionEvidenceTitleId}>Clear section evidence?</h2>
        </Dialog.Header>
        <Dialog.Body>
          <div className="runtime-workspace__reset-warning-copy">
            <MdOutlineWarningAmber aria-hidden="true" />
            <div>
              <p id={clearSectionEvidenceCopyId}>
                This clears extracted supporting files and evidence objects for {sectionDisplayLabel}.
                Intelligence Hub evidence is unchanged. Accepted truth may need regeneration.
              </p>
            </div>
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <div className="runtime-workspace__reset-warning-actions">
            <Button
              type="button"
              variant="danger"
              size="sm"
              leftIcon={<MdDelete aria-hidden="true" />}
              disabled={!canClearSectionEvidence}
              loading={isClearingSectionEvidence}
              onClick={handleClearPersistedSectionEvidence}
            >
              Clear Evidence
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<MdClose aria-hidden="true" />}
              disabled={isClearingSectionEvidence}
              onClick={() => setShowSectionEvidenceClearWarning(false)}
            >
              Cancel
            </Button>
          </div>
        </Dialog.Footer>
      </Dialog>
    </section>
  )

  const generatedInsightPanel = (
    <section
      className="runtime-workspace__section-panel runtime-workspace__insight-card"
      aria-label="Generated content"
      tabIndex={0}
    >
      <div className="runtime-workspace__insight-header">
        <div>
          <h3>{generatedInsightProjection.title || 'Generated Insight'}</h3>
          <p className="runtime-workspace__insight-lede">
            {generatedInsightProjection.summary || generatedContent || 'Awaiting generation'}
          </p>
        </div>
      </div>
      {generatedInsightGroups.length > 0 ? (
        <SectionDetailGroupList groups={generatedInsightGroups} ariaLabel="Generated insight groups" />
      ) : null}
      {truthEligibilityMessage ? (
        <p className="runtime-workspace__insight-note">
          <span>{truthEligibilityMessage}</span>
        </p>
      ) : null}
    </section>
  )

  const acceptedTruthPanel = (
    <section className="runtime-workspace__section-panel" aria-label="Accepted truth" tabIndex={0}>
      <h3>Accepted Truth</h3>
      <SectionDetailGroupList groups={acceptedTruthGroups} ariaLabel="Accepted truth groups" />
    </section>
  )

  const stateAndReviewContent = (
    <div className="runtime-workspace__section-state-row" aria-label="State and review">
      <Status variant={getTokenStatusVariant(sectionDisplayStatus || 'DRAFT')} size="sm" showIcon>
        {formatRuntimeTokenLabel(sectionDisplayStatus || 'DRAFT')}
        {Number(section?.state?.revisionCount || 0) > 0
          ? `, ${section.state.revisionCount} revision${section.state.revisionCount === 1 ? '' : 's'}`
          : ''}
      </Status>
      <Status variant={getTokenStatusVariant(section?.review?.status)} size="sm" showIcon>
        {formatRuntimeTokenLabel(section?.review?.status || 'PENDING_REVIEW')}
      </Status>
    </div>
  )

  const governedIntelligenceContent = (
    <div className="runtime-workspace__section-intelligence" role="region" aria-label="Governed intelligence">
      <SectionDetailRows rows={governedIntelligenceRows} ariaLabel="Governed intelligence states" />
    </div>
  )

  const compareContent = showCompare ? (
    <div
      className="runtime-workspace__compare"
      role="region"
      aria-label="Section truth comparison"
      tabIndex={0}
    >
      {compareGroups.map((compareGroup) => (
        <section
          className={`runtime-workspace__section-panel runtime-workspace__compare-panel${
            compareGroup.id.startsWith('previous-') ? ' runtime-workspace__compare-panel--history' : ''
          }`}
          key={compareGroup.id}
          aria-label={compareGroup.title}
        >
          <h3>{compareGroup.title}</h3>
          <SectionDetailGroupList
            groups={compareGroup.groups}
            ariaLabel={`${compareGroup.title} comparison details`}
          />
        </section>
      ))}
    </div>
  ) : null

  const tabbedSectionContent = (
    <div
      className="runtime-workspace__section-tabs-region"
      role="region"
      aria-label="Ownership zones"
    >
      <TabView
        activeTab={activeSectionContentTab}
        onTabChange={setActiveSectionContentTab}
        variant="default"
        size="sm"
        className="runtime-workspace__section-tabs"
        aria-label={`${sectionDisplayLabel} sections`}
      >
        <TabView.Tab label="Overview">
          <div className="runtime-workspace__section-tab-panel">
            <div className="runtime-workspace__section-panels runtime-workspace__section-panels--overview">
              {suggestedFromIntelligencePanel}
              {generatedInsightPanel}
            </div>
          </div>
        </TabView.Tab>
        <TabView.Tab label="Context">
          <div className="runtime-workspace__section-tab-panel">
            <div className="runtime-workspace__section-panels runtime-workspace__section-panels--context">
              {additionalContextPanel}
              {sectionEvidencePanel}
            </div>
          </div>
        </TabView.Tab>
        <TabView.Tab label="Truth">
          <div className="runtime-workspace__section-tab-panel">
            <div className="runtime-workspace__section-panels runtime-workspace__section-panels--truth">
              {acceptedTruthPanel}
            </div>
            {compareContent}
          </div>
        </TabView.Tab>
        <TabView.Tab label="Governance">
          <div className="runtime-workspace__section-tab-panel">
            {stateAndReviewContent}
            {governedIntelligenceContent}
          </div>
        </TabView.Tab>
      </TabView>
    </div>
  )

  return (
    <li id={id} className="runtime-workspace__section-item">
      <Card variant="default" className="runtime-workspace__section-card">
        <Card.Body className="runtime-workspace__section-body">
          <form className="runtime-workspace__section-form" onSubmit={handleSubmit}>
            <div className="runtime-workspace__section-heading">
              <div>
                <h2>{sectionDisplayLabel}</h2>
                {showRuntimePath ? (
                  <p>{section.runtimePath}</p>
                ) : null}
              </div>
              <div className="runtime-workspace__section-badges">
                {section.required ? (
                  <Badge variant="warning" size="sm" pill outline>Required</Badge>
                ) : null}
                <Badge variant={editable ? 'success' : 'neutral'} size="sm" pill outline>
                  {editable ? 'Editable' : lockedInspection ? 'Locked Inspection Mode' : 'Read only preview'}
                </Badge>
              </div>
            </div>
            {tabbedSectionContent}
            {resolvedFeedback ? (
              <Status
                variant={resolvedFeedback.variant}
                size="sm"
                showIcon
              >
                {resolvedFeedback.message}
              </Status>
            ) : null}
            <ButtonGroup
              align="end"
              stackOnMobile
              fullWidthOnMobile
              className="runtime-workspace__section-actions"
              aria-label={`${sectionDisplayLabel} actions`}
            >
              {showGenerateAction ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(generateDisabledReason)}
                  loading={executingActionKey === SECTION_ACTION_KEYS.GENERATE_SECTION}
                  aria-describedby={generateDisabledReason ? generateReasonId : undefined}
                  leftIcon={<MdBolt aria-hidden="true" />}
                  onClick={() => onExecuteSectionAction?.({ action: generateAction, section })}
                >
                  {generateLabel}
                </Button>
              ) : null}
              {showRegenerateAction ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(regenerateDisabledReason)}
                  loading={executingActionKey === SECTION_ACTION_KEYS.REGENERATE_SECTION}
                  aria-describedby={regenerateDisabledReason ? regenerateReasonId : undefined}
                  leftIcon={<MdRefresh aria-hidden="true" />}
                  onClick={() => onExecuteSectionAction?.({ action: regenerateAction, section })}
                >
                  {regenerateLabel}
                </Button>
              ) : null}
              {showCompareAction ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  leftIcon={<MdCompareArrows aria-hidden="true" />}
                  onClick={() => {
                    setShowCompare((current) => !current)
                    setActiveSectionContentTab(2)
                  }}
                >
                  Compare
                </Button>
              ) : null}
              {showAcceptAction ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(acceptDisabledReason)}
                  loading={isAcceptingSection}
                  aria-describedby={acceptDisabledReason ? acceptReasonId : undefined}
                  leftIcon={<MdCheckCircle aria-hidden="true" />}
                  onClick={handleAcceptTruth}
                >
                  Accept Truth
                </Button>
              ) : null}
              {showNextAction ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<MdArrowForward aria-hidden="true" />}
                  title={nextActionTitle}
                  onClick={handleNext}
                >
                  {nextActionLabel}
                </Button>
              ) : null}
            </ButtonGroup>
            {[
              { action: showGenerateAction, id: generateReasonId, reason: generateDisabledReason },
              { action: showRegenerateAction, id: regenerateReasonId, reason: regenerateDisabledReason },
              { action: showAcceptAction, id: acceptReasonId, reason: acceptDisabledReason },
            ].map(({ action, id, reason }) => {
              const shouldShowReason = action && reason
              return shouldShowReason ? (
                <p
                  key={id}
                  id={id}
                  className="runtime-workspace__action-disabled-reason"
                >
                  {reason}
                </p>
              ) : null
            })}
            {validationMessages.length > 0 ? (
              <ul className="runtime-workspace__validation-list" aria-label={`${sectionDisplayLabel} validation messages`}>
                {validationMessages.map((message, index) => (
                  <li key={`${message.validationKey ?? section.key}-${index}`}>
                    <Status
                      variant={String(message.severity ?? '').toUpperCase() === 'ERROR' ? 'error' : 'warning'}
                      size="sm"
                      showIcon
                    >
                      {message.message}
                    </Status>
                  </li>
                ))}
              </ul>
            ) : null}
          </form>
        </Card.Body>
      </Card>
    </li>
  )
}

function RuntimeActionButton({
  action,
  disabled = false,
  executing = false,
  onExecute,
}) {
  const enabled = Boolean(action?.enabled)
  const disabledReason = String(action?.disabledReason ?? '').trim()
  const actionKey = normalizeRuntimeActionToken(action?.governedAction || action?.actionKey || 'runtime-action')
  const actionLabel = getRuntimeActionLabel(action, actionKey)
  const disabledReasonId = disabledReason
    ? `runtime-action-disabled-${actionKey.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}`
    : undefined
  const tooltipId = disabledReasonId ? `${disabledReasonId}-tooltip` : undefined
  const actionButton = (
    <Button
      type="button"
      variant={getActionButtonVariant(action)}
      size="sm"
      disabled={!enabled || disabled}
      loading={executing}
      aria-describedby={!enabled && disabledReason ? disabledReasonId : undefined}
      onClick={() => onExecute?.(action)}
      leftIcon={
        enabled ? (
          <MdBolt className="runtime-workspace__action-icon runtime-workspace__action-icon--execute" aria-hidden="true" />
        ) : (
          <MdInfoOutline className="runtime-workspace__action-icon runtime-workspace__action-icon--info" aria-hidden="true" />
        )
      }
    >
      {actionLabel}
    </Button>
  )

  return (
    <div className="runtime-workspace__action-item">
      {!enabled && disabledReason && disabledReasonId && tooltipId ? (
        <>
          <Tooltip
            id={tooltipId}
            content={disabledReason}
            position="top"
            className="runtime-workspace__action-tooltip"
          >
            <span
              className="runtime-workspace__action-tooltip-trigger"
              tabIndex={0}
              aria-label={`${actionLabel} unavailable. ${disabledReason}`}
            >
              {actionButton}
            </span>
          </Tooltip>
          <p
            id={disabledReasonId}
            className="runtime-workspace__action-disabled-reason runtime-workspace__action-disabled-reason--tooltip-only sr-only"
          >
            {disabledReason}
          </p>
        </>
      ) : (
        actionButton
      )}
    </div>
  )
}

function RuntimeProgressSummary({
  configWarnings = EMPTY_ARRAY,
  readiness = null,
  sections = EMPTY_ARRAY,
}) {
  const requiredSections = sections.filter((section) => section?.required)
  const sectionTruth = readiness?.sectionTruth || {}
  const serverReadyCount = toProgressCount(sectionTruth.readySectionCount)
  const serverRequiredCount = toProgressCount(sectionTruth.requiredSectionCount)
  const hasServerSectionTruthCounts = serverReadyCount !== null && serverRequiredCount !== null
  const requiredCompleteCount = hasServerSectionTruthCounts
    ? Math.min(serverReadyCount, serverRequiredCount)
    : requiredSections.filter(hasRequiredSectionProgress).length
  const requiredTotal = hasServerSectionTruthCounts
    ? serverRequiredCount
    : requiredSections.length
  const generatedCount = sections.filter((section) => hasRuntimeValue(section?.generated?.content ?? section?.generated)).length
  const warningCounts = configWarnings.reduce((acc, warning) => {
    const severity = normalizeWarningSeverity(warning?.severity)
    acc[severity] = (acc[severity] || 0) + 1
    return acc
  }, {})
  const hasRequiredTruth = requiredTotal > 0
  const requiredPercent = hasRequiredTruth
    ? Math.round((requiredCompleteCount / requiredTotal) * 100)
    : 0
  const requiredPercentLabel = hasRequiredTruth ? `${requiredPercent}%` : 'N/A'
  const completionLabel = hasRequiredTruth
    ? `${requiredCompleteCount} of ${requiredTotal} required sections have accepted truth ready`
    : 'No required section truth to measure'
  const warningSummary = [
    warningCounts.BLOCKER ? `${warningCounts.BLOCKER} blocker${warningCounts.BLOCKER === 1 ? '' : 's'}` : '',
    warningCounts.ERROR ? `${warningCounts.ERROR} error${warningCounts.ERROR === 1 ? '' : 's'}` : '',
    warningCounts.WARNING ? `${warningCounts.WARNING} warning${warningCounts.WARNING === 1 ? '' : 's'}` : '',
    warningCounts.INFO ? `${warningCounts.INFO} info` : '',
  ].filter(Boolean).join(' / ') || 'No workspace warnings'

  return (
    <div className="runtime-workspace__progress-summary" aria-label="Execution progress summary">
      <ProgressBar
        ariaLabel={completionLabel}
        className="runtime-workspace__progress-meter"
        label="Accepted truth"
        size="sm"
        value={requiredPercent}
        valueLabel={requiredPercentLabel}
      />
      <ul className="runtime-workspace__metric-list" aria-label="Execution workspace metrics">
        <li>
          <span>Truth ready</span>
          <strong className="runtime-workspace__metric-value runtime-workspace__metric-value--success">
            {hasRequiredTruth ? `${requiredCompleteCount}/${requiredTotal}` : 'None'}
          </strong>
        </li>
        <li>
          <span>Generated</span>
          <strong className="runtime-workspace__metric-value">{generatedCount}/{sections.length}</strong>
        </li>
        <li>
          <span>Warnings</span>
          <strong className="runtime-workspace__metric-value">{warningSummary}</strong>
        </li>
      </ul>
    </div>
  )
}

function RuntimeSectionNavigation({
  activeKey = DISCOVERY_NAV_KEY,
  discoveryState = 'Evidence Not Ready',
  lockedInspection = false,
  onSelectDiscovery,
  onSelectOutputLab,
  onSelectSection,
  outputLabState = 'Not Ready',
  sections = EMPTY_ARRAY,
}) {
  const navItems = sections.map((section, index) => {
    const label = getSectionDisplayLabel(section, `Guided item ${index + 1}`)
    const status = getSectionNavigationStatus(section, { lockedInspection })
    const sectionKey = section?.sectionKey || section?.key || getSectionDomId(section, index)
    const displayNumber = index + 1
    return {
      displayNumber,
      isActive: activeKey === sectionKey,
      label,
      sectionKey,
      status,
      index,
    }
  })
  const renderNavigationItem = (item) => (
    <li key={`${item.sectionKey}-nav`}>
      <button
        type="button"
        className={[
          'runtime-workspace__section-nav-button',
          item.isActive && 'runtime-workspace__section-nav-button--active',
        ].filter(Boolean).join(' ')}
        aria-current={item.isActive ? 'step' : undefined}
        onClick={() => onSelectSection?.(item.index)}
      >
        <span>{item.displayNumber}</span>
        <strong title={item.label}>{item.label}</strong>
        <small>{item.status}</small>
      </button>
    </li>
  )

  return (
    <nav className="runtime-workspace__section-nav" aria-label="Guided section navigation">
      <div className="runtime-workspace__section-nav-scroll">
        <ol className="runtime-workspace__section-nav-list">
          <li>
            <button
              type="button"
              className={[
                'runtime-workspace__section-nav-button',
                activeKey === DISCOVERY_NAV_KEY && 'runtime-workspace__section-nav-button--active',
              ].filter(Boolean).join(' ')}
              aria-current={activeKey === DISCOVERY_NAV_KEY ? 'step' : undefined}
              onClick={onSelectDiscovery}
            >
              <span>0</span>
              <strong title={INTELLIGENCE_HUB_LABEL}>{INTELLIGENCE_HUB_LABEL}</strong>
              <small>{discoveryState}</small>
            </button>
          </li>
          {navItems.map(renderNavigationItem)}
          <li>
            <button
              type="button"
              className={[
                'runtime-workspace__section-nav-button',
                activeKey === OUTPUT_LAB_NAV_KEY && 'runtime-workspace__section-nav-button--active',
              ].filter(Boolean).join(' ')}
              aria-current={activeKey === OUTPUT_LAB_NAV_KEY ? 'step' : undefined}
              onClick={onSelectOutputLab}
            >
              <span><MdArticle aria-hidden="true" /></span>
              <strong title={OUTPUT_LAB_LABEL}>{OUTPUT_LAB_LABEL}</strong>
              <small>{outputLabState}</small>
            </button>
          </li>
        </ol>
      </div>
    </nav>
  )
}

const getOutputLabPayload = (response) => response?.data ?? response ?? null

const getOutputLabAssetId = (asset = {}) =>
  String(asset.outputAssetId || asset.id || asset._id || '').trim()

const getOutputLabReadinessLabel = (outputLab, { loading = false, error = null } = {}) => {
  if (loading) return 'Loading'
  if (error) return 'Unavailable'
  const readiness = outputLab?.readiness || {}
  if (readiness.canGenerate === true) {
    return readiness.state ? formatRuntimeTokenLabel(readiness.state) : 'Ready'
  }
  return readiness.state ? formatRuntimeTokenLabel(readiness.state) : 'Not Ready'
}

function OutputLabSection({
  error = null,
  exportingAssetKey = '',
  generating = false,
  loading = false,
  onExportAsset,
  onGenerateOutput,
  outputLab = null,
  selectedOutputTypeKey = '',
  setSelectedOutputTypeKey,
}) {
  const [activeOutputLabTab, setActiveOutputLabTab] = useState(0)
  const definitions = Array.isArray(outputLab?.definitions) ? outputLab.definitions : EMPTY_ARRAY
  const readiness = outputLab?.readiness || {}
  const blockers = Array.isArray(readiness.blockers) ? readiness.blockers : EMPTY_ARRAY
  const warnings = Array.isArray(readiness.warnings) ? readiness.warnings : EMPTY_ARRAY
  const assets = Array.isArray(outputLab?.assets) ? outputLab.assets : EMPTY_ARRAY
  const requests = Array.isArray(outputLab?.requests) ? outputLab.requests : EMPTY_ARRAY
  const activeOutputTypeKey = selectedOutputTypeKey || definitions[0]?.outputTypeKey || ''
  const activeDefinition = definitions.find((definition) => definition.outputTypeKey === activeOutputTypeKey)
    || definitions[0]
    || null
  const canGenerate = readiness.canGenerate === true
  const generateDisabledReason = !activeDefinition
    ? 'No output definitions are available.'
    : !canGenerate
      ? blockers[0]?.message || readiness.summary || 'Output Lab generation is blocked.'
      : ''
  const readyVariant = canGenerate
    ? getTokenStatusVariant(readiness.state || 'READY')
    : 'error'
  const requestSummary = requests.length > 0
    ? `${requests.length} request${requests.length === 1 ? '' : 's'}`
    : 'No requests'
  const assetSummary = assets.length > 0
    ? `${assets.length} asset${assets.length === 1 ? '' : 's'}`
    : 'No assets'
  const readinessPanel = (
    <section
      className="runtime-workspace__section-panel runtime-workspace__section-panel--output-lab-readiness"
      aria-label="Output Lab readiness"
      tabIndex={0}
    >
      <div className="runtime-workspace__output-lab-panel-heading">
        <h3>Readiness</h3>
        <Status variant={readyVariant} size="sm" showIcon>
          {formatRuntimeTokenLabel(readiness.state || 'UNKNOWN')}
        </Status>
      </div>
      <SectionDetailRows
        ariaLabel="Output Lab readiness details"
        rows={[
          {
            id: 'accepted-truth',
            title: 'Accepted Truth',
            meta: `${readiness.acceptedTruthCount ?? 0}/${readiness.requiredTruthCount ?? 0}`,
          },
          {
            id: 'canonical-output',
            title: 'Canonical Output',
            meta: readiness.outputEligibility?.outputEligible ? 'Eligible' : 'Not eligible',
          },
          {
            id: 'lock-snapshot',
            title: 'Lock Snapshot',
            meta: formatRuntimeIdentifier(readiness.outputEligibility?.lockSnapshotId),
          },
          {
            id: 'replay-anchor',
            title: 'Replay Anchor',
            meta: formatRuntimeIdentifier(readiness.outputEligibility?.replayAnchorId),
          },
          {
            id: 'graph',
            title: 'Graph',
            meta: readiness.graph?.available ? 'Available' : 'Unavailable',
          },
        ]}
      />
      {blockers.length > 0 ? (
        <ul className="runtime-workspace__output-lab-message-list" aria-label="Output Lab blockers">
          {blockers.map((blocker) => (
            <li key={blocker.code || blocker.message}>
              <MdErrorOutline aria-hidden="true" />
              <span>{blocker.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {warnings.length > 0 ? (
        <ul className="runtime-workspace__output-lab-message-list" aria-label="Output Lab warnings">
          {warnings.map((warning) => (
            <li key={warning.code || warning.message}>
              <MdOutlineWarningAmber aria-hidden="true" />
              <span>{warning.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
  const compositionPanel = (
    <section
      className="runtime-workspace__section-panel runtime-workspace__section-panel--output-lab-composition"
      aria-label="Output composition"
      tabIndex={0}
    >
      <div className="runtime-workspace__output-lab-panel-heading">
        <h3>Composition</h3>
        <Badge variant="neutral" size="sm" pill outline>{requestSummary}</Badge>
      </div>
      <Select
        id="runtime-output-lab-output-type"
        label="Output Type"
        value={activeOutputTypeKey}
        disabled={generating || definitions.length === 0}
        options={definitions.map((definition) => ({
          value: definition.outputTypeKey,
          label: definition.label,
        }))}
        onChange={(event) => setSelectedOutputTypeKey(event.target.value)}
      />
      {activeDefinition ? (
        <p className="runtime-workspace__section-note">{activeDefinition.description}</p>
      ) : null}
      <ButtonGroup
        align="end"
        stackOnMobile
        fullWidthOnMobile
        className="runtime-workspace__output-lab-actions"
        aria-label="Output Lab composition actions"
      >
        <Button
          type="button"
          variant="primary"
          size="sm"
          leftIcon={<MdBolt aria-hidden="true" />}
          disabled={generating || Boolean(generateDisabledReason)}
          aria-describedby={generateDisabledReason ? 'runtime-output-lab-generate-reason' : undefined}
          onClick={() => onGenerateOutput?.(activeOutputTypeKey)}
        >
          {generating ? 'Generating' : 'Generate'}
        </Button>
      </ButtonGroup>
      {generateDisabledReason ? (
        <p id="runtime-output-lab-generate-reason" className="runtime-workspace__action-disabled-reason">
          {generateDisabledReason}
        </p>
      ) : null}
    </section>
  )
  const outputsPanel = (
    <section
      className="runtime-workspace__section-panel runtime-workspace__section-panel--output-lab-assets"
      aria-label="Generated outputs"
      tabIndex={0}
    >
      <div className="runtime-workspace__output-lab-panel-heading">
        <h3>Generated Outputs</h3>
        <Badge variant={assets.length > 0 ? 'success' : 'neutral'} size="sm" pill outline>{assetSummary}</Badge>
      </div>
      {assets.length > 0 ? (
        <ul className="runtime-workspace__plain-list runtime-workspace__output-lab-asset-list" aria-label="Generated output assets">
          {assets.map((asset, assetIndex) => {
            const assetId = getOutputLabAssetId(asset)
            const assetStatus = formatRuntimeTokenLabel(asset.status || 'UNKNOWN')
            const exportable = asset.exportable !== false && !asset.stale
            const assetKey = assetId || `${asset.outputTypeKey || 'output'}-${assetIndex}`
            return (
              <li key={assetKey} className="runtime-workspace__output-lab-asset">
                <div>
                  <strong>{asset.outputTypeLabel || formatRuntimeTokenLabel(asset.outputTypeKey)}</strong>
                  <span>{assetStatus}</span>
                </div>
                <ButtonGroup className="runtime-workspace__output-lab-export-actions">
                  {['MARKDOWN', 'JSON'].map((format) => {
                    const exportKey = `${assetId}:${format}`
                    return (
                      <Button
                        key={format}
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<MdDownload aria-hidden="true" />}
                        disabled={!assetId || !exportable || exportingAssetKey === exportKey}
                        onClick={() => onExportAsset?.({ asset, format })}
                      >
                        {format === 'MARKDOWN' ? 'Markdown' : 'JSON'}
                      </Button>
                    )
                  })}
                </ButtonGroup>
              </li>
            )
          })}
        </ul>
      ) : (
        <Status variant="neutral" size="sm" showIcon>No generated outputs</Status>
      )}
    </section>
  )

  return (
    <Card variant="default" className="runtime-workspace__section-card runtime-workspace__output-lab">
      <Card.Body className="runtime-workspace__section-body">
        <div className="runtime-workspace__section-heading">
          <div>
            <h2>{OUTPUT_LAB_LABEL}</h2>
            <p className="runtime-workspace__section-note">
              {readiness.summary || 'Governed output validation for the current runtime.'}
            </p>
          </div>
          <div className="runtime-workspace__section-badges">
            <Badge variant={canGenerate ? 'success' : 'danger'} size="sm" pill outline>
              {getOutputLabReadinessLabel(outputLab, { loading, error })}
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="runtime-workspace__output-lab-state" role="status">
            <Spinner size="md" aria-label="Loading Output Lab" />
          </div>
        ) : null}

        {error ? (
          <Status variant="error" size="sm" showIcon>
            {stripRequestReference(error.message)}
          </Status>
        ) : null}

        <div
          className="runtime-workspace__section-tabs-region"
          role="region"
          aria-label="Output Lab workspace"
        >
          <TabView
            activeTab={activeOutputLabTab}
            onTabChange={setActiveOutputLabTab}
            variant="default"
            size="sm"
            className="runtime-workspace__section-tabs runtime-workspace__output-lab-tabs"
            aria-label="Output Lab sections"
          >
            <TabView.Tab label="Readiness">
              <div className="runtime-workspace__section-tab-panel">
                <div className="runtime-workspace__section-panels runtime-workspace__section-panels--output-lab">
                  {readinessPanel}
                </div>
              </div>
            </TabView.Tab>
            <TabView.Tab label="Composition">
              <div className="runtime-workspace__section-tab-panel">
                <div className="runtime-workspace__section-panels runtime-workspace__section-panels--output-lab">
                  {compositionPanel}
                </div>
              </div>
            </TabView.Tab>
            <TabView.Tab label="Outputs">
              <div className="runtime-workspace__section-tab-panel">
                <div className="runtime-workspace__section-panels runtime-workspace__section-panels--output-lab">
                  {outputsPanel}
                </div>
              </div>
            </TabView.Tab>
          </TabView>
        </div>
      </Card.Body>
    </Card>
  )
}

function DiscoverySection({
  activity = EMPTY_ARRAY,
  discovery = null,
  discoveryState = 'Evidence Not Ready',
  disabled = false,
  evidenceDetail = null,
  evidenceDetailError = null,
  evidenceDetailLoading = false,
  feedback = null,
  discoveryActions = {},
  inspectionMode = false,
  mutationDisabledReason = '',
  executingActionKey = '',
  onAcceptDiscovery,
  onResetDiscovery,
  onReviewEvidenceObject,
  onRefreshEvidence,
  onToggleSources,
  reviewingEvidenceObjectId = '',
  saving = false,
  showSources = false,
}) {
  const scopedViews = getDiscoveryScopedViews(discovery)
  const scopedViewKeys = Object.keys(scopedViews)
  const inputValues = discovery?.inputValues && typeof discovery.inputValues === 'object'
    ? discovery.inputValues
    : {}
  const initialWebsiteSources = normalizeWebsiteSourceDrafts(inputValues)
  const persistedAcquisitionProfile = getDiscoveryAcquisitionProfile(discovery)
  const [draftInputs, setDraftInputs] = useState({
    companyWebsite: initialWebsiteSources.find(Boolean) || inputValues.companyWebsite || '',
    websiteSources: initialWebsiteSources,
    companyName: inputValues.companyName || '',
    marketRegion: inputValues.marketRegion || '',
    targetOffer: inputValues.targetOffer || '',
    notes: inputValues.notes || '',
  })
  const [draftDocumentSources, setDraftDocumentSources] = useState([])
  const [documentUploadError, setDocumentUploadError] = useState('')
  const [documentUploadPreparing, setDocumentUploadPreparing] = useState(false)
  const [acquisitionProfile, setAcquisitionProfile] = useState(persistedAcquisitionProfile)
  const [showResetWarning, setShowResetWarning] = useState(false)
  const [activeIntelligenceHubTab, setActiveIntelligenceHubTab] = useState(INTELLIGENCE_HUB_TAB_INDEXES.OVERVIEW)
  const documentUploadPreparingRef = useRef(false)
  const discoveryDocumentInputRef = useRef(null)
  const inputSummaryKeys = Array.isArray(discovery?.inputSummary?.keys) ? discovery.inputSummary.keys : []
  const evidenceSummaryKeys = Array.isArray(discovery?.evidenceSummary?.keys) ? discovery.evidenceSummary.keys : []
  const inputsSummary = formatDiscoveryInputsSummary({
    count: discovery?.inputSummary?.count,
    inputValues: discovery?.inputs ?? inputValues,
    keys: inputSummaryKeys,
  })
  const evidenceSummary = formatDiscoveryEvidenceSummary({
    count: discovery?.evidenceSummary?.count,
    evidence: discovery?.evidence,
    evidenceReady: discovery?.evidenceReady === true,
    keys: evidenceSummaryKeys,
  })
  const sourceRegistry = getDiscoverySourceRegistry({ discovery, evidenceDetail })
  const sourceRegistryGroups = buildSourceRegistryGroups(sourceRegistry)
  const evidenceObjects = getDiscoveryEvidenceObjects({ discovery, evidenceDetail })
  const isInspectionMode = Boolean(inspectionMode)
  const rawSourceRegistrySummary = hasSourceRegistrySummary(discovery?.sourceRegistrySummary)
    ? discovery.sourceRegistrySummary
    : hasSourceRegistrySummary(evidenceDetail?.sourceRegistrySummary)
      ? evidenceDetail.sourceRegistrySummary
      : {}
  const sourceRegistrySummary = {
    count: Number.isFinite(Number(rawSourceRegistrySummary.count))
      ? Number(rawSourceRegistrySummary.count)
      : sourceRegistry.length,
    sourceTypes: Array.isArray(rawSourceRegistrySummary.sourceTypes)
      ? rawSourceRegistrySummary.sourceTypes
      : Array.from(new Set(sourceRegistry.map((source) => source.sourceType).filter(Boolean))),
  }
  const rawEvidenceObjectSummary = hasEvidenceObjectSummary(discovery?.evidenceObjectSummary)
    ? discovery.evidenceObjectSummary
    : hasEvidenceObjectSummary(evidenceDetail?.evidenceObjectSummary)
      ? evidenceDetail.evidenceObjectSummary
      : hasEvidenceObjectSummary(evidenceDetail?.evidence?.reviewSummary)
        ? evidenceDetail.evidence.reviewSummary
        : {}
  const evidenceObjectSummary = {
    evidenceObjectCount: Number.isFinite(Number(rawEvidenceObjectSummary.evidenceObjectCount))
      ? Number(rawEvidenceObjectSummary.evidenceObjectCount)
      : evidenceObjects.length,
    acceptedEvidenceCount: Number.isFinite(Number(rawEvidenceObjectSummary.acceptedEvidenceCount))
      ? Number(rawEvidenceObjectSummary.acceptedEvidenceCount)
      : evidenceObjects.filter((evidenceObject) => evidenceObject.reviewStatus === 'ACCEPTED').length,
    pendingReviewCount: Number.isFinite(Number(rawEvidenceObjectSummary.pendingReviewCount))
      ? Number(rawEvidenceObjectSummary.pendingReviewCount)
      : evidenceObjects.filter((evidenceObject) => evidenceObject.reviewStatus === 'PENDING').length,
    rejectedEvidenceCount: Number.isFinite(Number(rawEvidenceObjectSummary.rejectedEvidenceCount))
      ? Number(rawEvidenceObjectSummary.rejectedEvidenceCount)
      : evidenceObjects.filter((evidenceObject) => evidenceObject.reviewStatus === 'REJECTED').length,
  }
  const evidenceObjectSummaryText = formatDiscoveryEvidenceObjectSummary(evidenceObjectSummary)
  const sourceRegistrySummaryText = formatSourceRegistrySummary(sourceRegistrySummary)
  const discoveryHealth = hasDiscoveryHealthSummary(discovery?.discoveryHealth)
    ? discovery.discoveryHealth
    : hasDiscoveryHealthSummary(evidenceDetail?.discoveryHealth)
      ? evidenceDetail.discoveryHealth
      : {}
  const healthCoveragePercent = Number.isFinite(Number(discoveryHealth.coveragePercent))
    ? Number(discoveryHealth.coveragePercent)
    : null
  const healthMissingAreas = Array.isArray(discoveryHealth.missingAreas)
    ? discoveryHealth.missingAreas.map(formatRuntimeTokenLabel).filter(Boolean)
    : []
  const discoveryReadiness = discoveryHealth.readiness
    && typeof discoveryHealth.readiness === 'object'
    && !Array.isArray(discoveryHealth.readiness)
    ? discoveryHealth.readiness
    : null
  const discoveryReadinessState = String(discoveryReadiness?.state || '').trim().toUpperCase()
  const discoveryReadinessLabel = discoveryReadinessState
    ? formatRuntimeTokenLabel(discoveryReadinessState)
    : 'Not projected'
  const discoveryReadinessSummary = discoveryReadiness
    ? formatDiscoveryReadinessSummary(discoveryReadiness)
    : 'Discovery readiness is not projected for this runtime yet.'
  const discoveryReadinessCoverage = Number.isFinite(Number(discoveryReadiness?.coveragePercent))
    ? `${Number(discoveryReadiness.coveragePercent)}% coverage`
    : healthCoveragePercent !== null
      ? `${healthCoveragePercent}% coverage`
      : 'Coverage pending'
  const discoveryReadinessContradictionCount = getSummaryCount(discoveryReadiness, 'contradictionCount')
  const signalCandidateRows = Array.isArray(discoveryHealth.signalCandidates)
    ? discoveryHealth.signalCandidates
        .map((signal) => ({
          id: signal?.signalId || `${signal?.domain || 'signal'}-${signal?.signalStrength || 'UNKNOWN'}`,
          domain: formatRuntimeTokenLabel(signal?.domain || ''),
          summary: formatDiscoverySignalSummary(signal),
          signalStrength: signal?.signalStrength || 'UNKNOWN',
        }))
        .filter((signal) => signal.domain && signal.domain !== '--')
        .slice(0, 5)
    : []
  const selectedProfileGuidance = getAcquisitionProfileGuidance(acquisitionProfile)
  const acquisitionEffectiveness = getDiscoveryAcquisitionEffectiveness({ discovery, evidenceDetail })
  const acquisitionEffectivenessMetrics = acquisitionEffectiveness.metrics
    && typeof acquisitionEffectiveness.metrics === 'object'
    && !Array.isArray(acquisitionEffectiveness.metrics)
    ? acquisitionEffectiveness.metrics
    : {}
  const acquisitionEffectivenessMissingInputs = Array.isArray(acquisitionEffectiveness.missingRecommendedInputs)
    ? acquisitionEffectiveness.missingRecommendedInputs.map(formatRuntimeTokenLabel).filter(Boolean)
    : []
  const acquisitionEffectivenessMissingDomains = Array.isArray(acquisitionEffectiveness.missingDomains)
    ? acquisitionEffectiveness.missingDomains.map(formatRuntimeTokenLabel).filter(Boolean)
    : []
  const acquisitionEffectivenessCoverage = Number.isFinite(Number(acquisitionEffectivenessMetrics.coveragePercent))
    ? Number(acquisitionEffectivenessMetrics.coveragePercent)
    : healthCoveragePercent
  const acquisitionEffectivenessQuality = String(acquisitionEffectiveness.qualityLabel || '').trim()
  const acquisitionEffectivenessReadiness = String(acquisitionEffectivenessMetrics.readinessState || '').trim().toUpperCase()
  const acquisitionEffectivenessProfileLabel = acquisitionEffectiveness.label || getDiscoveryAcquisitionLabel(
    acquisitionEffectiveness.profile || persistedAcquisitionProfile,
  )
  const intelligenceGraph = hasIntelligenceGraphSummary(discovery?.intelligenceGraph)
    ? discovery.intelligenceGraph
    : {}
  const graphAvailable = intelligenceGraph.available === true
  const graphBuild = intelligenceGraph.build && typeof intelligenceGraph.build === 'object'
    ? intelligenceGraph.build
    : {}
  const graphHealth = intelligenceGraph.health && typeof intelligenceGraph.health === 'object'
    ? intelligenceGraph.health
    : {}
  const graphCoverage = intelligenceGraph.coverage && typeof intelligenceGraph.coverage === 'object'
    ? intelligenceGraph.coverage
    : {}
  const graphDependencies = intelligenceGraph.dependencies && typeof intelligenceGraph.dependencies === 'object'
    ? intelligenceGraph.dependencies
    : {}
  const graphQuality = intelligenceGraph.quality && typeof intelligenceGraph.quality === 'object'
    ? intelligenceGraph.quality
    : {}
  const graphMissingAreas = Array.isArray(intelligenceGraph.missingAreas)
    ? intelligenceGraph.missingAreas.map(formatRuntimeTokenLabel).filter(Boolean)
    : Array.isArray(graphCoverage.missingDomains)
      ? graphCoverage.missingDomains.map(formatRuntimeTokenLabel).filter(Boolean)
      : []
  const sourceCount = sourceRegistrySummary.count || Number(discovery?.lineageSummary?.sourceCount || 0)
  const builderMode = String(discovery?.lineageSummary?.builderMode || '').trim()
  const discoveryResetSummary = getDiscoveryResetSummary({ activity, discovery })
  const discoveryResetAtLabel = discoveryResetSummary?.resetAt
    ? formatActivityTime(discoveryResetSummary.resetAt) || formatDateOnly(discoveryResetSummary.resetAt)
    : ''
  const discoveryResetClearedText = discoveryResetSummary
    && Number.isFinite(Number(discoveryResetSummary.clearedSectionTruthCount))
    ? `${formatResetCount(discoveryResetSummary.clearedSectionTruthCount, 'section truth', 'section truths')} cleared.`
    : ''
  const acquisition = discovery?.acquisition && typeof discovery.acquisition === 'object'
    ? discovery.acquisition
    : null
  const coverage = acquisition?.coverage && typeof acquisition.coverage === 'object'
    ? acquisition.coverage
    : null
  const coverageScore = Number.isFinite(Number(coverage?.score)) ? Number(coverage.score) : null
  const hasPersistedEvidenceProfile = discovery?.evidenceReady === true
    || Number(discovery?.evidenceSummary?.count || 0) > 0
    || Boolean(discovery?.acceptedAt)
  const acquisitionLabel = hasPersistedEvidenceProfile
    ? getDiscoveryAcquisitionLabel(persistedAcquisitionProfile)
    : getDiscoveryAcquisitionLabel(acquisitionProfile)
  const lineageSources = Array.isArray(evidenceDetail?.lineage?.sources)
    ? evidenceDetail.lineage.sources
    : []
  const isAccepted = discovery?.accepted === true
  const needsRefresh = discovery?.needsRefresh === true
  const hasEvidence = discovery?.evidenceReady === true || Boolean(evidenceSummary)
  const buildActionKey = hasEvidence
    ? DISCOVERY_ACTION_KEYS.REFRESH_EVIDENCE_PACK
    : DISCOVERY_ACTION_KEYS.BUILD_EVIDENCE_PACK
  const buildAction = discoveryActions[buildActionKey]
    || discoveryActions[DISCOVERY_ACTION_KEYS.SAVE_DISCOVERY_INPUTS]
    || null
  const acceptAction = discoveryActions[DISCOVERY_ACTION_KEYS.ACCEPT_EVIDENCE] || null
  const buildButtonLabel = hasEvidence ? 'Refresh Evidence Pack' : 'Build Evidence Pack'
  const documentBuildDisabledReason = documentUploadPreparing
    ? 'Wait for selected documents to finish preparing before refreshing evidence.'
    : documentUploadError
  const buildDisabledReason = mutationDisabledReason
    || documentBuildDisabledReason
    || (buildAction && !buildAction.enabled
      ? buildAction.disabledReason || `${INTELLIGENCE_HUB_EVIDENCE_LABEL} action is currently unavailable.`
      : '')
  const buildReasonId = 'discovery-build-disabled-reason'
  const sourcesReasonId = 'discovery-sources-disabled-reason'
  const sourcesDisabledReason = hasEvidence ? '' : 'Build an evidence pack before viewing sources.'
  const canAcceptDiscovery = discovery?.inputComplete === true
    && discovery?.evidenceReady === true
    && !isAccepted
    && !needsRefresh
    && !isInspectionMode
    && !disabled
    && !mutationDisabledReason
    && (!acceptAction || acceptAction.enabled)
  const acceptDisabledReason = mutationDisabledReason
    || (acceptAction && !acceptAction.enabled
      ? acceptAction.disabledReason || 'Evidence acceptance is currently unavailable.'
      : '')
  const acceptReasonId = 'discovery-accept-disabled-reason'
  const buildExecutingActionKey = normalizeRuntimeActionToken(buildAction?.governedAction || buildAction?.actionKey)
  const acceptExecutingActionKey = normalizeRuntimeActionToken(acceptAction?.governedAction || acceptAction?.actionKey)
  const isBuildExecuting = Boolean(buildExecutingActionKey && executingActionKey === buildExecutingActionKey)
  const isAcceptExecuting = Boolean(acceptExecutingActionKey && executingActionKey === acceptExecutingActionKey)
  const showDiscoveryDocumentUploadButton = draftDocumentSources.length > 0
    && !documentUploadError
    && !documentUploadPreparing
    && !isInspectionMode
    && !disabled
    && !buildDisabledReason
  const evidenceReviewInFlight = Boolean(reviewingEvidenceObjectId)
  const hasPersistedDiscoveryStateToReset = hasEvidence
    || isAccepted
    || sourceCount > 0
    || inputSummaryKeys.length > 0
  const hasLocalDiscoveryDraftToClear = draftDocumentSources.length > 0
    || Object.values(draftInputs).some((value) => {
      if (Array.isArray(value)) return value.some((item) => String(item || '').trim())
      return String(value || '').trim()
    })
  const hasDiscoveryStateToReset = hasPersistedDiscoveryStateToReset || hasLocalDiscoveryDraftToClear
  const canResetDiscovery = hasDiscoveryStateToReset
    && !isInspectionMode
    && !disabled
    && !mutationDisabledReason
    && !saving
    && !documentUploadPreparing
    && !evidenceReviewInFlight
  const resetDisabledReason = mutationDisabledReason
    || (hasDiscoveryStateToReset ? '' : `There is no ${INTELLIGENCE_HUB_EVIDENCE_LABEL} or input to clear.`)
  const resetReasonId = 'discovery-reset-disabled-reason'

  const handleInputChange = (field) => (event) => {
    setDraftInputs((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleWebsiteSourceChange = (index) => (event) => {
    const value = event.target.value
    setDraftInputs((current) => {
      const currentWebsiteSources = Array.isArray(current.websiteSources) && current.websiteSources.length > 0
        ? current.websiteSources
        : ['']
      const websiteSources = currentWebsiteSources.map((source, sourceIndex) =>
        sourceIndex === index ? value : source)
      const firstWebsiteSource = websiteSources.map((source) => String(source || '').trim()).find(Boolean) || ''
      return {
        ...current,
        companyWebsite: firstWebsiteSource,
        websiteSources,
      }
    })
  }

  const handleAddWebsiteSource = () => {
    setDraftInputs((current) => {
      const currentWebsiteSources = Array.isArray(current.websiteSources) && current.websiteSources.length > 0
        ? current.websiteSources
        : ['']
      if (currentWebsiteSources.length >= DISCOVERY_WEBSITE_SOURCE_MAX_COUNT) return current
      return {
        ...current,
        websiteSources: [...currentWebsiteSources, ''],
      }
    })
  }

  const handleRemoveWebsiteSource = (index) => () => {
    setDraftInputs((current) => {
      const currentWebsiteSources = Array.isArray(current.websiteSources) && current.websiteSources.length > 0
        ? current.websiteSources
        : ['']
      const websiteSources = currentWebsiteSources.filter((_source, sourceIndex) => sourceIndex !== index)
      const nextWebsiteSources = websiteSources.length > 0 ? websiteSources : ['']
      const firstWebsiteSource = nextWebsiteSources.map((source) => String(source || '').trim()).find(Boolean) || ''
      return {
        ...current,
        companyWebsite: firstWebsiteSource,
        websiteSources: nextWebsiteSources,
      }
    })
  }

  const handleAcquisitionProfileChange = (event) => {
    setAcquisitionProfile(event.target.value)
  }

  const handleDocumentUploadChange = async (event) => {
    const files = Array.from(event.target.files || [])
    documentUploadPreparingRef.current = true
    setDocumentUploadPreparing(true)
    setDocumentUploadError('')

    try {
      if (files.length === 0) {
        setDraftDocumentSources([])
        return
      }

      if (files.length > DISCOVERY_DOCUMENT_MAX_COUNT) {
        setDraftDocumentSources([])
        setDocumentUploadError(`Select ${DISCOVERY_DOCUMENT_MAX_COUNT} documents or fewer.`)
        return
      }

      const documentSources = await Promise.all(files.map(buildDiscoveryDocumentSource))
      setDraftDocumentSources(documentSources)
    } catch (err) {
      setDraftDocumentSources([])
      setDocumentUploadError(err?.message || 'One or more documents could not be prepared for extraction.')
    } finally {
      documentUploadPreparingRef.current = false
      setDocumentUploadPreparing(false)
    }
  }

  const handleClearDiscoveryDocuments = () => {
    setDraftDocumentSources([])
    setDocumentUploadError('')
    if (discoveryDocumentInputRef.current) {
      discoveryDocumentInputRef.current.value = ''
    }
  }

  const handleRefreshEvidence = async (event) => {
    event.preventDefault()
    if (isInspectionMode) return false
    if (documentUploadPreparingRef.current || documentUploadPreparing) {
      setDocumentUploadError('Wait for selected documents to finish preparing before refreshing evidence.')
      return false
    }
    if (documentUploadError) return false

    const refreshed = await onRefreshEvidence?.({
      acquisitionProfile,
      documentSources: draftDocumentSources.length > 0 ? draftDocumentSources : undefined,
      inputs: buildDiscoveryInputsPayload(draftInputs),
    })
    if (refreshed) {
      setDraftDocumentSources([])
      setDocumentUploadError('')
      if (discoveryDocumentInputRef.current) {
        discoveryDocumentInputRef.current.value = ''
      }
    }
  }

  const handleAcceptDiscovery = async () => {
    if (isInspectionMode) return
    await onAcceptDiscovery?.()
  }

  const clearLocalDiscoveryDraft = () => {
    setDraftInputs(buildEmptyDiscoveryDraftInputs())
    setDraftDocumentSources([])
    setDocumentUploadError('')
    setAcquisitionProfile(DISCOVERY_ACQUISITION_PROFILES.STANDARD)
    setShowResetWarning(false)
  }

  const handleClearDiscoveryClick = () => {
    if (isInspectionMode) return
    if (hasPersistedDiscoveryStateToReset) {
      setShowResetWarning(true)
      return
    }

    clearLocalDiscoveryDraft()
  }

  const handleResetDiscovery = async () => {
    if (isInspectionMode) return
    const reset = await onResetDiscovery?.()
    if (reset) {
      clearLocalDiscoveryDraft()
    }
  }

  const handleReviewEvidenceObject = (evidenceObject, reviewStatus) => async () => {
    if (isInspectionMode) return
    await onReviewEvidenceObject?.({
      evidenceObjectId: evidenceObject.evidenceObjectId,
      reviewStatus,
    })
  }

  const handleToggleSourcesClick = () => {
    setActiveIntelligenceHubTab(INTELLIGENCE_HUB_TAB_INDEXES.SOURCES)
    onToggleSources?.()
  }

  const recentSourceEntries = sourceRegistryGroups
    .flatMap((group) => group.entries.map((source) => ({
      groupKey: group.key,
      groupLabel: group.label,
      source,
    })))
    .slice(0, 3)
  const coverageAreaRows = Array.isArray(discoveryHealth.coverageAreas)
    ? discoveryHealth.coverageAreas
        .map((area) => {
          const evidenceCount = Number.isFinite(Number(area?.evidenceCount)) ? Number(area.evidenceCount) : 0
          const acceptedEvidenceCount = Number.isFinite(Number(area?.acceptedEvidenceCount))
            ? Number(area.acceptedEvidenceCount)
            : 0
          return {
            areaLabel: formatRuntimeTokenLabel(area?.area || ''),
            evidenceCount,
            acceptedEvidenceCount,
            progressValue: getCoverageAreaProgressValue({ acceptedEvidenceCount, evidenceCount }),
            progressText: getCoverageAreaProgressText({ acceptedEvidenceCount, evidenceCount }),
            state: area?.state,
            stateMeta: getCoverageAreaStateMeta(area?.state),
          }
        })
        .filter((area) => area.areaLabel && area.areaLabel !== '--')
    : []
  const graphCoverageDomainRows = Array.isArray(graphCoverage.domains)
    ? graphCoverage.domains
        .map((domain) => {
          const connectedEvidenceCount = Number.isFinite(Number(domain?.connectedEvidenceCount))
            ? Number(domain.connectedEvidenceCount)
            : 0
          const acceptedEvidenceCount = Number.isFinite(Number(domain?.acceptedEvidenceCount))
            ? Number(domain.acceptedEvidenceCount)
            : 0
          const pendingEvidenceCount = Number.isFinite(Number(domain?.pendingEvidenceCount))
            ? Number(domain.pendingEvidenceCount)
            : 0
          const lowQualityEvidenceCount = Number.isFinite(Number(domain?.lowQualityEvidenceCount))
            ? Number(domain.lowQualityEvidenceCount)
            : 0
          const rejectedEvidenceCount = Number.isFinite(Number(domain?.rejectedEvidenceCount))
            ? Number(domain.rejectedEvidenceCount)
            : 0
          const evidenceCount = acceptedEvidenceCount + pendingEvidenceCount + lowQualityEvidenceCount + rejectedEvidenceCount
          const progressValue = evidenceCount > 0
            ? Math.max(0, Math.min(100, Math.round((connectedEvidenceCount / evidenceCount) * 100)))
            : 0
          return {
            areaLabel: formatRuntimeTokenLabel(domain?.domain || ''),
            connectedEvidenceCount,
            evidenceCount,
            progressValue,
            progressText: evidenceCount > 0
              ? `${connectedEvidenceCount} connected of ${evidenceCount} evidence object${evidenceCount === 1 ? '' : 's'}`
              : 'No connected evidence objects',
            state: domain?.state,
            stateMeta: getCoverageAreaStateMeta(domain?.state),
          }
        })
        .filter((domain) => domain.areaLabel && domain.areaLabel !== '--')
    : []
  const intelligenceLastUpdatedAt = discoveryHealth.lastAcquisitionDate || discovery?.acceptedAt || discovery?.updatedAt || ''
  const intelligenceLastUpdatedParts = formatDateTimeParts(intelligenceLastUpdatedAt)
  const intelligenceLastUpdatedLabel = intelligenceLastUpdatedAt
    ? formatActivityTime(intelligenceLastUpdatedAt) || formatDateOnly(intelligenceLastUpdatedAt)
    : ''
  const coverageMetricValue = healthCoveragePercent !== null
    ? `${healthCoveragePercent}%`
    : coverageScore !== null
      ? `${coverageScore}%`
      : 'Not projected'
  const coverageMetricSummary = healthCoveragePercent !== null
    ? 'Overall coverage.'
    : 'Coverage pending.'
  const sourceLineageValue = sourceCount > 0 ? String(sourceCount) : '0'
  const sourceMetricSummary = sourceCount > 0
    ? `${sourceCount} source${sourceCount === 1 ? '' : 's'} recorded.`
    : 'No sources yet.'
  const evidenceMetricSummary = evidenceObjectSummary.evidenceObjectCount > 0
    ? `${evidenceObjectSummary.evidenceObjectCount} total extracted.`
    : 'No evidence yet.'
  const acceptedEvidenceMetricSummary = evidenceObjectSummary.acceptedEvidenceCount > 0
    ? `${evidenceObjectSummary.acceptedEvidenceCount} accepted by user.`
    : 'Awaiting review.'
  const sourceLineageMetricSummary = sourceCount > 0
    ? `${sourceCount} source path${sourceCount === 1 ? '' : 's'}.`
    : 'No source paths yet.'
  const evidenceAcceptanceSummaryRows = [
    {
      id: 'accepted-evidence',
      icon: MdFactCheck,
      label: 'Evidence',
      value: evidenceObjectSummary.acceptedEvidenceCount,
      detail: 'Accepted objects',
    },
    {
      id: 'source-lineage',
      icon: MdSource,
      label: 'Sources',
      value: sourceCount,
      detail: 'Contributing',
    },
    ...(scopedViewKeys.length > 0
      ? [{
        id: 'scoped-views',
        icon: MdAccountTree,
        label: 'Section views',
        value: scopedViewKeys.length,
        detail: 'Projected',
      }]
      : []),
    ...(intelligenceLastUpdatedLabel
      ? [{
        id: 'last-updated',
        icon: MdOutlineHistory,
        label: 'Updated',
        value: intelligenceLastUpdatedParts?.dateLabel || intelligenceLastUpdatedLabel,
        detail: intelligenceLastUpdatedParts?.timeLabel || 'Latest intelligence refresh',
      }]
      : []),
  ]
  const evidencePackRows = [
    {
      id: 'evidence-acquisition',
      icon: MdDonutLarge,
      title: acquisitionLabel,
      meta: coverageScore !== null ? `Coverage ${coverageScore}%` : 'Coverage is not projected yet.',
      badgeLabel: coverageScore !== null ? `${coverageScore}%` : '',
      badgeVariant: coverageScore !== null ? 'info' : 'neutral',
    },
    {
      id: 'evidence-objects',
      icon: MdInventory2,
      title: hasEvidence
        ? `${evidenceObjectSummary.evidenceObjectCount} evidence object${evidenceObjectSummary.evidenceObjectCount === 1 ? '' : 's'}`
        : `No ${INTELLIGENCE_HUB_LABEL} evidence objects`,
      meta: hasEvidence
        ? evidenceObjectSummaryText || evidenceSummary || `${INTELLIGENCE_HUB_EVIDENCE_LABEL} is ready for governed downstream use.`
        : `No ${INTELLIGENCE_HUB_LABEL} evidence pack is projected for this runtime yet.`,
      badgeLabel: hasEvidence ? `${evidenceObjectSummary.acceptedEvidenceCount} accepted` : 'Pending',
      badgeVariant: hasEvidence ? 'success' : 'warning',
    },
    {
      id: 'evidence-source-lineage',
      icon: MdSource,
      title: sourceCount > 0
        ? `${sourceCount} source${sourceCount === 1 ? '' : 's'} recorded`
        : 'No source lineage',
      meta: sourceCount > 0
        ? builderMode
          ? `Recorded via ${formatRuntimeTokenLabel(builderMode)}.`
          : 'Source lineage is recorded for this runtime.'
        : 'No source lineage is recorded for this runtime yet.',
      badgeLabel: builderMode ? formatRuntimeTokenLabel(builderMode) : '',
      badgeVariant: sourceCount > 0 ? 'info' : 'neutral',
    },
  ]
  const evidenceReviewRows = [
    {
      id: 'evidence-review-summary',
      icon: MdFactCheck,
      title: evidenceObjectSummaryText || 'No reviewable evidence objects',
      meta: evidenceObjectSummaryText
        ? 'Review state is projected from governed evidence objects.'
        : 'No reviewable evidence objects are projected for this runtime yet.',
      badgeLabel: evidenceObjectSummary.pendingReviewCount > 0
        ? `${evidenceObjectSummary.pendingReviewCount} pending`
        : evidenceObjectSummary.acceptedEvidenceCount > 0
          ? `${evidenceObjectSummary.acceptedEvidenceCount} accepted`
          : '',
      badgeVariant: evidenceObjectSummary.pendingReviewCount > 0 ? 'warning' : 'success',
    },
  ]
  const coverageHealthRows = [
    {
      id: 'coverage-health-score',
      icon: MdDonutLarge,
      title: healthCoveragePercent !== null
        ? `Coverage ${healthCoveragePercent}%`
        : `${INTELLIGENCE_HUB_LABEL} health is not projected`,
      meta: healthCoveragePercent !== null
        ? `${formatRuntimeTokenLabel(discoveryHealth.confidence || 'UNKNOWN')} confidence.`
        : `${INTELLIGENCE_HUB_LABEL} health is not projected for this runtime yet.`,
      badgeLabel: healthCoveragePercent !== null ? `${healthCoveragePercent}%` : '',
      badgeVariant: healthCoveragePercent !== null ? 'info' : 'neutral',
    },
    {
      id: 'coverage-health-missing',
      icon: healthMissingAreas.length > 0 ? MdOutlineWarningAmber : MdCheckCircle,
      iconVariant: healthMissingAreas.length > 0 ? 'warning' : 'success',
      title: healthMissingAreas.length > 0 ? 'Missing areas' : 'No missing areas',
      meta: healthMissingAreas.length > 0
        ? healthMissingAreas.join(', ')
        : 'No missing areas are currently projected.',
      badgeLabel: healthMissingAreas.length > 0 ? `${healthMissingAreas.length} missing` : 'Clear',
      badgeVariant: healthMissingAreas.length > 0 ? 'warning' : 'success',
    },
  ]
  const acquisitionQualityRows = [
    {
      id: 'acquisition-quality-profile',
      icon: MdBolt,
      title: `${acquisitionEffectivenessProfileLabel} effectiveness`,
      meta: acquisitionEffectivenessQuality
        ? `${acquisitionEffectivenessQuality} acquisition quality.`
        : 'Acquisition quality is measured after evidence is built.',
      badgeLabel: acquisitionEffectivenessQuality || 'Pending',
      badgeVariant: acquisitionEffectivenessQuality === 'Strong' || acquisitionEffectivenessQuality === 'Good'
        ? 'success'
        : acquisitionEffectivenessQuality === 'Developing'
          ? 'info'
          : acquisitionEffectivenessQuality === 'Limited'
            ? 'warning'
            : 'neutral',
    },
    {
      id: 'acquisition-quality-metrics',
      icon: MdFactCheck,
      title: acquisitionEffectivenessCoverage !== null && acquisitionEffectivenessCoverage !== undefined
        ? `Coverage ${acquisitionEffectivenessCoverage}%`
        : 'Coverage not projected',
      meta: `${getSummaryCount(acquisitionEffectivenessMetrics, 'sourceCount')} sources / ${
        getSummaryCount(acquisitionEffectivenessMetrics, 'evidenceObjectCount')
      } evidence objects / ${formatRuntimeTokenLabel(acquisitionEffectivenessMetrics.confidence || 'UNKNOWN')} confidence.`,
      badgeLabel: acquisitionEffectivenessReadiness
        ? formatRuntimeTokenLabel(acquisitionEffectivenessReadiness)
        : '',
      badgeVariant: getTokenStatusVariant(acquisitionEffectivenessReadiness),
    },
    {
      id: 'acquisition-quality-missing-inputs',
      icon: acquisitionEffectivenessMissingInputs.length > 0 ? MdOutlineWarningAmber : MdCheckCircle,
      iconVariant: acquisitionEffectivenessMissingInputs.length > 0 ? 'warning' : 'success',
      title: acquisitionEffectivenessMissingInputs.length > 0
        ? 'Recommended next input'
        : 'Recommended inputs covered',
      meta: acquisitionEffectivenessMissingInputs.length > 0
        ? formatInputRecommendationList(acquisitionEffectivenessMissingInputs, 5)
        : 'No recommended input gap is projected for this evidence pack.',
      badgeLabel: acquisitionEffectivenessMissingInputs.length > 0
        ? `${acquisitionEffectivenessMissingInputs.length} missing`
        : 'Clear',
      badgeVariant: acquisitionEffectivenessMissingInputs.length > 0 ? 'warning' : 'success',
    },
    ...(acquisitionEffectivenessMissingDomains.length > 0
      ? [{
        id: 'acquisition-quality-missing-domains',
        icon: MdOutlineWarningAmber,
        iconVariant: 'warning',
        title: 'Missing domains',
        meta: formatInputRecommendationList(acquisitionEffectivenessMissingDomains, 5),
        badgeLabel: `${acquisitionEffectivenessMissingDomains.length} missing`,
        badgeVariant: 'warning',
      }]
      : []),
  ]
  const graphHealthRows = [
    {
      id: 'graph-health-state',
      icon: graphAvailable && graphHealth.state === 'HEALTHY' ? MdCheckCircle : MdOutlineWarningAmber,
      iconVariant: graphAvailable && graphHealth.state === 'HEALTHY' ? 'success' : 'warning',
      title: graphAvailable ? `Graph ${formatRuntimeTokenLabel(graphHealth.state || 'UNKNOWN')}` : 'Graph not built yet',
      meta: graphAvailable
        ? `${Number(graphBuild.nodeCount || 0)} nodes / ${Number(graphBuild.edgeCount || 0)} relationships.`
        : 'The Intelligence Graph has not been projected for this runtime yet.',
      badgeLabel: graphAvailable ? formatRuntimeTokenLabel(graphBuild.status || 'UNKNOWN') : 'Unavailable',
      badgeVariant: graphAvailable ? (graphHealth.state === 'HEALTHY' ? 'success' : 'warning') : 'neutral',
    },
    {
      id: 'graph-health-quality',
      icon: MdFactCheck,
      title: 'Evidence Quality',
      meta: graphAvailable
        ? `${Number(graphQuality.orphanEvidenceCount || 0)} orphan, ${
          Number(graphQuality.lowQualityEvidenceCount || 0)
        } low quality, ${Number(graphQuality.unclassifiedEvidenceCount || 0)} unclassified.`
        : 'Evidence quality states will appear after the graph is rebuilt.',
      badgeLabel: graphAvailable ? `${Number(graphHealth.acceptedEvidenceCount || 0)} accepted` : '',
      badgeVariant: graphAvailable ? 'info' : 'neutral',
    },
    {
      id: 'graph-health-coverage',
      icon: MdDonutLarge,
      title: graphAvailable ? `Domain coverage ${Number(graphCoverage.coveragePercent || 0)}%` : 'Domain coverage unavailable',
      meta: graphAvailable
        ? `${Number(graphCoverage.coveredDomainCount || 0)} of ${Number(graphCoverage.totalDomainCount || 0)} domains connected.`
        : 'Evidence Domain Coverage is not projected yet.',
      badgeLabel: graphAvailable ? `${Number(graphCoverage.coveragePercent || 0)}%` : '',
      badgeVariant: graphAvailable ? 'info' : 'neutral',
    },
  ]
  const graphDependencyRows = [
    {
      id: 'graph-section-dependencies',
      icon: MdAccountTree,
      title: graphAvailable
        ? `${Number(graphDependencies.sectionDependencyCount || 0)} section dependenc${
          Number(graphDependencies.sectionDependencyCount || 0) === 1 ? 'y' : 'ies'
        }`
        : 'Dependencies unavailable',
      meta: graphAvailable
        ? Number(graphDependencies.missingDependencyTruthCount || 0) > 0
          ? `${Number(graphDependencies.missingDependencyTruthCount || 0)} dependencies are missing accepted truth.`
          : 'No missing dependency truth is projected.'
        : 'Section dependency relationships will appear after the graph is rebuilt.',
      badgeLabel: graphAvailable && Number(graphDependencies.missingDependencyTruthCount || 0) > 0
        ? `${Number(graphDependencies.missingDependencyTruthCount || 0)} missing`
        : graphAvailable
          ? 'Clear'
          : '',
      badgeVariant: graphAvailable
        ? Number(graphDependencies.missingDependencyTruthCount || 0) > 0 ? 'warning' : 'success'
        : 'neutral',
    },
  ]
  const graphMissingAreaRows = [
    {
      id: 'graph-missing-areas',
      icon: graphMissingAreas.length > 0 ? MdOutlineWarningAmber : MdCheckCircle,
      iconVariant: graphMissingAreas.length > 0 ? 'warning' : 'success',
      title: graphAvailable
        ? graphMissingAreas.length > 0
          ? 'Missing domains'
          : 'No missing domains'
        : 'Missing domains unavailable',
      meta: graphAvailable
        ? graphMissingAreas.length > 0
          ? graphMissingAreas.join(', ')
          : 'All graph coverage domains are currently connected.'
        : 'Missing domain analysis will appear after the graph is rebuilt.',
      badgeLabel: graphAvailable
        ? graphMissingAreas.length > 0
          ? `${graphMissingAreas.length} missing`
          : 'Clear'
        : '',
      badgeVariant: graphMissingAreas.length > 0 ? 'warning' : 'success',
    },
  ]
  const scopedEvidenceRows = [
    {
      id: 'scoped-evidence-views',
      icon: MdAccountTree,
      title: scopedViewKeys.length > 0
        ? `${scopedViewKeys.length} section-scoped evidence view${scopedViewKeys.length === 1 ? '' : 's'}`
        : 'No scoped evidence views',
      meta: scopedViewKeys.length > 0
        ? 'Projected for guided sections.'
        : 'Section-scoped evidence will appear here when the backend projects it.',
      badgeLabel: scopedViewKeys.length > 0 ? `${scopedViewKeys.length} projected` : '',
      badgeVariant: scopedViewKeys.length > 0 ? 'info' : 'neutral',
    },
  ]
  const acceptanceRows = [
    {
      id: 'intelligence-acceptance',
      icon: isAccepted ? MdCheckCircle : MdOutlineWarningAmber,
      iconVariant: isAccepted ? 'success' : 'warning',
      title: isAccepted ? `${INTELLIGENCE_HUB_LABEL} accepted` : `${INTELLIGENCE_HUB_LABEL} not accepted`,
      meta: isAccepted
        ? discovery?.acceptedAt
          ? `Accepted on ${formatDateOnly(discovery.acceptedAt)}.`
          : 'Accepted for governed downstream generation.'
        : `${INTELLIGENCE_HUB_LABEL} has not been accepted for governed downstream generation.`,
      badgeLabel: isAccepted ? 'Accepted' : 'Pending',
      badgeVariant: isAccepted ? 'success' : 'warning',
    },
  ]
  const resetHistoryRows = discoveryResetSummary
    ? [
        {
          id: 'reset-history-last-reset',
          icon: MdOutlineHistory,
          title: `Last reset${discoveryResetAtLabel ? ` ${discoveryResetAtLabel}` : ''}`,
          meta: discoveryResetSummary.resetBy ? `Reset by ${discoveryResetSummary.resetBy}.` : 'Reset actor was not projected.',
          badgeLabel: 'Audit',
          badgeVariant: 'info',
        },
        {
          id: 'reset-history-previous-evidence',
          icon: MdInventory2,
          title: 'Previous evidence state',
          meta: formatDiscoveryResetPreviousEvidence(discoveryResetSummary.previousEvidenceSummary),
        },
        ...(discoveryResetClearedText
          ? [{
            id: 'reset-history-cleared-state',
            icon: MdDelete,
            iconVariant: 'warning',
            title: 'Cleared state',
            meta: discoveryResetClearedText,
            badgeLabel: 'Reset',
            badgeVariant: 'warning',
          }]
          : []),
      ]
    : EMPTY_ARRAY

  return (
    <Card variant="default" className="runtime-workspace__section-card">
      <Card.Body className="runtime-workspace__section-body">
        <form className="runtime-workspace__section-form" onSubmit={handleRefreshEvidence}>
          <div className="runtime-workspace__section-heading">
            <div>
              <h2>{INTELLIGENCE_HUB_LABEL}</h2>
              <p>Section 0 evidence layer for downstream guided execution.</p>
            </div>
            <div className="runtime-workspace__section-badges">
              <Badge variant="info" size="sm" pill outline>Section 0</Badge>
              {isInspectionMode ? (
                <Badge variant="success" size="sm" pill outline>Locked Inspection Mode</Badge>
              ) : null}
              <Badge variant="neutral" size="sm" pill outline>{discoveryState}</Badge>
            </div>
          </div>
          {isInspectionMode ? (
            <Status variant="success" size="sm" showIcon>
              Locked runtime truth is frozen for inspection. Create a revision before changing discovery evidence or section truth.
            </Status>
          ) : null}
          <TabView
            activeTab={activeIntelligenceHubTab}
            onTabChange={setActiveIntelligenceHubTab}
            variant="default"
            size="sm"
            className="runtime-workspace__intelligence-tabs"
            aria-label={`${INTELLIGENCE_HUB_LABEL} sections`}
          >
            <TabView.Tab label="Overview">
              <div className="runtime-workspace__intelligence-tab-panel">
                <div className="runtime-workspace__intelligence-overview-grid">
                  <section
                    className="runtime-workspace__section-panel runtime-workspace__intelligence-metric"
                    aria-label="Acquisition sources"
                  >
                    <div className="runtime-workspace__intelligence-metric-copy">
                      <h3>{renderStackedMetricHeading('Acquisition Sources')}</h3>
                      <p className="runtime-workspace__intelligence-metric-value">{sourceCount}</p>
                      <p className="runtime-workspace__section-note">{sourceMetricSummary}</p>
                    </div>
                    <span className="runtime-workspace__intelligence-metric-icon" aria-hidden="true">
                      <MdSource />
                    </span>
                  </section>
                  <section
                    className="runtime-workspace__section-panel runtime-workspace__intelligence-metric"
                    aria-label="Evidence objects"
                  >
                    <div className="runtime-workspace__intelligence-metric-copy">
                      <h3>{renderStackedMetricHeading('Evidence Objects')}</h3>
                      <p className="runtime-workspace__intelligence-metric-value">
                        {evidenceObjectSummary.evidenceObjectCount}
                      </p>
                      <p className="runtime-workspace__section-note">{evidenceMetricSummary}</p>
                    </div>
                    <span className="runtime-workspace__intelligence-metric-icon" aria-hidden="true">
                      <MdInventory2 />
                    </span>
                  </section>
                  <section
                    className="runtime-workspace__section-panel runtime-workspace__intelligence-metric"
                    aria-label="Accepted evidence"
                  >
                    <div className="runtime-workspace__intelligence-metric-copy">
                      <h3>{renderStackedMetricHeading('Accepted Evidence')}</h3>
                      <p className="runtime-workspace__intelligence-metric-value">
                        {evidenceObjectSummary.acceptedEvidenceCount}
                      </p>
                      <p className="runtime-workspace__section-note">{acceptedEvidenceMetricSummary}</p>
                    </div>
                    <span className="runtime-workspace__intelligence-metric-icon" aria-hidden="true">
                      <MdFactCheck />
                    </span>
                  </section>
                  <section
                    className="runtime-workspace__section-panel runtime-workspace__intelligence-metric"
                    aria-label="Coverage score"
                  >
                    <div className="runtime-workspace__intelligence-metric-copy">
                      <h3>{renderStackedMetricHeading('Coverage Score')}</h3>
                      <p className="runtime-workspace__intelligence-metric-value">{coverageMetricValue}</p>
                      <p className="runtime-workspace__section-note">{coverageMetricSummary}</p>
                    </div>
                    <span className="runtime-workspace__intelligence-metric-icon" aria-hidden="true">
                      <MdDonutLarge />
                    </span>
                  </section>
                  <section
                    className="runtime-workspace__section-panel runtime-workspace__intelligence-metric"
                    aria-label="Source lineage"
                  >
                    <div className="runtime-workspace__intelligence-metric-copy">
                      <h3>{renderStackedMetricHeading('Lineage Paths')}</h3>
                      <p className="runtime-workspace__intelligence-metric-value">{sourceLineageValue}</p>
                      <p className="runtime-workspace__section-note">{sourceLineageMetricSummary}</p>
                    </div>
                    <span className="runtime-workspace__intelligence-metric-icon" aria-hidden="true">
                      <MdAccountTree />
                    </span>
                  </section>
                </div>
                <div className="runtime-workspace__section-panels runtime-workspace__intelligence-overview-panels">
                  <section className="runtime-workspace__section-panel" aria-label="Recent sources">
                    <h3>Recent Sources</h3>
                    {recentSourceEntries.length > 0 ? (
                      <ul className="runtime-workspace__intelligence-source-list">
                        {recentSourceEntries.map(({ groupKey, groupLabel, source }) => {
                          const SourceIcon = getSourceRegistryGroupIcon(groupKey)
                          return (
                            <li key={source.sourceId || source.fieldKey || source.lineageRef}>
                              <span
                                className={`runtime-workspace__intelligence-source-icon runtime-workspace__intelligence-source-icon--${groupKey}`}
                                aria-hidden="true"
                              >
                                <SourceIcon />
                              </span>
                              <span className="runtime-workspace__intelligence-source-copy">
                                <strong>{formatSourceRegistryEntryTitle(source)}</strong>
                                <span>{[groupLabel, formatSourceRegistryEntryMeta(source)].filter(Boolean).join(' / ')}</span>
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p>{sourceRegistrySummaryText || 'No recent source registry entries are projected yet.'}</p>
                    )}
                  </section>
                  <section className="runtime-workspace__section-panel" aria-label="Coverage heatmap">
                    <h3>Coverage Heatmap</h3>
                    {coverageAreaRows.length > 0 ? (
                      <ul className="runtime-workspace__coverage-heatmap">
                        {coverageAreaRows.map((area) => {
                          const CoverageStateIcon = area.stateMeta.icon
                          return (
                            <li key={area.areaLabel}>
                              <span className="runtime-workspace__coverage-heatmap-label">{area.areaLabel}</span>
                              <ProgressBar
                                ariaLabel={`${area.areaLabel}: ${area.stateMeta.label}, ${area.progressText}`}
                                ariaValueText={area.progressText}
                                className="runtime-workspace__coverage-heatmap-progress"
                                size="sm"
                                valueTone
                                value={area.progressValue}
                                variant="success"
                              />
                            <span
                              className={`runtime-workspace__coverage-heatmap-state runtime-workspace__coverage-heatmap-state--${area.stateMeta.className}`}
                              style={{ '--runtime-workspace-coverage-icon-color': `color-mix(in srgb, var(--color-success), white ${getProgressBarValueTint(area.progressValue)})` }}
                              aria-label={`${area.areaLabel} coverage status: ${area.stateMeta.description}`}
                              title={area.stateMeta.description}
                            >
                                <CoverageStateIcon aria-hidden="true" focusable="false" />
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <>
                        <p>
                          {healthCoveragePercent !== null
                            ? `Coverage ${healthCoveragePercent}% / ${formatRuntimeTokenLabel(discoveryHealth.confidence || 'UNKNOWN')} confidence.`
                            : `${INTELLIGENCE_HUB_LABEL} health is not projected for this runtime yet.`}
                        </p>
                        <p className="runtime-workspace__section-note">
                          {healthMissingAreas.length > 0
                            ? `Missing areas: ${healthMissingAreas.slice(0, 5).join(', ')}${healthMissingAreas.length > 5 ? `, +${healthMissingAreas.length - 5} more` : ''}.`
                            : 'No missing areas are currently projected.'}
                        </p>
                      </>
                    )}
                  </section>
                  <section
                    className="runtime-workspace__section-panel runtime-workspace__evidence-acceptance-summary"
                    aria-label="Evidence acceptance summary"
                  >
                    <div className="runtime-workspace__evidence-acceptance-summary-header">
                      <div>
                        <h3>Evidence Acceptance Summary</h3>
                        <p className="runtime-workspace__evidence-acceptance-summary-lede">
                          {isAccepted
                            ? 'Accepted evidence is ready for downstream generation.'
                            : `${INTELLIGENCE_HUB_LABEL} evidence is not accepted for downstream generation.`}
                        </p>
                      </div>
                      <Badge
                        variant={isAccepted ? 'success' : 'warning'}
                        size="sm"
                        pill
                        outline
                        icon={isAccepted ? <MdCheckCircle aria-hidden="true" /> : <MdOutlineWarningAmber aria-hidden="true" />}
                      >
                        {isAccepted ? 'Accepted' : 'Pending'}
                      </Badge>
                    </div>
                    <dl className="runtime-workspace__evidence-acceptance-summary-list">
                      {evidenceAcceptanceSummaryRows.map((row) => {
                        const RowIcon = row.icon
                        return (
                          <div className="runtime-workspace__evidence-acceptance-summary-row" key={row.id}>
                            <dt>
                              <span className="runtime-workspace__evidence-acceptance-summary-icon" aria-hidden="true">
                                <RowIcon />
                              </span>
                              <span>
                                <span className="runtime-workspace__evidence-acceptance-summary-label">{row.label}</span>
                                <span className="runtime-workspace__evidence-acceptance-summary-detail">{row.detail}</span>
                              </span>
                            </dt>
                            <dd>{row.value}</dd>
                          </div>
                        )
                      })}
                    </dl>
                  </section>
                </div>
              </div>
            </TabView.Tab>
            <TabView.Tab label="Context">
              <div className="runtime-workspace__section-tab-panel">
                <div className="runtime-workspace__section-panels runtime-workspace__section-panels--intelligence-context">
                  <section
                    className="runtime-workspace__section-panel runtime-workspace__section-panel--discovery-context"
                    aria-label="Runtime-wide context"
                  >
                    <div className="runtime-workspace__inputs-heading">
                      <h3>Runtime-Wide Context</h3>
                      {inputsSummary ? <p>{inputsSummary}</p> : (
                        <p>{INTELLIGENCE_HUB_INPUTS_LABEL} are captured for governed downstream use.</p>
                      )}
                    </div>
                    <div className="runtime-workspace__input-groups">
                      <div className="runtime-workspace__input-group">
                        <div className="runtime-workspace__input-group-heading">
                          <h4>Acquisition</h4>
                        </div>
                        <Select
                          id="runtime-discovery-acquisition-profile"
                          label="Acquisition Profile"
                          value={acquisitionProfile}
                          onChange={handleAcquisitionProfileChange}
                          options={DISCOVERY_ACQUISITION_PROFILE_OPTIONS}
                          disabled={disabled || isInspectionMode}
                        />
                        <section className="runtime-workspace__profile-guidance" aria-label="Acquisition profile guidance">
                          <p>{selectedProfileGuidance.summary}</p>
                          <dl className="runtime-workspace__compact-definition-list">
                            <div>
                              <dt>Minimum recommended</dt>
                              <dd>{formatInputRecommendationList(selectedProfileGuidance.minimumRecommendedInputs)}</dd>
                            </div>
                            <div>
                              <dt>Additional useful</dt>
                              <dd>{formatInputRecommendationList(selectedProfileGuidance.additionalUsefulInputs)}</dd>
                            </div>
                          </dl>
                        </section>
                      </div>
                      <div
                        className="runtime-workspace__input-group runtime-workspace__website-sources"
                        role="group"
                        aria-labelledby="runtime-discovery-website-sources-label"
                      >
                        <div className="runtime-workspace__input-group-heading runtime-workspace__website-sources-heading">
                          <h4 id="runtime-discovery-website-sources-label">Website Sources</h4>
                          {!isInspectionMode ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="runtime-workspace__website-source-control"
                              leftIcon={<MdAdd aria-hidden="true" />}
                              disabled={disabled || (draftInputs.websiteSources || []).length >= DISCOVERY_WEBSITE_SOURCE_MAX_COUNT}
                              onClick={handleAddWebsiteSource}
                            >
                              Add URL
                            </Button>
                          ) : null}
                        </div>
                        <div className="runtime-workspace__website-source-list">
                          {(draftInputs.websiteSources || ['']).map((websiteSource, index) => (
                            <div className="runtime-workspace__website-source-row" key={`website-source-${index}`}>
                              <Input
                                id={`runtime-discovery-website-source-${index}`}
                                label={`Website Source ${index + 1}`}
                                value={websiteSource}
                                onChange={handleWebsiteSourceChange(index)}
                                disabled={disabled || isInspectionMode}
                                helperText={index === 0 ? 'Enter the full URL including https://.' : ''}
                              />
                              {!isInspectionMode ? (
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  className="runtime-workspace__website-source-control"
                                  leftIcon={<MdDelete aria-hidden="true" />}
                                  disabled={disabled || (draftInputs.websiteSources || []).length <= 1}
                                  aria-label={`Remove website source ${index + 1}`}
                                  onClick={handleRemoveWebsiteSource(index)}
                                >
                                  Remove
                                </Button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                  <div className="runtime-workspace__intelligence-context-column">
                    <section
                      className="runtime-workspace__section-panel runtime-workspace__section-panel--discovery-business"
                      aria-label="Runtime business context"
                    >
                      <div className="runtime-workspace__inputs-heading">
                        <h3>Business Context</h3>
                      </div>
                      <div className="runtime-workspace__input-field-grid">
                        <Input
                          id="runtime-discovery-company-name"
                          label="Company Name"
                          value={draftInputs.companyName}
                          onChange={handleInputChange('companyName')}
                          disabled={disabled || isInspectionMode}
                        />
                        <Input
                          id="runtime-discovery-market-region"
                          label="Market / Region"
                          value={draftInputs.marketRegion}
                          onChange={handleInputChange('marketRegion')}
                          disabled={disabled || isInspectionMode}
                        />
                        <Input
                          id="runtime-discovery-target-offer"
                          label="Target Product or Offer"
                          value={draftInputs.targetOffer}
                          onChange={handleInputChange('targetOffer')}
                          disabled={disabled || isInspectionMode}
                          className="runtime-workspace__input-field--wide"
                        />
                        <Textarea
                          id="runtime-discovery-notes"
                          label="Optional Notes"
                          value={draftInputs.notes}
                          onChange={handleInputChange('notes')}
                          disabled={disabled || isInspectionMode}
                          rows={4}
                          className="runtime-workspace__input-field--wide"
                        />
                      </div>
                    </section>
                    <section
                      className="runtime-workspace__section-panel runtime-workspace__section-panel--discovery-documents"
                      aria-label={`${INTELLIGENCE_HUB_LABEL} document context`}
                    >
                      <div className="runtime-workspace__section-evidence-heading">
                        <div>
                          <h3>Source Documents</h3>
                          <p className="runtime-workspace__section-note">
                            <span>{`${sourceCount} source${sourceCount === 1 ? '' : 's'} / ${evidenceObjectSummary.evidenceObjectCount} evidence object${evidenceObjectSummary.evidenceObjectCount === 1 ? '' : 's'}`}</span>
                          </p>
                        </div>
                        <Badge variant={hasEvidence ? 'success' : 'neutral'} size="sm" pill outline>
                          {hasEvidence ? 'Evidence Ready' : 'Not Ready'}
                        </Badge>
                      </div>
                      <div className="runtime-workspace__document-upload">
                        <div className="runtime-workspace__document-upload-field">
                          <div className="runtime-workspace__document-upload-label-row">
                            <span id="runtime-discovery-documents-label" className="runtime-workspace__document-upload-label">
                              Document Sources
                            </span>
                            <DocumentStorageTooltip id="runtime-discovery-documents-storage-note" />
                          </div>
                          {isInspectionMode ? (
                            <Status variant="neutral" size="sm" showIcon>
                              Source documents are frozen for locked runtime inspection.
                            </Status>
                          ) : (
                            <>
                              <input
                                ref={discoveryDocumentInputRef}
                                id="runtime-discovery-documents"
                                type="file"
                                className="runtime-workspace__document-upload-input sr-only"
                                accept={DISCOVERY_DOCUMENT_ACCEPT}
                                multiple
                                onChange={handleDocumentUploadChange}
                                disabled={disabled || saving || draftDocumentSources.length > 0 || documentUploadPreparing}
                                aria-labelledby="runtime-discovery-documents-label"
                                aria-describedby="runtime-discovery-documents-helper"
                              />
                              {draftDocumentSources.length > 0 ? (
                                <Button
                                  type="button"
                                  variant="warning"
                                  size="sm"
                                  className="runtime-workspace__document-upload-cancel"
                                  disabled={saving || isBuildExecuting}
                                  leftIcon={<MdClose aria-hidden="true" />}
                                  onClick={handleClearDiscoveryDocuments}
                                >
                                  Cancel
                                </Button>
                              ) : (
                                <label
                                  htmlFor="runtime-discovery-documents"
                                  className={`btn btn--outline btn--sm runtime-workspace__document-upload-button${
                                    disabled || saving || documentUploadPreparing
                                      ? ' runtime-workspace__document-upload-button--disabled'
                                      : ''
                                  }`}
                                  aria-disabled={disabled || saving || documentUploadPreparing}
                                >
                                  <MdUploadFile aria-hidden="true" />
                                  Select Files
                                </label>
                              )}
                              {showDiscoveryDocumentUploadButton ? (
                                <Button
                                  type="submit"
                                  variant="primary"
                                  size="sm"
                                  disabled={saving || isBuildExecuting}
                                  loading={saving || isBuildExecuting}
                                  aria-label={`Extract ${INTELLIGENCE_HUB_LABEL} document evidence`}
                                  leftIcon={<MdUploadFile aria-hidden="true" />}
                                >
                                  Extract Evidence
                                </Button>
                              ) : null}
                            </>
                          )}
                          <span className="input-helper" id="runtime-discovery-documents-helper">
                            {DOCUMENT_EXTRACTION_HELPER_TEXT}
                          </span>
                        </div>
                        {documentUploadPreparing ? (
                          <Status variant="info" size="sm" showIcon>Preparing selected documents</Status>
                        ) : null}
                        {documentUploadError ? (
                          <Status variant="error" size="sm" showIcon>{documentUploadError}</Status>
                        ) : null}
                        <SelectedDocumentUploadList
                          ariaLabel={`Selected ${INTELLIGENCE_HUB_LABEL} documents`}
                          documents={draftDocumentSources}
                        />
                      </div>
                      <Status variant={draftDocumentSources.length > 0 ? 'success' : 'neutral'} size="sm" showIcon>
                        {isInspectionMode
                          ? 'Locked runtime inspection uses the frozen evidence snapshot.'
                          : draftDocumentSources.length > 0
                          ? `${draftDocumentSources.length} selected document${draftDocumentSources.length === 1 ? '' : 's'} staged for extraction`
                          : `Select documents and build ${INTELLIGENCE_HUB_EVIDENCE_LABEL} from the action bar.`}
                      </Status>
                    </section>
                  </div>
                </div>
              </div>
            </TabView.Tab>
            <TabView.Tab label="Sources">
              <div className="runtime-workspace__section-panels runtime-workspace__section-panels--sources">
                <section
                  className="runtime-workspace__section-panel"
                  aria-label="Source registry"
                  tabIndex={0}
                >
                  <h3>Source Registry</h3>
                  <p>
                    {sourceRegistrySummaryText || 'No source registry entries are projected for this runtime yet.'}
                  </p>
                  {sourceRegistryGroups.length > 0 ? (
                    <SourceRegistryGroupList groups={sourceRegistryGroups} />
                  ) : null}
                </section>
                {showSources ? (
                  <section
                    className="runtime-workspace__section-panel runtime-workspace__section-panel--evidence-sources"
                    aria-label="Evidence sources"
                    tabIndex={0}
                  >
                    <h3>Evidence Sources</h3>
                    {evidenceDetailLoading ? (
                      <Status variant="info" size="sm" showIcon>Loading sources</Status>
                    ) : evidenceDetailError ? (
                      <Status variant="error" size="sm" showIcon>{evidenceDetailError.message}</Status>
                    ) : sourceRegistry.length > 0 || evidenceObjects.length > 0 || lineageSources.length > 0 ? (
                      <div className="runtime-workspace__evidence-detail-grid">
                        <div>
                          <h4>Source Registry</h4>
                          {sourceRegistry.length > 0 ? (
                            <SourceRegistryGroupList groups={sourceRegistryGroups} />
                          ) : (
                            <p>No source registry entries are available for this evidence pack.</p>
                          )}
                        </div>
                        <div>
                          <h4>Evidence Objects</h4>
                          {evidenceObjects.length > 0 ? (
                            <ul className="runtime-workspace__plain-list runtime-workspace__plain-list--evidence-objects">
                              {evidenceObjects.map((evidenceObject) => {
                                const reviewStatus = String(evidenceObject.reviewStatus || 'PENDING').trim().toUpperCase()
                                const isReviewing = reviewingEvidenceObjectId === evidenceObject.evidenceObjectId
                                const actionLabel = getEvidenceObjectActionLabel(evidenceObject)
                                const canReviewEvidenceObject = Boolean(evidenceObject.evidenceObjectId)
                                  && !isInspectionMode
                                  && !disabled
                                  && !mutationDisabledReason
                                  && !evidenceReviewInFlight

                                return (
                                  <li key={evidenceObject.evidenceObjectId || evidenceObject.lineageRef}>
                                    <div className="runtime-workspace__evidence-object-heading">
                                      <strong>{evidenceObject.category || evidenceObject.evidenceObjectId || 'Evidence object'}</strong>
                                      <Badge variant={getReviewStatusVariant(reviewStatus)} size="sm" pill outline>
                                        {formatRuntimeTokenLabel(reviewStatus)}
                                      </Badge>
                                    </div>
                                    <span>
                                      {normalizeIntelligenceHubDisplayText(evidenceObject.extractedFact)
                                        || 'No extracted fact text is available.'}
                                    </span>
                                    <span className="runtime-workspace__section-note">
                                      {[evidenceObject.coverageArea, evidenceObject.sourceId].filter(Boolean).join(' / ')}
                                    </span>
                                    {!isInspectionMode ? (
                                      <div className="runtime-workspace__evidence-object-actions">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          leftIcon={<MdCheckCircle aria-hidden="true" />}
                                          disabled={!canReviewEvidenceObject || reviewStatus === 'ACCEPTED'}
                                          loading={isReviewing && reviewStatus !== 'ACCEPTED'}
                                          aria-label={`Accept evidence object ${actionLabel}`}
                                          onClick={handleReviewEvidenceObject(evidenceObject, 'ACCEPTED')}
                                        >
                                          Accept
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="danger"
                                          size="sm"
                                          leftIcon={<MdErrorOutline aria-hidden="true" />}
                                          disabled={!canReviewEvidenceObject || reviewStatus === 'REJECTED'}
                                          loading={isReviewing && reviewStatus !== 'REJECTED'}
                                          aria-label={`Reject evidence object ${actionLabel}`}
                                          onClick={handleReviewEvidenceObject(evidenceObject, 'REJECTED')}
                                        >
                                          Reject
                                        </Button>
                                      </div>
                                    ) : null}
                                  </li>
                                )
                              })}
                            </ul>
                          ) : (
                            <p>No reviewable evidence objects are available for this evidence pack.</p>
                          )}
                        </div>
                        {lineageSources.length > 0 ? (
                          <div>
                            <h4>Lineage</h4>
                            <ul className="runtime-workspace__plain-list">
                              {lineageSources.map((source) => (
                                <li key={source.sourceId || source.fieldKey || source.valueHash}>
                                  <strong>{formatLineageSourceTitle(source)}</strong>
                                  <span>{[source.type, source.status, source.fileName, source.url].filter(Boolean).join(' / ')}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p>No source lineage is available for this evidence pack.</p>
                    )}
                  </section>
                ) : null}
              </div>
            </TabView.Tab>
            <TabView.Tab label="Evidence">
              <div className="runtime-workspace__section-panels">
                <section className="runtime-workspace__section-panel" aria-label="Evidence pack">
                  <h3>Evidence Pack</h3>
                  <IntelligenceDetailRows rows={evidencePackRows} />
                </section>
                <section className="runtime-workspace__section-panel" aria-label="Evidence review">
                  <h3>Evidence Review</h3>
                  <IntelligenceDetailRows rows={evidenceReviewRows} />
                </section>
              </div>
            </TabView.Tab>
            <TabView.Tab label="Coverage">
              <div className="runtime-workspace__section-panels">
                <section className="runtime-workspace__section-panel" aria-label={`${INTELLIGENCE_HUB_LABEL} health`}>
                  <h3>{INTELLIGENCE_HUB_LABEL} Health</h3>
                  <IntelligenceDetailRows rows={coverageHealthRows} />
                </section>
                <section className="runtime-workspace__section-panel" aria-label="Acquisition quality">
                  <h3>Acquisition Quality</h3>
                  <IntelligenceDetailRows rows={acquisitionQualityRows} />
                  {acquisitionEffectiveness.recommendedNextInput ? (
                    <p className="runtime-workspace__section-note">
                      Recommended next input: {acquisitionEffectiveness.recommendedNextInput}
                    </p>
                  ) : null}
                </section>
                <section className="runtime-workspace__section-panel" aria-label="Discovery readiness">
                  <div className="runtime-workspace__evidence-acceptance-summary-header">
                    <div>
                      <h3>Discovery Readiness</h3>
                      <p className="runtime-workspace__evidence-acceptance-summary-lede">
                        {discoveryReadinessSummary}
                      </p>
                    </div>
                    <Badge
                      variant={getTokenStatusVariant(discoveryReadinessState)}
                      size="sm"
                      pill
                      outline
                      icon={discoveryReadinessState === 'READY'
                        ? <MdCheckCircle aria-hidden="true" />
                        : <MdOutlineWarningAmber aria-hidden="true" />}
                    >
                      {discoveryReadinessLabel}
                    </Badge>
                  </div>
                  <ul className="runtime-workspace__projection-list runtime-workspace__projection-list--compact">
                    <li>{discoveryReadinessCoverage}</li>
                    <li>
                      {getSummaryCount(discoveryReadiness, 'acceptedEvidenceCount')} accepted / {getSummaryCount(discoveryReadiness, 'pendingReviewCount')} pending evidence objects
                    </li>
                    <li>
                      {discoveryReadinessContradictionCount === 0
                        ? 'No contradiction candidates projected'
                        : `${discoveryReadinessContradictionCount} contradiction candidate${discoveryReadinessContradictionCount === 1 ? '' : 's'} projected`}
                    </li>
                  </ul>
                </section>
                <section className="runtime-workspace__section-panel" aria-label="Signal candidates">
                  <h3>Signal Candidates</h3>
                  {signalCandidateRows.length > 0 ? (
                    <ul className="runtime-workspace__plain-list">
                      {signalCandidateRows.map((signal) => (
                        <li key={signal.id}>
                          <strong>{signal.domain}</strong>
                          <span>{signal.summary}</span>
                          <Badge variant={getTokenStatusVariant(signal.signalStrength)} size="sm" pill outline>
                            {formatRuntimeTokenLabel(signal.signalStrength)}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No signal candidates are projected for this runtime yet.</p>
                  )}
                </section>
                <section className="runtime-workspace__section-panel" aria-label="Intelligence graph health">
                  <h3>Intelligence Graph Health</h3>
                  <IntelligenceDetailRows rows={graphHealthRows} />
                </section>
                <section className="runtime-workspace__section-panel" aria-label="Evidence domain coverage">
                  <h3>Evidence Domain Coverage</h3>
                  {graphCoverageDomainRows.length > 0 ? (
                    <ul className="runtime-workspace__coverage-heatmap">
                      {graphCoverageDomainRows.map((area) => {
                        const CoverageStateIcon = area.stateMeta.icon
                        return (
                          <li key={area.areaLabel}>
                            <span className="runtime-workspace__coverage-heatmap-label">{area.areaLabel}</span>
                            <ProgressBar
                              ariaLabel={`${area.areaLabel}: ${area.stateMeta.label}, ${area.progressText}`}
                              ariaValueText={area.progressText}
                              className="runtime-workspace__coverage-heatmap-progress"
                              size="sm"
                              valueTone
                              value={area.progressValue}
                              variant="success"
                            />
                            <span
                              className={`runtime-workspace__coverage-heatmap-state runtime-workspace__coverage-heatmap-state--${area.stateMeta.className}`}
                              style={{ '--runtime-workspace-coverage-icon-color': `color-mix(in srgb, var(--color-success), white ${getProgressBarValueTint(area.progressValue)})` }}
                              aria-label={`${area.areaLabel} graph coverage status: ${area.stateMeta.description}`}
                              title={area.stateMeta.description}
                            >
                              <CoverageStateIcon aria-hidden="true" focusable="false" />
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p>
                      {graphAvailable
                        ? 'No Evidence Domain Coverage rows are projected for this runtime yet.'
                        : 'Evidence Domain Coverage will appear after the Intelligence Graph is rebuilt.'}
                    </p>
                  )}
                </section>
              </div>
            </TabView.Tab>
            <TabView.Tab label="Governance">
              <div className="runtime-workspace__section-panels">
                <section className="runtime-workspace__section-panel" aria-label="Intelligence graph dependencies">
                  <h3>Dependencies</h3>
                  <IntelligenceDetailRows rows={graphDependencyRows} />
                </section>
                <section className="runtime-workspace__section-panel" aria-label="Intelligence graph missing areas">
                  <h3>Missing Areas</h3>
                  <IntelligenceDetailRows rows={graphMissingAreaRows} />
                </section>
                <section className="runtime-workspace__section-panel" aria-label="Scoped evidence views">
                  <h3>Scoped Evidence Views</h3>
                  <IntelligenceDetailRows rows={scopedEvidenceRows} />
                </section>
                <section className="runtime-workspace__section-panel" aria-label={`${INTELLIGENCE_HUB_LABEL} acceptance`}>
                  <h3>Acceptance</h3>
                  <IntelligenceDetailRows rows={acceptanceRows} />
                </section>
                {discoveryResetSummary ? (
                  <section className="runtime-workspace__section-panel" aria-label={`${INTELLIGENCE_HUB_LABEL} reset history`}>
                    <h3>Reset History</h3>
                    <IntelligenceDetailRows rows={resetHistoryRows} />
                  </section>
                ) : null}
              </div>
            </TabView.Tab>
          </TabView>
          {feedback?.message ? (
            <Status
              variant={feedback.variant === 'error' ? 'error' : feedback.variant === 'success' ? 'success' : 'info'}
              size="sm"
              showIcon
              className="runtime-workspace__section-feedback"
            >
              {feedback.message}
            </Status>
          ) : null}
          <ButtonGroup
            align="end"
            stackOnMobile
            fullWidthOnMobile
            className="runtime-workspace__section-actions"
            aria-label={`${INTELLIGENCE_HUB_LABEL} actions`}
          >
            {!isInspectionMode ? (
              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={<MdRefresh aria-hidden="true" />}
                disabled={disabled || Boolean(buildDisabledReason)}
                loading={saving || isBuildExecuting || documentUploadPreparing}
                aria-label={buildButtonLabel}
                aria-describedby={buildDisabledReason ? buildReasonId : undefined}
              >
                {buildButtonLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<MdInfoOutline aria-hidden="true" />}
              disabled={!hasEvidence}
              aria-describedby={sourcesDisabledReason ? sourcesReasonId : undefined}
              onClick={handleToggleSourcesClick}
            >
              {showSources ? 'Hide Sources' : 'View Sources'}
            </Button>
            {!isInspectionMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<MdCheckCircle aria-hidden="true" />}
                  disabled={!canAcceptDiscovery}
                  loading={saving || isAcceptExecuting}
                  aria-describedby={acceptDisabledReason ? acceptReasonId : undefined}
                  onClick={handleAcceptDiscovery}
                >
                  Accept Evidence
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  leftIcon={<MdDelete aria-hidden="true" />}
                  disabled={!canResetDiscovery}
                  loading={saving && showResetWarning}
                  aria-describedby={resetDisabledReason ? resetReasonId : undefined}
                  onClick={handleClearDiscoveryClick}
                >
                  Clear {INTELLIGENCE_HUB_LABEL}
                </Button>
              </>
            ) : null}
          </ButtonGroup>
          <Dialog
            open={showResetWarning}
            onClose={() => {
              if (!saving) setShowResetWarning(false)
            }}
            size="md"
            closeOnBackdropClick={!saving}
            closeOnEscape={!saving}
            showCloseButton={!saving}
            className="runtime-workspace__reset-dialog"
            role="alertdialog"
            aria-labelledby="discovery-reset-warning-title"
            aria-describedby="discovery-reset-warning-copy"
          >
            <Dialog.Header>
              <h2 id="discovery-reset-warning-title">Clear all {INTELLIGENCE_HUB_LABEL} evidence and accepted truths?</h2>
            </Dialog.Header>
            <Dialog.Body>
              <div className="runtime-workspace__reset-warning-copy">
                <MdOutlineWarningAmber aria-hidden="true" />
                <div>
                  <p id="discovery-reset-warning-copy">
                    This clears {INTELLIGENCE_HUB_INPUTS_LABEL}, document registry, evidence objects,
                    accepted evidence, generated section intelligence, and accepted section truth
                    for this runtime. The audit log will record who cleared it.
                  </p>
                </div>
              </div>
            </Dialog.Body>
            <Dialog.Footer>
              <div className="runtime-workspace__reset-warning-actions">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  leftIcon={<MdDelete aria-hidden="true" />}
                  disabled={!canResetDiscovery}
                  loading={saving}
                  onClick={handleResetDiscovery}
                >
                  Clear All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<MdClose aria-hidden="true" />}
                  disabled={saving}
                  onClick={() => setShowResetWarning(false)}
                >
                  Cancel
                </Button>
              </div>
            </Dialog.Footer>
          </Dialog>
          {buildDisabledReason ? (
            <p id={buildReasonId} className="runtime-workspace__action-disabled-reason">
              {buildDisabledReason}
            </p>
          ) : null}
          {sourcesDisabledReason ? (
            <p id={sourcesReasonId} className="runtime-workspace__action-disabled-reason">
              {sourcesDisabledReason}
            </p>
          ) : null}
          {acceptDisabledReason ? (
            <p id={acceptReasonId} className="runtime-workspace__action-disabled-reason">
              {acceptDisabledReason}
            </p>
          ) : null}
          {resetDisabledReason ? (
            <p id={resetReasonId} className="runtime-workspace__action-disabled-reason">
              {resetDisabledReason}
            </p>
          ) : null}
        </form>
      </Card.Body>
    </Card>
  )
}

function RuntimeWorkspace() {
  const navigate = useNavigate()
  const location = useLocation()
  const { runtimeInstanceId = '' } = useParams()
  const { addToast } = useToaster()
  const {
    data: rendererResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetRuntimeRendererQuery(
    { runtimeInstanceId },
    { skip: !runtimeInstanceId },
  )
  const {
    data: outputLabResponse,
    isLoading: isLoadingOutputLab,
    isFetching: isFetchingOutputLab,
    error: outputLabQueryError,
    refetch: refetchOutputLab,
  } = useGetRuntimeOutputLabQuery(
    { runtimeInstanceId },
    { skip: !runtimeInstanceId },
  )
  const [mutateRuntimeState] = useMutateRuntimeStateMutation()
  const [createRuntimeOutputRequest, { isLoading: isCreatingOutputRequest }] = useCreateRuntimeOutputRequestMutation()
  const [generateRuntimeOutputRequest, { isLoading: isGeneratingOutputRequest }] = useGenerateRuntimeOutputRequestMutation()
  const [exportRuntimeOutputAsset] = useLazyExportRuntimeOutputAssetQuery()
  const [acceptRuntimeDiscovery] = useAcceptRuntimeDiscoveryMutation()
  const [acceptRuntimeSection] = useAcceptRuntimeSectionMutation()
  const [clearRuntimeSectionEvidence] = useClearRuntimeSectionEvidenceMutation()
  const [resetRuntimeDiscovery] = useResetRuntimeDiscoveryMutation()
  const [reviewRuntimeDiscoveryEvidence] = useReviewRuntimeDiscoveryEvidenceMutation()
  const [reviewAllRuntimeSectionEvidence] = useReviewAllRuntimeSectionEvidenceMutation()
  const [reviewRuntimeSectionEvidence] = useReviewRuntimeSectionEvidenceMutation()
  const [updateRuntimeSectionEvidence] = useUpdateRuntimeSectionEvidenceMutation()
  const [updateRuntimeDiscoveryInputs] = useUpdateRuntimeDiscoveryInputsMutation()
  const [executeRuntimeAction] = useExecuteRuntimeActionMutation()
  const [savingRuntimePath, setSavingRuntimePath] = useState('')
  const [acceptingRuntimePath, setAcceptingRuntimePath] = useState('')
  const [savingDiscovery, setSavingDiscovery] = useState(false)
  const [reviewingEvidenceObjectId, setReviewingEvidenceObjectId] = useState('')
  const [reviewingSectionEvidenceObjectId, setReviewingSectionEvidenceObjectId] = useState('')
  const [clearingSectionEvidencePath, setClearingSectionEvidencePath] = useState('')
  const [uploadingSectionEvidencePath, setUploadingSectionEvidencePath] = useState('')
  const [executingActionKey, setExecutingActionKey] = useState('')
  const [discoveryFeedback, setDiscoveryFeedback] = useState(null)
  const [showEvidenceSources, setShowEvidenceSources] = useState(false)
  const [showWarningDetails, setShowWarningDetails] = useState(false)
  const [showAllSignals, setShowAllSignals] = useState(false)
  const [showAllActivity, setShowAllActivity] = useState(false)
  const [sectionFeedbackByPath, setSectionFeedbackByPath] = useState({})
  const [activeWorkspaceKey, setActiveWorkspaceKey] = useState(DISCOVERY_NAV_KEY)
  const [selectedOutputTypeKey, setSelectedOutputTypeKey] = useState('')
  const [exportingOutputAssetKey, setExportingOutputAssetKey] = useState('')
  const hasAutoSelectedInitialSection = useRef(false)
  const reviewingEvidenceObjectIdRef = useRef('')
  const reviewingSectionEvidenceObjectIdRef = useRef('')

  const renderer = getRendererPayload(rendererResponse)
  const outputLab = getOutputLabPayload(outputLabResponse)
  const outputLabError = outputLabQueryError ? normalizeError(outputLabQueryError) : null
  const outputLabDefinitions = Array.isArray(outputLab?.definitions) ? outputLab.definitions : EMPTY_ARRAY
  const runtimeInstance = renderer?.runtimeInstance ?? {}
  const sections = Array.isArray(renderer?.sections) ? renderer.sections : EMPTY_ARRAY
  const actions = Array.isArray(renderer?.actions) ? renderer.actions : EMPTY_ARRAY
  const sectionActionByKey = actions.reduce((acc, action) => {
    const actionKey = normalizeRuntimeActionToken(action?.governedAction || action?.actionKey)
    if (SECTION_ACTION_KEY_SET.has(actionKey)) {
      acc[actionKey] = action
    }
    return acc
  }, {})
  const discoveryActionByKey = actions.reduce((acc, action) => {
    const actionKey = normalizeRuntimeActionToken(action?.governedAction || action?.actionKey)
    if (DISCOVERY_ACTION_KEY_SET.has(actionKey)) {
      acc[actionKey] = action
    }
    return acc
  }, {})
  const sidePanelActions = actions.filter((action) =>
    !SECTION_ACTION_KEY_SET.has(normalizeRuntimeActionToken(action?.governedAction || action?.actionKey))
    && !DISCOVERY_ACTION_KEY_SET.has(normalizeRuntimeActionToken(action?.governedAction || action?.actionKey)),
  )
  const signals = Array.isArray(renderer?.signals) ? renderer.signals : EMPTY_ARRAY
  const signalItems = signals.filter((signal) => getSignalSummary(signal))
  const visibleSignalItems = showAllSignals
    ? signalItems
    : signalItems.slice(0, SIGNAL_PREVIEW_LIMIT)
  const activity = Array.isArray(renderer?.activity) ? renderer.activity : EMPTY_ARRAY
  const activityEvents = activity.filter((event) => getActivitySummary(event))
  const activityDisplayEvents = buildActivityDisplayEvents(activityEvents)
  const visibleActivityEvents = showAllActivity
    ? activityDisplayEvents
    : activityDisplayEvents.slice(0, ACTIVITY_PREVIEW_LIMIT)
  const discovery = getDiscoveryProjection(renderer)
  const discoveryState = getDiscoveryState(renderer)
  const lifecycleStage = normalizeRuntimeActionToken(renderer?.lifecycle?.stage)
  const isRuntimeLifecycleImmutable = IMMUTABLE_RUNTIME_LIFECYCLE_STAGES.has(lifecycleStage)
  const isRuntimeLockedForInspection = Boolean(
    renderer?.lock?.locked
    || runtimeInstance?.lockedAt
    || normalizeRuntimeActionToken(renderer?.lock?.state) === 'LOCKED'
    || normalizeRuntimeActionToken(renderer?.lifecycle?.runtimeStatus || runtimeInstance?.status) === 'LOCKED'
    || lifecycleStage === 'LOCKED',
  )
  const discoveryMutationDisabledReason = isRuntimeLockedForInspection
    ? LOCKED_RUNTIME_INSPECTION_REASON
    : isRuntimeLifecycleImmutable
      ? IMMUTABLE_RUNTIME_DISCOVERY_REASON
      : ''
  const {
    data: evidenceResponse,
    isFetching: isFetchingEvidence,
    error: evidenceError,
  } = useGetRuntimeEvidenceQuery(
    { runtimeInstanceId },
    { skip: !runtimeInstanceId || !showEvidenceSources },
  )
  const evidenceDetail = evidenceResponse?.data?.discovery ?? evidenceResponse?.discovery ?? null
  const evidenceDetailError = evidenceError ? normalizeError(evidenceError) : null
  const configWarnings = Array.isArray(renderer?.diagnostics?.configWarnings)
    ? renderer.diagnostics.configWarnings
    : EMPTY_ARRAY
  const configWarningGroups = buildWarningGroups(configWarnings)
  const warningDetailsAvailable = configWarningGroups.some((warningGroup) => warningGroup.messages.length > 0)
  const warningDisclosureAvailable =
    configWarningGroups.length > WARNING_PREVIEW_LIMIT || warningDetailsAvailable
  const visibleConfigWarningGroups = showWarningDetails
    ? configWarningGroups
    : configWarningGroups.slice(0, WARNING_PREVIEW_LIMIT)
  const showRuntimePaths = String(renderer?.diagnostics?.runtimePathVisibility ?? '').trim().toUpperCase() === 'VISIBLE'
  const appError = error ? normalizeError(error) : null

  const runtimeStatus = getRuntimeLifecycleStatus(runtimeInstance)
  const executionState = getRuntimeExecutionState(runtimeInstance)
  const runtimeDisplayId = getRuntimeInstanceDisplayId(
    runtimeInstance,
    runtimeInstance?.runtimeType ?? 'VALUE_NARRATIVE',
  )
  const runtimeHeaderContext = String(runtimeInstance?.name ?? '').trim() || runtimeDisplayId || 'this runtime'
  const packageName = String(renderer?.package?.packageName ?? runtimeInstance?.packageName ?? '').trim()
  const packageKey = String(renderer?.package?.packageKey ?? runtimeInstance?.packageKey ?? '').trim()
  const packageVersion = String(renderer?.package?.frameworkVersion ?? runtimeInstance?.packageVersion ?? '').trim()
  const packageSummary = [packageName || packageKey, packageVersion].filter(Boolean).join(' / ') || '--'
  const validationState = renderer?.validation?.state ?? 'UNKNOWN'
  const actionGateStatus = getRuntimeActionGateStatus(validationState)
  const readinessState = renderer?.readiness?.state ?? 'DRAFT'
  const sectionTruthState = isRuntimeLockedForInspection
    ? 'SECTION_TRUTH_LOCKED'
    : renderer?.readiness?.sectionTruth?.state ?? 'SECTION_TRUTH_NOT_CONFIGURED'
  const publishState = renderer?.publish?.state ?? 'UNKNOWN'
  const lockState = renderer?.lock?.state ?? 'UNKNOWN'
  const publishSnapshot = renderer?.publish?.snapshot || {}
  const lockSnapshot = renderer?.lock?.snapshot || {}
  const replayAnchor = renderer?.lock?.replayAnchor || renderer?.lock?.anchor || {}
  const outputEligibility = renderer?.lock?.outputEligibility || renderer?.publish?.outputEligibility || {}
  const hasCertifiedTruthState = Boolean(
    renderer?.publish?.published
    || renderer?.lock?.locked
    || publishSnapshot.snapshotId
    || lockSnapshot.snapshotId
    || replayAnchor.replayAnchorId,
  )
  const summaryItems = [
    {
      key: 'runtime-status',
      label: 'Runtime Status',
      value: formatRuntimeTokenLabel(runtimeStatus),
      variant: getRuntimeStatusVariant(runtimeStatus),
    },
    {
      key: 'execution',
      label: 'Execution',
      value: formatRuntimeTokenLabel(executionState),
      variant: getExecutionStateVariant(executionState),
    },
    {
      key: 'lifecycle-stage',
      label: 'Lifecycle Stage',
      value: formatRuntimeTokenLabel(renderer?.lifecycle?.stage ?? 'DRAFT'),
    },
    {
      key: 'validation',
      label: 'Validation',
      value: formatRuntimeTokenLabel(validationState),
      variant: getTokenStatusVariant(validationState),
    },
    {
      key: 'readiness',
      label: 'Readiness',
      value: formatRuntimeTokenLabel(readinessState),
      variant: getTokenStatusVariant(readinessState),
    },
    {
      key: 'publish',
      label: 'Publish',
      value: formatRuntimeTokenLabel(publishState),
      variant: getTokenStatusVariant(publishState),
    },
    {
      key: 'lock',
      label: 'Lock',
      value: formatRuntimeTokenLabel(lockState),
      variant: getTokenStatusVariant(lockState),
    },
    {
      key: 'package',
      label: 'Package',
      value: packageSummary,
    },
  ]
  const heroMetaItems = [
    formatRuntimeTokenLabel(runtimeInstance?.runtimeType ?? 'VALUE_NARRATIVE'),
    formatRuntimeTokenLabel(renderer?.lifecycle?.stage ?? 'DRAFT'),
    packageVersion ? `Package ${packageVersion}` : packageName || packageKey,
  ].filter(Boolean)
  const matchedActiveSectionIndex = sections.findIndex((section) =>
    (section?.sectionKey || section?.key) === activeWorkspaceKey,
  )
  const activeSectionIndex = matchedActiveSectionIndex >= 0 ? matchedActiveSectionIndex : 0
  const activeSection = activeWorkspaceKey === DISCOVERY_NAV_KEY || activeWorkspaceKey === OUTPUT_LAB_NAV_KEY
    ? null
    : matchedActiveSectionIndex >= 0 ? sections[matchedActiveSectionIndex] : null
  const activeSectionIntelligence = activeSection ? getSectionIntelligence(activeSection) : null
  const outputLabState = getOutputLabReadinessLabel(outputLab, {
    loading: isLoadingOutputLab || isFetchingOutputLab,
    error: outputLabError,
  })

  useEffect(() => {
    if (activeWorkspaceKey === DISCOVERY_NAV_KEY || activeWorkspaceKey === OUTPUT_LAB_NAV_KEY) return
    const hasActiveSection = sections.some((section) =>
      (section?.sectionKey || section?.key) === activeWorkspaceKey,
    )
    if (!hasActiveSection) {
      setActiveWorkspaceKey(DISCOVERY_NAV_KEY)
    }
  }, [activeWorkspaceKey, sections])

  useEffect(() => {
    if (hasAutoSelectedInitialSection.current) return
    if (activeWorkspaceKey === OUTPUT_LAB_NAV_KEY) return
    if (activeWorkspaceKey !== DISCOVERY_NAV_KEY) {
      hasAutoSelectedInitialSection.current = true
      return
    }

    const firstSectionKey = sections[0]?.sectionKey || sections[0]?.key
    if (firstSectionKey && sections.length > 1 && discovery?.accepted === true) {
      hasAutoSelectedInitialSection.current = true
      setActiveWorkspaceKey(firstSectionKey)
    }
  }, [activeWorkspaceKey, discovery?.accepted, discoveryState, sections])

  useEffect(() => {
    if (selectedOutputTypeKey) return
    const firstOutputTypeKey = outputLabDefinitions[0]?.outputTypeKey
    if (firstOutputTypeKey) {
      setSelectedOutputTypeKey(firstOutputTypeKey)
    }
  }, [outputLabDefinitions, selectedOutputTypeKey])

  const handleBack = () => {
    navigate(getRuntimeWorkspaceBackTarget(location.state))
  }

  const setSectionFeedback = (runtimePath, feedback) => {
    setSectionFeedbackByPath((current) => ({
      ...current,
      [runtimePath]: feedback,
    }))
  }

  const handleRefreshDiscoveryEvidence = async ({ acquisitionProfile, documentSources, inputs }) => {
    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      setDiscoveryFeedback({
        variant: 'error',
        message: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
      })
      return false
    }

    setSavingDiscovery(true)
    setDiscoveryFeedback(null)

    try {
      const currentDiscovery = getDiscoveryProjection(renderer)
      const hasCurrentEvidence = currentDiscovery?.evidenceReady === true
        || currentDiscovery?.state?.evidenceReady === true
      const actionKey = hasCurrentEvidence
        ? DISCOVERY_ACTION_KEYS.REFRESH_EVIDENCE_PACK
        : DISCOVERY_ACTION_KEYS.BUILD_EVIDENCE_PACK
      const discoveryAction = discoveryActionByKey[actionKey]
        || discoveryActionByKey[DISCOVERY_ACTION_KEYS.SAVE_DISCOVERY_INPUTS]
        || null

      if (discoveryAction) {
        if (!discoveryAction.enabled) {
          throw new Error(discoveryAction.disabledReason || `${INTELLIGENCE_HUB_EVIDENCE_LABEL} action is currently unavailable.`)
        }
        const resolvedActionKey = normalizeRuntimeActionToken(discoveryAction.governedAction || discoveryAction.actionKey)
        setExecutingActionKey(resolvedActionKey)
        await executeRuntimeAction({
          runtimeInstanceId,
          actionKey: resolvedActionKey,
          body: {
            acquisitionProfile,
            ...(documentSources ? { documentSources } : {}),
            inputs,
            expectedUpdatedAt,
          },
        }).unwrap()
      } else {
        await updateRuntimeDiscoveryInputs({
          runtimeInstanceId,
          body: {
            acquisitionProfile,
            ...(documentSources ? { documentSources } : {}),
            inputs,
            expectedUpdatedAt,
          },
        }).unwrap()
      }
      setDiscoveryFeedback({
        variant: 'success',
        message: `${INTELLIGENCE_HUB_EVIDENCE_LABEL} refreshed.`,
      })
      await refetch()
      return true
    } catch (discoveryError) {
      const normalizedError = normalizeError(discoveryError)
      setDiscoveryFeedback({
        variant: 'error',
        message: normalizedError.message,
      })
      return false
    } finally {
      setSavingDiscovery(false)
      setExecutingActionKey('')
    }
  }

  const handleAcceptDiscovery = async () => {
    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      setDiscoveryFeedback({
        variant: 'error',
        message: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
      })
      return false
    }

    setSavingDiscovery(true)
    setDiscoveryFeedback(null)

    try {
      const discoveryAction = discoveryActionByKey[DISCOVERY_ACTION_KEYS.ACCEPT_EVIDENCE] || null
      if (discoveryAction) {
        if (!discoveryAction.enabled) {
          throw new Error(discoveryAction.disabledReason || 'Evidence acceptance is currently unavailable.')
        }
        const resolvedActionKey = normalizeRuntimeActionToken(discoveryAction.governedAction || discoveryAction.actionKey)
        setExecutingActionKey(resolvedActionKey)
        await executeRuntimeAction({
          runtimeInstanceId,
          actionKey: resolvedActionKey,
          body: {
            expectedUpdatedAt,
          },
        }).unwrap()
      } else {
        await acceptRuntimeDiscovery({
          runtimeInstanceId,
          body: {
            expectedUpdatedAt,
          },
        }).unwrap()
      }
      setDiscoveryFeedback({
        variant: 'success',
        message: `${INTELLIGENCE_HUB_LABEL} accepted.`,
      })
      await refetch()
      return true
    } catch (discoveryError) {
      const normalizedError = normalizeError(discoveryError)
      setDiscoveryFeedback({
        variant: 'error',
        message: normalizedError.message,
      })
      return false
    } finally {
      setSavingDiscovery(false)
      setExecutingActionKey('')
    }
  }

  const handleResetDiscovery = async () => {
    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      setDiscoveryFeedback({
        variant: 'error',
        message: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
      })
      return false
    }

    setSavingDiscovery(true)
    setDiscoveryFeedback(null)
    setShowEvidenceSources(false)

    try {
      await resetRuntimeDiscovery({
        runtimeInstanceId,
        body: {
          confirmReset: true,
          expectedUpdatedAt,
          reason: 'USER_REQUESTED_DISCOVERY_RESET',
        },
      }).unwrap()
      setDiscoveryFeedback({
        variant: 'success',
        message: `${INTELLIGENCE_HUB_LABEL} cleared. Enter new ${INTELLIGENCE_HUB_LABEL} data to build a fresh evidence pack.`,
      })
      setActiveWorkspaceKey(DISCOVERY_NAV_KEY)
      await refetch()
      return true
    } catch (discoveryError) {
      const normalizedError = normalizeError(discoveryError)
      setDiscoveryFeedback({
        variant: 'error',
        message: normalizedError.message,
      })
      return false
    } finally {
      setSavingDiscovery(false)
    }
  }

  const handleReviewEvidenceObject = async ({ evidenceObjectId, reviewStatus }) => {
    if (reviewingEvidenceObjectIdRef.current) {
      return false
    }

    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      setDiscoveryFeedback({
        variant: 'error',
        message: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
      })
      return false
    }

    const normalizedEvidenceObjectId = String(evidenceObjectId || '').trim()
    if (!normalizedEvidenceObjectId) {
      setDiscoveryFeedback({
        variant: 'error',
        message: `${INTELLIGENCE_HUB_LABEL} evidence object is missing its review identifier.`,
      })
      return false
    }

    reviewingEvidenceObjectIdRef.current = normalizedEvidenceObjectId
    setReviewingEvidenceObjectId(normalizedEvidenceObjectId)
    setDiscoveryFeedback(null)

    try {
      await reviewRuntimeDiscoveryEvidence({
        runtimeInstanceId,
        evidenceObjectId: normalizedEvidenceObjectId,
        body: {
          reviewStatus,
          expectedUpdatedAt,
        },
      }).unwrap()
      setDiscoveryFeedback({
        variant: 'success',
        message: reviewStatus === 'REJECTED' ? 'Evidence object rejected.' : 'Evidence object accepted.',
      })
      await refetch()
      return true
    } catch (discoveryError) {
      const normalizedError = normalizeError(discoveryError)
      setDiscoveryFeedback({
        variant: 'error',
        message: normalizedError.message,
      })
      return false
    } finally {
      reviewingEvidenceObjectIdRef.current = ''
      setReviewingEvidenceObjectId('')
    }
  }

  const handleSaveSection = async ({ section, value, saveAndNext = false }) => {
    const runtimePath = section?.runtimePath
    if (!runtimePath) return false
    if (uploadingSectionEvidencePath === runtimePath) {
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: 'Wait for section evidence extraction to finish before accepting evidence.',
      })
      return false
    }
    if (clearingSectionEvidencePath === runtimePath) {
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: 'Wait for section evidence cleanup to finish before accepting evidence.',
      })
      return false
    }

    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
      })
      return false
    }

    setSavingRuntimePath(runtimePath)
    setSectionFeedback(runtimePath, null)

    try {
      const mutationResponse = await mutateRuntimeState({
        runtimeInstanceId,
        body: {
          runtimePath,
          operation: 'WRITE',
          value,
          expectedUpdatedAt,
          ...(saveAndNext ? { saveAndNext: true } : {}),
        },
      }).unwrap()
      setSectionFeedback(runtimePath, {
        variant: 'success',
        message: 'Section saved.',
      })
      await refetch()
      return mutationResponse?.data || mutationResponse || true
    } catch (mutationError) {
      const normalizedError = normalizeError(mutationError)
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: normalizedError.message,
      })
      return false
    } finally {
      setSavingRuntimePath('')
    }
  }

  const handleSaveSectionAndNext = async ({ section, value }) => {
    const mutationResult = await handleSaveSection({ section, value, saveAndNext: true })
    if (!mutationResult) return

    const serverAdvance = mutationResult?.advance
    if (serverAdvance?.requested) {
      if (serverAdvance.hasNext && serverAdvance.nextSectionKey) {
        setActiveWorkspaceKey(serverAdvance.nextSectionKey)
        return
      }
      setActiveWorkspaceKey(DISCOVERY_NAV_KEY)
      return
    }

    handleNextSection({ section })
  }

  const handleNextSection = ({ section }) => {
    const currentIndex = sections.findIndex((candidate) =>
      (candidate?.sectionKey || candidate?.key) === (section?.sectionKey || section?.key),
    )
    const nextSection = sections[currentIndex + 1]
    if (nextSection) {
      setActiveWorkspaceKey(nextSection.sectionKey || nextSection.key)
      return
    }
    setActiveWorkspaceKey(DISCOVERY_NAV_KEY)
  }

  const handleAcceptSection = async ({ section }) => {
    const runtimePath = section?.runtimePath
    if (!runtimePath) return false

    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
      })
      return false
    }

    setAcceptingRuntimePath(runtimePath)
    setSectionFeedback(runtimePath, null)

    try {
      await acceptRuntimeSection({
        runtimeInstanceId,
        body: {
          runtimePath,
          sectionKey: section?.sectionKey || section?.key,
          expectedUpdatedAt,
        },
      }).unwrap()
      setSectionFeedback(runtimePath, {
        variant: 'success',
        message: 'Section accepted as governed truth.',
      })
      await refetch()
      return true
    } catch (acceptanceError) {
      const normalizedError = normalizeError(acceptanceError)
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: normalizedError.message,
      })
      return false
    } finally {
      setAcceptingRuntimePath('')
    }
  }

  const handleUploadSectionEvidence = async ({ section, documentSources }) => {
    const runtimePath = section?.runtimePath
    if (!runtimePath) return false

    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
      })
      return false
    }

    setUploadingSectionEvidencePath(runtimePath)
    setSectionFeedback(runtimePath, null)

    try {
      await updateRuntimeSectionEvidence({
        runtimeInstanceId,
        body: {
          runtimePath,
          sectionKey: section?.sectionKey || section?.key,
          documentSources,
          expectedUpdatedAt,
        },
      }).unwrap()
      setSectionFeedback(runtimePath, {
        variant: 'success',
        message: 'Evidence extracted.',
      })
      await refetch()
      return true
    } catch (uploadError) {
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: formatSectionSupportingFileError(uploadError),
      })
      return false
    } finally {
      setUploadingSectionEvidencePath('')
    }
  }

  const handleClearSectionEvidence = async ({ section }) => {
    const runtimePath = section?.runtimePath
    if (!runtimePath) return false

    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
      })
      return false
    }

    setClearingSectionEvidencePath(runtimePath)
    setSectionFeedback(runtimePath, null)

    try {
      await clearRuntimeSectionEvidence({
        runtimeInstanceId,
        body: {
          runtimePath,
          sectionKey: section?.sectionKey || section?.key,
          confirmClear: true,
          expectedUpdatedAt,
          reason: 'USER_REQUESTED_SECTION_EVIDENCE_CLEAR',
        },
      }).unwrap()
      setSectionFeedback(runtimePath, {
        variant: 'success',
        message: 'Section evidence cleared.',
      })
      await refetch()
      return true
    } catch (clearError) {
      const normalizedError = normalizeError(clearError)
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: normalizedError.message,
      })
      return false
    } finally {
      setClearingSectionEvidencePath('')
    }
  }

  const handleReviewSectionEvidence = async ({ section, evidenceObjectId, reviewStatus }) => {
    if (reviewingSectionEvidenceObjectIdRef.current) {
      return false
    }

    const runtimePath = section?.runtimePath
    if (!runtimePath) return false

    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
      })
      return false
    }

    const normalizedEvidenceObjectId = String(evidenceObjectId || '').trim()
    if (!normalizedEvidenceObjectId) {
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: 'Section evidence object is missing its review identifier.',
      })
      return false
    }

    reviewingSectionEvidenceObjectIdRef.current = normalizedEvidenceObjectId
    setReviewingSectionEvidenceObjectId(normalizedEvidenceObjectId)
    setSectionFeedback(runtimePath, null)

    try {
      await reviewRuntimeSectionEvidence({
        runtimeInstanceId,
        evidenceObjectId: normalizedEvidenceObjectId,
        body: {
          runtimePath,
          sectionKey: section?.sectionKey || section?.key,
          reviewStatus,
          expectedUpdatedAt,
        },
      }).unwrap()
      setSectionFeedback(runtimePath, {
        variant: 'success',
        message: reviewStatus === 'REJECTED' ? 'Section evidence rejected.' : 'Section evidence accepted.',
      })
      await refetch()
      return true
    } catch (reviewError) {
      const normalizedError = normalizeError(reviewError)
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: normalizedError.message,
      })
      return false
    } finally {
      reviewingSectionEvidenceObjectIdRef.current = ''
      setReviewingSectionEvidenceObjectId('')
    }
  }

  const handleReviewAllSectionEvidence = async ({ section }) => {
    if (reviewingSectionEvidenceObjectIdRef.current) {
      return false
    }

    const runtimePath = section?.runtimePath
    if (!runtimePath) return false

    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
      })
      return false
    }

    const reviewToken = `all:${runtimePath}`
    reviewingSectionEvidenceObjectIdRef.current = reviewToken
    setReviewingSectionEvidenceObjectId(reviewToken)
    setSectionFeedback(runtimePath, null)

    try {
      await reviewAllRuntimeSectionEvidence({
        runtimeInstanceId,
        body: {
          runtimePath,
          sectionKey: section?.sectionKey || section?.key,
          reviewStatus: 'ACCEPTED',
          expectedUpdatedAt,
        },
      }).unwrap()
      setSectionFeedback(runtimePath, {
        variant: 'success',
        message: 'Pending section evidence accepted.',
      })
      await refetch()
      return true
    } catch (reviewError) {
      const normalizedError = normalizeError(reviewError)
      setSectionFeedback(runtimePath, {
        variant: 'error',
        message: normalizedError.message,
      })
      return false
    } finally {
      reviewingSectionEvidenceObjectIdRef.current = ''
      setReviewingSectionEvidenceObjectId('')
    }
  }

  const handleSelectSection = (index) => {
    const section = sections[index]
    if (!section) return
    setActiveWorkspaceKey(section.sectionKey || section.key)
  }

  const handleExecuteAction = async (action, actionBody = {}) => {
    const actionKey = normalizeRuntimeActionToken(action?.governedAction || action?.actionKey)
    if (!actionKey || !action?.enabled) return

    const expectedUpdatedAt = runtimeInstance?.updatedAt
    if (!expectedUpdatedAt) {
      addToast({
        title: 'Action unavailable',
        description: 'Runtime projection is missing its concurrency marker. Refresh and try again.',
        variant: 'error',
      })
      return
    }

    const confirmationMessage = String(action?.confirmationMessage ?? '').trim()
      || getDefaultConfirmationMessage(action)
    if (action?.requiresConfirmation && !window.confirm(confirmationMessage)) {
      return
    }

    setExecutingActionKey(actionKey)

    try {
      await executeRuntimeAction({
        runtimeInstanceId,
        actionKey,
        body: { expectedUpdatedAt, ...actionBody },
      }).unwrap()
      addToast({
        title: 'Action completed',
        description: action?.successMessage || 'Runtime action completed.',
        variant: 'success',
      })
      await refetch()
    } catch (actionError) {
      const normalizedError = normalizeError(actionError)
      const errorDescription = stripRequestReference(normalizedError.message)
      const requestReference = normalizedError.requestId
        ? ` Reference: ${normalizedError.requestId}`
        : ''
      addToast({
        title: 'Action failed',
        description: `${errorDescription}${requestReference}`,
        variant: 'error',
      })
    } finally {
      setExecutingActionKey('')
    }
  }

  const handleExecuteSectionAction = async ({ action, section }) => {
    await handleExecuteAction(action, {
      runtimePath: section?.runtimePath,
      sectionKey: section?.sectionKey || section?.key,
    })
  }

  const handleGenerateOutput = async (outputTypeKey) => {
    const normalizedOutputTypeKey = String(outputTypeKey || '').trim().toUpperCase()
    if (!normalizedOutputTypeKey) {
      addToast({
        title: 'Output unavailable',
        description: 'Select an output type before generating.',
        variant: 'error',
      })
      return
    }

    try {
      const requestResponse = await createRuntimeOutputRequest({
        runtimeInstanceId,
        body: { outputTypeKey: normalizedOutputTypeKey },
      }).unwrap()
      const outputRequest = getOutputLabPayload(requestResponse)
      const outputRequestId = outputRequest?.outputRequestId
      if (!outputRequestId) {
        throw new Error('Output request was created without a request identifier.')
      }

      await generateRuntimeOutputRequest({
        runtimeInstanceId,
        outputRequestId,
        body: {},
      }).unwrap()
      addToast({
        title: 'Output generated',
        description: 'Governed output is ready to export.',
        variant: 'success',
      })
      Promise.resolve(refetchOutputLab?.()).catch((refetchError) => {
        console.warn('Output Lab refetch failed after successful generation.', refetchError)
      })
    } catch (outputError) {
      const normalizedError = normalizeError(outputError)
      const requestReference = normalizedError.requestId
        ? ` Reference: ${normalizedError.requestId}`
        : ''
      addToast({
        title: 'Output failed',
        description: `${stripRequestReference(normalizedError.message)}${requestReference}`,
        variant: 'error',
      })
    }
  }

  const handleExportOutputAsset = async ({ asset, format }) => {
    const outputAssetId = getOutputLabAssetId(asset)
    const normalizedFormat = String(format || '').trim().toUpperCase()
    if (!outputAssetId || !normalizedFormat) {
      addToast({
        title: 'Export error',
        description: 'Output asset is not ready to export.',
        variant: 'error',
      })
      return
    }

    const exportKey = `${outputAssetId}:${normalizedFormat}`
    setExportingOutputAssetKey(exportKey)

    try {
      const exportResponse = await exportRuntimeOutputAsset({
        runtimeInstanceId,
        outputAssetId,
        format: normalizedFormat,
      }).unwrap()
      const exportedAsset = getOutputLabPayload(exportResponse)
      const exportContent = typeof exportedAsset?.content === 'string'
        ? exportedAsset.content
        : JSON.stringify(exportedAsset?.content ?? {}, null, 2)
      const filename = exportedAsset?.filename || `${runtimeDisplayId || 'runtime'}-output-lab.${normalizedFormat === 'JSON' ? 'json' : 'md'}`
      const mimeType = exportedAsset?.mimeType || (normalizedFormat === 'JSON' ? 'application/json' : 'text/markdown')
      const objectUrl = URL.createObjectURL(new Blob([exportContent], { type: mimeType }))
      const downloadLink = document.createElement('a')
      downloadLink.href = objectUrl
      downloadLink.download = filename
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      URL.revokeObjectURL(objectUrl)
      addToast({
        title: 'Export ready',
        description: filename,
        variant: 'success',
      })
    } catch (exportError) {
      const normalizedError = normalizeError(exportError)
      const requestReference = normalizedError.requestId
        ? ` Reference: ${normalizedError.requestId}`
        : ''
      addToast({
        title: 'Export failed',
        description: `${stripRequestReference(normalizedError.message)}${requestReference}`,
        variant: 'error',
      })
    } finally {
      setExportingOutputAssetKey('')
    }
  }

  if (isLoading) {
    return (
      <section className="runtime-workspace container" aria-label="Execution workspace">
        <Card variant="default" className="runtime-workspace__state-card">
          <Card.Body>
            <Spinner size="lg" aria-label="Loading execution workspace" />
          </Card.Body>
        </Card>
      </section>
    )
  }

  if (appError) {
    return (
      <section className="runtime-workspace container" aria-label="Execution workspace">
        <div
          className="runtime-workspace__actions"
          role="group"
          aria-label="Execution workspace actions"
        >
          <Button type="button" variant="outline" size="sm" onClick={handleBack}>
            Back
          </Button>
        </div>
        <ErrorSupportPanel error={appError} context="runtime-workspace-renderer" />
      </section>
    )
  }

  return (
    <section className="runtime-workspace container" aria-label="Execution workspace">
      <header className="runtime-workspace__page-header">
        <div className="runtime-workspace__page-copy">
          <h1 className="runtime-workspace__page-title">
            Execution Workspace
          </h1>
          <p className="runtime-workspace__page-description">
            Continue governed runtime work for {runtimeHeaderContext}.
          </p>
        </div>
        <div
          className="runtime-workspace__actions"
          role="group"
          aria-label="Execution workspace actions"
        >
          <Button type="button" variant="outline" size="sm" onClick={handleBack}>
            Back
          </Button>
          {isFetching ? (
            <Status variant="info" size="sm" showIcon>Refreshing</Status>
          ) : null}
        </div>
      </header>

      <Card variant="default" className="runtime-workspace__hero">
        <Card.Body className="runtime-workspace__hero-body">
          <div className="runtime-workspace__hero-copy">
            {heroMetaItems.length > 0 ? (
              <ul className="runtime-workspace__hero-meta" aria-label={`Runtime ${runtimeDisplayId} metadata`}>
                {heroMetaItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            <RuntimeProgressSummary
              sections={sections}
              readiness={renderer?.readiness}
              configWarnings={configWarnings}
            />
          </div>
          <ul className="runtime-workspace__summary-grid" aria-label="Execution workspace summary">
            {summaryItems.map((item) => (
              <RuntimeSummaryTile
                key={item.key}
                label={item.label}
                value={item.value}
                variant={item.variant}
              />
            ))}
          </ul>
        </Card.Body>
      </Card>

      <Card variant="default" className="runtime-workspace__action-panel">
        <Card.Body className="runtime-workspace__action-panel-body">
          <div className="runtime-workspace__action-panel-heading">
            <h2>Actions</h2>
            {actionGateStatus ? (
              <Status
                variant={actionGateStatus.variant}
                size="sm"
                showIcon
                className="runtime-workspace__action-panel-status"
              >
                {actionGateStatus.message}
              </Status>
            ) : null}
          </div>
          {sidePanelActions.length > 0 ? (
            <HorizontalScroll
              className="runtime-workspace__action-scroll"
              ariaLabel="Governed runtime actions scroll region"
              gap="sm"
            >
              <div
                className="runtime-workspace__action-list runtime-workspace__action-list--bar"
                role="group"
                aria-label="Governed runtime actions"
              >
                {sidePanelActions.map((action) => (
                  <RuntimeActionButton
                    key={action.actionKey || action.governedAction}
                    action={action}
                    disabled={Boolean(executingActionKey)}
                    executing={executingActionKey === normalizeRuntimeActionToken(action.governedAction || action.actionKey)}
                    onExecute={handleExecuteAction}
                  />
                ))}
              </div>
            </HorizontalScroll>
          ) : (
            <Status variant="neutral" size="sm" showIcon>
              No actions available
            </Status>
          )}
        </Card.Body>
      </Card>

      <div className="runtime-workspace__layout">
        <aside className="runtime-workspace__aside runtime-workspace__aside--left" aria-label="Execution intelligence side panel">
          <Card variant="default" className="runtime-workspace__panel">
            <Card.Body className="runtime-workspace__panel-body">
              <div className="runtime-workspace__panel-heading">
                <MdOutlineWarningAmber aria-hidden="true" />
                <h2>Signals</h2>
              </div>
              {signalItems.length > 0 ? (
                <>
                  <ul className="runtime-workspace__plain-list runtime-workspace__signal-list" id="runtime-workspace-signal-list">
                    {visibleSignalItems.map((signal) => {
                      const summary = getSignalSummary(signal)
                      const variant = getSignalVariant(signal)
                      return (
                        <li key={signal.id ?? signal.signalId ?? `${variant}-${summary}`} className="runtime-workspace__signal-item">
                          <span
                            className={`runtime-workspace__signal-icon runtime-workspace__signal-icon--${variant}`}
                            aria-hidden="true"
                          >
                            {getSignalIcon(variant)}
                          </span>
                          <span>{summary}</span>
                        </li>
                      )
                    })}
                  </ul>
                  {signalItems.length > SIGNAL_PREVIEW_LIMIT ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="runtime-workspace__panel-link"
                      aria-controls="runtime-workspace-signal-list"
                      aria-expanded={showAllSignals}
                      onClick={() => setShowAllSignals((current) => !current)}
                    >
                      {showAllSignals ? 'Show key signals' : 'View all signals'}
                    </Button>
                  ) : null}
                </>
              ) : (
                <Status variant="neutral" size="sm" showIcon>No runtime signals</Status>
              )}
            </Card.Body>
          </Card>

          <Card variant="default" className="runtime-workspace__panel">
            <Card.Body className="runtime-workspace__panel-body">
              <div className="runtime-workspace__panel-heading">
                <MdOutlineHistory aria-hidden="true" />
                <h2>Activity</h2>
              </div>
              {activityDisplayEvents.length > 0 ? (
                <>
                  <ul className="runtime-workspace__plain-list runtime-workspace__activity-list" id="runtime-workspace-activity-list">
                    {visibleActivityEvents.map((event) => {
                      const summary = getActivitySummary(event)
                      const actorLabel = getActivityActorLabel(event)
                      const occurredAtLabel = formatActivityTime(event.occurredAt)
                      const occurrenceCount = Number(event.occurrenceCount || 1)
                      return (
                        <li key={event.eventId ?? event.id ?? `${summary}-${event.occurredAt}`} className="runtime-workspace__activity-item">
                          <strong className="runtime-workspace__activity-title">
                            {actorLabel && !activitySummaryIncludesActor(summary, actorLabel) ? (
                              <>
                                <span>{actorLabel}</span>
                                {' '}
                                <span>{summary}</span>
                              </>
                            ) : (
                              summary
                            )}
                          </strong>
                          {occurredAtLabel ? (
                            <span className="runtime-workspace__activity-time">{occurredAtLabel}</span>
                          ) : null}
                          {occurrenceCount > 1 ? (
                            <span className="runtime-workspace__activity-count">
                              {occurrenceCount}
                              {' '}
                              events
                            </span>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                  {activityDisplayEvents.length > ACTIVITY_PREVIEW_LIMIT ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="runtime-workspace__panel-link"
                      aria-controls="runtime-workspace-activity-list"
                      aria-expanded={showAllActivity}
                      onClick={() => setShowAllActivity((current) => !current)}
                    >
                      {showAllActivity ? 'Show recent activity' : 'View all activity'}
                    </Button>
                  ) : null}
                </>
              ) : (
                <Status variant="neutral" size="sm" showIcon>No runtime activity</Status>
              )}
            </Card.Body>
          </Card>

          {configWarningGroups.length > 0 ? (
            <Card variant="default" className="runtime-workspace__panel">
              <Card.Body className="runtime-workspace__panel-body">
                <div className="runtime-workspace__panel-heading">
                  <MdOutlineWarningAmber aria-hidden="true" />
                  <h2>Runtime Warnings</h2>
                </div>
                <ul className="runtime-workspace__plain-list runtime-workspace__warning-list" id="runtime-workspace-warning-list">
                  {visibleConfigWarningGroups.map((warningGroup) => (
                    <li key={warningGroup.groupKey} className="runtime-workspace__warning-item">
                      <div className="runtime-workspace__warning-heading">
                        <Badge
                          variant={getWarningSeverityVariant(warningGroup.severity)}
                          size="sm"
                          pill
                          outline
                        >
                          {normalizeWarningSeverity(warningGroup.severity)}
                        </Badge>
                        <strong>{warningGroup.title}</strong>
                      </div>
                      <span className="runtime-workspace__warning-summary">
                        {formatWarningCount(warningGroup.count)}. {warningGroup.summary}
                      </span>
                      {showWarningDetails && warningGroup.messages.length > 0 ? (
                        <ul className="runtime-workspace__warning-detail-list" aria-label={`${warningGroup.title} details`}>
                          {warningGroup.messages.map((message) => (
                            <li key={`${warningGroup.groupKey}-${message}`}>{message}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {warningDisclosureAvailable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="runtime-workspace__panel-link"
                    aria-controls="runtime-workspace-warning-list"
                    aria-expanded={showWarningDetails}
                    onClick={() => setShowWarningDetails((current) => !current)}
                  >
                    {showWarningDetails ? 'Show key warnings' : 'View all warnings'}
                  </Button>
                ) : null}
              </Card.Body>
            </Card>
          ) : null}
        </aside>

        <main className="runtime-workspace__main" aria-label="Guided execution sections">
          {activeWorkspaceKey === DISCOVERY_NAV_KEY ? (
            <DiscoverySection
              key={`discovery-${getDiscoveryAcquisitionProfile(discovery)}-${JSON.stringify(discovery?.inputValues || {})}`}
              activity={activity}
              discovery={discovery}
              discoveryState={discoveryState}
              disabled={savingDiscovery
                || Boolean(discoveryMutationDisabledReason)
                || !runtimeInstance?.updatedAt
                || !discovery
                || !discovery.inputValues}
              discoveryActions={discoveryActionByKey}
              evidenceDetail={evidenceDetail}
              evidenceDetailError={evidenceDetailError}
              evidenceDetailLoading={isFetchingEvidence}
              executingActionKey={executingActionKey}
              feedback={discoveryFeedback}
              inspectionMode={isRuntimeLockedForInspection}
              mutationDisabledReason={discoveryMutationDisabledReason}
              onAcceptDiscovery={handleAcceptDiscovery}
              onResetDiscovery={handleResetDiscovery}
              onReviewEvidenceObject={handleReviewEvidenceObject}
              onRefreshEvidence={handleRefreshDiscoveryEvidence}
              onToggleSources={() => setShowEvidenceSources((current) => !current)}
              reviewingEvidenceObjectId={reviewingEvidenceObjectId}
              saving={savingDiscovery}
              showSources={showEvidenceSources}
            />
          ) : activeWorkspaceKey === OUTPUT_LAB_NAV_KEY ? (
            <OutputLabSection
              error={outputLabError}
              exportingAssetKey={exportingOutputAssetKey}
              generating={isCreatingOutputRequest || isGeneratingOutputRequest}
              loading={isLoadingOutputLab || isFetchingOutputLab}
              onExportAsset={handleExportOutputAsset}
              onGenerateOutput={handleGenerateOutput}
              outputLab={outputLab}
              selectedOutputTypeKey={selectedOutputTypeKey}
              setSelectedOutputTypeKey={setSelectedOutputTypeKey}
            />
          ) : activeSection ? (
            <ul className="runtime-workspace__section-list" aria-label="Runtime section cards">
              <RuntimeSection
                key={`${activeSection.key ?? activeSection.runtimePath}-${stringifyValue(activeSection.value)}`}
                id={getSectionDomId(activeSection, activeSectionIndex)}
                acceptingRuntimePath={acceptingRuntimePath}
                section={activeSection}
                discovery={discovery}
                disabled={savingRuntimePath === activeSection.runtimePath}
                executingActionKey={executingActionKey}
                feedback={sectionFeedbackByPath[activeSection.runtimePath]}
                generationActions={sectionActionByKey}
                lockedInspection={isRuntimeLockedForInspection}
                onAcceptSection={handleAcceptSection}
                onClearSectionEvidence={handleClearSectionEvidence}
                onExecuteSectionAction={handleExecuteSectionAction}
                onNext={handleNextSection}
                onReviewAllSectionEvidence={handleReviewAllSectionEvidence}
                onReviewSectionEvidence={handleReviewSectionEvidence}
                onSave={handleSaveSection}
                onSaveAndNext={handleSaveSectionAndNext}
                onUploadSectionEvidence={handleUploadSectionEvidence}
                reviewingSectionEvidenceObjectId={reviewingSectionEvidenceObjectId}
                clearingSectionEvidencePath={clearingSectionEvidencePath}
                showRuntimePath={showRuntimePaths}
                uploadingSectionEvidencePath={uploadingSectionEvidencePath}
              />
            </ul>
          ) : (
            <Card variant="default" className="runtime-workspace__state-card">
              <Card.Body>
                <Status variant="warning" size="sm" showIcon>No guided sections available</Status>
              </Card.Body>
            </Card>
          )}
        </main>

        <aside className="runtime-workspace__aside runtime-workspace__aside--right" aria-label="Guided sections side panel">
          <Card variant="default" className="runtime-workspace__panel runtime-workspace__panel--guided-sections">
            <Card.Body className="runtime-workspace__panel-body">
              <div className="runtime-workspace__panel-heading runtime-workspace__panel-heading--split">
                <div className="runtime-workspace__panel-heading-title">
                  <h2>Guided Sections</h2>
                </div>
                <Badge variant="neutral" size="sm" pill outline>
                  {sections.length} section{sections.length === 1 ? '' : 's'}
                </Badge>
              </div>
              <RuntimeSectionNavigation
                activeKey={activeWorkspaceKey}
                discoveryState={isRuntimeLockedForInspection ? 'Locked Inspection' : discoveryState}
                lockedInspection={isRuntimeLockedForInspection}
                onSelectDiscovery={() => setActiveWorkspaceKey(DISCOVERY_NAV_KEY)}
                onSelectOutputLab={() => setActiveWorkspaceKey(OUTPUT_LAB_NAV_KEY)}
                onSelectSection={handleSelectSection}
                outputLabState={outputLabState}
                sections={sections}
              />
            </Card.Body>
          </Card>

          <Card variant="default" className="runtime-workspace__panel">
            <Card.Body className="runtime-workspace__panel-body">
              <div className="runtime-workspace__panel-heading">
                <MdInfoOutline aria-hidden="true" />
                <h2>{INTELLIGENCE_HUB_LABEL} State</h2>
              </div>
              <Status variant={discoveryState === 'Evidence Ready' ? 'success' : 'neutral'} size="sm" showIcon>
                {discoveryState}
              </Status>
              <Status variant={getTokenStatusVariant(sectionTruthState)} size="sm" showIcon>
                {formatRuntimeTokenLabel(sectionTruthState)}
              </Status>
            </Card.Body>
          </Card>

          {hasCertifiedTruthState ? (
            <Card variant="default" className="runtime-workspace__panel">
              <Card.Body className="runtime-workspace__panel-body">
                <div className="runtime-workspace__panel-heading">
                  <MdCheckCircle aria-hidden="true" />
                  <h2>Certified Truth</h2>
                </div>
                <SectionDetailRows
                  ariaLabel="Certified runtime truth"
                  rows={[
                    {
                      id: 'output-eligibility',
                      title: 'Output',
                      meta: outputEligibility.outputEligible ? 'Eligible' : 'Not eligible',
                    },
                    {
                      id: 'publish-snapshot',
                      title: 'Publish Snapshot',
                      meta: formatRuntimeIdentifier(publishSnapshot.snapshotId),
                    },
                    {
                      id: 'lock-snapshot',
                      title: 'Lock Snapshot',
                      meta: formatRuntimeIdentifier(lockSnapshot.snapshotId),
                    },
                    {
                      id: 'replay-anchor',
                      title: 'Replay Anchor',
                      meta: formatRuntimeIdentifier(replayAnchor.replayAnchorId),
                    },
                  ]}
                />
              </Card.Body>
            </Card>
          ) : null}

          {activeSection && activeSectionIntelligence ? (
            <Card variant="default" className="runtime-workspace__panel">
              <Card.Body className="runtime-workspace__panel-body">
                <div className="runtime-workspace__panel-heading">
                  <MdCompareArrows aria-hidden="true" />
                  <h2>Governed Intelligence</h2>
                </div>
                <SectionDetailRows
                  ariaLabel="Active governed intelligence"
                  rows={[
                    {
                      id: 'active-section',
                      title: getSectionDisplayLabel(activeSection, 'Active item'),
                      meta: getTruthReadinessSummary(activeSectionIntelligence.readiness),
                    },
                    {
                      id: 'active-confidence',
                      title: 'Confidence',
                      meta: activeSectionIntelligence.displayProjection?.confidence?.label
                        || formatRuntimeTokenLabel(activeSectionIntelligence.confidence?.level || 'NONE'),
                    },
                    {
                      id: 'active-dependencies',
                      title: 'Dependencies',
                      meta: getDependencySummary(activeSectionIntelligence.dependency),
                    },
                    {
                      id: 'active-compare',
                      title: 'Compare',
                      meta: activeSectionIntelligence.compare?.summary
                        || formatRuntimeTokenLabel(activeSectionIntelligence.compare?.state || 'UNKNOWN'),
                    },
                  ]}
                />
              </Card.Body>
            </Card>
          ) : null}

        </aside>
      </div>
    </section>
  )
}

export default RuntimeWorkspace
