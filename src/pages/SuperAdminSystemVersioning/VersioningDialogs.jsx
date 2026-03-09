import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Button } from '../../components/Button'
import { StepUpAuthForm } from '../../components/StepUpAuthForm'
import './VersioningDialogs.css'

export function EditMetadataDialog({
  open,
  onClose,
  editName,
  setEditName,
  editDescription,
  setEditDescription,
  editError,
  setEditError,
  setEditStepUpToken,
  onSubmit,
  isLoading,
}) {
  return (
    <Dialog open={open} onClose={onClose} size="md">
      <Dialog.Header>
        <h2 className="super-admin-system-versioning__dialog-title">
          Update Policy Metadata
        </h2>
      </Dialog.Header>
      <Dialog.Body className="super-admin-system-versioning__dialog-body">
        <p className="super-admin-system-versioning__dialog-subtitle">
          Update the policy name and description for this version. Rules are
          managed when creating a new policy version.
        </p>
        <Input
          id="edit-policy-name"
          label="Policy Name"
          value={editName}
          onChange={(event) => {
            setEditName(event.target.value)
            setEditError('')
          }}
          required
          fullWidth
        />
        <Textarea
          id="edit-policy-description"
          label="Description"
          value={editDescription}
          onChange={(event) => {
            setEditDescription(event.target.value)
            setEditError('')
          }}
          rows={4}
          fullWidth
        />
        {editError ? (
          <p className="super-admin-system-versioning__error" role="alert">
            {editError}
          </p>
        ) : null}

        <StepUpAuthForm
          onStepUpComplete={(token) => {
            setEditStepUpToken(token)
            setEditError('')
          }}
          onCancel={onClose}
        />
      </Dialog.Body>
      <Dialog.Footer>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          loading={isLoading}
          disabled={isLoading}
        >
          Save Metadata
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
