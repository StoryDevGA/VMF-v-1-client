import { getHubPayload } from './intelligenceHubModel.js'

export async function verifyFindingDecisionReceipt(response, command, runtimeId) {
  const payload = getHubPayload(response), review = payload?.review, body = command.body
  if (!review || review.contractVersion !== 'discovery-contradiction-review-v1'
    || typeof review.reviewId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(review.reviewId)
    || review.runtimeInstanceId !== runtimeId || review.contradictionId !== command.id
    || review.requestKey !== body.requestKey || review.evidencePairHash !== body.expectedEvidencePairHash
    || review.disposition !== body.disposition || review.rationale !== body.rationale
    || review.requestExpectedUpdatedAt !== body.expectedUpdatedAt
    || !/^[a-f0-9]{24}$/.test(review.reviewedBy || '')
    || typeof review.reviewedAt !== 'string' || !Number.isFinite(Date.parse(review.reviewedAt))
    || new Date(review.reviewedAt).toISOString() !== review.reviewedAt
    || typeof review.reviewedStateVersion !== 'string' || !review.reviewedStateVersion.trim()
    || review.reviewedStateVersion !== command.stateVersion
    || !/^[a-f0-9]{64}$/.test(review.requestPayloadHash || '')
    || !globalThis.crypto?.subtle) return null
  const bytes = new TextEncoder().encode(JSON.stringify({
    contractVersion: 'discovery-contradiction-review-v1', actorUserId: review.reviewedBy,
    runtimeInstanceId: runtimeId, contradictionId: command.id,
    expectedUpdatedAt: new Date(body.expectedUpdatedAt).toISOString(),
    expectedEvidencePairHash: body.expectedEvidencePairHash, disposition: body.disposition,
    rationale: body.rationale, confirm: body.confirm,
  }))
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('')
  if (hash !== review.requestPayloadHash || payload.replay === true
    && (payload.requiresRefresh !== true || !['CURRENT', 'HISTORICAL'].includes(payload.receiptCurrentness))) return null
  return { replay: payload.replay === true, historical: payload.receiptCurrentness === 'HISTORICAL' }
}
