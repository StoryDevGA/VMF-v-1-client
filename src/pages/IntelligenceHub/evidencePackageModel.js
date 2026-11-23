import { getHubPayload } from './intelligenceHubModel.js'
import { verifyNeutralReceipt } from './neutralQualificationModel.js'

export const EVIDENCE_PACKAGE_VERSION = 'intelligence-evidence-package.v1'
export const QUALIFIED_PACKAGE_CONTENT_VERSION = 'qualified-evidence-package-content.v2'
const knownContent = body => body.contentVersion === undefined || body.contentVersion === QUALIFIED_PACKAGE_CONTENT_VERSION
const outputContent = body => ({ ...(body.contentVersion ? { contentVersion: body.contentVersion, membershipReference: body.membershipReference } : {}),
  qualificationLedger: body.qualificationLedger, evidenceRegister: body.evidenceRegister,
  baseline: body.baseline, analysis: body.analysis, warnings: body.warnings })
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const sourceHash = value => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value)
const text = value => typeof value === 'string' && value.trim().length > 0
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
const ids = value => Array.isArray(value) && value.every(text) && new Set(value).size === value.length
const sameScope = (value, scope) => value && value.customerId === scope.customerId && value.tenantId === scope.tenantId
  && [value.runtimeInstanceId, value.runtimeInstanceKey].includes(scope.runtimeInstanceId)
  && value.rootRuntimeInstanceKey === scope.workspaceId

export function readEvidencePackage(response, scope, stateVersion) {
  const value = getHubPayload(response)
  if (value?.contractVersion !== EVIDENCE_PACKAGE_VERSION || !sameScope(value.scope, scope)
    || !text(stateVersion) || value.control?.stateVersion !== stateVersion || !date(value.control.runtimeUpdatedAt)
    || !hash(value.control.populationHash) || typeof value.canWrite !== 'boolean'
    || !ids(value.batch?.eligibleIds) || !Array.isArray(value.batch.excluded)
    || value.batch.excluded.some(item => !text(item?.id) || !text(item.reason))
    || typeof value.availability?.canFreeze !== 'boolean' || typeof value.availability.canSave !== 'boolean'
    || value.freezePreview && (!hash(value.freezePreview.basisHash) || !ids(value.freezePreview.acceptedIds)
      || !Array.isArray(value.freezePreview.sectionMappings) || !ids(value.freezePreview.unassignedEvidenceIds))
    || value.packagePreview && (!knownContent(value.packagePreview) || !Array.isArray(value.packagePreview.qualificationLedger)
      || !Array.isArray(value.packagePreview.evidenceRegister) || !Array.isArray(value.packagePreview.baseline?.statements)
      || !validAnalysis(value.packagePreview.analysis) || !Array.isArray(value.packagePreview.warnings))) return null
  return value
}

const validAnalysis = value => value && ['observations', 'patterns', 'hypotheses', 'contradictions', 'unknowns'].every(key => Array.isArray(value[key]))
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
export async function evidencePackageHash(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(value)))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function verifyEvidencePackageReceipt(response, scope, command) {
  const value = getHubPayload(response), receipt = value?.receipt
  if (value?.contractVersion !== EVIDENCE_PACKAGE_VERSION || !sameScope(value.scope, scope)
    || !receipt || !text(receipt.receiptId) || receipt.contractVersion !== EVIDENCE_PACKAGE_VERSION
    || receipt.auditVerified !== true || !['BATCH', 'FREEZE', 'PACKAGE'].includes(receipt.kind)
    || !['CURRENT', 'STALE'].includes(receipt.currency) || !date(receipt.createdAt)
    || !/^[a-f0-9]{24}$/i.test(receipt.actorUserId || '') || !/^[a-f0-9]{24}$/i.test(receipt.auditId || '')
    || !Number.isSafeInteger(receipt.auditSignatureVersion) || receipt.auditSignatureVersion < 1
    || !hash(receipt.bodyHash) || !hash(receipt.payloadHash) || !text(receipt.basisStateVersion)
    || !receipt.body || await evidencePackageHash(receipt.body) !== receipt.bodyHash) return null
  const body = receipt.body
  if (receipt.kind === 'BATCH' && (!ids(body.acceptedIds) || !ids(body.decisionAuditIds)
    || body.acceptedIds.length !== body.decisionAuditIds.length || !hash(body.inputPopulationHash)
    || !text(body.inputStateVersion) || !text(body.outputStateVersion))) return null
  if (receipt.kind === 'FREEZE' && (!text(body.completionReceiptId) || !hash(body.completionPopulationHash)
    || !hash(body.membershipHash) || !hash(body.basisHash) || !body.membership || !sameScope(body.membership.scope, scope)
    || body.membership.basisStateVersion !== receipt.basisStateVersion
    || body.membership.contractVersion !== 'published-evidence-membership.v1' || body.membership.lockTruthRecord !== undefined
    || !Array.isArray(body.membership.evidence) || !Array.isArray(body.membership.sources) || !Array.isArray(body.membership.sections)
    || !ids(body.membership.evidence.map(item => item.evidenceObjectId)) || !ids(body.membership.sources.map(item => item.sourceId))
    || !Array.isArray(body.sectionMappings) || !ids(body.unassignedEvidenceIds)
    || body.membership.evidence.some(item => !body.membership.sources.some(source => source.sourceId === item.sourceId)
      || !hash(item.materialHash) || !sourceHash(item.sourceHash))
    || body.sectionMappings.some(item => !text(item.sectionKey) || !ids(item.evidenceObjectIds)
      || item.evidenceObjectIds.some(id => !body.membership.evidence.some(member => member.evidenceObjectId === id)))
    || body.unassignedEvidenceIds.some(id => !body.membership.evidence.some(member => member.evidenceObjectId === id))
    || await evidencePackageHash(body.membership) !== body.membershipHash
    || await evidencePackageHash({ completionReceiptId: body.completionReceiptId,
      completionPopulationHash: body.completionPopulationHash, membershipHash: body.membershipHash }) !== body.basisHash)) return null
  if (receipt.kind === 'PACKAGE' && (!knownContent(body) || !text(body.freezeReceiptId) || !text(body.completionReceiptId)
    || !hash(body.membershipHash) || !hash(body.ledgerHash) || !hash(body.outputHash)
    || !Array.isArray(body.qualificationLedger) || !Array.isArray(body.evidenceRegister)
    || !Array.isArray(body.baseline?.statements) || !validAnalysis(body.analysis) || !Array.isArray(body.warnings)
    || await evidencePackageHash(body.qualificationLedger) !== body.ledgerHash
    || await evidencePackageHash(outputContent(body)) !== body.outputHash)) return null
  if (command && (receipt.kind !== command.kind || receipt.requestKey !== command.body.requestKey
    || receipt.payloadHash !== await evidencePackageHash({ ...command.body, actorUserId: receipt.actorUserId })
    || command.body.expectedStateVersion && receipt.basisStateVersion !== command.body.expectedStateVersion
    || receipt.kind === 'BATCH' && (body.inputPopulationHash !== command.body.expectedPopulationHash
      || body.inputStateVersion !== command.body.expectedStateVersion
      || command.expectedAcceptedIds && (body.acceptedIds.length !== command.expectedAcceptedIds.length
        || body.acceptedIds.some(id => !command.expectedAcceptedIds.includes(id))))
    || receipt.kind === 'FREEZE' && (body.completionReceiptId !== command.body.completionReceiptId || body.basisHash !== command.body.expectedBasisHash)
    || receipt.kind === 'PACKAGE' && (body.freezeReceiptId !== command.body.freezeReceiptId
      || body.membershipHash !== command.body.expectedMembershipHash))) return null
  return receipt
}

export async function verifyEvidencePackageLinks(receipt, frozen) {
  if (receipt?.kind !== 'PACKAGE' || frozen?.kind !== 'FREEZE' || receipt.body.freezeReceiptId !== frozen.receiptId
    || receipt.basisStateVersion !== frozen.basisStateVersion || receipt.body.membershipHash !== frozen.body.membershipHash
    || receipt.body.completionReceiptId !== frozen.body.completionReceiptId) return false
  const body = receipt.body, members = frozen.body.membership.evidence
  if (!knownContent(body)) return false
  if (body.contentVersion && (body.membershipReference?.membershipHash !== frozen.body.membershipHash
    || body.membershipReference.basisStateVersion !== frozen.basisStateVersion
    || await evidencePackageHash(body.membershipReference.scope) !== await evidencePackageHash(frozen.body.membership.scope))) return false
  const exact = rows => ids(rows.map(item => item.evidenceObjectId)) && rows.length === members.length
    && rows.every(row => members.some(member => member.evidenceObjectId === row.evidenceObjectId && member.sourceId === row.sourceId))
  if (!exact(body.qualificationLedger) || !exact(body.evidenceRegister) || !exact(body.baseline.statements)) return false
  for (const row of body.qualificationLedger) {
    if (!text(row.exactExcerpt) || !Number.isSafeInteger(row.start) || row.start < 0 || !Number.isSafeInteger(row.end)
      || row.end - row.start !== row.exactExcerpt.length || row.coordinateSystem !== 'UTF16_CODE_UNIT'
      || !sourceHash(row.excerptHash) || !sourceHash(row.sourceHash) || !sourceHash(row.captureTextHash)
      || !date(row.retrievedAt) || !Array.isArray(row.unknowns) || !Array.isArray(row.qualifications)
      || `sha256:${await evidencePackageTextHash(row.exactExcerpt)}` !== row.excerptHash) return false
    const register = body.evidenceRegister.find(item => item.evidenceObjectId === row.evidenceObjectId)
    if (register.excerptHash !== row.excerptHash || register.locator !== row.locator || register.qualificationEvidenceId !== row.evidenceObjectId) return false
    if (body.contentVersion) {
      const member = members.find(item => item.evidenceObjectId === row.evidenceObjectId)
      const source = frozen.body.membership.sources.find(item => item.sourceId === row.sourceId)
      const sections = frozen.body.membership.sections.filter(item => item.resolvedEvidenceIds.includes(row.evidenceObjectId)).map(item => item.sectionKey)
      if (row.certainty !== null || row.memberMaterialHash !== member.materialHash || row.sourceMaterialHash !== source?.materialHash
        || await evidencePackageHash(row.sectionKeys) !== await evidencePackageHash(sections)
        || row.mappingStatus !== (sections.length ? 'MAPPING_RECORDED' : 'UNASSIGNED / MAPPING_NOT_ESTABLISHED')
        || register.qualificationReceiptId !== (row.recordedNeutralQualification?.receiptId ?? null)
        || register.mappingStatus !== row.mappingStatus || await evidencePackageHash(register.sectionKeys) !== await evidencePackageHash(sections)) return false
      if (row.recordedNeutralQualification) {
        const verified = await verifyNeutralReceipt(row.neutralQualificationReceipt, { ...frozen.body.membership.scope,
          evidenceObjectId: row.evidenceObjectId, sourceId: row.sourceId })
        if (!verified || await evidencePackageHash(verified.body.qualification) !== await evidencePackageHash(row.recordedNeutralQualification)) return false
      } else if (row.neutralQualificationReceipt !== null) return false
      const neutral = row.recordedNeutralQualification
      if (!sourceHash(row.materialFingerprints?.evidenceFingerprint) || !sourceHash(row.materialFingerprints?.sourceFingerprint)) return false
      const bindingCurrency = !neutral ? 'ABSENT' : ['evidenceFingerprint', 'sourceFingerprint']
        .every(key => neutral.binding[key] === row.materialFingerprints[key]) ? 'MATCHES_CURRENT_MATERIAL' : 'STALE_MATERIAL'
      if (row.bindingCurrency !== bindingCurrency || row.qualificationProjection !== (neutral ? 'NEUTRAL_RECORDED_FACTS_NO_DRAFT_FALLBACK.v1'
        : row.recordedQualification ? 'AUTHORED_DRAFT_FACTS.v1' : 'NOT_RECORDED')) return false
      const facts = neutral ? bindingCurrency === 'MATCHES_CURRENT_MATERIAL' ? neutral.facts : {} : row.recordedQualification?.facts || {}
      for (const field of ['scope', 'currentness', 'time', 'historicalContext', 'attribution', 'permittedStatement', 'permittedInterpretation', 'limitations']) {
        if (row[field] !== (facts[field] ?? null)) return false
      }
      const prohibited = neutral ? facts.prohibitedInterpretation ? [facts.prohibitedInterpretation] : [] : facts.blockedStrongerClaim || []
      if (await evidencePackageHash(row.prohibitedInterpretations) !== await evidencePackageHash(prohibited)) return false
    }
  }
  if (body.contentVersion) {
    if (!exact(body.analysis.observations) || body.analysis.patterns.length || body.analysis.hypotheses.length) return false
    for (const statement of [...body.baseline.statements, ...body.analysis.observations]) {
      const row = body.qualificationLedger.find(item => item.evidenceObjectId === statement.evidenceObjectId)
      if (statement.statement !== row.exactExcerpt || statement.classification !== 'SOURCE_PRESENTED'
        || statement.qualificationEvidenceId !== row.evidenceObjectId
        || statement.qualificationReceiptId !== (row.recordedNeutralQualification?.receiptId ?? null)
        || statement.mappingStatus !== row.mappingStatus) return false
      for (const field of ['sectionKeys', 'qualifications', 'unknowns', 'permittedInterpretation', 'prohibitedInterpretations']) {
        if (await evidencePackageHash(statement[field]) !== await evidencePackageHash(row[field])) return false
      }
    }
    const unknowns = body.qualificationLedger.flatMap(row => row.unknowns.map(item => ({ ...item, evidenceIds: [row.evidenceObjectId] })))
    if (await evidencePackageHash(body.analysis.unknowns) !== await evidencePackageHash(unknowns)) return false
  }
  const analytical = [...Object.values(body.analysis).flat(), ...body.baseline.statements]
  return analytical.every(item => ids(item.evidenceIds) && item.evidenceIds.length > 0
    && item.evidenceIds.every(id => members.some(member => member.evidenceObjectId === id)))
}

async function evidencePackageTextHash(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
