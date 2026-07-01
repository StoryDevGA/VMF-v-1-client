import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  RUNTIME_PATH_REGISTRY_CATEGORIES,
  RUNTIME_PATH_REGISTRY_CATEGORY_OPTIONS,
  RUNTIME_PATH_REGISTRY_DATA_TYPES,
  RUNTIME_PATH_REGISTRY_DATA_TYPE_OPTIONS,
  RUNTIME_PATH_REGISTRY_OPERATIONS,
  RUNTIME_PATH_REGISTRY_OPERATION_OPTIONS,
  RUNTIME_PATH_REGISTRY_SCOPE_OPTIONS,
  RUNTIME_PATH_REGISTRY_SCOPES,
  RUNTIME_PATH_REGISTRY_SOURCE_TYPE_OPTIONS,
  RUNTIME_PATH_REGISTRY_SOURCE_TYPES,
  RUNTIME_PATH_REGISTRY_STATUS_OPTIONS,
  RUNTIME_PATH_REGISTRY_STATUSES,
  RUNTIME_PATH_REGISTRY_UI_CONTROL_OPTIONS,
  RUNTIME_PATH_REGISTRY_UI_CONTROLS,
  buildRuntimePathRegistryStableId,
  getRuntimeControlVersionStatusVariant,
  getRuntimePathRegistryStatusVariant,
  validateRuntimePathRegistryForm,
} from './superAdminRuntimePathRegistry.constants.js'

const testDirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(testDirname, '../../../..')
const apiRuntimePathRegistryModelPath = path.join(
  workspaceRoot,
  'VMF-v-1-api/src/models/RuntimePathRegistry.js',
)

const sortedValues = (values) =>
  [...values].sort((left, right) => left.localeCompare(right))

const objectValues = (values) => sortedValues(Object.values(values))

const optionValues = (options) =>
  sortedValues(options.map((option) => option.value).filter(Boolean))

const loadBackendRuntimePathRegistrySnapshot = () => {
  const script = `
const runtimePathRegistry = await import(${JSON.stringify(pathToFileURL(apiRuntimePathRegistryModelPath).href)})

process.stdout.write(JSON.stringify({
  statuses: Object.values(runtimePathRegistry.RUNTIME_PATH_REGISTRY_STATUSES),
  operations: Object.values(runtimePathRegistry.RUNTIME_PATH_REGISTRY_OPERATIONS),
  scopes: Object.values(runtimePathRegistry.RUNTIME_PATH_REGISTRY_SCOPES),
  dataTypes: Object.values(runtimePathRegistry.RUNTIME_PATH_REGISTRY_DATA_TYPES),
  categories: Object.values(runtimePathRegistry.RUNTIME_PATH_REGISTRY_CATEGORIES),
  sourceTypes: Object.values(runtimePathRegistry.RUNTIME_PATH_REGISTRY_SOURCE_TYPES),
  uiControls: Object.values(runtimePathRegistry.RUNTIME_PATH_REGISTRY_UI_CONTROLS),
}))
`

  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: workspaceRoot,
      encoding: 'utf8',
    }),
  )
}

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

describe('Runtime Path option contracts', () => {
  it('keeps Runtime Path Registry constants aligned with backend model registries', () => {
    const backendRegistries = loadBackendRuntimePathRegistrySnapshot()

    expect(objectValues(RUNTIME_PATH_REGISTRY_STATUSES)).toEqual(
      sortedValues(backendRegistries.statuses),
    )
    expect(objectValues(RUNTIME_PATH_REGISTRY_OPERATIONS)).toEqual(
      sortedValues(backendRegistries.operations),
    )
    expect(objectValues(RUNTIME_PATH_REGISTRY_SCOPES)).toEqual(
      sortedValues(backendRegistries.scopes),
    )
    expect(objectValues(RUNTIME_PATH_REGISTRY_DATA_TYPES)).toEqual(
      sortedValues(backendRegistries.dataTypes),
    )
    expect(objectValues(RUNTIME_PATH_REGISTRY_CATEGORIES)).toEqual(
      sortedValues(backendRegistries.categories),
    )
    expect(objectValues(RUNTIME_PATH_REGISTRY_SOURCE_TYPES)).toEqual(
      sortedValues(backendRegistries.sourceTypes),
    )
    expect(objectValues(RUNTIME_PATH_REGISTRY_UI_CONTROLS)).toEqual(
      sortedValues(backendRegistries.uiControls),
    )

    expect(optionValues(RUNTIME_PATH_REGISTRY_STATUS_OPTIONS)).toEqual(
      sortedValues(backendRegistries.statuses),
    )
    expect(optionValues(RUNTIME_PATH_REGISTRY_OPERATION_OPTIONS)).toEqual(
      sortedValues(backendRegistries.operations),
    )
    expect(optionValues(RUNTIME_PATH_REGISTRY_SCOPE_OPTIONS)).toEqual(
      sortedValues(backendRegistries.scopes),
    )
    expect(optionValues(RUNTIME_PATH_REGISTRY_DATA_TYPE_OPTIONS)).toEqual(
      sortedValues(backendRegistries.dataTypes),
    )
    expect(optionValues(RUNTIME_PATH_REGISTRY_CATEGORY_OPTIONS)).toEqual(
      sortedValues(backendRegistries.categories),
    )
    expect(optionValues(RUNTIME_PATH_REGISTRY_SOURCE_TYPE_OPTIONS)).toEqual(
      sortedValues(backendRegistries.sourceTypes),
    )
    expect(optionValues(RUNTIME_PATH_REGISTRY_UI_CONTROL_OPTIONS)).toEqual(
      sortedValues(backendRegistries.uiControls),
    )
  })
})
