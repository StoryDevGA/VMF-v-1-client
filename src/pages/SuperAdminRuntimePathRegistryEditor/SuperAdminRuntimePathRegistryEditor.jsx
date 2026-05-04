import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { TabView } from '../../components/TabView'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { useToaster } from '../../components/Toaster'
import {
  useCloneRuntimePathMutation,
  useCreateRuntimePathMutation,
  useGetRuntimePathDependenciesQuery,
  useGetRuntimePathQuery,
  useListFrameworkRegistriesQuery,
  useUpdateRuntimePathMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { getRuntimeControlFieldErrorMap } from '../../utils/runtimeControlFormErrors.js'
import {
  RUNTIME_PATH_REGISTRY_CATEGORY_OPTIONS,
  RUNTIME_PATH_REGISTRY_DATA_TYPE_OPTIONS,
  RUNTIME_PATH_REGISTRY_DATA_TYPES,
  RUNTIME_PATH_REGISTRY_FORM_ERROR_FIELDS,
  RUNTIME_PATH_REGISTRY_FORM_OPERATION_OPTIONS,
  RUNTIME_PATH_REGISTRY_OPERATIONS,
  RUNTIME_PATH_REGISTRY_SCOPE_OPTIONS,
  RUNTIME_PATH_REGISTRY_SCOPES,
  RUNTIME_PATH_REGISTRY_SOURCE_TYPE_OPTIONS,
  RUNTIME_PATH_REGISTRY_SOURCE_TYPES,
  RUNTIME_PATH_REGISTRY_STATUS_OPTIONS,
  RUNTIME_PATH_REGISTRY_STATUSES,
  RUNTIME_PATH_REGISTRY_UI_CONTROL_OPTIONS,
  formatRuntimePathRegistryStatus,
  formatRuntimeControlVersionStatus,
  getRuntimeControlVersionStatusVariant,
  getRuntimePathRegistryStatusVariant,
  normalizeRuntimePathRegistryList as normalizeList,
  parseOptionalRuntimePathRegistryNumber as parseOptionalNumber,
  parseRuntimePathRegistryListText as parseListText,
  validateRuntimePathRegistryForm as validateForm,
} from '../SuperAdminRuntimePathRegistry/superAdminRuntimePathRegistry.constants.js'
import '../SuperAdminRuntimePathRegistry/SuperAdminRuntimePathRegistry.css'
import './SuperAdminRuntimePathRegistryEditor.css'

const INITIAL_FORM = Object.freeze({
  pathKey: '',
  label: '',
  description: '',
  status: RUNTIME_PATH_REGISTRY_STATUSES.DRAFT,
  frameworkKeys: ['VMF'],
  scope: RUNTIME_PATH_REGISTRY_SCOPES.FRAMEWORK_STATE,
  allowedOperations: [RUNTIME_PATH_REGISTRY_OPERATIONS.READ],
  dataType: RUNTIME_PATH_REGISTRY_DATA_TYPES.STRING,
  category: 'STATE',
  sourceType: RUNTIME_PATH_REGISTRY_SOURCE_TYPES.RUNTIME_STATE,
  isProtected: false,
  isSystem: false,
  introducedInVersion: '',
  deprecatedInVersion: '',
  replacementPathKey: '',
  notes: '',
  displayOrder: '',
  exampleValue: '',
  compatibilityTags: '',
  allowedValues: '',
  allowedValueLabels: '',
  uiControl: '',
  placeholderText: '',
  helpText: '',
  defaultValue: '',
  minValue: '',
  maxValue: '',
  minLength: '',
  maxLength: '',
  regexPattern: '',
  isNullable: false,
})

const formatListText = (values) => (Array.isArray(values) ? values.join('\n') : '')

const formatValueText = (value) => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

const formatRecordJson = (value) => JSON.stringify(value ?? {}, null, 2)

const parseLooseValue = (value) => {
  const text = String(value ?? '').trim()
  if (!text) return undefined

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const parseObjectText = (value) => {
  const text = String(value ?? '').trim()
  if (!text) return undefined

  const parsed = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Must be a JSON object.')
  }
  return parsed
}

const countErrorsForFields = (errors, fields) => fields.filter((field) => errors[field]).length

const renderTabLabel = (label, count = 0) => (
  <span className="super-admin-runtime-path-registry-editor__tab-label">
    <span>{label}</span>
    {count > 0 ? (
      <>
        <span className="super-admin-runtime-path-registry-editor__tab-error-count" aria-hidden="true">
          ({count})
        </span>
        <span className="sr-only"> ({count} validation errors)</span>
      </>
    ) : null}
  </span>
)

const mapRuntimePathToForm = (runtimePath, { clone = false } = {}) => ({
  ...INITIAL_FORM,
  pathKey: clone ? '' : (runtimePath?.pathKey ?? ''),
  label: clone && runtimePath?.label ? `${runtimePath.label} Clone` : (runtimePath?.label ?? ''),
  description: runtimePath?.description ?? '',
  status: clone ? RUNTIME_PATH_REGISTRY_STATUSES.DRAFT : (runtimePath?.status ?? RUNTIME_PATH_REGISTRY_STATUSES.DRAFT),
  frameworkKeys: normalizeList(runtimePath?.frameworkKeys, { upper: true }),
  scope: runtimePath?.scope ?? INITIAL_FORM.scope,
  allowedOperations: normalizeList(runtimePath?.allowedOperations, { upper: true }),
  dataType: runtimePath?.dataType ?? INITIAL_FORM.dataType,
  category: runtimePath?.category ?? INITIAL_FORM.category,
  sourceType: runtimePath?.sourceType ?? INITIAL_FORM.sourceType,
  isProtected: Boolean(runtimePath?.isProtected),
  isSystem: clone ? false : Boolean(runtimePath?.isSystem),
  introducedInVersion: runtimePath?.introducedInVersion ?? '',
  deprecatedInVersion: runtimePath?.deprecatedInVersion ?? '',
  replacementPathKey: runtimePath?.replacementPathKey ?? '',
  notes: runtimePath?.notes ?? '',
  displayOrder: runtimePath?.displayOrder === undefined ? '' : String(runtimePath.displayOrder),
  exampleValue: formatValueText(runtimePath?.exampleValue),
  compatibilityTags: formatListText(runtimePath?.compatibilityTags),
  allowedValues: formatListText(runtimePath?.allowedValues),
  allowedValueLabels: runtimePath?.allowedValueLabels ? JSON.stringify(runtimePath.allowedValueLabels, null, 2) : '',
  uiControl: runtimePath?.uiControl ?? '',
  placeholderText: runtimePath?.placeholderText ?? '',
  helpText: runtimePath?.helpText ?? '',
  defaultValue: formatValueText(runtimePath?.defaultValue),
  minValue: runtimePath?.minValue === undefined ? '' : String(runtimePath.minValue),
  maxValue: runtimePath?.maxValue === undefined ? '' : String(runtimePath.maxValue),
  minLength: runtimePath?.minLength === undefined ? '' : String(runtimePath.minLength),
  maxLength: runtimePath?.maxLength === undefined ? '' : String(runtimePath.maxLength),
  regexPattern: runtimePath?.regexPattern ?? '',
  isNullable: Boolean(runtimePath?.isNullable),
})

const buildPayload = (form, { includePathKey = false, includeLifecycleStatus = false } = {}) => {
  const uiControl = String(form.uiControl ?? '').trim().toUpperCase()
  const payload = {
    ...(includePathKey ? { pathKey: String(form.pathKey ?? '').trim() } : {}),
    label: String(form.label ?? '').trim(),
    description: String(form.description ?? '').trim(),
    ...(includeLifecycleStatus ? { status: String(form.status ?? '').trim().toUpperCase() } : {}),
    frameworkKeys: normalizeList(form.frameworkKeys, { upper: true }),
    scope: String(form.scope ?? '').trim().toUpperCase(),
    allowedOperations: normalizeList(form.allowedOperations, { upper: true }),
    dataType: String(form.dataType ?? '').trim().toUpperCase(),
    category: String(form.category ?? '').trim().toUpperCase(),
    sourceType: String(form.sourceType ?? '').trim().toUpperCase(),
    isProtected: Boolean(form.isProtected),
    isSystem: Boolean(form.isSystem),
    introducedInVersion: String(form.introducedInVersion ?? '').trim(),
    deprecatedInVersion: String(form.deprecatedInVersion ?? '').trim(),
    replacementPathKey: String(form.replacementPathKey ?? '').trim(),
    notes: String(form.notes ?? '').trim(),
    compatibilityTags: parseListText(form.compatibilityTags),
    allowedValues: parseListText(form.allowedValues),
    allowedValueLabels: parseObjectText(form.allowedValueLabels),
    ...(uiControl ? { uiControl } : {}),
    placeholderText: String(form.placeholderText ?? '').trim(),
    helpText: String(form.helpText ?? '').trim(),
    defaultValue: parseLooseValue(form.defaultValue),
    exampleValue: parseLooseValue(form.exampleValue),
    isNullable: Boolean(form.isNullable),
  }

  for (const field of ['displayOrder', 'minValue', 'maxValue', 'minLength', 'maxLength']) {
    const value = parseOptionalNumber(form[field])
    if (value !== undefined) payload[field] = value
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  )
}

function RuntimePathEditorField({ id, label, required = false, children }) {
  return (
    <div className="super-admin-runtime-path-registry-editor__field">
      <label className="super-admin-runtime-path-registry-editor__field-label" htmlFor={id}>
        {label}
        {required ? <span className="input-label__required"> *</span> : null}
      </label>
      {children}
    </div>
  )
}

function DependencySummary({ dependencyResponse, isLoading, error }) {
  const appError = error ? normalizeError(error) : null
  const dependencies = dependencyResponse?.data?.dependencies
  const summary = dependencies?.summary ?? {}
  const rows = Array.isArray(dependencies?.items) ? dependencies.items : []
  const columns = useMemo(
    () => [
      { key: 'sourceType', label: 'Source Type', mobileLabel: 'Source Type' },
      { key: 'sourceLabel', label: 'Source', mobileLabel: 'Source' },
      { key: 'field', label: 'Field', mobileLabel: 'Field', render: (value) => value || '--' },
      { key: 'usage', label: 'Usage', mobileLabel: 'Usage', render: (value) => value || '--' },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        render: (value) => {
          const status = String(value ?? '').trim().toUpperCase()
          if (!status) return '--'
          return (
            <Badge variant={status === 'ACTIVE' ? 'danger' : 'neutral'} size="sm" pill outline>
              {status}
            </Badge>
          )
        },
      },
    ],
    [],
  )

  if (isLoading) {
    return (
      <div className="super-admin-runtime-path-registry-editor__loading-inline">
        <Spinner size="sm" />
        <span>Loading dependencies...</span>
      </div>
    )
  }

  if (appError) {
    return <p className="super-admin-runtime-path-registry-editor__error" role="alert">{appError.message}</p>
  }

  return (
    <div className="super-admin-runtime-path-registry-editor__dependency-panel">
      <div className="super-admin-runtime-path-registry-editor__summary-grid" aria-label="Dependency summary">
        <span><strong>{Number(summary.skills) || 0}</strong> Skills</span>
        <span><strong>{Number(summary.agents) || 0}</strong> Agents</span>
        <span><strong>{Number(summary.workflowPolicies) || 0}</strong> Policies</span>
        <span><strong>{Number(summary.validations) || 0}</strong> Validations</span>
        <span><strong>{Number(summary.active) || 0}</strong> Active refs</span>
      </div>
      <HorizontalScroll ariaLabel="Runtime path dependency table">
        <Table
          columns={columns}
          data={rows}
          emptyMessage="No dependencies found."
          ariaLabel="Runtime path dependencies"
          size="compact"
        />
      </HorizontalScroll>
    </div>
  )
}

function SuperAdminRuntimePathRegistryEditor() {
  const navigate = useNavigate()
  const { pathId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { addToast } = useToaster()
  const cloneFrom = String(searchParams.get('cloneFrom') ?? searchParams.get('duplicateFrom') ?? '').trim()
  const isEditMode = Boolean(pathId)
  const isCloneMode = !isEditMode && Boolean(cloneFrom)

  const [form, setForm] = useState(INITIAL_FORM)
  const [pendingFrameworkKey, setPendingFrameworkKey] = useState('')
  const [errors, setErrors] = useState({})
  const [errorsSource, setErrorsSource] = useState(null)

  const {
    data: runtimePathResponse,
    isLoading: isRuntimePathLoading,
    error: runtimePathError,
  } = useGetRuntimePathQuery(pathId, { skip: !isEditMode })

  const {
    data: cloneSourceResponse,
    isLoading: isCloneSourceLoading,
    error: cloneSourceError,
  } = useGetRuntimePathQuery(cloneFrom, { skip: !isCloneMode })

  const {
    data: dependencyResponse,
    isLoading: isDependencyLoading,
    error: dependencyError,
  } = useGetRuntimePathDependenciesQuery(pathId, { skip: !isEditMode })

  const { data: frameworkResponse, error: frameworkError } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
    status: 'ACTIVE',
    type: '',
    structureType: '',
  })

  const [createRuntimePath, { isLoading: isCreating }] = useCreateRuntimePathMutation()
  const [updateRuntimePath, { isLoading: isUpdating }] = useUpdateRuntimePathMutation()
  const [cloneRuntimePath, { isLoading: isCloning }] = useCloneRuntimePathMutation()

  const loadedRuntimePath = runtimePathResponse?.data ?? null
  const cloneSource = cloneSourceResponse?.data ?? null
  const runtimePathAppError = runtimePathError ? normalizeError(runtimePathError) : null
  const cloneSourceAppError = cloneSourceError ? normalizeError(cloneSourceError) : null
  const frameworkAppError = frameworkError ? normalizeError(frameworkError) : null
  const isLoading = isRuntimePathLoading || isCloneSourceLoading
  const isSaving = isCreating || isUpdating || isCloning
  const isLockedRecord = isEditMode && Boolean(loadedRuntimePath?.isLocked)
  const readOnlySourceFields = isCloneMode || isLockedRecord
  const currentRuntimePathJson = useMemo(
    () => (loadedRuntimePath ? formatRecordJson(loadedRuntimePath) : ''),
    [loadedRuntimePath],
  )

  useEffect(() => {
    if (!isEditMode || !loadedRuntimePath) return undefined

    const timeoutId = window.setTimeout(() => {
      setForm(mapRuntimePathToForm(loadedRuntimePath))
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [isEditMode, loadedRuntimePath])

  useEffect(() => {
    if (!isCloneMode || !cloneSource) return undefined

    const timeoutId = window.setTimeout(() => {
      setForm(mapRuntimePathToForm(cloneSource, { clone: true }))
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [cloneSource, isCloneMode])

  const frameworkRows = useMemo(() => {
    const data = frameworkResponse?.data
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data)) return data
    return []
  }, [frameworkResponse])

  const selectedFrameworkKeys = useMemo(
    () => normalizeList(form.frameworkKeys, { upper: true }),
    [form.frameworkKeys],
  )

  const frameworkOptions = useMemo(() => {
    const selected = new Set(selectedFrameworkKeys)
    return frameworkRows
      .map((row) => String(row?.frameworkKey ?? row?.key ?? '').trim().toUpperCase())
      .filter(Boolean)
      .filter((frameworkKey, index, values) => values.indexOf(frameworkKey) === index)
      .filter((frameworkKey) => !selected.has(frameworkKey))
      .sort()
      .map((frameworkKey) => ({ label: frameworkKey, value: frameworkKey }))
  }, [frameworkRows, selectedFrameworkKeys])

  const handleBack = useCallback(() => {
    navigate('/super-admin/runtime-control/runtime-paths')
  }, [navigate])

  const handleCloneCurrent = useCallback(() => {
    const sourceId = loadedRuntimePath?.id ?? pathId
    if (!sourceId) return
    navigate(`/super-admin/runtime-control/runtime-paths/new?cloneFrom=${encodeURIComponent(sourceId)}`)
  }, [loadedRuntimePath?.id, navigate, pathId])

  const updateForm = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }, [])

  const toggleOperation = useCallback((operation, checked) => {
    setForm((current) => {
      const currentOperations = normalizeList(current.allowedOperations, { upper: true })
      const nextOperations = checked
        ? normalizeList([...currentOperations, operation], { upper: true })
        : currentOperations.filter((value) => value !== operation)

      return { ...current, allowedOperations: nextOperations }
    })
  }, [])

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault()

    if (isLockedRecord) {
      addToast({
        variant: 'warning',
        title: 'Runtime path locked',
        description: 'Clone this runtime path before making changes.',
      })
      return
    }

    const clientErrors = validateForm(form, { isEditMode })
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      setErrorsSource('client')
      return
    }

    let payload
    try {
      payload = buildPayload(form, {
        includePathKey: !isEditMode,
        includeLifecycleStatus: !isEditMode,
      })
    } catch (err) {
      setErrors({ allowedValueLabels: err.message || 'Invalid JSON object.' })
      setErrorsSource('client')
      return
    }

    try {
      let response
      if (isEditMode) {
        response = await updateRuntimePath({ pathId, ...payload }).unwrap()
        addToast({
          variant: 'success',
          title: 'Saved',
          description: `Updated ${response?.data?.pathKey ?? 'runtime path'}.`,
        })
      } else if (isCloneMode) {
        response = await cloneRuntimePath({
          pathId: cloneFrom,
          pathKey: payload.pathKey,
          label: payload.label,
          description: payload.description,
        }).unwrap()
        addToast({
          variant: 'success',
          title: 'Runtime path cloned',
          description: `${response?.data?.pathKey ?? 'Runtime path'} is ready for review.`,
        })
      } else {
        response = await createRuntimePath(payload).unwrap()
        addToast({
          variant: 'success',
          title: 'Runtime path created',
          description: `${response?.data?.pathKey ?? 'Runtime path'} is ready for review.`,
        })
      }

      setErrors({})
      setErrorsSource(null)
      const nextId = response?.data?.id
      if (nextId) {
        navigate(`/super-admin/runtime-control/runtime-paths/${nextId}/edit`)
      }
    } catch (err) {
      const appErr = normalizeError(err)
      const details = appErr?.details
      const fieldErrors = getRuntimeControlFieldErrorMap(appErr, RUNTIME_PATH_REGISTRY_FORM_ERROR_FIELDS)
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
    cloneRuntimePath,
    createRuntimePath,
    form,
    isCloneMode,
    isEditMode,
    isLockedRecord,
    navigate,
    pathId,
    updateRuntimePath,
  ])

  const pageTitle = isEditMode
    ? 'Edit Runtime Path'
    : isCloneMode
      ? 'Clone Runtime Path'
      : 'Create Runtime Path'
  const pathError = runtimePathAppError || cloneSourceAppError
  const loadedComponentVersion = Number(loadedRuntimePath?.componentVersion) || 1
  const loadedVersionStatus = loadedRuntimePath?.versionStatus
  const lockedByPackageKeys = Array.isArray(loadedRuntimePath?.lockedByPackageKeys)
    ? loadedRuntimePath.lockedByPackageKeys.filter(Boolean)
    : []
  const tabErrorCounts = {
    frameworkCompatibility: countErrorsForFields(errors, ['frameworkKeys', 'allowedOperations']),
    schemaUi: countErrorsForFields(errors, [
      'scope',
      'dataType',
      'category',
      'sourceType',
      'displayOrder',
      'allowedValues',
      'allowedValueLabels',
      'uiControl',
      'minValue',
      'maxValue',
      'minLength',
      'maxLength',
      'regexPattern',
    ]),
    dependencies: 0,
    jsonNotes: countErrorsForFields(errors, ['defaultValue', 'exampleValue', 'replacementPathKey', 'notes']),
  }

  return (
    <section className="super-admin-runtime-path-registry container" aria-label="Runtime path editor">
      <header className="super-admin-runtime-path-registry__header">
        <h1 className="super-admin-runtime-path-registry__title">{pageTitle}</h1>
        <p className="super-admin-runtime-path-registry__subtitle">
          Maintain governed state addresses used by skills, agents, validations, and workflow policies.
        </p>
      </header>

      <Fieldset className="super-admin-runtime-path-registry__fieldset">
        <Fieldset.Legend className="sr-only">Runtime path editor</Fieldset.Legend>
        <Card variant="elevated" className="super-admin-runtime-path-registry__card">
          <Card.Body className="super-admin-runtime-path-registry-editor__card-body">
            <div className="super-admin-runtime-path-registry-editor__top-actions">
              <Button type="button" variant="outline" size="sm" onClick={handleBack}>
                Back
              </Button>
            </div>

            {isLoading ? (
              <div className="super-admin-runtime-path-registry-editor__loading">
                <Spinner size="lg" />
                <p>{isEditMode ? 'Loading runtime path...' : 'Loading clone source...'}</p>
              </div>
            ) : null}

            {pathError ? (
              <p className="super-admin-runtime-path-registry-editor__error" role="alert">
                {pathError.message}
              </p>
            ) : null}

            {!isLoading && !pathError ? (
              <form
                className="super-admin-runtime-path-registry-editor__form"
                onSubmit={handleSubmit}
                aria-label="Runtime path form"
                noValidate
              >
                <div className="super-admin-runtime-path-registry-editor__status-strip">
                  <Status size="sm" showIcon variant={getRuntimePathRegistryStatusVariant(form.status)}>
                    {formatRuntimePathRegistryStatus(form.status)}
                  </Status>
                  {isEditMode ? (
                    <>
                      <Badge variant="neutral" size="sm" pill outline>v{loadedComponentVersion}</Badge>
                      {loadedVersionStatus ? (
                        <Status size="sm" showIcon variant={getRuntimeControlVersionStatusVariant(loadedVersionStatus)}>
                          {formatRuntimeControlVersionStatus(loadedVersionStatus)}
                        </Status>
                      ) : null}
                    </>
                  ) : null}
                  {isEditMode && loadedRuntimePath?.isSystem ? (
                    <Badge variant="info" size="sm" pill outline>System</Badge>
                  ) : (
                    <Badge variant="neutral" size="sm" pill outline>Extension</Badge>
                  )}
                  {isCloneMode ? (
                    <Badge variant="warning" size="sm" pill outline>Source Fields Locked</Badge>
                  ) : null}
                  {isLockedRecord ? (
                    <Badge variant="warning" size="sm" pill outline>Locked</Badge>
                  ) : null}
                </div>

                {isLockedRecord ? (
                  <div className="super-admin-runtime-path-registry-editor__lock-notice" role="status">
                    <div className="super-admin-runtime-path-registry-editor__lock-copy">
                      <strong>Locked by validated package usage.</strong>
                      <span>Clone this runtime path to make behavior changes.</span>
                    </div>
                    {lockedByPackageKeys.length > 0 ? (
                      <div className="super-admin-runtime-path-registry-editor__lock-packages" aria-label="Locked by packages">
                        {lockedByPackageKeys.map((packageKey) => (
                          <Badge key={packageKey} variant="neutral" size="sm" pill outline>{packageKey}</Badge>
                        ))}
                      </div>
                    ) : null}
                    <Button type="button" variant="primary" size="sm" onClick={handleCloneCurrent}>
                      Clone
                    </Button>
                  </div>
                ) : null}

                <div className="super-admin-runtime-path-registry-editor__section">
                  <div className="super-admin-runtime-path-registry-editor__section-header">
                    <h2 className="super-admin-runtime-path-registry-editor__section-title">Basic Information</h2>
                    <p className="super-admin-runtime-path-registry-editor__section-copy">
                      Define the runtime path identity that skills, agents, validations, and workflow policies reference.
                    </p>
                  </div>

                  <div className="super-admin-runtime-path-registry-editor__identity-row">
                    <RuntimePathEditorField id="runtime-path-editor-path-key" label="Path Key" required={!isEditMode}>
                      <Input
                        id="runtime-path-editor-path-key"
                        value={form.pathKey}
                        placeholder={!isEditMode ? 'framework_state.lifecycle.stage' : undefined}
                        onChange={(event) => updateForm('pathKey', event.target.value)}
                        error={errors.pathKey}
                        helperText={isEditMode ? 'Path key is immutable after creation.' : 'No whitespace, e.g. framework_state.lifecycle.stage.'}
                        disabled={isEditMode}
                        required={!isEditMode}
                        fullWidth
                      />
                    </RuntimePathEditorField>
                    <RuntimePathEditorField id="runtime-path-editor-label" label="Label" required>
                      <Input
                        id="runtime-path-editor-label"
                        value={form.label}
                        onChange={(event) => updateForm('label', event.target.value)}
                        error={errors.label}
                        disabled={isLockedRecord}
                        required
                        fullWidth
                      />
                    </RuntimePathEditorField>
                    <RuntimePathEditorField id="runtime-path-editor-status" label="Status" required={!isEditMode}>
                      <Select
                        id="runtime-path-editor-status"
                        value={form.status}
                        options={RUNTIME_PATH_REGISTRY_STATUS_OPTIONS.filter((option) => option.value)}
                        onChange={(event) => updateForm('status', event.target.value)}
                        error={errors.status}
                        helperText={
                          isEditMode
                            ? 'Use catalogue lifecycle actions for status changes.'
                            : isCloneMode
                              ? 'Cloned runtime paths always start as DRAFT.'
                              : undefined
                        }
                        disabled={isEditMode || isCloneMode}
                      />
                    </RuntimePathEditorField>
                  </div>

                  <RuntimePathEditorField id="runtime-path-editor-description" label="Description" required>
                    <Textarea
                      id="runtime-path-editor-description"
                      value={form.description}
                      onChange={(event) => updateForm('description', event.target.value)}
                      error={errors.description}
                      rows={4}
                      disabled={isLockedRecord}
                      required
                      fullWidth
                    />
                  </RuntimePathEditorField>

                  <div className="super-admin-runtime-path-registry-editor__toggle-row">
                    <Tickbox
                      id="runtime-path-editor-protected"
                      label="Protected write guard"
                      checked={Boolean(form.isProtected)}
                      onChange={(event) => updateForm('isProtected', event.target.checked)}
                      disabled={readOnlySourceFields}
                    />
                    <Tickbox
                      id="runtime-path-editor-system"
                      label="System managed"
                      checked={Boolean(form.isSystem)}
                      onChange={(event) => updateForm('isSystem', event.target.checked)}
                      disabled={readOnlySourceFields}
                    />
                  </div>
                </div>

                <TabView
                  variant="pills"
                  size="sm"
                  evenTabs
                  className="super-admin-runtime-path-registry-editor__tabs"
                  aria-label="Runtime path editor sections"
                >
                  <TabView.Tab label={renderTabLabel('Framework Compatibility', tabErrorCounts.frameworkCompatibility)}>
                    <div className="super-admin-runtime-path-registry-editor__section">
                      <div className="super-admin-runtime-path-registry-editor__section-header">
                        <h2 className="super-admin-runtime-path-registry-editor__section-title">Framework Compatibility</h2>
                        <p className="super-admin-runtime-path-registry-editor__section-copy">
                          Keep framework support and operation permissions aligned to governed Runtime Control usage.
                        </p>
                      </div>
                      <div className="super-admin-runtime-path-registry-editor__framework-controls">
                        <RuntimePathEditorField id="runtime-path-editor-framework" label="Add Framework">
                          <Select
                            id="runtime-path-editor-framework"
                            value={pendingFrameworkKey}
                            options={[{ label: 'Select...', value: '' }, ...frameworkOptions]}
                            onChange={(event) => setPendingFrameworkKey(event.target.value)}
                            helperText={frameworkAppError ? `Failed to load frameworks: ${frameworkAppError.message}` : undefined}
                            disabled={readOnlySourceFields || frameworkOptions.length === 0}
                          />
                        </RuntimePathEditorField>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="super-admin-runtime-path-registry-editor__framework-add-button"
                          disabled={!pendingFrameworkKey || readOnlySourceFields}
                          onClick={() => {
                            const frameworkKey = String(pendingFrameworkKey ?? '').trim().toUpperCase()
                            if (!frameworkKey) return
                            setForm((current) => ({
                              ...current,
                              frameworkKeys: normalizeList([...current.frameworkKeys, frameworkKey], { upper: true }),
                            }))
                            setPendingFrameworkKey('')
                          }}
                        >
                          Add Framework
                        </Button>
                      </div>
                      <div className="super-admin-runtime-path-registry-editor__pill-list">
                        {selectedFrameworkKeys.map((frameworkKey) => (
                          <span key={frameworkKey} className="super-admin-runtime-path-registry-editor__pill-item">
                            <Badge variant="neutral" size="sm" pill>{frameworkKey}</Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={readOnlySourceFields}
                              onClick={() => setForm((current) => ({
                                ...current,
                                frameworkKeys: selectedFrameworkKeys.filter((value) => value !== frameworkKey),
                              }))}
                            >
                              Remove
                            </Button>
                          </span>
                        ))}
                      </div>
                      {errors.frameworkKeys ? (
                        <p className="super-admin-runtime-path-registry-editor__error" role="alert">{errors.frameworkKeys}</p>
                      ) : null}

                      <div className="super-admin-runtime-path-registry-editor__operation-grid">
                        {RUNTIME_PATH_REGISTRY_FORM_OPERATION_OPTIONS.map((option) => (
                          <Tickbox
                            key={option.value}
                            id={`runtime-path-editor-operation-${option.value.toLowerCase()}`}
                            label={option.label}
                            checked={form.allowedOperations.includes(option.value)}
                            onChange={(event) => toggleOperation(option.value, event.target.checked)}
                            disabled={readOnlySourceFields}
                          />
                        ))}
                      </div>
                      {errors.allowedOperations ? (
                        <p className="super-admin-runtime-path-registry-editor__error" role="alert">{errors.allowedOperations}</p>
                      ) : null}

                      <div className="super-admin-runtime-path-registry-editor__row">
                        <RuntimePathEditorField id="runtime-path-editor-introduced" label="Introduced Version">
                          <Input
                            id="runtime-path-editor-introduced"
                            value={form.introducedInVersion}
                            onChange={(event) => updateForm('introducedInVersion', event.target.value)}
                            disabled={readOnlySourceFields}
                            fullWidth
                          />
                        </RuntimePathEditorField>
                        <RuntimePathEditorField id="runtime-path-editor-deprecated" label="Deprecated Version">
                          <Input
                            id="runtime-path-editor-deprecated"
                            value={form.deprecatedInVersion}
                            onChange={(event) => updateForm('deprecatedInVersion', event.target.value)}
                            disabled={readOnlySourceFields}
                            fullWidth
                          />
                        </RuntimePathEditorField>
                      </div>
                      <RuntimePathEditorField id="runtime-path-editor-compatibility-tags" label="Compatibility Tags">
                        <Textarea
                          id="runtime-path-editor-compatibility-tags"
                          value={form.compatibilityTags}
                          onChange={(event) => updateForm('compatibilityTags', event.target.value)}
                          helperText="Comma or newline separated."
                          rows={3}
                          disabled={readOnlySourceFields}
                          fullWidth
                        />
                      </RuntimePathEditorField>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Schema & UI', tabErrorCounts.schemaUi)}>
                    <div className="super-admin-runtime-path-registry-editor__section">
                      <div className="super-admin-runtime-path-registry-editor__section-header">
                        <h2 className="super-admin-runtime-path-registry-editor__section-title">Schema & UI</h2>
                        <p className="super-admin-runtime-path-registry-editor__section-copy">
                          Define data shape, source metadata, and optional value-entry controls.
                        </p>
                      </div>

                      <div className="super-admin-runtime-path-registry-editor__row">
                        <RuntimePathEditorField id="runtime-path-editor-scope" label="Scope" required>
                          <Select id="runtime-path-editor-scope" value={form.scope} options={RUNTIME_PATH_REGISTRY_SCOPE_OPTIONS} onChange={(event) => updateForm('scope', event.target.value)} disabled={readOnlySourceFields} />
                        </RuntimePathEditorField>
                        <RuntimePathEditorField id="runtime-path-editor-data-type" label="Data Type" required>
                          <Select id="runtime-path-editor-data-type" value={form.dataType} options={RUNTIME_PATH_REGISTRY_DATA_TYPE_OPTIONS} onChange={(event) => updateForm('dataType', event.target.value)} disabled={readOnlySourceFields} />
                        </RuntimePathEditorField>
                      </div>
                      <div className="super-admin-runtime-path-registry-editor__row">
                        <RuntimePathEditorField id="runtime-path-editor-category" label="Category" required>
                          <Select id="runtime-path-editor-category" value={form.category} options={RUNTIME_PATH_REGISTRY_CATEGORY_OPTIONS} onChange={(event) => updateForm('category', event.target.value)} disabled={readOnlySourceFields} />
                        </RuntimePathEditorField>
                        <RuntimePathEditorField id="runtime-path-editor-source-type" label="Source Type" required>
                          <Select id="runtime-path-editor-source-type" value={form.sourceType} options={RUNTIME_PATH_REGISTRY_SOURCE_TYPE_OPTIONS} onChange={(event) => updateForm('sourceType', event.target.value)} disabled={readOnlySourceFields} />
                        </RuntimePathEditorField>
                      </div>
                      <RuntimePathEditorField id="runtime-path-editor-ui-control" label="UI Control">
                        <Select
                          id="runtime-path-editor-ui-control"
                          value={form.uiControl}
                          options={RUNTIME_PATH_REGISTRY_UI_CONTROL_OPTIONS}
                          onChange={(event) => updateForm('uiControl', event.target.value)}
                          error={errors.uiControl}
                          disabled={readOnlySourceFields}
                        />
                      </RuntimePathEditorField>
                      <div className="super-admin-runtime-path-registry-editor__row">
                        <RuntimePathEditorField id="runtime-path-editor-placeholder" label="Placeholder Text">
                          <Input id="runtime-path-editor-placeholder" value={form.placeholderText} onChange={(event) => updateForm('placeholderText', event.target.value)} disabled={readOnlySourceFields} fullWidth />
                        </RuntimePathEditorField>
                        <RuntimePathEditorField id="runtime-path-editor-display-order" label="Display Order">
                          <Input id="runtime-path-editor-display-order" type="number" value={form.displayOrder} onChange={(event) => updateForm('displayOrder', event.target.value)} error={errors.displayOrder} disabled={readOnlySourceFields} fullWidth />
                        </RuntimePathEditorField>
                      </div>
                      <RuntimePathEditorField id="runtime-path-editor-help-text" label="Help Text">
                        <Textarea id="runtime-path-editor-help-text" value={form.helpText} onChange={(event) => updateForm('helpText', event.target.value)} rows={3} disabled={readOnlySourceFields} fullWidth />
                      </RuntimePathEditorField>
                      <RuntimePathEditorField id="runtime-path-editor-allowed-values" label="Allowed Values">
                        <Textarea id="runtime-path-editor-allowed-values" value={form.allowedValues} onChange={(event) => updateForm('allowedValues', event.target.value)} helperText="Comma or newline separated. Required for SELECT." rows={3} disabled={readOnlySourceFields} fullWidth />
                      </RuntimePathEditorField>
                      <RuntimePathEditorField id="runtime-path-editor-allowed-labels" label="Allowed Value Labels JSON">
                        <Textarea id="runtime-path-editor-allowed-labels" value={form.allowedValueLabels} onChange={(event) => updateForm('allowedValueLabels', event.target.value)} error={errors.allowedValueLabels} helperText='Optional JSON object, e.g. {"DRAFT":"Draft"}.' rows={4} disabled={readOnlySourceFields} fullWidth />
                      </RuntimePathEditorField>
                      <div className="super-admin-runtime-path-registry-editor__row">
                        <RuntimePathEditorField id="runtime-path-editor-min-value" label="Min Value">
                          <Input id="runtime-path-editor-min-value" value={form.minValue} onChange={(event) => updateForm('minValue', event.target.value)} error={errors.minValue} disabled={readOnlySourceFields} fullWidth />
                        </RuntimePathEditorField>
                        <RuntimePathEditorField id="runtime-path-editor-max-value" label="Max Value">
                          <Input id="runtime-path-editor-max-value" value={form.maxValue} onChange={(event) => updateForm('maxValue', event.target.value)} error={errors.maxValue} disabled={readOnlySourceFields} fullWidth />
                        </RuntimePathEditorField>
                      </div>
                      <div className="super-admin-runtime-path-registry-editor__row">
                        <RuntimePathEditorField id="runtime-path-editor-min-length" label="Min Length">
                          <Input id="runtime-path-editor-min-length" value={form.minLength} onChange={(event) => updateForm('minLength', event.target.value)} error={errors.minLength} disabled={readOnlySourceFields} fullWidth />
                        </RuntimePathEditorField>
                        <RuntimePathEditorField id="runtime-path-editor-max-length" label="Max Length">
                          <Input id="runtime-path-editor-max-length" value={form.maxLength} onChange={(event) => updateForm('maxLength', event.target.value)} error={errors.maxLength} disabled={readOnlySourceFields} fullWidth />
                        </RuntimePathEditorField>
                      </div>
                      <RuntimePathEditorField id="runtime-path-editor-regex" label="Regex Pattern">
                        <Input
                          id="runtime-path-editor-regex"
                          value={form.regexPattern}
                          onChange={(event) => updateForm('regexPattern', event.target.value)}
                          helperText="Use simple anchored patterns where possible; complex backtracking patterns can slow validation."
                          disabled={readOnlySourceFields}
                          fullWidth
                        />
                      </RuntimePathEditorField>
                      <Tickbox id="runtime-path-editor-nullable" label="Nullable value" checked={Boolean(form.isNullable)} onChange={(event) => updateForm('isNullable', event.target.checked)} disabled={readOnlySourceFields} />
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Dependencies', tabErrorCounts.dependencies)}>
                    <div className="super-admin-runtime-path-registry-editor__section">
                      <div className="super-admin-runtime-path-registry-editor__section-header">
                        <h2 className="super-admin-runtime-path-registry-editor__section-title">Dependencies</h2>
                        <p className="super-admin-runtime-path-registry-editor__section-copy">
                          Review runtime resources that currently reference this path.
                        </p>
                      </div>

                      {isEditMode ? (
                        <DependencySummary
                          dependencyResponse={dependencyResponse}
                          isLoading={isDependencyLoading}
                          error={dependencyError}
                        />
                      ) : (
                        <p className="super-admin-runtime-path-registry-editor__helper">
                          Dependencies are available after the runtime path has been created.
                        </p>
                      )}
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('JSON & Notes', tabErrorCounts.jsonNotes)}>
                    <div className="super-admin-runtime-path-registry-editor__section">
                      <div className="super-admin-runtime-path-registry-editor__section-header">
                        <h2 className="super-admin-runtime-path-registry-editor__section-title">JSON & Notes</h2>
                        <p className="super-admin-runtime-path-registry-editor__section-copy">
                          Capture examples, defaults, replacement guidance, and implementation notes.
                        </p>
                      </div>

                      <RuntimePathEditorField id="runtime-path-editor-example" label="Example Value">
                        <Textarea
                          id="runtime-path-editor-example"
                          value={form.exampleValue}
                          onChange={(event) => updateForm('exampleValue', event.target.value)}
                          helperText="JSON values are parsed when valid; plain strings are saved as strings."
                          rows={5}
                          disabled={readOnlySourceFields}
                          fullWidth
                        />
                      </RuntimePathEditorField>
                      <RuntimePathEditorField id="runtime-path-editor-default" label="Default Value">
                        <Textarea
                          id="runtime-path-editor-default"
                          value={form.defaultValue}
                          onChange={(event) => updateForm('defaultValue', event.target.value)}
                          helperText="Leave blank when no default should be stored."
                          rows={5}
                          disabled={readOnlySourceFields}
                          fullWidth
                        />
                      </RuntimePathEditorField>
                      <RuntimePathEditorField id="runtime-path-editor-replacement" label="Replacement Path Key">
                        <Input
                          id="runtime-path-editor-replacement"
                          value={form.replacementPathKey}
                          onChange={(event) => updateForm('replacementPathKey', event.target.value)}
                          disabled={readOnlySourceFields}
                          fullWidth
                        />
                      </RuntimePathEditorField>
                      <RuntimePathEditorField id="runtime-path-editor-notes" label="Notes">
                        <Textarea
                          id="runtime-path-editor-notes"
                          value={form.notes}
                          onChange={(event) => updateForm('notes', event.target.value)}
                          rows={4}
                          disabled={readOnlySourceFields}
                          fullWidth
                        />
                      </RuntimePathEditorField>
                      {isEditMode && loadedRuntimePath ? (
                        <RuntimePathEditorField id="runtime-path-editor-current-json" label="Current Record JSON">
                          <pre
                            id="runtime-path-editor-current-json"
                            className="super-admin-runtime-path-registry-editor__json-preview"
                            aria-label="Current runtime path record JSON"
                          >
                            {currentRuntimePathJson}
                          </pre>
                          <p className="super-admin-runtime-path-registry-editor__helper">
                            Read-only persisted record from the API, including stableId, timestamps, and system metadata.
                          </p>
                        </RuntimePathEditorField>
                      ) : null}
                    </div>
                  </TabView.Tab>
                </TabView>

                {errorsSource === 'server' && Object.keys(errors).length > 0 ? (
                  <p className="super-admin-runtime-path-registry-editor__error" role="alert">
                    Review the server validation errors and try again.
                  </p>
                ) : null}

                {isCloneMode ? (
                  <p className="super-admin-runtime-path-registry-editor__helper">
                    Clone mode uses the source path metadata and only submits the new path key, label, and description. The clone always starts as DRAFT.
                  </p>
                ) : null}

                <div className="super-admin-runtime-path-registry-editor__footer-actions">
                  <Button type="button" variant="outline" size="sm" onClick={handleBack} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" loading={isSaving} disabled={isLockedRecord}>
                    {isEditMode ? 'Save Changes' : isCloneMode ? 'Clone Path' : 'Create Path'}
                  </Button>
                </div>
              </form>
            ) : null}
          </Card.Body>
        </Card>
      </Fieldset>
    </section>
  )
}

export default SuperAdminRuntimePathRegistryEditor
