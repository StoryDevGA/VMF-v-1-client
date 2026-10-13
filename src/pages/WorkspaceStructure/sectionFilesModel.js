import { getHubPayload } from '../IntelligenceHub/intelligenceHubModel.js'
import { sameSectionInput } from './understandingModel.js'

export const sectionDocuments = basis => {
  const detail = basis?.detail, record = detail?.additionalEvidence
  if (Array.isArray(record?.documents)) return record.documents
  // The existing native section normalizer explicitly emits {} and [] before first intake.
  return detail && Object.hasOwn(detail, 'additionalEvidence') && record && Object.getPrototypeOf(record) === Object.prototype
    && Object.keys(record).length === 0 && Array.isArray(detail.evidenceObjects) && detail.evidenceObjects.length === 0 ? [] : null
}
export const sectionEvidence = basis => Array.isArray(basis?.detail?.evidenceObjects) ? basis.detail.evidenceObjects : null

export const reviewableSectionEvidence = (basis, id) => {
  const matches = sectionEvidence(basis)?.filter(row => row.evidenceObjectId === id)
  const row = matches?.length === 1 ? matches[0] : null
  return row && row.sectionKey === basis.section.sectionKey && row.runtimePath === basis.section.runtimePath
    && typeof row.extractedFact === 'string' && row.extractedFact.trim()
    && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(row.reviewStatus)
    && sectionDocuments(basis)?.some(document => document.sourceId === row.sourceId) ? row : null
}

const reviewFields = ['reviewStatus', 'acceptedBy', 'acceptanceTimestamp', 'rejectedBy', 'rejectionTimestamp', 'lastReviewedAt', 'lastReviewedBy']
const factWithoutReview = row => Object.fromEntries(Object.entries(row).filter(([key]) => !reviewFields.includes(key)))
export function verifiedSectionEvidenceReview(before, after, command, response) {
  const old = reviewableSectionEvidence(before, command.evidenceObjectId), row = reviewableSectionEvidence(after, command.evidenceObjectId)
  const payload = getHubPayload(response), previous = sectionEvidence(before), current = sectionEvidence(after)
  if (!old || !row || !after.editable || !['ACCEPTED', 'REJECTED'].includes(command.reviewStatus)
    || old.reviewStatus === command.reviewStatus || row.reviewStatus !== command.reviewStatus
    || !['id', 'runtimeInstanceKey', 'customerId', 'tenantId', 'packageId'].every(key => before.renderer?.runtimeInstance?.[key]
      && before.renderer.runtimeInstance[key] === after.renderer?.runtimeInstance?.[key])
    || after.expectedUpdatedAt === before.expectedUpdatedAt
    || payload?.runtimeInstance?.id !== after.renderer.runtimeInstance.id
    || payload.runtimeInstance.runtimeInstanceKey !== after.renderer.runtimeInstance.runtimeInstanceKey
    || payload.runtimeInstance.updatedAt !== after.expectedUpdatedAt
    || payload.section?.sectionKey !== before.section.sectionKey || payload.section.runtimePath !== before.section.runtimePath
    || after.section.sectionKey !== before.section.sectionKey || after.section.runtimePath !== before.section.runtimePath
    || !sameSectionInput(sectionDocuments(before), sectionDocuments(after))
    || !['input', 'generated', 'accepted'].every(key => sameSectionInput(before.detail[key], after.detail[key]))
    || previous.length !== current.length || new Set(current.map(item => item.evidenceObjectId)).size !== current.length
    || !previous.filter(item => item.evidenceObjectId !== old.evidenceObjectId).every(item => current.some(next => sameSectionInput(item, next)))
    || !sameSectionInput(factWithoutReview(old), factWithoutReview(row))
    || !row.lastReviewedBy || !Number.isFinite(Date.parse(row.lastReviewedAt))) return false
  const receipt = payload.section.sectionEvidence?.evidenceObjects?.filter(item => item.evidenceObjectId === row.evidenceObjectId)
  const normalized = row.extractedFact.replace(/\s+/g, ' ').trim()
  const snippet = normalized.replace(/^Document\s+[^:]{1,80}:\s*/i, '').replace(/^Website\s+[^:]{1,80}:\s*/i, '').trim() || normalized
  const projected = { sourceType: String(row.sourceType || 'SECTION_UPLOADED_DOCUMENT').trim(), category: String(row.category || 'Section Evidence').trim(),
    coverageArea: String(row.coverageArea || row.category || 'Section Evidence').trim(), sourceFileName: String(row.sourceFileName || '').trim(), createdAt: String(row.createdAt || '').trim() }
  if (receipt?.length !== 1 || !['evidenceObjectId', 'sectionKey', 'runtimePath', 'sourceId', 'reviewStatus', 'acceptedBy', 'acceptanceTimestamp', 'rejectedBy', 'rejectionTimestamp']
    .every(key => receipt[0][key] === String(row[key] || '').trim())
    || !Object.entries(projected).every(([key, value]) => receipt[0][key] === value)
    || receipt[0].snippet !== (snippet.length > 120 ? `${snippet.slice(0, 117).trim()}...` : snippet)) return false
  const accepting = command.reviewStatus === 'ACCEPTED'
  if (accepting ? row.acceptedBy !== row.lastReviewedBy || row.acceptanceTimestamp !== row.lastReviewedAt || row.rejectedBy || row.rejectionTimestamp
    : row.rejectedBy !== row.lastReviewedBy || row.rejectionTimestamp !== row.lastReviewedAt || row.acceptedBy || row.acceptanceTimestamp) return false
  const invalidated = (old.reviewStatus === 'ACCEPTED' || accepting) && Boolean(before.generated?.content?.trim() || before.accepted?.content?.trim())
  return invalidated ? after.detail.state?.needsRegeneration === true
    && after.detail.lineage?.sectionEvidenceInvalidationReason === 'SECTION_EVIDENCE_CHANGED'
    && after.detail.intelligence?.invalidation?.reason === 'SECTION_EVIDENCE_CHANGED'
    : sameSectionInput(before.detail.state, after.detail.state)
}

// Transport success is insufficient: check exact newly persisted receipts and pending evidence.
export function verifiedSectionFileUpload(before, after, documents, response) {
  const payload = getHubPayload(response), old = sectionDocuments(before), current = sectionDocuments(after)
  const evidence = sectionEvidence(after), previousEvidence = sectionEvidence(before)
  if (!after?.editable || !old || !current || !evidence || !previousEvidence
    || !['id', 'runtimeInstanceKey', 'customerId', 'tenantId', 'packageId'].every(key => before.renderer?.runtimeInstance?.[key]
      && before.renderer.runtimeInstance[key] === after.renderer?.runtimeInstance?.[key])
    || !documents.length || after.expectedUpdatedAt === before.expectedUpdatedAt
    || payload?.runtimeInstance?.id !== after.renderer.runtimeInstance.id
    || payload.runtimeInstance.runtimeInstanceKey !== after.renderer.runtimeInstance.runtimeInstanceKey
    || payload.runtimeInstance.updatedAt !== after.expectedUpdatedAt
    || payload.section?.sectionKey !== before.section.sectionKey
    || payload.section.runtimePath !== before.section.runtimePath
    || after.section.sectionKey !== before.section.sectionKey
    || after.section.runtimePath !== before.section.runtimePath
    || !['input', 'generated', 'accepted', 'state'].every(key => sameSectionInput(before.detail[key], after.detail[key]))) return false
  const added = current.filter(row => !old.some(item => item.sectionDocumentId === row.sectionDocumentId))
  const addedEvidence = evidence.filter(row => !previousEvidence.some(item => item.evidenceObjectId === row.evidenceObjectId))
  const receipts = payload.section.sectionEvidence?.documents
  const matches = (row, document) => row.fileName === document.fileName && row.sizeBytes === document.sizeBytes && row.mimeType === document.mimeType
  return Array.isArray(receipts) && added.length === documents.length && new Set(added.map(row => row.sectionDocumentId)).size === documents.length
    && old.every(row => current.some(item => sameSectionInput(item, row)))
    && previousEvidence.every(row => evidence.some(item => sameSectionInput(item, row)))
    && documents.every(document => added.filter(row => matches(row, document)).length === documents.filter(item => matches(item, document)).length)
    && added.every(row => row.sectionDocumentId && row.sourceId && row.uploadedBy && Number.isFinite(Date.parse(row.uploadedAt))
      && row.status === 'PROCESSED' && receipts.some(receipt => receipt.sectionDocumentId === row.sectionDocumentId && receipt.sourceId === row.sourceId)
      && addedEvidence.some(item => item.sourceId === row.sourceId))
    && addedEvidence.every(row => row.evidenceObjectId && row.reviewStatus === 'PENDING'
      && row.sectionKey === before.section.sectionKey && row.runtimePath === before.section.runtimePath
      && added.some(document => document.sourceId === row.sourceId))
}
