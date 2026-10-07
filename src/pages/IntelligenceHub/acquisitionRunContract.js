const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const terminal = ['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED']
const version = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 100
const anchor = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 100
export const isAcquisitionRunId = value => typeof value === 'string' && uuid.test(value)
export const readAcquisitionRun = (value, scope, requestKey) => {
  if (value?.contractVersion !== 'acquisition-run.v1' || !isAcquisitionRunId(value.runId)
    || !isAcquisitionRunId(value.requestKey) || requestKey && value.requestKey !== requestKey
    || (value.scope?.runtimeInstanceKey !== scope.runtimeInstanceId
      && (!/^[a-f0-9]{24}$/i.test(scope.runtimeInstanceId) || value.scope?.runtimeInstanceId !== scope.runtimeInstanceId))
    || value.scope?.customerId !== scope.customerId || value.scope?.tenantId !== scope.tenantId
    || !['QUEUED', 'RUNNING', ...terminal].includes(value.status)
    || !version(value.basisStateVersion)
    || value.predecessorRunId !== undefined && !isAcquisitionRunId(value.predecessorRunId)
    || value.currency !== undefined && (!['CURRENT_OUTPUT', 'HISTORICAL_OUTPUT', 'ACTIVE'].includes(value.currency)
      || (value.currency === 'ACTIVE') === terminal.includes(value.status))) return null
  if (!terminal.includes(value.status)) return typeof value.recovery === 'string' && value.recovery.length <= 512 ? value : null
  if (typeof value.canonicalSaved !== 'boolean' || value.canonicalSaved && (!version(value.outputStateVersion) || !anchor(value.audit?.saveId))
    || !value.canonicalSaved && value.outputStateVersion != null
    || !value.canonicalSaved && value.audit?.saveId != null
    || value.currency === 'CURRENT_OUTPUT' && !value.canonicalSaved
    || !value.canonicalSaved && value.status !== 'FAILED' || !Array.isArray(value.outcomes)
    || value.outcomes.length < 1 || value.outcomes.length > 16
    || value.outcomes.some(item => !['BRIEF', 'WEBSITE', 'DOCUMENT'].includes(item?.kind)
      || !Number.isSafeInteger(item.inputIndex) || item.inputIndex < 0
      || !['SUCCEEDED', 'FAILED', 'UNATTEMPTED'].includes(item.status)
      || !Number.isSafeInteger(item.evidenceObjectCount) || item.evidenceObjectCount < 0
      || item.status !== 'SUCCEEDED' && item.evidenceObjectCount !== 0)
    || !anchor(value.audit?.admissionId) || !anchor(value.audit?.startId) || !anchor(value.audit?.terminalId)) return null
  const counts = new Map()
  for (const item of value.outcomes) {
    const index = counts.get(item.kind) || 0
    if (item.inputIndex !== index || index >= (item.kind === 'BRIEF' ? 1 : item.kind === 'WEBSITE' ? 10 : 5)) return null
    counts.set(item.kind, index + 1)
    if (item.kind !== 'BRIEF' && item.status === 'SUCCEEDED'
      && (typeof item.sourceId !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(item.sourceId))) return null
  }
  if (counts.get('BRIEF') !== 1) return null
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
