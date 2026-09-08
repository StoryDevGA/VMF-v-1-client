import { describe, expect, it } from 'vitest'
import { mapFrameworkPackageToForm, validateFrameworkPackageForm } from './superAdminFrameworkPackages.constants.js'

describe('runtime-managed package section round trip', () => {
  it('preserves internal ownership when an administrator edits unrelated package metadata', () => {
    const section = {
      sectionKey: 'internal_packet', runtimePath: 'framework_state.sections.internal_packet', required: true,
      sectionMode: 'RUNTIME_MANAGED', runtimeRole: 'OUTPUT',
      runtimeManagedCompletion: { sourceSectionKeys: ['findings'], reasoningArtefactKeys: ['riskProof'] },
    }
    const form = mapFrameworkPackageToForm({ frameworkKey: 'VMF', frameworkName: 'Fixture',
      packageKey: 'fixture-package', packageName: 'Fixture package', version: '1.0.0', sections: [section] })
    form.description = 'Updated description'
    expect(validateFrameworkPackageForm(form).payload.sections[0]).toEqual(expect.objectContaining(section))
  })
  it('does not invent internal classification for existing customer sections', () => {
    const form = mapFrameworkPackageToForm({ sections: [{ sectionKey: 'findings', runtimePath: 'framework_state.sections.findings' }] })
    expect(form.sections[0]).not.toHaveProperty('sectionMode')
    expect(form.sections[0]).not.toHaveProperty('runtimeManagedCompletion')
  })
})
