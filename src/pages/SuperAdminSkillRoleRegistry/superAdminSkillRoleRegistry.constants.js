export const SKILL_ROLE_REGISTRY_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DEPRECATED: 'DEPRECATED',
})

export const SKILL_ROLE_REGISTRY_PAGE_SIZE = 20

export const SKILL_ROLE_REGISTRY_HELP_TEXT =
  'Skill Roles define the governed execution responsibilities that can be assigned to Skills across all frameworks.'

export const SKILL_ROLE_REGISTRY_STATUS_OPTIONS = Object.freeze([
  { label: 'All', value: '' },
  ...Object.values(SKILL_ROLE_REGISTRY_STATUSES).map((value) => ({ label: value, value })),
])

export const SKILL_ROLE_REGISTRY_SORT_OPTIONS = Object.freeze([
  { label: 'Recently Updated', value: 'updatedAt:desc' },
  { label: 'Label (A-Z)', value: 'label:asc' },
  { label: 'Label (Z-A)', value: 'label:desc' },
  { label: 'Usage Count (High-Low)', value: 'usageCount:desc' },
  { label: 'Usage Count (Low-High)', value: 'usageCount:asc' },
])

export const formatSkillRoleRegistryStatus = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()

export const getSkillRoleRegistryStatusVariant = (value) => {
  const normalized = formatSkillRoleRegistryStatus(value)

  if (normalized === SKILL_ROLE_REGISTRY_STATUSES.ACTIVE) return 'success'
  if (normalized === SKILL_ROLE_REGISTRY_STATUSES.DEPRECATED) return 'warning'
  return 'neutral'
}

export const cloneSkillRoleRegistryEntry = (entry = {}) => JSON.parse(JSON.stringify(entry))

const normalizeStableKeySegment = (value) =>
  String(value || '')
    .trim()
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

export const buildSkillRoleRegistryStableId = (roleKey) =>
  `role-${normalizeStableKeySegment(roleKey).slice(0, 160)}`

export const INITIAL_SKILL_ROLE_REGISTRY = Object.freeze([
  Object.freeze({
    id: buildSkillRoleRegistryStableId('READER'),
    roleKey: 'READER',
    label: 'Reader',
    description: 'Reads runtime state without mutation.',
    status: SKILL_ROLE_REGISTRY_STATUSES.ACTIVE,
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
