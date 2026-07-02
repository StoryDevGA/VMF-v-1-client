export const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  // Customer
  { value: 'CUSTOMER_CREATED', label: 'CUSTOMER_CREATED' },
  { value: 'CUSTOMER_UPDATED', label: 'CUSTOMER_UPDATED' },
  { value: 'CUSTOMER_STATUS_CHANGED', label: 'CUSTOMER_STATUS_CHANGED' },
  { value: 'CUSTOMER_ADMIN_ASSIGNED', label: 'CUSTOMER_ADMIN_ASSIGNED' },
  { value: 'CUSTOMER_ADMIN_REPLACED', label: 'CUSTOMER_ADMIN_REPLACED' },
  { value: 'CUSTOMER_ADMIN_CANONICAL_SET', label: 'CUSTOMER_ADMIN_CANONICAL_SET' },
  { value: 'CUSTOMER_ADMIN_MUTATION_BLOCKED', label: 'CUSTOMER_ADMIN_MUTATION_BLOCKED' },
  { value: 'CUSTOMER_LIMITS_CHANGED', label: 'CUSTOMER_LIMITS_CHANGED' },
  { value: 'CUSTOMER_LICENSE_CHANGED', label: 'CUSTOMER_LICENSE_CHANGED' },
  // License level
  { value: 'LICENSE_LEVEL_CREATED', label: 'LICENSE_LEVEL_CREATED' },
  { value: 'LICENSE_LEVEL_UPDATED', label: 'LICENSE_LEVEL_UPDATED' },
  // Role
  { value: 'ROLE_CREATED', label: 'ROLE_CREATED' },
  { value: 'ROLE_UPDATED', label: 'ROLE_UPDATED' },
  { value: 'ROLE_DELETED', label: 'ROLE_DELETED' },
  { value: 'ROLE_MUTATION_BLOCKED', label: 'ROLE_MUTATION_BLOCKED' },
  // Tenant
  { value: 'TENANT_CREATED', label: 'TENANT_CREATED' },
  { value: 'TENANT_UPDATED', label: 'TENANT_UPDATED' },
  { value: 'TENANT_ENABLED', label: 'TENANT_ENABLED' },
  { value: 'TENANT_DISABLED', label: 'TENANT_DISABLED' },
  { value: 'TENANT_LIMIT_REJECTED', label: 'TENANT_LIMIT_REJECTED' },
  // User
  { value: 'USER_CREATED', label: 'USER_CREATED' },
  { value: 'USER_INVITED', label: 'USER_INVITED' },
  { value: 'USER_ROLE_UPDATED', label: 'USER_ROLE_UPDATED' },
  { value: 'USER_ENABLED', label: 'USER_ENABLED' },
  { value: 'USER_DISABLED', label: 'USER_DISABLED' },
  { value: 'USER_DELETED', label: 'USER_DELETED' },
  // Bulk
  { value: 'BULK_USERS_CREATED', label: 'BULK_USERS_CREATED' },
  { value: 'BULK_USERS_UPDATED', label: 'BULK_USERS_UPDATED' },
  { value: 'BULK_USERS_DISABLED', label: 'BULK_USERS_DISABLED' },
  // VMF
  { value: 'VMF_CREATED', label: 'VMF_CREATED' },
  { value: 'VMF_UPDATED', label: 'VMF_UPDATED' },
  { value: 'VMF_DELETED', label: 'VMF_DELETED' },
  { value: 'VMF_GRANT_CREATED', label: 'VMF_GRANT_CREATED' },
  { value: 'VMF_GRANT_REVOKED', label: 'VMF_GRANT_REVOKED' },
  { value: 'VMF_LIMIT_REJECTED', label: 'VMF_LIMIT_REJECTED' },
  // Deal
  { value: 'DEAL_CREATED', label: 'DEAL_CREATED' },
  { value: 'DEAL_UPDATED', label: 'DEAL_UPDATED' },
  { value: 'DEAL_ARCHIVED', label: 'DEAL_ARCHIVED' },
  // Identity Plus
  { value: 'IDENTITY_PLUS_REGISTRATION_COMPLETE', label: 'IDENTITY_PLUS_REGISTRATION_COMPLETE' },
  { value: 'IDENTITY_PLUS_TRUST_UPDATED', label: 'IDENTITY_PLUS_TRUST_UPDATED' },
  // Governance
  { value: 'SYSTEM_VERSIONING_POLICY_UPDATED', label: 'SYSTEM_VERSIONING_POLICY_UPDATED' },
  { value: 'GOVERNANCE_OVERRIDE_APPLIED', label: 'GOVERNANCE_OVERRIDE_APPLIED' },
  { value: 'GOVERNANCE_OVERRIDE_DENIED', label: 'GOVERNANCE_OVERRIDE_DENIED' },
  { value: 'FRAMEWORK_PACKAGE_CREATED', label: 'FRAMEWORK_PACKAGE_CREATED' },
  { value: 'FRAMEWORK_PACKAGE_UPDATED', label: 'FRAMEWORK_PACKAGE_UPDATED' },
  { value: 'FRAMEWORK_PACKAGE_VALIDATED', label: 'FRAMEWORK_PACKAGE_VALIDATED' },
  { value: 'FRAMEWORK_PACKAGE_ACTIVATED', label: 'FRAMEWORK_PACKAGE_ACTIVATED' },
  { value: 'FRAMEWORK_PACKAGE_CLONED', label: 'FRAMEWORK_PACKAGE_CLONED' },
  { value: 'PACKAGE_METADATA_UPDATED', label: 'PACKAGE_METADATA_UPDATED' },
  { value: 'PACKAGE_ACCESS_UPDATED', label: 'PACKAGE_ACCESS_UPDATED' },
  { value: 'RUNTIME_ACTIVATION_COMPLETED', label: 'RUNTIME_ACTIVATION_COMPLETED' },
  { value: 'RUNTIME_DEPLOYMENT_REGISTERED', label: 'RUNTIME_DEPLOYMENT_REGISTERED' },
  { value: 'RUNTIME_INSTANCE_CREATED', label: 'RUNTIME_INSTANCE_CREATED' },
  { value: 'RUNTIME_REVISION_CREATED', label: 'RUNTIME_REVISION_CREATED' },
  { value: 'RUNTIME_ACTION_EXECUTED', label: 'RUNTIME_ACTION_EXECUTED' },
  { value: 'RUNTIME_STATE_MUTATED', label: 'RUNTIME_STATE_MUTATED' },
  { value: 'TRUTH_QUALITY_EVALUATED', label: 'TRUTH_QUALITY_EVALUATED' },
  { value: 'OUTPUT_REQUEST_CREATED', label: 'OUTPUT_REQUEST_CREATED' },
  { value: 'OUTPUT_GENERATION_COMPLETED', label: 'OUTPUT_GENERATION_COMPLETED' },
  { value: 'OUTPUT_ASSET_PUBLISHED', label: 'OUTPUT_ASSET_PUBLISHED' },
  { value: 'OUTCOME_SESSION_CREATED', label: 'OUTCOME_SESSION_CREATED' },
  { value: 'TRUTH_SIGNATURE_BOUND', label: 'TRUTH_SIGNATURE_BOUND' },
  { value: 'KNOWLEDGE_PACK_BOUND_TO_SESSION', label: 'KNOWLEDGE_PACK_BOUND_TO_SESSION' },
  { value: 'PROMPT_SUBMITTED', label: 'PROMPT_SUBMITTED' },
  { value: 'OUTCOME_RESPONSE_GENERATED', label: 'OUTCOME_RESPONSE_GENERATED' },
  { value: 'ASSET_GENERATED', label: 'ASSET_GENERATED' },
  { value: 'ASSET_PUBLISHED', label: 'ASSET_PUBLISHED' },
  { value: 'ASSET_EXPORTED', label: 'ASSET_EXPORTED' },
  { value: 'OUTCOME_DRIFT_DETECTED', label: 'OUTCOME_DRIFT_DETECTED' },
  { value: 'OUTCOME_UPDATED_FROM_NEW_TRUTH', label: 'OUTCOME_UPDATED_FROM_NEW_TRUTH' },
  { value: 'OUTCOME_KNOWLEDGE_PACK_STARTER_IMPORTED', label: 'OUTCOME_KNOWLEDGE_PACK_STARTER_IMPORTED' },
  { value: 'OUTCOME_KNOWLEDGE_PACK_VERSION_UPLOADED', label: 'OUTCOME_KNOWLEDGE_PACK_VERSION_UPLOADED' },
  { value: 'OUTCOME_KNOWLEDGE_PACK_VERSION_VALIDATED', label: 'OUTCOME_KNOWLEDGE_PACK_VERSION_VALIDATED' },
  { value: 'OUTCOME_KNOWLEDGE_PACK_VALIDATION_FAILED', label: 'OUTCOME_KNOWLEDGE_PACK_VALIDATION_FAILED' },
  { value: 'OUTCOME_KNOWLEDGE_PACK_ACTIVATED', label: 'OUTCOME_KNOWLEDGE_PACK_ACTIVATED' },
  { value: 'KNOWLEDGE_PACK_CONTENT_PREVIEWED', label: 'KNOWLEDGE_PACK_CONTENT_PREVIEWED' },
  { value: 'KNOWLEDGE_PACK_MANIFEST_CREATED', label: 'KNOWLEDGE_PACK_MANIFEST_CREATED' },
  { value: 'KNOWLEDGE_PACK_MANIFEST_UPDATED', label: 'KNOWLEDGE_PACK_MANIFEST_UPDATED' },
  { value: 'KNOWLEDGE_PACK_MANIFEST_CLONED', label: 'KNOWLEDGE_PACK_MANIFEST_CLONED' },
  { value: 'KNOWLEDGE_PACK_DEPRECATED', label: 'KNOWLEDGE_PACK_DEPRECATED' },
  { value: 'KNOWLEDGE_PACK_DISABLED', label: 'KNOWLEDGE_PACK_DISABLED' },
  { value: 'KNOWLEDGE_PACK_ROLLED_BACK', label: 'KNOWLEDGE_PACK_ROLLED_BACK' },
  { value: 'COMPONENT_CREATED', label: 'COMPONENT_CREATED' },
  { value: 'COMPONENT_UPDATED', label: 'COMPONENT_UPDATED' },
  { value: 'COMPONENT_CLONED', label: 'COMPONENT_CLONED' },
  { value: 'COMPONENT_DEPRECATED', label: 'COMPONENT_DEPRECATED' },
  { value: 'COMPONENT_LOCKED', label: 'COMPONENT_LOCKED' },
  { value: 'PACKAGE_DEPRECATED', label: 'PACKAGE_DEPRECATED' },
  { value: 'DEPENDENCY_LINKED', label: 'DEPENDENCY_LINKED' },
  { value: 'DEPENDENCY_UPDATED', label: 'DEPENDENCY_UPDATED' },
  { value: 'DEPENDENCY_IMPACT_ANALYSIS', label: 'DEPENDENCY_IMPACT_ANALYSIS' },
  { value: 'VALIDATION_STARTED', label: 'VALIDATION_STARTED' },
  { value: 'VALIDATION_PASSED', label: 'VALIDATION_PASSED' },
  { value: 'VALIDATION_FAILED', label: 'VALIDATION_FAILED' },
  { value: 'CHECKPOINT_PASSED', label: 'CHECKPOINT_PASSED' },
  { value: 'CHECKPOINT_FAILED', label: 'CHECKPOINT_FAILED' },
  { value: 'RUNTIME_VALIDATION_ALLOWED', label: 'RUNTIME_VALIDATION_ALLOWED' },
  { value: 'RUNTIME_VALIDATION_BLOCKED', label: 'RUNTIME_VALIDATION_BLOCKED' },
  { value: 'FRAMEWORK_EXECUTED', label: 'FRAMEWORK_EXECUTED' },
  { value: 'POLICY_EVALUATED', label: 'POLICY_EVALUATED' },
  { value: 'AGENT_EXECUTED', label: 'AGENT_EXECUTED' },
  { value: 'FRAMEWORK_REGISTRY_CREATED', label: 'FRAMEWORK_REGISTRY_CREATED' },
  { value: 'FRAMEWORK_REGISTRY_UPDATED', label: 'FRAMEWORK_REGISTRY_UPDATED' },
  { value: 'RUNTIME_AGENT_CREATED', label: 'RUNTIME_AGENT_CREATED' },
  { value: 'RUNTIME_AGENT_UPDATED', label: 'RUNTIME_AGENT_UPDATED' },
  { value: 'RUNTIME_AGENT_CLONED', label: 'RUNTIME_AGENT_CLONED' },
  { value: 'RUNTIME_AGENT_VALIDATED', label: 'RUNTIME_AGENT_VALIDATED' },
  { value: 'RUNTIME_AGENT_TESTED', label: 'RUNTIME_AGENT_TESTED' },
  { value: 'RUNTIME_AGENT_ACTIVATED', label: 'RUNTIME_AGENT_ACTIVATED' },
  { value: 'RUNTIME_AGENT_DISABLED', label: 'RUNTIME_AGENT_DISABLED' },
  { value: 'RUNTIME_AGENT_DEPRECATED', label: 'RUNTIME_AGENT_DEPRECATED' },
  { value: 'RUNTIME_SKILL_CREATED', label: 'RUNTIME_SKILL_CREATED' },
  { value: 'RUNTIME_SKILL_UPDATED', label: 'RUNTIME_SKILL_UPDATED' },
  { value: 'RUNTIME_SKILL_CLONED', label: 'RUNTIME_SKILL_CLONED' },
  { value: 'RUNTIME_PATH_CREATED', label: 'RUNTIME_PATH_CREATED' },
  { value: 'RUNTIME_PATH_UPDATED', label: 'RUNTIME_PATH_UPDATED' },
  { value: 'RUNTIME_PATH_CLONED', label: 'RUNTIME_PATH_CLONED' },
  { value: 'RUNTIME_PATH_DUPLICATED', label: 'RUNTIME_PATH_DUPLICATED' },
  { value: 'RUNTIME_PATH_ACTIVATED', label: 'RUNTIME_PATH_ACTIVATED' },
  { value: 'RUNTIME_PATH_DISABLED', label: 'RUNTIME_PATH_DISABLED' },
  { value: 'RUNTIME_PATH_DEPRECATED', label: 'RUNTIME_PATH_DEPRECATED' },
  { value: 'SKILL_ROLE_CREATED', label: 'SKILL_ROLE_CREATED' },
  { value: 'SKILL_ROLE_UPDATED', label: 'SKILL_ROLE_UPDATED' },
  { value: 'SKILL_ROLE_CLONED', label: 'SKILL_ROLE_CLONED' },
  { value: 'VALIDATION_REGISTRY_CREATED', label: 'VALIDATION_REGISTRY_CREATED' },
  { value: 'VALIDATION_REGISTRY_UPDATED', label: 'VALIDATION_REGISTRY_UPDATED' },
  { value: 'VALIDATION_REGISTRY_CLONED', label: 'VALIDATION_REGISTRY_CLONED' },
  { value: 'UI_CONTRACT_CREATED', label: 'UI_CONTRACT_CREATED' },
  { value: 'UI_CONTRACT_UPDATED', label: 'UI_CONTRACT_UPDATED' },
  { value: 'UI_CONTRACT_CLONED', label: 'UI_CONTRACT_CLONED' },
  { value: 'UI_CONTRACT_LOCKED', label: 'UI_CONTRACT_LOCKED' },
  { value: 'UI_CONTRACT_DEPRECATED', label: 'UI_CONTRACT_DEPRECATED' },
  { value: 'UI_CONTRACT_ARCHIVED', label: 'UI_CONTRACT_ARCHIVED' },
  { value: 'UI_CONTRACT_VALIDATION_RUN', label: 'UI_CONTRACT_VALIDATION_RUN' },
  { value: 'UI_CONTRACT_VALIDATION_FAILED', label: 'UI_CONTRACT_VALIDATION_FAILED' },
  { value: 'WORKFLOW_POLICY_CREATED', label: 'WORKFLOW_POLICY_CREATED' },
  { value: 'WORKFLOW_POLICY_UPDATED', label: 'WORKFLOW_POLICY_UPDATED' },
  { value: 'WORKFLOW_POLICY_CLONED', label: 'WORKFLOW_POLICY_CLONED' },
  { value: 'WORKFLOW_POLICY_TESTED', label: 'WORKFLOW_POLICY_TESTED' },
  // Invitations
  { value: 'INVITATION_CREATED', label: 'INVITATION_CREATED' },
  { value: 'INVITATION_SENT', label: 'INVITATION_SENT' },
  { value: 'INVITATION_SEND_FAILED', label: 'INVITATION_SEND_FAILED' },
  { value: 'INVITATION_RESENT', label: 'INVITATION_RESENT' },
  { value: 'INVITATION_REVOKED', label: 'INVITATION_REVOKED' },
  { value: 'INVITATION_EXPIRED', label: 'INVITATION_EXPIRED' },
  { value: 'INVITATION_AUTHENTICATION_SUCCEEDED', label: 'INVITATION_AUTHENTICATION_SUCCEEDED' },
  { value: 'INVITATION_AUTHENTICATION_FAILED', label: 'INVITATION_AUTHENTICATION_FAILED' },
  { value: 'INVITATION_AUTH_LINK_ACCESSED', label: 'INVITATION_AUTH_LINK_ACCESSED' },
  { value: 'ONBOARDING_TRANSACTION_FAILED', label: 'ONBOARDING_TRANSACTION_FAILED' },
  // Access & audit
  { value: 'ACCESS_DENIED', label: 'ACCESS_DENIED' },
  { value: 'AUDIT_LOG_VIEWED', label: 'AUDIT_LOG_VIEWED' },
  { value: 'DENIED_ACCESS_LOG_VIEWED', label: 'DENIED_ACCESS_LOG_VIEWED' },
  { value: 'AUDIT_RETENTION_CLEANUP', label: 'AUDIT_RETENTION_CLEANUP' },
]

export const RESOURCE_TYPE_OPTIONS = [
  { value: '', label: 'All resource types' },
  { value: 'Customer', label: 'Customer' },
  { value: 'Tenant', label: 'Tenant' },
  { value: 'User', label: 'User' },
  { value: 'VMF', label: 'VMF' },
  { value: 'Deal', label: 'Deal' },
  { value: 'Invitation', label: 'Invitation' },
  { value: 'LicenseLevel', label: 'LicenseLevel' },
  { value: 'Role', label: 'Role' },
  { value: 'AuditLog', label: 'AuditLog' },
  { value: 'SystemVersioningPolicy', label: 'SystemVersioningPolicy' },
  { value: 'FrameworkPackage', label: 'FrameworkPackage' },
  { value: 'RuntimeActivationSnapshot', label: 'RuntimeActivationSnapshot' },
  { value: 'RuntimeDeployment', label: 'RuntimeDeployment' },
  { value: 'RuntimeInstance', label: 'RuntimeInstance' },
  { value: 'RuntimeOutputAsset', label: 'RuntimeOutputAsset' },
  { value: 'RuntimeOutputRequest', label: 'RuntimeOutputRequest' },
  { value: 'OutcomeSession', label: 'OutcomeSession' },
  { value: 'OutcomeMessage', label: 'OutcomeMessage' },
  { value: 'OutcomeAsset', label: 'OutcomeAsset' },
  { value: 'KnowledgePack', label: 'KnowledgePack' },
  { value: 'KnowledgePackVersion', label: 'KnowledgePackVersion' },
  { value: 'KnowledgePackActivation', label: 'KnowledgePackActivation' },
  { value: 'KnowledgePackManifest', label: 'KnowledgePackManifest' },
  { value: 'RuntimeAgent', label: 'RuntimeAgent' },
  { value: 'RuntimeSkill', label: 'RuntimeSkill' },
  { value: 'RuntimePathRegistry', label: 'RuntimePathRegistry' },
  { value: 'SkillRole', label: 'SkillRole' },
  { value: 'ValidationRegistry', label: 'ValidationRegistry' },
  { value: 'UIContract', label: 'UIContract' },
  { value: 'WorkflowPolicy', label: 'WorkflowPolicy' },
  { value: 'FrameworkRegistry', label: 'FrameworkRegistry' },
]

export const SYSTEM_EVENT_OPTIONS = [
  { value: '', label: 'All audit layers' },
  { value: 'true', label: 'System governance only' },
  { value: 'false', label: 'User activity only' },
]

export const SYSTEM_EVENT_TYPE_OPTIONS = [
  { value: '', label: 'All system events' },
  { value: 'COMPONENT_CREATED', label: 'COMPONENT_CREATED' },
  { value: 'COMPONENT_UPDATED', label: 'COMPONENT_UPDATED' },
  { value: 'COMPONENT_CLONED', label: 'COMPONENT_CLONED' },
  { value: 'COMPONENT_DEPRECATED', label: 'COMPONENT_DEPRECATED' },
  { value: 'COMPONENT_LOCKED', label: 'COMPONENT_LOCKED' },
  { value: 'PACKAGE_CREATED', label: 'PACKAGE_CREATED' },
  { value: 'PACKAGE_CLONED', label: 'PACKAGE_CLONED' },
  { value: 'PACKAGE_VALIDATED', label: 'PACKAGE_VALIDATED' },
  { value: 'PACKAGE_ACTIVATED', label: 'PACKAGE_ACTIVATED' },
  { value: 'PACKAGE_DEPRECATED', label: 'PACKAGE_DEPRECATED' },
  { value: 'RUNTIME_ACTIVATION_COMPLETED', label: 'RUNTIME_ACTIVATION_COMPLETED' },
  { value: 'RUNTIME_DEPLOYMENT_REGISTERED', label: 'RUNTIME_DEPLOYMENT_REGISTERED' },
  { value: 'DEPENDENCY_LINKED', label: 'DEPENDENCY_LINKED' },
  { value: 'DEPENDENCY_UPDATED', label: 'DEPENDENCY_UPDATED' },
  { value: 'DEPENDENCY_IMPACT_ANALYSIS', label: 'DEPENDENCY_IMPACT_ANALYSIS' },
  { value: 'VALIDATION_STARTED', label: 'VALIDATION_STARTED' },
  { value: 'VALIDATION_PASSED', label: 'VALIDATION_PASSED' },
  { value: 'VALIDATION_FAILED', label: 'VALIDATION_FAILED' },
  { value: 'CHECKPOINT_PASSED', label: 'CHECKPOINT_PASSED' },
  { value: 'CHECKPOINT_FAILED', label: 'CHECKPOINT_FAILED' },
  { value: 'RUNTIME_VALIDATION_ALLOWED', label: 'RUNTIME_VALIDATION_ALLOWED' },
  { value: 'RUNTIME_VALIDATION_BLOCKED', label: 'RUNTIME_VALIDATION_BLOCKED' },
  { value: 'FRAMEWORK_EXECUTED', label: 'FRAMEWORK_EXECUTED' },
  { value: 'POLICY_EVALUATED', label: 'POLICY_EVALUATED' },
  { value: 'AGENT_EXECUTED', label: 'AGENT_EXECUTED' },
]

export const EVENT_CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'COMPONENT', label: 'COMPONENT' },
  { value: 'PACKAGE', label: 'PACKAGE' },
  { value: 'DEPENDENCY', label: 'DEPENDENCY' },
  { value: 'VALIDATION', label: 'VALIDATION' },
  { value: 'RUNTIME', label: 'RUNTIME' },
]

export const EVENT_SEVERITY_OPTIONS = [
  { value: '', label: 'All severities' },
  { value: 'INFO', label: 'INFO' },
  { value: 'LOW', label: 'LOW' },
  { value: 'MEDIUM', label: 'MEDIUM' },
  { value: 'HIGH', label: 'HIGH' },
  { value: 'CRITICAL', label: 'CRITICAL' },
]

const normalizeText = (value) => {
  const text = String(value ?? '').trim()
  return text || null
}

const formatPermissionLabels = (permissions = []) =>
  Array.from(
    new Set(
      (Array.isArray(permissions) ? permissions : [])
        .map((permission) => normalizeText(permission))
        .filter(Boolean),
    ),
  )

export const humanizeAuditAction = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) return '--'

  const acronymMap = {
    api: 'API',
    gdpr: 'GDPR',
    id: 'ID',
    vmf: 'VMF',
  }

  return normalized
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((segment) => acronymMap[segment] || (segment.charAt(0).toUpperCase() + segment.slice(1)))
    .join(' ')
}

export const actorLabel = (row) => {
  if (row?.display?.actorLabel) return row.display.actorLabel
  if (row?.actorUserId?.name) return row.actorUserId.name
  if (row?.actorUserId?.email) return row.actorUserId.email
  if (typeof row?.actorUserId === 'string') return row.actorUserId
  return '--'
}

export const resourceLabel = (row) => {
  if (row?.display?.targetLabel) return row.display.targetLabel
  if (row?.display?.resourceLabel) return row.display.resourceLabel

  const resourceType = normalizeText(row?.resourceType)
  const resourceId = normalizeText(row?.resourceId)

  if (!resourceType && !resourceId) return '--'
  if (!resourceId) return resourceType
  return `${resourceType ?? 'Resource'}:${resourceId}`
}

export const auditSummaryLabel = (row) => {
  if (row?.summary) return row.summary

  const action = row?.action
  const actor = actorLabel(row) === '--' ? 'User' : actorLabel(row)
  const target = resourceLabel(row)
  const scopeLabel = normalizeText(row?.display?.scopeLabel)
  const permissionLabel = formatPermissionLabels(
    row?.display?.permissionLabels || row?.diff?.permissions || [],
  ).join(', ')

  switch (action) {
    case 'VMF_GRANT_CREATED':
      return `${actor} granted ${target} ${permissionLabel ? `${permissionLabel} ` : ''}access to ${scopeLabel || 'the VMF'}`
    case 'VMF_GRANT_REVOKED':
      return `${actor} revoked ${target}'s access to ${scopeLabel || 'the VMF'}`
    case 'USER_ENABLED':
      return `${actor} enabled ${target}`
    case 'USER_DISABLED':
      return `${actor} disabled ${target}`
    case 'USER_DELETED':
      return `${actor} deleted ${target}`
    case 'USER_CREATED':
      return `${actor} created ${target}`
    case 'USER_INVITED':
      return `${actor} invited ${target}`
    case 'USER_ROLE_UPDATED':
      if (row?.diff?.tenantVisibility && !row?.diff?.roles && !row?.diff?.customerRoles) {
        return `${actor} updated tenant visibility for ${target}`
      }
      return `${actor} updated roles for ${target}`
    case 'ACCESS_DENIED':
      if (row?.diff?.requiredPermission && row?.diff?.path) {
        return `Access denied for ${actor}: ${row.diff.requiredPermission} on ${row.diff.path}`
      }
      if (row?.diff?.requiredPermission) {
        return `Access denied for ${actor}: missing ${row.diff.requiredPermission}`
      }
      return `Access denied for ${actor}`
    default:
      return `${humanizeAuditAction(action)}: ${target}`
  }
}

export const parseIds = (value) =>
  String(value ?? '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
