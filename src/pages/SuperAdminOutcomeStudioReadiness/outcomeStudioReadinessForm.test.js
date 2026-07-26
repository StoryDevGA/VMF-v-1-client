import { describe, expect, it, vi } from 'vitest'
import {
  DEVELOPMENT_TEST_POLICY_VERSION,
  buildReadinessPayload,
  buildReferenceUploadPayload,
  createBlankReadinessForm,
  mapReadinessApiFieldErrors,
  mapReferenceApiFieldErrors,
  readReferenceFileBase64,
  toReadinessForm,
  updateDecisionStatus,
  validateReadinessForm,
  validateReferenceApprovalForm,
  validateReferenceSupersessionForm,
  validateReferenceUploadForm,
} from './outcomeStudioReadinessForm.js'

const approvedDecision = { status: 'APPROVED', productApproverName: 'Pat Product', productApproverRole: 'Product Owner', rationale: 'Approved for controlled testing.' }

describe('outcomeStudioReadinessForm', () => {
  it('keeps legacy evidence read-only by starting a blank Development/Test form', () => {
    const form = toReadinessForm({ data: { revision: 1, policyVersion: 'LEGACY_SLICE_5A_V1', rubric: { rubricKey: 'legacy-key' }, providerPosture: { vendor: 'legacy-provider' } } })
    expect(form).toEqual(createBlankReadinessForm())
    expect(form.rubric.rubricKey).toBe('')
  })

  it('hydrates only editable fields from a Development/Test projection', () => {
    const response = { data: { policyVersion: DEVELOPMENT_TEST_POLICY_VERSION, rubric: { rubricKey: 'quality-rubric', rubricVersion: '1.0', threshold: 88, decision: { ...approvedDecision, recordedBy: { id: 'server' }, recordedAt: '2026-07-21' } }, providerPolicy: { providerKey: 'openai', model: 'approved-model', decision: approvedDecision, environment: 'TEST', safeContextPolicyKey: 'SERVER', failurePosture: 'FAIL_CLOSED' }, testingApproval: { purpose: 'SERVER', decision: approvedDecision }, blockers: [], gateResults: [], contentHash: 'server' } }
    const form = toReadinessForm(response)
    expect(form.rubric).toEqual(expect.objectContaining({ rubricKey: 'quality-rubric', rubricVersion: '1.0', threshold: 88, decision: approvedDecision }))
    expect(form.providerPolicy).toEqual({ providerKey: 'openai', model: 'approved-model', decision: approvedDecision })
    expect(form.testingApproval).toEqual({ decision: approvedDecision })
    expect(JSON.stringify(form)).not.toMatch(/recordedBy|recordedAt|contentHash|safeContextPolicyKey|failurePosture|purpose/)
  })

  it('builds the exact client-owned readiness payload', () => {
    const form = { rubric: { rubricKey: 'quality-rubric', rubricVersion: '1.0', threshold: '90', decision: approvedDecision }, providerPolicy: { providerKey: 'approved-provider', model: 'approved-model', decision: approvedDecision }, testingApproval: { decision: approvedDecision } }
    const payload = buildReadinessPayload(form, 4)
    expect(payload).toEqual({ expectedRevision: 4, rubric: { rubricKey: 'quality-rubric', rubricVersion: '1.0', threshold: 90, decision: approvedDecision }, providerPolicy: { providerKey: 'approved-provider', model: 'approved-model', decision: approvedDecision }, testingApproval: { decision: approvedDecision } })
    expect(JSON.stringify(payload)).not.toMatch(/policyVersion|environment|safeContext|failurePosture|recorded|verdict|blockers|contentHash|testReferences/)
  })

  it('validates identifiers, threshold, model, and decision attribution bounds', () => {
    const form = createBlankReadinessForm()
    expect(validateReadinessForm(form)).toEqual(expect.objectContaining({ 'rubric.rubricKey': expect.any(String), 'rubric.rubricVersion': expect.any(String), 'providerPolicy.providerKey': expect.any(String), 'providerPolicy.model': expect.any(String) }))
    form.rubric = { rubricKey: 'Bad Key', rubricVersion: '.bad', threshold: 101, decision: { ...approvedDecision, productApproverName: '' } }
    form.providerPolicy = { providerKey: 'bad key', model: 'x'.repeat(161), decision: approvedDecision }
    form.testingApproval.decision = { status: 'OPEN', productApproverName: 'must clear', productApproverRole: '', rationale: '' }
    expect(validateReadinessForm(form)).toEqual(expect.objectContaining({ 'rubric.rubricKey': expect.any(String), 'rubric.rubricVersion': expect.any(String), 'rubric.threshold': expect.any(String), 'rubric.decision.productApproverName': expect.any(String), 'providerPolicy.providerKey': expect.any(String), 'providerPolicy.model': expect.any(String), 'testingApproval.decision.productApproverName': expect.any(String) }))
  })

  it('clears Product attribution when a decision returns to OPEN', () => {
    expect(updateDecisionStatus(approvedDecision, 'OPEN')).toEqual({ status: 'OPEN', productApproverName: '', productApproverRole: '', rationale: '' })
  })

  it('maps readiness and reference backend field paths without binding unknown fields', () => {
    expect(mapReadinessApiFieldErrors({ data: { error: { message: 'Bad key', details: { path: 'body.rubric.rubricKey' } } } })).toEqual({ 'rubric.rubricKey': 'Bad key' })
    expect(mapReadinessApiFieldErrors({ details: { path: 'body.createdBy' } })).toEqual({})
    expect(mapReferenceApiFieldErrors({ data: { error: { message: 'Bad bytes', details: { field: 'body.contentBase64' } } } })).toEqual({ file: 'Bad bytes' })
    expect(mapReferenceApiFieldErrors({ data: { error: { message: 'Bad title', details: { field: 'body.title' } } } })).toEqual({ title: 'Bad title' })
  })

  it('rejects invalid PDF metadata before reading', () => {
    const read = vi.fn()
    const form = { family: 'PROFESSIONAL_DOCUMENT', title: 'Reference', purpose: '', file: { name: 'reference.txt', type: 'text/plain', size: 20, arrayBuffer: read } }
    expect(validateReferenceUploadForm(form)).toEqual({ file: 'Select a PDF filename without a path' })
    expect(read).not.toHaveBeenCalled()
    expect(validateReferenceUploadForm({ ...form, file: { name: 'reference.pdf', type: 'application/pdf', size: 10_000_001 } })).toEqual({ file: 'Select a PDF up to 10 MB' })
  })

  it('reads canonical base64 and builds the exact upload payload', async () => {
    const file = { name: 'reference.pdf', type: 'application/pdf', size: 4, arrayBuffer: vi.fn().mockResolvedValue(Uint8Array.from([37, 80, 68, 70]).buffer) }
    const contentBase64 = await readReferenceFileBase64(file)
    expect(contentBase64).toBe('JVBERg==')
    expect(buildReferenceUploadPayload({ family: 'INFOGRAPHIC', title: ' Example ', purpose: ' Purpose ', file }, contentBase64)).toEqual({ family: 'INFOGRAPHIC', title: 'Example', purpose: 'Purpose', originalFileName: 'reference.pdf', mimeType: 'application/pdf', contentBase64: 'JVBERg==' })
  })

  it('validates approval and same-family approved supersession', () => {
    expect(validateReferenceApprovalForm({ approverName: '', approverRole: '', rationale: '' })).toEqual(expect.objectContaining({ approverName: expect.any(String), approverRole: expect.any(String), rationale: expect.any(String) }))
    const source = { referenceKey: 'source', family: 'PRESENTATION' }
    const references = [{ referenceKey: 'replacement', family: 'PRESENTATION', status: 'APPROVED' }, { referenceKey: 'wrong', family: 'INFOGRAPHIC', status: 'APPROVED' }]
    expect(validateReferenceSupersessionForm({ replacementReferenceKey: 'replacement', reason: 'Improved example' }, source, references)).toEqual({})
    expect(validateReferenceSupersessionForm({ replacementReferenceKey: 'wrong', reason: '' }, source, references)).toEqual(expect.objectContaining({ replacementReferenceKey: expect.any(String), reason: expect.any(String) }))
  })
})
