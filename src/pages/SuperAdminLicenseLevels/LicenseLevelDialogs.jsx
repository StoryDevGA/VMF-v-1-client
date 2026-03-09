import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { Button } from '../../components/Button'
import { INITIAL_FORM } from './superAdminLicenseLevels.constants.js'
import './LicenseLevelDialogs.css'

export function CreateDialog({
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
        <h2 className="super-admin-license-levels__dialog-title">Create Licence Level</h2>
      </Dialog.Header>
      <Dialog.Body className="super-admin-license-levels__dialog-body">
        <form
          className="super-admin-license-levels__form"
          onSubmit={onSubmit}
          noValidate
        >
          <Input
            id="license-level-name"
            label="Name"
            value={createForm.name}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, name: event.target.value }))
            }
            error={createErrors.name}
            required
            fullWidth
          />

          <Textarea
            id="license-level-description"
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
            id="license-level-entitlements"
            label="Feature Entitlements"
            helperText="Use commas/new lines. Optional brackets/quotes are ignored."
            value={createForm.entitlements}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, entitlements: event.target.value }))
            }
            error={createErrors.entitlements}
            rows={6}
            fullWidth
          />

          <Tickbox
            id="license-level-is-active"
            label="Active"
            checked={createForm.isActive}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, isActive: event.target.checked }))
            }
          />

          <div className="super-admin-license-levels__form-actions">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
            >
              Create Licence Level
            </Button>
            <Button
              type="button"
              variant="outline"
              fullWidth
              disabled={isLoading}
              onClick={() => {
                setCreateForm(INITIAL_FORM)
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

export function EditDialog({
  open,
  onClose,
  editForm,
  setEditForm,
  editErrors,
  onSubmit,
  isLoading,
  isFetchingSelected,
  selectedAppError,
}) {
  return (
    <Dialog open={open} onClose={onClose} size="md">
      <Dialog.Header>
        <h2 className="super-admin-license-levels__dialog-title">Update Licence Level</h2>
      </Dialog.Header>
      <Dialog.Body className="super-admin-license-levels__dialog-body">
        {selectedAppError ? (
          <p className="super-admin-license-levels__error" role="alert">
            {selectedAppError.message}
          </p>
        ) : null}

        <Input
          id="license-level-edit-name"
          label="Name"
          value={editForm.name}
          onChange={(event) =>
            setEditForm((current) => ({ ...current, name: event.target.value }))
          }
          error={editErrors.name}
          required
          fullWidth
          disabled={isFetchingSelected}
        />

        <Textarea
          id="license-level-edit-description"
          label="Description"
          value={editForm.description}
          onChange={(event) =>
            setEditForm((current) => ({ ...current, description: event.target.value }))
          }
          error={editErrors.description}
          rows={3}
          fullWidth
          disabled={isFetchingSelected}
        />

        <Textarea
          id="license-level-edit-entitlements"
          label="Feature Entitlements"
          value={editForm.entitlements}
          onChange={(event) =>
            setEditForm((current) => ({ ...current, entitlements: event.target.value }))
          }
          error={editErrors.entitlements}
          rows={6}
          fullWidth
          disabled={isFetchingSelected}
        />

        <Tickbox
          id="license-level-edit-is-active"
          label="Active"
          checked={editForm.isActive}
          onChange={(event) =>
            setEditForm((current) => ({ ...current, isActive: event.target.checked }))
          }
          disabled={isFetchingSelected}
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
          disabled={isLoading || isFetchingSelected}
        >
          Save Changes
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
