import { Dialog } from '../../components/Dialog'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { StepUpAuthForm } from '../../components/StepUpAuthForm'
import './InvitationDialogs.css'

export function ResendDialog({
  open,
  onClose,
  selectedInvitation,
  onConfirm,
  isLoading,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      closeOnBackdropClick={!isLoading}
    >
      <Dialog.Header>
        <h2 className="super-admin-invitations__dialog-title">
          Resend Invitation
        </h2>
      </Dialog.Header>
      <Dialog.Body>
        <p className="super-admin-invitations__dialog-subtitle">
          A new invitation email will be sent to{' '}
          <strong>{selectedInvitation?.recipientEmail ?? '--'}</strong>.
          The previous invitation link will be invalidated.
        </p>
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
          onClick={onConfirm}
          loading={isLoading}
          disabled={isLoading}
        >
          Confirm Resend
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export function RevokeDialog({
  open,
  onClose,
  selectedInvitation,
  onConfirm,
  isLoading,
  revokeReason,
  setRevokeReason,
  revokeReasonError,
  setRevokeReasonError,
  revokeStepUpToken,
  setRevokeStepUpToken,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      closeOnBackdropClick={!isLoading}
    >
      <Dialog.Header>
        <h2 className="super-admin-invitations__dialog-title">
          Revoke Invitation
        </h2>
      </Dialog.Header>
      <Dialog.Body>
        <p className="super-admin-invitations__dialog-subtitle">
          Revoke invitation for {selectedInvitation?.recipientEmail ?? '--'}.
        </p>

        <Input
          id="revoke-invitation-reason"
          name="revoke-invitation-reason"
          label="Reason"
          value={revokeReason}
          onChange={(event) => {
            setRevokeReason(event.target.value)
            setRevokeReasonError('')
          }}
          autoComplete="off"
          error={revokeReasonError}
          required
          fullWidth
        />

        <StepUpAuthForm
          onStepUpComplete={(token) => {
            setRevokeStepUpToken(token)
            setRevokeReasonError('')
          }}
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
          variant="danger"
          onClick={onConfirm}
          loading={isLoading}
          disabled={
            isLoading ||
            !revokeReason.trim() ||
            !revokeStepUpToken
          }
        >
          Confirm Revoke
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export function AuthLinkDialog({
  open,
  onClose,
  lastAuthLink,
  addToast,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
    >
      <Dialog.Header>
        <h2 className="super-admin-invitations__dialog-title">
          Auth Link (Dev Mode)
        </h2>
      </Dialog.Header>
      <Dialog.Body>
        <p className="super-admin-invitations__dialog-subtitle">
          Email is in mock mode. Use this link to simulate the invitation
          auth flow:
        </p>
        <div className="super-admin-invitations__auth-link-box">
          <code className="super-admin-invitations__auth-link-code">
            {lastAuthLink}
          </code>
        </div>
      </Dialog.Body>
      <Dialog.Footer>
        <Button
          variant="outline"
          onClick={onClose}
        >
          Close
        </Button>
        <Button
          variant="primary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(lastAuthLink)
              addToast({
                title: 'Copied',
                description: 'Auth link copied to clipboard.',
                variant: 'success',
              })
            } catch {
              addToast({
                title: 'Copy failed',
                description: 'Could not copy to clipboard. Select and copy manually.',
                variant: 'warning',
              })
            }
          }}
        >
          Copy Link
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
