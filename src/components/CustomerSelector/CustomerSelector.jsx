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
  useCreateCustomerMutation,
} from '../../store/api/customerApi.js'
import { DEFAULT_VMF_POLICY } from '../../constants/customer.js'
import { normalizeError } from '../../utils/errors.js'
import './CustomerSelector.css'

const CREATE_ACTION = '__create__'
const DUPLICATE_NAME_MESSAGE = 'A customer with this name already exists.'

const normalizeCustomerName = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

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

  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation()

  /* ---- Create-form state ---- */
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newWebsite, setNewWebsite] = useState('')
  const [newTopology, setNewTopology] = useState('SINGLE_TENANT')
  const [nameError, setNameError] = useState('')
  const [websiteError, setWebsiteError] = useState('')
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
      setCreateError('')

      const trimmedName = newName.trim()
      const trimmedWebsite = newWebsite.trim()
      if (!trimmedName) {
        setNameError('Name is required')
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
        const result = await createCustomer({
          name: trimmedName,
          ...(trimmedWebsite ? { website: trimmedWebsite } : {}),
          topology: newTopology,
          vmfPolicy: DEFAULT_VMF_POLICY[newTopology],
          billing: { planCode: 'FREE' },
        }).unwrap()

        const createdId = result?.data?._id ?? result?._id
        if (createdId) setCustomerId(createdId)

        setNewName('')
        setNewWebsite('')
        setNewTopology('SINGLE_TENANT')
        setShowCreateForm(false)
      } catch (err) {
        const appError = normalizeError(err)

        const isConflict =
          appError.status === 409 ||
          appError.code === 'CONFLICT' ||
          appError.code === 'HTTP_409'

        if (isConflict) {
          setNameError(appError.message || DUPLICATE_NAME_MESSAGE)
          return
        }

        setCreateError(appError.message)
      }
    },
    [newName, newWebsite, newTopology, createCustomer, customers, setCustomerId],
  )

  const handleCancelCreate = useCallback(() => {
    setShowCreateForm(false)
    setNameError('')
    setWebsiteError('')
    setCreateError('')
    setNewName('')
    setNewWebsite('')
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
          className="customer-selector__topology"
          value={newTopology}
          onChange={(e) => setNewTopology(e.target.value)}
          disabled={isCreating}
          aria-label="Topology"
        >
          <option value="SINGLE_TENANT">Single Tenant</option>
          <option value="MULTI_TENANT">Multi Tenant</option>
        </select>

        <button
          className="customer-selector__btn customer-selector__btn--create"
          type="submit"
          disabled={isCreating}
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
