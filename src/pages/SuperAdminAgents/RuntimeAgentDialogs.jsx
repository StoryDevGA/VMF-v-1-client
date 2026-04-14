import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import {
  formatKeyList,
  INITIAL_RUNTIME_AGENT_FORM,
  parseFrameworkKeyList,
  RUNTIME_AGENT_FORM_STATUS_OPTIONS,
  RUNTIME_AGENT_TYPE_OPTIONS,
  RUNTIME_AGENT_WORKFLOW_OPTIONS,
} from './superAdminAgents.constants.js'
import './RuntimeAgentDialogs.css'

function RuntimeAgentFrameworkField({ prefix, form, setForm, errors, frameworkOptions = [] }) {
  const [pendingFrameworkKey, setPendingFrameworkKey] = useState('')
  const selectedFrameworkKeys = useMemo(
    () => parseFrameworkKeyList(form.supportedFrameworkKeys),
    [form.supportedFrameworkKeys],
  )
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
    if (!pendingFrameworkKey) return

    setForm((current) => ({
      ...current,
      supportedFrameworkKeys: formatKeyList([...selectedFrameworkKeys, pendingFrameworkKey]),
    }))
    setPendingFrameworkKey('')
  }

  const handleRemoveFramework = (frameworkKey) => {
    setForm((current) => ({
      ...current,
      supportedFrameworkKeys: formatKeyList(
        parseFrameworkKeyList(current.supportedFrameworkKeys).filter((value) => value !== frameworkKey),
      ),
    }))
  }

  return (
    <div className="super-admin-agents__framework-picker">
      <div className="super-admin-agents__framework-picker-controls">
        <Select
          id={`${prefix}-framework-select`}
          label="Add Framework"
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
          className="super-admin-agents__framework-add-button"
          onClick={handleAddFramework}
          disabled={!pendingFrameworkKey}
        >
          Add Framework
        </Button>
      </div>

      <p className="super-admin-agents__framework-helper">
        Choose frameworks from the active Framework Registry entries only.
      </p>

      {selectedFrameworkKeys.length > 0 ? (
        <div className="super-admin-agents__framework-list">
          {selectedFrameworkKeys.map((frameworkKey) => (
            <div key={frameworkKey} className="super-admin-agents__framework-item">
              <div className="super-admin-agents__framework-copy">
                <p className="super-admin-agents__framework-label">
                  {frameworkLabelLookup[frameworkKey] ?? frameworkKey}
                </p>
                <p className="super-admin-agents__framework-key">{frameworkKey}</p>
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
        <p className="super-admin-agents__framework-helper">No frameworks selected yet.</p>
      )}

      {errors.supportedFrameworkKeys ? (
        <p className="super-admin-agents__framework-error" role="alert">
          {errors.supportedFrameworkKeys}
        </p>
      ) : null}
    </div>
  )
}

function compilePromptPreview(form) {
  const blocks = [
    { label: 'Base System Prompt', value: String(form.promptBaseSystem ?? '').trim() },
    { label: 'Role Prompt', value: String(form.promptRole ?? '').trim() },
    { label: 'Developer Instructions', value: String(form.developerInstructions ?? '').trim() },
    { label: 'Output Contract Prompt', value: String(form.outputContractPrompt ?? '').trim() },
    { label: 'Forbidden Actions Prompt', value: String(form.forbiddenActionsPrompt ?? '').trim() },
    { label: 'Handoff Prompt', value: String(form.handoffPrompt ?? '').trim() },
  ].filter((block) => block.value)

  if (blocks.length === 0) return ''

  return blocks
    .map((block) => `## ${block.label}\n\n${block.value}`)
    .join('\n\n')
}

function RuntimeAgentWorkflowsField({ prefix, form, setForm }) {
  const selected = useMemo(
    () => new Set(Array.isArray(form.supportedWorkflows) ? form.supportedWorkflows : []),
    [form.supportedWorkflows],
  )

  return (
    <div className="super-admin-agents__workflow-picker">
      <p className="super-admin-agents__workflow-title">Supported Workflows</p>
      <p className="super-admin-agents__workflow-helper">
        Select which workflow modes this agent is allowed to operate under.
      </p>

      <div className="super-admin-agents__workflow-grid" role="group" aria-label="Supported workflows">
        {RUNTIME_AGENT_WORKFLOW_OPTIONS.map((option) => (
          <Tickbox
            key={option.value}
            id={`${prefix}-workflow-${option.value}`}
            label={option.label}
            size="sm"
            checked={selected.has(option.value)}
            onChange={(event) => {
              const next = new Set(Array.isArray(form.supportedWorkflows) ? form.supportedWorkflows : [])
              if (event.target.checked) {
                next.add(option.value)
              } else {
                next.delete(option.value)
              }

              setForm((current) => ({
                ...current,
                supportedWorkflows: [...next].sort(),
              }))
            }}
          />
        ))}
      </div>
    </div>
  )
}

function RuntimeAgentFormFields({ prefix, form, setForm, errors, frameworkOptions }) {
  const compiledPrompt = useMemo(() => compilePromptPreview(form), [form])

  return (
    <div className="super-admin-agents__dialog-body">
      <div className="super-admin-agents__row">
        <Input
          id={`${prefix}-key`}
          label="Agent Key"
          value={form.key}
          onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
          error={errors.key}
          helperText="Stable key used by packages and workflow policies. Example: validator."
          fullWidth
        />

        <Input
          id={`${prefix}-name`}
          label="Agent Name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          error={errors.name}
          fullWidth
        />

        <Select
          id={`${prefix}-status`}
          label="Status"
          value={form.status}
          options={RUNTIME_AGENT_FORM_STATUS_OPTIONS}
          onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
        />

        <Select
          id={`${prefix}-type`}
          label="Agent Type"
          value={form.agentType}
          options={RUNTIME_AGENT_TYPE_OPTIONS}
          onChange={(event) => setForm((current) => ({ ...current, agentType: event.target.value }))}
          error={errors.agentType}
        />
      </div>

      <Textarea
        id={`${prefix}-description`}
        label="Description"
        value={form.description}
        onChange={(event) =>
          setForm((current) => ({ ...current, description: event.target.value }))
        }
        error={errors.description}
        rows={4}
        fullWidth
      />

      <RuntimeAgentFrameworkField
        prefix={prefix}
        form={form}
        setForm={setForm}
        errors={errors}
        frameworkOptions={frameworkOptions}
      />

      <RuntimeAgentWorkflowsField prefix={prefix} form={form} setForm={setForm} />

      <Textarea
        id={`${prefix}-skill-ids`}
        label="Default Skill IDs"
        helperText="Use commas or new lines."
        value={form.defaultSkillIds}
        onChange={(event) =>
          setForm((current) => ({ ...current, defaultSkillIds: event.target.value }))
        }
        error={errors.defaultSkillIds}
        rows={4}
        fullWidth
      />

      <div className="super-admin-agents__row">
        <Textarea
          id={`${prefix}-primary-skill-ids`}
          label="Primary Skill IDs"
          helperText="Use commas or new lines."
          value={form.primarySkillIds}
          onChange={(event) =>
            setForm((current) => ({ ...current, primarySkillIds: event.target.value }))
          }
          error={errors.primarySkillIds}
          rows={4}
          fullWidth
        />

        <Textarea
          id={`${prefix}-optional-skill-ids`}
          label="Optional Skill IDs"
          helperText="Use commas or new lines."
          value={form.optionalSkillIds}
          onChange={(event) =>
            setForm((current) => ({ ...current, optionalSkillIds: event.target.value }))
          }
          error={errors.optionalSkillIds}
          rows={4}
          fullWidth
        />
      </div>

      <div className="super-admin-agents__prompt-section" aria-label="Prompt configuration">
        <p className="super-admin-agents__prompt-title">Prompt Configuration</p>
        <p className="super-admin-agents__prompt-helper">
          Edit prompt blocks. The compiled preview is shown below for quick review.
        </p>

        <Textarea
          id={`${prefix}-prompt-base-system`}
          label="Base System Prompt"
          value={form.promptBaseSystem}
          onChange={(event) => setForm((current) => ({ ...current, promptBaseSystem: event.target.value }))}
          rows={4}
          fullWidth
        />
        <Textarea
          id={`${prefix}-prompt-role`}
          label="Role Prompt"
          value={form.promptRole}
          onChange={(event) => setForm((current) => ({ ...current, promptRole: event.target.value }))}
          rows={4}
          fullWidth
        />
        <Textarea
          id={`${prefix}-prompt-developer`}
          label="Developer Instructions"
          value={form.developerInstructions}
          onChange={(event) => setForm((current) => ({ ...current, developerInstructions: event.target.value }))}
          rows={4}
          fullWidth
        />
        <Textarea
          id={`${prefix}-prompt-output-contract`}
          label="Output Contract Prompt"
          value={form.outputContractPrompt}
          onChange={(event) => setForm((current) => ({ ...current, outputContractPrompt: event.target.value }))}
          rows={3}
          fullWidth
        />
        <Textarea
          id={`${prefix}-prompt-forbidden-actions`}
          label="Forbidden Actions Prompt"
          value={form.forbiddenActionsPrompt}
          onChange={(event) => setForm((current) => ({ ...current, forbiddenActionsPrompt: event.target.value }))}
          rows={3}
          fullWidth
        />
        <Textarea
          id={`${prefix}-prompt-handoff`}
          label="Handoff Prompt"
          value={form.handoffPrompt}
          onChange={(event) => setForm((current) => ({ ...current, handoffPrompt: event.target.value }))}
          rows={3}
          fullWidth
        />
        <Textarea
          id={`${prefix}-prompt-compiled`}
          label="Compiled Prompt Preview"
          value={compiledPrompt}
          readOnly
          rows={6}
          fullWidth
        />
      </div>

      <div className="super-admin-agents__row">
        <Textarea
          id={`${prefix}-input-contract`}
          label="Input Contract (JSON)"
          value={form.inputContractJson}
          onChange={(event) => setForm((current) => ({ ...current, inputContractJson: event.target.value }))}
          error={errors.inputContractJson}
          rows={6}
          fullWidth
        />

        <Textarea
          id={`${prefix}-output-contract`}
          label="Output Contract (JSON)"
          value={form.outputContractJson}
          onChange={(event) => setForm((current) => ({ ...current, outputContractJson: event.target.value }))}
          error={errors.outputContractJson}
          rows={6}
          fullWidth
        />
      </div>

      <div className="super-admin-agents__row">
        <Input
          id={`${prefix}-policy-max-token-budget`}
          label="Max Token Budget"
          helperText="Leave empty for default."
          value={form.policyMaxTokenBudget}
          onChange={(event) => setForm((current) => ({ ...current, policyMaxTokenBudget: event.target.value }))}
          error={errors.policyMaxTokenBudget}
          fullWidth
        />

        <Input
          id={`${prefix}-policy-timeout-ms`}
          label="Timeout (ms)"
          helperText="Leave empty for default."
          value={form.policyTimeoutMs}
          onChange={(event) => setForm((current) => ({ ...current, policyTimeoutMs: event.target.value }))}
          error={errors.policyTimeoutMs}
          fullWidth
        />

        <Input
          id={`${prefix}-policy-retry-policy`}
          label="Retry Policy"
          helperText="Optional policy key (example: None)."
          value={form.policyRetryPolicy}
          onChange={(event) => setForm((current) => ({ ...current, policyRetryPolicy: event.target.value }))}
          fullWidth
        />
      </div>
    </div>
  )
}

function buildSupportedOptionList(values, labelLookup, emptyLabel) {
  const items = Array.isArray(values) ? values.filter(Boolean) : []

  return [
    { value: '', label: emptyLabel },
    ...items.map((value) => ({
      value,
      label: labelLookup?.[value] ?? value,
    })),
  ]
}

export function TestRuntimeAgentDialog({
  open,
  onClose,
  agent,
  testForm,
  setTestForm,
  testErrors,
  testResult,
  frameworkOptions = [],
  onSubmit,
}) {
  const [showPromptPreview, setShowPromptPreview] = useState(false)

  useEffect(() => {
    if (!open) {
      setShowPromptPreview(false)
      return
    }

    // Reset when the dialog is opened or a different agent is selected for testing.
    setShowPromptPreview(false)
  }, [open, agent?.id])
  const frameworkLabelLookup = useMemo(
    () => Object.fromEntries(frameworkOptions.map((option) => [option.value, option.label])),
    [frameworkOptions],
  )

  const workflowLabelLookup = useMemo(
    () => Object.fromEntries(RUNTIME_AGENT_WORKFLOW_OPTIONS.map((option) => [option.value, option.label])),
    [],
  )

  const frameworkKeyOptions = useMemo(
    () =>
      buildSupportedOptionList(
        agent?.supportedFrameworkKeys,
        frameworkLabelLookup,
        'No framework (optional)',
      ),
    [agent?.supportedFrameworkKeys, frameworkLabelLookup],
  )

  const workflowKeyOptions = useMemo(
    () =>
      buildSupportedOptionList(
        agent?.supportedWorkflows,
        workflowLabelLookup,
        'No workflow (optional)',
      ),
    [agent?.supportedWorkflows, workflowLabelLookup],
  )

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <Dialog.Header>
        <h2 className="super-admin-agents__dialog-title">Test Agent</h2>
      </Dialog.Header>
      <Dialog.Body>
        <form id="runtime-agent-test-form" className="super-admin-agents__form" onSubmit={onSubmit} noValidate>
          <p className="super-admin-agents__framework-helper">
            Run a lightweight compatibility check and compiled prompt hash preview for{' '}
            <strong>{agent?.name ? `${agent.name} (${agent.key})` : 'this agent'}</strong>.
          </p>

          <div className="super-admin-agents__row">
            <Select
              id="runtime-agent-test-framework-key"
              label="Framework Key"
              value={testForm.frameworkKey}
              options={frameworkKeyOptions}
              onChange={(event) => setTestForm((current) => ({ ...current, frameworkKey: event.target.value }))}
              helperText="Optional. Used to confirm framework compatibility."
            />

            <Select
              id="runtime-agent-test-workflow-key"
              label="Workflow Key"
              value={testForm.workflowKey}
              options={workflowKeyOptions}
              onChange={(event) => setTestForm((current) => ({ ...current, workflowKey: event.target.value }))}
              helperText="Optional. Used to confirm workflow compatibility."
            />
          </div>

          <div className="super-admin-agents__row">
            <Textarea
              id="runtime-agent-test-input-json"
              label="Input (JSON)"
              value={testForm.inputJson}
              onChange={(event) => setTestForm((current) => ({ ...current, inputJson: event.target.value }))}
              error={testErrors.inputJson}
              rows={7}
              fullWidth
            />

            <Textarea
              id="runtime-agent-test-context-json"
              label="Context (JSON)"
              value={testForm.contextJson}
              onChange={(event) => setTestForm((current) => ({ ...current, contextJson: event.target.value }))}
              error={testErrors.contextJson}
              rows={7}
              fullWidth
            />
          </div>

          {testResult ? (
            <div className="super-admin-agents__test-result" aria-label="Agent test results">
              <p className="super-admin-agents__framework-helper">
                Latest result:{' '}
                {testResult.promptHash ? (
                  <span className="super-admin-agents__test-hash">Prompt hash: {testResult.promptHash}</span>
                ) : (
                  'No prompt hash returned.'
                )}
              </p>

              {Array.isArray(testResult.warnings) && testResult.warnings.length > 0 ? (
                <p className="super-admin-agents__framework-error" role="alert">
                  {testResult.warnings.join(' ')}
                </p>
              ) : null}

              <div className="super-admin-agents__test-details">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="super-admin-agents__test-summary"
                  onClick={() => setShowPromptPreview((current) => !current)}
                  aria-expanded={showPromptPreview ? 'true' : 'false'}
                >
                  {showPromptPreview ? 'Hide compiled prompt preview' : 'Show compiled prompt preview'}
                </Button>

                {showPromptPreview ? (
                  <div className="super-admin-agents__test-preview">
                  <Textarea
                    id="runtime-agent-test-compiled-preview"
                    label="Compiled Prompt (read-only)"
                    value={String(testResult.compiledPromptPreview ?? '')}
                    rows={10}
                    fullWidth
                    readOnly
                  />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </form>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" form="runtime-agent-test-form" variant="primary">
          Run Test
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export function CreateRuntimeAgentDialog({
  open,
  onClose,
  createForm,
  setCreateForm,
  createErrors,
  setCreateErrors,
  frameworkOptions,
  onSubmit,
}) {
  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <Dialog.Header>
        <h2 className="super-admin-agents__dialog-title">Create Agent</h2>
      </Dialog.Header>
      <Dialog.Body>
        <form id="runtime-agent-create-form" className="super-admin-agents__form" onSubmit={onSubmit} noValidate>
          <RuntimeAgentFormFields
            prefix="runtime-agent-create"
            form={createForm}
            setForm={setCreateForm}
            errors={createErrors}
            frameworkOptions={frameworkOptions}
          />
        </form>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setCreateForm({
              ...INITIAL_RUNTIME_AGENT_FORM,
            })
            setCreateErrors({})
          }}
        >
          Reset
        </Button>
        <Button type="submit" form="runtime-agent-create-form" variant="primary">
          Create Agent
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export function EditRuntimeAgentDialog({
  open,
  onClose,
  editForm,
  setEditForm,
  editErrors,
  frameworkOptions,
  onSubmit,
}) {
  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <Dialog.Header>
        <h2 className="super-admin-agents__dialog-title">Update Agent</h2>
      </Dialog.Header>
      <Dialog.Body>
        <RuntimeAgentFormFields
          prefix="runtime-agent-edit"
          form={editForm}
          setForm={setEditForm}
          errors={editErrors}
          frameworkOptions={frameworkOptions}
        />
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSubmit}>
          Save Changes
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
