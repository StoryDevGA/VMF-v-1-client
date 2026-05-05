import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { useToaster } from '../../components/Toaster'
import RuntimePathSearchSelect from '../../components/RuntimePathSearchSelect/RuntimePathSearchSelect.jsx'
import {
  useCreateValidationRegistryMutation,
  useCloneValidationRegistryMutation,
  useGetValidationRegistryDependenciesQuery,
  useGetValidationRegistryQuery,
  useLazyGetValidationRegistryDependenciesQuery,
  useListFrameworkRegistriesQuery,
  useListRuntimeAgentsQuery,
  useListRuntimeSkillsQuery,
  useUpdateValidationRegistryMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { getRuntimeControlFieldErrorMap } from '../../utils/runtimeControlFormErrors.js'
import { RUNTIME_AGENT_STATUSES } from '../SuperAdminAgents/superAdminAgents.constants.js'
import {
  VALIDATION_REGISTRY_CATEGORIES,
  VALIDATION_REGISTRY_CATEGORY_OPTIONS,
  VALIDATION_REGISTRY_EXECUTION_MODES,
  VALIDATION_REGISTRY_EXECUTION_MODE_OPTIONS,
  VALIDATION_REGISTRY_FORM_ERROR_FIELDS,
  VALIDATION_REGISTRY_RESULT_TYPE_OPTIONS,
  VALIDATION_REGISTRY_SEVERITIES,
  VALIDATION_REGISTRY_SEVERITY_OPTIONS,
  VALIDATION_REGISTRY_STATUS_OPTIONS,
  VALIDATION_REGISTRY_STATUSES,
  normalizeValidationRegistryFrameworkKeys as normalizeFrameworkKeys,
  normalizeValidationRegistryStableIdList as normalizeStableIdList,
  validateValidationRegistryForm as validateForm,
} from '../SuperAdminValidationRegistry/superAdminValidationRegistry.constants.js'
import '../SuperAdminValidationRegistry/ValidationRegistryListView.css'
import './SuperAdminValidationRegistryEditor.css'

const INITIAL_FORM = Object.freeze({
  key: '',
  label: '',
  description: '',
  status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
  supportedFrameworkKeys: [],
  category: VALIDATION_REGISTRY_CATEGORIES.COMPLETENESS,
  severity: VALIDATION_REGISTRY_SEVERITIES.ERROR,
  producerSkillId: '',
  defaultAgentIds: [],
  outputPath: '',
  resultType: '',
  passFieldPath: '',
  detailsFieldPath: '',
  messageFieldPath: '',
  parameterSchema: {},
  defaultParameters: {},
  retryPolicy: { maxAttempts: 1, retryableErrorCodes: [], backoffSeconds: 0 },
  policyUsable: true,
  packageUsable: true,
  requiresLatestRun: false,
  freshnessDefaultMinutes: 30,
  blockingDefault: true,
  warningOnlyDefault: false,
  allowManualRun: true,
  executionMode: VALIDATION_REGISTRY_EXECUTION_MODES.SYNC,
  version: 1,
})

const shallowEqualObject = (left, right) => {
  if (left === right) return true
  if (!left || !right) return false
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key) => JSON.stringify(left[key]) === JSON.stringify(right[key]))
}

const areStableIdListsEqual = (left, right) => {
  const normalizedLeft = normalizeStableIdList(left)
  const normalizedRight = normalizeStableIdList(right)
  if (normalizedLeft.length !== normalizedRight.length) return false
  return normalizedLeft.every((value, index) => value === normalizedRight[index])
}

const buildDescendantPath = (outputPath, suffix) => {
  const base = String(outputPath ?? '').trim()
  const normalizedSuffix = String(suffix ?? '').trim().replace(/^\./, '')
  return base && normalizedSuffix ? `${base}.${normalizedSuffix}` : ''
}

const formatPreviewJson = (value) => JSON.stringify(value, null, 2)

const parseJsonObjectField = (value, label) => {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return { value: {}, error: null }
  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: {}, error: `${label} must be a JSON object.` }
    }
    return { value: parsed, error: null }
  } catch {
    return { value: {}, error: `${label} must be valid JSON.` }
  }
}

const buildValidationPreview = (form, { isEditMode = false, loadedValidation = null } = {}) => ({
  ...(isEditMode && loadedValidation?.id ? { id: loadedValidation.id } : {}),
  ...(isEditMode && loadedValidation?.stableId ? { stableId: loadedValidation.stableId } : {}),
  key: String(form.key ?? '').trim().toLowerCase(),
  label: String(form.label ?? '').trim(),
  description: String(form.description ?? '').trim(),
  status: String(form.status ?? '').trim().toUpperCase(),
  supportedFrameworkKeys: normalizeFrameworkKeys(form.supportedFrameworkKeys),
  category: String(form.category ?? '').trim().toUpperCase(),
  severity: String(form.severity ?? '').trim().toUpperCase(),
  producerSkillId: String(form.producerSkillId ?? '').trim(),
  defaultAgentIds: normalizeStableIdList(form.defaultAgentIds),
  outputPath: String(form.outputPath ?? '').trim(),
  resultType: String(form.resultType ?? '').trim().toUpperCase(),
  passFieldPath: String(form.passFieldPath ?? '').trim(),
  detailsFieldPath: String(form.detailsFieldPath ?? '').trim(),
  messageFieldPath: String(form.messageFieldPath ?? '').trim(),
  parameterSchema: form.parameterSchema && typeof form.parameterSchema === 'object' ? form.parameterSchema : {},
  defaultParameters: form.defaultParameters && typeof form.defaultParameters === 'object' ? form.defaultParameters : {},
  retryPolicy: form.retryPolicy && typeof form.retryPolicy === 'object'
    ? form.retryPolicy
    : { maxAttempts: 1, retryableErrorCodes: [], backoffSeconds: 0 },
  policyUsable: Boolean(form.policyUsable),
  packageUsable: Boolean(form.packageUsable),
  requiresLatestRun: Boolean(form.requiresLatestRun),
  freshnessDefaultMinutes: Number(form.freshnessDefaultMinutes ?? 0),
  blockingDefault: Boolean(form.blockingDefault),
  warningOnlyDefault: Boolean(form.warningOnlyDefault),
  allowManualRun: Boolean(form.allowManualRun),
  executionMode: String(form.executionMode ?? VALIDATION_REGISTRY_EXECUTION_MODES.SYNC).trim().toUpperCase(),
  version: Number(form.version ?? 1) || 1,
})

const getAgentStatusBadgeVariant = (status) => {
  const normalizedStatus = String(status ?? '').trim().toUpperCase()
  if (normalizedStatus === RUNTIME_AGENT_STATUSES.ACTIVE) return 'success'
  if (normalizedStatus === RUNTIME_AGENT_STATUSES.INACTIVE) return 'warning'
  if (normalizedStatus === RUNTIME_AGENT_STATUSES.DEPRECATED || normalizedStatus === 'MISSING') return 'danger'
  if (normalizedStatus === RUNTIME_AGENT_STATUSES.DRAFT) return 'info'
  return 'neutral'
}

const formatAgentStatus = (status) => {
  const normalizedStatus = String(status ?? '').trim().toUpperCase()
  if (!normalizedStatus) return 'Unknown'
  if (normalizedStatus === 'MISSING') return 'Missing'
  return normalizedStatus
    .toLowerCase()
    .replace(/^\w/, (character) => character.toUpperCase())
}

const formStateReducer = (state, action) => {
  if (action?.type !== 'apply') return state
  return typeof action.updater === 'function' ? action.updater(state) : action.updater
}

function ValidationRegistryEditorLoadingState({ isEditMode }) {
  return (
    <Card variant="elevated" className="super-admin-validation-registry__card">
      <Card.Body className="super-admin-validation-registry__card-body super-admin-validation-registry__card-body--compact super-admin-validation-registry-editor__card-body super-admin-validation-registry-editor__card-body--compact">
        <Spinner size="lg" />
        <p className="super-admin-validation-registry-editor__helper">
          {isEditMode ? 'Loading validation details...' : 'Preparing editor...'}
        </p>
      </Card.Body>
    </Card>
  )
}

function SuperAdminValidationRegistryEditor() {
  const navigate = useNavigate()
  const { addToast } = useToaster()
  const { validationId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const cloneFrom = String(searchParams.get('cloneFrom') ?? '').trim()
  const isEditMode = Boolean(validationId)
  const isCloneMode = !isEditMode && Boolean(cloneFrom)

  const [form, dispatchForm] = useReducer(formStateReducer, INITIAL_FORM)
  const [parameterSchemaText, setParameterSchemaText] = useState(formatPreviewJson(INITIAL_FORM.parameterSchema))
  const [defaultParametersText, setDefaultParametersText] = useState(formatPreviewJson(INITIAL_FORM.defaultParameters))
  const [retryableErrorCodesText, setRetryableErrorCodesText] = useState('')
  const [pendingFrameworkKey, setPendingFrameworkKey] = useState('')
  const [pendingDefaultAgentId, setPendingDefaultAgentId] = useState('')
  const [errors, setErrors] = useState({})
  const [errorsSource, setErrorsSource] = useState(null) // 'client' | 'server' | null
  const [pendingStatusWarning, setPendingStatusWarning] = useState(null) // { nextStatus, summary } | null
  const setForm = useCallback((updater) => {
    dispatchForm({ type: 'apply', updater })
  }, [])

  const {
    data: validationResponse,
    isLoading: isValidationLoading,
    error: validationError,
  } = useGetValidationRegistryQuery(validationId, { skip: !isEditMode })

  const {
    data: cloneSourceResponse,
    isLoading: isCloneSourceLoading,
    error: cloneSourceError,
  } = useGetValidationRegistryQuery(cloneFrom, { skip: !isCloneMode })

  const loadedValidation = validationResponse?.data ?? null
  const cloneSourceValidation = cloneSourceResponse?.data ?? null
  const displayedValidation = loadedValidation || cloneSourceValidation
  const validationAppError = (validationError || cloneSourceError)
    ? normalizeError(validationError || cloneSourceError)
    : null

  const {
    data: dependencyResponse,
    isFetching: isDependencyFetching,
    error: dependencyError,
  } = useGetValidationRegistryDependenciesQuery(validationId, { skip: !isEditMode })
  const dependencyData = dependencyResponse?.data ?? null
  const dependencyAppError = dependencyError ? normalizeError(dependencyError) : null

  const { data: frameworkResponse, error: frameworkError } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
    status: 'ACTIVE',
    type: '',
    structureType: '',
  })

  const frameworkRows = useMemo(() => {
    const data = frameworkResponse?.data
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data)) return data
    return []
  }, [frameworkResponse])

  const frameworkAppError = frameworkError ? normalizeError(frameworkError) : null

  const frameworkOptions = useMemo(() => {
    const keys = frameworkRows
      .map((row) => String(row?.frameworkKey ?? row?.key ?? '').trim().toUpperCase())
      .filter(Boolean)
    const unique = [...new Set(keys)].sort()
    return unique.map((value) => ({ value, label: value }))
  }, [frameworkRows])

  const selectedFrameworkKeys = useMemo(
    () => normalizeFrameworkKeys(form.supportedFrameworkKeys),
    [form.supportedFrameworkKeys],
  )

  const availableFrameworkOptions = useMemo(() => {
    const selected = new Set(selectedFrameworkKeys)
    return frameworkOptions.filter((option) => option.value && !selected.has(option.value))
  }, [frameworkOptions, selectedFrameworkKeys])

  const { data: skillResponse, isFetching: isSkillFetching, error: skillError } = useListRuntimeSkillsQuery({
    page: 1,
    pageSize: 100,
    q: '',
    status: 'ACTIVE',
  })

  const runtimeSkillRows = useMemo(() => {
    const data = skillResponse?.data
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data)) return data
    return []
  }, [skillResponse])

  const skillAppError = skillError ? normalizeError(skillError) : null

  const compatibleRuntimeSkills = useMemo(() => {
    if (selectedFrameworkKeys.length === 0) return runtimeSkillRows
    return runtimeSkillRows.filter((row) => {
      const frameworks = Array.isArray(row?.supportedFrameworkKeys) ? row.supportedFrameworkKeys : []
      return selectedFrameworkKeys.every((frameworkKey) => frameworks.includes(frameworkKey))
    })
  }, [runtimeSkillRows, selectedFrameworkKeys])

  const skillOptions = useMemo(() => {
    const rows = compatibleRuntimeSkills
      .map((row) => ({
        value: String(row?.id ?? '').trim(),
        label: row?.name ? `${row.name} (${row.key})` : (row?.key || row?.id || ''),
      }))
      .filter((row) => row.value)

    return [{ value: '', label: 'Select...' }, ...rows]
  }, [compatibleRuntimeSkills])

  const { data: agentResponse, isFetching: isAgentFetching, error: agentError } = useListRuntimeAgentsQuery({
    page: 1,
    pageSize: 100,
    q: '',
    status: RUNTIME_AGENT_STATUSES.ACTIVE,
  })

  const runtimeAgentRows = useMemo(() => {
    const data = agentResponse?.data
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data)) return data
    return []
  }, [agentResponse])

  const agentAppError = agentError ? normalizeError(agentError) : null

  const selectedDefaultAgentIds = useMemo(
    () => normalizeStableIdList(form.defaultAgentIds),
    [form.defaultAgentIds],
  )

  const loadedDefaultAgentIds = useMemo(
    () => normalizeStableIdList(loadedValidation?.defaultAgentIds),
    [loadedValidation?.defaultAgentIds],
  )

  const defaultAgentIdsChanged = useMemo(
    () => !areStableIdListsEqual(selectedDefaultAgentIds, loadedDefaultAgentIds),
    [loadedDefaultAgentIds, selectedDefaultAgentIds],
  )

  const availableDefaultAgentOptions = useMemo(() => {
    const selected = new Set(selectedDefaultAgentIds)

    return runtimeAgentRows
      .filter((row) => {
        const agentId = String(row?.id ?? '').trim()
        if (!agentId || selected.has(agentId)) return false

        const normalizedStatus = String(row?.status ?? '').trim().toUpperCase()
        if (normalizedStatus !== RUNTIME_AGENT_STATUSES.ACTIVE) return false

        if (selectedFrameworkKeys.length === 0) return true
        const supportedFrameworkKeys = Array.isArray(row?.supportedFrameworkKeys) ? row.supportedFrameworkKeys : []
        return selectedFrameworkKeys.every((frameworkKey) => supportedFrameworkKeys.includes(frameworkKey))
      })
      .map((row) => ({
        value: String(row?.id ?? '').trim(),
        label: row?.name ? `${row.name} (${row.key})` : (row?.key || row?.id || ''),
      }))
  }, [runtimeAgentRows, selectedDefaultAgentIds, selectedFrameworkKeys])

  const selectedDefaultAgentSummaries = useMemo(() => {
    const byId = new Map(
      runtimeAgentRows
        .map((row) => [String(row?.id ?? '').trim(), row])
        .filter(([value]) => value),
    )
    const canResolveDefaultAgents = !agentAppError && !isAgentFetching

    return selectedDefaultAgentIds.map((agentId) => {
      const row = byId.get(agentId)
      if (!row) {
        return {
          id: agentId,
          label: agentId,
          status: canResolveDefaultAgents ? 'MISSING' : '',
          issues: canResolveDefaultAgents ? ['Agent record was not found.'] : [],
        }
      }

      const supportedFrameworkKeys = Array.isArray(row.supportedFrameworkKeys) ? row.supportedFrameworkKeys : []
      const missingFrameworks = selectedFrameworkKeys.filter((frameworkKey) => !supportedFrameworkKeys.includes(frameworkKey))
      const normalizedStatus = String(row.status ?? '').trim().toUpperCase()
      const issues = []

      if (normalizedStatus !== RUNTIME_AGENT_STATUSES.ACTIVE) {
        issues.push(`Status is ${formatAgentStatus(normalizedStatus)}.`)
      }

      if (missingFrameworks.length > 0) {
        issues.push(`Does not support framework${missingFrameworks.length === 1 ? '' : 's'}: ${missingFrameworks.join(', ')}.`)
      }

      return {
        id: agentId,
        label: row.name ? `${row.name} (${row.key})` : (row.key || agentId),
        status: normalizedStatus,
        issues,
      }
    })
  }, [agentAppError, isAgentFetching, runtimeAgentRows, selectedDefaultAgentIds, selectedFrameworkKeys])

  const defaultAgentWarnings = useMemo(
    () => selectedDefaultAgentSummaries.filter((summary) => summary.issues.length > 0),
    [selectedDefaultAgentSummaries],
  )

  const [createValidation, { isLoading: isCreating }] = useCreateValidationRegistryMutation()
  const [cloneValidation, { isLoading: isCloning }] = useCloneValidationRegistryMutation()
  const [updateValidation, { isLoading: isUpdating }] = useUpdateValidationRegistryMutation()
  const [fetchDependencies] = useLazyGetValidationRegistryDependenciesQuery()

  const isSaving = isCreating || isUpdating || isCloning
  const isLocked = isEditMode && Boolean(loadedValidation?.isLocked)

  useEffect(() => {
    if (!isEditMode) return
    if (!loadedValidation) return

    setForm((current) => {
      const next = {
        key: loadedValidation.key ?? '',
        label: loadedValidation.label ?? '',
        description: loadedValidation.description ?? '',
        status: loadedValidation.status ?? VALIDATION_REGISTRY_STATUSES.ACTIVE,
        supportedFrameworkKeys: Array.isArray(loadedValidation.supportedFrameworkKeys)
          ? [...loadedValidation.supportedFrameworkKeys]
          : [],
        category: loadedValidation.category ?? VALIDATION_REGISTRY_CATEGORIES.COMPLETENESS,
        severity: loadedValidation.severity ?? VALIDATION_REGISTRY_SEVERITIES.ERROR,
        producerSkillId: loadedValidation.producerSkillId ?? '',
        defaultAgentIds: Array.isArray(loadedValidation.defaultAgentIds) ? [...loadedValidation.defaultAgentIds] : [],
        outputPath: loadedValidation.outputPath ?? '',
        resultType: loadedValidation.resultType ?? '',
        passFieldPath: loadedValidation.passFieldPath ?? '',
        detailsFieldPath: loadedValidation.detailsFieldPath ?? '',
        messageFieldPath: loadedValidation.messageFieldPath ?? '',
        parameterSchema: loadedValidation.parameterSchema ?? {},
        defaultParameters: loadedValidation.defaultParameters ?? {},
        retryPolicy: loadedValidation.retryPolicy ?? { maxAttempts: 1, retryableErrorCodes: [], backoffSeconds: 0 },
        policyUsable: loadedValidation.policyUsable !== undefined ? Boolean(loadedValidation.policyUsable) : true,
        packageUsable: loadedValidation.packageUsable !== undefined ? Boolean(loadedValidation.packageUsable) : true,
        requiresLatestRun: Boolean(loadedValidation.requiresLatestRun),
        freshnessDefaultMinutes: Number(loadedValidation.freshnessDefaultMinutes ?? 30) || 30,
        blockingDefault: loadedValidation.blockingDefault !== undefined ? Boolean(loadedValidation.blockingDefault) : true,
        warningOnlyDefault: Boolean(loadedValidation.warningOnlyDefault),
        allowManualRun: loadedValidation.allowManualRun === undefined ? true : Boolean(loadedValidation.allowManualRun),
        executionMode: loadedValidation.executionMode ?? VALIDATION_REGISTRY_EXECUTION_MODES.SYNC,
        version: Number(loadedValidation.version ?? 1) || 1,
      }

      return shallowEqualObject(current, next) ? current : next
    })
    const timeoutId = window.setTimeout(() => {
      setParameterSchemaText(formatPreviewJson(loadedValidation.parameterSchema ?? {}))
      setDefaultParametersText(formatPreviewJson(loadedValidation.defaultParameters ?? {}))
      setRetryableErrorCodesText(Array.isArray(loadedValidation.retryPolicy?.retryableErrorCodes)
        ? loadedValidation.retryPolicy.retryableErrorCodes.join(', ')
        : '')
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [isEditMode, loadedValidation, setForm])

  useEffect(() => {
    if (!isCloneMode) return
    if (!cloneSourceValidation) return

    const next = {
      key: `${cloneSourceValidation.key ?? ''}-clone`,
      label: `${cloneSourceValidation.label ?? cloneSourceValidation.key ?? 'Validation'} Clone`,
      description: cloneSourceValidation.description ?? '',
      status: VALIDATION_REGISTRY_STATUSES.DRAFT,
      supportedFrameworkKeys: Array.isArray(cloneSourceValidation.supportedFrameworkKeys)
        ? [...cloneSourceValidation.supportedFrameworkKeys]
        : [],
      category: cloneSourceValidation.category ?? VALIDATION_REGISTRY_CATEGORIES.COMPLETENESS,
      severity: cloneSourceValidation.severity ?? VALIDATION_REGISTRY_SEVERITIES.ERROR,
      producerSkillId: cloneSourceValidation.producerSkillId ?? '',
      defaultAgentIds: Array.isArray(cloneSourceValidation.defaultAgentIds) ? [...cloneSourceValidation.defaultAgentIds] : [],
      outputPath: cloneSourceValidation.outputPath ?? '',
      resultType: cloneSourceValidation.resultType ?? '',
      passFieldPath: cloneSourceValidation.passFieldPath ?? '',
      detailsFieldPath: cloneSourceValidation.detailsFieldPath ?? '',
      messageFieldPath: cloneSourceValidation.messageFieldPath ?? '',
      parameterSchema: cloneSourceValidation.parameterSchema ?? {},
      defaultParameters: cloneSourceValidation.defaultParameters ?? {},
      retryPolicy: cloneSourceValidation.retryPolicy ?? { maxAttempts: 1, retryableErrorCodes: [], backoffSeconds: 0 },
      policyUsable: cloneSourceValidation.policyUsable !== undefined ? Boolean(cloneSourceValidation.policyUsable) : true,
      packageUsable: cloneSourceValidation.packageUsable !== undefined ? Boolean(cloneSourceValidation.packageUsable) : true,
      requiresLatestRun: Boolean(cloneSourceValidation.requiresLatestRun),
      freshnessDefaultMinutes: Number(cloneSourceValidation.freshnessDefaultMinutes ?? 30) || 30,
      blockingDefault: cloneSourceValidation.blockingDefault !== undefined ? Boolean(cloneSourceValidation.blockingDefault) : true,
      warningOnlyDefault: Boolean(cloneSourceValidation.warningOnlyDefault),
      allowManualRun: cloneSourceValidation.allowManualRun === undefined ? true : Boolean(cloneSourceValidation.allowManualRun),
      executionMode: cloneSourceValidation.executionMode ?? VALIDATION_REGISTRY_EXECUTION_MODES.SYNC,
      version: Number(cloneSourceValidation.version ?? 1) + 1,
    }

    setForm(next)
    const timeoutId = window.setTimeout(() => {
      setParameterSchemaText(formatPreviewJson(next.parameterSchema))
      setDefaultParametersText(formatPreviewJson(next.defaultParameters))
      setRetryableErrorCodesText(Array.isArray(next.retryPolicy?.retryableErrorCodes)
        ? next.retryPolicy.retryableErrorCodes.join(', ')
        : '')
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [cloneSourceValidation, isCloneMode, setForm])

  const handleBack = useCallback(() => {
    navigate('/super-admin/runtime-control/validation-registry')
  }, [navigate])

  const submit = useCallback(async ({ bypassStatusWarning = false } = {}) => {
    if (isLocked) {
      addToast({
        variant: 'warning',
        title: 'Locked validation',
        description: 'Clone this validation before changing runtime behavior.',
      })
      return
    }

    const parameterSchemaResult = parseJsonObjectField(parameterSchemaText, 'Parameter Schema')
    const defaultParametersResult = parseJsonObjectField(defaultParametersText, 'Default Parameters')
    const retryableErrorCodes = retryableErrorCodesText
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)
    const formForValidation = {
      ...form,
      parameterSchema: parameterSchemaResult.value,
      defaultParameters: defaultParametersResult.value,
      retryPolicy: {
        ...form.retryPolicy,
        retryableErrorCodes,
      },
    }
    const clientErrors = {
      ...validateForm(formForValidation, { isEditMode }),
      ...(parameterSchemaResult.error ? { parameterSchema: parameterSchemaResult.error } : {}),
      ...(defaultParametersResult.error ? { defaultParameters: defaultParametersResult.error } : {}),
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      setErrorsSource('client')
      return
    }

    const nextStatus = String(form.status ?? '').trim().toUpperCase()
    const currentStatus = String(loadedValidation?.status ?? '').trim().toUpperCase()
    const shouldCheckDependencies = isEditMode
      && nextStatus
      && nextStatus !== currentStatus
      && (nextStatus === VALIDATION_REGISTRY_STATUSES.INACTIVE || nextStatus === VALIDATION_REGISTRY_STATUSES.DEPRECATED)
      && !bypassStatusWarning

    if (shouldCheckDependencies) {
      try {
        const res = await fetchDependencies(validationId).unwrap()
        const summary = res?.data?.dependencies?.summary && typeof res.data.dependencies.summary === 'object'
          ? res.data.dependencies.summary
          : {}
        const workflowPolicies = Number(summary.workflowPolicies) || 0
        const frameworkPackages = Number(summary.frameworkPackages) || 0

        if (workflowPolicies + frameworkPackages > 0) {
          setPendingStatusWarning({
            nextStatus,
            summary: { workflowPolicies, frameworkPackages },
          })
          return
        }
      } catch {
        // If we cannot resolve dependencies, allow save to proceed.
      }
      }

      const normalizedResultType = String(form.resultType ?? '').trim().toUpperCase()
      const payload = {
        ...(isEditMode ? {} : { key: String(formForValidation.key ?? '').trim().toLowerCase() }),
        label: String(form.label ?? '').trim(),
        description: String(form.description ?? '').trim(),
        status: nextStatus,
      supportedFrameworkKeys: normalizeFrameworkKeys(form.supportedFrameworkKeys),
        category: String(form.category ?? '').trim().toUpperCase(),
        severity: String(form.severity ?? '').trim().toUpperCase(),
        producerSkillId: String(form.producerSkillId ?? '').trim(),
        ...(!isEditMode || defaultAgentIdsChanged ? { defaultAgentIds: selectedDefaultAgentIds } : {}),
        outputPath: String(form.outputPath ?? '').trim(),
        ...(normalizedResultType ? { resultType: normalizedResultType } : {}),
        passFieldPath: String(form.passFieldPath ?? '').trim(),
        detailsFieldPath: String(form.detailsFieldPath ?? '').trim(),
        messageFieldPath: String(form.messageFieldPath ?? '').trim(),
        parameterSchema: formForValidation.parameterSchema,
        defaultParameters: formForValidation.defaultParameters,
        retryPolicy: {
          maxAttempts: Number(form.retryPolicy?.maxAttempts ?? 1) || 1,
          retryableErrorCodes,
          backoffSeconds: Number(form.retryPolicy?.backoffSeconds ?? 0) || 0,
        },
        policyUsable: Boolean(form.policyUsable),
        packageUsable: Boolean(form.packageUsable),
        requiresLatestRun: Boolean(form.requiresLatestRun),
        freshnessDefaultMinutes: Number(form.freshnessDefaultMinutes ?? 0),
        blockingDefault: Boolean(form.blockingDefault),
        warningOnlyDefault: Boolean(form.warningOnlyDefault),
        allowManualRun: Boolean(form.allowManualRun),
        executionMode: String(form.executionMode ?? VALIDATION_REGISTRY_EXECUTION_MODES.SYNC).trim().toUpperCase(),
        version: Number(form.version ?? 1) || 1,
    }

    try {
      if (isCloneMode) {
        const res = await cloneValidation({
          validationId: cloneFrom,
          body: {
            key: payload.key,
            label: payload.label,
            description: payload.description,
          },
        }).unwrap()
        addToast({
          variant: 'success',
          title: 'Validation cloned',
          description: `${res?.data?.key ?? payload.key} was created as an editable draft.`,
        })
        navigate(`/super-admin/runtime-control/validation-registry/${res?.data?.id ?? ''}`)
      } else if (isEditMode) {
        const res = await updateValidation({ validationId, ...payload }).unwrap()
        addToast({
          variant: 'success',
          title: 'Saved',
          description: `Updated ${res?.data?.key ?? loadedValidation?.key ?? 'validation'}.`,
        })
      } else {
        const res = await createValidation(payload).unwrap()
        addToast({
          variant: 'success',
          title: 'Validation created',
          description: `${res?.data?.key ?? 'Validation'} is now available in the Validation Registry.`,
        })
        setForm(INITIAL_FORM)
        requestAnimationFrame(() => {
          const el = document.getElementById('validation-registry-editor-key')
          el?.focus?.()
        })
      }

      setPendingStatusWarning(null)
      setErrors({})
      setErrorsSource(null)
    } catch (err) {
      const appErr = normalizeError(err)
      const details = appErr?.details
      const fieldErrors = getRuntimeControlFieldErrorMap(appErr, VALIDATION_REGISTRY_FORM_ERROR_FIELDS)
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        setErrorsSource('server')
      } else if (details && typeof details === 'object') {
        setErrors(details)
        setErrorsSource('server')
      } else {
        addToast({ variant: 'error', title: 'Save failed', description: appErr.message })
      }
    }
  }, [
    addToast,
    cloneFrom,
    cloneValidation,
    createValidation,
    defaultAgentIdsChanged,
    defaultParametersText,
    fetchDependencies,
    form,
    isCloneMode,
    isEditMode,
    isLocked,
    loadedValidation,
    navigate,
    parameterSchemaText,
    retryableErrorCodesText,
    setForm,
    selectedDefaultAgentIds,
    updateValidation,
    validationId,
  ])

  const closePending = useCallback(() => setPendingStatusWarning(null), [])
  const confirmPending = useCallback(async () => {
    if (!pendingStatusWarning?.nextStatus) return
    await submit({ bypassStatusWarning: true })
  }, [pendingStatusWarning, submit])

  const resolveSingle = (values) => (Array.isArray(values) && values.length > 0 ? values[0] : '')

  const previewForm = useMemo(() => {
    const parameterSchemaResult = parseJsonObjectField(parameterSchemaText, 'Parameter Schema')
    const defaultParametersResult = parseJsonObjectField(defaultParametersText, 'Default Parameters')
    const retryableErrorCodes = retryableErrorCodesText
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)

    return {
      ...form,
      parameterSchema: parameterSchemaResult.error ? form.parameterSchema : parameterSchemaResult.value,
      defaultParameters: defaultParametersResult.error ? form.defaultParameters : defaultParametersResult.value,
      retryPolicy: {
        ...(form.retryPolicy || {}),
        retryableErrorCodes,
      },
    }
  }, [defaultParametersText, form, parameterSchemaText, retryableErrorCodesText])

  const previewJson = useMemo(
    () => formatPreviewJson(buildValidationPreview(previewForm, { isEditMode, loadedValidation })),
    [isEditMode, loadedValidation, previewForm],
  )
  const dependencySummary = dependencyData?.dependencies?.summary ?? {}
  const dependencyWorkflowPolicies = dependencyData?.dependencies?.workflowPolicies ?? []
  const dependencyFrameworkPackages = dependencyData?.dependencies?.frameworkPackages ?? []
  const dependencyRuntimePaths = dependencyData?.runtimePaths ?? []
  const dependencyDefaultAgents = dependencyData?.defaultAgents ?? []

  const isLoading = isEditMode
    ? (isValidationLoading && !loadedValidation)
    : (isCloneMode ? (isCloneSourceLoading && !cloneSourceValidation) : false)

  if (isLoading) {
    return <ValidationRegistryEditorLoadingState isEditMode={isEditMode} />
  }

  if (validationAppError && !displayedValidation && (isEditMode || isCloneMode)) {
    return (
      <Card variant="elevated" className="super-admin-validation-registry__card super-admin-validation-registry-editor__card">
        <Card.Body className="super-admin-validation-registry__card-body super-admin-validation-registry__card-body--compact super-admin-validation-registry-editor__card-body super-admin-validation-registry-editor__card-body--compact">
          <div className="super-admin-validation-registry__catalogue-actions super-admin-validation-registry-editor__top-actions">
            <Button type="button" variant="outline" size="sm" onClick={handleBack}>
              Back
            </Button>
          </div>
          <p className="super-admin-validation-registry-editor__error" role="alert">{validationAppError.message}</p>
        </Card.Body>
      </Card>
    )
  }

  const headline = isCloneMode ? 'Clone Validation' : (isEditMode ? 'Edit Validation' : 'Create Validation')

  return (
    <section className="super-admin-validation-registry super-admin-validation-registry-editor container" aria-label="Super admin validation registry editor">
      <header className="super-admin-validation-registry__header super-admin-validation-registry-editor__header">
        <h1 className="super-admin-validation-registry__title super-admin-validation-registry-editor__title">{headline}</h1>
        <p className="super-admin-validation-registry__subtitle super-admin-validation-registry-editor__subtitle">
          Define governed validation checks used by workflow policies.
        </p>
      </header>

      <Card variant="elevated" className="super-admin-validation-registry__card super-admin-validation-registry-editor__card">
        <Card.Body className="super-admin-validation-registry__card-body super-admin-validation-registry__card-body--compact super-admin-validation-registry-editor__card-body super-admin-validation-registry-editor__card-body--compact">
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <div className="super-admin-validation-registry__catalogue-actions super-admin-validation-registry-editor__top-actions">
              <Button type="button" variant="outline" size="sm" onClick={handleBack} disabled={isSaving}>Back</Button>
              {isLocked ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/super-admin/runtime-control/validation-registry/new?cloneFrom=${encodeURIComponent(validationId)}`)}
                  disabled={isSaving}
                >
                  Clone
                </Button>
              ) : null}
            </div>

            {isLocked ? (
              <div
                className="super-admin-validation-registry-editor__lock-banner"
                role="status"
                aria-label="Locked validation notice"
                aria-live="polite"
              >
                <Badge variant="warning" size="sm" pill outline>
                  Locked
                </Badge>
                <div className="super-admin-validation-registry-editor__lock-copy">
                  <strong>Locked by validated package usage.</strong>
                  <span>Clone this validation to make behavior changes.</span>
                </div>
                {Array.isArray(loadedValidation?.lockedByPackageKeys) && loadedValidation.lockedByPackageKeys.length > 0 ? (
                  <div className="super-admin-validation-registry-editor__lock-packages" aria-label="Locked by packages">
                    {loadedValidation.lockedByPackageKeys.map((packageKey) => (
                      <Badge key={packageKey} variant="neutral" size="sm" pill outline>
                        {packageKey}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <fieldset className="super-admin-validation-registry-editor__edit-fieldset" disabled={isLocked}>
            <div className="super-admin-validation-registry-editor__row">
              <div className="super-admin-validation-registry-editor__field">
                <label className="super-admin-validation-registry-editor__field-label" htmlFor="validation-registry-editor-key">
                  Key{!isEditMode ? <span className="input-label__required"> *</span> : null}
                </label>
                <Input
                  id="validation-registry-editor-key"
                  value={form.key}
                  placeholder={!isEditMode ? 'required-sections-check' : undefined}
                  onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
                  error={errors.key}
                  helperText={isEditMode ? 'Key is immutable.' : 'Lowercase stable key. Example: required-sections-check'}
                  disabled={isEditMode}
                  required={!isEditMode}
                  fullWidth
                />
              </div>

              <div className="super-admin-validation-registry-editor__field">
                <label className="super-admin-validation-registry-editor__field-label" htmlFor="validation-registry-editor-status">
                  Status<span className="input-label__required"> *</span>
                </label>
                <Select
                  id="validation-registry-editor-status"
                  value={form.status}
                  options={VALIDATION_REGISTRY_STATUS_OPTIONS.filter((opt) => opt.value)}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                />
              </div>

              <div className="super-admin-validation-registry-editor__field">
                <label className="super-admin-validation-registry-editor__field-label" htmlFor="validation-registry-editor-category">
                  Category<span className="input-label__required"> *</span>
                </label>
                <Select
                  id="validation-registry-editor-category"
                  value={form.category}
                  options={VALIDATION_REGISTRY_CATEGORY_OPTIONS.filter((opt) => opt.value)}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  error={errors.category}
                />
              </div>

              <div className="super-admin-validation-registry-editor__field">
                <label className="super-admin-validation-registry-editor__field-label" htmlFor="validation-registry-editor-severity">
                  Severity<span className="input-label__required"> *</span>
                </label>
                <Select
                  id="validation-registry-editor-severity"
                  value={form.severity}
                  options={VALIDATION_REGISTRY_SEVERITY_OPTIONS.filter((opt) => opt.value)}
                  onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}
                  error={errors.severity}
                />
              </div>
            </div>

            <div className="super-admin-validation-registry-editor__row">
              <div className="super-admin-validation-registry-editor__field">
                <label className="super-admin-validation-registry-editor__field-label" htmlFor="validation-registry-editor-label">
                  Label<span className="input-label__required"> *</span>
                </label>
                <Input
                  id="validation-registry-editor-label"
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  error={errors.label}
                  required
                  fullWidth
                />
              </div>
              <div className="super-admin-validation-registry-editor__field">
                <label className="super-admin-validation-registry-editor__field-label" htmlFor="validation-registry-editor-producer-skill">
                  Producer Skill<span className="input-label__required"> *</span>
                </label>
                <Select
                  id="validation-registry-editor-producer-skill"
                  value={form.producerSkillId}
                  options={skillOptions}
                  onChange={(event) => setForm((current) => ({ ...current, producerSkillId: event.target.value }))}
                  error={errors.producerSkillId}
                  disabled={Boolean(skillAppError) || skillOptions.length <= 1}
                  helperText={
                    skillAppError
                      ? `Failed to load skills: ${skillAppError.message}`
                      : isSkillFetching
                        ? 'Loading skills...'
                        : (selectedFrameworkKeys.length > 0
                          ? 'Select a skill compatible with the supported frameworks.'
                          : 'Select the governed skill that produces this validation result.')
                  }
                />
              </div>
            </div>

            <div className="super-admin-validation-registry-editor__field">
              <label className="super-admin-validation-registry-editor__field-label" htmlFor="validation-registry-editor-description">
                Description<span className="input-label__required"> *</span>
              </label>
              <Textarea
                id="validation-registry-editor-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                error={errors.description}
                required
                rows={4}
                fullWidth
              />
            </div>

            <div className="super-admin-validation-registry-editor__framework-section">
              <p className="super-admin-validation-registry-editor__helper">
                Supported Frameworks
              </p>
              <div className="super-admin-validation-registry-editor__framework-controls">
                <div className="super-admin-validation-registry-editor__field">
                  <label className="super-admin-validation-registry-editor__field-label" htmlFor="validation-registry-editor-framework-add">
                    Add Framework
                  </label>
                  <Select
                    id="validation-registry-editor-framework-add"
                    value={pendingFrameworkKey}
                    options={[
                      { value: '', label: 'Select...' },
                      ...availableFrameworkOptions,
                    ]}
                    onChange={(event) => setPendingFrameworkKey(event.target.value)}
                    placeholder={availableFrameworkOptions.length > 0 ? 'Select a framework' : 'No frameworks available'}
                    disabled={Boolean(frameworkAppError) || availableFrameworkOptions.length === 0}
                    helperText={frameworkAppError ? `Failed to load frameworks: ${frameworkAppError.message}` : ''}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="super-admin-validation-registry-editor__framework-add-button"
                  onClick={() => {
                    const frameworkKey = String(pendingFrameworkKey ?? '').trim().toUpperCase()
                    if (!frameworkKey) return
                    setForm((current) => ({
                      ...current,
                      supportedFrameworkKeys: normalizeFrameworkKeys([
                        ...(Array.isArray(current.supportedFrameworkKeys) ? current.supportedFrameworkKeys : []),
                        frameworkKey,
                      ]),
                    }))
                    setPendingFrameworkKey('')
                  }}
                  disabled={!pendingFrameworkKey}
                >
                  Add Framework
                </Button>
              </div>
              <div className="super-admin-validation-registry-editor__summary">
                {selectedFrameworkKeys.length > 0 ? selectedFrameworkKeys.map((frameworkKey) => (
                  <span key={frameworkKey} className="super-admin-validation-registry-editor__summary-item">
                    <span className="super-admin-validation-registry-editor__summary-label">Framework</span>
                    <Badge variant="neutral" size="sm" pill>{frameworkKey}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((current) => ({
                        ...current,
                        supportedFrameworkKeys: normalizeFrameworkKeys(current.supportedFrameworkKeys).filter((value) => value !== frameworkKey),
                      }))}
                      aria-label={`Remove ${frameworkKey}`}
                    >
                      Remove
                    </Button>
                  </span>
                )) : (
                  <p className="super-admin-validation-registry-editor__helper">No frameworks selected yet.</p>
                )}
              </div>
            </div>
            {errors.supportedFrameworkKeys ? (
              <p className="super-admin-validation-registry-editor__error" role="alert">{errors.supportedFrameworkKeys}</p>
            ) : null}

            <div className="super-admin-validation-registry-editor__framework-section">
              <p className="super-admin-validation-registry-editor__helper">
                Default Agents
              </p>
              <div className="super-admin-validation-registry-editor__framework-controls">
                <div className="super-admin-validation-registry-editor__field">
                  <label className="super-admin-validation-registry-editor__field-label" htmlFor="validation-registry-editor-default-agent-add">
                    Add Default Agent
                  </label>
                  <Select
                    id="validation-registry-editor-default-agent-add"
                    value={pendingDefaultAgentId}
                    options={[
                      { value: '', label: 'Select...' },
                      ...availableDefaultAgentOptions,
                    ]}
                    onChange={(event) => setPendingDefaultAgentId(event.target.value)}
                    placeholder={availableDefaultAgentOptions.length > 0 ? 'Select a default agent' : 'No compatible agents available'}
                    disabled={Boolean(agentAppError) || availableDefaultAgentOptions.length === 0}
                    helperText={
                      agentAppError
                        ? `Failed to load agents: ${agentAppError.message}`
                        : isAgentFetching
                          ? 'Loading runtime agents...'
                          : (selectedFrameworkKeys.length > 0
                            ? 'Only ACTIVE agents compatible with the selected frameworks are available to add.'
                            : 'Optional. Default agents can be used by downstream validation orchestration.')
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="super-admin-validation-registry-editor__framework-add-button"
                  onClick={() => {
                    const defaultAgentId = String(pendingDefaultAgentId ?? '').trim()
                    if (!defaultAgentId) return
                    setForm((current) => ({
                      ...current,
                      defaultAgentIds: normalizeStableIdList([
                        ...(Array.isArray(current.defaultAgentIds) ? current.defaultAgentIds : []),
                        defaultAgentId,
                      ]),
                    }))
                    setPendingDefaultAgentId('')
                  }}
                  disabled={!pendingDefaultAgentId}
                >
                  Add Agent
                </Button>
              </div>
              <div className="super-admin-validation-registry-editor__summary">
                {selectedDefaultAgentSummaries.length > 0 ? selectedDefaultAgentSummaries.map((agent) => (
                  <span key={agent.id} className="super-admin-validation-registry-editor__summary-item">
                    <span className="super-admin-validation-registry-editor__summary-label">Default Agent</span>
                    <Badge variant="neutral" size="sm" pill>{agent.label}</Badge>
                    {agent.status ? (
                      <Badge
                        variant={getAgentStatusBadgeVariant(agent.status)}
                        size="sm"
                        pill
                        outline={agent.status !== RUNTIME_AGENT_STATUSES.ACTIVE}
                        className="super-admin-validation-registry-editor__summary-meta"
                      >
                        {formatAgentStatus(agent.status)}
                      </Badge>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((current) => ({
                        ...current,
                        defaultAgentIds: normalizeStableIdList(current.defaultAgentIds).filter((value) => value !== agent.id),
                      }))}
                      aria-label={`Remove ${agent.label}`}
                    >
                      Remove
                    </Button>
                  </span>
                )) : (
                  <p className="super-admin-validation-registry-editor__helper">
                    No default agents selected yet. This is optional metadata.
                  </p>
                )}
              </div>
              {defaultAgentWarnings.length > 0 ? (
                <div className="super-admin-validation-registry-editor__warning-panel" role="status" aria-live="polite">
                  <div className="super-admin-validation-registry-editor__warning-header">
                    <Badge variant="warning" size="sm" pill>Review Required</Badge>
                    <p className="super-admin-validation-registry-editor__helper">
                      Some selected default agents are unresolved, inactive, or framework-incompatible. Remove or replace them before resaving this field.
                    </p>
                  </div>
                  <div className="super-admin-validation-registry-editor__warning-list">
                    {defaultAgentWarnings.map((agent) => (
                      <p key={agent.id} className="super-admin-validation-registry-editor__warning-item">
                        <strong>{agent.label}</strong>: {agent.issues.join(' ')}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            {errors.defaultAgentIds ? (
              <p className="super-admin-validation-registry-editor__error" role="alert">{errors.defaultAgentIds}</p>
            ) : null}

            <div className="super-admin-validation-registry-editor__path-stack">
              <RuntimePathSearchSelect
                id="validation-registry-editor-output-path"
                label="Output Path"
                frameworkKeys={selectedFrameworkKeys}
                scope="VALIDATION_RESULT"
                operation={null}
                selectedKeys={form.outputPath ? [form.outputPath] : []}
                onChange={(values) => setForm((current) => ({ ...current, outputPath: resolveSingle(values) }))}
                error={errors.outputPath}
                helperText="Select a runtime path that represents the validation output root (VALIDATION_RESULT scope)."
              />

              <RuntimePathSearchSelect
                id="validation-registry-editor-pass-field-path"
                label="Pass Field Path"
                frameworkKeys={selectedFrameworkKeys}
                scope="VALIDATION_RESULT"
                operation={null}
                selectedKeys={form.passFieldPath ? [form.passFieldPath] : []}
                onChange={(values) => setForm((current) => ({ ...current, passFieldPath: resolveSingle(values) }))}
                error={errors.passFieldPath}
                helperText="Optional. If supplied, it must be a descendant of Output Path."
              />

              <RuntimePathSearchSelect
                id="validation-registry-editor-details-field-path"
                label="Details Field Path"
                frameworkKeys={selectedFrameworkKeys}
                scope="VALIDATION_RESULT"
                operation={null}
                selectedKeys={form.detailsFieldPath ? [form.detailsFieldPath] : []}
                onChange={(values) => setForm((current) => ({ ...current, detailsFieldPath: resolveSingle(values) }))}
                error={errors.detailsFieldPath}
                helperText="Optional. If supplied, it must be a descendant of Output Path."
              />

              <RuntimePathSearchSelect
                id="validation-registry-editor-message-field-path"
                label="Message Field Path"
                frameworkKeys={selectedFrameworkKeys}
                scope="VALIDATION_RESULT"
                operation={null}
                selectedKeys={form.messageFieldPath ? [form.messageFieldPath] : []}
                onChange={(values) => setForm((current) => ({ ...current, messageFieldPath: resolveSingle(values) }))}
                error={errors.messageFieldPath}
                helperText="Optional. Human-readable validation result message path."
              />
            </div>

            {form.outputPath ? (
              <div className="super-admin-validation-registry-editor__quick-fill" aria-label="Runtime output path quick fill">
                <p className="super-admin-validation-registry-editor__helper">
                  Quick-fill common output descendants from the selected Output Path.
                </p>
                <div className="super-admin-validation-registry-editor__quick-fill-actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((current) => ({ ...current, passFieldPath: buildDescendantPath(current.outputPath, 'is_valid') }))}
                  >
                    Pass: .is_valid
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((current) => ({ ...current, detailsFieldPath: buildDescendantPath(current.outputPath, 'message') }))}
                  >
                    Details: .message
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((current) => ({ ...current, detailsFieldPath: buildDescendantPath(current.outputPath, 'missing_sections') }))}
                  >
                    Details: .missing_sections
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((current) => ({ ...current, messageFieldPath: buildDescendantPath(current.outputPath, 'message') }))}
                  >
                    Message: .message
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((current) => ({ ...current, detailsFieldPath: buildDescendantPath(current.outputPath, 'score') }))}
                  >
                    Details: .score
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="super-admin-validation-registry-editor__defaults-section">
              <div className="super-admin-validation-registry-editor__toggle-row">
                <Tickbox
                  id="validation-registry-editor-policy-usable"
                  label="Policy Usable"
                  checked={Boolean(form.policyUsable)}
                  onChange={(event) => setForm((current) => ({ ...current, policyUsable: event.target.checked }))}
                />
                <Tickbox
                  id="validation-registry-editor-package-usable"
                  label="Package Usable"
                  checked={Boolean(form.packageUsable)}
                  onChange={(event) => setForm((current) => ({ ...current, packageUsable: event.target.checked }))}
                />
                <Tickbox
                  id="validation-registry-editor-requires-latest-run"
                  label="Requires Latest Run"
                  checked={Boolean(form.requiresLatestRun)}
                  onChange={(event) => setForm((current) => ({ ...current, requiresLatestRun: event.target.checked }))}
                />
                <Tickbox
                  id="validation-registry-editor-allow-manual-run"
                  label="Allow Manual Run"
                  checked={Boolean(form.allowManualRun)}
                  onChange={(event) => setForm((current) => ({ ...current, allowManualRun: event.target.checked }))}
                />
              </div>

              <div className="super-admin-validation-registry-editor__row">
                <Select
                  id="validation-registry-editor-result-type"
                  label="Result Type"
                  value={form.resultType}
                  options={VALIDATION_REGISTRY_RESULT_TYPE_OPTIONS}
                  onChange={(event) => setForm((current) => ({ ...current, resultType: event.target.value }))}
                  error={errors.resultType}
                  helperText="Optional. When set, it should match the selected Output Path data type."
                />
                <Input
                  id="validation-registry-editor-freshness-default"
                  label="Freshness Default Minutes"
                  type="number"
                  value={String(form.freshnessDefaultMinutes)}
                  onChange={(event) => setForm((current) => ({ ...current, freshnessDefaultMinutes: event.target.value }))}
                  error={errors.freshnessDefaultMinutes}
                  helperText="0 means no freshness window."
                  fullWidth
                />
              </div>

              <div className="super-admin-validation-registry-editor__row">
                <Input
                  id="validation-registry-editor-retry-max-attempts"
                  label="Max Attempts"
                  type="number"
                  value={String(form.retryPolicy?.maxAttempts ?? 1)}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    retryPolicy: { ...(current.retryPolicy || {}), maxAttempts: event.target.value },
                  }))}
                  error={errors['retryPolicy.maxAttempts']}
                  fullWidth
                />
                <Input
                  id="validation-registry-editor-retry-backoff"
                  label="Backoff Seconds"
                  type="number"
                  value={String(form.retryPolicy?.backoffSeconds ?? 0)}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    retryPolicy: { ...(current.retryPolicy || {}), backoffSeconds: event.target.value },
                  }))}
                  error={errors['retryPolicy.backoffSeconds']}
                  fullWidth
                />
              </div>

              <div className="super-admin-validation-registry-editor__field">
                <label className="super-admin-validation-registry-editor__field-label" htmlFor="validation-registry-editor-retry-codes">
                  Retryable Error Codes
                </label>
                <Input
                  id="validation-registry-editor-retry-codes"
                  value={retryableErrorCodesText}
                  onChange={(event) => setRetryableErrorCodesText(event.target.value)}
                  helperText="Comma-separated runtime error codes."
                  fullWidth
                />
              </div>

              <div className="super-admin-validation-registry-editor__row">
                <Textarea
                  id="validation-registry-editor-parameter-schema"
                  label="Parameter Schema"
                  value={parameterSchemaText}
                  onChange={(event) => setParameterSchemaText(event.target.value)}
                  error={errors.parameterSchema}
                  helperText="JSON object used to validate package binding parameters."
                  rows={6}
                  fullWidth
                />
                <Textarea
                  id="validation-registry-editor-default-parameters"
                  label="Default Parameters"
                  value={defaultParametersText}
                  onChange={(event) => setDefaultParametersText(event.target.value)}
                  error={errors.defaultParameters}
                  helperText="JSON object merged before package binding parameters."
                  rows={6}
                  fullWidth
                />
              </div>

              <div className="super-admin-validation-registry-editor__row">
                <Select
                  id="validation-registry-editor-execution-mode"
                  label="Execution Mode"
                  value={form.executionMode}
                  options={VALIDATION_REGISTRY_EXECUTION_MODE_OPTIONS}
                  onChange={(event) => setForm((current) => ({ ...current, executionMode: event.target.value }))}
                  helperText="SYNC runs inline; ASYNC/QUEUED are reserved for orchestration flows."
                />
                <Input
                  id="validation-registry-editor-version"
                  label="Version"
                  type="number"
                  value={String(form.version)}
                  onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))}
                  error={errors.version}
                  helperText="Positive whole number for schema evolution."
                  fullWidth
                />
              </div>

              <div className="super-admin-validation-registry-editor__toggle-row">
                <Tickbox
                  id="validation-registry-editor-blocking-default"
                  label="Blocking Default"
                  checked={Boolean(form.blockingDefault)}
                  onChange={(event) => setForm((current) => ({ ...current, blockingDefault: event.target.checked }))}
                />
                <Tickbox
                  id="validation-registry-editor-warning-only-default"
                  label="Warning Only Default"
                  checked={Boolean(form.warningOnlyDefault)}
                  onChange={(event) => setForm((current) => ({ ...current, warningOnlyDefault: event.target.checked }))}
                />
              </div>
            </div>
          {errors.warningOnlyDefault ? (
            <p className="super-admin-validation-registry-editor__error" role="alert">{errors.warningOnlyDefault}</p>
          ) : null}

          <div className="super-admin-validation-registry-editor__insight-grid">
            <section className="super-admin-validation-registry-editor__insight-card" aria-label="Validation usage">
              <div className="super-admin-validation-registry-editor__insight-header">
                <h2 className="super-admin-validation-registry-editor__insight-title">Usage</h2>
                {isDependencyFetching ? <span className="super-admin-validation-registry-editor__helper">Loading...</span> : null}
              </div>
              {isEditMode ? (
                dependencyAppError ? (
                  <p className="super-admin-validation-registry-editor__error" role="alert">{dependencyAppError.message}</p>
                ) : (
                  <>
                    <div className="super-admin-validation-registry-editor__usage-summary">
                      <span><strong>{Number(dependencySummary.workflowPolicies) || 0}</strong> Workflow Policies</span>
                      <span><strong>{Number(dependencySummary.frameworkPackages) || 0}</strong> Framework Packages</span>
                    </div>
                    <div className="super-admin-validation-registry-editor__usage-list">
                      {dependencyWorkflowPolicies.map((policy) => (
                        <p key={policy.id ?? policy.key} className="super-admin-validation-registry-editor__helper">
                          Policy: {policy.name ?? policy.key} ({policy.status ?? 'UNKNOWN'})
                        </p>
                      ))}
                      {dependencyFrameworkPackages.map((pkg) => (
                        <p key={pkg.id ?? `${pkg.frameworkKey}-${pkg.version}`} className="super-admin-validation-registry-editor__helper">
                          Package: {pkg.frameworkKey} {pkg.version} ({pkg.status ?? 'UNKNOWN'})
                        </p>
                      ))}
                      {dependencyWorkflowPolicies.length + dependencyFrameworkPackages.length === 0 ? (
                        <p className="super-admin-validation-registry-editor__helper">No current policy or package references.</p>
                      ) : null}
                    </div>
                    <div className="super-admin-validation-registry-editor__usage-list">
                      {dependencyRuntimePaths.map((path) => (
                        <p key={path.pathKey} className="super-admin-validation-registry-editor__helper">
                          Path: {path.pathKey} ({path.status ?? 'UNKNOWN'})
                        </p>
                      ))}
                      {dependencyDefaultAgents.map((agent) => (
                        <p key={agent.id} className="super-admin-validation-registry-editor__helper">
                          Agent: {agent.name ?? agent.key} ({agent.status ?? 'UNKNOWN'})
                        </p>
                      ))}
                    </div>
                  </>
                )
              ) : (
                <p className="super-admin-validation-registry-editor__helper">
                  Usage is available after the validation has been created.
                </p>
              )}
            </section>

            <section className="super-admin-validation-registry-editor__insight-card" aria-label="Validation JSON preview">
              <div className="super-admin-validation-registry-editor__insight-header">
                <h2 className="super-admin-validation-registry-editor__insight-title">Live JSON Preview</h2>
                <Badge variant={form.allowManualRun ? 'info' : 'neutral'} size="sm" pill outline>
                  {form.allowManualRun ? 'Validation Console Pending' : 'Manual Run Disabled'}
                </Badge>
              </div>
              <pre className="super-admin-validation-registry-editor__json-preview" aria-label="Validation registry JSON preview">
                {previewJson}
              </pre>
              <p className="super-admin-validation-registry-editor__helper">
                Test execution is reserved for the Validation Console; this preview shows the payload shape that will be saved.
              </p>
            </section>
          </div>

            </fieldset>

          {errorsSource === 'server' && Object.keys(errors).length > 0 ? (
            <p className="super-admin-validation-registry-editor__helper">
              Server validation returned {Object.keys(errors).length} field error{Object.keys(errors).length === 1 ? '' : 's'}.
            </p>
          ) : null}

            <div className="super-admin-validation-registry-editor__footer-actions">
              <Button type="button" variant="outline" size="sm" onClick={handleBack} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={isSaving} disabled={isLocked}>
                {isCloneMode ? 'Create Clone' : (isEditMode ? 'Save Changes' : 'Create Validation')}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>

      <Dialog open={Boolean(pendingStatusWarning)} onClose={closePending} size="sm">
        <Dialog.Header>
          <h2>
            {pendingStatusWarning?.nextStatus === VALIDATION_REGISTRY_STATUSES.INACTIVE
              ? 'Make validation inactive?'
              : 'Deprecate validation?'}
          </h2>
        </Dialog.Header>
        <Dialog.Body>
          <p className="super-admin-validation-registry-editor__dialog-copy">
            This validation is currently referenced by{' '}
            {Number(pendingStatusWarning?.summary?.workflowPolicies) || 0} workflow polic{Number(pendingStatusWarning?.summary?.workflowPolicies) === 1 ? 'y' : 'ies'}
            {' '}and{' '}
            {Number(pendingStatusWarning?.summary?.frameworkPackages) || 0} framework package{Number(pendingStatusWarning?.summary?.frameworkPackages) === 1 ? '' : 's'}.
          </p>
          <p className="super-admin-validation-registry-editor__dialog-helper">
            Making it {pendingStatusWarning?.nextStatus ?? 'non-active'} will block new assignments but will not remove existing references.
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={closePending} disabled={isSaving}>
            Cancel
          </Button>
          {pendingStatusWarning?.nextStatus === VALIDATION_REGISTRY_STATUSES.INACTIVE ? (
            <Button variant="primary" onClick={confirmPending} loading={isSaving}>
              Mark Inactive
            </Button>
          ) : (
            <Button variant="danger" onClick={confirmPending} loading={isSaving}>
              Deprecate
            </Button>
          )}
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminValidationRegistryEditor
