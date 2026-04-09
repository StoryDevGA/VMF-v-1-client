export const FRAMEWORK_PACKAGE_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  VALIDATED: 'VALIDATED',
  ACTIVE: 'ACTIVE',
  DEPRECATED: 'DEPRECATED',
})

export const FRAMEWORK_PACKAGE_STATUS_OPTIONS = Object.freeze([
  { value: '', label: 'All lifecycle states' },
  { value: FRAMEWORK_PACKAGE_STATUSES.DRAFT, label: 'Draft' },
  { value: FRAMEWORK_PACKAGE_STATUSES.VALIDATED, label: 'Validated' },
  { value: FRAMEWORK_PACKAGE_STATUSES.ACTIVE, label: 'Active' },
  { value: FRAMEWORK_PACKAGE_STATUSES.DEPRECATED, label: 'Deprecated' },
])

export const FRAMEWORK_OPTIONS = Object.freeze([
  { value: '', label: 'All frameworks' },
  { value: 'RLD', label: 'RLD' },
  { value: 'VMF', label: 'VMF' },
])

export const FRAMEWORK_PACKAGE_FORM_STATUS_OPTIONS = Object.freeze([
  { value: FRAMEWORK_PACKAGE_STATUSES.DRAFT, label: 'Draft' },
  { value: FRAMEWORK_PACKAGE_STATUSES.VALIDATED, label: 'Validated' },
  { value: FRAMEWORK_PACKAGE_STATUSES.DEPRECATED, label: 'Deprecated' },
])

export const FRAMEWORK_PACKAGE_PAGE_SIZE = 4

export const FRAMEWORK_PACKAGES_HELP_TEXT =
  'Validated packages can be activated. The active default package for a framework becomes the authoritative binding for future framework-aware products.'

export const INITIAL_FRAMEWORK_PACKAGE_FORM = Object.freeze({
  frameworkKey: 'VMF',
  frameworkName: 'Value Management Framework',
  version: '',
  description: '',
  status: FRAMEWORK_PACKAGE_STATUSES.DRAFT,
  compatibleWorkflowKeys: '',
  defaultAgentIds: '',
  requiredSkillIds: '',
  requiredSections: '',
  publishChecks: '',
  supportsPreviewMode: true,
  supportsFullReport: true,
  requiresValidationBeforePublish: true,
})

export const INITIAL_FRAMEWORK_PACKAGES = Object.freeze([
  Object.freeze({
    id: 'pkg-vmf-231',
    frameworkKey: 'VMF',
    frameworkName: 'Value Management Framework',
    version: '2.3.1',
    description: 'Current VMF default bundle for publish-ready customer workspaces.',
    status: FRAMEWORK_PACKAGE_STATUSES.ACTIVE,
    isDefault: true,
    compatibleWorkflowKeys: Object.freeze(['vmf-baseline', 'vmf-publish']),
    defaultAgentIds: Object.freeze(['agent-validator']),
    requiredSkillIds: Object.freeze(['skill-snapshot']),
    capabilities: Object.freeze({
      supportsPreviewMode: true,
      supportsFullReport: true,
      requiresValidationBeforePublish: true,
    }),
    validationRules: Object.freeze({
      requiredSections: Object.freeze(['overview', 'value-drivers']),
      publishChecks: Object.freeze(['all-required-sections-complete', 'validation-pass']),
    }),
    updatedAt: '2026-04-08T09:15:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: 'pkg-vmf-230',
    frameworkKey: 'VMF',
    frameworkName: 'Value Management Framework',
    version: '2.3.0',
    description: 'Validated fallback package retained for rollback review.',
    status: FRAMEWORK_PACKAGE_STATUSES.VALIDATED,
    isDefault: false,
    compatibleWorkflowKeys: Object.freeze(['vmf-baseline', 'vmf-publish']),
    defaultAgentIds: Object.freeze(['agent-validator']),
    requiredSkillIds: Object.freeze(['skill-snapshot']),
    capabilities: Object.freeze({
      supportsPreviewMode: true,
      supportsFullReport: true,
      requiresValidationBeforePublish: true,
    }),
    validationRules: Object.freeze({
      requiredSections: Object.freeze(['overview', 'value-drivers']),
      publishChecks: Object.freeze(['validation-pass']),
    }),
    updatedAt: '2026-04-07T16:00:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-1', name: 'Super Admin' }),
  }),
  Object.freeze({
    id: 'pkg-vmf-240',
    frameworkKey: 'VMF',
    frameworkName: 'Value Management Framework',
    version: '2.4.0',
    description: 'Draft next-wave VMF package with expanded publish checks.',
    status: FRAMEWORK_PACKAGE_STATUSES.DRAFT,
    isDefault: false,
    compatibleWorkflowKeys: Object.freeze(['vmf-baseline', 'vmf-publish']),
    defaultAgentIds: Object.freeze(['agent-validator', 'agent-reporter']),
    requiredSkillIds: Object.freeze(['skill-snapshot', 'skill-summary']),
    capabilities: Object.freeze({
      supportsPreviewMode: true,
      supportsFullReport: true,
      requiresValidationBeforePublish: true,
    }),
    validationRules: Object.freeze({
      requiredSections: Object.freeze(['overview', 'value-drivers', 'execution-plan']),
      publishChecks: Object.freeze(['validation-pass', 'snapshot-current']),
    }),
    updatedAt: '2026-04-06T10:20:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
  Object.freeze({
    id: 'pkg-rld-110',
    frameworkKey: 'RLD',
    frameworkName: 'Revenue Lifecycle Design',
    version: '1.1.0',
    description: 'Current active RLD package for internal rollout.',
    status: FRAMEWORK_PACKAGE_STATUSES.ACTIVE,
    isDefault: true,
    compatibleWorkflowKeys: Object.freeze(['rld-baseline']),
    defaultAgentIds: Object.freeze(['agent-validator']),
    requiredSkillIds: Object.freeze(['skill-snapshot']),
    capabilities: Object.freeze({
      supportsPreviewMode: false,
      supportsFullReport: true,
      requiresValidationBeforePublish: true,
    }),
    validationRules: Object.freeze({
      requiredSections: Object.freeze(['overview', 'revenue-map']),
      publishChecks: Object.freeze(['validation-pass']),
    }),
    updatedAt: '2026-04-05T14:45:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'pkg-rld-120',
    frameworkKey: 'RLD',
    frameworkName: 'Revenue Lifecycle Design',
    version: '1.2.0',
    description: 'Validated successor package awaiting activation approval.',
    status: FRAMEWORK_PACKAGE_STATUSES.VALIDATED,
    isDefault: false,
    compatibleWorkflowKeys: Object.freeze(['rld-baseline', 'rld-publish']),
    defaultAgentIds: Object.freeze(['agent-validator', 'agent-summary']),
    requiredSkillIds: Object.freeze(['skill-snapshot']),
    capabilities: Object.freeze({
      supportsPreviewMode: true,
      supportsFullReport: true,
      requiresValidationBeforePublish: true,
    }),
    validationRules: Object.freeze({
      requiredSections: Object.freeze(['overview', 'revenue-map', 'go-to-market']),
      publishChecks: Object.freeze(['validation-pass', 'snapshot-current']),
    }),
    updatedAt: '2026-04-04T11:05:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-3', name: 'Operations Lead' }),
  }),
  Object.freeze({
    id: 'pkg-rld-100',
    frameworkKey: 'RLD',
    frameworkName: 'Revenue Lifecycle Design',
    version: '1.0.0',
    description: 'Deprecated seed package retained for audit and migration planning.',
    status: FRAMEWORK_PACKAGE_STATUSES.DEPRECATED,
    isDefault: false,
    compatibleWorkflowKeys: Object.freeze(['rld-baseline']),
    defaultAgentIds: Object.freeze(['agent-validator']),
    requiredSkillIds: Object.freeze(['skill-snapshot']),
    capabilities: Object.freeze({
      supportsPreviewMode: false,
      supportsFullReport: false,
      requiresValidationBeforePublish: true,
    }),
    validationRules: Object.freeze({
      requiredSections: Object.freeze(['overview']),
      publishChecks: Object.freeze(['validation-pass']),
    }),
    updatedAt: '2026-04-03T08:40:00.000Z',
    updatedBy: Object.freeze({ id: 'sa-2', name: 'Release Admin' }),
  }),
])

const KEY_TOKEN_PATTERN = /^[a-z][a-z0-9-]*$/i
const FRAMEWORK_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/
const DEFAULT_SUPPORTED_FRAMEWORK_KEYS = Object.freeze(['VMF', 'RLD'])

export function cloneFrameworkPackage(pkg) {
  return {
    ...pkg,
    compatibleWorkflowKeys: [...(pkg.compatibleWorkflowKeys ?? [])],
    defaultAgentIds: [...(pkg.defaultAgentIds ?? [])],
    requiredSkillIds: [...(pkg.requiredSkillIds ?? [])],
    capabilities: {
      ...pkg.capabilities,
    },
    validationRules: {
      requiredSections: [...(pkg.validationRules?.requiredSections ?? [])],
      publishChecks: [...(pkg.validationRules?.publishChecks ?? [])],
    },
    updatedBy: {
      ...pkg.updatedBy,
    },
  }
}

export function getFrameworkPackageStatusVariant(status) {
  if (status === FRAMEWORK_PACKAGE_STATUSES.ACTIVE) return 'success'
  if (status === FRAMEWORK_PACKAGE_STATUSES.VALIDATED) return 'info'
  if (status === FRAMEWORK_PACKAGE_STATUSES.DRAFT) return 'warning'
  return 'neutral'
}

export function formatFrameworkPackageStatus(status) {
  return String(status ?? '')
    .toLowerCase()
    .replace(/^\w/, (character) => character.toUpperCase())
}

export function normalizeFrameworkKey(value) {
  return String(value ?? '').trim().toUpperCase()
}

export function normalizeVersion(value) {
  return String(value ?? '').trim()
}

export function normalizeKeyToken(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .toLowerCase()
}

export function parseKeyList(value) {
  return [...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map(normalizeKeyToken)
      .filter(Boolean),
  )]
}

export function formatKeyList(items) {
  return Array.isArray(items) ? items.join('\n') : ''
}

export function mapFrameworkPackageToForm(pkg) {
  return {
    frameworkKey: pkg.frameworkKey ?? '',
    frameworkName: pkg.frameworkName ?? '',
    version: pkg.version ?? '',
    description: pkg.description ?? '',
    status: pkg.status ?? FRAMEWORK_PACKAGE_STATUSES.DRAFT,
    compatibleWorkflowKeys: formatKeyList(pkg.compatibleWorkflowKeys),
    defaultAgentIds: formatKeyList(pkg.defaultAgentIds),
    requiredSkillIds: formatKeyList(pkg.requiredSkillIds),
    requiredSections: formatKeyList(pkg.validationRules?.requiredSections),
    publishChecks: formatKeyList(pkg.validationRules?.publishChecks),
    supportsPreviewMode: Boolean(pkg.capabilities?.supportsPreviewMode),
    supportsFullReport: Boolean(pkg.capabilities?.supportsFullReport),
    requiresValidationBeforePublish: Boolean(pkg.capabilities?.requiresValidationBeforePublish),
  }
}

export function validateFrameworkPackageForm(
  formState,
  existingPackages = [],
  selectedPackageId = '',
  supportedFrameworkKeys = DEFAULT_SUPPORTED_FRAMEWORK_KEYS,
) {
  const errors = {}
  const frameworkKey = normalizeFrameworkKey(formState.frameworkKey)
  const frameworkName = String(formState.frameworkName ?? '').trim()
  const version = normalizeVersion(formState.version)
  const description = String(formState.description ?? '').trim()
  const compatibleWorkflowKeys = parseKeyList(formState.compatibleWorkflowKeys)
  const defaultAgentIds = parseKeyList(formState.defaultAgentIds)
  const requiredSkillIds = parseKeyList(formState.requiredSkillIds)
  const requiredSections = parseKeyList(formState.requiredSections)
  const publishChecks = parseKeyList(formState.publishChecks)
  const status = String(formState.status ?? '').trim() || FRAMEWORK_PACKAGE_STATUSES.DRAFT

  if (!FRAMEWORK_KEY_PATTERN.test(frameworkKey)) {
    errors.frameworkKey = 'Framework key is required and must use uppercase letters, numbers, or underscores.'
  } else if (!new Set(supportedFrameworkKeys).has(frameworkKey)) {
    errors.frameworkKey = 'Selected framework key is not available in the Framework Registry.'
  }

  if (!frameworkName) {
    errors.frameworkName = 'Framework name is required.'
  } else if (frameworkName.length > 120) {
    errors.frameworkName = 'Framework name must be 120 characters or fewer.'
  }

  if (!VERSION_PATTERN.test(version)) {
    errors.version = 'Version must use semantic version format, for example 2.3.1.'
  }

  if (description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.'
  }

  const invalidWorkflowKey = compatibleWorkflowKeys.find((value) => !KEY_TOKEN_PATTERN.test(value))
  if (invalidWorkflowKey) {
    errors.compatibleWorkflowKeys = `Invalid workflow key "${invalidWorkflowKey}". Use letters, numbers, or hyphens.`
  }

  const invalidAgentId = defaultAgentIds.find((value) => !KEY_TOKEN_PATTERN.test(value))
  if (invalidAgentId) {
    errors.defaultAgentIds = `Invalid agent id "${invalidAgentId}". Use letters, numbers, or hyphens.`
  }

  const invalidSkillId = requiredSkillIds.find((value) => !KEY_TOKEN_PATTERN.test(value))
  if (invalidSkillId) {
    errors.requiredSkillIds = `Invalid skill id "${invalidSkillId}". Use letters, numbers, or hyphens.`
  }

  const duplicateVersion = existingPackages.find(
    (pkg) =>
      pkg.id !== selectedPackageId
      && normalizeFrameworkKey(pkg.frameworkKey) === frameworkKey
      && normalizeVersion(pkg.version) === version,
  )
  if (duplicateVersion) {
    errors.version = 'Framework key and version must be unique.'
  }

  return {
    errors,
    payload: {
      frameworkKey,
      frameworkName,
      version,
      description,
      status,
      isDefault: status === FRAMEWORK_PACKAGE_STATUSES.ACTIVE,
      compatibleWorkflowKeys,
      defaultAgentIds,
      requiredSkillIds,
      capabilities: {
        supportsPreviewMode: Boolean(formState.supportsPreviewMode),
        supportsFullReport: Boolean(formState.supportsFullReport),
        requiresValidationBeforePublish: Boolean(formState.requiresValidationBeforePublish),
      },
      validationRules: {
        requiredSections,
        publishChecks,
      },
    },
  }
}
