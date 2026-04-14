import { useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import {
  formatKeyList,
  INITIAL_RUNTIME_AGENT_FORM,
  parseFrameworkKeyList,
  RUNTIME_AGENT_FORM_STATUS_OPTIONS,
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

function RuntimeAgentFormFields({ prefix, form, setForm, errors, frameworkOptions }) {
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
    </div>
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
