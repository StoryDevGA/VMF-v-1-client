const ENTITLEMENT_PATTERN = /^[A-Z][A-Z0-9_]*$/
export const LICENSE_ENTITLEMENT_KEYS = ['VMF', 'VIEWS', 'DEALS', 'WEBSITE', 'DOCUMENTS']

export const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

export const HOME_EXPERIENCE_OPTIONS = [
  { value: 'SIGNAL', label: 'Signal Home' },
  { value: 'CORE', label: 'Core Home' },
]

export const LICENSE_LEVELS_HELP_TEXT =
  'Licence levels are catalogue items. Create them here, then assign them during customer create or edit. The Customers column shows current usage.'

export const INITIAL_FORM = {
  name: '',
  description: '',
  entitlements: '',
  homeExperience: 'SIGNAL',
  isActive: true,
}

const normalizeEntitlementToken = (value) =>
  String(value ?? '')
    .trim()
    .replace(/^[{([]+/, '')
    .replace(/[\]})]+$/, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .toUpperCase()

export const parseEntitlements = (value) =>
  [...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map(normalizeEntitlementToken)
      .filter(Boolean),
  )]

export const formatEntitlements = (items) =>
  Array.isArray(items) ? items.join('\n') : ''

export const getStatusVariant = (isActive) => (isActive ? 'success' : 'neutral')

export function validateForm(formState) {
  const errors = {}
  const name = formState.name.trim()
  const description = formState.description.trim()
  const entitlements = parseEntitlements(formState.entitlements)

  if (!name) {
    errors.name = 'Name is required.'
  } else if (name.length > 255) {
    errors.name = 'Name must be 255 characters or fewer.'
  }

  if (description.length > 1000) {
    errors.description = 'Description must be 1000 characters or fewer.'
  }

  const invalid = entitlements.find((item) => !ENTITLEMENT_PATTERN.test(item))
  if (invalid) {
    errors.entitlements = `Invalid entitlement key "${invalid}". Use uppercase letters, numbers, and underscores.`
  }
  const unknown = entitlements.find((item) => !LICENSE_ENTITLEMENT_KEYS.includes(item))
  if (!errors.entitlements && unknown) {
    errors.entitlements = `Unknown entitlement key "${unknown}". Add it to the licence catalogue first.`
  }
  if (!errors.entitlements && formState.homeExperience === 'CORE' && entitlements.includes('WEBSITE')) {
    errors.entitlements = 'Core licence levels cannot include WEBSITE.'
  }

  return {
    errors,
    payload: {
      name,
      ...(description ? { description } : {}),
      featureEntitlements: entitlements,
      homeExperience: formState.homeExperience || 'SIGNAL',
      isActive: Boolean(formState.isActive),
    },
  }
}

export function mapValidationErrors(appError) {
  const nextErrors = {}
  const details = appError?.details

  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return nextErrors
  }

  if (details.name) nextErrors.name = details.name
  if (details.description) nextErrors.description = details.description
  if (details.featureEntitlements) {
    nextErrors.entitlements = details.featureEntitlements
  }
  if (details.homeExperience) nextErrors.homeExperience = details.homeExperience
  if (details.isActive) nextErrors.isActive = details.isActive
  if (details['']) {
    nextErrors.entitlements = details['']
  }

  return nextErrors
}
