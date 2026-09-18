export const WORKSPACE_FILTERS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ALL: 'all',
})

export const DEFAULT_WORKSPACE_FILTER = WORKSPACE_FILTERS.DRAFT
export const WORKSPACE_FILTER_VALUES = Object.freeze(Object.values(WORKSPACE_FILTERS))

const STORAGE_PREFIX = 'storylineos:customer-home:workspace-filter'

export const isWorkspaceFilter = (value) => WORKSPACE_FILTER_VALUES.includes(value)

export const buildWorkspaceFilterPreferenceKey = ({ userId, customerId, tenantId } = {}) => {
  const values = [userId, customerId, tenantId].map((value) => String(value ?? '').trim())
  if (values.some((value) => !value)) return null
  return `${STORAGE_PREFIX}:${values.map((value) => encodeURIComponent(value)).join(':')}`
}

const getStorage = () => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const readWorkspaceFilterPreference = (key) => {
  if (!key) return DEFAULT_WORKSPACE_FILTER
  const storage = getStorage()
  if (!storage) return DEFAULT_WORKSPACE_FILTER

  try {
    const stored = storage.getItem(key)
    return isWorkspaceFilter(stored) ? stored : DEFAULT_WORKSPACE_FILTER
  } catch {
    return DEFAULT_WORKSPACE_FILTER
  }
}

export const writeWorkspaceFilterPreference = (key, value) => {
  if (!key || !isWorkspaceFilter(value)) return
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(key, value)
  } catch {
    // Preference persistence is best effort; the in-memory selection remains authoritative.
  }
}
