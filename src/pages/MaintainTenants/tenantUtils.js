/**
 * Shared Tenant Utilities
 *
 * Common helpers used across MaintainTenants, CreateTenantWizard,
 * TenantEditDrawer, and TenantListView.
 */

/** Canonical role constant for tenant-admin checks */
export const TENANT_ADMIN_ROLE = 'TENANT_ADMIN'

/** Deduplicate, uppercase, trim, and sort a roles array */
export const normalizeRoles = (roles) =>
  [...new Set(
    (roles ?? [])
      .map((role) => String(role ?? '').trim().toUpperCase())
      .filter(Boolean),
  )].sort()

/** Status variant mapping for the Status component */
export const STATUS_VARIANT_MAP = {
  ENABLED: 'success',
  DISABLED: 'error',
  ARCHIVED: 'neutral',
}

export const getTenantStatus = (tenant) =>
  String(tenant?.status ?? 'UNKNOWN').trim().toUpperCase()

export const getTenantId = (tenant) => {
  const raw = tenant?._id ?? tenant?.id
  return raw ? String(raw).trim() : null
}

export const getTenantCapacityCountLabel = (countMode) =>
  countMode === 'NON_ARCHIVED' ? 'non-archived' : 'active'

export const getFieldErrorMessage = (value) => {
  if (typeof value === 'string' && value.trim()) return value.trim()

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) return entry.trim()
      if (
        entry
        && typeof entry === 'object'
        && typeof entry.message === 'string'
        && entry.message.trim()
      ) {
        return entry.message.trim()
      }
    }
  }

  if (value && typeof value === 'object' && typeof value.message === 'string') {
    return value.message.trim()
  }

  return ''
}

export const normalizeTenantFieldName = (field) => {
  const compact = String(field ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '')

  if (!compact) return ''
  if (compact.includes('tenantadminuserids') || compact.includes('tenantadmins')) {
    return 'tenantAdminUserIds'
  }
  if (compact.includes('website')) return 'website'
  if (compact.endsWith('name')) return 'name'

  return ''
}

export const mapTenantValidationErrors = (details) => {
  const mapped = {}

  if (Array.isArray(details)) {
    for (const detail of details) {
      if (!detail || typeof detail !== 'object') continue
      const field = normalizeTenantFieldName(detail.field)
      const message = getFieldErrorMessage(detail.message)
      if (!field || !message) continue
      mapped[field] = message
    }
    return mapped
  }

  if (!details || typeof details !== 'object') return mapped

  for (const [field, value] of Object.entries(details)) {
    const normalizedField = normalizeTenantFieldName(field)
    const message = getFieldErrorMessage(value)
    if (!normalizedField || !message) continue
    mapped[normalizedField] = message
  }

  return mapped
}
