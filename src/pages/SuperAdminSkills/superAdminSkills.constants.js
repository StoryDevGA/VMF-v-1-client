export const RUNTIME_SKILL_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
})

export const RUNTIME_SKILL_STATUS_OPTIONS = Object.freeze([
  { value: '', label: 'All statuses' },
  { value: RUNTIME_SKILL_STATUSES.ACTIVE, label: 'Active' },
  { value: RUNTIME_SKILL_STATUSES.INACTIVE, label: 'Inactive' },
])

export const RUNTIME_SKILL_FORM_STATUS_OPTIONS = Object.freeze([
  { value: RUNTIME_SKILL_STATUSES.ACTIVE, label: 'Active' },
  { value: RUNTIME_SKILL_STATUSES.INACTIVE, label: 'Inactive' },
])

export const RUNTIME_SKILL_FRAMEWORK_OPTIONS = Object.freeze([
  { value: '', label: 'All frameworks' },
  { value: 'RLD', label: 'RLD' },
  { value: 'VMF', label: 'VMF' },
])

export const RUNTIME_SKILL_PAGE_SIZE = 4

export const RUNTIME_SKILLS_HELP_TEXT =
  'Active skills remain selectable by framework packages and workflow policies. Set a skill inactive only after confirming live runtime bundles still have a compatible replacement.'

export const INITIAL_RUNTIME_SKILL_FORM = Object.freeze({
  key: '',
  name: '',
  description: '',
  status: RUNTIME_SKILL_STATUSES.ACTIVE,
  supportedFrameworkKeys: 'VMF\nRLD',
})

export const INITIAL_RUNTIME_SKILLS = Object.freeze([
  Object.freeze({
    id: 'skill-snapshot',
    key: 'snapshot',
    name: 'Snapshot',
    description: 'Captures runtime state at workflow checkpoints for later validation and audit.',
    status: RUNTIME_SKILL_STATUSES.ACTIVE,
    supportedFrameworkKeys: Object.freeze(['VMF', 'RLD']),
    updatedAt: '2026-04-08T12:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: 'skill-summary',
    key: 'summary',
    name: 'Summary',
    description: 'Generates concise runtime summaries for review and handoff surfaces.',
    status: RUNTIME_SKILL_STATUSES.ACTIVE,
    supportedFrameworkKeys: Object.freeze(['VMF', 'RLD']),
    updatedAt: '2026-04-07T15:35:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'skill-review',
    key: 'review',
    name: 'Review',
    description: 'Supports governance review checkpoints before activation and publish actions.',
    status: RUNTIME_SKILL_STATUSES.ACTIVE,
    supportedFrameworkKeys: Object.freeze(['VMF']),
    updatedAt: '2026-04-07T11:10:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'skill-revenue-map',
    key: 'revenue-map',
    name: 'Revenue Map',
    description: 'Builds revenue lifecycle mapping outputs for RLD workflows and evidence packs.',
    status: RUNTIME_SKILL_STATUSES.ACTIVE,
    supportedFrameworkKeys: Object.freeze(['RLD']),
    updatedAt: '2026-04-06T14:20:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'skill-report',
    key: 'report',
    name: 'Report',
    description: 'Produces report-ready narrative sections when a package enables published output.',
    status: RUNTIME_SKILL_STATUSES.INACTIVE,
    supportedFrameworkKeys: Object.freeze(['VMF', 'RLD']),
    updatedAt: '2026-04-05T10:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'skill-go-to-market',
    key: 'go-to-market',
    name: 'Go To Market',
    description: 'Supports RLD go-to-market planning outputs during staged rollout validation.',
    status: RUNTIME_SKILL_STATUSES.INACTIVE,
    supportedFrameworkKeys: Object.freeze(['RLD']),
    updatedAt: '2026-04-04T09:35:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
])

const KEY_TOKEN_PATTERN = /^[a-z][a-z0-9-]*$/i
const SUPPORTED_FRAMEWORK_KEYS = new Set(['VMF', 'RLD'])

export function cloneRuntimeSkill(skill) {
  return {
    ...skill,
    supportedFrameworkKeys: [...(skill.supportedFrameworkKeys ?? [])],
    updatedBy: {
      ...skill.updatedBy,
    },
  }
}

export function getRuntimeSkillStatusVariant(status) {
  if (status === RUNTIME_SKILL_STATUSES.ACTIVE) return 'success'
  return 'neutral'
}

export function formatRuntimeSkillStatus(status) {
  return String(status ?? '')
    .toLowerCase()
    .replace(/^\w/, (character) => character.toUpperCase())
}

export function normalizeSkillKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .toLowerCase()
}

export function normalizeFrameworkKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .toUpperCase()
}

export function parseFrameworkKeyList(value) {
  return [...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map(normalizeFrameworkKey)
      .filter(Boolean),
  )]
}

export function formatKeyList(items) {
  return Array.isArray(items) ? items.join('\n') : ''
}

export function mapRuntimeSkillToForm(skill) {
  return {
    key: skill.key ?? '',
    name: skill.name ?? '',
    description: skill.description ?? '',
    status: skill.status ?? RUNTIME_SKILL_STATUSES.ACTIVE,
    supportedFrameworkKeys: formatKeyList(skill.supportedFrameworkKeys),
  }
}

export function validateRuntimeSkillForm(formState, existingSkills = [], selectedSkillId = '') {
  const errors = {}
  const key = normalizeSkillKey(formState.key)
  const name = String(formState.name ?? '').trim()
  const description = String(formState.description ?? '').trim()
  const status = String(formState.status ?? '').trim() || RUNTIME_SKILL_STATUSES.ACTIVE
  const supportedFrameworkKeys = parseFrameworkKeyList(formState.supportedFrameworkKeys)

  if (!KEY_TOKEN_PATTERN.test(key)) {
    errors.key = 'Skill key is required and must use letters, numbers, or hyphens.'
  }

  if (!name) {
    errors.name = 'Skill name is required.'
  } else if (name.length > 120) {
    errors.name = 'Skill name must be 120 characters or fewer.'
  }

  if (description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.'
  }

  if (supportedFrameworkKeys.length === 0) {
    errors.supportedFrameworkKeys = 'At least one supported framework key is required.'
  }

  const invalidFrameworkKey = supportedFrameworkKeys.find(
    (value) => !SUPPORTED_FRAMEWORK_KEYS.has(value),
  )
  if (invalidFrameworkKey) {
    errors.supportedFrameworkKeys = `Unsupported framework key "${invalidFrameworkKey}".`
  }

  const duplicateKey = existingSkills.find(
    (skill) => skill.id !== selectedSkillId && normalizeSkillKey(skill.key) === key,
  )
  if (duplicateKey) {
    errors.key = 'Skill key must be unique.'
  }

  return {
    errors,
    payload: {
      key,
      name,
      description,
      status,
      supportedFrameworkKeys,
    },
  }
}
