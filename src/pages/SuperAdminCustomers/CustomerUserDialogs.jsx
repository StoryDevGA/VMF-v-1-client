import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Tickbox } from '../../components/Tickbox'
import { useToaster } from '../../components/Toaster'
import {
  USER_CREATE_MODE_OPTIONS,
  USER_CREATE_ROLE_OPTIONS,
} from './superAdminCustomers.constants.js'
import { getLifecycleActionVerb } from './superAdminCustomers.utils.js'
import './CustomerUserDialogs.css'

export function CreateUserDialog({
  open,
  onClose,
  customerName,
  mode,
  onModeChange,
  name,
  onNameChange,
  email,
  onEmailChange,
  existingUserId,
  onExistingUserIdChange,
  roles,
  onToggleRole,
  roleOptions,
  errors,
  onClearError,
  isSubmitting,
  onSubmit,
}) {
  return (
    <Dialog open={open} onClose={onClose} size="md">
      <Dialog.Header>
        <h2 className="super-admin-customers__dialog-title">Create Customer User</h2>
      </Dialog.Header>
      <Dialog.Body className="super-admin-customers__dialog-body">
        <p className="super-admin-customers__dialog-subtitle">
          Customer: <strong>{customerName ?? '--'}</strong>
        </p>
        <Select
          id="sa-customer-user-create-mode"
          label="Create Mode"
          value={mode}
          options={USER_CREATE_MODE_OPTIONS}
          onChange={(event) => {
            onModeChange(event.target.value)
            onClearError()
          }}
        />
        {mode === 'assign_existing' ? (
          <Input
            id="sa-customer-user-create-existing-id"
            label="Existing User ID"
            value={existingUserId}
            onChange={(event) => {
              onExistingUserIdChange(event.target.value)
              onClearError('existingUserId')
            }}
            error={errors.existingUserId}
            fullWidth
          />
        ) : (
          <>
            <Input
              id="sa-customer-user-create-name"
              label="User Full Name"
              value={name}
              onChange={(event) => {
                onNameChange(event.target.value)
                onClearError('name')
              }}
              error={errors.name}
              autoComplete="off"
              fullWidth
            />
            <Input
              id="sa-customer-user-create-email"
              type="email"
              label="User Email"
              value={email}
              onChange={(event) => {
                onEmailChange(event.target.value)
                onClearError('email')
              }}
              error={errors.email}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              fullWidth
            />
          </>
        )}
        <fieldset className="super-admin-customers__roles-fieldset">
          <legend className="super-admin-customers__roles-legend">Roles</legend>
          <div className="super-admin-customers__roles-grid">
            {roleOptions.map((roleOption) => (
              <Tickbox
                key={roleOption.value}
                id={`sa-customer-user-role-${String(roleOption.value).toLowerCase()}`}
                label={roleOption.label}
                checked={roles.includes(roleOption.value)}
                onChange={() => onToggleRole(roleOption.value)}
                disabled={isSubmitting}
              />
            ))}
          </div>
        </fieldset>
        {errors.roles ? (
          <p className="super-admin-customers__error" role="alert">
            {errors.roles}
          </p>
        ) : null}
        {errors.form ? (
          <p className="super-admin-customers__error" role="alert">
            {errors.form}
          </p>
        ) : null}
      </Dialog.Body>
      <Dialog.Footer>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {mode === 'assign_existing' ? 'Assign User' : 'Create User'}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export function EditUserDialog({
  open,
  onClose,
  customerName,
  name,
  onNameChange,
  email,
  roles,
  onToggleRole,
  errors,
  onClearNameError,
  isSubmitting,
  adminMutationLoading,
  hasCanonicalAdmin,
  canAssignAdminFromUserEdit,
  onAssignAdmin,
  onSubmit,
}) {
  return (
    <Dialog open={open} onClose={onClose} size="md">
      <Dialog.Header>
        <h2 className="super-admin-customers__dialog-title">Edit Customer User</h2>
      </Dialog.Header>
      <Dialog.Body className="super-admin-customers__dialog-body">
        <p className="super-admin-customers__dialog-subtitle">
          Customer: <strong>{customerName ?? '--'}</strong>
        </p>
        <Input
          id="sa-customer-user-edit-name"
          label="User Full Name"
          value={name}
          onChange={(event) => {
            onNameChange(event.target.value)
            onClearNameError()
          }}
          error={errors.name}
          fullWidth
        />
        <Input
          id="sa-customer-user-edit-email"
          type="email"
          label="User Email"
          value={email}
          readOnly
          helperText="Email cannot be changed here. If incorrect, archive this user and create a new user with the correct email."
          fullWidth
        />
        <fieldset className="super-admin-customers__roles-fieldset">
          <legend className="super-admin-customers__roles-legend">Roles</legend>
          <div className="super-admin-customers__roles-grid">
            {USER_CREATE_ROLE_OPTIONS.map((roleOption) => (
              <Tickbox
                key={roleOption.value}
                id={`sa-customer-user-edit-role-${String(roleOption.value).toLowerCase()}`}
                label={roleOption.label}
                checked={roles.includes(roleOption.value)}
                onChange={() => onToggleRole(roleOption.value)}
                disabled={isSubmitting}
              />
            ))}
          </div>
        </fieldset>
        {errors.roles ? (
          <p className="super-admin-customers__error" role="alert">
            {errors.roles}
          </p>
        ) : null}
        {errors.form ? (
          <p className="super-admin-customers__error" role="alert">
            {errors.form}
          </p>
        ) : null}
      </Dialog.Body>
      <Dialog.Footer className="super-admin-customers__user-edit-footer">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={adminMutationLoading || isSubmitting}
        >
          Cancel
        </Button>
        <div className="super-admin-customers__user-edit-footer-actions">
          {!hasCanonicalAdmin ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onAssignAdmin}
              disabled={!canAssignAdminFromUserEdit || adminMutationLoading || isSubmitting}
            >
              Assign Customer Admin
            </Button>
          ) : null}
          <Button
            variant="primary"
            size="sm"
            onClick={onSubmit}
            loading={isSubmitting}
            disabled={adminMutationLoading || isSubmitting}
          >
            Save Changes
          </Button>
        </div>
      </Dialog.Footer>
    </Dialog>
  )
}

export function UserLifecycleDialog({
  confirm,
  onClose,
  onConfirm,
  loading,
}) {
  return (
    <Dialog open={Boolean(confirm)} onClose={onClose} size="sm">
      <Dialog.Header>
        <h2 className="super-admin-customers__dialog-title">
          {`${getLifecycleActionVerb(confirm?.type)} User`}
        </h2>
      </Dialog.Header>
      <Dialog.Body>
        <p className="super-admin-customers__dialog-subtitle">
          {confirm?.type === 'enable'
            ? `Reactivate ${confirm?.userName ?? 'this user'}? They will regain customer access immediately.`
            : confirm?.type === 'archive'
              ? `Archive ${confirm?.userName ?? 'this user'}? This permanently deletes the account and cannot be undone.`
              : `Deactivate ${confirm?.userName ?? 'this user'}? This immediately removes customer access.`}
        </p>
      </Dialog.Body>
      <Dialog.Footer>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant={confirm?.type === 'archive' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
          disabled={loading}
        >
          {getLifecycleActionVerb(confirm?.type)}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export function AuthLinkDialog({
  open,
  onClose,
  authLink,
}) {
  const { addToast } = useToaster()

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <Dialog.Header>
        <h2 className="super-admin-customers__dialog-title">Auth Link (Dev Mode)</h2>
      </Dialog.Header>
      <Dialog.Body>
        <p className="super-admin-customers__dialog-subtitle">
          Email is in mock mode. Use this link to simulate the invitation auth flow:
        </p>
        <p className="super-admin-customers__dialog-subtitle">
          After verification, sign in through the customer login page with your
          environment&apos;s seeded manual-test password.
        </p>
        <div className="super-admin-customers__auth-link-box">
          <code className="super-admin-customers__auth-link-code">
            {authLink}
          </code>
        </div>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="primary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(authLink)
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
          disabled={!authLink}
        >
          Copy Link
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
