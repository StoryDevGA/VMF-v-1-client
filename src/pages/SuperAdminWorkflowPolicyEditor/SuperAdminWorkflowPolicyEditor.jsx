import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { TabView } from '../../components/TabView'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { useToaster } from '../../components/Toaster'
import {
  useCreateWorkflowPolicyMutation,
  useGetWorkflowPolicyDependenciesQuery,
  useGetWorkflowPolicyQuery,
  useListFrameworkRegistriesQuery,
  useListRuntimeAgentsQuery,
  useListRuntimePathsQuery,
  useTestWorkflowPolicyMutation,
  useUpdateWorkflowPolicyMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { getRuntimeControlFieldErrorMap } from '../../utils/runtimeControlFormErrors.js'
import {
  formatWorkflowPolicyStatus,
  formatWorkflowPolicyType,
  formatWorkflowPolicyEnumLabel,
  getWorkflowPolicyStatusVariant,
  INITIAL_WORKFLOW_POLICY_FORM,
  mapWorkflowPolicyToForm,
  validateWorkflowPolicyForm,
  WORKFLOW_POLICY_ACTOR_SCOPE_OPTIONS,
  WORKFLOW_POLICY_APPLIES_TO_OPTIONS,
  WORKFLOW_POLICY_CONDITION_LOGIC,
  WORKFLOW_POLICY_CONDITION_LOGIC_OPTIONS,
  WORKFLOW_POLICY_CONDITION_OPERATOR_OPTIONS,
  WORKFLOW_POLICY_DECISION_MODE_OPTIONS,
  WORKFLOW_POLICY_EDITOR_TABS,
  WORKFLOW_POLICY_EFFECT_TYPE_OPTIONS,
  WORKFLOW_POLICY_FORM_STATUS_OPTIONS,
  WORKFLOW_POLICY_GOVERNED_ACTION_OPTIONS,
  WORKFLOW_POLICY_OVERRIDE_ROLE_OPTIONS,
  WORKFLOW_POLICY_ROUTING_MODE_OPTIONS,
  WORKFLOW_POLICY_SEVERITY_OPTIONS,
  WORKFLOW_POLICY_TRIGGER_EVENT_OPTIONS,
  WORKFLOW_POLICY_TRIGGER_MODE_OPTIONS,
  WORKFLOW_POLICY_TYPE_OPTIONS,
  WORKFLOW_POLICY_ESCALATE_TO_OPTIONS,
} from '../SuperAdminWorkflowPolicies/superAdminWorkflowPolicies.constants.js'
import './SuperAdminWorkflowPolicyEditor.css'

const WORKFLOW_POLICY_ERROR_TAB_LOOKUP = Object.freeze({
  key: 0,
  name: 0,
  description: 0,
  status: 0,
  policyType: 0,
  priority: 0,
  frameworkKeys: 0,
  appliesTo: 1,
  triggerEvent: 1,
  triggerMode: 1,
  actorScope: 1,
  cooldownSeconds: 1,
  conditions: 2,
  governedAction: 3,
  decisionMode: 3,
  severity: 3,
  passMessage: 3,
  failMessage: 3,
  routingMode: 4,
  primaryAgentId: 4,
  fallbackAgentId: 4,
  timeoutMs: 4,
  retryOverride: 4,
  requiredValidationKeys: 5,
  validationFreshnessMinutes: 5,
  onPassEffects: 6,
  onFailEffects: 6,
  overrideRoles: 7,
  approvalRequired: 7,
  escalateTo: 7,
  escalationMessage: 7,
  slaMinutes: 7,
})

const ACTIVE_FRAMEWORK_STATUS = 'ACTIVE'
const ACTIVE_AGENT_STATUS = 'ACTIVE'
const DEFAULT_VALIDATION_SUGGESTIONS = Object.freeze([
  'required-sections-check',
  'contract-schema-check',
  'duplicate-detection',
  'governance-completeness',
])
const EFFECT_TYPES_REQUIRING_TARGET_PATH = new Set([
  'SET_VALUE',
  'INCREMENT_COUNTER',
  'CLEAR_FIELD',
])
const EFFECT_TYPES_REQUIRING_VALUE = new Set([
  'SET_VALUE',
  'APPEND_AUDIT_ENTRY',
  'TRIGGER_POLICY_GROUP',
  'QUEUE_NOTIFICATION',
])
const TEST_CONSOLE_DEFAULT_STATE_TEXT = `{
  "vmf": {
    "status": "DRAFT",
    "metadata": {
      "lastValidatedAt": null
    }
  }
}`
const TEST_CONSOLE_TRIGGER_OPTIONS = Object.freeze([
  { value: '', label: 'Use policy trigger event' },
  ...WORKFLOW_POLICY_TRIGGER_EVENT_OPTIONS,
])
const TEST_CONSOLE_ACTOR_SCOPE_OPTIONS = Object.freeze([
  { value: '', label: 'Use policy actor scope' },
  ...WORKFLOW_POLICY_ACTOR_SCOPE_OPTIONS,
])

const normalizeFrameworkSelectionList = (values = []) =>
  [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value ?? '').trim().toUpperCase())
      .filter(Boolean),
  )]

const shallowEqualObject = (left, right) => {
  const leftKeys = Object.keys(left || {})
  const rightKeys = Object.keys(right || {})

  if (leftKeys.length !== rightKeys.length) return false

  return leftKeys.every((key) => left?.[key] === right?.[key])
}

const toggleListValue = (values, value) => {
  const nextValues = Array.isArray(values) ? [...values] : []
  return nextValues.includes(value)
    ? nextValues.filter((item) => item !== value)
    : [...nextValues, value]
}

const normalizeId = (value) => String(value ?? '').trim().toLowerCase()
const normalizeConditionLogic = (value) => String(value ?? WORKFLOW_POLICY_CONDITION_LOGIC.AND).trim().toUpperCase()
const WORKFLOW_POLICY_VALIDATION_JUMP_TARGETS = Object.freeze([
  { tabIndex: 0, fieldKey: 'key', focusId: 'workflow-policy-editor-key' },
  { tabIndex: 0, fieldKey: 'name', focusId: 'workflow-policy-editor-name' },
  { tabIndex: 0, fieldKey: 'description', focusId: 'workflow-policy-editor-description' },
  { tabIndex: 0, fieldKey: 'status', focusId: 'workflow-policy-editor-status' },
  { tabIndex: 0, fieldKey: 'policyType', focusId: 'workflow-policy-editor-policy-type' },
  { tabIndex: 0, fieldKey: 'priority', focusId: 'workflow-policy-editor-priority' },
  { tabIndex: 0, fieldKey: 'frameworkKeys', focusId: 'workflow-policy-editor-framework-grid' },
  { tabIndex: 1, fieldKey: 'appliesTo', focusId: 'workflow-policy-editor-applies-to' },
  { tabIndex: 1, fieldKey: 'triggerEvent', focusId: 'workflow-policy-editor-trigger-event' },
  { tabIndex: 1, fieldKey: 'triggerMode', focusId: 'workflow-policy-editor-trigger-mode' },
  { tabIndex: 1, fieldKey: 'actorScope', focusId: 'workflow-policy-editor-actor-scope' },
  { tabIndex: 1, fieldKey: 'cooldownSeconds', focusId: 'workflow-policy-editor-cooldown-seconds' },
  { tabIndex: 2, fieldKey: 'conditions', focusId: 'workflow-policy-editor-add-condition' },
  { tabIndex: 3, fieldKey: 'governedAction', focusId: 'workflow-policy-editor-governed-action' },
  { tabIndex: 3, fieldKey: 'decisionMode', focusId: 'workflow-policy-editor-decision-mode' },
  { tabIndex: 3, fieldKey: 'severity', focusId: 'workflow-policy-editor-severity' },
  { tabIndex: 3, fieldKey: 'passMessage', focusId: 'workflow-policy-editor-pass-message' },
  { tabIndex: 3, fieldKey: 'failMessage', focusId: 'workflow-policy-editor-fail-message' },
  { tabIndex: 4, fieldKey: 'routingMode', focusId: 'workflow-policy-editor-routing-mode' },
  { tabIndex: 4, fieldKey: 'primaryAgentId', focusId: 'workflow-policy-editor-primary-agent' },
  { tabIndex: 4, fieldKey: 'fallbackAgentId', focusId: 'workflow-policy-editor-fallback-agent' },
  { tabIndex: 4, fieldKey: 'timeoutMs', focusId: 'workflow-policy-editor-timeout-ms' },
  { tabIndex: 4, fieldKey: 'retryOverride', focusId: 'workflow-policy-editor-retry-override' },
  { tabIndex: 5, fieldKey: 'requiredValidationKeys', focusId: 'workflow-policy-editor-validation-key' },
  { tabIndex: 5, fieldKey: 'validationFreshnessMinutes', focusId: 'workflow-policy-editor-validation-freshness' },
  { tabIndex: 6, fieldKey: 'onPassEffects', focusId: 'workflow-policy-editor-onPassEffects-add-effect' },
  { tabIndex: 6, fieldKey: 'onFailEffects', focusId: 'workflow-policy-editor-onFailEffects-add-effect' },
  { tabIndex: 7, fieldKey: 'overrideRoles', focusId: 'workflow-policy-editor-override-roles' },
  { tabIndex: 7, fieldKey: 'approvalRequired', focusId: 'workflow-policy-editor-approval-required' },
  { tabIndex: 7, fieldKey: 'escalateTo', focusId: 'workflow-policy-editor-escalate-to' },
  { tabIndex: 7, fieldKey: 'escalationMessage', focusId: 'workflow-policy-editor-escalation-message' },
  { tabIndex: 7, fieldKey: 'slaMinutes', focusId: 'workflow-policy-editor-sla-minutes' },
])

const buildConditionRow = () => ({
  path: '',
  operator: '',
  value: '',
  logic: WORKFLOW_POLICY_CONDITION_LOGIC.AND,
})

const buildEffectRow = () => ({
  type: '',
  targetPath: '',
  value: '',
})

const normalizePreviewList = (values = [], { uppercase = false } = {}) =>
  [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value ?? '').trim())
      .filter(Boolean)
      .map((value) => (uppercase ? value.toUpperCase() : value)),
  )]

const parsePreviewInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isInteger(parsed) ? parsed : fallback
}

const buildWorkflowPolicyJsonPreview = (formState = {}) => ({
  key: String(formState.key ?? '').trim(),
  name: String(formState.name ?? '').trim(),
  description: String(formState.description ?? '').trim(),
  status: String(formState.status ?? '').trim().toUpperCase(),
  policyType: String(formState.policyType ?? '').trim().toUpperCase(),
  priority: parsePreviewInteger(formState.priority, 0),
  frameworkKeys: normalizePreviewList(formState.frameworkKeys, { uppercase: true }),
  appliesTo: String(formState.appliesTo ?? '').trim().toUpperCase(),
  triggerEvent: String(formState.triggerEvent ?? '').trim().toUpperCase(),
  triggerMode: String(formState.triggerMode ?? '').trim().toUpperCase(),
  actorScope: String(formState.actorScope ?? '').trim().toUpperCase(),
  cooldownSeconds: parsePreviewInteger(formState.cooldownSeconds, 0),
  reevaluateOnRetry: Boolean(formState.reevaluateOnRetry),
  governedAction: String(formState.governedAction ?? '').trim().toUpperCase(),
  decisionMode: String(formState.decisionMode ?? '').trim().toUpperCase(),
  passMessage: String(formState.passMessage ?? '').trim(),
  failMessage: String(formState.failMessage ?? '').trim(),
  severity: String(formState.severity ?? '').trim().toUpperCase(),
  conditions: (Array.isArray(formState.conditions) ? formState.conditions : [])
    .map((condition) => ({
      path: String(condition?.path ?? '').trim(),
      operator: String(condition?.operator ?? '').trim(),
      value: condition?.value ?? '',
      logic: String(condition?.logic ?? WORKFLOW_POLICY_CONDITION_LOGIC.AND).trim().toUpperCase(),
    }))
    .filter((condition) => condition.path || condition.operator || condition.value),
  routingMode: String(formState.routingMode ?? '').trim().toUpperCase(),
  primaryAgentId: String(formState.primaryAgentId ?? '').trim().toLowerCase(),
  fallbackAgentId: String(formState.fallbackAgentId ?? '').trim().toLowerCase(),
  timeoutMs: parsePreviewInteger(formState.timeoutMs, 0),
  retryOverride: String(formState.retryOverride ?? '').trim(),
  requireSuccess: Boolean(formState.requireSuccess),
  requiredValidationKeys: normalizePreviewList(formState.requiredValidationKeys),
  validationBlockingOnFail: Boolean(formState.validationBlockingOnFail),
  validationWarningOnly: Boolean(formState.validationWarningOnly),
  validationFreshnessMinutes: parsePreviewInteger(formState.validationFreshnessMinutes, 0),
  validationRequireLatestRun: Boolean(formState.validationRequireLatestRun),
  onPassEffects: (Array.isArray(formState.onPassEffects) ? formState.onPassEffects : [])
    .map((effect) => ({
      type: String(effect?.type ?? '').trim().toUpperCase(),
      targetPath: String(effect?.targetPath ?? '').trim(),
      value: effect?.value ?? '',
    }))
    .filter((effect) => effect.type || effect.targetPath || effect.value),
  onFailEffects: (Array.isArray(formState.onFailEffects) ? formState.onFailEffects : [])
    .map((effect) => ({
      type: String(effect?.type ?? '').trim().toUpperCase(),
      targetPath: String(effect?.targetPath ?? '').trim(),
      value: effect?.value ?? '',
    }))
    .filter((effect) => effect.type || effect.targetPath || effect.value),
  overrideAllowed: Boolean(formState.overrideAllowed),
  overrideRoles: normalizePreviewList(formState.overrideRoles, { uppercase: true }),
  approvalRequired: Boolean(formState.approvalRequired),
  escalateTo: String(formState.escalateTo ?? '').trim().toUpperCase(),
  escalationMessage: String(formState.escalationMessage ?? '').trim(),
  slaMinutes: parsePreviewInteger(formState.slaMinutes, 0),
  version: parsePreviewInteger(formState.version, 1),
  lastActivatedAt: String(formState.lastActivatedAt ?? '').trim(),
  orderedSteps: normalizePreviewList(formState.orderedSteps),
  requiredAgentIds: normalizePreviewList(formState.requiredAgentIds),
  requiredSkillIds: normalizePreviewList(formState.requiredSkillIds),
  gatingRules: normalizePreviewList(formState.gatingRules),
})

const flattenJsonPreviewEntries = (value, prefix = '', entries = []) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenJsonPreviewEntries(item, `${prefix}[${index}]`, entries)
    })
    if (value.length === 0 && prefix) {
      entries.push([prefix, []])
    }
    return entries
  }

  if (value && typeof value === 'object') {
    const objectEntries = Object.entries(value)
    if (objectEntries.length === 0 && prefix) {
      entries.push([prefix, {}])
      return entries
    }
    objectEntries.forEach(([key, entryValue]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key
      flattenJsonPreviewEntries(entryValue, nextPrefix, entries)
    })
    return entries
  }

  if (prefix) {
    entries.push([prefix, value])
  }

  return entries
}

const buildWorkflowPolicyDiffSummary = (currentValue, previousValue) => {
  const currentEntries = new Map(flattenJsonPreviewEntries(currentValue))
  const previousEntries = new Map(flattenJsonPreviewEntries(previousValue))
  const allKeys = [...new Set([...currentEntries.keys(), ...previousEntries.keys()])].sort()
  const changes = allKeys.reduce((collection, key) => {
    const currentEntry = currentEntries.get(key)
    const previousEntry = previousEntries.get(key)
    const hasCurrent = currentEntries.has(key)
    const hasPrevious = previousEntries.has(key)

    if (!hasPrevious) {
      collection.push({ path: key, changeType: 'ADDED', currentValue: currentEntry, previousValue: undefined })
      return collection
    }

    if (!hasCurrent) {
      collection.push({ path: key, changeType: 'REMOVED', currentValue: undefined, previousValue: previousEntry })
      return collection
    }

    if (JSON.stringify(currentEntry) !== JSON.stringify(previousEntry)) {
      collection.push({ path: key, changeType: 'CHANGED', currentValue: currentEntry, previousValue: previousEntry })
    }

    return collection
  }, [])

  return {
    total: changes.length,
    added: changes.filter((entry) => entry.changeType === 'ADDED').length,
    removed: changes.filter((entry) => entry.changeType === 'REMOVED').length,
    changed: changes.filter((entry) => entry.changeType === 'CHANGED').length,
    changes,
  }
}

const formatJsonCodeBlock = (value) => JSON.stringify(value, null, 2)

const formatAuditDate = (value) => {
  const timestamp = Date.parse(String(value ?? ''))
  if (Number.isNaN(timestamp)) return '--'

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function WorkflowPolicyEditorLoadingState({ isEditMode }) {
  return (
    <Card variant="elevated" className="super-admin-workflow-policy-editor__loading-card">
      <Card.Body className="super-admin-workflow-policy-editor__card-body super-admin-workflow-policy-editor__card-body--compact super-admin-workflow-policy-editor__loading-body">
        <Spinner size="lg" />
        <p className="super-admin-workflow-policy-editor__helper">
          {isEditMode ? 'Loading workflow policy details...' : 'Preparing workflow policy editor...'}
        </p>
      </Card.Body>
    </Card>
  )
}

function WorkflowPolicyEditorErrorState({ message, onBack }) {
  return (
    <Card variant="elevated" className="super-admin-workflow-policy-editor__error-card">
      <Card.Body className="super-admin-workflow-policy-editor__card-body super-admin-workflow-policy-editor__card-body--compact super-admin-workflow-policy-editor__loading-body">
        <p className="super-admin-workflow-policy-editor__error" role="alert">
          {message}
        </p>
        <div className="super-admin-workflow-policy-editor__top-actions">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
      </Card.Body>
    </Card>
  )
}

function FrameworkOptionLabel({ entry }) {
  const statusValue = String(entry?.status ?? '').trim().toUpperCase()
  const isActive = statusValue === ACTIVE_FRAMEWORK_STATUS

  return (
    <span className="super-admin-workflow-policy-editor__framework-option-label">
      <span>{entry?.name || entry?.frameworkKey}</span>
      <Badge variant={isActive ? 'success' : 'warning'} size="sm" pill outline>
        {entry?.frameworkKey}
      </Badge>
      {!isActive ? (
        <Badge variant="warning" size="sm" pill outline>
          {formatWorkflowPolicyStatus(statusValue)}
        </Badge>
      ) : null}
    </span>
  )
}

function OverrideRoleOptionLabel({ label }) {
  return (
    <span className="super-admin-workflow-policy-editor__framework-option-label">
      <span>{label}</span>
      <Badge variant="info" size="sm" pill outline>
        Override
      </Badge>
    </span>
  )
}

function AgentSummaryCard({ title, agent }) {
  if (!agent) return null

  const assignedSkillCount = [
    ...(Array.isArray(agent.defaultSkillIds) ? agent.defaultSkillIds : []),
    ...(Array.isArray(agent.primarySkillIds) ? agent.primarySkillIds : []),
    ...(Array.isArray(agent.optionalSkillIds) ? agent.optionalSkillIds : []),
  ].filter(Boolean).length
  const executionPlanCount = Array.isArray(agent.executionPlan) ? agent.executionPlan.length : 0
  const inputContractLabel =
    agent?.inputContract && typeof agent.inputContract === 'object' ? 'JSON' : '--'
  const outputContractLabel =
    agent?.outputContract && typeof agent.outputContract === 'object' ? 'JSON' : '--'

  return (
    <div className="super-admin-workflow-policy-editor__agent-summary">
      <div className="super-admin-workflow-policy-editor__agent-summary-header">
        <div>
          <p className="super-admin-workflow-policy-editor__summary-label">{title}</p>
          <p className="super-admin-workflow-policy-editor__agent-summary-title">{agent.name || agent.key}</p>
        </div>
        <Status
          size="sm"
          showIcon
          variant={String(agent.status ?? '').trim().toUpperCase() === ACTIVE_AGENT_STATUS ? 'success' : 'warning'}
        >
          {formatWorkflowPolicyStatus(agent.status)}
        </Status>
      </div>
      <dl className="super-admin-workflow-policy-editor__agent-summary-grid">
        <div>
          <dt>Assigned Skills</dt>
          <dd>{assignedSkillCount}</dd>
        </div>
        <div>
          <dt>Execution Plan</dt>
          <dd>{executionPlanCount > 0 ? `${executionPlanCount} step${executionPlanCount === 1 ? '' : 's'}` : 'Empty'}</dd>
        </div>
        <div>
          <dt>Input Contract</dt>
          <dd>{inputContractLabel}</dd>
        </div>
        <div>
          <dt>Output Contract</dt>
          <dd>{outputContractLabel}</dd>
        </div>
      </dl>
    </div>
  )
}

function WorkflowPolicyEditor() {
  const navigate = useNavigate()
  const { policyId = '' } = useParams()
  const { addToast } = useToaster()
  const isEditMode = Boolean(policyId)
  const formIdentity = policyId || '__new__'

  const [formDraftState, setFormDraftState] = useState({
    identity: '__new__',
    form: null,
  })
  const [errors, setErrors] = useState({})
  const [errorsSource, setErrorsSource] = useState(null)
  const [showValidationHints, setShowValidationHints] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [pendingValidationKey, setPendingValidationKey] = useState('')
  const [testConsoleForm, setTestConsoleForm] = useState({
    frameworkStateText: TEST_CONSOLE_DEFAULT_STATE_TEXT,
    triggerEvent: '',
    actorScope: '',
  })
  const [testConsoleError, setTestConsoleError] = useState('')
  const [testConsoleResult, setTestConsoleResult] = useState(null)

  const {
    data: policyResponse,
    isLoading: isPolicyLoading,
    error: policyError,
  } = useGetWorkflowPolicyQuery(policyId, {
    skip: !isEditMode,
  })
  const {
    data: dependenciesResponse,
    isLoading: isDependenciesLoading,
  } = useGetWorkflowPolicyDependenciesQuery(policyId, {
    skip: !isEditMode,
  })
  const runtimePathLookupFrameworkKeys = useMemo(() => {
    const draftFrameworkKeys =
      formDraftState.identity === formIdentity
      && Array.isArray(formDraftState.form?.frameworkKeys)
        ? formDraftState.form.frameworkKeys
        : null

    if (draftFrameworkKeys) {
      return normalizeFrameworkSelectionList(draftFrameworkKeys)
    }

    return normalizeFrameworkSelectionList(policyResponse?.data?.frameworkKeys)
  }, [formDraftState, formIdentity, policyResponse])
  const runtimePathLookupFrameworkKeysParam = runtimePathLookupFrameworkKeys.join(',')
  const { data: registryResponse } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })
  const { data: runtimeAgentsResponse } = useListRuntimeAgentsQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })
  const {
    data: runtimePathsResponse,
    isFetching: isRuntimePathsLoading,
    error: runtimePathsError,
  } = useListRuntimePathsQuery({
    page: 1,
    pageSize: 100,
    q: '',
    status: 'ACTIVE',
    ...(runtimePathLookupFrameworkKeysParam ? { frameworkKeys: runtimePathLookupFrameworkKeysParam } : {}),
    scope: 'FRAMEWORK_STATE',
    operation: 'READ',
  })
  const {
    data: writeRuntimePathsResponse,
    isFetching: isWriteRuntimePathsLoading,
    error: writeRuntimePathsError,
  } = useListRuntimePathsQuery({
    page: 1,
    pageSize: 100,
    q: '',
    status: 'ACTIVE',
    ...(runtimePathLookupFrameworkKeysParam ? { frameworkKeys: runtimePathLookupFrameworkKeysParam } : {}),
    scope: 'FRAMEWORK_STATE',
    operation: 'WRITE',
    isProtected: 'false',
  })
  const [createWorkflowPolicy, { isLoading: isCreating }] = useCreateWorkflowPolicyMutation()
  const [updateWorkflowPolicy, { isLoading: isUpdating }] = useUpdateWorkflowPolicyMutation()
  const [testWorkflowPolicy, { isLoading: isTestRunning }] = useTestWorkflowPolicyMutation()

  const loadedPolicy = policyResponse?.data ?? null
  const policyAppError = policyError ? normalizeError(policyError) : null
  const runtimePathsAppError = runtimePathsError ? normalizeError(runtimePathsError) : null
  const writeRuntimePathsAppError = writeRuntimePathsError ? normalizeError(writeRuntimePathsError) : null
  const frameworkRows = useMemo(
    () => (Array.isArray(registryResponse?.data) ? registryResponse.data : []),
    [registryResponse],
  )
  const runtimeAgentRows = useMemo(
    () => (Array.isArray(runtimeAgentsResponse?.data) ? runtimeAgentsResponse.data : []),
    [runtimeAgentsResponse],
  )
  const runtimePathRows = useMemo(
    () => (Array.isArray(runtimePathsResponse?.data) ? runtimePathsResponse.data : []),
    [runtimePathsResponse],
  )
  const writableRuntimePathRows = useMemo(
    () => (Array.isArray(writeRuntimePathsResponse?.data) ? writeRuntimePathsResponse.data : []),
    [writeRuntimePathsResponse],
  )
  const dependencyData = dependenciesResponse?.data ?? null
  const loadedPolicyForm = useMemo(
    () => (isEditMode && loadedPolicy ? mapWorkflowPolicyToForm(loadedPolicy) : null),
    [isEditMode, loadedPolicy],
  )
  const form = useMemo(() => {
    if (formDraftState.identity === formIdentity && formDraftState.form) {
      return formDraftState.form
    }

    if (loadedPolicyForm) {
      return loadedPolicyForm
    }

    return INITIAL_WORKFLOW_POLICY_FORM
  }, [formDraftState, formIdentity, loadedPolicyForm])
  const supportedFrameworkKeys = useMemo(
    () => frameworkRows.map((entry) => String(entry.frameworkKey ?? '').trim().toUpperCase()).filter(Boolean),
    [frameworkRows],
  )
  const frameworkRegistryByKey = useMemo(
    () => new Map(frameworkRows.map((entry) => [String(entry.frameworkKey ?? '').trim().toUpperCase(), entry])),
    [frameworkRows],
  )
  const runtimeAgentById = useMemo(
    () => new Map(runtimeAgentRows.map((agent) => [normalizeId(agent.id), agent])),
    [runtimeAgentRows],
  )
  const legacyFrameworkKeys = useMemo(
    () => (Array.isArray(form.frameworkKeys) ? form.frameworkKeys : []).filter(
      (frameworkKey) => !frameworkRegistryByKey.has(String(frameworkKey ?? '').trim().toUpperCase()),
    ),
    [form.frameworkKeys, frameworkRegistryByKey],
  )
  const runtimePathOptions = useMemo(() => {
    const selectedFrameworkKeys = Array.isArray(form.frameworkKeys) ? form.frameworkKeys : []
    return runtimePathRows
      .filter((row) => {
        if (selectedFrameworkKeys.length === 0) return true
        const rowFrameworkKeys = Array.isArray(row.frameworkKeys) ? row.frameworkKeys : []
        return selectedFrameworkKeys.some((frameworkKey) => rowFrameworkKeys.includes(frameworkKey))
      })
      .map((row) => ({
        value: String(row.pathKey ?? ''),
        label: row.label ? `${row.pathKey} (${row.label})` : String(row.pathKey ?? ''),
      }))
      .filter((option) => option.value)
  }, [form.frameworkKeys, runtimePathRows])
  const writableRuntimePathOptions = useMemo(() => {
    const selectedFrameworkKeys = Array.isArray(form.frameworkKeys) ? form.frameworkKeys : []
    const baseOptions = writableRuntimePathRows
      .filter((row) => {
        if (selectedFrameworkKeys.length === 0) return true
        const rowFrameworkKeys = Array.isArray(row.frameworkKeys) ? row.frameworkKeys : []
        return selectedFrameworkKeys.some((frameworkKey) => rowFrameworkKeys.includes(frameworkKey))
      })
      .map((row) => ({
        value: String(row.pathKey ?? ''),
        label: row.label ? `${row.pathKey} (${row.label})` : String(row.pathKey ?? ''),
      }))
      .filter((option) => option.value)

    const maybeAddSelectedPath = (pathKey, options) => {
      const normalizedPathKey = String(pathKey ?? '').trim()
      if (!normalizedPathKey || options.some((option) => option.value === normalizedPathKey)) {
        return options
      }

      return [{ value: normalizedPathKey, label: normalizedPathKey }, ...options]
    }

    const selectedEffectPaths = [
      ...(Array.isArray(form.onPassEffects) ? form.onPassEffects.map((effect) => effect?.targetPath) : []),
      ...(Array.isArray(form.onFailEffects) ? form.onFailEffects.map((effect) => effect?.targetPath) : []),
    ]

    return selectedEffectPaths.reduce(
      (options, pathKey) => maybeAddSelectedPath(pathKey, options),
      baseOptions,
    )
  }, [form.frameworkKeys, form.onFailEffects, form.onPassEffects, writableRuntimePathRows])
  const runtimePathAvailabilityMessage = useMemo(() => {
    if (isRuntimePathsLoading || runtimePathsAppError || runtimePathOptions.length > 0) {
      return ''
    }

    if (runtimePathLookupFrameworkKeys.length > 0) {
      return `No ACTIVE FRAMEWORK_STATE runtime paths are currently registered for ${runtimePathLookupFrameworkKeys.join(', ')}.`
    }

    return 'No ACTIVE FRAMEWORK_STATE runtime paths are currently registered.'
  }, [
    isRuntimePathsLoading,
    runtimePathLookupFrameworkKeys,
    runtimePathOptions.length,
    runtimePathsAppError,
  ])
  const writableRuntimePathAvailabilityMessage = useMemo(() => {
    if (isWriteRuntimePathsLoading || writeRuntimePathsAppError || writableRuntimePathOptions.length > 0) {
      return ''
    }

    if (runtimePathLookupFrameworkKeys.length > 0) {
      return `No writable FRAMEWORK_STATE runtime paths are currently registered for ${runtimePathLookupFrameworkKeys.join(', ')}.`
    }

    return 'No writable FRAMEWORK_STATE runtime paths are currently registered.'
  }, [
    isWriteRuntimePathsLoading,
    runtimePathLookupFrameworkKeys,
    writableRuntimePathOptions.length,
    writeRuntimePathsAppError,
  ])
  const runtimePathSelectPlaceholder = isRuntimePathsLoading
    ? 'Loading governed paths...'
    : runtimePathOptions.length > 0
      ? 'Select a governed path'
      : 'No governed paths available'
  const writableRuntimePathSelectPlaceholder = isWriteRuntimePathsLoading
    ? 'Loading writable paths...'
    : writableRuntimePathOptions.length > 0
      ? 'Select writable path'
      : 'No writable paths available'
  const compatibleAgentOptions = useMemo(() => {
    const selectedFrameworkKeys = Array.isArray(form.frameworkKeys) ? form.frameworkKeys : []
    const compatibleAgents = runtimeAgentRows.filter((agent) => {
      const agentFrameworks = Array.isArray(agent.supportedFrameworkKeys) ? agent.supportedFrameworkKeys : []
      return selectedFrameworkKeys.length === 0
        ? true
        : selectedFrameworkKeys.every((frameworkKey) => agentFrameworks.includes(frameworkKey))
    })

    const baseOptions = compatibleAgents
      .map((agent) => ({
        value: normalizeId(agent.id),
        label: `${agent.name || agent.key} (${agent.key})`,
      }))
      .filter((option) => option.value)

    const maybeAddSelectedAgent = (agentId, options) => {
      const normalizedAgentId = normalizeId(agentId)
      if (!normalizedAgentId || options.some((option) => option.value === normalizedAgentId)) {
        return options
      }

      const selectedAgent = runtimeAgentById.get(normalizedAgentId)
      if (!selectedAgent) return options

      return [
        {
          value: normalizedAgentId,
          label: `${selectedAgent.name || selectedAgent.key} (${selectedAgent.key})`,
        },
        ...options,
      ]
    }

    return maybeAddSelectedAgent(form.fallbackAgentId, maybeAddSelectedAgent(form.primaryAgentId, baseOptions))
  }, [form.fallbackAgentId, form.frameworkKeys, form.primaryAgentId, runtimeAgentById, runtimeAgentRows])

  const primaryAgent = runtimeAgentById.get(normalizeId(form.primaryAgentId))
  const fallbackAgent = runtimeAgentById.get(normalizeId(form.fallbackAgentId))
  const chosenTestAgent = runtimeAgentById.get(normalizeId(testConsoleResult?.chosenAgent?.id))
  const isSaving = isCreating || isUpdating
  const currentJsonPreview = useMemo(() => buildWorkflowPolicyJsonPreview(form), [form])
  const previousJsonPreview = useMemo(
    () => (loadedPolicyForm ? buildWorkflowPolicyJsonPreview(loadedPolicyForm) : {}),
    [loadedPolicyForm],
  )
  const jsonDiffSummary = useMemo(
    () => buildWorkflowPolicyDiffSummary(currentJsonPreview, previousJsonPreview),
    [currentJsonPreview, previousJsonPreview],
  )
  const liveValidation = useMemo(
    () => validateWorkflowPolicyForm(
      form,
      [],
      isEditMode ? policyId : '',
      supportedFrameworkKeys,
      runtimeAgentRows,
      writableRuntimePathRows,
    ),
    [form, isEditMode, policyId, runtimeAgentRows, supportedFrameworkKeys, writableRuntimePathRows],
  )
  const isCreateDisabled = useMemo(() => {
    if (isEditMode) return false
    if (isCreating) return true

    return Object.keys(liveValidation.errors || {}).length > 0
  }, [isCreating, isEditMode, liveValidation.errors])
  const isCreateReady = !isEditMode && !isCreateDisabled
  const hintErrors = useMemo(() => {
    if (errorsSource === 'server') return errors
    if (showValidationHints) return liveValidation.errors || {}
    return {}
  }, [errors, errorsSource, liveValidation.errors, showValidationHints])
  const tabErrorCounts = useMemo(() => ({
    frameworkCompatibility: hintErrors.frameworkKeys ? 1 : 0,
    scopeTrigger: ['appliesTo', 'triggerEvent', 'triggerMode', 'actorScope', 'cooldownSeconds']
      .filter((key) => hintErrors[key]).length,
    frameworkStateConditions: hintErrors.conditions ? 1 : 0,
    actionGovernance: ['governedAction', 'decisionMode', 'severity', 'passMessage', 'failMessage']
      .filter((key) => hintErrors[key]).length,
    agentRouting: ['routingMode', 'primaryAgentId', 'fallbackAgentId', 'timeoutMs', 'retryOverride']
      .filter((key) => hintErrors[key]).length,
    validationRequirements: ['requiredValidationKeys', 'validationFreshnessMinutes']
      .filter((key) => hintErrors[key]).length,
    outcomeStateEffects: ['onPassEffects', 'onFailEffects'].filter((key) => hintErrors[key]).length,
    escalationOverrides: ['overrideRoles', 'approvalRequired', 'escalateTo', 'escalationMessage', 'slaMinutes']
      .filter((key) => hintErrors[key]).length,
  }), [hintErrors])

  const setForm = (updater) => {
    setFormDraftState((current) => {
      const baseForm =
        current.identity === formIdentity && current.form
          ? current.form
          : (loadedPolicyForm ?? INITIAL_WORKFLOW_POLICY_FORM)

      return {
        identity: formIdentity,
        form: typeof updater === 'function' ? updater(baseForm) : updater,
      }
    })
  }

  useEffect(() => {
    if (!isEditMode) {
      setFormDraftState({
        identity: '__new__',
        form: { ...INITIAL_WORKFLOW_POLICY_FORM },
      })
      setErrors({})
      setErrorsSource(null)
      setShowValidationHints(false)
      setActiveTab(0)
      setPendingValidationKey('')
      setTestConsoleForm({
        frameworkStateText: TEST_CONSOLE_DEFAULT_STATE_TEXT,
        triggerEvent: '',
        actorScope: '',
      })
      setTestConsoleError('')
      setTestConsoleResult(null)
      return
    }

    if (loadedPolicyForm) {
      setFormDraftState({
        identity: formIdentity,
        form: loadedPolicyForm,
      })
      setErrors({})
      setErrorsSource(null)
      setShowValidationHints(false)
      setActiveTab(0)
      setPendingValidationKey('')
      setTestConsoleForm({
        frameworkStateText: TEST_CONSOLE_DEFAULT_STATE_TEXT,
        triggerEvent: '',
        actorScope: '',
      })
      setTestConsoleError('')
      setTestConsoleResult(null)
    }
  }, [formIdentity, isEditMode, loadedPolicyForm])

  useEffect(() => {
    if (isEditMode) return

    const liveErrors = liveValidation?.errors && typeof liveValidation.errors === 'object'
      ? liveValidation.errors
      : {}

    if (errorsSource === 'client' && showValidationHints) {
      setErrors((current) => (shallowEqualObject(current, liveErrors) ? current : liveErrors))

      if (Object.keys(liveErrors).length === 0) {
        setErrors({})
        setErrorsSource(null)
        setShowValidationHints(false)
      }
    }
  }, [errorsSource, isEditMode, liveValidation.errors, showValidationHints])

  const handleBack = () => {
    navigate('/super-admin/runtime-control/workflow-policies')
  }

  const focusFirstErrorField = (fieldErrors) => {
    const firstField = Object.keys(fieldErrors || {})[0]
    const jumpTarget = WORKFLOW_POLICY_VALIDATION_JUMP_TARGETS.find((target) => target.fieldKey === firstField)

    if (jumpTarget) {
      setActiveTab(jumpTarget.tabIndex)
      requestAnimationFrame(() => {
        const element = document.getElementById(jumpTarget.focusId)
        if (element && typeof element.focus === 'function') {
          if (typeof element.scrollIntoView === 'function') {
            element.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }
          element.focus()
        }
      })
      return
    }

    const errorTab = WORKFLOW_POLICY_ERROR_TAB_LOOKUP[firstField]
    if (Number.isInteger(errorTab)) {
      setActiveTab(errorTab)
    }
  }

  const revealValidationErrors = (nextErrors, { showSuccessToast = true } = {}) => {
    const errorsObject = nextErrors && typeof nextErrors === 'object' ? nextErrors : {}

    setErrors(errorsObject)
    setErrorsSource('client')
    setShowValidationHints(true)
    focusFirstErrorField(errorsObject)

    if (Object.keys(errorsObject).length === 0) {
      if (showSuccessToast) {
        addToast({
          title: 'All checks passed',
          description: isEditMode
            ? 'This workflow policy is ready to be saved.'
            : 'This workflow policy is ready to be created.',
          variant: 'success',
        })
      }
      return
    }

    addToast({
      title: 'Missing required fields',
      description: 'Review the highlighted workflow policy fields across the editor tabs.',
      variant: 'warning',
    })
  }

  const handleReviewMissingFields = () => {
    const { errors: nextErrors } = validateWorkflowPolicyForm(
      form,
      [],
      isEditMode ? policyId : '',
      supportedFrameworkKeys,
      runtimeAgentRows,
      writableRuntimePathRows,
    )

    revealValidationErrors(nextErrors)
  }

  const renderTabLabel = (label, count = 0) => (
    <span className="super-admin-workflow-policy-editor__tab-label">
      <span>{label}</span>
      {count > 0 ? (
        <>
          <span className="super-admin-workflow-policy-editor__tab-error-count" aria-hidden="true">
            ({count})
          </span>
          <span className="sr-only"> ({count} validation errors)</span>
        </>
      ) : null}
    </span>
  )

  const addValidationKey = () => {
    const normalized = String(pendingValidationKey ?? '').trim().toLowerCase()
    if (!normalized) return

    setForm((current) => ({
      ...current,
      requiredValidationKeys: [...new Set([...(current.requiredValidationKeys ?? []), normalized])],
    }))
    setPendingValidationKey('')
  }

  const handleRunTestConsole = async () => {
    setTestConsoleError('')
    setTestConsoleResult(null)

    let frameworkState = {}
    try {
      frameworkState = JSON.parse(String(testConsoleForm.frameworkStateText ?? '').trim() || '{}')
      if (!frameworkState || typeof frameworkState !== 'object' || Array.isArray(frameworkState)) {
        throw new Error('Sample FRAMEWORK_STATE must be a JSON object.')
      }
    } catch (error) {
      setTestConsoleError(error.message || 'Sample FRAMEWORK_STATE must be valid JSON.')
      return
    }

    const { errors: clientErrors, payload } = validateWorkflowPolicyForm(
      form,
      [],
      policyId,
      supportedFrameworkKeys,
      runtimeAgentRows,
      writableRuntimePathRows,
    )

    if (Object.keys(clientErrors).length > 0) {
      revealValidationErrors(clientErrors, { showSuccessToast: false })
      setTestConsoleError('Complete the required workflow policy fields before running the test console.')
      return
    }

    try {
      const response = await testWorkflowPolicy({
        draft: payload,
        frameworkState,
        ...(testConsoleForm.triggerEvent ? { triggerEvent: testConsoleForm.triggerEvent } : {}),
        ...(testConsoleForm.actorScope ? { actorScope: testConsoleForm.actorScope } : {}),
      }).unwrap()

      setTestConsoleResult(response?.data ?? null)
    } catch (error) {
      const appError = normalizeError(error)
      setTestConsoleError(appError.message)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const { errors: clientErrors, payload } = validateWorkflowPolicyForm(
      form,
      [],
      policyId,
      supportedFrameworkKeys,
      runtimeAgentRows,
      writableRuntimePathRows,
    )

    if (Object.keys(clientErrors).length > 0) {
      revealValidationErrors(clientErrors, { showSuccessToast: false })
      return
    }

    try {
      if (isEditMode) {
        await updateWorkflowPolicy({
          policyId,
          ...payload,
        }).unwrap()

        addToast({
          title: 'Workflow policy updated',
          description: 'Workflow Policy Editor changes were saved successfully.',
          variant: 'success',
        })
      } else {
        await createWorkflowPolicy({
          body: payload,
        }).unwrap()

        addToast({
          title: 'Workflow policy created',
          description: `${payload.name} is now available in the Workflow Policy catalogue.`,
          variant: 'success',
        })
      }

      navigate('/super-admin/runtime-control/workflow-policies')
    } catch (err) {
      const appError = normalizeError(err)
      const fieldErrors = getRuntimeControlFieldErrorMap(appError, [
        'key',
        'name',
        'description',
        'status',
        'policyType',
        'priority',
        'frameworkKeys',
        'appliesTo',
        'triggerEvent',
        'triggerMode',
        'actorScope',
        'cooldownSeconds',
        'conditions',
        'governedAction',
        'decisionMode',
        'severity',
        'passMessage',
        'failMessage',
        'routingMode',
        'primaryAgentId',
        'fallbackAgentId',
        'timeoutMs',
        'retryOverride',
        'requiredValidationKeys',
        'validationFreshnessMinutes',
        'onPassEffects',
        'onFailEffects',
        'overrideRoles',
        'approvalRequired',
        'escalateTo',
        'escalationMessage',
        'slaMinutes',
      ])

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        setErrorsSource('server')
        setShowValidationHints(true)
        focusFirstErrorField(fieldErrors)
        return
      }

      addToast({
        title: isEditMode ? 'Failed to update workflow policy' : 'Failed to create workflow policy',
        description: appError.message,
        variant: 'error',
      })
    }
  }

  const renderFrameworkTab = () => (
    <div className="super-admin-workflow-policy-editor__tab-panel">
      <Fieldset className="super-admin-workflow-policy-editor__inner-fieldset">
        <Fieldset.Legend className="super-admin-workflow-policy-editor__section-title">
          Framework Compatibility
        </Fieldset.Legend>
        <Fieldset.Content className="super-admin-workflow-policy-editor__section-body">
          <p className="super-admin-workflow-policy-editor__helper">
            Choose the framework registries this policy governs. Active policies must point at active frameworks.
          </p>
          <div
            id="workflow-policy-editor-framework-grid"
            className="super-admin-workflow-policy-editor__framework-grid"
            tabIndex={-1}
          >
            {frameworkRows.map((entry) => {
              const frameworkKey = String(entry.frameworkKey ?? '').trim().toUpperCase()
              const checked = (form.frameworkKeys ?? []).includes(frameworkKey)
              return (
                <Tickbox
                  key={frameworkKey}
                  id={`workflow-policy-framework-${frameworkKey}`}
                  size="sm"
                  checked={checked}
                  onChange={() =>
                    setForm((current) => ({
                      ...current,
                      frameworkKeys: toggleListValue(current.frameworkKeys, frameworkKey),
                    }))
                  }
                  label={<FrameworkOptionLabel entry={entry} />}
                  className="super-admin-workflow-policy-editor__framework-tickbox"
                />
              )
            })}
          </div>
          {errors.frameworkKeys ? (
            <p className="super-admin-workflow-policy-editor__error" role="alert">
              {errors.frameworkKeys}
            </p>
          ) : null}
          {legacyFrameworkKeys.length > 0 ? (
            <div className="super-admin-workflow-policy-editor__legacy-frameworks">
              <p className="super-admin-workflow-policy-editor__helper">
                This policy still references framework keys that are no longer in the registry:
              </p>
              <div className="super-admin-workflow-policy-editor__token-row">
                {legacyFrameworkKeys.map((frameworkKey) => (
                  <Badge key={frameworkKey} variant="warning" size="sm" pill outline>
                    {frameworkKey}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </Fieldset.Content>
      </Fieldset>
    </div>
  )

  const renderConditionsTab = () => (
    <div className="super-admin-workflow-policy-editor__tab-panel">
      <div className="super-admin-workflow-policy-editor__section-body">
        <p className="super-admin-workflow-policy-editor__helper">
          Define governed FRAMEWORK_STATE prerequisites. Paths are restricted to active runtime-path registry entries.
        </p>
        {runtimePathsAppError ? (
          <p className="super-admin-workflow-policy-editor__error" role="alert">
            {runtimePathsAppError.message}
          </p>
        ) : runtimePathAvailabilityMessage ? (
          <p className="super-admin-workflow-policy-editor__helper">
            {runtimePathAvailabilityMessage}
          </p>
        ) : null}
        <div className="super-admin-workflow-policy-editor__top-actions">
          <Button
            id="workflow-policy-editor-add-condition"
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setForm((current) => ({
                ...current,
                conditions: [...(Array.isArray(current.conditions) ? current.conditions : []), buildConditionRow()],
              }))
            }
          >
            Add Condition
          </Button>
        </div>
        {Array.isArray(form.conditions) && form.conditions.length > 0 ? (
          <div className="super-admin-workflow-policy-editor__condition-list">
            {form.conditions.map((condition, index) => (
              <div key={`condition-${index}`} className="super-admin-workflow-policy-editor__condition-row">
                <div className="super-admin-workflow-policy-editor__grid super-admin-workflow-policy-editor__grid--condition">
                  <Select
                    id={`workflow-policy-editor-condition-path-${index}`}
                    label="Path"
                    value={condition.path ?? ''}
                    options={runtimePathOptions}
                    placeholder={runtimePathSelectPlaceholder}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        conditions: current.conditions.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, path: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <Select
                    id={`workflow-policy-editor-condition-operator-${index}`}
                    label="Operator"
                    value={condition.operator ?? ''}
                    options={WORKFLOW_POLICY_CONDITION_OPERATOR_OPTIONS}
                    placeholder="Select operator"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        conditions: current.conditions.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, operator: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <Input
                    id={`workflow-policy-editor-condition-value-${index}`}
                    label="Value"
                    value={condition.value ?? ''}
                    disabled={['exists', 'not exists'].includes(String(condition.operator ?? '').trim().toLowerCase())}
                    helperText='Use comma-separated values for "in" and "not in".'
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        conditions: current.conditions.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value: event.target.value } : item,
                        ),
                      }))
                    }
                    fullWidth
                  />
                  <Select
                    id={`workflow-policy-editor-condition-logic-${index}`}
                    label="Logic"
                    value={condition.logic ?? WORKFLOW_POLICY_CONDITION_LOGIC.AND}
                    options={WORKFLOW_POLICY_CONDITION_LOGIC_OPTIONS}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        conditions: current.conditions.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, logic: normalizeConditionLogic(event.target.value) } : item,
                        ),
                      }))
                    }
                  />
                </div>
                <div className="super-admin-workflow-policy-editor__condition-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        conditions: current.conditions.filter((_item, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="super-admin-workflow-policy-editor__helper">
            No conditions configured yet. Add rows when this policy should evaluate only for specific FRAMEWORK_STATE combinations.
          </p>
        )}
        {errors.conditions ? (
          <p className="super-admin-workflow-policy-editor__error" role="alert">
            {errors.conditions}
          </p>
        ) : null}
      </div>
    </div>
  )

  const renderRoutingTab = () => (
    <div className="super-admin-workflow-policy-editor__tab-panel">
      <div className="super-admin-workflow-policy-editor__section-body">
        <p className="super-admin-workflow-policy-editor__helper">
          Choose which governed agent executes when this policy requires routing. Only compatible agents are offered.
        </p>
        <div className="super-admin-workflow-policy-editor__grid">
          <Select
            id="workflow-policy-editor-routing-mode"
            label="Routing Mode"
            value={form.routingMode}
            options={WORKFLOW_POLICY_ROUTING_MODE_OPTIONS.filter((option) => option.value)}
            placeholder="Select routing mode"
            onChange={(event) => setForm((current) => ({ ...current, routingMode: event.target.value }))}
            error={errors.routingMode}
          />
          <Select
            id="workflow-policy-editor-primary-agent"
            label="Primary Agent"
            value={form.primaryAgentId}
            options={compatibleAgentOptions}
            placeholder="Select primary agent"
            onChange={(event) => setForm((current) => ({ ...current, primaryAgentId: event.target.value }))}
            error={errors.primaryAgentId}
          />
          <Select
            id="workflow-policy-editor-fallback-agent"
            label="Fallback Agent"
            value={form.fallbackAgentId}
            options={compatibleAgentOptions.filter((option) => option.value !== normalizeId(form.primaryAgentId))}
            placeholder="Select fallback agent"
            onChange={(event) => setForm((current) => ({ ...current, fallbackAgentId: event.target.value }))}
            error={errors.fallbackAgentId}
          />
          <Input
            id="workflow-policy-editor-timeout-ms"
            type="number"
            label="Timeout Override (ms)"
            value={form.timeoutMs}
            onChange={(event) => setForm((current) => ({ ...current, timeoutMs: event.target.value }))}
            error={errors.timeoutMs}
            fullWidth
          />
          <Input
            id="workflow-policy-editor-retry-override"
            label="Retry Override"
            value={form.retryOverride}
            onChange={(event) => setForm((current) => ({ ...current, retryOverride: event.target.value }))}
            error={errors.retryOverride}
            helperText='Examples: "retry-once", "manual-only".'
            fullWidth
          />
        </div>
        <div className="super-admin-workflow-policy-editor__tickbox-row">
          <Tickbox
            id="workflow-policy-editor-require-success"
            size="sm"
            checked={Boolean(form.requireSuccess)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                requireSuccess: event.target.checked,
              }))
            }
            label="Require successful execution from the routed agent."
          />
        </div>
        {primaryAgent || fallbackAgent ? (
          <div className="super-admin-workflow-policy-editor__agent-summary-list">
            <AgentSummaryCard title="Primary Agent" agent={primaryAgent} />
            <AgentSummaryCard title="Fallback Agent" agent={fallbackAgent} />
          </div>
        ) : null}
      </div>
    </div>
  )

  const renderValidationTab = () => (
    <div className="super-admin-workflow-policy-editor__tab-panel">
      <div className="super-admin-workflow-policy-editor__section-body">
        <p className="super-admin-workflow-policy-editor__helper">
          Require specific validation outcomes before the governed action may proceed.
        </p>
        <div className="super-admin-workflow-policy-editor__validation-add">
          <Input
            id="workflow-policy-editor-validation-key"
            label="Required Validation Key"
            value={pendingValidationKey}
            onChange={(event) => setPendingValidationKey(event.target.value)}
            helperText={`Examples: ${DEFAULT_VALIDATION_SUGGESTIONS.join(', ')}`}
            fullWidth
          />
          <Button type="button" variant="outline" size="sm" onClick={addValidationKey}>
            Add Validation Key
          </Button>
        </div>
        {Array.isArray(form.requiredValidationKeys) && form.requiredValidationKeys.length > 0 ? (
          <div className="super-admin-workflow-policy-editor__token-row">
            {form.requiredValidationKeys.map((validationKey) => (
              <div key={validationKey} className="super-admin-workflow-policy-editor__token-pill">
                <Badge variant="info" size="sm" pill outline>
                  {validationKey}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      requiredValidationKeys: (current.requiredValidationKeys ?? []).filter((item) => item !== validationKey),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        {errors.requiredValidationKeys ? (
          <p className="super-admin-workflow-policy-editor__error" role="alert">
            {errors.requiredValidationKeys}
          </p>
        ) : null}
        <div className="super-admin-workflow-policy-editor__grid">
          <Input
            id="workflow-policy-editor-validation-freshness"
            type="number"
            label="Freshness Minutes"
            value={form.validationFreshnessMinutes}
            onChange={(event) =>
              setForm((current) => ({ ...current, validationFreshnessMinutes: event.target.value }))
            }
            error={errors.validationFreshnessMinutes}
            fullWidth
          />
        </div>
        <div className="super-admin-workflow-policy-editor__tickbox-stack">
          <Tickbox
            id="workflow-policy-editor-validation-blocking"
            size="sm"
            checked={Boolean(form.validationBlockingOnFail)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                validationBlockingOnFail: event.target.checked,
              }))
            }
            label="Blocking on fail"
          />
          <Tickbox
            id="workflow-policy-editor-validation-warning-only"
            size="sm"
            checked={Boolean(form.validationWarningOnly)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                validationWarningOnly: event.target.checked,
              }))
            }
            label="Warning only"
          />
          <Tickbox
            id="workflow-policy-editor-validation-latest-run"
            size="sm"
            checked={Boolean(form.validationRequireLatestRun)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                validationRequireLatestRun: event.target.checked,
              }))
            }
            label="Require latest run"
          />
        </div>
      </div>
    </div>
  )

  const renderEffectSection = (label, fieldName, effects = []) => (
    <div className="super-admin-workflow-policy-editor__effect-section">
      <div className="super-admin-workflow-policy-editor__effect-section-header">
        <div>
          <p className="super-admin-workflow-policy-editor__section-title">{label}</p>
          <p className="super-admin-workflow-policy-editor__helper">
            Use governed controls only. Writable FRAMEWORK_STATE paths are filtered from the Runtime Path Registry.
          </p>
        </div>
        <Button
          id={`workflow-policy-editor-${fieldName}-add-effect`}
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setForm((current) => ({
              ...current,
              [fieldName]: [...(Array.isArray(current[fieldName]) ? current[fieldName] : []), buildEffectRow()],
            }))
          }
        >
          Add Effect
        </Button>
      </div>
      {Array.isArray(effects) && effects.length > 0 ? (
        <div className="super-admin-workflow-policy-editor__condition-list">
          {effects.map((effect, index) => {
            const needsTargetPath = EFFECT_TYPES_REQUIRING_TARGET_PATH.has(String(effect?.type ?? '').trim().toUpperCase())
            const needsValue = EFFECT_TYPES_REQUIRING_VALUE.has(String(effect?.type ?? '').trim().toUpperCase())

            return (
              <div key={`${fieldName}-${index}`} className="super-admin-workflow-policy-editor__condition-row">
                <div className="super-admin-workflow-policy-editor__grid super-admin-workflow-policy-editor__grid--effect">
                  <Select
                    id={`workflow-policy-editor-${fieldName}-type-${index}`}
                    label="Action"
                    value={effect.type ?? ''}
                    options={WORKFLOW_POLICY_EFFECT_TYPE_OPTIONS}
                    placeholder="Select effect type"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [fieldName]: current[fieldName].map((item, itemIndex) =>
                          itemIndex === index ? { ...item, type: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <Select
                    id={`workflow-policy-editor-${fieldName}-path-${index}`}
                    label="Target Path"
                    value={effect.targetPath ?? ''}
                    options={writableRuntimePathOptions}
                    placeholder={writableRuntimePathSelectPlaceholder}
                    disabled={!needsTargetPath}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [fieldName]: current[fieldName].map((item, itemIndex) =>
                          itemIndex === index ? { ...item, targetPath: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <Input
                    id={`workflow-policy-editor-${fieldName}-value-${index}`}
                    label="Value"
                    value={effect.value ?? ''}
                    disabled={!effect.type}
                    helperText={needsValue ? 'Examples: REVIEW_READY, governance queue id, or notification text.' : 'Optional for this effect type.'}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [fieldName]: current[fieldName].map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value: event.target.value } : item,
                        ),
                      }))
                    }
                    fullWidth
                  />
                </div>
                <div className="super-admin-workflow-policy-editor__condition-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        [fieldName]: current[fieldName].filter((_item, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="super-admin-workflow-policy-editor__helper">
          No {label.toLowerCase()} configured yet.
        </p>
      )}
      {errors[fieldName] ? (
        <p className="super-admin-workflow-policy-editor__error" role="alert">
          {errors[fieldName]}
        </p>
      ) : null}
    </div>
  )

  const renderOutcomeTab = () => (
    <div className="super-admin-workflow-policy-editor__tab-panel">
      <div className="super-admin-workflow-policy-editor__section-body">
        <p className="super-admin-workflow-policy-editor__helper">
          Define governed state effects after policy evaluation. All writes stay inside approved writable FRAMEWORK_STATE paths.
        </p>
        {writeRuntimePathsAppError ? (
          <p className="super-admin-workflow-policy-editor__error" role="alert">
            {writeRuntimePathsAppError.message}
          </p>
        ) : writableRuntimePathAvailabilityMessage ? (
          <p className="super-admin-workflow-policy-editor__helper">
            {writableRuntimePathAvailabilityMessage}
          </p>
        ) : null}
        {renderEffectSection('On Pass', 'onPassEffects', form.onPassEffects)}
        {renderEffectSection('On Fail', 'onFailEffects', form.onFailEffects)}
      </div>
    </div>
  )

  const renderEscalationTab = () => (
    <div className="super-admin-workflow-policy-editor__tab-panel">
      <div className="super-admin-workflow-policy-editor__section-body">
        <p className="super-admin-workflow-policy-editor__helper">
          Configure the human governance path for manual overrides, approval routing, escalation guidance, and response targets.
        </p>
        <div className="super-admin-workflow-policy-editor__tickbox-stack">
          <Tickbox
            id="workflow-policy-editor-override-allowed"
            size="sm"
            checked={Boolean(form.overrideAllowed)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                overrideAllowed: event.target.checked,
                ...(event.target.checked ? {} : { approvalRequired: false }),
              }))
            }
            label="Override Allowed"
          />
          <Tickbox
            id="workflow-policy-editor-approval-required"
            size="sm"
            checked={Boolean(form.approvalRequired)}
            disabled={!form.overrideAllowed}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                approvalRequired: event.target.checked,
              }))
            }
            label="Approval Required"
          />
        </div>
        {errors.approvalRequired ? (
          <p className="super-admin-workflow-policy-editor__error" role="alert">
            {errors.approvalRequired}
          </p>
        ) : null}
        <div className="super-admin-workflow-policy-editor__effect-section">
          <div className="super-admin-workflow-policy-editor__effect-section-header">
            <div>
              <p className="super-admin-workflow-policy-editor__section-title">Override Roles</p>
              <p className="super-admin-workflow-policy-editor__helper">
                Only the governed roles selected here may approve a blocked or warning-state override.
              </p>
            </div>
          </div>
          <div
            id="workflow-policy-editor-override-roles"
            className="super-admin-workflow-policy-editor__role-grid"
            tabIndex={-1}
          >
            {WORKFLOW_POLICY_OVERRIDE_ROLE_OPTIONS.map((option) => {
              const checked = (form.overrideRoles ?? []).includes(option.value)
              return (
                <Tickbox
                  key={option.value}
                  id={`workflow-policy-editor-override-role-${option.value}`}
                  size="sm"
                  checked={checked}
                  disabled={!form.overrideAllowed}
                  onChange={() =>
                    setForm((current) => ({
                      ...current,
                      overrideRoles: toggleListValue(current.overrideRoles, option.value),
                    }))
                  }
                  label={<OverrideRoleOptionLabel label={option.label} />}
                  className="super-admin-workflow-policy-editor__role-tickbox"
                />
              )
            })}
          </div>
          {(form.overrideRoles ?? []).length > 0 ? (
            <div className="super-admin-workflow-policy-editor__token-row">
              {(form.overrideRoles ?? []).map((role) => {
                const matchingRole = WORKFLOW_POLICY_OVERRIDE_ROLE_OPTIONS.find((option) => option.value === role)
                return (
                  <Badge key={role} variant="info" size="sm" pill outline>
                    {matchingRole?.label || role}
                  </Badge>
                )
              })}
            </div>
          ) : null}
          {errors.overrideRoles ? (
            <p className="super-admin-workflow-policy-editor__error" role="alert">
              {errors.overrideRoles}
            </p>
          ) : null}
        </div>
        <div className="super-admin-workflow-policy-editor__grid">
          <Select
            id="workflow-policy-editor-escalate-to"
            label="Escalate To"
            value={form.escalateTo}
            options={WORKFLOW_POLICY_ESCALATE_TO_OPTIONS.filter((option) => option.value)}
            placeholder="Select escalation owner"
            disabled={!form.approvalRequired}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                escalateTo: event.target.value,
              }))
            }
            error={errors.escalateTo}
          />
          <Input
            id="workflow-policy-editor-sla-minutes"
            type="number"
            label="SLA Minutes"
            value={form.slaMinutes}
            disabled={!form.approvalRequired}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                slaMinutes: event.target.value,
              }))
            }
            error={errors.slaMinutes}
            helperText="Set the response target for the escalation path."
            fullWidth
          />
        </div>
        <Textarea
          id="workflow-policy-editor-escalation-message"
          label="Escalation Message"
          value={form.escalationMessage}
          disabled={!form.overrideAllowed}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              escalationMessage: event.target.value,
            }))
          }
          error={errors.escalationMessage}
          helperText="Optional guidance shown to the human approver or escalation owner."
          rows={4}
          fullWidth
        />
      </div>
    </div>
  )

  const renderDependenciesTab = () => {
    const frameworkPackages = Array.isArray(dependencyData?.referencedBy?.frameworkPackages)
      ? dependencyData.referencedBy.frameworkPackages
      : []
    const agents = Array.isArray(dependencyData?.uses?.agents) ? dependencyData.uses.agents : []
    const frameworks = Array.isArray(dependencyData?.uses?.frameworks) ? dependencyData.uses.frameworks : []
    const validationOutputs = Array.isArray(dependencyData?.uses?.validationOutputs)
      ? dependencyData.uses.validationOutputs
      : []
    const runtimePaths = Array.isArray(dependencyData?.uses?.runtimePaths) ? dependencyData.uses.runtimePaths : []
    const warnings = Array.isArray(dependencyData?.warnings) ? dependencyData.warnings : []

    return (
      <div className="super-admin-workflow-policy-editor__tab-panel">
        <div className="super-admin-workflow-policy-editor__section-body">
          <p className="super-admin-workflow-policy-editor__helper">
            Read-only impact view for referenced resources, current uses, and dependency warnings.
          </p>
          {!isEditMode ? (
            <p className="super-admin-workflow-policy-editor__helper">
              Save the policy first to load dependency impact data.
            </p>
          ) : isDependenciesLoading ? (
            <p className="super-admin-workflow-policy-editor__helper">Loading dependency summary...</p>
          ) : (
            <div className="super-admin-workflow-policy-editor__dependency-grid">
              <div className="super-admin-workflow-policy-editor__dependency-card">
                <p className="super-admin-workflow-policy-editor__summary-label">Warnings</p>
                {warnings.length > 0 ? (
                  <ul className="super-admin-workflow-policy-editor__dependency-list">
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="super-admin-workflow-policy-editor__helper">No dependency warnings for this policy.</p>
                )}
              </div>
              <div className="super-admin-workflow-policy-editor__dependency-card">
                <p className="super-admin-workflow-policy-editor__summary-label">Referenced By Framework Packages</p>
                {frameworkPackages.length > 0 ? (
                  <div className="super-admin-workflow-policy-editor__dependency-token-grid">
                    {frameworkPackages.map((pkg) => (
                      <div key={pkg.id || `${pkg.frameworkKey}-${pkg.version}`} className="super-admin-workflow-policy-editor__dependency-token">
                        <Badge variant="info" size="sm" pill outline>{pkg.frameworkKey}</Badge>
                        <span>{pkg.frameworkName ? `${pkg.frameworkName} ${pkg.version || ''}`.trim() : pkg.version || pkg.frameworkKey}</span>
                        <Status size="sm" showIcon variant={String(pkg.status ?? '').trim().toUpperCase() === 'ACTIVE' ? 'success' : 'neutral'}>
                          {formatWorkflowPolicyStatus(pkg.status)}
                        </Status>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="super-admin-workflow-policy-editor__helper">No framework packages currently reference this workflow policy.</p>
                )}
              </div>
              <div className="super-admin-workflow-policy-editor__dependency-card">
                <p className="super-admin-workflow-policy-editor__summary-label">Uses Agents</p>
                {agents.length > 0 ? (
                  <div className="super-admin-workflow-policy-editor__dependency-token-grid">
                    {agents.map((agent) => (
                      <div key={agent.id || agent.key} className="super-admin-workflow-policy-editor__dependency-token">
                        <Badge variant="primary" size="sm" pill outline>{agent.key}</Badge>
                        <span>{agent.name || agent.key}</span>
                        <Status size="sm" showIcon variant={String(agent.status ?? '').trim().toUpperCase() === 'ACTIVE' ? 'success' : 'warning'}>
                          {formatWorkflowPolicyStatus(agent.status)}
                        </Status>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="super-admin-workflow-policy-editor__helper">No agents are currently referenced by this policy.</p>
                )}
              </div>
              <div className="super-admin-workflow-policy-editor__dependency-card">
                <p className="super-admin-workflow-policy-editor__summary-label">Uses Frameworks</p>
                <div className="super-admin-workflow-policy-editor__dependency-token-grid">
                  {frameworks.map((framework) => (
                    <div key={framework.id || framework.key} className="super-admin-workflow-policy-editor__dependency-token">
                      <Badge variant="primary" size="sm" pill outline>{framework.key}</Badge>
                      <span>{framework.name || framework.key}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="super-admin-workflow-policy-editor__dependency-card">
                <p className="super-admin-workflow-policy-editor__summary-label">Validation Outputs</p>
                {validationOutputs.length > 0 ? (
                  <div className="super-admin-workflow-policy-editor__token-row">
                    {validationOutputs.map((output) => (
                      <Badge key={output.id || output.key} variant="info" size="sm" pill outline>
                        {output.name || output.key}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="super-admin-workflow-policy-editor__helper">No validation outputs are configured.</p>
                )}
              </div>
              <div className="super-admin-workflow-policy-editor__dependency-card">
                <p className="super-admin-workflow-policy-editor__summary-label">Runtime Paths Used</p>
                {runtimePaths.length > 0 ? (
                  <div className="super-admin-workflow-policy-editor__dependency-token-grid">
                    {runtimePaths.map((path) => (
                      <div key={path.id || path.key} className="super-admin-workflow-policy-editor__dependency-token">
                        <Badge variant="neutral" size="sm" pill outline>{path.scope || 'PATH'}</Badge>
                        <span>{path.name || path.key}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="super-admin-workflow-policy-editor__helper">No governed runtime paths are currently referenced.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderAuditTab = () => (
    <div className="super-admin-workflow-policy-editor__tab-panel">
      <div className="super-admin-workflow-policy-editor__section-body">
        <p className="super-admin-workflow-policy-editor__helper">
          Review current version metadata and promotion context. Full revision compare and restore actions remain a later slice.
        </p>
        <div className="super-admin-workflow-policy-editor__audit-grid">
          <div className="super-admin-workflow-policy-editor__audit-card">
            <p className="super-admin-workflow-policy-editor__summary-label">Version</p>
            <p className="super-admin-workflow-policy-editor__audit-value">{form.version || '1'}</p>
          </div>
          <div className="super-admin-workflow-policy-editor__audit-card">
            <p className="super-admin-workflow-policy-editor__summary-label">Created By</p>
            <p className="super-admin-workflow-policy-editor__audit-value">{loadedPolicy?.createdBy?.name || '--'}</p>
          </div>
          <div className="super-admin-workflow-policy-editor__audit-card">
            <p className="super-admin-workflow-policy-editor__summary-label">Updated By</p>
            <p className="super-admin-workflow-policy-editor__audit-value">{loadedPolicy?.updatedBy?.name || '--'}</p>
          </div>
          <div className="super-admin-workflow-policy-editor__audit-card">
            <p className="super-admin-workflow-policy-editor__summary-label">Created At</p>
            <p className="super-admin-workflow-policy-editor__audit-value">{formatAuditDate(loadedPolicy?.createdAt)}</p>
          </div>
          <div className="super-admin-workflow-policy-editor__audit-card">
            <p className="super-admin-workflow-policy-editor__summary-label">Updated At</p>
            <p className="super-admin-workflow-policy-editor__audit-value">{formatAuditDate(loadedPolicy?.updatedAt)}</p>
          </div>
          <div className="super-admin-workflow-policy-editor__audit-card">
            <p className="super-admin-workflow-policy-editor__summary-label">Last Activated</p>
            <p className="super-admin-workflow-policy-editor__audit-value">{formatAuditDate(form.lastActivatedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderJsonDiffTab = () => (
    <div className="super-admin-workflow-policy-editor__tab-panel">
      <div className="super-admin-workflow-policy-editor__section-body">
        <p className="super-admin-workflow-policy-editor__helper">
          Compare the current working copy against the last saved policy snapshot. This phase ships working-copy diff review, not full revision history.
        </p>
        <div className="super-admin-workflow-policy-editor__json-summary">
          <Badge variant="info" size="sm" pill outline>
            {jsonDiffSummary.total} diff {jsonDiffSummary.total === 1 ? 'entry' : 'entries'}
          </Badge>
          <Badge variant="success" size="sm" pill outline>
            {jsonDiffSummary.added} added
          </Badge>
          <Badge variant="warning" size="sm" pill outline>
            {jsonDiffSummary.changed} changed
          </Badge>
          <Badge variant="neutral" size="sm" pill outline>
            {jsonDiffSummary.removed} removed
          </Badge>
        </div>
        <div className="super-admin-workflow-policy-editor__json-grid">
          <div className="super-admin-workflow-policy-editor__json-card">
            <div className="super-admin-workflow-policy-editor__json-card-header">
              <p className="super-admin-workflow-policy-editor__summary-label">Current Policy JSON</p>
            </div>
            <pre className="super-admin-workflow-policy-editor__json-code">
              {formatJsonCodeBlock(currentJsonPreview)}
            </pre>
          </div>
          <div className="super-admin-workflow-policy-editor__json-card">
            <div className="super-admin-workflow-policy-editor__json-card-header">
              <p className="super-admin-workflow-policy-editor__summary-label">
                {isEditMode ? 'Saved Policy JSON' : 'Baseline JSON'}
              </p>
            </div>
            <pre className="super-admin-workflow-policy-editor__json-code">
              {formatJsonCodeBlock(previousJsonPreview)}
            </pre>
          </div>
        </div>
        <div className="super-admin-workflow-policy-editor__json-card">
          <div className="super-admin-workflow-policy-editor__json-card-header">
            <p className="super-admin-workflow-policy-editor__summary-label">Visual Diff Summary</p>
          </div>
          {jsonDiffSummary.changes.length > 0 ? (
            <div className="super-admin-workflow-policy-editor__diff-list">
              {jsonDiffSummary.changes.map((change) => (
                <div key={change.path} className="super-admin-workflow-policy-editor__diff-row">
                  <Badge
                    variant={
                      change.changeType === 'ADDED'
                        ? 'success'
                        : change.changeType === 'REMOVED'
                          ? 'neutral'
                          : 'warning'
                    }
                    size="sm"
                    pill
                    outline
                  >
                    {change.changeType}
                  </Badge>
                  <div className="super-admin-workflow-policy-editor__diff-copy">
                    <p className="super-admin-workflow-policy-editor__diff-path">{change.path}</p>
                    <p className="super-admin-workflow-policy-editor__helper">
                      {change.changeType === 'ADDED'
                        ? `Current: ${JSON.stringify(change.currentValue)}`
                        : change.changeType === 'REMOVED'
                          ? `Saved: ${JSON.stringify(change.previousValue)}`
                          : `Saved: ${JSON.stringify(change.previousValue)} -> Current: ${JSON.stringify(change.currentValue)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="super-admin-workflow-policy-editor__helper">
              No diff entries were detected between the current working copy and the saved snapshot.
            </p>
          )}
        </div>
      </div>
    </div>
  )

  const renderTestConsoleTab = () => (
    <div className="super-admin-workflow-policy-editor__tab-panel">
      <div className="super-admin-workflow-policy-editor__section-body">
        <p className="super-admin-workflow-policy-editor__helper">
          Run the current valid draft against sample FRAMEWORK_STATE input without saving. The test console previews pass/fail, matched conditions, routed Agent selection, and state effects.
        </p>
        <div className="super-admin-workflow-policy-editor__grid">
          <Select
            id="workflow-policy-editor-test-trigger-event"
            label="Trigger Event Override"
            value={testConsoleForm.triggerEvent}
            options={TEST_CONSOLE_TRIGGER_OPTIONS}
            onChange={(event) =>
              setTestConsoleForm((current) => ({
                ...current,
                triggerEvent: event.target.value,
              }))
            }
          />
          <Select
            id="workflow-policy-editor-test-actor-scope"
            label="Actor Scope Override"
            value={testConsoleForm.actorScope}
            options={TEST_CONSOLE_ACTOR_SCOPE_OPTIONS}
            onChange={(event) =>
              setTestConsoleForm((current) => ({
                ...current,
                actorScope: event.target.value,
              }))
            }
          />
        </div>
        <Textarea
          id="workflow-policy-editor-test-framework-state"
          label="Sample FRAMEWORK_STATE JSON"
          value={testConsoleForm.frameworkStateText}
          onChange={(event) =>
            setTestConsoleForm((current) => ({
              ...current,
              frameworkStateText: event.target.value,
            }))
          }
          helperText="Provide a JSON object whose governed paths match the policy condition/effect selectors."
          rows={12}
          fullWidth
        />
        <div className="super-admin-workflow-policy-editor__top-actions">
          <Button
            type="button"
            variant="primary"
            size="sm"
            loading={isTestRunning}
            disabled={isTestRunning}
            onClick={handleRunTestConsole}
          >
            Run Policy Test
          </Button>
        </div>
        {testConsoleError ? (
          <p className="super-admin-workflow-policy-editor__error" role="alert">
            {testConsoleError}
          </p>
        ) : null}
        {testConsoleResult ? (
          <div className="super-admin-workflow-policy-editor__test-grid">
            <div className="super-admin-workflow-policy-editor__test-card">
              <p className="super-admin-workflow-policy-editor__summary-label">Outcome</p>
              <Status
                size="sm"
                showIcon
                variant={testConsoleResult.outcome === 'PASS' ? 'success' : 'warning'}
              >
                {testConsoleResult.outcome}
              </Status>
              <div className="super-admin-workflow-policy-editor__token-row">
                <Badge variant={testConsoleResult.triggerMatched ? 'success' : 'warning'} size="sm" pill outline>
                  Trigger {testConsoleResult.triggerMatched ? 'Matched' : 'Missed'}
                </Badge>
                <Badge variant={testConsoleResult.actorMatched ? 'success' : 'warning'} size="sm" pill outline>
                  Actor {testConsoleResult.actorMatched ? 'Matched' : 'Missed'}
                </Badge>
                <Badge variant={testConsoleResult.conditionsMatched ? 'success' : 'warning'} size="sm" pill outline>
                  Conditions {testConsoleResult.conditionsMatched ? 'Passed' : 'Failed'}
                </Badge>
              </div>
            </div>
            <div className="super-admin-workflow-policy-editor__test-card">
              <p className="super-admin-workflow-policy-editor__summary-label">Matched Conditions</p>
              {Array.isArray(testConsoleResult.matchedConditions) && testConsoleResult.matchedConditions.length > 0 ? (
                <div className="super-admin-workflow-policy-editor__diff-list">
                  {testConsoleResult.matchedConditions.map((condition) => (
                    <div key={`${condition.path}-${condition.operator}`} className="super-admin-workflow-policy-editor__diff-row">
                      <Badge
                        variant={condition.matched ? 'success' : 'warning'}
                        size="sm"
                        pill
                        outline
                      >
                        {condition.matched ? 'MATCH' : 'MISS'}
                      </Badge>
                      <div className="super-admin-workflow-policy-editor__diff-copy">
                        <p className="super-admin-workflow-policy-editor__diff-path">
                          {condition.path} {condition.operator} {JSON.stringify(condition.expectedValue)}
                        </p>
                        <p className="super-admin-workflow-policy-editor__helper">
                          Actual: {JSON.stringify(condition.actualValue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="super-admin-workflow-policy-editor__helper">
                  No governed conditions were configured for this policy.
                </p>
              )}
            </div>
            <div className="super-admin-workflow-policy-editor__test-card">
              <p className="super-admin-workflow-policy-editor__summary-label">Chosen Agent</p>
              {chosenTestAgent ? (
                <AgentSummaryCard title="Chosen Agent" agent={chosenTestAgent} />
              ) : testConsoleResult.chosenAgent ? (
                <div className="super-admin-workflow-policy-editor__token-row">
                  <Badge variant="primary" size="sm" pill outline>
                    {testConsoleResult.chosenAgent.key}
                  </Badge>
                  <span>{testConsoleResult.chosenAgent.name || testConsoleResult.chosenAgent.key}</span>
                </div>
              ) : (
                <p className="super-admin-workflow-policy-editor__helper">
                  No Agent was selected for this test run.
                </p>
              )}
            </div>
            <div className="super-admin-workflow-policy-editor__test-card">
              <p className="super-admin-workflow-policy-editor__summary-label">State Effects Preview</p>
              {Array.isArray(testConsoleResult.stateEffectsPreview?.effects)
                && testConsoleResult.stateEffectsPreview.effects.length > 0 ? (
                <div className="super-admin-workflow-policy-editor__diff-list">
                  {testConsoleResult.stateEffectsPreview.effects.map((effect, index) => (
                    <div key={`${effect.type}-${effect.targetPath}-${index}`} className="super-admin-workflow-policy-editor__diff-row">
                      <Badge variant="info" size="sm" pill outline>
                        {formatWorkflowPolicyEnumLabel(effect.type)}
                      </Badge>
                      <div className="super-admin-workflow-policy-editor__diff-copy">
                        <p className="super-admin-workflow-policy-editor__diff-path">
                          {effect.targetPath || 'No target path'}
                        </p>
                        <p className="super-admin-workflow-policy-editor__helper">
                          Value: {JSON.stringify(effect.value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="super-admin-workflow-policy-editor__helper">
                  No state effects were selected for this outcome.
                </p>
              )}
            </div>
            <div className="super-admin-workflow-policy-editor__test-card super-admin-workflow-policy-editor__test-card--wide">
              <p className="super-admin-workflow-policy-editor__summary-label">Execution Trace</p>
              <ul className="super-admin-workflow-policy-editor__dependency-list">
                {(Array.isArray(testConsoleResult.executionTrace) ? testConsoleResult.executionTrace : []).map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
            <div className="super-admin-workflow-policy-editor__test-card super-admin-workflow-policy-editor__test-card--wide">
              <p className="super-admin-workflow-policy-editor__summary-label">Warnings</p>
              {Array.isArray(testConsoleResult.warnings) && testConsoleResult.warnings.length > 0 ? (
                <ul className="super-admin-workflow-policy-editor__dependency-list">
                  {testConsoleResult.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="super-admin-workflow-policy-editor__helper">
                  No warnings were returned for this test run.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )

  return (
    <section
      className="super-admin-workflow-policy-editor container"
      aria-label="Workflow policy editor"
    >
      <header className="super-admin-workflow-policy-editor__header">
        <h1 className="super-admin-workflow-policy-editor__title">
          {isEditMode ? 'Workflow Policy Editor' : 'Create Workflow Policy'}
        </h1>
        <p className="super-admin-workflow-policy-editor__subtitle">
          Configure workflow policy foundations, governed FRAMEWORK_STATE conditions, routed execution, outcome effects, escalation controls, and promotion metadata.
        </p>
      </header>

      <Fieldset className="super-admin-workflow-policy-editor__fieldset">
        <Fieldset.Legend className="sr-only">Workflow policy editor</Fieldset.Legend>
        {isEditMode && isPolicyLoading ? <WorkflowPolicyEditorLoadingState isEditMode /> : null}
        {isEditMode && policyAppError ? (
          <WorkflowPolicyEditorErrorState message={policyAppError.message} onBack={handleBack} />
        ) : null}

        {!isPolicyLoading && !policyAppError ? (
          <Card variant="elevated" className="super-admin-workflow-policy-editor__card">
            <Card.Body className="super-admin-workflow-policy-editor__card-body super-admin-workflow-policy-editor__card-body--compact">
              <div className="super-admin-workflow-policy-editor__top-actions">
                <Button type="button" variant="outline" size="sm" onClick={handleBack}>
                  Back
                </Button>
              </div>

              {isEditMode ? (
                <div className="super-admin-workflow-policy-editor__summary">
                  <div className="super-admin-workflow-policy-editor__summary-item">
                    <span className="super-admin-workflow-policy-editor__summary-label">Status</span>
                    <Status size="sm" showIcon variant={getWorkflowPolicyStatusVariant(form.status)}>
                      {formatWorkflowPolicyStatus(form.status)}
                    </Status>
                  </div>
                  <div className="super-admin-workflow-policy-editor__summary-item">
                    <span className="super-admin-workflow-policy-editor__summary-label">Policy Type</span>
                    <Badge variant="primary" size="sm" pill outline>
                      {formatWorkflowPolicyType(form.policyType)}
                    </Badge>
                  </div>
                  {form.routingMode ? (
                    <div className="super-admin-workflow-policy-editor__summary-item">
                      <span className="super-admin-workflow-policy-editor__summary-label">Routing</span>
                      <Badge variant="info" size="sm" pill outline>
                        {formatWorkflowPolicyEnumLabel(form.routingMode)}
                      </Badge>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="super-admin-workflow-policy-editor__intro">
                <p className="super-admin-workflow-policy-editor__form-title">
                  Workflow Policy Editor V1 now includes the full approved authoring surface, including escalation controls, working-copy JSON diff review, and the governed policy test console.
               Use these tabs to author the full policy, review draft changes, and test runtime evaluation without saving.
                </p>              
              </div>

              <form
                className="super-admin-workflow-policy-editor__form"
                onSubmit={handleSubmit}
                noValidate
              >
                <section className="super-admin-workflow-policy-editor__basic-section" aria-labelledby="workflow-policy-editor-basic-information">
                  <div className="super-admin-workflow-policy-editor__basic-section-header">
                    <h2
                      id="workflow-policy-editor-basic-information"
                      className="super-admin-workflow-policy-editor__section-title"
                    >
                      Basic Information
                    </h2>
                    <p className="super-admin-workflow-policy-editor__section-copy">
                      Keep the policy identity, lifecycle status, and governance priority visible while you work through the authoring tabs.
                    </p>
                  </div>
                  <div className="super-admin-workflow-policy-editor__section-body">
                    <div className="super-admin-workflow-policy-editor__grid">
                      <Input
                        id="workflow-policy-editor-key"
                        label="Workflow Policy Key"
                        value={form.key}
                        onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
                        error={errors.key}
                        helperText={isEditMode ? 'Key is fixed after creation to preserve stable references.' : 'Stable lowercase token, for example vmf-publish-gate.'}
                        disabled={isEditMode}
                        fullWidth
                      />
                      <Input
                        id="workflow-policy-editor-name"
                        label="Workflow Policy Name"
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        error={errors.name}
                        fullWidth
                      />
                      <Select
                        id="workflow-policy-editor-status"
                        label="Status"
                        value={form.status}
                        options={WORKFLOW_POLICY_FORM_STATUS_OPTIONS}
                        onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                        error={errors.status}
                      />
                      <Select
                        id="workflow-policy-editor-policy-type"
                        label="Policy Type"
                        value={form.policyType}
                        options={WORKFLOW_POLICY_TYPE_OPTIONS.filter((option) => option.value)}
                        onChange={(event) => setForm((current) => ({ ...current, policyType: event.target.value }))}
                        error={errors.policyType}
                      />
                      <Input
                        id="workflow-policy-editor-priority"
                        type="number"
                        label="Priority"
                        value={form.priority}
                        onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                        error={errors.priority}
                        helperText="Lower values run earlier in governance order."
                        fullWidth
                      />
                    </div>
                    <Textarea
                      id="workflow-policy-editor-description"
                      label="Description"
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      error={errors.description}
                      rows={4}
                      fullWidth
                    />
                  </div>
                </section>

                <TabView
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  variant="pills"
                  size="sm"
                  evenTabs
                  className="super-admin-workflow-policy-editor__tabs"
                  aria-label="Workflow policy editor sections"
                >
                  <TabView.Tab
                    label={renderTabLabel(
                      WORKFLOW_POLICY_EDITOR_TABS[0].label,
                      tabErrorCounts.frameworkCompatibility,
                    )}
                  >
                    {renderFrameworkTab()}
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel(WORKFLOW_POLICY_EDITOR_TABS[1].label, tabErrorCounts.scopeTrigger)}>
                    <div className="super-admin-workflow-policy-editor__tab-panel">
                      <div className="super-admin-workflow-policy-editor__grid">
                        <Select
                          id="workflow-policy-editor-applies-to"
                          label="Applies To"
                          value={form.appliesTo}
                          options={WORKFLOW_POLICY_APPLIES_TO_OPTIONS}
                          onChange={(event) => setForm((current) => ({ ...current, appliesTo: event.target.value }))}
                          error={errors.appliesTo}
                        />
                        <Select
                          id="workflow-policy-editor-trigger-event"
                          label="Trigger Event"
                          value={form.triggerEvent}
                          options={WORKFLOW_POLICY_TRIGGER_EVENT_OPTIONS}
                          onChange={(event) => setForm((current) => ({ ...current, triggerEvent: event.target.value }))}
                          error={errors.triggerEvent}
                        />
                        <Select
                          id="workflow-policy-editor-trigger-mode"
                          label="Trigger Mode"
                          value={form.triggerMode}
                          options={WORKFLOW_POLICY_TRIGGER_MODE_OPTIONS}
                          onChange={(event) => setForm((current) => ({ ...current, triggerMode: event.target.value }))}
                          error={errors.triggerMode}
                        />
                        <Select
                          id="workflow-policy-editor-actor-scope"
                          label="Actor Scope"
                          value={form.actorScope}
                          options={WORKFLOW_POLICY_ACTOR_SCOPE_OPTIONS}
                          onChange={(event) => setForm((current) => ({ ...current, actorScope: event.target.value }))}
                          error={errors.actorScope}
                        />
                        <Input
                          id="workflow-policy-editor-cooldown-seconds"
                          type="number"
                          label="Cooldown Seconds"
                          value={form.cooldownSeconds}
                          onChange={(event) => setForm((current) => ({ ...current, cooldownSeconds: event.target.value }))}
                          error={errors.cooldownSeconds}
                          helperText="Use 0 when this policy should evaluate on every event."
                          fullWidth
                        />
                      </div>
                      <div className="super-admin-workflow-policy-editor__tickbox-row">
                        <Tickbox
                          id="workflow-policy-editor-reevaluate-on-retry"
                          size="sm"
                          checked={Boolean(form.reevaluateOnRetry)}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              reevaluateOnRetry: event.target.checked,
                            }))
                          }
                          label="Re-evaluate this policy when the triggering operation retries."
                        />
                      </div>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab
                    label={renderTabLabel(
                      WORKFLOW_POLICY_EDITOR_TABS[2].label,
                      tabErrorCounts.frameworkStateConditions,
                    )}
                  >
                    {renderConditionsTab()}
                  </TabView.Tab>

                  <TabView.Tab
                    label={renderTabLabel(WORKFLOW_POLICY_EDITOR_TABS[3].label, tabErrorCounts.actionGovernance)}
                  >
                    <div className="super-admin-workflow-policy-editor__tab-panel">
                      <div className="super-admin-workflow-policy-editor__grid">
                        <Select
                          id="workflow-policy-editor-governed-action"
                          label="Governed Action"
                          value={form.governedAction}
                          options={WORKFLOW_POLICY_GOVERNED_ACTION_OPTIONS}
                          onChange={(event) => setForm((current) => ({ ...current, governedAction: event.target.value }))}
                          error={errors.governedAction}
                        />
                        <Select
                          id="workflow-policy-editor-decision-mode"
                          label="Decision Mode"
                          value={form.decisionMode}
                          options={WORKFLOW_POLICY_DECISION_MODE_OPTIONS}
                          onChange={(event) => setForm((current) => ({ ...current, decisionMode: event.target.value }))}
                          error={errors.decisionMode}
                        />
                        <Select
                          id="workflow-policy-editor-severity"
                          label="Severity"
                          value={form.severity}
                          options={WORKFLOW_POLICY_SEVERITY_OPTIONS}
                          onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}
                          error={errors.severity}
                        />
                      </div>
                      <div className="super-admin-workflow-policy-editor__grid super-admin-workflow-policy-editor__grid--messages">
                        <Textarea
                          id="workflow-policy-editor-pass-message"
                          label="Pass Message"
                          value={form.passMessage}
                          onChange={(event) => setForm((current) => ({ ...current, passMessage: event.target.value }))}
                          error={errors.passMessage}
                          rows={4}
                          fullWidth
                        />
                        <Textarea
                          id="workflow-policy-editor-fail-message"
                          label="Fail Message"
                          value={form.failMessage}
                          onChange={(event) => setForm((current) => ({ ...current, failMessage: event.target.value }))}
                          error={errors.failMessage}
                          rows={4}
                          fullWidth
                        />
                      </div>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel(WORKFLOW_POLICY_EDITOR_TABS[4].label, tabErrorCounts.agentRouting)}>
                    {renderRoutingTab()}
                  </TabView.Tab>

                  <TabView.Tab
                    label={renderTabLabel(
                      WORKFLOW_POLICY_EDITOR_TABS[5].label,
                      tabErrorCounts.validationRequirements,
                    )}
                  >
                    {renderValidationTab()}
                  </TabView.Tab>

                  <TabView.Tab
                    label={renderTabLabel(
                      WORKFLOW_POLICY_EDITOR_TABS[6].label,
                      tabErrorCounts.outcomeStateEffects,
                    )}
                  >
                    {renderOutcomeTab()}
                  </TabView.Tab>

                  <TabView.Tab
                    label={renderTabLabel(
                      WORKFLOW_POLICY_EDITOR_TABS[7].label,
                      tabErrorCounts.escalationOverrides,
                    )}
                  >
                    {renderEscalationTab()}
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel(WORKFLOW_POLICY_EDITOR_TABS[8].label)}>
                    {renderDependenciesTab()}
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel(WORKFLOW_POLICY_EDITOR_TABS[9].label)}>
                    {renderAuditTab()}
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel(WORKFLOW_POLICY_EDITOR_TABS[10].label)}>
                    {renderJsonDiffTab()}
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel(WORKFLOW_POLICY_EDITOR_TABS[11].label)}>
                    {renderTestConsoleTab()}
                  </TabView.Tab>
                </TabView>

                {errorsSource === 'server' && Object.keys(errors).length > 0 ? (
                  <p className="super-admin-workflow-policy-editor__error" role="alert">
                    Review the highlighted workflow policy fields and try again.
                  </p>
                ) : null}

                <div className="super-admin-workflow-policy-editor__footer-actions">
                  <Button type="button" variant="outline" size="sm" onClick={handleBack} disabled={isSaving}>
                    Cancel
                  </Button>
                  {isEditMode ? (
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={isSaving}
                      disabled={isSaving || isPolicyLoading}
                    >
                      Save Changes
                    </Button>
                  ) : isCreateReady ? (
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={isSaving}
                      disabled={isSaving}
                    >
                      Create Workflow Policy
                    </Button>
                  ) : (
                    <Button type="button" variant="primary" size="sm" onClick={handleReviewMissingFields}>
                      Review missing fields
                    </Button>
                  )}
                </div>
              </form>
            </Card.Body>
          </Card>
        ) : null}
      </Fieldset>
    </section>
  )
}

export default WorkflowPolicyEditor
