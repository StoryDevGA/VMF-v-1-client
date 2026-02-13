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
import './CustomerSelector.css'

const CREATE_ACTION = '__create__'

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

  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation()

  /* ---- Create-form state ---- */
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTopology, setNewTopology] = useState('SINGLE_TENANT')
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
      setCreateError('')

      const trimmedName = newName.trim()
      if (!trimmedName) {
        setCreateError('Name is required')
        return
      }

      try {
        const result = await createCustomer({
          name: trimmedName,
          topology: newTopology,
          vmfPolicy: DEFAULT_VMF_POLICY[newTopology],
          billing: { planCode: 'FREE' },
        }).unwrap()

        const createdId = result?.data?._id ?? result?._id
        if (createdId) setCustomerId(createdId)

        setNewName('')
        setNewTopology('SINGLE_TENANT')
        setShowCreateForm(false)
      } catch (err) {
        const msg =
          err?.data?.error?.message ??
          err?.data?.message ??
          err?.message ??
          'Failed to create customer'
        setCreateError(msg)
      }
    },
    [newName, newTopology, createCustomer, setCustomerId],
  )

  const handleCancelCreate = useCallback(() => {
    setShowCreateForm(false)
    setCreateError('')
    setNewName('')
  }, [])

  // Only visible to Super Admin
  if (!isSuperAdmin) return null

  const customers = customersData?.data ?? []
  const options = customers.map((c) => ({ value: c._id, label: c.name }))
  const actions = [{ value: CREATE_ACTION, label: '+ Create customer…' }]

  /* ---- Inline create form ---- */
  if (showCreateForm) {
    return (
      <form
        className={`customer-selector--form ${className}`.trim()}
        onSubmit={handleCreate}
        aria-label="Create customer"
      >
        <input
          className="customer-selector__input"
          type="text"
          placeholder="Customer name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={isCreating}
          autoFocus
          aria-label="Customer name"
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
