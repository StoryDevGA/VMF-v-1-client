import {
  appendRequestReference,
  getStepUpErrorSignal,
  getErrorMessage,
} from '../../utils/errors.js'
import {
  ASSIGN_INVITATION_ALREADY_ACTIVE_FALLBACK_MESSAGE,
  INVITATION_ALREADY_ACTIVE_REASON_MESSAGE_MAP,
  REPLACE_ADMIN_STEP_UP_REQUIRED_MESSAGE,
  REPLACE_ADMIN_STEP_UP_INVALID_MESSAGE,
  REPLACE_ADMIN_STEP_UP_UNAVAILABLE_MESSAGE,
  VIEW_INVITATIONS,
} from './superAdminCustomers.constants.js'

export const normalizeWorkspaceView = (value) =>
  value === VIEW_INVITATIONS ? VIEW_INVITATIONS : 'customers'

export const getCustomerId = (customer) => customer?.id ?? customer?._id

export const displayStatus = (value) => (value === 'DISABLED' ? 'INACTIVE' : value || '--')

export const parsePositiveInt = (value) => Number.parseInt(String(value ?? '').trim(), 10)

export const getRowActionMenuId = (row) => {
  const rawId = String(getCustomerId(row) ?? row?.name ?? 'customer').toLowerCase()
  const safeId = rawId.replace(/[^a-z0-9_-]/g, '-')
  return `sa-customer-row-actions-${safeId}`
}

export const getVmfPolicyForCount = (topology, vmfCount) => {
  const parsedCount = parsePositiveInt(vmfCount)
  const normalizedCount = Number.isInteger(parsedCount) && parsedCount > 1 ? parsedCount : 1

  if (topology === 'MULTI_TENANT') {
    return normalizedCount > 1 ? 'PER_TENANT_MULTI' : 'PER_TENANT_SINGLE'
  }
  return normalizedCount > 1 ? 'MULTI' : 'SINGLE'
}

export const normalizeUserStatus = (row) => {
  const explicitStatus = String(row?.status ?? '')
    .trim()
    .toUpperCase()
  if (explicitStatus) return explicitStatus
  return row?.isActive ? 'ACTIVE' : 'INACTIVE'
}

export const getUserTrustStatus = (row) =>
  String(row?.trustStatus ?? row?.identityPlus?.trustStatus ?? 'UNTRUSTED')
    .trim()
    .toUpperCase()

export const getCustomerUserRoles = (row, customerId) => {
  if (Array.isArray(row?.customerRoles) && row.customerRoles.length > 0) {
    return row.customerRoles
  }

  if (!Array.isArray(row?.memberships)) return []
  const targetCustomerId = String(customerId ?? '')
  const membership = row.memberships.find((item) =>
    String(item?.customerId ?? '') === targetCustomerId,
  )

  return Array.isArray(membership?.roles) ? membership.roles : []
}

export const getUserId = (row) => String(row?.id ?? row?._id ?? '').trim()

export const getUserDisplayName = (row) =>
  String(row?.name ?? row?.email ?? getUserId(row) ?? 'User').trim() || 'User'

export const getUserEmail = (row) => String(row?.email ?? '').trim()

export const normalizeRoles = (roles) => (
  Array.isArray(roles)
    ? [...new Set(roles.filter((role) => typeof role === 'string' && role.trim()))]
    : []
)

export const isSingleTenantTopology = (topology) =>
  String(topology ?? '')
    .trim()
    .toUpperCase() !== 'MULTI_TENANT'

export const getLifecycleActionVerb = (actionType) => {
  if (actionType === 'enable') return 'Reactivate'
  if (actionType === 'archive') return 'Archive'
  return 'Deactivate'
}

export const isValidUrl = (value) => {
  if (!value) return true
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

export const createFormFromCustomer = (customer) => ({
  name: customer?.name ?? '',
  website: customer?.website ?? '',
  topology: customer?.topology ?? 'SINGLE_TENANT',
  vmfPolicy: customer?.vmfPolicy ?? getVmfPolicyForCount(
    customer?.topology ?? 'SINGLE_TENANT',
    customer?.governance?.maxVmfsPerTenant ?? 1,
  ),
  licenseLevelId: customer?.licenseLevelId ?? '',
  maxTenants: String(customer?.governance?.maxTenants ?? 1),
  maxVmfsPerTenant: String(customer?.governance?.maxVmfsPerTenant ?? 1),
  planCode: customer?.billing?.planCode ?? 'FREE',
  billingCycle: customer?.billing?.cycle ?? 'MONTHLY',
})

export const validateForm = (form) => {
  const errors = {}
  const payload = {}

  const name = form.name.trim()
  if (!name) errors.name = 'Name is required.'
  else payload.name = name

  const website = form.website.trim()
  if (website && !isValidUrl(website)) errors.website = 'Website must be a valid URL.'
  else if (website) payload.website = website

  if (!form.licenseLevelId) errors.licenseLevelId = 'Licence level is required.'
  else payload.licenseLevelId = form.licenseLevelId

  let maxTenants = 1
  if (form.topology === 'MULTI_TENANT') {
    maxTenants = parsePositiveInt(form.maxTenants)
    if (!Number.isInteger(maxTenants) || maxTenants < 1) {
      errors.maxTenants = 'Max tenants must be at least 1.'
    }
  }

  const maxVmfsPerTenant = parsePositiveInt(form.maxVmfsPerTenant)
  if (!Number.isInteger(maxVmfsPerTenant) || maxVmfsPerTenant < 1) {
    errors.maxVmfsPerTenant = 'VMF count must be at least 1.'
  }

  payload.topology = form.topology
  payload.vmfPolicy = getVmfPolicyForCount(form.topology, maxVmfsPerTenant)
  payload.isServiceProvider = form.topology === 'MULTI_TENANT'
  payload.governance = { maxTenants, maxVmfsPerTenant }
  payload.billing = {
    planCode: form.planCode.trim() || 'FREE',
    cycle: form.billingCycle,
  }

  return { errors, payload }
}

export const getFirstErrorDetailMessage = (details) => {
  if (!details || typeof details !== 'object') return ''

  const stack = [details]
  while (stack.length > 0) {
    const current = stack.shift()

    if (typeof current === 'string' && current.trim()) {
      return current.trim()
    }

    if (Array.isArray(current)) {
      stack.push(...current)
      continue
    }

    if (current && typeof current === 'object') {
      if (typeof current.message === 'string' && current.message.trim()) {
        return current.message.trim()
      }
      stack.push(...Object.values(current))
    }
  }

  return ''
}

const normalizeCreateUserErrorField = (candidate) => {
  const normalized = String(candidate ?? '')
    .trim()
    .toLowerCase()
  if (!normalized) return ''

  const compact = normalized.replace(/[^a-z]/g, '')
  if (!compact) return ''

  if (compact.includes('existinguserid')) return 'existingUserId'
  if (compact.includes('email')) return 'email'
  if (compact.includes('roles') || compact.includes('customerroles')) return 'roles'
  if (compact.endsWith('name')) return 'name'

  return ''
}

const getFieldDetailMessage = (value) => {
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
    return ''
  }

  if (value && typeof value === 'object' && typeof value.message === 'string') {
    const message = value.message.trim()
    if (message) return message
  }

  return ''
}

export const mapFieldErrorsFromDetails = (details) => {
  const mapped = {}

  if (Array.isArray(details)) {
    for (const detail of details) {
      if (!detail || typeof detail !== 'object') continue
      const field = normalizeCreateUserErrorField(detail.field)
      const message = getFieldDetailMessage(detail.message)
      if (!field || !message) continue
      mapped[field] = message
    }
    return mapped
  }

  if (!details || typeof details !== 'object') return mapped

  for (const [field, value] of Object.entries(details)) {
    const normalizedField = normalizeCreateUserErrorField(field)
    const message = getFieldDetailMessage(value)
    if (!normalizedField || !message) continue
    mapped[normalizedField] = message
  }

  return mapped
}

export const mapEditUserFieldErrorsFromDetails = (details) => {
  const mapped = mapFieldErrorsFromDetails(details)
  const editErrors = {}

  if (mapped.name) editErrors.name = mapped.name
  if (mapped.roles) editErrors.roles = mapped.roles

  return editErrors
}

export const normalizeMutationData = (result) => {
  if (result?.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
    return result.data
  }

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result
  }

  return {}
}

export const getCreateUserConflictMessage = (appError) => {
  const reason = String(appError?.details?.reason ?? '')
    .trim()
    .toLowerCase()
  const existingUserId = String(appError?.details?.existingUserId ?? '').trim()
  const existingUserSuffix = existingUserId ? ` (User ID: ${existingUserId})` : ''

  if (appError?.code === 'USER_ALREADY_EXISTS') {
    if (reason === 'already-in-customer') {
      return appendRequestReference(
        `A user with this email already exists in this customer${existingUserSuffix}.`,
        appError?.requestId,
      )
    }
    if (reason === 'other-customer') {
      return appendRequestReference(
        'This email belongs to a user in another customer and cannot be invited here.',
        appError?.requestId,
      )
    }
    if (reason === 'existing-identity') {
      return appendRequestReference(
        `An existing identity already uses this email${existingUserSuffix}.`,
        appError?.requestId,
      )
    }
  }

  if (appError?.code === 'USER_CUSTOMER_CONFLICT' && reason === 'other-customer') {
    return appendRequestReference(
      'This user belongs to another customer and cannot be assigned to this customer.',
      appError?.requestId,
    )
  }

  const detailMessage = getFirstErrorDetailMessage(appError?.details)
  if (detailMessage) return detailMessage

  return appError?.message || getErrorMessage(appError?.code)
}

export const getAssignAdminErrorMessage = (appError) => {
  if (appError?.status === 409 && appError?.code === 'INVITATION_ALREADY_ACTIVE') {
    const reason = String(appError?.details?.reason ?? '')
      .trim()
      .toUpperCase()
    if (reason && INVITATION_ALREADY_ACTIVE_REASON_MESSAGE_MAP[reason]) {
      return INVITATION_ALREADY_ACTIVE_REASON_MESSAGE_MAP[reason]
    }

    const detailMessage = getFirstErrorDetailMessage(appError?.details)
    if (detailMessage && detailMessage.trim().toUpperCase() !== reason) {
      return detailMessage
    }

    const backendMessage = String(appError?.message ?? '').trim()
    const genericMessage = getErrorMessage('INVITATION_ALREADY_ACTIVE')
    const backendMessageIsGeneric =
      !backendMessage ||
      backendMessage === genericMessage ||
      backendMessage.startsWith(`${genericMessage} (Ref:`)

    if (!backendMessageIsGeneric) {
      return backendMessage
    }

    return ASSIGN_INVITATION_ALREADY_ACTIVE_FALLBACK_MESSAGE
  }

  const detailMessage = getFirstErrorDetailMessage(appError?.details)
  if (detailMessage) return detailMessage

  return appError?.message || getErrorMessage(appError?.code)
}

export const getReplaceAdminErrorMessage = (appError) => {
  const signal = getStepUpErrorSignal(appError)
  if (signal === 'required') {
    return appendRequestReference(REPLACE_ADMIN_STEP_UP_REQUIRED_MESSAGE, appError?.requestId)
  }
  if (signal === 'invalid') {
    return appendRequestReference(REPLACE_ADMIN_STEP_UP_INVALID_MESSAGE, appError?.requestId)
  }
  if (signal === 'unavailable') {
    return appendRequestReference(REPLACE_ADMIN_STEP_UP_UNAVAILABLE_MESSAGE, appError?.requestId)
  }

  const detailMessage = getFirstErrorDetailMessage(appError?.details)
  if (detailMessage) return detailMessage

  return appError?.message || getErrorMessage(appError?.code)
}
