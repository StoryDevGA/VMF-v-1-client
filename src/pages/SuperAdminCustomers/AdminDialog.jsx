import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Accordion } from '../../components/Accordion'
import { StepUpAuthForm } from '../../components/StepUpAuthForm'
import { REPLACE_ADMIN_HELP_ITEMS } from './superAdminCustomers.constants.js'
import './AdminDialog.css'

export function AdminDialog({
  open,
  onClose,
  mode,
  customer,
  recipientName,
  onRecipientNameChange,
  recipientEmail,
  onRecipientEmailChange,
  userId,
  onUserIdChange,
  reason,
  onReasonChange,
  stepUpToken,
  onStepUpComplete,
  error,
  onErrorClear,
  loading,
  onSubmit,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size={mode === 'replace' ? 'lg' : 'md'}
      className={[
        'super-admin-customers__admin-dialog',
        mode === 'replace' ? 'super-admin-customers__admin-dialog--replace' : '',
      ].filter(Boolean).join(' ')}
      closeOnBackdropClick={!loading}
    >
      <Dialog.Header>
        <h2 className="super-admin-customers__dialog-title">
          {mode === 'assign' ? 'Assign Customer Admin' : 'Replace Customer Admin'}
        </h2>
      </Dialog.Header>
      <Dialog.Body className="super-admin-customers__dialog-body">
        <p className="super-admin-customers__dialog-subtitle">
          Customer: <strong>{customer?.name ?? '--'}</strong>
        </p>
        {mode === 'assign' ? (
          <>
            <Input
              id="sa-admin-recipient-name"
              name="sa-admin-recipient-name"
              label="Full Name"
              value={recipientName}
              onChange={(event) => {
                onRecipientNameChange(event.target.value)
                onErrorClear()
              }}
              autoComplete="off"
              fullWidth
            />
            <Input
              id="sa-admin-recipient-email"
              name="sa-admin-recipient-email"
              type="email"
              label="Email"
              value={recipientEmail}
              onChange={(event) => {
                onRecipientEmailChange(event.target.value)
                onErrorClear()
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              fullWidth
            />
          </>
        ) : (
          <div className="super-admin-customers__replace-admin-layout">
            <Accordion
              variant="outlined"
              className="super-admin-customers__replace-help"
            >
              {REPLACE_ADMIN_HELP_ITEMS.map((item) => (
                <Accordion.Item
                  key={item.id}
                  id={item.id}
                  className="super-admin-customers__replace-help-item"
                >
                  <Accordion.Header
                    itemId={item.id}
                    className="super-admin-customers__replace-help-header"
                  >
                    {item.title}
                  </Accordion.Header>
                  <Accordion.Content
                    itemId={item.id}
                    className="super-admin-customers__replace-help-content"
                  >
                    <p className="super-admin-customers__replace-help-detail">{item.detail}</p>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion>
            <div className="super-admin-customers__replace-admin-fields">
              <Input
                id="sa-admin-user-id"
                label="Existing User ID"
                value={userId}
                onChange={(event) => {
                  onUserIdChange(event.target.value)
                  onErrorClear()
                }}
                fullWidth
              />
            </div>
          </div>
        )}
        {mode === 'replace' ? (
          <div className="super-admin-customers__replace-admin-fields">
            <Textarea
              id="sa-admin-reason"
              label="Reason"
              value={reason}
              onChange={(event) => {
                onReasonChange(event.target.value)
                onErrorClear()
              }}
              rows={3}
              fullWidth
            />
            <div className="super-admin-customers__replace-admin-step-up">
              <StepUpAuthForm
                passwordLabel="Current Super Admin Password"
                passwordHelperText="Enter your current Super Admin password to verify this replacement."
                onStepUpComplete={(token) => {
                  onStepUpComplete(token)
                  onErrorClear()
                }}
              />
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="super-admin-customers__error" role="alert">
            {error}
          </p>
        ) : null}
      </Dialog.Body>
      <Dialog.Footer className="super-admin-customers__admin-dialog-footer">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          loading={loading}
          disabled={loading || (mode === 'replace' && !stepUpToken)}
        >
          {mode === 'assign' ? 'Send Invitation' : 'Replace Admin'}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
