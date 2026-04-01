import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import {
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
        <form
          id="super-admin-role-create-form"
          className="super-admin-roles__form"
          onSubmit={onSubmit}
          noValidate
        >
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

          <p className="super-admin-roles__muted" role="note">
            Permissions are assigned from the matrix after the role is created.
          </p>

          <Tickbox
            id="role-create-active"
            label="Active"
            checked={createForm.isActive}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, isActive: event.target.checked }))
            }
          />
        </form>
      </Dialog.Body>
      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={onClose}
        >
          Back
        </Button>
        <Button
          type="submit"
          form="super-admin-role-create-form"
          variant="primary"
          loading={isLoading}
          disabled={isLoading}
        >
          Create
        </Button>
      </Dialog.Footer>
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
        <form
          id="super-admin-role-edit-form"
          className="super-admin-roles__form"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
          noValidate
        >
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

          {!selectedRoleIsSystem ? (
            <p className="super-admin-roles__muted" role="note">
              Permissions are managed from the role matrix on the main page.
            </p>
          ) : null}

          <Tickbox
            id="role-edit-active"
            label="Active"
            checked={editForm.isActive}
            onChange={(event) =>
              setEditForm((current) => ({ ...current, isActive: event.target.checked }))
            }
            disabled={isFetchingSelected || selectedRoleIsSystem}
          />
        </form>
      </Dialog.Body>
      <Dialog.Footer>
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Back
        </Button>
        <Button
          type="submit"
          form="super-admin-role-edit-form"
          variant="primary"
          loading={isLoading}
          disabled={isLoading || isFetchingSelected || selectedRoleIsSystem}
        >
          Save Changes
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export function ConfirmDeleteRoleDialog({ open, onClose, onConfirm, role, isLoading }) {
  const roleName = role?.name ?? role?.key ?? 'this role'

  return (
    <Dialog open={open} onClose={onClose} size="sm">
      <Dialog.Header>
        <h2 className="super-admin-roles__dialog-title">Delete Role</h2>
      </Dialog.Header>
      <Dialog.Body className="super-admin-roles__dialog-body">
        <p className="super-admin-roles__confirm-copy">
          Are you sure you want to delete <strong>{roleName}</strong>? This action cannot be
          undone.
        </p>
      </Dialog.Body>
      <Dialog.Footer>
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={onConfirm}
          loading={isLoading}
          disabled={isLoading}
        >
          Delete
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
