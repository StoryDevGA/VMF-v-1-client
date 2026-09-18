import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { BILLING_CYCLE_OPTIONS } from './superAdminCustomers.constants.js'
import './EditCustomerDialog.css'

export function EditCustomerDialog({
  open,
  onClose,
  form,
  setForm,
  errors,
  licenseLevels,
  isLoadingLicenseLevels,
  onSubmit,
  isSubmitting,
  isFetchingDetails,
  detailsError,
  creditAdjustment,
  setCreditAdjustment,
  creditErrors,
  onAdjustCredit,
  isAdjustingCredit,
}) {
  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <Dialog.Header>
        <h2 className="super-admin-customers__dialog-title">Update Customer</h2>
      </Dialog.Header>
      <Dialog.Body className="super-admin-customers__dialog-body">
        {detailsError ? (
          <p className="super-admin-customers__error" role="alert">
            {detailsError.message}
          </p>
        ) : null}
        <Input
          id="sa-customer-edit-name"
          label="Customer Name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          error={errors.name}
          fullWidth
          disabled={isFetchingDetails}
        />
        <Input
          id="sa-customer-edit-website"
          label="Website (Optional)"
          value={form.website}
          onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
          error={errors.website}
          fullWidth
          disabled={isFetchingDetails}
        />
        <div className="super-admin-customers__row">
          <div className="super-admin-customers__field">
            <span className="super-admin-customers__field-label">Topology</span>
            <span className="super-admin-customers__read-only-value">
              {form.topology === 'MULTI_TENANT' ? 'Multi Tenant' : 'Single Tenant'}
            </span>
            <small className="super-admin-customers__field-help">Topology is fixed after customer creation.</small>
          </div>
          <div className="super-admin-customers__field">
            <label htmlFor="sa-customer-edit-vmf-count" className="super-admin-customers__field-label">
              VMF Count
            </label>
            <Input
              id="sa-customer-edit-vmf-count"
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
            id="sa-customer-edit-max-tenants"
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
          id="sa-customer-edit-license"
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
          onChange={(event) => setForm((current) => ({ ...current, licenseLevelId: event.target.value }))}
          error={errors.licenseLevelId}
        />
        <div className="super-admin-customers__row">
          <Select
            id="sa-customer-edit-billing"
            label="Billing Cycle"
            value={form.billingCycle}
            options={BILLING_CYCLE_OPTIONS}
            onChange={(event) => setForm((current) => ({ ...current, billingCycle: event.target.value }))}
          />
          <div className="super-admin-customers__field">
            <label htmlFor="sa-customer-edit-plan" className="super-admin-customers__field-label">
              Plan Code
            </label>
            <Input
              id="sa-customer-edit-plan"
              value={form.planCode}
              onChange={(event) => setForm((current) => ({ ...current, planCode: event.target.value }))}
              fullWidth
            />
          </div>
        </div>
        <fieldset className="super-admin-customers__credit-fields">
          <legend className="super-admin-customers__field-label">Signal credit balances</legend>
          <div className="super-admin-customers__credit-readback" aria-label="Current Signal credit balances">
            <span>Website Analysis: <strong>{form.creditBalances?.websiteAnalysis ?? 0}</strong></span>
            <span>Document Improvement: <strong>{form.creditBalances?.documentImprovement ?? 0}</strong></span>
          </div>
          <p className="super-admin-customers__field-help">Manual adjustments do not enable a disabled entitlement or change the licence level.</p>
          <div className="super-admin-customers__row">
            <Select
              id="sa-customer-credit-product"
              label="Product"
              value={creditAdjustment.productKey}
              options={[{ value: 'WEBSITE', label: 'Website Analysis' }, { value: 'DOCUMENTS', label: 'Document Improvement' }]}
              onChange={(event) => setCreditAdjustment((current) => ({ ...current, productKey: event.target.value }))}
            />
            <Input
              id="sa-customer-credit-delta"
              type="number"
              step={1}
              label="Adjustment"
              placeholder="e.g. 10 or -1"
              value={creditAdjustment.delta}
              onChange={(event) => setCreditAdjustment((current) => ({ ...current, delta: event.target.value }))}
              error={creditErrors.delta}
              fullWidth
            />
          </div>
          <Input
            id="sa-customer-credit-reason"
            label="Adjustment reason"
            value={creditAdjustment.reason}
            onChange={(event) => setCreditAdjustment((current) => ({ ...current, reason: event.target.value }))}
            error={creditErrors.reason}
            fullWidth
          />
          {creditErrors.form ? <p className="super-admin-customers__error" role="alert">{creditErrors.form}</p> : null}
          <Button type="button" variant="outline" onClick={onAdjustCredit} loading={isAdjustingCredit} disabled={isAdjustingCredit || isFetchingDetails}>
            Apply credit adjustment
          </Button>
        </fieldset>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Save Changes
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
