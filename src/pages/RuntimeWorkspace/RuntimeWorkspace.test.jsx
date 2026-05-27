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
    unwrapAcceptSection.mockResolvedValue({ data: { section: { accepted: { content: 'Accepted final.' } } } })
    acceptRuntimeSection.mockReturnValue({ unwrap: unwrapAcceptSection })
    useAcceptRuntimeDiscoveryMutation.mockReturnValue([acceptRuntimeDiscovery, { isLoading: false }])
    useAcceptRuntimeSectionMutation.mockReturnValue([acceptRuntimeSection, { isLoading: false }])
    useExecuteRuntimeActionMutation.mockReturnValue([executeRuntimeAction, { isLoading: false }])
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
    expect(screen.getByText('Execution Workspace')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Acme Value Narrative' })).toBeInTheDocument()
    expect(screen.getByText('Continue governed runtime work for value-narrative-001.')).toBeInTheDocument()
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
    expect(within(sections).getByRole('heading', { name: /^discovery$/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /guided section navigation/i })).toBeInTheDocument()
    await openGuidedSection()
    const sectionList = within(sections).getByRole('list', { name: /runtime section cards/i })
    expect(sectionList.tagName).toBe('UL')
    expect(sectionList).not.toHaveAttribute('role')
    expect(within(sectionList).getAllByRole('listitem')).toHaveLength(1)
    expect(within(sections).getByRole('heading', { name: /customer problem/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/customer problem/i)).toHaveValue('Proposal creation is slow.')
    expect(screen.queryByText('framework_state.sections.customer_problem')).not.toBeInTheDocument()
    const sectionCard = within(sectionList).getByRole('listitem')
    expect(within(sectionCard).getByText('Required')).toBeInTheDocument()
    expect(within(sectionCard).getByText('Editable')).toBeInTheDocument()
    const progressSummary = screen.getByLabelText(/execution progress summary/i)
    expect(within(progressSummary).getByRole('progressbar', { name: /1 of 1 required sections have input/i })).toHaveAttribute('value', '100')
    const metrics = within(progressSummary).getByRole('list', { name: /execution workspace metrics/i })
    expect(within(metrics).getByText('Required')).toBeInTheDocument()
    expect(within(metrics).getByText('1/1')).toBeInTheDocument()
    expect(within(metrics).getByText(/1 warning/i)).toBeInTheDocument()
    const sectionObject = screen.getByRole('region', { name: /ownership zones/i })
    expect(sectionObject).toBeInTheDocument()
    expect(within(sectionObject).getByRole('region', { name: /your additional context/i })).toHaveTextContent('Customer Problem')
    expect(within(sectionObject).getByRole('region', { name: /generated content/i })).toHaveTextContent('Awaiting generation')
    expect(within(sectionObject).getByRole('region', { name: /accepted truth/i })).toHaveTextContent('No accepted governed truth')
    const governedIntelligence = screen.getByRole('region', { name: /governed intelligence/i })
    expect(within(governedIntelligence).getByText('Confidence')).toHaveClass('runtime-workspace__section-intelligence-label')
    const truthReadiness = within(governedIntelligence).getByText(/section needs generated and accepted truth/i)
    expect(truthReadiness).toBeInTheDocument()
    expect(truthReadiness).not.toHaveClass('runtime-workspace__section-intelligence-label')
    expect(truthReadiness.closest('.status')).toHaveClass('status--warning')

    const intelligencePanel = screen.getByRole('complementary', { name: /execution intelligence side panel/i })
    const guidedPanel = screen.getByRole('complementary', { name: /guided sections side panel/i })
    const sectionNav = within(guidedPanel).getByRole('navigation', { name: /guided section navigation/i })
    expect(within(guidedPanel).getByText('1 section')).toBeInTheDocument()
    expect(within(sectionNav).getByRole('button', { name: /0 discovery evidence not ready/i })).toBeInTheDocument()
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
    expect(within(sectionNav).getByRole('button', { name: /0 discovery evidence not ready/i })).toBeInTheDocument()
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
              keys: ['source'],
              count: 1,
            },
            evidenceSummary: {
              keys: ['priorities'],
              count: 1,
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
    expect(within(discoverySection).getByText('Evidence Ready')).toBeInTheDocument()
    expect(within(discoverySection).getByRole('region', { name: /discovery inputs/i })).toHaveTextContent('source')
    expect(within(discoverySection).getByRole('region', { name: /evidence pack/i })).toHaveTextContent('priorities')
    expect(within(discoverySection).getByRole('region', { name: /scoped evidence views/i })).toHaveTextContent('customer_problem')
    expect(within(discoverySection).getByRole('region', { name: /discovery acceptance/i })).toHaveTextContent(
      'Discovery has not been accepted',
    )
    const guidedPanel = screen.getByRole('complementary', { name: /guided sections side panel/i })
    expect(within(guidedPanel).getByRole('button', { name: /0 discovery evidence ready/i })).toBeInTheDocument()
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
                summary: 'Customer-provided discovery inputs are available for this section.',
                inputKeys: ['companyWebsite', 'companyName', 'marketRegion', 'targetOffer'],
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
    await openGuidedSection()

    const suggestedRegion = screen.getByRole('region', { name: /suggested from discovery/i })
    expect(suggestedRegion).toHaveTextContent('Customer-provided discovery inputs are available for this section.')
    expect(suggestedRegion).toHaveTextContent('companyWebsite, companyName, marketRegion, targetOffer')
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

    await user.type(screen.getByLabelText('Company Website'), 'https://acme.example')
    await user.type(screen.getByLabelText('Market / Region'), 'UK enterprise')
    await user.type(screen.getByLabelText('Target Product or Offer'), 'Managed proposal platform')
    await user.type(screen.getByLabelText('Optional Notes'), 'Prioritize governed evidence reuse.')
    await user.click(screen.getByRole('button', { name: /build evidence pack/i }))

    expect(updateRuntimeDiscoveryInputs).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: {
        inputs: {
          companyWebsite: 'https://acme.example',
          companyName: 'Acme',
          marketRegion: 'UK enterprise',
          targetOffer: 'Managed proposal platform',
          notes: 'Prioritize governed evidence reuse.',
        },
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(refetchRenderer).toHaveBeenCalled()
    expect(await screen.findByText(/discovery evidence refreshed/i)).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /status: discovery evidence refreshed/i })).toBeInTheDocument()
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

    await user.type(screen.getByLabelText('Company Website'), 'https://acme.example')
    await user.type(screen.getByLabelText('Market / Region'), 'UK enterprise')
    await user.type(screen.getByLabelText('Target Product or Offer'), 'Managed proposal platform')
    await user.click(screen.getByRole('button', { name: /build evidence pack/i }))

    expect(executeRuntimeAction).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      actionKey: 'BUILD_EVIDENCE_PACK',
      body: {
        inputs: {
          companyWebsite: 'https://acme.example',
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
    expect(await screen.findByText(/discovery accepted/i)).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /status: discovery accepted/i })).toBeInTheDocument()
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
          message: 'Discovery evidence is incomplete and must be refreshed before acceptance.',
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

    expect(await screen.findByText(/discovery evidence is incomplete/i)).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /status: discovery evidence is incomplete/i })).toBeInTheDocument()
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

    const refreshButton = screen.getByRole('button', { name: /build evidence pack/i })
    expect(refreshButton).toBeEnabled()
    await user.type(screen.getByLabelText('Company Name'), 'Acme')
    await user.click(refreshButton)

    expect(updateRuntimeDiscoveryInputs).toHaveBeenCalledWith(expect.objectContaining({
      runtimeInstanceId: 'value-narrative-001',
      body: expect.objectContaining({
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
    expect(within(discoverySection).getByRole('region', { name: /discovery acceptance/i })).toHaveTextContent(
      'Discovery accepted on 2026-05-24.',
    )
  })

  it('shows neutral progress when no runtime sections are projected', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
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
    expect(within(progressSummary).getByRole('progressbar', { name: /no required input to measure/i })).toHaveAttribute('value', '0')
    const metrics = within(progressSummary).getByRole('list', { name: /execution workspace metrics/i })
    expect(within(metrics).getByText('None')).toBeInTheDocument()
    expect(within(metrics).getByText('0/0')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^discovery$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /0 discovery evidence not ready/i })).toBeInTheDocument()
  })

  it('shows neutral progress when projected sections have no required input', async () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: {
        data: {
          ...rendererPayload,
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
    expect(within(progressSummary).getByRole('progressbar', { name: /no required input to measure/i })).toHaveAttribute('value', '0')
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

    const field = screen.getByLabelText(/customer problem/i)
    await user.clear(field)
    await user.type(field, 'Proposal teams lack a shared story.')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

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

    const field = screen.getByLabelText(/customer problem/i)
    await user.clear(field)
    await user.type(field, 'Proposal teams need a shared governed narrative.')
    await user.click(screen.getByRole('button', { name: /^save & next$/i }))

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

  it('returns to Discovery when the server-owned advance projection has no next section', async () => {
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

    const field = screen.getByLabelText(/customer problem/i)
    await user.clear(field)
    await user.type(field, 'Final section update.')
    await user.click(screen.getByRole('button', { name: /^save & next$/i }))

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
    expect(screen.getByRole('heading', { name: 'Discovery' })).toBeInTheDocument()
    const guidedPanel = screen.getByRole('complementary', { name: /guided sections side panel/i })
    const sectionNav = within(guidedPanel).getByRole('navigation', { name: /guided section navigation/i })
    expect(within(sectionNav).getByRole('button', { name: /0 discovery/i })).toHaveAttribute('aria-current', 'step')
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

    const field = screen.getByLabelText('Executive Summary')
    await user.clear(field)
    await user.type(field, 'Customer needs a clearer executive narrative.')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

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

    const field = screen.getByLabelText('Executive Summary')
    await user.clear(field)
    fireEvent.change(field, { target: { value: '{"summary":' } })
    await user.click(screen.getByRole('button', { name: /^save$/i }))

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

    const field = screen.getByLabelText('Confidence Score')
    await user.clear(field)
    await user.type(field, '42.5')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

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

    const field = screen.getByLabelText('Confidence Score')
    await user.clear(field)
    await user.type(field, 'not numeric')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

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

    await user.click(screen.getByRole('checkbox', { name: /priority confirmed/i }))
    await user.click(screen.getByRole('button', { name: /^save$/i }))

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

    await user.selectOptions(screen.getByLabelText('Narrative Status'), 'READY')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

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

    const field = screen.getByLabelText(/customer problem/i)
    await user.clear(field)
    await user.type(field, 'Updated value without marker.')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

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

    const field = screen.getByLabelText(/customer problem/i)
    await user.clear(field)
    await user.type(field, 'Proposal teams lack a shared story.')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

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
    expect(await screen.findByText(/runtime action completed/i)).toBeInTheDocument()
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
    expect(blockedButton).toBeDisabled()
    expect(blockedButton).toHaveClass('btn--outline')
    expect(blockedButton).toHaveAccessibleDescription('Mark this runtime ready first.')
    expect(within(governedActions).getByText('Mark this runtime ready first.')).toBeVisible()
    expect(screen.queryByText('No actions available')).not.toBeInTheDocument()
    await user.click(blockedButton)
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
    expect(blockedButton).toBeDisabled()
    expect(blockedButton).toHaveAccessibleDescription('Runtime must be published before it can be locked.')
    expect(within(governedActions).getByText('Runtime must be published before it can be locked.')).toBeVisible()
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

    expect(await screen.findByText(/runtime projection is missing its concurrency marker/i)).toBeInTheDocument()
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
          details: {
            reason: 'RUNTIME_ACTION_NOT_AVAILABLE',
          },
        },
      },
    })

    renderRuntimeWorkspace()

    await user.click(screen.getByRole('button', { name: /submit for review/i }))

    expect(await screen.findByText(/runtime action is not currently executable/i)).toBeInTheDocument()
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
    expect(screen.getByLabelText(/customer problem/i)).toHaveAttribute('readonly')
    const generateButton = screen.getByRole('button', { name: /^generate section$/i })
    const regenerateButton = screen.getByRole('button', { name: /^regenerate section$/i })
    expect(generateButton).toBeDisabled()
    expect(regenerateButton).toBeDisabled()
    expect(screen.getAllByText('Current role or permissions do not allow runtime section generation.')).toHaveLength(2)
    const acceptTruthButton = screen.getByRole('button', { name: /^accept truth$/i })
    expect(acceptTruthButton).toBeDisabled()
    expect(acceptTruthButton).toHaveAccessibleDescription('Current role or permissions do not allow accepting this section.')
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
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
    expect(screen.getByLabelText(/customer problem/i)).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
    const actionScroll = screen.getByRole('region', { name: /governed runtime actions scroll region/i })
    const governedActions = within(actionScroll).getByRole('group', { name: /governed runtime actions/i })
    const blockedButton = within(governedActions).getByRole('button', { name: /run validation/i })
    expect(blockedButton).toBeDisabled()
    expect(blockedButton).toHaveAccessibleDescription('Runtime is locked and cannot be mutated or actioned.')
    expect(within(governedActions).getByText('Runtime is locked and cannot be mutated or actioned.')).toBeVisible()
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
    expect(within(sectionCard).getByRole('button', { name: /^regenerate section$/i })).toBeDisabled()
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
                reason: 'Accept discovery evidence before generating this section.',
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
    expect(generateButton).toHaveAccessibleDescription('Accept discovery evidence before generating this section.')
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
                revisions: [
                  {
                    revisionNumber: 1,
                    accepted: {
                      content: 'Earlier accepted customer problem truth.',
                    },
                    replacedAt: '2026-05-22T09:12:00.000Z',
                    reason: 'ACCEPTED_TRUTH_REPLACED',
                  },
                ],
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
                  replacedAt: '2026-05-22T09:10:00.000Z',
                },
              ],
              acceptedRevisions: [
                {
                  revisionNumber: 1,
                  accepted: {
                    content: 'Earlier accepted customer problem truth.',
                  },
                  replacedAt: '2026-05-22T09:12:00.000Z',
                  reason: 'ACCEPTED_TRUTH_REPLACED',
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
    expect(compareRegion).toHaveTextContent('Generated Section')
    expect(compareRegion).toHaveTextContent('Accepted Truth')
    expect(compareRegion).toHaveTextContent('Customer Problem: Older generated content.')
    expect(compareRegion).toHaveTextContent('Customer Problem: Proposal creation is slow.')
    expect(compareRegion).toHaveTextContent('Accepted customer problem truth.')
    expect(compareRegion).toHaveTextContent('Earlier accepted customer problem truth.')
  })
})
