/**
 * CustomerSelector Component
 *
 * Composes CustomSelect to provide customer context switching
 * for Super Admin users. Includes an inline quick-create form.
 *
 * @module components/CustomerSelector
 * @requires Phase 2.1 — Authentication System
 * @requires Phase 4.3 — Service Provider Features (tenantContext)
 */

import { useState, useCallback } from 'react'
import { MdDomain } from 'react-icons/md'
import { CustomSelect } from '../CustomSelect'
import { Spinner } from '../Spinner'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import {
  useListCustomersQuery,
  useOnboardCustomerMutation,
} from '../../store/api/customerApi.js'
import { useListLicenseLevelsQuery } from '../../store/api/licenseLevelApi.js'
import { DEFAULT_VMF_POLICY } from '../../constants/customer.js'
import { normalizeError } from '../../utils/errors.js'
import './CustomerSelector.css'

const CREATE_ACTION = '__create__'
const DUPLICATE_NAME_MESSAGE = 'A customer with this name already exists.'
const INVALID_EMAIL_MESSAGE = 'Enter a valid admin email address'

const DEFAULT_GOVERNANCE_LIMITS = {
  SINGLE_TENANT: { maxTenants: 1, maxVmfsPerTenant: 1 },
  MULTI_TENANT: { maxTenants: 10, maxVmfsPerTenant: 5 },
}

const normalizeCustomerName = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

/**
 * @param {Object}  props
 * @param {string}  [props.className=''] — additional CSS class(es)
 */
export function CustomerSelector({ className = '' }) {
  const { customerId, isSuperAdmin, setCustomerId } = useTenantContext()

  const { data: customersData, isLoading } = useListCustomersQuery(
    { page: 1, pageSize: 100 },
    { skip: !isSuperAdmin },
  )
  const customers = customersData?.data ?? []

  const { data: licenseLevelsData, isLoading: isLoadingLicenseLevels } =
    useListLicenseLevelsQuery(
      { page: 1, pageSize: 100, isActive: true },
      { skip: !isSuperAdmin },
    )
  const licenseLevels = licenseLevelsData?.data ?? []

  const [onboardCustomer, { isLoading: isCreating }] = useOnboardCustomerMutation()

  /* ---- Create-form state ---- */
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newWebsite, setNewWebsite] = useState('')
  const [newTopology, setNewTopology] = useState('SINGLE_TENANT')
  const [newLicenseLevelId, setNewLicenseLevelId] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [nameError, setNameError] = useState('')
  const [websiteError, setWebsiteError] = useState('')
  const [licenseLevelError, setLicenseLevelError] = useState('')
  const [adminNameError, setAdminNameError] = useState('')
  const [adminEmailError, setAdminEmailError] = useState('')
  const [createError, setCreateError] = useState('')

  /* ---- Handlers ---- */
  const handleChange = useCallback(
    (value) => {
      if (value === CREATE_ACTION) {
        setShowCreateForm(true)
        return
      }
      if (value) {
        setCustomerId(value)
      }
    },
    [setCustomerId],
  )

  const handleCreate = useCallback(
    async (e) => {
      e.preventDefault()
      setNameError('')
      setWebsiteError('')
      setLicenseLevelError('')
      setAdminNameError('')
      setAdminEmailError('')
      setCreateError('')

      const trimmedName = newName.trim()
      const trimmedWebsite = newWebsite.trim()
      const trimmedAdminName = newAdminName.trim()
      const trimmedAdminEmail = newAdminEmail.trim().toLowerCase()

      if (!trimmedName) {
        setNameError('Name is required')
        return
      }

      if (!newLicenseLevelId) {
        setLicenseLevelError('License level is required')
        return
      }

      if (!trimmedAdminName) {
        setAdminNameError('Admin name is required')
        return
      }

      if (!trimmedAdminEmail) {
        setAdminEmailError('Admin email is required')
        return
      }

      if (!isValidEmail(trimmedAdminEmail)) {
        setAdminEmailError(INVALID_EMAIL_MESSAGE)
        return
      }

      if (trimmedWebsite) {
        try {
          const url = new URL(trimmedWebsite)
          if (!['http:', 'https:'].includes(url.protocol)) {
            setWebsiteError('Website URL must start with http:// or https://')
            return
          }
        } catch {
          setWebsiteError('Enter a valid website URL')
          return
        }
      }

      const normalizedNewName = normalizeCustomerName(trimmedName)
      const duplicateExists = customers.some(
        (customer) => normalizeCustomerName(customer?.name) === normalizedNewName,
      )
      if (duplicateExists) {
        setNameError(DUPLICATE_NAME_MESSAGE)
        return
      }

      try {
        const governanceDefaults =
          DEFAULT_GOVERNANCE_LIMITS[newTopology] ??
          DEFAULT_GOVERNANCE_LIMITS.SINGLE_TENANT

        const result = await onboardCustomer({
          customer: {
            companyName: trimmedName,
            ...(trimmedWebsite ? { website: trimmedWebsite } : {}),
            serviceProvider: newTopology === 'MULTI_TENANT',
            billingCycle: 'MONTHLY',
            planCode: 'FREE',
            licenseLevelId: newLicenseLevelId,
            maxTenants: governanceDefaults.maxTenants,
            maxVmfsPerTenant: governanceDefaults.maxVmfsPerTenant,
            topology: newTopology,
            vmfPolicy: DEFAULT_VMF_POLICY[newTopology],
          },
          adminUser: {
            name: trimmedAdminName,
            email: trimmedAdminEmail,
          },
        }).unwrap()

        const createdId = result?.data?.customer?._id ?? result?.customer?._id
        if (createdId) setCustomerId(createdId)

        setNewName('')
        setNewWebsite('')
        setNewTopology('SINGLE_TENANT')
        setNewLicenseLevelId('')
        setNewAdminName('')
        setNewAdminEmail('')
        setShowCreateForm(false)
      } catch (err) {
        const appError = normalizeError(err)

        const isConflict =
          appError.status === 409 ||
          appError.code === 'CONFLICT' ||
          appError.code === 'HTTP_409'

        if (isConflict) {
          const message = appError.message || 'This onboarding request conflicts with existing data.'
          if (/customer with this name/i.test(message)) {
            setNameError(message)
            return
          }
          if (/email/i.test(message) || /admin/i.test(message)) {
            setAdminEmailError(message)
            return
          }
          setCreateError(message)
          return
        }

        if (
          appError.status === 422 &&
          appError.details &&
          typeof appError.details === 'object' &&
          !Array.isArray(appError.details)
        ) {
          const details = appError.details
          let mappedAny = false

          if (details['customer.companyName'] || details['customer.name']) {
            setNameError(details['customer.companyName'] || details['customer.name'])
            mappedAny = true
          }
          if (details['customer.website']) {
            setWebsiteError(details['customer.website'])
            mappedAny = true
          }
          if (details['customer.licenseLevelId']) {
            setLicenseLevelError(details['customer.licenseLevelId'])
            mappedAny = true
          }
          if (details['adminUser.name']) {
            setAdminNameError(details['adminUser.name'])
            mappedAny = true
          }
          if (details['adminUser.email']) {
            setAdminEmailError(details['adminUser.email'])
            mappedAny = true
          }
          if (details['customer.vmfPolicy']) {
            setCreateError(details['customer.vmfPolicy'])
            mappedAny = true
          }
          if (details['customer.topology']) {
            setCreateError(details['customer.topology'])
            mappedAny = true
          }

          if (mappedAny) return
        }

        if (
          appError.status === 422 &&
          appError.code === 'VALIDATION_FAILED' &&
          /customer with this name/i.test(appError.message || '')
        ) {
          setNameError(appError.message || DUPLICATE_NAME_MESSAGE)
          return
        }

        setCreateError(appError.message)
      }
    },
    [
      newName,
      newWebsite,
      newTopology,
      newLicenseLevelId,
      newAdminName,
      newAdminEmail,
      onboardCustomer,
      customers,
      setCustomerId,
    ],
  )

  const handleCancelCreate = useCallback(() => {
    setShowCreateForm(false)
    setNameError('')
    setWebsiteError('')
    setLicenseLevelError('')
    setAdminNameError('')
    setAdminEmailError('')
    setCreateError('')
    setNewName('')
    setNewWebsite('')
    setNewTopology('SINGLE_TENANT')
    setNewLicenseLevelId('')
    setNewAdminName('')
    setNewAdminEmail('')
  }, [])

  // Only visible to Super Admin
  if (!isSuperAdmin) return null

  const options = customers.map((c) => ({ value: c._id, label: c.name }))
  const actions = [{ value: CREATE_ACTION, label: '+ Create customer…' }]

  /* ---- Inline create form ---- */
  if (showCreateForm) {
    return (
      <form
        className={`customer-selector--form ${className}`.trim()}
        onSubmit={handleCreate}
        noValidate
        aria-label="Create customer"
      >
        <input
          className={`customer-selector__input ${nameError ? 'customer-selector__input--error' : ''}`.trim()}
          type="text"
          placeholder="Customer name"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value)
            if (nameError) setNameError('')
          }}
          disabled={isCreating}
          autoFocus
          aria-label="Customer name"
          aria-invalid={nameError ? 'true' : 'false'}
          aria-describedby={nameError ? 'customer-name-error' : undefined}
        />

        <input
          className={`customer-selector__input ${websiteError ? 'customer-selector__input--error' : ''}`.trim()}
          type="url"
          placeholder="Website URL (optional)"
          value={newWebsite}
          onChange={(e) => {
            setNewWebsite(e.target.value)
            if (websiteError) setWebsiteError('')
          }}
          disabled={isCreating}
          aria-label="Website URL (optional)"
          aria-invalid={websiteError ? 'true' : 'false'}
          aria-describedby={websiteError ? 'customer-website-error' : undefined}
        />

        <select
          className="customer-selector__select"
          value={newTopology}
          onChange={(e) => setNewTopology(e.target.value)}
          disabled={isCreating}
          aria-label="Topology"
        >
          <option value="SINGLE_TENANT">Single Tenant</option>
          <option value="MULTI_TENANT">Multi Tenant</option>
        </select>

        <select
          className={`customer-selector__select ${licenseLevelError ? 'customer-selector__select--error' : ''}`.trim()}
          value={newLicenseLevelId}
          onChange={(e) => {
            setNewLicenseLevelId(e.target.value)
            if (licenseLevelError) setLicenseLevelError('')
          }}
          disabled={isCreating || isLoadingLicenseLevels}
          aria-label="License level"
          aria-invalid={licenseLevelError ? 'true' : 'false'}
          aria-describedby={licenseLevelError ? 'customer-license-level-error' : undefined}
        >
          <option value="">
            {isLoadingLicenseLevels ? 'Loading license levels...' : 'Select license level'}
          </option>
          {licenseLevels.map((licenseLevel) => {
            const licenseLevelId = licenseLevel?._id ?? licenseLevel?.id
            if (!licenseLevelId) return null
            return (
              <option key={licenseLevelId} value={licenseLevelId}>
                {licenseLevel.name || licenseLevelId}
              </option>
            )
          })}
        </select>

        <input
          className={`customer-selector__input ${adminNameError ? 'customer-selector__input--error' : ''}`.trim()}
          type="text"
          placeholder="Admin name"
          value={newAdminName}
          onChange={(e) => {
            setNewAdminName(e.target.value)
            if (adminNameError) setAdminNameError('')
          }}
          disabled={isCreating}
          aria-label="Admin name"
          aria-invalid={adminNameError ? 'true' : 'false'}
          aria-describedby={adminNameError ? 'customer-admin-name-error' : undefined}
        />

        <input
          className={`customer-selector__input ${adminEmailError ? 'customer-selector__input--error' : ''}`.trim()}
          type="email"
          placeholder="Admin email"
          value={newAdminEmail}
          onChange={(e) => {
            setNewAdminEmail(e.target.value)
            if (adminEmailError) setAdminEmailError('')
          }}
          disabled={isCreating}
          aria-label="Admin email"
          aria-invalid={adminEmailError ? 'true' : 'false'}
          aria-describedby={adminEmailError ? 'customer-admin-email-error' : undefined}
        />

        <button
          className="customer-selector__btn customer-selector__btn--create"
          type="submit"
          disabled={isCreating || isLoadingLicenseLevels || licenseLevels.length === 0}
          aria-label="Create"
        >
          {isCreating ? <Spinner size="small" /> : 'Create'}
        </button>

        <button
          className="customer-selector__btn customer-selector__btn--cancel"
          type="button"
          onClick={handleCancelCreate}
          disabled={isCreating}
          aria-label="Cancel"
        >
          Cancel
        </button>

        {nameError && (
          <span id="customer-name-error" className="customer-selector__error" role="alert">
            {nameError}
          </span>
        )}

        {websiteError && (
          <span id="customer-website-error" className="customer-selector__error" role="alert">
            {websiteError}
          </span>
        )}

        {licenseLevelError && (
          <span
            id="customer-license-level-error"
            className="customer-selector__error"
            role="alert"
          >
            {licenseLevelError}
          </span>
        )}

        {adminNameError && (
          <span id="customer-admin-name-error" className="customer-selector__error" role="alert">
            {adminNameError}
          </span>
        )}

        {adminEmailError && (
          <span id="customer-admin-email-error" className="customer-selector__error" role="alert">
            {adminEmailError}
          </span>
        )}

        {!isLoadingLicenseLevels && licenseLevels.length === 0 && (
          <span className="customer-selector__error" role="alert">
            No active license levels available. Create one before onboarding customers.
          </span>
        )}

        {createError && (
          <span className="customer-selector__error" role="alert">
            {createError}
          </span>
        )}
      </form>
    )
  }

  /* ---- Standard selector (delegates to CustomSelect) ---- */
  return (
    <CustomSelect
      value={customerId}
      onChange={handleChange}
      options={options}
      actions={actions}
      placeholder="Select customer..."
      icon={<MdDomain size={18} />}
      ariaLabel="Select customer"
      loading={isLoading}
      className={className}
    />
  )
}
