import { describe, it, expect, vi } from 'vitest'
import { buildOutcomeSuccessorPreflightQuery, buildOutcomeSuccessorConfirmationQuery, buildCreateOutcomeSuccessorQuery,
  buildOutcomeSuccessorByKeyQuery, buildOutcomeSuccessorOperationQuery, buildOutcomeSuccessorCompareQuery,
  buildReconcileOutcomeSuccessorQuery, getOutcomeSuccessorInvalidationTags, refreshSavedSuccessor, outcomeSuccessorApi } from './outcomeSuccessorApi.js'

const args = { runtimeInstanceId: '6aaaaaaaaaaaaaaaaaaaaaaa', customerId: 'customer-1', tenantId: 'tenant-1', outcomeAssetId: 'asset-1', outcomeAssetVersionId: 'historical-1' }
const versionPath = `/runtime-instances/${args.runtimeInstanceId}/outcome-studio/assets/asset-1/versions/historical-1`
describe('native successor API contract', () => {
  it('refreshes both runtime caches after a verified saved result, without invalidating unknown reads', async () => {
    const dispatch = vi.fn()
    await refreshSavedSuccessor(args, { dispatch, queryFulfilled: Promise.resolve({ data: { status: 'SUCCEEDED', target: { runtimeInstanceId: 'target-2' }, result: { draftId: 'draft', draftIterationId: 'iteration' } } }) })
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(dispatch.mock.calls[0][0])).toContain('target-2')
    expect(JSON.stringify(dispatch.mock.calls[0][0])).toContain(args.runtimeInstanceId)
    await refreshSavedSuccessor(args, { dispatch, queryFulfilled: Promise.resolve({ data: { status: 'NOT_RECORDED' } }) })
    await refreshSavedSuccessor(args, { dispatch, queryFulfilled: Promise.reject(new Error('Unknown')) })
    expect(dispatch).toHaveBeenCalledTimes(1)
  })
  it('keeps exact selected version and scope, with no inferred target', () => {
    expect(buildOutcomeSuccessorPreflightQuery(args)).toBe(`${versionPath}/successor/preflight?customerId=customer-1&tenantId=tenant-1`)
    expect(buildOutcomeSuccessorPreflightQuery({ ...args, targetRuntimeInstanceId: 'newer' })).toContain('targetRuntimeInstanceId=newer')
  })
  it('passes only the explicit confirmation/creation body supplied by the caller', () => {
    const body = { targetRuntimeInstanceId: 'newer', idempotencyKey: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }
    expect(buildOutcomeSuccessorConfirmationQuery({ ...args, body })).toEqual({ url: `${versionPath}/successor/confirmation?customerId=customer-1&tenantId=tenant-1`, method: 'POST', body })
    expect(buildCreateOutcomeSuccessorQuery({ ...args, body: { ...body, confirm: true, confirmationReceipt: 'sealed' } }).body.confirm).toBe(true)
  })
  it('checks lost-response state through GET only', () => {
    const query = buildOutcomeSuccessorByKeyQuery({ ...args, targetRuntimeInstanceId: 'newer', idempotencyKey: 'same-key' })
    expect(typeof query).toBe('string')
    expect(query).toContain('/successor/operation-by-key?')
    expect(query).toContain('idempotencyKey=same-key')
    expect(query).toContain('targetRuntimeInstanceId=newer')
  })
  it('separates passive operation/compare reads and explicit metadata reconciliation', () => {
    const operationArgs = { ...args, operationId: 'operation-1' }
    expect(buildOutcomeSuccessorOperationQuery(operationArgs)).toContain('/successor-operations/operation-1?')
    expect(buildOutcomeSuccessorCompareQuery(operationArgs)).toContain('/successor-operations/operation-1/compare?')
    expect(buildReconcileOutcomeSuccessorQuery(operationArgs).body).toEqual({})
  })
  it('invalidates both authorized source and target scopes without duplicate tags', () => {
    const tags = getOutcomeSuccessorInvalidationTags({ data: { target: { runtimeInstanceId: 'newer' } } }, null, args)
    expect(tags).toEqual(expect.arrayContaining([{ type: 'RuntimeInstance', id: args.runtimeInstanceId }, { type: 'RuntimeInstance', id: 'newer' }]))
    expect(new Set(tags.map((tag) => `${tag.type}:${tag.id}`)).size).toBe(tags.length)
  })
  it('exports all seven governed endpoint owners without a provider retry endpoint', () => {
    for (const name of ['getOutcomeSuccessorPreflight', 'confirmOutcomeSuccessor', 'createOutcomeSuccessor', 'getOutcomeSuccessorByKey', 'getOutcomeSuccessorOperation', 'getOutcomeSuccessorCompare', 'reconcileOutcomeSuccessor']) expect(outcomeSuccessorApi.endpoints[name]).toBeDefined()
    expect(outcomeSuccessorApi.endpoints.retryOutcomeSuccessor).toBeUndefined()
  })
})
