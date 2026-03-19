/**
 * Create Tenant Wizard
 *
 * Multi-step dialog for creating a new tenant:
 *   1. Tenant Details — name, website URL
 *   2. Assign Tenant Admin — choose the initial tenant admin
 *   3. Review & Create
 *
 * On submit, calls `POST /api/customers/:customerId/tenants` via the
 * useTenants hook.
 *
 * @param {Object}  props
 * @param {boolean} props.open       — controls dialog visibility
 * @param {Function} props.onClose   — called when wizard should close
 * @param {string}  props.customerId — customer scope for the new tenant
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { MdInfoOutline } from 'react-icons/md'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Tooltip } from '../../components/Tooltip'
import { useToaster } from '../../components/Toaster'
import { UserSearchSelect } from '../../components/UserSearchSelect'
import { useCreateTenantMutation } from '../../store/api/tenantApi.js'
import {
  normalizeError,
  isGovernanceLimitConflictError,
  getGovernanceLimitConflictMessage,
  isTenantAdminAssignmentsValidationError,
  getTenantAdminAssignmentsValidationMessage,
} from '../../utils/errors.js'
import {
  getTenantCapacityCountLabel,
  mapTenantValidationErrors,
} from './tenantUtils.js'

/** Wizard step count */
const TOTAL_STEPS = 3

const getTenantCapacityGuidance = (tenantCapacity) => {
  if (!tenantCapacity) return null

  const currentCount = tenantCapacity.currentCount
  const maxTenants = tenantCapacity.maxTenants
  const remainingCount = tenantCapacity.remainingCount
  const countLabel = getTenantCapacityCountLabel(tenantCapacity.countMode)

  if (tenantCapacity.isAtCapacity && currentCount !== null && maxTenants !== null) {
    return {
      tone: 'warning',
      title: 'Tenant capacity reached',
      message:
        `This customer is already using ${currentCount} of ${maxTenants} ${countLabel} tenant slots. `
        + 'Disable or archive an existing tenant, or update customer limits before creating another.',
    }
  }

  if (remainingCount === 1 && currentCount !== null && maxTenants !== null) {
    return {
      tone: 'warning',
      title: 'Final tenant slot',
      message:
        `This create will use the final available ${countLabel} tenant slot for this customer `
        + `(${currentCount} of ${maxTenants} currently in use).`,
    }
  }

  return null
}

/**
 * CreateTenantWizard Component
 */
function CreateTenantWizard({ open, onClose, customerId, tenantCapacity = null }) {
  const { addToast } = useToaster()
  const [createTenantMutation, { isLoading }] = useCreateTenantMutation()
  const tenantCapacityGuidance = useMemo(
    () => getTenantCapacityGuidance(tenantCapacity),
    [tenantCapacity],
  )
  const isCreateBlockedByCapacity = tenantCapacity?.isAtCapacity === true

  /* ---- Wizard state ---- */
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [tenantAdminUserIds, setTenantAdminUserIds] = useState([])
  const [selectedAdminInfo, setSelectedAdminInfo] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const adminStepRef = useRef(null)

  /* ---- Reset when opening ---- */
  useEffect(() => {
    if (open) {
      setStep(1)
      setName('')
      setWebsite('')
      setTenantAdminUserIds([])
      setSelectedAdminInfo(null)
      setFieldErrors({})
    }
  }, [open])

  /* ---- Reset when closing ---- */
  const handleClose = useCallback(() => {
    setStep(1)
    setName('')
    setWebsite('')
    setTenantAdminUserIds([])
    setSelectedAdminInfo(null)
    setFieldErrors({})
    onClose()
  }, [onClose])

  /* ---- Validation per step ---- */
  const validateStep = useCallback(() => {
    const errors = {}

    if (step === 1) {
      if (!name.trim()) errors.name = 'Name is required.'
      if (!website.trim()) {
        errors.website = 'Website is required.'
      } else {
        try {
          new URL(website.trim())
        } catch {
          errors.website = 'Enter a valid URL (e.g. https://example.com).'
        }
      }
    }

    if (step === 2) {
      if (tenantAdminUserIds.length !== 1) {
        errors.tenantAdminUserIds = 'Exactly one tenant admin is required.'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [step, name, website, tenantAdminUserIds])

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

  /* ---- Admin selection handler ---- */
  const handleAdminChange = useCallback((newIds, usersById) => {
    const sliced = newIds.slice(0, 1)
    setTenantAdminUserIds(sliced)
    const selectedId = sliced[0]
    if (selectedId && usersById?.[selectedId]) {
      setSelectedAdminInfo(usersById[selectedId])
    } else if (sliced.length === 0) {
      setSelectedAdminInfo(null)
    }
    // Clear any existing tenantAdminUserIds error when user adds admins
    setFieldErrors((prev) => {
      const { tenantAdminUserIds: _, ...rest } = prev
      return rest
    })
  }, [])

  /* ---- Submit ---- */
  const handleCreate = useCallback(async () => {
    if (isCreateBlockedByCapacity) {
      addToast({
        title: 'Tenant capacity reached',
        description:
          tenantCapacityGuidance?.message
          ?? 'Disable or archive an existing tenant, or update customer limits before creating another.',
        variant: 'warning',
      })
      return
    }

    try {
      const body = {
        name: name.trim(),
        website: website.trim(),
        tenantAdminUserIds: tenantAdminUserIds.slice(0, 1),
      }

      await createTenantMutation({ customerId, body }).unwrap()

      addToast({
        title: 'Tenant created',
        description: `${name.trim()} has been created successfully.`,
        variant: 'success',
      })
      handleClose()
    } catch (err) {
      const appError = normalizeError(err)

      if (isGovernanceLimitConflictError(appError, 'TENANT_LIMIT_REACHED')) {
        addToast({
          title: 'Tenant limit reached',
          description: getGovernanceLimitConflictMessage(appError),
          variant: 'warning',
        })
        return
      }

      if (isTenantAdminAssignmentsValidationError(appError)) {
        const assignmentMessage = getTenantAdminAssignmentsValidationMessage(appError)
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          tenantAdminUserIds: assignmentMessage,
        }))
        setStep(2)
        addToast({
          title: 'Tenant admin selection needs attention',
          description: assignmentMessage,
          variant: 'warning',
        })
        return
      }

      if (appError.status === 422 && appError.details) {
        const mapped = mapTenantValidationErrors(appError.details)
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped)
          if (mapped.name || mapped.website) setStep(1)
          else if (mapped.tenantAdminUserIds) setStep(2)
          return
        }
      }

      addToast({
        title: 'Failed to create tenant',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [
    name,
    website,
    tenantAdminUserIds,
    customerId,
    createTenantMutation,
    addToast,
    handleClose,
    isCreateBlockedByCapacity,
    tenantCapacityGuidance,
  ])

  /* ---- Step labels ---- */
  const stepLabels = ['Tenant Details', 'Assign Tenant Admin', 'Review']
  const dialogSize = step === 2 ? 'lg' : 'md'
  const dialogClassName = [
    'create-wizard__dialog',
    step === 2 ? 'create-wizard__dialog--admin-step' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const bodyClassName = [
    'create-wizard__body',
    step === 2 ? 'create-wizard__body--admin-step' : '',
  ]
    .filter(Boolean)
    .join(' ')

  useEffect(() => {
    if (!open || step !== 2 || !adminStepRef.current) return

    const prefersReducedMotion =
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const frame = requestAnimationFrame(() => {
      adminStepRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [open, step])

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size={dialogSize}
      className={dialogClassName}
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <Dialog.Header>
        <h2 className="maintain-tenants__dialog-title create-wizard__title">Create Tenant</h2>
        <p
          className="maintain-tenants__dialog-subtitle create-wizard__step-indicator"
          aria-live="polite"
        >
          Step {step} of {TOTAL_STEPS}: {stepLabels[step - 1]}
        </p>
      </Dialog.Header>

      <Dialog.Body className={['maintain-tenants__dialog-body', bodyClassName].join(' ')}>
        {tenantCapacityGuidance && step !== 2 ? (
          <div
            className={[
              'create-wizard__note',
              tenantCapacityGuidance.tone === 'warning'
                ? 'create-wizard__note--warning'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            role={tenantCapacityGuidance.tone === 'warning' ? 'alert' : 'status'}
          >
            <p className="create-wizard__note-title">{tenantCapacityGuidance.title}</p>
            <p className="create-wizard__note-text">{tenantCapacityGuidance.message}</p>
          </div>
        ) : null}

        {/* Step 1: Tenant Details */}
        {step === 1 && (
          <div className="create-wizard__step">
            <fieldset className="create-wizard__fieldset">
              <legend className="create-wizard__legend">Tenant Details</legend>
              <div className="create-wizard__section create-wizard__section--form">
                <Input
                  id="create-tenant-name"
                  label="Tenant Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={fieldErrors.name}
                  required
                  fullWidth
                  disabled={isLoading}
                />
                <Input
                  id="create-tenant-website"
                  type="url"
                  label="Website URL"
                  placeholder="https://example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  error={fieldErrors.website}
                  required
                  fullWidth
                  disabled={isLoading}
                />
              </div>
            </fieldset>
          </div>
        )}

        {/* Step 2: Assign Tenant Admin */}
        {step === 2 && (
          <div
            ref={adminStepRef}
            className="create-wizard__step create-wizard__step--admin-step"
          >
            <fieldset className="create-wizard__fieldset">
              <legend className="create-wizard__legend">
                <span>Assign Tenant Admin</span>
                {tenantCapacityGuidance ? (
                  <Tooltip
                    content={tenantCapacityGuidance.message}
                    position="bottom"
                    align="start"
                    openDelay={0}
                    closeDelay={0}
                    className="create-wizard__legend-tooltip"
                  >
                    <button
                      type="button"
                      className="create-wizard__legend-help-trigger"
                      aria-label={tenantCapacityGuidance.title}
                    >
                      <MdInfoOutline aria-hidden="true" focusable="false" />
                      <span className="sr-only">{tenantCapacityGuidance.title}</span>
                    </button>
                  </Tooltip>
                ) : null}
              </legend>
              <div className="create-wizard__section create-wizard__admin-search">
                <UserSearchSelect
                  customerId={customerId}
                  selectedIds={tenantAdminUserIds}
                  onChange={handleAdminChange}
                  label="Search for tenant admin"
                  error={fieldErrors.tenantAdminUserIds}
                  minRequired={1}
                  maxSelections={1}
                  lockSelectionUntilRemoval
                  allowTemporaryEmptySelection
                  expandDropdown
                  disabled={isLoading}
                />
                <p className="create-wizard__hint">
                  {tenantAdminUserIds.length > 0
                    ? 'Remove the selected tenant admin before searching for a different user.'
                    : 'Search and select one active user from this customer to serve as tenant admin.'}
                </p>
              </div>
            </fieldset>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="create-wizard__step">
            <fieldset className="create-wizard__fieldset">
              <legend className="create-wizard__legend">Review Details</legend>
              <div className="create-wizard__section">
                <p className="create-wizard__review-copy">
                  Confirm the tenant details and initial tenant-admin assignment before creating
                  this tenant.
                </p>
                <dl className="create-wizard__review-list">
                  <dt>Name</dt>
                  <dd>{name}</dd>
                  <dt>Website</dt>
                  <dd>{website}</dd>
                  <dt>Tenant Admin</dt>
                  <dd>
                    {tenantAdminUserIds.length > 0
                      ? (selectedAdminInfo?.name || selectedAdminInfo?.email || tenantAdminUserIds[0])
                      : 'None'}
                  </dd>
                </dl>
              </div>
            </fieldset>
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer className="maintain-tenants__dialog-footer">
        {step > 1 && (
          <Button variant="outline" onClick={handleBack} disabled={isLoading}>
            Back
          </Button>
        )}
        <Button variant="outline" onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        {step < TOTAL_STEPS ? (
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={isLoading || isCreateBlockedByCapacity}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleCreate}
            loading={isLoading}
            disabled={isLoading || isCreateBlockedByCapacity}
          >
            Create Tenant
          </Button>
        )}
      </Dialog.Footer>
    </Dialog>
  )
}

export { CreateTenantWizard }
export default CreateTenantWizard
