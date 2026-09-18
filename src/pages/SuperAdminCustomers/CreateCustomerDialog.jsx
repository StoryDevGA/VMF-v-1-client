import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { BILLING_CYCLE_OPTIONS, INITIAL_FORM } from './superAdminCustomers.constants.js'
import './CreateCustomerDialog.css'

export function CreateCustomerDialog({
  open,
  onClose,
  form,
  setForm,
  errors,
  setErrors,
  licenseLevels,
  isLoadingLicenseLevels,
  licenseLevelsError,
  onSubmit,
  isSubmitting,
}) {
  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <Dialog.Header>
        <h2 className="super-admin-customers__dialog-title">Create Customer</h2>
      </Dialog.Header>
      <Dialog.Body className="super-admin-customers__dialog-body">
        {licenseLevelsError ? (
          <p className="super-admin-customers__error" role="alert">
            {licenseLevelsError.message}
          </p>
        ) : null}
        <form className="super-admin-customers__form" onSubmit={onSubmit} noValidate>
          <Input
            id="sa-customer-name"
            label="Customer Name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            error={errors.name}
            required
            fullWidth
          />
          <Input
            id="sa-customer-website"
            label="Website (Optional)"
            value={form.website}
            onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
            error={errors.website}
            fullWidth
          />
          <div className="super-admin-customers__row">
            <Select
              id="sa-customer-topology"
              label="Topology"
              value={form.topology}
              options={[
                { value: 'SINGLE_TENANT', label: 'Single Tenant' },
                { value: 'MULTI_TENANT', label: 'Multi Tenant' },
              ]}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  topology: event.target.value,
                }))
              }
            />
            <div className="super-admin-customers__field">
              <label htmlFor="sa-customer-vmf-count" className="super-admin-customers__field-label">
                VMF Count
              </label>
              <Input
                id="sa-customer-vmf-count"
                type="number"
                min={1}
                value={form.maxVmfsPerTenant}
                onChange={(event) =>
                  setForm((current) => ({ ...current, maxVmfsPerTenant: event.target.value }))
                }
                error={errors.maxVmfsPerTenant}
                fullWidth
              />
            </div>
          </div>
          {form.topology === 'MULTI_TENANT' ? (
            <Input
              id="sa-customer-max-tenants"
              type="number"
              min={1}
              label="Max Tenants"
              value={form.maxTenants}
              onChange={(event) => setForm((current) => ({ ...current, maxTenants: event.target.value }))}
              error={errors.maxTenants}
              fullWidth
            />
          ) : null}
          <Select
            id="sa-customer-license"
            label="Licence Level"
            value={form.licenseLevelId}
            options={[
              { value: '', label: isLoadingLicenseLevels ? 'Loading...' : 'Select licence level' },
              ...licenseLevels
                .map((level) => {
                  const levelId = level.id ?? level._id
                  if (!levelId) return null
                  return { value: levelId, label: level.name ?? levelId }
                })
                .filter(Boolean),
            ]}
            onChange={(event) => {
              const nextLicenseLevelId = event.target.value
              const selectedLevel = licenseLevels.find(
                (level) => String(level.id ?? level._id) === String(nextLicenseLevelId),
              )
              setForm((current) => ({
                ...current,
                licenseLevelId: nextLicenseLevelId,
                ...(selectedLevel?.homeExperience === 'SIGNAL'
                  ? {}
                  : { startingWebsiteCredits: '0', startingDocumentCredits: '0' }),
              }))
            }}
            error={errors.licenseLevelId}
          />
          {licenseLevels.find((level) => String(level.id ?? level._id) === String(form.licenseLevelId))?.homeExperience === 'SIGNAL' ? <fieldset className="super-admin-customers__credit-fields">
            <legend className="super-admin-customers__field-label">Signal starting credits</legend>
            <p className="super-admin-customers__field-help">Use whole numbers. Leave both at zero when no starting credits are included.</p>
            <div className="super-admin-customers__row">
              <Input
                id="sa-customer-starting-website-credits"
                type="number"
                min={0}
                step={1}
                label="Website Analysis"
                value={form.startingWebsiteCredits}
                onChange={(event) => setForm((current) => ({ ...current, startingWebsiteCredits: event.target.value }))}
                error={errors.startingWebsiteCredits}
                fullWidth
              />
              <Input
                id="sa-customer-starting-document-credits"
                type="number"
                min={0}
                step={1}
                label="Document Improvement"
                value={form.startingDocumentCredits}
                onChange={(event) => setForm((current) => ({ ...current, startingDocumentCredits: event.target.value }))}
                error={errors.startingDocumentCredits}
                fullWidth
              />
            </div>
          </fieldset> : null}
          {errors.form ? <p className="super-admin-customers__error" role="alert">{errors.form}</p> : null}
          <div className="super-admin-customers__row">
            <Select
              id="sa-customer-billing"
              label="Billing Cycle"
              value={form.billingCycle}
              options={BILLING_CYCLE_OPTIONS}
              onChange={(event) =>
                setForm((current) => ({ ...current, billingCycle: event.target.value }))
              }
            />
            <div className="super-admin-customers__field">
              <label htmlFor="sa-customer-plan" className="super-admin-customers__field-label">
                Plan Code
              </label>
              <Input
                id="sa-customer-plan"
                value={form.planCode}
                onChange={(event) => setForm((current) => ({ ...current, planCode: event.target.value }))}
                fullWidth
              />
            </div>
          </div>
          <div className="super-admin-customers__form-actions">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting || licenseLevels.length === 0}
            >
              Create
            </Button>
            <Button
              type="button"
              variant="outline"
              fullWidth
              disabled={isSubmitting}
              onClick={() => {
                setForm(INITIAL_FORM)
                setErrors({})
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </Dialog.Body>
    </Dialog>
  )
}
