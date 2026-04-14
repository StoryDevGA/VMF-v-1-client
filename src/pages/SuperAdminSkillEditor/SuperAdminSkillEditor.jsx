import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Textarea } from '../../components/Textarea'
import { useToaster } from '../../components/Toaster'
import {
  useCreateRuntimeSkillMutation,
  useGetRuntimeSkillQuery,
  useListFrameworkRegistriesQuery,
  useUpdateRuntimeSkillMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  buildFrameworkRegistryOptions,
  FRAMEWORK_REGISTRY_STATUSES,
} from '../SuperAdminFrameworkRegistry/superAdminFrameworkRegistry.constants.js'
import {
  INITIAL_RUNTIME_SKILL_FORM,
  formatKeyList,
  mapRuntimeSkillToForm,
  parseFrameworkKeyList,
  RUNTIME_SKILL_CATEGORY_OPTIONS,
  RUNTIME_SKILL_EXECUTION_MODE_OPTIONS,
  RUNTIME_SKILL_FORM_STATUS_OPTIONS,
  RUNTIME_SKILL_RETRY_POLICY_OPTIONS,
  RUNTIME_SKILL_TYPE_OPTIONS,
  validateRuntimeSkillForm,
} from '../SuperAdminSkills/superAdminSkills.constants.js'
import '../SuperAdminSkills/SuperAdminSkills.css'
import '../SuperAdminSkills/RuntimeSkillListView.css'
import './SuperAdminSkillEditor.css'

function SkillEditorSection({ title, copy, children, className = '' }) {
  const sectionClassName = ['super-admin-skill-editor__section', className].filter(Boolean).join(' ')

  return (
    <section className={sectionClassName}>
      <div className="super-admin-skill-editor__section-header">
        <h2 className="super-admin-skill-editor__section-title">{title}</h2>
        <p className="super-admin-skill-editor__section-copy">{copy}</p>
      </div>
      {children}
    </section>
  )
}

function FrameworkCompatibilityField({
  frameworkOptions,
  value,
  error,
  onChange,
}) {
  const [pendingFrameworkKey, setPendingFrameworkKey] = useState('')
  const selectedFrameworkKeys = useMemo(() => parseFrameworkKeyList(value), [value])

  const frameworkLabelLookup = useMemo(
    () => Object.fromEntries(frameworkOptions.map((option) => [option.value, option.label])),
    [frameworkOptions],
  )

  const availableFrameworkOptions = useMemo(() => {
    const selectedFrameworkKeySet = new Set(selectedFrameworkKeys)

    return frameworkOptions.filter(
      (option) => option.value && !selectedFrameworkKeySet.has(option.value),
    )
  }, [frameworkOptions, selectedFrameworkKeys])

  const handleAddFramework = () => {
    if (!pendingFrameworkKey) {
      return
    }

    onChange(formatKeyList([...selectedFrameworkKeys, pendingFrameworkKey]))
    setPendingFrameworkKey('')
  }

  const handleRemoveFramework = (frameworkKey) => {
    onChange(formatKeyList(selectedFrameworkKeys.filter((value) => value !== frameworkKey)))
  }

  return (
    <div className="super-admin-skill-editor__framework-picker">
      <div className="super-admin-skill-editor__framework-picker-controls">
        <Select
          id="runtime-skill-editor-framework-select"
          label="Add Framework"
          className="super-admin-skill-editor__select-field"
          value={pendingFrameworkKey}
          options={availableFrameworkOptions}
          onChange={(event) => setPendingFrameworkKey(event.target.value)}
          placeholder={availableFrameworkOptions.length > 0 ? 'Select a framework' : 'No frameworks available'}
          disabled={availableFrameworkOptions.length === 0}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="super-admin-skill-editor__framework-add-button"
          onClick={handleAddFramework}
          disabled={!pendingFrameworkKey}
        >
          Add Framework
        </Button>
      </div>

      <p className="super-admin-skill-editor__helper">
        Choose frameworks from the registry. Selected frameworks are stored using their canonical keys.
      </p>

      {selectedFrameworkKeys.length > 0 ? (
        <div className="super-admin-skill-editor__framework-list">
          {selectedFrameworkKeys.map((frameworkKey) => (
            <div key={frameworkKey} className="super-admin-skill-editor__framework-item">
              <div className="super-admin-skill-editor__framework-copy">
                <p className="super-admin-skill-editor__framework-label">
                  {frameworkLabelLookup[frameworkKey] ?? frameworkKey}
                </p>
                <p className="super-admin-skill-editor__framework-key">{frameworkKey}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFramework(frameworkKey)}
                aria-label={`Remove ${frameworkKey}`}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="super-admin-skill-editor__helper">No frameworks selected yet.</p>
      )}

      {error ? (
        <p className="super-admin-skill-editor__field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function SkillEditorForm({
  isEditMode,
  form,
  setForm,
  errors,
  frameworkOptions,
  onBack,
  onCancel,
  onSubmit,
  isSaving,
  loadedSkill,
}) {
  return (
    <Card variant="elevated" className="super-admin-skills__card super-admin-skill-editor__card">
      <form className="super-admin-skill-editor__form" onSubmit={onSubmit} noValidate>
        <Card.Body className="super-admin-skills__card-body super-admin-skills__card-body--compact super-admin-skill-editor__card-body">
          <div className="super-admin-skills__catalogue-actions super-admin-skill-editor__top-actions">
            <Button type="button" variant="outline" size="sm" onClick={onBack}>
              Back
            </Button>
          </div>

          <div className="super-admin-skill-editor__intro">
            <p className="super-admin-skill-editor__form-title">
              {isEditMode ? 'Editor surface for an existing runtime skill.' : 'Editor surface for a new runtime skill.'}
            </p>
            <p className="super-admin-skills__table-note">
              Keep the editor aligned to the runtime skills catalogue by using the same naming,
              framework compatibility, and lifecycle conventions shown on the main skills page.
            </p>
          </div>

          <SkillEditorSection
            title="Basic Information"
            copy="Define the skill identity that downstream Runtime Control resources will reference."
          >
            <div className="super-admin-skill-editor__row">
              <Input
                id="runtime-skill-editor-key"
                label="Skill Key"
                value={form.key}
                onChange={(event) =>
                  setForm((current) => ({ ...current, key: event.target.value }))
                }
                error={errors.key}
                helperText="Stable key used by packages, agents, and workflow policies."
                fullWidth
              />
              <Input
                id="runtime-skill-editor-name"
                label="Skill Name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                error={errors.name}
                fullWidth
              />
              <Select
                id="runtime-skill-editor-status"
                label="Status"
                className="super-admin-skill-editor__select-field"
                value={form.status}
                options={RUNTIME_SKILL_FORM_STATUS_OPTIONS}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
              />
            </div>

            <Textarea
              id="runtime-skill-editor-description"
              label="Description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              error={errors.description}
              rows={4}
              fullWidth
            />
          </SkillEditorSection>

          <SkillEditorSection
            title="Framework Compatibility"
            copy="Keep framework support aligned to the Framework Registry source of truth."
          >
            <FrameworkCompatibilityField
              frameworkOptions={frameworkOptions}
              value={form.supportedFrameworkKeys}
              error={errors.supportedFrameworkKeys}
              onChange={(supportedFrameworkKeys) =>
                setForm((current) => ({
                  ...current,
                  supportedFrameworkKeys,
                }))
              }
            />
          </SkillEditorSection>

          <SkillEditorSection
            title="Skill Classification"
            copy="Classify the skill by category, type, and execution mode to support governance and runtime resolution."
          >
            <div className="super-admin-skill-editor__row">
              <Select
                id="runtime-skill-editor-category"
                label="Category"
                className="super-admin-skill-editor__select-field"
                value={form.category}
                options={RUNTIME_SKILL_CATEGORY_OPTIONS}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
              />
              <Select
                id="runtime-skill-editor-type"
                label="Type"
                className="super-admin-skill-editor__select-field"
                value={form.type}
                options={RUNTIME_SKILL_TYPE_OPTIONS}
                onChange={(event) =>
                  setForm((current) => ({ ...current, type: event.target.value }))
                }
              />
              <Select
                id="runtime-skill-editor-execution-mode"
                label="Execution Mode"
                className="super-admin-skill-editor__select-field"
                value={form.executionMode}
                options={RUNTIME_SKILL_EXECUTION_MODE_OPTIONS}
                onChange={(event) =>
                  setForm((current) => ({ ...current, executionMode: event.target.value }))
                }
                error={errors.executionMode}
              />
            </div>
          </SkillEditorSection>

          <SkillEditorSection
            title="Input / Output Contract"
            copy="Define the expected input and output shapes for this skill."
          >
            <div className="super-admin-skill-editor__stack">
              <Textarea
                id="runtime-skill-editor-input-contract"
                label="Input Contract"
                helperText="Optional. Enter a valid JSON object defining the expected input shape."
                value={form.inputContract}
                onChange={(event) =>
                  setForm((current) => ({ ...current, inputContract: event.target.value }))
                }
                error={errors.inputContract}
                rows={6}
                fullWidth
              />
              <Textarea
                id="runtime-skill-editor-output-contract"
                label="Output Contract"
                helperText="Optional. Enter a valid JSON object defining the expected output shape."
                value={form.outputContract}
                onChange={(event) =>
                  setForm((current) => ({ ...current, outputContract: event.target.value }))
                }
                error={errors.outputContract}
                rows={6}
                fullWidth
              />
            </div>
          </SkillEditorSection>

          <SkillEditorSection
            title="Optional Configuration"
            copy="Configure runtime execution behavior for this skill."
          >
            <div className="super-admin-skill-editor__row super-admin-skill-editor__row--narrow">
              <Input
                id="runtime-skill-editor-timeout"
                label="Timeout (ms)"
                type="number"
                value={form.timeoutMs}
                onChange={(event) =>
                  setForm((current) => ({ ...current, timeoutMs: event.target.value }))
                }
                error={errors.timeoutMs}
                fullWidth
              />
              <Select
                id="runtime-skill-editor-retry-policy"
                label="Retry Policy"
                className="super-admin-skill-editor__select-field"
                value={form.retryPolicy}
                options={RUNTIME_SKILL_RETRY_POLICY_OPTIONS}
                onChange={(event) =>
                  setForm((current) => ({ ...current, retryPolicy: event.target.value }))
                }
                error={errors.retryPolicy}
              />
            </div>
          </SkillEditorSection>

          {isEditMode ? (
            <SkillEditorSection
              title="Dependency Visibility"
              copy="Runtime resources that currently reference this skill."
            >
              <div className="super-admin-skill-editor__dependency-grid">
                <div className="super-admin-skill-editor__dependency-group">
                  <p className="super-admin-skill-editor__dependency-label">Skill ID</p>
                  <p className="super-admin-skill-editor__helper">
                    Skill ID: <span className="super-admin-skill-editor__code">{loadedSkill?.id ?? '--'}</span>
                  </p>
                </div>
                <div className="super-admin-skill-editor__dependency-group">
                  <p className="super-admin-skill-editor__dependency-label">Referencing Agents</p>
                  {loadedSkill?.dependencySummary?.agentIds?.length > 0 ? (
                    <ul className="super-admin-skill-editor__dependency-list">
                      {loadedSkill.dependencySummary.agentIds.map((agentId) => (
                        <li key={agentId} className="super-admin-skill-editor__dependency-item">
                          {agentId}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="super-admin-skill-editor__helper">No agents reference this skill.</p>
                  )}
                </div>
                <div className="super-admin-skill-editor__dependency-group">
                  <p className="super-admin-skill-editor__dependency-label">
                    Referencing Workflow Policies
                  </p>
                  {loadedSkill?.dependencySummary?.workflowPolicyIds?.length > 0 ? (
                    <ul className="super-admin-skill-editor__dependency-list">
                      {loadedSkill.dependencySummary.workflowPolicyIds.map((policyId) => (
                        <li key={policyId} className="super-admin-skill-editor__dependency-item">
                          {policyId}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="super-admin-skill-editor__helper">
                      No workflow policies reference this skill.
                    </p>
                  )}
                </div>
              </div>
            </SkillEditorSection>
          ) : null}

          <div className="super-admin-skills__catalogue-actions super-admin-skill-editor__footer-actions">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={isSaving}>
              {isEditMode ? 'Save Changes' : 'Create Skill'}
            </Button>
          </div>
        </Card.Body>
      </form>
    </Card>
  )
}

function SkillEditorLoadingState() {
  return (
    <Card variant="elevated" className="super-admin-skills__card super-admin-skill-editor__loading-card">
      <Card.Body className="super-admin-skills__card-body super-admin-skills__card-body--compact super-admin-skill-editor__loading-body">
        <Spinner size="lg" />
        <p className="super-admin-skills__muted">Loading skill details...</p>
      </Card.Body>
    </Card>
  )
}

function SkillEditorErrorState({ message, onBack }) {
  return (
    <Card variant="elevated" className="super-admin-skills__card super-admin-skill-editor__error-card">
      <Card.Body className="super-admin-skills__card-body super-admin-skills__card-body--compact super-admin-skill-editor__error-body">
        <p className="super-admin-skills__error" role="alert">
          {message}
        </p>
        <div className="super-admin-skills__catalogue-actions super-admin-skill-editor__top-actions">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
      </Card.Body>
    </Card>
  )
}

function SuperAdminSkillEditor() {
  const navigate = useNavigate()
  const { skillId = '' } = useParams()
  const { addToast } = useToaster()
  const isEditMode = Boolean(skillId)

  const [form, setForm] = useState({
    ...INITIAL_RUNTIME_SKILL_FORM,
  })
  const [errors, setErrors] = useState({})

  const {
    data: skillResponse,
    isLoading: isSkillLoading,
    error: skillError,
  } = useGetRuntimeSkillQuery(skillId, {
    skip: !isEditMode,
  })

  const { data: registryResponse } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })

  const [createRuntimeSkill, { isLoading: isCreating }] = useCreateRuntimeSkillMutation()
  const [updateRuntimeSkill, { isLoading: isUpdating }] = useUpdateRuntimeSkillMutation()

  const loadedSkill = skillResponse?.data ?? null
  const skillAppError = skillError ? normalizeError(skillError) : null
  const activeFrameworkRegistryRows = useMemo(
    () =>
      (registryResponse?.data ?? []).filter(
        (entry) => String(entry.status ?? '').trim().toUpperCase() === FRAMEWORK_REGISTRY_STATUSES.ACTIVE,
      ),
    [registryResponse],
  )
  const frameworkOptions = useMemo(
    () => buildFrameworkRegistryOptions(activeFrameworkRegistryRows, { includeAll: false }),
    [activeFrameworkRegistryRows],
  )

  useEffect(() => {
    if (!isEditMode) {
      setForm({
        ...INITIAL_RUNTIME_SKILL_FORM,
      })
      setErrors({})
      return
    }

    if (loadedSkill) {
      setForm(mapRuntimeSkillToForm(loadedSkill))
      setErrors({})
    }
  }, [isEditMode, loadedSkill])

  const handleBackToSkills = () => {
    navigate('/super-admin/runtime-control/skills')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors({})

    const { errors: nextErrors, payload } = validateRuntimeSkillForm(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    try {
      if (isEditMode) {
        await updateRuntimeSkill({
          skillId,
          ...payload,
        }).unwrap()

        addToast({
          title: 'Skill updated',
          description: 'The skill editor changes were saved successfully.',
          variant: 'success',
        })
      } else {
        await createRuntimeSkill({
          ...payload,
        }).unwrap()

        addToast({
          title: 'Skill created',
          description: `${payload.name} is now available in the Runtime Control catalogue.`,
          variant: 'success',
        })
      }

      navigate('/super-admin/runtime-control/skills')
    } catch (err) {
      const appError = normalizeError(err)
      const field = String(appError?.details?.field ?? '').trim()

      if (field) {
        setErrors({ [field]: appError.message })
        return
      }

      addToast({
        title: isEditMode ? 'Failed to update skill' : 'Failed to create skill',
        description: appError.message,
        variant: 'error',
      })
    }
  }

  return (
    <section
      className="super-admin-skills super-admin-skill-editor container"
      aria-label="Super admin skill editor"
    >
      <header className="super-admin-skills__header">
        <h1 className="super-admin-skills__title">{isEditMode ? 'Skill Editor' : 'Create Skill'}</h1>
        <p className="super-admin-skills__subtitle">
          Register reusable runtime skills, control their availability, and align framework
          compatibility before packages and workflow policies reference them.
        </p>
      </header>

      <Fieldset className="super-admin-skills__fieldset super-admin-skill-editor__fieldset">
        <Fieldset.Legend className="sr-only">Runtime skill editor</Fieldset.Legend>
        {isEditMode && isSkillLoading ? <SkillEditorLoadingState /> : null}
        {isEditMode && skillAppError ? (
          <SkillEditorErrorState message={skillAppError.message} onBack={handleBackToSkills} />
        ) : null}
        {!isSkillLoading && !skillAppError ? (
          <SkillEditorForm
            isEditMode={isEditMode}
            form={form}
            setForm={setForm}
            errors={errors}
            frameworkOptions={frameworkOptions}
            onBack={handleBackToSkills}
            onCancel={handleBackToSkills}
            onSubmit={handleSubmit}
            isSaving={isCreating || isUpdating}
            loadedSkill={loadedSkill}
          />
        ) : null}
      </Fieldset>
    </section>
  )
}

export default SuperAdminSkillEditor
