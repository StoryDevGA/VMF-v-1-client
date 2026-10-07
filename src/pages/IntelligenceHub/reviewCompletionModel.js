import { getHubPayload } from './intelligenceHubModel.js'

export function readCompletion(response, scope) {
  const value = getHubPayload(response)
  if (value?.contractVersion !== 'intelligence-review-completion.v1'
    || value.scope?.customerId !== scope.customerId || value.scope?.tenantId !== scope.tenantId
    || ![value.scope?.runtimeInstanceKey, value.scope?.runtimeInstanceId].includes(scope.runtimeInstanceId)
    || value.scope?.rootRuntimeInstanceKey !== scope.workspaceId
    || value.population?.completeness !== 'COMPLETE' || !/^[a-f0-9]{64}$/.test(value.population?.hash || '')
    || ![value.population.pendingEvidence, value.population.pendingFindings, value.population.decisionCount]
      .every(number => Number.isSafeInteger(number) && number >= 0)) return null
  return value
}

