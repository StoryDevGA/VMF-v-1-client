import { beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { readPrivateDocxCandidates, decodePrivateDocxPreview } from './privateDocxPreviewModel.js'
import { privateDocxPreviewFixture, masterLinkedPrivateDocxPreviewFixture, controlledSnapshotPreviewFixture, previewScopeFixture as scope } from './privateDocxPreview.fixture.js'

beforeEach(() => vi.stubGlobal('crypto', webcrypto))

describe('controlled snapshot provenance', () => {
  it('accepts matching provenance without changing the held master binding', async () => {
    const f = await controlledSnapshotPreviewFixture()
    const binding = f.candidate.masterBindingFingerprint
    f.bundle.data.preview.storageProvenance = Object.fromEntries(Object.entries(f.bundle.data.preview.storageProvenance).reverse())
    expect(readPrivateDocxCandidates(f.list, scope)).toEqual([f.candidate])
    expect((await decodePrivateDocxPreview(f.bundle, f.candidate, scope)).blobs).toHaveLength(6)
    expect(f.candidate.masterBindingFingerprint).toBe(binding)
  })
  it.each(['candidate missing', 'preview missing', 'promoted', 'unknown contract', 'extra field', 'null'])('refuses %s provenance', async kind => {
    const f = await controlledSnapshotPreviewFixture()
    if (kind === 'candidate missing') delete f.candidate.storageProvenance
    if (kind === 'preview missing') delete f.bundle.data.preview.storageProvenance
    if (kind === 'promoted') f.candidate.storageProvenance.customerApproved = true
    if (kind === 'unknown contract') f.bundle.data.preview.storageProvenance.contractVersion = 'future'
    if (kind === 'extra field') f.bundle.data.preview.storageProvenance.approved = true
    if (kind === 'null') f.bundle.data.preview.storageProvenance = null
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
    if (kind === 'promoted') expect(readPrivateDocxCandidates(f.list, scope)).toBeNull()
  })
})

describe('version-two master-linked preview', () => {
  it('matches the server checksum vector and decodes six exact held pages', async () => {
    const f = await masterLinkedPrivateDocxPreviewFixture()
    expect(f.candidate.masterBindingFingerprint).toBe('901034c5055933f6fae0734a44319edaecdc78df28eea5b4f19eed0b36645f22')
    expect(readPrivateDocxCandidates(f.list, scope)).toEqual([f.candidate])
    const result = await decodePrivateDocxPreview(f.bundle, f.candidate, scope)
    expect(result.blobs).toHaveLength(6)
    expect(result.document).toEqual(f.bundle.data.document)
  })
  it('accepts reordered master binding keys using the server canonical rule', async () => {
    const f = await masterLinkedPrivateDocxPreviewFixture(), old = f.candidate.masterBinding
    f.candidate.masterBinding = { wrapperFingerprint: old.wrapperFingerprint, expressionOrigin: old.expressionOrigin,
      masterReference: Object.fromEntries(Object.entries(old.masterReference).reverse()), contractVersion: old.contractVersion }
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).resolves.toMatchObject({ blobs: expect.any(Array) })
  })
  it.each([
    ['missing body hash', f => { delete f.candidate.bodyFingerprint }],
    ['missing binding hash', f => { delete f.candidate.masterBindingFingerprint }],
    ['missing master', f => { delete f.candidate.masterBinding.masterReference }],
    ['wrong scope', f => { f.candidate.masterBinding.masterReference.scope.tenantId = '507f1f77bcf86cd799439099' }],
    ['wrong source', f => { f.candidate.masterBinding.masterReference.sourceFingerprint = '0'.repeat(64) }],
    ['wrong master version', f => { f.candidate.masterBinding.masterReference.version = 2 }],
    ['coerced storage ID', f => { const ref = f.candidate.masterBinding.masterReference; ref.storageId = [ref.storageId] }],
    ['coerced candidate ID', f => { f.candidate.candidateId = [f.candidate.candidateId] }],
    ['wrong audit version', f => { f.candidate.masterBinding.masterReference.auditSignatureVersion = 0 }],
    ['extra binding field', f => { f.candidate.masterBinding.extra = true }],
    ['extra master field', f => { f.candidate.masterBinding.masterReference.extra = true }],
    ['wrong expression authority', f => { f.candidate.masterBinding.expressionOrigin = 'CUSTOMER_APPROVED' }],
    ['unknown candidate version', f => { f.candidate.contractVersion = 'private-docx-candidate.v3' }],
    ['downgraded candidate', f => { delete f.candidate.contractVersion }],
  ])('rejects %s before using pages', async (_name, mutate) => {
    const f = await masterLinkedPrivateDocxPreviewFixture(); mutate(f)
    expect(readPrivateDocxCandidates(f.list, scope)).toBeNull()
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
  it.each(['candidateBodyFingerprint', 'masterBindingFingerprint', 'contractVersion'])('rejects wrong preview %s', async key => {
    const f = await masterLinkedPrivateDocxPreviewFixture(); f.bundle.data.preview[key] = key === 'contractVersion' ? 'private-docx-page-preview.v1' : '0'.repeat(64)
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
  it('rejects a changed master binding even when its advertised hash and preview agree', async () => {
    const f = await masterLinkedPrivateDocxPreviewFixture(); f.candidate.masterBinding.wrapperFingerprint = '0'.repeat(64)
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
  it('rejects a v2 preview paired with legacy candidate metadata', async () => {
    const f = await masterLinkedPrivateDocxPreviewFixture()
    delete f.candidate.contractVersion; delete f.candidate.bodyFingerprint; delete f.candidate.masterBinding; delete f.candidate.masterBindingFingerprint
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
  it.each(['authoritative', 'authorisesApproval', 'finalisationAvailable', 'deliveryAvailable'])('rejects candidate promotion %s independently', async key => {
    const f = await masterLinkedPrivateDocxPreviewFixture(); f.candidate[key] = true
    expect(readPrivateDocxCandidates(f.list, scope)).toBeNull()
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
  it('retains the original conversion serialization and image-integrity checks', async () => {
    const f = await masterLinkedPrivateDocxPreviewFixture()
    f.bundle.data.preview.conversion = Object.fromEntries(Object.entries(f.bundle.data.preview.conversion).reverse())
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
    f.bundle.data.preview.conversionFingerprint = await f.hashJson(f.bundle.data.preview.conversion)
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).resolves.toBeDefined()
    f.bundle.data.pages[0].base64 = btoa('Changed page')
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
})
describe('exact private preview decoding', () => {
  it.each(['null', 'array', 'number', 'label', 'version', 'date'])('refuses malformed discovery %s without throwing during render', async kind => {
    const f = await privateDocxPreviewFixture()
    if (kind === 'null') f.list.data.candidates = [null]
    if (kind === 'array') f.list.data.candidates = [[]]
    if (kind === 'number') f.list.data.candidates = [1]
    if (kind === 'label') f.candidate.selectedPacks.OUTPUT_TYPE.label = { invalid: true }
    if (kind === 'version') f.candidate.renderer.version = { invalid: true }
    if (kind === 'date') f.candidate.createdAt = { invalid: true }
    expect(() => readPrivateDocxCandidates(f.list, scope)).not.toThrow(); expect(readPrivateDocxCandidates(f.list, scope)).toBeNull()
  })
  it('verifies five ordered stored page bytes and bound text', async () => {
    const f = await privateDocxPreviewFixture()
    expect(readPrivateDocxCandidates(f.list, scope)).toEqual([f.candidate])
    const result = await decodePrivateDocxPreview(f.bundle, f.candidate, scope)
    expect(result.blobs).toHaveLength(5); expect(result.blobs[0].type).toBe('image/png'); expect(result.document).toEqual(f.bundle.data.document)
  })
  it.each(['runtimeInstanceId', 'customerId', 'tenantId'])('rejects wrong %s in discovery and bundle', async key => {
    const f = await privateDocxPreviewFixture(); const other = { ...scope, [key]: '507f1f77bcf86cd799439019' }
    expect(readPrivateDocxCandidates(f.list, other)).toBeNull()
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, other)).rejects.toThrow()
  })
  it.each(['authoritative', 'officialUse', 'normalOutputAvailable', 'authorisesApproval', 'finalisationAvailable', 'deliveryAvailable'])('rejects promoted %s', async key => {
    const f = await privateDocxPreviewFixture(); f.candidate[key] = true; f.bundle.data.preview[key] = true
    expect(readPrivateDocxCandidates(f.list, scope)).toBeNull(); await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
  it.each(['candidateId', 'sourceFingerprint', 'inputFingerprint'])('rejects wrong preview %s', async key => {
    const f = await privateDocxPreviewFixture(); f.bundle.data.preview[key] = '0'.repeat(64)
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
  it.each(['number', 'width', 'height', 'byteLength', 'sha256'])('checks PNG receipt %s even when conversion fingerprint is resealed', async key => {
    const f = await privateDocxPreviewFixture(); f.bundle.data.preview.conversion.pages[0][key] = key === 'sha256' ? '0'.repeat(64) : 3
    f.bundle.data.preview.conversionFingerprint = await f.hashJson(f.bundle.data.preview.conversion)
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
  it.each(['corrupt', 'truncated', 'noncanonical', 'oversized'])('rejects %s base64 page', async kind => {
    const f = await privateDocxPreviewFixture(); const page = f.bundle.data.pages[0]
    if (kind === 'corrupt') page.base64 = btoa('Not a PNG')
    if (kind === 'truncated') page.base64 = page.base64.slice(0, -4)
    if (kind === 'noncanonical') page.base64 += '\n'
    if (kind === 'oversized') page.base64 = 'A'.repeat(3 * 1024 ** 2)
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
  it.each(['missing', 'unbound', 'oversized'])('rejects %s text alternative', async kind => {
    const f = await privateDocxPreviewFixture()
    if (kind === 'missing') delete f.bundle.data.document
    if (kind === 'unbound') f.bundle.data.document.inputFingerprint = '0'.repeat(64)
    if (kind === 'oversized') f.bundle.data.document.markdown = 'x'.repeat(1024 ** 2 + 1)
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
  it('rejects changed conversion/runtime fingerprints and duplicate discovery', async () => {
    const f = await privateDocxPreviewFixture(); f.list.data.candidates.push(f.candidate)
    expect(readPrivateDocxCandidates(f.list, scope)).toBeNull()
    f.bundle.data.preview.conversion.runtime.dpi = 72
    await expect(decodePrivateDocxPreview(f.bundle, f.candidate, scope)).rejects.toThrow()
  })
})
