export const VALIDATION_REGISTRY_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
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

export const VALIDATION_REGISTRY_RESULT_TYPES = Object.freeze({
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  OBJECT: 'OBJECT',
  ARRAY: 'ARRAY',
  ENUM: 'ENUM',
  MIXED: 'MIXED',
})

export const VALIDATION_REGISTRY_EXECUTION_MODES = Object.freeze({
  SYNC: 'SYNC',
  ASYNC: 'ASYNC',
  QUEUED: 'QUEUED',
})

export const VALIDATION_REGISTRY_PAGE_SIZE = 20

export const VALIDATION_REGISTRY_FORM_ERROR_FIELDS = Object.freeze([
  'key',
  'label',
  'description',
  'status',
  'supportedFrameworkKeys',
  'category',
  'severity',
  'producerSkillId',
  'defaultAgentIds',
  'outputPath',
  'resultType',
  'passFieldPath',
  'detailsFieldPath',
  'messageFieldPath',
  'parameterSchema',
  'defaultParameters',
  'retryPolicy.maxAttempts',
  'retryPolicy.retryableErrorCodes',
  'retryPolicy.backoffSeconds',
  'freshnessDefaultMinutes',
  'blockingDefault',
  'warningOnlyDefault',
  'executionMode',
  'version',
])

export const VALIDATION_REGISTRY_KEY_PATTERN = /^[a-z][a-z0-9-]*$/

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

export const VALIDATION_REGISTRY_RESULT_TYPE_OPTIONS = Object.freeze([
  { value: '', label: 'Select...' },
  ...Object.values(VALIDATION_REGISTRY_RESULT_TYPES).map((value) => ({ value, label: value })),
])

export const VALIDATION_REGISTRY_EXECUTION_MODE_OPTIONS = Object.freeze(
  Object.values(VALIDATION_REGISTRY_EXECUTION_MODES).map((value) => ({ value, label: value })),
)

export const getValidationRegistryStatusVariant = (value) => {
  const normalized = String(value || '').trim().toUpperCase()
  if (normalized === VALIDATION_REGISTRY_STATUSES.DRAFT) return 'warning'
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
  defaultAgentIds: Array.isArray(entry.defaultAgentIds) ? [...entry.defaultAgentIds] : [],
  outputPath: String(entry.outputPath ?? '').trim(),
  resultType: String(entry.resultType ?? '').trim().toUpperCase(),
  passFieldPath: String(entry.passFieldPath ?? '').trim(),
  detailsFieldPath: String(entry.detailsFieldPath ?? '').trim(),
  messageFieldPath: String(entry.messageFieldPath ?? '').trim(),
  parameterSchema: entry.parameterSchema && typeof entry.parameterSchema === 'object' && !Array.isArray(entry.parameterSchema)
    ? JSON.parse(JSON.stringify(entry.parameterSchema))
    : {},
  defaultParameters: entry.defaultParameters && typeof entry.defaultParameters === 'object' && !Array.isArray(entry.defaultParameters)
    ? JSON.parse(JSON.stringify(entry.defaultParameters))
    : {},
  retryPolicy: {
    maxAttempts: Number(entry.retryPolicy?.maxAttempts ?? 1) || 1,
    retryableErrorCodes: Array.isArray(entry.retryPolicy?.retryableErrorCodes)
      ? [...entry.retryPolicy.retryableErrorCodes]
      : [],
    backoffSeconds: Number(entry.retryPolicy?.backoffSeconds ?? 0) || 0,
  },
  policyUsable: Boolean(entry.policyUsable),
  packageUsable: Boolean(entry.packageUsable),
  requiresLatestRun: Boolean(entry.requiresLatestRun),
  freshnessDefaultMinutes: Number(entry.freshnessDefaultMinutes ?? 30) || 30,
  blockingDefault: Boolean(entry.blockingDefault),
  warningOnlyDefault: Boolean(entry.warningOnlyDefault),
  allowManualRun: entry.allowManualRun === undefined ? true : Boolean(entry.allowManualRun),
  executionMode: String(entry.executionMode ?? VALIDATION_REGISTRY_EXECUTION_MODES.SYNC).trim().toUpperCase(),
  version: Number(entry.version ?? 1) || 1,
  componentVersion: Number(entry.componentVersion ?? entry.version ?? 1) || 1,
  versionStatus: String(entry.versionStatus ?? entry.status ?? '').trim().toUpperCase(),
  lineageId: String(entry.lineageId ?? entry.id ?? '').trim(),
  isLocked: Boolean(entry.isLocked),
  lockedAt: entry.lockedAt ?? null,
  lockedBy: entry.lockedBy ?? null,
  lockedReason: String(entry.lockedReason ?? '').trim(),
  lockedByPackageKeys: Array.isArray(entry.lockedByPackageKeys) ? [...entry.lockedByPackageKeys] : [],
  clonedFromStableId: entry.clonedFromStableId ?? null,
  supersedesStableId: entry.supersedesStableId ?? null,
  supersededByStableId: entry.supersededByStableId ?? null,
  createdAt: entry.createdAt ?? null,
  updatedAt: entry.updatedAt ?? null,
  createdBy: entry.createdBy ?? null,
  updatedBy: entry.updatedBy ?? null,
})

export const buildValidationRegistryStableId = (key) => {
  const normalized = String(key ?? '').trim().toLowerCase()
  return normalized ? `validation-${normalized}` : ''
}

export const normalizeValidationRegistryFrameworkKeys = (values) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value ?? '').trim().toUpperCase())
    .filter(Boolean))]

export const normalizeValidationRegistryStableIdList = (values) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean))]

export const validateValidationRegistryForm = (form = {}, { isEditMode = false } = {}) => {
  const errors = {}

  const key = String(form.key ?? '').trim().toLowerCase()
  if (!isEditMode) {
    if (!key) {
      errors.key = 'Key is required.'
    } else if (!VALIDATION_REGISTRY_KEY_PATTERN.test(key)) {
      errors.key = 'Key must use lowercase letters, numbers, or hyphens.'
    }
  }

  if (!String(form.label ?? '').trim()) {
    errors.label = 'Label is required.'
  }

  if (!String(form.description ?? '').trim()) {
    errors.description = 'Description is required.'
  }

  const frameworks = normalizeValidationRegistryFrameworkKeys(form.supportedFrameworkKeys)
  if (frameworks.length === 0) {
    errors.supportedFrameworkKeys = 'Select at least one supported framework.'
  }

  if (!String(form.category ?? '').trim()) {
    errors.category = 'Category is required.'
  }

  if (!String(form.severity ?? '').trim()) {
    errors.severity = 'Severity is required.'
  }

  if (!String(form.producerSkillId ?? '').trim()) {
    errors.producerSkillId = 'Producer skill is required.'
  }

  if (!String(form.outputPath ?? '').trim()) {
    errors.outputPath = 'Output Path is required.'
  }

  const outputPath = String(form.outputPath ?? '').trim()
  const passFieldPath = String(form.passFieldPath ?? '').trim()
  const detailsFieldPath = String(form.detailsFieldPath ?? '').trim()
  const messageFieldPath = String(form.messageFieldPath ?? '').trim()

  if (outputPath && passFieldPath && !passFieldPath.startsWith(`${outputPath}.`)) {
    errors.passFieldPath = 'Pass Field Path must be inside the selected Output Path.'
  }

  if (outputPath && detailsFieldPath && !detailsFieldPath.startsWith(`${outputPath}.`)) {
    errors.detailsFieldPath = 'Details Field Path must be inside the selected Output Path.'
  }

  if (outputPath && messageFieldPath && !messageFieldPath.startsWith(`${outputPath}.`)) {
    errors.messageFieldPath = 'Message Field Path must be inside the selected Output Path.'
  }

  const parameterSchema = form.parameterSchema
  if (
    parameterSchema !== undefined
    && parameterSchema !== null
    && (typeof parameterSchema !== 'object' || Array.isArray(parameterSchema))
  ) {
    errors.parameterSchema = 'Parameter Schema must be a JSON object.'
  }

  const defaultParameters = form.defaultParameters
  if (
    defaultParameters === null
    || (defaultParameters !== undefined && (typeof defaultParameters !== 'object' || Array.isArray(defaultParameters)))
  ) {
    errors.defaultParameters = 'Default Parameters must be a JSON object.'
  }

  const maxAttempts = Number(form.retryPolicy?.maxAttempts ?? 1)
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    errors['retryPolicy.maxAttempts'] = 'Max Attempts must be a whole number from 1 to 10.'
  }

  const backoffSeconds = Number(form.retryPolicy?.backoffSeconds ?? 0)
  if (!Number.isInteger(backoffSeconds) || backoffSeconds < 0 || backoffSeconds > 3600) {
    errors['retryPolicy.backoffSeconds'] = 'Backoff Seconds must be a whole number from 0 to 3600.'
  }

  const blockingDefault = Boolean(form.blockingDefault)
  const warningOnlyDefault = Boolean(form.warningOnlyDefault)
  if (blockingDefault && warningOnlyDefault) {
    errors.warningOnlyDefault = 'Blocking Default and Warning Only Default cannot both be true.'
  }

  const freshness = Number(form.freshnessDefaultMinutes)
  if (!Number.isInteger(freshness) || freshness < 0) {
    errors.freshnessDefaultMinutes = 'Freshness Default Minutes must be zero or a positive whole number.'
  }

  const version = Number(form.version)
  if (!Number.isInteger(version) || version < 1) {
    errors.version = 'Version must be a positive whole number.'
  }

  return errors
}

export const INITIAL_VALIDATION_REGISTRY = Object.freeze([
  cloneValidationRegistryEntry({
    id: 'validation-required-sections-check',
    key: 'required-sections-check',
    label: 'Required Sections Check',
    description: 'Required Sections Check validation definition for VMF v2.3.1.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.COMPLETENESS,
    severity: VALIDATION_REGISTRY_SEVERITIES.ERROR,
    producerSkillId: 'skill-vmf-required-sections-validator',
    defaultAgentIds: ['agent-vmf-submit-validator-agent'],
    outputPath: 'framework_state.validation.required_sections',
    resultType: 'OBJECT',
    passFieldPath: 'framework_state.validation.required_sections.is_valid',
    detailsFieldPath: 'framework_state.validation.required_sections.missing_sections',
    policyUsable: true,
    packageUsable: true,
    requiresLatestRun: true,
    freshnessDefaultMinutes: 30,
    blockingDefault: true,
    warningOnlyDefault: false,
  }),
  cloneValidationRegistryEntry({
    id: 'validation-submit-readiness-check',
    key: 'submit-readiness-check',
    label: 'Submit Readiness Check',
    description: 'Submit Readiness Check validation definition for VMF v2.3.1.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.GOVERNANCE,
    severity: VALIDATION_REGISTRY_SEVERITIES.ERROR,
    producerSkillId: 'skill-vmf-submit-readiness-validator',
    defaultAgentIds: ['agent-vmf-submit-validator-agent'],
    outputPath: 'framework_state.validation.submit_readiness',
    resultType: 'OBJECT',
    passFieldPath: 'framework_state.validation.submit_readiness.is_valid',
    detailsFieldPath: 'framework_state.validation.submit_readiness.message',
    policyUsable: true,
    packageUsable: true,
    requiresLatestRun: true,
    freshnessDefaultMinutes: 30,
    blockingDefault: true,
    warningOnlyDefault: false,
  }),
  cloneValidationRegistryEntry({
    id: 'validation-publish-readiness-check',
    key: 'publish-readiness-check',
    label: 'Publish Readiness Check',
    description: 'Publish Readiness Check validation definition for VMF v2.3.1.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.GOVERNANCE,
    severity: VALIDATION_REGISTRY_SEVERITIES.ERROR,
    producerSkillId: 'skill-vmf-publish-readiness-validator',
    defaultAgentIds: ['agent-vmf-publish-validator-agent'],
    outputPath: 'framework_state.validation.publish_readiness',
    resultType: 'OBJECT',
    passFieldPath: 'framework_state.validation.publish_readiness.is_valid',
    detailsFieldPath: 'framework_state.validation.publish_readiness.message',
    policyUsable: true,
    packageUsable: true,
    requiresLatestRun: true,
    freshnessDefaultMinutes: 30,
    blockingDefault: true,
    warningOnlyDefault: false,
  }),
  cloneValidationRegistryEntry({
    id: 'validation-proof-points-check',
    key: 'proof-points-check',
    label: 'Proof Points Check',
    description: 'Proof Points Check validation definition for VMF v2.3.1.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.QUALITY,
    severity: VALIDATION_REGISTRY_SEVERITIES.ERROR,
    producerSkillId: 'skill-vmf-proof-points-validator',
    defaultAgentIds: ['agent-vmf-quality-validator-agent'],
    outputPath: 'framework_state.validation.proof_points',
    resultType: 'OBJECT',
    passFieldPath: 'framework_state.validation.proof_points.is_valid',
    detailsFieldPath: 'framework_state.validation.proof_points.message',
    policyUsable: true,
    packageUsable: true,
    requiresLatestRun: true,
    freshnessDefaultMinutes: 60,
    blockingDefault: true,
    warningOnlyDefault: false,
  }),
  cloneValidationRegistryEntry({
    id: 'validation-metrics-quality-check',
    key: 'metrics-quality-check',
    label: 'Metrics Quality Check',
    description: 'Metrics Quality Check validation definition for VMF v2.3.1.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.QUALITY,
    severity: VALIDATION_REGISTRY_SEVERITIES.ERROR,
    producerSkillId: 'skill-vmf-value-metrics-validator',
    defaultAgentIds: ['agent-vmf-quality-validator-agent'],
    outputPath: 'framework_state.validation.metrics_quality',
    resultType: 'OBJECT',
    passFieldPath: 'framework_state.validation.metrics_quality.is_valid',
    detailsFieldPath: 'framework_state.validation.metrics_quality.message',
    policyUsable: true,
    packageUsable: true,
    requiresLatestRun: true,
    freshnessDefaultMinutes: 60,
    blockingDefault: true,
    warningOnlyDefault: false,
  }),
  cloneValidationRegistryEntry({
    id: 'validation-tone-consistency-check',
    key: 'tone-consistency-check',
    label: 'Tone Consistency Check',
    description: 'Tone Consistency Check validation definition for VMF v2.3.1.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.QUALITY,
    severity: VALIDATION_REGISTRY_SEVERITIES.WARNING,
    producerSkillId: 'skill-vmf-tone-consistency-validator',
    defaultAgentIds: ['agent-vmf-quality-validator-agent'],
    outputPath: 'framework_state.validation.tone_consistency',
    resultType: 'OBJECT',
    passFieldPath: 'framework_state.validation.tone_consistency.is_valid',
    detailsFieldPath: 'framework_state.validation.tone_consistency.message',
    policyUsable: true,
    packageUsable: true,
    requiresLatestRun: false,
    freshnessDefaultMinutes: 1440,
    blockingDefault: false,
    warningOnlyDefault: true,
  }),
  cloneValidationRegistryEntry({
    id: 'validation-duplicate-content-check',
    key: 'duplicate-content-check',
    label: 'Duplicate Content Check',
    description: 'Duplicate Content Check validation definition for VMF v2.3.1.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.CONSISTENCY,
    severity: VALIDATION_REGISTRY_SEVERITIES.WARNING,
    producerSkillId: 'skill-vmf-duplicate-content-validator',
    defaultAgentIds: ['agent-vmf-quality-validator-agent'],
    outputPath: 'framework_state.validation.duplicate_content',
    resultType: 'OBJECT',
    passFieldPath: 'framework_state.validation.duplicate_content.is_valid',
    detailsFieldPath: 'framework_state.validation.duplicate_content.message',
    policyUsable: true,
    packageUsable: true,
    requiresLatestRun: true,
    freshnessDefaultMinutes: 120,
    blockingDefault: false,
    warningOnlyDefault: true,
  }),
  cloneValidationRegistryEntry({
    id: 'validation-compliance-language-check',
    key: 'compliance-language-check',
    label: 'Compliance Language Check',
    description: 'Compliance Language Check validation definition for VMF v2.3.1.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.GOVERNANCE,
    severity: VALIDATION_REGISTRY_SEVERITIES.ERROR,
    producerSkillId: 'skill-vmf-compliance-language-validator',
    defaultAgentIds: ['agent-vmf-governance-validator-agent'],
    outputPath: 'framework_state.validation.compliance_language',
    resultType: 'OBJECT',
    passFieldPath: 'framework_state.validation.compliance_language.is_valid',
    detailsFieldPath: 'framework_state.validation.compliance_language.message',
    policyUsable: true,
    packageUsable: true,
    requiresLatestRun: true,
    freshnessDefaultMinutes: 120,
    blockingDefault: true,
    warningOnlyDefault: false,
  }),
  cloneValidationRegistryEntry({
    id: 'validation-competitive-claim-risk-check',
    key: 'competitive-claim-risk-check',
    label: 'Competitive Claim Risk Check',
    description: 'Competitive Claim Risk Check validation definition for VMF v2.3.1.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.GOVERNANCE,
    severity: VALIDATION_REGISTRY_SEVERITIES.WARNING,
    producerSkillId: 'skill-vmf-competitive-claim-risk-validator',
    defaultAgentIds: ['agent-vmf-governance-validator-agent'],
    outputPath: 'framework_state.validation.competitive_claim_risk',
    resultType: 'OBJECT',
    passFieldPath: 'framework_state.validation.competitive_claim_risk.is_valid',
    detailsFieldPath: 'framework_state.validation.competitive_claim_risk.message',
    policyUsable: true,
    packageUsable: true,
    requiresLatestRun: false,
    freshnessDefaultMinutes: 1440,
    blockingDefault: false,
    warningOnlyDefault: true,
  }),
  cloneValidationRegistryEntry({
    id: 'validation-approval-readiness-check',
    key: 'approval-readiness-check',
    label: 'Approval Readiness Check',
    description: 'Approval Readiness Check validation definition for VMF v2.3.1.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.GOVERNANCE,
    severity: VALIDATION_REGISTRY_SEVERITIES.ERROR,
    producerSkillId: 'skill-vmf-governance-completeness-validator',
    defaultAgentIds: ['agent-vmf-governance-validator-agent'],
    outputPath: 'framework_state.validation.governance_completeness',
    resultType: 'OBJECT',
    passFieldPath: 'framework_state.validation.governance_completeness.is_valid',
    detailsFieldPath: 'framework_state.validation.governance_completeness.message',
    policyUsable: true,
    packageUsable: true,
    requiresLatestRun: true,
    freshnessDefaultMinutes: 60,
    blockingDefault: true,
    warningOnlyDefault: false,
  }),
  cloneValidationRegistryEntry({
    id: 'validation-owner-assigned-check',
    key: 'owner-assigned-check',
    label: 'Owner Assigned Check',
    description: 'Owner Assigned Check validation definition for VMF v2.3.1.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.GOVERNANCE,
    severity: VALIDATION_REGISTRY_SEVERITIES.ERROR,
    producerSkillId: 'skill-vmf-owner-assigned-validator',
    defaultAgentIds: ['agent-vmf-governance-validator-agent'],
    outputPath: 'framework_state.validation.owner_assigned',
    resultType: 'OBJECT',
    passFieldPath: 'framework_state.validation.owner_assigned.is_valid',
    detailsFieldPath: 'framework_state.validation.owner_assigned.message',
    policyUsable: true,
    packageUsable: true,
    requiresLatestRun: false,
    freshnessDefaultMinutes: 1440,
    blockingDefault: true,
    warningOnlyDefault: false,
  }),
  cloneValidationRegistryEntry({
    id: 'validation-package-integrity-check',
    key: 'package-integrity-check',
    label: 'Package Integrity Check',
    description: 'Package Integrity Check validation definition for VMF v2.3.1.',
    status: VALIDATION_REGISTRY_STATUSES.ACTIVE,
    supportedFrameworkKeys: ['VMF'],
    category: VALIDATION_REGISTRY_CATEGORIES.GOVERNANCE,
    severity: VALIDATION_REGISTRY_SEVERITIES.ERROR,
    producerSkillId: 'skill-vmf-package-integrity-validator',
    defaultAgentIds: ['agent-vmf-governance-validator-agent'],
    outputPath: 'framework_state.validation.package_integrity',
    resultType: 'OBJECT',
    passFieldPath: 'framework_state.validation.package_integrity.is_valid',
    detailsFieldPath: 'framework_state.validation.package_integrity.message',
    policyUsable: true,
    packageUsable: true,
    requiresLatestRun: false,
    freshnessDefaultMinutes: 1440,
    blockingDefault: true,
    warningOnlyDefault: false,
  }),
])
