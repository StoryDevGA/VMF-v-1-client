const root = 'ss044-disposable-synthetic-20261013-r1'
const revisions = [
  ['6ace5ee09bd4472c6be0cb07', root],
  ['6ad4b3cab439648c0f316453', `${root}-rev-2-0f316453`],
  ['6ad715c91f39fea112115875', `${root}-rev-2-0f316453-rev-3-12115875`],
]
// Routing hints only. The server remains the authority for access and lineage.
export const controlledOutcomeRuntimeId = value => revisions.find(row => row.includes(value))?.[0] || ''

const persistedIdentity = value => typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= 180
const fingerprint = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const hasBoundArlStages = data => {
  const keys = ['FRAMEWORK_GUIDANCE', 'WORKING_DRAFT', 'ARL_MEANING_REVIEW']
  const stages = data.stages, refs = data.run.stageRefs
  if (!persistedIdentity(data.run.claimEventId) || !persistedIdentity(data.run.resultEventId)
    || !Array.isArray(stages) || stages.length !== keys.length || !Array.isArray(refs) || refs.length !== keys.length
    || new Set(stages.map(stage => stage?.stageExecutionId)).size !== keys.length) return false
  const first = stages[0]
  const bindings = ['requestId', 'planId', 'draftId', 'draftIterationId']
  if (!bindings.every(key => persistedIdentity(first?.[key])) || !fingerprint(first?.planFingerprint)) return false
  return keys.every((key, index) => {
    const stage = stages[index], ref = refs[index]
    return stage?.stageKey === key && stage.status === 'SUCCEEDED' && persistedIdentity(stage.stageExecutionId)
      && stage.runtimeInstanceId === data.scope.runtimeInstanceId && stage.customerId === data.scope.customerId
      && stage.tenantId === data.scope.tenantId && bindings.every(field => stage[field] === first[field])
      && stage.planFingerprint === first.planFingerprint
      && ref?.stageKey === key && ref.status === 'SUCCEEDED' && ref.stageExecutionId === stage.stageExecutionId
      && fingerprint(ref.materialHash)
      && ['inputFingerprint', 'outputFingerprint', 'attemptFingerprint'].every(field =>
        fingerprint(stage[field]) && ref[field] === stage[field])
  })
}
export const readControlledOutcome = ({ response, runtimeInstanceId, customerId, tenantId, stateVersion, loading, error }) => {
  const unavailable = { status: 'Unavailable', variant: 'neutral', data: null }
  if (loading) return { ...unavailable, status: 'Checking controlled run' }
  if (error) return { ...unavailable, status: 'Controlled run could not be verified' }
  const data = response?.data ?? response
  if (!data || data.classification !== 'NON_AUTHORITATIVE_SYNTHETIC_DEV_TEST'
    || data.authoritative !== false || data.normalOutputAvailable !== false || data.authorisesApproval !== false
    || data.scope?.runtimeInstanceId !== runtimeInstanceId || data.scope?.customerId !== customerId || data.scope?.tenantId !== tenantId
    || !data.basis?.basisStateVersion || (stateVersion && data.basis.basisStateVersion !== stateVersion)
    || !data.basis.snapshotId || !data.basis.membershipHash || !data.run?.status) return unavailable
  if (data.persistenceReadiness?.status !== 'READY') return { status: 'Execution unavailable', variant: 'error', data }
  if (data.run?.status === 'NOT_STARTED') return { status: 'Run not started', variant: 'neutral', data }
  if (data.run?.status === 'BLOCKED') {
    const keys = ['FRAMEWORK_GUIDANCE', 'WORKING_DRAFT', 'ARL_MEANING_REVIEW', 'OUTCOME_NARRATIVE_PLAN', 'OUTPUT_SHAPING', 'RENDERED_EXPRESSION_RL']
    const source = data.completionSource
    const present = value => typeof value === 'string' && value.trim().length > 0
    const sourceBound = source && ['claimEventId', 'resultEventId', 'workingDraftStageExecutionId', 'arlStageExecutionId'].every(key => present(source[key]))
      && present(data.run.claimEventId) && present(data.run.resultEventId) && data.sourceRun?.status === 'ARL_PASSED'
      && data.sourceRun.claimEventId === source.claimEventId && data.sourceRun.resultEventId === source.resultEventId
      && data.stages?.find(stage => stage.stageKey === 'WORKING_DRAFT')?.stageExecutionId === source.workingDraftStageExecutionId
      && data.stages?.find(stage => stage.stageKey === 'ARL_MEANING_REVIEW')?.stageExecutionId === source.arlStageExecutionId
    if (sourceBound && data.run.resultEventId && data.run.failure?.failureCode === 'SYNTHETIC_TEST_DELIVERY_HELD'
      && keys.every(key => data.stages?.filter(stage => stage.stageKey === key).length === 1
        && data.stages.find(stage => stage.stageKey === key).status === 'SUCCEEDED'
        && present(data.stages.find(stage => stage.stageKey === key).stageExecutionId))) {
      return { status: 'Synthetic quality passed; delivery held', variant: 'warning', data }
    }
    return { status: 'Run outcome unconfirmed', variant: 'neutral', data }
  }
  if (data.run?.status === 'FAILED') return { status: 'Controlled run failed', variant: 'error', data }
  if (data.run?.status === 'ARL_PASSED' && hasBoundArlStages(data)) {
    return { status: 'Synthetic ARL passed', variant: 'success', data }
  }
  return { status: 'Run outcome unconfirmed', variant: 'neutral', data }
}
