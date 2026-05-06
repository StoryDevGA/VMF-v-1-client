export const SKILL_ROLE_REGISTRY_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DEPRECATED: 'DEPRECATED',
})

export const SKILL_ROLE_REGISTRY_CATEGORIES = Object.freeze({
  EXECUTION_ROLE: 'EXECUTION_ROLE',
  GOVERNANCE_ROLE: 'GOVERNANCE_ROLE',
  SYSTEM_ROLE: 'SYSTEM_ROLE',
  CUSTOM_ROLE: 'CUSTOM_ROLE',
})

export const SKILL_ROLE_REGISTRY_OPERATIONS = Object.freeze({
  READ: 'READ',
  WRITE: 'WRITE',
  EXECUTE: 'EXECUTE',
})

export const SKILL_ROLE_REGISTRY_PAGE_SIZE = 20

export const SKILL_ROLE_REGISTRY_HELP_TEXT =
  'Skill Roles define the governed execution responsibilities that can be assigned to Skills across all frameworks.'

export const SKILL_ROLE_REGISTRY_STATUS_OPTIONS = Object.freeze([
  { label: 'All', value: '' },
  ...Object.values(SKILL_ROLE_REGISTRY_STATUSES).map((value) => ({ label: value, value })),
])

export const SKILL_ROLE_REGISTRY_FORM_ERROR_FIELDS = Object.freeze([
  'roleKey',
  'label',
  'description',
  'status',
  'category',
  'allowedOperations',
  'allowedReadScopes',
  'allowedWriteScopes',
])

export const SKILL_ROLE_REGISTRY_ROLE_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/

export const SKILL_ROLE_REGISTRY_SORT_OPTIONS = Object.freeze([
  { label: 'Updated (Newest first)', value: 'updatedAt:desc' },
  { label: 'Label (A-Z)', value: 'label:asc' },
  { label: 'Label (Z-A)', value: 'label:desc' },
  { label: 'Skills Using (High-Low)', value: 'usageCount:desc' },
  { label: 'Skills Using (Low-High)', value: 'usageCount:asc' },
])

export const formatSkillRoleRegistryStatus = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()

export const getSkillRoleRegistryStatusVariant = (value) => {
  const normalized = formatSkillRoleRegistryStatus(value)

  if (normalized === SKILL_ROLE_REGISTRY_STATUSES.ACTIVE) return 'success'
  if (normalized === SKILL_ROLE_REGISTRY_STATUSES.DRAFT) return 'warning'
  if (normalized === SKILL_ROLE_REGISTRY_STATUSES.DEPRECATED) return 'warning'
  return 'neutral'
}

export const cloneSkillRoleRegistryEntry = (entry = {}) => {
  const stableId = entry.stableId || entry.id || buildSkillRoleRegistryStableId(entry.roleKey)
  return JSON.parse(JSON.stringify({
    componentVersion: 1,
    versionStatus: 'DRAFT',
    lineageId: stableId,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    lockedReason: '',
    lockedByPackageKeys: [],
    introducedInVersion: null,
    deprecatedInVersion: null,
    compatibilityTags: [],
    compatibilityMode: 'OPEN',
    clonedFromStableId: null,
    supersedesStableId: null,
    supersededByStableId: null,
    category: SKILL_ROLE_REGISTRY_CATEGORIES.EXECUTION_ROLE,
    allowedOperations: [SKILL_ROLE_REGISTRY_OPERATIONS.READ],
    allowedReadScopes: [],
    allowedWriteScopes: [],
    ...entry,
    stableId,
    id: stableId,
  }))
}

const normalizeStableKeySegment = (value) =>
  String(value || '')
    .trim()
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

export const buildSkillRoleRegistryStableId = (roleKey) =>
  `role-${normalizeStableKeySegment(roleKey).slice(0, 160)}`

export const validateSkillRoleRegistryForm = (form = {}) => {
  const errors = {}

  const roleKey = String(form.roleKey ?? '').trim()
  if (!roleKey) {
    errors.roleKey = 'Role key is required.'
  } else if (!SKILL_ROLE_REGISTRY_ROLE_KEY_PATTERN.test(roleKey.toUpperCase())) {
    errors.roleKey = 'Role key must use uppercase letters, numbers, or underscores.'
  }

  if (!String(form.label ?? '').trim()) {
    errors.label = 'Label is required.'
  }

  if (!String(form.description ?? '').trim()) {
    errors.description = 'Description is required.'
  }

  if (!String(form.status ?? '').trim()) {
    errors.status = 'Status is required.'
  }

  if (!String(form.category ?? '').trim()) {
    errors.category = 'Category is required.'
  }

  const operations = Array.isArray(form.allowedOperations) ? form.allowedOperations : []
  if (operations.length === 0) {
    errors.allowedOperations = 'At least one operation is required.'
  }

  const writeScopes = Array.isArray(form.allowedWriteScopes) ? form.allowedWriteScopes : []
  if (operations.includes(SKILL_ROLE_REGISTRY_OPERATIONS.WRITE) && writeScopes.length === 0) {
    errors.allowedWriteScopes = 'Write roles must define at least one write scope.'
  }

  return errors
}

export const INITIAL_SKILL_ROLE_REGISTRY = Object.freeze([
  Object.freeze({
    id: buildSkillRoleRegistryStableId('READER'),
    roleKey: 'READER',
    label: 'Reader',
    description: 'Reads runtime state without mutation.',
    status: SKILL_ROLE_REGISTRY_STATUSES.ACTIVE,
    versionStatus: 'ACTIVE',
    allowedOperations: [SKILL_ROLE_REGISTRY_OPERATIONS.READ],
    allowedReadScopes: ['*'],
    isSystem: true,
    updatedAt: '2026-04-18T00:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: buildSkillRoleRegistryStableId('WRITER'),
    roleKey: 'WRITER',
    label: 'Writer',
    description: 'Writes or updates runtime state.',
    status: SKILL_ROLE_REGISTRY_STATUSES.ACTIVE,
    versionStatus: 'ACTIVE',
    allowedOperations: [SKILL_ROLE_REGISTRY_OPERATIONS.READ, SKILL_ROLE_REGISTRY_OPERATIONS.WRITE],
    allowedReadScopes: ['*'],
    allowedWriteScopes: ['*'],
    isSystem: true,
    updatedAt: '2026-04-18T00:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: buildSkillRoleRegistryStableId('VALIDATOR'),
    roleKey: 'VALIDATOR',
    label: 'Validator',
    description: 'Evaluates correctness or completeness of state.',
    status: SKILL_ROLE_REGISTRY_STATUSES.ACTIVE,
    versionStatus: 'ACTIVE',
    allowedOperations: [SKILL_ROLE_REGISTRY_OPERATIONS.READ, SKILL_ROLE_REGISTRY_OPERATIONS.WRITE],
    allowedReadScopes: ['*'],
    allowedWriteScopes: ['*'],
    isSystem: true,
    updatedAt: '2026-04-18T00:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: buildSkillRoleRegistryStableId('TRANSFORMER'),
    roleKey: 'TRANSFORMER',
    label: 'Transformer',
    description: 'Transforms or reshapes data.',
    status: SKILL_ROLE_REGISTRY_STATUSES.ACTIVE,
    isSystem: true,
    updatedAt: '2026-04-18T00:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: buildSkillRoleRegistryStableId('ANALYZER'),
    roleKey: 'ANALYZER',
    label: 'Analyzer',
    description: 'Performs reasoning or evaluation.',
    status: SKILL_ROLE_REGISTRY_STATUSES.ACTIVE,
    isSystem: true,
    updatedAt: '2026-04-18T00:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: buildSkillRoleRegistryStableId('RESOLVER'),
    roleKey: 'RESOLVER',
    label: 'Resolver',
    description: 'Determines decisions or next actions.',
    status: SKILL_ROLE_REGISTRY_STATUSES.ACTIVE,
    isSystem: true,
    updatedAt: '2026-04-18T00:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: buildSkillRoleRegistryStableId('RENDERER'),
    roleKey: 'RENDERER',
    label: 'Renderer',
    description: 'Produces user-facing outputs.',
    status: SKILL_ROLE_REGISTRY_STATUSES.ACTIVE,
    isSystem: true,
    updatedAt: '2026-04-18T00:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
])
