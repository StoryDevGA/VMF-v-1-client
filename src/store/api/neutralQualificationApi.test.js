import { expect, it } from 'vitest'
import { runtimeInstanceApi, buildEvidenceNeutralQualificationQuery, buildSaveEvidenceNeutralQualificationQuery,
  buildEvidenceNeutralQualificationReceiptQuery, buildEvidenceNeutralQualificationRequestQuery,
  buildEvidenceNeutralQualificationHistoryQuery, useGetEvidenceNeutralQualificationQuery,
  useSaveEvidenceNeutralQualificationMutation, useLazyGetEvidenceNeutralQualificationReceiptQuery,
  useLazyGetEvidenceNeutralQualificationRequestQuery, useGetEvidenceNeutralQualificationHistoryQuery } from './runtimeInstanceApi.js'

it('binds all qualification reads and the explicit PATCH to the selected evidence and scope', () => {
  const args = { runtimeInstanceId: ' revision/one ', evidenceObjectId: 'item/one', customerId: 'customer', tenantId: 'tenant' }
  const path = '/runtime-instances/revision%2Fone/discovery-evidence/item%2Fone/neutral-qualification'
  const query = '?customerId=customer&tenantId=tenant', body = { requestKey: 'same-request', rationale: null }
  expect(buildEvidenceNeutralQualificationQuery(args)).toBe(path + query)
  expect(buildSaveEvidenceNeutralQualificationQuery({ ...args, body })).toEqual({ url: path + query, method: 'PATCH', body })
  expect(buildEvidenceNeutralQualificationReceiptQuery({ ...args, receiptId: 'record/one' })).toBe(`${path}/receipts/record%2Fone${query}`)
  expect(buildEvidenceNeutralQualificationRequestQuery({ ...args, requestKey: 'request/one' })).toBe(`${path}/requests/request%2Fone${query}`)
  expect(buildEvidenceNeutralQualificationHistoryQuery(args)).toBe(`${path}/history${query}&limit=5`)
  expect(buildEvidenceNeutralQualificationHistoryQuery({ ...args, limit: 1, cursor: 'exact+cursor' })).toBe(`${path}/history${query}&limit=1&cursor=exact%2Bcursor`)
  for (const key of ['getEvidenceNeutralQualification', 'saveEvidenceNeutralQualification', 'getEvidenceNeutralQualificationReceipt',
    'getEvidenceNeutralQualificationRequest', 'getEvidenceNeutralQualificationHistory']) expect(runtimeInstanceApi.endpoints).toHaveProperty(key)
  for (const hook of [useGetEvidenceNeutralQualificationQuery, useSaveEvidenceNeutralQualificationMutation,
    useLazyGetEvidenceNeutralQualificationReceiptQuery, useLazyGetEvidenceNeutralQualificationRequestQuery,
    useGetEvidenceNeutralQualificationHistoryQuery]) expect(hook).toBeTypeOf('function')
})
