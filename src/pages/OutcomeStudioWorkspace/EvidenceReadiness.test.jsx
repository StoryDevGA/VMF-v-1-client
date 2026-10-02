import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EvidenceReadiness } from './OutcomeStudioWorkspace.jsx'

describe('Evidence handoff readiness', () => {
  it('shows the exact unresolved section, stored reference, missing input and recovery action', () => {
    render(<EvidenceReadiness evidence={{ status: 'CLARIFICATION_REQUIRED', canExecute: false,
      contractHash: 'private-hash', contractJson: 'private-contract',
      sectionLedger: [{ targetSectionKey: 'economics', heading: 'Economics', required: true, status: 'PARTIAL' },
        { targetSectionKey: 'appendix', heading: 'Appendix', required: false, status: 'OPTIONAL' }],
      clarification: { required: true, questions: [{ sectionKey: 'economics', sourceSectionKey: 'value_model',
        missingReference: 'scoped_view:legacy-42', missingInput: 'validationStatus',
        question: 'Which current evidence validates the economic claim?',
        nextAction: 'CLARIFY_GOVERNED_SOURCE_AND_RE_RESOLVE' }] },
    }} />)
    expect(screen.getByText(/Partially supported; remaining claims or references need clarification\./)).toBeInTheDocument()
    expect(screen.getByText('Section: economics')).toBeInTheDocument()
    expect(screen.getByText('Source section: value_model')).toBeInTheDocument()
    expect(screen.getByText('Reference: scoped_view:legacy-42')).toBeInTheDocument()
    expect(screen.getByText('Missing input: validationStatus')).toBeInTheDocument()
    expect(screen.getByText('Which current evidence validates the economic claim?')).toBeInTheDocument()
    expect(screen.getByText('Next action: Review the named evidence through the governed runtime workflow, then re-resolve this request.')).toBeInTheDocument()
    expect(screen.queryByText(/CLARIFY_GOVERNED_SOURCE_AND_RE_RESOLVE/)).not.toBeInTheDocument()
    expect(screen.getByText(/Optional; omitted as permitted/)).toBeInTheDocument()
    expect(screen.queryByText(/private-hash|private-contract/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Ready to Draft\./)).not.toBeInTheDocument()
  })

  it('distinguishes metadata from support and retains qualified contradiction candidates', () => {
    render(<EvidenceReadiness evidence={{ sectionLedger: [{ heading: 'Decision', required: true, status: 'METADATA_ONLY' }],
      clarification: { required: true }, contradictionLedger: [{ candidateId: 'candidate-1',
        disposition: 'COMPATIBLE_QUALIFICATION', evidenceReferences: ['fact-1', 'fact-2'], affectedSectionKeys: ['decision'] },
      { candidateId: 'candidate-2', disposition: 'SOURCE_REVIEWED_NOT_CONTRADICTORY', evidenceReferences: ['fact-3', 'fact-4'] }],
    }} />)
    expect(screen.getByText(/Metadata only; no admissible customer claim supports this section\./)).toBeInTheDocument()
    expect(screen.getByText(/Compatible qualification; retained for review/)).toBeInTheDocument()
    expect(screen.getByText('References: fact-1, fact-2')).toBeInTheDocument()
    expect(screen.getByText('Affected sections: decision')).toBeInTheDocument()
    expect(screen.getByText(/Reviewed as not contradictory; source review retained/)).toBeInTheDocument()
  })

  it('requires a saved executable handoff for Ready to Draft, regardless of diagnostic completeness', () => {
    const evidence = { status: 'READY_TO_DRAFT', canExecute: false, sectionLedger: [], clarification: { required: true } }
    const { rerender } = render(<EvidenceReadiness evidence={evidence}
      currentSnapshot={{ completeness: 'COMPLETE', totalEvidenceCount: 853, projectedEvidenceCount: 62 }} />)
    expect(screen.queryByText(/Ready to Draft\./)).not.toBeInTheDocument()
    rerender(<EvidenceReadiness evidence={{ ...evidence, canExecute: true, clarification: { required: false } }} />)
    expect(screen.getByText('Ready to Draft. The saved evidence handoff supports drafting. ARL meaning review is still required.')).toBeInTheDocument()
  })
})
