import { describe, expect, it } from 'vitest'
import {
  RUNTIME_PATH_REGISTRY_DATA_TYPES,
  RUNTIME_PATH_REGISTRY_OPERATIONS,
  RUNTIME_PATH_REGISTRY_STATUSES,
  RUNTIME_PATH_REGISTRY_UI_CONTROLS,
  buildRuntimePathRegistryStableId,
  getRuntimeControlVersionStatusVariant,
  getRuntimePathRegistryStatusVariant,
  validateRuntimePathRegistryForm,
} from './superAdminRuntimePathRegistry.constants.js'

const buildValidForm = (overrides = {}) => ({
  pathKey: 'framework_state.lifecycle.stage',
  label: 'Lifecycle Stage',
  description: 'Current lifecycle stage.',
  frameworkKeys: ['VMF'],
  allowedOperations: [RUNTIME_PATH_REGISTRY_OPERATIONS.READ],
  dataType: RUNTIME_PATH_REGISTRY_DATA_TYPES.STRING,
  uiControl: '',
  allowedValues: '',
  displayOrder: '',
  minValue: '',
  maxValue: '',
  minLength: '',
  maxLength: '',
  ...overrides,
})

describe('buildRuntimePathRegistryStableId', () => {
  it('matches the API stable-id format including the hash suffix', () => {
    const stableId = buildRuntimePathRegistryStableId('framework_state.lifecycle.stage')

    expect(stableId).toMatch(/^path-framework-state-lifecycle-stage-[a-z0-9]+$/)
    expect(stableId).not.toBe('path-framework-state-lifecycle-stage')
  })
})

describe('validateRuntimePathRegistryForm', () => {
  it('requires create-only identity and core metadata fields', () => {
    const errors = validateRuntimePathRegistryForm(buildValidForm({
      pathKey: 'framework state.lifecycle.stage',
      label: '',
      description: '',
      frameworkKeys: [],
      allowedOperations: [],
    }))

    expect(errors).toMatchObject({
      pathKey: 'Path key cannot contain whitespace.',
      label: 'Label is required.',
      description: 'Description is required.',
      frameworkKeys: 'Select at least one framework.',
      allowedOperations: 'Select at least one operation.',
    })
  })

  it('does not require pathKey while editing immutable runtime paths', () => {
    const errors = validateRuntimePathRegistryForm(buildValidForm({ pathKey: '' }), { isEditMode: true })

    expect(errors.pathKey).toBeUndefined()
  })

  it('validates UI-control compatibility with data type and allowed values', () => {
    const selectErrors = validateRuntimePathRegistryForm(buildValidForm({
      uiControl: RUNTIME_PATH_REGISTRY_UI_CONTROLS.SELECT,
      allowedValues: '',
    }))
    const checkboxErrors = validateRuntimePathRegistryForm(buildValidForm({
      uiControl: RUNTIME_PATH_REGISTRY_UI_CONTROLS.CHECKBOX,
      dataType: RUNTIME_PATH_REGISTRY_DATA_TYPES.STRING,
    }))

    expect(selectErrors.uiControl).toBe('SELECT requires at least one allowed value.')
    expect(checkboxErrors.uiControl).toBe('CHECKBOX requires BOOLEAN data type.')
  })

  it('validates numeric and range constraints', () => {
    const errors = validateRuntimePathRegistryForm(buildValidForm({
      displayOrder: 'first',
      minValue: '10',
      maxValue: '5',
      minLength: '7',
      maxLength: '2',
    }))

    expect(errors).toMatchObject({
      displayOrder: 'Enter a valid number.',
      maxValue: 'Max Value must be greater than or equal to Min Value.',
      maxLength: 'Max Length must be greater than or equal to Min Length.',
    })
  })
})

describe('Runtime Path status variants', () => {
  it('renders draft operational and version statuses as warning/amber', () => {
    expect(getRuntimePathRegistryStatusVariant(RUNTIME_PATH_REGISTRY_STATUSES.DRAFT)).toBe('warning')
    expect(getRuntimeControlVersionStatusVariant('DRAFT')).toBe('warning')
  })
})
