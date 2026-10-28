const PREFIX = 'vmf_outcome_successor:'
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const bounded = (value) => typeof value === 'string' && value.length > 0 && value.length <= 180
export const outcomeSuccessorIntentKey = ({ actorId, customerId, tenantId, runtimeInstanceId, outcomeAssetId }) => {
  const values = [actorId, customerId, tenantId, runtimeInstanceId, outcomeAssetId]
  if (!values.every(bounded)) throw new Error('The signed-in source scope could not be verified.')
  return `${PREFIX}${values.map(encodeURIComponent).join(':')}`
}
export const readOutcomeSuccessorIntent = (storage, key) => {
  let stored
  try { stored = storage.getItem(key) } catch {
    throw new Error('This browser could not read the saved action for recovery. Check the saved result before proceeding.')
  }
  let parsed
  try { parsed = JSON.parse(stored) } catch { return null }
  if (!parsed || !UUID.test(parsed.idempotencyKey) || !bounded(parsed.outcomeAssetVersionId)
    || !bounded(parsed.targetRuntimeInstanceId) || typeof parsed.submitted !== 'boolean'
    || (parsed.operationId !== undefined && !bounded(parsed.operationId))) return null
  return {
    idempotencyKey: parsed.idempotencyKey, outcomeAssetVersionId: parsed.outcomeAssetVersionId,
    targetRuntimeInstanceId: parsed.targetRuntimeInstanceId, submitted: parsed.submitted,
    ...(parsed.operationId ? { operationId: parsed.operationId } : {}),
  }
}
export const writeOutcomeSuccessorIntent = (storage, key, intent) => {
  const safe = {
    idempotencyKey: intent.idempotencyKey, outcomeAssetVersionId: intent.outcomeAssetVersionId,
    targetRuntimeInstanceId: intent.targetRuntimeInstanceId, submitted: intent.submitted,
    ...(intent.operationId ? { operationId: intent.operationId } : {}),
  }
  if (!UUID.test(safe.idempotencyKey) || !bounded(safe.outcomeAssetVersionId) || !bounded(safe.targetRuntimeInstanceId)
    || typeof safe.submitted !== 'boolean') throw new Error('A safe recovery identity could not be verified.')
  const previous = readOutcomeSuccessorIntent(storage, key)
  if (previous?.submitted && ['idempotencyKey', 'outcomeAssetVersionId', 'targetRuntimeInstanceId'].some((field) => previous[field] !== safe[field])) {
    throw new Error('Retrieve the existing action before changing its preserved version or target.')
  }
  try {
    storage.setItem(key, JSON.stringify(safe))
    if (storage.getItem(key) !== JSON.stringify(safe)) throw new Error('Storage verification failed')
  } catch { throw new Error('This browser could not save the action for recovery. Check the saved result before proceeding.') }
  return safe
}
export const createOutcomeSuccessorIntent = ({ outcomeAssetVersionId, targetRuntimeInstanceId }, uuid = () => crypto.randomUUID()) => ({
  idempotencyKey: uuid(), outcomeAssetVersionId, targetRuntimeInstanceId, submitted: false,
})
