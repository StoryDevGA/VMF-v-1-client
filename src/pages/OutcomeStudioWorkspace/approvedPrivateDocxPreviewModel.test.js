import { beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { approvedPrivateDocxPreviewFixture, previewScopeFixture as scope } from './privateDocxPreview.fixture.js'
import { readPrivateDocxCandidates, decodePrivateDocxPreview } from './privateDocxPreviewModel.js'
beforeEach(() => vi.stubGlobal('crypto', webcrypto))
const sealBinding = async f => {
  const canonical = value => value && Object.getPrototypeOf(value) === Object.prototype
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
  f.candidate.masterBindingFingerprint = await f.hashJson(canonical(f.candidate.masterBinding))
  f.bundle.data.preview.masterBindingFingerprint = f.candidate.masterBindingFingerprint
}
const narrowProjection = async () => {
  const f = await approvedPrivateDocxPreviewFixture(), binding = f.candidate.masterBinding
  binding.contractVersion = 'master-linked-private-docx-binding.v4'
  binding.expressionOrigin = 'NARROW_EXPRESSION_PRIVATE_CORRECTION_UNREVIEWED'
  binding.compatibilityReference.version = 'commercial-docx-approved-expression.v2'
  f.candidate.renderer.version = '0.1.5'
  f.candidate.renderer.layoutProfile = 'SOURCE_SCOPED_QUOTATIONS_V2'
  await sealBinding(f)
  return f
}
describe('private wording correction decoder - synthetic generic projections', () => {
  it('accepts seven held pages and signed-reference metadata without inferring review or approval', async () => {
    const f = await approvedPrivateDocxPreviewFixture()
    expect(readPrivateDocxCandidates(f.list, scope)).toEqual([f.candidate])
    expect((await decodePrivateDocxPreview(f.bundle, f.candidate, scope)).blobs).toHaveLength(7)
    expect(f.candidate.authorisesApproval).toBe(false)
  })
  it.each(['version', 'origin', 'renderer', 'decisionFingerprint', 'sourceFingerprint', 'mappingFingerprint', 'masterId',
    'predecessorCandidateId', 'failedReviewExecutionId', 'failedReviewResultFingerprint', 'section13State', 'extra', 'missing'])('rejects %s', async kind => {
    const f = await approvedPrivateDocxPreviewFixture(), b = f.candidate.masterBinding, r = b.compatibilityReference
    if (kind === 'version') b.contractVersion = 'master-linked-private-docx-binding.v2'
    else if (kind === 'origin') b.expressionOrigin = 'VERSIONED_COMMERCIAL_CORRECTION_UNREVIEWED'
    else if (kind === 'renderer') f.candidate.renderer.version = '0.1.3'
    else if (kind === 'extra') r.approved = true
    else if (kind === 'missing') delete r.auditId
    else r[kind] = [r[kind]]
    expect(readPrivateDocxCandidates(f.list, scope)).toBeNull()
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
  it('rejects page, compatibility commitment or scope substitution', async () => {
    const f = await approvedPrivateDocxPreviewFixture()
    f.candidate.masterBinding.compatibilityReference.decisionFingerprint = 'f'.repeat(64)
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
    const g = await approvedPrivateDocxPreviewFixture(); g.bundle.data.pages[6].base64 = 'AAAA'
    await expect(decodePrivateDocxPreview(g.bundle, g.candidate, scope)).rejects.toThrow()
    expect(readPrivateDocxCandidates(g.list, { ...scope, tenantId: 'f'.repeat(24) })).toBeNull()
  })
  it('accepts the finite v4 source-scoped projection while keeping preview and delivery held', async () => {
    const f = await narrowProjection()
    expect(readPrivateDocxCandidates(f.list, scope)).toEqual([f.candidate])
    const decoded = await decodePrivateDocxPreview(f.bundle, f.candidate, scope)
    expect(decoded.blobs).toHaveLength(7)
    expect(decoded.document).toEqual(f.bundle.data.document)
    expect(f.candidate).toMatchObject({ status: 'PRIVATE_UNREVIEWED', authorisesApproval: false,
      finalisationAvailable: false, deliveryAvailable: false })
  })
  it('refuses v4 cross-version or unknown bindings even when the advertised binding hash is resealed', async () => {
    const mutations = [
      f => { f.candidate.masterBinding.compatibilityReference.version = 'commercial-docx-approved-expression.v1' },
      f => { f.candidate.renderer.version = '0.1.4' },
      f => { f.candidate.renderer.layoutProfile = 'KEEP_LABEL_WITH_QUOTE_V1' },
      f => { f.candidate.masterBinding.expressionOrigin = 'APPROVED_EXPRESSION_PRIVATE_CORRECTION_UNREVIEWED' },
      f => { f.candidate.masterBinding.contractVersion = 'master-linked-private-docx-binding.v5' },
    ]
    for (const mutate of mutations) {
      const f = await narrowProjection(); mutate(f); await sealBinding(f)
      expect(readPrivateDocxCandidates(f.list, scope)).toBeNull()
      await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
    }
  })
})
