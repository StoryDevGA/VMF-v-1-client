import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToasterProvider } from '../../components/Toaster'
import { formatDateTime } from '../../utils/dateTime.js'
import {
  usePlanRuntimeOutcomeRequestMutation,
  useConfirmRuntimeOutcomeRequestPlanMutation,
  useLazyRetrieveRuntimeOutcomeRequestPlanQuery,
  useApproveRuntimeOutcomeDraftMutation,
  useCreateRuntimeOutcomeSessionMutation,
  useDiscardRuntimeOutcomeDraftMutation,
  useGenerateRuntimeOutcomeResponseMutation,
  useGetRuntimeOutcomeAssetRenderOutputsQuery,
  useGetRuntimeOutcomeStudioQuery,
  useGetRuntimeOutcomeStudioReadinessQuery,
  useGetRuntimeOutcomeSessionQuery,
  useLazyExportRuntimeOutcomeAssetQuery,
  useLazyGetRuntimeOutcomeSessionQuery,
  useLazyGetRuntimeOutcomeAssetPreviewQuery,
  useLazyGetRuntimeOutcomeAssetQuery,
  useLazyGetRuntimeOutcomeDraftCompareQuery,
  useLazyGetRuntimeOutcomeDraftPreviewQuery,
  usePublishRuntimeOutcomeAssetMutation,
  useRenderRuntimeOutcomeAssetMutation,
  useReviseRuntimeOutcomeAssetMutation,
  useSubmitRuntimeOutcomeMessageMutation,
  useUpdateRuntimeOutcomeSessionFromLatestTruthMutation,
} from '../../store/api/runtimeInstanceApi.js'
import OutcomeStudioWorkspace from './OutcomeStudioWorkspace.jsx'

const testScope = vi.hoisted(() => ({ customerId: 'customer-001', tenantId: 'tenant-001' }))
const authState = vi.hoisted(() => ({ revision: 0 }))
vi.mock('../../utils/tokenStorage.js', async (importOriginal) => ({
  ...await importOriginal(), getSessionRevision: () => authState.revision,
}))

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: () => testScope,
}))

vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  usePlanRuntimeOutcomeRequestMutation: vi.fn(),
  useConfirmRuntimeOutcomeRequestPlanMutation: vi.fn(),
  useLazyRetrieveRuntimeOutcomeRequestPlanQuery: vi.fn(),
  useApproveRuntimeOutcomeDraftMutation: vi.fn(),
  useCreateRuntimeOutcomeSessionMutation: vi.fn(),
  useDiscardRuntimeOutcomeDraftMutation: vi.fn(),
  useGenerateRuntimeOutcomeResponseMutation: vi.fn(),
  useGetRuntimeOutcomeAssetRenderOutputsQuery: vi.fn(),
  useGetRuntimeOutcomeStudioQuery: vi.fn(),
  useGetRuntimeOutcomeStudioReadinessQuery: vi.fn(),
  useGetRuntimeOutcomeSessionQuery: vi.fn(),
  useLazyExportRuntimeOutcomeAssetQuery: vi.fn(),
  useLazyGetRuntimeOutcomeSessionQuery: vi.fn(),
  useLazyGetRuntimeOutcomeAssetPreviewQuery: vi.fn(),
  useLazyGetRuntimeOutcomeAssetQuery: vi.fn(),
  useLazyGetRuntimeOutcomeDraftCompareQuery: vi.fn(),
  useLazyGetRuntimeOutcomeDraftPreviewQuery: vi.fn(),
  usePublishRuntimeOutcomeAssetMutation: vi.fn(),
  useRenderRuntimeOutcomeAssetMutation: vi.fn(),
  useReviseRuntimeOutcomeAssetMutation: vi.fn(),
  useSubmitRuntimeOutcomeMessageMutation: vi.fn(),
  useUpdateRuntimeOutcomeSessionFromLatestTruthMutation: vi.fn(),
}))

const refetchStudio = vi.fn()
const planRequest = vi.fn()
const confirmPlan = vi.fn()
const retrievePlan = vi.fn()
const refetchReadiness = vi.fn()
const refetchSession = vi.fn()
const createSession = vi.fn()
const discardDraft = vi.fn()
const approveDraft = vi.fn()
const submitMessage = vi.fn()
const generateResponse = vi.fn()
const publishAsset = vi.fn()
const renderAsset = vi.fn()
const reviseAsset = vi.fn()
const exportAsset = vi.fn()
const loadAsset = vi.fn()
const loadPreview = vi.fn()
const loadDraftCompare = vi.fn()
const loadDraftPreview = vi.fn()
const loadSessionForReconciliation = vi.fn()

const resolvedMutation = (value = { data: {} }) => ({ unwrap: vi.fn().mockResolvedValue(value) })

const planningRequestId = '11111111-1111-4111-8111-111111111111'
const exactParlonPrompt = 'Create a Commercial Strategy and Decision Paper for Parlon leadership using the current governed Parlon evidence base. Focus on how Parlon should move from a coherent replacement proposition to a repeatable, evidence-backed buying decision system. Preserve all evidence boundaries, claim restrictions and governance gates.'
const clarificationReceipt = (overrides = {}) => ({
  contractVersion: 'ss-030.clarification-execution-receipt.v1',
  stageKey: 'CLARIFICATION',
  status: 'PASSED',
  receiptId: 'clarification_receipt_1',
  requestId: planningRequestId,
  requestHash: 'request-hash-1',
  intentFingerprint: 'intent-fingerprint-1',
  handoffFingerprint: 'handoff-fingerprint-1',
  confirmedBy: 'user-001',
  executedAt: '2026-09-17T10:00:00.000Z',
  ...overrides,
})
const confirmationIntent = (overrides = {}) => ({
  originalRequest: exactParlonPrompt,
  requestedOutputTypeKey: 'commercial-strategy-decision-paper',
  outputTypeLabel: 'Commercial Strategy and Decision Paper',
  audience: ['Parlon leadership'],
  decisionPurpose: 'Move from a coherent replacement proposition to a repeatable, evidence-backed buying decision system.',
  evidenceSource: 'Current governed Parlon evidence base',
  constraints: ['Preserve evidence boundaries', 'Preserve claim restrictions', 'Preserve governance gates'],
  format: 'DOCUMENT',
  channel: '',
  resolutionBasis: {
    requestedOutputTypeKey: 'INFERRED_FROM_REQUEST',
    audience: 'EXPLICIT',
    decisionPurpose: 'EXPLICIT',
    evidenceSource: 'EXPLICIT',
    constraints: 'EXPLICIT',
    format: 'GOVERNED_DEFAULT',
    channel: 'OPTIONAL_UNSPECIFIED',
  },
  missingRequiredFields: [],
  clarificationQuestions: [],
  selectedSchema: 'commercial-strategy-decision-paper.v1',
  knowledgePackSummary: ['Parlon governed evidence'],
  ...overrides,
})
const planResult = (overrides = {}) => ({
  status: 'CLARIFICATION_REQUIRED', requestId: planningRequestId,
  continuation: 'receipt-1', question: 'What decision should this output support?',
  execution: { status: 'BLOCKED', canExecute: false, reason: 'REQUEST_EXECUTION_NOT_ENABLED' },
  ...overrides,
})
const savedPlan = () => planResult({
  status: 'SAVED', continuation: 'saved-receipt', question: '',
  intent: confirmationIntent(),
  execution: { status: 'READY', canExecute: true, reason: '' },
  plan: {
    planId: 'outcome_kcp_22222222-2222-4222-8222-222222222222',
    planVersion: 1,
    currentness: 'CURRENT',
    clarificationReceipt: clarificationReceipt(),
  },
})
const assertNoExecution = () => {
  expect(createSession).not.toHaveBeenCalled()
  expect(submitMessage).not.toHaveBeenCalled()
  expect(generateResponse).not.toHaveBeenCalled()
}

const studio = {
  readiness: {
    state: 'READY',
    canStartSession: true,
    canReason: true,
    summary: 'Outcome Studio can start governed sessions.',
    blockers: [],
    frameworkHandoff: {
      status: 'READY',
      contractVersion: 'ss-011.framework-to-outcome-studio.evidence-to-knowledge.v1',
      currentness: 'CURRENT',
    },
    safetyGates: {
      responseGenerationAvailable: true,
      gates: [{ code: 'RESPONSE_GENERATION_ENGINE', label: 'Response Generation Engine', status: 'PASSED', message: 'Generation prerequisites passed.' }],
    },
  },
  information: {
    status: 'PROJECTED',
    currentness: 'CURRENT',
    sourceOutput: {
      outputAssetId: 'framework_handoff_fixture',
      sourceType: 'FRAMEWORK_HANDOFF',
    },
  },
  conversation: { enabled: true, requestMaxLength: 2000 },
  safetyGates: {
    status: 'READY',
    responseGenerationAvailable: true,
  },
  governanceEvidence: {
    notice: 'Knowledge Pack evidence is server-resolved and stage-specific usage is recorded only when persisted.',
    stages: ['CLARIFICATION', 'GUARDRAILS', 'VALIDATION', 'OUTCOME_READINESS'].map((key) => ({
      key,
      evidenceLabel: 'Recorded on this governed session',
      knowledgePacks: [{
        packKey: 'truth-pack',
        label: 'Verified truth pack',
        semanticVersion: '1.2.0',
        roles: ['Required business guidance'],
        assignmentStatus: 'STAGE_ASSIGNED',
        evidenceLabel: 'Resolved for this stage',
        executionStatus: 'PASSED',
        executionChecks: [{ key: 'PROVIDER_COMPLETED', status: 'PASSED', message: 'Provider completed.' }],
        projectedEntryCount: 1,
        suppliedEntryCount: 1,
        suppliedCategories: ['BUSINESS_GUIDANCE'],
      }],
      inputs: [{
        key: `${key.toLowerCase()}-input`,
        label: 'Runtime context',
        status: 'RECORDED',
        value: 'VALUE_NARRATIVE · VMF · vmf-standard-2-3-1',
      }],
      checks: [],
    })),
  },
  deliverables: {
    available: [{
      key: 'board-narrative',
      label: 'Board Narrative',
      formats: [{ format: 'PDF', label: 'PDF', extension: 'pdf', mimeType: 'application/pdf' }],
    }],
  },
  sessions: [{
    sessionId: 'session-1',
    status: 'ACTIVE',
    requestedOutputTypeKey: 'board-narrative',
    informationStatus: { status: 'CURRENT', currentness: 'CURRENT' },
  }],
  assets: [{
    outcomeAssetId: 'asset-1',
    title: 'Board Narrative',
    outputTypeCapabilityKey: 'board-narrative',
    status: 'APPROVED',
    currentVersionId: 'version-1',
    currentVersionNumber: 1,
    informationStatus: { status: 'CURRENT', currentness: 'CURRENT' },
    distributionAvailable: true,
    generatedAt: '2026-07-17T10:15:00.000Z',
    customerContent: { markdown: 'Raw customer payload must not render.' },
    knowledgePackBinding: { internal: 'Hidden platform detail' },
  }],
}

const session = {
  sessionId: 'session-1',
  requestId: planningRequestId,
  clarificationReceipt: clarificationReceipt(),
  status: 'ACTIVE',
  requestedOutputTypeKey: 'board-narrative',
  informationStatus: { status: 'CURRENT', currentness: 'CURRENT' },
  messages: [{
    messageId: 'message-1',
    content: 'Prepare the board narrative.',
    status: 'SUBMITTED',
    responseStatus: 'PENDING_RESPONSE',
    submittedAt: '2026-07-17T09:30:00.000Z',
    generatedResponse: 'Hidden generated response',
  }],
  drafts: [{
    draftId: 'draft-1',
    title: 'Board Narrative Draft',
    status: 'ACTIVE',
    currentIterationNumber: 2,
    currentIterationId: 'iteration-2',
    updatedAt: '2026-07-17T10:00:00.000Z',
    informationStatus: { status: 'CURRENT', currentness: 'CURRENT' },
    contentReview: { status: 'PASS', result: 'ALLOW' },
    approvalReadiness: {
      contractVersion: 'outcome-studio.execution-approval-readiness.v2',
      status: 'PASSED',
      approvalAvailable: true,
      blockerReason: '',
      message: 'All required execution evidence passed for this exact draft version.',
      expectedPackCount: 1,
      passedPackCount: 1,
      requiredRuntimeCheckCount: 4,
      passedRuntimeCheckCount: 4,
    },
    approvalAvailable: true,
  }],
}

const RuntimeSwitch = () => {
  const navigate = useNavigate()
  return <button onClick={() => navigate('/app/runtime/value-narrative-002/outcome-studio')}>Switch test runtime</button>
}

const makePage = (initialEntry = {
  pathname: '/app/runtime/value-narrative-001/outcome-studio',
  state: {
    from: '/app/runtime/value-narrative-001',
    returnState: { runtimeWorkspace: { activeWorkspaceKey: 'customer_problem' } },
  },
}) => (
  <ToasterProvider>
    <MemoryRouter initialEntries={[initialEntry]}>
      <RuntimeSwitch />
      <Routes>
        <Route path="/app/runtime/:runtimeInstanceId/outcome-studio" element={<OutcomeStudioWorkspace />} />
        <Route path="/app/runtime/:runtimeInstanceId" element={<div>Execution Workspace Return</div>} />
      </Routes>
    </MemoryRouter>
  </ToasterProvider>
)

const renderPage = (initialEntry) => render(makePage(initialEntry))

const makeMessage = (number) => ({
  messageId: `message-${number}`,
  content: `Request ${number}`,
  status: 'SUBMITTED',
  responseStatus: 'PENDING_RESPONSE',
  submittedAt: `2026-07-17T09:${String(number).padStart(2, '0')}:00.000Z`,
})

describe('OutcomeStudioWorkspace', () => {
  it('preserves present falsy identifiers while skipping only nullish fields', () => {
    expect(OutcomeStudioWorkspace.idOf({ messageId: 0, id: 'message-1' }, ['messageId', 'id'])).toBe('0')
    expect(OutcomeStudioWorkspace.idOf({ messageId: '', id: 'message-1' }, ['messageId', 'id'])).toBe('')
    expect(OutcomeStudioWorkspace.idOf({ messageId: null, id: 'message-1' }, ['messageId', 'id'])).toBe('message-1')
  })

  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(testScope, { customerId: 'customer-001', tenantId: 'tenant-001' })
    authState.revision = 0
    planRequest.mockReset().mockReturnValue(resolvedMutation({ data: planResult() }))
    confirmPlan.mockReset().mockReturnValue(resolvedMutation({ data: savedPlan() }))
    retrievePlan.mockReset().mockReturnValue(resolvedMutation({ data: savedPlan() }))
    usePlanRuntimeOutcomeRequestMutation.mockReturnValue([planRequest, { isLoading: false }])
    useConfirmRuntimeOutcomeRequestPlanMutation.mockReturnValue([confirmPlan, { isLoading: false }])
    useLazyRetrieveRuntimeOutcomeRequestPlanQuery.mockReturnValue([retrievePlan, { isFetching: false }])
    refetchStudio.mockResolvedValue({ data: studio })
    refetchReadiness.mockResolvedValue({ data: studio.readiness })
    refetchSession.mockResolvedValue({ data: session })
    createSession.mockReturnValue(resolvedMutation({ data: { sessionId: 'session-new' } }))
    discardDraft.mockReturnValue(resolvedMutation({ data: { draft: { ...session.drafts[0], status: 'DISCARDED' } } }))
    approveDraft.mockReturnValue(resolvedMutation())
    submitMessage.mockReturnValue(resolvedMutation())
    generateResponse.mockReturnValue(resolvedMutation())
    publishAsset.mockReturnValue(resolvedMutation())
    renderAsset.mockReturnValue(resolvedMutation({ data: { filename: 'board-narrative.pdf', content: 'PDF' } }))
    reviseAsset.mockReturnValue(resolvedMutation({ data: { draft: { ...session.drafts[0], draftId: 'draft-revised' } } }))
    exportAsset.mockReturnValue(resolvedMutation({ data: { filename: 'board-narrative.pdf', content: 'PDF' } }))
    loadAsset.mockResolvedValue({ data: { outcomeAssetId: 'asset-1', versions: [] } })
    loadPreview.mockResolvedValue({ data: { outcomeAssetId: 'asset-1' } })
    loadSessionForReconciliation.mockReturnValue(resolvedMutation({ data: session }))
    loadDraftPreview.mockReturnValue(resolvedMutation({
      data: {
        draftId: 'draft-1',
        draftIterationId: 'iteration-2',
        iterationNumber: 2,
        title: 'Board Narrative Draft',
        previewAvailable: true,
        contentFormat: 'MARKDOWN',
        markdown: '# Board Narrative Draft\n\nCustomer-safe working content.',
        sections: [],
      },
    }))
    loadDraftCompare.mockReturnValue(resolvedMutation({
      data: {
        draftId: 'draft-1',
        compareAvailable: true,
        from: {
          draftIterationId: 'iteration-1',
          iterationNumber: 1,
          title: 'Board Narrative Draft',
          contentFormat: 'MARKDOWN',
          markdown: '# Board Narrative Draft\n\nPrevious customer-safe content.',
          sections: [],
        },
        to: {
          draftIterationId: 'iteration-2',
          iterationNumber: 2,
          title: 'Board Narrative Draft',
          contentFormat: 'MARKDOWN',
          markdown: '# Board Narrative Draft\n\nCurrent customer-safe content.',
          sections: [],
        },
      },
    }))

    useGetRuntimeOutcomeStudioQuery.mockReturnValue({ data: { data: studio }, isLoading: false, error: null, refetch: refetchStudio })
    useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({ data: { data: studio.readiness }, isLoading: false, error: null, refetch: refetchReadiness })
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({ data: { data: session }, isLoading: false, error: null, refetch: refetchSession })
    useCreateRuntimeOutcomeSessionMutation.mockReturnValue([createSession, { isLoading: false }])
    useSubmitRuntimeOutcomeMessageMutation.mockReturnValue([submitMessage, { isLoading: false }])
    useGenerateRuntimeOutcomeResponseMutation.mockReturnValue([generateResponse, { isLoading: false }])
    useGetRuntimeOutcomeAssetRenderOutputsQuery.mockReturnValue({ data: { data: { outputs: [] } }, isFetching: false, error: null })
    useUpdateRuntimeOutcomeSessionFromLatestTruthMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useApproveRuntimeOutcomeDraftMutation.mockReturnValue([approveDraft, { isLoading: false }])
    useDiscardRuntimeOutcomeDraftMutation.mockReturnValue([discardDraft, { isLoading: false }])
    usePublishRuntimeOutcomeAssetMutation.mockReturnValue([publishAsset, { isLoading: false }])
    useRenderRuntimeOutcomeAssetMutation.mockReturnValue([renderAsset, { isLoading: false }])
    useReviseRuntimeOutcomeAssetMutation.mockReturnValue([reviseAsset, { isLoading: false }])
    useLazyExportRuntimeOutcomeAssetQuery.mockReturnValue([exportAsset, { isFetching: false, error: null }])
    useLazyGetRuntimeOutcomeAssetQuery.mockReturnValue([loadAsset, { data: { data: { outcomeAssetId: 'asset-1', versions: [] } }, isFetching: false, error: null }])
    useLazyGetRuntimeOutcomeAssetPreviewQuery.mockReturnValue([loadPreview, { data: { data: { outcomeAssetId: 'asset-1', previewAvailable: true, sections: [{ key: 'summary', label: 'Executive Summary', body: 'Customer-safe preview.' }] } }, isFetching: false, error: null }])
    useLazyGetRuntimeOutcomeDraftCompareQuery.mockReturnValue([loadDraftCompare, { isFetching: false, error: null }])
    useLazyGetRuntimeOutcomeDraftPreviewQuery.mockReturnValue([loadDraftPreview, { isFetching: false, error: null }])
    useLazyGetRuntimeOutcomeSessionQuery.mockReturnValue([loadSessionForReconciliation, { isFetching: false, error: null }])
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:outcome-export'),
      revokeObjectURL: vi.fn(),
    })
    HTMLAnchorElement.prototype.click = vi.fn()
  })

  it('presents the standalone customer information architecture and server-generated time', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()

    expect(screen.getByRole('heading', { name: 'Outcome Studio' })).toBeInTheDocument()
    expect(container.querySelector('main')).toBeNull()
    expect(screen.getByRole('region', { name: /readiness and information/i })).toHaveTextContent('Outcome Studio can start governed sessions.')
    expect(screen.getByRole('region', { name: /readiness and information/i })).toHaveTextContent('Framework handoff')
    expect(screen.getByRole('region', { name: /readiness and information/i })).toHaveTextContent('Locked Framework Runtime handoff')
    expect(screen.getByRole('region', { name: /readiness and information/i })).toHaveTextContent('ss-011.framework-to-outcome-studio.evidence-to-knowledge.v1')
    expect(screen.getByRole('tab', { name: 'Conversation' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Working Drafts' })).toBeInTheDocument()
    expect(screen.getByText('Prepare the board narrative.')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
    const outputs = screen.getByRole('region', { name: /approved outputs/i })
    expect(outputs).toHaveTextContent('Generated 2026-07-17')
    expect(outputs).not.toHaveTextContent('Raw customer payload')
    expect(outputs).not.toHaveTextContent('Hidden platform detail')

    await user.click(within(outputs).getByRole('button', { name: 'Preview' }))
    expect(loadAsset).toHaveBeenCalledWith({ runtimeInstanceId: 'value-narrative-001', customerId: 'customer-001', tenantId: 'tenant-001', outcomeAssetId: 'asset-1' })
    expect(loadPreview).toHaveBeenCalledWith({ runtimeInstanceId: 'value-narrative-001', customerId: 'customer-001', tenantId: 'tenant-001', outcomeAssetId: 'asset-1' })
    expect(screen.getByRole('region', { name: /generated body preview/i })).toHaveTextContent('Customer-safe preview.')
  })

  it('keeps render-output list keys unique when backend identifiers are absent', async () => {
    const user = userEvent.setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const createdAt = '2026-09-14T10:30:45.000Z'
    useGetRuntimeOutcomeAssetRenderOutputsQuery.mockReturnValue({
      data: {
        data: {
          outputs: [
            { renderOutputId: '', format: 'PDF', status: 'READY', createdAt, artifact: { filename: 'first.pdf' } },
            { renderOutputId: '', format: 'PDF', status: 'READY', createdAt, artifact: { filename: 'second.pdf' } },
          ],
        },
      },
      isFetching: false,
      error: null,
    })

    try {
      renderPage()
      await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
      const outputs = screen.getByRole('region', { name: /approved outputs/i })
      await user.click(within(outputs).getByRole('button', { name: 'Preview' }))

      const renderOutputs = await screen.findByRole('region', { name: /render outputs/i })
      expect(within(renderOutputs).getAllByRole('listitem')).toHaveLength(2)
      expect(consoleError.mock.calls.some(([message]) => String(message).includes('same key'))).toBe(false)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('shows approved asset linkage and execution evidence in the separate Governance view', async () => {
    const user = userEvent.setup()
    const governanceEvidence = {
      record: {
        type: 'ASSET_VERSION',
        id: 'version-1',
        iterationId: 'iteration-2',
        versionNumber: 1,
      },
      runtimeContext: {
        runtimeInstanceKey: 'value-narrative-001',
        runtimeType: 'VALUE_NARRATIVE',
        frameworkKey: 'VMF',
        packageKey: 'vmf-standard',
        packageVersion: '2.3.1',
      },
      sourceOutput: {
        outputAssetId: 'source-asset-1',
        outputTypeKey: 'FRAMEWORK_DIAGRAM',
        outputTypeLabel: 'Framework Diagram',
        status: 'BOUND',
      },
      truthBinding: {
        truthSignatureId: 'truth-1',
        status: 'CERTIFIED',
        currentness: 'CURRENT',
        boundAt: '2026-08-11T12:00:00.000Z',
      },
      knowledgeResolution: {
        status: 'READY',
        manifestKey: 'outcome-studio',
        manifestVersion: '1.0.0',
        policyVersion: 'KP-004',
        activeCount: 2,
      },
      governedReasoning: {
        executionId: 'grr_exec_1',
        runtimeArtifactId: 'artifact-1',
        providerMode: 'LIVE_TEST',
        runtimeStateWriteStatus: 'WRITTEN',
        runtimeArtifactIsCertifiedTruth: true,
      },
      stages: [{
        key: 'OUTCOME_READINESS',
        knowledgePacks: [{
          packKey: 'rendering-layer',
          label: 'Rendering Layer',
          semanticVersion: '1.0.0',
          executionStatus: 'PASSED',
          executionChecks: [{ key: 'PROVIDER_COMPLETED', status: 'PASSED' }],
        }],
      }],
    }
    useLazyGetRuntimeOutcomeAssetQuery.mockReturnValue([
      loadAsset,
      {
        data: {
          data: {
            outcomeAssetId: 'asset-1',
            currentVersionId: 'version-1',
            currentVersionNumber: 1,
            governanceEvidence,
            versions: [{
              outcomeAssetVersionId: 'version-1',
              versionNumber: 1,
              governanceEvidence,
              contentReview: { result: 'ALLOW', checkedAt: '2026-08-11T12:01:00.000Z' },
            }],
          },
        },
        isFetching: false,
        error: null,
      },
    ])

    renderPage()
    await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('tab', { name: 'Governance' }))

    const preview = screen.getByRole('region', { name: /generated body preview/i })
    expect(within(preview).getByText('Asset identity').nextElementSibling).toHaveTextContent('asset-1')
    expect(within(preview).getByText('Approved version').nextElementSibling).toHaveTextContent('version-1')
    expect(preview).toHaveTextContent('Framework Diagram')
    expect(preview).toHaveTextContent('Current')
    expect(preview).toHaveTextContent('Certified')
    expect(preview).toHaveTextContent('grr_exec_1')
    expect(preview).toHaveTextContent('Rendering Layer')
    expect(preview).toHaveTextContent('Passed')
    expect(preview).not.toHaveTextContent('Raw customer payload')
    expect(preview).not.toHaveTextContent('Hidden platform detail')
  })

  it('shows Not recorded when approved asset linkage evidence is unavailable', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('tab', { name: 'Governance' }))

    const preview = screen.getByRole('region', { name: /generated body preview/i })
    expect(within(preview).getAllByText('Not recorded').length).toBeGreaterThan(0)
    expect(preview).toHaveTextContent('Knowledge Pack execution is not recorded for this asset version.')
    expect(preview).not.toHaveTextContent('Raw customer payload')
    expect(preview).not.toHaveTextContent('Hidden platform detail')
  })

  it('shows the governed stage path and surfaces the first blocked stage', () => {
    const blockedReadiness = {
      ...studio.readiness,
      state: 'BLOCKED',
      canReason: false,
      summary: 'Outcome Studio readiness is blocked.',
      blockers: [{ code: 'KNOWLEDGE_PACK_BINDING_MISSING', message: 'Knowledge Pack binding is required.' }],
      safetyGates: {
        gates: [{
          code: 'KNOWLEDGE_PACKS_BOUND',
          label: 'Knowledge Pack Binding',
          status: 'BLOCKED',
          message: 'Knowledge Pack binding is required.',
          blockerReason: 'Activate the required Knowledge Packs.',
        }],
        responseGenerationAvailable: false,
      },
    }
    const blockedStudio = {
      ...studio,
      readiness: blockedReadiness,
      safetyGates: { ...studio.safetyGates, responseGenerationAvailable: false },
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({ data: { data: blockedStudio }, isLoading: false, error: null, refetch: refetchStudio })
    useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({ data: { data: blockedReadiness }, isLoading: false, error: null, refetch: refetchReadiness })

    renderPage()

    const tracker = screen.getByRole('region', { name: /stage progress/i })
    expect(tracker).toHaveTextContent('Clarification')
    expect(tracker).toHaveTextContent('Guardrails')
    expect(tracker).toHaveTextContent('Validation')
    expect(tracker).toHaveTextContent('Outcome readiness')
    expect(within(tracker).getAllByRole('status', { name: 'Status: Blocked' })).toHaveLength(2)
    expect(tracker).toHaveTextContent('Knowledge Pack binding is required.')
    expect(tracker).toHaveTextContent('Activate the required Knowledge Packs.')
  })

  it('does not repeat the framework handoff status when currentness matches it', () => {
    const blockedReadiness = {
      ...studio.readiness,
      state: 'BLOCKED',
      summary: 'Outcome Studio readiness is blocked.',
      frameworkHandoff: {
        ...studio.readiness.frameworkHandoff,
        status: 'BLOCKED',
        currentness: 'BLOCKED',
      },
    }
    const blockedStudio = { ...studio, readiness: blockedReadiness }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({ data: { data: blockedStudio }, isLoading: false, error: null, refetch: refetchStudio })
    useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({ data: { data: blockedReadiness }, isLoading: false, error: null, refetch: refetchReadiness })

    renderPage()

    const frameworkHandoff = screen.getByText('Framework handoff').parentElement
    expect(frameworkHandoff).toHaveTextContent('Blocked')
    expect(frameworkHandoff).toHaveTextContent('ss-011.framework-to-outcome-studio.evidence-to-knowledge.v1')
    expect(frameworkHandoff.textContent).not.toContain('BlockedBlocked')
  })

  it.each(['UNKNOWN', 'PENDING', 'FAILED', undefined])('fails closed for a %s current safety check despite optimistic readiness flags', async (status) => {
    const user = userEvent.setup()
    const message = 'Executable composition has not been verified.'
    useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({
      data: { data: { ...studio.readiness, safetyGates: {
        responseGenerationAvailable: true,
        gates: [{ code: 'COMPOSITION', label: 'Composition', status, message }],
      } } }, isLoading: false, error: null,
    })
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: { data: { ...session, drafts: [], governanceEvidence: {
        stages: [{ key: 'GUARDRAILS', evidenceLabel: 'Historical session evidence', knowledgePacks: [],
          inputs: [{ key: 'safety-gates', label: 'Safety gates', status: 'UNKNOWN', value: '0/0 checks passed' }], checks: [] }],
      } } }, isLoading: false, error: null,
    })
    renderPage()
    expect(screen.getByRole('button', { name: 'Generate draft' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Generate draft' })).toHaveAccessibleDescription(message)
    expect(screen.getByRole('status', { name: 'Status: Generation blocked' })).toBeInTheDocument()
    const summary = screen.getByRole('region', { name: /readiness and information/i })
    expect(within(summary).getByText('Session readiness').parentElement).toHaveTextContent('Ready')
    expect(within(summary).queryByText('Status')).not.toBeInTheDocument()
    const tracker = screen.getByRole('region', { name: /stage progress/i })
    expect(within(tracker).getByLabelText('Stage result legend')).toHaveTextContent('pre-generation checks are not draft execution receipts')
    expect(within(tracker).getByLabelText('Stage result legend')).not.toHaveTextContent('exact draft version')
    expect(within(tracker).getByRole('img', { name: 'Guardrails: not passed' })).toBeInTheDocument()
    expect(tracker).not.toHaveTextContent('Generate Draft v1, then open')
    expect(tracker).toHaveTextContent(message)
    await user.click(within(tracker).getByRole('button', { name: 'Guardrails evidence details' }))
    const dialog = screen.getByRole('dialog', { name: 'Guardrails evidence' })
    expect(dialog).toHaveTextContent('Current pre-generation checks')
    expect(dialog).toHaveTextContent('0/1 checks passed')
    expect(dialog).not.toHaveTextContent('0/0 checks passed')
    expect(dialog).toHaveTextContent(message)
    expect(dialog).toHaveTextContent('not execution receipts')
    expect(generateResponse).not.toHaveBeenCalled()
  })

  it('shows readable schema and pack descriptors and isolates new planning from the old session receipt', async () => {
    const user = userEvent.setup()
    const newRequestId = '33333333-3333-4333-8333-333333333333'
    planRequest.mockReturnValue(resolvedMutation({ data: planResult({
      requestId: newRequestId, status: 'CONFIRMATION_REQUIRED', question: '',
      intent: confirmationIntent({
        selectedSchema: { key: 'strategy-schema', label: 'Strategy schema', semanticVersion: '1.2.0' },
        knowledgePackSummary: undefined,
        selectedKnowledgePacks: [
          { packKey: 'strategy-pack', label: 'Strategy guidance', semanticVersion: '2.0.0' },
          { packKey: 'arl-pack', label: 'Reasoning guidance', versionId: 'kpv-arl-internal-id' },
          { packKey: 'other-pack', label: 'Other guidance', version: 'kpv-other-internal-id' },
          { packKey: 'versioned-pack', label: 'Versioned guidance', version: '3.1.0' },
        ],
      }),
    }) }))
    renderPage()
    expect(screen.getByRole('img', { name: 'Clarification: passed' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Your request' }), { target: { value: exactParlonPrompt } })
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    const requestPlan = screen.getByRole('region', { name: 'Request plan' })
    expect(requestPlan).toHaveTextContent('Strategy schema · Version 1.2.0')
    expect(requestPlan).toHaveTextContent('Strategy guidance · Version 2.0.0')
    expect(requestPlan).toHaveTextContent('Reasoning guidance')
    expect(requestPlan).toHaveTextContent('Other guidance')
    expect(requestPlan).toHaveTextContent('Versioned guidance · Version 3.1.0')
    expect(requestPlan).not.toHaveTextContent('kpv-')
    expect(requestPlan).not.toHaveTextContent('"packKey"')
    expect(screen.getByRole('img', { name: 'Clarification: not passed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate draft' })).toBeDisabled()
    expect(planRequest.mock.calls[0][0].body).not.toHaveProperty('sessionId')
    assertNoExecution()
  })

  it('opens each stage evidence summary in its own standard dialog', async () => {
    const user = userEvent.setup()
    renderPage()

    const tracker = screen.getByRole('region', { name: /stage progress/i })
    const stageLabels = ['Clarification', 'Guardrails', 'Validation', 'Outcome readiness']
    expect(within(tracker).getAllByRole('button', { name: /evidence details/i })).toHaveLength(4)

    for (const stageLabel of stageLabels) {
      await user.click(within(tracker).getByRole('button', { name: `${stageLabel} evidence details` }))
      const dialog = screen.getByRole('dialog', { name: `${stageLabel} evidence` })
      expect(within(dialog).getByRole('img', { name: `${stageLabel}: ${['Clarification', 'Guardrails'].includes(stageLabel) ? 'passed' : 'not passed'}` })).toBeInTheDocument()
      expect(within(dialog).getByText('Verified truth pack')).toBeInTheDocument()
      expect(within(dialog).getByText('truth-pack · v1.2.0')).toBeInTheDocument()
      expect(within(dialog).getByText('VALUE_NARRATIVE · VMF · vmf-standard-2-3-1')).toBeInTheDocument()
      await user.click(within(dialog).getByRole('button', { name: 'Close' }))
      expect(screen.queryByRole('dialog', { name: `${stageLabel} evidence` })).not.toBeInTheDocument()
    }

    expect(within(tracker).getByText(/stage-specific usage is recorded only when persisted/i)).toBeInTheDocument()
  })

  it('uses the current active draft evidence before a draft is selected', async () => {
    const user = userEvent.setup()
    const draftEvidence = {
      ...studio.governanceEvidence,
      stages: [{
        key: 'GUARDRAILS',
        evidenceLabel: 'Recorded on this draft version',
        knowledgePacks: [{
          packKey: 'draft-receipt-pack',
          label: 'Draft receipt pack',
          semanticVersion: '2.0.0',
          roles: ['Required business guidance'],
          assignmentStatus: 'STAGE_ASSIGNED',
          evidenceLabel: 'Recorded on this draft version',
          executionStatus: 'PASSED',
          executionChecks: [{ key: 'PROVIDER_COMPLETED', status: 'PASSED', message: 'Draft receipt recorded.' }],
        }],
        inputs: [],
        checks: [],
      }],
    }
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...session,
          drafts: [{ ...session.drafts[0], governanceEvidence: draftEvidence }],
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })

    renderPage()

    const tracker = screen.getByRole('region', { name: /stage progress/i })
    await user.click(within(tracker).getByRole('button', { name: 'Guardrails evidence details' }))

    const dialog = screen.getByRole('dialog', { name: 'Guardrails evidence' })
    expect(within(dialog).getByText('Draft receipt pack')).toBeInTheDocument()
    expect(within(dialog).queryByText('Verified truth pack')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('img', { name: 'Draft receipt pack: execution passed' })).toBeInTheDocument()
  })

  it('does not pass Clarification from a request and binding evidence alone', () => {
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: { data: { ...session, requestId: undefined, clarificationReceipt: undefined } },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    renderPage()

    const tracker = screen.getByRole('region', { name: /stage progress/i })
    expect(within(tracker).getByRole('img', { name: 'Clarification: not passed' })).toBeInTheDocument()
    expect(tracker).toHaveTextContent('Clarification is waiting for a confirmed request receipt.')
    expect(within(tracker).getByRole('img', { name: 'Guardrails: passed' })).toBeInTheDocument()
    expect(within(tracker).getByRole('img', { name: 'Validation: not passed' })).toBeInTheDocument()
    expect(within(tracker).getByRole('img', { name: 'Outcome readiness: not passed' })).toBeInTheDocument()
    expect(tracker).toHaveTextContent('1/4 stages passed')
    expect(within(tracker).getByLabelText('Stage result legend')).toHaveTextContent('Tick = the displayed stage passed; pre-generation checks are not draft execution receipts')
    expect(within(tracker).getByLabelText('Stage result legend')).toHaveTextContent('Cross = not passed')
  })

  it('keeps each stage independent when exact-version approval evidence is not ready', async () => {
    const user = userEvent.setup()
    const blockedMessage = 'Approval is blocked until all required execution evidence passes for this exact draft version.'
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...session,
          drafts: [{
            ...session.drafts[0],
            approvalAvailable: false,
            approvalReadiness: {
              ...session.drafts[0].approvalReadiness,
              status: 'BLOCKED',
              approvalAvailable: false,
              blockerReason: 'EXECUTION_EVIDENCE_NOT_RECORDED',
              message: blockedMessage,
              passedPackCount: 0,
              passedRuntimeCheckCount: 0,
            },
          }],
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })

    renderPage()

    const tracker = screen.getByRole('region', { name: /stage progress/i })
    expect(within(tracker).getByRole('img', { name: 'Clarification: passed' })).toBeInTheDocument()
    expect(within(tracker).getByText('2/4 stages passed')).toBeInTheDocument()
    expect(within(tracker).queryByText(blockedMessage)).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    expect(screen.getByRole('button', { name: 'Preview' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Approve draft' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Approve draft' })).toHaveAccessibleDescription(blockedMessage)
  })

  it('shows truthful per-pack and runtime execution checks for debugging', async () => {
    const user = userEvent.setup()
    const executionPack = {
      ...studio.governanceEvidence.stages[2].knowledgePacks[0],
      executionStatus: 'PASSED',
      projectedEntryCount: 4,
      safeCandidateEntryCount: 5,
      suppliedEntryCount: 3,
      suppliedCategories: ['outputSchema', 'validationCriteria'],
      sharedContribution: true,
      projectionDisposition: 'PROJECTED',
      admissionDisposition: 'ADMITTED',
      executionChecks: [
        { key: 'RESOLUTION_VERIFIED', status: 'PASSED', evidenceKind: 'PACK_EXECUTION', message: 'Selected version hash verified.' },
        { key: 'VERSION_CONTENT_LOADED', status: 'PASSED', evidenceKind: 'PACK_EXECUTION', message: 'Exact version loaded.' },
        { key: 'SAFE_GUIDANCE_PROJECTED', status: 'PASSED', evidenceKind: 'PACK_EXECUTION', message: 'Four safe entries projected.' },
        { key: 'PROVIDER_CONTEXT_SUPPLIED', status: 'PASSED', message: 'Three entries supplied.' },
        { key: 'PROVIDER_COMPLETED', status: 'PASSED', message: 'Provider completed.' },
      ],
    }
    const bindingOnlyPack = {
      packKey: 'binding-only-pack',
      label: 'Binding-only pack',
      semanticVersion: '1.0.0',
      roles: ['Validation guidance'],
      assignmentStatus: 'STAGE_ASSIGNED',
      evidenceLabel: 'Binding recorded',
      executionStatus: 'PASSED',
      executionChecks: [],
    }
    const frameworkPack = {
      packKey: 'truth-certification-framework',
      label: 'Truth Certification Framework',
      semanticVersion: '1.0.0',
      roles: ['Post-generation validation'],
      assignmentStatus: 'STAGE_ASSIGNED',
      evidenceLabel: 'Framework execution failed',
      executionStatus: 'FAILED',
      executionChecks: [
        { key: 'DEPENDENCY_RECEIPT_SET_BOUND', status: 'FAILED', evidenceKind: 'PACK_RECEIPT', message: 'Sibling receipt set incomplete.' },
        { key: 'TRUTH_PRESERVATION_CONTROL', status: 'FAILED', evidenceKind: 'FRAMEWORK_CONTROL', message: 'Exact truth receipt missing.' },
        { key: 'LINEAGE_PRESERVATION_CONTROL', status: 'PASSED', evidenceKind: 'FRAMEWORK_CONTROL', message: 'Generation-time lineage retained.' },
      ],
    }
    const validationStage = {
      ...studio.governanceEvidence.stages[2],
      knowledgePacks: [executionPack, bindingOnlyPack, frameworkPack],
      inputs: [
        ...studio.governanceEvidence.stages[2].inputs,
        { key: 'missing-input', label: 'Content validation', status: 'NOT_RECORDED', value: 'No receipt' },
      ],
      checks: [{
        key: 'PROVIDER_RESPONSE_SCHEMA',
        status: 'PASSED',
        message: 'Strict provider response schema parsed successfully.',
        providerKey: 'openai',
        model: 'gpt-test',
        configurationVersion: 'OUTCOME_STUDIO_OPENAI_RESPONSES_V1',
        schemaName: 'governed_deliverable_v1',
        schemaVersion: '1',
        strict: true,
        requestId: 'req-safe',
        responseId: 'resp-safe',
        latencyMs: 42,
      }],
    }
    const evidenceStudio = {
      ...studio,
      governanceEvidence: {
        ...studio.governanceEvidence,
        stages: studio.governanceEvidence.stages.map((stage, index) => index === 2 ? validationStage : stage),
      },
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({ data: { data: evidenceStudio }, isLoading: false, error: null, refetch: refetchStudio })

    renderPage()
    const tracker = screen.getByRole('region', { name: /stage progress/i })
    const validationCard = within(tracker).getByText('Validation').closest('li')
    await user.click(within(validationCard).getByRole('button', { name: 'Validation evidence details' }))

    const validationDialog = screen.getByRole('dialog', { name: 'Validation evidence' })

    expect(within(validationDialog).getByRole('img', { name: 'Verified truth pack: execution passed' })).toBeInTheDocument()
    expect(within(validationDialog).getByRole('img', { name: 'Binding-only pack: execution not recorded' })).toBeInTheDocument()
    expect(within(validationDialog).getByRole('img', { name: 'Truth Certification Framework: execution not passed' })).toBeInTheDocument()
    expect(within(validationDialog).getByRole('img', { name: 'Truth Preservation Control: Failed' })).toBeInTheDocument()
    expect(within(validationDialog).getByRole('img', { name: 'Provider Context Supplied: passed' })).toBeInTheDocument()
    expect(within(validationDialog).getByRole('img', { name: 'Provider Response Schema: passed' })).toBeInTheDocument()
    expect(within(validationDialog).getByRole('img', { name: 'Content validation: Not Recorded' })).toBeInTheDocument()
    expect(validationDialog).toHaveTextContent('3 supplied / 4 projected')
    expect(validationDialog).toHaveTextContent('5 safe candidates · Projected · Admitted')
    expect(validationDialog).toHaveTextContent('shared/deduplicated contribution')
    expect(validationDialog).toHaveTextContent('Schema governed_deliverable_v1 v1')
    expect(validationDialog).toHaveTextContent('Request req-safe')
    expect(validationDialog).toHaveTextContent('42 ms')
    expect(validationDialog).toHaveTextContent('Evidence type: Pack execution')
    expect(validationDialog).toHaveTextContent('Evidence type: Pack receipt')
    expect(validationDialog).toHaveTextContent('Evidence type: Framework control')
    expect(validationDialog).toHaveTextContent('Evidence type: Evidence type not recorded')
  })

  it('marks the current draft preview as passed and binds the revision composer to the same draft', async () => {
    const user = userEvent.setup()
    const readyGates = [
      'SOURCE_OUTPUT_BOUND',
      'TRUTH_SIGNATURE_BOUND',
      'KNOWLEDGE_PACKS_BOUND',
      'PROMPT_PERSISTENCE_READY',
      'RESPONSE_GENERATION_ENGINE',
    ].map((code) => ({ code, status: 'PASSED', message: 'Passed.' }))
    const readyReadiness = {
      ...studio.readiness,
      safetyGates: { gates: readyGates, responseGenerationAvailable: true },
    }
    const readyStudio = {
      ...studio,
      readiness: readyReadiness,
      safetyGates: { ...studio.safetyGates, responseGenerationAvailable: true, gates: readyGates },
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({ data: { data: readyStudio }, isLoading: false, error: null, refetch: refetchStudio })
    useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({ data: { data: readyReadiness }, isLoading: false, error: null, refetch: refetchReadiness })

    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))

    const tracker = screen.getByRole('region', { name: /stage progress/i })
    expect(tracker).toHaveTextContent('Working Draft v2 is open in the in-context Preview surface.')
    expect(within(tracker).getAllByText('Passed').length).toBeGreaterThanOrEqual(2)

    await user.click(screen.getByRole('tab', { name: 'Conversation' }))
    expect(screen.getByText(/Board Narrative Draft · v2/)).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /composer bound to current draft/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit revision' })).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Revise this draft for the board.')
    await user.click(screen.getByRole('button', { name: 'Submit revision' }))
    expect(submitMessage).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001', customerId: 'customer-001', tenantId: 'tenant-001',
      sessionId: 'session-1', body: { prompt: 'Revise this draft for the board.' },
    })
    expect(planRequest).not.toHaveBeenCalled()
    expect(confirmPlan).not.toHaveBeenCalled()
  })

  it('previews the current working draft before approval', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    const workingDrafts = screen.getByRole('region', { name: /outcome studio working drafts/i })
    await user.click(within(workingDrafts).getByRole('button', { name: 'Preview' }))

    expect(loadDraftPreview).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      customerId: 'customer-001',
      tenantId: 'tenant-001',
      sessionId: 'session-1',
      draftId: 'draft-1',
    })
    const preview = screen.getByRole('region', { name: /outcome studio working draft preview/i })
    expect(preview).toHaveTextContent('Working Draft Preview')
    expect(preview).toHaveTextContent('Customer-safe working content.')
    expect(preview).not.toHaveTextContent('Hidden platform detail')
  })

  it('compares the verified previous and current draft versions in context', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    expect(loadDraftCompare).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      customerId: 'customer-001',
      tenantId: 'tenant-001',
      sessionId: 'session-1',
      draftId: 'draft-1',
    })

    const compareTab = screen.getByRole('tab', { name: 'Compare' })
    expect(compareTab).toBeEnabled()
    await user.click(compareTab)
    const compareView = within(screen.getByRole('region', { name: /outcome studio working draft preview/i })).getByRole('tabpanel')
    expect(compareView).toHaveTextContent('Previous customer-safe content.')
    expect(compareView).toHaveTextContent('Current customer-safe content.')
  })

  it('keeps Compare unavailable when the server cannot verify a previous draft version', async () => {
    loadDraftCompare.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: { error: { code: 'CONFLICT', state: { compareAvailable: false } } },
      }),
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    expect(screen.getByRole('tab', { name: 'Compare' })).toBeDisabled()
  })

  it('shows the shared spinner and suppresses stale content while a working draft preview loads', async () => {
    let resolvePreview
    loadDraftPreview.mockReturnValue({
      unwrap: vi.fn(() => new Promise((resolve) => {
        resolvePreview = resolve
      })),
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))

    expect(screen.getByLabelText('Loading working draft preview')).toBeInTheDocument()
    expect(screen.queryByText('Customer-safe working content.')).not.toBeInTheDocument()

    await act(async () => {
      resolvePreview({
        data: {
          draftId: 'draft-1',
          markdown: '# Loaded Draft\n\nFresh customer-safe content.',
          previewAvailable: true,
        },
      })
    })
    expect(screen.getByText('Fresh customer-safe content.')).toBeInTheDocument()
  })

  it('clears an earlier working draft preview and shows a customer-safe error after failure', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    const previewButton = screen.getByRole('button', { name: 'Preview' })
    await user.click(previewButton)
    expect(screen.getByText('Customer-safe working content.')).toBeInTheDocument()

    loadDraftPreview.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'CONFLICT',
            message: 'Internal validation detail must not render.',
            requestId: 'draft-preview-ref-1',
          },
        },
      }),
    })
    await user.click(previewButton)

    expect(screen.queryByText('Customer-safe working content.')).not.toBeInTheDocument()
    const preview = screen.getByRole('region', { name: /outcome studio working draft preview/i })
    expect(preview).toHaveTextContent('This draft preview is temporarily unavailable. Refresh and try again.')
    expect(preview).toHaveTextContent('Request ID: draft-preview-ref-1')
    expect(within(preview).getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('Internal validation detail must not render.')).not.toBeInTheDocument()
  })

  it('keeps the newest working draft preview when concurrent requests finish out of order', async () => {
    let resolveFirst
    let resolveSecond
    const sessionWithTwoDrafts = {
      ...session,
      drafts: [
        session.drafts[0],
        {
          ...session.drafts[0],
          draftId: 'draft-2',
          title: 'Proposal Draft',
          currentIterationId: 'iteration-proposal-1',
          currentIterationNumber: 1,
        },
      ],
    }
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: { data: sessionWithTwoDrafts },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    loadDraftPreview.mockImplementation(({ draftId }) => ({
      unwrap: vi.fn(() => new Promise((resolve) => {
        if (draftId === 'draft-1') resolveFirst = resolve
        else resolveSecond = resolve
      })),
    }))
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    const firstDraft = screen.getByRole('heading', { name: 'Board Narrative Draft' }).closest('li')
    const secondDraft = screen.getByRole('heading', { name: 'Proposal Draft' }).closest('li')
    await user.click(within(firstDraft).getByRole('button', { name: 'Preview' }))
    await user.click(within(secondDraft).getByRole('button', { name: 'Preview' }))

    await act(async () => {
      resolveSecond({
        data: {
          draftId: 'draft-2',
          draftIterationId: 'iteration-proposal-1',
          markdown: '# Proposal Draft\n\nNewest preview content.',
          previewAvailable: true,
        },
      })
    })
    expect(screen.getByText('Newest preview content.')).toBeInTheDocument()

    await act(async () => {
      resolveFirst({
        data: {
          draftId: 'draft-1',
          draftIterationId: 'iteration-2',
          markdown: '# Board Narrative\n\nOlder preview content.',
          previewAvailable: true,
        },
      })
    })
    expect(screen.getByText('Newest preview content.')).toBeInTheDocument()
    expect(screen.queryByText('Older preview content.')).not.toBeInTheDocument()
  })

  it('clears a selected preview when the working draft advances to a new iteration', async () => {
    const user = userEvent.setup()
    const view = renderPage()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    expect(screen.getByText('Customer-safe working content.')).toBeInTheDocument()

    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...session,
          drafts: [{
            ...session.drafts[0],
            currentIterationId: 'iteration-3',
            currentIterationNumber: 3,
          }],
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    view.rerender(makePage())

    expect(screen.queryByRole('region', { name: /outcome studio working draft preview/i }))
      .not.toBeInTheDocument()
    expect(screen.queryByText('Customer-safe working content.')).not.toBeInTheDocument()
  })

  it('discards an in-flight preview when the working draft advances to a new iteration', async () => {
    let resolvePreview
    loadDraftPreview.mockReturnValue({
      unwrap: vi.fn(() => new Promise((resolve) => {
        resolvePreview = resolve
      })),
    })
    const user = userEvent.setup()
    const view = renderPage()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    expect(screen.getByLabelText('Loading working draft preview')).toBeInTheDocument()

    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...session,
          drafts: [{
            ...session.drafts[0],
            currentIterationId: 'iteration-3',
            currentIterationNumber: 3,
          }],
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    view.rerender(makePage())

    await act(async () => {
      resolvePreview({
        data: {
          draftId: 'draft-1',
          draftIterationId: 'iteration-2',
          markdown: '# Board Narrative\n\nSuperseded preview content.',
          previewAvailable: true,
        },
      })
    })

    expect(screen.queryByRole('region', { name: /outcome studio working draft preview/i }))
      .not.toBeInTheDocument()
    expect(screen.queryByText('Superseded preview content.')).not.toBeInTheDocument()
  })

  it('shows recent requests first and expands the complete unmodified request history', async () => {
    const user = userEvent.setup()
    const messages = Array.from({ length: 6 }, (_, index) => makeMessage(index + 1))
    const originalMessages = structuredClone(messages)
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: { data: { ...session, messages } },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    renderPage()

    const history = screen.getByRole('list', { name: 'Outcome Studio session request history' })
    expect(within(history).queryByText('Request 1')).not.toBeInTheDocument()
    expect(within(history).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Request 6'),
      expect.stringContaining('Request 5'),
      expect.stringContaining('Request 4'),
      expect.stringContaining('Request 3'),
      expect.stringContaining('Request 2'),
    ])
    const viewAll = screen.getByRole('button', { name: 'View all requests' })
    expect(viewAll).toHaveAttribute('aria-controls', 'outcome-studio-request-history')
    expect(viewAll).toHaveAttribute('aria-expanded', 'false')
    const generateButtons = within(history).getAllByRole('button', { name: 'Generate draft' })
    expect(generateButtons).toHaveLength(5)
    await user.click(generateButtons[0])
    expect(generateResponse).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      customerId: 'customer-001',
      tenantId: 'tenant-001',
      sessionId: 'session-1',
      messageId: 'message-6',
      body: { allowReadyWithGaps: true },
    })

    await user.click(viewAll)
    expect(within(history).getByText('Request 1')).toBeInTheDocument()
    expect(within(history).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Request 6'),
      expect.stringContaining('Request 5'),
      expect.stringContaining('Request 4'),
      expect.stringContaining('Request 3'),
      expect.stringContaining('Request 2'),
      expect.stringContaining('Request 1'),
    ])
    const showRecent = screen.getByRole('button', { name: 'Show recent requests' })
    expect(showRecent).toHaveAttribute('aria-expanded', 'true')
    await user.click(showRecent)

    expect(within(history).queryByText('Request 1')).not.toBeInTheDocument()
    expect(messages).toEqual(originalMessages)
  })

  it('does not show request-history disclosure for five or fewer messages', () => {
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: { data: { ...session, messages: Array.from({ length: 5 }, (_, index) => makeMessage(index + 1)) } },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    renderPage()

    expect(screen.queryByRole('button', { name: 'View all requests' })).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Outcome Studio session request history' })).toHaveAttribute(
      'id',
      'outcome-studio-request-history',
    )
    expect(within(screen.getByRole('list', { name: 'Outcome Studio session request history' })).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Request 5'),
      expect.stringContaining('Request 4'),
      expect.stringContaining('Request 3'),
      expect.stringContaining('Request 2'),
      expect.stringContaining('Request 1'),
    ])
  })

  it('collapses an expanded request history when the active session changes', async () => {
    const user = userEvent.setup()
    const messages = Array.from({ length: 6 }, (_, index) => makeMessage(index + 1))
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: { data: { ...session, messages } },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    const view = renderPage()

    await user.click(screen.getByRole('button', { name: 'View all requests' }))
    expect(screen.getByRole('button', { name: 'Show recent requests' })).toHaveAttribute('aria-expanded', 'true')

    const nextSession = {
      ...session,
      sessionId: 'session-2',
      messages,
    }
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: {
        data: {
          ...studio,
          sessions: [{
            ...studio.sessions[0],
            sessionId: 'session-2',
          }],
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchStudio,
    })
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: { data: nextSession },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    view.rerender(makePage())

    expect(await screen.findByRole('button', { name: 'View all requests' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Request 1')).not.toBeInTheDocument()
  })

  it('does not treat a closed session as active', () => {
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: {
        data: {
          ...studio,
          sessions: [{ ...studio.sessions[0], status: 'CLOSED' }],
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchStudio,
    })
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    renderPage()

    expect(useGetRuntimeOutcomeSessionQuery).toHaveBeenCalledWith(
      { runtimeInstanceId: 'value-narrative-001', customerId: 'customer-001', tenantId: 'tenant-001', sessionId: '' },
      { skip: true },
    )
    expect(screen.getByText('No active session')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plan request' })).toBeDisabled()
    expect(screen.queryByText('Prepare the board narrative.')).not.toBeInTheDocument()
  })

  it('surfaces a session query failure with shared error support', () => {
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: {
        status: 503,
        data: {
          message: 'Conversation details are temporarily unavailable.',
          requestId: 'req-session-503',
        },
      },
      refetch: refetchSession,
    })
    renderPage()

    expect(screen.getByText('Conversation could not be loaded.')).toBeInTheDocument()
    const errorSupport = screen.getByRole('alert')
    expect(errorSupport).toHaveTextContent('Conversation details are temporarily unavailable.')
    expect(errorSupport).toHaveTextContent('req-session-503')
    expect(screen.queryByText('No session requests yet')).not.toBeInTheDocument()
  })

  it('prioritizes the shared session error over stale Working Drafts content', async () => {
    const user = userEvent.setup()
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: { data: session },
      isLoading: true,
      error: {
        status: 503,
        data: {
          error: {
            code: 'OUTCOME_ACTION_FAILED',
            message: 'Working draft details are temporarily unavailable.',
            requestId: 'req-drafts-503',
          },
        },
      },
      refetch: refetchSession,
    })
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))

    expect(screen.getByText('Working drafts could not be loaded.')).toBeInTheDocument()
    const errorSupport = screen.getByRole('alert')
    expect(errorSupport).toHaveTextContent('Working draft details are temporarily unavailable.')
    expect(errorSupport).toHaveTextContent('req-drafts-503')
    expect(screen.queryByLabelText('Loading working drafts')).not.toBeInTheDocument()
    expect(screen.queryByText('Board Narrative Draft')).not.toBeInTheDocument()
    expect(screen.queryByText('No working drafts')).not.toBeInTheDocument()
  })

  it('distinguishes ready and unavailable drafts without changing server order or data', async () => {
    const user = userEvent.setup()
    const drafts = [
      { ...session.drafts[0], draftId: 'draft-ready', updatedAt: '2026-07-17T10:03:00.000Z' },
      { ...session.drafts[0], draftId: 'draft-unavailable-1', approvalAvailable: false, updatedAt: '2026-07-17T10:02:00.000Z' },
      { ...session.drafts[0], draftId: 'draft-unavailable-2', approvalAvailable: false, updatedAt: '2026-07-17T10:01:00.000Z' },
    ]
    const originalDrafts = structuredClone(drafts)
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: { data: { ...session, drafts } },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    renderPage()
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))

    expect(screen.getByText('1 ready to approve · 2 unavailable')).toBeInTheDocument()
    const draftList = screen.getByRole('list', { name: 'Working drafts' })
    const draftItems = within(draftList).getAllByRole('listitem')
    expect(draftItems).toHaveLength(3)
    expect(draftItems.map((item) => item.textContent)).toEqual([
      expect.stringContaining(`Updated ${formatDateTime('2026-07-17T10:03:00.000Z', 'Time unavailable')}`),
      expect.stringContaining(`Updated ${formatDateTime('2026-07-17T10:02:00.000Z', 'Time unavailable')}`),
      expect.stringContaining(`Updated ${formatDateTime('2026-07-17T10:01:00.000Z', 'Time unavailable')}`),
    ])
    expect(within(draftList).getAllByText('Ready to approve')).toHaveLength(1)
    expect(within(draftList).getAllByText('Approval unavailable')).toHaveLength(2)
    expect(within(draftList).getAllByRole('button', { name: 'Approve draft' }).filter((button) => button.disabled)).toHaveLength(2)
    expect(drafts).toEqual(originalDrafts)
  })

  it('shows unavailable update time and plural ready count honestly', async () => {
    const user = userEvent.setup()
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...session,
          drafts: [
            { ...session.drafts[0], draftId: 'draft-ready-1' },
            { ...session.drafts[0], draftId: 'draft-ready-2', updatedAt: null },
          ],
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    renderPage()
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))

    expect(screen.getByText('2 ready to approve · 0 unavailable')).toBeInTheDocument()
    expect(screen.getByText(/Updated Time unavailable/)).toBeInTheDocument()
  })

  it('uses distinct accessible approval reasons for multiple unpersisted drafts', async () => {
    const user = userEvent.setup()
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...session,
          drafts: [
            { ...session.drafts[0], draftId: '', title: 'Unpersisted draft one' },
            { ...session.drafts[0], draftId: '', title: 'Unpersisted draft two' },
          ],
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    renderPage()
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))

    const approvalButtons = screen.getAllByRole('button', { name: 'Approve draft' })
    const reasonIds = approvalButtons.map((button) => button.getAttribute('aria-describedby'))
    expect(new Set(reasonIds).size).toBe(2)
    reasonIds.forEach((reasonId) => {
      expect(reasonId).toBeTruthy()
      expect(document.getElementById(reasonId)).toHaveTextContent(
        'Approval is unavailable until the draft has been persisted.',
      )
    })
  })

  it('keeps prompt submission available while safety checks block draft generation', async () => {
    const user = userEvent.setup()
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: {
        data: {
          ...studio,
          readiness: {
            ...studio.readiness,
            blockers: [{ code: 'SAFETY_EXECUTION_RECEIPT_MISSING', message: 'Draft generation is blocked until the safety execution receipt is recorded.' }],
          },
          safetyGates: {
            status: 'BLOCKED',
            responseGenerationAvailable: false,
          },
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchStudio,
    })
    renderPage()

    const generateButton = screen.getByRole('button', { name: 'Generate draft' })
    expect(generateButton).toBeDisabled()
    expect(generateButton).toHaveAccessibleDescription(
      'Draft generation is blocked until the safety execution receipt is recorded.',
    )
    expect(screen.getByRole('textbox', { name: 'Your request' })).toBeEnabled()

    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Add customer evidence.')
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    expect(planRequest).toHaveBeenCalled()
    expect(submitMessage).not.toHaveBeenCalled()
    expect(generateResponse).not.toHaveBeenCalled()
  })

  it.each([
    {
      label: 'reasoning readiness is blocked',
      readiness: {
        ...studio.readiness,
        canReason: false,
        blockers: [{ code: 'PROVIDER_UNAVAILABLE', message: 'Draft generation is blocked because the drafting service is unavailable.' }],
      },
      expected: 'Draft generation is blocked because the drafting service is unavailable.',
    },
    {
      label: 'the dedicated generation gate is blocked',
      readiness: {
        ...studio.readiness,
        safetyGates: { responseGenerationAvailable: false },
        blockers: [{ code: 'KNOWLEDGE_PACK_RESOLUTION_NOT_RECORDED', message: 'Draft generation is blocked until Knowledge Pack resolution is recorded.' }],
      },
      expected: 'Draft generation is blocked until Knowledge Pack resolution is recorded.',
    },
    {
      label: 'dedicated readiness flags are missing',
      readiness: {
        state: 'READY',
        canStartSession: true,
        summary: 'Outcome Studio readiness is incomplete.',
        blockers: [],
      },
      expected: 'Draft readiness has not been recorded yet.',
    },
  ])('fails generation closed when $label', async ({ readiness, expected }) => {
    const user = userEvent.setup()
    useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({
      data: { data: readiness },
      isLoading: false,
      error: null,
      refetch: refetchReadiness,
    })
    renderPage()

    const generateButton = screen.getByRole('button', { name: 'Generate draft' })
    expect(generateButton).toBeDisabled()
    expect(generateButton).toHaveAccessibleDescription(expected)

    await user.click(generateButton)
    expect(generateResponse).not.toHaveBeenCalled()
  })

  it('fails generation closed when the dedicated readiness response is missing', async () => {
    const user = userEvent.setup()
    useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: refetchReadiness,
    })
    renderPage()

    const generateButton = screen.getByRole('button', { name: 'Generate draft' })
    expect(generateButton).toBeDisabled()
    expect(generateButton).toHaveAccessibleDescription(
      'Draft readiness has not been recorded yet.',
    )

    await user.click(generateButton)
    expect(generateResponse).not.toHaveBeenCalled()
  })

  it('generates only when both Outcome Studio readiness contracts authorize reasoning', async () => {
    const user = userEvent.setup()
    renderPage()

    const generateButton = screen.getByRole('button', { name: 'Generate draft' })
    expect(generateButton).toBeEnabled()
    expect(generateButton).toHaveClass('btn--primary')
    expect(screen.getByText('Ready to generate')).toBeInTheDocument()
    expect(screen.getByText('No draft has been created for this request yet.')).toBeInTheDocument()
    await user.click(generateButton)

    expect(generateResponse).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      customerId: 'customer-001',
      tenantId: 'tenant-001',
      sessionId: 'session-1',
      messageId: 'message-1',
      body: { allowReadyWithGaps: true },
    })
  })

  it('shows standard loading feedback only for the request being generated', async () => {
    const user = userEvent.setup()
    let resolveGeneration
    generateResponse.mockReturnValue({
      unwrap: vi.fn(() => new Promise((resolve) => { resolveGeneration = resolve })),
    })
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...session,
          messages: [makeMessage(1), makeMessage(2)],
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })

    renderPage()

    const generateButtons = screen.getAllByRole('button', { name: 'Generate draft' })
    await user.click(generateButtons[0])

    expect(screen.getByText('Generating draft')).toBeInTheDocument()
    expect(screen.getByText('Your draft is being created. This may take a moment.')).toBeInTheDocument()
    expect(generateButtons[0]).toHaveAttribute('aria-busy', 'true')
    expect(generateButtons[1]).toHaveAttribute('aria-busy', 'false')

    await act(async () => {
      resolveGeneration({ data: {} })
    })
  })

  it('shows completed request feedback without presenting assistant messages as requests', () => {
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...session,
          messages: [
            {
              ...session.messages[0],
              responseStatus: 'RESPONSE_GENERATED',
            },
            {
              messageId: 'message-assistant-1',
              role: 'ASSISTANT',
              status: 'GENERATED',
              responseStatus: 'RESPONSE_GENERATED',
              content: 'Customer-facing generated response.',
              submittedAt: '2026-07-17T09:31:00.000Z',
            },
          ],
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })

    renderPage()

    expect(screen.getByText('Draft created')).toBeInTheDocument()
    expect(screen.getByText('Draft created').closest('.status')).toHaveClass('status--success')
    expect(screen.getByText('A draft was created from this request.')).toBeInTheDocument()
    expect(screen.queryByText('Customer-facing generated response.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate draft' })).not.toBeInTheDocument()
  })

  it('does not send stale or customer-selected deliverable metadata', async () => {
    const user = userEvent.setup()
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...session,
          requestedOutputTypeKey: 'retired-deliverable',
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    renderPage()

    expect(screen.queryByRole('combobox', { name: 'Deliverable' })).not.toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Refine the available deliverable.')
    await user.click(screen.getByRole('button', { name: 'Plan request' }))

    expect(planRequest).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      customerId: 'customer-001',
      tenantId: 'tenant-001',
      body: { prompt: 'Refine the available deliverable.', action: 'ANSWER' },
    })
  })

  it('does not present the retained legacy source as an Output Lab journey step', () => {
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: {
        data: {
          ...studio,
          information: {
            ...studio.information,
            sourceOutput: {
              outputAssetId: 'legacy-source-1',
              sourceType: 'OUTPUT_LAB',
            },
          },
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchStudio,
    })

    renderPage()

    expect(screen.getByText('Governed source asset')).toBeInTheDocument()
    expect(screen.queryByText('Output Lab asset')).not.toBeInTheDocument()
  })

  it('prefills the exact Parlon request in one call, permits amendment, then records Clarification', async () => {
    const user = userEvent.setup()
    planRequest.mockReturnValueOnce(resolvedMutation({ data: planResult({
      status: 'CONFIRMATION_REQUIRED',
      continuation: 'confirm-receipt',
      question: '',
      message: 'Review and confirm the inferred request.',
      intent: confirmationIntent(),
    }) }))
      .mockReturnValueOnce(resolvedMutation({ data: planResult({
        status: 'CONFIRMATION_REQUIRED',
        continuation: 'amended-confirm-receipt',
        question: '',
        intent: confirmationIntent({ audience: ['Parlon leadership', 'Parlon board'] }),
    }) }))
    renderPage()
    fireEvent.change(screen.getByRole('textbox', { name: 'Your request' }), { target: { value: exactParlonPrompt } })
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    const requestPlan = screen.getByRole('region', { name: 'Request plan' })
    expect(requestPlan).toHaveTextContent('Confirmation Required')
    expect(requestPlan).toHaveTextContent('Commercial Strategy and Decision Paper')
    expect(requestPlan).toHaveTextContent('Parlon leadership')
    expect(requestPlan).toHaveTextContent('Current governed Parlon evidence base')
    expect(requestPlan).toHaveTextContent('Governed Default')
    expect(requestPlan).toHaveTextContent('Optional Unspecified')
    expect(requestPlan).toHaveTextContent('commercial-strategy-decision-paper.v1')
    expect(requestPlan).toHaveTextContent('Parlon governed evidence')
    expect(requestPlan).not.toHaveTextContent('What decision should this output support?')
    expect(confirmPlan).not.toHaveBeenCalled()
    assertNoExecution()
    expect(screen.getByRole('textbox', { name: 'Your request' })).toBeEnabled()
    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Also include the Parlon board in the audience.')
    expect(screen.getByRole('button', { name: 'Confirm and save plan' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Apply amendment' }))
    expect(planRequest.mock.calls[1][0].body).toEqual({ prompt: 'Also include the Parlon board in the audience.', action: 'RE_RESOLVE', continuation: 'confirm-receipt' })
    expect(screen.getByRole('region', { name: 'Request plan' })).toHaveTextContent('Parlon board')
    expect(confirmPlan).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirm and save plan' }))
    expect(confirmPlan).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001', customerId: 'customer-001', tenantId: 'tenant-001',
      requestId: planResult().requestId, body: { continuation: 'amended-confirm-receipt', confirm: true },
    })
    expect(createSession).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001', customerId: 'customer-001', tenantId: 'tenant-001',
      body: { requestId: planningRequestId, planId: savedPlan().plan.planId },
    })
    expect(refetchStudio).toHaveBeenCalled()
    expect(refetchReadiness).toHaveBeenCalled()
    expect(submitMessage).not.toHaveBeenCalled()
    expect(generateResponse).not.toHaveBeenCalled()
    expect(screen.getByRole('region', { name: 'Request plan' })).toHaveTextContent('Plan saved')
    expect(screen.getByRole('region', { name: 'Request plan' })).toHaveTextContent('Clarification receipt recorded')
    expect(screen.getByRole('region', { name: /stage progress/i })).toHaveTextContent('The confirmed request has an exact Clarification execution receipt.')
    await user.click(screen.getByRole('button', { name: 'Retrieve saved plan' }))
    expect(retrievePlan).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001', customerId: 'customer-001', tenantId: 'tenant-001',
      requestId: planResult().requestId, planId: savedPlan().plan.planId,
    }, false)
    expect(createSession).toHaveBeenCalledTimes(1)
    expect(submitMessage).not.toHaveBeenCalled()
    expect(generateResponse).not.toHaveBeenCalled()
  })

  it('retains the exact confirmation receipt after response loss and retries without prompt matching', async () => {
    const user = userEvent.setup()
    planRequest.mockReturnValue(resolvedMutation({ data: planResult({ status: 'CONFIRMATION_REQUIRED', continuation: 'exact-confirm-receipt', question: '', intent: confirmationIntent() }) }))
    confirmPlan.mockReturnValueOnce({ unwrap: vi.fn().mockRejectedValue({ status: 'FETCH_ERROR' }) })
      .mockReturnValueOnce(resolvedMutation({ data: savedPlan() }))
    renderPage()
    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Prepare a board narrative.')
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    await user.click(screen.getByRole('button', { name: 'Confirm and save plan' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm and save plan' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Confirm and save plan' }))
    expect(confirmPlan).toHaveBeenCalledTimes(2)
    expect(confirmPlan.mock.calls[1][0]).toEqual(confirmPlan.mock.calls[0][0])
    expect(confirmPlan.mock.calls[1][0].body).toEqual({ continuation: 'exact-confirm-receipt', confirm: true })
    expect(planRequest).toHaveBeenCalledTimes(1)
    expect(loadSessionForReconciliation).not.toHaveBeenCalled()
    expect(createSession).toHaveBeenCalledTimes(1)
    expect(submitMessage).not.toHaveBeenCalled()
    expect(generateResponse).not.toHaveBeenCalled()
  })

  it('retains the prompt and permits retry after a planning error', async () => {
    const user = userEvent.setup()
    planRequest.mockReturnValueOnce({ unwrap: vi.fn().mockRejectedValue({ status: 409, data: { error: {
      message: 'The plan could not be resolved.', requestId: 'planning-ref-1',
    } } }) })
    renderPage()
    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Refine the recommendation.')
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The plan could not be resolved. Reference: planning-ref-1')
    expect(screen.getByRole('textbox', { name: 'Your request' })).toHaveValue('Refine the recommendation.')
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    expect(planRequest).toHaveBeenCalledTimes(2)
    expect(planRequest.mock.calls[1][0]).toEqual(planRequest.mock.calls[0][0])
    assertNoExecution()
  })

  it.each([
    ['missing continuation', { continuation: undefined }],
    ['execution enabled', { execution: { status: 'BLOCKED', canExecute: true } }],
    ['nonblocked execution', { execution: { status: 'READY', canExecute: false } }],
  ])('fails closed for a malformed planning response: %s', async (_name, invalid) => {
    const user = userEvent.setup()
    planRequest.mockReturnValue(resolvedMutation({ data: planResult(invalid) }))
    renderPage()
    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Prepare the brief.')
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Request plan' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Your request' })).toHaveValue('Prepare the brief.')
    expect(confirmPlan).not.toHaveBeenCalled()
    assertNoExecution()
  })

  it('keeps a saved plan visible when retrieval fails without reconfirming or executing', async () => {
    const user = userEvent.setup()
    planRequest.mockReturnValue(resolvedMutation({ data: planResult({ status: 'CONFIRMATION_REQUIRED', question: '', intent: confirmationIntent() }) }))
    retrievePlan.mockReturnValue({ unwrap: vi.fn().mockRejectedValue({ status: 'FETCH_ERROR' }) })
    renderPage()
    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Prepare the brief.')
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    await user.click(screen.getByRole('button', { name: 'Confirm and save plan' }))
    await user.click(screen.getByRole('button', { name: 'Retrieve saved plan' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Request plan' })).toHaveTextContent('Plan version 1')
    expect(confirmPlan).toHaveBeenCalledTimes(1)
    expect(createSession).toHaveBeenCalledTimes(1)
    expect(submitMessage).not.toHaveBeenCalled()
    expect(generateResponse).not.toHaveBeenCalled()
  })

  it('starts a genuinely new plan after selecting a working draft during planning', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Prepare a board narrative.')
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('tab', { name: 'Conversation' }))
    await user.click(screen.getByRole('button', { name: 'New request' }))
    expect(screen.queryByRole('region', { name: 'Request plan' })).not.toBeInTheDocument()
    expect(screen.queryByText('Composer bound to current draft')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit revision' })).not.toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Prepare a separate investor brief.')
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    expect(planRequest.mock.calls[1][0].body).toEqual({
      prompt: 'Prepare a separate investor brief.', action: 'ANSWER',
    })
    assertNoExecution()
  })

  it.each(['CONFIRM', 'RETRIEVE'])('ignores a late %s response after logout without a rerender', async (step) => {
    const user = userEvent.setup()
    planRequest.mockReturnValue(resolvedMutation({ data: planResult({ status: 'CONFIRMATION_REQUIRED', question: '', intent: confirmationIntent() }) }))
    let resolve
    const deferred = { unwrap: () => new Promise((done) => { resolve = done }) }
    if (step === 'CONFIRM') confirmPlan.mockReturnValue(deferred)
    else retrievePlan.mockReturnValue(deferred)
    renderPage()
    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Prepare a board narrative.')
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    await user.click(screen.getByRole('button', { name: 'Confirm and save plan' }))
    if (step === 'RETRIEVE') await user.click(screen.getByRole('button', { name: 'Retrieve saved plan' }))
    authState.revision += 1
    await act(async () => resolve({ data: { ...savedPlan(), message: 'Private late plan response' } }))
    expect(screen.queryByText('Private late plan response')).not.toBeInTheDocument()
    if (step === 'CONFIRM') expect(createSession).not.toHaveBeenCalled()
    else expect(createSession).toHaveBeenCalledTimes(1)
    expect(submitMessage).not.toHaveBeenCalled()
    expect(generateResponse).not.toHaveBeenCalled()
  })

  it('shows safe provider-context diagnostic copy and ignores malformed diagnostic tokens', async () => {
    const user = userEvent.setup()
    generateResponse.mockReturnValueOnce({ unwrap: vi.fn().mockRejectedValue({ status: 422, data: { error: {
      message: 'Please review the information provided and try again.', requestId: 'provider-context-ref-1',
      diagnostic: { failureStage: 'GUIDANCE', diagnosticCode: 'REQUIRED_GUIDANCE_UNAVAILABLE' },
    } } }) }).mockReturnValueOnce({ unwrap: vi.fn().mockRejectedValue({ status: 422, data: { error: {
      message: 'Please review the information provided and try again.', requestId: 'provider-context-ref-2',
      diagnostic: { failureStage: 'INTERNAL_STAGE', diagnosticCode: 'RAW_INTERNAL_REASON' },
    } } }) })
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Generate draft' }))
    expect(await screen.findByText('Please review the information provided and try again. Diagnostic: guidance preparation; required guidance was not available. Reference: provider-context-ref-1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Generate draft' }))
    expect(await screen.findByText('Please review the information provided and try again. Reference: provider-context-ref-2')).toBeInTheDocument()
    expect(screen.queryByText(/RAW_INTERNAL_REASON|INTERNAL_STAGE/)).not.toBeInTheDocument()
  })

  it('legacy selected-draft revision: warns that a submitted request was saved when only the refresh fails', async () => {
    const user = userEvent.setup()
    refetchSession.mockRejectedValueOnce(new Error('Internal refresh detail must not render.'))
    renderPage()
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('tab', { name: 'Conversation' }))

    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Refine the recommendation.')
    await user.click(screen.getByRole('button', { name: 'Submit revision' }))

    expect(await screen.findByText('Outcome Studio refresh needed')).toBeInTheDocument()
    expect(screen.getByText(
      'The change was saved, but the latest Outcome Studio information could not be loaded. Refresh the page.',
    )).toBeInTheDocument()
    expect(screen.queryByText('Outcome Studio action failed')).not.toBeInTheDocument()
    expect(screen.queryByText('Internal refresh detail must not render.')).not.toBeInTheDocument()
  })

  it('legacy selected-draft revision: keeps a rejected mutation on the standard action-failed path', async () => {
    const user = userEvent.setup()
    submitMessage.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            message: 'The request could not be submitted.',
            requestId: 'outcome-submit-ref-1',
          },
        },
      }),
    })
    renderPage()
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('tab', { name: 'Conversation' }))

    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Refine the recommendation.')
    await user.click(screen.getByRole('button', { name: 'Submit revision' }))

    expect(await screen.findByText('Outcome Studio action failed')).toBeInTheDocument()
    expect(screen.getByText('The request could not be submitted. Reference: outcome-submit-ref-1')).toBeInTheDocument()
    expect(screen.queryByText('Outcome Studio refresh needed')).not.toBeInTheDocument()
  })

  it('legacy selected-draft revision: shows only the stable output-contract clarification as an inline composer error', async () => {
    const user = userEvent.setup()
    submitMessage.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'OUTCOME_OUTPUT_CONTRACT_CLARIFICATION_REQUIRED',
            message: 'Which outcome should I prepare: Board Narrative?',
            requestId: 'clarification-1',
          },
        },
      }),
    })
    renderPage()
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('tab', { name: 'Conversation' }))

    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Prepare something for leadership.')
    await user.click(screen.getByRole('button', { name: 'Submit revision' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Which outcome should I prepare: Board Narrative?')
    expect(screen.getByRole('textbox', { name: 'Your request' })).toHaveValue('Prepare something for leadership.')
    expect(submitMessage).toHaveBeenCalledTimes(1)
  })

  it('legacy selected-draft revision: reconciles a committed message after response loss without submitting it twice', async () => {
    const user = userEvent.setup()
    submitMessage.mockReturnValue({ unwrap: vi.fn().mockRejectedValue({ status: 'FETCH_ERROR', error: 'lost response' }) })
    loadSessionForReconciliation.mockReturnValue(resolvedMutation({
      data: {
        ...session,
        messages: [
          ...session.messages,
          {
            messageId: 'message-recovered',
            role: 'USER',
            content: 'Refine the recommendation.',
            requestedOutputTypeKey: 'board-narrative',
          },
        ],
      },
    }))
    renderPage()
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('tab', { name: 'Conversation' }))

    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Refine the recommendation.')
    await user.click(screen.getByRole('button', { name: 'Submit revision' }))

    expect(await screen.findByText('Outcome Studio request recovered')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Your request' })).toHaveValue('')
    expect(submitMessage).toHaveBeenCalledTimes(1)
    expect(loadSessionForReconciliation).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      customerId: 'customer-001',
      tenantId: 'tenant-001',
      sessionId: 'session-1',
    })
  })

  it('legacy selected-draft revision: retains the prompt and permits a manual retry when reconciliation proves no write', async () => {
    const user = userEvent.setup()
    submitMessage
      .mockReturnValueOnce({ unwrap: vi.fn().mockRejectedValue({ status: 'FETCH_ERROR', error: 'lost response' }) })
      .mockReturnValueOnce(resolvedMutation())
    renderPage()
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('tab', { name: 'Conversation' }))

    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Refine the recommendation.')
    await user.click(screen.getByRole('button', { name: 'Submit revision' }))

    expect(await screen.findByText('Outcome Studio action failed')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Your request' })).toHaveValue('Refine the recommendation.')
    await user.click(screen.getByRole('button', { name: 'Submit revision' }))
    expect(submitMessage).toHaveBeenCalledTimes(2)
  })

  it.each([
    {
      name: 'ambiguous refreshed history',
      reconcileResult: resolvedMutation({
        data: {
          ...session,
          messages: [
            ...session.messages,
            { messageId: 'message-new-1', role: 'USER', content: 'Refine the recommendation.' },
            { messageId: 'message-new-2', role: 'USER', content: 'Another request.' },
          ],
        },
      }),
    },
    {
      name: 'reconciliation query failure',
      reconcileResult: { unwrap: vi.fn().mockRejectedValue(new Error('query failed')) },
    },
  ])('fails closed after $name', async ({ reconcileResult }) => {
    const user = userEvent.setup()
    submitMessage.mockReturnValue({ unwrap: vi.fn().mockRejectedValue({ status: 'FETCH_ERROR', error: 'lost response' }) })
    loadSessionForReconciliation.mockReturnValue(reconcileResult)
    renderPage()
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('tab', { name: 'Conversation' }))

    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Refine the recommendation.')
    await user.click(screen.getByRole('button', { name: 'Submit revision' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Outcome Studio could not confirm whether this request was saved. Refresh before trying again.',
    )
    expect(screen.getByRole('button', { name: 'Submit revision' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Your request' })).toHaveValue('Refine the recommendation.')
    expect(submitMessage).toHaveBeenCalledTimes(1)
  })

  it('legacy selected-draft revision: shows safe provider-context diagnostic copy and ignores malformed diagnostic tokens', async () => {
    const user = userEvent.setup()
    submitMessage.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 422,
        data: {
          error: {
            message: 'Please review the information provided and try again.',
            requestId: 'provider-context-ref-1',
            diagnostic: {
              failureStage: 'GUIDANCE',
              diagnosticCode: 'REQUIRED_GUIDANCE_UNAVAILABLE',
            },
          },
        },
      }),
    })
    renderPage()
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('tab', { name: 'Conversation' }))

    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Create the brief.')
    await user.click(screen.getByRole('button', { name: 'Submit revision' }))

    expect(await screen.findByText('Outcome Studio action failed')).toBeInTheDocument()
    expect(screen.getByText(
      'Please review the information provided and try again. Diagnostic: guidance preparation; required guidance was not available. Reference: provider-context-ref-1',
    )).toBeInTheDocument()

    submitMessage.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 422,
        data: {
          error: {
            message: 'Please review the information provided and try again.',
            requestId: 'provider-context-ref-2',
            diagnostic: {
              failureStage: 'INTERNAL_STAGE',
              diagnosticCode: 'RAW_INTERNAL_REASON',
            },
          },
        },
      }),
    })

    await user.click(screen.getByRole('button', { name: 'Submit revision' }))
    expect(await screen.findByText(
      'Please review the information provided and try again. Reference: provider-context-ref-2',
    )).toBeInTheDocument()
    expect(screen.queryByText(/RAW_INTERNAL_REASON|INTERNAL_STAGE/)).not.toBeInTheDocument()
  })

  it('confirms retained discard, sends expectedUpdatedAt, and waits for refetch before success', async () => {
    const user = userEvent.setup()
    let resolveSessionRefetch
    refetchSession.mockReturnValueOnce(new Promise((resolve) => { resolveSessionRefetch = resolve }))
    renderPage()
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))

    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('retained in governed history')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Discard' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard draft' }))
    expect(discardDraft).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      customerId: 'customer-001',
      tenantId: 'tenant-001',
      sessionId: 'session-1',
      draftId: 'draft-1',
      expectedUpdatedAt: '2026-07-17T10:00:00.000Z',
    })
    expect(screen.queryByText('The draft was retained in history and removed from active work.')).not.toBeInTheDocument()

    await act(async () => {
      resolveSessionRefetch({ data: session })
    })
    expect(await screen.findByText('The draft was retained in history and removed from active work.')).toBeInTheDocument()
    expect(refetchStudio).toHaveBeenCalled()
  })

  it('closes discard confirmation and warns that the discard was saved when refresh fails', async () => {
    const user = userEvent.setup()
    refetchSession.mockRejectedValueOnce(new Error('Internal discard refresh detail must not render.'))
    renderPage()
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))

    await user.click(screen.getByRole('button', { name: 'Discard' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard draft' }))

    expect(await screen.findByText('Outcome Studio refresh needed')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Draft discard failed')).not.toBeInTheDocument()
    expect(screen.queryByText('Internal discard refresh detail must not render.')).not.toBeInTheDocument()
  })

  it('preserves conversation, approval, publish, and deterministic return flows', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Refine the recommendation.')
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    expect(planRequest).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      customerId: 'customer-001',
      tenantId: 'tenant-001',
      body: { prompt: 'Refine the recommendation.', action: 'ANSWER' },
    })

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Approve draft' }))
    expect(approveDraft).toHaveBeenCalledWith({ runtimeInstanceId: 'value-narrative-001', customerId: 'customer-001', tenantId: 'tenant-001', sessionId: 'session-1', draftId: 'draft-1', body: {} })

    const outputs = screen.getByRole('region', { name: /approved outputs/i })
    await user.click(within(outputs).getByRole('button', { name: 'Revise as working draft' }))
    expect(reviseAsset).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      customerId: 'customer-001',
      tenantId: 'tenant-001',
      sessionId: 'session-1',
      outcomeAssetId: 'asset-1',
      body: {},
    })
    await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
    await user.click(within(outputs).getByRole('button', { name: 'Publish' }))
    expect(publishAsset).toHaveBeenCalledWith({ runtimeInstanceId: 'value-narrative-001', customerId: 'customer-001', tenantId: 'tenant-001', outcomeAssetId: 'asset-1', body: {} })

    fireEvent.click(screen.getByRole('button', { name: 'Execution Workspace' }))
    expect(screen.getByText('Execution Workspace Return')).toBeInTheDocument()
  })

  it.each(['OUT_OF_DATE', 'OBSOLETE', 'UNKNOWN'])(
    'fails closed for %s session and draft information',
    async (currentness) => {
    const user = userEvent.setup()
    const view = renderPage()
    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('tab', { name: 'Conversation' }))
    const outOfDateSession = {
      ...session,
      informationStatus: { status: currentness, currentness },
      drafts: [{
        ...session.drafts[0],
        informationStatus: { status: currentness, currentness },
      }],
    }
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: { data: outOfDateSession },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    view.rerender(makePage())

    expect(screen.getByRole('textbox', { name: 'Your request' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Generate draft' })).toBeDisabled()
    expect(screen.getByText('Information out of date')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    const informationStatus = within(screen.getByRole('list', { name: 'Working drafts' })).getByText(
      new RegExp(`Information ${currentness.replaceAll('_', ' ')}`, 'i'),
      { selector: '.status__text' },
    ).closest('.status')
    if (currentness === 'OUT_OF_DATE') expect(informationStatus).toHaveClass('status--warning')
    if (currentness === 'OBSOLETE') expect(informationStatus).toHaveClass('status--error')
    const approveButton = screen.getByRole('button', { name: 'Approve draft' })
    expect(approveButton).toBeDisabled()
    expect(approveButton).toHaveAccessibleDescription(
      'Approval is blocked until the draft uses current verified business information.',
    )
    expect(approveDraft).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('tab', { name: 'Conversation' }))
    expect(screen.getByRole('textbox', { name: 'Your request' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Submit revision' })).toBeDisabled()
    expect(submitMessage).not.toHaveBeenCalled()
    },
  )

  it.each([
    {
      draft: { ...session.drafts[0], approvalAvailable: false },
      reason: 'Approval is not available for this draft.',
    },
    {
      draft: { ...session.drafts[0], draftId: '' },
      reason: 'Approval is unavailable until the draft has been persisted.',
    },
  ])('disables approval when $reason', async ({ draft, reason }) => {
    const user = userEvent.setup()
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({
      data: {
        data: {
          ...session,
          drafts: [draft],
        },
      },
      isLoading: false,
      error: null,
      refetch: refetchSession,
    })
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    const approveButton = screen.getByRole('button', { name: 'Approve draft' })
    expect(approveButton).toBeDisabled()
    expect(approveButton).toHaveAccessibleDescription(reason)
    expect(approveDraft).not.toHaveBeenCalled()
  })

  it('plans before a session exists without starting one or refetching the skipped session query', async () => {
    const user = userEvent.setup()
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({ data: { data: { ...studio, sessions: [] } }, refetch: refetchStudio })
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({ data: undefined, refetch: refetchSession })
    renderPage()
    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Prepare a board narrative.')
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    expect(planRequest).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001', customerId: 'customer-001', tenantId: 'tenant-001',
      body: { prompt: 'Prepare a board narrative.', action: 'ANSWER' },
    })
    expect(screen.getByText('No active session')).toBeInTheDocument()
    expect(screen.getByText('No session requests yet')).toBeInTheDocument()
    expect(confirmPlan).not.toHaveBeenCalled()
    expect(refetchSession).not.toHaveBeenCalled()
    assertNoExecution()
  })

  it.each(['customer', 'tenant', 'logout', 'runtime'])('ignores a late planning response after %s changes', async (change) => {
    const user = userEvent.setup()
    let resolve
    planRequest.mockReturnValue({ unwrap: () => new Promise((done) => { resolve = done }) })
    const view = renderPage()
    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Prepare a board narrative.')
    await user.click(screen.getByRole('button', { name: 'Plan request' }))
    if (change === 'customer') testScope.customerId = 'customer-002'
    if (change === 'tenant') testScope.tenantId = 'tenant-002'
    if (change === 'logout') authState.revision += 1
    if (change === 'runtime') await user.click(screen.getByRole('button', { name: 'Switch test runtime' }))
    view.rerender(makePage())
    await act(async () => resolve({ data: planResult({ question: 'Private old-scope question' }) }))
    expect(screen.queryByText('Private old-scope question')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Request plan' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Your request' })).toHaveValue('')
    assertNoExecution()
  })

  it.each([
    {
      name: 'stale information',
      asset: {
        ...studio.assets[0],
        informationStatus: { status: 'OUT_OF_DATE', currentness: 'OUT_OF_DATE' },
      },
      reason: 'Publish and export are blocked until this output uses current verified business information.',
      exportDisabled: true,
    },
    {
      name: 'blocked customer content review',
      asset: { ...studio.assets[0], distributionAvailable: false },
      reason: 'Publish and export are unavailable until this output passes customer content review.',
      exportDisabled: true,
    },
    {
      name: 'missing current version',
      asset: { ...studio.assets[0], currentVersionId: '' },
      reason: 'This output is not ready for distribution yet.',
      exportDisabled: true,
    },
    {
      name: 'published output',
      asset: { ...studio.assets[0], status: 'PUBLISHED' },
      reason: 'This output has already been published.',
      exportDisabled: false,
    },
  ])('preserves publish and export gates for $name', async ({ asset, reason, exportDisabled }) => {
    const user = userEvent.setup()
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: { data: { ...studio, assets: [asset] } },
      isLoading: false,
      error: null,
      refetch: refetchStudio,
    })
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
    const publishButton = screen.getByRole('button', { name: 'Publish' })
    const exportButton = screen.getByRole('button', { name: 'PDF' })
    expect(publishButton).toBeDisabled()
    expect(publishButton).toHaveAccessibleDescription(reason)
    expect(exportButton).toHaveProperty('disabled', exportDisabled)
    if (exportDisabled) expect(exportButton).toHaveAccessibleDescription(reason)
    expect(publishAsset).not.toHaveBeenCalled()
    expect(renderAsset).not.toHaveBeenCalled()
    expect(exportAsset).not.toHaveBeenCalled()
  })

  it('renders a Markdown-only preview as safe customer-readable content', async () => {
    const user = userEvent.setup()
    useLazyGetRuntimeOutcomeAssetPreviewQuery.mockReturnValue([
      loadPreview,
      {
        data: {
          data: {
            outcomeAssetId: 'asset-1',
            previewAvailable: true,
            markdown: '# Executive Summary\n\nCustomer-safe recommendation.\n\n- First action\n- Second action\n\n1) First decision\n2) Second decision\n\n<script>unsafe()</script>',
            sections: [],
          },
        },
        isFetching: false,
        error: null,
      },
    ])
    const { container } = renderPage()

    await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))

    const preview = screen.getByRole('region', { name: /generated body preview/i })
    expect(within(preview).getByRole('heading', { name: 'Executive Summary' })).toBeInTheDocument()
    expect(preview).toHaveTextContent('Customer-safe recommendation.')
    const lists = within(preview).getAllByRole('list')
    expect(lists[0]).toHaveTextContent('First action')
    expect(lists[1]).toHaveTextContent('Second decision')
    expect(preview).toHaveTextContent('<script>unsafe()</script>')
    expect(container.querySelector('script')).not.toBeInTheDocument()
  })

  it('renders inline emphasis without exposing raw Markdown markers', async () => {
    const user = userEvent.setup()
    useLazyGetRuntimeOutcomeAssetPreviewQuery.mockReturnValue([
      loadPreview,
      {
        data: {
          data: {
            outcomeAssetId: 'asset-1',
            previewAvailable: true,
            markdown: '# Executive Summary\n\n**Verified fact:** The buyer loses *two working days* per month.\n\n- __Decision required__',
            sections: [],
          },
        },
        isFetching: false,
        error: null,
      },
    ])
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))

    const preview = screen.getByRole('region', { name: /generated body preview/i })
    expect(within(preview).getByText('Verified fact:')).toBeInTheDocument()
    expect(within(preview).getByText('two working days')).toBeInTheDocument()
    expect(within(preview).getByText('Decision required')).toBeInTheDocument()
    expect(preview).not.toHaveTextContent('**Verified fact:**')
    expect(preview).not.toHaveTextContent('*two working days*')
    expect(preview).not.toHaveTextContent('__Decision required__')
  })

  it('prefers safe Markdown over a redundant structured section body', async () => {
    const user = userEvent.setup()
    useLazyGetRuntimeOutcomeAssetPreviewQuery.mockReturnValue([
      loadPreview,
      {
        data: {
          data: {
            outcomeAssetId: 'asset-1',
            previewAvailable: true,
            markdown: '# Executive Summary\n\nCustomer-safe recommendation.\n\n- First action\n- Second action\n\n<script>unsafe()</script>',
            sections: [{
              key: 'draft-body',
              label: 'Redundant Draft Body',
              body: '# Executive Summary\n\nCustomer-safe recommendation.',
            }],
          },
        },
        isFetching: false,
        error: null,
      },
    ])
    const { container } = renderPage()

    await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))

    const preview = screen.getByRole('region', { name: /generated body preview/i })
    expect(within(preview).getByRole('heading', { name: 'Executive Summary' })).toBeInTheDocument()
    expect(within(preview).getByRole('list')).toHaveTextContent('Second action')
    expect(preview).not.toHaveTextContent('Redundant Draft Body')
    expect(preview).toHaveTextContent('<script>unsafe()</script>')
    expect(container.querySelector('script')).not.toBeInTheDocument()
  })

  it('falls back to structured sections when preview Markdown is empty', async () => {
    const user = userEvent.setup()
    useLazyGetRuntimeOutcomeAssetPreviewQuery.mockReturnValue([
      loadPreview,
      {
        data: {
          data: {
            outcomeAssetId: 'asset-1',
            previewAvailable: true,
            markdown: '   ',
            sections: [{
              key: 'summary',
              label: 'Executive Summary',
              body: 'Structured customer-safe recommendation.',
            }],
          },
        },
        isFetching: false,
        error: null,
      },
    ])
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))

    const preview = screen.getByRole('region', { name: /generated body preview/i })
    expect(within(preview).getByRole('heading', { name: 'Executive Summary' })).toBeInTheDocument()
    expect(preview).toHaveTextContent('Structured customer-safe recommendation.')
  })

  it('disables preview with an accessible reason when the output is not customer-ready', async () => {
    const user = userEvent.setup()
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: { data: { ...studio, assets: [{ ...studio.assets[0], previewAvailable: false }] } },
      isLoading: false,
      error: null,
      refetch: refetchStudio,
    })
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
    const previewButton = screen.getByRole('button', { name: 'Preview' })
    expect(previewButton).toBeDisabled()
    expect(previewButton).toHaveAccessibleDescription(
      'Preview is unavailable until this output passes customer content review.',
    )
    expect(loadAsset).not.toHaveBeenCalled()
    expect(loadPreview).not.toHaveBeenCalled()
  })

  it('shows a preview-specific unavailable state and suppresses stale content when preview loading fails', async () => {
    const user = userEvent.setup()
    useLazyGetRuntimeOutcomeAssetPreviewQuery.mockReturnValue([
      loadPreview,
      {
        data: {
          data: {
            outcomeAssetId: 'asset-1',
            previewAvailable: true,
            markdown: '# Stale preview\n\nThis content must not remain visible.',
          },
        },
        isFetching: false,
        error: {
          status: 409,
          data: {
            error: {
              code: 'DRAFTING_SERVICE_UNAVAILABLE',
              message: 'Draft generation is temporarily unavailable. No response or draft was created.',
            },
          },
        },
      },
    ])
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))

    const preview = screen.getByRole('region', { name: /generated body preview/i })
    expect(within(preview).getByText('Unavailable')).toBeInTheDocument()
    expect(preview).toHaveTextContent('This output preview is temporarily unavailable. Refresh and try again.')
    expect(preview).not.toHaveTextContent('Draft generation is temporarily unavailable')
    expect(preview).not.toHaveTextContent('Stale preview')
  })

  it('reports malformed base64 exports without creating a download', async () => {
    const user = userEvent.setup()
    renderAsset.mockReturnValue(resolvedMutation({
      data: {
        filename: 'board-narrative.pdf',
        mimeType: 'application/pdf',
        encoding: 'base64',
        contentBase64: 'malformed-base64',
      },
    }))
    vi.spyOn(window, 'atob').mockImplementationOnce(() => {
      throw new DOMException('Invalid character')
    })
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
    await user.click(screen.getByRole('button', { name: 'PDF' }))

    expect(await screen.findByText('Export content could not be decoded.')).toBeInTheDocument()
    expect(renderAsset).toHaveBeenCalledWith(expect.objectContaining({ outcomeAssetId: 'asset-1', format: 'PDF' }))
    expect(exportAsset).not.toHaveBeenCalled()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
