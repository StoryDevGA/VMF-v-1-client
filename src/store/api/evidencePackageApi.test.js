import { expect, it } from 'vitest'
import { buildEvidencePackageQuery, buildBatchReviewEvidenceQuery, buildFreezeEvidencePackageQuery,
  buildSaveEvidencePackageQuery, buildEvidencePackageReceiptQuery, runtimeInstanceApi,
  useGetEvidencePackageQuery, useLazyGetEvidencePackageReceiptQuery, useBatchReviewEvidenceMutation,
  useFreezeEvidencePackageMutation, useSaveEvidencePackageMutation } from './runtimeInstanceApi.js'

it('binds package reads, commands and exact receipt readback to the selected scope', () => {
  const scope = { runtimeInstanceId: ' revision/one ', customerId: 'customer', tenantId: 'tenant' }, body = { requestKey: 'key', confirm: true }
  const path = '/runtime-instances/revision%2Fone', query = '?customerId=customer&tenantId=tenant'
  expect(buildEvidencePackageQuery(scope)).toBe(`${path}/evidence-package${query}`)
  expect(buildBatchReviewEvidenceQuery({ ...scope, body })).toEqual({ url: `${path}/discovery-evidence/batch-review${query}`, method: 'POST', body })
  expect(buildFreezeEvidencePackageQuery({ ...scope, body })).toEqual({ url: `${path}/evidence-package/freeze${query}`, method: 'POST', body })
  expect(buildSaveEvidencePackageQuery({ ...scope, body })).toEqual({ url: `${path}/evidence-package${query}`, method: 'POST', body })
  expect(buildEvidencePackageReceiptQuery({ ...scope, receiptId: 'exact/receipt' })).toBe(`${path}/evidence-package/exact%2Freceipt${query}`)
  for (const endpoint of ['getEvidencePackage', 'getEvidencePackageReceipt', 'batchReviewEvidence', 'freezeEvidencePackage', 'saveEvidencePackage']) expect(runtimeInstanceApi.endpoints).toHaveProperty(endpoint)
  for (const hook of [useGetEvidencePackageQuery, useLazyGetEvidencePackageReceiptQuery, useBatchReviewEvidenceMutation,
    useFreezeEvidencePackageMutation, useSaveEvidencePackageMutation]) expect(hook).toBeTypeOf('function')
})
