import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import DiscoveryPolicyPanel from './DiscoveryPolicyPanel.jsx'
import { DISCOVERY_POLICY_CONTRACT_VERSION, discoveryPolicyInputError } from './discoveryPolicyFields.js'
import { cloneFrameworkPackage, mapFrameworkPackageToForm, validateFrameworkPackageForm } from '../SuperAdminFrameworkPackages/superAdminFrameworkPackages.constants.js'

const policy = () => ({ contractVersion: DISCOVERY_POLICY_CONTRACT_VERSION, policyKey: 'discovery-test', policyVersion: '1.0.0', evidencePolicy: { categories: ['proposal'], ownerMappings: [{ mappingKey: 'evidence', vmfCapabilityRef: 'proposal', ownerRuntime: 'proposal', resultType: 'proposal' }] }, postLockDiscoveryPolicy: { enabled: true, mutateLockedRevision: false, allowedDispositions: ['proposal'] } })

function EditablePolicy({ initial, onChange }) {
  const [value, setValue] = useState(initial)
  return <DiscoveryPolicyPanel value={value} onChange={(next) => { setValue(next); onChange(next) }} />
}

describe('Discovery Policy structured authoring', () => {
  it('configures imported optional extraction with the required admission boundary before editing', () => {
    const initial = { ...policy(), sourcePolicy: { allowedSourceTypes: ['DOCUMENT'] } }
    const onChange = vi.fn()
    render(<EditablePolicy initial={initial} onChange={onChange} />)
    expect(screen.queryByLabelText('Admission Required')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Configure Semantic Extraction' }))
    expect(screen.getByLabelText('Admission Required')).toBeChecked()
    expect(screen.getByLabelText('Admission Required')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Mode'), { target: { value: 'bounded' } })
    const next = onChange.mock.calls.at(-1)[0]
    expect(next.sourcePolicy.semanticExtraction).toMatchObject({ mode: 'bounded', admissionRequired: true })
    expect(next.sourcePolicy.allowedSourceTypes).toEqual(['DOCUMENT'])
    expect(discoveryPolicyInputError(next)).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Remove Semantic Extraction' }))
    expect(onChange.mock.calls.at(-1)[0].sourcePolicy).toEqual(initial.sourcePolicy)
    expect(initial.sourcePolicy).not.toHaveProperty('semanticExtraction')
  })
  it.each(['Source Policy', 'Readiness Policy', 'Compatibility'])('can undo configured %s on a draft without removing other policy fields', (label) => {
    const initial = policy()
    const onChange = vi.fn()
    render(<EditablePolicy initial={initial} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: `Configure ${label}` }))
    expect(onChange.mock.calls.at(-1)[0]).not.toEqual(initial)
    fireEvent.click(screen.getByRole('button', { name: `Remove ${label}` }))
    const reverted = onChange.mock.calls.at(-1)[0]
    expect(reverted).toEqual(initial)
    expect(discoveryPolicyInputError(reverted)).toBe('')
    const { payload } = validateFrameworkPackageForm(mapFrameworkPackageToForm({ discoveryPolicy: reverted }))
    expect(payload.discoveryPolicy).toEqual(initial)
  })
  it('keeps configured group removal disabled on a read-only package', () => {
    const onChange = vi.fn()
    render(<DiscoveryPolicyPanel value={policy()} disabled onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Evidence Policy' }))
    expect(screen.getByRole('button', { name: 'Remove Evidence Policy' })).toBeDisabled()
    expect(onChange).not.toHaveBeenCalled()
  })
  it('separates saved provisional bindings from unresolved references and authored fields', () => {
    const onChange = vi.fn()
    render(<DiscoveryPolicyPanel value={policy()} onChange={onChange} summary={{
      resolvedReferences: [{ path: 'discoveryPolicy.evidencePolicy.ownerMappings.0', semanticTarget: {
        capability: 'VE02', owner: 'VE02 / Bundle 02', resultContract: 'VMF.VE02.EvidenceAssessmentResult', schemaVersion: '1.0',
        localProducerBinding: { implementationRef: 'validation-evidence-quality-check', implementationVersion: 'storylineos-ve02-local-assessor-v1',
          decisionRef: 'gary-storylineos-ve02-provisional-2026-10-09', installedVersionId: 'installed-composition', bindingHash: 'verified-binding' },
      } }], unresolvedReferences: [{ path: 'discoveryPolicy.claimPolicy.references.0', question: 'Unknown claim mapping remains unresolved.' }],
    }} />)
    expect(screen.getByText('Saved locally verified references (1)')).toBeInTheDocument()
    expect(screen.getByText(/VMF producer certification remains unverified/)).toBeInTheDocument()
    expect(screen.getByText(/Local assessor:/)).toHaveTextContent('storylineos-ve02-local-assessor-v1')
    expect(screen.getByText(/Unknown claim mapping remains unresolved/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Policy key/i), { target: { value: 'unsaved-edit' } })
    expect(onChange.mock.calls.at(-1)[0]).not.toHaveProperty('resolvedReferences')
    expect(onChange.mock.calls.at(-1)[0]).not.toHaveProperty('discoveryPolicySummary')
  })
  it('keeps verified consumption distinct from assessment-producer authority', () => {
    render(<DiscoveryPolicyPanel value={policy()} onChange={vi.fn()} summary={{ unresolvedReferences: [{
      path: 'discoveryPolicy.evidencePolicy.ownerMappings.0', question: 'Producer conformance is missing.',
      semanticTarget: { capability: 'VE02', owner: 'VE02 / Bundle 02',
        installationStatus: 'VERIFIED_ACTIVE', implementationStatus: 'UNVERIFIED',
        typedConsumer: { implementationRef: 'runtime-validation-ve02-result-consumer',
          implementationVersion: 've02-result-consumer-v1', assessmentProducerStatus: 'UNVERIFIED' } },
    }] }} />)
    fireEvent.click(screen.getByText('Saved unresolved references (1)'))
    expect(screen.getByText(/Verified typed-result consumer:/)).toHaveTextContent('Assessment producer: UNVERIFIED')
  })
  it('preserves partial references without inventing an owner or result', () => {
    const partial = { ...policy(), evidencePolicy: { ownerMappings: [{ mappingKey: 'evidence', vmfCapabilityRef: 'proposed-capability' }] } }
    expect(discoveryPolicyInputError(partial)).toBeFalsy()
    render(<DiscoveryPolicyPanel value={partial} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/Semantic owner reference/i)).toHaveValue('')
    expect(screen.getByLabelText(/Machine result contract reference/i)).toHaveValue('')
    expect(screen.getByText(/Reference 1/)).toHaveTextContent('authored fields')
  })
  it('shows legacy fallback and allows draft configuration', () => {
    const onChange = vi.fn()
    render(<DiscoveryPolicyPanel onChange={onChange} />)
    expect(screen.getByText(/Legacy fallback:/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Configure Discovery Policy' }))
    expect(onChange).toHaveBeenCalledWith({ contractVersion: DISCOVERY_POLICY_CONTRACT_VERSION, policyKey: '', policyVersion: '' })
  })
  it('displays server semantic evidence separately from unresolved execution requirements', () => {
    const semanticTarget = { capability: 'VE02', owner: 'VE02 / Bundle 02', policyBindingStatus: 'CONFIRMED',
      sourceVersion: 'Bundle 02 v1.4 / VE02RC001', resultContract: 'VMF.VE02.EvidenceAssessmentResult', schemaVersion: '1.0',
      expectedSourceHash: 'c9c1b6e824af3f97177129dcf9a4ee5e1a3a9ab55976a32db095febda5ac4cf4',
      sourceVerificationStatus: 'VERIFIED', installationStatus: 'NOT_INSTALLED',
      machineContractStatus: 'SOURCE_VERIFIED', implementationStatus: 'UNVERIFIED', restriction: 'Evidence-quality assessment only.' }
    render(<DiscoveryPolicyPanel value={policy()} onChange={vi.fn()} summary={{ unresolvedReferences: [{ path: 'discoveryPolicy.evidencePolicy.ownerMappings.0', question: 'Verify successor source bytes.', semanticTarget }] }} />)
    expect(screen.getByText('Supported semantic target — VE02')).toBeInTheDocument()
    expect(screen.getByText(/Machine result contract: SOURCE_VERIFIED. Implementation: UNVERIFIED/)).toBeInTheDocument()
    expect(screen.getByText(/Owner: VE02 \/ Bundle 02. Policy source binding: CONFIRMED/)).toBeInTheDocument()
    expect(screen.getByText(/Owner-announced result contract: VMF.VE02.EvidenceAssessmentResult \/ 1.0/)).toBeInTheDocument()
    expect(screen.getByText(/Source verification: VERIFIED. Installation: NOT_INSTALLED/)).toBeInTheDocument()
    expect(screen.getByText(/Verify successor source bytes\./)).toBeInTheDocument()
  })
  it('renders read-only references and fixed post-lock boundary', () => {
    render(<DiscoveryPolicyPanel value={policy()} disabled onChange={vi.fn()} />)
    expect(screen.getByLabelText(/Policy key/i)).toBeDisabled()
    expect(screen.getByLabelText(/Mutate locked revision/i)).toBeDisabled()
    expect(screen.getByLabelText(/Mutate locked revision/i)).not.toBeChecked()
    expect(screen.getByLabelText(/Vmf capability ref/i)).toHaveValue('proposal')
    expect(screen.getByText(/Reference 1/)).toHaveTextContent('authored fields')
  })
  it('preserves complete groups and isolates cloned edits through hydration and payload', () => {
    const source = { frameworkKey: 'VMF', frameworkName: 'VMF', version: '1.0.0', packageKey: 'vmf-1-0-0', discoveryPolicy: policy(), uiContractKey: 'vmf-ui' }
    const clone = cloneFrameworkPackage(source)
    clone.discoveryPolicy.evidencePolicy.categories.push('clone-only')
    expect(source.discoveryPolicy.evidencePolicy.categories).toEqual(['proposal'])
    const form = mapFrameworkPackageToForm(source)
    const { payload } = validateFrameworkPackageForm(form)
    expect(payload.discoveryPolicy).toEqual(policy())
    expect(payload.uiContractKey).toBe('vmf-ui')
    expect(payload).not.toHaveProperty('discoveryPolicySummary')
    expect(validateFrameworkPackageForm(mapFrameworkPackageToForm({})).payload).not.toHaveProperty('discoveryPolicy')
  })
  it('rejects authored proof flags and malformed reference rows', () => {
    expect(discoveryPolicyInputError({ ...policy(), policyHash: 'caller' })).toBeTruthy()
    const malformed = policy()
    malformed.evidencePolicy.ownerMappings[0].verified = true
    expect(discoveryPolicyInputError(malformed)).toBeTruthy()
    expect(discoveryPolicyInputError({ ...policy(), sectionMapping: {} })).toBeTruthy()
  })
  it('allows multiple source types to be entered before blur', () => {
    const onChange = vi.fn()
    render(<DiscoveryPolicyPanel value={{ ...policy(), sourcePolicy: { allowedSourceTypes: [] } }} onChange={onChange} />)
    const input = screen.getByLabelText(/Allowed source types \(one per line\)/i)
    fireEvent.change(input, { target: { value: 'document\ninterview' } })
    fireEvent.blur(input)
    expect(onChange.mock.calls.at(-1)[0].sourcePolicy.allowedSourceTypes).toEqual(['document', 'interview'])
  })
})
