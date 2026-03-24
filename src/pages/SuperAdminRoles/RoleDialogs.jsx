import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import {
  INITIAL_ROLE_FORM,
  ROLE_FORM_SCOPE_OPTIONS,
} from './superAdminRoles.constants.js'
import './RoleDialogs.css'

export function CreateRoleDialog({
  open,
  onClose,
  createForm,
  setCreateForm,
  createErrors,
  setCreateErrors,
  onSubmit,
  isLoading,
}) {
  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <Dialog.Header>
        <h2 className="super-admin-roles__dialog-title">Create Role</h2>
      </Dialog.Header>
      <Dialog.Body className="super-admin-roles__dialog-body">
        <form className="super-admin-roles__form" onSubmit={onSubmit} noValidate>
          <Input
            id="role-create-key"
            label="Role Key"
            value={createForm.key}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, key: event.target.value }))
            }
            error={createErrors.key}
            helperText="Uppercase key used in governance payloads (for example VMF_CREATOR)."
            required
            fullWidth
          />

          <Input
            id="role-create-name"
            label="Name"
            value={createForm.name}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, name: event.target.value }))
            }
            error={createErrors.name}
            required
            fullWidth
          />

          <Select
            id="role-create-scope"
            label="Scope"
            value={createForm.scope}
            options={ROLE_FORM_SCOPE_OPTIONS}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, scope: event.target.value }))
            }
            error={createErrors.scope}
            required
          />

          <Textarea
            id="role-create-description"
            label="Description (Optional)"
            value={createForm.description}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, description: event.target.value }))
            }
            error={createErrors.description}
            rows={3}
            fullWidth
          />

          <Textarea
            id="role-create-permissions"
            label="Permissions"
            helperText="Use commas, pipes, semicolons, or new lines."
            value={createForm.permissions}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, permissions: event.target.value }))
            }
            error={createErrors.permissions}
            rows={5}
            fullWidth
          />

          <Tickbox
            id="role-create-active"
            label="Active"
            checked={createForm.isActive}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, isActive: event.target.checked }))
            }
          />

          <div className="super-admin-roles__form-actions">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
            >
              Create Role
            </Button>
            <Button
              type="button"
              variant="outline"
              fullWidth
              disabled={isLoading}
              onClick={() => {
                setCreateForm(INITIAL_ROLE_FORM)
                setCreateErrors({})
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </Dialog.Body>
    </Dialog>
  )
}

export function EditRoleDialog({
  open,
  onClose,
  editForm,
  setEditForm,
  editErrors,
  onSubmit,
  isLoading,
  isFetchingSelected,
  selectedAppError,
  selectedRoleIsSystem,
}) {
  return (
    <Dialog open={open} onClose={onClose} size="md">
      <Dialog.Header>
        <h2 className="super-admin-roles__dialog-title">Update Role</h2>
      </Dialog.Header>
      <Dialog.Body className="super-admin-roles__dialog-body">
        {selectedRoleIsSystem ? (
          <p className="super-admin-roles__muted" role="status">
            System roles are protected and remain read-only.
          </p>
        ) : null}

        {selectedAppError ? (
          <p className="super-admin-roles__error" role="alert">
            {selectedAppError.message}
          </p>
        ) : null}

        {editErrors.form ? (
          <p className="super-admin-roles__error" role="alert">
            {editErrors.form}
          </p>
        ) : null}

        <Input
          id="role-edit-key"
          label="Role Key"
          value={editForm.key}
          fullWidth
          disabled
        />

        <Input
          id="role-edit-name"
          label="Name"
          value={editForm.name}
          onChange={(event) =>
            setEditForm((current) => ({ ...current, name: event.target.value }))
          }
          error={editErrors.name}
          required
          fullWidth
          disabled={isFetchingSelected || selectedRoleIsSystem}
        />

        <Select
          id="role-edit-scope"
          label="Scope"
          value={editForm.scope}
          options={ROLE_FORM_SCOPE_OPTIONS}
          onChange={(event) =>
            setEditForm((current) => ({ ...current, scope: event.target.value }))
          }
          error={editErrors.scope}
          required
          disabled={isFetchingSelected || selectedRoleIsSystem}
        />

        <Textarea
          id="role-edit-description"
          label="Description"
          value={editForm.description}
          onChange={(event) =>
            setEditForm((current) => ({ ...current, description: event.target.value }))
          }
          error={editErrors.description}
          rows={3}
          fullWidth
          disabled={isFetchingSelected || selectedRoleIsSystem}
        />

        <Textarea
          id="role-edit-permissions"
          label="Permissions"
          value={editForm.permissions}
          onChange={(event) =>
            setEditForm((current) => ({ ...current, permissions: event.target.value }))
          }
          error={editErrors.permissions}
          rows={5}
          fullWidth
          disabled={isFetchingSelected || selectedRoleIsSystem}
        />

        <Tickbox
          id="role-edit-active"
          label="Active"
          checked={editForm.isActive}
          onChange={(event) =>
            setEditForm((current) => ({ ...current, isActive: event.target.checked }))
          }
          disabled={isFetchingSelected || selectedRoleIsSystem}
        />
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          loading={isLoading}
          disabled={isLoading || isFetchingSelected || selectedRoleIsSystem}
        >
          Save Changes
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

