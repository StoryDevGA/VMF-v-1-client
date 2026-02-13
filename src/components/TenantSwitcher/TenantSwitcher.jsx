/**
 * TenantSwitcher Component
 *
 * Composes CustomSelect to let users switch the active tenant scope.
 * Shows only ENABLED tenants for the current customer context.
 *
 * @module components/TenantSwitcher
 */

import { useCallback } from 'react'
import { MdBusiness } from 'react-icons/md'
import { CustomSelect } from '../CustomSelect'
import { useTenantContext } from '../../hooks/useTenantContext.js'

const ALL_TENANTS_VALUE = ''

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
    (value) => {
      if (value === ALL_TENANTS_VALUE) {
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

  const enabledTenants = tenants.filter((t) => t.status === 'ENABLED')
  const options = [
    { value: ALL_TENANTS_VALUE, label: 'All Tenants' },
    ...enabledTenants.map((t) => ({ value: t._id, label: t.name })),
  ]

  return (
    <CustomSelect
      value={tenantId ?? ALL_TENANTS_VALUE}
      onChange={handleChange}
      options={options}
      placeholder="All Tenants"
      icon={<MdBusiness size={18} />}
      ariaLabel="Switch tenant"
      disabled={isLoadingTenants}
      className={className}
    />
  )
}

export default TenantSwitcher
