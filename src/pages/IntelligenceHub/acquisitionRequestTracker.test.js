import { describe, expect, it } from 'vitest'
import { createAcquisitionRequestTracker } from './acquisitionRequestTracker.js'

const scope = { runtimeInstanceId: 'revision-a', customerId: 'customer-a', tenantId: 'tenant-a' }
const runId = '1a9b3a45-093c-4a28-8335-b3e592283711'
const receipt = (attempt, overrides = {}) => ({ data: { acquisitionRun: {
  contractVersion: 'acquisition-run.v1', runId, requestKey: attempt.operation.body.requestKey,
  scope: { ...scope, runtimeInstanceKey: scope.runtimeInstanceId }, status: 'SUCCEEDED',
  canonicalSaved: true, basisStateVersion: 'version-1', outputStateVersion: 'version-2',
  outcomes: [{ kind: 'BRIEF', inputIndex: 0, status: 'SUCCEEDED', evidenceObjectCount: 0 }],
  audit: { admissionId: 'admission', startId: 'start', terminalId: 'terminal', ...(overrides.canonicalSaved !== false ? { saveId: 'saved-audit' } : {}) }, ...overrides,
} } })
const operation = () => ({ actionKey: 'BUILD_EVIDENCE_PACK', body: { expectedUpdatedAt: 'original',
  inputs: { companyName: 'Original' }, documentSources: [{ contentBase64: 'original-document' }] } })

describe('original acquisition transport', () => {
  it('freezes original payload and key, rejects overlap and checks the identical operation', () => {
    const tracker = createAcquisitionRequestTracker(scope, 1), input = operation()
    const first = tracker.begin(input)
    input.body.inputs.companyName = 'Changed'
    expect(tracker.begin(operation())).toBeNull()
    expect(tracker.begin(null, true)).toBeNull()
    expect(tracker.settle(first, {})).toBeNull()
    tracker.release(first)
    const check = tracker.begin(null, true)
    expect(check.operation).toBe(first.operation)
    expect(check.operation.body.inputs.companyName).toBe('Original')
    expect(check.operation.body.documentSources[0].contentBase64).toBe('original-document')
    expect(check.checking).toBe(true)
  })
  it.each(['FAILED', 'PARTIALLY_SUCCEEDED'])('uses a new UUID and exact predecessor after %s', status => {
    const tracker = createAcquisitionRequestTracker(scope, 1), first = tracker.begin(operation())
    const overrides = status === 'FAILED'
      ? { status, canonicalSaved: false, outputStateVersion: null,
        outcomes: [{ kind: 'BRIEF', inputIndex: 0, status: 'FAILED', evidenceObjectCount: 0 }] }
      : { status, outcomes: [
        { kind: 'BRIEF', inputIndex: 0, status: 'SUCCEEDED', evidenceObjectCount: 0 },
        { kind: 'WEBSITE', inputIndex: 0, status: 'FAILED', evidenceObjectCount: 0 },
      ] }
    expect(tracker.settle(first, receipt(first, overrides))?.status).toBe(status)
    tracker.release(first)
    const next = tracker.begin({ ...operation(), body: { ...operation().body, expectedUpdatedAt: 'current' } })
    expect(next.operation.body.requestKey).not.toBe(first.operation.body.requestKey)
    expect(next.operation.body.predecessorRunId).toBe(runId)
  })
  it.each([
    { scope: { ...scope, runtimeInstanceKey: 'another-revision' } },
    { requestKey: runId }, { outcomes: [] },
  ])('retains uncertainty for invalid receipts %j', overrides => {
    const tracker = createAcquisitionRequestTracker(scope, 1), first = tracker.begin(operation())
    expect(tracker.settle(first, receipt(first, overrides))).toBeNull()
    tracker.release(first)
    expect(tracker.pending).toBe(first.operation)
  })
  it('accepts an exact terminal error receipt and does not clear on a generic failure', () => {
    const tracker = createAcquisitionRequestTracker(scope, 1), first = tracker.begin(operation())
    expect(tracker.settle(first, { status: 503 }, true)).toBeNull()
    tracker.release(first)
    const check = tracker.begin(null, true)
    const run = receipt(check, { status: 'FAILED', canonicalSaved: false, outputStateVersion: null,
      outcomes: [{ kind: 'BRIEF', inputIndex: 0, status: 'FAILED', evidenceObjectCount: 0 }] }).data.acquisitionRun
    expect(tracker.settle(check, { data: { error: { details: { acquisitionRun: run } } } }, true)).toBe(run)
    tracker.release(check)
    expect(tracker.pending).toBeNull()
  })
  it('keeps old completion isolated from the replacement scope or session tracker', () => {
    const original = createAcquisitionRequestTracker(scope, 1), first = original.begin(operation())
    const replacement = createAcquisitionRequestTracker(scope, 2)
    original.settle(first, receipt(first)); original.release(first)
    expect(replacement.pending).toBeNull()
    expect(replacement.begin(operation()).operation.body.predecessorRunId).toBeUndefined()
  })
  it('requires a refreshed basis after a saved receipt, without reverting the terminal receipt', () => {
    const tracker = createAcquisitionRequestTracker(scope, 1), first = tracker.begin(operation())
    tracker.settle(first, receipt(first)); tracker.release(first)
    expect(tracker.pending).toBeNull()
    expect(tracker.begin(operation())).toBeNull()
    expect(tracker.begin({ ...operation(), body: { expectedUpdatedAt: 'new basis' } })).not.toBeNull()
  })
  it('accepts the exact object ID route without confusing it with another revision', () => {
    const objectScope = { ...scope, runtimeInstanceId: '507f1f77bcf86cd799439012' }
    const tracker = createAcquisitionRequestTracker(objectScope, 1), first = tracker.begin(operation())
    expect(tracker.settle(first, receipt(first, { scope: { ...scope, runtimeInstanceKey: 'revision-a',
      runtimeInstanceId: objectScope.runtimeInstanceId } }))?.runId).toBe(runId)
  })
})
