import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import {
  INITIAL_WORKFLOW_POLICY_FORM,
  WORKFLOW_POLICY_FORM_STATUS_OPTIONS,
} from './superAdminWorkflowPolicies.constants.js'
import './WorkflowPolicyDialogs.css'

function WorkflowPolicyFormFields({ prefix, form, setForm, errors }) {
  return (
    <div className="super-admin-workflow-policies__dialog-body">
      <div className="super-admin-workflow-policies__row">
        <Input
          id={`${prefix}-key`}
          label="Workflow Policy Key"
          value={form.key}
          onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
          error={errors.key}
          helperText="Stable key used by framework packages. Example: vmf-publish."
          fullWidth
        />

        <Input
          id={`${prefix}-name`}
          label="Workflow Policy Name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          error={errors.name}
          fullWidth
        />

        <Select
          id={`${prefix}-status`}
          label="Status"
          value={form.status}
          options={WORKFLOW_POLICY_FORM_STATUS_OPTIONS}
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

      <div className="super-admin-workflow-policies__row">
        <Textarea
          id={`${prefix}-framework-keys`}
          label="Framework Keys"
          helperText="Use commas or new lines. Supported values in this phase are VMF and RLD."
          value={form.frameworkKeys}
          onChange={(event) =>
            setForm((current) => ({ ...current, frameworkKeys: event.target.value }))
          }
          error={errors.frameworkKeys}
          rows={4}
          fullWidth
        />

        <Textarea
          id={`${prefix}-ordered-steps`}
          label="Ordered Steps"
          helperText="Use commas or new lines."
          value={form.orderedSteps}
          onChange={(event) =>
            setForm((current) => ({ ...current, orderedSteps: event.target.value }))
          }
          error={errors.orderedSteps}
          rows={4}
          fullWidth
        />
      </div>

      <div className="super-admin-workflow-policies__row">
        <Textarea
          id={`${prefix}-agent-ids`}
          label="Required Agent IDs"
          helperText="Use commas or new lines."
          value={form.requiredAgentIds}
          onChange={(event) =>
            setForm((current) => ({ ...current, requiredAgentIds: event.target.value }))
          }
          error={errors.requiredAgentIds}
          rows={4}
          fullWidth
        />

        <Textarea
          id={`${prefix}-skill-ids`}
          label="Required Skill IDs"
          helperText="Use commas or new lines."
          value={form.requiredSkillIds}
          onChange={(event) =>
            setForm((current) => ({ ...current, requiredSkillIds: event.target.value }))
          }
          error={errors.requiredSkillIds}
          rows={4}
          fullWidth
        />
      </div>

      <Textarea
        id={`${prefix}-gating-rules`}
        label="Gating Rules"
        helperText="Use commas or new lines."
        value={form.gatingRules}
        onChange={(event) =>
          setForm((current) => ({ ...current, gatingRules: event.target.value }))
        }
        error={errors.gatingRules}
        rows={4}
        fullWidth
      />
    </div>
  )
}

export function CreateWorkflowPolicyDialog({
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
        <h2 className="super-admin-workflow-policies__dialog-title">Create Workflow Policy</h2>
      </Dialog.Header>
      <Dialog.Body>
        <form
          id="workflow-policy-create-form"
          className="super-admin-workflow-policies__form"
          onSubmit={onSubmit}
          noValidate
        >
          <WorkflowPolicyFormFields
            prefix="workflow-policy-create"
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
              ...INITIAL_WORKFLOW_POLICY_FORM,
            })
            setCreateErrors({})
          }}
        >
          Reset
        </Button>
        <Button type="submit" form="workflow-policy-create-form" variant="primary">
          Create Workflow Policy
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export function EditWorkflowPolicyDialog({
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
        <h2 className="super-admin-workflow-policies__dialog-title">Update Workflow Policy</h2>
      </Dialog.Header>
      <Dialog.Body>
        <WorkflowPolicyFormFields
          prefix="workflow-policy-edit"
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
