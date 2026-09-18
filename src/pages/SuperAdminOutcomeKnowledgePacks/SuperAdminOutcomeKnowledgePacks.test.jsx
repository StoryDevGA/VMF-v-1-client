import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SuperAdminOutcomeKnowledgePacks from './SuperAdminOutcomeKnowledgePacks.jsx'

const navigateMock = vi.fn()
const {
  activateVersionMock,
  loadActivationVersionMock,
  disableActivationMock,
  addToastMock,
  deletePackMock,
  deprecateVersionMock,
  detailQueryMock,
  disableVersionMock,
  duplicateDiagnosticsQueryMock,
  importSourceDocumentDraftMock,
  importMetadataPreviewMock,
  listQueryMock,
  loadContentPreviewMock,
  previewQueryMock,
  rollbackPackMock,
  updateReviewStatusMock,
  validateVersionMock,
  versionQueryMock,
} = vi.hoisted(() => ({
  activateVersionMock: vi.fn(),
  loadActivationVersionMock: vi.fn(),
  disableActivationMock: vi.fn(),
  addToastMock: vi.fn(),
  deletePackMock: vi.fn(),
  deprecateVersionMock: vi.fn(),
  detailQueryMock: vi.fn(),
  disableVersionMock: vi.fn(),
  duplicateDiagnosticsQueryMock: vi.fn(),
  importSourceDocumentDraftMock: vi.fn(),
  importMetadataPreviewMock: vi.fn(),
  listQueryMock: vi.fn(),
  loadContentPreviewMock: vi.fn(),
  previewQueryMock: vi.fn(),
  rollbackPackMock: vi.fn(),
  updateReviewStatusMock: vi.fn(),
  validateVersionMock: vi.fn(),
  versionQueryMock: vi.fn(),
}))

const requiredPacks = [
  {
    packType: 'ARL',
    packKey: 'adaptive-reasoning-layer',
    label: 'Adaptive Reasoning Layer',
    status: 'MISSING',
    runtimeBindable: false,
  },
  {
    packType: 'RL',
    packKey: 'rendering-layer',
    label: 'Rendering Layer',
    status: 'MISSING',
    runtimeBindable: false,
  },
  {
    packType: 'OUTPUT_SCHEMA',
    packKey: 'output-schemas-pack',
    label: 'Output Schemas',
    status: 'MISSING',
    runtimeBindable: false,
  },
  {
    packType: 'TRUTH_CERTIFICATION',
    packKey: 'truth-certification-pack',
    label: 'Truth Certification',
    status: 'MISSING',
    runtimeBindable: false,
  },
  {
    packType: 'OUTPUT_TYPE_DEFINITION',
    packKey: 'outcome-output-types',
    label: 'Outcome Output Types',
    status: 'MISSING',
    runtimeBindable: false,
  },
]

const sourceBundle = {
  status: 'RETIRED',
  sourceDocuments: [],
}

const defaultListResult = {
  data: {
    data: [
      {
        id: 'knowledge-pack-output-schemas-pack',
        packId: 'knowledge-pack-output-schemas-pack',
        packType: 'OUTPUT_SCHEMA',
        packKey: 'output-schemas-pack',
        knowledgeAssetId: 'OSC-001',
        knowledgeLayer: 'OUTPUT_SCHEMA',
        capabilityKey: 'output-schemas',
        workspaceCompatibility: ['OUTCOME', 'ADVISOR'],
        label: 'Output Schemas',
        description: 'Output schema knowledge pack for Outcome Studio.',
        status: 'DRAFT',
        latestVersionId: 'output-schemas-pack@1.0.0',
        latestSemanticVersion: '1.0.0',
        sourceMetadata: {
          importMode: 'SOURCE_DOCUMENT_IMPORT_DRAFT',
          sourceStatus: 'SOURCE_DOCUMENT_PRESENT',
          sourceFilename: 'output-schemas-pack-v1.md',
          sourceDocumentId: 'kpsrc-output-schema-output-schemas-pack-1-0-0-source-hash',
          sourceHash: 'sha256:source-hash',
          contentPersisted: true,
          sourceDocument: {
            sourceDocumentId: 'kpsrc-output-schema-output-schemas-pack-1-0-0-source-hash',
            filename: 'output-schemas-pack-v1.md',
            fileExtension: 'md',
            sourceHash: 'sha256:source-hash',
          },
        },
        authoringMode: 'IMPORT_SOURCE_DOCUMENT',
        reviewStatus: 'DRAFT',
        updatedAt: '2026-06-15T09:00:00.000Z',
      },
    ],
    sourceBundle,
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  },
  isLoading: false,
  isFetching: false,
  error: null,
}

const defaultPreviewResult = {
  data: {
    data: {
      status: 'BLOCKED',
      summary: 'Knowledge Pack Registry activation is required before Outcome Studio sessions can start.',
      requiredPacks,
      sourceBundle,
      resolution: {
        status: 'BLOCKED',
        activeCount: 0,
        requiredCount: 5,
        unboundRequiredPacks: requiredPacks,
      },
      previewOnly: true,
      contentVisible: false,
    },
  },
  isLoading: false,
  isFetching: false,
  error: null,
}

const defaultDuplicateDiagnosticsResult = {
  data: {
    data: {
      status: 'CLEAR',
      generatedAt: '2026-07-14T12:00:00.000Z',
      summary: {
        totalGroups: 0,
        blockingGroups: 0,
        reviewRequiredGroups: 0,
        affectedPacks: 0,
      },
      packDiagnostics: [],
      groups: [],
    },
  },
  isLoading: false,
  isFetching: false,
  error: null,
}

const duplicateReviewConflict = {
  status: 409,
  data: {
    error: {
      code: 'CONFLICT',
      message: 'Review deterministic duplicate matches before importing.',
      details: {
        reason: 'PACK_DUPLICATE_REVIEW_REQUIRED',
        allowedActions: ['VIEW_EXISTING', 'CANCEL', 'CONTINUE_WITH_REASON'],
        candidates: [
          {
            classification: 'SOURCE_DUPLICATE',
            packId: 'knowledge-pack-output-schemas-pack',
            versionId: 'output-schemas-pack@1.0.0',
            packType: 'OUTPUT_SCHEMA',
            packKey: 'output-schemas-pack',
            label: 'Output Schemas',
            semanticVersion: '1.0.0',
            scopeKey: 'GLOBAL',
            status: 'DRAFT',
            extractedText: 'raw source content must not render',
            providerContext: 'private provider context must not render',
          },
        ],
      },
    },
  },
}

const defaultDetailResult = {
  data: {
    data: {
      ...defaultListResult.data.data[0],
      versions: [
        {
          versionId: 'output-schemas-pack@1.0.0',
          packId: 'knowledge-pack-output-schemas-pack',
          packType: 'OUTPUT_SCHEMA',
          packKey: 'output-schemas-pack',
          knowledgeLayer: 'OUTPUT_SCHEMA',
          capabilityKey: 'output-schemas',
          workspaceCompatibility: ['OUTCOME', 'ADVISOR'],
          semanticVersion: '1.0.0',
          schemaVersion: '1.0.0',
          status: 'VALIDATED',
          reviewStatus: 'DRAFT',
          scopeKey: 'GLOBAL',
          sourceFilename: 'output-schemas-pack-v1.yaml',
          contentHash: 'sha256:output-schema-content',
          validationSummary: {
            status: 'PASSED',
            mode: 'SOURCE_ONLY_TEXT_VALIDATION',
            checks: [
              {
                code: 'PACK_KEY_MATCH',
                status: 'PASSED',
                message: 'Source must declare pack key output-schemas-pack.',
              },
              {
                code: 'CUSTOMER_SAFE_BOUNDARY_PRESENT',
                status: 'PASSED',
                message: 'Source must preserve explicit prohibited-output boundaries.',
              },
            ],
            issues: [],
          },
          validatedAt: '2026-06-15T09:15:00.000Z',
          updatedAt: '2026-06-15T09:15:00.000Z',
        },
      ],
      activations: [
        {
          activationId: 'kpa-output-schemas-pack-global',
          versionId: 'output-schemas-pack@1.0.0',
          packType: 'OUTPUT_SCHEMA',
          packKey: 'output-schemas-pack',
          semanticVersion: '1.0.0',
          schemaVersion: '1.0.0',
          status: 'ACTIVE',
          scopeType: 'GLOBAL',
          scopeKey: 'GLOBAL',
          contentHash: 'sha256:output-schema-content',
          activatedAt: '2026-06-15T09:30:00.000Z',
        },
      ],
    },
  },
  isLoading: false,
  isFetching: false,
  error: null,
}

const defaultVersionResult = {
  data: {
    data: defaultDetailResult.data.data.versions[0],
  },
  isLoading: false,
  isFetching: false,
  error: null,
}

const defaultContentPreviewData = {
  versionId: 'output-schemas-pack@1.0.0',
  packId: 'knowledge-pack-output-schemas-pack',
  packType: 'OUTPUT_SCHEMA',
  packKey: 'output-schemas-pack',
  semanticVersion: '1.0.0',
  contentFormat: 'YAML',
  sourceFilename: 'output-schemas-pack-v1.yaml',
  contentLength: 82,
  contentVisible: true,
  previewMode: 'SOURCE_BACKED_SUPER_ADMIN_ONLY',
  content: [
    'pack:',
    '  key: output-schemas-pack',
    'schemas:',
    '  EXECUTIVE_BRIEF:',
    '    required_sections:',
    '      - Executive Summary',
  ].join('\n'),
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../components/Toaster', () => ({
  useToaster: () => ({ addToast: addToastMock }),
}))

vi.mock('../../store/api/outcomeKnowledgePacksApi.js', () => ({
  usePreviewKnowledgePackImportMetadataMutation: () => [importMetadataPreviewMock, {}],
  useListOutcomeKnowledgePacksQuery: listQueryMock,
  useGetOutcomeKnowledgePackDuplicateDiagnosticsQuery: duplicateDiagnosticsQueryMock,
  usePreviewOutcomeKnowledgePackResolutionQuery: previewQueryMock,
  useGetOutcomeKnowledgePackQuery: detailQueryMock,
  useGetOutcomeKnowledgePackVersionQuery: versionQueryMock,
  useLazyPreviewOutcomeKnowledgePackVersionContentQuery: () => [
    loadContentPreviewMock,
    { isLoading: false, isFetching: false, error: null },
  ],
  useImportOutcomeKnowledgePackSourceDocumentDraftMutation: () => [
    importSourceDocumentDraftMock,
    { isLoading: false },
  ],
  useDeleteOutcomeKnowledgePackMutation: () => [
    deletePackMock,
    { isLoading: false },
  ],
  useDeprecateOutcomeKnowledgePackVersionMutation: () => [
    deprecateVersionMock,
    { isLoading: false },
  ],
  useDisableOutcomeKnowledgePackVersionMutation: () => [
    disableVersionMock,
    { isLoading: false },
  ],
  useRollbackOutcomeKnowledgePackMutation: () => [
    rollbackPackMock,
    { isLoading: false },
  ],
  useValidateOutcomeKnowledgePackVersionMutation: () => [
    validateVersionMock,
    { isLoading: false },
  ],
  useUpdateOutcomeKnowledgePackReviewMutation: () => [
    updateReviewStatusMock,
    { isLoading: false },
  ],
  useActivateOutcomeKnowledgePackVersionMutation: () => [
    activateVersionMock,
    { isLoading: false },
  ],
  useDisableOutcomeKnowledgePackActivationMutation: () => [disableActivationMock, { isLoading: false }],
  useLazyGetOutcomeKnowledgePackVersionQuery: () => [loadActivationVersionMock, { isFetching: false }],
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <SuperAdminOutcomeKnowledgePacks />
    </MemoryRouter>,
  )
}

function getRowForText(text) {
  const table = screen.getByRole('table', { name: /outcome studio knowledge packs/i })
  const row = within(table).getByText(text).closest('tr')
  expect(row).not.toBeNull()
  return row
}

function prepareSuccessor(overrides = {}, queryOverrides = {}) {
  const active = { ...defaultVersionResult.data.data, status: 'ACTIVE', reviewStatus: 'APPROVED' }
  const successor = { ...active, versionId: 'output-schemas-pack@1.0.1', semanticVersion: '1.0.1',
    authoringMode: 'IMPORT_SOURCE_DOCUMENT', sourceMetadata: defaultListResult.data.data[0].sourceMetadata,
    status: 'DRAFT', reviewStatus: 'DRAFT', validationSummary: { status: 'NOT_RUN' }, ...overrides }
  listQueryMock.mockReturnValue({ ...defaultListResult, data: { ...defaultListResult.data,
    data: [{ ...defaultListResult.data.data[0], status: 'ACTIVE', reviewStatus: 'APPROVED' }] } })
  detailQueryMock.mockReturnValue({ ...defaultDetailResult, data: { data: {
    ...defaultDetailResult.data.data, status: 'ACTIVE', versions: [successor, active],
  } } })
  versionQueryMock.mockImplementation(({ versionId }) => ({ ...defaultVersionResult,
    data: { data: versionId === successor.versionId ? successor : active },
    ...(versionId === successor.versionId ? queryOverrides : {}),
  }))
  return { active, successor }
}

async function openSuccessor(user, versionId = 'output-schemas-pack@1.0.1') {
  await user.selectOptions(screen.getByRole('combobox', { name: 'Actions for output-schemas-pack' }), 'details')
  await user.selectOptions(screen.getByLabelText(/^version$/i), versionId)
}

async function prepareTextSourceImport(user, {
  packType = 'ET',
  label = 'Execution Translation',
  knowledgeAssetId = 'ET-001',
  capabilityKey = 'execution-translation',
  filename = 'ET v2.8 Canonical Execution Translation System.md',
} = {}) {
  await user.click(screen.getByRole('button', { name: /import source document/i }))
  const sourceFile = new File(['Canonical source text.'], filename, { type: 'text/markdown' })
  await user.upload(screen.getByLabelText(/source document file/i), sourceFile)
  await waitFor(() => {
    expect(screen.getByLabelText(/extracted text preview/i)).toHaveValue('Canonical source text.')
  })
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.clear(screen.getByLabelText(/^name \*$/i))
  await user.type(screen.getByLabelText(/^name \*$/i), label)
  await user.clear(screen.getByLabelText(/knowledge asset id/i))
  await user.type(screen.getByLabelText(/knowledge asset id/i), knowledgeAssetId)
  await user.clear(screen.getByLabelText(/capability key/i))
  await user.type(screen.getByLabelText(/capability key/i), capabilityKey)
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.selectOptions(screen.getByLabelText(/draft pack type/i), packType)
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
}

describe('SuperAdminOutcomeKnowledgePacks page', () => {
  it.each([true, false])('fetches exact catalogue version before offering scope confirmation (eligible %s)', async (eligible) => {
    const user = userEvent.setup()
    prepareSuccessor()
    loadActivationVersionMock.mockImplementation(({ packId, versionId }) => ({ unwrap: vi.fn().mockResolvedValue({ data: {
      ...defaultVersionResult.data.data, packId, versionId,
      status: eligible ? 'ACTIVE' : 'DEPRECATED', reviewStatus: 'APPROVED', contentHash: 'sha256:fresh-selected-source',
    } }) }))
    renderPage()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Actions for output-schemas-pack' }), 'add-scope')
    await waitFor(() => expect(loadActivationVersionMock).toHaveBeenCalled())
    expect(activateVersionMock).not.toHaveBeenCalled()
    if (!eligible) {
      await waitFor(() => expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Unable to load scope binding' })))
      expect(screen.queryByRole('button', { name: 'Add Binding' })).not.toBeInTheDocument()
      return
    }
    await user.type(await screen.findByLabelText(/Framework key/), 'VMF')
    await user.click(screen.getByRole('button', { name: 'Add Binding' }))
    await waitFor(() => expect(activateVersionMock).toHaveBeenCalledWith(expect.objectContaining({ expectedContentHash: 'sha256:fresh-selected-source', scopeType: 'FRAMEWORK', frameworkKey: 'VMF' })))
  })
  it('keeps the undo confirmation open when the server rejects a stale binding', async () => {
    const user = userEvent.setup()
    detailQueryMock.mockReturnValue({ ...defaultDetailResult, data: { data: {
      ...defaultDetailResult.data.data, activations: [{ ...defaultDetailResult.data.data.activations[0], canDisableAdditionalScope: true, scopeType: 'PACKAGE', scopeKey: 'PACKAGE:test' }],
    } } })
    disableActivationMock.mockReturnValue({ unwrap: vi.fn().mockRejectedValue({ status: 409, data: { message: 'Scope binding is stale.' } }) })
    renderPage()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Actions for output-schemas-pack' }), 'details')
    await user.click(screen.getByRole('button', { name: 'Undo Scope Binding' }))
    await user.click(screen.getByRole('button', { name: 'Undo Binding' }))
    await waitFor(() => expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Unable to undo scope binding' })))
    expect(screen.getByRole('dialog', { name: 'Undo scope binding?' })).toBeInTheDocument()
    expect(disableVersionMock).not.toHaveBeenCalled()
  })
  it.each([true, false, undefined])('offers undo only when the API explicitly allows it (%s)', async (eligible) => {
    const user = userEvent.setup()
    const activation = { ...defaultDetailResult.data.data.activations[0], activationId: 'scoped-binding',
      scopeType: 'PACKAGE', scopeKey: 'PACKAGE:vmf-next:3.2.1', canDisableAdditionalScope: eligible }
    detailQueryMock.mockReturnValue({ ...defaultDetailResult, data: { data: {
      ...defaultDetailResult.data.data, activations: [defaultDetailResult.data.data.activations[0], activation],
    } } })
    disableActivationMock.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ data: { activation: { ...activation, status: 'DISABLED' } } }) })
    renderPage()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Actions for output-schemas-pack' }), 'details')
    if (eligible !== true) {
      expect(screen.queryByRole('button', { name: 'Undo Scope Binding' })).not.toBeInTheDocument()
      return
    }
    await user.click(screen.getByRole('button', { name: 'Undo Scope Binding' }))
    expect(disableActivationMock).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Undo scope binding?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(disableActivationMock).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Undo Scope Binding' }))
    await user.click(screen.getByRole('button', { name: 'Undo Binding' }))
    await waitFor(() => expect(disableActivationMock).toHaveBeenCalledWith({
      packId: 'knowledge-pack-output-schemas-pack', activationId: activation.activationId,
      expectedVersionId: activation.versionId, expectedContentHash: activation.contentHash,
    }))
    expect(disableVersionMock).not.toHaveBeenCalled()
    expect(deprecateVersionMock).not.toHaveBeenCalled()
  })

  it('adds only a new non-global scope to the selected ACTIVE version', async () => {
    const user = userEvent.setup()
    const { successor } = prepareSuccessor({ status: 'ACTIVE', reviewStatus: 'APPROVED', validationSummary: { status: 'PASSED' } })
    renderPage()
    await openSuccessor(user)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Actions for selected version' }), 'add-scope')
    expect(screen.getByRole('button', { name: 'Add Binding' })).toBeDisabled()
    expect(within(screen.getByLabelText('Binding scope')).queryByRole('option', { name: /global/i })).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Binding scope'), 'PACKAGE')
    await user.type(screen.getByLabelText(/Package key/), 'vmf-next')
    await user.type(screen.getByLabelText('Package version (optional)'), '3.2.1')
    expect(screen.getByRole('button', { name: 'Add Binding' })).toBeDisabled()
    expect(screen.getByLabelText(/Framework key/)).toHaveValue('')
    await user.type(screen.getByLabelText(/Framework key/), 'CUSTOM_FRAMEWORK')
    await user.click(screen.getByRole('button', { name: 'Add Binding' }))
    await waitFor(() => expect(activateVersionMock).toHaveBeenCalledWith({ packId: successor.packId, versionId: successor.versionId, expectedContentHash: successor.contentHash, scopeType: 'PACKAGE', frameworkKey: 'CUSTOM_FRAMEWORK', packageKey: 'vmf-next', packageVersion: '3.2.1' }))
    expect(disableVersionMock).not.toHaveBeenCalled()
    expect(deprecateVersionMock).not.toHaveBeenCalled()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    importMetadataPreviewMock.mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({ data: {
      metadata: { label: 'Execution Translation', knowledgeAssetId: 'ET-001', capabilityKey: 'execution-translation',
        packType: 'ET', purposeCategory: 'OUTPUT', knowledgeLayer: 'SYSTEM', executionMode: 'PROVIDER_CONTEXT',
        visibility: 'PLATFORM', workspaceCompatibility: ['OUTCOME'], runtimeConsumers: ['Outcome Studio'], description: '' },
      sourceMetadata: { label: 'Execution Translation' }, fieldErrors: {},
    } }) }))
    listQueryMock.mockReturnValue(defaultListResult)
    duplicateDiagnosticsQueryMock.mockReturnValue(defaultDuplicateDiagnosticsResult)
    previewQueryMock.mockReturnValue(defaultPreviewResult)
    detailQueryMock.mockReturnValue(defaultDetailResult)
    versionQueryMock.mockReturnValue(defaultVersionResult)
    importSourceDocumentDraftMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: { pack: { label: 'Execution Translation' } },
      }),
    })
    deletePackMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          deleted: true,
          deletedCounts: {
            packs: 1,
            versions: 1,
            activations: 0,
          },
        },
      }),
    })
    validateVersionMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: { version: { status: 'VALIDATED' } },
      }),
    })
    updateReviewStatusMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: { version: { reviewStatus: 'APPROVED' } },
      }),
    })
    activateVersionMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: { activation: { scopeType: 'GLOBAL' } },
      }),
    })
    deprecateVersionMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: { version: { status: 'DEPRECATED' } },
      }),
    })
    disableVersionMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: { version: { status: 'DISABLED' } },
      }),
    })
    rollbackPackMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: { activation: { status: 'ACTIVE' } },
      }),
    })
    loadContentPreviewMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: defaultContentPreviewData }),
    })
  })

  it.each([
    ['validate', 'DRAFT', 'DRAFT', 'NOT_RUN'],
    ['submit-review', 'VALIDATED', 'DRAFT', 'PASSED'],
    ['approve-review', 'VALIDATED', 'READY_FOR_REVIEW', 'PASSED'],
    ['activate', 'VALIDATED', 'APPROVED', 'PASSED'],
  ])('targets only successor 1.0.1 for %s', async (action, status, reviewStatus, validationStatus) => {
    const user = userEvent.setup()
    const { successor } = prepareSuccessor({ status, reviewStatus, validationSummary: { status: validationStatus } })
    renderPage()
    await openSuccessor(user)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Actions for selected version' }), action)
    const target = { packId: successor.packId, versionId: successor.versionId }
    if (action === 'activate') {
      expect(screen.getByLabelText(/^version$/i)).toBeDisabled()
      await user.click(screen.getByRole('button', { name: /^activate$/i }))
      await waitFor(() => expect(activateVersionMock).toHaveBeenCalledWith({ ...target, scopeType: 'GLOBAL' }))
    } else if (action === 'validate') {
      await waitFor(() => expect(validateVersionMock).toHaveBeenCalledWith(target))
    } else {
      await waitFor(() => expect(updateReviewStatusMock).toHaveBeenCalledWith({ ...target,
        reviewStatus: action === 'submit-review' ? 'READY_FOR_REVIEW' : 'APPROVED' }))
    }
    for (const mock of [validateVersionMock, updateReviewStatusMock, activateVersionMock]) {
      expect(mock.mock.calls.every(([args]) => args.versionId === successor.versionId)).toBe(true)
    }
    expect(deprecateVersionMock).not.toHaveBeenCalled()
    expect(disableVersionMock).not.toHaveBeenCalled()
  })

  it.each(['NOT_RUN', 'FAILED', undefined])('blocks selected activation without passed validation: %s', async (status) => {
    const user = userEvent.setup()
    prepareSuccessor({ status: 'VALIDATED', reviewStatus: 'APPROVED', validationSummary: { status } })
    renderPage()
    await openSuccessor(user)
    expect(within(screen.getByRole('combobox', { name: 'Actions for selected version' }))
      .getByRole('option', { name: 'Activate blocked - validation has not passed' }))
      .toBeDisabled()
    expect(activateVersionMock).not.toHaveBeenCalled()
  })

  it.each([
    { isLoading: true }, { isFetching: true }, { error: { status: 503 } },
  ])('disables selected-version actions for unavailable current evidence %j', async (queryOverrides) => {
    const user = userEvent.setup()
    prepareSuccessor({}, queryOverrides)
    renderPage()
    await openSuccessor(user)
    expect(screen.getByRole('combobox', { name: 'Actions for selected version' })).toBeDisabled()
    expect(validateVersionMock).not.toHaveBeenCalled()
  })

  it.each(['versionId', 'packId'])('never authorizes cached mismatched %s', async (field) => {
    const user = userEvent.setup()
    const { successor } = prepareSuccessor()
    versionQueryMock.mockReturnValue({ ...defaultVersionResult, data: { data: { ...successor, [field]: 'stale-other-identity' } } })
    renderPage()
    await openSuccessor(user)
    expect(screen.queryByRole('combobox', { name: 'Actions for selected version' })).not.toBeInTheDocument()
    expect(validateVersionMock).not.toHaveBeenCalled()
  })

  it('cancels successor activation without changing either version', async () => {
    const user = userEvent.setup()
    prepareSuccessor({ status: 'VALIDATED', reviewStatus: 'APPROVED', validationSummary: { status: 'PASSED' } })
    renderPage()
    await openSuccessor(user)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Actions for selected version' }), 'activate')
    const dialog = screen.getByRole('heading', { name: /activate pack version/i }).closest('dialog')
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }))
    expect(activateVersionMock).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/^version$/i)).toHaveValue('output-schemas-pack@1.0.1')
  })

  it('hides missing required placeholders while preserving the runtime blocker', () => {
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [],
        meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 },
      },
    })

    renderPage()

    expect(screen.getByRole('heading', { name: /knowledge packs/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/knowledge pack library/i)).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /runtime resolution/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /manifests/i })).not.toBeInTheDocument()
    expect(screen.getByText(/mandatory runtime safeguards need attention/i)).toBeInTheDocument()
    expect(screen.queryByText(/\d+ of \d+ required packs active/i)).not.toBeInTheDocument()
    expect(screen.getByText(/authoring required/i)).toBeInTheDocument()
    expect(screen.queryByText(/starter import and upload are currently available only/i))
      .not.toBeInTheDocument()
    expect(screen.queryByLabelText(/actions for adaptive-reasoning-layer/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/actions for rendering-layer/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/actions for output-schemas-pack/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/actions for truth-certification-pack/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/actions for outcome-output-types/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /import starter version/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /upload starter version/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /retired starter/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^missing$/i })).not.toBeInTheDocument()
  })

  it('renders imported source-document drafts with honest source-text blocking state', () => {
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          ...defaultListResult.data.data,
          {
            id: 'kp-system-et',
            packId: 'kp-system-et',
            packType: 'SYSTEM',
            packKey: 'et',
            label: 'Enterprise Technology',
            description: 'Enterprise Technology methodology.',
            status: 'DRAFT',
            latestVersionId: 'kpv-system-et-5-0-0-global',
            latestSemanticVersion: '5.0.0',
            sourceMetadata: {
              importMode: 'SOURCE_DOCUMENT_IMPORT_DRAFT',
              sourceStatus: 'SOURCE_DOCUMENT_PRESENT',
              sourceDocument: {
                filename: 'Enterprise Technology.md',
              },
            },
            authoringMode: 'IMPORT_SOURCE_DOCUMENT',
            updatedAt: '2026-07-08T09:00:00.000Z',
          },
        ],
      },
    })

    renderPage()

    expect(screen.getByText('Enterprise Technology')).toBeInTheDocument()
    expect(screen.getByText('Source text missing').closest('.status'))
      .toHaveClass('super-admin-outcome-knowledge-packs__runtime-binding-status')
    expect(screen.getByText('Enterprise Technology.md')).toBeInTheDocument()
    expect(screen.getAllByText('Source document').length).toBeGreaterThan(0)
    expect(screen.queryByText('No starter source')).not.toBeInTheDocument()

    const actions = screen.getByLabelText('Actions for et')
    expect(within(actions).getByRole('option', { name: 'View Details' })).toBeInTheDocument()
    expect(within(actions).getByRole('option', { name: 'Validate blocked - source text missing' }))
      .toBeDisabled()
    expect(within(actions).queryByRole('option', { name: 'Activate Version' }))
      .not.toBeInTheDocument()
  })

  it('filters catalogue rows by Knowledge Layer', async () => {
    const user = userEvent.setup()
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          ...defaultListResult.data.data,
          {
            id: 'kp-system-et',
            packId: 'kp-system-et',
            packType: 'SYSTEM',
            packKey: 'et',
            knowledgeAssetId: 'SYS-001',
            knowledgeLayer: 'SYSTEM',
            capabilityKey: 'enterprise-technology',
            workspaceCompatibility: ['OUTCOME'],
            label: 'Enterprise Technology',
            description: 'Enterprise Technology methodology.',
            status: 'DRAFT',
            latestVersionId: 'kpv-system-et-5-0-0-global',
            latestSemanticVersion: '5.0.0',
            sourceMetadata: {
              importMode: 'SOURCE_DOCUMENT_IMPORT_DRAFT',
              sourceStatus: 'SOURCE_DOCUMENT_PRESENT',
              sourceDocument: { filename: 'Enterprise Technology.md' },
            },
            authoringMode: 'IMPORT_SOURCE_DOCUMENT',
            updatedAt: '2026-07-08T09:00:00.000Z',
          },
        ],
      },
    })

    renderPage()
    const table = screen.getByRole('table', { name: /outcome studio knowledge packs/i })
    expect(within(table).getByText('Output Schemas')).toBeInTheDocument()
    expect(within(table).getByText('Enterprise Technology')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/knowledge layer/i), 'SYSTEM')

    expect(within(table).queryByText('Output Schemas')).not.toBeInTheDocument()
    expect(within(table).getByText('Enterprise Technology')).toBeInTheDocument()
  })

  it('allows imported draft packs to be hard-deleted from the row actions after confirmation', async () => {
    const user = userEvent.setup()
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          ...defaultListResult.data.data,
          {
            id: 'kp-system-et',
            packId: 'kp-system-et',
            packType: 'SYSTEM',
            packKey: 'et',
            label: 'Enterprise Technology',
            description: 'Enterprise Technology methodology.',
            status: 'DRAFT',
            latestVersionId: 'kpv-system-et-5-0-0-global',
            latestSemanticVersion: '5.0.0',
            sourceMetadata: {
              importMode: 'SOURCE_DOCUMENT_IMPORT_DRAFT',
              sourceStatus: 'SOURCE_DOCUMENT_PRESENT',
              sourceDocument: {
                filename: 'Enterprise Technology.md',
              },
            },
            authoringMode: 'IMPORT_SOURCE_DOCUMENT',
            isSystem: false,
            updatedAt: '2026-07-08T09:00:00.000Z',
          },
        ],
      },
    })

    renderPage()

    const actions = screen.getByLabelText('Actions for et')
    expect(within(actions).getByRole('option', { name: 'Delete Pack' })).toBeInTheDocument()

    await user.selectOptions(actions, 'delete')

    expect(screen.getByRole('heading', { name: /delete knowledge pack/i })).toBeInTheDocument()
    expect(screen.getByText(/permanently removes the pack/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete Pack' }))

    await waitFor(() => {
      expect(deletePackMock).toHaveBeenCalledWith({ packId: 'kp-system-et' })
    })
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'success',
      title: 'Knowledge pack deleted',
    }))
  })

  it('allows persisted source-document drafts to be validated from the row actions', async () => {
    const user = userEvent.setup()
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          ...defaultListResult.data.data,
          {
            id: 'kp-system-et',
            packId: 'kp-system-et',
            packType: 'SYSTEM',
            packKey: 'et',
            label: 'Enterprise Technology',
            status: 'DRAFT',
            latestVersionId: 'kpv-system-et-5-0-0-global',
            latestSemanticVersion: '5.0.0',
            sourceMetadata: {
              importMode: 'SOURCE_DOCUMENT_IMPORT_DRAFT',
              sourceStatus: 'SOURCE_DOCUMENT_PRESENT',
              sourceDocumentId: 'kpsrc-system-et-5-0-0-source-hash',
              sourceHash: 'sha256:enterprise-technology-source',
              sourceFilename: 'Enterprise Technology.md',
              sourceDocument: {
                sourceDocumentId: 'kpsrc-system-et-5-0-0-source-hash',
                filename: 'Enterprise Technology.md',
                sourceHash: 'sha256:enterprise-technology-source',
              },
            },
            authoringMode: 'IMPORT_SOURCE_DOCUMENT',
            updatedAt: '2026-07-08T09:00:00.000Z',
          },
        ],
      },
    })

    renderPage()

    expect(screen.getAllByText('Source document ready').some((node) =>
      node.closest('.status')?.classList.contains('super-admin-outcome-knowledge-packs__runtime-binding-status'),
    )).toBe(true)

    await user.selectOptions(screen.getByLabelText('Actions for et'), 'validate')

    await waitFor(() => {
      expect(validateVersionMock).toHaveBeenCalledWith({
        packId: 'kp-system-et',
        versionId: 'kpv-system-et-5-0-0-global',
      })
    })
  })

  it('shows review and activation gates for validated imported source-document drafts', async () => {
    const user = userEvent.setup()
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          ...defaultListResult.data.data,
          {
            id: 'kp-system-et',
            packId: 'kp-system-et',
            packType: 'SYSTEM',
            packKey: 'et',
            label: 'Enterprise Technology',
            status: 'VALIDATED',
            reviewStatus: 'DRAFT',
            latestVersionId: 'kpv-system-et-5-0-0-global',
            latestSemanticVersion: '5.0.0',
            sourceMetadata: {
              importMode: 'SOURCE_DOCUMENT_IMPORT_DRAFT',
              sourceStatus: 'SOURCE_DOCUMENT_PRESENT',
              sourceFilename: 'Enterprise Technology.md',
              contentPersisted: true,
            },
            authoringMode: 'IMPORT_SOURCE_DOCUMENT',
            updatedAt: '2026-07-08T09:00:00.000Z',
          },
        ],
      },
    })

    renderPage()

    const actions = screen.getByLabelText('Actions for et')
    expect(within(actions).getByRole('option', { name: 'Submit for Review' })).toBeInTheDocument()
    expect(screen.getAllByText('Validated').length).toBeGreaterThan(0)
    expect(within(actions).getByRole('option', { name: 'Activate blocked - review not approved' }))
      .toBeDisabled()

    await user.selectOptions(actions, 'submit-review')

    await waitFor(() => {
      expect(updateReviewStatusMock).toHaveBeenCalledWith({
        packId: 'kp-system-et',
        versionId: 'kpv-system-et-5-0-0-global',
        reviewStatus: 'READY_FOR_REVIEW',
      })
    })
  })

  it('allows approved imported source-document drafts to be activated', async () => {
    const user = userEvent.setup()
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          ...defaultListResult.data.data,
          {
            id: 'kp-system-et',
            packId: 'kp-system-et',
            packType: 'SYSTEM',
            packKey: 'et',
            label: 'Enterprise Technology',
            status: 'VALIDATED',
            reviewStatus: 'APPROVED',
            latestVersionId: 'kpv-system-et-5-0-0-global',
            latestSemanticVersion: '5.0.0',
            sourceMetadata: {
              importMode: 'SOURCE_DOCUMENT_IMPORT_DRAFT',
              sourceStatus: 'SOURCE_DOCUMENT_PRESENT',
              sourceFilename: 'Enterprise Technology.md',
              contentPersisted: true,
            },
            authoringMode: 'IMPORT_SOURCE_DOCUMENT',
            updatedAt: '2026-07-08T09:00:00.000Z',
          },
        ],
      },
    })

    renderPage()

    await user.selectOptions(screen.getByLabelText('Actions for et'), 'activate')

    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /activate pack version/i })).toBeInTheDocument()
  })

  it('renders lifecycle and registry status as separate row facts', () => {
    const buildPack = ({
      packKey,
      label,
      status,
      reviewStatus = 'DRAFT',
    }) => ({
      id: `kp-${packKey}`,
      packId: `kp-${packKey}`,
      packType: 'SYSTEM',
      packKey,
      label,
      status,
      reviewStatus,
      latestVersionId: `kpv-${packKey}-1-0-0-global`,
      latestSemanticVersion: '1.0.0',
      sourceMetadata: {
        importMode: 'SOURCE_DOCUMENT_IMPORT_DRAFT',
        sourceStatus: 'SOURCE_DOCUMENT_PRESENT',
        sourceFilename: `${label}.md`,
        contentPersisted: true,
      },
      authoringMode: 'IMPORT_SOURCE_DOCUMENT',
      updatedAt: '2026-07-08T09:00:00.000Z',
    })

    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          buildPack({
            packKey: 'enterprise-technology',
            label: 'Enterprise Technology',
            status: 'VALIDATED',
            reviewStatus: 'APPROVED',
          }),
          buildPack({
            packKey: 'disabled-pack',
            label: 'Disabled Pack',
            status: 'DISABLED',
            reviewStatus: 'APPROVED',
          }),
          buildPack({
            packKey: 'failed-pack',
            label: 'Failed Pack',
            status: 'FAILED_VALIDATION',
            reviewStatus: 'REJECTED',
          }),
          buildPack({
            packKey: 'rolled-back-pack',
            label: 'Rolled Back Pack',
            status: 'ROLLED_BACK',
            reviewStatus: 'APPROVED',
          }),
        ],
      },
    })

    renderPage()

    const approvedRow = getRowForText('Enterprise Technology')
    expect(within(approvedRow).getByText('Approved')).toBeInTheDocument()
    expect(within(approvedRow).getByText('Validated')).toBeInTheDocument()

    const disabledRow = getRowForText('Disabled Pack')
    const disabledStatuses = within(disabledRow).getAllByRole('status', {
      name: /status: disabled/i,
    })
    expect(disabledStatuses).toHaveLength(2)
    disabledStatuses.forEach((status) => {
      expect(status).toHaveClass('status--neutral')
    })

    const failedRow = getRowForText('Failed Pack')
    expect(within(failedRow).getAllByText('Failed validation')).toHaveLength(2)
    expect(within(failedRow).queryByText('Rejected')).not.toBeInTheDocument()

    const rolledBackRow = getRowForText('Rolled Back Pack')
    expect(within(rolledBackRow).getAllByText('Rolled back')).toHaveLength(2)
    expect(within(rolledBackRow).queryByText('Superseded')).not.toBeInTheDocument()
  })

  it('exposes approve and reject actions for packs that are in review', () => {
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          ...defaultListResult.data.data,
          {
            id: 'kp-system-et',
            packId: 'kp-system-et',
            packType: 'SYSTEM',
            packKey: 'et',
            label: 'Enterprise Technology',
            status: 'VALIDATED',
            reviewStatus: 'READY_FOR_REVIEW',
            latestVersionId: 'kpv-system-et-5-0-0-global',
            latestSemanticVersion: '5.0.0',
            sourceMetadata: {
              importMode: 'SOURCE_DOCUMENT_IMPORT_DRAFT',
              sourceStatus: 'SOURCE_DOCUMENT_PRESENT',
              sourceFilename: 'Enterprise Technology.md',
              contentPersisted: true,
            },
            authoringMode: 'IMPORT_SOURCE_DOCUMENT',
            updatedAt: '2026-07-08T09:00:00.000Z',
          },
        ],
      },
    })

    renderPage()

    const actions = screen.getByLabelText('Actions for et')
    expect(screen.getAllByText('In Review').length).toBeGreaterThan(0)
    expect(within(actions).getByRole('option', { name: 'Approve' })).toBeInTheDocument()
    expect(within(actions).getByRole('option', { name: 'Reject' })).toBeInTheDocument()
    expect(within(actions).queryByRole('option', { name: 'Approve Review' })).not.toBeInTheDocument()
    expect(within(actions).queryByRole('option', { name: 'Reject Review' })).not.toBeInTheDocument()
  })

  it('exposes lifecycle actions for active imported source-document packs', () => {
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          ...defaultListResult.data.data,
          {
            id: 'kp-system-et',
            packId: 'kp-system-et',
            packType: 'SYSTEM',
            packKey: 'et',
            label: 'Enterprise Technology',
            status: 'ACTIVE',
            reviewStatus: 'APPROVED',
            latestVersionId: 'kpv-system-et-5-0-0-global',
            latestSemanticVersion: '5.0.0',
            sourceMetadata: {
              importMode: 'SOURCE_DOCUMENT_IMPORT_DRAFT',
              sourceStatus: 'SOURCE_DOCUMENT_PRESENT',
              sourceDocumentId: 'kpsrc-system-et-5-0-0-source-hash',
              sourceHash: 'sha256:enterprise-technology-source',
              sourceFilename: 'Enterprise Technology.md',
            },
            authoringMode: 'IMPORT_SOURCE_DOCUMENT',
            updatedAt: '2026-07-08T09:00:00.000Z',
          },
        ],
      },
    })

    renderPage()

    const actions = screen.getByLabelText('Actions for et')
    expect(within(actions).getByRole('option', { name: 'View Details' })).toBeInTheDocument()
    expect(within(actions).getByRole('option', { name: 'Deprecate Version' })).toBeInTheDocument()
    expect(within(actions).getByRole('option', { name: 'Disable Version' })).toBeInTheDocument()
    expect(within(actions).queryByRole('option', { name: 'Activate Version' }))
      .not.toBeInTheDocument()
  })

  it('exposes library filters and keeps blank pack creation blocked until the draft contract exists', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('region', { name: /knowledge pack library/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^purpose$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^visibility$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^review$/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/actions for/i).length).toBeGreaterThan(0)
    expect(screen.queryByRole('tab', { name: /runtime resolution/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/outcome studio default runtime resolution/i)).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/^purpose$/i), 'OUTPUT')
    await user.selectOptions(screen.getByLabelText(/^visibility$/i), 'PLATFORM')
    await user.selectOptions(screen.getByLabelText(/^review$/i), 'DRAFT')

    expect(screen.getAllByText('Output Schemas').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /create blank pack/i }))

    expect(await screen.findByRole('heading', { name: /create blank pack/i })).toBeInTheDocument()
    expect(screen.getByText(/needs a draft persistence contract/i)).toBeInTheDocument()
    expect(screen.getByText(/blank-pack draft persistence/i)).toBeInTheDocument()
  })

  it('renders duplicate diagnostics and filters the library by duplicate status', async () => {
    const user = userEvent.setup()
    duplicateDiagnosticsQueryMock.mockReturnValue({
      ...defaultDuplicateDiagnosticsResult,
      data: {
        data: {
          status: 'REVIEW_REQUIRED',
          generatedAt: '2026-07-14T12:00:00.000Z',
          summary: {
            totalGroups: 1,
            blockingGroups: 0,
            reviewRequiredGroups: 1,
            affectedPacks: 1,
          },
          packDiagnostics: [
            {
              packId: 'knowledge-pack-output-schemas-pack',
              status: 'REVIEW_REQUIRED',
              classifications: ['SOURCE_DUPLICATE'],
              groupIds: ['kpd-source-duplicate-1'],
            },
          ],
          groups: [],
        },
      },
    })

    renderPage()

    const diagnostics = screen.getByRole('region', { name: /duplicate diagnostics/i })
    expect(within(diagnostics).getByText('Review required')).toBeInTheDocument()
    const reviewCount = within(diagnostics).getByText('Review groups').closest('div')
    expect(within(reviewCount).getByText('1')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /duplicate status/i })).toBeInTheDocument()
    const outputSchemasRow = getRowForText('Output Schemas')
    expect(within(outputSchemasRow).getByText('Review required')).toBeInTheDocument()
    expect(within(outputSchemasRow).getByText(': Source Duplicate')).toHaveClass('sr-only')

    await user.selectOptions(screen.getByLabelText(/^duplicate status$/i), 'CLEAR')
    expect(screen.getByText('No knowledge packs found.')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/^duplicate status$/i), 'REVIEW_REQUIRED')
    expect(within(getRowForText('Output Schemas')).getByText('Review required')).toBeInTheDocument()
  })

  it('does not present packs as duplicate-clear when diagnostics fail', () => {
    duplicateDiagnosticsQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: {
        status: 503,
        data: { error: { code: 'SERVICE_UNAVAILABLE', message: 'Scan unavailable.' } },
      },
    })

    renderPage()

    const diagnostics = screen.getByRole('region', { name: /duplicate diagnostics/i })
    expect(within(diagnostics).getByRole('alert')).toHaveTextContent(
      'Diagnostics are unavailable. Scan unavailable.',
    )
    expect(within(getRowForText('Output Schemas')).getByText('Unavailable')).toBeInTheDocument()
    expect(screen.getByLabelText(/^duplicate status$/i)).toBeDisabled()
    expect(screen.queryByText('No knowledge packs found.')).not.toBeInTheDocument()
  })

  it('fails closed when duplicate diagnostics return an incomplete success payload', () => {
    duplicateDiagnosticsQueryMock.mockReturnValue({
      data: {
        data: {
          status: 'CLEAR',
          summary: {
            blockingGroups: 0,
            reviewRequiredGroups: 0,
            affectedPacks: 0,
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    const diagnostics = screen.getByRole('region', { name: /duplicate diagnostics/i })
    expect(within(diagnostics).getByRole('alert')).toHaveTextContent(
      'Diagnostics are unavailable. The diagnostics response was incomplete.',
    )
    expect(within(getRowForText('Output Schemas')).getByText('Unavailable')).toBeInTheDocument()
    expect(screen.getByLabelText(/^duplicate status$/i)).toBeDisabled()
  })

  it('requires an operator reason and resubmits a review-required import with the override', async () => {
    const user = userEvent.setup()
    importSourceDocumentDraftMock.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue(duplicateReviewConflict),
    })
    renderPage()
    await prepareTextSourceImport(user)

    await user.click(screen.getByRole('button', { name: /create draft/i }))

    const reviewHeading = await screen.findByRole('heading', { name: /review possible duplicate/i })
    const reviewDialog = reviewHeading.closest('dialog')
    expect(reviewDialog).not.toBeNull()
    expect(within(reviewDialog).getByText('Output Schemas')).toBeInTheDocument()
    expect(within(reviewDialog).getByText('Source Duplicate')).toBeInTheDocument()
    expect(within(reviewDialog).queryByText(/raw source content must not render/i))
      .not.toBeInTheDocument()
    expect(within(reviewDialog).queryByText(/private provider context must not render/i))
      .not.toBeInTheDocument()
    expect(screen.getByText('Execution Translation')).toBeInTheDocument()

    await user.click(within(reviewDialog).getByRole('button', { name: /continue with reason/i }))
    expect(within(reviewDialog).getByRole('alert')).toHaveTextContent('Enter at least 10 characters')
    const invalidReasonField = within(reviewDialog).getByLabelText(/reason for separate asset/i)
    expect(invalidReasonField).toHaveAttribute('aria-invalid', 'true')
    expect(invalidReasonField.getAttribute('aria-describedby'))
      .toContain('knowledge-pack-duplicate-override-reason-error')
    expect(importSourceDocumentDraftMock).toHaveBeenCalledTimes(1)

    const reason = 'Separate ownership and runtime scope were reviewed.'
    const reasonField = within(reviewDialog).getByLabelText(/reason for separate asset/i)
    expect(reasonField).toHaveAttribute('maxLength', '500')
    await user.type(reasonField, reason)
    await user.click(within(reviewDialog).getByRole('button', { name: /continue with reason/i }))

    await waitFor(() => {
      expect(importSourceDocumentDraftMock).toHaveBeenCalledTimes(2)
    })
    expect(importSourceDocumentDraftMock.mock.calls[1][0]).toEqual(expect.objectContaining({
      packType: 'ET',
      packKey: 'execution-translation',
      duplicateOverrideReason: reason,
    }))
    expect(screen.queryByRole('heading', { name: /review possible duplicate/i }))
      .not.toBeInTheDocument()
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Draft imported',
      variant: 'success',
    }))
  })

  it('cancels duplicate review without closing or clearing the import form', async () => {
    const user = userEvent.setup()
    importSourceDocumentDraftMock.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue(duplicateReviewConflict),
    })
    renderPage()
    await prepareTextSourceImport(user)
    await user.click(screen.getByRole('button', { name: /create draft/i }))

    const reviewDialog = (await screen.findByRole('heading', {
      name: /review possible duplicate/i,
    })).closest('dialog')
    await user.click(within(reviewDialog).getByRole('button', { name: /^cancel$/i }))

    expect(screen.queryByRole('heading', { name: /review possible duplicate/i }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /import source document/i })).toBeInTheDocument()
    expect(screen.getByText('Execution Translation')).toBeInTheDocument()
    expect(importSourceDocumentDraftMock).toHaveBeenCalledTimes(1)
  })

  it('opens the exact matched version and consolidates classifications for the same pack', async () => {
    const user = userEvent.setup()
    const candidateConflict = {
      ...duplicateReviewConflict,
      data: {
        error: {
          ...duplicateReviewConflict.data.error,
          details: {
            ...duplicateReviewConflict.data.error.details,
            candidates: [
              ...duplicateReviewConflict.data.error.details.candidates,
              {
                classification: 'NORMALIZED_NAME_MATCH',
                packId: 'knowledge-pack-output-schemas-pack',
                packType: 'OUTPUT_SCHEMA',
                packKey: 'output-schemas-pack',
                label: 'Output Schemas',
                scopeKey: 'GLOBAL',
                status: 'DRAFT',
              },
            ],
          },
        },
      },
    }
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: defaultListResult.data.data.map((pack) => ({
          ...pack,
          latestVersionId: 'output-schemas-pack@2.0.0',
          latestSemanticVersion: '2.0.0',
        })),
      },
    })
    importSourceDocumentDraftMock.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue(candidateConflict),
    })
    renderPage()
    await prepareTextSourceImport(user)
    await user.click(screen.getByRole('button', { name: /create draft/i }))

    const reviewDialog = (await screen.findByRole('heading', {
      name: /review possible duplicate/i,
    })).closest('dialog')
    expect(within(reviewDialog).getAllByRole('button', { name: /view existing/i })).toHaveLength(1)
    expect(within(reviewDialog).getByText('Source Duplicate')).toBeInTheDocument()
    expect(within(reviewDialog).getByText('Normalized Name Match')).toBeInTheDocument()
    await user.click(within(reviewDialog).getByRole('button', { name: /view existing/i }))

    expect(await screen.findByRole('heading', { name: /pack details/i })).toBeInTheDocument()
    expect(screen.getByText('Execution Translation')).toBeInTheDocument()
    expect(detailQueryMock).toHaveBeenCalledWith(
      { packId: 'knowledge-pack-output-schemas-pack' },
      { skip: false },
    )
    expect(versionQueryMock).toHaveBeenCalledWith(
      {
        packId: 'knowledge-pack-output-schemas-pack',
        versionId: 'output-schemas-pack@1.0.0',
      },
      { skip: false },
    )
  })

  it('keeps blocking duplicate conflicts outside the override workflow', async () => {
    const user = userEvent.setup()
    importSourceDocumentDraftMock.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'CONFLICT',
            message: 'This pack version already exists.',
            details: { reason: 'PACK_VERSION_ALREADY_EXISTS' },
          },
        },
      }),
    })
    renderPage()
    await prepareTextSourceImport(user)

    await user.click(screen.getByRole('button', { name: /create draft/i }))

    expect(await screen.findByText('This pack version already exists.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /review possible duplicate/i }))
      .not.toBeInTheDocument()
    expect(importSourceDocumentDraftMock).toHaveBeenCalledTimes(1)
  })

  it('hydrates metadata before creating a draft and retains overrides in the payload', async () => {
    const user = userEvent.setup()
    renderPage()
    await prepareTextSourceImport(user)
    await user.click(screen.getByRole('button', { name: /create draft/i }))
    await waitFor(() => expect(importSourceDocumentDraftMock).toHaveBeenCalledWith(expect.objectContaining({
      packType: 'ET', knowledgeAssetId: 'ET-001', label: 'Execution Translation',
      runtimeConsumers: ['Outcome Studio'], workspaceCompatibility: ['OUTCOME'],
      metadataOverrides: expect.arrayContaining(['label', 'packType']),
      extractedText: 'Canonical source text.',
    })))
  })

  it('keeps file selection first and blocks progress without a source', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /import source document/i }))
    expect(screen.queryByLabelText(/^name/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Create Draft' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: /import source document/i })).toHaveFocus()
  })

  it('blocks invalid version metadata and directs the user to the visible error', async () => {
    const user = userEvent.setup()
    renderPage()
    await prepareTextSourceImport(user)
    await user.clear(screen.getByLabelText(/^semantic version/i))
    await user.type(screen.getByLabelText(/^semantic version/i), 'invalid')
    await user.click(screen.getByRole('button', { name: 'Create Draft' }))
    expect(await screen.findByText(/Use major.minor.patch/)).toBeInTheDocument()
    expect(importSourceDocumentDraftMock).not.toHaveBeenCalled()
  })

  it('keeps server metadata conflicts blocking and opens the affected step', async () => {
    const user = userEvent.setup()
    renderPage()
    await prepareTextSourceImport(user)
    importMetadataPreviewMock.mockReturnValueOnce({ unwrap: vi.fn().mockResolvedValue({ data: {
      fieldErrors: { knowledgeAssetId: 'Knowledge Asset ID must match the selected source.' },
    } }) })
    await user.click(screen.getByRole('button', { name: 'Create Draft' }))
    expect(await screen.findByText('Knowledge Asset ID must match the selected source.')).toBeInTheDocument()
    expect(screen.getByLabelText(/knowledge asset id/i)).toHaveAttribute('aria-invalid', 'true')
    expect(importSourceDocumentDraftMock).not.toHaveBeenCalled()
  })

  it('maps API errors to their step and retains source import failure reporting', async () => {
    const user = userEvent.setup()
    renderPage()
    await prepareTextSourceImport(user)
    importSourceDocumentDraftMock.mockReturnValueOnce({ unwrap: vi.fn().mockRejectedValue({ status: 422,
      data: { error: { code: 'VALIDATION_FAILED', message: 'Please check the form for errors.',
        details: { semanticVersion: 'Invalid source version.' } } },
    }) })
    await user.click(screen.getByRole('button', { name: 'Create Draft' }))
    expect(await screen.findByText('Invalid source version.')).toBeInTheDocument()
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Source import failed' }))
  })

  it.each(['disk', 'size', 'extension'])('invalidates failed %s file selections before draft import', async (failure) => {
    const user = userEvent.setup({ applyAccept: false })
    renderPage()
    await user.click(screen.getByRole('button', { name: /import source document/i }))
    const file = new File(['source'], failure === 'extension' ? 'bad.exe' : 'pack.md')
    if (failure === 'disk') Object.defineProperty(file, 'text', { value: vi.fn().mockRejectedValue(new Error('Disk read failed')) })
    if (failure === 'size') Object.defineProperty(file, 'size', { value: 10000001 })
    await user.upload(screen.getByLabelText(/source document file/i), file)
    expect(await screen.findByText('Unable to read selected source document.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(importSourceDocumentDraftMock).not.toHaveBeenCalled()
  })
  it('opens persisted pack details with version and activation history without loading source content', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for output-schemas-pack/i),
      'details',
    )

    expect(await screen.findByRole('heading', { name: /pack details/i })).toBeInTheDocument()
    expect(screen.getAllByText('output-schemas-pack@1.0.0').length).toBeGreaterThan(0)
    expect(screen.getByText('OSC-001')).toBeInTheDocument()
    expect(screen.getAllByText('Output Schema').length).toBeGreaterThan(0)
    expect(screen.getAllByText('output-schemas').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Outcome').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Advisor').length).toBeGreaterThan(0)
    expect(screen.getAllByText('sha256:output-schema-content').length).toBeGreaterThan(0)
    expect(screen.getAllByText('DRAFT').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /activation history/i })).toBeInTheDocument()
    expect(screen.getByText('PACK_KEY_MATCH')).toBeInTheDocument()
    expect(screen.getByText('Source must declare pack key output-schemas-pack.')).toBeInTheDocument()
    expect(screen.getByText('CUSTOMER_SAFE_BOUNDARY_PRESENT')).toBeInTheDocument()
    expect(screen.queryByText(/{"code":"PACK_KEY_MATCH"/)).not.toBeInTheDocument()
    expect(screen.getByText(/source content is hidden until preview is explicitly loaded/i))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load source preview/i })).toBeInTheDocument()
    expect(screen.queryByText(/Version content must not leak/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/EXECUTIVE_BRIEF/i)).not.toBeInTheDocument()
    expect(loadContentPreviewMock).not.toHaveBeenCalled()
    expect(detailQueryMock).toHaveBeenCalledWith(
      { packId: 'knowledge-pack-output-schemas-pack' },
      { skip: false },
    )
    expect(versionQueryMock).toHaveBeenCalledWith(
      {
        packId: 'knowledge-pack-output-schemas-pack',
        versionId: 'output-schemas-pack@1.0.0',
      },
      { skip: false },
    )
  })

  it('loads audited source content preview on explicit operator action', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for output-schemas-pack/i),
      'details',
    )
    await user.click(await screen.findByRole('button', { name: /load source preview/i }))

    await waitFor(() => {
      expect(loadContentPreviewMock).toHaveBeenCalledWith({
        packId: 'knowledge-pack-output-schemas-pack',
        versionId: 'output-schemas-pack@1.0.0',
      })
    })
    expect(await screen.findByText(/EXECUTIVE_BRIEF/i)).toBeInTheDocument()
    expect(screen.getByText(/source visible/i)).toBeInTheDocument()
    expect(screen.getAllByText(/output-schemas-pack-v1.yaml/i).length).toBeGreaterThan(0)
  })

  it('blocks binary source-document preview when extracted text was not persisted', async () => {
    const user = userEvent.setup()
    const importedPack = {
      id: 'kp-et-et',
      packId: 'kp-et-et',
      packType: 'ET',
      packKey: 'et',
      label: 'ET v2.8',
      description: 'Canonical Execution Translation source document.',
      status: 'DRAFT',
      latestVersionId: 'kpv-et-et-1-0-0-global',
      latestSemanticVersion: '1.0.0',
      sourceMetadata: {
        importMode: 'SOURCE_DOCUMENT_IMPORT_DRAFT',
        sourceStatus: 'SOURCE_DOCUMENT_PRESENT',
        sourceFilename: 'ET v2.8 - Canonical Execution Translation System.docx',
      },
      authoringMode: 'IMPORT_SOURCE_DOCUMENT',
      updatedAt: '2026-07-02T08:38:41.378Z',
    }
    const importedVersion = {
      ...importedPack,
      versionId: 'kpv-et-et-1-0-0-global',
      semanticVersion: '1.0.0',
      schemaVersion: '1.0.0',
      contentFormat: 'DOCX',
      sourceFilename: 'ET v2.8 - Canonical Execution Translation System.docx',
      contentHash: 'sha256:source-document-reference',
      sourceMetadata: {
        ...importedPack.sourceMetadata,
        contentPersisted: false,
      },
      authoringMode: undefined,
      validationSummary: {
        status: 'NOT_RUN',
        mode: 'HUMAN_REVIEW_REQUIRED',
      },
    }
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [importedPack],
      },
    })
    detailQueryMock.mockReturnValue({
      ...defaultDetailResult,
      data: {
        data: {
          ...importedPack,
          versions: [importedVersion],
          activations: [],
        },
      },
    })
    versionQueryMock.mockReturnValue({
      ...defaultVersionResult,
      data: { data: importedVersion },
    })

    renderPage()

    await user.selectOptions(screen.getByLabelText(/actions for et/i), 'details')

    const previewButton = await screen.findByRole('button', { name: /load source preview/i })
    expect(previewButton).toBeDisabled()
    expect(screen.getByText(/does not have persisted extracted text/i)).toBeInTheDocument()
    expect(loadContentPreviewMock).not.toHaveBeenCalled()
  })

  it('validates the latest source-document draft version from row actions', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for output-schemas-pack/i),
      'validate',
    )

    await waitFor(() => {
      expect(validateVersionMock).toHaveBeenCalledWith({
        packId: 'knowledge-pack-output-schemas-pack',
        versionId: 'output-schemas-pack@1.0.0',
      })
    })
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Validation complete',
      variant: 'success',
    }))
  })

  it('does not expose retired starter import or upload actions', () => {
    renderPage()

    expect(screen.queryByRole('heading', { name: /import starter version/i }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /upload starter pack version/i }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /import starter version/i }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /upload starter version/i }))
      .not.toBeInTheDocument()
  })

  it('activates a validated pack at GLOBAL scope after confirmation', async () => {
    const user = userEvent.setup()
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          {
            ...defaultListResult.data.data[0],
            status: 'VALIDATED',
            reviewStatus: 'APPROVED',
          },
        ],
      },
    })

    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for output-schemas-pack/i),
      'activate',
    )
    expect(screen.getByText(/global scope only/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^activate$/i }))

    await waitFor(() => {
      expect(activateVersionMock).toHaveBeenCalledWith({
        packId: 'knowledge-pack-output-schemas-pack',
        versionId: 'output-schemas-pack@1.0.0',
        scopeType: 'GLOBAL',
      })
    })
  })

  it('deprecates a validated source-document version after confirmation', async () => {
    const user = userEvent.setup()
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          {
            ...defaultListResult.data.data[0],
            status: 'VALIDATED',
          },
        ],
      },
    })

    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for output-schemas-pack/i),
      'deprecate',
    )
    expect(screen.getByRole('heading', { name: /deprecate pack version/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^deprecate$/i }))

    await waitFor(() => {
      expect(deprecateVersionMock).toHaveBeenCalledWith({
        packId: 'knowledge-pack-output-schemas-pack',
        versionId: 'output-schemas-pack@1.0.0',
      })
    })
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Deprecated',
      variant: 'success',
    }))
  })

  it('disables an active source-document version after confirmation', async () => {
    const user = userEvent.setup()
    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          {
            ...defaultListResult.data.data[0],
            status: 'ACTIVE',
          },
        ],
      },
    })

    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for output-schemas-pack/i),
      'disable',
    )
    expect(screen.getByRole('heading', { name: /disable pack version/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^disable$/i }))

    await waitFor(() => {
      expect(disableVersionMock).toHaveBeenCalledWith({
        packId: 'knowledge-pack-output-schemas-pack',
        versionId: 'output-schemas-pack@1.0.0',
      })
    })
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Disabled',
      variant: 'success',
    }))
  })

  it('rolls back to a selected validated version from pack details', async () => {
    const user = userEvent.setup()
    const activeVersion = {
      ...defaultDetailResult.data.data.versions[0],
      versionId: 'output-schemas-pack@1.1.0',
      semanticVersion: '1.1.0',
      status: 'ACTIVE',
    }
    const rollbackVersion = {
      ...defaultDetailResult.data.data.versions[0],
      versionId: 'output-schemas-pack@1.0.0',
      semanticVersion: '1.0.0',
      status: 'VALIDATED',
    }
    const detailWithRollbackTarget = {
      data: {
        data: {
          ...defaultDetailResult.data.data,
          status: 'ACTIVE',
          latestVersionId: activeVersion.versionId,
          latestSemanticVersion: activeVersion.semanticVersion,
          versions: [activeVersion, rollbackVersion],
          activations: [
            {
              ...defaultDetailResult.data.data.activations[0],
              activationId: 'kpa-output-schemas-pack-v1-1-global',
              versionId: activeVersion.versionId,
              semanticVersion: activeVersion.semanticVersion,
              status: 'ACTIVE',
            },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    listQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          {
            ...defaultListResult.data.data[0],
            status: 'ACTIVE',
            latestVersionId: activeVersion.versionId,
            latestSemanticVersion: activeVersion.semanticVersion,
          },
        ],
      },
    })
    detailQueryMock.mockReturnValue(detailWithRollbackTarget)
    versionQueryMock.mockImplementation(({ versionId }) => ({
      data: {
        data: versionId === rollbackVersion.versionId ? rollbackVersion : activeVersion,
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }))

    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for output-schemas-pack/i),
      'details',
    )
    await user.selectOptions(
      await screen.findByLabelText(/^version$/i),
      rollbackVersion.versionId,
    )
    await user.click(screen.getByRole('button', { name: /rollback selected/i }))

    expect(screen.getByRole('heading', { name: /rollback to selected version/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^rollback$/i }))

    await waitFor(() => {
      expect(rollbackPackMock).toHaveBeenCalledWith({
        packId: 'knowledge-pack-output-schemas-pack',
        versionId: rollbackVersion.versionId,
        scopeType: 'GLOBAL',
        rollbackReason: expect.stringContaining('1.0.0'),
      })
    })
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Rollback complete',
      variant: 'success',
    }))
  })
})
