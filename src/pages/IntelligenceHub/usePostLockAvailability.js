import { useId, useState, useSyncExternalStore } from 'react'
import { useGetRuntimeStateLockBasisQuery, useGetRuntimePostLockOperationalCapabilityQuery } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision, subscribeToSession } from '../../utils/tokenStorage.js'
import { readLockBasis, readPostLockOperationalCapability } from './lockBasisModel.js'

const ownsRead = (read, args) => read.isSuccess === true && read.isUninitialized !== true
  && read.currentData !== undefined && read.originalArgs
  && Object.keys(read.originalArgs).length === Object.keys(args).length
  && Object.keys(args).every(key => read.originalArgs[key] === args[key])

/** Current read ownership is deliberately separate from a retained submission intent. */
export default function usePostLockAvailability({ scope, renderer, contextKey, route, canRead = false, loading = false, error, active = true }) {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const instance = useId()
  const runtime = renderer?.runtimeInstance
  const stateVersion = runtime?.stateVersion
  const valid = canRead && [scope?.runtimeInstanceId, scope?.customerId, scope?.tenantId, stateVersion]
    .every(value => typeof value === 'string' && value.trim().length > 0)
    && [runtime?.id, runtime?.runtimeInstanceKey].includes(scope.runtimeInstanceId)
    && runtime.customerId === scope.customerId && runtime.tenantId === scope.tenantId
  const parentKey = JSON.stringify([contextKey, route, scope, sessionRevision, stateVersion, runtime?.id,
    runtime?.runtimeInstanceKey, runtime?.packageId, runtime?.packageVersion, runtime?.dependencyLockId,
    runtime?.evidence?.dependencySnapshotHash, renderer?.revision?.revisionNumber, active, valid, loading, Boolean(error)])
  const [parentFrame, setParentFrame] = useState({ key: parentKey, epoch: 1 })
  if (parentFrame.key !== parentKey) setParentFrame({ key: parentKey, epoch: parentFrame.epoch + 1 })
  const queryScope = { runtimeInstanceId: scope?.runtimeInstanceId, customerId: scope?.customerId, tenantId: scope?.tenantId }
  const lockArgs = { ...queryScope, sessionRevision, stateVersion, contextKey, route, frameKey: `${instance}:lock:${parentFrame.epoch}` }
  const lockSkip = !active || !valid || loading || Boolean(error)
  const lockRead = useGetRuntimeStateLockBasisQuery(lockArgs, { skip: lockSkip, refetchOnMountOrArgChange: true })
  const lockLoading = !lockSkip && Boolean(lockRead.isLoading || lockRead.isFetching || lockRead.isUninitialized)
  const lockOwned = !lockSkip && ownsRead(lockRead, lockArgs) && getSessionRevision() === sessionRevision
  const lockBasis = readLockBasis({ response: lockOwned ? lockRead.currentData : undefined,
    scope: queryScope, stateVersion, loading: lockLoading, error: !lockSkip && lockRead.error })
  const basisKey = JSON.stringify([lockBasis?.available, lockBasis?.reason, lockBasis?.snapshot?.snapshotId,
    lockBasis?.snapshot?.snapshotHash, lockBasis?.frozenInventory?.snapshotId, lockBasis?.frozenInventory?.membershipHash,
    lockBasis?.frozenInventory?.basisStateVersion])
  const operationalKey = JSON.stringify([parentKey, parentFrame.epoch, basisKey, lockLoading, lockOwned, Boolean(lockRead.error)])
  const [operationalFrame, setOperationalFrame] = useState({ key: operationalKey, epoch: 1 })
  if (operationalFrame.key !== operationalKey) setOperationalFrame({ key: operationalKey, epoch: operationalFrame.epoch + 1 })
  const operationalArgs = { ...queryScope, sessionRevision, stateVersion, contextKey, route, basisKey,
    frameKey: `${instance}:availability:${operationalFrame.epoch}` }
  const operationalSkip = lockSkip || lockLoading || !lockOwned || Boolean(lockRead.error) || !lockBasis
  const operationalRead = useGetRuntimePostLockOperationalCapabilityQuery(operationalArgs,
    { skip: operationalSkip, refetchOnMountOrArgChange: true })
  const checking = Boolean(active && (loading || lockLoading || !operationalSkip
    && (operationalRead.isLoading || operationalRead.isFetching || operationalRead.isUninitialized)))
  const model = readPostLockOperationalCapability({ response: operationalRead.currentData, scope: queryScope,
    renderer, lockBasis, stateVersion, loading: checking,
    error: error || (!lockSkip && lockRead.error) || (!operationalSkip && operationalRead.error),
    owned: !operationalSkip && getSessionRevision() === sessionRevision && Boolean(ownsRead(operationalRead, operationalArgs)) })
  const ownershipKey = JSON.stringify([operationalKey, operationalFrame.epoch, model])
  return { model, checking, active, ownershipKey, lockBasis }
}
