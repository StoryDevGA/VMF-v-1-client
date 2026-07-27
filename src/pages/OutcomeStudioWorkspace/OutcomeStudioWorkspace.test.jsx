import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToasterProvider } from '../../components/Toaster'
import { formatDateTime } from '../../utils/dateTime.js'
import {
  useApproveRuntimeOutcomeDraftMutation,
  useCreateRuntimeOutcomeSessionMutation,
  useDiscardRuntimeOutcomeDraftMutation,
  useGenerateRuntimeOutcomeResponseMutation,
  useGetRuntimeOutcomeStudioQuery,
  useGetRuntimeOutcomeStudioReadinessQuery,
  useGetRuntimeOutcomeSessionQuery,
  useLazyExportRuntimeOutcomeAssetQuery,
  useLazyGetRuntimeOutcomeAssetPreviewQuery,
  useLazyGetRuntimeOutcomeAssetQuery,
  useLazyGetRuntimeOutcomeDraftPreviewQuery,
  usePublishRuntimeOutcomeAssetMutation,
  useSubmitRuntimeOutcomeMessageMutation,
  useUpdateRuntimeOutcomeSessionFromLatestTruthMutation,
} from '../../store/api/runtimeInstanceApi.js'
import OutcomeStudioWorkspace from './OutcomeStudioWorkspace.jsx'

vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useApproveRuntimeOutcomeDraftMutation: vi.fn(),
  useCreateRuntimeOutcomeSessionMutation: vi.fn(),
  useDiscardRuntimeOutcomeDraftMutation: vi.fn(),
  useGenerateRuntimeOutcomeResponseMutation: vi.fn(),
  useGetRuntimeOutcomeStudioQuery: vi.fn(),
  useGetRuntimeOutcomeStudioReadinessQuery: vi.fn(),
  useGetRuntimeOutcomeSessionQuery: vi.fn(),
  useLazyExportRuntimeOutcomeAssetQuery: vi.fn(),
  useLazyGetRuntimeOutcomeAssetPreviewQuery: vi.fn(),
  useLazyGetRuntimeOutcomeAssetQuery: vi.fn(),
  useLazyGetRuntimeOutcomeDraftPreviewQuery: vi.fn(),
  usePublishRuntimeOutcomeAssetMutation: vi.fn(),
  useSubmitRuntimeOutcomeMessageMutation: vi.fn(),
  useUpdateRuntimeOutcomeSessionFromLatestTruthMutation: vi.fn(),
}))

const refetchStudio = vi.fn()
const refetchReadiness = vi.fn()
const refetchSession = vi.fn()
const createSession = vi.fn()
const discardDraft = vi.fn()
const approveDraft = vi.fn()
const submitMessage = vi.fn()
const generateResponse = vi.fn()
const publishAsset = vi.fn()
const exportAsset = vi.fn()
const loadAsset = vi.fn()
const loadPreview = vi.fn()
const loadDraftPreview = vi.fn()

const resolvedMutation = (value = { data: {} }) => ({ unwrap: vi.fn().mockResolvedValue(value) })

const studio = {
  readiness: {
    state: 'READY',
    canStartSession: true,
    canReason: true,
    summary: 'Outcome Studio can start governed sessions.',
    blockers: [],
    safetyGates: {
      responseGenerationAvailable: true,
    },
  },
  information: { status: 'PROJECTED', currentness: 'CURRENT' },
  conversation: { enabled: true, requestMaxLength: 2000 },
  safetyGates: {
    status: 'READY',
    responseGenerationAvailable: true,
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
    approvalAvailable: true,
  }],
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
  beforeEach(() => {
    vi.clearAllMocks()
    refetchStudio.mockResolvedValue({ data: studio })
    refetchReadiness.mockResolvedValue({ data: studio.readiness })
    refetchSession.mockResolvedValue({ data: session })
    createSession.mockReturnValue(resolvedMutation({ data: { sessionId: 'session-new' } }))
    discardDraft.mockReturnValue(resolvedMutation({ data: { draft: { ...session.drafts[0], status: 'DISCARDED' } } }))
    approveDraft.mockReturnValue(resolvedMutation())
    submitMessage.mockReturnValue(resolvedMutation())
    generateResponse.mockReturnValue(resolvedMutation())
    publishAsset.mockReturnValue(resolvedMutation())
    exportAsset.mockReturnValue(resolvedMutation({ data: { filename: 'board-narrative.pdf', content: 'PDF' } }))
    loadAsset.mockResolvedValue({ data: { outcomeAssetId: 'asset-1', versions: [] } })
    loadPreview.mockResolvedValue({ data: { outcomeAssetId: 'asset-1' } })
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

    useGetRuntimeOutcomeStudioQuery.mockReturnValue({ data: { data: studio }, isLoading: false, error: null, refetch: refetchStudio })
    useGetRuntimeOutcomeStudioReadinessQuery.mockReturnValue({ data: { data: studio.readiness }, isLoading: false, error: null, refetch: refetchReadiness })
    useGetRuntimeOutcomeSessionQuery.mockReturnValue({ data: { data: session }, isLoading: false, error: null, refetch: refetchSession })
    useCreateRuntimeOutcomeSessionMutation.mockReturnValue([createSession, { isLoading: false }])
    useSubmitRuntimeOutcomeMessageMutation.mockReturnValue([submitMessage, { isLoading: false }])
    useGenerateRuntimeOutcomeResponseMutation.mockReturnValue([generateResponse, { isLoading: false }])
    useUpdateRuntimeOutcomeSessionFromLatestTruthMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useApproveRuntimeOutcomeDraftMutation.mockReturnValue([approveDraft, { isLoading: false }])
    useDiscardRuntimeOutcomeDraftMutation.mockReturnValue([discardDraft, { isLoading: false }])
    usePublishRuntimeOutcomeAssetMutation.mockReturnValue([publishAsset, { isLoading: false }])
    useLazyExportRuntimeOutcomeAssetQuery.mockReturnValue([exportAsset, { isFetching: false, error: null }])
    useLazyGetRuntimeOutcomeAssetQuery.mockReturnValue([loadAsset, { data: { data: { outcomeAssetId: 'asset-1', versions: [] } }, isFetching: false, error: null }])
    useLazyGetRuntimeOutcomeAssetPreviewQuery.mockReturnValue([loadPreview, { data: { data: { outcomeAssetId: 'asset-1', previewAvailable: true, sections: [{ key: 'summary', label: 'Executive Summary', body: 'Customer-safe preview.' }] } }, isFetching: false, error: null }])
    useLazyGetRuntimeOutcomeDraftPreviewQuery.mockReturnValue([loadDraftPreview, { isFetching: false, error: null }])
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
    expect(screen.getByRole('tab', { name: 'Conversation' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Working Drafts' })).toBeInTheDocument()
    expect(screen.getByText('Prepare the board narrative.')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Approved Outputs' }))
    const outputs = screen.getByRole('region', { name: /approved outputs/i })
    expect(outputs).toHaveTextContent('Generated 2026-07-17')
    expect(outputs).not.toHaveTextContent('Raw customer payload')
    expect(outputs).not.toHaveTextContent('Hidden platform detail')

    await user.click(within(outputs).getByRole('button', { name: 'Preview' }))
    expect(loadAsset).toHaveBeenCalledWith({ runtimeInstanceId: 'value-narrative-001', outcomeAssetId: 'asset-1' })
    expect(loadPreview).toHaveBeenCalledWith({ runtimeInstanceId: 'value-narrative-001', outcomeAssetId: 'asset-1' })
    expect(screen.getByRole('region', { name: /generated body preview/i })).toHaveTextContent('Customer-safe preview.')
  })

  it('previews the current working draft before approval', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    const workingDrafts = screen.getByRole('region', { name: /outcome studio working drafts/i })
    await user.click(within(workingDrafts).getByRole('button', { name: 'Preview' }))

    expect(loadDraftPreview).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      sessionId: 'session-1',
      draftId: 'draft-1',
    })
    const preview = screen.getByRole('region', { name: /outcome studio working draft preview/i })
    expect(preview).toHaveTextContent('Working Draft Preview')
    expect(preview).toHaveTextContent('Customer-safe working content.')
    expect(preview).not.toHaveTextContent('Hidden platform detail')
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

    const history = screen.getByRole('list', { name: 'Outcome Studio request history' })
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
      sessionId: 'session-1',
      messageId: 'message-6',
      body: {},
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
    expect(screen.getByRole('list', { name: 'Outcome Studio request history' })).toHaveAttribute(
      'id',
      'outcome-studio-request-history',
    )
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
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
      { runtimeInstanceId: 'value-narrative-001', sessionId: '' },
      { skip: true },
    )
    expect(screen.getByText('No active session')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument()
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
    expect(screen.queryByText('No requests yet')).not.toBeInTheDocument()
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
      'Draft generation is not available until the required information and content checks are complete.',
    )
    expect(screen.getByRole('textbox', { name: 'Your request' })).toBeEnabled()

    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Add customer evidence.')
    await user.click(screen.getByRole('button', { name: 'Submit request' }))
    expect(submitMessage).toHaveBeenCalled()
    expect(generateResponse).not.toHaveBeenCalled()
  })

  it.each([
    {
      label: 'reasoning readiness is blocked',
      readiness: {
        ...studio.readiness,
        canReason: false,
      },
    },
    {
      label: 'the dedicated generation gate is blocked',
      readiness: {
        ...studio.readiness,
        safetyGates: { responseGenerationAvailable: false },
      },
    },
    {
      label: 'dedicated readiness flags are missing',
      readiness: {
        state: 'READY',
        canStartSession: true,
        summary: 'Outcome Studio readiness is incomplete.',
        blockers: [],
      },
    },
  ])('fails generation closed when $label', async ({ readiness }) => {
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
    expect(generateButton).toHaveAccessibleDescription(
      'Draft generation is not available until the required information and content checks are complete.',
    )

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
      'Draft generation is not available until the required information and content checks are complete.',
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
      sessionId: 'session-1',
      messageId: 'message-1',
      body: {},
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

  it('falls back to an available deliverable when persisted session metadata is stale', async () => {
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

    expect(screen.getByRole('combobox', { name: 'Deliverable' })).toHaveValue('board-narrative')
    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Refine the available deliverable.')
    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    expect(submitMessage).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      sessionId: 'session-1',
      body: {
        prompt: 'Refine the available deliverable.',
        requestedOutputTypeKey: 'board-narrative',
      },
    })
  })

  it('warns that a submitted request was saved when only the refresh fails', async () => {
    const user = userEvent.setup()
    refetchSession.mockRejectedValueOnce(new Error('Internal refresh detail must not render.'))
    renderPage()

    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Refine the recommendation.')
    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    expect(await screen.findByText('Outcome Studio refresh needed')).toBeInTheDocument()
    expect(screen.getByText(
      'The change was saved, but the latest Outcome Studio information could not be loaded. Refresh the page.',
    )).toBeInTheDocument()
    expect(screen.queryByText('Outcome Studio action failed')).not.toBeInTheDocument()
    expect(screen.queryByText('Internal refresh detail must not render.')).not.toBeInTheDocument()
  })

  it('keeps a rejected mutation on the standard action-failed path', async () => {
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

    await user.type(screen.getByRole('textbox', { name: 'Your request' }), 'Refine the recommendation.')
    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    expect(await screen.findByText('Outcome Studio action failed')).toBeInTheDocument()
    expect(screen.getByText('The request could not be submitted. Reference: outcome-submit-ref-1')).toBeInTheDocument()
    expect(screen.queryByText('Outcome Studio refresh needed')).not.toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Submit request' }))
    expect(submitMessage).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      sessionId: 'session-1',
      body: { prompt: 'Refine the recommendation.', requestedOutputTypeKey: 'board-narrative' },
    })

    await user.click(screen.getByRole('tab', { name: 'Working Drafts' }))
    await user.click(screen.getByRole('button', { name: 'Approve draft' }))
    expect(approveDraft).toHaveBeenCalledWith({ runtimeInstanceId: 'value-narrative-001', sessionId: 'session-1', draftId: 'draft-1', body: {} })

    const outputs = screen.getByRole('region', { name: /approved outputs/i })
    await user.click(within(outputs).getByRole('button', { name: 'Publish' }))
    expect(publishAsset).toHaveBeenCalledWith({ runtimeInstanceId: 'value-narrative-001', outcomeAssetId: 'asset-1', body: {} })

    fireEvent.click(screen.getByRole('button', { name: 'Execution Workspace' }))
    expect(screen.getByText('Execution Workspace Return')).toBeInTheDocument()
  })

  it.each(['OUT_OF_DATE', 'OBSOLETE', 'UNKNOWN'])(
    'fails closed for %s session and draft information',
    async (currentness) => {
    const user = userEvent.setup()
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
    renderPage()

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

  it('starts a session without refetching the skipped session query', async () => {
    const user = userEvent.setup()
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: { data: { ...studio, sessions: [] } },
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
    refetchSession.mockRejectedValue(new Error('Skipped query must not refetch.'))
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Start session' }))

    expect(createSession).toHaveBeenCalledWith({
      runtimeInstanceId: 'value-narrative-001',
      body: { requestedOutputTypeKey: 'board-narrative' },
    })
    expect(refetchStudio).toHaveBeenCalled()
    expect(refetchReadiness).toHaveBeenCalled()
    expect(refetchSession).not.toHaveBeenCalled()
    expect(await screen.findByText('Outcome Studio session started.')).toBeInTheDocument()
  })

  it('warns that a new session was saved when its refresh fails', async () => {
    const user = userEvent.setup()
    useGetRuntimeOutcomeStudioQuery.mockReturnValue({
      data: { data: { ...studio, sessions: [] } },
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
    refetchStudio.mockRejectedValueOnce(new Error('Internal session refresh detail must not render.'))
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Start session' }))

    expect(await screen.findByText('Outcome Studio refresh needed')).toBeInTheDocument()
    expect(screen.queryByText('Outcome Studio action failed')).not.toBeInTheDocument()
    expect(screen.queryByText('Internal session refresh detail must not render.')).not.toBeInTheDocument()
    expect(refetchSession).not.toHaveBeenCalled()
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
    exportAsset.mockReturnValue(resolvedMutation({
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
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
