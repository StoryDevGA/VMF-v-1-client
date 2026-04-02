export const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  // Customer
  { value: 'CUSTOMER_CREATED', label: 'CUSTOMER_CREATED' },
  { value: 'CUSTOMER_UPDATED', label: 'CUSTOMER_UPDATED' },
  { value: 'CUSTOMER_STATUS_CHANGED', label: 'CUSTOMER_STATUS_CHANGED' },
  { value: 'CUSTOMER_ADMIN_ASSIGNED', label: 'CUSTOMER_ADMIN_ASSIGNED' },
  { value: 'CUSTOMER_ADMIN_REPLACED', label: 'CUSTOMER_ADMIN_REPLACED' },
  { value: 'CUSTOMER_ADMIN_CANONICAL_SET', label: 'CUSTOMER_ADMIN_CANONICAL_SET' },
  { value: 'CUSTOMER_ADMIN_MUTATION_BLOCKED', label: 'CUSTOMER_ADMIN_MUTATION_BLOCKED' },
  { value: 'CUSTOMER_LIMITS_CHANGED', label: 'CUSTOMER_LIMITS_CHANGED' },
  { value: 'CUSTOMER_LICENSE_CHANGED', label: 'CUSTOMER_LICENSE_CHANGED' },
  // License level
  { value: 'LICENSE_LEVEL_CREATED', label: 'LICENSE_LEVEL_CREATED' },
  { value: 'LICENSE_LEVEL_UPDATED', label: 'LICENSE_LEVEL_UPDATED' },
  // Role
  { value: 'ROLE_CREATED', label: 'ROLE_CREATED' },
  { value: 'ROLE_UPDATED', label: 'ROLE_UPDATED' },
  { value: 'ROLE_DELETED', label: 'ROLE_DELETED' },
  { value: 'ROLE_MUTATION_BLOCKED', label: 'ROLE_MUTATION_BLOCKED' },
  // Tenant
  { value: 'TENANT_CREATED', label: 'TENANT_CREATED' },
  { value: 'TENANT_UPDATED', label: 'TENANT_UPDATED' },
  { value: 'TENANT_ENABLED', label: 'TENANT_ENABLED' },
  { value: 'TENANT_DISABLED', label: 'TENANT_DISABLED' },
  { value: 'TENANT_LIMIT_REJECTED', label: 'TENANT_LIMIT_REJECTED' },
  // User
  { value: 'USER_CREATED', label: 'USER_CREATED' },
  { value: 'USER_INVITED', label: 'USER_INVITED' },
  { value: 'USER_ROLE_UPDATED', label: 'USER_ROLE_UPDATED' },
  { value: 'USER_ENABLED', label: 'USER_ENABLED' },
  { value: 'USER_DISABLED', label: 'USER_DISABLED' },
  { value: 'USER_DELETED', label: 'USER_DELETED' },
  // Bulk
  { value: 'BULK_USERS_CREATED', label: 'BULK_USERS_CREATED' },
  { value: 'BULK_USERS_UPDATED', label: 'BULK_USERS_UPDATED' },
  { value: 'BULK_USERS_DISABLED', label: 'BULK_USERS_DISABLED' },
  // VMF
  { value: 'VMF_CREATED', label: 'VMF_CREATED' },
  { value: 'VMF_UPDATED', label: 'VMF_UPDATED' },
  { value: 'VMF_DELETED', label: 'VMF_DELETED' },
  { value: 'VMF_GRANT_CREATED', label: 'VMF_GRANT_CREATED' },
  { value: 'VMF_GRANT_REVOKED', label: 'VMF_GRANT_REVOKED' },
  { value: 'VMF_LIMIT_REJECTED', label: 'VMF_LIMIT_REJECTED' },
  // Deal
  { value: 'DEAL_CREATED', label: 'DEAL_CREATED' },
  { value: 'DEAL_UPDATED', label: 'DEAL_UPDATED' },
  { value: 'DEAL_ARCHIVED', label: 'DEAL_ARCHIVED' },
  // Identity Plus
  { value: 'IDENTITY_PLUS_REGISTRATION_COMPLETE', label: 'IDENTITY_PLUS_REGISTRATION_COMPLETE' },
  { value: 'IDENTITY_PLUS_TRUST_UPDATED', label: 'IDENTITY_PLUS_TRUST_UPDATED' },
  // Governance
  { value: 'SYSTEM_VERSIONING_POLICY_UPDATED', label: 'SYSTEM_VERSIONING_POLICY_UPDATED' },
  { value: 'GOVERNANCE_OVERRIDE_APPLIED', label: 'GOVERNANCE_OVERRIDE_APPLIED' },
  { value: 'GOVERNANCE_OVERRIDE_DENIED', label: 'GOVERNANCE_OVERRIDE_DENIED' },
  // Invitations
  { value: 'INVITATION_CREATED', label: 'INVITATION_CREATED' },
  { value: 'INVITATION_SENT', label: 'INVITATION_SENT' },
  { value: 'INVITATION_SEND_FAILED', label: 'INVITATION_SEND_FAILED' },
  { value: 'INVITATION_RESENT', label: 'INVITATION_RESENT' },
  { value: 'INVITATION_REVOKED', label: 'INVITATION_REVOKED' },
  { value: 'INVITATION_EXPIRED', label: 'INVITATION_EXPIRED' },
  { value: 'INVITATION_AUTHENTICATION_SUCCEEDED', label: 'INVITATION_AUTHENTICATION_SUCCEEDED' },
  { value: 'INVITATION_AUTHENTICATION_FAILED', label: 'INVITATION_AUTHENTICATION_FAILED' },
  { value: 'INVITATION_AUTH_LINK_ACCESSED', label: 'INVITATION_AUTH_LINK_ACCESSED' },
  { value: 'ONBOARDING_TRANSACTION_FAILED', label: 'ONBOARDING_TRANSACTION_FAILED' },
  // Access & audit
  { value: 'ACCESS_DENIED', label: 'ACCESS_DENIED' },
  { value: 'AUDIT_LOG_VIEWED', label: 'AUDIT_LOG_VIEWED' },
  { value: 'DENIED_ACCESS_LOG_VIEWED', label: 'DENIED_ACCESS_LOG_VIEWED' },
  { value: 'AUDIT_RETENTION_CLEANUP', label: 'AUDIT_RETENTION_CLEANUP' },
]

export const RESOURCE_TYPE_OPTIONS = [
  { value: '', label: 'All resource types' },
  { value: 'Customer', label: 'Customer' },
  { value: 'Tenant', label: 'Tenant' },
  { value: 'User', label: 'User' },
  { value: 'VMF', label: 'VMF' },
  { value: 'Deal', label: 'Deal' },
  { value: 'Invitation', label: 'Invitation' },
  { value: 'LicenseLevel', label: 'LicenseLevel' },
  { value: 'Role', label: 'Role' },
  { value: 'AuditLog', label: 'AuditLog' },
  { value: 'SystemVersioningPolicy', label: 'SystemVersioningPolicy' },
]

const normalizeText = (value) => {
  const text = String(value ?? '').trim()
  return text || null
}

const formatPermissionLabels = (permissions = []) =>
  Array.from(
    new Set(
      (Array.isArray(permissions) ? permissions : [])
        .map((permission) => normalizeText(permission))
        .filter(Boolean),
    ),
  )

export const humanizeAuditAction = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) return '--'

  const acronymMap = {
    api: 'API',
    gdpr: 'GDPR',
    id: 'ID',
    vmf: 'VMF',
  }

  return normalized
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((segment) => acronymMap[segment] || (segment.charAt(0).toUpperCase() + segment.slice(1)))
    .join(' ')
}

export const actorLabel = (row) => {
  if (row?.display?.actorLabel) return row.display.actorLabel
  if (row?.actorUserId?.name) return row.actorUserId.name
  if (row?.actorUserId?.email) return row.actorUserId.email
  if (typeof row?.actorUserId === 'string') return row.actorUserId
  return '--'
}

export const resourceLabel = (row) => {
  if (row?.display?.targetLabel) return row.display.targetLabel
  if (row?.display?.resourceLabel) return row.display.resourceLabel

  const resourceType = normalizeText(row?.resourceType)
  const resourceId = normalizeText(row?.resourceId)

  if (!resourceType && !resourceId) return '--'
  if (!resourceId) return resourceType
  return `${resourceType ?? 'Resource'}:${resourceId}`
}

export const auditSummaryLabel = (row) => {
  if (row?.summary) return row.summary

  const action = row?.action
  const actor = actorLabel(row) === '--' ? 'User' : actorLabel(row)
  const target = resourceLabel(row)
  const scopeLabel = normalizeText(row?.display?.scopeLabel)
  const permissionLabel = formatPermissionLabels(
    row?.display?.permissionLabels || row?.diff?.permissions || [],
  ).join(', ')

  switch (action) {
    case 'VMF_GRANT_CREATED':
      return `${actor} granted ${target} ${permissionLabel ? `${permissionLabel} ` : ''}access to ${scopeLabel || 'the VMF'}`
    case 'VMF_GRANT_REVOKED':
      return `${actor} revoked ${target}'s access to ${scopeLabel || 'the VMF'}`
    case 'USER_ENABLED':
      return `${actor} enabled ${target}`
    case 'USER_DISABLED':
      return `${actor} disabled ${target}`
    case 'USER_DELETED':
      return `${actor} deleted ${target}`
    case 'USER_CREATED':
      return `${actor} created ${target}`
    case 'USER_INVITED':
      return `${actor} invited ${target}`
    case 'USER_ROLE_UPDATED':
      if (row?.diff?.tenantVisibility && !row?.diff?.roles && !row?.diff?.customerRoles) {
        return `${actor} updated tenant visibility for ${target}`
      }
      return `${actor} updated roles for ${target}`
    case 'ACCESS_DENIED':
      if (row?.diff?.requiredPermission && row?.diff?.path) {
        return `Access denied for ${actor}: ${row.diff.requiredPermission} on ${row.diff.path}`
      }
      if (row?.diff?.requiredPermission) {
        return `Access denied for ${actor}: missing ${row.diff.requiredPermission}`
      }
      return `Access denied for ${actor}`
    default:
      return `${humanizeAuditAction(action)}: ${target}`
  }
}

export const parseIds = (value) =>
  String(value ?? '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
