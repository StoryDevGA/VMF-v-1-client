import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import {
  useAcceptRuntimeDiscoveryMutation,
  useExecuteRuntimeActionMutation,
  useGetRuntimeRendererQuery,
  useMutateRuntimeStateMutation,
  useUpdateRuntimeDiscoveryInputsMutation,
} from '../../store/api/runtimeInstanceApi.js'
import RuntimeWorkspace from './RuntimeWorkspace'

vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useAcceptRuntimeDiscoveryMutation: vi.fn(),
  useExecuteRuntimeActionMutation: vi.fn(),
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

function renderRuntimeWorkspace(initialEntry = '/app/runtime/value-narrative-001') {
  return render(
    <ToasterProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/app/runtime/:runtimeInstanceId" element={<RuntimeWorkspace />} />
        </Routes>
      </MemoryRouter>
    </ToasterProvider>,
  )
}

async function openGuidedSection(name = /customer problem/i) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name }))
  return user
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
    window.confirm = vi.fn(() => true)
    unwrapMutation.mockResolvedValue({ data: { mutation: { runtimePath: 'framework_state.sections.customer_problem' } } })
    mutateRuntimeState.mockReturnValue({ unwrap: unwrapMutation })
    unwrapAction.mockResolvedValue({ data: { action: { actionKey: 'SUBMIT_FOR_REVIEW' } } })
    executeRuntimeAction.mockReturnValue({ unwrap: unwrapAction })
    unwrapDiscoveryInputs.mockResolvedValue({ data: { discovery: { state: { status: 'EVIDENCE_READY' } } } })
    updateRuntimeDiscoveryInputs.mockReturnValue({ unwrap: unwrapDiscoveryInputs })
    unwrapAcceptDiscovery.mockResolvedValue({ data: { discovery: { state: { status: 'ACCEPTED' } } } })
    acceptRuntimeDiscovery.mockReturnValue({ unwrap: unwrapAcceptDiscovery })
    useAcceptRuntimeDiscoveryMutation.mockReturnValue([acceptRuntimeDiscovery, { isLoading: false }])
    useExecuteRuntimeActionMutation.mockReturnValue([executeRuntimeAction, { isLoading: false }])
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
    expect(screen.getByText('value-narrative-001')).toBeInTheDocument()
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
    const sectionObject = screen.getByRole('region', { name: /section ownership zones/i })
    expect(sectionObject).toBeInTheDocument()
    expect(within(sectionObject).getByRole('region', { name: /your additional context/i })).toHaveTextContent('Customer Problem')
    expect(within(sectionObject).getByRole('region', { name: /generated section/i })).toHaveTextContent('Awaiting generation')
    expect(within(sectionObject).getByRole('region', { name: /accepted final/i })).toHaveTextContent('No accepted final truth')

    const sidePanel = screen.getByRole('complementary', { name: /execution intelligence side panel/i })
    const sectionNav = within(sidePanel).getByRole('navigation', { name: /guided section navigation/i })
    expect(within(sectionNav).getByRole('button', { name: /0 discovery evidence not ready/i })).toBeInTheDocument()
    expect(within(sectionNav).getByRole('button', { name: /1 customer problem draft/i })).toHaveAttribute('aria-current', 'step')
    expect(within(sidePanel).queryByText(/runtime action execution is not live in this preview/i)).not.toBeInTheDocument()
    expect(within(sidePanel).getByRole('button', { name: /submit for review/i })).toBeEnabled()
    expect(within(sidePanel).getByText(/no runtime signals/i)).toBeInTheDocument()
    expect(within(sidePanel).getByText(/no runtime activity/i)).toBeInTheDocument()
    expect(within(sidePanel).getByRole('heading', { name: /workspace warnings/i })).toBeInTheDocument()
    expect(within(sidePanel).getByText('UI_CONTRACT_SECTION_MISSING')).toBeInTheDocument()
    expect(within(sidePanel).getByText('WARNING')).toBeInTheDocument()
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
    const sidePanel = screen.getByRole('complementary', { name: /execution intelligence side panel/i })
    expect(within(sidePanel).getByRole('button', { name: /0 discovery evidence ready/i })).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: /refresh evidence/i }))

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

    await user.click(screen.getByRole('button', { name: /accept discovery/i }))

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

    expect(screen.getByRole('button', { name: /accept discovery/i })).toBeDisabled()
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

    await user.click(screen.getByRole('button', { name: /accept discovery/i }))

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

    const acceptButton = screen.getByRole('button', { name: /accept discovery/i })
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

    const refreshButton = screen.getByRole('button', { name: /refresh evidence/i })
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
    const sidePanel = screen.getByRole('complementary', { name: /execution intelligence side panel/i })
    const sectionNav = within(sidePanel).getByRole('navigation', { name: /guided section navigation/i })
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

    const sidePanel = screen.getByRole('complementary', { name: /execution intelligence side panel/i })
    expect(within(sidePanel).getByRole('button', { name: /send to review/i })).toBeEnabled()
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
    expect(screen.getByText('Discovery active')).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: /section executive summary/i }))

    const field = screen.getByLabelText('Section Executive Summary')
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
    await user.click(screen.getByRole('button', { name: /section executive summary/i }))

    const field = screen.getByLabelText('Section Executive Summary')
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

  it('does not execute disabled runtime actions', async () => {
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

    const actionButton = screen.getByRole('button', { name: /submit for review/i })
    expect(actionButton).toBeDisabled()
    expect(screen.getByText('Mark this runtime ready first.')).toBeInTheDocument()
    expect(actionButton).toHaveAccessibleDescription('Mark this runtime ready first.')
    await user.click(actionButton)

    expect(executeRuntimeAction).not.toHaveBeenCalled()
    expect(refetchRenderer).not.toHaveBeenCalled()
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
    await user.click(screen.getByRole('button', { name: /section executive summary/i }))

    expect(screen.getByLabelText('Section Executive Summary')).toHaveAttribute(
      'placeholder',
      'Summarise the customer situation, priority, and recommended value narrative focus.',
    )
    const sectionObject = screen.getByRole('region', { name: /section ownership zones/i })
    expect(within(sectionObject).getByRole('region', { name: /your additional context/i })).toHaveTextContent('Section Executive Summary')
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
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
    expect(mutateRuntimeState).not.toHaveBeenCalled()
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
          },
          lock: {
            state: 'LOCKED',
            locked: true,
            lockedAt: '2026-05-22T10:00:00.000Z',
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
    expect(screen.getByText('Read only preview')).toBeInTheDocument()
    expect(screen.getByLabelText(/customer problem/i)).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
    const runValidationButton = screen.getByRole('button', { name: /run validation/i })
    expect(runValidationButton).toBeDisabled()
    expect(runValidationButton).toHaveAccessibleDescription('Runtime is locked and cannot be mutated or actioned.')
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
                reason: 'Add discovery evidence or section context before generating this section.',
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
    expect(generateButton).toHaveAccessibleDescription('Add discovery evidence or section context before generating this section.')
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

    const sectionObject = screen.getByRole('region', { name: /section ownership zones/i })
    expect(within(sectionObject).getByRole('region', { name: /generated section/i })).toHaveTextContent(
      'Customer Problem: Proposal creation is slow.',
    )
    expect(screen.getByText('Pending Review')).toBeInTheDocument()
    expect(screen.getByText('Regenerated, 1 revision')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^compare$/i }))

    const compareRegion = screen.getByRole('region', { name: /generated comparison/i })
    expect(compareRegion).toHaveTextContent('Customer Problem: Older generated content.')
    expect(compareRegion).toHaveTextContent('Customer Problem: Proposal creation is slow.')
  })
})
