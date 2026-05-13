import { DEFAULT_TABLE_PAGE_SIZE } from '../../components/Table/tableConstants.js'

export const FRAMEWORK_REGISTRY_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  DRAFT: 'DRAFT',
  DEPRECATED: 'DEPRECATED',
})

export const FRAMEWORK_REGISTRY_STATUS_OPTIONS = Object.freeze([
  { value: '', label: 'All statuses' },
  { value: FRAMEWORK_REGISTRY_STATUSES.ACTIVE, label: 'Active' },
  { value: FRAMEWORK_REGISTRY_STATUSES.DRAFT, label: 'Draft' },
  { value: FRAMEWORK_REGISTRY_STATUSES.DEPRECATED, label: 'Deprecated' },
])

export const FRAMEWORK_REGISTRY_FORM_STATUS_OPTIONS = Object.freeze([
  { value: FRAMEWORK_REGISTRY_STATUSES.ACTIVE, label: 'Active' },
  { value: FRAMEWORK_REGISTRY_STATUSES.DRAFT, label: 'Draft' },
  { value: FRAMEWORK_REGISTRY_STATUSES.DEPRECATED, label: 'Deprecated' },
])

export const FRAMEWORK_REGISTRY_TYPE_OPTIONS = Object.freeze([
  { value: '', label: 'All types' },
  { value: 'structured', label: 'Structured' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'composable', label: 'Composable' },
])

export const FRAMEWORK_REGISTRY_FORM_TYPE_OPTIONS = Object.freeze([
  { value: 'structured', label: 'Structured' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'composable', label: 'Composable' },
])

export const FRAMEWORK_REGISTRY_STRUCTURE_TYPE_OPTIONS = Object.freeze([
  { value: 'section_based', label: 'Section based' },
  { value: 'flow_based', label: 'Flow based' },
  { value: 'template_based', label: 'Template based' },
  { value: 'policy_based', label: 'Policy based' },
])

export const FRAMEWORK_REGISTRY_PAGE_SIZE = DEFAULT_TABLE_PAGE_SIZE

export const FRAMEWORK_REGISTRY_HELP_TEXT =
  'Framework Registry defines the canonical framework identity used by packages, agents, skills, and workflow policies.'

export const INITIAL_FRAMEWORK_REGISTRY_FORM = Object.freeze({
  frameworkKey: 'VMF',
  name: 'Value Messaging Framework',
  type: 'structured',
  structureType: 'section_based',
  supportedWorkflowKeys: 'vmf-baseline\nvmf-publish',
  defaultBehaviorProfile: JSON.stringify(
    {
      mode: 'publish-first',
      approvalRequired: true,
    },
    null,
    2,
  ),
  status: FRAMEWORK_REGISTRY_STATUSES.ACTIVE,
})

export const INITIAL_FRAMEWORK_REGISTRIES = Object.freeze([
  Object.freeze({
    id: 'framework-vmf',
    frameworkKey: 'VMF',
    name: 'Value Messaging Framework',
    type: 'structured',
    structureType: 'section_based',
    supportedWorkflowKeys: Object.freeze(['vmf-baseline', 'vmf-publish']),
    defaultBehaviorProfile: Object.freeze({
      mode: 'publish-first',
      approvalRequired: true,
      previewMode: true,
    }),
    status: FRAMEWORK_REGISTRY_STATUSES.ACTIVE,
    updatedAt: '2026-04-08T09:30:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: 'framework-rld',
    frameworkKey: 'RLD',
    name: 'Revenue Lifecycle Design',
    type: 'structured',
    structureType: 'flow_based',
    supportedWorkflowKeys: Object.freeze(['rld-baseline', 'rld-publish']),
    defaultBehaviorProfile: Object.freeze({
      mode: 'review-led',
      approvalRequired: true,
      previewMode: false,
    }),
    status: FRAMEWORK_REGISTRY_STATUSES.ACTIVE,
    updatedAt: '2026-04-07T14:05:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'framework-qmf',
    frameworkKey: 'QMF',
    name: 'Quality Messaging Framework',
    type: 'hybrid',
    structureType: 'template_based',
    supportedWorkflowKeys: Object.freeze(['qmf-review', 'qmf-release']),
    defaultBehaviorProfile: Object.freeze({
      mode: 'template-led',
      approvalRequired: true,
      previewMode: true,
    }),
    status: FRAMEWORK_REGISTRY_STATUSES.DRAFT,
    updatedAt: '2026-04-06T11:20:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'framework-cmf',
    frameworkKey: 'CMF',
    name: 'Customer Messaging Framework',
    type: 'composable',
    structureType: 'policy_based',
    supportedWorkflowKeys: Object.freeze(['cmf-intake', 'cmf-publish']),
    defaultBehaviorProfile: Object.freeze({
      mode: 'composable',
      approvalRequired: false,
      previewMode: true,
    }),
    status: FRAMEWORK_REGISTRY_STATUSES.DRAFT,
    updatedAt: '2026-04-05T16:10:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: 'framework-ops',
    frameworkKey: 'OPS',
    name: 'Operations Messaging Framework',
    type: 'hybrid',
    structureType: 'section_based',
    supportedWorkflowKeys: Object.freeze(['ops-review']),
    defaultBehaviorProfile: Object.freeze({
      mode: 'operations',
      approvalRequired: true,
      previewMode: false,
    }),
    status: FRAMEWORK_REGISTRY_STATUSES.DEPRECATED,
    updatedAt: '2026-04-04T08:40:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
])

const KEY_TOKEN_PATTERN = /^[a-z][a-z0-9-]*$/i
const FRAMEWORK_KEY_PATTERN = /^[A-Z][A-Z0-9_-]*$/
const DEFAULT_BEHAVIOR_PROFILE_ERROR =
  'Default behavior profile must be valid JSON and evaluate to an object.'

function normalizeKeyToken(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .toLowerCase()
}

function normalizeFrameworkRegistryKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .toUpperCase()
}

function parseFrameworkRegistryKeyList(value) {
  return [...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map(normalizeKeyToken)
      .filter(Boolean),
  )]
}

function formatFrameworkRegistryKeyList(items) {
  return Array.isArray(items) ? items.join('\n') : ''
}

export function cloneFrameworkRegistryEntry(entry) {
  return {
    ...entry,
    supportedWorkflowKeys: [...(entry.supportedWorkflowKeys ?? [])],
    defaultBehaviorProfile: {
      ...(entry.defaultBehaviorProfile ?? {}),
    },
    updatedBy: {
      ...(entry.updatedBy ?? {}),
    },
  }
}

export function getFrameworkRegistryStatusVariant(status) {
  if (status === FRAMEWORK_REGISTRY_STATUSES.ACTIVE) return 'success'
  if (status === FRAMEWORK_REGISTRY_STATUSES.DRAFT) return 'warning'
  return 'neutral'
}

export function formatFrameworkRegistryStatus(status) {
  return String(status ?? '')
    .toLowerCase()
    .replace(/^\w/, (character) => character.toUpperCase())
}

export function getFrameworkRegistryTypeLabel(type) {
  if (type === 'structured') return 'Structured'
  if (type === 'hybrid') return 'Hybrid'
  if (type === 'composable') return 'Composable'
  return 'Unknown'
}

export function getFrameworkRegistryStructureTypeLabel(structureType) {
  if (structureType === 'section_based') return 'Section based'
  if (structureType === 'flow_based') return 'Flow based'
  if (structureType === 'template_based') return 'Template based'
  if (structureType === 'policy_based') return 'Policy based'
  return 'Unknown'
}

export function buildFrameworkRegistryOptions(entries, { includeAll = true } = {}) {
  const options = entries.map((entry) => ({
    value: entry.frameworkKey,
    label: `${entry.frameworkKey} - ${entry.name}`,
  }))

  return includeAll
    ? [{ value: '', label: 'All frameworks' }, ...options]
    : options
}

export function buildFrameworkRegistryNameLookup(entries) {
  return Object.fromEntries(entries.map((entry) => [entry.frameworkKey, entry.name]))
}

export function buildFrameworkRegistryAllowedKeys(entries) {
  return entries.map((entry) => normalizeFrameworkRegistryKey(entry.frameworkKey))
}

export function mapFrameworkRegistryToForm(entry) {
  return {
    frameworkKey: entry.frameworkKey ?? '',
    name: entry.name ?? '',
    type: entry.type ?? 'structured',
    structureType: entry.structureType ?? 'section_based',
    supportedWorkflowKeys: formatFrameworkRegistryKeyList(entry.supportedWorkflowKeys),
    defaultBehaviorProfile: JSON.stringify(entry.defaultBehaviorProfile ?? {}, null, 2),
    status: entry.status ?? FRAMEWORK_REGISTRY_STATUSES.ACTIVE,
  }
}

export function validateFrameworkRegistryForm(formState, existingEntries = [], selectedEntryId = '') {
  const errors = {}
  const frameworkKey = normalizeFrameworkRegistryKey(formState.frameworkKey)
  const name = String(formState.name ?? '').trim()
  const type = String(formState.type ?? '').trim().toLowerCase()
  const structureType = String(formState.structureType ?? '').trim().toLowerCase()
  const supportedWorkflowKeys = parseFrameworkRegistryKeyList(formState.supportedWorkflowKeys)
  const status = String(formState.status ?? '').trim() || FRAMEWORK_REGISTRY_STATUSES.ACTIVE
  const defaultBehaviorProfileText = String(formState.defaultBehaviorProfile ?? '').trim()

  let defaultBehaviorProfile = {}
  if (defaultBehaviorProfileText) {
    try {
      const parsed = JSON.parse(defaultBehaviorProfileText)
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        errors.defaultBehaviorProfile = DEFAULT_BEHAVIOR_PROFILE_ERROR
      } else {
        defaultBehaviorProfile = parsed
      }
    } catch {
      errors.defaultBehaviorProfile = DEFAULT_BEHAVIOR_PROFILE_ERROR
    }
  }

  if (!FRAMEWORK_KEY_PATTERN.test(frameworkKey)) {
    errors.frameworkKey = 'Framework key is required and must use uppercase letters, numbers, hyphens, or underscores.'
  }

  if (!name) {
    errors.name = 'Framework name is required.'
  } else if (name.length > 120) {
    errors.name = 'Framework name must be 120 characters or fewer.'
  }

  if (!['structured', 'hybrid', 'composable'].includes(type)) {
    errors.type = 'Framework type is required.'
  }

  if (!['section_based', 'flow_based', 'template_based', 'policy_based'].includes(structureType)) {
    errors.structureType = 'Structure type is required.'
  }

  const invalidWorkflowKey = supportedWorkflowKeys.find((value) => !KEY_TOKEN_PATTERN.test(value))
  if (invalidWorkflowKey) {
    errors.supportedWorkflowKeys = `Invalid workflow key "${invalidWorkflowKey}". Use letters, numbers, or hyphens.`
  }

  const duplicateKey = existingEntries.find(
    (entry) =>
      entry.id !== selectedEntryId
      && normalizeFrameworkRegistryKey(entry.frameworkKey) === frameworkKey,
  )
  if (duplicateKey) {
    errors.frameworkKey = 'Framework key must be unique.'
  }

  return {
    errors,
    payload: {
      frameworkKey,
      name,
      type,
      structureType,
      supportedWorkflowKeys,
      defaultBehaviorProfile,
      status,
    },
  }
}
