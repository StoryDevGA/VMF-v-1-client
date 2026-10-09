export const DISCOVERY_POLICY_CONTRACT_VERSION = 'framework-package-discovery-policy-v1'
export const DISCOVERY_REFERENCE_FIELDS = ['mappingKey', 'vmfCapabilityRef', 'ownerRuntime', 'resultType', 'sourceRef', 'sourceVersion', 'resultContractVersion', 'implementationRef', 'implementationVersion', 'restrictions']

// Field descriptors drive structured authoring; method identifiers remain proposals.
export const DISCOVERY_POLICY_FIELDS = {
  sourcePolicy: { allowedSourceTypes: 'list', requireSourceHash: 'true', requireAcquisitionMetadata: 'true', requireLineageReference: 'true', preserveSourceLocation: 'true', semanticExtraction: { mode: 'text', aiMayAssist: 'boolean', candidateState: 'text', admissionRequired: 'true', references: 'references' } },
  evidencePolicy: { categories: 'list', coverageAreas: 'list', confidenceLevels: 'list', materialityLevels: 'list', reviewStates: 'list', acceptedObjectTypes: 'references', ownerMappings: 'references' },
  advisoryInterpretation: { enabled: 'boolean', providerMode: 'text', outputState: 'text', reviewRequiredWhen: 'list', lenses: 'references', supportAssetReferences: 'list' },
  claimPolicy: { requireEvidenceReferences: 'true', requireClaimBoundary: 'true', unsupportedClaimsRemainRestricted: 'true', alternativeExplanationVisibility: 'boolean', nextEvidenceQuestionsEnabled: 'boolean', references: 'references' },
  contradictionPolicy: { canonicalOwner: 'CR', mustRemainVisible: 'true', resolutionRequiresGovernedReview: 'true', aiMayNotResolveByAssertion: 'true', blockingImpactIsOwnerDefined: 'true', workflowRelevanceRules: 'references' },
  sectionMapping: { mode: 'text', algorithm: 'text', requireMappingReceipt: 'true', rules: 'references' },
  readinessPolicy: { requiredSections: 'list', requiredReasoningArtefacts: 'list', requiredValidationResults: 'references', blockingContradictionRules: 'references', requiredAuthorizationDependencies: 'references', readinessEvaluations: 'references' },
  postLockDiscoveryPolicy: { enabled: 'boolean', mutateLockedRevision: 'false', allowedDispositions: 'list', references: 'references' },
  compatibility: { packageContractVersion: DISCOVERY_POLICY_CONTRACT_VERSION, minimumRuntimeCompatibilityVersion: 'text', migrationIdentity: 'text', notes: 'note' },
}

export const discoveryFieldLabel = (key) => ({
  vmfCapabilityRef: 'VMF Capability Reference', ownerRuntime: 'Semantic Owner Reference',
  resultType: 'Machine Result Contract Reference', resultContractVersion: 'Machine Result Schema Version',
  implementationRef: 'Proposed Implementation Reference', implementationVersion: 'Proposed Implementation Version',
}[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()))
export const newDiscoveryFields = (fields) => Object.fromEntries(Object.entries(fields).filter(([, type]) => type !== 'text').map(([key, type]) => [key,
  typeof type === 'object' ? newDiscoveryFields(type)
    : type === 'true' ? true : type === 'false' || type === 'boolean' ? false
      : type === 'list' || type === 'references' ? [] : type === 'text' || type === 'note' ? '' : type,
]))

export const discoveryPolicyInputError = (policy) => {
  if (policy === undefined) return ''
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return 'Discovery Policy must be an object.'
  if (policy.contractVersion !== DISCOVERY_POLICY_CONTRACT_VERSION) return 'Unsupported Discovery Policy contract version.'
  if (![policy.policyKey, policy.policyVersion].every((value) => typeof value === 'string' && value.trim() && value.trim().length <= 180)) return 'Policy key and version are required (180 characters maximum).'
  const requiredFields = { advisoryInterpretation: ['enabled'], contradictionPolicy: ['canonicalOwner', 'mustRemainVisible', 'resolutionRequiresGovernedReview', 'aiMayNotResolveByAssertion', 'blockingImpactIsOwnerDefined'], sectionMapping: ['requireMappingReceipt'], postLockDiscoveryPolicy: ['enabled', 'mutateLockedRevision'], compatibility: ['packageContractVersion'] }
  if (Object.entries(requiredFields).some(([group, required]) => policy[group] !== undefined && required.some((field) => policy[group]?.[field] === undefined))) return 'Discovery Policy is missing required group fields.'
  const extraction = policy.sourcePolicy?.semanticExtraction
  if (extraction !== undefined && extraction?.admissionRequired === undefined) return 'Semantic extraction is missing its admission requirement.'
  const check = (value, fields) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    return Object.entries(value).every(([key, item]) => {
      const type = fields[key]
      if (!type) return false
      if (typeof type === 'object') return check(item, type)
      if (type === 'text' || type === 'note') return typeof item === 'string' && item.trim().length <= (type === 'note' ? 2000 : 180) && (type === 'note' || !!item.trim())
      if (type === 'boolean') return typeof item === 'boolean'
      if (type === 'true' || type === 'false') return item === (type === 'true')
      if (type === 'list') return Array.isArray(item) && item.length <= 100 && item.every((token) => typeof token === 'string' && token.trim() && token.trim().length <= 180) && new Set(item).size === item.length
      if (type === 'references') return Array.isArray(item) && item.length <= 100 && new Set(item.map((row) => row?.mappingKey)).size === item.length && item.every((row) => check(row, Object.fromEntries(DISCOVERY_REFERENCE_FIELDS.map((field) => [field, field === 'restrictions' ? 'list' : 'text']))) && !!row.mappingKey?.trim())
      return item === type
    })
  }
  return check(policy, { contractVersion: DISCOVERY_POLICY_CONTRACT_VERSION, policyKey: 'text', policyVersion: 'text', label: 'text', ...DISCOVERY_POLICY_FIELDS }) ? '' : 'Discovery Policy contains an invalid field or value.'
}
