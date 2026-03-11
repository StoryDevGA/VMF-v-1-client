/**
 * User Edit Drawer
 *
 * Dialog for editing an existing user's roles and tenant visibility.
 * Opens as a side-sheet style dialog when a user row's Edit action is triggered.
 *
 * @param {Object}  props
 * @param {boolean} props.open       — controls dialog visibility
 * @param {Function} props.onClose   — called when drawer should close
 * @param {Object}  props.user       — the user object being edited
 * @param {string}  props.customerId — customer scope
 */

import { useState, useCallback, useEffect } from 'react'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Tickbox } from '../../components/Tickbox'
import { Status } from '../../components/Status'
import { UserTrustStatus } from '../../components/UserTrustStatus'
import { useToaster } from '../../components/Toaster'
import { useUpdateUserMutation } from '../../store/api/userApi.js'
import {
  normalizeError,
  isCanonicalAdminConflictError,
  getCanonicalAdminConflictMessage,
} from '../../utils/errors.js'
import './UserEditDrawer.css'

/** Available user roles */
const EDITABLE_ROLES = ['TENANT_ADMIN', 'USER']

const CUSTOMER_ADMIN_EDIT_GUIDANCE =
  'Customer Admin ownership is governed separately. Generic role edits here do not add or remove the governed Customer Admin assignment.'

const CUSTOMER_ADMIN_TRANSFER_GUIDANCE =
  'Use Transfer Ownership when this user should become the Canonical Admin.'

/**
 * UserEditDrawer Component
 */
function UserEditDrawer({
  open,
  onClose,
  user,
  onStartOwnershipTransfer,
  hasCanonicalAdmin = false,
}) {
  const { addToast } = useToaster()
  const [updateUserMutation, { isLoading }] = useUpdateUserMutation()

  /* ---- Local edit state ---- */
  const [selectedRoles, setSelectedRoles] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})

  /* ---- Sync roles from user prop ---- */
  useEffect(() => {
    if (user) {
      const roles =
        user.memberships
          ?.flatMap((m) => m.roles)
          ?.filter(Boolean) ?? []
      setSelectedRoles([...new Set(roles)])
      setFieldErrors({})
    }
  }, [user])

  /* ---- Toggle role ---- */
  const toggleRole = useCallback((role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
  }, [])

  /* ---- Validate ---- */
  const validate = useCallback(() => {
    const errors = {}
    if (selectedRoles.length === 0) {
      errors.roles = 'Select at least one role.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [selectedRoles])

  /* ---- Save ---- */
  const handleSave = useCallback(async () => {
    if (!validate()) return

    try {
      await updateUserMutation({
        userId: user._id,
        body: { roles: selectedRoles },
      }).unwrap()

      addToast({
        title: 'User updated',
        description: `${user.name}'s roles have been updated.`,
        variant: 'success',
      })
      onClose()
    } catch (err) {
      const appError = normalizeError(err)

      if (isCanonicalAdminConflictError(appError)) {
        const conflictMessage = getCanonicalAdminConflictMessage(
          appError,
          'update_roles',
        )

        setFieldErrors((prev) => ({
          ...prev,
          roles: conflictMessage,
        }))

        addToast({
          title: 'Customer admin conflict',
          description: conflictMessage,
          variant: 'warning',
        })
        return
      }

      if (appError.status === 422 && appError.details) {
        const mapped = {}
        for (const detail of appError.details) {
          if (detail.field) mapped[detail.field] = detail.message
        }
        setFieldErrors(mapped)
      }

      addToast({
        title: 'Failed to update user',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [user, selectedRoles, updateUserMutation, addToast, onClose, validate])

  if (!user) return null

  const hasGovernedCustomerAdminRole =
    user.isCanonicalAdmin || selectedRoles.includes('CUSTOMER_ADMIN')
  const canStartOwnershipTransfer =
    Boolean(onStartOwnershipTransfer) &&
    hasCanonicalAdmin &&
    !user.isCanonicalAdmin &&
    user.isActive

  const transferAvailabilityMessage = !hasCanonicalAdmin
    ? 'Ownership transfer is unavailable until a Canonical Admin is present for this customer.'
    : user.isCanonicalAdmin
      ? 'This user is the current Canonical Admin. Choose another active user to transfer ownership.'
      : !user.isActive
        ? 'Only active users can receive customer ownership.'
        : CUSTOMER_ADMIN_TRANSFER_GUIDANCE

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <Dialog.Header>
        <h2 className="user-edit-drawer__title">Edit User</h2>
      </Dialog.Header>

      <Dialog.Body>
        {/* Read-only user info */}
        <div className="user-edit-drawer__info">
          <Input
            id="edit-user-name"
            label="Name"
            value={user.name ?? ''}
            disabled
            fullWidth
          />
          <Input
            id="edit-user-email"
            label="Email"
            value={user.email ?? ''}
            disabled
            fullWidth
          />
        </div>

        {/* Status display */}
        <div className="user-edit-drawer__status">
          <span className="user-edit-drawer__label">Status</span>
          <Status
            variant={user.isActive ? 'success' : 'error'}
            size="sm"
            showIcon
          >
            {user.isActive ? 'Active' : 'Disabled'}
          </Status>
        </div>

        {/* Trust status display */}
        <div className="user-edit-drawer__status">
          <span className="user-edit-drawer__label">Trust</span>
          <UserTrustStatus
            trustStatus={user.identityPlus?.trustStatus ?? 'UNTRUSTED'}
            invitedAt={user.identityPlus?.invitedAt}
            trustedAt={user.identityPlus?.trustedAt}
            size="sm"
            showDates
          />
        </div>

        {/* Role editing */}
        <fieldset className="user-edit-drawer__fieldset">
          <legend className="user-edit-drawer__legend">Editable Roles</legend>
          <div className="user-edit-drawer__governance" role="note">
            <p className="user-edit-drawer__governance-title">Customer Admin governance</p>
            <p className="user-edit-drawer__governance-text">
              {hasGovernedCustomerAdminRole
                ? CUSTOMER_ADMIN_EDIT_GUIDANCE
                : 'Customer Admin ownership is managed through Transfer Ownership rather than this role editor.'}
            </p>
            <p className="user-edit-drawer__governance-text">
              {transferAvailabilityMessage}
            </p>
            {canStartOwnershipTransfer ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onStartOwnershipTransfer?.(user)
                  onClose?.()
                }}
              >
                Transfer Ownership to This User
              </Button>
            ) : null}
          </div>
          {EDITABLE_ROLES.map((role) => (
            <Tickbox
              key={role}
              id={`edit-role-${role}`}
              label={role.replace(/_/g, ' ')}
              checked={selectedRoles.includes(role)}
              onChange={() => toggleRole(role)}
              disabled={isLoading}
            />
          ))}
          {fieldErrors.roles && (
            <p className="user-edit-drawer__error" role="alert">
              {fieldErrors.roles}
            </p>
          )}
        </fieldset>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isLoading}
          disabled={isLoading}
        >
          Save Changes
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export default UserEditDrawer
