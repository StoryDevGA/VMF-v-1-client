export const VALIDATION_REGISTRY_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DEPRECATED: 'DEPRECATED',
})

export const VALIDATION_REGISTRY_CATEGORIES = Object.freeze({
  COMPLETENESS: 'COMPLETENESS',
  SCHEMA: 'SCHEMA',
  CONSISTENCY: 'CONSISTENCY',
  GOVERNANCE: 'GOVERNANCE',
  QUALITY: 'QUALITY',
  DUPLICATION: 'DUPLICATION',
  LIFECYCLE: 'LIFECYCLE',
  CUSTOM: 'CUSTOM',
})

export const VALIDATION_REGISTRY_SEVERITIES = Object.freeze({
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  BLOCKING: 'BLOCKING',
})

export const VALIDATION_REGISTRY_PAGE_SIZE = 20

export const VALIDATION_REGISTRY_HELP_TEXT =
  'Register reusable governed validation checks used by Workflow Policies and Framework Packages.'

export const VALIDATION_REGISTRY_STATUS_OPTIONS = Object.freeze([
  { value: '', label: 'All' },
  ...Object.values(VALIDATION_REGISTRY_STATUSES).map((status) => ({ value: status, label: status })),
])

export const VALIDATION_REGISTRY_CATEGORY_OPTIONS = Object.freeze([
  { value: '', label: 'All' },
  ...Object.values(VALIDATION_REGISTRY_CATEGORIES).map((value) => ({ value, label: value })),
])

export const VALIDATION_REGISTRY_SEVERITY_OPTIONS = Object.freeze([
  { value: '', label: 'All' },
  ...Object.values(VALIDATION_REGISTRY_SEVERITIES).map((value) => ({ value, label: value })),
])

export const getValidationRegistryStatusVariant = (value) => {
  const normalized = String(value || '').trim().toUpperCase()
  if (normalized === VALIDATION_REGISTRY_STATUSES.ACTIVE) return 'success'
  if (normalized === VALIDATION_REGISTRY_STATUSES.INACTIVE) return 'warning'
  if (normalized === VALIDATION_REGISTRY_STATUSES.DEPRECATED) return 'danger'
  return 'neutral'
}

export const formatValidationRegistryStatus = (value) => {
  const normalized = String(value || '').trim().toUpperCase()
  return normalized || '--'
}

export const cloneValidationRegistryEntry = (entry = {}) => ({
  id: String(entry.id ?? '').trim(),
  key: String(entry.key ?? '').trim(),
  label: String(entry.label ?? '').trim(),
  description: String(entry.description ?? '').trim(),
  status: String(entry.status ?? VALIDATION_REGISTRY_STATUSES.ACTIVE).trim().toUpperCase(),
  supportedFrameworkKeys: Array.isArray(entry.supportedFrameworkKeys) ? [...entry.supportedFrameworkKeys] : [],
  category: String(entry.category ?? '').trim().toUpperCase(),
  severity: String(entry.severity ?? '').trim().toUpperCase(),
  producerSkillId: String(entry.producerSkillId ?? '').trim(),
  outputPath: String(entry.outputPath ?? '').trim(),
  passFieldPath: String(entry.passFieldPath ?? '').trim(),
  detailsFieldPath: String(entry.detailsFieldPath ?? '').trim(),
  policyUsable: Boolean(entry.policyUsable),
  packageUsable: Boolean(entry.packageUsable),
  freshnessDefaultMinutes: Number(entry.freshnessDefaultMinutes ?? 30) || 30,
  blockingDefault: Boolean(entry.blockingDefault),
  warningOnlyDefault: Boolean(entry.warningOnlyDefault),
  createdAt: entry.createdAt ?? null,
  updatedAt: entry.updatedAt ?? null,
  createdBy: entry.createdBy ?? null,
  updatedBy: entry.updatedBy ?? null,
})

export const buildValidationRegistryStableId = (key) => {
  const normalized = String(key ?? '').trim().toLowerCase()
  return normalized ? `validation-${normalized}` : ''
}

export const INITIAL_VALIDATION_REGISTRY = Object.freeze([
  cloneValidationRegistryEntry({
    id: 'validation-required-sections-check',
    key: 'required-sections-check',
    label: 'Required Sections Check',
    description: 'Checks whether all required framework sections exist.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.COMPLETENESS,
    severity: VALIDATION_REGISTRY_SEVERITIES.BLOCKING,
    producerSkillId: 'skill-vmf-required-sections-validator',
    outputPath: 'framework_state.validation.required_sections',
    passFieldPath: 'framework_state.validation.required_sections.is_valid',
    detailsFieldPath: 'framework_state.validation.required_sections.missing_sections',
    policyUsable: true,
    packageUsable: true,
    freshnessDefaultMinutes: 30,
    blockingDefault: true,
    warningOnlyDefault: false,
  }),
  cloneValidationRegistryEntry({
    id: 'validation-contract-schema-check',
    key: 'contract-schema-check',
    label: 'Contract Schema Check',
    description: 'Validates the contract schema output meets the required structure.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.SCHEMA,
    severity: VALIDATION_REGISTRY_SEVERITIES.ERROR,
    producerSkillId: 'skill-vmf-contract-schema-validator',
    outputPath: 'framework_state.validation.contract_schema',
    passFieldPath: 'framework_state.validation.contract_schema.is_valid',
    detailsFieldPath: '',
    policyUsable: true,
    packageUsable: true,
    freshnessDefaultMinutes: 30,
    blockingDefault: true,
    warningOnlyDefault: false,
  }),
  cloneValidationRegistryEntry({
    id: 'validation-governance-completeness-check',
    key: 'governance-completeness-check',
    label: 'Governance Completeness Check',
    description: 'Checks governance completeness requirements for the current framework state.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.GOVERNANCE,
    severity: VALIDATION_REGISTRY_SEVERITIES.ERROR,
    producerSkillId: 'skill-vmf-governance-completeness-validator',
    outputPath: 'framework_state.validation.governance_completeness',
    passFieldPath: 'framework_state.validation.governance_completeness.is_valid',
    detailsFieldPath: '',
    policyUsable: true,
    packageUsable: true,
    freshnessDefaultMinutes: 60,
    blockingDefault: true,
    warningOnlyDefault: false,
  }),
])
