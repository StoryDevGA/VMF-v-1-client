export const UI_CONTRACT_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DEPRECATED: 'DEPRECATED',
  ARCHIVED: 'ARCHIVED',
})

export const UI_CONTRACT_COMPATIBILITY_MODES = Object.freeze({
  STRICT: 'STRICT',
  INHERITED_MINOR: 'INHERITED_MINOR',
  OPEN: 'OPEN',
})

export const UI_CONTRACT_SECTION_SOURCES = Object.freeze({
  PACKAGE: 'PACKAGE',
  CUSTOM: 'CUSTOM',
})

export const UI_CONTRACT_SECTION_MAPPING_STATUSES = Object.freeze({
  MAPPED: 'MAPPED',
  MISSING: 'MISSING',
  ORPHANED: 'ORPHANED',
  CUSTOM: 'CUSTOM',
})

export const UI_CONTRACT_PAGE_SIZE = 20

export const UI_CONTRACT_STATUS_OPTIONS = Object.freeze([
  { value: '', label: 'All' },
  ...Object.values(UI_CONTRACT_STATUSES).map((value) => ({ value, label: value })),
])

export const UI_CONTRACT_FORM_STATUS_OPTIONS = Object.freeze(
  Object.values(UI_CONTRACT_STATUSES).map((value) => ({ value, label: value })),
)

export const UI_CONTRACT_COMPATIBILITY_MODE_OPTIONS = Object.freeze(
  Object.values(UI_CONTRACT_COMPATIBILITY_MODES).map((value) => ({ value, label: value })),
)

export const UI_CONTRACT_FORM_ERROR_FIELDS = Object.freeze([
  'uiContractKey',
  'name',
  'description',
  'status',
  'frameworkKeys',
  'introducedInVersion',
  'deprecatedInVersion',
  'compatibilityTags',
  'compatibilityMode',
  'sourcePackageKey',
  'sourcePackageVersion',
  'sourceFrameworkKey',
  'sections',
  'lifecycleStages',
  'actions',
])

const KEY_PATTERN = /^[a-z][a-z0-9-]*$/
const FRAMEWORK_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/

export const INITIAL_UI_CONTRACT_FORM = Object.freeze({
  uiContractKey: '',
  name: '',
  description: '',
  status: UI_CONTRACT_STATUSES.DRAFT,
  frameworkKeys: 'VMF',
  introducedInVersion: '',
  deprecatedInVersion: '',
  compatibilityTags: 'VMF\n2.3.1',
  compatibilityMode: UI_CONTRACT_COMPATIBILITY_MODES.INHERITED_MINOR,
  sourcePackageKey: '',
  sourcePackageVersion: '',
  sourceFrameworkKey: '',
  sections: Object.freeze([]),
  lifecycleStages: Object.freeze([]),
  actions: Object.freeze([]),
  isSystem: false,
  isProtected: false,
  isLocked: false,
  componentVersion: 1,
  versionStatus: 'DRAFT',
  lineageId: '',
  lockedAt: null,
  lockedBy: null,
  lockedReason: '',
  lockedByPackageKeys: Object.freeze([]),
  clonedFromStableId: null,
  supersedesStableId: null,
  supersededByStableId: null,
})

export const parseUIContractList = (value, { upper = false } = {}) => [
  ...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .map((item) => (upper ? item.toUpperCase() : item))
      .filter(Boolean),
  ),
]

const formatList = (items) => Array.isArray(items) ? items.join('\n') : ''

export const formatJsonArray = (items) => JSON.stringify(Array.isArray(items) ? items : [], null, 2)

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const isCustomSectionPresentation = (section = {}) =>
  section?.isCustom === true
  || String(section.source ?? '').trim().toUpperCase() === UI_CONTRACT_SECTION_SOURCES.CUSTOM

export const normalizeSectionPresentationRows = (sections = []) =>
  (Array.isArray(sections) ? sections : []).map((section) => {
    const isCustom = isCustomSectionPresentation(section)
    return {
      sectionKey: String(section.sectionKey ?? '').trim(),
      runtimePath: String(section.runtimePath ?? '').trim(),
      sourcePackageKey: String(section.sourcePackageKey ?? '').trim().toLowerCase(),
      source: isCustom ? UI_CONTRACT_SECTION_SOURCES.CUSTOM : UI_CONTRACT_SECTION_SOURCES.PACKAGE,
      isCustom,
      label: String(section.label ?? '').trim(),
      shortLabel: String(section.shortLabel ?? '').trim(),
      helpText: String(section.helpText ?? '').trim(),
      placeholder: String(section.placeholder ?? '').trim(),
      displayOrder: normalizeNumber(section.displayOrder, 0),
      isVisible: section.isVisible !== false,
      isEditable: section.isEditable !== false,
      isRequiredDisplay: Boolean(section.isRequiredDisplay),
      isReadOnlyDisplay: Boolean(section.isReadOnlyDisplay),
      isCollapsedByDefault: Boolean(section.isCollapsedByDefault),
      sectionGroup: String(section.sectionGroup ?? '').trim(),
      iconKey: String(section.iconKey ?? '').trim(),
      presentationKey: String(section.presentationKey ?? '').trim(),
    }
  })

export const normalizeLifecycleStageRows = (lifecycleStages = []) =>
  (Array.isArray(lifecycleStages) ? lifecycleStages : []).map((stage) => ({
    stageKey: String(stage.stageKey ?? '').trim().toUpperCase(),
    label: String(stage.label ?? '').trim(),
    description: String(stage.description ?? '').trim(),
    badgeLabel: String(stage.badgeLabel ?? '').trim(),
    displayOrder: normalizeNumber(stage.displayOrder, 0),
    isVisible: stage.isVisible !== false,
    badgePresentationKey: String(stage.badgePresentationKey ?? '').trim(),
  }))

export const normalizeActionRows = (actions = []) =>
  (Array.isArray(actions) ? actions : []).map((action) => {
    const actionKey = String(action.actionKey ?? '').trim().toUpperCase()
    const governedAction = String(action.governedAction ?? actionKey).trim().toUpperCase()
    return {
      actionKey,
      governedAction,
      buttonLabel: String(action.buttonLabel ?? '').trim(),
      confirmationTitle: String(action.confirmationTitle ?? '').trim(),
      confirmationMessage: String(action.confirmationMessage ?? '').trim(),
      successMessage: String(action.successMessage ?? '').trim(),
      failureMessage: String(action.failureMessage ?? '').trim(),
      loadingMessage: String(action.loadingMessage ?? '').trim(),
      displayOrder: normalizeNumber(action.displayOrder, 0),
      isVisible: action.isVisible !== false,
      requiresConfirmation: Boolean(action.requiresConfirmation),
      presentationKey: String(action.presentationKey ?? '').trim(),
    }
  })

export const buildSectionLabelFromKey = (sectionKey = '') =>
  String(sectionKey || '')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())

export const buildDefaultSectionPresentation = ({
  sectionKey = '',
  runtimePath = '',
  sourcePackageKey = '',
  required = false,
  displayOrder = 10,
} = {}) => {
  const label = buildSectionLabelFromKey(sectionKey)
  return {
    sectionKey,
    runtimePath,
    sourcePackageKey,
    source: UI_CONTRACT_SECTION_SOURCES.PACKAGE,
    isCustom: false,
    label,
    shortLabel: label,
    helpText: '',
    placeholder: label ? `Enter ${label.toLowerCase()}...` : '',
    displayOrder,
    isVisible: true,
    isEditable: true,
    isRequiredDisplay: Boolean(required),
    isReadOnlyDisplay: false,
    isCollapsedByDefault: false,
    sectionGroup: '',
    iconKey: '',
    presentationKey: 'standard-section',
  }
}

export const cloneUIContract = (contract = {}) => ({
  id: String(contract.id ?? contract.stableId ?? '').trim(),
  uiContractKey: String(contract.uiContractKey ?? '').trim(),
  name: String(contract.name ?? '').trim(),
  description: String(contract.description ?? '').trim(),
  status: String(contract.status ?? UI_CONTRACT_STATUSES.DRAFT).trim().toUpperCase(),
  frameworkKeys: Array.isArray(contract.frameworkKeys) ? [...contract.frameworkKeys] : [],
  introducedInVersion: String(contract.introducedInVersion ?? '').trim(),
  deprecatedInVersion: String(contract.deprecatedInVersion ?? '').trim() || null,
  compatibilityTags: Array.isArray(contract.compatibilityTags) ? [...contract.compatibilityTags] : [],
  compatibilityMode: String(contract.compatibilityMode ?? UI_CONTRACT_COMPATIBILITY_MODES.INHERITED_MINOR).trim().toUpperCase(),
  sourcePackageKey: String(contract.sourcePackageKey ?? '').trim().toLowerCase(),
  sourcePackageVersion: String(contract.sourcePackageVersion ?? '').trim(),
  sourceFrameworkKey: String(contract.sourceFrameworkKey ?? '').trim().toUpperCase(),
  sections: normalizeSectionPresentationRows(contract.sections),
  lifecycleStages: normalizeLifecycleStageRows(contract.lifecycleStages),
  actions: normalizeActionRows(contract.actions),
  isSystem: Boolean(contract.isSystem),
  isProtected: Boolean(contract.isProtected),
  isLocked: Boolean(contract.isLocked),
  componentVersion: Number(contract.componentVersion ?? 1) || 1,
  versionStatus: String(
    contract.versionStatus
      ?? (contract.status === UI_CONTRACT_STATUSES.ACTIVE
        ? 'ACTIVE'
        : contract.status === UI_CONTRACT_STATUSES.DEPRECATED
          ? 'DEPRECATED'
          : contract.status === UI_CONTRACT_STATUSES.ARCHIVED || contract.status === UI_CONTRACT_STATUSES.INACTIVE
            ? 'ARCHIVED'
            : 'DRAFT'),
  ).trim().toUpperCase(),
  lineageId: String(contract.lineageId ?? contract.stableId ?? contract.id ?? '').trim(),
  lockedAt: contract.lockedAt ?? null,
  lockedBy: contract.lockedBy ?? null,
  lockedReason: String(contract.lockedReason ?? '').trim() || null,
  lockedByPackageKeys: Array.isArray(contract.lockedByPackageKeys) ? [...contract.lockedByPackageKeys] : [],
  clonedFromStableId: contract.clonedFromStableId ?? null,
  supersedesStableId: contract.supersedesStableId ?? null,
  supersededByStableId: contract.supersededByStableId ?? null,
  resolvedAt: contract.resolvedAt ?? contract.updatedAt ?? contract.createdAt ?? null,
  createdAt: contract.createdAt ?? null,
  updatedAt: contract.updatedAt ?? null,
  createdBy: contract.createdBy ?? null,
  updatedBy: contract.updatedBy ?? null,
})

export const mapUIContractToForm = (contract = {}) => ({
  uiContractKey: String(contract.uiContractKey ?? '').trim(),
  name: String(contract.name ?? '').trim(),
  description: String(contract.description ?? '').trim(),
  status: String(contract.status ?? UI_CONTRACT_STATUSES.DRAFT).trim().toUpperCase(),
  frameworkKeys: formatList(contract.frameworkKeys),
  introducedInVersion: String(contract.introducedInVersion ?? '').trim(),
  deprecatedInVersion: String(contract.deprecatedInVersion ?? '').trim(),
  compatibilityTags: formatList(contract.compatibilityTags),
  compatibilityMode: String(contract.compatibilityMode ?? UI_CONTRACT_COMPATIBILITY_MODES.INHERITED_MINOR).trim().toUpperCase(),
  sourcePackageKey: String(contract.sourcePackageKey ?? '').trim().toLowerCase(),
  sourcePackageVersion: String(contract.sourcePackageVersion ?? '').trim(),
  sourceFrameworkKey: String(contract.sourceFrameworkKey ?? '').trim().toUpperCase(),
  sections: normalizeSectionPresentationRows(contract.sections),
  lifecycleStages: normalizeLifecycleStageRows(contract.lifecycleStages),
  actions: normalizeActionRows(contract.actions),
  isSystem: Boolean(contract.isSystem),
  isProtected: Boolean(contract.isProtected),
  isLocked: Boolean(contract.isLocked),
  componentVersion: Number(contract.componentVersion ?? 1) || 1,
  versionStatus: String(contract.versionStatus ?? '').trim().toUpperCase(),
  lineageId: String(contract.lineageId ?? contract.id ?? '').trim(),
  lockedAt: contract.lockedAt ?? null,
  lockedBy: contract.lockedBy ?? null,
  lockedReason: String(contract.lockedReason ?? '').trim(),
  lockedByPackageKeys: Array.isArray(contract.lockedByPackageKeys) ? [...contract.lockedByPackageKeys] : [],
  clonedFromStableId: contract.clonedFromStableId ?? null,
  supersedesStableId: contract.supersedesStableId ?? null,
  supersededByStableId: contract.supersededByStableId ?? null,
})

const duplicate = (items, key, { upper = true } = {}) => {
  const seen = new Set()
  return items.some((item) => {
    const raw = String(item?.[key] ?? '').trim()
    const value = upper ? raw.toUpperCase() : raw.toLowerCase()
    if (!value) return false
    if (seen.has(value)) return true
    seen.add(value)
    return false
  })
}

const duplicateVisibleOrder = (items) => {
  const seen = new Set()
  return items.some((item) => {
    if (item?.isVisible === false) return false
    const value = String(item?.displayOrder ?? '').trim()
    if (!value) return false
    if (seen.has(value)) return true
    seen.add(value)
    return false
  })
}

const normalizeNullableVersion = (value) => {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

const normalizePackageSectionKey = (value) => String(value ?? '').trim().toLowerCase()
const normalizePackageRuntimePath = (value) => String(value ?? '').trim()

const validateSectionMappings = (sections = [], sourcePackage = null) => {
  const packageBackedSections = sections.filter((section) => !isCustomSectionPresentation(section))
  if (!sourcePackage) {
    return packageBackedSections.length > 0
      ? 'Package-backed UI Contract sections require a source package.'
      : ''
  }

  const packageSections = Array.isArray(sourcePackage.sections) ? sourcePackage.sections : []
  const packageSectionByKey = new Map(
    packageSections
      .map((section) => [normalizePackageSectionKey(section?.sectionKey), section])
      .filter(([sectionKey]) => Boolean(sectionKey)),
  )
  const mappedSectionKeys = new Set()
  const emptyRuntimePathKeys = []
  const orphanedSectionKeys = []
  const runtimePathMismatchKeys = []

  packageBackedSections.forEach((section) => {
    const sectionKey = normalizePackageSectionKey(section.sectionKey)
    if (!sectionKey) return

    const runtimePath = normalizePackageRuntimePath(section.runtimePath)
    if (!runtimePath) {
      emptyRuntimePathKeys.push(sectionKey)
      return
    }

    const packageSection = packageSectionByKey.get(sectionKey)
    if (!packageSection) {
      orphanedSectionKeys.push(sectionKey)
      return
    }

    if (runtimePath !== normalizePackageRuntimePath(packageSection.runtimePath)) {
      runtimePathMismatchKeys.push(sectionKey)
      return
    }

    mappedSectionKeys.add(sectionKey)
  })

  const missingRequiredSectionKeys = packageSections
    .filter((section) => section?.required === true)
    .map((section) => normalizePackageSectionKey(section?.sectionKey))
    .filter((sectionKey) => sectionKey && !mappedSectionKeys.has(sectionKey))

  if (emptyRuntimePathKeys.length > 0) {
    return `Package-backed UI Contract sections require runtime paths: ${emptyRuntimePathKeys.join(', ')}.`
  }

  if (orphanedSectionKeys.length > 0) {
    return `UI Contract sections must exist in the source package unless marked custom: ${orphanedSectionKeys.join(', ')}.`
  }

  if (runtimePathMismatchKeys.length > 0) {
    return `UI Contract section runtime paths must match the source package: ${runtimePathMismatchKeys.join(', ')}.`
  }

  if (missingRequiredSectionKeys.length > 0) {
    return `Required package sections must have mapped UI Contract sections: ${missingRequiredSectionKeys.join(', ')}.`
  }

  return ''
}

export const validateUIContractForm = (form = {}, { isEditMode = false, sourcePackage = null } = {}) => {
  const errors = {}
  const uiContractKey = String(form.uiContractKey ?? '').trim().toLowerCase()
  const frameworkKeys = parseUIContractList(form.frameworkKeys, { upper: true })
  const sections = normalizeSectionPresentationRows(form.sections)
  const lifecycleStages = normalizeLifecycleStageRows(form.lifecycleStages)
  const actions = normalizeActionRows(form.actions)
  const sourcePackageKey = String(form.sourcePackageKey ?? '').trim().toLowerCase()
  const sourcePackageVersion = String(form.sourcePackageVersion ?? '').trim()
  const sourceFrameworkKey = String(form.sourceFrameworkKey ?? '').trim().toUpperCase()

  if (!isEditMode) {
    if (!uiContractKey) {
      errors.uiContractKey = 'UI Contract key is required.'
    } else if (!KEY_PATTERN.test(uiContractKey)) {
      errors.uiContractKey = 'UI Contract key must use lowercase letters, numbers, or hyphens.'
    }
  }

  if (!String(form.name ?? '').trim()) errors.name = 'Name is required.'
  if (frameworkKeys.length === 0) errors.frameworkKeys = 'Select at least one framework.'

  for (const field of ['introducedInVersion', 'deprecatedInVersion', 'sourcePackageVersion']) {
    const value = String(form[field] ?? '').trim()
    if (value && !SEMVER_PATTERN.test(value)) {
      errors[field] = 'Version must use semantic version format.'
    }
  }

  if (sourcePackageKey && !KEY_PATTERN.test(sourcePackageKey)) {
    errors.sourcePackageKey = 'Source package key must use lowercase letters, numbers, or hyphens.'
  }

  if (sourceFrameworkKey && !FRAMEWORK_KEY_PATTERN.test(sourceFrameworkKey)) {
    errors.sourceFrameworkKey = 'Source framework key must use uppercase letters, numbers, or underscores.'
  }

  if (sections.some((section) => !section.sectionKey)) {
    errors.sections = 'Each section requires a section key.'
  } else if (sections.some((section) => section.isVisible !== false && !section.label)) {
    errors.sections = 'Visible sections require a label.'
  } else if (duplicate(sections, 'sectionKey', { upper: false })) {
    errors.sections = 'Section keys must be unique.'
  } else if (duplicateVisibleOrder(sections)) {
    errors.sections = 'Visible section display order values must be unique.'
  } else {
    const sectionMappingError = validateSectionMappings(sections, sourcePackage)
    if (sectionMappingError) errors.sections = sectionMappingError
  }

  if (lifecycleStages.some((stage) => !stage.stageKey || !stage.label)) {
    errors.lifecycleStages = 'Each lifecycle stage requires stageKey and label.'
  } else if (duplicate(lifecycleStages, 'stageKey')) {
    errors.lifecycleStages = 'Lifecycle stage keys must be unique.'
  } else if (duplicateVisibleOrder(lifecycleStages)) {
    errors.lifecycleStages = 'Visible lifecycle display order values must be unique.'
  }

  if (actions.some((action) => !action.actionKey || !action.governedAction || !action.buttonLabel)) {
    errors.actions = 'Each action requires actionKey, governedAction, and buttonLabel.'
  } else if (duplicate(actions, 'actionKey')) {
    errors.actions = 'Action keys must be unique.'
  } else if (duplicateVisibleOrder(actions)) {
    errors.actions = 'Visible action display order values must be unique.'
  }

  const payload = {
    name: String(form.name ?? '').trim(),
    description: String(form.description ?? '').trim(),
    status: String(form.status ?? UI_CONTRACT_STATUSES.DRAFT).trim().toUpperCase(),
    frameworkKeys,
    introducedInVersion: normalizeNullableVersion(form.introducedInVersion),
    deprecatedInVersion: normalizeNullableVersion(form.deprecatedInVersion),
    compatibilityTags: parseUIContractList(form.compatibilityTags),
    compatibilityMode: String(form.compatibilityMode ?? UI_CONTRACT_COMPATIBILITY_MODES.INHERITED_MINOR).trim().toUpperCase(),
    sourcePackageKey,
    sourcePackageVersion: normalizeNullableVersion(sourcePackageVersion),
    sourceFrameworkKey,
    sections,
    lifecycleStages,
    actions,
    isSystem: Boolean(form.isSystem),
    isProtected: Boolean(form.isProtected),
  }

  if (!isEditMode) {
    payload.uiContractKey = uiContractKey
  }

  return { errors, payload }
}

export const INITIAL_UI_CONTRACTS = Object.freeze([
  cloneUIContract({
    id: 'ui-contract-vmf-ui-contract-v1',
    uiContractKey: 'vmf-ui-contract-v1',
    name: 'VMF UI Contract v1',
    description: 'Default UI presentation contract for VMF v2.3.1 runtime packages.',
    status: UI_CONTRACT_STATUSES.ACTIVE,
    versionStatus: 'ACTIVE',
    frameworkKeys: ['VMF'],
    introducedInVersion: '2.3.1',
    compatibilityTags: ['VMF', '2.3.1'],
    compatibilityMode: UI_CONTRACT_COMPATIBILITY_MODES.INHERITED_MINOR,
    sourcePackageKey: 'vmf-2-3-1',
    sourcePackageVersion: '2.3.1',
    sourceFrameworkKey: 'VMF',
    // UI Contract table rendering needs at least one of resolvedAt, updatedAt, or createdAt.
    resolvedAt: '2026-04-29T07:45:00.000Z',
    sections: [
      {
        sectionKey: 'customer_problem',
        runtimePath: 'framework_state.sections.customer_problem',
        sourcePackageKey: 'vmf-2-3-1',
        label: 'Customer Problem',
        shortLabel: 'Problem',
        helpText: 'Describe the core problem the customer is trying to solve.',
        placeholder: 'Example: Proposal creation is slow, manual, and inconsistent.',
        displayOrder: 10,
        isVisible: true,
        isEditable: true,
        isRequiredDisplay: true,
        isReadOnlyDisplay: false,
        isCollapsedByDefault: false,
        sectionGroup: 'Core Message',
        presentationKey: 'standard-section',
      },
      {
        sectionKey: 'proposed_solution',
        runtimePath: 'framework_state.sections.proposed_solution',
        sourcePackageKey: 'vmf-2-3-1',
        label: 'Proposed Solution',
        shortLabel: 'Solution',
        helpText: 'Describe how the proposed solution addresses the customer problem.',
        placeholder: 'Example: StorylineOS provides a governed framework workflow...',
        displayOrder: 20,
        isVisible: true,
        isEditable: true,
        isRequiredDisplay: true,
        isReadOnlyDisplay: false,
        isCollapsedByDefault: false,
        sectionGroup: 'Core Message',
        presentationKey: 'standard-section',
      },
    ],
    lifecycleStages: [
      { stageKey: 'DRAFT', label: 'Draft', description: 'The framework is being prepared and can still be edited.', badgeLabel: 'Draft', displayOrder: 10, isVisible: true, badgePresentationKey: 'neutral' },
      { stageKey: 'REVIEW_READY', label: 'Ready for Review', description: 'The framework has been submitted and is ready for review.', badgeLabel: 'Review Ready', displayOrder: 20, isVisible: true, badgePresentationKey: 'info' },
    ],
    actions: [
      { actionKey: 'SAVE_DRAFT', governedAction: 'SAVE_DRAFT', buttonLabel: 'Save Draft', confirmationTitle: '', confirmationMessage: '', successMessage: 'Draft saved.', failureMessage: 'Draft could not be saved.', loadingMessage: 'Saving draft...', displayOrder: 10, isVisible: true, requiresConfirmation: false, presentationKey: 'secondary-action' },
      { actionKey: 'SUBMIT_FOR_REVIEW', governedAction: 'SUBMIT_FOR_REVIEW', buttonLabel: 'Submit for Review', confirmationTitle: 'Submit for Review?', confirmationMessage: 'Submit this framework for review?', successMessage: 'Framework submitted for review.', failureMessage: 'Framework could not be submitted.', loadingMessage: 'Submitting framework...', displayOrder: 20, isVisible: true, requiresConfirmation: true, presentationKey: 'primary-action' },
    ],
    isSystem: true,
  }),
])
