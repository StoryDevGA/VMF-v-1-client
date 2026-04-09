import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import {
  INITIAL_RUNTIME_AGENT_FORM,
  RUNTIME_AGENT_FORM_STATUS_OPTIONS,
} from './superAdminAgents.constants.js'
import './RuntimeAgentDialogs.css'

function RuntimeAgentFormFields({ prefix, form, setForm, errors }) {
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

      <div className="super-admin-agents__row">
        <Textarea
          id={`${prefix}-framework-keys`}
          label="Supported Framework Keys"
          helperText="Use commas or new lines. Supported values come from the Framework Registry."
          value={form.supportedFrameworkKeys}
          onChange={(event) =>
            setForm((current) => ({ ...current, supportedFrameworkKeys: event.target.value }))
          }
          error={errors.supportedFrameworkKeys}
          rows={4}
          fullWidth
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
