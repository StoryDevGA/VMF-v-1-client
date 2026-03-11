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

import { useState, useCallback, useEffect, useMemo } from 'react'
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
  getUserEmailConflictMessage,
  getUserLifecycleMessage,
} from '../../utils/errors.js'
import './UserEditDrawer.css'

const EDITABLE_ROLES = ['TENANT_ADMIN', 'USER']
const EMAIL_REGEX = /^\S+@\S+\.\S+$/

const CUSTOMER_ADMIN_EDIT_GUIDANCE =
  'Customer Admin ownership is governed separately. Generic role edits here do not add or remove the governed Customer Admin assignment.'

const CUSTOMER_ADMIN_TRANSFER_GUIDANCE =
  'Use Transfer Ownership when this user should become the Canonical Admin.'

const ACTIVE_EMAIL_HELP_TEXT =
  'Changing email resets Identity Plus trust. If trust returns as UNTRUSTED after save, use Resend Invitation from the user row because backend does not auto-send a new invite.'

const DISABLED_EMAIL_HELP_TEXT =
  'Changing email while this user is disabled keeps resend unavailable until reactivation succeeds.'

const TENANT_VISIBILITY_LOCKED_MESSAGE =
  'Tenant visibility stays unchanged in this drawer. Guided tenant-visibility editing is handled in the follow-up tenant-visibility workflow.'

const EMAIL_CHANGE_RESEND_GUIDANCE =
  'Email updated. Trust reset to UNTRUSTED. Use Resend Invitation from the user row if the new address still needs an invite.'

const EMAIL_CHANGE_REACTIVATION_GUIDANCE =
  'Email updated. Because this user is disabled, resend invitation stays unavailable until reactivation succeeds.'

const normalizeText = (value) => String(value ?? '').trim()
const normalizeEmail = (value) => normalizeText(value).toLowerCase()

const normalizeRoles = (roles) => (
  [...new Set((roles ?? []).map((role) => String(role ?? '').trim().toUpperCase()).filter(Boolean))]
    .sort()
)

const getUpdateUserPayload = (result) => {
  if (result?.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
    return result.data
  }

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result
  }

  return {}
}

const getCustomerScopedRoles = (user, customerId) => {
  const memberships = Array.isArray(user?.memberships) ? user.memberships : []
  const scopedMemberships = memberships.filter((membership) => {
    if (!customerId) return true
    return String(membership?.customerId ?? '') === String(customerId)
  })

  return scopedMemberships.flatMap((membership) => membership?.roles ?? []).filter(Boolean)
}

const getUserTrustStatus = (user) =>
  String(user?.trustStatus ?? user?.identityPlus?.trustStatus ?? 'UNTRUSTED')
    .trim()
    .toUpperCase()

const getFieldErrorMessage = (value) => {
  if (typeof value === 'string' && value.trim()) return value.trim()

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) return entry.trim()
      if (
        entry &&
        typeof entry === 'object' &&
        typeof entry.message === 'string' &&
        entry.message.trim()
      ) {
        return entry.message.trim()
      }
    }
  }

  if (value && typeof value === 'object' && typeof value.message === 'string') {
    return value.message.trim()
  }

  return ''
}

const normalizeEditFieldName = (field) => {
  const compact = String(field ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '')

  if (!compact) return ''
  if (compact.includes('tenantvisibility')) return 'tenantVisibility'
  if (compact.includes('roles')) return 'roles'
  if (compact.includes('email')) return 'email'
  if (compact.endsWith('name')) return 'name'

  return ''
}

const mapEditValidationErrors = (details) => {
  const mapped = {}

  if (Array.isArray(details)) {
    for (const detail of details) {
      if (!detail || typeof detail !== 'object') continue
      const field = normalizeEditFieldName(detail.field)
      const message = getFieldErrorMessage(detail.message)
      if (!field || !message) continue
      mapped[field] = message
    }
    return mapped
  }

  if (!details || typeof details !== 'object') return mapped

  for (const [field, value] of Object.entries(details)) {
    const normalizedField = normalizeEditFieldName(field)
    const message = getFieldErrorMessage(value)
    if (!normalizedField || !message) continue
    mapped[normalizedField] = message
  }

  return mapped
}

/**
 * UserEditDrawer Component
 */
function UserEditDrawer({
  open,
  onClose,
  user,
  customerId,
  onStartOwnershipTransfer,
  hasCanonicalAdmin = false,
}) {
  const { addToast } = useToaster()
  const [updateUserMutation, { isLoading }] = useUpdateUserMutation()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedRoles, setSelectedRoles] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!user) return
    setName(String(user?.name ?? ''))
    setEmail(String(user?.email ?? ''))
    setSelectedRoles(getCustomerScopedRoles(user, customerId))
    setFieldErrors({})
  }, [user, customerId])

  const initialRoles = useMemo(
    () => normalizeRoles(getCustomerScopedRoles(user, customerId)),
    [user, customerId],
  )
  const normalizedSelectedRoles = useMemo(
    () => normalizeRoles(selectedRoles),
    [selectedRoles],
  )

  const normalizedInitialName = useMemo(() => normalizeText(user?.name), [user?.name])
  const normalizedInitialEmail = useMemo(() => normalizeEmail(user?.email), [user?.email])
  const normalizedName = normalizeText(name)
  const normalizedUserEmail = normalizeEmail(email)

  const hasNameChange = normalizedName !== normalizedInitialName
  const hasEmailChange = normalizedUserEmail !== normalizedInitialEmail
  const hasRoleChange = normalizedSelectedRoles.join('|') !== initialRoles.join('|')
  const hasChanges = hasNameChange || hasEmailChange || hasRoleChange

  const clearFieldErrors = useCallback((...keys) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const key of keys) {
        delete next[key]
      }
      delete next.form
      return next
    })
  }, [])

  const toggleRole = useCallback((role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((candidate) => candidate !== role) : [...prev, role],
    )
    clearFieldErrors('roles')
  }, [clearFieldErrors])

  const validate = useCallback(() => {
    const errors = {}

    if (!normalizedName) {
      errors.name = 'Full name is required.'
    }

    if (!normalizedUserEmail) {
      errors.email = 'Email is required.'
    } else if (!EMAIL_REGEX.test(normalizedUserEmail)) {
      errors.email = 'Please enter a valid email address.'
    }

    if (normalizedSelectedRoles.length === 0) {
      errors.roles = 'Select at least one role.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [normalizedName, normalizedSelectedRoles, normalizedUserEmail])

  const handleSave = useCallback(async () => {
    if (!hasChanges) {
      addToast({
        title: 'No changes to save',
        description: 'Update at least one editable field before saving.',
        variant: 'info',
      })
      return
    }

    if (!validate()) return

    const body = {}
    if (hasNameChange) body.name = normalizedName
    if (hasEmailChange) body.email = normalizedUserEmail
    if (hasRoleChange) body.roles = normalizedSelectedRoles

    try {
      const result = await updateUserMutation({
        userId: user._id,
        body,
      }).unwrap()
      const updatedUser = getUpdateUserPayload(result)
      const updatedName = normalizeText(updatedUser?.name) || normalizedName || user?.name
      const updatedTrustStatus = getUserTrustStatus(updatedUser)
      const updatedIsActive =
        typeof updatedUser?.isActive === 'boolean' ? updatedUser.isActive : Boolean(user?.isActive)

      let description = `${updatedName} was updated successfully.`
      let variant = 'success'

      if (hasEmailChange && updatedIsActive && updatedTrustStatus === 'UNTRUSTED') {
        description = EMAIL_CHANGE_RESEND_GUIDANCE
        variant = 'warning'
      } else if (hasEmailChange && !updatedIsActive) {
        description = EMAIL_CHANGE_REACTIVATION_GUIDANCE
        variant = 'info'
      }

      addToast({
        title: 'User updated',
        description,
        variant,
      })
      onClose?.()
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

      if (
        appError.status === 409 &&
        (appError.code === 'USER_ALREADY_EXISTS' || appError.code === 'USER_CUSTOMER_CONFLICT')
      ) {
        const emailConflictMessage = getUserEmailConflictMessage(appError)
        setFieldErrors((prev) => ({
          ...prev,
          email: emailConflictMessage,
        }))
        addToast({
          title: 'Cannot update user',
          description: emailConflictMessage,
          variant: 'warning',
        })
        return
      }

      if (appError.status === 422 && appError.details) {
        const mappedErrors = mapEditValidationErrors(appError.details)
        if (Object.keys(mappedErrors).length > 0) {
          setFieldErrors((prev) => ({
            ...prev,
            ...mappedErrors,
          }))
          return
        }
      }

      const lifecycleMessage = getUserLifecycleMessage(appError, 'Failed to update user.')
      setFieldErrors((prev) => ({
        ...prev,
        form: lifecycleMessage,
      }))
      addToast({
        title: 'Failed to update user',
        description: lifecycleMessage,
        variant: 'error',
      })
    }
  }, [
    addToast,
    hasChanges,
    hasEmailChange,
    hasNameChange,
    hasRoleChange,
    normalizedName,
    normalizedSelectedRoles,
    normalizedUserEmail,
    onClose,
    updateUserMutation,
    user,
    validate,
  ])

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
        <div className="user-edit-drawer__info">
          <Input
            id="edit-user-name"
            label="Name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              clearFieldErrors('name')
            }}
            error={fieldErrors.name}
            fullWidth
          />
          <Input
            id="edit-user-email"
            type="email"
            label="Email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              clearFieldErrors('email')
            }}
            error={fieldErrors.email}
            helperText={user.isActive ? ACTIVE_EMAIL_HELP_TEXT : DISABLED_EMAIL_HELP_TEXT}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            fullWidth
          />
        </div>

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

        <div className="user-edit-drawer__status">
          <span className="user-edit-drawer__label">Trust</span>
          <UserTrustStatus
            trustStatus={getUserTrustStatus(user)}
            invitedAt={user.identityPlus?.invitedAt}
            trustedAt={user.identityPlus?.trustedAt}
            size="sm"
            showDates
          />
        </div>

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

        <fieldset className="user-edit-drawer__fieldset">
          <legend className="user-edit-drawer__legend">Tenant Visibility</legend>
          <div className="user-edit-drawer__locked-field" role="note">
            <p className="user-edit-drawer__locked-field-title">Current handling</p>
            <p className="user-edit-drawer__locked-field-text">
              {TENANT_VISIBILITY_LOCKED_MESSAGE}
            </p>
          </div>
        </fieldset>

        {fieldErrors.form && (
          <p className="user-edit-drawer__error" role="alert">
            {fieldErrors.form}
          </p>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isLoading}
          disabled={isLoading || !hasChanges}
        >
          Save Changes
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export default UserEditDrawer
