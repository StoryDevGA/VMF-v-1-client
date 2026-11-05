import { beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { correctedPrivateDocxPreviewFixture, previewScopeFixture as scope } from './privateDocxPreview.fixture.js'
import { readPrivateDocxCandidates, decodePrivateDocxPreview } from './privateDocxPreviewModel.js'
beforeEach(() => vi.stubGlobal('crypto', webcrypto))
describe('corrected binding decoder - mocked generic page projections', () => {
  it('validates seven held pages without inheriting the failed predecessor review', async () => {
    const f = await correctedPrivateDocxPreviewFixture()
    expect(readPrivateDocxCandidates(f.list, scope)).toEqual([f.candidate])
    expect((await decodePrivateDocxPreview(f.bundle, f.candidate, scope)).blobs).toHaveLength(7)
    expect(f.candidate.authorisesApproval).toBe(false)
  })
  it.each(['self-parent', 'body', 'input', 'output', 'version', 'origin', 'extra', 'missing', 'renderer', 'coerced execution'])('refuses %s', async kind => {
    const f = await correctedPrivateDocxPreviewFixture(), b = f.candidate.masterBinding, p = b.correctionReference.predecessor
    if (kind === 'self-parent') p.candidateId = f.candidate.candidateId
    if (kind === 'body') b.correctionReference.predecessorBodyFingerprint = f.candidate.bodyFingerprint
    if (kind === 'input') p.inputFingerprint = f.candidate.inputFingerprint
    if (kind === 'output') p.outputChecksum = f.candidate.artifact.outputChecksum
    if (kind === 'version') b.contractVersion = 'master-linked-private-docx-binding.v1'
    if (kind === 'origin') b.expressionOrigin = 'RETAINED_SOURCE_SHAPING_UNREVIEWED'
    if (kind === 'extra') p.approved = true
    if (kind === 'missing') delete p.failedReviewResultFingerprint
    if (kind === 'renderer') f.candidate.renderer.version = '0.1.2'
    if (kind === 'coerced execution') p.failedReviewExecutionId = [p.failedReviewExecutionId]
    expect(readPrivateDocxCandidates(f.list, scope)).toBeNull()
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
  it.each(['candidateId', 'inputFingerprint', 'outputChecksum', 'failedReviewExecutionId', 'failedReviewResultFingerprint'])('refuses coerced predecessor %s', async field => {
    const f = await correctedPrivateDocxPreviewFixture(), p = f.candidate.masterBinding.correctionReference.predecessor
    p[field] = [p[field]]
    expect(readPrivateDocxCandidates(f.list, scope)).toBeNull()
  })
  it('rejects a changed predecessor whose stored binding hash was retained', async () => {
    const f = await correctedPrivateDocxPreviewFixture()
    f.candidate.masterBinding.correctionReference.predecessor.failedReviewResultFingerprint = 'a'.repeat(64)
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
  it('rejects seventh-page hash substitution and foreign scope', async () => {
    const f = await correctedPrivateDocxPreviewFixture(); f.bundle.data.pages[6].base64 = 'AAAA'
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
    expect(readPrivateDocxCandidates(f.list, { ...scope, customerId: '0'.repeat(24) })).toBeNull()
  })
})
