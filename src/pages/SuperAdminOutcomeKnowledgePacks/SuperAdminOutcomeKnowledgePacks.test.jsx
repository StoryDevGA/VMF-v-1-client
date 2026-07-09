import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SuperAdminOutcomeKnowledgePacks from './SuperAdminOutcomeKnowledgePacks.jsx'

const navigateMock = vi.fn()
const {
  activateVersionMock,
  addToastMock,
  createVersionMock,
  deprecateVersionMock,
  detailQueryMock,
  disableVersionMock,
  importSourceDocumentDraftMock,
  importStarterVersionMock,
  listQueryMock,
  loadContentPreviewMock,
  manifestListQueryMock,
  manifestPreviewQueryMock,
  reasoningContextPreviewQueryMock,
  previewQueryMock,
  rollbackPackMock,
  updateReviewStatusMock,
  validateVersionMock,
  versionQueryMock,
} = vi.hoisted(() => ({
  activateVersionMock: vi.fn(),
  addToastMock: vi.fn(),
  createVersionMock: vi.fn(),
  deprecateVersionMock: vi.fn(),
  detailQueryMock: vi.fn(),
  disableVersionMock: vi.fn(),
  importSourceDocumentDraftMock: vi.fn(),
  importStarterVersionMock: vi.fn(),
  listQueryMock: vi.fn(),
  loadContentPreviewMock: vi.fn(),
  manifestListQueryMock: vi.fn(),
  manifestPreviewQueryMock: vi.fn(),
  reasoningContextPreviewQueryMock: vi.fn(),
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
    status: 'SOURCE_ONLY',
    runtimeBindable: false,
    sourceStatus: 'SOURCE_ONLY',
    sourceFilename: 'adaptive-reasoning-layer-v1.yaml',
  },
  {
    packType: 'RL',
    packKey: 'rendering-layer',
    label: 'Rendering Layer',
    status: 'SOURCE_ONLY',
    runtimeBindable: false,
    sourceStatus: 'SOURCE_ONLY',
    sourceFilename: 'rendering-layer-v1.yaml',
  },
  {
    packType: 'OUTPUT_SCHEMA',
    packKey: 'output-schemas-pack',
    label: 'Output Schemas',
    status: 'SOURCE_ONLY',
    runtimeBindable: false,
    sourceStatus: 'SOURCE_ONLY',
    sourceFilename: 'output-schemas-pack-v1.yaml',
  },
  {
    packType: 'TRUTH_CERTIFICATION',
    packKey: 'truth-certification-pack',
    label: 'Truth Certification',
    status: 'SOURCE_ONLY',
    runtimeBindable: false,
    sourceStatus: 'SOURCE_ONLY',
    sourceFilename: 'truth-certification-pack-v1.yaml',
  },
  {
    packType: 'OUTPUT_TYPE_DEFINITION',
    packKey: 'outcome-output-types',
    label: 'Outcome Output Types',
    status: 'SOURCE_ONLY',
    runtimeBindable: false,
    sourceStatus: 'SOURCE_ONLY',
    sourceFilename: 'outcome-output-types-v1.yaml',
  },
]

const sourceBundle = {
  status: 'SOURCE_ONLY',
  sourcePath: 'docs/product-specs/source-artifacts/knowledge-packs-v1/',
  starterPacks: [
    {
      packType: 'ARL',
      packKey: 'adaptive-reasoning-layer',
      label: 'Adaptive Reasoning Layer',
      sourceFilename: 'adaptive-reasoning-layer-v1.yaml',
      runtimeBindable: false,
      importStatus: 'NOT_IMPORTED',
    },
    {
      packType: 'RL',
      packKey: 'rendering-layer',
      label: 'Rendering Layer',
      sourceFilename: 'rendering-layer-v1.yaml',
      runtimeBindable: false,
      importStatus: 'NOT_IMPORTED',
    },
    {
      packType: 'OUTPUT_SCHEMA',
      packKey: 'output-schemas-pack',
      label: 'Output Schemas',
      sourceFilename: 'output-schemas-pack-v1.yaml',
      runtimeBindable: false,
      importStatus: 'NOT_IMPORTED',
    },
    {
      packType: 'TRUTH_CERTIFICATION',
      packKey: 'truth-certification-pack',
      label: 'Truth Certification',
      sourceFilename: 'truth-certification-pack-v1.yaml',
      runtimeBindable: false,
      importStatus: 'NOT_IMPORTED',
    },
    {
      packType: 'OUTPUT_TYPE_DEFINITION',
      packKey: 'outcome-output-types',
      label: 'Outcome Output Types',
      sourceFilename: 'outcome-output-types-v1.yaml',
      runtimeBindable: false,
      importStatus: 'NOT_IMPORTED',
    },
  ],
}

const defaultListResult = {
  data: {
    data: [
      {
        id: 'knowledge-pack-output-schemas-pack',
        packId: 'knowledge-pack-output-schemas-pack',
        packType: 'OUTPUT_SCHEMA',
        packKey: 'output-schemas-pack',
        label: 'Output Schemas',
        description: 'Output schema starter pack for Outcome Studio.',
        status: 'DRAFT',
        latestVersionId: 'output-schemas-pack@1.0.0',
        latestSemanticVersion: '1.0.0',
        sourceMetadata: {
          sourceStatus: 'SOURCE_ONLY',
          sourceFilename: 'output-schemas-pack-v1.yaml',
        },
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

const defaultManifestListResult = {
  data: {
    data: [
      {
        id: 'kpm-outcome-studio-default-1-0-0-global',
        manifestId: 'kpm-outcome-studio-default-1-0-0-global',
        manifestKey: 'outcome-studio-default',
        manifestName: 'Outcome Studio Default Knowledge Manifest',
        semanticVersion: '1.0.0',
        status: 'ACTIVE',
        scopeType: 'GLOBAL',
        scopeKey: 'GLOBAL',
        mandatoryPacks: [
          {
            packType: 'OUTPUT_SCHEMA',
            packKey: 'output-schemas-pack',
            label: 'Output Schemas',
          },
        ],
        optionalPacks: [],
        validationPacks: [
          {
            packType: 'TRUTH_CERTIFICATION',
            packKey: 'truth-certification-pack',
            label: 'Truth Certification',
          },
        ],
        blockedPacks: [],
      },
    ],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  },
  isLoading: false,
  isFetching: false,
  error: null,
}

const defaultManifestPreviewResult = {
  data: {
    data: {
      binding: {
        status: 'PROJECTED',
        summary: 'Knowledge Pack manifest resolved all required packs.',
        resolution: {
          activeCount: 2,
          requiredCount: 1,
          validationCount: 1,
          dependencyCount: 1,
        },
      },
    },
  },
  isLoading: false,
  isFetching: false,
  error: null,
}

const defaultReasoningContextPreviewResult = {
  data: {
    data: {
      status: 'PROJECTED',
      previewOnly: true,
      contentVisible: false,
      generatedOutput: false,
      providerExecution: false,
      context: {
        resolution: {
          basePackCount: 1,
          selectedContextPackCount: 2,
          validationPackCount: 1,
          omittedOptionalPackCount: 0,
        },
        selectedContextPacks: [
          {
            purposeCategory: 'STYLE',
            packType: 'STYLE',
            packKey: 'board-reporting-style',
            label: 'Board Reporting Style',
          },
          {
            purposeCategory: 'DECISION',
            packType: 'DECISION',
            packKey: 'investment-committee-decision',
            label: 'Investment Committee Decision',
          },
        ],
      },
      safeguards: [
        'PREVIEW_ONLY_NO_PROVIDER_EXECUTION',
        'NO_GENERATED_OUTPUT',
        'NO_PACK_CONTENT_EXPOSED',
      ],
    },
  },
  isLoading: false,
  isFetching: false,
  error: null,
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
          semanticVersion: '1.0.0',
          schemaVersion: '1.0.0',
          status: 'VALIDATED',
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
  useListOutcomeKnowledgePacksQuery: listQueryMock,
  usePreviewOutcomeKnowledgePackResolutionQuery: previewQueryMock,
  useListOutcomeKnowledgePackManifestsQuery: manifestListQueryMock,
  usePreviewOutcomeKnowledgePackManifestResolutionQuery: manifestPreviewQueryMock,
  usePreviewOutcomeKnowledgePackReasoningContextQuery: reasoningContextPreviewQueryMock,
  useGetOutcomeKnowledgePackQuery: detailQueryMock,
  useGetOutcomeKnowledgePackVersionQuery: versionQueryMock,
  useLazyPreviewOutcomeKnowledgePackVersionContentQuery: () => [
    loadContentPreviewMock,
    { isLoading: false, isFetching: false, error: null },
  ],
  useCreateOutcomeKnowledgePackVersionMutation: () => [
    createVersionMock,
    { isLoading: false },
  ],
  useImportOutcomeKnowledgePackStarterVersionMutation: () => [
    importStarterVersionMock,
    { isLoading: false },
  ],
  useImportOutcomeKnowledgePackSourceDocumentDraftMutation: () => [
    importSourceDocumentDraftMock,
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
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <SuperAdminOutcomeKnowledgePacks />
    </MemoryRouter>,
  )
}

describe('SuperAdminOutcomeKnowledgePacks page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listQueryMock.mockReturnValue(defaultListResult)
    previewQueryMock.mockReturnValue(defaultPreviewResult)
    manifestListQueryMock.mockReturnValue(defaultManifestListResult)
    manifestPreviewQueryMock.mockReturnValue(defaultManifestPreviewResult)
    reasoningContextPreviewQueryMock.mockReturnValue(defaultReasoningContextPreviewResult)
    detailQueryMock.mockReturnValue(defaultDetailResult)
    versionQueryMock.mockReturnValue(defaultVersionResult)
    createVersionMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: { version: { semanticVersion: '1.0.1' } },
      }),
    })
    importStarterVersionMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: { version: { semanticVersion: '1.0.0' } },
      }),
    })
    importSourceDocumentDraftMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: { pack: { label: 'Execution Translation' } },
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

  it('renders required packs and exposes source-backed starter actions for all five packs', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /knowledge packs/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /library/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /manifests/i })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText(/0 of 5 required packs active/i)).toBeInTheDocument()
    expect(screen.getAllByText('Output Schemas').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Truth Certification').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Adaptive Reasoning Layer').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Outcome Output Types').length).toBeGreaterThan(0)
    expect(screen.queryByText(/starter import and upload are currently available only/i))
      .not.toBeInTheDocument()
    expect(screen.getByLabelText(/actions for adaptive-reasoning-layer/i)).not.toBeDisabled()
    expect(screen.getByLabelText(/actions for outcome-output-types/i)).not.toBeDisabled()
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
    expect(screen.getByText('Source document')).toBeInTheDocument()
    expect(screen.queryByText('No starter source')).not.toBeInTheDocument()

    const actions = screen.getByLabelText('Actions for et')
    expect(within(actions).getByRole('option', { name: 'View Details' })).toBeInTheDocument()
    expect(within(actions).getByRole('option', { name: 'Validate blocked - source text missing' }))
      .toBeDisabled()
    expect(within(actions).queryByRole('option', { name: 'Activate Version' }))
      .not.toBeInTheDocument()
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
              sourceFilename: 'Enterprise Technology.md',
              contentPersisted: true,
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

    expect(screen.getByText('Source document ready').closest('.status'))
      .toHaveClass('super-admin-outcome-knowledge-packs__runtime-binding-status')

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

    expect(screen.getByRole('heading', { name: /activate pack version/i })).toBeInTheDocument()
  })

  it('exposes library filters and keeps blank pack creation blocked until the draft contract exists', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByLabelText(/^purpose$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^visibility$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^review$/i)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/^purpose$/i), 'OUTPUT')
    await user.selectOptions(screen.getByLabelText(/^visibility$/i), 'PLATFORM')
    await user.selectOptions(screen.getByLabelText(/^review$/i), 'DRAFT')

    expect(screen.getAllByText('Output Schemas').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /create blank pack/i }))

    expect(await screen.findByRole('heading', { name: /create blank pack/i })).toBeInTheDocument()
    expect(screen.getByText(/needs a draft persistence contract/i)).toBeInTheDocument()
    expect(screen.getByText(/blank-pack draft persistence/i)).toBeInTheDocument()
  })

  it('renders manifest rows and previews dependency resolution without exposing pack content', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: /manifests/i }))

    expect(screen.getByRole('tab', { name: /manifests/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Outcome Studio Default Knowledge Manifest')).toBeInTheDocument()
    expect(screen.getByText(/select a manifest to preview dependency resolution/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^preview$/i }))

    await waitFor(() => {
      expect(manifestPreviewQueryMock).toHaveBeenLastCalledWith(
        { manifestId: 'kpm-outcome-studio-default-1-0-0-global' },
        { skip: false },
      )
      expect(reasoningContextPreviewQueryMock).toHaveBeenLastCalledWith(
        {
          manifestId: 'kpm-outcome-studio-default-1-0-0-global',
          outputKey: '',
        },
        { skip: false },
      )
    })
    expect(screen.getByLabelText(/manifest resolution preview/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/reasoning context preview/i)).toBeInTheDocument()
    expect(screen.getByText(/knowledge pack manifest resolved all required packs/i)).toBeInTheDocument()
    expect(screen.getByText('Board Reporting Style')).toBeInTheDocument()
    expect(screen.getByText('Investment Committee Decision')).toBeInTheDocument()
    expect(screen.getByText(/PREVIEW_ONLY_NO_PROVIDER_EXECUTION/)).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getAllByText('validation').length).toBeGreaterThan(0)
  })

  it('creates a draft knowledge pack from source document metadata', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /import source document/i }))

    expect(await screen.findByRole('heading', { name: /import source document/i }))
      .toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/draft pack type/i), 'ET')
    await user.type(screen.getByLabelText(/^name \*$/i), 'Execution Translation')
    await user.selectOptions(screen.getByLabelText(/purpose category/i), 'OUTPUT')
    const sourceFile = new File(
      ['Canonical execution translation source text.'],
      'ET v2.8 Canonical Execution Translation System.md',
      { type: 'text/markdown' },
    )
    await user.upload(screen.getByLabelText(/source document file/i), sourceFile)

    await waitFor(() => {
      expect(screen.getByLabelText(/extracted text preview/i)).toHaveValue(
        'Canonical execution translation source text.',
      )
    })
    expect(screen.getByRole('button', { name: /advanced\/system metadata/i }))
      .toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText(/source hash/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /create draft/i }))

    await waitFor(() => {
      expect(importSourceDocumentDraftMock).toHaveBeenCalledWith({
        packType: 'ET',
        packKey: 'execution-translation',
        label: 'Execution Translation',
        description: '',
        purposeCategory: 'OUTPUT',
        semanticVersion: '1.0.0',
        schemaVersion: '1.0.0',
        sourceAuthority: '',
        executionMode: 'PROVIDER_CONTEXT',
        visibility: 'PLATFORM',
        customerId: '',
        tenantId: '',
        contentFormat: 'MARKDOWN',
        sourceDocument: {
          filename: 'ET v2.8 Canonical Execution Translation System.md',
          contentType: 'text/markdown',
          fileExtension: 'md',
          sizeBytes: sourceFile.size,
        },
        extractedText: 'Canonical execution translation source text.',
      })
    })

    expect(validateVersionMock).not.toHaveBeenCalled()
    expect(activateVersionMock).not.toHaveBeenCalled()
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Draft imported',
      variant: 'success',
    }))
  })

  it('creates a draft knowledge pack from a binary source document for server extraction', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /import source document/i }))

    await user.selectOptions(await screen.findByLabelText(/draft pack type/i), 'SYSTEM')
    await user.type(screen.getByLabelText(/^name \*$/i), 'Enterprise Technology')
    await user.selectOptions(screen.getByLabelText(/purpose category/i), 'FRAMEWORK')
    const sourceFile = new File(
      ['%PDF-1.4 Enterprise Technology framework assessment governance'],
      'Enterprise Technology Framework v5.pdf',
      { type: 'application/pdf' },
    )
    await user.upload(screen.getByLabelText(/source document file/i), sourceFile)

    await waitFor(() => {
      const derivedMetadata = screen.getByLabelText(/derived source metadata/i)
      expect(within(derivedMetadata).getByText('Enterprise Technology Framework v5.pdf')).toBeInTheDocument()
      expect(within(derivedMetadata).getByText('PDF')).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/extracted text preview/i)).toHaveValue('')

    await user.click(screen.getByRole('button', { name: /create draft/i }))

    await waitFor(() => {
      expect(importSourceDocumentDraftMock).toHaveBeenCalledWith({
        packType: 'SYSTEM',
        packKey: 'enterprise-technology',
        label: 'Enterprise Technology',
        description: '',
        purposeCategory: 'FRAMEWORK',
        semanticVersion: '1.0.0',
        schemaVersion: '1.0.0',
        sourceAuthority: '',
        executionMode: 'PROVIDER_CONTEXT',
        visibility: 'PLATFORM',
        customerId: '',
        tenantId: '',
        contentFormat: 'PDF',
        sourceDocument: {
          filename: 'Enterprise Technology Framework v5.pdf',
          contentType: 'application/pdf',
          fileExtension: 'pdf',
          sizeBytes: sourceFile.size,
          contentBase64: expect.any(String),
        },
        extractedText: undefined,
      })
    })
    expect(importSourceDocumentDraftMock.mock.calls[0][0].sourceDocument.contentBase64)
      .toMatch(/JVBERi0xLjQgRW50ZXJwcmlzZSBUZWNobm9sb2d5/)
    expect(validateVersionMock).not.toHaveBeenCalled()
    expect(activateVersionMock).not.toHaveBeenCalled()
  })

  it('surfaces source-document file read failures before draft import', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /import source document/i }))

    const sourceFile = new File(
      ['Canonical execution translation source text.'],
      'ET v2.8 Canonical Execution Translation System.md',
      { type: 'text/markdown' },
    )
    Object.defineProperty(sourceFile, 'text', {
      value: vi.fn().mockRejectedValue(new Error('Disk read failed')),
    })

    await user.upload(await screen.findByLabelText(/source document file/i), sourceFile)

    await waitFor(() => {
      expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'error',
        title: 'Source file read failed',
        description: 'Disk read failed',
      }))
    })
    expect(screen.getByText('Unable to read selected source document.')).toBeInTheDocument()
    expect(screen.getByText('Disk read failed')).toBeInTheDocument()
    expect(screen.getByLabelText(/extracted text preview/i)).toHaveValue('')
    expect(importSourceDocumentDraftMock).not.toHaveBeenCalled()
  })

  it('blocks source document import when required draft fields are missing', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /import source document/i }))
    await user.click(await screen.findByRole('button', { name: /create draft/i }))

    expect(await screen.findByText('Label is required.')).toBeInTheDocument()
    expect(screen.getAllByText('Source filename is required.')).toHaveLength(1)
    expect(screen.getByText('Extracted text is required for text source imports.')).toBeInTheDocument()
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
    expect(screen.getAllByText('sha256:output-schema-content').length).toBeGreaterThan(0)
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

  it('validates the latest starter version for a source-backed draft pack', async () => {
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

  it('imports a source-only starter pack from the governed bundle', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for truth-certification-pack/i),
      'import-starter',
    )

    expect(await screen.findByRole('heading', { name: /import starter version/i }))
      .toBeInTheDocument()
    expect(screen.getAllByText(/runtime activation remains a separate audited action/i).length)
      .toBeGreaterThan(0)
    expect(importStarterVersionMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /^import starter$/i }))

    await waitFor(() => {
      expect(importStarterVersionMock).toHaveBeenCalledWith({
        packId: 'truth-certification-pack',
      })
    })
    expect(createVersionMock).not.toHaveBeenCalled()
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Starter imported',
      variant: 'success',
    }))
  })

  it('cancels starter import confirmation without mutating the registry', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for truth-certification-pack/i),
      'import-starter',
    )

    expect(await screen.findByRole('heading', { name: /import starter version/i }))
      .toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /import starter version/i }))
        .not.toBeInTheDocument()
    })
    expect(importStarterVersionMock).not.toHaveBeenCalled()
    expect(createVersionMock).not.toHaveBeenCalled()
  })

  it('creates a starter pack version from pasted source content', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for truth-certification-pack/i),
      'upload',
    )

    expect(await screen.findByRole('heading', { name: /upload starter pack version/i }))
      .toBeInTheDocument()

    await user.clear(screen.getByLabelText(/semantic version/i))
    await user.type(screen.getByLabelText(/semantic version/i), '1.0.1')
    fireEvent.change(screen.getByLabelText(/source content/i), {
      target: {
        value: [
          'pack:',
          '  key: truth-certification-pack',
          'prohibited: true',
          'certification_levels:',
          'blocking_rules:',
          'warnings:',
          'CERTIFIED_TRUTH:',
        ].join('\n'),
      },
    })

    await user.click(screen.getByRole('button', { name: /create version/i }))

    await waitFor(() => {
      expect(createVersionMock).toHaveBeenCalledWith({
        packId: 'truth-certification-pack',
        semanticVersion: '1.0.1',
        schemaVersion: '1.0.0',
        sourceFilename: 'truth-certification-pack-v1.yaml',
        content: expect.stringContaining('truth-certification-pack'),
      })
    })
  })

  it('attaches upload validation errors to the relevant fields', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for truth-certification-pack/i),
      'upload',
    )

    expect(await screen.findByRole('heading', { name: /upload starter pack version/i }))
      .toBeInTheDocument()

    await user.clear(screen.getByLabelText(/semantic version/i))
    fireEvent.change(screen.getByLabelText(/source content/i), {
      target: { value: 'too short' },
    })
    await user.click(screen.getByRole('button', { name: /create version/i }))

    const semanticVersionInput = screen.getByLabelText(/semantic version/i)
    const contentInput = screen.getByLabelText(/source content/i)
    expect(semanticVersionInput).toHaveAttribute('aria-invalid', 'true')
    expect(contentInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Semantic version is required.')).toBeInTheDocument()
    expect(screen.getByText('Starter source content must be at least 40 characters.')).toBeInTheDocument()
    expect(createVersionMock).not.toHaveBeenCalled()
  })

  it('surfaces starter source file read failures before version upload', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      screen.getByLabelText(/actions for truth-certification-pack/i),
      'upload',
    )

    expect(await screen.findByRole('heading', { name: /upload starter pack version/i }))
      .toBeInTheDocument()

    const sourceFile = new File(
      ['pack:\n  key: truth-certification-pack\n'],
      'truth-certification-pack-v1.yaml',
      { type: 'text/yaml' },
    )
    Object.defineProperty(sourceFile, 'text', {
      value: vi.fn().mockRejectedValue(new Error('Starter file unreadable')),
    })

    await user.upload(screen.getByLabelText(/starter source file/i), sourceFile)

    await waitFor(() => {
      expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'error',
        title: 'Source file read failed',
        description: 'Starter file unreadable',
      }))
    })
    expect(screen.getByText('Unable to read selected source file.')).toBeInTheDocument()
    expect(screen.getByText('Starter file unreadable')).toBeInTheDocument()
    expect(screen.getByLabelText(/source content/i)).toHaveValue('')
    expect(createVersionMock).not.toHaveBeenCalled()
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

  it('deprecates a validated starter version after confirmation', async () => {
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

  it('disables an active starter version after confirmation', async () => {
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
