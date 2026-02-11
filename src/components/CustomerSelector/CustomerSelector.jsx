/**
 * CustomerSelector Component
 *
 * Dropdown that allows Super Admin to select which customer context to operate in.
 * Mounted in the Header adjacent to the TenantSwitcher.
 *
 * Features:
 * - Only visible to Super Admin users
 * - Shows the currently selected customer (or placeholder)
 * - Dropdown lists all customers
 * - Selection updates tenant context (and clears tenant selection)
 * - Inline "Create Customer" quick-form when no customers exist
 * - Spinner while customers are loading
 * - Compact appearance using design tokens
 *
 * @module components/CustomerSelector
 * @requires Phase 2.1 — Authentication System
 * @requires Phase 4.3 — Service Provider Features (tenantContext)
 */

import { useState, useCallback } from 'react'
import { MdDomain, MdExpandMore, MdAdd } from 'react-icons/md'
import { Spinner } from '../Spinner'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import {
  useListCustomersQuery,
  useCreateCustomerMutation,
} from '../../store/api/customerApi.js'
import './CustomerSelector.css'

/* ---- Topology → VMF policy defaults ---- */
const DEFAULT_VMF_POLICY = {
  SINGLE_TENANT: 'SINGLE',
  MULTI_TENANT: 'PER_TENANT_SINGLE',
}

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

  /* ---- Inline create form state ---- */
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTopology, setNewTopology] = useState('SINGLE_TENANT')
  const [newPlanCode, setNewPlanCode] = useState('FREE')
  const [createError, setCreateError] = useState('')

  const handleChange = useCallback(
    (e) => {
      const value = e.target.value
      if (value === '__create__') {
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
          billing: { planCode: newPlanCode || 'FREE' },
        }).unwrap()

        const createdId = result?.data?._id ?? result?._id
        if (createdId) {
          setCustomerId(createdId)
        }

        // Reset form
        setNewName('')
        setNewTopology('SINGLE_TENANT')
        setNewPlanCode('FREE')
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
    [newName, newTopology, newPlanCode, createCustomer, setCustomerId],
  )

  const handleCancelCreate = useCallback(() => {
    setShowCreateForm(false)
    setCreateError('')
    setNewName('')
  }, [])

  // Only show for Super Admin
  if (!isSuperAdmin) return null

  const customers = customersData?.data ?? []
  const containerClasses = ['customer-selector', className].filter(Boolean).join(' ')

  /* ---- Inline create form ---- */
  if (showCreateForm) {
    return (
      <form
        className={`customer-selector customer-selector--form ${className}`.trim()}
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

  /* ---- Standard selector ---- */
  return (
    <div className={containerClasses}>
      <span className="customer-selector__icon" aria-hidden="true">
        <MdDomain size={18} />
      </span>

      {isLoading ? (
        <div className="customer-selector__loading">
          <Spinner size="small" />
        </div>
      ) : (
        <>
          <select
            className="customer-selector__select"
            value={customerId ?? ''}
            onChange={handleChange}
            aria-label="Select customer"
          >
            {!customerId && <option value="">Select customer...</option>}
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
            <option value="__create__">+ Create customer…</option>
          </select>

          <span className="customer-selector__arrow" aria-hidden="true">
            <MdExpandMore size={16} />
          </span>
        </>
      )}
    </div>
  )
}
