/**
 * TenantSwitcher Component
 *
 * Composes CustomSelect to let users switch the active tenant scope.
 * Shows only ENABLED tenants for the current customer context.
 *
 * @module components/TenantSwitcher
 */

import { useCallback, useMemo } from 'react'
import { MdBusiness } from 'react-icons/md'
import { CustomSelect } from '../CustomSelect'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { getTenantId } from '../../pages/MaintainTenants/tenantUtils.js'

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
    selectableTenants,
    isLoadingTenants,
    setTenantId,
  } = useTenantContext()

  const selectableTenantRows = useMemo(
    () => (Array.isArray(selectableTenants) ? selectableTenants : []),
    [selectableTenants],
  )

  const handleChange = useCallback(
    (value) => {
      if (value === ALL_TENANTS_VALUE) {
        setTenantId(null, null)
      } else {
        const tenantPool = selectableTenantRows.length > 0 ? selectableTenantRows : tenants
        const tenant = tenantPool.find((t) => getTenantId(t) === value)
        setTenantId(value, tenant?.name ?? null)
      }
    },
    [selectableTenantRows, setTenantId, tenants],
  )

  // Don't render if there's no customer context
  if (!customerId) return null

  const enabledTenants = tenants.filter((t) => t.status === 'ENABLED')
  const tenantOptionsSource = selectableTenantRows.length > 0 ? selectableTenantRows : enabledTenants
  const options = [
    { value: ALL_TENANTS_VALUE, label: 'All Tenants' },
    ...tenantOptionsSource
      .map((tenant) => {
        const resolvedTenantId = getTenantId(tenant)
        const resolvedTenantName = String(tenant?.name ?? '').trim()
        if (!resolvedTenantId || !resolvedTenantName) return null
        return { value: resolvedTenantId, label: resolvedTenantName }
      })
      .filter(Boolean),
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
