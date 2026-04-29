export const UI_CONTRACT_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DEPRECATED: 'DEPRECATED',
})

export const UI_CONTRACT_COMPATIBILITY_MODES = Object.freeze({
  STRICT: 'STRICT',
  INHERITED_MINOR: 'INHERITED_MINOR',
  OPEN: 'OPEN',
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
  'sections',
  'lifecycleStages',
  'actions',
])

const KEY_PATTERN = /^[a-z][a-z0-9-]*$/
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
  sectionsJson: '[]',
  lifecycleStagesJson: '[]',
  actionsJson: '[]',
  isSystem: false,
  isProtected: false,
  isLocked: false,
  clonedFromStableId: '',
})

const parseList = (value, { upper = false } = {}) => [
  ...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .map((item) => (upper ? item.toUpperCase() : item))
      .filter(Boolean),
  ),
]

const formatList = (items) => Array.isArray(items) ? items.join('\n') : ''

const parseJsonArray = (value, field, errors) => {
  try {
    const parsed = JSON.parse(String(value || '[]'))
    if (!Array.isArray(parsed)) {
      errors[field] = 'Value must be a JSON array.'
      return []
    }
    return parsed
  } catch {
    errors[field] = 'Value must be valid JSON.'
    return []
  }
}

const formatJsonArray = (items) => JSON.stringify(Array.isArray(items) ? items : [], null, 2)

export const cloneUIContract = (contract = {}) => ({
  id: String(contract.id ?? contract.stableId ?? '').trim(),
  uiContractKey: String(contract.uiContractKey ?? '').trim(),
  name: String(contract.name ?? '').trim(),
  description: String(contract.description ?? '').trim(),
  status: String(contract.status ?? UI_CONTRACT_STATUSES.DRAFT).trim().toUpperCase(),
  frameworkKeys: Array.isArray(contract.frameworkKeys) ? [...contract.frameworkKeys] : [],
  introducedInVersion: String(contract.introducedInVersion ?? '').trim(),
  deprecatedInVersion: String(contract.deprecatedInVersion ?? '').trim(),
  compatibilityTags: Array.isArray(contract.compatibilityTags) ? [...contract.compatibilityTags] : [],
  compatibilityMode: String(contract.compatibilityMode ?? UI_CONTRACT_COMPATIBILITY_MODES.INHERITED_MINOR).trim().toUpperCase(),
  sections: Array.isArray(contract.sections) ? contract.sections.map((item) => ({ ...item })) : [],
  lifecycleStages: Array.isArray(contract.lifecycleStages) ? contract.lifecycleStages.map((item) => ({ ...item })) : [],
  actions: Array.isArray(contract.actions) ? contract.actions.map((item) => ({ ...item })) : [],
  isSystem: Boolean(contract.isSystem),
  isProtected: Boolean(contract.isProtected),
  isLocked: Boolean(contract.isLocked),
  clonedFromStableId: String(contract.clonedFromStableId ?? '').trim(),
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
  sectionsJson: formatJsonArray(contract.sections),
  lifecycleStagesJson: formatJsonArray(contract.lifecycleStages),
  actionsJson: formatJsonArray(contract.actions),
  isSystem: Boolean(contract.isSystem),
  isProtected: Boolean(contract.isProtected),
  isLocked: Boolean(contract.isLocked),
  clonedFromStableId: String(contract.clonedFromStableId ?? '').trim(),
})

export const validateUIContractForm = (form = {}, { isEditMode = false } = {}) => {
  const errors = {}
  const uiContractKey = String(form.uiContractKey ?? '').trim().toLowerCase()
  const frameworkKeys = parseList(form.frameworkKeys, { upper: true })
  const sections = parseJsonArray(form.sectionsJson, 'sections', errors)
  const lifecycleStages = parseJsonArray(form.lifecycleStagesJson, 'lifecycleStages', errors)
  const actions = parseJsonArray(form.actionsJson, 'actions', errors)

  if (!isEditMode) {
    if (!uiContractKey) {
      errors.uiContractKey = 'UI Contract key is required.'
    } else if (!KEY_PATTERN.test(uiContractKey)) {
      errors.uiContractKey = 'UI Contract key must use lowercase letters, numbers, or hyphens.'
    }
  }

  if (!String(form.name ?? '').trim()) errors.name = 'Name is required.'
  if (frameworkKeys.length === 0) errors.frameworkKeys = 'Select at least one framework.'

  for (const field of ['introducedInVersion', 'deprecatedInVersion']) {
    const value = String(form[field] ?? '').trim()
    if (value && !SEMVER_PATTERN.test(value)) {
      errors[field] = 'Version must use semantic version format.'
    }
  }

  const duplicate = (items, key) => {
    const seen = new Set()
    return items.some((item) => {
      const value = String(item?.[key] ?? '').trim().toUpperCase()
      if (!value) return false
      if (seen.has(value)) return true
      seen.add(value)
      return false
    })
  }

  if (!errors.sections) {
    if (sections.some((section) => !section.sectionKey || !section.label)) {
      errors.sections = 'Each section requires sectionKey and label.'
    } else if (duplicate(sections, 'sectionKey')) {
      errors.sections = 'Section keys must be unique.'
    }
  }

  if (!errors.lifecycleStages) {
    if (lifecycleStages.some((stage) => !stage.stageKey || !stage.label)) {
      errors.lifecycleStages = 'Each lifecycle stage requires stageKey and label.'
    } else if (duplicate(lifecycleStages, 'stageKey')) {
      errors.lifecycleStages = 'Lifecycle stage keys must be unique.'
    }
  }

  if (!errors.actions) {
    if (actions.some((action) => !action.actionKey || !action.buttonLabel)) {
      errors.actions = 'Each action requires actionKey and buttonLabel.'
    } else if (duplicate(actions, 'actionKey')) {
      errors.actions = 'Action keys must be unique.'
    }
  }

  return {
    errors,
    payload: {
      uiContractKey,
      name: String(form.name ?? '').trim(),
      description: String(form.description ?? '').trim(),
      status: String(form.status ?? UI_CONTRACT_STATUSES.DRAFT).trim().toUpperCase(),
      frameworkKeys,
      introducedInVersion: String(form.introducedInVersion ?? '').trim(),
      deprecatedInVersion: String(form.deprecatedInVersion ?? '').trim(),
      compatibilityTags: parseList(form.compatibilityTags),
      compatibilityMode: String(form.compatibilityMode ?? UI_CONTRACT_COMPATIBILITY_MODES.INHERITED_MINOR).trim().toUpperCase(),
      sections,
      lifecycleStages,
      actions,
      isSystem: Boolean(form.isSystem),
      isProtected: Boolean(form.isProtected),
      isLocked: Boolean(form.isLocked),
      clonedFromStableId: String(form.clonedFromStableId ?? '').trim(),
    },
  }
}

export const INITIAL_UI_CONTRACTS = Object.freeze([
  cloneUIContract({
    id: 'ui-contract-vmf-ui-contract-v1',
    uiContractKey: 'vmf-ui-contract-v1',
    name: 'VMF UI Contract v1',
    description: 'Default UI presentation contract for VMF v2.3.1 runtime packages.',
    status: UI_CONTRACT_STATUSES.ACTIVE,
    frameworkKeys: ['VMF'],
    introducedInVersion: '2.3.1',
    compatibilityTags: ['VMF', '2.3.1'],
    compatibilityMode: UI_CONTRACT_COMPATIBILITY_MODES.INHERITED_MINOR,
    sections: [
      {
        sectionKey: 'customer_problem',
        runtimePath: 'framework_state.sections.customer_problem',
        label: 'Customer Problem',
        shortLabel: 'Problem',
        helpText: 'Describe the core problem the customer is trying to solve.',
        placeholder: 'Example: Proposal creation is slow, manual, and inconsistent.',
        displayOrder: 10,
        isVisible: true,
        isRequiredDisplay: true,
      },
      {
        sectionKey: 'proposed_solution',
        runtimePath: 'framework_state.sections.proposed_solution',
        label: 'Proposed Solution',
        shortLabel: 'Solution',
        helpText: 'Describe how the proposed solution addresses the customer problem.',
        placeholder: 'Example: StorylineOS provides a governed framework workflow...',
        displayOrder: 20,
        isVisible: true,
        isRequiredDisplay: true,
      },
    ],
    lifecycleStages: [
      { stageKey: 'DRAFT', label: 'Draft', description: 'The framework is being prepared and can still be edited.', badgeLabel: 'Draft', displayOrder: 10, isVisible: true },
      { stageKey: 'REVIEW_READY', label: 'Ready for Review', description: 'The framework has been submitted and is ready for review.', badgeLabel: 'Review Ready', displayOrder: 20, isVisible: true },
    ],
    actions: [
      { actionKey: 'SAVE_DRAFT', buttonLabel: 'Save Draft', confirmationMessage: '', successMessage: 'Draft saved.', failureMessage: 'Draft could not be saved.', displayOrder: 10, isVisible: true, requiresConfirmation: false },
      { actionKey: 'SUBMIT_FOR_REVIEW', buttonLabel: 'Submit for Review', confirmationMessage: 'Submit this framework for review?', successMessage: 'Framework submitted for review.', failureMessage: 'Framework could not be submitted.', displayOrder: 20, isVisible: true, requiresConfirmation: true },
    ],
    isSystem: true,
  }),
])
