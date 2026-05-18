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
 * @param {boolean} [props.includeAllTenants=true] — whether to include the all-tenant scope option
 * @param {string}  [props.placeholder='All Tenants'] — placeholder shown when no tenant is selected
 * @param {string}  [props.ariaLabel='Switch tenant'] — accessible label for the combobox
 */
export function TenantSwitcher({
  className = '',
  includeAllTenants = true,
  placeholder = 'All Tenants',
  ariaLabel = 'Switch tenant',
}) {
  const {
    customerId,
    canViewTenants,
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
      if (includeAllTenants && value === ALL_TENANTS_VALUE) {
        setTenantId(null, null)
      } else {
        const tenantPool = selectableTenantRows.length > 0 ? selectableTenantRows : tenants
        const tenant = tenantPool.find((t) => getTenantId(t) === value)
        setTenantId(value, tenant?.name ?? null)
      }
    },
    [includeAllTenants, selectableTenantRows, setTenantId, tenants],
  )

  // Don't render if there's no customer context
  if (!customerId || !canViewTenants) return null

  const enabledTenants = tenants.filter((t) => t.status === 'ENABLED')
  const tenantOptionsSource = selectableTenantRows.length > 0 ? selectableTenantRows : enabledTenants
  const options = [
    includeAllTenants ? { value: ALL_TENANTS_VALUE, label: 'All Tenants' } : null,
    ...tenantOptionsSource
      .map((tenant) => {
        const resolvedTenantId = getTenantId(tenant)
        const resolvedTenantName = String(tenant?.name ?? '').trim()
        if (!resolvedTenantId || !resolvedTenantName) return null
        return { value: resolvedTenantId, label: resolvedTenantName }
      })
      .filter(Boolean),
  ].filter(Boolean)

  return (
    <CustomSelect
      value={tenantId ?? ALL_TENANTS_VALUE}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      icon={<MdBusiness size={18} />}
      ariaLabel={ariaLabel}
      disabled={isLoadingTenants}
      className={className}
    />
  )
}

export default TenantSwitcher
