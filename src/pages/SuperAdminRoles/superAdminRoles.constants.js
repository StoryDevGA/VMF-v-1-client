export const ROLE_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/
export const ROLE_SCOPE_VALUES = ['PLATFORM', 'CUSTOMER', 'TENANT']

export const ROLE_SCOPE_OPTIONS = [
  { value: '', label: 'All scopes' },
  ...ROLE_SCOPE_VALUES.map((scope) => ({ value: scope, label: scope })),
]

export const ROLE_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

export const ROLE_SYSTEM_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'true', label: 'System' },
  { value: 'false', label: 'Custom' },
]

export const ROLE_FORM_SCOPE_OPTIONS = ROLE_SCOPE_VALUES.map((scope) => ({
  value: scope,
  label: scope,
}))

export const SUPER_ADMIN_ROLES_HELP_TEXT =
  'System roles are protected by backend policy. Create and maintain custom role catalogue entries for controlled future use.'

export const INITIAL_ROLE_FORM = {
  key: '',
  name: '',
  description: '',
  scope: 'CUSTOMER',
  isActive: true,
}

export const normalizeRoleKey = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase()

export const getRoleStatusVariant = (isActive) => (isActive ? 'success' : 'neutral')

export const getRoleTypeVariant = (isSystem) => (isSystem ? 'info' : 'neutral')

export const mapRoleValidationErrors = (appError) => {
  const nextErrors = {}
  const details = appError?.details

  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return nextErrors
  }

  if (details.key) nextErrors.key = details.key
  if (details.name) nextErrors.name = details.name
  if (details.description) nextErrors.description = details.description
  if (details.scope) nextErrors.scope = details.scope

  return nextErrors
}

export function validateRoleForm(formState, { mode = 'create' } = {}) {
  const errors = {}
  const roleKey = normalizeRoleKey(formState.key)
  const name = String(formState.name ?? '').trim()
  const description = String(formState.description ?? '').trim()
  const scope = String(formState.scope ?? '').trim().toUpperCase()

  if (mode === 'create') {
    if (!roleKey) {
      errors.key = 'Role key is required.'
    } else if (!ROLE_KEY_PATTERN.test(roleKey)) {
      errors.key =
        'Role key must start with a letter and use uppercase letters, numbers, and underscores only.'
    }
  }

  if (!name) {
    errors.name = 'Role name is required.'
  } else if (name.length > 255) {
    errors.name = 'Role name must be 255 characters or fewer.'
  }

  if (description.length > 1000) {
    errors.description = 'Description must be 1000 characters or fewer.'
  }

  if (!scope) {
    errors.scope = 'Scope is required.'
  } else if (!ROLE_SCOPE_VALUES.includes(scope)) {
    errors.scope = `Scope must be one of: ${ROLE_SCOPE_VALUES.join(', ')}.`
  }

  return {
    errors,
    payload: {
      ...(mode === 'create' ? { key: roleKey } : {}),
      name,
      ...(description ? { description } : {}),
      scope,
      ...(mode === 'create' ? { permissions: [] } : {}),
      isActive: Boolean(formState.isActive),
    },
  }
}

