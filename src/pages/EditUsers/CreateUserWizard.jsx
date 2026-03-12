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

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Input } from '../../components/Input'
import { Tickbox } from '../../components/Tickbox'
import { useToaster } from '../../components/Toaster'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useCreateUserMutation } from '../../store/api/userApi.js'
import {
  appendRequestReference,
  getCanonicalAdminConflictMessage,
  isCanonicalAdminConflictError,
  normalizeError,
} from '../../utils/errors.js'
import './EditUsers.css'

/** Available user roles (matches backend Role catalogue) */
const AVAILABLE_ROLES = ['TENANT_ADMIN', 'USER']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CUSTOMER_ADMIN_CREATE_GUIDANCE =
  'Customer Admin ownership is transferred separately. Create the replacement user first, then use Transfer Ownership from that user\'s row after the account is active.'

const TENANT_ADMIN_TOPOLOGY_GUIDANCE =
  'Tenant Admin is only available for multi-tenant customers.'

const TENANT_VISIBILITY_STEP_COPY =
  'Select the tenants this user should be able to access. Leave this empty if you do not want to store explicit tenant-visibility entries during create.'

const TENANT_VISIBILITY_EMPTY_SELECTION_MESSAGE =
  'No explicit tenant visibility selected.'

const TENANT_VISIBILITY_NOT_REQUIRED_MESSAGE =
  'Not required for this customer topology.'

const TENANT_VISIBILITY_LOADING_MESSAGE = 'Loading tenant options...'

const TENANT_VISIBILITY_EMPTY_OPTIONS_MESSAGE =
  'No selectable tenants are currently available for this customer.'

const TENANT_VISIBILITY_PRESERVED_MESSAGE =
  'Selected tenants that are no longer selectable stay preserved until you remove them.'

const TENANT_VISIBILITY_SERVICE_PROVIDER_HINT =
  'This customer uses guided tenant visibility for multi-tenant access.'

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

const normalizeCreateFieldName = (field) => {
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

const mapCreateUserValidationErrors = (details) => {
  const mapped = {}

  if (Array.isArray(details)) {
    for (const detail of details) {
      if (!detail || typeof detail !== 'object') continue
      const field = normalizeCreateFieldName(detail.field)
      const message = getFieldErrorMessage(detail.message)
      if (!field || !message) continue
      mapped[field] = message
    }
    return mapped
  }

  if (!details || typeof details !== 'object') return mapped

  for (const [field, value] of Object.entries(details)) {
    const normalizedField = normalizeCreateFieldName(field)
    const message = getFieldErrorMessage(value)
    if (!normalizedField || !message) continue
    mapped[normalizedField] = message
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

const getTenantId = (tenant) => String(tenant?.id ?? tenant?._id ?? '').trim()

const getTopologyAwareRoles = (roles, topology) => {
  const normalizedTopology = String(topology ?? '')
    .trim()
    .toUpperCase()

  if (normalizedTopology === 'SINGLE_TENANT') {
    return roles.filter((role) => role !== 'TENANT_ADMIN')
  }

  return roles
}

const normalizeTenantOption = (tenant) => {
  const id = getTenantId(tenant)

  return {
    id,
    name: String(tenant?.name ?? id ?? '--').trim() || '--',
    status: String(tenant?.status ?? 'UNKNOWN').trim().toUpperCase(),
    isSelectable: tenant?.isSelectable === true,
    isDefault: tenant?.isDefault === true,
    selectionState: String(tenant?.selectionState ?? '').trim().toUpperCase(),
  }
}

const getTenantVisibilityValidationMessage = (appError) => {
  const reason = String(appError?.details?.reason ?? '').trim().toUpperCase()

  if (reason === 'TENANT_VISIBILITY_NOT_ALLOWED') {
    return appendRequestReference(
      'Tenant visibility is not available for this customer topology.',
      appError?.requestId,
    )
  }

  if (reason === 'TENANT_VISIBILITY_INVALID_TENANT_IDS') {
    const invalidTenantIds = Array.isArray(appError?.details?.invalidTenantIds)
      ? appError.details.invalidTenantIds
        .map((tenantId) => String(tenantId ?? '').trim())
        .filter(Boolean)
      : []

    const invalidTenantSuffix = invalidTenantIds.length > 0
      ? ` Remove invalid tenant selections: ${invalidTenantIds.join(', ')}.`
      : ' Remove invalid tenant selections and retry.'

    return appendRequestReference(
      `One or more tenant selections are no longer valid.${invalidTenantSuffix}`,
      appError?.requestId,
    )
  }

  return ''
}

/**
 * CreateUserWizard Component
 */
function CreateUserWizard({ open, onClose, customerId }) {
  const { addToast } = useToaster()
  const [createUserMutation, { isLoading }] = useCreateUserMutation()
  const {
    customerId: activeCustomerId,
    tenants: tenantRows,
    tenantVisibilityMeta,
    isLoadingTenants: rawIsLoadingTenants,
    tenantsError,
  } = useTenantContext()

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedRoles, setSelectedRoles] = useState([])
  const [tenantVisibility, setTenantVisibility] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})

  const isCustomerContextAligned =
    !customerId
    || !activeCustomerId
    || String(customerId) === String(activeCustomerId)

  const tenants = useMemo(
    () => (isCustomerContextAligned ? tenantRows.map(normalizeTenantOption).filter((tenant) => tenant.id) : []),
    [isCustomerContextAligned, tenantRows],
  )

  const normalizedTenantsError = useMemo(
    () => (tenantsError ? normalizeError(tenantsError) : null),
    [tenantsError],
  )

  const effectiveTenantVisibilityMeta = isCustomerContextAligned ? tenantVisibilityMeta : null
  const isLoadingTenants = isCustomerContextAligned ? rawIsLoadingTenants : false

  const availableRoles = useMemo(
    () => getTopologyAwareRoles(AVAILABLE_ROLES, effectiveTenantVisibilityMeta?.topology),
    [effectiveTenantVisibilityMeta?.topology],
  )
  const allowsTenantAdminRole = availableRoles.includes('TENANT_ADMIN')

  const shouldShowTenantVisibilityStep =
    effectiveTenantVisibilityMeta?.allowed === true
    && effectiveTenantVisibilityMeta?.topology === 'MULTI_TENANT'

  const stepDefinitions = useMemo(() => {
    const steps = [
      { key: 'details', label: 'User Details' },
      { key: 'roles', label: 'Assign Roles' },
    ]

    if (shouldShowTenantVisibilityStep) {
      steps.push({ key: 'tenantVisibility', label: 'Tenant Visibility' })
    }

    steps.push({ key: 'review', label: 'Review' })
    return steps
  }, [shouldShowTenantVisibilityStep])

  const totalSteps = stepDefinitions.length
  const currentStep = stepDefinitions[step - 1] ?? stepDefinitions[0]
  const currentStepKey = currentStep?.key ?? 'details'

  const tenantLookup = useMemo(
    () => new Map(tenants.map((tenant) => [tenant.id, tenant])),
    [tenants],
  )

  const selectableTenantOptions = useMemo(
    () => tenants.filter((tenant) => tenant.isSelectable),
    [tenants],
  )

  const resolvedSelectedTenants = useMemo(
    () => tenantVisibility.map((tenantId) => {
      const matchedTenant = tenantLookup.get(tenantId)
      if (matchedTenant) return matchedTenant

      return {
        id: tenantId,
        name: tenantId,
        status: 'UNKNOWN',
        isSelectable: false,
        isDefault: false,
        selectionState: 'MISSING',
      }
    }),
    [tenantLookup, tenantVisibility],
  )

  const preservedSelectedTenants = useMemo(
    () => resolvedSelectedTenants.filter((tenant) => !tenant.isSelectable),
    [resolvedSelectedTenants],
  )

  const tenantVisibilitySummary = useMemo(() => {
    if (!shouldShowTenantVisibilityStep) {
      return TENANT_VISIBILITY_NOT_REQUIRED_MESSAGE
    }

    if (resolvedSelectedTenants.length === 0) {
      return TENANT_VISIBILITY_EMPTY_SELECTION_MESSAGE
    }

    return resolvedSelectedTenants.map((tenant) => tenant.name).join(', ')
  }, [resolvedSelectedTenants, shouldShowTenantVisibilityStep])

  const getStepNumber = useCallback(
    (stepKey) => {
      const index = stepDefinitions.findIndex((definition) => definition.key === stepKey)
      return index >= 0 ? index + 1 : 1
    },
    [stepDefinitions],
  )

  const clearFieldErrors = useCallback((...keys) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const key of keys) {
        delete next[key]
      }
      return next
    })
  }, [])

  useEffect(() => {
    setSelectedRoles((prev) => {
      const next = prev.filter((role) => availableRoles.includes(role))
      return next.length === prev.length ? prev : next
    })
  }, [availableRoles])

  useEffect(() => {
    setStep((prev) => Math.min(prev, totalSteps))
  }, [totalSteps])

  useEffect(() => {
    if (shouldShowTenantVisibilityStep) return
    if (tenantVisibility.length === 0 && !fieldErrors.tenantVisibility) return

    setTenantVisibility([])
    clearFieldErrors('tenantVisibility')
  }, [
    clearFieldErrors,
    fieldErrors.tenantVisibility,
    shouldShowTenantVisibilityStep,
    tenantVisibility.length,
  ])

  const handleClose = useCallback(() => {
    setStep(1)
    setName('')
    setEmail('')
    setSelectedRoles([])
    setTenantVisibility([])
    setFieldErrors({})
    onClose?.()
  }, [onClose])

  const validateStep = useCallback(() => {
    const errors = {}

    if (currentStepKey === 'details') {
      if (!name.trim()) {
        errors.name = 'Name is required.'
      }

      if (!email.trim()) {
        errors.email = 'Email is required.'
      } else if (!EMAIL_REGEX.test(email.trim())) {
        errors.email = 'Enter a valid email address.'
      }
    }

    if (currentStepKey === 'roles' && selectedRoles.length === 0) {
      errors.roles = 'Select at least one role.'
    }

    if (currentStepKey === 'tenantVisibility' && normalizedTenantsError) {
      errors.tenantVisibility = normalizedTenantsError.message
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [currentStepKey, email, name, normalizedTenantsError, selectedRoles.length])

  const handleNext = useCallback(() => {
    if (!validateStep()) return
    setFieldErrors({})
    setStep((prev) => Math.min(totalSteps, prev + 1))
  }, [totalSteps, validateStep])

  const handleBack = useCallback(() => {
    setFieldErrors({})
    setStep((prev) => Math.max(1, prev - 1))
  }, [])

  const toggleRole = useCallback((role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((candidate) => candidate !== role) : [...prev, role],
    )
    clearFieldErrors('roles')
  }, [clearFieldErrors])

  const toggleTenantSelection = useCallback((tenantId) => {
    setTenantVisibility((prev) =>
      prev.includes(tenantId)
        ? prev.filter((candidate) => candidate !== tenantId)
        : [...prev, tenantId],
    )
    clearFieldErrors('tenantVisibility')
  }, [clearFieldErrors])

  const handleSelectAllTenants = useCallback(() => {
    setTenantVisibility((prev) => {
      const preservedIds = prev.filter((tenantId) => {
        const tenant = tenantLookup.get(tenantId)
        return !tenant || !tenant.isSelectable
      })

      return [...new Set([...preservedIds, ...selectableTenantOptions.map((tenant) => tenant.id)])]
    })
    clearFieldErrors('tenantVisibility')
  }, [clearFieldErrors, selectableTenantOptions, tenantLookup])

  const handleClearTenantSelection = useCallback(() => {
    setTenantVisibility([])
    clearFieldErrors('tenantVisibility')
  }, [clearFieldErrors])

  const handleCreate = useCallback(async () => {
    try {
      const body = {
        name: name.trim(),
        email: email.trim(),
        roles: selectedRoles,
      }

      if (shouldShowTenantVisibilityStep && tenantVisibility.length > 0) {
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
        setStep(getStepNumber('roles'))
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
        setStep(getStepNumber('details'))
        addToast({
          title: 'Cannot create user',
          description: conflictMessage,
          variant: 'warning',
        })
        return
      }

      if (appError.status === 422) {
        const tenantVisibilityMessage = getTenantVisibilityValidationMessage(appError)
        if (tenantVisibilityMessage) {
          setFieldErrors((prev) => ({
            ...prev,
            tenantVisibility: tenantVisibilityMessage,
          }))
          setStep(getStepNumber(shouldShowTenantVisibilityStep ? 'tenantVisibility' : 'review'))
          addToast({
            title: 'Tenant visibility needs attention',
            description: tenantVisibilityMessage,
            variant: 'warning',
          })
          return
        }

        if (appError.details) {
          const mapped = mapCreateUserValidationErrors(appError.details)
          if (Object.keys(mapped).length > 0) {
            setFieldErrors(mapped)
            if (mapped.name || mapped.email) {
              setStep(getStepNumber('details'))
            } else if (mapped.roles) {
              setStep(getStepNumber('roles'))
            } else if (mapped.tenantVisibility && shouldShowTenantVisibilityStep) {
              setStep(getStepNumber('tenantVisibility'))
            }
            return
          }
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
    getStepNumber,
    shouldShowTenantVisibilityStep,
  ])

  const nextButtonDisabled =
    isLoading
    || (currentStepKey === 'tenantVisibility' && (isLoadingTenants || Boolean(normalizedTenantsError)))

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size="md"
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <Dialog.Header>
        <h2 className="create-wizard__title">Create User</h2>
        <p className="create-wizard__step-indicator" aria-live="polite">
          Step {step} of {totalSteps}: {currentStep.label}
        </p>
      </Dialog.Header>

      <Dialog.Body>
        {currentStepKey === 'details' && (
          <div className="create-wizard__step">
            <Input
              id="create-user-name"
              label="Full Name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                clearFieldErrors('name')
              }}
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
              onChange={(event) => {
                setEmail(event.target.value)
                clearFieldErrors('email')
              }}
              error={fieldErrors.email}
              required
              fullWidth
              autoComplete="email"
              disabled={isLoading}
            />
          </div>
        )}

        {currentStepKey === 'roles' && (
          <div className="create-wizard__step">
            <fieldset className="create-wizard__fieldset">
              <legend className="create-wizard__legend">Select Roles</legend>
              <p className="create-wizard__info" role="note">
                {CUSTOMER_ADMIN_CREATE_GUIDANCE}
              </p>
              {!allowsTenantAdminRole ? (
                <p className="create-wizard__hint">{TENANT_ADMIN_TOPOLOGY_GUIDANCE}</p>
              ) : null}
              {availableRoles.map((role) => (
                <Tickbox
                  key={role}
                  id={`role-${role}`}
                  label={role.replace(/_/g, ' ')}
                  checked={selectedRoles.includes(role)}
                  onChange={() => toggleRole(role)}
                  disabled={isLoading}
                />
              ))}
              {fieldErrors.roles ? (
                <p className="create-wizard__error" role="alert">
                  {fieldErrors.roles}
                </p>
              ) : null}
            </fieldset>
          </div>
        )}

        {currentStepKey === 'tenantVisibility' && (
          <div className="create-wizard__step">
            <fieldset className="create-wizard__fieldset">
              <legend className="create-wizard__legend">Tenant Visibility</legend>
              <p className="create-wizard__info">{TENANT_VISIBILITY_STEP_COPY}</p>
              {effectiveTenantVisibilityMeta?.isServiceProvider ? (
                <p className="create-wizard__hint">{TENANT_VISIBILITY_SERVICE_PROVIDER_HINT}</p>
              ) : null}
              {effectiveTenantVisibilityMeta?.selectableStatuses?.length > 0 ? (
                <p className="create-wizard__hint">
                  Selectable statuses: {effectiveTenantVisibilityMeta.selectableStatuses.join(', ')}.
                </p>
              ) : null}

              {isLoadingTenants ? (
                <p className="create-wizard__info" role="status">
                  {TENANT_VISIBILITY_LOADING_MESSAGE}
                </p>
              ) : null}

              {normalizedTenantsError ? (
                <ErrorSupportPanel
                  error={normalizedTenantsError}
                  context="create-user-tenant-visibility"
                />
              ) : null}

              {!isLoadingTenants && !normalizedTenantsError ? (
                <>
                  <div className="create-wizard__tenant-toolbar">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleSelectAllTenants}
                      disabled={selectableTenantOptions.length === 0 || isLoading}
                    >
                      Select All Available
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearTenantSelection}
                      disabled={tenantVisibility.length === 0 || isLoading}
                    >
                      Clear Selection
                    </Button>
                  </div>

                  {selectableTenantOptions.length > 0 ? (
                    <div className="create-wizard__tenant-list" role="group" aria-label="Selectable tenants">
                      {selectableTenantOptions.map((tenant) => (
                        <div key={tenant.id} className="create-wizard__tenant-option">
                          <Tickbox
                            id={`create-tenant-${tenant.id}`}
                            label={tenant.name}
                            checked={tenantVisibility.includes(tenant.id)}
                            onChange={() => toggleTenantSelection(tenant.id)}
                            disabled={isLoading}
                          />
                          <p className="create-wizard__tenant-meta">
                            Status: {tenant.status}
                            {tenant.isDefault ? ' | Default tenant' : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="create-wizard__hint">
                      {TENANT_VISIBILITY_EMPTY_OPTIONS_MESSAGE}
                    </p>
                  )}

                  {preservedSelectedTenants.length > 0 ? (
                    <div className="create-wizard__tenant-preserved">
                      <p className="create-wizard__hint">{TENANT_VISIBILITY_PRESERVED_MESSAGE}</p>
                      <ul className="create-wizard__tenant-preserved-list">
                        {preservedSelectedTenants.map((tenant) => (
                          <li key={tenant.id} className="create-wizard__tenant-preserved-item">
                            <div className="create-wizard__tenant-preserved-details">
                              <span className="create-wizard__tenant-preserved-name">{tenant.name}</span>
                              <span className="create-wizard__tenant-preserved-meta">
                                Status: {tenant.status}
                                {tenant.selectionState ? ` | State: ${tenant.selectionState}` : ''}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleTenantSelection(tenant.id)}
                              disabled={isLoading}
                            >
                              Remove
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}

              {fieldErrors.tenantVisibility ? (
                <p className="create-wizard__error" role="alert">
                  {fieldErrors.tenantVisibility}
                </p>
              ) : null}
            </fieldset>
          </div>
        )}

        {currentStepKey === 'review' && (
          <div className="create-wizard__step create-wizard__review">
            <dl className="create-wizard__summary">
              <dt>Name</dt>
              <dd>{name}</dd>
              <dt>Email</dt>
              <dd>{email}</dd>
              <dt>Roles</dt>
              <dd>{selectedRoles.map((role) => role.replace(/_/g, ' ')).join(', ')}</dd>
              <dt>Tenant Visibility</dt>
              <dd>{tenantVisibilitySummary}</dd>
            </dl>
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer className="edit-users__dialog-footer">
        {step > 1 && (
          <Button variant="outline" onClick={handleBack} disabled={isLoading}>
            Back
          </Button>
        )}

        <div className="create-wizard__footer-right">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>

          {step < totalSteps ? (
            <Button variant="primary" onClick={handleNext} disabled={nextButtonDisabled}>
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
