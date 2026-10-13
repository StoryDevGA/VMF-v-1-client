import { describe, expect, it } from 'vitest'
import { sectionDocuments, verifiedSectionFileUpload, verifiedSectionEvidenceReview } from './sectionFilesModel.js'

const sample = () => {
  const section = { sectionKey: 'strategic-objectives', runtimePath: 'framework_state.sections.strategic_objectives' }
  const before = { section, renderer: { runtimeInstance: { id: 'runtime1', runtimeInstanceKey: 'root1', customerId: 'customer1', tenantId: 'tenant1', packageId: 'package1' } }, expectedUpdatedAt: 'before', detail: { input: { summary: 'Synthetic' }, generated: null, accepted: null, state: {}, additionalEvidence: { documents: [] }, evidenceObjects: [] } }
  const document = { sectionDocumentId: 'doc1', sourceId: 'doc1', fileName: 'fixture.txt', sizeBytes: 12, mimeType: 'text/plain', status: 'PROCESSED', uploadedBy: 'actor1', uploadedAt: '2026-10-11T16:00:00Z' }
  const after = { ...before, editable: true, expectedUpdatedAt: 'after', detail: { ...before.detail, additionalEvidence: { documents: [document] }, evidenceObjects: [{ evidenceObjectId: 'e1', sourceId: 'doc1', reviewStatus: 'PENDING', ...section }] } }
  const response = { data: { runtimeInstance: { ...after.renderer.runtimeInstance, updatedAt: 'after' }, section: { ...section, sectionEvidence: { documents: [document] } } } }
  return { before, after, documents: [{ fileName: 'fixture.txt', sizeBytes: 12, mimeType: 'text/plain' }], response }
}
const verify = f => verifiedSectionFileUpload(f.before, f.after, f.documents, f.response)
const reviewSample = () => {
  const f = sample(), row = { ...f.after.detail.evidenceObjects[0], extractedFact: 'Synthetic objective' }
  f.before.detail.additionalEvidence = structuredClone(f.after.detail.additionalEvidence)
  f.before.detail.evidenceObjects = [row]
  f.after.detail.evidenceObjects = [{ ...row, reviewStatus: 'ACCEPTED', acceptedBy: 'actor', acceptanceTimestamp: '2026-10-11T17:00:00Z', lastReviewedBy: 'actor', lastReviewedAt: '2026-10-11T17:00:00Z', rejectedBy: '', rejectionTimestamp: '' }]
  f.response.data.section.sectionEvidence.evidenceObjects = f.after.detail.evidenceObjects.map(row => ({ evidenceObjectId: row.evidenceObjectId, sectionKey: row.sectionKey, runtimePath: row.runtimePath, sourceId: row.sourceId, reviewStatus: row.reviewStatus, acceptedBy: row.acceptedBy, acceptanceTimestamp: row.acceptanceTimestamp, rejectedBy: row.rejectedBy, rejectionTimestamp: row.rejectionTimestamp, snippet: row.extractedFact, sourceType: 'SECTION_UPLOADED_DOCUMENT', category: 'Section Evidence', coverageArea: 'Section Evidence', sourceFileName: '', createdAt: '' }))
  f.command = { evidenceObjectId: 'e1', reviewStatus: 'ACCEPTED' }
  return f
}
const verifyReview = f => verifiedSectionEvidenceReview(f.before, f.after, f.command, f.response)
describe('Exact individual evidence decision readback', () => {
  it('requires exact persisted decision and source preservation', () => expect(verifyReview(reviewSample())).toBe(true))
  it('compares the actual bounded snippet receipt while preserving full native fact', () => {
    const f = reviewSample(), text = 'A synthetic objective with preserved source lineage. '.repeat(5)
    f.before.detail.evidenceObjects[0].extractedFact = f.after.detail.evidenceObjects[0].extractedFact = `Document Customer Document: ${text}`
    f.response.data.section.sectionEvidence.evidenceObjects[0].snippet = `${text.slice(0, 117).trim()}...`
    expect(verifyReview(f)).toBe(true)
    f.response.data.section.sectionEvidence.evidenceObjects[0].snippet = 'Different fact'; expect(verifyReview(f)).toBe(false)
  })
  it('requires native invalidation when accepted evidence changes existing Understanding', () => {
    const f = reviewSample(); f.before.generated = f.after.generated = { content: 'Old proposed understanding' }
    expect(verifyReview(f)).toBe(false)
    f.after.detail.state = { needsRegeneration: true }; f.after.detail.lineage = { sectionEvidenceInvalidationReason: 'SECTION_EVIDENCE_CHANGED' }; f.after.detail.intelligence = { invalidation: { reason: 'SECTION_EVIDENCE_CHANGED' } }
    expect(verifyReview(f)).toBe(true)
  })
  it.each(['actor', 'time', 'scope', 'receipt', 'fact', 'source', 'documents', 'other-row', 'input', 'duplicate', 'status'])('rejects changed or incomplete %s', key => {
    const f = reviewSample(), row = f.after.detail.evidenceObjects[0]
    if (key === 'actor') row.acceptedBy = 'foreign'
    if (key === 'time') row.lastReviewedAt = 'invalid'
    if (key === 'scope') f.after.renderer = { runtimeInstance: { ...f.after.renderer.runtimeInstance, customerId: 'foreign' } }
    if (key === 'receipt') f.response.data.section.sectionEvidence.evidenceObjects = []
    if (key === 'fact') row.extractedFact = 'changed'
    if (key === 'source') row.sourceId = 'foreign'
    if (key === 'documents') f.after.detail.additionalEvidence.documents[0].fileName = 'changed'
    if (key === 'other-row') { f.before.detail.evidenceObjects.push({ ...f.before.detail.evidenceObjects[0], evidenceObjectId: 'e2' }); f.after.detail.evidenceObjects.push({ ...row, evidenceObjectId: 'e2' }) }
    if (key === 'input') f.after.detail.input = { changed: true }
    if (key === 'duplicate') f.after.detail.evidenceObjects.push({ ...row })
    if (key === 'status') row.reviewStatus = 'PENDING'
    expect(verifyReview(f)).toBe(false)
  })
})
describe('Exact native section upload readback', () => {
  it('recognizes only the canonical normalized pre-intake empty record', () => {
    expect(sectionDocuments({ detail: { additionalEvidence: {}, evidenceObjects: [] } })).toEqual([])
    for (const detail of [{}, { additionalEvidence: null, evidenceObjects: [] }, { additionalEvidence: { status: 'UNKNOWN' }, evidenceObjects: [] }, { additionalEvidence: {}, evidenceObjects: [{ evidenceObjectId: 'unexpected' }] }])
      expect(sectionDocuments({ detail })).toBeNull()
    const f = sample(); f.before.detail.additionalEvidence = {}; expect(verify(f)).toBe(true)
  })
  it('requires newly persisted receipt and pending evidence with preserved Understanding', () => expect(verify(sample())).toBe(true))
  it('checks full existing receipt content rather than only its identity', () => {
    const f = sample(), old = { sectionDocumentId: 'old', fileName: 'prior.txt', sizeBytes: 42, uploadedBy: 'prior-actor' }
    f.before.detail.additionalEvidence.documents = [old]
    f.after.detail.additionalEvidence.documents.push({ ...old, sizeBytes: 43 })
    expect(verify(f)).toBe(false)
  })
  it('matches a multiset of same-metadata files to distinct new receipts', () => {
    const f = sample(); f.documents.push({ ...f.documents[0] })
    const second = { ...f.after.detail.additionalEvidence.documents[0], sectionDocumentId: 'doc2', sourceId: 'doc2' }
    f.after.detail.additionalEvidence.documents.push(second); f.response.data.section.sectionEvidence.documents.push(second)
    f.after.detail.evidenceObjects.push({ ...f.after.detail.evidenceObjects[0], evidenceObjectId: 'e2', sourceId: 'doc2' })
    expect(verify(f)).toBe(true)
    f.documents.pop(); expect(verify(f)).toBe(false)
    f.documents.push({ ...f.documents[0] }); f.after.detail.additionalEvidence.documents.pop(); expect(verify(f)).toBe(false)
  })
  it.each(['scope', 'stamp', 'receipt', 'pending', 'input', 'accepted', 'source', 'file', 'missing'])('fails closed for %s', key => {
    const f = sample()
    if (key === 'scope') f.response.data.runtimeInstance.id = 'foreign'
    if (key === 'stamp') f.after.expectedUpdatedAt = 'before'
    if (key === 'receipt') f.response.data.section.sectionEvidence.documents = []
    if (key === 'pending') f.after.detail.evidenceObjects[0].reviewStatus = 'ACCEPTED'
    if (key === 'input') f.after.detail.input = { summary: 'different' }
    if (key === 'accepted') f.after.detail.accepted = { content: 'invented' }
    if (key === 'source') f.after.detail.evidenceObjects[0].sourceId = 'foreign'
    if (key === 'file') f.documents[0].fileName = 'different.txt'
    if (key === 'missing') delete f.after.detail.additionalEvidence
    expect(verify(f)).toBe(false)
  })
})
