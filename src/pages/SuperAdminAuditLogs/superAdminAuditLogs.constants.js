export const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'LICENSE_LEVEL_CREATED', label: 'LICENSE_LEVEL_CREATED' },
  { value: 'LICENSE_LEVEL_UPDATED', label: 'LICENSE_LEVEL_UPDATED' },
  { value: 'CUSTOMER_CREATED', label: 'CUSTOMER_CREATED' },
  { value: 'CUSTOMER_UPDATED', label: 'CUSTOMER_UPDATED' },
  { value: 'CUSTOMER_STATUS_CHANGED', label: 'CUSTOMER_STATUS_CHANGED' },
  { value: 'CUSTOMER_ADMIN_ASSIGNED', label: 'CUSTOMER_ADMIN_ASSIGNED' },
  { value: 'CUSTOMER_ADMIN_REPLACED', label: 'CUSTOMER_ADMIN_REPLACED' },
  { value: 'ACCESS_DENIED', label: 'ACCESS_DENIED' },
]

export const RESOURCE_TYPE_OPTIONS = [
  { value: '', label: 'All resource types' },
  { value: 'Customer', label: 'Customer' },
  { value: 'LicenseLevel', label: 'LicenseLevel' },
  { value: 'Tenant', label: 'Tenant' },
  { value: 'User', label: 'User' },
  { value: 'VMF', label: 'VMF' },
  { value: 'Deal', label: 'Deal' },
  { value: 'Invitation', label: 'Invitation' },
  { value: 'AuditLog', label: 'AuditLog' },
]

export const actorLabel = (row) => {
  if (row?.actorUserId?.name) return row.actorUserId.name
  if (row?.actorUserId?.email) return row.actorUserId.email
  if (typeof row?.actorUserId === 'string') return row.actorUserId
  return '--'
}

export const parseIds = (value) =>
  String(value ?? '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
