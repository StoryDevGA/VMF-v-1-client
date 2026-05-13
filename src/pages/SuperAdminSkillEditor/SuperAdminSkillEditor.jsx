import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Tickbox } from '../../components/Tickbox'
import { Textarea } from '../../components/Textarea'
import { TabView } from '../../components/TabView'
import { useToaster } from '../../components/Toaster'
import RuntimePathSearchSelect from '../../components/RuntimePathSearchSelect/RuntimePathSearchSelect.jsx'
import {
  useCreateRuntimeSkillMutation,
  useCloneRuntimeSkillMutation,
  useGetRuntimeSkillQuery,
  useListFrameworkRegistriesQuery,
  useListSkillRolesQuery,
  useListRuntimeSkillsQuery,
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
  parseJsonField,
  parseFrameworkKeyList,
  parseStringList,
  RUNTIME_SKILL_CATEGORY_OPTIONS,
  RUNTIME_SKILL_EXECUTION_MODE_OPTIONS,
  RUNTIME_SKILL_FORM_STATUS_OPTIONS,
  RUNTIME_SKILL_STATUSES,
  RUNTIME_SKILL_RETRY_POLICY_OPTIONS,
  RUNTIME_SKILL_TYPE_OPTIONS,
  isContractStructured,
  validateRuntimeSkillForm,
} from '../SuperAdminSkills/superAdminSkills.constants.js'
import '../SuperAdminSkills/SuperAdminSkills.css'
import '../SuperAdminSkills/RuntimeSkillListView.css'
import './SuperAdminSkillEditor.css'

const shallowEqualObject = (left, right) => {
  if (left === right) return true
  if (!left || !right) return false
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key) => left[key] === right[key])
}

const normalizeSkillRoleKey = (value) => String(value ?? '').trim().toUpperCase()

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
    onChange(formatKeyList(selectedFrameworkKeys.filter((fk) => fk !== frameworkKey)))
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
  isCloneMode,
  isLockedSkill,
  form,
  setForm,
  errors,
  validationHints = {},
  frameworkOptions,
  skillRoleOptions,
  isSkillRolesLoading,
  onBack,
  onClone,
  onCancel,
  onSubmit,
  onReviewMissingFields,
  isSaving,
  isCreateReady,
  activeTab,
  onTabChange,
  loadedSkill,
}) {
  const selectedFrameworkKeys = useMemo(
    () => parseFrameworkKeyList(form.supportedFrameworkKeys),
    [form.supportedFrameworkKeys],
  )
  const hintErrors = useMemo(
    () => (validationHints && typeof validationHints === 'object' ? validationHints : {}),
    [validationHints],
  )
  const tabErrorCounts = useMemo(() => ({
    framework: hintErrors.supportedFrameworkKeys ? 1 : 0,
    classification: ['skillRoleKey', 'category', 'type', 'executionMode'].filter((key) => hintErrors[key]).length,
    contracts: [
      'inputContract',
      'outputContract',
      'primaryOutputKey',
      'outputBindings',
      'allowedReadPaths',
      'allowedWritePaths',
      'forbiddenWritePaths',
      'executionConfig',
    ].filter((key) => hintErrors[key]).length,
    optionalConfiguration: [hintErrors.timeoutMs, hintErrors.retryPolicy].filter(Boolean).length,
    referenceAssets: hintErrors.referenceAssets ? 1 : 0,
    dependencies: 0,
  }), [hintErrors])

  const [primaryOutputKeyNotice, setPrimaryOutputKeyNotice] = useState('')
  const inputContractSchema = useMemo(() => parseJsonField(form.inputContract), [form.inputContract])
  const outputContractSchema = useMemo(() => parseJsonField(form.outputContract), [form.outputContract])
  const inputContractStatus = useMemo(() => {
    if (inputContractSchema.error || !inputContractSchema.value) return { isStructured: false }
    return { isStructured: isContractStructured(inputContractSchema.value) }
  }, [inputContractSchema])
  const outputContractStatus = useMemo(() => {
    if (outputContractSchema.error || !outputContractSchema.value) return { isStructured: false }
    return { isStructured: isContractStructured(outputContractSchema.value) }
  }, [outputContractSchema])
  const outputContractPropertyMeta = useMemo(() => {
    if (outputContractSchema.error || !outputContractSchema.value) {
      return { options: [], typeLookup: {}, keys: [], isStructured: false }
    }

    const rootOption = { value: '$root', label: '$root (object)' }
    const properties = outputContractSchema.value.properties
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
      return { options: [rootOption], typeLookup: {}, keys: [], isStructured: false }
    }

    const keys = Object.keys(properties).filter(Boolean).sort((left, right) => left.localeCompare(right))
    const typeLookup = Object.fromEntries(keys.map((key) => {
      const value = properties[key]
      const type = value && typeof value === 'object' && !Array.isArray(value)
        ? String(value.type ?? '').trim()
        : ''
      return [key, type]
    }))

    const keyOptions = keys.map((key) => {
      const suffix = typeLookup[key] ? ` (${typeLookup[key]})` : ''
      return { value: key, label: `${key}${suffix}` }
    })

    return {
      keys: outputContractStatus.isStructured ? keys : [],
      typeLookup: outputContractStatus.isStructured ? typeLookup : {},
      isStructured: outputContractStatus.isStructured,
      options: [rootOption, ...(outputContractStatus.isStructured ? keyOptions : [])],
    }
  }, [outputContractSchema, outputContractStatus.isStructured])
  const executionModeSummaryLabel = useMemo(() => {
    const match = RUNTIME_SKILL_EXECUTION_MODE_OPTIONS.find((option) => option.value === form.executionMode)
    return match ? match.label : String(form.executionMode ?? '').trim()
  }, [form.executionMode])
  const primaryOutputKeyHelperText = useMemo(() => {
    if (primaryOutputKeyNotice) return primaryOutputKeyNotice
    if (form.outputBindingMode !== 'PRIMARY') {
      return 'Disabled unless Output Binding Mode is set to Primary Output.'
    }
    if (outputContractSchema.error) {
      return 'Fix the Output Contract JSON to populate primary output options.'
    }
    if (form.primaryOutputKey === '$root') {
      return 'Selected output: $root (object).'
    }
    if (outputContractPropertyMeta.keys.length === 0) {
      return 'Select $root to bind the full output object, or define output properties for field-level binding.'
    }
    const selectedType = outputContractPropertyMeta.typeLookup?.[form.primaryOutputKey]
    return selectedType
      ? `Selected output type: ${selectedType}.`
      : 'Select the canonical output value downstream execution should bind to.'
  }, [
    form.outputBindingMode,
    form.primaryOutputKey,
    outputContractPropertyMeta.keys.length,
    outputContractPropertyMeta.typeLookup,
    outputContractSchema.error,
    primaryOutputKeyNotice,
  ])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (form.outputBindingMode !== 'PRIMARY') {
        if (primaryOutputKeyNotice) {
          setPrimaryOutputKeyNotice('')
        }
        return
      }

      if (!form.primaryOutputKey) return

      if (form.primaryOutputKey === '$root') {
        if (primaryOutputKeyNotice) {
          setPrimaryOutputKeyNotice('')
        }
        return
      }

      if (outputContractPropertyMeta.keys.length === 0) {
        setForm((current) => ({ ...current, primaryOutputKey: '' }))
        setPrimaryOutputKeyNotice('Selection cleared because the Output Contract does not define selectable properties. Use $root or add properties.')
        return
      }

      if (outputContractPropertyMeta.keys.includes(form.primaryOutputKey)) {
        if (primaryOutputKeyNotice) {
          setPrimaryOutputKeyNotice('')
        }
        return
      }

      setForm((current) => ({ ...current, primaryOutputKey: '' }))
      setPrimaryOutputKeyNotice('Selection cleared because it no longer exists in the Output Contract properties. Use $root or update the Output Contract.')
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [
    form.outputBindingMode,
    form.primaryOutputKey,
    outputContractPropertyMeta.keys,
    primaryOutputKeyNotice,
    setForm,
  ])

  const renderTabLabel = (label, count = 0) => (
    <span className="super-admin-skills__tab-label">
      <span>{label}</span>
      {count > 0 ? (
        <>
          <span className="super-admin-skills__tab-error-count" aria-hidden="true">
            ({count})
          </span>
          <span className="sr-only"> ({count} validation errors)</span>
        </>
      ) : null}
    </span>
  )

  return (
    <Card variant="elevated" className="super-admin-skills__card super-admin-skill-editor__card">
      <form className="super-admin-skill-editor__form" onSubmit={onSubmit} noValidate>
        <Card.Body className="super-admin-skills__card-body super-admin-skills__card-body--compact super-admin-skill-editor__card-body">
          <div className="super-admin-skills__catalogue-actions super-admin-skill-editor__top-actions">
            <Button type="button" variant="outline" size="sm" onClick={onBack}>
              Back
            </Button>
            {isLockedSkill ? (
              <Button type="button" variant="primary" size="sm" onClick={onClone}>
                Clone
              </Button>
            ) : null}
          </div>

          <div className="super-admin-skill-editor__intro">
            <p className="super-admin-skill-editor__form-title">
              {isEditMode
                ? 'Editor surface for an existing runtime skill.'
                : isCloneMode
                  ? 'Clone this runtime skill into an editable draft.'
                  : 'Editor surface for a new runtime skill.'}
            </p>
            <p className="super-admin-skills__table-note">
              Keep the editor aligned to the runtime skills catalogue by using the same naming,
              framework compatibility, and lifecycle conventions shown on the main skills page.
            </p>
          </div>

          {isLockedSkill ? (
            <Card variant="outlined" className="super-admin-skill-editor__lock-banner" role="status">
              <Card.Body className="super-admin-skill-editor__lock-banner-body">
                <Badge variant="warning" size="sm" pill outline>
                  Locked
                </Badge>
                <div className="super-admin-skill-editor__lock-copy">
                  <strong>Locked by validated package usage.</strong>
                  <span>Clone this runtime skill to make behavior changes.</span>
                </div>
                {(Array.isArray(loadedSkill?.lockedByPackageKeys) ? loadedSkill.lockedByPackageKeys : []).length > 0 ? (
                  <div className="super-admin-skill-editor__lock-packages" aria-label="Locking packages">
                    {loadedSkill.lockedByPackageKeys.map((packageKey) => (
                      <Badge key={packageKey} variant="neutral" size="sm" pill outline>
                        {packageKey}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </Card.Body>
            </Card>
          ) : null}

          <fieldset className="super-admin-skill-editor__edit-fieldset" disabled={isLockedSkill}>
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

          <TabView
            variant="pills"
            size="sm"
            evenTabs
            className="super-admin-skill-editor__tabs"
            aria-label="Skill editor configuration sections"
            activeTab={activeTab}
            onTabChange={onTabChange}
          >
            <TabView.Tab label={renderTabLabel('Framework Compatibility', tabErrorCounts.framework)}>
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
            </TabView.Tab>

            <TabView.Tab label={renderTabLabel('Skill Classification', tabErrorCounts.classification)}>
              <SkillEditorSection
                title="Skill Classification"
                copy="Classify the skill by business category, implementation type, execution mode, and governed role so taxonomy and runtime behavior stay separate."
              >
                <div className="super-admin-skill-editor__row super-admin-skill-editor__row--classification">
                  <Select
                    id="runtime-skill-editor-category"
                    label="Business Category"
                    className="super-admin-skill-editor__select-field"
                    value={form.category}
                    options={RUNTIME_SKILL_CATEGORY_OPTIONS}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, category: event.target.value }))
                    }
                    error={errors.category}
                    helperText="Business domain/use case, such as Validation, Governance, Output, or Integration."
                  />
                  <Select
                    id="runtime-skill-editor-type"
                    label="Implementation Type"
                    className="super-admin-skill-editor__select-field"
                    value={form.type}
                    options={RUNTIME_SKILL_TYPE_OPTIONS}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, type: event.target.value }))
                    }
                    error={errors.type}
                    helperText="Implementation pattern, not business category. Examples: deterministic, agent-assisted, rule-based, or template-driven."
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
                    helperText="Runtime engine: System, Rule Engine, or Agent."
                  />
                  <Select
                    id="runtime-skill-editor-skill-role"
                    label="Role"
                    className="super-admin-skill-editor__select-field"
                    value={form.skillRoleKey}
                    options={skillRoleOptions}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, skillRoleKey: event.target.value }))
                    }
                    error={errors.skillRoleKey}
                    helperText="Governed role this skill fulfills, such as Validator, Generator, Transformer, or Notifier."
                    placeholder={
                      isSkillRolesLoading
                        ? 'Loading skill roles...'
                        : skillRoleOptions.length > 0
                          ? 'Select a skill role'
                          : 'No skill roles available'
                    }
                    disabled={isSkillRolesLoading || skillRoleOptions.length === 0}
                  />
                </div>
              </SkillEditorSection>
            </TabView.Tab>

            <TabView.Tab label={renderTabLabel('Input / Output Contract', tabErrorCounts.contracts)}>
              <SkillEditorSection
                title="Input / Output Contract"
                copy="Define contracts, governed bindings, access boundaries, and mode-specific execution config."
              >
                <div className="super-admin-skill-editor__stack">
                  <div className="super-admin-skill-editor__subsection">
                    <h3 className="super-admin-skill-editor__subsection-title">Contracts</h3>
                    <p className="super-admin-skill-editor__subsection-copy">
                      Define the expected input and output structures for this skill. JSON Schema-style objects are supported.
                    </p>
                    <Textarea
                      id="runtime-skill-editor-input-contract"
                      label="Input Contract"
                      helperText={(
                        <span className="super-admin-skill-editor__contract-helper">
                          <span className={`super-admin-skill-editor__contract-pill ${inputContractStatus.isStructured ? 'super-admin-skill-editor__contract-pill--structured' : 'super-admin-skill-editor__contract-pill--unstructured'}`}>
                            {inputContractStatus.isStructured ? 'Structured Contract' : 'Unstructured Contract'}
                          </span>
                          <span>Optional. Enter a valid JSON object defining the expected input shape.</span>
                        </span>
                      )}
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
                      helperText={(
                        <span className="super-admin-skill-editor__contract-helper">
                          <span className={`super-admin-skill-editor__contract-pill ${outputContractStatus.isStructured ? 'super-admin-skill-editor__contract-pill--structured' : 'super-admin-skill-editor__contract-pill--unstructured'}`}>
                            {outputContractStatus.isStructured ? 'Structured Contract' : 'Unstructured Contract'}
                          </span>
                          <span>Optional. Enter a valid JSON object defining the expected output shape.</span>
                          {!outputContractStatus.isStructured ? (
                            <span className="super-admin-skill-editor__contract-hint">Some orchestration features will be limited.</span>
                          ) : null}
                        </span>
                      )}
                      value={form.outputContract}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, outputContract: event.target.value }))
                      }
                      error={errors.outputContract}
                      rows={6}
                      fullWidth
                    />
                    <p className="super-admin-skill-editor__subsection-note">
                      Outputs defined here can be exposed to agents through controlled output bindings.
                    </p>
                  </div>

                  <div className="super-admin-skill-editor__subsection">
                    <h3 className="super-admin-skill-editor__subsection-title">Bindings</h3>
                    <p className="super-admin-skill-editor__subsection-copy">
                      Codify how agent execution plans can bind outputs from this skill.
                    </p>
                    <p className="super-admin-skill-editor__subsection-note">
                      Execution mode: {executionModeSummaryLabel}
                    </p>
                    <Select
                      id="runtime-skill-editor-output-binding-mode"
                      label="Output Binding Mode"
                      className="super-admin-skill-editor__select-field"
                      value={form.outputBindingMode}
                      options={[
                        { value: 'NONE', label: 'None' },
                        { value: 'PRIMARY', label: 'Primary Output Selection' },
                        { value: 'BINDINGS', label: 'Output Bindings' },
                      ]}
                      helperText="Choose one mode to enable its field. This prevents agents from binding ambiguous outputs."
                      onChange={(event) => {
                        const mode = event.target.value

                        setForm((current) => {
                          if (mode === 'PRIMARY') {
                            return { ...current, outputBindingMode: mode, outputBindings: '' }
                          }

                          if (mode === 'BINDINGS') {
                            return { ...current, outputBindingMode: mode, primaryOutputKey: '' }
                          }

                          return {
                            ...current,
                            outputBindingMode: 'NONE',
                            primaryOutputKey: '',
                            outputBindings: '',
                          }
                        })
                      }}
                      placeholder="Select an output binding mode"
                    />
                    <Select
                      id="runtime-skill-editor-primary-output-key"
                      label="Primary Output Selection"
                      helperText={primaryOutputKeyHelperText}
                      value={form.primaryOutputKey}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, primaryOutputKey: event.target.value }))
                      }
                      options={outputContractPropertyMeta.options}
                      error={errors.primaryOutputKey}
                      disabled={
                        form.outputBindingMode !== 'PRIMARY'
                        || outputContractSchema.error
                        || outputContractPropertyMeta.options.length === 0
                      }
                      placeholder={
                        outputContractPropertyMeta.options.length > 0
                          ? 'Select a primary output'
                          : 'Fix Output Contract JSON'
                      }
                    />
                    <Textarea
                      id="runtime-skill-editor-output-bindings"
                      label="Output Bindings"
                      helperText="Optional. Provide bindable output keys (one per line). Leave empty when using Primary Output Selection."
                      value={form.outputBindings}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, outputBindings: event.target.value }))
                      }
                      error={errors.outputBindings}
                      disabled={form.outputBindingMode !== 'BINDINGS'}
                      rows={4}
                      fullWidth
                    />
                  </div>

                  <div className="super-admin-skill-editor__subsection">
                    <h3 className="super-admin-skill-editor__subsection-title">Access Boundaries</h3>
                    <p className="super-admin-skill-editor__subsection-copy">
                      Set controlled read/write boundaries for this skill. These boundaries support governed execution and validation.
                    </p>
                    <RuntimePathSearchSelect
                      id="runtime-skill-editor-allowed-read-paths"
                      label="Allowed Read Paths"
                      helperText="Optional. Select approved runtime paths (READ) from the Runtime Path Registry."
                      frameworkKeys={selectedFrameworkKeys}
                      operation="READ"
                      selectedKeys={parseStringList(form.allowedReadPaths)}
                      onChange={(nextKeys) =>
                        setForm((current) => ({ ...current, allowedReadPaths: formatKeyList(nextKeys) }))
                      }
                      error={errors.allowedReadPaths}
                    />
                    <RuntimePathSearchSelect
                      id="runtime-skill-editor-allowed-write-paths"
                      label="Allowed Write Paths"
                      helperText="Optional. Select approved runtime paths (WRITE) from the Runtime Path Registry."
                      frameworkKeys={selectedFrameworkKeys}
                      operation="WRITE"
                      selectedKeys={parseStringList(form.allowedWritePaths)}
                      onChange={(nextKeys) =>
                        setForm((current) => ({ ...current, allowedWritePaths: formatKeyList(nextKeys) }))
                      }
                      error={errors.allowedWritePaths}
                    />
                    <RuntimePathSearchSelect
                      id="runtime-skill-editor-forbidden-write-paths"
                      label="Forbidden Write Paths"
                      helperText="Optional. Select protected runtime paths that this skill must never write. Must not overlap with allowed write paths."
                      frameworkKeys={selectedFrameworkKeys}
                      operation={null}
                      isProtectedOnly
                      selectedKeys={parseStringList(form.forbiddenWritePaths)}
                      onChange={(nextKeys) =>
                        setForm((current) => ({ ...current, forbiddenWritePaths: formatKeyList(nextKeys) }))
                      }
                      error={errors.forbiddenWritePaths}
                    />
                  </div>

                  <div className="super-admin-skill-editor__subsection">
                    <h3 className="super-admin-skill-editor__subsection-title">Execution Config</h3>
                    <p className="super-admin-skill-editor__subsection-copy">
                      Optional mode-specific configuration used by Rule Engine or Agent execution modes. Keep operational settings such as timeout and retry policy in Optional Configuration.
                    </p>
                    {String(form.executionMode ?? '').toUpperCase() !== 'SYSTEM' ? (
                      <Textarea
                        id="runtime-skill-editor-execution-config"
                        label="Execution Config (JSON)"
                        helperText="Optional. Mode-specific execution configuration for Rule Engine or Agent execution modes."
                        value={form.executionConfig}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, executionConfig: event.target.value }))
                        }
                        error={errors.executionConfig}
                        rows={5}
                        fullWidth
                      />
                    ) : (
                      <p className="super-admin-skill-editor__subsection-note">
                        Execution config is only available for Rule Engine or Agent execution modes.
                      </p>
                    )}
                  </div>
                </div>
              </SkillEditorSection>
            </TabView.Tab>

            <TabView.Tab label={renderTabLabel('Optional Configuration', tabErrorCounts.optionalConfiguration)}>
              <SkillEditorSection
                title="Optional Configuration"
                copy="Configure operational settings such as timeout and retry policy."
              >
                <div className="super-admin-skill-editor__stack">
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
                </div>
              </SkillEditorSection>
            </TabView.Tab>

            <TabView.Tab label={renderTabLabel('Reference Assets', tabErrorCounts.referenceAssets)}>
              <SkillEditorSection
                title="Reference Assets"
                copy="Attach governed help documents, runtime references, and test artifacts to this skill."
              >
                <ReferenceAssetsEditor
                  assets={form.referenceAssets}
                  error={errors.referenceAssets}
                  onChange={(referenceAssets) =>
                    setForm((current) => ({ ...current, referenceAssets }))
                  }
                />
              </SkillEditorSection>
            </TabView.Tab>

            {isEditMode ? (
              <TabView.Tab label={renderTabLabel('Dependency Visibility', tabErrorCounts.dependencies)}>
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
                    <div className="super-admin-skill-editor__dependency-group">
                      <p className="super-admin-skill-editor__dependency-label">
                        Referencing Validations
                      </p>
                      {loadedSkill?.dependencySummary?.validationIds?.length > 0 ? (
                        <ul className="super-admin-skill-editor__dependency-list">
                          {loadedSkill.dependencySummary.validationIds.map((validationId) => (
                            <li key={validationId} className="super-admin-skill-editor__dependency-item">
                              {validationId}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="super-admin-skill-editor__helper">
                          No validations reference this skill.
                        </p>
                      )}
                    </div>
                    <div className="super-admin-skill-editor__dependency-group">
                      <p className="super-admin-skill-editor__dependency-label">
                        Locking Framework Packages
                      </p>
                      {loadedSkill?.dependencySummary?.frameworkPackageIds?.length > 0 ? (
                        <ul className="super-admin-skill-editor__dependency-list">
                          {loadedSkill.dependencySummary.frameworkPackageIds.map((packageId) => (
                            <li key={packageId} className="super-admin-skill-editor__dependency-item">
                              {packageId}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="super-admin-skill-editor__helper">
                          No framework packages currently lock this skill.
                        </p>
                      )}
                    </div>
                  </div>
                </SkillEditorSection>
              </TabView.Tab>
            ) : null}
          </TabView>
          </fieldset>

          <div className="super-admin-skills__catalogue-actions super-admin-skill-editor__footer-actions">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            {isEditMode ? (
              <Button type="submit" variant="primary" size="sm" loading={isSaving} disabled={isLockedSkill}>
                Save Changes
              </Button>
            ) : isCloneMode && isCreateReady ? (
              <Button type="submit" variant="primary" size="sm" loading={isSaving}>
                Save Clone
              </Button>
            ) : isCreateReady ? (
              <Button type="submit" variant="primary" size="sm" loading={isSaving}>
                Create Skill
              </Button>
            ) : (
              <Button type="button" variant="primary" size="sm" onClick={onReviewMissingFields}>
                Review missing fields
              </Button>
            )}
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

function getMimeTypeForAssetType(assetType) {
  switch (String(assetType || '').toUpperCase()) {
    case 'PDF':
      return 'application/pdf'
    case 'JSON':
      return 'application/json'
    case 'DOCX':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'TEXT':
      return 'text/plain'
    default:
      return 'application/octet-stream'
  }
}

function buildReferenceAssetId() {
  const randomId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return `asset-${String(randomId).replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 24)}`
}

function ReferenceAssetsEditor({ assets, error, onChange }) {
  const rows = Array.isArray(assets) ? assets : []
  const [isAdding, setIsAdding] = useState(false)
  const [draft, setDraft] = useState(() => ({
    assetId: buildReferenceAssetId(),
    name: '',
    assetType: 'PDF',
    mimeType: getMimeTypeForAssetType('PDF'),
    purpose: 'AUTHORING_HELP',
    usageMode: 'OPTIONAL',
    status: 'ACTIVE',
    isRuntimeAccessible: false,
    isAdminOnly: true,
    isTestOnly: false,
    description: '',
    storageKey: '',
  }))

  const normalizeDraftFlags = (nextDraft) => {
    const isRuntimeAccessible = Boolean(nextDraft.isRuntimeAccessible)
    const isAdminOnly = Boolean(nextDraft.isAdminOnly)
    const isTestOnly = Boolean(nextDraft.isTestOnly)

    if (isRuntimeAccessible) {
      return { ...nextDraft, isAdminOnly: false, isTestOnly: false }
    }
    if (isAdminOnly && isTestOnly) {
      return { ...nextDraft, isTestOnly: false }
    }
    return { ...nextDraft, isRuntimeAccessible, isAdminOnly, isTestOnly }
  }

  const handleAdd = () => {
    if (!String(draft.name).trim()) {
      return
    }

    onChange([{ ...draft }, ...rows])
    setDraft({
      assetId: buildReferenceAssetId(),
      name: '',
      assetType: 'PDF',
      mimeType: getMimeTypeForAssetType('PDF'),
      purpose: 'AUTHORING_HELP',
      usageMode: 'OPTIONAL',
      status: 'ACTIVE',
      isRuntimeAccessible: false,
      isAdminOnly: true,
      isTestOnly: false,
      description: '',
      storageKey: '',
    })
    setIsAdding(false)
  }

  const handleRemove = (assetId) => {
    onChange(rows.filter((row) => row.assetId !== assetId))
  }

  return (
    <div className="super-admin-skill-editor__stack">
      <p className="super-admin-skill-editor__helper">
        Upload support is deferred; this field set stores governed metadata and a storage key/URL reference.
      </p>

      {rows.length > 0 ? (
        <div className="super-admin-skill-editor__stack" role="list" aria-label="Reference assets">
          {rows.map((row) => (
            <Card key={row.assetId} variant="outlined">
              <Card.Body className="super-admin-skill-editor__stack">
                <div className="super-admin-skill-editor__row">
                  <div>
                    <p className="super-admin-skill-editor__dependency-label">{row.name}</p>
                    <p className="super-admin-skill-editor__helper">
                      <span className="super-admin-skill-editor__code">{row.assetId}</span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(row.assetId)}
                    aria-label={`Remove ${row.name}`}
                  >
                    Remove
                  </Button>
                </div>
                <div className="super-admin-skill-editor__row">
                  <Input id={`${row.assetId}-type`} label="Type" value={row.assetType ?? 'OTHER'} disabled fullWidth />
                  <Input id={`${row.assetId}-purpose`} label="Purpose" value={row.purpose ?? ''} disabled fullWidth />
                  <Input id={`${row.assetId}-usage`} label="Usage Mode" value={row.usageMode ?? ''} disabled fullWidth />
                  <Input
                    id={`${row.assetId}-runtime`}
                    label="Runtime"
                    value={row.isRuntimeAccessible ? 'Yes' : 'No'}
                    disabled
                    fullWidth
                  />
                  <Input id={`${row.assetId}-status`} label="Status" value={row.status ?? ''} disabled fullWidth />
                </div>
                {row.storageKey ? (
                  <p className="super-admin-skill-editor__helper">
                    Storage: <span className="super-admin-skill-editor__code">{row.storageKey}</span>
                  </p>
                ) : null}
                {row.description ? <p className="super-admin-skill-editor__helper">{row.description}</p> : null}
              </Card.Body>
            </Card>
          ))}
        </div>
      ) : (
        <p className="super-admin-skill-editor__helper">No reference assets attached yet.</p>
      )}

      {error ? (
        <p className="super-admin-skill-editor__field-error" role="alert">
          {error}
        </p>
      ) : null}

        {isAdding ? (
          <Card variant="outlined">
          <Card.Body className="super-admin-skill-editor__stack">
            <Input
              id="runtime-skill-editor-asset-name"
              label="Asset Name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              fullWidth
            />
            <div className="super-admin-skill-editor__row">
              <Select
                id="runtime-skill-editor-asset-type"
                label="Type"
                className="super-admin-skill-editor__select-field"
                value={draft.assetType}
                options={[
                  { value: 'PDF', label: 'PDF' },
                  { value: 'JSON', label: 'JSON' },
                  { value: 'DOCX', label: 'DOCX' },
                  { value: 'TEXT', label: 'Text' },
                  { value: 'OTHER', label: 'Other' },
                ]}
                onChange={(event) => {
                  const nextAssetType = event.target.value
                  setDraft((current) => ({
                    ...current,
                    assetType: nextAssetType,
                    mimeType: getMimeTypeForAssetType(nextAssetType),
                  }))
                }}
              />
              <Select
                id="runtime-skill-editor-asset-purpose"
                label="Purpose"
                className="super-admin-skill-editor__select-field"
                value={draft.purpose}
                options={[
                  { value: 'AUTHORING_HELP', label: 'Authoring / Help' },
                  { value: 'RUNTIME_REFERENCE', label: 'Runtime Reference' },
                  { value: 'EXAMPLE_INPUT', label: 'Example Input' },
                  { value: 'EXAMPLE_OUTPUT', label: 'Example Output' },
                  { value: 'TEMPLATE', label: 'Template' },
                  { value: 'POLICY_GUIDANCE', label: 'Policy Guidance' },
                  { value: 'TEST_ASSET', label: 'Test Asset' },
                ]}
                onChange={(event) => {
                  const nextPurpose = event.target.value
                  setDraft((current) => {
                    const next = { ...current, purpose: nextPurpose }
                    if (nextPurpose === 'RUNTIME_REFERENCE') {
                      return normalizeDraftFlags({ ...next, isRuntimeAccessible: true })
                    }
                    if (nextPurpose === 'TEST_ASSET') {
                      return normalizeDraftFlags({ ...next, isRuntimeAccessible: false, isAdminOnly: false, isTestOnly: true })
                    }
                    if (nextPurpose === 'AUTHORING_HELP') {
                      return normalizeDraftFlags({ ...next, isRuntimeAccessible: false, isAdminOnly: true, isTestOnly: false })
                    }
                    return normalizeDraftFlags(next)
                  })
                }}
              />
              <Select
                id="runtime-skill-editor-asset-usage-mode"
                label="Usage Mode"
                className="super-admin-skill-editor__select-field"
                value={draft.usageMode}
                options={[
                  { value: 'OPTIONAL', label: 'Optional' },
                  { value: 'REQUIRED', label: 'Required' },
                  { value: 'TEST_ONLY', label: 'Test only' },
                ]}
                onChange={(event) => {
                  const nextUsageMode = event.target.value
                  setDraft((current) => normalizeDraftFlags({
                    ...current,
                    usageMode: nextUsageMode,
                    ...(nextUsageMode === 'TEST_ONLY' ? { isRuntimeAccessible: false, isAdminOnly: false, isTestOnly: true } : {}),
                  }))
                }}
              />
              <Select
                id="runtime-skill-editor-asset-status"
                label="Status"
                className="super-admin-skill-editor__select-field"
                value={draft.status}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
                onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
              />
            </div>
            <div className="super-admin-skill-editor__row">
              <Tickbox
                id="runtime-skill-editor-asset-runtime-accessible"
                label="Runtime accessible"
                checked={draft.isRuntimeAccessible}
                onChange={(event) =>
                  setDraft((current) => normalizeDraftFlags({ ...current, isRuntimeAccessible: event.target.checked }))
                }
              />
              <Tickbox
                id="runtime-skill-editor-asset-admin-only"
                label="Admin only"
                checked={draft.isAdminOnly}
                disabled={draft.isRuntimeAccessible}
                onChange={(event) =>
                  setDraft((current) => normalizeDraftFlags({ ...current, isAdminOnly: event.target.checked }))
                }
              />
              <Tickbox
                id="runtime-skill-editor-asset-test-only"
                label="Test only"
                checked={draft.isTestOnly}
                disabled={draft.isRuntimeAccessible}
                onChange={(event) =>
                  setDraft((current) => normalizeDraftFlags({ ...current, isTestOnly: event.target.checked }))
                }
              />
            </div>
            <Input
              id="runtime-skill-editor-asset-storage-key"
              label="Storage Key / URL"
              value={draft.storageKey}
              onChange={(event) => setDraft((current) => ({ ...current, storageKey: event.target.value }))}
              fullWidth
            />
            <Textarea
              id="runtime-skill-editor-asset-description"
              label="Description"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              fullWidth
            />
            <div className="super-admin-skill-editor__row super-admin-skill-editor__row--narrow">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleAdd} disabled={!String(draft.name).trim()}>
                Add Asset
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <Button
          id="runtime-skill-editor-add-reference-asset"
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
        >
          Add Reference Asset
        </Button>
      )}
    </div>
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
  const [searchParams] = useSearchParams()
  const { addToast } = useToaster()
  const isEditMode = Boolean(skillId)
  const cloneFromSkillId = !isEditMode ? String(searchParams.get('cloneFrom') ?? '').trim() : ''
  const isCloneMode = Boolean(cloneFromSkillId)
  const loadedSkillId = isEditMode ? skillId : cloneFromSkillId

  const [form, setForm] = useState({
    ...INITIAL_RUNTIME_SKILL_FORM,
  })
  const [errors, setErrors] = useState({})
  const [errorsSource, setErrorsSource] = useState(null)
  const [activeEditorTab, setActiveEditorTab] = useState(0)
  const [showValidationHints, setShowValidationHints] = useState(false)

  const {
    data: skillResponse,
    isLoading: isSkillLoading,
    error: skillError,
  } = useGetRuntimeSkillQuery(loadedSkillId, {
    skip: !loadedSkillId,
  })

  const { data: registryResponse } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })
  const { data: skillsResponse } = useListRuntimeSkillsQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })
  const { data: skillRolesResponse, isLoading: isSkillRolesLoading } = useListSkillRolesQuery({
    page: 1,
    pageSize: 100,
    q: '',
    status: '',
  })

  const [createRuntimeSkill, { isLoading: isCreating }] = useCreateRuntimeSkillMutation()
  const [cloneRuntimeSkill, { isLoading: isCloning }] = useCloneRuntimeSkillMutation()
  const [updateRuntimeSkill, { isLoading: isUpdating }] = useUpdateRuntimeSkillMutation()

  const loadedSkill = skillResponse?.data ?? null
  const isLockedSkill = Boolean(isEditMode && loadedSkill?.isLocked)
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
  const existingSkills = useMemo(() => {
    const direct = skillsResponse?.data

    if (Array.isArray(direct)) {
      return direct
    }

    if (direct && typeof direct === 'object' && Array.isArray(direct.data)) {
      return direct.data
    }

    if (Array.isArray(skillsResponse)) {
      return skillsResponse
    }

    return []
  }, [skillsResponse])
  const skillRoleRows = useMemo(() => {
    const direct = skillRolesResponse?.data

    if (Array.isArray(direct)) {
      return direct
    }

    if (direct && typeof direct === 'object' && Array.isArray(direct.data)) {
      return direct.data
    }

    if (Array.isArray(skillRolesResponse)) {
      return skillRolesResponse
    }

    return []
  }, [skillRolesResponse])
  const skillRoleOptions = useMemo(() => {
    const normalizedCurrentSkillRoleKey = normalizeSkillRoleKey(form.skillRoleKey)
    const optionMap = new Map()

    skillRoleRows
      .filter((role) => normalizeSkillRoleKey(role?.status) === 'ACTIVE')
      .forEach((role) => {
        const roleKey = normalizeSkillRoleKey(role?.roleKey)
        if (!roleKey) return
        optionMap.set(roleKey, {
          value: roleKey,
          label: role?.label ? `${role.label} (${roleKey})` : roleKey,
        })
      })

    if (normalizedCurrentSkillRoleKey && !optionMap.has(normalizedCurrentSkillRoleKey)) {
      const currentRole = skillRoleRows.find(
        (role) => normalizeSkillRoleKey(role?.roleKey) === normalizedCurrentSkillRoleKey,
      )
      const currentStatus = normalizeSkillRoleKey(currentRole?.status)
      const statusSuffix =
        currentStatus && currentStatus !== 'ACTIVE'
          ? ` — ${currentStatus.toLowerCase()} current value`
          : ''

      optionMap.set(normalizedCurrentSkillRoleKey, {
        value: normalizedCurrentSkillRoleKey,
        label: currentRole?.label
          ? `${currentRole.label} (${normalizedCurrentSkillRoleKey})${statusSuffix}`
          : `${normalizedCurrentSkillRoleKey}${statusSuffix}`,
      })
    }

    return [...optionMap.values()].sort((left, right) => left.label.localeCompare(right.label))
  }, [form.skillRoleKey, skillRoleRows])
  const liveValidation = useMemo(
    () => validateRuntimeSkillForm(
      form,
      existingSkills,
      isEditMode ? skillId : '',
      skillRoleRows,
      loadedSkill?.skillRoleKey ?? '',
    ),
    [existingSkills, form, isEditMode, loadedSkill?.skillRoleKey, skillId, skillRoleRows],
  )
  const isCreateDisabled = useMemo(() => {
    if (isEditMode) return false
    if (isCreating || isCloning) return true
    if (isCloneMode && isSkillLoading) return true
    return Object.keys(liveValidation.errors || {}).length > 0
  }, [isCloneMode, isCloning, isCreating, isEditMode, isSkillLoading, liveValidation.errors])
  const isCreateReady = !isEditMode && !isCreateDisabled

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!isEditMode && !isCloneMode) {
        setForm({
          ...INITIAL_RUNTIME_SKILL_FORM,
        })
        setErrors({})
        setErrorsSource(null)
        setActiveEditorTab(0)
        setShowValidationHints(false)
        return
      }

      if (loadedSkill) {
        const nextForm = mapRuntimeSkillToForm(loadedSkill)
        setForm(isCloneMode
          ? {
              ...nextForm,
              key: '',
              name: `${nextForm.name} Clone`,
              status: RUNTIME_SKILL_STATUSES.DRAFT,
            }
          : nextForm)
        setErrors({})
        setErrorsSource(null)
        setActiveEditorTab(0)
        setShowValidationHints(false)
      }
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [isCloneMode, isEditMode, loadedSkill])

  useEffect(() => {
    if (isEditMode) return

    const liveErrors = liveValidation?.errors && typeof liveValidation.errors === 'object'
      ? liveValidation.errors
      : {}

    const timeoutId = window.setTimeout(() => {
      if (errorsSource === 'client' && showValidationHints) {
        setErrors((current) => (shallowEqualObject(current, liveErrors) ? current : liveErrors))

        if (Object.keys(liveErrors).length === 0) {
          setErrors({})
          setErrorsSource(null)
          setShowValidationHints(false)
        }
      }
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [errorsSource, isEditMode, liveValidation.errors, showValidationHints])

  const navigateToSkills = (options) => {
    navigate('/super-admin/runtime-control/skills', options)
  }

  const handleBackToSkills = () => {
    navigateToSkills()
  }

  const revealValidationErrors = (nextErrors, { showSuccessToast = true } = {}) => {
    const errorsObject = nextErrors && typeof nextErrors === 'object' ? nextErrors : {}

    setErrors(errorsObject)
    setErrorsSource('client')
    setShowValidationHints(true)

    const jumpTargets = [
      { tabIndex: 0, fieldKey: 'supportedFrameworkKeys', focusId: 'runtime-skill-editor-framework-select' },
      { tabIndex: 1, fieldKey: 'category', focusId: 'runtime-skill-editor-category' },
      { tabIndex: 1, fieldKey: 'skillRoleKey', focusId: 'runtime-skill-editor-skill-role' },
      { tabIndex: 1, fieldKey: 'type', focusId: 'runtime-skill-editor-type' },
      { tabIndex: 1, fieldKey: 'executionMode', focusId: 'runtime-skill-editor-execution-mode' },
      { tabIndex: 2, fieldKey: 'inputContract', focusId: 'runtime-skill-editor-input-contract' },
      { tabIndex: 2, fieldKey: 'outputContract', focusId: 'runtime-skill-editor-output-contract' },
      { tabIndex: 2, fieldKey: 'primaryOutputKey', focusId: 'runtime-skill-editor-primary-output-key' },
      { tabIndex: 2, fieldKey: 'outputBindings', focusId: 'runtime-skill-editor-output-bindings' },
      { tabIndex: 2, fieldKey: 'allowedReadPaths', focusId: 'runtime-skill-editor-allowed-read-paths' },
      { tabIndex: 2, fieldKey: 'allowedWritePaths', focusId: 'runtime-skill-editor-allowed-write-paths' },
      { tabIndex: 2, fieldKey: 'forbiddenWritePaths', focusId: 'runtime-skill-editor-forbidden-write-paths' },
      { tabIndex: 2, fieldKey: 'executionConfig', focusId: 'runtime-skill-editor-execution-config' },
      { tabIndex: 3, fieldKey: 'timeoutMs', focusId: 'runtime-skill-editor-timeout' },
      { tabIndex: 3, fieldKey: 'retryPolicy', focusId: 'runtime-skill-editor-retry-policy' },
      { tabIndex: 4, fieldKey: 'referenceAssets', focusId: 'runtime-skill-editor-add-reference-asset' },
    ]

    const firstTabError = jumpTargets.find((target) => errorsObject?.[target.fieldKey])
    if (firstTabError) {
      setActiveEditorTab(firstTabError.tabIndex)
      requestAnimationFrame(() => {
        const el = document.getElementById(firstTabError.focusId)
        if (el && typeof el.focus === 'function') {
          if (typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }
          el.focus()
        }
      })
    }

    if (Object.keys(errorsObject).length === 0) {
      if (showSuccessToast) {
        addToast({
          title: 'All checks passed',
          description: isEditMode ? 'This skill is ready to be saved.' : 'This skill is ready to be created.',
          variant: 'success',
        })
      }
      return
    }

    addToast({
      title: 'Missing required fields',
      description: 'Review the highlighted fields across the editor tabs.',
      variant: 'warning',
    })
  }

  const handleReviewMissingFields = () => {
    const { errors: nextErrors } = validateRuntimeSkillForm(
      form,
      existingSkills,
      isEditMode ? skillId : '',
      skillRoleRows,
      loadedSkill?.skillRoleKey ?? '',
    )
    revealValidationErrors(nextErrors)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors({})
    setErrorsSource(null)

    if (isLockedSkill) {
      addToast({
        title: 'Locked skill',
        description: 'Locked Runtime Control records must be cloned before behavior changes can be saved.',
        variant: 'warning',
      })
      return
    }

    const { errors: nextErrors, payload } = validateRuntimeSkillForm(
      form,
      existingSkills,
      isEditMode ? skillId : '',
      skillRoleRows,
      loadedSkill?.skillRoleKey ?? '',
    )
    if (Object.keys(nextErrors).length > 0) {
      revealValidationErrors(nextErrors, { showSuccessToast: false })
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
      } else if (isCloneMode) {
        await cloneRuntimeSkill({
          skillId: cloneFromSkillId,
          key: payload.key,
          name: payload.name,
          description: payload.description,
        }).unwrap()

        addToast({
          title: 'Skill cloned',
          description: `${payload.name} is now available as an editable draft.`,
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

      navigateToSkills({ state: { runtimeControlSaved: true } })
    } catch (err) {
      const appError = normalizeError(err)
      const field = String(appError?.details?.field ?? '').trim()

      if (field) {
        setErrors({ [field]: appError.message })
        setErrorsSource('server')
        setShowValidationHints(true)
        return
      }

      addToast({
        title: isEditMode
          ? 'Failed to update skill'
          : isCloneMode
            ? 'Failed to clone skill'
            : 'Failed to create skill',
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
        <h1 className="super-admin-skills__title">
          {isEditMode ? 'Skill Editor' : isCloneMode ? 'Clone Skill' : 'Create Skill'}
        </h1>
        <p className="super-admin-skills__subtitle">
          Register reusable runtime skills, control their availability, and align framework
          compatibility before packages and workflow policies reference them.
        </p>
      </header>

      <Fieldset className="super-admin-skills__fieldset super-admin-skill-editor__fieldset">
        <Fieldset.Legend className="sr-only">Runtime skill editor</Fieldset.Legend>
        {loadedSkillId && (isSkillLoading || (!skillAppError && !loadedSkill)) ? <SkillEditorLoadingState /> : null}
        {loadedSkillId && skillAppError ? (
          <SkillEditorErrorState message={skillAppError.message} onBack={handleBackToSkills} />
        ) : null}
        {!isSkillLoading && !skillAppError && (!loadedSkillId || loadedSkill) ? (
          <SkillEditorForm
            isEditMode={isEditMode}
            isCloneMode={isCloneMode}
            isLockedSkill={isLockedSkill}
            form={form}
            setForm={setForm}
            errors={errors}
            validationHints={showValidationHints ? liveValidation.errors : {}}
            frameworkOptions={frameworkOptions}
            skillRoleOptions={skillRoleOptions}
            isSkillRolesLoading={isSkillRolesLoading}
            onBack={handleBackToSkills}
            onClone={() =>
              navigate(`/super-admin/runtime-control/skills/new?cloneFrom=${encodeURIComponent(skillId)}`)
            }
            onCancel={handleBackToSkills}
            onSubmit={handleSubmit}
            onReviewMissingFields={handleReviewMissingFields}
            isSaving={isCreating || isUpdating || isCloning}
            isCreateReady={isCreateReady}
            activeTab={activeEditorTab}
            onTabChange={setActiveEditorTab}
            loadedSkill={loadedSkill}
          />
        ) : null}
      </Fieldset>
    </section>
  )
}

export default SuperAdminSkillEditor
