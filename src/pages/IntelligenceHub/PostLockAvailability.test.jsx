import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearTokens, setTokens } from '../../utils/tokenStorage.js'
import { lockBasisFixture } from '../../test/lockBasisFixture.js'
import PostLockAvailability, { PostLockAvailabilityDisplay } from './PostLockAvailability.jsx'

const queries = vi.hoisted(() => ({ lock: vi.fn(), operational: vi.fn() }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetRuntimeStateLockBasisQuery: (...args) => queries.lock(...args),
  useGetRuntimePostLockOperationalCapabilityQuery: (...args) => queries.operational(...args),
}))

const version = 'rsv2:123e4567-e89b-42d3-a456-426614174000'
const scope = { runtimeInstanceId: '1'.repeat(24), customerId: '2'.repeat(24), tenantId: '3'.repeat(24) }
const runtime = { id: scope.runtimeInstanceId, runtimeInstanceKey: 'revision-key', customerId: scope.customerId,
  tenantId: scope.tenantId, stateVersion: version, packageId: '4'.repeat(24), packageVersion: 'v1' }
let lock, response, lockFlags, operationalFlags

function fixture(eligible = false) {
  const raw = lockBasisFixture()
  Object.assign(raw.control, runtime, { revision: { revisionNumber: 2 } })
  Object.assign(raw.lockBasis.replay.anchor, { runtimeInstanceId: runtime.id, runtimeInstanceKey: runtime.runtimeInstanceKey })
  raw.lockBasis.frozenInventory = { available: true, completeness: 'VERIFIED', reason: null,
    contractVersion: 'runtime-evidence-membership.v1', snapshotId: 'evidence_snapshot_123e4567-e89b-42d3-a456-426614174002',
    membershipHash: 'c'.repeat(64), basisStateVersion: version, lockSnapshotId: raw.lockBasis.snapshot.snapshotId,
    lockSnapshotHash: 'a'.repeat(64), revisionNumber: 2, counts: { sources: 8, evidence: 47, sections: 6 },
    verification: { basis: 'EXACT_PERSISTED_MEMBERSHIP', materialHashAlgorithm: 'sha256-canonical-json-housekeeping-excluded.v1', auditLinkVerified: true } }
  const binding = { ...scope, runtimeInstanceKey: runtime.runtimeInstanceKey, revisionNumber: 2,
    basisStateVersion: version, evidenceSnapshotId: raw.lockBasis.frozenInventory.snapshotId,
    membershipHash: 'c'.repeat(64), lockSnapshotId: raw.lockBasis.snapshot.snapshotId, lockSnapshotHash: 'a'.repeat(64),
    packageId: runtime.packageId, packageVersion: runtime.packageVersion, dependencySnapshotId: 'dependency-1',
    dependencySnapshotHash: 'd'.repeat(64), policyHash: 'e'.repeat(64) }
  return { lock: { data: raw }, response: { data: {
    contractVersion: 'post-lock-evidence-operational-capability.v1', readAt: '2026-11-09T12:00:00.000Z', currency: 'AS_READ',
    recording: { eligibility: eligible ? 'ELIGIBLE_AS_READ' : 'BLOCKED', blockedBy: eligible ? [] : ['POST_LOCK_POLICY_NOT_RECORDED'],
      binding: eligible ? binding : null, checks: { authority: 'VMF_UPDATE_VERIFIED', isolation: 'CLEAR', frozenBasis: 'VERIFIED',
        policy: eligible ? 'VERIFIED' : 'NOT_RECORDED', storageIndexes: eligible ? 'VERIFIED_AS_WRITER' : 'NOT_CHECKED' } },
    impact: { eligibility: 'ITEM_REQUIRED' }, admission: { eligibility: 'ITEM_REQUIRED' },
    execution: { mode: 'EXPLICIT_SUBMIT_REQUIRED', recheck: 'SERVER_RECHECKS_ON_SUBMIT', indexRead: 'OUTSIDE_TRANSACTION_NOT_ATOMIC', submissionMaterial: 'NOT_CHECKED' },
  }, meta: { version: 'v1' } } }
}

const props = () => ({ scope, renderer: { runtimeInstance: runtime, revision: { revisionNumber: 2 } },
  contextKey: 'root:selected-revision', route: 'view=context', canRead: true })
const tree = overrides => <PostLockAvailability {...props()} {...overrides} />
const region = () => screen.getByRole('status', { name: 'Post-lock evidence availability' })
const expectUnknown = () => {
  expect(region()).toHaveTextContent('could not be verified')
  expect(region()).not.toHaveTextContent('no recorded post-lock policy')
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
}

beforeEach(() => {
  clearTokens(); vi.clearAllMocks()
  ;({ lock, response } = fixture())
  lockFlags = {}; operationalFlags = {}
  queries.lock.mockImplementation((args, options) => ({ currentData: options.skip ? undefined : lock,
    originalArgs: args, isSuccess: !options.skip, isUninitialized: options.skip, ...lockFlags }))
  queries.operational.mockImplementation((args, options) => ({ currentData: options.skip ? undefined : response,
    originalArgs: args, isSuccess: !options.skip, isUninitialized: options.skip, ...operationalFlags }))
})

describe('current scoped availability', () => {
  it('shows the actual known blocker without enabling any operation', () => {
    render(tree())
    expect(region()).toHaveTextContent('Post-lock submission unavailable')
    expect(region()).toHaveTextContent('no recorded post-lock policy')
    expect(region()).toHaveTextContent('This screen does not submit evidence')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(queries.operational.mock.calls.at(-1)[1].skip).toBe(false)
  })

  it('qualifies an eligible result as prerequisites AS_READ, with separate submission checks', () => {
    ;({ lock, response } = fixture(true))
    render(tree())
    expect(region()).toHaveTextContent('Recording prerequisites verified for this read')
    expect(region()).toHaveTextContent('explicit evidence submission requires fresh server checks')
    expect(region()).toHaveTextContent('Impact review and successor admission require a selected evidence item')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('reports stale binding rather than claiming the eligible result matches', () => {
    ;({ lock, response } = fixture(true))
    response.data.recording.binding.membershipHash = 'f'.repeat(64)
    render(tree())
    expect(region()).toHaveTextContent('no longer matches the selected basis')
    expect(region()).not.toHaveTextContent('prerequisites verified')
  })

  it.each(['parent', 'lock', 'operational'])('hides retained reasons while %s is fetching', kind => {
    if (kind === 'lock') lockFlags.isFetching = true
    if (kind === 'operational') operationalFlags.isFetching = true
    render(tree({ loading: kind === 'parent' }))
    expect(region()).toHaveAttribute('aria-busy', 'true')
    expect(region()).toHaveTextContent('Checking post-lock recording availability')
    expect(region()).not.toHaveTextContent('no recorded post-lock policy')
  })

  it.each(['lock', 'operational'])('does not use retained data without currentData from %s', kind => {
    if (kind === 'lock') lockFlags = { data: lock, currentData: undefined }
    else operationalFlags = { data: response, currentData: undefined }
    render(tree()); expectUnknown()
  })

  it.each(['lock', 'operational'])('does not accept a departed cache owner for %s', kind => {
    const flags = { originalArgs: { runtimeInstanceId: 'departed-revision' } }
    if (kind === 'lock') lockFlags = flags
    else operationalFlags = flags
    render(tree()); expectUnknown()
  })

  it.each(['lock', 'operational'])('withholds a result with missing ownership metadata for %s', kind => {
    if (kind === 'lock') lockFlags.originalArgs = undefined
    else operationalFlags.originalArgs = undefined
    render(tree()); expectUnknown()
  })

  it.each(['lock', 'operational'])('requires a successful initialized %s read', kind => {
    const flags = { isSuccess: false, isUninitialized: true }
    if (kind === 'lock') lockFlags = flags
    else operationalFlags = flags
    render(tree())
    expect(region()).not.toHaveTextContent('no recorded post-lock policy')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it.each(['lock', 'operational'])('labels a denied %s read without server-detail leakage', kind => {
    const flags = { error: { status: 403, data: { error: { message: 'private server detail' } } } }
    if (kind === 'lock') lockFlags = flags
    else operationalFlags = flags
    render(tree())
    expect(region()).toHaveTextContent('could not be read with your current access')
    expect(region()).not.toHaveTextContent('private server detail')
    expect(region()).not.toHaveTextContent('no recorded post-lock policy')
  })

  it.each(['lock', 'operational'])('withholds a known reason after a failed %s read', kind => {
    if (kind === 'lock') lockFlags.error = { status: 503 }
    else operationalFlags.error = { status: 503 }
    render(tree()); expectUnknown()
  })

  it.each(['lock', 'operational'])('rejects malformed %s data without a legacy-message fallback', kind => {
    if (kind === 'lock') lock = { data: { ...lock.data, contractVersion: 'unknown' } }
    else response = { ...response, data: { ...response.data, unexpected: true } }
    render(tree()); expectUnknown()
  })

  it('skips reads without current parent authority', () => {
    render(tree({ canRead: false })); expectUnknown()
    expect(queries.lock.mock.calls.at(-1)[1].skip).toBe(true)
    expect(queries.operational.mock.calls.at(-1)[1].skip).toBe(true)
  })

  it('removes an eligible conclusion while its fresh read is pending', () => {
    ;({ lock, response } = fixture(true))
    const view = render(tree())
    operationalFlags.isFetching = true
    view.rerender(tree())
    expect(region()).toHaveTextContent('Checking post-lock recording availability')
    expect(region()).not.toHaveTextContent('Recording prerequisites verified for this read')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not expose a status while the screen is inactive', () => {
    render(tree({ active: false }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(queries.lock.mock.calls.at(-1)[1].skip).toBe(true)
    expect(queries.operational.mock.calls.at(-1)[1].skip).toBe(true)
  })
})

describe('retained and late response ownership', () => {
  it.each(['customer', 'tenant', 'revision', 'state', 'route', 'root'])('hides an old result after changing %s', kind => {
    const view = render(tree())
    const oldArgs = queries.operational.mock.calls.at(-1)[0]
    operationalFlags.originalArgs = oldArgs
    const next = props()
    if (kind === 'customer') next.scope = { ...scope, customerId: '5'.repeat(24) }
    if (kind === 'tenant') next.scope = { ...scope, tenantId: '6'.repeat(24) }
    if (kind === 'revision') next.scope = { ...scope, runtimeInstanceId: '7'.repeat(24) }
    if (kind === 'state') next.renderer = { ...next.renderer, runtimeInstance: { ...runtime,
      stateVersion: 'rsv2:123e4567-e89b-42d3-a456-426614174001' } }
    if (kind === 'route') next.route = 'view=context&source=other'
    if (kind === 'root') next.contextKey = 'different-root:selected-revision'
    // Keep the new parent and lock response valid. The departed operational
    // response must be rejected by ownership, not merely by a bad renderer.
    next.renderer = { ...next.renderer, runtimeInstance: { ...next.renderer.runtimeInstance,
      id: next.scope.runtimeInstanceId, customerId: next.scope.customerId, tenantId: next.scope.tenantId } }
    lock = structuredClone(lock)
    Object.assign(lock.data.control, next.renderer.runtimeInstance)
    Object.assign(lock.data.lockBasis.replay.anchor, { runtimeInstanceId: next.renderer.runtimeInstance.id })
    lock.data.lockBasis.frozenInventory.basisStateVersion = next.renderer.runtimeInstance.stateVersion
    view.rerender(<PostLockAvailability {...next} />)
    expectUnknown()
    expect(queries.operational.mock.calls.at(-1)[1].skip).toBe(false)
  })

  it.each(['replacement', 'logout'])('hides a retained result immediately after session %s', kind => {
    const view = render(tree())
    operationalFlags.originalArgs = queries.operational.mock.calls.at(-1)[0]
    act(() => { if (kind === 'logout') clearTokens()
    else setTokens({ accessToken: 'synthetic-new-session', refreshToken: 'synthetic-refresh' }) })
    view.rerender(tree())
    expectUnknown()
  })

  it('requires a new owned read after leaving and returning', () => {
    const view = render(tree())
    operationalFlags.originalArgs = queries.operational.mock.calls.at(-1)[0]
    view.rerender(tree({ active: false }))
    view.rerender(tree())
    expectUnknown()
  })

  it('does not reuse the old availability result after the frozen basis changes', () => {
    const view = render(tree())
    operationalFlags.originalArgs = queries.operational.mock.calls.at(-1)[0]
    lock = structuredClone(lock)
    lock.data.lockBasis.frozenInventory.membershipHash = 'f'.repeat(64)
    view.rerender(tree())
    expectUnknown()
  })
})

describe('shared availability presentation', () => {
  it('qualifies the separate real preparation form only for a verified eligible result', () => {
    const value = fixture(true).response.data
    const view = render(<PostLockAvailabilityDisplay model={{ state: 'VERIFIED', data: value }} checking={false} submissionEnabled />)
    expect(region()).toHaveTextContent('Inspect the supplied candidate and reason in the separate form below')
    expect(region()).not.toHaveTextContent('This screen does not submit evidence')
    view.rerender(<PostLockAvailabilityDisplay model={{ state: 'VERIFIED', data: fixture().response.data }} checking={false} submissionEnabled />)
    expect(region()).toHaveTextContent('This screen does not submit evidence')
    expect(region()).not.toHaveTextContent('Inspect the supplied candidate')
  })
})
