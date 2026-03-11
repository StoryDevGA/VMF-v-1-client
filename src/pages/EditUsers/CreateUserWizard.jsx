/**
 * Create User Wizard
 *
 * Multi-step dialog for creating a new user:
 *   1. User Details — name, email
 *   2. Assign Roles — multi-select roles
 *   3. Tenant Visibility — multi-select tenants (Service Provider only)
 *   4. Review & Create
 *
 * On submit, calls `POST /api/customers/:customerId/users` via the
 * useUsers hook.
 *
 * @param {Object}  props
 * @param {boolean} props.open       — controls dialog visibility
 * @param {Function} props.onClose   — called when wizard should close
 * @param {string}  props.customerId — customer scope for the new user
 */

import { useState, useCallback } from 'react'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Tickbox } from '../../components/Tickbox'
import { useToaster } from '../../components/Toaster'
import { useCreateUserMutation } from '../../store/api/userApi.js'
import {
  appendRequestReference,
  normalizeError,
  isCanonicalAdminConflictError,
  getCanonicalAdminConflictMessage,
} from '../../utils/errors.js'
import './EditUsers.css'

/** Available user roles (matches backend Role catalogue) */
const AVAILABLE_ROLES = ['TENANT_ADMIN', 'USER']

/** Wizard step count */
const TOTAL_STEPS = 4

const CUSTOMER_ADMIN_CREATE_GUIDANCE =
  'Customer Admin ownership is transferred separately. Create the replacement user first, then use Transfer Ownership from that user\'s row after the account is active.'

const getCreateUserOutcomeData = (result) => {
  if (result?.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
    return result.data
  }

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result
  }

  return {}
}

const normalizeCreateUserReason = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const mapCreateUserValidationErrors = (details) => {
  const mapped = {}

  if (Array.isArray(details)) {
    for (const detail of details) {
      if (!detail || typeof detail !== 'object') continue
      if (detail.field && detail.message) {
        mapped[detail.field] = String(detail.message)
      }
    }
    return mapped
  }

  if (!details || typeof details !== 'object') return mapped

  for (const [field, value] of Object.entries(details)) {
    if (!field) continue
    if (typeof value === 'string' && value.trim()) {
      mapped[field] = value.trim()
      continue
    }
    if (value && typeof value === 'object' && typeof value.message === 'string') {
      mapped[field] = value.message
    }
  }

  return mapped
}

const getCreateUserConflictMessage = (appError) => {
  const reason = normalizeCreateUserReason(appError?.details?.reason)
  const existingUserId = String(appError?.details?.existingUserId ?? '').trim()
  const existingUserSuffix = existingUserId ? ` (User ID: ${existingUserId})` : ''

  if (appError?.code === 'USER_ALREADY_EXISTS') {
    if (reason === 'already-in-customer') {
      return appendRequestReference(
        `A user with this email already exists in this customer${existingUserSuffix}.`,
        appError?.requestId,
      )
    }
    if (reason === 'other-customer') {
      return appendRequestReference(
        'This email belongs to a user in another customer and cannot be invited here.',
        appError?.requestId,
      )
    }
    if (reason === 'existing-identity') {
      return appendRequestReference(
        `An existing identity already uses this email${existingUserSuffix}.`,
        appError?.requestId,
      )
    }
  }

  if (appError?.code === 'USER_CUSTOMER_CONFLICT' && reason === 'other-customer') {
    return appendRequestReference(
      'This user belongs to another customer and cannot be assigned to this customer.',
      appError?.requestId,
    )
  }

  return appError?.message
}

/**
 * CreateUserWizard Component
 */
function CreateUserWizard({ open, onClose, customerId }) {
  const { addToast } = useToaster()
  const [createUserMutation, { isLoading }] = useCreateUserMutation()

  /* ---- Wizard state ---- */
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedRoles, setSelectedRoles] = useState([])
  const [tenantVisibility, setTenantVisibility] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})

  /* ---- Reset when closing ---- */
  const handleClose = useCallback(() => {
    setStep(1)
    setName('')
    setEmail('')
    setSelectedRoles([])
    setTenantVisibility([])
    setFieldErrors({})
    onClose()
  }, [onClose])

  /* ---- Validation per step ---- */
  const validateStep = useCallback(() => {
    const errors = {}

    if (step === 1) {
      if (!name.trim()) errors.name = 'Name is required.'
      if (!email.trim()) {
        errors.email = 'Email is required.'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = 'Enter a valid email address.'
      }
    }

    if (step === 2) {
      if (selectedRoles.length === 0) {
        errors.roles = 'Select at least one role.'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [step, name, email, selectedRoles])

  /* ---- Step navigation ---- */
  const handleNext = useCallback(() => {
    if (!validateStep()) return
    setFieldErrors({})
    setStep((s) => Math.min(TOTAL_STEPS, s + 1))
  }, [validateStep])

  const handleBack = useCallback(() => {
    setFieldErrors({})
    setStep((s) => Math.max(1, s - 1))
  }, [])

  /* ---- Toggle role selection ---- */
  const toggleRole = useCallback((role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
  }, [])

  /* ---- Submit ---- */
  const handleCreate = useCallback(async () => {
    try {
      const body = {
        name: name.trim(),
        email: email.trim(),
        roles: selectedRoles,
      }
      if (tenantVisibility.length > 0) {
        body.tenantVisibility = tenantVisibility
      }

      const result = await createUserMutation({ customerId, body }).unwrap()
      const outcomeData = getCreateUserOutcomeData(result)
      const outcome = String(outcomeData?.outcome ?? '')
        .trim()
        .toLowerCase()
      const invitationOutcome = String(outcomeData?.invitationOutcome ?? '')
        .trim()
        .toLowerCase()

      if (outcome === 'assigned_existing') {
        addToast({
          title: 'User assigned',
          description: 'Existing user assigned to this customer.',
          variant: 'success',
        })
      } else if (outcome === 'invited_new' && invitationOutcome === 'send_failed') {
        addToast({
          title: 'User created',
          description: `User created for ${email.trim()}, but invitation email delivery failed.`,
          variant: 'warning',
        })
      } else if (outcome === 'invited_new') {
        addToast({
          title: 'User created',
          description: `Invitation sent to ${email.trim()}.`,
          variant: 'success',
        })
      } else {
        addToast({
          title: 'User created',
          description: `${name.trim()} was created successfully.`,
          variant: 'success',
        })
      }

      handleClose()
    } catch (err) {
      const appError = normalizeError(err)

      if (
        selectedRoles.includes('CUSTOMER_ADMIN') &&
        isCanonicalAdminConflictError(appError)
      ) {
        const conflictMessage = getCanonicalAdminConflictMessage(appError, 'assign')
        setFieldErrors((prev) => ({
          ...prev,
          roles: conflictMessage,
        }))
        setStep(2)
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
        const conflictMessage = getCreateUserConflictMessage(appError)
        setFieldErrors((prev) => ({
          ...prev,
          email: conflictMessage,
        }))
        setStep(1)
        addToast({
          title: 'Cannot create user',
          description: conflictMessage,
          variant: 'warning',
        })
        return
      }

      if (appError.status === 422 && appError.details) {
        const mapped = mapCreateUserValidationErrors(appError.details)
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped)
          // Go back to the relevant step
          if (mapped.name || mapped.email) setStep(1)
          else if (mapped.roles) setStep(2)
          return
        }
      }

      addToast({
        title: 'Failed to create user',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [
    name,
    email,
    selectedRoles,
    tenantVisibility,
    customerId,
    createUserMutation,
    addToast,
    handleClose,
  ])

  /* ---- Step labels ---- */
  const stepLabels = ['User Details', 'Assign Roles', 'Tenant Visibility', 'Review']

  return (
    <Dialog open={open} onClose={handleClose} size="md">
      <Dialog.Header>
        <h2 className="create-wizard__title">Create User</h2>
        <p className="create-wizard__step-indicator">
          Step {step} of {TOTAL_STEPS}: {stepLabels[step - 1]}
        </p>
      </Dialog.Header>

      <Dialog.Body>
        {/* Step 1: User Details */}
        {step === 1 && (
          <div className="create-wizard__step">
            <Input
              id="create-user-name"
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors.name}
              required
              fullWidth
              autoComplete="name"
              disabled={isLoading}
            />
            <Input
              id="create-user-email"
              type="email"
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              required
              fullWidth
              autoComplete="email"
              disabled={isLoading}
            />
          </div>
        )}

        {/* Step 2: Assign Roles */}
        {step === 2 && (
          <div className="create-wizard__step">
            <fieldset className="create-wizard__fieldset">
              <legend className="create-wizard__legend">Select Roles</legend>
              <p className="create-wizard__info" role="note">
                {CUSTOMER_ADMIN_CREATE_GUIDANCE}
              </p>
              {AVAILABLE_ROLES.map((role) => (
                <Tickbox
                  key={role}
                  id={`role-${role}`}
                  label={role.replace(/_/g, ' ')}
                  checked={selectedRoles.includes(role)}
                  onChange={() => toggleRole(role)}
                  disabled={isLoading}
                />
              ))}
              {fieldErrors.roles && (
                <p className="create-wizard__error" role="alert">
                  {fieldErrors.roles}
                </p>
              )}
            </fieldset>
          </div>
        )}

        {/* Step 3: Tenant Visibility (placeholder — requires tenant list) */}
        {step === 3 && (
          <div className="create-wizard__step">
            <p className="create-wizard__info">
              Tenant visibility allows this user to access specific tenants.
              If no tenants are selected, default visibility rules apply.
            </p>
            <p className="create-wizard__placeholder">
              Tenant selection will be available when the customer has multiple tenants.
            </p>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="create-wizard__step create-wizard__review">
            <dl className="create-wizard__summary">
              <dt>Name</dt>
              <dd>{name}</dd>
              <dt>Email</dt>
              <dd>{email}</dd>
              <dt>Roles</dt>
              <dd>{selectedRoles.map((r) => r.replace(/_/g, ' ')).join(', ')}</dd>
              {tenantVisibility.length > 0 && (
                <>
                  <dt>Tenant Visibility</dt>
                  <dd>{tenantVisibility.length} tenant(s) selected</dd>
                </>
              )}
            </dl>
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        {step > 1 && (
          <Button variant="outline" onClick={handleBack} disabled={isLoading}>
            Back
          </Button>
        )}

        <div className="create-wizard__footer-right">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>

          {step < TOTAL_STEPS ? (
            <Button variant="primary" onClick={handleNext} disabled={isLoading}>
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={isLoading}
              disabled={isLoading}
            >
              Create User
            </Button>
          )}
        </div>
      </Dialog.Footer>
    </Dialog>
  )
}

export default CreateUserWizard
