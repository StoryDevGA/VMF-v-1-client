import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import {
  INITIAL_RUNTIME_SKILL_FORM,
  RUNTIME_SKILL_FORM_STATUS_OPTIONS,
} from './superAdminSkills.constants.js'
import './RuntimeSkillDialogs.css'

function RuntimeSkillFormFields({ prefix, form, setForm, errors }) {
  return (
    <div className="super-admin-skills__dialog-body">
      <div className="super-admin-skills__row">
        <Input
          id={`${prefix}-key`}
          label="Skill Key"
          value={form.key}
          onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
          error={errors.key}
          helperText="Stable key used by packages, agents, and workflow policies. Example: snapshot."
          fullWidth
        />

        <Input
          id={`${prefix}-name`}
          label="Skill Name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          error={errors.name}
          fullWidth
        />

        <Select
          id={`${prefix}-status`}
          label="Status"
          value={form.status}
          options={RUNTIME_SKILL_FORM_STATUS_OPTIONS}
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
    </div>
  )
}

export function CreateRuntimeSkillDialog({
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
        <h2 className="super-admin-skills__dialog-title">Create Skill</h2>
      </Dialog.Header>
      <Dialog.Body>
        <form id="runtime-skill-create-form" className="super-admin-skills__form" onSubmit={onSubmit} noValidate>
          <RuntimeSkillFormFields
            prefix="runtime-skill-create"
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
              ...INITIAL_RUNTIME_SKILL_FORM,
            })
            setCreateErrors({})
          }}
        >
          Reset
        </Button>
        <Button type="submit" form="runtime-skill-create-form" variant="primary">
          Create Skill
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export function EditRuntimeSkillDialog({
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
        <h2 className="super-admin-skills__dialog-title">Update Skill</h2>
      </Dialog.Header>
      <Dialog.Body>
        <RuntimeSkillFormFields
          prefix="runtime-skill-edit"
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
