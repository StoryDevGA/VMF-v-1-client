import { describe, it, expect, vi } from 'vitest'
import { createOutcomeSuccessorIntent, outcomeSuccessorIntentKey, readOutcomeSuccessorIntent, writeOutcomeSuccessorIntent } from './outcomeSuccessorIntent.js'

const scope = { actorId: 'actor-1', customerId: 'customer-1', tenantId: 'tenant-1', runtimeInstanceId: 'runtime-1', outcomeAssetId: 'asset-1' }
const key = outcomeSuccessorIntentKey(scope)
const uuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const makeStorage = () => { const values = new Map(); return { getItem: (name) => values.get(name) ?? null, setItem: (name, value) => values.set(name, value) } }
const fresh = () => createOutcomeSuccessorIntent({ outcomeAssetVersionId: 'historical-version', targetRuntimeInstanceId: 'explicit-target' }, () => uuid)

describe('governed duplicate recovery identity', () => {
  it('isolates recovery by actor and every selected source scope', () => {
    for (const field of Object.keys(scope)) expect(outcomeSuccessorIntentKey({ ...scope, [field]: `${scope[field]}-other` })).not.toBe(key)
    expect(() => outcomeSuccessorIntentKey({ ...scope, actorId: '' })).toThrow()
  })
  it('retains the same explicit source, target and UUID across readback and reload', () => {
    const storage = makeStorage()
    writeOutcomeSuccessorIntent(storage, key, { ...fresh(), submitted: true, operationId: 'operation-1' })
    expect(readOutcomeSuccessorIntent(storage, key)).toEqual({ ...fresh(), submitted: true, operationId: 'operation-1' })
  })
  it('stores no receipt, tokens or copied source content', () => {
    const storage = makeStorage()
    writeOutcomeSuccessorIntent(storage, key, { ...fresh(), confirmationReceipt: 'private', token: 'private', markdown: 'private' })
    expect(storage.getItem(key)).not.toContain('private')
    expect(Object.keys(JSON.parse(storage.getItem(key))).sort()).toEqual(['idempotencyKey', 'outcomeAssetVersionId', 'submitted', 'targetRuntimeInstanceId'])
  })
  it('rejects changing an unknown submitted action into a new request', () => {
    const storage = makeStorage()
    writeOutcomeSuccessorIntent(storage, key, { ...fresh(), submitted: true })
    expect(() => writeOutcomeSuccessorIntent(storage, key, { ...fresh(), targetRuntimeInstanceId: 'different' })).toThrow('Retrieve the existing action')
    expect(readOutcomeSuccessorIntent(storage, key).targetRuntimeInstanceId).toBe('explicit-target')
  })
  it('allows confirmed not-recorded readback to retain the key for explicit confirmation', () => {
    const storage = makeStorage()
    writeOutcomeSuccessorIntent(storage, key, { ...fresh(), submitted: true })
    writeOutcomeSuccessorIntent(storage, key, fresh())
    expect(readOutcomeSuccessorIntent(storage, key)).toEqual(fresh())
  })
  it('ignores malformed and non-UUID stored input instead of using it as authority', () => {
    const storage = makeStorage()
    for (const value of ['{', JSON.stringify({ ...fresh(), idempotencyKey: 'bad' }), JSON.stringify({ ...fresh(), submitted: 'true' })]) {
      storage.setItem(key, value); expect(readOutcomeSuccessorIntent(storage, key)).toBeNull()
    }
  })
  it('fails closed when storage refuses or silently drops writes', () => {
    for (const storage of [{ getItem: () => null, setItem: () => { throw new Error('blocked') } }, { getItem: () => null, setItem: () => {} }]) {
      expect(() => writeOutcomeSuccessorIntent(storage, key, fresh())).toThrow('could not save')
    }
  })
  it('distinguishes an inaccessible saved action from malformed data', () => {
    expect(() => readOutcomeSuccessorIntent({ getItem: () => { throw new Error('Unavailable') } }, key)).toThrow('could not read')
  })
  it('preserves a submitted identity when the read before a write fails', () => {
    const storage = makeStorage()
    writeOutcomeSuccessorIntent(storage, key, { ...fresh(), submitted: true })
    const original = storage.getItem(key)
    const overwrite = vi.fn()
    expect(() => writeOutcomeSuccessorIntent({ getItem: () => { throw new Error('Unavailable') }, setItem: overwrite }, key, fresh())).toThrow('could not read')
    expect(overwrite).not.toHaveBeenCalled(); expect(storage.getItem(key)).toBe(original)
  })
})
