import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import {
  FRAMEWORK_PACKAGE_FORM_STATUS_OPTIONS,
  FRAMEWORK_PACKAGE_STATUSES,
  INITIAL_FRAMEWORK_PACKAGE_FORM,
} from './superAdminFrameworkPackages.constants.js'
import './FrameworkPackageDialogs.css'

function FrameworkPackageFormFields({
  prefix,
  form,
  setForm,
  errors,
  statusLocked = false,
  frameworkOptions,
  frameworkNameLookup,
}) {
  const frameworkSelectOptions = frameworkOptions.filter((option) => option.value)
  const statusOptions = statusLocked
    ? [{ value: FRAMEWORK_PACKAGE_STATUSES.ACTIVE, label: 'Active' }]
    : FRAMEWORK_PACKAGE_FORM_STATUS_OPTIONS

  return (
    <div className="super-admin-framework-packages__dialog-body">
      <div className="super-admin-framework-packages__row">
        <Select
          id={`${prefix}-framework-key`}
          label="Framework Key"
          value={form.frameworkKey}
          options={frameworkSelectOptions}
          onChange={(event) => {
            const nextKey = event.target.value
            const nextName = frameworkNameLookup[nextKey] ?? ''
            setForm((current) => ({
              ...current,
              frameworkKey: nextKey,
              frameworkName: nextName,
            }))
          }}
          error={errors.frameworkKey}
        />

        <Input
          id={`${prefix}-framework-name`}
          label="Framework Name"
          value={form.frameworkName}
          onChange={(event) =>
            setForm((current) => ({ ...current, frameworkName: event.target.value }))
          }
          error={errors.frameworkName}
          fullWidth
        />

        <Input
          id={`${prefix}-version`}
          label="Version"
          value={form.version}
          onChange={(event) =>
            setForm((current) => ({ ...current, version: event.target.value }))
          }
          error={errors.version}
          helperText="Use semantic version format, for example 2.3.1."
          fullWidth
        />
      </div>

      <div className="super-admin-framework-packages__row">
        <Select
          id={`${prefix}-status`}
          label="Lifecycle State"
          value={form.status}
          options={statusOptions}
          onChange={(event) =>
            setForm((current) => ({ ...current, status: event.target.value }))
          }
          disabled={statusLocked}
        />

        <Textarea
          id={`${prefix}-description`}
          label="Description"
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
          error={errors.description}
          rows={3}
          fullWidth
        />
      </div>

      <div className="super-admin-framework-packages__row">
        <Textarea
          id={`${prefix}-workflow-keys`}
          label="Compatible Workflow Keys"
          helperText="Use commas or new lines."
          value={form.compatibleWorkflowKeys}
          onChange={(event) =>
            setForm((current) => ({ ...current, compatibleWorkflowKeys: event.target.value }))
          }
          error={errors.compatibleWorkflowKeys}
          rows={4}
          fullWidth
        />

        <Textarea
          id={`${prefix}-agent-ids`}
          label="Default Agent IDs"
          helperText="Use commas or new lines."
          value={form.defaultAgentIds}
          onChange={(event) =>
            setForm((current) => ({ ...current, defaultAgentIds: event.target.value }))
          }
          error={errors.defaultAgentIds}
          rows={4}
          fullWidth
        />
      </div>

      <div className="super-admin-framework-packages__row">
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

        <Textarea
          id={`${prefix}-required-sections`}
          label="Required Sections"
          helperText="Use commas or new lines."
          value={form.requiredSections}
          onChange={(event) =>
            setForm((current) => ({ ...current, requiredSections: event.target.value }))
          }
          rows={4}
          fullWidth
        />
      </div>

      <Textarea
        id={`${prefix}-publish-checks`}
        label="Publish Checks"
        helperText="Use commas or new lines."
        value={form.publishChecks}
        onChange={(event) =>
          setForm((current) => ({ ...current, publishChecks: event.target.value }))
        }
        rows={4}
        fullWidth
      />

      <div className="super-admin-framework-packages__capabilities">
        <Tickbox
          id={`${prefix}-supports-preview`}
          label="Supports preview mode"
          checked={form.supportsPreviewMode}
          onChange={(event) =>
            setForm((current) => ({ ...current, supportsPreviewMode: event.target.checked }))
          }
        />
        <Tickbox
          id={`${prefix}-supports-report`}
          label="Supports full report"
          checked={form.supportsFullReport}
          onChange={(event) =>
            setForm((current) => ({ ...current, supportsFullReport: event.target.checked }))
          }
        />
        <Tickbox
          id={`${prefix}-requires-validation`}
          label="Requires validation before publish"
          checked={form.requiresValidationBeforePublish}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              requiresValidationBeforePublish: event.target.checked,
            }))
          }
        />
      </div>
    </div>
  )
}

export function CreateFrameworkPackageDialog({
  open,
  onClose,
  createForm,
  setCreateForm,
  createErrors,
  setCreateErrors,
  onSubmit,
  frameworkOptions,
  frameworkNameLookup,
}) {
  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <Dialog.Header>
        <h2 className="super-admin-framework-packages__dialog-title">
          Create Framework Package
        </h2>
      </Dialog.Header>
      <Dialog.Body>
        <form
          id="framework-package-create-form"
          className="super-admin-framework-packages__form"
          onSubmit={onSubmit}
          noValidate
        >
          <FrameworkPackageFormFields
            prefix="framework-package-create"
            form={createForm}
            setForm={setCreateForm}
            errors={createErrors}
            frameworkOptions={frameworkOptions}
            frameworkNameLookup={frameworkNameLookup}
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
              ...INITIAL_FRAMEWORK_PACKAGE_FORM,
            })
            setCreateErrors({})
          }}
        >
          Reset
        </Button>
        <Button type="submit" form="framework-package-create-form" variant="primary">
          Create Framework Package
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export function EditFrameworkPackageDialog({
  open,
  onClose,
  editForm,
  setEditForm,
  editErrors,
  onSubmit,
  frameworkOptions,
  frameworkNameLookup,
}) {
  const statusLocked = editForm.status === FRAMEWORK_PACKAGE_STATUSES.ACTIVE

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <Dialog.Header>
        <h2 className="super-admin-framework-packages__dialog-title">
          Update Framework Package
        </h2>
      </Dialog.Header>
      <Dialog.Body>
        <FrameworkPackageFormFields
          prefix="framework-package-edit"
          form={editForm}
          setForm={setEditForm}
          errors={editErrors}
          frameworkOptions={frameworkOptions}
          frameworkNameLookup={frameworkNameLookup}
          statusLocked={statusLocked}
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
