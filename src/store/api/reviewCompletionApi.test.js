import { expect, it } from 'vitest'
import { buildReviewCompletionQuery, buildCompleteReviewQuery, runtimeInstanceApi } from './runtimeInstanceApi.js'

it('binds reads and explicit signoff to exact revision and selected scope', () => {
  const scope = { runtimeInstanceId: ' revision/one ', customerId: 'customer-one', tenantId: 'tenant-one' }
  const url = '/runtime-instances/revision%2Fone/review-completion?customerId=customer-one&tenantId=tenant-one'
  expect(buildReviewCompletionQuery(scope)).toBe(url)
  const body = { confirm: true, rationale: 'Explicit human confirmation.', requestKey: 'key', expectedPopulationHash: 'hash' }
  expect(buildCompleteReviewQuery({ ...scope, body })).toEqual({ url, method: 'POST', body })
  expect(runtimeInstanceApi.endpoints).toHaveProperty('getReviewCompletion')
  expect(runtimeInstanceApi.endpoints).toHaveProperty('completeReview')
})
