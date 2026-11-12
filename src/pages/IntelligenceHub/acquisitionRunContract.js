const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const terminal = ['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED', 'CANCELLED']
export const isTerminalAcquisitionRun = run => terminal.includes(run?.status)
const version = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 100
const anchor = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 100
export const ORIGINAL_EXTRACTION_UNCONFIRMED = 'ORIGINAL_EXTRACTION_OUTCOME_UNCONFIRMED'
export const isAcquisitionRunId = value => typeof value === 'string' && uuid.test(value)
export const isControlledAcquisitionRun = value => value?.contractVersion === 'controlled-acquisition-run.v1'
const controlledRunMatches = value => {
  const descriptor = value.controlledReplayProvenance, binding = descriptor?.binding, provenance = descriptor?.provenance
  const hash = candidate => typeof candidate === 'string' && /^sha256:[a-f0-9]{64}$/.test(candidate)
  const objectId = candidate => typeof candidate === 'string' && /^[a-f0-9]{24}$/.test(candidate)
  return binding?.contractVersion === 'controlled-replay-binding.v1'
    && binding.classification === 'CONTROLLED_SYNTHETIC_REPLAY' && binding.environment === 'DEVELOPMENT_TEST'
    && typeof binding.bindingId === 'string' && /^[a-z0-9][a-z0-9._-]{0,159}$/.test(binding.bindingId)
    && Number.isSafeInteger(binding.bindingVersion) && binding.bindingVersion > 0
    && ['customerId', 'tenantId', 'runtimeInstanceId'].every(key => objectId(binding.scope?.[key]) && binding.scope[key] === value.scope?.[key])
    && objectId(binding.actorUserId) && binding.actorUserId === value.actorUserId
    && binding.revisionId === value.scope?.runtimeInstanceKey && binding.basisStateVersion === value.basisStateVersion
    && ['BUILD_EVIDENCE_PACK', 'REFRESH_EVIDENCE_PACK'].includes(value.actionKey)
    && provenance?.contractVersion === 'controlled-replay-provenance.v1'
    && provenance.classification === 'CONTROLLED_SYNTHETIC_REPLAY' && provenance.operation === 'CONTROLLED_HTML_REPLAY_CAPTURE'
    && provenance.adapter === 'controlled-html-replay-v1' && hash(provenance.bindingDigest)
    && provenance.bindingId === binding.bindingId && provenance.bindingVersion === binding.bindingVersion
    && typeof binding.fixture?.fixtureId === 'string' && binding.fixture.fixtureId.length > 0
    && Number.isSafeInteger(binding.fixture.fixtureVersion) && binding.fixture.fixtureVersion > 0
    && ['fixtureFileSha256', 'htmlSha256'].every(key => /^[a-f0-9]{64}$/.test(binding.fixture[key]))
    && typeof binding.fixture.sourceUrl === 'string' && binding.fixture.sourceUrl.length > 0
    && ['fixtureId', 'fixtureVersion', 'fixtureFileSha256', 'htmlSha256', 'sourceUrl'].every(key => provenance[key] === binding.fixture[key])
}
export const readAcquisitionRun = (value, scope, requestKey) => {
  const controlled = isControlledAcquisitionRun(value)
  // The server verifies signed receipts. Client checks bind the recorded DTO to
  // this exact read; they do not independently verify fixture bytes or authority.
  if ((!controlled && value?.contractVersion !== 'acquisition-run.v1') || !isAcquisitionRunId(value.runId)
    || !isAcquisitionRunId(value.requestKey) || requestKey && value.requestKey !== requestKey
    || (value.scope?.runtimeInstanceKey !== scope.runtimeInstanceId
      && (!/^[a-f0-9]{24}$/i.test(scope.runtimeInstanceId) || value.scope?.runtimeInstanceId !== scope.runtimeInstanceId))
    || value.scope?.customerId !== scope.customerId || value.scope?.tenantId !== scope.tenantId
    || !['QUEUED', 'RUNNING', ...terminal].includes(value.status)
    || !version(value.basisStateVersion)
    || value.predecessorRunId !== undefined && !isAcquisitionRunId(value.predecessorRunId)
    || value.executionAttemptId !== undefined && !isAcquisitionRunId(value.executionAttemptId)
    || value.predecessorExecutionAttemptId !== undefined && (!controlled || !value.researchConfiguration || !isAcquisitionRunId(value.predecessorExecutionAttemptId))
    || controlled && value.researchConfiguration && Boolean(value.predecessorRunId) !== Boolean(value.predecessorExecutionAttemptId)
    || value.currency !== undefined && (!['CURRENT_OUTPUT', 'HISTORICAL_OUTPUT', 'ACTIVE'].includes(value.currency)
      || (value.currency === 'ACTIVE') === terminal.includes(value.status))
    || (controlled ? !controlledRunMatches(value) : value.controlledReplayProvenance !== undefined)) return null
  const cancellation = value.cancellation
  if (cancellation !== undefined) {
    const saved = value.researchConfiguration
    if (!controlled || typeof cancellation?.eligible !== 'boolean' || !isAcquisitionRunId(cancellation.executionAttemptId)
      || !isAcquisitionRunId(saved?.configurationVersion) || !/^sha256:[a-f0-9]{64}$/.test(saved?.configurationHash)
      || !/^[a-f0-9]{24}$/.test(saved?.saveAuditId) || saved.basisStateVersion !== value.basisStateVersion
      || saved.basisUpdatedAt !== value.basisUpdatedAt
      || ['customerId', 'tenantId', 'runtimeInstanceId', 'runtimeInstanceKey'].some(key => saved.scope?.[key] !== value.scope?.[key])
      || cancellation.eligible && terminal.includes(value.status)) return null
  }
  if (value.status === 'CANCELLED' && (!controlled || !cancellation || cancellation.eligible !== false
    || !['QUEUED', 'RUNNING'].includes(cancellation.stage) || cancellation.workerStopConfirmed !== false
    || value.reason !== 'CANCELLED_BEFORE_SAVE'
    || cancellation.stage === 'QUEUED' && (value.startedAt !== undefined || value.audit?.startId !== undefined)
    || cancellation.stage === 'RUNNING' && (!value.startedAt || !anchor(value.audit?.startId)))) return null
  if (!terminal.includes(value.status)) return typeof value.recovery === 'string' && value.recovery.length <= 512 ? value : null
  if (typeof value.canonicalSaved !== 'boolean' || value.canonicalSaved && (!version(value.outputStateVersion) || !anchor(value.audit?.saveId))
    || !value.canonicalSaved && value.outputStateVersion != null
    || !value.canonicalSaved && value.audit?.saveId != null
    || value.currency === 'CURRENT_OUTPUT' && !value.canonicalSaved
    || !value.canonicalSaved && !['FAILED', 'CANCELLED'].includes(value.status) || !Array.isArray(value.outcomes)
    || value.outcomes.length < 1 || value.outcomes.length > 16
    || value.outcomes.some(item => !(controlled ? ['CONTROLLED'] : ['BRIEF', 'WEBSITE', 'DOCUMENT']).includes(item?.kind)
      || !Number.isSafeInteger(item.inputIndex) || item.inputIndex < 0
      || !['SUCCEEDED', 'FAILED', 'UNATTEMPTED', 'CANCELLED'].includes(item.status)
      || (item.status === 'CANCELLED') !== (value.status === 'CANCELLED')
      || item.status === 'CANCELLED' && (item.reason !== 'CANCELLED_BEFORE_SAVE' || item.sourceId || item.contentHash)
      || !Number.isSafeInteger(item.evidenceObjectCount) || item.evidenceObjectCount < 0
      || item.status !== 'SUCCEEDED' && item.evidenceObjectCount !== 0)
    || !anchor(value.audit?.admissionId) || !(value.status === 'CANCELLED' && cancellation.stage === 'QUEUED') && !anchor(value.audit?.startId) || !anchor(value.audit?.terminalId)) return null
  const counts = new Map()
  for (const item of value.outcomes) {
    const index = counts.get(item.kind) || 0
    if (item.inputIndex !== index || index >= (['BRIEF', 'CONTROLLED'].includes(item.kind) ? 1 : item.kind === 'WEBSITE' ? 10 : 5)) return null
    counts.set(item.kind, index + 1)
    if (item.kind !== 'BRIEF' && item.status === 'SUCCEEDED'
      && (typeof item.sourceId !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(item.sourceId))) return null
  }
  if (controlled ? counts.get('CONTROLLED') !== 1 || value.outcomes.length !== 1 : counts.get('BRIEF') !== 1) return null
  if (value.reason === 'STOPPED_WORKER_RECOVERY' || value.outcomes.some(item => item.reason === ORIGINAL_EXTRACTION_UNCONFIRMED)) {
    if (value.reason !== 'STOPPED_WORKER_RECOVERY' || value.status !== 'FAILED' || value.canonicalSaved !== false
      || value.outcomes.some(item => item.status !== 'FAILED' || item.reason !== ORIGINAL_EXTRACTION_UNCONFIRMED
        || item.evidenceObjectCount !== 0 || item.sourceId || item.contentHash)) return null
  }
  if (value.canonicalSaved) {
    const all = value.outcomes.every(item => item.status === 'SUCCEEDED'), some = value.outcomes.some(item => item.status === 'SUCCEEDED')
    if (value.status !== (all ? 'SUCCEEDED' : some ? 'PARTIALLY_SUCCEEDED' : 'FAILED')) return null
  }
  return value
}
export const acquisitionRunFromResponse = (response, scope, requestKey) => readAcquisitionRun(
  response?.data?.acquisitionRun || response?.acquisitionRun, scope, requestKey)
export const acquisitionRunFromError = (error, scope, requestKey) => readAcquisitionRun(
  error?.data?.error?.details?.acquisitionRun || error?.details?.acquisitionRun, scope, requestKey)
export const acquisitionRunLabel = run => `${run.status.replaceAll('_', ' ')} · ${run.canonicalSaved === true ? 'Revision saved' : run.canonicalSaved === false ? 'Revision not saved' : 'Outcome unconfirmed'}`
