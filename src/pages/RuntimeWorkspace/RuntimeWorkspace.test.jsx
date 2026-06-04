import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import {
  useAcceptRuntimeDiscoveryMutation,
  useAcceptRuntimeSectionMutation,
  useExecuteRuntimeActionMutation,
  useGetRuntimeEvidenceQuery,
  useGetRuntimeRendererQuery,
  useMutateRuntimeStateMutation,
  useResetRuntimeDiscoveryMutation,
  useReviewRuntimeDiscoveryEvidenceMutation,
  useReviewRuntimeSectionEvidenceMutation,
  useUpdateRuntimeSectionEvidenceMutation,
  useUpdateRuntimeDiscoveryInputsMutation,
} from '../../store/api/runtimeInstanceApi.js'
import RuntimeWorkspace from './RuntimeWorkspace'

vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useAcceptRuntimeDiscoveryMutation: vi.fn(),
  useAcceptRuntimeSectionMutation: vi.fn(),
  useExecuteRuntimeActionMutation: vi.fn(),
  useGetRuntimeEvidenceQuery: vi.fn(),
  useGetRuntimeRendererQuery: vi.fn(),
  useMutateRuntimeStateMutation: vi.fn(),
  useResetRuntimeDiscoveryMutation: vi.fn(),
  useReviewRuntimeDiscoveryEvidenceMutation: vi.fn(),
  useReviewRuntimeSectionEvidenceMutation: vi.fn(),
  useUpdateRuntimeSectionEvidenceMutation: vi.fn(),
  useUpdateRuntimeDiscoveryInputsMutation: vi.fn(),
}))

const refetchRenderer = vi.fn()
const mutateRuntimeState = vi.fn()
const unwrapMutation = vi.fn()
const executeRuntimeAction = vi.fn()
const unwrapAction = vi.fn()
const updateRuntimeDiscoveryInputs = vi.fn()
const unwrapDiscoveryInputs = vi.fn()
const acceptRuntimeDiscovery = vi.fn()
const unwrapAcceptDiscovery = vi.fn()
const resetRuntimeDiscovery = vi.fn()
const unwrapResetDiscovery = vi.fn()
const reviewRuntimeDiscoveryEvidence = vi.fn()
const unwrapReviewDiscoveryEvidence = vi.fn()
const reviewRuntimeSectionEvidence = vi.fn()
const unwrapReviewRuntimeSectionEvidence = vi.fn()
const updateRuntimeSectionEvidence = vi.fn()
const unwrapUpdateRuntimeSectionEvidence = vi.fn()
const acceptRuntimeSection = vi.fn()
const unwrapAcceptSection = vi.fn()

const rendererPayload = {
  runtimeInstance: {
    id: 'runtime-1',
    runtimeInstanceKey: 'value-narrative-001',
    runtimeType: 'VALUE_NARRATIVE',
    status: 'ACTIVE',
    executionStatus: 'IDLE',
    name: 'Acme Value Narrative',
    packageKey: 'vmf-standard-2-3-1',
    packageVersion: '2.3.1',
    updatedAt: '2026-05-19T08:00:00.000Z',
  },
  package: {
    packageName: 'VMF Standard',
    packageKey: 'vmf-standard-2-3-1',
    frameworkVersion: '2.3.1',
  },
  lifecycle: {
    stage: 'DRAFT',
  },
  validation: {
    state: 'UNKNOWN',
    messages: [],
  },
  readiness: {
    state: 'DRAFT',
    ready: false,
    submittedForReview: false,
    sectionTruth: {
      state: 'SECTION_TRUTH_BLOCKED',
      publishEligible: false,
      lockEligible: false,
      requiredSectionCount: 1,
      readySectionCount: 0,
      blockingSectionCount: 1,
      readySectionKeys: [],
      blockers: [
        {
          sectionKey: 'customer_problem',
          state: 'ACCEPTED_TRUTH_MISSING',
          reason: 'Accepted section truth is missing.',
        },
      ],
      reason: 'Accepted section truth is missing.',
    },
  },
  publish: {
    state: 'UNPUBLISHED',
    published: false,
    outputEligible: false,
  },
  lock: {
    state: 'UNLOCKED',
    locked: false,
  },
  sections: [
    {
      key: 'customer_problem',
      runtimePath: 'framework_state.sections.customer_problem',
      label: 'Customer Problem',
      control: 'TEXTAREA',
      required: true,
      helpText: 'Describe the core problem.',
      placeholder: 'Example: Proposal creation is slow.',
      value: 'Proposal creation is slow.',
      generated: null,
      review: {},
      state: {
        status: 'DRAFT',
        revisionCount: 0,
      },
      lineage: {},
      revisions: [],
      editable: true,
      validationKeys: ['required-sections-check'],
      validationMessages: [],
      intelligence: {
        confidence: {
          level: 'LOW',
          score: 15,
          reasons: ['ADDITIONAL_CONTEXT'],
        },
        dependency: {
          state: 'NO_SECTION_DEPENDENCIES',
          requiredSectionKeys: [],
          satisfiedSectionKeys: [],
          missingSectionKeys: [],
        },
        compare: {
          state: 'NO_GENERATED_CONTENT',
          summary: 'No generated content is available for comparison.',
          currentGeneratedAccepted: false,
          hasGenerated: false,
          hasAccepted: false,
        },
        readiness: {
          state: 'DRAFT_INPUT_NEEDED',
          publishEligible: false,
          reason: 'Section needs generated and accepted truth before publish or lock.',
          blockingValidationCount: 0,
        },
      },
    },
  ],
  actions: [
    {
      actionKey: 'SUBMIT_FOR_REVIEW',
      buttonLabel: 'Submit for Review',
      enabled: true,
      requiresConfirmation: true,
      confirmationMessage: 'Submit this framework for review?',
      policyKey: 'submit-for-review-policy',
    },
  ],
  signals: [],
  activity: [],
  diagnostics: {
    renderTraceId: 'render-test',
    configWarnings: [
      {
        code: 'UI_CONTRACT_SECTION_MISSING',
        severity: 'WARNING',
        message: 'Fallback presentation was applied.',
      },
    ],
  },
}

function VmfRouteProbe() {
  const location = useLocation()
  return (
    <div>
      <span>VMF Workspace Route</span>
      <span>{location.search}</span>
    </div>
  )
}

function runtimeWorkspaceTree(initialEntry = '/app/runtime/value-narrative-001') {
  const initialEntries = Array.isArray(initialEntry) ? initialEntry : [initialEntry]
  return (
    <ToasterProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/app/workspaces/vmf" element={<VmfRouteProbe />} />
          <Route path="/app/dashboard" element={<div>Dashboard Route</div>} />
          <Route path="/app/runtime/:runtimeInstanceId" element={<RuntimeWorkspace />} />
        </Routes>
      </MemoryRouter>
    </ToasterProvider>
  )
}

function renderRuntimeWorkspace(initialEntry = '/app/runtime/value-narrative-001') {
  return render(runtimeWorkspaceTree(initialEntry))
}

function selectIntelligenceHubTab(name) {
  const discoverySection = screen.getByRole('main', { name: /guided execution sections/i })
  fireEvent.click(within(discoverySection).getByRole('tab', { name }))
  return discoverySection
}

function selectRuntimeSectionTab(name) {
  const guidedSections = screen.getByRole('main', { name: /guided execution sections/i })
  fireEvent.click(within(guidedSections).getByRole('tab', { name }))
  return guidedSections
}

async function openGuidedSection(name = /customer problem/i) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name }))
  return user
}

function buildRuntimeSection(index, label) {
  const sectionKey = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  return {
    ...rendererPayload.sections[0],
    key: sectionKey,
    runtimePath: `framework_state.sections.${sectionKey}`,
    label,
    value: `${label} context`,
    state: {
      status: 'DRAFT',
      revisionCount: index,
    },
  }
}

describe('RuntimeWorkspace', () => {
  beforeEach(() => {
    refetchRenderer.mockReset()
    mutateRuntimeState.mockReset()
    unwrapMutation.mockReset()
    executeRuntimeAction.mockReset()
    unwrapAction.mockReset()
    updateRuntimeDiscoveryInputs.mockReset()
    unwrapDiscoveryInputs.mockReset()
    acceptRuntimeDiscovery.mockReset()
    unwrapAcceptDiscovery.mockReset()
    resetRuntimeDiscovery.mockReset()
    unwrapResetDiscovery.mockReset()
    reviewRuntimeDiscoveryEvidence.mockReset()
    unwrapReviewDiscoveryEvidence.mockReset()
    reviewRuntimeSectionEvidence.mockReset()
    unwrapReviewRuntimeSectionEvidence.mockReset()
    updateRuntimeSectionEvidence.mockReset()
    unwrapUpdateRuntimeSectionEvidence.mockReset()
    acceptRuntimeSection.mockReset()
    unwrapAcceptSection.mockReset()
    window.confirm = vi.fn(() => true)
    unwrapMutation.mockResolvedValue({ data: { mutation: { runtimePath: 'framework_state.sections.customer_problem' } } })
    mutateRuntimeState.mockReturnValue({ unwrap: unwrapMutation })
    unwrapAction.mockResolvedValue({ data: { action: { actionKey: 'SUBMIT_FOR_REVIEW' } } })
    executeRuntimeAction.mockReturnValue({ unwrap: unwrapAction })
    unwrapDiscoveryInputs.mockResolvedValue({ data: { discovery: { state: { status: 'EVIDENCE_READY' } } } })
    updateRuntimeDiscoveryInputs.mockReturnValue({ unwrap: unwrapDiscoveryInputs })
    unwrapAcceptDiscovery.mockResolvedValue({ data: { discovery: { state: { status: 'ACCEPTED' } } } })
    acceptRuntimeDiscovery.mockReturnValue({ unwrap: unwrapAcceptDiscovery })
    unwrapResetDiscovery.mockResolvedValue({ data: { discovery: { state: { status: 'RESET' } } } })
    resetRuntimeDiscovery.mockReturnValue({ unwrap: unwrapResetDiscovery })
    unwrapReviewDiscoveryEvidence.mockResolvedValue({ data: { discovery: { state: { status: 'EVIDENCE_READY' } } } })
    reviewRuntimeDiscoveryEvidence.mockReturnValue({ unwrap: unwrapReviewDiscoveryEvidence })
    unwrapReviewRuntimeSectionEvidence.mockResolvedValue({ data: { section: { sectionEvidence: { status: 'ACCEPTED' } } } })
    reviewRuntimeSectionEvidence.mockReturnValue({ unwrap: unwrapReviewRuntimeSectionEvidence })
    unwrapUpdateRuntimeSectionEvidence.mockResolvedValue({ data: { section: { sectionEvidence: { status: 'PENDING_REVIEW' } } } })
    updateRuntimeSectionEvidence.mockReturnValue({ unwrap: unwrapUpdateRuntimeSectionEvidence })
    unwrapAcceptSection.mockResolvedValue({ data: { section: { accepted: { content: 'Accepted final.' } } } })
    acceptRuntimeSection.mockReturnValue({ unwrap: unwrapAcceptSection })
    useAcceptRuntimeDiscoveryMutation.mockReturnValue([acceptRuntimeDiscovery, { isLoading: false }])
    useAcceptRuntimeSectionMutation.mockReturnValue([acceptRuntimeSection, { isLoading: false }])
    useExecuteRuntimeActionMutation.mockReturnValue([executeRuntimeAction, { isLoading: false }])
    useResetRuntimeDiscoveryMutation.mockReturnValue([resetRuntimeDiscovery, { isLoading: false }])
    useReviewRuntimeDiscoveryEvidenceMutation.mockReturnValue([reviewRuntimeDiscoveryEvidence, { isLoading: false }])
    useReviewRuntimeSectionEvidenceMutation.mockReturnValue([reviewRuntimeSectionEvidence, { isLoading: false }])
    useUpdateRuntimeSectionEvidenceMutation.mockReturnValue([updateRuntimeSectionEvidence, { isLoading: false }])
    useGetRuntimeEvidenceQuery.mockReturnValue({
      data: null,
      isFetching: false,
      error: null,
    })
    useMutateRuntimeStateMutation.mockReturnValue([mutateRuntimeState, { isLoading: false }])
    useUpdateRuntimeDiscoveryInputsMutation.mockReturnValue([updateRuntimeDiscoveryInputs, { isLoading: false }])
    useGetRuntimeRendererQuery.mockReturnValue({
      data: { data: rendererPayload },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })
  })

  it('renders server-projected runtime sections, actions, signals, activity, and diagnostics', async () => {
    renderRuntimeWorkspace()

    expect(useGetRuntimeRendererQuery).toHaveBeenCalledWith(
      { runtimeInstanceId: 'value-narrative-001' },
      { skip: false },
    )
    const actionBar = screen.getByRole('group', { name: /execution workspace actions/i })
    const backButton = within(actionBar).getByRole('button', { name: /^back$/i })
    expect(backButton).toHaveClass('btn--outline', 'btn--sm')
    expect(screen.getByRole('heading', { name: 'Execution Workspace' })).toBeInTheDocument()
    expect(screen.getByText('Continue governed runtime work for Acme Value Narrative.')).toBeInTheDocument()
    const heroMetadata = screen.getByLabelText(/runtime value-narrative-001 metadata/i)
    expect(within(heroMetadata).getByText('Value Narrative')).toBeInTheDocument()
    expect(within(heroMetadata).getByText('Draft')).toBeInTheDocument()
    expect(within(heroMetadata).getByText('Package 2.3.1')).toBeInTheDocument()
    expect(screen.getByText('VMF Standard / 2.3.1')).toBeInTheDocument()
    expect(screen.getAllByText('Draft').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    const summary = screen.getByRole('list', { name: /execution workspace summary/i })
    const summaryItems = within(summary).getAllByRole('listitem')
    expect(summaryItems).toHaveLength(8)
    expect(within(summary).getByText('Runtime Status')).toBeInTheDocument()
    expect(within(summary).getByText('Execution')).toBeInTheDocument()
    expect(within(summary).getByText('Lifecycle Stage')).toBeInTheDocument()
    expect(within(summary).getByText('Validation')).toBeInTheDocument()
    expect(within(summary).getByText('Readiness')).toBeInTheDocument()
    expect(within(summary).getByText('Publish')).toBeInTheDocument()
    expect(within(summary).getByText('Lock')).toBeInTheDocument()
    expect(within(summary).queryByRole('status')).not.toBeInTheDocument()
    expect(summary.querySelector('dl, dt, dd')).toBeNull()
    summaryItems.forEach((item) => {
      expect(item.querySelector('.runtime-workspace__summary-label')).toBeInTheDocument()
      expect(item.querySelector('.runtime-workspace__summary-value')).toBeInTheDocument()
    })

    const sections = screen.getByRole('main', { name: /guided execution sections/i })
    expect(within(sections).getByRole('heading', { name: /^intelligence hub$/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /guided section navigation/i })).toBeInTheDocument()
    await openGuidedSection()
    const sectionList = within(sections).getByRole('list', { name: /runtime section cards/i })
    expect(sectionList.tagName).toBe('UL')
    expect(sectionList).not.toHaveAttribute('role')
    expect(within(sectionList).getAllByRole('listitem')).toHaveLength(1)
    expect(within(sections).getByRole('heading', { name: /customer problem/i })).toBeInTheDocument()
    expect(screen.queryByText('framework_state.sections.customer_problem')).not.toBeInTheDocument()
    const sectionCard = within(sectionList).getByRole('listitem')
    expect(within(sectionCard).getByText('Required')).toBeInTheDocument()
    expect(within(sectionCard).getByText('Editable')).toBeInTheDocument()
    const progressSummary = screen.getByLabelText(/execution progress summary/i)
    expect(within(progressSummary).getByRole('progressbar', { name: /0 of 1 required sections have accepted truth ready/i })).toHaveAttribute('value', '0')
    const metrics = within(progressSummary).getByRole('list', { name: /execution workspace metrics/i })
    expect(within(metrics).getByText('Truth ready')).toBeInTheDocument()
    expect(within(metrics).getAllByText('0/1').length).toBeGreaterThanOrEqual(1)
    expect(within(metrics).getByText(/1 warning/i)).toBeInTheDocument()
    const sectionObject = screen.getByRole('region', { name: /ownership zones/i })
    expect(sectionObject).toBeInTheDocument()
    expect(within(sectionObject).getByRole('tablist', { name: /customer problem sections/i })).toBeInTheDocument()
    const customerProblemTabs = ['Overview', 'Context', 'Truth', 'Governance']
    customerProblemTabs.forEach((tabName) => {
      expect(within(sectionObject).getByRole('tab', { name: tabName })).toBeInTheDocument()
    })
    selectRuntimeSectionTab('Context')
    expect(screen.getByLabelText('Customer Problem', { exact: true })).toHaveValue('Proposal creation is slow.')
    expect(within(sectionObject).getByRole('region', { name: /your additional context/i })).toHaveTextContent('Customer Problem')
    selectRuntimeSectionTab('Overview')
    expect(within(sectionObject).getByRole('region', { name: /suggested from intelligence hub/i }).closest('.runtime-workspace__section-panels'))
      .toHaveClass('runtime-workspace__section-panels--overview')
    expect(within(sectionObject).getByRole('region', { name: /suggested from intelligence hub/i })).toHaveAttribute('tabindex', '0')
    expect(within(sectionObject).getByRole('region', { name: /generated content/i })).toHaveAttribute('tabindex', '0')
    expect(within(sectionObject).getByRole('region', { name: /generated content/i })).toHaveTextContent('Awaiting generation')
    selectRuntimeSectionTab('Truth')
    expect(within(sectionObject).getByRole('region', { name: /accepted truth/i }).closest('.runtime-workspace__section-panels'))
      .toHaveClass('runtime-workspace__section-panels--truth')
    expect(within(sectionObject).getByRole('region', { name: /accepted truth/i })).toHaveAttribute('tabindex', '0')
    expect(within(sectionObject).getByRole('region', { name: /accepted truth/i })).toHaveTextContent('No accepted governed truth')
    selectRuntimeSectionTab('Governance')
    const governedIntelligence = screen.getByRole('region', { name: /governed intelligence/i })
    expect(within(governedIntelligence).getByText('Confidence').closest('.runtime-workspace__section-detail-row')).toBeInTheDocument()
    const truthReadiness = within(governedIntelligence).getByText(/section needs generated and accepted truth/i)
    expect(truthReadiness).toBeInTheDocument()
    expect(truthReadiness.closest('.runtime-workspace__section-detail-copy')).toBeInTheDocument()
    expect(within(governedIntelligence).getByText('Draft Input Needed').closest('.badge')).toHaveClass('badge--warning')

    const intelligencePanel = screen.getByRole('complementary', { name: /execution intelligence side panel/i })
    const guidedPanel = screen.getByRole('complementary', { name: /guided sections side panel/i })
    const sectionNav = within(guidedPanel).getByRole('navigation', { name: /guided section navigation/i })
    expect(within(guidedPanel).getByText('1 section')).toBeInTheDocument()
    expect(within(sectionNav).getByRole('button', { name: /0 intelligence hub evidence not ready/i })).toBeInTheDocument()
    expect(within(sectionNav).getByRole('button', { name: /1 customer problem draft/i })).toHaveAttribute('aria-current', 'step')
    expect(within(guidedPanel).getByRole('status', { name: /section truth blocked/i })).toBeInTheDocument()
    expect(within(guidedPanel).queryByText(/runtime action execution is not live in this preview/i)).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: /governed runtime actions scroll region/i })).toBeInTheDocument()
    const runtimeActions = screen.getByRole('group', { name: /governed runtime actions/i })
    const submitAction = within(runtimeActions).getByRole('button', { name: /submit for review/i })
    expect(submitAction).toBeEnabled()
    expect(submitAction).toHaveClass('btn--outline')
    expect(within(guidedPanel).getByRole('heading', { name: /governed intelligence/i })).toBeInTheDocument()
    expect(within(guidedPanel).getByText(/no generated content is available for comparison/i)).toBeInTheDocument()
    expect(within(intelligencePanel).getByText(/no runtime signals/i)).toBeInTheDocument()
    expect(within(intelligencePanel).getByText(/no runtime activity/i)).toBeInTheDocument()
    expect(within(intelligencePanel).getByRole('heading', { name: /runtime warnings/i })).toBeInTheDocument()
    expect(within(intelligencePanel).getByText('Workspace presentation fallback')).toBeInTheDocument()
    expect(within(intelligencePanel).queryByText('UI_CONTRACT_SECTION_MISSING')).not.toBeInTheDocument()
    expect(within(intelligencePanel).getByText('WARNING')).toBeInTheDocument()
  })

  it('counts accepted section truth toward required progress when section input is empty', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          readiness: {
            ...rendererPayload.readiness,
            sectionTruth: {
              ...rendererPayload.readiness.sectionTruth,
              state: 'SECTION_TRUTH_READY',
              publishEligible: true,
              lockEligible: true,
              readySectionCount: 1,
              blockingSectionCount: 0,
              readySectionKeys: ['customer_problem'],
              blockers: [],
              reason: '',
            },
          },
          sections: [
            {
              ...rendererPayload.sections[0],
              value: '',
              generated: null,
              accepted: {
                content: 'Accepted customer problem truth.',
                acceptedAt: '2026-05-22T09:15:00.000Z',
              },
              state: {
                status: 'ACCEPTED',
                revisionCount: 0,
              },
              intelligence: {
                ...rendererPayload.sections[0].intelligence,
                ownershipZones: {
                  acceptedTruth: {
                    available: true,
                    current: false,
                    acceptedAt: '2026-05-22T09:15:00.000Z',
                  },
                },
                compare: {
                  hasAccepted: true,
                  hasGenerated: false,
                  currentGeneratedAccepted: false,
                  state: 'ACCEPTED_TRUTH_WITHOUT_CURRENT_GENERATION',
                },
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const progressSummary = screen.getByLabelText(/execution progress summary/i)
    expect(within(progressSummary).getByText('Accepted truth')).toBeInTheDocument()
    expect(within(progressSummary).getByRole('progressbar', { name: /1 of 1 required sections have accepted truth ready/i })).toHaveAttribute('value', '100')
    const metrics = within(progressSummary).getByRole('list', { name: /execution workspace metrics/i })
    expect(within(metrics).getByText('1/1')).toBeInTheDocument()
  })

  it('does not count unaccepted generated drafts as required progress', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              value: '',
              generated: {
                content: 'Generated draft awaiting acceptance.',
                generatedAt: '2026-05-22T09:10:00.000Z',
              },
              accepted: null,
              state: {
                status: 'GENERATED',
                revisionCount: 0,
              },
              intelligence: {
                ...rendererPayload.sections[0].intelligence,
                ownershipZones: {
                  generatedSection: {
                    available: true,
                    generatedAt: '2026-05-22T09:10:00.000Z',
                  },
                  acceptedTruth: {
                    available: false,
                    current: false,
                    acceptedAt: '',
                  },
                },
                compare: {
                  hasAccepted: false,
                  hasGenerated: true,
                  currentGeneratedAccepted: false,
                  state: 'UNACCEPTED_GENERATED_CONTENT',
                },
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const progressSummary = screen.getByLabelText(/execution progress summary/i)
    expect(within(progressSummary).getByRole('progressbar', { name: /0 of 1 required sections have accepted truth ready/i })).toHaveAttribute('value', '0')
    const metrics = within(progressSummary).getByRole('list', { name: /execution workspace metrics/i })
    expect(within(metrics).getByText('0/1')).toBeInTheDocument()
    expect(within(metrics).getByText('1/1')).toBeInTheDocument()
  })

  it('returns to the Value Narrative workspace from the Back button', async () => {
    const user = userEvent.setup()

    renderRuntimeWorkspace({
      pathname: '/app/runtime/value-narrative-001',
      state: { from: '/app/workspaces/vmf?state=ACTIVE' },
    })

    await user.click(screen.getByRole('button', { name: /^back$/i }))

    expect(await screen.findByText('VMF Workspace Route')).toBeInTheDocument()
    expect(screen.getByText('?state=ACTIVE')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard Route')).not.toBeInTheDocument()
  })

  it('falls back to the Value Narrative workspace for direct runtime routes', async () => {
    const user = userEvent.setup()

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /^back$/i }))

    expect(await screen.findByText('VMF Workspace Route')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard Route')).not.toBeInTheDocument()
  })

  it('groups repeated runtime warnings into business-safe summaries', async () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          diagnostics: {
            ...rendererPayload.diagnostics,
            configWarnings: [
              {
                code: 'ACTION_POLICY_MISSING',
                severity: 'WARNING',
                message: 'UI Contract action has no matching active workflow policy and was disabled.',
              },
              {
                code: 'POLICY_ACTION_MISSING',
                severity: 'WARNING',
                message: 'Active workflow policy has no UI Contract action and was not rendered.',
              },
              {
                code: 'POLICY_ACTION_MISSING',
                severity: 'WARNING',
                message: 'Active workflow policy has no UI Contract action and was not rendered.',
              },
              {
                code: 'UI_CONTRACT_SECTION_MISSING',
                severity: 'INFO',
                message: 'Renderer fallback presentation was applied.',
              },
            ],
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const intelligencePanel = screen.getByRole('complementary', { name: /execution intelligence side panel/i })
    expect(within(intelligencePanel).getByRole('heading', { name: /runtime warnings/i })).toBeInTheDocument()
    expect(within(intelligencePanel).getByText('Workflow and action alignment issue')).toBeInTheDocument()
    expect(within(intelligencePanel).getByText(/3 warnings\. A governed runtime action is unavailable/i)).toBeInTheDocument()
    expect(within(intelligencePanel).queryByText('Workspace presentation fallback')).not.toBeInTheDocument()
    expect(within(intelligencePanel).queryByText('ACTION_POLICY_MISSING')).not.toBeInTheDocument()
    expect(within(intelligencePanel).queryByText('POLICY_ACTION_MISSING')).not.toBeInTheDocument()
    expect(within(intelligencePanel).queryByText('UI_CONTRACT_SECTION_MISSING')).not.toBeInTheDocument()

    const user = userEvent.setup()
    const viewAllButton = within(intelligencePanel).getByRole('button', { name: /view all warnings/i })
    expect(viewAllButton).toHaveAttribute('aria-expanded', 'false')
    await user.click(viewAllButton)

    expect(within(intelligencePanel).getByText('Workspace presentation fallback')).toBeInTheDocument()
    expect(within(intelligencePanel).getByText(/workspace configuration action has no matching active workflow alignment/i)).toBeInTheDocument()
    expect(within(intelligencePanel).getByRole('button', { name: /show key warnings/i })).toHaveAttribute('aria-expanded', 'true')
    expect(within(intelligencePanel).queryByText(/UI Contract/)).not.toBeInTheDocument()
    expect(within(intelligencePanel).queryByText(/renderer/i)).not.toBeInTheDocument()
  })

  it('renders large framework section navigation as a flat scrollable list', () => {
    const largeSections = [
      ...Array.from({ length: 14 }, (_, index) => buildRuntimeSection(index, `Core Section ${index + 1}`)),
      buildRuntimeSection(14, 'Deal Mode'),
      buildRuntimeSection(15, 'Appendix Command Interface'),
      buildRuntimeSection(16, 'Appendix Execution Visibility'),
    ]
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: largeSections,
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const guidedPanel = screen.getByRole('complementary', { name: /guided sections side panel/i })
    const guidedCard = guidedPanel.querySelector('.runtime-workspace__panel--guided-sections')
    expect(guidedCard).toBeInTheDocument()
    const sectionNav = within(guidedPanel).getByRole('navigation', { name: /guided section navigation/i })
    expect(sectionNav).toHaveClass('runtime-workspace__section-nav')
    expect(within(sectionNav).getByRole('button', { name: /0 intelligence hub evidence not ready/i })).toBeInTheDocument()
    expect(within(sectionNav).getByRole('button', { name: /1 core section 1 draft/i })).toBeInTheDocument()
    expect(within(sectionNav).getByRole('button', { name: /15 deal mode draft/i })).toBeInTheDocument()
    expect(within(sectionNav).getByRole('button', { name: /16 appendix command interface draft/i })).toBeInTheDocument()
    expect(within(sectionNav).queryByText('Core Framework')).not.toBeInTheDocument()
    expect(within(sectionNav).queryByText('Runtime Appendices')).not.toBeInTheDocument()
  })

  it('shows raw runtime paths only when renderer diagnostics explicitly allow it', async () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          diagnostics: {
            ...rendererPayload.diagnostics,
            runtimePathVisibility: 'VISIBLE',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await openGuidedSection()

    expect(screen.getByText('framework_state.sections.customer_problem')).toBeInTheDocument()
  })

  it('renders server-projected runtime activity without raw audit payloads', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          activity: [
            {
              eventId: 'activity-1',
              action: 'RUNTIME_STATE_MUTATED',
              summary: 'Customer Problem saved.',
              occurredAt: '2026-05-19T08:04:00.000Z',
              actorLabel: 'Jill Faithful',
              diff: {
                after: {
                  'framework_state.sections.customer_problem.input': 'Proposal creation is slow.',
                },
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const sidePanel = screen.getByRole('complementary', { name: /execution intelligence side panel/i })
    expect(within(sidePanel).getByRole('heading', { name: /activity/i })).toBeInTheDocument()
    expect(within(sidePanel).getByText('Customer Problem saved.')).toBeInTheDocument()
    expect(within(sidePanel).queryByText(/framework_state.sections.customer_problem.input/i)).not.toBeInTheDocument()
    expect(within(sidePanel).queryByText(/proposal creation is slow/i)).not.toBeInTheDocument()
    expect(within(sidePanel).queryByText(/no runtime activity/i)).not.toBeInTheDocument()
  })

  it('renders server-projected signals with a compact preview and expansion control', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          signals: [
            { signalId: 'signal-1', severity: 'WARNING', summary: '2 sections have warnings' },
            { signalId: 'signal-2', status: 'NEEDS_VALIDATION', summary: '1 instance needs validation' },
            { signalId: 'signal-3', variant: 'SUCCESS', summary: 'No blocking issues' },
            { signalId: 'signal-4', severity: 'INFO', summary: 'Source lineage available' },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const sidePanel = screen.getByRole('complementary', { name: /execution intelligence side panel/i })
    expect(within(sidePanel).getByRole('heading', { name: /signals/i })).toBeInTheDocument()
    expect(within(sidePanel).getByText('2 sections have warnings')).toBeInTheDocument()
    expect(within(sidePanel).getByText('1 instance needs validation')).toBeInTheDocument()
    expect(within(sidePanel).getByText('No blocking issues')).toBeInTheDocument()
    expect(within(sidePanel).queryByText('Source lineage available')).not.toBeInTheDocument()
    expect(within(sidePanel).queryByText(/no runtime signals/i)).not.toBeInTheDocument()

    const viewAllButton = within(sidePanel).getByRole('button', { name: /view all signals/i })
    expect(viewAllButton).toHaveAttribute('aria-expanded', 'false')
    await user.click(viewAllButton)

    expect(within(sidePanel).getByText('Source lineage available')).toBeInTheDocument()
    expect(within(sidePanel).getByRole('button', { name: /show key signals/i })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows recent activity first and expands to the full server-projected activity list', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          activity: [
            {
              eventId: 'activity-1',
              summary: 'First event',
              occurredAt: '2026-05-19T08:04:00.000Z',
            },
            {
              eventId: 'activity-2',
              summary: 'Second event',
              occurredAt: '2026-05-19T08:03:00.000Z',
            },
            {
              eventId: 'activity-3',
              summary: 'Third event',
              occurredAt: '2026-05-19T08:02:00.000Z',
            },
            {
              eventId: 'activity-4',
              summary: 'Fourth event',
              occurredAt: '2026-05-19T08:01:00.000Z',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const sidePanel = screen.getByRole('complementary', { name: /execution intelligence side panel/i })
    expect(within(sidePanel).getByText('First event')).toBeInTheDocument()
    expect(within(sidePanel).getByText('Second event')).toBeInTheDocument()
    expect(within(sidePanel).getByText('Third event')).toBeInTheDocument()
    expect(within(sidePanel).queryByText('Fourth event')).not.toBeInTheDocument()

    const viewAllButton = within(sidePanel).getByRole('button', { name: /view all activity/i })
    expect(viewAllButton).toHaveAttribute('aria-expanded', 'false')
    await user.click(viewAllButton)

    expect(within(sidePanel).getByText('Fourth event')).toBeInTheDocument()
    expect(within(sidePanel).getByRole('button', { name: /show recent activity/i })).toHaveAttribute('aria-expanded', 'true')
  })

  it('collapses repeated server-projected activity rows into one counted item', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          activity: [
            {
              eventId: 'activity-1',
              summary: 'Run Validation executed',
              actorLabel: 'Jena Gregory',
              occurredAt: '2026-05-21T15:03:00.000Z',
            },
            {
              eventId: 'activity-2',
              summary: 'Run Validation executed',
              actorLabel: 'Jena Gregory',
              occurredAt: '2026-05-21T15:02:00.000Z',
            },
            {
              eventId: 'activity-3',
              summary: 'Run Validation executed',
              actorLabel: 'Jena Gregory',
              occurredAt: '2026-05-21T15:01:00.000Z',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const sidePanel = screen.getByRole('complementary', { name: /execution intelligence side panel/i })
    expect(within(sidePanel).getAllByText('Run Validation executed')).toHaveLength(1)
    expect(within(sidePanel).getByText('3 events')).toBeInTheDocument()
    expect(within(sidePanel).queryByRole('button', { name: /view all activity/i })).not.toBeInTheDocument()
  })

  it('renders server-projected discovery state without inventing evidence content', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'EVIDENCE_READY',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: false,
            needsRefresh: false,
            inputSummary: {
              keys: ['companyWebsite', 'companyName', 'marketRegion', 'targetOffer'],
              count: 4,
            },
            evidenceSummary: {
              keys: ['source', 'inputKeys', 'requiredInputKeys', 'missingInputKeys', 'lineage'],
              count: 5,
            },
            scopedViews: {
              customer_problem: {
                summary: 'Proposal teams need a shared governed narrative.',
              },
            },
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const discoverySection = screen.getByRole('main', { name: /guided execution sections/i })
    expect(within(discoverySection).getAllByText('Evidence Ready').length).toBeGreaterThan(0)
    expect(within(discoverySection).getByRole('tablist', { name: /intelligence hub sections/i })).toBeInTheDocument()
    expect(within(discoverySection).getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    const intelligenceHubTabs = ['Context', 'Sources', 'Evidence', 'Coverage', 'Governance']
    intelligenceHubTabs.forEach((tabName) => {
      expect(within(discoverySection).getByRole('tab', { name: tabName })).toBeInTheDocument()
    })
    expect(within(discoverySection).getByRole('region', { name: /acquisition sources/i })).toBeInTheDocument()

    selectIntelligenceHubTab('Context')
    const discoveryInputs = within(discoverySection).getByRole('region', { name: /runtime-wide context/i })
    expect(discoveryInputs).toHaveTextContent('Runtime-Wide Context')
    expect(discoveryInputs).toHaveTextContent('4 accepted Intelligence Hub inputs captured')
    expect(discoveryInputs).toHaveTextContent('Company website')
    expect(discoveryInputs).not.toHaveTextContent('companyWebsite')
    const businessContext = within(discoverySection).getByRole('region', { name: /runtime business context/i })
    expect(businessContext).toHaveTextContent('Business Context')
    expect(businessContext).toHaveTextContent('Company Name')
    const discoveryDocuments = within(discoverySection).getByRole('region', { name: /intelligence hub document context/i })
    expect(discoveryDocuments).toHaveTextContent('Source Documents')
    expect(discoveryDocuments).toHaveTextContent('Document Sources')
    expect(discoveryDocuments).toHaveTextContent('Files are used only to extract evidence; originals are not stored.')
    expect(within(discoveryDocuments).getByRole('button', { name: /document storage note/i })).toBeInTheDocument()
    expect(within(discoveryDocuments).getByText(
      'Original documents are not stored. Only extracted evidence and source details are retained.',
    )).toBeInTheDocument()

    selectIntelligenceHubTab('Evidence')
    const evidencePack = within(discoverySection).getByRole('region', { name: /evidence pack/i })
    expect(evidencePack).toHaveTextContent('5 governed evidence signals prepared for section intelligence.')
    expect(evidencePack).not.toHaveTextContent('inputKeys')

    selectIntelligenceHubTab('Governance')
    const scopedEvidenceViews = within(discoverySection).getByRole('region', { name: /scoped evidence views/i })
    expect(scopedEvidenceViews).toHaveTextContent('1 section-scoped evidence view')
    expect(scopedEvidenceViews).toHaveTextContent('Projected for guided sections.')
    expect(scopedEvidenceViews).not.toHaveTextContent('customer_problem')
    expect(within(discoverySection).getByRole('region', { name: /intelligence hub acceptance/i })).toHaveTextContent(
      'Intelligence Hub has not been accepted',
    )
    const guidedPanel = screen.getByRole('complementary', { name: /guided sections side panel/i })
    expect(within(guidedPanel).getByRole('button', { name: /0 intelligence hub evidence ready/i })).toBeInTheDocument()
  })

  it('renders section-scoped discovery evidence in the active section ownership zone', async () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'ACCEPTED',
            },
            accepted: true,
            inputComplete: true,
            evidenceReady: true,
            scopedViews: {
              customer_problem: {
                summary: 'Customer-provided Intelligence Hub inputs are available for this section.',
                inputKeys: ['companyWebsite', 'companyName', 'marketRegion', 'targetOffer'],
              },
            },
          },
          sections: [
            {
              ...rendererPayload.sections[0],
              intelligence: {
                ...rendererPayload.sections[0].intelligence,
                displayProjection: {
                  suggestedFromDiscovery: {
                    title: 'Evidence Themes',
                    summary: 'The available accepted evidence supports these section-relevant themes.',
                    bullets: [
                      'Enterprise workflow friction',
                      'Governed narrative execution',
                      'Speed-to-output improvement',
                    ],
                    evidenceScope: 'Derived from accepted Intelligence Hub evidence and current section dependencies.',
                  },
                },
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await openGuidedSection()

    const suggestedRegion = screen.getByRole('region', { name: /suggested from intelligence hub/i })
    expect(suggestedRegion).toHaveTextContent('The available accepted evidence supports these section-relevant themes.')
    expect(within(suggestedRegion).getByRole('list', { name: /evidence themes/i })).toHaveTextContent(
      'Governed narrative execution',
    )
    expect(suggestedRegion).toHaveTextContent('Derived from accepted Intelligence Hub evidence and current section dependencies.')
    expect(suggestedRegion).not.toHaveTextContent('companyWebsite')
    expect(suggestedRegion).not.toHaveTextContent('marketRegion')
  })

  it('renders generated section intelligence with supporting evidence, boundaries, and confidence signals', async () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: {
                format: 'STRUCTURED_TEXT',
                content: 'Primary value drivers identified for Acme include governed workflow execution.',
                generatedAt: '2026-05-19T08:01:00.000Z',
                inputHash: 'hash-1',
                truthEligibility: {
                  eligible: true,
                  status: 'ELIGIBLE',
                  messages: [],
                },
              },
              intelligence: {
                ...rendererPayload.sections[0].intelligence,
                confidence: {
                  level: 'MEDIUM',
                  reasons: ['Intelligence Hub evidence accepted', 'No customer validation notes supplied'],
                },
                truthEligibility: {
                  eligible: true,
                  status: 'ELIGIBLE',
                  messages: [],
                },
                displayProjection: {
                  generatedInsight: {
                    title: 'Generated Insight',
                    summary: 'Primary value drivers identified for Acme include governed workflow execution.',
                    sections: [
                      {
                        heading: 'Primary Value Drivers',
                        body: '',
                        bullets: [
                          'Reduced manual narrative overhead',
                          'More consistent governed output generation',
                        ],
                      },
                      {
                        heading: 'Why These Matter',
                        body: 'These drivers align to accepted Intelligence Hub context and available section dependencies.',
                        bullets: [],
                      },
                    ],
                  },
                  supportingEvidence: {
                    title: 'Supporting Evidence',
                    items: [
                      'Target Offer: AI-native enterprise value management platform',
                      'Intelligence Hub Scope: Accepted Intelligence Hub evidence',
                    ],
                  },
                  boundaries: {
                    title: 'Boundaries / Not Assumed',
                    items: [
                      'No ROI statistics were generated because no accepted ROI evidence is present.',
                      'No competitor claims were generated because no accepted competitor evidence is present.',
                    ],
                  },
                  confidence: {
                    label: 'Confidence: Medium',
                    signals: [
                      'Intelligence Hub evidence accepted',
                      'No customer validation notes supplied',
                    ],
                  },
                },
              },
              state: {
                status: 'GENERATED',
                revisionCount: 0,
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await openGuidedSection()

    expect(screen.getByRole('tablist', { name: /customer problem sections/i })).toBeInTheDocument()
    const generatedRegion = screen.getByRole('region', { name: /generated content/i })
    expect(within(generatedRegion).getByRole('heading', { name: /generated insight/i })).toBeInTheDocument()
    expect(within(generatedRegion).getByRole('heading', { name: /primary value drivers/i })).toBeInTheDocument()
    expect(within(generatedRegion).getByText('Reduced manual narrative overhead')).toBeInTheDocument()
    expect(within(generatedRegion).getByText(/These drivers align to accepted Intelligence Hub context/i)).toBeInTheDocument()
    const generatedGroups = within(generatedRegion).getByRole('list', { name: /generated insight groups/i })
    expect(generatedGroups).toHaveClass('runtime-workspace__section-detail-groups')
    expect(within(generatedGroups).getByRole('heading', { name: /supporting evidence/i })).toBeInTheDocument()
    expect(within(generatedGroups).getByText('Target Offer')).toBeInTheDocument()
    expect(within(generatedGroups).getByText('AI-native enterprise value management platform')).toBeInTheDocument()
    expect(within(generatedGroups).getByRole('heading', { name: /boundaries \/ not assumed/i })).toBeInTheDocument()
    expect(generatedGroups).toHaveTextContent('No ROI statistics were generated because no accepted ROI evidence is present.')

    selectRuntimeSectionTab('Governance')
    const governedIntelligence = screen.getByRole('region', { name: /governed intelligence/i })
    expect(within(governedIntelligence).getByText('Confidence: Medium')).toBeInTheDocument()
    expect(within(governedIntelligence).getByText('No customer validation notes supplied')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /accept truth/i })).toBeEnabled()
  })

  it('loads evidence source lineage on demand without rendering fake source data', async () => {
    const user = userEvent.setup()
    useGetRuntimeEvidenceQuery.mockReturnValue({
      data: {
        data: {
          discovery: {
            lineage: {
              sources: [
                {
                  sourceId: 'input_companyWebsite',
                  type: 'USER_PROVIDED_WEBSITE',
                  fieldKey: 'companyWebsite',
                  url: 'https://acme.example',
                  status: 'USER_PROVIDED',
                },
              ],
            },
          },
        },
      },
      isFetching: false,
      error: null,
    })
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'EVIDENCE_READY',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: false,
            needsRefresh: false,
            inputValues: {
              companyName: 'Acme',
            },
            evidenceSummary: {
              keys: ['source'],
              count: 1,
            },
            lineageSummary: {
              sourceCount: 1,
              builderMode: 'DETERMINISTIC',
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    expect(useGetRuntimeEvidenceQuery).toHaveBeenLastCalledWith(
      { runtimeInstanceId: 'value-narrative-001' },
      { skip: true },
    )
    await user.click(screen.getByRole('button', { name: /view sources/i }))

    expect(useGetRuntimeEvidenceQuery).toHaveBeenLastCalledWith(
      { runtimeInstanceId: 'value-narrative-001' },
      { skip: false },
    )
    const sourceRegion = screen.getByRole('region', { name: /evidence sources/i })
    expect(within(sourceRegion).getByText('companyWebsite')).toBeInTheDocument()
    expect(within(sourceRegion).getByText(/USER_PROVIDED_WEBSITE \/ USER_PROVIDED \/ https:\/\/acme\.example/)).toBeInTheDocument()
    expect(within(sourceRegion).queryByText(/competitor/i)).not.toBeInTheDocument()
  })

  it('explains why evidence sources are disabled before an evidence pack exists', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'INPUT_REQUIRED',
            },
            inputComplete: false,
            evidenceReady: false,
            accepted: false,
            needsRefresh: false,
            inputSummary: {
              keys: [],
              count: 0,
            },
            evidenceSummary: {
              keys: [],
              count: 0,
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const viewSources = screen.getByRole('button', { name: /view sources/i })
    const reason = screen.getByText(/build an evidence pack before viewing sources/i)
    expect(viewSources).toBeDisabled()
    expect(viewSources).toHaveAttribute('aria-describedby', reason.id)
  })

  it('refreshes discovery evidence through the discovery inputs endpoint', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'INPUT_REQUIRED',
            },
            inputComplete: false,
            evidenceReady: false,
            accepted: false,
            needsRefresh: false,
            inputValues: {
              companyName: 'Acme',
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    selectIntelligenceHubTab('Context')

    await user.type(screen.getByLabelText('Website Source 1'), 'https://acme.example')
    await user.click(screen.getByRole('button', { name: /add url/i }))
    await user.type(screen.getByLabelText('Website Source 2'), 'https://acme.example/product')
    await user.type(screen.getByLabelText('Market / Region'), 'UK enterprise')
    await user.type(screen.getByLabelText('Target Product or Offer'), 'Managed proposal platform')
    await user.type(screen.getByLabelText('Optional Notes'), 'Prioritize governed evidence reuse.')
    await user.click(screen.getByRole('button', { name: /build evidence pack/i }))

    expect(updateRuntimeDiscoveryInputs).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        acquisitionProfile: 'STANDARD',
        inputs: {
          companyWebsite: 'https://acme.example',
          websiteSources: ['https://acme.example', 'https://acme.example/product'],
          companyName: 'Acme',
          marketRegion: 'UK enterprise',
          targetOffer: 'Managed proposal platform',
          notes: 'Prioritize governed evidence reuse.',
        },
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText(/Intelligence Hub evidence refreshed/i)).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /status: Intelligence Hub evidence refreshed/i })).toBeInTheDocument()
  })

  it('uploads selected discovery documents with the governed evidence refresh request', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'INPUT_REQUIRED',
            },
            inputComplete: false,
            evidenceReady: false,
            accepted: false,
            needsRefresh: false,
            inputValues: {
              companyName: 'Acme',
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    selectIntelligenceHubTab('Context')
    const discoveryDocuments = screen.getByRole('region', { name: /intelligence hub document context/i })
    expect(within(discoveryDocuments).queryByRole('button', { name: /^extract evidence$/i })).not.toBeInTheDocument()

    const discoveryDocument = new File(
      ['Customer teams need governed workflow automation for value narratives.'],
      'customer-notes.txt',
      { type: 'text/plain' },
    )

    const discoveryFileInput = within(discoveryDocuments).getByLabelText('Document Sources')
    await user.upload(discoveryFileInput, discoveryDocument)
    expect(await within(discoveryDocuments).findByText('customer-notes.txt')).toBeInTheDocument()
    expect(discoveryFileInput).toBeDisabled()
    const selectedDiscoveryDocuments = within(discoveryDocuments).getByRole('list', {
      name: /selected intelligence hub documents/i,
    })
    expect(within(selectedDiscoveryDocuments).getByText(/staged for extraction/i)).toBeInTheDocument()
    expect(within(selectedDiscoveryDocuments).getByText('Ready to extract')).toBeInTheDocument()
    expect(within(discoveryDocuments).getByRole('status', {
      name: /status: 1 selected document staged for extraction/i,
    })).toBeInTheDocument()
    expect(within(discoveryDocuments).getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
    expect(within(discoveryDocuments).queryByText(/^select files$/i)).not.toBeInTheDocument()

    await user.click(within(discoveryDocuments).getByRole('button', { name: /^cancel$/i }))
    expect(within(discoveryDocuments).queryByText('customer-notes.txt')).not.toBeInTheDocument()
    expect(within(discoveryDocuments).queryByRole('button', { name: /^extract evidence$/i })).not.toBeInTheDocument()
    expect(within(discoveryDocuments).getByText(/^select files$/i)).toBeInTheDocument()
    expect(discoveryFileInput).not.toBeDisabled()

    await user.upload(discoveryFileInput, discoveryDocument)
    expect(await within(discoveryDocuments).findByText('customer-notes.txt')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Website Source 1'), 'https://acme.example')
    await user.type(screen.getByLabelText('Market / Region'), 'UK enterprise')
    await user.type(screen.getByLabelText('Target Product or Offer'), 'Managed proposal platform')
    await user.click(within(discoveryDocuments).getByRole('button', { name: /extract intelligence hub document evidence/i }))

    expect(updateRuntimeDiscoveryInputs).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        acquisitionProfile: 'STANDARD',
        documentSources: [
          expect.objectContaining({
            fileName: 'customer-notes.txt',
            mimeType: 'text/plain',
            assetType: 'CUSTOMER_DOCUMENT',
            sizeBytes: discoveryDocument.size,
            contentBase64: expect.stringMatching(/^data:text\/plain;base64,/),
          }),
        ],
        inputs: {
          companyWebsite: 'https://acme.example',
          websiteSources: ['https://acme.example'],
          companyName: 'Acme',
          marketRegion: 'UK enterprise',
          targetOffer: 'Managed proposal platform',
          notes: '',
        },
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText(/Intelligence Hub evidence refreshed/i)).toBeInTheDocument()
  })

  it('blocks evidence refresh while selected discovery documents are still preparing', async () => {
    const OriginalFileReader = window.FileReader
    window.FileReader = class PendingFileReader {
      readAsDataURL() {}
    }

    try {
      renderRuntimeWorkspace()
      selectIntelligenceHubTab('Context')

      const discoveryDocument = new File(
        ['Customer teams need governed workflow automation for value narratives.'],
        'customer-notes.txt',
        { type: 'text/plain' },
      )

      fireEvent.change(screen.getByLabelText('Document Sources'), {
        target: { files: [discoveryDocument] },
      })

      expect(await screen.findByText(/preparing selected documents/i)).toBeInTheDocument()
      const discoveryDocuments = screen.getByRole('region', { name: /intelligence hub document context/i })
      expect(within(discoveryDocuments).queryByRole('button', { name: /^extract evidence$/i })).not.toBeInTheDocument()
      const buildButton = screen.getByRole('button', { name: /build evidence pack/i })
      expect(buildButton).toBeDisabled()
      fireEvent.submit(buildButton.closest('form'))
      expect(updateRuntimeDiscoveryInputs).not.toHaveBeenCalled()
    } finally {
      window.FileReader = OriginalFileReader
    }
  })

  it('blocks evidence refresh after discovery document validation fails', async () => {
    const user = userEvent.setup()

    renderRuntimeWorkspace()
    selectIntelligenceHubTab('Context')

    fireEvent.change(screen.getByLabelText('Document Sources'), {
      target: {
        files: [
          new File(['Unsupported executable content.'], 'customer-notes.exe', {
            type: 'application/octet-stream',
          }),
        ],
      },
    })

    expect(await screen.findByRole('status', {
      name: /status: customer-notes\.exe is not a supported Intelligence Hub document type/i,
    })).toBeInTheDocument()
    const discoveryDocuments = screen.getByRole('region', { name: /intelligence hub document context/i })
    expect(within(discoveryDocuments).queryByRole('button', { name: /^extract evidence$/i })).not.toBeInTheDocument()
    const buildButton = screen.getByRole('button', { name: /build evidence pack/i })
    expect(buildButton).toBeDisabled()
    await user.click(buildButton)
    expect(updateRuntimeDiscoveryInputs).not.toHaveBeenCalled()
  })

  it('builds discovery evidence through a governed runtime action when projected', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          actions: [
            {
              actionKey: 'BUILD_EVIDENCE_PACK',
              governedAction: 'BUILD_EVIDENCE_PACK',
              buttonLabel: 'Build Evidence Pack',
              enabled: true,
              successMessage: 'Evidence pack built.',
            },
          ],
          discovery: {
            state: {
              status: 'INPUT_REQUIRED',
            },
            inputComplete: false,
            evidenceReady: false,
            accepted: false,
            needsRefresh: false,
            inputValues: {
              companyName: 'Acme',
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    selectIntelligenceHubTab('Context')

    expect(screen.getByRole('option', { name: 'Enhanced Acquisition' })).toBeEnabled()
    expect(screen.getByRole('option', { name: /strategic acquisition/i })).toBeDisabled()
    await user.type(screen.getByLabelText('Website Source 1'), 'https://acme.example')
    await user.type(screen.getByLabelText('Market / Region'), 'UK enterprise')
    await user.type(screen.getByLabelText('Target Product or Offer'), 'Managed proposal platform')
    await user.click(screen.getByRole('button', { name: /build evidence pack/i }))

    expect(executeRuntimeAction).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      actionKey: 'BUILD_EVIDENCE_PACK',
      body: {
        acquisitionProfile: 'STANDARD',
        inputs: {
          companyWebsite: 'https://acme.example',
          websiteSources: ['https://acme.example'],
          companyName: 'Acme',
          marketRegion: 'UK enterprise',
          targetOffer: 'Managed proposal platform',
          notes: '',
        },
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(updateRuntimeDiscoveryInputs).not.toHaveBeenCalled()
    expect(refetchRenderer).toHaveBeenCalled()
  })

  it('sends Enhanced Acquisition when the enabled profile is selected', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          actions: [
            {
              actionKey: 'BUILD_EVIDENCE_PACK',
              governedAction: 'BUILD_EVIDENCE_PACK',
              buttonLabel: 'Build Evidence Pack',
              enabled: true,
              successMessage: 'Evidence pack built.',
            },
          ],
          discovery: {
            state: {
              status: 'INPUT_REQUIRED',
            },
            inputComplete: false,
            evidenceReady: false,
            accepted: false,
            needsRefresh: false,
            inputValues: {
              companyName: 'Acme',
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    selectIntelligenceHubTab('Context')

    await user.selectOptions(screen.getByLabelText('Acquisition Profile'), 'ENHANCED')
    await user.type(screen.getByLabelText('Website Source 1'), 'https://acme.example')
    await user.type(screen.getByLabelText('Market / Region'), 'UK enterprise')
    await user.type(screen.getByLabelText('Target Product or Offer'), 'Managed proposal platform')
    await user.click(screen.getByRole('button', { name: /build evidence pack/i }))

    expect(executeRuntimeAction).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      actionKey: 'BUILD_EVIDENCE_PACK',
      body: {
        acquisitionProfile: 'ENHANCED',
        inputs: {
          companyWebsite: 'https://acme.example',
          websiteSources: ['https://acme.example'],
          companyName: 'Acme',
          marketRegion: 'UK enterprise',
          targetOffer: 'Managed proposal platform',
          notes: '',
        },
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(screen.getByRole('option', { name: /strategic acquisition/i })).toBeDisabled()
  })

  it('keeps the evidence pack profile tied to persisted evidence until refresh runs', async () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'ACCEPTED',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: true,
            needsRefresh: false,
            acquisitionProfile: 'STANDARD',
            inputValues: {
              companyName: 'Acme',
            },
            evidenceSummary: {
              keys: ['source', 'inputKeys'],
              count: 2,
            },
            lineageSummary: {
              sourceCount: 1,
              builderMode: 'DETERMINISTIC',
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    selectIntelligenceHubTab('Evidence')
    const evidencePack = screen.getByRole('region', { name: /evidence pack/i })
    expect(within(evidencePack).getByText('Standard Acquisition')).toBeInTheDocument()

    selectIntelligenceHubTab('Context')
    expect(screen.getByRole('option', { name: 'Enhanced Acquisition' })).toBeEnabled()
    expect(screen.getByLabelText('Acquisition Profile')).toHaveValue('STANDARD')
    selectIntelligenceHubTab('Evidence')
    expect(within(evidencePack).getByText('Standard Acquisition')).toBeInTheDocument()
    expect(within(evidencePack).queryByText('Enhanced')).not.toBeInTheDocument()
    expect(updateRuntimeDiscoveryInputs).not.toHaveBeenCalled()
    expect(executeRuntimeAction).not.toHaveBeenCalled()
  })

  it('warns before clearing discovery evidence and accepted truths', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'ACCEPTED',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: true,
            needsRefresh: false,
            acquisitionProfile: 'STANDARD',
            acceptedAt: '2026-05-19T08:02:00.000Z',
            inputValues: {
              companyWebsite: 'https://acme.example',
              websiteSources: ['https://acme.example'],
              companyName: 'Acme',
              marketRegion: 'UK enterprise',
              targetOffer: 'Managed proposal platform',
              notes: 'Accepted evidence from prior Intelligence Hub run.',
            },
            inputSummary: {
              keys: ['companyWebsite', 'companyName', 'marketRegion', 'targetOffer', 'notes'],
              count: 5,
            },
            evidenceSummary: {
              keys: ['source', 'inputKeys'],
              count: 2,
            },
            lineageSummary: {
              sourceCount: 2,
              builderMode: 'DETERMINISTIC',
            },
            sourceRegistrySummary: {
              count: 2,
              sourceTypes: ['WEBSITE', 'DISCOVERY_NOTES'],
            },
            evidenceObjectSummary: {
              evidenceObjectCount: 5,
              acceptedEvidenceCount: 5,
              pendingReviewCount: 0,
              rejectedEvidenceCount: 0,
            },
            scopedViews: {
              executive_summary: {
                source: 'DISCOVERY_EVIDENCE_OBJECTS',
              },
            },
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /clear intelligence hub/i }))

    expect(screen.getByText(/clear all Intelligence Hub evidence and accepted truths/i)).toBeInTheDocument()
    expect(screen.getByText(/the audit log will record who cleared it/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(resetRuntimeDiscovery).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /clear intelligence hub/i }))
    await user.click(screen.getByRole('button', { name: /clear all/i }))

    expect(resetRuntimeDiscovery).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        confirmReset: true,
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        reason: 'USER_REQUESTED_DISCOVERY_RESET',
      },
    })
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText(/Intelligence Hub cleared/i)).toBeInTheDocument()
    selectIntelligenceHubTab('Context')
    expect(screen.getByLabelText('Website Source 1')).toHaveValue('')
    expect(screen.getByLabelText('Company Name')).toHaveValue('')
    expect(screen.getByLabelText('Acquisition Profile')).toHaveValue('STANDARD')
  })

  it('clears local Intelligence Hub draft input without calling governed reset', async () => {
    const user = userEvent.setup()

    renderRuntimeWorkspace()
    selectIntelligenceHubTab('Context')

    await user.type(screen.getByLabelText('Website Source 1'), 'https://draft.example')
    await user.type(screen.getByLabelText('Company Name'), 'Draft Acme')

    await user.click(screen.getByRole('button', { name: /clear intelligence hub/i }))

    expect(resetRuntimeDiscovery).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Website Source 1')).toHaveValue('')
    expect(screen.getByLabelText('Company Name')).toHaveValue('')
    expect(screen.getByLabelText('Acquisition Profile')).toHaveValue('STANDARD')
  })

  it('renders safe Discovery reset history from projected audit activity', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'RESET',
              lastResetAt: '2026-05-19T08:05:00.000Z',
              resetBy: 'user-1',
            },
            inputComplete: false,
            evidenceReady: false,
            accepted: false,
            needsRefresh: false,
            acquisitionProfile: 'STANDARD',
            inputValues: {},
            inputSummary: {
              keys: [],
              count: 0,
            },
            evidenceSummary: {
              keys: [],
              count: 0,
            },
            sourceRegistrySummary: {
              count: 0,
              sourceTypes: [],
            },
            evidenceObjectSummary: {
              evidenceObjectCount: 0,
              acceptedEvidenceCount: 0,
              pendingReviewCount: 0,
              rejectedEvidenceCount: 0,
            },
            scopedViews: {},
            resetSummary: {
              resetAt: '2026-05-19T08:05:00.000Z',
              resetBy: 'user-1',
              previousEvidenceSummary: {
                inputCount: 6,
                sourceRegistryCount: 10,
                evidenceObjectCount: 10,
                scopedViewCount: 25,
              },
              clearedSectionTruthCount: 1,
            },
          },
          activity: [
            {
              eventId: 'audit-reset-1',
              action: 'RUNTIME_STATE_MUTATED',
              activityType: 'DISCOVERY_RESET',
              summary: 'Intelligence Hub evidence and section truth cleared',
              actorLabel: 'Jill Faithful',
              occurredAt: '2026-05-19T08:05:00.000Z',
              reset: {
                reason: 'DISCOVERY_RESET',
                resetAt: '2026-05-19T08:05:00.000Z',
                resetBy: 'user-1',
                previousEvidenceSummary: {
                  inputCount: 6,
                  sourceRegistryCount: 10,
                  evidenceObjectCount: 10,
                  scopedViewCount: 25,
                },
                clearedSectionTruthCount: 1,
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    selectIntelligenceHubTab('Governance')
    const resetHistory = screen.getByRole('region', { name: /intelligence hub reset history/i })
    expect(within(resetHistory).getByText(/last reset/i)).toBeInTheDocument()
    expect(resetHistory).toHaveTextContent('Jill Faithful')
    expect(resetHistory).toHaveTextContent('Previous Intelligence Hub held 6 inputs, 10 sources, 10 evidence objects, 25 scoped views.')
    expect(resetHistory).toHaveTextContent('1 section truth cleared.')
    expect(resetHistory).not.toHaveTextContent('previousValue')
    expect(resetHistory).not.toHaveTextContent('sourceRegistry')
    expect(resetHistory).not.toHaveTextContent('user-1')
  })

  it('renders source registry, evidence object, and discovery health projections without mock rows', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'EVIDENCE_READY',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: false,
            needsRefresh: false,
            acquisitionProfile: 'STANDARD',
            inputValues: {},
            evidenceSummary: {
              keys: ['source'],
              count: 1,
            },
            lineageSummary: {
              sourceCount: 5,
              builderMode: 'DETERMINISTIC',
            },
            sourceRegistrySummary: {
              count: 5,
              sourceTypes: ['WEBSITE', 'DISCOVERY_NOTES'],
            },
            evidenceObjectSummary: {
              evidenceObjectCount: 5,
              acceptedEvidenceCount: 0,
              pendingReviewCount: 5,
              rejectedEvidenceCount: 0,
            },
            discoveryHealth: {
              coveragePercent: 40,
              confidence: 'STANDARD',
              missingAreas: ['PROOF', 'ECONOMICS'],
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    selectIntelligenceHubTab('Evidence')
    const evidencePack = screen.getByRole('region', { name: /evidence pack/i })
    expect(within(evidencePack).getByText(/5 evidence objects: 0 accepted, 5 pending review, 0 rejected/i))
      .toBeInTheDocument()
    expect(within(evidencePack).getByText(/5 sources recorded/i)).toBeInTheDocument()
    expect(within(evidencePack).getByText(/Recorded via Deterministic/i)).toBeInTheDocument()

    selectIntelligenceHubTab('Sources')
    const sourceRegistry = screen.getByRole('region', { name: /source registry/i })
    expect(within(sourceRegistry).getByText(/5 registered sources: Website, Intelligence Hub Notes/i)).toBeInTheDocument()

    selectIntelligenceHubTab('Evidence')
    const evidenceReview = screen.getByRole('region', { name: /evidence review/i })
    expect(within(evidenceReview).getByText(/5 evidence objects: 0 accepted, 5 pending review, 0 rejected/i))
      .toBeInTheDocument()

    selectIntelligenceHubTab('Coverage')
    const discoveryHealth = screen.getByRole('region', { name: /intelligence hub health/i })
    expect(within(discoveryHealth).getByText(/coverage 40%/i)).toBeInTheDocument()
    expect(within(discoveryHealth).getByText(/Standard confidence/i)).toBeInTheDocument()
    expect(within(discoveryHealth).getByText(/Missing areas/i)).toBeInTheDocument()
    expect(within(discoveryHealth).getByText(/Proof, Economics/i)).toBeInTheDocument()
  })

  it('groups website sources and uploaded documents in the source registry', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'EVIDENCE_READY',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: false,
            needsRefresh: false,
            acquisitionProfile: 'STANDARD',
            inputValues: {},
            evidenceSummary: {
              keys: ['source'],
              count: 1,
            },
            lineageSummary: {
              sourceCount: 3,
              builderMode: 'DETERMINISTIC_WEBSITE_AND_DOCUMENT_ACQUISITION',
            },
            sourceRegistrySummary: {
              count: 3,
              sourceTypes: ['WEBSITE', 'UPLOADED_DOCUMENT', 'DISCOVERY_NOTES'],
            },
            sourceRegistry: [
              {
                sourceId: 'website_acme',
                sourceType: 'WEBSITE',
                label: 'Website Source',
                acquisitionStatus: 'ACQUIRED',
                evidenceProduced: 8,
                url: 'https://acme.example/product',
              },
              {
                sourceId: 'document_customer_notes',
                sourceType: 'UPLOADED_DOCUMENT',
                label: 'Customer Document: customer-notes.docx',
                acquisitionStatus: 'ACQUIRED',
                documentStatus: 'PROCESSED',
                documentType: 'DOCX',
                fileName: 'customer-notes.docx',
                evidenceObjectsGenerated: 30,
              },
              {
                sourceId: 'input_notes',
                sourceType: 'DISCOVERY_NOTES',
                label: 'Discovery Notes',
                acquisitionStatus: 'CAPTURED',
                evidenceProduced: 1,
              },
            ],
            evidenceObjectSummary: {
              evidenceObjectCount: 39,
              acceptedEvidenceCount: 0,
              pendingReviewCount: 39,
              rejectedEvidenceCount: 0,
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    selectIntelligenceHubTab('Sources')
    const sourceRegistry = screen.getByRole('region', { name: /source registry/i })
    expect(within(sourceRegistry).getByRole('heading', { name: 'Website Sources (1)' })).toBeInTheDocument()
    expect(within(sourceRegistry).getAllByText('1 source')).toHaveLength(3)
    expect(within(sourceRegistry).getByText('https://acme.example/product')).toBeInTheDocument()
    expect(within(sourceRegistry).getByRole('heading', { name: 'Document Sources (1)' })).toBeInTheDocument()
    expect(within(sourceRegistry).getByText('customer-notes.docx')).toBeInTheDocument()
    expect(within(sourceRegistry).getByText(/DOCX \/ Processed \/ 30 evidence objects/i)).toBeInTheDocument()
    expect(within(sourceRegistry).getByRole('heading', { name: 'Intelligence Hub Sources (1)' })).toBeInTheDocument()
    expect(within(sourceRegistry).getByText('Intelligence Hub Notes')).toBeInTheDocument()
    expect(within(sourceRegistry).queryByText('Discovery Notes')).not.toBeInTheDocument()
  })

  it('renders Enhanced Acquisition evidence as source-backed website evidence', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'EVIDENCE_READY',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: false,
            needsRefresh: false,
            acquisitionProfile: 'ENHANCED',
            acquisition: {
              profile: 'ENHANCED',
              coverage: {
                score: 70,
              },
            },
            inputValues: {},
            evidenceSummary: {
              keys: ['source'],
              count: 1,
            },
            lineageSummary: {
              sourceCount: 6,
              builderMode: 'DETERMINISTIC_WEBSITE_ACQUISITION',
            },
            sourceRegistrySummary: {
              count: 6,
              sourceTypes: ['WEBSITE', 'DISCOVERY_NOTES'],
            },
            evidenceObjectSummary: {
              evidenceObjectCount: 11,
              acceptedEvidenceCount: 0,
              pendingReviewCount: 11,
              rejectedEvidenceCount: 0,
            },
            discoveryHealth: {
              coveragePercent: 70,
              confidence: 'SOURCE_BACKED',
              missingAreas: ['ECONOMICS'],
              coverageAreas: [
                {
                  area: 'Company',
                  state: 'STRONG',
                  evidenceCount: 3,
                  acceptedEvidenceCount: 2,
                },
                {
                  area: 'Economics',
                  state: 'MISSING',
                  evidenceCount: 0,
                  acceptedEvidenceCount: 0,
                },
                {
                  area: 'Products',
                  state: 'ADEQUATE',
                  evidenceCount: 2,
                  acceptedEvidenceCount: 1,
                },
                {
                  area: 'Services',
                  state: 'WEAK',
                  evidenceCount: 1,
                  acceptedEvidenceCount: 0,
                },
                {
                  area: 'Markets',
                  state: 'MISSING',
                  evidenceCount: 0,
                  acceptedEvidenceCount: 0,
                },
                {
                  area: 'Industries',
                  state: 'MISSING',
                  evidenceCount: 0,
                  acceptedEvidenceCount: 0,
                },
              ],
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const coverageHeatmap = screen.getByRole('region', { name: /coverage heatmap/i })
    expect(within(coverageHeatmap).getByText('Company')).toBeInTheDocument()
    expect(within(coverageHeatmap).getByText('Industries')).toBeInTheDocument()
    expect(within(coverageHeatmap).getByLabelText(/Company coverage status: Strong accepted evidence coverage/i))
      .toBeInTheDocument()
    expect(within(coverageHeatmap).getByLabelText(/Economics coverage status: No accepted evidence coverage/i))
      .toBeInTheDocument()
    expect(within(coverageHeatmap).getAllByRole('progressbar')).toHaveLength(6)
    const companyCoverageProgress = within(coverageHeatmap).getByRole('progressbar', {
      name: /Company: Strong, 2 accepted of 3 evidence objects/i,
    })
    expect(companyCoverageProgress).toHaveAttribute('value', '67')
    expect(companyCoverageProgress).toHaveAttribute('aria-valuetext', '2 accepted of 3 evidence objects')

    const evidenceAcceptanceSummary = screen.getByRole('region', { name: /evidence acceptance summary/i })
    expect(within(evidenceAcceptanceSummary).getByText('Pending')).toBeInTheDocument()
    expect(within(evidenceAcceptanceSummary).getByText('Evidence')).toBeInTheDocument()
    expect(within(evidenceAcceptanceSummary).getByText('Accepted objects')).toBeInTheDocument()
    expect(within(evidenceAcceptanceSummary).getByText('Sources')).toBeInTheDocument()
    expect(within(evidenceAcceptanceSummary).getByText('Contributing')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /accepted truth summary/i })).not.toBeInTheDocument()

    selectIntelligenceHubTab('Evidence')
    const evidencePack = screen.getByRole('region', { name: /evidence pack/i })
    expect(within(evidencePack).getByText(/Enhanced Acquisition/i)).toBeInTheDocument()
    expect(within(evidencePack).getByText(/Coverage 70%/i)).toBeInTheDocument()
    expect(within(evidencePack).getByText(/11 evidence objects: 0 accepted, 11 pending review, 0 rejected/i))
      .toBeInTheDocument()
    expect(within(evidencePack).getByText(/6 sources recorded/i)).toBeInTheDocument()
    expect(within(evidencePack).getByText(/Recorded via Deterministic Website Acquisition/i))
      .toBeInTheDocument()

    selectIntelligenceHubTab('Coverage')
    const discoveryHealth = screen.getByRole('region', { name: /intelligence hub health/i })
    expect(within(discoveryHealth).getByText(/coverage 70%/i)).toBeInTheDocument()
    expect(within(discoveryHealth).getByText(/Source Backed confidence/i)).toBeInTheDocument()
  })

  it('keeps accepted evidence summary separate from accepted section truth copy', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'ACCEPTED',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: true,
            acceptedAt: '2026-06-01T14:41:00.000Z',
            needsRefresh: false,
            acquisitionProfile: 'STANDARD',
            acquisition: {
              profile: 'STANDARD',
              coverage: {
                score: 100,
              },
            },
            evidenceSummary: {
              keys: ['companyWebsite', 'companyName'],
              count: 2,
            },
            lineageSummary: {
              sourceCount: 5,
              builderMode: 'DETERMINISTIC',
            },
            sourceRegistrySummary: {
              count: 5,
              sourceTypes: ['WEBSITE', 'DISCOVERY_NOTES'],
            },
            evidenceObjectSummary: {
              evidenceObjectCount: 11,
              acceptedEvidenceCount: 11,
              pendingReviewCount: 0,
              rejectedEvidenceCount: 0,
            },
            discoveryHealth: {
              coveragePercent: 100,
              confidence: 'SOURCE_BACKED',
              missingAreas: [],
              coverageAreas: [],
            },
            scopedViews: {},
          },
          sections: rendererPayload.sections.map((section) => ({
            ...section,
            accepted: null,
            state: {
              ...section.state,
              status: 'DRAFT',
            },
          })),
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const evidenceAcceptanceSummary = screen.getByRole('region', { name: /evidence acceptance summary/i })
    expect(within(evidenceAcceptanceSummary).getByRole('heading', { name: /evidence acceptance summary/i }))
      .toBeInTheDocument()
    expect(within(evidenceAcceptanceSummary).getByText(/accepted evidence is ready for downstream generation/i))
      .toBeInTheDocument()
    expect(within(evidenceAcceptanceSummary).getByText('11')).toBeInTheDocument()
    expect(within(evidenceAcceptanceSummary).getByText('Accepted objects')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /accepted truth summary/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/governed truth ready for downstream generation/i)).not.toBeInTheDocument()
  })

  it('reviews an evidence object from the evidence details projection', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'EVIDENCE_READY',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: false,
            needsRefresh: false,
            acquisitionProfile: 'STANDARD',
            inputValues: {},
            evidenceSummary: {
              keys: ['source'],
              count: 1,
            },
            lineageSummary: {
              sourceCount: 1,
              builderMode: 'DETERMINISTIC',
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })
    useGetRuntimeEvidenceQuery.mockReturnValue({
      data: {
        data: {
          discovery: {
            sourceRegistry: [
              {
                sourceId: 'input_companyWebsite',
                sourceType: 'WEBSITE',
                label: 'Company Website',
                acquisitionStatus: 'CAPTURED',
                evidenceProduced: 1,
                url: 'https://acme.example',
              },
            ],
            evidenceObjects: [
              {
                evidenceObjectId: 'evidence_companyWebsite_fixture',
                sourceId: 'input_companyWebsite',
                category: 'Company',
                coverageArea: 'Company',
                extractedFact: 'Company website: https://acme.example',
                reviewStatus: 'PENDING',
              },
              {
                evidenceObjectId: 'evidence_notes_fixture',
                sourceId: 'input_notes',
                category: 'Value Drivers',
                coverageArea: 'Value Drivers',
                extractedFact: 'Discovery note: governed narrative generation is required.',
                reviewStatus: 'PENDING',
              },
            ],
          },
        },
      },
      isFetching: false,
      error: null,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /view sources/i }))
    const evidenceSources = screen.getByRole('region', { name: /evidence sources/i })
    expect(within(evidenceSources).getByRole('heading', { name: 'Intelligence Hub Sources (1)' })).toBeInTheDocument()
    expect(within(evidenceSources).getByText('https://acme.example')).toBeInTheDocument()
    expect(within(evidenceSources).getByText('Company website: https://acme.example')).toBeInTheDocument()
    expect(within(evidenceSources).getByText('Intelligence Hub note: governed narrative generation is required.'))
      .toBeInTheDocument()
    expect(within(evidenceSources).queryByText(/Discovery note/i)).not.toBeInTheDocument()

    await user.click(within(evidenceSources).getByRole('button', {
      name: /reject evidence object evidence_companyWebsite_fixture/i,
    }))

    expect(reviewRuntimeDiscoveryEvidence).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      evidenceObjectId: 'evidence_companyWebsite_fixture',
      body: {
        reviewStatus: 'REJECTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText(/evidence object rejected/i)).toBeInTheDocument()
  })

  it('serializes governed evidence review actions while a review mutation is in flight', async () => {
    const user = userEvent.setup()
    unwrapReviewDiscoveryEvidence.mockReturnValueOnce(new Promise(() => {}))
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'EVIDENCE_READY',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: false,
            needsRefresh: false,
            acquisitionProfile: 'STANDARD',
            inputValues: {},
            evidenceSummary: {
              keys: ['source'],
              count: 1,
            },
            lineageSummary: {
              sourceCount: 2,
              builderMode: 'DETERMINISTIC',
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })
    useGetRuntimeEvidenceQuery.mockReturnValue({
      data: {
        data: {
          discovery: {
            evidenceObjects: [
              {
                evidenceObjectId: 'evidence_companyWebsite_fixture',
                sourceId: 'input_companyWebsite',
                category: 'Company',
                coverageArea: 'Company',
                extractedFact: 'Company website: https://acme.example',
                reviewStatus: 'PENDING',
              },
              {
                evidenceObjectId: 'evidence_targetOffer_fixture',
                sourceId: 'input_targetOffer',
                category: 'Products',
                coverageArea: 'Products',
                extractedFact: 'Target offer: Managed proposal platform',
                reviewStatus: 'PENDING',
              },
            ],
          },
        },
      },
      isFetching: false,
      error: null,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /view sources/i }))
    const evidenceSources = screen.getByRole('region', { name: /evidence sources/i })
    await user.click(within(evidenceSources).getByRole('button', {
      name: /reject evidence object evidence_companyWebsite_fixture/i,
    }))

    expect(reviewRuntimeDiscoveryEvidence).toHaveBeenCalledTimes(1)
    expect(within(evidenceSources).getByRole('button', {
      name: /reject evidence object evidence_companyWebsite_fixture/i,
    })).toBeDisabled()
    expect(within(evidenceSources).getByRole('button', {
      name: /accept evidence object evidence_targetOffer_fixture/i,
    })).toBeDisabled()

    await user.click(within(evidenceSources).getByRole('button', {
      name: /accept evidence object evidence_targetOffer_fixture/i,
    }))
    expect(reviewRuntimeDiscoveryEvidence).toHaveBeenCalledTimes(1)
  })

  it('keeps discovery mutations read-only for immutable lifecycle truth', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          lifecycle: {
            stage: 'APPROVED',
          },
          discovery: {
            state: {
              status: 'ACCEPTED',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: true,
            needsRefresh: false,
            acquisitionProfile: 'STANDARD',
            inputValues: {
              companyWebsite: 'https://acme.example',
              companyName: 'Acme',
              marketRegion: 'UK enterprise',
              targetOffer: 'Managed proposal platform',
            },
            sourceRegistrySummary: {
              count: 0,
              sourceTypes: [],
            },
            evidenceObjectSummary: {
              evidenceObjectCount: 0,
              acceptedEvidenceCount: 0,
              pendingReviewCount: 0,
              rejectedEvidenceCount: 0,
            },
            evidenceSummary: {
              keys: ['source'],
              count: 1,
            },
            lineageSummary: {
              sourceCount: 1,
              builderMode: 'DETERMINISTIC',
            },
            scopedViews: {},
            acceptedAt: '2026-05-24T09:00:00.000Z',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })
    useGetRuntimeEvidenceQuery.mockReturnValue({
      data: {
        data: {
          discovery: {
            sourceRegistry: [
              {
                sourceId: 'input_companyWebsite',
                sourceType: 'WEBSITE',
                label: 'Company Website',
                acquisitionStatus: 'CAPTURED',
                evidenceProduced: 1,
                url: 'https://acme.example',
              },
            ],
            evidenceObjects: [
              {
                evidenceObjectId: 'evidence_companyWebsite_fixture',
                sourceId: 'input_companyWebsite',
                category: 'Company',
                coverageArea: 'Company',
                extractedFact: 'Company website: https://acme.example',
                reviewStatus: 'PENDING',
              },
            ],
            discoveryHealth: {
              coveragePercent: 10,
              confidence: 'USER_PROVIDED',
              evidenceObjectCount: 1,
              acceptedEvidenceCount: 0,
              pendingReviewCount: 1,
              rejectedEvidenceCount: 0,
              sourceCount: 1,
              missingAreas: ['Products', 'Proof'],
            },
          },
        },
      },
      isFetching: false,
      error: null,
    })

    renderRuntimeWorkspace()

    const lifecycleReasons = screen.getAllByText(/runtime lifecycle truth is approved or published/i)
    const refreshButton = screen.getByRole('button', { name: /refresh evidence pack/i })
    const acceptEvidenceButton = screen.getByRole('button', { name: /accept evidence/i })
    const clearDiscoveryButton = screen.getByRole('button', { name: /clear intelligence hub/i })
    selectIntelligenceHubTab('Context')
    expect(screen.getByLabelText('Website Source 1')).toBeDisabled()
    selectIntelligenceHubTab('Sources')
    const sourceRegistry = screen.getByRole('region', { name: /source registry/i })
    selectIntelligenceHubTab('Evidence')
    const evidenceReview = screen.getByRole('region', { name: /evidence review/i })
    selectIntelligenceHubTab('Coverage')
    const discoveryHealth = screen.getByRole('region', { name: /intelligence hub health/i })

    expect(lifecycleReasons).toHaveLength(3)
    expect(refreshButton).toBeDisabled()
    expect(refreshButton).toHaveAttribute('aria-describedby', 'discovery-build-disabled-reason')
    expect(acceptEvidenceButton).toBeDisabled()
    expect(acceptEvidenceButton).toHaveAttribute('aria-describedby', 'discovery-accept-disabled-reason')
    expect(clearDiscoveryButton).toBeDisabled()
    expect(clearDiscoveryButton).toHaveAttribute('aria-describedby', 'discovery-reset-disabled-reason')
    expect(sourceRegistry).toHaveTextContent('1 registered source: Website.')
    expect(evidenceReview).toHaveTextContent('1 evidence object: 0 accepted, 1 pending review, 0 rejected.')
    expect(discoveryHealth).toHaveTextContent('Coverage 10%')
    expect(discoveryHealth).toHaveTextContent('User Provided confidence.')

    await user.click(screen.getByRole('button', { name: /view sources/i }))

    const evidenceSources = screen.getByRole('region', { name: /evidence sources/i })
    expect(within(evidenceSources).getByRole('heading', { name: 'Intelligence Hub Sources (1)' })).toBeInTheDocument()
    expect(within(evidenceSources).getByText('https://acme.example')).toBeInTheDocument()
    expect(within(evidenceSources).getByRole('button', {
      name: /accept evidence object evidence_companyWebsite_fixture/i,
    })).toBeDisabled()
    expect(within(evidenceSources).getByRole('button', {
      name: /reject evidence object evidence_companyWebsite_fixture/i,
    })).toBeDisabled()
    expect(reviewRuntimeDiscoveryEvidence).not.toHaveBeenCalled()
    expect(updateRuntimeDiscoveryInputs).not.toHaveBeenCalled()
  })

  it('accepts ready discovery evidence through the discovery acceptance endpoint', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'EVIDENCE_READY',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: false,
            needsRefresh: false,
            inputValues: {
              companyName: 'Acme',
            },
            evidenceSummary: {
              keys: ['source'],
              count: 1,
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /accept evidence/i }))

    expect(acceptRuntimeDiscovery).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText(/Intelligence Hub accepted/i)).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /status: Intelligence Hub accepted/i })).toBeInTheDocument()
  })

  it('accepts ready discovery evidence through a governed runtime action when projected', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          actions: [
            {
              actionKey: 'ACCEPT_EVIDENCE',
              governedAction: 'ACCEPT_EVIDENCE',
              buttonLabel: 'Accept Evidence',
              enabled: true,
              successMessage: 'Evidence accepted.',
            },
          ],
          discovery: {
            state: {
              status: 'EVIDENCE_READY',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: false,
            needsRefresh: false,
            inputValues: {
              companyName: 'Acme',
            },
            evidenceSummary: {
              keys: ['source'],
              count: 1,
            },
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /accept evidence/i }))

    expect(executeRuntimeAction).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      actionKey: 'ACCEPT_EVIDENCE',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(acceptRuntimeDiscovery).not.toHaveBeenCalled()
    expect(refetchRenderer).toHaveBeenCalled()
  })

  it.each([
    ['evidence is not ready', { evidenceReady: false, accepted: false, needsRefresh: false }],
    ['input is incomplete', { inputComplete: false, evidenceReady: true, accepted: false, needsRefresh: false }],
    ['evidence needs refresh', { evidenceReady: true, accepted: false, needsRefresh: true }],
    ['evidence is already accepted', { evidenceReady: true, accepted: true, needsRefresh: false }],
  ])('disables discovery acceptance when %s', (_caseName, discoveryState) => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'EVIDENCE_READY',
            },
            inputComplete: discoveryState.inputComplete ?? discoveryState.evidenceReady,
            ...discoveryState,
            inputValues: {},
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    expect(screen.getByRole('button', { name: /accept evidence/i })).toBeDisabled()
  })

  it('shows normalized error feedback when discovery acceptance is rejected', async () => {
    const user = userEvent.setup()
    unwrapAcceptDiscovery.mockRejectedValueOnce({
      status: 409,
      data: {
        error: {
          code: 'CONFLICT',
          message: 'Intelligence Hub evidence is incomplete and must be refreshed before acceptance.',
        },
      },
    })
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'EVIDENCE_READY',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: false,
            needsRefresh: false,
            inputValues: {},
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /accept evidence/i }))

    expect(await screen.findByText(/Intelligence Hub evidence is incomplete/i)).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /status: Intelligence Hub evidence is incomplete/i })).toBeInTheDocument()
    expect(refetchRenderer).not.toHaveBeenCalled()
  })

  it('uses the shared loading state while discovery acceptance is pending', async () => {
    const user = userEvent.setup()
    unwrapAcceptDiscovery.mockReturnValueOnce(new Promise(() => {}))
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'EVIDENCE_READY',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: false,
            needsRefresh: false,
            inputValues: {},
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const acceptButton = screen.getByRole('button', { name: /accept evidence/i })
    await user.click(acceptButton)

    await waitFor(() => {
      expect(acceptButton).toHaveAttribute('aria-busy', 'true')
    })
  })

  it('allows first-use discovery input capture when the renderer projects empty editable input values', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'EVIDENCE_NOT_READY',
            },
            inputComplete: false,
            evidenceReady: false,
            accepted: false,
            needsRefresh: false,
            inputValues: {},
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    selectIntelligenceHubTab('Context')

    const refreshButton = screen.getByRole('button', { name: /build evidence pack/i })
    expect(refreshButton).toBeEnabled()
    await user.type(screen.getByLabelText('Company Name'), 'Acme')
    await user.click(refreshButton)

    expect(updateRuntimeDiscoveryInputs).toHaveBeenCalledWith(expect.objectContaining({
      runtimeInstanceId: 'value-narrative-001',
      body: expect.objectContaining({
        acquisitionProfile: 'STANDARD',
        inputs: expect.objectContaining({
          companyName: 'Acme',
        }),
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      }),
    }))
    expect(updateRuntimeDiscoveryInputs.mock.calls[0][0].body).not.toHaveProperty('refreshEvidence')
  })

  it('formats accepted discovery dates with the shared date helper', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          discovery: {
            state: {
              status: 'ACCEPTED',
            },
            inputComplete: true,
            evidenceReady: true,
            accepted: true,
            needsRefresh: false,
            acceptedAt: '2026-05-24T09:00:00.000Z',
            scopedViews: {},
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const discoverySection = screen.getByRole('main', { name: /guided execution sections/i })
    selectIntelligenceHubTab('Governance')
    const acceptance = within(discoverySection).getByRole('region', { name: /intelligence hub acceptance/i })
    expect(acceptance).toHaveTextContent('Intelligence Hub accepted')
    expect(acceptance).toHaveTextContent('Accepted on 2026-05-24.')
  })

  it('shows neutral progress when no runtime sections are projected', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          readiness: {
            ...rendererPayload.readiness,
            sectionTruth: {
              ...rendererPayload.readiness.sectionTruth,
              state: 'SECTION_TRUTH_NOT_CONFIGURED',
              publishEligible: false,
              lockEligible: false,
              requiredSectionCount: 0,
              readySectionCount: 0,
              blockingSectionCount: 0,
              readySectionKeys: [],
              blockers: [],
              reason: 'Required section truth is not configured.',
            },
          },
          sections: [],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const progressSummary = screen.getByLabelText(/execution progress summary/i)
    expect(within(progressSummary).getByText('N/A')).toBeInTheDocument()
    expect(within(progressSummary).getByRole('progressbar', { name: /no required section truth to measure/i })).toHaveAttribute('value', '0')
    const metrics = within(progressSummary).getByRole('list', { name: /execution workspace metrics/i })
    expect(within(metrics).getByText('None')).toBeInTheDocument()
    expect(within(metrics).getByText('0/0')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^intelligence hub$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /0 intelligence hub evidence not ready/i })).toBeInTheDocument()
  })

  it('shows neutral progress when projected sections have no required input', async () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          readiness: {
            ...rendererPayload.readiness,
            sectionTruth: {
              ...rendererPayload.readiness.sectionTruth,
              state: 'SECTION_TRUTH_NOT_CONFIGURED',
              publishEligible: false,
              lockEligible: false,
              requiredSectionCount: 0,
              readySectionCount: 0,
              blockingSectionCount: 0,
              readySectionKeys: [],
              blockers: [],
              reason: 'Required section truth is not configured.',
            },
          },
          sections: rendererPayload.sections.map((section) => ({
            ...section,
            required: false,
            value: 'Optional context only.',
          })),
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const progressSummary = screen.getByLabelText(/execution progress summary/i)
    expect(within(progressSummary).getByText('N/A')).toBeInTheDocument()
    expect(within(progressSummary).getByRole('progressbar', { name: /no required section truth to measure/i })).toHaveAttribute('value', '0')
    const metrics = within(progressSummary).getByRole('list', { name: /execution workspace metrics/i })
    expect(within(metrics).getByText('None')).toBeInTheDocument()
    expect(within(metrics).getByText('0/1')).toBeInTheDocument()
    const guidedPanel = screen.getByRole('complementary', { name: /guided sections side panel/i })
    const sectionNav = within(guidedPanel).getByRole('navigation', { name: /guided section navigation/i })
    expect(within(sectionNav).getByRole('button', { name: /1 customer problem draft/i })).toBeInTheDocument()
  })

  it('uses the server-projected action label when buttonLabel is absent', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          actions: [
            {
              ...rendererPayload.actions[0],
              buttonLabel: '',
              label: 'Send to Review',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const runtimeActions = screen.getByRole('group', { name: /governed runtime actions/i })
    expect(within(runtimeActions).getByRole('button', { name: /send to review/i })).toBeEnabled()
  })

  it('shows missing publish and lock projections as unknown', () => {
    const { publish: _publish, lock: _lock, ...rendererWithoutPublishLock } = rendererPayload
    useGetRuntimeRendererQuery.mockReturnValue({
      data: { data: rendererWithoutPublishLock },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const summary = screen.getByRole('list', { name: /execution workspace summary/i })
    const unknownSummaryValues = within(summary).getAllByText('Unknown')
    expect(unknownSummaryValues.length).toBeGreaterThanOrEqual(3)
  })

  it('shows a loading state before the renderer projection arrives', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const loadingStatus = screen.getByRole('status', { name: /loading/i })
    expect(loadingStatus).toHaveClass('spinner', 'spinner--lg')
    expect(screen.queryByText(/loading execution workspace/i)).not.toBeInTheDocument()
  })

  it('saves editable section changes through the runtime state mutation endpoint and refetches the renderer', async () => {
    const user = userEvent.setup()

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    selectRuntimeSectionTab('Context')
    const field = screen.getByLabelText('Customer Problem', { exact: true })
    await user.clear(field)
    await user.type(field, 'Proposal teams lack a shared story.')
    await user.click(screen.getByRole('button', { name: /^save changes$/i }))

    expect(mutateRuntimeState).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        operation: 'WRITE',
        value: 'Proposal teams lack a shared story.',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(unwrapMutation).toHaveBeenCalled()
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText(/section saved/i)).toBeInTheDocument()
  })

  it('uploads section supporting files through the section evidence endpoint', async () => {
    const user = userEvent.setup()

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))
    selectRuntimeSectionTab('Context')

    const sectionEvidenceRegion = screen.getByRole('region', { name: 'Section evidence' })
    expect(within(sectionEvidenceRegion).queryByRole('button', { name: /^extract evidence$/i })).not.toBeInTheDocument()
    expect(sectionEvidenceRegion).toHaveTextContent('Files are used only to extract evidence; originals are not stored.')
    expect(within(sectionEvidenceRegion).getByRole('button', { name: /document storage note/i })).toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByText(
      'Original documents are not stored. Only extracted evidence and source details are retained.',
    )).toBeInTheDocument()
    const sectionDocument = new File(
      ['Customer teams need governed workflow automation for value narratives.'],
      'section-notes.txt',
      { type: 'text/plain' },
    )

    const sectionFileInput = within(sectionEvidenceRegion).getByLabelText('Supporting Files')
    await user.upload(sectionFileInput, sectionDocument)
    expect(await within(sectionEvidenceRegion).findByText('section-notes.txt')).toBeInTheDocument()
    expect(sectionFileInput).toBeDisabled()
    const selectedSectionDocuments = within(sectionEvidenceRegion).getByRole('list', {
      name: /selected section supporting files/i,
    })
    expect(within(selectedSectionDocuments).getByText(/staged for extraction/i)).toBeInTheDocument()
    expect(within(selectedSectionDocuments).getByText('Ready to extract')).toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
    expect(within(sectionEvidenceRegion).queryByText(/^select files$/i)).not.toBeInTheDocument()

    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^cancel$/i }))
    expect(within(sectionEvidenceRegion).queryByText('section-notes.txt')).not.toBeInTheDocument()
    expect(within(sectionEvidenceRegion).queryByRole('button', { name: /^extract evidence$/i })).not.toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByText(/^select files$/i)).toBeInTheDocument()
    expect(sectionFileInput).not.toBeDisabled()

    await user.upload(sectionFileInput, sectionDocument)
    expect(await within(sectionEvidenceRegion).findByText('section-notes.txt')).toBeInTheDocument()
    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^extract evidence$/i }))

    expect(updateRuntimeSectionEvidence).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
        documentSources: [
          expect.objectContaining({
            fileName: 'section-notes.txt',
            mimeType: 'text/plain',
            assetType: 'SECTION_SUPPORTING_FILE',
            sizeBytes: sectionDocument.size,
            contentBase64: expect.stringMatching(/^data:text\/plain;base64,/),
          }),
        ],
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(updateRuntimeDiscoveryInputs).not.toHaveBeenCalled()
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText(/evidence extracted/i)).toBeInTheDocument()
  })

  it('preserves staged section supporting files and avoids success refetch when upload fails', async () => {
    const user = userEvent.setup()
    unwrapUpdateRuntimeSectionEvidence.mockRejectedValueOnce({
      status: 409,
      data: {
        error: {
          code: 'CONFLICT',
          message: 'Runtime instance has changed since the renderer projection was loaded.',
          details: {
            reason: 'RUNTIME_MUTATION_STALE',
          },
        },
      },
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))
    selectRuntimeSectionTab('Context')

    const sectionEvidenceRegion = screen.getByRole('region', { name: 'Section evidence' })
    const sectionDocument = new File(
      ['Customer teams need governed workflow automation for value narratives.'],
      'section-notes.txt',
      { type: 'text/plain' },
    )

    await user.upload(within(sectionEvidenceRegion).getByLabelText('Supporting Files'), sectionDocument)
    expect(await within(sectionEvidenceRegion).findByText('section-notes.txt')).toBeInTheDocument()

    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^extract evidence$/i }))

    expect(updateRuntimeSectionEvidence).toHaveBeenCalled()
    expect(updateRuntimeDiscoveryInputs).not.toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
    expect(await screen.findByText(/runtime instance has changed since the renderer projection was loaded/i)).toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByText('section-notes.txt')).toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByRole('button', { name: /^extract evidence$/i })).toBeInTheDocument()
  })

  it('reviews projected section evidence objects with meaningful extracted snippets', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              sectionEvidence: {
                status: 'PENDING_REVIEW',
                documentCount: 1,
                evidenceObjectCount: 1,
                acceptedEvidenceObjectCount: 0,
                pendingEvidenceObjectCount: 1,
                rejectedEvidenceObjectCount: 0,
                documents: [
                  {
                    sectionDocumentId: 'section_document_1',
                    fileName: 'section-notes.txt',
                    status: 'PROCESSED',
                    sizeBytes: 1200,
                    evidenceObjectsGenerated: 1,
                    textContent: 'raw uploaded document text',
                  },
                ],
                evidenceObjects: [
                  {
                    evidenceObjectId: 'section_evidence_1',
                    category: 'Value Drivers',
                    coverageArea: 'Decision Context',
                    reviewStatus: 'PENDING',
                    sourceType: 'SECTION_UPLOADED_DOCUMENT',
                    sourceFileName: 'section-notes.txt',
                    snippet: 'Governed proposal workflows reduce manual effort for commercial teams.',
                    extractedFact: 'raw extracted evidence text should not render',
                  },
                ],
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))
    selectRuntimeSectionTab('Context')

    const sectionEvidenceRegion = screen.getByRole('region', { name: 'Section evidence' })
    expect(sectionEvidenceRegion.closest('.runtime-workspace__section-panels'))
      .toHaveClass('runtime-workspace__section-panels--context')
    expect(within(sectionEvidenceRegion).getByText('section-notes.txt')).toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByText('1 evidence object: 0 accepted, 1 pending, 0 rejected')).toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByText('Value Drivers')).toBeInTheDocument()
    expect(sectionEvidenceRegion).toHaveTextContent('Governed proposal workflows reduce manual effort for commercial teams.')
    expect(sectionEvidenceRegion).not.toHaveTextContent('raw extracted evidence text should not render')
    expect(sectionEvidenceRegion).not.toHaveTextContent('raw uploaded document text')
    const sectionEvidenceReviewRegion = within(sectionEvidenceRegion).getByRole('region', {
      name: /section evidence objects review/i,
    })
    expect(sectionEvidenceReviewRegion)
      .toHaveClass('runtime-workspace__section-evidence-scroll')
    expect(within(sectionEvidenceReviewRegion).getByRole('list', { name: /section evidence objects/i }))
      .toBeInTheDocument()

    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^accept$/i }))

    expect(reviewRuntimeSectionEvidence).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      evidenceObjectId: 'section_evidence_1',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
        reviewStatus: 'ACCEPTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(updateRuntimeDiscoveryInputs).not.toHaveBeenCalled()
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText(/section evidence accepted/i)).toBeInTheDocument()
  })

  it('rejects projected section evidence objects with the danger button variant', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              sectionEvidence: {
                status: 'PENDING_REVIEW',
                documentCount: 1,
                evidenceObjectCount: 1,
                acceptedEvidenceObjectCount: 0,
                pendingEvidenceObjectCount: 1,
                rejectedEvidenceObjectCount: 0,
                documents: [
                  {
                    sectionDocumentId: 'section_document_1',
                    fileName: 'section-notes.txt',
                    status: 'PROCESSED',
                    sizeBytes: 1200,
                    evidenceObjectsGenerated: 1,
                  },
                ],
                evidenceObjects: [
                  {
                    evidenceObjectId: 'section_evidence_1',
                    category: 'Value Drivers',
                    coverageArea: 'Decision Context',
                    reviewStatus: 'PENDING',
                    sourceType: 'SECTION_UPLOADED_DOCUMENT',
                    sourceFileName: 'section-notes.txt',
                  },
                ],
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))
    selectRuntimeSectionTab('Context')

    const sectionEvidenceRegion = screen.getByRole('region', { name: 'Section evidence' })
    const rejectButton = within(sectionEvidenceRegion).getByRole('button', { name: /^reject$/i })
    expect(rejectButton).toHaveClass('btn--danger', 'btn--sm')
    expect(rejectButton).not.toHaveClass('btn--outline')
    expect(rejectButton).not.toHaveClass('btn--ghost')

    await user.click(rejectButton)

    expect(reviewRuntimeSectionEvidence).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      evidenceObjectId: 'section_evidence_1',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
        reviewStatus: 'REJECTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(updateRuntimeDiscoveryInputs).not.toHaveBeenCalled()
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText(/section evidence rejected/i)).toBeInTheDocument()
  })

  it('shows normalized section evidence review errors without success refetch', async () => {
    const user = userEvent.setup()
    unwrapReviewRuntimeSectionEvidence.mockRejectedValueOnce({
      status: 404,
      data: {
        error: {
          code: 'NOT_FOUND',
          message: 'Section evidence object was not found.',
        },
      },
    })
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              sectionEvidence: {
                status: 'PENDING_REVIEW',
                documentCount: 1,
                evidenceObjectCount: 1,
                acceptedEvidenceObjectCount: 0,
                pendingEvidenceObjectCount: 1,
                rejectedEvidenceObjectCount: 0,
                documents: [
                  {
                    sectionDocumentId: 'section_document_1',
                    fileName: 'section-notes.txt',
                    status: 'PROCESSED',
                    sizeBytes: 1200,
                    evidenceObjectsGenerated: 1,
                  },
                ],
                evidenceObjects: [
                  {
                    evidenceObjectId: 'section_evidence_1',
                    category: 'Value Drivers',
                    coverageArea: 'Decision Context',
                    reviewStatus: 'PENDING',
                    sourceType: 'SECTION_UPLOADED_DOCUMENT',
                    sourceFileName: 'section-notes.txt',
                  },
                ],
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))
    selectRuntimeSectionTab('Context')

    const sectionEvidenceRegion = screen.getByRole('region', { name: 'Section evidence' })
    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^accept$/i }))

    expect(reviewRuntimeSectionEvidence).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      evidenceObjectId: 'section_evidence_1',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
        reviewStatus: 'ACCEPTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(refetchRenderer).not.toHaveBeenCalled()
    expect(await screen.findByText(/section evidence object was not found/i)).toBeInTheDocument()
    expect(screen.queryByText(/section evidence accepted/i)).not.toBeInTheDocument()
  })

  it('keeps section evidence upload and review disabled for read-only sections', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              editable: false,
              readonlyReason: 'Runtime is locked and cannot be mutated.',
              sectionEvidence: {
                status: 'PENDING_REVIEW',
                documentCount: 1,
                evidenceObjectCount: 1,
                acceptedEvidenceObjectCount: 0,
                pendingEvidenceObjectCount: 1,
                rejectedEvidenceObjectCount: 0,
                documents: [
                  {
                    sectionDocumentId: 'section_document_1',
                    fileName: 'section-notes.txt',
                    status: 'PROCESSED',
                    sizeBytes: 1200,
                    evidenceObjectsGenerated: 1,
                  },
                ],
                evidenceObjects: [
                  {
                    evidenceObjectId: 'section_evidence_1',
                    category: 'Value Drivers',
                    coverageArea: 'Decision Context',
                    reviewStatus: 'PENDING',
                    sourceType: 'SECTION_UPLOADED_DOCUMENT',
                    sourceFileName: 'section-notes.txt',
                  },
                ],
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))
    selectRuntimeSectionTab('Context')

    const sectionEvidenceRegion = screen.getByRole('region', { name: 'Section evidence' })
    expect(within(sectionEvidenceRegion).getByLabelText('Supporting Files')).toBeDisabled()
    expect(within(sectionEvidenceRegion).queryByRole('button', { name: /^extract evidence$/i })).not.toBeInTheDocument()
    expect(within(sectionEvidenceRegion).getByRole('button', { name: /^accept$/i })).toBeDisabled()
    expect(within(sectionEvidenceRegion).getByRole('button', { name: /^reject$/i })).toBeDisabled()
    await user.click(within(sectionEvidenceRegion).getByRole('button', { name: /^accept$/i }))
    expect(updateRuntimeSectionEvidence).not.toHaveBeenCalled()
    expect(reviewRuntimeSectionEvidence).not.toHaveBeenCalled()
  })

  it('accepts generated section content through the section acceptance endpoint', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: {
                format: 'TEXT',
                content: 'Customer Problem: Proposal creation is slow.',
                generatedAt: '2026-05-19T08:01:00.000Z',
                inputHash: 'hash-1',
              },
              accepted: null,
              state: {
                status: 'GENERATED',
                revisionCount: 0,
              },
              review: {
                status: 'PENDING_REVIEW',
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))
    await user.click(screen.getByRole('button', { name: /accept truth/i }))

    expect(acceptRuntimeSection).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText(/section accepted as governed truth/i)).toBeInTheDocument()
  })

  it('keeps section acceptance disabled without generated content', async () => {
    const user = userEvent.setup()
    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))
    expect(screen.getByRole('button', { name: /accept truth/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^next$/i })).toBeEnabled()
  })

  it('keeps section acceptance disabled when generated intelligence is not truth eligible', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: {
                format: 'STRUCTURED_TEXT',
                content: 'Evidence not sufficient to derive this section safely.',
                generatedAt: '2026-05-19T08:01:00.000Z',
                inputHash: 'hash-1',
                truthEligibility: {
                  eligible: false,
                  status: 'INSUFFICIENT_EVIDENCE',
                  messages: [
                    {
                      code: 'INSUFFICIENT_EVIDENCE',
                      message: 'Evidence not sufficient to derive this section safely.',
                    },
                  ],
                },
              },
              intelligence: {
                ...rendererPayload.sections[0].intelligence,
                truthEligibility: {
                  eligible: false,
                  status: 'INSUFFICIENT_EVIDENCE',
                  messages: [
                    {
                      code: 'INSUFFICIENT_EVIDENCE',
                      message: 'Evidence not sufficient to derive this section safely.',
                    },
                  ],
                },
                displayProjection: {
                  generatedInsight: {
                    title: 'Insufficient Evidence',
                    summary: 'Evidence not sufficient to derive this section safely.',
                    sections: [],
                  },
                  boundaries: {
                    title: 'Boundaries / Not Assumed',
                    items: [
                      'No ROI statistics were generated because no accepted ROI evidence is present.',
                    ],
                  },
                  confidence: {
                    label: 'Confidence: Low',
                    signals: ['No customer validation notes supplied'],
                  },
                },
              },
              state: {
                status: 'INSUFFICIENT_EVIDENCE',
                revisionCount: 0,
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    const generatedRegion = screen.getByRole('region', { name: /generated content/i })
    expect(within(generatedRegion).getByRole('heading', { name: /insufficient evidence/i })).toBeInTheDocument()
    expect(within(generatedRegion).getAllByText('Evidence not sufficient to derive this section safely.')).toHaveLength(2)
    const acceptTruth = screen.getByRole('button', { name: /accept truth/i })
    expect(acceptTruth).toBeDisabled()
    expect(acceptTruth).toHaveAccessibleDescription('Evidence not sufficient to derive this section safely.')
    expect(acceptRuntimeSection).not.toHaveBeenCalled()
  })

  it('keeps section acceptance disabled when accepted section evidence requires regeneration', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: {
                content: 'Customer Problem: Proposal creation is slow.',
                generatedAt: '2026-05-19T08:01:00.000Z',
                inputHash: 'hash-before-evidence-change',
              },
              state: {
                status: 'GENERATED',
                revisionCount: 0,
                needsRegeneration: true,
                acceptedInvalidationReason: 'SECTION_EVIDENCE_CHANGED',
              },
              intelligence: {
                ...rendererPayload.sections[0].intelligence,
                readiness: {
                  state: 'REGENERATION_REQUIRED',
                  publishEligible: false,
                  reason: 'Accepted section evidence changed. Regenerate this section before accepting or publishing truth.',
                  blockingValidationCount: 0,
                },
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    expect(screen.getAllByText(/accepted section evidence changed/i).length).toBeGreaterThanOrEqual(1)
    const acceptTruth = screen.getByRole('button', { name: /accept truth/i })
    expect(acceptTruth).toBeDisabled()
    expect(acceptTruth).toHaveAccessibleDescription(/Accepted section evidence changed/i)
    await user.click(acceptTruth)
    expect(acceptRuntimeSection).not.toHaveBeenCalled()
  })

  it('keeps section acceptance disabled when current generated content is already accepted', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: {
                content: 'Customer Problem: Proposal creation is slow.',
                generatedAt: '2026-05-19T08:01:00.000Z',
                inputHash: 'hash-1',
              },
              accepted: {
                content: 'Customer Problem: Proposal creation is slow.',
                sourceGeneratedAt: '2026-05-19T08:01:00.000Z',
                inputHash: 'hash-1',
              },
              state: {
                status: 'ACCEPTED',
                revisionCount: 0,
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    selectRuntimeSectionTab('Truth')
    expect(screen.getByRole('region', { name: /accepted truth/i })).toHaveTextContent(
      'Customer Problem: Proposal creation is slow.',
    )
    expect(screen.getByRole('button', { name: /accept truth/i })).toBeDisabled()
  })

  it('keeps section acceptance disabled for legacy accepted content without generated metadata', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: {
                content: 'Customer Problem: Proposal creation is slow.',
                generatedAt: '2026-05-19T08:01:00.000Z',
                inputHash: 'hash-1',
              },
              accepted: {
                content: 'Customer Problem: Proposal creation is slow.',
              },
              state: {
                status: 'ACCEPTED',
                revisionCount: 0,
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    expect(screen.getByRole('button', { name: /accept truth/i })).toBeDisabled()
    expect(screen.getByText(/current generated content is already accepted as governed truth/i)).toBeInTheDocument()
    expect(acceptRuntimeSection).not.toHaveBeenCalled()
  })

  it('shows regeneration-required intelligence when accepted truth is stale against section input', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: {
                content: 'Customer Problem: Proposal creation is slow.',
                generatedAt: '2026-05-19T08:01:00.000Z',
                inputHash: 'hash-before-input-change',
              },
              accepted: {
                content: 'Customer Problem: Proposal creation is slow.',
                sourceGeneratedAt: '2026-05-19T08:01:00.000Z',
                inputHash: 'hash-before-input-change',
              },
              intelligence: {
                ...rendererPayload.sections[0].intelligence,
                compare: {
                  state: 'GENERATED_STALE_AGAINST_INPUT',
                  summary: 'Section input changed after generation. Regenerate before accepting or publishing truth.',
                  currentGeneratedAccepted: false,
                  generatedStaleAgainstInput: true,
                  hasGenerated: true,
                  hasAccepted: true,
                },
                readiness: {
                  state: 'REGENERATION_REQUIRED',
                  publishEligible: false,
                  reason: 'Section input changed after generation. Regenerate before accepting or publishing truth.',
                  blockingValidationCount: 0,
                },
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    expect(screen.getAllByText(/section input changed after generation/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Generated Stale Against Input')).toBeInTheDocument()
  })

  it('shows regeneration-required intelligence when upstream accepted truth invalidates a section', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: {
                content: 'Customer Problem: Proposal creation is slow.',
                generatedAt: '2026-05-19T08:01:00.000Z',
              },
              accepted: {
                content: 'Customer Problem: Proposal creation is slow.',
                sourceGeneratedAt: '2026-05-19T08:01:00.000Z',
              },
              intelligence: {
                ...rendererPayload.sections[0].intelligence,
                dependency: {
                  state: 'DEPENDENCY_CONTEXT_INVALIDATED',
                  requiredSectionKeys: ['executive_summary'],
                  satisfiedSectionKeys: ['executive_summary'],
                  missingSectionKeys: [],
                  acceptedSectionKeys: ['executive_summary'],
                  missingAcceptedTruthSectionKeys: [],
                  invalidatedSectionKeys: ['executive_summary'],
                },
                compare: {
                  state: 'GENERATED_MATCHES_ACCEPTED_TRUTH',
                  summary: 'Generated content matches the accepted truth metadata.',
                  currentGeneratedAccepted: true,
                  generatedStaleAgainstInput: false,
                  hasGenerated: true,
                  hasAccepted: true,
                },
                readiness: {
                  state: 'REGENERATION_REQUIRED',
                  publishEligible: false,
                  reason: 'Accepted upstream section truth changed. Regenerate this section before publish or lock.',
                  blockingValidationCount: 0,
                },
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    expect(screen.getAllByText(/accepted upstream section truth changed/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/1 upstream accepted truth changed/i).length).toBeGreaterThanOrEqual(1)
    const acceptTruth = screen.getByRole('button', { name: /accept truth/i })
    expect(acceptTruth).toBeDisabled()
    expect(acceptTruth).toHaveAccessibleDescription(/Accepted upstream section truth changed/i)
    await user.click(acceptTruth)
    expect(acceptRuntimeSection).not.toHaveBeenCalled()
  })

  it('shows dependency feedback when upstream accepted truth is missing', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: {
                content: 'Customer Problem: Proposal creation is slow.',
                generatedAt: '2026-05-19T08:01:00.000Z',
              },
              accepted: {
                content: 'Customer Problem: Proposal creation is slow.',
                sourceGeneratedAt: '2026-05-19T08:01:00.000Z',
              },
              intelligence: {
                ...rendererPayload.sections[0].intelligence,
                dependency: {
                  state: 'MISSING_ACCEPTED_TRUTH',
                  requiredSectionKeys: ['executive_summary'],
                  satisfiedSectionKeys: ['executive_summary'],
                  missingSectionKeys: [],
                  acceptedSectionKeys: [],
                  missingAcceptedTruthSectionKeys: ['executive_summary'],
                  invalidatedSectionKeys: [],
                },
                compare: {
                  state: 'GENERATED_MATCHES_ACCEPTED_TRUTH',
                  summary: 'Generated content matches the accepted truth metadata.',
                  currentGeneratedAccepted: true,
                  generatedStaleAgainstInput: false,
                  hasGenerated: true,
                  hasAccepted: true,
                },
                readiness: {
                  state: 'DEPENDENCY_ACCEPTED_TRUTH_MISSING',
                  publishEligible: false,
                  reason: 'Required upstream accepted truth is missing.',
                  blockingValidationCount: 0,
                },
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    expect(screen.getAllByText(/required upstream accepted truth is missing/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/1 upstream accepted truth is missing/i).length).toBeGreaterThanOrEqual(1)
  })

  it('shows normalized feedback when section acceptance is rejected', async () => {
    const user = userEvent.setup()
    unwrapAcceptSection.mockRejectedValueOnce({
      status: 409,
      data: {
        error: {
          code: 'CONFLICT',
          message: 'Runtime section cannot be accepted before generated content exists.',
        },
      },
    })
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: {
                content: 'Customer Problem: Proposal creation is slow.',
                generatedAt: '2026-05-19T08:01:00.000Z',
                inputHash: 'hash-1',
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))
    await user.click(screen.getByRole('button', { name: /accept truth/i }))

    expect(await screen.findByText(/runtime section cannot be accepted/i)).toBeInTheDocument()
    expect(refetchRenderer).not.toHaveBeenCalled()
  })

  it('saves the active section before advancing to the next guided section', async () => {
    const user = userEvent.setup()
    unwrapMutation.mockResolvedValueOnce({
      data: {
        mutation: {
          runtimePath: 'framework_state.sections.customer_problem',
        },
        advance: {
          requested: true,
          hasNext: true,
          currentRuntimePath: 'framework_state.sections.customer_problem',
          currentSectionKey: 'customer_problem',
          nextRuntimePath: 'framework_state.sections.value_drivers',
          nextSectionKey: 'value_drivers',
          reason: '',
        },
      },
    })
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            rendererPayload.sections[0],
            {
              key: 'interim_section',
              runtimePath: 'framework_state.sections.interim_section',
              label: 'Interim Section',
              control: 'TEXTAREA',
              required: true,
              value: '',
              editable: true,
              validationMessages: [],
            },
            {
              key: 'value_drivers',
              runtimePath: 'framework_state.sections.value_drivers',
              label: 'Value Drivers',
              control: 'TEXTAREA',
              required: true,
              value: '',
              editable: true,
              validationMessages: [],
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    selectRuntimeSectionTab('Context')
    const field = screen.getByLabelText('Customer Problem', { exact: true })
    await user.clear(field)
    await user.type(field, 'Proposal teams need a shared governed narrative.')
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    expect(mutateRuntimeState).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        operation: 'WRITE',
        value: 'Proposal teams need a shared governed narrative.',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        saveAndNext: true,
      },
    })
    expect(refetchRenderer).toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Value Drivers' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /3 value drivers input required/i })).toHaveAttribute('aria-current', 'step')
  })

  it('advances to the next guided section without saving when the draft is unchanged', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: {
                content: 'Generated insight is ready for review.',
                generatedAt: '2026-05-19T08:01:00.000Z',
                inputHash: 'hash-1',
              },
              intelligence: {
                ...rendererPayload.sections[0].intelligence,
                compare: {
                  ...rendererPayload.sections[0].intelligence.compare,
                  state: 'GENERATED_AVAILABLE',
                  summary: 'Generated content is available for review.',
                  hasGenerated: true,
                },
              },
            },
            {
              key: 'value_drivers',
              runtimePath: 'framework_state.sections.value_drivers',
              label: 'Value Drivers',
              control: 'TEXTAREA',
              required: true,
              value: '',
              editable: true,
              validationMessages: [],
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    expect(mutateRuntimeState).not.toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Value Drivers' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /2 value drivers input required/i })).toHaveAttribute('aria-current', 'step')
  })

  it('returns to Intelligence Hub when the server-owned advance projection has no next section', async () => {
    const user = userEvent.setup()
    unwrapMutation.mockResolvedValueOnce({
      data: {
        mutation: {
          runtimePath: 'framework_state.sections.customer_problem',
        },
        advance: {
          requested: true,
          hasNext: false,
          currentRuntimePath: 'framework_state.sections.customer_problem',
          currentSectionKey: 'customer_problem',
          nextRuntimePath: '',
          nextSectionKey: '',
          reason: 'END_OF_GUIDED_SECTIONS',
        },
      },
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    selectRuntimeSectionTab('Context')
    const field = screen.getByLabelText('Customer Problem', { exact: true })
    await user.clear(field)
    await user.type(field, 'Final section update.')
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    expect(mutateRuntimeState).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        operation: 'WRITE',
        value: 'Final section update.',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        saveAndNext: true,
      },
    })
    expect(refetchRenderer).toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Intelligence Hub' })).toBeInTheDocument()
    const guidedPanel = screen.getByRole('complementary', { name: /guided sections side panel/i })
    const sectionNav = within(guidedPanel).getByRole('navigation', { name: /guided section navigation/i })
    expect(within(sectionNav).getByRole('button', { name: /0 intelligence hub/i })).toHaveAttribute('aria-current', 'step')
  })

  it('accepts natural text for JSON-backed object sections by wrapping it as summary context', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              key: 'section_1_executive_summary',
              runtimePath: 'framework_state.sections.section_1_executive_summary',
              label: 'Section Executive Summary',
              control: 'JSON',
              dataType: 'OBJECT',
              required: true,
              placeholder: 'Enter section executive summary...',
              value: {},
              editable: true,
              validationMessages: [],
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /executive summary/i }))

    expect(screen.getByRole('tablist', { name: /executive summary sections/i })).toBeInTheDocument()
    const executiveSummaryTabs = ['Overview', 'Context', 'Truth', 'Governance']
    executiveSummaryTabs.forEach((tabName) => {
      expect(screen.getByRole('tab', { name: tabName })).toBeInTheDocument()
    })
    selectRuntimeSectionTab('Context')
    const field = screen.getByLabelText('Executive Summary')
    await user.clear(field)
    await user.type(field, 'Customer needs a clearer executive narrative.')
    await user.click(screen.getByRole('button', { name: /^save changes$/i }))

    expect(mutateRuntimeState).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.section_1_executive_summary',
        operation: 'WRITE',
        value: {
          summary: 'Customer needs a clearer executive narrative.',
        },
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(refetchRenderer).toHaveBeenCalled()
  })

  it('blocks malformed JSON-shaped values before calling the mutation endpoint', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              key: 'section_1_executive_summary',
              runtimePath: 'framework_state.sections.section_1_executive_summary',
              label: 'Section Executive Summary',
              control: 'JSON',
              dataType: 'OBJECT',
              required: true,
              placeholder: 'Enter section executive summary...',
              value: {},
              editable: true,
              validationMessages: [],
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /executive summary/i }))

    selectRuntimeSectionTab('Context')
    const field = screen.getByLabelText('Executive Summary')
    await user.clear(field)
    fireEvent.change(field, { target: { value: '{"summary":' } })
    await user.click(screen.getByRole('button', { name: /^save changes$/i }))

    expect(await screen.findByText(/enter valid json before saving/i)).toBeInTheDocument()
    expect(mutateRuntimeState).not.toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
  })

  it('coerces number section values before saving', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              key: 'confidence_score',
              runtimePath: 'framework_state.sections.confidence_score',
              label: 'Confidence Score',
              control: 'NUMBER',
              dataType: 'NUMBER',
              value: 12,
              editable: true,
              validationMessages: [],
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /confidence score/i }))

    selectRuntimeSectionTab('Context')
    const field = screen.getByLabelText('Confidence Score')
    await user.clear(field)
    await user.type(field, '42.5')
    await user.click(screen.getByRole('button', { name: /^save changes$/i }))

    expect(mutateRuntimeState).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.confidence_score',
        operation: 'WRITE',
        value: 42.5,
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
  })

  it('blocks invalid number values before saving', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              key: 'confidence_score',
              runtimePath: 'framework_state.sections.confidence_score',
              label: 'Confidence Score',
              control: 'TEXT',
              dataType: 'NUMBER',
              value: 12,
              editable: true,
              validationMessages: [],
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /confidence score/i }))

    selectRuntimeSectionTab('Context')
    const field = screen.getByLabelText('Confidence Score')
    await user.clear(field)
    await user.type(field, 'not numeric')
    await user.click(screen.getByRole('button', { name: /^save changes$/i }))

    expect(await screen.findByText(/enter a valid number before saving/i)).toBeInTheDocument()
    expect(mutateRuntimeState).not.toHaveBeenCalled()
  })

  it('saves checkbox boolean section values', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              key: 'priority_confirmed',
              runtimePath: 'framework_state.sections.priority_confirmed',
              label: 'Priority Confirmed',
              control: 'CHECKBOX',
              dataType: 'BOOLEAN',
              value: false,
              editable: true,
              validationMessages: [],
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /priority confirmed/i }))

    selectRuntimeSectionTab('Context')
    await user.click(screen.getByRole('checkbox', { name: /priority confirmed/i }))
    await user.click(screen.getByRole('button', { name: /^save changes$/i }))

    expect(mutateRuntimeState).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.priority_confirmed',
        operation: 'WRITE',
        value: true,
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
  })

  it('saves select enum section values', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              key: 'narrative_status',
              runtimePath: 'framework_state.sections.narrative_status',
              label: 'Narrative Status',
              control: 'SELECT',
              dataType: 'ENUM',
              allowedValues: ['DRAFT', 'READY'],
              allowedValueLabels: {
                DRAFT: 'Draft',
                READY: 'Ready',
              },
              value: 'DRAFT',
              editable: true,
              validationMessages: [],
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /narrative status/i }))

    selectRuntimeSectionTab('Context')
    await user.selectOptions(screen.getByLabelText('Narrative Status'), 'READY')
    await user.click(screen.getByRole('button', { name: /^save changes$/i }))

    expect(mutateRuntimeState).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        runtimePath: 'framework_state.sections.narrative_status',
        operation: 'WRITE',
        value: 'READY',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
  })

  it('blocks saving when the renderer projection is missing updatedAt', async () => {
    const user = userEvent.setup()
    const { updatedAt: _updatedAt, ...runtimeWithoutUpdatedAt } = rendererPayload.runtimeInstance
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          runtimeInstance: runtimeWithoutUpdatedAt,
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    selectRuntimeSectionTab('Context')
    const field = screen.getByLabelText('Customer Problem', { exact: true })
    await user.clear(field)
    await user.type(field, 'Updated value without marker.')
    await user.click(screen.getByRole('button', { name: /^save changes$/i }))

    expect(await screen.findByText(/runtime projection is missing its concurrency marker/i)).toBeInTheDocument()
    expect(mutateRuntimeState).not.toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
  })

  it('renders mutation rejection feedback without refetching', async () => {
    const user = userEvent.setup()
    unwrapMutation.mockRejectedValueOnce({
      status: 409,
      data: {
        error: {
          code: 'CONFLICT',
          message: 'Runtime instance has changed since the renderer projection was loaded.',
          details: {
            reason: 'RUNTIME_MUTATION_STALE',
          },
        },
      },
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    selectRuntimeSectionTab('Context')
    const field = screen.getByLabelText('Customer Problem', { exact: true })
    await user.clear(field)
    await user.type(field, 'Proposal teams lack a shared story.')
    await user.click(screen.getByRole('button', { name: /^save changes$/i }))

    expect(await screen.findByText(/runtime instance has changed since the renderer projection was loaded/i)).toBeInTheDocument()
    expect(refetchRenderer).not.toHaveBeenCalled()
  })

  it('executes enabled runtime actions through the governed action endpoint and refetches the renderer', async () => {
    const user = userEvent.setup()

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /submit for review/i }))

    expect(window.confirm).toHaveBeenCalledWith('Submit this framework for review?')
    expect(executeRuntimeAction).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      actionKey: 'SUBMIT_FOR_REVIEW',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(unwrapAction).toHaveBeenCalled()
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText('Action completed')).toBeInTheDocument()
    expect(screen.getByText(/runtime action completed/i)).toBeInTheDocument()
  })

  it('renders disabled runtime actions with server-projected blocked reasons', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          actions: [
            {
              ...rendererPayload.actions[0],
              enabled: false,
              disabledReason: 'Mark this runtime ready first.',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const actionScroll = screen.getByRole('region', { name: /governed runtime actions scroll region/i })
    const governedActions = within(actionScroll).getByRole('group', { name: /governed runtime actions/i })
    const blockedButton = within(governedActions).getByRole('button', { name: /submit for review/i })
    const tooltipTrigger = within(governedActions).getByLabelText(/submit for review unavailable/i)
    const blockedReason = within(governedActions)
      .getAllByText('Mark this runtime ready first.')
      .find((element) => element.closest('[role="tooltip"]'))
    const accessibleReason = governedActions.querySelector('.runtime-workspace__action-disabled-reason')
    expect(blockedButton).toBeDisabled()
    expect(blockedButton).toHaveClass('btn--outline')
    expect(blockedButton).toHaveAccessibleDescription('Mark this runtime ready first.')
    expect(tooltipTrigger).toHaveAccessibleName('Submit for Review unavailable. Mark this runtime ready first.')
    expect(blockedReason).toBeTruthy()
    expect(blockedReason.closest('[role="tooltip"]')).toHaveAttribute('data-position', 'top')
    expect(blockedReason).not.toBeVisible()
    expect(blockedButton.querySelector('.runtime-workspace__action-icon--info')).not.toBeNull()
    expect(accessibleReason).toHaveTextContent('Mark this runtime ready first.')
    expect(accessibleReason).toHaveClass('sr-only')
    await user.hover(tooltipTrigger)
    await waitFor(() => expect(blockedReason).toBeVisible())
    expect(screen.queryByText('No actions available')).not.toBeInTheDocument()
    await user.click(tooltipTrigger)
    expect(executeRuntimeAction).not.toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
  })

  it('keeps available and blocked runtime actions visible in the governed command strip', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          actions: [
            rendererPayload.actions[0],
            {
              actionKey: 'LOCK_RUNTIME',
              governedAction: 'LOCK_RUNTIME',
              buttonLabel: 'Lock Runtime',
              enabled: false,
              disabledReason: 'Runtime must be published before it can be locked.',
              requiresConfirmation: false,
              policyKey: 'lock-runtime-policy',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    const actionScroll = screen.getByRole('region', { name: /governed runtime actions scroll region/i })
    const governedActions = within(actionScroll).getByRole('group', { name: /^governed runtime actions$/i })
    expect(within(governedActions).getByRole('button', { name: /submit for review/i })).toBeEnabled()
    const blockedButton = within(governedActions).getByRole('button', { name: /lock runtime/i })
    const tooltipTrigger = within(governedActions).getByLabelText(/lock runtime unavailable/i)
    const blockedReason = within(governedActions)
      .getAllByText('Runtime must be published before it can be locked.')
      .find((element) => element.closest('[role="tooltip"]'))
    const accessibleReason = governedActions.querySelector('.runtime-workspace__action-disabled-reason')
    expect(blockedButton).toBeDisabled()
    expect(blockedButton).toHaveAccessibleDescription('Runtime must be published before it can be locked.')
    expect(tooltipTrigger).toHaveAccessibleName('Lock Runtime unavailable. Runtime must be published before it can be locked.')
    expect(blockedReason).toBeTruthy()
    expect(blockedReason.closest('[role="tooltip"]')).toHaveAttribute('data-position', 'top')
    expect(blockedReason).not.toBeVisible()
    expect(blockedButton.querySelector('.runtime-workspace__action-icon--info')).not.toBeNull()
    expect(accessibleReason).toHaveTextContent('Runtime must be published before it can be locked.')
    expect(accessibleReason).toHaveClass('sr-only')
    expect(screen.queryByRole('button', { name: /available actions/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /blocked actions/i })).not.toBeInTheDocument()
    expect(screen.queryByText('No actions available')).not.toBeInTheDocument()
  })

  it('refreshes the governed action command strip when renderer action groups change', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          actions: [
            {
              ...rendererPayload.actions[0],
              enabled: false,
              disabledReason: 'Mark this runtime ready first.',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })
    const view = renderRuntimeWorkspace()

    let actionScroll = screen.getByRole('region', { name: /governed runtime actions scroll region/i })
    let governedActions = within(actionScroll).getByRole('group', { name: /^governed runtime actions$/i })
    expect(within(governedActions).getByRole('button', { name: /submit for review/i })).toBeDisabled()

    useGetRuntimeRendererQuery.mockReturnValue({
      data: { data: rendererPayload },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    view.rerender(runtimeWorkspaceTree())

    actionScroll = screen.getByRole('region', { name: /governed runtime actions scroll region/i })
    governedActions = within(actionScroll).getByRole('group', { name: /^governed runtime actions$/i })
    expect(within(governedActions).getByRole('button', { name: /submit for review/i })).toBeEnabled()
  })

  it('uses a default confirmation message when required confirmation has no seeded message', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          actions: [
            {
              ...rendererPayload.actions[0],
              confirmationMessage: '',
              requiresConfirmation: true,
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /submit for review/i }))

    expect(window.confirm).toHaveBeenCalledWith('Confirm Submit for Review?')
    expect(executeRuntimeAction).toHaveBeenCalled()
  })

  it('does not execute or refetch when action confirmation is cancelled', async () => {
    const user = userEvent.setup()
    window.confirm = vi.fn(() => false)

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /submit for review/i }))

    expect(window.confirm).toHaveBeenCalledWith('Submit this framework for review?')
    expect(executeRuntimeAction).not.toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
  })

  it('blocks action execution when the renderer projection is missing updatedAt', async () => {
    const user = userEvent.setup()
    const { updatedAt: _updatedAt, ...runtimeWithoutUpdatedAt } = rendererPayload.runtimeInstance
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          runtimeInstance: runtimeWithoutUpdatedAt,
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /submit for review/i }))

    expect(await screen.findByText('Action unavailable')).toBeInTheDocument()
    expect(screen.getByText(/runtime projection is missing its concurrency marker/i)).toBeInTheDocument()
    expect(executeRuntimeAction).not.toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
  })

  it('renders runtime action rejection feedback without refetching', async () => {
    const user = userEvent.setup()
    unwrapAction.mockRejectedValueOnce({
      status: 409,
      data: {
        error: {
          code: 'CONFLICT',
          message: 'Runtime action is not currently executable.',
          requestId: 'action-ref-1',
          details: {
            reason: 'RUNTIME_ACTION_NOT_AVAILABLE',
          },
        },
      },
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /submit for review/i }))

    expect(await screen.findByText('Action failed')).toBeInTheDocument()
    expect(screen.getByText('Runtime action is not currently executable. Reference: action-ref-1')).toBeInTheDocument()
    expect(screen.queryByText(/\(Ref: action-ref-1\)/i)).not.toBeInTheDocument()
    const actionPanel = screen.getByRole('heading', { name: 'Actions' }).closest('.runtime-workspace__action-panel')
    expect(actionPanel).not.toHaveTextContent('Runtime action is not currently executable.')
    expect(refetchRenderer).not.toHaveBeenCalled()
  })

  it('shows a relevant natural-language placeholder for JSON-backed empty sections', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              key: 'section_1_executive_summary',
              runtimePath: 'framework_state.sections.section_1_executive_summary',
              label: 'Section Executive Summary',
              control: 'JSON',
              dataType: 'OBJECT',
              required: true,
              placeholder: 'Enter section executive summary...',
              value: {},
              editable: true,
              validationMessages: [],
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /executive summary/i }))

    expect(screen.getByRole('tablist', { name: /executive summary sections/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    selectRuntimeSectionTab('Context')
    expect(screen.getByLabelText('Executive Summary')).toHaveAttribute(
      'placeholder',
      'Summarise the customer situation, priority, and recommended value narrative focus.',
    )
    const sectionObject = screen.getByRole('region', { name: /ownership zones/i })
    expect(within(sectionObject).getByRole('region', { name: /your additional context/i })).toHaveTextContent('Executive Summary')
    expect(screen.queryByRole('heading', { name: 'Section Executive Summary' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /section executive summary/i })).not.toBeInTheDocument()
  })

  it('keeps renderer read-only sections from submitting mutations', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          actions: [
            ...rendererPayload.actions,
            {
              actionKey: 'GENERATE_SECTION',
              governedAction: 'GENERATE_SECTION',
              buttonLabel: 'Generate Section',
              enabled: true,
              requiresConfirmation: false,
              policyKey: 'generate-section-policy',
            },
            {
              actionKey: 'REGENERATE_SECTION',
              governedAction: 'REGENERATE_SECTION',
              buttonLabel: 'Regenerate Section',
              enabled: true,
              requiresConfirmation: false,
              policyKey: 'regenerate-section-policy',
            },
          ],
          sections: rendererPayload.sections.map((section) => ({
            ...section,
            editable: false,
            generated: {
              content: 'Customer Problem: Proposal creation is slow.',
              generatedAt: '2026-05-19T08:01:00.000Z',
              inputHash: 'hash-1',
            },
          })),
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    expect(screen.getByText('Read only preview')).toBeInTheDocument()
    selectRuntimeSectionTab('Context')
    expect(screen.getByLabelText('Customer Problem', { exact: true })).toHaveAttribute('readonly')
    const generateButton = screen.getByRole('button', { name: /^generate section$/i })
    const regenerateButton = screen.getByRole('button', { name: /^regenerate section$/i })
    expect(generateButton).toBeDisabled()
    expect(regenerateButton).toBeDisabled()
    expect(screen.getAllByText('Current role or permissions do not allow runtime section generation.')).toHaveLength(2)
    const acceptTruthButton = screen.getByRole('button', { name: /^accept truth$/i })
    expect(acceptTruthButton).toBeDisabled()
    expect(acceptTruthButton).toHaveAccessibleDescription('Current role or permissions do not allow accepting this section.')
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^compare$/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /^next$/i })).toBeEnabled()
    expect(mutateRuntimeState).not.toHaveBeenCalled()
    expect(acceptRuntimeSection).not.toHaveBeenCalled()
  })

  it('presents published and locked runtime truth as read-only', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          runtimeInstance: {
            ...rendererPayload.runtimeInstance,
            status: 'LOCKED',
            executionStatus: 'COMPLETE',
            lockedAt: '2026-05-22T10:00:00.000Z',
          },
          lifecycle: {
            stage: 'LOCKED',
          },
          readiness: {
            state: 'LOCKED',
            ready: true,
            locked: true,
          },
          publish: {
            state: 'PUBLISHED',
            published: true,
            outputEligible: true,
            snapshot: {
              snapshotId: 'runtime-truth-publish-value-narrative-001-abcdef1234567890',
              snapshotHash: 'abcdef1234567890',
            },
          },
          lock: {
            state: 'LOCKED',
            locked: true,
            lockedAt: '2026-05-22T10:00:00.000Z',
            outputEligibility: {
              state: 'OUTPUT_ELIGIBLE',
              outputEligible: true,
              canonicalOutputEligible: true,
              anchorEligible: true,
            },
            snapshot: {
              snapshotId: 'runtime-truth-lock-record-value-narrative-001-fedcba0987654321',
              snapshotHash: 'fedcba0987654321',
            },
            replayAnchor: {
              replayAnchorId: 'runtime-replay-anchor-1234567890abcdef',
            },
          },
          sections: rendererPayload.sections.map((section) => ({
            ...section,
            editable: false,
            readonlyReason: 'Runtime is locked and cannot be mutated.',
          })),
          actions: [
            {
              actionKey: 'RUN_VALIDATION',
              governedAction: 'RUN_VALIDATION',
              buttonLabel: 'Run Validation',
              enabled: false,
              disabledReason: 'Runtime is locked and cannot be mutated or actioned.',
              requiresConfirmation: false,
              policyKey: 'run-validation-policy',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    const summary = screen.getByRole('list', { name: /execution workspace summary/i })
    expect(within(summary).getAllByText('Locked').length).toBeGreaterThanOrEqual(2)
    expect(within(summary).getByText('Published')).toBeInTheDocument()
    const certifiedTruth = screen.getByRole('list', { name: /certified runtime truth/i })
    expect(within(certifiedTruth).getByText('Eligible')).toBeInTheDocument()
    expect(within(certifiedTruth).getByText('runtime-trut...34567890')).toBeInTheDocument()
    expect(within(certifiedTruth).getByText('runtime-trut...87654321')).toBeInTheDocument()
    expect(within(certifiedTruth).getByText('runtime-repl...90abcdef')).toBeInTheDocument()
    expect(screen.getByText('Read only preview')).toBeInTheDocument()
    selectRuntimeSectionTab('Context')
    expect(screen.getByLabelText('Customer Problem', { exact: true })).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
    const actionScroll = screen.getByRole('region', { name: /governed runtime actions scroll region/i })
    const governedActions = within(actionScroll).getByRole('group', { name: /governed runtime actions/i })
    const blockedButton = within(governedActions).getByRole('button', { name: /run validation/i })
    const tooltipTrigger = within(governedActions).getByLabelText(/run validation unavailable/i)
    const blockedReason = within(governedActions)
      .getAllByText('Runtime is locked and cannot be mutated or actioned.')
      .find((element) => element.closest('[role="tooltip"]'))
    const accessibleReason = governedActions.querySelector('.runtime-workspace__action-disabled-reason')
    expect(blockedButton).toBeDisabled()
    expect(blockedButton).toHaveAccessibleDescription('Runtime is locked and cannot be mutated or actioned.')
    expect(tooltipTrigger).toHaveAccessibleName('Run Validation unavailable. Runtime is locked and cannot be mutated or actioned.')
    expect(blockedReason).toBeTruthy()
    expect(blockedReason).not.toBeVisible()
    expect(blockedButton.querySelector('.runtime-workspace__action-icon--info')).not.toBeNull()
    expect(accessibleReason).toHaveTextContent('Runtime is locked and cannot be mutated or actioned.')
    expect(accessibleReason).toHaveClass('sr-only')
    expect(screen.queryByText('No actions available')).not.toBeInTheDocument()
  })

  it('executes section generation actions with the section target and keeps them out of the side panel', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          actions: [
            ...rendererPayload.actions,
            {
              actionKey: 'GENERATE_SECTION',
              governedAction: 'GENERATE_SECTION',
              buttonLabel: 'Generate Section',
              enabled: true,
              requiresConfirmation: false,
              policyKey: 'generate-section-policy',
            },
            {
              actionKey: 'REGENERATE_SECTION',
              governedAction: 'REGENERATE_SECTION',
              buttonLabel: 'Regenerate Section',
              enabled: true,
              requiresConfirmation: false,
              policyKey: 'regenerate-section-policy',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    const sections = screen.getByRole('main', { name: /guided execution sections/i })
    const sectionCard = within(sections).getByRole('listitem')
    expect(within(sectionCard).getByRole('button', { name: /^generate section$/i })).toBeEnabled()
    const regenerateButton = within(sectionCard).getByRole('button', { name: /^regenerate section$/i })
    expect(regenerateButton).toBeDisabled()
    expect(regenerateButton).toHaveAccessibleDescription('Generate this section before regenerating it.')
    expect(within(sectionCard).getByText('Generate this section before regenerating it.')).toBeInTheDocument()
    const sidePanel = screen.getByRole('complementary', { name: /execution intelligence side panel/i })
    expect(within(sidePanel).queryByRole('button', { name: /generate section/i })).not.toBeInTheDocument()

    await user.click(within(sectionCard).getByRole('button', { name: /^generate section$/i }))

    expect(executeRuntimeAction).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      actionKey: 'GENERATE_SECTION',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
      },
    })
    expect(refetchRenderer).toHaveBeenCalled()
  })

  it('keeps dirty section context saves inline and blocks generation actions until saved', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          actions: [
            ...rendererPayload.actions,
            {
              actionKey: 'GENERATE_SECTION',
              governedAction: 'GENERATE_SECTION',
              buttonLabel: 'Generate Section',
              enabled: true,
              requiresConfirmation: false,
              policyKey: 'generate-section-policy',
            },
            {
              actionKey: 'REGENERATE_SECTION',
              governedAction: 'REGENERATE_SECTION',
              buttonLabel: 'Regenerate Section',
              enabled: true,
              requiresConfirmation: false,
              policyKey: 'regenerate-section-policy',
            },
          ],
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: {
                content: 'Customer Problem: Proposal creation is slow.',
                generatedAt: '2026-05-19T08:01:00.000Z',
                inputHash: 'hash-1',
              },
              intelligence: {
                ...rendererPayload.sections[0].intelligence,
                compare: {
                  ...rendererPayload.sections[0].intelligence.compare,
                  hasGenerated: true,
                  state: 'GENERATED_REVIEW_NEEDED',
                },
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))
    selectRuntimeSectionTab('Context')

    const field = screen.getByLabelText('Customer Problem', { exact: true })
    const contextRegion = screen.getByRole('region', { name: /your additional context/i })
    const contextActions = within(contextRegion).getByRole('group', { name: /customer problem context changes/i })
    expect(contextActions).toBeInTheDocument()
    expect(within(contextRegion).getByText('No unsaved context changes.')).toBeInTheDocument()
    expect(within(contextActions).getByRole('button', { name: /^save changes$/i })).toBeDisabled()
    expect(within(contextActions).queryByRole('button', { name: /^discard$/i })).not.toBeInTheDocument()

    await user.type(field, ' GARY')

    expect(within(contextRegion).getByRole('group', { name: /customer problem context changes/i })).toBeInTheDocument()
    expect(within(contextRegion).getByRole('button', { name: /^save changes$/i })).toBeEnabled()
    expect(within(contextRegion).getByRole('button', { name: /^discard$/i })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()

    const generateButton = screen.getByRole('button', { name: /^generate section$/i })
    const regenerateButton = screen.getByRole('button', { name: /^regenerate section$/i })
    const acceptTruthButton = screen.getByRole('button', { name: /^accept truth$/i })
    expect(generateButton).toBeDisabled()
    expect(regenerateButton).toBeDisabled()
    expect(acceptTruthButton).toBeDisabled()
    expect(generateButton).toHaveAccessibleDescription('Save context changes before generating or accepting truth.')
    expect(regenerateButton).toHaveAccessibleDescription('Save context changes before generating or accepting truth.')
    expect(acceptTruthButton).toHaveAccessibleDescription('Save context changes before generating or accepting truth.')
    const visibleActionReason = document.getElementById(generateButton.getAttribute('aria-describedby'))
    expect(visibleActionReason).toBeVisible()
    expect(visibleActionReason).toHaveTextContent('Save context changes before generating or accepting truth.')

    selectRuntimeSectionTab('Overview')

    expect(generateButton).toBeDisabled()
    expect(regenerateButton).toBeDisabled()
    expect(acceptTruthButton).toBeDisabled()
    expect(visibleActionReason).toBeVisible()
    expect(visibleActionReason).toHaveTextContent('Save context changes before generating or accepting truth.')

    selectRuntimeSectionTab('Context')
    await user.click(within(contextRegion).getByRole('button', { name: /^discard$/i }))

    expect(field).toHaveValue('Proposal creation is slow.')
    expect(within(contextRegion).getByText('No unsaved context changes.')).toBeInTheDocument()
    expect(within(contextRegion).getByRole('button', { name: /^save changes$/i })).toBeDisabled()
    expect(within(contextRegion).queryByRole('button', { name: /^discard$/i })).not.toBeInTheDocument()
    expect(regenerateButton).toBeEnabled()
    expect(acceptTruthButton).toBeEnabled()
  })

  it('disables section generation from server-projected eligibility when no context exists', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          actions: [
            {
              actionKey: 'GENERATE_SECTION',
              governedAction: 'GENERATE_SECTION',
              buttonLabel: 'Generate Section',
              enabled: true,
              requiresConfirmation: false,
              policyKey: 'generate-section-policy',
            },
          ],
          sections: [
            {
              ...rendererPayload.sections[0],
              value: '',
              generationEligibility: {
                canGenerate: false,
                reason: 'Accept Intelligence Hub evidence before generating this section.',
                sources: [],
              },
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    const generateButton = screen.getByRole('button', { name: /^generate section$/i })
    expect(generateButton).toBeDisabled()
    expect(generateButton).toHaveAccessibleDescription('Accept Intelligence Hub evidence before generating this section.')
    expect(screen.getByText('Accept Intelligence Hub evidence before generating this section.')).toBeInTheDocument()
    await user.click(generateButton)

    expect(executeRuntimeAction).not.toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
  })

  it('renders generated content revisions and toggles the compare view', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: {
                content: 'Customer Problem: Proposal creation is slow.',
                generatedAt: '2026-05-22T09:10:00.000Z',
              },
              accepted: {
                content: 'Accepted customer problem truth.',
                acceptedAt: '2026-05-22T09:12:00.000Z',
                sourceGeneratedAt: '2026-05-22T09:10:00.000Z',
              },
              review: {
                status: 'PENDING_REVIEW',
              },
              state: {
                status: 'REGENERATED',
                revisionCount: 1,
              },
              revisions: [
                {
                  revisionNumber: 1,
                  generated: {
                    content: 'Customer Problem: Older generated content.',
                    generatedAt: '2026-05-22T09:00:00.000Z',
                  },
                  accepted: {
                    content: 'Earlier accepted customer problem truth.',
                  },
                  replacedAt: '2026-05-22T09:10:00.000Z',
                  reason: 'SECTION_INPUT_CHANGED',
                },
              ],
            },
          ],
          actions: [
            {
              actionKey: 'REGENERATE_SECTION',
              governedAction: 'REGENERATE_SECTION',
              buttonLabel: 'Regenerate Section',
              enabled: true,
              requiresConfirmation: false,
              policyKey: 'regenerate-section-policy',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await user.click(screen.getByRole('button', { name: /customer problem/i }))

    const sectionObject = screen.getByRole('region', { name: /ownership zones/i })
    expect(within(sectionObject).getByRole('region', { name: /generated content/i })).toHaveTextContent(
      'Customer Problem: Proposal creation is slow.',
    )
    expect(screen.getByText('Pending Review')).toBeInTheDocument()
    expect(screen.getByText('Regenerated, 1 revision')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^compare$/i }))

    const compareRegion = screen.getByRole('region', { name: /section truth comparison/i })
    expect(compareRegion).toHaveAttribute('tabindex', '0')
    expect(compareRegion).toHaveTextContent('Generated Section')
    expect(compareRegion).toHaveTextContent('Accepted Truth')
    expect(within(compareRegion).getByRole('region', { name: /^generated section$/i }))
      .toHaveClass('runtime-workspace__compare-panel')
    expect(within(compareRegion).getByRole('list', { name: /generated section comparison details/i }))
      .toHaveClass('runtime-workspace__section-detail-groups')
    expect(compareRegion).toHaveTextContent('Customer Problem')
    expect(compareRegion).toHaveTextContent('Older generated content.')
    expect(compareRegion).toHaveTextContent('Proposal creation is slow.')
    expect(compareRegion).toHaveTextContent('Accepted customer problem truth.')
    expect(compareRegion).toHaveTextContent('Earlier accepted customer problem truth.')
  })

  it('uses archived section revisions for regenerate and compare after input invalidation', async () => {
    const user = userEvent.setup()
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
          sections: [
            {
              ...rendererPayload.sections[0],
              generated: null,
              accepted: null,
              review: {
                status: 'PENDING_REVIEW',
                invalidationReason: 'SECTION_INPUT_CHANGED',
              },
              state: {
                status: 'DRAFT',
                revisionCount: 1,
              },
              revisions: [
                {
                  revisionNumber: 1,
                  generated: {
                    content: 'Customer Problem: Older generated content.',
                    generatedAt: '2026-05-22T09:00:00.000Z',
                  },
                  accepted: {
                    content: 'Earlier accepted customer problem truth.',
                    acceptedAt: '2026-05-22T09:02:00.000Z',
                  },
                  replacedAt: '2026-05-22T09:10:00.000Z',
                  reason: 'SECTION_INPUT_CHANGED',
                },
              ],
            },
          ],
          actions: [
            {
              actionKey: 'GENERATE_SECTION',
              governedAction: 'GENERATE_SECTION',
              buttonLabel: 'Generate Section',
              enabled: true,
              requiresConfirmation: false,
              policyKey: 'generate-section-policy',
            },
            {
              actionKey: 'REGENERATE_SECTION',
              governedAction: 'REGENERATE_SECTION',
              buttonLabel: 'Regenerate Section',
              enabled: true,
              requiresConfirmation: false,
              policyKey: 'regenerate-section-policy',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchRenderer,
    })

    renderRuntimeWorkspace()
    await openGuidedSection()

    const regenerateButton = screen.getByRole('button', { name: /^regenerate section$/i })
    const generateButton = screen.getByRole('button', { name: /^generate section$/i })
    expect(generateButton).toBeDisabled()
    expect(generateButton).toHaveAccessibleDescription(
      'Regenerate this section because previous generated content is archived for comparison.',
    )
    expect(regenerateButton).toBeEnabled()

    const compareButton = screen.getByRole('button', { name: /^compare$/i })
    expect(compareButton).toBeEnabled()
    await user.click(compareButton)

    const compareRegion = screen.getByRole('region', { name: /section truth comparison/i })
    expect(compareRegion).toHaveTextContent('Awaiting generation')
    expect(compareRegion).toHaveTextContent('No accepted governed truth has been projected for this section.')
    expect(compareRegion).toHaveTextContent('Customer Problem')
    expect(compareRegion).toHaveTextContent('Older generated content.')
    expect(compareRegion).toHaveTextContent('Earlier accepted customer problem truth.')

    await user.click(regenerateButton)
    expect(executeRuntimeAction).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      actionKey: 'REGENERATE_SECTION',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
      },
    })
  })
})
