import { MdCheckCircle, MdInfoOutline, MdOutlineWarningAmber } from 'react-icons/md'
import { Button } from '../Button'
import { Dialog } from '../Dialog'
import './ConfirmationDialog.css'

const getConfirmButtonVariant = (variant) => {
  if (variant === 'danger') return 'danger'
  if (variant === 'warning') return 'warning'
  return 'primary'
}

const getDialogIcon = (variant) => {
  if (variant === 'danger' || variant === 'warning') {
    return <MdOutlineWarningAmber aria-hidden="true" />
  }
  if (variant === 'success') {
    return <MdCheckCircle aria-hidden="true" />
  }
  return <MdInfoOutline aria-hidden="true" />
}

export function ConfirmationDialog({
  open,
  title,
  message,
  detail,
  eyebrow = 'Confirmation',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onCancel,
  onConfirm,
}) {
  const normalizedTitle = String(title || 'Confirm action').trim()
  const normalizedMessage = String(message || 'Confirm this action before continuing.').trim()
  const normalizedDetail = String(detail || '').trim()
  const normalizedEyebrow = String(eyebrow || '').trim()
  const confirmVariant = getConfirmButtonVariant(variant)

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      size="sm"
      className={`confirmation-dialog confirmation-dialog--${variant}`}
      closeOnBackdropClick={!loading}
      closeOnEscape={!loading}
      showCloseButton={!loading}
      aria-label={normalizedTitle}
    >
      <Dialog.Header className="confirmation-dialog__header">
        <span className={`confirmation-dialog__icon confirmation-dialog__icon--${variant}`}>
          {getDialogIcon(variant)}
        </span>
        <div className="confirmation-dialog__heading">
          {normalizedEyebrow ? (
            <span className="confirmation-dialog__eyebrow">{normalizedEyebrow}</span>
          ) : null}
          <h2>{normalizedTitle}</h2>
        </div>
      </Dialog.Header>
      <Dialog.Body className="confirmation-dialog__body">
        <p>{normalizedMessage}</p>
        {normalizedDetail ? (
          <p className="confirmation-dialog__detail">{normalizedDetail}</p>
        ) : null}
      </Dialog.Body>
      <Dialog.Footer className="confirmation-dialog__footer">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={confirmVariant}
          size="sm"
          aria-label={confirmLabel}
          loading={loading}
          disabled={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export default ConfirmationDialog
