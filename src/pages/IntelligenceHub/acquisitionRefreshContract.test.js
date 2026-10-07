import { describe, expect, it, vi } from 'vitest'
import { verifyAcquisitionRefresh, refreshAcquisitionScope } from './acquisitionRefreshContract.js'
const scope={workspaceId:'root-1',revisionId:'revision-1',customerId:'customer-1',tenantId:'tenant-1'}
const control={id:'revision-1',runtimeInstanceKey:'revision-1',customerId:'customer-1',tenantId:'tenant-1',stateVersion:'rsv2:controlled'}
const stamp='2026-10-04T10:00:00.000Z'
const success=data=>({status:'fulfilled',value:{data:{data}}})
const fixture=()=>[success({runtimeInstance:{id:'revision-1',customerId:'customer-1',tenantId:'tenant-1',updatedAt:stamp},revision:{rootRuntimeInstanceKey:'root-1',lineage:[{runtimeInstanceId:'revision-1',relationship:'CURRENT'}]}}),success({contractVersion:'intelligence-review-actions.v1',control,runtimeUpdatedAt:stamp,canAcquire:true}),success({control,sourceRegistry:[],total:0}),...[1,0,1].map(total=>success({control,evidenceObjects:[],total}))]
describe('acquisition authoritative refresh',()=>{
  it.each(['throw', 'reject'])('six valid returned reads stay valid when optional summary %s fails', async mode => {
    const refreshSummary = vi.fn(() => { if (mode === 'throw') throw Error('Unsubscribed'); return Promise.reject(Error('Unavailable')) })
    const result = await refreshAcquisitionScope({ reads: fixture().map(read => () => read.value), scope,
      refreshSummary, summaryIsCurrent: () => true })
    expect(result).toBe(true); await Promise.resolve(); expect(refreshSummary).toHaveBeenCalledTimes(1)
  })
  it('deferred tab departure skips optional read while keeping six-read proof separate', async () => {
    let finish, active = true
    const deferred = new Promise(resolve => { finish = resolve })
    const fixtures = fixture(), reads = fixtures.map(read => () => read.value)
    reads[0] = () => deferred
    const refreshSummary = vi.fn()
    const pending = refreshAcquisitionScope({ reads, scope, refreshSummary, summaryIsCurrent: () => active })
    active = false; finish(fixtures[0].value)
    expect(await pending).toBe(true); await Promise.resolve(); expect(refreshSummary).not.toHaveBeenCalled()
  })
  it('verifies all six returned current scoped reads',()=>expect(verifyAcquisitionRefresh({results:fixture(),scope})).toBe(true))
  it.each([2,3,4,5])('keeps recovery blocked when read %s fails despite current metadata',index=>{const results=fixture();results[index]={status:'fulfilled',value:{error:{status:503}}};expect(verifyAcquisitionRefresh({results,scope})).toBe(false)})
  it.each([2,3,4,5])('rejects wrong version/scope in read %s',index=>{const results=fixture();results[index].value.data.data.control={...control,stateVersion:'rsv2:old',tenantId:'other'};expect(verifyAcquisitionRefresh({results,scope})).toBe(false)})
  it('permits legacy filtered empty only with uncapped same-version successful unfiltered proof',()=>{
    const results=fixture();results[4]={status:'fulfilled',value:{error:{data:{error:{code:'RUNTIME_STATE_V2_EVIDENCE_MISSING'}}}}}
    expect(verifyAcquisitionRefresh({results,scope})).toBe(true)
    results[3].value.data.data.totalCapped=true;expect(verifyAcquisitionRefresh({results,scope})).toBe(false)
  })
  it('does not infer empty when unfiltered evidence is missing',()=>{const results=fixture();results[3]={status:'fulfilled',value:{error:{data:{error:{code:'RUNTIME_STATE_V2_EVIDENCE_MISSING'}}}}};expect(verifyAcquisitionRefresh({results,scope})).toBe(false)})
  it('rejects a timestamp mismatch or failed promise',()=>{const results=fixture();results[1].value.data.data.runtimeUpdatedAt='2026-10-04T09:00:00.000Z';expect(verifyAcquisitionRefresh({results,scope})).toBe(false);results[0]={status:'rejected',reason:Error('unavailable')};expect(verifyAcquisitionRefresh({results,scope})).toBe(false)})
})
