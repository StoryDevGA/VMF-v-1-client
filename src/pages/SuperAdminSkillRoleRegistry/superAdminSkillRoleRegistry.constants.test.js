import { describe, expect, it } from 'vitest'
import {
  SKILL_ROLE_REGISTRY_CATEGORIES,
  SKILL_ROLE_REGISTRY_OPERATIONS,
  SKILL_ROLE_REGISTRY_STATUSES,
  validateSkillRoleRegistryForm,
} from './superAdminSkillRoleRegistry.constants.js'

const buildValidForm = (overrides = {}) => ({
  roleKey: 'VALIDATOR',
  label: 'Validator',
  description: 'Evaluates correctness or completeness of state.',
  status: SKILL_ROLE_REGISTRY_STATUSES.ACTIVE,
  category: SKILL_ROLE_REGISTRY_CATEGORIES.EXECUTION_ROLE,
  allowedOperations: [SKILL_ROLE_REGISTRY_OPERATIONS.READ],
  allowedReadScopes: ['*'],
  allowedWriteScopes: [],
  ...overrides,
})

describe('validateSkillRoleRegistryForm', () => {
  it('requires core skill-role metadata', () => {
    const errors = validateSkillRoleRegistryForm(buildValidForm({
      roleKey: '',
      label: '',
      description: '',
      status: '',
      category: '',
      allowedOperations: [],
    }))

    expect(errors).toEqual({
      roleKey: 'Role key is required.',
      label: 'Label is required.',
      description: 'Description is required.',
      status: 'Status is required.',
      category: 'Category is required.',
      allowedOperations: 'At least one operation is required.',
    })
  })

  it('rejects invalid role-key tokens', () => {
    const errors = validateSkillRoleRegistryForm(buildValidForm({ roleKey: '1_INVALID' }))

    expect(errors.roleKey).toBe('Role key must use uppercase letters, numbers, or underscores.')
  })

  it('accepts valid role-key tokens before payload normalization', () => {
    const errors = validateSkillRoleRegistryForm(buildValidForm({ roleKey: 'validator_2' }))

    expect(errors).toEqual({})
  })
})
