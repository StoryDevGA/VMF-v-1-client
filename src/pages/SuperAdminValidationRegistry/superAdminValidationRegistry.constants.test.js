import { describe, expect, it } from 'vitest'
import {
  VALIDATION_REGISTRY_CATEGORIES,
  VALIDATION_REGISTRY_SEVERITIES,
  normalizeValidationRegistryFrameworkKeys,
  normalizeValidationRegistryStableIdList,
  validateValidationRegistryForm,
} from './superAdminValidationRegistry.constants.js'

const outputPath = 'framework_state.validation.required_sections'

const buildValidForm = (overrides = {}) => ({
  key: 'required-sections-check',
  label: 'Required Sections Check',
  description: 'Checks whether required framework sections are complete.',
  supportedFrameworkKeys: ['VMF'],
  category: VALIDATION_REGISTRY_CATEGORIES.COMPLETENESS,
  severity: VALIDATION_REGISTRY_SEVERITIES.ERROR,
  producerSkillId: 'skill-vmf-required-sections-validator',
  outputPath,
  passFieldPath: `${outputPath}.is_valid`,
  detailsFieldPath: `${outputPath}.missing_sections`,
  messageFieldPath: `${outputPath}.message`,
  freshnessDefaultMinutes: 30,
  blockingDefault: true,
  warningOnlyDefault: false,
  version: 1,
  ...overrides,
})

describe('validation registry normalizers', () => {
  it('deduplicates framework keys and stable IDs', () => {
    expect(normalizeValidationRegistryFrameworkKeys(['vmf', 'VMF', ' acme '])).toEqual(['VMF', 'ACME'])
    expect(normalizeValidationRegistryStableIdList([' skill-1 ', 'skill-1', '', null])).toEqual(['skill-1'])
  })
})

describe('validateValidationRegistryForm', () => {
  it('requires create identity and core validation metadata', () => {
    const errors = validateValidationRegistryForm(buildValidForm({
      key: '',
      label: '',
      description: '',
      supportedFrameworkKeys: [],
      category: '',
      severity: '',
      producerSkillId: '',
      outputPath: '',
    }))

    expect(errors).toMatchObject({
      key: 'Key is required.',
      label: 'Label is required.',
      description: 'Description is required.',
      supportedFrameworkKeys: 'Select at least one supported framework.',
      category: 'Category is required.',
      severity: 'Severity is required.',
      producerSkillId: 'Producer skill is required.',
      outputPath: 'Output Path is required.',
    })
  })

  it('does not require key while editing immutable validations', () => {
    const errors = validateValidationRegistryForm(buildValidForm({ key: '' }), { isEditMode: true })

    expect(errors.key).toBeUndefined()
  })

  it('validates path descendants and mutually exclusive defaults', () => {
    const errors = validateValidationRegistryForm(buildValidForm({
      passFieldPath: 'framework_state.validation.other.is_valid',
      detailsFieldPath: 'framework_state.validation.other.message',
      messageFieldPath: 'framework_state.validation.other.message',
      blockingDefault: true,
      warningOnlyDefault: true,
    }))

    expect(errors).toMatchObject({
      passFieldPath: 'Pass Field Path must be inside the selected Output Path.',
      detailsFieldPath: 'Details Field Path must be inside the selected Output Path.',
      messageFieldPath: 'Message Field Path must be inside the selected Output Path.',
      warningOnlyDefault: 'Blocking Default and Warning Only Default cannot both be true.',
    })
  })

  it('validates parameter JSON and retry policy controls', () => {
    const errors = validateValidationRegistryForm(buildValidForm({
      parameterSchema: ['not-object'],
      defaultParameters: null,
      retryPolicy: {
        maxAttempts: 0,
        backoffSeconds: -1,
      },
    }))

    expect(errors).toMatchObject({
      parameterSchema: 'Parameter Schema must be a JSON object.',
      defaultParameters: 'Default Parameters must be a JSON object.',
      'retryPolicy.maxAttempts': 'Max Attempts must be a whole number from 1 to 10.',
      'retryPolicy.backoffSeconds': 'Backoff Seconds must be a whole number from 0 to 3600.',
    })
  })

  it('validates freshness and version as non-negative whole-number controls', () => {
    const errors = validateValidationRegistryForm(buildValidForm({
      freshnessDefaultMinutes: -1,
      version: 0,
    }))

    expect(errors).toMatchObject({
      freshnessDefaultMinutes: 'Freshness Default Minutes must be zero or a positive whole number.',
      version: 'Version must be a positive whole number.',
    })
  })
})
