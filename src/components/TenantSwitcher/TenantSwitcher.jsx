/**
 * TenantSwitcher Component
 *
 * Contextual dropdown that lets the user switch the active tenant scope.
 * Mounted in workflow context surfaces to drive scoped operations.
 *
 * Features:
 * - Shows the currently selected tenant (or "All Tenants")
 * - Dropdown lists all ENABLED tenants for the customer
 * - "All Tenants" option clears tenant filtering
 * - Spinner while tenants are loading
 * - Hidden when no customer context is available
 * - Compact appearance using design tokens
 *
 * @module components/TenantSwitcher
 */

import { useCallback } from 'react'
import { MdBusiness, MdExpandMore } from 'react-icons/md'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import './TenantSwitcher.css'

/**
 * @param {Object}  props
 * @param {string}  [props.className=''] — additional CSS class(es)
 */
export function TenantSwitcher({ className = '' }) {
  const {
    customerId,
    tenantId,
    tenants,
    isLoadingTenants,
    setTenantId,
  } = useTenantContext()

  const handleChange = useCallback(
    (e) => {
      const value = e.target.value
      if (value === '') {
        setTenantId(null, null)
      } else {
        const tenant = tenants.find((t) => t._id === value)
        setTenantId(value, tenant?.name ?? null)
      }
    },
    [tenants, setTenantId],
  )

  // Don't render if there's no customer context
  if (!customerId) return null

  const containerClasses = ['tenant-switcher', className].filter(Boolean).join(' ')

  return (
    <div className={containerClasses}>
      <span className="tenant-switcher__icon" aria-hidden="true">
        <MdBusiness size={18} />
      </span>

      <select
        className="tenant-switcher__select"
        value={tenantId ?? ''}
        onChange={handleChange}
        disabled={isLoadingTenants}
        aria-label="Switch tenant"
      >
        <option value="">All Tenants</option>
        {tenants
          .filter((t) => t.status === 'ENABLED')
          .map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
      </select>

      <span className="tenant-switcher__arrow" aria-hidden="true">
        <MdExpandMore size={16} />
      </span>
    </div>
  )
}

export default TenantSwitcher
