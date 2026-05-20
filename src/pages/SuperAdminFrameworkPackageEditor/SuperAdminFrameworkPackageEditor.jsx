import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { MdContentCopy, MdExpandMore, MdInfoOutline } from 'react-icons/md'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { TabView } from '../../components/TabView'
import { DEFAULT_TABLE_PAGE_SIZE, Table } from '../../components/Table'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { Tooltip } from '../../components/Tooltip'
import { useToaster } from '../../components/Toaster'
import CustomerSearchSelect from '../../components/CustomerSearchSelect'
import RuntimePathSearchSelect from '../../components/RuntimePathSearchSelect'
import {
  useCreateFrameworkPackageMutation,
  useCloneFrameworkPackageMutation,
  useGetFrameworkPackageAuditQuery,
  useGetFrameworkPackageLatestCheckpointQuery,
  useGetFrameworkPackageDependenciesQuery,
  useGetFrameworkPackageIntegrityQuery,
  useGetFrameworkPackageQuery,
  useListFrameworkPackagesQuery,
  useListFrameworkRegistriesQuery,
  useListUiContractsQuery,
  useListValidationRegistryQuery,
  useListWorkflowPoliciesQuery,
  useRunFrameworkPackageCheckpointMutation,
  useValidateFrameworkPackageMutation,
  useUpdateFrameworkPackageMutation,
  useActivateFrameworkPackageMutation,
  useGetRuntimeActivationHistoryQuery,
  useGetRuntimeActivationReadinessQuery,
  useGetRuntimeValidationHistoryQuery,
  useValidateRuntimeOperationMutation,
} from '../../store/api/runtimeControlApi.js'
import {
  normalizeError,
} from '../../utils/errors.js'
import {
  formatDateTime as formatStandardDateTime,
  formatDateTimeParts,
} from '../../utils/dateTime.js'
import { getRuntimeControlFieldErrorMap } from '../../utils/runtimeControlFormErrors.js'
import {
  buildFrameworkRegistryAllowedKeys,
  buildFrameworkRegistryNameLookup,
  buildFrameworkRegistryOptions,
} from '../SuperAdminFrameworkRegistry/superAdminFrameworkRegistry.constants.js'
import {
  FRAMEWORK_PACKAGE_CUSTOMER_ACCESS_OPTIONS,
  FRAMEWORK_PACKAGE_EVALUATION_MODE_OPTIONS,
  FRAMEWORK_PACKAGE_EXECUTION_MODE_OPTIONS,
  FRAMEWORK_PACKAGE_OUTPUT_KEY_OPTIONS,
  FRAMEWORK_PACKAGE_OUTPUT_STYLE_OPTIONS,
  FRAMEWORK_PACKAGE_FORM_STATUS_OPTIONS,
  FRAMEWORK_PACKAGE_RETRY_POLICY_OPTIONS,
  FRAMEWORK_PACKAGE_SCOPE_OPTIONS,
  FRAMEWORK_PACKAGE_STATE_BINDING_MODE_OPTIONS,
  FRAMEWORK_PACKAGE_STATE_MODEL_OPTIONS,
  FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODE_OPTIONS,
  FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES,
  FRAMEWORK_PACKAGE_STATE_PERSISTENCE_OPTIONS,
  FRAMEWORK_PACKAGE_STATUSES,
  FRAMEWORK_PACKAGE_TYPE_OPTIONS,
  FRAMEWORK_PACKAGE_VALIDATION_TRIGGER_OPTIONS,
  FRAMEWORK_PACKAGE_VISIBILITY_OPTIONS,
  FRAMEWORK_PACKAGE_WORKFLOW_EXECUTION_CONTEXT_OPTIONS,
  INITIAL_FRAMEWORK_PACKAGE_FORM,
  deriveSectionKeyFromRuntimePath,
  formatFrameworkPackageStatus,
  getFrameworkPackageStatusVariant,
  hasLegacyFrameworkPackageContractFields,
  mapFrameworkPackageToForm,
  normalizeRuntimePath,
  normalizeSectionKey,
  parseCustomerIdList,
  formatCustomerIdList,
  validateFrameworkPackageForm,
} from '../SuperAdminFrameworkPackages/superAdminFrameworkPackages.constants.js'
import '../SuperAdminFrameworkPackages/SuperAdminFrameworkPackages.css'
import '../SuperAdminFrameworkPackages/FrameworkPackageListView.css'
import './SuperAdminFrameworkPackageEditor.css'

const SERVER_ERROR_FIELDS = Object.freeze([
  'frameworkKey',
  'frameworkName',
  'packageKey',
  'packageName',
  'version',
  'description',
  'status',
  'visibility',
  'customerAccessMode',
  'assignedCustomerIds',
  'sections',
  'sectionsText',
  'executionModel',
  'runtimeSettings',
  'validationBindings',
  'workflowBindings',
  'uiContractKey',
  'stateModelKey',
  'stateModelVersion',
  'stateModelMode',
  'stateBindingMode',
  'statePersistence',
  'stateContractNotes',
  'availableOutputKeys',
  'defaultOutputStyles',
  'artifactRetentionDays',
])

const TABLE_PAGE_SIZE = DEFAULT_TABLE_PAGE_SIZE
const TOKEN_PATTERN = /^[a-z][a-z0-9-]*$/
const INITIAL_RUNTIME_VALIDATION_FILTERS = Object.freeze({
  status: '',
  severity: '',
  mode: '',
  operationType: '',
  runtimePath: '',
  dateFrom: '',
  dateTo: '',
})
const DEPENDENCY_TYPE_FILTERS = Object.freeze([
  { value: '', label: 'All Dependencies' },
  { value: 'Agent', label: 'Resolved Agents' },
  { value: 'Skill', label: 'Resolved Skills' },
  { value: 'Runtime Path', label: 'Runtime Paths' },
  { value: 'Validation', label: 'Validations' },
  { value: 'Workflow Policy', label: 'Workflow Policies' },
  { value: 'UI Contract', label: 'UI Contract' },
])
const RUNTIME_VALIDATION_BLOCKING_SEVERITIES = Object.freeze(['CRITICAL', 'ERROR', 'BLOCKING'])
const RUNTIME_VALIDATION_WARNING_SEVERITIES = Object.freeze(['WARN', 'WARNING'])
const RUNTIME_VALIDATION_MODE_HELP =
  'STRICT blocks blocking findings. WARN_ONLY allows non-critical errors but records warnings. AUDIT_ONLY records findings without blocking. DISABLED skips runtime validation.'

const RUNTIME_VALIDATION_AUDIT_PERSISTED_STATES = Object.freeze({
  YES: {
    variant: 'success',
    evidenceLabel: 'Audit persisted',
    copy: 'Latest result is stored in audit history.',
  },
  PENDING: {
    variant: 'warning',
    evidenceLabel: 'Audit pending',
    copy: 'Waiting for matching audit history.',
  },
  UNKNOWN: {
    variant: 'neutral',
    evidenceLabel: 'Persistence unknown',
    copy: 'Audit persistence could not be confirmed.',
  },
  '--': {
    variant: 'neutral',
    evidenceLabel: '--',
    copy: 'No runtime validation evidence is selected.',
  },
})

const RUNTIME_VALIDATION_CODE_DETAILS = Object.freeze({
  'RVL-SCOPE-001': {
    title: 'Scope boundary violation',
    explanation: 'The runtime path is outside the allowed read or write boundary for the active skill, role, agent, or package context.',
    remediation: 'Review the Runtime Path Registry entry and update allowed or forbidden scope bindings before retrying the operation.',
    subsystem: 'Runtime scope boundary validator',
    docsLink: 'docs/design-docs/cross-layer/STORYLINEOS-RUNTIME-CONTROL-RUNTIME-VALIDATION-LAYER-V1-SPEC.md',
  },
  'RVL-PATH-002': {
    title: 'Runtime path invalid',
    explanation: 'The runtime path is missing, unregistered, inactive, incompatible with the framework, protected from writes, or does not allow the requested operation.',
    remediation: 'Open the Runtime Path Registry entry, confirm it is ACTIVE, and verify framework compatibility plus allowed operations.',
    subsystem: 'Runtime mutation validator',
    docsLink: 'docs/design-docs/cross-layer/STORYLINEOS-RUNTIME-CONTROL-RUNTIME-PATH-REGISTRY-SPEC.md',
  },
  'RVL-OUTPUT-003': {
    title: 'Output contract violation',
    explanation: 'The runtime output payload does not match the declared output contract.',
    remediation: 'Align the payload shape with the output contract schema and rerun validation.',
    subsystem: 'Runtime output validator',
    docsLink: 'docs/design-docs/cross-layer/STORYLINEOS-RUNTIME-CONTROL-RUNTIME-VALIDATION-LAYER-V1-SPEC.md',
  },
  'RVL-LIFECYCLE-004': {
    title: 'Lifecycle transition blocked',
    explanation: 'The requested lifecycle transition is not allowed by the runtime lifecycle transition matrix.',
    remediation: 'Select an allowed source and target lifecycle stage pair, or update the governing lifecycle matrix through the approved control path.',
    subsystem: 'Runtime transition validator',
    docsLink: 'docs/design-docs/cross-layer/STORYLINEOS-RUNTIME-CONTROL-RUNTIME-ARCHITECTURE-CHECKPOINT-V2-SPEC.md',
  },
  'RVL-SKILL-007': {
    title: 'Runtime skill or role invalid',
    explanation: 'The referenced runtime skill or skill role is missing, inactive, incompatible, or does not allow the requested operation.',
    remediation: 'Confirm the skill and role are seeded, ACTIVE, compatible with the framework, and have the required operation and scope bindings.',
    subsystem: 'Runtime mutation validator',
    docsLink: 'docs/design-docs/cross-layer/STORYLINEOS-RUNTIME-CONTROL-RUNTIME-VALIDATION-LAYER-V1-SPEC.md',
  },
  'RVL-DEPENDENCY-008': {
    title: 'Dependency lock snapshot missing',
    explanation: 'Runtime execution cannot proceed because the framework package does not have a frozen dependency boundary.',
    remediation: 'Run dependency resolution and lock the package before retrying runtime validation.',
    subsystem: 'Runtime dependency validator',
    docsLink: 'docs/design-docs/cross-layer/STORYLINEOS-RUNTIME-CONTROL-VERSIONING-LOCKING-STANDARD-SPEC.md',
  },
  'RVL-EXECUTION-009': {
    title: 'Runtime validation execution',
    explanation: 'The runtime validation engine completed an execution check for the operation.',
    remediation: 'No remediation is required for informational pass records. Review related findings if this appears with warnings or failures.',
    subsystem: 'Runtime validation engine',
    docsLink: 'docs/design-docs/cross-layer/STORYLINEOS-RUNTIME-CONTROL-RUNTIME-VALIDATION-LAYER-V1-SPEC.md',
  },
})

const slugifyToken = (value) => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!normalized) return ''
  if (TOKEN_PATTERN.test(normalized)) return normalized

  const prefixed = `binding-${normalized}`.replace(/-+/g, '-').replace(/^-+|-+$/g, '')
  return TOKEN_PATTERN.test(prefixed) ? prefixed : 'binding'
}

const buildUniqueBindingKey = (existingBindings, validationKey, trigger) => {
  const seen = new Set(
    (existingBindings ?? [])
      .map((binding) => slugifyToken(binding?.bindingKey))
      .filter(Boolean),
  )

  const triggerSlug = slugifyToken(String(trigger || '').toLowerCase().replace(/_/g, '-'))
  const base = `${slugifyToken(validationKey) || 'validation'}-${triggerSlug || 'trigger'}`
  if (!seen.has(base)) return base

  let counter = 2
  while (seen.has(`${base}-${counter}`)) {
    counter += 1
  }
  return `${base}-${counter}`
}

const buildDefaultFrameworkPackageForm = (registryRows) => {
  const [firstRegistry] = registryRows

  if (!firstRegistry) {
    return {
      ...INITIAL_FRAMEWORK_PACKAGE_FORM,
      frameworkKey: '',
      frameworkName: '',
      sections: [],
      runtimeSettings: { ...INITIAL_FRAMEWORK_PACKAGE_FORM.runtimeSettings },
      executionModel: { ...INITIAL_FRAMEWORK_PACKAGE_FORM.executionModel },
      validationBindings: [],
      workflowBindings: [],
      uiContractKey: '',
    }
  }

  return {
    ...INITIAL_FRAMEWORK_PACKAGE_FORM,
    frameworkKey: String(firstRegistry.frameworkKey ?? '').trim(),
    frameworkName: String(firstRegistry.name ?? '').trim(),
    sections: [],
    runtimeSettings: { ...INITIAL_FRAMEWORK_PACKAGE_FORM.runtimeSettings },
    executionModel: { ...INITIAL_FRAMEWORK_PACKAGE_FORM.executionModel },
    validationBindings: [],
    workflowBindings: [],
    uiContractKey: '',
  }
}

const EMPTY_SECTION_DRAFT = Object.freeze({
  sectionKey: '',
  runtimePath: '',
  required: true,
  validationKeys: Object.freeze([]),
  notes: '',
})

const updateRuntimeSetting = (setForm, key, value) => {
  setForm((current) => ({
    ...current,
    runtimeSettings: {
      ...current.runtimeSettings,
      [key]: value,
    },
  }))
}

const updateExecutionModel = (setForm, key, value) => {
  setForm((current) => ({
    ...current,
    executionModel: {
      ...current.executionModel,
      [key]: value,
    },
  }))
}

const removeSection = (setForm, index) => {
  setForm((current) => ({
    ...current,
    sections: (current.sections ?? []).filter((_, sectionIndex) => sectionIndex !== index),
  }))
}

const addValidationBinding = (setForm, validationKey) => {
  if (!validationKey) return
  setForm((current) => ({
    ...current,
    validationBindings: [
      ...(current.validationBindings ?? []),
      {
        bindingKey: buildUniqueBindingKey(current.validationBindings, validationKey, 'ON_SUBMIT'),
        validationKey,
        trigger: 'ON_SUBMIT',
        blocking: true,
        priority: ((current.validationBindings ?? []).length + 1) * 100,
        freshnessMinutes: '',
        enabled: true,
        notes: '',
      },
    ],
  }))
}

const updateValidationBinding = (setForm, index, key, value) => {
  setForm((current) => ({
    ...current,
    validationBindings: (current.validationBindings ?? []).map((binding, bindingIndex) =>
      bindingIndex === index ? { ...binding, [key]: value } : binding,
    ),
  }))
}

const removeValidationBinding = (setForm, index) => {
  setForm((current) => ({
    ...current,
    validationBindings: (current.validationBindings ?? []).filter((_, bindingIndex) => bindingIndex !== index),
  }))
}

const addWorkflowBinding = (setForm, policyKey) => {
  if (!policyKey) return
  setForm((current) => ({
    ...current,
    workflowBindings: [
      ...(current.workflowBindings ?? []),
      {
        policyKey,
        executionContext: 'ON_SUBMIT',
        priority: ((current.workflowBindings ?? []).length + 1) * 100,
        enabled: true,
        notes: '',
      },
    ].filter((item, index, list) =>
      list.findIndex((candidate) =>
        candidate.policyKey === item.policyKey
        && candidate.executionContext === item.executionContext,
      ) === index,
    ),
  }))
}

const updateWorkflowBinding = (setForm, index, key, value) => {
  setForm((current) => ({
    ...current,
    workflowBindings: (current.workflowBindings ?? []).map((binding, bindingIndex) =>
      bindingIndex === index ? { ...binding, [key]: value } : binding,
    ),
  }))
}

const removeWorkflowBinding = (setForm, index) => {
  setForm((current) => ({
    ...current,
    workflowBindings: (current.workflowBindings ?? []).filter((_, bindingIndex) => bindingIndex !== index),
  }))
}

const countErrorsForFields = (errors, fields) => fields.filter((field) => errors[field]).length

const parseDelimitedKeyList = (value) => [
  ...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  ),
]

const toggleDelimitedKeyListValue = (currentValue, optionValue, checked) => {
  const currentItems = parseDelimitedKeyList(currentValue)
  const nextItems = checked
    ? [...new Set([...currentItems, optionValue])]
    : currentItems.filter((item) => item !== optionValue)

  return nextItems.join('\n')
}

const getTableTotalPages = (rowCount, pageSize = TABLE_PAGE_SIZE) =>
  Math.max(1, Math.ceil(Number(rowCount || 0) / pageSize))

const getClampedPage = (page, totalPages) =>
  Math.min(Math.max(Number(page) || 1, 1), Math.max(Number(totalPages) || 1, 1))

const getPaginatedRows = (rows, page, pageSize = TABLE_PAGE_SIZE) => {
  const currentPage = getClampedPage(page, getTableTotalPages(rows.length, pageSize))
  const startIndex = (currentPage - 1) * pageSize
  return rows.slice(startIndex, startIndex + pageSize)
}

function TablePagination({ currentPage, totalPages, onPageChange, ariaLabel }) {
  if (totalPages <= 1) return null

  return (
    <div
      className="super-admin-framework-packages__pagination"
      role="navigation"
      aria-label={ariaLabel}
    >
      <div className="super-admin-framework-packages__pagination-controls">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
        >
          First
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
      </div>

      <p className="super-admin-framework-packages__pagination-info">
        Page {currentPage} of {totalPages}
      </p>

      <div className="super-admin-framework-packages__pagination-controls">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          Last
        </Button>
      </div>
    </div>
  )
}

function TableSurface({
  ariaLabel,
  columns,
  data,
  emptyMessage,
  paginationLabel,
  currentPage,
  totalPages,
  onPageChange,
}) {
  return (
    <>
      <HorizontalScroll
        className="super-admin-framework-packages__table-wrap"
        ariaLabel={ariaLabel}
        gap="sm"
      >
        <Table
          className="super-admin-framework-packages__table"
          columns={columns}
          data={data}
          variant="striped"
          hoverable
          emptyMessage={emptyMessage}
          ariaLabel={ariaLabel}
        />
      </HorizontalScroll>
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        ariaLabel={paginationLabel}
      />
    </>
  )
}

const renderTabLabel = (label, count = 0) => (
  <span className="super-admin-framework-package-editor__tab-label">
    <span>{label}</span>
    {count > 0 ? (
      <>
        <span className="super-admin-framework-package-editor__tab-error-count" aria-hidden="true">
          ({count})
        </span>
        <span className="sr-only"> ({count} validation errors)</span>
      </>
    ) : null}
  </span>
)

const getCheckStatusVariant = (status) => {
  const normalized = String(status ?? '').trim().toUpperCase()
  if (normalized === 'PASS' || normalized === 'ACTIVE' || normalized === 'ALLOW' || normalized === 'VALID') return 'success'
  if (['FAIL', 'MISSING', 'BLOCK', 'BLOCKED', 'ERROR', 'BLOCKING', 'CRITICAL', 'INVALIDATED'].includes(normalized)) return 'error'
  if (['WARN', 'WARNING', 'PASS_WITH_WARNINGS', 'STALE', 'NOT_RUN'].includes(normalized)) return 'warning'
  if (['INFO', 'AUDIT_ONLY', 'DISABLED'].includes(normalized)) return 'info'
  return 'neutral'
}

const getSeverityRank = (severity) => {
  const normalized = String(severity ?? '').trim().toUpperCase()
  if (normalized === 'CRITICAL') return 5
  if (normalized === 'ERROR' || normalized === 'BLOCKING') return 4
  if (normalized === 'WARN' || normalized === 'WARNING') return 3
  if (normalized === 'INFO') return 2
  return 1
}

const getRuntimeValidationRowSeverity = (row) => {
  const issues = Array.isArray(row?.issues) ? row.issues : []
  return [
    String(row?.severity ?? '').trim().toUpperCase(),
    ...issues.map((issue) => String(issue?.severity ?? '').trim().toUpperCase()),
  ]
    .filter(Boolean)
    .sort((a, b) => getSeverityRank(b) - getSeverityRank(a))[0] || ''
}

const getRuntimeValidationTimestamp = (validation) =>
  validation?.createdAt
  ?? validation?.timestamp
  ?? validation?.ts
  ?? null

const getRuntimeValidationMode = (validation) =>
  String(validation?.mode ?? 'STRICT').trim().toUpperCase() || 'STRICT'

const normalizeRuntimeValidationModeFilterValue = (value) =>
  String(value ?? '').trim().toUpperCase()

const normalizeRuntimeValidationOperationType = (value) =>
  String(value ?? '').trim().toUpperCase()

const getRuntimeValidationIssueSummary = (issues = []) => {
  const rows = Array.isArray(issues) ? issues : []
  const blocking = rows.filter((issue) =>
    RUNTIME_VALIDATION_BLOCKING_SEVERITIES.includes(String(issue?.severity ?? '').trim().toUpperCase()),
  ).length
  const warnings = rows.filter((issue) =>
    RUNTIME_VALIDATION_WARNING_SEVERITIES.includes(String(issue?.severity ?? '').trim().toUpperCase()),
  ).length
  const informational = rows.filter((issue) =>
    String(issue?.severity ?? '').trim().toUpperCase() === 'INFO',
  ).length

  return {
    blocking,
    warnings,
    informational,
    total: rows.length,
  }
}

const deriveRuntimeValidationStatus = (validation) => {
  const status = String(validation?.status ?? '').trim().toUpperCase()
  if (['PASS', 'WARN', 'FAIL'].includes(status)) return status

  const result = String(validation?.result ?? '').trim().toUpperCase()
  if (result === 'ALLOW' || result === 'AUDIT_ONLY') return 'PASS'
  if (result === 'BLOCK') return 'FAIL'
  if (['PASS', 'WARN', 'FAIL'].includes(result)) return result

  return 'NOT_RUN'
}

const getRuntimeValidationDecision = (validation) => {
  const result = String(validation?.result ?? '').trim().toUpperCase()
  if (result) return result
  const status = deriveRuntimeValidationStatus(validation)
  if (status === 'FAIL') return 'BLOCK'
  if (status === 'PASS' || status === 'WARN') return 'ALLOW'
  return 'NOT_RUN'
}

const normalizeRuntimeValidationAuditRow = (row) => ({
  ...row,
  status: deriveRuntimeValidationStatus(row),
})

const formatGovernanceToken = (value, fallback = 'Not recorded') => {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (!normalized) return fallback
  if (normalized === 'NOT_RUN') return 'Not Run'
  return normalized.replaceAll('_', ' ')
}

const formatCheckpointDisplay = (status) => {
  const normalized = String(status ?? '').trim().toUpperCase()
  if (normalized === 'PASS_WITH_WARNINGS') {
    return {
      value: 'PASS',
      qualifier: 'with warnings',
      text: 'PASS with warnings',
    }
  }

  const value = formatGovernanceToken(normalized, 'Not Run')
  return { value, qualifier: '', text: value }
}

const normalizeCheckpointSummary = (checkpoint) => {
  const summary = checkpoint?.summary ?? {}
  const passed = Number(summary.passed ?? summary.pass) || 0
  const warnings = Number(summary.warnings ?? summary.warn) || 0
  const failed = Number(summary.failed ?? summary.fail) || 0
  const totalChecks = Number(summary.totalChecks) || passed + warnings + failed
  const resolvedReferences = Number(summary.resolvedReferences) || 0

  return {
    totalChecks,
    passed,
    warnings,
    failed,
    resolvedReferences,
  }
}

const getCheckpointTimestamp = (checkpoint, pkg) =>
  checkpoint?.timestamp
  ?? checkpoint?.lastCheckpointAt
  ?? pkg?.lastCheckpointAt
  ?? null

const getDependencyLockMeta = (pkg, checkpoint) => {
  const persistedLock = pkg?.dependencyLock ?? null
  const previewLock = checkpoint?.dependencyLockPreview ?? null
  const lock = persistedLock ?? previewLock
  const references = Array.isArray(lock?.references) ? lock.references : []
  const summary = normalizeCheckpointSummary(checkpoint)
  const referenceCount = references.length || summary.resolvedReferences
  const packageKey = String(lock?.packageKey ?? pkg?.packageKey ?? '').trim()
  const packageVersion = String(lock?.packageVersion ?? pkg?.version ?? '').trim()

  return {
    hasPersistedLock: Boolean(persistedLock),
    status: String(lock?.status ?? '').trim().toUpperCase(),
    snapshotId: String(
      lock?.snapshotId
      ?? lock?.lockId
      ?? lock?.snapshotHash
      ?? lock?.hash
      ?? lock?.id
      ?? '',
    ).trim(),
    snapshotHash: String(lock?.snapshotHash ?? lock?.hash ?? '').trim(),
    createdAt: lock?.createdAt
      ?? lock?.resolvedAt
      ?? lock?.lockedAt
      ?? getCheckpointTimestamp(checkpoint, pkg),
    sourceLabel: [packageKey, packageVersion].filter(Boolean).join(' ') || '--',
    referenceCount,
  }
}

const getEvidenceIdentifierValue = (...values) =>
  values
    .map((value) => String(value ?? '').trim())
    .find(Boolean) || ''

const clearTextSelection = () => {
  if (typeof window === 'undefined' || !window.getSelection) return
  window.getSelection()?.removeAllRanges()
}

const copyTextWithTextareaFallback = (value) => {
  if (typeof document === 'undefined' || !document.body) {
    throw new Error('Clipboard fallback unavailable')
  }

  let handledCopyEvent = false
  const handleCopy = (event) => {
    if (!event.clipboardData?.setData) return

    event.clipboardData.setData('text/plain', value)
    event.preventDefault()
    handledCopyEvent = true
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, value.length)

  document.addEventListener('copy', handleCopy, { once: true })
  try {
    const didCopy = document.execCommand?.('copy')

    if (!didCopy && !handledCopyEvent) {
      throw new Error('Clipboard fallback failed')
    }
  } finally {
    document.removeEventListener('copy', handleCopy)
    textarea.remove()
  }
}

const copyRuntimeEvidenceValue = async (value) => {
  let didCopy = false
  let clipboardError = null

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      didCopy = true
    } catch (error) {
      clipboardError = clipboardError ?? error
    }
  }

  if (!didCopy) {
    try {
      copyTextWithTextareaFallback(value)
      didCopy = true
    } catch (error) {
      clipboardError = clipboardError ?? error
    }
  }

  if (!didCopy) {
    throw clipboardError ?? new Error('Clipboard copy failed')
  }
}

const getRuntimeValidationAuditPersistedLabel = (validation, historyRows) => {
  if (!validation) return '--'
  if (!Array.isArray(historyRows) || historyRows.length === 0) return 'PENDING'

  // Persistence should be based on audit identity, not transient object identity after RTK refetches.
  const validationId = String(validation.validationId ?? validation.id ?? '').trim()
  if (!validationId) return 'UNKNOWN'

  return historyRows.some((row) =>
    String(row?.validationId ?? row?.id ?? '').trim() === validationId,
  ) ? 'YES' : 'PENDING'
}

const getRuntimeValidationCurrentState = ({
  validation,
  status,
  checkpointStatus = 'NOT_RUN',
  probePath,
  dependencyLockMeta,
  isLiveProbe = false,
}) => {
  if (!validation) {
    return {
      state: 'NOT_RUN',
      message: 'No runtime validation has been recorded for this package.',
    }
  }

  if (status === 'FAIL' && isLiveProbe) {
    return {
      state: 'BLOCKED',
      message: 'The in-session runtime probe returned a blocking result.',
    }
  }

  if (status === 'FAIL') {
    return {
      state: 'INVALIDATED',
      message: 'The last runtime validation returned a blocking result.',
    }
  }

  if (String(checkpointStatus ?? '').trim().toUpperCase() === 'NOT_RUN') {
    return {
      state: 'STALE',
      message: 'The runtime validation result is historical. Run the Runtime Architecture Checkpoint before treating it as current package readiness evidence.',
    }
  }

  const validatedPath = normalizeRuntimePath(validation.runtimePath)
  if (probePath && validatedPath && probePath !== validatedPath) {
    return {
      state: 'STALE',
      message: 'The last validation used a different runtime path than the current probe path.',
    }
  }

  if (!dependencyLockMeta?.hasPersistedLock && !isLiveProbe) {
    return {
      state: 'STALE',
      message: 'The package does not currently expose a persisted dependency lock snapshot.',
    }
  }

  if (!dependencyLockMeta?.hasPersistedLock && isLiveProbe) {
    return {
      state: 'VALID',
      message: 'The in-session runtime validation passed. Persisted dependency lock evidence is not currently exposed for this package.',
    }
  }

  return {
    state: 'VALID',
    message: 'The latest runtime validation still matches the current package signal available in this editor.',
  }
}

const getRuntimeValidationCodeDetail = (issue) => {
  const code = String(issue?.code ?? '').trim().toUpperCase()
  const detail = RUNTIME_VALIDATION_CODE_DETAILS[code]
  if (detail) {
    return { code, issue, ...detail }
  }

  return {
    code: code || 'UNKNOWN',
    issue,
    title: 'Runtime validation issue',
    explanation: 'This validation code is not yet mapped to a detailed operator explanation.',
    remediation: 'Review the issue message, runtime path, operation type, and related Runtime Control records.',
    subsystem: issue?.source || 'Runtime validation layer',
    docsLink: 'docs/design-docs/cross-layer/STORYLINEOS-RUNTIME-CONTROL-RUNTIME-VALIDATION-LAYER-V1-SPEC.md',
  }
}

const RUNTIME_VALIDATION_TOOLTIP_OPEN_EVENT = 'runtime-validation-tooltip-open'

function RuntimeValidationHelpTrigger({ label, content, children, align = 'start' }) {
  const tooltipInstanceId = useId()
  const tooltipContentId = `${tooltipInstanceId}-content`
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)

  useEffect(() => {
    const handleTooltipOpen = (event) => {
      if (event.detail !== tooltipInstanceId) {
        setIsTooltipOpen(false)
      }
    }

    window.addEventListener(RUNTIME_VALIDATION_TOOLTIP_OPEN_EVENT, handleTooltipOpen)

    return () => {
      window.removeEventListener(RUNTIME_VALIDATION_TOOLTIP_OPEN_EVENT, handleTooltipOpen)
    }
  }, [tooltipInstanceId])

  const showTooltip = () => {
    window.dispatchEvent(
      new CustomEvent(RUNTIME_VALIDATION_TOOLTIP_OPEN_EVENT, { detail: tooltipInstanceId })
    )
    setIsTooltipOpen(true)
  }
  const hideTooltip = () => setIsTooltipOpen(false)
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      hideTooltip()
    }
  }

  return (
    <Tooltip
      id={tooltipContentId}
      content={content}
      open={isTooltipOpen}
      position="bottom"
      align={align}
      className="super-admin-framework-package-editor__runtime-validation-tooltip"
    >
      <button
        type="button"
        className="super-admin-framework-package-editor__tooltip-trigger"
        aria-label={label}
        aria-expanded={isTooltipOpen}
        aria-describedby={tooltipContentId}
        onClick={showTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onKeyDown={handleKeyDown}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {children}
        <MdInfoOutline aria-hidden="true" focusable="false" />
      </button>
    </Tooltip>
  )
}

const getRuntimePathNavigationState = (runtimePath, dependencyRows) => {
  const normalizedPath = normalizeRuntimePath(runtimePath)
  if (!normalizedPath) return { pathId: '', title: '' }

  const match = (dependencyRows ?? []).find((row) =>
    row?.type === 'Runtime Path'
    && [
      row.pathKey,
      row.key,
    ].some((candidate) => normalizeRuntimePath(candidate) === normalizedPath),
  )

  if (!match) {
    return {
      pathId: '',
      title: "Path not registered in this package's dependency graph.",
    }
  }

  const pathId = String(match.stableId ?? '').trim()
  return {
    pathId,
    title: pathId
      ? ''
      : 'Runtime Path is registered, but it does not expose a stable id for navigation.',
  }
}

const getRuntimePathNavigationId = (runtimePath, dependencyRows) => {
  const { pathId } = getRuntimePathNavigationState(runtimePath, dependencyRows)
  return pathId
}

const getDependencyNavigationTarget = (row) => {
  const status = String(row?.status ?? '').trim().toUpperCase()
  const issues = Array.isArray(row?.issues) ? row.issues : []
  if (status === 'MISSING' || issues.some((issue) => /not found/i.test(String(issue)))) return ''

  const rowId = String(row?.stableId ?? row?.pathId ?? row?.id ?? row?.key ?? '').trim()
  if (!rowId) return ''

  switch (row?.type) {
    case 'Agent':
      return `/super-admin/runtime-control/agents/${encodeURIComponent(rowId)}`
    case 'Skill':
      return `/super-admin/runtime-control/skills/${encodeURIComponent(rowId)}`
    case 'Runtime Path':
      return `/super-admin/runtime-control/runtime-paths/${encodeURIComponent(rowId)}/edit`
    case 'Validation':
      return `/super-admin/runtime-control/validation-registry/${encodeURIComponent(rowId)}`
    case 'Workflow Policy':
      return `/super-admin/runtime-control/workflow-policies/${encodeURIComponent(rowId)}/edit`
    case 'UI Contract':
      return `/super-admin/runtime-control/ui-contracts/${encodeURIComponent(rowId)}`
    default:
      return ''
  }
}

const filterRuntimeValidationRows = (rows, filters) => {
  const normalizedStatus = String(filters.status ?? '').trim().toUpperCase()
  const normalizedSeverity = String(filters.severity ?? '').trim().toUpperCase()
  const normalizedMode = normalizeRuntimeValidationModeFilterValue(filters.mode)
  const normalizedOperation = normalizeRuntimeValidationOperationType(filters.operationType)
  const normalizedPath = normalizeRuntimePath(filters.runtimePath)
  const fromTime = filters.dateFrom ? Date.parse(`${filters.dateFrom}T00:00:00Z`) : null
  const toTime = filters.dateTo ? Date.parse(`${filters.dateTo}T23:59:59.999Z`) : null
  if (fromTime && toTime && fromTime > toTime) return []

  return (rows ?? []).filter((row) => {
    const rowStatus = deriveRuntimeValidationStatus(row)
    if (normalizedStatus && rowStatus !== normalizedStatus) return false

    const rowSeverity = getRuntimeValidationRowSeverity(row)
    if (normalizedSeverity && rowSeverity !== normalizedSeverity) return false

    const rowMode = normalizeRuntimeValidationModeFilterValue(row?.mode)
    if (normalizedMode && rowMode !== normalizedMode) return false

    const rowOperation = normalizeRuntimeValidationOperationType(row?.operationType)
    if (normalizedOperation && rowOperation !== normalizedOperation) return false

    const rowPath = normalizeRuntimePath(row?.runtimePath)
    if (normalizedPath && !rowPath.includes(normalizedPath)) return false

    const rowTime = Date.parse(getRuntimeValidationTimestamp(row) ?? '')
    if (fromTime && (!Number.isFinite(rowTime) || rowTime < fromTime)) return false
    if (toTime && (!Number.isFinite(rowTime) || rowTime > toTime)) return false

    return true
  })
}

const hasCheckpointRun = (checkpoint) => {
  const status = String(checkpoint?.status ?? '').trim().toUpperCase()
  return Boolean(checkpoint) && status && status !== 'NOT_RUN'
}

const FRAMEWORK_PACKAGE_EDITOR_TABS = Object.freeze({
  FRAMEWORK_IDENTITY: 0,
  PACKAGE_IDENTITY: 1,
  ACCESS: 2,
  SECTIONS: 3,
  RUNTIME: 4,
  VALIDATION: 5,
  WORKFLOWS: 6,
  OUTPUTS: 7,
  UI_CONTRACT: 8,
  STATE_CONTRACT: 9,
  DEPENDENCIES: 10,
  INTEGRITY: 11,
  RUNTIME_VALIDATION: 12,
  AUDIT: 13,
  JSON_DIFF: 14,
})

const FRAMEWORK_PACKAGE_EDITOR_TAB_QUERY = Object.freeze({
  dependencies: FRAMEWORK_PACKAGE_EDITOR_TABS.DEPENDENCIES,
  'dependency-snapshot': FRAMEWORK_PACKAGE_EDITOR_TABS.DEPENDENCIES,
  integrity: FRAMEWORK_PACKAGE_EDITOR_TABS.INTEGRITY,
  checkpoint: FRAMEWORK_PACKAGE_EDITOR_TABS.INTEGRITY,
  'checkpoint-history': FRAMEWORK_PACKAGE_EDITOR_TABS.AUDIT,
  audit: FRAMEWORK_PACKAGE_EDITOR_TABS.AUDIT,
})

const getCheckpointFromMutationError = (error) =>
  error?.data?.error?.checkpoint
  ?? error?.data?.checkpoint
  ?? error?.error?.checkpoint
  ?? null

const getRuntimeValidationFromMutationError = (error) =>
  error?.data?.error?.validation
  ?? error?.data?.validation
  ?? error?.error?.validation
  ?? null

const checkpointIssueToIntegrityRow = (issue, fallbackSeverity) => ({
  key: [issue?.code, issue?.path, issue?.message].filter(Boolean).join(':') || 'checkpoint.issue',
  group: issue?.source || issue?.category || 'Runtime Architecture Checkpoint',
  severity: String(fallbackSeverity || '').trim().toUpperCase() === 'BLOCKING' ? 'FAIL' : 'WARN',
  field: issue?.path || '',
  message: issue?.message || 'Checkpoint issue detected.',
})

const RUNTIME_PATH_TOKEN_PATTERN = /\bframework_state(?:\.[a-zA-Z0-9_*.-]+)+/g

const getIntegrityMessageDigest = (message) => {
  const text = String(message ?? '').trim()
  const paths = Array.from(new Set(
    (text.match(RUNTIME_PATH_TOKEN_PATTERN) ?? [])
      .map((path) => path.replace(/[.,;:]+$/u, ''))
      .filter(Boolean),
  ))

  if (paths.length === 0) {
    return {
      summary: text || 'Integrity check returned supporting detail.',
      paths,
      hasDenseEvidence: text.length > 160,
    }
  }

  const firstPathIndex = text.indexOf(paths[0])
  const summary = firstPathIndex >= 0
    ? text.slice(0, firstPathIndex).replace(/[:,\s]+$/u, '').trim()
    : text

  return {
    summary: summary || 'Runtime path compatibility issue.',
    paths,
    hasDenseEvidence: true,
  }
}

function IntegrityMessageCell({ row, onViewDetails }) {
  const digest = getIntegrityMessageDigest(row?.message)
  const previewPaths = digest.paths.slice(0, 2)

  if (!digest.hasDenseEvidence) {
    return <span>{digest.summary}</span>
  }

  return (
    <div className="super-admin-framework-package-editor__integrity-message-cell">
      <p className="super-admin-framework-package-editor__integrity-message-summary">
        {digest.summary}
      </p>
      <div className="super-admin-framework-package-editor__integrity-message-meta">
        {digest.paths.length > 0 ? (
          <Badge variant="neutral" size="sm" outline pill>
            {digest.paths.length} runtime {digest.paths.length === 1 ? 'path' : 'paths'}
          </Badge>
        ) : (
          <Badge variant="neutral" size="sm" outline pill>
            Full detail
          </Badge>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails({ row, digest })}
        >
          View details
        </Button>
      </div>
      {previewPaths.length > 0 ? (
        <div className="super-admin-framework-package-editor__integrity-message-preview" aria-label="Runtime path preview">
          {previewPaths.map((path) => (
            <code key={path} className="super-admin-framework-package-editor__code-token">
              {path}
            </code>
          ))}
        </div>
      ) : null}
    </div>
  )
}

const checkpointPassedCheckToIntegrityRow = (check) => ({
  key: [check?.code, check?.path, check?.message].filter(Boolean).join(':') || 'checkpoint.pass',
  group: check?.source || check?.category || 'Runtime Architecture Checkpoint',
  severity: 'PASS',
  field: check?.path || '',
  message: check?.message || 'Checkpoint check passed.',
})

const buildCheckpointIntegrityView = (checkpoint) => {
  if (!hasCheckpointRun(checkpoint)) return null

  const errors = Array.isArray(checkpoint.errors) ? checkpoint.errors : []
  const warnings = Array.isArray(checkpoint.warnings) ? checkpoint.warnings : []
  const passedChecks = Array.isArray(checkpoint.passedChecks) ? checkpoint.passedChecks : []
  const checks = [
    ...errors.map((issue) => checkpointIssueToIntegrityRow(issue, 'BLOCKING')),
    ...warnings.map((issue) => checkpointIssueToIntegrityRow(issue, 'WARNING')),
    ...passedChecks.map(checkpointPassedCheckToIntegrityRow),
  ]

  return {
    status: String(checkpoint.status || '').trim().toUpperCase(),
    summary: {
      pass: Number(checkpoint.summary?.passed) || passedChecks.length,
      warn: Number(checkpoint.summary?.warnings) || warnings.length,
      fail: Number(checkpoint.summary?.failed) || errors.length,
    },
    checks,
  }
}

const formatDateTime = (value) => {
  if (!value) return '--'
  return formatStandardDateTime(value, String(value))
}

const formatIssueList = (issues = []) =>
  Array.isArray(issues) && issues.length > 0 ? issues.join(' ') : 'None'

const isLikelyObjectId = (value) => /^[a-f0-9]{24}$/i.test(String(value || '').trim())

const getAuditActorLabel = (actor) => {
  if (!actor) return '--'
  if (typeof actor === 'string') {
    return isLikelyObjectId(actor) ? 'Admin user' : actor
  }
  const fallbackId = actor.id || actor._id || ''
  const fallbackLabel = isLikelyObjectId(fallbackId) ? 'Admin user' : fallbackId
  return actor.name || actor.email || actor.label || fallbackLabel || '--'
}

const getCheckpointActorLabel = (checkpoint) => {
  const label = getAuditActorLabel(checkpoint?.runBy)
  if (label !== '--') return label
  return hasCheckpointRun(checkpoint) ? 'Admin user' : '--'
}

const getRuntimeValidationActorLabel = (validation) => {
  const actor =
    validation?.runBy
    ?? validation?.actor
    ?? validation?.actorUser
    ?? validation?.actorUserId
    ?? validation?.actorId
  const label = getAuditActorLabel(actor)
  // `sa-local` is the local seeded Super Admin identifier used by dev fixtures.
  if (label === 'sa-local') return 'Super Admin'
  if (label !== '--') return label
  return validation ? 'Unknown actor' : '--'
}

function PackageEditorLoadingState() {
  return (
    <Card variant="elevated" className="super-admin-framework-packages__card super-admin-framework-package-editor__loading-card">
      <Card.Body className="super-admin-framework-packages__card-body super-admin-framework-package-editor__loading-body">
        <Spinner size="lg" />
        <p className="super-admin-framework-package-editor__helper">Loading framework package...</p>
      </Card.Body>
    </Card>
  )
}

function PackageEditorErrorState({ message, onBack }) {
  return (
    <Card variant="elevated" className="super-admin-framework-packages__card super-admin-framework-package-editor__error-card">
      <Card.Body className="super-admin-framework-packages__card-body super-admin-framework-package-editor__loading-body">
        <p className="super-admin-framework-package-editor__error" role="alert">
          {message}
        </p>
        <div className="super-admin-framework-package-editor__top-actions">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
      </Card.Body>
    </Card>
  )
}

function SectionHeader({ id, title, copy }) {
  return (
    <div className="super-admin-framework-package-editor__section-header">
      <h2 id={id} className="super-admin-framework-package-editor__section-title">{title}</h2>
      <p className="super-admin-framework-package-editor__section-copy">{copy}</p>
    </div>
  )
}

function SuperAdminFrameworkPackageEditor() {
  const navigate = useNavigate()
  const { packageId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { addToast } = useToaster()
  const isEditMode = Boolean(packageId)
  const cloneFromPackageId = !isEditMode ? String(searchParams.get('cloneFrom') ?? '').trim() : ''
  const isCloneMode = Boolean(cloneFromPackageId)
  const loadedPackageId = isEditMode ? packageId : cloneFromPackageId

  const [form, setForm] = useState({
    ...INITIAL_FRAMEWORK_PACKAGE_FORM,
    sections: [],
    executionModel: { ...INITIAL_FRAMEWORK_PACKAGE_FORM.executionModel },
    runtimeSettings: { ...INITIAL_FRAMEWORK_PACKAGE_FORM.runtimeSettings },
    validationBindings: [],
    workflowBindings: [],
    uiContractKey: '',
  })
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState(0)
  const [showRawJson, setShowRawJson] = useState(false)
  const [tablePages, setTablePages] = useState({
    sections: 1,
    dependencies: 1,
    integrity: 1,
    runtimeValidation: 1,
    audit: 1,
  })
  const [sectionDialog, setSectionDialog] = useState({
    open: false,
    index: -1,
    draft: { ...EMPTY_SECTION_DRAFT },
  })
  const [activationDialogOpen, setActivationDialogOpen] = useState(false)
  const [checkpointResult, setCheckpointResult] = useState(null)
  const [runtimeValidationResult, setRuntimeValidationResult] = useState(null)
  const [runtimeValidationFilters, setRuntimeValidationFilters] = useState({
    ...INITIAL_RUNTIME_VALIDATION_FILTERS,
  })
  const [dependencyTypeFilter, setDependencyTypeFilter] = useState('')
  const [runtimeValidationCodeDetail, setRuntimeValidationCodeDetail] = useState(null)
  const [integrityMessageDetail, setIntegrityMessageDetail] = useState(null)
  const [runtimeEvidenceIdentifiersOpen, setRuntimeEvidenceIdentifiersOpen] = useState(false)
  const runtimeEvidenceIdentifiersPanelId = useId()
  const runtimeValidationProbeRequestRef = useRef(0)
  const cloneHydratedSourceRef = useRef('')
  const sectionDialogRef = useRef({
    open: false,
    index: -1,
    draft: { ...EMPTY_SECTION_DRAFT },
  })

  const {
    data: packageResponse,
    isLoading: isPackageLoading,
    error: packageError,
    refetch: refetchPackage,
  } = useGetFrameworkPackageQuery(loadedPackageId, {
    skip: !loadedPackageId,
  })

  const {
    data: dependencyResponse,
    isLoading: isDependenciesLoading,
    error: dependencyError,
    refetch: refetchDependencies,
  } = useGetFrameworkPackageDependenciesQuery(packageId, {
    skip: !isEditMode,
  })

  const {
    data: integrityResponse,
    isFetching: isIntegrityFetching,
    error: integrityError,
    refetch: refetchIntegrity,
  } = useGetFrameworkPackageIntegrityQuery(packageId, {
    skip: !isEditMode,
  })

  const {
    data: latestCheckpointResponse,
    refetch: refetchLatestCheckpoint,
  } = useGetFrameworkPackageLatestCheckpointQuery(packageId, {
    skip: !isEditMode,
  })

  const {
    data: auditResponse,
    isLoading: isAuditLoading,
    error: auditError,
  } = useGetFrameworkPackageAuditQuery({ packageId, page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE }, {
    skip: !isEditMode,
  })

  const {
    data: runtimeValidationHistoryResponse,
    isLoading: isRuntimeValidationHistoryLoading,
    error: runtimeValidationHistoryError,
    refetch: refetchRuntimeValidationHistory,
  } = useGetRuntimeValidationHistoryQuery({ packageId, page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE }, {
    skip: !isEditMode,
  })

  const {
    data: runtimeActivationReadinessResponse,
    isLoading: isRuntimeActivationReadinessLoading,
    isFetching: isRuntimeActivationReadinessFetching,
    refetch: refetchRuntimeActivationReadiness,
  } = useGetRuntimeActivationReadinessQuery(packageId, {
    skip: !isEditMode,
  })

  const {
    data: runtimeActivationHistoryResponse,
    refetch: refetchRuntimeActivationHistory,
  } = useGetRuntimeActivationHistoryQuery(packageId, {
    skip: !isEditMode,
  })

  const { data: packageListResponse } = useListFrameworkPackagesQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })

  const { data: registryResponse } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })

  const { data: validationRegistryResponse } = useListValidationRegistryQuery({
    page: 1,
    pageSize: 100,
    status: 'ACTIVE',
    frameworkKey: form.frameworkKey || undefined,
    packageUsable: 'true',
  })

  const { data: workflowPolicyResponse } = useListWorkflowPoliciesQuery({
    page: 1,
    pageSize: 100,
    status: 'ACTIVE',
    frameworkKey: form.frameworkKey || undefined,
  })

  const { data: uiContractResponse } = useListUiContractsQuery({
    page: 1,
    pageSize: 100,
    status: 'ACTIVE',
    frameworkKey: form.frameworkKey || undefined,
    version: form.version || undefined,
  })
  const selectedUiContractKey = String(form.uiContractKey ?? '').trim()
  const { data: selectedUiContractResponse } = useListUiContractsQuery(
    {
      page: 1,
      pageSize: 25,
      q: selectedUiContractKey,
      frameworkKey: form.frameworkKey || undefined,
    },
    { skip: !selectedUiContractKey },
  )

  const [createFrameworkPackage, { isLoading: isCreating }] = useCreateFrameworkPackageMutation()
  const [cloneFrameworkPackage, { isLoading: isCloning }] = useCloneFrameworkPackageMutation()
  const [updateFrameworkPackage, { isLoading: isUpdating }] = useUpdateFrameworkPackageMutation()
  const [runFrameworkPackageCheckpoint, { isLoading: isRunningCheckpoint }] = useRunFrameworkPackageCheckpointMutation()
  const [validateFrameworkPackage, { isLoading: isValidatingPackage }] = useValidateFrameworkPackageMutation()
  const [activateFrameworkPackage, { isLoading: isActivatingPackage }] = useActivateFrameworkPackageMutation()
  const [validateRuntimeOperation, { isLoading: isValidatingRuntimeOperation }] = useValidateRuntimeOperationMutation()
  const isSaving = isCreating || isUpdating || isCloning

  const registryRows = useMemo(() => registryResponse?.data ?? [], [registryResponse?.data])
  const frameworkOptions = buildFrameworkRegistryOptions(registryRows).filter((option) => option.value)
  const frameworkNameLookup = buildFrameworkRegistryNameLookup(registryRows)
  const supportedFrameworkKeys = buildFrameworkRegistryAllowedKeys(registryRows)
  const existingPackages = useMemo(() => packageListResponse?.data ?? [], [packageListResponse?.data])
  const loadedPackage = packageResponse?.data ?? null
  const packageAppError = packageError ? normalizeError(packageError) : null
  const dependencyAppError = dependencyError ? normalizeError(dependencyError) : null
  const integrityAppError = integrityError ? normalizeError(integrityError) : null
  const auditAppError = auditError ? normalizeError(auditError) : null
  const runtimeValidationHistoryAppError = runtimeValidationHistoryError ? normalizeError(runtimeValidationHistoryError) : null
  const legacyContractFieldsDetected = useMemo(
    () => isEditMode && hasLegacyFrameworkPackageContractFields(loadedPackage),
    [isEditMode, loadedPackage],
  )

  const validationOptions = useMemo(
    () =>
      (validationRegistryResponse?.data ?? [])
        .filter((row) =>
          String(row.status ?? '').toUpperCase() === 'ACTIVE'
          && row.packageUsable !== false
          && (!form.frameworkKey || (row.supportedFrameworkKeys ?? []).includes(form.frameworkKey)),
        )
        .map((row) => ({
          value: row.key,
          label: `${row.label ?? row.key} (${row.key})`,
        })),
    [form.frameworkKey, validationRegistryResponse],
  )

  const workflowPolicyOptions = useMemo(
    () =>
      (workflowPolicyResponse?.data ?? [])
        .filter((row) =>
          String(row.status ?? '').toUpperCase() === 'ACTIVE'
          && (!form.frameworkKey || (row.frameworkKeys ?? []).includes(form.frameworkKey)),
        )
        .map((row) => ({
          value: row.key,
          label: `${row.name ?? row.key} (${row.key})`,
        })),
    [form.frameworkKey, workflowPolicyResponse],
  )

  const uiContractRows = useMemo(
    () => {
      const rowsByKey = new Map()
      for (const row of [
        ...(uiContractResponse?.data ?? []),
        ...(selectedUiContractResponse?.data ?? []),
      ]) {
        const key = String(row?.uiContractKey ?? '').trim()
        if (!key || rowsByKey.has(key)) continue
        rowsByKey.set(key, row)
      }
      return [...rowsByKey.values()]
    },
    [selectedUiContractResponse, uiContractResponse],
  )

  const selectedUiContract = useMemo(
    () => uiContractRows.find((row) => row.uiContractKey === form.uiContractKey) ?? null,
    [form.uiContractKey, uiContractRows],
  )

  const uiContractOptions = useMemo(() => {
    const optionRows = uiContractRows.filter((row) =>
      String(row.status ?? '').toUpperCase() === 'ACTIVE'
      || row.uiContractKey === selectedUiContract?.uiContractKey)

    return [
      { value: '', label: 'No UI Contract selected' },
      ...optionRows.map((row) => ({
        value: row.uiContractKey,
        label: `${row.name ?? row.uiContractKey} (${row.uiContractKey})${
          row.status && row.status !== 'ACTIVE' ? ` - ${row.status}` : ''
        }`,
      })),
    ]
  }, [selectedUiContract, uiContractRows])

  const uiContractCompatibility = useMemo(() => {
    const packageSections = Array.isArray(form.sections) ? form.sections : []
    const packageSectionKeys = packageSections
      .map((section) => normalizeSectionKey(section.sectionKey))
      .filter(Boolean)
    const packageSectionByKey = new Map(packageSections.map((section) => [
      normalizeSectionKey(section.sectionKey),
      normalizeRuntimePath(section.runtimePath),
    ]))

    if (packageSectionKeys.length === 0) {
      return {
        status: 'PASS',
        message: 'No package sections require UI Contract mappings yet.',
        missing: [],
        orphaned: [],
        mismatched: [],
      }
    }

    if (!form.uiContractKey) {
      return {
        status: 'FAIL',
        message: 'Select a UI Contract before validating a package with sections.',
        missing: packageSectionKeys,
        orphaned: [],
        mismatched: [],
      }
    }

    const contractSections = Array.isArray(selectedUiContract?.sections) ? selectedUiContract.sections : []
    const mappedSections = contractSections.filter((section) =>
      section?.isCustom !== true
      && String(section?.source ?? '').trim().toUpperCase() !== 'CUSTOM')
    const mappedSectionByKey = new Map(mappedSections.map((section) => [
      normalizeSectionKey(section.sectionKey),
      normalizeRuntimePath(section.runtimePath),
    ]))
    const missing = packageSectionKeys.filter((sectionKey) => !mappedSectionByKey.has(sectionKey))
    const orphaned = [...mappedSectionByKey.keys()].filter((sectionKey) => !packageSectionByKey.has(sectionKey))
    const mismatched = packageSectionKeys.filter((sectionKey) =>
      mappedSectionByKey.has(sectionKey)
      && mappedSectionByKey.get(sectionKey) !== packageSectionByKey.get(sectionKey))

    if (!selectedUiContract) {
      return {
        status: 'WARN',
        message: 'The selected UI Contract is not in the active compatibility list.',
        missing,
        orphaned,
        mismatched,
      }
    }

    if (missing.length > 0 || orphaned.length > 0 || mismatched.length > 0) {
      return {
        status: 'FAIL',
        message: 'Package sections and UI Contract sections need alignment before validation.',
        missing,
        orphaned,
        mismatched,
      }
    }

    return {
      status: 'PASS',
      message: 'Package sections match the selected UI Contract mappings.',
      missing,
      orphaned,
      mismatched,
    }
  }, [form.sections, form.uiContractKey, selectedUiContract])

  const uiContractBinding = loadedPackage?.uiContractBinding ?? null
  const dependencyData = dependencyResponse?.data ?? null
  const integrityData = integrityResponse?.data ?? null
  const latestCheckpointData = checkpointResult ?? latestCheckpointResponse?.data ?? loadedPackage?.lastCheckpointResult ?? null
  const checkpointIntegrityData = useMemo(
    () => buildCheckpointIntegrityView(latestCheckpointData),
    [latestCheckpointData],
  )
  const displayedIntegrityData = checkpointIntegrityData ?? integrityData
  const auditRows = auditResponse?.data ?? []
  const rawRuntimeValidationHistoryRows = runtimeValidationHistoryResponse?.data
  const runtimeValidationHistoryRows = useMemo(
    () => (rawRuntimeValidationHistoryRows ?? []).map(normalizeRuntimeValidationAuditRow),
    [rawRuntimeValidationHistoryRows],
  )
  const runtimeActivationReadiness = runtimeActivationReadinessResponse?.data ?? null
  const rawRuntimeActivationHistoryRows = runtimeActivationHistoryResponse?.data
  const runtimeActivationHistoryRows = useMemo(
    () => rawRuntimeActivationHistoryRows ?? [],
    [rawRuntimeActivationHistoryRows],
  )
  const runtimeActivationRequirements = Array.isArray(runtimeActivationReadiness?.requirements)
    ? runtimeActivationReadiness.requirements
    : []
  const runtimeActivationBlockingRequirements = runtimeActivationRequirements.filter(
    (requirement) => requirement?.status === 'FAIL',
  )
  const runtimeActivationReadinessLoaded = !isRuntimeActivationReadinessLoading && Boolean(runtimeActivationReadiness)
  const runtimeActivationReadinessReady = runtimeActivationReadiness?.ready === true
  const runtimeActivationReadinessStatus = runtimeActivationReadinessLoaded
    ? String(runtimeActivationReadiness?.status ?? 'BLOCKED').trim().toUpperCase()
    : 'LOADING'
  const runtimeActivationReadinessLabel = runtimeActivationReadinessLoaded
    ? formatGovernanceToken(runtimeActivationReadinessStatus, 'Blocked')
    : 'Loading'
  const runtimeActivationReadinessVariant = runtimeActivationReadinessLoaded
    ? getCheckStatusVariant(runtimeActivationReadinessReady ? 'PASS' : 'FAIL')
    : 'neutral'
  const runtimeValidationProbePath = useMemo(
    () => normalizeRuntimePath((form.sections ?? []).find((section) => normalizeRuntimePath(section.runtimePath))?.runtimePath),
    [form.sections],
  )
  const latestRuntimeValidation = runtimeValidationResult ?? runtimeValidationHistoryRows[0] ?? null
  const latestRuntimeValidationStatus = deriveRuntimeValidationStatus(latestRuntimeValidation)
  const latestRuntimeValidationIssueRows = useMemo(
    () => (latestRuntimeValidation?.issues ?? []).map((issue, index) => ({
      id: `${issue?.code ?? 'unknown'}:${issue?.path ?? ''}:${index}`,
      code: issue?.code ?? '',
      severity: issue?.severity ?? '',
      path: issue?.path ?? '',
      message: issue?.message ?? '',
      source: issue?.source ?? '',
    })),
    [latestRuntimeValidation],
  )
  const latestRuntimeValidationIssueSummary = getRuntimeValidationIssueSummary(latestRuntimeValidation?.issues)
  const latestRuntimeValidationDecision = getRuntimeValidationDecision(latestRuntimeValidation)
  const latestRuntimeValidationMode = getRuntimeValidationMode(latestRuntimeValidation)
  const latestRuntimeValidationTimestamp = getRuntimeValidationTimestamp(latestRuntimeValidation)
  const latestRuntimeValidationActorLabel = getRuntimeValidationActorLabel(latestRuntimeValidation)
  const runtimeValidationAuditPersistedLabel = getRuntimeValidationAuditPersistedLabel(
    latestRuntimeValidation,
    runtimeValidationHistoryRows,
  )
  const latestRuntimeValidationTimestampParts = formatDateTimeParts(latestRuntimeValidationTimestamp)
  const latestRuntimeValidationDateLabel = latestRuntimeValidationTimestampParts?.dateLabel ?? '--'
  const latestRuntimeValidationTimeLabel = latestRuntimeValidationTimestampParts?.timeLabel ?? '--'
  const runtimeValidationAuditState =
    RUNTIME_VALIDATION_AUDIT_PERSISTED_STATES[runtimeValidationAuditPersistedLabel]
    ?? RUNTIME_VALIDATION_AUDIT_PERSISTED_STATES.UNKNOWN
  const runtimeValidationAuditEvidenceLabel = runtimeValidationAuditState.evidenceLabel
  const runtimeValidationModeCopy = {
    STRICT: 'Blocking findings stop runtime writes.',
    WARN_ONLY: 'Warnings are recorded without blocking.',
    AUDIT_ONLY: 'Findings are captured for evidence only.',
    DISABLED: 'Runtime validation is not enforced.',
  }[latestRuntimeValidationMode] ?? 'Uses the configured validation mode.'
  const runtimeValidationIssueBadgeVariant = latestRuntimeValidationIssueSummary.blocking > 0
    ? 'danger'
    : latestRuntimeValidationIssueSummary.warnings > 0
      ? 'warning'
      : 'success'
  const runtimeValidationIssueBadgeLabel = latestRuntimeValidationIssueSummary.blocking > 0
    ? 'Blocking'
    : latestRuntimeValidationIssueSummary.warnings > 0
      ? 'Warnings'
      : 'Clear'
  const runtimeValidationAuditBadgeVariant = runtimeValidationAuditState.variant
  const runtimeValidationAuditCopy = runtimeValidationAuditState.copy
  const dependencyRows = useMemo(() => [
    ...(dependencyData?.agents ?? []).map((row) => ({ ...row, type: 'Agent' })),
    ...(dependencyData?.skills ?? []).map((row) => ({ ...row, type: 'Skill' })),
    ...(dependencyData?.runtimePaths ?? []).map((row) => ({ ...row, type: 'Runtime Path' })),
    ...(dependencyData?.validations ?? []).map((row) => ({ ...row, type: 'Validation' })),
    ...(dependencyData?.workflowPolicies ?? []).map((row) => ({ ...row, type: 'Workflow Policy' })),
    ...(dependencyData?.uiContract ? [{ ...dependencyData.uiContract, type: 'UI Contract' }] : []),
  ], [dependencyData])
  const dependencyFilterOptions = useMemo(() =>
    DEPENDENCY_TYPE_FILTERS.map((filter) => ({
      ...filter,
      count: filter.value
        ? dependencyRows.filter((row) => row.type === filter.value).length
        : dependencyRows.length,
    })),
  [dependencyRows])
  const filteredDependencyRows = useMemo(() => {
    if (!dependencyTypeFilter) return dependencyRows
    return dependencyRows.filter((row) => row.type === dependencyTypeFilter)
  }, [dependencyRows, dependencyTypeFilter])
  const dependencyEmptyMessage = dependencyTypeFilter
    ? `No ${dependencyTypeFilter.toLowerCase()} dependencies resolved for this package.`
    : 'No runtime dependencies resolved for this package.'
  const integrityRows = displayedIntegrityData?.checks ?? []
  const activePackageLocked = isEditMode && form.status === FRAMEWORK_PACKAGE_STATUSES.ACTIVE
  const validatedStructureLocked = isEditMode && form.status === FRAMEWORK_PACKAGE_STATUSES.VALIDATED
  const deprecatedPackageLocked = isEditMode && form.status === FRAMEWORK_PACKAGE_STATUSES.DEPRECATED
  const directEditLocked = activePackageLocked || validatedStructureLocked || deprecatedPackageLocked
  const runtimeStructureLocked = directEditLocked
  const cloneSourceLoaded = !isCloneMode || Boolean(loadedPackage)
  const cloneSourceStatus = String(loadedPackage?.status ?? '').trim().toUpperCase()
  const cloneSourceAllowed = !isCloneMode
    || cloneSourceStatus === FRAMEWORK_PACKAGE_STATUSES.ACTIVE
    || cloneSourceStatus === FRAMEWORK_PACKAGE_STATUSES.VALIDATED
  const cloneSaveDisabled = directEditLocked || (isCloneMode && (!cloneSourceLoaded || !cloneSourceAllowed))
  const latestCheckpointStatus = String(
    latestCheckpointData?.status
    || 'NOT_RUN',
  ).trim().toUpperCase()
  const latestCheckpointSummary = normalizeCheckpointSummary(latestCheckpointData)
  const latestCheckpointTimestamp = getCheckpointTimestamp(latestCheckpointData, loadedPackage)
  const latestCheckpointTimestampParts = formatDateTimeParts(latestCheckpointTimestamp)
  const latestCheckpointDateLabel = latestCheckpointTimestampParts?.dateLabel ?? '--'
  const latestCheckpointTimeLabel = latestCheckpointTimestampParts?.timeLabel ?? '--'
  const latestCheckpointDisplay = formatCheckpointDisplay(latestCheckpointStatus)
  const latestCheckpointTone = getCheckStatusVariant(latestCheckpointStatus)
  const latestCheckpointBadgeVariant = latestCheckpointTone === 'error' ? 'danger' : latestCheckpointTone
  const latestCheckpointMode = formatGovernanceToken(latestCheckpointData?.mode, 'Mode not recorded')
  const checkpointHasRun = latestCheckpointStatus !== 'NOT_RUN'
  const checkpointPrimaryMetricLabel = checkpointHasRun ? 'Passed' : 'Runs'
  const checkpointPrimaryMetricValue = checkpointHasRun ? latestCheckpointSummary.passed : 0
  const dependencyLockMeta = getDependencyLockMeta(loadedPackage, latestCheckpointData)
  const latestRuntimeActivationSnapshot = useMemo(() => {
    const rows = Array.isArray(runtimeActivationHistoryRows) ? runtimeActivationHistoryRows : []
    return rows.find((row) =>
      String(row?.activationStatus ?? '').trim().toUpperCase() === 'ACTIVE')
      ?? rows[0]
      ?? null
  }, [runtimeActivationHistoryRows])
  const runtimeEvidenceIdentifierRows = useMemo(() => {
    if (!activePackageLocked || !latestRuntimeActivationSnapshot) return []

    return [
      {
        key: 'activationId',
        label: 'Activation ID',
        value: getEvidenceIdentifierValue(
          latestRuntimeActivationSnapshot.activationId,
          latestRuntimeActivationSnapshot.id,
        ),
      },
      {
        key: 'deploymentId',
        label: 'Deployment ID',
        value: getEvidenceIdentifierValue(latestRuntimeActivationSnapshot.deploymentId),
      },
      {
        key: 'dependencySnapshotId',
        label: 'Dependency Snapshot',
        value: getEvidenceIdentifierValue(latestRuntimeActivationSnapshot.dependencySnapshotId),
      },
      {
        key: 'dependencySnapshotHash',
        label: 'Dependency Hash',
        value: getEvidenceIdentifierValue(latestRuntimeActivationSnapshot.dependencySnapshotHash),
      },
    ].filter((row) => row.value)
  }, [
    activePackageLocked,
    latestRuntimeActivationSnapshot,
  ])
  const dependencyLockEvidenceStateLabel = dependencyLockMeta.hasPersistedLock
    ? 'Locked'
    : dependencyLockMeta.referenceCount > 0
      ? 'Preview'
      : 'Not locked'
  const dependencyLockEvidenceBadgeVariant = dependencyLockMeta.hasPersistedLock
    ? 'success'
    : dependencyLockMeta.referenceCount > 0
      ? 'warning'
      : 'neutral'
  const dependencyLockEvidenceHeadline = dependencyLockMeta.referenceCount > 0
    ? `${dependencyLockMeta.referenceCount} dependency ${dependencyLockMeta.referenceCount === 1 ? 'ref' : 'refs'} ${dependencyLockMeta.hasPersistedLock ? 'certified' : 'previewed'}`
    : 'No dependency snapshot'
  const dependencyLockEvidenceCopy = dependencyLockMeta.hasPersistedLock
    ? 'Persisted evidence from package validation.'
    : dependencyLockMeta.referenceCount > 0
      ? 'Checkpoint evidence exists, but the package lock has not been persisted.'
      : 'Run package validation to record dependency evidence.'
  const currentRuntimeValidationState = getRuntimeValidationCurrentState({
    validation: latestRuntimeValidation,
    status: latestRuntimeValidationStatus,
    checkpointStatus: latestCheckpointStatus,
    probePath: runtimeValidationProbePath,
    dependencyLockMeta,
    isLiveProbe: Boolean(runtimeValidationResult),
  })
  const runtimeValidationStateWord = currentRuntimeValidationState.state === 'VALID'
    ? latestRuntimeValidationStatus
    : currentRuntimeValidationState.state
  const runtimeValidationIsStale = currentRuntimeValidationState.state === 'STALE'
  const runtimeValidationDecisionTone = runtimeValidationIsStale
    ? currentRuntimeValidationState.state
    : latestRuntimeValidationDecision
  const runtimeValidationDecisionLabel = runtimeValidationIsStale
    ? 'Rerun Required'
    : formatGovernanceToken(latestRuntimeValidationDecision, 'Not Run')
  const runtimeValidationDecisionCopy = runtimeValidationIsStale
    ? runtimeValidationDecisionLabel
    : `Decision: ${runtimeValidationDecisionLabel}`
  const runtimeValidationResultLabel = runtimeValidationIsStale ? 'Last Result' : 'Result'
  const runtimeValidationOutcomeLabel = runtimeValidationIsStale ? 'Last Outcome' : 'Outcome'
  const latestCheckpointAllowsActivation =
    latestCheckpointStatus === 'PASS'
    || latestCheckpointStatus === 'PASS_WITH_WARNINGS'
  const activationCheckpointBlockingRequirement = latestCheckpointAllowsActivation
    ? null
    : {
        key: 'checkpoint',
        status: 'FAIL',
        reason: latestCheckpointStatus === 'FAIL' ? 'RUNTIME_CHECKPOINT_FAILED' : 'RUNTIME_CHECKPOINT_NOT_READY',
        message: latestCheckpointStatus === 'FAIL'
          ? `${Number(latestCheckpointData?.summary?.failed) || 0} blocking checkpoint issue${Number(latestCheckpointData?.summary?.failed) === 1 ? '' : 's'} must be resolved before activation.`
          : 'Run the Runtime Architecture Checkpoint before activation.',
      }
  const runtimeActivationEffectiveReady = runtimeActivationReadinessReady && !activationCheckpointBlockingRequirement
  const runtimeActivationEffectiveLabel = activationCheckpointBlockingRequirement
    ? latestCheckpointDisplay.text
    : runtimeActivationReadinessLabel
  const runtimeActivationEffectiveVariant = activationCheckpointBlockingRequirement
    ? getCheckStatusVariant(latestCheckpointStatus)
    : runtimeActivationReadinessVariant
  const runtimeActivationEffectiveBlockingRequirements = activationCheckpointBlockingRequirement
    ? [activationCheckpointBlockingRequirement]
    : runtimeActivationBlockingRequirements
  const runtimeActivationEffectivePrimaryBlockingRequirement =
    runtimeActivationEffectiveBlockingRequirements[0] ?? null
  const runtimeActivationReadinessCopy = runtimeActivationReadinessLoaded
    ? runtimeActivationEffectiveReady
      ? 'Activation readiness is complete. The engine will register an immutable deployment snapshot.'
      : runtimeActivationEffectivePrimaryBlockingRequirement?.message || 'Activation readiness requirements are not met.'
    : 'Loading activation readiness.'
  const dependencySnapshotLabel = `${dependencyLockMeta.hasPersistedLock ? 'Locked' : dependencyLockMeta.referenceCount > 0 ? 'Preview' : 'Not Locked'} - ${dependencyLockMeta.referenceCount} refs`
  const checkpointRuntimeUse = latestCheckpointStatus === 'FAIL'
    ? 'Checkpoint issue review required'
    : latestCheckpointAllowsActivation
      ? 'Checkpoint evidence certified'
      : 'Checkpoint evidence pending'
  const checkpointRuntimeUseCopy = latestCheckpointAllowsActivation
    ? 'Checkpoint evidence certifies architecture readiness; activation re-runs the checkpoint and relies on the locked dependency snapshot for runtime use.'
    : dependencyLockMeta.referenceCount > 0
      ? 'Imported dependency snapshot evidence is available; run the Runtime Architecture Checkpoint to certify architecture readiness.'
      : 'Run the Runtime Architecture Checkpoint to certify architecture readiness and record dependency evidence.'
  const checkpointActorLabel = getCheckpointActorLabel(latestCheckpointData)
  const packageRoleLabel = loadedPackage?.isDefault ? 'Default Package' : 'Framework Package'
  const packageRoleCopy = isEditMode
    ? 'Editor surface for an existing framework package.'
    : isCloneMode
      ? 'Clone surface for a governed draft package.'
      : 'Editor surface for a new framework package.'
  // Only drafts enter validation; validated/active/deprecated packages must use their governed paths.
  const canValidatePackage = isEditMode && form.status === FRAMEWORK_PACKAGE_STATUSES.DRAFT
  const canActivatePackage = Boolean(
    isEditMode
    && form.status === FRAMEWORK_PACKAGE_STATUSES.VALIDATED
    && normalizeSectionKey(form.packageKey)
    && (!Array.isArray(form.sections) || form.sections.length === 0 || Boolean(String(form.uiContractKey ?? '').trim()))
    && latestCheckpointAllowsActivation
    && runtimeActivationReadinessLoaded
    && runtimeActivationReadinessReady
    && !isRuntimeActivationReadinessFetching
  )

  const handleCopyRuntimeEvidenceIdentifier = async (label, value) => {
    const normalizedValue = String(value ?? '').trim()
    if (!normalizedValue) return

    try {
      clearTextSelection()
      await copyRuntimeEvidenceValue(normalizedValue)
      addToast({
        title: `${label} copied`,
        description: 'Runtime evidence identifier copied to clipboard.',
        variant: 'success',
      })
    } catch {
      addToast({
        title: 'Unable to copy identifier',
        description: `${label} could not be copied. Select the value manually.`,
        variant: 'error',
      })
    }
  }

  const closeSectionDialog = () => {
    const nextDialog = {
      open: false,
      index: -1,
      draft: { ...EMPTY_SECTION_DRAFT },
    }
    sectionDialogRef.current = nextDialog
    setSectionDialog(nextDialog)
  }

  const openAddSectionDialog = () => {
    const nextDialog = {
      open: true,
      index: -1,
      draft: { ...EMPTY_SECTION_DRAFT, validationKeys: [] },
    }
    sectionDialogRef.current = nextDialog
    setSectionDialog(nextDialog)
  }

  const openEditSectionDialog = (section, index) => {
    const nextDialog = {
      open: true,
      index,
      draft: {
        ...EMPTY_SECTION_DRAFT,
        ...section,
        sectionKey: normalizeSectionKey(section.sectionKey),
        runtimePath: normalizeRuntimePath(section.runtimePath),
        required: section.required !== false,
        validationKeys: Array.isArray(section.validationKeys) ? [...section.validationKeys] : [],
        notes: String(section.notes ?? '').trim(),
      },
    }
    sectionDialogRef.current = nextDialog
    setSectionDialog(nextDialog)
  }

  const updateSectionDraft = (key, value) => {
    const nextDialog = {
      ...sectionDialogRef.current,
      draft: {
        ...sectionDialogRef.current.draft,
        [key]: value,
      },
    }
    sectionDialogRef.current = nextDialog
    setSectionDialog(nextDialog)
  }

  const applySelectedSectionRuntimePath = (runtimePathValue) => {
    const runtimePath = normalizeRuntimePath(runtimePathValue)
    const sectionKey = deriveSectionKeyFromRuntimePath(runtimePath)
    const nextDialog = {
      ...sectionDialogRef.current,
      draft: {
        ...sectionDialogRef.current.draft,
        runtimePath,
        sectionKey: sectionKey || sectionDialogRef.current.draft.sectionKey,
      },
    }
    sectionDialogRef.current = nextDialog
    setSectionDialog(nextDialog)
  }

  const handleSectionRuntimePathChange = (selectedRuntimePaths) => {
    const [runtimePath = ''] = selectedRuntimePaths
    applySelectedSectionRuntimePath(runtimePath)
  }

  const handleSectionRuntimePathSelect = (runtimePathRow) => {
    const runtimePath = normalizeRuntimePath(runtimePathRow?.pathKey)
    if (!runtimePath) return
    applySelectedSectionRuntimePath(runtimePath)
  }

  const handleSaveSection = () => {
    const currentDialog = sectionDialogRef.current
    const nextSection = {
      sectionKey: normalizeSectionKey(currentDialog.draft.sectionKey),
      runtimePath: normalizeRuntimePath(currentDialog.draft.runtimePath),
      required: currentDialog.draft.required !== false,
      validationKeys: Array.isArray(currentDialog.draft.validationKeys)
        ? currentDialog.draft.validationKeys
        : [],
      notes: String(currentDialog.draft.notes ?? '').trim(),
    }
    setForm((current) => {
      const currentSections = current.sections ?? []
      const nextSections = currentDialog.index >= 0
        ? currentSections.map((section, index) =>
            index === currentDialog.index ? nextSection : section,
          )
        : [...currentSections, nextSection]

      return {
        ...current,
        sections: nextSections,
      }
    })
    setErrors((current) => {
      const remainingErrors = { ...current }
      delete remainingErrors.sections
      delete remainingErrors.sectionsText
      return remainingErrors
    })
    closeSectionDialog()
  }

  const sectionRows = useMemo(
    () => (form.sections ?? []).map((section, index) => ({
      ...section,
      id: `${section.sectionKey || 'section'}-${index}`,
      index,
    })),
    [form.sections],
  )

  const sectionColumns = [
    {
      key: 'sectionKey',
      label: 'Section Key',
      width: '18%',
      render: (sectionKey) => (
        <code className="super-admin-framework-package-editor__code-token">
          {sectionKey || '--'}
        </code>
      ),
    },
    {
      key: 'runtimePath',
      label: 'Runtime Path',
      width: '42%',
      render: (runtimePath) => (
        <span className="super-admin-framework-package-editor__path-token">
          {runtimePath || 'Runtime path required'}
        </span>
      ),
    },
    {
      key: 'required',
      label: 'Required',
      width: '12%',
      render: (required) => (
        <Badge variant={required !== false ? 'success' : 'neutral'} size="sm" pill>
          {required !== false ? 'Required' : 'Optional'}
        </Badge>
      ),
    },
    {
      key: 'validationKeys',
      label: 'Validation',
      width: '14%',
      render: (validationKeys) => {
        const count = Array.isArray(validationKeys) ? validationKeys.length : 0
        return count > 0 ? `${count} key${count === 1 ? '' : 's'}` : 'Future'
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '14%',
      render: (_value, row) => (
        <div className="super-admin-framework-package-editor__table-actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => openEditSectionDialog(row, row.index)}
            disabled={runtimeStructureLocked}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeSection(setForm, row.index)}
            disabled={runtimeStructureLocked}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ]

  useEffect(() => {
    runtimeValidationProbeRequestRef.current += 1
    cloneHydratedSourceRef.current = ''
    // Synchronous reset is intentional here: deferring it can drop a same-tick mutation probe result.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRuntimeValidationResult(null)
    setRuntimeValidationFilters({ ...INITIAL_RUNTIME_VALIDATION_FILTERS })
    setRuntimeValidationCodeDetail(null)
    setIntegrityMessageDetail(null)
  }, [loadedPackageId])

  useEffect(() => {
    if (!isEditMode || !loadedPackage) return
    // Loading the editor form synchronously avoids a blank-form paint on route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(mapFrameworkPackageToForm(loadedPackage))
  }, [isEditMode, loadedPackage])

  useEffect(() => {
    if (!isCloneMode || !loadedPackage) return
    const sourceId = String(loadedPackage.id ?? cloneFromPackageId)
    if (cloneHydratedSourceRef.current === sourceId) return
    cloneHydratedSourceRef.current = sourceId

    const sourceForm = mapFrameworkPackageToForm(loadedPackage)
    // Clone mode must start as an editable draft with release identifiers supplied by the operator.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      ...sourceForm,
      version: '',
      packageKey: '',
      packageName: sourceForm.packageName ? `${sourceForm.packageName} Clone` : '',
      status: FRAMEWORK_PACKAGE_STATUSES.DRAFT,
      isDefault: false,
      derivedFromPackageId: loadedPackage.id ?? cloneFromPackageId,
    })
  }, [cloneFromPackageId, isCloneMode, loadedPackage])

  useEffect(() => {
    if (isEditMode || isCloneMode || !Array.isArray(registryRows) || registryRows.length === 0) {
      return
    }

    // The create form should hydrate with registry defaults before the first interactive paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) =>
      current.frameworkKey ? current : buildDefaultFrameworkPackageForm(registryRows),
    )
  }, [isCloneMode, isEditMode, registryRows])

  useEffect(() => {
    const tabParam = String(searchParams.get('tab') ?? '').trim().toLowerCase()
    const nextTab = FRAMEWORK_PACKAGE_EDITOR_TAB_QUERY[tabParam]
    if (nextTab === undefined) return
    // Query-param tabs need to settle during route hydration so deep links land on the requested editor section.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTab(nextTab)
  }, [searchParams])

  useEffect(() => {
    if (!runtimeValidationResult || runtimeValidationAuditPersistedLabel !== 'YES') return
    // Once the live probe is persisted in history, history owns the displayed state.
    // Clearing the live result changes the persisted label back to NO, so the effect converges after one pass.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRuntimeValidationResult(null)
  }, [runtimeValidationAuditPersistedLabel, runtimeValidationResult])

  const navigateToFrameworkPackages = (options) => {
    navigate('/super-admin/runtime-control/framework-packages', options)
  }

  const handleBack = () => {
    navigateToFrameworkPackages()
  }

  const handleClonePackage = () => {
    const sourceId = loadedPackage?.id ?? packageId
    if (!sourceId) return
    navigate(`/super-admin/runtime-control/framework-packages/new?cloneFrom=${encodeURIComponent(sourceId)}`)
  }

  const setEditorTablePage = (tableKey, nextPage, totalPages) => {
    setTablePages((current) => ({
      ...current,
      [tableKey]: getClampedPage(nextPage, totalPages),
    }))
  }

  const updateRuntimeValidationFilter = (key, value) => {
    setRuntimeValidationFilters((current) => ({
      ...current,
      [key]: value,
    }))
    setTablePages((current) => ({
      ...current,
      runtimeValidation: 1,
    }))
  }

  const clearRuntimeValidationFilters = () => {
    setRuntimeValidationFilters({ ...INITIAL_RUNTIME_VALIDATION_FILTERS })
    setTablePages((current) => ({
      ...current,
      runtimeValidation: 1,
    }))
  }

  const updateDependencyTypeFilter = (value) => {
    setDependencyTypeFilter(value)
    setTablePages((current) => ({
      ...current,
      dependencies: 1,
    }))
  }

  const handleRuntimePathClickthrough = (runtimePath) => {
    const pathId = getRuntimePathNavigationId(runtimePath, dependencyRows)
    if (!pathId) return
    navigate(`/super-admin/runtime-control/runtime-paths/${encodeURIComponent(pathId)}/edit`)
  }

  const handleDependencyClickthrough = (row) => {
    const target = getDependencyNavigationTarget(row)
    if (!target) return
    navigate(target)
  }

  const executeSave = async (payload) => {
    try {
      if (isEditMode) {
        await updateFrameworkPackage({ packageId, ...payload }).unwrap()
        addToast({
          title: 'Framework package updated',
          description: 'Changes were saved successfully.',
          variant: 'success',
        })
      } else if (isCloneMode) {
        await cloneFrameworkPackage({
          packageId: cloneFromPackageId,
          version: payload.version,
          packageKey: payload.packageKey,
          packageName: payload.packageName,
          description: payload.description,
        }).unwrap()
        addToast({
          title: 'Framework package cloned',
          description: `${payload.frameworkKey} ${payload.version} is now available as an editable draft.`,
          variant: 'success',
        })
      } else {
        await createFrameworkPackage(payload).unwrap()
        addToast({
          title: 'Framework package created',
          description: `${payload.frameworkKey} ${payload.version} is now available in the catalogue.`,
          variant: 'success',
        })
      }

      navigateToFrameworkPackages({ state: { runtimeControlSaved: true } })
    } catch (err) {
      const appError = normalizeError(err)
      const fieldErrors = getRuntimeControlFieldErrorMap(appError, SERVER_ERROR_FIELDS)

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        return
      }
      addToast({
        title: isEditMode
          ? 'Failed to update framework package'
          : isCloneMode
            ? 'Failed to clone framework package'
            : 'Failed to create framework package',
        description: appError.message,
        variant: 'error',
      })
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors({})

    if (directEditLocked) {
      const lockedDescription = activePackageLocked
        ? 'Clone the active package before making runtime contract changes.'
        : validatedStructureLocked
          ? 'Clone the validated package before making runtime contract changes.'
          : 'Deprecated packages are read-only.'
      addToast({
        title: 'Package is locked',
        description: lockedDescription,
        variant: 'warning',
      })
      return
    }

    if (isCloneMode && (!cloneSourceLoaded || !cloneSourceAllowed)) {
      addToast({
        title: 'Clone source is not eligible',
        description: 'Only active or validated framework packages can be cloned.',
        variant: 'warning',
      })
      return
    }

    const { errors: nextErrors, payload } = validateFrameworkPackageForm(
      form,
      existingPackages,
      isEditMode ? packageId : '',
      supportedFrameworkKeys,
    )
    if (isCloneMode && !payload.packageKey) {
      nextErrors.packageKey = 'Package key is required for cloned packages.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    await executeSave(payload)
  }

  const refreshRuntimePackageReadiness = () => {
    refetchPackage?.()
    refetchDependencies?.()
    refetchIntegrity?.()
    refetchLatestCheckpoint?.()
    refetchRuntimeValidationHistory?.()
    refetchRuntimeActivationReadiness?.()
    refetchRuntimeActivationHistory?.()
  }

  const handleRunRuntimeValidationProbe = async () => {
    if (!isEditMode || !packageId) return
    if (!runtimeValidationProbePath) {
      addToast({
        title: 'Runtime validation needs a runtime path',
        description: 'Add a package section runtime path before running the mutation probe.',
        variant: 'warning',
      })
      return
    }

    const probeRequestId = runtimeValidationProbeRequestRef.current + 1
    runtimeValidationProbeRequestRef.current = probeRequestId

    const payload = {
      operationType: 'STATE_WRITE',
      packageId,
      frameworkKey: form.frameworkKey,
      runtimePath: runtimeValidationProbePath,
      skillRoleKey: 'VALIDATOR',
      mode: 'STRICT',
      isPackageLevelValidation: true,
      beforeState: {},
      afterState: { probe: true },
    }

    try {
      const result = await validateRuntimeOperation(payload).unwrap()
      if (runtimeValidationProbeRequestRef.current !== probeRequestId) return
      const validation = result?.data ?? result ?? null
      setRuntimeValidationResult(validation)
      refreshRuntimePackageReadiness()
      const validationBlocked = validation?.result === 'BLOCK'
      addToast({
        title: validationBlocked ? 'Runtime validation blocked' : 'Runtime validation passed',
        description: validationBlocked
          ? 'Review the Runtime Validation tab for behavioral governance issues.'
          : 'The sample runtime mutation is allowed by the current package, path, and role boundaries.',
        variant: validationBlocked ? 'error' : 'success',
      })
    } catch (err) {
      if (runtimeValidationProbeRequestRef.current !== probeRequestId) return
      const validation = getRuntimeValidationFromMutationError(err)
      if (validation) {
        setRuntimeValidationResult(validation)
        refreshRuntimePackageReadiness()
        addToast({
          title: 'Runtime validation blocked',
          description: 'Review the Runtime Validation tab for behavioral governance issues.',
          variant: 'error',
        })
        return
      }

      const appError = normalizeError(err)
      addToast({
        title: 'Failed to run runtime validation',
        description: appError.message,
        variant: 'error',
      })
    }
  }

  const handleRunCheckpoint = async () => {
    if (!isEditMode || !packageId) return
    try {
      const result = await runFrameworkPackageCheckpoint({
        packageId,
        mode: 'FULL',
        persist: true,
      }).unwrap()
      const checkpoint = result?.data ?? result ?? null
      setCheckpointResult(checkpoint)
      refreshRuntimePackageReadiness()
      addToast({
        title: checkpoint?.status === 'FAIL' ? 'Checkpoint failed' : 'Checkpoint completed',
        description: checkpoint?.status === 'FAIL'
          ? 'Resolve blocking checkpoint issues before activation.'
          : 'Runtime Architecture Checkpoint completed.',
        variant: checkpoint?.status === 'FAIL' ? 'error' : 'success',
      })
    } catch (err) {
      const appError = normalizeError(err)
      addToast({
        title: 'Failed to run checkpoint',
        description: appError.message,
        variant: 'error',
      })
    }
  }

  const handleValidatePackage = async () => {
    if (!isEditMode || !packageId) return
    try {
      const result = await validateFrameworkPackage({ packageId }).unwrap()
      const checkpoint = result?.data?.checkpoint ?? result?.checkpoint ?? null
      setCheckpointResult(checkpoint)
      refreshRuntimePackageReadiness()
      addToast({
        title: checkpoint?.status === 'FAIL' ? 'Checkpoint failed' : 'Package validated',
        description: checkpoint?.status === 'FAIL'
          ? 'Resolve blocking checkpoint issues before activation.'
          : 'Runtime Architecture Checkpoint passed and the package is validated.',
        variant: checkpoint?.status === 'FAIL' ? 'error' : 'success',
      })
    } catch (err) {
      const checkpoint = getCheckpointFromMutationError(err)
      if (checkpoint) {
        setCheckpointResult(checkpoint)
        refreshRuntimePackageReadiness()
        addToast({
          title: 'Checkpoint failed',
          description: 'Resolve blocking checkpoint issues before activation.',
          variant: 'error',
        })
        return
      }

      const appError = normalizeError(err)
      addToast({
        title: 'Failed to validate package',
        description: appError.message,
        variant: 'error',
      })
    }
  }

  const handleConfirmActivatePackage = async () => {
    if (!isEditMode || !packageId) return
    try {
      await activateFrameworkPackage({ packageId }).unwrap()
      setActivationDialogOpen(false)
      setCheckpointResult(null)
      refreshRuntimePackageReadiness()
      addToast({
        title: 'Framework package activated',
        description: 'Activation checkpoint passed and the package is now active.',
        variant: 'success',
      })
    } catch (err) {
      const appError = normalizeError(err)
      setActivationDialogOpen(false)
      addToast({
        title: 'Failed to activate package',
        description: appError.message,
        variant: 'error',
      })
    }
  }

  const pageTitle = isEditMode
    ? 'Framework Package Editor'
    : isCloneMode
      ? 'Clone Framework Package'
      : 'Create Framework Package'
  const canAssignCustomers =
    form.visibility === 'CUSTOMER_VISIBLE'
    && form.customerAccessMode === 'SELECTED_CUSTOMERS'
  const selectedCustomerIds = useMemo(
    () => parseCustomerIdList(form.assignedCustomerIds),
    [form.assignedCustomerIds],
  )
  const tabErrorCounts = {
    frameworkIdentity: countErrorsForFields(errors, ['frameworkKey', 'frameworkName', 'version', 'status']),
    packageIdentity: countErrorsForFields(errors, ['packageScope', 'packageType', 'packageKey', 'packageName', 'description']),
    access: countErrorsForFields(errors, ['visibility', 'customerAccessMode', 'assignedCustomerIds']),
    sections: countErrorsForFields(errors, ['sections', 'sectionsText']),
    runtime: countErrorsForFields(errors, ['runtimeSettings', 'executionModel']),
    validation: countErrorsForFields(errors, ['validationBindings']),
    workflows: countErrorsForFields(errors, ['workflowBindings']),
    outputs: countErrorsForFields(errors, ['availableOutputKeys', 'defaultOutputStyles', 'artifactRetentionDays']),
    uiContract: countErrorsForFields(errors, ['uiContractKey']),
    stateContract: countErrorsForFields(errors, [
      'stateModelKey',
      'stateModelVersion',
      'stateModelMode',
      'stateBindingMode',
      'statePersistence',
      'stateContractNotes',
    ]),
  }

  const currentPackageJson = useMemo(() => {
    const { payload } = validateFrameworkPackageForm(
      form,
      existingPackages,
      packageId,
      supportedFrameworkKeys,
    )
    return {
      ...(loadedPackage ?? {}),
      ...payload,
      uiContractBinding,
    }
  }, [existingPackages, form, loadedPackage, packageId, supportedFrameworkKeys, uiContractBinding])

  const sectionTableTotalPages = getTableTotalPages(sectionRows.length)
  const sectionTablePage = getClampedPage(tablePages.sections, sectionTableTotalPages)
  const paginatedSectionRows = getPaginatedRows(sectionRows, sectionTablePage)

  const dependencyTableTotalPages = getTableTotalPages(filteredDependencyRows.length)
  const dependencyTablePage = getClampedPage(tablePages.dependencies, dependencyTableTotalPages)
  const paginatedDependencyRows = getPaginatedRows(filteredDependencyRows, dependencyTablePage)

  const integrityTableTotalPages = getTableTotalPages(integrityRows.length)
  const integrityTablePage = getClampedPage(tablePages.integrity, integrityTableTotalPages)
  const paginatedIntegrityRows = getPaginatedRows(integrityRows, integrityTablePage)

  const runtimeValidationOperationOptions = useMemo(
    () => [
      { value: '', label: 'All operations' },
      ...[...new Set(
        runtimeValidationHistoryRows
          .map((row) => normalizeRuntimeValidationOperationType(row?.operationType))
          .filter(Boolean),
      )].sort().map((operationType) => ({ value: operationType, label: operationType })),
    ],
    [runtimeValidationHistoryRows],
  )
  const filteredRuntimeValidationRows = useMemo(
    () => filterRuntimeValidationRows(
      runtimeValidationHistoryRows,
      runtimeValidationFilters,
    ),
    [runtimeValidationHistoryRows, runtimeValidationFilters],
  )
  // ISO date-input values sort lexicographically in the same order as calendar dates.
  const runtimeValidationDateRangeInvalid = Boolean(
    runtimeValidationFilters.dateFrom
    && runtimeValidationFilters.dateTo
    && runtimeValidationFilters.dateFrom > runtimeValidationFilters.dateTo,
  )
  const runtimeValidationAuditEmptyMessage = runtimeValidationHistoryRows.length === 0
    ? 'No runtime validation audit rows yet. Run the mutation probe to create one.'
    : 'No runtime validation audit rows match the current filters.'
  const runtimeValidationTableTotalPages = getTableTotalPages(filteredRuntimeValidationRows.length)
  const runtimeValidationTablePage = getClampedPage(tablePages.runtimeValidation, runtimeValidationTableTotalPages)
  const paginatedRuntimeValidationRows = getPaginatedRows(filteredRuntimeValidationRows, runtimeValidationTablePage)

  const auditTableTotalPages = getTableTotalPages(auditRows.length)
  const auditTablePage = getClampedPage(tablePages.audit, auditTableTotalPages)
  const paginatedAuditRows = getPaginatedRows(auditRows, auditTablePage)

  return (
    <section
      className="super-admin-framework-packages super-admin-framework-package-editor container"
      aria-label="Framework package editor"
    >
      <header className="super-admin-framework-packages__header">
        <h1 className="super-admin-framework-packages__title">{pageTitle}</h1>
        <p className="super-admin-framework-packages__subtitle">
          Assemble deployable framework blueprints with governed access, sections, runtime settings,
          validations, workflow policies, and future output placeholders.
        </p>
      </header>

      <Fieldset className="super-admin-framework-package-editor__fieldset">
        <Fieldset.Legend className="sr-only">Framework package editor</Fieldset.Legend>
        {(isEditMode || isCloneMode) && isPackageLoading ? <PackageEditorLoadingState /> : null}
        {(isEditMode || isCloneMode) && packageAppError ? (
          <PackageEditorErrorState message={packageAppError.message} onBack={handleBack} />
        ) : null}

        {!isPackageLoading && !packageAppError ? (
          <Card variant="elevated" className="super-admin-framework-packages__card super-admin-framework-package-editor__card">
            <form className="super-admin-framework-package-editor__form" onSubmit={handleSubmit} noValidate>
              <Card.Body className="super-admin-framework-packages__card-body super-admin-framework-packages__card-body--compact super-admin-framework-package-editor__card-body">
                <div className="super-admin-framework-package-editor__release-bar">
                  <div className="super-admin-framework-package-editor__release-state" aria-label="Package status summary">
                    {isEditMode ? (
                      <>
                        <Status size="lg" showIcon variant={getFrameworkPackageStatusVariant(form.status)}>
                          Lifecycle: {formatFrameworkPackageStatus(form.status)}
                        </Status>
                        <Status size="lg" showIcon variant={getCheckStatusVariant(latestCheckpointStatus)}>
                          Checkpoint: {latestCheckpointDisplay.text}
                        </Status>
                      </>
                    ) : (
                      <Status size="lg" showIcon variant="neutral">
                        {isCloneMode ? 'Clone Framework Package' : 'New Framework Package'}
                      </Status>
                    )}
                  </div>

                  <div className="super-admin-framework-package-editor__top-actions">
                    {isEditMode && activePackageLocked ? (
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleClonePackage}
                        >
                          Clone Package
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab(FRAMEWORK_PACKAGE_EDITOR_TABS.DEPENDENCIES)}
                        >
                          Dependency Snapshot
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab(FRAMEWORK_PACKAGE_EDITOR_TABS.AUDIT)}
                        >
                          Checkpoint History
                        </Button>
                      </>
                    ) : isEditMode && validatedStructureLocked ? (
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleClonePackage}
                        >
                          Clone Package
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => setActivationDialogOpen(true)}
                          loading={isActivatingPackage}
                          disabled={!canActivatePackage || isSaving || isValidatingPackage}
                        >
                          Activate Package
                        </Button>
                      </>
                    ) : isEditMode && deprecatedPackageLocked ? (
                      null
                    ) : isEditMode ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleValidatePackage}
                          loading={isValidatingPackage}
                          disabled={!canValidatePackage || isSaving || isActivatingPackage}
                        >
                          Validate Package
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => setActivationDialogOpen(true)}
                          loading={isActivatingPackage}
                          disabled={!canActivatePackage || isSaving || isValidatingPackage}
                        >
                          Activate Package
                        </Button>
                      </>
                    ) : null}
                    <Button type="button" variant="outline" size="sm" onClick={handleBack}>
                      Back
                    </Button>
                  </div>
                </div>

                {isEditMode ? (
                  <div className="super-admin-framework-package-editor__governance-summary" aria-label="Runtime release summary">
                    <section
                      className={`super-admin-framework-package-editor__summary-card super-admin-framework-package-editor__summary-card--checkpoint super-admin-framework-package-editor__summary-card--checkpoint-${latestCheckpointTone}`}
                      aria-label={`Checkpoint ${latestCheckpointDisplay.text}`}
                    >
                      <div className="super-admin-framework-package-editor__summary-card-header">
                        <span className="super-admin-framework-package-editor__summary-eyebrow">Checkpoint</span>
                        <Badge variant={latestCheckpointBadgeVariant} size="sm" pill outline>
                          Latest
                        </Badge>
                      </div>
                      <div className="super-admin-framework-package-editor__summary-checkpoint-main">
                        <strong className="super-admin-framework-package-editor__summary-checkpoint-value">
                          {latestCheckpointDisplay.value}
                        </strong>
                        {latestCheckpointDisplay.qualifier ? (
                          <span className="super-admin-framework-package-editor__summary-checkpoint-qualifier">
                            {latestCheckpointDisplay.qualifier}
                          </span>
                        ) : null}
                      </div>
                      <div className="super-admin-framework-package-editor__summary-detail-grid">
                        <div className="super-admin-framework-package-editor__summary-detail-item">
                          <span className="super-admin-framework-package-editor__summary-eyebrow">{checkpointPrimaryMetricLabel}</span>
                          <strong>{checkpointPrimaryMetricValue}</strong>
                        </div>
                        <div className="super-admin-framework-package-editor__summary-detail-item">
                          <span className="super-admin-framework-package-editor__summary-eyebrow">Checks</span>
                          <strong>{latestCheckpointSummary.totalChecks}</strong>
                        </div>
                      </div>
                    </section>

                    <section className="super-admin-framework-package-editor__summary-card super-admin-framework-package-editor__summary-card--intro" aria-labelledby="framework-package-editor-summary-title">
                      <div className="super-admin-framework-package-editor__summary-card-header">
                        <span className="super-admin-framework-package-editor__summary-eyebrow">Framework Package Editor</span>
                        <Badge variant="neutral" size="sm" pill outline>
                          Blueprint
                        </Badge>
                      </div>
                      <h2 id="framework-package-editor-summary-title" className="super-admin-framework-package-editor__summary-title">
                        Use the identity tabs for source and package metadata while runtime blueprint tabs stay focused.
                      </h2>
                      <p className="super-admin-framework-package-editor__summary-copy">
                        Skills and Agents are resolved dependencies, not direct package selections.
                      </p>
                    </section>

                    <section className="super-admin-framework-package-editor__summary-card super-admin-framework-package-editor__summary-card--role" aria-label="Package role">
                      <div className="super-admin-framework-package-editor__summary-card-header">
                        <span className="super-admin-framework-package-editor__summary-eyebrow">Package Role</span>
                        <Badge variant="neutral" size="sm" pill outline>
                          Runtime
                        </Badge>
                      </div>
                      <strong className="super-admin-framework-package-editor__summary-role">{packageRoleLabel}</strong>
                      <p className="super-admin-framework-package-editor__summary-copy">{packageRoleCopy}</p>
                    </section>

                    <div className="super-admin-framework-package-editor__summary-metrics">
                      <div className="super-admin-framework-package-editor__summary-card super-admin-framework-package-editor__summary-card--metric">
                        <div className="super-admin-framework-package-editor__summary-card-header">
                          <span className="super-admin-framework-package-editor__summary-eyebrow">Last Run</span>
                          <Badge variant="neutral" size="sm" pill outline>
                            Checkpoint
                          </Badge>
                        </div>
                        <div className="super-admin-framework-package-editor__summary-time-primary">
                          <div>
                            <span className="super-admin-framework-package-editor__summary-eyebrow">Date</span>
                            <p className="super-admin-framework-package-editor__summary-metric-value">
                              {latestCheckpointDateLabel}
                            </p>
                          </div>
                          <strong className="super-admin-framework-package-editor__summary-time-value">
                            {latestCheckpointTimeLabel}
                          </strong>
                        </div>
                      </div>
                      <section className="super-admin-framework-package-editor__summary-card super-admin-framework-package-editor__summary-card--metric super-admin-framework-package-editor__summary-card--runtime-evidence" aria-label="Runtime checkpoint evidence">
                        <div className="super-admin-framework-package-editor__summary-card-header">
                          <span className="super-admin-framework-package-editor__summary-eyebrow">Runtime Evidence</span>
                          <Badge variant={dependencyLockEvidenceBadgeVariant} size="sm" pill outline>
                            {dependencyLockEvidenceStateLabel}
                          </Badge>
                        </div>
                        <div className="super-admin-framework-package-editor__summary-evidence-primary">
                          <span className="super-admin-framework-package-editor__summary-eyebrow">Snapshot</span>
                          <strong>{dependencySnapshotLabel}</strong>
                        </div>
                        <div className="super-admin-framework-package-editor__summary-inline-metrics">
                          <div className="super-admin-framework-package-editor__summary-metric-item">
                            <span className="super-admin-framework-package-editor__summary-eyebrow">Mode</span>
                            <strong className="super-admin-framework-package-editor__summary-metric-value">{latestCheckpointMode}</strong>
                          </div>
                          <div className="super-admin-framework-package-editor__summary-metric-item">
                            <span className="super-admin-framework-package-editor__summary-eyebrow">References</span>
                            <strong className="super-admin-framework-package-editor__summary-metric-value">{dependencyLockMeta.referenceCount}</strong>
                          </div>
                          <div className="super-admin-framework-package-editor__summary-metric-item">
                            <span className="super-admin-framework-package-editor__summary-eyebrow">Runtime Use</span>
                            <strong className="super-admin-framework-package-editor__summary-metric-value">{checkpointRuntimeUse}</strong>
                          </div>
                        </div>
                        {runtimeEvidenceIdentifierRows.length > 0 ? (
                          <div
                            className="super-admin-framework-package-editor__summary-evidence-identifiers"
                            role="group"
                            aria-label="Runtime evidence identifiers"
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="super-admin-framework-package-editor__summary-evidence-toggle"
                              aria-expanded={runtimeEvidenceIdentifiersOpen}
                              aria-controls={runtimeEvidenceIdentifiersPanelId}
                              rightIcon={(
                                <MdExpandMore
                                  aria-hidden="true"
                                  className="super-admin-framework-package-editor__summary-evidence-toggle-icon"
                                />
                              )}
                              onClick={() => {
                                setRuntimeEvidenceIdentifiersOpen((isOpen) => !isOpen)
                              }}
                            >
                              <span>Runtime evidence identifiers</span>
                              <Badge variant="neutral" size="sm" pill outline>
                                {runtimeEvidenceIdentifierRows.length} IDs
                              </Badge>
                            </Button>
                            {runtimeEvidenceIdentifiersOpen ? (
                              <div
                                id={runtimeEvidenceIdentifiersPanelId}
                                className="super-admin-framework-package-editor__summary-evidence-identifier-list"
                              >
                                {runtimeEvidenceIdentifierRows.map((row) => (
                                  <div
                                    className="super-admin-framework-package-editor__summary-evidence-identifier-row"
                                    key={row.key}
                                  >
                                    <span className="super-admin-framework-package-editor__summary-eyebrow">
                                      {row.label}
                                    </span>
                                    <div className="super-admin-framework-package-editor__summary-evidence-identifier-control">
                                      <code className="super-admin-framework-package-editor__summary-evidence-identifier-value">
                                        {row.value}
                                      </code>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<MdContentCopy aria-hidden="true" />}
                                        data-clipboard-label={row.label}
                                        data-clipboard-value={row.value}
                                        onMouseDown={(event) => {
                                          event.stopPropagation()
                                          clearTextSelection()
                                        }}
                                        onClick={(event) => {
                                          event.preventDefault()
                                          event.stopPropagation()
                                          handleCopyRuntimeEvidenceIdentifier(row.label, row.value)
                                        }}
                                        aria-label={`Copy ${row.label}`}
                                        className="super-admin-framework-package-editor__summary-evidence-copy-button"
                                      >
                                        Copy
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </section>
                      <div className="super-admin-framework-package-editor__summary-card super-admin-framework-package-editor__summary-card--metric">
                        <div className="super-admin-framework-package-editor__summary-card-header">
                          <span className="super-admin-framework-package-editor__summary-eyebrow">Run By</span>
                          <Badge variant="neutral" size="sm" pill outline>
                            Actor
                          </Badge>
                        </div>
                        <div className="super-admin-framework-package-editor__summary-actor-primary">
                          <span className="super-admin-framework-package-editor__summary-eyebrow">Checkpoint Actor</span>
                          <strong className="super-admin-framework-package-editor__summary-metric-value">
                            {checkpointActorLabel}
                          </strong>
                          <p className="super-admin-framework-package-editor__summary-copy">
                            Last checkpoint run owner.
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="sr-only">
                      Lifecycle: {formatFrameworkPackageStatus(form.status)}.
                      Checkpoint: {latestCheckpointDisplay.text}.
                      Checks: {latestCheckpointSummary.passed}/{latestCheckpointSummary.totalChecks}.
                      Last Run: {formatDateTime(latestCheckpointTimestamp)}.
                      Mode: {latestCheckpointMode}.
                      Snapshot: {dependencySnapshotLabel}.
                      Run By: {checkpointActorLabel}.
                      {checkpointRuntimeUseCopy}
                    </p>
                  </div>
                ) : null}

                {!isEditMode ? (
                  <div className="super-admin-framework-package-editor__intro">
                    <p className="super-admin-framework-package-editor__form-title">
                      {packageRoleCopy}
                    </p>
                    <p className="super-admin-framework-packages__table-note">
                      Use the identity tabs for source and package metadata while runtime blueprint tabs stay focused.
                      Skills and Agents are resolved dependencies, not direct package selections.
                    </p>
                  </div>
                ) : null}

                {legacyContractFieldsDetected ? (
                  <Card
                    variant="outlined"
                    className="super-admin-framework-package-editor__legacy-warning"
                    role="status"
                    aria-live="polite"
                  >
                    <Card.Body className="super-admin-framework-package-editor__legacy-warning-body">
                      <Badge variant="warning" size="sm" pill outline>
                        Legacy Contract
                      </Badge>
                      <p className="super-admin-framework-package-editor__helper">
                        This package includes deprecated package-level config. The editor is showing canonical bindings synthesized from that data, and saving will keep only the canonical package contract.
                      </p>
                    </Card.Body>
                  </Card>
                ) : null}

                {isEditMode && form.status !== FRAMEWORK_PACKAGE_STATUSES.ACTIVE && runtimeActivationReadinessLoaded && !runtimeActivationEffectiveReady ? (
                  <Card
                    variant="outlined"
                    className="super-admin-framework-package-editor__readiness-card"
                    role="status"
                    aria-label="Runtime readiness notice"
                    aria-live="polite"
                  >
                    <Card.Body className="super-admin-framework-package-editor__readiness-card-body">
                      <div className="super-admin-framework-package-editor__readiness-card-copy">
                        <Status size="md" showIcon variant={runtimeActivationEffectiveVariant}>
                          Activation Readiness: {runtimeActivationEffectiveLabel}
                        </Status>
                        <p className="super-admin-framework-package-editor__helper">
                          {runtimeActivationReadinessCopy}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab(
                          runtimeActivationEffectivePrimaryBlockingRequirement?.key === 'runtimeVerdict'
                            ? FRAMEWORK_PACKAGE_EDITOR_TABS.VALIDATION
                            : FRAMEWORK_PACKAGE_EDITOR_TABS.INTEGRITY,
                        )}
                      >
                        {runtimeActivationEffectivePrimaryBlockingRequirement?.key === 'runtimeVerdict'
                          ? 'View Runtime Validation'
                          : 'View Checkpoint'}
                      </Button>
                    </Card.Body>
                  </Card>
                ) : null}

                {directEditLocked ? (
                  <Card
                    variant="outlined"
                    className={`super-admin-framework-package-editor__lock-banner ${activePackageLocked || deprecatedPackageLocked ? 'super-admin-framework-package-editor__lock-banner--active' : 'super-admin-framework-package-editor__lock-banner--validated'}`}
                    role="status"
                    aria-live="polite"
                  >
                    <Card.Body className="super-admin-framework-package-editor__lock-banner-body">
                      <Status size="md" showIcon variant={activePackageLocked || deprecatedPackageLocked ? 'error' : 'warning'}>
                        {activePackageLocked
                          ? 'Active Locked'
                          : deprecatedPackageLocked
                            ? 'Deprecated Read Only'
                            : 'Validated Locked'}
                      </Status>
                      <p className="super-admin-framework-packages__table-note">
                        {activePackageLocked
                          ? 'Active framework packages cannot be edited directly. Clone flow is required for changes.'
                          : deprecatedPackageLocked
                            ? 'Deprecated framework packages are retained for audit and cannot be edited or cloned unless a revival workflow is explicitly introduced.'
                            : 'Validated packages are locked for direct edits. Clone the package to create the next draft, or activate it when checkpoint evidence is ready.'}
                      </p>
                    </Card.Body>
                  </Card>
                ) : null}

                {isCloneMode && cloneSourceLoaded && !cloneSourceAllowed ? (
                  <Card
                    variant="outlined"
                    className="super-admin-framework-package-editor__lock-banner super-admin-framework-package-editor__lock-banner--validated"
                    role="status"
                    aria-live="polite"
                  >
                    <Card.Body className="super-admin-framework-package-editor__lock-banner-body">
                      <Status size="md" showIcon variant="warning">
                        Clone Not Available
                      </Status>
                      <p className="super-admin-framework-packages__table-note">
                        Only active or validated framework packages can be cloned. Draft packages should be edited directly, and deprecated packages are view-only.
                      </p>
                    </Card.Body>
                  </Card>
                ) : null}

                <TabView
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  variant="pills"
                  size="sm"
                  evenTabs
                  className="super-admin-framework-package-editor__tabs"
                  aria-label="Framework package editor sections"
                >
                  <TabView.Tab label={renderTabLabel('Framework Identity', tabErrorCounts.frameworkIdentity)}>
                    <div className="super-admin-framework-package-editor__tab-panel super-admin-framework-package-editor__basic-section">
                      <SectionHeader
                        title="Framework Identity"
                        copy="Bind this package to the source framework and release lifecycle."
                      />
                      <div className="super-admin-framework-package-editor__field-group">
                        <div className="super-admin-framework-package-editor__field-grid">
                          <Select
                            id="framework-package-editor-framework-key"
                            label="Framework Key"
                            value={form.frameworkKey}
                            options={frameworkOptions}
                            onChange={(event) => {
                              const nextKey = event.target.value
                              setForm((current) => ({
                                ...current,
                                frameworkKey: nextKey,
                                frameworkName: frameworkNameLookup[nextKey] ?? current.frameworkName,
                              }))
                            }}
                            error={errors.frameworkKey}
                            disabled={runtimeStructureLocked}
                          />
                          <Input
                            id="framework-package-editor-framework-name"
                            label="Framework Name"
                            value={form.frameworkName}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, frameworkName: event.target.value }))
                            }
                            error={errors.frameworkName}
                            disabled={directEditLocked}
                            fullWidth
                          />
                          <Input
                            id="framework-package-editor-version"
                            label="Version"
                            value={form.version}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, version: event.target.value }))
                            }
                            error={errors.version}
                            helperText="Use semantic version format, for example 2.3.1."
                            disabled={runtimeStructureLocked}
                            fullWidth
                          />
                          <Select
                            id="framework-package-editor-status"
                            label="Lifecycle State"
                            value={form.status}
                            options={isEditMode && form.status === FRAMEWORK_PACKAGE_STATUSES.ACTIVE
                              ? [{ value: FRAMEWORK_PACKAGE_STATUSES.ACTIVE, label: 'Active' }]
                              : FRAMEWORK_PACKAGE_FORM_STATUS_OPTIONS}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, status: event.target.value }))
                            }
                            disabled={directEditLocked}
                          />
                        </div>
                      </div>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Package Identity', tabErrorCounts.packageIdentity)}>
                    <div className="super-admin-framework-package-editor__tab-panel super-admin-framework-package-editor__basic-section">
                      <SectionHeader
                        title="Package Identity"
                        copy="Define how this version appears in the package catalogue."
                      />
                      <div className="super-admin-framework-package-editor__field-group">
                        <div className="super-admin-framework-package-editor__field-grid">
                          <Select
                            id="framework-package-editor-package-scope"
                            label="Package Scope"
                            value={form.packageScope}
                            options={FRAMEWORK_PACKAGE_SCOPE_OPTIONS}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, packageScope: event.target.value }))
                            }
                            disabled={directEditLocked}
                          />
                          <Select
                            id="framework-package-editor-package-type"
                            label="Package Type"
                            value={form.packageType}
                            options={FRAMEWORK_PACKAGE_TYPE_OPTIONS}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, packageType: event.target.value }))
                            }
                            disabled={directEditLocked}
                          />
                          <Input
                            id="framework-package-editor-package-key"
                            label="Package Key"
                            value={form.packageKey}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, packageKey: event.target.value }))
                            }
                            error={errors.packageKey}
                            helperText="Drafts can default from framework and version; validation requires a package key."
                            disabled={runtimeStructureLocked}
                            fullWidth
                          />
                          <Input
                            id="framework-package-editor-package-name"
                            label="Package Name"
                            value={form.packageName}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, packageName: event.target.value }))
                            }
                            error={errors.packageName}
                            disabled={directEditLocked}
                            fullWidth
                          />
                        </div>
                      </div>
                      <Textarea
                        id="framework-package-editor-description"
                        label="Description"
                        value={form.description}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, description: event.target.value }))
                        }
                        error={errors.description}
                        rows={3}
                        disabled={directEditLocked}
                        fullWidth
                      />
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Access', tabErrorCounts.access)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Access"
                        copy="Control whether this package remains internal or becomes available to customer workspaces."
                      />
                      <div className="super-admin-framework-package-editor__grid">
                        <Select
                          id="framework-package-editor-visibility"
                          label="Visibility"
                          value={form.visibility}
                          options={FRAMEWORK_PACKAGE_VISIBILITY_OPTIONS}
                          onChange={(event) =>
                            setForm((current) => {
                              const visibility = event.target.value
                              if (visibility === 'INTERNAL_ONLY') {
                                return {
                                  ...current,
                                  visibility,
                                  customerAccessMode: 'ALL_CUSTOMERS',
                                  assignedCustomerIds: '',
                                }
                              }

                              return { ...current, visibility }
                            })
                          }
                          disabled={directEditLocked}
                        />
                        <Select
                          id="framework-package-editor-customer-access-mode"
                          label="Customer Access"
                          value={form.customerAccessMode}
                          options={FRAMEWORK_PACKAGE_CUSTOMER_ACCESS_OPTIONS}
                          onChange={(event) => {
                            const customerAccessMode = event.target.value
                            setForm((current) => ({
                              ...current,
                              customerAccessMode,
                              assignedCustomerIds: customerAccessMode === 'ALL_CUSTOMERS'
                                ? ''
                                : current.assignedCustomerIds,
                            }))
                          }}
                          disabled={directEditLocked || form.visibility === 'INTERNAL_ONLY'}
                          error={errors.customerAccessMode}
                        />
                      </div>
                      <CustomerSearchSelect
                        id="framework-package-editor-assigned-customers"
                        label="Assigned Customers"
                        helperText={canAssignCustomers
                          ? 'Search and select active customers from the Customer table.'
                          : 'Available only when visibility is customer visible and access is selected customers.'}
                        selectedIds={selectedCustomerIds}
                        onChange={(nextCustomerIds) =>
                          setForm((current) => ({
                            ...current,
                            assignedCustomerIds: formatCustomerIdList(nextCustomerIds),
                          }))
                        }
                        error={errors.assignedCustomerIds}
                        disabled={directEditLocked || !canAssignCustomers}
                      />
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Sections', tabErrorCounts.sections)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Sections"
                        copy="Define the structured framework sections this package exposes and requires at runtime."
                      />
                      {errors.sections || errors.sectionsText ? (
                        <p className="super-admin-framework-package-editor__error" role="alert">
                          {errors.sections || errors.sectionsText}
                        </p>
                      ) : null}
                      <div className="super-admin-framework-package-editor__toolbar">
                        <p className="super-admin-framework-package-editor__helper">
                          Package sections define what exists and where it binds in framework_state. Labels, help text,
                          placeholders, and display order belong in the selected UI Contract.
                        </p>
                        <Button type="button" variant="outline" size="sm" onClick={openAddSectionDialog} disabled={runtimeStructureLocked}>
                          Add Section
                        </Button>
                      </div>
                      <TableSurface
                        ariaLabel="Package sections"
                        columns={sectionColumns}
                        data={paginatedSectionRows}
                        emptyMessage="No sections configured yet. Add the runtime sections this package should expose."
                        paginationLabel="Package sections pagination"
                        currentPage={sectionTablePage}
                        totalPages={sectionTableTotalPages}
                        onPageChange={(nextPage) =>
                          setEditorTablePage('sections', nextPage, sectionTableTotalPages)
                        }
                      />
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Runtime', tabErrorCounts.runtime)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Runtime"
                        copy="Configure runtime behavior for package execution without storing runtime instance data."
                      />
                      <div className="super-admin-framework-package-editor__field-group">
                        <div className="super-admin-framework-package-editor__field-group-header">
                          <h3 className="super-admin-framework-package-editor__field-group-title">Execution Model</h3>
                          <p className="super-admin-framework-package-editor__field-group-copy">
                            Define how this package evaluates validations and workflow policies at runtime.
                          </p>
                        </div>
                        <div className="super-admin-framework-package-editor__field-grid">
                          <Select
                            id="framework-package-editor-execution-mode"
                            label="Execution Mode"
                            value={form.executionModel?.mode ?? 'EVENT_DRIVEN'}
                            options={FRAMEWORK_PACKAGE_EXECUTION_MODE_OPTIONS}
                            onChange={(event) => updateExecutionModel(setForm, 'mode', event.target.value)}
                            disabled={runtimeStructureLocked}
                          />
                          <Select
                            id="framework-package-editor-runtime-state-model"
                            label="Runtime State Model"
                            value={form.executionModel?.stateModel ?? 'LIFECYCLE_BASED'}
                            options={FRAMEWORK_PACKAGE_STATE_MODEL_OPTIONS}
                            onChange={(event) => updateExecutionModel(setForm, 'stateModel', event.target.value)}
                            disabled={runtimeStructureLocked}
                          />
                          <Select
                            id="framework-package-editor-evaluation-mode"
                            label="Evaluation Mode"
                            value={form.executionModel?.evaluationMode ?? 'POLICY_DRIVEN'}
                            options={FRAMEWORK_PACKAGE_EVALUATION_MODE_OPTIONS}
                            onChange={(event) => updateExecutionModel(setForm, 'evaluationMode', event.target.value)}
                            disabled={runtimeStructureLocked}
                          />
                        </div>
                      </div>
                      <div className="super-admin-framework-package-editor__option-panel">
                        <Tickbox
                          id="framework-package-editor-runtime-preview"
                          label="Enable preview mode"
                          checked={Boolean(form.runtimeSettings?.enablePreviewMode)}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'enablePreviewMode', event.target.checked)
                          }
                          disabled={runtimeStructureLocked}
                        />
                        <Tickbox
                          id="framework-package-editor-runtime-validation"
                          label="Enable runtime validation"
                          checked={Boolean(form.runtimeSettings?.enableRuntimeValidation)}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'enableRuntimeValidation', event.target.checked)
                          }
                          disabled={runtimeStructureLocked}
                        />
                        <Tickbox
                          id="framework-package-editor-runtime-publish-validation"
                          label="Require validation before publish"
                          checked={Boolean(form.runtimeSettings?.requireValidationBeforePublish)}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'requireValidationBeforePublish', event.target.checked)
                          }
                          disabled={runtimeStructureLocked}
                        />
                        <Tickbox
                          id="framework-package-editor-runtime-manual-validation"
                          label="Allow manual validation run"
                          checked={Boolean(form.runtimeSettings?.allowManualValidationRun)}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'allowManualValidationRun', event.target.checked)
                          }
                          disabled={runtimeStructureLocked}
                        />
                      </div>
                      <div className="super-admin-framework-package-editor__grid">
                        <Select
                          id="framework-package-editor-retry-policy"
                          label="Retry Policy"
                          value={form.runtimeSettings?.retryPolicy ?? 'RETRY_ONCE'}
                          options={FRAMEWORK_PACKAGE_RETRY_POLICY_OPTIONS}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'retryPolicy', event.target.value)
                          }
                          disabled={runtimeStructureLocked}
                        />
                        <Input
                          id="framework-package-editor-timeout-ms"
                          label="Default Timeout (ms)"
                          type="number"
                          value={form.runtimeSettings?.defaultTimeoutMs ?? 30000}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'defaultTimeoutMs', event.target.value)
                          }
                          disabled={runtimeStructureLocked}
                          fullWidth
                        />
                        <Input
                          id="framework-package-editor-max-policies"
                          label="Max Policy Executions"
                          type="number"
                          value={form.runtimeSettings?.maxPolicyExecutionsPerRun ?? 10}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'maxPolicyExecutionsPerRun', event.target.value)
                          }
                          disabled={runtimeStructureLocked}
                          fullWidth
                        />
                      </div>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Validation', tabErrorCounts.validation)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Validation"
                        copy="Select active, package-usable validation registry entries compatible with this package framework."
                      />
                      <Select
                        id="framework-package-editor-validation-picker"
                        label="Add Validation Binding"
                        value=""
                        options={[
                          { value: '', label: validationOptions.length ? 'Select validation' : 'No compatible validations' },
                          ...validationOptions,
                        ]}
                        onChange={(event) => addValidationBinding(setForm, event.target.value)}
                        helperText="Only ACTIVE, package-usable, framework-compatible validations are shown."
                        error={errors.validationBindings}
                        disabled={runtimeStructureLocked}
                      />
                      <p className="super-admin-framework-package-editor__helper">
                        Binding IDs are stable runtime identifiers and remain unchanged when trigger or priority changes.
                      </p>
                      <div className="super-admin-framework-package-editor__row-list">
                        {(form.validationBindings ?? []).length === 0 ? (
                          <p className="super-admin-framework-package-editor__helper">
                            No validation bindings configured.
                          </p>
                        ) : null}
                        {(form.validationBindings ?? []).map((item, index) => (
                          <div className="super-admin-framework-package-editor__config-row" key={item.bindingKey ?? `${item.validationKey}-${item.trigger}-${index}`}>
                            <div className="super-admin-framework-package-editor__row-header">
                              <div>
                                <h3 className="super-admin-framework-package-editor__row-title">{item.validationKey}</h3>
                                <p className="super-admin-framework-package-editor__helper">
                                  Binding ID: {item.bindingKey || 'Pending'}
                                </p>
                              </div>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeValidationBinding(setForm, index)} disabled={runtimeStructureLocked}>
                                Remove
                              </Button>
                            </div>
                            <div className="super-admin-framework-package-editor__field-grid">
                              <Select
                                id={`framework-package-editor-validation-trigger-${index}`}
                                label="Trigger"
                                value={item.trigger ?? 'ON_SUBMIT'}
                                options={FRAMEWORK_PACKAGE_VALIDATION_TRIGGER_OPTIONS}
                                onChange={(event) => updateValidationBinding(setForm, index, 'trigger', event.target.value)}
                                disabled={runtimeStructureLocked}
                              />
                              <Input
                                id={`framework-package-editor-validation-priority-${index}`}
                                label="Priority"
                                type="number"
                                value={item.priority ?? 100}
                                onChange={(event) => updateValidationBinding(setForm, index, 'priority', event.target.value)}
                                disabled={runtimeStructureLocked}
                                fullWidth
                              />
                              <Input
                                id={`framework-package-editor-validation-freshness-${index}`}
                                label="Freshness Minutes"
                                type="number"
                                value={item.freshnessMinutes ?? ''}
                                onChange={(event) => updateValidationBinding(setForm, index, 'freshnessMinutes', event.target.value)}
                                disabled={runtimeStructureLocked}
                                fullWidth
                              />
                            </div>
                            <div className="super-admin-framework-package-editor__option-panel super-admin-framework-package-editor__option-panel--inline">
                              <Tickbox
                                id={`framework-package-editor-validation-blocking-${index}`}
                                label="Blocking"
                                checked={item.blocking !== false}
                                onChange={(event) => updateValidationBinding(setForm, index, 'blocking', event.target.checked)}
                                disabled={runtimeStructureLocked}
                              />
                              <Tickbox
                                id={`framework-package-editor-validation-enabled-${index}`}
                                label="Enabled"
                                checked={item.enabled !== false}
                                onChange={(event) => updateValidationBinding(setForm, index, 'enabled', event.target.checked)}
                                disabled={runtimeStructureLocked}
                              />
                            </div>
                            <Textarea
                              id={`framework-package-editor-validation-notes-${index}`}
                              label="Notes"
                              value={item.notes ?? ''}
                              onChange={(event) => updateValidationBinding(setForm, index, 'notes', event.target.value)}
                              rows={2}
                              disabled={runtimeStructureLocked}
                              fullWidth
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Workflows', tabErrorCounts.workflows)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Workflows"
                        copy="Select active Workflow Policies compatible with the package framework."
                      />
                      <Select
                        id="framework-package-editor-workflow-picker"
                        label="Add Workflow Binding"
                        value=""
                        options={[
                          { value: '', label: workflowPolicyOptions.length ? 'Select workflow policy' : 'No compatible policies' },
                          ...workflowPolicyOptions,
                        ]}
                        onChange={(event) => addWorkflowBinding(setForm, event.target.value)}
                        helperText="Only ACTIVE, framework-compatible workflow policies are shown."
                        error={errors.workflowBindings}
                        disabled={runtimeStructureLocked}
                      />
                      <div className="super-admin-framework-package-editor__row-list">
                        {(form.workflowBindings ?? []).length === 0 ? (
                          <p className="super-admin-framework-package-editor__helper">
                            No workflow bindings configured.
                          </p>
                        ) : null}
                        {(form.workflowBindings ?? []).map((item, index) => (
                          <div className="super-admin-framework-package-editor__config-row" key={`${item.policyKey}-${item.executionContext}-${index}`}>
                            <div className="super-admin-framework-package-editor__row-header">
                              <h3 className="super-admin-framework-package-editor__row-title">{item.policyKey}</h3>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeWorkflowBinding(setForm, index)} disabled={runtimeStructureLocked}>
                                Remove
                              </Button>
                            </div>
                            <div className="super-admin-framework-package-editor__field-grid">
                              <Select
                                id={`framework-package-editor-workflow-context-${index}`}
                                label="Execution Context"
                                value={item.executionContext ?? 'ON_SUBMIT'}
                                options={FRAMEWORK_PACKAGE_WORKFLOW_EXECUTION_CONTEXT_OPTIONS}
                                onChange={(event) => updateWorkflowBinding(setForm, index, 'executionContext', event.target.value)}
                                disabled={runtimeStructureLocked}
                              />
                              <Input
                                id={`framework-package-editor-workflow-priority-${index}`}
                                label="Priority"
                                type="number"
                                value={item.priority ?? 100}
                                onChange={(event) => updateWorkflowBinding(setForm, index, 'priority', event.target.value)}
                                disabled={runtimeStructureLocked}
                                fullWidth
                              />
                              <Tickbox
                                id={`framework-package-editor-workflow-enabled-${index}`}
                                label="Enabled"
                                checked={item.enabled !== false}
                                onChange={(event) => updateWorkflowBinding(setForm, index, 'enabled', event.target.checked)}
                                disabled={runtimeStructureLocked}
                              />
                            </div>
                            <Textarea
                              id={`framework-package-editor-workflow-notes-${index}`}
                              label="Notes"
                              value={item.notes ?? ''}
                              onChange={(event) => updateWorkflowBinding(setForm, index, 'notes', event.target.value)}
                              rows={2}
                              disabled={runtimeStructureLocked}
                              fullWidth
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Outputs', tabErrorCounts.outputs)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Outputs"
                        copy="Reserve package output metadata for the future Output Library without execution bindings."
                      />
                      <p className="super-admin-framework-package-editor__helper">
                        Outputs are configured in the Output Library in a future release. This package only stores metadata placeholders.
                      </p>
                      <div className="super-admin-framework-package-editor__grid super-admin-framework-package-editor__grid--wide">
                        <div className="super-admin-framework-package-editor__option-panel">
                          <span className="super-admin-framework-package-editor__summary-label">Available Output Keys</span>
                          {FRAMEWORK_PACKAGE_OUTPUT_KEY_OPTIONS.map((option) => (
                            <Tickbox
                              key={option.value}
                              id={`framework-package-editor-available-output-key-${option.value}`}
                              label={option.label}
                              checked={parseDelimitedKeyList(form.availableOutputKeys).includes(option.value)}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  availableOutputKeys: toggleDelimitedKeyListValue(
                                    current.availableOutputKeys,
                                    option.value,
                                    event.target.checked,
                                  ),
                                }))
                              }
                              disabled={directEditLocked}
                            />
                          ))}
                          <p className="super-admin-framework-package-editor__helper">
                            Placeholder only. No output engine behavior is invoked.
                          </p>
                        </div>
                        <div className="super-admin-framework-package-editor__option-panel">
                          <span className="super-admin-framework-package-editor__summary-label">Default Output Styles</span>
                          {FRAMEWORK_PACKAGE_OUTPUT_STYLE_OPTIONS.map((option) => (
                            <Tickbox
                              key={option.value}
                              id={`framework-package-editor-default-output-style-${option.value}`}
                              label={option.label}
                              checked={parseDelimitedKeyList(form.defaultOutputStyles).includes(option.value)}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  defaultOutputStyles: toggleDelimitedKeyListValue(
                                    current.defaultOutputStyles,
                                    option.value,
                                    event.target.checked,
                                  ),
                                }))
                              }
                              disabled={directEditLocked}
                            />
                          ))}
                        </div>
                      </div>
                      <Input
                        id="framework-package-editor-artifact-retention-days"
                        label="Artifact Retention Days"
                        type="number"
                        value={form.artifactRetentionDays}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, artifactRetentionDays: event.target.value }))
                        }
                        disabled={directEditLocked}
                        fullWidth
                      />
                      <div className="super-admin-framework-package-editor__option-panel">
                        <Tickbox
                          id="framework-package-editor-allow-customer-output-definitions"
                          label="Allow customer custom output definitions"
                          checked={Boolean(form.allowCustomerOutputDefinitions)}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, allowCustomerOutputDefinitions: event.target.checked }))
                          }
                          disabled={directEditLocked}
                        />
                        <Tickbox
                          id="framework-package-editor-allow-output-revision-history"
                          label="Allow output revision history"
                          checked={Boolean(form.allowOutputRevisionHistory)}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, allowOutputRevisionHistory: event.target.checked }))
                          }
                          disabled={directEditLocked}
                        />
                      </div>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('UI Contract', tabErrorCounts.uiContract)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="UI Contract"
                        copy="Select and inspect the presentation contract that maps package sections to renderer controls."
                      />
                      <div className="super-admin-framework-package-editor__field-grid">
                        <Select
                          id="framework-package-editor-ui-contract"
                          label="Selected Contract"
                          value={form.uiContractKey ?? ''}
                          options={uiContractOptions}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, uiContractKey: event.target.value }))
                          }
                          helperText="Packages reference UI Contracts; presentation authoring stays in the UI Contract Registry."
                          error={errors.uiContractKey}
                          disabled={runtimeStructureLocked}
                        />
                      </div>
                      <div
                        className="super-admin-framework-packages__token-list super-admin-framework-package-editor__summary-chip-row"
                        aria-label="UI Contract status summary"
                      >
                        <Status
                          size="md"
                          showIcon
                          variant={getCheckStatusVariant(selectedUiContract?.status ?? uiContractBinding?.status)}
                        >
                          Contract: {selectedUiContract?.status ?? uiContractBinding?.status ?? 'Not selected'}
                        </Status>
                        <Status size="md" showIcon variant={getCheckStatusVariant(uiContractCompatibility.status)}>
                          Compatibility: {uiContractCompatibility.status}
                        </Status>
                      </div>
                      <div
                        className="super-admin-framework-packages__token-list super-admin-framework-package-editor__summary-chip-row"
                        aria-label="UI Contract version summary"
                      >
                        <Badge variant="neutral" size="md" pill outline>
                          UI Contract Version: {selectedUiContract?.sourcePackageVersion ?? uiContractBinding?.version ?? '--'}
                        </Badge>
                        <Badge variant="neutral" size="md" pill outline>
                          Package Version: {form.version || '--'}
                        </Badge>
                        <Badge variant="neutral" size="md" pill outline>
                          Compatibility Mode: {selectedUiContract?.compatibilityMode ?? uiContractBinding?.compatibilityMode ?? '--'}
                        </Badge>
                        <Badge variant="neutral" size="md" pill outline>
                          Resolved At: {uiContractBinding?.resolvedAt ? formatDateTime(uiContractBinding.resolvedAt) : '--'}
                        </Badge>
                      </div>
                      <div className="super-admin-framework-package-editor__toolbar">
                        <p className="super-admin-framework-package-editor__helper">{uiContractCompatibility.message}</p>
                        <div className="super-admin-framework-package-editor__table-actions">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!form.uiContractKey}
                            onClick={() => {
                              const targetId = selectedUiContract?.id || form.uiContractKey
                              navigate(`/super-admin/runtime-control/ui-contracts/${targetId}`)
                            }}
                          >
                            Open UI Contract
                          </Button>
                        </div>
                      </div>
                      <div
                        className="super-admin-framework-packages__token-list super-admin-framework-package-editor__summary-chip-row"
                        aria-label="UI Contract mapping summary"
                      >
                        <Badge variant={uiContractCompatibility.missing.length > 0 ? 'warning' : 'success'} size="md" pill outline>
                          Missing mappings: {uiContractCompatibility.missing.length}
                        </Badge>
                        <Badge variant={uiContractCompatibility.orphaned.length > 0 ? 'warning' : 'success'} size="md" pill outline>
                          Orphaned mappings: {uiContractCompatibility.orphaned.length}
                        </Badge>
                        <Badge variant={uiContractCompatibility.mismatched.length > 0 ? 'warning' : 'success'} size="md" pill outline>
                          Runtime path mismatches: {uiContractCompatibility.mismatched.length}
                        </Badge>
                      </div>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('State Contract', tabErrorCounts.stateContract)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="State Contract"
                        copy="Define state model resolution, binding strictness, persistence, and implementation notes."
                      />
                      <div className="super-admin-framework-package-editor__field-grid">
                        <Select
                          id="framework-package-editor-state-model-mode"
                          label="State Model Mode"
                          value={form.stateModelMode ?? FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL}
                          options={FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODE_OPTIONS}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              stateModelMode: event.target.value,
                              stateModelKey: event.target.value === FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL
                                ? ''
                                : current.stateModelKey,
                              stateModelVersion: event.target.value === FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL
                                ? ''
                                : current.stateModelVersion,
                            }))
                          }
                          error={errors.stateModelMode}
                          disabled={runtimeStructureLocked}
                        />
                        <Input
                          id="framework-package-editor-state-model-key"
                          label="State Model Key"
                          value={form.stateModelKey ?? ''}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, stateModelKey: event.target.value }))
                          }
                          helperText="Text fallback until the State Model Registry exists."
                          error={errors.stateModelKey}
                          disabled={runtimeStructureLocked || form.stateModelMode === FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL}
                          fullWidth
                        />
                        <Input
                          id="framework-package-editor-state-model-version"
                          label="State Model Version"
                          value={form.stateModelVersion ?? ''}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, stateModelVersion: event.target.value }))
                          }
                          helperText="Use semantic version format for external state models."
                          error={errors.stateModelVersion}
                          disabled={runtimeStructureLocked || form.stateModelMode === FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL}
                          fullWidth
                        />
                        <Select
                          id="framework-package-editor-state-binding-mode"
                          label="State Binding Mode"
                          value={form.stateBindingMode ?? 'STRICT'}
                          options={FRAMEWORK_PACKAGE_STATE_BINDING_MODE_OPTIONS}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, stateBindingMode: event.target.value }))
                          }
                          error={errors.stateBindingMode}
                          disabled={runtimeStructureLocked}
                        />
                        <Select
                          id="framework-package-editor-state-persistence"
                          label="State Persistence"
                          value={form.statePersistence ?? 'SESSION'}
                          options={FRAMEWORK_PACKAGE_STATE_PERSISTENCE_OPTIONS}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, statePersistence: event.target.value }))
                          }
                          error={errors.statePersistence}
                          disabled={runtimeStructureLocked}
                        />
                      </div>
                      <Textarea
                        id="framework-package-editor-state-contract-notes"
                        label="Notes"
                        value={form.stateContractNotes ?? ''}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, stateContractNotes: event.target.value }))
                        }
                        error={errors.stateContractNotes}
                        rows={4}
                        disabled={directEditLocked}
                        fullWidth
                      />
                      <p className="super-admin-framework-package-editor__helper">
                        Internal mode uses framework_state.sections.*. External mode is future-ready and requires a key and version before save.
                      </p>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Dependencies')}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Dependencies"
                        copy="Read-only resolved runtime dependencies derived from sections, validations, workflows, and UI Contract binding."
                      />
                      {!isEditMode ? (
                        <p className="super-admin-framework-package-editor__helper">Dependencies are available after the package is created.</p>
                      ) : dependencyAppError ? (
                        <p className="super-admin-framework-package-editor__error" role="alert">{dependencyAppError.message}</p>
                      ) : isDependenciesLoading ? (
                        <p className="super-admin-framework-package-editor__helper">Loading dependency summary...</p>
                      ) : (
                        <>
                          <div
                            className="super-admin-framework-packages__token-list super-admin-framework-package-editor__summary-chip-row"
                            role="group"
                            aria-label="Dependency filters"
                          >
                            {dependencyFilterOptions.map((filter) => (
                              <button
                                key={filter.value || 'all'}
                                type="button"
                                className="super-admin-framework-package-editor__dependency-filter"
                                data-active={dependencyTypeFilter === filter.value ? 'true' : 'false'}
                                aria-pressed={dependencyTypeFilter === filter.value}
                                onClick={() => updateDependencyTypeFilter(filter.value)}
                              >
                                {filter.label}: {filter.count}
                              </button>
                            ))}
                          </div>
                          <TableSurface
                            ariaLabel="Framework package dependencies"
                            columns={[
                              { key: 'type', label: 'Type', width: '16%' },
                              { key: 'key', label: 'Key', width: '26%', render: (value, row) => {
                                const target = getDependencyNavigationTarget(row)
                                if (!target) {
                                  return <code className="super-admin-framework-package-editor__code-token">{value}</code>
                                }

                                return (
                                  <button
                                    type="button"
                                    className="super-admin-framework-package-editor__dependency-link"
                                    onClick={() => handleDependencyClickthrough(row)}
                                    aria-label={`Open ${row.type} ${row.name || value}`}
                                  >
                                    <code className="super-admin-framework-package-editor__code-token">{value}</code>
                                  </button>
                                )
                              } },
                              { key: 'name', label: 'Name', width: '24%' },
                              { key: 'status', label: 'Status', width: '14%', render: (value) => (
                                <Status size="sm" showIcon variant={getCheckStatusVariant(value)}>{value}</Status>
                              ) },
                              { key: 'issues', label: 'Issues', width: '20%', render: formatIssueList },
                            ]}
                            data={paginatedDependencyRows}
                            emptyMessage={dependencyEmptyMessage}
                            paginationLabel="Framework package dependencies pagination"
                            currentPage={dependencyTablePage}
                            totalPages={dependencyTableTotalPages}
                            onPageChange={(nextPage) =>
                              setEditorTablePage('dependencies', nextPage, dependencyTableTotalPages)
                            }
                          />
                        </>
                      )}
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Integrity')}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <div className="super-admin-framework-package-editor__integrity-header">
                        <SectionHeader
                          title="Integrity"
                          copy="Run the Runtime Architecture Checkpoint before validation or activation."
                        />
                        {isEditMode && !integrityAppError ? (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleRunCheckpoint}
                            loading={isRunningCheckpoint || isIntegrityFetching}
                            disabled={isRunningCheckpoint || isValidatingPackage || isSaving || isActivatingPackage}
                          >
                            Re-run Checkpoint
                          </Button>
                        ) : null}
                      </div>
                      {!isEditMode ? (
                        <p className="super-admin-framework-package-editor__helper">Integrity checks are available after the package is created.</p>
                      ) : integrityAppError ? (
                        <p className="super-admin-framework-package-editor__error" role="alert">{integrityAppError.message}</p>
                      ) : (
                        <>
                          <div className="super-admin-framework-package-editor__integrity-summary" aria-label="Integrity summary">
                            <Status
                              size="sm"
                              showIcon
                              variant={getCheckStatusVariant(displayedIntegrityData?.status)}
                              className="super-admin-framework-package-editor__integrity-status"
                            >
                              {displayedIntegrityData?.status ?? 'Not run'}
                            </Status>
                            <div className="super-admin-framework-package-editor__integrity-metric-grid">
                              <Card
                                variant="outlined"
                                className="super-admin-framework-package-editor__integrity-metric-card"
                                aria-label="Passed checks"
                              >
                                <Card.Body className="super-admin-framework-package-editor__integrity-metric-card-body">
                                  <span className="super-admin-framework-package-editor__summary-eyebrow">Passed Checks</span>
                                  <Status size="sm" showIcon variant="success">
                                    {Number(displayedIntegrityData?.summary?.pass) || 0}
                                  </Status>
                                </Card.Body>
                              </Card>
                              <Card
                                variant="outlined"
                                className="super-admin-framework-package-editor__integrity-metric-card"
                                aria-label="Warnings"
                              >
                                <Card.Body className="super-admin-framework-package-editor__integrity-metric-card-body">
                                  <span className="super-admin-framework-package-editor__summary-eyebrow">Warnings</span>
                                  <Status size="sm" showIcon variant="warning">
                                    {Number(displayedIntegrityData?.summary?.warn) || 0}
                                  </Status>
                                </Card.Body>
                              </Card>
                              <Card
                                variant="outlined"
                                className="super-admin-framework-package-editor__integrity-metric-card"
                                aria-label="Failures"
                              >
                                <Card.Body className="super-admin-framework-package-editor__integrity-metric-card-body">
                                  <span className="super-admin-framework-package-editor__summary-eyebrow">Failures</span>
                                  <Status size="sm" showIcon variant="error">
                                    {Number(displayedIntegrityData?.summary?.fail) || 0}
                                  </Status>
                                </Card.Body>
                              </Card>
                            </div>
                          </div>
                          <TableSurface
                            ariaLabel="Framework package integrity checks"
                            columns={[
                              { key: 'group', label: 'Group', width: '22%' },
                              { key: 'severity', label: 'Result', width: '14%', render: (value) => (
                                <Status size="sm" showIcon variant={getCheckStatusVariant(value)}>{value}</Status>
                              ) },
                              { key: 'field', label: 'Field', width: '18%', render: (value) => value ? <code className="super-admin-framework-package-editor__code-token">{value}</code> : '--' },
                              { key: 'message', label: 'Message', width: '46%', render: (_value, row) => (
                                <IntegrityMessageCell row={row} onViewDetails={setIntegrityMessageDetail} />
                              ) },
                            ]}
                            data={paginatedIntegrityRows}
                            emptyMessage="No integrity checks returned yet."
                            paginationLabel="Framework package integrity checks pagination"
                            currentPage={integrityTablePage}
                            totalPages={integrityTableTotalPages}
                            onPageChange={(nextPage) =>
                              setEditorTablePage('integrity', nextPage, integrityTableTotalPages)
                            }
                          />
                        </>
                      )}
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Runtime Validation')}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Runtime Validation"
                        copy="Exercise the behavioral validation layer against package runtime paths, scope boundaries, dependency locks, and audit persistence."
                      />
                      {!isEditMode ? (
                        <p className="super-admin-framework-package-editor__helper">Runtime validation is available after the package is created.</p>
                      ) : runtimeValidationHistoryAppError ? (
                        <p className="super-admin-framework-package-editor__error" role="alert">{runtimeValidationHistoryAppError.message}</p>
                      ) : (
                        <>
                          <div className="super-admin-framework-package-editor__toolbar">
                            <Status size="sm" showIcon variant={getCheckStatusVariant(latestRuntimeValidationStatus)}>
                              Last Result: {formatGovernanceToken(latestRuntimeValidationStatus, 'Not Run')}
                            </Status>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleRunRuntimeValidationProbe}
                              loading={isValidatingRuntimeOperation}
                              disabled={
                                isValidatingRuntimeOperation
                                || isSaving
                                || isValidatingPackage
                                || isActivatingPackage
                                || !runtimeValidationProbePath
                              }
                            >
                              Run Mutation Probe
                            </Button>
                          </div>
                          <section
                            className="super-admin-framework-package-editor__runtime-validation-summary-panel"
                            aria-label="Runtime validation summary"
                          >
                            <Card
                              variant="outlined"
                              className="super-admin-framework-package-editor__runtime-validation-state-card"
                              data-status={currentRuntimeValidationState.state}
                            >
                              <Card.Body className="super-admin-framework-package-editor__runtime-validation-card-body">
                                <div className="super-admin-framework-package-editor__runtime-validation-state-layout">
                                  <h3 className="super-admin-framework-package-editor__runtime-validation-state-title">
                                    Runtime Validation Summary
                                  </h3>
                                  <Badge
                                    variant={getCheckStatusVariant(runtimeValidationDecisionTone) === 'error' ? 'danger' : getCheckStatusVariant(runtimeValidationDecisionTone)}
                                    size="sm"
                                    pill
                                    outline
                                    className="super-admin-framework-package-editor__runtime-validation-decision-badge"
                                  >
                                    {runtimeValidationDecisionCopy}
                                  </Badge>
                                  <div className="super-admin-framework-package-editor__runtime-validation-state-stack">
                                    <span className="super-admin-framework-package-editor__summary-eyebrow">
                                      Current Validation State
                                    </span>
                                    <strong
                                      className="super-admin-framework-package-editor__runtime-validation-result-word"
                                      data-status={runtimeValidationStateWord}
                                    >
                                      {formatGovernanceToken(runtimeValidationStateWord, 'Not Run')}
                                    </strong>
                                  </div>
                                  <div className="super-admin-framework-package-editor__runtime-validation-state-detail">
                                    <RuntimeValidationHelpTrigger
                                      label="Runtime validation state help"
                                      content={currentRuntimeValidationState.message}
                                      align="start"
                                    >
                                      <Status
                                        size="sm"
                                        showIcon
                                        variant={getCheckStatusVariant(currentRuntimeValidationState.state)}
                                      >
                                        {formatGovernanceToken(currentRuntimeValidationState.state, 'Not Run')}
                                      </Status>
                                    </RuntimeValidationHelpTrigger>
                                    <div className="super-admin-framework-package-editor__runtime-validation-outcome-grid">
                                      <div className="super-admin-framework-package-editor__runtime-validation-outcome-cell">
                                        <span className="super-admin-framework-package-editor__summary-eyebrow">{runtimeValidationResultLabel}</span>
                                        <strong
                                          data-status={latestRuntimeValidationStatus}
                                          data-stale={runtimeValidationIsStale ? 'true' : undefined}
                                        >
                                          {formatGovernanceToken(latestRuntimeValidationStatus, 'Not Run')}
                                        </strong>
                                      </div>
                                      <div className="super-admin-framework-package-editor__runtime-validation-outcome-cell">
                                        <span className="super-admin-framework-package-editor__summary-eyebrow">{runtimeValidationOutcomeLabel}</span>
                                        <strong
                                          data-decision={latestRuntimeValidationDecision}
                                          data-stale={runtimeValidationIsStale ? 'true' : undefined}
                                        >
                                          {formatGovernanceToken(latestRuntimeValidationDecision, 'Not Run')}
                                        </strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Card.Body>
                            </Card>
                            <div className="super-admin-framework-package-editor__runtime-validation-evidence-column">
                              <div className="super-admin-framework-package-editor__runtime-validation-metric-row">
                                <Card variant="outlined" className="super-admin-framework-package-editor__runtime-validation-metric-card">
                                  <Card.Body className="super-admin-framework-package-editor__runtime-validation-card-body">
                                    <div className="super-admin-framework-package-editor__runtime-validation-metric-header">
                                      <span className="super-admin-framework-package-editor__summary-eyebrow">Mode</span>
                                      <Badge variant="neutral" size="sm" pill outline>
                                        Policy
                                      </Badge>
                                    </div>
                                    <div className="super-admin-framework-package-editor__runtime-validation-metric-content">
                                      <RuntimeValidationHelpTrigger
                                        label="Runtime validation mode help"
                                        content={RUNTIME_VALIDATION_MODE_HELP}
                                        align="start"
                                      >
                                        <strong className="super-admin-framework-package-editor__runtime-validation-metric-primary">
                                          {latestRuntimeValidationMode}
                                        </strong>
                                      </RuntimeValidationHelpTrigger>
                                      <p className="super-admin-framework-package-editor__runtime-validation-metric-copy">
                                        {runtimeValidationModeCopy}
                                      </p>
                                    </div>
                                  </Card.Body>
                                </Card>
                                <Card variant="outlined" className="super-admin-framework-package-editor__runtime-validation-metric-card">
                                  <Card.Body className="super-admin-framework-package-editor__runtime-validation-card-body">
                                    <div className="super-admin-framework-package-editor__runtime-validation-metric-header">
                                      <span className="super-admin-framework-package-editor__summary-eyebrow">Issues</span>
                                      <Badge variant={runtimeValidationIssueBadgeVariant} size="sm" pill outline>
                                        {runtimeValidationIssueBadgeLabel}
                                      </Badge>
                                    </div>
                                    <span className="sr-only">
                                      {latestRuntimeValidationIssueSummary.blocking} blocking / {latestRuntimeValidationIssueSummary.warnings} warnings / {latestRuntimeValidationIssueSummary.informational} informational
                                    </span>
                                    <div className="super-admin-framework-package-editor__runtime-validation-issue-list">
                                      <div className="super-admin-framework-package-editor__runtime-validation-issue-row" data-severity="blocking">
                                        <span>Blocking</span>
                                        <strong>{latestRuntimeValidationIssueSummary.blocking}</strong>
                                      </div>
                                      <div className="super-admin-framework-package-editor__runtime-validation-issue-row" data-severity="warning">
                                        <span>Warnings</span>
                                        <strong>{latestRuntimeValidationIssueSummary.warnings}</strong>
                                      </div>
                                      <div className="super-admin-framework-package-editor__runtime-validation-issue-row" data-severity="info">
                                        <span>Info</span>
                                        <strong>{latestRuntimeValidationIssueSummary.informational}</strong>
                                      </div>
                                    </div>
                                  </Card.Body>
                                </Card>
                                <Card variant="outlined" className="super-admin-framework-package-editor__runtime-validation-metric-card">
                                  <Card.Body className="super-admin-framework-package-editor__runtime-validation-card-body">
                                    <div className="super-admin-framework-package-editor__runtime-validation-metric-header">
                                      <span className="super-admin-framework-package-editor__summary-eyebrow">Audit Persisted</span>
                                      <Badge variant={runtimeValidationAuditBadgeVariant} size="sm" pill outline>
                                        {runtimeValidationAuditPersistedLabel}
                                      </Badge>
                                    </div>
                                    <div className="super-admin-framework-package-editor__runtime-validation-metric-content">
                                      <strong className="super-admin-framework-package-editor__runtime-validation-metric-primary">
                                        {runtimeValidationAuditEvidenceLabel}
                                      </strong>
                                      <p className="super-admin-framework-package-editor__runtime-validation-metric-copy">
                                        {runtimeValidationAuditCopy}
                                      </p>
                                    </div>
                                  </Card.Body>
                                </Card>
                              </div>
                              <Card variant="outlined" className="super-admin-framework-package-editor__runtime-validation-evidence-card">
                                <Card.Body className="super-admin-framework-package-editor__runtime-validation-card-body">
                                  <div className="super-admin-framework-package-editor__runtime-validation-evidence-header">
                                    <h3 className="super-admin-framework-package-editor__runtime-validation-evidence-title">
                                      Dependency Lock Evidence
                                    </h3>
                                    <Badge
                                      variant={dependencyLockEvidenceBadgeVariant}
                                      size="sm"
                                      pill
                                      outline
                                      className="super-admin-framework-package-editor__runtime-validation-lock-badge"
                                    >
                                      {dependencyLockEvidenceStateLabel}
                                    </Badge>
                                  </div>
                                  <span className="sr-only">
                                    snapshot: {dependencyLockMeta.snapshotId || 'not recorded'}
                                  </span>
                                  <div className="super-admin-framework-package-editor__runtime-validation-evidence-primary">
                                    <span className="super-admin-framework-package-editor__summary-eyebrow">Evidence State</span>
                                    <strong>{dependencyLockEvidenceHeadline}</strong>
                                    <p className="super-admin-framework-package-editor__runtime-validation-metric-copy">
                                      {dependencyLockEvidenceCopy}
                                    </p>
                                  </div>
                                  <div className="super-admin-framework-package-editor__runtime-validation-evidence-grid">
                                    <div className="super-admin-framework-package-editor__runtime-validation-evidence-item">
                                      <span className="super-admin-framework-package-editor__summary-eyebrow">Snapshot</span>
                                      <strong>{dependencyLockMeta.snapshotId || 'not recorded'}</strong>
                                    </div>
                                    <div className="super-admin-framework-package-editor__runtime-validation-evidence-item">
                                      <span className="super-admin-framework-package-editor__summary-eyebrow">Created</span>
                                      <strong>{formatDateTime(dependencyLockMeta.createdAt)}</strong>
                                    </div>
                                    <div className="super-admin-framework-package-editor__runtime-validation-evidence-item super-admin-framework-package-editor__runtime-validation-evidence-item--source">
                                      <span className="super-admin-framework-package-editor__summary-eyebrow">Source</span>
                                      <strong>{dependencyLockMeta.sourceLabel}</strong>
                                    </div>
                                  </div>
                                </Card.Body>
                              </Card>
                              </div>
                              <Card variant="outlined" className="super-admin-framework-package-editor__runtime-validation-audit-card">
                                <Card.Body className="super-admin-framework-package-editor__runtime-validation-card-body">
                                  <div className="super-admin-framework-package-editor__runtime-validation-audit-header">
                                    <h3 className="super-admin-framework-package-editor__runtime-validation-audit-title">
                                      Audit Trail
                                    </h3>
                                    <Badge variant="neutral" size="sm" pill outline>
                                      Latest Event
                                    </Badge>
                                  </div>
                                  <div className="super-admin-framework-package-editor__runtime-validation-audit-stack">
                                    <div className="super-admin-framework-package-editor__runtime-validation-audit-primary">
                                      <span className="super-admin-framework-package-editor__summary-eyebrow">Validated At</span>
                                      <p className="super-admin-framework-package-editor__runtime-validation-card-value">
                                        {latestRuntimeValidationDateLabel}
                                      </p>
                                      <strong className="super-admin-framework-package-editor__runtime-validation-audit-time">
                                        {latestRuntimeValidationTimeLabel}
                                      </strong>
                                    </div>
                                    <div className="super-admin-framework-package-editor__runtime-validation-audit-detail-grid">
                                      <div>
                                        <span className="super-admin-framework-package-editor__summary-eyebrow">Validated By</span>
                                        <p className="super-admin-framework-package-editor__runtime-validation-card-value">
                                          {latestRuntimeValidationActorLabel}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="super-admin-framework-package-editor__summary-eyebrow">Evidence</span>
                                        <p className="super-admin-framework-package-editor__runtime-validation-card-value">
                                          {runtimeValidationAuditEvidenceLabel}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </Card.Body>
                              </Card>
                          </section>
                          <div
                            className="super-admin-framework-package-editor__runtime-validation-governance-rail"
                            aria-label="Architecture checkpoint and runtime validation relationship"
                          >
                            <div>
                              <span className="super-admin-framework-package-editor__summary-eyebrow">Architecture Checkpoint</span>
                              <Status size="sm" showIcon variant={latestCheckpointTone}>
                                {latestCheckpointDisplay.text}
                              </Status>
                              <p className="super-admin-framework-package-editor__helper">
                                Static package readiness, dependency graph evidence, and activation gating.
                              </p>
                            </div>
                            <div>
                              <span className="super-admin-framework-package-editor__summary-eyebrow">Runtime Validation</span>
                              <Status size="sm" showIcon variant={getCheckStatusVariant(latestRuntimeValidationDecision)}>
                                {formatGovernanceToken(latestRuntimeValidationDecision, 'Not Run')}
                              </Status>
                              <p className="super-admin-framework-package-editor__helper">
                                Behavioral operation verdict, runtime path boundary checks, and audit evidence.
                              </p>
                            </div>
                          </div>
                          <div
                            className="super-admin-framework-packages__token-list super-admin-framework-package-editor__summary-chip-row"
                            aria-label="Runtime validation quick facts"
                          >
                            <Badge variant="neutral" size="md" pill outline>
                              Mode: {latestRuntimeValidationMode}
                            </Badge>
                            <Badge variant={runtimeValidationProbePath ? 'info' : 'warning'} size="md" pill outline>
                              Probe Path: {runtimeValidationProbePath || 'No section path'}
                            </Badge>
                            <Badge variant="neutral" size="md" pill outline>
                              Audit Rows: {runtimeValidationHistoryRows.length}
                            </Badge>
                            <Badge variant={dependencyLockMeta.hasPersistedLock ? 'success' : 'warning'} size="md" pill outline>
                              Dependency Lock: {dependencyLockMeta.hasPersistedLock ? 'Locked' : 'Not locked'}
                            </Badge>
                          </div>
                          <p className="super-admin-framework-package-editor__helper">
                            Mutation probe uses the seeded `VALIDATOR` skill role boundary. If that role is not seeded, the probe can block with a role validation issue.
                          </p>
                          {latestRuntimeValidationIssueRows.length > 0 ? (
                            <TableSurface
                              ariaLabel="Runtime validation issue details"
                              columns={[
                                { key: 'code', label: 'Code', width: '16%', render: (value, row) => value ? (
                                  <button
                                    type="button"
                                    className="super-admin-framework-package-editor__code-link"
                                    onClick={() => setRuntimeValidationCodeDetail(getRuntimeValidationCodeDetail(row))}
                                    aria-label={`Open details for ${value}`}
                                  >
                                    <code>{value}</code>
                                  </button>
                                ) : '--' },
                                { key: 'severity', label: 'Severity', width: '14%', render: (value) => (
                                  <Status size="sm" showIcon variant={getCheckStatusVariant(value)}>{value}</Status>
                                ) },
                                { key: 'path', label: 'Path', width: '20%', render: (value) => value ? <code className="super-admin-framework-package-editor__code-token">{value}</code> : '--' },
                                { key: 'message', label: 'Message', width: '50%' },
                              ]}
                              data={latestRuntimeValidationIssueRows}
                              emptyMessage="No runtime validation issues returned."
                              paginationLabel="Runtime validation issue pagination"
                              currentPage={1}
                              totalPages={1}
                              onPageChange={() => {}}
                            />
                          ) : null}
                          {isRuntimeValidationHistoryLoading ? (
                            <p className="super-admin-framework-package-editor__helper">Loading runtime validation audit stream...</p>
                          ) : (
                            <>
                              <div
                                className="super-admin-framework-package-editor__runtime-validation-filters"
                                aria-label="Runtime validation audit filters"
                              >
                                <Select
                                  id="runtime-validation-filter-result"
                                  label="Result"
                                  value={runtimeValidationFilters.status}
                                  onChange={(event) => updateRuntimeValidationFilter('status', event.target.value)}
                                  options={[
                                    { value: '', label: 'All results' },
                                    { value: 'PASS', label: 'PASS' },
                                    { value: 'WARN', label: 'WARN' },
                                    { value: 'FAIL', label: 'FAIL' },
                                  ]}
                                  size="sm"
                                />
                                <Select
                                  id="runtime-validation-filter-severity"
                                  label="Severity"
                                  value={runtimeValidationFilters.severity}
                                  onChange={(event) => updateRuntimeValidationFilter('severity', event.target.value)}
                                  options={[
                                    { value: '', label: 'All severities' },
                                    { value: 'CRITICAL', label: 'CRITICAL' },
                                    { value: 'ERROR', label: 'ERROR' },
                                    { value: 'BLOCKING', label: 'BLOCKING' },
                                    { value: 'WARN', label: 'WARN' },
                                    { value: 'INFO', label: 'INFO' },
                                  ]}
                                  size="sm"
                                />
                                <Select
                                  id="runtime-validation-filter-operation"
                                  label="Operation"
                                  value={runtimeValidationFilters.operationType}
                                  onChange={(event) => updateRuntimeValidationFilter('operationType', event.target.value)}
                                  options={runtimeValidationOperationOptions}
                                  size="sm"
                                />
                                <Select
                                  id="runtime-validation-filter-mode"
                                  label="Mode"
                                  value={runtimeValidationFilters.mode}
                                  onChange={(event) => updateRuntimeValidationFilter('mode', event.target.value)}
                                  options={[
                                    { value: '', label: 'All modes' },
                                    { value: 'STRICT', label: 'STRICT' },
                                    { value: 'WARN_ONLY', label: 'WARN_ONLY' },
                                    { value: 'AUDIT_ONLY', label: 'AUDIT_ONLY' },
                                    { value: 'DISABLED', label: 'DISABLED' },
                                  ]}
                                  size="sm"
                                />
                                <Input
                                  id="runtime-validation-filter-runtime-path"
                                  label="Runtime Path"
                                  value={runtimeValidationFilters.runtimePath}
                                  onChange={(event) => updateRuntimeValidationFilter('runtimePath', event.target.value)}
                                  size="sm"
                                  fullWidth
                                />
                                <Input
                                  id="runtime-validation-filter-date-from"
                                  type="date"
                                  label="From"
                                  value={runtimeValidationFilters.dateFrom}
                                  onChange={(event) => updateRuntimeValidationFilter('dateFrom', event.target.value)}
                                  max={runtimeValidationFilters.dateTo || undefined}
                                  size="sm"
                                  fullWidth
                                />
                                <Input
                                  id="runtime-validation-filter-date-to"
                                  type="date"
                                  label="To"
                                  value={runtimeValidationFilters.dateTo}
                                  onChange={(event) => updateRuntimeValidationFilter('dateTo', event.target.value)}
                                  min={runtimeValidationFilters.dateFrom || undefined}
                                  size="sm"
                                  fullWidth
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={clearRuntimeValidationFilters}
                                  disabled={Object.values(runtimeValidationFilters).every((value) => !value)}
                                >
                                  Clear Filters
                                </Button>
                              </div>
                              {runtimeValidationDateRangeInvalid ? (
                                <p className="super-admin-framework-package-editor__error" role="alert">
                                  Runtime validation date filters require From to be on or before To.
                                </p>
                              ) : null}
                              <p className="super-admin-framework-package-editor__helper">
                                Showing {filteredRuntimeValidationRows.length} of {runtimeValidationHistoryRows.length} runtime validation audit rows.
                              </p>
                              <TableSurface
                                ariaLabel="Runtime validation audit history"
                                columns={[
                                  { key: 'createdAt', label: 'Timestamp', width: '15%', render: formatDateTime },
                                  { key: 'status', label: 'Result', width: '10%', render: (value) => (
                                    <Status size="sm" showIcon variant={getCheckStatusVariant(value)}>{value}</Status>
                                  ) },
                                  { key: 'severity', label: 'Severity', width: '11%', render: (_value, row) => {
                                    const severity = getRuntimeValidationRowSeverity(row)
                                    return severity ? (
                                      <Status size="sm" showIcon variant={getCheckStatusVariant(severity)}>{severity}</Status>
                                    ) : '--'
                                  } },
                                  { key: 'mode', label: 'Mode', width: '10%', render: (value) => value ? getRuntimeValidationMode({ mode: value }) : '--' },
                                  { key: 'operationType', label: 'Operation', width: '15%', render: (value) => {
                                    const operationType = normalizeRuntimeValidationOperationType(value)
                                    return operationType ? <code className="super-admin-framework-package-editor__code-token">{operationType}</code> : '--'
                                  } },
                                  { key: 'runtimePath', label: 'Runtime Path', width: '21%', render: (value) => {
                                    if (!value) return '--'
                                    const navigationState = getRuntimePathNavigationState(value, dependencyRows)
                                    const { pathId } = navigationState
                                    if (!pathId) {
                                      return (
                                        <span title={navigationState.title}>
                                          <code className="super-admin-framework-package-editor__code-token">{value}</code>
                                        </span>
                                      )
                                    }

                                    return (
                                      <button
                                        type="button"
                                        className="super-admin-framework-package-editor__code-link"
                                        onClick={() => handleRuntimePathClickthrough(value)}
                                        aria-label={`Open Runtime Path Registry entry for ${value}`}
                                      >
                                        <code>{value}</code>
                                      </button>
                                    )
                                  } },
                                  { key: 'message', label: 'Message', width: '16%' },
                                ]}
                                data={paginatedRuntimeValidationRows}
                                emptyMessage={runtimeValidationAuditEmptyMessage}
                                paginationLabel="Runtime validation audit pagination"
                                currentPage={runtimeValidationTablePage}
                                totalPages={runtimeValidationTableTotalPages}
                                onPageChange={(nextPage) =>
                                  setEditorTablePage('runtimeValidation', nextPage, runtimeValidationTableTotalPages)
                                }
                              />
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Audit')}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Audit"
                        copy="Review package create, update, validate, and activate events."
                      />
                      {!isEditMode ? (
                        <p className="super-admin-framework-package-editor__helper">Audit events are available after the package is created.</p>
                      ) : auditAppError ? (
                        <p className="super-admin-framework-package-editor__error" role="alert">{auditAppError.message}</p>
                      ) : isAuditLoading ? (
                        <p className="super-admin-framework-package-editor__helper">Loading audit events...</p>
                      ) : (
                        <TableSurface
                          ariaLabel="Framework package audit log"
                          columns={[
                            { key: 'ts', label: 'Timestamp', width: '20%', render: formatDateTime },
                            { key: 'actorUserId', label: 'User', width: '18%', render: getAuditActorLabel },
                            { key: 'action', label: 'Action', width: '22%' },
                            { key: 'summary', label: 'Summary', width: '40%', render: (value, row) => value || JSON.stringify(row.diff ?? {}) },
                          ]}
                          data={paginatedAuditRows}
                          emptyMessage="No audit events found for this package."
                          paginationLabel="Framework package audit pagination"
                          currentPage={auditTablePage}
                          totalPages={auditTableTotalPages}
                          onPageChange={(nextPage) =>
                            setEditorTablePage('audit', nextPage, auditTableTotalPages)
                          }
                        />
                      )}
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('JSON / Diff')}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="JSON / Diff"
                        copy="Inspect read-only package JSON and the future version-diff scaffold."
                      />
                      <div className="super-admin-framework-package-editor__toolbar">
                        <div className="super-admin-framework-package-editor__table-actions">
                          <Button type="button" variant={showRawJson ? 'outline' : 'primary'} size="sm" onClick={() => setShowRawJson(false)}>
                            Formatted
                          </Button>
                          <Button type="button" variant={showRawJson ? 'primary' : 'outline'} size="sm" onClick={() => setShowRawJson(true)}>
                            Raw
                          </Button>
                        </div>
                        <Badge variant="neutral" size="sm" pill outline>
                          Read-only
                        </Badge>
                      </div>
                      <pre className="super-admin-framework-package-editor__json-preview" aria-label="Framework package JSON preview">
                        {showRawJson
                          ? JSON.stringify(currentPackageJson)
                          : JSON.stringify(currentPackageJson, null, 2)}
                      </pre>
                      <div className="super-admin-framework-package-editor__option-panel">
                        <p className="super-admin-framework-package-editor__helper">
                          Version diff is not available until package snapshot history is implemented.
                        </p>
                      </div>
                    </div>
                  </TabView.Tab>
                </TabView>

                {Object.keys(errors).length > 0 ? (
                  <p className="super-admin-framework-package-editor__error" role="alert">
                    Review the highlighted package fields and try again.
                  </p>
                ) : null}

                <div className="super-admin-framework-package-editor__footer-actions">
                  <Button type="button" variant="outline" size="sm" onClick={handleBack} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" loading={isSaving} disabled={cloneSaveDisabled}>
                    {isCloneMode ? 'Save Clone' : isEditMode ? 'Save Changes' : 'Create Framework Package'}
                  </Button>
                </div>
              </Card.Body>
            </form>
          </Card>
        ) : null}
      </Fieldset>
      <Dialog
        open={activationDialogOpen}
        onClose={() => setActivationDialogOpen(false)}
        size="md"
        className="super-admin-framework-package-editor__activation-dialog"
      >
        <Dialog.Header>
          <h2 className="dialog__title">Activate Package?</h2>
          <p className="dialog__subtitle">
            This will run the activation checkpoint again and lock the package for runtime use.
          </p>
        </Dialog.Header>
        <Dialog.Body>
          <div className="super-admin-framework-package-editor__dialog-fields">
            <p className="super-admin-framework-package-editor__helper">
              Package: {form.packageName || form.packageKey || `${form.frameworkKey} ${form.version}`}
            </p>
            <p className="super-admin-framework-package-editor__helper">
              Framework Key: {form.frameworkKey || 'Not selected'}
            </p>
            <p className="super-admin-framework-package-editor__helper">
              UI Contract: {form.uiContractKey || 'No UI Contract selected'}
            </p>
            <Status size="md" showIcon variant={getCheckStatusVariant(latestCheckpointStatus)}>
              Checkpoint Status: {latestCheckpointDisplay.text}
            </Status>
            <Status size="md" showIcon variant={runtimeActivationEffectiveVariant}>
              Activation Readiness: {runtimeActivationEffectiveLabel}
            </Status>
            <Status size="sm" showIcon variant={getCheckStatusVariant(latestRuntimeValidationDecision)}>
              Runtime Validation: {formatGovernanceToken(latestRuntimeValidationDecision, 'Not Run')}
            </Status>
            <p className="super-admin-framework-package-editor__helper">
              Dependency Lock: {runtimeActivationReadiness?.dependencyLockState || dependencyLockEvidenceStateLabel}
              {' - '}
              {runtimeActivationReadiness?.dependencyReferenceCount ?? dependencyLockMeta.referenceCount} refs
            </p>
            {runtimeActivationHistoryRows.length > 0 ? (
              <p className="super-admin-framework-package-editor__helper">
                Activation Snapshots: {runtimeActivationHistoryRows.length}
              </p>
            ) : null}
            {!runtimeActivationEffectiveReady && runtimeActivationEffectiveBlockingRequirements.length > 0 ? (
              <div className="super-admin-framework-package-editor__runtime-validation-issue-list">
                {runtimeActivationEffectiveBlockingRequirements.map((requirement) => (
                  <p
                    key={requirement.key || requirement.reason}
                    className="super-admin-framework-package-editor__runtime-validation-issue-row"
                  >
                    {requirement.message || requirement.reason}
                  </p>
                ))}
              </div>
            ) : null}
            <p className="super-admin-framework-package-editor__helper">
              Once activated, direct editing is locked and future changes require cloning a new version.
            </p>
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="outline" size="sm" onClick={() => setActivationDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleConfirmActivatePackage}
            loading={isActivatingPackage}
            disabled={!canActivatePackage}
          >
            Activate Package
          </Button>
        </Dialog.Footer>
      </Dialog>
      <Dialog
        open={Boolean(runtimeValidationCodeDetail)}
        onClose={() => setRuntimeValidationCodeDetail(null)}
        size="md"
        className="super-admin-framework-package-editor__runtime-validation-code-dialog"
        aria-label="Runtime validation code details"
      >
        <Dialog.Header>
          <h2 className="dialog__title">{runtimeValidationCodeDetail?.code}</h2>
          <p className="dialog__subtitle">{runtimeValidationCodeDetail?.title}</p>
        </Dialog.Header>
        <Dialog.Body>
          <div className="super-admin-framework-package-editor__dialog-fields">
            <Status
              size="md"
              showIcon
              variant={getCheckStatusVariant(runtimeValidationCodeDetail?.issue?.severity)}
            >
              Severity: {runtimeValidationCodeDetail?.issue?.severity || '--'}
            </Status>
            <div className="super-admin-framework-package-editor__runtime-validation-code-section">
              <span className="super-admin-framework-package-editor__summary-eyebrow">Explanation</span>
              <p className="super-admin-framework-package-editor__helper">
                {runtimeValidationCodeDetail?.explanation}
              </p>
            </div>
            <div className="super-admin-framework-package-editor__runtime-validation-code-section">
              <span className="super-admin-framework-package-editor__summary-eyebrow">Remediation</span>
              <p className="super-admin-framework-package-editor__helper">
                {runtimeValidationCodeDetail?.remediation}
              </p>
            </div>
            <div className="super-admin-framework-package-editor__runtime-validation-code-section">
              <span className="super-admin-framework-package-editor__summary-eyebrow">Related Subsystem</span>
              <p className="super-admin-framework-package-editor__helper">
                {runtimeValidationCodeDetail?.subsystem || '--'}
              </p>
            </div>
            <div className="super-admin-framework-package-editor__runtime-validation-code-section">
              <span className="super-admin-framework-package-editor__summary-eyebrow">Docs</span>
              <code className="super-admin-framework-package-editor__code-token">
                {runtimeValidationCodeDetail?.docsLink || '--'}
              </code>
            </div>
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setRuntimeValidationCodeDetail(null)}
          >
            Close
          </Button>
        </Dialog.Footer>
      </Dialog>
      <Dialog
        open={Boolean(integrityMessageDetail)}
        onClose={() => setIntegrityMessageDetail(null)}
        size="lg"
        className="super-admin-framework-package-editor__integrity-message-dialog"
        aria-label="Integrity message details"
      >
        <Dialog.Header>
          <h2 className="dialog__title">Integrity Check Details</h2>
          <p className="dialog__subtitle">
            Full diagnostic evidence for the selected integrity row.
          </p>
        </Dialog.Header>
        <Dialog.Body>
          <div className="super-admin-framework-package-editor__dialog-fields">
            <Status
              size="md"
              showIcon
              variant={getCheckStatusVariant(integrityMessageDetail?.row?.severity)}
            >
              Result: {integrityMessageDetail?.row?.severity || '--'}
            </Status>
            <div className="super-admin-framework-package-editor__integrity-detail-section">
              <span className="super-admin-framework-package-editor__summary-eyebrow">Check</span>
              <p className="super-admin-framework-package-editor__helper">
                {integrityMessageDetail?.row?.group || '--'}
              </p>
            </div>
            <div className="super-admin-framework-package-editor__integrity-detail-section">
              <span className="super-admin-framework-package-editor__summary-eyebrow">Field</span>
              <code className="super-admin-framework-package-editor__code-token">
                {integrityMessageDetail?.row?.field || '--'}
              </code>
            </div>
            <div className="super-admin-framework-package-editor__integrity-detail-section">
              <span className="super-admin-framework-package-editor__summary-eyebrow">Message</span>
              <p className="super-admin-framework-package-editor__helper">
                {integrityMessageDetail?.digest?.summary || integrityMessageDetail?.row?.message || '--'}
              </p>
            </div>
            {(integrityMessageDetail?.digest?.paths ?? []).length > 0 ? (
              <div className="super-admin-framework-package-editor__integrity-detail-section">
                <span className="super-admin-framework-package-editor__summary-eyebrow">
                  Runtime Paths ({integrityMessageDetail.digest.paths.length})
                </span>
                <div className="super-admin-framework-package-editor__integrity-path-list">
                  {integrityMessageDetail.digest.paths.map((path) => (
                    <code key={path} className="super-admin-framework-package-editor__code-token">
                      {path}
                    </code>
                  ))}
                </div>
              </div>
            ) : (
              <div className="super-admin-framework-package-editor__integrity-detail-section">
                <span className="super-admin-framework-package-editor__summary-eyebrow">Raw Detail</span>
                <p className="super-admin-framework-package-editor__helper">
                  {integrityMessageDetail?.row?.message || '--'}
                </p>
              </div>
            )}
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIntegrityMessageDetail(null)}
          >
            Close
          </Button>
        </Dialog.Footer>
      </Dialog>
      <Dialog
        open={sectionDialog.open}
        onClose={closeSectionDialog}
        size="lg"
        className="super-admin-framework-package-editor__section-dialog"
      >
        <Dialog.Header>
          <h2 className="dialog__title">
            {sectionDialog.index >= 0 ? 'Edit Section' : 'Add Section'}
          </h2>
          <p className="dialog__subtitle">
            Bind a package section to an active framework_state section runtime path. Presentation stays in the UI Contract.
          </p>
        </Dialog.Header>
        <Dialog.Body>
          <div className="super-admin-framework-package-editor__dialog-fields">
            <RuntimePathSearchSelect
              id="framework-package-editor-section-runtime-path"
              label="Runtime Path"
              frameworkKeys={form.frameworkKey ? [form.frameworkKey] : []}
              scope="FRAMEWORK_STATE"
              category="SECTION"
              operation={null}
              allowedOperations={['BIND']}
              pathPrefix="framework_state.sections."
              selectionMode="single"
              selectedKeys={sectionDialog.draft.runtimePath ? [sectionDialog.draft.runtimePath] : []}
              onChange={handleSectionRuntimePathChange}
              onSelect={handleSectionRuntimePathSelect}
              placeholder="Search section runtime paths"
              helperText="Only ACTIVE framework_state.sections.* runtime paths that allow BIND are selectable."
              disabled={runtimeStructureLocked}
            />
            <Input
              id="framework-package-editor-section-key"
              label="Section Key"
              value={sectionDialog.draft.sectionKey}
              onChange={(event) => updateSectionDraft('sectionKey', event.target.value)}
              helperText="Auto-derived from the selected runtime path. Must match the UI Contract section key."
              disabled={runtimeStructureLocked}
              fullWidth
            />
            <Tickbox
              id="framework-package-editor-section-required"
              label="Required"
              checked={sectionDialog.draft.required !== false}
              onChange={(event) => updateSectionDraft('required', event.target.checked)}
              disabled={runtimeStructureLocked}
            />
            <Textarea
              id="framework-package-editor-section-notes"
              label="Notes"
              value={sectionDialog.draft.notes ?? ''}
              onChange={(event) => updateSectionDraft('notes', event.target.value)}
              helperText="Internal structural notes only. Do not add labels, help text, or placeholder copy here."
              rows={3}
              disabled={directEditLocked}
              fullWidth
            />
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="outline" size="sm" onClick={closeSectionDialog}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveSection}
            disabled={
              runtimeStructureLocked
              ||
              !normalizeSectionKey(sectionDialog.draft.sectionKey)
              || !normalizeRuntimePath(sectionDialog.draft.runtimePath)
            }
          >
            Save Section
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminFrameworkPackageEditor
