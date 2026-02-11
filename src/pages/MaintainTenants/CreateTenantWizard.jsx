/**
 * Create Tenant Wizard
 *
 * Multi-step dialog for creating a new tenant:
 *   1. Tenant Details — name, website URL
 *   2. Assign Tenant Admins — add user IDs for initial admins
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

import { useState, useCallback } from 'react'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { useToaster } from '../../components/Toaster'
import { UserSearchSelect } from '../../components/UserSearchSelect'
import { useCreateTenantMutation } from '../../store/api/tenantApi.js'
import { normalizeError } from '../../utils/errors.js'

/** Wizard step count */
const TOTAL_STEPS = 3

/**
 * CreateTenantWizard Component
 */
function CreateTenantWizard({ open, onClose, customerId }) {
  const { addToast } = useToaster()
  const [createTenantMutation, { isLoading }] = useCreateTenantMutation()

  /* ---- Wizard state ---- */
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [tenantAdminUserIds, setTenantAdminUserIds] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})

  /* ---- Reset when closing ---- */
  const handleClose = useCallback(() => {
    setStep(1)
    setName('')
    setWebsite('')
    setTenantAdminUserIds([])
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
      if (tenantAdminUserIds.length === 0) {
        errors.tenantAdminUserIds = 'At least one tenant admin is required.'
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
  const handleAdminChange = useCallback((newIds) => {
    setTenantAdminUserIds(newIds)
    // Clear any existing tenantAdminUserIds error when user adds admins
    setFieldErrors((prev) => {
      const { tenantAdminUserIds: _, ...rest } = prev
      return rest
    })
  }, [])

  /* ---- Submit ---- */
  const handleCreate = useCallback(async () => {
    try {
      const body = {
        name: name.trim(),
        website: website.trim(),
        tenantAdminUserIds,
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

      if (appError.status === 422 && appError.details) {
        const mapped = {}
        for (const detail of appError.details) {
          if (detail.field) mapped[detail.field] = detail.message
        }
        setFieldErrors(mapped)
        if (mapped.name || mapped.website) setStep(1)
        else if (mapped.tenantAdminUserIds) setStep(2)
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
  ])

  /* ---- Step labels ---- */
  const stepLabels = ['Tenant Details', 'Assign Admins', 'Review']

  return (
    <Dialog open={open} onClose={handleClose} size="md">
      <Dialog.Header>
        <h2 className="create-wizard__title">Create Tenant</h2>
        <p className="create-wizard__step-indicator">
          Step {step} of {TOTAL_STEPS}: {stepLabels[step - 1]}
        </p>
      </Dialog.Header>

      <Dialog.Body>
        {/* Step 1: Tenant Details */}
        {step === 1 && (
          <div className="create-wizard__step">
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
        )}

        {/* Step 2: Assign Tenant Admins */}
        {step === 2 && (
          <div className="create-wizard__step">
            <fieldset className="create-wizard__fieldset">
              <legend className="create-wizard__legend">Assign Tenant Admins</legend>
              <p className="create-wizard__hint">
                Search and select at least one user to serve as tenant administrator.
              </p>

              <UserSearchSelect
                customerId={customerId}
                selectedIds={tenantAdminUserIds}
                onChange={handleAdminChange}
                label="Search users by name or email"
                error={fieldErrors.tenantAdminUserIds}
                minRequired={1}
                disabled={isLoading}
              />
            </fieldset>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="create-wizard__step">
            <h3 className="create-wizard__review-heading">Review Details</h3>
            <dl className="create-wizard__review-list">
              <dt>Name</dt>
              <dd>{name}</dd>
              <dt>Website</dt>
              <dd>{website}</dd>
              <dt>Tenant Admins</dt>
              <dd>
                {tenantAdminUserIds.length > 0
                  ? tenantAdminUserIds.join(', ')
                  : 'None'}
              </dd>
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
            Create Tenant
          </Button>
        )}
      </Dialog.Footer>
    </Dialog>
  )
}

export default CreateTenantWizard
