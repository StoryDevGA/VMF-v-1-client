import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  useGetValidationRegistryQuery,
  useLazyGetValidationRegistryDependenciesQuery,
  useListFrameworkRegistriesQuery,
  useListRuntimeSkillsQuery,
  useUpdateValidationRegistryMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  VALIDATION_REGISTRY_CATEGORIES,
  VALIDATION_REGISTRY_CATEGORY_OPTIONS,
  VALIDATION_REGISTRY_SEVERITY_OPTIONS,
  VALIDATION_REGISTRY_STATUS_OPTIONS,
  VALIDATION_REGISTRY_STATUSES,
} from '../SuperAdminValidationRegistry/superAdminValidationRegistry.constants.js'
import '../SuperAdminValidationRegistry/ValidationRegistryListView.css'
import './SuperAdminValidationRegistryEditor.css'

const KEY_REGEX = /^[a-z][a-z0-9-]*$/

const INITIAL_FORM = Object.freeze({
  key: '',
  label: '',
  description: '',
  status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
  supportedFrameworkKeys: [],
  category: VALIDATION_REGISTRY_CATEGORIES.COMPLETENESS,
  severity: 'BLOCKING',
  producerSkillId: '',
  outputPath: '',
  passFieldPath: '',
  detailsFieldPath: '',
  policyUsable: true,
  packageUsable: true,
  freshnessDefaultMinutes: 30,
  blockingDefault: true,
  warningOnlyDefault: false,
})

const shallowEqualObject = (left, right) => {
  if (left === right) return true
  if (!left || !right) return false
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key) => left[key] === right[key])
}

const normalizeFrameworkKeys = (values) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value ?? '').trim().toUpperCase())
    .filter(Boolean))]

const formStateReducer = (state, action) => {
  if (action?.type !== 'apply') return state
  return typeof action.updater === 'function' ? action.updater(state) : action.updater
}

const validateForm = (form, { isEditMode } = {}) => {
  const errors = {}

  const key = String(form.key ?? '').trim().toLowerCase()
  if (!isEditMode) {
    if (!key) {
      errors.key = 'Key is required.'
    } else if (!KEY_REGEX.test(key)) {
      errors.key = 'Key must use lowercase letters, numbers, or hyphens.'
    }
  }

  if (!String(form.label ?? '').trim()) {
    errors.label = 'Label is required.'
  }

  if (!String(form.description ?? '').trim()) {
    errors.description = 'Description is required.'
  }

  const frameworks = normalizeFrameworkKeys(form.supportedFrameworkKeys)
  if (frameworks.length === 0) {
    errors.supportedFrameworkKeys = 'Select at least one supported framework.'
  }

  if (!String(form.category ?? '').trim()) {
    errors.category = 'Category is required.'
  }

  if (!String(form.severity ?? '').trim()) {
    errors.severity = 'Severity is required.'
  }

  if (!String(form.producerSkillId ?? '').trim()) {
    errors.producerSkillId = 'Producer skill is required.'
  }

  if (!String(form.outputPath ?? '').trim()) {
    errors.outputPath = 'Output Path is required.'
  }

  const outputPath = String(form.outputPath ?? '').trim()
  const passFieldPath = String(form.passFieldPath ?? '').trim()
  const detailsFieldPath = String(form.detailsFieldPath ?? '').trim()

  if (outputPath && passFieldPath && !passFieldPath.startsWith(`${outputPath}.`)) {
    errors.passFieldPath = 'Pass Field Path must be inside the selected Output Path.'
  }

  if (outputPath && detailsFieldPath && !detailsFieldPath.startsWith(`${outputPath}.`)) {
    errors.detailsFieldPath = 'Details Field Path must be inside the selected Output Path.'
  }

  const blockingDefault = Boolean(form.blockingDefault)
  const warningOnlyDefault = Boolean(form.warningOnlyDefault)
  if (blockingDefault && warningOnlyDefault) {
    errors.warningOnlyDefault = 'Blocking Default and Warning Only Default cannot both be true.'
  }

  const freshness = Number(form.freshnessDefaultMinutes)
  if (!Number.isInteger(freshness) || freshness < 0) {
    errors.freshnessDefaultMinutes = 'Freshness Default Minutes must be zero or a positive whole number.'
  }

  return errors
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
  const isEditMode = Boolean(validationId)

  const [form, dispatchForm] = useReducer(formStateReducer, INITIAL_FORM)
  const [pendingFrameworkKey, setPendingFrameworkKey] = useState('')
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

  const loadedValidation = validationResponse?.data ?? null
  const validationAppError = validationError ? normalizeError(validationError) : null

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
    frameworkKey: '',
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

  const [createValidation, { isLoading: isCreating }] = useCreateValidationRegistryMutation()
  const [updateValidation, { isLoading: isUpdating }] = useUpdateValidationRegistryMutation()
  const [fetchDependencies] = useLazyGetValidationRegistryDependenciesQuery()

  const isSaving = isCreating || isUpdating

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
        severity: loadedValidation.severity ?? 'BLOCKING',
        producerSkillId: loadedValidation.producerSkillId ?? '',
        outputPath: loadedValidation.outputPath ?? '',
        passFieldPath: loadedValidation.passFieldPath ?? '',
        detailsFieldPath: loadedValidation.detailsFieldPath ?? '',
        policyUsable: loadedValidation.policyUsable !== undefined ? Boolean(loadedValidation.policyUsable) : true,
        packageUsable: loadedValidation.packageUsable !== undefined ? Boolean(loadedValidation.packageUsable) : true,
        freshnessDefaultMinutes: Number(loadedValidation.freshnessDefaultMinutes ?? 30) || 30,
        blockingDefault: loadedValidation.blockingDefault !== undefined ? Boolean(loadedValidation.blockingDefault) : true,
        warningOnlyDefault: Boolean(loadedValidation.warningOnlyDefault),
      }

      return shallowEqualObject(current, next) ? current : next
    })
  }, [isEditMode, loadedValidation, setForm])

  const handleBack = useCallback(() => {
    navigate('/super-admin/runtime-control/validation-registry')
  }, [navigate])

  const submit = useCallback(async ({ bypassStatusWarning = false } = {}) => {
    const clientErrors = validateForm(form, { isEditMode })
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

    const payload = {
      ...(isEditMode ? {} : { key: String(form.key ?? '').trim().toLowerCase() }),
      label: String(form.label ?? '').trim(),
      description: String(form.description ?? '').trim(),
      status: nextStatus,
      supportedFrameworkKeys: normalizeFrameworkKeys(form.supportedFrameworkKeys),
      category: String(form.category ?? '').trim().toUpperCase(),
      severity: String(form.severity ?? '').trim().toUpperCase(),
      producerSkillId: String(form.producerSkillId ?? '').trim(),
      outputPath: String(form.outputPath ?? '').trim(),
      passFieldPath: String(form.passFieldPath ?? '').trim(),
      detailsFieldPath: String(form.detailsFieldPath ?? '').trim(),
      policyUsable: Boolean(form.policyUsable),
      packageUsable: Boolean(form.packageUsable),
      freshnessDefaultMinutes: Number(form.freshnessDefaultMinutes ?? 0),
      blockingDefault: Boolean(form.blockingDefault),
      warningOnlyDefault: Boolean(form.warningOnlyDefault),
    }

    try {
      if (isEditMode) {
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
      if (details && typeof details === 'object') {
        setErrors(details)
        setErrorsSource('server')
      } else {
        addToast({ variant: 'error', title: 'Save failed', description: appErr.message })
      }
    }
  }, [
    addToast,
    createValidation,
    fetchDependencies,
    form,
    isEditMode,
    loadedValidation,
    setForm,
    updateValidation,
    validationId,
  ])

  const closePending = useCallback(() => setPendingStatusWarning(null), [])
  const confirmPending = useCallback(async () => {
    if (!pendingStatusWarning?.nextStatus) return
    await submit({ bypassStatusWarning: true })
  }, [pendingStatusWarning, submit])

  const resolveSingle = (values) => (Array.isArray(values) && values.length > 0 ? values[0] : '')

  const isLoading = isEditMode ? (isValidationLoading && !loadedValidation) : false

  if (isLoading) {
    return <ValidationRegistryEditorLoadingState isEditMode={isEditMode} />
  }

  if (validationAppError && !loadedValidation && isEditMode) {
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

  const headline = isEditMode ? 'Edit Validation' : 'Create Validation'

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
            </div>

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
            </div>

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
              </div>

              <div className="super-admin-validation-registry-editor__row">
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

          {errorsSource === 'server' && Object.keys(errors).length > 0 ? (
            <p className="super-admin-validation-registry-editor__helper">
              Server validation returned {Object.keys(errors).length} field error{Object.keys(errors).length === 1 ? '' : 's'}.
            </p>
          ) : null}

            <div className="super-admin-validation-registry-editor__footer-actions">
              <Button type="button" variant="outline" size="sm" onClick={handleBack} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={isSaving}>
                {isEditMode ? 'Save Changes' : 'Create Validation'}
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
